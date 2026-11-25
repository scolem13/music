// Classic Sequencers Compared in a browser (lessons/sequencer-compare.qmd): the widget builds, every example loads and reports,
// each machine's own entry works (303 keys, MC-4 keypad, Elektron trigs and p-locks), playback sounds through the worklet and
// Stop silences it, export / import round-trips, the assignments list draws, the pictures draw.
// Run after rendering the page: node tests/lessons/sequencer-compare.cdp.js   (SHOT=file.png saves a screenshot; NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8549);
const LEVEL = ms => `new Promise(res => { const a = SequencerCompare.widgets[0].analyser(); const d = new Float32Array(2048); let m = 0;
  const iv = setInterval(() => { a.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }, 30); setTimeout(() => { clearInterval(iv); res(m); }, ${ms}); })`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto("http://127.0.0.1:8549/lessons/sequencer-compare.html"); await b.sleep(1000);
  check("one widget, two panels", await b.eval(`SequencerCompare.widgets.length === 1 && document.querySelectorAll('.sqc-panel').length === 2`));
  const exs = await b.eval(`SequencerCompare.EXAMPLES.map(e => e.id)`); let bad = [];
  for (const id of exs) { const n = await b.eval(`(SequencerCompare.widgets[0].load('${id}'), document.querySelectorAll('.sqc-item').length)`); if (n < 3) bad.push(id + ":" + n); }
  check("every example loads with a report", bad.length === 0, bad.join(","));
  await b.eval(`SequencerCompare.widgets[0].load('acid')`);
  check("acid → 960: slide control marked lost on the 303", await b.eval(`!!document.querySelector('.sqc-src [data-ctl=sl].sqc-lost')`));
  check("960 panel has 24 knobs", await b.eval(`document.querySelectorAll('.sqc-dst .sqc-knob').length >= 24`));
  // 303 entry: pitch mode key writes the first pitch
  await b.eval(`[...document.querySelectorAll('.sqc-src .sqc-keys button')][7].click()`);
  check("303 key G writes pitch 1", await b.eval(`SequencerCompare.widgets[0].data.tb303.pitch[0].k === 7`));
  await b.eval(`[...document.querySelectorAll('.sqc-item')].find(i => /Slides/.test(i.textContent)).dispatchEvent(new Event('mouseenter'))`);
  check("pointing at a line lights its control", await b.eval(`!!document.querySelector('.sqc-src [data-ctl=sl].sqc-hl')`));
  // MC-4 keypad
  await b.eval(`SequencerCompare.widgets[0].load('trip')`);
  await b.eval(`(() => { const p = [...document.querySelectorAll('.sqc-src .sqc-pad button')]; const k = t => p.find(x => x.textContent === t).click(); k('3'); k('0'); k('ENTER'); })()`);
  check("MC-4 keypad types CV-1 30 into step 1", await b.eval(`SequencerCompare.widgets[0].data.mc4.ch[0][0].cv1 === 30`));
  // Elektron: trig on, select, p-lock
  await b.eval(`SequencerCompare.widgets[0].load('plocks')`);
  check("lock trigs drawn yellow", await b.eval(`document.querySelectorAll('.sqc-src .sqc-trig.sqc-lock').length === 2`));
  await b.eval(`document.querySelectorAll('.sqc-src .sqc-trig')[1].click()`);
  check("clicking an empty step adds a note trig", await b.eval(`SequencerCompare.widgets[0].data.elektron.trigs[1].type === 'n'`));
  check("translation sees the new trig", await b.eval(`SequencerCompare.toEvents('mc202', SequencerCompare.widgets[0].data.mc202).some(e => Math.abs(e.t - 0.25) < 0.05)`));
  // sound
  await b.eval(`SequencerCompare.widgets[0].load('acid')`);
  await b.eval(`SequencerCompare.widgets[0].play('src')`); await b.sleep(300);
  let lv = await b.eval(LEVEL(1200)); check("TB-303 line sounds", lv > 0.01, lv.toFixed(3));
  await b.eval(`SequencerCompare.widgets[0].stop()`); await b.sleep(400);
  lv = await b.eval(LEVEL(300)); check("Stop silences", lv < 0.01, lv.toFixed(4));
  await b.eval(`SequencerCompare.widgets[0].play('dst')`); await b.sleep(300);
  lv = await b.eval(LEVEL(1000)); check("960 line sounds", lv > 0.01, lv.toFixed(3)); await b.eval(`SequencerCompare.widgets[0].stop()`);
  // export / import
  const same = await b.eval(`(() => { const W = SequencerCompare.widgets[0]; W.load('duet'); const o = W.exportJSON(); const before = JSON.stringify(SequencerCompare.toEvents('mc202', W.data.mc202));
    W.load('acid'); W.importJSON(JSON.parse(JSON.stringify(o))); return W.src === 'mc202' && JSON.stringify(SequencerCompare.toEvents('mc202', W.data.mc202)) === before; })()`);
  check("export then import restores the line", same);
  await b.sleep(300);
  check("assignments listed (5 machines)", await b.eval(`document.querySelectorAll('.sqc-alist').length === 5`));
  check("pictures drawn", await b.eval(`document.querySelectorAll('.sqc-roll rect').length > 4 && !!document.querySelector('.sqc-grid') && document.querySelectorAll('.sqc-lanes').length === 2`));
  check("sections fold (sections.js)", await b.eval(`document.querySelectorAll('section.ls-sec').length >= 8`));
  await b.resize(390, 800); await b.sleep(300);
  check("no horizontal page scroll at phone width", await b.eval(`document.documentElement.scrollWidth <= 392`), await b.eval(`document.documentElement.scrollWidth`));
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  if (process.env.SHOT) { await b.resize(1300, 1000); await b.eval(`SequencerCompare.widgets[0].load('plocks'); window.scrollTo(0, document.querySelector('.sqc').getBoundingClientRect().top + scrollY - 60)`); await b.sleep(600); await b.shot(process.env.SHOT); }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
