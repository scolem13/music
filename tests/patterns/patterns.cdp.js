// Tonal Patterns + Tonal Sequences (rendered _site/practice/*.html) in headless Chrome: draws, Individual/Class views,
// zero-length notes made playable, Play starts AbcPlay and stops, no sideways scroll at phone width.
// Run: quarto render practice/patterns.qmd && quarto render practice/tonal-sequences.qmd && node tests/patterns/patterns.cdp.js [--shots <dir>]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const server = http.createServer((req, res) => {
  const f = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(SITE)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  // Record what AbcPlay is asked to play instead of needing the sample CDN.
  const spy = `window.__plays=[];var _p=AbcPlay.play;AbcPlay.play=function(v,o){var n=0;v.lines.forEach(function(l){(l.staff||[]).forEach(function(s){s.voices.forEach(function(vv){vv.forEach(function(e){if(e.el_type==="note"&&e.pitches&&e.duration>0)n++;});});});});__plays.push({n:n,o:o});return {stop:function(){o.onEnd&&o.onEnd();}};};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    await b.goto(host + "/practice/patterns.html"); await wait(1500);
    await check(`[${w}] patterns: individual view draws one staff`, async () => {
      assert.strictEqual(await b.eval(`document.getElementById("patterns-root").className`), "indiv");
      assert((await b.eval(`document.querySelectorAll("#paper0 .abcjs-note").length`)) >= 2);
    });
    await check(`[${w}] patterns: class view shows four staves`, async () => {
      await b.eval(`document.querySelector('[data-mode="class"]').click()`);
      assert.strictEqual(await b.eval(`[0,1,2,3].filter(function(i){return document.querySelectorAll("#paper"+i+" .abcjs-note").length>=2}).length`), 4);
      if (SHOTS) await b.shot(path.join(SHOTS, `patterns-class-${w}.png`));
      await b.eval(`document.querySelector('[data-mode="indiv"]').click()`);
      if (SHOTS) await b.shot(path.join(SHOTS, `patterns-indiv-${w}.png`));
    });
    await check(`[${w}] patterns: no sideways scroll`, async () => assert((await b.eval(`document.documentElement.scrollWidth`)) <= w + 1));
    await check(`[${w}] patterns: play sends real notes, button toggles`, async () => {
      await b.eval(spy);
      await b.eval(`document.getElementById("key-select").value="7";document.getElementById("key-select").dispatchEvent(new Event("change"))`);
      await b.eval(`document.querySelector("#tp-play .pp-play").click()`);
      const p = await b.eval(`JSON.stringify(__plays[0]&&{n:__plays[0].n,t:__plays[0].o.transpose})`);
      assert.deepStrictEqual(JSON.parse(p), { n: 3, t: -5 });
      assert.strictEqual(await b.eval(`document.querySelector("#tp-play .pp-play").textContent`), "■ Stop");
      await b.eval(`document.querySelector("#tp-play .pp-play").click()`);
      assert.strictEqual(await b.eval(`document.querySelector("#tp-play .pp-play").textContent`), "▶ Play");
    });
    await check(`[${w}] patterns: Make a set builds, plays and survives a reload`, async () => {
      await b.eval(`localStorage.removeItem("tp-generated")`);
      await b.eval(`(function(){var c=document.getElementById("show-gen");c.checked=true;c.dispatchEvent(new Event("change"));
        document.getElementById("gen-chords").value="i7, V7, iiø7";var m=document.getElementById("gen-mode");m.value="minor";
        document.getElementById("gen-make").click();})()`);
      assert.strictEqual(await b.eval(`document.getElementById("gen-msg").textContent`), "");
      assert(/^★ i7 V7 iiø7/.test(await b.eval(`document.getElementById("pattern-selector").value`)));
      assert.strictEqual(await b.eval(`document.getElementById("tune-selector").options.length`), 16);
      assert((await b.eval(`document.querySelectorAll("#paper0 .abcjs-note").length`)) >= 3);
      if (SHOTS) await b.shot(path.join(SHOTS, `generated-${w}.png`));
      await b.eval(spy); await b.eval(`document.querySelector("#tp-play .pp-play").click()`);
      assert((await b.eval(`__plays[0].n`)) >= 2);
      await b.eval(`document.getElementById("gen-chords").value="I, Q7";document.getElementById("gen-make").click()`);
      assert(/Can't read/.test(await b.eval(`document.getElementById("gen-msg").textContent`)));
      await b.goto(host + "/practice/patterns.html"); await wait(1200);
      assert(await b.eval(`Array.from(document.getElementById("pattern-selector").options).some(function(o){return /^★ i7/.test(o.value)})`));
    });
    await b.goto(host + "/practice/tonal-sequences.html"); await wait(1500);
    await check(`[${w}] sequences: cells added play as notes`, async () => {
      await b.eval(spy);
      assert(await b.eval(`Array.from(document.getElementById("collection-selector-ts").options).some(function(o){return /^★ i7/.test(o.value)})`), "saved set listed");
      await b.eval(`appendCell_ts(0);appendCell_ts(1)`);
      await b.eval(`document.querySelector("#audio-ts .pp-play").click()`);
      assert((await b.eval(`__plays[0].n`)) >= 4);
      if (SHOTS) await b.shot(path.join(SHOTS, `sequences-${w}.png`));
    });
    await check(`[${w}] sequences: no sideways scroll`, async () => assert((await b.eval(`document.documentElement.scrollWidth`)) <= w + 1));
    await b.close();
  }
  server.close(); console.log(failed ? `${failed} FAILED` : "PATTERNS OK"); process.exit(failed ? 1 : 0);
})();
