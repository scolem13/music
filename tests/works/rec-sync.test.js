// rec-sync.js: score bars (from abcjs events, repeats in played order) matched to a recording's tapped bars.
// node tests/works/rec-sync.test.js   (NEG=1 must fail)
const assert = require("assert"), RS = require("../../apps/shared/rec-sync.js");
// four score bars of 2000 ms, a pickup of 500 ms before them
const ev = [{ milliseconds: 0, elements: [["p"]] }, { milliseconds: 500, measureStart: true, elements: [["a"]] }, { milliseconds: 1500, elements: [["a2"]] },
  { milliseconds: 2500, measureStart: true, elements: [["b"]] }, { milliseconds: 4500, measureStart: true, elements: [["c"]] }, { milliseconds: 6500, measureStart: true, elements: [["d"]] }];
const bars = [10, 11, 13, 16, 20];     // the recording: bar 1 at 10 s, slowing down
const s = RS.sync(ev, bars, { pickup: true });
assert.strictEqual(s.scoreBars.length, 5);
assert.deepStrictEqual(s.scoreBars[1].els, ["a", "a2"]);
assert.strictEqual(s.toRec(500), 10);
assert.strictEqual(s.toRec(2500), 11);
assert.strictEqual(s.toRec(3500), 12, "halfway through bar 2");
assert.strictEqual(s.toScore(14.5), 5500, "halfway through bar 3");
assert.strictEqual(s.barAt(s.toScore(16.2)), 4);
// bar1: the score starts at the recording's third bar
const s2 = RS.sync(ev, bars, { pickup: true, bar1: 3 });
assert.strictEqual(s2.toRec(500), 13);
if (process.env.NEG) assert.strictEqual(s.toRec(2500), 13, "NEG");
console.log("ok: rec-sync");
