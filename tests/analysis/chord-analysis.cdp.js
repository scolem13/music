// The chord-analysis widgets on their pages (theory/chord-analysis.qmd and the "Analysis practice" section of triads, roman-numerals,
// seventh-chords): every example and exercise draws its score (the guitar stage its TAB too) with no page errors; on the guide, each
// of the four ways to enter a stack accepts the root-position stack and refuses a rotated one; a typed name is graded; the chapter
// pages offer only levels up to their chapter. Serves _site itself. Run after rendering those pages:
//   quarto render theory/chord-analysis.qmd (and the three chapter pages); node tests/analysis/chord-analysis.cdp.js   SHOTS=dir saves screenshots
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : /\.json$/.test(f) ? "application/json" : "text/html";
const PORT = 8561, wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 1200, height: 1000 }); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(x => !/supabase|createClient/i.test(x));
  const shot = async name => { if (!process.env.SHOTS) return; const r = await b.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); fs.writeFileSync(path.join(process.env.SHOTS, name + ".png"), Buffer.from(r.data, "base64")); };

  await b.goto(`http://127.0.0.1:${PORT}/theory/chord-analysis.html`); await wait(1500);
  const counts = JSON.parse(await ev(`JSON.stringify({ ex: document.querySelectorAll('.chord-analysis[data-example]').length, all: document.querySelectorAll('.chord-analysis').length,
    drawn: [...document.querySelectorAll('.chord-analysis')].filter(h => h.querySelector('.ca-paper svg')).length, tabs: document.querySelectorAll('.ca-tab').length })`));
  check("guide: every widget drew its score", counts.ex === 5 && counts.all === 11 && counts.drawn === 11, JSON.stringify(counts));
  check("guide: the guitar stage draws TAB", counts.tabs >= 2, counts.tabs);
  check("guide: no page errors", errs().length === 0, errs().slice(0, 3).join(" | "));

  // the first practice widget (Stage 1): each entry method
  const H = `document.querySelectorAll('.chord-analysis:not([data-example])')[0]`;
  const setSel = (label, v) => ev(`(() => { const l = [...${H}.querySelectorAll('.ca-form label')].find(x => x.textContent.startsWith(${JSON.stringify(label)})); const s = l.querySelector('select'); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change')); })()`);
  for (const m of ["tap", "type", "rotate", "staff"]) {
    await setSel("Enter the stack by", m); await wait(200);
    for (const right of [true, false]) {
      await ev(`${H}._ca.openStack(0)`); await wait(150);
      const ok = await ev(`(() => {
        const CA = ChordAnalysis, q = ${H}._ca.question(), c = q.items[0].chord, want = ${right} ? c.notes : c.notes.slice(1).concat([c.notes[0]]);
        const p = ${H}.querySelector('.ca-panel'), box = p.querySelector('.ca-entry');
        if (${JSON.stringify(m)} === 'tap') want.forEach(n => [...box.querySelectorAll('button')].find(x => x.textContent === CA.nm(n)).click());
        if (${JSON.stringify(m)} === 'type') { const i = box.querySelector('input'); i.value = want.map(CA.nm).join(' ').replace(/♯/g, '#').replace(/♭/g, 'b'); i.dispatchEvent(new Event('input')); }
        if (${JSON.stringify(m)} === 'rotate') { for (let k = 0; k < 4; k++) { const chips = [...box.querySelectorAll('.ca-chip')].map(x => x.textContent.replace(' ✕', '').trim()); if (chips.join() === want.map(CA.nm).join()) break; [...box.querySelectorAll('button')].find(x => x.textContent.startsWith('⤒')).click(); } }
        if (${JSON.stringify(m)} === 'staff') { let d = 28; want.forEach((n, k) => { while (d % 7 !== n.l) d++; box._place(d); d++; }); }
        [...p.querySelectorAll('button')].find(x => x.textContent === 'Check the stack').click();
        return p.querySelector('.ca-ok') ? 'ok' : p.querySelector('.ca-no') ? 'no' : 'none';
      })()`);
      check(`entry ${m}: ${right ? "root position accepted" : "rotated stack refused"}`, ok === (right ? "ok" : "no"), ok);
    }
  }
  check("entry staff: the stack is drawn as it's built", await ev(`!!${H}.querySelector('.ca-mini svg')`));
  // naming
  const graded = await ev(`(() => { const q = ${H}._ca.question(), cs = ${H}._ca.cards().filter(c => c.inp);
    cs.forEach((c, k) => { c.inp.value = k === 0 ? 'X' : ChordAnalysis.expected(q, c.i); }); ${H}._ca.grade(false);
    return ${H}.getAttribute('data-right') + '/' + ${H}.getAttribute('data-total') + ' ' + cs[0].box.className; })()`);
  check("names graded (all but a wrong first one)", /^(\d+)\/(\d+) .*no/.test(graded) && +graded.split("/")[0] === +graded.split(/[/ ]/)[1] - 1, graded);
  await ev(`[...${H}.querySelectorAll('button')].find(x => x.textContent === 'Steps').click()`); await wait(100);
  check("Steps shows the first step, then more", await ev(`(() => { const p = ${H}.querySelector('.ca-panel'), n0 = p.querySelectorAll('li').length; [...p.querySelectorAll('button')].find(x => x.textContent === 'Next step').click(); return n0 === 1 && p.querySelectorAll('li').length === 2; })()`));
  // the report: the chord-analysis work just done is in it (My report on the exercise)
  const side = await ev(`(() => { const sb = document.querySelector('#quarto-margin-sidebar .sr-side'), mine = ${H}.querySelector('.sr-mybtn');
    return !!sb && sb === sb.parentNode.lastElementChild && sb.offsetParent !== null && !!mine && getComputedStyle(mine).display === 'none'; })()`);
  check("sidebar: My report box at the bottom of the right sidebar; the exercise's own button hidden", side);
  await ev(`[...document.querySelectorAll('#quarto-margin-sidebar .sr-side button')].find(x => x.textContent === 'Open report').click()`); await wait(400);
  const rep = JSON.parse(await ev(`(() => { const box = document.querySelector('dialog[open] .sr-panel'); const name = box.querySelector('input'); name.value = 'Test Student'; name.dispatchEvent(new Event('input'));
    const rows = [...box.querySelectorAll('.ca-rep-t tr')].slice(1).map(r => [...r.children].map(td => td.textContent));
    return JSON.stringify({ rows, head: box.querySelector('.sr-rep').textContent.slice(0, 300), svg: !!box.querySelector('.ca-rep-p svg'), code: box._sr.text().match(/SR1\\.\\S+/)[0] }); })()`));
  check("report: chord analysis recorded, score redrawn", rep.svg && /Test Student/.test(rep.head) && /Chord analysis/.test(rep.head), rep.head.slice(0, 120));
  check("report: stack attempts, names and steps in the rows", rep.rows.some(r => /✓/.test(r[1])) && rep.rows.some(r => /✗/.test(r[1])) && rep.rows.some(r => /✗ X/.test(r[2])) && rep.rows.some(r => /Steps ×/.test(r[3])), JSON.stringify(rep.rows[0]));
  // every stage and level draws
  for (const st of ["rh", "guitar", "satb", "broken", "melody"]) {
    await setSel("Stage", st); await wait(150);
    for (const lv of ["ch6a", "ch6b", "ch7a", "ch7b", "ch8a", "ch8b"]) { await setSel("Level", lv); await wait(120);
      const r = await ev(`(() => { const q = ${H}._ca.question(); return !!q && q.texture === ${JSON.stringify(st)} && !!${H}.querySelector('.ca-paper svg') && (${JSON.stringify(st)} !== 'guitar' || !!${H}.querySelector('.ca-tab')); })()`);
      if (!r) check(`stage ${st}, level ${lv} draws`, false);
    }
  }
  check("every stage at every level draws", true);
  check("no page errors after all that", errs().length === 0, errs().slice(0, 3).join(" | "));
  await shot("guide");

  // a theory drill on a chapter page goes into the same record; My report there shows both; the teacher's box checks the code
  let code = null;
  await b.goto(`http://127.0.0.1:${PORT}/theory/intervals.html`); await wait(1500);
  const drilled = await ev(`(() => { const d = document.querySelector('.drill'); const q = d._drill.question(); d._drill.answer(q.answer); return d._drill.question() ? 'ok' : 'none'; })()`);
  await wait(1200);
  await ev(`(() => { const d = document.querySelector('.drill'); const q = d._drill.question(); d._drill.answer('zz'); })()`); await wait(300);
  check("drill page: sidebar counts today's answers", /Today: [1-9]/.test(await ev(`document.querySelector('.sr-side .sr-count').textContent`)));
  await b.resize(500, 900); await wait(300);
  check("narrow window: the exercise's own My report button shows instead", await ev(`getComputedStyle(document.querySelector('.drill .sr-mybtn')).display !== 'none'`));
  await ev(`document.querySelector('.drill .sr-mybtn').click()`); await wait(400); await b.resize(1200, 1000);
  const dr = JSON.parse(await ev(`(() => { const box = document.querySelector('.drill').parentNode.querySelector('.sr-panel'); return JSON.stringify({ text: box.querySelector('.sr-rep').textContent, code: box._sr.text().match(/SR1\\.\\S+/)[0] }); })()`));
  check("drill: answers recorded, with the chord analysis from the other page", drilled === "ok" && /Intervals/.test(dr.text) && /✓/.test(dr.text) && /✗ zz/.test(dr.text) && /Chord analysis/.test(dr.text) && /\d+ passage/.test(dr.text), dr.text.slice(0, 200));
  code = dr.code;
  await b.goto(`http://127.0.0.1:${PORT}/my-report.html`); await wait(1500);
  check("My Report page: the report is there", await ev(`/Intervals/.test(document.querySelector('#sr-mine .sr-rep').textContent)`));
  for (const [label, c, want] of [["untouched", code, "sr-ok"], ["edited", code.replace(/\.([0-9a-f]+)$/, (m, h) => "." + (h === "0" ? "1" : "0")), "sr-no"]]) {
    const got = await ev(`(() => { const box = document.querySelector('.sr-check'); box.querySelector('textarea').value = ${JSON.stringify(c)};
      [...box.querySelectorAll('button')].find(x => x.textContent === 'Open the report').click(); const r = box.querySelector('.sr-rep');
      return r.querySelector('p').className + '|' + [...r.querySelectorAll('.ca-rep-t td:last-child')].every(td => td.textContent !== '—') + '|' + /Intervals/.test(r.textContent); })()`);
    check(`teacher box: ${label} code`, got === want + "|true|true", got);
  }
  check("no page errors on the drill and report pages", errs().length === 0, errs().slice(0, 3).join(" | "));
  for (const [page, top, n] of [["triads", "ch6b", 2], ["roman-numerals", "ch7b", 4], ["seventh-chords", "ch8b", 6]]) {
    await b.goto(`http://127.0.0.1:${PORT}/theory/${page}.html`); await wait(1500);
    const lv = await ev(`[...document.querySelector('.chord-analysis .ca-form select').options].map(o => o.value).join()`);
    check(`${page}: levels up to ${top}`, lv.split(",").length === n && lv.endsWith(top), lv);
    check(`${page}: the exercise drew, no errors`, await ev(`!!document.querySelector('.chord-analysis .ca-paper svg')`) && errs().length === 0, errs().slice(0, 2).join(" | "));
  }
  console.log(fails ? fails + " FAILED" : "all ok"); srv.close(); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
