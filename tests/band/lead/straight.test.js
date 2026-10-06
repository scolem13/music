const fs=require("fs"),vm=require("vm"),assert=require("assert");
const R="/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/";
vm.runInThisContext(fs.readFileSync(R+"drums.js","utf8")); vm.runInThisContext(fs.readFileSync(R+"player.js","utf8"));
function mb(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
assert.strictEqual(BandPlayer.warp(1.5,0.5),1.5); assert.strictEqual(BandPlayer.warp(2.25,0.5),2.25);
const P=new Set("kick snare rim hatClosed hatFoot hatOpen ride rideBell crash tomHi tomMid tomLo".split(" "));
for(const feel of["swing","straight"])for(const ride of["ride","hat","bell"])for(let seed=1;seed<=20;seed++){
  const d=BandDrums.create({rng:mb(seed)});
  for(let b=0;b<120;b++){const ev=d.bar({bar:b,index:b%12,length:12,chorus:Math.floor(b/12),beats:4,tempo:140,last:false,opts:{feel,ride}});
    for(const e of ev){assert(P.has(e.piece)&&e.pos>=0&&e.pos<4&&e.vel>0&&e.vel<=1);
      if(feel==="straight")assert(!e.straight&&Math.abs(e.pos*2-Math.round(e.pos*2))<1e-9,"straight: eighth grid only");}
    const has=p=>ev.some(e=>e.piece===p);
    if(ride==="hat")assert(!has("ride")&&!has("rideBell")&&!has("hatFoot")&&has("hatClosed"));
    if(ride==="ride")assert(!has("hatClosed")&&!has("rideBell")&&has("hatFoot"));
    if(ride==="bell")assert(has("rideBell")||ev.some(e=>e.piece==="crash"));
    if(feel==="straight"&&b%4<3){assert(ev.filter(e=>/ride|hatClosed|rideBell|crash/.test(e.piece)).length===8,"8 eighths");assert.deepStrictEqual(ev.filter(e=>e.piece==="rim").map(e=>e.pos),[1,3]);}
  }}
console.log("straight/cymbal OK");
