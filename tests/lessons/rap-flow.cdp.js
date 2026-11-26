// The Rap Flow lessons (lessons/rap-flow*.qmd, apps/shared/lessons/rap-flow.js): every grid builds with its staff drawn,
// Play starts and stops, the editable grid changes its ABC on a click, Works Cited is filled.
// Run after rendering both pages: node tests/lessons/rap-flow.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8536);
(async () => {
  const b = await launch({}); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8536/lessons/rap-flow.html"); await b.sleep(1200);
  const n = await b.eval(`document.querySelectorAll('.rf').length`);
  check("seven flow grids", n === (NEG ? 8 : 7), n);
  check("every grid has cells and a drawn staff", await b.eval(`[...document.querySelectorAll('.rf')].every(r => r.querySelectorAll('.rf-cell').length >= 24 && r.querySelector('.rf-staff svg'))`));
  check("triplet bars have 12 cells", await b.eval(`document.querySelector('.rf-trip').querySelectorAll('.rf-cell').length`) === 12);
  await b.eval(`document.querySelector('.rf .rf-play').click()`); await b.sleep(300);
  check("Play starts", await b.eval(`document.querySelector('.rf').classList.contains('rf-on')`));
  await b.eval(`document.querySelector('.rf .rf-play').click()`);
  check("Stop stops", await b.eval(`!document.querySelector('.rf').classList.contains('rf-on')`));
  const ed = `[...document.querySelectorAll('.rf')].find(r => r.hasAttribute('data-edit'))`;
  const a0 = await b.eval(`${ed}._rf.abc()`); await b.eval(`${ed}.querySelector('.rf-cell').click()`);
  check("clicking a box changes the editable flow", await b.eval(`${ed}._rf.abc()`) !== a0 && await b.eval(`/B/.test(${ed}._rf.abc().split("\\n")[5])`));
  check("Works Cited has Adams", await b.eval(`/Metrical Techniques of Flow/.test(document.body.textContent)`));
  await b.goto("http://127.0.0.1:8536/lessons/rap-flow-reading.html"); await b.sleep(500);
  check("reading list cites Waller", await b.eval(`/Rhythm and Flow in Hip-Hop Music/.test(document.body.textContent)`));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
