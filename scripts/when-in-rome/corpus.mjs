// corpus.mjs — modulations from real pieces for the Modulation Finder (theory/analysed-scores/modulation-finder.qmd): short excerpts
// around the key changes in When in Rome's analyses of the Bach chorales (Craig Sapp's **kern scores, ~/Projects/corpora) and of the
// OpenScore Lieder (the MusicXML in When in Rome). Writes apps/shared/data/modulation-corpus.json, which the finder loads when asked.
//   node scripts/when-in-rome/corpus.mjs && node scripts/when-in-rome/corpus-verify.cjs
//   (WIR=~/Projects/When-in-Rome, CORPORA=~/Projects/corpora by default; the verify step needs the site rendered, for its abcjs)
//
// A key change counts when the old key lasted at least 2 bars and the new one lasts at least 2 (shorter keys are tonicizations, or an
// analyst's passing label). The excerpt: up to 2 bars before the change and 3 after, inside those two keys, renumbered from 1, the old
// key named on its first numeral. At most 2 a piece (the longest new keys). An excerpt is kept only if the analysis fits its notes:
// at 75% or more of the numerals, at least two of the chord's notes are sounding (a wrong bar number shows up as a mismatch).
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { parseKern, parseMusicXml, parseRomanText, buildPiece, separateTies, rnChord, PKEY, W, SHARPS, FLATS } from "./build.mjs";

const HOME = process.env.HOME, WIR = process.env.WIR || HOME + "/Projects/When-in-Rome", CORPORA = process.env.CORPORA || HOME + "/Projects/corpora";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = ROOT + "/apps/shared/data/modulation-corpus.json", WANT = (await import("os")).tmpdir() + "/modulation-corpus-want.json";
const MIN_BARS = 2, BEFORE = 2, AFTER = 3, PER_PIECE = 2, FIT = 0.75;
const require = (await import("module")).createRequire(import.meta.url);
require(ROOT + "/apps/shared/abc-core.js"); require(ROOT + "/apps/shared/abc-events.js"); require(ROOT + "/apps/shared/abc-nht.js");
const NHT = globalThis.AbcNHT;

// ---- the key areas of an analysis: [{ key, m, beat, i }] at each change, and the solid changes between them
function changes(rt, lastBar) {
  const areas = [];
  rt.events.forEach((e, i) => { if (e.key && (!areas.length || areas[areas.length - 1].key !== e.key)) areas.push({ key: e.key, m: e.m, beat: e.beat, i }); });
  areas.forEach((a, j) => { a.end = j + 1 < areas.length ? areas[j + 1].m : lastBar + 1; a.bars = a.end - a.m; });
  const out = [];
  for (let j = 1; j < areas.length; j++) {
    const A = areas[j - 1], B = areas[j];
    if (A.bars < MIN_BARS || B.bars < MIN_BARS || A.key === B.key) continue;
    const a = Math.max(A.m, B.m - BEFORE, 1), b = Math.min(B.end - 1, B.m + AFTER, lastBar);
    if (b <= B.m) continue;
    out.push({ from: A.key, to: B.key, a, b, at: B.m, len: B.bars });
  }
  return out.sort((x, y) => y.len - x.len).slice(0, PER_PIECE).sort((x, y) => x.a - y.a);
}

