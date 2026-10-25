// The Course pages in headless Chrome: glossary filters, #term links, TOK and ladder sections; pathway units, ticks
// and share links; enrichment picks, the MLT ladder and share links. Run after rendering:
//   for f in course/index course/glossary course/pathway course/enrichment; do quarto render $f.qmd; done
//   node tests/course/course.cdp.js          (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || path.join(ROOT, "_site"), { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8547;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const U = p => `http://127.0.0.1:${PORT}/${p}`;
(async () => {
  const b = await launch();
  let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const errs = () => b.errors.filter(e => !/supabase|favicon|classes\.seancoleman|ERR_|net::|Failed to load resource/i.test(e));

  // ── glossary ──
  b.errors.length = 0;
  await b.goto(U("course/glossary.html")); await b.sleep(900);
  const g0 = await b.eval(`({ n: document.querySelectorAll('.gl-term').length, count: document.getElementById('gl-count').textContent,
    tok: document.querySelectorAll('.gl-tokcard').length, ladders: document.querySelectorAll('.gl-ladder').length })`);
  check("glossary: terms drawn", g0.n > 250, g0.count);
  check("glossary: TOK cards and ladders", g0.tok >= 8 && g0.ladders === 3, JSON.stringify(g0));
  const g1 = await b.eval(`(() => { document.querySelector('#gl-lv [data-v=dp]').click();
    const a = document.querySelectorAll('.gl-term').length; document.getElementById('gl-tok').click();
    const t = document.querySelectorAll('.gl-term').length; return { a, t, url: location.search }; })()`);
  check("glossary: year and TOK filters narrow the list, in the URL", g1.t < g1.a && g1.t > 10 && /lv=dp/.test(g1.url) && /tok=1/.test(g1.url), JSON.stringify(g1));
  await b.goto(U("course/glossary.html" + g1.url)); await b.sleep(700);
  const g2 = await b.eval(`document.querySelectorAll('.gl-term').length`);
  check("glossary: a copied link shows the same view", g2 === g1.t, g2);
  await b.goto(U("course/glossary.html?lv=myp1#sampling")); await b.sleep(900);
  const g3 = await b.eval(`(() => { const el = document.getElementById('sampling'); return el && el.classList.contains('open') && !!el.querySelector('.gl-tok'); })()`);
  check("glossary: #term opens it (clearing a filter that hid it), with its TOK questions", g3);
  const g4 = await b.eval(`(() => { document.querySelector('#gl-view').value = 'compact'; document.querySelector('#gl-view').onchange({ target: document.querySelector('#gl-view') });
    return document.querySelectorAll('.gl-compact tr').length; })()`);
  check("glossary: compact view", g4 > 100, g4);
  const g5 = await b.eval(`(() => { const s = document.querySelector('#gl-q'); s.value = 'contemporary music'; s.oninput(); return new Promise(r => setTimeout(() => r(document.querySelectorAll('.gl-compact tr').length), 300)); })()`);
  check("glossary: search", g5 >= 1 && g5 < 10, g5);
  check("glossary: no errors", !errs().length, errs().join(" | "));

  // ── pathway ──
  b.errors.length = 0;
  await b.goto(U("course/pathway.html?at=myp4.2")); await b.sleep(900);
  const p0 = await b.eval(`({ cards: document.querySelectorAll('.pw-card').length, now: document.querySelectorAll('.pw-card .pw-now').length,
    past: document.querySelectorAll('.pw-lab.past').length, here: document.querySelector('.pw-time li.here b') && document.querySelector('.pw-time li.here b').textContent,
    rows: document.querySelectorAll('#pw-sequence tr').length, pressed: document.querySelector('#pw-picker [aria-pressed=true]').textContent })`);
  check("pathway: seven strand cards for MYP4 U2, five assessed", p0.cards === 7 && p0.now === 5 && p0.past >= 5, JSON.stringify(p0));
  check("pathway: decisions mark MYP4", /ePortfolio/.test(p0.here || ""), p0.here);
  check("pathway: whole sequence table", p0.rows === 8 && p0.pressed === "MYP4 U2", p0.rows + " " + p0.pressed);
  const p1 = await b.eval(`(() => { const c = document.querySelector('#pw-where input[data-tick]'); c.click();
    const saved = JSON.parse(localStorage.getItem('course:pathway-ticks') || '{}'); return { id: c.dataset.tick, saved: !!saved[c.dataset.tick], link: document.getElementById('pw-link').value }; })()`);
  check("pathway: a tick is saved and goes into the share link", p1.saved && /[?&]p=/.test(p1.link), p1.id);
  await b.eval(`localStorage.clear()`);
  await b.goto(p1.link.replace(/^https?:\/\/[^/]+\//, U(""))); await b.sleep(900);
  const p2 = await b.eval(`({ banner: !!document.getElementById('pw-mine'), ticked: !!document.querySelector('#pw-where input[data-tick="${p1.id}"]:checked'), dis: document.querySelector('#pw-where input[data-tick]').disabled })`);
  check("pathway: the share link opens read-only with the tick", p2.banner && p2.ticked && p2.dis, JSON.stringify(p2));
  await b.goto(U("course/pathway.html?at=myp1")); await b.sleep(700);
  const p3 = await b.eval(`({ off: document.querySelectorAll('.pw-card.off').length, past: document.querySelectorAll('.pw-lab.past').length })`);
  check("pathway: MYP1 has no earlier skills and two strands not assessed", p3.past === 0 && p3.off === 2, JSON.stringify(p3));
  await b.goto(U("course/pathway.html?at=dp1")); await b.sleep(700);
  const p4 = await b.eval(`({ cards: document.querySelectorAll('.pw-card').length, tables: document.querySelectorAll('#pw-where .pw-table').length })`);
  check("pathway: DP1 shows the components and ladders", p4.cards === 4 && p4.tables === 2, JSON.stringify(p4));
  await b.goto(U("course/pathway.html?at=myp4.1")); await b.sleep(700);
  const p5 = await b.eval(`document.getElementById('pw-decisions').textContent`);
  check("pathway: MYP4 now starts DP in 2028, on the new course", /fall 2028/.test(p5) && /new DP Music course/.test(p5));
  check("pathway: no errors", !errs().length, errs().join(" | "));

  // ── enrichment ──
  b.errors.length = 0;
  await b.eval(`localStorage.clear()`);
  await b.goto(U("course/enrichment.html")); await b.sleep(900);
  const e0 = await b.eval(`({ opts: document.querySelectorAll('#en-choose .en-opt').length, core: document.querySelectorAll('#en-core .en-opt').length, lv: document.querySelectorAll('.en-ladder li').length })`);
  check("enrichment: options, core and the eight levels", e0.opts > 30 && e0.core === 3 && e0.lv === 8, JSON.stringify(e0));
  const e1 = await b.eval(`(() => { const c = document.querySelector('#en-choose [data-opt=improv] select[data-status]'); c.value = 'done'; c.dispatchEvent(new Event('change', { bubbles: true }));
    const s = JSON.parse(localStorage.getItem('course:enrichment')); const li = [...document.querySelectorAll('.en-ladder li')][6];
    return { saved: s.picks.improv && s.picks.improv.s, reached: li.classList.contains('reached'), note: !!document.querySelector('[data-opt=improv] input[data-note]'), link: document.getElementById('en-link').value }; })()`);
  check("enrichment: marking an option done saves it and lights its MLT level", e1.saved === "done" && e1.reached && e1.note, JSON.stringify(e1).slice(0, 120));
  const e2 = await b.eval(`(() => { const s = document.querySelector('#en-core select[data-core=tonal]'); s.value = '2'; s.dispatchEvent(new Event('change', { bubbles: true }));
    return [...document.querySelectorAll('.en-ladder li')].slice(0, 3).every(li => li.classList.contains('reached')); })()`);
  check("enrichment: the pattern level fills the ladder up to it", e2);
  const e3 = await b.eval(`(() => { document.querySelector('#en-years [data-y=myp1]').click(); return document.querySelectorAll('#en-choose .en-opt').length; })()`);
  check("enrichment: year filter", e3 > 5 && e3 < e0.opts, e3);
  const link = await b.eval(`document.getElementById('en-link').value`);
  await b.eval(`localStorage.clear()`);
  await b.goto(link.replace(/^https?:\/\/[^/]+\//, U(""))); await b.sleep(900);
  const e4 = await b.eval(`({ banner: !!document.getElementById('en-mine-btn'), sel: document.querySelector('[data-opt=improv] select').value, dis: document.querySelector('[data-opt=improv] select').disabled })`);
  check("enrichment: the share link opens read-only with the plan", e4.banner && e4.sel === "done" && e4.dis, JSON.stringify(e4));
  check("enrichment: no errors", !errs().length, errs().join(" | "));

  // ── folding, on every page ──
  for (const p of ["course/index", "course/glossary", "course/pathway", "course/enrichment"]) {
    await b.goto(U(p + ".html")); await b.sleep(500);
    const f = await b.eval(`(() => { const s = document.querySelector('main section.level2'); if (!s) return 'no sections'; s.querySelector('h2').click(); const c = s.classList.contains('sf-shut'); s.querySelector('h2').click(); return c && !s.classList.contains('sf-shut'); })()`);
    const toc = await b.eval(`document.querySelectorAll('#TOC a').length`);
    check(p + ": sections fold, jump bar lists them", f === true && toc >= 2, f + " " + toc);
  }
  console.log(fails ? fails + " failed" : "all ok"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
