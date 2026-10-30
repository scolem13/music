// Put Timestamp Notes song files where the site reads them: an MLT recording's timing map is apps/shared/mlt/timings/<id>.json.
//   node scripts/apply-song-files.mjs <file.json> [more…] [--write]
// Each file is a song file (Save song file; from a ?rec= recording, or named <id>.json) or a whole download from Saved songs
// ({ app: "timestamp-notes-library", songs: { "rec:<id>": {…} } }). Songs not on an MLT recording (YouTube, a file, a URL) are listed, not written.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "apps/shared/mlt/timings");
const args = process.argv.slice(2), WRITE = args.includes("--write"), files = args.filter(a => !a.startsWith("--"));
if (!files.length) { console.error("usage: node scripts/apply-song-files.mjs <file.json>… [--write]"); process.exit(2); }
const songs = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  if (d.app === "timestamp-notes-library") for (const [k, s] of Object.entries(d.songs || {})) songs.push({ key: k, song: s, from: f });
  else if (d.app === "timestamp-notes") {
    const rec = d.source && d.source.rec, base = path.basename(f, ".json");
    songs.push({ key: rec ? "rec:" + rec : fs.existsSync(path.join(OUT, base + ".json")) ? "rec:" + base : "file:" + base, song: d, from: f });
  } else console.log("SKIP " + f + ": not a Timestamp Notes file");
}
let n = 0;
for (const { key, song, from } of songs) {
  const m = /^rec:(.+)$/.exec(key);
  if (!m) { console.log("not an MLT recording (left alone): " + key + "  " + (song.title || "") + "  [" + path.basename(from) + "]"); continue; }
  const id = m[1].replace(/[^\w-]/g, ""), out = path.join(OUT, id + ".json");
  const text = JSON.stringify(song, null, 1) + "\n", old = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : null;
  const stamps = (song.stamps || []).length, bars = ((song.barMap || {}).bars || []).length;
  if (old === text) { console.log("same  " + id); continue; }
  console.log((old ? "update " : "new    ") + id + ": " + stamps + " stamps, " + bars + " bars");
  if (WRITE) fs.writeFileSync(out, text);
  n++;
}
console.log(n + (WRITE ? " written" : " to write (add --write)"));
