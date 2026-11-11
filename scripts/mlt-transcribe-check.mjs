// Bar-length check of the MLT book transcriptions in research_notes/mlt-transcribe/<book>/,
// and one merged to-do list (research_notes/mlt-transcribe/TODO.md) from each book's todo-*.tsv.
// Usage: node scripts/mlt-transcribe-check.mjs
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "research_notes/mlt-transcribe");
const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "apps/shared/abcjs-basic.js"), "utf8"), ctx);
const ABC = ctx.ABCJS;

// same rule as scripts/clean-tunes.mjs: inner bars (not the first or last) must fill the metre
function check(abc) {
  let r;
  try { r = ABC.parseOnly(abc)[0]; } catch (e) { return { err: String(e) }; }
  const mt = r.getMeterFraction ? r.getMeterFraction() : { num: 4, den: 4 };
  const barLen = mt.num / mt.den, lens = [];
  let cur = 0, tup = 1;
  for (const line of r.lines || []) for (const st of line.staff || []) for (const v of st.voices || [])
    for (const e of v) {
      if (e.el_type === "note") {
        if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier;
        cur += (e.duration || 0) * tup;
        if (e.endTriplet) tup = 1;
      } else if (e.el_type === "bar") { if (cur > 0) lens.push(cur); cur = 0; }
    }
  if (cur > 0) lens.push(cur);
  const inner = lens.slice(1, -1);
  const bad = inner.map((l, i) => Math.abs(l - barLen) > 1e-6 ? i + 2 : 0).filter(Boolean);
  return { bars: lens.length, bad };
}

const BOOKS = { musicplay: "Music Play (Reynolds et al., GIA 1998)", "jri-k": "Jump Right In: Kindergarten (GIA)" };
let md = "# MLT songs to transcribe into ABC\n\nWritten by `node scripts/mlt-transcribe-check.mjs` from each book's `todo-*.tsv`.\n" +
  "Status is the transcriber's; **bars** is the script's check (inner bars that do not fill the metre).\n" +
  "Nothing here is in the tune collection yet: each file needs a look against the page before it goes in.\n";
const totals = {};
for (const [book, name] of Object.entries(BOOKS)) {
  const rows = [];
  for (const f of fs.readdirSync(path.join(dir, book)).filter(f => /^todo-.*\.tsv$/.test(f)).sort())
    for (const line of fs.readFileSync(path.join(dir, book, f), "utf8").split("\n")) {
      const c = line.split("\t");
      if (c.length < 5 || c[0] === "title") continue;
      rows.push({ title: c[0].trim(), page: +c[1] || c[1], ton: c[2] || "", meter: c[3] || "", status: (c[4] || "").trim(), file: (c[5] || "").trim() });
    }
  rows.sort((a, b) => a.page - b.page);
  md += `\n## ${name}\n\n| p. | Title | Tonality | Meter | Status | Bars | File |\n|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    let bars = "";
    const fp = r.file && path.join(dir, book, r.file);
    if (fp && fs.existsSync(fp)) {
      const abc = fs.readFileSync(fp, "utf8"), k = check(abc);
      bars = k.err ? "parse error" : k.bad.length ? `off: ${k.bad.join(", ")}` : `ok (${k.bars})`;
      if (/guess/i.test(abc) && r.status !== "not started") r.status = "redo (guessed)";
    }
    totals[r.status] = (totals[r.status] || 0) + 1;
    md += `| ${r.page} | ${r.title} | ${r.ton} | ${r.meter} | ${r.status} | ${bars} | ${r.file && fs.existsSync(fp) ? r.file : ""} |\n`;
  }
}
fs.writeFileSync(path.join(dir, "TODO.md"), md);
console.log(totals);
