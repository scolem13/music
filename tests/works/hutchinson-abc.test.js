// hutchinson-abc.test.js — the Hutchinson clip notation in apps/shared/data/hutchinson/ (written by scripts/works/hutchinson-abc.mjs):
// every excerpt parses in abcjs and every bar is the meter's length (scripts/works/hutchinson-abc-check.cjs), every index entry is
// well formed (kind, clip fields, bars with a reason, a source unless unverified), and index and files agree.
//   node tests/works/hutchinson-abc.test.js        (NEG=1 adds a note to a bar of the first excerpt: must fail)
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), DIR = ROOT + "/apps/shared/data/hutchinson";
const { checkBars } = require(ROOT + "/scripts/works/hutchinson-abc-check.cjs");
const index = JSON.parse(fs.readFileSync(DIR + "/index.json", "utf8"));
const KINDS = ["score-excerpt", "score-source", "chords", "riff", "figure"];
let fails = 0, files = 0, bars = 0, first = true;
const fail = m => { fails++; if (fails <= 30) console.log("FAIL " + m); };
const ids = new Set();
for (const e of index) {
  const at = e.id || "(no id)";
  if (ids.has(e.id)) fail(at + ": duplicate id"); ids.add(e.id);
  if (!KINDS.includes(e.kind)) fail(at + ": kind " + e.kind);
  if (!/^[\w-]{11}$/.test(e.video || "")) fail(at + ": video id");
  if (typeof e.start !== "number" || (e.end !== null && !(e.end > e.start))) fail(at + ": start/end");
  if (!e.id.startsWith(e.video + "-" + e.start)) fail(at + ": id is not <video>-<start>");
  if (!e.copyright) fail(at + ": no copyright note");
  if ((e.kind === "riff" || e.kind === "figure") && e.unverified !== true) fail(at + ": not marked unverified");
  if (e.kind === "riff" ? e.unverified !== true : !(e.source && e.source.id)) fail(at + (e.kind === "riff" ? ": riff not marked unverified" : ": no source"));
  if (e.kind === "score-excerpt") {
    if (!Array.isArray(e.bars) || !(e.bars[0] <= e.bars[1])) fail(at + ": bars");
    if (!e.barsWhy) fail(at + ": bars with no reason");
  }
  if (e.kind === "score-source" && e.abc) fail(at + ": score-source with an abc file");
  if (e.kind === "chords" && e.abc && e.aligned !== false && e.aligned !== true) fail(at + ": chords without aligned");
  if ((e.kind === "score-excerpt" || e.kind === "riff" || e.kind === "figure") && !e.abc) fail(at + ": no abc file");
  if (!e.abc) continue;
  if (!fs.existsSync(DIR + "/" + e.abc)) { fail(at + ": missing " + e.abc); continue; }
  let abc = fs.readFileSync(DIR + "/" + e.abc, "utf8");
  if (process.env.NEG && first && e.kind === "score-excerpt") { abc = abc.replace(/(\| [^|\n]*?) \|/, "$1 c |"); first = false; }   // the second bar (the first may be a pickup)
  files++;
  const r = checkBars(abc, { pickup: !!e.pickup });
  if (r.error) { fail(at + ": " + r.error); continue; }
  bars += r.bars;
  if (!r.bars && e.kind !== "figure") fail(at + ": no bars checked");   // a figure of one or two bars, each beside a double bar
  if (r.bad.length && e.barsOk !== false) fail(at + ": " + r.bad.slice(0, 3).join("; "));
}
for (const f of [...fs.readdirSync(DIR), ...fs.readdirSync(DIR + "/fig").map(f => "fig/" + f)].filter(f => f.endsWith(".abc")))
  if (!index.some(e => e.abc === f)) fail(f + ": not in index.json");
console.log(`${index.length} entries, ${files} excerpts, ${bars} bars checked, ${fails} failures`);
process.exit(fails ? 1 : 0);
