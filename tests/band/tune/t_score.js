// BandTuneScore on every tune in the library: the melody per chart bar, and the section fragments
const fs = require('fs'), vm = require('vm'), R = '/Users/sean.coleman/Projects/everything-music-site/';
const load = f => vm.runInThisContext(fs.readFileSync(R + f, 'utf8'), { filename: f });
['apps/shared/tune-chart.js', 'apps/tune-assessment/abc-tune.js', 'apps/shared/band/tune-score.js'].forEach(load);
const tunesObject = vm.runInNewContext(fs.readFileSync(R + 'apps/tunes/tunes-object.js', 'utf8') + '\n;tunesObject');
// the page's melGeo
function geo(m){ const n = m.n, d = m.d, den = Math.max(8, d), per = n * den / d, compound = d === 8 && n >= 6 && n % 3 === 0; return { per, beat: compound ? 3 : den / d }; }
const tunes = []; for (const k in tunesObject) String(tunesObject[k]).split(/\n(?=X:)/).forEach(t => { if (/^X:/m.test(t)) tunes.push(t); });
let n = 0, withNotes = 0, bad = 0, off = 0, offEx = [], frag = 0, fragNull = 0, empty = 0, tied = 0;
for (const abc of tunes){ n++;
  let p; try { p = TuneChart.parse(abc); } catch (e){ continue; }
  if (!BandTuneScore.hasNotes(abc)) { empty++; continue; } withNotes++;
  try {
    const mel = BandTuneScore.melody(abc, p, b => geo(b.meter || { n: p.meterN || 4, d: p.meterD || 4 }));
    if (mel.length !== p.bars.length) { bad++; console.log('LENGTH', mel.length, p.bars.length, (/^T:(.*)$/m.exec(abc)||[])[1]); continue; }
    mel.forEach((b, i) => { const g = geo(p.bars[i].meter || { n: p.meterN || 4, d: p.meterD || 4 });
      b.forEach(x => { if (!(x.pos >= 0 && x.pos < g.per && x.dur > 0 && x.midi >= 30 && x.midi <= 100)){ off++; if (offEx.length < 5) offEx.push((/^T:(.*)$/m.exec(abc)||[])[1] + ' bar ' + i + ' ' + JSON.stringify(x)); } }); });
    const f = BandTuneScore.fragment(abc, p, 0, p.bars.length); frag++; if (!f) fragNull++; else p.bars.forEach(b => { if (b.at >= 0 && f.text[b.at + f.shift] === undefined) { bad++; } });
  } catch (e){ bad++; console.log('THREW', (/^T:(.*)$/m.exec(abc)||[])[1], e.message); }
}
console.log(`${n} tunes, ${withNotes} with notes (${empty} chords only), threw/mismatch ${bad}, notes out of range ${off}, whole-tune fragments null ${fragNull}/${frag}`);
offEx.forEach(x => console.log('  ', x));
if (bad || fragNull) process.exit(1); console.log('SCORE OK');
// a sectioned tune: the fragment is the section's own lines (with its words), not the whole tune
const sec = `X:1\nT:T\nM:4/4\nL:1/4\nK:C\nP:Verse\n"C"CDEF | "G"GFED |\nw:one two three four five six seven eight\nP:Chorus\n"F"FGAB | "C"c4 |]\n`;
const sp = TuneChart.parse(sec), mel = BandTuneScore.melody(sec, sp, geo.bind(null, { n: 4, d: 4 }) && (() => geo({ n: 4, d: 4 })));
const f0 = BandTuneScore.fragment(sec, sp, 0, 2).text, F1 = BandTuneScore.fragment(sec, sp, 2, 4), f1 = F1.text;
if (F1.text[sp.bars[2].at + F1.shift] !== sec[sp.bars[2].at]) { console.log('SHIFT WRONG'); process.exit(1); }
if (!/CDEF/.test(f0) || !/^w:one/m.test(f0) || /FGAB/.test(f0) || /^P:/m.test(f0)) { console.log('FRAGMENT 0 WRONG\n' + f0); process.exit(1); }
if (!/FGAB/.test(f1) || /CDEF/.test(f1) || !/^K:C/m.test(f1)) { console.log('FRAGMENT 1 WRONG\n' + f1); process.exit(1); }
const pk = `X:1\nT:P\nM:4/4\nL:1/4\nK:C\nG | "C"c2 e2- | e2 d2 |]\n`, pp = TuneChart.parse(pk), pm = BandTuneScore.melody(pk, pp, () => geo({ n: 4, d: 4 }));
if (!pp.bars[0].anacrusis || pm[0][0].pos !== 6 || pm[1].length !== 2 || pm[1][1].dur !== 8 || pm[2].length !== 1) { console.log('PICKUP/TIE WRONG', JSON.stringify(pm), pp.bars[0].anacrusis); process.exit(1); }
console.log('FRAGMENTS, PICKUP, TIE OK');

