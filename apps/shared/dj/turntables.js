// Turntables: two decks and a DJ mixer, plain Web Audio. window.Turntables.
// Used by the DJ and sampling lessons (lessons/dj-*.qmd, lessons/sampling-*.qmd) through lessons/_dj-kit.qmd, which loads this file,
// turntables.css, sampler-pads.js and calls Turntables.init(); SamplerPads.init().
//
// Markup:  <div class="dj-tt" data-id="dj-gear" data-a="demo:house124" data-b="demo:house120"
//               data-show="decks mixer eq filter phones match library" data-range="8" data-xf="0.5" data-curve="0"></div>
//   data-id      a name (tests and Turntables.byId use it)
//   data-a/-b    what each deck loads at start: "demo:<id>" (DEMOS below), a URL, or "" for empty
//   data-show    parts shown (all when absent): decks, mixer, eq, filter, gain, phones, match (tempo/phase helper), library (load menus)
//   data-decks   "1" for one deck and no mixer crossfader (the scratch lessons), default 2
//   data-range   pitch fader range at start, 8 or 16 (%)
//   data-xf, data-curve   crossfader position (0 = deck A, 1 = deck B) and curve (0 smooth/constant power .. 1 sharp cut)
//
// A deck: platter (drag the label = hand on the record: scratch, forwards or backwards; drag the rim = nudge, a touch on the side of
//   the platter: faster/slower while you hold), Play/Pause (the motor spins up and down like a real deck), Cue (stopped: sets the cue
//   point here; playing: back to the cue point and stop, CDJ style), ‹ › nudge buttons (hold), pitch fader ±8 / ±16 % (no key lock:
//   pitch moves the key too, shown in semitones), a scrolling waveform with beat ticks and an overview, BPM (the track's × pitch), Tap
//   (tap the beat: the tapped tempo), the key and its Camelot code, time.
// The mixer: per channel Gain (trim), Hi/Mid/Lo EQ (−26..+6 dB, a "kill" at the bottom), Filter (left low-pass, right high-pass), Cue
//   (send to the headphones, before the fader), channel fader; crossfader with a curve; Master; Phones: Cue/Master mix, Split cue
//   (cue in the left ear, master in the right, as cheap controllers do), and Listen: Speakers (the master) or Phones (what headphones
//   would hear: a browser has one output, so this switches what you hear).
//
// API
//   Turntables.init(root?)         makes a widget in every .dj-tt (not already made). Turntables.all: the widgets; Turntables.byId(id)
//   Turntables.load(deck, src)     -> Promise<track>. deck: 0/1, "A"/"B" (on the first widget) or a Deck. src: "demo:<id>", a URL
//                                  (fetched CORS-friendly: mode cors, no credentials), "<sourceId>:<trackId>" from TRACK_SOURCES,
//                                  an ArrayBuffer (an encoded file), an AudioBuffer, a File/Blob, or {buffer|url, title, bpm, key, firstBeat}
//   widget.decks[i]                Deck: load(src), play(), pause(), toggle(), cue(), setCue(t), seek(t), setPitch(pct), setRange(8|16),
//                                  nudge(bend, ms), scratch(rate) / release() (rate: 1 = normal speed, −1 backwards), tap(),
//                                  pos (s), playing, speed, pitch (1 = 0 %), cuePoint, track {title, bpm, key, camelot, dur, firstBeat, loop},
//                                  bpm() (now, with pitch), semis() (key shift from pitch)
//   widget.set(name, v)            mixer controls by name: xf, curve, master, phones (0 cue..1 master), split (bool), listen ("speakers"|"phones"),
//                                  and per channel "0.gain" (dB), "0.hi" / "0.mid" / "0.lo" (dB), "0.filter" (−1..1), "0.fader" (0..1), "0.cue" (bool)
//   widget.xfGains() -> [a, b]     the crossfader's gains now; widget.match() -> {diff, offsetMs} (tempo difference, beat offset A−B)
//   Turntables.audio               shared engine for SamplerPads: ctx(), ready() (worklet loaded), getBuffer(src) -> Promise<{buffer,...}>,
//                                  demo(id), peaks(buffer, n), detectBpm(buffer), toWav(buffer) -> ArrayBuffer, stretch(buffer, factor)
//   Turntables.DEMOS               built-in loops, synthesised offline on first use: {id: {title, bpm, key, camelot, bars, style}}
//   Turntables.CAMELOT             key -> Camelot code ("Am" -> "8A", "C" -> "8B")
//
// Songs from elsewhere (the R2 hook). Turntables.TRACK_SOURCES is a list of sources; each { id, label, list() -> Promise<[track]> } where a
//   track is { id, title, artist?, bpm?, key?, url, firstBeat?, license? }. The built-in "demo" source is first. To plug in a library of
//   songs kept in a Cloudflare R2 bucket (or any static host), publish a manifest JSON and name it, any one of:
//     window.DJ_CONFIG = { manifest: "https://<bucket>.r2.dev/dj/manifest.json" }   (before the kit loads), or
//     <meta name="dj-manifest" content="...">, or data-manifest="..." on a .dj-tt / .sp-pads, or Turntables.addManifest(url, label)
//   Manifest: { "label": "Site library", "tracks": [ { "id": "...", "title": "...", "artist": "...", "bpm": 124, "key": "Am",
//     "url": "songs/x.mp3", "firstBeat": 0.12, "license": "CC BY 4.0" } ] }   (url relative to the manifest). The bucket needs a CORS rule
//   allowing GET (and HEAD) from the site's origin; files are fetched whole with fetch(url, { mode: "cors", credentials: "omit" }) and
//   decoded with decodeAudioData, so MP3 / AAC / WAV / OGG / FLAC as the browser allows. Turntables.addSource({id, label, list}) adds a
//   source of any other kind (a signed-URL API, say). The load menus list every source's tracks, plus "Local file…".
//
// Output: everything goes through one gain registered with window.AudioTap ("Turntables"), so the navbar tuner can listen.
(function () {
  "use strict";
  const SR = 44100;
  let CTX = null, workletP = null, OUT = null;
  const ctx = () => {
    if (!CTX) {
      CTX = new (window.AudioContext || window.webkitAudioContext)();
      OUT = CTX.createGain(); OUT.connect(CTX.destination);
      if (window.AudioTap) try { AudioTap.register(CTX, OUT, "Turntables"); } catch (e) {}
    }
    if (CTX.state === "suspended") CTX.resume().catch(() => {});
    return CTX;
  };
  const WORKLET = `
class DjDeck extends AudioWorkletProcessor {
  constructor() { super(); this.L = null; this.R = null; this.n = 0; this.pos = 0; this.speed = 0; this.motor = 0; this.pitch = 1; this.bend = 0;
    this.scr = false; this.scrRate = 0; this.loop = false; this.bsr = sampleRate; this.k = 0;
    this.port.onmessage = e => { const m = e.data;
      if (m.L) { this.L = m.L; this.R = m.R || m.L; this.n = m.L.length; this.bsr = m.sr; this.pos = 0; this.speed = 0; }
      for (const k of ["motor", "pitch", "bend", "scr", "scrRate", "loop"]) if (k in m) this[k] = m[k];
      if ("seek" in m) this.pos = m.seek * this.bsr; }; }
  process(_, outs) { const o = outs[0], l = o[0], r = o[1] || o[0], ratio = this.bsr / sampleRate, n = this.n;
    for (let i = 0; i < l.length; i++) {
      const target = this.scr ? this.scrRate : this.motor ? this.pitch * (1 + this.bend) : 0;
      this.speed += (target - this.speed) * (this.scr ? 0.01 : this.motor ? 0.00016 : 0.00009);
      let a = 0, b = 0;
      if (n > 1) { const p = this.pos, j = Math.floor(p);
        if (j >= 0 && j < n - 1) { const f = p - j; a = this.L[j] + (this.L[j + 1] - this.L[j]) * f; b = this.R[j] + (this.R[j + 1] - this.R[j]) * f; }
        this.pos += this.speed * ratio;
        if (this.loop) { if (this.pos >= n - 1) this.pos -= n - 1; else if (this.pos < 0) this.pos += n - 1; }
        else if (this.pos > n) this.pos = n; else if (this.pos < 0) this.pos = 0; }
      l[i] = a; r[i] = b; }
    if (++this.k % 4 === 0) this.port.postMessage({ pos: this.pos / this.bsr, speed: this.speed });
    return true; } }
registerProcessor("dj-deck", DjDeck);`;
  const ready = () => workletP || (workletP = ctx().audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }))));

  // ---- keys
  const CAMELOT = { "Abm": "1A", "G#m": "1A", "B": "1B", "Ebm": "2A", "D#m": "2A", "F#": "2B", "Gb": "2B", "Bbm": "3A", "A#m": "3A", "Db": "3B", "C#": "3B",
    "Fm": "4A", "Ab": "4B", "G#": "4B", "Cm": "5A", "Eb": "5B", "D#": "5B", "Gm": "6A", "Bb": "6B", "A#": "6B", "Dm": "7A", "F": "7B", "Am": "8A", "C": "8B",
    "Em": "9A", "G": "9B", "Bm": "10A", "D": "10B", "F#m": "11A", "Gbm": "11A", "A": "11B", "C#m": "12A", "Dbm": "12A", "E": "12B" };
  const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  const NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const midiOf = (key, oct) => 12 * (oct + 1) + NOTE[key.replace("m", "")];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---- built-in loops (synthesised offline, cached)
  const DEMOS = {
    house124: { title: "Warehouse (house)", bpm: 124, key: "Am", bars: 8, style: "house" },
    house120: { title: "Late Bus (house)", bpm: 120, key: "Cm", bars: 8, style: "house" },
    house126: { title: "Neon Floor (house)", bpm: 126, key: "Em", bars: 8, style: "house" },
    techno128: { title: "Concrete (techno)", bpm: 128, key: "Fm", bars: 8, style: "techno" },
    disco118: { title: "Mirrorball (disco)", bpm: 118, key: "G", bars: 8, style: "disco" },
    boom90: { title: "Corner Store (boom bap)", bpm: 90, key: "Dm", bars: 4, style: "boom" },
    break100: { title: "Funky Break (drums only)", bpm: 100, key: "Am", bars: 4, style: "break" },
    soul84: { title: "Old Soul Record (chords)", bpm: 84, key: "Eb", bars: 4, style: "soul" },
    vox124: { title: "Hey Now (acapella)", bpm: 124, key: "Am", bars: 8, style: "vox" },
    ahh: { title: "Ahh + stab (scratch sample)", bpm: 90, key: "Dm", bars: 2, style: "ahh" }
  };
  for (const k in DEMOS) { DEMOS[k].id = k; DEMOS[k].camelot = CAMELOT[DEMOS[k].key]; }
  const demoCache = {};
  let noiseBuf = null;
  function renderDemo(id) {
    const d = DEMOS[id]; if (!d) return Promise.reject(new Error("no demo " + id));
    if (demoCache[id]) return demoCache[id];
    const beat = 60 / d.bpm, len = Math.ceil(d.bars * 4 * beat * SR);
    const oc = new OfflineAudioContext(2, len, SR), bus = oc.createGain(); bus.gain.value = 0.7;
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; bus.connect(comp); comp.connect(oc.destination);
    const nb = oc.createBuffer(1, SR, SR), nd = nb.getChannelData(0); let seed = 7;
    for (let i = 0; i < SR; i++) { seed = (seed * 16807) % 2147483647; nd[i] = seed / 1073741823.5 - 1; }
    noiseBuf = nb;
    const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + a + dec); };
    const kick = (t, v = 1) => { const o = oc.createOscillator(), g = oc.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      env(g, t, 0.002, 0.95 * v, 0.35); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.5); };
    const noise = (t, dur, type, f, q, v, pan = 0) => { const s = oc.createBufferSource(), fl = oc.createBiquadFilter(), g = oc.createGain(), p = oc.createStereoPanner();
      s.buffer = nb; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(g, t, 0.001, v, dur); p.pan.value = pan;
      s.connect(fl); fl.connect(g); g.connect(p); p.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.1); };
    const snare = (t, v = 1) => { noise(t, 0.18, "bandpass", 1800, 0.8, 0.6 * v); const o = oc.createOscillator(), g = oc.createGain(); o.frequency.value = 190;
      env(g, t, 0.001, 0.35 * v, 0.1); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2); };
    const clap = (t, v = 1) => { for (const dt of [0, 0.011, 0.022]) noise(t + dt, dt === 0.022 ? 0.15 : 0.02, "bandpass", 1300, 1.5, 0.5 * v); };
    const hat = (t, v = 1, open = false) => noise(t, open ? 0.22 : 0.04, "highpass", 8000, 0.7, 0.28 * v, 0.2);
    const tone = (t, dur, f, type, v, cutoff, pan = 0, att = 0.005) => { const o = oc.createOscillator(), fl = oc.createBiquadFilter(), g = oc.createGain(), p = oc.createStereoPanner();
      o.type = type; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = cutoff; p.pan.value = pan;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setValueAtTime(v, t + Math.max(att, dur - 0.03)); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(fl); fl.connect(g); g.connect(p); p.connect(bus); o.start(t); o.stop(t + dur + 0.05); return o; };
    const minor = /m$/.test(d.key), root = midiOf(d.key, 2);
    const prog = minor ? [0, 0, 8, 7, 0, 0, 3, 10] : [0, 9, 5, 7, 0, 9, 5, 7];        // i i VI V... / I vi IV V
    const third = deg => (minor ? [0, 3, 5, 7, 8, 10].includes(deg % 12) ? 3 : 4 : [0, 5, 7].includes(deg % 12) ? 4 : 3);
    const bars = d.bars, s16 = beat / 4;
    for (let bar = 0; bar < bars; bar++) {
      const t0 = bar * 4 * beat, deg = prog[bar % prog.length], r = root + deg;
      for (let st = 0; st < 16; st++) {
        const t = t0 + st * s16, sw = (d.style === "boom" || d.style === "soul") && st % 2 ? s16 * 0.12 : 0, tt = t + sw;
        if (d.style === "house" || d.style === "techno" || d.style === "disco") {
          if (st % 4 === 0) kick(tt);
          if (st % 8 === 4) (d.style === "techno" ? clap : clap)(tt, 0.9);
          if (st % 4 === 2) hat(tt, 1, d.style !== "techno");
          if (d.style === "techno" && st % 2 === 1) hat(tt, 0.4);
          if (d.style === "disco" && st % 2 === 1) hat(tt, 0.5);
          // bass: off-beat for house, rolling 16ths for techno, octaves for disco
          if (d.style === "house" && (st % 4 === 2 || st === 15)) tone(tt, s16 * 1.6, hz(r), "sawtooth", 0.32, 380);
          if (d.style === "techno" && st % 4 !== 0) tone(tt, s16 * 0.8, hz(r - 12 + (st % 4 === 3 ? 12 : 0)), "square", 0.2, 300);
          if (d.style === "disco" && st % 2 === 0) tone(tt, s16 * 1.4, hz(r + (st % 4 === 2 ? 12 : 0)), "sawtooth", 0.28, 600);
          if (st === 0 || (d.style === "house" && st === 10)) for (const iv of [12, 12 + third(deg), 19]) tone(tt, d.style === "disco" ? beat * 3.5 : s16 * 2, hz(r + iv + 12), d.style === "techno" ? "square" : "triangle", d.style === "techno" ? 0.035 : 0.07, 2400, (iv - 15) / 10);
        } else if (d.style === "boom" || d.style === "break") {
          const kp = [0, 7, 10], sp = [4, 12];
          if (kp.includes(st) || (bar % 2 && st === 9)) kick(tt);
          if (sp.includes(st)) snare(tt);
          if (d.style === "break" && (st === 14 || (bar % 2 && st === 15))) snare(tt, 0.35);
          if (st % 2 === 0) hat(tt, st % 4 === 0 ? 1 : 0.6);
          if (d.style === "boom" && st % 8 === 0) for (const iv of [12, 12 + third(deg), 19, 22]) tone(tt, beat * 1.8, hz(r + iv), "sine", 0.07, 1500, 0, 0.02);
          if (d.style === "boom" && (st === 0 || st === 10)) tone(tt, beat * 0.9, hz(r), "triangle", 0.4, 300);
        } else if (d.style === "soul") {
          if (st === 0 || st === 8) for (const iv of [12, 12 + third(deg), 19, 23]) tone(tt, beat * 1.9, hz(r + iv), "triangle", 0.06, 1800, (iv - 17) / 12, 0.03);
          if (st % 4 === 0) tone(tt, beat * 0.8, hz(r + (st === 8 ? 7 : 0)), "sine", 0.35, 400);
          if (st % 4 === 2) hat(tt, 0.35);
          if (st === 4 || st === 12) noise(tt, 0.12, "bandpass", 2500, 1, 0.25);
        }
      }
      if (d.style === "vox") {   // a sung-sounding line: a sawtooth through two vowel formants, on the off-beats
        const line = [[0, 7, 2], [2, 7, 1], [3, 9, 1], [4, 7, 3], [8, 5, 2], [10, 3, 2], [12, 2, 3]];
        if (bar % 2 === 0) for (const [b8, iv, l8] of line) {
          const t = t0 + b8 * beat / 2, o = oc.createOscillator(), g = oc.createGain(); o.type = "sawtooth"; o.frequency.value = hz(root + 24 + iv);
          const v = oc.createOscillator(), vg = oc.createGain(); v.frequency.value = 5.5; vg.gain.value = 4; v.connect(vg); vg.connect(o.frequency);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.04); g.gain.setValueAtTime(0.25, t + l8 * beat / 2 - 0.05); g.gain.linearRampToValueAtTime(0, t + l8 * beat / 2);
          for (const [f, q, a] of [[800, 6, 1], [1150, 8, 0.6], [2900, 10, 0.25]]) { const fl = oc.createBiquadFilter(), fg = oc.createGain(); fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q; fg.gain.value = a * 3; o.connect(fl); fl.connect(fg); fg.connect(g); }
          g.connect(bus); o.start(t); o.stop(t + l8 * beat / 2 + 0.05); v.start(t); v.stop(t + l8 * beat / 2 + 0.05);
        }
      }
    }
    if (d.style === "ahh") {    // "ahh" (rising vowel) then a horn stab: the classic pair to scratch
      const t = 0, o = oc.createOscillator(), g = oc.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(hz(root + 19), t); o.frequency.linearRampToValueAtTime(hz(root + 22), t + 0.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.03); g.gain.setValueAtTime(0.3, t + 0.8); g.gain.linearRampToValueAtTime(0, t + 1.1);
      for (const [f, q] of [[750, 5], [1100, 7], [2600, 9]]) { const fl = oc.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q; o.connect(fl); fl.connect(g); }
      g.connect(bus); o.start(t); o.stop(t + 1.2);
      for (const iv of [12, 15, 19, 24]) tone(4 * beat, 0.35, hz(root + iv + 12), "sawtooth", 0.08, 2500);
      kick(6 * beat); snare(7 * beat);
    }
    return (demoCache[id] = oc.startRendering().then(buffer => ({ buffer, title: d.title, bpm: d.bpm, key: d.key, camelot: d.camelot, firstBeat: 0, loop: d.style !== "ahh", demo: id })));
  }

  // ---- sources (the R2 hook)
  const TRACK_SOURCES = [{ id: "demo", label: "Built-in loops", list: () => Promise.resolve(Object.values(DEMOS).map(d => ({ id: d.id, title: d.title, bpm: d.bpm, key: d.key, url: "demo:" + d.id }))) }];
  const sourceChange = [];
  function addSource(src) { if (!TRACK_SOURCES.some(s => s.id === src.id)) { TRACK_SOURCES.push(src); sourceChange.forEach(f => f()); } return src; }
  function addManifest(url, label) {
    const abs = new URL(url, location.href).href, id = "m" + TRACK_SOURCES.length;
    if (TRACK_SOURCES.some(s => s.manifest === abs)) return;
    let cache = null;
    return addSource({ id, label: label || "Library", manifest: abs, list: () => cache || (cache = fetch(abs, { mode: "cors", credentials: "omit" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(m => (m.tracks || []).map((t, i) => Object.assign({}, t, { id: t.id || String(i), url: new URL(t.url, abs).href })))
      .catch(e => { console.warn("Turntables: manifest", abs, e); cache = null; return []; })) });
  }
  function configSources(el) {
    const urls = [window.DJ_CONFIG && DJ_CONFIG.manifest, (document.querySelector('meta[name="dj-manifest"]') || {}).content, el && el.dataset.manifest];
    urls.forEach(u => u && addManifest(u, window.DJ_CONFIG && DJ_CONFIG.label));
  }
  async function allTracks() {
    const out = [];
    for (const s of TRACK_SOURCES) { let l = []; try { l = await s.list(); } catch (e) {} out.push({ source: s, tracks: l }); }
    return out;
  }
  const decode = ab => new Promise((res, rej) => ctx().decodeAudioData(ab.slice(0), res, rej));
  async function getBuffer(src) {
    if (src == null || src === "") return null;
    if (src instanceof AudioBuffer) return { buffer: src, title: "Buffer" };
    if (src instanceof ArrayBuffer) return { buffer: await decode(src), title: "File" };
    if (typeof Blob !== "undefined" && src instanceof Blob) return { buffer: await decode(await src.arrayBuffer()), title: (src.name || "File").replace(/\.\w+$/, "") };
    if (typeof src === "object") { const r = await getBuffer(src.buffer || src.url); return Object.assign(r, src, { buffer: r.buffer }); }
    const s = String(src), m = s.match(/^([\w-]+):(.+)$/);
    if (m && m[1] === "demo") return Object.assign({}, await renderDemo(m[2]));
    if (m && !/^(https?|blob|data)$/.test(m[1])) {
      const so = TRACK_SOURCES.find(x => x.id === m[1]);
      if (so) { const t = (await so.list()).find(x => x.id === m[2]); if (t) return getBuffer(t); }
    }
    const r = await fetch(s, { mode: "cors", credentials: "omit" });
    if (!r.ok) throw new Error("fetch " + r.status + " " + s);
    return { buffer: await decode(await r.arrayBuffer()), title: decodeURIComponent(s.split("/").pop().replace(/\.\w+$/, "")) };
  }

  // ---- analysis
  function peaks(buf, n) {
    const d = buf.getChannelData(0), d2 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d, step = d.length / n, out = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; const a = Math.floor(i * step), b = Math.min(d.length, Math.floor((i + 1) * step));
      for (let j = a; j < b; j += 4) { const v = Math.max(Math.abs(d[j]), Math.abs(d2[j])); if (v > m) m = v; } out[i] = m; }
    return out;
  }
  function onsetEnvelope(buf, hop = 512) {
    const d = buf.getChannelData(0), n = Math.floor(d.length / hop), e = new Float32Array(n);
    let prev = 0;
    for (let i = 0; i < n; i++) { let s = 0; for (let j = i * hop; j < (i + 1) * hop; j++) s += d[j] * d[j]; s = Math.sqrt(s / hop); e[i] = Math.max(0, s - prev); prev = s; }
    return e;
  }
  function detectBpm(buf) {               // autocorrelation of the onset envelope, a comb over 1, 2 and 4 beats (so a bar's pattern counts)
    const hop = 512, e = onsetEnvelope(buf, hop), fps = buf.sampleRate / hop;
    const ac = lag => { let s = 0, n = 0; for (let i = 0; i + lag + 1 < e.length; i++, n++) { const j = i + lag, k = Math.floor(j), f = j - k; s += e[i] * (e[k] * (1 - f) + e[k + 1] * f); } return n ? s / n : 0; };
    let best = -1, bpmBest = 120;
    for (let bpm = 80; bpm <= 170; bpm += 0.25) { const L = fps * 60 / bpm, s = ac(L) + ac(2 * L) + ac(4 * L);
      if (s > best) { best = s; bpmBest = bpm; } }
    return Math.round(bpmBest * 10) / 10;
  }
  function onsets(buf, max = 16) {        // transient times (s), strongest first spread apart, then sorted
    const hop = 256, e = onsetEnvelope(buf, hop), fps = buf.sampleRate / hop, gap = Math.round(fps * 0.08), out = [];
    const idx = Array.from(e.keys()).sort((a, b) => e[b] - e[a]);
    for (const i of idx) { if (out.length >= max) break; if (e[i] <= 0) break; if (out.every(j => Math.abs(j - i) > gap)) out.push(i); }
    return out.sort((a, b) => a - b).map(i => Math.max(0, (i - 1) / fps));
  }
  function stretch(buf, factor) {          // overlap-add time stretch (pitch kept); factor 2 = twice as long. Simple OLA: you hear its smear.
    const N = 2048, hs = 512, ha = hs / factor, n = buf.length, outLen = Math.max(1, Math.round(n * factor));
    const out = ctx().createBuffer(buf.numberOfChannels, outLen, buf.sampleRate), w = new Float32Array(N);
    for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const x = buf.getChannelData(c), y = out.getChannelData(c), norm = new Float32Array(outLen);
      for (let k = 0; k * hs < outLen; k++) { const a = Math.round(k * ha), o = k * hs;
        for (let i = 0; i < N && o + i < outLen; i++) { const v = a + i < n ? x[a + i] : 0; y[o + i] += v * w[i]; norm[o + i] += w[i]; } }
      for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) y[i] /= norm[i];
    }
    return out;
  }
  function toWav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, ab = new ArrayBuffer(44 + n * ch * 2), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true); o += 2; }
    return ab;
  }

  // ---- DOM helpers
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const btn = (txt, title, cls) => { const b = h("button", "btn btn-sm btn-outline-secondary " + (cls || ""), txt); b.type = "button"; if (title) b.title = title; return b; };
  const range = (min, max, step, val, cls) => { const r = h("input", cls); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = val; return r; };
  const fmtT = s => { s = Math.max(0, s); return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") + "." + Math.floor(s * 10 % 10); };
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const dbg = db => Math.pow(10, db / 20);

  // ---- a deck
  class Deck {
    constructor(w, i) {
      this.w = w; this.i = i; this.name = "AB"[i]; this.pos = 0; this.speed = 0; this.playing = false; this.pitchPct = 0; this.rangePct = +(w.el.dataset.range || 8);
      this.cuePoint = 0; this.track = null; this.taps = []; this.tapBpm = 0; this.bendV = 0;
      this.ui();
    }
    get pitch() { return 1 + this.pitchPct / 100; }
    async node() {
      if (this.src) return this.src;
      await ready();
      const c = ctx(); this.src = new AudioWorkletNode(c, "dj-deck", { numberOfInputs: 0, outputChannelCount: [2] });
      this.src.port.onmessage = e => { this.pos = e.data.pos; this.speed = e.data.speed; };
      this.src.connect(this.w.ch[this.i].input);
      this.src.port.postMessage({ pitch: this.pitch });
      return this.src;
    }
    post(m) { if (this.src) this.src.port.postMessage(m); }
    async load(src) {
      this.status("Loading…");
      try {
        const t = await getBuffer(src); if (!t) { this.status(""); return null; }
        const b = t.buffer; await this.node();
        if (!t.bpm) { t.bpm = detectBpm(b); t.bpmGuessed = true; }
        t.dur = b.duration; t.camelot = t.camelot || CAMELOT[t.key] || ""; t.firstBeat = t.firstBeat || 0;
        this.track = t; this.peaks = peaks(b, Math.ceil(b.duration * 200)); this.over = peaks(b, 400);
        const L = b.getChannelData(0).slice(), R = (b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0)).slice();
        this.pause(); this.post({ L, R, sr: b.sampleRate, loop: !!t.loop }); this.pos = 0; this.cuePoint = t.firstBeat;
        this.titleEl.textContent = t.title + (t.artist ? " — " + t.artist : ""); this.status("");
        this.w.emit(); return t;
      } catch (e) { console.warn(e); this.status("Could not load: " + e.message); return null; }
    }
    status(s) { this.statusEl.textContent = s; }
    play() { if (!this.track) return; ctx(); this.playing = true; this.post({ motor: 1 }); this.playBtn.classList.add("dj-on"); this.playBtn.textContent = "❚❚"; }
    pause() { this.playing = false; this.post({ motor: 0 }); this.playBtn.classList.remove("dj-on"); this.playBtn.textContent = "▶"; }
    toggle() { this.playing ? this.pause() : this.play(); }
    seek(t) { this.pos = t; this.post({ seek: t }); }
    setCue(t) { this.cuePoint = t == null ? this.pos : t; }
    cue() { if (this.playing) { this.pause(); this.post({ seek: this.cuePoint }); this.pos = this.cuePoint; this.post({ scr: true, scrRate: 0 }); setTimeout(() => this.post({ scr: false }), 30); } else this.setCue(); }
    setPitch(p) { this.pitchPct = Math.max(-this.rangePct, Math.min(this.rangePct, +p)); this.post({ pitch: this.pitch }); this.pitchIn.value = -this.pitchPct; this.read(); this.w.emit(); }
    setRange(r) { this.rangePct = +r; this.pitchIn.min = -r; this.pitchIn.max = r; this.rangeSel.value = r; this.setPitch(this.pitchPct); }
    nudge(b, ms) { this.post({ bend: b }); clearTimeout(this.nt); if (ms) this.nt = setTimeout(() => this.post({ bend: 0 }), ms); }
    scratch(rate) { ctx(); this.scratching = true; this.post({ scr: true, scrRate: rate }); }
    release() { this.scratching = false; this.post({ scr: false }); }
    bpm() { return this.track ? this.track.bpm * (this.scratching ? this.speed : this.pitch) : 0; }
    semis() { return 12 * Math.log2(this.pitch); }
    tap() { const t = performance.now(); this.taps = this.taps.filter(x => t - x < 3000); this.taps.push(t);
      if (this.taps.length > 2) { const d = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1); this.tapBpm = Math.round(60000 / d * 10) / 10; }
      return this.tapBpm; }
    ui() {
      const el = this.el = h("div", "dj-deck dj-deck-" + this.name.toLowerCase());
      const head = h("div", "dj-dhead"); head.append(h("span", "dj-letter", this.name), this.titleEl = h("span", "dj-title", "(empty)"), this.statusEl = h("span", "dj-status"));
      el.append(head);
      this.wave = h("canvas", "dj-wave"); this.wave.height = 64; this.overC = h("canvas", "dj-over"); this.overC.height = 22;
      this.overC.title = "Click to jump"; this.overC.onclick = e => { if (!this.track) return; const r = this.overC.getBoundingClientRect(); this.seek((e.clientX - r.left) / r.width * this.track.dur); };
      el.append(this.wave, this.overC);
      const body = h("div", "dj-dbody");
      const plat = this.plat = h("div", "dj-platter"); plat.title = "Drag the label to scratch; drag the rim to nudge";
      this.rec = h("div", "dj-record"); this.rec.append(h("div", "dj-label"), h("div", "dj-mark")); plat.append(this.rec);
      this.platterDrag(plat);
      const side = h("div", "dj-side");
      this.pitchIn = range(-this.rangePct, this.rangePct, 0.02, 0, "dj-pitch"); this.pitchIn.title = "Pitch fader (down = faster, as on a Technics)";
      this.pitchIn.oninput = () => this.setPitch(-this.pitchIn.value);
      this.pitchIn.numEdit = { get: () => this.pitchPct.toFixed(2), set: v => this.setPitch(v) };
      this.rangeSel = h("select", "dj-range"); for (const r of [8, 16]) { const o = h("option", "", "±" + r + "%"); o.value = r; this.rangeSel.append(o); }
      this.rangeSel.value = this.rangePct; this.rangeSel.onchange = () => this.setRange(this.rangeSel.value);
      const zero = btn("0", "Pitch back to 0 %"); zero.onclick = () => this.setPitch(0);
      side.append(this.pitchIn, this.rangeSel, zero);
      body.append(plat, side); el.append(body);
      const tr = h("div", "dj-trans");
      this.playBtn = btn("▶", "Start / stop", "dj-play"); this.playBtn.onclick = () => this.toggle();
      const cueB = btn("CUE", "Stopped: set the cue point here. Playing: back to the cue point and stop"); cueB.onclick = () => this.cue();
      const nb = (t, b) => { const x = btn(t, b < 0 ? "Nudge back (hold)" : "Nudge forward (hold)");
        x.onpointerdown = () => this.nudge(b); x.onpointerup = x.onpointerleave = () => this.nudge(0); return x; };
      const tapB = btn("TAP", "Tap the beat"); tapB.onclick = () => { this.tap(); this.read(); };
      tr.append(this.playBtn, cueB, nb("‹", -0.04), nb("›", 0.04), tapB);
      el.append(tr);
      this.readEl = h("div", "dj-read"); el.append(this.readEl);
      const lib = this.libEl = h("div", "dj-lib");
      this.sel = h("select", "dj-sel"); this.sel.setAttribute("aria-label", "Load a track on deck " + this.name);
      this.file = h("input"); this.file.type = "file"; this.file.accept = "audio/*"; this.file.hidden = true;
      this.file.onchange = () => { if (this.file.files[0]) this.load(this.file.files[0]); };
      this.sel.onchange = () => { const v = this.sel.value; this.sel.selectedIndex = 0; if (v === "file") this.file.click(); else if (v) this.load(v); };
      lib.append(h("span", "dj-lbl", "Load"), this.sel, this.file); el.append(lib);
    }
    async fillLib() {
      const groups = await allTracks(), s = this.sel; s.innerHTML = "";
      s.append(h("option", "", "Choose a track…"));
      for (const g of groups) { if (!g.tracks.length) continue; const og = h("optgroup"); og.label = g.source.label;
        for (const t of g.tracks) { const o = h("option", "", t.title + (t.bpm ? "  " + t.bpm + " BPM" : "") + (t.key ? "  " + t.key + (CAMELOT[t.key] ? " " + CAMELOT[t.key] : "") : ""));
          o.value = /^demo:/.test(t.url) ? t.url : g.source.id + ":" + t.id; og.append(o); } s.append(og); }
      const f = h("option", "", "Local file…"); f.value = "file"; s.append(f);
    }
    platterDrag(plat) {
      let last = null, idle = null;
      const ang = e => { const r = plat.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        return { a: Math.atan2(e.clientY - cy, e.clientX - cx), rim: Math.hypot(e.clientX - cx, e.clientY - cy) > r.width * 0.42 }; };
      plat.addEventListener("pointerdown", e => { if (!this.track) return; e.preventDefault(); plat.setPointerCapture(e.pointerId);
        const g = ang(e); last = { a: g.a, t: performance.now(), rim: g.rim && this.playing };
        if (!last.rim) this.scratch(0); plat.classList.add("dj-held"); });
      plat.addEventListener("pointermove", e => { if (!last) return; const g = ang(e), t = performance.now();
        let da = g.a - last.a; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        const dt = Math.max(1, t - last.t) / 1000, revs = da / (2 * Math.PI);
        if (last.rim) this.nudge(Math.max(-0.12, Math.min(0.12, revs / dt * 0.08)));
        else { this.scratch(revs * 1.8 / dt); clearTimeout(idle); idle = setTimeout(() => this.scratching && this.scratch(0), 50); }
        last.a = g.a; last.t = t; });
      const up = () => { if (!last) return; if (last.rim) this.nudge(0); else this.release(); last = null; clearTimeout(idle); plat.classList.remove("dj-held"); };
      plat.addEventListener("pointerup", up); plat.addEventListener("pointercancel", up);
    }
    read() {
      const t = this.track;
      if (!t) { this.readEl.textContent = "Load a track below."; return; }
      const st = this.semis();
      this.readEl.innerHTML = "";
      const add = (k, v, cls) => { const s = h("span", "dj-ri " + (cls || "")); s.append(h("b", "", k), document.createTextNode(" " + v)); this.readEl.append(s); };
      add("BPM", this.bpm().toFixed(1) + (t.bpmGuessed ? "?" : ""), "dj-bpm");
      add("Pitch", (this.pitchPct >= 0 ? "+" : "") + this.pitchPct.toFixed(1) + "%");
      if (t.key) add("Key", t.key + (t.camelot ? " · " + t.camelot : "") + (Math.abs(st) >= 0.05 ? " (" + (st > 0 ? "+" : "") + st.toFixed(1) + " st)" : ""));
      add("Time", fmtT(this.pos) + " / " + fmtT(t.dur));
      if (this.tapBpm) add("Tap", this.tapBpm.toFixed(1));
    }
    draw() {
      const c = this.wave, w = c.clientWidth || 300; if (c.width !== w) c.width = w;
      const g = c.getContext("2d"), H = c.height, ink = css("--site-ink-2") || "#888", acc = css("--site-accent") || "#c60";
      g.clearRect(0, 0, w, H);
      if (this.track && this.peaks) {
        const pps = 200, span = 3, x0 = this.pos - span * w / (w || 1) / 2 * 0 - span / 2; // 3 seconds across
        for (let x = 0; x < w; x++) { const tt = x0 + x / w * span; let i = Math.floor(tt * pps);
          if (this.track.loop) i = ((i % this.peaks.length) + this.peaks.length) % this.peaks.length;
          const v = this.peaks[i] || 0; g.fillStyle = this.i ? "#3a8fd0" : "#d0703a"; g.fillRect(x, H / 2 - v * H / 2, 1, v * H || 0.5); }
        const bl = 60 / this.track.bpm; g.fillStyle = ink;
        for (let b = Math.ceil((x0 - this.track.firstBeat) / bl); ; b++) { const tt = this.track.firstBeat + b * bl; if (tt > x0 + span) break;
          const x = (tt - x0) / span * w; g.fillRect(x, 0, 1, b % 4 === 0 ? 10 : 5); }
        const cx = (this.cuePoint - x0) / span * w; g.fillStyle = "#e0b020"; g.fillRect(cx - 1, 0, 2, H);
      }
      g.fillStyle = "#e03a2a"; g.fillRect(w / 2 - 1, 0, 2, H);
      const o = this.overC, ow = o.clientWidth || 300; if (o.width !== ow) o.width = ow;
      const og = o.getContext("2d"), OH = o.height; og.clearRect(0, 0, ow, OH);
      if (this.track && this.over) { const n = this.over.length, p = this.pos / this.track.dur;
        for (let x = 0; x < ow; x++) { const v = this.over[Math.floor(x / ow * n)]; og.fillStyle = x / ow < p ? ink : (this.i ? "#3a8fd0" : "#d0703a"); og.fillRect(x, OH / 2 - v * OH / 2, 1, v * OH || 0.5); }
        og.fillStyle = "#e0b020"; og.fillRect(this.cuePoint / this.track.dur * ow - 1, 0, 2, OH);
        og.fillStyle = acc; og.fillRect(p * ow - 1, 0, 2, OH); }
      this.rec.style.transform = "rotate(" + (this.pos / 1.8 * 360) % 360 + "deg)";
      this.read();
    }
  }

  // ---- a widget (decks + mixer)
  const all = [];
  class Widget {
    constructor(el) {
      this.el = el; el._dj = this; this.id = el.dataset.id || "dj" + all.length;
      const show = (el.dataset.show || "decks mixer eq filter gain phones match library").split(/\s+/); this.show = s => show.includes(s);
      this.nDecks = +(el.dataset.decks || 2);
      this.m = { xf: +(el.dataset.xf != null ? el.dataset.xf : 0.5), curve: +(el.dataset.curve || 0), master: 0.85, phones: 0.5, split: false, listen: "speakers" };
      this.inputs = {};
      el.classList.add("dj-made"); el.tabIndex = 0; el.innerHTML = "";
      this.graph();
      const row = h("div", "dj-row"); el.append(row);
      this.decks = [];
      for (let i = 0; i < this.nDecks; i++) this.decks.push(new Deck(this, i));
      this.mixEl = this.mixer();
      row.append(this.decks[0].el); if (this.nDecks > 1 || this.show("mixer")) row.append(this.mixEl); if (this.decks[1]) row.append(this.decks[1].el);
      if (!this.show("mixer")) this.mixEl.hidden = true;
      if (!this.show("library")) this.decks.forEach(d => d.libEl.hidden = true);
      this.helpEl = h("div", "dj-match"); if (this.nDecks > 1 && this.show("match")) el.append(this.helpEl);
      el.addEventListener("pointerdown", () => ctx(), true);
      configSources(el);
      const fill = () => this.decks.forEach(d => d.fillLib()); fill(); sourceChange.push(fill);
      ["a", "b"].forEach((k, i) => { const s = el.dataset[k]; if (s && this.decks[i]) this.decks[i].load(s); });
      this.apply();
      all.push(this);
      const loop = () => { if (!document.body.contains(el)) return; if (el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight) { this.decks.forEach(d => d.draw()); this.drawMatch(); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    graph() {
      const c = ctx();
      this.masterSum = c.createGain(); this.masterVol = c.createGain(); this.cueSum = c.createGain();
      this.mOut = c.createGain(); this.cOut = c.createGain(); this.mPan = c.createStereoPanner(); this.cPan = c.createStereoPanner();
      this.masterSum.connect(this.masterVol); this.masterVol.connect(this.mOut); this.mOut.connect(this.mPan); this.mPan.connect(OUT);
      this.cueSum.connect(this.cOut); this.cOut.connect(this.cPan); this.cPan.connect(OUT);
      this.ch = [0, 1].map(() => {
        const s = { input: c.createGain(), lo: c.createBiquadFilter(), mid: c.createBiquadFilter(), hi: c.createBiquadFilter(), lp: c.createBiquadFilter(), hp: c.createBiquadFilter(),
          fader: c.createGain(), xg: c.createGain(), cue: c.createGain(), v: { gain: 0, hi: 0, mid: 0, lo: 0, filter: 0, fader: 0.8, cue: false } };
        s.lo.type = "lowshelf"; s.lo.frequency.value = 120; s.mid.type = "peaking"; s.mid.frequency.value = 1000; s.mid.Q.value = 0.7; s.hi.type = "highshelf"; s.hi.frequency.value = 5000;
        s.lp.type = "lowpass"; s.lp.frequency.value = 22000; s.lp.Q.value = 1; s.hp.type = "highpass"; s.hp.frequency.value = 10; s.hp.Q.value = 1;
        s.input.connect(s.lo); s.lo.connect(s.mid); s.mid.connect(s.hi); s.hi.connect(s.lp); s.lp.connect(s.hp); s.hp.connect(s.fader); s.fader.connect(s.xg); s.xg.connect(this.masterSum);
        s.hp.connect(s.cue); s.cue.connect(this.cueSum);
        return s; });
    }
    xfGains() {
      const x = this.nDecks < 2 ? 0 : this.m.xf, k = 1 + this.m.curve * 24;
      const g = v => Math.min(1, Math.sin(Math.max(0, Math.min(1, v)) * Math.PI / 2) * (this.m.curve > 0 ? k : 1));
      const a = this.m.curve > 0 ? Math.min(1, (1 - x) * k) : g(1 - x), b = this.m.curve > 0 ? Math.min(1, x * k) : g(x);
      return [a, b];
    }
    set(name, v) {
      const [a, b] = String(name).split(".");
      if (b) { const s = this.ch[+a]; s.v[b] = b === "cue" ? !!v : +v; } else this.m[a] = a === "split" ? !!v : a === "listen" ? v : +v;
      const inp = this.inputs[name]; if (inp) { if (inp.type === "checkbox") inp.checked = !!v; else if (inp.tagName === "BUTTON") inp.classList.toggle("dj-on", !!v); else inp.value = v; }
      this.apply();
    }
    apply() {
      const c = ctx(), t = c.currentTime, set = (p, v) => p.setTargetAtTime(v, t, 0.01);
      const [ga, gb] = this.xfGains(), m = this.m;
      this.ch.forEach((s, i) => { const v = s.v;
        set(s.input.gain, dbg(v.gain)); set(s.lo.gain, v.lo); set(s.mid.gain, v.mid); set(s.hi.gain, v.hi);
        set(s.lo.gain, v.lo <= -25.9 ? -60 : v.lo); set(s.mid.gain, v.mid <= -25.9 ? -60 : v.mid); set(s.hi.gain, v.hi <= -25.9 ? -60 : v.hi);
        set(s.lp.frequency, v.filter < -0.02 ? 20000 * Math.pow(80 / 20000, -v.filter) : 22000);
        set(s.hp.frequency, v.filter > 0.02 ? 20 * Math.pow(8000 / 20, v.filter) : 10);
        set(s.fader.gain, v.fader * v.fader); set(s.xg.gain, i ? gb : ga); set(s.cue.gain, v.cue ? 1 : 0); });
      set(this.masterVol.gain, m.master);
      const ph = m.listen === "phones";
      set(this.mOut.gain, ph ? Math.min(1, 2 * m.phones) : 1); set(this.cOut.gain, ph ? Math.min(1, 2 * (1 - m.phones)) : 0);
      set(this.mPan.pan, ph && m.split ? 1 : 0); set(this.cPan.pan, ph && m.split ? -1 : 0);
      if (this.listenEl) this.listenEl.textContent = ph ? "Listening: phones" : "Listening: speakers";
    }
    mixer() {
      const mx = h("div", "dj-mixer"), strips = h("div", "dj-strips");
      const knob = (label, name, min, max, step, val, show = true) => { const l = h("label", "dj-knob"); const r = range(min, max, step, val); r.setAttribute("aria-label", label);
        r.oninput = () => this.set(name, r.value); this.inputs[name] = r; l.append(h("span", "", label), r); if (!show) l.hidden = true; return l; };
      for (let i = 0; i < this.nDecks; i++) {
        const st = h("div", "dj-strip"); st.append(h("div", "dj-sname", "Ch " + "AB"[i]));
        st.append(knob("Gain", i + ".gain", -12, 12, 0.5, 0, this.show("gain")), knob("Hi", i + ".hi", -26, 6, 0.5, 0, this.show("eq")), knob("Mid", i + ".mid", -26, 6, 0.5, 0, this.show("eq")),
          knob("Lo", i + ".lo", -26, 6, 0.5, 0, this.show("eq")), knob("Filter", i + ".filter", -1, 1, 0.01, 0, this.show("filter")));
        const cb = btn("CUE", "Send this channel to the headphones (before the fader)", "dj-cue"); cb.onclick = () => this.set(i + ".cue", !this.ch[i].v.cue); this.inputs[i + ".cue"] = cb;
        if (!this.show("phones")) cb.hidden = true;
        const f = range(0, 1, 0.01, 0.8, "dj-fader"); f.setAttribute("aria-label", "Channel " + "AB"[i] + " fader"); f.oninput = () => this.set(i + ".fader", f.value); this.inputs[i + ".fader"] = f;
        st.append(cb, f); strips.append(st);
      }
      mx.append(strips);
      if (this.nDecks > 1) {
        const xl = h("label", "dj-xf"); const xf = range(0, 1, 0.01, this.m.xf); xf.setAttribute("aria-label", "Crossfader"); xf.oninput = () => this.set("xf", xf.value); this.inputs.xf = xf;
        xl.append(h("span", "", "A"), xf, h("span", "", "B")); mx.append(xl);
        mx.append(knob("Curve (smooth → cut)", "curve", 0, 1, 0.01, this.m.curve));
      }
      mx.append(knob("Master", "master", 0, 1, 0.01, this.m.master));
      const ph = h("div", "dj-phones"); if (!this.show("phones")) ph.hidden = true;
      ph.append(knob("Phones: cue ↔ master", "phones", 0, 1, 0.01, this.m.phones));
      const sl = h("label", "dj-chk"), sc = h("input"); sc.type = "checkbox"; sc.onchange = () => this.set("split", sc.checked); this.inputs.split = sc; sl.append(sc, document.createTextNode(" Split cue"));
      const lb = btn("Listen: speakers", "Hear the master (speakers) or what the headphones would get", "dj-listen"); this.listenEl = lb;
      lb.onclick = () => this.set("listen", this.m.listen === "phones" ? "speakers" : "phones");
      ph.append(sl, lb); mx.append(ph);
      return mx;
    }
    match() {
      const [a, b] = this.decks; if (!a || !b || !a.track || !b.track) return null;
      const ph = d => { const bl = 60 / d.track.bpm; return (((d.pos - d.track.firstBeat) / bl) % 1 + 1) % 1; };
      let off = ph(a) - ph(b); if (off > 0.5) off -= 1; if (off < -0.5) off += 1;
      return { diff: a.bpm() - b.bpm(), offsetMs: off * 60000 / (a.bpm() || 120) };
    }
    drawMatch() {
      if (!this.helpEl.isConnected) return; const m = this.match();
      if (!m) { this.helpEl.textContent = "Load both decks to see how far apart they are."; return; }
      const ok = Math.abs(m.diff) < 0.05;
      this.helpEl.innerHTML = "";
      this.helpEl.append(h("span", ok ? "dj-good" : "", "Tempo: A " + this.decks[0].bpm().toFixed(2) + " · B " + this.decks[1].bpm().toFixed(2) + " (" + (m.diff > 0 ? "A faster by " : m.diff < 0 ? "B faster by " : "") + (ok ? "matched" : Math.abs(m.diff).toFixed(2) + " BPM") + ")"));
      const both = this.decks.every(d => d.playing);
      if (both) this.helpEl.append(h("span", Math.abs(m.offsetMs) < 15 ? "dj-good" : "", " · Beats: " + (Math.abs(m.offsetMs) < 15 ? "together" : (m.offsetMs > 0 ? "A ahead by " : "B ahead by ") + Math.abs(m.offsetMs).toFixed(0) + " ms")));
    }
    emit() { (this.listeners || []).forEach(f => f(this)); }
    on(f) { (this.listeners = this.listeners || []).push(f); }
  }

  function init(root) {
    configSources();
    (root || document).querySelectorAll(".dj-tt:not(.dj-made)").forEach(el => new Widget(el));
  }
  function load(deck, src) {
    if (deck instanceof Deck) return deck.load(src);
    const w = all[0]; if (!w) return Promise.reject(new Error("no turntables on this page"));
    const i = typeof deck === "string" ? "AB".indexOf(deck.toUpperCase()) : +deck;
    return w.decks[i].load(src);
  }
  window.Turntables = { init, load, all, byId: id => all.find(w => w.id === id), DEMOS, CAMELOT, NAMES, TRACK_SOURCES, addSource, addManifest,
    audio: { ctx, ready, out: () => (ctx(), OUT), getBuffer, demo: renderDemo, peaks, detectBpm, onsets, stretch, toWav, allTracks, configSources, onSources: f => sourceChange.push(f) } };
})();
