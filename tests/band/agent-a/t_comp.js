const { mulberry32, CH, abcOf } = require('./load.js');
const H = BandHarmony; let fail = 0; const ok = (c, msg) => { if (!c){ fail++; if (fail < 25) console.log('FAIL', msg); } };
const pcs = v => [...new Set(v.map(n => n % 12))].sort((a,b)=>a-b).join(',');
function run(chartKey, tr, choruses, opts, seed, tempo, finite){
  const form = H.buildForm(TuneChart.parse(abcOf(CH[chartKey])), tr);
  const comp = BandComp.create({ rng: mulberry32(seed) }); const out = [];
  for (let ch = 0; ch < choruses; ch++) for (let i = 0; i < form.length; i++){
    const last = !!finite && ch === choruses-1 && i === form.length-1;
    const ctx = { bar: ch*form.length+i, index: i, length: form.length, chorus: ch, beats: form[i].beats, chords: form[i].chords, nextChords: form[(i+1)%form.length].chords, tempo: tempo||120, last, opts: opts||{} };
    out.push({ ctx, ev: comp.bar(ctx) }); }
  if (finite) out.push({ ctx: { beats: 4, chords: form[0].chords, ending: true }, ev: comp.ending({ chords: form[0].chords, opts: opts||{} }) });
  return out;
}
function check(chart, tr, style, seed, tempo, S){
  const bars = run(chart, tr, 100, { voicing: style }, seed, tempo);
  let prevEnd = -1, prevAntic = false, prevV = null;
  bars.forEach(({ ctx, ev }, bi) => {
    S.bars++; S.hits += ev.length; if (!ev.length) S.empty++;
    const nextC = ctx.nextChords[0].chord, want = style === 'guide' ? 2 : 4;
    if (prevAntic) ok(!ev.some(e => e.pos < 0.5), `re-attack on 1 after a push: ${chart} tr${tr} bar ${bi}`);
    ev.forEach(e => {
      const abs = bi*4 + e.pos;
      ok(e.pos >= 0 && e.pos < 4, 'pos ' + e.pos); ok(e.dur >= 0.15 - 1e-9, 'dur ' + e.dur); ok(e.inst === 'piano', 'inst'); ok(e.vel >= 0.45 && e.vel <= 0.7, 'vel ' + e.vel);
      ok(abs >= prevEnd - 1e-9, `overlap ${chart} tr${tr} bar ${bi} pos ${e.pos} prevEnd ${prevEnd}`); prevEnd = abs + e.dur;
      ok(e.midis.length === want && e.midis.every((n,i)=> i===0 || n > e.midis[i-1]) && e.midis[0] >= 48 && e.midis[e.midis.length-1] <= 74, 'voicing shape ' + e.midis);
      const off = Math.abs(e.pos % 1 - 0.5) < 1e-9;
      let exp = H.chordAt(ctx.chords, e.pos);
      if (off && e.pos + 0.5 >= 4) exp = nextC; else if (off && H.chordAt(ctx.chords, e.pos + 0.5).key !== exp.key) exp = H.chordAt(ctx.chords, e.pos + 0.5);
      ok(pcs(e.midis) === pcs(H.voicing(exp, style, null)), `chord at ${e.pos} bar ${bi} ${chart}: got ${e.midis.map(H.noteName)} want ${exp.label}`);
      if (off && e.pos + 0.5 >= 4){ S.antic++; const hold = e.pos + e.dur - 4; if (hold > 0.2) S.held++; }
      // held chord never rings into a different chord
      const endAbs = e.pos + e.dur; for (const c of ctx.chords) if (c.pos > e.pos + 0.51 && c.pos < endAbs - 1e-9 && c.chord.key !== exp.key) ok(false, `rings through change bar ${bi}`);
      if (endAbs > 4 + 1e-9 && nextC.key !== exp.key) ok(false, `rings across barline into new chord bar ${bi} pos ${e.pos} dur ${e.dur}`);
      if (prevV && pcs(prevV) !== pcs(e.midis)){ S.moves++; S.motion += H.motion(prevV, e.midis); } prevV = e.midis;
      S.pos[e.pos] = (S.pos[e.pos]||0)+1;
    });
    // each chord of a two-chord bar is heard
    if (ctx.chords.length > 1) ctx.chords.forEach((c, k) => { const want2 = pcs(H.voicing(c.chord, style, null));
      const heard = ev.some(e => pcs(e.midis) === want2) || (k === 0 && prevAntic) || (k === 0 && bi > 0 && H.sameChord(c.chord, H.chordAt(bars[bi-1].ctx.chords, 3)) && false);
      ok(heard, `chord not heard: ${chart} tr${tr} bar ${bi} ${c.chord.label}`); });
    prevAntic = ev.some(e => e.pos === 3.5);
  });
}
for (const tempo of [120, 240]){ const S = { bars:0, hits:0, empty:0, antic:0, held:0, moves:0, motion:0, pos:{} };
  for (const chart of ['basic','quick','jazz']) for (let tr = 0; tr < 12; tr++) for (const style of ['rootless','guide']) check(chart, tr, style, 300 + tr + tempo, tempo, S);
  console.log(`tempo ${tempo}: ${S.bars} bars, ${(S.hits/S.bars).toFixed(2)} hits/bar, empty bars ${(100*S.empty/S.bars).toFixed(1)}%, pushes into next bar ${S.antic} (held across ${S.held}), avg motion per chord change ${(S.motion/S.moves).toFixed(2)}`);
  console.log('  hit positions %:', Object.keys(S.pos).sort((a,b)=>a-b).map(k => k + ':' + (100*S.pos[k]/S.hits).toFixed(1)).join(' ')); }
