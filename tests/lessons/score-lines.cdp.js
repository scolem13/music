// LessonScore.engrave (apps/shared/lessons/score.js): every line of a multi-line score ends at the same x, the last line
// included when it is full (abcjs caps how far it spreads a sparse line, which left lines of different lengths).
// Checked on the blues drums lesson's chorus scores. Run after rendering:  node tests/lessons/score-lines.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  const f = u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);           // scripts live from the repo
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8524);
(async () => {
  const b = await launch({ args: [] }); let fails = 0;
  await b.goto("http://127.0.0.1:8524/lessons/blues-drums.html"); await b.sleep(4000);
  const res = JSON.parse(await b.eval(`JSON.stringify([...document.querySelectorAll('svg')].map(svg => {
    const ends = []; for (let k = 0; ; k++) { const st = svg.querySelectorAll('.abcjs-staff.abcjs-l' + k); if (!st.length) break;
      ends.push(Math.round(Math.max(...[...st].map(e => { const r = e.getBBox(); return r.x + r.width; })))); }
    return ends; }).filter(e => e.length > 2))`));
  res.forEach((ends, i) => { const ok = Math.max(...ends) - Math.min(...ends) <= Math.max(...ends) * 0.02 /* a line too busy to squeeze to the width runs a few px over */; if (!ok) fails++; console.log((ok ? "ok   " : "FAIL ") + "score " + i + " line ends " + ends.join(" ")); });
  if (!res.length) { console.log("FAIL no multi-line scores drawn"); fails++; }
  srv.close(); b.close(); process.exit(fails ? 1 : 0);
})();
