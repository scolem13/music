// The chord-analysis widgets on their pages (theory/chord-analysis.qmd and the "Analysis practice" section of triads, roman-numerals,
// seventh-chords): every example and exercise draws its score (the guitar stage its TAB too) with no page errors; on the guide, each
// of the four ways to enter a stack accepts the root-position stack and refuses a rotated one; a typed name is graded; the chapter
// pages offer only levels up to their chapter. Serves _site itself. Run after rendering those pages:
//   quarto render theory/chord-analysis.qmd (and the three chapter pages); node tests/analysis/chord-analysis.cdp.js   SHOTS=dir saves screenshots
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : /\.json$/.test(f) ? "application/json" : "text/html";
const PORT = +process.env.PORT || 8561, wait = ms => new Promise(r => setTimeout(r, ms));
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
  check("guide: every widget drew its score", counts.ex === 12 && counts.all === 25 && counts.drawn === 25, JSON.stringify(counts));
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
  // ch. 9: a function select on every chord and a cadence card; right answers all count, a wrong function turns that card red
  await setSel("Stage", "satb"); await setSel("Level", "ch9"); await wait(300);
  const f9 = await ev(`(() => { const q = ${H}._ca.question(), cs = ${H}._ca.cards(); return JSON.stringify({ fn: q.fn, sels: cs.filter(c => c.sel && !c.cad).length, items: q.items.length, cad: cs.filter(c => c.cad).length, hasCad: !!q.cadence }); })()`);
  const f9o = JSON.parse(f9);
  check("ch9: a function select on every chord, a cadence card", f9o.fn && f9o.sels === f9o.items && f9o.cad === 1 && f9o.hasCad, f9);
  const g9 = await ev(`(() => { const q = ${H}._ca.question(), cs = ${H}._ca.cards(), A = ${H}._ca;
    const fill = bad => cs.forEach(c => { if (c.inp) c.inp.value = ChordAnalysis.expected(q, c.i); if (c.sel) c.sel.value = c.cad ? q.cadence : q.items[c.i].fn; });
    fill(); A.grade(false); const good = ${H}.getAttribute('data-right') + '/' + ${H}.getAttribute('data-total');
    const c0 = cs.find(c => !c.cad && !c.key), real = c0.sel.value; c0.sel.value = ['T','TP','PD','D'].find(f => f !== real); A.grade(false);
    return good + ' ' + ${H}.getAttribute('data-right') + ' ' + c0.box.className; })()`);
  const [gg, gr, gc] = g9.split(" ");
  check("ch9: right names + functions + cadence all count; a wrong function is red", gg.split("/")[0] === gg.split("/")[1] && +gr === +gg.split("/")[1] - 1 && /no/.test(g9), g9);
  check("ch9: the Steps list carries a Function step", await ev(`(() => { const q = ${H}._ca.question(); return ChordAnalysis.steps(q, 0).some(x => x.h === 'Function'); })()`));
  // ch. 10: always the melody stage, a card with a type select for each marked non-chord tone; right types count, a wrong one is red
  await setSel("Level", "ch10"); await wait(300);
  const n10 = await ev(`(() => { const q = ${H}._ca.question(), cs = ${H}._ca.cards(); return JSON.stringify({ tex: q.texture, nct: q.ncts.length, cards: cs.filter(c => c.nct != null).length, labelled: q.ncts.every(x => q.abc.includes('"_' + x.label + '"')) }); })()`);
  const n10o = JSON.parse(n10);
  check("ch10: melody stage, one type card per marked non-chord tone", n10o.tex === "melody" && n10o.nct >= 1 && n10o.cards === n10o.nct && n10o.labelled, n10);
  const g10 = await ev(`(() => { const q = ${H}._ca.question(), cs = ${H}._ca.cards(), A = ${H}._ca;
    cs.forEach(c => { if (c.inp) c.inp.value = ChordAnalysis.expected(q, c.i); if (c.nct != null) c.sel.value = q.ncts[c.nct].kind; });
    A.grade(false); const good = ${H}.getAttribute('data-right') + '/' + ${H}.getAttribute('data-total');
    const c0 = cs.find(c => c.nct != null); c0.sel.value = ChordAnalysis.NCT_KINDS.find(k => k !== q.ncts[c0.nct].kind); A.grade(false);
    return good + ' ' + ${H}.getAttribute('data-right') + ' ' + c0.box.className; })()`);
  const [g10a, g10b] = g10.split(" ");
  check("ch10: right types all count; a wrong type is red", g10a.split("/")[0] === g10a.split("/")[1] && +g10b === +g10a.split("/")[1] - 1 && /no/.test(g10), g10);
  // ch. 16: figures only; every expected answer (Cad64 included) is accepted, a /3rd slash is not
  await setSel("Level", "ch16"); await wait(300);
  const g16 = await ev(`(() => { const q = ${H}._ca.question(), cs = ${H}._ca.cards(), A = ${H}._ca;
    cs.forEach(c => { if (c.inp) c.inp.value = ChordAnalysis.expected(q, c.i); });
    A.grade(false); const good = ${H}.getAttribute('data-right') + '/' + ${H}.getAttribute('data-total');
    return good + ' ' + q.figs + ' ' + /figures/.test(${H}.textContent); })()`);
  const [g16a, g16f, g16t] = g16.split(" ");
  check("ch16: figures level, expected answers all count", g16f === "true" && g16t === "true" && g16a.split("/")[0] === g16a.split("/")[1] && +g16a.split("/")[1] > 0, g16);
  // every stage and level draws
  for (const st of ["rh", "guitar", "satb", "broken", "melody"]) {
    await setSel("Stage", st); await wait(150);
    for (const lv of ["ch6a", "ch6b", "ch7a", "ch7b", "ch8a", "ch8b", "ch9", "ch10", "ch16", "ch17", "ch18", "ch19", "ch20"]) { await setSel("Level", lv); await wait(120);
      const r = await ev(`(() => { const q = ${H}._ca.question(); return !!q && q.texture === (${JSON.stringify(lv)} === 'ch10' ? 'melody' : ${JSON.stringify(st)}) && !!${H}.querySelector('.ca-paper svg') && (${JSON.stringify(st)} !== 'guitar' || ${JSON.stringify(lv)} === 'ch10' || !!${H}.querySelector('.ca-tab')); })()`);
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
