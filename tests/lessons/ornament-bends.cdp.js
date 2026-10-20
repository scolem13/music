// The jazz table of lessons/grace-notes-ornaments.qmd: rows with a data-bend play through the band's guitar samples
// (abc-ex.js -> BandSounds, spec.bend), and the pitch really slides (playbackRate ramps). Run after rendering:
//   quarto render lessons/grace-notes-ornaments.qmd; node tests/lessons/ornament-bends.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
// the guitar samples come from the local mirror (tests/band/README.md: node tests/band/meter/fetch-samples.js); served here at /sf/
const SF = ROOT + "/tests/band/lead/site";
const handler = (q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? SF : SITE, u);
  s.setHeader("access-control-allow-origin", "*");
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type2(f) }); s.end(d); }); };
const type2 = f => f.endsWith(".mp3") ? "audio/mpeg" : type(f);
const srv = http.createServer(handler).listen(8522);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto("http://127.0.0.1:8522/lessons/grace-notes-ornaments.html"); await b.sleep(2500);
  const n = await ev(`[...document.querySelectorAll('tr')].filter(tr => /Bend|Fall|Doit|Scoop|Plop|Rip|Shake/.test((tr.querySelector('em') || {}).textContent || '')).length`);
  check("bend rows in the jazz table", n >= 7, n);
  await ev(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); window.__ramps = []; const o = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function (v, t) { window.__ramps.push(v); return o.call(this, v, t); };
    const tr = [...document.querySelectorAll('tr')].find(tr => ((tr.querySelector('em') || {}).textContent || '') === 'Fall');
    tr.querySelector('.abc-ex button').click();`);
  await b.sleep(8000);
  const r = await ev(`JSON.stringify({ bs: !!window.BandSounds, fail: JSON.stringify(BandSounds.failures), n: window.__ramps.length, rates: window.__ramps.filter(v => v > 0.2 && v < 4).map(v => +v.toFixed(3)) })`);
  const o = JSON.parse(r);
  check("guitar samples loaded", o.bs && o.fail === "[]", o.fail);
  const rates = o.rates, fell = rates.length >= 3 && Math.abs(rates[2] / rates[0] - Math.pow(2, -7 / 12)) < 0.01;
  check("the fall slides down (playbackRate ramps ~7 semitones)", fell, rates.join(","));
  // a plain example: ▶ plays the band's piano through AbcPlay and lights the sounding notes
  await ev(`(() => { const h = [...document.querySelectorAll('h3')].find(h => /Improvising ornaments/.test(h.textContent));
    let e = h.nextElementSibling; while (e && !(e.matches('.abc-ex') || e.querySelector('.abc-ex'))) e = e.nextElementSibling;
    window.__ex = e.matches('.abc-ex') ? e : e.querySelector('.abc-ex'); window.__ex.querySelector('button').click(); })()`);
  let litMax = 0;
  for (let k = 0; k < 40; k++) { await b.sleep(250); litMax = Math.max(litMax, await ev(`window.__ex.querySelectorAll('.abc-on').length`)); }
  const pp = await ev(`JSON.stringify({ ap: !!window.AbcPlay, fail: BandSounds.failures.filter(f => /piano/.test(f.url)).length })`);
  check("plain example plays through AbcPlay (piano samples)", JSON.parse(pp).ap && JSON.parse(pp).fail === 0, pp);
  check("the sounding notes are lit", litMax > 0, litMax);
  srv.close(); b.close(); process.exit(fails ? 1 : 0);
})();
