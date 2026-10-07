// Several voicing styles at once ("a+b"): the band draws on all of them; guitar one-set styles top3 / mid3.
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js", "band/midi.js", "band/notation.js"].forEach(f => require(R + f));
const H = BandHarmony, V = ChordVoicings;
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ch = s => H.parseChord(s, 0), keys = l => new Set(l.map(c => c.midis.join()));
assert(H.hasStyle("guitar", "guide2+top3") && H.hasStyle("piano", "rootless+drop2+guide") && !H.hasStyle("guitar", "guide2+nonsense") && !H.hasStyle("piano", "auto+drop2") && !H.hasStyle("piano", "top3"));
assert(H.styleList("guitar").some(s => s.id === "top3") && H.styleList("guitar").some(s => s.id === "mid3"));
for (const sym of ["F7", "Bbmaj7", "Gm7", "C", "Am", "Bm7b5", "Cdim7"]){
  const c = ch(sym), a = H.candidates(c, "guide2", "guitar"), b = H.candidates(c, "top3", "guitar"), both = H.candidates(c, "guide2+top3", "guitar");
  assert(a.length && b.length, sym); assert.strictEqual(keys(both).size, new Set([...keys(a), ...keys(b)]).size, sym + ": the pool is the union");
  b.forEach(x => assert.deepStrictEqual(x.stringSet, [3, 4, 5], sym + " top3 on strings 3-2-1")); H.candidates(c, "mid3", "guitar").forEach(x => assert.deepStrictEqual(x.stringSet, [2, 3, 4]));
  assert(H.voicing(c, "guide2+top3", null, "guitar").length >= 2); assert(H.voicing(c, "rootless+drop2", null, "piano").length >= 3);
}
const parsed = TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "Bb7"z4 | "F7"z4 | "Cm7"z2 "F7"z2 | "Bb7"z4 | "Bdim7"z4 | "F7"z4 | "Am7"z2 "D7"z2 | "Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]');
for (const [inst, combo] of [["guitar", "guide2+top3"], ["piano", "rootless+guide"], ["guitar", "shell3+drop2+guide2"]]) for (const voiceMove of ["hold", "move"]){
  const sizes = {}; let n = 0;
  BandMidi.generate(parsed, { bars: 96, tempo: 140, opts: { comp: inst, voicing: combo, voiceMove, compRhythm: "charleston" }, rng: mb(8) }).forEach(r => r.parts.comp.forEach(e => { n++; sizes[e.midis.length] = (sizes[e.midis.length] || 0) + 1;
    assert(e.midis[0] >= 40 && e.midis[e.midis.length - 1] <= 84); }));
  console.log(inst.padEnd(7), combo.padEnd(20), voiceMove.padEnd(5), "notes per chord:", JSON.stringify(sizes));
  const share = Object.values(sizes).map(x => x / n); assert(Object.keys(sizes).length >= 2 && Math.min(...share) > 0.12, inst + " " + combo + " " + voiceMove + ": every ticked style is heard");
}
console.log("COMBO OK");
