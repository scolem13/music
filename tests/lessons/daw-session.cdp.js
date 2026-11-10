// The Session view of the DAW (lessons/daw-session.qmd, apps/shared/daw/session.js), headless: loop -> scene, roots read from the bass, a root click
// moves the whole row, the key moves pitched notes (not drums), the recorded performance is written into the Arrangement (looped, cut at bar
// lines, starting mid-loop), scenes copy / delete, the view toggle. Launching needs the band samples, so it only checks the queue when they cannot load.
// SITE=<dir> PORT=<n> (default _site, 8528). Render first: quarto render lessons/daw-session.qmd
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", PORT = +process.env.PORT || 8528, { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
// the band samples come from the local mirror (tests/band/README.md: node tests/band/meter/fetch-samples.js), served at /sf/
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? ROOT + "/tests/band/lead/site" : SITE, u); s.setHeader("access-control-allow-origin", "*");
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), URL_ = "http://127.0.0.1:" + PORT + "/lessons/daw-session.html";
  await b.resize(1200, 900); await b.goto(URL_); await ev(`localStorage.clear()`); await b.goto(URL_); await ev(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 0`); await b.sleep(400);
  const n = await ev(`MiniDaw.all.length + ' ' + MiniDaw.all.map(d => d.inSession()).join(',')`);
  check("two DAWs: the first opens in the Arrangement, the second in the Session", n === "2 false,true", n);

  // loop -> scene (first DAW)
  const ls = await ev(`(() => { const D = MiniDaw.all[0]; D.loopToScene(); const p = D.p;
    return [p.scenes.length, p.tracks.map(t => (t.slots && t.slots[0]) ? t.slots[0].len + '/' + t.slots[0].notes.length : '-').join(' ')].join(' | '); })()`);
  check("Loop -> scene copies bars 1-4 of each track that played (Chant is empty)", /^1 \| 16\/\d+ 16\/\d+ 16\/\d+ -$/.test(ls), ls);
  const roots = await ev(`(() => { const D = MiniDaw.all[0]; const s = MiniDaw.Session.sourceOf(D.p, 0); return s.ti + ' ' + s.roots.map(m => m % 12).join(','); })()`);
  check("roots read from the bass: F B♭ F C (5,10,5,0)", roots === "1 5,10,5,0", roots);
  const vw = await ev(`(() => { const D = MiniDaw.all[0]; D.setView('session'); const a = !D.sessEl.hidden && D.arr.hidden && D.cellEls.length === 4;
    const names = [...D.sessGridEl.querySelectorAll('.mdaw-rname')].map(e => e.textContent).join(' '); D.setView('arr'); return a + ' ' + names + ' ' + (D.sessEl.hidden && !D.arr.hidden); })()`);
  check("view toggle shows the grid with 4 cells and the roots, and back", vw === "true F B♭ F C true", vw);

  // clips from the keyboard (first DAW, Arrangement)
  const kb = await ev(`(() => { const D = MiniDaw.all[0], p = D.p, key = (k, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));
    D.sel = { track: 0, clip: -1, slot: -1, notes: [] }; D.setPos(0); const out = [];
    key('ArrowDown'); key('ArrowDown'); key('ArrowDown'); out.push(D.sel.track);                 // Chant
    key('n'); key('ArrowRight'); out.push(D.pos); key('n'); const cl = p.tracks[3].clips;       // two clips, bars 1 and 2
    out.push(cl.map(c => c.start + '+' + c.len).join(' '));
    key('ArrowRight', { shiftKey: true }); key('ArrowRight', { shiftKey: true }); out.push(cl[1].start);   // the second one two bars later
    key('['); out.push(D.sel.clip); key('=');  out.push(cl[0].len);                              // back to the first, a bar longer
    key('ArrowLeft', { altKey: true }); out.push(D.pos);                                          // a beat back from the clip start (0): stays 0
    D.sel = { track: 1, clip: -1, slot: 0, notes: [] }; D.setPos(32); key('p'); key('p');       // the Session clip twice, end to end
    out.push(p.tracks[1].clips.slice(-2).map(c => c.start + '+' + c.len).join(' '), D.pos, p.bars);
    return out.join(' | '); })()`);
  check("keyboard: ↓ to Chant, N, →, N, Shift+→ x2, [, =, Alt+←, P P lays the session clip end to end", kb === "3 | 4 | 0+4 4+4 | 12 | 0 | 8 | 0 | 32+16 48+16 | 64 | 16", kb);

  const kb2 = await ev(`(() => { const D = MiniDaw.all[0], p = D.p, key = (k, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));
    D.sel = { track: 1, clip: -1, slot: 0, notes: [] }; const before = p.tracks[1].clips.length; D.setPos(64); key('3'); key('p');   // 3p: three copies end to end
    const c3 = p.tracks[1].clips.slice(before).map(c => c.start).join();
    D.sel = { track: 0, clip: -1, slot: -1, notes: [] }; D.setPos(0); key('j'); key('j'); const trk = D.sel.track;   // j j = ↓ ↓
    key('l'); key('l'); const pos = D.pos; key('h'); return [c3, trk, pos, D.pos].join(' | '); })()`);
  check("vim keys on the clips: 3p lays the session clip three times; j j go down two tracks; l l two bars on, h one back", kb2 === "64,80,96 | 2 | 8 | 4", kb2);

  // second DAW: 4 scenes
  const lion = await ev(`(() => { const D = MiniDaw.all[1], p = D.p; return p.scenes.map((s, i) => s.name + ':' + MiniDaw.Session.sourceOf(p, i).roots.map(m => m % 12).join('')).join(' '); })()`);
  check("the Lion preset's scenes: roots F B♭ F C, then C C for the break", lion === "Intro:51050 Groove:51050 Chant:51050 Break:00", lion);
  const chip = await ev(`(() => { const D = MiniDaw.all[1], p = D.p; const bassBefore = p.tracks[1].slots[1].notes.filter(n => n.t >= 8 && n.t < 12).map(n => n.m % 12);
    const padBefore = p.tracks[2].slots[1].notes.filter(n => n.t >= 8 && n.t < 12).map(n => n.m % 12).sort((a, b) => a - b).join();
    [...D.sessGridEl.querySelectorAll('.mdaw-scene')][1].querySelectorAll('.mdaw-root')[2].click();   // bar 3 of Groove: F (I) -> B♭ (IV)
    const bass = p.tracks[1].slots[1].notes.filter(n => n.t >= 8 && n.t < 12).map(n => n.m % 12), pad = p.tracks[2].slots[1].notes.filter(n => n.t >= 8 && n.t < 12).map(n => n.m % 12).sort((a, b) => a - b).join();
    const other = p.tracks[1].slots[1].notes.filter(n => n.t < 8).every(n => [5, 10].indexOf(n.m % 12) >= 0);
    const drumsSame = p.tracks[0].slots[1].notes.length > 0;
    return [bassBefore[0], bass[0], padBefore, pad, other, drumsSame, MiniDaw.Session.sourceOf(p, 1).roots.map(m => m % 12).join('')].join(' | '); })()`);
  check("clicking bar 3's root: F -> B♭ moves the bass and the organ chord (F A C -> B♭ D F), other bars stay", chip === "5 | 10 | 0,5,9 | 2,5,10 | true | true | 510100", chip);
  const key = await ev(`(() => { const D = MiniDaw.all[1], p = D.p; const kick = p.tracks[0].slots[1].notes.map(n => n.m).join(); D.setKey(7);   // G
    const r = MiniDaw.Session.sourceOf(p, 0).roots.map(m => m % 12).join(','); return [p.key, r, kick === p.tracks[0].slots[1].notes.map(n => n.m).join()].join(' | '); })()`);
  check("Key G: roots G C G D (7,0,7,2), drums untouched", key === "7 | 7,0,7,2 | true", key);

  // recording written into the Arrangement: Groove (4 bars) from session beat 0 to 24 (6 bars: 1.5 loops), Break from 24 to 32 on the same tracks; starting mid-loop on Bass
  const rec = await ev(`(() => { const D = MiniDaw.all[1], p = D.p; D.setPos(0);
    D.sessRecBuild({ origin: 0, segs: [{ ti: 0, slot: 1, a: 0, b: 24, phase: 0 }, { ti: 1, slot: 1, a: 0, b: 24, phase: 8 }, { ti: 1, slot: 3, a: 24, b: 32, phase: 0 }] }, 32);
    const dr = p.tracks[0].clips.map(c => c.start + '+' + c.len).join(' '), ba = p.tracks[1].clips.map(c => c.start + '+' + c.len).join(' ');
    const first = p.tracks[1].clips[0], mid = first.notes.every(n => n.t >= 0 && n.t < first.len);
    return [dr, ba, mid, p.view, p.loop.on, p.bars].join(' | '); })()`);
  check("record: drums 16+8 in two cuts, bass starts 8 beats into its loop (8+8), then the break; view -> Arrangement, loop off", rec === "0+16 16+8 | 0+8 8+16 24+8 | true | arr | false | 16", rec);

  await ev(`window.confirm = () => true`);
  // scenes copy / delete / empty slot
  const sc = await ev(`(() => { const D = MiniDaw.all[1], p = D.p; D.dupScene(2); const n1 = p.scenes.length, nm = p.scenes[3].name; D.delScene(3); const n2 = p.scenes.length; D.newSlot(3, 3); const c = p.tracks[3].slots[3];
    return [n1, nm, n2, p.scenes[3].name, c.len, D.clip() === c].join(' | '); })()`);
  check("copy a scene, delete it, double-click-style new clip in Break (2 bars = 8 beats) is the one being edited", sc === "5 | Chant 2 | 4 | Break | 8 | true", sc);
  const q = await ev(`(() => { const D = MiniDaw.all[1]; D.launch(1, 0); const queued = D.sessQ[1] === 0; D.sessStop(); return queued + ' ' + (D.sessOn === false || D.sessOn === undefined); })()`);
  check("launching queues the clip; stopping clears it", q === "true true", q);
  // a real take: record, launch Groove (bars of silence first), end it; the Arrangement gets Groove clips, cut at bar lines
  await ev(`(() => { const D = MiniDaw.all[1]; D.p.tempo = 240; D.p.tracks.forEach(t => t.clips = []); D.setView('session'); D.sessRecToggle(); D.launchScene(1); })()`); await b.sleep(6500);
  await ev(`MiniDaw.all[1].sessRecToggle()`); await b.sleep(3000);
  const take = await ev(`(() => { const D = MiniDaw.all[1], p = D.p; return [p.view, !!D.sessRec, p.tracks[0].clips.map(c => c.start + '+' + c.len).join(' '), p.tracks[1].clips.length, D.sessOn].join(' | '); })()`);
  check("a real take: record, launch Groove, end: the Arrangement holds whole-bar Groove clips, the session plays on", /^arr \| false \| 0\+\d+/.test(take), take);
  await ev(`MiniDaw.all[1].sessStop(); MiniDaw.all[1].setView('session')`);
  await ev(`(() => { const D = MiniDaw.all[1]; D.launch(1, 2); D.launch(0, 2); })()`); await b.sleep(7000);
  const live = await ev(`(() => { const D = MiniDaw.all[1], r = D.sessOn ? [D.sessPlay[1] && D.sessPlay[1].slot, D.sessPlay[0] && D.sessPlay[0].slot, D.sessPos.textContent].join(' ') : 'no sound: ' + D.statusEl.textContent; D.sessStop(); return r; })()`);
  check("launched clips start at the first bar line and the session clock runs (or the samples could not load offline)", /^2 2 bar \d/.test(live) || /^no sound/.test(live), live);
  await b.resize(390, 800); await b.sleep(200);
  const sx = await ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
  check("no sideways page scroll at phone width", sx === true);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
