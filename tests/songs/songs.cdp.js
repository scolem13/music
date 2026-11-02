// Words & Chords (songs/index.qmd, apps/shared/songs/song-page.js, data apps/shared/data/songs.js from scripts/songs/build.py):
// the list shows every programme and song; ?id= draws one song with its Sections list, keys, band and prev / next inside its
// programme; a programme's version (or ?ver=) relabels the chords; the teacher switch; an unknown id; and the Tune
// Directory's Song rows. Render first:
//   python3 scripts/songs/build.py && quarto render songs/index.qmd && quarto render practice/tune-directory.qmd
//   node tests/songs/songs.cdp.js        (SITE=<dir> tests a render made elsewhere; NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split(/[?#]/)[0]); if (u.endsWith("/")) u += "index.html";
  const f = path.join(SITE, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8563);
const U = "http://127.0.0.1:8563/songs/";
global.window = {}; require(SITE + "/apps/shared/data/songs.js"); const DATA = window.SONGS;
const NSONGS = Object.keys(DATA.songs).length + (process.env.NEG ? 1 : 0);
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  const errs = () => b.errors.filter(e => !/favicon|404|supabase|Failed to load resource/i.test(e));
  await b.resize(1300, 900);

  await b.goto(U);
  check("every song in the list", await ev(`document.querySelectorAll('#all-songs tbody tr').length`) === NSONGS);
  check("each programme listed", await ev(`document.querySelectorAll('.programme li').length`) === DATA.programmes.reduce((n, p) => n + p.songs.length, 0));
  check("list sections fold", await wait(`document.querySelectorAll('section.sf').length >= 2`));
  check("no errors on the list", errs().length === 0, errs().join(" | "));

  b.errors.length = 0;
  await b.goto(U + "?id=winter-wonderland&prog=conrad-2026");
  check("numbered title", await ev(`document.querySelector('h1.title').textContent`) === "2. Winter Wonderland");
  check("list gone, song in", await ev(`!document.getElementById('all-songs') && document.querySelectorAll('#song-body section.level2').length > 5`));
  check("lyrics classes", await ev(`document.body.classList.contains('lyrics') && document.body.classList.contains('has-chords')`));
  check("chords over words", await ev(`document.querySelectorAll('#song-body .ch').length > 20`));
  check("Sections list in the sidebar", await wait(`!!document.querySelector('#quarto-margin-sidebar .song-sections')`));
  const prev = await ev(`(document.querySelector('.songnav .nav-prev') || {}).href || ''`), next = await ev(`(document.querySelector('.songnav .nav-next') || {}).href || ''`);
  check("prev / next inside the programme", /id=deck-the-halls&prog=conrad-2026/.test(prev) && /id=santa-claus-is-coming-to-town&prog=conrad-2026/.test(next), prev + " " + next);
  check("band ready", await wait(`!!window.carolBandAbc`, 160) && await ev(`!!document.querySelector('.band-panel')`));
  const first = await ev(`[...document.querySelectorAll('#song-body h2')].findIndex(h => h.classList.contains('current'))`);
  await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))`);
  const after = await ev(`[...document.querySelectorAll('#song-body h2')].findIndex(h => h.classList.contains('current'))`);
  check("j moves to the next section", after === first + 1, first + " -> " + after);
  check("no errors on a song", errs().length === 0, errs().join(" | "));
  const asWritten = await ev(`[...document.querySelectorAll('#song-body .ch')].map(c => c.textContent).join(' ')`);

  await b.goto(U + "?id=winter-wonderland&ver=Songbook");
  await wait(`!!window.carolBandAbc`, 160); await b.sleep(300);
  const songbook = await ev(`[...document.querySelectorAll('#song-body .ch')].map(c => c.textContent).join(' ')`);
  check("?ver= relabels the chords", songbook !== asWritten && songbook.length > 0);
  check("no programme: first one that has it", /prog=conrad-2026/.test(await ev(`document.querySelector('.songnav .nav-next').href`)));

  await b.goto(U + "?id=twelve-days-of-christmas");
  check("Twelve Days: gifts and days", await ev(`document.querySelectorAll('.gift').length >= 12 && document.querySelectorAll('#song-body section.level2').length === 12`));

  await b.goto(U + "?id=winter-wonderland&teacher=1");
  check("teacher view", await ev(`document.documentElement.classList.contains('teacher') && localStorage.getItem('site-teacher') === '1'`));
  await b.goto(U + "?id=winter-wonderland&teacher=0");
  check("student view", await ev(`!document.documentElement.classList.contains('teacher')`));

  await b.goto(U + "?id=no-such-song");
  check("unknown id says so, list stays", await ev(`/No song called/.test(document.getElementById('song-status').textContent) && !!document.getElementById('all-songs')`));

  await b.goto("http://127.0.0.1:8563/practice/tune-directory.html");
  await wait(`!!window.TdSheet`, 120);
  check("Tune Directory: a Song row each", await ev(`TdSheet.rows().filter(r => r.type === 'Song').length`) === NSONGS);
  check("Tune Directory: Words & Chords list", await ev(`document.querySelectorAll('#td-songs-list li').length`) === NSONGS);

  // the recording's video (song.video): bar counts by the headings and in the sidebar, the last two bars as beats,
  // the next section's pickup over the final beats. YouTube is replaced by a clock the test sets (window.__t).
  b.errors.length = 0;
  await b.goto(U + "?id=take-me-to-the-river");
  check("video: bar counts by the headings", await wait(`(document.querySelector('#verse-1 .vid-bars') || {}).textContent === '\u2014 8 bars'`),
    await ev(`(document.querySelector('#verse-1 .vid-bars') || {}).textContent`));
  check("video: bar counts in the sidebar", await wait(`[...document.querySelectorAll('.song-sections .vid-bars')].length >= 15`));
  await ev(`window.__t = 56; window.YT = { Player: function (id, o) { this.getCurrentTime = () => window.__t; this.seekTo = t => window.__t = t; this.playVideo = () => { window.__played = (window.__played || 0) + 1; this.st = 1; }; this.pauseVideo = () => { this.st = 2; }; this.getPlayerState = () => this.st || 5; setTimeout(o.events.onReady, 10); } }; document.querySelector('.vid-open').click()`);
  check("video: active section y/x", await wait(`(document.querySelector('#verse-1 .vid-bars') || {}).textContent === '\u2014 7/8 bars'`),
    await ev(`(document.querySelector('#verse-1 .vid-bars') || {}).textContent`));
  check("video: last two bars as ....|....", await ev(`document.querySelector('#verse-1 .vid-dots').textContent.slice(0, 9)`) === "\u2022\u2022\u2022\u2022|\u2022\u2022\u2022\u2022");
  check("video: a beat lit", await wait(`document.querySelectorAll('#verse-1 .vid-dot.on').length === 1`));
  check("video: pickup 'I wanna' over the last beats", await ev(`(document.querySelector('#verse-1 .pick-start') || {}).dataset?.pick`) === "I wanna");
  check("video: 'I wanna' on 2 beats", await ev(`document.querySelectorAll('#verse-1 .vid-dot.pick').length`) === 2);
  await ev(`window.__t = 67`);
  check("video: 'Take me to the' on the last 2 beats before the chorus", await wait(`(document.querySelector('#pre-chorus-1 .pick-start') || {}).dataset?.pick === 'Take me to the'`)
    && await ev(`[...document.querySelectorAll('#pre-chorus-1 .vid-dot')].slice(-2).every(d => d.classList.contains('pick')) && document.querySelectorAll('#pre-chorus-1 .vid-dot.pick').length === 2`));
  await ev(`window.__played = 0; document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))`);
  check("video: Space plays the video, not the band", await ev(`window.__played === 1 && !(window.carolBand && window.carolBand.playing())`), await ev(`window.__played + ' ' + window.carolBand.playing()`));
  await ev(`[...document.querySelectorAll('.song-sections li')][5].querySelector('button').click()`);
  check("video: a sidebar section seeks the video", await ev(`Math.abs(window.__t - 68.51) < 0.05`), await ev(`window.__t`));
  check("no errors with the video", errs().length === 0, errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
