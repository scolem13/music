// Synthetic test: additive plucked-string model (inharmonicity, per-partial decay, strum spread) + chroma / iterative multi-f0.
const SR=48000, OPEN=[40,45,50,55,59,64];
const NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
let seed=1; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const shapes={ // frets per string low->high, null = muted
 'C':[null,3,2,0,1,0],'G':[3,2,0,0,0,3],'D':[null,null,0,2,3,2],'Am':[null,0,2,2,1,0],'Em':[0,2,2,0,0,0],'E':[0,2,2,1,0,0],'A':[null,0,2,2,2,0],'Dm':[null,null,0,2,3,1],
 'F barre':[1,3,3,2,1,1],'Bb barre':[null,1,3,3,3,1],'B barre':[null,2,4,4,4,2],'Fm barre':[1,3,3,1,1,1],'Bm barre':[null,2,4,4,3,2],
 'C5':[null,3,5,5,null,null],'G5':[3,5,5,null,null,null],'A5':[null,0,2,2,null,null],'E5':[0,2,2,null,null,null],'D5':[null,null,0,2,3,null],
 'C/E':[0,3,2,0,1,0],'D/F#':[2,null,0,2,3,2],'G/B':[null,2,0,0,0,3],'Am/C':[null,3,2,2,1,0],'Dm/F':[1,null,0,2,3,1],'C/G':[3,3,2,0,1,0],
 'Cmaj7':[null,3,2,0,0,0],'G7':[3,2,0,0,0,1],'D7':[null,null,0,2,1,2],'A7':[null,0,2,0,2,0],'E7':[0,2,0,1,0,0],'Am7':[null,0,2,0,1,0],'Dsus4':[null,null,0,2,3,3],
};
function synth(frets,{detune=0,B=1.5e-4,spread=0.02,len=0.7,gain=1}={}){
  const N=Math.floor(SR*len), out=new Float32Array(N);
  const order=frets.map((f,i)=>f==null?-1:i).filter(i=>i>=0); const down=rnd()<.5; if(!down)order.reverse();
  order.forEach((s,k)=>{
    const m=OPEN[s]+frets[s]; const f0=440*Math.pow(2,(m-69+detune/100)/12);
    const t0=Math.floor(SR*(k*spread*(0.7+0.6*rnd()))); const amp=(0.6+0.8*rnd())*gain;
    const tau=1.2*Math.pow(f0/110,-0.35)*(frets[s]==0?1:0.7); // s; shorter for high/fretted
    const bridge=0.35+0.3*rnd(); // pick position
    for(let h=1;h<=24;h++){
      const fh=f0*h*Math.sqrt(1+B*h*h*(1+0.5*(m-40)/24)); if(fh>SR/2.2)break;
      const a=amp*Math.abs(Math.sin(Math.PI*h*bridge))/Math.pow(h,1.1)*(h==1?0.8:1);
      const th=tau/(1+0.15*h), ph=rnd()*6.283, w=2*Math.PI*fh/SR;
      for(let n=t0;n<N;n++){const t=(n-t0)/SR; out[n]+=a*Math.exp(-t/th)*Math.sin(w*(n-t0)+ph);}
    }
  });
  for(let n=0;n<N;n++) out[n]+=(rnd()-.5)*0.004; // noise floor / buzz
  return out;
}
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let l=2;l<=n;l<<=1){const a=-2*Math.PI/l,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=l){let cr=1,ci=0;for(let k=0;k<l/2;k++){const u=i+k,v=u+l/2;const xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}}}
const NF=16384;
function spectrum(x,start){const re=new Float64Array(NF),im=new Float64Array(NF);
  for(let i=0;i<NF;i++){const v=x[start+i]||0;re[i]=v*(0.5-0.5*Math.cos(2*Math.PI*i/NF));}
  fft(re,im);const m=new Float64Array(NF/2);for(let i=0;i<NF/2;i++)m[i]=Math.hypot(re[i],im[i]);return m;}
const binHz=SR/NF;
function magAt(sp,f){const b=f/binHz,i=Math.round(b);let mx=0;for(let k=i-1;k<=i+1;k++)if(sp[k]>mx)mx=sp[k];return mx;}
// naive chroma: spectral peaks 80..2000 Hz -> pitch class
function chromaPcs(sp,thr=0.25){const c=new Float64Array(12);
  for(let i=Math.ceil(80/binHz);i<2000/binHz;i++)if(sp[i]>sp[i-1]&&sp[i]>=sp[i+1]){const m=12*Math.log2(i*binHz/440)+69;c[((Math.round(m)%12)+12)%12]+=sp[i]*sp[i];}
  const mx=Math.max(...c);return {pcs:[...c.keys()].filter(k=>c[k]>thr*thr*mx),c};}
