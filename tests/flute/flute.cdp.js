// The flute lesson (fingering chart, build a fingering, trills) and Flute Patterns by Ear, in headless Chrome, at 1280 and 390 px.
// Run: node tests/flute/flute.cdp.js [--shots <dir>]
// With a rendered site (quarto render lessons/flute.qmd practice/flute-patterns-by-ear.qmd) it tests _site; without one it builds each
// page from the {=html} blocks of the .qmd (scripts, styles, widget divs: no headings, no works cited), so the widgets are still tested.
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const RENDERED = fs.existsSync(path.join(SITE, "lessons/flute.html")) && fs.existsSync(path.join(SITE, "practice/flute-patterns-by-ear.html"));
function raw(qmd) { const s = fs.readFileSync(path.join(ROOT, qmd), "utf8"); let out = "<!doctype html><meta charset=utf-8><body>"; s.replace(/```\{=html\}\n([\s\S]*?)```/g, (_, h) => { out += h + "\n"; }); return out; }
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (!RENDERED && u === "/lessons/flute.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(raw("lessons/flute.qmd")); }
  if (!RENDERED && u === "/practice/flute-patterns-by-ear.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(raw("practice/flute-patterns-by-ear.qmd")); }
  const base = RENDERED ? SITE : ROOT, f = path.join(base, u);
  if (!f.startsWith(base)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  console.log(RENDERED ? "testing the rendered site" : "no render: testing pages built from the .qmd html blocks");
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__notes=[];FluteChart.tone=function(ac,out,m){__notes.push(m)};FlutePage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr)) return; await wait(100); } throw new Error("timed out: " + expr); };
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    await b.goto(host + "/lessons/flute.html"); await wait(1500); await b.eval(STUB);
    await check(`[${w}] lesson: chart, builder, trills`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#fl-explorer .flp-nb").length`), 37);
      await b.eval(`document.querySelector('#fl-explorer .flp-nb[data-m="70"]').click()`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#fl-explorer .flp-fig").length`), 3, "three B♭ fingerings");
      assert(await b.eval(`!!document.querySelector("#fl-explorer .flp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [70], "non-transposing: B♭4 sounds B♭4");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#fl-explorer .flp-fig .flc-down").length`), 4 + 3 + 4, "keys down in the three diagrams (4+3+4)");
      if (SHOTS) await b.shot(path.join(SHOTS, `flute-chart-${w}.png`), false);
      for (const k of ["l1", "l2", "l3", "ds", "tB"]) await b.eval(`document.querySelector('#fl-builder .flc-k[data-k="${k}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert(/G/.test(await txt("#fl-builder .flp-out")) && /G4, G5/.test(await txt("#fl-builder .flp-out")), await txt("#fl-builder .flp-out"));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#fl-trills .flp-tcard").length`), 37);
      assert(await b.eval(`document.querySelectorAll("#fl-trills .flc-trill").length`) >= 37, "gray keys");
      assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "no horizontal scroll");
      if (RENDERED) assert(/Kjos/.test(await txt(".works-cited")));
    });
    await check(`[${w}] lesson: quiz Check / Show me`, async () => {
      await b.eval(`document.querySelectorAll("#fl-builder .btn-group button")[1].click()`);
      assert(/Finger/.test(await txt("#fl-builder .flp-ask")));
      await b.eval(`Array.from(document.querySelectorAll("#fl-builder .flp-side button")).find(x=>x.textContent==="Show me").click()`);
      await b.eval(`Array.from(document.querySelectorAll("#fl-builder .flp-side button")).find(x=>x.textContent==="Check").click()`);
      assert(/Yes/.test(await txt("#fl-builder .flp-out")), await txt("#fl-builder .flp-out"));
    });
    await b.goto(host + "/practice/flute-patterns-by-ear.html"); await wait(1500);
    await b.eval(STUB + `(function(){function set(id,v){var e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event("change"))}
      set("ef-tempo","120");set("ef-teach","2");set("ef-need","1");set("ef-tries","1");document.getElementById("ef-echo").checked=false;})()`);
    const cur = () => b.eval(`JSON.stringify(EarFlute.session.cur.midi)`).then(JSON.parse);
    const play = async ms => { for (const m of ms) { await b.eval(`EarFlute.noteOn(${m})`); await wait(30); } };
    await check(`[${w}] ear: learn from fingerings, wrong note, by ear, results`, async () => {
      assert(/written range/.test(await txt("#ef-set-info")), await txt("#ef-set-info"));
      await b.eval(`document.getElementById("ef-start").click()`);
      await until(`/Your turn/.test(document.getElementById("ef-learn-msg").textContent)`);
      const c = await cur();
      c.forEach(m => assert(m >= 60 && m <= 88, "in range " + m));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ef-learn-fing .ef-fig").length`), c.length);
      assert(await b.eval(`__notes.length`) >= 10);
      if (SHOTS) await b.shot(path.join(SHOTS, `flute-ear-${w}.png`), false);
      await play([c[0], c[1] + 1]);
      assert(/Not quite/.test(await txt("#ef-learn-msg")));
      await until(`/Your turn/.test(document.getElementById("ef-learn-msg").textContent)`);
      // through the microphone path: the flute does not transpose, so frames are the written pitch
      for (const m of c) for (let i = 0; i < 4; i++) await b.eval(`EarFlute.seg.frame({hz:300,midi:${m}})`);
      await until(`/Pattern 2 of 2/.test(document.getElementById("ef-learn-head").textContent) && /Your turn/.test(document.getElementById("ef-learn-msg").textContent)`);
      await play(await cur());
      await until(`!document.getElementById("ef-to-ear").hidden`);
      await b.eval(`document.getElementById("ef-to-ear").click()`);
      await until(`/Your turn/.test(document.getElementById("ef-ear-msg").textContent)`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ef-ear-fing .ef-fig").length`), 0, "no hints by ear");
      await play(await cur());
      await until(`EarFlute.session.results.length===1`);
      assert.strictEqual(await b.eval(`EarFlute.session.results[0].result`), "first");
      assert.deepStrictEqual(b.errors.filter(e => !/favicon|404/.test(e)), [], "no page errors");
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
