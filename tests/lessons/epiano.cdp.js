// Electric pianos in a browser (lessons/epiano-compare.html and the intro pages, after rendering): the widget mounts with its
// faithful panel (Panel view by default, Simple one click away), every model's panel loads and draws live controls, a key press
// and the riff make sound (analyser level), dragging a panel knob changes the state, a switch toggles, Turn into it reports
// exact / approx / lost lines, the tour steps on each intro page play, the theme toggle flips.
// Run after rendering: node tests/lessons/epiano.cdp.js   (NEG=1 must fail; SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8591;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const level = ms => b.eval(`new Promise(r => { const a = EPiano.widgets[0].analyser(), buf = new Float32Array(a.fftSize); let m = 0;
    const iv = setInterval(() => { a.getFloatTimeDomainData(buf); for (const v of buf) m = Math.max(m, Math.abs(v)); }, 20); setTimeout(() => { clearInterval(iv); r(m); }, ${ms}); })`);
  try {
    await b.resize(1300, 1000);
    await b.goto(`http://127.0.0.1:${PORT}/lessons/epiano-compare.html`); await b.sleep(900);
    await b.eval(`localStorage.removeItem('machine-face-view'); localStorage.removeItem('panel-theme')`); await b.goto(`http://127.0.0.1:${PORT}/lessons/epiano-compare.html`); await b.sleep(1200);
    check("widget mounted", await b.eval(`EPiano.widgets.length === 1 && !!document.querySelector('.epc .epc-keys .epc-k')`));
    check("Panel view by default, simple controls hidden", await b.eval(`(() => { const f = document.querySelector('.epc-face'); return f.classList.contains('fp-panelview') && !!f.querySelector('svg.fp-svg') && getComputedStyle(f.querySelector('.epc-simple')).display === 'none'; })()`));
    for (const id of ["rhodes", "suitcase", "wurli", "clav", "cp70", "pianet"]) {
      await b.eval(`EPiano.widgets[0].setModel('${id}')`); await b.sleep(400);
      const n = await b.eval(`(EPiano.widgets[0].face && EPiano.widgets[0].face.ready || Promise.resolve()).then(() => document.querySelectorAll('.epc-face .fp-face:not([hidden]) [data-ctl]:not(.fp-off)').length)`);
      check(`${id}: panel draws live controls`, n >= 2, n);
    }
    await b.eval(`EPiano.widgets[0].setModel('rhodes')`); await b.sleep(300);
    // a key and a riff make sound
    await b.eval(`EPiano.widgets[0].noteOn(60, 0.8)`); check("a key sounds", (await level(500)) > 0.02); await b.eval(`EPiano.widgets[0].noteOff(60)`);
    for (const id of ["rhodes", "clav", "cp70"]) check(`${id}: the band's soundfont samples load and make the note`, await b.eval(`(() => { const W = EPiano.widgets[0]; return EPiano.loadSamples('${id}', W.audio()).then(ok => { const y = ok && EPiano.renderSampled('${id}', EPiano.defaults('${id}'), 60, 0.7, W.ctx.sampleRate); let p = 0; if (y) for (const v of y) p = Math.max(p, Math.abs(v)); return ok && p > 0.05; }); })()`));
    check("Sound: samples / model toggle", await b.eval(`(() => { const t = document.querySelector('.epc-src'); t.click(); const off = !EPiano.SAMPLED && /model/.test(t.textContent); t.click(); return off && EPiano.SAMPLED; })()`));
    await b.eval(`void EPiano.widgets[0].phrase('ballad')`); check("the riff sounds", (await level(900)) > 0.02); await b.eval(`EPiano.widgets[0].stop()`);
    // drag Volume down
    const v0 = await b.eval(`EPiano.widgets[0].st.vol`);
    await b.eval(`(() => { const g = document.querySelector('.epc-face .fp-face:not([hidden]) [data-ctl=vol]'); g.scrollIntoView({block:'center'}); const q = g.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
      const ev = (t, X, Y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: X, clientY: Y, pointerId: 1, button: 0 })); ev('pointerdown', x, y); ev('pointermove', x, y + 120); ev('pointerup', x, y + 120); })()`);
    check("dragging Volume lowers it", (await b.eval(`EPiano.widgets[0].st.vol`)) < v0);
    // clavinet switch
    await b.eval(`EPiano.widgets[0].setModel('clav')`); await b.sleep(400);
    const s0 = await b.eval(`EPiano.widgets[0].st.soft`);
    await b.eval(`EPiano.widgets[0].face.ready.then(() => document.querySelector('.epc-face .fp-face:not([hidden]) [data-ctl=soft]').dispatchEvent(new MouseEvent('click', { bubbles: true })))`);
    check("clicking the Soft tab toggles it", (await b.eval(`EPiano.widgets[0].st.soft`)) !== s0);
    // translate
    await b.eval(`(() => { const tr = document.querySelector('.epc-tr'); tr.querySelector('select').value = 'rhodes'; tr.querySelector('button').click(); })()`);
    check("Turn into: model changed, report with lost pickups", await b.eval(`EPiano.widgets[0].id === 'rhodes' && [...document.querySelectorAll('.epc-rep li[data-kind=lost]')].some(l => /pickup/i.test(l.textContent)) && !!document.querySelector('.epc-rep li[data-kind=approx]')`));
    // theme toggle
    const t0 = await b.eval(`document.querySelector('.epc-face .fp-face:not([hidden]) .fp-w').dataset.theme`); await b.eval(`document.querySelector('.epc-face .fp-face:not([hidden]) .fp-theme').click()`);
    check("theme toggle flips", (await b.eval(`document.querySelector('.epc-face .fp-face:not([hidden]) .fp-w').dataset.theme`)) !== t0);
    // intro pages: step 1 plays
    for (const slug of ["rhodes", "wurlitzer", "clavinet", "cp70", "pianet"]) {
      await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1100);
      const ok = await b.eval(`!!document.querySelector('.ik-step .ik-play') && !!window.IntroKit`).catch(() => false);
      if (!ok) { check(`intro-${slug}: steps ready`, false); continue; }
      await b.eval(`document.querySelectorAll('.ik-step .ik-play')[1].click()`); const lv = await level(900);
      check(`intro-${slug}: step 2 plays and sets the model`, lv > 0.02 && (await b.eval(`EPiano.widgets[0].id`)) === JSON.parse(await b.eval(`document.querySelectorAll('.ik-step')[1].dataset.set`)).model, lv.toFixed(3));
      check(`intro-${slug}: quiz and track links`, await b.eval(`document.querySelectorAll('.ik-q').length >= 3 && document.querySelectorAll('a[href*="youtube.com/watch"]').length >= 2`));
      await b.eval(`EPiano.widgets[0].stop()`);
    }
  } catch (e) { check("no exception", false, e.message); }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
