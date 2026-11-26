// The electric bass pages in a browser (after rendering lessons/bass-compare.qmd and intro-{p-bass,jazz-bass,stingray,rickenbacker-bass}.qmd):
// both panels drawn from FaithfulPanel layouts bs-*; dragging a Jazz volume knob changes the state and the picture; Translate fills
// the other side and reports exact / approx / lost with notes; the bass menu lists only basses and swaps the panel; the Light / Dark
// toggle repaints; ▶ plays with no page errors; each intro page draws its panel, its tour steps set the state, its tracks list 3-5
// videos, the quiz answers.
// Run: node tests/lessons/bass-compare.cdp.js   (NEG=1 must fail; SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8592;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/bass-compare.html`); await b.sleep(1500);
  await b.eval(`window.__err = []; addEventListener('error', e => __err.push(String(e.message)));`);
  check("two panels drawn", await b.eval(`document.querySelectorAll('.bsc .gtp-face svg.fp-svg').length`) === 2);
  check("left is the P-Bass, right the Jazz", await b.eval(`(() => { const g = document.querySelector('.bsc')._gtc; return g.a.id + ',' + g.b.id; })()`) === "pbass,jbass");
  check("the menu lists only basses", await b.eval(`[...document.querySelector('.bsc .gtp-pick').options].map(o => o.value).join()`) === "pbass,jbass,jbass70,stingray,stingray3,ric4003");
  const pic0 = await b.eval(`document.querySelector('.gtc-b .gtp-info').textContent`), v0 = await b.eval(`document.querySelector('.bsc')._gtc.b.st.vol2`);
  await b.eval(`(() => { const g = document.querySelector('.gtc-b [data-ctl=vol2]'); g.scrollIntoView({block:'center'}); const r = g.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (t, Y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: Y, pointerId: 1, button: 0 })); ev('pointerdown', y); ev('pointermove', y + 80); ev('pointerup', y + 80); })()`);
  check("dragging the Jazz bridge volume lowers it", (await b.eval(`document.querySelector('.bsc')._gtc.b.st.vol2`)) < v0);
  check("the readout follows", (await b.eval(`document.querySelector('.gtc-b .gtp-info').textContent`)) !== pic0);
  await b.eval(`document.querySelector('.bsc .gtc-go').click()`);
  const q = await b.eval(`document.querySelector('.bsc').dataset.quality`);
  check("Translate reports a quality", /^(exact|approx|lost)$/.test(q || ""), q);
  check("Translate lists what is lost (split coil)", await b.eval(`[...document.querySelectorAll('.gtc-res li')].some(l => /split-coil/.test(l.textContent))`));
  await b.eval(`(() => { const s = document.querySelector('.gtc-b .gtp-pick'); s.value = 'stingray3'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(600);
  check("the bass menu swaps the panel", await b.eval(`!!document.querySelector('.gtc-b [data-ctl=mid]') && document.querySelector('.bsc')._gtc.b.id === 'stingray3'`));
  const t0 = await b.eval(`document.querySelector('.gtc-a .fp-w').dataset.theme`);
  await b.eval(`document.querySelector('.gtc-a .fp-theme').click()`);
  check("Light / Dark toggle repaints both panels", await b.eval(`[...document.querySelectorAll('.bsc .fp-w')].every(w => w.dataset.theme !== '${t0}')`));
  await b.eval(`document.querySelector('.gtc-a .fp-theme').click()`);
  await b.eval(`document.querySelector('.gtc-a .gtp-play[data-play=riff]').click()`); await b.sleep(800);
  check("▶ plays: an AudioContext running", await b.eval(`GuitarPickups.ctx().state`) === "running");
  check("no page errors", (await b.eval(`__err.length`)) === 0, await b.eval(`__err.join(' | ')`));
  await b.eval(`GuitarPickups.stop()`);
  for (const [slug, id] of [["p-bass", "pbass"], ["jazz-bass", "jbass"], ["stingray", "stingray"], ["rickenbacker-bass", "ric4003"]]) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1500);
    check(`${slug}: panel drawn`, await b.eval(`!!document.querySelector('.bsp svg.fp-svg') && GuitarPickups.widgets[0].id === '${id}'`));
    const n = await b.eval(`document.querySelectorAll('.bs-hear').length`);
    check(`${slug}: tour steps have ▶ buttons`, n >= 3, n);
    await b.eval(`document.querySelectorAll('.bs-hear')[1].click()`); await b.sleep(200);
    check(`${slug}: a step sets its state`, await b.eval(`(() => { const s = JSON.parse(document.querySelectorAll('.bs-step')[1].dataset.set), st = GuitarPickups.widgets[0].st; return Object.keys(s).every(k => st[k] === s[k]); })()`));
    await b.eval(`GuitarPickups.stop()`);
    const tn = await b.eval(`document.querySelectorAll('.bs-tracks li').length`);
    check(`${slug}: 3-5 tracks listed`, tn >= 3 && tn <= 5, tn);
    await b.eval(`(() => { const q = document.querySelector('.bs-q'); q.querySelectorAll('li')[+q.dataset.a].click(); })()`);
    check(`${slug}: quiz marks the right answer`, await b.eval(`!!document.querySelector('.bs-q li.gt-right') && !document.querySelector('.bs-q .gt-why').hidden`));
  }
  console.log(fails ? fails + " failed" : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
