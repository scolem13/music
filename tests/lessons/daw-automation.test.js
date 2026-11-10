// Volume automation in the Mini DAW (track.auto.vol, MiniDaw.autoAt / autoToCc, MIDI CC 7 out and back). NEG=1 must fail.
// node tests/lessons/daw-automation.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
const win = { document: { addEventListener() {}, querySelectorAll() { return []; } }, localStorage: null };
win.window = win; vm.createContext(win);
for (const f of ['apps/shared/band/midi.js', 'apps/shared/daw/mini-daw.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), win, { filename: f });
const D = win.MiniDaw, NEG = process.env.NEG === '1';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-9);

// 1. the level at a beat: held at the ends, a straight line in dB between points
const pts = [{ t: 4, v: -12 }, { t: 8, v: 0 }, { t: 16, v: -6 }];
ok(D.autoAt(pts, 0) === -12 && D.autoAt(pts, 4) === -12, 'held at the first point\'s level before it');
ok(near(D.autoAt(pts, 6), -6), 'halfway between -12 and 0 is -6');
ok(near(D.autoAt(pts, 12), -3) && D.autoAt(pts, 40) === -6, 'a line down to -6, then held after the last point');
ok(D.autoAt([], 3) === null, 'no points: null (the fader applies)');

// 2. dB <-> CC 7 (GM2: dB = 40 log10(cc / 127))
ok(D.dbToCc(0) === 127 && D.dbToCc(6) === 127, '0 dB (and above) is CC 127');
ok(D.dbToCc(-6) === 90 && D.dbToCc(-60) === 0, '-6 dB is CC 90 (127 x 10^(-6/40)), -60 is CC 0');
ok(near(D.ccToDb(127), 0) && near(D.ccToDb(90), -6, 0.05), 'and back');

// 3. export: CC 7 events on the track's channel; a ramp changes about every sixteenth
const ev = D.autoToCc([{ t: 0, v: -30 }, { t: 4, v: 0 }], 480);
ok(ev[0].tick === 0 && ev[0].v === D.dbToCc(-30), 'the first level at tick 0');
ok(ev[ev.length - 1].tick === 4 * 480 && ev[ev.length - 1].v === 127, 'the last point at its tick');
ok(ev.length > 8 && ev.every((e, i) => i === 0 || (e.v > ev[i - 1].v && e.tick > ev[i - 1].tick)), 'a rising ramp: strictly rising values at rising times (' + ev.length + ' events)');

// 4. through a MIDI file and back
const p = D.PRESETS.song(); p.tempo = 100;
p.tracks[1].auto = { vol: [{ t: 0, v: -20 }, { t: 8, v: -20 }, { t: 12, v: -3 }, { t: 24, v: -3 }, { t: 28, v: -40 }] };
p.tracks[0].vol = -9;                                   // no automation: no CC, nothing to read back
const r = D.fromMidi(D.toMidi(p)), bass = r.project.tracks[1];
if (NEG && bass.auto) bass.auto.vol.pop();             // NEG: lose the last point, as if the export dropped it
ok(bass.auto && bass.auto.vol.length >= 4 && bass.auto.vol.length <= 7, 'the bass comes back with automation (' + (bass.auto ? bass.auto.vol.length : 0) + ' points)');
let worst = 0; if (bass.auto) for (let b = 0; b <= 30; b += 0.5) worst = Math.max(worst, Math.abs(Math.max(-60, D.autoAt(bass.auto.vol, b)) - Math.max(-60, D.autoAt(p.tracks[1].auto.vol, b))));
ok(worst < 2.5, 'its levels match the original within 2.5 dB at every half beat (worst ' + worst.toFixed(2) + ')');
ok(!r.project.tracks[0].auto, 'a track without automation has none after the round trip');
ok(r.notes.some(n => /volume automation/.test(n)), 'the status says automation was read');
// a file whose CC 7 is one constant value (most are: volume 100 at the start) sets the fader instead
const q = D.PRESETS.song(); q.tracks[1].auto = { vol: [{ t: 0, v: -4 }] };
const c = D.fromMidi(D.toMidi(q)).project.tracks[1];
ok(!c.auto && Math.abs(c.vol - -4) <= 0.5, 'one constant CC 7 sets the track\'s fader (' + c.vol + ' dB), not a one-point lane');
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
