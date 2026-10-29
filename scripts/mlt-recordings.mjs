#!/usr/bin/env node
// mlt-recordings.mjs: catalogue the MLT / JRI / Music Play recordings in ~/Music/MLT and write
// apps/shared/mlt/recordings.js (global MLTRecordings). Reads each file's tags with ffprobe.
//
//   node scripts/mlt-recordings.mjs                 catalogue only
//   node scripts/mlt-recordings.mjs --upload        also upload new/changed files to R2 (scripts/mlt-recordings-upload.sh)
//
// Left out on purpose: "Edwin E. Gordon Test" (never on the site). Anything else under ~/Music/MLT is picked up, so
// rerun after adding a CD. Each recording's R2 key is mlt/<collection id>/<file name>; ids are <collection>-<disc>-<track> (untagged files:
// <collection>-<title slug>) and stay the same across reruns as long as tracks and titles do, so steps can name them.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.env.MLT_AUDIO || path.join(os.homedir(), "Music/MLT");
const OUT = new URL("../apps/shared/mlt/recordings.js", import.meta.url).pathname;
const SKIP = /Edwin E\.? Gordon Test/i;

// Folder (relative to ROOT) → collection. book = what the recordings go with; teacher = for teacher use only.
const COLLECTIONS = [
  ["Mullen", { id: "mullen", title: "Mullen, MLT Any Music Teacher Can Du…De (recordings)", book: "mullen" }],
  ["Grunow, Gordon And Azzara/JRI_Book 1", { id: "jri1", title: "Jump Right In: The Instrumental Series, Book 1", book: "jri", note: "French horn CD: the songs are in the horn's key, not the class's" }],
  ["Grunow, Gordon And Azzara/Jump Right In Recorder Book 2 CD", { id: "jrirec2", title: "Jump Right In: Recorder, Book 2", book: "recorder" }],
  ["Grunow, Gordon And Azzara/JRI_Solo1A_AudioFiles", { id: "jrisolo1a", title: "JRI Solo and Accompaniment, Book 1A", book: "jri" }],
  ["Grunow, Gordon And Azzara/JRI_Solo1b_AudioFiles", { id: "jrisolo1b", title: "JRI Solo and Accompaniment, Book 1B", book: "jri" }],
  ["Grunow, Gordon And Azzara/JRI_Solo_Book2", { id: "jrisolo2", title: "JRI Solo and Accompaniment, Book 2", book: "jri" }],
  ["Grunow, Gordon And Azzara/JRI_Solo_Book3", { id: "jrisolo3", title: "JRI Solo and Accompaniment, Book 3", book: "jri" }],
  ["Christopher D. Azzara_Richard F. Grunow/Developing Musicianship Through Improvis", { id: "dmti", title: "Azzara and Grunow, Developing Musicianship Through Improvisation", book: "dmti" }],
];
for (const lv of ["K.1", "K.2", "K.3"]) COLLECTIONS.push([`Cynthia C. Taggart, Producer/Jump Right In ${lv}`, { id: "jrim" + lv.replace(".", "-").toLowerCase(), title: `Jump Right In: The Music Curriculum, ${lv}`, book: "jrimusic" }]);
for (const lv of ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "4.1"]) COLLECTIONS.push([`Beth M. Bolton, Producer/Jump Right In ${lv}`, { id: "jrim" + lv.replace(".", "-"), title: `Jump Right In: The Music Curriculum, ${lv}`, book: "jrimusic" }]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    if (SKIP.test(p)) return [];
    return d.isDirectory() ? walk(p) : /\.(mp3|m4a)$/i.test(d.name) ? [p] : [];
  });
}
function probe(f) {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", f]).toString());
  const t = Object.fromEntries(Object.entries(j.format.tags || {}).map(([k, v]) => [k.toLowerCase(), v]));
  return { title: t.title, album: t.album, track: parseInt(t.track) || 0, disc: parseInt(t.disc || t.tpa) || 1, dur: Math.round(+j.format.duration || 0), size: +j.format.size };
}
// What a track is, read off its title (most JRI / DMTI titles say it). Empty when the title gives no clue.
function kindOf(title) {
  const s = title.toLowerCase();
  if (/tonal pattern/.test(s)) return "tonal";
  if (/rhythm pattern|rhythm phrase/.test(s)) return "rhythm";
  if (/acculturation/.test(s)) return "acculturation";
  if (/accompaniment|\bacc\b|no vocals/.test(s)) return "accompaniment";
  if (/bass line/.test(s) && !/singing/.test(s)) return "bass";
  if (/articulation/.test(s)) return "articulation";
  if (/solo|singing|with vocals|melody/.test(s)) return "song";
  return "";
}
const TONAL = ["major", "minor", "dorian", "mixolydian", "aeolian", "phrygian", "lydian", "locrian", "harmonic minor"];
const METER = ["duple", "triple", "unusual", "combined"];

