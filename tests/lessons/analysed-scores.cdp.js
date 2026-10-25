// Analysed Scores (theory/analysed-scores/, one page per piece, made by scripts/when-in-rome/build.mjs) in headless Chrome: on every page, abcjs plays
// exactly the notes of the Humdrum source (pitch and start time, ties joined), and the score carries one label per chord of the analysis.
//   node scripts/when-in-rome/build.mjs; quarto render theory/analysed-scores; node tests/lessons/analysed-scores.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8543, NAT = [0, 2, 4, 5, 7, 9, 11];
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const B = await import(ROOT + "/scripts/when-in-rome/build.mjs");
  const b = await launch();
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const errs = () => b.errors.filter(e => !/supabase|createClient|soundfont|fetch|load sound|favicon|sounds/i.test(e));
  const page = id => `http://127.0.0.1:${PORT}/theory/analysed-scores/${id}.html`;
  await b.goto(page(B.PIECES[0].id)); await b.sleep(1500);
  for (let i = 0; i < B.PIECES.length; i++) {
    const p = B.PIECES[i], { k, versions } = B.buildPiece(p);
    const html = fs.readFileSync(SITE + `/theory/analysed-scores/${p.id}.html`, "utf8");   // the page replaces its source with the drawn score, so read it from the file
    const abcs = [...html.matchAll(/<div class="as-score"[^>]*>\s*<script type="text\/plain">([\s\S]*?)<\/script>/g)].map(m => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
    check(`${p.id}: its own page, one score per analysis`, abcs.length === versions.length && versions.length === 1, abcs.length);
    const want = []; for (const evs of k.voices.values()) for (const e of evs) if (!e.rest) for (const n of e.notes) if (!n.tieMid && !n.tieEnd) want.push((e.t / B.W).toFixed(4) + ":" + (12 * (n.o + 1) + NAT[n.l] + n.a));
    want.sort();
    for (let j = 0; j < versions.length; j++) {
      const abc = abcs[j];
      const plain = abc.replace(/:\|/g, "|").replace(/\|:/g, "|");   // the repeat played once, to match the source's notes
      const got = await b.eval(`(() => { const v = ABCJS.renderAbc(document.createElement('div'), ${JSON.stringify(plain)})[0], out = [];
        v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.start.toFixed(4) + ':' + e.pitch); })); return out.sort(); })()`);
      const miss = want.filter(x => !got.includes(x)), extra = got.filter(x => !want.includes(x));
      check(`${p.id} (${versions[j].who.slice(0, 22)}): abcjs plays the source's ${want.length} notes`, !miss.length && !extra.length && got.length === want.length, `missing ${miss.slice(0, 4)} extra ${extra.slice(0, 4)} (${got.length} vs ${want.length})`);
      const labels = (abc.match(/"_[^"]+"/g) || []).length;
      check(`${p.id} (${versions[j].who.slice(0, 22)}): every chord of the analysis labelled`, labels === versions[j].count && !versions[j].misses.length, labels + " of " + versions[j].count);
    }
  }
  for (const book of B.BOOKS) {   // the textbooks: every example of a book on one page, each checked the same way
    const html = fs.readFileSync(SITE + `/theory/analysed-scores/${book.page}.html`, "utf8"), exs = B.bookExamples(book);
    const abcs = new Map([...html.matchAll(/<div class="as-score" data-piece="([^"]+)"[^>]*>\s*<script type="text\/plain">([\s\S]*?)<\/script>/g)].map(m => [m[1], m[2].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")]));
    let bad = [], labelsBad = [];
    for (const ex of exs) {
      if (ex.empty) { if (abcs.has(ex.id)) bad.push(ex.label + " (should have no score)"); continue; }
      const abc = abcs.get(ex.id); if (!abc) { bad.push(ex.label + " (no score)"); continue; }
      const v = B.buildPiece(ex.p).versions[0], want = [];
      for (const evs of ex.p.score.voices.values()) for (const e of evs) if (!e.rest) for (const n of e.notes) if (!n.tieMid && !n.tieEnd) want.push((e.t / B.W).toFixed(4) + ":" + (12 * (n.o + 1) + NAT[n.l] + n.a));
      want.sort();
      const plain = abc.replace(/:\|/g, "|").replace(/\|:/g, "|");   // repeats played once, to match the source's notes
      const got = await b.eval(`(() => { const v = ABCJS.renderAbc(document.createElement('div'), ${JSON.stringify(plain)})[0], out = [];
        v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.start.toFixed(4) + ':' + e.pitch); })); return out.sort(); })()`);
      if (got.join() !== want.join()) bad.push(ex.label + ` (${got.filter(x => !want.includes(x)).slice(0, 3)} / ${want.filter(x => !got.includes(x)).slice(0, 3)})`);
      if ((abc.match(/"_[^"]+"/g) || []).length !== v.count || v.misses.length) labelsBad.push(ex.label);
    }
    check(`${book.key}: abcjs plays the source's notes in all ${exs.filter(e => !e.empty).length} examples`, !bad.length, bad.join(" "));
    check(`${book.key}: every chord of every analysis labelled`, !labelsBad.length, labelsBad.join(" "));
    b.errors.length = 0;
    await b.goto(page(book.page)); await b.sleep(4000);
    const n = await b.eval(`document.querySelectorAll('.as-score svg').length`), keys = await b.eval(`document.querySelectorAll('.as-keys').length`);
    check(`${book.key}: all scores drawn, each with its key strip`, n === abcs.size && keys === abcs.size, n + " drawn, " + keys + " key strips, of " + abcs.size);
    check(`${book.key}: no page errors`, !errs().length, errs().slice(0, 3).join(" | "));
  }
  {   // the beam and tenor buttons (one setting for the page), and the Modulation Finder
    b.errors.length = 0;
    await b.goto(page("kostka-payne")); await b.sleep(3000);
    const r = await b.eval(`(async () => {
      const S = AnalysedScores.scores().find(x => x.beamBtn && x.tenorBtn), beams = () => S.paper.querySelectorAll('.abcjs-beam-elem').length, staffOf = () => S.abc.includes('%%score (s1v1 s1v2 s2v1) s2v2');
      const all = AnalysedScores.scores().length, b0 = beams(), n0 = S.notes.length;
      document.querySelector('.as-beam').click(); await new Promise(r => setTimeout(r, 400));
      const b1 = beams(), n1 = S.notes.length, label = document.querySelector('.as-beam').textContent;
      document.querySelector('.as-tenor').click(); await new Promise(r => setTimeout(r, 400));
      const four = AnalysedScores.scores().filter(x => x.tenorBtn).length, up = AnalysedScores.scores().filter(x => x.abc.includes('%%score (s1v1 s1v2 s2v1) s2v2')).length, n2 = S.notes.length;
      document.querySelector('.as-tenor').click(); document.querySelector('.as-beam').click(); await new Promise(r => setTimeout(r, 400));
      return { all: four, b0, b1, n0, n1, n2, up, label, back: beams() === b0 && !staffOf() };
    })()`);
    check("beam button: beams drawn when on, gone when off, same notes", r.b0 === 0 && r.b1 > 0 && r.n0 === r.n1 && r.label === "Beams: on" && r.back, JSON.stringify(r));
    check("tenor button: every four-part score on the page switches, same notes", r.up === r.all && r.n2 === r.n0, r.up + " of " + r.all);
    try { await b.eval(`localStorage.removeItem('as-beams'); localStorage.removeItem('as-tenor-up')`); } catch (e) {}
    // the passages from real pieces (scripts/when-in-rome/corpus.mjs + corpus-verify.cjs), loaded by the page after it shows
    const CORPUS = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/modulation-corpus.json", "utf8"));
    const PC = k => (({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[k[0].toUpperCase()] + (k.slice(1).match(/#/g) || []).length - (k.slice(1).match(/b/g) || []).length + 24) % 12;
    await b.goto(`http://127.0.0.1:${PORT}/theory/analysed-scores/modulation-finder.html?start=major&end=major&dist=7`); await b.sleep(4000);
    const want = B.BOOKS.flatMap(bk => B.bookExamples(bk)).filter(ex => !ex.empty).filter(ex => {
      const pc = k => (({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[k[0].toUpperCase()] + (/#/.test(k) ? 1 : 0) * (k.length - 1) - (/b/.test(k.slice(1)) ? k.length - 1 : 0) + 24) % 12;
      return ex.from[0] === ex.from[0].toUpperCase() && ex.to[0] === ex.to[0].toUpperCase() && (pc(ex.to) - pc(ex.from) + 12) % 12 === 7; }).length
      + CORPUS.filter(x => x.from[0] === x.from[0].toUpperCase() && x.to[0] === x.to[0].toUpperCase() && (PC(x.to) - PC(x.from) + 12) % 12 === 7).length;
    const f = await b.eval(`({ summary: document.getElementById('mf-summary').textContent, cards: document.querySelectorAll('.mf-card').length,
      drawn: document.querySelectorAll('.mf-card .as-score svg').length, scores: AnalysedScores.scores().length, notes: AnalysedScores.scores().every(S => S.notes.length > 0) })`);
    check("finder: major to major, 7 half steps lists the right examples", parseInt(f.summary) === want && want > 0, f.summary + " (expected " + want + ")");
    check("finder: the first results are drawn and playable", f.cards === Math.min(8, want) && f.drawn === f.cards && f.scores === f.cards && f.notes, JSON.stringify(f));
    await b.eval(`document.getElementById('mf-more').hidden || document.getElementById('mf-more').click()`); await b.sleep(800);
    const g = await b.eval(`({ cards: document.querySelectorAll('.mf-card').length, scores: AnalysedScores.scores().length })`);
    check("finder: Show more adds the next scores", g.cards === Math.min(16, want) && g.scores === g.cards, JSON.stringify(g));
    await b.eval(`document.getElementById('mf-reset').click()`); await b.sleep(800);
    const h = await b.eval(`({ summary: document.getElementById('mf-summary').textContent, scores: AnalysedScores.scores().length, url: location.search })`);
    check(`finder: Clear lists all ${200 + CORPUS.length} (textbooks and real pieces) and forgets the old scores`, parseInt(h.summary) === 200 + CORPUS.length && h.scores === 8 && h.url === "", JSON.stringify(h));
    await b.eval(`(() => { const s = document.getElementById('mf-book'); s.value = '@real'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(1500);
    const r2 = await b.eval(`({ summary: document.getElementById('mf-summary').textContent, drawn: document.querySelectorAll('.mf-card .as-score svg').length,
      link: (document.querySelector('.mf-card h3 a') || {}).href || "", notes: AnalysedScores.scores().every(S => S.notes.length > 0) })`);
    check("finder: real pieces only: all of them, drawn, playable, linked to their analysis", parseInt(r2.summary) === CORPUS.length && r2.drawn === 8 && r2.notes && /When-in-Rome/.test(r2.link), JSON.stringify(r2));
    check("finder: no page errors", !errs().length, errs().slice(0, 3).join(" | "));
  }
  await b.goto(page(B.PIECES[0].id)); await b.sleep(1500);
  const drawn = await b.eval(`document.querySelectorAll('.as-score svg').length`);
  check("the score is drawn", drawn >= 1, drawn);
  // stacked figures, bar numbers, Space, clicking a note
  const ui = await b.eval(`(async () => { const S = AnalysedScores.scores()[0], svg = S.paper.querySelector('svg');
    const stacked = [...svg.querySelectorAll('text.abcjs-annotation')].filter(t => t.querySelectorAll('tspan').length >= 3).length;
    const nums = [...svg.querySelectorAll('text.ct-barno')].map(t => t.textContent).join(',');
    S.paper.scrollIntoView();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); const playing = !!S.playing;
    await new Promise(r => setTimeout(r, 300));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); const paused = !S.playing;
    const g = [...svg.querySelectorAll('.abcjs-note')].find(n => /abcjs-mm2 /.test(n.getAttribute('class') + ' ') && /abcjs-v3/.test(n.getAttribute('class')));
    g.querySelector('path').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    const pos = S.pos, chord = AnalysedScores.chordAt(S, pos), lit = svg.querySelectorAll('.abc-on').length;
    return [stacked, nums, playing, paused, pos > 0, chord.length, lit].join(';'); })()`);
  const [stk, nums, pl, pa, moved, ch, lit] = ui.split(";");
  check("figures with two numbers are stacked", +stk >= 5, stk);
  check("each system's first bar numbered", /^\d+(,\d+)+$/.test(nums), nums);
  check("Space plays, Space pauses", pl === "true" && pa === "true", pl + " " + pa);
  check("a click on a bass note moves the position there, lights it, and finds its four-voice chord", moved === "true" && +ch === 4 && +lit >= 4, [moved, ch, lit].join(" "));
  const font = await b.eval(`[...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } }).filter(r => r.cssText && /Bar Numbers Mono/.test(r.cssText) && /font-face/.test(r.cssText)).map(r => r.cssText).join(' ')`);
  check("bar numbers use the light (200) Source Serif digits", /SourceSerif4-200\.ttf/.test(font), font.slice(0, 120));
  const sp = await b.eval(`(async () => { const S = AnalysedScores.scores()[0], h = () => S.paper.querySelector('svg').getBoundingClientRect().height, r = document.querySelector('#as-space input');
    const set = async v => { r.value = v; r.dispatchEvent(new Event('input')); await new Promise(x => setTimeout(x, 300)); return h(); };
    const lo = await set(0), hi = await set(150); await set(60);
    const st = S.paper.querySelector('svg .abcjs-staff').getBBox(), nb = [...S.paper.querySelectorAll('text.ct-barno')].map(t => t.getBBox().x + t.getBBox().width);
    return [r.closest('#quarto-margin-sidebar') ? 'sidebar' : 'elsewhere', hi > lo + 50, nb.every(x => x <= st.x + 0.5)].join(' '); })()`);
  check("system spacing slider in the sidebar changes the spacing; bar numbers end left of the staff", sp === "sidebar true true", sp);
  const fits0 = await b.eval(`(() => { const S = AnalysedScores.scores()[0], svg = S.paper.querySelector('svg');
    return S.paper.getBoundingClientRect().height + 1 >= svg.getBoundingClientRect().height; })()`);
  check("no errors on the Bach page", !errs().length, errs().join(" | "));
  await b.goto(page("beethoven-moonlight-1")); await b.sleep(1500);
  const more = await b.eval(`(() => { const fits = ${fits0};
    const M = AnalysedScores.scores()[0]; M.paper.getBoundingClientRect();   // Moonlight, bar 14 (2/2: bar n starts at whole note n-1)
    const ms = 13 * M.tune.millisecondsPerMeasure(), onBeat = AnalysedScores.chordAt(M, ms), whole = AnalysedScores.chordTones(M, ms);
    const span = M.spans.find(s => Math.abs(s.ms - ms) < 2), pcsOk = whole.every(m => span.pcs.includes(((m % 12) + 12) % 12));
    return [fits, onBeat.length, whole.length, pcsOk, !!document.querySelector('#as-space input[type=checkbox]')].join(' '); })()`);
  const [fits, ob, wh, pcsOk, fol] = more.split(" ");
  check("the score's box grows with the system spacing (nothing cut off)", fits === "true", fits);
  check("Moonlight bar 14: the click plays every written chord tone up to the next numeral, not just the downbeat", +wh > +ob && pcsOk === "true", ob + " → " + wh);
  check("Follow playback box in the sidebar", fol === "true");
  // the form table sits under its own heading, away from the score: its ▶ still lights and plays the page's score
  const form = await b.eval(`(async () => { const M = AnalysedScores.scores()[0]; document.querySelector('.as-form .as-form-play').click();
    await new Promise(r => setTimeout(r, 300)); const lit = M.paper.querySelectorAll('.as-hi').length, playing = !!M.playing;
    document.querySelector('a.as-bars').click(); await new Promise(r => setTimeout(r, 300));
    return [lit, playing, M.paper.querySelectorAll('.as-hi').length, AnalysedScores.scores().length].join(' '); })()`);
  const [flit, fplay, blit, nsc] = form.split(" ");
  check("form ▶ and bar links on the Moonlight page light its one score", +flit > 0 && +blit > 0 && nsc === "1", form);
  check("no errors", !errs().length, errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
