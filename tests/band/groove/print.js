// Prints the band's grooves as groove text, for reading: node print.js [groove id ...]
const fs = require("fs"), vm = require("vm");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/");
for (const f of ["band/groove.js", "band/drums.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"), { filename: f });
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BandDrums.GROOVES).filter(id => id !== "none");
ids.forEach(id => {
  const d = BandDrums.create({ rng: mb(3) }), bars = [0, 1, 2, 3].map(i => d.bar({ index: i, length: 12, beats: 4, tempo: 120, intensity: 0.5, opts: { groove: id, fills: "none" } }));
  const swung = bars.some(b => b.some(e => e.straight)), g = BandGroove.fromEvents(bars, { title: id, tempo: 120, swung });
  console.log(id + "  (Div " + g.div + ")" + (g.warnings.length ? "   ! " + g.warnings.join(" ") : ""));
  BandGroove.LANES.forEach(l => { if (g.lanes[l].some(c => c !== "-")) console.log("  " + (l + "  ").slice(0, 3) + BandGroove.stringify(g).split("&" + l + "=")[1].split("&")[0]); });
});
