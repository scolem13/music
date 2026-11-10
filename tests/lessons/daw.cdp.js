// The DAW lessons (lessons/daw-*.qmd, apps/shared/daw/mini-daw.js), headless: every page makes its DAW, the step grid edits,
// undo, duplicate / split, the band writes parts, play moves the playhead, MIDI export is a valid file, the mixer, no sideways scroll on a phone.
// SITE=<dir> PORT=<n> tests a render made elsewhere (default _site, 8527).
// Run after rendering: for f in timeline beat pianoroll arrange mixer record export real; do quarto render lessons/daw-$f.qmd; done; node tests/lessons/daw.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", PORT = +process.env.PORT || 8527, { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), U = p => "http://127.0.0.1:" + PORT + "/lessons/" + p + ".html";
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
  // time signatures: 6/8, a change to 3/4 at bar 3, the ruler, the position, the band in 6/8, MIDI, saved and reloaded, an old project
  await b.goto(U("daw-arrange")); await ev(`localStorage.clear()`); await b.goto(U("daw-arrange")); await b.sleep(300);
  const ts1 = await ev(`(() => { const D = MiniDaw.all[0]; D.tsSel.value = '6/8'; D.tsSel.onchange(); const bars = [...D.gridEl.querySelectorAll('.mdaw-ruler .mdaw-bar')];
    D.setPos(4.5); return [JSON.stringify(D.p.ts), bars[0].textContent, bars[1].style.left, D.posEl.textContent].join(' | '); })()`);
  check("6/8: ruler labelled, bars 3 beats (78 px) apart, 4.5 beats is 2.2.1", ts1 === '[6,8] | 1 6/8 | 78px | 2.2.1', ts1);
  const ts3 = await ev(`(() => { const D = MiniDaw.all[0]; D.setPos(0); D.chartIn.value = 'C | Am | F | G'; D.styleSel.value = 'rock'; D.timesIn.value = 1; D.bandWrite();
    const d = D.p.tracks.find(t => t.name === 'Drums'), c = d.clips[d.clips.length - 1];
    return [D.statusEl.textContent.slice(0, 21), c.len, Math.max(...c.notes.map(n => n.t)) < 12, c.notes.length > 6].join(' | '); })()`);
  check("the band writes 4 bars in 6/8 = 12 beats, notes inside", ts3 === 'The band wrote 4 bars | 12 | true | true', ts3);
  const tsAll = await ev(`(() => { const D = MiniDaw.all[0], out = []; for (const t of ['2/4', '3/4', '5/4', '7/8', '9/8', '12/8']) { D.p.tsMap = []; D.p.ts = MiniDaw.Meter.parse(t); D.p.bars = 8; D.setPos(0); D.chartIn.value = 'C | Am | F | G'; D.timesIn.value = 1; D.bandWrite();
    const c = D.p.tracks.find(x => x.name === 'Drums').clips.slice(-1)[0], want = MiniDaw.Meter.beats(D.p.ts) * 4; out.push(t + ':' + (c.len === want && c.notes.length > 3 && c.notes.every(n => n.t < c.len) ? 'ok' : 'bad ' + c.len + '/' + want)); }
    D.p.ts = [6, 8]; D.p.tsMap = []; return out.join(' '); })()`);
  check("the band writes 4 bars in every meter", !/bad/.test(tsAll), tsAll);
  const ts2 = await ev(`(() => { const D = MiniDaw.all[0]; D.tsBar.value = 3; D.tsSel.value = '3/4'; D.tsSel.onchange(); const bars = [...D.gridEl.querySelectorAll('.mdaw-ruler .mdaw-bar')];
    const m = MiniDaw.toMidi(D.p), sigs = []; for (let i = 0; i < m.length - 6; i++) if (m[i] === 255 && m[i + 1] === 88) sigs.push(m[i + 3] + '/' + (1 << m[i + 4]));
    return [JSON.stringify(D.p.tsMap), bars[2].textContent, bars[3].style.left, D.tsList.textContent.trim(), sigs.join(',')].join(' | '); })()`);
  check("3/4 from bar 3: the ruler, a remove button, MIDI has both", ts2 === '[{"bar":2,"ts":[3,4]}] | 3 3/4 | 234px | bar 3: 3/4 × | 6/8,3/4', ts2);
  const ts4 = await ev(`(() => { const D = MiniDaw.all[0], j = JSON.parse(localStorage.getItem(D.storeKey)); return JSON.stringify(j.ts) + j.tsMap.length; })()`);
  check("saved with the project", ts4 === '[6,8]1', ts4);
  await b.goto(U("daw-arrange")); await b.sleep(300);
  check("reload keeps 6/8", await ev(`JSON.stringify(MiniDaw.all[0].p.ts)`) === '[6,8]');
  await ev(`(() => { const p = JSON.parse(localStorage.getItem('mdaw:' + (document.querySelector('.mdaw').dataset.id))); delete p.ts; delete p.tsMap; localStorage.setItem('mdaw:' + document.querySelector('.mdaw').dataset.id, JSON.stringify(p)); })()`);
  await b.goto(U("daw-arrange")); await b.sleep(300);
  check("an old project with no meter loads as 4/4", await ev(`JSON.stringify(MiniDaw.all[0].p.ts) + MiniDaw.all[0].p.tsMap.length + MiniDaw.all[0].tsSel.value`) === '[4,4]04/4');
  const ts5 = await ev(`(() => { const D = MiniDaw.all[0]; const p = JSON.parse(JSON.stringify(D.p)); p.ts = [7, 8]; p.bars = 4; const r = MiniDaw.fromMidi(MiniDaw.toMidi(p)); D.openMidi(MiniDaw.toMidi(p), 'x.mid'); return JSON.stringify(D.p.ts) + ' ' + D.statusEl.textContent.slice(0, 60); })()`);
  check("Open MIDI takes the file's time signature", /^\[7,8\] Opened x.mid: .* bars of 7\/8/.test(ts5), ts5);
  await b.resize(390, 800); await b.goto(U("daw-export")); await b.sleep(400);
  check("no sideways page scroll at phone width", await ev(`document.documentElement.scrollWidth <= 390`), await ev(`document.documentElement.scrollWidth`));
  // Backing Track -> Open in the DAW: the band's MIDI handed over through localStorage and opened as tracks
  await b.goto("http://127.0.0.1:" + PORT + "/tools/backing-track.html"); await b.sleep(1500);
  const sent = await ev(`(() => { window.open = () => null; document.getElementById('bt-mid-daw').click(); const h = JSON.parse(localStorage.getItem('mdaw:handoff') || 'null');
    return h && h.midi ? 'yes ' + h.name : 'no ' + document.getElementById('bt-mid-note').textContent; })()`);
  check("backing track: Open in the DAW leaves the MIDI for the DAW", /^yes .+\.mid$/.test(sent), sent);
  await b.goto(U("daw-export")); await b.sleep(600);
  const got = await ev(`(() => { const D = MiniDaw.all[0]; return D.p.tracks.map(t => t.inst + ':' + t.clips[0].notes.length).join(' ') + ' | ' + (localStorage.getItem('mdaw:handoff') === null) + ' | ' + D.statusEl.textContent; })()`);
  check("daw-export: opened the band's tracks, hand-off used up", /kit:\d+/.test(got) && /bass:\d+/.test(got) && / \| true \| Opened/.test(got), got);
  const undo = await ev(`(() => { const D = MiniDaw.all[0]; D.doUndo(true); return D.p.tracks.map(t => t.name).join(','); })()`);
  check("daw-export: Undo puts the song back", undo === "Drums,Bass,Keys", undo);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
