// A score played by its recording (rec-sync.js): the Moonlight analysed score with a timing map, the Tune Library with an MLT
// recording's map. Drafts hidden without ?teacher=1. Audio is a silent WAV served here. Render first:
//   quarto render theory/analysed-scores/beethoven-moonlight-1.qmd practice/tunes.qmd
//   node tests/works/rec-sync.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
function wav(sec) { const rate = 8000, n = rate * sec, b = Buffer.alloc(44 + n, 128); b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40); return b; }
const WAV = wav(200);
const MOON = JSON.stringify({ app: "timestamp-notes", barMap: { bars: Array.from({ length: 69 }, (_, i) => 1 + i * 2.5) } });
const CHEW = JSON.stringify({ app: "timestamp-notes", barMap: { bars: Array.from({ length: 16 }, (_, i) => 2 + i * 1.2) } });
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  if (u.startsWith("/m/")) { const r = /bytes=(\d+)-(\d*)/.exec(q.headers.range || ""); if (r) { const a = +r[1], e = r[2] ? +r[2] : WAV.length - 1;
      s.writeHead(206, { "content-type": "audio/wav", "accept-ranges": "bytes", "content-range": `bytes ${a}-${e}/${WAV.length}`, "content-length": e - a + 1 }); s.end(WAV.subarray(a, e + 1)); }
    else { s.writeHead(200, { "content-type": "audio/wav", "accept-ranges": "bytes", "content-length": WAV.length }); s.end(WAV); } return; }
  if (u === "/t/moon.json") { s.writeHead(200, { "content-type": "application/json" }); s.end(MOON); return; }
  if (u === "/apps/shared/mlt/timings/mullen-chew-chew-chew-c-with-vocals.json") { s.writeHead(200, { "content-type": "application/json" }); s.end(CHEW); return; }
  const f = path.join(SITE, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8561);
const U = "http://127.0.0.1:8561";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);
  // the recordings come from this server; the Moonlight recording gets a timing map; the Chew Chew Chew track is marked as timed
  await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.WORKS_CONFIG = { r2Base: location.origin + "/m" }; window.MLT_REC_BASE_TEST = 1;
    document.addEventListener("DOMContentLoaded", function () {
      window.MLT_REC_BASE = location.origin + "/m";
      var w = window.WORKS && WORKS["beethoven-moonlight-sonata-1"]; if (w) { w.recordings[0].timing = "/t/moon.json"; }
      var r = window.MLTRecordings && MLTRecordings.byId("mullen-chew-chew-chew-c-with-vocals"); if (r) r.timing = 1;
    }, true);` });

  await b.goto(U + "/theory/analysed-scores/beethoven-moonlight-1.html?teacher=0");
  await wait(`!!document.querySelector('.as-score svg')`);
  check("student: no Sound menu, recording hidden", await ev(`!document.querySelector('.as-sound') && !/Schoenhals/.test(document.body.textContent)`));

  await b.goto(U + "/theory/analysed-scores/beethoven-moonlight-1.html?teacher=1");
  check("teacher: Sound menu on the recording", await wait(`(() => { const s = document.querySelector('.as-sound'); return !!s && s.value === '0'; })()`));
  check("draft marked in the panel", await wait(`/draft: hidden from students/.test(document.body.textContent)`));
  await b.sleep(800);
  await ev(`document.querySelector('.as-score .as-bar button').click()`);
  check("▶ plays the recording and lights a bar", await wait(`document.querySelectorAll('.as-score .rs-bar').length > 0`, 60));
  await b.sleep(3500);
  const bars = await ev(`(() => { const S = AnalysedScores.scores()[0]; return S.rec.o.sync.barAt(S.pos); })()`);
  check("the lit bar moves on with the recording", bars >= 1, "bar index " + bars);
  await ev(`document.querySelector('.as-score .as-bar button').click()`);
  check("pause stops it", await ev(`document.querySelector('.as-score .as-bar button').textContent.indexOf('Play') >= 0`));

  await b.goto(U + "/practice/tunes.html?tune=chew-chew-chew");
  await ev(`setTune(false), 0`).catch(() => 0);
  check("Tune Library: recording control", await wait(`(() => { const h = document.getElementById('tune-recsync'); return h && !h.hidden && !document.querySelector('.rs-play').disabled; })()`, 160));
  await ev(`document.querySelector('.rs-play').click()`);
  check("plays and lights bars", await wait(`document.querySelectorAll('#paper .rs-bar').length > 0`, 60));
  await ev(`document.querySelector('.rs-play').click()`);

  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
