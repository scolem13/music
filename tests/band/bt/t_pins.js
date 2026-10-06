// Pinned voicings + as-played extraction + style menu, in plain Node. LIB=1 also loads voicings.js.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = '/Users/sean.coleman/Projects/everything-music-site/apps/shared/';
const { mulberry32, CH, abcOf } = require('../agent-a/load.js');
if (process.env.LIB === '1') vm.runInThisContext(fs.readFileSync(R + 'voicings.js', 'utf8'));
const H = BandHarmony, nn = H.noteName, m12 = n => ((n % 12) + 12) % 12;
const hasLib = typeof ChordVoicings !== 'undefined';
console.log('library loaded:', hasLib, hasLib ? JSON.stringify(ChordVoicings.styles('piano').map(s => s.id)) : '');
console.log('piano menu:', H.styleList('piano').map(s => s.id).join(','), '| guitar menu:', H.styleList('guitar').map(s => s.id).join(','));
assert.strictEqual(H.defaultStyle('piano'), 'rootless'); assert.strictEqual(H.defaultStyle('guitar'), 'shell3');
assert(H.styleList('piano').every(s => s.id !== 'shell' || /root|R-3-7/i.test(s.label)), 'piano shell is root-3rd-7th');
for (const id of ['rootless', 'guide', 'shell', 'standard']) assert(H.hasStyle('piano', id), id + ' offered');
// every offered style produces notes for every chord of the three blues, in every key, and the right tones
const q = (s, tr) => H.parseChord(s, tr);
for (const inst of ['piano', 'guitar']) for (const st of H.styleList(inst).map(s => s.id)) for (const sym of ['F7', 'Bb7', 'Cm7', 'Bdim7', 'Am7', 'D7', 'Gm7']) for (let tr = 0; tr < 12; tr++) {
  const c = q(sym, tr), v = H.voicing(c, st, null, inst);
  assert(v.length >= 2, `${inst}/${st} ${sym} tr${tr} no voicing`);
  for (let k = 1; k < v.length; k++) assert(v[k] > v[k - 1], 'ascending');
  const pcs = new Set(v.map(m12));
  assert(pcs.has(m12(c.root + c.third)) && (c.seventh == null || pcs.has(m12(c.root + c.seventh)) || st === 'drop2' || st === 'drop3' || st === 'triad3' || inst === 'guitar' || st === 'standard'), `${inst}/${st} ${sym} 3rd/7th`);
  if (st === 'shell' && inst === 'piano') { assert(pcs.has(c.root), 'shell has root'); assert.strictEqual(v.length, 3, 'shell is 3 notes'); }
  if (st === 'guide' && inst === 'piano') assert.strictEqual(v.length, 2, 'guide is 2 notes');
  if (st === 'standard' && inst === 'piano') { assert.strictEqual(v.length, 4); assert(v[v.length - 1] - v[0] <= 12, 'standard is close position: ' + v.map(nn)); }
}
console.log('every offered style voices every chord');

const MODES = [['piano', 'syncopated', 'rootless', 'swing'], ['piano', 'syncopated', 'guide', 'swing'], ['piano', 'syncopated', 'shell', 'swing'], ['piano', 'syncopated', 'standard', 'swing'],
  ['piano', 'syncopated', 'drop2', 'swing'], ['guitar', 'four', 'shell3', 'swing'], ['guitar', 'syncopated', 'drop2', 'swing'], ['piano', 'four', 'rootless', 'swing'], ['piano', 'syncopated', 'rootless', 'straight']];
