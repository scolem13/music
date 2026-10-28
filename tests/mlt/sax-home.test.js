// My Saxophone Practice (apps/shared/mlt/sax-home.js): notes known by section, echo patterns from them, songs in class keys.
//   node tests/mlt/sax-home.test.js
const path = require("path"), assert = require("assert"), R = path.join(__dirname, "../..");
global.window = global; global.localStorage = { getItem: () => null, setItem: () => {} };
require(R + "/apps/shared/sax/sax-chart.js"); require(R + "/apps/shared/mlt/activities.js"); require(R + "/apps/shared/mlt/books/jri-sax.js");
require(R + "/apps/shared/mlt/mlt-walk.js");
const H = require(R + "/apps/shared/mlt/sax-home.js");
const nm = k => k.notes.map(n => n.name + ":" + SaxChart.name(n.written, "sharp")).join(" ");
assert.strictEqual(H.known("1A", "alto").notes.length, 0, "no notes in 1A");
assert.strictEqual(nm(H.known("2B", "alto")), "TI:F♯4 DO:G4 RE:A4 MI:B4", "2B alto: concert B♭ = written G-DO, TI below");
assert.strictEqual(nm(H.known("3B", "alto")), "SO:D4 TI:F♯4 DO:G4 RE:A4 MI:B4", "3B: the second key is only practised; SO below for the bass");
assert.strictEqual(nm(H.known("4B", "alto")), "TI:B4 DO:C5 RE:D5 MI:E5", "4B: playing in concert E♭ = written C-DO");
assert.strictEqual(nm(H.known("5A", "alto")), "MI:E4 SI:G♯4 LA:A4 TI:B4 DO:C5", "5A: C minor = written A-LA");
assert.strictEqual(nm(H.known("2B", "tenor")), "TI:B4 DO:C5 RE:D5 MI:E5", "tenor: concert B♭ = written C-DO");
assert.ok(H.known("5A", "alto").all.length >= 13, "every note met so far");
for (const sec of ["2B", "3A", "4B", "5A"]) for (const seed of [1, 2, 3]) {
  const k = H.known(sec, "alto"), ps = H.patterns(k, seed, 6), ns = k.notes.filter(n => !/,$/.test(n.syl));
  assert.strictEqual(ps.length, 6, sec);
  ps.forEach(p => {
    assert.strictEqual(p[0].name, p[0].la ? "LA" : "DO", sec + " starts on the resting tone");
    assert.ok(p.length >= 2 && p.length <= 4, sec + " 2-4 notes");
    p.forEach((n, i) => { if (i) assert.strictEqual(Math.abs(ns.indexOf(n) - ns.indexOf(p[i - 1])), 1, sec + " moves to a neighbouring known note"); });
  });
}
assert.strictEqual(H.classKey("K:Bbmaj"), 0); assert.strictEqual(H.classKey("K:Gm"), 5, "G minor moves to C minor (Book One)"); assert.strictEqual(H.classKey("K:Cm"), 0); assert.strictEqual(H.classKey("K:Eb"), 0);
assert.strictEqual(H.classKey("K:F"), 5, "F major moves to B♭"); assert.strictEqual(H.classKey("K:Dm"), -2, "D minor moves to C minor");
console.log("SAX HOME OK");
