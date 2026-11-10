// Note mode (vim-style velocity editing, step 1) on the piano-roll lesson and the beat lesson: Enter / Esc, motions, text objects, operators, counts, r1-8, ., u.
// SITE=<dir> PORT=<n> (default _site, 8531). Render first: quarto render lessons/daw-pianoroll.qmd lessons/daw-beat.qmd
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", PORT = +process.env.PORT || 8531, { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), U = p => "http://127.0.0.1:" + PORT + "/lessons/" + p + ".html";
  await b.resize(1200, 900); await b.goto(U("daw-pianoroll")); await ev(`localStorage.clear()`); await b.goto(U("daw-pianoroll")); await b.sleep(400);
  // Keys track: four whole-note triads (C Am F G), bars 1-4, velocity 0.6 = 76/127. Positions: chord 0 = 0-2, chord 1 = 3-5, chord 2 = 6-8, chord 3 = 9-11.
  const PRE = `const D = MiniDaw.all[0], p = D.p, key = (k, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));
    const keys = s => s.split(' ').forEach(t => key(t)); const vel = () => D.clip().notes.map(n => Math.round(n.v * 127)).join(',');`;
  const T = async (name, body, want) => { const got = await ev(`(() => { ${PRE} ${body} })()`); check(name, got === want, got === want ? "" : got + "  (want " + want + ")"); };
  await T("Enter opens note mode on the Keys clip (cursor on its first note); Esc leaves", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; key('Enter'); const a = D.vim.on, c = D.vim.cur; key('Escape'); return [a, c, D.vim.on].join(' ');`, "true 0 false");
  await T("motions: 3l, w, j/k stay inside a chord, e, b, } and {", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; key('Enter'); const c = () => D.vim.cur, o = [];
    keys('3 l'); o.push(c()); keys('w'); o.push(c()); keys('k'); o.push(c()); keys('k'); o.push(c()); keys('j'); o.push(c()); keys('e'); o.push(c()); keys('b'); o.push(c()); keys('b'); o.push(c()); keys('}'); o.push(c()); keys('{'); o.push(c()); keys('$'); o.push(c()); keys('0'); o.push(c()); key('Escape'); return o.join(' ');`, "3 6 7 8 7 8 6 3 6 3 11 0");
  await T(">> raises this chord one step (8/127); 2>> two steps", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; key('Enter'); keys('w > >'); const a = vel(); keys('2 > >'); const b2 = vel(); key('Escape'); return a + ' / ' + b2;`, "76,76,76,76,76,76,76,76,76,76,76,76".replace("76,76,76,76,76,76,76,76,76,76,76,76", "76,76,76,84,84,84,76,76,76,76,76,76") + " / 76,76,76,100,100,100,76,76,76,76,76,76");
  await T("<ib quieter over the bar; 2>2w: two steps over the next two chords; gUic accents (+20); guiw ghosts one note (0.35 = 44)", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; D.p.tracks[1].clips[0].notes.forEach(n => n.v = 76 / 127); key('Enter'); keys('0');
    keys('< i b'); const a = vel(); keys('0 2 > 2 w'.replace('0 2', '0 2')); const b2 = vel(); keys('g U i c'); const c = vel(); keys('g u i w'); const d = vel(); key('Escape'); return [a, b2, c, d].join(' / ');`,
    "68,68,68,76,76,76,76,76,76,76,76,76 / 84,84,84,92,92,92,76,76,76,76,76,76".replace("84,84,84,92,92,92", "84,84,84,92,92,92") + " / 104,104,104,92,92,92,76,76,76,76,76,76 / 44,104,104,92,92,92,76,76,76,76,76,76");
  await T("r5 sets mf (80), 3r2 three chords to pp (32), . repeats, u undoes", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; D.p.tracks[1].clips[0].notes.forEach(n => n.v = 76 / 127); key('Enter'); keys('r 5'); const a = vel().split(',').slice(0, 4).join();
    keys('w . '.trim()); const b2 = vel().split(',').slice(3, 7).join(); keys('0 3 r 2'); const c = vel().split(',').filter(x => x == 32).length; keys('u'); const d = vel().split(',').filter(x => x == 32).length; key('Escape'); return [a, b2, c, d].join(' / ');`, "80,80,80,76 / 80,80,80,76 / 9 / 0");
  await T("iv: the top line only (the highest note of each chord) +1 step", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; D.p.tracks[1].clips[0].notes.forEach(n => n.v = 76 / 127); key('Enter'); keys('> i v'); const a = vel(); key('Escape'); return a;`, "76,76,84,76,76,84,76,76,84,76,76,84");
  await T("3> and >3w multiply separately; the velocity stops at 127 and at 1", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; D.p.tracks[1].clips[0].notes.forEach(n => n.v = 76 / 127); key('Enter'); keys('3 > 2 w'); const a = vel(); keys('9 9 > > '.trim()); const b2 = vel().split(',').slice(0, 3).join(); keys('9 9 < <'); keys('9 9 < <'); const c = vel().split(',').slice(0, 3).join(); key('Escape'); return [a, b2, c].join(' / ');`,
    "100,100,100,100,100,100,76,76,76,76,76,76 / 127,127,127 / 1,1,1");
  await T("the count before > says how much, not how far: 3>> is one chord", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; D.p.tracks[1].clips[0].notes.forEach(n => n.v = 76 / 127); key('Enter'); keys('3 > >'); const a = vel(); key('Escape'); return a;`, "100,100,100,76,76,76,76,76,76,76,76,76");
  await T("Space and Delete still reach the DAW (note mode does not swallow them); an unknown key is swallowed, not typed into the song", `D.sel = { track: 1, clip: 0, slot: -1, notes: [] }; key('Enter'); const n0 = D.p.tracks[1].clips.length; key('n'); const n1 = D.p.tracks[1].clips.length; key('Escape'); return [n0, n1, D.vim.on].join(' ');`, "1 1 false");
  // drum rows: the beat lesson
  await b.goto(U("daw-beat")); await ev(`localStorage.clear()`); await b.goto(U("daw-beat")); await b.sleep(400);
  await T("drums: the kick is the lowest of a chord, k goes up to the hat; gUiw accents only that note", `D.sel = { track: 0, clip: 0, slot: -1, notes: [] }; key('Enter'); const o = []; const nm = () => D.clip().notes[D.vim.cur].m; o.push(nm()); key('k'); o.push(nm());
    const v0 = D.clip().notes[D.vim.cur].v; keys('g U i w'); o.push(Math.round((D.clip().notes[D.vim.cur].v - v0) * 127)); key('Escape'); return o.join(' ');`, "kick hatClosed 20");
  // the notation lesson: its preset, and the typed sequence it teaches
  await b.goto(U("daw-notation")); await ev(`localStorage.clear()`); await b.goto(U("daw-notation")); await b.sleep(500);
  await T("DAW 3b: 15 melody notes at velocity 76; Enter 8r3 8l 2r4 2l 2r5 2l 3r6 Esc gives p, mp, mf, f as the lesson says", `D.sel = { track: 0, clip: 0, slot: -1, notes: [] }; const n0 = D.clip().notes.length, v0 = vel().split(',').filter(x => x == 76).length; key('Enter'); keys('8 r 3 8 l 2 r 4 2 l 2 r 5 2 l 3 r 6'); key('Escape'); return [n0, v0, vel()].join(' / ');`, "15 / 15 / 48,48,48,48,48,48,48,48,64,64,80,80,96,96,96");
  const abc = await ev(`document.querySelectorAll('.abc-ex').length + ' ' + (document.querySelectorAll('.abc-ex svg').length > 0)`);
  check("DAW 3b: the notation example is drawn", abc === "1 true", abc);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
