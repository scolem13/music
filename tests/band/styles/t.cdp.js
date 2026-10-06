const { launch } = require("../lead/cdp.js");
(async()=>{
 const b=await launch({width:1280,height:900});
 try{
  await b.goto("http://127.0.0.1:8500/tools/accomp-styles.html"); await b.sleep(1500);
  console.log("cards before", await b.eval("document.querySelectorAll('#as-genre .as-card').length+' '+document.querySelectorAll('#as-instrument .as-card').length+' play '+document.querySelectorAll('.as-play').length+' svgGenre '+document.querySelectorAll('#as-genre .as-notation svg').length"));
  console.log("tab", await b.eval("getComputedStyle(document.getElementById('as-band-tab')).display"));
  await b.eval("document.getElementById('as-band-tab').click()"); await b.sleep(800);
  console.log(await b.eval(`JSON.stringify({cards:document.querySelectorAll('#as-band .as-card').length, svgs:document.querySelectorAll('#as-band .as-notation svg').length, hitsBoxes:document.querySelectorAll('#as-band .as-notation[data-hits]').length, links:[...document.querySelectorAll('#as-band .as-link')].map(a=>a.getAttribute('href')), ow:document.documentElement.scrollWidth+'/'+innerWidth, genreHidden:document.getElementById('as-genre').style.display})`));
  await b.eval("document.getElementById('as-band').scrollIntoView()");
  await b.shot(__dirname+"/band-desktop.png");
  await b.resize(390,844); await b.sleep(800);
  console.log("mobile overflow", await b.eval("document.documentElement.scrollWidth+'/'+innerWidth"));
  await b.shot(__dirname+"/band-mobile.png");
  await b.resize(1280,900);
  await b.eval("document.querySelector('.as-toggle button').click()"); await b.sleep(300);
  console.log("genre visible", await b.eval("getComputedStyle(document.getElementById('as-genre')).display+' bandhidden '+getComputedStyle(document.getElementById('as-band')).display"));
  console.log("errors", JSON.stringify(b.errors), JSON.stringify(b.failed));
 }finally{await b.close();}
})();
