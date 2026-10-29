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
// Kinds (labels in recordings.js KINDS): song, accompaniment, bass, tonal, rhythm, melodic (melodic patterns), harmonic (harmonic
// progressions), improvisation, acculturation, articulation, instructions, chant, listening, other.
function kindOf(title) {
  const s = title.toLowerCase();
  if (/with directions|instructions?\b|introduction to|^directions/.test(s)) return "instructions";
  if (/acculturation/.test(s)) return "acculturation";
  if (/tonal pattern/.test(s) || /^(major|minor|dorian|mixolydian|phrygian|lydian|aeolian|harmonic minor)\s*-\s*tonic/.test(s) && !/harmonic progression/.test(s)) return "tonal";
  if (/harmonic progression/.test(s)) return "harmonic";
  if (/rhythm pattern|rhythm phrase/.test(s) || /^(duple|triple|unusual|combined)\b.*-\s*(neutral|rhythm)/.test(s)) return "rhythm";
  if (/melodic pattern|patterns from/.test(s)) return "melodic";
  if (/improvis/.test(s) && !/melody and improvisation|melody & improvisation/.test(s)) return "improvisation";
  if (/accompaniment|\bacc\b|no vocals/.test(s)) return "accompaniment";
  if (/bass line/.test(s) && !/singing/.test(s)) return "bass";
  if (/articulation/.test(s)) return "articulation";
  if (/\bchant\b/.test(s)) return "chant";
  if (/solo|singing|with vocals|vocals|melody/.test(s)) return "song";
  return "";
}
const TONAL = ["harmonic minor", "major", "minor", "dorian", "mixolydian", "aeolian", "phrygian", "lydian", "locrian"];
const METER = ["duple", "triple", "unusual", "combined"];
// "G Is DO", "D Is RE": the resting tone's syllable names the tonality, the letter the key.
const SYL = { do: "major", re: "dorian", mi: "phrygian", fa: "lydian", so: "mixolydian", sol: "mixolydian", la: "minor", ti: "locrian" };
function keyOf(title) {
  let m = /\b([A-G][b#]?)\s+is\s+(do|re|mi|fa|sol?|la|ti)\b/i.exec(title);
  if (m) return { key: m[1], tonality: SYL[m[2].toLowerCase()] };
  m = /\(([A-G][b#]?)[\s)]/.exec(title) || /concert ([A-G][b#]?)\b/i.exec(title) || /\b([A-G][b#]?)-(?:DO|LA|RE|SO)\b/.exec(title);
  return m ? { key: m[1] } : {};
}

// ---- the tune collection (apps/tunes/tunes-object.js): a recording whose title names a tune there is linked to it ----
const TUNES = (() => {
  const src = fs.readFileSync(new URL("../apps/tunes/tunes-object.js", import.meta.url), "utf8"), out = [];
  for (const b of src.split(/\n(?=X:)/)) {
    const T = (/^T:(.*)$/m.exec(b) || [])[1], id = (/^%%id\s+(\S+)/m.exec(b) || [])[1];
    if (T && id) out.push({ id, norm: norm(T), K: ((/^K:\s*(\S+)/m.exec(b) || [])[1] || ""), M: ((/^M:\s*(\S+)/m.exec(b) || [])[1] || "") });
  }
  return out;
})();
function norm(t) {
  return String(t).toLowerCase().replace(/[’']/g, "").replace(/&/g, "and").replace(/\(.*?\)/g, " ").replace(/^(a|the)\s+|,\s*(a|the)$/g, "")
    .replace(/[^a-z0-9]+/g, " ").replace(/^(a|the) /, "").trim();
}
// The tune's name inside a recording title: the quoted name, else the title less numbers, "Singing", "- Solo", ", P. 8", "(C No vocals)", "G Is DO".
function tuneName(title) {
  const q = /"([^"]+)"/.exec(title.replace(/^"(?=Singing)/, ""));
  if (q) return q[1];
  return title.replace(/^\d+[a-z]?\.\s*/, "").replace(/^singing\s+/i, "").replace(/\s+-\s+(solo|acc.*)$/i, "").replace(/,?\s*P\.\s*\d+.*$/, "")
    .replace(/\s+[A-G][b#]?\s+is\s+\w+$/i, "").replace(/\s+a-melody.*$/i, "").replace(/\s+\d+$/, "").replace(/-(major|minor)$/i, "").trim();
}
function tunesFor(title) {
  const n = norm(tuneName(title)); if (n.length < 3) return [];
  return TUNES.filter(t => t.norm === n);
}
const KMODE = { "": "major", maj: "major", m: "minor", min: "minor", aeo: "minor", dor: "dorian", mix: "mixolydian", phr: "phrygian", lyd: "lydian", loc: "locrian", ion: "major" };
function tonalityOfK(K) { const m = /^[A-G][b#]?(.*)$/i.exec(K); if (!m) return; return KMODE[m[1].toLowerCase().slice(0, 3)] || KMODE[m[1].toLowerCase()]; }
function meterOfM(M) {
  const m = /^(\d+)\/(\d+)$/.exec(M); if (!m) return M === "C" || M === "C|" ? "duple" : undefined;
  const n = +m[1], d = +m[2];
  if (d === 8 && n % 3 === 0) return n / 3 === 3 ? "triple" : "duple";
  if (n === 2 || n === 4) return "duple";
  if (n === 3) return "triple";
  return "unusual";
}

// Hand-checked facts (the catalogue page mlt/recordings.qmd writes this file): { "<rec id>": { kind, tonality, meter, key, tune: [ids], note, skip } }.
// A field given here wins over everything read off titles and tunes, and is no longer marked a guess.
const META_FILE = new URL("../apps/shared/mlt/recordings-meta.json", import.meta.url);
const META = fs.existsSync(META_FILE) ? JSON.parse(fs.readFileSync(META_FILE, "utf8")) : {};
// Timing maps: Timestamp Notes song files saved as apps/shared/mlt/timings/<rec id>.json.
const TIMINGS = new URL("../apps/shared/mlt/timings/", import.meta.url).pathname;

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
    const k = keyOf(title), tl = tunesFor(title), guess = [];
    let tonality = TONAL.find(x => new RegExp("\\b" + x + "\\b").test(lo)) || k.tonality, meter = METER.find(x => new RegExp("\\b" + x + "\\b").test(lo));
    if (!tonality && tl[0] && tonalityOfK(tl[0].K)) { tonality = tonalityOfK(tl[0].K); guess.push("tonality"); }
    if (!meter && tl[0] && meterOfM(tl[0].M)) { meter = meterOfM(tl[0].M); guess.push("meter"); }
    let kind = kindOf(title) || (tl.length || (col.book === "jrimusic" && /\bP\.\s*\d/.test(title)) ? "song" : "");
    if (kind === "song" && !kindOf(title)) guess.push("kind");
    const m = META[id] || {};
    const rec = {
      id, col: col.id, disc: t.disc, track, title, dur: t.dur,
      kind: m.kind || kind || undefined,
      tonality: m.tonality || tonality, meter: m.meter || meter, key: m.key || k.key,
      tune: m.tune || (tl.length ? tl.map(x => x.id) : undefined),
      note: m.note,
      page: (title.match(/\bP\.\s*(\d+)/) || [])[1] && +title.match(/\bP\.\s*(\d+)/)[1],
      r2: `mlt/${col.id}/${path.relative(dir, f).split(path.sep).join("/")}`.replace(/\.{2,}/g, "."),   // Cloudflare's firewall refuses ".." in a URL
      file: path.relative(ROOT, f), size: t.size,
    };
    const g2 = guess.filter(x => !m[x]); if (g2.length) rec.guess = g2;
    if (m.tune) rec.tuneChecked = 1;
    if (fs.existsSync(path.join(TIMINGS, id + ".json"))) rec.timing = 1;
    recs.push(rec);
  }
  cols[cols.length - 1].count = recs.filter(r => r.col === col.id).length;
}
// Folders nobody listed above, so a new CD is not missed silently.
for (const f of walk(ROOT)) if (!recs.some(r => path.join(ROOT, r.file) === f)) console.warn("not catalogued (add its folder to COLLECTIONS):", path.relative(ROOT, f));

const clean = recs.map(({ file, size, ...r }) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)));
const js = `// recordings.js: the MLT / JRI recordings catalogue. WRITTEN BY scripts/mlt-recordings.mjs, do not edit by hand.
// Global MLTRecordings = { base, collections, list, KINDS, byId(id), url(rec), forTune(tuneId), timingUrl(rec) }. Files are in
// the R2 bucket under rec.r2; set the bucket once with window.MLT_REC_BASE (falls back to WORKS_CONFIG.r2Base). Hosted for this
// teacher's students with permission; "Edwin E. Gordon Test" is never catalogued.
// rec: { id, col, disc, track, title, dur (s), kind? (KINDS), tonality?, meter?, key? (letter name), tune? ([tune collection %%ids]),
//        tuneChecked? (tune links checked by hand), guess? ([fields read off the linked tune, not checked]), note?, page? (book page
//        printed in the title), timing? (1: a Timestamp Notes song file at timings/<id>.json), r2 }
// Hand-checked fields come from apps/shared/mlt/recordings-meta.json (edited on mlt/recordings.qmd).
(function (g) {
  var collections = ${JSON.stringify(cols, null, 0).replace(/},{/g, "},\n    {")};
  var list = [
${clean.map(r => "    " + JSON.stringify(r)).join(",\n")}
  ];
  var idx = {}; list.forEach(function (r) { idx[r.id] = r; });
  var KINDS = { song: "Song", accompaniment: "Accompaniment", bass: "Bass line", tonal: "Tonal patterns", rhythm: "Rhythm patterns",
    melodic: "Melodic patterns", harmonic: "Harmonic progressions", improvisation: "Improvisation", acculturation: "Acculturation",
    articulation: "Articulation", instructions: "Instructions", chant: "Chant", listening: "Listening", other: "Other" };
  g.MLTRecordings = {
    collections: collections, list: list, KINDS: KINDS,
    byId: function (id) { return idx[id] || null; },
    forTune: function (tid) { return list.filter(function (r) { return r.tune && r.tune.indexOf(tid) >= 0; }); },
    timingUrl: function (r) { return "/apps/shared/mlt/timings/" + encodeURIComponent(r.id || r) + ".json"; },
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
