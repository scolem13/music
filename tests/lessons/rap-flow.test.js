// node tests/lessons/rap-flow.test.js — every flow pattern on the Rap Flow pages makes full 4/4 bars (rule 1).
// Reads the data-bars of every .rf in lessons/rap-flow*.qmd, builds ABC with RapFlow.abc and adds up each bar's length
// (L:1/16; a "(3:2:n" group counts 2/3). NEG=1 adds a broken bar, which must fail.
const fs = require("fs"), path = require("path");
const RF = require("../../apps/shared/lessons/rap-flow.js");
const root = path.join(__dirname, "../..");
let pats = [];
for (const f of fs.readdirSync(path.join(root, "lessons")).filter(f => /^rap-flow.*\.qmd$/.test(f)))
  for (const m of fs.readFileSync(path.join(root, "lessons", f), "utf8").matchAll(/data-bars="([^"]*)"/g)) pats.push([f, m[1]]);
if (process.env.NEG) pats.push(["NEG", "x.x.x.x.x.x.x.x.x"]);
function len(bar) {
  let tot = 0;
  for (const beat of bar.trim().split(/\s+/)) {
    const tr = beat.match(/^\(3(?::2:\d+)?(.*)$/), body = tr ? tr[1] : beat;
    let s = 0; for (const t of body.replace(/"[^"]*"|![^!]*!/g, "").matchAll(/[Bz](\d*)/g)) s += t[1] ? +t[1] : 1;
    tot += tr ? s * 2 / 3 : s;
  }
  return tot;
}
let bad = 0, n = 0;
for (const [f, p] of pats) {
  const bars = RF.parse(p);
  if (p.split("|").some(b => b.replace(/\s|^t:/g, "").replace(/^t:/, "").length > (/t:/.test(b) ? 12 : 16))) { bad++; console.log("FAIL too many cells", f, p); continue; }
  const body = RF.abc(bars).split("\n")[5].replace(/\|\]$/, "");
  body.split("|").forEach((b, i) => { n++; const l = len(b); if (Math.abs(l - 16) > 1e-9) { bad++; console.log("FAIL", f, "bar", i + 1, l, b); } });
}
console.log(bad ? `${bad} bad of ${n} bars` : `ok: ${n} bars in ${pats.length} patterns`);
process.exit(bad ? 1 : 0);
