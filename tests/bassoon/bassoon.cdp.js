// The bassoon widgets (fingering chart, build a fingering, trills) in headless Chrome, at 1280 and 390 px.
// Widgets are loaded on a small page made from the raw files, so no Quarto render is needed. If _site/lessons/bassoon.html exists
// (after `quarto render lessons/bassoon.qmd`) the real page is checked as well.   Run: node tests/bassoon/bassoon.cdp.js [--shots <dir>]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const HARNESS = `<!doctype html><meta charset=utf-8><link rel=stylesheet href="/apps/shared/bassoon/bassoon.css">
<script src="/apps/shared/abcjs-basic.js"></script><script src="/apps/shared/bassoon/bassoon-chart.js"></script><script src="/apps/shared/bassoon/bassoon-page.js"></script>
<div id=bn-explorer></div><div id=bn-builder></div><div id=bn-trills></div>
<script>BassoonPage.explorer(document.getElementById("bn-explorer"));BassoonPage.builder(document.getElementById("bn-builder"));BassoonPage.trills(document.getElementById("bn-trills"));</script>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/__harness.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  const root = fs.existsSync(path.join(ROOT, u)) && u.startsWith("/apps/") ? ROOT : SITE, f = path.join(root, u);
  if (!f.startsWith(root)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__notes=[];BassoonChart.tone=function(ac,out,m){__notes.push(m)};BassoonPage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  const pages = [["widgets", "/__harness.html"]];
  if (fs.existsSync(path.join(SITE, "lessons/bassoon.html"))) pages.push(["lesson", "/lessons/bassoon.html"]);
  for (const [w, h] of [[1280, 900], [390, 844]]) for (const [pname, url] of pages) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    await b.goto(host + url); await wait(1500); await b.eval(STUB);
    await check(`[${w} ${pname}] chart: 37 notes, two F♯3 fingerings, staff, sound`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#bn-explorer .bnp-nb").length`), 37);
      await b.eval(`document.querySelector('#bn-explorer .bnp-nb[data-m="54"]').click()`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#bn-explorer .bnp-fig").length`), 2, "two F♯3 fingerings");
      assert(await b.eval(`!!document.querySelector("#bn-explorer .bnp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [54], "bassoon sounds as written");
      assert(await b.eval(`document.querySelectorAll("#bn-explorer .bnc-down").length`) >= 8, "keys down");
      if (SHOTS) await b.shot(path.join(SHOTS, `bassoon-chart-${pname}-${w}.png`), false);
    });
    await check(`[${w} ${pname}] builder: holes 1-5 + whisper key = A2`, async () => {
      for (const k of ["h1", "h2", "h3", "h4", "h5", "W"]) await b.eval(`document.querySelector('#bn-builder .bnc-k[data-k="${k}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert(/A2/.test(await txt("#bn-builder .bnp-out")), await txt("#bn-builder .bnp-out"));
    });
    await check(`[${w} ${pname}] builder: F3 = whisper key alone`, async () => {
      await b.eval(`[...document.querySelectorAll('#bn-builder .bnc-down')].forEach(p=>p.dispatchEvent(new MouseEvent("click",{bubbles:true})))`);
      await b.eval(`document.querySelector('#bn-builder .bnc-k[data-k="W"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert(/F3/.test(await txt("#bn-builder .bnp-out")), await txt("#bn-builder .bnp-out"));
      await b.eval(`[...document.querySelectorAll('#bn-builder button')].find(x=>/Quiz/.test(x.textContent)).click()`);
      assert(/Finger/.test(await txt("#bn-builder .bnp-ask")), "quiz asks");
      await b.eval(`[...document.querySelectorAll('#bn-builder button')].find(x=>/Show me/.test(x.textContent)).click()`);
      assert(await b.eval(`document.querySelectorAll("#bn-builder .bnc-down").length`) >= 1, "Show me presses keys");
    });
    await check(`[${w} ${pname}] trills: 35 cards, gray keys, play`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#bn-trills .bnp-tcard").length`), 35);
      assert(await b.eval(`document.querySelectorAll("#bn-trills .bnc-trill").length`) >= 35, "gray keys");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#bn-trills .bnp-staff svg").length`), 35, "staves drawn");
      await b.eval(`__notes=[];document.querySelector("#bn-trills .bnp-tcard button").click()`); await wait(100);
      assert.strictEqual(await b.eval(`__notes.length`), 12);
      assert.strictEqual(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth`), true, "no horizontal scroll");
      if (SHOTS) { await b.eval(`document.getElementById("bn-trills").scrollIntoView()`); await b.shot(path.join(SHOTS, `bassoon-trills-${pname}-${w}.png`), false); }
    });
    if (pname === "lesson") await check(`[${w}] lesson: Works Cited names the book`, async () => assert(/Kjos/.test(await txt(".works-cited"))));
    if (b.errors.length) { failed++; console.log("FAIL console errors:", b.errors.slice(0, 3)); }
    if (b.close) await b.close();
  }
  console.log(failed ? failed + " FAILED" : "bassoon.cdp: all ok"); process.exit(failed ? 1 : 0);
})();
