// Non-harmonic tone checks (apps/shared/abc-nht.js). node tests/abc/nht.test.js
const path = require("path"), assert = require("assert");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js");
require(R + "apps/shared/abc-events.js");
const N = require(R + "apps/shared/abc-nht.js");
let n = 0;
const t = (name, f) => { try { f(); n++; } catch (e) { console.error("FAIL " + name); throw e; } };
const types = abc => N.analyzeAbc("X:1\nM:4/4\nL:1/4\nK:C\n" + abc).tones.map(x => x.abbr);
const tone = (abc, k) => N.analyzeAbc("X:1\nM:4/4\nL:1/4\nK:C\n" + abc).tones[k];

t("chord symbols", () => {
  assert.deepStrictEqual(N.chordPcs("C").pcs, [0, 4, 7]);
  assert.deepStrictEqual(N.chordPcs("Am7").pcs, [9, 0, 4, 7]);
  assert.deepStrictEqual(N.chordPcs("G7").pcs, [7, 11, 2, 5]);
  assert.deepStrictEqual(N.chordPcs("Bdim7").pcs, [11, 2, 5, 8]);
  assert.deepStrictEqual(N.chordPcs("Bm7b5").pcs, [11, 2, 5, 9]);
  assert.deepStrictEqual(N.chordPcs("Fmaj7").pcs, [5, 9, 0, 4]);
  assert.deepStrictEqual(N.chordPcs("Dsus4").pcs, [2, 7, 9]);
  assert.deepStrictEqual(N.chordPcs("C6").pcs, [0, 4, 7, 9]);
  assert.deepStrictEqual(N.chordPcs("D9").pcs, [2, 6, 9, 0, 4]);
  assert.deepStrictEqual(N.chordPcs("D9", { extensions: false }).pcs, [2, 6, 9, 0]);
  assert.strictEqual(N.chordPcs("C/E").bass, 4);
  assert.strictEqual(N.chordPcs("N.C."), null);
});
t("chord tones and no chord", () => {
  assert.deepStrictEqual(types('C "C" C E G'), ["", "CT", "CT", "CT"]);
});
t("passing tones, unaccented and accented", () => {
  assert.deepStrictEqual(types('"C" C/D/E/ z/ G2'), ["CT", "PT", "CT", "CT"]);
  const y = tone('"C" E/D/C3', 1);
  assert.strictEqual(y.type, "passing"); assert.strictEqual(y.accented, false);
  const z = tone('"C" G E "Am" D C', 2);
  assert.strictEqual(z.type, "passing"); assert.strictEqual(z.accented, true); assert.strictEqual(z.label, "accented passing tone");
});
t("chromatic passing tone", () => {
  const x = tone('"C" D/^D/E3', 1);
  assert.strictEqual(x.type, "passing"); assert.ok(x.chromatic); assert.strictEqual(x.label, "chromatic passing tone");
});
t("neighbors", () => {
  const up = tone('"C" E/F/E3', 1);
  assert.strictEqual(up.label, "upper neighbor tone");
  const low = tone('"C" C/B,/C3', 1);
  assert.strictEqual(low.label, "lower neighbor tone");
});
t("double neighbor", () => {
  assert.deepStrictEqual(types('"C" C/D/B,/C/ C2'), ["CT", "DN", "DN", "CT", "CT"]);
});
t("appoggiatura and escape tone", () => {
  assert.strictEqual(tone('"C" C "G" A G2', 1).type, "appoggiatura");   // leap up to A, step down to G
  assert.strictEqual(tone('"C" C2 F/ A/ G', 1).type, "free");            // leap in, leap out
  assert.strictEqual(tone('"C" C D/ B,/ "G" G,2', 1).type, "escape");    // C-D step up, D-B leap down
});
t("suspensions and retardations with figures", () => {
  const sus = N.analyzeAbc("X:1\nM:4/4\nL:1/4\nK:C\n\"F\" A2 F C- | \"G\" C B, D2").tones;
  assert.strictEqual(sus[3].type, "suspension"); assert.strictEqual(sus[3].figure, "4-3"); assert.strictEqual(sus[3].attacked, false);
  const nine = N.analyzeAbc("X:1\nM:4/4\nL:1/4\nK:C\n\"G\" B, G, D2- | \"C\" D C E2").tones;
  assert.strictEqual(nine[3].label, "9-8 suspension");
  const ret = N.analyzeAbc("X:1\nM:4/4\nL:1/4\nK:C\n\"G\" D B, B,2- | \"C\" B, C E2").tones;
  assert.strictEqual(ret[3].type, "retardation"); assert.strictEqual(ret[3].figure, "7-8");
});
t("anticipation", () => {
  const x = N.analyzeAbc("X:1\nM:4/4\nL:1/4\nK:C\n\"G\" D B, G,3/ C/ | \"C\" C4").tones;
  assert.strictEqual(x[3].type, "anticipation");
});
t("pedal", () => {
  const x = N.analyzeAbc("X:1\nM:4/4\nL:1/4\nK:C\n\"C\" G2 G2 | \"F\" G2 G2 | \"C\" G4").tones;
  assert.ok(x.some(p => p.type === "pedal"));
  assert.ok(x.every(p => p.type === "pedal" || p.type === "chord-tone"));
});
t("a rest breaks the line", () => {
  assert.strictEqual(tone('"C" E F z E', 1).type, "free");
});
t("a repeated note under one chord is one tone", () => {
  assert.deepStrictEqual(types('"C" E/F/F/E/ C2'), ["CT", "NT", "NT", "CT", "CT"]);
});
t("appoggiatura from silence, and either direction", () => {
  assert.strictEqual(tone('"C" z F E2', 0).type, "appoggiatura");
  const x = tone('"C" C2 "G" A G', 1);
  assert.strictEqual(x.contrary, true);
  assert.strictEqual(tone('"C" E A,/ B,/ C2', 1).type, "appoggiatura");
  assert.strictEqual(tone('"C" E A,/ B,/ C2', 1).contrary, true);
  assert.strictEqual(tone('"C" G2 B,/ A,/ C', 1).type, "appoggiatura");   // leap down, step on down
  assert.strictEqual(tone('"C" G2 B,/ A,/ C', 1).contrary, false);
});
t("compound meter beats", () => {
  const x = N.analyzeAbc("X:1\nM:6/8\nL:1/8\nK:C\n\"C\" E D C G F E").tones;
  assert.deepStrictEqual(x.map(p => p.accented), [true, false, false, true, false, false]);
  assert.strictEqual(x[4].type, "passing");
});
// ---- cost and choose ----
const E = require(R + "apps/shared/abc-events.js");
// a melody as MIDI-like events: each note is a midi number or a list of [midi, p] candidates; quarter notes
const evs = (notes, conf) => notes.map((n, k) => E.makeEvent({ id: "e" + k, t_on: k, t_off: k + 1, source: "midi",
  confidence: conf ? conf[k] : 1, pitches: Array.isArray(n) ? n.map(([midi, p]) => ({ midi, p })) : [{ midi: n }] }));
