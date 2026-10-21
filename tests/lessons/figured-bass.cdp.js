// The Figured Bass page (theory/figured-bass.qmd: figured.js drills, fb-explorer.js) in headless Chrome: every drill on the page
// draws a question with no page errors, the explorer opens on I64 in C, its buttons change the chord (V65, then a minor key), the
// figures under the bass are the written ones, and hovering an explanation line lights its note. Run after rendering:
//   quarto render theory/figured-bass.qmd; node tests/lessons/figured-bass.cdp.js    (SHOT=dir saves screenshots)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8541;
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split(/[?#]/)[0]); const f = p.startsWith("/apps/") ? path.join(ROOT, p) : path.join(SITE, p);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 1300, height: 1000 });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(e => !/supabase|createClient|soundfont|fetch|favicon|sounds|config/i.test(e));
  await b.goto(`http://127.0.0.1:${PORT}/theory/figured-bass.html`); await b.sleep(1200);
  const drills = await ev(`[...document.querySelectorAll('.drill')].map(d => d.getAttribute('data-ex') + ':' + (d.getAttribute('data-answer') || ''))`);
  check("9 drills drew a question", drills.length === 9 && drills.every(d => /:.+/.test(d)), drills.join(" | "));
  const fx = () => ev(`(() => { const h = document.querySelector('.fb-explorer'); return { rn: h.dataset.rn, sym: h.dataset.sym,
    figs: [...h.querySelectorAll('.fbx-fig:not(.fbx-implied)')].map(t => t.textContent).join('/'), heads: h.querySelectorAll('path.fbx-nh').length,
    items: h.querySelectorAll('.fbx-item').length, text: h.querySelector('.fbx-explain').textContent }; })()`);
  let x = await fx();
  check("explorer opens on I64 = C/G", x.rn === "I64" && x.sym === "C/G" && x.figs === "6/4" && x.heads === 3, JSON.stringify(x).slice(0, 160));
  check("explains the 4th as the root", /a 4th above G.*G A B C.*lands on C, the chord's root/.test(x.text), x.text.slice(0, 200));
  if (process.env.SHOT) { await ev(`document.querySelector('.fb-explorer').scrollIntoView()`); await b.shot(process.env.SHOT + "/fb-1.png", false); }
  await ev(`(() => { const btns = [...document.querySelectorAll('.fb-explorer button')]; btns.find(b => b.textContent === 'V').click(); })()`);
  await ev(`[...document.querySelectorAll('.fb-explorer button')].find(b => b.textContent === 'Seventh chord').click()`);
  await ev(`[...document.querySelectorAll('.fb-explorer button')].find(b => /^3rd/.test(b.textContent)).click()`);
  x = await fx();
  check("V65 = G7/B, written 6/5", x.rn === "V65" && x.sym === "G7/B" && x.figs === "6/5" && x.heads === 4 && x.items === 3, JSON.stringify(x).slice(0, 120));
  await ev(`(() => { const s = document.querySelectorAll('.fb-explorer select')[1]; s.value = 'minor'; s.dispatchEvent(new Event('change')); })()`);
  x = await fx();
  check("c minor V65: the raised leading tone in the bass is explained", x.rn === "V65" && /^G7\/B$/.test(x.sym) && /raised leading tone/.test(x.text), x.sym);
  await ev(`[...document.querySelectorAll('.fb-explorer button')].find(b => /^root/.test(b.textContent)).click()`);
  x = await fx();
  check("c minor V7: figure 7 plus a lone ♮ for the 3rd", x.rn === "V7" && x.figs.split("/").sort().join("/") === ["7", "♮"].sort().join("/"), x.figs);
  const hl = await ev(`(() => { const li = document.querySelector('.fbx-item'); li.dispatchEvent(new MouseEvent('mouseenter')); const k = li.dataset.k;
    return document.querySelectorAll('path.fbx-nh.fbx-hl[data-k="' + k + '"], .fbx-br.fbx-hl').length; })()`);
  check("hover lights the note and its bracket", hl === 2, hl);
  // the six-four drill answers by button
  const sf = await ev(`(() => { const h = document.querySelector('.drill[data-ex=sixfour]'); const a = h.getAttribute('data-answer'); h._drill.answer(a); return h.getAttribute('data-right'); })()`);
  check("sixfour answered right", sf === "1", sf);
  const fr = await ev(`(() => { const h = document.querySelector('.drill[data-ex=fbreal]'); h._drill.answer(h.getAttribute('data-answer')); return h.getAttribute('data-right'); })()`);
  check("fbreal answered right", fr === "1", fr);
  const folds = await ev(`document.querySelectorAll('section.level2.ls-sec').length`);
  check("sections fold", folds === 6, folds);
  if (process.env.SHOT) { await ev(`document.querySelector('.fb-explorer').scrollIntoView()`); await b.shot(process.env.SHOT + "/fb-2.png", false); }
  check("no page errors", errs().length === 0, errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " FAILED" : "FIGURED BASS PAGE OK"); process.exit(fails ? 1 : 0);
})();
