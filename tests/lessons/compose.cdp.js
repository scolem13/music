// The Composing and Process lessons (lessons/compose-*.qmd, lessons/process-*.qmd) in headless Chrome: every ABC example is drawn,
// the motif lab builds a phrase whose bars are all full, the transposer writes the part and checks the range, the journal and
// intention builders and the command-term sorter respond, and the Lessons index filters on the Composing topic. Run after rendering:
//   for f in compose-melody compose-motif compose-song compose-instruments compose-orchestra process-journal process-crit-b index; do
//     quarto render lessons/$f.qmd; done; node tests/lessons/compose.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8533;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const URL = p => `http://127.0.0.1:${PORT}/lessons/${p}.html`;
(async () => {
  const b = await launch();
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(e => !/supabase|soundfont|fetch|load sound|favicon/i.test(e));
  const pages = { "compose-melody": 5, "compose-motif": 7, "compose-song": 3, "compose-instruments": 0, "compose-orchestra": 2, "process-journal": 0, "process-crit-b": 0 };
  for (const [p, n] of Object.entries(pages)) {
    b.errors.length = 0;
    await b.goto(URL(p)); await b.sleep(900);
    const drawn = await ev(`[...document.querySelectorAll('.abc-ex')].filter(e => e.querySelector('svg')).length`);
    check(p + ": " + n + " examples drawn, no errors", drawn === n && !errs().length, drawn + " " + errs().join(" | "));
  }

  // the motif lab: Motif, Sequence up, Fragment, Fragment, Land on C -> every bar full, ends on C
  await b.goto(URL("compose-motif")); await b.sleep(800);
  const lab = await ev(`(() => { const r = document.querySelector('.cp-motif');
    for (const k of ['motif','seqUp','fragment','fragment','home','augment','diminish']) r.querySelector('[data-op=' + k + ']').click();
    const abc = r.querySelector('.cp-out').textContent, t = ABCJS.parseOnly(abc)[0], lens = []; let cur = 0;
    for (const e of t.lines[0].staff[0].voices[0]) { if (e.el_type === 'note') cur += e.duration; else if (e.el_type === 'bar') { lens.push(cur); cur = 0; } }
    return { ops: r.getAttribute('data-ops'), bars: lens.length, bad: lens.filter(l => Math.abs(l - 1) > 1e-9).length, svg: !!r.querySelectorAll('.cp-paper svg')[1], abc }; })()`);
  check("motif lab: seven groups added", lab.ops === "motif,seqUp,fragment,fragment,home,augment,diminish", lab.ops);
  check("motif lab: phrase drawn, every bar full", lab.svg && lab.bars >= 3 && lab.bad === 0, lab.bars + " bars, " + lab.bad + " off: " + lab.abc.trim().split("\n").pop());
  const inv = await ev(`(() => { const O = CpKit.motifOps, g = CpKit.parseMotif('C2 E2 G4');
    return [O.invert.f(g).map(n => n.p).join(','), O.retro.f(g).map(n => n.d).join(','), O.diminish.f(CpKit.parseMotif('C/2 E G')) === null, CpKit.toAbcBody(CpKit.parseMotif('C6 E6 G4'))]; })()`);
  check("motif ops: inversion, retrograde, odd diminution refused, ties across the barline", inv[0] === "0,-2,-4" && inv[1] === "8,4,4" && inv[2] === true && /-/.test(inv[3]), JSON.stringify(inv));
  const typed = await ev(`(() => { const r = document.querySelector('.cp-motif'), i = r.querySelector('input'); i.value = 'c2 B A G4'; i.dispatchEvent(new Event('change'));
    r.querySelector('[data-op=motif]').click(); r.querySelector('[data-op=invert]').click(); return r.querySelector('.cp-out').textContent.trim().split('\\n').pop(); })()`);
  check("motif lab: a typed motif and its inversion", /^c4 B2 A2 G8 \| c4 d2 e2 f8 \|\]$/.test(typed), typed);

  // the transposer: clarinet in range, written a step up; tenor trombone can't reach the C5s of the default tune
  await b.goto(URL("compose-instruments")); await b.sleep(800);
  const tr = await ev(`(async () => { const r = document.querySelector('.cp-transpose'), s = r.querySelector('select'), out = [];
    out.push(r.getAttribute('data-range') + ':' + r.querySelectorAll('.cp-paper svg').length);
    s.value = 'tbn'; s.dispatchEvent(new Event('change')); out.push(r.getAttribute('data-range'));
    s.value = 'asax'; s.dispatchEvent(new Event('change')); out.push(r.getAttribute('data-range'));
    const ta = r.querySelector('textarea'); ta.value = ta.value.replace(/K:F\\n.*$/s, 'K:F\\nC,2 A,2 C2 F2 | A2 c2 f4 |]'); ta.dispatchEvent(new Event('input'));
    await new Promise(z => setTimeout(z, 600)); out.push(r.getAttribute('data-range'));
    return out.join(' '); })()`);
  check("transposer: clarinet in range, trombone out, alto sax in, a low/high tune out on alto sax", tr === "in:2 out in out", tr);
  check("transposer page: no errors", !errs().length, errs().join(" | "));

  // the journal: a thin entry is told what's missing, a full one isn't; Keep stores it
  await b.goto(URL("process-journal")); await b.sleep(600);
  await ev(`localStorage.removeItem('cp-journal-v1'); localStorage.removeItem('cp-journal-v1-draft')`);
  await b.goto(URL("process-journal")); await b.sleep(600);
  const jr = await ev(`(() => { const r = document.querySelector('.cp-journal'), f = [...r.querySelectorAll('input,textarea')], btn = t => [...r.querySelectorAll('button')].find(x => x.textContent === t);
    const set = (i, v) => { f[i].value = v; f[i].dispatchEvent(new Event('input')); };
    set(1, 'chorus'); btn('Preview').click(); const thin = r.querySelector('.cp-tools .cp-note').textContent;
    set(2, 'v1 starts on C\\nv2 jumps to E'); set(4, 'kept v2 because it is higher than the verse'); set(5, 'chorus_v2.m4a 0:21'); set(6, 'slow the last line');
    btn('Preview').click(); const full = r.querySelector('.cp-tools .cp-note').textContent; btn('Keep this entry').click();
    return [thin, full, JSON.parse(localStorage.getItem('cp-journal-v1')).length]; })()`);
  check("journal: thin entry flagged, full entry passes, kept", /Still missing/.test(jr[0]) && /shows exploration/.test(jr[1]) && jr[2] === 1, JSON.stringify(jr));

  // intention builder and sorter
  await b.goto(URL("process-crit-b")); await b.sleep(600);
  await ev(`localStorage.removeItem('cp-intent-v1')`); await b.goto(URL("process-crit-b")); await b.sleep(600);
  const it = await ev(`(() => { const r = document.querySelector('.cp-intent'), f = [...r.querySelectorAll('input')], set = (i, v) => { f[i].value = v; f[i].dispatchEvent(new Event('input')); };
    set(1, 'a 16-bar piano piece'); set(4, 'use a minor key'); const a = r.getAttribute('data-reach');
    set(5, 'it sounds darker'); const c = r.getAttribute('data-reach'); set(6, 'my take 2 vs take 3'); const d = r.getAttribute('data-reach');
    return [a, c, d, r.querySelector('.cp-out').textContent]; })()`);
  check("intention: state -> describe -> justify as reasons and evidence are added", it[0] === "1" && it[1] === "2" && it[2] === "4" && /^I intend to make a 16-bar piano piece\. I will use a minor key because it sounds darker \(my take 2 vs take 3\)\.$/.test(it[3]), JSON.stringify(it));
  const so = await ev(`(() => { const r = document.querySelector('.cp-sort'), s = [...r.querySelectorAll('select')]; s.forEach(x => x.value = x._want); r.querySelector('button').click(); return r.getAttribute('data-right'); })()`);
  check("sorter: all four right", so === "4", so);

  // index: the Composing topic shows the seven
  await b.goto(`http://127.0.0.1:${PORT}/lessons/index.html?topic=composing`); await b.sleep(800);
  const ix = await ev(`[...document.querySelectorAll('#ll-list li')].filter(li => !li.hidden).length`);
  check("index: Composing topic lists 7 lessons", ix === 7, ix);

  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
