// The Vocal Warm-up page (tools/vocal-warmup.qmd, apps/shared/vocal-warmup.js) in headless Chrome: every setting builds a
// routine, sections fold, and each kind of step runs (piano pattern, breathing, clicks, the band) without page errors.
// Render first: sh scripts/render-test-page.sh tools/vocal-warmup.qmd   then: node tests/lessons/warmup.cdp.js [shots dir]
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/apps/") ? ROOT : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8516);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }), out = process.argv[2] || "";
  let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8516/tools/vocal-warmup.html"); await b.sleep(800);
  const r = await b.eval(`({ steps: VocalWarmup.steps().length, list: document.querySelectorAll('#vw-list li').length, secs: document.querySelectorAll('section.level2.ls-sec').length })`);
  check("routine built on load", r.steps > 5 && r.list === r.steps, JSON.stringify(r));
  check("sections collapsible", r.secs === 4);
  for (const v of ["bass", "tenor", "soprano"]) for (const len of ["5", "10", "30"]) for (const en of ["gentle", "perform"]) {
    const x = await b.eval(`(() => { vw_voice = document.getElementById('vw-voice'); vw_voice.value='${v}'; document.getElementById('vw-length').value='${len}';
      document.getElementById('vw-energy').value='${en}'; document.getElementById('vw-build').click();
      const st = VocalWarmup.steps(), mins = st.reduce((a, s) => a + s.est, 0) / 60, S = VocalWarmup.settings();
      const keysOk = st.filter(s => s.keysFor).every(s => { const k = s.keysFor(); return k.length > 0 && k.every(r => r >= S.lo - 1 && r <= S.hi); });
      return { n: st.length, mins: +mins.toFixed(1), keysOk }; })()`);
    check(`${v} ${len} min ${en}`, x.n >= 4 && x.keysOk && x.mins > +len * 0.45 && x.mins < +len * 1.6, JSON.stringify(x));
  }
  await b.eval(`document.getElementById('vw-voice').value='mezzo'; document.getElementById('vw-length').value='10'; document.getElementById('vw-energy').value='normal'; document.getElementById('vw-pace').value='brisk'; document.getElementById('vw-build').click()`);
  const kinds = await b.eval(`VocalWarmup.steps().map(s => s.kind + ':' + s.title)`);
  const idx = t => kinds.findIndex(k => k.includes(t));
  // a piano pattern lights its notes
  await b.eval(`void VocalWarmup.start(${idx("Hum")})`); await b.sleep(2600);
  check("hum: notes light up", await b.eval(`document.querySelectorAll('#vw-live .vw-note').length === 5 && !!document.querySelector('#vw-live .vw-note.on')`));
  if (out) await b.shot(out + "/warmup-sing.png", false);
  await b.eval(`void VocalWarmup.start(${idx("Low breath")})`); await b.sleep(4500);
  check("breath: the ball breathes", await b.eval(`/Breathe in/.test(document.getElementById('vw-cue').textContent) && !!document.getElementById('vw-ball')`));
  await b.eval(`void VocalWarmup.start(${idx("pulses")})`); await b.sleep(4000);
  check("pulses: dots run", await b.eval(`document.querySelectorAll('#vw-live .vw-dot').length === 8`));
  await b.eval(`void VocalWarmup.start(${idx("Scale with the band")})`);
  let st = ""; for (let i = 0; i < 40 && !/Sing|Breathe/.test(st); i++) { await b.sleep(250); st = await b.eval(`document.getElementById('vw-cue').textContent`); }
  const sounds = await b.eval(`BandPlayer.chord([60]).then(() => true, () => false)`);
  if (sounds) check("band: plays and cues", /Sing|Breathe/.test(st), st);
  else console.log("skip band: plays and cues  (no samples load in this browser: " + st + ")");
  if (out) await b.shot(out + "/warmup-band.png", false);
  await b.eval(`document.getElementById('vw-next').click()`); await b.sleep(300);
  check("skip moves on and stops the band", await b.eval(`document.getElementById('vw-title').textContent`) === kinds[idx("Scale with the band") + 1].split(":")[1]);
  await b.eval(`VocalWarmup.cancel()`);
  const errs = b.errors.filter(e => !/supabase/i.test(e));
  check("no page errors", !errs.length, errs.join(" | "));
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
