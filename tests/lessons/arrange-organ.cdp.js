// Arranging 4: The Organ in a browser (lessons/arrange-organ.qmd, apps/shared/lessons/arrange-kit.js, band organ in sounds.js).
// Percussion: the lesson's switches set the band's controls and grey the 1′ tonebar; in an OfflineAudioContext a note with percussion
// is louder at its start than without, single-trigger (a note under a held key gets none, keys of one chord all do), and the 1′ bar is
// silent while it is on. The organist strips: one under each organ demo, and while a demo plays the band's moves reach the strip's
// pedal / Leslie (BandSounds.watchControl). Backing Track: Mixer → Organ has the percussion selects and they set the controls.
// Run after rendering: node tests/lessons/arrange-organ.cdp.js   (NEG=1 must fail; SITE=<dir> for a render elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const PORT = 8581, SF = ROOT + "/tests/band/lead/site";   // the band's samples from the local mirror (tests/band/README.md), served at /sf/
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? SF : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 900);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/arrange-organ.html`); await b.sleep(1500);
  await b.eval(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 0`);
  const ui = await b.eval(`(() => { const g = [...document.querySelectorAll('.ao-group')].find(x => /Percussion/.test(x.querySelector('legend').textContent));
    if (!g) return { g: false }; const on = [...g.querySelectorAll('button')].find(x => x.dataset.v === 'on'), sec = [...g.querySelectorAll('button')].find(x => x.dataset.v === '2nd');
    on.click(); sec.click(); const bars = document.querySelectorAll('.ao-bar');
    const r = { g: true, perc: BandSounds.getControl('hammond', 'perc'), h: BandSounds.getControl('hammond', 'percH'), dead: bars[8].classList.contains('ao-dead') };
    [...g.querySelectorAll('button')].find(x => x.dataset.v === 'off').click(); r.off = BandSounds.getControl('hammond', 'perc') === false && !bars[8].classList.contains('ao-dead'); return r; })()`);
  check("Percussion switches set the band's controls and grey the 1′ bar", ui.g && ui.perc === true && ui.h === "2nd" && ui.dead && ui.off, JSON.stringify(ui));
  const eng = await b.eval(`(async () => {
    async function render(perc, bars, notes) { BandSounds.setTonebars('hammond', bars); BandSounds.setControl('hammond', 'perc', perc);
      BandSounds.setControl('hammond', 'percH', '3rd'); BandSounds.setControl('hammond', 'percDec', 'fast'); BandSounds.setControl('hammond', 'percVol', 'normal');
      const c = new OfflineAudioContext(2, 44100 * 1.5, 44100), k = BandSounds.create(c); await k.load(['hammond']); const flags = [];
      notes.forEach(n => { const v = k.play('hammond', { midi: n[0], dur: n[2], vel: 0.8 }, n[1], c.destination); flags.push(!!(v && v.perc)); });
      const buf = await c.startRendering(), d = buf.getChannelData(0); let e2 = 0; for (let i = 26460; i < 33075; i++) e2 += d[i] * d[i];
      const f3 = 440 * Math.pow(2, -9 / 12) * 2 * 1.49882353; let re = 0, im = 0; for (let i = 0; i < 1764; i++) { const a = 2 * Math.PI * f3 * i / 44100; re += d[i] * Math.cos(a); im += d[i] * Math.sin(a); }
      return { flags, e1: Math.hypot(re, im), e2 }; }
    const off = await render(false, '008000000', [[60, 0, 1]]), on = await render(true, '008000000', [[60, 0, 1]]);
    const leg = await render(true, '008000000', [[60, 0, 1], [64, 0.5, 0.5]]), chord = await render(true, '008000000', [[60, 0, 1], [64, 0, 1], [67, 0, 1]]);
    const one0 = await render(false, '000000008', [[60, 0, 1]]), one1 = await render(true, '000000008', [[60, 0, 1]]);
    BandSounds.setControl('hammond', 'perc', false); BandSounds.setTonebars('hammond', null);
    return { louder: on.e1 / off.e1, leg: leg.flags, chord: chord.flags, oneOff: one0.e2, oneOn: one1.e2 }; })()`);
  check("a note with percussion has the 3rd (2⅔′ pitch) at its start, without it hardly any", eng.louder > 5, eng.louder && eng.louder.toFixed(2));
  check("single-trigger: a note under a held key gets none", eng.leg[0] === true && eng.leg[1] === false, JSON.stringify(eng.leg));
  check("keys of one chord struck together all get it", eng.chord.every(Boolean), JSON.stringify(eng.chord));
  check("the 1′ tonebar is silent while percussion is on", eng.oneOff > 1e-3 && eng.oneOn < eng.oneOff * 0.01, eng.oneOff + " / " + eng.oneOn);
  const st = await b.eval(`({ n: document.querySelectorAll('.ar-demo .ao-strip').length, demos: document.querySelectorAll('.ar-demo[data-comp=hammond]').length })`);
  check("an organist strip (pedal + Leslie) under each organ demo", st.n === st.demos && st.n >= 3, JSON.stringify(st));
  // play the boogaloo and watch the strip follow the band's organist
  const before = await b.eval(`document.querySelector('.ar-demo[data-comp=hammond] .ao-stxt').textContent`);
  await b.eval(`document.querySelector('.ar-demo[data-comp=hammond] .ar-play').click()`);
  const seen = await b.eval(`new Promise(res => { const t = document.querySelector('.ar-demo[data-comp=hammond] .ao-stxt'), got = new Set([t.textContent]);
    const iv = setInterval(() => got.add(t.textContent), 100); setTimeout(() => { clearInterval(iv); res([...got]); }, 14000); })`);
  check("while the demo plays the strip shows the band's pedal moves", seen.length >= 3 && seen.some(x => /Pedal \(band\)/.test(x)), seen.slice(0, 5).join(" | "));
  await b.eval(`document.getElementById('ar-stop') && document.getElementById('ar-stop').click()`);
  await b.goto(`http://127.0.0.1:${PORT}/tools/backing-track.html`); await b.sleep(2500);
  const bt = await b.eval(`(() => { const p = document.getElementById('bt-perc'); if (!p) return { p: false }; p.value = 'on'; p.dispatchEvent(new Event('change'));
    const h = document.getElementById('bt-perc-h'); h.value = '2nd'; h.dispatchEvent(new Event('change'));
    const r = { p: true, on: BandSounds.getControl('hammond', 'perc'), h: BandSounds.getControl('hammond', 'percH'), shown: !h.closest('.bt-field').hidden };
    p.value = 'off'; p.dispatchEvent(new Event('change')); r.hid = h.closest('.bt-field').hidden; localStorage.removeItem('btOrgan'); return r; })()`);
  check("Backing Track Mixer → Organ: percussion selects set the controls", bt.p && bt.on === true && bt.h === "2nd" && bt.shown && bt.hid, JSON.stringify(bt));
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase notice aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
