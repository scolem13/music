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
  const f = path.join(SITE, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(+process.env.PORT || 8562);
const U = "http://127.0.0.1:" + (process.env.PORT || 8562) + "/theory/analysed-scores/view.html";
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
  // &bar=N: those bars lit (as-hi) and in view. Pathetique I bar 137 (the enharmonic page's example): the lit notes are measure 136 (0-based),
  // and the lit span holds both the G minor vii°42 label and the "e: vii°42" label (the key change g -> e comes in the middle of that bar)
  await b.goto(U + "?id=beethoven-sonata-8-1&bar=137");
  check("&bar=: bars lit", await wait(`document.querySelectorAll('#sv-score .as-hi').length > 0 && [...document.querySelectorAll('#sv-score text')].some(t => /e:\\s*vii/.test(t.textContent))`, 160));
  const bb = JSON.parse(await ev(`(() => { const P = document.querySelector('#sv-score .as-score'), hi = [...P.querySelectorAll('.abcjs-note.as-hi, .abcjs-rest.as-hi')], rs = hi.map(n => n.getBoundingClientRect());
    const x0 = Math.min(...rs.map(r => r.left)), x1 = Math.max(...rs.map(r => r.right)), y0 = Math.min(...rs.map(r => r.top)), y1 = Math.max(...rs.map(r => r.bottom));
    const within = r => r.left >= x0 - 2 && r.right <= x1 + 2 && r.top >= y0 - 120 && r.bottom <= y1 + 120;
    const texts = [...P.querySelectorAll('text')], inE = texts.filter(t => /e:\\s*vii/.test(t.textContent) && within(t.getBoundingClientRect())).length, inG = texts.filter(t => /^vii°42$/.test(t.textContent) && within(t.getBoundingClientRect())).length;
    const mm = [...new Set(hi.map(n => (/abcjs-mm(\\d+)/.exec(n.getAttribute('class')) || [])[1]))];
    return JSON.stringify({ n: hi.length, mm, inE, inG, visible: rs[0].top >= 0 && rs[0].bottom <= innerHeight }); })()`));
  check("&bar=137 lights exactly measure 136 (0-based), holding the G minor vii°42 and the e: vii°42 labels", bb.n > 0 && bb.mm.length === 1 && bb.mm[0] === "136" && bb.inE >= 1 && bb.inG >= 1, JSON.stringify(bb));
  check("&bar=: scrolled into view", bb.visible, JSON.stringify(bb));
  await b.goto(U + "?id=beethoven-sonata-8-1&bar=137-138");
  check("&bar=137-138 lights two bars", await wait(`new Set([...document.querySelectorAll('#sv-score .abcjs-note.as-hi')].map(n => /abcjs-mm(\\d+)/.exec(n.getAttribute('class'))[1])).size === 2`, 160));
  await b.goto(U + "?id=beethoven-sonata-8-1");
  await b.sleep(2500);
  check("no &bar=: nothing lit", await ev(`document.querySelectorAll('#sv-score .as-hi').length === 0`));
  await b.goto(U + "?id=nothing-here");
  check("unknown id says so, list still there", await wait(`/No piece called/.test(document.getElementById('sv-title').textContent) && document.querySelectorAll('#sv-rows tr').length === ${total}`));

  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
