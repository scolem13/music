const { mulberry32, CH, abcOf } = require('./load.js');
const H = BandHarmony; let fail = 0; const ok = (c, msg) => { if (!c){ fail++; if (fail < 25) console.log('FAIL', msg); } };
function run(chartKey, transpose, choruses, feel, seed, collect){
  const form = H.buildForm(TuneChart.parse(abcOf(CH[chartKey])), transpose);
  const bass = BandBass.create({ rng: mulberry32(seed) }); const out = [];
  for (let ch = 0; ch < choruses; ch++) for (let i = 0; i < form.length; i++){
    const ctx = { bar: ch*form.length+i, index: i, length: form.length, chorus: ch, beats: form[i].beats, chords: form[i].chords,
      nextChords: form[(i+1)%form.length].chords, tempo: 120, last: false, opts: { bassFeel: feel } };
    out.push({ ctx, ev: bass.bar(ctx) }); }
  return out;
}
const stats = { bars: 0, notes: 0, ivs: {}, appr: {}, beat1NonRoot: 0, staticBars: 0, lo: 99, hi: 0, sum: 0, chromPass: 0 };
const t0 = Date.now();
for (const chart of ['basic','quick','jazz']) for (let tr = 0; tr < 12; tr++){
  const bars = run(chart, tr, 200, 'walk', 1000 + tr*7 + chart.length);
  let prevNote = null, prevLastChord = null;
  bars.forEach(({ ctx, ev }, bi) => {
    stats.bars++;
    ok(ev.length === 4, `${chart} ${tr} bar ${bi}: ${ev.length} notes`);
    ev.forEach((e, k) => { stats.notes++; stats.lo = Math.min(stats.lo, e.midi); stats.hi = Math.max(stats.hi, e.midi); stats.sum += e.midi;
      ok(e.midi >= 28 && e.midi <= 55, `range ${e.midi}`); ok(e.pos === k && e.dur > 0.5 && e.dur <= 1 && e.vel > 0.6 && e.vel < 1, 'shape');
      if (prevNote != null){ const d = Math.abs(e.midi - prevNote); ok(d !== 0, `repeat ${chart} tr${tr} bar ${bi} beat ${k}`); ok(d <= 12, 'leap > octave ' + d); stats.ivs[d] = (stats.ivs[d]||0)+1;
        if (k === 0){ ok([1,2,5,7].includes(d), `approach interval ${d} ${chart} tr${tr} bar ${bi}`); stats.appr[d] = (stats.appr[d]||0)+1; } }
      const c = H.chordAt(ctx.chords, k);
      if (k === 0 || !H.sameChord(c, H.chordAt(ctx.chords, k-1))){ const changed = k > 0 || !H.sameChord(c, prevLastChord);
        if (changed) ok(e.midi % 12 === c.bass, `root on change ${chart} tr${tr} bar ${bi} beat ${k}: ${H.noteName(e.midi)} for ${c.label}`);
        else { stats.staticBars++; if (e.midi % 12 !== c.bass) stats.beat1NonRoot++; } }
      prevNote = e.midi; });
    prevLastChord = H.chordAt(ctx.chords, 3);
  });
}
console.log('walk:', stats.bars, 'bars,', stats.notes, 'notes in', Date.now()-t0, 'ms; range used', H.noteName(stats.lo), '-', H.noteName(stats.hi), 'mean', (stats.sum/stats.notes).toFixed(1));
const tot = Object.values(stats.ivs).reduce((a,b)=>a+b,0);
console.log('interval mix %:', Object.keys(stats.ivs).map(k => k + ':' + (100*stats.ivs[k]/tot).toFixed(1)).join(' '));
const ta = Object.values(stats.appr).reduce((a,b)=>a+b,0);
console.log('approach-into-bar mix %:', Object.keys(stats.appr).map(k => k + ':' + (100*stats.appr[k]/ta).toFixed(1)).join(' '));
console.log('beat 1 on a continuing chord: non-root', (100*stats.beat1NonRoot/stats.staticBars).toFixed(1) + '%');
// two-feel
let tn = 0, tb = 0, pick = 0;
for (const chart of ['basic','jazz']) for (let tr = 0; tr < 12; tr++){
  const bars = run(chart, tr, 100, 'two', 77 + tr); let prevEnd = -1, abs = 0;
  bars.forEach(({ ctx, ev }, bi) => { tb++; ok(ev.length >= 1 && ev.length <= 4, 'two count ' + ev.length); ok(ev[0].pos === 0 && ev[0].midi % 12 === H.chordAt(ctx.chords,0).bass || ev[0].pos === 0, 'two beat1');
    const c0 = H.chordAt(ctx.chords, 0); if (bi > 0 && !H.sameChord(c0, H.chordAt(bars[bi-1].ctx.chords, 3))) ok(ev[0].midi % 12 === c0.bass, `two root on change ${chart} tr${tr} bar ${bi}`);
    ev.forEach(e => { tn++; ok(e.midi >= 28 && e.midi <= 55, 'two range'); ok(e.pos >= 0 && e.pos < 4, 'two pos'); ok(abs*4 + e.pos >= prevEnd - 1e-9, `two overlap bar ${bi}`); prevEnd = abs*4 + e.pos + e.dur; if (e.pos > 2) pick++; });
    abs++; });
}
console.log('two-feel:', tb, 'bars,', (tn/tb).toFixed(2), 'notes/bar, bars with a pickup/walk-up note', pick);
// N.C., odd meters, ending, switching feel mid-way, key change mid-way
{ const bass = BandBass.create({ rng: mulberry32(5) });
  const f = H.buildForm(TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:C\n"C"z4 | "N.C."z4 | "F7"z2 "N.C."z2 | "G7/B"z4 | "C6"z "A7"z "Dm7"z "G7"z |]'), 0);
  let all = []; f.forEach((b, i) => { const ev = bass.bar({ bar:i, index:i, length:f.length, chorus:0, beats:b.beats, chords:b.chords, nextChords:f[(i+1)%f.length].chords, tempo:120, last:false, opts:{} }); all.push(ev); });
  ok(all[1].length === 0, 'NC bar rests'); ok(all[2].length === 2, 'half-bar NC: ' + all[2].length); ok(all[3][0].midi % 12 === 11, 'slash bass on beat 1'); ok(all[4].length === 4 && all[4].every((e,k)=> e.midi%12 === [0,9,2,7][k]), 'four chords: roots ' + all[4].map(e=>H.noteName(e.midi)));
  const end = bass.ending({ chords: f[0].chords }); ok(end.length === 1 && end[0].midi === 36 && end[0].dur >= 3.5, 'ending');
  const w = H.buildForm(TuneChart.parse('X:1\nM:3/4\nL:1/4\nK:C\n"Dm7"z3 | "G7"z3 | "Cmaj7"z3 | "A7b9"z3 |]'), 0); let n3 = 0;
  for (let r = 0; r < 50; r++) w.forEach((b, i) => { const ev = bass.bar({ bar:r*4+i, index:i, length:4, chorus:r, beats:b.beats, chords:b.chords, nextChords:w[(i+1)%4].chords, tempo:150, last:false, opts:{ bassFeel: r % 2 ? 'two' : 'walk' } }); n3 += ev.length; ev.forEach(e => ok(e.midi>=28&&e.midi<=55&&e.pos<3, '3/4')); });
  console.log('3/4 mixed feels notes', n3);
  const fa = H.buildForm(TuneChart.parse(abcOf(CH.jazz)), 0), fb = H.buildForm(TuneChart.parse(abcOf(CH.jazz)), 6); let last = null;
  for (let i = 0; i < 48; i++){ const f2 = (Math.floor(i/5) % 2) ? fb : fa, k = i % 12; const ev = bass.bar({ bar:i, index:k, length:12, chorus:0, beats:4, chords:f2[k].chords, nextChords:fa[(k+1)%12].chords, tempo:120, last:false, opts:{} });
    ev.forEach(e => { ok(e.midi>=28&&e.midi<=55, 'keychange range'); ok(e.midi !== last, 'keychange repeat'); last = e.midi; }); }
}
// determinism
const a = JSON.stringify(run('jazz', 0, 3, 'walk', 42).map(x=>x.ev)), b = JSON.stringify(run('jazz', 0, 3, 'walk', 42).map(x=>x.ev)), c = JSON.stringify(run('jazz', 0, 3, 'walk', 43).map(x=>x.ev));
ok(a === b, 'same seed same line'); ok(a !== c, 'different seed differs');
console.log(fail ? ('BASS FAILURES: ' + fail) : 'BASS OK');
// eyeball
for (const [chart, feel] of [['basic','walk'],['jazz','walk'],['jazz','two']]){ console.log('--', chart, feel, 'in F, seed 42, 2 choruses');
  run(chart, 0, 2, feel, 42).forEach(({ ctx, ev }, i) => { if (i % 12 === 0) console.log(' chorus', i/12 + 1); console.log('  ' + String(ctx.index+1).padStart(2), ctx.chords.map(c=>c.chord.label).join(' ').padEnd(10), ev.map(e => (H.noteName(e.midi) + (feel==='two' ? '@'+e.pos : '')).padEnd(feel==='two'?8:4)).join(' ')); }); }
