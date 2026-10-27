// A part written out on a bar (bar.written, from the Notation page's "played by the band's bass / chords" voices): that part plays
// those notes there (an empty list: it rests) and makes its own in the other bars. node t_written.js -> "WRITTEN OK"
const assert = require("assert");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/");
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js"].forEach(f => require(R + f));
const parsed = TuneChart.parse("X:1\nM:4/4\nL:1/4\nK:C\n" + "C|F|G|C".split("|").map(c => `"${c}"z4`).join(" | ") + " |]");
parsed.bars[1].written = { bass: [{ pos: 0, dur: 2, midi: 41 }, { pos: 2, dur: 2, midi: 45 }], comp: [{ pos: 1, dur: 1, midi: 65, also: [69, 72] }] };
parsed.bars[2].written = { bass: [] };
const bank = { play(){}, choke(){}, control(){}, has(){ return true; } }, bus = { input(){ return {}; }, setVolume(){} };
const s = new BandPlayer.Session({ currentTime: 0 }, bank, bus, { parsed, tempo: 120, transpose: 2, countIn: 1, choruses: 1, opts: { comp: "piano" }, volumes: {}, startBar: 0 }, 7, null);
const recs = []; s.barTap = r => recs.push(r);
s.start(0); for (let i = 0; i < 6 && !s.done; i++) s.generate();
const bar = i => recs.find(r => r.index === i && !r.ending);
assert.ok(bar(0).parts.bass.length > 0, "bar 1: the band's own bass");
assert.deepStrictEqual(bar(1).parts.bass.map(e => [e.pos, e.midi]), [[0, 43], [2, 47]], "bar 2: the written bass, transposed");
assert.deepStrictEqual(bar(1).parts.comp.map(e => [e.pos, e.midis]), [[1, [67, 71, 74]]], "bar 2: the written chord");
assert.deepStrictEqual(bar(2).parts.bass, [], "bar 3: an empty list rests");
assert.ok(bar(2).parts.comp.length > 0 && bar(3).parts.bass.length > 0, "the rest made up as usual");
console.log("WRITTEN OK");
