// stats.mjs — a meta-analysis of every RomanText analysis in When in Rome: which chords each repertoire uses, what follows what,
// how often the chromatic chords of Hutchinson chs. 17-22 appear and where, and where the music modulates to.
//   node scripts/when-in-rome/stats.mjs            writes apps/shared/data/rn-stats.json (read by theory/analysed-scores/harmony-stats.qmd)
//   node scripts/when-in-rome/stats.mjs --print    also prints the tables
// One analysis per piece (analysis.txt first, then the others in the order of PREF), so a movement with three analysts counts once.
// Textbook examples (When in Rome's Textbooks folder) are left out of the style tables: they are written to show a chord, not a style.
// "Repertoire" groups pieces by composer and genre (GROUPS); a piece in no group still counts in "All".
// Every count is of chord labels, not of time: a chord held for a bar and one lasting an eighth count the same.
import fs from "fs";
import path from "path";
import { parseRomanText } from "./build.mjs";

const HOME = process.env.HOME, WIR = (process.env.WIR || HOME + "/Projects/When-in-Rome") + "/Corpus";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), OUT = ROOT + "/apps/shared/data/rn-stats.json";
const PREF = ["analysis.txt", "analysis_DCML.txt", "analysis_BPS.txt", "analysis_DT.txt", "analysis_BCMH.txt"];
const GROUPS = [   // [name, test on "Collection/Composer", era for ordering]
  ["Renaissance (Monteverdi, Goudimel)", p => /Early_Choral\/(Monteverdi|Goudimel)/.test(p)],
  ["Bach chorales", p => /Early_Choral\/Bach/.test(p)],
  ["Baroque instrumental (Corelli, Bach, Purcell)", p => /Chamber_Other\/Corelli|Keyboard_Other\/Bach|Variations_and_Grounds\/(Purcell|Bach)/.test(p)],
  ["Classical (Mozart, Haydn)", p => /\/(Mozart|Haydn)/.test(p)],
  ["Beethoven", p => /\/Beethoven/.test(p)],
  ["Romantic songs (Lieder)", p => /OpenScore-LiederCorpus/.test(p)],
  ["Romantic piano (Chopin, Grieg, Schumann, Liszt …)", p => /Keyboard_Other\/(?!Bach)/.test(p)],
];