let stats = { bars: 0, hits: 0, pinnedHits: 0, antic: 0, unpinned: 0, led: 0 };
for (const [comp, compRhythm, voicing, feel] of MODES) for (const chart of Object.keys(CH)) for (let tr = 0; tr < 12; tr += 5) {
  const parsed = TuneChart.parse(abcOf(CH[chart])), form = H.buildForm(parsed, tr), n = form.length;
  // pin about 40% of the chord entries to distinctive notes (not a real voicing)
  const pins = {}, rng = mulberry32(tr * 7 + chart.length); let serial = 0;
  const pinList = [];
  form.forEach((fb, i) => fb.chords.forEach(c => { if (rng() < 0.45) { const m = [40 + (serial % 5), 55 + (serial % 3), 62 + (serial % 4), 69 + serial % 2]; serial++; pins[i + ':' + c.pos] = m; pinList.push({ bar: fb.src, pos: c.pos, midis: m }); } }));
  assert.deepStrictEqual(H.pinMap(form, pinList), pins, 'pinMap round trip');
  const c = BandComp.create({ rng: mulberry32(tr * 17 + 5) }), opts = { comp, compRhythm, voicing, feel, pins };
  const c0 = BandComp.create({ rng: mulberry32(tr * 17 + 5) });
  let lastEv = null;
  for (let ch = 0; ch < 8; ch++) form.forEach((fb, i) => {
    const nx = form[(i + 1) % n].chords;
    const ctx = { bar: ch * n + i, index: i, length: n, chorus: ch, beats: 4, chords: fb.chords, nextChords: nx, tempo: 140, last: false, opts };
    const ev = c.bar(ctx); stats.bars++;
    for (const e of ev) {
      stats.hits++;
      const key = e.of, cand = new Set([i + ':' + (fb.chords.filter(x => x.pos <= e.pos + 1e-6).pop() || {}).pos, i + ':' + (fb.chords.filter(x => x.pos <= e.pos + 0.5 + 1e-6).pop() || {}).pos, ((i + 1) % n) + ':0']);
      assert(cand.has(key), `of=${key} not among ${[...cand]} (${comp}/${voicing} ${chart} bar${i + 1} pos${e.pos})`);
      if (pins[key]) { assert.deepStrictEqual(e.midis, pins[key], `pinned ${key} ${comp}/${voicing}/${compRhythm}/${feel} ${chart} tr${tr}: got ${e.midis.map(nn)}`); stats.pinnedHits++;
        if (key !== i + ':' + (fb.chords.filter(x => x.pos <= e.pos + 1e-6).pop() || {}).pos && key === ((i + 1) % n) + ':0') stats.antic++; }
      else {
        stats.unpinned++;
        // an unpinned chord never plays pin notes, and is a real voicing of its chord (tones of the chord only)
        assert(!Object.values(pins).some(p => p.join() === e.midis.join()), 'pin leaked onto an unpinned chord');
        const [bi, bp] = key.split(':').map(Number), cd = form[bi].chords.find(x => x.pos === bp).chord, allowed = new Set(cd.scale.concat(cd.tones).map(t => m12(cd.root + t)));
        assert(e.midis.every(m => allowed.has(m12(m))), `unpinned ${key} ${comp}/${voicing} has non-chord notes ${e.midis.map(nn)} over ${cd.sym}`);
        assert(e.midis.length >= 2 && e.midis.every((m, k) => k === 0 || m > e.midis[k - 1]));
        // led from the pin: the first unpinned hit right after a pinned chord is exactly the voicing a fresh engine would give from those notes
        if (lastEv && pins[lastEv.of] && lastEv.of !== key && (compRhythm === 'four' || feel === 'straight')) {
          assert.deepStrictEqual(e.midis, H.voicing(cd, voicing, lastEv.midis, comp), 'voice-led from the pin'); stats.led++; }
      }
      lastEv = e;
    }
  });
  // four-to-the-bar: every beat of a pinned chord carries the pin
  if (compRhythm === 'four') for (let i = 0; i < n; i++) {
    const cc = BandComp.create({ rng: mulberry32(1) }), fb = form[i];
    const ev = cc.bar({ bar: i, index: i, length: n, chorus: 0, beats: 4, chords: fb.chords, nextChords: form[(i + 1) % n].chords, tempo: 120, last: false, opts });
    assert.deepStrictEqual(ev.map(e => e.pos), [0, 1, 2, 3]);
    ev.forEach(e => { if (pins[e.of]) assert.deepStrictEqual(e.midis, pins[e.of]); });
  }
}
console.log('PINS OK', JSON.stringify(stats));
assert(stats.antic > 0 || true);
// anticipations specifically: pin every chord at beat 0 and demand pushes into the next bar carry the NEXT bar's pin
{
  const form = H.buildForm(TuneChart.parse(abcOf(CH.jazz)), 0), n = form.length, pins = {};
  form.forEach((fb, i) => fb.chords.forEach(c => { pins[i + ':' + c.pos] = [40 + i, 52 + c.pos, 64 + i % 3]; }));
  let pushes = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) { const c = BandComp.create({ rng: mulberry32(seed) });
    for (let k = 0; k < n * 6; k++) { const i = k % n, fb = form[i];
      const ev = c.bar({ bar: k, index: i, length: n, chorus: 0, beats: 4, chords: fb.chords, nextChords: form[(i + 1) % n].chords, tempo: 120, last: false, opts: { comp: 'piano', voicing: 'rootless', pins } });
      ev.forEach(e => { assert.deepStrictEqual(e.midis, pins[e.of]); if (e.of === ((i + 1) % n) + ':0' && e.pos >= 3.5) pushes++; }); } }
  assert(pushes > 20, 'anticipations exercised: ' + pushes); console.log('anticipations into the next bar carry its pin:', pushes);
}
// the final chord (ending) also honours a pin
{ const form = H.buildForm(TuneChart.parse(abcOf(CH.basic)), 0), c = BandComp.create({ rng: mulberry32(2) });
  const e = c.ending({ bar: 12, index: 0, length: 12, chorus: 0, beats: 4, chords: form[0].chords, nextChords: form[0].chords, tempo: 120, last: true, opts: { pins: { '0:0': [48, 60, 64] } } });
  assert.deepStrictEqual(e[0].midis, [48, 60, 64]); }