const C = [{ t: 0, name: "C" }];

t("cost: chord tones cost nothing, free tones the most", () => {
  assert.strictEqual(N.cost(evs([60, 64, 67, 72]), C).total, 0);
  const pt = N.cost(evs([60, 62, 64, 64]), C);      // D on beat 2 is an accented passing tone: 0.2 + 0.2
  assert.ok(Math.abs(pt.total - 0.4) < 1e-9);
  assert.strictEqual(N.cost(evs([60, 66, 72, 72]), C).total, 1.5);   // F# leaped into and out of
  assert.strictEqual(N.cost(evs([60, 66, 72, 72]), C, { ksig: {} }).total, 1.8);   // and outside C major
});
t("cost: the profile limits the allowed types", () => {
  const m = evs([64, 65, 64, 64]);                     // upper neighbour
  const loose = N.cost(m, C).total, strict = N.cost(m, C, { nct: { allowed: ["passing"] } }).total;
  assert.ok(strict > loose && strict >= 1.5);
  assert.strictEqual(N.cost(m, C, { nct: { costs: { neighbor: 0 }, accented: 0 } }).total, 0);
});
t("cost: weighted by confidence", () => {
  const sure = N.cost(evs([60, 66, 72, 72]), C).total, unsure = N.cost(evs([60, 66, 72, 72], [1, .5, 1, 1]), C).total;
  assert.ok(Math.abs(unsure - sure / 2) < 1e-9);
});
t("choose: harmony breaks a near tie between candidates", () => {
  // E, then F# (p .55) or G (p .45) over a C chord, then C: G is the chord tone
  const r = N.choose(evs([64, [[66, .55], [67, .45]], 72, 72]), C);
  assert.strictEqual(r.events[1].pitches[0].midi, 67);
  assert.deepStrictEqual(r.changed, ["e1"]);
});
t("choose: a clear candidate is kept even when it is a non-chord tone", () => {
  const r = N.choose(evs([64, [[66, .95], [67, .05]], 72, 72]), C);
  assert.strictEqual(r.events[1].pitches[0].midi, 66);
  assert.deepStrictEqual(r.changed, []);
});
t("choose: a passing tone is a good reading", () => {
  // C, then C# (p .5) or D (p .5), then E over C: both pass, D is diatonic so cheaper
  const r = N.choose(evs([60, [[61, .5], [62, .5]], 64, 64]), C, { ksig: {} });
  assert.strictEqual(r.events[1].pitches[0].midi, 62);
});
t("choose: octave errors follow the line", () => {
  // G4 A4 then B (p .5 at B4, .5 at B3) then C5 over G then C: B4 passes on up
  const r = N.choose(evs([67, 69, [[59, .5], [71, .5]], 72]), [{ t: 0, name: "G" }, { t: 3, name: "C" }]);
  assert.strictEqual(r.events[2].pitches[0].midi, 71);
});
t("choose: harmonyWeight 0 is the decoder alone; the input is not changed", () => {
  const input = evs([64, [[66, .55], [67, .45]], 72, 72]);
  assert.strictEqual(N.choose(input, C, { harmonyWeight: 0 }).events[1].pitches[0].midi, 66);
  assert.strictEqual(input[1].pitches[0].midi, 66);
});
t("runs over every tune in the repo", () => {
  const vm = require("vm"), fs = require("fs");
  const obj = vm.runInNewContext(fs.readFileSync(R + "apps/tunes/tunes-object.js", "utf8") + "\n;tunesObject", { window: undefined });
  const counts = {};
  for (const text of Object.values(obj)) for (const abc of text.split(/\n(?=X:)/))
    for (const p of N.analyzeAbc(abc).tones) counts[p.type] = (counts[p.type] || 0) + 1;
  assert.ok(counts["chord-tone"] > 0);
  if (process.env.NHT_COUNTS) console.log(counts);
});
console.log("NHT OK (" + n + " tests)");
