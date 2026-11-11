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
// The model (one project): { tempo, bars, ts:[n,d] (default [4,4]), tsMap:[{bar,ts}] (meter changes), loop:{on,from,to} (bars), click, tracks:[track] }
//   track = { name, inst (a BandSounds instrument), vol (dB), pan (-1..1), mute, solo, clips:[clip] }
//   clip  = { start (beats from the top), len (beats), notes:[{ t (beats into the clip), d (beats), m (midi or kit piece), v (0..1) }] }
// Time is in beats (quarter notes); a bar is n*4/d beats (see "time signatures"); the grid is sixteenths. data-ts="6/8" starts a project in that meter.
//
// Session view (session.js, data-show="session"): p.scenes [{name}] + track.slots [clip|null] (a slot clip = { start:0, len, notes }) that loop
// when launched; see session.js. sel.slot >= 0 means the editor is on that slot's clip.
// Note mode (vim-style velocity editing; Enter on a selected clip, Esc leaves): see "note mode" below and apps/shared/daw/TODO.md.
// Volume automation (data-show "automation"): track.auto = { vol: [{ t (beats from the top), v (dB) }] sorted by t }. The points ARE the track's level
// (they replace the fader, as in Live and Logic; before the first point and after the last the level holds), linear in dB between points. A track
// with points shows "(A)" in the mixer and its fader is locked. Exported as MIDI CC 7 (GM2 curve dB = 40 log10(cc/127), so 0 dB = 127, 127 is the
// ceiling: levels above 0 dB export as 127) and read back from CC 7 (one constant value = the fader). See "volume automation" below.
// h j k l are the arrow keys and a number before a key repeats it ("3k"): see "placing clips from the keyboard" below.
// Placing clips from the keyboard: see "placing clips from the keyboard" below (arrow keys, [ ], N, P, - =).
// Opt-in extras (the scratch pad, tools/daw.qmd): data-projects = several named projects (a Projects row; index in "mdaw:<id>:projects", the
// current in "mdaw:<id>:current", the old single "mdaw:<id>" is the first project; undo is per project; Save / Open project carry the name, and
// Open adds a new project instead of replacing this one). data-clipboard = Ctrl/Cmd+C / X / V and Copy / Paste buttons (a clip is pasted on the
// selected track at the playhead's bar line; selected notes are pasted into the open clip at the playhead, clipped to the clip; shared by every DAW
// on the page and mirrored in localStorage "mdaw:clipboard"). data-zoom = − / + / Fit for the arrangement's bar width and for the piano roll's
// width and row height, Ctrl/Cmd + and − (the roll when the focus is in it; Shift also does the rows), kept in "mdaw:<id>:zoom". Logic in
// Projects / Clipboard (exported on MiniDaw; test tests/lessons/daw-scratch.test.js).
// Keyboard + loop (nav-tools.js, data-nav, scratch pad only): a Step menu (1/16 · beat · bar) that sizes keyboard moves and snaps the mouse; arrows move the playhead by a step (Shift: a bar);
// Alt+← → and h / l move the selected notes (roll) or clip by a step (Alt+Shift, H / L: a bar), the playhead when nothing is selected; Alt+↑ ↓ transpose selected notes;
// , sets the loop start and . the loop end at the playhead, \ toggles the loop, Shift+O loops the selected clip, Esc deselects. The loop becomes exact beats (loop.fb / loop.tb; loopSpan()),
// and the ruler: drag across it to draw the loop, drag an edge to resize, the middle to move, double-click a bar to loop it. Lessons keep the old bar-only ruler and Shift+arrows.
// Panels (panels.js, data-panels, scratch pad only): every part (projects, transport, session, arrangement, editor, track sound, notation, fill, mixer, band, files) is a
// folding panel in one of two columns (PanelColumns: grip to drag, ⇄ to the other column, so the second column is a sidebar); layout in "mdaw:<id>:panels", folds in "mdaw:<id>:panelopen", Reset layout.
// The position readout (all DAWs): click it or press G, type bar.beat.sixteenth ("6.1.4", "6.3", "6"), Enter jumps (Meter.parsePos), Esc cancels.
// Compose tools (compose-tools.js + abc-clip.js, scratch pad only): data-comp-menu = comping rhythm / voicing / piano-or-guitar menus in the band row (override the style's
// own; bandParts' last argument); data-abc-edit = "Edit as notation" panel for a note clip (clip -> ABC text + staff, edit, Apply = one undo step; velocities kept where pitch and
// 16th-grid start match); data-fill = "Fill from chords" panel (bars + chords + a source: band style, workstation arp type or Style Arranger section -> one clip on a track).
// Track sound (track-sound.js, loaded after this file; each part opt-in, scratch pad only): data-organ = an organ panel on hammond tracks (per-track tonebars, Leslie, swell, key click, Leslie / swell
// automation in track.auto.leslie / .swell; track.organ), data-fx = 3 insert effects a track (track.fx) + reverb / delay sends (track.sends, project.returns), data-fx needs synth-kit.js on the page
// (SK_NO_BAR), data-synth = synth instruments (syn-sub, syn-fm, syn-wt, syn-chip; track.synth). Hooks here: makeStrip(buses), applyMix, schedule, bounce, MIDI export, noteOff, stop. See track-sound.js's header.
// Keys (when the DAW has focus): Space play/stop// Keys (when the DAW has focus): Space play/stop, Home (or Enter with no clip selected) back to the start, O loop on/off (L is → now), C click, R record,
// Delete delete the selection, Ctrl/Cmd+D duplicate the clip, Ctrl/Cmd+Z / Shift+Z undo / redo, Q quantize the clip.
// While recording or with "Keys" on, A W S E D F T G Y H U J K O L play notes (Z / X octave), on a drum track A S D F G H J K the kit.
(function (global) {
  var INSTS = [
    { id: 'kit', label: 'Drum kit', drum: true }, { id: 'bass', label: 'Upright bass' }, { id: 'ebass', label: 'Electric bass' },
    { id: 'piano', label: 'Piano' }, { id: 'rhodes', label: 'Electric piano' }, { id: 'hammond', label: 'Organ' },
    { id: 'aguitar', label: 'Acoustic guitar' }, { id: 'clguitar', label: 'Electric guitar (clean)' },
    { id: 'odguitar', label: 'Electric guitar (distorted)' }, { id: 'congas', label: 'Congas', drum: true },
    { id: 'audio', label: 'Audio (microphone)', audio: true },
    // synth instruments (SynthKit voices, track-sound.js): listed only in a DAW with data-synth
    { id: 'syn-sub', label: 'Synth: subtractive', synth: 'subtractive' }, { id: 'syn-fm', label: 'Synth: FM', synth: 'fm' },
    { id: 'syn-wt', label: 'Synth: wavetable', synth: 'wavetable' }, { id: 'syn-chip', label: 'Synth: chip pulse', synth: 'chip' }];
  var KIT_ROWS = [['crash', 'Crash'], ['ride', 'Ride'], ['hatOpen', 'Open hat'], ['hatClosed', 'Closed hat'], ['tomHi', 'High tom'],
    ['tomMid', 'Mid tom'], ['tomLo', 'Low tom'], ['rim', 'Rim'], ['snare', 'Snare'], ['kick', 'Kick']];
  var CONGA_ROWS = [['congaSlap', 'Slap'], ['congaOpen', 'Conga open'], ['congaMute', 'Conga mute'], ['congaHeel', 'Heel'], ['congaToe', 'Toe'], ['tumbaOpen', 'Tumba open'], ['tumbaBass', 'Tumba bass']];
  var DRUM_KEYS = { a: 'kick', s: 'snare', d: 'hatClosed', f: 'hatOpen', g: 'tomLo', h: 'tomMid', j: 'crash', k: 'ride' };
  var PIANO_KEYS = 'awsedftgyhujkolp;'.split('');   // C up to E an octave and a 3rd above
  var COLORS = ['#c0603a', '#3a7dc0', '#5a9a46', '#9a5ab0', '#c09a2a', '#2a9a9a', '#b04a6a', '#6a6a6a'];
  var NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  var GM_PROGRAM = { bass: 32, ebass: 33, piano: 0, rhodes: 4, hammond: 16, aguitar: 25, clguitar: 27, odguitar: 30,
    'syn-sub': 81, 'syn-fm': 5, 'syn-wt': 88, 'syn-chip': 80 };     // the synths: GM Lead 2 (sawtooth), Electric Piano 2 (the FM one), Pad 1 (new age), Lead 1 (square): a choice, not a match; read back as the nearest sampled instrument

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

  // ---------------- time signatures ----------------
  // A project has ts [n, d] (default 4/4) and tsMap [{ bar (0-based), ts }]: the meter changes from that bar on. Time stays in quarter
  // notes, so a bar is n * 4 / d beats (6/8 = 3, 7/8 = 3.5). Tempo is quarter notes a minute in every meter. Bars are found by walking
  // the bars from the top (at most 64, so it is cheap). A bar's clicks fall on its groups: quarters in x/4, dotted quarters in 6/8, 9/8,
  // 12/8, and 2+2+3 in 7/8, 3+2 in 5/8.
  var TS_LIST = [[2, 4], [3, 4], [4, 4], [5, 4], [3, 8], [5, 8], [6, 8], [7, 8], [9, 8], [12, 8]];
  var Meter = {
    list: TS_LIST,
    ok: function (ts) { return Array.isArray(ts) && ts[0] >= 1 && ts[0] <= 32 && [2, 4, 8, 16].indexOf(ts[1]) >= 0 && ts[0] % 1 === 0; },
    str: function (ts) { return ts[0] + '/' + ts[1]; },
    parse: function (s) { var m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(s || '').trim()); var ts = m ? [+m[1], +m[2]] : null; return ts && Meter.ok(ts) ? ts : null; },
    beats: function (ts) { return ts[0] * 4 / ts[1]; },
    // the groups of a bar, in quarter notes: [1,1,1] in 3/4, [1.5,1.5] in 6/8, [1,1,1.5] in 7/8
    groups: function (ts) {
      var n = ts[0], d = ts[1], u = 4 / d, g = [];
      if (d <= 4) for (var i = 0; i < n; i++) g.push(1 * u);
      else if (n <= 3) g.push(n * u);
      else if (n % 3 === 0 && n >= 6) for (var j = 0; j < n / 3; j++) g.push(3 * u);
      else if (n === 4) g.push(2 * u, 2 * u);
      else if (n === 7) g.push(2 * u, 2 * u, 3 * u);
      else { var k = n % 3 === 1 ? 2 : n % 3 === 2 ? 1 : 0, th = (n - 2 * k) / 3; for (var a = 0; a < th; a++) g.push(3 * u); for (var b = 0; b < k; b++) g.push(2 * u); }
      return g;
    },
    tsOfBar: function (p, bar) { var t = Meter.ok(p.ts) ? p.ts : [4, 4]; (p.tsMap || []).forEach(function (c) { if (c.bar <= bar && Meter.ok(c.ts)) t = c.ts; }); return t; },
    barLen: function (p, bar) { return Meter.beats(Meter.tsOfBar(p, bar)); },
    barStart: function (p, bar) { var s = 0; for (var i = 0; i < bar; i++) s += Meter.barLen(p, i); return s; },
    // the bar holding a beat: { bar, start, len, into, ts }
    barAt: function (p, beat) {
      var s = 0, i = 0, l; if (!(beat > 0)) return { bar: 0, start: 0, len: Meter.barLen(p, 0), into: Math.min(0, beat || 0), ts: Meter.tsOfBar(p, 0) };
      for (; i < 5000; i++) { l = Meter.barLen(p, i); if (beat < s + l - 1e-9) break; s += l; }
      return { bar: i, start: s, len: l, into: beat - s, ts: Meter.tsOfBar(p, i) };
    },
    total: function (p) { return Meter.barStart(p, p.bars); },
    floor: function (p, beat) { return Meter.barAt(p, beat).start; },                       // the bar line at or before a beat
    ceil: function (p, beat) { var a = Meter.barAt(p, beat - 1e-9); return beat - a.start < 1e-9 ? a.start : a.start + a.len; },     // the bar line at or after a beat
    nearest: function (p, beat) { var a = Meter.barAt(p, beat); return beat - a.start < a.len / 2 ? a.start : a.start + a.len; },
    // n bars (may be fractional) from the bar at `start`, in beats; and the other way
    lenOfBars: function (p, start, n) { var b = Meter.barAt(p, start).bar, w = Math.floor(n + 1e-9), s0 = Meter.barStart(p, b);
      return Meter.barStart(p, b + w) - s0 + (n - w) * Meter.barLen(p, b + w); },
    barsOfLen: function (p, start, len) { var b = Meter.barAt(p, start).bar, k = 0, sum = 0, l;
      while (k < 5000 && sum + (l = Meter.barLen(p, b + k)) <= len + 1e-9) { sum += l; k++; }
      return Math.round((k + (len - sum) / Meter.barLen(p, b + k)) * 100) / 100; },
    // 2 = a bar line, 1 = the start of a group (a beat), 0 = neither
    level: function (p, beat) { var a = Meter.barAt(p, beat + 1e-9); if (Math.abs(beat - a.start) < 1e-6) return 2; var s = 0, hit = 0;
      Meter.groups(a.ts).forEach(function (g) { if (Math.abs(a.start + s - beat) < 1e-6) hit = 1; s += g; }); return hit; },
    // the clicks in [b0, b1): [{ b, accent }]
    clicks: function (p, b0, b1) {
      var out = [], a = Meter.barAt(p, b0), bar = a.bar, s = a.start;
      while (s < b1 - 1e-9) { var t = s; Meter.groups(Meter.tsOfBar(p, bar)).forEach(function (g, i) { if (t >= b0 - 1e-9 && t < b1 - 1e-9) out.push({ b: t, accent: i === 0 }); t += g; });
        s += Meter.barLen(p, bar); bar++; }
      return out;
    },
    // where a beat is: { bar (1-based), beat (1-based group), sub (1-based sixteenth in the group) }
    where: function (p, b) { var a = Meter.barAt(p, b), s = 0, gi = 0, gs = Meter.groups(a.ts), x = Math.max(0, a.into);
      for (var i = 0; i < gs.length; i++) { if (x < s + gs[i] - 1e-9) { gi = i; break; } s += gs[i]; gi = i; }
      return { bar: a.bar + 1, beat: gi + 1, sub: Math.floor((x - s) * 4 + 1e-9) + 1 }; },
    // a typed position "bar.beat.sixteenth" (1-based; "6", "6.3", "6.1.4"; . or : between) -> { pos (beats) } or { error }. A beat is a group of the bar's meter (a dotted quarter in 6/8), as the position readout counts.
    parsePos: function (p, text) {
      var m = /^\s*(\d+)(?:\s*[.:]\s*(\d+))?(?:\s*[.:]\s*(\d+))?\s*$/.exec(String(text)); if (!m) return { error: 'Type a position as bar.beat.sixteenth: 6.1.4, 6.3 or just 6.' };
      var bar = +m[1], beat = m[2] ? +m[2] : 1, sub = m[3] ? +m[3] : 1;
      if (bar < 1 || bar > p.bars) return { error: 'The song has ' + p.bars + ' bar' + (p.bars > 1 ? 's' : '') + ': bar ' + bar + ' is not there.' };
      var ts = Meter.tsOfBar(p, bar - 1), gs = Meter.groups(ts); if (beat < 1 || beat > gs.length) return { error: 'Bar ' + bar + ' is in ' + Meter.str(ts) + ': it has ' + gs.length + ' beat' + (gs.length > 1 ? 's' : '') + ', not ' + beat + '.' };
      var subs = Math.max(1, Math.round(gs[beat - 1] * 4)); if (sub < 1 || sub > subs) return { error: 'Beat ' + beat + ' of bar ' + bar + ' has ' + subs + ' sixteenth' + (subs > 1 ? 's' : '') + ', not ' + sub + '.' };
      var at = Meter.barStart(p, bar - 1); for (var i = 0; i < beat - 1; i++) at += gs[i]; return { pos: at + (sub - 1) / 4 };
    },
    // set the meter from a bar on (bar 0 = the project's own); a change equal to the meter before it is dropped
    set: function (p, bar, ts) {
      if (bar <= 0) { p.ts = ts.slice(); return; }
      p.tsMap = (p.tsMap || []).filter(function (c) { return c.bar !== bar; }); p.tsMap.push({ bar: bar, ts: ts.slice() }); p.tsMap.sort(function (a, b) { return a.bar - b.bar; });
      p.tsMap = p.tsMap.filter(function (c, i) { var before = i ? p.tsMap[i - 1].ts : p.ts; return before.join('/') !== c.ts.join('/'); });
    },
    // old projects have no meter: 4/4
    norm: function (p) { if (!Meter.ok(p.ts)) p.ts = [4, 4]; if (!Array.isArray(p.scenes)) p.scenes = []; p.tsMap = Array.isArray(p.tsMap) ? p.tsMap.filter(function (c) { return c && c.bar > 0 && Meter.ok(c.ts); }) : []; return p; }
  };

  // ---------------- volume automation ----------------
  var AUTO_MIN = -60, AUTO_MAX = 6;
  function autoPts(tr) { return tr && tr.auto && tr.auto.vol && tr.auto.vol.length ? tr.auto.vol : null; }
  // the level (dB) a point list gives at a beat: held before the first point and after the last, a straight line in dB between
  function autoAt(pts, beat) {
    if (!pts || !pts.length) return null; if (beat <= pts[0].t) return pts[0].v; var last = pts[pts.length - 1]; if (beat >= last.t) return last.v;
    for (var i = 1; i < pts.length; i++) if (beat < pts[i].t) { var a = pts[i - 1], b = pts[i]; return b.t === a.t ? b.v : a.v + (b.v - a.v) * (beat - a.t) / (b.t - a.t); }
    return last.v;
  }
  function dbToCc(db) { return db <= AUTO_MIN ? 0 : Math.min(127, Math.max(0, Math.round(127 * Math.pow(10, db / 40)))); }
  function ccToDb(v) { return v <= 0 ? AUTO_MIN : 40 * Math.log10(v / 127); }
  // CC 7 events [{ tick, v }] for a point list: the first level at tick 0, then a change at most every sixteenth along each line, and the last point
  function autoToCc(pts, ppq) {
    var out = [], last = -1; function put(t, v) { if (v !== last) { out.push({ tick: Math.round(t * ppq), v: v }); last = v; } }
    put(0, dbToCc(pts[0].v));
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i];
      for (var t = a.t; t < b.t - 1e-9; t += 0.25) put(t, dbToCc(autoAt(pts, t)));
      put(b.t, dbToCc(b.v)); }
    return out;
  }
  // CC 7 events read from a file onto a track: one constant value sets the fader, anything else becomes points (straight runs thinned to 0.5 dB)
  function ccToTrack(tr, cc, div) {
    var pts = []; cc.sort(function (a, b) { return a.tick - b.tick; });
    cc.forEach(function (e) { var t = e.tick / div, v = Math.round(ccToDb(e.v) * 100) / 100; if (pts.length && pts[pts.length - 1].t === t) pts[pts.length - 1].v = v; else pts.push({ t: t, v: v }); });
    if (!pts.length) return 0;
    if (pts.every(function (q) { return q.v === pts[0].v; })) { tr.vol = clamp(Math.round(pts[0].v * 2) / 2, AUTO_MIN, AUTO_MAX); return 0; }
    var keep = [pts[0]]; for (var i = 1; i < pts.length - 1; i++) { var a = keep[keep.length - 1], b = pts[i + 1];
      var line = b.t === a.t ? b.v : a.v + (b.v - a.v) * (pts[i].t - a.t) / (b.t - a.t); if (Math.abs(pts[i].v - line) > 0.5) keep.push(pts[i]); }
    keep.push(pts[pts.length - 1]); tr.auto = { vol: keep.map(function (q) { return { t: Math.round(q.t * 480) / 480, v: clamp(q.v, AUTO_MIN, AUTO_MAX) }; }) }; return keep.length;
  }

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
    // "The Lion Sleeps Tonight": the I-IV-I-V roots in F (the progression as commonly taught; check by ear against the record: unverified).
    // The scenes are ours, not a transcription: same roots, different players. See lessons/daw-session.qmd.
    lion: function () {
      var roots = [41, 46, 41, 48], tri = [[53, 57, 60], [53, 58, 62], [53, 57, 60], [55, 60, 64]];     // F  Bb(/F)  F  C(/G): the top three notes move least
      function bassWhole(rs) { var n = []; rs.forEach(function (r, i) { n.push({ t: i * 4, d: 4, m: r, v: 0.8 }); }); return { start: 0, len: rs.length * 4, notes: n }; }
      function chant(cs) { var n = []; cs.forEach(function (c, i) { [0, 1, 2, 1, 0, 1, 2, 1].forEach(function (k, j) { n.push({ t: i * 4 + j * 0.5, d: 0.5, m: c[k] + 12, v: j % 4 === 0 ? 0.7 : 0.5 }); }); }); return { start: 0, len: cs.length * 4, notes: n }; }
      function drums(bars) { var c = beatClip(0, bars); return c; }
      var V = [48], Vt = [[55, 60, 64]];
      return { tempo: 112, bars: 16, key: 5, quant: 'bar', view: 'session', loop: { on: true, from: 0, to: 4 }, click: false,
        scenes: [{ name: 'Intro' }, { name: 'Groove' }, { name: 'Chant' }, { name: 'Break' }],
        tracks: [
          track('Drums', 'kit', [], { slots: [null, drums(4), drums(4), null] }),
          track('Bass', 'ebass', [], { slots: [bassWhole(roots), rootClip(0, roots), rootClip(0, roots), bassWhole(V.concat(V))] }),
          track('Pad', 'hammond', [], { slots: [chordClip(0, tri), chordClip(0, tri), chordClip(0, tri), chordClip(0, Vt.concat(Vt))] }),
          track('Chant', 'rhodes', [], { slots: [null, null, chant(tri), null] })] };
    },
    // the same song as one 4-bar loop in the Arrangement (no scenes yet): the start of daw-session.qmd
    lionloop: function () {
      var roots = [41, 46, 41, 48], tri = [[53, 57, 60], [53, 58, 62], [53, 57, 60], [55, 60, 64]];
      return { tempo: 112, bars: 8, key: 5, quant: 'bar', view: 'arr', loop: { on: true, from: 0, to: 4 }, click: false, scenes: [], tracks: [
        track('Drums', 'kit', [beatClip(0, 4)]), track('Bass', 'ebass', [rootClip(0, roots)]), track('Pad', 'hammond', [chordClip(0, tri)]), track('Chant', 'rhodes')] };
    },
    // the opening of the "Ode to Joy" theme (Beethoven, Symphony No. 9, finale; public domain), every note exactly on the grid at one velocity: the start of daw-notation.qmd
    ode: function () {
      var seq = [[64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, 0.5], [62, 2]], t = 0, notes = [];
      seq.forEach(function (x) { notes.push({ t: t, d: x[1], m: x[0], v: 0.6 }); t += x[1]; });
      return { tempo: 100, bars: 4, loop: { on: false, from: 0, to: 4 }, click: false, scenes: [], tracks: [track('Melody', 'piano', [{ start: 0, len: 16, notes: notes }])] };
    },
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
  // buses (only with data-fx, track-sound.js): the track also has three insert slots between input and auto, and a send to each of two buses (reverb, delay) after the fader
  function makeStrip(ctx, dest, buses) {
    var input = ctx.createGain(), auto = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), fader = ctx.createGain(), meter = ctx.createAnalyser();
    meter.fftSize = 1024; auto.connect(pan); pan.connect(fader); fader.connect(meter); meter.connect(dest);     // (auto: the volume automation's level; 1 when the track has none)
    var strip = { input: input, auto: auto, pan: pan, fader: fader, meter: meter }, TS = global.MiniDaw && global.MiniDaw.TrackSound;
    if (buses && TS && TS.addInserts) TS.addInserts(ctx, strip, buses); else input.connect(auto);
    return strip;
  }
  function levelOf(an, buf) { an.getFloatTimeDomainData(buf); var p = 0; for (var i = 0; i < buf.length; i++) { var a = Math.abs(buf[i]); if (a > p) p = a; } return p; }
  function click(ctx, when, accent, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = accent ? 1760 : 1175; o.type = 'square';
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.18, when + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    o.connect(g); g.connect(dest); o.start(when); o.stop(when + 0.06);
  }
  function playNote(b, tr, n, when, secs, dest) {
    if (instOf(tr.inst).synth) return global.MiniDaw.TrackSound && global.MiniDaw.TrackSound.playSynth ? global.MiniDaw.TrackSound.playSynth(tr, n, when, secs, dest) : null;
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
  // the time signature meta events (0x58): the project's, and each change at its bar line; 24 MIDI clocks a quarter click, 36 a dotted quarter
  function tsEvents(p) {
    var list = [{ bar: 0, ts: Meter.ok(p.ts) ? p.ts : [4, 4] }].concat((p.tsMap || []).filter(function (c) { return c.bar > 0 && c.bar < p.bars && Meter.ok(c.ts); }));
    return list.map(function (c) { var g = Meter.groups(c.ts)[0], cc = Math.round(g * 24); return { tick: Math.round(Meter.barStart(p, c.bar) * 480), o: 0, bytes: [0xff, 0x58, 4, c.ts[0], Math.log2(c.ts[1]), cc, 8] }; });
  }
  function toMidi(p) {
    var ppq = 480, GM = (global.BandMidi && global.BandMidi.GM) || {}, chunks = [];
    var us = Math.round(60000000 / p.tempo);
    chunks.push(trackChunk([{ tick: 0, o: 0, bytes: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] }].concat(tsEvents(p))));
    var ch = 0;
    p.tracks.forEach(function (tr) {
      if (isAudio(tr)) return;
      var drum = isDrum(tr), c = drum ? 9 : (ch === 9 ? ++ch : ch), evs = []; if (!drum) ch++;
      var name = strBytes(tr.name); evs.push({ tick: 0, o: 0, bytes: [0xff, 0x03].concat(vlq(name.length), name) });
      if (!drum) evs.push({ tick: 0, o: 0, bytes: [0xc0 | c, GM_PROGRAM[tr.inst] || 0] });
      if (autoPts(tr)) autoToCc(autoPts(tr), ppq).forEach(function (e) { evs.push({ tick: e.tick, o: 0, bytes: [0xb0 | c, 7, e.v] }); });
      if (global.MiniDaw.TrackSound && global.MiniDaw.TrackSound.midiExtra) global.MiniDaw.TrackSound.midiExtra(tr, c, ppq, evs, p);
      tr.clips.forEach(function (cl) { cl.notes.forEach(function (n) {
        if (n.t >= cl.len) return; var key = drum ? GM[n.m] : n.m; if (key == null) return;
        var on = Math.round((cl.start + n.t) * ppq), off = on + Math.max(1, Math.round((drum ? 0.125 : Math.min(n.d, cl.len - n.t)) * ppq));
        evs.push({ tick: on, o: 2, bytes: [0x90 | c, key, clamp(Math.round(n.v * 127), 1, 127)] }, { tick: off, o: 1, bytes: [0x80 | c, key, 0] }); }); });
      chunks.push(trackChunk(evs));
    });
    var head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (chunks.length >> 8) & 255, chunks.length & 255, (ppq >> 8) & 255, ppq & 255];
    return new Uint8Array(chunks.reduce(function (a, c) { return a.concat(c); }, head));
  }
  // ---------------- reading a MIDI file ----------------
  // fromMidi(bytes) -> { project, notes: [what was left out or changed] }. Any Standard MIDI File (format 0 or 1): one DAW track per
  // file track and channel, one clip each from the top. Channel 10 becomes the drum kit (GM notes back to kit pieces; a track of only
  // conga notes becomes the congas), other channels the nearest of this DAW's instruments by GM program. Times stay in quarter notes,
  // a file's time signatures (meta 0x58) become the project's meter and meter changes (one that falls mid-bar moves to the next bar line); only the first tempo is kept.
  var GM_KIT = { 35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'snare', 40: 'snare', 42: 'hatClosed', 44: 'hatClosed', 46: 'hatOpen',
    49: 'crash', 52: 'crash', 55: 'crash', 57: 'crash', 51: 'ride', 53: 'ride', 59: 'ride', 41: 'tomLo', 43: 'tomLo', 45: 'tomMid', 47: 'tomMid', 48: 'tomHi', 50: 'tomHi' };
  var GM_CONGA = { 62: 'congaMute', 63: 'congaOpen', 64: 'tumbaOpen' };
  function instOfProgram(pg) {
    return pg === 32 ? 'bass' : pg >= 33 && pg <= 39 ? 'ebass' : pg >= 4 && pg <= 7 ? 'rhodes' : pg >= 16 && pg <= 23 ? 'hammond'
      : pg === 24 || pg === 25 ? 'aguitar' : pg >= 26 && pg <= 28 ? 'clguitar' : pg >= 29 && pg <= 31 ? 'odguitar' : 'piano';
  }
  function fromMidi(bytes) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), pos = 0, notes = [];
    function u(n) { var v = 0; for (var i = 0; i < n; i++) v = v * 256 + b[pos++]; return v; }
    function str4() { var s = String.fromCharCode(b[pos], b[pos + 1], b[pos + 2], b[pos + 3]); pos += 4; return s; }
    function vl() { var v = 0, c; do { c = b[pos++]; v = v * 128 + (c & 0x7f); } while (c & 0x80 && pos < b.length); return v; }
    if (b.length < 14 || str4() !== 'MThd') throw new Error('not a MIDI file');
    var hl = u(4), fmt = u(2), ntr = u(2), div = u(2); pos = 8 + hl;
    if (div & 0x8000) throw new Error('SMPTE-timed MIDI files are not supported');
    if (fmt === 2) notes.push('a format 2 file: its patterns are laid end to end');
    var tempos = [], sigs = [], lanes = {}, order = [], endTick = 0, offset = 0, cc7 = {}, autoTracks = 0;
    for (var t = 0; t < ntr && pos + 8 <= b.length; t++) {
      var id = str4(), len = u(4), end = Math.min(b.length, pos + len);
      if (id !== 'MTrk') { pos = end; continue; }
      var tick = fmt === 2 ? offset : 0, run = 0, tname = '', prog = {}, open = {};
      while (pos < end) {
        tick += vl(); var st = b[pos];
        if (st === 0xff) { pos++; var ty = b[pos++], ml = vl(), d = b.subarray(pos, pos + ml); pos += ml;
          if (ty === 0x51 && ml === 3) tempos.push({ tick: tick, us: d[0] * 65536 + d[1] * 256 + d[2] });
          else if (ty === 0x58 && ml >= 2 && d[1] <= 4) sigs.push({ tick: tick, ts: [d[0], 1 << d[1]] });
          else if ((ty === 0x03 || ty === 0x04) && !tname) tname = String.fromCharCode.apply(null, d).replace(/[^\x20-\x7e]/g, '').trim();
          else if (ty === 0x2f) break; continue; }
        if (st === 0xf0 || st === 0xf7) { pos++; pos += vl(); continue; }
        if (st & 0x80) { run = st; pos++; } else if (!run) { pos++; continue; }
        var hi = run & 0xf0, ch = run & 15, d1 = b[pos++], d2 = hi === 0xc0 || hi === 0xd0 ? 0 : b[pos++];
        if (hi === 0xc0) { prog[ch] = d1; continue; }
        if (hi === 0xb0) { if (d1 === 7) { var ck = t + ':' + ch; (cc7[ck] = cc7[ck] || []).push({ tick: tick, v: d2 }); } continue; }
        if (hi !== 0x90 && hi !== 0x80) continue;
        var key = t + ':' + ch, ln = lanes[key];
        if (!ln) { ln = lanes[key] = { ch: ch, name: tname, prog: null, notes: [] }; order.push(key); }
        if (ln.prog == null && prog[ch] != null) ln.prog = prog[ch];
        if (!ln.name && tname) ln.name = tname;
        var k = ch + ':' + d1;
        if (hi === 0x90 && d2 > 0) { (open[k] = open[k] || []).push(ln.notes.length); ln.notes.push({ on: tick, off: null, m: d1, v: d2 / 127 }); }
        else { var q = open[k]; if (q && q.length) ln.notes[q.shift()].off = tick; }
        if (tick > endTick) endTick = tick;
      }
      order.forEach(function (kk) { var l = lanes[kk]; if (kk.split(':')[0] === String(t) && l.prog == null && prog[l.ch] != null) l.prog = prog[l.ch]; });   // a program change after the first note
      if (fmt === 2) offset = tick;
      pos = end;
    }
    tempos.sort(function (a, c) { return a.tick - c.tick; });
    var tempo = tempos.length ? Math.round(60000000 / tempos[0].us) : 120;
    if (tempos.some(function (x) { return Math.abs(Math.round(60000000 / x.us) - tempo) > 0; })) notes.push('the tempo changes in the file; the DAW keeps ' + tempo + ' BPM');
    if (tempo < 40 || tempo > 220) { notes.push('tempo ' + tempo + ' BPM set to ' + clamp(tempo, 40, 220)); tempo = clamp(tempo, 40, 220); }
    var mp = { ts: [4, 4], tsMap: [], bars: 64 };
    sigs.sort(function (a, c) { return a.tick - c.tick; }); var curBar = 0, curBeat = 0, curTs = [4, 4], moved = 0, bad = 0;
    sigs.forEach(function (s) { if (!Meter.ok(s.ts)) { bad++; return; }
      if (s.tick <= 0) { mp.ts = s.ts; curTs = s.ts; return; }
      var x = (s.tick / div - curBeat) / Meter.beats(curTs), k = Math.ceil(x - 0.01); if (Math.abs(x - Math.round(x)) > 0.01) moved++;
      var bar = curBar + k; if (s.ts.join() === curTs.join()) return; if (bar <= curBar && mp.tsMap.length) { mp.tsMap.pop(); }
      if (bar <= 0) { mp.ts = s.ts; } else mp.tsMap.push({ bar: bar, ts: s.ts });
      curBeat += k * Meter.beats(curTs); curBar = bar; curTs = s.ts; });
    Meter.norm(mp); if (moved) notes.push(moved + ' time signature change' + (moved > 1 ? 's' : '') + ' in the middle of a bar moved to the next bar line'); if (bad) notes.push('a time signature this DAW cannot show was ignored');
    var endBeat = endTick / div, bars = Math.max(1, endBeat > 0 ? Meter.barAt(mp, endBeat - 1e-6).bar + 1 : 1);
    if (bars > 64) { notes.push('cut to the first 64 bars (it has ' + bars + ')'); bars = 64; }
    mp.bars = bars; var beats = Meter.total(mp);
    var tracks = [], dropped = 0, used = {};
    order.forEach(function (kk) {
      var ln = lanes[kk]; if (!ln.notes.length) return;
      var drum = ln.ch === 9, conga = drum && ln.notes.every(function (n) { return GM_CONGA[n.m]; });
      var inst = conga ? 'congas' : drum ? 'kit' : instOfProgram(ln.prog || 0), out = [];
      ln.notes.forEach(function (n) {
        var t0 = n.on / div; if (t0 >= beats) return;
        var m = conga ? GM_CONGA[n.m] : drum ? GM_KIT[n.m] : n.m; if (m == null) { dropped++; return; }
        var d = drum ? 0.25 : Math.max(1 / 48, ((n.off == null ? n.on + div / 2 : n.off) - n.on) / div);
        out.push({ t: Math.round(t0 * 480) / 480, d: Math.round(Math.min(d, beats - t0) * 480) / 480, m: m, v: clamp(n.v, 0.05, 1) });
      });
      if (!out.length) return;
      var name = ln.name || instOf(inst).label; if (used[name]) name += ' ' + (++used[name]); else used[name] = 1;
      var nt = track(name, inst, [{ start: 0, len: beats, notes: out }]); if (cc7[kk]) autoTracks += ccToTrack(nt, cc7[kk], div) ? 1 : 0; tracks.push(nt);
    });
    if (autoTracks) notes.push('volume automation (CC 7) read on ' + autoTracks + ' track' + (autoTracks > 1 ? 's' : ''));
    if (dropped) notes.push(dropped + ' drum hit' + (dropped > 1 ? 's' : '') + ' with no kit piece here left out');
    if (!tracks.length) throw new Error('no notes in the file');
    if (tracks.length > 12) { notes.push('only the first 12 of its ' + tracks.length + ' tracks'); tracks = tracks.slice(0, 12); }
    return { project: { tempo: tempo, bars: bars, ts: mp.ts, tsMap: mp.tsMap, loop: { on: false, from: 0, to: Math.min(4, bars) }, click: false, tracks: tracks }, notes: notes };
  }
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function unb64(s) { var t = atob(s), a = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a; }
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
  function chartAbc(chart, ts) {
    ts = Meter.ok(ts) ? ts : [4, 4]; var four = ts.join('/') === '4/4', sx = ts[0] * 16 / ts[1];     // 4/4 as before; other meters in sixteenths
    var bars = chart.split('|').map(function (b) { return b.trim(); }).filter(Boolean).map(function (b) {
      var c = b.split(/\s+/);
      if (four) { if (c.length > 1) { var h = 4 / c.length; return c.map(function (x) { return '"' + x + '"z' + h; }).join(' '); } return '"' + c[0] + '"z4'; }
      var each = Math.max(1, Math.floor(sx / c.length)); return c.map(function (x, i) { return '"' + x + '"z' + (i === c.length - 1 ? sx - each * (c.length - 1) : each); }).join(' '); });
    var rows = []; for (var i = 0; i < bars.length; i += 4) rows.push(bars.slice(i, i + 4).join(' | '));
    return { abc: 'X:1\nT:Chart\nM:' + ts.join('/') + '\nL:' + (four ? '1/4' : '1/16') + '\nK:C\n' + rows.join(' |\n') + ' |]', bars: bars.length };
  }
  // ---------------- feel: the band's human touches ----------------
  // The Backing Track's player (player.js, Session.fire) plays each note a little early or late and a little louder or softer than the pattern says: each
  // part sits at its own LAY (bass a touch ahead, comping behind), plus random JITTER (a triangle of two random numbers), the notes of a chord are rolled
  // low to high over up to STRUM seconds (a guitar strum over up to 28 ms, up-strokes high to low), and velocity wanders by VEL_JITTER. The patterns themselves are exactly on the
  // grid. applyFeel writes the same touches into a clip's notes (amt 1 = as the live band, 2 = twice as loose, 0 = none). The numbers come from BandPlayer.FEEL when
  // the band is loaded. Tempo is NOT touched: the band keeps one steady tempo, and so does this DAW.
  var FEEL_DEFAULT = { LAY: { bass: -0.006, comp: 0.008, comp2: 0.010, drums: 0, congas: 0.002 }, JITTER: { bass: 0.003, comp: 0.004, comp2: 0.004, drums: 0.002, congas: 0.003 }, STRUM: 0.010, VEL_JITTER: 0.06 };
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function partOfInst(inst) { return inst === 'kit' ? 'drums' : inst === 'congas' ? 'congas' : /bass/.test(inst) ? 'bass' : 'comp'; }
  // notes: [{ t, d, m, v, s? }] (s = 'down' | 'up' marks a strummed chord); changes them in place and returns them
  function applyFeel(notes, part, tempo, amt, rng, len) {
    if (!(amt > 0) || !notes.length) return notes;
    var F = (global.BandPlayer && global.BandPlayer.FEEL) || FEEL_DEFAULT, bps = tempo / 60, spb = 60 / tempo, lay = F.LAY[part] || 0, jit = F.JITTER[part] || 0, groups = [], by = {};
    notes.forEach(function (n) {
      if (part !== 'comp') { groups.push([n]); return; }
      var k = n.t.toFixed(4); if (by[k]) by[k].push(n); else groups.push(by[k] = [n]); });
    groups.forEach(function (g) {
      var off = (lay + (rng() + rng() - 1) * jit) * amt, strum = g[0].s, f = 1 + (rng() * 2 - 1) * F.VEL_JITTER * amt;
      if (g.length > 1) { g.sort(function (a, b) { return a.m - b.m; }); if (strum === 'up') g.reverse(); }
      var spread = (strum ? Math.min(0.028, 0.12 * spb) * (strum === 'up' ? 0.6 : 1) : rng() * F.STRUM) * amt;
      g.forEach(function (n, i) {
        var o = off + (g.length > 1 ? spread * i / (g.length - 1) : 0), t = n.t + o * bps;
        n.t = Math.round(clamp(t, 0, len != null ? Math.max(0, len - 0.002) : t) * 10000) / 10000; n.v = clamp(n.v * f, 0.05, 1); delete n.s; }); });
    return notes;
  }
  // over (optional, data-comp-menu): { rhythm: a BandCatalog.comp id, voicing: a BandHarmony.styleList id, comp: 'piano' | 'guitar' } overriding the style's own
  function bandParts(chart, styleId, tempo, times, ts, feel, over) {
    var G = global; if (!G.TuneChart || !G.BandMidi || !G.BandCatalog) throw new Error('The band is not loaded on this page.');
    var ch = chartAbc(chart, ts); if (!ch.bars) throw new Error('Type some chords first, bars split by |');
    over = over || {}; var so = G.BandCatalog.styleOpts(styleId, over.comp === 'piano' || over.comp === 'guitar' ? over.comp : undefined), opts = Object.assign({}, so.opts);
    if (over.rhythm) opts.compRhythm = over.rhythm; if (over.voicing) opts.voicing = over.voicing;
    var recs = G.BandMidi.generate(G.TuneChart.parse(ch.abc), { bars: ch.bars * (times || 1), tempo: tempo, opts: opts });
    var out = { bass: [], comp: [], drums: [], congas: [] };
    var off = 0;       // a bar is its beats long: dotted quarters when compound; the band counts 5/8 and 7/8 as 5 or 7 beats, so each is squeezed to an eighth (pos is in beats)
    recs.forEach(function (r, i) {
      var sw = G.BandMidi.swingOf(r), scale = r.compound ? 1.5 : r.meter && r.meter.d === 8 ? 0.5 : 1, bar0 = off; off += (r.beats || 4) * scale;
      Object.keys(out).forEach(function (p) { (r.parts[p] || []).forEach(function (e) {
        if (!e || !(e.pos >= 0)) return; var t = bar0 + (e.straight ? e.pos : G.BandMidi.warp(e.pos, sw)) * scale;
        t = Math.round(t * 48) / 48; var v = clamp(e.vel == null ? 0.7 : e.vel, 0.05, 1), d = Math.max(0.1, (e.dur || 0.5) * scale);
        if (p === 'drums' || p === 'congas') { if (e.piece) out[p].push({ t: t, d: 0.25, m: e.piece, v: v }); }
        else if (p === 'bass') { if (e.midi != null) out.bass.push({ t: t, d: d, m: e.midi, v: v }); }
        else (e.midis || []).forEach(function (m) { out.comp.push({ t: t, d: d, m: m, v: v, s: e.strum }); }); }); });
    });
    var len = off, rng = mulberry(feel && feel.seed != null ? feel.seed : (Math.random() * 4294967296) | 0);
    ['bass', 'comp', 'drums', 'congas'].forEach(function (p) { if (feel && feel.amt > 0) applyFeel(out[p], p, tempo, feel.amt, rng, len); else out[p].forEach(function (n) { delete n.s; }); });
    return { len: len, bars: ch.bars * (times || 1), bass: out.bass, comp: out.comp, drums: out.drums, congas: out.congas,
      bassInst: opts.bassSound === 'electric' ? 'ebass' : 'bass', compInst: compInst(opts.compSound) };
  }

  // the comping sound as one of this DAW's instruments
  function compInst(s) {
    if (instOf(s).id === s) return s;
    if (global.BandSounds.family(s) === 'guitar') return /^(a|n)guitar$/.test(s) ? 'aguitar' : /^d/.test(s) ? 'odguitar' : 'clguitar';
    return /epiano|wurli/.test(s) ? 'rhodes' : /organ/.test(s) ? 'hammond' : 'piano';
  }

  // ---------------- several projects, clipboard, zoom (opt-in: data-projects / data-clipboard / data-zoom) ----------------
  // Projects: index in "mdaw:<id>:projects" = [{ key, name, updated }], the current key in "mdaw:<id>:current". The single project a DAW had
  // before ("mdaw:<id>") becomes the first one under its own key; new ones get "mdaw:<id>:p<time><random>". Each project is stored alone
  // under its key. Recorded takes stay in IndexedDB by id (deleting a project leaves them). kv = { get(k), set(k, v), del(k) }.
  var Projects = {
    kvLocal: { get: function (k) { return store(k); }, set: function (k, v) { store(k, v); }, del: function (k) { store(k, null); } },
    uniqueName: function (ix, base) { var names = ix.map(function (e) { return e.name; }), n = base, i = 2; while (names.indexOf(n) >= 0) n = base + ' ' + (i++); return n; },
    // read the index (migrating the old single project in as the first one) and the current key
    open: function (kv, id, now) {
      var pk = 'mdaw:' + id + ':projects', ix = kv.get(pk);
      if (!Array.isArray(ix) || !ix.length) { ix = [{ key: 'mdaw:' + id, name: 'Project 1', updated: now || 0 }]; kv.set(pk, ix); }
      var cur = kv.get('mdaw:' + id + ':current'); if (!ix.some(function (e) { return e.key === cur; })) { cur = ix[0].key; kv.set('mdaw:' + id + ':current', cur); }
      return { index: ix, cur: cur };
    },
    add: function (kv, id, ix, name, data, now, rnd) {
      var e = { key: 'mdaw:' + id + ':p' + (now || 0).toString(36) + Math.floor((rnd == null ? Math.random() : rnd) * 1e6).toString(36), name: Projects.uniqueName(ix, name || 'Untitled'), updated: now || 0 };
      ix.push(e); if (data) kv.set(e.key, data); kv.set('mdaw:' + id + ':projects', ix); return e;
    },
    rename: function (kv, id, ix, key, name) { ix.forEach(function (e) { if (e.key === key) { var others = ix.filter(function (o) { return o !== e; }); e.name = Projects.uniqueName(others, String(name || '').trim() || 'Untitled'); } }); kv.set('mdaw:' + id + ':projects', ix); },
    touch: function (kv, id, ix, key, now) { ix.forEach(function (e) { if (e.key === key) e.updated = now; }); kv.set('mdaw:' + id + ':projects', ix); },
    // delete a project; returns the key to show next (a blank one is the caller's job when none is left: next === null)
    remove: function (kv, id, ix, key) {
      var at = -1; ix.forEach(function (e, i) { if (e.key === key) at = i; }); if (at < 0) return { index: ix, next: ix.length ? ix[0].key : null };
      ix.splice(at, 1); kv.del(key); kv.set('mdaw:' + id + ':projects', ix);
      var next = ix.length ? ix[Math.min(at, ix.length - 1)].key : null; return { index: ix, next: next };
    },
    setCurrent: function (kv, id, key) { kv.set('mdaw:' + id + ':current', key); }
  };
  // Clipboard: { kind: 'clip', clip, drum, audio } or { kind: 'notes', notes: [{ dt, d, m, v }] (dt from the earliest copied), drum }; kept in memory
  // and in localStorage "mdaw:clipboard" so a second DAW or project can paste it.
  var CLIPKEY = 'mdaw:clipboard', clipMem = null;
  var Clipboard = {
    copyNotes: function (clip, idx, drum) {
      var ns = idx.map(function (i) { return clip.notes[i]; }).filter(Boolean); if (!ns.length) return null;
      var t0 = Math.min.apply(null, ns.map(function (n) { return n.t; }));
      return { kind: 'notes', drum: !!drum, notes: ns.map(function (n) { return { dt: n.t - t0, d: n.d, m: n.m, v: n.v }; }) };
    },
    // paste notes into a clip at `at` beats from its start (snapped to `grid` when given), clipped to the clip; returns the indices of the new notes
    pasteNotes: function (clip, data, at, grid) {
      var a = grid ? Math.round(at / grid) * grid : at, out = [];
      data.notes.forEach(function (n) { var t = a + n.dt; if (t < -1e-9 || t >= clip.len - 1e-9) return;
        clip.notes.push({ t: t, d: Math.max(1e-6, Math.min(n.d, clip.len - t)), m: n.m, v: n.v }); out.push(clip.notes.length - 1); });
      return out;
    },
    copyClip: function (clip, drum, audio) { return { kind: 'clip', clip: JSON.parse(JSON.stringify(clip)), drum: !!drum, audio: !!audio }; },
    // paste a clip onto a track at `start`; the song grows (at most 64 bars) as Duplicate does; returns the new clip
    pasteClip: function (p, track, data, start) {
      var n = JSON.parse(JSON.stringify(data.clip)); n.start = Math.max(0, start); track.clips.push(n);
      if (n.start + n.len > Meter.total(p) + 1e-9) p.bars = Math.min(64, Meter.barAt(p, n.start + n.len - 1e-6).bar + 1);
      return n;
    },
    get: function () { return store(CLIPKEY) || clipMem; },
    set: function (d) { clipMem = d; store(CLIPKEY, d); }
  };
  var ZOOM_MIN = 0.15, ZOOM_MAX = 4, ZOOM_STEP = 1.4;
  function zoomBy(z, dir, lo, hi) { return clamp(Math.round(z * (dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP) * 1000) / 1000, lo || ZOOM_MIN, hi || ZOOM_MAX); }

  // ---------------- one DAW ----------------
  function Daw(node) {
    var d = node.dataset, self = this;
    this.node = node; this.id = d.id || 'default'; this.storeKey = 'mdaw:' + this.id; this.presetName = d.preset || 'empty';
    this.projects = d.projects != null; this.useClip = d.clipboard != null; this.useZoom = d.zoom != null;
    this.navOn = d.nav != null; this.useOrgan = d.organ != null; this.useFx = d.fx != null; this.useSynth = d.synth != null;     // opt-in track sound (track-sound.js)
    if (this.projects) { var po = Projects.open(Projects.kvLocal, this.id, Date.now()); this.pIndex = po.index; this.storeKey = po.cur; }
    this.zoom = { arr: 1, rx: 1, ry: 1 }; if (this.useZoom) { var zs = store('mdaw:' + this.id + ':zoom'); if (zs) { this.zoom.arr = clamp(+zs.arr || 1, ZOOM_MIN, ZOOM_MAX); this.zoom.rx = clamp(+zs.rx || 1, 0.3, 3); this.zoom.ry = clamp(+zs.ry || 1, 0.5, 3); } }
    var show = (d.show || 'transport tracks editor mixer band files record').split(/\s+/); this.show = {}; show.forEach(function (s) { self.show[s] = true; });
    this.p = Meter.norm(store(this.storeKey) || this.fresh());
    this.sel = { track: 0, clip: this.p.tracks[0] && this.p.tracks[0].clips.length ? 0 : -1, notes: [] };
    this.undo = []; this.redo = []; this.grid = 0.25; this.playing = false; this.recording = false; this.pos = 0; this.keysOn = false; this.octave = 0;
    this.strips = []; this.build(); this.renderAll(); this.loadTakes();
  };
  Daw.prototype.loadTakes = function () {
    var self = this, want = [];
    this.p.tracks.forEach(function (t) { t.clips.forEach(function (c) { if (c.take && !TAKES[c.take] && want.indexOf(c.take) < 0) want.push(c.take); }); });
    want.forEach(function (id) { getTake(id).then(function (r) { if (r && !TAKES[id]) { makeTake(id, r.data, r.rate); self.renderTracks(); self.renderEditor(); } }); });
  };
  Daw.prototype.fresh = function () { var p = PRESETS[this.presetName] ? PRESETS[this.presetName]() : PRESETS.empty(); if (this.node.dataset.bars) p.bars = +this.node.dataset.bars; var ts = Meter.parse(this.node.dataset.ts); if (ts) p.ts = ts; return Meter.norm(p); };
  Daw.prototype.save = function () { store(this.storeKey, this.p); if (this.projects) Projects.touch(Projects.kvLocal, this.id, this.pIndex, this.storeKey, Date.now()); };
  Daw.prototype.curProject = function () { var k = this.storeKey, r = null; this.pIndex.forEach(function (e) { if (e.key === k) r = e; }); return r; };
  // switch to another stored project (a blank one when `fresh`); undo history is per project, so it is cleared
  Daw.prototype.openProject = function (key, freshP) {
    if (this.playing) this.stop(); if (this.sessOn && this.sessStopAll) this.sessStopAll();
    store(this.storeKey, this.p); this.storeKey = key; Projects.setCurrent(Projects.kvLocal, this.id, key);
    this.p = Meter.norm(freshP || store(key) || this.fresh()); if (freshP) store(key, this.p);
    this.sel = { track: 0, clip: this.p.tracks[0] && this.p.tracks[0].clips.length ? 0 : -1, notes: [] }; this.undo = []; this.redo = []; this.pos = 0;
    this.renderProjects(); this.renderAll(); this.setPos(0); this.loadTakes();
  };
  Daw.prototype.blankProject = function () { var p = PRESETS.empty(); if (this.node.dataset.bars) p.bars = +this.node.dataset.bars; var ts = Meter.parse(this.node.dataset.ts); if (ts) p.ts = ts; return Meter.norm(p); };
  Daw.prototype.renderProjects = function () {
    if (!this.projSel) return; var cur = this.curProject(); this.projSel.innerHTML = '';
    this.pIndex.forEach(function (e) { var o = el('option', null, e.name); o.value = e.key; this.projSel.appendChild(o); }, this);
    this.projSel.value = this.storeKey; this.projName.value = cur ? cur.name : '';
  };
  Daw.prototype.buildProjects = function () {
    var self = this, row = el('div', 'mdaw-tools mdaw-projects'); this.node.insertBefore(row, this.node.firstChild);
    row.appendChild(el('span', 'mdaw-sub', 'Project'));
    this.projName = el('input'); this.projName.type = 'text'; this.projName.setAttribute('aria-label', 'Project name (rename)'); this.projName.maxLength = 60;
    this.projSel = el('select'); this.projSel.setAttribute('aria-label', 'Saved projects (switch)');
    var bNew = btn('New', 'A new blank project'), bDup = btn('Duplicate', 'Copy this project under a new name'), bDel = btn('Delete', 'Delete this project');
    this.projName.onchange = function () { Projects.rename(Projects.kvLocal, self.id, self.pIndex, self.storeKey, self.projName.value); self.renderProjects(); };
    this.projSel.onchange = function () { self.openProject(self.projSel.value); self.say('Opened ' + self.curProject().name + '.'); };
    bNew.onclick = function () { store(self.storeKey, self.p); var e = Projects.add(Projects.kvLocal, self.id, self.pIndex, 'Project', null, Date.now()); self.openProject(e.key, self.blankProject()); self.say('New blank project ' + e.name + '.'); };
    bDup.onclick = function () { store(self.storeKey, self.p); var e = Projects.add(Projects.kvLocal, self.id, self.pIndex, self.curProject().name + ' copy', JSON.parse(JSON.stringify(self.p)), Date.now()); self.openProject(e.key); self.say('Duplicated as ' + e.name + '.'); };
    bDel.onclick = function () { var cur = self.curProject(); if (!confirm('Delete the project "' + cur.name + '"? This cannot be undone.')) return;
      var r = Projects.remove(Projects.kvLocal, self.id, self.pIndex, cur.key);
      if (r.next) self.openProject(r.next); else { var e = Projects.add(Projects.kvLocal, self.id, self.pIndex, 'Project 1', null, Date.now()); self.openProject(e.key, self.blankProject()); }
      self.say('Deleted ' + cur.name + '.'); };
    [this.projName, this.projSel, bNew, bDup, bDel].forEach(function (x) { row.appendChild(x); });
    this.renderProjects();
  };
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
    if (s.slot >= 0 && !(tr && (tr.slots || [])[s.slot])) s.slot = -1;
    if (!tr || s.clip >= tr.clips.length) s.clip = tr && tr.clips.length ? tr.clips.length - 1 : -1; s.notes = [];
  };
  // a MIDI file in place of the song (undoable)
  Daw.prototype.openMidi = function (bytes, name) {
    var r; try { r = fromMidi(bytes); } catch (e) { return this.say('Could not open ' + (name || 'the MIDI file') + ': ' + e.message), false; }
    var self = this; this.stop();
    this.change(function () { self.p = r.project; self.sel = { track: 0, clip: 0, notes: [] }; self.pos = 0; });
    this.say('Opened ' + (name || 'the MIDI file') + ': ' + r.project.tracks.length + ' tracks, ' + r.project.bars + ' bars of ' + Meter.str(r.project.ts) + (r.project.tsMap.length ? ' (meter changes: ' + r.project.tsMap.map(function (c) { return 'bar ' + (c.bar + 1) + ' ' + Meter.str(c.ts); }).join(', ') + ')' : '') + ', ' + r.project.tempo + ' BPM' + (r.notes.length ? ' (' + r.notes.join('; ') + ')' : '') + '. Undo puts your song back.');
    return true;
  };
  Daw.prototype.say = function (t) { this.statusEl.textContent = t; };
  Daw.prototype.track = function () { return this.p.tracks[this.sel.track]; };
  Daw.prototype.clip = function () { var tr = this.track(); if (tr && this.sel.slot >= 0) return (tr.slots || [])[this.sel.slot] || null; return tr && this.sel.clip >= 0 ? tr.clips[this.sel.clip] : null; };

  Daw.prototype.build = function () {
    var self = this, n = this.node, d = n.dataset; n.innerHTML = ''; n.tabIndex = 0; n.setAttribute('role', 'application'); n.setAttribute('aria-label', 'A small DAW');
    if (this.projects) this.buildProjects();
    // transport
    var tb = this.tb = el('div', 'mdaw-transport'); n.appendChild(tb);
    this.bHome = btn('⏮', 'Back to the start (Home)'); this.bPlay = btn('▶ Play', 'Play / stop (Space)', 'mdaw-play'); this.bRec = btn('● Rec', 'Record into the selected track (R)', 'mdaw-rec');
    this.bLoop = btn('⟲ Loop', 'Loop (cycle) the bracket on the ruler (O)'); this.bClick = btn('♩ Click', 'Metronome (C)');
    this.posEl = el('span', 'mdaw-pos', '1.1.1'); this.posEl.title = 'Bar . beat . sixteenth. Click (or press G) to type a position: 6.1.4, 6.3 or 6, then Enter'; this.posEl.style.cursor = 'text'; this.posEl.tabIndex = 0; this.posEl.setAttribute('role', 'button'); this.posEl.onclick = function () { self.editPos(); }; this.posEl.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); self.editPos(); } };
    var tl = el('label', 'mdaw-lbl', 'Tempo '); this.tempoIn = el('input'); this.tempoIn.type = 'number'; this.tempoIn.min = 40; this.tempoIn.max = 220; this.tempoIn.setAttribute('aria-label', 'Tempo in BPM'); tl.appendChild(this.tempoIn); tl.appendChild(document.createTextNode(' BPM'));
    this.bUndo = btn('↶', 'Undo (Ctrl/Cmd+Z)'); this.bRedo = btn('↷', 'Redo (Ctrl/Cmd+Shift+Z)');
    this.bMon = btn('🎧 Monitor', 'Hear the microphone through the track as you record (use headphones!)');
    this.inMeter = el('span', 'mdaw-in'); this.inMeter.title = 'Microphone level'; this.inFill = el('span', 'mdaw-infill'); this.inMeter.appendChild(this.inFill); this.inMeter.hidden = true;
    this.bKeys = btn('⌨ Keys', 'Play the selected track from the computer keyboard (A W S E D …)');
    [this.bHome, this.bPlay].forEach(function (b) { tb.appendChild(b); }); if (this.show.record) tb.appendChild(this.bRec);
    [this.bLoop, this.bClick, this.posEl, tl, this.bKeys, this.bMon, this.inMeter, this.bUndo, this.bRedo].forEach(function (b) { tb.appendChild(b); });
    this.statusEl = el('span', 'mdaw-status'); this.statusEl.setAttribute('aria-live', 'polite'); if (this.navOn) { n.classList.add('mdaw-nav'); if (global.MiniDaw.Nav) global.MiniDaw.Nav.build(this, tb); } tb.appendChild(this.statusEl);
    if (!this.show.transport) { [this.bLoop, this.bClick, tl, this.bKeys, this.bUndo, this.bRedo].forEach(function (b) { b.hidden = true; }); }
    this.bHome.onclick = function () { self.locate(0); }; this.bPlay.onclick = function () { self.toggle(); };
    this.bRec.onclick = function () { self.record(); };
    this.bLoop.onclick = function () { self.change(function () { self.p.loop.on = !self.p.loop.on; }); };
    this.bClick.onclick = function () { self.change(function () { self.p.click = !self.p.click; }); };
    this.bKeys.onclick = function () { self.keysOn = !self.keysOn; self.renderTransport(); self.node.focus(); };
    this.bMon.onclick = function () { self.monitor(!self.monOn); };
    this.bUndo.onclick = function () { self.doUndo(true); }; this.bRedo.onclick = function () { self.doUndo(false); };
    this.tempoIn.onchange = function () { var v = clamp(+self.tempoIn.value || 100, 40, 220); self.change(function () { self.p.tempo = v; }); if (self.playing || self.sessOn) self.reanchor(); };

    if (this.show.session && global.MiniDaw && global.MiniDaw.Session) global.MiniDaw.Session.build(this);
    // arrangement
    var arr = this.arr = el('div', 'mdaw-arr'); n.appendChild(arr); if (!this.show.tracks) arr.hidden = true;
    var tools = el('div', 'mdaw-tools'); arr.appendChild(tools);
    var addSel = el('select'); addSel.setAttribute('aria-label', 'Instrument for a new track'); INSTS.forEach(function (i) { if (i.synth && !self.useSynth) return; var o = el('option', null, i.label); o.value = i.id; addSel.appendChild(o); });
    var bAdd = btn('+ Track', 'Add a track with this instrument'); bAdd.onclick = function () { var inst = instOf(addSel.value);
      self.change(function () { self.p.tracks.push(track(inst.label, inst.id)); self.sel = { track: self.p.tracks.length - 1, clip: -1, notes: [] }; }); };
    var bNew = btn('+ Clip', 'New empty one-bar clip on the selected track, at the playhead'); bNew.onclick = function () { self.newClip(self.sel.track, Meter.floor(self.p, self.pos)); };
    var bDup = btn('Duplicate', 'Duplicate the clip after itself (Ctrl/Cmd+D)'); bDup.onclick = function () { self.duplicate(); };
    var bSplit = btn('Split', 'Split the clip at the playhead (S)'); bSplit.onclick = function () { self.split(); };
    var bJoin = btn('Join', 'Join the selected clip with the next one on the track (J; 3J joins three more)'); bJoin.onclick = function () { self.join(1); self.node.focus(); };
    var bDel = btn('Delete', 'Delete the selected clip (Delete)'); bDel.onclick = function () { self.deleteSel(); };
    var bLen = el('label', 'mdaw-lbl', 'Song '); this.barsIn = el('input'); this.barsIn.type = 'number'; this.barsIn.min = 1; this.barsIn.max = 64; this.barsIn.setAttribute('aria-label', 'Song length in bars'); bLen.appendChild(this.barsIn); bLen.appendChild(document.createTextNode(' bars'));
    this.barsIn.onchange = function () { var v = clamp(+self.barsIn.value || 8, 1, 64); self.change(function () { self.p.bars = v; }); };
    // time signature: the song's, or a change from a bar on
    var tsl = el('label', 'mdaw-lbl', 'Time '); this.tsSel = el('select'); this.tsSel.setAttribute('aria-label', 'Time signature'); tsl.appendChild(this.tsSel);
    this.tsBar = el('input'); this.tsBar.type = 'number'; this.tsBar.min = 1; this.tsBar.max = 64; this.tsBar.value = 1; this.tsBar.setAttribute('aria-label', 'From bar'); this.tsBar.title = 'The meter applies from this bar on (1 = the whole song)';
    var tsfrom = el('label', 'mdaw-lbl', 'from bar '); tsfrom.appendChild(this.tsBar); this.tsList = el('span', 'mdaw-tslist');
    this.tsBar.onchange = function () { self.renderTransport(); };
    this.tsSel.onchange = function () { var ts = Meter.parse(self.tsSel.value), bar = clamp(Math.round(+self.tsBar.value || 1), 1, self.p.bars) - 1; if (!ts) return;
      self.change(function () { Meter.set(self.p, bar, ts); }); if (self.playing) self.reanchor(); self.say('Time signature ' + Meter.str(ts) + (bar ? ' from bar ' + (bar + 1) : '') + '. Clips keep their place in beats; the bar lines moved.'); };
    this.tsList.onclick = function (e) { var b = e.target.closest && e.target.closest('button'); if (b) self.change(function () { self.p.tsMap = self.p.tsMap.filter(function (c) { return c.bar !== +b.dataset.bar; }); }); };
    [addSel, bAdd, bNew].forEach(function (x) { tools.appendChild(x); });
    if (this.useClip) { var bCopy = btn('Copy', 'Copy the selected clip, or the selected notes (Ctrl/Cmd+C)'), bPaste = btn('Paste', 'Paste at the playhead: a clip onto the selected track, notes into the open clip (Ctrl/Cmd+V)');
      bCopy.onclick = function () { self.copySel(false); self.node.focus(); }; bPaste.onclick = function () { self.paste(); self.node.focus(); }; tools.appendChild(bCopy); tools.appendChild(bPaste); }
    [bDup, bSplit, bJoin, bDel, bLen, tsl, tsfrom, this.tsList].forEach(function (x) { tools.appendChild(x); });
    if (this.useZoom) { this.zoomBar(tools, 'Zoom the arrangement (Ctrl/Cmd + and −)', 'arr'); }
    if (this.show.automation) { this.bAuto = btn('Volume lane', 'Show the selected track\'s volume automation lane (V)'); this.bAuto.onclick = function () { self.toggleAuto(); }; tools.appendChild(this.bAuto); }
    var grid = this.gridEl = el('div', 'mdaw-grid'); arr.appendChild(grid);
    arr.appendChild(el('p', 'mdaw-hint', 'Click a clip to select it, drag it to move it, drag its right edge to make it longer. Double-click an empty lane for a new clip. Drag along the ruler to set the loop; click it to move the playhead. From the keyboard (click the DAW first): ← → (or h l) playhead, ↑ ↓ (k j) track, [ ] clip, N new clip, P place the Session clip, Shift+arrows move the clip, - = resize it; Alt for beats instead of bars; a number first repeats the key (3l: three bars).'));

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
    this.clipLen.onchange = function () { var c = self.clip(); if (!c) return; var v = clamp(+self.clipLen.value || 1, 1, 32); self.change(function () { c.len = Meter.lenOfBars(self.p, c.start, v); }); };
    [gl, bQ, bQ50, bDn, bUp, bOd, bO, vl, cl].forEach(function (x) { et.appendChild(x); });
    if (this.useClip) { var eCopy = btn('Copy', 'Copy the selected notes (Ctrl/Cmd+C)'), ePaste = btn('Paste', 'Paste the copied notes at the playhead (Ctrl/Cmd+V)'); eCopy.onclick = function () { self.copySel(false); self.node.focus(); }; ePaste.onclick = function () { self.paste(); self.node.focus(); }; et.appendChild(eCopy); et.appendChild(ePaste); }
    if (this.useZoom) this.zoomBar(et, 'Zoom the roll: width (Ctrl/Cmd + and −, with the roll focused)', 'rx');
    this.midiTools = [gl, bQ, bQ50, vl];
    this.transposeBtns = [bUp, bDn, bO, bOd];
    this.roll = el('div', 'mdaw-roll'); ed.appendChild(this.roll);
    this.edHint = el('p', 'mdaw-hint'); ed.appendChild(this.edHint);

    // the selected track's sound: organ / effects / synth (track-sound.js; only with data-organ, data-fx or data-synth)
    if ((this.useOrgan || this.useFx || this.useSynth) && global.MiniDaw.TrackSound) global.MiniDaw.TrackSound.build(this);
    if ((d.abcEdit != null || d.fill != null) && global.MiniDaw.Compose) global.MiniDaw.Compose.build(this, d.abcEdit != null, d.fill != null);     // compose-tools.js

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
      var fl2 = el('label', 'mdaw-lbl', 'Feel '); this.feelSel = el('select'); this.feelSel.setAttribute('aria-label', 'Feel: how loosely the band plays');
      [['0', 'Tight (on the grid)'], ['1', 'Band feel'], ['2', 'Looser']].forEach(function (o) { var e2 = el('option', null, o[1]); e2.value = o[0]; self.feelSel.appendChild(e2); });
      this.feelSel.value = d.feel === 'band' ? '1' : d.feel === 'loose' ? '2' : '0'; this.feelSel.title = 'Band feel: each part a touch ahead or behind the beat, a little random, chords rolled, velocity wandering: as the Backing Track plays. Tempo stays steady.'; fl2.appendChild(this.feelSel);
      var bGo = btn('Write the parts', 'Make drum, bass and chord clips at the playhead', 'btn-primary'); bGo.onclick = function () { self.bandWrite(); };
      var bHum = btn('Humanize clip', 'Give the selected clip the band\'s feel (the Feel setting; Band feel if it is Tight). Once per clip: Quantize takes it out again.'); bHum.onclick = function () { self.humanize(); };
      var pl2 = el('label', 'mdaw-lbl', 'Parts '); this.partSel = el('select'); this.partSel.setAttribute('aria-label', 'Which parts to write');
      [['all', 'All parts'], ['drums', 'Drums only'], ['congas', 'Congas only'], ['bass', 'Bass only'], ['chords', 'Chords only']].forEach(function (o) { var e2 = el('option', null, o[1]); e2.value = o[0]; self.partSel.appendChild(e2); }); pl2.appendChild(this.partSel);
      var parts = [chl, sl, tml, fl2, pl2];
      if (this.show.session) { var to2 = el('label', 'mdaw-lbl', 'Write to '); this.toSel = el('select'); this.toSel.setAttribute('aria-label', 'Where the parts go');
        [['arr', 'Arrangement (at the playhead)'], ['session', 'Session (first free scene)']].forEach(function (o) { var e2 = el('option', null, o[1]); e2.value = o[0]; self.toSel.appendChild(e2); });
        this.toSel.title = 'Session: each part becomes a looping clip in the first scene where that track is free (a new scene if none is), so pressing Write again gives another take to audition: three bass lines in three scenes, launched one at a time.'; to2.appendChild(this.toSel); parts.push(to2); }
      parts.push(bGo, bHum); parts.forEach(function (x) { row.appendChild(x); });
      if (d.compMenu != null) this.compMenus(row);
    }
    // files
    if (this.show.files) {
      var fl = el('div', 'mdaw-tools mdaw-files'); n.appendChild(fl);
      var bMid = btn('Export MIDI', 'Save the clips as a .mid file to open in another DAW'), bWav = btn('Bounce to WAV', 'Render the song to an audio file'),
        bSave = btn('Save project', 'Save to a .json file'), bOpen = btn('Open project', 'Open a .json file saved here'), bReset = btn('Reset', 'Back to how this DAW started'),
        bImp = btn('Open MIDI', 'Open a .mid file (from the Backing Track, MuseScore, another DAW…) as tracks here. It replaces the song; Undo brings it back.');
      bMid.onclick = function () { download(new Blob([toMidi(self.p)], { type: 'audio/midi' }), 'mini-daw.mid'); self.say('MIDI file saved.'); };
      bWav.onclick = function () { self.bounce(); };
      bSave.onclick = function () { download(new Blob([JSON.stringify({ kind: 'mini-daw', version: 1, name: self.projects ? self.curProject().name : undefined, project: self.p }, null, 1)], { type: 'application/json' }), (self.projects ? self.curProject().name.replace(/[^\w. -]+/g, '_') : 'mini-daw') + '.json'); };
      var file = el('input'); file.type = 'file'; file.accept = '.json'; file.hidden = true; fl.appendChild(file);
      bOpen.onclick = function () { file.click(); };
      file.onchange = function () { var f = file.files[0]; if (!f) return; f.text().then(function (t) { var j = JSON.parse(t); if (!j || j.kind !== 'mini-daw') throw new Error('not a Mini DAW project');
        if (self.projects) { store(self.storeKey, self.p); var e = Projects.add(Projects.kvLocal, self.id, self.pIndex, j.name || f.name.replace(/\.json$/i, ''), Meter.norm(j.project), Date.now()); self.openProject(e.key); self.say('Opened ' + f.name + ' as the project ' + e.name + '.'); return; }
        self.change(function () { self.p = Meter.norm(j.project); self.fixSel(); }); self.loadTakes(); self.say('Opened ' + f.name); }).catch(function (e) { self.say('Could not open: ' + e.message); }); file.value = ''; };
      var mfile = el('input'); mfile.type = 'file'; mfile.accept = '.mid,.midi,audio/midi'; mfile.hidden = true; fl.appendChild(mfile);
      bImp.onclick = function () { mfile.click(); };
      mfile.onchange = function () { var f = mfile.files[0]; if (!f) return; f.arrayBuffer().then(function (ab) { self.openMidi(new Uint8Array(ab), f.name); }).catch(function (e) { self.say('Could not open: ' + e.message); }); mfile.value = ''; };
      bReset.onclick = function () { if (!confirm('Throw away your changes to this DAW?')) return; self.stop(); self.change(function () { self.p = self.fresh(); self.sel = { track: 0, clip: self.p.tracks[0] && self.p.tracks[0].clips.length ? 0 : -1, notes: [] }; }); };
      [bMid, bImp, bWav, bSave, bOpen, bReset].forEach(function (x) { fl.appendChild(x); });
    }
    n.addEventListener('pointerdown', function (e) { self.zoneEd = !!(e.target.closest && e.target.closest('.mdaw-editor')); }, true);
    n.addEventListener('keydown', function (e) { self.key(e, true); });
    n.addEventListener('keyup', function (e) { self.key(e, false); });
    if (d.panels != null && global.MiniDaw.Panels) global.MiniDaw.Panels.build(this);      // panels.js: collapsible, movable parts (data-panels)
  };

  // ---------------- drawing ----------------
  Daw.prototype.renderAll = function () { this.renderTransport(); this.renderTracks(); this.renderEditor(); this.renderMixer(); if (this.renderPanel) this.renderPanel(true); this.applyMix(); if (this.renderSession) this.renderSession(); };
  Daw.prototype.renderTransport = function () {
    var p = this.p; this.tempoIn.value = p.tempo; this.barsIn.value = p.bars;
    var cur = Meter.str(Meter.tsOfBar(p, clamp(Math.round(+this.tsBar.value || 1), 1, p.bars) - 1)), opts = TS_LIST.map(Meter.str); [p.ts].concat(p.tsMap.map(function (c) { return c.ts; })).forEach(function (t) { if (opts.indexOf(Meter.str(t)) < 0) opts.push(Meter.str(t)); });
    this.tsSel.innerHTML = ''; opts.forEach(function (o) { var e = el('option', null, o); e.value = o; this.tsSel.appendChild(e); }, this); this.tsSel.value = cur;
    this.tsList.innerHTML = ''; p.tsMap.forEach(function (c) { var b = btn('bar ' + (c.bar + 1) + ': ' + Meter.str(c.ts) + ' ×', 'Take this meter change away', 'mdaw-ms'); b.dataset.bar = c.bar; this.tsList.appendChild(b); }, this);
    this.tsBar.max = p.bars;
    this.bLoop.classList.toggle('mdaw-on', !!p.loop.on); this.bLoop.setAttribute('aria-pressed', String(!!p.loop.on));
    this.bClick.classList.toggle('mdaw-on', !!p.click); this.bClick.setAttribute('aria-pressed', String(!!p.click));
    this.bKeys.classList.toggle('mdaw-on', this.keysOn); this.bKeys.setAttribute('aria-pressed', String(this.keysOn));
    this.bPlay.textContent = this.playing ? '■ Stop' : '▶ Play'; this.bPlay.classList.toggle('mdaw-on', this.playing);
    this.bRec.classList.toggle('mdaw-recon', this.recording);
    var tr = this.track(), au = !!(tr && isAudio(tr)); this.bMon.hidden = !au; this.bKeys.hidden = au || !this.show.transport;
    this.bMon.classList.toggle('mdaw-on', !!this.monOn); this.bMon.setAttribute('aria-pressed', String(!!this.monOn)); this.inMeter.hidden = !this.mic;
    if (this.sessTransport) this.sessTransport();
  };
  Daw.prototype.beatW = function () { return 26 * this.zoom.arr; };   // pixels a beat in the arrangement (zoomed)
  // − / + / Fit buttons; which = 'arr' (arrangement bar width) or 'rx' (piano roll: width, and Rows − / + for note height)
  Daw.prototype.zoomBar = function (host, title, which) {
    var self = this, g = el('span', 'mdaw-zoom'); g.appendChild(el('span', 'mdaw-lbl', which === 'arr' ? 'Zoom ' : 'Zoom '));
    var bm = btn('−', title + ': out'), bp = btn('+', title + ': in'), bf = btn('Fit', which === 'arr' ? 'Fit the whole song in the visible width' : 'Fit the clip in the visible width');
    bm.onclick = function () { self.zoomStep(which, -1); self.node.focus(); }; bp.onclick = function () { self.zoomStep(which, 1); self.node.focus(); }; bf.onclick = function () { self.zoomFit(which); self.node.focus(); };
    [bm, bp, bf].forEach(function (x) { g.appendChild(x); });
    if (which === 'rx') { var rm = btn('Rows −', 'Shorter note rows'), rp = btn('Rows +', 'Taller note rows'); rm.onclick = function () { self.zoomStep('ry', -1); self.node.focus(); }; rp.onclick = function () { self.zoomStep('ry', 1); self.node.focus(); }; g.appendChild(rm); g.appendChild(rp); }
    host.appendChild(g);
  };
  Daw.prototype.zoomSave = function () { store('mdaw:' + this.id + ':zoom', this.zoom); };
  Daw.prototype.zoomStep = function (which, dir) {
    var z = this.zoom; if (which === 'arr') z.arr = zoomBy(z.arr, dir); else if (which === 'rx') z.rx = zoomBy(z.rx, dir, 0.3, 3); else z.ry = zoomBy(z.ry, dir, 0.5, 3);
    this.zoomSave(); if (which === 'arr') { this.renderTracks(); this.revealHead(); } else this.renderEditor();
    this.say('Zoom ' + (which === 'arr' ? 'arrangement ' + Math.round(z.arr * 100) + '%' : which === 'rx' ? 'roll width ' + Math.round(z.rx * 100) + '%' : 'roll rows ' + Math.round(z.ry * 100) + '%') + '.');
  };
  Daw.prototype.zoomFit = function (which) {
    var z = this.zoom;
    if (which === 'arr') { var vis = this.gridEl.clientWidth - 196 - 6, total = Meter.total(this.p); if (!(vis > 0) || !(total > 0)) return; z.arr = clamp(Math.floor(vis / (total * 26) * 1000) / 1000, ZOOM_MIN, ZOOM_MAX); this.gridEl.scrollLeft = 0; this.zoomSave(); this.renderTracks(); }
    else { var c = this.clip(); if (!c) return; var avail = this.roll.clientWidth - 90, base = this.grid >= 1 ? 40 : this.grid >= 0.5 ? 26 : 20, cols = Math.round(c.len / this.grid); if (!(avail > 0)) return; z.rx = clamp(Math.floor(avail / (cols * base) * 1000) / 1000, 0.3, 3); this.zoomSave(); this.renderEditor(); }
    this.say('Fitted.');
  };
  Daw.prototype.renderTracks = function () {
    var self = this, p = this.p, g = this.gridEl, W = this.beatW(), total = Meter.total(p); g.innerHTML = '';
    g.style.setProperty('--mdaw-w', (total * W) + 'px'); g.style.setProperty('--mdaw-bar', (4 * W) + 'px');
    // ruler
    var head = el('div', 'mdaw-row mdaw-rulerrow'); head.appendChild(el('div', 'mdaw-th mdaw-corner', 'Tracks'));
    var ruler = el('div', 'mdaw-lane mdaw-ruler'); ruler.style.width = (total * W) + 'px';
    var bx = [], bs = 0; for (var b = 0; b < p.bars; b++) { var t0 = Meter.tsOfBar(p, b), shown = b === 0 || Meter.str(t0) !== Meter.str(Meter.tsOfBar(p, b - 1));
      var m = el('span', 'mdaw-bar', String(b + 1) + (shown ? ' ' + Meter.str(t0) : '')); m.style.left = (bs * W) + 'px'; ruler.appendChild(m); bx.push(bs); bs += Meter.beats(t0); }
    bx.push(bs); function bxOf(i) { return bx[clamp(i, 0, bx.length - 1)]; }
    var lp = el('div', 'mdaw-loop' + (p.loop.on ? ' mdaw-loopon' : '')); lp.style.left = (bxOf(p.loop.from) * W) + 'px'; lp.style.width = ((bxOf(p.loop.to) - bxOf(p.loop.from)) * W) + 'px'; lp.title = 'Loop: bars ' + (p.loop.from + 1) + '–' + p.loop.to; ruler.appendChild(lp);
    head.appendChild(ruler); g.appendChild(head);
    if (this.navOn && global.MiniDaw.Nav) global.MiniDaw.Nav.ruler(this, ruler, lp, W, total);
    else ruler.addEventListener('pointerdown', function (e) {
      var r = ruler.getBoundingClientRect(), x0 = e.clientX - r.left, b0 = Meter.barAt(p, x0 / W).bar, moved = false;
      function mv(ev) { var b1 = Meter.barAt(p, (ev.clientX - r.left) / W).bar; if (b1 !== b0 || moved) { moved = true; var a = clamp(Math.min(b0, b1), 0, p.bars - 1), z = clamp(Math.max(b0, b1) + 1, 1, p.bars); p.loop = { on: true, from: a, to: z }; lp.className = 'mdaw-loop mdaw-loopon'; lp.style.left = (bxOf(a) * W) + 'px'; lp.style.width = ((bxOf(z) - bxOf(a)) * W) + 'px'; } }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
        if (moved) { self.change(function () {}); self.say('Loop: bars ' + (p.loop.from + 1) + ' to ' + p.loop.to + '.'); } else self.locate(clamp(Math.round(x0 / W), 0, total)); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    p.tracks.forEach(function (tr, ti) {
      var row = el('div', 'mdaw-row' + (ti === self.sel.track ? ' mdaw-selrow' : '')), th = el('div', 'mdaw-th'), col = COLORS[ti % COLORS.length];
      th.style.borderLeftColor = col;
      var name = el('input', 'mdaw-name'); name.value = tr.name; name.setAttribute('aria-label', 'Track name'); name.onchange = function () { self.change(function () { tr.name = name.value || instOf(tr.inst).label; }); };
      name.onfocus = function () { if (self.sel.track !== ti) { self.sel = { track: ti, clip: tr.clips.length ? 0 : -1, notes: [] }; self.renderEditor(); self.markRows(); } };
      var isel = el('select', 'mdaw-inst'); isel.setAttribute('aria-label', 'Instrument'); INSTS.forEach(function (i) { if (kind(i) !== kind(tr) || (i.synth && !self.useSynth && tr.inst !== i.id)) return; var o = el('option', null, i.label); o.value = i.id; isel.appendChild(o); }); isel.value = tr.inst;
      isel.onchange = function () { self.change(function () { tr.inst = isel.value; }); self.load(); };
      var mb = btn('M', 'Mute ' + tr.name, 'mdaw-ms' + (tr.mute ? ' mdaw-mute' : '')), sb = btn('S', 'Solo ' + tr.name, 'mdaw-ms' + (tr.solo ? ' mdaw-solo' : '')), xb = btn('×', 'Delete track ' + tr.name, 'mdaw-ms');
      mb.onclick = function () { self.change(function () { tr.mute = !tr.mute; }); }; sb.onclick = function () { self.change(function () { tr.solo = !tr.solo; }); };
      xb.onclick = function () { if (tr.clips.length && !confirm('Delete the track ' + tr.name + ' and its clips?')) return; self.change(function () { p.tracks.splice(ti, 1); self.fixSel(); }); };
      var line = el('div', 'mdaw-thline'); line.appendChild(mb); line.appendChild(sb); line.appendChild(isel); line.appendChild(xb);
      th.appendChild(name); th.appendChild(line); row.appendChild(th);
      var lane = el('div', 'mdaw-lane'); lane.style.width = (total * W) + 'px'; lane.dataset.track = ti;
      lane.addEventListener('dblclick', function (e) { if (e.target !== lane) return; var r = lane.getBoundingClientRect(); self.newClip(ti, Meter.floor(self.p, (e.clientX - r.left) / W)); });
      lane.addEventListener('pointerdown', function (e) { if (e.target === lane) { self.sel = { track: ti, clip: -1, slot: -1, notes: [] }; self.markRows(); self.renderEditor(); self.renderTracks(); } });
      tr.clips.forEach(function (c, ci) { lane.appendChild(self.clipEl(tr, ti, c, ci, col)); });
      row.appendChild(lane); g.appendChild(row);
    });
    if (!p.tracks.length) g.appendChild(el('p', 'mdaw-hint', 'No tracks yet: add one above' + (this.show.band ? ', or let the band write some below.' : '.')));
    if (this.autoOn && this.show.automation && p.tracks.length) g.appendChild(this.autoRow());
    this.head = el('div', 'mdaw-head'); this.head.style.left = (196 + this.pos * W) + 'px'; g.appendChild(this.head);
  };
  Daw.prototype.markRows = function () { var s = this.sel.track; Array.prototype.forEach.call(this.gridEl.querySelectorAll('.mdaw-row:not(.mdaw-rulerrow)'), function (r, i) { r.classList.toggle('mdaw-selrow', i === s); }); };
  Daw.prototype.clipEl = function (tr, ti, c, ci, col) {
    var self = this, W = this.beatW(), e = el('div', 'mdaw-clip' + (ti === this.sel.track && ci === this.sel.clip ? ' mdaw-selclip' : ''));
    e.style.left = (c.start * W) + 'px'; e.style.width = Math.max(6, c.len * W - 2) + 'px'; e.style.background = col; e.tabIndex = -1;
    var nb = Meter.barsOfLen(this.p, c.start, c.len); e.title = tr.name + ': bar ' + (Meter.barAt(this.p, c.start).bar + 1) + ', ' + nb + ' bar' + (nb === 1 ? '' : 's') + ', ' + c.notes.length + ' notes';
    // the notes drawn small inside the clip
    var mini = el('canvas', 'mdaw-mini'); mini.width = Math.max(6, c.len * W - 2); mini.height = 34; e.appendChild(mini);
    var cx = mini.getContext('2d'); cx.fillStyle = 'rgba(255,255,255,.85)';
    if (isAudio(tr)) { this.wave(cx, c, W, 34); }
    var drum = isDrum(tr), rows = rowsOf(tr), ms = c.notes.filter(function (n) { return !drum; }).map(function (n) { return n.m; }), lo = Math.min.apply(null, ms.concat([200])), hi = Math.max.apply(null, ms.concat([0]));
    c.notes.forEach(function (n) { if (n.t >= c.len) return; var y;
      if (drum) { var k = rows.map(function (r) { return r[0]; }).indexOf(n.m); y = 2 + (k < 0 ? rows.length - 1 : k) * (30 / rows.length); cx.fillRect(n.t * W, y, 2, 3); }
      else { y = hi === lo ? 15 : 30 - (n.m - lo) / (hi - lo) * 28; cx.fillRect(n.t * W, y, Math.max(2, n.d * W - 1), 2); } });
    var grip = el('div', 'mdaw-grip'); grip.title = 'Drag to change the clip\'s length'; e.appendChild(grip);
    var lc = el('div', 'mdaw-loopc'); lc.title = 'Loop: click to repeat the clip once more; drag right to repeat it as far as you drag (the last repeat is cut short)'; if (!isAudio(tr)) e.appendChild(lc);
    lc.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); ev.preventDefault(); self.sel = { track: ti, clip: ci, slot: -1, notes: [] }; self.node.focus({ preventScroll: true });
      var x0 = ev.clientX, end0 = c.start + c.len, reach = end0 + c.len, P = self.p, ghost = el('div', 'mdaw-loopg'); ghost.style.left = (end0 * W) + 'px'; ghost.style.width = (c.len * W) + 'px'; e.parentNode.appendChild(ghost);
      function mv(m) { var dx = (m.clientX - x0) / W; reach = Math.abs(m.clientX - x0) < 4 ? end0 + c.len : Math.max(end0 + 1, Meter.nearest(P, end0 + Math.max(0, dx))); reach = Math.min(reach, Meter.total(P)); ghost.style.width = Math.max(0, (reach - end0) * W) + 'px'; }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); ghost.remove(); self.loopClip(ti, ci, reach); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); });
    e.addEventListener('pointerdown', function (ev) {
      ev.stopPropagation(); self.sel = { track: ti, clip: ci, slot: -1, notes: [] }; self.node.focus({ preventScroll: true });
      var resize = ev.target === grip, x0 = ev.clientX, start0 = c.start, len0 = c.len, lanes = self.gridEl.querySelectorAll('.mdaw-lane[data-track]'), moved = false, toTrack = ti, P = self.p, alt = ev.altKey, end0 = start0 + len0;
      var before = JSON.stringify(self.p);
      function mv(m) { var dx = (m.clientX - x0) / W, db = alt ? Math.round(dx) : Meter.nearest(P, (resize ? end0 : start0) + dx) - Meter.nearest(P, resize ? end0 : start0); if (db) moved = true;
        if (resize) { c.len = Math.max(1, len0 + db); e.style.width = Math.max(6, c.len * W - 2) + 'px'; }
        else { c.start = clamp(start0 + db, 0, Meter.total(P) - 1); e.style.left = (c.start * W) + 'px';
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

  Daw.prototype.renderEditor = function () { this.renderEditor0(); if (this.renderPanel) this.renderPanel(); };
  Daw.prototype.renderEditor0 = function () {
    var self = this, tr = this.track(), c = this.clip(), roll = this.roll; roll.innerHTML = '';
    this.renderTransport();
    this.transposeBtns.forEach(function (b) { b.hidden = !tr || isDrum(tr) || isAudio(tr); });
    this.midiTools.forEach(function (b) { b.hidden = !!(tr && isAudio(tr)); });
    if (tr && c && isAudio(tr)) { this.clipLen.value = Meter.barsOfLen(this.p, c.start, c.len); return this.audioEditor(tr, c); }
    if (!tr || !c) { this.edTitle.textContent = 'Editor'; this.clipLen.value = ''; roll.appendChild(el('p', 'mdaw-hint', tr ? 'Select a clip on ' + tr.name + ', or double-click its lane for a new one.' : 'Select a clip.')); this.edHint.textContent = ''; return; }
    this.clipLen.value = Meter.barsOfLen(this.p, c.start, c.len);
    var drum = isDrum(tr), G = this.grid, cols = Math.round(c.len / G), cw = Math.max(3, Math.round((G >= 1 ? 40 : G >= 0.5 ? 26 : 20) * this.zoom.rx)), rh = Math.max(drum ? 8 : 5, Math.round((drum ? 20 : 13) * this.zoom.ry));
    this.edTitle.textContent = (drum ? 'Step sequencer' : 'Piano roll') + ': ' + tr.name + (this.sel.slot >= 0 ? ', scene ' + (this.sel.slot + 1) + ' (' + ((this.p.scenes[this.sel.slot] || {}).name || '') + '), loops' : ', bar ' + (Meter.barAt(this.p, c.start).bar + 1) + ' (' + Meter.str(Meter.barAt(this.p, c.start).ts) + ')');
    this.edHint.textContent = drum ? 'Click a square to put a hit there or take it away. Shift+click makes it an accent, Alt+click a ghost note. Brightness is velocity.'
      : 'Click an empty spot to write a note one grid step long; drag a note to move it, drag its right end to make it longer; Shift+click selects several; Delete removes; double-click a note to delete it. The bars under the notes are velocities: drag them.';
    if (this.vim && this.vim.on) this.vimDecor();
    var rows = drum ? rowsOf(tr).map(function (r) { return { key: r[0], label: r[1] }; }) : (function () {
      var ms = c.notes.map(function (n) { return n.m; }), base = /bass/.test(tr.inst) ? [28, 60] : [48, 84];
      var lo = Math.min.apply(null, ms.concat([base[0]])), hi = Math.max.apply(null, ms.concat([base[1]])), out = [];
      for (var m = hi; m >= lo; m--) out.push({ key: m, label: noteName(m), black: [1, 3, 6, 8, 10].indexOf(((m % 12) + 12) % 12) >= 0 }); return out; })();
    var wrap = el('div', 'mdaw-rollwrap'), labels = el('div', 'mdaw-keys'), cv = el('canvas', 'mdaw-cv'), H = rows.length * rh, Wd = cols * cw, VH = drum ? 0 : 50;
    rows.forEach(function (r) { var k = el('div', 'mdaw-key' + (r.black ? ' mdaw-black' : ''), r.label); k.style.height = rh + 'px';
      k.onclick = function () { self.audition(tr, r.key); }; labels.appendChild(k); });
    if (!drum) { var vk = el('div', 'mdaw-key mdaw-vlab', 'Velocity'); vk.style.height = VH + 'px'; labels.appendChild(vk); }
    var dpr = Math.min(global.devicePixelRatio || 1, 30000 / Math.max(1, Wd)); cv.width = Wd * dpr; cv.height = (H + VH) * dpr; cv.style.width = Wd + 'px'; cv.style.height = (H + VH) + 'px';
    var scroller = el('div', 'mdaw-rollscroll'); scroller.appendChild(cv); wrap.appendChild(labels); wrap.appendChild(scroller); roll.appendChild(wrap);
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var css = getComputedStyle(this.node), ink = css.getPropertyValue('--site-ink').trim() || '#222', line = css.getPropertyValue('--site-border').trim() || '#ccc', acc = css.getPropertyValue('--site-accent-dk').trim() || '#a33';
    var bpx = cw / G;   // pixels a beat
    function rowOf(n) { for (var i = 0; i < rows.length; i++) if (rows[i].key === n.m) return i; return -1; }
    function draw() {
      x.clearRect(0, 0, Wd, H + VH);
      rows.forEach(function (r, i) { if (r.black) { x.fillStyle = 'rgba(128,128,128,.12)'; x.fillRect(0, i * rh, Wd, rh); } });
      for (var k = 0; k <= cols; k++) { var lv = Meter.level(self.p, c.start + k * G), bar = lv === 2, beat = lv === 1;
        x.fillStyle = bar ? ink : line; x.globalAlpha = bar ? 0.6 : beat ? 0.7 : 0.35; x.fillRect(Math.round(k * cw), 0, 1, H + VH); }
      x.globalAlpha = 0.25; x.fillStyle = line; rows.forEach(function (r, i) { x.fillRect(0, i * rh, Wd, 1); }); x.globalAlpha = 1;
      c.notes.forEach(function (n, i) { var ri = rowOf(n); if (ri < 0 || n.t >= c.len) return; var sel = self.sel.notes.indexOf(i) >= 0;
        x.fillStyle = sel ? acc : COLORS[self.sel.track % COLORS.length]; x.globalAlpha = 0.35 + 0.65 * n.v;
        if (drum) x.fillRect(n.t * bpx + 2, ri * rh + 2, cw - 4, rh - 4);
        else { x.fillRect(n.t * bpx + 1, ri * rh + 1, Math.max(3, Math.min(n.d, c.len - n.t) * bpx - 2), rh - 2); x.globalAlpha = 1; x.fillStyle = sel ? acc : ink; x.fillRect(n.t * bpx + 1, H + VH - n.v * (VH - 6), 3, n.v * (VH - 6)); }
        x.globalAlpha = 1; });
      if (!drum) { x.fillStyle = line; x.fillRect(0, H, Wd, 1); }
    }
    draw(); this.redrawRoll = draw; this.rollGeom = { wrap: wrap, bpx: bpx, rh: rh, rowOf: rowOf };
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
      s.appendChild(el('div', 'mdaw-sname', name + (ti >= 0 && autoPts(obj) ? ' (A)' : '')));
      if (ti >= 0) { var pl = el('label', 'mdaw-pan'); pl.appendChild(el('span', null, 'Pan'));
        var pan = el('input'); pan.type = 'range'; pan.min = -100; pan.max = 100; pan.value = Math.round(obj.pan * 100); pan.setAttribute('aria-label', 'Pan ' + name);
        var po = el('output', 'mdaw-num', panTxt(obj.pan)); pan.oninput = function () { obj.pan = +pan.value / 100; po.textContent = panTxt(obj.pan); self.applyMix(); };
        pan.onchange = function () { self.undo.push(JSON.stringify(self.p)); self.save(); }; pan.ondblclick = function () { pan.value = 0; pan.oninput(); pan.onchange(); };
        pl.appendChild(pan); pl.appendChild(po); s.appendChild(pl); }
      else { var gp = el('div', 'mdaw-pan mdaw-ghost'); gp.appendChild(el('span', null, 'Pan')); var gi = el('input'); gi.type = 'range'; gp.appendChild(gi); gp.appendChild(el('output', 'mdaw-num', 'C')); s.appendChild(gp); }   // the master has no pan: an unseen one keeps its fader level with the others
      var mid = el('div', 'mdaw-fadwrap'), fad = el('input', 'mdaw-fader'); fad.type = 'range'; fad.min = -60; fad.max = 6; fad.step = 0.5; fad.value = obj.vol; fad.setAttribute('aria-label', 'Volume ' + name);
      var meter = el('div', 'mdaw-meter'), fill = el('div', 'mdaw-mfill'), peak = el('div', 'mdaw-mpeak'); meter.appendChild(fill); meter.appendChild(peak); mid.appendChild(fad); mid.appendChild(meter); s.appendChild(mid);
      if (ti >= 0 && autoPts(obj)) { fad.disabled = true; fad.title = 'This track\'s level is volume automation: edit the points, or delete them to use the fader.'; }
      var fo = el('output', 'mdaw-num', dbTxt(obj.vol)); s.appendChild(fo);
      fad.oninput = function () { obj.vol = +fad.value; fo.textContent = dbTxt(obj.vol); self.applyMix(); };
      fad.onchange = function () { self.undo.push(JSON.stringify(self.p)); self.save(); }; fad.ondblclick = function () { fad.value = 0; fad.oninput(); fad.onchange(); };
      if (ti >= 0) { var ms = el('div', 'mdaw-thline'), mb = btn('M', 'Mute ' + name, 'mdaw-ms' + (obj.mute ? ' mdaw-mute' : '')), sb = btn('S', 'Solo ' + name, 'mdaw-ms' + (obj.solo ? ' mdaw-solo' : ''));
        mb.onclick = function () { self.change(function () { obj.mute = !obj.mute; }); }; sb.onclick = function () { self.change(function () { obj.solo = !obj.solo; }); };
        ms.appendChild(mb); ms.appendChild(sb); s.appendChild(ms); }
      else { var gm = el('div', 'mdaw-thline mdaw-ghost'); gm.appendChild(btn('M', '', 'mdaw-ms')); gm.appendChild(btn('S', '', 'mdaw-ms')); s.appendChild(gm); }
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
    var TSm = global.MiniDaw.TrackSound; if (this.useFx && TSm && TSm.makeBuses && !this.buses) this.buses = TSm.makeBuses(ctx, this.master);
    while (this.strips.length < this.p.tracks.length) this.strips.push(makeStrip(ctx, this.master, this.useFx ? this.buses : null));
    this.applyMix(); return ctx;
  };
  Daw.prototype.applyMix = function () {
    if (!this.master) return; var anySolo = this.p.tracks.some(function (t) { return t.solo; }), self = this, now = AC.currentTime;
    this.p.tracks.forEach(function (tr, i) { var s = self.strips[i]; if (!s) return; var on = !tr.mute && (!anySolo || tr.solo);
      var pts = autoPts(tr);       // automation replaces the fader: the fader stays at 1 and the automation node carries the level (the level at the playhead when stopped)
      s.fader.gain.setTargetAtTime(on ? (pts ? 1 : dbToGain(tr.vol)) : 0, now, 0.01);
      if (!self.playing) s.auto.gain.setTargetAtTime(pts ? dbToGain(autoAt(pts, self.pos)) : 1, now, 0.01);
      if (s.pan.pan) s.pan.pan.setTargetAtTime(tr.pan, now, 0.01); });
    this.master.gain.setTargetAtTime(dbToGain((this.p.master || { vol: 0 }).vol), now, 0.01);
    if (this.applyTrackSound) this.applyTrackSound();
  };
  Daw.prototype.load = function () {
    if (!bank) return Promise.resolve();   // (nothing to load into until the first sound)
    var self = this, want = {}; this.p.tracks.forEach(function (t) { if (!isAudio(t) && !instOf(t.inst).synth) want[t.inst] = 1; }); var list = Object.keys(want).filter(function (i) { return !bank.has(i); });
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
  // the loop bracket in beats [from, to]: whole bars (loop.from / loop.to), or exact beats when the nav tools set loop.fb / loop.tb (data-nav)
  Daw.prototype.loopSpan = function () { var l = this.p.loop; return l.fb != null && l.tb != null && l.tb > l.fb ? [l.fb, l.tb] : [Meter.barStart(this.p, l.from), Meter.barStart(this.p, l.to)]; };
  Daw.prototype.loopRange = function () { var l = this.p.loop, s = this.loopSpan(); return l.on && s[1] > s[0] ? s : null; };
  Daw.prototype.toggle = function () { if (this.playing) this.stop(); else this.play(); };
  Daw.prototype.play = function (countIn) {
    var self = this; if (this.sessStop) this.sessStop(); this.ensureAudio();
    return this.load().then(function () {
      if (self.playing) return; var ctx = AC, lr = self.loopRange();
      if (lr && (self.pos < lr[0] || self.pos >= lr[1])) self.pos = lr[0];
      if (!lr && self.pos >= Meter.total(self.p)) self.pos = 0;
      var t0 = ctx.currentTime + 0.12;
      var cb0 = Meter.barAt(self.p, self.pos); self.countBeats = countIn ? cb0.len : 0;     // the count-in is a bar of the meter, clicking its groups
      if (countIn) Meter.clicks({ ts: cb0.ts, tsMap: [], bars: 1 }, 0, cb0.len).forEach(function (k) { click(ctx, t0 + k.b * self.secPerBeat(), k.accent, self.master); });
      t0 += self.countBeats * self.secPerBeat();
      self.anchors = [{ t: t0, b: self.pos }]; self.cursor = self.pos; self.jumped = true; self.srcs = []; self.playing = true; self.renderTransport();
      self.timer = setInterval(function () { self.schedule(); }, 25); self.schedule(); self.frame();
    }).catch(function (e) { self.say('Could not load the sounds: ' + (e && e.message)); });
  };
  Daw.prototype.timeOf = function (b) { var a = this.anchors[this.anchors.length - 1]; return a.t + (b - a.b) * this.secPerBeat(); };
  Daw.prototype.reanchor = function () { if (this.sessOn && this.sessRebase) this.sessRebase(); if (!this.playing || this.recording) return; this.stop(); this.play(); };   // a new tempo: start again from here
  Daw.prototype.beatAt = function (t) { var a = this.anchors[0]; for (var i = this.anchors.length - 1; i >= 0; i--) if (this.anchors[i].t <= t) { a = this.anchors[i]; break; } return a.b + (t - a.t) / this.secPerBeat(); };
  Daw.prototype.schedule = function () {
    var ctx = AC, horizon = ctx.currentTime + 0.15, step = 0.25, self = this, anySolo = false;
    while (this.playing && this.timeOf(this.cursor) < horizon) {
      var b0 = this.cursor, b1 = b0 + step, lr = this.loopRange(), end = lr ? lr[1] : Meter.total(this.p), jumped = this.jumped; this.jumped = false;
      if (b0 >= end - 1e-9) {
        if (lr && !this.recording) { var tEnd = this.timeOf(end); this.anchors.push({ t: tEnd, b: lr[0] }); this.cursor = lr[0]; this.jumped = true; if (this.anchors.length > 50) this.anchors.splice(0, 25); continue; }
        if (!lr || this.recording) { var te = this.timeOf(end); this.stopAt = te; break; }
      }
      if (this.p.click || this.recording) Meter.clicks(this.p, b0, b1).forEach(function (k) { click(ctx, self.timeOf(k.b), k.accent, self.master); });
      this.p.tracks.forEach(function (tr, i) { var dest = self.strips[i].input, ap = autoPts(tr);
        if (self.scheduleSound) self.scheduleSound(tr, i, b0, b1, jumped, dest);
        if (ap) { var ag = self.strips[i].auto.gain; if (jumped) ag.setValueAtTime(dbToGain(autoAt(ap, b0)), self.timeOf(b0)); ag.linearRampToValueAtTime(dbToGain(autoAt(ap, b1)), self.timeOf(b1)); }
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
    var w = Meter.where(this.p, b); this.posEl.textContent = w.bar + '.' + w.beat + '.' + w.sub;
  };
  Daw.prototype.stop = function (atEnd) {
    if (!this.playing) { return; }
    this.strips.forEach(function (s) { try { s.auto.gain.cancelScheduledValues(0); } catch (e) {} });
    clearInterval(this.timer); this.playing = false; this.stopAt = null; bank.stopAll(); if (this.stopSound) this.stopSound();
    (this.srcs || []).forEach(function (x) { try { x.stop(); } catch (e) {} }); this.srcs = [];
    var wasRec = this.recording; this.recording = false;
    if (wasRec) this.finishTake();
    this.setPos(atEnd ? (this.loopRange() ? this.loopRange()[0] : 0) : Math.floor(this.pos * 4) / 4);
    this.applyMix(); this.renderTransport();
  };
  // the position readout as a text box: bar.beat.sixteenth, Enter jumps, Esc cancels, a bad entry shakes and says why
  Daw.prototype.editPos = function () {
    var self = this, span = this.posEl; if (this.posIn) { this.posIn.focus(); return; }
    var inp = this.posIn = el('input', 'mdaw-posin'); inp.type = 'text'; inp.value = span.textContent; inp.setAttribute('aria-label', 'Go to position, bar.beat.sixteenth'); inp.size = 8;
    span.hidden = true; span.parentNode.insertBefore(inp, span.nextSibling); inp.focus(); inp.select(); var done = false;
    function close() { if (done) return; done = true; self.posIn = null; inp.remove(); span.hidden = false; }
    inp.addEventListener('keydown', function (e) { e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); self.node.focus(); }
      else if (e.key === 'Enter') { e.preventDefault(); var r = Meter.parsePos(self.p, inp.value);
        if (r.error) { self.say(r.error); inp.classList.remove('mdaw-shake'); void inp.offsetWidth; inp.classList.add('mdaw-shake'); return; }
        close(); self.locate(r.pos); if (self.revealHead) self.revealHead(); self.say('Playhead: bar ' + Meter.where(self.p, r.pos).bar + '.'); self.node.focus(); } });
    inp.addEventListener('blur', function () { close(); });
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
    this.take = []; this.held = {}; this.recording = true; this.keysOn = true; this.recStart = Meter.floor(this.p, this.pos); this.setPos(this.recStart);
    this.say('Count-in… then play on the keys (or a MIDI keyboard). Space stops.'); this.node.focus(); this.play(true); this.midi();
  };
  Daw.prototype.noteOn = function (m, v) {
    var tr = this.track(); if (!tr) return; this.ensureAudio(); var i = this.sel.track, self = this;
    var dest = this.strips[i].input, live = playNote(bank, tr, { m: m, v: v }, AC.currentTime, isDrum(tr) ? null : 8, dest);
    if (!isDrum(tr)) this.held[m] = { live: live, b: this.playing ? this.beatAt(AC.currentTime) : null, v: v };
    else if (this.recording) this.take.push({ b: this.beatAt(AC.currentTime), d: 0.25, m: m, v: v });
    if (!bank.has(tr.inst) && !instOf(tr.inst).synth) this.load();
  };
  Daw.prototype.noteOff = function (m) {
    var h = this.held && this.held[m]; if (!h) return; delete this.held[m];
    if (h.live && h.live.synth) { try { h.live.synth.off(AC.currentTime); } catch (e) {} }
    else if (h.live && h.live.g) { try { h.live.g.gain.setTargetAtTime(0, AC.currentTime, 0.04); h.live.src.stop(AC.currentTime + 0.3); } catch (e) {} }
    if (this.recording && h.b != null) { var e = this.beatAt(AC.currentTime); this.take.push({ b: h.b, d: Math.max(0.05, e - h.b), m: m, v: h.v }); }
  };
  Daw.prototype.finishTake = function () {
    if (this.audioTake) return this.finishAudio();
    var self = this, tr = this.track(), notes = (this.take || []).filter(function (n) { return n.b >= self.recStart - 0.25; });
    Object.keys(this.held || {}).forEach(function (m) { self.noteOff(+m); });
    if (!notes.length) { this.say('Nothing was played, so nothing was recorded.'); return; }
    var last = Math.max.apply(null, notes.map(function (n) { return n.b + n.d; })), len = Math.max(Meter.barLen(this.p, Meter.barAt(this.p, this.recStart).bar), Meter.ceil(this.p, last) - this.recStart);
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
    this.edTitle.textContent = 'Audio clip: ' + tr.name + ', bar ' + (Meter.barAt(this.p, c.start).bar + 1);
    var box = el('div', 'mdaw-rollwrap mdaw-audioed'), cv = el('canvas', 'mdaw-cv'), dpr = global.devicePixelRatio || 1, w = c.len * W;
    cv.width = w * dpr; cv.height = H * dpr; cv.style.width = w + 'px'; cv.style.height = H + 'px'; box.appendChild(cv); roll.appendChild(box);
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var css = getComputedStyle(this.node), ink = css.getPropertyValue('--site-ink').trim() || '#222';
    function draw() { x.clearRect(0, 0, w, H); x.globalAlpha = 0.35; x.fillStyle = ink; for (var b = 0; b <= c.len; b++) x.fillRect(b * W, 0, 1, Meter.level(self.p, c.start + b) === 2 ? H : H / 6); x.fillRect(0, H / 2, w, 1);
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
      self.audioTake = []; self.recording = true; self.recStart = Meter.floor(self.p, self.pos); self.setPos(self.recStart);
      self.say('Count-in… recording. The click is on while you record. Space stops.'); self.node.focus(); self.play(true);
    }).catch(function (e) { self.recording = false; self.audioTake = null; self.say('No microphone: ' + (e && e.message)); self.renderTransport(); });
  };
  Daw.prototype.finishAudio = function () {
    var self = this, tr = this.track(), blocks = this.audioTake || []; this.audioTake = null;
    if (!blocks.length || !tr) { this.say('Nothing was recorded.'); return; }
    var n = 0; blocks.forEach(function (b) { n += b.d.length; }); var data = new Float32Array(n), k = 0; blocks.forEach(function (b) { data.set(b.d, k); k += b.d.length; });
    var rate = AC.sampleRate, spb = this.secPerBeat(), lat = this.latencyMs(), bStart = this.beatAt(blocks[0].t), bEnd = this.beatAt(blocks[blocks.length - 1].t);
    var len = Math.max(Meter.barLen(this.p, Meter.barAt(this.p, this.recStart).bar), Meter.ceil(this.p, bEnd) - this.recStart), from = ((this.recStart - bStart) * spb + lat / 1000) * rate;   // (levels from the first bar, not the count-in)
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
    var bl = Meter.barLen(this.p, Meter.barAt(this.p, start).bar);
    this.change(function () { tr.clips.push({ start: clamp(start, 0, Math.max(0, Meter.total(self.p) - bl)), len: bl, notes: [] }); self.sel = { track: ti, clip: tr.clips.length - 1, notes: [] }; }); };
  Daw.prototype.copySel = function (cut) {
    var c = this.clip(), tr = this.track(), self = this; if (!c || !tr) return this.say('Select a clip (or notes) first.');
    var d;
    if (this.sel.notes.length && !isAudio(tr)) { d = Clipboard.copyNotes(c, this.sel.notes, isDrum(tr)); Clipboard.set(d); this.say((cut ? 'Cut ' : 'Copied ') + d.notes.length + ' note' + (d.notes.length === 1 ? '' : 's') + '.');
      if (cut) this.change(function () { c.notes = c.notes.filter(function (n, i) { return self.sel.notes.indexOf(i) < 0; }); self.sel.notes = []; }); return; }
    d = Clipboard.copyClip(c, isDrum(tr), isAudio(tr)); Clipboard.set(d); this.say((cut ? 'Cut' : 'Copied') + ' the ' + tr.name + ' clip.');
    if (cut) this.deleteSel();
  };
  Daw.prototype.paste = function () {
    var d = Clipboard.get(), tr = this.track(), c = this.clip(), self = this, p = this.p; if (!d) return this.say('Nothing copied yet.');
    if (d.kind !== 'notes' && this.pasteToSlot && this.inSession && this.inSession() && this.sessCur2) return this.pasteToSlot(d);
    if (!tr) return this.say('Add or select a track first.');
    if (d.kind === 'notes') {
      if (!c || isAudio(tr)) return this.say('Open a clip to paste notes into.');
      if (!!d.drum !== isDrum(tr)) return this.say('Those notes are ' + (d.drum ? 'drum hits; open a drum clip.' : 'pitched; open a piano roll clip.'));
      var at = this.sel.slot >= 0 ? 0 : (this.pos >= c.start - 1e-9 && this.pos < c.start + c.len - 1e-9 ? this.pos - c.start : 0), ids = [];
      this.change(function () { ids = Clipboard.pasteNotes(c, d, at, self.grid); self.sel.notes = ids; });
      return this.say(ids.length ? 'Pasted ' + ids.length + ' note' + (ids.length === 1 ? '' : 's') + '.' : 'Nothing fit inside the clip there.');
    }
    if (!!d.audio !== isAudio(tr) || !!d.drum !== isDrum(tr)) return this.say('A clip can only go on a track of its kind: drums, notes or audio.');
    this.change(function () { var n = Clipboard.pasteClip(p, tr, d, Meter.floor(p, self.pos)); self.sel = { track: self.sel.track, clip: tr.clips.indexOf(n), slot: -1, notes: [] }; });
    this.loadTakes(); this.say('Pasted the clip at bar ' + (Meter.barAt(p, Meter.floor(p, this.pos)).bar + 1) + '.');
  };
  Daw.prototype.duplicate = function () { var c = this.clip(), tr = this.track(), self = this; if (!c) return this.say('Select a clip first.'); if (this.sel.slot >= 0) return this.say('A session clip loops by itself; to copy a whole scene use the scene\'s copy button.');
    this.change(function () { var n = clone(c); n.start = c.start + c.len; tr.clips.push(n); self.sel.clip = tr.clips.length - 1; if (n.start + n.len > Meter.total(self.p) + 1e-9) self.p.bars = Math.min(64, Meter.barAt(self.p, n.start + n.len - 1e-9).bar + 1); }); };
  Daw.prototype.split = function () { var c = this.clip(), tr = this.track(), at = Math.round(this.pos / this.grid) * this.grid, self = this;
    if (this.sel.slot >= 0) return this.say('A session clip is not split; it loops.');
    if (!c || at <= c.start || at >= c.start + c.len) return this.say('Put the playhead inside the selected clip, then Split.');
    this.change(function () { var cut = at - c.start, b = Object.assign(clone(c), { start: at, len: c.len - cut, off: (c.off || 0) - cut, notes: c.notes.filter(function (n) { return n.t >= cut; }).map(function (n) { return Object.assign({}, n, { t: n.t - cut }); }) });
      c.notes = c.notes.filter(function (n) { return n.t < cut; }); c.len = cut; tr.clips.push(b); }); };
  // Join (J, as in the Notation tool): the selected clip and the one after it on the track become one clip, from the first's start to the later end;
  // a gap between them stays empty inside the joined clip. A count (3J) joins that many following clips. Audio clips are not joined.
  Daw.prototype.join = function (count) {
    var tr = this.track(), c = this.clip(), self = this, n = Math.max(1, count || 1); if (this.sel.slot >= 0) return this.say('A session clip loops by itself; there is nothing to join it to.');
    if (!tr || !c) return this.say('Select a clip first: ↑ ↓ pick the track, [ ] the clip.'); if (isAudio(tr)) return this.say('Audio clips are not joined here.');
    var next = tr.clips.filter(function (x) { return x !== c && x.start >= c.start + 1e-9; }).sort(function (a, b) { return a.start - b.start; }).slice(0, n);
    if (!next.length) return this.say('There is no clip after this one on ' + tr.name + '.');
    this.change(function () { var end = c.start + c.len; next.forEach(function (b) { var off = b.start - c.start; end = Math.max(end, b.start + b.len);
        b.notes.forEach(function (x) { c.notes.push(Object.assign({}, x, { t: x.t + off })); }); tr.clips.splice(tr.clips.indexOf(b), 1); });
      c.len = end - c.start; c.notes.sort(function (a, b) { return a.t - b.t || a.m - b.m; }); self.sel = { track: self.sel.track, clip: tr.clips.indexOf(c), slot: -1, notes: [] }; });
    this.say('Joined ' + (next.length + 1) + ' clips on ' + tr.name + ' into one of ' + Meter.barsOfLen(this.p, c.start, c.len) + ' bars (Split / S cuts it again at the playhead).');
  };
  // repeat a clip to `reach` (a beat): whole copies, the last one cut short; clips that start in the filled span are replaced; the song grows if needed
  Daw.prototype.loopClip = function (ti, ci, reach) {
    var tr = this.p.tracks[ti], c = tr && tr.clips[ci], self = this, p = this.p; if (!c || isAudio(tr) || !(c.len > 0)) return;
    var end0 = c.start + c.len; if (reach <= end0 + 1e-9) reach = end0 + c.len; reach = Math.min(reach, Meter.barStart(p, 64));
    this.change(function () { tr.clips = tr.clips.filter(function (x) { return x === c || x.start < end0 - 1e-9 || x.start >= reach - 1e-9; });
      for (var s0 = end0, k = 0; s0 < reach - 1e-9 && k < 64; s0 += c.len, k++) { var len = Math.min(c.len, reach - s0), n = clone(c); n.start = s0; n.len = len; n.notes = c.notes.filter(function (x) { return x.t < len - 1e-9; }); tr.clips.push(n); }
      if (reach > Meter.total(p) + 1e-9) p.bars = Math.min(64, Meter.barAt(p, reach - 1e-6).bar + 1); self.sel = { track: ti, clip: tr.clips.indexOf(c), slot: -1, notes: [] }; });
    this.say(tr.name + ' clip repeated up to bar ' + (Meter.barAt(p, reach - 1e-6).bar + 1) + '.');
  };
  Daw.prototype.deleteSel = function () { var c = this.clip(), tr = this.track(), self = this; if (this.autoDelete()) return; if (!c) return;
    if (this.sel.notes.length) { this.change(function () { c.notes = c.notes.filter(function (n, i) { return self.sel.notes.indexOf(i) < 0; }); self.sel.notes = []; }); return; }
    if (this.sel.slot >= 0) { this.change(function () { tr.slots[self.sel.slot] = null; self.sel.slot = -1; }); return; }
    this.change(function () { tr.clips.splice(self.sel.clip, 1); self.sel.clip = -1; }); };
  Daw.prototype.quantize = function (strength) { var c = this.clip(), G = this.grid, self = this; if (!c) return this.say('Select a clip first.');
    this.change(function () { if (strength === 1 && !self.sel.notes.length) delete c.felt; c.notes.forEach(function (n, i) { if (self.sel.notes.length && self.sel.notes.indexOf(i) < 0) return; var q = Math.round(n.t / G) * G; n.t = Math.max(0, n.t + (q - n.t) * strength);
      if (strength === 1 && !isDrum(self.track())) n.d = Math.max(G, Math.round(n.d / G) * G); }); });
    this.say('Quantized to the ' + this.gridSel.options[this.gridSel.selectedIndex].text + ' grid' + (strength < 1 ? ', half way' : '') + '.'); };
  Daw.prototype.transpose = function (s) { var c = this.clip(), self = this; if (!c || isDrum(this.track())) return;
    this.change(function () { c.notes.forEach(function (n, i) { if (!self.sel.notes.length || self.sel.notes.indexOf(i) >= 0) n.m = clamp(n.m + s, 21, 108); }); }); };
  Daw.prototype.humanize = function (seed) {
    var c = this.clip(), tr = this.track(), self = this; if (!c || !tr || isAudio(tr)) return this.say('Select a note or drum clip first.');
    if (c.felt) return this.say('This clip already has a feel (' + (c.felt === 1 ? 'band' : 'looser') + '). Undo it, or Quantize to take it out, before humanizing again.');
    var amt = +(this.feelSel && this.feelSel.value) || 1, part = partOfInst(tr.inst), rng = mulberry(seed != null ? seed : (Math.random() * 4294967296) | 0);
    this.change(function () { applyFeel(c.notes, part, self.p.tempo, amt, rng, c.len); c.felt = amt; });
    this.say('Gave the ' + tr.name + ' clip ' + (amt === 1 ? 'the band\'s' : 'a looser') + ' feel: ' + (part === 'drums' ? 'a hair of looseness' : part === 'bass' ? 'a touch ahead of the beat' : part === 'congas' ? 'a hair of looseness' : 'a touch behind the beat, chords rolled') + ', velocities wandering a little. The tempo is still steady.');
  };
  // data-comp-menu: comping rhythm / voicing / piano-or-guitar menus in the band row; "Style default" leaves the style's own choice
  Daw.prototype.compMenus = function (row) {
    var self = this, C = global.BandCatalog, H = global.BandHarmony;
    function sel(label, aria) { var l = el('label', 'mdaw-lbl', label + ' '), s = el('select'); s.setAttribute('aria-label', aria); l.appendChild(s); row.appendChild(l); return s; }
    function opt(s, v, t, parent) { var o = el('option', null, t); o.value = v; (parent || s).appendChild(o); }
    this.compSel = sel('Comping', 'Comping instrument'); opt(this.compSel, '', 'Style default'); opt(this.compSel, 'piano', 'Piano / keys'); opt(this.compSel, 'guitar', 'Guitar');
    this.rhythmSel = sel('Rhythm', 'Comping rhythm'); opt(this.rhythmSel, '', 'Style default'); var gs = {};
    ((C && C.comp) || []).forEach(function (c) { var g = gs[c.group]; if (!g) { g = gs[c.group] = el('optgroup'); g.label = c.group; self.rhythmSel.appendChild(g); } opt(self.rhythmSel, c.id, c.label || c.id, g); });
    this.voicingSel = sel('Voicing', 'Chord voicing');
    this.fillVoicings = function () {
      var st = ((C && C.styles) || []).filter(function (x) { return x.id === self.styleSel.value; })[0], fam = self.compSel.value || (st && st.sound && st.sound.lead) || 'piano', keep = self.voicingSel.value;
      self.voicingSel.innerHTML = ''; opt(self.voicingSel, '', 'Style default'); ((H && H.styleList && H.styleList(fam)) || []).forEach(function (v) { opt(self.voicingSel, v.id, v.label); });
      self.voicingSel.value = keep; if (self.voicingSel.value !== keep) self.voicingSel.value = ''; };
    this.styleSel.addEventListener('change', this.fillVoicings); this.compSel.addEventListener('change', function () { self.voicingSel.value = ''; self.fillVoicings(); });
    this.rhythmSel.title = 'Overrides the style\'s comping rhythm (Charleston, Garland, four on the floor, bossa …); auto = the band varies it';
    this.fillVoicings();
  };
  Daw.prototype.bandOver = function () { return this.compSel ? { comp: this.compSel.value, rhythm: this.rhythmSel.value, voicing: this.voicingSel.value } : null; };
  Daw.prototype.bandWrite = function () {
    var self = this, r; try { r = bandParts(this.chartIn.value, this.styleSel.value, this.p.tempo, clamp(+this.timesIn.value || 1, 1, 8), Meter.tsOfBar(this.p, Meter.barAt(this.p, this.pos).bar), { amt: +this.feelSel.value || 0 }, this.bandOver()); } catch (e) { return this.say(e.message); }
    var at = Meter.floor(this.p, this.pos), label = this.styleSel.options[this.styleSel.selectedIndex].text, only = this.partSel ? this.partSel.value : 'all', toSess = !!(this.toSel && this.toSel.value === 'session' && this.sessPutIn), feel = +this.feelSel.value, where = null;
    var list = [['drums', 'Drums', 'kit', r.drums], ['congas', 'Congas', 'congas', r.congas], ['bass', 'Bass', r.bassInst, r.bass], ['chords', 'Chords', r.compInst, r.comp]].filter(function (x) { return x[3].length && (only === 'all' || only === x[0]); });
    if (!list.length) return this.say('The band wrote no ' + (only === 'all' ? '' : only + ' ') + 'notes for that chart and style.');
    this.change(function () {
      function trackFor(name, inst) { var tr = null; self.p.tracks.forEach(function (t) { if (!tr && t.name === name) tr = t; }); if (!tr) { tr = track(name, inst); self.p.tracks.push(tr); } else tr.inst = inst; return tr; }
      if (toSess) { where = self.sessPutIn(list.map(function (x) { return { tr: trackFor(x[1], x[2]), notes: x[3], len: r.len, felt: feel > 0 ? feel : 0 }; }), label + (list.length === 1 ? ' ' + list[0][1].toLowerCase() : '')); return; }
      list.forEach(function (x) { var tr = trackFor(x[1], x[2]);
        tr.clips = tr.clips.filter(function (c) { return c.start + c.len <= at || c.start >= at + r.len; }); var cl = { start: at, len: r.len, notes: x[3] }; if (feel > 0) cl.felt = feel; tr.clips.push(cl); });
      self.p.bars = Math.max(self.p.bars, Math.min(64, Meter.barAt(self.p, at + r.len - 1e-9).bar + 1)); self.sel = { track: 0, clip: 0, notes: [] };
    });
    if (toSess) return this.say(where == null ? 'Eight scenes is the most: delete one first.' : 'The band wrote ' + r.bars + ' bars of ' + label + ' (' + list.map(function (x) { return x[1].toLowerCase(); }).join(', ') + ') into scene ' + (where + 1) + ' of the Session view. Write again for another take in the next free scene; ▶ on a clip launches it.');
    this.say('The band wrote ' + r.bars + ' bars of ' + label + ' from bar ' + (Meter.barAt(this.p, at).bar + 1) + (r.len !== Meter.lenOfBars(this.p, at, r.bars) ? ' (in ' + Meter.str(Meter.tsOfBar(this.p, Meter.barAt(this.p, at).bar)) + '; the song changes meter inside them, so check the bar lines)' : '') + (+this.feelSel.value > 0 ? ' with ' + this.feelSel.options[this.feelSel.selectedIndex].text.toLowerCase() + ' (tempo steady)' : '') + '. Every note is now yours to edit.'); this.load();
  };
  Daw.prototype.bounce = function () {
    var self = this, p = this.p, secs = Meter.total(p) * this.secPerBeat() + 2.5, rate = 44100;
    var OC = global.OfflineAudioContext || global.webkitOfflineAudioContext; if (!OC) return this.say('This browser cannot bounce.');
    var oc = new OC(2, Math.ceil(secs * rate), rate), b2 = global.BandSounds.create(oc), master = oc.createGain(); master.connect(oc.destination);
    var TSb = global.MiniDaw.TrackSound, buses = this.useFx && TSb && TSb.makeBuses ? TSb.makeBuses(oc, master) : null; if (buses) TSb.syncBuses(buses, p);
    var want = {}; p.tracks.forEach(function (t) { if (!isAudio(t) && !instOf(t.inst).synth) want[t.inst] = 1; }); var anySolo = p.tracks.some(function (t) { return t.solo; });
    this.say('Bouncing…');
    master.gain.value = dbToGain((p.master || { vol: 0 }).vol);
    b2.load(Object.keys(want)).then(function () {
      p.tracks.forEach(function (tr) { var s = makeStrip(oc, master, buses); var ap = autoPts(tr); s.fader.gain.value = !tr.mute && (!anySolo || tr.solo) ? (ap ? 1 : dbToGain(tr.vol)) : 0; if (s.pan.pan) s.pan.pan.value = tr.pan;
        if (ap) { s.auto.gain.setValueAtTime(dbToGain(autoAt(ap, 0)), 0); for (var ab = 0.0625; ab <= Meter.total(p) + 0.0625; ab += 0.0625) s.auto.gain.linearRampToValueAtTime(dbToGain(autoAt(ap, ab)), 0.05 + ab * self.secPerBeat()); }
        var tsb = global.MiniDaw.TrackSound && global.MiniDaw.TrackSound.bounceTrack; if (tsb) tsb(self, b2, tr, s, 'pre');
        if (isAudio(tr)) { tr.clips.forEach(function (c) { self.startAudio(oc, c, Math.max(0, c.start), 0.05 + c.start * self.secPerBeat(), s.input, Meter.total(p)); }); return; }
        tr.clips.forEach(function (c) { c.notes.forEach(function (n) { if (n.t >= c.len || c.start + n.t >= Meter.total(p)) return;
          playNote(b2, tr, n, 0.05 + (c.start + n.t) * self.secPerBeat(), Math.min(n.d, c.len - n.t) * self.secPerBeat(), s.input); }); });
        if (tsb) tsb(self, b2, tr, s, 'post'); });
      return oc.startRendering();
    }).then(function (buf) { var pk = 0; for (var k = 0; k < buf.numberOfChannels; k++) { var d = buf.getChannelData(k); for (var i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); }
      download(wav(buf), 'mini-daw.wav');
      self.say('Bounced ' + Math.round(secs) + ' s to WAV. Peak ' + (pk > 0 ? (20 * Math.log10(pk)).toFixed(1) : '−∞') + ' dBFS' + (pk >= 1 ? ': it clipped, pull the master down.' : '.'));
    }).catch(function (e) { self.say('Could not bounce: ' + (e && e.message)); });
  };

  // ---------------- keys ----------------
  Daw.prototype.key = function (e, down) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'button' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    var textish = t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' && /^(text|number|search|)$/.test(t.type || ''));
    if (this.navOn && e.key === ' ' && !textish && !e.ctrlKey && !e.metaKey && !e.altKey) {      // Space is play / pause wherever the focus is (buttons, menus, sliders too)
      e.preventDefault(); if (down && !e.repeat) { if (this.sessOn) this.sessStopAll(); else this.toggle(); } return; }
    if (this.navOn && down && e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && global.MiniDaw.Compose && global.MiniDaw.Compose.tab && global.MiniDaw.Compose.tab(this, e)) { e.preventDefault(); return; }
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
    if (this.vim && this.vim.on && this.edKey(e)) { e.preventDefault(); return; }
    // vim-style counts: digits build a number that the next key uses ("3k": three steps up, 3 dB on an automation point); any other key uses it up
    if (!mod && !e.altKey && !this.keysOn && /^[0-9]$/.test(k) && (k !== '0' || this.count)) { e.preventDefault(); this.count = Math.min(999, (this.count || 0) * 10 + +k); this.say('× ' + this.count + ' …'); return; }
    this.n = Math.max(1, this.count || 0); this.count = 0;
    if (k === ' ' && this.sessOn) { e.preventDefault(); this.sessStopAll(); }
    else if (k === ' ') { e.preventDefault(); this.toggle(); }
    else if (k === 'Enter' && !this.keysOn && !this.recording && this.vimOn()) { e.preventDefault(); }
    else if (k === 'Enter' || k === 'Home') { e.preventDefault(); this.locate(0); }
    else if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); this.doUndo(!e.shiftKey); }
    else if (e.ctrlKey && !e.metaKey && (k === 'r' || k === 'R')) { e.preventDefault(); this.doUndo(false); }      // vim: Ctrl-r redo
    else if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); this.duplicate(); }
    else if (mod && this.useClip && (k === 'c' || k === 'C' || k === 'x' || k === 'X')) { e.preventDefault(); this.copySel(k === 'x' || k === 'X'); }
    else if (mod && this.useClip && (k === 'v' || k === 'V')) { e.preventDefault(); this.paste(); }
    else if (mod && this.useZoom && (k === '=' || k === '+' || k === '-' || k === '_')) { e.preventDefault(); var ined = (e.target && e.target.closest && e.target.closest('.mdaw-editor')) || this.zoneEd;
      if (ined) { this.zoomStep('rx', k === '-' || k === '_' ? -1 : 1); if (e.shiftKey) this.zoomStep('ry', k === '-' || k === '_' ? -1 : 1); } else this.zoomStep('arr', k === '-' || k === '_' ? -1 : 1); }
    else if (mod) return;
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); this.deleteSel(); }
    else if (this.keysOn) return;
    else if (k === 'u' && !e.altKey) { e.preventDefault(); this.doUndo(true); }      // vim: u undo
    else if ((k === 'g' || k === 'G') && !e.altKey) { e.preventDefault(); this.editPos(); }
    else if (this.navOn && (k === 'S' || k === 'M') && !e.altKey) { e.preventDefault(); this.msKey(k); }
    else if (k === 'J' && !e.altKey && !(this.inSession && this.inSession())) { e.preventDefault(); this.join(this.n); }
    else if ((k === 's' || k === 'S') && !e.altKey && !(this.inSession && this.inSession())) { e.preventDefault(); this.split(); }
    else if (this.arrKey(e)) { e.preventDefault(); }
    else if (k === 'o' || k === 'O') { this.bLoop.click(); }
    else if (k === 'c' || k === 'C') { this.bClick.click(); }
    else if ((k === 'r' || k === 'R') && this.show.record) { this.record(); }
    else if (k === 'q' || k === 'Q') { this.quantize(1); }
  };

  // ---------------- placing clips from the keyboard (Arrangement) ----------------
  // ← → playhead a bar (Alt: a beat); ↑ ↓ the track (and the clip under the playhead); [ ] the previous / next clip on the track;
  // N a new empty clip at the playhead; P puts the selected Session clip at the playhead and moves the playhead to its end (P P P lays it three times);
  // Shift+← → moves the selected clip a bar (Alt: a beat); Shift+↑ ↓ moves it to the track above / below (same kind); - and = shorten / lengthen it by a bar (Alt: a beat).
  // h j k l are ← ↓ ↑ → (Shift: H J K L = Shift+arrows; Alt works too: the physical key is read, not the character it makes on a Mac)
  var VIM = { h: 'ArrowLeft', j: 'ArrowDown', k: 'ArrowUp', l: 'ArrowRight' }, VIM_CODE = { KeyH: 'ArrowLeft', KeyJ: 'ArrowDown', KeyK: 'ArrowUp', KeyL: 'ArrowRight' };
  function navKey(e) { if (e.ctrlKey || e.metaKey) return e.key; if (e.code && VIM_CODE[e.code]) return VIM_CODE[e.code]; return e.key && e.key.length === 1 && !e.code && VIM[e.key.toLowerCase()] || e.key; }
  function barStep(p, beat, dir) {      // the bar line after (dir 1) or before (dir -1) a beat
    var a = Meter.barAt(p, beat + 1e-9);
    if (dir > 0) return a.start + a.len;
    return beat - a.start > 1e-6 ? a.start : Meter.barStart(p, Math.max(0, a.bar - 1));
  }
  Daw.prototype.revealHead = function () { var g = this.gridEl, x = 196 + this.pos * this.beatW(); if (!g) return;
    if (x < g.scrollLeft + 230 || x > g.scrollLeft + g.clientWidth - 30) g.scrollLeft = Math.max(0, x - 260); };
  Daw.prototype.clipAtPos = function (ti, beat) { var tr = this.p.tracks[ti], at = -1; if (tr) tr.clips.forEach(function (c, i) { if (c.start <= beat + 1e-9 && beat < c.start + c.len - 1e-9) at = i; }); return at; };
  Daw.prototype.pick = function (ti, ci) { this.sel = { track: ti, clip: ci, slot: -1, notes: [] }; this.renderTracks(); this.renderEditor(); this.revealHead(); };
  // ---------------- note mode: vim-style velocity editing ----------------
  // Enter on a selected clip puts a cursor on its notes (in time order, a chord's notes low to high); Esc leaves.
  //   [count] operator motion      counts BEFORE the operator say how much (3> = three steps), counts AFTER say how far (>2w = two chords)
  //   motions   h l previous / next note   j k down / up within the chord   w b e next / previous / last note of the chord ("word")
  //             ( ) previous / next beat (a quarter note)   { } previous / next bar   0 $ first / last note of the clip
  //   objects   iw the note  ic its chord  ih its beat  ib its bar  ip the whole clip  iv the top line (the highest note of each chord)
  //   operators > < louder / quieter by STEP   gU accent (+ACCENT)   gu ghost (set to GHOST); doubled (>> gUU guu) = this chord (N chords after it)
  //   r1-r8     set the chord to a dynamic (ppp pp p mp mf f ff fff);  . repeat the last change;  u / Ctrl-r undo / redo;  Esc
  // Like vim, an operator with h or b covers the notes BEFORE the cursor, with l / w / ) / } the cursor and the ones up to the next stop.
  var STEP = 8 / 127, ACCENT = 20 / 127, GHOST = 0.35, DYN = [16, 32, 48, 64, 80, 96, 112, 127], DYN_NAME = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];
  var MOTIONS = 'hjklwbe(){}0$';
  Daw.prototype.vimKeyId = function () { var s = this.sel; return s.track + ':' + s.clip + ':' + s.slot; };
  Daw.prototype.vimOn = function () {
    var c = this.clip(), tr = this.track(); if (!c || !tr || isAudio(tr) || !this.show.editor || this.inSessionEdit === false) return false;
    this.vim = { on: true, c1: 0, c2: 0, op: null, g: false, i: false, r: false, last: null, cur: -1, id: this.vimKeyId() };
    var m = this.vimModel(); if (!m.L.length) { this.vim.on = false; this.say('This clip has no notes yet: write some first (click the roll, or record).'); return false; }
    this.vim.cur = m.L[0]; this.sel.notes = [m.L[0]]; this.sel.pt = -1; this.renderEditor();
    this.say('Note mode: h l notes, j k within a chord, w b e chords, ( ) beats, { } bars; > < louder / quieter, gU accent, gu ghost, r1–8 dynamic, . repeat, u undo, Esc leaves.'); return true;
  };
  Daw.prototype.vimOff = function (msg) { if (!this.vim) return; this.vim.on = false; this.sel.notes = []; this.renderEditor(); this.say(msg || 'Left note mode.'); };
  Daw.prototype.vimDecor = function () { this.edTitle.textContent += ' · note mode'; this.edHint.textContent = 'NOTE MODE. h l notes · j k in a chord · w b e chords · ( ) beats · { } bars · 0 $ ends · > < louder / quieter · gU accent · gu ghost · r1–r8 dynamic (r5 = mf) · counts: 3> = 3 steps, >2w = 2 chords · objects ic ib ih ip iv iw (>ib) · . repeat · u undo · Esc leaves.'; };
  // the clip's sounding notes as a sorted list L of note indices, with where each chord / beat / bar starts and ends (as positions in L)
  Daw.prototype.vimModel = function () {
    var c = this.clip(), tr = this.track(), p = this.p, drum = isDrum(tr), rows = drum ? rowsOf(tr).map(function (r) { return r[0]; }) : null;
    function rank(n) { return drum ? rows.length - rows.indexOf(n.m) : n.m; }
    var L = []; c.notes.forEach(function (n, i) { if (n.t < c.len) L.push(i); });
    L.sort(function (a, b) { return (c.notes[a].t - c.notes[b].t) || (rank(c.notes[a]) - rank(c.notes[b])); });
    function spans(keyOf) { var out = [], last = null; L.forEach(function (i, pos) { var k = keyOf(c.notes[i]); if (last === null || Math.abs(k - last) > 1e-6) { out.push({ from: pos, to: pos }); last = k; } else out[out.length - 1].to = pos; }); return out; }
    var chords = spans(function (n) { return n.t; }), beats = spans(function (n) { return Math.floor(n.t + 1e-6); }), bars = spans(function (n) { return Meter.barAt(p, c.start + n.t).bar; });
    function at(list, pos) { for (var k = 0; k < list.length; k++) if (pos >= list[k].from && pos <= list[k].to) return k; return 0; }
    return { c: c, L: L, chords: chords, beats: beats, bars: bars, at: at, pos: function (noteIdx) { return L.indexOf(noteIdx); } };
  };
  // the positions a motion or text object covers, for an operator (cursor at cp, motion count N); null if there is nothing there
  function vimRange(m, cp, key, N, object) {
    var n = m.L.length, out = [], g, i;
    function run(a, b) { for (var q = Math.max(0, a); q <= Math.min(n - 1, b); q++) out.push(q); }
    function unit(list) { var k = m.at(list, cp), last = Math.min(list.length - 1, k + N - 1); return [list[k].from, list[last].to]; }
    function forward(list) { var k = m.at(list, cp), to = k + N < list.length ? list[k + N].from - 1 : n - 1; return [cp, to]; }
    function back(list) { var k = m.at(list, cp), t = cp > list[k].from ? k - (N - 1) : k - N; t = Math.max(0, t); return [list[t].from, cp - 1]; }
    var r;
    if (object) {
      if (key === 'w') r = [cp, cp + N - 1]; else if (key === 'c') r = unit(m.chords); else if (key === 'h') r = unit(m.beats); else if (key === 'b') r = unit(m.bars); else if (key === 'p') r = [0, n - 1];
      else if (key === 'v') { m.chords.forEach(function (g2) { out.push(g2.to); }); return out; } else return null;
      run(r[0], r[1]); return out;
    }
    if (key === 'l') r = [cp, cp + N - 1]; else if (key === 'h') r = [cp - N, cp - 1];
    else if (key === 'k') { g = m.chords[m.at(m.chords, cp)]; r = [cp, Math.min(g.to, cp + N)]; } else if (key === 'j') { g = m.chords[m.at(m.chords, cp)]; r = [Math.max(g.from, cp - N), cp]; }
    else if (key === 'w') r = forward(m.chords); else if (key === 'b') r = back(m.chords); else if (key === 'e') r = [cp, m.chords[Math.min(m.chords.length - 1, m.at(m.chords, cp) + N - 1)].to];
    else if (key === ')') r = forward(m.beats); else if (key === '(') r = back(m.beats); else if (key === '}') r = forward(m.bars); else if (key === '{') r = back(m.bars);
    else if (key === '0') r = [0, cp - 1]; else if (key === '$') r = [cp, n - 1]; else if (key === 'dd') r = unit(m.chords); else return null;
    run(r[0], r[1]); return out;
  }
  // where the cursor goes for a motion
  function vimMove(m, cp, key, N) {
    var n = m.L.length, g = m.chords[m.at(m.chords, cp)];
    function next(list) { return list[Math.min(list.length - 1, m.at(list, cp) + N)].from; }
    function prev(list) { var k = m.at(list, cp); return list[Math.max(0, cp > list[k].from ? k - (N - 1) : k - N)].from; }
    switch (key) {
      case 'l': return Math.min(n - 1, cp + N); case 'h': return Math.max(0, cp - N);
      case 'k': return Math.min(g.to, cp + N); case 'j': return Math.max(g.from, cp - N);
      case 'w': return next(m.chords); case 'b': return prev(m.chords);
      case 'e': return m.chords[Math.min(m.chords.length - 1, m.at(m.chords, cp) + N - 1)].to;
      case ')': return next(m.beats); case '(': return prev(m.beats); case '}': return next(m.bars); case '{': return prev(m.bars);
      case '0': return 0; case '$': return n - 1;
    }
    return cp;
  }
  Daw.prototype.vimReveal = function () {
    var g = this.rollGeom, c = this.clip(), v = this.vim; if (!g || !c || v.cur < 0) return; var n = c.notes[v.cur]; if (!n) return;
    var x = n.t * g.bpx, ri = g.rowOf(n), w = g.wrap;
    if (x < w.scrollLeft + 90 || x > w.scrollLeft + w.clientWidth - 40) w.scrollLeft = Math.max(0, x - 120);
    if (ri >= 0) { var y = ri * g.rh; if (y < w.scrollTop + 10 || y > w.scrollTop + w.clientHeight - 40) w.scrollTop = Math.max(0, y - w.clientHeight / 2); }
  };
  // do an operator over a range (the actual edit): { op: '>' | '<' | 'gU' | 'gu' | 'r', amt, lvl, key, N, object }
  Daw.prototype.vimApply = function (spec) {
    var self = this, m = this.vimModel(), c = m.c, v = this.vim, cp = m.pos(v.cur); if (cp < 0) cp = 0;
    var pos = spec.op === 'r' ? vimRange(m, cp, 'dd', spec.N, false) : vimRange(m, cp, spec.key, spec.N, spec.object);
    if (!pos || !pos.length) { this.say('Nothing there for that motion.'); return false; }
    var idx = pos.map(function (q) { return m.L[q]; }), amt = spec.amt || 1;
    this.change(function () { idx.forEach(function (i) { var nt = c.notes[i], v0 = nt.v;
      if (spec.op === '>') nt.v = v0 + STEP * amt; else if (spec.op === '<') nt.v = v0 - STEP * amt; else if (spec.op === 'gU') nt.v = v0 + ACCENT * amt; else if (spec.op === 'gu') nt.v = GHOST; else if (spec.op === 'r') nt.v = DYN[spec.lvl - 1] / 127;
      nt.v = clamp(Math.round(nt.v * 127) / 127, 1 / 127, 1); });
      self.sel.notes = idx.slice(); });
    var vs = idx.map(function (i) { return Math.round(c.notes[i].v * 127); }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
    var what = { '>': 'louder by ' + amt + (amt > 1 ? ' steps' : ' step'), '<': 'quieter by ' + amt + (amt > 1 ? ' steps' : ' step'), gU: 'accented', gu: 'ghosted', r: 'set to ' + (DYN_NAME[spec.lvl - 1] || '') }[spec.op];
    this.say(idx.length + ' note' + (idx.length > 1 ? 's' : '') + ' ' + what + ': velocity now ' + (lo === hi ? lo : lo + '–' + hi) + '.'); this.vimReveal(); return true;
  };
  // one key in note mode; true = handled (swallowed)
  Daw.prototype.edKey = function (e) {
    var v = this.vim, k = e.key, c = this.clip(), self = this, mod = e.ctrlKey || e.metaKey;
    if (!c || v.id !== this.vimKeyId()) { v.on = false; return false; }
    if (mod) { if ((k === 'r' || k === 'R') && !e.metaKey) { this.doUndo(false); this.vimSync(); return true; } return false; }
    if (e.altKey) return false;
    function reset() { v.c1 = v.c2 = 0; v.op = null; v.g = v.i = v.r = false; }
    var m = this.vimModel(), cp = Math.max(0, m.pos(v.cur));
    if (k === 'Escape') { if (v.op || v.g || v.i || v.r || v.c1 || v.c2) { reset(); this.say('Cancelled.'); } else this.vimOff(); return true; }
    if (k === ' ' || k === 'Delete' || k === 'Backspace' || k === 'Enter' || k === 'Tab' || k.length > 1) return false;       // the transport and clip keys still work
    if (v.r) { var lvl = /^[1-8]$/.test(k) ? +k : 0, N = v.c1 || 1; reset(); if (!lvl) { this.say('r needs 1–8: ppp pp p mp mf f ff fff.'); return true; }
      var sp = { op: 'r', lvl: lvl, N: N }; if (this.vimApply(sp)) v.last = sp; return true; }
    if (v.i) { var obj = 'wchbpv'.indexOf(k) >= 0, A = v.c1 || 1, N2 = v.c2 || 1, op = v.op; reset(); if (!obj) { this.say('After i: w note, c chord, h beat, b bar, p clip, v top line.'); return true; }
      var sp2 = { op: op, amt: A, key: k, N: N2, object: true }; if (this.vimApply(sp2)) v.last = sp2; return true; }
    if (v.g) { v.g = false; if (!v.op && (k === 'U' || k === 'u')) { v.op = 'g' + k; this.say('g' + k + ' …'); return true; } reset(); this.say('Cancelled.'); return true; }
    if (/^[1-9]$/.test(k) || (k === '0' && (v.op ? v.c2 : v.c1))) { var key = v.op ? 'c2' : 'c1'; v[key] = Math.min(999, v[key] * 10 + +k); this.say((v.c1 || '') + (v.op ? ' ' + v.op + ' ' : '') + (v.c2 || '') + ' …'); return true; }
    if (v.op && ((v.op === '>' && k === '>') || (v.op === '<' && k === '<') || (v.op === 'gU' && k === 'U') || (v.op === 'gu' && k === 'u'))) {       // doubled: this chord (and N-1 more)
      var spd = { op: v.op, amt: v.c1 || 1, key: 'dd', N: v.c2 || 1 }; reset(); if (this.vimApply(spd)) v.last = spd; return true; }
    if (!v.op && (k === '>' || k === '<')) { v.op = k; this.say((v.c1 || '') + k + ' …'); return true; }
    if (!v.op && k === 'g') { v.g = true; this.say('g …'); return true; }
    if (v.op && k === 'i') { v.i = true; return true; }
    if (MOTIONS.indexOf(k) >= 0 && k.length === 1) {
      if (v.op) { var spm = { op: v.op, amt: v.c1 || 1, key: k, N: v.c2 || 1 }; reset(); if (this.vimApply(spm)) v.last = spm; return true; }
      var N3 = v.c1 || 1; reset(); var to = vimMove(m, cp, k, N3); v.cur = m.L[to]; this.sel.notes = [v.cur]; this.vimShow(m, to); return true; }
    if (k === 'r' && !v.op) { v.r = true; this.say((v.c1 || '') + 'r …  (1 ppp · 2 pp · 3 p · 4 mp · 5 mf · 6 f · 7 ff · 8 fff)'); return true; }
    if (k === '.' && !v.op) { reset(); if (!v.last) this.say('Nothing to repeat.'); else this.vimApply(v.last); return true; }
    if (k === 'u' && !v.op) { reset(); this.doUndo(true); this.vimSync(); return true; }
    reset(); this.say('Not a note-mode key: ' + k + '. Esc leaves.'); return true;
  };
  Daw.prototype.vimSync = function () {       // after undo / redo the notes are the same objects' copies: keep the cursor on a real note
    var c = this.clip(); if (!c || !c.notes.length) { this.vim.on = false; return; } if (this.vim.cur >= c.notes.length || this.vim.cur < 0) this.vim.cur = 0;
    this.sel.notes = [this.vim.cur]; if (this.redrawRoll) this.redrawRoll(); this.vimReveal();
  };
  Daw.prototype.vimShow = function (m, pos) {
    var c = m.c, n = c.notes[this.vim.cur], ci = m.at(m.chords, pos), g = m.chords[ci], w = Meter.where(this.p, c.start + n.t), tr = this.track();
    this.say('Note ' + (pos + 1) + ' of ' + m.L.length + ': ' + (isDrum(tr) ? n.m : noteName(n.m)) + ', bar ' + w.bar + ' beat ' + w.beat + (w.sub > 1 ? '.' + w.sub : '') + ', velocity ' + Math.round(n.v * 127) + ' (chord ' + (ci + 1) + ', ' + (g.to - g.from + 1) + ' note' + (g.to > g.from ? 's' : '') + ').');
    if (this.redrawRoll) this.redrawRoll(); this.vimReveal();
  };

  // ---------------- volume automation: the lane, its keys ----------------
  // V shows the selected track's lane. A puts a point at the playhead (at the level it already has, so nothing changes yet) and selects it; then
  // ↑ ↓ change it 1 dB (Shift 6, Alt 0.1), ← → move it a beat (Shift a bar, Alt a sixteenth), [ ] pick the previous / next point, Delete removes it,
  // Esc goes back to clips. Mouse: click the lane to add a point, drag to move it, double-click to remove it.
  var AUTO_H = 96;
  function byT(a, b) { return a.t - b.t; }
  function autoY(v) { return 6 + (AUTO_MAX - clamp(v, -48, AUTO_MAX)) / (AUTO_MAX + 48) * (AUTO_H - 12); }
  function autoV(y) { return y > AUTO_H - 5 ? AUTO_MIN : Math.round(clamp(AUTO_MAX - (y - 6) / (AUTO_H - 12) * (AUTO_MAX + 48), -48, AUTO_MAX) * 10) / 10; }
  function dbStr1(v) { return v <= AUTO_MIN ? '−∞ dB' : (v < 0 ? '−' : v > 0 ? '+' : '') + Math.abs(v).toFixed(1) + ' dB'; }
  Daw.prototype.toggleAuto = function () { this.autoOn = !this.autoOn; this.sel.pt = -1; if (this.bAuto) { this.bAuto.classList.toggle('mdaw-on', this.autoOn); this.bAuto.setAttribute('aria-pressed', String(this.autoOn)); }
    this.renderTracks(); this.say(this.autoOn ? 'Volume lane for ' + (this.track() ? this.track().name : '—') + ': A adds a point at the playhead, then ↑ ↓ ← → edit it, Esc leaves.' : 'Volume lane hidden.'); };
  Daw.prototype.autoPoint = function () { var tr = this.track(), arr = tr && tr.auto && tr.auto.vol; return arr && this.sel.pt >= 0 ? arr[this.sel.pt] || null : null; };
  Daw.prototype.autoSay = function () { var q = this.autoPoint(), tr = this.track(); if (!q) return; var w = Meter.where(this.p, q.t);
    this.say('Point ' + (this.sel.pt + 1) + ' of ' + tr.auto.vol.length + ' on ' + tr.name + ': bar ' + w.bar + ' beat ' + w.beat + (w.sub > 1 ? '.' + w.sub : '') + ', ' + dbStr1(q.v) + '.'); };
  Daw.prototype.autoDelete = function () {
    var q = this.autoOn && this.autoPoint(), tr = this.track(), self = this; if (!q) return false;
    this.change(function () { tr.auto.vol.splice(self.sel.pt, 1); if (!tr.auto.vol.length && !(tr.auto.leslie && tr.auto.leslie.length) && !(tr.auto.swell && tr.auto.swell.length)) delete tr.auto; self.sel.pt = -1; }); this.say('Point removed.'); return true;
  };
  Daw.prototype.autoKey = function (e) {
    if (e.key === 'v' || e.key === 'V') { this.toggleAuto(); return true; }
    if (!this.autoOn) return false; var k = navKey(e), p = this.p, tr = this.track(), self = this, q = this.autoPoint(), N = this.n || 1; if (!tr) return false;
    if (k === 'a' || k === 'A') {
      var beat = clamp(Math.round(this.pos / 0.25) * 0.25, 0, Meter.total(p)), arr = tr.auto && tr.auto.vol, hit = -1;
      if (arr) arr.forEach(function (x, i) { if (Math.abs(x.t - beat) < 1e-6) hit = i; });
      if (hit < 0) { var v = arr && arr.length ? autoAt(arr, beat) : tr.vol, np = { t: beat, v: Math.round(v * 10) / 10 };
        this.change(function () { if (!tr.auto) tr.auto = { vol: [] }; tr.auto.vol.push(np); tr.auto.vol.sort(byT); self.sel.pt = tr.auto.vol.indexOf(np); }); }
      else { this.sel.pt = hit; this.renderTracks(); }
      this.autoSay(); return true; }
    if (k === 'Escape' && this.sel.pt >= 0) { this.sel.pt = -1; this.renderTracks(); this.say('Back to clips.'); return true; }
    if (!q) return false;
    if (k === '[' || k === ']') { var n = tr.auto.vol.length; this.sel.pt = clamp(this.sel.pt + (k === '[' ? -N : N), 0, n - 1); this.setPos(tr.auto.vol[this.sel.pt].t); this.renderTracks(); this.revealHead(); this.autoSay(); return true; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { var dv = (e.shiftKey ? 6 : e.altKey ? 0.1 : 1) * N * (k === 'ArrowUp' ? 1 : -1);
      this.change(function () { q.v = Math.round(clamp(q.v + dv, AUTO_MIN, AUTO_MAX) * 10) / 10; }); this.autoSay(); return true; }
    if (k === 'ArrowLeft' || k === 'ArrowRight') { var dt = (e.shiftKey ? Meter.barLen(p, Meter.barAt(p, q.t).bar) : e.altKey ? 0.25 : 1) * N * (k === 'ArrowLeft' ? -1 : 1);
      this.change(function () { q.t = clamp(Math.round((q.t + dt) * 48) / 48, 0, Meter.total(p)); tr.auto.vol.sort(byT); self.sel.pt = tr.auto.vol.indexOf(q); }); this.setPos(q.t); this.revealHead(); this.autoSay(); return true; }
    return false;
  };
  Daw.prototype.autoRow = function () {
    var self = this, p = this.p, W = this.beatW(), tr = this.track(), total = Meter.total(p), H = AUTO_H, row = el('div', 'mdaw-row mdaw-autorow'), th = el('div', 'mdaw-th');
    th.style.borderLeftColor = COLORS[this.sel.track % COLORS.length]; th.appendChild(el('span', 'mdaw-name', 'Volume: ' + tr.name));
    th.appendChild(el('span', 'mdaw-hint', tr.auto && tr.auto.vol.length ? tr.auto.vol.length + ' point' + (tr.auto.vol.length > 1 ? 's' : '') + ': the fader is off' : 'No points: the fader sets the level'));
    row.appendChild(th);
    var lane = el('div', 'mdaw-lane'), cv = el('canvas', 'mdaw-cv'), dpr = Math.min(global.devicePixelRatio || 1, 30000 / Math.max(1, total * W)); lane.style.width = (total * W) + 'px'; lane.style.cursor = 'crosshair';
    cv.width = total * W * dpr; cv.height = H * dpr; cv.style.width = (total * W) + 'px'; cv.style.height = H + 'px'; lane.appendChild(cv); row.appendChild(lane);
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var css = getComputedStyle(this.node), ink = css.getPropertyValue('--site-ink').trim() || '#222', line = css.getPropertyValue('--site-border').trim() || '#ccc', acc = css.getPropertyValue('--site-accent-dk').trim() || '#a33', col = COLORS[this.sel.track % COLORS.length];
    function draw() {
      var pts = tr.auto && tr.auto.vol || []; x.clearRect(0, 0, total * W, H);
      for (var b = 0; b <= total + 1e-9; b += 1) { var lv = Meter.level(p, b); x.globalAlpha = lv === 2 ? 0.5 : 0.15; x.fillStyle = lv === 2 ? ink : line; x.fillRect(Math.round(b * W), 0, 1, H); }
      x.globalAlpha = 0.5; x.fillStyle = ink; x.font = '10px sans-serif';
      [0, -12, -24, -36].forEach(function (db) { x.fillRect(0, autoY(db), total * W, 1); x.fillText(db + ' dB', 3, autoY(db) - 2); });
      x.globalAlpha = 1;
      if (!pts.length) { x.setLineDash([4, 4]); x.strokeStyle = col; x.beginPath(); x.moveTo(0, autoY(tr.vol)); x.lineTo(total * W, autoY(tr.vol)); x.stroke(); x.setLineDash([]); return; }
      x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(0, autoY(pts[0].v)); pts.forEach(function (q) { x.lineTo(q.t * W, autoY(q.v)); }); x.lineTo(total * W, autoY(pts[pts.length - 1].v)); x.stroke(); x.lineWidth = 1;
      pts.forEach(function (q, i) { var on = i === self.sel.pt; x.fillStyle = on ? acc : col; x.beginPath(); x.arc(q.t * W, autoY(q.v), on ? 6 : 4, 0, 7); x.fill(); x.strokeStyle = on ? ink : 'rgba(0,0,0,.4)'; x.stroke(); });
    }
    draw();
    function hitAt(px, py) { var h = -1; (tr.auto && tr.auto.vol || []).forEach(function (q, i) { if (Math.abs(q.t * W - px) < 8 && Math.abs(autoY(q.v) - py) < 8) h = i; }); return h; }
    function snap(px) { return clamp(Math.round(px / W / 0.25) * 0.25, 0, total); }
    cv.addEventListener('dblclick', function (e) { var r = cv.getBoundingClientRect(), h = hitAt(e.clientX - r.left, e.clientY - r.top); if (h < 0) return; self.sel.pt = h; self.autoDelete(); });
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); self.node.focus({ preventScroll: true });
      var r = cv.getBoundingClientRect(), h = hitAt(e.clientX - r.left, e.clientY - r.top), before = JSON.stringify(self.p), moved = h < 0;
      if (!tr.auto) tr.auto = { vol: [] }; var arr = tr.auto.vol, q;
      if (h < 0) { q = { t: snap(e.clientX - r.left), v: autoV(e.clientY - r.top) }; arr.push(q); arr.sort(byT); } else q = arr[h];
      self.sel.pt = arr.indexOf(q); draw();
      function mv(ev) { moved = true; q.t = snap(ev.clientX - r.left); q.v = autoV(ev.clientY - r.top); arr.sort(byT); self.sel.pt = arr.indexOf(q); draw(); }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
        if (moved) { self.undo.push(before); self.redo = []; self.save(); } self.renderTracks(); self.renderMixer(); self.applyMix(); self.autoSay(); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    return row;
  };

  // S solos, M mutes the selected track (data-nav); SSS / MMM (three presses within 0.6 s) turn every solo / mute off
  Daw.prototype.msKey = function (k) {
    var now = Date.now(), solo = k === 'S', f = solo ? 'solo' : 'mute', tr = this.track(), m = this.msTap;
    m = this.msTap = m && m.k === k && now - m.at < 600 ? { k: k, n: m.n + 1, at: now } : { k: k, n: 1, at: now };
    if (m.n >= 3) { this.msTap = null; this.change(function () { this.p.tracks.forEach(function (t) { t[f] = false; }); }.bind(this)); return this.say(solo ? 'Every solo off.' : 'Every mute off.'); }
    if (!tr) return this.say('Select a track first.');
    this.change(function () { tr[f] = !tr[f]; }); this.say(tr.name + (solo ? (tr.solo ? ' soloed.' : ' not soloed.') : (tr.mute ? ' muted.' : ' unmuted.')) + (m.n === 1 ? ' (' + k + k + k + ' turns every ' + f + ' off.)' : ''));
  };
  Daw.prototype.arrKey = function (e) {
    var k = navKey(e), p = this.p, tr = this.track(), c = this.clip(), self = this, t = e.target, N = this.n || 1;
    if (this.inSession && this.inSession()) return false;
    if (this.show.automation && this.autoKey(e)) return true;
    if (this.navOn && global.MiniDaw.Nav && global.MiniDaw.Nav.key(this, e, N)) return true;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && k.indexOf('Arrow') === 0) return false;
    var dir = k === 'ArrowLeft' || k === 'ArrowUp' || k === '-' ? -1 : 1, unit = function (from) { var x = from; for (var i = 0; i < N; i++) x = e.altKey ? x + dir : barStep(p, x, dir); return x; };
    var inArr = this.sel.slot >= 0 ? null : c;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      if (e.shiftKey) { if (!inArr) { this.say('Select a clip first: ↑ ↓ pick the track, [ ] the clip.'); return true; }
        this.change(function () { inArr.start = clamp(unit(inArr.start), 0, Math.max(0, Meter.total(p) - 1)); });
        this.say(tr.name + ' clip moved to bar ' + (Meter.barAt(p, inArr.start).bar + 1) + ', beat ' + (Meter.where(p, inArr.start).beat) + '.'); return true; }
      this.locate(clamp(unit(this.pos), 0, Meter.total(p))); this.revealHead(); var w = Meter.where(p, this.pos); this.say('Playhead: bar ' + w.bar + ', beat ' + w.beat + '.'); return true; }
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      if (e.shiftKey) { if (!inArr) { this.say('Select a clip first: ↑ ↓ pick the track, [ ] the clip.'); return true; }
        var to = this.sel.track + dir * N, dest = p.tracks[to]; if (!dest) { this.say('No track there.'); return true; } if (kind(dest) !== kind(tr)) { this.say('A clip can only move to a track of its kind: drums, notes or audio.'); return true; }
        this.change(function () { tr.clips.splice(self.sel.clip, 1); dest.clips.push(inArr); self.sel = { track: to, clip: dest.clips.length - 1, slot: -1, notes: [] }; }); this.say('Clip moved to ' + dest.name + '.'); return true; }
      var ti = clamp(this.sel.track + dir * N, 0, p.tracks.length - 1); if (!p.tracks.length) return true;
      this.pick(ti, this.clipAtPos(ti, this.pos)); this.say(p.tracks[ti].name + (this.sel.clip >= 0 ? ': the clip under the playhead.' : ': no clip under the playhead (N makes one).')); return true; }
    if ((k === '[' || k === ']') && tr) {
      var order = tr.clips.map(function (cl, i) { return i; }).sort(function (a, b) { return tr.clips[a].start - tr.clips[b].start; });
      if (!order.length) { this.say(tr.name + ' has no clips.'); return true; }
      var d2 = k === '[' ? -1 : 1, at = order.indexOf(this.sel.clip), ni;
      if (at < 0) { ni = order.filter(function (i) { return d2 > 0 ? tr.clips[i].start >= self.pos - 1e-9 : tr.clips[i].start < self.pos - 1e-9; }); ni = d2 > 0 ? ni[0] : ni[ni.length - 1]; if (ni == null) ni = d2 > 0 ? order[0] : order[order.length - 1]; }
      else ni = order[clamp(at + d2 * N, 0, order.length - 1)];
      this.sel = { track: this.sel.track, clip: ni, slot: -1, notes: [] }; this.setPos(tr.clips[ni].start); this.renderTracks(); this.renderEditor(); this.revealHead();
      this.say(tr.name + ': clip ' + (order.indexOf(ni) + 1) + ' of ' + order.length + ', bar ' + (Meter.barAt(p, tr.clips[ni].start).bar + 1) + '.'); return true; }
    if (k === 'n' || k === 'N') { if (!tr) return true; if (isAudio(tr)) { this.say('Audio clips come from recording (R).'); return true; }
      this.newClip(this.sel.track, Meter.floor(p, this.pos)); this.say('New empty clip on ' + tr.name + ' at bar ' + (Meter.barAt(p, Meter.floor(p, this.pos)).bar + 1) + '.'); return true; }
    if (k === 'p' || k === 'P') {
      if (this.sel.slot >= 0) this.lastSlot = { track: this.sel.track, slot: this.sel.slot };       // (kept, so P P P lays it again and again)
      var ls = this.lastSlot, ptr = ls && p.tracks[ls.track], sc = ptr && (ptr.slots || [])[ls.slot];
      if (!sc) { this.say('P places a Session clip: pick one in the Session view, come back here, press P.'); return true; }
      var at0 = Meter.floor(p, this.pos), endAt = at0 + sc.len * N;
      this.change(function () { for (var i = 0; i < N; i++) { var cl = clone(sc); cl.start = at0 + i * sc.len; ptr.clips.push(cl); }
        self.sel = { track: ls.track, clip: ptr.clips.length - 1, slot: -1, notes: [] };
        if (endAt > Meter.total(p) + 1e-9) p.bars = Math.min(64, Meter.barAt(p, endAt - 1e-6).bar + 1); });
      this.setPos(Math.min(endAt, Meter.total(p))); this.revealHead();
      this.say('Placed the Session clip ' + (N > 1 ? N + ' times ' : '') + 'on ' + ptr.name + ' from bar ' + (Meter.barAt(p, at0).bar + 1) + '; the playhead is at the end (P again lays it next).'); return true; }
    if ((k === '-' || k === '=' || k === '+') && inArr) {
      var end = unit(inArr.start + inArr.len), min = e.altKey ? 1 : Meter.barLen(p, Meter.barAt(p, inArr.start).bar);
      this.change(function () { inArr.len = Math.max(Math.min(min, 1), Math.min(end - inArr.start, Meter.total(p) - inArr.start)); });
      this.say(tr.name + ' clip is ' + Meter.barsOfLen(p, inArr.start, inArr.len) + ' bars.'); return true; }
    return false;
  };

  var all = [];
  // a hand-off: localStorage "mdaw:handoff" = { at, name, midi (base64) }, opened by the first DAW with the Files row, within ten minutes
  var HANDOFF = 'mdaw:handoff';
  function takeHandoff() {
    var h = store(HANDOFF); if (!h || !h.midi) return; var d = null;
    for (var i = 0; i < all.length; i++) if (all[i].show.files) { d = all[i]; break; }
    if (!d) return; store(HANDOFF, null);
    if (Date.now() - (h.at || 0) > 10 * 60 * 1000) return;
    if (d.openMidi(unb64(h.midi), h.name)) setTimeout(function () { d.node.scrollIntoView({ block: 'start' }); }, 300);
  }
  global.MiniDaw = {
    init: function () { Array.prototype.forEach.call(document.querySelectorAll('.mdaw'), function (n) { if (!n.dataset.ready) { n.dataset.ready = '1'; try { all.push(new Daw(n)); } catch (e) { n.textContent = 'The DAW could not start: ' + e.message; if (global.console) console.error(e); } } }); takeHandoff(); return all; },
    // another page (the Backing Track) hands this page a MIDI file: MiniDaw.handOff(bytes, name, url) keeps it and opens url
    handOff: function (bytes, name, url) { store(HANDOFF, { at: Date.now(), name: name || 'the band.mid', midi: b64(bytes) }); if (url) global.open(url, '_blank'); },
    all: all, Projects: Projects, Clipboard: Clipboard, zoomBy: zoomBy, applyFeel: applyFeel, mulberry: mulberry, partOfInst: partOfInst, autoAt: autoAt, autoToCc: autoToCc, dbToCc: dbToCc, ccToDb: ccToDb, core: { Daw: Daw, Meter: Meter, el: el, btn: btn, clamp: clamp, isDrum: isDrum, isAudio: isAudio, playNote: playNote, click: click, COLORS: COLORS, NOTE: NOTE, instOf: instOf, clone: clone, rowsOf: rowsOf, ac: function () { return AC; }, bank: function () { return bank; } }, Meter: Meter, PRESETS: PRESETS, toMidi: toMidi, fromMidi: fromMidi, bandParts: bandParts, compInst: compInst, mkTrack: track, INSTS: INSTS
  };
  // only one DAW plays at a time
  document.addEventListener('pointerdown', function (e) { all.forEach(function (d) { if (d.playing && !d.node.contains(e.target) && e.target.closest && e.target.closest('.mdaw')) d.stop(); }); }, true);
})(window);