// ---- bars a..b of a parsed score, times from the start of bar a, bars renumbered from 1; ties cut at the edges
function barStart(k, n) { const b = k.bars.find(x => x.n === n); return b ? b.t : null; }
function sliceScore(k, a, b) {
  const t0 = barStart(k, a), t1 = barStart(k, b + 1) ?? k.bars[k.bars.length - 1].t; if (t0 == null) return null;
  const pk = n => n.l + "," + n.o + "," + n.a, voices = new Map();
  for (const [id, evs] of k.voices) {
    const sel = evs.filter(e => e.measure >= a && e.measure <= b && e.t >= t0 && e.t < t1).map(e => ({ ...e, t: e.t - t0, notes: e.notes.map(n => ({ ...n })) }));
    sel.forEach((e, i) => {   // a tie from before the excerpt starts here; a tie past its end stops here
      const prev = sel[i - 1], next = sel[i + 1];
      e.notes.forEach(n => {
        if ((n.tieMid || n.tieEnd) && !(prev && prev.t + prev.d === e.t && prev.notes.some(m => pk(m) === pk(n) && (m.tieStart || m.tieMid)))) { n.tieStart = n.tieMid; n.tieMid = false; n.tieEnd = false; }
      });
    });
    for (let i = sel.length - 1; i >= 0; i--) {
      const e = sel[i], next = sel[i + 1];
      e.notes.forEach(n => { if ((n.tieStart || n.tieMid) && !(next && next.notes.some(m => pk(m) === pk(n) && (m.tieMid || m.tieEnd)))) { n.tieEnd = n.tieMid; n.tieStart = false; n.tieMid = false; } });
    }
    if (sel.some(e => !e.rest)) voices.set(id, sel);
  }
  const bars = [{ t: 0, n: 1, style: "=", final: false }];
  for (let m = a; m <= b; m++) { const e = barStart(k, m + 1) ?? t1; bars.push({ t: e - t0, n: m === b ? null : m - a + 2, style: m === b ? "==" : "=", final: m === b }); }
  // the key signature in force at bar a (MusicXML records its changes); none of this if it changes inside the excerpt
  let keysig = k.keysig, key = k.key;
  if (k.ksAt && k.ksAt.length) {
    const ks = k.ksAt.filter(x => x.measure <= a).pop() || k.ksAt[0];
    if (k.ksAt.some(x => x.measure > a && x.measure <= b && x.fifths !== ks.fifths)) return null;
    const f = ks.fifths; keysig = "*k[" + (f > 0 ? SHARPS.slice(0, f).split("").map(c => c + "#").join("") : FLATS.slice(0, -f).split("").map(c => c + "-").join("")) + "]";
    key = (ks.minor ? ["a-", "e-", "b-", "f", "c", "g", "d", "a", "e", "b", "f#", "c#", "g#", "d#", "a#"] : ["C-", "G-", "D-", "A-", "E-", "B-", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"])[f + 7];
  }
  return { ...k, voices, bars, keysig, key };
}
function sliceRt(rt, a, b, fromKey) {
  const ev = rt.events.filter(e => e.m >= a && e.m <= b).map(e => ({ ...e, m: e.m - a + 1 }));
  if (!ev.length) return null;
  if (!/:/.test(ev[0].text)) ev[0] = { ...ev[0], text: PKEY(ev[0].key || fromKey) + " " + ev[0].text };
  return { events: ev, notes: [], vars: [] };
}
function excerpt(src, piece, ch, k, rt) {
  const sk = sliceScore(k, ch.a, ch.b); if (!sk || !sk.voices.size) return { why: "score" };
  const srt = sliceRt(rt, ch.a, ch.b, ch.from); if (!srt) return { why: "analysis" };
  const ids = [...sk.voices.keys()].sort((x, y) => { const [sa, la] = x.split(".").map(Number), [sb, lb] = y.split(".").map(Number); return sb - sa || lb - la; });
  if (src.xml) ids.push(...separateTies(sk));
  const [num, den] = sk.meter.split("/").map(Number);
  const bpm = src.bpm || (den === 8 && num % 3 === 0 ? 132 : den === 2 ? 60 : 72);
  const p = { id: piece.id + "-" + ch.a, score: sk, rt: srt, analyses: [["", piece.analyst]], names: src.names || {}, prefer: ids, bpm };
  let v; try { v = buildPiece(p).versions[0]; } catch (e) { if (process.env.DEBUG) console.error(p.id, e.stack.split("\n").slice(0, 3).join(" | ")); return { why: "abc: " + e.message.slice(0, 40) }; }
  if (v.misses.length) return { why: "labels not placed" };
  // the fit: sounding pitch classes at each numeral's time
  const all = [...sk.voices.values()].flat();
  let good = 0, tot = 0;
  for (const c of v.chords) {
    if (!c[1]) continue; tot++;
    const t = c[0] * W, pcs = new Set(all.filter(e => !e.rest && e.t <= t + 1e-6 && e.t + e.d > t + 1e-6).flatMap(e => e.notes.map(n => (([0, 2, 4, 5, 7, 9, 11][n.l] + n.a) % 12 + 12) % 12)));
    if (c[1].filter(x => pcs.has(x)).length >= 2) good++;
  }
  if (!tot || good / tot < FIT) return { why: "fit " + Math.round(100 * good / (tot || 1)) + "%" };
  const keysPath = v.keys.map(x => x[1]).filter((x, i, arr) => i === 0 || x !== arr[i - 1]);
  {   // the notes the excerpt should sound (start in whole notes : MIDI pitch), for corpus-verify.cjs to check against abcjs
    const want = []; for (const evs of sk.voices.values()) for (const e of evs) if (!e.rest) for (const n of e.notes) if (!n.tieMid && !n.tieEnd) want.push((e.t / W).toFixed(4) + ":" + (12 * (n.o + 1) + [0, 2, 4, 5, 7, 9, 11][n.l] + n.a));
    DUMPED[p.id] = want.sort();
  }
  return { entry: { id: p.id, book: src.key, name: src.name, head: piece.title + ", bars " + ch.a + "–" + ch.b, url: piece.url, analyst: piece.analyst,
    from: ch.from, to: ch.to, path: keysPath, bpm, keys: v.keys, chords: v.chords.map(c => [c[0], c[1]]), abc: v.abc } };
}

// ---- the sources
function header(text, field) { const m = new RegExp("^" + field + ":\\s*(.*)$", "m").exec(text); return m ? m[1].trim() : ""; }
const GH = "https://github.com/MarkGotham/When-in-Rome/tree/master/";
function chorales() {
  const dir = WIR + "/Corpus/Early_Choral/Bach,_Johann_Sebastian/Chorales";
  return fs.readdirSync(dir).filter(d => /^\d+$/.test(d)).sort().map(d => {
    const a = dir + "/" + d + "/analysis.txt", krn = CORPORA + "/craigsapp_bach-370-chorales/kern/chor" + d.padStart(3, "0") + ".krn";
    if (!fs.existsSync(a) || !fs.existsSync(krn)) return null;
    const text = fs.readFileSync(a, "utf8");
    let title = header(text, "Title");
    if (!title) try { title = JSON.parse(fs.readFileSync(dir + "/" + d + "/remote.json", "utf8")).text || ""; } catch (e) {}   // a few have no title line
    return { id: "bach-chorale-" + d, title: "Bach, “" + (title || "Chorale") + "” (Riemenschneider " + +d + ")", analyst: header(text, "Analyst") || "Dmitri Tymoczko",
      url: GH + "Corpus/Early_Choral/Bach,_Johann_Sebastian/Chorales/" + d, text, load: () => parseKern(fs.readFileSync(krn, "utf8")) };
  }).filter(Boolean);
}
function lieder() {
  const root = WIR + "/Corpus/OpenScore-LiederCorpus", out = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; if (f.isDirectory()) walk(p); else if (f.name === "analysis.txt" && fs.existsSync(d + "/score.mxl")) out.push(d); } })(root);
  return out.sort().map(d => {
    const text = fs.readFileSync(d + "/analysis.txt", "utf8"), rel = path.relative(WIR, d);
    const composer = header(text, "Composer"), parts = rel.split("/").slice(-2).map(x => x.replace(/_/g, " ").replace(/^\d+ /, ""));
    const title = header(text, "Title") || parts.join(": ");   // a few analyses have no title: the collection and song from the folders
    return { id: "lied-" + rel.split("/").slice(-3).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title: composer.split(" ").pop() + ", “" + title + "”",
      analyst: (header(text, "Analyst") || "").replace(/ via .*$/, "").replace(/^Anonymous contributor/, "an anonymous contributor") + (header(text, "Proofreader") ? ", proof-read by " + header(text, "Proofreader") : ""),
      url: GH + rel.split("/").map(encodeURIComponent).join("/"), text,
      load: () => parseMusicXml(execFileSync("unzip", ["-p", d + "/score.mxl", "*.xml", "-x", "META-INF/*"], { encoding: "utf8", maxBuffer: 64 << 20 }), { merge: false }) };
  });
}
const SOURCES = [
  { key: "chorales", name: "Bach, chorales", list: chorales, names: { "4.1": "Bass", "3.1": "Tenor", "2.1": "Alto", "1.1": "Soprano" }, bpm: 66 },
  { key: "lieder", name: "Lieder (OpenScore)", list: lieder, xml: true },
];

const all = [], report = {}, DUMPED = {};
for (const src of SOURCES) {
  const r = report[src.key] = { pieces: 0, changes: 0, kept: 0, why: {} };
  for (const piece of src.list()) {
    r.pieces++;
    let k, rt;
    try { k = piece.load(); rt = parseRomanText(piece.text); } catch (e) { r.why["read: " + e.message.slice(0, 30)] = (r.why["read: " + e.message.slice(0, 30)] || 0) + 1; continue; }
    const last = Math.max(...k.bars.filter(b => b.n != null).map(b => b.n), ...[...k.voices.values()].flat().map(e => e.measure));
    for (const ch of changes(rt, last)) {
      r.changes++;
      const x = excerpt(src, piece, ch, k, rt);
      if (x.entry) { all.push(x.entry); r.kept++; } else r.why[x.why] = (r.why[x.why] || 0) + 1;
    }
  }
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const json = JSON.stringify(all); fs.writeFileSync(OUT, json);
fs.writeFileSync(WANT, JSON.stringify(DUMPED));
console.log(JSON.stringify(report, null, 1)); console.log(all.length, "excerpts,", Math.round(json.length / 1024), "KB ->", path.relative(ROOT, OUT));
