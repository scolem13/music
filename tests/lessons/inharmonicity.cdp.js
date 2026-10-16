// The Out-of-Tune Overtones lesson (lessons/inharmonicity.qmd) in headless Chrome, and the strobe lesson's link to it. Run after rendering both:
//   quarto render lessons/inharmonicity.qmd; quarto render lessons/strobe-tuner.qmd; node tests/lessons/inharmonicity.cdp.js
// Checks: the page builds with no console errors, every widget is made, sections fold and the jump bar opens them, the links to and from the
// strobe, tuning-systems and sound-harmonics lessons are present, the practice-instrument menu drives the strobe bands (each preset's expected
// cents are read from the live bands of the made-up source), the calculator and the pluck chart say the right numbers.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".svg") ? "image/svg+xml" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8517);
const URL = p => `http://127.0.0.1:8517/lessons/${p}.html`;
(async () => {
  const b = await launch({ args: [] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabaseUrl/.test(e));
  b.errors.length = 0; await b.goto(URL("inharmonicity")); await b.sleep(1200);
  const r = await ev(`(() => ({ tuners: SynthKit.widgets.filter(w => w.kind === 'tuner').length, hosts: document.querySelectorAll('div.sk[data-w=tuner]').length,
    own: document.querySelectorAll('div.in-w').length, failed: [...document.querySelectorAll('div.sk,div.in')].filter(d => /failed|Unknown|needs/.test(d.textContent.slice(0, 120))).length,
    secs: document.querySelectorAll('section.level2.ls-sec').length, toc: document.querySelectorAll('#TOC a').length, title: document.title,
    refs: document.querySelectorAll('ol.in-refs li').length, cites: [...document.querySelectorAll('main a')].filter(a => /#r\\d+$/.test(a.getAttribute('href') || '')).length }))()`);
  check("page builds: 8 strobe tuners, 3 page widgets, nothing failed", r.tuners === 8 && r.hosts === 8 && r.own === 3 && !r.failed, JSON.stringify(r));
  check("sections are collapsible, the jump bar lists them, references are numbered and cited", r.secs >= 12 && r.toc >= 12 && r.refs >= 25 && r.cites > 60, `secs ${r.secs} toc ${r.toc} refs ${r.refs} cites ${r.cites}`);
  check("no console errors on load", !noErr().length, noErr().join(" | "));
  const hrefs = await ev(`[...document.querySelectorAll('main a')].map(a => a.getAttribute('href'))`);
  for (const h of ["strobe-tuner.qmd", "tuning-systems.qmd", "sound-harmonics.qmd"]) check("links to " + h, hrefs.some(x => x && new RegExp(h.replace(".qmd", "\\.html$")).test(x)), "");
  // every reference [n] cited in the text has an entry
  const miss = await ev(`[...new Set([...document.querySelectorAll('main a')].map(a => (/#(r\\d+)$/.exec(a.getAttribute('href') || '') || [])[1]).filter(Boolean))].filter(id => !document.getElementById(id))`);
  check("every cited reference exists", !miss.length, miss.join(","));
  // fold, then open from the jump bar
  const sid = "strings";
  await ev(`document.querySelector('section.level2#${sid} > h2').click()`); const shut = await ev(`document.getElementById('${sid}').classList.contains('ls-shut')`);
  const hidden = await ev(`getComputedStyle(document.querySelector('#${sid} > .ls-body')).display`);
  await ev(`[...document.querySelectorAll('#TOC a')].find(a => a.hash === '#${sid}').click()`);
  check("heading click folds a section, the jump bar opens it", shut && hidden === "none" && !(await ev(`document.getElementById('${sid}').classList.contains('ls-shut')`)));
  await ev(`location.hash = '#r9'`); await b.sleep(300);
  check("a link to a reference opens the section that holds it", !(await ev(`document.getElementById('references').classList.contains('ls-shut')`)));

  // each preset drives the live strobe bands (made-up source, A3 = 220 Hz, 12-ET)
  const T = `SynthKit.widgets.filter(w => w.kind === 'tuner')[7]`;   // the workshop tuner
  const want = { string: { 1: 0 }, marimba: { 1: 0, 4: 0, 10: 0 }, xylophone: { 1: 0, 3: 0 }, clarinet: { 1: 0, 3: 0, 5: 0 }, timpani: { 2: 0, 3: 0, 4: 0, 5: 0 },
    chime: { 2: 0, 3: 1200 * Math.log2(2 * 121 / 81 / 3), 4: 1200 * Math.log2(2 * 169 / 81 / 4) }, bell: { 1: 0, 2: 0, 4: 0 }, brass: { 2: 0, 3: 0, 7: 0 }, voice: { 1: 0, 3: 0 } };
  await ev(`${T}.c.stiff.set(0); ${T}.c.detune.set(0)`); await ev(`${T}.start()`);
  for (const id of Object.keys(want)) {
    await ev(`${T}.c.inst.set('${id}')`); await b.sleep(1800);
    const bs = await ev(`${T}.state().bands.map(x => ({ k: x.k, cents: x.cents, alive: x.alive }))`), bad = [];
    for (const k of Object.keys(want[id]).map(Number)) { const x = bs[k - 1]; if (!x || !x.alive || Math.abs(x.cents - want[id][k]) > 2.5) bad.push(`band ${k}: ${x && x.alive ? x.cents.toFixed(1) : "dead"} want ${want[id][k].toFixed(1)}`); }
        check(`preset ${id}: bands read the expected cents in the browser`, !bad.length, bad.join("; "));
  }
  // clarinet: even rows are empty; timpani and chime: band 1 empty
  await ev(`${T}.c.inst.set('clarinet')`); await b.sleep(1800); const cl = await ev(`${T}.state().bands.map(x => x.alive)`);
  check("clarinet: odd bands alive, even bands empty", cl[0] && cl[2] && cl[4] && !cl[1] && !cl[3] && !cl[5], JSON.stringify(cl));
  await ev(`${T}.c.inst.set('timpani')`); await b.sleep(1800); const tp = await ev(`${T}.state().bands.map(x => x.alive)`);
  check("timpani: band 1 (the virtual pitch) is empty, bands 2 to 5 alive", !tp[0] && tp.slice(1, 5).every(Boolean), JSON.stringify(tp));
  await ev(`${T}.stop()`);
  check("the default made-up string is unchanged (inst=string at load in the stiff-string tuner)", await ev(`SynthKit.widgets.filter(w => w.kind === 'tuner')[0].P.inst`) === "string");

  // the three page widgets
  const lad = await ev(`(() => { const w = document.querySelector('div.in[data-w=ladder]'); const sel = w.querySelector('select'); sel.value = 'marimba'; sel.dispatchEvent(new Event('input')); return [...w.querySelectorAll('table.in-tab tr')].slice(1).map(tr => [...tr.cells].map(c => c.textContent)); })()`);
  check("ladder: marimba rows 1 : 4 : 10, all on the harmonics", lad.length === 3 && lad[1][1] === "4.000" && lad[2][1] === "10.000" && lad.every(row => Math.abs(parseFloat(row[4])) < 0.05), JSON.stringify(lad));
  const bellRows = await ev(`(() => { const w = document.querySelector('div.in[data-w=ladder]'); const sel = w.querySelector('select'); sel.value = 'bell'; sel.dispatchEvent(new Event('input')); return [...w.querySelectorAll('table.in-tab tr')].slice(1).map(tr => [...tr.cells].map(c => c.textContent)); })()`);
  check("ladder: bell has the tierce at 2.366 times the hum", bellRows.some(row => row[1] === "2.366"), JSON.stringify(bellRows.map(x => x[1])));
  const calc = await ev(`(() => { const w = document.querySelector('div.in[data-w=calc]'); const t = w.querySelector('.in-note').textContent; const m = /Tension ([\\d.]+) N.*B = ([\\d.e+-]+)/.exec(t); return { T: +m[1], B: +m[2], text: t.slice(0, 80) }; })()`);
  // G3 plain .017", 648 mm: mu = 7850 pi (0.4318e-3)^2 / 4 = 1.149e-3 kg/m, T = mu (2 L f)^2 = 74.2 N, B = pi^3 E d^4 / (64 T L^2) = 1.1e-4
  check("calculator: plain G (.017 in, 648 mm, 196 Hz) tension about 74 N and B about 1.1e-4", Math.abs(calc.T - 74.2) < 1.5 && calc.B > 0.9e-4 && calc.B < 1.3e-4, JSON.stringify(calc));
  const b12 = await ev(`(() => { const w = document.querySelector('div.in[data-w=calc]'); const r = w.querySelectorAll('input[type=range]'); const f = r[r.length - 1]; f.value = 12; f.dispatchEvent(new Event('input')); return w.querySelector('.in-note').textContent; })()`);
  check("calculator: at the 12th fret B is four times the open value", /\(open: [\d.e+-]+, 4\.00 times\)/.test(b12), b12.slice(0, 160));
  const pl = await ev(`(() => { const w = document.querySelector('div.in[data-w=pluck]'); const s = w.querySelectorAll('select')[0]; s.value = '0.333'; s.dispatchEvent(new Event('input')); const a = w.querySelector('.in-note').textContent; s.value = '0.5'; s.dispatchEvent(new Event('input')); return [a, w.querySelector('.in-note').textContent]; })()`);
  check("pluck chart: a third of the way kills 3, 6, 9, 12, 15; the middle kills every even harmonic", /: 3, 6, 9, 12, 15\./.test(pl[0]) && /: 2, 4, 6, 8, 10, 12, 14, 16\./.test(pl[1]), JSON.stringify(pl));
  check("no console errors after using everything", !noErr().length, noErr().join(" | "));

  // the strobe lesson links here
  b.errors.length = 0; await b.goto(URL("strobe-tuner")); await b.sleep(900);
  check("strobe-tuner lesson links to the new lesson, and still builds without errors", await ev(`[...document.querySelectorAll('main a')].some(a => /inharmonicity/.test(a.getAttribute('href') || ''))`) && !noErr().length, noErr().join(" | "));
  // the index card
  await b.goto(URL("index")); await b.sleep(500);
  check("lessons index has a card for it", await ev(`[...document.querySelectorAll('main a')].some(a => /inharmonicity\\.html/.test(a.getAttribute('href') || ''))`));
  await b.close(); srv.close(); console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
