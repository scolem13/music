// The band pages for Chapters 12 and 14 (theory/pop-forms.qmd, theory/accompaniment-textures.qmd): every band demo plays and writes its staff, every choice can be
// switched while it plays, and the listening quiz (.ar-quiz, apps/shared/lessons/arrange-kit.js) hides the notes until the
// answer, grades it, never asks the same texture twice running and asks all of them. Serves _site and the sample mirror itself
// (tests/band/README.md, "Samples in page tests"). Run after rendering:
//   quarto render theory/accompaniment-textures.qmd; node tests/lessons/textures.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", SF = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : /\.mp3$/.test(f) ? "audio/mpeg" : /\.json$/.test(f) ? "application/json" : "text/html";
const PORT = 8537, wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = u.startsWith("/sf/") ? path.join(SF, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 1200, height: 900 }); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(`(() => { const r = (${e}); return r === undefined || typeof r !== 'object' || Array.isArray(r) ? r : null; })()`);
  for (const page of (process.env.PAGES || "accompaniment-textures pop-forms").split(" ")) {
  console.log("-- " + page);
  await b.goto(`http://127.0.0.1:${PORT}/practice/${page}.html`); await wait(1000);
  await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, value: () => Promise.resolve(location.origin + "/sf/") })`);
  const n = await ev(`document.querySelectorAll('.ar-demo').length`), nq = await ev(`document.querySelectorAll('.ar-quiz').length`);
  const want = { "jazz-theory": [2, 1] }[page];
  check("demos and quizzes built", (want ? n === want[0] && nq === want[1] : n >= 5 && nq === 2) && await ev(`[...document.querySelectorAll('.ar-demo')].every(d => d.querySelector('.ar-play'))`), n + " demos, " + nq + " quizzes");
  for (let i = 0; i < n; i++) {
    const D = `document.querySelectorAll('.ar-demo')[${i}]`;
    await ev(`${D}.querySelector('.ar-play').click()`);
    let svg = 0; for (let t = 0; t < 40 && !svg; t++) { await wait(400); svg = await ev(`${D}.querySelectorAll('.ar-staff svg').length`); }
    const nc = await ev(`${D}.querySelectorAll('.ar-choices button').length`);
    if (await ev(`${D}.dataset.view`) === "grid") {   // data-view="grid": chord grid, sections, the whole pass written ahead
      const bars = await ev(`JSON.parse(${D}.dataset.choices)[0].chart.split('|').length`), cells = await ev(`${D}.querySelectorAll('.ar-gbar').length`);
      const secs = await ev(`(JSON.parse(${D}.dataset.choices)[0].sections || []).length`);
      check(`demo ${i + 1}: grid has every bar, sections labelled`, cells === bars && (secs < 2 || await ev(`${D}.querySelectorAll('.ar-glbl').length`) === secs), cells + "/" + bars);
      let ok = false; for (let t = 0; t < 20 && !ok; t++) { await wait(300); ok = await ev(`${D}.querySelectorAll('.ar-staff .abcjs-bar').length > 0 && !!${D}.querySelector('.ar-gnow')`); }
      const early = JSON.parse(await ev(`JSON.stringify((() => { const st = document.getElementById('ar-status').textContent.match(/Bar (\\d+)/); return { n: ${D}.querySelectorAll('.ar-staff svg').length, bar: st ? +st[1] : 0 }; })())`));
      check(`demo ${i + 1}: whole pass written before it is played`, ok && early.n === Math.max(1, secs) && early.bar < bars, JSON.stringify(early));
      if (secs > 1) { await ev(`${D}.querySelectorAll('.ar-tabs button')[2].click()`); await wait(300);
        check(`demo ${i + 1}: section tab shows one section`, await ev(`${D}.querySelectorAll('.ar-gsec').length === 1 && ${D}.querySelectorAll('.ar-staff svg').length === 1`));
        await ev(`${D}.querySelectorAll('.ar-tabs button')[0].click()`); }
    } else {   // no grid: the whole pass is still written ahead (one staff block for the chart)
      const chart = await ev(`(JSON.parse(${D}.dataset.choices || '[]')[0] || {}).chart || ${D}.dataset.chart || ''`), bars = chart.split('|').length;
      let nb = 0; for (let t = 0; t < 20 && nb < bars; t++) { await wait(300); nb = await ev(`${D}.querySelectorAll('.ar-staff .abcjs-bar').length`); }
      const at = await ev(`(() => { const st = document.getElementById('ar-status').textContent.match(/Bar (\\d+)/); return st ? +st[1] : 0; })()`);
      check(`demo ${i + 1}: whole pass written before it is played`, nb >= bars - 1 && at < bars, nb + " bars drawn at bar " + at + " of " + bars);
    }
    for (let c = 1; c < nc; c++) { await ev(`${D}.querySelectorAll('.ar-choices button')[${c}].click()`); await wait(700); }
    const label = await ev(`(${D}.previousElementSibling ? ${D}.previousElementSibling.textContent : '').slice(0, 40)`);
    if (/sections/.test(await ev(`${D}.dataset.choices || ''`))) {
      let st = ""; for (let k = 0; k < 30 && !/ · /.test(st); k++) { await wait(200); st = await ev(`document.getElementById('ar-status').textContent`); }
      check(`demo ${i + 1}: the strip names the section`, / · /.test(st), st);
    }
    check(`demo ${i + 1} plays and writes its staff (${nc} choices)`, !!svg, label);
  }
  await ev(`document.getElementById('ar-stop').click()`);
  // the quiz
  for (let k = 0; k < nq; k++) {
    const Q = `document.querySelectorAll('.ar-quiz')[${k}]`, labels = await ev(`[...${Q}.querySelectorAll('.ar-choices button')].map(b => b.textContent)`);
    const asked = []; let hidden = true, graded = true, shown = true;
    for (let r = 0; r < 4 * labels.length; r++) {
      await ev(`${Q}.querySelector('.btn-primary').click()`);
      if (r < 2) { await wait(5000); if (await ev(`${Q}.querySelectorAll('.ar-staff svg').length`)) hidden = false; }
      const pick = r % labels.length;
      await ev(`${Q}.querySelectorAll('.ar-choices button')[${pick}].click()`);
      const fb = await ev(`${Q}.querySelector('.ar-fb').textContent`), m = /^(Right|No, it was): (.*?)\./.exec(fb);
      if (!m) { graded = false; continue; }
      const it = labels.find(l => m[2].startsWith(l)); asked.push(it);
      if ((m[1] === "Right") !== (it === labels[pick])) graded = false;
      if (r < 2) { await wait(300); if (!await ev(`${Q}.querySelectorAll('.ar-staff svg').length`)) shown = false; }
      if (!await ev(`[...${Q}.querySelectorAll('.ar-choices button')].every(b => b.disabled)`)) graded = false;
    }
    check(`quiz ${k + 1}: notes hidden while asking, shown after the answer`, hidden && shown);
    check(`quiz ${k + 1}: graded right, buttons locked after an answer`, graded);
    const twice = asked.some((a, i) => i && a === asked[i - 1]), all = labels.every(l => asked.includes(l));
    check(`quiz ${k + 1}: never the same twice running, every texture asked in ${asked.length}`, !twice && all, asked.join(" · "));
  }
  await ev(`document.getElementById('ar-stop').click()`);
  }
  const errs = b.errors.filter(e => !/supabase|createClient|favicon/i.test(e));
  check("no errors", !errs.length, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
