// The bars a session generates: an intro made of chosen form bars, and what is played between two passes
// (player.setBetween): a click, a vamp, the last bars of the loop, chosen bars. Also tempo steps and the last pass.
const assert = require("assert");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/");
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js"].forEach(f => require(R + f));
const CH = "C|Am|F|G|Dm|G|C|C".split("|");
const parsed = TuneChart.parse("X:1\nM:4/4\nL:1/4\nK:C\n" + CH.map(c => `"${c}"z4`).join(" | ") + " |]");
const bank = { play(){}, choke(){}, control(){}, has(){ return true; } }, bus = { input(){ return {}; }, setVolume(){} };
function run(cfg, bars){
  const c = Object.assign({ parsed, tempo: 120, transpose: 0, countIn: 1, choruses: 0, opts: {}, volumes: {}, startBar: 0, cycle: null, tempoSteps: null,
                            intro: null, between: null, hold: false }, cfg);
  const s = new BandPlayer.Session({ currentTime: 0 }, bank, bus, c, 7, null); s.start(0);
  const out = [];
  for (let i = 0; i < bars; i++){ const was = s.timeline[s.timeline.length - 1]; s.generate();       // (the timeline keeps its last few bars only)
    const e = s.timeline[s.timeline.length - 1], f = e.info; if (e === was) break;
    out.push({ L: e.L, tempo: s.tempo, tag: f.ending ? "END" : f.countIn ? (f.between ? "click" : "count") : f.intro ? (f.between ? "gap" : "intro") + ":" + (f.src < 0 ? "vamp" : f.src + 1) : String(f.index + 1), chorus: f.chorus });
    if (s.done) break; }
  return out;
}
const tags = r => r.map(x => x.tag).join(" ");
// an intro of chosen bars, in the order given
assert.strictEqual(tags(run({ intro: { kind: "bars", list: [4, 5, 6] } }, 6)), "count intro:5 intro:6 intro:7 1 2");
assert.strictEqual(tags(run({ intro: { kind: "last", bars: 2 } }, 5)), "count intro:7 intro:8 1 2");
assert.strictEqual(tags(run({ intro: { kind: "vamp", bars: 2 } }, 4)), "count intro:vamp intro:vamp 1");
assert.strictEqual(tags(run({ intro: { kind: "bars", list: [99, -1] } }, 3)), "count 1 2", "bars that do not exist are no intro");
// a loop of bars 3-4 with a click between passes; nothing after the count-in, nothing before the first pass
assert.strictEqual(tags(run({ cycle: { from: 2, to: 3 }, startBar: 2, between: { kind: "click", bars: 2 } }, 10)), "count 3 4 click click 3 4 click click 3");
assert.strictEqual(tags(run({ cycle: { from: 2, to: 3 }, startBar: 2, between: { kind: "last", bars: 1 } }, 7)), "count 3 4 gap:4 3 4 gap:4");
assert.strictEqual(tags(run({ cycle: { from: 2, to: 3 }, startBar: 2, between: { kind: "vamp", bars: 1 } }, 6)), "count 3 4 gap:vamp 3 4");
assert.strictEqual(tags(run({ cycle: { from: 2, to: 3 }, startBar: 2, between: { kind: "bars", list: [6, 7] } }, 7)), "count 3 4 gap:7 gap:8 3 4");
// the whole form, three times: a gap after the first and second, none after the last, and the band still ends
const whole = run({ choruses: 3, between: { kind: "click", bars: 1 } }, 60);
assert.strictEqual(whole.filter(x => x.tag === "click").length, 2); assert.strictEqual(whole.filter(x => x.tag === "8").length, 3);
assert.notStrictEqual(whole[whole.length - 1].tag, "click");
// bars follow each other without a hole, 4 beats each
whole.forEach((x, i) => { if (i) assert.strictEqual(x.L - whole[i - 1].L, 4, "bar " + i + " starts where the last ended"); });
// a tempo step is taken before the gap: the click is already in the new tempo
const st = run({ cycle: { from: 0, to: 1 }, tempoSteps: [8], between: { kind: "click", bars: 1 } }, 8);
assert.deepStrictEqual(st.map(x => x.tag + "@" + x.tempo), ["count@120", "1@120", "2@128", "click@128", "1@128", "2@136", "click@136", "1@136"]);
// hold mode: no gaps
assert(!/click|gap/.test(tags(run({ hold: true, between: { kind: "click", bars: 1 } }, 20))));
// off: as before
assert.strictEqual(tags(run({ cycle: { from: 2, to: 3 }, startBar: 2 }, 6)), "count 3 4 3 4 3");
console.log("BETWEEN OK");
