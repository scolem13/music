// The Mode & Raga Library page (tools/mode-library.qmd): every card is drawn in its section, chips per kind, a ▶ schedules notes
// (BandSounds play calls counted), the pool buttons choose, the mela builder redraws, search filters, Works Cited is filled.
// Run after rendering the page: node tests/mode-library/mode-library.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8541);
(async () => {
  const b = await launch({}); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8541/tools/mode-library.html"); await b.sleep(800);
  const n = await b.eval(`document.querySelectorAll('.ml-list .ml-card').length`);
  check("every mode drawn", n === await b.eval(`ModeLibrary.MODES.length`) + (NEG ? 1 : 0), n + " cards");
  check("each section has cards", await b.eval(`ModeLibrary.FAMS.every(f => document.querySelectorAll('#ml-' + f.id + ' .ml-card').length > 0)`));
  check("fixed and chosen chips", await b.eval(`document.querySelectorAll('#ml-maqam-rast .ml-meter .ml-fixed').length === 1 && document.querySelectorAll('#ml-maqam-rast .ml-meter .ml-chosen').length === 1`));
  // count play calls instead of sound (samples may be unreachable headless)
  await b.eval(`window.__plays = []; const real = BandSounds.create; BandSounds.create = c => { const k = real(c); k.load = () => Promise.resolve(); k.play = (i, s) => { __plays.push([i, s.midi]); }; return k; }; 0`);
  await b.eval(`document.querySelector('#ml-bhairav .ml-play').click()`); await b.sleep(400);
  const p = await b.eval(`__plays`);
  check("Bhairav aroh plays 8 notes + drone", p.filter(x => x[0] === "flute").length === 8 && p.filter(x => x[0] === "cello").length === 2, JSON.stringify(p.slice(0, 3)));
  check("komal re is 112 cents above Sa", Math.abs(p.filter(x => x[0] === "flute")[1][1] - p.filter(x => x[0] === "flute")[0][1] - 1.12) < 1e-6);
  await b.eval(`__plays.length = 0; document.querySelector('#ml-alt .ml-f-chosen button').click()`); await b.sleep(300);
  check("7alt plays a chord with the ticked alteration", await b.eval(`__plays.filter(x => x[0] === 'piano').length`) === 4);
  await b.eval(`const i = document.querySelector('#ml-mela input'); i.value = 15; i.dispatchEvent(new Event('input'))`);
  check("mela builder redraws", await b.eval(`/Mela 15/.test(document.querySelector('#ml-mela').textContent)`));
  await b.eval(`const q = document.getElementById('ml-q'); q.value = 'hijaz'; q.dispatchEvent(new Event('input'))`);
  check("search filters", await b.eval(`[...document.querySelectorAll('.ml-list .ml-card')].filter(c => !c.hidden).length`) >= 1 && await b.eval(`document.getElementById('ml-bhairav').hidden`));
  check("Works Cited has Garland", await b.eval(`/Hindustani Raga/.test((document.querySelector('.works-cited') || {}).textContent || '')`));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
