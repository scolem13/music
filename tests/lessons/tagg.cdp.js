// The Everyday Tonality lessons (lessons/tagg-*.qmd, apps/shared/lessons/tagg-tables.js): each page has its chapters and tables,
// every ▶ in a table has chords the player can read, and a ▶ makes the band sound and a second press stops it.
// Run after rendering the seven pages: node tests/lessons/tagg.cdp.js   (NEG=1 must fail; samples from tests/band/lead/site/sf)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", SF = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? SF : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8533);
// page: [chapters (## headings that start "Chapter"/"Preface"), tables]
const PAGES = { sound: [3, 0], modes: [2, 0], melody: [3, 0], harmony: [3, 3], shuttles: [2, 5], loops: [3, 5] };
const LEVEL = ms => `new Promise(res => { const src = AudioTap.sources()[0]; if (!src) return res(-1);
  const an = src.ctx.createAnalyser(); an.fftSize = 2048; src.node.connect(an); const d = new Float32Array(2048); let m = 0;
  const iv = setInterval(() => { an.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }, 40);
  setTimeout(() => { clearInterval(iv); src.node.disconnect(an); res(m); }, ${ms}); })`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0;
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const NEG = process.env.NEG === "1";
  for (const [pg, [nch, ntab]] of Object.entries(PAGES)) {
    await b.goto(`http://127.0.0.1:8533/lessons/tagg-${pg}.html`); await b.sleep(700);
    const ch = await b.eval(`[...document.querySelectorAll('main h2')].filter(h => /^(Chapter|Preface)/.test(h.textContent.trim())).length`);
    check(pg + ": " + nch + " chapters", ch === (NEG ? nch + 1 : nch), ch);
    const tb = await b.eval(`document.querySelectorAll('.tg-table').length`);
    check(pg + ": " + ntab + " tables", tb === ntab, tb);
    const bad = await b.eval(`[...document.querySelectorAll('.tg-play')].filter(x => TaggTables.parse(x.dataset.chords).length < 1).map(x => x.dataset.chords)`);
    check(pg + ": every ▶ has chords", bad.length === 0, bad.join(" | "));
    check(pg + ": Works Cited filled", await b.eval(`/Tagg, Philip/.test(document.body.textContent)`));
  }
  await b.goto("http://127.0.0.1:8533/lessons/tagg-shuttles.html"); await b.sleep(800);
  await b.eval(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 1`);
  await b.eval(`document.querySelector('.tg-hear').open = true; document.querySelector('.tg-play').click()`);
  await b.sleep(4000);
  const lv = await b.eval(LEVEL(1500));
  check("▶ plays the shuttle on the band", lv > 0.003 && await b.eval(`!!AbcPlay.playing()`), lv.toFixed(4));
  await b.eval(`document.querySelector('.tg-play').click()`); await b.sleep(400);
  check("second press stops it", await b.eval(`!AbcPlay.playing() && document.querySelector('.tg-play').textContent === '▶'`));
  check("parse: C^⇄F6", JSON.stringify(await b.eval(`TaggTables.parse('C^⇄F6')`)) === '["Cmaj7","F6"]');
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
