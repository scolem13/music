// player.js — transport, scheduler and mixer for the backing band (BandPlayer).
// Asks the parts (BandBass / BandComp / BandDrums) for one bar at a time, just before
// it is needed, swings + humanises their events and plays them through BandSounds on a
// small mix bus (part faders → room reverb → compressor → soft clip). It knows nothing about
// harmony or samples: chords are opaque objects from BandHarmony.buildForm and sounds
// are instrument/piece names.
//
//   var player = BandPlayer.create({
//     parsed,                      // TuneChart.parse output (or setChart later)
//     tempo: 120, transpose: 0,
//     countIn: 1,                  // bars of stick clicks: 0, 1 or 2 (2 = "1 . 2 . | 1 2 3 4")
//     choruses: 0,                 // 0 = loop until stopped; N = N choruses, the ending hit, then onEnd
//     opts: {},                    // handed to the parts untouched, as ctx.opts
//     volumes: { bass:1, comp:1, drums:1 },   // faders, 0..1.5 (1 = the default balance)
//     seed,                        // optional int → the same performance every time
//     onState(s),                  // "idle" | "loading" | "playing"
//     onLoadProgress(done, total),
//     onBar(info),                 // as the bar starts SOUNDING: { bar, index, chorus, src, beats, countIn }
//                                  //   (count-in bars: countIn true, index/src -1; the final hit adds ending:true)
//     onBeat(info),                // { beat, bar, countIn }
//     onEnd(),
//     humanize: 1,                 // 0 = dead on the grid (tests); onEvent(e) taps every scheduled note
//   });
//   player.load() / play() -> Promise     player.stop()     player.isPlaying() state() context()
//   player.setTempo(bpm) setTranspose(semis) setChart(parsed) setVolume(part, v)
//   player.setOpts(obj) setCountIn(n) setChoruses(n)
//   player.setInstruments([names]) // the sample sets to have loaded (the page asks for the ones its menus need)
//   player.setKitVolume(piece, v)  // fader for one kit piece, 0..1.5 (1 = as mixed); cfg.kit = { piece: v } to start with
// Sounds: opts.bassSound "electric" plays the bass part on "ebass"; opts.compSound "epiano" plays
// piano comping on "epiano"; opts.rideSound "ride2" swaps the ride cymbal. The parts never know.
// Stop time: opts.stops = [form bar index, ...]. On those bars ctx.stop is true (the band hits beat 1
// and only the bass leads back in) and the bar before gets ctx.nextStop, so nothing rings across.
//   player.setStartBar(i)          // form bar the next play() starts on (after the count-in)
//   player.setCycle(from, to)      // loop just those form bars (inclusive); setCycle(null) = whole form. Live.
//   player.setTempoSteps([8, -3])  // bpm added at each repeat, taken in turn; null = off. cfg.onTempo(bpm) reports
//                                  // each step; stopping returns to the tempo that was set.
//   BandPlayer.renderOffline({ parsed, tempo, transpose, choruses, countIn, opts, volumes,
//                              seed, sampleRate, stems }) -> Promise<{ mix, stems? }>
//
// Bar context given to every part (once per bar, in order):
//   { bar, index, length, chorus, beats, chords, nextChords, tempo, last, opts, meter:{n, d}, compound }
// A beat is the meter's lower note (a quarter in 3/4 and 4/4) — except in compound meters
// (6/8, 9/8, 12/8: ctx.compound), where it is the dotted quarter, so 6/8 has 2 beats and 12/8
// has 4, and the tempo counts dotted quarters.
// Part events (pos/dur in beats, vel 0..1; an off-beat eighth is written x.5 and swung
// HERE — in a compound meter x.5 is the beat's THIRD eighth; straight:true events — triplets,
// a compound beat's second eighth at x.333 — are left where they are):
//   bass { pos, dur, midi, vel }   comp { pos, dur, midis, vel, inst? }   drums { pos, piece, vel, straight? }

