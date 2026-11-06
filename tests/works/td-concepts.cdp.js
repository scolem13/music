// Tune Directory: one sheet with every type visible (type chips), the Concepts column, concept / source filters and a row's uses.
// Render first (quarto render practice/tune-directory.qmd) or use SITE=<scratch dir of symlinks to _site with apps/ linked to the repo>.
// With a render made before the uses script tags were added, set INJECT=1: the tags are put in front of tune-directory.js on the fly.
//   node tests/works/td-concepts.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8571;
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; }
    if (process.env.INJECT && u.endsWith("tune-directory.html")) d = Buffer.from(String(d).replace(/<script src="(?:\.\.)?\/apps\/shared\/works\/tune-directory\.js[^>]*>(?:<\/script>)?/, m =>
      ["hutchinson", "shouldice", "bluestine"].map(n => `<script src="/apps/shared/works/uses/${n}.js?v=1"></script>`).join("") + m));
    s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const U = "http://127.0.0.1:" + PORT;
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(1300, 900);
  await b.goto(U + "/practice/tune-directory.html");
  await ev(`localStorage.clear(), 0`); await b.goto(U + "/practice/tune-directory.html");
  check("sheet drawn", await wait(`document.querySelectorAll('.tds tbody tr').length > 100`, 120));
  await wait(`!!window.TdSheet`); await ev(`TdSheet.ready.then(() => 0)`); await b.sleep(800);
  const types = await ev(`[...document.querySelectorAll('.tds-chip')].map(c => c.dataset.t + ':' + c.querySelector('span').textContent).join(',')`);
  check("type chips for every type, All first", /^:/.test(types) && /Tune:/.test(types) && /Theme:/.test(types) && /Piece:/.test(types) && /Billboard:/.test(types), types);
  check("all types shown to start", await ev(`!document.querySelector('.tds-chip[data-t=""]').classList.contains('on') === false && new Set(TdSheet.rows().map(r => r.type)).size >= 5`));
  check("the by-type sections start folded", await ev(`['td-works','td-tunes','td-themes'].every(id => { const s = document.getElementById(id); return !s || !s.classList.contains('sf') || s.classList.contains('sf-shut'); })`));
  await ev(`document.querySelector('.tds-chip[data-t="Theme"]').click(), 0`); await b.sleep(300);
  check("a chip keeps only that type", await ev(`TdSheet.filtered().length > 0 && TdSheet.filtered().every(r => r.type === 'Theme')`));
  await ev(`document.querySelector('.tds-chip[data-t="Tune"]').click(), 0`); await b.sleep(300);
  check("two chips: both types", await ev(`(() => { const t = new Set(TdSheet.filtered().map(r => r.type)); return t.size === 2 && t.has('Theme') && t.has('Tune'); })()`));
  await ev(`document.querySelector('.tds-chip[data-t=""]').click(), 0`); await b.sleep(300);
  const nu = await ev(`(window.WORK_USES || []).reduce((a, s) => a + s.items.length, 0)`);
  check("hutchinson.js loaded", await ev(`(window.WORK_USES || []).some(s => s.src === 'hutchinson')`), nu + " uses");
  check("a Concepts column", await ev(`[...document.querySelectorAll('.tds thead th')].some(t => /Concepts/.test(t.textContent))`));
  const withC = await ev(`TdSheet.rows().filter(r => r.nconc).length`);
  check("rows carry concepts", withC > 20, String(withC));
  check("uses-only works are rows of their own", await ev(`TdSheet.rows().some(r => r.by === 'uses only')`));
  // concept filter
  const cname = await ev(`(() => { const s = document.querySelector('[data-cf="concept"]'); const o = s.options[1]; s.value = o.value; s.dispatchEvent(new Event('change')); return o.value; })()`);
  await b.sleep(400);
  check("concept filter: every row has it", await ev(`TdSheet.filtered().length > 0 && TdSheet.filtered().every(r => r.cset.has(${JSON.stringify(cname)}))`), cname);
  await ev(`(() => { const s = document.querySelector('[data-cf="src"]'); s.value = 'hutchinson'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(400);
  check("source filter: hutchinson rows", await ev(`TdSheet.filtered().length > 0 && TdSheet.filtered().every(r => r.sset.has('hutchinson'))`));
  // expansion
  await ev(`document.querySelector('.tds-open').click(), 0`); await b.sleep(200);
  check("▸ opens the uses: source, concept, link", await ev(`(() => { const d = document.querySelector('.tds-detail'); return !!d && !!d.querySelector('.wk-type') && !!d.querySelector('.wk-concept') && !!d.querySelector('a[href]'); })()`));
  await ev(`document.querySelector('.tds-open').click(), 0`); await b.sleep(100);
  check("▾ closes it", await ev(`!document.querySelector('.tds-detail')`));
  await ev(`document.querySelector('.tds-reset').click(), 0`); await b.sleep(300);
  check("Clear filters shows everything again", await ev(`TdSheet.filtered().length === TdSheet.rows().length`));
  // the Works panel lists uses
  check("Works panels list the uses", await ev(`!!document.querySelector('#td-works-list .wk-uses .wk-uselist li')`));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
