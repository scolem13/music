// The oboe fingering tables (apps/shared/oboe/oboe-chart.js). Run: node tests/oboe/oboe-chart.test.js   (NEG=1 must fail)
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/oboe/oboe-chart.js"));
if (process.env.NEG) C.FINGERINGS[62] = C.FINGERINGS[64];   // a duplicate fingering: the uniqueness check below must catch it
for (let m = C.LOW; m <= C.HIGH; m++) {
  assert(C.FINGERINGS[m] && C.FINGERINGS[m].length, "fingering for " + m);
  C.FINGERINGS[m].forEach(f => { assert.deepStrictEqual(C.lookup(f), [m], "unique " + m + " " + f); f.forEach(k => assert(C.KEYS.some(q => q.id === k), "key " + k)); });
}
assert.strictEqual(C.HIGH - C.LOW + 1, 30, "30 notes, B♭3 to D♯6, as on the chart");
assert.deepStrictEqual(Object.keys(C.FINGERINGS).map(Number).sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => 58 + i));
[63, 65, 75, 77, 85].forEach(m => assert.strictEqual(C.FINGERINGS[m].length, 2, "two fingerings on the chart for " + m));
assert.strictEqual(Object.keys(C.FINGERINGS).filter(m => C.FINGERINGS[m].length > 1).length, 5, "only those five have alternates");
Object.keys(C.LABELS).forEach(m => assert.strictEqual(C.LABELS[m].length, C.FINGERINGS[m].length, "labels for " + m));
assert.deepStrictEqual(C.lookup(["h1", "h2", "h3"]), [67]);
assert.deepStrictEqual(C.lookup(["h1"]), [71]);
assert.deepStrictEqual(C.lookup(["hh", "h2", "h3", "h4", "h5", "h6"]), [74], "half-hole D5 differs from D4");
assert.deepStrictEqual(C.lookup(["h1", "h2", "h3", "h4", "h5", "h6"]), [62]);
assert.deepStrictEqual(C.lookup([]), [], "no keys: no note on this chart");
// the thumb key lifts E4..A4 type fingerings an octave (E5-G♯5)
[64, 65, 66, 67, 68].forEach(m => assert.deepStrictEqual(C.FINGERINGS[m + 12][0].filter(k => k !== "oct").sort(), C.FINGERINGS[m][0].slice().sort(), "octave key copy of " + m));
assert.strictEqual(C.TRILLS.length, 24, "24 trills");
const ids = new Set(C.KEYS.map(q => q.id)); assert.strictEqual(ids.size, C.KEYS.length, "key ids are unique");
C.TRILLS.forEach(t => {
  assert(t.from >= C.LOW && t.to <= C.HIGH && t.from < t.to, "trill range " + t.from);
  [...t.hold, ...t.trill].forEach(k => assert(ids.has(k), "trill key " + k));
  assert(t.label && t.label.split(" to ").length === 2, "label " + t.label);
  assert(t.trill.length >= 1 && !t.trill.some(k => t.hold.includes(k)), "trill keys are not also held");
});
assert.strictEqual(C.TRILLS.filter(t => t.unsure).length, 3);
assert.strictEqual(C.name(66), "F♯4"); assert.strictEqual(C.both(70), "A♯/B♭4"); assert.strictEqual(C.INSTRUMENTS.oboe, 0);
// every key has a path
C.KEYS.forEach(q => assert(/^M/.test(q.d) && q.name && q.hand, "key " + q.id));
console.log("oboe-chart: all ok");