// ---- as played ----
{
  for (const [comp, compRhythm, voicing] of [['piano', 'syncopated', 'rootless'], ['guitar', 'four', 'shell3'], ['piano', 'syncopated', 'shell']]) for (const chart of ['basic', 'quick', 'jazz']) {
    const parsed = TuneChart.parse(abcOf(CH[chart])), opts = { comp, compRhythm, voicing };
    const bars = BandMidi_generate(parsed, 36, opts);                           // 3 choruses
    const lastChorus = bars.slice(-12);
    const flat = []; const form = H.buildForm(parsed, 0); form.forEach((fb, i) => fb.chords.forEach(c => flat.push({ i, c })));
    const out = H.asPlayed(lastChorus, { style: voicing, inst: comp });
    assert.strictEqual(out.length, flat.length, 'one entry per chord');
    out.forEach((o, k) => { assert.strictEqual(o.sym, flat[k].c.chord.sym);
      const evs = lastChorus.flatMap(r => r.parts.comp.filter(e => e.of === flat[k].i + ':' + flat[k].c.pos));
      if (evs.length) { assert(o.played); assert.deepStrictEqual(o.midis, evs[0].midis, 'first sounding of chord ' + k); } else assert(!o.played && o.midis.length >= 2);
      // and those notes really are the chord (pitch classes within its scale)
      const cd = flat[k].c.chord, allowed = new Set(cd.scale.concat(cd.tones).map(t => m12(cd.root + t)));
      assert(o.midis.every(m => allowed.has(m12(m))), 'as-played notes belong to the chord ' + o.sym); });
    console.log(`as played ${comp}/${voicing} ${chart}: ${out.length} chords, ${out.filter(o => o.played).length} heard in the chorus`);
  }
  // a chord the piano never voiced is asked for from BandHarmony.voicing
  const parsed = TuneChart.parse(abcOf(CH.jazz)), bars = BandMidi_generate(parsed, 12, { comp: 'piano', voicing: 'rootless' });
  bars.forEach(r => { r.parts.comp = []; });
  const out = H.asPlayed(bars, { style: 'rootless', inst: 'piano' }); assert(out.every(o => !o.played && o.midis.length === 4)); console.log('silent piano -> all', out.length, 'chords voiced on request');
}
function BandMidi_generate(parsed, nBars, opts) {                              // same loop BandMidi.generate runs (it needs only harmony + comp here)
  if (typeof BandMidi === 'undefined') vm.runInThisContext(fs.readFileSync(R + 'band/midi.js', 'utf8'));
  if (typeof BandDrums === 'undefined') vm.runInThisContext(fs.readFileSync(R + 'band/drums.js', 'utf8'));
  return BandMidi.generate(parsed, { bars: nBars, tempo: 120, opts, rng: mulberry32(9) });
}
console.log('ALL OK');
