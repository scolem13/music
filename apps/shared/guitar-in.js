// guitar-in.js: a guitar through the microphone or a DI, read like a MIDI input (basic version of
// scripts/guitar-di/GUITAR-IN.md). Browser: window.GuitarIn. Node: module.exports (tests/guitar-in/guitar-in.test.js).
//
//   GuitarIn.analyse(samples, sr, o) -> { notes (MIDI, low first), pcs, bass, hz, cents, check }
//        samples: a Float32Array that starts just past the pick attack (about 80 ms after the onset), at least NF long.
//        o.expect: MIDI notes the page wants. One note: graded on the exact note (octave counts). A chord: graded on
//        pitch classes and bass pitch class, the way the drills grade a MIDI chord.
//        check = { ok, found: [bool per expected note], extra: [pcs heard that were not asked for], heard }
//   GuitarIn.listen(o) -> { start() -> Promise, stop(), running }
//        o { ctx, source (tests: a function (ctx) -> AudioNode, else the microphone via PitchDetect.mic), onStrum(ev),
//            onLevel(rms), expect() -> MIDI notes, hold() -> true while the page's own sound plays }
//        ev = analyse's result + { t }. One event per strum: an onset is a jump in level; the next one waits 300 ms.
//   GuitarIn.OPEN = [40,45,50,55,59,64] standard tuning, low string first. GuitarIn.NF = 16384.
// Numbers from synthetic strums only (GUITAR-IN.md): about 8 chords in 10 read exactly. Not yet checked on a real guitar.
(function (global) {
  "use strict";
  var NF = 16384, OPEN = [40, 45, 50, 55, 59, 64], SKIP = 0.08, GATE = 0.01;

  function fft(re, im) {
    var n = re.length, i, j, b, l, k, t;
    for (i = 1, j = 0; i < n; i++) { b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (l = 2; l <= n; l <<= 1) {
      var a = -2 * Math.PI / l, wr = Math.cos(a), wi = Math.sin(a);
      for (i = 0; i < n; i += l) {
        var cr = 1, ci = 0;
        for (k = 0; k < l / 2; k++) {
          var u = i + k, v = u + l / 2, xr = re[v] * cr - im[v] * ci, xi = re[v] * ci + im[v] * cr;
          re[v] = re[u] - xr; im[v] = im[u] - xi; re[u] += xr; im[u] += xi;
          t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  function spectrum(x) {
    var re = new Float64Array(NF), im = new Float64Array(NF), i;
    for (i = 0; i < NF; i++) re[i] = (x[i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF));
    fft(re, im);
    var m = new Float64Array(NF / 2); for (i = 0; i < NF / 2; i++) m[i] = Math.hypot(re[i], im[i]); return m;
  }
  var hzOf = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  function magAt(sp, f, binHz) { var i = Math.round(f / binHz), mx = 0; for (var k = i - 1; k <= i + 1; k++) if (sp[k] > mx) mx = sp[k]; return mx; }
  function salience(sp, m, binHz) { var f0 = hzOf(m), s = 0; for (var h = 1; h <= 10; h++) { if (f0 * h > 5000) break; s += Math.pow(0.88, h - 1) * magAt(sp, f0 * h, binHz); } return s; }
  // The prototype's iterative multi-f0: take the note with the most harmonic energy, cancel its partials, repeat.
  function multiF0(sp0, binHz) {
    var sp = Float64Array.from(sp0), found = [], first = 0;
    for (var it = 0; it < 6; it++) {
      var best = -1, bs = 0;
      for (var m = 40; m <= 88; m++) { var s = salience(sp, m, binHz); if (s > bs) { bs = s; best = m; } }
      if (best < 0) break; if (it === 0) first = bs; if (bs < 0.3 * first) break;
      found.push(best);
      var f0 = hzOf(best);
      for (var h = 1; h <= 10; h++) { var b = Math.round(f0 * h / binHz); for (var k = b - 2; k <= b + 2; k++) if (sp[k] !== undefined) sp[k] *= 0.1; }
    }
    return found.sort(function (a, b) { return a - b; });
  }
  var pc = function (m) { return ((m % 12) + 12) % 12; };
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }).sort(function (x, y) { return x - y; }); }

  function analyse(x, sr, o) {
    o = o || {};
    var binHz = sr / NF, sp = spectrum(x), notes = multiF0(sp, binHz), exp = (o.expect || []).slice().sort(function (a, b) { return a - b; });
    var r = { notes: notes, pcs: uniq(notes.map(pc)), bass: notes.length ? notes[0] : null, hz: -1, cents: 0 };
    // one note: YIN (PitchDetect) on 2048 samples gives the exact pitch and the cents
    var PD = global.PitchDetect || (typeof require === "function" ? require("./pitch-detect.js") : null);
    if (PD) { var hz = PD.detect(x.subarray(0, 2048), sr, { fmin: 70, fmax: 1400, gate: 0.004 }); if (hz > 0) { var a = PD.analyse(hz); r.hz = hz; r.cents = a.cents; r.yin = a.midi; } }
    if (!exp.length) return r;
    if (exp.length === 1) {
      var heard = r.yin != null ? r.yin : r.bass;
      r.check = { ok: heard === exp[0], found: [heard === exp[0]], extra: [], heard: heard };
      return r;
    }
    // a chord: a pitch class asked for also counts when its own harmonics are strong (verification, not blind transcription)
    var sal = exp.map(function (m) { return salience(sp, m, binHz); }), top = Math.max.apply(null, sal) || 1;
    var found = exp.map(function (m, i) { return r.pcs.indexOf(pc(m)) >= 0 || sal[i] / top > 0.25; });
    var want = uniq(exp.map(pc)), pcOk = want.every(function (p) { return exp.some(function (m, i) { return pc(m) === p && found[i]; }); });
    var extra = r.pcs.filter(function (p) { return want.indexOf(p) < 0; });
    var bassOk = r.bass != null && pc(r.bass) === pc(exp[0]);
    r.check = { ok: pcOk && bassOk && !extra.length, found: found, extra: extra, bassOk: bassOk, heard: r.bass };
    return r;
  }

  function listen(o) {
    var L = { running: false }, mic = null, slow = 0, last = -1e9, grab = null, gpos = 0, wait = 0;
    function block(d, n0, sr) {
      var s = 0, i; for (i = 0; i < d.length; i++) s += d[i] * d[i]; var r = Math.sqrt(s / d.length);
      if (o.onLevel) o.onLevel(r);
      var held = o.hold && o.hold();
      if (grab) {                                   // collecting the window after an onset
        for (i = 0; i < d.length; i++) {
          if (wait > 0) { wait--; continue; }
          if (gpos < NF) grab[gpos++] = d[i];
        }
        if (gpos >= NF) {
          var ev = analyse(grab, sr, { expect: o.expect ? o.expect() : [] }); ev.t = n0 / sr; grab = null;
          if (o.onStrum) o.onStrum(ev);
        }
      } else if (!held && r > GATE && r > 2.5 * slow && n0 - last > 0.3 * sr) {
        last = n0; grab = new Float32Array(NF); gpos = 0; wait = Math.round(SKIP * sr);
      }
      slow = 0.8 * slow + 0.2 * r;
    }
    L.start = function () {
      var PD = global.PitchDetect;
      mic = PD.mic({ ctx: o.ctx, source: o.source, onBlock: block, onError: o.onError });
      return mic.start().then(function () { L.running = true; return L; });
    };
    L.stop = function () { if (mic) mic.stop(); L.running = false; grab = null; };
    return L;
  }

  var GuitarIn = { analyse: analyse, listen: listen, multiF0: multiF0, spectrum: spectrum, OPEN: OPEN, NF: NF };
  if (typeof module !== "undefined" && module.exports) module.exports = GuitarIn; else global.GuitarIn = GuitarIn;
})(typeof window !== "undefined" ? window : globalThis);
