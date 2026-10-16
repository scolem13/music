// Phrase seam checks (apps/shared/phrase-seam.js). node tests/abc/phrase-seam.test.js
const path = require("path"), assert = require("assert");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js");
require(R + "apps/shared/abc-events.js");
require(R + "apps/shared/abc-nht.js");
const S = require(R + "apps/shared/phrase-seam.js");
let n = 0;
const t = (name, f) => { try { f(); n++; } catch (e) { console.error("FAIL " + name); throw e; } };
const N = (t, d, midi) => ({ t, d, midi });

t("held note then three-eighth pickup", () => {
  // C half note, rest, then E F G into the next bar (C chord, then F)
  const bar = [N(0, 2, 60), N(2.5, 0.5, 64), N(3, 0.5, 65), N(3.5, 0.5, 67)];
  const best = S.suggest(bar, { barQ: 4, prevChord: "C", nextChord: "F" })[0];
  assert.strictEqual(best.t, 2.5);
  assert.ok(best.reasons.some(r => /familiar/.test(r)));
});
t("no pickup when the bar ends in a long note", () => {
  const best = S.suggest([N(0, 1, 60), N(1, 3, 64)], { barQ: 4 })[0];
  assert.strictEqual(best.t, 4);
});
t("loop start breaks a tie in a run of eighths", () => {
  const run = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((x, i) => N(x, 0.5, 60 + i));
  assert.strictEqual(S.suggest(run, { barQ: 4, loopStart: 3 })[0].t, 3);
});
t("chords decide inside a run", () => {
  // G7 bar; D F (chord tones) then A B C D leaning to C: B's first note A is not in G7 and not in C -> step to nextMidi
  const run = [N(0, 1, 62), N(1, 1, 65), N(2, 0.5, 67), N(2.5, 0.5, 69), N(3, 0.5, 71), N(3.5, 0.5, 74)];
  const c = S.suggest(run, { barQ: 4, prevChord: "G7", nextChord: "C", nextMidi: 72 });
  assert.ok(c.length > 2 && c[0].score >= c[1].score);
});
t("3/4 bar: a beat-3 pickup", () => {
  const best = S.suggest([N(0, 2, 60), N(2, 1, 67)], { barQ: 3 })[0];
  assert.strictEqual(best.t, 2);
});
t("stitch: A's held note trimmed at B's pickup", () => {
  const r = S.stitch([N(0, 4, 60)], [N(3, 0.5, 64), N(3.5, 0.5, 65)], 3, { barQ: 4 });
  assert.deepStrictEqual(r.notes.map(x => [x.t, x.d, x.midi]), [[0, 3, 60], [3, 0.5, 64], [3.5, 0.5, 65]]);
  assert.strictEqual(r.conflicts.length, 0);
});
t("stitch: elision is one note", () => {
  const r = S.stitch([N(0, 2, 60), N(2, 1, 67)], [N(2, 1, 67), N(3, 1, 69)], 2, { barQ: 4 });
  assert.deepStrictEqual(r.notes.map(x => [x.t, x.midi, !!x.elided]), [[0, 60, false], [2, 67, true], [3, 69, false]]);
});
t("stitch: overlap on B's side is a conflict, later wins by default", () => {
  const a = [N(0, 2, 60), N(3, 1, 62)], b = [N(3, 1, 64)];
  let r = S.stitch(a, b, 3, { barQ: 4 });
  assert.strictEqual(r.conflicts.length, 1);
  assert.deepStrictEqual(r.notes.map(x => x.midi), [60, 64]);
  r = S.stitch(a, b, 3, { barQ: 4, prefer: "a" });
  assert.deepStrictEqual(r.notes.map(x => x.midi), [60, 62]);
});
t("stitch: B's stray note on A's side with nothing there is kept", () => {
  const r = S.stitch([N(0, 1, 60)], [N(2, 0.5, 62), N(3, 1, 64)], 3, { barQ: 4 });
  assert.deepStrictEqual(r.notes.map(x => x.midi), [60, 62, 64]);
});
t("toSlots fills rests", () => {
  const s = S.toSlots([N(0, 2, 60), N(2.5, 0.5, 64)], 4);
  assert.deepStrictEqual(s.rhythm.map(x => x.type + x.durQ), ["note2", "rest0.5", "note0.5", "rest1"]);
  assert.deepStrictEqual(s.pitches, [60, 64]);
});
console.log("phrase-seam: " + n + " checks passed");
