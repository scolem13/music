// Chord Grid by Ear: reading a tune's chords bar by bar, and comparing chords by function.
// node tests/mlt/ear-grid.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), assert = require("assert");
const G = require(path.join(__dirname, "../../apps/shared/mlt/ear-grid.js"));
const src = fs.readFileSync(path.join(__dirname, "../../apps/tunes/tunes-object.js"), "utf8");
const tune = id => src.split(/\n(?=X:)/).find(t => new RegExp("^%%id\\s+" + id + "\\s*$", "m").test(t));
// Chew, Chew, Chew writes its chords above the staff ("^C"); 8 bars, I and V7
const chew = G.tuneBars(tune("chew-chew-chew"));
assert.deepStrictEqual(chew.bars, [["C"], ["G7"], ["C"], ["G7"], ["C"], ["G7"], ["C", "G7"], ["C", "G7", "C"]]);
// repeats played out, first ending skipped the second time, pickup not counted
const r = G.tuneBars("X:1\nM:4/4\nL:1/4\nK:G\nD |:\"G\"G2 G2|1 \"D\"A4 :|2 \"C\"c4 |\"G\"G4|]\n");
assert.strictEqual(r.pickup, true);
assert.deepStrictEqual(r.bars, [["G"], ["D"], ["G"], ["C"], ["G"]]);
const C = G.parseKey("C"), D = G.parseKey("D"), Am = G.parseKey("Am");
assert.strictEqual(G.same(G.fn("A7", D), G.fn("G7", C)), 2, "V7 in D = V7 in C");
assert.strictEqual(G.same(G.fn("V7", D), G.fn("G7", C)), 2, "Roman numeral");
assert.strictEqual(G.same(G.fn("Am", C), G.fn("A", C)), 1, "root only");
assert.strictEqual(G.same(G.fn("III", Am), G.fn("C", Am)), 2, "III in minor is the relative major");
assert.strictEqual(G.roman(G.fn("Bm", D), D), "vi");
if (process.env.NEG) assert.strictEqual(G.same(G.fn("F", C), G.fn("G", C)), 2, "NEG");
console.log("ok: ear-grid");
