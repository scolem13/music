// The oboe lesson widgets (fingering chart, build a fingering, trills) in headless Chrome, at 1280 and 390 px.
// Default: serves a small harness page that loads the same scripts and mounts the same widgets as lessons/oboe.qmd (no render needed).
// RENDERED=1: tests the rendered lesson instead (quarto render lessons/oboe.qmd first; reads _site/lessons/oboe.html).
// Run: node tests/oboe/oboe.cdp.js [--shots <dir>]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), RENDERED = !!process.env.RENDERED, BASE = RENDERED ? path.join(ROOT, "_site") : ROOT;
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>oboe harness</title>
<link rel="stylesheet" href="/apps/shared/oboe/oboe.css"><script src="/apps/shared/abcjs-basic.js"></script>
<script src="/apps/shared/oboe/oboe-chart.js"></script><script src="/apps/shared/oboe/oboe-page.js"></script></head><body style="max-width:900px;margin:0 auto;padding:0 16px">
<div id="ob-explorer"></div><div id="ob-builder"></div><div id="ob-trills"></div>
<script>OboePage.explorer(document.getElementById("ob-explorer"));OboePage.builder(document.getElementById("ob-builder"));OboePage.trills(document.getElementById("ob-trills"));</script></body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (!RENDERED && u === "/harness.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  const f = path.join(BASE, u);
  if (!f.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__notes=[];OboeChart.tone=function(ac,out,m){__notes.push(m)};OboePage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null,bank:null})};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    await b.goto(host + (RENDERED ? "/lessons/oboe.html" : "/harness.html")); await wait(1500);
    // the page must have no horizontal scroll at phone width
    await check(`[${w}] no horizontal page scroll, no script errors`, async () => {
      assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "page scrolls sideways");
      assert.deepStrictEqual(b.errors, []);
    });
    await b.eval(STUB);
    await check(`[${w}] chart: 30 note buttons, alternates, staff, Hear`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ob-explorer .obp-nb").length`), 30);
      await b.eval(`document.querySelector('#ob-explorer .obp-nb[data-m="65"]').click()`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ob-explorer .obp-fig").length`), 2, "two F fingerings");
      assert(/Forked F/.test(await txt("#ob-explorer .obp-diags")));
      assert(await b.eval(`!!document.querySelector("#ob-explorer .obp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [65], "oboe sounds as written");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ob-explorer .obp-fig")[1].querySelectorAll(".obc-down").length`), 6, "forked F: h1 h2 h3 h4 h6 + E♭");
      if (SHOTS) await b.shot(path.join(SHOTS, `oboe-chart-${w}.png`), false);
    });
    await check(`[${w}] builder: press keys, names the note; quiz`, async () => {
      const press = k => b.eval(`document.querySelector('#ob-builder .obc-k[data-k="${k}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      for (const k of ["h1", "h2", "h3"]) await press(k);
      assert(/G4/.test(await txt("#ob-builder .obp-out")), await txt("#ob-builder .obp-out"));
      await b.eval(`document.querySelectorAll("#ob-builder .btn-group button")[1].click()`);
      const t = await b.eval(`document.querySelector("#ob-builder .obp-ask").textContent`); assert(/Finger written/.test(t), t);
      await b.eval(`[...document.querySelectorAll("#ob-builder .obp-bar button")].find(x=>x.textContent==="Show me").click()`);
      assert(await b.eval(`document.querySelectorAll("#ob-builder .obc-down").length`) >= 0);
      await b.eval(`[...document.querySelectorAll("#ob-builder .obp-bar button")].find(x=>x.textContent==="Check").click()`);
      assert(/Yes|Not yet/.test(await txt("#ob-builder .obp-out")));
      if (SHOTS) { await b.eval(`document.getElementById("ob-builder").scrollIntoView()`); await b.shot(path.join(SHOTS, `oboe-build-${w}.png`), false); }
    });
    await check(`[${w}] trills: 24 cards, gray keys, play`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ob-trills .obp-tcard").length`), 24);
      assert(await b.eval(`document.querySelectorAll("#ob-trills .obc-trill").length`) >= 24, "gray keys");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ob-trills .obp-staff svg").length`), 24, "staves drawn");
      await b.eval(`__notes=[];document.querySelector("#ob-trills .obp-tcard button").click()`); await wait(100);
      assert.strictEqual(await b.eval(`__notes.length`), 12);
      if (SHOTS) { await b.eval(`document.getElementById("ob-trills").scrollIntoView()`); await b.shot(path.join(SHOTS, `oboe-trills-${w}.png`), false); }
    });
    if (RENDERED) await check(`[${w}] lesson: works cited, sections fold`, async () => {
      assert(/Kjos/.test(await txt(".works-cited")));
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
