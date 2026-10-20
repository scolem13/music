// SingCheck grader with synthetic pitch frames. Run: node tests/abc/sing-check.test.js
const S = require("../../apps/shared/sing-check.js");
let fails = 0; const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i ? "  " + i : "")); if (!ok) fails++; };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const abc = "X:1\nM:4/4\nL:1/4\nQ:1/4=120\nK:C\nC D E F | G F E D | C4 |]";
const ex = S.expected(abc, 0);
check("9 notes, tempo 120", ex.notes.length === 9 && ex.bpm === 120, ex.notes.length + " " + ex.bpm);
check("Q: with another unit", S.tempoOf("Q:1/8=120\nK:C") === 60 && S.tempoOf("K:C") === 80);
// frames for a sung line: per note a midi (or null = silence), time shift, octave shift
function sing(ex, o) {
  const spq = 60 / ex.bpm, fr = [];
  for (let t = 0; t < 12; t += 0.04) {
    let h = -1;
    for (const n of ex.notes) {
      const a = o.t0 + (o.late || 0) + n.t_on * spq, b = o.t0 + (o.late || 0) + n.t_off * spq - 0.02;
      if (t >= a && t < b) { const d = (o.dev || {})[n.i]; if (d !== null) h = hz(n.midi + (o.oct || 0) + (d || 0) / 100 + (t - a < 0.1 ? -0.4 : 0)); }
    }
    fr.push({ t, hz: h });
  }
  return fr;
}
let g = S.grade(ex.notes, sing(ex, { t0: 2 }), { bpm: ex.bpm, t0: 2 });
check("in tune: all right", g.counts.right === 9 && /Every note/.test(g.summary), g.summary);
g = S.grade(ex.notes, sing(ex, { t0: 2, oct: -12 }), { bpm: ex.bpm, t0: 2 });
check("an octave down is still right", g.counts.right === 9);
g = S.grade(ex.notes, sing(ex, { t0: 2, late: 0.3 }), { bpm: ex.bpm, t0: 2 });
check("0.3 s late still graded right", g.counts.right === 9, "offset " + g.offset);
g = S.grade(ex.notes, sing(ex, { t0: 2, dev: { 2: -80, 4: 90, 6: null } }), { bpm: ex.bpm, t0: 2 });
check("flat, sharp, missed named", g.notes[2].status === "flat" && g.notes[4].status === "sharp" && g.notes[6].status === "missed" && g.counts.right === 6, JSON.stringify(g.counts));
check("flat cents about -80", Math.abs(g.notes[2].cents + 80) <= 5, g.notes[2].cents);
check("summary names the notes", /6 of 9 notes in tune: 1 flat \(note 3\), 1 sharp \(note 5\), 1 not heard \(note 7\)/.test(g.summary), g.summary);
g = S.grade(ex.notes, sing(ex, { t0: 2, dev: { 0: 30, 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30, 7: 30, 8: 30 } }), { bpm: ex.bpm, t0: 2 });
check("30 cents sharp is within the tolerance", g.counts.right === 9);
g = S.grade(ex.notes, [], { bpm: ex.bpm, t0: 2 });
check("silence: nothing heard", g.counts.missed === 9 && /did not hear/.test(g.summary));
console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
