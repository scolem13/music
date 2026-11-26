// The pedal pages in a browser (after rendering lessons/pedal-compare.qmd and the eight intro-<pedal>.qmd): both faces drawn from
// FaithfulPanel layouts pd-*; dragging a knob changes the state; the footswitch bypasses and the LED follows; Translate reports
// exact / approx / lost with notes; the pedal menu swaps the face; Light / Dark repaints; ▶ plays with no page errors; the
// pedalboard draws its chain, ← / → and drag-and-drop reorder it, Translate to swaps a pedal in place; each intro page draws its face,
// its tour steps set the state, its tracks list 3-4 videos, the quiz answers.
// Run: node tests/lessons/pedal-compare.cdp.js   (NEG=1 must fail; SITE=<dir> for a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8593;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/pedal-compare.html`); await b.sleep(2000);
  await b.eval(`window.__err = []; addEventListener('error', e => __err.push(String(e.message)));`);
  check("two faces drawn", await b.eval(`document.querySelectorAll('.pdc .pdp-face svg.fp-svg').length`) === 2);
  check("left Fuzz Face, right Big Muff", await b.eval(`(() => { const g = document.querySelector('.pdc')._pdc; return g.a.id + ',' + g.b.id; })()`) === "fuzzface,bigmuff");
  const f0 = await b.eval(`document.querySelector('.pdc')._pdc.a.st.fuzz`);
  await b.eval(`(() => { const g = document.querySelector('.pdc-a [data-ctl=fuzz]'); g.scrollIntoView({block:'center'}); const r = g.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (t, Y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: Y, pointerId: 1, button: 0 })); ev('pointerdown', y); ev('pointermove', y + 80); ev('pointerup', y + 80); })()`);
  check("dragging Fuzz lowers it", (await b.eval(`document.querySelector('.pdc')._pdc.a.st.fuzz`)) < f0);
  await b.eval(`document.querySelector('.pdc-a [data-ctl=on]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  check("footswitch bypasses", await b.eval(`document.querySelector('.pdc')._pdc.a.st.on`) === false);
  await b.eval(`document.querySelector('.pdc-a [data-ctl=on]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  await b.eval(`document.querySelector('.pdc-go').click()`);
  const q = await b.eval(`document.querySelector('.pdc').dataset.quality`);
  check("Translate reports a quality", /^(exact|approx|lost)$/.test(q || ""), q);
  check("Translate lists notes", await b.eval(`document.querySelectorAll('.pdc-res li').length`) > 0);
  await b.eval(`(() => { const s = document.querySelector('.pdc-b .pdp-pick'); s.value = 'dm2'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(700);
  check("the pedal menu swaps the face", await b.eval(`!!document.querySelector('.pdc-b [data-ctl=intensity]')`));
  const t0 = await b.eval(`document.querySelector('.pdc-a .fp-w').dataset.theme`);
  await b.eval(`document.querySelector('.pdc-a .fp-theme').click()`);
  check("Light / Dark repaints", await b.eval(`[...document.querySelectorAll('.pdc .fp-w')].every(w => w.dataset.theme !== '${t0}')`));
  await b.eval(`document.querySelector('.pdc-a .fp-theme').click()`);
  await b.eval(`document.querySelector('.pdc-a .pdp-play[data-play=pluck]').click()`); await b.sleep(800);
  check("▶ plays: AudioContext running, waveform drawn", await b.eval(`Pedals.ctx().state === 'running' && !!document.querySelector('.pdc-a .pdp-plot svg')`));
  await b.eval(`Pedals.stop()`);
  // pedalboard
  check("pedalboard: four cards", await b.eval(`document.querySelector('.pdb').dataset.order`) === "crybaby,fuzzface,phase90,dm2");
  await b.eval(`document.querySelectorAll('.pdb-card')[0].querySelectorAll('.pdb-mv')[1].click()`); await b.sleep(300);
  check("→ moves the wah after the fuzz", await b.eval(`document.querySelector('.pdb').dataset.order`) === "fuzzface,crybaby,phase90,dm2");
  await b.eval(`(() => { const c = document.querySelectorAll('.pdb-card'), dt = new DataTransfer(); c[3].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt })); c[0].dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt })); })()`); await b.sleep(300);
  check("drag and drop moves the delay first", await b.eval(`document.querySelector('.pdb').dataset.order`) === "dm2,fuzzface,crybaby,phase90");
  await b.eval(`(() => { const s = document.querySelectorAll('.pdb-card')[1].querySelector('.pdb-swap select'); s.value = 'bigmuff'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(500);
  check("Translate to swaps the Fuzz Face for a Big Muff, reported", await b.eval(`document.querySelector('.pdb').dataset.order === 'dm2,bigmuff,crybaby,phase90' && document.querySelectorAll('.pdb-res li').length > 0`));
  check("board faces drawn", await b.eval(`document.querySelectorAll('.pdb .pdb-face svg.fp-svg').length`) === 4);
  await b.eval(`document.querySelector('.pdb .pdp-play[data-play=riff]').click()`); await b.sleep(600); await b.eval(`Pedals.stop()`);
  check("no page errors", (await b.eval(`__err.length`)) === 0, await b.eval(`__err.join(' | ')`));
  for (const [slug, id] of [["fuzz-face", "fuzzface"], ["big-muff", "bigmuff"], ["tube-screamer", "ts808"], ["cry-baby", "crybaby"], ["phase-90", "phase90"], ["ce-2", "ce2"], ["dm-2", "dm2"], ["echoplex", "echoplex"]]) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1500);
    check(`${slug}: face drawn`, await b.eval(`!!document.querySelector('.pdp svg.fp-svg') && Pedals.widgets[0].id === '${id}'`));
    check(`${slug}: tour steps have ▶ buttons`, await b.eval(`document.querySelectorAll('.pd-hear').length`) >= 3);
    await b.eval(`document.querySelectorAll('.pd-hear')[1].click()`); await b.sleep(300);
    check(`${slug}: a step sets its state`, await b.eval(`(() => { const s = JSON.parse(document.querySelectorAll('.pd-step')[1].dataset.set), st = Pedals.widgets[0].st; return Object.keys(s).every(k => k === 'gvol' ? Pedals.prefs.gvol === s[k] : st[k] === s[k]); })()`));
    await b.eval(`Pedals.stop()`);
    const tn = await b.eval(`document.querySelectorAll('.pd-tracks li').length`); check(`${slug}: 3-4 tracks listed`, tn >= 3 && tn <= 4, tn);
    await b.eval(`(() => { const q = document.querySelector('.pd-q'); q.querySelectorAll('li')[+q.dataset.a].click(); })()`);
    check(`${slug}: quiz marks the right answer`, await b.eval(`!!document.querySelector('.pd-q li.pd-right')`));
  }
  console.log(fails ? fails + " failed" : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
