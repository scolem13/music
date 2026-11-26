// The world-instrument widgets in a browser: compare panels drawn from FaithfulPanel layouts wi-*; clicking a fret space / string /
// note area / tine plays that part; the raga seg moves the frets; the jawari knob's arrow keys move it; Translate sitar -> tanpura
// reports approx with notes; a pan -> kalimba translation says skipped; the tanpura drone loops and stops; Light / Dark repaints;
// tour step, tracks 3, quiz; no page errors (read from CDP; the site-wide supabase error ignored).
// Run: node tests/lessons/world-instruments.cdp.js   (NEG=1 must fail). Default: tests/lessons/world-instruments-harness.html.
// RENDERED=1 [SITE=<dir>]: the rendered lessons/world-instruments-compare.html and intro-mbira.html instead.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), REND = process.env.RENDERED === "1", SITE = process.env.SITE || (REND ? ROOT + "/_site" : ROOT), { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8599;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  const U = p => `http://127.0.0.1:${PORT}/` + p;
  await b.goto(U(REND ? "lessons/world-instruments-compare.html" : "tests/lessons/world-instruments-harness.html")); await b.sleep(1800);
  const g = n => `document.querySelectorAll('.wic')[${n}]._wic`;
  check("two drawings in the first compare", await b.eval(`document.querySelectorAll('.wic')[0].querySelectorAll('.wi-face svg.fp-svg').length`) === 2);
  check("left sitar, right tanpura", await b.eval(`${g(0)}.a.id + ',' + ${g(0)}.b.id`) === "sitar,tanpura");
  // click the centre of a zone (panel units -> screen)
  const clickZone = (n, side, part) => b.eval(`(() => { const W = ${g(n)}.${side}, z = W.L.zones.find(z => z.part === '${part}'); if (!z) return 'nozone'; const box = document.querySelectorAll('.wic')[${n}].querySelector('.wic-${side} .wi-face svg.fp-svg'); box.scrollIntoView({block:'center'});
    const r = box.getBoundingClientRect(), vb = box.viewBox.baseVal, x = z.kind === 'ell' ? z.cx : z.x + z.w / 2, y = z.kind === 'ell' ? z.cy : z.y + z.h / 2;
    const cx = r.left + (x - vb.x) * r.width / vb.width, cy = r.top + (y - vb.y) * r.height / vb.height, el = document.elementFromPoint(cx, cy) || box;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy })); return document.querySelectorAll('.wic')[${n}].querySelector('.wic-${side}').dataset.last || ''; })()`);
  check("click a fret space on the sitar -> fret:5", await clickZone(0, "a", "fret:5") === "fret:5");
  check("click the chikari", await clickZone(0, "a", "chikari") === "chikari");
  check("partials plot drawn", await b.eval(`!!document.querySelector('.wic-a .wi-plot rect.wi-cell')`));
  const fx = () => b.eval(`[...document.querySelectorAll('.wic-a .wi-face path')].map(e => e.getAttribute('d')).join('|')`);
  const before = await fx();
  await b.eval(`(() => { const s = document.querySelector('.wic-a [data-ctl=raga]'); const r = s.getBoundingClientRect(); s.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.75, clientY: r.top + r.height / 2 })); })()`); await b.sleep(500);
  check("raga seg: Malkauns moves the frets", await b.eval(`${g(0)}.a.st.raga`) === "malkauns" && (await fx()) !== before, await b.eval(`${g(0)}.a.st.raga`));
  await b.eval(`(() => { const k = document.querySelector('.wic-a [data-ctl=jawari]'); k.focus(); for (let i = 0; i < 4; i++) k.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); })()`);
  check("jawari knob: arrow keys lower it", await b.eval(`${g(0)}.a.st.jawari`) < 0.7, await b.eval(`${g(0)}.a.st.jawari`));
  check("click a tanpura string -> s4", await clickZone(0, "b", "s4") === "s4");
  await b.eval(`document.querySelectorAll('.wic')[0].querySelector('.wic-go').click()`);
  check("Translate sitar (Malkauns) -> tanpura: approx, Ma tuning", await b.eval(`document.querySelectorAll('.wic')[0].dataset.quality`) === "approx" && await b.eval(`${g(0)}.b.st.tuning`) === "M" && await b.eval(`document.querySelectorAll('.wic')[0].querySelectorAll('.wic-res li').length`) > 2);
  await b.eval(`document.querySelector('.wic-b .wi-drone').click()`); await b.sleep(900);
  check("tanpura drone loops: AudioContext running", await b.eval(`WorldInst.ctx().state === 'running' && !!${g(0)}.b.dr`));
  await b.eval(`document.querySelector('.wic-b .wi-stop').click()`); check("■ Stop ends the drone", await b.eval(`!${g(0)}.b.dr`));
  check("click a pan note area -> note:0", await clickZone(1, "a", "note:0") === "note:0");
  check("click a kalimba tine -> tine:4", await clickZone(1, "b", "tine:4") === "tine:4");
  await b.eval(`document.querySelectorAll('.wic')[1].querySelector('.wic-go').click()`);
  check("pan -> kalimba: skipped and said so", await b.eval(`document.querySelectorAll('.wic')[1].dataset.quality`) === "skipped" && await b.eval(`/Skipped/.test(document.querySelectorAll('.wic')[1].querySelector('.wic-res').textContent)`));
  const t0 = await b.eval(`document.querySelector('.wic-a .fp-w').dataset.theme`);
  await b.eval(`document.querySelector('.wic-a .fp-theme').click()`);
  check("Light / Dark repaints", await b.eval(`[...document.querySelectorAll('.fp-w')].every(w => w.dataset.theme !== '${t0}')`));
  await b.eval(`document.querySelector('.wic-a .fp-theme').click()`); await b.eval(`WorldInst.stop()`);
  if (REND) { await b.goto(U("lessons/intro-mbira.html")); await b.sleep(1800); }
  check("standalone mbira mounted", await b.eval(`WorldInst.widgets.some(w => w.id === 'mbira')`));
  await b.eval(`document.querySelectorAll('.wi-hear')[0].click()`); await b.sleep(300);
  check("tour step plays a tine", /^tine:/.test(await b.eval(`document.querySelector('.wi[data-item=mbira], .wi-w[data-item=mbira]').dataset.last || ''`)));
  if (!REND) check("tour step set the buzzers off", await b.eval(`WorldInst.widgets.filter(w => w.id === 'mbira').pop().st.buzz`) === false);
  await b.eval(`WorldInst.stop()`); await b.sleep(400);
  check("tracks: 3 listed", await b.eval(`document.querySelector('.wi-tracks').dataset.n`) === "3");
  await b.eval(`document.querySelector('.wi-q li').click()`); check("quiz marks an answer", await b.eval(`!!document.querySelector('.wi-q li.wi-right, .wi-q li.wi-wrong')`));
  const errs = b.errors.filter(e => !/favicon|404|supabase/.test(e));
  check("no page errors (CDP)", errs.length === 0, errs.join(" | "));
  console.log(fails ? `${fails} FAILED` : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
