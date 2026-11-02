// The Mini DAW's MIDI reader (MiniDaw.fromMidi): its own export and the band's export read back. NEG=1 must fail.
// node tests/lessons/daw-midi.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
const win = { document: { addEventListener() {}, querySelectorAll() { return []; } }, localStorage: null };
win.window = win; vm.createContext(win);
for (const f of ['apps/shared/band/midi.js', 'apps/shared/daw/mini-daw.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), win, { filename: f });
const D = win.MiniDaw, NEG = process.env.NEG === '1';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };

// 1. the DAW's own export comes back the same
const p = D.PRESETS.song(); p.tempo = 104;
const r = D.fromMidi(D.toMidi(p));
ok(r.project.tempo === 104, 'tempo read back (' + r.project.tempo + ')');
const midiTracks = p.tracks.filter(t => t.inst !== 'audio');
ok(r.project.tracks.length === midiTracks.length, 'one track per track (' + r.project.tracks.length + ')');
midiTracks.forEach((t, i) => {
  const back = r.project.tracks[i], want = [];
  t.clips.forEach(c => c.notes.forEach(n => { if (n.t < c.len) want.push((c.start + n.t).toFixed(3) + ':' + n.m); }));
  const got = back.clips[0].notes.map(n => n.t.toFixed(3) + ':' + n.m);
  if (NEG) got.pop();
  ok(back.inst === t.inst, t.name + ': instrument ' + back.inst);
  ok(want.sort().join() === got.sort().join(), t.name + ': ' + want.length + ' notes at the same times and pitches');
});

// 2. the band's export (format 1, tempo track, drums on channel 10, swing in the timing)
const bar = (i) => ({ bar: i, index: i, beats: 4, tempo: 90, opts: { swing: false, bassSound: 'electric', compSound: 'piano' },
  parts: { bass: [{ pos: 0, midi: 40, dur: 1, vel: 0.8 }, { pos: 2, midi: 47, dur: 1 }], comp: [{ pos: 0, midis: [52, 56, 59], dur: 2, inst: 'piano' }],
    drums: [{ pos: 0, piece: 'kick' }, { pos: 1, piece: 'snare' }, { pos: 1.5, piece: 'hatClosed' }, { pos: 3, piece: 'cowbell' }],
    congas: [{ pos: 0, piece: 'congaOpen' }, { pos: 2, piece: 'tumbaOpen' }] } });
const band = D.fromMidi(win.BandMidi.build([bar(0), bar(1), bar(2)], { parts: ['bass', 'comp', 'drums', 'congas'] }));
const by = Object.fromEntries(band.project.tracks.map(t => [t.inst, t]));
ok(band.project.tempo === 90 && band.project.bars === 3, 'band: 90 BPM, 3 bars');
ok(by.ebass && by.ebass.clips[0].notes.length === 6 && by.ebass.clips[0].notes[1].t === 2, 'band: electric bass, 6 notes, the 2nd on beat 3');
ok(by.piano && by.piano.clips[0].notes.length === 9 && by.piano.clips[0].notes[0].d === 2, 'band: piano chords, held two beats');
ok(by.kit && by.kit.clips[0].notes.filter(n => n.m === 'snare').length === 3, 'band: kit with its snares');
ok(by.congas && by.congas.clips[0].notes.length === 6, 'band: congas a track of their own');
ok(band.notes.some(n => /left out/.test(n)), 'band: the cowbell (no kit piece here) reported as left out');

// 3. not a MIDI file
let threw = false; try { D.fromMidi(new Uint8Array([1, 2, 3])); } catch (e) { threw = true; } ok(threw, 'junk refused');
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
