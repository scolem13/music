// The trombone slide chart widgets in headless Chrome, 1280 and 390 px. Needs no Quarto render: it serves the repo files and a small harness page.
// Run: node tests/trombone/trombone.cdp.js [--shots <dir>]
// With a rendered lesson (quarto render lessons/trombone.qmd) it also checks the lesson page (UNRUN until the site can be rendered).
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title>
<link rel="stylesheet" href="/apps/shared/trombone/trombone.css"><style>body{font-family:system-ui;margin:16px;max-width:1000px}.btn{padding:2px 6px;border:1px solid #888;border-radius:4px;background:#fff;cursor:pointer}</style>
<script src="/apps/shared/abcjs-basic.js"></script><script src="/apps/shared/trombone/trombone-art.js"></script><script src="/apps/shared/trombone/trombone-chart.js"></script><script src="/apps/shared/trombone/trombone-page.js"></script></head>
<body><div id="tb-explorer"></div><hr><div id="tb-builder"></div><hr><div id="tb-glide"></div><hr><div id="tb-table"></div>
<script>TrombonePage.explorer(document.getElementById("tb-explorer"));TrombonePage.builder(document.getElementById("tb-builder"));TrombonePage.glide(document.getElementById("tb-glide"));TrombonePage.chartTable(document.getElementById("tb-table"));</script></body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/__harness.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  let f = path.join(ROOT, u); if (u.startsWith("/lessons/") && fs.existsSync(path.join(SITE, u))) f = path.join(SITE, u);
  if (!f.startsWith(ROOT)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__notes=[];window.__held=[];TromboneChart.tone=function(ac,out,m){__notes.push(m)};TromboneChart.holdTone=function(ac,out,m){__held.push(m);return{setMidi:function(x){__held.push(x)},stop:function(){__held.push("stop")}}};TrombonePage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null})};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    const txt = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);
    const n = sel => b.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
    const click = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const setSel = (root, cls, v) => b.eval(`(function(){var s=document.querySelector('${root} ${cls}');s.value=${JSON.stringify(v)};s.dispatchEvent(new Event("change"))})()`);
    // pointer events at a viewBox x on a live diagram
    const ptr = (root, type, vx, onSlide) => b.eval(`(function(){var svg=document.querySelector('${root} svg.tbn-live'),r=svg.getBoundingClientRect(),x=r.left+${vx}/286.01517*r.width,y=r.top+r.height*0.4;
      var t=${onSlide ? "svg.querySelector('.tbn-slide path')" : "svg"};t.dispatchEvent(new PointerEvent('${type}',{bubbles:true,clientX:x,clientY:y,pointerId:1}))})()`);
    await b.goto(host + "/__harness.html"); await wait(1200); await b.eval(STUB);
    await check(`[${w}] explorer: Bb3 has the usual 1st and the alternate 5th`, async () => {
      assert.strictEqual(await n("#tb-explorer .tbp-nb"), 31);
      await click('#tb-explorer .tbp-nb[data-m="58"]');
      assert.strictEqual(await n("#tb-explorer .tbp-fig"), 2);
      assert(/Usual/.test(await txt("#tb-explorer .tbp-fig figcaption")) && /1st position/.test(await txt("#tb-explorer .tbp-fig figcaption")));
      assert(/5th position/.test(await b.eval(`document.querySelectorAll("#tb-explorer .tbp-fig figcaption")[1].textContent`)));
      assert(await b.eval(`!!document.querySelector("#tb-explorer .tbp-staff svg")`), "staff drawn");
      assert.deepStrictEqual(await b.eval(`__notes`), [58]);
      if (SHOTS) await b.shot(path.join(SHOTS, `trombone-explorer-${w}.png`), false);
    });
    await check(`[${w}] explorer: C3 shows the F trigger and a shortened note`, async () => {
      await click('#tb-explorer .tbp-nb[data-m="48"]');
      assert.strictEqual(await n("#tb-explorer .tbp-fig"), 2, "6th and trigger 1st");
      assert(/trigger/.test(await b.eval(`document.querySelectorAll("#tb-explorer .tbp-fig figcaption")[1].textContent`)));
      await click('#tb-explorer .tbp-nb[data-m="67"]');
      assert(/shortened 2nd position/.test(await txt("#tb-explorer .tbp-fig figcaption")), await txt("#tb-explorer .tbp-fig figcaption"));
    });
    await check(`[${w}] explorer: treble clef reading, staff off, names off`, async () => {
      await click('#tb-explorer .tbp-nb[data-m="58"]');
      assert(/B♭3|A♯\/B♭3/.test(await txt("#tb-explorer .tbp-big")), await txt("#tb-explorer .tbp-big"));
      await setSel("#tb-explorer", ".tbp-reading", "treble");
      assert(/C5/.test(await txt("#tb-explorer .tbp-big")), "58 + 14 = C5: " + await txt("#tb-explorer .tbp-big"));
      assert(/sounds/.test(await txt("#tb-explorer .tbp-head")));
      await b.eval(`document.querySelector("#tb-explorer .tbp-chk input").click()`);
      assert.strictEqual(await n("#tb-explorer .tbp-staff svg"), 0);
      await b.eval(`document.querySelectorAll("#tb-explorer .tbp-chk input")[1].click()`);
      assert.strictEqual(await txt("#tb-explorer .tbp-big"), "?");
      await b.eval(`document.querySelectorAll("#tb-explorer .tbp-chk input")[0].click();document.querySelectorAll("#tb-explorer .tbp-chk input")[1].click()`);
      await setSel("#tb-explorer", ".tbp-reading", "bass");
      assert.strictEqual(await n("#tb-explorer .tbp-staff svg"), 1);
    });
    await check(`[${w}] builder: click a number, drag the slide, arrow keys`, async () => {
      await b.eval(`document.querySelector('#tb-builder .tbn-pos[data-p="4"]').dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))`);
      assert(/4th position/.test(await txt("#tb-builder .tbp-out")));
      assert(/G2/.test(await txt("#tb-builder .tbp-notes")) && /B3/.test(await txt("#tb-builder .tbp-notes")), await txt("#tb-builder .tbp-notes"));
      const C = await b.eval(`TromboneChart.TIPS`);
      // drag from position 4's bend to position 6
      await ptr("#tb-builder", "pointerdown", C[3], true); await ptr("#tb-builder", "pointermove", C[5], false); await ptr("#tb-builder", "pointerup", C[5], false);
      assert(/6th position/.test(await txt("#tb-builder .tbp-out")), await txt("#tb-builder .tbp-out"));
      assert(/F2/.test(await txt("#tb-builder .tbp-notes")));
      await b.eval(`(function(){var s=document.querySelector("#tb-builder svg.tbn-live");s.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}))})()`);
      assert(/7th position/.test(await txt("#tb-builder .tbp-out")));
      await b.eval(`document.querySelector("#tb-builder svg.tbn-live").dispatchEvent(new KeyboardEvent("keydown",{key:"2",bubbles:true}))`);
      await b.eval(`(function(){var c=document.querySelector("#tb-builder .tbp-side input[type=checkbox]");c.checked=true;c.dispatchEvent(new Event("change"))})()`);
      assert(/shortened 2nd position/.test(await txt("#tb-builder .tbp-out")));
      assert(/G4/.test(await txt("#tb-builder .tbp-notes")));
      if (SHOTS) await b.shot(path.join(SHOTS, `trombone-builder-${w}.png`), false);
    });
    await check(`[${w}] builder quiz: Show me then Check`, async () => {
      await click("#tb-builder .btn-group button:nth-child(2)");
      assert(/Put the slide where/.test(await txt("#tb-builder .tbp-ask")));
      await b.eval(`document.querySelector("#tb-builder .btn-primary.btn-sm:not(.btn-outline-primary), #tb-builder .tbp-bar .btn-primary:not(.active)")`);
      await b.eval(`[].find.call(document.querySelectorAll("#tb-builder button"),function(x){return x.textContent==="Show me"}).click()`);
      await b.eval(`[].find.call(document.querySelectorAll("#tb-builder button"),function(x){return x.textContent==="Check"}).click()`);
      assert(/Yes/.test(await txt("#tb-builder .tbp-out")), await txt("#tb-builder .tbp-out"));
      await click("#tb-builder .btn-group button:nth-child(1)");
    });
    await check(`[${w}] glide: pitch follows the slide`, async () => {
      await click("#tb-glide .btn-primary"); await wait(50);
      const C = await b.eval(`TromboneChart.TIPS`);
      await ptr("#tb-glide", "pointerdown", C[0], true); await ptr("#tb-glide", "pointermove", (C[0] + C[1]) / 2, false);
      const held = await b.eval(`__held`);
      assert.strictEqual(held[0], 58);
      assert(held.some(x => typeof x === "number" && x < 57.7 && x > 57.2), JSON.stringify(held));   // half way to position 2 = half a semitone down
      await ptr("#tb-glide", "pointerup", C[1], false);
      assert(/Position 2\.0/.test(await txt("#tb-glide .tbp-readout")), await txt("#tb-glide .tbp-readout"));
      await click("#tb-glide .btn-primary"); assert.strictEqual((await b.eval(`__held`)).pop(), "stop");
    });
    await check(`[${w}] chart table`, async () => {
      assert.strictEqual(await n("#tb-table .tbp-tb"), 35, "31 notes + 4 second choices");
      await click("#tb-table .tbp-tb");
      assert.strictEqual(await n("#tb-table .tbp-table tbody tr"), 10);
      if (SHOTS) await b.shot(path.join(SHOTS, `trombone-table-${w}.png`));
    });
    await check(`[${w}] no horizontal page scroll`, async () => { assert(await b.eval(`document.documentElement.scrollWidth<=window.innerWidth+1`), await b.eval(`document.documentElement.scrollWidth`)); });
    if (fs.existsSync(path.join(SITE, "lessons/trombone.html"))) {
      await check(`[${w}] rendered lesson`, async () => {
        await b.goto(host + "/lessons/trombone.html"); await wait(1500); await b.eval(STUB);
        assert(await n("#tb-explorer .tbp-nb") === 31 && await n("#tb-builder svg.tbn-live") === 1 && await n("#tb-table .tbp-tb") === 35);
        assert(await n(".works-cited") >= 1);
      });
    } else console.log("skip rendered lesson (lessons/trombone.html not rendered)");
    await b.close();
  }
  server.close(); process.exit(failed ? 1 : 0);
})();