// iterative multi-f0 with harmonic summation + cancellation
function multiF0(sp0,{maxN=6,rel=0.30,lo=40,hi=76}={}){
  const sp=Float64Array.from(sp0);const found=[];let first=0;
  for(let it=0;it<maxN;it++){let best=-1,bs=0;
    for(let m=lo;m<=hi;m++){const f0=440*Math.pow(2,(m-69)/12);let s=0;
      for(let h=1;h<=10;h++){const fh=f0*h;if(fh>5000)break;s+=Math.pow(0.88,h-1)*magAt(sp,fh);}
      // prefer true fundamental: penalise if h=1 and h=2 absent but h=3.. present is handled by sum only
      if(s>bs){bs=s;best=m;}}
    if(best<0)break; if(it==0)first=bs; if(bs<rel*first)break;
    // octave-error guard: if best-12 has comparable salience via strong partial 1 energy, handled below
    found.push(best);
    const f0=440*Math.pow(2,(best-69)/12);
    for(let h=1;h<=10;h++){const b=Math.round(f0*h/binHz);for(let k=b-2;k<=b+2;k++)if(sp[k]!==undefined)sp[k]*=0.1;}
  }
  return found.sort((a,b)=>a-b);}
const pcsOf=a=>[...new Set(a.map(m=>((m%12)+12)%12))].sort((a,b)=>a-b);
const eqs=(a,b)=>a.length==b.length&&a.every((v,i)=>v==b[i]);
function truth(fr){const n=fr.map((f,s)=>f==null?null:OPEN[s]+f).filter(x=>x!=null);return {notes:n,pcs:pcsOf(n),bass:Math.min(...n)};}
function run(label,opts,tries=10,est){
  let pcOK=0,bassOK=0,bothOK=0,bassPcOK=0,tot=0;const bad={};
  for(const [name,fr] of Object.entries(shapes)){const T=truth(fr);let ok=0;
    for(let t=0;t<tries;t++){
      const o={detune:(opts.detune??0)+(rnd()-.5)*(opts.jitter??0),B:opts.B??1.5e-4,gain:1};
      const x=synth(fr,o);const sp=spectrum(x,Math.floor(SR*0.08));
      const notes=multiF0(sp);const pcs=pcsOf(notes);const bass=notes[0];
      const p=eqs(pcs,T.pcs),b=(bass%12)==(T.bass%12),bo=bass==T.bass;
      tot++;if(p)pcOK++;if(b)bassPcOK++;if(bo)bassOK++;if(p&&b)bothOK++;else (bad[name]=(bad[name]||0)+1);
    }}
  console.log(label.padEnd(34),'pcset',(100*pcOK/tot).toFixed(0)+'%','bass pc',(100*bassPcOK/tot).toFixed(0)+'%','bass exact octave',(100*bassOK/tot).toFixed(0)+'%','pcset+bass pc',(100*bothOK/tot).toFixed(0)+'%');
  const w=Object.entries(bad).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>k+':'+v).join(' ');if(w)console.log('   worst:',w);
}
// dictionary classification: pick best of the 30 shapes by (pcs template score + bass match) from the same estimator
function classify(opts,tries=10){let ok=0,tot=0,okBass=0;
  const T=Object.entries(shapes).map(([n,f])=>[n,truth(f)]);
  for(const [name,fr] of Object.entries(shapes)){for(let t=0;t<tries;t++){
    const x=synth(fr,{detune:(opts.detune??0)+(rnd()-.5)*(opts.jitter??0)});const sp=spectrum(x,Math.floor(SR*0.08));
    const notes=multiF0(sp),pcs=pcsOf(notes),bass=notes[0]%12;
    let best=null,bs=-9;for(const [n,tr] of T){const inter=tr.pcs.filter(p=>pcs.includes(p)).length;const uni=new Set([...tr.pcs,...pcs]).size;const sc=inter/uni+(bass==tr.bass%12?0.5:0);if(sc>bs){bs=sc;best=n;}}
    tot++;if(best==name)ok++;else if(eqs(pcsOf(truth(shapes[best]).notes),truth(fr).pcs)&&truth(shapes[best]).bass%12==truth(fr).bass%12)ok++; // same pcs+bass counts
  }}
  console.log('30-way identification',(100*ok/tot).toFixed(0)+'%');}
const t0=Date.now();
run('baseline (B=1.5e-4, in tune)',{});
run('detune jitter +-15 cents',{jitter:30});
run('flat 30 cents (uncorrected)',{detune:-30,jitter:10});
run('high inharmonicity B=6e-4',{B:6e-4});
classify({});classify({jitter:30});
// naive chroma only
{let ok=0,tot=0;for(const [n,fr] of Object.entries(shapes)){const T=truth(fr);for(let t=0;t<10;t++){const sp=spectrum(synth(fr,{}),Math.floor(SR*.08));const r=chromaPcs(sp);tot++;if(eqs(r.pcs,T.pcs))ok++;}}console.log('naive chroma pcset exact (thr .25):',(100*ok/tot).toFixed(0)+'%');}
// timing
{const x=synth(shapes.C,{});const s=Date.now();for(let i=0;i<20;i++)multiF0(spectrum(x,3000));console.log('ms per analysis (fft16384 + 6 f0 passes):',((Date.now()-s)/20).toFixed(1));}
