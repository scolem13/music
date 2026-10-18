// The DAW lessons (lessons/daw-*.qmd, apps/shared/daw/mini-daw.js), headless: every page makes its DAW, the step grid edits,
// undo, duplicate / split, the band writes parts, play moves the playhead, MIDI export is a valid file, the mixer, no sideways scroll on a phone.
// Run after rendering: for f in timeline beat pianoroll arrange mixer record export real; do quarto render lessons/daw-$f.qmd; done; node tests/lessons/daw.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8527);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), U = p => "http://127.0.0.1:8527/lessons/" + p + ".html";
  await b.resize(1200, 900);
  for (const p of ["daw-timeline", "daw-beat", "daw-pianoroll", "daw-arrange", "daw-mixer", "daw-record", "daw-export"]) {
    await b.goto(U(p)); await ev(`localStorage.clear()`); await b.goto(U(p)); await b.sleep(300);
    const r = await ev(`(() => { const d = document.querySelector('.mdaw'); return !!(window.MiniDaw && d && d.querySelector('.mdaw-transport')) + ' ' + d.querySelectorAll('.mdaw-lane[data-track]').length; })()`);
    check(p + ": DAW made", /^true \d+$/.test(r), r);
  }
  // step grid on the beat lesson
  await b.goto(U("daw-beat")); await b.sleep(300);
  const st = await ev(`(() => { const D = MiniDaw.all[0], c = D.clip(), n0 = c.notes.length, cv = document.querySelector('.mdaw-cv');
    const hit = (x, y) => { const r = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + x, clientY: r.top + y })); };
    hit(20 * 7 + 5, 20 * 9 + 5); const n1 = c.notes.length, added = c.notes.find(n => n.m === 'kick' && n.t === 1.75);
    hit(20 * 7 + 5, 20 * 9 + 5); const n2 = D.clip().notes.length; D.doUndo(true); const n3 = D.clip().notes.length;
    D.duplicate(); return [n0, n1, !!added, n2, n3, D.track().clips.length, D.track().clips[1].start].join(' '); })()`);
  check("step: add a kick at step 8, remove it, undo, duplicate", st === "9 10 true 9 10 2 4", st);
  // band parts + play + export
  await b.goto(U("daw-arrange")); await b.sleep(300);
  const band = await ev(`(() => { const D = MiniDaw.all[0]; D.chartIn.value = 'C | Am | F | G'; D.styleSel.value = 'rock'; D.timesIn.value = 2; D.bandWrite();
    return D.p.tracks.map(t => t.name + ':' + t.inst + ':' + t.clips[0].len + ':' + (t.clips[0].notes.length > 8)).join(' '); })()`);
  check("the band writes drums, bass and chords, 8 bars", /Drums:kit:32:true/.test(band) && /Bass:\w+:32:true/.test(band) && /Chords:\w+:32:true/.test(band), band);
  const mid = await ev(`(() => { const m = MiniDaw.toMidi(MiniDaw.all[0].p); return String.fromCharCode(m[0], m[1], m[2], m[3]) + ' ' + m[11] + ' ' + m.length; })()`);
  check("MIDI export: MThd, tempo track + 3", /^MThd 4 \d{3,}$/.test(mid), mid);
  const split = await ev(`(() => { const D = MiniDaw.all[0]; D.sel = { track: 1, clip: 0, notes: [] }; D.setPos(16); D.split(); const t = D.track(); return t.clips.map(c => c.start + '+' + c.len).join(' '); })()`);
  check("split at bar 5", split === "0+16 16+16", split);
  await ev(`MiniDaw.all[0].setPos(0); MiniDaw.all[0].play()`); await b.sleep(4000);
  const pos = await ev(`(() => { const D = MiniDaw.all[0]; const r = D.playing + ' ' + D.pos.toFixed(1) + ' ' + D.posEl.textContent; D.stop(); return r; })()`);
  check("play moves the playhead (sounds may not load offline)", /^true [1-9]/.test(pos) || /Loading|Could not/.test(await ev(`MiniDaw.all[0].statusEl.textContent`)), pos);
  // mixer
  await b.goto(U("daw-mixer")); await b.sleep(300);
  const mx = await ev(`(() => { const s = document.querySelectorAll('.mdaw-strip'); const f = s[1].querySelector('.mdaw-fader'); f.value = -3; f.oninput(); f.onchange();
    return s.length + ' ' + MiniDaw.all[0].p.tracks[1].vol + ' ' + JSON.parse(localStorage.getItem('mdaw:daw-mixer')).tracks[1].vol; })()`);
  check("mixer: 4 strips + master, fader saved", mx === "5 -3 -3", mx);
  // audio: record from the (fake) microphone into the Voice track
  await b.goto(U("daw-record")); await ev(`sessionStorage.setItem('audio-check-v1', JSON.stringify({ browserOk: true, output: 'speakers', latencyMs: 40, bleedDb: -30, peakDb: -12, level: 'ok', constraints: {} }))`);
  await b.goto(U("daw-record")); await b.sleep(300);
  await ev(`(() => { const D = MiniDaw.all[0]; D.p.tempo = 200; D.record(); })()`); await b.sleep(4000);
  const rec = await ev(`(() => { const D = MiniDaw.all[0], was = D.recording; D.stop(); const c = D.p.tracks[0].clips[0];
    return was + ' ' + (c ? [c.start, c.len, !!c.take, c.nudge, isFinite(c.level.peak), c.out, document.querySelector('.mdaw-take').textContent.slice(0, 15)].join(' ') : 'no clip ' + D.statusEl.textContent); })()`);
  check("records the mic into an audio clip (latency fix 40 ms, level, speakers)", /^true 0 \d+ true 40 true speakers This take: pea/.test(rec), rec);
  const amid = await ev(`MiniDaw.toMidi(MiniDaw.all[0].p)[11]`);
  check("MIDI export leaves the audio track out (tempo + 3)", amid === 4, amid);
  await b.resize(390, 800); await b.goto(U("daw-export")); await b.sleep(400);
  check("no sideways page scroll at phone width", await ev(`document.documentElement.scrollWidth <= 390`), await ev(`document.documentElement.scrollWidth`));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
