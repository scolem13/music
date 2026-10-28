// solfege-sing.js — sings a melody on solfège syllables with a synthesized voice (the rhythm chant's voice, given a pitch).
// One global (SolfegeSing); loads in Node for tests (plan() needs abc-core.js and abc-events.js; nothing touches Web Audio until play()).
//
//   SolfegeSing.plan(abc, { neutral ("bum": every note on Bum), qpm, minor: "la"|"do", fixed, chromatic: "auto"|"flat"|"sharp", voice: "low"|"high"|"auto", octave, transpose, seed })
//        transpose: semitones the sound moves (the syllables stay those of the written key). voice "auto": sung at the written pitch
//        (+ transpose), by the low or the high voice as the melody's middle note says; otherwise moved by octaves into the voice's range.
//        -> { notes: [{ t, dur, tQ, durQ, midi, sung (midi actually sung), hz, syl, c, v, i, bar }], total, lead, qpm, voice }
//        t is seconds from the start of the sound (lead seconds of consonant come before the first beat).
//   SolfegeSing.syllable(midi, doPc, { prev, next, chromatic }) -> "Do" .. "Ti" (and Di Ri Fi Si Li / Ra Me Se Le Te)
//   SolfegeSing.doPc(key, { minor }) -> the pitch class of Do for an ABC key ("Eb", "Am", "D dor", "Gmix") — movable do
//   SolfegeSing.render(plan, sampleRate) -> Float32Array (mono)
//   SolfegeSing.play(abc, { qpm, ctx, when, dest, onNote(note, index), onEnd, ...plan opts }) -> { stop, plan, endsAt }
//        own AudioContext (registered with AudioTap as "Solfège voice") unless opts.ctx is given.
//   SolfegeSing.button(parent, { getAbc, qpm, label }) -> a "▶ Sing" / "■ Stop" button
//
// THE SYLLABLES (movable do, as DegreeNames labels them on this site):
//  Do is the major tonic of the key signature, so a minor key is La-based (A minor: A is La). opts.minor = "do" makes the key's own tonic Do
//  for minor and the modes (A minor: A is Do, C is Me). opts.fixed = true: C is always Do.
//  Diatonic: Do Re Mi Fa So La Ti. Chromatic notes take the raised name (Di Ri Fi Si Li) when the line goes up through them and the lowered
//  name (Ra Me Se Le Te) when it goes down (opts.chromatic "sharp"/"flat" forces one). This up-raised / down-lowered rule is the common
//  classroom convention; UNVERIFIED here (not yet checked against a cited source). The site's labels (degree-names.js) use the lowered set.
//
// THE VOICE. Source, tract and onsets as in rhythm-chant.js (Rosenberg pulse, five Klatt resonators in cascade, vowel formants from the IPA
// chart's table, adult male, high voice scaled x1.16), with these changes. All JUDGEMENT (by ear and from general phonetics), UNVERIFIED:
//  Loudness  each vowel is evened out at its pitch (measured by rendering it); F1 is kept just above the pitch, as trained singers open
//            high vowels (vowel modification; UNVERIFIED as a citation).
//  Pitch     the written note, moved by octaves into the voice's range (low ~ G2-E4, high ~ G3-E5) unless opts.octave is given. A short glide
//            (~50 ms) from the note before when the line is legato; vibrato (5.5 Hz, up to ~25 cents) comes in on notes longer than ~0.35 s.
//  Timing    the consonant comes before the beat so the vowel starts on it (as choirs are taught to place consonants).
//  Vowels    e is sung "ay" (Re Me Se Le Te as "ray", "may"; the user): it starts between e and ɛ (F1 520, F2 1900) and glides to ɪ
//            over the first half of the note (at most 0.3 s), as the chant's "De" does. F1 on high notes keeps its distance above i's.
//            Do So: o; Re Me Se Le Te: e; Mi Ti Di Ri Fi Si Li: i; Fa La Ra: a.
//  Onsets    d (Do Di): voice bar, burst at the locus F2 1800.  r (Re Ri Ra): a voiced tap, a 20 ms dip.  m (Mi Me): nasal murmur [250 1100 2300], 95 ms (the user: a touch longer).
//            f (Fa Fi): weak broad noise, voiceless.  s (So Si Se): sibilant noise ~6 kHz, 120 ms, louder (the user: clearer).  l (La Li Le): lateral [360 1300 2900].
//            t (Ti Te): burst and aspiration, as the chant's Ta.
(function (global) {
  "use strict";
  var Core = global.AbcCore || (typeof require === "function" ? safeRequire("./abc-core.js") : null);
  var Events = global.AbcEvents || (typeof require === "function" ? safeRequire("./abc-events.js") : null);
  function safeRequire(p) { try { return require(p); } catch (e) { return null; } }
  void Core;

  // ------------------------------------------------------------------------------------------------ syllables
  var DIATONIC = { 0: "Do", 2: "Re", 4: "Mi", 5: "Fa", 7: "So", 9: "La", 11: "Ti" };
  var SHARP = { 1: "Di", 3: "Ri", 6: "Fi", 8: "Si", 10: "Li" };
  var FLAT = { 1: "Ra", 3: "Me", 6: "Se", 8: "Le", 10: "Te" };
  var PARTS = {
    Do: ["d", "o"], Re: ["r", "e"], Mi: ["m", "i"], Fa: ["f", "a"], So: ["s", "o"], La: ["l", "a"], Ti: ["t", "i"],
    Di: ["d", "i"], Ri: ["r", "i"], Fi: ["f", "i"], Si: ["s", "i"], Li: ["l", "i"],
    Ra: ["r", "a"], Me: ["m", "e"], Se: ["s", "e"], Le: ["l", "e"], Te: ["t", "e"],
    Bum: ["b", "U"]   // opts.neutral "bum": the neutral syllable MLT teachers sing before solfège (vowel near ʌ; the closing m left out)
  };
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function syllable(midi, doPc, o) {
    o = o || {};
    var d = mod12(midi - (doPc || 0));
    if (DIATONIC[d]) return DIATONIC[d];
    if (o.inKey && o.inKey[mod12(midi)]) return d === 6 ? SHARP[d] : FLAT[d];   // in the key signature (do-based minor, modes): Me Le Te Ra, Fi
    var ch = o.chromatic || "auto";
    if (ch === "sharp") return SHARP[d];
    if (ch === "flat") return FLAT[d];
    var dir = o.next != null && o.next !== midi ? o.next - midi : o.prev != null && o.prev !== midi ? midi - o.prev : -1;
    return dir > 0 ? SHARP[d] : FLAT[d];
  }
  var LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // mode -> semitones from the key's tonic up to its major tonic (Do)
  var MODES = { "": 0, maj: 0, ion: 0, m: 3, min: 3, aeo: 3, dor: 10, phr: 8, lyd: 7, mix: 5, loc: 1 };
  function parseKey(key) {
    var m = /^\s*([A-Ga-g])([#b♯♭]?)\s*([A-Za-z]*)/.exec(String(key || "C"));
    if (!m) return { root: 0, shift: 0, mode: "" };
    var root = LETTER[m[1].toUpperCase()] + (m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0);
    var md = m[3].toLowerCase(), mode = md === "m" ? "m" : md.slice(0, 3);
    if (!(mode in MODES)) mode = /^(none|hp|exp)/.test(md) ? "" : "";
    return { root: mod12(root), shift: MODES[mode] || 0, mode: mode };
  }
  function keyPcs(key) { var k = parseKey(key), d = mod12(k.root + k.shift), set = {}; [0, 2, 4, 5, 7, 9, 11].forEach(function (x) { set[mod12(d + x)] = true; }); return set; }
  function doPc(key, o) {
    o = o || {};
    if (o.fixed) return 0;
    var k = parseKey(key);
    return o.minor === "do" ? k.root : mod12(k.root + k.shift);
  }

  // ------------------------------------------------------------------------------------------------ plan
  function qpmOf(abc, fallback) {
    var m = /^Q:\s*(?:"[^"]*"\s*)?(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/m.exec(abc || "");
    if (!m) return fallback || 90;
    var bpm = +m[3]; if (!m[1]) return bpm;
    return bpm * (+m[1] / +m[2]) * 4;
  }
  var RANGE = { low: { center: 52, lo: 43, hi: 64, scale: 1 }, high: { center: 64, lo: 55, hi: 76, scale: 1.16 } };
  var CDUR = { b: 0.045, d: 0.045, r: 0.035, m: 0.095, f: 0.085, s: 0.12, l: 0.06, t: 0.06 };
  function plan(abc, opts) {
    opts = opts || {};
    if (!Events) throw new Error("SolfegeSing.plan needs abc-events.js");
    var ev = Events.fromAbc(abc), qpm = opts.qpm || qpmOf(abc, 90), spq = 60 / qpm;
    var keys = [{ t: -1, key: ev.key }].concat((ev.fields || []).filter(function (f) { return f.name === "K"; }).map(function (f) { return { t: f.t, key: f.value }; }));
    var notes = ev.sounding.filter(function (e) { return e.kind === "note" && e.pitches && e.pitches.length; });
    var tr = Math.round(+opts.transpose || 0), voiceName = RANGE[opts.voice] ? opts.voice : "low", shift = tr;
    if (opts.voice === "auto" && notes.length) {                    // the pitch as written (+ transpose); the voice whose range holds it
      var ws = notes.map(function (e) { return e.pitches[0].midi + tr; }).sort(function (a, b) { return a - b; });
      voiceName = ws[Math.floor(ws.length / 2)] >= 59 ? "high" : "low";
    }
    var R = RANGE[voiceName];
    if (opts.voice === "auto" && opts.octave == null) opts = Object.assign({}, opts, { octave: 0 });
    if (opts.octave != null) shift += 12 * Math.round(+opts.octave);
    else if (notes.length) {
      var ms = notes.map(function (e) { return e.pitches[0].midi; }).sort(function (a, b) { return a - b; }), med = ms[Math.floor(ms.length / 2)];
      shift = tr + 12 * Math.round((R.center - med - tr) / 12);
      while (ms[ms.length - 1] + shift > R.hi + 3 && ms[0] + shift - 12 >= R.lo - 5) shift -= 12;
      while (ms[0] + shift < R.lo - 3 && ms[ms.length - 1] + shift + 12 <= R.hi + 5) shift += 12;
    }
    var out = notes.map(function (e, j) {
      var midi = e.pitches[0].midi, k = keys[0].key;
      keys.forEach(function (x) { if (x.t <= e.t_on + 1e-6) k = x.key; });
      var prev = j ? notes[j - 1].pitches[0].midi : null, next = j < notes.length - 1 ? notes[j + 1].pitches[0].midi : null;
      var syl = syllable(midi, doPc(k, opts), { prev: prev, next: next, chromatic: opts.chromatic, inKey: keyPcs(k) }); if (opts.neutral) syl = "Bum"; var p = PARTS[syl];
      var sung = midi + shift;
      return { tQ: e.t_on, durQ: e.t_off - e.t_on, t: e.t_on * spq, dur: (e.t_off - e.t_on) * spq, midi: midi, sung: sung,
               hz: 440 * Math.pow(2, (sung - 69) / 12), syl: syl, c: p[0], v: p[1], i: e.from && ev.written ? firstChar(ev.written, e.from[0]) : null, bar: e.bar };
    });
    var lead = out.length ? CDUR[out[0].c] + 0.03 : 0;
    out.forEach(function (n) { n.t += lead; });
    var last = out[out.length - 1];
    return { notes: out, lead: lead, qpm: qpm, total: last ? last.t + last.dur + 0.25 : 0.3, voice: { name: voiceName, scale: R.scale }, seed: opts.seed != null ? opts.seed : 1 };
  }
  function firstChar(written, id) { for (var i = 0; i < written.length; i++) if (written[i].id === id) return written[i].i; return null; }

  // ------------------------------------------------------------------------------------------------ voice
  var VOWELS = { U: [640, 1190, 2390], u: [280, 610, 2200], e: [520, 1900, 2600], a: [760, 1080, 2500], i: [280, 2250, 2950], o: [430, 750, 2400] };
  var EY = [320, 2250, 2900];                                     // where e glides to: the ɪ of "may" (kept a little apart from i)
  var LOCUS = { b: [250, 800, 2200], d: [250, 1800, 2900], t: [250, 1800, 2900], r: [350, 1700, 2600], m: [250, 1100, 2300], l: [360, 1300, 2900], f: [300, 1200, 2500], s: [300, 1700, 2600] };
  var BW = [70, 90, 130, 180, 300];
  function mulberry(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function res(f, bw, sr) { f = Math.min(f, sr * 0.45); var r = Math.exp(-Math.PI * bw / sr), C = -r * r, B = 2 * r * Math.cos(2 * Math.PI * f / sr); return [1 - B - C, B, C]; }
  function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  // gain that gives each vowel the same loudness, measured once per voice and sample rate by rendering it steady
  var VG = {};
  function vowelGain(v, voice, sr, midi) {
    var key = voice.name + ":" + sr + ":" + v + ":" + Math.round(midi);
    if (VG[key] == null) {
      var n = { t: 0, dur: 0.3, hz: 440 * Math.pow(2, (Math.round(midi) - 69) / 12), c: "", v: v, prevHz: null, lvl: 1 };
      var buf = new Float32Array(Math.ceil(0.32 * sr)); renderNote(buf, sr, n, voice, mulberry(7), 1, true);
      var s = 0, c = 0; for (var i = Math.round(0.08 * sr); i < Math.round(0.25 * sr); i++) { s += buf[i] * buf[i]; c++; }
      VG[key] = 0.2 / Math.max(1e-6, Math.sqrt(s / c));
    }
    return VG[key];
  }

  function render(p, sr) {
    var rng = mulberry(p.seed || 1), out = new Float32Array(Math.ceil((p.total + 0.3) * sr));
    p.notes.forEach(function (n, j) {
      var prev = p.notes[j - 1], next = p.notes[j + 1];
      var cd = n.c ? CDUR[n.c] : 0;
      var nn = { t: n.t - cd, cd: cd, dur: n.dur + cd, hz: n.hz, c: n.c, v: n.v,
                 prevHz: prev && prev.t + prev.dur > n.t - 0.08 ? prev.hz : null,
                 lvl: 0.8 + (n.durQ >= 1 ? 0.1 : 0) + (j === p.notes.length - 1 ? 0.05 : 0) };
      if (next) { var ncd = next.c ? CDUR[next.c] : 0, end = next.t - ncd; if (nn.t + nn.dur > end - 0.005) nn.dur = Math.max(0.05, end - 0.005 - nn.t); }
      else nn.dur += 0.12;                                           // the last note rings on a little
      renderNote(out, sr, nn, p.voice, rng, vowelGain(n.v, p.voice, sr, n.sung), false);
    });
    return out;
  }

  function renderNote(out, sr, n, voice, rng, vg, steady) {
    var i0 = Math.max(0, Math.round(n.t * sr)), N = Math.min(out.length - i0, Math.round(n.dur * sr)), cd = n.cd || 0, c = n.c, scale = voice.scale;
    var tg = VOWELS[n.v], lc = LOCUS[c] || tg, rel = Math.min(0.05, n.dur * 0.3);
    var z = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], co = null, F = [0, 0, 0, 0, 0], k;
    var phase = rng(), gprev = 0, jit = 0, amp = 1, f0 = n.hz;
    var fz = [0, 0], fco = c === "s" ? res(6000, 1800, sr) : c === "f" ? res(4200, 5000, sr) : res(3800, 2200, sr);
    var vibPh = rng() * 6.28, vibDepth = n.dur - cd > 0.35 ? 25 : 0;
    for (var s = 0; s < N; s++) {
      var t = s / sr, tv = t - cd;                                    // tv: time since the vowel began (the beat)
      // voicing level through the consonant, then the vowel
      var av, nz = 0, burst = 0, fm = tv < 0 ? 1 : Math.exp(-tv / 0.022);   // fm: how far the formants still sit at the consonant's locus
      if (steady) { av = 1; fm = 0; }
      else if (tv >= 0) av = Math.min(1, 0.35 + tv / 0.03);
      else {
        var u = t / cd;
        switch (c) {
          case "b": case "d": av = 0.06; if (tv > -0.008) burst = 0.5; break;
          case "t": av = 0; if (tv > -0.03 && tv < -0.022) burst = 0.6; if (tv >= -0.022) nz = 0.45; break;
          case "r": av = 0.75 - 0.5 * Math.sin(Math.PI * sm(u)); break;
          case "m": av = 0.32 * Math.min(1, u * 4); break;
          case "l": av = 0.5 * Math.min(1, u * 4); break;
          case "f": av = 0; nz = 0.0; break;
          case "s": av = 0; break;
          default: av = 0;
        }
      }
      var fric = 0;
      if (!steady && tv < 0 && (c === "s" || c === "f")) { var uu = t / cd; fric = (c === "s" ? 1.1 : 0.18) * Math.sin(Math.PI * Math.min(1, uu * 1.1)); }
      if (t > n.dur - rel) av *= Math.max(0, (n.dur - t) / rel);
      av *= n.lvl == null ? 1 : n.lvl;
      if (s % 16 === 0) {
        var nasal = c === "m" && tv < 0, lat = c === "l" && tv < 0;
        var gy = n.v === "e" ? sm(Math.max(0, tv) / Math.min(0.3, Math.max(0.08, 0.55 * (n.dur - cd)))) : 0;   // e -> "ay"
        for (k = 0; k < 4; k++) { var vt = k < 3 ? tg[k] + (EY[k] - tg[k]) * gy : 3500, lt = k < 3 ? lc[k] : 3500; F[k] = (vt + (lt - vt) * fm) * scale; }
        F[4] = 4700 * scale;
        if (tv >= 0 || steady) F[0] = Math.max(F[0], n.hz * 1.15 + (tg[0] - 280) * scale);   // F1 kept above the pitch on high notes (singers open the vowel there)
        co = F.map(function (f, q) { return res(f, BW[q] * (nasal && q < 3 ? 2.2 : lat && q === 1 ? 1.6 : 1), sr); });
      }
      // pitch: a glide from the note before, vibrato on long notes, a little jitter
      var hz = n.hz;
      if (n.prevHz && !steady) hz = n.prevHz * Math.pow(n.hz / n.prevHz, sm((tv + 0.015) / 0.06));
      var vd = vibDepth * sm((tv - 0.25) / 0.35);
      f0 = hz * Math.pow(2, (vd * Math.sin(vibPh + 2 * Math.PI * 5.5 * t)) / 1200) * (1 + jit);
      var voiced = 0, asp = 0;
      if (av > 1e-4) {
        phase += f0 / sr;
        if (phase >= 1) { phase -= 1; jit = gauss(rng) * 0.004; amp = 1 + gauss(rng) * 0.02; }
        var oq = 0.6, Tp = oq * 0.68, Tn = oq * 0.32, gl;
        if (phase < Tp) gl = 0.5 * (1 - Math.cos(Math.PI * phase / Tp)); else if (phase < Tp + Tn) gl = Math.cos(Math.PI * (phase - Tp) / (2 * Tn)); else gl = 0;
        voiced = (gl - gprev) * (sr / f0) * 0.11 * amp; gprev = gl;
        asp = (rng() * 2 - 1) * (0.02 + 0.04 * gl);
      } else gprev = 0;
      var x = (voiced + asp) * av + (rng() * 2 - 1) * nz * 0.35;
      x *= vg;
      for (k = 0; k < 5; k++) { var cc = co[k], y = cc[0] * x + cc[1] * z[k][0] + cc[2] * z[k][1]; z[k][1] = z[k][0]; z[k][0] = y; x = y; }
      var nb = (fric + burst) ? (rng() * 2 - 1) * (fric + burst) : 0;
      if (nb || fz[0] || fz[1]) { var yf = fco[0] * nb + fco[1] * fz[0] + fco[2] * fz[1]; fz[1] = fz[0]; fz[0] = yf; x += yf * 0.12; }
      out[i0 + s] += x;
    }
  }

  // ------------------------------------------------------------------------------------------------ playing
  var own = null;
  function ownContext() {
    if (own) return own;
    var AC = global.AudioContext || global.webkitAudioContext, ctx = new AC(), out = ctx.createGain();
    out.gain.value = 0.9; out.connect(ctx.destination);
    if (global.AudioTap) try { global.AudioTap.register(ctx, out, "Solfège voice"); } catch (e) {}
    own = { ctx: ctx, out: out }; return own;
  }
  var current = null;
  function play(abc, opts) {
    opts = opts || {};
    if (current && !opts.ctx) { try { current.stop(); } catch (e) {} }
    var p = plan(abc, opts), ctx = opts.ctx || ownContext().ctx;
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    var data = render(p, ctx.sampleRate), pk = 0, i;
    for (i = 0; i < data.length; i++) { var a = Math.abs(data[i]); if (a > pk) pk = a; }
    if (pk > 1e-4) for (i = 0; i < data.length; i++) data[i] *= 0.9 / pk;
    var buf = ctx.createBuffer(1, data.length, ctx.sampleRate); buf.getChannelData(0).set(data);
    var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; g.gain.value = opts.gain != null ? opts.gain : 0.8;
    src.connect(g); g.connect(opts.dest || (own && ctx === own.ctx ? own.out : ctx.destination));
    var when = opts.when != null ? opts.when - p.lead : ctx.currentTime + 0.08;
    src.start(Math.max(ctx.currentTime, when));
    var timers = [], stopped = false, t0 = (Math.max(ctx.currentTime, when) - ctx.currentTime) * 1000;
    if (opts.onNote) p.notes.forEach(function (n, j) { timers.push(setTimeout(function () { if (!stopped) opts.onNote(n, j); }, t0 + n.t * 1000)); });
    timers.push(setTimeout(function () { if (stopped) return; if (current === h) current = null; if (opts.onEnd) opts.onEnd(); }, t0 + p.total * 1000 + 60));
    var h = { plan: p, endsAt: when + p.total, stop: function () {
      stopped = true; timers.forEach(clearTimeout); var t = ctx.currentTime;
      try { g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.03); src.stop(t + 0.05); } catch (e) {}
      if (current === h) current = null;
    } };
    if (!opts.ctx) current = h;
    return h;
  }
  function button(parent, o) {
    o = o || {};
    var b = global.document.createElement("button"), h = null, label = o.label || "\u25B6 Sing";
    b.type = "button"; b.className = o.className || "solfege-sing-btn"; b.textContent = label;
    b.title = o.title || "Sing the melody on solfège syllables (movable do).";
    function reset() { h = null; b.textContent = label; }
    b.addEventListener("click", function () {
      if (h) { h.stop(); reset(); return; }
      var abc = o.getAbc ? o.getAbc() : ""; if (!abc) return;
      var po = Object.assign({}, o.opts ? o.opts() : {}, { onEnd: reset, onNote: o.onNote });
      if (o.qpm) po.qpm = typeof o.qpm === "function" ? o.qpm() : o.qpm;
      try { h = play(abc, po); b.textContent = "\u25A0 Stop"; } catch (e) { reset(); if (global.console) console.warn("SolfegeSing", e); }
    });
    if (parent) parent.appendChild(b);
    return b;
  }

  var api = { plan: plan, render: render, play: play, button: button, syllable: syllable, doPc: doPc, VOWELS: VOWELS, CDUR: CDUR,
              stop: function () { if (current) current.stop(); } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.SolfegeSing = api;
})(typeof window !== "undefined" ? window : globalThis);
