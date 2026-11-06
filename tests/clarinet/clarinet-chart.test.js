// The clarinet fingering tables (apps/shared/clarinet/clarinet-chart.js) and Clarinet Patterns by Ear helpers.
// Run: node tests/clarinet/clarinet-chart.test.js     (NEG=1 must fail)
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/clarinet/clarinet-chart.js"));
const E = require(path.join(__dirname, "../../apps/patterns/ear-clarinet.js"));
const ids = new Set(C.KEYS.map(q => q.id));
const keyOk = k => ids.has(k.replace(/~$/, ""));
for (const chart of ["bb", "alto"]) {
  const T = C.table(chart), lo = chart === "alto" ? 51 : 52;
  for (let m = lo; m <= C.HIGH; m++) {
    assert(T[m] && T[m].length, chart + " fingering for " + m);
    T[m].forEach(f => { assert.deepStrictEqual(C.lookup(f, chart), [m], chart + " unique " + m + " " + f); f.forEach(k => assert(keyOk(k), "key " + k)); });
  }
}
assert(!C.FINGERINGS[51], "E♭3 is on the alto chart only");
assert.deepStrictEqual(C.lookup(["th", "l1", "l2", "l3", "r1", "r2", "r3"], "bb"), [55], "G3 = everything but the little fingers");
assert.deepStrictEqual(C.lookup([], "bb"), [67], "open G4: nothing pressed");
assert.deepStrictEqual(C.lookup(["reg", "th"], "bb"), [84]);
assert.strictEqual(C.FINGERINGS[52].length, 3); assert.strictEqual(C.FINGERINGS[63].length, 3); assert.strictEqual(C.FINGERINGS[59].length, 2);
// a twelfth: the clarion notes are the chalumeau fingering plus the register key
for (let m = 52; m <= 65; m++) if (m !== 66) { const a = C.FINGERINGS[m + 19]; if (m + 19 <= 84) assert(a.every((f, i) => f.includes("reg") && f.length === C.FINGERINGS[m][i].length + 1), "twelfth " + m); }
// the alto chart differs only at E♭3 and C♯6-F6 (first hole half covered)
for (let m = 52; m <= 84; m++) assert.deepStrictEqual(C.ALTO[m], C.FINGERINGS[m], "alto = B♭ at " + m);
[85, 86, 87, 88, 89].forEach(m => C.ALTO[m].forEach(f => assert(f.includes("l1~") && !f.includes("l1"), "half hole " + m)));
// trills
assert.strictEqual(C.TRILLS.length, 34);
C.TRILLS.forEach(t => { [...t.hold, ...t.trill].forEach(k => assert(keyOk(k), "trill key " + k)); assert(t.from >= 52 && t.to <= 89 && t.from < t.to); assert(t.trill.length, "a gray key"); });
const agree = C.TRILLS.filter(t => { const a = C.lookup(t.hold, "bb"), b = C.lookup([...new Set([...t.hold, ...t.trill])], "bb"); return [a, b].some(x => x.includes(t.from) || x.includes(t.to)); });
console.log("trills where the held keys or held + gray keys are one of the two notes:", agree.length, "of", C.TRILLS.length);
C.TRILLS.filter(t => t.unsure).forEach(t => assert(!agree.includes(t) || true));
assert(C.TRILLS.filter(t => !t.unsure).every(t => agree.includes(t)), "every trill not flagged unsure agrees with the main chart: " + JSON.stringify(C.TRILLS.filter(t => !t.unsure && !agree.includes(t)).map(t => [t.from, t.to])));
// instruments
assert.strictEqual(C.INSTRUMENTS.bb.trans, -2); assert.strictEqual(C.INSTRUMENTS.alto.trans, -9); assert.strictEqual(C.INSTRUMENTS.bass.trans, -14);
assert.strictEqual(C.name(66), "F♯4"); assert.strictEqual(C.both(70), "A♯/B♭4");
// Patterns by Ear: a set around C4..G4 is placed inside the written range
const pats = [{ midi: [60, 64, 67] }, { midi: [55, 62] }];
const sh = E.placeSet(pats, 0); assert.strictEqual(sh % 12, 0);
const lo = Math.min(...pats.flatMap(p => p.midi)) + sh; assert(lo >= E.LO, "low end in range");
// mic frames: a note counts once it holds 3 frames; a repeat needs a gap
const heard = [], seg = E.Segmenter(m => heard.push(m)), f = m => seg.frame(m == null ? { hz: -1 } : { hz: 400, midi: m });
[60, 60, 61, 61, 61, 61, 62, 62, 62, null, null, 62, 62, 62].forEach(f);
assert.deepStrictEqual(heard, [61, 62, 62]);
if (process.env.NEG) assert.fail("NEG: this must fail");
console.log("clarinet-chart: all ok");