// ---- a RomanText chord token -> its parts
const NUM = /^(#{1,2}|b{1,2}|-)?(N|It|Fr|Ger|Cad|[ivIV]+)(o|ø|\+|%|\/o)?/;
function parse(raw) {
  // figures written with a slash (V6/5, ii4/3, viio4/2) are figures, not an applied chord; Cad64 is a cadential six-four
  const t = raw.replace(/\[[^\]]*\]/g, "").replace(/^\(|\)$/g, "").replace(/(\d)\/(\d)/g, "$1$2").replace(/^Cad6?4?/, "Cad");
  const [main, ...over] = splitApplied(t);
  const m = NUM.exec(main); if (!m) return null;
  const acc = (m[1] || "").replace("-", "b"), num = m[2], qual = (m[3] || "").replace("/o", "ø").replace("%", "ø");
  const fig = main.slice(m[0].length).replace(/[^0-9]/g, "");
  const seventh = /^(7|65|43|42|2)$/.test(fig) || /7/.test(fig) && !/64/.test(fig);
  const inv = { "": 0, "5": 0, "53": 0, "7": 0, "6": 1, "63": 1, "65": 1, "64": 2, "43": 2, "42": 3, "2": 3 }[fig] ?? 0;
  const target = over.join("/") || null;
  return { raw, acc, num, qual, seventh, inv, target, base: acc + num + qual + (seventh ? "7" : "") };
}
function splitApplied(t) {   // "viio/o7/V" style half-diminished marks are not applied chords: V/V, viio7/ii, V65/V/vi
  const parts = t.replace(/\/o(?=\d|\/|$)/g, "ø").split("/");
  return [parts[0], ...parts.slice(1)];
}
const isApplied = c => !!c.target && /^(#|b)?[ivIV]+$/.test(c.target.split("/")[0]);
const KIND = c => {   // which chapter's chord this is (Hutchinson, Music Theory for the 21st-Century Classroom)
  if (!c) return null;
  if (/^(It|Fr|Ger)$/.test(c.num)) return "aug6";
  if (c.num === "N" || (c.acc === "b" && c.num === "II")) return "neapolitan";
  if (isApplied(c)) return c.num === "V" ? "applied-V" : c.num === "vii" ? "applied-viio" : null;   // I/V, ii/V … are chords inside a tonicized key, not applied chords
  if (c.num === "Cad") return "cad64";
  return null;
};
const MIXTURE_IN_MAJOR = c => !c.target && (["iv", "i", "v"].includes(c.num) && !c.acc && !c.qual
  || ["bVI", "bIII", "bVII"].includes(c.acc + c.num) || c.num === "ii" && /o|ø/.test(c.qual) || c.num === "vii" && c.qual === "o" && c.seventh);
const label = c => (c.num === "Cad" ? "Cad64" : c.base) + (c.target ? "/" + c.target : "");

// ---- keys: the interval from one key to the next, as a relation students learn (V, IV, vi, relative minor …)
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = k => (PC[k[0].toUpperCase()] + (k.slice(1).match(/#/g) || []).length - (k.slice(1).match(/[b-]/g) || []).length + 120) % 12;
const isMinor = k => k[0] === k[0].toLowerCase();
const REL_MAJ = ["I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII"];
function relation(from, to) {   // as a Roman numeral of the old key: "V", "vi", "III" (relative major of a minor key) …
  const d = (pcOf(to) - pcOf(from) + 12) % 12, n = REL_MAJ[d].replace(/[IV]+/, x => isMinor(to) ? x.toLowerCase() : x);
  if (isMinor(from)) return n.replace(/^♭III$/, "III").replace(/^♭VI$/, "VI").replace(/^♭VII$/, "VII");   // in minor, III / VI / VII are diatonic
  return n;
}

// ---- read every piece
const pieces = [];
(function walk(d) {
  const files = fs.readdirSync(d, { withFileTypes: true });
  const an = PREF.find(f => files.some(x => x.isFile() && x.name === f)) || files.find(x => x.isFile() && /^analysis.*\.txt$/.test(x.name))?.name;
  if (an) { pieces.push({ dir: d, file: an }); return; }
  files.filter(x => x.isDirectory() && !/^(Working|\.)/.test(x.name)).forEach(x => walk(d + "/" + x.name));
})(WIR);

// a readable name: the analysis's Title when it is words, otherwise built from the folders (Op031_No2/2 -> Op. 31 No. 2, movement 2)
function titleOf(rel, text) {
  const t = ((/^Title:\s*(.*)$/m.exec(text) || [])[1] || "").replace(/\s*- None: None\s*$/, "").trim();
  if (/[a-z]{4,}\s+\S/i.test(t) && !/^(K\d|op\d|Op\d|\d)/.test(t)) return t;
  const parts = rel.split("/").slice(2), mv = /^\d+$/.test(parts[parts.length - 1]) ? parts.pop() : null;
  const name = parts.join(" ").replace(/_/g, " ").replace(/^Op0*(\d+)/i, "Op. $1").replace(/\bNo0*(\d+)/, "No. $1").replace(/^op0*(\d+)n0*(\d+)/, "Op. $1 No. $2").replace(/^K(\d)/, "K. $1");
  const genre = { Piano_Sonatas: "Piano Sonata", Quartets: "String Quartet" }[rel.split("/")[0]];
  return (genre && !/sonata|quartet/i.test(name) ? genre + ", " : "") + name + (mv ? ", movement " + mv : "");
}
const bundled = (() => { try { return new Set(JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/scores/index.json", "utf8")).map(p => p.id)); } catch (e) { return new Set(); } })();
function libraryId(rel) {   // the bundle's id for a piece, if it is in the library
  let m;
  if ((m = /Early_Choral\/Bach,_Johann_Sebastian\/Chorales\/(\d+)$/.exec(rel))) return "bach-chorale-" + m[1];
  if ((m = /Keyboard_Other\/Bach,_Johann_Sebastian\/The_Well-Tempered_Clavier_I\/(\d+)$/.exec(rel))) return "bach-wtc1-prelude-" + +m[1];
  if (/^OpenScore-LiederCorpus\//.test(rel)) return "lied-" + rel.split("/").slice(1).join("-").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");   // as bundle.mjs names them
  if ((m = /Piano_Sonatas\/(Beethoven|Mozart)[^/]*\/([^/]+)\/(\d+)$/.exec(rel))) {
    let meta = {}; try { meta = JSON.parse(fs.readFileSync(WIR + "/" + rel + "/remote.json", "utf8")); } catch (e) {}
    return meta.sonata_number ? `${m[1].toLowerCase()}-sonata-${meta.sonata_number}-${m[3]}` : null;
  }
  return null;
}

const groupNames = ["All", ...GROUPS.map(g => g[0])];
const blank = () => ({ pieces: 0, chords: 0, bars: 0, maj: {}, min: {}, kinds: { "applied-V": 0, "applied-viio": 0, mixture: 0, neapolitan: 0, aug6: 0, cad64: 0 },
  next: {}, mods: 0, dest: {}, sevenths: 0 });
const G = Object.fromEntries(groupNames.map(n => [n, blank()]));
const EXAMPLES = { "applied-V": [], "applied-viio": [], mixture: [], neapolitan: [], aug6: [], cad64: [] };
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
let skippedTokens = 0, total = 0;

for (const p of pieces) {
  const rel = path.relative(WIR, p.dir), text = fs.readFileSync(p.dir + "/" + p.file, "utf8");
  if (/^Textbooks\//.test(rel)) continue;
  const rt = parseRomanText(text); if (!rt.events.length) continue;
  const groups = ["All", ...GROUPS.filter(g => g[1](rel)).map(g => g[0])];
  const title = titleOf(rel, text);
  const composer = rel.split("/")[1].replace(/_/g, " ").replace(/,\s*/, ", ");
  const lib = libraryId(rel), inLib = lib && bundled.has(lib) ? lib : null;
  const lastBar = rt.events[rt.events.length - 1].m;
  groups.forEach(g => { G[g].pieces++; G[g].bars += lastBar; });
  let prev = null, prevKey = null; const found = {};
  rt.events.forEach((e, i) => {
    const c = parse(e.raw); total++;
    if (!c) { skippedTokens++; return; }
    const minor = e.key ? isMinor(e.key) : false, lab = label(c);
    let kind = KIND(c); if (!kind && !minor && MIXTURE_IN_MAJOR(c)) kind = "mixture";
    if (kind === null && c.num === "I" && c.inv === 2 && rt.events[i + 1] && /^V(?!\/)/.test(rt.events[i + 1].raw.replace(/\[[^\]]*\]/g, ""))) kind = "cad64";   // I64 V
    groups.forEach(g => {
      const S = G[g]; S.chords++; if (c.seventh) S.sevenths++;
      inc(minor ? S.min : S.maj, lab);
      if (kind) S.kinds[kind]++;
      // the next different chord in the same key: ii -> ii6 is the same chord re-voiced, not a move
      if (prev && prevKey === e.key && !(c.base === prev && !c.target)) { const k = (minor ? "min:" : "maj:") + prev; S.next[k] = S.next[k] || {}; inc(S.next[k], c.target ? "applied" : c.base); }
      if (prevKey && e.key && prevKey !== e.key) { S.mods++; inc(S.dest, (isMinor(prevKey) ? "from minor: " : "from major: ") + relation(prevKey, e.key)); }
    });
    if (kind) { if (!found[kind]) found[kind] = { m: e.m, chord: e.text.replace(/\[[^\]]*\]/g, ""), n: 0 }; found[kind].n++; }
    prev = c.target ? null : c.base; prevKey = e.key || prevKey;
  });
  const grp = (GROUPS.find(g => g[1](rel)) || ["Other"])[0];
  Object.entries(found).forEach(([k, f]) => EXAMPLES[k].push({ title, composer, rel, lib: inLib, m: f.m, chord: f.chord, n: f.n, per100: +(100 * f.n / rt.events.length).toFixed(1), group: grp }));
}

// ---- tables
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const out = { made: new Date().toISOString().slice(0, 10), pieces: G.All.pieces, chords: G.All.chords, unread: skippedTokens, groups: {} };
for (const n of groupNames) {
  const S = G[n], per100 = x => +(100 * x / S.chords).toFixed(2);
  const nextOf = {};
  for (const [k, v] of Object.entries(S.next)) { const sum = Object.values(v).reduce((a, b) => a + b, 0); if (sum >= 30) nextOf[k] = { n: sum, to: top(v, 5).map(([c, x]) => [c, +(100 * x / sum).toFixed(1)]) }; }
  out.groups[n] = { pieces: S.pieces, chords: S.chords, bars: S.bars, sevenths: per100(S.sevenths),
    major: top(S.maj, 15).map(([c, x]) => [c, per100(x)]), minor: top(S.min, 15).map(([c, x]) => [c, per100(x)]),
    kinds: Object.fromEntries(Object.entries(S.kinds).map(([k, x]) => [k, per100(x)])),
    modsPer100Bars: +(100 * S.mods / Math.max(1, S.bars)).toFixed(2), dest: top(S.dest, 10), nextOf };
}
// examples, at most 40 per kind: taken in turn from each repertoire, and within one the pieces where the chord is most frequent
// (per 100 chords; at least 2 of them), those in the library (they open on the site) first
for (const k of Object.keys(EXAMPLES)) {
  const by = {}; EXAMPLES[k].filter(x => x.n >= 2).sort((a, b) => (!!b.lib - !!a.lib) || b.per100 - a.per100).forEach(x => (by[x.group] = by[x.group] || []).push(x));
  const lists = Object.values(by), pick = [];
  for (let i = 0; pick.length < 40 && lists.some(l => l.length > i); i++) lists.forEach(l => { if (l[i] && pick.length < 40) pick.push(l[i]); });
  EXAMPLES[k] = pick;
}
out.examples = EXAMPLES;
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`${out.pieces} pieces, ${out.chords} chords (${skippedTokens} labels unread), ${Math.round(fs.statSync(OUT).size / 1024)} KB -> ${path.relative(ROOT, OUT)}`);
if (process.argv.includes("--print")) for (const n of groupNames) {
  const g = out.groups[n];
  console.log(`\n== ${n}: ${g.pieces} pieces, ${g.chords} chords, sevenths ${g.sevenths}%, key changes per 100 bars ${g.modsPer100Bars}`);
  console.log("  major:", g.major.slice(0, 10).map(x => x.join(" ")).join(", "));
  console.log("  minor:", g.minor.slice(0, 10).map(x => x.join(" ")).join(", "));
  console.log("  per 100 chords:", Object.entries(g.kinds).map(x => x.join(" ")).join(", "));
  console.log("  keys go to:", g.dest.slice(0, 6).map(x => x.join(" ")).join(", "));
  ["maj:ii", "maj:IV", "maj:vi", "maj:V"].forEach(k => g.nextOf[k] && console.log(`  after ${k}:`, g.nextOf[k].to.map(x => x.join(" ")).join(", ")));
}
