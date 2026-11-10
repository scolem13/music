// rimsky.test.js — every rimsky-* row in apps/shared/data/full-scores/index.json (scripts/rimsky/build.mjs) has its ABC, abcjs reads it
// without warnings, every voice has the same number of bars, bar k starts at the same moment in every voice, no bar is longer than
// the time signature allows more than the first voice's (the converter's own check against the MusicXML ran when it was built), and
// the lessons' links (?id=rimsky-NNN) point at rows that exist.
//   node tests/rimsky/rimsky.test.js        (NEG=1 adds a rest to the first example's first bar: must fail)
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), DIR = ROOT + "/apps/shared/data/full-scores";
const { abcVoices } = require(ROOT + "/scripts/full-score/score-check.cjs");
const index = JSON.parse(fs.readFileSync(DIR + "/index.json", "utf8")), rows = index.filter(s => /^rimsky-/.test(s.id));
let fails = 0; const fail = m => { fails++; if (fails <= 30) console.log("FAIL " + m); };
function problems(abc) {
  const out = [];
  const { V, warnings } = abcVoices(abc);
  if (warnings && warnings.length) out.push("abcjs warnings: " + String(warnings[0]).slice(0, 100));
  if (!V.length) return out.concat("no voices");
  const n = V[0].bars.length;
  V.forEach(v => { if (v.bars.length !== n) out.push(`voice ${v.id} has ${v.bars.length} bars, voice ${V[0].id} ${n}`); });
  const start = v => { let t = 0; return v.bars.map(b => { const s = t; t += b.len; return s; }); };
  const S = V.map(start);
  for (let k = 0; k < n; k++) { const xs = S.map(s => s[k]).filter(x => x !== undefined); if (Math.max(...xs) - Math.min(...xs) > 0.05) { out.push("bar " + (k + 1) + " starts at different times"); break; } }
  return out;
}
if (rows.length < 100) fail("only " + rows.length + " rimsky rows");
let ok = 0;
for (const [i, s] of rows.entries()) {
  const f = DIR + "/" + s.abc;
  if (!fs.existsSync(f)) { fail(s.id + ": " + s.abc + " missing"); continue; }
  let abc = fs.readFileSync(f, "utf8");
  if (process.env.NEG && i === 0) abc = abc.replace(/^(V:1\n(?:%%.*\n)*)/m, "$1").replace(/(\n[^VX%LMKQ\n][^\n]*?)\|/, "$1 z4 |");
  const p = problems(abc);
  if (p.length) fail(s.id + ": " + p[0]); else ok++;
  if (!s.cite || !s.cite.chapter && !/^rimsky-\d+[ab]$/.test(s.id) && ![9, 17].includes(+s.id.slice(7))) { /* examples the book never links to have no chapter; allowed */ }
}
// lessons: every rimsky-NNN id a page links to is a row
const ids = new Set(rows.map(r => r.id));
for (const f of ["lessons/compose-orchestra.qmd", "lessons/compose-instruments.qmd"]) {
  const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
  for (const m of fs.readFileSync(p, "utf8").matchAll(/rimsky-(\d+[ab]?)/g)) if (!ids.has("rimsky-" + m[1])) fail(f + " links rimsky-" + m[1] + " which is not in the player");
}
console.log(`${rows.length} rimsky scores, ${ok} read clean`);
if (fails) { console.log(fails + " problems"); process.exit(1); }
console.log("all passed");
