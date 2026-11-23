// Piano: Songs with 1, 2 or 3 Chords (practice/piano-chord-songs.qmd, apps/shared/piano-chord-songs.js).
//   quarto render practice/piano-chord-songs.qmd && quarto render tools/chord-sheet.qmd
//   node tests/piano-chord-songs/piano-chord-songs.cdp.js     (SITE=<dir>; NEG=1 must fail)
// Samples from tests/band/lead/site/sf/ (node tests/band/meter/fetch-samples.js), served as /sf/.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", SF = ROOT + "/tests/band/lead/site";
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  const f = u.startsWith("/sf/") ? path.join(SF, u) : u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8571);
const U = "http://127.0.0.1:8571", NEG = !!process.env.NEG;
(async () => {
  const b = await launch({});
  let fails = 0; const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i ? "  " + i : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), wait = async (c, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(c)) return true; await b.sleep(150); } return false; };
  await b.goto(U + "/practice/piano-chord-songs.html"); await ev(`localStorage.clear(), 0`);
  await b.goto(U + "/practice/piano-chord-songs.html");
  await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, value: () => Promise.resolve(location.origin + "/sf/") }), 0`);
  check("songs listed", await wait(`document.querySelectorAll('.pcs-song').length >= 2`));
  const counts = await ev(`JSON.stringify([1,2,3].map(n => PianoChordSongs.songs().filter(s => s.n === n).length))`);
  check("songs at each level", JSON.parse(counts).every(n => n >= 2), counts);
  check("every listed song has the level's chord count", await ev(`[...document.querySelectorAll('.pcs-song')].every(b => b.querySelectorAll('.pcs-chips i').length === ${NEG ? 2 : 1})`));
  await ev(`document.querySelector('.pcs-levels button[data-n="2"]').click(), 0`);
  check("2-chord level", await ev(`[...document.querySelectorAll('.pcs-song')].every(b => b.querySelectorAll('.pcs-chips i').length === 2)`));
  await b.goto(U + "/practice/piano-chord-songs.html?tune=lightly-row");
  await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, value: () => Promise.resolve(location.origin + "/sf/") }), 0`);
  check("?tune= opens it, moved to C", await wait(`document.querySelector('.pcs-title').textContent === 'Lightly Row' && [...document.querySelectorAll('.pcs-chords .pcs-big')].map(x => x.dataset.c).join(' ') === 'C G7'`),
    await ev(`[...document.querySelectorAll('.pcs-chords .pcs-big')].map(x => x.dataset.c).join(' ')`));
  check("score drawn", await wait(`document.querySelectorAll('.pcs-score .abcjs-note').length > 10`));
  check("jam card drawn in the frame", await wait(`(() => { try { const d = document.querySelector('.pcs-frame').contentDocument; return d.querySelectorAll('#sheet-output svg').length > 0 && document.querySelector('.pcs-frame').offsetHeight > 50; } catch (e) { return false; } })()`, 120));
  await ev(`document.querySelector('.pcs-key').value = 'asis', document.querySelector('.pcs-key').dispatchEvent(new Event('change')), 0`);
  check("As written keeps Bb F7", await ev(`[...document.querySelectorAll('.pcs-chords .pcs-big')].map(x => x.dataset.c).join(' ') === 'Bb F7'`));
  await ev(`document.querySelector('.pcs-key').value = 'easy', document.querySelector('.pcs-key').dispatchEvent(new Event('change')), document.querySelector('.pcs-play').click(), 0`);
  check("playing lights the chord now", await wait(`!!document.querySelector('.pcs-chords .pcs-now')`, 120));
  check("and the one next", await wait(`!!document.querySelector('.pcs-chords .pcs-next')`, 80));
  await ev(`document.querySelector('.pcs-play').click(), 0`);
  check("stop clears", await ev(`!document.querySelector('.pcs-chords .pcs-now') && /Play/.test(document.querySelector('.pcs-play').textContent)`));

  // walk-through: chords one at a time, then the tune piece by piece with fingers
  check("walk starts on chord 1", await ev(`/Step 1 of 3/.test(document.querySelector('.pcs-wcount').textContent) && document.querySelector('.pcs-wstep .pcs-big').textContent === 'C'`));
  await ev(`document.querySelector('.pcs-wnext').click(), 0`);
  check("chord 2 step names G7 and C", await ev(`/G7/.test(document.querySelector('.pcs-wstep').textContent) && /C/.test(document.querySelector('.pcs-wstep b').textContent)`));
  await ev(`document.querySelector('.pcs-wstep .pcs-wplay').click(), 0`);
  check("Practise plays", await wait(`/Stop/.test(document.querySelector('.pcs-wstep .pcs-wplay').textContent) && !!AbcPlay.playing()`, 60));
  await ev(`document.querySelector('.pcs-wstep .pcs-wplay').click(), 0`);
  await ev(`document.querySelector('.pcs-wtabs button[data-m="tune"]').click(), 0`);
  check("tune pieces of 2 bars: 8 pieces + all", await ev(`/of 9/.test(document.querySelector('.pcs-wcount').textContent)`), await ev(`document.querySelector('.pcs-wcount').textContent`));
  check("piece drawn with finger numbers", await wait(`document.querySelectorAll('.pcs-wscore .abcjs-note').length >= 4 && /[1-5]/.test([...document.querySelectorAll('.pcs-wscore text')].map(t => t.textContent).join(''))`));
  const fin = await ev(`(() => { const b = 'CDEF | GFED | C2 c2', a = PianoFingering.notes(b, 'K:C'); return PianoFingering.write(b, a, PianoFingering.finger(a, 'positions')); })()`);
  check("five-finger rule: C..G = 1..5, jump to c", fin === (NEG ? "x" : '!1!C!2!D!3!E!4!F | !5!G!4!F!3!E!2!D | !1!C2 !1!c2'), fin);
  check("Fingering menu: four systems, Home position first", await ev(`[...document.querySelectorAll('.pcs-wsys option')].map(o => o.value).join()`) === "home,scale,positions,rules");
  const firstF = () => ev(`[...document.querySelectorAll('.pcs-wscore text')].map(t => t.textContent).filter(t => /^[1-5]$/.test(t))[0]`);
  await ev(`(() => { const i = document.querySelector('.pcs-wfing input'); i.value = '3'; i.dispatchEvent(new Event('input')); })(), 0`);
  check("a typed finger replaces the system's", await wait(`[...document.querySelectorAll('.pcs-wscore text')].map(t => t.textContent).filter(t => /^[1-5]$/.test(t))[0] === '3'`), await firstF());
  check("the count says how many fingers for how many notes", /1 fingers for \d+ notes/.test(await ev(`document.querySelector('.pcs-wfing span.pcs-whint').textContent`)));
  await ev(`document.querySelector('.pcs-wfing button').click(), 0`);
  check("Clear brings the system's back", await ev(`!localStorage.getItem('pcs-fingers') || localStorage.getItem('pcs-fingers') === '{}'`));
  const nShown = () => ev(`[...document.querySelectorAll('.pcs-wscore text')].filter(t => /^[1-5]$/.test(t.textContent.trim())).length`);
  await ev(`(() => { const s = document.querySelector('.pcs-wview select'); s.value = 'all'; s.dispatchEvent(new Event('change')); })(), 0`);
  const nAll = await nShown();
  await ev(`(() => { const s = document.querySelector('.pcs-wview select'); s.value = 'shifts'; s.dispatchEvent(new Event('change')); })(), 0`);
  const nSh = await nShown();
  check("Only shifts shows fewer fingers than All", nSh >= 1 && nSh < nAll, nSh + " of " + nAll);
  check("shifts known by PianoFingering.shifts", await ev(`PianoFingering.shifts(PianoFingering.notes('C G A G F', 'K:C'), [1,4,5,4,4]).join()`) === (NEG ? "x" : "false,false,false,false,true"));
  await ev(`(() => { const s = document.querySelector('.pcs-wview select'); s.value = 'marked'; s.dispatchEvent(new Event('change')); })(), 0`);
  await ev(`document.querySelector('.pcs-wlen select').value = '1', document.querySelector('.pcs-wlen select').dispatchEvent(new Event('change')), 0`);
  check("1-bar pieces: 16 + all", await ev(`/of 17/.test(document.querySelector('.pcs-wcount').textContent)`), await ev(`document.querySelector('.pcs-wcount').textContent`));
  await ev(`document.querySelector('.pcs-wstep .pcs-wplay').click(), 0`);
  check("Hear it plays", await wait(`!!AbcPlay.playing()`, 60));
  await ev(`AbcPlay.stop(), 0`);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
