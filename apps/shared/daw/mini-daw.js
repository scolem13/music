// mini-daw.js — a very small DAW for teaching what a DAW is (MiniDaw). It plays the Backing Track band's sounds
// (BandSounds) and can ask the band for parts (BandMidi.generate). Nothing here is shared with the Backing Track page.
//
//   MiniDaw.init()   makes a DAW in every <div class="mdaw"> on the page.
//
//   <div class="mdaw" data-id="daw-1" data-preset="beat" data-show="transport tracks editor mixer band files" data-bars="8"></div>
//     data-id      the localStorage key the project is kept under ("mdaw:<id>"); Reset goes back to the preset
//     data-preset  the project it starts with: empty | beat | song | keys | badmix | record | band (see PRESETS)
//     data-show    which parts are shown: transport, tracks, editor, mixer, band, files, record (default all)
// An "Audio (microphone)" track records sound (AudioCheck first, then the mic with no echo cancellation, so bleed is kept) into
// audio clips; the recordings live in IndexedDB, the project only names them (see "recorded audio" below).
//     data-bars    the song's length in bars (default the preset's)
//
// The model (one project): { tempo, bars, loop:{on,from,to} (bars), click, tracks:[track] }
//   track = { name, inst (a BandSounds instrument), vol (dB), pan (-1..1), mute, solo, clips:[clip] }
//   clip  = { start (beats from the top), len (beats), notes:[{ t (beats into the clip), d (beats), m (midi or kit piece), v (0..1) }] }
// Time is in beats (quarter notes), 4/4 only, sixteen steps a bar.
//
// Keys (when the DAW has focus): Space play/stop, Enter back to the start, L loop on/off, C click, R record,
// Delete delete the selection, Ctrl/Cmd+D duplicate the clip, Ctrl/Cmd+Z / Shift+Z undo / redo, Q quantize the clip.
// While recording or with "Keys" on, A W S E D F T G Y H U J K O L play notes (Z / X octave), on a drum track A S D F G H J K the kit.
(function (global) {
  var INSTS = [
    { id: 'kit', label: 'Drum kit', drum: true }, { id: 'bass', label: 'Upright bass' }, { id: 'ebass', label: 'Electric bass' },
    { id: 'piano', label: 'Piano' }, { id: 'rhodes', label: 'Electric piano' }, { id: 'hammond', label: 'Organ' },
    { id: 'aguitar', label: 'Acoustic guitar' }, { id: 'clguitar', label: 'Electric guitar (clean)' },
    { id: 'odguitar', label: 'Electric guitar (distorted)' }, { id: 'congas', label: 'Congas', drum: true },
    { id: 'audio', label: 'Audio (microphone)', audio: true }];
  var KIT_ROWS = [['crash', 'Crash'], ['ride', 'Ride'], ['hatOpen', 'Open hat'], ['hatClosed', 'Closed hat'], ['tomHi', 'High tom'],
    ['tomMid', 'Mid tom'], ['tomLo', 'Low tom'], ['rim', 'Rim'], ['snare', 'Snare'], ['kick', 'Kick']];
  var CONGA_ROWS = [['congaSlap', 'Slap'], ['congaOpen', 'Conga open'], ['congaMute', 'Conga mute'], ['congaHeel', 'Heel'], ['congaToe', 'Toe'], ['tumbaOpen', 'Tumba open'], ['tumbaBass', 'Tumba bass']];
  var DRUM_KEYS = { a: 'kick', s: 'snare', d: 'hatClosed', f: 'hatOpen', g: 'tomLo', h: 'tomMid', j: 'crash', k: 'ride' };
  var PIANO_KEYS = 'awsedftgyhujkolp;'.split('');   // C up to E an octave and a 3rd above
  var COLORS = ['#c0603a', '#3a7dc0', '#5a9a46', '#9a5ab0', '#c09a2a', '#2a9a9a', '#b04a6a', '#6a6a6a'];
  var NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  var GM_PROGRAM = { bass: 32, ebass: 33, piano: 0, rhodes: 4, hammond: 16, aguitar: 25, clguitar: 27, odguitar: 30 };

  function instOf(id) { for (var i = 0; i < INSTS.length; i++) if (INSTS[i].id === id) return INSTS[i]; return INSTS[3]; }
  function isDrum(tr) { return !!instOf(tr.inst).drum; }
  function isAudio(tr) { return tr.inst === 'audio'; }
  function kind(i) { return i.audio || i.inst === 'audio' ? 'audio' : instOf(i.id || i.inst).drum ? 'drum' : 'notes'; }

  // ---------------- recorded audio ----------------
  // An audio clip: { start, len, take (id of the recording), off (beats from start where the recording begins; negative = it began
  // earlier, in the count-in), gain (dB), nudge (ms the recording is moved earlier: the latency fix), notes: [] }.
  // The recordings themselves are kept in IndexedDB ("mini-daw" / "takes"), not in the project, which only names them.
  var TAKES = {};          // id -> { buf: AudioBuffer, peaks: Float32Array (max |x| per 1/200 s) }
  function idb() {
    return new Promise(function (res, rej) { if (!global.indexedDB) return rej(new Error('no IndexedDB'));
      var r = indexedDB.open('mini-daw', 1); r.onupgradeneeded = function () { r.result.createObjectStore('takes'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; });
  }
  function putTake(id, data, rate) { return idb().then(function (db) { return new Promise(function (res) { var t = db.transaction('takes', 'readwrite'); t.objectStore('takes').put({ data: data, rate: rate }, id); t.oncomplete = res; t.onerror = res; }); }).catch(function () {}); }
  function getTake(id) { return idb().then(function (db) { return new Promise(function (res) { var q = db.transaction('takes').objectStore('takes').get(id); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; }); }
  function peaksOf(data, rate) { var hop = Math.max(1, Math.round(rate / 200)), out = new Float32Array(Math.ceil(data.length / hop));
    for (var i = 0; i < data.length; i++) { var a = Math.abs(data[i]), k = (i / hop) | 0; if (a > out[k]) out[k] = a; } return out; }
  function makeTake(id, data, rate) { var buf = new AudioBuffer({ length: Math.max(1, data.length), numberOfChannels: 1, sampleRate: rate }); buf.copyToChannel(data, 0);
    return (TAKES[id] = { buf: buf, peaks: peaksOf(data, rate), rate: rate }); }
  function levels(data, from) { var pk = 0, sum = 0, n = 0; for (var i = Math.max(0, from | 0); i < data.length; i++) { var a = Math.abs(data[i]); if (a > pk) pk = a; sum += a * a; n++; }
    var db = function (x) { return x > 0 ? 20 * Math.log10(x) : -Infinity; }; return { peak: db(pk), rms: db(Math.sqrt(sum / Math.max(1, n))) }; }
  function dbStr(x) { return isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(0) + ' dBFS' : 'silence'; }
  var WORKLET = "class R extends AudioWorkletProcessor{process(i){var c=i[0];if(c&&c[0])this.port.postMessage({t:currentTime,d:c[0].slice(0)});return true}}registerProcessor('mdaw-rec',R)";
  var workletP = null;
  function rowsOf(tr) { return tr.inst === 'congas' ? CONGA_ROWS : KIT_ROWS; }
  function noteName(m) { return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dbToGain(db) { return db <= -60 ? 0 : Math.pow(10, db / 20); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, title, cls) { var b = el('button', 'btn btn-sm btn-outline-secondary ' + (cls || ''), text); b.type = 'button'; if (title) { b.title = title; b.setAttribute('aria-label', title); } return b; }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  // ---------------- presets ----------------
  function steps(s, piece, v) { var out = []; s.split('').forEach(function (c, i) { if (c !== '.' && c !== ' ') out.push({ t: i / 4, d: 0.25, m: piece, v: c === 'X' ? 1 : c === 'g' ? 0.35 : v || 0.75 }); }); return out; }
  function beatClip(start, bars) {
    var n = []; for (var b = 0; b < (bars || 1); b++) {
      [['x...x...x...x...', 'hatClosed'], ['....x.......x...', 'snare'], ['x.......x.x.....', 'kick']].forEach(function (p) {
        steps(p[0], p[1]).forEach(function (e) { e.t += b * 4; n.push(e); }); }); }
    return { start: start, len: 4 * (bars || 1), notes: n };
  }
  function chordClip(start, chords, inst) {     // whole-note triads, one a bar
    var n = []; chords.forEach(function (c, i) { c.forEach(function (m) { n.push({ t: i * 4, d: 4, m: m, v: 0.6 }); }); });
    return { start: start, len: chords.length * 4, notes: n };
  }
  function rootClip(start, roots) {
    var n = []; roots.forEach(function (r, i) { [0, 1.5, 2, 3].forEach(function (t, k) { n.push({ t: i * 4 + t, d: k === 1 ? 0.5 : 1, m: r, v: 0.75 }); }); });
    return { start: start, len: roots.length * 4, notes: n };
  }
  var C = [60, 64, 67], AM = [57, 60, 64], F = [53, 57, 60], G = [55, 59, 62];
  function track(name, inst, clips, extra) { return Object.assign({ name: name, inst: inst, vol: 0, pan: 0, mute: false, solo: false, clips: clips || [] }, extra || {}); }
  var PRESETS = {
    empty: function () { return { tempo: 100, bars: 8, loop: { on: false, from: 0, to: 4 }, click: false, tracks: [track('Drums', 'kit'), track('Bass', 'ebass'), track('Keys', 'piano')] }; },
    beat: function () { return { tempo: 96, bars: 4, loop: { on: true, from: 0, to: 1 }, click: false, tracks: [track('Drums', 'kit', [beatClip(0, 1)])] }; },
    song: function () { return { tempo: 96, bars: 8, loop: { on: true, from: 0, to: 4 }, click: false, tracks: [
      track('Drums', 'kit', [beatClip(0, 4)]), track('Bass', 'ebass', [rootClip(0, [36, 33, 29, 31])]),
      track('Keys', 'piano', [chordClip(0, [C, AM, F, G])])] }; },
    keys: function () { return { tempo: 90, bars: 4, loop: { on: true, from: 0, to: 4 }, click: false, tracks: [
      track('Drums', 'kit', [beatClip(0, 4)], { vol: -6 }), track('Keys', 'piano', [chordClip(0, [C, AM, F, G])]), track('Bass', 'ebass', [{ start: 0, len: 16, notes: [] }])] }; },
    badmix: function () { return { tempo: 96, bars: 4, loop: { on: true, from: 0, to: 4 }, click: false, tracks: [
      track('Drums', 'kit', [beatClip(0, 4)], { vol: -14 }), track('Bass', 'ebass', [rootClip(0, [36, 33, 29, 31])], { vol: -22 }),
      track('Keys', 'piano', [chordClip(0, [C, AM, F, G])], { vol: 5 }), track('Guitar', 'clguitar', [chordClip(0, [[64, 67, 72], [64, 69, 72], [65, 69, 72], [62, 67, 71]])], { vol: 4 })] }; },
    record: function () { return { tempo: 92, bars: 8, loop: { on: false, from: 0, to: 4 }, click: true, tracks: [track('Voice', 'audio'),
      track('Drums', 'kit', [beatClip(0, 4), beatClip(16, 4)], { vol: -4 }), track('Bass', 'ebass', [rootClip(0, [36, 33, 29, 31]), rootClip(16, [36, 33, 29, 31])], { vol: -4 }),
      track('Keys', 'piano', [chordClip(0, [C, AM, F, G]), chordClip(16, [C, AM, F, G])], { vol: -6 })] }; },
    band: function () { return { tempo: 100, bars: 16, loop: { on: false, from: 0, to: 4 }, click: false, tracks: [] }; }
  };

  // ---------------- audio ----------------
  var AC = null, bank = null;
  function audio() {
    if (!AC) { AC = new (global.AudioContext || global.webkitAudioContext)(); bank = global.BandSounds.create(AC); }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  // a track's strip: input -> pan -> fader -> meter -> master
  function makeStrip(ctx, dest) {
    var input = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), fader = ctx.createGain(), meter = ctx.createAnalyser();
    meter.fftSize = 1024; input.connect(pan); pan.connect(fader); fader.connect(meter); meter.connect(dest);
    return { input: input, pan: pan, fader: fader, meter: meter };
  }
  function levelOf(an, buf) { an.getFloatTimeDomainData(buf); var p = 0; for (var i = 0; i < buf.length; i++) { var a = Math.abs(buf[i]); if (a > p) p = a; } return p; }
  function click(ctx, when, accent, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = accent ? 1760 : 1175; o.type = 'square';
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.18, when + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    o.connect(g); g.connect(dest); o.start(when); o.stop(when + 0.06);
  }
  function playNote(b, tr, n, when, secs, dest) {
    if (isDrum(tr)) return b.play(tr.inst, { piece: n.m, vel: n.v }, when, dest);
    return b.play(tr.inst, { midi: n.m, vel: n.v, dur: secs }, when, dest);
  }

  // ---------------- MIDI file ----------------
  function vlq(n) { var out = [n & 0x7f]; while ((n >>= 7) > 0) out.unshift((n & 0x7f) | 0x80); return out; }
  function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function strBytes(s) { var a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 0x7f); return a; }
  function trackChunk(evs) {
    evs.sort(function (a, b) { return a.tick - b.tick || a.o - b.o; });
    var out = [], last = 0; evs.forEach(function (e) { out = out.concat(vlq(e.tick - last), e.bytes); last = e.tick; });
    out = out.concat([0, 0xff, 0x2f, 0]); return [0x4d, 0x54, 0x72, 0x6b].concat(u32(out.length), out);
  }
  function toMidi(p) {
    var ppq = 480, GM = (global.BandMidi && global.BandMidi.GM) || {}, chunks = [];
    var us = Math.round(60000000 / p.tempo);
    chunks.push(trackChunk([{ tick: 0, o: 0, bytes: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] }, { tick: 0, o: 0, bytes: [0xff, 0x58, 4, 4, 2, 24, 8] }]));
    var ch = 0;
    p.tracks.forEach(function (tr) {
      if (isAudio(tr)) return;
      var drum = isDrum(tr), c = drum ? 9 : (ch === 9 ? ++ch : ch), evs = []; if (!drum) ch++;
      var name = strBytes(tr.name); evs.push({ tick: 0, o: 0, bytes: [0xff, 0x03].concat(vlq(name.length), name) });
      if (!drum) evs.push({ tick: 0, o: 0, bytes: [0xc0 | c, GM_PROGRAM[tr.inst] || 0] });
      tr.clips.forEach(function (cl) { cl.notes.forEach(function (n) {
        if (n.t >= cl.len) return; var key = drum ? GM[n.m] : n.m; if (key == null) return;
        var on = Math.round((cl.start + n.t) * ppq), off = on + Math.max(1, Math.round((drum ? 0.125 : Math.min(n.d, cl.len - n.t)) * ppq));
        evs.push({ tick: on, o: 2, bytes: [0x90 | c, key, clamp(Math.round(n.v * 127), 1, 127)] }, { tick: off, o: 1, bytes: [0x80 | c, key, 0] }); }); });
      chunks.push(trackChunk(evs));
    });
    var head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (chunks.length >> 8) & 255, chunks.length & 255, (ppq >> 8) & 255, ppq & 255];
    return new Uint8Array(chunks.reduce(function (a, c) { return a.concat(c); }, head));
  }
  function wav(buf) {
    var n = buf.length, chs = buf.numberOfChannels, data = new DataView(new ArrayBuffer(44 + n * chs * 2)), pos = 0;
    function s(t) { for (var i = 0; i < t.length; i++) data.setUint8(pos++, t.charCodeAt(i)); }
    function u(v, b) { if (b === 2) data.setUint16(pos, v, true); else data.setUint32(pos, v, true); pos += b; }
    s('RIFF'); u(36 + n * chs * 2, 4); s('WAVEfmt '); u(16, 4); u(1, 2); u(chs, 2); u(buf.sampleRate, 4); u(buf.sampleRate * chs * 2, 4); u(chs * 2, 2); u(16, 2); s('data'); u(n * chs * 2, 4);
    var c = []; for (var k = 0; k < chs; k++) c.push(buf.getChannelData(k));
    for (var i = 0; i < n; i++) for (k = 0; k < chs; k++) { var x = clamp(c[k][i], -1, 1); data.setInt16(pos, x < 0 ? x * 0x8000 : x * 0x7fff, true); pos += 2; }
    return new Blob([data], { type: 'audio/wav' });
  }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

  // ---------------- the band's parts as clips ----------------
  function chartAbc(chart) {
    var bars = chart.split('|').map(function (b) { return b.trim(); }).filter(Boolean).map(function (b) {
      var c = b.split(/\s+/); if (c.length > 1) { var h = 4 / c.length; return c.map(function (x) { return '"' + x + '"z' + h; }).join(' '); } return '"' + c[0] + '"z4'; });
    var rows = []; for (var i = 0; i < bars.length; i += 4) rows.push(bars.slice(i, i + 4).join(' | '));
    return { abc: 'X:1\nT:Chart\nM:4/4\nL:1/4\nK:C\n' + rows.join(' |\n') + ' |]', bars: bars.length };
  }
  function bandParts(chart, styleId, tempo, times) {
    var G = global; if (!G.TuneChart || !G.BandMidi || !G.BandCatalog) throw new Error('The band is not loaded on this page.');
    var ch = chartAbc(chart); if (!ch.bars) throw new Error('Type some chords first, bars split by |');
    var so = G.BandCatalog.styleOpts(styleId), opts = so.opts;
    var recs = G.BandMidi.generate(G.TuneChart.parse(ch.abc), { bars: ch.bars * (times || 1), tempo: tempo, opts: opts });
    var out = { bass: [], comp: [], drums: [], congas: [] };
    recs.forEach(function (r, i) {
      var sw = G.BandMidi.swingOf(r), off = i * 4, scale = 4 / (r.beats || 4);
      Object.keys(out).forEach(function (p) { (r.parts[p] || []).forEach(function (e) {
        if (!e || !(e.pos >= 0)) return; var t = off + (e.straight ? e.pos : G.BandMidi.warp(e.pos, sw)) * scale;
        t = Math.round(t * 48) / 48; var v = clamp(e.vel == null ? 0.7 : e.vel, 0.05, 1), d = Math.max(0.1, (e.dur || 0.5) * scale);
        if (p === 'drums' || p === 'congas') { if (e.piece) out[p].push({ t: t, d: 0.25, m: e.piece, v: v }); }
        else if (p === 'bass') { if (e.midi != null) out.bass.push({ t: t, d: d, m: e.midi, v: v }); }
        else (e.midis || []).forEach(function (m) { out.comp.push({ t: t, d: d, m: m, v: v }); }); }); });
    });
    var len = ch.bars * (times || 1) * 4;
    return { len: len, bass: out.bass, comp: out.comp, drums: out.drums, congas: out.congas,
      bassInst: opts.bassSound === 'electric' ? 'ebass' : 'bass', compInst: compInst(opts.compSound) };
  }

  // the comping sound as one of this DAW's instruments
  function compInst(s) {
    if (instOf(s).id === s) return s;
    if (global.BandSounds.family(s) === 'guitar') return /^(a|n)guitar$/.test(s) ? 'aguitar' : /^d/.test(s) ? 'odguitar' : 'clguitar';
    return /epiano|wurli/.test(s) ? 'rhodes' : /organ/.test(s) ? 'hammond' : 'piano';
  }

  // ---------------- one DAW ----------------
  function Daw(node) {
    var d = node.dataset, self = this;
    this.node = node; this.key = 'mdaw:' + (d.id || 'default'); this.presetName = d.preset || 'empty';
    var show = (d.show || 'transport tracks editor mixer band files record').split(/\s+/); this.show = {}; show.forEach(function (s) { self.show[s] = true; });
    this.p = store(this.key) || this.fresh();
    this.sel = { track: 0, clip: this.p.tracks[0] && this.p.tracks[0].clips.length ? 0 : -1, notes: [] };
    this.undo = []; this.redo = []; this.grid = 0.25; this.playing = false; this.recording = false; this.pos = 0; this.keysOn = false; this.octave = 0;
    this.strips = []; this.build(); this.renderAll(); this.loadTakes();
  };
  Daw.prototype.loadTakes = function () {
    var self = this, want = [];
    this.p.tracks.forEach(function (t) { t.clips.forEach(function (c) { if (c.take && !TAKES[c.take] && want.indexOf(c.take) < 0) want.push(c.take); }); });
    want.forEach(function (id) { getTake(id).then(function (r) { if (r && !TAKES[id]) { makeTake(id, r.data, r.rate); self.renderTracks(); self.renderEditor(); } }); });
  };
  Daw.prototype.fresh = function () { var p = PRESETS[this.presetName] ? PRESETS[this.presetName]() : PRESETS.empty(); if (this.node.dataset.bars) p.bars = +this.node.dataset.bars; return p; };
  Daw.prototype.save = function () { store(this.key, this.p); };
  Daw.prototype.change = function (fn, keepRender) {   // every edit goes through here: undo history, save, redraw
    this.undo.push(JSON.stringify(this.p)); if (this.undo.length > 100) this.undo.shift(); this.redo = [];
    fn(); this.save(); if (!keepRender) this.renderAll();
  };
  Daw.prototype.doUndo = function (back) {
    var from = back ? this.undo : this.redo, to = back ? this.redo : this.undo; if (!from.length) return this.say(back ? 'Nothing to undo.' : 'Nothing to redo.');
    to.push(JSON.stringify(this.p)); this.p = JSON.parse(from.pop()); this.fixSel(); this.save(); this.renderAll(); this.say(back ? 'Undone.' : 'Redone.');
  };
  Daw.prototype.fixSel = function () {
    var s = this.sel; s.track = clamp(s.track, 0, Math.max(0, this.p.tracks.length - 1)); var tr = this.p.tracks[s.track];
    if (!tr || s.clip >= tr.clips.length) s.clip = tr && tr.clips.length ? tr.clips.length - 1 : -1; s.notes = [];
  };
  Daw.prototype.say = function (t) { this.statusEl.textContent = t; };
  Daw.prototype.track = function () { return this.p.tracks[this.sel.track]; };
  Daw.prototype.clip = function () { var tr = this.track(); return tr && this.sel.clip >= 0 ? tr.clips[this.sel.clip] : null; };

  Daw.prototype.build = function () {
    var self = this, n = this.node, d = n.dataset; n.innerHTML = ''; n.tabIndex = 0; n.setAttribute('role', 'application'); n.setAttribute('aria-label', 'A small DAW');
    // transport
    var tb = this.tb = el('div', 'mdaw-transport'); n.appendChild(tb);
    this.bHome = btn('⏮', 'Back to the start (Enter)'); this.bPlay = btn('▶ Play', 'Play / stop (Space)', 'mdaw-play'); this.bRec = btn('● Rec', 'Record into the selected track (R)', 'mdaw-rec');
    this.bLoop = btn('⟲ Loop', 'Loop (cycle) the bracket on the ruler (L)'); this.bClick = btn('♩ Click', 'Metronome (C)');
    this.posEl = el('span', 'mdaw-pos', '1.1.1'); this.posEl.title = 'Bar . beat . sixteenth';
    var tl = el('label', 'mdaw-lbl', 'Tempo '); this.tempoIn = el('input'); this.tempoIn.type = 'number'; this.tempoIn.min = 40; this.tempoIn.max = 220; this.tempoIn.setAttribute('aria-label', 'Tempo in BPM'); tl.appendChild(this.tempoIn); tl.appendChild(document.createTextNode(' BPM'));
    this.bUndo = btn('↶', 'Undo (Ctrl/Cmd+Z)'); this.bRedo = btn('↷', 'Redo (Ctrl/Cmd+Shift+Z)');
    this.bMon = btn('🎧 Monitor', 'Hear the microphone through the track as you record (use headphones!)');
    this.inMeter = el('span', 'mdaw-in'); this.inMeter.title = 'Microphone level'; this.inFill = el('span', 'mdaw-infill'); this.inMeter.appendChild(this.inFill); this.inMeter.hidden = true;
    this.bKeys = btn('⌨ Keys', 'Play the selected track from the computer keyboard (A W S E D …)');
    [this.bHome, this.bPlay].forEach(function (b) { tb.appendChild(b); }); if (this.show.record) tb.appendChild(this.bRec);
    [this.bLoop, this.bClick, this.posEl, tl, this.bKeys, this.bMon, this.inMeter, this.bUndo, this.bRedo].forEach(function (b) { tb.appendChild(b); });
    this.statusEl = el('span', 'mdaw-status'); this.statusEl.setAttribute('aria-live', 'polite'); tb.appendChild(this.statusEl);
    if (!this.show.transport) { [this.bLoop, this.bClick, tl, this.bKeys, this.bUndo, this.bRedo].forEach(function (b) { b.hidden = true; }); }
    this.bHome.onclick = function () { self.locate(0); }; this.bPlay.onclick = function () { self.toggle(); };
    this.bRec.onclick = function () { self.record(); };
    this.bLoop.onclick = function () { self.change(function () { self.p.loop.on = !self.p.loop.on; }); };
    this.bClick.onclick = function () { self.change(function () { self.p.click = !self.p.click; }); };
    this.bKeys.onclick = function () { self.keysOn = !self.keysOn; self.renderTransport(); self.node.focus(); };
    this.bMon.onclick = function () { self.monitor(!self.monOn); };
    this.bUndo.onclick = function () { self.doUndo(true); }; this.bRedo.onclick = function () { self.doUndo(false); };
    this.tempoIn.onchange = function () { var v = clamp(+self.tempoIn.value || 100, 40, 220); self.change(function () { self.p.tempo = v; }); if (self.playing) self.reanchor(); };

    // arrangement
    var arr = this.arr = el('div', 'mdaw-arr'); n.appendChild(arr); if (!this.show.tracks) arr.hidden = true;
    var tools = el('div', 'mdaw-tools'); arr.appendChild(tools);
    var addSel = el('select'); addSel.setAttribute('aria-label', 'Instrument for a new track'); INSTS.forEach(function (i) { var o = el('option', null, i.label); o.value = i.id; addSel.appendChild(o); });
    var bAdd = btn('+ Track', 'Add a track with this instrument'); bAdd.onclick = function () { var inst = instOf(addSel.value);
      self.change(function () { self.p.tracks.push(track(inst.label, inst.id)); self.sel = { track: self.p.tracks.length - 1, clip: -1, notes: [] }; }); };
    var bNew = btn('+ Clip', 'New empty one-bar clip on the selected track, at the playhead'); bNew.onclick = function () { self.newClip(self.sel.track, Math.floor(self.pos / 4) * 4); };
    var bDup = btn('Duplicate', 'Duplicate the clip after itself (Ctrl/Cmd+D)'); bDup.onclick = function () { self.duplicate(); };
    var bSplit = btn('Split', 'Split the clip at the playhead'); bSplit.onclick = function () { self.split(); };
    var bDel = btn('Delete', 'Delete the selected clip (Delete)'); bDel.onclick = function () { self.deleteSel(); };
    var bLen = el('label', 'mdaw-lbl', 'Song '); this.barsIn = el('input'); this.barsIn.type = 'number'; this.barsIn.min = 1; this.barsIn.max = 64; this.barsIn.setAttribute('aria-label', 'Song length in bars'); bLen.appendChild(this.barsIn); bLen.appendChild(document.createTextNode(' bars'));
    this.barsIn.onchange = function () { var v = clamp(+self.barsIn.value || 8, 1, 64); self.change(function () { self.p.bars = v; }); };
    [addSel, bAdd, bNew, bDup, bSplit, bDel, bLen].forEach(function (x) { tools.appendChild(x); });
    var grid = this.gridEl = el('div', 'mdaw-grid'); arr.appendChild(grid);
    arr.appendChild(el('p', 'mdaw-hint', 'Click a clip to select it, drag it to move it, drag its right edge to make it longer. Double-click an empty lane for a new clip. Drag along the ruler to set the loop; click it to move the playhead.'));

    // editor
    var ed = this.ed = el('div', 'mdaw-editor'); n.appendChild(ed); if (!this.show.editor) ed.hidden = true;
    var et = this.edTools = el('div', 'mdaw-tools'); ed.appendChild(et);
    this.edTitle = el('span', 'mdaw-edtitle'); et.appendChild(this.edTitle);
    var gl = el('label', 'mdaw-lbl', 'Grid '); this.gridSel = el('select'); [['1', '1/4'], ['0.5', '1/8'], ['0.25', '1/16'], ['0.333333', '1/8 triplet']].forEach(function (g) { var o = el('option', null, g[1]); o.value = g[0]; self.gridSel.appendChild(o); });
    this.gridSel.value = '0.25'; this.gridSel.onchange = function () { self.grid = +self.gridSel.value; self.renderEditor(); }; gl.appendChild(this.gridSel);
    var bQ = btn('Quantize', 'Move the notes (selected, else all) onto the grid (Q)'); bQ.onclick = function () { self.quantize(1); };
    var bQ50 = btn('Quantize 50%', 'Move them half way to the grid'); bQ50.onclick = function () { self.quantize(0.5); };
    var bUp = btn('+1', 'Transpose up a semitone'), bDn = btn('−1', 'Transpose down a semitone'), bO = btn('+12', 'Up an octave'), bOd = btn('−12', 'Down an octave');
    bUp.onclick = function () { self.transpose(1); }; bDn.onclick = function () { self.transpose(-1); }; bO.onclick = function () { self.transpose(12); }; bOd.onclick = function () { self.transpose(-12); };
    var vl = el('label', 'mdaw-lbl', 'Velocity '); this.velIn = el('input'); this.velIn.type = 'range'; this.velIn.min = 1; this.velIn.max = 127; this.velIn.value = 96; vl.appendChild(this.velIn);
    this.velOut = el('output', 'mdaw-num', '96'); vl.appendChild(this.velOut);
    this.velIn.oninput = function () { self.velOut.textContent = self.velIn.value; var c = self.clip(); if (c && self.sel.notes.length) { var v = +self.velIn.value / 127; self.sel.notes.forEach(function (i) { if (c.notes[i]) c.notes[i].v = v; }); self.save(); self.renderEditor(); } };
    this.velIn.onchange = function () { self.undo.push(JSON.stringify(self.p)); };
    var cl = el('label', 'mdaw-lbl', 'Clip '); this.clipLen = el('input'); this.clipLen.type = 'number'; this.clipLen.min = 1; this.clipLen.max = 32; this.clipLen.setAttribute('aria-label', 'Clip length in bars'); cl.appendChild(this.clipLen); cl.appendChild(document.createTextNode(' bars'));
    this.clipLen.onchange = function () { var c = self.clip(); if (!c) return; var v = clamp(+self.clipLen.value || 1, 1, 32); self.change(function () { c.len = v * 4; }); };
    [gl, bQ, bQ50, bDn, bUp, bOd, bO, vl, cl].forEach(function (x) { et.appendChild(x); });
    this.midiTools = [gl, bQ, bQ50, vl];
    this.transposeBtns = [bUp, bDn, bO, bOd];
    this.roll = el('div', 'mdaw-roll'); ed.appendChild(this.roll);
    this.edHint = el('p', 'mdaw-hint'); ed.appendChild(this.edHint);

    // mixer
    var mx = this.mx = el('div', 'mdaw-mixer'); n.appendChild(mx); if (!this.show.mixer) mx.hidden = true;

    // band
    if (this.show.band) {
      var bd = el('div', 'mdaw-band'); n.appendChild(bd);
      bd.appendChild(el('div', 'mdaw-sub', 'Session players: the band writes the parts'));
      var row = el('div', 'mdaw-tools'); bd.appendChild(row);
      var chl = el('label', 'mdaw-lbl mdaw-wide', 'Chords '); this.chartIn = el('input'); this.chartIn.type = 'text'; this.chartIn.value = d.chart || 'C | Am | F | G'; this.chartIn.setAttribute('aria-label', 'Chords, bars split by |'); chl.appendChild(this.chartIn);
      var sl = el('label', 'mdaw-lbl', 'Style '); this.styleSel = el('select'); this.styleSel.setAttribute('aria-label', 'Style');
      var groups = {}; ((global.BandCatalog && global.BandCatalog.styles) || []).forEach(function (s) {
        var g = groups[s.group]; if (!g) { g = groups[s.group] = el('optgroup'); g.label = s.group; self.styleSel.appendChild(g); }
        var o = el('option', null, s.label); o.value = s.id; g.appendChild(o); });
      this.styleSel.value = d.style || 'rock'; sl.appendChild(this.styleSel);
      var tml = el('label', 'mdaw-lbl', 'Times '); this.timesIn = el('input'); this.timesIn.type = 'number'; this.timesIn.min = 1; this.timesIn.max = 8; this.timesIn.value = 2; this.timesIn.setAttribute('aria-label', 'Times through the chords'); tml.appendChild(this.timesIn);
      var bGo = btn('Write the parts', 'Make drum, bass and chord clips at the playhead', 'btn-primary'); bGo.onclick = function () { self.bandWrite(); };
      [chl, sl, tml, bGo].forEach(function (x) { row.appendChild(x); });
    }
    // files
    if (this.show.files) {
      var fl = el('div', 'mdaw-tools mdaw-files'); n.appendChild(fl);
      var bMid = btn('Export MIDI', 'Save the clips as a .mid file to open in another DAW'), bWav = btn('Bounce to WAV', 'Render the song to an audio file'),
        bSave = btn('Save project', 'Save to a .json file'), bOpen = btn('Open project', 'Open a .json file saved here'), bReset = btn('Reset', 'Back to how this DAW started');
      bMid.onclick = function () { download(new Blob([toMidi(self.p)], { type: 'audio/midi' }), 'mini-daw.mid'); self.say('MIDI file saved.'); };
      bWav.onclick = function () { self.bounce(); };
      bSave.onclick = function () { download(new Blob([JSON.stringify({ kind: 'mini-daw', version: 1, project: self.p }, null, 1)], { type: 'application/json' }), 'mini-daw.json'); };
      var file = el('input'); file.type = 'file'; file.accept = '.json'; file.hidden = true; fl.appendChild(file);
      bOpen.onclick = function () { file.click(); };
      file.onchange = function () { var f = file.files[0]; if (!f) return; f.text().then(function (t) { var j = JSON.parse(t); if (!j || j.kind !== 'mini-daw') throw new Error('not a Mini DAW project');
        self.change(function () { self.p = j.project; self.fixSel(); }); self.loadTakes(); self.say('Opened ' + f.name); }).catch(function (e) { self.say('Could not open: ' + e.message); }); file.value = ''; };
      bReset.onclick = function () { if (!confirm('Throw away your changes to this DAW?')) return; self.stop(); self.change(function () { self.p = self.fresh(); self.sel = { track: 0, clip: self.p.tracks[0] && self.p.tracks[0].clips.length ? 0 : -1, notes: [] }; }); };
      [bMid, bWav, bSave, bOpen, bReset].forEach(function (x) { fl.appendChild(x); });
    }
    n.addEventListener('keydown', function (e) { self.key(e, true); });
    n.addEventListener('keyup', function (e) { self.key(e, false); });
  };

  // ---------------- drawing ----------------
  Daw.prototype.renderAll = function () { this.renderTransport(); this.renderTracks(); this.renderEditor(); this.renderMixer(); this.applyMix(); };
  Daw.prototype.renderTransport = function () {
    var p = this.p; this.tempoIn.value = p.tempo; this.barsIn.value = p.bars;
    this.bLoop.classList.toggle('mdaw-on', !!p.loop.on); this.bLoop.setAttribute('aria-pressed', String(!!p.loop.on));
    this.bClick.classList.toggle('mdaw-on', !!p.click); this.bClick.setAttribute('aria-pressed', String(!!p.click));
    this.bKeys.classList.toggle('mdaw-on', this.keysOn); this.bKeys.setAttribute('aria-pressed', String(this.keysOn));
    this.bPlay.textContent = this.playing ? '■ Stop' : '▶ Play'; this.bPlay.classList.toggle('mdaw-on', this.playing);
    this.bRec.classList.toggle('mdaw-recon', this.recording);
    var tr = this.track(), au = !!(tr && isAudio(tr)); this.bMon.hidden = !au; this.bKeys.hidden = au || !this.show.transport;
    this.bMon.classList.toggle('mdaw-on', !!this.monOn); this.bMon.setAttribute('aria-pressed', String(!!this.monOn)); this.inMeter.hidden = !this.mic;
  };
  Daw.prototype.beatW = function () { return 26; };   // pixels a beat in the arrangement
  Daw.prototype.renderTracks = function () {
    var self = this, p = this.p, g = this.gridEl, W = this.beatW(), total = p.bars * 4; g.innerHTML = '';
    g.style.setProperty('--mdaw-w', (total * W) + 'px');
    // ruler
    var head = el('div', 'mdaw-row mdaw-rulerrow'); head.appendChild(el('div', 'mdaw-th mdaw-corner', 'Tracks'));
    var ruler = el('div', 'mdaw-lane mdaw-ruler'); ruler.style.width = (total * W) + 'px';
    for (var b = 0; b < p.bars; b++) { var m = el('span', 'mdaw-bar', String(b + 1)); m.style.left = (b * 4 * W) + 'px'; ruler.appendChild(m); }
    var lp = el('div', 'mdaw-loop' + (p.loop.on ? ' mdaw-loopon' : '')); lp.style.left = (p.loop.from * 4 * W) + 'px'; lp.style.width = ((p.loop.to - p.loop.from) * 4 * W) + 'px'; lp.title = 'Loop: bars ' + (p.loop.from + 1) + '–' + p.loop.to; ruler.appendChild(lp);
    head.appendChild(ruler); g.appendChild(head);
    ruler.addEventListener('pointerdown', function (e) {
      var r = ruler.getBoundingClientRect(), x0 = e.clientX - r.left, b0 = Math.floor(x0 / (4 * W)), moved = false;
      function mv(ev) { var b1 = Math.floor((ev.clientX - r.left) / (4 * W)); if (b1 !== b0 || moved) { moved = true; var a = clamp(Math.min(b0, b1), 0, p.bars - 1), z = clamp(Math.max(b0, b1) + 1, 1, p.bars); p.loop = { on: true, from: a, to: z }; lp.className = 'mdaw-loop mdaw-loopon'; lp.style.left = (a * 4 * W) + 'px'; lp.style.width = ((z - a) * 4 * W) + 'px'; } }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
        if (moved) { self.change(function () {}); self.say('Loop: bars ' + (p.loop.from + 1) + ' to ' + p.loop.to + '.'); } else self.locate(clamp(Math.round(x0 / W), 0, total)); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    p.tracks.forEach(function (tr, ti) {
      var row = el('div', 'mdaw-row' + (ti === self.sel.track ? ' mdaw-selrow' : '')), th = el('div', 'mdaw-th'), col = COLORS[ti % COLORS.length];
      th.style.borderLeftColor = col;
      var name = el('input', 'mdaw-name'); name.value = tr.name; name.setAttribute('aria-label', 'Track name'); name.onchange = function () { self.change(function () { tr.name = name.value || instOf(tr.inst).label; }); };
      name.onfocus = function () { if (self.sel.track !== ti) { self.sel = { track: ti, clip: tr.clips.length ? 0 : -1, notes: [] }; self.renderEditor(); self.markRows(); } };
      var isel = el('select', 'mdaw-inst'); isel.setAttribute('aria-label', 'Instrument'); INSTS.forEach(function (i) { if (kind(i) !== kind(tr)) return; var o = el('option', null, i.label); o.value = i.id; isel.appendChild(o); }); isel.value = tr.inst;
      isel.onchange = function () { self.change(function () { tr.inst = isel.value; }); self.load(); };
      var mb = btn('M', 'Mute ' + tr.name, 'mdaw-ms' + (tr.mute ? ' mdaw-mute' : '')), sb = btn('S', 'Solo ' + tr.name, 'mdaw-ms' + (tr.solo ? ' mdaw-solo' : '')), xb = btn('×', 'Delete track ' + tr.name, 'mdaw-ms');
      mb.onclick = function () { self.change(function () { tr.mute = !tr.mute; }); }; sb.onclick = function () { self.change(function () { tr.solo = !tr.solo; }); };
      xb.onclick = function () { if (tr.clips.length && !confirm('Delete the track ' + tr.name + ' and its clips?')) return; self.change(function () { p.tracks.splice(ti, 1); self.fixSel(); }); };
      var line = el('div', 'mdaw-thline'); line.appendChild(mb); line.appendChild(sb); line.appendChild(isel); line.appendChild(xb);
      th.appendChild(name); th.appendChild(line); row.appendChild(th);
      var lane = el('div', 'mdaw-lane'); lane.style.width = (total * W) + 'px'; lane.dataset.track = ti;
      lane.addEventListener('dblclick', function (e) { if (e.target !== lane) return; var r = lane.getBoundingClientRect(); self.newClip(ti, Math.floor((e.clientX - r.left) / (4 * W)) * 4); });
      lane.addEventListener('pointerdown', function (e) { if (e.target === lane) { self.sel = { track: ti, clip: -1, notes: [] }; self.markRows(); self.renderEditor(); self.renderTracks(); } });
      tr.clips.forEach(function (c, ci) { lane.appendChild(self.clipEl(tr, ti, c, ci, col)); });
      row.appendChild(lane); g.appendChild(row);
    });
    if (!p.tracks.length) g.appendChild(el('p', 'mdaw-hint', 'No tracks yet: add one above' + (this.show.band ? ', or let the band write some below.' : '.')));
    this.head = el('div', 'mdaw-head'); this.head.style.left = (196 + this.pos * W) + 'px'; g.appendChild(this.head);
  };
  Daw.prototype.markRows = function () { var s = this.sel.track; Array.prototype.forEach.call(this.gridEl.querySelectorAll('.mdaw-row:not(.mdaw-rulerrow)'), function (r, i) { r.classList.toggle('mdaw-selrow', i === s); }); };
  Daw.prototype.clipEl = function (tr, ti, c, ci, col) {
    var self = this, W = this.beatW(), e = el('div', 'mdaw-clip' + (ti === this.sel.track && ci === this.sel.clip ? ' mdaw-selclip' : ''));
    e.style.left = (c.start * W) + 'px'; e.style.width = Math.max(6, c.len * W - 2) + 'px'; e.style.background = col; e.tabIndex = -1;
    e.title = tr.name + ': bar ' + (c.start / 4 + 1) + ', ' + (c.len / 4) + ' bar' + (c.len === 4 ? '' : 's') + ', ' + c.notes.length + ' notes';
    // the notes drawn small inside the clip
    var mini = el('canvas', 'mdaw-mini'); mini.width = Math.max(6, c.len * W - 2); mini.height = 34; e.appendChild(mini);
    var cx = mini.getContext('2d'); cx.fillStyle = 'rgba(255,255,255,.85)';
    if (isAudio(tr)) { this.wave(cx, c, W, 34); }
    var drum = isDrum(tr), rows = rowsOf(tr), ms = c.notes.filter(function (n) { return !drum; }).map(function (n) { return n.m; }), lo = Math.min.apply(null, ms.concat([200])), hi = Math.max.apply(null, ms.concat([0]));
    c.notes.forEach(function (n) { if (n.t >= c.len) return; var y;
      if (drum) { var k = rows.map(function (r) { return r[0]; }).indexOf(n.m); y = 2 + (k < 0 ? rows.length - 1 : k) * (30 / rows.length); cx.fillRect(n.t * W, y, 2, 3); }
      else { y = hi === lo ? 15 : 30 - (n.m - lo) / (hi - lo) * 28; cx.fillRect(n.t * W, y, Math.max(2, n.d * W - 1), 2); } });
    var grip = el('div', 'mdaw-grip'); grip.title = 'Drag to change the clip\'s length'; e.appendChild(grip);
    e.addEventListener('pointerdown', function (ev) {
      ev.stopPropagation(); self.sel = { track: ti, clip: ci, notes: [] }; self.node.focus({ preventScroll: true });
      var resize = ev.target === grip, x0 = ev.clientX, start0 = c.start, len0 = c.len, lanes = self.gridEl.querySelectorAll('.mdaw-lane[data-track]'), moved = false, toTrack = ti, snap = ev.altKey ? 1 : 4;
      var before = JSON.stringify(self.p);
      function mv(m) { var db = Math.round((m.clientX - x0) / W / snap) * snap; if (db) moved = true;
        if (resize) { c.len = Math.max(1, len0 + db); e.style.width = Math.max(6, c.len * W - 2) + 'px'; }
        else { c.start = clamp(start0 + db, 0, self.p.bars * 4 - 1); e.style.left = (c.start * W) + 'px';
          for (var i = 0; i < lanes.length; i++) { var r = lanes[i].getBoundingClientRect(); if (m.clientY >= r.top && m.clientY < r.bottom) toTrack = +lanes[i].dataset.track; } } }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
        if (moved || toTrack !== ti) { self.undo.push(before); self.redo = [];
          if (toTrack !== ti && kind(self.p.tracks[toTrack]) === kind(tr)) { tr.clips.splice(ci, 1); self.p.tracks[toTrack].clips.push(c); self.sel = { track: toTrack, clip: self.p.tracks[toTrack].clips.length - 1, notes: [] }; }
          else if (toTrack !== ti) self.say('A clip can only move to a track of its kind: drums, notes or audio.');
          self.save(); }
        self.renderTracks(); self.renderEditor(); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    e.addEventListener('dblclick', function (ev) { ev.stopPropagation(); if (self.ed.hidden) return; self.ed.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    return e;
  };

  Daw.prototype.renderEditor = function () {
    var self = this, tr = this.track(), c = this.clip(), roll = this.roll; roll.innerHTML = '';
    this.renderTransport();
    this.transposeBtns.forEach(function (b) { b.hidden = !tr || isDrum(tr) || isAudio(tr); });
    this.midiTools.forEach(function (b) { b.hidden = !!(tr && isAudio(tr)); });
    if (tr && c && isAudio(tr)) { this.clipLen.value = Math.round(c.len / 4 * 100) / 100; return this.audioEditor(tr, c); }
    if (!tr || !c) { this.edTitle.textContent = 'Editor'; this.clipLen.value = ''; roll.appendChild(el('p', 'mdaw-hint', tr ? 'Select a clip on ' + tr.name + ', or double-click its lane for a new one.' : 'Select a clip.')); this.edHint.textContent = ''; return; }
    this.clipLen.value = Math.round(c.len / 4 * 100) / 100;
    var drum = isDrum(tr), G = this.grid, cols = Math.round(c.len / G), cw = G >= 1 ? 40 : G >= 0.5 ? 26 : 20, rh = drum ? 20 : 13;
    this.edTitle.textContent = (drum ? 'Step sequencer' : 'Piano roll') + ': ' + tr.name + ', bar ' + (c.start / 4 + 1);
    this.edHint.textContent = drum ? 'Click a square to put a hit there or take it away. Shift+click makes it an accent, Alt+click a ghost note. Brightness is velocity.'
      : 'Click an empty spot to write a note one grid step long; drag a note to move it, drag its right end to make it longer; Shift+click selects several; Delete removes; double-click a note to delete it. The bars under the notes are velocities: drag them.';
    var rows = drum ? rowsOf(tr).map(function (r) { return { key: r[0], label: r[1] }; }) : (function () {
      var ms = c.notes.map(function (n) { return n.m; }), base = /bass/.test(tr.inst) ? [28, 60] : [48, 84];
      var lo = Math.min.apply(null, ms.concat([base[0]])), hi = Math.max.apply(null, ms.concat([base[1]])), out = [];
      for (var m = hi; m >= lo; m--) out.push({ key: m, label: noteName(m), black: [1, 3, 6, 8, 10].indexOf(((m % 12) + 12) % 12) >= 0 }); return out; })();
    var wrap = el('div', 'mdaw-rollwrap'), labels = el('div', 'mdaw-keys'), cv = el('canvas', 'mdaw-cv'), H = rows.length * rh, Wd = cols * cw, VH = drum ? 0 : 50;
    rows.forEach(function (r) { var k = el('div', 'mdaw-key' + (r.black ? ' mdaw-black' : ''), r.label); k.style.height = rh + 'px';
      k.onclick = function () { self.audition(tr, r.key); }; labels.appendChild(k); });
    if (!drum) { var vk = el('div', 'mdaw-key mdaw-vlab', 'Velocity'); vk.style.height = VH + 'px'; labels.appendChild(vk); }
    var dpr = global.devicePixelRatio || 1; cv.width = Wd * dpr; cv.height = (H + VH) * dpr; cv.style.width = Wd + 'px'; cv.style.height = (H + VH) + 'px';
    var scroller = el('div', 'mdaw-rollscroll'); scroller.appendChild(cv); wrap.appendChild(labels); wrap.appendChild(scroller); roll.appendChild(wrap);
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var css = getComputedStyle(this.node), ink = css.getPropertyValue('--site-ink').trim() || '#222', line = css.getPropertyValue('--site-border').trim() || '#ccc', acc = css.getPropertyValue('--site-accent-dk').trim() || '#a33';
    var bpx = cw / G;   // pixels a beat
    function rowOf(n) { for (var i = 0; i < rows.length; i++) if (rows[i].key === n.m) return i; return -1; }
    function draw() {
      x.clearRect(0, 0, Wd, H + VH);
      rows.forEach(function (r, i) { if (r.black) { x.fillStyle = 'rgba(128,128,128,.12)'; x.fillRect(0, i * rh, Wd, rh); } });
      for (var k = 0; k <= cols; k++) { var bt = k * G, bar = Math.abs(bt / 4 - Math.round(bt / 4)) < 1e-6, beat = Math.abs(bt - Math.round(bt)) < 1e-6;
        x.fillStyle = bar ? ink : line; x.globalAlpha = bar ? 0.6 : beat ? 0.7 : 0.35; x.fillRect(Math.round(k * cw), 0, 1, H + VH); }
      x.globalAlpha = 0.25; x.fillStyle = line; rows.forEach(function (r, i) { x.fillRect(0, i * rh, Wd, 1); }); x.globalAlpha = 1;
      c.notes.forEach(function (n, i) { var ri = rowOf(n); if (ri < 0 || n.t >= c.len) return; var sel = self.sel.notes.indexOf(i) >= 0;
        x.fillStyle = sel ? acc : COLORS[self.sel.track % COLORS.length]; x.globalAlpha = 0.35 + 0.65 * n.v;
        if (drum) x.fillRect(n.t * bpx + 2, ri * rh + 2, cw - 4, rh - 4);
        else { x.fillRect(n.t * bpx + 1, ri * rh + 1, Math.max(3, Math.min(n.d, c.len - n.t) * bpx - 2), rh - 2); x.globalAlpha = 1; x.fillStyle = sel ? acc : ink; x.fillRect(n.t * bpx + 1, H + VH - n.v * (VH - 6), 3, n.v * (VH - 6)); }
        x.globalAlpha = 1; });
      if (!drum) { x.fillStyle = line; x.fillRect(0, H, Wd, 1); }
    }
    draw(); this.redrawRoll = draw;
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, before = JSON.stringify(self.p), changed = false;
      self.node.focus({ preventScroll: true });
      if (!drum && py > H) {    // velocity lane
        function setV(ev) { var qx = ev.clientX - r.left, v = clamp((H + VH - (ev.clientY - r.top)) / (VH - 6), 0.05, 1), hit = false;
          c.notes.forEach(function (n, i) { if (Math.abs(n.t * bpx - qx) < 5 && (!self.sel.notes.length || self.sel.notes.indexOf(i) >= 0 || !hit)) { n.v = v; hit = changed = true; } }); draw(); }
        setV(e); var upV = function () { document.removeEventListener('pointermove', setV); document.removeEventListener('pointerup', upV); if (changed) { self.undo.push(before); self.redo = []; self.save(); self.renderTracks(); } };
        document.addEventListener('pointermove', setV); document.addEventListener('pointerup', upV); return;
      }
      var ri = Math.floor(py / rh), row = rows[ri]; if (!row) return; var t = px / bpx;
      var hitI = -1; c.notes.forEach(function (n, i) { if (n.m === row.key && n.t <= t + (drum ? G / 2 : 0) && t < n.t + (drum ? G / 2 + 0.01 : Math.max(n.d, G * 0.5))) hitI = i; });
      if (drum) {
        var cell = Math.floor(t / G) * G;
        if (hitI < 0) { hitI = -1; c.notes.forEach(function (n, i) { if (n.m === row.key && Math.abs(n.t - cell) < G / 2) hitI = i; }); }
        self.undo.push(before); self.redo = [];
        if (e.shiftKey || e.altKey) { var v = e.shiftKey ? 1 : 0.35; if (hitI >= 0) c.notes[hitI].v = v; else c.notes.push({ t: cell, d: G, m: row.key, v: v }); }
        else if (hitI >= 0) c.notes.splice(hitI, 1); else { c.notes.push({ t: cell, d: G, m: row.key, v: +self.velIn.value / 127 }); self.audition(tr, row.key); }
        self.save(); draw(); self.renderTracks(); return;
      }
      if (hitI < 0) {   // write a note
        var st = Math.floor(t / G) * G; if (st >= c.len) return;
        c.notes.push({ t: st, d: G, m: row.key, v: +self.velIn.value / 127 }); hitI = c.notes.length - 1; self.sel.notes = [hitI]; changed = true; self.audition(tr, row.key);
      } else if (e.shiftKey) { var k = self.sel.notes.indexOf(hitI); if (k >= 0) self.sel.notes.splice(k, 1); else self.sel.notes.push(hitI); draw(); return; }
      else if (self.sel.notes.indexOf(hitI) < 0) self.sel.notes = [hitI];
      var n0 = c.notes[hitI], resize = !changed && px > (n0.t + n0.d) * bpx - 6, orig = self.sel.notes.map(function (i) { return { i: i, t: c.notes[i].t, m: c.notes[i].m, d: c.notes[i].d }; });
      self.velIn.value = Math.round(n0.v * 127); self.velOut.textContent = self.velIn.value; draw();
      function mv(ev) { var dt = Math.round(((ev.clientX - r.left) - px) / bpx / G) * G, dr = Math.round(((ev.clientY - r.top) - py) / rh);
        if (dt || dr) changed = true;
        orig.forEach(function (o) { var n = c.notes[o.i]; if (resize) n.d = Math.max(G, o.d + dt); else { n.t = clamp(o.t + dt, 0, c.len - G); var ni = rows.map(function (q) { return q.key; }).indexOf(o.m) + dr; n.m = rows[clamp(ni, 0, rows.length - 1)].key; } });
        draw(); }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (changed) { self.undo.push(before); self.redo = []; self.save(); self.renderTracks(); } }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    cv.addEventListener('dblclick', function (e) { if (drum) return; var r = cv.getBoundingClientRect(), ri = Math.floor((e.clientY - r.top) / rh), row = rows[ri], t = (e.clientX - r.left) / bpx; if (!row) return;
      var i = -1; c.notes.forEach(function (n, k) { if (n.m === row.key && n.t <= t && t < n.t + n.d) i = k; }); if (i < 0) return;
      self.change(function () { c.notes.splice(i, 1); self.sel.notes = []; }); });
    // scroll the roll so the notes are in view
    if (!drum) { var top = Infinity; c.notes.forEach(function (n) { var ri = rowOf(n); if (ri >= 0) top = Math.min(top, ri); }); scroller.scrollTop = 0; wrap.scrollTop = isFinite(top) ? Math.max(0, top * rh - 40) : Math.max(0, (rows.length / 2) * rh - 100); }
  };

  Daw.prototype.renderMixer = function () {
    var self = this, mx = this.mx; mx.innerHTML = ''; this.meterEls = [];
    mx.appendChild(el('div', 'mdaw-sub', 'Mixer'));
    var row = el('div', 'mdaw-strips'); mx.appendChild(row);
    function strip(name, obj, ti, color) {
      var s = el('div', 'mdaw-strip'); if (color) s.style.borderTopColor = color;
      s.appendChild(el('div', 'mdaw-sname', name));
      if (ti >= 0) { var pl = el('label', 'mdaw-pan'); pl.appendChild(el('span', null, 'Pan'));
        var pan = el('input'); pan.type = 'range'; pan.min = -100; pan.max = 100; pan.value = Math.round(obj.pan * 100); pan.setAttribute('aria-label', 'Pan ' + name);
        var po = el('output', 'mdaw-num', panTxt(obj.pan)); pan.oninput = function () { obj.pan = +pan.value / 100; po.textContent = panTxt(obj.pan); self.applyMix(); };
        pan.onchange = function () { self.undo.push(JSON.stringify(self.p)); self.save(); }; pan.ondblclick = function () { pan.value = 0; pan.oninput(); pan.onchange(); };
        pl.appendChild(pan); pl.appendChild(po); s.appendChild(pl); }
      var mid = el('div', 'mdaw-fadwrap'), fad = el('input', 'mdaw-fader'); fad.type = 'range'; fad.min = -60; fad.max = 6; fad.step = 0.5; fad.value = obj.vol; fad.setAttribute('aria-label', 'Volume ' + name);
      var meter = el('div', 'mdaw-meter'), fill = el('div', 'mdaw-mfill'), peak = el('div', 'mdaw-mpeak'); meter.appendChild(fill); meter.appendChild(peak); mid.appendChild(fad); mid.appendChild(meter); s.appendChild(mid);
      var fo = el('output', 'mdaw-num', dbTxt(obj.vol)); s.appendChild(fo);
      fad.oninput = function () { obj.vol = +fad.value; fo.textContent = dbTxt(obj.vol); self.applyMix(); };
      fad.onchange = function () { self.undo.push(JSON.stringify(self.p)); self.save(); }; fad.ondblclick = function () { fad.value = 0; fad.oninput(); fad.onchange(); };
      if (ti >= 0) { var ms = el('div', 'mdaw-thline'), mb = btn('M', 'Mute ' + name, 'mdaw-ms' + (obj.mute ? ' mdaw-mute' : '')), sb = btn('S', 'Solo ' + name, 'mdaw-ms' + (obj.solo ? ' mdaw-solo' : ''));
        mb.onclick = function () { self.change(function () { obj.mute = !obj.mute; }); }; sb.onclick = function () { self.change(function () { obj.solo = !obj.solo; }); };
        ms.appendChild(mb); ms.appendChild(sb); s.appendChild(ms); }
      var clipLed = el('div', 'mdaw-clipled', 'CLIP'); clipLed.title = 'Lit when the level reached 0 dBFS. Click to reset.'; clipLed.onclick = function () { clipLed.classList.remove('mdaw-over'); }; s.appendChild(clipLed);
      self.meterEls.push({ ti: ti, fill: fill, peak: peak, led: clipLed, hold: 0 });
      row.appendChild(s);
    }
    this.p.tracks.forEach(function (tr, ti) { strip(tr.name, tr, ti, COLORS[ti % COLORS.length]); });
    if (this.p.master == null) this.p.master = { vol: 0 };
    strip('Master', this.p.master, -1, null);
    mx.appendChild(el('p', 'mdaw-hint', 'Faders are in dB: 0 is as the instrument comes, −6 about half as loud to the ear… roughly. Double-click a fader or pan to put it back. The meters show the peak level; the master must stay out of the red CLIP.'));
  };
  function dbTxt(v) { return v <= -60 ? '−∞ dB' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + ' dB'; }
  function panTxt(p) { return Math.abs(p) < 0.01 ? 'C' : (p < 0 ? 'L' : 'R') + Math.round(Math.abs(p) * 100); }

  // ---------------- sound ----------------
  Daw.prototype.ensureAudio = function () {
    var ctx = audio(), self = this;
    if (!this.master) { this.master = ctx.createGain(); this.masterMeter = ctx.createAnalyser(); this.masterMeter.fftSize = 1024; this.master.connect(this.masterMeter); this.masterMeter.connect(ctx.destination);
      if (global.AudioTap && global.AudioTap.register) try { global.AudioTap.register(ctx, this.master, 'Mini DAW'); } catch (e) {}
      this.buf = new Float32Array(1024); this.meterLoop(); }
    while (this.strips.length < this.p.tracks.length) this.strips.push(makeStrip(ctx, this.master));
    this.applyMix(); return ctx;
  };
  Daw.prototype.applyMix = function () {
    if (!this.master) return; var anySolo = this.p.tracks.some(function (t) { return t.solo; }), self = this, now = AC.currentTime;
    this.p.tracks.forEach(function (tr, i) { var s = self.strips[i]; if (!s) return; var on = !tr.mute && (!anySolo || tr.solo);
      s.fader.gain.setTargetAtTime(on ? dbToGain(tr.vol) : 0, now, 0.01); if (s.pan.pan) s.pan.pan.setTargetAtTime(tr.pan, now, 0.01); });
    this.master.gain.setTargetAtTime(dbToGain((this.p.master || { vol: 0 }).vol), now, 0.01);
  };
  Daw.prototype.load = function () {
    if (!bank) return Promise.resolve();   // (nothing to load into until the first sound)
    var self = this, want = {}; this.p.tracks.forEach(function (t) { if (!isAudio(t)) want[t.inst] = 1; }); var list = Object.keys(want).filter(function (i) { return !bank.has(i); });
    if (!list.length) return Promise.resolve();
    this.say('Loading sounds…');
    return bank.load(list, function (d, t) { if (t) self.say('Loading sounds… ' + Math.round(100 * d / t) + '%'); }).then(function () { self.say(''); });
  };
  Daw.prototype.audition = function (tr, key) {
    this.ensureAudio(); var self = this, i = this.p.tracks.indexOf(tr), dest = this.strips[i] ? this.strips[i].input : this.master;
    this.load().then(function () { playNote(bank, tr, { m: key, v: +self.velIn.value / 127 }, AC.currentTime + 0.01, 0.4, dest); });
  };

  // the transport: a clock in beats, scheduled a little ahead
  Daw.prototype.secPerBeat = function () { return 60 / this.p.tempo; };
  Daw.prototype.loopRange = function () { var l = this.p.loop; return l.on && l.to > l.from ? [l.from * 4, l.to * 4] : null; };
  Daw.prototype.toggle = function () { if (this.playing) this.stop(); else this.play(); };
  Daw.prototype.play = function (countIn) {
    var self = this; this.ensureAudio();
    return this.load().then(function () {
      if (self.playing) return; var ctx = AC, lr = self.loopRange();
      if (lr && (self.pos < lr[0] || self.pos >= lr[1])) self.pos = lr[0];
      if (!lr && self.pos >= self.p.bars * 4) self.pos = 0;
      var t0 = ctx.currentTime + 0.12;
      self.countBeats = countIn ? 4 : 0;
      for (var k = 0; k < self.countBeats; k++) click(ctx, t0 + k * self.secPerBeat(), k === 0, self.master);
      t0 += self.countBeats * self.secPerBeat();
      self.anchors = [{ t: t0, b: self.pos }]; self.cursor = self.pos; self.jumped = true; self.srcs = []; self.playing = true; self.renderTransport();
      self.timer = setInterval(function () { self.schedule(); }, 25); self.schedule(); self.frame();
    }).catch(function (e) { self.say('Could not load the sounds: ' + (e && e.message)); });
  };
  Daw.prototype.timeOf = function (b) { var a = this.anchors[this.anchors.length - 1]; return a.t + (b - a.b) * this.secPerBeat(); };
  Daw.prototype.reanchor = function () { if (!this.playing || this.recording) return; this.stop(); this.play(); };   // a new tempo: start again from here
  Daw.prototype.beatAt = function (t) { var a = this.anchors[0]; for (var i = this.anchors.length - 1; i >= 0; i--) if (this.anchors[i].t <= t) { a = this.anchors[i]; break; } return a.b + (t - a.t) / this.secPerBeat(); };
  Daw.prototype.schedule = function () {
    var ctx = AC, horizon = ctx.currentTime + 0.15, step = 0.25, self = this, anySolo = false;
    while (this.playing && this.timeOf(this.cursor) < horizon) {
      var b0 = this.cursor, b1 = b0 + step, lr = this.loopRange(), end = lr ? lr[1] : this.p.bars * 4, jumped = this.jumped; this.jumped = false;
      if (b0 >= end - 1e-9) {
        if (lr && !this.recording) { var tEnd = this.timeOf(end); this.anchors.push({ t: tEnd, b: lr[0] }); this.cursor = lr[0]; this.jumped = true; if (this.anchors.length > 50) this.anchors.splice(0, 25); continue; }
        if (!lr || this.recording) { var te = this.timeOf(end); this.stopAt = te; break; }
      }
      if (this.p.click || this.recording) for (var cb = Math.ceil(b0 - 1e-9); cb < b1 - 1e-9; cb++) click(ctx, this.timeOf(cb), cb % 4 === 0, this.master);
      this.p.tracks.forEach(function (tr, i) { var dest = self.strips[i].input;
        tr.clips.forEach(function (c) { if (c.start >= b1 || c.start + c.len <= b0) return;
          if (isAudio(tr)) { var endB = lr ? Math.min(lr[1], c.start + c.len) : c.start + c.len;
            if (c.start >= b0 - 1e-9) self.startAudio(ctx, c, c.start, self.timeOf(c.start), dest, endB, true);
            else if (jumped) self.startAudio(ctx, c, b0, self.timeOf(b0), dest, endB, true);
            return; }
          c.notes.forEach(function (n) { if (n.t >= c.len) return; var at = c.start + n.t; if (at < b0 - 1e-9 || at >= b1 - 1e-9) return;
            playNote(bank, tr, n, self.timeOf(at), Math.min(n.d, c.len - n.t) * self.secPerBeat(), dest); }); }); });
      this.cursor = b1;
    }
    if (this.stopAt && ctx.currentTime >= this.stopAt) { this.stopAt = null; this.stop(true); }
  };
  Daw.prototype.frame = function () {
    var self = this; if (!this.playing) return;
    var b = this.beatAt(AC.currentTime); if (b >= this.anchors[0].b || this.anchors.length > 1) this.setPos(Math.max(0, b), true);
    requestAnimationFrame(function () { self.frame(); });
  };
  Daw.prototype.setPos = function (b, live) {
    this.pos = b; var W = this.beatW(); if (this.head) this.head.style.left = (196 + b * W) + 'px';
    var bar = Math.floor(b / 4), beat = Math.floor(b % 4), six = Math.floor((b % 1) * 4);
    this.posEl.textContent = (bar + 1) + '.' + (beat + 1) + '.' + (six + 1);
  };
  Daw.prototype.stop = function (atEnd) {
    if (!this.playing) { return; }
    clearInterval(this.timer); this.playing = false; this.stopAt = null; bank.stopAll();
    (this.srcs || []).forEach(function (x) { try { x.stop(); } catch (e) {} }); this.srcs = [];
    var wasRec = this.recording; this.recording = false;
    if (wasRec) this.finishTake();
    this.setPos(atEnd ? (this.loopRange() ? this.loopRange()[0] : 0) : Math.floor(this.pos * 4) / 4);
    this.renderTransport();
  };
  Daw.prototype.locate = function (b) { var was = this.playing; if (was) this.stop(); this.setPos(b); if (was) this.play(); };
  Daw.prototype.meterLoop = function () {
    var self = this;
    (function tick() { requestAnimationFrame(tick);
      if (self.mic && self.inFill) { var ip = levelOf(self.mic.an, self.buf), idb = ip > 0 ? 20 * Math.log10(ip) : -90; self.inFill.style.width = clamp((idb + 60) / 60, 0, 1) * 100 + '%'; self.inFill.classList.toggle('mdaw-hot', idb > -6); }
      if (!self.meterEls) return;
      self.meterEls.forEach(function (m) { var an = m.ti < 0 ? self.masterMeter : self.strips[m.ti] && self.strips[m.ti].meter; if (!an) return;
        var pk = levelOf(an, self.buf), db = pk > 0 ? 20 * Math.log10(pk) : -90, h = clamp((db + 60) / 66, 0, 1) * 100;
        m.fill.style.height = h + '%'; m.hold = Math.max(m.hold * 0.97, h); m.peak.style.bottom = m.hold + '%';
        m.fill.classList.toggle('mdaw-hot', db > -6); if (pk >= 0.999) m.led.classList.add('mdaw-over'); });
    })();
  };

  // ---------------- recording ----------------
  Daw.prototype.record = function () {
    if (this.recording) return this.stop(); var tr = this.track(); if (!tr) return this.say('Add a track to record into.');
    if (this.playing) this.stop();
    if (isAudio(tr)) return this.recordAudio();
    this.take = []; this.held = {}; this.recording = true; this.keysOn = true; this.recStart = Math.floor(this.pos / 4) * 4; this.setPos(this.recStart);
    this.say('Count-in… then play on the keys (or a MIDI keyboard). Space stops.'); this.node.focus(); this.play(true); this.midi();
  };
  Daw.prototype.noteOn = function (m, v) {
    var tr = this.track(); if (!tr) return; this.ensureAudio(); var i = this.sel.track, self = this;
    var dest = this.strips[i].input, live = playNote(bank, tr, { m: m, v: v }, AC.currentTime, isDrum(tr) ? null : 8, dest);
    if (!isDrum(tr)) this.held[m] = { live: live, b: this.playing ? this.beatAt(AC.currentTime) : null, v: v };
    else if (this.recording) this.take.push({ b: this.beatAt(AC.currentTime), d: 0.25, m: m, v: v });
    if (!bank.has(tr.inst)) this.load();
  };
  Daw.prototype.noteOff = function (m) {
    var h = this.held && this.held[m]; if (!h) return; delete this.held[m];
    if (h.live && h.live.g) { try { h.live.g.gain.setTargetAtTime(0, AC.currentTime, 0.04); h.live.src.stop(AC.currentTime + 0.3); } catch (e) {} }
    if (this.recording && h.b != null) { var e = this.beatAt(AC.currentTime); this.take.push({ b: h.b, d: Math.max(0.05, e - h.b), m: m, v: h.v }); }
  };
  Daw.prototype.finishTake = function () {
    if (this.audioTake) return this.finishAudio();
    var self = this, tr = this.track(), notes = (this.take || []).filter(function (n) { return n.b >= self.recStart - 0.25; });
    Object.keys(this.held || {}).forEach(function (m) { self.noteOff(+m); });
    if (!notes.length) { this.say('Nothing was played, so nothing was recorded.'); return; }
    var last = Math.max.apply(null, notes.map(function (n) { return n.b + n.d; })), len = Math.max(4, Math.ceil((last - this.recStart) / 4) * 4);
    this.change(function () { tr.clips.push({ start: self.recStart, len: len, notes: notes.map(function (n) { return { t: Math.max(0, n.b - self.recStart), d: n.d, m: n.m, v: n.v }; }) });
      self.sel.clip = tr.clips.length - 1; self.sel.notes = []; });
    this.say('Recorded ' + notes.length + ' notes into a new clip. Try Quantize.');
  };
  // ---------------- audio: playing, drawing and recording ----------------
  // play clip c from beat `from` (at context time `when`) up to beat endB, into dest; live = a source to stop with the transport
  Daw.prototype.startAudio = function (ctx, c, from, when, dest, endB, live) {
    var T = TAKES[c.take]; if (!T) return; var spb = this.secPerBeat();
    var pos = (from - c.start - (c.off || 0)) * spb + (c.nudge || 0) / 1000, dur = (Math.min(endB, c.start + c.len) - from) * spb;
    if (pos < 0) { when -= pos; dur += pos; pos = 0; }
    if (live && when < ctx.currentTime) { var late = ctx.currentTime - when; pos += late; dur -= late; when = ctx.currentTime; }
    dur = Math.min(dur, T.buf.duration - pos); if (!(dur > 0.005)) return;
    var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = T.buf; g.gain.value = dbToGain(c.gain || 0); src.connect(g); g.connect(dest);
    src.start(when, pos, dur); if (live) (this.srcs = this.srcs || []).push(src);
  };
  Daw.prototype.wave = function (cx, c, W, h) {     // the recording drawn into a clip, W pixels a beat
    var T = TAKES[c.take], spb = this.secPerBeat(), w = Math.round(c.len * W), g = dbToGain(c.gain || 0);
    if (!T) { cx.font = '10px sans-serif'; cx.fillText(c.take ? 'loading… (or not in this browser)' : '', 4, h / 2); return; }
    for (var x = 0; x < w; x++) { var t0 = ((x / W) - (c.off || 0)) * spb + (c.nudge || 0) / 1000, t1 = t0 + spb / W, m = 0;
      for (var k = Math.max(0, Math.floor(t0 * 200)); k < Math.min(T.peaks.length, Math.ceil(t1 * 200)); k++) if (T.peaks[k] > m) m = T.peaks[k];
      var a = Math.min(1, m * g) * (h / 2 - 1); if (a > 0.3) cx.fillRect(x, h / 2 - a, 1, 2 * a); }
  };
  Daw.prototype.audioEditor = function (tr, c) {
    var self = this, roll = this.roll, W = 40, H = 120;
    this.edTitle.textContent = 'Audio clip: ' + tr.name + ', bar ' + (c.start / 4 + 1);
    var box = el('div', 'mdaw-rollwrap mdaw-audioed'), cv = el('canvas', 'mdaw-cv'), dpr = global.devicePixelRatio || 1, w = c.len * W;
    cv.width = w * dpr; cv.height = H * dpr; cv.style.width = w + 'px'; cv.style.height = H + 'px'; box.appendChild(cv); roll.appendChild(box);
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var css = getComputedStyle(this.node), ink = css.getPropertyValue('--site-ink').trim() || '#222';
    function draw() { x.clearRect(0, 0, w, H); x.globalAlpha = 0.35; x.fillStyle = ink; for (var b = 0; b <= c.len; b++) x.fillRect(b * W, 0, 1, b % 4 ? H / 6 : H); x.fillRect(0, H / 2, w, 1);
      x.globalAlpha = 1; x.fillStyle = COLORS[self.sel.track % COLORS.length]; self.wave(x, c, W, H); }
    draw();
    var row = el('div', 'mdaw-tools'), gl = el('label', 'mdaw-lbl', 'Clip gain '), gi = el('input'), go = el('output', 'mdaw-num', dbTxt(c.gain || 0));
    gi.type = 'range'; gi.min = -24; gi.max = 18; gi.step = 0.5; gi.value = c.gain || 0; gl.appendChild(gi); gl.appendChild(go);
    gi.oninput = function () { c.gain = +gi.value; go.textContent = dbTxt(c.gain); draw(); }; gi.onchange = function () { self.undo.push(JSON.stringify(self.p)); self.save(); self.renderTracks(); };
    var nl = el('label', 'mdaw-lbl', 'Latency fix '), ni = el('input'); ni.type = 'number'; ni.min = -500; ni.max = 1000; ni.value = Math.round(c.nudge || 0); nl.appendChild(ni); nl.appendChild(document.createTextNode(' ms earlier'));
    ni.onchange = function () { var v = clamp(+ni.value || 0, -500, 1000); self.change(function () { c.nudge = v; }); };
    row.appendChild(gl); row.appendChild(nl); roll.appendChild(row);
    var lv = c.level; roll.appendChild(el('p', 'mdaw-take', lv ? 'This take: peak ' + dbStr(lv.peak) + ', average ' + dbStr(lv.rms) + (c.out ? '. The sound check heard ' + c.out + '.' : '.') : ''));
    this.edHint.textContent = 'A recording is sound, not notes: it can be moved, cut, made louder or quieter, but its notes cannot be changed one by one. Solo the track to hear everything the microphone heard.';
  };
  Daw.prototype.latencyMs = function () {
    var r = this.check || {}; if (isFinite(r.latencyMs) && r.latencyMs > 0) return Math.round(r.latencyMs);
    return Math.round(((AC.outputLatency || 0) + (AC.baseLatency || 0)) * 1000 + 10);     // (no measurement: the browser's own figure)
  };
  Daw.prototype.getMic = function () {
    if (this.mic) return Promise.resolve(this.mic);
    var self = this, ctx = this.ensureAudio(), AC2 = global.AudioCheck;
    var chk = AC2 && AC2.ensure ? AC2.ensure({ levelCheck: true }).then(function (r) { if (!r) throw new Error('the sound check was cancelled'); return r; }) : Promise.resolve({});
    return chk.then(function (r) {
      self.check = r;
      // never echo cancellation, noise suppression or automatic gain here: a DAW records what the mic hears, bleed and all
      var cons = Object.assign({}, r.constraints || {}, { echoCancellation: false, noiseSuppression: false, autoGainControl: false });
      return navigator.mediaDevices.getUserMedia({ audio: cons });
    }).then(function (stream) {
      workletP = workletP || ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })));
      return workletP.then(function () { return stream; });
    }).then(function (stream) {
      var src = ctx.createMediaStreamSource(stream), node = new AudioWorkletNode(ctx, 'mdaw-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' });
      var sink = ctx.createGain(), an = ctx.createAnalyser(), mon = ctx.createGain(); sink.gain.value = 0; mon.gain.value = 0; an.fftSize = 1024;
      src.connect(node); node.connect(sink); sink.connect(ctx.destination); src.connect(an); src.connect(mon);
      node.port.onmessage = function (e) { if (self.audioTake) self.audioTake.push(e.data); };
      self.mic = { stream: stream, an: an, mon: mon }; self.renderTransport(); return self.mic;
    });
  };
  Daw.prototype.monitor = function (on) {
    var self = this;
    this.getMic().then(function (m) {
      self.monOn = on; try { m.mon.disconnect(); } catch (e) {}
      var st = self.strips[self.sel.track]; if (on && st) { m.mon.connect(st.input); m.mon.gain.value = 1; } else m.mon.gain.value = 0;
      self.renderTransport();
      if (on) self.say((self.check && self.check.output === 'speakers' ? 'Careful: the sound check heard speakers. Monitoring through speakers can howl (feedback): use headphones. ' : '') +
        'You hear yourself about ' + self.latencyMs() + ' ms late: that delay is latency.');
    }).catch(function (e) { self.say('No microphone: ' + e.message); });
  };
  Daw.prototype.recordAudio = function () {
    var self = this; this.say('Opening the microphone…');
    this.getMic().then(function () {
      self.audioTake = []; self.recording = true; self.recStart = Math.floor(self.pos / 4) * 4; self.setPos(self.recStart);
      self.say('Count-in… recording. The click is on while you record. Space stops.'); self.node.focus(); self.play(true);
    }).catch(function (e) { self.recording = false; self.audioTake = null; self.say('No microphone: ' + (e && e.message)); self.renderTransport(); });
  };
  Daw.prototype.finishAudio = function () {
    var self = this, tr = this.track(), blocks = this.audioTake || []; this.audioTake = null;
    if (!blocks.length || !tr) { this.say('Nothing was recorded.'); return; }
    var n = 0; blocks.forEach(function (b) { n += b.d.length; }); var data = new Float32Array(n), k = 0; blocks.forEach(function (b) { data.set(b.d, k); k += b.d.length; });
    var rate = AC.sampleRate, spb = this.secPerBeat(), lat = this.latencyMs(), bStart = this.beatAt(blocks[0].t), bEnd = this.beatAt(blocks[blocks.length - 1].t);
    var len = Math.max(4, Math.ceil((bEnd - this.recStart) / 4) * 4), from = ((this.recStart - bStart) * spb + lat / 1000) * rate;   // (levels from the first bar, not the count-in)
    var id = 'take-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lv = levels(data, from);
    makeTake(id, data, rate); putTake(id, data, rate);
    this.change(function () {
      tr.clips.push({ start: self.recStart, len: len, take: id, off: bStart - self.recStart, nudge: lat, gain: 0, level: { peak: lv.peak, rms: lv.rms }, out: (self.check && self.check.output) || '', notes: [] });
      self.sel.clip = tr.clips.length - 1; self.sel.notes = []; });
    this.say('Recorded ' + (n / rate).toFixed(1) + ' s: peak ' + dbStr(lv.peak) + ', average ' + dbStr(lv.rms) + '. Solo the track: what else did the microphone hear?');
  };

  Daw.prototype.midi = function () {
    var self = this; if (this.midiOn || !navigator.requestMIDIAccess) return; this.midiOn = true;
    navigator.requestMIDIAccess().then(function (acc) { function hook(inp) { inp.onmidimessage = function (e) { var s = e.data[0] & 0xf0, n = e.data[1], v = e.data[2];
        if (s === 0x90 && v > 0) { var tr = self.track(); if (tr && isDrum(tr)) { var map = {}; Object.keys(global.BandMidi ? global.BandMidi.GM : {}).forEach(function (k) { if (map[global.BandMidi.GM[k]] == null) map[global.BandMidi.GM[k]] = k; }); if (map[n]) self.noteOn(map[n], v / 127); } else self.noteOn(n, v / 127); }
        else if (s === 0x80 || (s === 0x90 && v === 0)) self.noteOff(n); }; }
      acc.inputs.forEach(hook); acc.onstatechange = function () { acc.inputs.forEach(hook); }; }).catch(function () {});
  };

  // ---------------- edits ----------------
  Daw.prototype.newClip = function (ti, start) { var tr = this.p.tracks[ti], self = this; if (!tr) return;
    this.change(function () { tr.clips.push({ start: clamp(start, 0, self.p.bars * 4 - 4), len: 4, notes: [] }); self.sel = { track: ti, clip: tr.clips.length - 1, notes: [] }; }); };
  Daw.prototype.duplicate = function () { var c = this.clip(), tr = this.track(), self = this; if (!c) return this.say('Select a clip first.');
    this.change(function () { var n = clone(c); n.start = c.start + c.len; tr.clips.push(n); self.sel.clip = tr.clips.length - 1; if (n.start + n.len > self.p.bars * 4) self.p.bars = Math.min(64, Math.ceil((n.start + n.len) / 4)); }); };
  Daw.prototype.split = function () { var c = this.clip(), tr = this.track(), at = Math.round(this.pos / this.grid) * this.grid, self = this;
    if (!c || at <= c.start || at >= c.start + c.len) return this.say('Put the playhead inside the selected clip, then Split.');
    this.change(function () { var cut = at - c.start, b = Object.assign(clone(c), { start: at, len: c.len - cut, off: (c.off || 0) - cut, notes: c.notes.filter(function (n) { return n.t >= cut; }).map(function (n) { return Object.assign({}, n, { t: n.t - cut }); }) });
      c.notes = c.notes.filter(function (n) { return n.t < cut; }); c.len = cut; tr.clips.push(b); }); };
  Daw.prototype.deleteSel = function () { var c = this.clip(), tr = this.track(), self = this; if (!c) return;
    if (this.sel.notes.length) { this.change(function () { c.notes = c.notes.filter(function (n, i) { return self.sel.notes.indexOf(i) < 0; }); self.sel.notes = []; }); return; }
    this.change(function () { tr.clips.splice(self.sel.clip, 1); self.sel.clip = -1; }); };
  Daw.prototype.quantize = function (strength) { var c = this.clip(), G = this.grid, self = this; if (!c) return this.say('Select a clip first.');
    this.change(function () { c.notes.forEach(function (n, i) { if (self.sel.notes.length && self.sel.notes.indexOf(i) < 0) return; var q = Math.round(n.t / G) * G; n.t = Math.max(0, n.t + (q - n.t) * strength);
      if (strength === 1 && !isDrum(self.track())) n.d = Math.max(G, Math.round(n.d / G) * G); }); });
    this.say('Quantized to the ' + this.gridSel.options[this.gridSel.selectedIndex].text + ' grid' + (strength < 1 ? ', half way' : '') + '.'); };
  Daw.prototype.transpose = function (s) { var c = this.clip(), self = this; if (!c || isDrum(this.track())) return;
    this.change(function () { c.notes.forEach(function (n, i) { if (!self.sel.notes.length || self.sel.notes.indexOf(i) >= 0) n.m = clamp(n.m + s, 21, 108); }); }); };
  Daw.prototype.bandWrite = function () {
    var self = this, r; try { r = bandParts(this.chartIn.value, this.styleSel.value, this.p.tempo, clamp(+this.timesIn.value || 1, 1, 8)); } catch (e) { return this.say(e.message); }
    var at = Math.floor(this.pos / 4) * 4, label = this.styleSel.options[this.styleSel.selectedIndex].text;
    this.change(function () {
      function put(name, inst, notes) { if (!notes.length) return; var tr = null;
        self.p.tracks.forEach(function (t) { if (!tr && t.name === name) tr = t; }); if (!tr) { tr = track(name, inst); self.p.tracks.push(tr); } else tr.inst = inst;
        tr.clips = tr.clips.filter(function (c) { return c.start + c.len <= at || c.start >= at + r.len; }); tr.clips.push({ start: at, len: r.len, notes: notes }); }
      put('Drums', 'kit', r.drums); put('Congas', 'congas', r.congas); put('Bass', r.bassInst, r.bass); put('Chords', r.compInst, r.comp);
      self.p.bars = Math.max(self.p.bars, Math.min(64, (at + r.len) / 4)); self.sel = { track: 0, clip: 0, notes: [] };
    });
    this.say('The band wrote ' + (r.len / 4) + ' bars of ' + label + ' from bar ' + (at / 4 + 1) + '. Every note is now yours to edit.'); this.load();
  };
  Daw.prototype.bounce = function () {
    var self = this, p = this.p, secs = p.bars * 4 * this.secPerBeat() + 2.5, rate = 44100;
    var OC = global.OfflineAudioContext || global.webkitOfflineAudioContext; if (!OC) return this.say('This browser cannot bounce.');
    var oc = new OC(2, Math.ceil(secs * rate), rate), b2 = global.BandSounds.create(oc), master = oc.createGain(); master.connect(oc.destination);
    var want = {}; p.tracks.forEach(function (t) { if (!isAudio(t)) want[t.inst] = 1; }); var anySolo = p.tracks.some(function (t) { return t.solo; });
    this.say('Bouncing…');
    master.gain.value = dbToGain((p.master || { vol: 0 }).vol);
    b2.load(Object.keys(want)).then(function () {
      p.tracks.forEach(function (tr) { var s = makeStrip(oc, master); s.fader.gain.value = !tr.mute && (!anySolo || tr.solo) ? dbToGain(tr.vol) : 0; if (s.pan.pan) s.pan.pan.value = tr.pan;
        if (isAudio(tr)) { tr.clips.forEach(function (c) { self.startAudio(oc, c, Math.max(0, c.start), 0.05 + c.start * self.secPerBeat(), s.input, p.bars * 4); }); return; }
        tr.clips.forEach(function (c) { c.notes.forEach(function (n) { if (n.t >= c.len || c.start + n.t >= p.bars * 4) return;
          playNote(b2, tr, n, 0.05 + (c.start + n.t) * self.secPerBeat(), Math.min(n.d, c.len - n.t) * self.secPerBeat(), s.input); }); }); });
      return oc.startRendering();
    }).then(function (buf) { var pk = 0; for (var k = 0; k < buf.numberOfChannels; k++) { var d = buf.getChannelData(k); for (var i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); }
      download(wav(buf), 'mini-daw.wav');
      self.say('Bounced ' + Math.round(secs) + ' s to WAV. Peak ' + (pk > 0 ? (20 * Math.log10(pk)).toFixed(1) : '−∞') + ' dBFS' + (pk >= 1 ? ': it clipped, pull the master down.' : '.'));
    }).catch(function (e) { self.say('Could not bounce: ' + (e && e.message)); });
  };

  // ---------------- keys ----------------
  Daw.prototype.key = function (e, down) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'button' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    if (typing) return; var k = e.key, mod = e.ctrlKey || e.metaKey, tr = this.track();
    if (this.keysOn && !mod && tr && !e.repeat) {
      var low = k.toLowerCase();
      if (isDrum(tr) && DRUM_KEYS[low] && tr.inst === 'kit') { e.preventDefault(); if (down) this.noteOn(DRUM_KEYS[low], e.shiftKey ? 1 : 0.75); return; }
      var pi = PIANO_KEYS.indexOf(low);
      if (!isDrum(tr) && pi >= 0) { e.preventDefault(); var base = (/bass/.test(tr.inst) ? 36 : 60) + 12 * this.octave; if (down) this.noteOn(base + pi, 0.75); else this.noteOff(base + pi); return; }
      if (down && !isDrum(tr) && (low === 'z' || low === 'x')) { this.octave = clamp(this.octave + (low === 'z' ? -1 : 1), -2, 2); this.say('Keys octave ' + (this.octave >= 0 ? '+' : '') + this.octave); return; }
    }
    if (this.keysOn && !mod && tr && e.repeat && (PIANO_KEYS.indexOf(k.toLowerCase()) >= 0 || DRUM_KEYS[k.toLowerCase()])) { e.preventDefault(); return; }
    if (!down) return;
    if (k === ' ') { e.preventDefault(); this.toggle(); }
    else if (k === 'Enter') { e.preventDefault(); this.locate(0); }
    else if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); this.doUndo(!e.shiftKey); }
    else if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); this.duplicate(); }
    else if (mod) return;
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); this.deleteSel(); }
    else if (this.keysOn) return;
    else if (k === 'l' || k === 'L') { this.bLoop.click(); }
    else if (k === 'c' || k === 'C') { this.bClick.click(); }
    else if ((k === 'r' || k === 'R') && this.show.record) { this.record(); }
    else if (k === 'q' || k === 'Q') { this.quantize(1); }
  };

  var all = [];
  global.MiniDaw = {
    init: function () { Array.prototype.forEach.call(document.querySelectorAll('.mdaw'), function (n) { if (!n.dataset.ready) { n.dataset.ready = '1'; try { all.push(new Daw(n)); } catch (e) { n.textContent = 'The DAW could not start: ' + e.message; if (global.console) console.error(e); } } }); return all; },
    all: all, PRESETS: PRESETS, toMidi: toMidi, bandParts: bandParts, INSTS: INSTS
  };
  // only one DAW plays at a time
  document.addEventListener('pointerdown', function (e) { all.forEach(function (d) { if (d.playing && !d.node.contains(e.target) && e.target.closest && e.target.closest('.mdaw')) d.stop(); }); }, true);
})(window);
