// Pop Themes (tools/pop-themes.qmd, apps/themes/themes-page.js with window.POP_THEMES): the three collections (BiMMuDa, CoCoPops, RS200)
// draw, the collection / section / decade / genre selects combine, the melody statistics sort (the collections without them last), Play lights
// the notes, chords show (CoCoPops and RS200 from the corpus, BiMMuDa where an analysis fits), a song in several collections links to the others.
//   sh scripts/render-test-page.sh tools/pop-themes.qmd; node tests/lessons/pop-themes.cdp.js      (RAW=1 node ... when Quarto cannot run)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const raw = process.env.RAW ? require("./qmd-raw-page.js")(ROOT + "/tools/pop-themes.qmd") : null;
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  if (raw && u === "/tools/pop-themes.html") { s.writeHead(200, { "content-type": "text/html" }); s.end(raw); return; }
  const f = u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8532);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), URL = "http://127.0.0.1:8532/tools/pop-themes.html";
  await b.resize(1200, 900);
  await b.goto(URL); await ev(`localStorage.clear()`); await b.goto(URL);
  for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('#ct-picker .tl-facet')`)) break; await b.sleep(250); }
  for (let i = 0; i < 40; i++) { if (await ev(`document.querySelectorAll('.ct-card svg').length > 0`)) break; await b.sleep(250); }   // cards draw as they come into view
  const first = await ev(`document.querySelector('#ct-count').textContent + '|' + document.querySelectorAll('.ct-card').length + '|' + document.querySelectorAll('.ct-card svg').length`);
  check("all sections, 10 cards a page, scores drawn", /^Sections 1–10 of 2,411\|10\|([1-9]|10)$/.test(first), first);
  const set = async (key, v) => ev(`(() => { const s = [...document.querySelectorAll('#ct-popfilters select')].find(x => x.getAttribute('aria-label') === ${JSON.stringify(key)}); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change')); return document.querySelector('#ct-count').textContent; })()`);
  const ch = await set("Section", "chorus");
  check("section filter: choruses", /of [4-9][0-9]{2}$/.test(ch), ch);
  const dec = await set("Decade", "1980s");
  check("decade filter combines with it", /^(\d+ sections|Sections 1–10 of \d+)$/.test(dec) && dec !== ch, dec);
  const ok80 = await ev(`(() => { const p = document.querySelector('#ct-per'); p.value = 'all'; p.dispatchEvent(new Event('change')); return [...document.querySelectorAll('.ct-card')].every(c => c.__r.t.section === 'chorus' && c.__r.t.year >= 1980 && c.__r.t.year < 1990) + '|' + document.querySelectorAll('.ct-card').length; })()`);
  check("every card is a 1980s chorus", /^true\|[1-9]/.test(ok80), ok80);
  const gen = await ev(`(() => { const g = [...document.querySelectorAll('#ct-popfilters select')].find(x => x.getAttribute('aria-label') === 'Genre'); return [...g.options].map(o => o.value).join(',') + '|' + T_COUNT(); function T_COUNT() { return window.POP_THEMES.filter(t => (t.genre||[]).length).length; } })()`);
  check("genre select lists the eight genres; themes carry genres", /pop,rock,r&b\/soul,country,hip-hop,jazz\/standards,dance\/disco,folk\|[1-9]\d*/.test(gen), gen);
  await set("Section", ""); await set("Decade", "");
  const g1 = await ev(`(() => { const g = [...document.querySelectorAll('#ct-popfilters select')].find(x => x.getAttribute('aria-label') === 'Genre'); g.value = 'country'; g.dispatchEvent(new Event('change'));
    return [...document.querySelectorAll('.ct-card')].every(c => c.__r.t.genre.includes('country')) + '|' + document.querySelectorAll('.ct-card').length; })()`);
  check("genre filter: country", /^true\|\d+/.test(g1) && +g1.split("|")[1] > 0, g1);
  await ev(`(() => { const g = [...document.querySelectorAll('#ct-popfilters select')].find(x => x.getAttribute('aria-label') === 'Genre'); g.value = ''; g.dispatchEvent(new Event('change')); })()`);
  for (const k of ["mic", "pstd", "mis", "od", "npvi", "ric", "tonal", "bpm", "len"]) {
    const r = await ev(`(() => { const row = document.querySelectorAll('.ct-sortrow')[0]; row.querySelector('select').value = ${JSON.stringify(k)}; row.querySelector('select').dispatchEvent(new Event('change'));
      const d = row.querySelector('.ct-dir'); if (+d.dataset.dir > 0) d.click();
      const p = document.querySelector('#ct-per'); p.value = '25'; p.dispatchEvent(new Event('change'));
      const v = [...document.querySelectorAll('.ct-card')].map(c => c.__r.t[${JSON.stringify(k === "bpm" ? "qpm" : k)}]); return v.every((x, i) => !i || x <= v[i-1]) + '|' + v.slice(0, 3).join(' '); })()`);
    check("sort by " + k + ", high to low", /^true\|[\d.]+/.test(r), r);
  }
  await ev(`(() => { const row = document.querySelectorAll('.ct-sortrow')[0]; row.querySelector('select').value = 'id'; const d = row.querySelector('.ct-dir'); if (+d.dataset.dir < 0) d.click(); row.querySelector('select').dispatchEvent(new Event('change')); return 1; })()`);
  const card = await ev(`(() => { const c = document.querySelector('.ct-card'); return c.querySelector('.ct-title').textContent + '|' + c.querySelector('.ct-comp').textContent + '|' + [...c.querySelectorAll('.ct-meta span')].map(s => s.textContent).join(' ; ') + '|' + (c.querySelector('.ct-btns a') || {}).href; })()`);
  check("first card: Goodnight Irene, 1950, with figures and a Spotify link", /^Goodnight Irene\|Gordon Jenkins & The Weavers · 1950 · No\. 1 of the year · chorus.*MIC 4\.28.*\|https:\/\/open\.spotify\.com\/track\//.test(card), card);
  const tags = await ev(`(() => { const s = document.querySelector('#ct-picker .tl-search'); s.value = 'Beatles'; s.dispatchEvent(new Event('input')); return document.querySelector('#ct-count').textContent; })()`);
  check("search finds an artist", /\d/.test(tags) && !/No sections/.test(tags), tags);
  await ev(`(() => { const s = document.querySelector('#ct-picker .tl-search'); s.value = ''; s.dispatchEvent(new Event('input')); })()`);
  await ev(`document.querySelector('.ct-play').click()`);
  let play = "";
  for (let k = 0; k < 40; k++) { await b.sleep(100); play = await ev(`document.querySelector('.ct-play').textContent + '|' + document.querySelectorAll('.ct-on').length`); if (/^■ Stop\|[1-9]/.test(play)) break; }
  check("Play plays and lights the notes", /^■ Stop\|[1-9]/.test(play), play);
  const keys = await ev(`(() => { const T = window.POP_THEMES; return T.length + '|' + T.filter(t => t.minor).length + '|' + T.filter(t => /^[A-G][b#]?m?$/.test(t.key)).length + '|' + T.filter(t => t.qpm).length + '|' + ["BiMMuDa", "CoCoPops", "RS200"].map(k => T.filter(t => t.set === k).length).join(','); })()`);
  check("2,411 sections (1,104 + 793 + 514), minors, keys and tempi everywhere", /^2411\|\d{3,}\|2411\|2411\|1104,793,514$/.test(keys), keys);
  // ---- collections ----
  await ev(`(() => { const p = document.querySelector('#ct-per'); p.value = '10'; p.dispatchEvent(new Event('change')); })()`);
  const cols = [];
  for (const [k, n] of [["BiMMuDa", 1104], ["CoCoPops", 793], ["RS200", 514]]) {
    const c = await set("Collection", k);
    const all = await ev(`window.POP_THEMES.filter(t => t.set === ${JSON.stringify(k)}).length`);
    cols.push(k + " " + c);
    check("Collection filter: " + k + " has " + n + " sections", all === n && c.endsWith("of " + n.toLocaleString("en-US")), c);
  }
  await set("Collection", "CoCoPops");
  const ccOnly = await ev(`(() => { const p = document.querySelector('#ct-per'); p.value = 'all'; p.dispatchEvent(new Event('change')); return [...document.querySelectorAll('.ct-card')].every(c => c.__r.t.set === 'CoCoPops') + '|' + document.querySelectorAll('.ct-card').length; })()`);
  check("every card is a CoCoPops one", /^true\|793$/.test(ccOnly), ccOnly);
  await ev(`(() => { const p = document.querySelector('#ct-per'); p.value = '10'; p.dispatchEvent(new Event('change')); })()`);
  await set("Collection", "");
  const find = async (q) => { await ev(`(() => { const s = document.querySelector('#ct-picker .tl-search'); s.value = ${JSON.stringify(q)}; s.dispatchEvent(new Event('input')); })()`); await b.sleep(400); };
  // a CoCoPops card: James Brown, Cold Sweat (McGill 79), chords from the transcription, Timestamp Notes link
  await find("Cold Sweat");
  const cs = await ev(`(() => { const c = [...document.querySelectorAll('.ct-card')].find(x => x.__r.t.id === 'cc_0079_2'); if (!c) return 'none'; const t = c.__r.t;
    return c.querySelector('.ct-title').textContent + '|' + c.querySelector('.ct-comp').textContent + '|' + [...c.querySelectorAll('.ct-meta span')].map(s => s.textContent).join(' ; ') + '|' + c.querySelector('.ct-salami').getAttribute('href') + '|' + (t.chords || []).length + '|' + t.mcgill; })()`);
  check("CoCoPops card: Cold Sweat, peak No. 7, chords, Billboard chords link ?salami=79", /^Cold Sweat - Part 1\|James Brown · 1967 · peak No\. 7 on the Hot 100 · chorus · chords from the transcription\|CoCoPops ;.*\|\/tools\/timestamp-notes\.html\?salami=79\|\d+\|79$/.test(cs) && +cs.split("|")[4] > 2, cs.slice(0, 300));
  await ev(`(() => { const c = document.querySelector('#ct-rn'); c.checked = true; c.dispatchEvent(new Event('change')); })()`); await b.sleep(900);
  const csAn = await ev(`(() => { const c = [...document.querySelectorAll('.ct-card')].find(x => x.__r.t.id === 'cc_0079_2'); return [...c.querySelectorAll('svg .abcjs-annotation')].map(x => x.textContent).slice(0, 6).join(' ') + '|' + c.querySelectorAll('svg .abcjs-note').length; })()`);
  check("that card draws its chord symbols over the notes (F7 C7 …)", /^F7 C7 F7 C7.*\|[1-9]\d+$/.test(csAn), csAn);
  // an RS200 card: Billie Jean, rank 58, chords, the chip about its note lengths, a link to the BiMMuDa transcription
  await find("Billie Jean");
  const bj = await ev(`(() => { const c = [...document.querySelectorAll('.ct-card')].find(x => x.__r.t.set === 'RS200'); if (!c) return 'none'; const t = c.__r.t;
    return c.querySelector('.ct-title').textContent + '|' + c.querySelector('.ct-comp').textContent + '|' + [...c.querySelectorAll('.ct-meta span')].map(s => s.textContent).join(' ; ') + '|' + (c.querySelector('.ct-also') || {}).textContent + '|' + (c.querySelector('.ct-salami') || {}).href + '|' + (t.chords || []).length; })()`);
  check("RS200 card: Billie Jean, No. 58 on Rolling Stone's 500, chords, note lengths approximate, also in BiMMuDa (no McGill analysis: no Billboard link)",
    /^Billie Jean\|Michael Jackson · 1983 · No\. 58 on Rolling Stone's 500 \(2004\) · \w+ · chords from the transcription\|RS200 ;.*note lengths approximate.*\|Also in BiMMuDa\|undefined\|[1-9]\d*$/.test(bj), bj.slice(0, 330));
  const bjAn = await ev(`(() => { const c = [...document.querySelectorAll('.ct-card')].find(x => x.__r.t.set === 'RS200'); return [...c.querySelectorAll('svg .abcjs-annotation')].map(x => x.textContent).slice(0, 4).join(' '); })()`);
  check("RS200 card draws chord symbols (Gm Cm …)", /^Gm Cm/.test(bjAn), bjAn);
  await ev(`(() => { const c = document.querySelector('#ct-rn'); c.checked = false; c.dispatchEvent(new Event('change')); })()`);
  // a song in all three collections: the RS200 card links to BiMMuDa and CoCoPops and, through the CoCoPops twin, to its McGill Billboard analysis
  await find("Dock of the Bay");
  const dk = await ev(`(() => { const c = [...document.querySelectorAll('.ct-card')].find(x => x.__r.t.set === 'RS200'); if (!c) return 'none'; return (c.querySelector('.ct-also') || {}).textContent + '|' + ((c.querySelector('.ct-salami') || {}).href || '').replace(/^.*\\/tools/, '/tools') + '|' + [...new Set([...document.querySelectorAll('.ct-card')].map(x => x.__r.t.set))].sort().join(','); })()`);
  check("Dock of the Bay is in all three collections, linked, with a Billboard chords link", /^Also in BiMMuDa, CoCoPops\|\/tools\/timestamp-notes\.html\?salami=\d+\|BiMMuDa,CoCoPops,RS200$/.test(dk), dk);
  // ?song=: all of one song's sections in every collection that has it
  const sg = await ev(`window.POP_THEMES.find(t => t.set === 'RS200' && t.title === 'Billie Jean').grp`);
  await b.goto(URL + "?song=" + encodeURIComponent(sg));
  for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('#ct-picker .tl-facet') && document.querySelectorAll('.ct-card').length > 0`)) break; await b.sleep(250); }
  const song = await ev(`document.querySelector('#ct-status').textContent + '|' + [...new Set([...document.querySelectorAll('.ct-card')].map(c => c.__r.t.set))].sort().join(',') + '|' + document.querySelectorAll('.ct-card').length`);
  check("?song=<group> shows that song's sections in BiMMuDa and RS200 only", /^Showing one song in BiMMuDa, RS200\. Show all sections\|BiMMuDa,RS200\|\d+$/.test(song), song);
  // sorting: the collections without the figure come last, either way
  await b.goto(URL); await ev(`localStorage.clear()`); await b.goto(URL);
  for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('#ct-picker .tl-facet')`)) break; await b.sleep(250); }
  const lastMic = await ev(`(() => { const row = document.querySelectorAll('.ct-sortrow')[0]; row.querySelector('select').value = 'mic'; row.querySelector('select').dispatchEvent(new Event('change'));
    const d = row.querySelector('.ct-dir'); if (+d.dataset.dir < 0) d.click(); const p = document.querySelector('#ct-per'); p.value = 'all'; p.dispatchEvent(new Event('change'));
    const v = [...document.querySelectorAll('.ct-card')].map(c => c.__r.t.mic); const n = v.filter(x => x !== undefined).length; return n + '|' + v.slice(0, n).every(x => x !== undefined) + '|' + v.slice(n).every(x => x === undefined) + '|' + v.length; })()`);
  check("sort by MIC, low to high: BiMMuDa's figures first, the 1,307 sections without one last", /^1\d{3}\|true\|true\|2411$/.test(lastMic) && +lastMic.split("|")[0] >= 1000, lastMic);
  const chordsN = await ev(`window.POP_THEMES.filter(t => t.chords).length`);
  if (chordsN) {
    await ev(`(() => { const c = document.querySelector('#ct-rnonly'); c.checked = true; c.dispatchEvent(new Event('change')); const p = document.querySelector('#ct-per'); p.value = '10'; p.dispatchEvent(new Event('change')); return 1; })()`);
    await b.sleep(500);
    const cc = await ev(`document.querySelector('#ct-count').textContent`);
    check("only sections with chords: the filter keeps those", new RegExp("of " + chordsN.toLocaleString("en-US") + "$|^" + chordsN + " sections").test(cc) || cc.includes(String(chordsN)), cc + " (" + chordsN + ")");
    await ev(`(() => { const c = document.querySelector('#ct-rn'); c.checked = true; c.dispatchEvent(new Event('change')); return 1; })()`); await b.sleep(800);
    const an = await ev(`(() => { const t = [...document.querySelectorAll('.ct-score svg .abcjs-annotation')].map(x => x.textContent); return t.length + '|' + t.slice(0, 8).join(' '); })()`);
    check("Show chords draws chord symbols", /^[1-9]\d*\|/.test(an), an);
  } else console.log("skip chords (none in the data yet)");
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
