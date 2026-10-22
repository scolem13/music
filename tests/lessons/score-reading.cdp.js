// The Score Reading lessons (lessons/score-*.qmd) and the Part Reader (tools/part-reader.qmd) in headless Chrome: every ABC
// example is drawn with full bars, every drill draws a question and marks the right answer, and the Part Reader gives the
// expected concert keys. Run after rendering:
//   for f in lessons/score-{clefs,multi-clef,transposition,history,names,practice} tools/part-reader; do quarto render $f.qmd; done
//   node tests/lessons/score-reading.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8534;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const URL = p => `http://127.0.0.1:${PORT}/${p}.html`;
(async () => {
  const b = await launch();
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(e => !/supabase|soundfont|fetch|load sound|favicon/i.test(e));
  for (const p of ["score-clefs", "score-multi-clef", "score-transposition", "score-history", "score-names", "score-practice"]) {
    b.errors.length = 0;
    await b.goto(URL("lessons/" + p)); await b.sleep(900);
    const r = await ev(`(async () => {
      const ex = [...document.querySelectorAll('.abc-ex')], bad = [];
      const src = [...new DOMParser().parseFromString(await (await fetch(location.href)).text(), 'text/html').querySelectorAll('.abc-ex > script')].map(s => s.textContent);
      src.forEach((abc, i) => { const t = ABCJS.parseOnly(abc)[0], m = (abc.match(/^M:(\\d+)\\/(\\d+)/m) || [0, 1, 1]);
        const want = m[1] / m[2], lens = [];
        t.lines.forEach(l => l.staff.forEach(st => st.voices.forEach(v => { let cur = 0; v.forEach(x => { if (x.el_type === 'note') cur += x.duration; else if (x.el_type === 'bar') { lens.push(cur); cur = 0; } }); })));
        if (lens.some(l => Math.abs(l - want) > 1e-9)) bad.push(i + ':' + lens.join(',')); });
      const qs = [...document.querySelectorAll('.sq')]; let marked = 0;
      qs.forEach(q => { const why = q.querySelector('.sq-why'); for (const btn of q.querySelectorAll('.sq-a .btn')) { btn.click(); if (/^✓/.test(why.textContent)) { marked++; break; } } });
      return { ex: ex.length, drawn: ex.filter(e => e.querySelector('svg')).length, bad, qs: qs.length, marked }; })()`);
    check(p + ": examples drawn, bars full", r.drawn === r.ex && !r.bad.length, r.drawn + "/" + r.ex + " " + r.bad.join(" "));
    check(p + ": every drill has a right answer", r.qs === r.marked, r.marked + "/" + r.qs);
    check(p + ": no errors", !errs().length, errs().join(" | "));
  }
  b.errors.length = 0;
  await b.goto(URL("tools/part-reader")); await b.sleep(900);
  const pr = await ev(`(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change')); }, out = () => document.querySelector('.pr-big').textContent;
    const r = [];
    set('pr-inst', 'clar'); set('pr-var', 0); set('pr-from', 'part'); set('pr-key', 2); r.push(out());
    set('pr-inst', 'altosax'); set('pr-from', 'concert'); set('pr-key', -3); r.push(out());
    set('pr-inst', 'horn'); set('pr-var', 2); set('pr-from', 'part'); set('pr-key', 0); set('pr-play', 'horn:0'); r.push(out() + ' / ' + document.getElementById('pr-out').textContent.match(/Read each written note[^.]*/)[0]);
    set('pr-inst', 'tuba'); set('pr-var', 2); set('pr-key', 0); r.push(out());
    return { r, svgs: document.querySelectorAll('#pr-w svg, #pr-s svg').length }; })()`);
  check("part reader: B♭ clarinet in D sounds C", /D major → sounds in C major/.test(pr.r[0]), pr.r[0]);
  check("part reader: concert E♭ → alto sax part in C", /part is in C major/.test(pr.r[1]), pr.r[1]);
  check("part reader: horn in E♭ part, on F horn read a 2nd lower", /sounds in E♭ major/.test(pr.r[2]) && /major 2nd lower/.test(pr.r[2]), pr.r[2]);
  check("part reader: BB♭ bass part in C sounds B♭", /sounds in B♭ major/.test(pr.r[3]), pr.r[3]);
  check("part reader: both staves drawn, no errors", pr.svgs === 2 && !errs().length, pr.svgs + " " + errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
