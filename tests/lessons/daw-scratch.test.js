// The Mini DAW scratch pad's logic: several projects (index, migrate, rename, delete), clipboard note maths, zoom steps. NEG=1 must fail.
// node tests/lessons/daw-scratch.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
const win = { document: { readyState: 'loading', addEventListener() {}, querySelectorAll() { return []; } }, localStorage: null, SK_NO_BAR: true, addEventListener() {}, requestAnimationFrame() {} };
win.window = win; vm.createContext(win);
for (const f of ['apps/shared/band/midi.js', 'apps/shared/lessons/synth-kit.js', 'apps/shared/daw/mini-daw.js', 'apps/shared/daw/track-sound.js', 'apps/shared/abc-core.js', 'apps/shared/abc-events.js', 'apps/shared/daw/abc-clip.js', 'apps/shared/band/harmony.js', 'apps/shared/band/phrase.js', 'apps/shared/band/style-engine.js', 'apps/shared/band/arranger-styles.js', 'apps/shared/motif-arp.js', 'apps/shared/daw/compose-tools.js', 'apps/shared/daw/nav-tools.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), win, { filename: f });
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

// 11. Edit as notation: clip -> ABC -> notes is the quantised clip, bars the right length (rule 1)
const AC = win.AbcClip, CP = D.Compose, Mt = D.core.Meter;
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let rtBad = 0, rtN = 0, barBad = 0, maxVoices = 0;
const sig = ns => ns.map(n => [Math.round(n.t * 1e4) / 1e4, Math.round(n.d * 1e4) / 1e4, n.m].join(':')).sort().join(' ');
[[[4, 4], 'C'], [[3, 4], 'Bb'], [[6, 8], 'auto'], [[7, 8], 'F#'], [[5, 8], 'Eb'], [[2, 4], 'auto'], [[12, 8], 'D']].forEach(([ts, key]) => {
  for (let trial = 0; trial < 12; trial++) {
    const bb = ts[0] * 4 / ts[1], bars = 1 + Math.floor(rnd() * 3), len = bars * bb - (trial % 3 === 0 ? bb * 0.4 : 0), notes = [], k = 2 + Math.floor(rnd() * 14);
    for (let i = 0; i < k; i++) { const t = Math.floor(rnd() * len * 4) / 4, d = (1 + Math.floor(rnd() * 14)) / 4; notes.push({ t, d, m: 36 + Math.floor(rnd() * 50), v: 0.3 + rnd() * 0.6 });
      if (rnd() < 0.3) notes.push({ t, d, m: notes[notes.length - 1].m + 4, v: 0.5 }); }
    const clip = { start: 0, len, notes }, o = { ts, key }, r = AC.clipToAbc(clip, o), q = AC.quantise(clip, o), back = AC.abcToNotes(r.abc), ck = AC.checkBars(r.abc);
    const want = q.notes.map(n => ({ t: n.s * q.g, d: (n.e - n.s) * q.g, m: n.m }));
    if (NEG && trial === 0 && key === 'C') back.notes[0].m += 1;
    rtN++; if (sig(want) !== sig(back.notes)) { rtBad++; if (rtBad < 3) console.log('  mismatch', ts, key, '\n' + r.abc, '\nwant', sig(want), '\ngot ', sig(back.notes)); }
    if (ck.bad.length) { barBad++; if (barBad < 3) console.log('  bad bars', JSON.stringify(ck.bad), '\n' + r.abc); }
    maxVoices = Math.max(maxVoices, r.voices);
  } });
ok(rtBad === 0, 'round trip clip -> ABC -> notes equals the quantised clip in 7 meters / keys (' + rtN + ' random clips, ' + rtBad + ' differ)');
ok(barBad === 0 && maxVoices > 1, 'every bar of every voice has the meter\'s length by script (' + barBad + ' bad); overlapping notes used up to ' + maxVoices + ' voices');
const off = AC.clipToAbc({ start: 0, len: 4, notes: [{ t: 0.1, d: 1, m: 60, v: 1 }, { t: 1, d: 1, m: 64, v: 1 }] }, { ts: [4, 4] });
ok(off.offGrid === 1 && /^C4 /m.test(off.abc.split('\n').pop() === '' ? off.abc.split('\n').slice(-2)[0] : ''), 'a note off the 1/16 grid is counted and snapped (' + off.offGrid + ')');
const chordTie = AC.clipToAbc({ start: 0, len: 8, notes: [60, 64, 67].map(m => ({ t: 2, d: 4, m, v: 1 })) }, { ts: [4, 4] });
ok(/\[CEG\]8-\[CEG\]4|\[CEG\]8-\[CEG\]/.test(chordTie.abc.replace(/\n/g, ' ')) || /\[CEG\]\d+-/.test(chordTie.abc), 'a chord across the bar line is a tied [CEG] (' + chordTie.abc.split('\n').slice(-2)[0] + ')');
ok(AC.abcToNotes(chordTie.abc).notes.length === 3 && AC.abcToNotes(chordTie.abc).notes[0].d === 4, 'and reads back as three notes of four beats');
const wrong = AC.checkBars('X:1\nM:4/4\nL:1/16\nK:C\nC16 | C12 | C16 |]\n'); ok(wrong.bad.length === 1 && wrong.bad[0].bar === 2, 'a short middle bar is reported (bar ' + (wrong.bad[0] && wrong.bad[0].bar) + ')');
ok(AC.checkBars('X:1\nM:4/4\nL:1/16\nK:C\nC16 | C12 |]\n').bad.length === 0, 'a short last bar is allowed');
const mg = AC.merge([{ t: 0, d: 1, m: 60, v: 0.9 }, { t: 1, d: 1, m: 62, v: 0.3 }], [{ t: 0, d: 1, m: 60 }, { t: 2, d: 1, m: 64 }, { t: 1, d: 1, m: 63 }], 0.25);
ok(mg[0].v === 0.9 && mg[1].v === 0.6 && mg[2].v === 0.6, 'velocity kept where pitch and start match, else the mean of the clip (' + mg.map(n => n.v) + ')');
const SPABC = 'X:1\nM:4/4\nL:1/16\nK:C\nC4 [CE]4 z8 |\n', nsp = AC.noteSpans(SPABC);
ok(nsp.length === 2 && SPABC.slice(nsp[1].start, nsp[1].end) === '[CE]' && nsp[1].t === 1 && nsp[1].notes.length === 2, 'staff clicks map to notes (span "' + (nsp[1] && SPABC.slice(nsp[1].start, nsp[1].end)) + '")');
// 12. Fill from chords: plan, arp, arranger
const pp = Mt.norm(D.PRESETS.empty()), ch = CP.parseChart('Dm7 G7 | Cmaj7 |');
ok(ch.length === 2 && ch[0].length === 2, 'chart: bars split by |, chords split by spaces');
const pl = CP.plan(pp, 0, 4, ch);
ok(pl.len === 16 && pl.spans.length === 6 && pl.spans[1].t0 === 2 && pl.spans[2].bar === 1 && pl.chartText === 'Dm7 G7 | Cmaj7 | Dm7 G7 | Cmaj7', 'plan: 4 bars, the chart cycles, two chords share a bar (' + pl.chartText + ')');
const co = CP.chordOf('Dm7'); ok(co.root === 2 && co.type === 'm7' && CP.chordOf('G7').type === '7' && CP.chordOf('Cmaj7').type === 'M7' && CP.chordOf('Bm7b5').type === 'm7b5' && CP.chordOf('N.C.') === null, 'chord symbols as arranger chords');
const pcs = (ns, a, b) => [...new Set(ns.filter(n => n.t >= a && n.t < b).map(n => n.m % 12))].sort((x, y) => x - y).join();
const ar = CP.fillNotes({ kind: 'arp', type: 0, unit: 100, oct: 0 }, CP.plan(pp, 0, 2, CP.parseChart('Dm7 | G7')));
ok(ar.kind === 'notes' && ar.notes.length === 32 && ar.notes.every(n => n.t >= 0 && n.t + n.d <= 8 + 1e-9) && pcs(ar.notes, 0, 4) === '0,2,5,9' && pcs(ar.notes, 4, 8) === '2,5,7,11', 'arp: 16ths on each chord\'s own notes, restarted at the chord (' + ar.notes.length + ' notes, ' + pcs(ar.notes, 0, 4) + ' / ' + pcs(ar.notes, 4, 8) + ')');
const dr = CP.fillNotes({ kind: 'arp', type: 10, unit: 100, oct: 0 }, CP.plan(pp, 0, 2, CP.parseChart('C')));
ok(dr.kind === 'drum' && dr.inst === 'kit' && dr.notes.some(n => n.m === 'kick'), 'a drum arp gives kit pieces');
const ab = CP.fillNotes({ kind: 'arranger', style: 'pop8', section: 'Main A', channel: 'Bass' }, CP.plan(pp, 0, 4, CP.parseChart('Dm7 | G7 | Cmaj7 | Am7')));
const bpc = b => ab.notes.filter(n => n.t >= b * 4 && n.t < b * 4 + 0.01).map(n => n.m % 12)[0];
ok(ab.kind === 'notes' && /bass/.test(ab.inst) && bpc(0) === 2 && bpc(1) === 7 && bpc(2) === 0 && bpc(3) === 9, 'arranger: the bass line follows the chords (roots ' + [0, 1, 2, 3].map(bpc) + ')');
const ad = CP.fillNotes({ kind: 'arranger', style: 'pop8', section: 'Main A', channel: 'Rhythm1' }, CP.plan(pp, 0, 4, CP.parseChart('C')));
ok(ad.kind === 'drum' && ad.notes.length > 8 && ad.notes.every(n => typeof n.m === 'string'), 'arranger drum channel gives pieces');
const cn = CP.chordsFromNotes([{ t: 0, d: 4, m: 50 }, { t: 0, d: 4, m: 53 }, { t: 0, d: 4, m: 57 }, { t: 0, d: 4, m: 60 }, { t: 4, d: 4, m: 43 }, { t: 4, d: 4, m: 47 }, { t: 4, d: 4, m: 50 }, { t: 8, d: 1, m: 40 }], 4, 3);
ok(cn.join() === 'Dm7,G,G', 'chords read from notes: Dm7, G, and a bar with too few notes repeats (' + cn.join() + ')');
try { CP.plan(pp, 3, 3, ch); ok(false, 'an empty range is refused'); } catch (e) { ok(/after/.test(e.message), 'an empty range is refused'); }

// 13. keyboard step, loop in beats (nav-tools.js)
const Nv = D.Nav, np = Mt.norm(D.PRESETS.empty());
ok(Nv.move(np, 'beat', 0, 1, 1) === 1 && Nv.move(np, 'beat', 2.3, 1, 1) === 3 && Nv.move(np, 'beat', 2.3, -1, 1) === 2 && Nv.move(np, 'beat', 2, -1, 3) === 0, 'beat step: lands on beats, from between beats too, never below 0');
ok(Nv.move(np, 'sixteenth', 1, 1, 3) === 1.75 && Nv.move(np, 'beat', 1, 1, 1, true) === 4 && Nv.move(np, 'bar', 5, -1, 1) === 4 && Nv.move(np, 'bar', 4, -1, 1) === 0, 'sixteenth step, Shift = a bar, bar step goes to bar lines');
const np2 = Mt.norm(D.PRESETS.empty()); np2.ts = [3, 4]; ok(Nv.move(np2, 'bar', 0, 1, 2) === 6, 'a bar in 3/4 is three beats');
ok(Nv.snap(np, 'beat', 2.4) === 2 && Nv.snap(np, 'beat', 2.6) === 3 && Nv.snap(np, 'sixteenth', 2.4) === 2.5 && Nv.snap(np, 'bar', 6.1) === 8 && Nv.snap(np, 'bar', 5.1) === 4, 'snap to the step');
const nc = { len: 4, notes: [{ t: 0, d: 1, m: 60, v: 1 }, { t: 1.5, d: 1, m: 62, v: 1 }, { t: 3, d: 1, m: 64, v: 1 }] };
let used = Nv.moveNotes(nc, [0, 1], 1); ok(used === 1 && nc.notes[0].t === 1 && nc.notes[1].t === 2.5 && nc.notes[2].t === 3, 'selected notes move by the step, others stay');
used = Nv.moveNotes(nc, [0, 1], 5); ok(nc.notes[1].t === 3.99 && nc.notes[0].t === 2.49, 'notes stop at the clip end, keeping their spacing (' + nc.notes.map(n => n.t) + ')');
used = Nv.moveNotes(nc, [0, 1], -9); ok(nc.notes[0].t === 0 && Math.abs(nc.notes[1].t - 1.5) < 1e-9, 'and at the clip start');
const lo = Nv.loopOf(np, 5, 9.5, true); ok(lo.fb === 5 && lo.tb === 9.5 && lo.from === 1 && lo.to === 3 && lo.on, 'a loop in beats keeps the bars around it (bars ' + (lo.from + 1) + '-' + lo.to + ')');
const lp = { p: Object.assign({}, np, { loop: lo }), loopSpan: D.core.Daw.prototype.loopSpan }; const sp1 = D.core.Daw.prototype.loopSpan.call(lp), lr = D.core.Daw.prototype.loopRange.call(lp);
ok(sp1.join() === '5,9.5' && lr.join() === '5,9.5', 'loopSpan / loopRange use the beats');
lp.p.loop = { on: true, from: 1, to: 3 }; ok(D.core.Daw.prototype.loopRange.call(lp).join() === '4,12', 'an old bar-only loop still reads as whole bars');
lp.p.loop.on = false; ok(D.core.Daw.prototype.loopRange.call(lp) === null, 'a loop that is off gives no range');

// 14. the position readout: bar.beat.sixteenth in, beats out, honouring meter changes
const pm = Mt.norm(D.PRESETS.empty()); pm.bars = 8;
const pp0 = t => Mt.parsePos(pm, t);
ok(pp0('1').pos === 0 && pp0('3').pos === 8 && pp0('3.2').pos === 9 && pp0('3.2.3').pos === 9.5 && pp0('6.1.4').pos === 20.75 && pp0(' 2 : 4 : 4 ').pos === 7.75, 'position text: "6", "6.3", "6.1.4" (also : and spaces) in 4/4');
ok(['', 'x', '0', '9', '2.5', '2.1.5', '1.1.1.1', '-1'].every(t => typeof pp0(t).error === 'string') && /8 bars/.test(pp0('9').error) && /4 beats/.test(pp0('2.5').error), 'bad positions say why (' + pp0('2.5').error + ')');
Mt.set(pm, 2, [3, 4]); ok(pp0('3.1.1').pos === 8 && pp0('3.3.4').pos === 10.75 && /3 beats/.test(pp0('3.4').error) && pp0('4').pos === 11, 'a 3/4 bar from bar 3 on: bar 4 starts at beat 11, beat 4 is refused');
Mt.set(pm, 4, [6, 8]); ok(pp0('5.2').pos === Mt.barStart(pm, 4) + 1.5 && pp0('5.2.6').pos === Mt.barStart(pm, 4) + 1.5 + 1.25 && /6 sixteenths/.test(pp0('5.1.7').error) && /2 beats/.test(pp0('5.3').error), 'in 6/8 a beat is a dotted quarter (6 sixteenths), two beats a bar');
ok([0, 1.5, 9, 14.25, 21.5, 24.75].every(b => { const w = Mt.where(pm, b); return Math.abs(pp0(w.bar + '.' + w.beat + '.' + w.sub).pos - Math.floor(b * 4 + 1e-9) / 4) < 1e-9; }), 'parsePos reads back what the readout shows (Meter.where), in every meter');
if (NEG) ok(pp0('3').pos === 9, 'NEG: a wrong expectation must fail');
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
