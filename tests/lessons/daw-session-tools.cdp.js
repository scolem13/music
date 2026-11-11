// The scratch DAW page (tools/daw.qmd), headless: projects (migrate, new, switch, duplicate, delete), copy / paste of clips and notes, zoom. Serves the samples from the local mirror (tests/band/README.md).
// SITE=<dir> PORT=<n> (default _site, 8531). Render first: quarto render tools/daw.qmd
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", PORT = +process.env.PORT || 8531, { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? ROOT + "/tests/band/lead/site" : SITE, u); s.setHeader("access-control-allow-origin", "*");
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), U = "http://127.0.0.1:" + PORT + "/tools/daw.html", SFX = `Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 0`;
  await b.resize(1200, 900); await b.goto(U); await ev(`localStorage.clear()`); await b.goto(U); await ev(SFX); await b.sleep(400);
  const KEY = `const D = MiniDaw.all[0], p = () => D.p, key = (k, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));`;
  const KEY2 = KEY + ` const mk = (a, l, m) => ({ start: a, len: l, notes: m.map(x => ({ t: x, d: 1, m: 40 + x, v: .8 })) });`;
  // master strip level with the others
  const ms = await ev(`(() => { const s = [...document.querySelectorAll('.mdaw-strip')]; const f = s.map(x => Math.round(x.querySelector('.mdaw-fader').getBoundingClientRect().top)); return f.length + ' | ' + (new Set(f).size) + ' | ' + f.join(); })()`);
  check("mixer: the master's fader starts at the same height as every other strip's", /^\d+ \| 1 \|/.test(ms), ms);
  // join / split / loop corner
  const jn = await ev(`(() => { ${KEY2} const out = []; const tr = D.p.tracks[2];
    D.change(() => { tr.clips = [mk(0, 4, [0, 1]), mk(8, 4, [0]), mk(16, 4, [2])]; D.sel = { track: 2, clip: 0, slot: -1, notes: [] }; });
    key('J', { shiftKey: true }); out.push(tr.clips.length, tr.clips[0].len, tr.clips[0].notes.length, tr.clips[0].notes.map(n => n.t).join('/'));
    D.sel = { track: 2, clip: 0, slot: -1, notes: [] }; D.setPos(6); key('s'); out.push(tr.clips.length, tr.clips[0].len, tr.clips[tr.clips.length - 1].start);
    D.doUndo(true); D.doUndo(true); const t2 = D.p.tracks[2]; out.push(t2.clips.length);
    D.sel = { track: 2, clip: 0, slot: -1, notes: [] }; D.n = 1; D.join(2); out.push(t2.clips.length, t2.clips[0].len);
    return out.join(' | '); })()`);
  check("clips: J joins with the next clip (notes kept, a gap stays), S splits at the playhead, Undo undoes both, 2 joins two more", jn === "2 | 12 | 3 | 0/1/8 | 3 | 6 | 6 | 3 | 1 | 20", jn);
  const lp = await ev(`(() => { ${KEY2} const out = []; const tr = D.p.tracks[2];
    D.change(() => { tr.clips = [mk(0, 4, [0, 1])]; D.sel = { track: 2, clip: 0, slot: -1, notes: [] }; });
    D.renderTracks(); const lc = document.querySelector('.mdaw-loopc'); out.push(!!lc);
    const r = lc.getBoundingClientRect(), ptr = (t, x, y) => (t === 'pointerdown' ? lc : document).dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true }));
    ptr('pointerdown', r.left + 4, r.top + 4); ptr('pointerup', r.left + 4, r.top + 4); out.push(tr.clips.length, tr.clips[1].start, tr.clips[1].len);
    D.change(() => { tr.clips = [mk(0, 4, [0, 1])]; }); D.loopClip(2, 0, 9); const t3 = D.p.tracks[2]; out.push(t3.clips.length, t3.clips.map(c => c.start + ':' + c.len).join());
    out.push(t3.clips[2].notes.length);
    return out.join(' | '); })()`);
  check("clips: the top-right corner loops - a click repeats once, loopClip fills to a beat with the last copy cut short and its notes cut", lp === "true | 2 | 4 | 4 | 3 | 0:4,4:4,8:1 | 1", lp);
  // session: send band parts, one at a time; copy across; loop -> scene length
  const bd = await ev(`(() => { ${KEY2} const out = []; D.p.scenes = []; D.p.tracks.forEach(t => { t.slots = []; });
    D.chartIn.value = 'C | F | G | C'; D.timesIn.value = 1; D.toSel.value = 'session'; D.partSel.value = 'bass';
    for (let i = 0; i < 3; i++) D.bandWrite();
    const bass = D.p.tracks.find(t => t.name === 'Bass'); out.push(D.p.scenes.length, bass.slots.filter(Boolean).length, D.p.tracks.filter(t => t.name === 'Drums').length, bass.clips.length);
    out.push(Math.round(bass.slots[0].len / 4));
    D.partSel.value = 'drums'; D.bandWrite(); const dr = D.p.tracks.find(t => t.name === 'Drums'); out.push(D.p.scenes.length, !!(dr.slots[0]), !!(dr.slots[1]));
    return out.join(' | '); })()`);
  check("session players: Write to Session with Bass only puts a clip in a new scene each time (3 takes), the first Drums goes in scene 1; nothing lands in the arrangement", /^3 \| 3 \| 1 \| 0 \| 4 \| 3 \| true \| false/.test(bd), bd);
  const cp = await ev(`(() => { ${KEY2} const out = []; const tr = D.p.tracks[2];
    D.change(() => { tr.clips = [mk(0, 8, [0, 1])]; D.sel = { track: 2, clip: 0, slot: -1, notes: [] }; });
    D.setView('arr'); D.clipToSession(); const si = tr.slots.findIndex(c => c && c.len === 8 && c.notes.length === 2); out.push(si >= 0, D.p.scenes.length);
    key('c', { ctrlKey: true }); D.setView('session'); const ti = D.p.tracks.indexOf(tr); const want = D.p.scenes.length; D.addScene(); D.sessCur2 = { ti, si: want }; key('v', { ctrlKey: true });
    out.push(tr.slots[want] && tr.slots[want].len, tr.slots[want] && tr.slots[want].notes.length);
    D.setView('arr'); D.p.loop = Object.assign(D.p.loop, { on: true, fb: 0, tb: 16, from: 0, to: 4 }); D.loopToScene(); const last = tr.slots[D.p.scenes.length - 1]; out.push(last && last.len);
    return out.join(' | '); })()`);
  check("session: Clip -> Session copies an arrangement clip to a free scene, Ctrl+V pastes a copied clip into the clicked empty slot, Loop -> scene makes a 2-bar clip a 2-bar loop (not the whole bracket)", /^true \| \d+ \| 8 \| 2 \| 8$/.test(cp), cp);
  console.log(fails ? fails + " FAILED" : "all passed"); b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
