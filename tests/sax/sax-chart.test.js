// The saxophone fingering tables (apps/shared/sax/sax-chart.js) and Sax Patterns by Ear helpers. Run: node tests/sax/sax-chart.test.js
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/sax/sax-chart.js"));
const E = require(path.join(__dirname, "../../apps/patterns/ear-sax.js"));
for (let m = C.LOW; m <= C.HIGH; m++) {
  assert(C.FINGERINGS[m] && C.FINGERINGS[m].length, "fingering for " + m);
  C.FINGERINGS[m].forEach(f => { assert.deepStrictEqual(C.lookup(f), [m], "unique " + m + " " + f); f.forEach(k => assert(C.KEYS.some(q => q.id === k), "key " + k)); });
}
assert.deepStrictEqual(C.lookup(["b1", "a2", "g3"]), [67]);
assert.deepStrictEqual(C.lookup([]), [73]);
assert.strictEqual(C.FINGERINGS[70].length, 4, "four B♭ fingerings, as on the chart");
assert.strictEqual(C.TRILLS.length, 28, "28 trills");
C.TRILLS.forEach(t => [...t.hold, ...t.trill].forEach(k => assert(C.KEYS.some(q => q.id === k), "trill key " + k)));
assert.strictEqual(C.name(66), "F♯4"); assert.strictEqual(C.both(70), "A♯/B♭4");
// a set around C4..G4 is placed inside written D4..C6
const pats = [{ midi: [60, 64, 67] }, { midi: [55, 62] }];
const sh = E.placeSet(pats, 0); assert.strictEqual(sh, 12);
// mic frames: a note counts once it holds 3 frames; a repeat needs a gap
const heard = [], seg = E.Segmenter(m => heard.push(m)), f = m => seg.frame(m == null ? { hz: -1 } : { hz: 400, midi: m });
[60, 60, 61, 61, 61, 61, 62, 62, 62, null, null, 62, 62, 62].forEach(f);
assert.deepStrictEqual(heard, [61, 62, 62]);
console.log("sax-chart: all ok");