// tuplets, broken rhythm, a chord, inline fields, a key change, a meter change, an octave, ties over a barline, Z rests, other voices
const F = (abcText, bars) => { const pp = TuneChart.parse(abcText); return BandTuneScore.read(abcText, pp); };
const ok = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { console.log('WRONG', name, JSON.stringify(got), 'wanted', JSON.stringify(want)); process.exit(1); } };
const RB = (body, head = 'M:4/4\nL:1/4\nK:C') => F(`X:1\nT:t\n${head}\n${body}\n`);
const rd = r => r.bars.map(b => b.map(x => [Math.round(x.pos * 1e3) / 1e3, Math.round(x.dur * 1e3) / 1e3, x.midi]));
ok('triplet', rd(RB('"C"(3CDE F2 G2 z2 |', 'M:4/4\nL:1/8\nK:C'))[0].map(x => [x[0], x[1]]), [[0, 0.333], [0.333, 0.333], [0.667, 0.333], [1, 1], [2, 1]]);
ok('quintuplet in 4/4 takes the time of 2', rd(RB('"C"(5CDEFG z3 |', 'M:4/4\nL:1/8\nK:C'))[0].map(x => x[1]), [0.2, 0.2, 0.2, 0.2, 0.2]);
ok('broken', rd(RB('"C"C>D E<F |', 'M:4/4\nL:1/4\nK:C'))[0].map(x => x[1]), [1.5, 0.5, 0.5, 1.5]);
ok('chord takes the top note', rd(RB('"C"[CEG]2 [GBd]2 |'))[0].map(x => x[2]), [67, 74]);
ok('key change', rd(RB('"C"F2 F2 |\nK:G\n"G"F2 F2 |')).map(b => b.map(x => x[2])), [[65, 65], [66, 66]]);
ok('inline key change', rd(RB('"C"F2 [K:G]F2 | F2 F2 |')).map(b => b.map(x => x[2])), [[65, 66], [66, 66]]);
ok('inline L and M', rd(RB('"C"C2 [L:1/8] C2 | [M:3/4] C2 C |', 'M:4/4\nL:1/4\nK:C')).map(b => b.map(x => x[1])), [[2, 1], [1, 0.5]]);
ok('octave=1 in K:', rd(RB('"C"C2 |', 'M:2/4\nL:1/4\nK:C octave=1'))[0][0][2], 72);
ok('accidentals last to the barline', rd(RB('"C"^FF F2 | F4 |')).map(b => b.map(x => x[2])), [[66, 66, 66], [65]]);
ok('tie over the barline', rd(RB('"C"C2 G2- | G2 E2 |')).map(b => b.map(x => x[1])), [[2, 2 + 2], [2]]);
ok('Z rest', rd(RB('"C"C4 | Z2 | C4 |')).map(b => b.length), [1, 0, 1]);
ok('only the first voice', rd(RB('V:1\n"C"CDEF |\nV:2\nGGGG |\nV:1\nFEDC |')).map(b => b.length), [4, 0, 4]);
ok('quintuplet in compound time takes the time of 3', rd(RB('"C"(5CDEFG z |', 'M:6/8\nL:1/8\nK:C'))[0].map(x => x[1]), [0.3, 0.3, 0.3, 0.3, 0.3]);
console.log('READER OK');
