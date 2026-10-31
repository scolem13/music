// Classical Themes (tools/classical-themes.qmd): the finder's filters narrow the themes, the sorts order them, Show N pages them,
// All lays out every one (drawing only what is near the screen), Play plays one. Run after rendering it:
//   quarto render tools/classical-themes.qmd; node tests/lessons/classical-themes.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8531);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.resize(1200, 900);
  await b.goto("http://127.0.0.1:8531/tools/classical-themes.html");
  await ev(`localStorage.clear()`);
  await b.goto("http://127.0.0.1:8531/tools/classical-themes.html");
  let t0 = Date.now(); for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('#ct-picker .tl-facet')`)) break; await b.sleep(250); }
  const first = await ev(`document.querySelector('#ct-count').textContent + '|' + document.querySelectorAll('.ct-card').length + '|' + document.querySelectorAll('.ct-card svg').length`);
  check("all themes, 10 cards a page, scores drawn", /^Themes 1–10 of 2,067\|10\|([1-9]|10)$/.test(first), first + " (" + (Date.now() - t0) + " ms)");
  const facets = await ev(`[...document.querySelectorAll('#ct-picker .tl-facet > summary')].map(s => s.textContent).join(',')`);
  check("the Tune Assessment's facets, Tags as Composer", /Composer.*Tonality.*Meter.*Key.*Starts on/.test(facets), facets);
  const search = async (v) => ev(`(() => { const s = document.querySelector('#ct-picker .tl-search'); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('input')); return document.querySelector('#ct-count').textContent; })()`);
  const beet = await search("Beethoven");
  check("search narrows to a composer", /of (5\d\d)$|^5\d\d themes/.test(beet), beet);
  const tonal = await ev(`(() => { const i = [...document.querySelectorAll('#ct-picker .tl-mini-search')].find(x => /Tonal/.test(x.placeholder)); i.value = 'Do Mi So'; i.dispatchEvent(new Event('input'));
    return document.querySelector('#ct-count').textContent; })()`);
  check("tonal pattern filter narrows further", /\d/.test(tonal) && tonal !== beet, tonal);
  await search(""); await ev(`(() => { const i = [...document.querySelectorAll('#ct-picker .tl-mini-search')].find(x => /Tonal/.test(x.placeholder)); i.value = ''; i.dispatchEvent(new Event('input')); })()`);
  // sort by range, high to low, then by composer
  const sorted = await ev(`(() => { const rows = document.querySelectorAll('.ct-sortrow'); rows[0].querySelector('select').value = 'range'; rows[0].querySelector('.ct-dir').click();
    return [...document.querySelectorAll('.ct-card')].map(c => c.__r.t.range); })()`);
  check("sort by range, high to low", sorted.every((v, i) => !i || v <= sorted[i - 1]) && sorted[0] > 20, sorted.join(" "));
  const two = await ev(`(() => { const rows = document.querySelectorAll('.ct-sortrow'); rows[0].querySelector('select').value = 'meter'; rows[0].querySelector('select').dispatchEvent(new Event('change'));
    rows[1].querySelector('select').value = 'n'; rows[1].querySelector('select').dispatchEvent(new Event('change'));
    const p = document.querySelector('#ct-per'); p.value = '100'; p.dispatchEvent(new Event('change'));
    const c = [...document.querySelectorAll('.ct-card')].map(c => [c.__r.rec.meterStr, c.__r.t.n]);
    return c.length + '|' + c.every((x, i) => !i || x[0] !== c[i-1][0] || x[1] >= c[i-1][1]) + '|' + c[0][0]; })()`);
  check("100 a page, sorted by meter then notes", /^100\|true\|/.test(two), two);
  const next = await ev(`(() => { document.querySelector('#ct-next').click(); return document.querySelector('#ct-count').textContent + '|' + document.querySelector('.ct-pagelab').textContent; })()`);
  check("Next page", next === "Themes 101–200 of 2,067|Page 2 of 21", next);
  t0 = Date.now();
  const all = await ev(`(() => { const p = document.querySelector('#ct-per'); p.value = 'all'; p.dispatchEvent(new Event('change'));
    return document.querySelectorAll('.ct-card').length + '|' + document.querySelectorAll('.ct-card svg').length + '|' + document.querySelector('.ct-pager').hidden; })()`);
  for (let k = 0; k < 30 && !(await ev(`document.querySelectorAll(".ct-card svg").length`)); k++) await b.sleep(100);   // 2,067 Works panels take a moment
  const drawn = await ev(`document.querySelectorAll('.ct-card svg').length`);
  check("All: every card laid out, only those near the screen drawn", /^2067\|0\|true$/.test(all) && drawn > 0 && drawn < 100, all + " drawn " + drawn + " (" + (Date.now() - t0) + " ms)");
  const cols = await ev(`(() => { const c = document.querySelector('#ct-cols'); c.value = '3'; c.dispatchEvent(new Event('change')); const r = [...document.querySelectorAll('.ct-card')].slice(0, 3).map(x => Math.round(x.getBoundingClientRect().top)); return new Set(r).size; })()`);
  check("3 columns", cols === 1, String(cols));
  const p = await ev(`(() => { const p = document.querySelector('#ct-per'); p.value = '5'; p.dispatchEvent(new Event('change'));
    const rows = document.querySelectorAll('.ct-sortrow'); rows[0].querySelector('select').value = 'id'; rows[0].querySelector('select').dispatchEvent(new Event('change'));
    document.querySelector('.ct-play').click(); return 1; })()`);
  let play = "";
  for (let k = 0; k < 30; k++) { await b.sleep(100);   // the band's piano, lit from the same schedule; a theme may open with a rest
    play = await ev(`document.querySelector('.ct-play').textContent + '|' + document.querySelectorAll('.ct-on').length + '|' + document.querySelector('#ct-status').textContent`);
    if (/^■ Stop\|[1-9]/.test(play)) break; }
  check("Play plays and lights the notes", /^■ Stop\|[1-9]/.test(play), play);
  const minor = await ev(`(() => { const s = document.querySelector('#ct-picker .tl-search'); s.value = 'Symphony No. 5, in C minor, Op. 67, 1st Movement'; s.dispatchEvent(new Event('input'));
    return [...document.querySelectorAll('.ct-card')].map(c => c.__r.t.key).join(' '); })()`);
  check("Beethoven 5 read as C minor (from its title)", /\bCm\b/.test(minor), minor);
  const mv = await ev(`(() => { const s = document.querySelector('#ct-picker .tl-search'); s.value = 'Adagio sostenuto'; s.dispatchEvent(new Event('input')); const p = document.querySelector('#ct-per'); p.value = 'all'; p.dispatchEvent(new Event('change'));
    const c = [...document.querySelectorAll('.ct-card')].find(c => c.__r.t.id === '0886');
    return document.querySelector('#ct-count').textContent + '|' + (c ? c.querySelector('.ct-move').textContent : 'not found'); })()`);
  check("search finds a movement; the card shows it", /\|Adagio sostenuto$/.test(mv), mv);
  const noTempo = await ev(`[...document.querySelectorAll('.ct-score svg')].some(s => /= ?\d/.test(s.textContent))`);
  check("the recording's tempo is not drawn", noTempo === false, String(noTempo));
  // ornament signs are played out (OrnamentPlay): 449, WTC II Prelude 4 in E, has P (prall) on c#: Bach's Trillo, D# C# D# C#
  const orn = await ev(`(() => { const d = document.createElement('div'); document.body.appendChild(d);
    const v = ABCJS.renderAbc(d, "X:1\\nM:9/8\\nL:1/8\\nQ:1/4=70\\nK:E\\nC,E,G, C2 G Pc2 e |\\n")[0]; v.setUpAudio({});
    const e = v.setTiming(1).filter(e => e.type == 'event')[5], o = OrnamentPlay.prepare(v, { composer: 'Johann Sebastian Bach' });
    const r = o.notes(e.midiPitches[0], 0, 0.8, e).map(n => n.midi).join(' '); d.remove(); return r; })()`);
  check("a prall in Bach plays from the note above", orn === "75 73 75 73", orn);
  const errs = await ev(`(window.__errs || []).length`);
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
