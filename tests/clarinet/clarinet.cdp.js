// The clarinet lesson (fingering chart, build a fingering, trills) and Clarinet Patterns by Ear, in headless Chrome.
// Run: quarto render lessons/clarinet.qmd && quarto render practice/clarinet-patterns-by-ear.qmd && node tests/clarinet/clarinet.cdp.js [--shots <dir>]
// (not yet run against a render: Quarto was not available when this was written; the same code was checked in a hand-made page, see the sources notes)
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || path.join(ROOT, "_site");
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
  const STUB = `window.__notes=[];ClarChart.tone=function(ac,out,m){__notes.push(m)};ClarPage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr)) return; await wait(100); } throw new Error("timed out: " + expr); };
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    await b.goto(host + "/lessons/clarinet.html"); await wait(1500); await b.eval(STUB);
    await check(`[${w}] lesson: chart, builder, trills`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#clr-explorer .clp-nb").length`), 39);
      await b.eval(`document.querySelector('#clr-explorer .clp-nb[data-m="63"]').click()`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#clr-explorer .clp-fig").length`), 3, "three E♭ fingerings");
      assert(await b.eval(`!!document.querySelector("#clr-explorer .clp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [61], "written E♭4 on the B♭ clarinet sounds C♯4");
      if (SHOTS) await b.shot(path.join(SHOTS, `clarinet-chart-${w}.png`), false);
      for (const k of ["th", "l1", "l2", "l3"]) await b.eval(`document.querySelector('#clr-builder .clc-k[data-k="${k}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert(/written B♯\/C4|written C4|C4/.test(await txt("#clr-builder .clp-out")), await txt("#clr-builder .clp-out"));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#clr-trills .clp-tcard").length`), 34);
      assert(await b.eval(`document.querySelectorAll("#clr-trills .clc-trill").length`) >= 34, "gray keys");
      assert(/Excellence|instrument guide|Teacher/i.test(await txt(".works-cited")));
    });
    await b.goto(host + "/practice/clarinet-patterns-by-ear.html"); await wait(1500);
    await b.eval(STUB + `(function(){function set(id,v){var e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event("change"))}
      set("ec-tempo","120");set("ec-teach","2");set("ec-need","1");set("ec-tries","1");document.getElementById("ec-echo").checked=false;})()`);
    const cur = () => b.eval(`JSON.stringify(EarClar.session.cur.midi)`).then(JSON.parse);
    const play = async ms => { for (const m of ms) { await b.eval(`EarClar.noteOn(${m})`); await wait(30); } };
    await check(`[${w}] ear: learn from fingerings, wrong note, by ear, results`, async () => {
      assert(/written range/.test(await txt("#ec-set-info")), await txt("#ec-set-info"));
      await b.eval(`document.getElementById("ec-start").click()`);
      await until(`/Your turn/.test(document.getElementById("ec-learn-msg").textContent)`);
      const c = await cur();
      c.forEach(m => assert(m >= 55 && m <= 77, "in range " + m));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ec-learn-fing .ec-fig").length`), c.length);
      assert(await b.eval(`__notes.length`) >= 10);
      if (SHOTS) await b.shot(path.join(SHOTS, `clarinet-ear-${w}.png`), false);
      await play([c[0], c[1] + 1]);
      assert(/Not quite/.test(await txt("#ec-learn-msg")));
      await until(`/Your turn/.test(document.getElementById("ec-learn-msg").textContent)`);
      // through the microphone path: concert pitch frames (B♭ clarinet: written - 2)
      for (const m of c) for (let i = 0; i < 4; i++) await b.eval(`EarClar.seg ? EarClar.seg.frame({hz:300,midi:${m - 2}}) : EarClar.noteOn(${m})`);
      await until(`/Pattern 2 of 2/.test(document.getElementById("ec-learn-head").textContent) && /Your turn/.test(document.getElementById("ec-learn-msg").textContent)`);
      await play(await cur());
      await until(`!document.getElementById("ec-to-ear").hidden`);
      await b.eval(`document.getElementById("ec-to-ear").click()`);
      await until(`/Your turn/.test(document.getElementById("ec-ear-msg").textContent)`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ec-ear-fing .ec-fig").length`), 0, "no hints by ear");
      await play(await cur());
      await until(`EarClar.session.results.length===1`);
      assert.strictEqual(await b.eval(`EarClar.session.results[0].result`), "first");
    });
    await check(`[${w}] clarinet by-ear results are in the student's report: one right, one shown`, async () => {
      await until(`/Pattern 2 of/.test(document.getElementById("ec-ear-head").textContent) && /Your turn/.test(document.getElementById("ec-ear-msg").textContent)`);
      const c = await cur(); await play([c[0] + 1]);
      await until(`EarClar.session.results.length===2`);
      const it = JSON.parse(await b.eval(`JSON.stringify(SiteRecord.all().filter(x => x.tool === "ear-clarinet"))`));
      assert.strictEqual(it.length, 2, "records: " + it.length);
      assert(it.every(x => x.ex === "Clarinet Patterns by Ear" && x.at.length === 1 && x.want), JSON.stringify(it[0]));
      assert.deepStrictEqual(it.map(x => x.at[0][1]), [1, 0]);
      assert.deepStrictEqual(it.map(x => x.rv), [0, 1]);
      assert(await b.eval(`!!document.querySelector(".sr-mybtn")`), "My report button");
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
