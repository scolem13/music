const { launch } = require("../lead/cdp.js");
(async()=>{const b=await launch({});try{
  await b.goto("http://127.0.0.1:8500/tools/backing-track.html");await b.sleep(800);
  console.log(await b.eval(`new Promise(function(res){var sc=document.createElement('script');sc.src='/apps/shared/abcjs-basic.js';sc.onload=function(){try{var p=TuneChart.parse(document.getElementById('bt-abc').value);var bars=BandMidi.generate(p,{bars:12,tempo:120,opts:{}});var abc=BandNotation.toAbc(bars,{key:'F',drums:true});var v=ABCJS.renderAbc('bt-score',abc,{});res('ok '+JSON.stringify(v[0].warnings||[]).slice(0,600))}catch(e){res('ERR '+e.stack)}};document.head.appendChild(sc)})`));
}finally{await b.close()}})();
