// The arrangement lessons (lessons/arrange-*.qmd, apps/shared/lessons/arrange-kit.js): every demo plays and writes its staves,
// part buttons and choices work while playing, and the organ's controls reach the model. Server on 8500 (tests/band/README.md).
const { launch } = require("../lead/cdp.js"), wait = ms => new Promise(r => setTimeout(r, ms));
const SHOT = process.env.SHOT;
(async () => {
  const b = await launch({ width: 1200, height: 900 }); let bad = 0;
  function ok(c, m) { if (!c) { bad++; console.log("FAIL", m); } }
  for (const page of ["arrange-band", "arrange-bass-drums", "arrange-chords", "arrange-organ"]) {
    await b.goto(`http://127.0.0.1:8500/lessons/${page}.html`); await wait(800);
    const n = await b.eval("document.querySelectorAll('.ar-demo').length");
    for (let i = 0; i < n; i++) {
      await b.eval(`document.querySelectorAll('.ar-demo')[${i}].querySelector('.ar-play').click()`);
      let svg = 0; for (let t = 0; t < 40 && !svg; t++) { await wait(500); svg = await b.eval(`document.querySelectorAll('.ar-demo')[${i}].querySelectorAll('.ar-staff svg').length`); }
      ok(svg, `${page} demo ${i + 1}: no staff written`);
      const ch = await b.eval(`document.querySelectorAll('.ar-demo')[${i}].querySelectorAll('.ar-choices button').length`);
      if (ch > 1) { await b.eval(`document.querySelectorAll('.ar-demo')[${i}].querySelectorAll('.ar-choices button')[1].click()`); await wait(300); }
      await b.eval(`document.querySelectorAll('.ar-demo')[${i}].querySelector('.ar-chip').click()`); await wait(1500);
      if (SHOT && i === 0) await b.shot(`${SHOT}/${page}.png`, true);
    }
    await b.eval("document.getElementById('ar-stop').click()");
    if (page === "arrange-organ") {
      await b.eval("var r=document.querySelectorAll('.ao-bar input')[3]; r.value=6; r.dispatchEvent(new Event('input'))");
      ok(await b.eval("BandSounds.getTonebars('hammond').join('')") === "888600000", "tonebar 4' did not reach the model");
      await b.eval("[...document.querySelectorAll('.ao-seg button')].find(x=>/Fast/.test(x.textContent)).click()");
      ok(await b.eval("BandSounds.getControl('hammond','leslie')") === "fast", "Leslie switch");
      await b.eval("[...document.querySelectorAll('.ao-seg button')].find(x=>/Off/.test(x.textContent)).click()");
      ok(await b.eval("BandSounds.getAmp('hammond')[0].mix") === 0, "chorus off");
      await b.eval("[...document.querySelectorAll('.ao-row button')].find(x=>/Hold/.test(x.textContent)).click()"); await wait(800);
      ok(await b.eval("document.querySelectorAll('.ao-key.ao-down').length") === 4, "held chord keys");
      if (SHOT) await b.shot(`${SHOT}/organ-top.png`, false);
    }
  }
  b.errors.filter(e => !/supabaseUrl/.test(e)).forEach(e => { bad++; console.log("ERROR", e); });
  console.log(bad ? "ARRANGE FAILED" : "ARRANGE OK"); await b.close(); process.exit(bad ? 1 : 0);
})();
