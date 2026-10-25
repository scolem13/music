// The trumpet and tuba fingering tables (apps/shared/brass/brass-chart.js). Run: node tests/brass/brass-chart.test.js
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/brass/brass-chart.js"));
for (const inst of ["trumpet", "tuba"]) {
  const I = C.INSTRUMENTS[inst], F = C.FINGERINGS[inst];
  for (let m = I.low; m <= I.high; m++) {
    assert(F[m] && F[m].length, inst + " fingering for " + m);
    assert(!F[m][0].alt, "first is the usual one");
    F[m].forEach(f => {
      assert(f.valves.every(v => v >= 1 && v <= I.nvalves), "valves in range " + m);
      assert(C.lookup(inst, f.valves).some(x => x.midi === m && x.partial === f.partial), "lookup finds " + inst + " " + m);
    });
  }
  Object.keys(F).forEach(m => assert(m >= I.low && m <= I.high, "no stray note " + m));
  // lookup returns every note of a combination, no note twice per combination
  for (const f of Object.values(F)) f.forEach(fg => { const r = C.lookup(inst, fg.valves).map(x => x.midi); assert.strictEqual(new Set(r).size, r.length); });
}
// trumpet, as printed
assert.deepStrictEqual(C.lookup("trumpet", []).map(x => x.midi), [60, 67, 72, 76, 79, 84], "open: C4 G4 C5 E5 G5 C6");
assert.deepStrictEqual(C.lookup("trumpet", [2]).map(x => x.midi), [59, 66, 71, 75, 78, 83]);
assert.deepStrictEqual(C.lookup("trumpet", [1, 2, 3]).map(x => x.midi), [54, 61]);
assert.deepStrictEqual(C.lookup("trumpet", [3, 1]).map(x => x.midi), [55, 62], "order of valves does not matter");
assert.strictEqual(C.lookup("trumpet", [1, 3]).filter(x => x.slide).length, 1, "3rd-slide footnote on D4");
assert.strictEqual(C.lookup("trumpet", [1, 2, 3]).filter(x => x.slide).length, 1, "and C#4");
assert.deepStrictEqual(C.lookup("trumpet", [3]), [], "valve 3 alone is not on the chart");
assert.strictEqual(C.concert("trumpet", 60), 58);
// tuba, as printed (concert pitch, bass clef)
assert.deepStrictEqual(C.lookup("tuba", []).map(x => x.midi), [34, 41, 46, 50, 53], "B♭1 F2 B♭2 D3 F3");
assert.deepStrictEqual(C.lookup("tuba", [1, 3]).map(x => x.midi), [29, 36]);
assert.deepStrictEqual(C.lookup("tuba", [4]).map(x => x.midi), [29, 36], "valve 4 = the 1+3 notes");
assert.deepStrictEqual(C.lookup("tuba", [2, 4]).map(x => x.midi), [28, 35]);
assert(C.lookup("tuba", [4]).every(x => x.alt));
assert.strictEqual(C.FINGERINGS.tuba[29].length, 2);
assert.strictEqual(C.name(34, "flat"), "B♭1");
console.log("brass-chart: all ok");
