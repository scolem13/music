// Timestamp Notes's bar map (tools/timestamp-notes.qmd, apps/shared/timestamp-player/bar-map.js) in headless Chrome.
// A silent WAV made in the page stands in for a recording; bars are tapped with B at known times (seeking between taps), stamps
// are named as sections, and the loop is checked to jump back. Run after rendering the page into _site:
//   quarto render tools/timestamp-notes.qmd; node tests/lessons/timestamp.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8517);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabaseUrl|youtube/i.test(e));
  await b.goto("http://127.0.0.1:8517/tools/timestamp-notes.html"); await b.sleep(600);
  await ev(`localStorage.clear()`); await b.goto("http://127.0.0.1:8517/tools/timestamp-notes.html"); await b.sleep(600);
  check("loads without errors, bar map present", !noErr().length && await ev(`!!document.querySelector('.btp-barmap')`), noErr().join(" | "));

  // 40 s of silence, 8 kHz mono 16-bit
  await ev(`(() => { const n = 8000 * 40, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const dt = new DataTransfer(); dt.items.add(new File([buf], 'silence.wav', { type: 'audio/wav' }));
    const inp = document.querySelector('.btp-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`);
  await b.sleep(800);
  const v = "document.querySelector('.btp-stage video')";
  check("an audio file loads into the player", await ev(`${v} && ${v}.duration > 39`), String(await ev(`${v} && ${v}.duration`)));
  await ev(`${v}.pause()`);
  const at = async t => { await ev(`${v}.currentTime = ${t}`); await b.sleep(120); };
  const key = (k, shift) => ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', shiftKey: ${!!shift}, bubbles: true }))`);
  // bars every 2 s from 1 s (120 bpm in 4), with bar 6 tapped late
  for (const t of [1, 3, 5, 7, 9, 11.9, 13, 15, 17]) { await at(t); await key("b"); }
  await at(30); await key("b"); await key("Backspace");     // a stray tap, taken back
  const sum = await ev(`document.querySelector('.btp-bars-summary').textContent`);
  check("nine bars, about 120 bpm", /^9 bars · about 120 bpm/.test(sum), sum);
  check("the late bar's neighbours are marked odd", await ev(`[...document.querySelectorAll('.btp-bar-rows tr')].map(r => r.className === 'odd' ? 1 : 0).join('')`) === "000011000");
  // sections from stamps, a little off the bar
  const stampAs = async (t, note) => { await at(t); await key("c"); await ev(`(() => { const i = [...document.querySelectorAll('.btp-note')].pop(); i.value = ${JSON.stringify(note)}; i.dispatchEvent(new Event('input')); i.blur(); })()`); };
  await stampAs(0.8, "Intro"); await stampAs(5.3, "Verse 1"); await stampAs(8, "just a note"); await stampAs(12.8, "§ Horns");
  const secs = await ev(`[...document.querySelectorAll('.btp-barmap .btp-sec-rows li')].map(li => li.textContent).join(' | ')`);
  check("named stamps become sections on the nearest bar, others don't", /^00:01\.0✎Introbars 1–2Loop \| 00:05\.0✎Verse 1bars 3–6Loop \| 00:13\.0✎Hornsbars 7–9Loop$/.test(secs), secs);
  await at(6); await b.sleep(100);
  check("the playhead line names bar and section", await ev(`document.querySelector('.btp-bars-now').textContent`) === "Bar 3 · Verse 1", await ev(`document.querySelector('.btp-bars-now').textContent`));
  // loop Verse 1 (5 s to 13 s, where Horns starts) and play through its end
  await key("L", true); await ev(`${v}.currentTime = 12.6; ${v}.play()`); await b.sleep(900);
  const t = await ev(`${v}.currentTime`);
  check("L loops the section: playing past its end goes back to its start", t >= 5 && t < 6.5, t.toFixed(2));
  await key("L", true); await ev(`${v}.pause()`);
  // phrases (phrases.js): two bars a phrase; the Horns' 3 bars make 2 + 1 (a bar left over is half a phrase: its own)
  await ev(`(() => { const s = document.querySelector('.btp-ph-size'); s.value = '2'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(100);
  const phr = await ev(`[...document.querySelectorAll('.btp-ph-rows li')].map(li => li.querySelector('.btp-sec-name').textContent + ' ' + li.querySelector('.btp-sec-bars').textContent).join(' | ')`);
  check("sections cut into phrases", phr === "Intro bars 1–2 | Verse 1 · 1/2 bars 3–4 | Verse 1 · 2/2 bars 5–6 | Horns · 1/2 bars 7–8 | Horns · 2/2 bar 9", phr);
  await ev(`document.querySelectorAll('.btp-ph-rows li')[2].querySelector('.btp-loop').click()`); await b.sleep(100);
  await key("="); await key("="); await b.sleep(100);
  const pl = await ev(`JSON.stringify(document.querySelector('.btp-barmap')._btpMap.loop())`);
  check("a phrase loops from its lead-in (= twice: a beat, half a second) to the next downbeat", /"start":8\.5,"end":13/.test(pl), pl);
  check("its lead-in shows", /lead-in 1 beat/.test(await ev(`document.querySelectorAll('.btp-ph-rows li')[2].textContent`)));
  for (let i = 0; i < 20; i++) await key("=");
  check("the lead-in stops where the phrase before keeps a beat", /lead-in 7 beats/.test(await ev(`document.querySelectorAll('.btp-ph-rows li')[2].textContent`)));
  await key("."); await b.sleep(100);
  check(". loops the next phrase", /Horns · 1\/2/.test(await ev(`document.querySelector('.btp-barmap')._btpMap.loop().name`)));
  // T: nt-goto first; nt-need-doc brings the piece, then nt-goto again; nt-back loops the next phrase
  await ev(`(() => { window.__realOpen = window.__realOpen || window.open; window.__sent = []; window.open = () => { const f = document.body.appendChild(document.createElement('iframe')), w = f.contentWindow; window.__w = w; w.postMessage = m => __sent.push(m); setTimeout(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'nt-ready' }, origin: location.origin, source: w })), 10); return w; }; })()`);
  await key("t"); await b.sleep(100);
  const g1 = await ev(`JSON.stringify(__sent)`);
  check("T sends the phrase as nt-goto", /"type":"nt-goto","section":"Horns","nth":0,"bar":0,"bars":2/.test(g1), g1);
  await ev(`window.dispatchEvent(new MessageEvent('message', { data: { type: 'nt-back' }, origin: location.origin, source: __w }))`); await b.sleep(100);
  check("nt-back loops the next phrase", /Horns · 2\/2/.test(await ev(`document.querySelector('.btp-barmap')._btpMap.loop().name`)));
  await key("p"); check("P stops looping", await ev(`document.querySelector('.btp-barmap')._btpMap.loop() === null`));
  await ev(`window.open = window.__realOpen; (() => { const s = document.querySelector('.btp-ph-size'); s.value = '4'; s.dispatchEvent(new Event('change')); })()`);
  await ev(`${v}.pause()`);
  // keys: Space plays and pauses, arrows and h / l go 5 s; stamps deleted one at a time and sorted by time
  await at(20); await key(" "); await b.sleep(150);
  check("Space plays", await ev(`!${v}.paused`)); await key(" "); check("Space pauses", await ev(`${v}.paused`));
  await at(20); await key("l"); check("l goes 5 s on", Math.abs(await ev(`${v}.currentTime`) - 25) < 0.2);
  await key("ArrowLeft"); await key("h"); check("ArrowLeft and h go 5 s back each", Math.abs(await ev(`${v}.currentTime`) - 15) < 0.2);
  await stampAs(2, "early one");
  const order = () => ev(`[...document.querySelectorAll('.btp-log-rows .btp-stamp')].map(x => x.textContent).join(' ')`);
  await ev(`document.querySelector('.btp-sort').click()`);
  check("Sort by time puts a late-made early stamp in its place", (await order()).startsWith("00:00 00:02 00:05"), await order());
  await ev(`[...document.querySelectorAll('.btp-log-rows li')].find(li => li.querySelector('.btp-note').value === 'early one').querySelector('.btp-del').click()`);
  check("× deletes just that stamp", !(await order()).includes("00:02") && (await order()).split(' ').length === 4, await order());
  // a bar in another meter, and a missed tap filled in
  const beatsOf = () => ev(`[...document.querySelectorAll('.btp-bar-beats')].map(x => x.value).join('')`);
  await ev(`(() => { const i = document.querySelectorAll('.btp-bar-beats')[1]; i.value = 2; i.dispatchEvent(new Event('change')); })()`);
  check("Beats sets one bar's meter", (await beatsOf()) === "424444444" && /1 bar in another meter/.test(await ev(`document.querySelector('.btp-bars-summary').textContent`)), await beatsOf());
  await ev(`(() => { const i = document.querySelectorAll('.btp-bar-beats')[1]; i.value = 4; i.dispatchEvent(new Event('change')); })()`);
  await at(21); await key("b"); await at(23); await key("b");          // 17 .. 21 is two bars: one missed
  check("a two-bar gap is offered for filling", await ev(`!document.querySelector('.btp-bars-fill').disabled`));
  await ev(`document.querySelector('.btp-bars-fill').click()`);
  check("Fill gaps puts the missed bar in", await ev(`document.querySelectorAll('.btp-bar-rows tr').length`) === 12 && await ev(`document.querySelector('.btp-bars-fill').disabled`));
  await key("Backspace"); await key("Backspace"); await key("Backspace");
  // halving and doubling: thought in 4, meant in 2 (or the other way); irregular bars warn first
  const nBars = () => ev(`document.querySelectorAll('.btp-bar-rows tr').length`);
  await ev(`window.__asked = []; window.confirm = m => (__asked.push(m), true)`);
  check("the irregular bars are warned about", await ev(`!document.querySelector('.btp-bars-warn').hidden`) && /2 bars look irregular/.test(await ev(`document.querySelector('.btp-bars-warn').textContent`)));
  await ev(`document.querySelector('.btp-bars-halve').click()`);
  check("Halve: asks first (irregular bars), then 18 bars of 2", (await ev(`__asked.length`)) === 1 && /irregular \(bar 5, 6\)/.test(await ev(`__asked[0]`)) && await nBars() === 18
    && await ev(`document.querySelector('.btp-beats').value`) === "2" && /about 120 bpm/.test(await ev(`document.querySelector('.btp-bars-summary').textContent`)), await ev(`__asked[0]`));
  await ev(`document.querySelector('.btp-bars-undo').click()`);
  check("Undo puts the 9 bars of 4 back", await nBars() === 9 && await ev(`document.querySelector('.btp-beats').value`) === "4");
  await ev(`document.querySelector('.btp-bars-double').click()`);
  check("Double: pairs from bar 1 (every section starts a pair), 5 bars of 8, the last one a 4", await nBars() === 5 && await ev(`document.querySelector('.btp-beats').value`) === "8"
    && (await ev(`[...document.querySelectorAll('.btp-bar-beats')].map(x => x.value).join('')`)) === "88884");
  await ev(`document.querySelector('.btp-bars-undo').click(); delete window.confirm`);
  check("and undone", await nBars() === 9);
  // the recording heads the .txt export
  const txt = await ev(`(() => { let s; navigator.clipboard.writeText = x => (s = x, Promise.resolve()); document.querySelector('.btp-copy-all').click(); return s; })()`);
  check("the export names the file it was made on", /^# file: silence\.wav\n00:00\tIntro/.test(txt), txt.slice(0, 60));
  // one song file: stamps, bars, words and the recording, saved and opened again
  const saveSong = () => ev(`(async () => { let blob, name; const o = URL.createObjectURL, c = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = x => (blob = x, 'blob:x'); HTMLAnchorElement.prototype.click = function () { name = this.download; };
    document.querySelector('.btp-download').click(); URL.createObjectURL = o; HTMLAnchorElement.prototype.click = c; return { name, text: await blob.text() }; })()`);
  const song = await saveSong(), json = JSON.parse(song.text);
  check("the song file has the stamps, the bar map and the recording", json.app === "timestamp-notes" && json.barMap.bars.length === 9 && json.barMap.beatsPerBar === 4
    && json.barMap.sections[1].name === "Verse 1" && json.barMap.sections[1].bar === 3 && json.stamps.length === 4 && json.source.file === "silence.wav" && /\.json$/.test(song.name), song.name + " " + song.text.slice(0, 200));
  await ev(`localStorage.clear()`); await b.goto("http://127.0.0.1:8517/tools/timestamp-notes.html"); await b.sleep(600);
  await ev(`(() => { document.querySelector('.btp-paste-open').click(); document.querySelector('.btp-paste textarea').value = ${JSON.stringify(song.text)}; document.querySelector('.btp-paste-go').click(); })()`);
  await b.sleep(150);
  check("opening it brings back the bars and the sections", /^9 bars/.test(await ev(`document.querySelector('.btp-bars-summary').textContent`)) && await ev(`document.querySelectorAll('.btp-barmap .btp-sec-rows li').length`) === 3
    && /Load silence\.wav/.test(await ev(`document.querySelector('.btp-err').textContent`)), await ev(`document.querySelector('.btp-err').textContent`));
  await b.goto("http://127.0.0.1:8517/tools/timestamp-notes.html"); await b.sleep(600);
  check("bars and section stamps survive a reload", /^9 bars/.test(await ev(`document.querySelector('.btp-bars-summary').textContent`)) && await ev(`document.querySelectorAll('.btp-barmap .btp-sec-rows li').length`) === 3);
  check("no page errors", !noErr().length, noErr().join(" | "));


  // words and chords: Ultimate Guitar text converted, S stamps its sections in turn, the Notation page reads the result
  await ev(`(() => { localStorage.removeItem('btp-stamps'); localStorage.removeItem('btp-bars'); })()`);
  await b.goto("http://127.0.0.1:8517/tools/timestamp-notes.html"); await b.sleep(600);
  await ev(`(() => { const inp = document.querySelector('.btp-file'), n = 8000 * 40, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const dt = new DataTransfer(); dt.items.add(new File([buf], 'silence.wav', { type: 'audio/wav' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`);
  await b.sleep(800); await ev(`${v}.pause()`);
  await ev(`(() => { document.querySelector('.btp-autonote').checked = false; const t = document.querySelector('.btp-ug');
    t.value = "Test Song\\n\\n[Intro]\\nG  C\\n\\n[Verse 1]\\nG       D\\nHere it comes\\nEm       C\\nThere it goes\\n"; document.querySelector('.btp-convert').click(); })()`);
  check("Convert: ChordPro with the chords in the words, sections listed", await ev(`document.querySelector('.btp-cho').value.includes('[G]Here it [D]comes') && document.querySelectorAll('.btp-word-secs li').length === 2`),
    await ev(`document.querySelector('.btp-cho').value`));
  await ev(`document.querySelector('.btp-title').value = 'Best Day of My Life'`);
  await at(0); await key("c");
  check("a bare stamp at 0:00 is named Intro", await ev(`document.querySelectorAll('.btp-word-secs li').length`) === 2
    && await ev(`document.querySelector('.btp-note').value`) === "Intro", await ev(`document.querySelector('.btp-note').value`));
  await ev(`document.querySelector('.btp-del').click()`);
  for (const t of [1, 3, 5, 7, 9, 11, 13]) { await at(t); await key("b"); if (t === 1 || t === 5) await key("s"); }
  check("the section list shows each one's stamp", await ev(`[...document.querySelectorAll('.btp-word-secs .btp-stamp')].map(x => x.textContent).join(' ')`) === "00:01 00:05");
  await at(6); await b.sleep(150);
  check("the section under the playhead is named above the boxes", await ev(`document.querySelector('.btp-word-now').textContent`) === "Verse 1");
  const dl = (await saveSong()).name;
  check("the song file is named for the tune and the day", /^best-day-of-my-life-\d{4}-\d\d-\d\d\.json$/.test(dl), dl);
  check("S stamps the next section from the words", await ev(`[...document.querySelectorAll('.btp-barmap .btp-sec-rows li')].map(li => li.querySelector('.btp-sec-name').textContent + li.querySelector('.btp-sec-bars').textContent).join('|')`) === "Introbars 1–2|Verse 1bars 3–7",
    await ev(`document.querySelector('.btp-barmap .btp-sec-rows').textContent`));
  await ev(`(() => { window.__realOpen = window.__realOpen || window.open; window.__sent = []; window.open = () => { const f = document.body.appendChild(document.createElement('iframe')), w = f.contentWindow; w.postMessage = m => __sent.push(m); setTimeout(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'nt-ready' }, origin: location.origin, source: w })), 10); return w; };
    document.querySelector('.btp-send-notation').click(); })()`); await b.sleep(100);
  const sent = await ev(`window.__sent[0]`);
  check("Send to the Notation page: nt-doc, meter and tempo, the intro's 2 chords over its 2 bars, the verse its 5 tapped bars", sent && sent.type === "nt-doc" && sent.doc.meter === "4/4"
    && JSON.stringify(sent.doc.chunks[0].chords) === '[{"at":0,"name":"G"},{"at":4,"name":"C"}]' && sent.doc.chunks[1].chordLen === 20 && sent.tempo === 120 && sent.title === "Best Day of My Life", JSON.stringify(sent));
  check("the verse's 4 chords over 5 bars gets a note", /Verse 1: 5 bars tapped, 4 chords/.test(await ev(`document.querySelector('.btp-send-note').textContent`)));
  await ev(`(() => { window.__realOpen = window.__realOpen || window.open; window.__sent = []; window.open = () => { const f = document.body.appendChild(document.createElement('iframe')), w = f.contentWindow; w.postMessage = m => __sent.push(m); setTimeout(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'bt-ready' }, origin: location.origin, source: w })), 10); return w; };
    document.querySelector('.btp-send-band').click(); })()`); await b.sleep(100);
  const bt = await ev(`window.__sent[0]`);
  check("Send to the Backing Track: four bars a line at most", bt && bt.abc.split('\n').filter(l => /\|/.test(l)).every(l => l.split('|').filter(x => x.trim()).length <= 4), bt && bt.abc);
  check("Send to the Backing Track: bt-load with an ABC chart at the tapped tempo", bt && bt.type === "bt-load" && /P:Intro/.test(bt.abc) && /"G"/.test(bt.abc) && bt.tempo === 120, JSON.stringify(bt));
  check("no page errors with words", !noErr().length, noErr().join(" | "));
  // and the Notation page itself reads it in, opened for real
  await ev(`(() => { localStorage.removeItem('ntDoc'); window.__w = __realOpen.call(window, '/tools/notation.html?remote=1', 'ts-check');
    addEventListener('message', e => { if (e.source === __w && e.data.type === 'nt-ready') __w.postMessage(${JSON.stringify(sent)}, location.origin); }); })()`);
  await b.sleep(4000);
  const nt = await ev(`(() => { try { const d = __w.NotationPage.doc(); return d.title + '|' + d.chunks.map(c => (c.heading || '-') + ':' + c.name).join(',') + '|' + d.chunks[1].words + '|' + d.chunks[1].chords.map(c => c.name).join(' '); } catch (e) { return String(e); } })()`);
  check("the Notation page (?remote=1) reads nt-chordpro: title, sections, words with chords", nt === "Best Day of My Life|Intro:I1a,Verse 1:V1a|Here it comes There it goes|G D Em C", nt);
  // a phrase: nt-goto finds its section; one the page lacks answers nt-need-doc; Back posts nt-back
  await ev(`(() => { window.__got = []; addEventListener('message', e => { if (e.source === __w) __got.push(e.data.type); });
    __w.postMessage({ type: 'nt-goto', section: 'Verse 1', nth: 0, bar: 0, bars: 4, leadIn: 1.5, label: 'Verse 1 · 1/2' }, location.origin);
    __w.postMessage({ type: 'nt-goto', section: 'Bridge', nth: 0, bar: 0, bars: 4, leadIn: 0 }, location.origin); })()`);
  await b.sleep(400);
  const gl = await ev(`__w.document.getElementById('nt-phrase').hidden ? 'hidden' : __w.document.getElementById('nt-phrase-label').textContent`);
  check("nt-goto shows the phrase and where its pickup goes", /^Verse 1 · 1\/2: 4 bars; its pickup \(1\.5 beats\) goes in the bar before\. Play it in writes/.test(gl), gl);
  await ev(`__w.document.getElementById('nt-back').click()`); await b.sleep(200);
  const got = await ev(`__got.join(',')`);
  check("an unknown section asks for the piece (nt-need-doc); Back posts nt-back", /nt-need-doc/.test(got) && /nt-back/.test(got), got);
  await ev(`__w.close()`);

  // chord timing with N: the k-th hit in a section is its k-th chord, placed in its bar and rounded to the beat
  for (const t of [5, 8, 9.5, 13]) { await at(t); await key("n"); }
  const docOf = () => ev(`document.querySelector('.btp-words')._btpWords.buildDoc().doc.chunks.map(c => (c.heading || c.name) + ':' + c.chords.map(x => x.name + '@' + x.at).join(','))`);
  check("N times the verse's chords: G on 1, D on beat 3 of bar 2, Em on beat 2 of bar 3, C on bar 5", (await docOf()).join(' ') === "Intro:G@0,C@4 Verse 1:G@0,D@6,Em@9,C@16", (await docOf()).join(' '));
  await at(9.6); await b.sleep(150);
  check("the stage: the section's words large, its name above, Em just played and C next", await ev(`document.querySelector('.btp-live-sec').textContent`) === "Verse 1"
    && await ev(`document.querySelector('.btp-live-words .btp-ch.now').textContent`) === "Em" && await ev(`document.querySelector('.btp-live-words .btp-ch.next').textContent`) === "C"
    && /There\s*it/.test(await ev(`document.querySelector('.btp-live-words').textContent`)), await ev(`document.querySelector('.btp-live-words').textContent`));
  const gridChords = () => ev(`document.querySelectorAll('.btp-grid-now .tc-bar[data-bar]').length + ':' + [...document.querySelectorAll('.btp-grid-now .tc-chord')].map(x => x.textContent).join(' ')`);
  check("the chord grid: Verse 1's 5 bars, four a line, each chord there as soon as it was hit", (await gridChords()) === "5:G D Em Em C" && await ev(`!document.querySelector('.btp-confirm').hidden`), await gridChords());
  await ev(`document.querySelector('.btp-confirm').click()`); await b.sleep(100);
  check("Timing is right: the chords appear where they were played", (await gridChords()) === "5:G D Em Em C", await gridChords());
  // at a pause the timed sections go into the ChordPro as grids; the Bars table shows the confirmed chords; a grid edited
  // in the text is the timing
  await ev(`${v}.play()`); await b.sleep(150); await ev(`${v}.pause()`); await b.sleep(150);
  const cho = () => ev(`document.querySelector('.btp-cho').value`);
  check("a pause writes Verse 1's grid into the ChordPro", (await cho()).includes("{start_of_grid: Verse 1}\n| G . . . | . . D . | . Em . . | . . . . |\n| C . . . |\n{end_of_grid}"), await cho());
  check("the Bars table shows the confirmed chords, bar by bar", await ev(`[...document.querySelectorAll('.btp-bar-rows tr')].slice(2, 7).map(r => r.lastElementChild.textContent).join('|')`) === "G . . .|. . D .|. Em . .|. . . .|C . . .",
    await ev(`[...document.querySelectorAll('.btp-bar-rows tr')].map(r => r.lastElementChild.textContent).join('|')`));
  await ev(`(() => { const t = document.querySelector('.btp-cho'); t.value = t.value.replace('| G . . . | . . D . |', '| G . . . | D . . . |'); t.dispatchEvent(new Event('input')); })()`);
  check("a grid changed by hand is the timing (D on beat 1 of bar 2)", (await docOf()).includes("Verse 1:G@0,D@4,Em@9,C@16"), (await docOf()).join(' '));
  await ev(`${v}.play()`); await b.sleep(150); await ev(`${v}.pause()`); await b.sleep(150);
  check("and a pause with no new hits leaves the edit alone", (await cho()).includes("| G . . . | D . . . |"));
  const copied = await ev(`(async () => { let s; navigator.clipboard.writeText = x => (s = x, Promise.resolve()); document.querySelector('.btp-grid-copy').click(); await new Promise(r => setTimeout(r, 50)); return s; })()`);
  check("Copy as ChordPro grid copies the grid blocks", /^\{start_of_grid: Verse 1\}\n\| G \. \. \. \| D/.test(copied || ''), copied);
  check("the grid lights the bar under the playhead (bar 3 of the verse)", await ev(`[...document.querySelectorAll('.btp-grid-now .tc-bar[data-bar]')].findIndex(x => x.classList.contains('tc-live'))`) === 2);
  check("the chord grid has a tab for each stamped section, the one playing active", await ev(`[...document.querySelectorAll('.btp-grid-tabs .nav-link')].map(a => a.textContent + (a.classList.contains('active') ? '*' : '')).join('|')`) === "Intro|Verse 1*");
  check("Now playing has the same sections in a menu", await ev(`[...document.querySelectorAll('.btp-live-pick option')].map(o => o.textContent).join('|')`) === "1. Intro|2. Verse 1" && await ev(`document.querySelector('.btp-live-pick').value`) === "1");
  await ev(`document.querySelector('.btp-grid-tabs .nav-link').click()`); await b.sleep(150);
  check("a tab goes to its section", Math.abs(await ev(`${v}.currentTime`) - 1) < 0.1 && await ev(`document.querySelector('.btp-live-sec').textContent`) === "Intro", String(await ev(`${v}.currentTime`)));
  await at(9.6); await b.sleep(150);
  check("the section list counts the timed chords", /4 of 4 chords timed/.test(await ev(`document.querySelector('.btp-word-secs').textContent`)), await ev(`document.querySelector('.btp-word-secs').textContent`));
  await at(13.1); await key("N", true);
  check("Shift+N takes the last hit back", (await docOf())[1] === "Verse 1:G@0,D@6,Em@9");

  // all at once from MIDI: left hand two notes = a section (and its bar), one note = a bar; right hand = chord hits
  await ev(`(() => { const t = document.querySelector('.btp-ug'); t.value += "\\n[Chorus]\\nC   G\\nOh oh\\n"; document.querySelector('.btp-convert').click(); })()`);
  const midi = async (t, notes, gap = 0) => { await at(t); await ev(`(() => { const L = document.querySelector('.btp-live')._btpLive; ${JSON.stringify(notes)}.forEach(n => L.noteOn(n, performance.now())); })()`); await b.sleep(120 + gap); };
  await midi(15, [36, 40]); await midi(15.02, [60, 64, 67]);
  await midi(17, [38]); await midi(18, [61, 65]);
  check("left hand: two notes stamped Chorus and tapped its bar, one note tapped the next", await ev(`[...document.querySelectorAll('.btp-barmap .btp-sec-rows .btp-sec-name')].map(x => x.textContent).join(',')`) === "Intro,Verse 1,Chorus"
    && /^9 bars/.test(await ev(`document.querySelector('.btp-bars-summary').textContent`)), await ev(`document.querySelector('.btp-bars-summary').textContent`));
  await at(9.6); await b.sleep(150);
  check("under the words, always: the next section's name and first line", /Next · Chorus/.test(await ev(`document.querySelector('.btp-live-upnext').textContent`))
    && /Oh/.test(await ev(`document.querySelector('.btp-live-upnext').textContent`)), await ev(`document.querySelector('.btp-live-upnext').textContent`));
  check("the grid's next line: Chorus, with the chords just played in on the keyboard", await ev(`document.querySelector('.btp-grid-next b').textContent`) === "Next: Chorus"
    && await ev(`document.querySelectorAll('.btp-grid-next-bars .tc-bar').length`) === 2 && await ev(`[...document.querySelectorAll('.btp-grid-next-bars .tc-chord')].map(x => x.textContent).join(' ')`) === "C G",
    await ev(`[...document.querySelectorAll('.btp-grid-next-bars .tc-chord')].map(x => x.textContent).join(' ')`));
  // Now playing: in the right column, floats and pins back, its words bigger or smaller
  check("Now playing sits in the right column, above the timestamps", await ev(`document.querySelector('.btp-side').firstElementChild.id`) === "ts-now");
  await ev(`document.querySelector('.btp-live-mode').click()`);
  check("Float: it floats over the page", await ev(`getComputedStyle(document.querySelector('#ts-now')).position`) === "fixed" && await ev(`document.querySelector('.btp-live-mode').textContent`) === "Pin");
  await ev(`document.querySelector('.btp-live-mode').click()`);
  check("Pin: back in the column", await ev(`getComputedStyle(document.querySelector('#ts-now')).position`) !== "fixed");
  const wd = () => ev(`parseFloat(getComputedStyle(document.querySelector('.btp-live-words .btp-wd')).fontSize)`);
  const w0 = await wd(); await ev(`document.querySelector('.btp-live-bigger').click(); document.querySelector('.btp-live-bigger').click()`);
  check("A+ makes the words bigger", Math.abs(await wd() - w0 * 1.2) < 0.6, w0 + " -> " + await wd());
  await ev(`document.querySelector('.btp-live-smaller').click(); document.querySelector('.btp-live-smaller').click()`);
  check("right hand: C on 1, G on beat 3; the G hit's notes don't fit G and are flagged", (await docOf()).includes("Chorus:C@0,G@6")
    && /Chorus: 1 hit doesn.t fit/.test(await ev(`document.querySelector('.btp-words')._btpWords.buildDoc().notes.join(' ')`)), (await docOf()).join(' '));

  // correcting: a bar played in is rewritten with the chord played (named from its notes); bars played through keep theirs
  await ev(`document.querySelector('.btp-live')._btpLive.correct(true)`);
  await midi(7.0, [69, 72, 76]);
  check("Correct chords: bar 2 of the verse rewritten as Am (D taken out), Em after it untouched", (await docOf()).includes("Verse 1:G@0,Am@4,Em@9"), (await docOf()).join(' '));
  await ev(`document.querySelector('.btp-live')._btpLive.correct(false)`);
  // a 2/4 bar in the verse: the grid shows the 2/4 bar and the 4/4 after it
  await ev(`(() => { const i = document.querySelectorAll('.btp-bar-beats')[3]; i.value = 2; i.dispatchEvent(new Event('change')); })()`);
  const vabc = await ev(`document.querySelector('.btp-words')._btpWords.sectionAbc('Verse 1', 0, true)`);
  check("a meter change inside a section reaches its chart: [M:2/4] then [M:4/4]", /\[M:2\/4\][\s\S]*\[M:4\/4\]/.test(vabc || ''), vabc);
  await ev(`(() => { const i = document.querySelectorAll('.btp-bar-beats')[3]; i.value = 4; i.dispatchEvent(new Event('change')); })()`);
  const sf = JSON.parse((await saveSong()).text);
  check("the song file carries the Ultimate Guitar text and the ChordPro", /\[Chorus\]/.test(sf.words.ug) && /start_of_chorus/.test(sf.words.chordpro) && sf.words.title === "Best Day of My Life" && sf.words.hits.length > 0);
  // a Chorus written once and stamped twice: the second borrows the first, for the grid and for sending
  await stampAs(19, "Chorus"); await at(21); await key("b"); await at(23); await key("b"); await at(19.5); await b.sleep(200);
  check("a second Chorus with no words of its own still has a grid", await ev(`document.querySelectorAll('.btp-grid-now .tc-bar[data-bar]').length`) >= 1 && !/Tap the bars/.test(await ev(`document.querySelector('.btp-grid-note').textContent`)),
    await ev(`document.querySelector('.btp-grid-note').textContent`));
  check("and is sent as a section of its own", (await docOf()).filter(x => /^Chorus:/.test(x)).length === 2, (await docOf()).join(' '));
  await ev(`[...document.querySelectorAll('.btp-log-rows li')].filter(li => li.querySelector('.btp-note').value === 'Chorus').pop().querySelector('.btp-del').click()`);
  for (let i = 0; i < 2; i++) await key("Backspace");
  await ev(`(() => { document.querySelector('.btp-ug').value = "[Verse 1]\\nG       D\\nHere it comes\\n"; document.querySelector('.btp-convert').click();
    [...document.querySelectorAll('.btp-log-rows .btp-del')].forEach(x => x.click()); })()`);
  await at(0); await key("c"); await b.sleep(100);
  check("a stamp at 0:00 before a list starting with Verse 1: an Intro is added, to the list and the ChordPro",
    await ev(`[...document.querySelectorAll('.btp-word-secs .btp-sec-name')].map(x => x.textContent).join(',')`) === "Intro,Verse 1"
    && await ev(`document.querySelector('.btp-cho').value.includes('{comment: Intro}') && document.querySelector('.btp-note').value === 'Intro'`),
    await ev(`document.querySelector('.btp-cho').value`));
  await ev(`[...document.querySelectorAll('.btp-log-rows .btp-del')].forEach(x => x.click())`);
  await stampAs(1, "Intro"); await stampAs(5, "Verse 1");
  await ev(`(() => { window.__sent = []; window.open = () => { const f = document.body.appendChild(document.createElement('iframe')), w = f.contentWindow; w.postMessage = m => __sent.push(m); setTimeout(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'bt-ready' }, origin: location.origin, source: w })), 10); return w; };
    window.open.__ts = 1; document.querySelector('.btp-send-band').click(); })()`); await b.sleep(100);
  const bt2 = await ev(`window.__sent[0]`);
  check("an Intro with no chords still reaches the Backing Track: its 2 bars, N.C.", bt2 && /P:Intro\n"N.C."z8 \| "N.C."z8 \|\nP:Verse 1/.test(bt2.abc), bt2 && bt2.abc);
  await stampAs(30, "Outro"); await at(14); await b.sleep(100);
  check("a section stamped past the last tapped bar doesn't take over the label", await ev(`document.querySelector('.btp-bars-now').textContent`) === "Bar 7 · Verse 1", await ev(`document.querySelector('.btp-bars-now').textContent`));
  await ev(`[...document.querySelectorAll('.btp-log-rows li')].find(li => li.querySelector('.btp-note').value === 'Outro').querySelector('.btp-del').click()`);

  // a bar punched in twice: its × takes that marking out
  const nb = () => ev(`document.querySelectorAll('.btp-bar-rows tr').length`);
  const nb0 = await nb(); await at(31); await key("b"); await at(31.4); await key("b");
  check("two bar markings close together", await nb() === nb0 + 2);
  await ev(`[...document.querySelectorAll('.btp-bar-rows tr')].pop().querySelector('.btp-del').click()`);
  check("× deletes just that bar marking", await nb() === nb0 + 1 && !(await ev(`[...document.querySelectorAll('.btp-bar-rows tr')].some(r => /00:31\.4/.test(r.textContent))`)));
  await key("Backspace");

  // Shift+click a time to type it
  await ev(`(() => { const btn = document.querySelector('.btp-log-rows .btp-stamp'); btn.dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true })); })()`);
  check("Shift+click turns a time into a box", await ev(`!!document.querySelector('.btp-time-edit')`));
  await ev(`(() => { const i = document.querySelector('.btp-time-edit'); i.value = '0:02.5'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
  check("Return keeps the typed time", await ev(`document.querySelector('.btp-log-rows li').dataset.s`) === "2.5" && await ev(`document.querySelector('.btp-log-rows .btp-stamp').textContent`) === "00:02");
  // Ultimate Guitar or ChordPro alone
  await ev(`document.querySelector('button[data-view=cho]').click()`);
  check("ChordPro alone: one wide box", await ev(`getComputedStyle(document.querySelector('.btp-ug')).display`) === "none" && await ev(`document.querySelector('.btp-cho').getBoundingClientRect().width`) > 400);
  await ev(`document.querySelector('button[data-view=both]').click()`);
  // the sidebar: every part listed; Fold all folds the player, the words being played and the log too; a click opens one
  check("the sidebar lists every part", await ev(`[...document.querySelectorAll('.ts-nav a')].map(a => a.textContent).join('|')`).then(x => /^Player\|Chord grid\|Chord timing and MIDI\|Words and chords.*\|Now playing\|Timestamps$/.test(x)));
  await ev(`document.querySelector('[data-all=fold]').click()`);
  check("Fold all folds everything", await ev(`!document.querySelector('#ts-player').open && document.querySelector('#ts-now').classList.contains('is-shut') && document.querySelector('#ts-log').classList.contains('is-shut') && getComputedStyle(document.querySelector('#ts-now .ts-fold-body')).display === 'none'`));
  await ev(`document.querySelector('.ts-nav a[data-for=ts-log]').click()`);
  check("a sidebar link opens its part", await ev(`!document.querySelector('#ts-log').classList.contains('is-shut') && !document.querySelector('#ts-player').open`));
  await ev(`document.querySelector('[data-all=open]').click()`);

  // a .txt with a link: imported, the link is loaded too (followed in a tab when it was saved that way)
  await ev(`window.open = () => null; document.querySelector('.btp-paste-open').click(); document.querySelector('.btp-paste textarea').value = "# url: https://www.youtube.com/watch?v=J91ti_MpdHA (in a tab)\\n00:30\\tBridge"; document.querySelector('.btp-paste-go').click()`);
  await b.sleep(200);
  check("importing a .txt with a url loads it", await ev(`JSON.stringify(document.querySelector('.btp')._btp.source())`) === '{"url":"https://www.youtube.com/watch?v=J91ti_MpdHA","follow":true}'
    && await ev(`document.querySelector('.btp-url').value`) === "https://www.youtube.com/watch?v=J91ti_MpdHA", await ev(`JSON.stringify(document.querySelector('.btp')._btp.source())`));
  const txt2 = await ev(`(() => { let s; navigator.clipboard.writeText = x => (s = x, Promise.resolve()); document.querySelector('.btp-copy-all').click(); return s; })()`);
  check("and exports it again", txt2.startsWith("# url: https://www.youtube.com/watch?v=J91ti_MpdHA (in a tab)\n"), txt2.slice(0, 80));
  await ev(`[...document.querySelectorAll('.btp-log-rows li')].find(li => li.querySelector('.btp-note').value === 'Bridge').querySelector('.btp-del').click()`);

  // following a YouTube tab: the page's own clock, started with Return, nudged with ], set with "Clock to"
  await ev(`window.open = () => null; document.querySelector('.btp-url').value = 'https://www.youtube.com/watch?v=J91ti_MpdHA'; document.querySelector('.btp-follow-btn').click()`);
  const T = () => ev(`document.querySelector('.btp')._btp.time()`);
  check("Follow in a tab: the follow panel, clock at 0 and stopped", await ev(`!!document.querySelector('.btp-follow')`) && await T() === 0);
  await key("Enter"); await b.sleep(500); const t1 = await T();
  check("Return starts the page's clock", t1 > 0.4 && t1 < 0.7, t1.toFixed(2));
  await key("Enter"); const t2 = await T(); await b.sleep(300);
  check("Return stops it", await T() === t2);
  await key("]"); check("] nudges it 0.1 s on", Math.abs(await T() - t2 - 0.1) < 1e-6);
  await ev(`(() => { const i = document.querySelector('.btp-follow-to'); i.value = '1:02.5'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
  check("Clock to 1:02.5 sets it, and Enter there doesn't start it", await T() === 62.5 && await ev(`document.querySelector('.btp')._btp.playing()`) === false);
  const before = await ev(`document.querySelectorAll('.btp-bar-rows tr').length`);
  await key("b"); check("B taps a bar on the followed clock", await ev(`document.querySelectorAll('.btp-bar-rows tr').length`) === before + 1);
  await ev(`document.querySelector('.btp-barmap .btp-sec-rows .btp-loop').click()`);
  check("Loop is refused, with a reason", /loop it in the YouTube tab/.test(await ev(`document.querySelector('.btp-err').textContent`)));
  await ev(`window.__opened = []; window.open = u => (__opened.push(u), null); document.querySelector('.btp-barmap .btp-sec-rows li:nth-child(2) .btp-stamp').click()`);
  check("a jump opens YouTube at that second in a new tab, and the clock waits there", await ev(`__opened.join()`) === "https://www.youtube.com/watch?v=J91ti_MpdHA&t=5s"
    && await T() === 5 && !(await ev(`document.querySelector('.btp')._btp.playing()`)) && /Opened at 00:05/.test(await ev(`document.querySelector('.btp-err').textContent`)), await ev(`__opened.join()`));
  check("no page errors while following", !noErr().length, noErr().join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
