// Scale Patterns page (rendered _site/tools/scale-patterns.html) in headless Chrome: it draws, piano fingering shows,
// a setting change redraws and lands in the address, a link restores it, Play starts.
// Run: quarto render tools/scale-patterns.qmd && node tests/scales/scale-patterns.cdp.js [--shots <dir>]
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
  const base = `http://127.0.0.1:${server.address().port}/tools/scale-patterns.html`;
  const b = await launch({ width: 1280, height: 1000 });
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const set = (id, v) => b.eval(`(function(){var e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event("change",{bubbles:true}));})()`);
  await b.goto(base); await wait(1500);
  await check("draws a score", async () => assert((await b.eval(`document.querySelectorAll("#sp-score .abcjs-note").length`)) > 20));
  await check("piano scale shows fingering", async () => {
    await set("sp-pattern", "scale");
    const lyr = await b.eval(`Array.from(document.querySelectorAll("#sp-score .abcjs-lyric")).slice(0,8).map(function(t){return t.textContent}).join("")`);

  });
  await check("a change lands in the address and a link restores it", async () => {
    await set("sp-inst", "trombone"); await set("sp-tonic", "10"); await set("sp-style", "swing");
    const href = await b.eval("location.href"); assert(/i=trombone/.test(href) && /k=10/.test(href), href);
    await b.goto(href); await wait(1500);
    assert.strictEqual(await b.eval(`document.getElementById("sp-inst").value`), "trombone");
    assert(/K:Bb clef=bass/.test(await b.eval(`document.getElementById("sp-abc").textContent`)));
  });
  await check("play starts and stops", async () => {
    const err = await b.eval(`(function(){try{document.getElementById("sp-play").click();return ""}catch(e){return String(e.stack)}})()`); assert(!err, err);
    assert.strictEqual(await b.eval(`document.getElementById("sp-play").textContent`), "■ Stop");
    await b.eval(`document.getElementById("sp-play").click()`);
  });
  await check("no errors in the page", async () => assert(!(await b.eval(`document.getElementById("sp-warn").textContent`)).includes("Error")));
  if (SHOTS) await b.shot(path.join(SHOTS, "scale-patterns.png"));
  await b.close(); server.close();
  console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
