// Volume automation in the DAW page (lessons/daw-mixer.qmd), headless: the V / A / arrow / [ ] / Delete / Esc keys, the mouse, the locked fader,
// and the level reaching the audio (the track's "auto" gain node), stopped and playing. Serves the samples from the local mirror (tests/band/README.md).
// SITE=<dir> PORT=<n> (default _site, 8530). Render first: quarto render lessons/daw-mixer.qmd
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", PORT = +process.env.PORT || 8530, { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? ROOT + "/tests/band/lead/site" : SITE, u); s.setHeader("access-control-allow-origin", "*");
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), U = "http://127.0.0.1:" + PORT + "/lessons/daw-mixer.html", SFX = `Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }); 0`;
  await b.resize(1200, 900); await b.goto(U); await ev(`localStorage.clear()`); await b.goto(U); await ev(SFX); await b.sleep(400);
  const KEY = `const D = MiniDaw.all[0], p = D.p, key = (k, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));`;
  const k1 = await ev(`(() => { ${KEY} D.sel = { track: 1, clip: -1, slot: -1, notes: [] }; const out = [];
    key('v'); out.push(!!D.gridEl.querySelector('.mdaw-autorow'));                     // the lane opens for Bass
    D.setPos(4); key('a'); const bass = p.tracks[1]; out.push(bass.auto.vol.length, bass.auto.vol[0].t, bass.auto.vol[0].v);   // a point at beat 4 at the fader's level
    key('ArrowDown'); key('ArrowDown'); key('ArrowDown'); out.push(bass.auto.vol[0].v);         // -22 -> -25 (Bass is at -22 in the bad mix)
    key('ArrowDown', { shiftKey: true }); out.push(bass.auto.vol[0].v);
    key('ArrowRight'); out.push(bass.auto.vol[0].t);
    D.setPos(12); key('a'); key('ArrowUp', { altKey: true }); out.push(bass.auto.vol.length, bass.auto.vol[1].v);
    key('['); out.push(D.sel.pt, D.pos); key(']'); out.push(D.sel.pt);
    const fad = [...document.querySelectorAll('.mdaw-strip')][1]; out.push(fad.querySelector('.mdaw-sname').textContent, fad.querySelector('.mdaw-fader').disabled);
    return out.join(' | '); })()`);
  check("V, A (at the fader's level), ↓ x3, Shift+↓, →, a second point, Alt+↑, [ ], the strip says (A) and its fader is locked", k1 === "true | 1 | 4 | -22 | -25 | -31 | 5 | 2 | -30.9 | 0 | 5 | 1 | Bass (A) | true", k1);
  const k2 = await ev(`(() => { ${KEY} const out = []; key('Delete'); out.push(p.tracks[1].auto.vol.length, D.sel.pt); key('Escape'); key('v'); key('v');
    D.sel = { track: 1, clip: -1, slot: -1, notes: [] }; D.undo.length = 0; D.doUndo(true); return out.join(' | ') + ' | ' + (p.tracks[1].auto ? p.tracks[1].auto.vol.length : 0); })()`);
  check("Delete removes the selected point (one point is left)", /^1 \| -1 \| /.test(k2), k2);
  // vim keys: hjkl are the arrows, a number first repeats the key ("3k" = 3 dB up)
  const vim = await ev(`(() => { ${KEY} D.autoOn = false; D.sel = { track: 3, clip: -1, slot: -1, notes: [] }; key('v'); D.setPos(8); key('a'); const g = p.tracks[3].auto.vol[0], out = [g.v];
    key('1'); key('2'); key('j'); out.push(g.v);                    // 12j: -12 dB
    key('3'); key('k'); out.push(g.v);                              // 3k: +3 dB
    key('k', { code: 'KeyK' }); out.push(g.v);                      // k: +1
    key('K', { shiftKey: true, code: 'KeyK' }); out.push(g.v);      // Shift+K: +6
    key('K', { shiftKey: true, code: 'KeyK' }); out.push(g.v);      // and again: held at the +6 dB ceiling
    key('2'); key('l'); out.push(g.t);                              // 2l: two beats later
    key('Escape'); D.setPos(0); key('2'); key('l'); out.push(D.pos); // no point selected: 2l is two bars on
    key('0'); key('h'); out.push(D.pos);                            // a lone 0 is not a count: h moves one bar back
    return out.join(' | '); })()`);
  check("vim keys: 12j = -12 dB, 3k = +3, k +1, Shift+K +6 (twice: stops at the 6 dB ceiling), 2l = 2 beats, then 2l = 2 bars, h = a bar back", vim === "4 | -8 | -5 | -4 | 2 | 6 | 10 | 8 | 4", vim);
  // the mouse: click the lane to add, drag to move, double-click to remove
  const m = await ev(`(() => { ${KEY} D.sel = { track: 2, clip: -1, slot: -1, notes: [] }; D.autoOn = false; key('v'); const cv = document.querySelector('.mdaw-autorow canvas'), r = cv.getBoundingClientRect(), tr = p.tracks[2];
    const fire = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + x, clientY: r.top + y }));
    fire('pointerdown', 26 * 8 + 1, 30); document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); const a = tr.auto.vol.map(q => q.t + '@' + q.v.toFixed(0)).join();
    const cv2 = document.querySelector('.mdaw-autorow canvas'), r2 = cv2.getBoundingClientRect();
    cv2.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: r2.left + 26 * 8, clientY: r2.top + 30 })); return a + ' | ' + (tr.auto ? tr.auto.vol.length : 'none'); })()`);
  check("mouse: a click adds a point on the beat (8) at the height clicked, a double-click removes it", /^8@-?\d+ \| none$/.test(m), m);
  // the audio
  const au = await ev(`(() => { ${KEY} p.tracks[1].auto = { vol: [{ t: 0, v: -20 }, { t: 100, v: -20 }] }; D.setPos(0); D.ensureAudio(); D.applyMix(); return 1; })()`);
  await b.sleep(400);
  const g1 = await ev(`MiniDaw.all[0].strips[1].auto.gain.value + ' ' + MiniDaw.all[0].strips[1].fader.gain.value + ' ' + MiniDaw.all[0].strips[0].auto.gain.value`);
  const [ga, gf, gn] = g1.split(" ").map(Number);
  check("stopped: the Bass auto node holds -20 dB (0.1), its fader node is 1, a track without points is 1", Math.abs(ga - 0.1) < 0.01 && gf === 1 && gn === 1, g1);
  await ev(`(() => { const D = MiniDaw.all[0]; D.p.tempo = 100; D.p.loop.on = false; D.p.tracks[1].auto = { vol: [{ t: 0, v: -40 }, { t: 8, v: 0 }] }; D.setPos(0); D.play(); })()`); await b.sleep(3500);
  const live = await ev(`(() => { const D = MiniDaw.all[0], g = D.strips[1].auto.gain.value, pos = D.pos, on = D.playing; D.stop(); return [on, pos.toFixed(1), g.toFixed(3)].join(' '); })()`);
  const [on, pos, gl] = live.split(" "); const want = Math.pow(10, Math.min(0, -40 + 40 * Math.min(1, +pos / 8)) / 20);
  check("playing: the auto node follows the line from -40 dB toward 0 as the playhead moves (or the samples could not load)", (on === "true" && Math.abs(+gl - want) < 0.25 * Math.max(want, 0.05) + 0.05) || on === "false", live + " want ~" + want.toFixed(3));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
