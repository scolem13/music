const {launch}=require("./cdp.js");
(async()=>{const b=await launch();try{await b.goto("http://127.0.0.1:8500/tools/backing-track.html");await b.sleep(800);
const r=await b.eval(`(async function(){var abc='X:1\\nM:4/4\\nL:1/4\\nK:F\\n"F7"z4 | "Bb7"z4 | "F7"z4 | "C7"z4 |]';var out={};
for(const feel of ["swing","straight"]){var evs=[];await BandPlayer.renderOffline({parsed:TuneChart.parse(abc),tempo:120,choruses:1,countIn:0,humanize:0,seed:3,opts:{feel:feel,ride:"hat"},onEvent:function(e){evs.push(e)}});
var off=evs.filter(e=>Math.abs(e.pos-Math.floor(e.pos)-0.5)<1e-9).map(e=>+((e.L-Math.floor(e.L))).toFixed(4));out[feel]={n:off.length,fracs:[...new Set(off)]};}
document.getElementById("bt-feel").value="straight";document.getElementById("bt-feel").dispatchEvent(new Event("change"));return out;})()`);
console.log(JSON.stringify(r),"errors",JSON.stringify(b.errors.filter(e=>!/supabase/.test(e))));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
