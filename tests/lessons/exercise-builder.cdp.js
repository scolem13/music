// The Exercise Builder (practice/exercise-builder.qmd) in headless Chrome: the link's seed gives the same set twice; every item is made;
// abcjs plays each chorale's four voices as generated; right answers score full marks and wrong ones don't; the fill-in's typed notes are
// drawn in the score and graded by the voice-leading checker; the answer key prints only when asked. Run after rendering:
//   quarto render practice/exercise-builder.qmd; node tests/lessons/exercise-builder.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8541;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const URL = q => `http://127.0.0.1:${PORT}/practice/exercise-builder.html${q}`;
(async () => {
  const b = await launch();
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(e => !/supabase|createClient|soundfont|fetch|load sound|favicon|sounds/i.test(e));
  const Q = "?ch=7,10,11,13,16,17,18,19,20,21,31&types=rn,cad,period,fill,melodic,drills&n=24&seed=777&input=inline";
  await b.goto(URL(Q)); await b.sleep(1500);
  const first = await ev(`[...document.querySelectorAll('.ex-item .ex-title')].map(x => x.textContent).join('|')`);
  const n = await ev(`document.querySelectorAll('.ex-item').length + ',' + document.getElementById('ex-builder')._ex.items().length`);
  check("24 items made from the link", n === "24,24", n);
  await b.goto(URL(Q)); await b.sleep(1500);
  const again = await ev(`[...document.querySelectorAll('.ex-item .ex-title')].map(x => x.textContent).join('|')`);
  check("the same seed gives the same set", first === again && first.length > 100, first.slice(0, 80));
  const kinds = await ev(`document.getElementById('ex-builder')._ex.kinds().join(',')`);
  check("kinds from the chapters", /rn,cad,period,fill/.test(kinds) && /drill:motive/.test(kinds) && /drill:aug6/.test(kinds) && /drill:jzname/.test(kinds), kinds);
  // abcjs plays the chorales as generated (four voices)
  const p = await ev(`(() => { const bad = [];
    for (let i = 0; i < 40; i++) { const c = Chorale.make({ chapters: [7, 16, 17, 18, 19, 20], phrases: 1 + (i % 2), mode: 'both' }), v = ABCJS.renderAbc(document.createElement('div'), c.abc({ labels: true }))[0];
      const got = v.setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).sort((a, b) => a - b).join(), want = c.chords.flatMap(x => x.v).sort((a, b) => a - b).join();
      if (got !== want) bad.push(c.key.label + ' ' + c.chords.map(x => x.rn).join(' ')); }
    return bad; })()`);
  check("40 chorales: abcjs plays the four voices as generated", p.length === 0, p.slice(0, 3).join(" | "));
  // right answers everywhere -> full marks; then wrong ones -> not
  // fill items: type the model voice (from the key), choices: click the right ones (from the answer text), drills: the engine's answer
  const res = await ev(`(() => { const items = document.getElementById('ex-builder')._ex.items(), lis = [...document.querySelectorAll('.ex-item')], keyLis = [...document.querySelectorAll('.ex-key li')];
    items.forEach((it, i) => { const li = lis[i];
      const boxes = li.querySelectorAll('.ex-blanks input'); if (boxes.length) it.answer.split(/\\s+/).forEach((a, k) => { if (boxes[k]) boxes[k].value = a; });
      const ai = li.querySelector('.ai-notes'); if (ai) { const m = /One good \\w+: (.*?)\\. Others/.exec(keyLis[i].textContent); ai.value = m[1]; ai.dispatchEvent(new Event('input')); }
      const groups = [...li.querySelectorAll('.ex-choices')], ans = it.answer.split('; ');
      groups.forEach((g, k) => { const want = ans[k] || it.answer; const btn = [...g.querySelectorAll('button')].find(x => x.textContent === want); if (btn) btn.click(); });
      const tx = li.querySelector('.ex-text'); if (tx) tx.value = it.answer.replace(/♭/g, 'b').replace(/♯/g, '#');
    });
    document.querySelector('#ex-builder .ex-check').click();
    return [document.querySelector('.ex-score-line').textContent, lis.filter(l => /^✗/.test(l.querySelector('.ex-fb').textContent)).map(l => l.querySelector('.ex-title').textContent.slice(0, 40) + ' → ' + l.querySelector('.ex-fb').textContent.slice(0, 80)).join(' | ')]; })()`);
  const sc = /Score: (\d+) \/ (\d+)/.exec(res[0]);
  check("right answers (drawn from the key) score full marks", sc && sc[1] === sc[2], res[0] + " " + res[1]);
  // a wrong fill: parallel octaves with the bass, or notes missing
  const fill = await ev(`(() => { const lis = [...document.querySelectorAll('.ex-item')], li = lis.find(l => l.querySelector('.ai-notes')); if (!li) return 'none';
    const ai = li.querySelector('.ai-notes'), svgBefore = li.querySelector('.ex-score').innerHTML.length; ai.value = 'C4'; ai.dispatchEvent(new Event('input'));
    document.querySelector('#ex-builder .ex-check').click(); return li.querySelector('.ex-fb').textContent.slice(0, 40); })()`);
  check("a fill with notes missing is marked wrong", /^✗.*Write all/.test(fill), fill);
  // typed notes appear in the score
  const drawn = await ev(`(() => { const li = [...document.querySelectorAll('.ex-item')].find(l => l.querySelector('.ai-notes')); const ai = li.querySelector('.ai-notes');
    const n0 = li.querySelectorAll('.ex-score .abcjs-note').length; ai.value = ''; ai.dispatchEvent(new Event('input')); const n1 = li.querySelectorAll('.ex-score .abcjs-note').length;
    ai.value = 'C4 C4'; ai.dispatchEvent(new Event('input')); const n2 = li.querySelectorAll('.ex-score .abcjs-note').length; return [n1, n2].join(); })()`);
  const [n1, n2] = drawn.split(",").map(Number);
  check("typed notes are drawn in the blank", n2 === n1 + 2, drawn);
  // the answer key: hidden on screen, printed only with the box ticked
  const key = await ev(`[getComputedStyle(document.querySelector('.ex-key')).display, document.querySelectorAll('.ex-key li').length].join()`);
  check("answer key hidden on screen, one entry per item", key === "none,24", key);
  const pr = await ev(`(() => { const rules = []; for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (const r of rs) if (r.media && /print/.test(r.media.mediaText)) for (const x of r.cssRules) rules.push(x.cssText); }
    const t = rules.join(' '); return [/\.ex-settings[^{]*\{[^}]*display: none/.test(t), /body\.ex-with-key \.ex-key \{[^}]*display: block/.test(t)].join(); })()`);
  check("print rules: settings hidden, the key shown only with the box ticked", pr === "true,true", pr);
  check("no errors", !errs().length, errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
