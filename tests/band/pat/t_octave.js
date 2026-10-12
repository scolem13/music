// opts.octave: one player's notes moved by whole octaves, in what the band writes (so in the sound, the notation and the MIDI file).
// node tests/band/pat/t_octave.js  -> "OCTAVE OK"
const fs = require("fs"), vm = require("vm"), assert = require("assert"), R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
for (const f of ["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/catalog.js", "band/player.js", "band/midi.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"));
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const parsed = TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "Bb7"z4 | "F7"z4 | "Cm7"z2 "F7"z2 | "Bb7"z4 | "Bdim7"z4 | "F7"z4 | "Am7"z2 "D7"z2 | "Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]');
const gen = octave => BandMidi.generate(parsed, { bars: 12, tempo: 120, opts: { feel: "swing", bassFeel: "walk", second: { comp: "guitar", compSound: "guitar", compRhythm: "four", voicing: "shell3" }, octave }, rng: mb(7) });
const notes = (bars, p) => bars.flatMap(b => (b.parts[p] || []).flatMap(e => e.midis ? e.midis : e.midi != null ? [e.midi] : []));
const base = gen(null);
assert.ok(notes(base, "bass").length > 20 && notes(base, "comp").length > 20 && notes(base, "comp2").length > 20);
for (const [part, n] of [["bass", 1], ["bass", -1], ["comp", 2], ["comp", -1], ["comp2", 1]]) {
  const moved = gen({ [part]: n });
  for (const p of ["bass", "comp", "comp2"]) assert.deepStrictEqual(notes(moved, p), notes(base, p).map(m => m + (p === part ? 12 * n : 0)), part + " " + n + ": " + p);
  assert.deepStrictEqual(moved.map(b => b.parts.drums.length), base.map(b => b.parts.drums.length));
}
assert.deepStrictEqual(notes(gen({ bass: 0, comp: 0 }), "comp"), notes(base, "comp"));
console.log("OCTAVE OK");
