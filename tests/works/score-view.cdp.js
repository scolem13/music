// The Analysed Scores library (theory/analysed-scores/view.qmd, apps/shared/score-view.js): the list loads from index.json, search
// and the collection filter narrow it, ?id= draws that piece from its collection file through AnalysedScores.add and plays, the
// next/previous links stay inside the collection, and an unknown id says so. Render first:
//   quarto render theory/analysed-scores/view.qmd
//   node tests/works/score-view.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const fetched = [];
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split(/[?#]/)[0]); if (/\/data\/scores\//.test(u)) fetched.push(path.basename(u));
  const f = path.join(SITE, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8562);
const U = "http://127.0.0.1:8562/theory/analysed-scores/view.html";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);
  const total = JSON.parse(fs.readFileSync(SITE + "/apps/shared/data/scores/index.json", "utf8")).length;

  await b.goto(U);
  check("list loads every piece", await wait(`document.querySelectorAll('#sv-rows tr').length === ${total}`), total + " pieces");
  check("no score sections without ?id=", await ev(`document.getElementById('the-score').hidden && document.getElementById('notes-and-other-readings').hidden`));
  check("only the index fetched", fetched.length > 0 && fetched.every(f => f === "index.json"), fetched.join(" "));
  await ev(`(() => { const s = document.getElementById('sv-set'); s.value = 'Mozart piano sonatas'; s.dispatchEvent(new Event('change')); })()`);
  check("collection filter", await ev(`[...document.querySelectorAll('#sv-rows tr')].every(r => /Mozart/.test(r.textContent))`));
  await ev(`(() => { const s = document.getElementById('sv-set'); s.value = ''; s.dispatchEvent(new Event('change')); const q = document.getElementById('sv-q'); q.value = 'BWV 244'; q.dispatchEvent(new Event('input')); })()`);
  const n = await ev(`document.querySelectorAll('#sv-rows tr').length`);
  check("search narrows the list", n > 0 && n < 20, n + " rows for BWV 244");
  await ev(`(() => { const q = document.getElementById('sv-q'); q.value = ''; q.dispatchEvent(new Event('input')); })()`);

  fetched.length = 0;
  await b.goto(U + "?id=bach-chorale-074");
  check("chorale drawn", await wait(`!!document.querySelector('#sv-score .as-score svg')`, 120));
  check("only the chorales file fetched", fetched.includes("chorales.json") && !fetched.some(f => /sonatas/.test(f)), fetched.join(" "));
  check("title and analyst", await ev(`/O Haupt/.test(document.getElementById('sv-title').textContent) && /Tymoczko/.test(document.getElementById('sv-who').textContent)`));
  check("roman numerals under the notes", await ev(`document.querySelectorAll('#sv-score text.abcjs-annotation').length > 20`));
  check("key strip", await ev(`document.querySelectorAll('#sv-score .as-key').length > 2`));
  check("prev / next inside the chorales", await ev(`[...document.querySelectorAll('#sv-nav a')].filter(a => /bach-chorale-07[35]/.test(a.href)).length === 2`));
  await ev(`document.querySelector('#sv-score .as-bar button').click()`);
  check("▶ plays (notes lit)", await wait(`document.querySelectorAll('#sv-score .abc-on').length > 0`, 60));
  await ev(`document.querySelector('#sv-score .as-bar button').click()`);

  await b.goto(U + "?id=beethoven-sonata-14-1");
  check("a sonata movement draws", await wait(`!!document.querySelector('#sv-score .as-score svg')`, 160));
  await b.goto(U + "?id=nothing-here");
  check("unknown id says so, list still there", await wait(`/No piece called/.test(document.getElementById('sv-title').textContent) && document.querySelectorAll('#sv-rows tr').length === ${total}`));

  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
