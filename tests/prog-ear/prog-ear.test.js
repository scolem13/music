// Odd Progression Out, pure part: every level makes questions; the two "same" clips share Roman numerals, the odd one differs
// in exactly one chord; every chord symbol is read by the band (BandHarmony.parseChord); every ABC bar (band, melody, play) is 8 eighths.
// Run: node tests/prog-ear/prog-ear.test.js
const assert = require("assert"), path = require("path");
require(path.join(__dirname, "../../apps/shared/band/harmony.js"));
const H = globalThis.BandHarmony, P = require(path.join(__dirname, "../../apps/patterns/prog-ear.js"));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok  ", name); };
// eighths in each bar of the first voice body lines (L:1/8): chords [..]N, notes with accidentals/octave marks, ties, annotations
function barLens(abc) {
  const out = [];
  abc.split("\n").filter(l => l && !/^[A-Za-z]:/.test(l) && !/^%%/.test(l)).forEach(line => {
    line.replace(/^\[V:\d\]\s*/, "").replace(/"[^"]*"/g, "").split(/\|\]?/).forEach(seg => {
      if (!seg.trim()) return; let t = 0;
      seg.replace(/(\[[^\]]+\]|[=^_]*[A-Ga-gz][,']*)(\d*)/g, (_, x, d) => { t += d ? +d : 1; });
      out.push(t);
    });
  });
  return out;
}
const levels = P.LEVELS.concat(P.MLEVELS);
for (const ton of Object.keys(P.TONALITIES)) for (const lv of levels) ok(ton + " level " + lv.id + ": 60 questions", () => {
  const rnd = P.rng(lv.id.charCodeAt(lv.id.length - 1) * 977 + ton.length);
  for (let i = 0; i < 60; i++) {
    const q = P.question(lv.id, { tonality: ton }, rnd); assert(q, "made"); assert.strictEqual(q.tonality, ton);
    const same = q.clips.filter(c => !c.odd), odd = q.clips.filter(c => c.odd);
    assert.strictEqual(same.length, 2); assert.strictEqual(odd.length, 1); assert(q.clips[q.oddIndex].odd);
    assert.deepStrictEqual(same[0].chords.map(c => c.tok), same[1].chords.map(c => c.tok));
    const d = q.base.filter((t, j) => t !== q.odd[j]).length; assert.strictEqual(d, 1, "one chord changed");
    assert.deepStrictEqual(odd[0].chords.map(c => c.tok), q.odd);
    if (!q.melodyMode) { const st = new Set(q.clips.map(c => c.style)); assert.strictEqual(st.size, 3, "three styles"); }
    q.clips.forEach(c => {
      c.chords.forEach(ch => { const h = H.parseChord(ch.sym); assert(!h.unknown && !h.nc, ch.sym);
        assert.strictEqual(h.root, ch.root, ch.sym + " root"); assert.strictEqual(h.bass, ch.bass, ch.sym + " bass"); });
      for (const abc of [P.abcPlay(c, q), q.melodyMode ? P.abcMelody(c, q, true, true) : P.abcBand(c, q, true)])
        barLens(abc).forEach(L => assert.strictEqual(L, 8, "bar of " + L + " eighths in\n" + abc));
      if (c.melody) {
        c.melody.forEach(m => assert(m.midi >= 58 && m.midi <= 83, "range " + m.midi));
        if (lv.id === "m1") c.melody.forEach(m => assert(!m.nht, "m1 chord tones only"));
        const last = c.melody[c.melody.length - 1]; assert(Math.abs(last.t + last.d - 16) < 1e-6, "4 bars");
      }
    });
  }
});
ok("level 1 triads only, level 6 has extensions somewhere", () => {
  const r = P.rng(5); let ext = false;
  for (let i = 0; i < 50; i++) { P.question("1", {}, r).clips.forEach(c => c.chords.forEach(ch => assert(/^[A-G][#b]?(m|dim)?$/.test(ch.sym), ch.sym))); }
  for (let i = 0; i < 50; i++) P.question("6", {}, r).clips.forEach(c => c.chords.forEach(ch => { if (/9|11|13/.test(ch.sym)) ext = true; }));
  assert(ext);
});
ok("higher melody levels use non-chord tones", () => {
  const r = P.rng(9), kinds = new Set();
  for (let i = 0; i < 80; i++) P.question("m5", {}, r).clips.forEach(c => c.melody.forEach(m => m.nht && kinds.add(m.nht)));
  ["P", "N", "A"].forEach(k => assert(kinds.has(k), k + " in " + [...kinds]));
});
ok("tonalities: scales, key signatures and chord spelling", () => {
  const D = P.keyInfo("D dorian"); assert.deepStrictEqual(D.sc, [0, 2, 3, 5, 7, 9, 10]); assert.strictEqual(D.abc, "Ddor");
  const E = P.keyInfo("E minor"); assert.deepStrictEqual(E.sc, [0, 2, 3, 5, 7, 8, 11]); assert.strictEqual(E.abc, "Em");
  assert.strictEqual(P.keyInfo("F lydian").parent, "C"); assert.strictEqual(P.keyInfo("B locrian").parent, "C");
  assert.strictEqual(P.chord("V", "E minor", "7").sym, "B7"); assert.strictEqual(P.chord("bII", "E phrygian", "").sym, "F");
  assert.strictEqual(P.chord("bVII", "G mixolydian", "").sym, "F"); assert.strictEqual(P.chord("II", "F lydian", "").sym, "G");
  assert.deepStrictEqual(P.keysFor("dorian"), ["D dorian", "A dorian", "E dorian", "B dorian", "G dorian", "C dorian", "F dorian"]);
  // every template chord is in the tonality's scale (its "same" chords are diatonic), harmonic minor's V and vii° included
  Object.keys(P.MODAL).forEach(t => P.keysFor(t).forEach(k => { const K = P.keyInfo(k);
    P.MODAL[t].four.concat(P.MODAL[t].eight).forEach(prog => prog.forEach(tok => { const c = P.chord(tok, k);
      // minor keys use the natural 7th too (bIII, bVII), as minor-key music does
      c.tones.forEach(x => assert(K.sc.concat(t === "minor" ? [10] : []).includes(((c.root + x - K.pc) % 12 + 12) % 12), t + " " + tok + " in " + k)); })); }));
});
ok("any tonality picks among them", () => { const r = P.rng(3), seen = new Set(); for (let i = 0; i < 80; i++) seen.add(P.question("2", { tonality: "any" }, r).tonality); assert(seen.size >= 6); });
const inKey = (q, tok) => { const K = P.keyInfo(q.key), c = P.chord(tok, q.key); return c.tones.every(x => K.sc.concat(q.tonality === "minor" ? [10] : []).includes((((c.root + x - K.pc) % 12) + 12) % 12)); };
ok("borrowed chords off (default): every odd chord is in the key, in every tonality", () => {
  const r = P.rng(21);
  for (const ton of Object.keys(P.TONALITIES)) for (const lv of ["5", "7", "8", "m5"]) for (let i = 0; i < 40; i++) {
    const q = P.question(lv, { tonality: ton }, r); assert(!q.borrowed);
    assert(inKey(q, q.odd[q.at]), ton + " " + lv + ": " + q.odd[q.at] + " in " + q.key);
  }
});
ok("borrowed chords on: level 5 in major brings in chords from outside the key", () => {
  const r = P.rng(22); let out = 0;
  for (let i = 0; i < 40; i++) { const q = P.question("5", { borrowed: true }, r); if (!inKey(q, q.odd[q.at])) out++; }
  assert(out > 30, out);
});
ok("a tune on top: the same tune in all three clips; a diatonic reharmonisation still holds the tune's chord tones; gospel 9ths turn up", () => {
  const r = P.rng(23); let diat = 0, gospel = 0;
  for (const ton of ["major", "dorian", "minor", "mixolydian"]) for (let i = 0; i < 120; i++) {
    const q = P.question(i % 2 ? "5" : "7", { tonality: ton, tune: true }, r); assert(q.shared);
    assert(q.clips[0].melody === q.clips[1].melody && q.clips[1].melody === q.clips[2].melody);
    q.clips.forEach(c => { const abc = P.abcPlay(c, q); assert(/"[A-G]/.test(abc) && !/^V:/m.test(abc)); barLens(abc).forEach(L => assert.strictEqual(L, 8, abc));
      barLens(P.abcBand(c, q, true)).forEach(L => assert.strictEqual(L, 8)); });
    if (q.diff.kind !== "diat") continue; diat++;
    const oc = q.clips[q.oddIndex].chords[q.at], pcs = oc.tones.map(x => (oc.root + x) % 12);
    q.clips[0].melody.filter(m => m.ci === q.at && !m.nht).forEach(m => assert(pcs.includes(m.midi % 12), q.diff.text + " " + oc.sym));
    if (/gospel/.test(q.diff.text)) { gospel++; assert(/add9|maj9/.test(oc.sym), oc.sym); }
  }
  assert(diat > 100, "diat " + diat); assert(gospel > 0, "gospel");
});
ok("V under so can become I, iii or IV(add9)", () => {
  const seen = new Set(), r = P.rng(4); for (let i = 0; i < 200; i++) { const x = P.reharm(["vi", "ii", "V", "vi"], 2, "C", "major", [7], r); seen.add(x.tok + (x.gospel ? "9" : "")); }
  ["I", "iii", "IV9"].forEach(t => assert(seen.has(t), [...seen].join(" ")));
  assert.strictEqual(P.syllable(7, "C"), "so"); assert.strictEqual(P.syllable(2, "D dorian"), "re");
});
console.log(n + " passed");
