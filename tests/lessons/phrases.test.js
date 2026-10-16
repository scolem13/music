// Timestamp Notes phrases (apps/shared/timestamp-player/phrases.js, TsPhrases). node tests/lessons/phrases.test.js
const path = require("path"), assert = require("assert");
const P = require(path.resolve(__dirname, "../..") + "/apps/shared/timestamp-player/phrases.js");
let n = 0;
const t = (name, f) => { try { f(); n++; } catch (e) { console.error("FAIL " + name); throw e; } };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, a + " vs " + b);
// 20 bars of 4, 2 s each from 1 s (120 bpm)
const grid = { bars: Array.from({ length: 20 }, (_, i) => 1 + 2 * i), beats: Array(20).fill(4), beatLen: 0.5 };
const secs = [{ name: "Intro", bar: 0, bars: 2 }, { name: "Verse 1", bar: 2, bars: 9 }, { name: "Chorus", bar: 11, bars: 6 }, { name: "Chorus", bar: 17, bars: 3 }];

t("sections cut into phrases", () => {
  const ph = P.split(secs, 4);
  assert.deepStrictEqual(ph.map(p => [p.name, p.from, p.to]), [
    ["Intro", 0, 2], ["Verse 1", 2, 6], ["Verse 1", 6, 11], ["Chorus", 11, 15], ["Chorus", 15, 17], ["Chorus", 17, 20]]);
  assert.strictEqual(ph[5].nth, 1);
  assert.strictEqual(ph[2].key, "verse 1#0@4");
});
t("untapped sections have no phrases", () => {
  assert.strictEqual(P.split([{ name: "Verse", bar: -1, bars: 0 }], 4).length, 0);
});
t("lead-in walks back at the bars' own tempo", () => {
  near(P.backFrom(grid, 2, 1.5), 5 - 0.75);
  const slow = { bars: [0, 4, 6], beats: [4, 4, 4], beatLen: 0.5 };   // bar 1 is 1 s a beat
  near(P.backFrom(slow, 2, 6), 6 - 2 - 2);                              // 4 beats of bar 2 at 0.5, 2 of bar 1 at 1
});
t("lead-in limits: two bars, the phrase before keeps a beat, the recording's start", () => {
  const ph = P.split(secs, 4);
  assert.strictEqual(P.maxLeadIn(grid, ph, 2), 8);
  assert.strictEqual(P.maxLeadIn(grid, ph, 1), 7);                      // the Intro is 2 bars: it keeps a beat
  assert.strictEqual(P.maxLeadIn(grid, ph, 0), 2);                      // 1 s of recording before bar 1
  const two = P.split([{ name: "A", bar: 0, bars: 1 }, { name: "B", bar: 1, bars: 4 }], 4);
  assert.strictEqual(P.maxLeadIn(grid, two, 1), 3);
});
t("loop: from the lead-in to the next downbeat, clamped", () => {
  const ph = P.split(secs, 4), l = P.loopOf(grid, ph, 1, 20);
  assert.strictEqual(l.leadIn, 7); near(l.start, 5 - 3.5); near(l.end, 13);
  near(P.loopOf(grid, ph, 5, 0).end, 1 + 2 * 19 + 2);                   // past the last tap: its beats at the typical beat
});
console.log("phrases: " + n + " checks passed");
