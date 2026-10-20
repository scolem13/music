// A cymbal grabbed with the hand: "^choke" in the chart, and the short ending (opts.endChoke).   node tests/band/fills/t_grab.js
const assert = require("assert");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/");
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js", "band/midi.js"].forEach(f => require(R + f));
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const bar = (c, x) => `${x || ""}"${c}"z4`;
const abc = marks => "X:1\nM:4/4\nL:1/4\nK:C\n" + Array.from({ length: 8 }, (_, i) => bar("C", marks[i])).join(" | ") + " |]";
const MARKED = abc({ 4: '"^choke"' }), PLAIN = abc({});
const form = BandHarmony.buildForm(TuneChart.parse(MARKED), 0);
assert.strictEqual(form[4].choke, true); assert.strictEqual(form[3].choke, undefined); assert.strictEqual(form[4].chords.length, 1, "the mark is not a chord");
const gen = (a, opts, seed) => BandMidi.generate(TuneChart.parse(a), { bars: 8, tempo: 120, opts: Object.assign({ fills: "none" }, opts), rng: mb(seed) });
[{ groove: "rock", feel: "straight", ride: "hat" }, { feel: "swing" }, { groove: "bossa", feel: "straight" }, { groove: "twelve8" }].forEach(o => [1, 2, 3].forEach(seed => {
  const a = gen(MARKED, o, seed), b = gen(PLAIN, o, seed), d = a[4].parts.drums;
  assert(d.some(e => e.pos === 0 && e.piece === "crash"), "crash on 1"); assert(d.some(e => e.pos === 0 && e.piece === "kick" && e.vel >= 0.4), "kick with it");
  const g = d.filter(e => e.choke); assert.strictEqual(g.length, 1); assert.strictEqual(g[0].choke, "cymbals"); assert(g[0].pos > 0 && g[0].pos < 1, "grabbed before beat 2"); assert(g[0].damp > 0.012, "a hand, not a switch");
  assert(!d.some(e => e.pos === 0 && /^(ride|hatClosed|rideBell)$/.test(e.piece)), "no other cymbal under the crash");
  // no mark, no change: the other parts and the unmarked chart are untouched
  ["bass", "comp"].forEach(p => assert.deepStrictEqual(a.map(r => r.parts[p]), b.map(r => r.parts[p]), p + " unchanged"));
  assert(!b.some(r => r.parts.drums.some(e => e.choke)), "no grab without the mark");
}));
// no drummer, no grab
assert(!gen(MARKED, { groove: "none" }, 1)[4].parts.drums.some(e => e.choke || e.piece === "crash"));
// the short ending
const D = BandDrums.create({ rng: mb(5) });
assert(!D.ending({ opts: {} }).some(e => e.choke)); const end = D.ending({ opts: { endChoke: true } });
assert(end.some(e => e.piece === "crash")); assert.strictEqual(end.filter(e => e.choke === "cymbals" && e.damp > 0.012 && e.pos > 0).length, 1);
// asked for by bar number from a page (opts.chokeBars), and written on the drum staff as a short crash with "choke" over it
const byOpt = gen(PLAIN, { groove: "rock", feel: "straight", ride: "hat", chokeBars: [2] }, 4);
assert(byOpt[2].parts.drums.some(e => e.choke && e.damp) && !byOpt[1].parts.drums.some(e => e.choke));
require(R + "band/notation.js");
const abcN = BandNotation.toAbc(byOpt, { show: { comp: false, bass: false, drums: true } });
assert.strictEqual((abcN.match(/"\^choke"!staccato!/g) || []).length, 1, "one grab written");
assert(!/choke/.test(BandNotation.toAbc(gen(PLAIN, { groove: "rock", feel: "straight", ride: "hat" }, 4), { show: { comp: false, bass: false, drums: true } })), "nothing written without one");
console.log("GRABBED CYMBAL OK");
