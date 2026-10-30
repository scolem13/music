// score-bundles.test.js — every piece in apps/shared/data/scores/*.json (written by scripts/when-in-rome/bundle.mjs) parses in abcjs,
// its bars are the meter's length in every voice (scripts/when-in-rome/bar-check.cjs, up to 2% off), it has chords, and the index
// and the bundle files agree.
//   node tests/works/score-bundles.test.js        (NEG=1 breaks bars in the first piece: must fail)
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), DIR = ROOT + "/apps/shared/data/scores";
const { barCheck } = require(ROOT + "/scripts/when-in-rome/bar-check.cjs");
const index = JSON.parse(fs.readFileSync(DIR + "/index.json", "utf8")), files = {};
let fails = 0, pieces = 0, bars = 0, badBars = 0;
const fail = m => { fails++; if (fails <= 30) console.log("FAIL " + m); };
for (const p of index) {
  const B = files[p.file] = files[p.file] || JSON.parse(fs.readFileSync(DIR + "/" + p.file + ".json", "utf8")), d = B[p.id];
  if (!d) { fail(p.id + ": in index.json, not in " + p.file + ".json"); continue; }
  pieces++;
  let abc = d.abc;
  if (process.env.NEG && pieces === 1) { let i = 0; abc = abc.replace(/ \| /g, m => (++i % 3 === 0 ? " z8 | " : m)); }
  const r = barCheck(abc);
  if (r.error) { fail(p.id + ": " + r.error); continue; }
  bars += r.bars; badBars += r.bad;
  if (!r.ok) fail(`${p.id}: ${r.bad} of ${r.bars} bars the wrong length`);
  if (!d.chords.length) fail(p.id + ": no chords");
}
for (const f of fs.readdirSync(DIR).filter(f => f !== "index.json"))
  Object.keys(JSON.parse(fs.readFileSync(DIR + "/" + f, "utf8"))).forEach(id => { if (!index.some(p => p.id === id)) fail(id + ": in " + f + ", not in index.json"); });
console.log(`${pieces} pieces, ${bars} bars checked, ${badBars} off-length, ${fails} failures`);
process.exit(fails ? 1 : 0);
