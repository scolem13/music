// node tests/rhythm/rhythm-chant.test.js — RhythmChant.plan(): the conversational rules (see the header of apps/shared/rhythm-chant.js)
const RC = require("../../apps/shared/rhythm-chant.js");
let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log("FAIL " + m); } else console.log("ok   " + m); }
const P = (abc, o) => RC.plan(abc, Object.assign({ qpm: 100, seed: 1, phraseShape: "level", question: 0 }, o));   // the rules alone: no random phrase shape or question
const hd = (m, l, body) => `X:1\nM:${m}\nL:${l}\nK: clef=none\n${body}`;

// 2/4, dotted quarter then an eighth (anacrusis): R5a swell, and the eighth is the loudest of its beat
let p = P(hd("2/4", "1/4", "B3/2 B/ | B B |"));
ok(p.notes[0].shape === "swell" && p.notes[0].rule.startsWith("R5a"), "dotted quarter before an anacrusis swells (R5a)");
ok(p.notes[0].endLevel > p.notes[0].startLevel * 1.5, "  and rises from onset to the next onset");
ok(p.notes[1].anacrusis && p.notes[1].peak < p.notes[0].peak, "  the eighth is an anacrusis, quieter than the macrobeat before it (R1, macrobeats emphasised)");
ok(p.notes[2].role === "crusis" && p.notes[2].peak > p.notes[1].peak, "  the next macrobeat lands louder than the anacrusis (R1)");

// short notes decay quickly (R4)
p = P(hd("2/4", "1/4", "B/B/ B | B B/B/ |"));
ok(p.notes.every(n => n.shape === "decay"), "eighths and quarters on the beat all decay (R4, R5c)");
ok(p.notes[0].decay <= RC.RULES.shortDecayMax + 1e-9, "  eighth decay is no longer than shortDecayMax");
ok(p.notes[2].rule.startsWith("R5c") && p.notes[2].decay > p.notes[0].decay, "  the quarter on the beat has the longer 'medium' tail (R5c)");

// a dotted quarter that starts off the beat and lands on the next downbeat (the "before a macrobeat downbeat" case): R5b gentle swell
p = P(hd("2/4", "1/4", "B/ B3/2 | B B | B B |"));   // three bars, so this downbeat is not the penultimate macrobeat
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

// contour: rises toward the last anacrusis, falls after it, the last note lifts a little
p = P(hd("2/4", "1/4", "B B/B/ | B/B/ B |"), { vary: false });
const ana = p.notes.filter(n => n.anacrusis).pop();
ok(ana.cents0 > p.notes[0].cents0, "contour rises toward the last anacrusis (R6)");
ok(p.notes[p.notes.length - 1].cents0 < ana.cents0, "  and falls after it");
ok(p.notes[p.notes.length - 1].cents1 > p.notes[p.notes.length - 1].cents0, "  then lifts a little (E)");
// B// is read as B/4
p = P(hd("2/4", "1/4", "B B//B//B/ |"));
ok(p.notes.length === 4 && Math.abs(p.totalQ - 2) < 1e-9, "B// is read as a sixteenth, bar adds up");
// timing: seconds follow qpm, and the plan does not change the written rhythm
p = RC.plan(hd("2/4", "1/4", "B B |"), { qpm: 120, endLength: 1 });
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
    const rl = x => x.replace(/\+[QE]$/, "");   // a question ending is chosen at random
    if (n.shape !== b.shape || rl(n.rule) !== rl(b.rule) || n.role !== b.role) broke++;
    if (n.shape === "swell" && !(n.endLevel > n.startLevel * 1.5)) broke++;
    if (n.shape === "decay" && !n.held && !n.question && n.decay > RC.RULES.shortDecayMax * 1.25 + 1e-9) broke++;
    if (n.anacrusis && i + 1 < q.notes.length && q.notes[i + 1].role === "crusis" && !(n.peak < q.notes[i + 1].peak)) broke++;
    if (Math.abs(n.jit) * 1000 > 3 + 1e-9 || n.t !== b.t || n.dur !== b.dur) broke++;
    maxJit = Math.max(maxJit, Math.abs(n.jit) * 1000);
  });
  cs.add(Math.round(q.notes[q.notes.length - 1].cents1 / 10)); ends.push(q.notes[q.notes.length - 1].cents1);
});
ok(broke === 0, "300 seeds x 5 patterns: shapes, rules, crusis > anacrusis, written times all intact (" + broke + " broken)");
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
ok(rmsAt(1.15, 1.3) > rmsAt(0.15, 0.3) * 1.5, "render: the dotted-quarter swell is louder at its end than near its start");
ok(same(Array.from(RC.render(rp, sr).slice(0, 4000)), Array.from(sig.slice(0, 4000))), "render is repeatable for a plan");
// the user, 2026-10-25: B>B leaves a silence before the short note; first and penultimate macrobeats loudest; macrobeats pitched lower
{ const q = P(hd("4/4", "1/8", "B>B B2 B>B B2|"));
  ok(q.notes[0].cut != null && q.notes[0].dur - q.notes[0].cut >= RC.RULES.gapBeforeShort - 1e-9, "B>B: a silence before the sixteenth (G)");
  ok(q.notes[0].prime && q.notes[3].prime && !q.notes[2].prime && q.notes[0].peak > q.notes[2].peak && q.notes[3].peak > q.notes[5].peak, "first and penultimate macrobeats are the loudest (P)");
  ok(q.notes[2].cents0 < q.notes[1].cents0, "a macrobeat sits lower than the note before it"); }
