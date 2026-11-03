// theme-romantext.mjs — Roman-numeral analyses (When in Rome RomanText) for the Classical Themes whose piece has one.
//   node scripts/theme-romantext.mjs [--report]       (WIR=... to move the corpus; default ~/Projects/When-in-Rome; FIT=0.75)
// Writes apps/themes/themes-rn.js: window.THEME_RN = { "<theme id>": { len, src, at: [[offset, "label"], …] } }
//   offset = character offset in the theme's `body` (themes-data.js) of the note the chord starts on; len = body.length when built,
//   so the page ignores an entry whose body has since changed. label = RomanText prettified, with the key before it where it changes.
// How a theme finds its analysis: composer + catalogue (Op. N, No. M / K. N / BWV N) + movement, read from the analysis's folders
// and the theme's title. The theme's bar (t.bar, the PDMX match; bar 1 when unknown) then gives each of its bars a movement bar, and
// the match is kept only if the theme's notes agree with the chords there (fit: share of the notes that are tones of the chord in
// force; a step from one counts 0.4). A theme with a sourced bar needs only KNOWN; with no bar (bar 1 assumed) it must beat every
// other starting bar by LIFT. --report lists every candidate: id, fit, best wrong-bar fit.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { parseRomanText, rnChord } from "./when-in-rome/build.mjs";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const WIR = (process.env.WIR || process.env.HOME + "/Projects/When-in-Rome") + "/Corpus";
globalThis.window = globalThis; globalThis.CLASSICAL_THEMES = undefined;
require(ROOT + "/apps/themes/themes-data.js");
const T = globalThis.CLASSICAL_THEMES;
const AbcEvents = require(ROOT + "/apps/shared/abc-events.js"); require(ROOT + "/apps/shared/abc-nht.js");
const AbcNHT = globalThis.AbcNHT;
const REPORT = process.argv.includes("--report"), SHIFT = process.argv.includes("--shift"), FIT = +(process.env.FIT || 0.7), KNOWN = +(process.env.KNOWN || 0.6), LIFT = +(process.env.LIFT || 0.05);
const read = f => fs.readFileSync(f, "utf8");
const strip = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---- the analyses: every folder holding an analysis.txt
const found = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(d + "/" + e.name);
    else if (e.name === "analysis.txt") found.push(d);
  }
})(WIR);
const catKeys = s => {   // catalogue tokens in a folder name -> normalised keys
  const out = []; let m;
  if ((m = /\bOp\.?\s*0*(\d+)(?:[_ ,]*No\.?\s*0*(\d+))?/i.exec(s))) out.push("op" + m[1] + (m[2] ? "no" + m[2] : ""));
  if ((m = /\bK\.?\s*0*(\d+)/.exec(s))) out.push("k" + m[1]);
  if ((m = /BWV\.?\s*(\d+)/i.exec(s))) out.push("bwv" + m[1]);
  return out;
};
const entries = found.map(dir => {
  const rel = path.relative(WIR, dir).split("/"), comp = strip(rel[1].split(",")[0]);
  const parts = rel.slice(2), cats = new Set(), tail = parts[parts.length - 1] || "";
  parts.slice(0, -1).forEach(p => catKeys(p).forEach(k => cats.add(k)));
  catKeys(tail).forEach(k => cats.add(k));
  const num = /^0*(\d+)(_fugue)?$/.exec(tail);
  let mvt = null, piece = null;
  if (num) {
    if (/Well-Tempered_Clavier/.test(rel.join("/"))) {
      cats.add("bwv" + ((/Clavier_II/.test(rel.join("/")) ? 870 : 846) + +num[1] - 1)); piece = num[2] ? "fugue" : "prelude";
    } else {
      mvt = +num[1];
      for (const k of [...cats]) if (/^op\d+$/.test(k) && parts.length >= 2) cats.add(k + "no" + mvt);   // Op. 10 études, Op. 28 preludes: the number is the piece
    }
  }
  return { dir, rel, comp, cats: [...cats], mvt, piece };
});
// ---- the themes
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
const themeKey = t => {
  const cats = new Set(catKeys(t.cat || ""));
  let mvt = null, m;
  if ((m = /\b(\d)(?:st|nd|rd|th)\s+Movement/i.exec(t.title))) mvt = +m[1];
  else if ((m = /\b(first|second|third|fourth|fifth)\s+Movement/i.exec(t.title))) mvt = ORD[m[1].toLowerCase()];
  const piece = /\bFugue\b/i.test(t.title) ? "fugue" : /\bPrelude\b/i.test(t.title) ? "prelude" : null;
  return { comp: strip(t.last), cats: [...cats], mvt, piece };
};
const matchOf = t => {
  const k = themeKey(t);
  return entries.filter(e => e.comp === k.comp && e.cats.some(c => k.cats.includes(c)) &&
    (e.piece ? e.piece === k.piece : (e.mvt == null) === (k.mvt == null) ? (e.mvt == null || e.mvt === k.mvt) : e.mvt != null && k.mvt == null && false));
};

