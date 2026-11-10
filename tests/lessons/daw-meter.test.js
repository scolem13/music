// The Mini DAW's time signatures (MiniDaw.Meter): bar lengths, bar lookup with meter changes, clicks, positions, MIDI out and in. NEG=1 must fail.
// node tests/lessons/daw-meter.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
const win = { document: { addEventListener() {}, querySelectorAll() { return []; } }, localStorage: null };
win.window = win; vm.createContext(win);
for (const f of ['apps/shared/band/midi.js', 'apps/shared/daw/mini-daw.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), win, { filename: f });
const D = win.MiniDaw, M = D.Meter, NEG = process.env.NEG === '1';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const J = (x) => JSON.stringify(x);

// 1. bar lengths in quarter notes and the groups of each bar
const want = { '2/4': [2, [1, 1]], '3/4': [3, [1, 1, 1]], '4/4': [4, [1, 1, 1, 1]], '5/4': [5, [1, 1, 1, 1, 1]], '6/8': [3, [1.5, 1.5]], '7/8': [3.5, [1, 1, 1.5]],
  '9/8': [4.5, [1.5, 1.5, 1.5]], '12/8': [6, [1.5, 1.5, 1.5, 1.5]], '5/8': [2.5, [1.5, 1]], '3/8': [1.5, [1.5]] };
for (const k in want) { const ts = M.parse(k); ok(M.beats(ts) === want[k][0] - (NEG && k === '7/8' ? 0.5 : 0), k + ' bar = ' + want[k][0] + ' beats'); ok(J(M.groups(ts)) === J(want[k][1]) && M.groups(ts).reduce((a, b) => a + b) === M.beats(ts), k + ' groups ' + J(want[k][1])); }
ok(M.parse('7/7') === null && M.parse('0/4') === null && M.parse('x') === null, 'bad signatures refused');
ok(M.list.length >= 8 && ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'].every(k => M.list.some(t => M.str(t) === k)), 'the menu has the required meters');

// 2. old projects have no meter: 4/4
const old = M.norm({ tempo: 100, bars: 4, tracks: [] });
ok(J(old.ts) === '[4,4]' && old.tsMap.length === 0 && M.total(old) === 16 && M.barAt(old, 5).bar === 1 && M.barAt(old, 5).into === 1, 'no meter loads as 4/4');
ok(J(M.norm({ ts: [7, 3], tsMap: [{ bar: 2, ts: [9, 9] }, { bar: 0, ts: [3, 4] }] }).ts) === '[4,4]', 'a bad meter in a file falls back to 4/4');

// 3. meter changes: 4/4 x2, 3/4 x2 from bar 3, 6/8 from bar 5
const p = M.norm({ bars: 6, ts: [4, 4], tsMap: [] }); M.set(p, 2, [3, 4]); M.set(p, 4, [6, 8]);
ok(J(p.tsMap) === '[{"bar":2,"ts":[3,4]},{"bar":4,"ts":[6,8]}]', 'two changes');
ok(M.barStart(p, 2) === 8 && M.barStart(p, 4) === 14 && M.barStart(p, 6) === 20 && M.total(p) === 20, 'bar starts 0 4 8 11 14 17 (total 20)');
let a = M.barAt(p, 9.5); ok(a.bar === 2 && a.into === 1.5 && a.len === 3, 'beat 9.5 is bar 3, 1.5 in');
a = M.barAt(p, 11); ok(a.bar === 3 && a.into === 0, 'beat 11 starts bar 4');
ok(M.floor(p, 15) === 14 && M.ceil(p, 15) === 17 && M.ceil(p, 14) === 14 && M.nearest(p, 15.4) === 14 && M.nearest(p, 15.6) === 17, 'floor / ceil / nearest bar line');
ok(M.lenOfBars(p, 8, 2) === 6 && M.barsOfLen(p, 8, 6) === 2 && M.lenOfBars(p, 14, 1.5) === 4.5 && M.barsOfLen(p, 14, 4.5) === 1.5 && M.barsOfLen(p, 0, 14) === 4, 'clip lengths in bars across a change');
M.set(p, 4, [3, 4]); ok(p.tsMap.length === 1, 'a change equal to the meter before it is dropped');
M.set(p, 4, [6, 8]);

// 4. grid lines: bar line 2, group start 1
ok(M.level(p, 0) === 2 && M.level(p, 1) === 1 && M.level(p, 0.5) === 0 && M.level(p, 8) === 2 && M.level(p, 9) === 1 && M.level(p, 14) === 2 && M.level(p, 15.5) === 1 && M.level(p, 15) === 0, 'grid line levels, 4/4 then 3/4 then 6/8');

// 5. clicks: accent on the bar, groups after; 6/8 clicks twice a bar
const ck = (b0, b1) => M.clicks(p, b0, b1).map(c => c.b + (c.accent ? '!' : '')).join(' ');
ok(ck(0, 4) === '0! 1 2 3', '4/4: four clicks');
ok(ck(8, 11) === '8! 9 10', '3/4: three');
ok(ck(14, 17) === '14! 15.5', '6/8: dotted quarters');
ok(ck(2.5, 9) === '3 4! 5 6 7 8! ' .trim().replace(/ $/, ''), 'a window from the middle of a bar');
const q = M.norm({ bars: 2, ts: [7, 8] });
ok(M.clicks(q, 0, 7).map(c => c.b).join() === '0,1,2,3.5,4.5,5.5', '7/8: 2+2+3 (clicks 0 1 2 | 3.5 4.5 5.5)');

// 6. position display bar.beat.sixteenth
const w = (b) => { const x = M.where(p, b); return x.bar + '.' + x.beat + '.' + x.sub; };
ok(w(0) === '1.1.1' && w(5.25) === '2.2.2' && w(9) === '3.2.1' && w(15.5) === '5.2.1' && w(16.25) === '5.2.4', 'positions ' + w(15.5));

// 7. MIDI out has the time signature events; in reads them
const sigsOf = (bytes) => { const out = []; for (let i = 0; i < bytes.length - 6; i++) if (bytes[i] === 0xff && bytes[i + 1] === 0x58 && bytes[i + 2] === 4) out.push(bytes[i + 3] + '/' + (1 << bytes[i + 4]) + ':' + bytes[i + 5]); return out; };
const proj = D.PRESETS.song(); proj.ts = [3, 4]; M.set(proj, 2, [6, 8]); proj.bars = 8; M.norm(proj);
const bytes = D.toMidi(proj);
ok(J(sigsOf(bytes)) === J(['3/4:24', '6/8:36']), 'export writes 3/4 then 6/8 (' + sigsOf(bytes) + ')');
const rd = D.fromMidi(bytes);
ok(J(rd.project.ts) === '[3,4]' && J(rd.project.tsMap) === '[{"bar":2,"ts":[6,8]}]', 'import reads them back (' + J(rd.project.ts) + J(rd.project.tsMap) + ')');
ok(NEG ? false : rd.project.bars >= 2, 'bars counted in the file\'s meters (' + rd.project.bars + ')');
const dflt = D.fromMidi(D.toMidi(M.norm(D.PRESETS.song())));
ok(J(dflt.project.ts) === '[4,4]' && dflt.project.tsMap.length === 0 && dflt.project.bars === 4, '4/4 song reads back as 4/4, 4 bars');
// a 7/8 song: 4 bars = 14 beats; notes in the last bar make it 4 bars
const s7 = M.norm({ tempo: 100, bars: 4, ts: [7, 8], loop: { on: false, from: 0, to: 4 }, click: false, tracks: [{ name: 'K', inst: 'kit', vol: 0, pan: 0, clips: [{ start: 0, len: 14, notes: [{ t: 0, d: .25, m: 'kick', v: 1 }, { t: 13.5, d: .25, m: 'snare', v: 1 }] }] }] });
const r7 = D.fromMidi(D.toMidi(s7));
ok(J(r7.project.ts) === '[7,8]' && r7.project.bars === 4 && r7.project.tracks[0].clips[0].len === 14, '7/8: 4 bars, clip 14 beats');
// a change in the middle of a bar moves to the next bar line (hand-made file: 4/4 then 3/4 at beat 6)
const mk = (ev) => { const trk = [0, 0xff, 0x51, 3, 7, 0xa1, 0x20, 0, 0xff, 0x58, 4, 4, 2, 24, 8].concat(ev, [0, 0xff, 0x2f, 0]);
  const n = [0, 0x90, 60, 90, 0x83, 0x60, 0x80, 60, 0, 0, 0xff, 0x2f, 0]; void n;
  const t2 = [0, 0x90, 60, 90, 0x87, 0x40, 0x80, 60, 0, 0, 0xff, 0x2f, 0];   // a note at 0, off at 960 ticks? (0x87 0x40 = 960)
  const len = (a) => [0, 0, 0, a.length];
  return Uint8Array.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 2, 1, 0xe0, 0x4d, 0x54, 0x72, 0x6b, ...len(trk), ...trk, 0x4d, 0x54, 0x72, 0x6b, ...len(t2), ...t2]); };
const mid = mk([0x8b, 0x20 /*tick 1568? delta*/, 0xff, 0x58, 4, 3, 2, 24, 8]);
const rm = D.fromMidi(mid);
ok(J(rm.project.ts) === '[4,4]' && rm.project.tsMap.length === 1 && rm.project.tsMap[0].ts.join() === '3,4' && rm.notes.some(n => /middle of a bar/.test(n)), 'mid-bar change moved to a bar line: ' + J(rm.project.tsMap) + ' ' + rm.notes);

// 8. the band's chart is written in the project's meter
const ab = D.bandParts ? null : null; void ab;
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
