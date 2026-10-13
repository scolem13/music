// LyricAlign: syllables, the places in a bar that take one, the drafted w: lines, and the checks.   node tests/band/lyrics/t_lyrics.js
const assert = require("assert"), fs = require("fs"), vm = require("vm"), R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
require(R + "lyric-align.js"); const L = globalThis.LyricAlign;
const kinds = (l, o, t) => L.slots(l, o, t).bars;
// ---- the places ----
assert.deepStrictEqual(kinds('"D"A>G F E | D2 z2 | F G |]'), [["note","note","note","note"], ["note"], ["note","note"]]);
assert.deepStrictEqual(kinds("D2- | D F"), [["note"], ["tie","note"]], "a tie over the barline");
assert.deepStrictEqual(kinds("D- D F"), [["note","tie","note"]]);
assert.deepStrictEqual(kinds("[CEG]2 {g}A !fermata!B [K:G] c"), [["note","note","note","note"]]);
assert.deepStrictEqual(kinds("(CDE) F"), [["note","note","note","note"]]);
assert.deepStrictEqual(kinds("(CDE) F", { slurMelisma: true }), [["note","melisma","melisma","note"]]);
assert.deepStrictEqual(kinds("(3CDE F |1 G :|2 A |]"), [["note","note","note","note"], ["note"], ["note"]]);
assert.deepStrictEqual(L.slots("D F", {}, true).bars, [["tie","note"]], "a tie carried in from the line before");
// ---- syllables without the dictionary: vowels ----
assert.deepStrictEqual(L.splitWord("time").pieces, ["time"]); assert.deepStrictEqual(L.splitWord("little").pieces, ["lit","tle"]);
assert.deepStrictEqual(L.splitWord("walked").pieces, ["walked"]); assert.strictEqual(L.splitWord("wanted").pieces.length, 2);
// ---- with it ----
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(R + "syllables-en.js", "utf8"), ctx); L.adopt(ctx.window.SyllablesEN);
assert.deepStrictEqual(L.splitWord("Jerusalem"), { pieces: ["Je","ru","sa","lem"], how: "dict" });
assert.strictEqual(L.splitWord("revolutionaries").pieces.length, 6); assert.deepStrictEqual(L.splitWord("fire").pieces, ["fire"]);
assert.deepStrictEqual(L.splitWord("enemy's").pieces.join("-"), "en-e-my's");
L.setOverrides({ fire: "fi-re", holy: "nope" });
assert.deepStrictEqual(L.splitWord("Fire"), { pieces: ["Fi","re"], how: "override" }); assert.strictEqual(L.splitWord("holy").how, "dict", "an override that does not spell the word is ignored");
L.setOverrides({});
assert.deepStrictEqual(L.syllabify('"Now Fa-la, dead!" — 12'), [['"Now', false], ["Fa", true], ["la,", false], ['dead!"', false]]);
// ---- a draft ----
let d = L.draft(['"D"A>G F E | "G"D2- D z | "A7"F G A B |]'], ["Deck the halls with boughs of holly now", "Fa-la la"]);
assert.deepStrictEqual(d.lines, ["w: Deck the halls with | boughs * | of hol-ly now"]); assert(/3 syllables left over/.test(d.notes[0]), d.notes[0]);
d = L.draft(["A B c d | e2 f g |", "A B c d |]"], ["See the blazing Yule before", "us fa la la"]);          // as many lines of words as of music: line by line
assert.deepStrictEqual(d.lines, ["w: See the blaz-ing | Yule be-fore", "w: us fa la la"]); assert.deepStrictEqual(d.notes, []);
d = L.draft(["A B c d | e2 f g |", "z4 |", "A B c d |]"], ["one two three", "four five six seven"]);
assert.deepStrictEqual(d.lines, ["w: one two three *", "", "w: four five six sev-"], "a line of rests takes no words; a miscount stays in its own line"); assert.strictEqual(d.notes.length, 2);
assert.deepStrictEqual(L.draft(["A B |"], []).lines, [""], "no words, no w: line");
// ---- checks ----
assert.deepStrictEqual(L.check(["A B c d | e2 f g |"], ["w: a b c d e | f g h"]), ["line 1, bar 1: 5 syllables for 4 notes"]);
assert.deepStrictEqual(L.check(["A B c d | e2 f g |"], ["w: See the blaz-ing | Yule be-fore"]), []);
assert.deepStrictEqual(L.check(["A B c d | e2 f g |"], ["w: a b | c"]), [], "too few is allowed");
assert.deepStrictEqual(L.check(["A B c d |"], ["w: now_ Fa la la"]), ["line 1, bar 1: 5 syllables for 4 notes"], "a held syllable takes a note more");
assert.deepStrictEqual(L.check(["A B c d |"], ["w: now_ _ la"]), []);
assert.strictEqual(L.sungText("w: Deck the halls with | boughs * | of hol-ly now"), "Deck the halls with boughs of holly now");
assert.strictEqual(L.sungText("w: ho- | ly night_ _"), "holy night");
assert.strictEqual(L.differs(["w: Deck the hals"], ["Deck the [D]halls".replace(/\[[^\]]*\]/g, "")]) !== null, true);
assert.strictEqual(L.differs(["w: Deck the halls", "w: with boughs"], ["Deck the halls with boughs"]), null);
console.log("LYRICS OK");
