// Bass Patterns by Ear in headless Chrome, on a harness built from the page's own HTML blocks (no Quarto render needed).
// Run: node tests/ebass/ear-bass.cdp.js [--shots <dir>]   (also loads _site/practice/bass-patterns-by-ear.html if rendered)
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const qmd = fs.readFileSync(path.join(ROOT, "practice/bass-patterns-by-ear.qmd"), "utf8");
const HARNESS = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
  [...qmd.matchAll(/```\{=html\}\n([\s\S]*?)```/g)].map(m => m[1].replace(/\?v=\d+/g, "")).join("\n");
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/harness.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  const f = path.join(u.startsWith("/apps/") ? ROOT : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__p=[];EBassPage.play=function(m){__p.push(m);return Promise.resolve()};EBassPage.sound=function(){return Promise.resolve({})};`;
  async function run(b, url, w) {
    await b.goto(url); await wait(1500); await b.eval(STUB + `(function(){function set(id,v){var e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event("change"))}
      set("es-tempo","120");set("es-teach","2");set("es-need","1");set("es-tries","1");document.getElementById("es-echo").checked=false;})()`);
    const until = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr)) return; await wait(100); } throw new Error("timed out: " + expr); };
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    const cur = () => b.eval(`JSON.stringify(EarBass.session.cur.midi)`).then(JSON.parse);
    const play = async ms => { for (const m of ms) { await b.eval(`EarBass.noteOn(${m})`); await wait(30); } };
    await check(`[${w}] set info says written range, an octave lower`, async () => { assert(/written range/.test(await txt("#es-set-info")) && /octave lower/.test(await txt("#es-set-info")), await txt("#es-set-info")); });
    await check(`[${w}] learn: fretboard, wrong note, mic frames (low sines as midi), by ear`, async () => {
      await b.eval(`document.getElementById("es-start").click()`);
      await until(`/Your turn/.test(document.getElementById("es-learn-msg").textContent)`);
      const c = await cur();
      c.forEach(m => assert(m >= 40 && m <= 60, "written in range " + m));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#es-learn-fing .ebc-cell").length`), 52, "one fretboard");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#es-learn-fing .ebc-dot.ebc-on").length`), new Set(c).size === c.length ? c.length : await b.eval(`document.querySelectorAll("#es-learn-fing .ebc-dot.ebc-on").length`));
      assert(await b.eval(`!!document.querySelector("#es-learn-fing .eb-staff svg")`), "staff drawn");
      assert(await b.eval(`__p.length`) >= 5, "key + pattern played");
      assert((await b.eval(`__p`)).every(m => m >= 28 && m <= 60), "played an octave below written");
      if (SHOTS) await b.shot(path.join(SHOTS, `ear-bass-${w}.png`), false);
      await play([c[0], c[1] + 1]);
      assert(/Not quite/.test(await txt("#es-learn-msg")));
      await until(`/Your turn/.test(document.getElementById("es-learn-msg").textContent)`);
      for (const m of c) for (let i = 0; i < 4; i++) await b.eval(`EarBass.seg.frame({hz:60,midi:${m - 12}})`);   // mic: sounding = written - 12
      await until(`/Pattern 2 of 2/.test(document.getElementById("es-learn-head").textContent) && /Your turn/.test(document.getElementById("es-learn-msg").textContent)`);
      await play(await cur());
      await until(`!document.getElementById("es-to-ear").hidden`);
      await b.eval(`document.getElementById("es-to-ear").click()`);
      await until(`/Your turn/.test(document.getElementById("es-ear-msg").textContent)`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#es-ear-fing .ebc-cell").length`), 0, "no hints by ear");
      await play(await cur());
      await until(`EarBass.session.results.length===1`);
      assert.strictEqual(await b.eval(`EarBass.session.results[0].result`), "first");
    });
    await check(`[${w}] no page errors`, async () => { assert.deepStrictEqual(b.errors.filter(e => !/sf|soundfont|ERR_|Failed to load|404/i.test(e)), []); });
  }
  for (const [w, h] of [[1280, 900], [390, 844]]) { const b = await launch({ width: w, height: h }); await b.resize(w, h); await run(b, host + "/harness.html", w); await b.close(); }
  if (fs.existsSync(path.join(SITE, "practice/bass-patterns-by-ear.html"))) { const b = await launch({ width: 1280, height: 900 }); await run(b, host + "/practice/bass-patterns-by-ear.html", "page"); await b.close(); }
  else console.log("skip rendered page: _site/practice/bass-patterns-by-ear.html not rendered (Quarto unavailable)");
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
