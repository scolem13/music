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
  // the page itself (2026-11-11): no Works Cited, no title, two columns when wide, the ABC box visible, a PlayBar with four menus
  check("no Works Cited block", await ev(`!document.querySelector('.works-cited') && ![...document.querySelectorAll('h2')].some(h => /Works Cited/.test(h.textContent))`));
  check("no page title shown", await ev(`!document.querySelector('#title-block-header') || getComputedStyle(document.querySelector('#title-block-header')).display === 'none'`));
  await b.resize(1400, 900); await b.sleep(300);
  const cols = await ev(`(() => { const m = document.querySelector('.tn-main').getBoundingClientRect(), s = document.querySelector('.tn-side').getBoundingClientRect(); return [Math.round(m.left), Math.round(s.left), Math.round(m.top), Math.round(s.top), m.right <= s.left + 1].join(' | '); })()`);
  check("two columns at 1400px: notation left, panels right", /\| true$/.test(cols) && +cols.split(' | ')[1] > 600, cols);
  await b.resize(700, 900); await b.sleep(300);
  check("one column when narrow", await ev(`document.querySelector('.tn-side').getBoundingClientRect().top > document.querySelector('#paper').getBoundingClientRect().bottom - 5`));
  await b.resize(1400, 900); await b.sleep(200);
  const ta = await ev(`(() => { document.getElementById('tn-edit').open = true; const t = document.querySelector('#tune-abc-edit textarea'); return t ? [t.offsetHeight > 40, /^X:/m.test(t.value), getComputedStyle(t).display].join(' | ') : 'none'; })()`);
  check("Edit the ABC shows the tune in a visible textarea", /^true \| true \| (?!none)/.test(ta), ta);
  check("no tempo slider (BPM box instead, from the tune's Q:)", await ev(`!document.querySelector('#tn-bar input[type=range], .playbar-pop input[type=range]') && +document.getElementById('tp-bpm').value > 0`));
  const sels = await ev(`[...document.querySelectorAll('#tn-bar select, .playbar-pop select')].map(s => s.id).sort().join(',')`);
  check("only four menus in the bar: instrument, sound, key, octave", sels === "inst-select,key-select,mel-instrument,vis-octaves", sels);
  check("removed options are gone", await ev(`['accomp','play-tune','bass-clef','show-cursor','show-options','midi-transpose','tp-tempo'].every(id => !document.getElementById(id))`));
  check("the bar is a PlayBar with Play, Stop, From bar and Loop", await ev(`document.getElementById('tn-bar').classList.contains('playbar') && ['tp-play','tp-stop','tp-from','tp-loop'].every(id => document.getElementById(id))`));
  const ab = await ev(`(() => { const d = document.getElementById('tn-about'); return [d.open, /Composer|Meter/.test(d.textContent)].join(' | '); })()`);
  check("About / notes panel, folded, with the tune's details", ab === "false | true", ab);
  // the tune alone on piano
  await ev(`OPT.accomp = 'none', 0`);   // the "With the chords" menu is gone; its default (band) is OPT.accomp
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
  await ev(`document.getElementById('tp-from').value = 1; OPT.accomp = 'band'; document.getElementById('tp-play').click(), 0`);
  check("the band plays the chords", await wait(`!!(AbcPlay.playing() && AbcPlay.playing()._band)`, 120));
  await ev(`AbcPlay.stop(), 0`);
  check("a new tune stops playback", await ev(`(document.getElementById('tp-play').click(), 0)`) === 0 && await wait(`!!AbcPlay.playing()`, 60) &&
    await ev(`(document.querySelector('.next').click(), pickTune(), !AbcPlay.playing())`));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
