const fs=require('fs'),vm=require('vm'),assert=require('assert');
const R='/Users/sean.coleman/Projects/everything-music-site/apps/shared/';
for(const f of['tune-chart.js','voicings.js','band/harmony.js','band/comp.js'])vm.runInThisContext(fs.readFileSync(R+f,'utf8'));
const {mulberry32,CH,abcOf}=require('../agent-a/load.js');
const H=BandHarmony,nn=H.noteName,m12=n=>((n%12)+12)%12;
const MODES=[['piano','syncopated','drop2'],['piano','syncopated','drop3'],['guitar','four','shell3'],['guitar','four','drop2'],['guitar','syncopated','drop2'],['guitar','syncopated','drop3'],['guitar','syncopated','triad3'],['guitar','syncopated','shell3']];
let hits=0,bars=0,moves=0,chg=0;
for(const [comp,compRhythm,voicing] of MODES)for(const chart of Object.keys(CH))for(let tr=0;tr<12;tr++){
  const form=H.buildForm(TuneChart.parse(abcOf(CH[chart])),tr),c=BandComp.create({rng:mulberry32(tr*17+3)});
  let prev=null;
  for(let ch=0;ch<6;ch++)form.forEach((fb,i)=>{
    const nx=form[(i+1)%12].chords;
    const ev=c.bar({bar:ch*12+i,index:i,length:12,chorus:ch,beats:4,chords:fb.chords,nextChords:nx,tempo:140,last:false,opts:{comp,compRhythm,voicing}});
    bars++;
    if(compRhythm==='four'){assert.deepStrictEqual(ev.map(e=>e.pos),[0,1,2,3]);assert(ev.every(e=>e.dur>=0.11*140/60-1e-9||e.dur>=0.25));}
    for(const e of ev){hits++;
      assert.strictEqual(e.inst,comp);assert(e.pos>=0&&e.pos<4);
      // which chord: on the beat = chordAt; anticipations may carry the next
      const cands=[H.chordAt(fb.chords,e.pos),H.chordAt(fb.chords,e.pos+0.5),nx[0]&&nx[0].chord].filter(Boolean);
      if(compRhythm==='four')cands.length=1;
      const pcs=new Set(e.midis.map(m12));
      const ok=cands.some(cd=>{const allowed=new Set(cd.tones.map(t=>m12(cd.root+t)));return [...pcs].every(p=>allowed.has(p))&&pcs.has(m12(cd.root+(cd.third!=null?cd.third:cd.tones[1])));});
      assert(ok,`${comp}/${voicing} ${chart} tr${tr} bar${i+1} pos${e.pos} [${e.midis.map(nn)}]`);
      for(let k=1;k<e.midis.length;k++)assert(e.midis[k]>e.midis[k-1]);
      if(comp==='guitar')assert(e.midis[0]>=40&&e.midis.at(-1)<=76,'guitar range '+e.midis.map(nn));
      else assert(e.midis[0]>=48&&e.midis.at(-1)<=77,'piano range '+e.midis.map(nn));
      if(prev&&prev.join()!==e.midis.join()){moves+=ChordVoicings.motion(prev,e.midis);chg++;}
      prev=e.midis;
    }
  });
}
console.log(`NEW STYLES OK: ${bars} bars, ${hits} hits, avg motion per voicing change ${(moves/chg).toFixed(2)}`);
// fallbacks
const c=BandComp.create({rng:mulberry32(1)}),form=H.buildForm(TuneChart.parse(abcOf(CH.jazz)),0);
let e=c.bar({bar:0,index:0,length:12,chorus:0,beats:4,chords:form[0].chords,nextChords:form[1].chords,tempo:120,opts:{comp:'guitar',voicing:'rootless'}});
assert(e.every(x=>x.inst==='guitar'&&x.midis.length===3),'unknown guitar style -> shell3');
function show(opts,label){console.log('--- '+label);const cc=BandComp.create({rng:mulberry32(43)});
  form.forEach((fb,i)=>{const ev=cc.bar({bar:i,index:i,length:12,chorus:0,beats:4,chords:fb.chords,nextChords:form[(i+1)%12].chords,tempo:120,last:false,opts});
  console.log(String(i+1).padStart(2),fb.chords.map(x=>x.chord.sym).join(' ').padEnd(8),ev.map(x=>`${x.pos}[${x.midis.map(nn).join(' ')}]`).join('  '));});}
show({comp:'piano',voicing:'drop2'},'jazz blues F, piano drop2 (syncopated)');
show({comp:'guitar',compRhythm:'four',voicing:'shell3'},'jazz blues F, guitar shell3 four to the bar');
