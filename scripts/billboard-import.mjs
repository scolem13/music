// Copies the McGill Billboard SALAMI chords files (~/Projects/corpora/billboard, CC0; cite Burgoyne, Wild and Fujinaga 2011) into
// apps/shared/data/billboard/<id>.txt, and writes apps/shared/data/billboard/index.json:
//   [{ id, title, artist, year, peak, metre, tonic, secs, form, romans, romanSeq }]  (form: the section letters in order, "A B C B C D …";
//   romans / romanSeq: the chords as Roman numerals over the tonic, by tune-library.js's own reading, for Functions / Progression)
// The set annotates some songs twice (the same title and artist drawn from two chart dates): only the first (lowest id) is kept.
// Timestamp Notes opens one with ?salami=<id> (salami-chords.js); the Tune Directory lists them.
//   node scripts/billboard-import.mjs        (CORPORA=~/Projects/corpora by default)
import fs from "fs";
import path from "path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = (process.env.CORPORA || process.env.HOME + "/Projects/corpora") + "/billboard";
const OUT = ROOT + "/apps/shared/data/billboard";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const csv = fs.readFileSync(SRC + "/index.csv", "utf8").trim().split("\n");
const head = csv.shift().split(",");
const row = (line) => { const out = []; let cur = "", q = false;
  for (const c of line) { if (c === '"') q = !q; else if (c === "," && !q) { out.push(cur); cur = ""; } else cur += c; }
  out.push(cur); return Object.fromEntries(head.map((h, i) => [h, out[i] || ""])); };
const meta = Object.fromEntries(csv.map(row).map((r) => [r.id, r]));

// tune-library.js's roman() and salami-chords.js's chord(), loaded with just enough of a browser around them
globalThis.window = globalThis;
globalThis.document = { readyState: "complete", querySelector: () => null };
const require = (await import("module")).createRequire(import.meta.url);
require(ROOT + "/apps/shared/tune-library.js"); require(ROOT + "/apps/shared/timestamp-player/salami-chords.js");
const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const tonicPc = (t) => { const m = /^([A-G])([b#]*)/.exec(t || "C"); if (!m) return 0; let p = PCS[m[1]]; for (const c of m[2]) p += c === "#" ? 1 : -1; return (p + 12) % 12; };
function romansOf(text, tonic) {
  const pc = tonicPc(tonic), romans = [], seq = [];
  for (const line of text.split("\n").filter((l) => /^\d/.test(l))) {
    for (const bar of (line.match(/\|[^|]*(?=\|)/g) || [])) for (const c of bar.slice(1).trim().split(/\s+/)) {
      if (!c || c === "." || /^\(/.test(c) || /^x\d/.test(c)) continue;
      const sym = SalamiChords.chord(c); if (!sym || sym === "N.C.") continue;
      const r = TuneLibrary.roman(sym, pc); if (!r) continue;
      if (romans.indexOf(r) < 0) romans.push(r);
      if (seq[seq.length - 1] !== r) seq.push(r);
    }
  }
  return { romans, romanSeq: seq };
}

const index = [], seen = new Set();
let dropped = 0;
for (const id of fs.readdirSync(SRC + "/McGill-Billboard").filter((d) => /^\d+$/.test(d)).sort((a, b) => a - b)) {
  const f = path.join(SRC, "McGill-Billboard", id, "salami_chords.txt");
  if (!fs.existsSync(f)) continue;
  const text = fs.readFileSync(f, "utf8");
  const h = (k) => ((new RegExp("^# " + k + ":\\s*(.*)$", "m").exec(text) || [])[1] || "").trim();
  const lines = text.split("\n").filter((l) => /^\d/.test(l));
  const secs = lines.length ? Math.round(parseFloat(lines[lines.length - 1])) : 0;
  const form = lines.map((l) => (/^\S+\t([A-Z]'*),/.exec(l) || [])[1]).filter(Boolean).join(" ");
  const m = meta[String(+id)] || {};
  const same = (h("title") + "|" + h("artist")).toLowerCase();
  if (seen.has(same)) { dropped++; continue; }
  seen.add(same);
  const rn = romansOf(text, h("tonic"));
  index.push({ id: +id, title: h("title"), artist: h("artist"), year: +(m.chart_date || "").slice(0, 4) || null,
    peak: +m.peak_rank || null, metre: h("metre"), tonic: h("tonic"), secs, form, romans: rn.romans, romanSeq: rn.romanSeq });
  fs.writeFileSync(path.join(OUT, +id + ".txt"), text);
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index));
console.log(index.length + " songs -> " + path.relative(ROOT, OUT) + " (" + dropped + " second annotations of the same song left out)");
