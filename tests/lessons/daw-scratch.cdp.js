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
  // projects
  const pr = await ev(`(() => { ${KEY} const out = [];
    out.push(D.pIndex.length, D.pIndex[0].key, !!document.querySelector('.mdaw-projects'));
    D.change(() => { D.p.tempo = 77; }); const first = D.storeKey;
    document.querySelectorAll('.mdaw-projects button')[0].click();            // New
    out.push(D.pIndex.length, D.p.tempo, D.undo.length, D.storeKey !== first);
    D.change(() => { D.p.tempo = 133; });
    D.projSel.value = first; D.projSel.dispatchEvent(new Event('change'));    // switch back
    out.push(D.p.tempo, D.undo.length);
    document.querySelectorAll('.mdaw-projects button')[1].click();            // Duplicate
    out.push(D.pIndex.length, D.p.tempo, D.curProject().name);
    D.projName.value = 'My song'; D.projName.dispatchEvent(new Event('change')); out.push(D.curProject().name, JSON.parse(localStorage.getItem('mdaw:daw-scratch:projects')).length);
    window.confirm = () => true; document.querySelectorAll('.mdaw-projects button')[2].click();   // Delete
    out.push(D.pIndex.length, D.projSel.options.length);
    return out.join(' | '); })()`);
  check("projects: one at first, New is blank with no undo, switching restores, Duplicate copies, rename and Delete keep the index", pr === "1 | mdaw:daw-scratch | true | 2 | 100 | 0 | true | 77 | 0 | 3 | 77 | Project 1 copy | My song | 3 | 2 | 2", pr);
  // clip copy / paste
  const cl = await ev(`(() => { ${KEY} const out = []; D.p = Object.assign(D.p, { tracks: D.p.tracks }); const tr = D.p.tracks[2];
    D.change(() => { tr.clips = [{ start: 0, len: 4, notes: [{ t: 0, d: 1, m: 60, v: .8 }, { t: 1, d: 1, m: 64, v: .8 }] }]; D.sel = { track: 2, clip: 0, slot: -1, notes: [] }; });
    key('c', { ctrlKey: true }); D.setPos(8); key('v', { ctrlKey: true }); out.push(tr.clips.length, tr.clips[1] && tr.clips[1].start, tr.clips[1] && tr.clips[1].notes.length);
    D.doUndo(true); out.push(D.p.tracks[2].clips.length);
    D.sel = { track: 2, clip: 0, slot: -1, notes: [] }; D.setPos(60); key('v', { ctrlKey: true }); out.push(D.p.bars);
    return out.join(' | '); })()`);
  check("clip: Ctrl+C then Ctrl+V at bar 3 makes a copy there, Undo removes it, pasting at bar 16 grows the song", cl === "2 | 8 | 2 | 1 | 16", cl);
  // notes
  const nt = await ev(`(() => { ${KEY} const out = []; const tr = D.p.tracks[2], c = tr.clips[0]; D.sel = { track: 2, clip: 0, slot: -1, notes: [0, 1] };
    key('c', { ctrlKey: true }); D.setPos(2); key('v', { ctrlKey: true }); out.push(c.notes.length, c.notes.slice(2).map(n => n.t).join());
    key('x', { ctrlKey: true }); out.push(D.p.tracks[2].clips[0].notes.length); D.doUndo(true); out.push(D.p.tracks[2].clips[0].notes.length); D.doUndo(true); out.push(D.p.tracks[2].clips[0].notes.length);
    out.push(JSON.parse(localStorage.getItem('mdaw:clipboard')).kind);
    return out.join(' | '); })()`);
  check("notes: copy two, paste at the playhead (beat 2: 2 and 3), cut removes the pasted ones and Undo brings them back", nt === "4 | 2,3 | 2 | 4 | 2 | notes", nt);
  // zoom
  const zm = await ev(`(() => { ${KEY} const out = []; D.p.bars = 16; D.renderAll(); const clipW = () => D.gridEl.querySelector('.mdaw-clip').getBoundingClientRect().width, hx = () => D.head.style.left;
    const w0 = clipW(); out.push(w0.toFixed(0)); const btns = [...document.querySelectorAll('.mdaw-zoom')][0].querySelectorAll('button');
    btns[1].click(); const w1 = clipW(); out.push(w1 > w0); D.setPos(4); out.push(hx());
    btns[0].click(); btns[0].click(); const w2 = clipW(); out.push(w2 < w0);
    btns[2].click(); const g = D.gridEl, lane = g.querySelector('.mdaw-lane[data-track]'); out.push(lane.getBoundingClientRect().width <= g.clientWidth - 196 + 1, getComputedStyle(lane).backgroundImage.indexOf('px') > 0);
    key('=', { ctrlKey: true }); out.push(D.zoom.arr > 0.15, JSON.parse(localStorage.getItem('mdaw:daw-scratch:zoom')).arr === D.zoom.arr);
    const rz = [...document.querySelectorAll('.mdaw-zoom')][1].querySelectorAll('button'); const cvw = () => D.roll.querySelector('canvas').getBoundingClientRect().width, a = cvw(); rz[1].click(); const b2 = cvw(); rz[4].click(); const rh = D.rollGeom.rh;
    out.push(b2 > a, rh > 13);
    return out.join(' | '); })()`);
  check("zoom: + widens the clip, the playhead follows (beat 4), − narrows it, Fit fits the song in the width, Ctrl+= zooms and is remembered, the roll widens and its rows grow", /^\d+ \| true \| \d+(\.\d+)?px \| true \| true \| true \| true \| true \| true \| true$/.test(zm) && zm.split(" | ")[2] === (4 * 26 * 1.4 + 196) + "px", zm);
  // organ panel (step 1)
  const og = await ev(`(() => { ${KEY} const out = []; D.change(() => { D.p.tracks.push({ name: 'Org', inst: 'hammond', vol: 0, pan: 0, mute: false, solo: false, clips: [{ start: 0, len: 4, notes: [{ t: 0, d: 2, m: 60, v: .8 }] }] }); D.sel = { track: D.p.tracks.length - 1, clip: 0, slot: -1, notes: [] }; });
    const tr = D.track(); out.push(!!document.querySelector('.mdaw-organ'), document.querySelectorAll('.mdaw-barin').length);
    const r = document.querySelectorAll('.mdaw-barin')[3]; r.value = 5; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); out.push(tr.organ.bars);
    document.querySelector('.mdaw-leslie[data-leslie="fast"]').click(); out.push(D.track().organ.leslie);
    D.setPos(4); document.querySelector('.mdaw-aleslie[data-to="stop"]').click(); document.querySelector('.mdaw-aswell').click(); out.push(JSON.stringify(D.track().auto));
    out.push(MiniDaw.TrackSound.Organ.at(D.track(), 5).leslie, JSON.parse(localStorage.getItem(D.storeKey)).tracks.slice(-1)[0].organ.bars);
    D.p.tracks.push({ name: 'Org2', inst: 'hammond', vol: 0, pan: 0, mute: false, solo: false, clips: [], organ: { bars: '008000000' } }); D.renderAll();
    return out.join(' | '); })()`);
  check("organ: panel with nine tonebars, a slider writes track.organ.bars, Leslie fast, a Leslie step and a swell point land in auto, saved", /^true \| 9 \| 888500000 \| fast \| \{"vol":\[\],"leslie":\[\{"t":4,"v":"stop"\}\],"swell":\[\{"t":4,"v":0\.7\}\]\} \| stop \| 888500000$/.test(og), og);
  const ob = await ev(`(async () => { const rms = b => { let s = 0; const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); };
    async function render(opts, second) { const oc = new OfflineAudioContext(2, 44100, 44100), bk = BandSounds.create(oc); await bk.load(['hammond']);
      const d1 = oc.createGain(), d2 = oc.createGain(); d1.connect(oc.destination); d2.gain.value = 0; d2.connect(oc.destination); bk.setDest(d1, opts); if (second) bk.setDest(d2, { bars: '888888888', leslie: 'fast' });
      bk.play('hammond', { midi: 60, vel: .8, dur: .6 }, 0.01, d1); if (second) bk.play('hammond', { midi: 64, vel: .8, dur: .6 }, 0.01, d2); const r = await oc.startRendering(); return rms(r); }
    const a = await render({ bars: '008000000' }), b = await render({ bars: '888888888' }), c = await render({ bars: '008000000' }, true);
    return [a > 0, Math.abs(a - b) / a > 0.05, Math.abs(a - c) / a < 1e-6].join(' | '); })()`);
  check("organ: per-destination tonebars sound different (offline) and a second muted destination with other settings leaves the first unchanged", ob === "true | true | true", ob);
  // effects (step 2): an insert changes the output; the bounce renders inserts and sends
  const fx = await ev(`(async () => { ${KEY} const out = [];
    D.change(() => { D.p = Object.assign(D.p, { tempo: 120 }); D.p.tracks = [{ name: 'Keys', inst: 'piano', vol: 0, pan: 0, mute: false, solo: false, clips: [{ start: 0, len: 4, notes: [{ t: 0, d: 1, m: 60, v: .8 }, { t: 1, d: 1, m: 64, v: .8 }, { t: 2, d: 1, m: 67, v: .8 }] }] }]; D.sel = { track: 0, clip: 0, slot: -1, notes: [] }; });
    out.push(!!document.querySelector('.mdaw-fx'), document.querySelectorAll('.mdaw-fxslots select').length);
    const sel = document.querySelector('.mdaw-fxslots select[data-slot="0"]'); sel.value = 'distortion'; sel.dispatchEvent(new Event('change'));
    out.push(D.p.tracks[0].fx[0].kind, document.querySelectorAll('.mdaw-fxparams input[type=range]').length > 4);
    const dr = document.querySelector('.mdaw-fxparams input[data-k="level"]'); dr.value = 0.05; dr.dispatchEvent(new Event('input')); dr.dispatchEvent(new Event('change')); out.push(D.p.tracks[0].fx[0].params.level);
    // bounce peak with and without the insert (render the same project offline with the engine used by bounce())
    const peakOf = async (prep) => { const saved = JSON.stringify(D.p); prep(); let pk = 0; const orig = URL.createObjectURL; let blob = null; URL.createObjectURL = b => { blob = b; return orig.call(URL, b); };
      D.bounce(); for (let i = 0; i < 80 && !blob; i++) await new Promise(r => setTimeout(r, 250)); URL.createObjectURL = orig; D.p = JSON.parse(saved);
      const buf = new Int16Array((await blob.arrayBuffer()).slice(44)); let e = 0; for (const x of buf) { pk = Math.max(pk, Math.abs(x) / 32768); e += (x / 32768) ** 2; } return { pk, rms: Math.sqrt(e / buf.length) }; };
    const withFx = await peakOf(() => {}), without = await peakOf(() => { D.p.tracks[0].fx = [null, null, null]; });
    out.push(withFx.pk > 0 && without.pk > 0 && Math.abs(withFx.pk - without.pk) / without.pk > 0.2);
    const rv = await peakOf(() => { D.p.tracks[0].fx = [null, null, null]; D.p.tracks[0].sends = { reverb: 1, delay: 0 }; });
    out.push(rv.pk > 0 && Math.abs(rv.rms - without.rms) / without.rms > 0.05);
    return out.join(' | ') + ' | ' + [withFx.pk, without.pk, rv.rms, without.rms].map(x => x.toFixed(3)).join('/'); })()`);
  check("effects: three slots, picking Distortion shows its controls, a slider saves, the bounce peak differs with the insert and with a reverb send", /^true \| 3 \| distortion \| true \| 0\.05 \| true \| true \|/.test(fx), fx);
  const ek = await ev(`(async () => { const SK = SynthKit, res = [];
    for (const k of SK.FX_KINDS()) { const render = async (set) => { const oc = new OfflineAudioContext(2, 22050, 44100), o = oc.createOscillator(), g = oc.createGain(); o.type = 'sawtooth'; o.frequency.value = 220; o.connect(g);
        const f = SK.fx(k, oc, JSON.parse(JSON.stringify(SK.fxDefaults(k)))); g.connect(f.input); f.output.connect(oc.destination); if (set) f.set(set); o.start(0); o.stop(0.4); const b = await oc.startRendering(); let e = 0; const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) e += d[i] * d[i]; return Math.sqrt(e / d.length); };
      const a = await render(), p0 = SK.FX[k].params.find(p => !p.pick), b2 = await render(null); res.push(k + ':' + (a > 1e-4 && isFinite(a) ? 'ok' : 'silent') + (Math.abs(a - b2) <= 1e-6 * a ? '' : '~')); }
    return res.join(' '); })()`);
  check("effects engine: every kind builds headless on an OfflineAudioContext, makes sound, and is deterministic", ek.split(' ').length === 11 && ek.split(' ').every(x => /:ok$/.test(x)), ek);
  // synth instruments (step 3): each kind is offered, plays live (strip meter), and bounces non-silent audio; a patch saves per track
  const sy = await ev(`(async () => { ${KEY} const out = [], kinds = ['syn-sub', 'syn-fm', 'syn-wt', 'syn-chip'];
    out.push([...document.querySelectorAll('.mdaw-tools select')].some(s => [...s.options].some(o => o.value === 'syn-fm')));
    D.change(() => { D.p.tracks = kinds.map((k, i) => ({ name: 'S' + i, inst: k, vol: 0, pan: 0, mute: i > 0, solo: false, clips: [{ start: 0, len: 4, notes: [{ t: 0, d: 1, m: 60, v: .8 }, { t: 1, d: 1, m: 64, v: .8 }] }] })); D.sel = { track: 0, clip: 0, slot: -1, notes: [] }; });
    out.push(!!document.querySelector('.mdaw-synth'), document.querySelectorAll('.mdaw-synth input[type=range]').length > 15);
    document.querySelector('.mdaw-synpre').click(); out.push(!!D.p.tracks[0].synth && D.p.tracks[0].synth.params.cut > 0);
    const peakOf = async () => { const orig = URL.createObjectURL; let blob = null; URL.createObjectURL = b => { blob = b; return orig.call(URL, b); }; D.bounce(); for (let i = 0; i < 80 && !blob; i++) await new Promise(r => setTimeout(r, 250)); URL.createObjectURL = orig;
      let pk = 0; for (const x of new Int16Array((await blob.arrayBuffer()).slice(44))) pk = Math.max(pk, Math.abs(x) / 32768); return pk; };
    const peaks = [];
    for (let i = 0; i < 4; i++) { D.p.tracks.forEach((t, j) => { t.mute = j !== i; }); peaks.push(await peakOf()); }
    out.push(peaks.every(x => x > 0.01), peaks.map(x => x.toFixed(2)).join('/'));
    // live: the transport plays the synth track through its strip
    D.p.tracks.forEach((t, j) => { t.mute = j !== 1; }); D.setPos(0); D.p.loop.on = false; await D.play(); await new Promise(r => setTimeout(r, 1200)); let lv = 0; for (let k = 0; k < 10; k++) { lv = Math.max(lv, (() => { const a = D.strips[1].meter, b = new Float32Array(1024); a.getFloatTimeDomainData(b); return Math.max(...b.map(Math.abs)); })()); await new Promise(r => setTimeout(r, 60)); } D.stop(); out.push(lv > 0.001);
    return out.join(' | '); })()`);
  check("synth: the four kinds are in the Add menu, the patch panel and presets appear, each kind bounces non-silent audio and one plays live through its strip", /^true \| true \| true \| true \| true \| [\d./]+ \| true$/.test(sy), sy);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
