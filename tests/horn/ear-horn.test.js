// EarHorn.placeSet keeps a set in the easy range. Run: node tests/horn/ear-horn.test.js
const assert = require("assert"), path = require("path");
const E = require(path.join(__dirname, "../../apps/patterns/ear-horn.js"));
const pats = [{ midi: [60, 62, 64, 67] }, { midi: [67, 69, 72, 74] }];
for (const s of [-24, -12, 0, 12, 24]) {
  const sh = E.placeSet(pats, s), all = pats.flatMap(p => p.midi.map(m => m + sh));
  assert(Math.min(...all) >= E.LO && Math.max(...all) <= E.HI, "in range for shift " + s);
  assert.strictEqual(((sh - s) % 12 + 12) % 12, 0, "octave moves only");
}
let got = []; const seg = E.Segmenter(m => got.push(m));
[60, 60, 60, 60, 62, 62, 62].forEach(m => seg.frame({ hz: 200, midi: m }));
assert.deepStrictEqual(got, [60, 62], "a note after 3 steady frames, not repeated");
seg.frame({ hz: 0 }); seg.frame({ hz: 0 }); [62, 62, 62].forEach(m => seg.frame({ hz: 200, midi: m }));
assert.deepStrictEqual(got, [60, 62, 62], "same note again after a break");
console.log("ear-horn: all ok");
