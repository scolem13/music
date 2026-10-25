// node tests/rhythm/rhythm-chant.test.js — RhythmChant.plan(): the conversational rules (see the header of apps/shared/rhythm-chant.js)
const RC = require("../../apps/shared/rhythm-chant.js");
let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log("FAIL " + m); } else console.log("ok   " + m); }
const P = (abc, o) => RC.plan(abc, Object.assign({ qpm: 100, seed: 1 }, o));
const hd = (m, l, body) => `X:1\nM:${m}\nL:${l}\nK: clef=none\n${body}`;

// 2/4, dotted quarter then an eighth (anacrusis): R5a swell, and the eighth is the loudest of its beat
let p = P(hd("2/4", "1/4", "B3/2 B/ | B B |"));
ok(p.notes[0].shape === "swell" && p.notes[0].rule.startsWith("R5a"), "dotted quarter before an anacrusis swells (R5a)");
ok(p.notes[0].endLevel > p.notes[0].startLevel * 1.5, "  and rises from onset to the next onset");
ok(p.notes[1].anacrusis && p.notes[1].peak > p.notes[0].peak, "  the eighth is an anacrusis, louder than the crusis before it (R3)");
ok(p.notes[2].role === "crusis" && p.notes[2].peak < p.notes[1].peak, "  the next macrobeat lands lighter than the anacrusis (R2)");

// short notes decay quickly (R4)
p = P(hd("2/4", "1/4", "B/B/ B | B B/B/ |"));
ok(p.notes.every(n => n.shape === "decay"), "eighths and quarters on the beat all decay (R4, R5c)");
ok(p.notes[0].decay <= RC.RULES.shortDecayMax + 1e-9, "  eighth decay is no longer than shortDecayMax");
ok(p.notes[2].rule.startsWith("R5c") && p.notes[2].decay > p.notes[0].decay, "  the quarter on the beat has the longer 'medium' tail (R5c)");

// a dotted quarter that starts off the beat and lands on the next downbeat (the "before a macrobeat downbeat" case): R5b gentle swell
p = P(hd("2/4", "1/4", "B/ B3/2 | B B |"));
ok(p.notes[1].held && p.notes[1].shape === "swell" && p.notes[1].drive === "gentle" && p.notes[1].rule.startsWith("R5b"),
   "dotted quarter off the beat, landing on a downbeat: gentle swell (R5b)");
ok(p.notes[2].rule.includes("R2") && p.notes[2].peak < RC.RULES.peakCrusis, "  the downbeat it lands on is lighter than an ordinary macrobeat (R2)");
ok(p.notes[1].endLevel < RC.RULES.swellPeak, "  gentler than R5a");

// half note in 2/4: longer than a macrobeat, then a macrobeat: R5b; at the end of the pattern a half note is R5d decay (space), not swell
p = P(hd("2/4", "1/4", "B2 | B B |"));
ok(p.notes[0].shape === "swell" && p.notes[0].drive === "gentle", "half note before a macrobeat swells gently (R5b)");
p = P(hd("2/4", "1/4", "B B | B2 |"));
ok(p.notes[2].shape === "decay" && p.notes[2].rule.startsWith("R5d"), "final half note: space, decays (R5d)");
p = P(hd("4/4", "1/4", "B B B4 |"));
ok(p.notes[2].shape === "sustain", "a note of more than two macrobeats before the end sustains (R5d)");

// quarter followed by a rest: decays
p = P(hd("2/4", "1/4", "B z | B B |"));
ok(p.notes[0].shape === "decay" && p.notes[0].next === "rest", "quarter then rest decays; the rest is space");

// syncopation: quarter on the weak position, followed by a weak onset
p = P(hd("2/4", "1/4", "B/ B B/ |"));
ok(p.notes[1].shape === "swell" && p.notes[1].rule.startsWith("R5a"), "syncopated quarter swells into the weak onset (R5a)");

