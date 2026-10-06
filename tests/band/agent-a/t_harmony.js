const { CH, abcOf } = require('./load.js');
const H = BandHarmony; const fs = require('fs');
let fail = 0; const ok = (c, msg) => { if (!c){ fail++; console.log('FAIL', msg); } };
// 1. every library suffix parses
const src = fs.readFileSync('/Users/sean.coleman/Projects/everything-music-site/apps/tunes/tunes-object.js', 'utf8');
const re = /"([^"\n]*)"/g; let m; const syms = new Map();
while ((m = re.exec(src))){ const s = m[1].trim(); if (/^[A-G]/.test(s)) syms.set(s, (syms.get(s)||0)+1); }
let unknown = new Map(), parsed = 0, uses = 0, unkUses = 0; const byQ = {};
for (const [s, n] of syms){ let c; try { c = H.parseChord(s, 0); } catch (e){ ok(false, 'threw on ' + s + ' ' + e.message); continue; }
  parsed++; uses += n; if (c.nc) continue; if (c.unknown){ const suf = s.replace(/^[A-G][#b]*/, ''); unknown.set(suf, (unknown.get(suf)||0)+n); unkUses += n; continue; }
  const suf = s.replace(/^[A-G][#b]*/, '').replace(/\/[A-G][#b]*$/, ''); (byQ[c.quality] = byQ[c.quality] || new Set()).add(suf);
  for (const st of ['rootless','guide']){ const v = H.voicing(c, st, null); ok(v.length >= 2, 'no voicing ' + s + ' ' + st); } }
console.log('distinct symbols', syms.size, 'parsed', parsed, 'uses', uses, 'flagged unknown: uses', unkUses, 'suffixes', unknown.size);
console.log('UNKNOWN:', [...unknown.keys()].join(' | '));
for (const q in byQ) console.log(q.padEnd(6), [...byQ[q]].join(' '));
// 2. spot checks
const exp = [['Cmaj7','maj',4,7,11],['CM7','maj',4,7,11],['CΔ','maj',4,7,11],['Cma7','maj',4,7,11],['Cmaj9','maj',4,7,11],['C6','maj',4,7,null],['C69','maj',4,7,null],['C6/9','maj',4,7,null],
 ['Cm','min',3,7,null],['Cmin','min',3,7,null],['C-','min',3,7,null],['Cm7','min',3,7,10],['C-7','min',3,7,10],['Cm9','min',3,7,10],['Cm11','min',3,7,10],['Cm6','min',3,7,null],['Cm69','min',3,7,null],
 ['GN.C.','nc',null,null,null],['CmMaj7','min',3,7,11],['Cm(maj7)','min',3,7,11],['Cm7b5','hdim',3,6,10],['Cø','hdim',3,6,10],['Cdim','dim',3,6,null],['C°','dim',3,6,null],['Co','dim',3,6,null],['Cdim7','dim',3,6,9],
 ['C7','dom',4,7,10],['C9','dom',4,7,10],['C13','dom',4,7,10],['C11','sus',null,7,10],['C7b9','dom',4,7,10],['C7#9','dom',4,7,10],['C7b5','dom',4,6,10],['C7#5','dom',4,8,10],['C7#11','dom',4,7,10],
 ['C7b13','dom',4,7,10],['C13b9','dom',4,7,10],['C9#11','dom',4,7,10],['C7alt','dom',4,6,10],['Csus','sus',null,7,null],['Csus4','sus',null,7,null],['Csus2','sus',null,7,null],['C7sus','sus',null,7,10],
 ['C9sus','sus',null,7,10],['C13sus','sus',null,7,10],['Caug','aug',4,8,null],['C+','aug',4,8,null],['C+7','dom',4,8,10],['C7+','dom',4,8,10],['Cadd9','maj',4,7,null],['C5','power',null,7,null],
 ['C7(b9)','dom',4,7,10],['C/E','maj',4,7,null],['C','maj',4,7,null],['Cother','dim',3,6,9],['C91113sus4','sus',null,7,10],['C7b5#5b9#9','dom',4,6,10],['Cm711','min',3,7,10],['Cdim5m7','hdim',3,6,10]];
exp.forEach(([s,q,t,f,sv]) => { const c = H.parseChord(s, 0); ok(c.quality===q && c.third===t && c.fifth===f && c.seventh===sv && !c.unknown, `${s}: got ${c.quality} ${c.third} ${c.fifth} ${c.seventh} unk=${c.unknown}`); });
ok(H.parseChord('C/E',0).bass===4 && H.parseChord('C6/9',0).bass===0 && H.parseChord('C6/9',0).six9, 'slash vs 6/9');
ok(H.parseChord('Bb7',2).root===0 && H.parseChord('F7',-5).root===0, 'transpose');
ok(H.parseChord('N.C.',0).nc && H.parseChord('',0).nc && H.parseChord(null,0).nc && H.parseChord('Fine',0).unknown && H.parseChord('Go.',0).unknown, 'nc/unknown');
// 3. voicing rules in all 12 keys
const quals = ['7','9','13','7b9','7#9','7b5','7#5','7#11','7b13','13b9','9#11','7alt','7#9#5','7sus4','9sus4','maj7','maj9','maj7#11','6','69','','m','m7','m9','m11','m6','m69','mMaj7','m7b5','dim7','dim','aug','+7','sus4','sus2','5','add9','13#11','maj13'];
const R = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']; let vcount = 0; const sizes = {};
for (const st of ['rootless','guide']) for (const q of quals) for (const r of R){
  const c = H.parseChord(r+q, 0); let prev = null;
  for (let rep = 0; rep < 3; rep++){ const v = H.voicing(c, st, prev); vcount++;
    const want = st === 'guide' ? 2 : (['aug','sus2','power'].includes(H.voicingClass(c)) ? 3 : 4);
    ok(v.length === want, `size ${r+q} ${st} ${v}`); sizes[v.length] = (sizes[v.length]||0)+1;
    ok(v[0] >= 48 && v[v.length-1] <= 74, `register ${r+q} ${st} ${v.map(H.noteName)}`);
    ok(v.every((n,i)=> i===0 || n > v[i-1]), `ascending ${r+q}`);
    ok(new Set(v.map(n=>n%12)).size === v.length, `dup pc ${r+q} ${st} ${v.map(H.noteName)}`);
    ok(!(v.length>1 && v[1]-v[0]===1 && v[0]<52), `bottom cluster ${r+q} ${v.map(H.noteName)}`);
    if (st==='rootless' && want===4 && c.quality!=='hdim' && c.quality!=='dim' && c.quality!=='sus') ok(!v.some(n=>n%12===c.root), `root in rootless ${r+q} ${v.map(H.noteName)}`);
    if (c.third!=null) ok(v.some(n=>(n-c.root+120)%12===c.third), `no 3rd ${r+q} ${st}`);
    if (c.s9 && c.third===4){ const n9=v.find(n=>(n-c.root+120)%12===3), n3=v.find(n=>(n-c.root+120)%12===4); if (n9!=null) ok(n9>n3, `#9 under 3 ${r+q} ${v.map(H.noteName)}`); }
    prev = v; } }
console.log('voicings checked', vcount, 'sizes', JSON.stringify(sizes));
// 4. voice leading
function lead(seq, st, tr){ let prev = null, tot = 0, n = 0, out = []; seq.forEach(s => { const v = H.voicing(H.parseChord(s, tr||0), st, prev); if (prev){ tot += H.motion(prev, v); n++; } out.push(v); prev = v; }); return { avg: tot/n, out }; }
let iiVI = 0, bl = 0, blB = 0;
for (let t = 0; t < 12; t++){ iiVI += lead(['Dm7','G7','Cmaj7'], 'rootless', t).avg; bl += lead(CH.jazz.join(' ').split(' ').concat(['F7']), 'rootless', t).avg; blB += lead(CH.basic.concat(['F7']), 'rootless', t).avg; }
console.log('avg total voice motion per change (semitones summed over 4 voices), 12 keys: ii-V-I', (iiVI/12).toFixed(2), '| jazz blues', (bl/12).toFixed(2), '| basic blues', (blB/12).toFixed(2));
console.log('ii-V-I in C:', lead(['Dm7','G7','Cmaj7'],'rootless',0).out.map(v=>v.map(H.noteName).join(' ')).join('  ->  '));
console.log('F7 Bb7 C7:', lead(['F7','Bb7','F7','C7'],'rootless',0).out.map(v=>v.map(H.noteName).join(' ')).join('  ->  '));
console.log('guide F7 Bb7 C7:', lead(['F7','Bb7','F7','C7'],'guide',0).out.map(v=>v.map(H.noteName).join(' ')).join('  ->  '));
for (const s of ['C7#9','C7alt','C13b9','C7sus4','Cm7b5','Cdim7','C7#11','C13#11','Cmaj7#11','C6','Cm6','Csus4','C5','Caug']) console.log(s.padEnd(9), 'A/B-led:', H.voicing(H.parseChord(s,0),'rootless',null).map(H.noteName).join(' '), ' | from low:', H.voicing(H.parseChord(s,0),'rootless',[48,52,55,58]).map(H.noteName).join(' '));
// 5. buildForm
for (const k of Object.keys(CH)){ const p = TuneChart.parse(abcOf(CH[k])); const form = H.buildForm(p, 0);
  ok(form.length === 12, k + ' length ' + form.length);
  form.forEach((b, i) => { const want = CH[k][i].split(' '); ok(b.beats === 4 && b.src === i, 'beats/src'); ok(b.chords.length === want.length, `${k} bar ${i} chords ${b.chords.length}`);
    b.chords.forEach((c, j) => ok(c.chord.sym === want[j] && c.pos === (want.length === 1 ? 0 : j*2), `${k} bar ${i} ${c.chord.sym}@${c.pos}`)); }); }
// carry-over, repeats, N.C., pickup, stacked symbols, transpose
let p = TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:C\nG | "C"z4 | z4 |: "F"z2 "G7"z2 | "N.C."z4 :| z4 | "Am7""D7"z4 | "Fine"z4 |]');
let f = H.buildForm(p, 2);
ok(f.length === 9, 'expanded length ' + f.length);
ok(f[0].chords[0].chord.root === 2 && f[1].chords.length===1 && f[1].chords[0].chord.root === 2 && f[1].chords[0].pos===0, 'carry-over + transpose');
ok(f[2].chords.length===2 && f[2].chords[1].pos===2 && f[3].chords.length===0 && f[4].chords[0].chord.sym==='F', 'two chords, NC, repeat');
ok(f[6].chords.length===0, 'carry reset after NC: ' + JSON.stringify(f[6].chords.map(c=>c.chord.sym)));
ok(f[7].chords.length===2 && f[7].chords[0].pos===0 && f[7].chords[1].pos===2 && f[7].chords[1].chord.sym==='D7', 'stacked symbols spread');
ok(f[8].chords.length===1 && f[8].chords[0].chord.sym==='D7', '"Fine" ignored, carry kept');
console.log(fail ? ('HARMONY FAILURES: ' + fail) : 'HARMONY OK');
