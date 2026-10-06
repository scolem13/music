const { open, clipShot, wait } = require("./lib.js");
(async () => {
  const b = await open({ width: 1300, height: 900 });
  try {
    await b.eval(`__t.setChords("Dm7 G7 Cmaj7 A7")`); await wait(500);
    console.log(JSON.stringify(await b.eval("__t.styles('keyboard')")));
    console.log(JSON.stringify(await b.eval("__t.cards('Keyboard').map(c=>c.options.join('|')+' '+c.midis)")));
    await b.eval("__t.setStyle('keyboard','rootless')"); await wait(400);
    console.log(JSON.stringify(await b.eval("__t.cards('Keyboard').map(c=>c.options.join('|')+' '+c.midis+' '+c.labels)")));
    await b.eval("__t.check('chk-notation', true)"); await wait(1500);
    console.log(await b.eval("document.querySelectorAll('.notation-wrap svg').length"));
    await clipShot(b, "smoke-kb.png", "#sheet-output");
    console.log("errors", JSON.stringify(b.errors));
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
