// The trumpet / tuba fingering lesson in headless Chrome.
// Run: quarto render lessons/brass-fingerings.qmd && node tests/brass/brass.cdp.js [--shots <dir>]
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
  const STUB = `window.__notes=[];BrassChart.tone=function(ac,out,m){__notes.push(m)};BrassPage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    const n = sel => b.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
    const click = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const svgClick = (root, v) => b.eval(`document.querySelector('${root} .brc-v[data-v="${v}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
    const setSel = (root, cls, v) => b.eval(`(function(){var s=document.querySelector('${root} ${cls}');s.value=${JSON.stringify(v)};s.dispatchEvent(new Event("change"))})()`);
    await b.goto(host + "/lessons/brass-fingerings.html"); await wait(1500); await b.eval(STUB);
    await check(`[${w}] trumpet explorer`, async () => {
      assert.strictEqual(await n("#br-explorer .brp-nb"), 31);
      await click('#br-explorer .brp-nb[data-m="62"]');
      assert.strictEqual(await n("#br-explorer .brp-fig"), 1);
      assert.strictEqual(await txt("#br-explorer .brp-valtxt"), "13");
      assert(/3rd slide/.test(await txt("#br-explorer .brp-fig figcaption")));
      assert(await b.eval(`!!document.querySelector("#br-explorer .brp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [60], "written D4 sounds C4");
      assert.strictEqual(await n("#br-explorer .brc-down"), 2);
      if (SHOTS) await b.shot(path.join(SHOTS, `brass-explorer-${w}.png`), false);
    });
    await check(`[${w}] toggles: concert, staff off, names off`, async () => {
      await setSel("#br-explorer", ".brp-pitch", "concert");
      assert(/C4/.test(await txt("#br-explorer .brp-big")), await txt("#br-explorer .brp-big"));
      await setSel("#br-explorer", ".brp-pitch", "written");
      await b.eval(`document.querySelector("#br-explorer .brp-chk input").click()`);
      assert.strictEqual(await n("#br-explorer .brp-staff svg"), 0, "staff hidden");
      await b.eval(`document.querySelectorAll("#br-explorer .brp-chk input")[1].click()`);
      assert.strictEqual(await txt("#br-explorer .brp-big"), "?");
      assert(/Staff and names are both hidden/.test(await txt("#br-explorer .brp-card")));
      await b.eval(`document.querySelectorAll("#br-explorer .brp-chk input")[0].click();document.querySelectorAll("#br-explorer .brp-chk input")[1].click()`);
      assert.strictEqual(await n("#br-explorer .brp-staff svg"), 1);
      assert(/D4/.test(await txt("#br-explorer .brp-big")));
    });
    await check(`[${w}] tuba explorer: bass clef and valve 4`, async () => {
      await setSel("#br-explorer", ".brp-inst", "tuba");
      assert.strictEqual(await n("#br-explorer .brp-nb"), 26);
      await click('#br-explorer .brp-nb[data-m="29"]');
      assert.strictEqual(await n("#br-explorer .brp-fig"), 2, "13 and 4");
      assert.strictEqual(await n("#br-explorer .brc-v"), 8, "4 valves drawn twice");
      assert(await b.eval(`document.querySelector("#br-explorer .brp-staff svg").innerHTML.length>200`));
      assert(/F♯1|F1/.test(await txt("#br-explorer .brp-big")));
      if (SHOTS) await b.shot(path.join(SHOTS, `brass-tuba-${w}.png`), false);
      await setSel("#br-explorer", ".brp-inst", "trumpet");
    });
    await check(`[${w}] builder: which notes, and quiz`, async () => {
      await setSel("#br-builder", ".brp-inst", "trumpet");
      await svgClick("#br-builder", 1); await svgClick("#br-builder", 3);
      assert.strictEqual(await n("#br-builder .brp-notes li"), 2, "13 plays D4 and G3");
      assert(/G3/.test(await txt("#br-builder .brp-notes")) && /D4/.test(await txt("#br-builder .brp-notes")));
      await svgClick("#br-builder", 2);   // 1 + 2 + 3 down
      assert(/F♯\/G♭3/.test(await txt("#br-builder .brp-notes")), await txt("#br-builder .brp-notes"));
      await click("#br-builder .btn-group button:nth-child(2)");
      assert(/Press the valves for/.test(await txt("#br-builder .brp-ask")));
      await b.eval(`document.querySelector("#br-builder .btn-primary").click()`);   // Check with nothing pressed
      assert(/Not yet|Yes/.test(await txt("#br-builder .brp-out")));
      await b.eval(`[].find.call(document.querySelectorAll("#br-builder button"),function(x){return x.textContent==="Show me"}).click()`);   // Show me
      await b.eval(`document.querySelector("#br-builder .btn-primary").click()`);
      assert(/Yes/.test(await txt("#br-builder .brp-out")), await txt("#br-builder .brp-out"));
      assert(/\d+ of \d+/.test(await txt("#br-builder .brp-side > .brp-muted")));
    });
    await check(`[${w}] table and works cited`, async () => {
      assert.strictEqual(await n("#br-table .brp-tb"), 31, "trumpet chart notes");
      await click("#br-table .brp-tb");
      assert(await b.eval(`__notes.length`) >= 2);
      assert(/StepWise/.test(await txt(".works-cited")));
      assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "no horizontal page scroll");
      if (SHOTS) await b.shot(path.join(SHOTS, `brass-page-${w}.png`), true);
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
