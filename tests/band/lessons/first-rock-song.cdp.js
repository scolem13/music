// First Rock Song (lessons/first-rock-song.qmd): every demo plays, every level button can be chosen while playing, the band
// writes the part's staff, and the page logs no errors. Server on 8500 (tests/band/README.md).
const { launch } = require("../lead/cdp.js"), wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await launch({ width: 1200, height: 900 }); let bad = 0;
  function ok(c, m) { if (!c) { bad++; console.log("FAIL", m); } }
  await b.goto("http://127.0.0.1:8500/lessons/first-rock-song.html"); await wait(800);
  const n = await b.eval("document.querySelectorAll('.ar-demo').length");
  ok(n === 6, `expected 6 demos, found ${n}`);
  // the chord shapes come from the Chord Library's engine: 12 guitar cards and one keyboard, each with a library link, none missing
  ok(await b.eval("document.querySelectorAll('.sc-card').length") === 13, "expected 13 shape cards");
  ok(await b.eval("document.querySelectorAll('.sc-shapes a.sc-lib').length") === 16, "expected 16 library links");
  ok(await b.eval("[...document.querySelectorAll('.sc-shapes a.sc-lib')].every(a => /chord-library\\.html#.*shape=/.test(a.href))"), "library links lack a shape");
  const D = i => `document.querySelectorAll('.ar-demo')[${i}]`;
  for (let i = 0; i < n; i++) {
    await b.eval(`${D(i)}.querySelector('.ar-play').click()`);
    let svg = 0; for (let t = 0; t < 40 && !svg; t++) { await wait(500); svg = await b.eval(`${D(i)}.querySelectorAll('.ar-staff svg').length`); }
    ok(svg, `demo ${i + 1}: no staff written`);
    const ch = await b.eval(`${D(i)}.querySelectorAll('.ar-choices button').length`);
    for (let k = 1; k < ch; k++) {
      await b.eval(`${D(i)}.querySelectorAll('.ar-choices button')[${k}].click()`); await wait(2600);
      ok(await b.eval(`${D(i)}.querySelectorAll('.ar-staff svg').length`), `demo ${i + 1} level ${k + 1}: no staff`);
    }
  }
  await b.eval("document.getElementById('ar-stop').click()");
  b.errors.filter(e => !/supabaseUrl/.test(e)).forEach(e => { bad++; console.log("ERROR", e); });
  console.log(bad ? "FIRST ROCK SONG FAILED" : "FIRST ROCK SONG OK"); await b.close(); process.exit(bad ? 1 : 0);
})();
