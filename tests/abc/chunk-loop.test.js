// ChunkLoop (apps/shared/chunk-loop.js): chunks found in a recording's bar map through their sections. node tests/abc/chunk-loop.test.js
const path = require("path"), assert = require("assert"), R = path.resolve(__dirname, "../..");
const D = require(R + "/apps/shared/notation-doc.js"), C = require(R + "/apps/shared/chunk-loop.js"), RF = require(R + "/apps/shared/timestamp-player/recording-follow.js");
let n = 0;
const t = (name, f) => { try { f(); n++; } catch (e) { console.error("FAIL " + name); throw e; } };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, a + " vs " + b);
// the map: a 2-bar intro from 1 s, then Verse 1 (8 bars) and Chorus (4 bars); 2 s a bar (120 bpm, 4/4)
const model = RF.Model({ bars: Array.from({ length: 14 }, (_, i) => 1 + 2 * i), sections: [{ name: "Intro", bar: 1 }, { name: "Verse 1", bar: 3 }, { name: "Chorus", bar: 11 }] });
function piece(cuts) {           // cuts: [[heading|null, bars]]
  const d = D.create(); d.meter = "4/4"; d.key = "C";
  d.chunks = cuts.map(([h, b], i) => { const c = D.newChunk("C" + i); c.heading = h; c.rhythm = [{ type: "rest", durQ: 4 * b }]; return c; });
  return d;
}
t("chunks found through their sections", () => {
  const d = piece([["Intro", 2], ["Verse 1", 4], [null, 4], ["Chorus", 4]]), sp = C.spans(d, D, model, 0);
  assert.deepStrictEqual(sp.map(s => [s.from, s.to, s.key]), [[0, 2, "intro#0@0"], [2, 6, "verse 1#0@0"], [6, 10, "verse 1#0@4"], [10, 14, "chorus#0@0"]]);
  assert.ok(sp.every(s => !s.guessed && !s.mismatch));
});
t("a bar added in the verse cannot move the chorus; the verse is flagged", () => {
  const d = piece([["Intro", 2], ["Verse 1", 5], [null, 4], ["Chorus", 4]]), sp = C.spans(d, D, model, 0);
  assert.deepStrictEqual(sp[3].from, 10);
  assert.deepStrictEqual(sp[1].mismatch, { doc: 9, map: 8 });
});
t("a section the map lacks: its bar number and the offset", () => {
  const d = piece([["Intro", 2], ["Bridge", 2]]), sp = C.spans(d, D, model, 1);
  assert.strictEqual(sp[1].guessed, true); assert.strictEqual(sp[1].from, 3);
});
t("split: the second half's lead-in from its pickup, the first half stops early by it", () => {
  const d = piece([["Intro", 2], ["Verse 1", 8]]);
  D.splitAt(d, 1, 4 * 4 - 1);                                     // a beat before bar 5: the second part has a one-beat lead
  const sp = C.spans(d, D, model, 0), k = sp.findIndex(s => s.ci === 2);
  assert.strictEqual(C.leadIn(d, D, sp, k, null, model), 1);
  assert.strictEqual(C.tail(d, D, sp, k - 1, null, model), -1);
});
t("set by hand, then the song file's, then guessed", () => {
  const d = piece([["Intro", 2], ["Verse 1", 4], [null, 4]]), sp = C.spans(d, D, model, 0);
  const prefs = { leadIns: { "verse 1#0@4": 1.5 }, tails: { "verse 1#0@0": 2 } };
  assert.strictEqual(C.leadIn(d, D, sp, 2, prefs, model), 1.5);
  assert.strictEqual(C.tail(d, D, sp, 1, prefs, model), 2);
  d.chunks[2].loop = { leadIn: 0.5 }; assert.strictEqual(C.leadIn(d, D, sp, 2, prefs, model), 0.5);
  assert.strictEqual(C.tail(d, D, sp, 1, null, model), -0.5, "no song file value: stop early by the next chunk's lead-in");
});
t("the loop window, at half speed", () => {
  const d = piece([["Intro", 2], ["Verse 1", 4], [null, 4]]), sp = C.spans(d, D, model, 0);
  const w = C.window(model, sp, 1, 1, -1, 0.5);
  near(w.start, 5 - 0.5); near(w.down, 5); near(w.end, 13 - 0.5); near(w.bpm, 120); near(w.beatSec, 1);
});
t("status: empty, draft, done", () => {
  const d = piece([["Intro", 2], ["Verse 1", 4]]);
  assert.strictEqual(C.status(d, D, 0), "empty");
  d.chunks[0].pitches = [60]; d.chunks[0].rhythm = [{ type: "note", durQ: 8 }]; assert.strictEqual(C.status(d, D, 0), "done");
  d.chunks[0].draft = true; assert.strictEqual(C.status(d, D, 0), "draft");
});
console.log("chunk-loop: " + n + " checks passed");
