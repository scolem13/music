// The navbar's metronome / drone / circle on a song page (songs/?id=...), and the song page's count-in default.
//   quarto render songs/index.qmd && node tests/songs/widgets.cdp.js     (SITE=<dir> for a render made elsewhere; NEG=1 must fail)
// Checks: "From page" reads the song's key / tempo / meter (window.PAGE_MUSIC, practice-widgets.js pageInfo) for the metronome,
// drone and circle, and is greyed out on a song with none; the beat unit menu (note symbols, "= 84", same speed on change),
// mix rows as note symbols, user tuplets, the multi-meter note; the circle panel bigger, with the sharps / flats menu;
// a song with an intro before the first sung line starts with Count-in "None" (a saved choice wins).
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = +process.env.PORT || 8572;
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split(/[?#]/)[0]); if (u.endsWith("/")) u += "index.html";
  const f = path.join(SITE, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const U = `http://127.0.0.1:${PORT}/songs/`;
global.window = {}; require(SITE + "/apps/shared/data/songs.js"); const DATA = window.SONGS.songs;
// songs whose arrangement opens with an intro before the first sung line (same rule as introFirst() in song-page.js)
const INTRO = Object.keys(DATA).filter(k => { const d = new (require("util").TextDecoder)(); const html = DATA[k].html;
  for (const sec of html.split(/<section /).slice(1)) { const h = /<h2[^>]*>(.*?)<\/h2>/.exec(sec); if (h && /^\s*intro/i.test(h[1])) return true;
    if (/class="ln"/.test(sec) && /[A-Za-z]{2,}/.test(sec.replace(/<span class="ch">.*?<\/span>/g, "").replace(/<[^>]+>/g, ""))) return false; } return false; });
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (name, ok, info) => { if (process.env.NEG && name === "NEG") ok = !ok; console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), wait = async (c, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(c)) return true; await b.sleep(150); } return false; };
  const errs = () => b.errors.filter(e => !/favicon|404|supabase|Failed to load resource/i.test(e));
  await b.resize(1300, 1000);
  const open = async (w, btn) => { await ev(`document.querySelector('#pw-nav a[aria-label="${w}"]').click()`); await b.sleep(150); };

  // --- a song with a key, a tempo and a meter: deck the halls (D, 112, 4/4)
  await b.goto(U + "?id=deck-the-halls");
  check("song publishes PAGE_MUSIC", await wait(`!!window.PAGE_MUSIC && window.PAGE_MUSIC.key === 'D'`), JSON.stringify(await ev(`window.PAGE_MUSIC`)));
  await wait(`!!document.getElementById('pw-metro')`);
  await ev(`document.querySelector('#pw-nav a[aria-label="Metronome"]').click()`);
  check("metronome: From page enabled", await ev(`!document.getElementById('pw-from-page').disabled`));
  await ev(`document.getElementById('pw-from-page').click()`);
  const tempoNow = +(await ev(`document.getElementById('pw-bpm').textContent`));
  check("metronome: took 112 bpm", tempoNow === 112, "" + tempoNow);
  check("metronome: took 4 beats", await ev(`document.getElementById('pw-beats').value`) === "4");
  // unit
  check("unit button shows a drawn note", await ev(`!!document.querySelector('#pw-unit-btn svg')`));
  check("unit menu lists whole .. sixteenth", await ev(`document.querySelectorAll('#pw-unit-menu button').length`) >= 5);
  await ev(`document.querySelector('#pw-unit-menu button[data-id="8"]').click()`);
  check("eighth unit: same speed = 224", +(await ev(`document.getElementById('pw-bpm').textContent`)) === 224);
  await ev(`document.getElementById('pw-from-page').click()`);
  check("From page in eighths converts (224)", +(await ev(`document.getElementById('pw-bpm').textContent`)) === 224);
  await ev(`document.querySelector('#pw-unit-menu button[data-id="4."]').click()`);
  check("dotted quarter unit: mix is the beat, 2, 3, 6", await ev(`document.querySelectorAll('#pw-mix .pw-mixic').length`) === 4 && +(await ev(`document.getElementById('pw-bpm').textContent`)) === 75);
  await ev(`document.querySelector('#pw-unit-menu button[data-id="4"]').click()`);
  check("mix rows are note symbols, no names", await ev(`[...document.querySelectorAll('#pw-mix .pw-mixic')].every(e => e.querySelector('svg')) && !/Quarter notes|Eighths|Triplets|Sixteenths/.test(document.getElementById('pw-mix').textContent)`));
  const rows0 = await ev(`document.querySelectorAll('#pw-mix .pw-mixic').length`);
  await ev(`document.getElementById('pw-tup').value = 5; document.getElementById('pw-tup-add').click()`);
  await ev(`document.getElementById('pw-tup').value = 7; document.getElementById('pw-tup-add').click()`);
  check("added tuplets 5 and 7 to the mix", await ev(`document.querySelectorAll('#pw-mix .pw-mixic').length`) === rows0 + 2);
  await ev(`document.getElementById('pw-tup').value = 3; document.getElementById('pw-tup-add').click()`);
  check("duplicate division refused", await ev(`document.querySelectorAll('#pw-mix .pw-mixic').length`) === rows0 + 2 && /already/.test(await ev(`document.getElementById('pw-mix-note').textContent`)));
  check("tuplet rows sound at 1/5.. and 1/7..", await ev(`(r => r.some(x => x.n === 5 && x.at.length === 4 && Math.abs(x.at[0] - 0.2) < 1e-9) && r.some(x => x.n === 7 && x.at.length === 6))(PracticeWidgets.metronome.rows())`));
  check("multi-meter note", /Multi-meter support is coming later/.test(await ev(`document.getElementById('pw-metro').textContent`)));
  check("tuplets kept", await ev(`JSON.parse(localStorage.getItem('practiceWidgets.v1')).tuplets.join()`) === "5,7");
  await ev(`document.querySelectorAll('#pw-mix .pw-mixx').forEach(x => x.click())`);
  check("tuplets removable", await ev(`document.querySelectorAll('#pw-mix .pw-mixic').length`) === rows0);
  // drone
  await ev(`document.querySelector('#pw-nav a[aria-label="Drone"]').click()`);
  check("drone: From page enabled", await ev(`!document.querySelector('#pw-drone #pw-drone-page').disabled`));
  await ev(`document.querySelector('#pw-drone #pw-drone-page').click()`);
  check("drone: Do = D", await ev(`PracticeWidgets.drone.state().droneDo`) === 2);
  // circle
  await ev(`document.querySelector('#pw-nav a[aria-label="Circle of fifths"]').click()`);
  check("circle: panel is wide", await wait(`document.getElementById('pw-circle').getBoundingClientRect().width >= 500`), "" + await ev(`document.getElementById('pw-circle').getBoundingClientRect().width`));
  check("circle: sharps / flats menu", await wait(`!!document.querySelector('#pw-circle select option[value="-3"]')`) && await ev(`document.querySelectorAll('#pw-circle select').length`) >= 3);
  check("circle: From page enabled", await ev(`!document.getElementById('pw-circle-page').disabled`));
  await ev(`document.getElementById('pw-circle-page').click()`);
  check("circle: key D major = 2 sharps", await wait(`PracticeWidgets.circle() && PracticeWidgets.circle().keySig() === 2`), "" + await ev(`PracticeWidgets.circle() && PracticeWidgets.circle().keySig()`));
  await ev(`const s=[...document.querySelectorAll('#pw-circle select')].find(x=>x.querySelector('option[value="-3"]')); s.value='-3'; s.dispatchEvent(new Event('change',{bubbles:true}))`);
  check("circle: menu sets 3 flats", await ev(`PracticeWidgets.circle().keySig()`) === -3);

  // --- a song with a minor key (O Hanukkah, Am): the key arrives as text the widgets understand
  await b.goto(U + "?id=o-hanukkah");
  await wait(`!!document.getElementById('pw-circle')`);
  await ev(`document.querySelector('#pw-nav a[aria-label="Drone"]').click()`);
  await ev(`document.querySelector('#pw-drone #pw-drone-page').click()`);
  check("drone: Am -> A", await ev(`PracticeWidgets.drone.state().droneDo`) === 9);

  // --- the keys written in for songs that had none
  const want = { "count-on-me": "C", "end-of-beginning": "D", notion: "Bm", "o-tannenbaum-o-christmas-tree": "D", "santa-claus-is-coming-to-town": "A", "silent-night": "F", "viva-la-vida": "Db", "we-wish-you-a-merry-christmas": "Eb", "frosty-the-snowman": "C" };
  check("every song has a key", Object.keys(DATA).every(k => DATA[k].key), Object.keys(DATA).filter(k => !DATA[k].key).join());
  check("inferred keys in the data", Object.keys(want).every(k => DATA[k].key === want[k]));
  await b.goto(U);
  check("list shows the keys", await wait(`[...document.querySelectorAll('#all-songs tbody tr')].every(r => /[A-G]/.test(r.textContent))`));

  // --- count-in default
  check("songs with an intro found", INTRO.length >= 5, INTRO.join(","));
  const bandSongs = Object.keys(DATA).filter(k => DATA[k].html.includes("band-chart") || true);
  for (const id of ["santa-claus-is-coming-to-town", "silent-night"]) {
    await ev(`localStorage.removeItem('carols-band')`);
    await b.goto(U + "?id=" + id);
    const got = await wait(`!!document.querySelector('.band-panel')`, 200) && await ev(`[...document.querySelectorAll('.band-panel label')].filter(l => /Count-in/.test(l.textContent)).map(l => l.querySelector('select').value)[0]`);
    const intro = INTRO.includes(id);
    check(`count-in default for ${id} (${intro ? "intro" : "no intro"})`, got === (intro ? "0" : "1"), "got " + got);
  }
  await ev(`localStorage.setItem('carols-band', JSON.stringify({'/songs/?id=santa-claus-is-coming-to-town': {count: '2'}}))`);
  await b.goto(U + "?id=santa-claus-is-coming-to-town");
  check("a saved count-in wins", await wait(`!!document.querySelector('.band-panel')`, 200) && await ev(`[...document.querySelectorAll('.band-panel label')].filter(l => /Count-in/.test(l.textContent)).map(l => l.querySelector('select').value)[0]`) === "2");

  // --- no key: From page greyed (a page with nothing to offer)
  await b.goto(U);
  await wait(`!!document.getElementById('pw-metro')`);
  await ev(`document.querySelector('#pw-nav a[aria-label="Drone"]').click()`);
  check("list page: drone From page greyed", await ev(`document.querySelector('#pw-drone #pw-drone-page').disabled`));
  check("no errors", errs().length === 0, errs().join(" | "));
  check("NEG", true);
  console.log(fails ? fails + " FAILED" : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
