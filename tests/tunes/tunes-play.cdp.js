// The Tunes page plays through AbcPlay (the band's samples), not abcjs's synth: Play / Stop, the band with the chords,
// the melody sounds menu, From bar set by clicking a note, Space; Play becomes Pause and resumes; Hear (melody / band / both);
// the score on white paper, the panels in the site's folding right sidebar; "Open in" links; chants on a one-line staff. Render first:
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
  // the page itself (2026-11-17): no Works Cited, no title, the score on white paper, the panels in the site's right sidebar
  // (it folds from the navbar button), under the score when narrow; no buttons to move panels
  check("no Works Cited block", await ev(`!document.querySelector('.works-cited') && ![...document.querySelectorAll('h2')].some(h => /Works Cited/.test(h.textContent))`));
  check("no page title shown", await ev(`!document.querySelector('#title-block-header') || getComputedStyle(document.querySelector('#title-block-header')).display === 'none'`));
  check("the score is on white paper", await ev(`getComputedStyle(document.getElementById('paper')).backgroundColor === 'rgb(255, 255, 255)' && document.getElementById('paper').classList.contains('site-paper')`));
  await b.resize(1400, 900); await b.sleep(300);
  check("panels in the right sidebar at 1400px", await ev(`document.getElementById('tn-side').parentNode.id === 'quarto-margin-sidebar' && document.getElementById('tn-side').getBoundingClientRect().left > document.getElementById('paper').getBoundingClientRect().right - 1`));
  check("no move-panel buttons", await ev(`!document.querySelector('.pc-tools, .tn-reset-cols')`));
  await ev(`document.querySelector('.sidebar-toggle-right').click(), 0`); await b.sleep(200);
  check("the navbar button folds the panels away", await ev(`document.getElementById('tn-side').getBoundingClientRect().width === 0`));
  await ev(`document.querySelector('.sidebar-toggle-right').click(), 0`); await b.sleep(200);
  await b.resize(700, 900); await b.sleep(300);
  check("under the score when narrow", await ev(`document.querySelector('.tn-side').getBoundingClientRect().top > document.querySelector('#paper').getBoundingClientRect().bottom - 5`));
  await b.resize(1400, 900); await b.sleep(200);
  const links = await ev(`['.tn-to-notation', '.tn-to-band'].map(s => new URL(document.querySelector(s).href).pathname + new URL(document.querySelector(s).href).search).join(' ')`);
  check("Open in Notation / Backing Track links carry the tune", links === "/tools/notation.html?tune=yankee-doodle /tools/backing-track.html?tune=yankee-doodle", links);
  const ta = await ev(`(() => { document.getElementById('tn-edit').open = true; const t = document.querySelector('#tune-abc-edit textarea'); return t ? [t.offsetHeight > 40, /^X:/m.test(t.value), getComputedStyle(t).display].join(' | ') : 'none'; })()`);
  check("Edit the ABC shows the tune in a visible textarea", /^true \| true \| (?!none)/.test(ta), ta);
  check("no tempo slider (BPM box instead, from the tune's Q:)", await ev(`!document.querySelector('#tn-bar input[type=range], .playbar-pop input[type=range]') && +document.getElementById('tp-bpm').value > 0`));
  const sels = await ev(`[...document.querySelectorAll('#tn-bar select, .playbar-pop select')].map(s => s.id).sort().join(',')`);
  check("the bar's menus: hear, instrument, sound, key, octave, band, swing", sels === "inst-select,key-select,mel-instrument,tp-hear,tp-style,tp-swing,vis-octaves", sels);
  check("removed options are gone", await ev(`['accomp','play-tune','bass-clef','show-cursor','show-options','midi-transpose','tp-tempo'].every(id => !document.getElementById(id))`));
  check("the bar is a PlayBar with Play, Stop, From bar and Loop", await ev(`document.getElementById('tn-bar').classList.contains('playbar') && ['tp-play','tp-stop','tp-from','tp-loop'].every(id => document.getElementById(id))`));
  const ab = await ev(`(() => { const d = document.getElementById('tn-about'); return [d.open, /Composer|Meter/.test(d.textContent)].join(' | '); })()`);
  check("About / notes panel, folded, with the tune's details", ab === "false | true", ab);
  // the tune alone on piano
  await ev(`document.getElementById('tp-hear').value = 'melody', 0`);
  await ev(`document.getElementById('tp-play').click(), 0`);
  check("Play starts AbcPlay and becomes Pause", await wait(`!!AbcPlay.playing() && /Pause/.test(document.getElementById('tp-play').textContent)`, 20));
  check("notes are lit as they sound", await wait(`document.querySelectorAll('#paper .abc-on').length > 0`, 60));
  check("the melody alone: no band", await ev(`!AbcPlay.playing()._band`));
  await wait(`nowBar() >= 2`, 80);
  await ev(`document.getElementById('tp-play').click(), 0`);
  const pz = await ev(`[!AbcPlay.playing(), document.getElementById('tp-play').textContent, paused, document.getElementById('tp-stop').disabled].join(' | ')`);
  check("Pause stops the sound, remembers the bar, shows Resume, Stop stays on", /^true \| ▶ Resume \| [2-9]\d* \| false$/.test(pz), pz);
  await ev(`document.getElementById('tp-play').click(), 0`);
  check("Resume plays from the paused bar", await wait(`!!AbcPlay.playing() && paused == null && nowBar() >= 2`, 20));
  await ev(`document.getElementById('tp-play').click(), document.getElementById('tp-stop').click(), 0`);
  check("Stop after a pause forgets it", await wait(`!AbcPlay.playing() && paused == null && /▶ Play/.test(document.getElementById('tp-play').textContent) && document.getElementById('tp-stop').disabled`, 20));
  // Space
  await ev(`document.activeElement && document.activeElement.blur(), document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })), 0`);
  check("Space plays", await wait(`!!AbcPlay.playing()`, 20));
  await ev(`AbcPlay.stop(), 0`); await b.sleep(200);
  // clicking a note sets From bar
  await ev(`(() => { const n = document.querySelectorAll('#paper .abcjs-note'); n[n.length - 3].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); n[n.length - 3].dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); })(), 0`);
  check("clicking a note sets From bar", await wait(`+document.getElementById('tp-from').value > 1`, 20), await ev(`document.getElementById('tp-from').value`));
  // the band with the chords (Yankee Doodle has chord symbols)
  await ev(`document.getElementById('tp-from').value = 1; document.getElementById('tp-hear').value = 'band'; document.getElementById('tp-play').click(), 0`);
  check("Band only: the band plays the chords", await wait(`!!(AbcPlay.playing() && AbcPlay.playing()._band)`, 120));
  check("Band only: hearing() leaves the melody out", await ev(`JSON.stringify(hearing()) === '{"melody":false,"band":true}'`));
  await ev(`document.getElementById('tp-hear').value = 'both', AbcPlay.stop(), stopTune(), 0`);
  check("a new tune stops playback", await ev(`(document.getElementById('tp-play').click(), 0)`) === 0 && await wait(`!!AbcPlay.playing()`, 60) &&
    await ev(`(document.querySelector('.next').click(), pickTune(), !AbcPlay.playing())`));
  // Show: the chord grid
  await ev(`(document.getElementById('tn-show').value = 'both', tnShow(), 0)`);
  check("Both: score and grid shown, bars drawn", await wait(`document.querySelectorAll('#tn-grid [class*=tc-]').length > 4 && !document.getElementById('tn-grid').hidden && document.getElementById('paper').style.display !== 'none'`));
  check("the choice is remembered", await ev(`localStorage.getItem('tunesView') === 'both'`));
  const g0 = await ev(`document.getElementById('tn-grid').textContent.replace(/\\s+/g,' ')`);
  await ev(`(document.getElementById('vis-transpose').value = '2', setTune(false), 0)`);
  check("the grid follows the Key menu", await wait(`document.getElementById('tn-grid').textContent.replace(/\\s+/g,' ') !== ${JSON.stringify(g0)}`));
  await ev(`(document.getElementById('vis-transpose').value = '0', setTune(false), 0)`);
  await ev(`(document.getElementById('tn-show').value = 'grid', tnShow(), 0)`);
  check("Chord grid: the score is hidden", await ev(`document.getElementById('paper').style.display === 'none' && !document.getElementById('tn-grid').hidden`));
  await ev(`document.getElementById('tp-from').value = 1; document.getElementById('tp-hear').value = 'both'; document.getElementById('tp-play').click(), 0`);
  check("the playing bar is lit in the grid", await wait(`document.querySelectorAll('#tn-grid .tc-live').length === 1`, 120));
  await ev(`stopTune(), 0`);
  check("Stop clears the lit bar", await wait(`document.querySelectorAll('#tn-grid .tc-live').length === 0`, 20));
  await ev(`(document.getElementById('tn-show').value = 'score', tnShow(), 0)`);
  check("Score again: drawn at width", await wait(`document.getElementById('paper').style.display !== 'none' && document.getElementById('tn-grid').hidden && document.querySelectorAll('#paper .abcjs-note').length > 10`));
  // a rhythm chant (one pitch, no chords) on a one-line staff
  await b.goto(U + "/practice/tunes.html?tune=duple-acculturation"); await b.sleep(800);
  check("a chant is drawn on one staff line", await wait(`document.querySelectorAll('#paper .abcjs-note').length > 10`) &&
    await ev(`!!chant(abc[currentTune]) && cur.transpose === -4 && document.querySelectorAll('#paper .abcjs-staff path').length > 0 && !document.querySelector('#paper .abcjs-clef[data-name="treble"], #paper .abcjs-key-signature path')`));
  check("a tune with no chords: option says no chords, score shown", await ev(`document.getElementById('tn-show-hint').textContent === 'no chords' && document.getElementById('tn-grid').hidden && document.getElementById('paper').style.display !== 'none'`));
  check("a tune is not a chant", await ev(`chant("X:1\\nT:t\\nK:C\\nCDEF|GABc|\\n") === null`));
  // Layout: Pages across (2026-11-17): systems in white pages in a horizontal strip, ~1.3 pages in view
  await b.goto(U + "/practice/tunes.html?tune=yankee-doodle");
  await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, value: () => Promise.resolve(location.origin + "/sf/") }), 0`);
  await b.resize(1400, 500); await b.sleep(300);
  await ev(`document.getElementById('tn-layout').value = 'across', document.getElementById('tn-layout').dispatchEvent(new Event('change')), 0`);
  check("Pages across: saved, systems in white pages", await wait(`document.querySelectorAll('#paper > .tn-page').length >= 1 && localStorage.getItem('tunesLayout') === 'across' && document.querySelectorAll('#paper .tn-page svg').length >= 1`));
  const geo = await ev(`(() => { const p = document.getElementById('paper'), g = p.querySelector('.tn-page'); return [p.clientWidth / g.getBoundingClientRect().width, getComputedStyle(g).backgroundColor].join(' | '); })()`);
  check("a page is about paper width / 1.3", /^1\.[0-4]\d* \| rgb\(255, 255, 255\)$/.test(geo), geo);
  const np = await ev(`document.querySelectorAll('#paper > .tn-page').length`);
  if (np > 1) {
    check("scrolls horizontally (more pages than fit)", await ev(`document.getElementById('paper').scrollWidth > document.getElementById('paper').clientWidth`));
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })), 0`);
    check("the right arrow turns a page", await wait(`document.getElementById('paper').scrollLeft > 50`, 30));
    await ev(`document.getElementById('tn-prev').click(), 0`);
    check("the left button turns back", await wait(`document.getElementById('paper').scrollLeft < 5`, 30));
  } else console.log("note: tune fits one page; turning not tested");
  await ev(`(() => { document.getElementById('tp-from').value = 1; const n = document.querySelectorAll('#paper .abcjs-note'); n[n.length - 3].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); n[n.length - 3].dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); })(), 0`);
  check("clicking a note still sets From bar", await wait(`+document.getElementById('tp-from').value > 1`, 20));
  await ev(`(document.getElementById('tp-from').value = 1, document.getElementById('tp-play').click(), 0)`);
  check("Pages across: notes light while playing", await wait(`document.querySelectorAll('#paper .tn-page .abc-on').length > 0`, 60));
  await ev(`document.getElementById('tp-stop').click(), 0`);
  await ev(`document.getElementById('tn-layout').value = 'down', document.getElementById('tn-layout').dispatchEvent(new Event('change')), 0`);
  check("Scroll down again: no pages", await wait(`!document.querySelector('#paper .tn-page') && !document.getElementById('paper').classList.contains('tn-across') && document.querySelectorAll('#paper .abcjs-note').length > 10`));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
