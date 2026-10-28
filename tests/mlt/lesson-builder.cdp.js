// MLT lesson planner in a browser: a built plan fills the class with each activity's own length (estimates marked ~), and the
// class screen shows each activity's screen type (song list, tool page in a frame, prompt).
// Render first: quarto render mlt/lesson-builder.qmd.   node tests/mlt/lesson-builder.cdp.js   (SITE=<dir> for another render)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8554);
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), wait = async (c, n = 60) => { for (let i = 0; i < n; i++) { if (await ev(c)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);
  await b.goto("http://127.0.0.1:8554/mlt/lesson-builder.html");
  await wait(`document.querySelectorAll('#lb-unit option').length > 0`);
  await ev(`document.querySelector('#lb-build').click()`);
  const sum = await ev(`[...document.querySelectorAll('#lb-list .lb-min')].reduce((t, x) => t + +x.value, 0)`);
  check("the plan fills the 45 minutes", sum === 45, "sum " + sum);
  check("estimated lengths are marked ~", await ev(`document.querySelectorAll('#lb-list .lb-est').length > 0`));
  // the record sheet: a class, then the LSA item shows a box per student; two taps = teaching then evaluation mode
  await ev(`(() => { localStorage.setItem('mlt-records', JSON.stringify({ classes: { '3B': { roster: [{ name: 'Ana', apt: 'high' }, { name: 'Ben', apt: 'avg' }], sheets: {} } } }));
    localStorage.setItem('mlt-records-cur', '3B'); })()`);
  await b.goto("http://127.0.0.1:8554/mlt/lesson-builder.html");
  await wait(`document.querySelectorAll('#lb-unit option').length > 0 && document.querySelector('.rs-cls').value === '3B'`);
  await ev(`document.querySelector('#lb-build').click()`);
  check("no record sheet on the first whole", await ev(`document.querySelector('#lb-rec').innerHTML === ''`));
  await ev(`document.querySelector('#lb-skip').click()`);
  check("LSA item: a box for each student", await wait(`document.querySelectorAll('#lb-rec .rs-box').length === 2`));
  await ev(`(() => { const a = document.querySelector('#lb-rec .rs-box'); a.click(); a.click(); document.querySelectorAll('#lb-rec .rs-box')[1].click(); })()`);
  await ev(`document.querySelector('#lb-skip').click()`); await ev(`document.querySelector('#lb-back').click()`);
  const mk = await ev(`[...document.querySelectorAll('#lb-rec .rs-marks')].map(x => x.textContent).join(',')`);
  check("marks kept after moving away and back: Ana evaluated (+), Ben in teaching mode (|)", mk === "+,|", mk);
  await ev(`(() => { localStorage.removeItem('mlt-records'); localStorage.removeItem('mlt-records-cur'); })()`);
  // the class screen, fed a plan over the channel
  await b.goto("http://127.0.0.1:8554/mlt/lesson-builder.html?screen=class");
  await wait(`!!document.querySelector('#cs-title')`);
  const send = (act) => ev(`(() => { const A = MLTActivities.find(a => ${act}); window.__a = A; const plan = { book: 'mullen', unit: '', items: [{ kind: 'second', title: A.name, minutes: 5, act: A.id }] };
    new BroadcastChannel('mlt-lesson').postMessage({ plan, cur: 0, left: 300, running: false }); return A.id; })()`);
  await send(`a.screen === 'song' && a.tunes && a.tunes.length`);
  check("song activity: the tunes listed on the class screen", await wait(`document.querySelectorAll('#cs-body .lb-songs li').length === __a.tunes.length`)&& await ev(`!/-/.test(document.querySelector("#cs-body .lb-songs").textContent)`), await ev(`document.querySelector('#cs-body').textContent.slice(0, 120)`));
  await send(`a.screen === 'tool'`);
  check("tool activity: the site page in a frame", await wait(`(document.querySelector('#cs-body iframe.lb-tool') || {}).getAttribute && document.querySelector('#cs-body iframe.lb-tool').getAttribute('src') === __a.tool`));
  await send(`a.screen === 'prompt'`);
  check("prompt activity: the student line, no frame", await wait(`document.querySelector('#cs-body .lb-say') && document.querySelector('#cs-body .lb-say').textContent === __a.student && !document.querySelector('#cs-body iframe')`));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
