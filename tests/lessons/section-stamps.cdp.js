// Timestamp Notes' section stamps (S): the label menu, numbering, letters, Other, and the choruses each soloist takes.
//   quarto render tools/timestamp-notes.qmd; node tests/lessons/section-stamps.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8519);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (ok || !info ? "" : "  " + info)); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabaseUrl|youtube/i.test(e));
  const url = "http://127.0.0.1:8519/tools/timestamp-notes.html";
  await b.goto(url); await b.sleep(500); await ev(`localStorage.clear()`); await b.goto(url); await b.sleep(600);
  // 120 s of silence
  await ev(`(() => { const n = 8000 * 120, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const dt = new DataTransfer(); dt.items.add(new File([buf], 'silence.wav', { type: 'audio/wav' }));
    const inp = document.querySelector('.btp-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`);
  await b.sleep(800);
  const v = "document.querySelector('.btp-stage video')";
  await ev(`${v}.pause()`);
  const at = async t => { await ev(`${v}.currentTime = ${t}`); await b.sleep(100); };
  const key = k => ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true }))`);
  const pick = (i, val) => ev(`(() => { const s = document.querySelectorAll('.btp-log-rows li.is-sec .btp-sec-pick')[${i}]; s.value = ${JSON.stringify(val)}; s.dispatchEvent(new Event('change')); s.blur(); })()`);
  const labels = () => ev(`[...document.querySelectorAll('.btp-log-rows li.is-sec')].map(li => li.dataset.n).join(',')`);
  // bars every 2 s from 0.5 s: 8 bars a chorus is 16 s
  for (let t = 0.5; t < 50; t += 2) { await at(t); await key("b"); }
  await at(0.5); await key("s");
  check("S at the start: a section row with a menu, Head chosen", await ev(`document.querySelector('.btp-log-rows li.is-sec .btp-sec-pick').value`) === "Head");
  await at(16.5); await key("s");
  check("the next S takes the label before it, and both are numbered", await labels() === "Head 1,Head 2", await labels());
  await pick(1, "Sax solo");
  check("choosing another label renumbers: Head alone again", await labels() === "Head,Sax solo", await labels());
  await at(32.5); await key("s"); await at(40.5); await key("c");
  check("C still stamps a note in the same list", await ev(`document.querySelectorAll('.btp-log-rows li:not(.is-sec) .btp-note').length`) === 1);
  await pick(2, "A");
  const opts = await ev(`[...document.querySelectorAll('.btp-log-rows li.is-sec')[0].querySelectorAll('optgroup[label="Form letters"] option')].map(o => o.value).join(' ')`);
  check("with A used, the letters offered are A A' B", opts === "A A' B", opts);
  await pick(2, "\u0000other");
  await ev(`(() => { const i = document.querySelector('.btp-sec-other'); i.value = 'Piano solo'; i.dispatchEvent(new Event('input')); i.blur(); })()`);
  check("Other turns it into a box; its label is used", await labels() === "Head,Sax solo,Piano solo", await labels());
  await b.sleep(1700);
  const ch = await ev(`document.querySelector('.btp-choruses').textContent`);
  check("choruses counted from the Head's bars: sax 1, piano from the tempo to the end of the recording", /Head 1 chorus/.test(ch) && /Sax 1 chorus /.test(ch) && /Piano 5\.5 choruses \(44 bars\)/.test(ch), ch);
  const bm = await ev(`document.querySelector('.btp-barmap')._btpMap.sections().map(s => s.name).join(',')`);
  check("the bar map takes them as sections", bm === "Head,Sax solo,Piano solo", bm);
  // two notes together in the left hand, with no words: a section from the menu (labelled as the one before), and its bar
  await at(60.5);
  await ev(`(() => { const L = document.querySelector('.btp-live')._btpLive; [36, 40].forEach(n => L.noteOn(n, performance.now())); })()`); await b.sleep(200);
  check("MIDI left hand, two notes: a section stamp with no words", await labels() === "Head,Sax solo,Piano solo,Piano solo", await labels());
  await b.goto(url); await b.sleep(800);
  check("they survive a reload", await labels() === "Head,Sax solo,Piano solo,Piano solo" && !!(await ev(`document.querySelector('.btp-sec-other')`)), await labels());
  check("the MIDI button is in the sidebar", await ev(`!!document.querySelector('.ts-nav .btp-midi')`));
  // ---- a pop song: sections of their own lengths, words with an unnumbered Chorus, a doubled last chorus ----
  await ev(`localStorage.clear()`); await b.goto(url); await b.sleep(600);
  await ev(`(() => { const n = 8000 * 60, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const dt = new DataTransfer(); dt.items.add(new File([buf], 'silence.wav', { type: 'audio/wav' }));
    const inp = document.querySelector('.btp-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`);
  await b.sleep(800); await ev(`${v}.pause()`);
  await ev(`(() => { const c = document.querySelector('.btp-cho'); c.value = '{comment: Verse}\\n[G] | [D]\\n\\n{comment: Chorus}\\n[C] | [G]\\n'; c.dispatchEvent(new Event('input')); })()`);
  for (let t = 0.5; t < 50; t += 2) { await at(t); await key("b"); }
  const plan = [[0.5, "Verse"], [8.5, "Chorus"], [16.5, "Guitar solo"], [24.5, "Chorus"], [40.5, "Outro"]];
  for (let i = 0; i < plan.length; i++) { await at(plan[i][0]); await key("s"); await pick(i, plan[i][1]); }
  check("the menu's Chorus twice: Chorus 1, Chorus 2", await labels() === "Verse,Chorus 1,Guitar solo,Chorus 2,Outro", await labels());
  const bm2 = await ev(`document.querySelector('.btp-barmap')._btpMap.sections().map(s => s.name + ':' + s.bars).join(',')`);
  check("the bar map goes by the words' name, each section its own length", bm2.startsWith("Verse:4,Chorus:4,Guitar solo:4,Chorus:8,Outro:"), bm2);
  check("the 2nd Chorus stamp is the words' Chorus (it has a grid)", !!(await ev(`document.querySelector('.btp-words')._btpWords.sectionAbc('Chorus', 1, true)`)));
  const ch2 = await ev(`(() => { const d = document.querySelector('.btp-words')._btpWords.buildDoc().doc; return d.chunks.filter(c => /^Chorus/.test(c.heading || c.name) || /^C\\d/.test(c.name)).map(c => c.chords.map(x => x.name + '@' + x.at).join(' ')).join(' | '); })()`);
  check("the doubled last chorus plays its progression twice", /\| C@0 C@4 G@8 G@12 C@16 C@20 G@24 G@28$/.test(ch2), ch2);
  await b.sleep(1700);
  const solo = await ev(`document.querySelector('.btp-choruses').textContent`);
  check("a pop solo is counted in bars, and named by the section it matches", /Guitar 4 bars \(as long as the Verse\)/.test(solo), solo);
  // ---- Fill from the tempo: two heads tapped, solo starts stamped, the band a little faster in the solos ----
  await ev(`localStorage.clear()`); await b.goto(url); await b.sleep(600);
  await ev(`(() => { const n = 8000 * 120, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const dt = new DataTransfer(); dt.items.add(new File([buf], 'silence.wav', { type: 'audio/wav' }));
    const inp = document.querySelector('.btp-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`);
  await b.sleep(800); await ev(`${v}.pause()`);
  for (let t = 0.5; t < 32; t += 2) { await at(t); await key("b"); }           // two 8-bar heads, 2 s a bar
  const solo2 = 32.5 + 3 * 8 * 1.95;                                            // sax: 3 choruses at 1.95 s a bar
  const plan3 = [[0.5, "Head"], [16.5, "Head"], [32.5, "Sax solo"], [solo2, "Piano solo"]];
  for (let i = 0; i < plan3.length; i++) { await at(plan3[i][0]); await key("s"); await pick(i, plan3[i][1]); }
  await ev(`document.querySelector('.btp-bars-extrapolate').click()`); await b.sleep(1700);
  const gn = await ev(`document.querySelector('.btp-guess-note').textContent`), cc = await ev(`document.querySelector('.btp-choruses').textContent`);
  check("Fill from the tempo: the sax solo 24 bars, 3 choruses, though the band is faster there", /Sax solo: 24 bars \(3 choruses\)/.test(gn) && /Sax 3 choruses/.test(cc), gn + " || " + cc);
  check("the piano solo runs on to the end of the recording", /Piano solo: \d+ bars, to the end/.test(gn), gn);
  const g0 = await ev(`document.querySelectorAll('.btp-bar-rows tr.guess').length`);
  check("the guessed bars are marked in the Bars table", g0 > 20, String(g0));
  await at(32.5 + 12 * 1.95 + 0.3); await key("b"); await b.sleep(500);           // a tap on a downbeat the guess missed
  const kept = await ev(`document.querySelector('.btp-barmap')._btpMap.grid().bars.some(t => Math.abs(t - ${32.5 + 12 * 1.95 + 0.3}) < 0.01)`);
  check("a tap among the guesses is kept, and the solo is still 3 choruses", kept && /Sax solo: 24 bars/.test(await ev(`document.querySelector('.btp-guess-note').textContent`)));
  // the Sections panel, nested and folded: a section, its choruses, their bars
  const secLi = i => `document.querySelectorAll('.btp-barmap .btp-sec-rows > li')[${i}]`;
  check("sections start folded", await ev(`[...document.querySelectorAll('.btp-barmap .btp-sec-rows > li > details')].every(d => !d.open)`));
  await ev(`${secLi(2)}.querySelector('summary').click()`); await b.sleep(100);
  const chs = await ev(`[...${secLi(2)}.querySelectorAll(':scope > details > .btp-fold-kids > details > summary')].map(s => s.textContent).join(' | ')`);
  check("the sax solo opens to its 3 choruses", /Chorus 1.*Chorus 2.*Chorus 3/.test(chs) && chs.split(' | ').length === 3, chs);
  await ev(`${secLi(2)}.querySelector('.btp-fold-kids > details > summary').click()`); await b.sleep(100);
  const nbars = await ev(`${secLi(2)}.querySelectorAll('.btp-fold-kids .btp-fold-kids .btp-bar-item').length`);
  check("a chorus opens to its 8 bars", nbars === 8, String(nbars));
  // where the playhead is: the sidebar's clock and bar, and the highlighted lines
  await at(32.5 + 9 * 1.95 + 0.4); await b.sleep(700);         // sax solo, chorus 2, bar 26
  const ck = await ev(`document.querySelector('.ts-clock-t').textContent + ' | ' + document.querySelector('.ts-clock-b').textContent`);
  check("the sidebar shows the time and the bar", /^00:50\.\d \| Bar 26 \(guessed\) · Sax solo$/.test(ck), ck);
  const lit = await ev(`JSON.stringify({ sec: ${secLi(2)}.querySelector('summary').classList.contains('is-now'), other: ${secLi(1)}.querySelector('summary').classList.contains('is-now'),
    ch: [...${secLi(2)}.querySelectorAll('.btp-fold-kids > details > summary')].map(x => x.classList.contains('is-now') ? 1 : 0).join(''),
    tr: [...document.querySelectorAll('.btp-bar-rows tr.is-now')].map(r => r.dataset.nowBar).join(),
    log: [...document.querySelectorAll('.btp-log-rows li.is-now')].map(li => li.dataset.n).join() })`);
  check("highlighted: the section, its 2nd chorus, bar 26 in the Bars table, the stamp in the list", lit === JSON.stringify({ sec: true, other: false, ch: "010", tr: "25", log: "Sax solo" }), lit);
  // the pencil: type a time
  const pen = `${secLi(2)}.querySelector('.btp-fold-kids .btp-fold-kids .btp-bar-item:nth-child(2) .btp-pencil')`;
  const t2 = await ev(`document.querySelector('.btp-barmap')._btpMap.grid().bars[17]`);
  await ev(`${pen}.click()`);
  await ev(`(() => { const i = document.querySelector('.btp-time-edit'); i.value = '0:${(t2 + 0.2).toFixed(2)}'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
  await b.sleep(400);
  check("✎ then a typed time moves the bar (and the section stays open)", await ev(`document.querySelector('.btp-barmap')._btpMap.grid().bars.some(t => Math.abs(t - ${t2 + 0.2}) < 0.01)`)
    && await ev(`${secLi(2)}.querySelector('details').open`));
  // the pencil: a letter takes the playhead's time
  await at(5.4);
  await ev(`document.querySelector('.btp-log-rows li .btp-pencil').click()`);
  await ev(`document.querySelector('.btp-time-edit').dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))`); await b.sleep(200);
  check("✎ then a letter takes the playhead's time (a stamp in the list)", Math.abs(await ev(`parseFloat(document.querySelector('.btp-log-rows li').dataset.s)`) - 5.4) < 0.05,
    String(await ev(`document.querySelector('.btp-log-rows li').dataset.s`)));
  // ... or a key on the MIDI keyboard
  await at(6.1);
  await ev(`document.querySelector('.btp-log-rows li .btp-pencil').click()`);
  await ev(`document.querySelector('.btp-live')._btpLive.noteOn(72, performance.now())`); await b.sleep(200);
  check("✎ then a MIDI key takes its time, and taps no bar", Math.abs(await ev(`parseFloat(document.querySelector('.btp-log-rows li').dataset.s)`) - 6.1) < 0.05 && !(await ev(`document.querySelector('.btp-time-edit')`)));
  await at(0.5); await ev(`document.querySelector('.btp-log-rows li .btp-pencil').click()`);
  await ev(`(() => { const i = document.querySelector('.btp-time-edit'); i.value = '0:00.5'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`); await b.sleep(300);
  await ev(`document.querySelector('.btp-bars-guess-clear').click()`); await b.sleep(200);
  check("Clear guesses takes them out, the taps stay", await ev(`document.querySelectorAll('.btp-bar-rows tr.guess').length`) === 0 && await ev(`document.querySelectorAll('.btp-bar-rows tr').length`) === 18);   // (16 tapped, the tap among the guesses, the bar corrected with ✎)
  check("no page errors", !noErr().length, noErr().join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
