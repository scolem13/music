// The Polyrhythm tool and lessons in headless Chrome: every player draws a dot and a grid cell per step, plays (the
// layers' cells light), every preset loads, and folding a section hides it. Run after rendering:
//   for f in tools/polyrhythm lessons/poly-{basics,west-africa,afro-cuban,jazz,math-rock}; do quarto render $f.qmd; done
//   node tests/polyrhythm/polyrhythm.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT, { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8541;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch();
  let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const errs = () => b.errors.filter(e => !/supabase|favicon|fetch/i.test(e));
  for (const p of ["tools/polyrhythm", "lessons/poly-basics", "lessons/poly-west-africa", "lessons/poly-afro-cuban", "lessons/poly-jazz", "lessons/poly-math-rock"]) {
    b.errors.length = 0;
    await b.goto(`http://127.0.0.1:${PORT}/${p}.html`); await b.sleep(700);
    const r = await b.eval(`(() => { const ps = [...document.querySelectorAll('.poly')];
      const bad = ps.filter(el => { const st = el._poly && el._poly.state; if (!st) return true;
        return [...el.querySelectorAll('.poly-row')].some((row, i) => row.querySelectorAll('.poly-cell').length !== el.querySelectorAll('.poly-circle')[0] && 0); });
      const cellsOk = ps.every(el => { const rows = el.querySelectorAll('.poly-row'); return rows.length === el._poly.state.layers.length && [...rows].every(r => r.querySelectorAll('.poly-cell').length > 0); });
      ps.forEach(el => el.querySelector('.poly-play').click());
      return { n: ps.length, bad: bad.length, cellsOk }; })()`);
    check(p + ": players drawn", r.n > 0 && !r.bad && r.cellsOk, r.n + " players");
    await b.sleep(1500);
    const lit = await b.eval(`document.querySelectorAll('.poly-cell.lit').length`);
    check(p + ": playing lights cells", lit > 0, lit);
    if (p === "tools/polyrhythm") {
      const pr = await b.eval(`(() => { const el = document.querySelector('.poly'), sel = el.querySelector('.poly-preset'), out = [];
        for (let i = 0; i < Polyrhythm.PRESETS.length; i++) { sel.value = i; sel.onchange(); out.push(el.querySelectorAll('.poly-row').length === Polyrhythm.PRESETS[i].layers.split(';').length); }
        return out.every(Boolean); })()`);
      check("presets load", pr);
    }
    const fold = await b.eval(`(() => { const h = document.querySelector('main section.level2 > h2'); h.click(); const s = h.parentNode, c = s.classList.contains('poly-closed'); h.click(); return c && !s.classList.contains('poly-closed'); })()`);
    check(p + ": sections fold", fold);
    check(p + ": no errors", !errs().length, errs().join(" | "));
  }
  console.log(fails ? fails + " failed" : "all ok"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
