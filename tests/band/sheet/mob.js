const { open, clipShot, wait } = require("./lib.js");
(async () => {
  const b = await open({ width: 1300, height: 900 });
  try {
    await b.resize(390, 800);
    const notation = process.argv[2] !== "off";
    await b.eval(`__t.setChords("Dm7 G7 Cmaj7 A7"); __t.enable('guitar', true); __t.setStyle('keyboard','rootless'); __t.setStyle('guitar','drop2'); ${notation ? "__t.check('chk-notation', true);" : ""}`); await wait(1800);
    console.log(await b.eval(`JSON.stringify({iw:innerWidth, sw:document.documentElement.scrollWidth, wide:[...document.querySelectorAll('#chord-sheet-root *')].filter(e=>e.getBoundingClientRect().right>392).slice(0,12).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)+' '+(e.closest('.diagram-card')?'card':''))})`));
  } finally { await b.close(); }
})();