// triple (6/8): macrobeat = dotted quarter
p = P(hd("6/8", "1/8", "B2 B BBB | B3 z3 |"));
ok(p.triple && Math.abs(p.macroQ - 1.5) < 1e-9 && Math.abs(p.microQ - 0.5) < 1e-9, "6/8: macrobeat 1.5 quarters, microbeat 0.5");
ok(p.notes[0].held && p.notes[0].shape === "swell" && p.notes[0].rule.startsWith("R5a"), "6/8: B2 followed by a weak microbeat swells (R5a)");
ok(p.notes[1].anacrusis, "6/8: the third microbeat leads to the next macrobeat (anacrusis)");
ok(p.notes[2].role === "crusis" && p.notes[3].role === "weak" && p.notes[4].anacrusis && p.notes[3].peak < p.notes[4].peak, "6/8: BBB: crusis, then a run crescendo to the anacrusis");
ok(p.notes[5].shape === "decay" && p.notes[5].next === "end", "6/8: B3 then rest decays");
p = P(hd("6/8", "1/8", "B3 B3 |"));
ok(p.notes[0].shape === "decay" && p.notes[0].rule.startsWith("R5c"), "6/8: B3 on a macrobeat before a macrobeat decays (R5c)");

// contour: rises toward the last anacrusis, ends lower than it started
p = P(hd("2/4", "1/4", "B B/B/ | B/B/ B |"), { vary: false });
const ana = p.notes.filter(n => n.anacrusis).pop();
ok(ana.cents0 > p.notes[0].cents0, "contour rises toward the last anacrusis (R6)");
ok(p.notes[p.notes.length - 1].cents1 < p.notes[0].cents0, "  and ends below where it began");
// B// is read as B/4
p = P(hd("2/4", "1/4", "B B//B//B/ |"));
ok(p.notes.length === 4 && Math.abs(p.totalQ - 2) < 1e-9, "B// is read as a sixteenth, bar adds up");
// timing: seconds follow qpm, and the plan does not change the written rhythm
p = RC.plan(hd("2/4", "1/4", "B B |"), { qpm: 120 });
ok(Math.abs(p.notes[1].t - 0.5) < 1e-9 && Math.abs(p.total - 1) < 1e-9, "timing: 120 qpm = 0.5 s a quarter");
// every collection pattern plans without throwing and covers the bar
const src = require("fs").readFileSync(__dirname + "/../../apps/rhythms/rhythm-pattern-object.js", "utf8");
const obj = new Function(src + "; return rhythmPatternObject;")();
let n = 0, bad = 0;
Object.keys(obj).forEach(k => obj[k].split(/\n\s*\n/).filter(s => /^X:/m.test(s)).forEach(s => {
  if (/^M:\s*(?!\s*[0-9]+\/[0-9]+)/m.test(s)) return;
  try { const q = RC.plan(s, { qpm: 90 }); n++; if (!q.notes.length || q.notes.some(x => !(x.peak > 0) || !(x.dur > 0) || x.shape === undefined)) bad++; } catch (e) { bad++; console.log(k, e.message); }
}));
ok(n > 100 && bad === 0, `all ${n} collection patterns plan (${bad} bad)`);

