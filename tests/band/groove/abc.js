// Prints the ABC the drum staff writes for a groove: node abc.js "<groove text>"
const fs = require("fs"), vm = require("vm");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
for (const f of ["tune-chart.js", "voicings.js", "band/harmony.js", "band/groove.js", "band/drums.js", "band/congas.js", "band/sounds.js", "band/player.js", "band/midi.js", "band/notation.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"), { filename: f });
const g = BandGroove.parse(process.argv[2] || "?TimeSig=4/4&Div=16&H=|x-x-x-x-x-x-x-x-|&S=|----O--g----O---|&K=|o-------o-o-----|");
console.log(BandGroove.records ? BandNotation.toAbc(BandGroove.records(g), { show: { comp: false, bass: false, drums: true, congas: true }, barsPerLine: 2 })
  : BandNotation.toAbc(BandGroove.toEvents(g).map(d => ({ beats: BandGroove.beats(g), meter: { n: g.n, d: g.d }, compound: BandGroove.compound(g), swing: 0.5, chords: [], parts: { drums: d } })), { show: { comp: false, bass: false, drums: true }, barsPerLine: 2 }));
