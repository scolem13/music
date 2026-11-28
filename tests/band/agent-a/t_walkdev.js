// Walking devices (bass.js WALKING DEVICES) and the fixed line. Run: node t_walkdev.js   (NEG=1 must fail)
const { mulberry32, CH, abcOf } = require('./load.js');
const H = BandHarmony; let fail = 0; const ok = (c, m) => { if (!c){ fail++; if (fail < 20) console.log('FAIL', m); } };
const NEG = process.env.NEG === '1';
function run(chart, tr, n, opts, seed){
  const form = H.buildForm(TuneChart.parse(abcOf(CH[chart])), tr), bass = BandBass.create({ rng: mulberry32(seed) }), out = [];
  for (let ch = 0; ch < n; ch++) for (let i = 0; i < form.length; i++){
    const ctx = { bar: ch*form.length+i, index: i, length: form.length, chorus: ch, beats: form[i].beats, chords: form[i].chords,
      nextChords: form[(i+1)%form.length].chords, tempo: 120, intensity: 0.6, phrase: { bar: i % 4 }, opts };
    out.push({ ctx, ev: bass.bar(ctx) }); }
  return { out, form };
}
const kinds = {}; let prev = null, bars = 0;
for (const chart of ['basic','quick','jazz']) for (let tr = 0; tr < 12; tr++){
  const { out } = run(chart, tr, 20, { bassFeel: NEG ? 'walk' : 'walkdev' }, 77 + tr);
  prev = null;
  out.forEach(({ ctx, ev }, bi) => { bars++;
    ev.forEach(e => { if (e.device) kinds[e.device] = (kinds[e.device]||0) + 1;
      ok(e.midi >= BandBass.LO && e.midi <= BandBass.HI, 'range ' + e.midi);
      ok(e.pos >= 0 && e.pos < ctx.beats && e.dur > 0, 'shape');
      if (prev != null && !e.ghost) ok(Math.abs(e.midi - prev) <= 12, `leap ${chart} ${tr} bar ${bi}`);
      if (!e.ghost) prev = e.midi; });
    const on = ev.filter(e => !e.ghost && Math.abs(e.pos - Math.round(e.pos)) < 1e-9).map(e => e.pos);
    ok(on.length >= 3, 'beats covered ' + on); });
}
console.log('device notes:', JSON.stringify(kinds), 'in', bars, 'bars');
['chromatic','scalar','jump','enclosure','ghost','triplet'].forEach(k => ok(kinds[k] > 0, 'device never used: ' + k));
// a device bar lands on the next root (pending): chromatic bar ends a semitone from the next bar's first note
// unset = exactly as before (no extra random numbers)
const a = run('jazz', 0, 4, { bassFeel: 'walk' }, 5).out.map(x => JSON.stringify(x.ev));
const b = run('jazz', 0, 4, { bassFeel: 'walk', walkDevices: null }, 5).out.map(x => JSON.stringify(x.ev));
ok(JSON.stringify(a) === JSON.stringify(b), 'unset changes the walk');
// fixed line plays as written
const { form } = run('basic', 0, 1, {}, 1);
const line = form.map((f, i) => [{ pos: 0, dur: 0.9, midi: 40 + (i % 5), vel: 0.8 }, { pos: 2.5, dur: 0.3, midi: 38, vel: 0.3, ghost: true }]);
const fx = run('basic', 0, 1, { bassFeel: 'walk', bassLine: { bars: line } }, 1).out;
ok(fx.every(({ ev }, i) => ev.length === 2 && ev[0].midi === 40 + (i % 5) && ev[1].ghost), 'fixed line');
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
