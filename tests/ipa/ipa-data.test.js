// Checks the IPA data (apps/shared/ipa/ipa-data.js): unique symbols, positions, example format, languages, series ids.
// Run: node tests/ipa/ipa-data.test.js
const D = require("../../apps/shared/ipa/ipa-data.js");
let fails = 0; const check = (n, ok, info) => { if (!ok) { fails++; console.log("FAIL " + n + (info ? "  " + info : "")); } };
const langs = new Set(D.LANGS.map(l => l.id)), ids = new Set();
for (const s of D.SYMBOLS) {
  check("unique " + s.id, !ids.has(s.id)); ids.add(s.id);
  check("name+desc " + s.id, s.name && s.desc);
  if (s.cat === "v") check("vowel position " + s.id, s.y >= 0 && s.y <= 6 && s.c >= 0 && s.c <= 2 && (s.r === 0 || s.r === 1));
  if (s.cat === "c") check("consonant cell " + s.id, s.pl >= 0 && s.pl < D.PLACES.length && s.mn >= 0 && s.mn < D.MANNERS.length);
  for (const [l, list] of Object.entries(s.ex)) {
    check("language " + s.id + " " + l, langs.has(l));
    for (const e of list) {
      const p = e.split("|");
      check("braces " + s.id + " " + e, (e.match(/\{/g) || []).length === (e.match(/\}/g) || []).length && /\{[^}]+\}/.test(p[0]), "needs a {highlight} in the word");
      if (["hi", "mr", "ko", "ja"].includes(l)) check("gloss " + s.id + " " + e, p[1] && p[2], "native-script examples need romanisation and gloss");
    }
  }
}
for (const sr of D.SERIES) for (const row of sr.rows) for (const id of row.slice(1)) check("series symbol " + id, id === "" || ids.has(id));
// the points the chart must get right
const has = (id, l) => (D.SYMBOLS.find(s => s.id === id).ex[l] || []).length > 0;
check("Marathi has ts/dz", has("t͡s", "mr") && has("d͡z", "mr"));
check("Hindi has dental and retroflex stops", has("t̪", "hi") && has("ʈ", "hi") && has("d̪", "hi") && has("ɖ", "hi"));
check("Korean tense stops", ["p͈", "t͈", "k͈", "s͈"].every(i => has(i, "ko")));
check("French nasal and front rounded vowels", ["ɑ̃", "ɛ̃", "ɔ̃", "y", "ø", "œ"].every(i => has(i, "fr")));
check("German ç x ʏ ø ʁ", ["ç", "x", "ʏ", "ø", "ʁ"].every(i => has(i, "de")));
check("Japanese ɯ ɸ ɕ ɾ", ["ɯ", "ɸ", "ɕ", "ɾ"].every(i => has(i, "ja")));
check("Japanese has no θ, ʁ or u", !has("θ", "ja") && !has("ʁ", "ja") && !has("u", "ja"));
console.log(fails ? fails + " FAILED" : "IPA DATA OK (" + D.SYMBOLS.length + " symbols)");
process.exit(fails ? 1 : 0);