// the user, 2026-10-25: emphasis slider, pickup start, syllables shown
{ const a = hd("2/4", "1/8", "z B B2 | B>B B2 | BB B2 |");
  const L0 = { seed: 1, phraseShape: "level", question: 0 }, lo = RC.plan(a, { ...L0, emphasis: 0 }), mid = RC.plan(a, L0), hi = RC.plan(a, { ...L0, emphasis: 2 });
  const ratio = q => q.notes[4].peak / q.notes[3].peak;          // an ordinary macrobeat over the weak note before it
  ok(ratio(lo) < ratio(mid) && ratio(mid) < ratio(hi), "emphasis 0 < 1 < 2: macrobeats stand out more (" + [lo, mid, hi].map(q => ratio(q).toFixed(2)).join(" ") + ")");
  ok(hi.notes.every(n => n.peak <= 1 + 1e-9) && hi.notes[1].peak > hi.notes[4].peak, "emphasis 2: nothing over 1, first downbeat still above an ordinary one");
  ok(mid.notes[1].rule.includes("+A") && mid.notes[1].peak > mid.notes[5].peak * 0.99 && mid.notes[0].peak < mid.notes[1].peak, "a pickup start: its downbeat lands hardest, above the pickup (A)");
  ok(/\nw: De Du Du Ta Du Du De Du$/.test(RC.withSyllables(a)), "withSyllables writes Du De Ta under the notes");
  ok(RC.syllables(hd("5/8", "1/8", "BBB BB |")) === "Du Da Di Du De", "syllables: 5/8 by beaming"); }
// a pickup bar: the beats line up with the first full barline (the user's example)
{ const a = hd("2/4", "1/4", "B/ | B/B/ B/B/ | B//B//B//B// B/ ||");
  ok(RC.syllables(a) === "De | Du De Du De | Du Ta De Ta Du", "pickup: " + RC.syllables(a));
  const q = RC.plan(a, { seed: 1 }); ok(q.notes[0].role === "weak" && q.notes[1].role === "crusis" && q.notes[1].rule.includes("+A"), "pickup: weak, then a strong first downbeat (A)");
  ok(RC.syllables(hd("6/8", "1/8", "B | BBB B2B | B3 B2 ||")) === "Di | Du Da Di Du Di | Du Du", "6/8 pickup");
  ok(RC.syllables(hd("5/8", "1/8", "BB | BBB BB | BBB B2 ||")) === "Du De | Du Da Di Du De | Du Da Di Du", "5/8 pickup of two eighths"); }
