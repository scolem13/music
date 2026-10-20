// AbcPlay with chord symbols (apps/shared/abc-play.js, through abc-ex.js) on lessons/voice-jazz: ▶ Play has the band play the
// chords and the melody, the sounding notes lit; ▶ Chords plays only held piano chords (no bass, no drums, no melody).
// Run after rendering:  quarto render lessons/voice-jazz.qmd; node tests/lessons/abc-play-band.cdp.js
// Samples are served here from the mirror tests/band/lead/site/sf/ (tests/band/README.md, "Samples in page tests").
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", SF = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? SF : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8523);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto("http://127.0.0.1:8523/lessons/voice-jazz.html"); await b.sleep(2500);
  // every note the band's banks play, by instrument
  await ev(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') });
    window.__hits = []; let BS;
    Object.defineProperty(window, 'BandSounds', { configurable: true, get: () => BS, set: v => { BS = v; const c = v.create;
      v.create = function () { const bank = c.apply(this, arguments), p = bank.play; bank.play = function (inst, spec) { window.__hits.push(inst + ':' + (spec.piece || spec.midi)); return p.apply(this, arguments); }; return bank; }; } });
    window.__ex = [...document.querySelectorAll('.abc-ex')].find(e => e.querySelector('.ax-chords'));`);
  check("an example with chord symbols has a Chords button", await ev(`!!window.__ex`));
  await ev(`window.__ex.querySelector('button').click()`);
  let lit = 0; for (let k = 0; k < 48; k++) { await b.sleep(250); lit = Math.max(lit, await ev(`window.__ex.querySelectorAll('.abc-on').length`)); }
  const h1 = await ev(`JSON.stringify(window.__hits)`), kinds1 = [...new Set(JSON.parse(h1).map(x => x.split(':')[0]))];
  check("▶ Play: the band plays (bass, comping, drums)", kinds1.some(k => /bass/.test(k)) && kinds1.includes("kit"), kinds1.join(","));
  check("▶ Play: the sounding notes are lit", lit > 0, lit);
  await ev(`window.__ex.querySelector('button').click(); window.__hits = []`); await b.sleep(500);
  await ev(`window.__hits = []; window.__ex.querySelector('.ax-chords').click()`); await b.sleep(8000);
  const h2 = JSON.parse(await ev(`JSON.stringify(window.__hits)`)), kinds2 = [...new Set(h2.map(x => x.split(':')[0]))];
  // (the bass part still runs, on a fader at 0: silent)
  check("▶ Chords: piano, no drums", h2.length > 0 && kinds2.some(k => /piano/.test(k)) && !kinds2.includes("kit"), kinds2.join(",") + " " + h2.length);
  srv.close(); b.close(); process.exit(fails ? 1 : 0);
})();
