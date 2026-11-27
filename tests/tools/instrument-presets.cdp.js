// Instrument Presets page (tools/instrument-presets.qmd, apps/shared/lessons/preset-book.js): a preset saved from the B3 panel's
// Presets menu shows up under Organs with its name, page link and settings; families group by layout id; Delete removes one;
// Import merges an instrument-presets file (same name replaces). Run after `quarto render tools` (and lessons copied into _site):
//   node tests/tools/instrument-presets.cdp.js   (NEG=1 must fail; SITE=<dir>)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8593;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({}); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 900);
  for (const f of ["/tools/instrument-presets.html", "/lessons/organ-compare.html"]) if (!fs.existsSync(SITE + f)) check("rendered " + f, false);
  // save a preset on the B3 through its real menu API
  await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(800);
  await b.eval(`Object.keys(localStorage).filter(k => /^fp-presets/.test(k)).forEach(k => localStorage.removeItem(k)); FaithfulPanel.setMview('panel'); OrganCompare.widgets[0].pick('b3','pipe')`); await b.sleep(1500);
  await b.eval(`(() => { const W = OrganCompare.widgets[0], m = document.querySelector('.ocmp-panel:not(.ocmp-b)')._fpH.m; W.set('b3','uB.0',8); W.set('b3','uB.1',8); W.set('b3','uB.2',8); m.presets.save('Jimmy 888'); m.presets.save('Second'); })()`);
  await b.eval(`localStorage.setItem('fp-presets:gt-strat', JSON.stringify([{ name: 'Quack', v: { sel: 'p2', vol: 10 } }]))`);
  await b.goto(`http://127.0.0.1:${PORT}/tools/instrument-presets.html`); await b.sleep(800);
  const r = await b.eval(`(() => { const org = document.querySelector('.pbk-family[data-family="organ"]'), gt = document.querySelector('.pbk-family[data-family="gt"]');
    const row = [...org.querySelectorAll('tr.pbk-has')].map(t => t.textContent);
    return { sum: document.querySelector('.pbk-sum').textContent, row, link: org.querySelector('tr.pbk-has a') && org.querySelector('tr.pbk-has a').getAttribute('href'),
      names: [...org.querySelectorAll('.pbk-pn')].map(x => x.textContent), grid: org.querySelector('.pbk-grid') && org.querySelector('.pbk-grid').textContent,
      gt: [...gt.querySelectorAll('.pbk-pn')].map(x => x.textContent), fams: document.querySelectorAll('.pbk-family').length, h2: document.querySelectorAll('h2').length }; })()`);
  check("13 family sections, each a ## heading", r.fams === 13 && r.h2 >= 13, r.fams + " / " + r.h2);
  check("summary counts 3 presets on 2 instruments", /3 presets on 2 instruments/.test(r.sum), r.sum);
  check("the B3 row under Organs: name, 2 presets, link to the page it was saved on", r.row.length === 1 && /Hammond B-3/.test(r.row[0]) && /2/.test(r.row[0]) && /organ-compare\.html/.test(r.link || ""), JSON.stringify(r.row) + " " + r.link);
  check("its presets listed in menu order with their settings (drawbar 16′ shown as 8)", r.names.join("|") === "1. Jimmy 888|2. Second" && /uB\.0\s*8/.test(r.grid.replace(/\s+/g, " ")), r.names.join("|"));
  check("a guitar preset under Guitars", r.gt.join() === "1. Quack");
  await b.eval(`window.confirm = () => true; [...document.querySelectorAll('.pbk-family[data-family="organ"] .pbk-del')][1].click()`);
  check("Delete removes that one preset", (await b.eval(`JSON.parse(localStorage.getItem('fp-presets:organ-b3')).map(p => p.name).join()`)) === "Jimmy 888");
  // import: same name replaces, new one added
  await b.eval(`(() => { window.alert = () => {}; const f = new File([JSON.stringify({ kind: 'instrument-presets', version: 1, presets: { 'organ-b3': [{ name: 'Jimmy 888', v: { 'inv:uB.0': -4 } }, { name: 'Gospel', v: { perc: true } }], 'bad id!': [{ name: 'x', v: {} }] } })], 'p.json', { type: 'application/json' });
    const inp = document.querySelector('.pbk-top input[type=file]'), dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`); await b.sleep(400);
  const im = await b.eval(`JSON.parse(localStorage.getItem('fp-presets:organ-b3'))`);
  check("Import merges: same name replaced, new one added, bad ids ignored", im.length === 2 && im[0].v["inv:uB.0"] === -4 && im[1].name === "Gospel" && !(await b.eval(`localStorage.getItem('fp-presets:bad id!')`)), JSON.stringify(im));
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase one aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
