// Horn Patterns by Ear in headless Chrome, on a harness built from practice/horn-patterns-by-ear.qmd's own HTML blocks (no Quarto render).
// Run: node tests/horn/ear-horn.cdp.js [--shots <dir>]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const qmd = fs.readFileSync(path.join(ROOT, "practice/horn-patterns-by-ear.qmd"), "utf8");
const blocks = []; qmd.replace(/```\{=html\}\n([\s\S]*?)```/g, (_, b) => { blocks.push(b); return ""; });
const HARNESS = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0 16px;font-family:system-ui">` + blocks.join("\n");
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/ear.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__notes=[];HornChart.tone=function(ac,out,m){__notes.push(m)};HornPage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr)) return; await wait(100); } throw new Error("timeout: " + expr); };
    await b.goto(host + "/ear.html"); await wait(1500);
    await b.eval(STUB + `(function(){function set(id,v){var e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event("change"))}
      set("eh-tempo","120");set("eh-teach","2");set("eh-need","1");set("eh-tries","1");document.getElementById("eh-echo").checked=false;})()`);
    const cur = () => b.eval(`JSON.stringify(EarHorn.session.cur.midi)`).then(JSON.parse);
    const play = async ms => { for (const m of ms) { await b.eval(`EarHorn.noteOn(${m})`); await wait(30); } };
    await check(`[${w}] horn ear: learn from levers, wrong note, mic path, by ear, results`, async () => {
      assert(/written range/.test(await txt("#eh-set-info")), await txt("#eh-set-info"));
      await b.eval(`document.getElementById("eh-start").click()`);
      await until(`/Your turn/.test(document.getElementById("eh-learn-msg").textContent)`);
      const c = await cur();
      c.forEach(m => assert(m >= 60 && m <= 79, "in the easy range " + m));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#eh-learn-fing .eh-fig").length`), c.length);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#eh-learn-fing .hnc").length`), c.length, "a lever diagram per note");
      assert(await b.eval(`__notes.length`) >= 10, "key context and pattern played");
      assert(await b.eval(`__notes.every(function(m){return m>=40&&m<=80})`), "all notes at concert pitch");
      if (SHOTS) await b.shot(path.join(SHOTS, `horn-ear-${w}.png`), false);
      await play([c[0], c[1] + 1]);
      assert(/Not quite/.test(await txt("#eh-learn-msg")));
      await until(`/Your turn/.test(document.getElementById("eh-learn-msg").textContent)`);
      // microphone path: concert pitch frames, a fifth below written
      for (const m of c) for (let i = 0; i < 4; i++) await b.eval(`EarHorn.seg.frame({hz:300,midi:${m - 7}})`);
      await until(`/Pattern 2 of 2/.test(document.getElementById("eh-learn-head").textContent) && /Your turn/.test(document.getElementById("eh-learn-msg").textContent)`);
      await play(await cur());
      await until(`!document.getElementById("eh-to-ear").hidden`);
      await b.eval(`document.getElementById("eh-to-ear").click()`);
      await until(`/Your turn/.test(document.getElementById("eh-ear-msg").textContent)`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#eh-ear-fing .eh-fig").length`), 0, "no hints by ear");
      await play(await cur());
      await until(`EarHorn.session.results.length===1`);
      assert.strictEqual(await b.eval(`EarHorn.session.results[0].result`), "first");
      assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "no horizontal page scroll");
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
