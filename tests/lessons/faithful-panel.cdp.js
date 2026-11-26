// FaithfulPanel (apps/shared/lessons/faithful-panel.js + panels/<id>.js) in a browser, on the compare page and the intro pages:
// every layout's bound keys exist in its SynthCompare profile; every listed layout loads; the Panel view is the default on
// intro-vital / intro-surge-xt (Simple still one click away); dragging a knob / slider changes the widget's state (so the engine);
// keyboard steps move it; an inert control is dimmed with a "not modelled" tooltip; the Light / Dark toggle repaints and persists
// across a reload in localStorage `panel-theme`; a tab button switches pages.
// Run after rendering: node tests/lessons/faithful-panel.cdp.js   (NEG=1 must fail; SHOT=prefix saves screenshots)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8573;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/synth-compare.html`); await b.sleep(900);
  await b.eval(`localStorage.removeItem('panel-theme'); localStorage.removeItem('synth-face-view')`);
  const ids = await b.eval(`FaithfulPanel.AVAILABLE`);
  const r = await b.eval(`Promise.all(FaithfulPanel.AVAILABLE.map(id => FaithfulPanel.load(id).then(L => [id, FaithfulPanel.check(L, SynthCompare.PROFILES[id]), FaithfulPanel.bound(L).length]).catch(e => [id, ['load failed'], 0])))`);
  for (const [id, miss, n] of r) check(`${id}: every bound key is in the profile (${n} bound)`, miss.length === 0 && n >= 8, miss.join(","));
  // every layout mounts on its own and draws its live controls (the hardware layouts too: prophet, tb303, juno, arp2600, obxa, ms20, dx7)
  for (const id of ids) {
    const m = await b.eval(`(() => { try { const h = document.createElement('div'); document.body.appendChild(h); const P = SynthCompare.PROFILES['${id}'], st = Object.assign({}, P.def);
      const M = FaithfulPanel.mount(h, { id: '${id}', profile: P, get: k => st[k], set: (k, v) => { st[k] = v; M.refresh(); } }); h.appendChild(M.el);
      const live = M.el.querySelectorAll('[data-ctl]:not(.fp-off)').length; h.remove(); return live; } catch (e) { return 'ERR ' + e; } })()`);
    if (!(await b.eval(`!!FaithfulPanel.LAYOUTS["${id}"]`))) continue;   // a layout that failed to load is reported above
    check(`${id}: mounts and draws its live controls`, typeof m === "number" && m >= 8, m);
  }

  for (const [slug, id, knobKey] of [["vital", "vital", "cut"], ["surge-xt", "surge", "cut"]]) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1200);
    const sel = `.scmp-${id} .scmp-face`;
    check(`${slug}: Panel view shown by default, Simple hidden`, await b.eval(`(() => { const f = document.querySelector('${sel}'); return !!f && !f.hidden && !!f.querySelector('svg.fp-svg') && document.querySelector('.scmp-${id} .scmp-groups').hidden; })()`));
    // drag the control down a long way: the value drops
    const before = await b.eval(`SynthCompare.widgets[0].st['${id}'].${knobKey}`);
    const box = await b.eval(`(() => { const g = document.querySelector('${sel} [data-ctl=${knobKey}]'); const r = g.getBoundingClientRect(); g.scrollIntoView({block:'center'}); const q = g.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2, q.width]; })()`);
    const horiz = await b.eval(`document.querySelector('${sel} [data-ctl=${knobKey}]').classList.contains('fp-h')`);
    await b.eval(`(() => { const g = document.querySelector('${sel} [data-ctl=${knobKey}]'), [x, y] = ${JSON.stringify(box)};
      const ev = (t, X, Y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: X, clientY: Y, pointerId: 1, button: 0 }));
      ev('pointerdown', x, y); ev('pointermove', x - (${horiz} ? 120 : 0), y + (${horiz} ? 0 : 120)); ev('pointerup', x, y); })()`);
    const after = await b.eval(`SynthCompare.widgets[0].st['${id}'].${knobKey}`);
    check(`${slug}: dragging ${knobKey} lowers it (engine state)`, after < before, before + " -> " + after);
    check(`${slug}: the engine patch follows`, await b.eval(`SynthCompare.engine('${id}', SynthCompare.widgets[0].st['${id}']).cut`) > 0);
    await b.eval(`(() => { const g = document.querySelector('${sel} [data-ctl=${knobKey}]'); g.focus(); g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); })()`);
    check(`${slug}: ArrowUp raises it`, await b.eval(`SynthCompare.widgets[0].st['${id}'].${knobKey}`) > after);
    check(`${slug}: aria value text set`, !!(await b.eval(`document.querySelector('${sel} [data-ctl=${knobKey}]').getAttribute('aria-valuetext')`)));
    check(`${slug}: inert controls dimmed, "not modelled"`, await b.eval(`(() => { const o = document.querySelectorAll('${sel} .fp-off'); return o.length > 5 && /not modelled/.test(o[0].querySelector('title').textContent); })()`));
    // a switch / select
    const tk = id === "vital" ? "o2On" : "play", tv = await b.eval(`SynthCompare.widgets[0].st['${id}'].${tk}`);
    await b.eval(`document.querySelector('${sel} [data-ctl=${tk}]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
    check(`${slug}: clicking ${tk} changes it`, (await b.eval(`SynthCompare.widgets[0].st['${id}'].${tk}`)) !== tv);
    // tab pages
    const tab = id === "vital" ? "fx" : "o2";
    await b.eval(`document.querySelector('${sel} [role=tab][aria-label="${id === "vital" ? "EFFECTS" : "2"} page"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
    check(`${slug}: tab shows page ${tab}`, await b.eval(`(() => { const s = document.querySelector('${sel}'); return [...s.querySelectorAll('[data-page]')].every(e => (e.dataset.page === '${tab}') === (e.style.display !== 'none')); })()`));
    // theme toggle
    const t0 = await b.eval(`document.querySelector('${sel} .fp-w').dataset.theme`);
    await b.eval(`document.querySelector('${sel} .fp-theme').click()`);
    const t1 = await b.eval(`document.querySelector('${sel} .fp-w').dataset.theme`);
    check(`${slug}: theme toggles`, t0 !== t1 && /^(light|dark)$/.test(t1), t0 + " -> " + t1);
    check(`${slug}: background is plain black or white`, await b.eval(`getComputedStyle(document.querySelector('${sel} .fp-w')).getPropertyValue('--fp-bg').trim()`) === (t1 === "dark" ? "#000000" : "#ffffff"));
    if (process.env.SHOT) { await b.eval(`document.querySelector('${sel}').scrollIntoView()`); await b.shot && await b.shot(process.env.SHOT + "-" + slug + ".png"); }
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1200);
    check(`${slug}: theme kept after reload (localStorage panel-theme)`, await b.eval(`document.querySelector('${sel} .fp-w').dataset.theme`) === t1);
    await b.eval(`[...document.querySelectorAll('.scmp-${id} .scmp-vw .sp-opt')].find(x => x.dataset.v === 'simple').click()`);
    check(`${slug}: Simple view switches to the grouped knobs`, await b.eval(`document.querySelector('${sel}').hidden && !document.querySelector('.scmp-${id} .scmp-groups').hidden`));
    await b.eval(`localStorage.removeItem('synth-face-view')`);
  }
  // a synth with no layout keeps the plain panel
  await b.goto(`http://127.0.0.1:${PORT}/lessons/synth-compare.html`); await b.sleep(900);
  check("Model D on the compare page: the faithful panel (MoogSheet's layout), Simple one click away", await b.eval(`!!document.querySelector('.scmp-moog .scmp-face svg.fp-svg') && !!document.querySelector('.scmp-moog .scmp-vw')`));
  console.log(fails ? `${fails} FAILED` : "all passed");
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
