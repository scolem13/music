// The Model D patch sheets on lessons/synth-compare.html: every sheet draws, dragging a knob changes its value and aria-label,
// a switch toggles, one-part-at-a-time mode, the print view, ▶ Play sounds on the Model D panel, Save gives JSON with the notes.
// Run after rendering: node tests/lessons/moog-sheet.cdp.js   (SHOT=file.png saves a screenshot; NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8548);
const LEVEL = ms => `new Promise(res => { const a = SynthCompare.widgets[0].analyser('moog'); const d = new Float32Array(2048); let m = 0;
  const iv = setInterval(() => { a.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }, 30); setTimeout(() => { clearInterval(iv); res(m); }, ${ms}); })`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto("http://127.0.0.1:8548/lessons/synth-compare.html"); await b.sleep(800);
  await b.eval(`MoogSheet.ready`);
  const W = `document.querySelector('.moog-sheets')`;
  check("the sheets widget mounts with its picker", await b.eval(`${W}.querySelectorAll('.ms-pick option').length`) === 45);
  const r = await b.eval(`(() => { const sel = ${W}.querySelector('.ms-pick'), bad = []; for (let i = 0; i < sel.options.length; i++) { sel.value = i; sel.dispatchEvent(new Event('change'));
    const svg = ${W}.querySelector('svg.ms-svg'), n = svg.querySelectorAll('.ms-ctl').length, e = MoogSheet.current;
    const want = Object.values(e.sheet).filter(v => v !== null).length; if (n !== 49 || (!e.blank && !svg.textContent.includes(e.name))) bad.push(i + ':' + n); }
    sel.value = 0; sel.dispatchEvent(new Event('change')); return bad; })()`);
  check("every sheet draws 49 controls and its name", r.length === 0, r.join(" "));
  check("orange pointers drawn", await b.eval(`${W}.querySelectorAll('.ms-pointer').length`) > 15);
  // drag the cutoff knob up
  const before = await b.eval(`${W}.querySelector('[data-ctl=cutoff]').getAttribute('aria-label')`);
  await b.eval(`(() => { const g = ${W}.querySelector('[data-ctl=cutoff]'), r = g.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (t, yy) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: yy, pointerId: 1 }));
    ev('pointerdown', y); ev('pointermove', y - 20); ev('pointermove', y - 40); ev('pointerup', y - 40); })()`);
  const after = await b.eval(`${W}.querySelector('[data-ctl=cutoff]').getAttribute('aria-label')`);
  check("a drag changes the knob's value and aria-label", before !== after && /Cutoff frequency: /.test(after), before + " -> " + after);
  check("the change reaches the sheet", await b.eval(`MoogSheet.current.sheet.cutoff`) > -4);
  await b.eval(`${W}.querySelector('[data-ctl=lA]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))`);
  check("arrow key steps a time knob along its printed scale", /ms|s\)/.test(await b.eval(`${W}.querySelector('[data-ctl=lA]').getAttribute('aria-label')`)));
  const sw0 = await b.eval(`MoogSheet.current.sheet.oscMod`); await b.eval(`${W}.querySelector('[data-ctl=oscMod]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  check("a click flips a switch", (await b.eval(`MoogSheet.current.sheet.oscMod`)) !== sw0);
  check("controls are keyboard focusable with titles", await b.eval(`[...${W}.querySelectorAll('.ms-ctl')].every(g => g.getAttribute('tabindex') === '0' && g.querySelector('title') && g.getAttribute('aria-label'))`));
  // one part at a time
  await b.eval(`(() => { const c = ${W}.querySelector('.ms-one'); c.checked = true; c.dispatchEvent(new Event('change')); })()`);
  check("section mode shows one part", await b.eval(`${W}.querySelector('svg').getAttribute('data-section')`) === "controllers");
  await b.eval(`${W}.querySelector('.ms-next').click()`);
  check("Next moves to the oscillator bank", await b.eval(`${W}.querySelector('svg').getAttribute('data-section') + '|' + ${W}.querySelector('.ms-secname').textContent`) === "osc|2 of 7: Oscillator bank");
  await b.eval(`${W}.querySelector('.ms-back').click()`);
  check("Back returns", await b.eval(`${W}.querySelector('svg').getAttribute('data-section')`) === "controllers");
  await b.eval(`(() => { const c = ${W}.querySelector('.ms-one'); c.checked = false; c.dispatchEvent(new Event('change')); })()`);
  // print view
  await b.eval(`window.__printed = 0; window.print = () => { window.__printed++; }; ${W}.querySelector('.ms-print').click()`);
  check("print: the sheet alone, printing class set", await b.eval(`window.__printed === 1 && document.documentElement.classList.contains('ms-printing') && !!document.querySelector('body > .ms-print-sheet svg .ms-pointer')`));
  await b.eval(`window.dispatchEvent(new Event('afterprint')); ${W}.querySelector('.ms-printblank').click()`);
  check("print a blank sheet", await b.eval(`window.__printed === 2 && document.querySelectorAll('body > .ms-print-sheet').length === 1 && !document.querySelector('.ms-print-sheet .ms-pointer')`));
  await b.eval(`window.dispatchEvent(new Event('afterprint'))`);
  // save with notes
  await b.eval(`(() => { const t = ${W}.querySelector('.ms-notes'); t.value = 'My note'; t.dispatchEvent(new Event('input')); ${W}.querySelector('.ms-save').click(); })()`);
  check("Save gives JSON with the notes", await b.eval(`JSON.parse(MoogSheet.lastSaved).notes === 'My note' && !!JSON.parse(MoogSheet.lastSaved).sheet`));
  // play on the Model D above
  await b.eval(`${W}.querySelector('.ms-play').click()`); await b.sleep(500);
  const lv = await b.eval(LEVEL(1200)); check("▶ Play sounds on the Model D panel", lv > 0.01, lv.toFixed(3));
  check("the panel above holds the sheet's settings", await b.eval(`(() => { const st = MoogSheet.toState(MoogSheet.current.sheet), m = SynthCompare.widgets[0].st.moog; return m.o1Range === st.o1Range && Math.abs(m.cutoff - st.cutoff) < 0.11; })()`));
  await b.eval(`SynthCompare.widgets[0].stop()`);
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase notice aside)", errs.length === 0, errs.slice(0, 2).join(" | "));
  if (process.env.SHOT) { await b.eval(`${W}.scrollIntoView()`); await b.sleep(500); await b.shot(process.env.SHOT, false); }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
