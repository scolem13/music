// track-sound.js — what a track SOUNDS like, for the scratch-pad DAW (mini-daw.js). Loaded after mini-daw.js; a DAW turns each part on with an
// attribute, so the lesson DAWs are unchanged:  data-organ  (the organ panel),  data-fx  (insert effects and sends),  data-synth  (synth instruments).
// The panel under the editor shows the SELECTED track's sound. Everything here is unchecked by ear (2026-11-11): the numbers and the presets are
// ours, the sounds are the site's (BandSounds' tonewheel organ, SynthKit's effects and voices).
//
// ORGAN (hammond tracks).   track.organ = { bars: "888000000" (nine tonebars 0-8, 16' 5 1/3' 8' 4' 2 2/3' 2' 1 3/5' 1 1/3' 1'), leslie: "slow" | "fast" | "stop",
//   swell: 0..1 (the pedal, 1 = open), click: 0..1 (key click) }. Per TRACK: BandSounds' bank.setDest(strip.input, organ) gives that destination its own
//   tonebars / Leslie / swell / click, so two organ tracks differ (sounds.js; the Backing Track never uses it). Automation lanes sit beside the volume
//   lane in track.auto: auto.leslie = [{ t (beats), v: "slow"|"fast"|"stop" }] (steps: a value holds until the next point) and auto.swell =
//   [{ t, v: 0..1 }] (straight lines); before the first point the first value holds, as for volume. Scheduled in schedule() through bank.control(...,
//   dest) and written offline in the bounce. MIDI export: swell lane as CC 11 (expression), the usual MIDI number for a swell pedal, NOT verified
//   against any organ module or DAW; the Leslie lane and the tonebars are not exported (no standard CC is claimed).
(function (global) {
  var M = global.MiniDaw; if (!M || !M.core) return;
  var X = M.core, Meter = M.Meter, el = X.el, btn = X.btn, clamp = X.clamp, D = X.Daw.prototype;
  var TS = M.TrackSound = {};
  function bank() { return X.bank(); }
  function isOrgan(tr) { return !!tr && tr.inst === 'hammond'; }

  // ---------------- the organ, as data ----------------
  var FOOT = ['16′', '5⅓′', '8′', '4′', '2⅔′', '2′', '1⅗′', '1⅓′', '1′'];
  var ORGAN_PRESETS = [['The band\'s default', '888000000'], ['Full', '888888888'], ['Foundation only (8′)', '008000000'], ['Flutey', '005300000'], ['Bright', '008060406'], ['Mellow', '006400000']];
  var LESLIE = ['slow', 'fast', 'stop'];
  var Organ = TS.Organ = {
    DEFAULT: { bars: '888000000', leslie: 'slow', swell: 0.7, click: 0.5 }, PRESETS: ORGAN_PRESETS, FOOT: FOOT, LESLIE: LESLIE,
    barsStr: function (b) { var a = typeof b === 'string' ? b.replace(/[^0-8]/g, '').split('') : (b || []), out = ''; for (var i = 0; i < 9; i++) out += clamp(Math.round(+a[i] || 0), 0, 8); return out; },
    norm: function (o) { o = o || {}; var d = Organ.DEFAULT;
      return { bars: Organ.barsStr(o.bars == null ? d.bars : o.bars), leslie: LESLIE.indexOf(o.leslie) >= 0 ? o.leslie : d.leslie, swell: clamp(o.swell == null ? d.swell : +o.swell || 0, 0, 1), click: clamp(o.click == null ? d.click : +o.click || 0, 0, 1) }; },
    lane: function (tr, name) { return tr && tr.auto && tr.auto[name] && tr.auto[name].length ? tr.auto[name] : null; },
    // a step lane: the value of the last point at or before the beat (the first value before the first point)
    stepAt: function (pts, beat) { if (!pts || !pts.length) return null; var v = pts[0].v; for (var i = 0; i < pts.length; i++) { if (pts[i].t <= beat + 1e-9) v = pts[i].v; else break; } return v; },
    // a line lane: straight between points, held outside
    swellAt: function (pts, beat) { if (!pts || !pts.length) return null; if (beat <= pts[0].t) return pts[0].v; var last = pts[pts.length - 1]; if (beat >= last.t) return last.v;
      for (var i = 1; i < pts.length; i++) if (beat < pts[i].t) { var a = pts[i - 1], b = pts[i]; return b.t === a.t ? b.v : a.v + (b.v - a.v) * (beat - a.t) / (b.t - a.t); } return last.v; },
    // the organ's settings for a track at a beat: its panel, overridden by the lanes that have points
    at: function (tr, beat) { var o = Organ.norm(tr && tr.organ), l = Organ.lane(tr, 'leslie'), s = Organ.lane(tr, 'swell');
      if (l) o.leslie = Organ.stepAt(l, beat); if (s) o.swell = clamp(Organ.swellAt(s, beat), 0, 1); return o; },
    addPoint: function (tr, name, t, v) {
      if (!tr.auto) tr.auto = { vol: [] }; if (!tr.auto.vol) tr.auto.vol = []; var a = tr.auto[name] = tr.auto[name] || [], hit = -1;
      a.forEach(function (q, i) { if (Math.abs(q.t - t) < 1e-6) hit = i; }); if (hit >= 0) a[hit].v = v; else a.push({ t: t, v: v }); a.sort(function (x, y) { return x.t - y.t; }); },
    removePoint: function (tr, name, i) { var a = tr.auto && tr.auto[name]; if (!a) return; a.splice(i, 1); if (!a.length) delete tr.auto[name]; Organ.tidy(tr); },
    tidy: function (tr) { var a = tr.auto; if (a && !(a.vol && a.vol.length) && !(a.leslie && a.leslie.length) && !(a.swell && a.swell.length)) delete tr.auto; },
    // CC 11 events [{ tick, v }] for a swell lane: the first value at 0, then a change at most every sixteenth
    swellToCc: function (pts, ppq) { var out = [], last = -1, end = pts[pts.length - 1].t;
      function put(t, v) { var c = clamp(Math.round(v * 127), 0, 127); if (c !== last) { out.push({ tick: Math.round(t * ppq), v: c }); last = c; } }
      put(0, Organ.swellAt(pts, 0)); for (var t = 0.25; t < end; t += 0.25) put(t, Organ.swellAt(pts, t)); put(end, pts[pts.length - 1].v); return out; }
  };

  // ---------------- hooks the DAW calls ----------------
  // live edits that commit once on release (one undo step for a slider drag)
  D.tsLive = function (fn) { if (this._pre == null) this._pre = JSON.stringify(this.p); fn(); };
  D.tsCommit = function () { if (this._pre != null) { this.undo.push(this._pre); if (this.undo.length > 100) this.undo.shift(); this.redo = []; this._pre = null; } this.save(); };
  D.applyTrackSound = function () {
    var self = this, b = bank(); if (!b || !this.strips) return;
    if (this.useOrgan && b.setDest) this.p.tracks.forEach(function (tr, i) { var s = self.strips[i]; if (!s || !isOrgan(tr)) return;
      var o = Organ.at(tr, self.pos); if (self.playing) { if (Organ.lane(tr, 'leslie')) delete o.leslie; if (Organ.lane(tr, 'swell')) delete o.swell; }     // while playing the lanes are scheduled
      b.setDest(s.input, o); });
    if (this.applyFxMix) this.applyFxMix();
  };
  D.scheduleSound = function (tr, i, b0, b1, jumped, dest) {
    var b = bank(), spb = this.secPerBeat(), self = this;
    if (this.useOrgan && isOrgan(tr) && b && b.prepare) {
      b.prepare('hammond', dest);
      var lp = Organ.lane(tr, 'leslie'), sp = Organ.lane(tr, 'swell');
      if (lp) { if (jumped) b.control('hammond', 'leslie', Organ.stepAt(lp, b0), self.timeOf(b0), 0, dest);
        lp.forEach(function (q) { if (q.t >= b0 - 1e-9 && q.t < b1 - 1e-9 && !(jumped && Math.abs(q.t - b0) < 1e-9)) b.control('hammond', 'leslie', q.v, self.timeOf(q.t), 0, dest); }); }
      if (sp) { var v0 = Organ.swellAt(sp, b0), v1 = Organ.swellAt(sp, b1);
        if (jumped) b.control('hammond', 'swell', v0, self.timeOf(b0), 0, dest);
        if (jumped || Math.abs(v1 - v0) > 1e-6) b.control('hammond', 'swell', v1, self.timeOf(b0), (b1 - b0) * spb, dest); }
    }
    if (this.scheduleFx) this.scheduleFx(tr, i, b0, b1, jumped, dest);
  };
  // the offline bounce: 'pre' = before the track's notes (settings), 'post' = after them (lanes)
  TS.bounceTrack = function (d, b2, tr, s, phase) {
    var spb = d.secPerBeat(), total = Meter.total(d.p);
    if (d.useOrgan && isOrgan(tr) && b2.setDest) {
      if (phase === 'pre') { b2.setDest(s.input, Organ.at(tr, 0)); b2.prepare('hammond', s.input); }
      else { var lp = Organ.lane(tr, 'leslie'), sp = Organ.lane(tr, 'swell');
        if (lp) lp.forEach(function (q) { if (q.t > 0) b2.control('hammond', 'leslie', q.v, 0.05 + q.t * spb, 0, s.input); });
        if (sp) for (var t = 0.25; t <= total + 0.25; t += 0.25) b2.control('hammond', 'swell', Organ.swellAt(sp, t), 0.05 + (t - 0.25) * spb, 0.25 * spb, s.input); }
    }
    if (TS.bounceFx) TS.bounceFx(d, b2, tr, s, phase);
  };
  TS.midiExtra = function (tr, c, ppq, evs, p) {
    var sp = Organ.lane(tr, 'swell'); if (sp && isOrgan(tr)) Organ.swellToCc(sp, ppq).forEach(function (e) { evs.push({ tick: e.tick, o: 0, bytes: [0xb0 | c, 11, e.v] }); });
  };

  // ---------------- the panel ----------------
  TS.build = function (d) {
    d.pn = el('div', 'mdaw-trackpanel'); d.node.insertBefore(d.pn, d.mx); d.pnSig = null;
  };
  function sigOf(d) { var tr = d.track(); if (!tr) return '-'; return [d.sel.track, tr.inst, d.sectionSig ? d.sectionSig(tr) : ''].join('|'); }
  D.renderPanel = function (force) {
    if (!this.pn) return; var tr = this.track(), sig = sigOf(this);
    if (!force && sig === this.pnSig) return; this.pnSig = sig; this.pn.innerHTML = '';
    if (!tr || X.isAudio(tr)) { this.pn.hidden = true; return; }
    this.pn.hidden = false; var any = false;
    if (this.useSynth && this.synthPanel && this.synthPanel(tr, this.pn)) any = true;
    if (this.useFx && this.fxPanel) { this.fxPanel(tr, this.pn); any = true; }
    if (this.useOrgan && isOrgan(tr)) { this.organPanel(tr, this.pn); any = true; }
    this.pn.hidden = !any;
  };
  D.organPanel = function (tr, host) {
    var self = this, box = el('div', 'mdaw-tp mdaw-organ'); host.appendChild(box);
    box.appendChild(el('div', 'mdaw-sub', 'Organ: ' + tr.name));
    function cur() { return Organ.norm(tr.organ); }
    function live(fn) { self.tsLive(function () { var o = cur(); fn(o); tr.organ = o; }); self.applyMix(); }
    // tonebars
    var row = el('div', 'mdaw-tp-row'); box.appendChild(row);
    var bars = el('div', 'mdaw-bars'); row.appendChild(bars); var sliders = [], out = el('output', 'mdaw-num mdaw-barstr', cur().bars); out.title = 'The nine tonebars as one number';
    for (var i = 0; i < 9; i++) (function (i) {
      var w = el('label', 'mdaw-bar1'), r = el('input'); r.type = 'range'; r.min = 0; r.max = 8; r.step = 1; r.value = cur().bars[i]; r.className = 'mdaw-barin'; r.dataset.bar = i;
      r.setAttribute('aria-label', 'Tonebar ' + FOOT[i]); r.title = 'Tonebar ' + FOOT[i] + ': 0 (out) to 8 (full)';
      r.oninput = function () { live(function (o) { var a = o.bars.split(''); a[i] = r.value; o.bars = a.join(''); }); out.textContent = cur().bars; presetSel.value = ''; };
      r.onchange = function () { self.tsCommit(); }; sliders.push(r);
      w.appendChild(r); w.appendChild(el('span', null, FOOT[i])); bars.appendChild(w); })(i);
    var side = el('div', 'mdaw-tp-side'); row.appendChild(side);
    var pl = el('label', 'mdaw-lbl', 'Preset '), presetSel = el('select'); presetSel.setAttribute('aria-label', 'Tonebar preset');
    var o0 = el('option', null, '(custom)'); o0.value = ''; presetSel.appendChild(o0);
    ORGAN_PRESETS.forEach(function (p) { var o = el('option', null, p[0] + ' ' + p[1]); o.value = p[1]; presetSel.appendChild(o); });
    presetSel.value = ORGAN_PRESETS.some(function (p) { return p[1] === cur().bars; }) ? cur().bars : '';
    presetSel.onchange = function () { if (!presetSel.value) return; self.change(function () { var o = cur(); o.bars = presetSel.value; tr.organ = o; }); };
    pl.appendChild(presetSel); side.appendChild(pl); side.appendChild(out);
    // Leslie, swell, click
    var lrow = el('div', 'mdaw-tools'); side.appendChild(lrow); lrow.appendChild(el('span', 'mdaw-lbl', 'Leslie'));
    LESLIE.forEach(function (n) { var b = btn(n[0].toUpperCase() + n.slice(1), 'Rotary speaker ' + n, 'mdaw-leslie' + (cur().leslie === n ? ' mdaw-on' : '')); b.dataset.leslie = n;
      b.onclick = function () { self.change(function () { var o = cur(); o.leslie = n; tr.organ = o; }); }; lrow.appendChild(b); });
    function slider(label, key, title) { var l = el('label', 'mdaw-lbl', label + ' '), r = el('input'), no = el('output', 'mdaw-num', Math.round(cur()[key] * 100) + '%'); r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(cur()[key] * 100); r.dataset.k = key; r.title = title; r.setAttribute('aria-label', label);
      r.oninput = function () { live(function (o) { o[key] = +r.value / 100; }); no.textContent = r.value + '%'; }; r.onchange = function () { self.tsCommit(); }; l.appendChild(r); l.appendChild(no); side.appendChild(l); return r; }
    slider('Swell', 'swell', 'The swell pedal: 0 = nearly closed (quiet, duller), 100% = open'); slider('Key click', 'click', 'The click as a key closes its contacts (from the next note)');
    // automation
    var ar = el('div', 'mdaw-tools'); box.appendChild(ar); ar.appendChild(el('span', 'mdaw-lbl', 'Automate at the playhead'));
    function at() { return clamp(Math.round(self.pos / 0.25) * 0.25, 0, Meter.total(self.p)); }
    LESLIE.forEach(function (n) { var b = btn('Leslie → ' + n, 'A Leslie speed change at the playhead (a step)', 'mdaw-aleslie'); b.dataset.to = n; b.onclick = function () { var t = at(); self.change(function () { Organ.addPoint(tr, 'leslie', t, n); }); }; ar.appendChild(b); });
    var bs = btn('Swell here', 'A swell point at the playhead at the pedal position above (the pedal moves in straight lines between points)', 'mdaw-aswell'); bs.onclick = function () { var t = at(), v = cur().swell; self.change(function () { Organ.addPoint(tr, 'swell', t, Math.round(v * 100) / 100); }); }; ar.appendChild(bs);
    var any = Organ.lane(tr, 'leslie') || Organ.lane(tr, 'swell');
    if (any) { var list = el('div', 'mdaw-tp-pts'); box.appendChild(list);
      ['leslie', 'swell'].forEach(function (name) { var a = Organ.lane(tr, name); if (!a) return; a.forEach(function (q, i) { var w = Meter.where(self.p, q.t), chip = el('span', 'mdaw-chip', (name === 'leslie' ? 'Leslie ' + q.v : 'Swell ' + Math.round(q.v * 100) + '%') + ' @ ' + w.bar + '.' + w.beat + (w.sub > 1 ? '.' + w.sub : '') + ' ');
        var x = btn('×', 'Remove this point', 'mdaw-ms'); x.onclick = function () { self.change(function () { Organ.removePoint(tr, name, i); }); }; chip.appendChild(x); list.appendChild(chip); }); }); }
    box.appendChild(el('p', 'mdaw-hint', 'Tonebars, Leslie, swell and key click belong to this track (two organ tracks can differ). Leslie points are steps, swell points straight lines; the lane then replaces the panel\'s setting. Not checked by ear.'));
  };

  // ---------------- effects: three inserts and two sends ----------------
  // track.fx = [slot, slot, slot], a slot = null | { kind, params (plain JSON, see SynthKit.FX[kind].params), bypass, mix (0..1, wet share) }; the signal goes
  // input -> slot 1 -> 2 -> 3 -> volume automation -> pan -> fader, and after the fader to two buses: track.sends = { reverb: 0..1, delay: 0..1 }.
  // project.returns = { reverb: { params, level 0..1 }, delay: { params, level } }: each bus is one reverb / delay (SynthKit.fx, wet only) whose
  // return goes to the master. The builders are SynthKit's (synth-kit.js, loaded by the page), on the live context and again on the bounce's
  // OfflineAudioContext. Not exported to MIDI (effects are not MIDI). Mix defaults per kind in MIX0; the sound is unchecked by ear.
  var SK = function () { return global.SynthKit; };
  var NSLOT = 3, MIX0 = { chorus: 0.5, phaser: 0.5, delay: 0.4, reverb: 0.35 };
  var BUS = { reverb: { params: { decay: 1.8, pre: 10, damp: 6000, early: 0.4, size: 0.6 }, level: 0.8 }, delay: { params: { time: 375, fb: 0.35, tone: 5000, wow: 0, pp: '1' }, level: 0.7 } };
  var Fx = TS.Fx = {
    NSLOT: NSLOT, MIX0: MIX0, BUS: BUS,
    kinds: function () { return SK() ? SK().FX_KINDS() : []; },
    // a slot made valid (kind known, params cleaned, mix 0..1) or null
    norm: function (s) { if (!s || !SK() || Fx.kinds().indexOf(s.kind) < 0) return null;
      return { kind: s.kind, params: SK().fxClean(s.kind, s.params), bypass: !!s.bypass, mix: clamp(s.mix == null ? (MIX0[s.kind] == null ? 1 : MIX0[s.kind]) : +s.mix || 0, 0, 1) }; },
    fresh: function (kind) { return Fx.norm({ kind: kind }); },
    slotOf: function (tr, i) { return Fx.norm(tr && tr.fx && tr.fx[i]); },
    sends: function (tr) { var s = tr && tr.sends || {}; return { reverb: clamp(+s.reverb || 0, 0, 1), delay: clamp(+s.delay || 0, 0, 1) }; },
    returns: function (p) { var r = p && p.returns || {}, o = {}; ['reverb', 'delay'].forEach(function (n) { var b = r[n] || {}; o[n] = { params: SK().fxClean(n, Object.assign({}, BUS[n].params, b.params)), level: clamp(b.level == null ? BUS[n].level : +b.level || 0, 0, 1) }; }); return o; },
    // the wet / dry gains of a slot
    gains: function (s) { var m = s.bypass ? 0 : s.mix; return { wet: m, dry: 1 - m }; },
    any: function (p) { return p.tracks.some(function (t) { return (t.fx || []).some(Boolean) || (t.sends && (t.sends.reverb > 0 || t.sends.delay > 0)); }); }
  };
  TS.addInserts = function (ctx, strip, buses) {
    var prev = strip.input; strip.slots = [];
    for (var i = 0; i < NSLOT; i++) { var inp = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), out = ctx.createGain(); wet.gain.value = 0;
      prev.connect(inp); inp.connect(dry); dry.connect(out); wet.connect(out); strip.slots.push({ inp: inp, dry: dry, wet: wet, out: out, kind: null, fx: null }); prev = out; }
    prev.connect(strip.auto);
    strip.sendR = ctx.createGain(); strip.sendD = ctx.createGain(); strip.sendR.gain.value = 0; strip.sendD.gain.value = 0;
    strip.fader.connect(strip.sendR); strip.fader.connect(strip.sendD); strip.sendR.connect(buses.reverb.input); strip.sendD.connect(buses.delay.input);
  };
  TS.makeBuses = function (ctx, master) {
    var b = {}; ['reverb', 'delay'].forEach(function (n) { var inp = ctx.createGain(), ret = ctx.createGain(); ret.gain.value = BUS[n].level; ret.connect(master); b[n] = { input: inp, ret: ret, fx: null }; }); return b;
  };
  TS.syncBuses = function (b, p) {
    if (!SK() || !b) return; var r = Fx.returns(p);
    ['reverb', 'delay'].forEach(function (n) { var x = b[n]; if (!x.fx) { x.fx = SK().fx(n, x.input.context, r[n].params); x.input.connect(x.fx.input); x.fx.output.connect(x.ret); } else x.fx.set(r[n].params);
      x.ret.gain.setTargetAtTime(r[n].level, x.ret.context.currentTime, 0.01); });
  };
  // make a strip's slots match the track (kinds, settings, bypass / mix, sends)
  TS.syncStrip = function (ctx, strip, tr) {
    if (!strip || !strip.slots || !SK()) return; var t = ctx.currentTime;
    strip.slots.forEach(function (sl, i) { var spec = Fx.slotOf(tr, i), kind = spec ? spec.kind : null;
      if (sl.kind !== kind) { if (sl.fx) { try { sl.inp.disconnect(sl.fx.input); } catch (e) {} try { sl.fx.output.disconnect(sl.wet); } catch (e) {} sl.fx.stop(); sl.fx = null; }
        sl.kind = kind; if (spec) { sl.fx = SK().fx(kind, ctx, spec.params); sl.inp.connect(sl.fx.input); sl.fx.output.connect(sl.wet); sl.sig = JSON.stringify(spec.params); } }
      else if (spec && sl.fx) { var sg = JSON.stringify(spec.params); if (sg !== sl.sig) { sl.fx.set(spec.params); sl.sig = sg; } }
      var g = spec ? Fx.gains(spec) : { wet: 0, dry: 1 }; sl.wet.gain.setTargetAtTime(g.wet, t, 0.01); sl.dry.gain.setTargetAtTime(g.dry, t, 0.01); });
    var sd = Fx.sends(tr); strip.sendR.gain.setTargetAtTime(sd.reverb, t, 0.01); strip.sendD.gain.setTargetAtTime(sd.delay, t, 0.01);
  };
  D.applyFxMix = function () {
    if (!this.useFx || !this.buses) return; var self = this; TS.syncBuses(this.buses, this.p);
    this.p.tracks.forEach(function (tr, i) { var s = self.strips[i]; if (s) TS.syncStrip(s.input.context, s, tr); });
  };
  TS.bounceFx = function (d, b2, tr, s, phase) { if (d.useFx && phase === 'pre') { var oc = s.input.context; TS.syncStrip(oc, s, tr); } };

  // generic controls from SynthKit's parameter table
  function paramRow(desc, value, onInput, onChange) {
    var l = el('label', null), name = el('span', null, desc.label), out = el('output', 'mdaw-num');
    if (desc.pick) { var s = el('select'); desc.pick.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; s.appendChild(op); }); s.value = value; s.dataset.k = desc.key; s.setAttribute('aria-label', desc.label);
      s.onchange = function () { onChange(s.value, true); }; l.appendChild(name); l.appendChild(s); return l; }
    var r = el('input'); r.type = 'range'; r.dataset.k = desc.key; r.setAttribute('aria-label', desc.label);
    function toV(x) { return desc.log ? desc.min * Math.pow(desc.max / desc.min, x / 1000) : +x; }
    if (desc.log) { r.min = 0; r.max = 1000; r.step = 1; r.value = 1000 * Math.log(value / desc.min) / Math.log(desc.max / desc.min); } else { r.min = desc.min; r.max = desc.max; r.step = desc.step || 'any'; r.value = value; }
    function show() { out.textContent = (desc.fmt || function (v) { return (+v).toFixed(2); })(toV(r.value)); } show();
    r.oninput = function () { show(); onInput(toV(r.value)); }; r.onchange = function () { onChange(toV(r.value), false); };
    l.appendChild(name); l.appendChild(out); l.appendChild(r); return l;
  }
  D.sectionSig = function (tr) { return JSON.stringify([(tr.fx || []).map(function (x) { return x && x.kind; }), this.fxOpen || null, tr.synth && tr.synth.kind]); };
  // the parameter box for one thing: a slot (spec lives in tr.fx[i]) or a bus (p.returns[name])
  D.fxParams = function (host, kind, get, set, extra) {
    var self = this, box = el('div', 'mdaw-fxparams'); host.appendChild(box);
    SK().FX[kind].params.forEach(function (desc) { var cur = get()[desc.key];
      box.appendChild(paramRow(desc, cur, function (v) { self.tsLive(function () { set(desc.key, v); }); if (kind !== 'reverb') self.applyMix(); },
        function (v, structural) { self.tsLive(function () { set(desc.key, v); }); if (structural) { self.tsCommit(); self.renderAll(); } else { self.applyMix(); self.tsCommit(); } })); });
    if (extra) extra(box);
  };
  D.fxPanel = function (tr, host) {
    var self = this, box = el('div', 'mdaw-tp mdaw-fx'); host.appendChild(box); box.appendChild(el('div', 'mdaw-sub', 'Effects: ' + tr.name));
    if (!SK() || !SK().fx) { box.appendChild(el('p', 'mdaw-hint', 'The effects need synth-kit.js on the page.')); return; }
    SK().fxClean('amp');                    // (fills the amp's cabinet menu)
    var slots = el('div', 'mdaw-fxslots'); box.appendChild(slots);
    for (var i = 0; i < NSLOT; i++) (function (i) {
      var spec = Fx.slotOf(tr, i), w = el('span', 'mdaw-fxslot'), sel = el('select'); sel.dataset.slot = i; sel.setAttribute('aria-label', 'Insert ' + (i + 1));
      var o0 = el('option', null, '— insert ' + (i + 1) + ' —'); o0.value = ''; sel.appendChild(o0);
      Fx.kinds().forEach(function (k) { var o = el('option', null, SK().FX[k].label); o.value = k; sel.appendChild(o); }); sel.value = spec ? spec.kind : '';
      sel.onchange = function () { self.change(function () { if (!tr.fx) tr.fx = [null, null, null]; tr.fx[i] = sel.value ? Fx.fresh(sel.value) : null; if (!sel.value && self.fxOpen === i) self.fxOpen = null; else if (sel.value) self.fxOpen = i; }); };
      w.appendChild(sel);
      if (spec) { var by = btn('Bypass', 'Switch this insert out and back in', 'mdaw-ms mdaw-fxbyp' + (spec.bypass ? ' mdaw-on' : '')); by.dataset.slot = i; by.onclick = function () { self.change(function () { tr.fx[i].bypass = !spec.bypass; }); };
        var ed = btn('Edit', 'Show this insert\'s controls', 'mdaw-ms' + (self.fxOpen === i ? ' mdaw-on' : '')); ed.dataset.slot = i; ed.onclick = function () { self.fxOpen = self.fxOpen === i ? null : i; self.renderPanel(true); };
        w.appendChild(by); w.appendChild(ed); }
      slots.appendChild(w); })(i);
    // sends and bus settings
    var sd = Fx.sends(tr), srow = el('div', 'mdaw-tools'); box.appendChild(srow);
    [['reverb', 'Reverb send'], ['delay', 'Delay send']].forEach(function (x) { var l = el('label', 'mdaw-lbl', x[1] + ' '), r = el('input'), no = el('output', 'mdaw-num', Math.round(sd[x[0]] * 100) + '%');
      r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(sd[x[0]] * 100); r.dataset.send = x[0]; r.setAttribute('aria-label', x[1]); r.title = 'After the fader, to the shared ' + x[0] + ' (which returns to the master)';
      r.oninput = function () { no.textContent = r.value + '%'; self.tsLive(function () { if (!tr.sends) tr.sends = {}; tr.sends[x[0]] = +r.value / 100; }); self.applyMix(); }; r.onchange = function () { self.tsCommit(); };
      l.appendChild(r); l.appendChild(no); srow.appendChild(l); });
    ['reverb', 'delay'].forEach(function (n) { var b = btn(SK().FX[n].label + ' bus', 'The shared ' + n + ' every track sends to', 'mdaw-ms' + (self.fxOpen === n ? ' mdaw-on' : '')); b.dataset.bus = n; b.onclick = function () { self.fxOpen = self.fxOpen === n ? null : n; self.renderPanel(true); }; srow.appendChild(b); });
    var open = this.fxOpen;
    if (typeof open === 'number') { var spec = Fx.slotOf(tr, open); if (spec) { var kind = spec.kind;
      box.appendChild(el('div', 'mdaw-sub', SK().FX[kind].label + ' (insert ' + (open + 1) + ')'));
      this.fxParams(box, kind, function () { return Fx.slotOf(tr, open).params; }, function (k, v) { var s = Fx.slotOf(tr, open); s.params[k] = v; tr.fx[open] = s; }, function (pb) {
        pb.appendChild(paramRow({ key: 'mix', label: 'Mix (dry → wet)', min: 0, max: 1, step: 0.01, fmt: function (v) { return Math.round(v * 100) + '%'; } }, spec.mix, function (v) { self.tsLive(function () { var s = Fx.slotOf(tr, open); s.mix = v; tr.fx[open] = s; }); self.applyMix(); }, function () { self.tsCommit(); })); }); } }
    else if (open === 'reverb' || open === 'delay') { var r0 = Fx.returns(this.p);
      box.appendChild(el('div', 'mdaw-sub', SK().FX[open].label + ' bus (shared by every track)'));
      this.fxParams(box, open, function () { return Fx.returns(self.p)[open].params; }, function (k, v) { var rr = Fx.returns(self.p); rr[open].params[k] = v; if (!self.p.returns) self.p.returns = {}; self.p.returns[open] = rr[open]; }, function (pb) {
        pb.appendChild(paramRow({ key: 'level', label: 'Return level', min: 0, max: 1, step: 0.01, fmt: function (v) { return Math.round(v * 100) + '%'; } }, r0[open].level, function (v) { self.tsLive(function () { var rr = Fx.returns(self.p); rr[open].level = v; if (!self.p.returns) self.p.returns = {}; self.p.returns[open] = rr[open]; }); self.applyMix(); }, function () { self.tsCommit(); })); }); }
    box.appendChild(el('p', 'mdaw-hint', 'Three inserts in a row before the fader, then sends to a shared reverb and delay that return to the master. The same effects as the Sound design lessons. Not checked by ear; not in the MIDI export.'));
  };

  // ---------------- synth instruments ----------------
  // Tracks whose inst is 'syn-sub' | 'syn-fm' | 'syn-wt' | 'syn-chip' (INSTS in mini-daw.js, listed with data-synth) play SynthKit voices (SynthKit.voice,
  // synth-kit.js) instead of BandSounds samples: track.synth = { params } (plain JSON, SynthKit.SYN[kind].params; missing = the defaults). One voice factory per
  // track strip (its settings are read when each note starts), on the live context, for keys / recording, and again on the bounce's OfflineAudioContext. Played notes
  // are stopped with the transport (stopSound). MIDI export: GM program 81 (subtractive, Lead 2 sawtooth), 5 (FM, Electric Piano 2), 88 (wavetable, Pad 1), 80 (chip,
  // Lead 1 square): our choice, nothing matches the sound; a re-imported file gives the nearest sampled instrument. The wavetable has no scan LFO here (one position).
  var SYNTH = TS.Synth = {
    kindOf: function (inst) { var I = X.instOf(inst); return I && I.synth || null; },
    params: function (tr) { var k = SYNTH.kindOf(tr.inst); return k && SK() ? SK().synClean(k, tr.synth && tr.synth.params) : null; }
  };
  var entries = typeof WeakMap === 'function' ? new WeakMap() : null;      // destination node -> { kind, sig, make, out, live: [voice] }
  TS.playSynth = function (tr, n, when, secs, dest) {
    var k = SYNTH.kindOf(tr.inst); if (!k || !SK() || !SK().voice || !dest || !entries) return null;
    var ctx = dest.context, P = SYNTH.params(tr), sig = JSON.stringify(P), e = entries.get(dest);
    if (!e || e.kind !== k) { if (e) e.make.dispose(); var out = ctx.createGain(); out.connect(dest); e = { kind: k, sig: sig, make: SK().voice(k, ctx, P, out), out: out, live: [] }; entries.set(dest, e); }
    else if (e.sig !== sig) { e.make.set(P); e.sig = sig; }
    var v = e.make(n.m, n.v, when); if (!v) return null;
    if (secs != null) v.off(when + Math.max(0.03, secs)); e.live.push(v); if (e.live.length > 300) e.live.shift();
    return { synth: v };
  };
  D.stopSound = function () { var self = this, now = ctxTime(this); (this.strips || []).forEach(function (s) { var e = entries && s && entries.get(s.input); if (!e) return; e.live.forEach(function (v) { try { v.off(now); } catch (x) {} }); e.live = []; }); };
  function ctxTime(d) { return d.strips && d.strips[0] ? d.strips[0].input.context.currentTime : 0; }
  D.synthPanel = function (tr, host) {
    var kind = SYNTH.kindOf(tr.inst); if (!kind) return false; var self = this, box = el('div', 'mdaw-tp mdaw-synth'); host.appendChild(box);
    box.appendChild(el('div', 'mdaw-sub', (SK() ? SK().SYN[kind].label : 'Synth') + ': ' + tr.name));
    if (!SK() || !SK().voice) { box.appendChild(el('p', 'mdaw-hint', 'The synths need synth-kit.js on the page.')); return true; }
    var pr = el('div', 'mdaw-tools'); box.appendChild(pr); pr.appendChild(el('span', 'mdaw-lbl', 'Presets'));
    SK().SYN[kind].presets.forEach(function (p) { var b = btn(p.name, 'Load this patch (from the Sound design lessons)', 'mdaw-synpre'); b.onclick = function () { self.change(function () { tr.synth = { params: SK().synClean(kind, p.set) }; }); self.audition(tr, 60); }; pr.appendChild(b); });
    var tryB = btn('▶ Try C4', 'Play one note with this patch', 'mdaw-syntry'); tryB.onclick = function () { self.audition(tr, 60); }; pr.appendChild(tryB);
    var grid = el('div', 'mdaw-fxparams'); box.appendChild(grid); var cur = SYNTH.params(tr);
    SK().SYN[kind].params.forEach(function (desc) {
      function put(v) { if (!tr.synth) tr.synth = { params: {} }; if (!tr.synth.params) tr.synth.params = {}; tr.synth.params[desc.key] = v; }
      grid.appendChild(paramRow(desc, cur[desc.key], function (v) { self.tsLive(function () { put(v); }); }, function (v, structural) { self.tsLive(function () { put(v); }); self.tsCommit(); })); });
    box.appendChild(el('p', 'mdaw-hint', 'The patch is read when each note starts. Presets and controls are the Sound design lessons\'. Not checked by ear.'));
    return true;
  };
})(window);
