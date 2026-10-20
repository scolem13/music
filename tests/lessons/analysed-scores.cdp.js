// Analysed Scores (practice/analysed-scores.qmd, made by scripts/when-in-rome/build.mjs) in headless Chrome: in every tab, abcjs plays
// exactly the notes of the Humdrum source (pitch and start time, ties joined), and the score carries one label per chord of the analysis.
//   node scripts/when-in-rome/build.mjs; quarto render practice/analysed-scores.qmd; node tests/lessons/analysed-scores.cdp.js
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
  await b.goto(`http://127.0.0.1:${PORT}/practice/analysed-scores.html`); await b.sleep(1500);
  const html = fs.readFileSync(SITE + "/practice/analysed-scores.html", "utf8");   // abc-ex replaces its source with the drawn score, so read it from the file
  const abcs = [...html.matchAll(/<div class="as-score"[^>]*>\s*<script type="text\/plain">([\s\S]*?)<\/script>/g)].map(m => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  check("four scores on the page (two pieces, two analyses each)", abcs.length === 4, abcs.length);
  for (let i = 0; i < B.PIECES.length; i++) {
    const p = B.PIECES[i], { k, versions } = B.buildPiece(p);
    const want = []; for (const evs of k.voices.values()) for (const e of evs) if (!e.rest) for (const n of e.notes) if (!n.tieMid && !n.tieEnd) want.push((e.t / B.W).toFixed(4) + ":" + (12 * (n.o + 1) + NAT[n.l] + n.a));
    want.sort();
    for (let j = 0; j < 2; j++) {
      const abc = abcs[i * 2 + j];
      const plain = abc.replace(/:\|/g, "|").replace(/\|:/g, "|");   // the repeat played once, to match the source's notes
      const got = await b.eval(`(() => { const v = ABCJS.renderAbc(document.createElement('div'), ${JSON.stringify(plain)})[0], out = [];
        v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.start.toFixed(4) + ':' + e.pitch); })); return out.sort(); })()`);
      const miss = want.filter(x => !got.includes(x)), extra = got.filter(x => !want.includes(x));
      check(`${p.id} (${versions[j].who.slice(0, 22)}): abcjs plays the source's ${want.length} notes`, !miss.length && !extra.length && got.length === want.length, `missing ${miss.slice(0, 4)} extra ${extra.slice(0, 4)} (${got.length} vs ${want.length})`);
      const labels = (abc.match(/"_[^"]+"/g) || []).length;
      check(`${p.id} (${versions[j].who.slice(0, 22)}): every chord of the analysis labelled`, labels === versions[j].count && !versions[j].misses.length, labels + " of " + versions[j].count);
    }
  }
  const drawn = await b.eval(`document.querySelectorAll('.as-score svg').length`);
  check("the scores are drawn", drawn >= 2, drawn);
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
  check("bar numbers use the light (200) font", /digits-200\.ttf/.test(font), font.slice(0, 120));
  check("no errors", !errs().length, errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
