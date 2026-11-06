// The horn fingering table (apps/shared/horn/horn-chart.js). Run: node tests/horn/horn-chart.test.js
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/horn/horn-chart.js"));
assert.strictEqual(C.NOTES.length, C.HIGH - C.LOW + 1, "every semitone F3..C6");
C.NOTES.forEach((n, i) => {
  assert.strictEqual(n.midi, C.LOW + i, "ascending, no gaps");
  [n.f, n.b, n.altF || []].forEach(v => assert(v.every(x => x >= 1 && x <= 3), "levers 1-3 " + n.midi));
  ["F", "Bb"].forEach(side => {
    const v = side === "F" ? n.f : n.b;
    assert(C.lookup(side, v).some(x => x.midi === n.midi), "lookup finds " + side + " " + n.midi);
    assert(C.partialError(side, v, n.midi) < 0.5, "a harmonic of its tube: " + side + " " + n.midi);
  });
  if (n.altF) assert(C.partialError("F", n.altF, n.midi) < 0.5, "alt is a harmonic " + n.midi);
});
// as printed: open F horn = harmonics G3 C4 E4 G4 C5 D5 E5 G5 C6 (written)
assert.deepStrictEqual(C.lookup("F", []).map(x => x.midi), [55, 60, 64, 67, 72, 74, 76, 79, 84]);
assert.deepStrictEqual(C.lookup("F", []).map(x => x.partial), [3, 4, 5, 6, 8, 9, 10, 12, 16], "the usual harmonic numbers");
assert.deepStrictEqual(C.lookup("Bb", []).map(x => x.midi), [53, 60, 65, 72, 77, 79, 84].sort((a, b) => a - b).filter((m, i, a) => a.indexOf(m) === i), "open B♭ side");
assert.deepStrictEqual(C.lookup("Bb", [1, 3]).map(x => x.midi), [55]);
assert.deepStrictEqual(C.lookup("F", [2, 3]).map(x => x.midi), [56, 68, 80]);
assert.deepStrictEqual(C.lookup("F", [3, 1]), [], "1+3 on the F side is not on the chart; order does not matter");
assert.deepStrictEqual(C.lookup("Bb", [3, 1]).map(x => x.midi), [55]);
// the chart's two "or" cells
assert.deepStrictEqual(C.fingerings(73, "double").map(f => f.side + f.valves.join("") + (f.alt ? "*" : "")), ["F2", "F12*", "Bb23"]);
assert.deepStrictEqual(C.fingerings(74, "f").map(f => f.valves.join("")), ["", "1"]);
assert.deepStrictEqual(C.fingerings(60, "bb").map(f => f.side), ["Bb"]);
// the same two sides agree on written pitch within a double horn at the switch note
assert.strictEqual(C.name(C.SWITCH), "G♯/A♭4");
assert.strictEqual(C.name(60, "sharp"), "C4");
assert.strictEqual(C.concert(60), 53, "written C4 sounds F3");
// diagram + lookup are plain data: nothing to draw in node
assert.strictEqual(typeof C.diagram, "function");
console.log("horn-chart: all ok");
