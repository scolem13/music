// Guitar Input Check (tools/guitar-in.qmd), headless. Synthetic plucked strums stand in for the microphone (window.TEST_MIC_SOURCE).
//   sh scripts/render-test-page.sh tools/guitar-in.qmd && node tests/guitar-in/guitar-in.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split(/[?#]/)[0]); let f = path.join(SITE, p);
  if (!fs.existsSync(f)) f = path.join(ROOT, p);   // apps/shared from the working copy
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8531);
const SEED = `sessionStorage.setItem('audio-check-v1', JSON.stringify({ browserOk: true, output: 'headphones', latencyMs: null, bleedDb: null, peakDb: -12, level: 'ok', constraints: {} }));
  window.TEST_MIC_SOURCE = c => { const g = c.createGain(); window.__strum = ms => { const sr = c.sampleRate, N = sr * .8, buf = c.createBuffer(1, N, sr), d = buf.getChannelData(0);
    ms.forEach((m, k) => { const f0 = 440 * Math.pow(2, (m - 69) / 12), t0 = Math.floor(k * .012 * sr), tau = 1.2 * Math.pow(f0 / 110, -.35);
      for (let h = 1; h <= 16 && f0 * h < sr / 2.2; h++) { const a = .08 * Math.abs(Math.sin(Math.PI * h * .42)) / Math.pow(h, 1.1), th = tau / (1 + .15 * h), w = 2 * Math.PI * f0 * h * Math.sqrt(1 + 1.5e-4 * h * h) / sr;
        for (let n = t0; n < N; n++) d[n] += a * Math.exp(-(n - t0) / sr / th) * Math.sin(w * (n - t0)); } });
    const s = c.createBufferSource(); s.buffer = buf; s.connect(g); s.start(); }; return g; };`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), say = () => ev(`document.getElementById('gi-say').textContent`);
  await b.goto("http://127.0.0.1:8531/tools/guitar-in.html"); await b.sleep(400); await ev(SEED);
  check("note mode: one dot, a string and fret asked", await ev(`document.querySelectorAll('#gi-board .gi-dot,#gi-board .gi-open').length === 1 && /string \\d/.test(document.getElementById('gi-ask').textContent)`));
  await ev(`document.getElementById('gi-listen').click()`); await b.sleep(500);
  await ev(`__strum(GIPage.S.expect)`); await b.sleep(1300);
  let s = await say(); check("the asked note is heard", /^Yes/.test(s), s);
  check("its dot turns green", await ev(`document.querySelectorAll('#gi-board .gi-hit').length === 1`));
  await ev(`__strum([GIPage.S.expect[0] + 5])`); await b.sleep(1300);
  s = await say(); check("a different note is not accepted, ring drawn", /^Heard/.test(s) && await ev(`document.querySelectorAll('#gi-board .gi-heard').length === 1`), s);
  await ev(`document.getElementById('gi-chord').value = 'C'; document.getElementById('gi-chord').dispatchEvent(new Event('change'))`); await b.sleep(200);
  check("C chord: five dots, one × for string 6", await ev(`document.querySelectorAll('#gi-board .gi-dot,#gi-board .gi-open').length + ' ' + document.querySelectorAll('#gi-board .gi-x').length`) === "5 1");
  await ev(`__strum(GIPage.S.expect)`); await b.sleep(1300);
  s = await say(); check("C strummed: yes", /^Yes: C/.test(s), s);
  await ev(`__strum([43, 47, 50, 55, 59, 67])`); await b.sleep(1300);   // G major
  s = await say(); check("G strummed for C: not quite", /^Not quite/.test(s), s);
  check("score counts", await ev(`document.getElementById('gi-score').textContent`) === "2 of 4 right");
  console.log(fails ? fails + " failed" : "all ok"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
