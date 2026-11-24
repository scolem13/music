// The Mini DAW's Remix Lab presets (house, techno, remixflip): tempo, one track a layer, every clip a whole number of bars, notes inside their clips,
// drum pieces the kit has, and the MIDI export reads back. NEG=1 must fail.
// node tests/lessons/daw-remix-presets.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
const win = { document: { addEventListener() {}, querySelectorAll() { return []; } }, localStorage: null };
win.window = win; vm.createContext(win);
for (const f of ['apps/shared/band/midi.js', 'apps/shared/daw/mini-daw.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), win, { filename: f });
const D = win.MiniDaw, M = D.Meter, NEG = process.env.NEG === '1';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const PIECES = new Set(['kick', 'snare', 'rim', 'clap', 'hatClosed', 'hatOpen', 'tamb', 'ride', 'cowbell', 'crash']);
const want = {
  house: { tempo: 124, bars: 8, tracks: ['Kick', 'Clap', 'Closed hat', 'Open hat', 'Bass', 'Chord stabs'] },
  techno: { tempo: 130, bars: 8, tracks: ['Kick', 'Off-beat hat', 'Shaker', 'Ride', 'Rolling bass', 'Rim', 'Cowbell'] },
  remixflip: { tempo: 124, bars: 32, tracks: ['Kick', 'Clap', 'Hats', 'Bass', 'Chord stabs', 'Pad', 'Hook'] } };
for (const k in want) {
  const p = M.norm(D.PRESETS[k]()), w = want[k];
  ok(p.tempo === w.tempo + (NEG ? 1 : 0), k + ': ' + w.tempo + ' bpm');
  ok(p.bars === w.bars && M.total(p) === w.bars * 4, k + ': ' + w.bars + ' bars of 4/4');
  ok(p.tracks.map(t => t.name).join() === w.tracks.join(), k + ': tracks ' + w.tracks.join(', '));
  ok(p.tracks.every(t => t.clips.length > 0 && t.clips.every(c => c.start >= 0 && c.start + c.len <= w.bars * 4 && c.len % 4 === 0 && c.start % 4 === 0)), k + ': every clip is whole bars inside the song');
  ok(p.tracks.every(t => t.clips.every(c => c.notes.every(n => n.t >= 0 && n.t + n.d <= c.len + 1e-9 && n.v > 0 && n.v <= 1 && (D.core.isDrum(t) ? PIECES.has(n.m) : n.m >= 24 && n.m <= 96)))), k + ': notes inside their clips, kit pieces known');
  ok(p.tracks.every(t => { const cs = t.clips.slice().sort((a, b) => a.start - b.start); return cs.every((c, i) => !i || cs[i - 1].start + cs[i - 1].len <= c.start); }), k + ': no clips overlap on a track');
  const back = D.fromMidi(D.toMidi(p));
  ok(back.project.tracks.length > 0 && Math.round(back.project.tempo) === w.tempo, k + ': MIDI export reads back (' + back.project.tracks.length + ' tracks)');
}
const hs = M.norm(D.PRESETS.house()), kick = hs.tracks[0].clips[0].notes;
ok(kick.length === 32 && kick.every(n => n.t % 1 === 0), 'house kick: four on the floor, 32 hits in 8 bars');
const th = M.norm(D.PRESETS.techno()).tracks[4].clips[0].notes;
ok(th.length === 128 && new Set(th.map(n => n.m)).size === 1, 'techno bass: 16 sixteenths a bar on one note');
const rf = M.norm(D.PRESETS.remixflip());
const at = (name, bar) => rf.tracks.find(t => t.name === name).clips.some(c => c.start <= bar * 4 && bar * 4 < c.start + c.len);
ok(at('Kick', 0) && !at('Bass', 0) && !at('Clap', 0), 'remixflip intro: drums only');
ok(at('Bass', 8) && at('Clap', 8) && !at('Hook', 8), 'remixflip groove: bass and clap, no hook');
ok(at('Hook', 16) && !at('Kick', 16) && !at('Bass', 16) && at('Pad', 16), 'remixflip breakdown: hook and pad, no drums');
ok(at('Hook', 24) && at('Kick', 24) && at('Bass', 24), 'remixflip drop: everything');
const hook = rf.tracks.find(t => t.name === 'Hook').clips[0].notes;
ok(hook.length === 30 && hook[0].m === 64 && Math.abs(hook.reduce((a, n) => a + n.d, 0) - 32) < 1e-9, 'hook: Ode to Joy, two 4-bar phrases (32 beats)');
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
