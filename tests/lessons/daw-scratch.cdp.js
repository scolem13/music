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

  // ---- compose tools (step 1-3) and nav (step 4) ----
  const BASE = `D.change(() => { D.p.tracks = [{ name: 'Keys', inst: 'piano', vol: 0, pan: 0, mute: false, solo: false, clips: [{ start: 0, len: 8, notes: [{ t: 0, d: 2, m: 60, v: .5 }, { t: 0, d: 2, m: 64, v: .5 }, { t: 0, d: 2, m: 67, v: .5 }, { t: 2, d: 1, m: 72, v: .9 }, { t: 3, d: 1, m: 71, v: .6 }, { t: 4, d: 4, m: 65, v: .7 }] }] }, { name: 'Bass', inst: 'ebass', vol: 0, pan: 0, mute: false, solo: false, clips: [] }]; D.p.bars = 16; D.p.loop = { on: false, from: 0, to: 4 }; D.p.tempo = 100; D.sel = { track: 0, clip: 0, slot: -1, notes: [] }; D.pos = 0; }); window.confirm = () => true;`;
  const bm = await ev(`(() => { ${KEY} ${BASE} const out = [];
    out.push(!!D.compSel && !!D.rhythmSel && !!D.voicingSel, D.rhythmSel.options[0].text, D.rhythmSel.querySelectorAll('optgroup').length > 3);
    D.styleSel.value = 'swing'; D.styleSel.dispatchEvent(new Event('change')); D.chartIn.value = 'Dm7 G7 | Cmaj7 | Am7 D7'; D.timesIn.value = 1; D.feelSel.value = '0';
    const chords = () => { const t = D.p.tracks.find(x => x.name === 'Chords'); return t.clips[0].notes.map(n => n.m + '@' + n.t.toFixed(2)).join(','); };
    D.setPos(0); D.rhythmSel.value = 'charleston'; D.bandWrite(); const a = chords();
    D.setPos(0); D.rhythmSel.value = 'four'; D.bandWrite(); const b2 = chords(); out.push(a !== b2, a.length > 20);
    D.rhythmSel.value = ''; D.compSel.value = 'guitar'; D.compSel.dispatchEvent(new Event('change')); out.push([...D.voicingSel.options].some(o => o.value === 'drop2'), D.voicingSel.options[0].text);
    D.voicingSel.value = 'drop2'; D.setPos(0); D.bandWrite(); out.push(/guitar/.test(D.p.tracks.find(x => x.name === 'Chords').inst));
    D.compSel.value = ''; D.compSel.dispatchEvent(new Event('change')); out.push(D.voicingSel.value === '');
    const r1 = MiniDaw.bandParts('Dm7 | G7', 'swing', 100, 1, [4, 4], { amt: 0 }, { voicing: 'rootless' }), r2 = MiniDaw.bandParts('Dm7 | G7', 'swing', 100, 1, [4, 4], { amt: 0 }, { voicing: 'shell' });
    out.push(r1.comp.map(n => n.m).join() !== r2.comp.map(n => n.m).join());
    return out.join(' | '); })()`);
  check("band row: Comping / Rhythm / Voicing menus (Style default first, rhythms grouped); Charleston vs four writes different chords; guitar + Drop 2 makes a guitar track; voicing override changes the notes", /^true \| Style default \| true \| true \| true \| true \| Style default \| true \| true \| true$/.test(bm), bm);
  const ab = await ev(`(async () => { ${KEY} ${BASE} const out = []; D.abcBox.open = true; D.abcBox.dispatchEvent(new Event('toggle')); await new Promise(r => setTimeout(r, 400));
    const txt = D.abcText.value; out.push(/\\[CEG\\]/.test(txt), !!D.abcStaff.querySelector('svg'), D.abcStaff.querySelectorAll('.abcjs-note').length >= 4, /Check/.test(D.abcInfo.textContent));
    const u0 = D.undo.length, c = D.p.tracks[0].clips[0];
    D.abcText.value = txt.replace('[CEG]8', '[CEG]4 z4'); D.abcText.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 400));
    [...D.abcBox.querySelectorAll('button')].find(b => b.textContent === 'Apply').click();
    out.push(D.undo.length === u0 + 1, c.notes.filter(n => n.m === 60).length === 1 && c.notes.find(n => n.m === 60).d === 2 === false, c.notes.find(n => n.m === 72).v === 0.9, c.notes.find(n => n.m === 60).v === 0.5);
    D.doUndo(true); out.push(D.p.tracks[0].clips[0].notes.find(n => n.m === 60).d === 2, D.p.tracks[0].clips[0].notes.length === 6);
    let asked = 0; window.confirm = () => { asked++; return true; }; D.p.tracks[0].clips[0].notes.push({ t: 0.1, d: 1, m: 50, v: .4 }); D.renderAll(); await new Promise(r => setTimeout(r, 300));
    [...D.abcBox.querySelectorAll('button')].find(b => b.textContent === 'Apply').click(); out.push(asked === 1, D.p.tracks[0].clips[0].notes.every(n => Math.abs(n.t * 4 - Math.round(n.t * 4)) < 1e-9));
    D.doUndo(true); D.abcText.value = D.abcText.value.replace('z', 'z'); D.abcBad = null;
    D.abcText.value = 'X:1\\nM:4/4\\nL:1/16\\nK:C\\nC12 | c16 |]\\n'; D.abcText.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 400)); out.push(/beats, not/.test(D.abcInfo.textContent));
    // click a note on the staff selects it in the roll
    D.abcKey.value = 'C'; D.abcKey.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 400)); D.sel.notes = [];
    const heads = [...D.abcStaff.querySelectorAll('.abcjs-note')]; const h = heads[1]; const bb = h.getBoundingClientRect(), svg = D.abcStaff.querySelector('svg'); for (const t of ['mousedown', 'mouseup']) svg.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, clientX: bb.left + bb.width / 2, clientY: bb.top + bb.height / 2, button: 0 }));
    out.push(D.sel.notes.length >= 1 && D.p.tracks[0].clips[0].notes[D.sel.notes[0]] !== undefined);
    return out.join(' | '); })()`);
  check("edit as notation: ABC with a [CEG] chord and a drawn staff; edit + Apply = one undo step keeping velocities, Undo restores; off-grid warns (confirm asked once) and snaps; a short bar is reported; clicking a note selects it in the roll", /^true \| true \| true \| false( \| true){10}$/.test(ab), ab);
  const fl = await ev(`(async () => { ${KEY} ${BASE} const out = []; D.fillBox.open = true; D.fillBox.dispatchEvent(new Event('toggle')); const F = D.fillUi;
    const go = () => [...D.fillBox.querySelectorAll('button')].find(b => b.textContent === 'Fill').click(), tn = () => D.p.tracks.length;
    F.from.value = 1; F.to.value = 4; F.edited = true; F.chart.value = 'Dm7 G7 | Cmaj7'; F.src.value = 'arp'; F.src.dispatchEvent(new Event('change')); F.aType.value = 0; F.target.value = 'new';
    let u0 = D.undo.length, t0 = tn(); go(); out.push(tn() === t0 + 1, D.undo.length === u0 + 1, D.track().clips.length === 1 && D.track().clips[0].len === 16 && D.track().clips[0].notes.length > 40);
    D.doUndo(true); out.push(tn() === t0);
    F.src.value = 'arranger'; F.src.dispatchEvent(new Event('change')); F.rStyle.value = 'pop8'; F.rStyle.dispatchEvent(new Event('change')); F.rSec.value = 'Main A'; F.rSec.dispatchEvent(new Event('change')); F.rCh.value = 'Bass'; D.fillTargets(); F.target.value = '1'; u0 = D.undo.length; go();
    out.push(D.undo.length === u0 + 1, D.p.tracks[1].clips.length === 1 && D.p.tracks[1].clips[0].notes.length > 8, D.p.tracks[1].clips[0].notes[0].m % 12 === 2);
    F.src.value = 'band'; F.src.dispatchEvent(new Event('change')); F.bStyle.value = 'swing'; F.bPart.value = 'drums'; F.target.value = '1'; go(); out.push(/drum part/.test(D.statusEl.textContent));
    F.bPart.value = 'bass'; F.target.value = '1'; u0 = D.undo.length; go(); out.push(D.undo.length === u0 + 1, D.p.tracks[1].clips.length === 1 && D.p.tracks[1].clips[0].len === 16);
    F.bPart.value = 'drums'; F.target.value = 'new'; go(); out.push(D.track().inst === 'kit', D.track().clips[0].notes.some(n => typeof n.m === 'string'));
    // chords from the clip
    D.sel = { track: 0, clip: 0, slot: -1, notes: [] }; [...D.fillBox.querySelectorAll('button')].find(b => /Chords from/.test(b.textContent)).click(); out.push(/C/.test(F.chart.value), F.chart.value);
    return out.join(' | '); })()`);
  check("fill from chords: arp -> a new track, one clip of 4 bars, ONE undo step, Undo removes it; arranger Bass onto Bass (root D); band drums onto a note track is refused, band bass replaces, drums to a new kit track; chords read from the clip", /^(true \| ){13}Cmaj7 \| Cmaj7$/.test(fl), fl);
  const nv = await ev(`(() => { ${KEY} ${BASE} const out = [], k = (key, o) => key2(key, o), key2 = (kk, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: kk, code: o && o.code, bubbles: true, cancelable: true }, o || {})));
    const c = () => D.p.tracks[0].clips[0];
    out.push(!!D.stepSel, D.stepMode);
    key2('l', { code: 'KeyL', altKey: true }); out.push(c().start);                       // Alt+l moves the selected clip a beat
    key2('ArrowRight', { altKey: true, code: 'ArrowRight' }); out.push(c().start);       // Alt+→ too
    key2('L', { code: 'KeyL', shiftKey: true, altKey: true }); out.push(c().start);       // Alt+L: a bar (to the next bar line)
    key2('h', { code: 'KeyH', altKey: true }); out.push(c().start);
    D.stepSel.value = 'sixteenth'; D.stepSel.dispatchEvent(new Event('change')); key2('l', { code: 'KeyL', altKey: true }); out.push(c().start); D.stepSel.value = 'beat'; D.stepSel.dispatchEvent(new Event('change'));
    D.doUndo(true); D.doUndo(true); D.doUndo(true); D.doUndo(true); D.doUndo(true); out.push(c().start);
    D.setPos(0); key2('ArrowRight'); out.push(D.pos); key2('ArrowRight', { shiftKey: true }); out.push(D.pos); key2('ArrowLeft'); out.push(D.pos);
    key2('Escape'); out.push(D.sel.clip); key2('l', { code: 'KeyL' }); out.push(D.pos, c().start);
    D.sel = { track: 0, clip: 0, slot: -1, notes: [3] }; const t3 = c().notes[3].t, m3 = c().notes[3].m; key2('l', { code: 'KeyL', altKey: true }); out.push(c().notes[3].t - t3, c().start);
    key2('ArrowUp', { altKey: true, code: 'ArrowUp' }); out.push(c().notes[3].m - m3); key2('ArrowUp', { altKey: true, shiftKey: true, code: 'ArrowUp' }); out.push(c().notes[3].m - m3);
    D.sel.notes = [3]; key2('3', {}); key2('l', { code: 'KeyL', altKey: true }); out.push(c().notes[3].t - t3);
    D.sel = { track: 0, clip: 0, slot: -1, notes: [] }; const s0 = c().start; D.setPos(0); key2('l', { code: 'KeyL' }); out.push(D.pos, c().start === s0);   // plain l: the playhead, even with a clip selected
    return out.join(' | '); })()`);
  check("nav keys: l / Alt+→ a beat, L a bar, h back, sixteenth step, undo; arrows move the playhead a step (Shift a bar); Esc deselects then l moves the playhead; with a note selected l moves the note not the clip, Alt+↑ transposes (Shift an octave), 3l repeats", nv === "true | beat | 1 | 2 | 4 | 3 | 3.25 | 0 | 1 | 4 | 3 | -1 | 4 | 0 | 1 | 0 | 1 | 13 | 4 | 1 | true", nv);
  const tu = await ev(`(async () => { ${KEY} const out = []; D.change(() => { D.p.tracks = []; D.p.ts = [4, 4]; D.p.tsMap = []; D.p.tempo = 100; D.pos = 0; D.sel = { track: 0, clip: -1, slot: -1, notes: [] }; });
    const row = [...D.fillBox.querySelectorAll('input[type=text]')].find(i => /tune/i.test(i.getAttribute('aria-label'))); row.value = 'Lightly Row';
    const u0 = D.undo.length; [...D.fillBox.querySelectorAll('button')].find(b => /Open the tune/.test(b.textContent)).click(); for (let i = 0; i < 50 && !D.p.tracks.length; i++) await new Promise(r => setTimeout(r, 100));
    const tr = D.p.tracks[0], c = tr && tr.clips[0]; out.push(D.p.ts.join('/'), D.p.tempo, c && c.len, c && c.notes[0].m, D.undo.length === u0 + 1, D.fillUi.chart.value.split('|')[0].trim(), D.fillUi.to.value);
    D.doUndo(true); out.push(D.p.tracks.length); return out.join(' | '); })()`);
  check("open a tune: Lightly Row -> 2/4, Q 120, a 16-bar melody clip (first note F4 = 65), one undo step, its chords (Bb ...) and bars 1-16 in Fill from chords; undo removes it", tu === "2/4 | 120 | 32 | 65 | true | Bb | 16 | 0", tu);
  const ms = await ev(`(() => { ${KEY} ${BASE} const out = [], key2 = (kk, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: kk, bubbles: true, cancelable: true }, o || {}))), T = D.p.tracks;
    D.sel = { track: 0, clip: -1, slot: -1, notes: [] }; const n0 = T[0].clips.length;
    key2('S', { shiftKey: true }); out.push(T[0].solo); D.msTap = null; key2('M', { shiftKey: true }); out.push(T[0].mute, T[0].clips.length === n0);
    D.sel.track = 1; D.msTap = null; key2('M', { shiftKey: true }); out.push(T[1].mute); D.msTap = null;
    key2('M', { shiftKey: true }); key2('M', { shiftKey: true }); key2('M', { shiftKey: true }); out.push(T.some(t => t.mute));
    key2('S', { shiftKey: true }); key2('S', { shiftKey: true }); key2('S', { shiftKey: true }); out.push(T.some(t => t.solo));
    // Space plays / pauses with the focus on a button or a menu
    const bt = D.node.querySelector('button'), sl = D.node.querySelector('select'); let n = 0; const tg = D.toggle; D.toggle = function () { n++; };
    bt.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); sl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); D.toggle = tg; out.push(n);
    return out.join(' | '); })()`);
  check("S solos and M mutes the selected track (not split), SSS / MMM turn them all off; Space is play / pause from a button, a menu and the page", ms === "true | true | true | true | false | false | 3", ms);
  const tb = await ev(`(() => { ${KEY} ${BASE} const out = [], tab = (t, sh) => t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: !!sh, bubbles: true, cancelable: true }));
    D.sel = { track: 0, clip: -1, slot: -1, notes: [] }; D.setPos(0.5); D.renderAll();
    tab(D.gridEl); out.push(document.activeElement === D.ed, D.sel.clip === 0);
    D.sel.notes = [2]; const n2 = D.clip().notes[2]; tab(D.ed); out.push(document.activeElement === D.abcText, D.abcBox.open, D.abcText.selectionEnd > D.abcText.selectionStart);
    tab(D.abcText); out.push(D.abcStaff.contains(document.activeElement) || document.activeElement === D.abcStaff, D.abcStaff.querySelectorAll('.mdaw-abc-cur').length > 0, D.sel.notes.some(i => D.clip().notes[i] === n2));
    tab(D.abcStaff); out.push(document.activeElement === D.ed); tab(D.ed, true); out.push(document.activeElement === D.abcStaff);
    return out.join(' | '); })()`);
  check("Tab: arrangement -> the active track's clip in the roll -> the ABC text on the selected note -> that note lit on the staff (and selected) -> the roll; Shift+Tab back", tb === "true | true | true | true | true | true | true | true | true | true", tb);
  const lk = await ev(`(() => { ${KEY} ${BASE} const out = [], key2 = (kk, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: kk, bubbles: true, cancelable: true }, o || {})));
    D.setPos(5); key2(','); const l = () => D.p.loop; out.push(l().fb, l().on); D.setPos(9); key2('.'); out.push(l().tb, JSON.stringify(D.loopRange()));
    D.setPos(2); key2('.'); out.push(l().tb, l().fb);
    key2('\\\\'); out.push(l().on, D.loopRange() === null); key2('\\\\'); out.push(l().on);
    D.p.tracks[0].clips[0].start = 8; D.p.tracks[0].clips[0].len = 4; key2('O', { shiftKey: true }); out.push(JSON.stringify(D.loopRange())); D.doUndo(true); out.push(D.p.loop.fb === 2 || D.p.loop.fb === 0 || D.p.loop.fb === undefined);
    return out.join(' | '); })()`);
  check("loop keys: , sets the start and . the end at the playhead (turns the loop on), an end before the start pulls the start back, \\\\ toggles, Shift+O loops the selected clip, undo", /^5 \| true \| 9 \| \[5,9\] \| 2 \| 0 \| false \| true \| true \| \[8,12\] \| true$/.test(lk), lk);
  const rl = await ev(`(() => { ${KEY} ${BASE} const out = []; D.p.loop = { on: false, from: 0, to: 4 }; D.renderAll();
    const ruler = () => D.gridEl.querySelector('.mdaw-ruler'), W = () => D.beatW(), px = beat => ruler().getBoundingClientRect().left + beat * W(), loop = () => D.p.loop;
    const drag = (from, to, part) => { const tgt = part === 'm' ? ruler().querySelector('.mdaw-loopr') : part ? ruler().querySelector('.mdaw-loop-' + part) : ruler(); tgt.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: px(from), clientY: 6, button: 0 }));
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: (px(from) + px(to)) / 2 })); document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: px(to) })); document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: px(to) })); };
    out.push(ruler().querySelectorAll('.mdaw-loop-h').length === 2, ruler().querySelector('.mdaw-loop-h').getBoundingClientRect().width >= 14);
    const u0 = D.undo.length; drag(4.2, 9.6); out.push(loop().fb, loop().tb, loop().on, D.undo.length === u0 + 1);
    drag(10, 12, 'r'); out.push(loop().fb, loop().tb);
    drag(3.9, 1, 'l'); out.push(loop().fb, loop().tb);
    drag(6, 9, 'm'); out.push(loop().fb, loop().tb);
    D.setPos(0); drag(7, 7); out.push(D.pos, loop().fb);                              // a click only moves the playhead
    ruler().dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: px(5.5) })); out.push(loop().fb, loop().tb);   // double-click bar 2
    D.stepSel.value = 'bar'; D.stepSel.dispatchEvent(new Event('change')); drag(5, 10.4); out.push(loop().fb, loop().tb);
    D.stepSel.value = 'beat'; D.stepSel.dispatchEvent(new Event('change')); const w0 = D.beatW(); document.querySelectorAll('.mdaw-zoom')[0].querySelectorAll('button')[1].click(); out.push(D.beatW() > w0);
    drag(4.2, 9.6); out.push(loop().fb, loop().tb, JSON.stringify(D.loopRange()));
    D.doUndo(true); D.doUndo(true); out.push(loop().fb);
    return out.join(' | '); })()`);
  check("loop ruler: two 14px handles, drag across draws a loop snapped to beats (one undo step), the right / left handle resizes, the middle moves (+3 beats), a click only places the playhead, double-click loops a bar, bar step snaps to bars, still right when zoomed", /^true \| true \| 4 \| 10 \| true \| true \| 4 \| 12 \| 1 \| 12 \| 4 \| 15 \| 7 \| 4 \| 4 \| 8 \| 4 \| 12 \| true \| 4 \| 10 \| \[4,10\]/.test(rl) , rl);

  // ---- panels and the position readout (step 5) ----
  await ev(`localStorage.removeItem('mdaw:daw-scratch:panels'); localStorage.removeItem('mdaw:daw-scratch:panelopen'); 0`);
  await b.goto(U); await ev(SFX); await b.sleep(500);
  const pa = await ev(`(() => { const D = MiniDaw.all[0], ps = [...D.node.querySelectorAll('details.mdaw-panel')], out = [];
    out.push(ps.length >= 9, ps.filter(p => !p.classList.contains('mdaw-fixed')).every(p => p.id && p.querySelector(':scope > summary .pc-grip') && p.querySelector(':scope > summary .pc-across')), ['projects', 'sound', 'abc', 'fill', 'band', 'files'].every(x => D.node.querySelector('.mdaw-colB #daw-scratch-pn-' + x)), getComputedStyle(D.node.querySelector('.mdaw-colB')).display !== 'none');
    out.push(![...document.querySelectorAll('h2')].some(h => /Scratch pad/.test(h.textContent)), [...document.querySelectorAll('#TOC a, .sidebar a, nav a')].some(a => /How to use it/.test(a.textContent)) ? 'toc' : 'notoc');
    const ed = D.node.querySelector('#daw-scratch-pn-editor'); ed.open = false; ed.dispatchEvent(new Event('toggle'));
    D.node.querySelector('#daw-scratch-pn-mixer .pc-across').click();
    out.push(JSON.parse(localStorage.getItem('mdaw:daw-scratch:panelopen')).editor === false, JSON.stringify(JSON.parse(localStorage.getItem('mdaw:daw-scratch:panels'))[1]), getComputedStyle(D.node.querySelector('.mdaw-colB')).display !== 'none');
    return out.join(' | '); })()`);
  check("panels: 9+ folding panels each with a grip and ⇄, the side tools in the right-hand column from the start, no 'Scratch pad' heading; folding Editor and sending Mixer across are saved", /^true \| true \| true \| true \| true \| toc \| true \| \[.*"daw-scratch-pn-mixer".*\] \| true$/.test(pa), pa);
  await b.goto(U); await ev(SFX); await b.sleep(500);
  const pb = await ev(`(() => { const D = MiniDaw.all[0], out = [];
    out.push(!D.node.querySelector('#daw-scratch-pn-editor').open, D.node.querySelector('.mdaw-colB').contains(D.node.querySelector('#daw-scratch-pn-mixer')), D.node.querySelector('#daw-scratch-pn-mixer').open);
    out.push(D.node.querySelectorAll('#daw-scratch-pn-mixer *').length > 5);
    return out.join(' | '); })()`);
  check("panels: after a reload Editor is still folded and Mixer still in the sidebar column", pb === "true | true | true | true", pb);
  const fsr = await ev(`(async () => { const D = MiniDaw.all[0], out = []; try { await D.node.requestFullscreen(); await new Promise(r => setTimeout(r, 300)); } catch (e) {}
    out.push(document.fullscreenElement === D.node ? 'fs' : 'nofs', D.node.contains(D.node.querySelector('.mdaw-cols')));
    D.node.querySelector('#daw-scratch-pn-band .pc-across').click(); out.push(D.node.querySelector('.mdaw-colA').contains(D.node.querySelector('#daw-scratch-pn-band')), D.node.querySelector('#daw-scratch-pn-band').getBoundingClientRect().width > 100);
    if (document.fullscreenElement) await document.exitFullscreen(); return out.join(' | '); })()`);
  check("panels: in full screen (when the browser allows it) the columns stay inside the DAW and ⇄ still moves a panel", /^(fs|nofs) \| true \| true \| true$/.test(fsr), fsr);
  const pj = await ev(`(async () => { const D = MiniDaw.all[0], out = [], top = D.node.querySelector('.mdaw-top');
    out.push(['transport', 'arr'].every(x => top.contains(D.node.querySelector('#daw-scratch-pn-' + x))), !D.node.querySelector('#daw-scratch-pn-arr .pc-across'));
    out.push(Math.abs(D.node.querySelector('#daw-scratch-pn-arr').getBoundingClientRect().width - D.node.querySelector('.mdaw-cols').getBoundingClientRect().width) < 2);
    const nav = document.querySelector('#TOC .mdaw-parts, #quarto-margin-sidebar .mdaw-parts'); out.push(!!nav, nav ? nav.querySelectorAll('a').length >= 9 : 0);
    const mx = D.node.querySelector('#daw-scratch-pn-mixer'), li = [...nav.querySelectorAll('li')].find(l => /Mixer/.test(l.textContent));
    li.querySelector('.mdaw-eye').click(); out.push(getComputedStyle(mx).display === 'none', JSON.parse(localStorage.getItem('mdaw:daw-scratch:panelhide')).mixer === 1);
    mx.open = false; li.querySelector('a').click(); out.push(getComputedStyle(mx).display !== 'none', mx.open);
    // u undoes, Ctrl-r redoes
    D.change(() => { D.p.tempo = 133; }); const k = (kk, o) => D.node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: kk, bubbles: true, cancelable: true }, o || {})));
    k('u'); out.push(D.p.tempo !== 133); k('r', { ctrlKey: true }); out.push(D.p.tempo === 133);
    return out.join(' | '); })()`);
  check("transport + arrangement on top at full width (not movable); the parts list in the page sidebar jumps (opens) and its eye hides / shows (kept); u undo, Ctrl-r redo", pj === "true | true | true | true | true | true | true | true | true | true | true", pj);
  const rs = await ev(`(() => { const D = MiniDaw.all[0]; window.__reloaded = false; return JSON.stringify([!!localStorage.getItem('mdaw:daw-scratch:panels'), [...D.node.querySelectorAll('.mdaw-panelbar button')].map(x => x.textContent).join()]); })()`);
  check("panels: Fold all / Unfold all / Reset layout buttons", /Fold all,Unfold all,Show all,Reset layout/.test(rs), rs);
  await ev(`[...MiniDaw.all[0].node.querySelectorAll('.mdaw-panelbar button')].find(x => x.textContent === 'Fold all').click(); 0`);
  const fa = await ev(`[...MiniDaw.all[0].node.querySelectorAll('details.mdaw-panel')].every(p => !p.open)`);
  await ev(`[...MiniDaw.all[0].node.querySelectorAll('.mdaw-panelbar button')].find(x => x.textContent === 'Unfold all').click(); 0`);
  const ua = await ev(`[...MiniDaw.all[0].node.querySelectorAll('details.mdaw-panel')].every(p => p.open)`);
  await b.sleep(300); await ev(`[...MiniDaw.all[0].node.querySelectorAll('.mdaw-panelbar button')].find(x => x.textContent === 'Reset layout').click(); 0`); await b.sleep(1200); await ev(SFX); await b.sleep(400);
  const rr = await ev(`(() => { const D = MiniDaw.all[0]; return [String(localStorage.getItem('mdaw:daw-scratch:panels')), Object.values(JSON.parse(localStorage.getItem('mdaw:daw-scratch:panelopen') || '{}')).every(v => v === true), D.node.querySelector('.mdaw-colA').contains(D.node.querySelector('#daw-scratch-pn-mixer')), D.node.querySelector('#daw-scratch-pn-editor').open].join(' | '); })()`);
  check("panels: Fold all folds, Unfold all opens, Reset layout forgets the layout and the folds and puts every panel back", fa === true && ua === true && /^null \| true \| true \| true$/.test(rr), fa + ' ' + ua + ' ' + rr);
  const ps = await ev(`(() => { ${KEY} ${BASE} const out = [], P = D.posEl, typed = (t, k) => { P.click(); const i = D.posIn; i.value = t; i.dispatchEvent(new KeyboardEvent('keydown', { key: k || 'Enter', bubbles: true, cancelable: true })); return i; };
    P.click(); out.push(!!D.posIn, P.hidden, document.activeElement === D.posIn); D.posIn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); out.push(D.posIn === null, P.hidden, D.pos);
    typed('3.2.1'); out.push(D.pos, D.posIn === null, P.textContent);
    typed('2.3'); out.push(D.pos); typed('6'); out.push(D.pos);
    const bad = typed('99.1.1'); out.push(D.pos, D.posIn === bad, bad.classList.contains('mdaw-shake'), /bars/.test(D.statusEl.textContent)); bad.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const bad2 = typed('abc'); out.push(D.posIn === bad2); bad2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    D.p.tsMap = [{ bar: 1, ts: [3, 4] }]; D.renderAll(); typed('3.1.1'); out.push(D.pos); const b4 = typed('2.4'); out.push(D.pos, D.posIn === b4, /3 beats/.test(D.statusEl.textContent)); b4.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    D.p.tsMap = [{ bar: 1, ts: [6, 8] }]; D.renderAll(); typed('2.2.2'); out.push(D.pos, P.textContent);
    D.setPos(0); D.node.focus(); D.node.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true })); out.push(!!D.posIn); D.posIn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return out.join(' | '); })()`);
  check("position readout: click opens a box, Esc cancels; 3.2.1 -> beat 9 (readout 3.2.1), 2.3 -> 6, 6 -> 20; a bad entry stays, shakes and says why; follows a 3/4 and a 6/8 bar; G opens it", ps === "true | true | true | true | false | 0 | 9 | true | 3.2.1 | 6 | 20 | 20 | true | true | true | true | 7 | 7 | true | true | 5.5 | 2.2.2 | true".replace("5.5", "5.75") || false, ps);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