// ---- variety: seedable, repeatable, different between seeds, never undoes a rule
const abcs = [hd("2/4", "1/4", "B3/2 B/ | B B |"), hd("2/4", "1/4", "B/ B3/2 | B B |"), hd("6/8", "1/8", "B2 B BBB | B3 z3 |"), hd("2/4", "1/4", "B/B/B/B/ | B/B/ B |"), hd("4/4", "1/4", "B B B4 |")];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
ok(same(RC.plan(abcs[0], { qpm: 90, seed: 7 }), RC.plan(abcs[0], { qpm: 90, seed: 7 })), "same seed, same plan");
ok(!same(RC.plan(abcs[0], { qpm: 90, seed: 7 }).notes, RC.plan(abcs[0], { qpm: 90, seed: 8 }).notes), "different seeds, different plan");
ok(!same(RC.plan(abcs[0], { qpm: 90 }).seed, RC.plan(abcs[0], { qpm: 90 }).seed), "unseeded: a fresh seed each time");
let broke = 0, maxJit = 0, cs = new Set(), ends = [];
for (let seed = 1; seed <= 300; seed++) abcs.forEach(a => {
  const base = RC.plan(a, { qpm: 90, vary: false, jitterMs: 0 }), q = RC.plan(a, { qpm: 90, seed });
  q.notes.forEach((n, i) => {
    const b = base.notes[i];
    if (n.shape !== b.shape || n.rule !== b.rule || n.role !== b.role) broke++;
    if (n.shape === "swell" && !(n.endLevel > n.startLevel * 1.5)) broke++;
    if (n.shape === "decay" && !n.held && n.decay > RC.RULES.shortDecayMax * 1.25 + 1e-9) broke++;
    if (n.anacrusis && i + 1 < q.notes.length && q.notes[i + 1].role === "crusis" && !(n.peak > q.notes[i + 1].peak)) broke++;
    if (Math.abs(n.jit) * 1000 > 3 + 1e-9 || n.t !== b.t || n.dur !== b.dur) broke++;
    maxJit = Math.max(maxJit, Math.abs(n.jit) * 1000);
  });
  cs.add(Math.round(q.notes[q.notes.length - 1].cents1 / 10)); ends.push(q.notes[q.notes.length - 1].cents1);
});
ok(broke === 0, "300 seeds x 5 patterns: shapes, rules, anacrusis > crusis, written times all intact (" + broke + " broken)");
ok(maxJit > 1 && maxJit <= 3, "onset humanisation within 3 ms, and used (max " + maxJit.toFixed(2) + " ms)");
ok(cs.size > 10 && ends.some(e => e > 0) && ends.some(e => e < -100), "phrase endings vary, and some rise (a question)");
ok(RC.plan(abcs[0], { qpm: 90, seed: 3, jitterMs: 0 }).notes.every(n => n.jit === 0), "jitterMs: 0 gives exact onsets (grading pages)");

// ---- syllables
const Aud = require("../../apps/patterns/audiation.js");
p = RC.plan(hd("2/4", "1/8", "B2 B B B2 |"), { qpm: 90, seed: 1, syllables: "rhythm" });
ok(p.syllables && p.notes.map(n => n.syl).join(" ") === Aud.rhythmSyllables(hd("2/4", "1/8", "B2 B B B2 |")).replace(/ \| /g, " ").trim(), "syllables come from Audiation.rhythmSyllables: " + p.notes.map(n => n.syl).join(" "));
p = RC.plan(hd("6/8", "1/8", "BBB B3 |"), { qpm: 90, seed: 1, syllables: "rhythm" });
ok(p.notes.map(n => n.syl).join(" ") === "Du Da Di Du", "triple: Du Da Di Du");
p = RC.plan(hd("2/4", "1/8", "B/B/B/B/ B2 |"), { qpm: 90, seed: 1, syllables: "rhythm" });
ok(p.notes.map(n => n.syl).join(" ") === "Du Ta De Ta Du", "duple divisions: Du Ta De Ta Du");
ok(RC.plan(abcs[0], { qpm: 90, seed: 1 }).notes.every(n => n.syl === "Bah"), "default syllable is the neutral Bah");

// ---- the voice renders, sensibly
const sr = 22050, rp = RC.plan(abcs[0], { macroBpm: 60, seed: 5 }), sig = RC.render(rp, sr);
let pk = 0, nan = 0; for (const v of sig) { if (!isFinite(v)) nan++; pk = Math.max(pk, Math.abs(v)); }
ok(nan === 0 && pk > 0.1 && pk < 0.95, "render: finite, not silent, no clipping (peak " + pk.toFixed(3) + ")");
const rmsAt = (a, b) => { let s = 0, n = 0; for (let i = Math.floor(a * sr); i < Math.min(sig.length, Math.floor(b * sr)); i++) { s += sig[i] * sig[i]; n++; } return Math.sqrt(s / n); };
ok(rmsAt(1.3, 1.45) > rmsAt(0.15, 0.3) * 1.5, "render: the dotted-quarter swell is louder at its end than near its start");
ok(same(Array.from(RC.render(rp, sr).slice(0, 4000)), Array.from(sig.slice(0, 4000))), "render is repeatable for a plan");
console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
