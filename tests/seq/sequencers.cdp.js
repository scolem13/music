// Sequencers & Arpeggiators page (rendered _site/tools/sequencers.html) in headless Chrome: every card draws, every card plays
// without an error and lights its playhead, Compare plays two at once, the table lists every kind.
// Run: quarto render tools/sequencers.qmd && node tests/seq/sequencers.cdp.js [--shots <dir>]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE ? path.resolve(process.env.SITE) : path.join(ROOT, "_site");   // SITE=<dir> to test a render made elsewhere
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
  const b = await launch({ width: 1400, height: 1000 });
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  await b.goto(`http://127.0.0.1:${server.address().port}/tools/sequencers.html`); await wait(800);
  await b.eval(`window.__errs=[];window.addEventListener("error",function(e){__errs.push(e.message)});`);
  const n = await b.eval(`SeqPage.types.length`);
  await check("every kind has a card", async () => assert.strictEqual(await b.eval(`document.querySelectorAll(".sq-cards .sq-card").length`), n));
  await check("compare shows two cards", async () => assert.strictEqual(await b.eval(`document.querySelectorAll(".sq-pair .sq-card").length`), 2));
  await check("table lists every kind", async () => assert((await b.eval(`document.querySelectorAll(".sq-table tbody tr").length`)) >= n));
  const ids = await b.eval(`SeqPage.types.map(function(t){return t.id})`);
  for (const id of ids) {
    await check("plays and lights: " + id, async () => {
      await b.eval(`document.querySelector("#sq-${id} .sq-head .btn").click()`); await wait(1400);
      const lit = await b.eval(`(function(){var c=document.getElementById("sq-${id}");return c.querySelectorAll(".now").length + (c.querySelector(".sq-rhead[style*=block]")?1:0) + (c.querySelector(".ph[style*=left]")?1:0) + c.querySelectorAll(".sq-hist i").length})()`);
      await b.eval(`document.querySelector("#sq-${id} .sq-head .btn").click()`);
      const errs = await b.eval(`__errs.splice(0)`); assert(!errs.length, errs.join("; "));
      assert(lit > 0, "nothing lit");
    });
  }
  await check("compare plays both", async () => {
    await b.eval(`Array.from(document.querySelectorAll("#sq-compare button")).find(function(x){return /Play both/.test(x.textContent)}).click()`); await wait(1000);
    assert.strictEqual(await b.eval(`document.querySelectorAll(".sq-pair .sq-head .btn-secondary").length`), 2);
    const errs = await b.eval(`__errs.splice(0)`); assert(!errs.length, errs.join("; "));
    await b.eval(`SeqPage.stopAll()`);
  });
  // the workstation-style arp (motif-arp.js): parts drawn as notation with shaded heads, scenes, a velocity split
  const MA = `document.getElementById("sq-motifarp")`;
  await check("workstation arp: each part on is drawn, heads shaded", async () => {
    const r = await b.eval(`(function(){var c=${MA};return { svgs: c.querySelectorAll(".ma-score svg").length, on: c.querySelectorAll(".ma-part:not(.off)").length,
      shaded: Array.from(c.querySelectorAll(".ma-score .abcjs-note")).filter(function(e){return e.style.opacity}).length }})()`);
    assert(r.on >= 1 && r.svgs === r.on, JSON.stringify(r)); assert(r.shaded > 0, "no shaded heads");
  });
  await check("workstation arp: scene 4 splits by velocity", async () => {
    const parts = () => b.eval(`Array.from(${MA}.querySelectorAll(".ma-part")).map(function(p){return p.querySelector(".ma-score svg")?1:0}).join("")`);
    const setVel = v => b.eval(`(function(){var r=${MA}.querySelector(".sq-row input[type=range]");r.value=${v};r.dispatchEvent(new Event("input"))})()`);
    await b.eval(`Array.from(${MA}.querySelectorAll("button")).find(function(x){return x.textContent==="Scene 4"}).click()`);
    await setVel(60); const soft = await parts(); await setVel(120); const hard = await parts();
    assert(soft.slice(0, 2) === "10" && hard.slice(0, 2) === "01", "soft " + soft + " hard " + hard);
    const shown = await b.eval(`${MA}.querySelector(".ma-part select").selectedOptions[0].textContent`);
    assert(/Ballad/.test(shown), "part 1's controls show the recalled scene: " + shown);
  });
  await check("workstation arp: scene 2 plays three parts with no error", async () => {
    await b.eval(`Array.from(${MA}.querySelectorAll("button")).find(function(x){return x.textContent==="Scene 2"}).click()`);
    await b.eval(`${MA}.querySelector(".sq-head .btn").click()`); await wait(1500);
    const lit = await b.eval(`${MA}.querySelectorAll(".ma-lamp.now").length`);
    await b.eval(`SeqPage.stopAll()`); const errs = await b.eval(`__errs.splice(0)`); assert(!errs.length, errs.join("; "));
    assert(lit >= 2, "lamps lit: " + lit);
  });
  if (SHOTS) { await b.eval(`${MA}.scrollIntoView()`); await wait(200); fs.mkdirSync(SHOTS, { recursive: true }); await b.shot(path.join(SHOTS, "workstation-arp.png")); }
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await b.shot(path.join(SHOTS, "sequencers.png")); await b.resize(390, 900); await wait(300); await b.shot(path.join(SHOTS, "sequencers-phone.png")); }
  await b.close(); server.close();
  console.log(failed ? failed + " FAILED" : "SEQUENCERS OK"); process.exit(failed ? 1 : 0);
})();
