const { launch } = require("../lead/cdp.js");
(async () => { const b = await launch();
  const URL = "http://127.0.0.1:8500/tools/backing-track.html";
  const abc4 = 'X:1\nT:Handoff Test\nM:4/4\nL:1/4\nK:Bb\n"Bb7"z4 | "Eb7"z4 | "Bb7"z4 | "F7"z4 |]';
  const hand = () => JSON.stringify({v:1,from:"chord-sheet",at:Date.now(),abc:abc4,comp:"guitar",voicing:"drop2",pins:[{bar:0,pos:0,sym:"Bb7",midis:[38,50,61,73]}]});
  await b.goto(URL);
  for (let i = 0; i < 3; i++) {
  await b.eval(`localStorage.setItem('bandHandoff', ${JSON.stringify(hand())})`);
  await b.goto(URL + "?from=chord-sheet"); await b.sleep(700);
  console.log(i, 'abc', JSON.stringify(await b.eval(`document.getElementById('bt-abc').value`)).slice(0,60), await b.eval(`document.getElementById('bt-pinnote-text').textContent`).then(x=>x.slice(0,30)));
  if (i==0) await b.eval(`(function(){var e=document.getElementById('bt-key'); e.value='C'; e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  if (i==1) await b.eval(`(function(){var e=document.getElementById('bt-changes'); e.value='quick'; e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  if (i==2) { await b.eval(`(function(){ var e = document.getElementById('bt-abc'); e.value = e.value.replace('"Eb7"z4', '"Eb9"z4'); e.dispatchEvent(new Event('input', { bubbles:true })); })()`); await b.sleep(700);
  console.log(await b.eval(`document.getElementById('bt-pinnote-text').textContent`), await b.eval(`document.getElementById('bt-abc').value`).then(x=>JSON.stringify(x))); }
  }
  await b.close(); })();
