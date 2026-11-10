// The Grooves vs Songs lessons (lessons/grooves-*.qmd, apps/shared/lessons/grooves.js): the sorting quiz builds, marks an answer with
// Hein's category and records it; every chord button can be read; Works Cited is filled.
// Run after rendering both pages: node tests/lessons/grooves.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8534);
(async () => {
  const b = await launch({}); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  for (const pg of ["songs", "learning"]) {
    await b.goto(`http://127.0.0.1:8534/lessons/grooves-${pg}.html`); await b.sleep(700);
    const bad = await b.eval(`[...document.querySelectorAll('.tg-play')].filter(x => TaggTables.parse(x.dataset.chords).length < 1).length`);
    const n = await b.eval(`document.querySelectorAll('.tg-play').length`);
    check(pg + ": chord buttons readable", n >= 2 && bad === 0, n + " buttons");
    check(pg + ": Works Cited has Hein", await b.eval(`/Pieces vs Songs vs Grooves/.test(document.querySelector('.works-cited') ? document.querySelector('.works-cited').textContent : '')`));
  }
  await b.goto("http://127.0.0.1:8534/lessons/grooves-songs.html"); await b.sleep(700);
  check("quiz built with 19 examples", await b.eval(`GroovesQuiz.widgets.length === 1 && GroovesQuiz.items.length`) === (NEG ? 20 : 19));
  await b.eval(`localStorage.clear(); const w = GroovesQuiz.widgets[0]; w.answer(w.current())`);
  check("a right answer is marked and recorded", await b.eval(`!!document.querySelector('.gq-right') && /Yes/.test(document.querySelector('.gq-fb').textContent) && JSON.parse(localStorage.getItem('site-record-v1') || '{"items":[]}').items.some(i => i.tool === 'grooves' && i.at[0][1] === 1)`));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