const cols = [], recs = [];
for (const [rel, col] of COLLECTIONS) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) { console.warn("missing:", rel); continue; }
  cols.push({ ...col, count: 0 });
  const files = walk(dir).sort();
  let n = 0;
  for (const f of files) {
    const t = probe(f);
    const base = path.basename(f);
    const title = (t.title || base.replace(/\.(mp3|m4a)$/i, "").replace(/^\d+(-\d+)?[a-z]?\.?\s+/i, "")).trim();
    const track = t.track || ++n;
    let id = `${col.id}-${t.disc}-${String(track).padStart(2, "0")}`;
    if (!t.track) id = `${col.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;   // untagged (Mullen): from the title
    while (recs.some(r => r.id === id)) id += "b";
    const lo = title.toLowerCase();
    recs.push({
      id, col: col.id, disc: t.disc, track, title, dur: t.dur,
      kind: kindOf(title) || undefined,
      tonality: TONAL.find(x => lo.includes(x)), meter: METER.find(x => lo.includes(x)),
      page: (title.match(/\bP\.\s*(\d+)/) || [])[1] && +title.match(/\bP\.\s*(\d+)/)[1],
      r2: `mlt/${col.id}/${path.relative(dir, f).split(path.sep).join("/")}`.replace(/\.{2,}/g, "."),   // Cloudflare's firewall refuses ".." in a URL
      file: path.relative(ROOT, f), size: t.size,
    });
  }
  cols[cols.length - 1].count = recs.filter(r => r.col === col.id).length;
}
// Folders nobody listed above, so a new CD is not missed silently.
for (const f of walk(ROOT)) if (!recs.some(r => path.join(ROOT, r.file) === f)) console.warn("not catalogued (add its folder to COLLECTIONS):", path.relative(ROOT, f));

const clean = recs.map(({ file, size, ...r }) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)));
const js = `// recordings.js: the MLT / JRI recordings catalogue. WRITTEN BY scripts/mlt-recordings.mjs, do not edit by hand.
// Global MLTRecordings = { base, collections, list, byId(id), url(rec) }. Files are in the R2 bucket under rec.r2;
// set the bucket once with window.MLT_REC_BASE (falls back to WORKS_CONFIG.r2Base). Hosted for this teacher's students
// with permission; "Edwin E. Gordon Test" is never catalogued.
// rec: { id, col, disc, track, title, dur (s), kind?: song|accompaniment|bass|tonal|rhythm|acculturation|articulation,
//        tonality?, meter?, page? (book page printed in the title), r2 }
(function (g) {
  var collections = ${JSON.stringify(cols, null, 0).replace(/},{/g, "},\n    {")};
  var list = [
${clean.map(r => "    " + JSON.stringify(r)).join(",\n")}
  ];
  var idx = {}; list.forEach(function (r) { idx[r.id] = r; });
  g.MLTRecordings = {
    collections: collections, list: list,
    byId: function (id) { return idx[id] || null; },
    base: function () { return String(g.MLT_REC_BASE || (g.WORKS_CONFIG && g.WORKS_CONFIG.r2Base) || "").replace(/\\/+$/, ""); },
    url: function (r) { var b = this.base(); return b ? b + "/" + r.r2.split("/").map(encodeURIComponent).join("/") : ""; }
  };
})(typeof window !== "undefined" ? window : globalThis);
if (typeof module !== "undefined") module.exports = (typeof window !== "undefined" ? window : globalThis).MLTRecordings;
`;
fs.writeFileSync(OUT, js);
fs.writeFileSync(new URL("../research_notes/mlt-recordings-manifest.tsv", import.meta.url).pathname,
  "r2\tfile\tsize\n" + recs.map(r => `${r.r2}\t${r.file}\t${r.size}`).join("\n") + "\n");
console.log(`${recs.length} recordings in ${cols.length} collections → ${path.relative(process.cwd(), OUT)}`);
for (const c of cols) console.log(`  ${c.id.padEnd(10)} ${String(c.count).padStart(4)}  ${c.title}`);

if (process.argv.includes("--upload")) {
  const r = spawnSync("bash", [new URL("./mlt-recordings-upload.sh", import.meta.url).pathname], { stdio: "inherit" });
  process.exit(r.status);
}
