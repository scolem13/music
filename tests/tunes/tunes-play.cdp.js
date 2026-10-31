// The Tunes page plays through AbcPlay (the band's samples), not abcjs's synth: Play / Stop, the band with the chords,
// the melody sounds menu, From bar set by clicking a note, Space. Render first:
//   quarto render practice/tunes.qmd
//   node tests/tunes/tunes-play.cdp.js        (SITE=<dir> tests a render made elsewhere)
// Samples come from the mirror tests/band/lead/site/sf/ (node tests/band/meter/fetch-samples.js), served here as /sf/.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", SF = ROOT + "/tests/band/lead/site";
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  const f = u.startsWith("/sf/") ? path.join(SF, u) : u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8564);
const U = "http://127.0.0.1:8564";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.goto(U + "/practice/tunes.html?tune=yankee-doodle");
  await ev(`localStorage.clear(), 0`); await b.goto(U + "/practice/tunes.html?tune=yankee-doodle");
  await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, value: () => Promise.resolve(location.origin + "/sf/") }), 0`);
  check("the score is drawn", await wait(`document.querySelectorAll('#paper .abcjs-note').length > 10`));
  check("no abcjs player bar", await ev(`!document.querySelector('.abcjs-midi-start') && !!document.getElementById('tp-play')`));
  check("melody sounds menu has the melody instruments", await ev(`['flute','asax','trumpet','piano'].every(v => document.querySelector('#mel-instrument option[value="' + v + '"]'))`));
  // the tune alone on piano
  await ev(`document.getElementById('accomp').value = 'none', 0`);
  await ev(`document.getElementById('tp-play').click(), 0`);
  check("Play starts AbcPlay", await wait(`!!AbcPlay.playing() && /Stop/.test(document.getElementById('tp-play').textContent)`, 20));
  check("notes are lit as they sound", await wait(`document.querySelectorAll('#paper .abc-on').length > 0`, 60));
  await ev(`document.getElementById('tp-play').click(), 0`);
  check("Stop stops it", await wait(`!AbcPlay.playing() && /Play/.test(document.getElementById('tp-play').textContent)`, 20));
  // Space
  await ev(`document.activeElement && document.activeElement.blur(), document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })), 0`);
  check("Space plays", await wait(`!!AbcPlay.playing()`, 20));
  await ev(`AbcPlay.stop(), 0`); await b.sleep(200);
  // clicking a note sets From bar
  await ev(`(() => { const n = document.querySelectorAll('#paper .abcjs-note'); n[n.length - 3].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); n[n.length - 3].dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); })(), 0`);
  check("clicking a note sets From bar", await wait(`+document.getElementById('tp-from').value > 1`, 20), await ev(`document.getElementById('tp-from').value`));
  // the band with the chords (Yankee Doodle has chord symbols)
  await ev(`document.getElementById('tp-from').value = 1; document.getElementById('accomp').value = 'band'; document.getElementById('tp-play').click(), 0`);
  check("the band plays the chords", await wait(`!!(AbcPlay.playing() && AbcPlay.playing()._band)`, 120));
  await ev(`AbcPlay.stop(), 0`);
  check("a new tune stops playback", await ev(`(document.getElementById('tp-play').click(), 0)`) === 0 && await wait(`!!AbcPlay.playing()`, 60) &&
    await ev(`(document.querySelector('.next').click(), pickTune(), !AbcPlay.playing())`));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
