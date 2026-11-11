// Works: the Tune Directory (practice/tune-directory.qmd), and the Recordings & resources panel (apps/shared/works/works.js) on the
// Tune Library (?tune=), Classical Themes (?theme=) and an analysed score (?piece=). Run after rendering those pages:
//   quarto render practice/tune-directory.qmd practice/tunes.qmd tools/classical-themes.qmd tools/timestamp-notes.qmd practice/assessment-tune.qmd theory/analysed-scores/beethoven-moonlight-1.qmd
//   node tests/works/works.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const NEG = !!process.env.NEG, ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
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
  // print anthologies: Cutler's figures by composer, years, theme links; #id of a print-only piece lands on its row; sheet columns
  const pa = await ev(`(() => { const n = document.querySelector("#td-print-n").textContent, rows = document.querySelectorAll('#td-print-list .td-row');
    const m = [...rows].find(r => /Moonlight/.test(r.textContent)) || {};
    return [n, rows.length, (m.textContent || '').replace(/\\s+/g, ' ').trim(), !!(m.querySelector && m.querySelector('a[href*="theme=0887"]'))].join(' | '); })()`);
  check("print anthologies: Cutler pieces with figure, year and theme link", /^1\d\d\d pieces \| 1\d\d\d \| .*Moonlight.*1801.*Cutler 23-2.*theme 887.* \| true$/.test(pa) !== NEG, pa);
  const tg = await ev(`(() => { const r = [...document.querySelectorAll('#td-print-list .td-row')].find(r => /Love Me Do/.test(r.textContent)); return r ? r.textContent.replace(/\\s+/g, ' ').trim() : ''; })()`);
  check("print anthologies: Tagg pieces by page", /Love Me Do.*1962.*Tagg p\. 376/.test(tg) !== NEG, tg);
  await ev(`location.hash = 'alkan-esquisse-op-63-no-5'`); await b.sleep(400);
  const pj = await ev(`(() => { const r = document.getElementById('alkan-esquisse-op-63-no-5'); if (!r) return 'none'; const y = r.getBoundingClientRect().top; return [r.closest('#td-print-list') ? 'print list' : 'elsewhere', y > -5 && y < 400].join(' | '); })()`);
  check("#id of a print-only piece lands on its row", pj === "print list | true", pj);
  const sh = await ev(`(() => { const ths = [...document.querySelectorAll('#td-sheet-box th[data-k]')].map(t => t.dataset.k);
    const f = document.querySelector('[data-f="print"]'); f.value = 'Cutler 23-2'; f.dispatchEvent(new Event('input'));
    return new Promise(r => setTimeout(() => { const tr = [...document.querySelectorAll('#td-sheet-box tbody tr')].map(t => t.textContent.replace(/\\s+/g, ' ')); f.value = ''; f.dispatchEvent(new Event('input'));
      r([ths.includes('year') && ths.includes('print'), tr.length, tr.some(t => /1801/.test(t))].join(' | ')); }, 400)); })()`);
  check("sheet: Year and Print columns; filtering Print finds the Moonlight themes with their year", /^true \| [1-9]\d* \| true$/.test(sh), sh);
  // sheet: the link rule, grouping, hideable columns, concepts list, no "notation and a recording" box
  await ev(`TdSheet.ready`); await b.sleep(300);
  const lr = await ev(`(() => { const a = [...document.querySelectorAll('#td-sheet-box tbody a[href]')].filter(a => !a.classList.contains('tds-det') && !a.classList.contains('tds-kids-t'));
    const ext = a.filter(x => /^https?:/.test(x.getAttribute('href')) && !x.href.startsWith(location.origin)), int = a.filter(x => !ext.includes(x));
    return [a.length > 50, ext.every(x => x.target === '_blank' && /↗/.test(x.textContent)), int.every(x => !x.target), !document.querySelector('[data-q="both"]')].join(' | '); })()`);
  check("sheet: on-site links same tab, off-site new tab ↗; no 'notation and a recording' box", (lr === "true | true | true | true") !== NEG, lr);
  const grp = await ev(`(() => { const g = TdSheet.groups().find(g => g.gkey === 'mozart|k550'); if (!g) return 'none';
    const q = document.querySelector('#td-q'); const f = document.querySelector('[data-f="title"]'); f.value = 'K 550'; f.dispatchEvent(new Event('input'));
    return new Promise(r => setTimeout(() => { const p = document.querySelector('#td-sheet-box tr.tds-parent[data-g="mozart|k550"]'); if (!p) { r('no parent row'); return; }
      const before = document.querySelectorAll('#td-sheet-box tr.tds-child[data-g="mozart|k550"]').length; p.querySelector('.tds-kids').click();
      const kids = [...document.querySelectorAll('#td-sheet-box tr.tds-child[data-g="mozart|k550"]')];
      const types = [...new Set(kids.map(k => k.children[1].textContent))].sort().join('/');
      f.value = ''; f.dispatchEvent(new Event('input'));
      r([g.title, before, kids.length >= 10, types].join(' | ')); }, 400)); })()`);
  check("sheet: Mozart 40's themes, pieces and scores under one Work row, folded until ▸", /^Symphony No\. 40.*K 550 \| 0 \| true \| Piece\/Score\/Theme$/.test(grp) !== NEG, grp);
  const det = await ev(`(() => { document.querySelector('.tds-chip[data-t="Piece"]').click(); const r = document.querySelector('#td-sheet-box a.tds-det'); if (!r) return 'no piece title';
    r.click(); const d = r.closest('tr').nextElementSibling; const ok = !!(d && d.classList.contains('tds-detail') && d.querySelector('.wk-panel, ul, p'));
    r.click(); document.querySelector('.tds-chip[data-t=""]').click(); return String(ok); })()`);
  check("sheet: a Piece title (no page of its own) opens its details in the sheet", det === "true", det);
  const cols = await ev(`(() => { const x = document.querySelector('[data-col="composer"]'); x.checked = false; x.dispatchEvent(new Event('change'));
    const th = [...document.querySelectorAll('#td-sheet-box thead th')][2]; const hid = getComputedStyle(th).display === 'none';
    return [hid, localStorage.getItem('td-sheet-cols')].join(' | '); })()`);
  check("sheet: a column hides and the choice is stored", /^true \| .*"composer"/.test(cols) !== NEG, cols);
  await b.goto(U + "/practice/tune-directory.html"); await wait(`window.TdSheet && document.querySelectorAll('#td-sheet-box tbody tr').length > 50`);
  const cols2 = await ev(`(() => { const th = [...document.querySelectorAll('#td-sheet-box thead th')][2]; const r = getComputedStyle(th).display;
    const x = document.querySelector('[data-col="composer"]'); x.checked = true; x.dispatchEvent(new Event('change')); return [r, getComputedStyle(th).display].join(' | '); })()`);
  check("sheet: hidden column remembered after a reload, and shows again", cols2 === "none | table-cell", cols2);
  const co = await ev(`(() => { const o = [...document.querySelectorAll('[data-cf="concept"] option')].slice(1); return [o.length > 20, o.every(x => !/;/.test(x.textContent) && x.textContent.replace(/ \\(\\d+\\)$/, '').length <= 48), document.querySelectorAll('[data-cf="concept"] optgroup').length > 1, document.documentElement.scrollWidth <= innerWidth].join(' | '); })()`);
  check("sheet: concepts split at ';', short labels, grouped by source; no page overflow", co === "true | true | true | true", co);
  const search = await ev(`(() => { const q = document.querySelector('#td-q'); q.value = 'autumn leaves'; q.dispatchEvent(new Event('input')); return new Promise(r => setTimeout(() => r(
    document.querySelector('#td-stat').textContent + ' | ' + [...document.querySelectorAll('.td-group')].filter(d => !d.hidden).map(d => d.querySelector('.td-gname').textContent + ':' + d.querySelector('.td-count').textContent).join(',')), 300)); })()`);
  check("search narrows and opens the groups", /^\d+ match/.test(search) && /Standards:3 of/.test(search), search);
  const badge = await ev(`[...document.querySelectorAll('.td-row')].filter(r => !r.hidden && r.querySelector('.td-badge')).length`);
  check("tunes in a piece carry a badge", badge >= 4, String(badge));
  // MLT / JRI recordings: listed by CD with their source; a name opens a player on that row
  const mlt = await ev(`(() => { const q = document.querySelector('#td-q'); q.value = ''; q.dispatchEvent(new Event('input'));
    window.MLT_REC_BASE = 'https://media.example.org';
    const a = document.querySelector('#td-mlt-list .td-play'); a.click(); const au = a.parentNode.querySelector('audio');
    return document.querySelector('#td-mlt-n').textContent + ' | ' + a.parentNode.querySelector('.td-sub').textContent + ' | ' + (au ? au.src : 'no player') +
      ' | ' + [...document.querySelectorAll('#td-mlt-list .td-row')].some(r => /Gordon Test/i.test(r.textContent)); })()`);
  check("MLT recordings listed with source, play in place, no Gordon test", /^1,\d{3} recordings in \d+ collections \| .*track \d+.* \| https:\/\/media\.example\.org\/mlt\/.* \| false$/.test(mlt), mlt);
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
  const isoN = await ev(`[...document.querySelectorAll('#td-isophonics-list a')].length + ' | ' + document.querySelector('#td-isophonics-list a').getAttribute('href')`);
  check("directory lists the 179 Isophonics Beatles songs, linked to Timestamp Notes", /^179 \| \/tools\/timestamp-notes\.html\?salami=1\d{5}$/.test(isoN), isoN);
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
  await b.goto(U + "/tools/timestamp-notes.html");
  await ev(`localStorage.clear()`);
  await b.goto(U + "/tools/timestamp-notes.html?salami=100001");
  await wait(`/I Saw Her/.test((document.querySelector('.btp-bb-now') || {}).textContent || '')`);
  await b.sleep(800);
  const isoTs = await ev(`[document.querySelector('.btp-bb-now').textContent.slice(0, 40), [...document.querySelectorAll('textarea')].some(t => /\{comment: Bridge\}/.test(t.value)), (document.body.innerText.match(/114 bars/) || [''])[0]].join(' | ')`);
  check("?salami=100001 opens an Isophonics Beatles song with its sections and bar map", /^Isophonics \(Beatles\): I Saw Her Standing \| true \| 114 bars$/.test(isoTs), isoTs);
  const bbSearch = await ev(`(() => { document.querySelector('.btp-bb-open').click(); const q = document.querySelector('.btp-bb input'); q.value = 'beatles'; q.dispatchEvent(new Event('input'));
    return new Promise(r => setTimeout(() => r(document.querySelector('.btp-bb-info').textContent), 500)); })()`);
  check("Billboard… searches the set", /^\d+ songs?(; the first 60 shown)?$/.test(bbSearch) && bbSearch !== "0 songs", bbSearch);

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

  // the top search box drives the sheet; recordings named for a tune sit under one parent row
  await b.goto(U + "/practice/tune-directory.html"); await wait(`window.TdSheet && document.querySelectorAll('#td-sheet-box tbody tr').length > 50`);
  await ev(`TdSheet.ready`); await b.sleep(300);
  await ev(`(() => { const q = document.getElementById('td-q'); q.value = 'Bach'; q.dispatchEvent(new Event('input', { bubbles: true })); })()`); await b.sleep(700);
  const sq = await ev(`JSON.stringify([document.querySelectorAll('#td-sheet-box tbody tr').length, document.getElementById('td-stat').textContent, document.querySelector('.tds-n').textContent])`);
  const [sqRows, sqStat, sqN] = JSON.parse(sq), sqNum = +sqN.split(" of ")[0].replace(/,/g, "");
  check("top search filters the sheet", (sqRows > 0 && sqRows < 500 && sqNum < 5000 && sqStat === sqNum.toLocaleString() + " matches") !== NEG, sq);
  await ev(`document.getElementById('td-q').value = ''`);
  const rv = await ev(`(() => { const g = TdSheet.groups().filter(g => /^Riverside/.test(g.title) && g.kids.some(k => k.type === 'Recording')); return JSON.stringify(g.map(g => [g.title, g.kids.length])); })()`);
  check("recordings named for a tune are grouped under it", (/\["Riverside",\d+\]/.test(rv)) !== NEG, rv);

  // suspect tunes (scripts/tune-quality.mjs) are left out until the box is ticked
  await b.goto(U + "/practice/tune-directory.html"); await wait(`window.TdSheet && document.querySelectorAll('#td-sheet-box tbody tr').length > 50`);
  await ev(`TdSheet.ready`); await b.sleep(300);
  const sus = await ev(`(() => { const n0 = TdSheet.filtered().length; const q = window.TUNE_QUALITY || {}; const ids = Object.keys(q);
    const lib = (TuneLibrary.build(tunesObject), [TuneLibrary.filter({}).some(r => q[r.id]), TuneLibrary.filter({ showSuspect: true }).some(r => q[r.id])]);
    document.querySelector('.tds-sus').click(); const n1 = TdSheet.filtered().length; document.querySelector('.tds-sus').click();
    return JSON.stringify([ids.length, n1 - n0, lib]); })()`);
  const [susN, susDiff, susLib] = JSON.parse(sus);
  check("suspect tunes are hidden by default in the sheet and the Tune Library, and the box brings them back", (susN > 100 && susDiff >= susN * 0.9 && susLib[0] === false && susLib[1] === true) !== NEG, sus);

  // Analysed score
  await b.goto(U + "/theory/analysed-scores/beethoven-moonlight-1.html?piece=beethoven-moonlight-1");
  await wait(`!!document.querySelector('.as-works .wk-panel')`);
  const as = await ev(`[...document.querySelectorAll('.as-works .wk-also a')].map(a => a.getAttribute('href')).join(' ')`);
  check("analysed score has the panel, linking to the theme", /classical-themes\.html\?theme=0887/.test(as), as);

  // r2 without a bucket, and with one
  const r2 = await ev(`JSON.stringify([(Works.config.r2Base = '', Works.source({ r2: 'a b/c.mp3' })), (Works.config.r2Base = 'https://media.example.com/', Works.source({ r2: 'a b/c.mp3', start: '1:05' })), Works.source({ yt: 'https://youtu.be/vcBJLdKtaOQ?t=610' })])`);
  check("sources: r2 waits for the bucket, then builds its URL; YouTube start from t=", r2 === JSON.stringify([{ kind: "missing", why: "the recordings bucket is not set up yet" },
    { kind: "audio", url: "https://media.example.com/a%20b/c.mp3", start: 65, end: 0 }, { kind: "yt", id: "vcBJLdKtaOQ", start: 610, end: 0 }]), r2);

  b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
