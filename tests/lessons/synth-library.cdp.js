// The patch workflow on lessons/synth-compare.html (apps/shared/lessons/synth-library.js): Build from a video fills the form,
// a saved patch reopens through the file input and restores the panel, the Library's ▶ load works, bad files are refused.
// Run after rendering: node tests/lessons/synth-library.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8548);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto("http://127.0.0.1:8548/lessons/synth-compare.html"); await b.sleep(1200);
  check("library mounted", await b.eval(`SynthLibrary.libs.length === 1 && !!document.querySelector('.slib form')`));
  await b.eval(`Promise.all([SynthLibrary.libs[0].ready, SynthLibrary.libs[0].assignReady])`);
  check("assignments drawn", await b.eval(`document.querySelectorAll('.slib-build').length`) >= 10);
  await b.eval(`[...document.querySelectorAll('.slib-build')].find(x => /Let's Go/.test(x.textContent)).click()`);
  check("Build fills song, artist, video, synth", await b.eval(`(f => f.song.value === "Let's Go" && f.artist.value === 'The Cars' && /youtube/.test(f.url.value) && f.synth.value === 'prophet')(document.querySelector('.slib form'))`));
  // build a Prophet patch, save, change a knob, reopen the saved file through the file input
  await b.eval(`(W => { W.load('p5-sync'); W.set('prophet', 'cutoff', 3.5); })(SynthCompare.widgets[0])`); await b.sleep(400);
  await b.eval(`document.querySelector('.slib form button[type=submit]').click()`); await b.sleep(200);
  const saved = await b.eval(`JSON.stringify(SynthLibrary.libs[0].saved || null)`);
  check("saved a valid patch", saved !== "null" && await b.eval(`SynthLibrary.validate(SynthLibrary.libs[0].saved, SynthCompare.PROFILES).length === 0 && SynthLibrary.libs[0].saved.state.cutoff === 3.5`));
  await b.eval(`SynthCompare.widgets[0].load('fat-bass')`); await b.sleep(300);
  await b.eval(`(() => { const dt = new DataTransfer(); dt.items.add(new File([JSON.stringify(SynthLibrary.libs[0].saved)], 'p.json', { type: 'application/json' })); const i = document.querySelector('.slib-open input[type=file]'); i.files = dt.files; i.dispatchEvent(new Event('change')); })()`);
  await b.sleep(700);
  check("reopened: Prophet cutoff back to 3.5", await b.eval(`SynthCompare.widgets[0].st.prophet.cutoff === 3.5 && document.querySelector('.scmp-prophet [data-ctl=cutoff] output').textContent === '3.5'`));
  check("reopened: Prophet is the starting point, sync on", await b.eval(`document.querySelector('.scmp-prophet').classList.contains('scmp-src') && SynthCompare.widgets[0].st.prophet.aSync === true`));
  check("bad file refused", await b.eval(`SynthLibrary.libs[0].openText('{"kind":"synth-patch","version":1,"synth":"zz"}') === false && document.querySelector('.slib-msg').classList.contains('slib-bad')`));
  await b.eval(`SynthCompare.widgets[0].load('fat-bass'); document.querySelector('.slib-lib').open = true; document.querySelector('.slib-item button').click()`); await b.sleep(800);
  check("Library ▶ load: the guide's Let's Go on the Prophet", await b.eval(`SynthCompare.widgets[0].st.prophet.aSync === true && /Let's Go/.test(document.querySelector('.slib-msg').textContent)`));
  check("badge says the guide's recipe", await b.eval(`/guide's recipe/.test(document.querySelector('.slib-item .slib-badge').textContent)`));
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
