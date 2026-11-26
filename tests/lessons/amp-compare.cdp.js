// The amp pages in a browser (after rendering lessons/amp-compare.qmd and the six intro-<amp>.qmd): both panels drawn from FaithfulPanel
// layouts amp-*; dragging a knob changes the state; a switch toggles; Translate reports exact / approx / lost with notes; the amp
// menu swaps the panel; Light / Dark repaints; ▶ plays with no page errors, through the pedalboard when chosen; each intro page draws
// its panel, its tour steps set the state, its tracks list 3 videos, the quiz answers.
// Run: node tests/lessons/amp-compare.cdp.js   (NEG=1 must fail; SITE=<dir> for a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8594;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/amp-compare.html`); await b.sleep(2000);
  await b.eval(`window.__err = []; addEventListener('error', e => __err.push(String(e.message)));`);
  check("two panels drawn", await b.eval(`document.querySelectorAll('.ampc .amp-face svg.fp-svg').length`) === 2);
  check("left Twin, right AC30", await b.eval(`(() => { const g = document.querySelector('.ampc')._ampc; return g.a.id + ',' + g.b.id; })()`) === "twin,ac30");
  const v0 = await b.eval(`document.querySelector('.ampc')._ampc.a.st.volume`);
  await b.eval(`(() => { const g = document.querySelector('.ampc-a [data-ctl=volume]'); g.scrollIntoView({block:'center'}); const r = g.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (t, Y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: Y, pointerId: 1, button: 0 })); ev('pointerdown', y); ev('pointermove', y - 80); ev('pointerup', y - 80); })()`);
  check("dragging Volume raises it", (await b.eval(`document.querySelector('.ampc')._ampc.a.st.volume`)) > v0);
  await b.eval(`document.querySelector('.ampc-a [data-ctl=bright]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  check("Bright switch toggles", await b.eval(`document.querySelector('.ampc')._ampc.a.st.bright`) === true);
  check("the curve is drawn", await b.eval(`!!document.querySelector('.ampc-a .amp-plot svg path.amp-line')`));
  await b.eval(`document.querySelector('.ampc-go').click()`);
  const q = await b.eval(`document.querySelector('.ampc').dataset.quality`);
  check("Translate reports a quality", /^(exact|approx|lost)$/.test(q || ""), q);
  check("Translate lists notes", await b.eval(`document.querySelectorAll('.ampc-res li').length`) > 0);
  await b.eval(`(() => { const s = document.querySelector('.ampc-b .amp-pick'); s.value = 'svt'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(700);
  check("the amp menu swaps the panel", await b.eval(`!!document.querySelector('.ampc-b [data-ctl=ultralo]')`));
  const t0 = await b.eval(`document.querySelector('.ampc-a .fp-w').dataset.theme`);
  await b.eval(`document.querySelector('.ampc-a .fp-theme').click()`);
  check("Light / Dark repaints", await b.eval(`[...document.querySelectorAll('.ampc .fp-w')].every(w => w.dataset.theme !== '${t0}')`));
  await b.eval(`document.querySelector('.ampc-a .fp-theme').click()`);
  await b.eval(`document.querySelector('.ampc-a .amp-play[data-play=pluck]').click()`); await b.sleep(800);
  check("▶ plays: AudioContext running", await b.eval(`Amps.ctx().state === 'running'`));
  await b.eval(`Amps.stop(); Amps.prefs.pedals = 'board'`);
  check("Pedals in front: the page's pedalboard is the chain", await b.eval(`Amps.pedalChain().map(p => p.id).join(',')`) === "ts808,dm2");
  check("rendering through pedals and amp gives sound", await b.eval(`(() => { const r = Amps.render('plexi', {}, 'pluck', 22050); return r.output.some(v => Math.abs(v) > 0.01) && r.output.every(Number.isFinite); })()`));
  await b.eval(`Amps.prefs.pedals = 'none'`);
  check("no page errors", (await b.eval(`__err.length`)) === 0, await b.eval(`__err.join(' | ')`));
  for (const [slug, id] of [["twin-reverb", "twin"], ["ac30", "ac30"], ["plexi", "plexi"], ["bassman", "bassman"], ["dual-rectifier", "rect"], ["svt", "svt"]]) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1500);
    check(`${slug}: panel drawn`, await b.eval(`!!document.querySelector('.amp svg.fp-svg') && Amps.widgets[0].id === '${id}'`));
    check(`${slug}: tour steps have ▶ buttons`, await b.eval(`document.querySelectorAll('.amp-hear').length`) >= 3);
    await b.eval(`document.querySelectorAll('.amp-hear')[1].click()`); await b.sleep(300);
    check(`${slug}: a step sets its state`, await b.eval(`(() => { const s = JSON.parse(document.querySelectorAll('.amp-step')[1].dataset.set), st = Amps.widgets[0].st; return Object.keys(s).every(k => st[k] === s[k]); })()`));
    await b.eval(`Amps.stop()`);
    const tn = await b.eval(`document.querySelectorAll('.amp-tracks li').length`); check(`${slug}: 3 tracks listed`, tn === 3, tn);
    await b.eval(`(() => { const q = document.querySelector('.amp-q'); q.querySelectorAll('li')[+q.dataset.a].click(); })()`);
    check(`${slug}: quiz marks the right answer`, await b.eval(`!!document.querySelector('.amp-q li.amp-right')`));
  }
  console.log(fails ? fails + " failed" : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
