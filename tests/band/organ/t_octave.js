// node tests/band/organ/t_octave.js — the tonewheel organ comps an octave above the piano (player.js / midi.js organUp): with the same
// seed, every organ chord note is its piano note + 12; opts.octave still adds on top; the church organ and the bass do not move.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const R = path.join(__dirname, "../../..") + "/apps/shared/";
const { mulberry32, CH, abcOf } = require('../agent-a/load.js');
vm.runInThisContext(fs.readFileSync(R + 'band/midi.js', 'utf8'), { filename: 'midi.js' });
const parsed = TuneChart.parse(abcOf(CH.jazz));
function notes(opts, part){
  const bars = BandMidi.generate(parsed, { bars: 8, tempo: 120, rng: mulberry32(7), opts: Object.assign({ comp: "piano" }, opts) });
  const out = []; bars.forEach(b => (b.parts && b.parts[part] || []).forEach(e => { if (e.midi != null) out.push(e.midi); (e.midis || []).forEach(m => out.push(m)); }));
  return out;
}
const piano = notes({ compSound: "piano" }, "comp"), organ = notes({ compSound: "hammond" }, "comp"), church = notes({ compSound: "organ" }, "comp");
if (process.env.NEG) organ[0] -= 12;
assert(piano.length > 10, "the piano comped: " + piano.length);
assert.deepEqual(organ, piano.map(m => m + 12), "organ = piano + 12");
assert.deepEqual(church, piano, "the church organ stays where it is");
assert.deepEqual(notes({ compSound: "hammond", octave: { comp: -1 } }, "comp"), piano, "opts.octave adds on top (-1 + 1 = 0)");
assert.deepEqual(notes({ compSound: "hammond" }, "bass"), notes({ compSound: "piano" }, "bass"), "the bass does not move");
console.log("ORGAN OCTAVE OK", piano.length, "notes");
