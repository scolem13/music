// The Blues Tonality lessons (lessons/blues-tonality-*.qmd, apps/shared/lessons/blues-tonality.js): every widget builds, each kind
// makes sound through the band's samples, the backing runs, the chorus lights its bars, the Green Onions modes are right, the quiz records.
// Run after rendering the six pages: node tests/lessons/blues-tonality.cdp.js   (samples from tests/band/lead/site/sf, README "Samples in page tests")
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", SF = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? SF : SITE, u);
  s.setHeader("access-control-allow-origin", "*");
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8531);
const PAGES = { intro: ["chords", "zone", "quiz"], scales: ["scale", "quiz"], "blue-notes": ["zone", "zone", "zone", "quiz"],
  microtonal: ["scale", "zone", "chorus", "chorus", "quiz"], harmony: ["chords", "chords", "chords", "chords", "chorus", "quiz"], beyond: ["onions", "harp"] };
// loudest level heard on the page's output over ms milliseconds
const LEVEL = ms => `new Promise(res => { const src = AudioTap.sources().find(s => s.label === 'Blues Tonality'); if (!src) return res(-1);
  const an = src.ctx.createAnalyser(); an.fftSize = 2048; src.node.connect(an); const d = new Float32Array(2048); let m = 0;
  const iv = setInterval(() => { an.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }, 40);
  setTimeout(() => { clearInterval(iv); src.node.disconnect(an); res(m); }, ${ms}); })`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0;
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const NEG = process.env.NEG === "1";
  for (const [pg, kinds] of Object.entries(PAGES)) {
    await b.goto(`http://127.0.0.1:8531/lessons/blues-tonality-${pg}.html`); await b.sleep(900);
    await b.eval(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 1`);
    const got = await b.eval(`BluesTonality.widgets.map(w => w.kind).join(",")`);
    check(pg + ": widgets " + kinds.join(","), got === (NEG ? "x" : kinds.join(",")), got);
    check(pg + ": none failed", await b.eval(`![...document.querySelectorAll('div.bz')].some(d => /failed|Unknown widget/.test(d.textContent.slice(0, 200)))`));
    check(pg + ": bar at the foot", await b.eval(`!!document.querySelector('#bz-bar.playbar #bz-key')`));
  }
  // sound: zone preset (guitar bend), chords (piano + bass), backing (band)
  await b.goto("http://127.0.0.1:8531/lessons/blues-tonality-intro.html"); await b.sleep(900);
  await b.eval(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 1`);
  await b.eval(`BluesTonality.widgets.find(w => w.kind === 'zone').play(3)`);
  let lv = await b.eval(LEVEL(5000)); check("zone: a bend sounds", lv > 0.003, lv.toFixed(4));
  await b.eval(`BluesTonality.widgets.find(w => w.kind === 'chords').play(4)`); await b.sleep(2500);
  lv = await b.eval(LEVEL(1200)); check("chords: IV7 -> I7 sounds", lv > 0.003, lv.toFixed(4));
  await b.eval(`document.getElementById('bz-backing').value = 'major'; document.getElementById('bz-backing').dispatchEvent(new Event('change')); [...document.querySelectorAll('#bz-bar button, .playbar-pop button')].find(x => /Backing/.test(x.textContent)).click()`);
  await b.sleep(3000); lv = await b.eval(LEVEL(1500)); check("backing: the 12-bar band sounds", lv > 0.003 && await b.eval(`BluesTonality.band.playing`), lv.toFixed(4));
  await b.eval(`document.getElementById('bz-stop').click()`); await b.sleep(300);
  check("Stop stops the band", !(await b.eval(`BluesTonality.band.playing`)));
  // key change respells
  await b.eval(`{ const k = document.getElementById("bz-key"); k.value = "10"; k.dispatchEvent(new Event("change")); }`);
  check("key B♭: the strip names D♭ and D", await b.eval(`/D♭/.test(BluesTonality.widgets.find(w => w.kind === 'zone').host.textContent) && /3 D/.test(BluesTonality.widgets.find(w => w.kind === 'zone').host.textContent)`));
  await b.eval(`{ const k = document.getElementById("bz-key"); k.value = "4"; k.dispatchEvent(new Event("change")); }`);
  // quiz records into SiteRecord
  await b.eval(`localStorage.removeItem('site-record-v1'); const q = BluesTonality.widgets.find(w => w.kind === 'quiz'); q.ask(); q.answer(q.current())`);
  check("quiz: a right answer is recorded", await b.eval(`(() => { const it = SiteRecord.items ? null : null; const d = JSON.parse(localStorage.getItem('site-record-v1') || '{"items":[]}'); const x = d.items.filter(i => i.tool === 'blues-tonality').pop(); return !!x && x.at.length === 1 && x.at[0][1] === 1; })()`));
  // the scales page: shaded play and the scale names
  await b.goto("http://127.0.0.1:8531/lessons/blues-tonality-microtonal.html"); await b.sleep(900);
  await b.eval(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 1`);
  check("scale 4-7 in E: 1 3↓ 4↑ 5↓ 7↑", await b.eval(`BluesTonality.widgets.find(w => w.kind === 'scale').host.querySelector('.bz-names').textContent`) === "1 E   3↓ G♯   4↑ A   5↓ B   ♭7↑ D".replace("♭7↑ D", "♭7↑ D"),
        await b.eval(`BluesTonality.widgets.find(w => w.kind === 'scale').host.querySelector('.bz-names').textContent`));
  await b.eval(`BluesTonality.widgets.find(w => w.kind === 'scale').play(true)`);
  lv = await b.eval(LEVEL(5000)); check("scale: shaded play sounds", lv > 0.003, lv.toFixed(4));
  await b.eval(`BluesTonality.widgets.find(w => w.kind === 'chorus').play()`); await b.sleep(4000);
  check("chorus: a bar is lit while it plays", await b.eval(`!!BluesTonality.widgets.find(w => w.kind === 'chorus').host.querySelector('.bz-cell.bz-live')`));
  lv = await b.eval(LEVEL(1500)); check("chorus: band and lead sound", lv > 0.003, lv.toFixed(4));
  await b.eval(`document.getElementById('bz-stop').click()`); await b.sleep(200);
  check("chorus: Stop clears the lit bar", await b.eval(`!BluesTonality.widgets.find(w => w.kind === 'chorus').host.querySelector('.bz-cell.bz-live')`));
  // Green Onions: modes per chord (in F as Hein spells them)
  await b.goto("http://127.0.0.1:8531/lessons/blues-tonality-beyond.html"); await b.sleep(900);
  const modes = await b.eval(`(() => { const w = BluesTonality.widgets.find(w => w.kind === 'onions'), F = BluesTonality.FORMS.onions.bars;
    return [F[0][0], F[0][1], F[0][2], F[4][0], F[4][1], F[8][0], F[8][2]].map(c => w.modesOf(c).join('')).join(' '); })()`);
  check("Green Onions: modes holding each chord", modes === "01 01 023 0 1 3 23", modes);
  check("harp: 2nd position, hole 2 draw is the key note", await b.eval(`[...BluesTonality.widgets.find(w => w.kind === 'harp').host.querySelectorAll('.bz-tonic text')].map(t => t.textContent).some(t => /^G 1/.test(t))`));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