// ---- fit
const beatQ = ms => { const [n, d] = ms.split("/").map(Number); return d === 8 && n % 3 === 0 && n > 3 ? 1.5 : 4 / d; };
const meterQ = ms => { const [n, d] = ms.split("/").map(Number); return n * 4 / d; };
const cache = new Map();
const rtOf = f => cache.get(f) || (cache.set(f, parseRomanText(read(f))), cache.get(f));
function analyse(t, file, shift = 0) {
  const abc = "M:" + t.meter + "\nL:" + t.unit + "\nK:" + t.key + "\n" + t.body + "\n", off = abc.length - t.body.length;
  const ev = AbcEvents.fromAbc(abc), written = ev.written.filter(e => e.kind === "note");
  if (!written.length) return null;
  const barQ = ev.barQuarters || meterQ(t.meter), bt = beatQ(t.meter), starts = [];
  ev.written.forEach(e => { if (starts[e.bar] === undefined || e.t_on < starts[e.bar]) starts[e.bar] = e.t_on; });
  const lastEnd = Math.max(...ev.written.filter(e => e.bar === 0).map(e => e.t_off));
  const pick = starts.length > 1 && lastEnd < barQ - 1e-6 ? 1 : 0, start = (t.bar || 1) + shift;
  const rt = rtOf(file), byBar = new Map();
  rt.events.forEach(e => { if (!byBar.has(e.m)) byBar.set(e.m, []); byBar.get(e.m).push(e); });
  const chordAt = (bar, q) => {
    let best = null;
    for (const e of byBar.get(bar) || []) if ((e.beat - 1) * bt <= q + 1e-6) best = e;
    if (best) return best;
    for (let b = bar - 1; b >= bar - 4; b--) { const l = byBar.get(b); if (l && l.length) return l[l.length - 1]; }
    return null;
  };
  const pcsOf = c => { if (!c || !c.key) return null; const n = rnChord(c.raw, c.key); if (!n) return null; const r = AbcNHT.chordPcs(n); return r && r.pcs; };
  let n = 0, ok = 0, last = null; const at = [];
  for (const e of written) {
    const k = e.bar, q = e.t_on - (starts[k] || 0), bar = start + k - pick;
    const c = chordAt(bar, q); if (!c) continue;
    const p = pcsOf(c), midi = e.pitches && e.pitches[0] && e.pitches[0].midi; if (midi == null) continue;
    const pc = ((midi % 12) + 12) % 12; n++;
    if (p) { const ds = p.map(x => (pc - x + 12) % 12); if (ds.includes(0)) ok++; else if (ds.some(d => d === 1 || d === 2 || d === 10 || d === 11)) ok += 0.4; }
    if (c !== last) { at.push([e.i, c.text]); last = c; }
  }
  return { fit: n ? ok / n : 0, n, at };
}

const out = {}, report = [];
for (const t of T) {
  if (!t.body) continue;
  const cands = matchOf(t); if (!cands.length) continue;
  let best = null;
  for (const e of cands) {
    let r; try { r = analyse(t, e.dir + "/analysis.txt", SHIFT ? 3 : 0); } catch (x) { console.error(t.id, x.message); continue; }
    if (r && (!best || r.fit > best.r.fit)) best = { e, r };
  }
  if (!best) continue;
  let wrong = 0;   // the same notes against the same analysis 1-3 bars off either way: a right alignment must beat these
  const maxBar = Math.max(...rtOf(best.e.dir + "/analysis.txt").events.map(e => e.m)), shifts = t.bar ? [-3, -2, -1, 1, 2, 3] : Array.from({ length: maxBar }, (_, i) => i).filter(d => d > 0);
  for (const d of shifts) { let r; try { r = analyse(t, best.e.dir + "/analysis.txt", d); } catch (x) { continue; } if (r) wrong = Math.max(wrong, r.fit); }
  best.r.lift = best.r.fit - wrong;
  report.push([t.id, t.last, t.title.slice(0, 48), t.bar || "-", best.e.rel.slice(1).join("/"), best.r.fit.toFixed(2), wrong.toFixed(2), best.r.n, best.r.at.length]);
  if (best.r.at.length && (t.bar ? best.r.fit >= KNOWN : best.r.fit >= FIT && best.r.lift >= LIFT)) out[t.id] = { len: t.body.length, src: best.e.rel.slice(1).join("/"), at: best.r.at };
}
if (REPORT) { report.sort((a, b) => a[5] - b[5]); console.log(report.map(r => r.join(" | ")).join("\n")); }
console.log(`${report.length} themes have an analysis of their piece; ${Object.keys(out).length} kept (fit >= ${FIT}, beating a bar off by ${LIFT})`);
if (!REPORT) fs.writeFileSync(ROOT + "/apps/themes/themes-rn.js", "// Generated by scripts/theme-romantext.mjs. Do not edit.\nwindow.THEME_RN = " + JSON.stringify(out) + ";\n");
