const { launch } = require("../lead/cdp.js"); const assert=require("assert");
(async()=>{const b=await launch({width:1280,height:900});try{
  await b.goto("http://127.0.0.1:8500/tools/backing-track.html");await b.sleep(800);
  const ev=x=>b.eval(x);
  assert.equal(await ev("document.getElementById('bt-notation').open"),false);
  // export before playing
  await ev("document.getElementById('bt-mid-go').click()");
  console.log(await ev("document.getElementById('bt-mid-note').textContent"), await ev("window.__btLastMidi.length"));
  await ev("(function(){var e=document.getElementById('bt-changes');e.value='jazz';e.dispatchEvent(new Event('change',{bubbles:true}));e=document.getElementById('bt-tempo');e.value=300;e.dispatchEvent(new Event('input',{bubbles:true}));e=document.getElementById('bt-countin');e.value=0;e.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await ev("document.getElementById('bt-play').click()");
  await b.sleep(14000);
  await ev("document.getElementById('bt-notation').open=true");await b.sleep(1500);
  console.log("svgs",await ev("document.querySelectorAll('#bt-score svg').length"),"warn",await ev("document.querySelectorAll('#bt-score .abcjs-warning, #bt-score .error').length"));
  await ev("document.getElementById('bt-notation').scrollIntoView()");
  const r=JSON.parse(await ev("JSON.stringify(document.getElementById('bt-notation').getBoundingClientRect())"));
  await b.shot("nt-full.png");
  await ev("document.getElementById('bt-nt-drums').click()");await b.sleep(800);
  await b.shot("nt-drums.png");
  await ev("document.getElementById('bt-mid-go').click()");
  console.log(await ev("document.getElementById('bt-mid-note').textContent"));
  console.log("head",await ev("Array.from(window.__btLastMidi.slice(0,14)).join(',')"));
  await ev("(function(){var e=document.getElementById('bt-mid-range');e.value='last';e.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('bt-mid-n').value=5;document.getElementById('bt-mid-drums').checked=false;document.getElementById('bt-mid-go').click()})()");
  console.log(await ev("document.getElementById('bt-mid-note').textContent"));
  await ev("document.getElementById('bt-play').click()");
  console.log("errors",JSON.stringify(b.errors.filter(e=>!/supabase/.test(e))));
}finally{await b.close()}})().catch(e=>{console.error("FAILED",e.message);process.exit(1)});
