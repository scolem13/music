// The drum machines page in a browser (lessons/drum-compare.qmd): panels build, every example loads with a report, both
// machines sound through the worklet, the grid lights while playing, Stop silences, a report line lights its row, a click on
// panel A retranslates B, the plots draw, the video list loads, export/import round-trips, DrumCompare.voice plays.
// Run after rendering the page: node tests/lessons/drum-compare.cdp.js   (SHOT=file.png saves a screenshot; NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8548;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const LEVEL = ms => `new Promise(res => { const a = DrumCompare.widgets[0].analyser(); const d = new Float32Array(2048); let m = 0;
  const iv = setInterval(() => { a.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }, 20); setTimeout(() => { clearInterval(iv); res(m); }, ${ms}); })`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/drum-compare.html`); await b.sleep(1000);
  check("one widget, two panels", await b.eval(`DrumCompare.widgets.length === 1 && document.querySelectorAll('.dcmp-panel').length === 2`));
  let bad = [];
  for (const id of await b.eval(`DrumCompare.EXAMPLES.map(e => e.id)`)) { const n = await b.eval(`(DrumCompare.widgets[0].load('${id}'), document.querySelectorAll('.dcmp-item').length)`); if (n < 4) bad.push(id + ":" + n); }
  check("every example loads with a report", bad.length === 0, bad.join(","));
  await b.eval(`DrumCompare.widgets[0].load('electro808')`);
  check("electro → 909: cowbell row marked lost on A", await b.eval(`!!document.querySelector('.dcmp-src tr[data-ctl="v:cowbell"].dcmp-lost')`));
  await b.eval(`[...document.querySelectorAll('.dcmp-item')].find(i => /Cow Bell is lost/.test(i.textContent)).dispatchEvent(new Event('mouseenter'))`);
  check("pointing at a line lights its row", await b.eval(`document.querySelector('.dcmp-src tr[data-ctl="v:cowbell"]').classList.contains('dcmp-hl')`));
  const before = await b.eval(`document.querySelectorAll('.dcmp-dst .dcmp-cell.dcmp-on').length`);
  await b.eval(`document.querySelector('.dcmp-src tr[data-ctl="v:snare"] td[data-step="6"]').click()`);
  const after = await b.eval(`document.querySelectorAll('.dcmp-dst .dcmp-cell.dcmp-on').length`);
  check("a click on A retranslates B", after === before + 1, before + " -> " + after);
  await b.eval(`DrumCompare.widgets[0].play(['a'])`); await b.sleep(500);
  let lv = await b.eval(LEVEL(900)); check("A sounds (808)", lv > 0.02, lv.toFixed(3));
  check("the grid lights while playing", await b.eval(`document.querySelectorAll('.dcmp-src .dcmp-now').length > 0 && document.querySelector('.dcmp-src').classList.contains('dcmp-live')`));
  await b.eval(`DrumCompare.widgets[0].play(['b'])`); await b.sleep(500);
  lv = await b.eval(LEVEL(900)); check("B sounds (909)", lv > 0.02, lv.toFixed(3));
  await b.eval(`DrumCompare.widgets[0].stop()`); await b.sleep(500);
  lv = await b.eval(LEVEL(300)); check("Stop silences", lv < 0.01, lv.toFixed(4));
  await b.eval(`DrumCompare.widgets[0].load('mpcloose'); document.querySelector('.dcmp-turn').click()`); await b.sleep(200);
  check("Make this the starting point swaps", await b.eval(`DrumCompare.widgets[0].a.machine === 'tr909' && DrumCompare.widgets[0].toId === 'mpc60'`));
  check("plots drawn", await b.eval(`[...document.querySelectorAll('.dcmp-plot canvas')].slice(0, 4).every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n > 300; })`));
  await b.sleep(500);
  check("video list loads", await b.eval(`document.querySelectorAll('.dcmp-assign a[href*="youtube.com"]').length`) >= 12);
  check("export → import round trip", await b.eval(`(() => { const W = DrumCompare.widgets[0]; W.load('house909'); const j = DrumCompare.exportJSON(W.a, { song: 'x' }); const r = DrumCompare.importJSON(j); return r.state.machine === 'tr909' && r.state.shuffle === 3; })()`));
  const vlv = await b.eval(`(async () => { const ctx = new AudioContext(); const v = await DrumCompare.voice(ctx, 'tr808', { kick: { decay: 9 } }); const a = ctx.createAnalyser(); v.output.connect(a); v.hit('kick', ctx.currentTime + 0.05, 1); const d = new Float32Array(2048); let m = 0; for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 20)); a.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); } ctx.close(); return m; })()`);
  check("DrumCompare.voice plays a kick on another context", vlv > 0.02, vlv.toFixed(3));
  check("no horizontal scroll at phone width", await (async () => { await b.resize(375, 800); await b.sleep(300); return b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`); })());
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase notice aside)", errs.length === 0, errs.slice(0, 2).join(" | "));
  if (process.env.SHOT) { await b.resize(1300, 1000); await b.eval(`DrumCompare.widgets[0].load('electro808'); window.scrollTo(0, document.querySelector('.dcmp').getBoundingClientRect().top + scrollY - 60)`); await b.sleep(800); await b.shot(process.env.SHOT, true); }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