// the user, 2026-10-25: macrobeats ring longer, "bah" near ɑ on macrobeats and near ə elsewhere, each settable
{ const a = hd("2/4", "1/4", "B/ | B/B/ B/B/ | B//B//B//B// B/ ||");
  const d1 = RC.plan(a, { seed: 1, lengthRatio: 1 }), d2 = RC.plan(a, { seed: 1, lengthRatio: 2 });
  ok(d2.notes[3].decay > d1.notes[3].decay * 1.5 && Math.abs(d2.notes[2].decay - d1.notes[2].decay) < 1e-9, "Length ratio lengthens macrobeats only");
  const q = RC.plan(a, { seed: 1 });
  ok(q.notes[1].mix === RC.RULES.vowelMacro && q.notes[2].mix === RC.RULES.vowelWeak, "vowel mix: macrobeat " + q.notes[1].mix + ", other " + q.notes[2].mix);
  const rms = (voice, m) => { const p = RC.plan(hd("4/4", "1/4", "B4 |"), { seed: 1, vary: false, voice, vowelMacro: m, question: 0, phraseShape: "level" }), x = RC.render(p, 22050); let s = 0; for (let i = 2205; i < 11025; i++) s += x[i] * x[i]; return Math.sqrt(s / 8820); };
  for (const v of ["low", "high"]) { const k = rms(v, 0) / rms(v, 1); ok(Math.abs(k - 1) < 0.05, `${v} voice: ɑ and ə equally loud (${k.toFixed(3)}; else set SCHWA_${v.toUpperCase()})`); } }
// the user, 2026-10-25: last-note length, pitch variance (fresh each playing, 0 = fixed), arc controls
{ const a = hd("2/4", "1/4", "B/ | B/B/ B/B/ | B//B//B//B// B/ ||"), c = o => RC.plan(a, o).notes.map(n => n.cents0 + "," + n.cents1).join(" ");
  const e1 = RC.plan(a, { seed: 1, endLength: 1 }), e2 = RC.plan(a, { seed: 1, endLength: 2 });
  ok(Math.abs(e2.notes.at(-1).dur - 2 * e1.notes.at(-1).dur) < 1e-9 && e2.total > e1.total && e2.notes.at(-2).dur === e1.notes.at(-2).dur, "Last-note length holds only the last note longer");
  ok(c({ pitchVar: 0, question: 0 }) === c({ pitchVar: 0, question: 0 }), "pitch variance 0: the same pitches every time");
  ok(c({}) !== c({}), "unseeded: different pitches each time");
  const spread = pv => { const ps = []; for (let k = 0; k < 60; k++) ps.push(RC.plan(a, { seed: k, pitchVar: pv, question: 0 }).notes.map(n => n.cents0));   // spread of each note across playings
    return ps[0].reduce((t, _, i) => { const xs = ps.map(p => p[i]), m = xs.reduce((u, x) => u + x, 0) / xs.length; return t + Math.sqrt(xs.reduce((u, x) => u + (x - m) * (x - m), 0) / xs.length); }, 0); };
  { const sp = [0, 1, 2, 3].map(spread); ok(sp[0] === 0 && sp[1] < sp[2] && sp[2] < sp[3] && sp[3] > sp[1] * 1.3, "pitch variance: none at 0, more as it rises (" + sp.map(Math.round).join(" ") + ")"); }
  const hi = RC.plan(a, { pitchVar: 0, arcHeight: 2, arcPeak: 0.5 }), lo = RC.plan(a, { pitchVar: 0, arcHeight: 0, arcPeak: 0.5 }), k = 4;   // notes[4] sits at the arc's peak
  ok(hi.notes[k].cents0 - lo.notes[k].cents0 > 400, "Arc height raises the peak (" + (hi.notes[k].cents0 - lo.notes[k].cents0) + " cents)");
  const up = RC.plan(a, { pitchVar: 0, arcEnd: 300 }), dn = RC.plan(a, { pitchVar: 0, arcEnd: -300 });
  ok(up.notes.at(-1).cents0 - dn.notes.at(-1).cents0 > 200, "Arc ending moves where the phrase ends"); }
