// theory/enharmonic-modulation.qmd in a browser: every widget draws, each choice redraws a score whose notes are the chord's, the quiz
// grades, no page errors. Serves SITE (default _site; use a scratch render): quarto render theory/enharmonic-modulation.qmd
//   SITE=<dir> PORT=8520 node tests/enharmonic/enharmonic.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : /\.json$/.test(f) ? "application/json" : "text/html";
const PORT = +process.env.PORT || 8520, wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 1100, height: 900 }); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(x => !/supabase|createClient/i.test(x));
  await b.goto(`http://127.0.0.1:${PORT}/theory/enharmonic-modulation.html`); await wait(1500);
  const n = JSON.parse(await ev(`JSON.stringify({ dim: document.querySelectorAll('.em-dim').length, ger: document.querySelectorAll('.em-ger').length, en: document.querySelectorAll('.em-engerman').length, quiz: document.querySelectorAll('.em-quiz').length,
    drawn: [...document.querySelectorAll('.em-stage')].filter(s => s.querySelector('svg')).length, stages: document.querySelectorAll('.em-stage').length })`));
  check("every widget drew its first score", n.dim === 3 && n.ger === 1 && n.en === 1 && n.quiz === 1 && n.drawn === n.stages && n.stages === 6, JSON.stringify(n));
  // every choice button in the first diminished-seventh player redraws; the ABC sounds the right pitch classes (the second bar's tonic or dominant seventh)
  const r = JSON.parse(await ev(`(() => { const h = document.querySelector('.em-dim'), out = []; const btns = [...h.querySelectorAll('.em-choices button')];
    btns.forEach(bt => { bt.click(); const st = h.querySelector('.em-stage'); out.push([bt.textContent, !!st.querySelector('svg'), (st.getAttribute('data-abc') || '').split('\\n').filter(l => /^\\[V:/.test(l)).length, st.querySelector('.em-cap').textContent.slice(0, 60)]); });
    return JSON.stringify(out); })()`));
  check("diminished seventh: 8 choices, each draws two voices", r.length === 8 && r.every(x => x[1] && x[2] === 2), JSON.stringify(r.map(x => x[0])));
  check("diminished seventh: B D F A♭ in the first key", /B D F A♭/.test(r[0][3]), r[0][3]);
  const g = JSON.parse(await ev(`(() => { const h = document.querySelector('.em-ger'), bt = [...h.querySelectorAll('.em-choices button')], out = []; bt.forEach(b => { b.click(); out.push(h.querySelector('.em-cap').textContent); }); return JSON.stringify(out); })()`));
  check("Ger+65 / V7: every button redraws with a caption naming both spellings", g.length === 9 && g.every(c => /Ger\\+65|V7/.test(c)) && g.some(c => /A♭ C E♭ F♯/.test(c) && /A♭ C E♭ G♭/.test(c)), g.length + " " + g[3]);
  // the quiz: the right answer is accepted, a wrong one is not
  const qz = JSON.parse(await ev(`(() => { const h = document.querySelector('.em-quiz'), find = t => [...h.querySelectorAll('button')].find(x => x.textContent === t), res = [], kinds = {};
    for (let i = 0; i < 40; i++) { find('Another chord').click();
      const right = h.getAttribute('data-right').split(',').map(Number), btns = [...h.querySelectorAll('.em-choices button[data-pc]')], q = h.querySelector('.em-q').textContent;
      btns.forEach(x => { if (x.classList.contains('active')) x.click(); });
      const dim = /vii/.test(q); kinds[dim ? 'dim' : 'ger'] = 1;
      // a wrong answer first: a pitch class that is not right (nothing ticked for the dim7 question)
      find('Check').click(); const none = h.querySelector('.em-msg').textContent;
      btns.filter(x => right.includes(+x.getAttribute('data-pc'))).forEach(x => x.click()); find('Check').click(); const good = h.querySelector('.em-msg').textContent;
      res.push([dim, right.length, btns.length, /^Not/.test(none), good === 'Right.']); }
    return JSON.stringify({ kinds, res }); })()`));
  check("quiz: both kinds appear, a right set is accepted, an empty answer is not", qz.kinds.dim && qz.kinds.ger && qz.res.every(x => x[3] && x[4] && (x[0] ? x[1] === 4 && x[2] === 12 : x[1] === 1 && x[2] === 4)), JSON.stringify(qz.res.slice(0, 3)));
  check("no page errors", errs().length === 0, errs().slice(0, 3).join(" | "));
  await b.close && b.close(); srv.close();
  console.log(fails ? "FAILED " + fails : "all ok"); process.exit(fails ? 1 : 0);
})();
