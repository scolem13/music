const { launch } = require("../lead/cdp.js");
(async()=>{const b=await launch({});try{
  await b.goto("http://127.0.0.1:8500/tools/backing-track.html");await b.sleep(800);
  const H='X:1\\nM:4/4\\nL:1/8\\n%%score K (U D)\\nV:K clef=treble\\nV:U clef=perc stem=up\\nV:D clef=perc stem=down\\nK:F\\n';
  const variants={inlineK:'[V:K] F8|\\n[V:U] [K:C] g8|\\n[V:D] D8|', sepLine:'[V:K] F8|\\nV:U\\nK:C clef=perc\\ng8|\\nV:D\\nK:C clef=perc\\nD8|', kNone:'[V:K] F8|\\nV:U\\nK:none clef=perc\\ng8|\\nV:D\\nK:none clef=perc\\nD8|'};
  console.log(await b.eval(`new Promise(function(res){var sc=document.createElement('script');sc.src='/apps/shared/abcjs-basic.js';sc.onload=function(){var out={};var V=${JSON.stringify(variants)};Object.keys(V).forEach(function(k){try{var abc='${H}'.replace(/\\\\n/g,'\\n')+V[k].replace(/\\\\n/g,'\\n');var v=ABCJS.renderAbc('bt-score',abc,{});var st=v[0].lines[0].staff;out[k]=st.map(function(s){return (s.key.accidentals||[]).length}).join(',')+' w:'+JSON.stringify(v[0].warnings||null)}catch(e){out[k]='ERR '+e.message}});res(JSON.stringify(out))};document.head.appendChild(sc)})`));
}finally{await b.close()}})();
