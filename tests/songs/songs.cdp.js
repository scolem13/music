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
  check("numbered title", await ev(`document.querySelector('h1.title').firstChild.textContent`) === "2. Winter Wonderland");
  check("list gone, song in", await ev(`!document.getElementById('all-songs') && document.querySelectorAll('#song-body section.level2').length > 5`));
  check("lyrics classes", await ev(`document.body.classList.contains('lyrics') && document.body.classList.contains('has-chords')`));
  check("chords over words", await ev(`document.querySelectorAll('#song-body .ch').length > 20`));
  check("Sections list in the sidebar", await wait(`!!document.querySelector('#quarto-margin-sidebar .song-sections')`));
  const prev = await ev(`(document.querySelector('.songnav .nav-prev') || {}).href || ''`), next = await ev(`(document.querySelector('.songnav .nav-next') || {}).href || ''`);
  check("prev / next inside the programme", /id=deck-the-halls&prog=conrad-2026/.test(prev) && /id=santa-claus-is-coming-to-town&prog=conrad-2026/.test(next), prev + " " + next);
  check("band ready", await wait(`!!window.carolBandAbc`, 160) && await ev(`!!document.querySelector('.band-panel')`));
  // Playback key: the Key menu moves the chords over the words and the band; - and + step it; back to as written.
  const ch0 = await ev(`[...document.querySelectorAll('#song-body .ch')].slice(0, 6).map(e => e.textContent).join(' ')`);
  check("Key menu in the band panel", await ev(`document.querySelectorAll('.band-key select option').length === 13`));
  await ev(`(() => { const s = document.querySelector('.band-key select'); s.value = '2'; s.dispatchEvent(new Event('change')); })()`);
  const ch2 = await ev(`[...document.querySelectorAll('#song-body .ch')].slice(0, 6).map(e => e.textContent).join(' ')`);
  check("chords up a tone", ch2 !== ch0 && await ev(`SongKey.chord('Bb/D', 2) === 'C/E' && SongKey.shift === 2`), ch0 + " -> " + ch2);
  check("written chord kept for matching", await ev(`SongKey.text(document.querySelector('#song-body .ch')) === ${JSON.stringify(ch0.split(' ')[0])}`));
  await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }))`);
  check("- steps down", await ev(`SongKey.shift === 1 && document.querySelector('.band-key select').value === '1'`));
  await ev(`SongKey.set(0)`);
  check("Lead-in box, on by default", await ev(`!!document.querySelector('.band-leadin input:checked') && SongLeadIn.on`));
  await ev(`SongLeadIn.draw(document.querySelector('#song-body section.level2'), [{ id: 0, beats: 4 }, { id: 1, beats: 4 }], null, 'Next'); SongLeadIn.light(1, 2)`);
  check("lead-in drawn and lit", await ev(`document.querySelector('.vid-dots').textContent.startsWith('\u2022\u2022\u2022\u2022|') && document.querySelectorAll('.vid-dot.past').length === 6`));
  await ev(`SongLeadIn.clear()`);
  check("back to as written", await ev(`[...document.querySelectorAll('#song-body .ch')].slice(0, 6).map(e => e.textContent).join(' ')`) === ch0);
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
  // the printed grid lights its chord one by one: Intro (add instruments) bar 4 is E7 . D A
  await ev(`(() => { const b = SONGS.songs['take-me-to-the-river'].video.bars; window.__t = b[7] + 0.6 * (b[8] - b[7]); })()`);
  check("video: grid chord lit (D in E7 . D A)", await wait(`(document.querySelector('#intro-add-instruments .gch.now') || {}).textContent === 'D'`),
    await ev(`(document.querySelector('.gch.now') || {}).textContent`));
  check("video: one grid chord lit", await ev(`document.querySelectorAll('.gch.now').length === 1`));
  check("solos on E7 only", await ev(`[...document.querySelectorAll('#solo-1 .gch')].every(c => c.textContent === 'E7')`));
  check("no errors with the video", errs().length === 0, errs().join(" | "));
  check("gig view link on a song", await ev(`/gig=1/.test((document.querySelector('h1.title a.gig-link')||{}).href||'')`));
  // Gig view (&gig=1): this section + next, pedal (carolNext) steps, past the end the next song in the set; Glance fits the song.
  b.errors.length = 0; await b.resize(390, 800);
  await b.goto(U + "?id=o-hanukkah&prog=conrad-2026&gig=1");
  check("gig view up", await wait(`!!document.querySelector('#gig .gig-now .gig-name')`));
  check("gig: the first section's notation drawn without moving", await wait(`!!document.querySelector('#gig .gig-abc svg')`));
  check("gig: set place and first line", await ev(`/^4 \\/ 11/.test(document.querySelector('.gig-set').textContent) && /\\p{L}/u.test((document.querySelector('.gig-next .gig-first')||{}).textContent||'')`));
  check("gig: notation where the song has it, no grid then", await wait(`!!document.querySelector('#gig .gig-abc svg') && !document.querySelector('#gig .gig-now .gig-gbar')`));
  check("gig: bars folded away", await ev(`!document.querySelector('#gig .gig-top').offsetHeight && !document.querySelector('#gig .gig-bar').offsetHeight`));
  await ev(`document.querySelector('.gig-more').click()`);
  check("gig: ⋯ shows the bars", await ev(`document.querySelector('#gig .gig-top').offsetHeight > 0 && document.querySelector('#gig .gig-bar').offsetHeight > 0`));
  check("gig: site background, not black", await ev(`getComputedStyle(document.getElementById('gig')).backgroundColor !== 'rgb(0, 0, 0)'`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/gig-section.png", false);
  const n0 = await ev(`document.querySelector('.gig-now .gig-name').textContent`); await ev(`carolNext()`); await b.sleep(300);
  check("gig: portrait notation fits its room (two bars a line only when that fits)", await ev(`(x => x && x.getBoundingClientRect().bottom <= document.querySelector('#gig .gig-now').getBoundingClientRect().bottom + 2)(document.querySelector('#gig .gig-abc svg'))`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/gig-verse-portrait.png", false);
  check("gig: pedal steps", await ev(`document.querySelector('.gig-now .gig-name').textContent`) !== n0);
  await ev(`document.querySelector('.gig-mode').click()`);
  check("glance fits the whole song", await ev(`(a => !a.hidden && a.querySelectorAll('.ga').length > 3 && a.scrollHeight <= a.clientHeight + 1)(document.querySelector('.gig-all'))`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/gig-glance.png", false);
  await ev(`document.querySelector('.gig-zoom [data-z="1"]').click()`);
  check("glance zoom", await ev(`parseFloat(document.querySelector('.gig-all').style.fontSize) > 0`));
  await ev(`document.querySelector('.gig-zoom [data-z="0"]').click(); localStorage.removeItem('songs-gig-mode')`);
  await b.goto(U + "?id=twelve-days-of-christmas&prog=conrad-2026&gig=1");
  await b.goto(U + "?id=jingle-bell-rock&prog=conrad-2026&gig=1"); await wait(`!!document.getElementById('gig')`); await ev(`carolNext()`);
  check("gig: grid from the song's data, before the band is up", await ev(`document.querySelectorAll('#gig .gig-now .gig-gbar').length === 16`));
  check("gig: grid above the words, as many lines as fit", await ev(`(() => { const g = document.querySelector('#gig .gig-grid'), l = document.querySelector('#gig .gig-lyrics'); return !!g && !!l && g.getBoundingClientRect().bottom <= l.getBoundingClientRect().top + 1 && l.querySelectorAll('.gig-first').length >= 3 && l.scrollHeight <= l.clientHeight + 1; })()`), String(await ev(`document.querySelectorAll('#gig .gig-lyrics .gig-first').length`)));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/jbr-verse.png", false);
  await ev(`localStorage.setItem('songs-gig-grid', 'quarters')`);
  await b.goto(U + "?id=merry-christmas-bells&prog=conrad-2026&gig=1"); await wait(`!!document.querySelector('#gig .gig-abc svg')`, 120);
  const lines = () => ev(`document.querySelectorAll('#gig .gig-abc svg .abcjs-staff-wrapper, #gig .gig-abc svg g.abcjs-staff-wrapper').length || [...document.querySelectorAll('#gig .gig-abc svg path.abcjs-top-line')].length`);
  check("gig: Merry Christmas Bells intro two bars a line in portrait", await lines() === 4, String(await lines()));
  check("gig: ... and it fits", await ev(`document.querySelector('#gig .gig-abc svg').getBoundingClientRect().bottom <= document.querySelector('#gig .gig-now').getBoundingClientRect().bottom + 1`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/bells-2.png", false);
  await ev(`carolNext()`); await b.sleep(300);
  check("gig: Bells verse, busy bars in quarters, nothing runs over", await ev(`document.querySelectorAll('#gig .gig-gbar.gig-four').length >= 3 && [...document.querySelectorAll('#gig .gig-gbar, #gig .gig-q')].every(x => x.scrollWidth <= x.clientWidth + 1 && x.scrollHeight <= x.clientHeight + 1)`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/bells-verse.png", false);
  await ev(`carolPrev()`);
  await ev(`document.querySelector('.gig-more').click(); document.querySelector('.gig-bars').click(); document.querySelector('.gig-bars').click()`);
  check("gig: Bars button: as written", await ev(`document.querySelector('.gig-bars').textContent`) === "Bars: as written" && await lines() === 2, String(await lines()));
  await ev(`document.querySelector('.gig-bars').click(); document.querySelector('.gig-more').click()`);
  await b.goto(U + "?id=twelve-days-of-christmas&prog=conrad-2026&gig=1");
  check("gig: chord grid where there is no notation", await wait(`document.querySelectorAll('#gig .gig-now .gig-gbar').length > 0 && !document.querySelector('#gig .gig-abc')`));
  check("gig: every chord fits its grid bar (compact / stacked / smaller)", await ev(`[...document.querySelectorAll('#gig .gig-gbar')].every(x => x.scrollWidth <= x.clientWidth + 1 && x.scrollHeight <= x.clientHeight + 1)`));
  check("gig: a two-chord bar split by a diagonal", await ev(`!!document.querySelector('#gig .gig-gbar.gig-two')`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/gig-fit.png", false);
  await ev(`carolNext(); carolNext()`); await b.sleep(300);
  check("gig: Twelve Days third day shows the 3/4 bar and the return to 4/4", await ev(`[...document.querySelectorAll('#gig .gig-meter')].map(x => x.title).join(' ')`) === "3/4 4/4", await ev(`[...document.querySelectorAll('#gig .gig-meter')].map(x => x.title).join(' ')`));
  check("gig: bars all one width, short rows too", await ev(`(w => w.every(x => Math.abs(x - w[0]) < 2))([...document.querySelectorAll('#gig .gig-gbar')].map(x => x.getBoundingClientRect().width))`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/twelve-3.png", false);
  await ev(`localStorage.removeItem('songs-gig-grid')`);
  await b.goto(U + "?id=o-tannenbaum-o-christmas-tree&prog=conrad-2026&gig=1"); await wait(`!!document.getElementById('gig')`);
  await ev(`carolNext(); carolNext()`); await b.sleep(300);
  check("gig: Oh Christmas Tree, 3/4 bars cut by beats (Em a third, A7 two thirds)", await ev(`[...document.querySelectorAll('#gig .gig-gbar.gig-beats')].some(x => /^minmax\\(0(px)?, 1fr\\) minmax\\(0(px)?, 2fr\\)$/.test(x.style.gridTemplateColumns) && /Em/.test(x.children[0].textContent))`));
  check("gig: beats, nothing runs over", await ev(`[...document.querySelectorAll('#gig .gig-gbar, #gig .gig-q')].every(x => x.scrollWidth <= x.clientWidth + 1 && x.scrollHeight <= x.clientHeight + 1)`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/tree-beats.png", false);
  await b.resize(360, 780); await b.goto(U + "?id=twelve-days-of-christmas&prog=conrad-2026&gig=1&at=end"); await wait(`!!document.querySelector('#gig .gig-gbar.gig-beats')`);
  const spill = `[...document.querySelectorAll('#gig .gig-gbar')].some(bar => [...bar.querySelectorAll('.gig-q, .gig-c')].some(x => { const r = x.getBoundingClientRect(), o = bar.getBoundingClientRect(); return r.right > o.right + 1 || r.left < o.left - 1; }))`;
  const overlap = `[...document.querySelectorAll('#gig .gig-meter')].some(m => { const n = m.nextElementSibling, c = n && (n.querySelector('.gig-c') || n); return c && c.getBoundingClientRect().left < m.getBoundingClientRect().right - 1; })`;
  check("gig: Twelfth Day at 360px in beats, no chord outside its bar", !(await ev(spill)));
  check("gig: ... and no time signature on top of a chord", !(await ev(overlap)));
  check("gig: ... and nothing runs over", await ev(`[...document.querySelectorAll('#gig .gig-q')].every(x => x.scrollWidth <= x.clientWidth + 1)`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/twelfth-360.png", false);
  await b.resize(390, 800); await b.goto(U + "?id=o-tannenbaum-o-christmas-tree&prog=conrad-2026&gig=1"); await wait(`!!document.getElementById('gig')`);
  await ev(`carolNext(); carolNext()`); await b.sleep(300);
  await ev(`document.querySelector('.gig-more').click(); document.querySelector('.gig-gridstyle').click()`);
  check("gig: Grid button switches to quarters", await ev(`document.querySelector('.gig-gridstyle').textContent === 'Grid: quarters' && !!document.querySelector('#gig .gig-gbar:not(.gig-beats)')`));
  check("gig: quarters, every bar the same height", await ev(`(h => h.every(x => Math.abs(x - h[0]) < 1.5))([...document.querySelectorAll('#gig .gig-gbar')].map(x => x.getBoundingClientRect().height))`));
  await b.goto(U + "?id=twelve-days-of-christmas&prog=conrad-2026&gig=1&at=end"); await wait(`!!document.querySelector('#gig .gig-gbar')`);
  check("gig: Twelfth Day in quarters, every bar the same height", await ev(`(h => h.length > 12 && h.every(x => Math.abs(x - h[0]) < 1.5))([...document.querySelectorAll('#gig .gig-gbar')].map(x => x.getBoundingClientRect().height))`));
  await ev(`document.querySelector('.gig-more').click()`);
  await ev(`document.querySelector('.gig-gridstyle').click(); document.querySelector('.gig-more').click()`);
  await b.resize(800, 390); await b.sleep(300);
  check("gig: landscape drops the section name", await ev(`!document.querySelector('#gig .gig-now > .gig-name').offsetHeight`));
  await b.goto(U + "?id=o-hanukkah&prog=conrad-2026&gig=1"); await wait(`!!document.querySelector('#gig .gig-abc svg')`); await ev(`carolNext()`); await b.sleep(400);
  check("gig: words in the notation, no first line", await ev(`!!document.querySelector('#gig .gig-abc svg') && !document.querySelector('#gig .gig-now .gig-first')`));
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/gig-land-verse.png", false);
  await b.resize(390, 800);
  if (process.env.SHOTS) { await b.resize(800, 390); await b.sleep(300); await b.shot(process.env.SHOTS + "/gig-land.png", false); await b.resize(390, 800); }
  await b.goto(U + "?id=o-hanukkah&prog=conrad-2026&gig=1"); await wait(`!!document.getElementById('gig')`);
  for (let k = 0; k < 40 && /o-hanukkah/.test(await ev(`location.search`)); k++) { await ev(`carolNext()`); await b.sleep(50); }
  check("gig: past the end, next song", await wait(`/id=jingle-bell-rock.*gig=1/.test(location.search) && !!document.getElementById('gig')`));
  check("no errors in gig view", errs().length === 0, errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
