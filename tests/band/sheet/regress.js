const fs=require("fs"),path=require("path");const {launch}=require("./cdp.js");
const H=fs.readFileSync("helpers.js","utf8"),wait=ms=>new Promise(r=>setTimeout(r,ms));
const pcs=m=>[...new Set(m.map(x=>x%12))].sort((a,b)=>a-b).join();
async function grab(url){const b=await launch({width:1300,height:900});const out={};
 try{await b.goto(url);await b.eval("localStorage.clear()");await b.goto(url);await b.eval(H);
 for(const prog of ["Dm7 G7 Cmaj7 A7","F7 Bb7 Bdim7 Am7b5 D7b9 C6 Am Cmaj9 G13"]){
  await b.eval(`__t.setChords(${JSON.stringify(prog)});__t.enable('guitar',true)`);await wait(400);
  for(const [inst,sec,styles] of [["keyboard","Keyboard",["standard","shell"]],["guitar","Guitar",["standard","shell","drop2","drop3","set3:all","set3:1"]]]) for(const st of styles){
   await b.eval(`__t.setStyle('${inst}','${st}')`);await wait(250);
   out[prog+"|"+inst+"|"+st]=(await b.eval(`__t.cards('${sec}')`)).map(c=>({o:c.options,m:c.midis,u:c.unavail,sw:null}));
   if(inst==="keyboard") out[prog+"|"+inst+"|"+st+"|sweep"]=await b.eval("__t.sweep('Keyboard')");
  }}}finally{await b.close()}return out}
(async()=>{const a=await grab("http://127.0.0.1:8320/__c/head.html"),n=await grab("http://127.0.0.1:8320/__c/chord-sheet.html");
 let same=0,diff=[];
 for(const k of Object.keys(a)){ if(k.endsWith("|sweep")){ const A=a[k].map(c=>c.map(pcs)),N=n[k].map(c=>c.map(pcs)); (JSON.stringify(A)===JSON.stringify(N))?same++:diff.push(k+" sweep pcs\n  "+JSON.stringify(A)+"\n  "+JSON.stringify(N)); continue;}
  const fret=k.includes("|guitar|"); const A=a[k],N=n[k];
  const eq=JSON.stringify(A.map(c=>[c.o,fret?c.m:pcs(c.m||[]),c.u]))===JSON.stringify(N.map(c=>[c.o,fret?c.m:pcs(c.m||[]),c.u]));
  eq?same++:diff.push(k+"\n  "+JSON.stringify(A.map(c=>[c.o.join("/"),c.m]))+"\n  "+JSON.stringify(N.map(c=>[c.o.join("/"),c.m])));}
 console.log("same",same,"diff",diff.length);console.log(diff.map(d=>d.split("\n")[0]).join("\n"));})();
