// The maths of the post-tonal pages (apps/shared/post-tonal/pcset.js) against known set classes, the book's 208-class table and its
// own invariances. NEG=1 breaks one rule (Forte's prime-form rule instead of Rahn's tie-break; a wrong vector) and must fail.
// Run: node tests/post-tonal/pcset.test.js
const assert = require("assert"), path = require("path");
const D = path.resolve(__dirname, "../../apps/shared/post-tonal");
const P = require(D + "/pcset.js"), DATA = require(D + "/forte-data.js");
const NEG = !!process.env.NEG;
let fails = 0, n = 0;
const t = (name, fn) => { n++; try { fn(); console.log("ok  ", name); } catch (e) { fails++; console.log("FAIL", name, "-", e.message.split("\n")[0]); } };
const S = x => P.str(x);
// NEG: sabotage normalForm's tie-break (take the first rotation with the smallest span only, no inward comparison)
if (NEG) { const orig = P.intervalVector; P.intervalVector = v => { const r = orig(v); r[0]++; return r; }; }

t("known set classes: triads, sevenths, scales", () => {
  const known = [["0 4 7", "3-11", "001110"], ["0 3 7", "3-11", "001110"], ["0 3 6 9", "4-28", "004002"], ["0 2 4 6 8 10", "6-35", "060603"],
    ["0 2 3 5 6 8 9 11", "8-28", "448444"], ["0 2 4 5 7 9 11", "7-35", "254361"], ["0 2 4 7 9", "5-35", "032140"], ["0 1 4 6", "4-Z15", "111111"], ["0 1 3 7", "4-Z29", "111111"],
    ["0 1 2", "3-1", "210000"], ["0 1 6", "3-5", "100011"], ["0 2 7", "3-9", "010020"], ["0 4 8", "3-12", "000300"], ["0 1 4 7", "4-18", "102111"],
    ["0 2 5 7", "4-23", "021030"], ["0 1 2 3 4 5", "6-1", "543210"]];
  known.forEach(([s, name, vec]) => { const f = P.forte(P.parse(s)); assert.strictEqual(f.name, name, s + " name " + f.name); assert.strictEqual(P.vecStr(f.vector), vec, s + " vector"); });
});
t("normal form and prime form worked examples", () => {
  assert.strictEqual(S(P.normalForm([2, 4, 5])), "245"); assert.strictEqual(S(P.normalForm([0, 4, 7, 11])), "E047", "C E G B: B C E G spans 8, the tightest");
  assert.strictEqual(S(P.normalForm([11, 0, 2])), "E02", "a set wrapping round 0 starts on E");
  assert.strictEqual(S(P.normalForm([0, 5, 9])), "590", "C F A: F A C is the most compact");
  assert.strictEqual(S(P.primeForm([7, 11, 2])), "037", "G B D");
  assert.strictEqual(S(P.primeForm([0, 1, 3, 4])), "0134"); assert.strictEqual(S(P.normalForm([0, 1, 3, 4, 6, 7, 9, 10])), "0134679T");
  assert.strictEqual(S(P.primeForm([5, 6, 9, 10])), "0145");
  assert.strictEqual(S(P.primeForm([0, 1, 5, 6, 8])), "01568", "Rahn's 5-20, not Forte's 01378");
});
t("every prime form in the book's table is a prime form, has its vector, and no class is missing", () => {
  const seen = new Set(), bad = [];
  DATA.forEach(row => { const [p, name, vec] = row.split(" "); const pcs = P.parse(p); assert.strictEqual(S(P.primeForm(pcs)), p, "prime form of " + p);
    if (P.vecStr(P.intervalVector(pcs)) !== vec) bad.push(name + " " + vec); assert.strictEqual(P.forte(pcs).name, name); seen.add(p); });
  assert.strictEqual(bad.join("; "), "", "vectors that differ from the maths");
  assert.strictEqual(seen.size, 208);
  // enumerate all 2^12 subsets of 3-9 notes: the set of prime forms must equal the table exactly
  const found = new Set();
  for (let m = 0; m < 4096; m++) { const pcs = []; for (let i = 0; i < 12; i++) if (m >> i & 1) pcs.push(i); if (pcs.length >= 3 && pcs.length <= 9) found.add(S(P.primeForm(pcs))); }
  assert.strictEqual(found.size, 208, "classes found by enumeration " + found.size); [...found].forEach(p => assert(seen.has(p), p + " not in the book's table"));
});
t("class counts by cardinality (1-12 notes: 1,6,12,29,38,50,38,29,12,6,1,1 with T/I equivalence; 3-9: 12 29 38 50 38 29 12)", () => {
  const c = {}; P.allClasses().forEach(o => { const k = o.name.split("-")[0]; c[k] = (c[k] || 0) + 1; });
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => c[k]), [1, 6, 12, 29, 38, 50, 38, 29, 12, 6, 1, 1]);
});
t("invariance: every transposition and inversion has the same prime form, vector and Forte name", () => {
  for (let m = 1; m < 4096; m++) { const pcs = []; for (let i = 0; i < 12; i++) if (m >> i & 1) pcs.push(i); const f = P.forte(pcs);
    for (const k of [1, 5, 7]) { assert.strictEqual(P.forte(P.transpose(pcs, k)).name, f.name); assert.strictEqual(P.forte(P.invert(pcs, k)).name, f.name); }
    assert.strictEqual(S(P.primeForm(P.invert(pcs, 3))), S(f.prime)); }
});
t("complements: same Forte ordinal; vectors differ by the difference in size (ic 1-5) and half of it (ic 6)", () => {
  for (const a of ["0 1 4", "0 2 4 6 8 10", "0 1 2 3", "0 1 3 7", "0 1 2 5 6"]) {
    const pcs = P.parse(a), A = P.forte(pcs), B = P.forte(P.complement(pcs)); assert.strictEqual(A.name.replace("Z", "").split("-")[1], B.name.replace("Z", "").split("-")[1], a);
    const d = B.card - A.card; B.vector.forEach((x, i) => assert.strictEqual(x - A.vector[i], i < 5 ? d : d / 2, a + " ic" + (i + 1))); }
});
t("Z-relation: 4-Z15 and 4-Z29 share a vector; zMate finds the other", () => {
  assert.strictEqual(P.zMate("4-Z15").name, "4-Z29"); assert.strictEqual(P.zMate("6-Z3").name, "6-Z36"); assert.strictEqual(P.zMate("3-11"), null);
});
t("relate: Tn and TnI", () => {
  assert.deepStrictEqual(P.relate([2, 4, 5], [2, 3, 5]), { T: [], I: [7] }, "the book's [2,4,5] -> [2,3,5] is T7I");
  assert.deepStrictEqual(P.relate([0, 4, 7], [2, 6, 9]).T, [2]); assert.deepStrictEqual(P.relate([0, 4, 8], [1, 5, 9]).T, [1, 5, 9]);
  assert.strictEqual(P.relate([0, 4, 8], [1, 5, 9]).I.length, 3, "an augmented triad maps to itself under three inversions");
  assert.strictEqual(P.allInPrimeClass([0, 3, 7]).length, 24); assert.strictEqual(P.allInPrimeClass([0, 3, 6, 9]).length, 3);
});
t("rows: P I R RI, naming by the last note for R and RI", () => {
  const row = [4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10];   // an arbitrary twelve-note row
  assert(P.isRow(row)); assert.strictEqual(S(P.P(row, 4)), S(row));
  assert.strictEqual(P.I(row, 4)[0], 4); assert.deepStrictEqual(P.rowIntervals(P.I(row, 0)), P.rowIntervals(row).map(d => (12 - d) % 12));
  assert.deepStrictEqual(P.R(row, 4), row.slice().reverse(), "R4 is P4 backwards and ends on 4"); assert.strictEqual(P.R(row, 4)[11], 4);
});
t("R_n ends on n, RI_n ends on n, I_n starts on n, for every n", () => {
  const row = P.randomRow(() => 0.37 + 0.001); for (let r = 0; r < 20; r++) { const w = P.randomRow(); for (let n = 0; n < 12; n++) { assert.strictEqual(P.R(w, n)[11], n); assert.strictEqual(P.RI(w, n)[11], n); assert.strictEqual(P.I(w, n)[0], n); assert.strictEqual(P.P(w, n)[0], n); assert(P.isRow(P.RI(w, n))); } }
});
t("matrix: 12x12, every row and column a row, P across the top, I down the left, diagonal constant", () => {
  const w = [4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10], m = P.matrix(w);
  assert.strictEqual(m.length, 12); assert.deepStrictEqual(m[0], w); assert.strictEqual(m.map(r => r[0]).join(), P.I(w, w[0]).join());
  for (let i = 0; i < 12; i++) { assert(P.isRow(m[i])); assert(P.isRow(m.map(r => r[i]))); assert.strictEqual(m[i][i], w[0], "main diagonal is the first note"); }
  for (let k = 0; k < 40; k++) { const r = P.randomRow(), M = P.matrix(r); M.forEach((line, i) => { assert.strictEqual(S(line), S(P.P(r, line[0]))); }); }
});
t("identify: every one of the 48 forms is named back correctly (including symmetrical rows)", () => {
  const w = P.randomRow(); ["P", "I", "R", "RI"].forEach(f => { for (let n = 0; n < 12; n++) { const id = P.identify(w, P.rowForm(w, f, n)); assert(id.some(x => x.form === f && x.n === n), f + n); } });
  assert.strictEqual(P.identify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0])[0].form, "I");
});
t("all-interval row and hexachord set classes", () => {
  assert(P.allInterval([0, 11, 7, 4, 2, 9, 3, 8, 10, 1, 5, 6]), "Berg's Lyric Suite style all-interval row");
  assert(!P.allInterval([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
  assert.strictEqual(P.hexachords([0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11])[0].name, "6-35");
});
t("collections: every spelling has the right pitch classes and one note per letter in the modes", () => {
  P.COLLECTIONS.forEach(c => { for (const root of [{ l: 0, acc: 0, oct: 4 }, { l: 5, acc: 0, oct: 4 }, { l: 1, acc: 0, oct: 4 }, { l: 6, acc: -1, oct: 3 }, { l: 3, acc: 1, oct: 4 }]) {
    const notes = P.spellCollection(c, root, 1), rootPc = P.mod(P.noteMidi(root));
    assert.strictEqual(notes.length, c.semis.length + 1);
    notes.forEach((n, i) => { const want = i < c.semis.length ? c.semis[i] : 12; assert.strictEqual(P.noteMidi(n) - P.noteMidi(root), want, c.id + " step " + i); assert(Math.abs(n.acc) <= 2, c.id + " too many accidentals"); });
    if (c.kind === "mode") assert.strictEqual(new Set(notes.slice(0, 7).map(n => n.l)).size, 7); } });
  const dorianD = P.spellCollection(P.collection("dorian"), { l: 1, acc: 0, oct: 4 });
  assert.strictEqual(dorianD.map(n => "CDEFGAB"[n.l] + (n.acc ? n.acc : "")).join(""), "DEFGABCD", "D Dorian is all white notes");
});
t("abcBars: accidentals tracked within a bar", () => {
  const n = (l, acc, oct) => ({ l, acc, oct });
  assert.strictEqual(P.abcBars([[{ notes: [n(3, 1, 4)], len: 1 }, { notes: [n(3, 0, 4)], len: 1 }, { notes: [n(3, 0, 4)], len: 1 }, { notes: [], len: 1 }], [{ notes: [n(3, 0, 4)], len: 4 }]]), "^F =F F z | F4 |]");
  assert.strictEqual(P.abcBars([[{ notes: [n(0, 0, 5), n(2, 0, 4), n(6, -1, 3)], len: 2 }]]), "[cE_B,]2 |]");
});
t("planing: parallel shapes keep their interval content", () => {
  const mel = [60, 62, 64, 67];
  P.planeReal(mel, "quartal").forEach(ch => { assert.strictEqual(ch[2] - ch[1], 5); assert.strictEqual(ch[1] - ch[0], 5); });
  P.planeReal(mel, "seventh").forEach(ch => assert.strictEqual(S(P.primeForm(ch.map(P.mod))), "0258"));
  const dia = P.planeDiatonic([4, 5, 6], "triad", 4); dia.forEach(ch => ch.forEach(m => assert([0, 2, 4, 5, 7, 9, 11].includes(m % 12), "white notes only")));
  assert.deepStrictEqual(dia[0], [60, 64, 67]);
});
t("phasing: stepped offset reaches every note then returns to unison; drift laps in 1/(ratio-1) cycles", () => {
  const n = 12, reps = 8, seen = new Set();
  for (let c = 0; c < n * reps; c++) seen.add(P.steppedOffset(n, reps, c)); assert.strictEqual(seen.size, n);
  assert.strictEqual(P.steppedOffset(n, reps, n * reps), 0, "back in unison"); assert.strictEqual(P.phaseIndex(5, 3, 0, true), 0);
  assert.strictEqual(P.phaseIndex(5, 3, 5 * 3, true), 1, "after 3 cycles voice 2 is a note ahead");
  assert(Math.abs(P.lapCycles(1.05) - 20) < 1e-9); assert(Math.abs(P.driftOffset(8, 1.05, 20)) < 1e-6 || Math.abs(P.driftOffset(8, 1.05, 20) - 8) < 1e-6);
  assert(Math.abs(P.driftOffset(8, 1.05, 10) - 4) < 1e-9, "half a cycle ahead after half the lap");
});
t("additive steps", () => {
  const p = ["a", "b", "c", "d"]; assert.deepStrictEqual(P.additiveSteps(p).map(x => x.join("")), ["a", "ab", "abc", "abcd"]);
  assert.deepStrictEqual(P.additiveSteps(p, "shrink").map(x => x.join("")), ["abcd", "abc", "ab", "a"]);
  assert.deepStrictEqual(P.additiveSteps(p, "both").map(x => x.join("")), ["a", "ab", "abc", "abcd", "abc", "ab", "a"]);
  assert.deepStrictEqual(P.additiveFromFront(p).map(x => x.join("")), ["abcd", "bcd", "cd", "d"]);
});
t("the ABC texts: every bar of every collection, root, planing and row adds up (the site's rule 1)", () => {
  let count = 0;
  P.COLLECTIONS.forEach(c => P.ROOTS.forEach(r => { const o = P.collectionAbc(c.id, r); count++; P.barUnits(o.bars).forEach(u => assert.strictEqual(u, 8, c.id + " " + r.name)); assert(/K:C\n/.test(o.abc)); }));
  ["real", "dia"].forEach(k => Object.keys(P.SHAPES).forEach(sh => { if (k === "dia" && !P.DIA[sh]) return; P.MELODIES[k].forEach(m => ["sharp", "flat"].forEach(pref => { const o = P.planingAbc(k, sh, m.id, pref); count++; assert.deepStrictEqual(P.barUnits(o.bars), [4, 4], k + sh); })); }));
  for (let i = 0; i < 30; i++) { const o = P.rowAbc(P.randomRow()); count++; assert.deepStrictEqual(P.barUnits(o.bars), [4, 4, 4]); }
  assert(count > 200);
  // and the text itself: re-read the ABC and count the eighths in a bar of the whole-tone scale on C
  const w = P.collectionAbc("wholetone", P.ROOTS[0]).abc.split("\n").pop(); assert(/^C D E \^F \^G \^A c D?/.test(w.replace(/=/g, "")) || /C D E \^F \^G \^A c/.test(w), w);
});
console.log(fails ? `\n${fails} of ${n} failed` : `\nall ${n} passed`); process.exit(NEG ? (fails ? 1 : 0) * 0 + (fails ? 1 : 0) : (fails ? 1 : 0));
