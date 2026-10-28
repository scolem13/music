// opts.cutEnd (the ear tools): no ending. The last bar is an ordinary bar, nothing comes after it, no crash in it,
// and the cymbals are damped at its barline.   node tests/band/fills/t_cutend.js
const assert = require("assert");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/");
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js"].forEach(f => require(R + f));
const ABC = "X:1\nM:4/4\nL:1/4\nK:C\n\"C\"z4 | \"F\"z4 | \"G\"z4 | \"C\"z4 |]";
function run(opts, seed) {
  const c = { parsed: TuneChart.parse(ABC), tempo: 120, transpose: 0, countIn: 0, choruses: 1, opts: Object.assign({ groove: "rock", feel: "straight", fills: "auto" }, opts), intro: null, hold: false };
  const s = new BandPlayer.Session({ currentTime: 0 }, null, null, c, seed, null);
  const evs = []; s.collect = function (part, ev, L0) { (ev || []).forEach(e => evs.push(Object.assign({ part, L: L0 + (e.pos || 0) }, e))); };
  for (let k = 0; k < 40 && !s.done; k++) s.generate();
  return { s, evs };
}
for (let seed = 1; seed <= 20; seed++) {
  const { s, evs } = run({ cutEnd: true }, seed);
  assert(s.done, "stops"); assert.strictEqual(s.nextL, 16, "four bars, nothing after: " + s.nextL);
  const last = evs.filter(e => e.part === "drums" && e.L >= 12);
  assert(!last.some(e => e.piece === "crash"), "no crash in the last bar");
  assert(last.some(e => e.choke === "cymbals" && e.L < 16 && e.L > 15.5), "cymbals damped at the barline");
  assert(!evs.some(e => e.L >= 16), "nothing starts past the last bar");
  assert(!evs.some(e => e.part !== "drums" && e.L + (e.dur || 0) > 16 + 1e-6), "nothing held past the last bar");
}
// without it, the band still lands on its ending
const plain = run({}, 3);
assert(plain.evs.some(e => e.part === "drums" && e.piece === "crash" && e.L >= 12), "the usual ending has its crash");
console.log("CUT END OK");
