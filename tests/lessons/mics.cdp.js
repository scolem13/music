// The mic widgets in a browser: both compare panels drawn from FaithfulPanel layouts mic-*; the U 87's pattern switch, pad and low cut
// click; dragging the mic changes the distance; the mic menu swaps the drawing; Translate reports exact / approx / lost with notes;
// A + B renders; Light / Dark repaints; ▶ plays with no page errors; snare comes from the band's kit or the generated fallback;
// tour steps set state and placement; tracks list 3; the quiz answers.
// Run: node tests/lessons/mics.cdp.js   (NEG=1 must fail). Default: tests/lessons/mics-harness.html served from the repo (no render
// needed). RENDERED=1 [SITE=<dir>]: the rendered lessons/mic-compare.html and intro pages instead.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), REND = process.env.RENDERED === "1", SITE = process.env.SITE || (REND ? ROOT + "/_site" : ROOT), { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : /\.(mp3|ogg|wav)$/.test(f) ? "audio/mpeg" : "text/html";
const PORT = 8597;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/` + (REND ? "lessons/mic-compare.html" : "tests/lessons/mics-harness.html") + "?a=sm57&b=u87"); await b.sleep(1500);
  await b.eval(`window.__err = []; addEventListener('error', e => __err.push(String(e.message)));`);
  check("two mic drawings", await b.eval(`document.querySelectorAll('.micc .mic-face svg.fp-svg').length`) === 2);
  const g = `document.querySelector('.micc')._micc`;
  check("left SM57, right U 87", await b.eval(`${g}.a.id + ',' + ${g}.b.id`) === "sm57,u87");
  await b.eval(`(() => { const s = document.querySelector('.micc-b [data-ctl=pattern]'); s.scrollIntoView({block:'center'}); const r = s.getBoundingClientRect(); s.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.right - 3, clientY: r.top + r.height / 2 })); })()`);
  check("U 87 pattern switch: click the 8 cell -> fig8", await b.eval(`${g}.b.st.pattern`) === "fig8", await b.eval(`${g}.b.st.pattern`));
  await b.eval(`document.querySelector('.micc-b [data-ctl=pad]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  check("pad key toggles", await b.eval(`${g}.b.st.pad`) === true);
  await b.eval(`document.querySelector('.micc-b [data-ctl=lowcut]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  check("low cut key toggles", await b.eval(`${g}.b.st.lowcut`) === true);
  check("polar plot marks the inverted rear", await b.eval(`document.querySelector('.micc-b .mic-polar').textContent.includes('inverted')`));
  const d0 = await b.eval(`${g}.a.pl.dist`);
  await b.eval(`(() => { const dot = document.querySelector('.micc-a .mic-dot'); dot.scrollIntoView({block:'center'}); const r = dot.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, svg = dot.ownerSVGElement;
    dot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1 })); svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x + 60, clientY: y, pointerId: 1 })); svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); })()`);
  check("dragging the mic moves it further", (await b.eval(`${g}.a.pl.dist`)) > d0);
  await b.eval(`(() => { const r = document.querySelector('.micc-a .mic-angle'); r.value = 60; r.dispatchEvent(new Event('input')); })()`);
  check("Angle slider sets the angle", await b.eval(`${g}.a.pl.angle`) === 60);
  check("the curve is drawn", await b.eval(`!!document.querySelector('.micc-a .mic-plot path.mic-line')`));
  await b.eval(`(() => { const W = ${g}.b; W.setAll({ pattern: 'fig8', pad: false, lowcut: false }, { dist: 0.3, angle: 180 }); })()`);
  await b.eval(`document.querySelector('.micc-back').click()`);
  const q = await b.eval(`document.querySelector('.micc').dataset.quality`);
  check("Translate U 87 fig-8 behind -> SM57: lost", q === "lost", q);
  check("Translate lists notes incl. pattern lost", await b.eval(`[...document.querySelectorAll('.micc-res li')].some(l => /pattern lost/i.test(l.textContent))`));
  await b.eval(`(() => { const s = document.querySelector('.micc-b .mic-pick'); s.value = 'md421'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(700);
  check("the mic menu swaps the drawing (MD 421 bass ring)", await b.eval(`!!document.querySelector('.micc-b [data-ctl=bass]')`));
  const t0 = await b.eval(`document.querySelector('.micc-a .fp-w').dataset.theme`);
  await b.eval(`document.querySelector('.micc-a .fp-theme').click()`);
  check("Light / Dark repaints", await b.eval(`[...document.querySelectorAll('.fp-w')].every(w => w.dataset.theme !== '${t0}')`));
  await b.eval(`document.querySelector('.micc-a .fp-theme').click()`);
  await b.eval(`document.querySelector('.micc-a .mic-play').click()`); await b.sleep(2500);
  check("▶ plays: AudioContext running", await b.eval(`Mics.ctx().state === 'running'`));
  check("A + B renders finite sound", await b.eval(`(async () => { const y = await Mics.playSum(${g}.a, ${g}.b); Mics.stop(); return y.length > 1000 && y.every(Number.isFinite) && y.some(v => Math.abs(v) > 1e-3); })()`));
  check("snare source loads (kit or fallback)", await b.eval(`Mics.source('snare').then(x => x.length > 1000 && x.some(v => Math.abs(v) > 0.01))`));
  check("guitar source from the amp model", await b.eval(`Mics.source('guitar').then(x => x.length > 1000 && x.every(Number.isFinite))`));
  if (!REND) {
    check("standalone U 87 widget mounted", await b.eval(`Mics.widgets.some(w => w.id === 'u87' && !document.querySelector('.micc').contains(document.querySelector('.mic')))`));
    await b.eval(`document.querySelectorAll('.mic-hear')[0].click()`); await b.sleep(300);
    const W = `Mics.widgets.filter(w => w.id === 'u87')[0]`;
    check("step 1 sets fig8 at 20 cm, 180°", await b.eval(`${W}.st.pattern === 'fig8' && ${W}.pl.dist === 0.2 && ${W}.pl.angle === 180`));
    await b.eval(`Mics.stop(); document.querySelectorAll('.mic-hear')[1].click()`); await b.sleep(300);
    check("step 2 sets the pad, guitar source", await b.eval(`${W}.st.pad === true && ${W}.src === 'guitar'`));
    await b.eval(`Mics.stop()`);
    await b.sleep(500); check("tracks: 3 listed", await b.eval(`document.querySelector('.mic-tracks').dataset.n`) === "3");
    await b.eval(`document.querySelector('.mic-q li').click()`); check("quiz marks the right answer", await b.eval(`document.querySelector('.mic-q li').classList.contains('mic-right')`));
  } else {
    for (const id of ["sm57", "sm58", "u87", "r121", "md421", "beta52"]) { await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${id}.html`); await b.sleep(1500);
      check(`${id}: drawing`, await b.eval(`!!document.querySelector('.mic svg.fp-svg') && Mics.widgets[0].id === '${id}'`));
      check(`${id}: tour ▶ buttons`, await b.eval(`document.querySelectorAll('.mic-hear').length`) >= 3);
      check(`${id}: tracks 3`, await b.eval(`new Promise(r => setTimeout(() => r(document.querySelector('.mic-tracks').dataset.n), 400))`) === "3"); } }
  check("no page errors", (await b.eval(`(window.__err || []).length`)) === 0, await b.eval(`(window.__err || []).join(' | ')`));
  console.log(fails ? `${fails} FAILED` : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
