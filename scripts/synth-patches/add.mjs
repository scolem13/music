#!/usr/bin/env node
// Teacher side of the student patch workflow (apps/shared/lessons/synth-library.js, lessons/synth-compare.qmd).
// node scripts/synth-patches/add.mjs <student.json ...> [--check] [--checked]
//   Validates each file (kind/version, a synth id the page has, every state key in PROFILES[synth].def with the same type,
//   a song, a YouTube or known source URL), copies the good ones into apps/shared/data/synth-patches/ as
//   <synth>-<artist>-<song>[-<by>].json and rewrites index.json from every patch file there.
//   --check   validate only, copy nothing.   --checked   mark the added patches checked: true (you compared them with the record).
// Exit 1 if any file is refused. Afterwards copy the folder to _site or re-render lessons/synth-compare.qmd.
import fs from "fs"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SC = require(ROOT + "/apps/shared/lessons/synth-compare.js"), SL = require(ROOT + "/apps/shared/lessons/synth-library.js");
export const DIR = process.env.SYNTH_PATCH_DIR || ROOT + "/apps/shared/data/synth-patches";
export function validate(o) { return SL.validate(o, SC.PROFILES); }
export function fileName(o) { return [o.synth, SL.slug(o.artist), SL.slug(o.song), SL.slug(o.by)].filter(Boolean).join("-") + ".json"; }
export function rebuildIndex(dir = DIR) {
  const patches = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json" && f !== "assignments.json").sort().map(f => {
    const o = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return { file: f, synth: o.synth, song: o.song, artist: o.artist || "", year: o.year || "", genre: o.genre || "", by: o.by || "",
      checked: !!o.checked, origin: o.origin || "video", source: { url: o.source.url, title: o.source.title || "", channel: o.source.channel || "" } };
  });
  fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify({ note: "Written by scripts/synth-patches/add.mjs; do not edit by hand.", patches }, null, 1) + "\n");
  return patches;
}
if (import.meta.url === "file://" + process.argv[1]) {
  const args = process.argv.slice(2), only = args.includes("--check"), mark = args.includes("--checked"), files = args.filter(a => !a.startsWith("--"));
  let bad = 0;
  for (const f of files) {
    let o; try { o = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.log("REFUSED " + f + ": not readable JSON"); bad++; continue; }
    const err = validate(o); if (err.length) { console.log("REFUSED " + f + ": " + err.join("; ")); bad++; continue; }
    delete o.checked; delete o.origin; if (mark) o.checked = true;
    if (only) { console.log("ok      " + f); continue; }
    const out = path.join(DIR, fileName(o)); fs.writeFileSync(out, JSON.stringify(o, null, 2) + "\n"); console.log("added   " + f + " -> " + path.relative(ROOT, out));
  }
  if (!only) console.log(rebuildIndex().length + " patches in index.json");
  process.exit(bad ? 1 : 0);
}
