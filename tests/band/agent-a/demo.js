const { mulberry32, CH, abcOf } = require('./load.js'); const H = BandHarmony;
const form = H.buildForm(TuneChart.parse(abcOf(CH.jazz, 'Jazz blues')), 0);
const bass = BandBass.create({ rng: mulberry32(42) }), comp = BandComp.create({ rng: mulberry32(43) });
let prevV = null;
console.log('bar chords      voicing (rootless, voice-led)            bass (walk)        comp hits (pos:dur chord-voiced)');
form.forEach((b, i) => { const ctx = { bar: i, index: i, length: 12, chorus: 0, beats: 4, chords: b.chords, nextChords: form[(i+1)%12].chords, tempo: 120, last: false, opts: {} };
  const vs = b.chords.map(c => { prevV = H.voicing(c.chord, 'rootless', prevV); return prevV.map(H.noteName).join(' '); }).join(' | ');
  const eb = bass.bar(ctx), ec = comp.bar(ctx);
  console.log(String(i+1).padStart(2), b.chords.map(c => c.chord.label).join(' ').padEnd(10), vs.padEnd(40), eb.map(e => H.noteName(e.midi).padEnd(4)).join(''), ' ', ec.map(e => e.pos + ':' + e.dur + ' ' + e.midis.map(H.noteName).join('-')).join('  ') || '(space)'); });
