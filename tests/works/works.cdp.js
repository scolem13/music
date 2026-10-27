// Works: the Tune Directory (practice/tune-directory.qmd), and the Recordings & resources panel (apps/shared/works/works.js) on the
// Tune Library (?tune=), Classical Themes (?theme=) and an analysed score (?piece=). Run after rendering those pages:
//   quarto render practice/tune-directory.qmd practice/tunes.qmd tools/classical-themes.qmd tools/timestamp-notes.qmd practice/assessment-tune.qmd theory/analysed-scores/beethoven-moonlight-1.qmd
//   node tests/works/works.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".txt") ? "text/plain; charset=utf-8" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8547);
const U = "http://127.0.0.1:8547";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);

  // the directory
  await b.goto(U + "/practice/tune-directory.html");
  await wait(`document.querySelectorAll('.td-row').length > 3000`);
  const counts = await ev(`[document.querySelector('#td-works-n').textContent, document.querySelector('#td-tunes-n').textContent, document.querySelector('#td-themes-n').textContent, document.querySelectorAll('.td-work').length].join(' | ')`);
  check("directory lists pieces, tunes and themes", /^\d+ pieces \| [\d,]+ tunes in \d+ sets \| 2,067 themes by \d+ composers \| \d+$/.test(counts), counts);
  const search = await ev(`(() => { const q = document.querySelector('#td-q'); q.value = 'autumn leaves'; q.dispatchEvent(new Event('input')); return new Promise(r => setTimeout(() => r(
    document.querySelector('#td-stat').textContent + ' | ' + [...document.querySelectorAll('.td-group')].filter(d => !d.hidden).map(d => d.querySelector('.td-gname').textContent + ':' + d.querySelector('.td-count').textContent).join(',')), 300)); })()`);
  check("search narrows and opens the groups", /^\d+ match/.test(search) && /Standards:3 of/.test(search), search);
  const badge = await ev(`[...document.querySelectorAll('.td-row')].filter(r => !r.hidden && r.querySelector('.td-badge')).length`);
  check("tunes in a piece carry a badge", badge >= 4, String(badge));
  const errs = await ev(`document.querySelectorAll('.wk-err').length`);
  check("no recording shows an error", errs === 0, String(errs));

  await ev(`(() => { const q = document.querySelector('#td-q'); q.value = ''; q.dispatchEvent(new Event('input')); })()`);
  await wait(`/^739 songs/.test(document.querySelector('#td-bb-n').textContent)`);
  const bb = await ev(`[...document.querySelectorAll('#td-billboard-list a')].length + ' | ' + document.querySelector('#td-billboard-list a').getAttribute('href')`);
  check("directory lists the 739 Billboard songs, linked to Timestamp Notes", /^739 \| \/tools\/timestamp-notes\.html\?salami=\d+$/.test(bb), bb);

  // Filter by music: Functions (any order), Progression (in order), tonal pattern by degrees
  await ev(`(() => { const d = document.querySelector('#td-music'); d.open = true; d.dispatchEvent(new Event('toggle')); })()`);
  await wait(`!!document.querySelector('#td-picker .tl-mini-search')`, 200);
  const box = (ph, v) => ev(`(() => { const i = [...document.querySelectorAll('#td-picker .tl-mini-search')].find(x => x.placeholder.startsWith(${JSON.stringify(ph)}));
    i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('input')); return document.querySelector('#td-stat').textContent; })()`);
  const nums = (t) => +String(t).replace(/,/g, "").split(" ")[0] || 0;
  const fn = await box("Functions", "IV V I"), fnRev = await box("Functions", "I V IV");
  check("Functions: any order (I V IV finds the same as IV V I)", nums(fn) > 0 && fn === fnRev, fn + " / " + fnRev);
  await box("Functions", "");
  const pr = await box("Progression", "IV V I"), prRev = await box("Progression", "I V IV");
  check("Progression: in order (IV V I differs from I V IV, fewer than Functions)", nums(pr) > 0 && pr !== prRev && nums(pr) < nums(fn), pr + " / " + prRev);
  const bbShown = await ev(`[...document.querySelectorAll('#td-billboard-list .td-row')].filter(r => !r.hidden).length`);
  check("Progression searches the Billboard songs too", bbShown > 0, String(bbShown));
  await box("Progression", "");
  const deg = await box("Tonal pattern", "1 b3 5"), syl = await box("Tonal pattern", "Do Me So");
  check("tonal pattern by degree = by syllable (1 b3 5 = Do Me So)", nums(deg) > 0 && deg === syl, deg + " / " + syl);
  const bbHidden = await ev(`[...document.querySelectorAll('#td-billboard-list .td-row')].every(r => r.hidden)`);
  check("a tonal pattern leaves the Billboard songs out", bbHidden);
  await box("Tonal pattern", "");

  // Timestamp Notes ?salami= (a SALAMI chords file from the Billboard set: sections stamped, chords and bars in)
  await b.goto(U + "/tools/timestamp-notes.html");
  await ev(`localStorage.clear()`);
  await b.goto(U + "/tools/timestamp-notes.html?salami=1051");
  await wait(`/My Kinda Lover/.test((document.querySelector('.btp-bb-now') || {}).textContent || '')`);
  await b.sleep(800);
  const ts = await ev(`[document.querySelector('.btp-bb-now').textContent.slice(0, 48), [...document.querySelectorAll('textarea')].some(t => /\{comment: Pre-chorus\}/.test(t.value)), (document.body.innerText.match(/85 bars/) || [''])[0]].join(' | ')`);
  check("?salami= opens a Billboard song with its sections, chords and bar map", /^Billboard: My Kinda Lover — Billy Squier \(1982\)\. \| true \| 85 bars$/.test(ts), ts);
  const bbSearch = await ev(`(() => { document.querySelector('.btp-bb-open').click(); const q = document.querySelector('.btp-bb input'); q.value = 'beatles'; q.dispatchEvent(new Event('input'));
    return new Promise(r => setTimeout(() => r(document.querySelector('.btp-bb-info').textContent), 500)); })()`);
  check("Billboard… searches the set", /^\d+ songs?$/.test(bbSearch) && bbSearch !== "0 songs", bbSearch);

  // Tune Assessment: the same boxes, renamed
  await b.goto(U + "/practice/assessment-tune.html");
  await wait(`document.querySelectorAll('.tl-mini-search').length >= 3`, 200);
  const ph = await ev(`[...document.querySelectorAll('.tl-mini-search')].map(i => i.placeholder).join(' | ')`);
  check("Tune Assessment has Functions and Progression", /Functions.*\| Progression/.test(ph) && !/Chords e\.g\./.test(ph), ph);

  // Tune Library ?tune=
  await b.goto(U + "/practice/tunes.html?tune=autumn-leaves-3");
  await wait(`!!document.querySelector('#tune-works .wk-panel')`);
  const tl = await ev(`document.querySelector('#collection-selector').value + ' | ' + document.querySelector('#tune-selector').selectedOptions[0].textContent + ' | ' + document.querySelectorAll('#tune-works .wk-also a').length`);
  check("?tune= opens the tune and its panel, with the other three versions", /^Standards \| Autumn leaves \| 3$/i.test(tl), tl);
  await ev(`(() => { const s = document.querySelector('#tune-selector'); s.selectedIndex = 0; s.dispatchEvent(new Event('change')); })()`);
  await b.sleep(400);
  check("a tune with no piece hides the panel", await ev(`document.querySelector('#tune-works').hidden`));

  // Classical Themes ?theme=
  await b.goto(U + "/tools/classical-themes.html?theme=0887");
  await wait(`document.querySelectorAll('.ct-card').length === 1 && !!document.querySelector('.ct-card .wk-panel')`);
  const th = await ev(`document.querySelector('#ct-count').textContent + ' | ' + document.querySelectorAll('.ct-card .wk-rec').length + ' | ' + document.querySelector('.ct-card .wk-also').textContent`);
  check("?theme= shows one theme with its piece's panel", /^1 themes? \| \d+ \| Also in.*Analysed score/.test(th), th);
  await b.goto(U + "/tools/classical-themes.html?theme=0172");
  await wait(`document.querySelectorAll('.ct-card').length === 1 && !!document.querySelector('.ct-card .wk-play')`);
  const yt = await ev(`(() => { const b = document.querySelector('.ct-card .wk-play'); if (!b) return 'no recording'; b.click(); const f = document.querySelector('.ct-card .wk-yt'); return (f ? f.src : 'no iframe') + ' | ' + b.textContent; })()`);
  check("▶ opens the YouTube player", /youtube-nocookie\.com\/embed\/[\w-]{11}.*\| ■$/.test(yt), yt);

  // Analysed score
  await b.goto(U + "/theory/analysed-scores/beethoven-moonlight-1.html?piece=beethoven-moonlight-1");
  await wait(`!!document.querySelector('.as-works .wk-panel')`);
  const as = await ev(`[...document.querySelectorAll('.as-works .wk-also a')].map(a => a.getAttribute('href')).join(' ')`);
  check("analysed score has the panel, linking to the theme", /classical-themes\.html\?theme=0887/.test(as), as);

  // r2 without a bucket, and with one
  const r2 = await ev(`JSON.stringify([Works.source({ r2: 'a b/c.mp3' }), (Works.config.r2Base = 'https://media.example.com/', Works.source({ r2: 'a b/c.mp3', start: '1:05' })), Works.source({ yt: 'https://youtu.be/vcBJLdKtaOQ?t=610' })])`);
  check("sources: r2 waits for the bucket, then builds its URL; YouTube start from t=", r2 === JSON.stringify([{ kind: "missing", why: "the recordings bucket is not set up yet" },
    { kind: "audio", url: "https://media.example.com/a%20b/c.mp3", start: 65, end: 0 }, { kind: "yt", id: "vcBJLdKtaOQ", start: 610, end: 0 }]), r2);

  b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
