// The flute fingering tables (apps/shared/flute/flute-chart.js) and Flute Patterns by Ear helpers. Run: node tests/flute/flute-chart.test.js
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/flute/flute-chart.js"));
const E = require(path.join(__dirname, "../../apps/patterns/ear-flute.js"));
const ids = new Set(C.KEYS.map(k => k.id));
assert.strictEqual(C.KEYS.length, 15, "15 keys");
assert.deepStrictEqual(C.INSTRUMENTS, { flute: 0 }, "non-transposing");
for (let m = C.LOW; m <= C.HIGH; m++) {
  assert(C.FINGERINGS[m] && C.FINGERINGS[m].length, "fingering for " + m);
  C.FINGERINGS[m].forEach(f => {
    f.forEach(k => assert(ids.has(k), "key " + k));
    assert.strictEqual(new Set(f).size, f.length, "no repeated key " + m);
    // a fingering is shared only by the same note in other octaves, never by another note letter
    C.lookup(f).forEach(x => assert((x - m) % 12 === 0, "fingering of " + m + " also reads as " + x));
    assert(C.lookup(f).includes(m));
  });
}
assert.strictEqual(C.FINGERINGS[70].length, 3, "three B♭4 fingerings, as on the chart");
assert.strictEqual(C.FINGERINGS[82].length, 3, "three B♭5 fingerings");
for (let m = 66; m <= 71; m++) assert.deepStrictEqual(C.FINGERINGS[m + 12], C.FINGERINGS[m], "second octave repeats the first from F♯");
assert.deepStrictEqual(C.lookup(["l1", "l2", "l3", "ds", "tB"]).sort(), [67, 79]);
assert.deepStrictEqual(C.lookup(["l1", "l2", "l3", "r1", "r2", "r3", "fc", "fcs", "tB"]), [60]);
assert.strictEqual(C.TRILLS.length, 37, "37 trills");
C.TRILLS.forEach(t => {
  [...t.hold, ...t.trill].forEach(k => assert(ids.has(k), "trill key " + k));
  assert(t.trill.length >= 1, "something to move");
  assert(t.trill.every(k => !t.hold.includes(k)), "gray keys are not also held");
  assert(t.from >= C.LOW && t.to <= C.HIGH && t.to > t.from && t.to - t.from <= 3);
});
assert.strictEqual(C.name(66), "F♯4"); assert.strictEqual(C.both(70), "A♯/B♭4");
// sets are placed inside D4..D6
const pats = [{ midi: [60, 64, 67] }, { midi: [55, 62] }];
const sh = E.placeSet(pats, 0); assert.strictEqual(sh, 12);
const heard = [], seg = E.Segmenter(m => heard.push(m)), f = m => seg.frame(m == null ? { hz: -1 } : { hz: 400, midi: m });
[60, 60, 61, 61, 61, 61, 62, 62, 62, null, null, 62, 62, 62].forEach(f);
assert.deepStrictEqual(heard, [61, 62, 62]);
console.log("flute-chart: all ok");
