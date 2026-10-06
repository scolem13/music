const { launch } = require("../lead/cdp.js");
(async()=>{const b=await launch({width:1100,height:900});try{
  await b.goto("http://127.0.0.1:8500/tools/backing-track.html");await b.sleep(800);
  await b.eval("document.getElementById('bt-nt-drums').checked=true;document.getElementById('bt-notation').open=true");await b.sleep(4000);
  await b.eval("document.getElementById('bt-score').scrollIntoView()");
  console.log("svgs",await b.eval("document.querySelectorAll('#bt-score svg').length"),"errs",JSON.stringify(b.errors.filter(e=>!/supabase/.test(e))));
  await b.send("Emulation.setDeviceMetricsOverride",{width:1100,height:520,deviceScaleFactor:1,mobile:false});
  await b.shot("nt-idle.png",false);
}finally{await b.close()}})();
