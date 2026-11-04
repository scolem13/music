// node tests/band/modx/modx-orchestra.test.js — the orchestra Parts (apps/shared/band/modx-orchestra.js): sixteen, one per channel,
// each with suggestions; the staff names of the full scores on the site and the usual Italian / English / German names each go to the
// right Part; every audition phrase stays inside its Part's range. NEG=1 must fail.
const assert = require("assert"), fs = require("fs"), path = require("path");
require("../../../apps/shared/band/modx-orchestra.js");
const O = globalThis.ModxOrchestra;
if (process.env.NEG) O.PARTS[15].names = /zzz/;
assert.equal(O.PARTS.length, 16); assert.deepEqual(O.PARTS.map(p => p.ch), [...Array(16)].map((_, i) => i + 1));
O.PARTS.forEach(p => assert(p.pick && p.pick.length, p.part + " has suggestions"));
const want = { "Flauto": "Flutes", "Piccolo": "Flutes", "Oboi": "Oboes", "Corno inglese": "Oboes", "Clarinetti in B": "Clarinets", "Fagotti": "Bassoons",
  "Contrafagotto": "Bassoons", "Corni in G": "Horns", "Corni in B": "Horns", "Horn in F": "Horns", "Trombe in D": "Trumpets", "Trumpet in C": "Trumpets",
  "Tromboni": "Trombones", "Posaune": "Trombones", "Tuba": "Tuba", "Timpani": "Timpani", "Pauken": "Timpani", "Triangolo": "Percussion", "Piatti": "Percussion",
  "Arpa": "Harp, keyboards", "Glockenspiel": "Harp, keyboards", "Violino I": "Violins I", "Violin 1": "Violins I", "Violino II": "Violins II", "Violins II": "Violins II",
  "Viola": "Violas", "Violoncello": "Cellos", "Violoncello e Basso": "Cellos", "Cello": "Cellos", "Contrabbasso": "Basses", "Double Bass": "Basses", "Basso": "Basses" };
for (const [n, p] of Object.entries(want)) assert.equal((O.partFor(n) || {}).part, p, n);
// every staff name in the site's full scores
const dir = path.join(__dirname, "../../../apps/shared/data/full-scores");
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".abc"))) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/nm="([^"]+)"/g))
  assert(O.partFor(m[1]), f + ": no Part for " + m[1]);
for (const p of O.PARTS) if (!p.kit) O.phrase(p).forEach(n => assert(n.midi >= p.lo && n.midi <= p.hi, p.part + " phrase in range"));
console.log("modx-orchestra.test: ok");
