// The horn widgets (explorer, builder + quiz, table) in headless Chrome, 1280 and 390 px.
// Serves the repo's raw files with its own harness page (no Quarto render needed). With --site it also loads the rendered lesson
// (_site/lessons/horn.html, after `quarto render lessons/horn.qmd`) and checks the page draws and has a Works Cited.
// Run: node tests/horn/horn.cdp.js [--site] [--shots <dir>]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null, WITH_SITE = process.argv.includes("--site");
const HARNESS = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0 16px;font-family:system-ui">
<link rel=stylesheet href="/apps/shared/horn/horn.css"><script src="/apps/shared/abcjs-basic.js"></script><script src="/apps/shared/horn/horn-chart.js"></script><script src="/apps/shared/horn/horn-page.js"></script>
<div id=hn-explorer></div><div id=hn-builder></div><div id=hn-table></div>
<script>HornPage.explorer(hn_explorer=document.getElementById("hn-explorer"));HornPage.builder(document.getElementById("hn-builder"));HornPage.chartTable(document.getElementById("hn-table"));</script>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/harness.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  const base = u.startsWith("/apps/") ? ROOT : SITE, f = path.join(base, u);
  if (!f.startsWith(base)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__notes=[];HornChart.tone=function(ac,out,m){__notes.push(m)};HornPage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  const pages = [["harness", "/harness.html"]].concat(WITH_SITE ? [["lesson", "/lessons/horn.html"]] : []);
  for (const [pn, url] of pages) for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    const n = sel => b.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
    const click = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const svgClick = (root, v) => b.eval(`document.querySelector('${root} .hnc-v[data-v="${v}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
    const setSel = (root, cls, v) => b.eval(`(function(){var s=document.querySelector('${root} ${cls}');s.value=${JSON.stringify(v)};s.dispatchEvent(new Event("change"))})()`);
    await b.goto(host + url); await wait(1500); await b.eval(STUB);
    const T = `[${pn} ${w}] `;
    await check(T + "explorer, double horn", async () => {
      assert.strictEqual(await n("#hn-explorer .hnp-nb"), 32);
      await click('#hn-explorer .hnp-nb[data-m="73"]');   // C#5: F 2 or 1 2, Bb 2 3
      assert.strictEqual(await n("#hn-explorer .hnp-fig"), 3, "F, F alternate, B♭");
      assert.strictEqual(await n("#hn-explorer .hnp-fig.rec"), 1, "one suggested side");
      assert(/Bb|B♭/.test(await txt("#hn-explorer .hnp-fig.rec figcaption")), "B♭ side suggested above G♯4");
      assert(await b.eval(`!!document.querySelector("#hn-explorer .hnp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [66], "written C♯5 sounds F♯4");
      assert.strictEqual(await n("#hn-explorer .hnc-t.hnc-down"), 1, "thumb down on the B♭ figure");
      if (SHOTS) await b.shot(path.join(SHOTS, `horn-explorer-${pn}-${w}.png`), false);
    });
    await check(T + "toggles: concert, single horns, names off", async () => {
      await setSel("#hn-explorer", ".hnp-pitch", "concert");
      assert(/F♯\/G♭4/.test(await txt("#hn-explorer .hnp-big")), await txt("#hn-explorer .hnp-big"));
      await setSel("#hn-explorer", ".hnp-pitch", "written");
      await setSel("#hn-explorer", ".hnp-type", "f");
      assert.strictEqual(await n("#hn-explorer .hnp-fig"), 2, "single F: usual and alternate");
      assert.strictEqual(await n("#hn-explorer .hnc-t"), 0, "no thumb lever on a single horn");
      await setSel("#hn-explorer", ".hnp-type", "bb");
      assert.strictEqual(await n("#hn-explorer .hnp-fig"), 1);
      await setSel("#hn-explorer", ".hnp-type", "double");
      await b.eval(`document.querySelector("#hn-explorer .hnp-chk input").click()`);
      assert.strictEqual(await n("#hn-explorer .hnp-staff svg"), 0, "staff hidden");
      await b.eval(`document.querySelectorAll("#hn-explorer .hnp-chk input")[1].click()`);
      assert.strictEqual(await txt("#hn-explorer .hnp-big"), "?");
      await b.eval(`document.querySelectorAll("#hn-explorer .hnp-chk input")[0].click();document.querySelectorAll("#hn-explorer .hnp-chk input")[1].click()`);
      assert.strictEqual(await n("#hn-explorer .hnp-staff svg"), 1);
    });
    await check(T + "builder: which notes, and quiz", async () => {
      await svgClick("#hn-builder", 1);                      // F side, lever 1: F3 ... 
      assert(/F3/.test(await txt("#hn-builder .hnp-notes")) && /F5/.test(await txt("#hn-builder .hnp-notes")), await txt("#hn-builder .hnp-notes"));
      await svgClick("#hn-builder", "T");                    // thumb: B♭ side, lever 1 = B♭3, B♭4... (written A♯/B♭)
      assert(/B♭3|A♯\/B♭3/.test(await txt("#hn-builder .hnp-notes")), await txt("#hn-builder .hnp-notes"));
      assert(/B♭ side/.test(await txt("#hn-builder .hnp-valbig")));
      await click("#hn-builder .btn-group button:nth-child(2)");
      assert(/Press the levers for/.test(await txt("#hn-builder .hnp-ask")));
      await b.eval(`document.querySelector("#hn-builder .btn-primary").click()`);
      assert(/Not yet|Yes/.test(await txt("#hn-builder .hnp-out")));
      await b.eval(`[].find.call(document.querySelectorAll("#hn-builder button"),function(x){return x.textContent==="Show me"}).click()`);
      await b.eval(`document.querySelector("#hn-builder .btn-primary").click()`);
      assert(/Yes/.test(await txt("#hn-builder .hnp-out")), await txt("#hn-builder .hnp-out"));
      assert(/\d+ of \d+/.test(await txt("#hn-builder .hnp-side > .hnp-muted")));
    });
    await check(T + "table", async () => {
      assert.strictEqual(await n("#hn-table .hnp-tb"), 32);
      assert.strictEqual(await n("#hn-table tr.sw"), 1);
      await b.eval(`__notes=[]`); await click("#hn-table .hnp-tb");
      assert.deepStrictEqual(await b.eval(`__notes`), [77], "top row is C6 and sounds F5");
      assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "no horizontal page scroll");
      if (WITH_SITE && pn === "lesson") assert(/Horn|W74/.test(await txt(".works-cited")), "works cited");
      if (SHOTS) await b.shot(path.join(SHOTS, `horn-page-${pn}-${w}.png`), true);
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
