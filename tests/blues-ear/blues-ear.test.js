// Blues Changes by Ear, pure part: every form is 12 bars (48 beats); every level makes questions whose odd clip differs from the
// base form in the bars its choice names, and only there; the two same clips have the same form; chord symbols are read by the band;
// ABC bars (band notation, play, tune) are 8 eighths. Run: node tests/blues-ear/blues-ear.test.js
const assert = require("assert"), path = require("path");
require(path.join(__dirname, "../../apps/shared/band/harmony.js"));
const H = globalThis.BandHarmony, P = require(path.join(__dirname, "../../apps/patterns/prog-ear.js")); globalThis.ProgEar = P;
const B = require(path.join(__dirname, "../../apps/patterns/blues-ear.js"));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok  ", name); };
function barLens(abc) {
  const out = [];
  abc.split("\n").filter(l => l && !/^[A-Za-z]:/.test(l) && !/^%%/.test(l)).forEach(line => {
    line.replace(/^\[V:\d\]\s*/, "").replace(/"[^"]*"/g, "").split(/\|\]?/).forEach(seg => {
      if (!seg.trim()) return; let t = 0; seg.replace(/(\[[^\]]+\]|[=^_]*[A-Ga-gz][,']*)(\d*)/g, (_, x, d) => { t += d ? +d : 1; }); out.push(t);
    });
  });
  return out;
}
ok("the basic forms", () => {
  assert.strictEqual(B.form({}).map(b => b.join(" ")).join("|"), "I7|I7|I7|I7|IV7|IV7|I7|I7|V7|IV7|I7|I7");
  assert.strictEqual(B.form({ b2: "IV", turn: "V" }).map(b => b.join(" ")).join("|"), "I7|IV7|I7|I7|IV7|IV7|I7|I7|V7|IV7|I7|V7");
  assert.strictEqual(B.form({ b9_10: "ii-V", turn: "VI", sub: "tri", subVI: "yes" }).slice(8).map(b => b.join(" ")).join("|"), "ii7|V7|I7 bVI7|ii7 bII7");
  assert.strictEqual(B.form({ turn: "bIII" }).slice(10).map(b => b.join(" ")).join("|"), "I7 bIII7|bVI7 bII7");
  assert.strictEqual(B.form({}, true).map(b => b.join(" ")).join("|"), "i7|i7|i7|i7|iv7|iv7|i7|i7|bVI7|V7|i7|i7");
  assert.strictEqual(B.form({ bird: "yes" })[1].join(" "), "viiø7 III7");
  assert.strictEqual(P.chord("bII7", "F", "7").sym, "Gb7"); assert.strictEqual(P.chord("#iv°7", "F", "dim7").sym, "Bdim7");
  assert.strictEqual(P.chord("viiø7", "C", "m7b5").sym, "Bm7b5"); assert.strictEqual(P.chord("bVI7", "C minor", "7").sym, "Ab7");
});
for (const lv of B.LEVELS.concat(B.MLEVELS)) ok("level " + lv.id + ": 150 questions", () => {
  const r = P.rng(lv.id.length * 31 + lv.id.charCodeAt(lv.id.length - 1));
  for (let i = 0; i < 150; i++) {
    const q = B.question(lv.id, { tune: i % 3 === 0, bars: "all" }, r); assert(q, "made");
    const same = q.clips.filter(c => !c.odd), odd = q.clips.find(c => c.odd);
    assert.strictEqual(same.length, 2); assert.deepStrictEqual(same[0].form, same[1].form); assert.notDeepStrictEqual(odd.form, same[0].form);
    assert(Object.keys(lv.diff).includes(q.diff.kind), q.diff.kind);
    assert.strictEqual(new Set(q.clips.map(c => c.style)).size, 3);
    q.clips.forEach(c => {
      assert.strictEqual(c.form.length, 12); assert(Math.abs(c.chords.reduce((a, x) => a + x.beats, 0) - 48) < 1e-9);
      c.chords.forEach(ch => { const h = H.parseChord(ch.sym); assert(!h.unknown && !h.nc && h.root === ch.root, ch.sym); });
      if (lv.tier === 0) c.chords.forEach(ch => assert(/^[A-G][#b]?(m?7|dim7|m7b5|maj7)$/.test(ch.sym), ch.sym));
      [P.abcPlay(c, q), P.abcBand(c, q, true)].forEach(abc => barLens(abc).forEach(L => assert.strictEqual(L, 8, abc)));
      if (c.melody) { assert.strictEqual((P.abcPlay(c, q).match(/"[A-G][^"]*"/g) || []).length, c.chords.length, "every chord change is in the tune's ABC");
        assert.strictEqual(c.melody, q.clips[0].melody); const last = c.melody[c.melody.length - 1]; assert(Math.abs(last.t + last.d - 48) < 1e-6); }
    });
    assert(q.diff.text.length > 20 && !/undefined/.test(q.diff.text), q.diff.text);
    if (q.minor) assert(!/ VI7 \| ii V/.test(q.diff.text), q.diff.text);
  }
});
ok("level 8 changes every kind of choice", () => { const r = P.rng(8), seen = new Set(); for (let i = 0; i < 400; i++) seen.add(B.question("8", {}, r).diff.kind); assert(seen.size >= 8, [...seen]); });
// the four bars heard: chords and tune cut to them; the change always inside
function checkWindow(q, len) {
  const [from, to] = q.bars; assert.strictEqual(to - from + 1, len, q.bars);
  const odd = q.clips.find(c => c.odd), same = q.clips.find(c => !c.odd);
  assert.notDeepStrictEqual(odd.form, same.form, "the change is in the bars heard " + q.bars);
  q.clips.forEach(c => {
    assert.strictEqual(c.form.length, len); assert(Math.abs(c.chords.reduce((a, x) => a + x.beats, 0) - 4 * len) < 1e-9);
    [P.abcPlay(c, q), P.abcBand(c, q, true)].forEach(abc => { const L = barLens(abc); assert.strictEqual(L.length, c.melody ? L.length : len * (abc.includes("V:2") ? 2 : 1)); L.forEach(x => assert.strictEqual(x, 8, abc)); });
    if (c.melody) { const last = c.melody[c.melody.length - 1]; assert(Math.abs(last.t + last.d - 4 * len) < 1e-6); assert(c.melody[0].t >= 0);
      assert.strictEqual((P.abcPlay(c, q).match(/"[A-G][^"]*"/g) || []).length, c.chords.length); }
  });
}
ok("default: the phrase (1-4, 5-8, 9-12) holding the change", () => {
  const r = P.rng(41), seen = new Set();
  for (const lv of B.LEVELS.concat(B.MLEVELS)) for (let i = 0; i < 60; i++) {
    const q = B.question(lv.id, { tune: i % 2 === 0 }, r); checkWindow(q, 4); assert([1, 5, 9].includes(q.bars[0]), q.bars); seen.add(q.bars[0]);
    assert(/Bars \d+–\d+\./.test(q.prompt) && /You heard bars/.test(q.diff.text));
  }
  assert.strictEqual(seen.size, 3);
  // level 5 is about the turnaround: always bars 9-12; level 4's passing chords: bars 1-8
  for (let i = 0; i < 40; i++) { assert.deepStrictEqual(B.question("5", {}, r).bars, [9, 12]); assert(B.question("4", {}, r).bars[0] <= 5); }
});
ok("any four bars: any start 1-9, the change inside", () => {
  const r = P.rng(42), starts = new Set();
  for (let i = 0; i < 300; i++) { const q = B.question("8", { bars: "random", tune: i % 2 === 0 }, r); checkWindow(q, 4); starts.add(q.bars[0]); }
  assert(starts.size >= 7, [...starts]);
});
ok("bars I choose: the window kept, changes picked from inside it, none when none fits", () => {
  const r = P.rng(43);
  for (const w of [[3, 6], [9, 12], [2, 2], [1, 12], [5, 10]]) for (let i = 0; i < 40; i++) { const q = B.question("8", { window: w, tune: i % 2 === 0 }, r); assert.deepStrictEqual(q.bars, w); checkWindow(q, w[1] - w[0] + 1); }
  assert.strictEqual(B.question("5", { window: [1, 4] }, r), null);
});
console.log(n + " passed");