// finite ending: last bar leaves room, ending chord is the tonic voicing
{ for (let seed = 0; seed < 60; seed++){ const bars = run('jazz', 0, 2, {}, seed, 120, true); const lastBar = bars[bars.length-2], end = bars[bars.length-1];
    ok(end.ev.length === 1 && end.ev[0].pos === 0 && end.ev[0].dur >= 3.5 && pcs(end.ev[0].midis) === pcs(H.voicing(H.parseChord('F7',0),'rootless',null)), 'ending chord');
    lastBar.ev.forEach(e => ok(e.pos + e.dur <= 4 - 0.04 && e.pos < 3.5, `last bar spills: pos ${e.pos} dur ${e.dur}`)); } }
// N.C. and chart swap
{ const comp = BandComp.create({ rng: mulberry32(9) });
  const f = H.buildForm(TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:C\n"C6"z4 | "N.C."z4 | "F7"z2 "N.C."z2 | "G7"z4 |]'), 0); let n = 0;
  for (let r = 0; r < 40; r++) f.forEach((b, i) => { const ev = comp.bar({ bar:r*4+i, index:i, length:4, chorus:r, beats:4, chords:b.chords, nextChords:f[(i+1)%4].chords, tempo:120, last:false, opts:{} });
    if (i === 1) ok(ev.length === 0, 'NC bar silent'); if (i === 2) ev.forEach(e => ok(e.pos < 2 || e.pos === 3.5, 'hit inside N.C. ' + e.pos)); n += ev.length; });
  const fa = H.buildForm(TuneChart.parse(abcOf(CH.jazz)), 0), fb = H.buildForm(TuneChart.parse(abcOf(CH.basic)), 5);
  for (let i = 0; i < 60; i++){ const f2 = (Math.floor(i/7) % 2) ? fb : fa, k = i % 12; const ev = comp.bar({ bar:i, index:k, length:12, chorus:0, beats:4, chords:f2[k].chords, nextChords:f2[(k+1)%12].chords, tempo:120, last:false, opts:{ voicing: i % 9 < 4 ? 'guide' : 'rootless' } });
    ev.forEach(e => ok(e.midis.length >= 2 && e.pos >= 0 && e.pos < 4 && e.dur > 0, 'swap shape')); }
  comp.reset(); ok(comp.bar({ bar:0, index:0, length:12, chorus:0, beats:4, chords:fa[0].chords, nextChords:fa[1].chords, tempo:120, last:false, opts:{} }).some(e => e.pos === 0), 'first bar states the chord on 1');
}
const a = JSON.stringify(run('jazz',0,3,{},42).map(x=>x.ev)), b = JSON.stringify(run('jazz',0,3,{},42).map(x=>x.ev)), c = JSON.stringify(run('jazz',0,3,{},43).map(x=>x.ev));
ok(a === b, 'deterministic'); ok(a !== c, 'seed varies');
console.log(fail ? ('COMP FAILURES: ' + fail) : 'COMP OK');
