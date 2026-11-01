// Analysed scores (apps/shared/analysed-scores.js): click the drawn tempo mark, type a tempo: the mark shows it, the piece takes
// half as long at twice the speed, the choice is kept per piece, Reset goes back. On the Moonlight page (its own Q:) and two
// library pieces. Render first:
//   quarto render theory/analysed-scores/beethoven-moonlight-1.qmd; quarto render theory/analysed-scores/view.qmd
//   node tests/works/score-tempo.cdp.js        (SITE=<dir> tests a render made elsewhere; NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8563);
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (name, ok, info) => { if (process.env.NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  for (const url of ["/theory/analysed-scores/beethoven-moonlight-1.html", "/theory/analysed-scores/view.html?id=bach-chorale-001", "/theory/analysed-scores/view.html?id=mozart-sonata-1-1"]) {
    await b.goto("http://127.0.0.1:8563" + url);
    for (let i = 0; i < 200 && !(await ev(`!!document.querySelector('.as-score .abcjs-tempo')`)); i++) await b.sleep(150);
    const r = JSON.parse(await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); localStorage.clear(); const host = document.querySelector('.as-score'), i0 = AnalysedScores.info(host);
      const m = host.querySelector('.abcjs-tempo'), bb = m.getBoundingClientRect(); m.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: bb.left + 2, clientY: bb.top + 2 })); await w(100);
      const pop = host.querySelector('.as-tempo-pop'), num = pop.querySelector('input[type=number]'); num.value = String(i0.own * 2); num.dispatchEvent(new Event("change")); await w(400);
      const i1 = AnalysedScores.info(host), mark = host.querySelector('.abcjs-tempo').textContent, kept = Object.keys(localStorage).filter(k => /^as-tempo-/.test(k)).length;
      pop.querySelector('.btn-outline-secondary').click(); await w(400); const i2 = AnalysedScores.info(host);
      return JSON.stringify({ own: i0.own, mark, end0: Math.round(i0.endMs), end1: Math.round(i1.endMs), kept, reset: i2.tempo === i0.own && Math.abs(i2.endMs - i0.endMs) < 5 }); })()`));
    check(url.split("/").pop() + ": the mark shows the new tempo, the piece twice as fast, kept, Reset goes back",
      r.mark === "= " + r.own * 2 && Math.abs(r.end1 * 2 - r.end0) < 50 && r.kept === 1 && r.reset, JSON.stringify(r));
  }
  console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
})();
