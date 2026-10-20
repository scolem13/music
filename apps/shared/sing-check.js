// sing-check.js — grade a sung line against written ABC. One global (SingCheck); loads in Node for the tests.
//
//   SingCheck.expected(abc, semitones) -> { notes: [{ i, t_on, t_off, midi }], bpm }   the sounding notes (AbcEvents), moved by semitones;
//        bpm is a quarter-note tempo from the Q: line (80 when there is none).
//   SingCheck.grade(notes, frames, { bpm, t0, tol }) -> { notes: [{ i, midi, status, cents, count }], offset, counts, summary }
//        frames: [{ t (seconds, on the same clock as t0), hz (-1 or 0 when there is no pitch) }], as PitchDetect.mic gives them.
//        t0: the clock time the first note is due. tol: cents counted as right (default 50).
//        status "right" | "flat" | "sharp" | "missed". Pitch is octave-agnostic (a voice type sings the line in its own octave):
//        the difference to the written note is folded to within +-6 semitones. Timing is loose: the whole line may start up to
//        0.4 s early or 1 s late (the offset is the one with most notes found in tune), and each note's first part is skipped
//        (the glide in).
(function (global) {
  var Events = global.AbcEvents || (typeof require === "function" ? require("./abc-events.js") : null);
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
  function hzToMidi(hz) { return 69 + 12 * Math.log(hz / 440) / Math.LN2; }
  function fold(d) { d = ((d % 12) + 12) % 12; return d >= 6 ? d - 12 : d; }

  function tempoOf(abc) {
    var m = /^Q:\s*(?:"[^"]*"\s*)?(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/m.exec(abc);
    if (!m) return 80;
    return +m[3] * (m[1] ? (m[1] / m[2]) * 4 : 1);
  }
  function expected(abc, semitones) {
    var r = Events.fromAbc(abc), s = semitones || 0;
    return { bpm: tempoOf(abc), notes: r.sounding.filter(function (e) { return e.kind === "note" && e.pitches.length; })
      .map(function (e, i) { return { i: i, t_on: e.t_on, t_off: e.t_off, midi: e.pitches[0].midi + s }; }) };
  }

  function gradeAt(notes, voiced, spq, t0, off, tol) {
    return notes.map(function (n) {
      var dur = (n.t_off - n.t_on) * spq, a = t0 + off + n.t_on * spq + Math.min(0.15, dur * 0.3), b = t0 + off + n.t_off * spq - 0.03;
      var ms = voiced.filter(function (f) { return f.t >= a && f.t <= b; }).map(function (f) { return f.m; });
      var need = Math.max(3, Math.floor((b - a) / 0.04 * 0.5));
      if (ms.length < need) return { i: n.i, midi: n.midi, status: "missed", cents: null, count: ms.length };
      var c = Math.round(fold(median(ms) - n.midi) * 100);
      return { i: n.i, midi: n.midi, status: Math.abs(c) <= tol ? "right" : c < 0 ? "flat" : "sharp", cents: c, count: ms.length };
    });
  }
  function grade(notes, frames, o) {
    o = o || {}; var tol = o.tol != null ? o.tol : 50, spq = 60 / (o.bpm || 80), t0 = o.t0 || 0;
    var voiced = frames.filter(function (f) { return f.hz > 0; }).map(function (f) { return { t: f.t, m: hzToMidi(f.hz) }; });
    var best = null, bestOff = 0, bestScore = -1;
    for (var k = -8; k <= 20; k++) {
      var off = k * 0.05, res = gradeAt(notes, voiced, spq, t0, off, tol);
      var score = res.reduce(function (s, r) { return s + (r.status === "right" ? 10 : r.status === "missed" ? 0 : 1); }, 0); score -= Math.max(0, Math.abs(off) - 0.05) / 0.05 * 4;   // a shift must earn its keep
      if (score > bestScore || (score === bestScore && Math.abs(off) < Math.abs(bestOff))) { best = res; bestOff = off; bestScore = score; }
    }
    var counts = { right: 0, flat: 0, sharp: 0, missed: 0 };
    best.forEach(function (r) { counts[r.status]++; });
    return { notes: best, offset: bestOff, counts: counts, summary: summary(best, counts) };
  }
  function summary(res, c) {
    var n = res.length;
    if (!n) return "No notes to check.";
    if (c.missed === n) return "I did not hear any notes. Sing a little louder, closer to the microphone.";
    if (c.right === n) return "Every note in tune.";
    var bits = [];
    ["flat", "sharp"].forEach(function (s) {
      var l = res.filter(function (r) { return r.status === s; });
      if (l.length) bits.push(l.length + " " + s + " (note " + l.map(function (r) { return r.i + 1; }).join(", ") + ")");
    });
    if (c.missed) bits.push(c.missed + " not heard (note " + res.filter(function (r) { return r.status === "missed"; }).map(function (r) { return r.i + 1; }).join(", ") + ")");
    var heard = res.filter(function (r) { return r.cents != null; });
    var mean = heard.length ? heard.reduce(function (s, r) { return s + r.cents; }, 0) / heard.length : 0;
    var tail = Math.abs(mean) >= 25 ? " Overall you sang " + (mean > 0 ? "sharp" : "flat") + " by about " + Math.round(Math.abs(mean)) + " cents." : "";
    return c.right + " of " + n + " notes in tune: " + bits.join(", ") + "." + tail;
  }
  var API = { expected: expected, grade: grade, tempoOf: tempoOf };
  global.SingCheck = API; if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
