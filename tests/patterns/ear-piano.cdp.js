// Patterns by Ear page (rendered _site/practice/patterns-by-ear.html) in headless Chrome, keys sent as fake MIDI (MidiFeel.inject):
// learn two patterns from the marked keys, a wrong note is caught, by ear: a first-try pattern, a missed one shown, results table.
// Run: quarto render practice/patterns-by-ear.qmd && node tests/patterns/ear-piano.cdp.js [--shots <dir>]
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
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const until = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr)) return; await wait(100); } throw new Error("timed out: " + expr); };
    const msg = id => b.eval(`document.getElementById("${id}").textContent`);
    const play = async ms => { for (const m of ms) { await b.eval(`MidiFeel.inject("on", ${m}, 90)`); await wait(40); } };
    const cur = () => b.eval(`JSON.stringify(EarPiano.session.cur.midi)`).then(JSON.parse);
    await b.goto(host + "/practice/patterns-by-ear.html"); await wait(1200);
    // no samples needed: sound goes to a stub that records the notes
    await b.eval(`window.__notes=[];AbcPlay.ctx=function(){return Promise.resolve({ac:{currentTime:0,resume:function(){return Promise.resolve()}},out:null,
      bank:{load:function(){return Promise.resolve()},play:function(s,o){__notes.push(o.midi)}}})};
      (function(){function set(id,v){var e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event("change"))}
      set("ep-tempo","140");set("ep-teach","2");set("ep-need","1");set("ep-tries","1");document.getElementById("ep-echo").checked=false;})()`);
    await check(`[${w}] set up: 322a, D, keyboard drawn`, async () => {
      assert.strictEqual(await b.eval(`document.getElementById("ep-set").value`), "322a");
      assert.strictEqual(await b.eval(`document.getElementById("ep-key").value`), "2");
      const keys = await b.eval(`document.querySelectorAll("#ep-kb-learn .ep-k").length`); assert(keys >= 20 && keys <= 30, "keys " + keys);
      assert(/16 patterns in D minor\. The first 2/.test(await msg("ep-set-info")));
    });
    await check(`[${w}] learn: marked keys, fingers, a wrong note caught, right one moves on`, async () => {
      await b.eval(`document.getElementById("ep-start").click()`);
      await until(`/Your turn/.test(document.getElementById("ep-learn-msg").textContent)`);
      assert((await b.eval(`__notes.length`)) >= 10, "key chords and pattern sounded");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ep-kb-learn .ep-mark").length`), 2, "D and F, D marked once");
      assert.strictEqual(await b.eval(`document.querySelector("#ep-kb-learn .ep-ord").textContent`), "1·3");
      assert(/Fingers: 1 – 3 – 1/.test(await msg("ep-learn-fing")), await msg("ep-learn-fing"));
      assert.strictEqual(await msg("ep-learn-solf"), "La Do La");
      if (SHOTS) await b.shot(path.join(SHOTS, `ear-learn-${w}.png`), false);
      await play([62, 64]);
      assert(/note 2 is F, you played E/.test(await msg("ep-learn-msg")), await msg("ep-learn-msg"));
      await until(`/Your turn/.test(document.getElementById("ep-learn-msg").textContent)`);
      await play(await cur());
      await until(`/Pattern 2 of 2/.test(document.getElementById("ep-learn-head").textContent) && /Your turn/.test(document.getElementById("ep-learn-msg").textContent)`);
      await play((await cur()).map(m => m + 12));   // an octave up counts
      await until(`!document.getElementById("ep-to-ear").hidden`);
    });
    await check(`[${w}] by ear: first try, a miss shown, results`, async () => {
      await b.eval(`document.getElementById("ep-to-ear").click()`);
      await until(`/Your turn/.test(document.getElementById("ep-ear-msg").textContent)`, 15000);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ep-kb-ear .ep-mark").length`), 0, "no hints by ear");
      await play(await cur());
      await until(`/Pattern 2 of 14/.test(document.getElementById("ep-ear-head").textContent) && /Your turn/.test(document.getElementById("ep-ear-msg").textContent)`);
      const c = await cur(); await play([c[0] + 1]);
      assert((await b.eval(`document.querySelectorAll("#ep-kb-ear .ep-mark").length`)) > 0, "shown after the last try");
      if (SHOTS) await b.shot(path.join(SHOTS, `ear-shown-${w}.png`), false);
      await until(`/Your turn/.test(document.getElementById("ep-ear-msg").textContent)`);
      await play(c);
      await until(`/Pattern 3 of 14/.test(document.getElementById("ep-ear-head").textContent)`);
      for (let k = 0; k < 12; k++) await b.eval(`document.getElementById("ep-ear-skip").click()`);
      await until(`/on the first try/.test(document.getElementById("ep-res-sum").textContent)`);
      assert(/1 of 14/.test(await msg("ep-res-sum")), await msg("ep-res-sum"));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ep-res-table tbody tr").length`), 14);
      assert(!(await b.eval(`document.getElementById("ep-again").hidden`)));
      if (SHOTS) await b.shot(path.join(SHOTS, `ear-results-${w}.png`), false);
    });
    await check(`[${w}] no sideways scroll`, async () => assert((await b.eval(`document.documentElement.scrollWidth`)) <= w + 1));
    await b.close();
  }
  server.close(); console.log(failed ? `${failed} FAILED` : "EAR PIANO PAGE OK"); process.exit(failed ? 1 : 0);
})();
