// The Elements of Music lessons (lessons/elements-*.qmd) in headless Chrome: every ABC example (and every quiz ABC) is drawn
// with full measures, every quiz question has a right answer that marks ✓, the British-names switch swaps the .nn terms,
// hairpins reach the player as rising volumes, and the orchestral sounds elements.js adds load from the soundfont.
// Run after rendering:  for f in lessons/elements-*.qmd; do quarto render $f; done;  node tests/lessons/elements.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8537;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const URL = p => `http://127.0.0.1:${PORT}/${p}.html`;
const PAGES = "articulation dynamics harmony instruments melody metre rhythm structure style texture texture-sheet quiz".split(" ").concat("articulation dynamics harmony instruments melody metre rhythm structure style".split(" ").map(p => p + "-sheet"));
// bar lengths of every voice of an ABC tune, in whole notes; triplets counted at 2/3, the first measure may be a pickup
const BARS = `function bars(abc) {
  const t = ABCJS.parseOnly(abc)[0], out = [];
  t.lines.forEach(l => (l.staff || []).forEach(st => st.voices.forEach(v => { let cur = 0, trip = 1, left = 0;
    v.forEach(x => {
      if (x.el_type === 'note') { if (x.startTriplet) { trip = (x.tripletMultiplier || 2 / 3); left = x.startTriplet; }
        cur += x.duration * (left > 0 ? trip : 1); if (left > 0) left--; }
      else if (x.el_type === 'bar') { if (cur > 1e-9) out.push(Math.round(cur * 1e6) / 1e6); cur = 0; } });
    if (cur > 1e-9) out.push(Math.round(cur * 1e6) / 1e6); })));
  return out; }
function meter(abc) { const m = abc.match(/^M:(\\d+)\\/(\\d+)/m); return m ? m[1] / m[2] : 1; }`;
(async () => {
  const b = await launch();
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(e => !/supabase|soundfont|fetch|load sound|favicon/i.test(e));
  for (const p of PAGES) {
    b.errors.length = 0;
    await b.goto(URL("lessons/elements-" + p)); await b.sleep(1200);
    const r = await ev(`(async () => { ${BARS}
      const ex = [...document.querySelectorAll('.abc-ex')], bad = [];
      const src = [...new DOMParser().parseFromString(await (await fetch(location.href)).text(), 'text/html').querySelectorAll('.abc-ex > script:not([data-bend])')].map(s => s.textContent);
      src.forEach((abc, i) => { const want = meter(abc), lens = bars(abc);
        if (lens.some(l => Math.abs(l - want) > 1e-6)) bad.push(i + ':' + (abc.match(/^T:(.*)$/m) || [0, ''])[1] + ' ' + lens.join(',')); });
      const qs = [...document.querySelectorAll('.eq')];
      return { ex: ex.length, drawn: ex.filter(e => e.querySelector('svg')).length, bad, qs: qs.length,
        toc: document.querySelectorAll('#TOC a').length, folds: document.querySelectorAll('section.ls-sec').length }; })()`);
    check(p + ": examples drawn, measures full", r.drawn === r.ex && !r.bad.length, r.drawn + "/" + r.ex + " " + r.bad.join(" | "));
    check(p + ": has a quiz, collapsible sections and a jump bar", r.qs > 0 && r.folds > 2 && r.toc > 2, r.qs + " quiz, " + r.folds + " sections");
    check(p + ": no errors", !errs().length, errs().join(" | "));
  }

  // every quiz question: its ABC has full measures, and its right answer marks ✓
  const q = await ev(`(() => { ${BARS}
    const bad = [], Q = window.ElQuiz; let n = 0;
    Object.keys(Q).forEach(k => Q[k].forEach((x, i) => { n++;
      if (x.opts[x.a] == null) bad.push(k + i + ' no answer');
      if (x.abc) { const want = meter(x.abc), lens = bars(x.abc); if (lens.some(l => Math.abs(l - want) > 1e-6)) bad.push(k + i + ' ' + lens.join(',')); } }));
    const box = document.querySelector('.eq'); let marked = 0, seen = 0;
    for (let t = 0; t < 40; t++) { seen++; const why = box.querySelector('.sq-why');
      for (const btn of box.querySelectorAll('.sq-a .btn')) { btn.click(); if (/^✓/.test(why.textContent)) { marked++; break; } }
      [...box.querySelectorAll('.sq-foot .btn')].pop().click(); }
    return { n, bad, marked, seen }; })()`);
  check("quiz bank: " + q.n + " questions, ABC measures full, answers exist", !q.bad.length, q.bad.join(" | "));
  check("quiz: every question shown can be answered", q.marked === q.seen, q.marked + "/" + q.seen);

  // British names
  await b.goto(URL("lessons/elements-rhythm")); await b.sleep(900);
  const cap = await ev(`(() => { const box = document.getElementById('el-uk'); box.checked = true; box.dispatchEvent(new Event('change'));
    const t = [...document.querySelectorAll('.ax-cap')].map(c => c.textContent).join(' / '); box.checked = false; box.dispatchEvent(new Event('change')); return t; })()`);
  check("names: captions switch too", /dotted minim/i.test(cap), cap);
  const nm = await ev(`(() => { const first = () => [...document.querySelectorAll('.nn')].map(s => s.textContent).slice(0, 6).join(', ');
    const us = first(), box = document.getElementById('el-uk'); box.checked = true; box.dispatchEvent(new Event('change'));
    const uk = first(); box.checked = false; box.dispatchEvent(new Event('change'));
    return { us, uk, back: first(), stored: localStorage.getItem('el-names') }; })()`);
  check("names: US by default, British when ticked, back again", /quarter note/.test(nm.us) && /crotchet/.test(nm.uk) && !/quarter/.test(nm.uk) && nm.back === nm.us, nm.us + " → " + nm.uk);

  // hairpins reach the player as volumes; the orchestral sounds load
  await b.goto(URL("lessons/elements-dynamics")); await b.sleep(900);
  const vol = await ev(`(() => { const d = document.createElement('div'); document.body.appendChild(d);
    const v = ABCJS.renderAbc(d, "X:1\\nM:4/4\\nL:1/4\\nK:C\\n!pp!!crescendo(!C D E F|G A B !crescendo)!!ff!c|]")[0];
    v.setUpAudio({}); const vols = v.setTiming().filter(e => e.midiPitches && e.midiPitches.length).map(e => e.midiPitches[0].volume);
    return vols; })()`);
  check("crescendo: volumes rise from pp to ff", vol.length === 8 && vol[7] > vol[0] && vol.every((x, i) => !i || x >= vol[i - 1]), vol.join(","));
  const snd = await ev(`(async () => { Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve('https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/') }); const ac = new (window.AudioContext || window.webkitAudioContext)(), bank = BandSounds.create(ac);
    const names = ['violin', 'flute', 'trumpet', 'tuba', 'contrabass', 'timpani', 'harpsichord', 'pizzicato_strings', 'french_horn', 'cello', 'oboe', 'clarinet', 'trombone'];
    try { await bank.load(names); } catch (e) { return { err: String(e) }; }
    return { ok: names.filter(n => bank.has(n)), fails: names.filter(n => !bank.has(n)) }; })()`);
  check("orchestral sounds load", snd.ok && snd.ok.length === 13, JSON.stringify(snd).slice(0, 300));
  // the one-page sheet: a Full screen button that puts the sheet (only) on the whole screen, and back
  await b.goto(URL("lessons/elements-texture-sheet")); await b.sleep(1200);
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/sheet-page.png");
  const fs1 = await ev(`(async () => { Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve('https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/') }); const sh = document.querySelector('.el-sheet'), btn = sh.querySelector('.el-fs');
    btn.click(); await new Promise(r => setTimeout(r, 600)); const on = document.fullscreenElement === sh, label = btn.textContent;
    return { on, label, cards: sh.querySelectorAll('.el-card').length, drawn: sh.querySelectorAll('.el-card .abc-ex svg').length }; })()`);
  if (process.env.SHOTS) await b.shot(process.env.SHOTS + "/sheet-full.png", false);
  const fs2 = await ev(`(async () => { const sh = document.querySelector('.el-sheet'), btn = sh.querySelector('.el-fs');
    const ex = [...sh.querySelectorAll('.abc-ex')][2]; [...ex.querySelectorAll('button')].find(x => /▶/.test(x.textContent)).click();
    await new Promise(r => setTimeout(r, 300)); const playing = /Stop/.test(ex.textContent);
    btn.click(); await new Promise(r => setTimeout(r, 600)); return { playing, off: !document.fullscreenElement, label: btn.textContent }; })()`);
  check("sheet: full screen on, examples drawn, ▶ works inside, then off", fs1.on && /Exit/.test(fs1.label) && fs1.drawn === fs1.cards - 1 && fs2.playing && fs2.off && /Full screen/.test(fs2.label), JSON.stringify([fs1, fs2]));
  const SF = `Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve('https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/') });`;
  // the Backing Track habits: a click on a note plays from its measure, Show hides one part (still heard), Show notation hides all
  await b.goto(URL("lessons/elements-texture-sheet")); await b.sleep(1200);
  const bt = await ev(`(async () => { ${SF}
    const ex = [...document.querySelectorAll('.abc-ex')].find(e => /Show/.test(e.textContent) && e.querySelectorAll('.ax-parts input').length === 3);
    const parts = [...ex.querySelectorAll('.ax-parts label')].map(l => l.textContent.trim());
    const staves = () => ex.querySelectorAll('.abcjs-staff').length, before = staves();
    const cb = ex.querySelectorAll('.ax-parts input'); cb[0].click(); await new Promise(r => setTimeout(r, 200));
    const after = staves(); cb[0].click(); await new Promise(r => setTimeout(r, 200));
    let seen = []; const AP0 = () => window.AbcPlay;
    const notes = ex.querySelectorAll('.abcjs-note'), last = notes[notes.length - 1];
    last.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); last.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); last.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 600));
    const playing = /Stop/.test(ex.textContent);
    const nb = document.querySelector('.el-notes-cb'); nb.click(); const hidden = getComputedStyle(ex.querySelector('.ax-staff')).display === 'none';
    nb.click(); const back = getComputedStyle(ex.querySelector('.ax-staff')).display !== 'none';
    const k = window.AbcPlay && AbcPlay.barIndex(ex.querySelector('.ax-staff') && AbcExercise.list.find(x => x.host === ex).tune.setTiming(), last);
    return { parts, before, after, playing, hidden, back, k }; })()`);
  check("sheet: Show parts, click to play from a measure, Show notation", bt.parts.length === 3 && bt.after < bt.before && bt.playing && bt.hidden && bt.back && bt.k === 1, JSON.stringify(bt));
  const fb = await ev(`(() => { const d = document.createElement('div'); document.body.appendChild(d);
    const v = ABCJS.renderAbc(d, "X:1\\nM:4/4\\nL:1/4\\nK:C\\n|:C D E F|G A B c:|")[0], t = v.setTiming(120);
    return [AbcPlay.barStartMs(t, 1), AbcPlay.barStartMs(t, 2), AbcPlay.barStartMs(t, 3)]; })()`);
  check("AbcPlay.barStartMs counts repeats", fb[0] > 0 && fb[1] > fb[0] && fb[2] > fb[1], fb.join(","));
  // pressing ▶: an orchestral example (AbcPlay + an added sound) and a staccato one (the data-bend player) both start cleanly
  for (const [pg, text] of [["instruments", "Violin"], ["articulation", "Staccato"]]) {
    b.errors.length = 0;
    await b.goto(URL("lessons/elements-" + pg)); await b.sleep(900);
    await ev(`(() => { ${SF} const ex = [...document.querySelectorAll('.abc-ex')].find(e => e.textContent.trim().startsWith('${text}'));
      [...ex.querySelectorAll('button')].find(x => /▶/.test(x.textContent)).click(); })()`);
    await b.sleep(3500);
    const st = await ev(`[...document.querySelectorAll('.abc-ex button')].some(x => /Stop/.test(x.textContent)) || !!document.querySelector('.abc-on')`);
    check(pg + ": ▶ " + text + " plays", st && !errs().length, String(st) + " " + errs().join(" | "));
  }
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
