const { launch } = require("../lead/cdp.js");
(async()=>{const b=await launch({width:1100,height:900});try{
  await b.goto("http://127.0.0.1:8500/tools/backing-track.html");await b.sleep(800);
  await b.eval("document.getElementById('bt-nt-drums').click();document.querySelector('#bt-notation summary').click()");await b.sleep(3000);
  console.log("open",await b.eval("document.getElementById('bt-notation').open"),"ABCJS",await b.eval("typeof ABCJS"),"html",await b.eval("document.getElementById('bt-score').innerHTML.slice(0,200)"));
  console.log(JSON.stringify(b.errors), JSON.stringify(b.logs.slice(-5)));
  await b.eval("document.getElementById('bt-score').scrollIntoView()");await b.shot("nt-idle.png",false);
}finally{await b.close()}})();
