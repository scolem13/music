// The DP Classical Style lesson (lessons/dp-classical-style.qmd) in headless Chrome: every ABC example is drawn with full
// measures (abcjs's own parse), every quiz renders and its right answers mark right, sections fold, the jump bar is there.
// Run after rendering:  quarto render lessons/dp-classical-style.qmd;  node tests/lessons/dp-classical-style.cdp.js
// NEG=1 breaks one bar and one quiz answer in the page before checking: the run must then fail.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8541, PAGE = "/lessons/dp-classical-style.html", NEG = !!process.env.NEG;
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; }
    if (NEG && u === PAGE) d = String(d).replace("c4 e2 g2 | f2 d2 B2 G2", "c4 e2 g2 | f2 d2 B2 G2 G2").replace('"c":1,"why":"Haydn', '"c":7,"why":"Haydn');
    s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch();
  let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  await b.goto(`http://127.0.0.1:${PORT}${PAGE}`); await b.sleep(1500);
  const r = await b.eval(`(async () => {
    const src = [...new DOMParser().parseFromString(await (await fetch(location.href)).text(), 'text/html').querySelectorAll('.abc-ex > script')].map(s => s.textContent);
    const bad = [];
    src.forEach((abc, i) => { const t = ABCJS.parseOnly(abc)[0];
      t.lines.forEach(l => (l.staff || []).forEach(st => st.voices.forEach(v => { let cur = 0;
        v.forEach(x => { if (x.el_type === 'note') cur += x.duration; else if (x.el_type === 'bar') { if (Math.abs(cur - 1) > 1e-6) bad.push(i + ':' + cur); cur = 0; } }); }))); });
    const ex = [...document.querySelectorAll('.abc-ex')];
    let items = 0, right = 0;
    document.querySelectorAll('.dq').forEach(box => { const data = JSON.parse(box.querySelector('script').textContent);
      box.querySelectorAll('.dq-item').forEach((el, i) => { items++; const btns = el.querySelectorAll('.dq-opts button');
        const btn = btns[data[i].c]; if (btn) { btn.click(); if (btn.classList.contains('dq-right') && /^Right/.test(el.querySelector('.dq-why').textContent)) right++; } }); });
    return { ex: ex.length, drawn: ex.filter(e => e.querySelector('svg')).length, bad, quizzes: document.querySelectorAll('.dq').length, items, right,
      toc: document.querySelectorAll('#TOC a').length, folds: document.querySelectorAll('section.sf').length }; })()`);
  check("examples drawn", r.ex === 4 && r.drawn === r.ex, r.drawn + "/" + r.ex);
  check("every measure full", !r.bad.length, r.bad.join(" "));
  check("quizzes: every right answer marks right", r.quizzes === 10 && r.items > 40 && r.right === r.items, r.right + "/" + r.items + " in " + r.quizzes);
  check("collapsible sections and jump bar", r.folds >= 11 && r.toc >= 11, r.folds + " sections, " + r.toc + " links");
  const errs = b.errors.filter(e => !/supabase|soundfont|fetch|load sound|favicon/i.test(e));
  check("no errors", !errs.length, errs.join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
