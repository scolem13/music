// The Mini DAW scratch pad's logic: several projects (index, migrate, rename, delete), clipboard note maths, zoom steps. NEG=1 must fail.
// node tests/lessons/daw-scratch.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
const win = { document: { readyState: 'loading', addEventListener() {}, querySelectorAll() { return []; } }, localStorage: null, SK_NO_BAR: true, addEventListener() {}, requestAnimationFrame() {} };
win.window = win; vm.createContext(win);
for (const f of ['apps/shared/band/midi.js', 'apps/shared/lessons/synth-kit.js', 'apps/shared/daw/mini-daw.js', 'apps/shared/daw/track-sound.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), win, { filename: f });
const D = win.MiniDaw, P = D.Projects, C = D.Clipboard, NEG = process.env.NEG === '1';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const mem = {}; const kv = { get: k => k in mem ? JSON.parse(mem[k]) : null, set: (k, v) => { mem[k] = JSON.stringify(v); }, del: k => { delete mem[k]; } };

// 1. migration: the old single project becomes the first one, untouched
kv.set('mdaw:s', { tempo: 99, bars: 4, tracks: [] });
let o = P.open(kv, 's', 1000);
ok(o.index.length === 1 && o.index[0].key === 'mdaw:s' && o.cur === 'mdaw:s', 'old project is the first, under its own key');
ok(kv.get('mdaw:s').tempo === 99, 'its data is untouched');
ok(P.open(kv, 's', 2000).index.length === 1, 'opening again does not migrate twice');
// 2. add, unique names, rename
const e2 = P.add(kv, 's', o.index, 'Project 1', { tempo: 120 }, 5000, 0.5);
ok(e2.name === 'Project 1 2' && e2.key !== 'mdaw:s' && kv.get(e2.key).tempo === 120, 'second project has its own key and a unique name');
P.rename(kv, 's', o.index, e2.key, '  Bass idea ');
ok(P.open(kv, 's').index[1].name === 'Bass idea', 'rename kept in the stored index');
P.rename(kv, 's', o.index, e2.key, 'Project 1');
ok(o.index[1].name === 'Project 1 2', 'rename to a taken name gets a number');
P.rename(kv, 's', o.index, e2.key, '');
ok(o.index[1].name === 'Untitled', 'empty name becomes Untitled');
// 3. current is remembered, and a stale key falls back
P.setCurrent(kv, 's', e2.key); ok(P.open(kv, 's').cur === e2.key, 'current remembered');
kv.set('mdaw:s:current', 'gone'); ok(P.open(kv, 's').cur === 'mdaw:s', 'unknown current falls back to the first');
// 4. delete
const r = P.remove(kv, 's', o.index, e2.key);
ok(r.next === 'mdaw:s' && kv.get(e2.key) === null && P.open(kv, 's').index.length === 1, 'delete removes the data and the index entry, next = the other');
const r2 = P.remove(kv, 's', o.index, 'mdaw:s');
ok(r2.next === null && P.open(kv, 's').index.length === 1, 'deleting the last leaves none to show (caller makes a blank; open() would re-make one)');

// 5. clipboard: notes relative to the earliest
const clip = { start: 4, len: 4, notes: [{ t: 1, d: 1, m: 60, v: .8 }, { t: 2.5, d: .5, m: 64, v: .6 }, { t: 3, d: 2, m: 67, v: .7 }, { t: 0, d: 1, m: 40, v: 1 }] };
const cp = C.copyNotes(clip, [0, 1, 2], false);
ok(cp.notes.map(n => n.dt).join() === '0,1.5,2', 'offsets are from the earliest copied note (' + cp.notes.map(n => n.dt) + ')');
const tgt = { start: 0, len: 4, notes: [] };
if (NEG) cp.notes.forEach(n => { n.dt += 0.5; });   // a broken offset calculation must be caught
let ids = C.pasteNotes(tgt, cp, 1, 0.25);
ok(ids.length === 3 && tgt.notes.map(n => n.t).join() === '1,2.5,3', 'pasted at 1 beat in');
ok(tgt.notes[2].d === 1, 'the last note is cut to the clip end (' + tgt.notes[2].d + ')');
const tgt2 = { start: 0, len: 4, notes: [] }; ids = C.pasteNotes(tgt2, cp, 3, 0.25);
ok(ids.length === 1 && tgt2.notes.length === 1 && tgt2.notes[0].t === 3, 'notes starting past the clip end are dropped');
const t3 = { start: 0, len: 4, notes: [] }; C.pasteNotes(t3, cp, 0.3, 0.25); ok(t3.notes[0].t === 0.25, 'start snaps to the grid');
// 6. clipboard: clip paste extends the song, max 64 bars
const p = D.core.Meter.norm(D.PRESETS.empty()); p.bars = 4; const tr = { name: 't', inst: 'piano', clips: [] };
const cc = C.copyClip({ start: 0, len: 4, notes: [{ t: 0, d: 1, m: 60, v: 1 }] }, false, false);
const n1 = C.pasteClip(p, tr, cc, 16);
ok(n1.start === 16 && p.bars === 5 && tr.clips.length === 1, 'paste at bar 5 grows the song to 5 bars (' + p.bars + ')');
C.pasteClip(p, tr, cc, 4 * 70); ok(p.bars === 64, 'the song stops at 64 bars (' + p.bars + ')');
cc.clip.notes[0].m = 1; ok(tr.clips[0].notes[0].m === 60, 'a pasted clip is a copy');
// 7. zoom steps stay in range and reverse
ok(D.zoomBy(1, 1) > 1 && D.zoomBy(1, -1) < 1 && D.zoomBy(4, 1) === 4 && D.zoomBy(0.15, -1) === 0.15, 'zoom steps are clamped');
// 8. organ data: lanes, steps vs lines, CC 11
const O = D.TrackSound.Organ;
ok(O.barsStr('88x') === '880000000' && O.norm({ leslie: 'warp', swell: 4 }).leslie === 'slow' && O.norm({ swell: 4 }).swell === 1, 'organ settings are cleaned');
const ot = { organ: { swell: 0.2 }, auto: { vol: [], leslie: [{ t: 4, v: 'fast' }, { t: 8, v: 'stop' }], swell: [{ t: 0, v: 0 }, { t: 4, v: 1 }] } };
if (NEG) ot.auto.leslie[0].v = 'slow';
ok(O.at(ot, 3).leslie === 'fast' && O.at(ot, 4).leslie === 'fast' && O.at(ot, 8).leslie === 'stop', 'Leslie lane: steps, the first value holds before the first point');
ok(Math.abs(O.at(ot, 2).swell - 0.5) < 1e-9 && O.at(ot, 9).swell === 1, 'swell lane: straight lines, held after the last point');
ok(O.at({ organ: { swell: 0.2 } }, 3).swell === 0.2, 'no lane: the panel setting');
O.addPoint(ot, 'leslie', 4, 'slow'); ok(ot.auto.leslie.length === 2 && ot.auto.leslie[0].v === 'slow', 'a point at the same time replaces');
const sc = O.swellToCc(ot.auto.swell, 480); ok(sc[0].v === 0 && sc[sc.length - 1].v === 127 && sc[sc.length - 1].tick === 1920, 'swell exports as CC 11 0..127');
const t0 = { auto: { vol: [], swell: [{ t: 0, v: 1 }] } }; O.removePoint(t0, 'swell', 0); ok(t0.auto === undefined, 'last point removed drops auto');
// 9. effects data: settings are plain JSON, cleaned against SynthKit's tables; slots, sends, returns
const SKt = win.SynthKit, F = D.TrackSound.Fx;
ok(F.kinds().length === 11 && ['eq', 'compressor', 'distortion', 'amp', 'chorus', 'phaser', 'delay', 'reverb', 'tremolo', 'rotary', 'filter'].every(k => F.kinds().includes(k)), 'eleven effect kinds');
ok(F.kinds().every(k => { const d = SKt.fxDefaults(k); return JSON.stringify(JSON.parse(JSON.stringify(d))) === JSON.stringify(d) && Object.keys(d).length === SKt.FX[k].params.length; }), 'defaults are plain JSON, one per table entry');
const cl = SKt.fxClean('distortion', { drive: 1e6, shape: 'nonsense', tone: '3000', junk: 1 });
ok(cl.drive === 60 && cl.shape === 'soft' && cl.tone === 3000 && cl.junk === undefined, 'clean: clamp, bad pick -> default, strings read, unknown dropped');
if (NEG) F.MIX0.reverb = 1;
ok(F.norm({ kind: 'nope' }) === null && F.norm(null) === null && F.norm({ kind: 'reverb' }).mix === 0.35 && F.norm({ kind: 'eq' }).mix === 1, 'slot: unknown kind is empty, per-kind mix default');
const sl = F.norm({ kind: 'delay', bypass: true, mix: 0.5 }); const g = F.gains(sl); ok(g.wet === 0 && g.dry === 1 && F.gains(F.norm({ kind: 'delay', mix: 0.25 })).dry === 0.75, 'bypass is all dry; mix splits wet and dry');
ok(F.sends({ sends: { reverb: 3, delay: -1 } }).reverb === 1 && F.sends({}).delay === 0, 'sends are 0..1');
const rt = F.returns({ returns: { reverb: { params: { decay: 4 }, level: 0.3 } } }); ok(rt.reverb.params.decay === 4 && rt.reverb.level === 0.3 && rt.delay.level === 0.7, 'returns fill defaults');
ok(F.any({ tracks: [{ fx: [null, { kind: 'eq' }, null] }] }) && !F.any({ tracks: [{}] }), 'any effect or send in a project');
// 10. synth patches: plain JSON, cleaned against the table; instrument ids
const Sy = D.TrackSound.Synth;
ok(Sy.kindOf('syn-fm') === 'fm' && Sy.kindOf('piano') === null && SKt.SYN_KINDS().join() === 'subtractive,fm,wavetable,chip', 'synth kinds, and a sampled instrument is not one');
const sp = Sy.params({ inst: 'syn-sub', synth: { params: { cut: 1e9, w1: 'noise', fa: '0.5' } } });
ok(sp.cut === 16000 && sp.w1 === 'sawtooth' && sp.fa === 0.5 && sp.aa === 0.01, 'patch: clamp, bad pick -> default, defaults for the rest');
ok(SKt.SYN_KINDS().every(k => JSON.stringify(JSON.parse(JSON.stringify(SKt.synDefaults(k)))) === JSON.stringify(SKt.synDefaults(k))) && SKt.SYN.subtractive.presets.every(pr => Object.keys(SKt.synClean('subtractive', pr.set)).length === SKt.SYN.subtractive.params.length), 'defaults and presets are plain JSON');
if (NEG) sp.cut = 5;
ok(sp.cut === 16000, 'cutoff stays clamped');
const mp = D.core.Meter.norm(D.PRESETS.empty()); mp.tracks = ['syn-sub', 'syn-fm', 'syn-wt', 'syn-chip'].map(k => ({ name: k, inst: k, clips: [{ start: 0, len: 4, notes: [{ t: 0, d: 1, m: 60, v: .8 }] }] }));
const mb = Array.from(D.toMidi(mp)), progs = []; for (let i = 0; i < mb.length - 1; i++) if ((mb[i] & 0xf0) === 0xc0 && mb[i - 1] === 0 && mb[i + 1] <= 127 && mb[i + 2] === 0) progs.push(mb[i + 1]);
ok(D.INSTS.filter(i => i.synth).length === 4 && progs.join() === '81,5,88,80', 'MIDI export writes GM programs 81, 5, 88, 80 for the synths (' + progs + ')');
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
