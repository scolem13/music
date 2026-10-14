// Practice widgets: a metronome, a drone and the circle of fifths, in the navbar of every page.
//
// Loaded site-wide from _includes/practice-widgets.html. Adds three buttons to the navbar ("Metronome", "Drone", "Circle"); each opens a small
// panel that floats over the page, so the tool can be used while the page underneath is in use. A dot on the button shows that it
// is sounding. The drone either holds its notes or plucks them the way a tanpura does. Settings are remembered in localStorage. Sound stops when you go to another page (every page is a fresh load).
//
// Everything here is its own: an AudioContext of its own, no Tone.js, nothing shared with the Backing Track.
(function () {
  "use strict";

  var KEY = "practiceWidgets.v1";
  var S = { tempo: 84, beats: 4, vol: { q: 80, e: 0, t: 0, s: 0 }, accent: true,
            droneDo: 0, droneOct: 3, tuning: "equal", tone: "soft", droneVol: 60, a4: 440, lowDo: false, pads: [0, 7],
            mode: "sustain", tanFirst: 7, tanRate: 50, tanTone: "string" };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved) Object.keys(saved).forEach(function (k) { S[k] = saved[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (typeof icons === "function") icons(); }

  var ctx = null, master = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext; ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ───────────────────────── Metronome ─────────────────────────
  var metro = { on: false, next: 0, beat: 0, timer: null, lamps: [], queue: [], raf: 0 };
  var SUBS = [   // key, label, offsets within the beat, pitch, level in the mix
    { k: "q", label: "Quarter notes", at: [0], hz: 1000, gain: 1 },
    { k: "e", label: "Eighths", at: [0.5], hz: 780, gain: 0.7 },
    { k: "t", label: "Triplets", at: [1 / 3, 2 / 3], hz: 660, gain: 0.6 },
    { k: "s", label: "Sixteenths", at: [0.25, 0.5, 0.75], hz: 560, gain: 0.5 }
  ];
  function click(t, hz, level) {
    if (level <= 0) return;
    var c = audio(), o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.001, level), t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.07);
  }
  function metroStep() {
    var c = audio();
    while (metro.next < c.currentTime + 0.12) {
      var spb = 60 / S.tempo, beatInBar = metro.beat % S.beats, first = beatInBar === 0 && S.beats > 1 && S.accent;
      SUBS.forEach(function (sub) {
        var lvl = S.vol[sub.k] / 100; if (!lvl) return;
        sub.at.forEach(function (off) {
          var accented = sub.k === "q" && first;
          click(metro.next + off * spb, accented ? sub.hz * 1.5 : sub.hz, lvl * lvl * sub.gain * (accented ? 1 : 0.85));
        });
      });
      metro.queue.push({ t: metro.next, beat: beatInBar });
      metro.next += spb; metro.beat++;
    }
  }
  function lampLoop() {
    if (!metro.on) return;
    var now = audio().currentTime, hit = -1;
    while (metro.queue.length && metro.queue[0].t <= now) hit = metro.queue.shift().beat;
    if (hit >= 0) metro.lamps.forEach(function (l, i) { l.classList.toggle("on", i === hit); });
    metro.raf = requestAnimationFrame(lampLoop);
  }
  function metroStart() {
    if (metro.on) return;
    var c = audio(); metro.on = true; metro.beat = 0; metro.queue = []; metro.next = c.currentTime + 0.06;
    metroStep(); metro.timer = setInterval(metroStep, 25); lampLoop(); refresh();
  }
  function metroStop() {
    if (!metro.on) return;
    metro.on = false; clearInterval(metro.timer); cancelAnimationFrame(metro.raf);
    metro.lamps.forEach(function (l) { l.classList.remove("on"); }); refresh();
  }

  // ───────────────────────── Drone ─────────────────────────
  var SOLFEGE = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "So", "Le", "La", "Te", "Ti"];
  var DN = window.DegreeNames || null;                      // apps/shared/degree-names.js: solfège, scale degrees or Sargam
  function nm(step) { return DN ? DN.label(step, { doPc: 0, restPc: 0 }) : SOLFEGE[((step % 12) + 12) % 12]; }   // the drone's Do is its home note
  var NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var JUST = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
  var drone = { voices: {}, outG: null };          // voices: step (0..11, or -12 for the low Do) -> voice
  function etFreq(midi) { return S.a4 * Math.pow(2, (midi - 69) / 12); }
  function doMidi() { return 12 * (S.droneOct + 1) + S.droneDo; }
  // frequency of the note `step` semitones above Do. Pure: just intonation above Do; Equal: the piano's.
  function freqFor(step) {
    var base = etFreq(doMidi());
    if (S.tuning !== "pure") return base * Math.pow(2, step / 12);
    var oct = Math.floor(step / 12), pc = ((step % 12) + 12) % 12;
    return base * JUST[pc] * Math.pow(2, oct);
  }
  function centsOff(step) { return 1200 * Math.log2(freqFor(step) / (etFreq(doMidi()) * Math.pow(2, step / 12))); }
  function droneOut() {
    var c = audio();
    if (!drone.outG) { drone.outG = c.createGain(); drone.outG.connect(master); }
    drone.outG.gain.value = Math.pow(S.droneVol / 100, 2) * 0.5;
    return drone.outG;
  }
  function voiceStart(step) {
    var c = audio(), out = droneOut(), g = c.createGain(), f = freqFor(step), parts = [], tone = S.tone;
    g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(1, c.currentTime + 0.35);
    var node = g;
    function osc(type, ratio, level, detune) {
      var o = c.createOscillator(), lv = c.createGain(); o.type = type; o.frequency.value = f * ratio; o.detune.value = detune || 0; lv.gain.value = level;
      o.connect(lv); lv.connect(node === g ? g : node); o.start(); parts.push({ o: o, ratio: ratio }); return o;
    }
    if (tone === "reed") {                          // harmonium-like: two slightly detuned saws through a low-pass
      var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.min(2400, f * 5); lp.Q.value = 0.5; lp.connect(g); node = lp;
      osc("sawtooth", 1, 0.35, -5); osc("sawtooth", 1, 0.35, 5);
    } else if (tone === "organ") {
      osc("sine", 1, 0.5); osc("sine", 2, 0.25); osc("sine", 3, 0.12); osc("sine", 0.5, 0.2);
    } else {
      osc("sine", 1, 0.7); osc("sine", 2, 0.08);
    }
    g.connect(out);
    drone.voices[step] = { g: g, parts: parts };
  }
  function voiceStop(step) {
    var v = drone.voices[step]; if (!v) return; delete drone.voices[step];
    var c = audio(); v.g.gain.cancelScheduledValues(c.currentTime); v.g.gain.setValueAtTime(v.g.gain.value, c.currentTime);
    v.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
    v.parts.forEach(function (p) { p.o.stop(c.currentTime + 0.45); });
  }
  // Tanpura: four strings plucked round and round. The first is Pa, Ma or Ni below Sa, then Sa twice, then Sa an octave lower.
  // Each pluck is a wave with many harmonics through a band-pass that sweeps up and falls back, for the buzz of the bridge.
  var tan = { timer: null, next: 0, i: 0, bus: null, wave: null };
  var TAN_RING = 6;                                 // seconds a string rings, so several overlap
  function tanWave(c) {
    if (!tan.wave) {
      var n = 40, re = new Float32Array(n + 1), im = new Float32Array(n + 1);
      for (var k = 1; k <= n; k++) im[k] = 1 / Math.pow(k, 0.6);
      tan.wave = c.createPeriodicWave(re, im);
    }
    return tan.wave;
  }
  // The "String" sound: a plucked string worked out sample by sample (Karplus-Strong), with the bridge's buzz (jawari) inside the
  // loop: each time round, the wave is bent a little more on one side than the other, as the string grazes the curved bridge. That pushes
  // energy up into the high harmonics while the note sounds, so the buzz rises and swirls by itself. Each pitch is worked out once
  // (two takes, so repeated Sa's differ) and kept.
  var tanBufs = {}, STRING_RING = 9;
  function stringBuf(c, f, take) {
    var key = f.toFixed(2) + ":" + take;
    if (tanBufs[key]) return tanBufs[key];
    if (Object.keys(tanBufs).length > 24) tanBufs = {};
    var sr = c.sampleRate, len = Math.round(sr * STRING_RING), out = new Float32Array(len);
    var sm = 0.3, D = sr / f - sm, size = Math.ceil(D) + 2, buf = new Float32Array(size);
    var seed = 12345 + take * 777;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; }
    var lp = 0, pos = Math.max(1, Math.round(size / 7));           // a soft finger: smoothed noise, plucked near one end
    for (var i = 0; i < size; i++) { lp += 0.2 * (rnd() - lp); buf[i] = lp; }
    for (i = size - 1; i >= pos; i--) buf[i] -= buf[i - pos];
    var T60 = 16 - Math.log2(f / 65) * 3, g = Math.pow(10, -3 / (f * Math.max(6, T60)));
    var w = 0, prev = 0, env = 0, lx = 0, lpx = 0, ly = 0, envFall = 1 - 1 / (sr / f * 3), dcx = 0, dcy = 0, peak = 0;
    for (var n = 0; n < len; n++) {
      var rp = w - D; while (rp < 0) rp += size;
      var i0 = Math.floor(rp), fr = rp - i0, a = buf[i0 % size], b = buf[(i0 + 1) % size];
      var v = a + (b - a) * fr;
      var y = g * ((1 - sm) * v + sm * prev); prev = v;
      var av = Math.abs(y); env = av > env ? av : env * envFall;
      var t = n / sr, amt = 0.02 * (t < 0.6 ? 0.3 + t / 0.6 * 0.7 : 1 - Math.min(0.4, (t - 0.6) * 0.1));   // the buzz swells, then eases
      if (env > 1e-6) y += amt * y * y / env;
      lx = y; y = y - lpx + 0.999 * ly; lpx = lx; ly = y;               // keep the bend from pushing the string off centre
      buf[w] = y; w = (w + 1) % size;
      dcy = y - dcx + 0.995 * dcy; dcx = y; out[n] = dcy;
      if (Math.abs(dcy) > peak) peak = Math.abs(dcy);
    }
    var fade = Math.round(sr * 0.3), sc = peak ? 0.9 / peak : 1;
    for (n = 0; n < len; n++) out[n] *= sc * (n > len - fade ? (len - n) / fade : 1);
    var ab = c.createBuffer(1, len, sr); ab.getChannelData(0).set(out);
    return (tanBufs[key] = ab);
  }
  function pluckString(step, t) {
    var c = audio(), src = c.createBufferSource(), g = c.createGain();
    src.buffer = stringBuf(c, freqFor(step), tan.i % 2); g.gain.value = 0.55;
    src.connect(g); g.connect(tan.bus); src.start(t);
  }
  function tanSteps() { return [S.tanFirst - 12, 0, 0, -12]; }
  function pluck(step, t) {
    if (S.tanTone === "string") return pluckString(step, t);
    var c = audio(), f = freqFor(step), g = c.createGain(), bp = c.createBiquadFilter(), dry = c.createGain();
    bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(Math.min(5000, f * 2), t); bp.frequency.linearRampToValueAtTime(Math.min(5000, f * 9), t + 0.35);
    bp.frequency.exponentialRampToValueAtTime(Math.min(5000, f * 3), t + TAN_RING);
    dry.gain.value = 0.25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.03); g.gain.setTargetAtTime(0, t + 0.03, TAN_RING / 4.5);
    [-2, 2].forEach(function (cents) {
      var o = c.createOscillator(); o.setPeriodicWave(tanWave(c)); o.frequency.value = f; o.detune.value = cents;
      o.connect(bp); o.connect(dry); o.start(t); o.stop(t + TAN_RING);
    });
    bp.connect(g); dry.connect(g); g.connect(tan.bus);
  }
  function tanStep() {
    var c = audio();
    while (tan.next < c.currentTime + 0.25) { pluck(tanSteps()[tan.i % 4], tan.next); tan.i++; tan.next += 60 / S.tanRate; }
  }
  function tanStart() {
    if (tan.timer) return;
    var c = audio(); tan.bus = c.createGain(); tan.bus.connect(droneOut());
    tan.i = 0; tan.next = c.currentTime + 0.05; tanStep(); tan.timer = setInterval(tanStep, 50);
  }
  function tanStop() {
    if (!tan.timer) return;
    clearInterval(tan.timer); tan.timer = null;
    var bus = tan.bus; tan.bus = null; bus.gain.setTargetAtTime(0, audio().currentTime, 0.12);
    setTimeout(function () { bus.disconnect(); }, 1200);
  }
  function wanted() { var w = S.pads.slice(); if (S.lowDo && w.length) w.push(-12); return w; }
  function droneSync() {                            // make the sounding voices match S, retuning any that stay
    if (!droneOn) return;
    if (S.mode === "tanpura") { Object.keys(drone.voices).map(Number).forEach(voiceStop); tanStart(); droneOut(); return; }
    tanStop();
    var want = wanted(), c = audio();
    Object.keys(drone.voices).map(Number).forEach(function (s) { if (want.indexOf(s) < 0) voiceStop(s); });
    want.forEach(function (s) {
      var v = drone.voices[s];
      if (!v) { voiceStart(s); return; }
      v.parts.forEach(function (p) { p.o.frequency.setTargetAtTime(freqFor(s) * p.ratio, c.currentTime, 0.04); });
    });
    droneOut();
  }
  var droneOn = false;
  function droneToggle(on) {
    droneOn = on == null ? !droneOn : on;
    if (droneOn) { audio(); droneSync(); } else { Object.keys(drone.voices).map(Number).forEach(voiceStop); tanStop(); }
    refresh();
  }
  function droneRetone() {                          // a new tone colour needs new voices
    if (!droneOn) return;
    Object.keys(drone.voices).map(Number).forEach(function (s) { var v = drone.voices[s]; delete drone.voices[s]; v.g.gain.setTargetAtTime(0, audio().currentTime, 0.08); v.parts.forEach(function (p) { p.o.stop(audio().currentTime + 0.5); }); });
    droneSync();
  }

  // ───────────────────────── The panels ─────────────────────────
  var css = [
    "#pw-nav .nav-link{display:flex;align-items:center;gap:.4rem;cursor:pointer}",
    "#pw-nav .nav-link{padding-left:.45rem!important;padding-right:.45rem!important}",
    "#pw-nav .pw-ico{width:1.7rem;height:1.7rem;display:block;overflow:visible}",
    "#pw-nav .is-on .pw-ico{color:var(--site-accent-dk,#2b9c90)}",
    "#pw-nav .pw-label{display:none}",
    "@media (max-width:991.98px){#pw-nav .pw-label{display:inline}#pw-nav .nav-link{gap:.6rem}}",
    /* the metronome's pendulum swings at the tempo while it runs; the drone's line breathes while it sounds */
    "#pw-nav .pw-pend{transform-origin:12px 18px;transform:rotate(-14deg)}",
    "#pw-nav .is-on .pw-pend{animation:pw-swing var(--pw-beat,.7s) ease-in-out infinite alternate}",
    "@keyframes pw-swing{from{transform:rotate(-24deg)}to{transform:rotate(24deg)}}",
    "#pw-nav .is-on .pw-breathe{animation:pw-breathe 2.4s ease-in-out infinite}",
    "@keyframes pw-breathe{0%,100%{opacity:1}50%{opacity:.35}}",
    "#pw-nav .is-on .pw-string{animation:pw-shimmer .18s linear infinite alternate}",
    "@keyframes pw-shimmer{from{transform:translateX(-.5px)}to{transform:translateX(.5px)}}",
    "#pw-nav .pw-ico{overflow:visible}",
    "@media (prefers-reduced-motion:reduce){#pw-nav .is-on .pw-string{animation:none}}",
    "@media (prefers-reduced-motion:reduce){#pw-nav .is-on .pw-pend,#pw-nav .is-on .pw-breathe{animation:none}}",
    "#pw-nav .is-open{color:var(--site-accent-dk,#2b9c90)!important}",
    ".pw-panel{position:fixed;top:4.2rem;right:.75rem;z-index:1045;width:min(21rem,calc(100vw - 1.5rem));max-height:calc(100vh - 5rem);overflow:auto;",
    " background:var(--site-surface,#fff);color:var(--site-ink,#1e1c18);border:1px solid var(--site-border,#e0d8ce);border-radius:12px;box-shadow:0 10px 32px rgba(30,28,24,.2);",
    " padding:.8rem .95rem 1rem;font:400 .9rem/1.4 Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
    ".pw-panel[hidden]{display:none}",
    ".pw-panel.pw-wide{width:min(24rem,calc(100vw - 1.5rem))}",
    ".pw-panel *{box-sizing:border-box}",
    ".pw-head{display:flex;align-items:center;justify-content:space-between;margin:0 0 .6rem}",
    ".pw-head h2{margin:0;padding:0;border:0;font-size:.95rem;font-weight:600}",
    ".pw-x{border:0;background:none;font-size:1.3rem;line-height:1;color:var(--site-ink-2,#5c5246);cursor:pointer;padding:0 .2rem}",
    ".pw-lab{display:block;margin:.7rem 0 .25rem;font:600 .66rem/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--site-ink-2,#5c5246)}",
    ".pw-row{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}",
    ".pw-panel button.pw-btn{height:2.1rem;min-width:2.1rem;padding:0 .75rem;border:1px solid var(--site-accent-dk,#2b9c90);border-radius:7px;background:var(--site-surface,#fff);color:var(--site-accent-text,#0a4f47);font:inherit;font-weight:600;cursor:pointer}",
    ".pw-panel button.pw-btn:hover{background:var(--site-accent-bg,rgba(63,194,180,.12))}",
    ".pw-panel button.pw-btn.pw-main{background:var(--site-accent-dk,#2b9c90);color:#fff}",
    ".pw-panel button.pw-btn.is-sel{background:var(--site-accent-bg,rgba(63,194,180,.18));box-shadow:inset 0 0 0 1px var(--site-accent-dk,#2b9c90)}",
    ".pw-panel select,.pw-panel input[type=number]{height:2.1rem;border:1px solid var(--site-border,#e0d8ce);border-radius:7px;background:var(--site-surface,#fff);color:inherit;font:inherit;padding:0 .4rem}",
    ".pw-panel input[type=number]{width:4.6rem;text-align:center}",
    ".pw-panel input[type=range]{width:100%;accent-color:var(--site-accent-dk,#2b9c90)}",
    ".pw-bpm{font:600 2rem/1 var(--font-mono,ui-monospace,monospace);min-width:3.2ch;text-align:center}",
    ".pw-lamps{display:flex;gap:.4rem;margin:.7rem 0 .2rem}",
    ".pw-lamp{flex:1;height:.7rem;border-radius:4px;background:var(--site-border,#e0d8ce);transition:background .05s}",
    ".pw-lamp.on{background:var(--site-accent,#3fc2b4)}",
    ".pw-lamp.on.first{background:#d9566b}",
    ".pw-mix{display:grid;grid-template-columns:7.2rem 1fr;gap:.35rem .6rem;align-items:center}",
    ".pw-mix span{font-size:.85rem}",
    ".pw-pads{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem}",
    ".pw-pad{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.05rem;padding:.35rem 0;border:1px solid var(--site-border,#e0d8ce);border-radius:8px;background:var(--site-surface,#fff);color:inherit;cursor:pointer;font:inherit}",
    ".pw-pad b{font-size:.92rem}.pw-pad small{font-size:.7rem;color:var(--site-ink-2,#5c5246)}",
    ".pw-pad.black{background:var(--site-surface-2,#f2ede5)}",
    ".pw-pad.on{background:var(--site-accent-dk,#2b9c90);border-color:var(--site-accent-dk,#2b9c90);color:#fff}.pw-pad.on small{color:#e6fffb}",
    ".pw-note{margin:.5rem 0 0;font-size:.78rem;color:var(--site-ink-2,#5c5246)}",
    ".pw-check{display:inline-flex;align-items:center;gap:.35rem;cursor:pointer}.pw-check input{accent-color:var(--site-accent-dk,#2b9c90)}"
  ].join("\n");

  var navBtn = {}, panels = {};
  // ---- the navbar's icons (drawn here so they can show what the tools are doing) ----
  // Metronome: a pyramid metronome, its pendulum swinging at the tempo while it runs.
  // Drone: a held wave (sustained notes) or a tanpura (plucked), breathing while it sounds.
  // Circle: the twelve keys round a ring, the drone's Do marked, its name in the middle.
  var SVG = '<svg class="pw-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  function metroIcon() {
    return SVG + '<path d="M6.8 21 9.9 3h4.2l3.1 18z"/><path d="M5 21h14"/>' +
      '<g class="pw-pend"><path d="M12 18V4.8"/><rect x="9.9" y="7.4" width="4.2" height="3" rx=".8" fill="currentColor"/></g>' +
      (metro.on ? '<text class="pw-bpm" x="12" y="30" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">' + S.tempo + "</text>" : "") + "</svg>";
  }
  function droneIcon() {
    if (S.mode === "tanpura") return SVG + '<g class="pw-breathe"><circle cx="12" cy="17.2" r="4.6"/><path d="M10.9 13V2.8h2.2V13"/>' +
      '<path d="M10.9 5h-1.6M10.9 8h-1.6M13.1 5h1.6M13.1 8h1.6"/></g><path class="pw-string" d="M12 3.5v16.5" stroke-width="1"/></svg>';
    return SVG + '<g class="pw-breathe"><path d="M2 12c2.5-7 5-7 7.5 0s5 7 7.5 0c1.2-3.4 2.6-5 5-5" stroke-width="2.2"/></g></svg>';
  }
  function circleIcon() {
    var dots = "", here = (S.droneDo * 7) % 12;                              // where Do sits round the circle (C at the top, G to its right)
    var lit = {};                                                             // the drone's other notes (its pads: the fifth, ...)
    if (S.mode !== "tanpura") (S.pads || []).forEach(function (iv) { lit[(((((S.droneDo + iv) % 12) + 12) % 12) * 7) % 12] = 1; });
    else lit[(((((S.droneDo + (S.tanFirst || 7)) % 12) + 12) % 12) * 7) % 12] = 1;
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * 2 * Math.PI - Math.PI / 2, x = 12 + 9 * Math.cos(a), y = 12 + 9 * Math.sin(a);
      dots += i === here ? '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="2.1" fill="currentColor" stroke="none"/>'
                         : lit[i] ? '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="1.6" fill="currentColor" stroke="none"/>'
                         : '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="1.05" fill="currentColor" stroke="none" opacity=".55"/>';
    }
    return SVG + '<circle cx="12" cy="12" r="9" stroke-width="1.2" opacity=".35"/>' + dots +
      '<text x="12" y="15.2" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">' + NAMES[S.droneDo] + "</text></svg>";
  }
  function icons() {
    if (navBtn.metro) { navBtn.metro.querySelector(".pw-icon").innerHTML = metroIcon(); navBtn.metro.style.setProperty("--pw-beat", (60 / (S.tempo || 84)).toFixed(3) + "s"); }
    if (navBtn.drone) navBtn.drone.querySelector(".pw-icon").innerHTML = droneIcon();
    if (navBtn.circle) navBtn.circle.querySelector(".pw-icon").innerHTML = circleIcon();
  }
  function refresh() {
    icons();
    if (navBtn.metro) navBtn.metro.classList.toggle("is-on", metro.on);
    if (navBtn.drone) navBtn.drone.classList.toggle("is-on", droneOn);
    var mb = $("#pw-metro-go"); if (mb) { mb.textContent = metro.on ? "Stop" : "Start"; mb.classList.toggle("pw-main", !metro.on); }
    var db = $("#pw-drone-go"); if (db) { db.textContent = droneOn ? "Stop" : "Start"; db.classList.toggle("pw-main", !droneOn); }
  }
  function openPanel(name, open) {
    Object.keys(panels).forEach(function (k) {
      var show = k === name ? (open == null ? panels[k].hidden : open) : false;
      panels[k].hidden = !show; navBtn[k].classList.toggle("is-open", show);
    });
  }

  function buildMetro() {
    var p = el("div", "pw-panel"); p.id = "pw-metro"; p.hidden = true; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Metronome");
    p.innerHTML =
      '<div class="pw-head"><h2>Metronome</h2><button class="pw-x" type="button" aria-label="Close">×</button></div>' +
      '<div class="pw-row" style="justify-content:space-between">' +
        '<button class="pw-btn" type="button" id="pw-bpm-dn" aria-label="Slower">−</button>' +
        '<div style="text-align:center"><div class="pw-bpm" id="pw-bpm">84</div><div class="pw-note" style="margin:0">beats per minute</div></div>' +
        '<button class="pw-btn" type="button" id="pw-bpm-up" aria-label="Faster">+</button></div>' +
      '<input type="range" id="pw-tempo" min="30" max="240" step="1" aria-label="Tempo" style="margin-top:.5rem">' +
      '<div class="pw-row" style="margin-top:.4rem"><button class="pw-btn pw-main" type="button" id="pw-metro-go" style="flex:1">Start</button>' +
        '<button class="pw-btn" type="button" id="pw-tap" title="Tap the tempo">Tap</button></div>' +
      '<div class="pw-lamps" id="pw-lamps"></div>' +
      '<label class="pw-lab" for="pw-beats">Beats in a bar</label>' +
      '<div class="pw-row"><select id="pw-beats"></select><label class="pw-check"><input type="checkbox" id="pw-accent"> Accent beat 1</label></div>' +
      '<span class="pw-lab">Mix</span><div class="pw-mix" id="pw-mix"></div>' +
      '<p class="pw-note">Turn a line up to hear it. The quarter notes are the beat; the others fill in between.</p>';
    var beats = $("#pw-beats", p);
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 12].forEach(function (n) { var o = el("option"); o.value = n; o.textContent = n; beats.appendChild(o); });
    var mix = $("#pw-mix", p);
    SUBS.forEach(function (sub) {
      mix.appendChild(el("span", "", sub.label));
      var r = el("input"); r.type = "range"; r.min = 0; r.max = 100; r.step = 5; r.value = S.vol[sub.k]; r.setAttribute("aria-label", sub.label + " level");
      r.addEventListener("input", function () { S.vol[sub.k] = +r.value; save(); });
      mix.appendChild(r);
    });
    function lamps() {
      var box = $("#pw-lamps", p); box.innerHTML = ""; metro.lamps = [];
      for (var i = 0; i < S.beats; i++) { var l = el("div", "pw-lamp" + (i === 0 && S.beats > 1 ? " first" : "")); box.appendChild(l); metro.lamps.push(l); }
    }
    function tempo(v) { S.tempo = clamp(Math.round(v) || 84, 30, 240); $("#pw-bpm", p).textContent = S.tempo; $("#pw-tempo", p).value = S.tempo; save(); }
    $("#pw-tempo", p).addEventListener("input", function (e) { tempo(+e.target.value); });
    $("#pw-bpm-dn", p).addEventListener("click", function () { tempo(S.tempo - 1); });
    $("#pw-bpm-up", p).addEventListener("click", function () { tempo(S.tempo + 1); });
    $("#pw-metro-go", p).addEventListener("click", function () { metro.on ? metroStop() : metroStart(); });
    var taps = [];
    $("#pw-tap", p).addEventListener("click", function () {
      var now = performance.now(); if (taps.length && now - taps[taps.length - 1] > 2200) taps = [];
      taps.push(now); if (taps.length > 6) taps.shift();
      if (taps.length > 1) tempo(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
    });
    beats.addEventListener("change", function () { S.beats = +beats.value; metro.beat = 0; lamps(); save(); });
    $("#pw-accent", p).addEventListener("change", function (e) { S.accent = e.target.checked; save(); });
    beats.value = S.beats; $("#pw-accent", p).checked = S.accent; tempo(S.tempo); lamps();
    return p;
  }

  function buildDrone() {
    var p = el("div", "pw-panel"); p.id = "pw-drone"; p.hidden = true; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Drone");
    p.innerHTML =
      '<div class="pw-head"><h2>Drone</h2><button class="pw-x" type="button" aria-label="Close">×</button></div>' +
      '<div class="pw-row"><button class="pw-btn pw-main" type="button" id="pw-drone-go" style="flex:1">Start</button></div>' +
      '<div class="pw-row" id="pw-mode" style="margin-top:.5rem"></div>' +
      '<span class="pw-lab">Name the notes with</span><div class="pw-row"><select id="pw-sys" aria-label="Name the notes with"></select></div>' +
      '<span class="pw-lab" id="pw-do-lab">Do is</span>' +
      '<div class="pw-row"><select id="pw-do" aria-label="Do"></select><select id="pw-oct" aria-label="Octave"></select></div>' +
      '<div id="pw-sus">' +
      '<span class="pw-lab" id="pw-pads-lab">Notes (above Do)</span><div class="pw-pads" id="pw-pads"></div>' +
      '<div class="pw-row" style="margin-top:.5rem" id="pw-presets"></div>' +
      '<label class="pw-check" style="margin-top:.5rem"><input type="checkbox" id="pw-low"> <span id="pw-low-lab">Add Do an octave lower</span></label>' +
      '</div><div id="pw-tan">' +
      '<span class="pw-lab">First string</span><div class="pw-row" id="pw-tan-first"></div><p class="pw-note" id="pw-tan-note"></p>' +
      '<span class="pw-lab">Sound</span><div class="pw-row"><select id="pw-tan-tone" aria-label="Tanpura sound"><option value="string">String (modelled)</option><option value="simple">Simple (first try)</option></select></div>' +
      '<span class="pw-lab">Speed</span><input type="range" id="pw-tan-rate" min="25" max="90" step="1" aria-label="Tanpura speed">' +
      '</div>' +
      '<span class="pw-lab">Tuning</span>' +
      '<div class="pw-row" id="pw-tuning"></div><p class="pw-note" id="pw-tuning-note"></p>' +
      '<div id="pw-sus-tone"><span class="pw-lab">Sound</span><div class="pw-row"><select id="pw-tone" aria-label="Sound"><option value="soft">Soft (sine)</option><option value="reed">Reed (harmonium)</option><option value="organ">Organ</option></select></div></div>' +
      '<span class="pw-lab">Volume</span><input type="range" id="pw-dvol" min="0" max="100" step="1" aria-label="Drone volume">' +
      '<span class="pw-lab">A4</span><div class="pw-row"><input type="number" id="pw-a4" min="400" max="480" step="1" aria-label="A4 frequency"><span class="pw-note" style="margin:0">Hz</span></div>';
    var doSel = $("#pw-do", p), octSel = $("#pw-oct", p), pads = $("#pw-pads", p), padEls = [];
    NAMES.forEach(function (n, i) { var o = el("option"); o.value = i; doSel.appendChild(o); });
    [2, 3, 4].forEach(function (n) { var o = el("option"); o.value = n; o.textContent = "Octave " + n; octSel.appendChild(o); });
    function padLabels() {
      padEls.forEach(function (b, i) {
        var pc = (S.droneDo + i) % 12, cents = S.tuning === "pure" ? centsOff(i) : 0;
        b.innerHTML = "<b>" + (DN ? DN.html(nm(i)) : nm(i)) + "</b><small>" + NAMES[pc] + (S.tuning === "pure" && i ? " " + (cents > 0 ? "+" : "") + Math.round(cents) + "¢" : "") + "</small>";
      });
    }
    function padState() { padEls.forEach(function (b, i) { var on = S.pads.indexOf(i) >= 0; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }
    for (var i = 0; i < 12; i++) (function (i) {
      var b = el("button", "pw-pad" + ([1, 3, 6, 8, 10].indexOf(i) >= 0 ? " black" : "")); b.type = "button";
      b.addEventListener("click", function () {
        var k = S.pads.indexOf(i); if (k >= 0) S.pads.splice(k, 1); else S.pads.push(i);
        padState(); save();
        if (!droneOn && S.pads.length) droneToggle(true); else if (droneOn && !S.pads.length) droneToggle(false); else droneSync();
      });
      pads.appendChild(b); padEls.push(b);
    })(i);
    var presetBtns = [];
    [[[0]], [[0, 7]], [[0, 5]], [[0, 4, 7], "Major"], [[0, 3, 7], "Minor"]].forEach(function (pr) {
      var b = el("button", "pw-btn"); b.type = "button"; b.dataset.steps = pr[0].join(" ");
      b.addEventListener("click", function () { S.pads = pr[0].slice(); padState(); save(); if (!droneOn) droneToggle(true); else droneSync(); });
      b.textContent = pr[1] || pr[0].map(nm).join(" "); b._fixed = pr[1];
      $("#pw-presets", p).appendChild(b); presetBtns.push(b);
    });
    var modeBox = $("#pw-mode", p), firstBox = $("#pw-tan-first", p);
    [["sustain", "Sustained"], ["tanpura", "Tanpura"]].forEach(function (m) {
      var b = el("button", "pw-btn", m[1]); b.type = "button"; b.dataset.m = m[0]; b.style.flex = "1";
      b.addEventListener("click", function () { S.mode = m[0]; moded(); save(); droneSync(); });
      modeBox.appendChild(b);
    });
    [7, 5, 11].forEach(function (st) {
      var b = el("button", "pw-btn"); b.type = "button"; b.dataset.step = st;
      b.addEventListener("click", function () { S.tanFirst = st; moded(); words(); save(); });
      firstBox.appendChild(b);
    });
    function moded() {
      var tp = S.mode === "tanpura";
      Array.prototype.forEach.call(modeBox.children, function (b) { b.classList.toggle("is-sel", b.dataset.m === S.mode); });
      Array.prototype.forEach.call(firstBox.children, function (b) { b.classList.toggle("is-sel", +b.dataset.step === S.tanFirst); });
      $("#pw-sus", p).hidden = tp; $("#pw-sus-tone", p).hidden = tp; $("#pw-tan", p).hidden = !tp;
    }
    function words() {                                  // everything that names a note, in the chosen system
      $("#pw-do-lab", p).textContent = nm(0) + " is"; $("#pw-pads-lab", p).textContent = "Notes (above " + nm(0) + ")";
      $("#pw-low-lab", p).textContent = "Add " + nm(0) + " an octave lower";
      Array.prototype.forEach.call(doSel.options, function (o, i) { o.textContent = nm(0) + " = " + NAMES[i]; });
      presetBtns.forEach(function (b) { if (!b._fixed) b.textContent = b.dataset.steps.split(" ").map(function (n) { return nm(+n); }).join(" "); });
      Array.prototype.forEach.call(firstBox.children, function (b) { b.textContent = nm(+b.dataset.step); });
      $("#pw-tan-note", p).textContent = "Four strings, over and over: low " + nm(S.tanFirst) + ", " + nm(0) + ", " + nm(0) + ", low " + nm(0) + ".";
      padLabels();
    }
    if (DN) { DN.bind($("#pw-sys", p)); DN.onChange(words); } else $("#pw-sys", p).parentNode.hidden = true;
    var tun = $("#pw-tuning", p);
    [["equal", "Equal"], ["pure", "Pure"]].forEach(function (t) {
      var b = el("button", "pw-btn", t[1]); b.type = "button"; b.dataset.t = t[0];
      b.addEventListener("click", function () { S.tuning = t[0]; tuned(); save(); droneSync(); });
      tun.appendChild(b);
    });
    function tuned() {
      Array.prototype.forEach.call(tun.children, function (b) { b.classList.toggle("is-sel", b.dataset.t === S.tuning); });
      $("#pw-tuning-note", p).textContent = S.tuning === "pure"
        ? "Pure: each note is tuned to Do by simple ratios, so chords above the drone sit still. Cents show how far each note is from the piano's."
        : "Equal: the piano's tuning.";
      padLabels();
    }
    doSel.addEventListener("change", function () { S.droneDo = +doSel.value; save(); padLabels(); droneSync(); });
    octSel.addEventListener("change", function () { S.droneOct = +octSel.value; save(); droneSync(); });
    $("#pw-low", p).addEventListener("change", function (e) { S.lowDo = e.target.checked; save(); droneSync(); });
    $("#pw-tone", p).addEventListener("change", function (e) { S.tone = e.target.value; save(); droneRetone(); });
    $("#pw-dvol", p).addEventListener("input", function (e) { S.droneVol = +e.target.value; save(); if (drone.outG) droneOut(); });
    $("#pw-a4", p).addEventListener("change", function (e) { S.a4 = clamp(+e.target.value || 440, 400, 480); e.target.value = S.a4; save(); droneSync(); });
    $("#pw-tan-tone", p).addEventListener("change", function (e) { S.tanTone = e.target.value; save(); });
    $("#pw-tan-rate", p).addEventListener("input", function (e) { S.tanRate = +e.target.value; save(); });
    $("#pw-drone-go", p).addEventListener("click", function () {
      if (!droneOn && S.mode !== "tanpura" && !S.pads.length) { S.pads = [0]; padState(); save(); }
      droneToggle();
    });
    doSel.value = S.droneDo; octSel.value = S.droneOct; $("#pw-low", p).checked = S.lowDo; $("#pw-tone", p).value = S.tone;
    $("#pw-dvol", p).value = S.droneVol; $("#pw-a4", p).value = S.a4; $("#pw-tan-rate", p).value = S.tanRate; $("#pw-tan-tone", p).value = S.tanTone; padState(); tuned(); moded(); words();
    return p;
  }

  // The circle is the shared component (circle-of-fifths.js), loaded the first time it is opened. On a page with a lesson's Key menu it
  // is linked to that menu, so changing the key on the circle changes the lesson, and its Undo button puts the lesson back.
  var circle = null, circleLoading = false;
  function loadScript(src) { return new Promise(function (res, rej) { var t = document.createElement("script"); t.src = src; t.onload = res; t.onerror = rej; document.head.appendChild(t); }); }
  function buildCircle() {
    var p = el("div", "pw-panel pw-wide"); p.id = "pw-circle"; p.hidden = true; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Circle of fifths");
    p.innerHTML = '<div class="pw-head"><h2>Circle of fifths</h2><button class="pw-x" type="button" aria-label="Close">\u00d7</button></div><div id="pw-circle-host"><p class="pw-note">Loading\u2026</p></div>';
    return p;
  }
  function openCircle() {
    if (circle || circleLoading) return; circleLoading = true;
    var chain = window.CircleOfFifths ? Promise.resolve() : loadScript("/apps/shared/circle-of-fifths.js?v=1");
    if (!window.Tonality) chain = chain.then(function () { return loadScript("/apps/shared/tonality.js?v=9"); });
    chain.then(function () {
      var host = $("#pw-circle-host", panels.circle); host.innerHTML = "";
      circle = window.CircleOfFifths.mount(host, { rings: "roman,notes,syllables", picker: "key,mode,names", undo: true, sound: true, tonality: !!window.Tonality, link: document.getElementById("bl-key") });
    }).catch(function () { $("#pw-circle-host", panels.circle).innerHTML = '<p class="pw-note">Couldn\u2019t load the circle. Check your connection and try again.</p>'; circleLoading = false; });
  }

  function init() {
    if (document.getElementById("pw-nav")) return;
    var style = el("style"); style.textContent = css; document.head.appendChild(style);
    var collapse = document.getElementById("navbarCollapse") || document.querySelector(".navbar-collapse");
    var ul = el("ul", "navbar-nav ms-auto"); ul.id = "pw-nav";
    [["metro", "Metronome"], ["drone", "Drone"], ["circle", "Circle of fifths"]].forEach(function (b) {
      var li = el("li", "nav-item"), a = el("a", "nav-link", '<span class="pw-icon"></span><span class="pw-label">' + b[1] + "</span>");
      a.href = "#"; a.setAttribute("role", "button"); a.setAttribute("aria-label", b[1]); a.title = b[1];
      a.addEventListener("click", function (e) { e.preventDefault(); openPanel(b[0]); if (b[0] === "circle") openCircle(); });
      li.appendChild(a); ul.appendChild(li); navBtn[b[0]] = a;
    });
    if (collapse) {
      var auth = document.getElementById("navbar-auth");
      if (auth) { collapse.insertBefore(ul, auth); auth.classList.remove("ms-auto"); } else collapse.appendChild(ul);
    }
    icons();
    panels.metro = buildMetro(); panels.drone = buildDrone(); panels.circle = buildCircle();
    Object.keys(panels).forEach(function (k) {
      document.body.appendChild(panels[k]);
      $(".pw-x", panels[k]).addEventListener("click", function () { openPanel(k, false); });
    });
    if (!collapse) {                                 // no navbar on this page: small fixed buttons instead
      var bar = el("div"); bar.style.cssText = "position:fixed;right:.75rem;bottom:.75rem;z-index:1045;display:flex;gap:.4rem";
      ["metro", "drone", "circle"].forEach(function (k) { var b = el("button", "", k === "metro" ? "Metronome" : k === "drone" ? "Drone" : "Circle"); b.className = "btn btn-sm btn-outline-secondary"; b.addEventListener("click", function () { openPanel(k); if (k === "circle") openCircle(); }); bar.appendChild(b); });
      document.body.appendChild(bar);
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") openPanel(null, false); });
    refresh();
    window.PracticeWidgets = { metronome: { start: metroStart, stop: metroStop, running: function () { return metro.on; } },
                               circle: function () { return circle; },
                               drone: { toggle: droneToggle, running: function () { return droneOn; }, state: function () { return S; } } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