(function (global) {
  var PARTS = ["bass", "comp", "drums"];
  var LOOKAHEAD = 0.15, LOOKAHEAD_HIDDEN = 1.6;   // seconds scheduled ahead (more when the tab is hidden: timers get throttled)
  var TICK_MS = 25, START_DELAY = 0.12, RING = 3.0, GEN_MARGIN = 0.1;
  var TRIM   = { bass: 1.0, comp: 1.0, drums: 1.0 };        // default balance at fader = 1 (tuned by measurement)
  var SEND   = { bass: 0.02, comp: 0.16, drums: 0.11 };     // room-reverb send per part
  var JITTER = { bass: 0.003, comp: 0.004, drums: 0.002 };  // random timing looseness, seconds
  var LAY    = { bass: -0.006, comp: 0.008, drums: 0 };     // where each player sits: bass a touch ahead of the ride, comping behind it

  // The conductor: how hard the band is playing this bar (0..1, 0.5 = the plain pattern). It
  // builds over four choruses, lifts through the last four bars of each one, and peaks on a
  // final chorus. opts.variation (0..1) is how far it may move from 0.5: 0 = strict.
  var ARC = [0.30, 0.50, 0.65, 0.80];
  function intensityFor(index, length, chorus, choruses, variation){
    var v = clamp(variation == null ? 0.6 : +variation || 0, 0, 1);
    var arc = ARC[chorus % ARC.length];
    if (choruses > 1 && chorus >= choruses - 1) arc = 0.85;
    var tail = length - index;                                   // bars left in the form, 1 = the last
    if (length >= 8 && tail <= 4) arc += 0.10 * (5 - tail) / 4;
    return clamp(0.5 + v * (arc - 0.5), 0, 1);
  }
  var STRUM = 0.010, VEL_JITTER = 0.06, WET = 0.55, MASTER = 1.0;
  var SEED = { bass: 101, comp: 211, drums: 307, human: 401 };

  function isStop(opts, idx){ var s = opts && opts.stops; return !!(s && s.indexOf && s.indexOf(idx) >= 0); }
  var TEMPO_MIN = 40, TEMPO_MAX = 300;                      // limits for the tempo-step practice mode
  function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }
  function mulberry32(a){ return function (){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Swing: where in the beat the off-beat eighth lands. Triplet feel at medium tempos,
  // straightening as it gets fast (0.667 at 120, 0.61 at 200, 0.55 at 300).
  function swingFor(bpm){ return 0.68 - 0.08 * clamp((bpm - 100) / 120, 0, 1) - 0.05 * clamp((bpm - 220) / 80, 0, 1); }
  function warp(pos, s){ var b = Math.floor(pos), f = pos - b; return b + (f <= 0.5 ? f * (s / 0.5) : s + (f - 0.5) * ((1 - s) / 0.5)); }

  // ---- form: chart → bars the parts can read (BandHarmony's job; plain fallback keeps the drums alive) ----
  function plainForm(parsed){
    var order = parsed.playOrder && parsed.playOrder.length ? parsed.playOrder : parsed.bars.map(function (_, i){ return i; });
    var upb = parsed.unitsPerBeat || 1, out = [];
    order.forEach(function (i){ var b = parsed.bars[i]; if (!b || b.anacrusis) return;
      out.push({ src: i, beats: (b.meter && b.meter.n) || parsed.beatsPerBar || 4, meter: b.meter || { n: parsed.beatsPerBar || 4, d: 4 }, compound: false,
                 chords: b.chords.filter(function (c){ return !c.nc; }).map(function (c){ return { pos: c.onset / upb, chord: { sym: c.sym } }; }) }); });
    return out;
  }
  function buildForm(parsed, transpose){
    if (!parsed || !parsed.bars) return [];
    var H = global.BandHarmony, form = (H && H.buildForm) ? H.buildForm(parsed, transpose || 0) : plainForm(parsed);
    return (form || []).filter(function (b){ return b && b.beats > 0; });
  }

  // ---- mix bus: part faders → master → compressor → out, with a short room on a send ----
  function roomIR(ctx){
    var sr = ctx.sampleRate, len = Math.floor(0.9 * sr), buf = ctx.createBuffer(2, len, sr), rnd = mulberry32(90210);
    for (var ch = 0; ch < 2; ch++){ var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    return buf;
  }
  // safety net after the compressor: exactly linear below about -1.5 dBFS, rounds off
  // anything hotter (all faders pushed up) instead of letting the output clip hard
  function softClip(ctx){
    var n = 2049, curve = new Float32Array(n), k = 0.84, top = 0.985 - k;
    for (var i = 0; i < n; i++){ var x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
      curve[i] = (a <= k ? a : k + top * Math.tanh((a - k) / top)) * (x < 0 ? -1 : 1); }
    var ws = ctx.createWaveShaper(); ws.curve = curve; return ws;
  }
  function faderGain(part, v){ v = clamp(v == null ? 1 : v, 0, 1.5); return TRIM[part] * v * v; }   // square taper
  function makeBus(ctx, volumes){
    var master = ctx.createGain(), comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
    master.gain.value = 1; out.gain.value = MASTER;
    comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.16;
    var clip = softClip(ctx);
    master.connect(comp); comp.connect(out); out.connect(clip); clip.connect(ctx.destination);
    var verb = ctx.createConvolver(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
    verb.buffer = roomIR(ctx); hp.type = "highpass"; hp.frequency.value = 250; lp.type = "lowpass"; lp.frequency.value = 5500;
    wet.gain.value = WET; verb.connect(hp); hp.connect(lp); lp.connect(wet); wet.connect(master);
    var ins = {};
    PARTS.forEach(function (p){
      var g = ctx.createGain(), s = ctx.createGain();
      g.gain.value = faderGain(p, volumes[p]); s.gain.value = SEND[p];
      g.connect(master); g.connect(s); s.connect(verb); ins[p] = g;
    });
    return {
      ins: ins,
      setVolume: function (p, v){ if (ins[p]) ins[p].gain.setTargetAtTime(faderGain(p, v), ctx.currentTime, 0.02); },
      fadeOut: function (sec){ var t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + sec); },
      dispose: function (){ try { clip.disconnect(); } catch (e) {} }
    };
  }

  // ---- one performance: bar generation + event scheduling on a context clock ----
  // Position is tracked in LINEAR BEATS since the count-in started; an anchor (beat ↔
  // context time) turns beats into seconds, and moving the anchor is how tempo changes.
  function Session(ctx, bank, bus, c, seed, tap){
    this.ctx = ctx; this.bank = bank; this.bus = bus; this.c = c; this.tap = tap || null;
    this.tempo = c.tempo; this.spb = 60 / c.tempo; this.anchorL = 0; this.anchorT = 0;
    this.form = buildForm(c.parsed, c.transpose);
    this.human = mulberry32(seed + SEED.human);
    this.parts = {};
    var self = this, G = { bass: global.BandBass, comp: global.BandComp, drums: global.BandDrums };
    PARTS.forEach(function (p){ if (G[p] && G[p].create) self.parts[p] = G[p].create({ rng: mulberry32(seed + SEED[p]) }); });
    this.nextL = 0; this.barNo = 0; this.chorus = 0; this.pass = 0; this.prev = null;
    var r0 = this.range(), sb = c.startBar | 0;
    this.formIdx = (sb >= r0.from && sb <= r0.to) ? sb : r0.from;       // first pass may start part-way in
    this.countIn = this.countInLeft = clamp(c.countIn | 0, 0, 2);
    this.pending = []; this.timeline = []; this.wantEnding = false; this.done = false; this.endL = null;
  }
  Session.prototype.start = function (t0){ this.anchorT = t0; this.anchorL = 0; };
  // `prev` is the anchor before a scheduled tempo step, so bars already generated at the
  // old tempo keep their times while the new tempo starts exactly on the barline.
  Session.prototype.timeOf = function (L){ var p = this.prev;
    return (p && L < this.anchorL) ? p.T + (L - p.L) * p.spb : this.anchorT + (L - this.anchorL) * this.spb; };
  Session.prototype.linAt = function (t){ var p = this.prev;
    return (p && t < this.anchorT) ? p.L + (t - p.T) / p.spb : this.anchorL + (t - this.anchorT) / this.spb; };
  Session.prototype.setTempo = function (bpm){
    var now = this.ctx.currentTime, L = this.linAt(now); this.prev = null;
    this.anchorL = L; this.anchorT = now; this.tempo = bpm; this.spb = 60 / bpm;
  };
  // The bars being looped: the whole form, or the cycle the page set (clamped to the form).
  Session.prototype.range = function (){
    var n = this.form.length, cy = this.c.cycle;
    if (!cy) return { from: 0, to: n - 1 };
    var a = clamp(cy.from | 0, 0, n - 1), b = clamp(cy.to | 0, 0, n - 1);
    return { from: Math.min(a, b), to: Math.max(a, b) };
  };
  // Tempo-change practice: at each repeat add the next step (e.g. [8] or [8, -3] alternating),
  // taking effect on the barline at linear beat L.
  Session.prototype.stepTempo = function (L){
    var steps = this.c.tempoSteps; if (!steps || !steps.length) return;
    var bpm = clamp(Math.round(this.tempo + (+steps[this.pass % steps.length] || 0)), TEMPO_MIN, TEMPO_MAX); this.pass++;
    if (bpm === this.tempo) return;
    var T = this.timeOf(L);
    this.prev = { L: this.anchorL, T: this.anchorT, spb: this.spb };
    this.anchorL = L; this.anchorT = T; this.tempo = bpm; this.spb = 60 / bpm; this.c.tempo = bpm;
    var self = this, wait = Math.max(0, (T - this.ctx.currentTime) * 1000);        // report it when it is heard, not when it is planned
    if (this.onTempo) setTimeout(function (){ if (self.onTempo && self.tempo === bpm) self.onTempo(bpm); }, wait);
  };
  Session.prototype.refreshForm = function (){
    var f; try { f = buildForm(this.c.parsed, this.c.transpose); } catch (e){ if (global.console) console.error(e); return; }
    if (!f.length) return;
    this.form = f; this.formIdx = this.formIdx % f.length;
  };
  Session.prototype.collect = function (part, evs, L0, beats, compound){
    if (!evs) return;
    for (var i = 0; i < evs.length; i++){ var ev = evs[i];
      if (!ev || !(ev.pos >= 0) || ev.pos >= beats + 1e-6) continue;       // also drops NaN
      this.pending.push({ part: part, ev: ev, L0: L0, compound: !!compound }); }
  };
  Session.prototype.callParts = function (method, bctx, L0){
    var self = this;
    var rec = { bar: bctx.bar, index: bctx.index, chorus: bctx.chorus, length: bctx.length, beats: bctx.beats, tempo: bctx.tempo,
                meter: bctx.meter, compound: !!bctx.compound,
                ending: method === "ending", chords: bctx.chords, opts: Object.assign({}, bctx.opts), parts: {} };
    PARTS.forEach(function (p){ var part = self.parts[p]; if (!part || typeof part[method] !== "function") return;
      try { var evs = part[method](bctx) || [], dyn = 0.86 + 0.28 * (bctx.intensity == null ? 0.5 : bctx.intensity);
        evs.forEach(function (e){ if (e && e.vel != null) e.vel = Math.round(clamp(e.vel * dyn, 0.03, 1) * 1000) / 1000; });   // louder as the band builds
        rec.parts[p] = evs; self.collect(p, evs, L0, bctx.beats, bctx.compound); }
      catch (e){ if (global.console) console.error("BandPlayer: " + p + "." + method + " failed", e); } });
    if (this.barTap) this.barTap(rec);                       // onBarEvents: the bar exactly as generated (notation / MIDI export)
  };
  // Generate the next bar (count-in, a bar of the form, or the ending) into `pending`.
  Session.prototype.generate = function (){
    var c = this.c, form = this.form, L0 = this.nextL, beats, b;
    if (this.countInLeft > 0){
      beats = form[0].beats;
      var sparse = this.countIn === 2 && this.countInLeft === 2, evs = [];        // "1 . 2 ." then "1 2 3 4"
      var cmp = !!form[0].compound, thin = sparse && beats >= 4;                  // short bars are counted in full both times
      for (b = 0; b < beats; b++) if (!thin || b % 2 === 0){
        evs.push({ pos: b, piece: "sticks", vel: b === 0 ? 0.8 : 0.66 });
        if (cmp && !sparse){ evs.push({ pos: b + 1 / 3, piece: "sticks", vel: 0.3, straight: true }); evs.push({ pos: b + 2 / 3, piece: "sticks", vel: 0.3, straight: true }); }   // the three eighths of each beat
      }
      this.collect("drums", evs, L0, beats, cmp);
      this.timeline.push({ L: L0, beats: beats, info: { bar: -this.countInLeft, index: -1, chorus: 0, src: -1, beats: beats, countIn: true } });
      this.countInLeft--; this.nextL += beats; return;
    }
    if (this.wantEnding){                                    // the final hit: every part lands on the top chord
      var top = form[this.range().from], first = top.chords.length ? [{ pos: 0, chord: top.chords[0].chord }] : [];
      beats = top.beats;
      this.callParts("ending", { bar: this.barNo, index: 0, length: form.length, chorus: this.chorus, beats: beats, chords: first,
        nextChords: first, tempo: this.tempo, last: true, ending: true, opts: c.opts, meter: top.meter, compound: !!top.compound }, L0);
      this.timeline.push({ L: L0, beats: beats, ending: true,
        info: { bar: this.barNo, index: 0, chorus: this.chorus, src: top.src, beats: beats, countIn: false, ending: true } });
      this.endL = L0; this.nextL += beats; this.done = true; return;
    }
    var r = this.range();
    if (this.formIdx < r.from || this.formIdx > r.to) this.formIdx = r.from;      // the cycle moved under us
    var fb = form[this.formIdx], atEnd = this.formIdx === r.to, nextIdx = atEnd ? r.from : this.formIdx + 1;
    var last = c.choruses > 0 && this.chorus >= c.choruses - 1 && atEnd;
    beats = fb.beats;
    this.callParts("bar", { bar: this.barNo, index: this.formIdx, length: form.length, chorus: this.chorus, beats: beats,
      chords: fb.chords, nextChords: form[nextIdx].chords, tempo: this.tempo, last: last, loopEnd: atEnd, opts: c.opts,
      meter: fb.meter, compound: !!fb.compound, stop: isStop(c.opts, this.formIdx), nextStop: !last && isStop(c.opts, nextIdx),
      intensity: intensityFor(this.formIdx - r.from, r.to - r.from + 1, this.chorus, c.choruses, c.opts && c.opts.variation),
      phrase: { bar: (this.formIdx - r.from) % 4, turnaround: r.to - this.formIdx < 2, top: this.formIdx === r.from } }, L0);
    this.timeline.push({ L: L0, beats: beats, info: { bar: this.barNo, index: this.formIdx, chorus: this.chorus, src: fb.src, beats: beats, countIn: false } });
    this.nextL += beats; this.barNo++; this.formIdx = nextIdx;
    if (atEnd){ this.chorus++; if (!last) this.stepTempo(this.nextL); }
    if (last) this.wantEnding = true;
    if (this.timeline.length > 8) this.timeline.splice(0, this.timeline.length - 8);
  };
  // Hand one event to the sample bank: swing is already in L; add the human touches here.
  Session.prototype.fire = function (p, L){
    var ev = p.ev, h = this.human, hz = this.c.humanize == null ? 1 : this.c.humanize, dest = this.bus.ins[p.part];
    var t = this.timeOf(L) + (LAY[p.part] + (h() + h() - 1) * JITTER[p.part]) * hz;
    var vel = clamp((ev.vel == null ? 0.7 : ev.vel) * (1 + (h() * 2 - 1) * VEL_JITTER * hz), 0, 1);
    var o = this.c.opts || {};
    if (ev.choke){ if (this.bank.choke) this.bank.choke(ev.choke, this.timeOf(L)); return; }
    if (p.part === "drums"){
      var piece = (ev.piece === "ride" && o.rideSound === "ride2") ? "ride2" : ev.piece, kv = this.c.kit && this.c.kit[ev.piece];
      this.bank.play("kit", { piece: piece, vel: vel, gain: kv == null ? 1 : kv * kv }, t, dest);
    }
    else if (p.part === "bass") this.bank.play(o.bassSound === "electric" ? "ebass" : "bass", { midi: ev.midi, vel: vel, dur: (ev.dur || 0.9) * this.spb }, t, dest);
    else {
      var ms = (ev.midis || []).slice().sort(function (a, b){ return a - b; }), n = ms.length;
      var spread = h() * STRUM * hz, dur = (ev.dur || 0.4) * this.spb;     // chords are rolled very slightly, low to high
      var sound = ev.inst || "piano"; if (sound === "piano" && o.compSound === "epiano") sound = "epiano";
      for (var i = 0; i < n; i++) this.bank.play(sound, { midi: ms[i], vel: vel, dur: dur }, t + (n > 1 ? spread * i / (n - 1) : 0), dest);
    }
    if (this.tap) this.tap({ part: p.part, time: t, L: L, pos: ev.pos, vel: vel, piece: ev.piece, midi: ev.midi, midis: ev.midis, dur: ev.dur });
  };
  // Generate and schedule everything that sounds before `horizonT` (Infinity = the whole performance).
  Session.prototype.pump = function (horizonT){
    var hL = this.linAt(horizonT);
    while (!this.done && this.nextL <= hL + GEN_MARGIN) this.generate();
    var straight = this.c.opts && this.c.opts.feel === "straight";                 // straight eighths: no warp
    var s = straight ? 0.5 : swingFor(this.tempo), keep = [];
    for (var i = 0; i < this.pending.length; i++){
      var p = this.pending[i], L = p.L0 + (p.ev.straight ? p.ev.pos : warp(p.ev.pos, p.compound ? 2 / 3 : s));
      if (L <= hL) this.fire(p, L); else keep.push(p);
    }
    this.pending = keep;
  };
  // Which bar/beat is sounding at context time t (for the chart highlight).
  Session.prototype.positionAt = function (t){
    var L = this.linAt(t), tl = this.timeline, e = null;
    for (var i = 0; i < tl.length; i++){ if (tl[i].L <= L + 1e-6) e = tl[i]; else break; }
    if (!e) return null;
    var beat = Math.floor(L - e.L + 1e-6);
    if (e.ending) beat = 0; else if (beat >= e.beats) return null;
    return { entry: e, beat: beat };
  };

  // ---- shared live context + bank (one per page, created on first use) ----
  var shared = null;
  function audio(){
    if (!shared){
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC || !global.BandSounds) throw new Error("BandPlayer: Web Audio / BandSounds unavailable");
      var ctx = new AC({ latencyHint: "interactive" });
      shared = { ctx: ctx, bank: global.BandSounds.create(ctx) };
    }
    return shared;
  }
  function settings(cfg){
    var v = cfg.volumes || {};
    return { parsed: cfg.parsed || null, tempo: clamp(+cfg.tempo || 120, 30, 400), transpose: cfg.transpose | 0,
      countIn: cfg.countIn == null ? 1 : clamp(cfg.countIn | 0, 0, 2), choruses: Math.max(0, cfg.choruses | 0),
      opts: Object.assign({}, cfg.opts), humanize: cfg.humanize, kit: Object.assign({}, cfg.kit),
      volumes: { bass: v.bass == null ? 1 : v.bass, comp: v.comp == null ? 1 : v.comp, drums: v.drums == null ? 1 : v.drums },
      startBar: Math.max(0, cfg.startBar | 0), cycle: cfg.cycle || null, tempoSteps: cfg.tempoSteps || null,
      instruments: cfg.instruments || ["bass", "piano", "kit"] };
  }
  function newSeed(seed){ return seed == null ? (Math.random() * 0x7fffffff) | 0 : seed | 0; }

  function create(cfg){
    cfg = cfg || {};
    var c = settings(cfg), state = "idle", session = null, bus = null, timer = null, raf = null, token = 0, loadP = null;
    var lastEntry = null, lastBeat = -1, baseTempo = c.tempo;

    function setState(s){ if (s === state) return; state = s; if (cfg.onState) cfg.onState(s); }
    function hidden(){ return typeof document !== "undefined" && document.hidden; }

    function load(){                                            // the bank skips what it already has
      var a = audio(), key = c.instruments.join(",");
      if (!loadP || loadP.key !== key){
        loadP = a.bank.load(c.instruments, cfg.onLoadProgress).catch(function (e){ loadP = null; throw e; });
        loadP.key = key;
      }
      return loadP;
    }
    function tick(){
      if (!session) return;
      var ctx = session.ctx;
      session.pump(ctx.currentTime + (hidden() ? LOOKAHEAD_HIDDEN : LOOKAHEAD));
      if (session.done && ctx.currentTime >= session.timeOf(session.endL) + RING) teardown(true);
    }
    function frame(){
      raf = global.requestAnimationFrame(frame);
      if (!session) return;
      var ctx = session.ctx, pos = session.positionAt(ctx.currentTime - (ctx.outputLatency || 0));
      if (!pos) return;
      if (pos.entry !== lastEntry){ lastEntry = pos.entry; lastBeat = -1; if (cfg.onBar) cfg.onBar(pos.entry.info); }
      if (pos.beat !== lastBeat){ lastBeat = pos.beat;
        if (cfg.onBeat) cfg.onBeat({ beat: pos.beat, bar: pos.entry.info.bar, countIn: pos.entry.info.countIn }); }
    }
    function begin(){
      var a = audio();
      if (!buildForm(c.parsed, c.transpose).length){ setState("idle"); throw new Error("BandPlayer: no bars to play"); }
      bus = makeBus(a.ctx, c.volumes);
      session = new Session(a.ctx, a.bank, bus, c, newSeed(cfg.seed), cfg.onEvent);
      session.barTap = cfg.onBarEvents || null;
      baseTempo = c.tempo;
      session.onTempo = function (bpm){ if (cfg.onTempo) cfg.onTempo(bpm); };
      session.start(a.ctx.currentTime + START_DELAY);
      lastEntry = null; lastBeat = -1;
      setState("playing");
      tick(); timer = setInterval(tick, TICK_MS);
      if (global.requestAnimationFrame && (cfg.onBar || cfg.onBeat)) raf = global.requestAnimationFrame(frame);
    }
    function teardown(natural){
      if (timer){ clearInterval(timer); timer = null; }
      if (raf != null && global.cancelAnimationFrame){ global.cancelAnimationFrame(raf); raf = null; }
      var b = bus, s = session; session = null; bus = null;
      if (b){ b.fadeOut(0.03); if (s) s.bank.stopAll(); setTimeout(b.dispose, 400); }
      if (c.tempo !== baseTempo){ c.tempo = baseTempo; if (cfg.onTempo) cfg.onTempo(baseTempo); }   // tempo steps start over next time
      setState("idle");
      if (natural && cfg.onEnd) cfg.onEnd();
    }
    function play(){
      if (state !== "idle") return Promise.resolve();
      var a, my = ++token;
      try { a = audio(); } catch (e){ return Promise.reject(e); }
      if (a.ctx.state === "suspended") a.ctx.resume();          // inside the user gesture
      if (!c.instruments.every(function (n){ return a.bank.has(n); })) setState("loading");
      return load().then(function (){ if (my !== token) return; begin(); },
                         function (e){ if (my === token) setState("idle"); throw e; });
    }
    function stop(){ token++; teardown(false); }

    if (typeof document !== "undefined") document.addEventListener("visibilitychange", function (){ if (session) tick(); });

    return {
      load: load, play: play, stop: stop,
      isPlaying: function (){ return state === "playing"; },
      state: function (){ return state; },
      context: function (){ return shared ? shared.ctx : null; },   // the AudioContext, once it exists
      setTempo: function (bpm){ c.tempo = baseTempo = clamp(+bpm || c.tempo, 30, 400); if (session) session.setTempo(c.tempo); },
      setTranspose: function (n){ c.transpose = n | 0; if (session) session.refreshForm(); },
      setChart: function (parsed){ c.parsed = parsed; if (session) session.refreshForm(); },
      setVolume: function (part, v){ if (!(part in c.volumes)) return; c.volumes[part] = v; if (bus) bus.setVolume(part, v); },
      setOpts: function (o){ Object.assign(c.opts, o); },
      setInstruments: function (list){ c.instruments = list.slice(); if (shared) load().catch(function (){}); },   // before the first play this only records the list
      setKitVolume: function (piece, v){ c.kit[piece] = clamp(+v, 0, 1.5); },
      setCountIn: function (n){ c.countIn = clamp(n | 0, 0, 2); },
      setChoruses: function (n){ c.choruses = Math.max(0, n | 0); },
      setStartBar: function (i){ c.startBar = Math.max(0, i | 0); },                       // form bar index for the next play()
      setCycle: function (from, to){ c.cycle = from == null ? null : { from: from | 0, to: (to == null ? from : to) | 0 }; },   // live
      setTempoSteps: function (steps){ c.tempoSteps = (steps && steps.length) ? steps.slice() : null; }     // bpm added at each repeat, in turn
    };
  }

  // Render a finite performance to a buffer with the SAME session code as live playback.
  // stems:true also renders each part alone (same seed, so the same notes).
  function renderOffline(o){
    o = o || {};
    var c = settings(o), seed = newSeed(o.seed), rate = o.sampleRate || 44100;
    c.startBar = 0; c.cycle = null; c.tempoSteps = null;      // offline renders are whole choruses at one tempo
    if (!(c.choruses > 0)) c.choruses = 2;
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext, form = buildForm(c.parsed, c.transpose);
    if (!OAC || !global.BandSounds) return Promise.reject(new Error("BandPlayer: offline audio unavailable"));
    if (!form.length) return Promise.reject(new Error("BandPlayer: no bars to play"));
    var beats = c.countIn * form[0].beats + form[0].beats;
    form.forEach(function (b){ beats += b.beats * c.choruses; });
    var seconds = START_DELAY + beats * 60 / c.tempo + RING;

    function one(volumes, tap){
      var ctx = new OAC(2, Math.ceil(seconds * rate), rate), bank = global.BandSounds.create(ctx);
      var cc = Object.assign({}, c, { volumes: volumes });
      return bank.load(c.instruments).then(function (){
        var s = new Session(ctx, bank, makeBus(ctx, volumes), cc, seed, tap);
        s.start(START_DELAY); s.pump(Infinity);
        return ctx.startRendering();
      });
    }
    var result = {};
    return one(c.volumes, o.onEvent).then(function (mix){
      result.mix = mix;
      if (!o.stems) return result;
      result.stems = {};
      return PARTS.reduce(function (chain, p){
        return chain.then(function (){ var solo = { bass: 0, comp: 0, drums: 0 }; solo[p] = c.volumes[p];
          return one(solo).then(function (buf){ result.stems[p] = buf; }); });
      }, Promise.resolve()).then(function (){ return result; });
    });
  }

  global.BandPlayer = { create: create, renderOffline: renderOffline, swingFor: swingFor, warp: warp, intensityFor: intensityFor };
})(typeof window !== "undefined" ? window : globalThis);