// the user, 2026-10-25: dynamics. A pickup run crescendos into a sounded downbeat; runs after rests die away; the last run leads into the last note
{ const a = hd("2/4", "1/4", "B//B//B// | B/B/ B//B//B/ | B/B/ B// ||"), q = RC.plan(a, { seed: 3, phraseShape: "level", question: 0 });
  ok(q.notes[0].peak < q.notes[1].peak && q.notes[1].peak < q.notes[2].peak && q.notes[2].peak < q.notes[3].peak, "pickup B//B//B// crescendos into the downbeat (" + q.notes.slice(0, 4).map(n => n.peak.toFixed(2)).join(" ") + ")");
  const b = hd("2/4", "1/4", "B//B//B// | z//B//B//B// z//B//B//B// | z//B//B//B// B ||"), d = RC.plan(b, { seed: 3, phraseShape: "level", question: 0 }), pk = d.notes.map(n => n.peak);
  ok(pk[0] > pk[1] && pk[1] > pk[2] && pk[3] > pk[4] && pk[4] > pk[5], "runs that end on a rest die away (8 5 3): " + pk.map(x => x.toFixed(2)).join(" "));
  ok(pk[12] > pk[11] && pk[12] === Math.max(...pk), "the last run leads into the last note, the loudest");
  const flat = RC.plan(b, { seed: 3, phraseShape: "level", question: 0, dynamics: 0 }).notes.map(n => n.peak);
  ok(Math.abs(flat[0] - flat[2]) < 0.02, "Dynamics 0: the runs are level");
  const sh = new Set(), rs = new Set(); for (let k = 0; k < 40; k++) { const z = RC.plan(b, { seed: k }); sh.add(z.phraseShape); rs.add(z.resetOnRests); }
  ok(sh.size === 4 && rs.size === 2, "phrase shapes vary across playings, sometimes starting again after rests");
  const qq = RC.plan(b, { seed: 3, question: 1 }), last = qq.notes.at(-1);
  ok(last.question && last.cents1 - last.cents0 >= RC.RULES.questionGlide[0] && last.decay >= last.dur * 0.9 - 1e-9, "a question: the last note slides up and is held");
  ok(!RC.plan(b, { seed: 3, question: 0 }).notes.at(-1).question, "Question ending 0: never"); }
// the user, 2026-10-25: consonants quieter against the vowel; the question's slide has a shape, not a straight line
{ const ratio = (syl, c) => { const p = RC.plan(hd("2/4", "1/4", "B B |"), { seed: 1, vary: false, syllables: [syl, syl], consonant: c, question: 0, phraseShape: "level" }), x = RC.render(p, 22050);
    const rms = (a, b) => { let s = 0; for (let i = a * 22050 | 0; i < b * 22050; i++) s += x[i] * x[i]; return Math.sqrt(s / ((b - a) * 22050)); }; return rms(0, 0.015) / rms(0.04, 0.12); };
  ok(ratio("Ta", RC.RULES.consonant) < ratio("Ta", 1) * 0.5 && ratio("Du", RC.RULES.consonant) < 0.5, "consonants: Ta " + ratio("Ta", RC.RULES.consonant).toFixed(2) + ", Du " + ratio("Du", RC.RULES.consonant).toFixed(2) + " of the vowel");
  const q = RC.plan(hd("2/4", "1/4", "B B |"), { seed: 1, question: 1 }).notes.at(-1), g = q.cents1 - q.cents0;
  ok(g >= RC.RULES.questionGlide[0], "question glide " + g + " cents"); }
// the user, 2026-10-25: Ta a fair bit quieter; Du rounder; De glides as "day"
{ const a = hd("2/4", "1/4", "B//B//B//B// B//B//B//B// | B//B//B//B// B//B//B//B// |"), o = { seed: 1, vary: false, syllables: "rhythm", question: 0, phraseShape: "level", dynamics: 0 };
  const q = RC.plan(a, o), f = RC.plan(a, { ...o, taLevel: 1 });
  ok(q.notes.map(n => n.syl).slice(0, 4).join("") === "DuTaDeTa" && q.notes[1].peak < f.notes[1].peak * 0.6 && q.notes[2].peak === f.notes[2].peak, "Ta at " + RC.RULES.taLevel + " of its level, De untouched");
  ok(RC.VOWELS.u[1] <= 650, "Du rounder: F2 " + RC.VOWELS.u[1]); }
// the user, 2026-10-25: a woodblock instead of the voice, keeping the dynamics
{ const p = RC.plan(hd("2/4", "1/4", "B B/B/ | B B |"), { seed: 1, sound: "woodblock", question: 0, phraseShape: "level" }), x = RC.render(p, 22050);
  const pk = n => { let m = 0; const a = Math.round(n.t * 22050); for (let i = a; i < a + 1100; i++) m = Math.max(m, Math.abs(x[i])); return m; };
  const tail = (() => { let m = 0; const a = Math.round((p.notes[0].t + 0.08) * 22050); for (let i = a; i < a + 2000; i++) m = Math.max(m, Math.abs(x[i])); return m; })();
  ok(p.sound === "woodblock" && pk(p.notes[0]) > 0.05 && tail < pk(p.notes[0]) * 0.05, "woodblock: a short hit on each note, silent between");
  ok(pk(p.notes[3]) > pk(p.notes[2]) * 1.2, "woodblock: the macrobeat is struck harder than the note before it"); }
console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
