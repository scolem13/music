// Guitar Tuning (tools/guitar-tuning.qmd) and the Setup Check (tools/guitar-setup-check.qmd), headless. A sine stands in for the
// microphone (window.TEST_MIC_SOURCE). Run after rendering both pages:
//   quarto render tools/guitar-tuning.qmd; quarto render tools/guitar-setup-check.qmd; node tests/lessons/guitar-tuning.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8527);
const SEED = `sessionStorage.setItem('audio-check-v1', JSON.stringify({ browserOk: true, output: 'headphones', latencyMs: null, bleedDb: null, peakDb: -12, level: 'ok', constraints: {} }));
  window.TEST_MIC_SOURCE = c => { const o = c.createOscillator(), g = c.createGain(); g.gain.value = .3; o.connect(g); o.start(); window.__osc = o; return g; };`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = [];
  await b.goto("http://127.0.0.1:8527/tools/guitar-tuning.html"); await ev(`localStorage.removeItem('gtune-v1')`);
  await b.goto("http://127.0.0.1:8527/tools/guitar-tuning.html"); await b.sleep(300); await ev(SEED);
  const m = await ev(`document.querySelectorAll('.gt-method').length + ' ' + document.querySelectorAll('.gt-sbtn').length + ' ' + document.querySelectorAll('#gt-board .gt-mk').length`);
  check("6 methods, 6 string steps, marks on the board", m === "6 6 1", m);
  await ev(`document.querySelectorAll('.gt-method')[3].click()`);   // harmonics
  const h = await ev(`GuitarTuning.steps().map(s => s.model.map(x => x.join(':')).join('+')).join(' ') + '|' + document.querySelectorAll('#gt-board .gt-mk-h').length`);
  check("harmonics: B and high E from unison harmonics", h === "0:12:1 0:5:1+1:7:1 1:5:1+2:7:1 2:5:1+3:7:1 0:7:1+4:0 4:5:1+5:7:1|1", h);
  await ev(`document.getElementById('gt-tuning').value = 'custom'; document.getElementById('gt-tuning').dispatchEvent(new Event('change'));
    document.getElementById('gt-custom-in').value = 'C G C G C E'; document.getElementById('gt-custom-go').click()`);
  const c = await ev(`document.getElementById('gt-custom-in').value + '|' + document.querySelector('.gt-sbtn').textContent`);
  check("custom tuning parsed near standard", c === "C2 G2 C3 G3 C4 E4|6 C", c);
  await ev(`document.getElementById('gt-tuning').value = 'standard'; document.getElementById('gt-tuning').dispatchEvent(new Event('change')); document.querySelectorAll('.gt-method')[5].click()`);
  await ev(`document.getElementById('gt-listen').click()`); await b.sleep(400);
  await ev(`__osc.frequency.value = 82.407 * Math.pow(2, 20 / 1200)`); await b.sleep(600);
  const hid = await ev(`document.getElementById('gt-read').classList.contains('gt-hidden')`);
  check("ear first: reading hidden before the guess", hid === true);
  await ev(`document.querySelector('[data-g=sharp]').click()`); await b.sleep(200);
  const g = await ev(`document.getElementById('gt-msg').textContent + '|' + document.getElementById('gt-r-cents').textContent`);
  check("guess sharp at +20 cents: right, reading shown", /^Your ear was right: sharp/.test(g) && /\+2\d ¢/.test(g), g);

  await b.goto("http://127.0.0.1:8527/tools/guitar-setup-check.html"); await ev(`localStorage.removeItem('setup-check-v1')`);
  await b.goto("http://127.0.0.1:8527/tools/guitar-setup-check.html"); await b.sleep(300); await ev(SEED);
  await ev(`(() => { const r = document.getElementById('sc-relief'); r.value = 'none'; r.dispatchEvent(new Event('change'));
    document.querySelectorAll('#sc-buzz input')[1].click(); document.querySelectorAll('#sc-buzz input')[6].click(); document.querySelectorAll('#sc-buzz input')[11].click(); })()`);
  let rep = await ev(`document.getElementById('sc-report').textContent`);
  check("no relief + low-fret buzz: teacher loosens the truss rod", /Teacher Neck relief.*Loosen/.test(rep), rep.slice(0, 120));
  await ev(`document.querySelectorAll('#sc-into button')[0].click()`); await b.sleep(150); await ev(`__osc.frequency.value = 329.63`); await b.sleep(2200);
  await ev(`__osc.frequency.value = 329.63 * Math.pow(2, 12 / 1200); document.querySelectorAll('#sc-into button')[1].click()`); await b.sleep(2200);
  rep = await ev(`document.getElementById('sc-into').textContent + '|' + document.getElementById('sc-report').textContent`);
  check("fretted 12 cents sharp: saddle back", /\+1[12]\.\d cents/.test(rep) && /sharp 1[12] cents → move its saddle back/.test(rep), rep.slice(0, 200));
  await ev(`document.getElementById('sc-inst').value = 'bass4'; document.getElementById('sc-inst').dispatchEvent(new Event('change'))`);
  const bs = await ev(`document.querySelectorAll('#sc-into .sc-irow').length + ' ' + document.querySelectorAll('#sc-buzz tr').length`);
  check("bass: 4 strings", bs === "4 5", bs);
  console.log(fails ? fails + " failed" : "all ok"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
