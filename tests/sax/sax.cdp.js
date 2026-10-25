// The saxophone lesson (fingering chart, build a fingering, trills) and Sax Patterns by Ear, in headless Chrome.
// Run: quarto render lessons/saxophone.qmd && quarto render practice/sax-patterns-by-ear.qmd && node tests/sax/sax.cdp.js [--shots <dir>]
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
  const STUB = `window.__notes=[];SaxChart.tone=function(ac,out,m){__notes.push(m)};SaxPage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr)) return; await wait(100); } throw new Error("timed out: " + expr); };
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    await b.goto(host + "/lessons/saxophone.html"); await wait(1500); await b.eval(STUB);
    await check(`[${w}] lesson: altissimo cards, overtone ladder`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#sx-altissimo .sxp-tcard").length`), 6);
      assert(/Crunch G/.test(await txt("#sx-altissimo")), "Crunch G card");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#sx-altissimo .sxp-staff svg").length`), 6, "staves drawn");
      await b.eval(`__notes=[];document.querySelectorAll("#sx-overtones .sxp-bar button")[3].click()`); await wait(100);
      const n = await b.eval(`__notes`); assert.strictEqual(n.length, 2); assert(Math.abs(n[1] - n[0] - 24) < 1e-9, "4th partial = 2 octaves up");
      if (SHOTS) { await b.eval(`document.getElementById("altissimo").scrollIntoView()`); await b.shot(path.join(SHOTS, `sax-alt-${w}.png`), false); }
      await b.eval(`__notes=[]`);
    });
    await check(`[${w}] lesson: chart, builder, trills`, async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#sx-explorer .sxp-nb").length`), 32);
      await b.eval(`document.querySelector('#sx-explorer .sxp-nb[data-m="82"]').click()`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#sx-explorer .sxp-fig").length`), 4, "four B♭ fingerings");
      assert(await b.eval(`!!document.querySelector("#sx-explorer .sxp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [73], "B♭5 on alto sounds C♯5");
      if (SHOTS) await b.shot(path.join(SHOTS, `sax-chart-${w}.png`), false);
      for (const k of ["b1", "a2", "g3"]) await b.eval(`document.querySelector('#sx-builder .sxc-k[data-k="${k}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert(/written G4/.test(await txt("#sx-builder .sxp-out")), await txt("#sx-builder .sxp-out"));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#sx-trills .sxp-tcard").length`), 28);
      assert(await b.eval(`document.querySelectorAll("#sx-trills .sxc-trill").length`) >= 28, "gray keys");
      assert(/Kjos/.test(await txt(".works-cited")));
    });
    await b.goto(host + "/practice/sax-patterns-by-ear.html"); await wait(1500);
    await b.eval(STUB + `(function(){function set(id,v){var e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event("change"))}
      set("es-tempo","120");set("es-teach","2");set("es-need","1");set("es-tries","1");document.getElementById("es-echo").checked=false;})()`);
    const cur = () => b.eval(`JSON.stringify(EarSax.session.cur.midi)`).then(JSON.parse);
    const play = async ms => { for (const m of ms) { await b.eval(`EarSax.noteOn(${m})`); await wait(30); } };
    await check(`[${w}] ear: learn from fingerings, wrong note, by ear, results`, async () => {
      assert(/written range/.test(await txt("#es-set-info")), await txt("#es-set-info"));
      await b.eval(`document.getElementById("es-start").click()`);
      await until(`/Your turn/.test(document.getElementById("es-learn-msg").textContent)`);
      const c = await cur();
      c.forEach(m => assert(m >= 62 && m <= 84, "in range " + m));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#es-learn-fing .es-fig").length`), c.length);
      assert(await b.eval(`__notes.length`) >= 10);
      if (SHOTS) await b.shot(path.join(SHOTS, `sax-ear-${w}.png`), false);
      await play([c[0], c[1] + 1]);
      assert(/Not quite/.test(await txt("#es-learn-msg")));
      await until(`/Your turn/.test(document.getElementById("es-learn-msg").textContent)`);
      // through the microphone path: concert pitch frames (alto: written - 9)
      for (const m of c) for (let i = 0; i < 4; i++) await b.eval(`EarSax.seg ? EarSax.seg.frame({hz:300,midi:${m - 9}}) : EarSax.noteOn(${m})`);
      await until(`/Pattern 2 of 2/.test(document.getElementById("es-learn-head").textContent) && /Your turn/.test(document.getElementById("es-learn-msg").textContent)`);
      await play(await cur());
      await until(`!document.getElementById("es-to-ear").hidden`);
      await b.eval(`document.getElementById("es-to-ear").click()`);
      await until(`/Your turn/.test(document.getElementById("es-ear-msg").textContent)`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#es-ear-fing .es-fig").length`), 0, "no hints by ear");
      await play(await cur());
      await until(`EarSax.session.results.length===1`);
      assert.strictEqual(await b.eval(`EarSax.session.results[0].result`), "first");
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
