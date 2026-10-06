// robustness: every tune in the library through buildForm + bass + comp without throwing
const { mulberry32 } = require('./load.js'); const fs = require('fs'), vm = require('vm');
const H = BandHarmony;
const src = fs.readFileSync('/Users/sean.coleman/Projects/everything-music-site/apps/tunes/tunes-object.js', 'utf8');
const tunesObject = vm.runInNewContext(src + '\n;tunesObject');
let tunes = []; for (const k in tunesObject) String(tunesObject[k]).split(/\n(?=X:)/).forEach(t => { if (/^X:/m.test(t)) tunes.push(t); });
const why = {}; let n = 0, withChords = 0, bars = 0, bad = 0, evB = 0, evC = 0, meters = {}, rangeBad = 0, t0 = Date.now(), emptyForm = 0;
for (const abc of tunes){ n++;
  try {
    const p = TuneChart.parse(abc); const tr = n % 12; const form = H.buildForm(p, tr);
    if (!form.some(b => b.chords.length)){ emptyForm++; continue; } withChords++;
    const bass = BandBass.create({ rng: mulberry32(n) }), comp = BandComp.create({ rng: mulberry32(n+1) });
    for (let ch = 0; ch < 2; ch++) form.forEach((b, i) => { bars++; meters[b.beats] = (meters[b.beats]||0)+1;
      const ctx = { bar: ch*form.length+i, index: i, length: form.length, chorus: ch, beats: b.beats, chords: b.chords, nextChords: form[(i+1)%form.length].chords, tempo: 140, last: ch===1 && i===form.length-1, opts: { bassFeel: n % 3 === 0 ? 'two' : 'walk', voicing: n % 4 === 0 ? 'guide' : 'rootless' } };
      b.chords.forEach((c, k) => { if (c.pos < 0 || c.pos >= b.beats || (k && c.pos <= b.chords[k-1].pos)) throw new Error('bad chord pos'); });
      const eb = bass.bar(ctx), ec = comp.bar(ctx); evB += eb.length; evC += ec.length;
      eb.forEach(e => { if (!(e.midi >= 28 && e.midi <= 55) || !(e.pos >= 0 && e.pos < b.beats) || !(e.dur > 0)){ rangeBad++; why['bass beats'+b.beats+' pos'+e.pos+' dur'+e.dur+' feel'+ctx.opts.bassFeel] = (why['bass beats'+b.beats+' pos'+e.pos+' dur'+e.dur+' feel'+ctx.opts.bassFeel]||0)+1; } });
      ec.forEach(e => { if (!(e.pos >= 0 && e.pos < b.beats) || !(e.dur > 0) || e.midis.length < 2 || e.midis.some(m => !(m >= 48 && m <= 79))){ rangeBad++; const k='comp beats'+b.beats+' pos'+e.pos+' dur'+e.dur+' n'+e.midis.length+' '+e.midis.join('.'); why[k]=(why[k]||0)+1; } }); });
    bass.ending({ chords: form[0].chords, opts: {} }); comp.ending({ chords: form[0].chords, opts: {} });
  } catch (e){ bad++; if (bad < 6) console.log('THREW on', (/^T:(.*)$/m.exec(abc)||[])[1], '-', e.message, (e.stack||'').split('\n')[1]); }
}
console.log(`library: ${n} tunes, ${withChords} with chords (${emptyForm} without), ${bars} bars, bass events ${evB}, comp events ${evC}, threw ${bad}, out-of-contract events ${rangeBad}, ${Date.now()-t0} ms`);
console.log('bar lengths (beats):', JSON.stringify(meters));

console.log(Object.entries(why).sort((a,b)=>b[1]-a[1]).slice(0,14).map(x=>x[1]+'x '+x[0]).join('\n'));
