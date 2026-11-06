// The bassoon fingering tables (apps/shared/bassoon/bassoon-chart.js). Run: node tests/bassoon/bassoon-chart.test.js
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/bassoon/bassoon-chart.js"));
const ids = new Set(C.KEYS.map(q => q.id));
assert.strictEqual(ids.size, C.KEYS.length, "key ids unique");
for (let m = C.LOW; m <= C.HIGH; m++) {
  assert(C.FINGERINGS[m] && C.FINGERINGS[m].length, "fingering for " + m);
  C.FINGERINGS[m].forEach(f => { assert.deepStrictEqual(C.lookup(f), [m], "unique " + m + " " + f); f.forEach(k => assert(ids.has(k), "key " + k)); assert.strictEqual(new Set(f).size, f.length, "dup key in " + m); });
}
assert.strictEqual(C.LOW, 34); assert.strictEqual(C.HIGH, 70); assert.strictEqual(Object.keys(C.FINGERINGS).length, 37, "B♭1 to B♭4");
assert.strictEqual(C.FINGERINGS[42].length, 2); assert.strictEqual(C.FINGERINGS[63].length, 2);
assert.deepStrictEqual(C.lookup(["W"]), [53], "F3: whisper key alone");
assert.deepStrictEqual(C.lookup(["h1", "h2", "h3", "h4", "h5"]), [57], "A3");
assert.strictEqual(C.name(34, "flat"), "B♭1"); assert.strictEqual(C.both(70), "A♯/B♭4");
assert.strictEqual(C.TRILLS.length, 35, "35 trill cells (some notes have two fingerings)");
C.TRILLS.forEach(t => { [...t.hold, ...t.trill].forEach(k => assert(ids.has(k), "trill key " + k)); assert(t.trill.length, "a gray key");
  t.trill.forEach(k => assert(!t.hold.includes(k), "gray key not also held")); assert(t.from >= C.LOW && t.to <= C.HIGH && t.from < t.to); });
console.log("bassoon-chart: all ok");
