const fs=require("fs"),vm=require("vm"),assert=require("assert");
const R="/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
for(const f of ["tune-chart.js","voicings.js","band/harmony.js","band/bass.js","band/comp.js","band/drums.js","band/player.js","band/midi.js","band/notation.js"]) vm.runInThisContext(fs.readFileSync(R+f,"utf8"));
function mb(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const abc='X:1\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "Bb7"z4 | "F7"z4 | "Cm7"z2 "F7"z2 | "Bb7"z4 | "Bdim7"z4 | "F7"z4 | "Am7"z2 "D7"z2 | "Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]';
const parsed=TuneChart.parse(abc);
// ---- MIDI
function parse(u8){let p=0;const rd=n=>{let v=0;for(let i=0;i<n;i++)v=v*256+u8[p++];return v};const s4=()=>String.fromCharCode(u8[p++],u8[p++],u8[p++],u8[p++]);
  assert.equal(s4(),"MThd");rd(4);const fmt=rd(2),nt=rd(2),ppq=rd(2),tracks=[];
  for(let t=0;t<nt;t++){assert.equal(s4(),"MTrk");const len=rd(4),end=p+len;let tick=0,ev=[];
    while(p<end){let d=0,b;do{b=u8[p++];d=d*128+(b&127)}while(b&128);tick+=d;const st=u8[p++];
      if(st===0xff){const ty=u8[p++];let l=0;do{b=u8[p++];l=l*128+(b&127)}while(b&128);ev.push({tick,meta:ty,data:[...u8.slice(p,p+l)]});p+=l}
      else if((st&0xf0)===0xc0){ev.push({tick,prog:u8[p++],ch:st&15})}
      else{ev.push({tick,type:st&0xf0,ch:st&15,n:u8[p++],v:u8[p++]})}}
    assert.equal(p,end);tracks.push(ev)}
  return{fmt,ppq,tracks}}
for(const feel of ["swing","straight"]) for(const tempo of [120,220]){
  const bars=BandMidi.generate(parsed,{bars:24,tempo,opts:{feel,bassFeel:"walk"},rng:mb(7)});
  assert.equal(bars.length,24);
  const m=parse(BandMidi.build(bars,{parts:["bass","comp","drums"]}));
  assert.equal(m.fmt,1);assert.equal(m.tracks.length,4);
  const cnt=p=>bars.reduce((a,b)=>a+(p==="comp"?b.parts.comp.reduce((x,e)=>x+e.midis.length,0):b.parts[p].length),0);
  ["bass","comp","drums"].forEach((p,i)=>{const on=m.tracks[i+1].filter(e=>e.type===0x90),off=m.tracks[i+1].filter(e=>e.type===0x80);
    assert.equal(on.length,cnt(p),p+" note count");assert.equal(off.length,on.length);
    assert(on.every(e=>e.ch===(p==="drums"?9:i)),p+" channel");});
  assert(m.tracks[1].some(e=>e.prog===32));assert(m.tracks[2].some(e=>e.prog===0));
  const s=BandMidi.swingOf(bars[0]);if(feel==="straight")assert.equal(s,0.5);else assert(Math.abs(s-BandPlayer.swingFor(tempo))<1e-9);
  // drum onsets = swung positions
  const exp=[];bars.forEach((b,i)=>b.parts.drums.forEach(e=>exp.push(i*4*480+Math.round((e.straight?e.pos:BandPlayer.warp(e.pos,s))*480))));
  assert.deepEqual(m.tracks[3].filter(e=>e.type===0x90).map(e=>e.tick).sort((a,b)=>a-b),exp.sort((a,b)=>a-b));
  assert.equal(m.tracks[0].find(e=>e.meta===0x51).data.reduce((a,b)=>a*256+b,0),Math.round(6e7/tempo));
  const one=parse(BandMidi.build(bars.slice(3,8),{parts:["bass"]}));assert.equal(one.tracks.length,2);
  const last=Math.max(...one.tracks[1].filter(e=>e.type).map(e=>e.tick));assert(last<=5*4*480+480);
}
console.log("MIDI OK");
// ---- ABC: every bar sums to the meter
function barLen(tok){let t=tok.replace(/"[^"]*"/g,"").replace(/![^!]*!/g,""),sum=0,trip=0,m;
  const re=/\(3|\[[^\]]*\](\d*)|[_=^]*[A-Ga-gz][,']*(\d*)/g;
  while((m=re.exec(t))){if(m[0]==="(3"){trip=3;continue}let n=parseInt(m[1]||m[2]||"1",10);if(trip>0){sum+=n*2/3;trip--}else sum+=n}return sum}
let nb=0;
for(const seed of [1,2,3,4,5,6,7,8]) for(const tempo of [100,160,260]) for(const bf of ["walk","two"]) for(const key of ["F","Bb","E"]){
  const p2=key==="F"?parsed:TuneChart.parse(abc.replace("K:F","K:"+key)); // spelling stress only
  const bars=BandMidi.generate(p2,{bars:24,tempo,opts:{bassFeel:bf},rng:mb(seed*13+tempo)});
  const out=BandNotation.toAbc(bars,{key,drums:true});
  out.split("\n").filter(l=>/^\[V:/.test(l)).forEach(l=>l.replace(/^\[V:\w\]/,"").replace(/\[K:[^\]]*\]/,"").replace(/\|\]/,"|").split("|").map(x=>x.trim()).filter(Boolean).forEach(b=>{nb++;const L=barLen(b);assert(Math.abs(L-8)<1e-6,"bar length "+L+" in: "+b)}));
}
console.log("ABC OK bars",nb);
const bars=BandMidi.generate(parsed,{bars:12,tempo:120,opts:{},rng:mb(11)});
console.log(BandNotation.toAbc(bars,{key:"F",drums:true}));
