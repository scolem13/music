// The teacher's "In class" view on my-report.qmd: a student answers Theory Drills (one wrong), the report code is pasted, and the
// view asks the same questions again (same drawn ABC), shows the student's answers on request, records nothing the teacher
// answers, and rebuilds a chord-analysis passage from its seed. Run after rendering my-report.qmd and theory/theory-drills.qmd:
//   node tests/report/class-view.cdp.js    SHOTS=dir saves a screenshot
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : "text/html";
const PORT = 8563, wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 1200, height: 1000 }); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(x => !/supabase|createClient/i.test(x));
  await b.goto(`http://127.0.0.1:${PORT}/theory/theory-drills.html?ex=interval`); await wait(1500);
  await ev(`localStorage.removeItem("site-record-v1")`);
  // the student: one right, one wrong
  await ev(`(() => { const d = document.querySelector('.drill')._drill; d.answer(d.question().answer); })()`); await wait(1200);
  await ev(`(() => { const d = document.querySelector('.drill')._drill; d.answer("?nope"); })()`); await wait(400);
  const rec = JSON.parse(await ev(`JSON.stringify(JSON.parse(localStorage.getItem("site-record-v1")).items)`));
  check("the student's two questions are recorded with a seed", rec.length === 2 && rec.every(x => x.seed != null && /ex=interval/.test(x.set)), JSON.stringify(rec.map(x => x.seed)));
  await b.goto(`http://127.0.0.1:${PORT}/my-report.html`); await wait(1500);
  const code = await ev(`(() => { const items = SiteRecord.all().slice(); items.push({ id: "ca1", tool: "chord-analysis", pg: "/theory/chord-analysis.html", t: Date.now(), at: [], h: 0, rv: 0, ex: "Chord analysis", d: { s: "level=ch6a&seed=4242", k: [], c: [{ st: [["C E G", 0, 5]], nm: [], h: 1, rv: 0 }] } });
    return SiteRecord.code({ v: 1, n: "Test student", range: "all", d: Date.now(), items: items }); })()`);
  await ev(`(() => { const box = document.querySelector('.sr-check'); box.querySelector('textarea').value = ${JSON.stringify(code)};
    [...box.querySelectorAll('button')].find(x => x.textContent.startsWith('In class')).click(); })()`);
  await wait(3000);
  const st = JSON.parse(await ev(`(() => { const box = document.querySelector('.sr-check'), d = box.querySelector('.dr'); return JSON.stringify({
    drill: !!d, prompt: d && d.querySelector('.dr-prompt').textContent, svg: !!(d && d.querySelector('.dr-paper svg')),
    abc: d && d._drill.question().abc, ca: !!box.querySelector('.ca .ca-paper svg'), caRep: !!box.querySelector('.sr-class details') }); })()`));
  check("In class: a working drill on the student's questions", st.drill && /question 1 of 2/.test(st.prompt) && st.svg, st.prompt);
  check("In class: question 1 is the student's question 1", st.abc === rec[0].q.abc);
  check("In class: the chord-analysis passage is rebuilt and drawn, with the student's answers folded", st.ca && st.caRep);
  await ev(`[...document.querySelectorAll('.sr-check .dr button')].find(x => x.textContent === 'Next ▶').click()`); await wait(300);
  await ev(`[...document.querySelectorAll('.sr-check .dr button')].find(x => /student's answers/.test(x.textContent)).click()`); await wait(200);
  const q2 = JSON.parse(await ev(`JSON.stringify({ abc: document.querySelector('.sr-check .dr')._drill.question().abc, who: document.querySelector('.sr-check .dr-student').textContent })`));
  check("Next ▶ goes to the student's question 2", q2.abc === rec[1].q.abc);
  check("the student's wrong answer is shown on request", /✗/.test(q2.who), q2.who);
  const before = await ev(`SiteRecord.all().length`);
  await ev(`(() => { const d = document.querySelector('.sr-check .dr')._drill; d.answer(d.question().answer); })()`); await wait(300);
  check("the teacher's answer isn't recorded", (await ev(`SiteRecord.all().length`)) === before);
  await ev(`(() => { const box = document.querySelector('.sr-check'); box.querySelector('input[type=checkbox]').click(); })()`); await wait(1500);
  check("only-missed shows just the wrong question", /question 1 of 1/.test(await ev(`document.querySelector('.sr-check .dr-prompt').textContent`)));
  if (process.env.SHOTS) { const r = await b.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); fs.writeFileSync(path.join(process.env.SHOTS, "class-view.png"), Buffer.from(r.data, "base64")); }
  check("no page errors", errs().length === 0, errs().slice(0, 3).join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
