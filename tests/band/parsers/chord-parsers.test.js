// Feeds the same chord symbols to the site's chord parsers and lists where they disagree.
//   Chord Sheet  parseChordToken (tools/_chord-sheet.qmd, read out of the page, with its DATA table)
//   Band         BandHarmony.parseChord (apps/shared/band/harmony.js)
//   Arranger     Arranger.chordMidis (apps/shared/arranger.js, the old Accompaniment Styles page)
// Each is reduced to the same facts: third (3, 4 or none), fifth (6, 7, 8 or none), seventh (9, 10, 11 or none).
// `node tests/band/parsers/chord-parsers.test.js`   prints every disagreement ("known" ones are design differences, not bugs)
// and fails (exit 1) only on a disagreement not on the KNOWN list below.   NEG=1 must fail (adds a deliberately wrong list entry).
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "../../..");
global.window = undefined;
vm.runInThisContext(fs.readFileSync(ROOT + "/apps/shared/band/harmony.js", "utf8"), { filename: "harmony.js" });
vm.runInThisContext(fs.readFileSync(ROOT + "/apps/shared/arranger.js", "utf8"), { filename: "arranger.js" });

// --- Chord Sheet: cut the pieces out of the page so the test reads the real code
const qmd = fs.readFileSync(ROOT + "/tools/_chord-sheet.qmd", "utf8");
function between(a, b){ const i = qmd.indexOf(a); const j = qmd.indexOf(b, i); if (i < 0 || j < 0) throw new Error("page layout changed: " + a); return qmd.slice(i, j); }
const dataSrc = between("const DATA = {", "\n};\n") + "\n};\n";
const sheetSrc = [dataSrc, "const LETTER_IDX  = {C:0,D:1,E:2,F:3,G:4,A:5,B:6};", "const LETTER_PC   = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};",
  between("function mod12", "function getRootOption"), between("function accidentalStr", "function accidentalWeight"),
  between("function parseNote", "function accidentalWeight"), between("const SYMBOL_MAP", "// ===== TYPED ROOT")].join("\n");
const sheet = new Function(sheetSrc + "\nreturn { parseChordToken, DATA };")();
const sheetIv = {}; sheet.DATA.chordGroups.forEach(g => g.items.forEach(i => sheetIv[i.id] = i.intervals));

function facts(ivs){
  const s = new Set(ivs.filter(v => v >= 0 && v < 12));          // 9ths, 11ths and 13ths (14, 17, 21) are not the third, fifth or seventh
  const third = s.has(3) ? 3 : s.has(4) ? 4 : null, fifth = s.has(6) ? 6 : s.has(8) ? 8 : s.has(7) ? 7 : null;
  return { third, fifth, seventh: s.has(11) ? 11 : s.has(10) ? 10 : (third === 3 && fifth === 6 && s.has(9)) ? 9 : null };
}
function viaSheet(sym){ const p = sheet.parseChordToken(sym); if (!p) return null; return { root: p.rootPc, ...facts(sheetIv[p.chordId]) }; }
function viaBand(sym){ const c = BandHarmony.parseChord(sym, 0); if (!c || c.nc || c.unknown) return null;
  return { root: c.root, third: c.third == null ? null : c.third, fifth: c.fifth == null ? null : c.fifth, seventh: c.seventh == null ? null : c.seventh }; }
function viaArranger(sym){ const m = Arranger.chordMidis(sym, 0); if (!m) return null;
  const v = m.voicing.map(x => x % 12), r = m.bass % 12; return { root: r, ...facts(v.map(x => (x - r + 12) % 12)) }; }

const SYMS = ["C", "Cm", "Cmaj7", "CM7", "C7", "Cm7", "Cdim", "Cdim7", "Cm7b5", "Cø", "C°", "Caug", "C+", "Csus4", "Csus2", "C5", "C6", "Cm6",
  "Cmaj9", "C9", "Cm9", "C11", "C13", "Cadd9", "C7sus4", "C7b9", "C7#9", "C7b5", "C7#5", "CmMaj7", "CΔ", "Bb", "F#m7", "Ebmaj7", "Abm", "C/E", "Dm7/G"]
  .filter(s => !/\//.test(s));       // slash basses: each parser's bass is outside this comparison
// Disagreements that are on purpose or out of scope: key = "symbol|parser|field". Anything else fails the test.
const KNOWN = new Set([
  "C5|third: sheet=null band=null arranger=4",       // the Arranger (old Accompaniment Styles) has only triads: a power chord keeps its third
  "C11|third: sheet=4 band=null arranger=4",        // the band plays C11 as C9sus4 on purpose (harmony.js); the Chord Sheet spells the full chord
]);
const parsers = { sheet: viaSheet, band: viaBand, arranger: viaArranger };
const names = Object.keys(parsers), bad = [], known = [];
for (const s of SYMS){
  const r = {}; names.forEach(n => { try { r[n] = parsers[n](s); } catch (e) { r[n] = { error: e.message }; } });
  const rows = names.filter(n => r[n] === null).map(n => n + " does not parse it");
  const live = names.filter(n => r[n] && !r[n].error);
  for (const f of ["root", "third", "fifth", "seventh"]){
    const vals = live.map(n => r[n][f]);
    if (new Set(vals).size > 1) rows.push(f + ": " + live.map((n, i) => n + "=" + vals[i]).join(" "));
  }
  rows.forEach(t => { const k = s + "|" + t; (KNOWN.has(k) ? known : bad).push(s.padEnd(8) + t); });
}
if (process.env.NEG) bad.push("NEG: deliberate");
console.log("symbols " + SYMS.length + ", disagreements " + bad.length + " (+" + known.length + " known)");
bad.forEach(l => console.log("  " + l));
if (process.argv.includes("--list")) known.forEach(l => console.log("  known " + l));
if (bad.length){ console.log("DISAGREE"); process.exit(1); }
console.log("PARSERS OK");
