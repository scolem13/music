// Mark Bars (tools/mark-bars.qmd) at phone size: BAR / SECTION marks, the Bars sheet, undo, kept across a reload, Send through the
// share sheet, and the kept file opening in Timestamp Notes. Audio: a silent WAV served here. Render first:
//   quarto render tools/mark-bars.qmd tools/timestamp-notes.qmd
//   node tests/lessons/mark-bars.cdp.js   (SHOT=<file.png> also saves a screenshot)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
function wav(sec) { const rate = 8000, n = rate * sec, b = Buffer.alloc(44 + n, 128); b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40); return b; }
const WAV = wav(60);
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  if (u === "/m/song.wav") { const r = /bytes=(\d+)-(\d*)/.exec(q.headers.range || ""); const a = r ? +r[1] : 0, e = r && r[2] ? +r[2] : WAV.length - 1;
    s.writeHead(r ? 206 : 200, { "content-type": "audio/wav", "accept-ranges": "bytes", "content-length": e - a + 1, ...(r ? { "content-range": `bytes ${a}-${e}/${WAV.length}` } : {}) }); s.end(WAV.subarray(a, e + 1)); return; }
  const f = path.join(SITE, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8563);
const U = "http://127.0.0.1:8563";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(390, 844);
  const url = U + "/tools/mark-bars.html?media=" + encodeURIComponent(U + "/m/song.wav") + "&title=Test%20Song";
  await b.goto(url); await ev(`localStorage.clear(), 0`); await b.goto(url);
  check("opens the recording from the address", await wait(`document.querySelector('.mb-title').textContent === 'Test Song'`));
  const fits = await ev(`document.documentElement.scrollWidth <= innerWidth + 1`);
  check("no sideways scrolling at phone width", fits);
  await ev(`document.querySelector('.mb-play').click()`);
  check("▶ plays", await wait(`document.querySelector('.mark-bars').__mb.audio.currentTime > 0.3`));
  const tap = `document.querySelector('.mb-bar').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`;
  for (let i = 0; i < 4; i++) { await ev(tap); await b.sleep(400); }
  await ev(`document.querySelector('.mb-sec').click()`);
  check("SECTION asks for a label", await ev(`!document.querySelector('.mb-labels').hidden`));
  await ev(`document.querySelector('.mb-labels-l button[data-l="Verse"]').click()`);
  await ev(tap); await b.sleep(300);
  await ev(`document.querySelector('.mb-play').click()`);
  const d = await ev(`JSON.stringify(document.querySelector('.mark-bars').__mb.data())`).then(JSON.parse);
  check("5 bars and a section marked", d.barMap.bars.length === 5 && d.stamps.length === 1 && d.stamps[0].n === "Verse", d.barMap.bars.length + " / " + d.stamps.map(s => s.n));
  await ev(`document.querySelector('.mb-undo').click()`);
  check("undo takes the last bar back", await ev(`document.querySelector('.mark-bars').__mb.data().barMap.bars.length`) === 4);
  await ev(`document.querySelector('.mb-open').click()`);
  check("the Bars sheet lists bars and the section", await ev(`(() => { const l = document.querySelectorAll('.mb-l li'); return l.length === 5 && !!document.querySelector('.mb-li-sec'); })()`));
  if (process.env.SHOT) await b.shot(process.env.SHOT, false);
  if (process.env.SHOT) { await ev(`document.querySelector(".mb-close").click()`); await b.shot(process.env.SHOT.replace(".png", "-main.png"), false); await ev(`document.querySelector(".mb-open").click()`); }
  await ev(`document.querySelectorAll('.mb-l .mb-del')[1].click()`);
  check("× in the sheet takes a bar out", await ev(`document.querySelector('.mark-bars').__mb.data().barMap.bars.length`) === 3);
  await ev(`document.querySelector('.mb-close').click()`);
  await b.goto(url);
  check("kept across a reload", await wait(`document.querySelector('.mark-bars').__mb.data().barMap.bars.length === 3`));
  await ev(`window.__shared = null; navigator.canShare = () => true; navigator.share = (o) => { window.__shared = o; return Promise.resolve(); }; document.querySelector('.mb-send').click()`);
  await b.sleep(300);
  const shared = await ev(`window.__shared && window.__shared.files ? window.__shared.files[0].name + ' ' + window.__shared.files[0].size : ''`);
  check("Send shares a .json file", /\.json \d+/.test(shared), shared);
  const saved = await ev(`localStorage.getItem('mark-bars:media:' + ${JSON.stringify(U + "/m/song.wav")})`);
  // the same file in Timestamp Notes
  await b.resize(1300, 900);
  await b.goto(U + "/tools/timestamp-notes.html");
  await wait(`!!document.querySelector('.btp-import-file')`);
  await ev(`(() => { const f = document.querySelector('.btp-paste-open'); f.click(); document.querySelector('.btp-paste textarea').value = ${JSON.stringify(saved)}; document.querySelector('.btp-paste-go').click(); })()`);
  await b.sleep(500);
  check("Timestamp Notes opens it: bars and the section", await ev(`document.querySelector('.btp-barmap')._btpMap.bars() === 3 && /Verse/.test(document.querySelector('.btp-log-rows').textContent)`));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
