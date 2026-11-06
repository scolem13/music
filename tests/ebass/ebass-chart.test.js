// Node test for apps/shared/ebass/ebass-chart.js. Run: node tests/ebass/ebass-chart.test.js   (NEG=1 must fail)
const assert = require("assert"), path = require("path");
global.window = global;
const C = require(path.resolve(__dirname, "../../apps/shared/ebass/ebass-chart.js"));
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok  ", name); };
const NEG = !!process.env.NEG;
t("open strings E A D G = 28 33 38 43", () => { assert.deepStrictEqual([4, 3, 2, 1].map(s => C.midi(s, 0)), NEG ? [28, 33, 38, 44] : [28, 33, 38, 43]); });
t("every pitch from LOW to HIGH has a position, and positions give back the pitch", () => {
  for (let m = C.LOW; m <= C.HIGH; m++) { const p = C.positions(m); assert(p.length >= 1, "no position for " + m); p.forEach(q => assert.strictEqual(C.midi(q.s, q.f), m)); }
});
t("positions are within 0-12 and a note has at most 3 places on 12 frets", () => {
  for (let m = C.LOW; m <= C.HIGH; m++) { const p = C.positions(m); assert(p.length <= 3); p.forEach(q => assert(q.f >= 0 && q.f <= 12)); }
});
t("fretted notes against the book's chart: first position, one finger per fret", () => {
  // book p. 263: on the E string fret 1 = F (finger 1), fret 2 = F#/Gb (2), fret 3 = G (3), fret 4 = G#/Ab (4)
  assert.deepStrictEqual([1, 2, 3, 4].map(f => C.name(C.midi(4, f))), ["F1", "F♯1", "G1", "G♯1"]);
  assert.deepStrictEqual([1, 2, 3, 4].map(f => C.finger(f)), [1, 2, 3, 4]); assert.strictEqual(C.finger(5), null);
});
t("written an octave above sounding; ABC in the bass clef checks out", () => {
  assert.strictEqual(C.written(28), 40); assert.strictEqual(C.abc(40), "E,,"); assert.strictEqual(C.abc(45 + 12), "A,"); assert.strictEqual(C.abc(66), "^F");
  assert.strictEqual(C.abc(C.written(43)), "G,"); // open G sounds G2, written G3 = G, in ABC (C = middle C 60)
});
t("frequencies at A4 = 440", () => { assert(Math.abs(C.freq(33) - 55) < 1e-9); assert(Math.abs(C.freq(28) - 41.203) < 0.01); });
t("names", () => { assert.strictEqual(C.name(28), "E1"); assert.strictEqual(C.name(30, true), "G♭1"); assert.strictEqual(C.pcName(6, true), "F♯/G♭"); });
console.log(n + " passed");
