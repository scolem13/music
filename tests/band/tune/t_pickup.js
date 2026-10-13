// A pickup: sounded at the end of the count-in, and at the end of each chorus's last bar (played whole, so a chorus is not a beat short)
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js"].forEach(f => require(R + f));
const abc = `X:1\nT:P\nM:4/4\nL:1/4\nK:C\nG | "C"c2 e2 | "F"f2 a2 | "G"g2 d |]\n`;
const parsed = TuneChart.parse(abc);
parsed.bars[0].melody = [{ pos: 3, dur: 1, midi: 67 }]; parsed.bars[1].melody = [{ pos: 0, dur: 1, midi: 72 }]; parsed.bars[3].melody = [{ pos: 0, dur: 1, midi: 79 }];
const bank = { play(){}, choke(){}, control(){}, has(){ return true; } }, bus = { input(){ return {}; }, setVolume(){} };
function run(cfg, bars){
  const c = Object.assign({ parsed, tempo: 120, transpose: 0, countIn: 1, choruses: 0, opts: {}, volumes: {}, startBar: 0, cycle: null, tempoSteps: null, intro: null, between: null, hold: false }, cfg);
  const s = new BandPlayer.Session({ currentTime: 0 }, bank, bus, c, 7, null); const mel = []; const col = s.collect.bind(s);
  s.collect = function (part, evs, L0, beats, cmp, unit){ if (part === "comp") evs.filter(e => e.melody).forEach(e => mel.push({ bar: s.timeline.length, L0, beats, pos: e.pos, midi: e.midis[0] })); return col(part, evs, L0, beats, cmp, unit); };
  s.start(0); const out = [];
  for (let i = 0; i < bars; i++){ const was = s.timeline[s.timeline.length - 1]; s.generate(); const e = s.timeline[s.timeline.length - 1]; if (e === was) break; out.push({ L: e.L, beats: e.beats, tag: e.info.countIn ? "count" : String(e.info.index + 1) }); if (s.done) break; }
  return { out, mel };
}
let r = run({ countIn: 1 }, 7);
assert.deepStrictEqual(r.out.map(x => x.tag + ":" + x.beats), ["count:4", "1:4", "2:4", "3:4", "1:4", "2:4", "3:4"], "the last bar is played whole: a chorus is 12 beats");
assert.deepStrictEqual(r.mel.map(m => m.midi + "@" + m.L0 + "+" + m.pos), ["67@0+3", "72@4+0", "79@12+0", "67@12+3", "72@16+0", "79@24+0", "67@24+3"], "pickup at the end of the count-in; the last bar's own note and the pickup at its end; round again");
r = run({ countIn: 0 }, 2); assert(!r.mel.some(m => m.midi === 67 && m.L0 === 0), "no count-in: no pickup before the first bar");
r = run({ countIn: 1, opts: { melody: false } }, 2); assert.strictEqual(r.mel.length, 0, "melody off: no pickup either");
r = run({ countIn: 1, intro: { kind: "last", bars: 1 } }, 3); assert(!r.mel.some(m => m.midi === 67 && m.L0 === 0), "an intro follows the count-in: the pickup waits (not played in the count-in)");
console.log("PICKUP OK");
