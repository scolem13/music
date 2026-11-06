// The percussion widgets (labelled snare / stick / bass drum, tuning order, rudiment player) in headless Chrome, on a fixture page that
// carries the same markup as lessons/percussion.qmd and lessons/snare-drum.qmd (so it needs no Quarto render). Sound is stubbed.
// Run: node tests/percussion/percussion.cdp.js [--shots <dir>]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../..");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const PAGE = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>t</title>
<link rel=stylesheet href=/apps/shared/percussion/percussion.css>
<script src=/apps/shared/abcjs-basic.js></script><script src=/apps/shared/percussion/rudiments.js></script><script src=/apps/shared/percussion/percussion-page.js></script>
<div id=drum data-kind=snare></div><div id=stick data-kind=stick></div><div id=bass data-kind=bass></div><div id=tune></div><div id=rud></div>
<script>window.__hits=[];PercussionPage.sound=function(){return Promise.resolve({ac:{currentTime:0},out:null,bank:{play:function(i,s,t){__hits.push([s.piece,s.vel,t])},stopAll:function(){}}})};
PercussionPage.diagram(drum);PercussionPage.diagram(stick);PercussionPage.diagram(bass);PercussionPage.tuningOrder(tune);PercussionPage.rudiments(rud);</script>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(PAGE); }
  const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    await b.goto(host + "/"); await wait(800);
    await check(`[${w}] no script errors`, () => assert.deepStrictEqual(b.errors, []));
    await check(`[${w}] diagrams: every part has a marker, a button and a shape or a marker spot`, async () => {
      for (const [id, kind] of [["drum", "snare"], ["stick", "stick"], ["bass", "bass"]]) {
        const n = await b.eval(`PercussionPage.PARTS.${kind}.length`);
        assert.strictEqual(await b.eval(`document.querySelectorAll("#${id} .pcs-mark").length`), n, kind + " markers");
        assert.strictEqual(await b.eval(`document.querySelectorAll("#${id} .pc-parts button").length`), n, kind + " buttons");
        const bad = await b.eval(`PercussionPage.PARTS.${kind}.filter(function(p){return !PercussionPage.DRAWINGS.${kind}.marks[p[0]]}).map(function(p){return p[0]})`);
        assert.deepStrictEqual(bad, [], "parts without a marker position");
      }
      // shapes: every part but the internal muffler has a drawn shape to light up
      const noShape = await b.eval(`["snare","stick","bass"].map(function(k){return PercussionPage.PARTS[k].filter(function(p){var el=document.getElementById({snare:"drum",stick:"stick",bass:"bass"}[k]);return !el.querySelector("svg .p-"+p[0])}).map(function(p){return k+":"+p[0]})}).reduce(function(a,b){return a.concat(b)})`);
      assert.deepStrictEqual(noShape.sort(), ["snare:imuffler"], "parts with nothing drawn: " + noShape);
    });
    await check(`[${w}] click a part: info shown, shape lit; click drawing`, async () => {
      await b.eval(`document.querySelector('#drum .pc-parts button[data-part="strainer"]').click()`);
      assert(/snare strainer/.test(await b.eval(`document.querySelector("#drum .pc-info").textContent`)));
      assert.strictEqual(await b.eval(`document.querySelectorAll("#drum svg .pc-hl").length`), 1);
      await b.eval(`document.querySelector("#drum svg .p-batter").dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert(/batter head/.test(await b.eval(`document.querySelector("#drum .pc-info strong").textContent`)));
      await b.eval(`document.querySelector('#drum .pcs-mark[data-part="legs"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#drum svg .p-legs.pc-hl").length`), 3, "three legs lit");
    });
    await check(`[${w}] quiz asks, marks right and wrong`, async () => {
      await b.eval(`document.querySelector("#drum .pc-bar button").click()`);
      const ask = await b.eval(`document.querySelector("#drum .pc-out").textContent`); assert(/^Find the /.test(ask), ask);
      const label = ask.replace(/^Find the /, "").replace(/\.$/, "");
      const id = await b.eval(`PercussionPage.PARTS.snare.filter(function(p){return p[1]===${JSON.stringify(label)}})[0][0]`);
      await b.eval(`document.querySelector('#drum .pcs-mark[data-part="${id}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`);
      assert(/^Yes\./.test(await b.eval(`document.querySelector("#drum .pc-out").textContent`)));
      await b.eval(`document.querySelector("#drum .pc-bar button").click()`);
    });
    await check(`[${w}] tuning order steps through ten lugs`, async () => {
      for (let i = 0; i < 10; i++) await b.eval(`document.querySelector("#tune .btn-primary").click()`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#tune .pct-done").length`), 9);
      assert.strictEqual(await b.eval(`document.querySelector("#tune .btn-primary").disabled`), true);
      assert(/one round/.test(await b.eval(`document.querySelector("#tune .pc-info").textContent`)));
    });
    await check(`[${w}] rudiment player: staff drawn for every rudiment, chips match strokes, plays`, async () => {
      for (const r of await b.eval(`PercRudiments.LIST.map(function(r){return r.id})`)) {
        await b.eval(`rud._pr.select(${JSON.stringify(r)})`);
        assert(await b.eval(`!!document.querySelector("#rud .pr-staff svg")`), r + " staff");
        const strokes = await b.eval(`PercRudiments.byId(${JSON.stringify(r)}).bars.join(" ").split(" ").filter(function(t){return t[0]!=="z"}).length`);
        assert.strictEqual(await b.eval(`document.querySelectorAll("#rud .pr-chip").length`), strokes, r + " chips");
        assert.strictEqual(await b.eval(`document.querySelectorAll("#rud .pr-staff svg .abcjs-note").length`), strokes, r + " drawn notes");
      }
      await b.eval(`rud._pr.select("flam-accent")`); await b.eval(`__hits=[]`);
      await b.eval(`document.querySelector("#rud .btn-primary").click()`); await wait(200);
      const hits = await b.eval(`__hits`); assert(hits.length > 20 && hits.every(x => x[0] === "snare"), "snare hits: " + hits.length);
      assert.strictEqual(await b.eval(`document.querySelector("#rud .btn-primary").textContent`), "Stop");
      await b.eval(`document.querySelector("#rud .btn-primary").click()`);
      assert.strictEqual(await b.eval(`document.querySelector("#rud .btn-primary").textContent`), "Play");
      if (SHOTS) { await b.eval(`rud._pr.select("paradiddle")`); await b.shot(path.join(SHOTS, `percussion-${w}.png`), false); }
    });
    await check(`[${w}] no horizontal page scroll`, async () => assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`)));
    await check(`[${w}] ABC had no warnings`, async () => assert.deepStrictEqual(await b.eval(`PercRudiments.LIST.map(function(r){var w=ABCJS.renderAbc("*",PercRudiments.abc(r))[0].warnings||[];return w.length?r.id+":"+w.join("|"):""}).filter(Boolean)`), []));
    await b.close();
  }
  server.close(); console.log(failed ? failed + " FAILED" : "all ok"); process.exit(failed ? 1 : 0);
})();
