// ambient-kit.js — two widgets for the ambient lessons, added to synth-kit.js (load after it, and after noise.js):
//   <div class="sk" data-w="noiseeq">   noise (white / pink / brown, from noise.js: it never repeats) through a 10-band graphic EQ,
//                                        with a slow swell; presets for rain, surf, wind, air, rumble
//   <div class="sk" data-w="ambient">   the Ambient Generator: a drone, tape loops of unequal length (Eno's Music for Airports
//                                        method), a noise bed shaped by the same 10-band EQ, long reverb and tape delay
// Everything is the site's own parts: SK.fx("reverb") and SK.fx("delay") from synth-kit, the band's samples (BandSounds) for
// the loop notes, SiteNoise.stream / SiteNoise.eq from noise.js. The loops run on the audio clock, looked ahead 0.2 s every 50 ms.
// data-preset="Name" on either widget starts it on that preset.
(function () {
  "use strict";
  var SK = window.SynthKit || window.SK; if (!SK || !SK.kit) return;
  var K = SK.kit, el = K.el, button = K.button, mtof = K.mtof, fmtHz = K.fmtHz;
  var BANDS = (window.SiteNoise && SiteNoise.FREQS) || [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  function bandName(f) { return f >= 1000 ? f / 1000 + "k" : String(f); }
  function fmtPct(v) { return Math.round(v * 100) + "%"; }
  function fmtS(v) { return (v < 10 ? v.toFixed(1) : Math.round(v)) + " s"; }

  // ---- the 10-band EQ: sliders in a row, the curve drawn on the spectrum ----
  var NOISE_PRESETS = [
    { name: "Flat", eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Rain on a roof", color: "pink", eq: [-18, -12, -6, -2, 0, 2, 4, 5, 3, -2], swell: .1, rate: .05 },
    { name: "Distant surf", color: "pink", eq: [-6, 2, 5, 4, 1, -3, -7, -10, -14, -18], swell: .8, rate: .09 },
    { name: "Wind", color: "pink", eq: [-18, -10, -2, 4, 8, 4, -4, -10, -16, -18], swell: .6, rate: .05 },
    { name: "Air (high hiss)", color: "white", eq: [-18, -18, -18, -14, -10, -6, -2, 2, 4, 2], swell: 0 },
    { name: "Rumble", color: "brown", eq: [6, 8, 4, 0, -4, -8, -12, -16, -18, -18], swell: .3, rate: .03 },
    { name: "Tape hiss", color: "white", eq: [-18, -18, -12, -8, -6, -4, 0, 3, 3, 0], swell: 0 }
  ];
  function eqPanel(w, box, onBand) {
    var row = el("div", "amb-eq"); box.appendChild(row); w.eqIn = [];
    BANDS.forEach(function (f, i) {
      var col = el("label", "amb-band"), out = el("output", "", "0"), r = document.createElement("input");
      r.type = "range"; r.min = -18; r.max = 18; r.step = 1; r.value = 0; r.setAttribute("aria-label", bandName(f) + " Hz band, dB");
      r.addEventListener("input", function () { out.textContent = (+r.value > 0 ? "+" : "") + r.value; w.P.eq[i] = +r.value; onBand(i, +r.value); if (w.view) w.view.dirty = true; });
      col.appendChild(out); col.appendChild(r); col.appendChild(el("span", "amb-bf", bandName(f))); row.appendChild(col); w.eqIn.push({ r: r, o: out });
    });
    w.P.eq = BANDS.map(function () { return 0; });
    w.setEq = function (a) { a.forEach(function (v, i) { var x = w.eqIn[i]; x.r.value = v; x.o.textContent = (v > 0 ? "+" : "") + v; w.P.eq[i] = v; onBand(i, v); }); if (w.view) w.view.dirty = true; };
  }
  function curveOverlay(w) {
    var N = 200, fr = new Float32Array(N); for (var i = 0; i < N; i++) fr[i] = 20 * Math.pow(1000, i / (N - 1));
    return function (g, X, W, H, C) {
      if (!window.SiteNoise) return; var tot = SiteNoise.response(fr, w.P.eq), Y = function (db) { return Math.max(14, Math.min(H, H * (.5 - db / 48))); };
      g.strokeStyle = C.hot; g.globalAlpha = .3; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      g.lineWidth = 2; g.beginPath(); for (var i = 0; i < N; i++) i ? g.lineTo(X(fr[i]), Y(tot[i])) : g.moveTo(X(fr[i]), Y(tot[i])); g.stroke(); g.lineWidth = 1;
      g.fillStyle = C.hot; g.fillText("EQ curve (±24 dB)", W - 110, 11);
    };
  }
  // noise -> EQ -> swell (a slow LFO on the level) -> out; returns { stop, eq, level }
  function noiseBed(c, out, P) {
    var s = window.SiteNoise ? SiteNoise.stream(c, P.color) : null; if (!s) return { stop: function () {}, eq: null, level: null, swell: null };
    var eq = SiteNoise.eq(c, P.eq), lvl = c.createGain(), sw = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    lvl.gain.value = P.level; sw.gain.value = 1 - P.swell / 2; lfo.frequency.value = P.rate; lg.gain.value = P.swell / 2; lfo.connect(lg); lg.connect(sw.gain); lfo.start();
    s.output.connect(eq.input); eq.output.connect(sw); sw.connect(lvl); lvl.connect(out);
    return { eq: eq, level: lvl.gain, swell: function (d, r) { var t = c.currentTime; sw.gain.setTargetAtTime(1 - d / 2, t, .1); lg.gain.setTargetAtTime(d / 2, t, .1); lfo.frequency.setTargetAtTime(r, t, .1); },
      recolor: function (k) { s.stop(); s = SiteNoise.stream(c, k); s.output.connect(eq.input); },
      stop: function () { s.stop(); try { lfo.stop(); } catch (e) {} } };
  }

  function NoiseEq(host) {
    var w = K.Base(host, "Noise through a 10-band EQ"), bed = null;
    w.pick("color", "Noise", [["white", "White"], ["pink", "Pink"], ["brown", "Brown"]], "pink", null, function (v) { if (bed && bed.recolor) bed.recolor(v); });
    w.num("level", { label: "Level", min: 0, max: 1.5, step: .01, value: .8, fmt: fmtPct });
    w.num("swell", { label: "Swell (slow rise and fall)", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct });
    w.num("rate", { label: "Swell speed", min: .02, max: .5, step: .01, value: .08, fmt: function (v) { return "one every " + fmtS(1 / v); } });
    var pr = el("div", "sk-presets"); pr.appendChild(el("span", "sk-cl", "Presets"));
    NOISE_PRESETS.forEach(function (p) { button(pr, p.name, function () { w.preset(p); }); });
    w.body.insertBefore(pr, w.ctls);
    eqPanel(w, w.body, function (i, v) { if (bed && bed.eq) bed.eq.set(i, v); });
    button(w.body, "Flat", function () { w.setEq(NOISE_PRESETS[0].eq); });
    w.preset = function (p) { if (p.color) w.c.color.set(p.color); if (p.swell != null) w.c.swell.set(p.swell); if (p.rate != null) w.c.rate.set(p.rate); w.setEq(p.eq); };
    w.presetList = NOISE_PRESETS;
    w.view = K.viewer(w.body, { ms: 20, overlay: curveOverlay(w) });
    w.apply = function (k, v) { if (!bed) return; if (k === "level" && bed.level) bed.level.setTargetAtTime(v, SK.ac().currentTime, .05); if ((k === "swell" || k === "rate") && bed.swell) bed.swell(w.P.swell, w.P.rate); };
    w.onStart = function (c, out) { bed = noiseBed(c, out, w.P); return function () { bed.stop(); bed = null; }; };
    return w;
  }

  // ---- the Ambient Generator ----
  var MODES = { lydian: [0, 2, 4, 6, 7, 9, 11], major: [0, 2, 4, 5, 7, 9, 11], pent: [0, 2, 4, 7, 9], dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], minpent: [0, 3, 5, 7, 10] };
  var KEYS = [["0", "C"], ["2", "D"], ["3", "E♭"], ["4", "E"], ["5", "F"], ["7", "G"], ["8", "A♭"], ["9", "A"], ["10", "B♭"]];
  var AMB_PRESETS = [
    { name: "Airport (tape loops)", set: { dtype: "saw", chimes: 0, inst: "piano", mode: "major", key: "5", loops: 7, spread: 1, drone: .15, noise: .05, verb: .5, decay: 6, echo: .25, density: .9 }, color: "pink", eq: [-18, -12, -6, -3, 0, 0, 0, -2, -6, -12] },
    { name: "Drone and fifths", set: { dtype: "pad", chimes: 0, inst: "bell", mode: "lydian", key: "2", loops: 3, spread: .6, drone: .8, noise: .15, verb: .6, decay: 8, echo: .1, density: .5 }, color: "brown", eq: [4, 6, 3, 0, -3, -6, -9, -12, -15, -18] },
    { name: "Rain room", set: { dtype: "saw", chimes: 0, inst: "rhodes", mode: "dorian", key: "9", loops: 5, spread: .8, drone: .3, noise: .6, verb: .45, decay: 4, echo: .35, density: .7 }, color: "pink", eq: [-18, -12, -6, -2, 0, 2, 4, 5, 3, -2] },
    { name: "Shoreline", set: { dtype: "pad", chimes: .35, inst: "flute", mode: "pent", key: "7", loops: 4, spread: 1, drone: .4, noise: .7, verb: .55, decay: 7, echo: .2, density: .6 }, color: "pink", eq: [-6, 2, 5, 4, 1, -3, -7, -10, -14, -18], swell: .8 },
    { name: "Night", set: { dtype: "pad", chimes: .15, inst: "tubular", mode: "aeolian", key: "4", loops: 6, spread: .9, drone: .5, noise: .2, verb: .7, decay: 10, echo: .4, density: .4 }, color: "brown", eq: [0, 3, 2, 0, -3, -6, -9, -12, -15, -18] },
    { name: "Chime garden", set: { dtype: "pad", chimes: .7, inst: "celesta", mode: "pent", key: "2", loops: 4, spread: 1, drone: .3, noise: .35, verb: .6, decay: 7, echo: .15, density: .5 }, color: "pink", eq: [-18, -10, -2, 4, 8, 4, -4, -10, -16, -18], swell: .6 },
    { name: "Glass and metal", set: { dtype: "pad", chimes: .25, inst: "crotale", mode: "lydian", key: "7", loops: 6, spread: 1, drone: .35, noise: .1, verb: .7, decay: 9, echo: .3, density: .5 }, color: "pink", eq: [-18, -12, -6, -3, 0, 0, 0, -2, -6, -12] }
  ];
  function loadBank(c) {
    var have = window.BandSounds ? Promise.resolve() : new Promise(function (res, rej) {
      var sc = document.querySelector('script[src^="/apps/shared/band/sounds.js"]');
      if (!sc) { sc = document.createElement("script"); sc.src = "/apps/shared/band/sounds.js?v=23"; document.head.appendChild(sc); }
      sc.addEventListener("load", res); sc.addEventListener("error", rej); });
    return have.then(function () { if (!loadBank.b || loadBank.c !== c) { loadBank.b = BandSounds.create(c); loadBank.c = c; } return loadBank.b; });
  }
  // ---- recorded bells and chimes (bell-samples/, 3.7 MB; sources in scripts/sources/ambient-bells.py, staging and licences in
  // research_notes/bell-chime-samples/SOURCES.md). Pitched sets: the nearest recorded note, sped up or slowed down. Pitches are as the
  // files are named (glockenspiel and crotales are named at the pitch they sound, as far as the sets say: unverified by ear).
  var BELL_BASE = "/apps/shared/lessons/bell-samples/", NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function nm(s) { var m = /^([a-g])(s?)(\d)$/i.exec(s); return 12 * (+m[3] + 1) + NOTE[m[1].toLowerCase()] + (m[2] ? 1 : 0); }
  var BELLS = {
    tubular: { file: "tubular-", notes: ["C4", "G4", "C5", "F5"], gain: .9 },
    glock: { file: "glock-", notes: ["G4", "C5", "G5", "C6", "G6", "C7"], gain: .7, oct: 1 },
    celesta: { file: "celesta-", notes: ["c4", "c5", "e5", "gs5", "c6"], gain: .8 },
    crotale: { file: "crotale-", notes: ["C6", "E6", "G6", "C7", "E7", "G7", "C8"], gain: .5, oct: 2 },
    vibes: { file: "vibes-", notes: ["C4", "G4", "C5", "E5"], gain: .8 }
  };
  var CHIMES = ["asc1", "desc1", "fastAsc1", "slowAsc1", "slowDesc1", "random", "koshi", "breeze"];
  var bufs = typeof WeakMap === "function" ? new WeakMap() : null;
  function fetchBuf(c, name) {
    var m = bufs.get(c); if (!m) { m = {}; bufs.set(c, m); }
    return m[name] || (m[name] = fetch(BELL_BASE + name + ".m4a").then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (a) { return new Promise(function (res, rej) { c.decodeAudioData(a, res, rej); }); }));
  }
  function bellSet(c, kind) {   // -> Promise of { play(out, midi, t, vel) }
    var S = BELLS[kind];
    return Promise.all(S.notes.map(function (n) { return fetchBuf(c, S.file + n); })).then(function (bs) {
      var roots = S.notes.map(nm);
      return { play: function (out, m, t, v) {
        m += 12 * (S.oct || 0); var best = 0; roots.forEach(function (r, i) { if (Math.abs(r - m) < Math.abs(roots[best] - m)) best = i; });
        var s = c.createBufferSource(), g = c.createGain(); s.buffer = bs[best]; s.playbackRate.value = Math.pow(2, (m - roots[best]) / 12);
        g.gain.value = v * S.gain; s.connect(g); g.connect(out); s.start(t); s.onended = function () { g.disconnect(); }; } };
    });
  }
  // a soft bell, for when there are no samples (or "Synth bell" is chosen): two sines a fifth and two octaves up, slow fade
  function bell(c, out, m, t, v, dur) {
    var g = c.createGain(), f = mtof(m); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .25, t + .04); g.gain.exponentialRampToValueAtTime(.0005, t + dur); g.connect(out);
    [[1, 1], [3, .12], [4.01, .06]].forEach(function (p) { var o = c.createOscillator(), og = c.createGain(); o.frequency.value = f * p[0]; og.gain.value = p[1]; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .05); });
  }
  function Ambient(host) {
    var w = K.Base(host, "Ambient Generator"), run = null;
    w.knobView && w.knobView();
    var pr = el("div", "sk-presets"); pr.appendChild(el("span", "sk-cl", "Presets"));
    AMB_PRESETS.forEach(function (p) { button(pr, p.name, function () { w.preset(p); }); });
    w.body.insertBefore(pr, w.ctls);
    w.pick("key", "Key", KEYS, "5", null, function () { if (run) run.retune(); });
    w.pick("mode", "Scale", [["major", "Major"], ["lydian", "Lydian (♯4: floating)"], ["pent", "Major pentatonic"], ["dorian", "Dorian"], ["aeolian", "Natural minor"], ["minpent", "Minor pentatonic"]], "major", null, function () { if (run) run.retune(); });
    w.pick("inst", "Loop notes on", [["piano", "Piano (samples)"], ["rhodes", "Electric piano (samples)"], ["flute", "Flute (samples)"], ["tubular", "Tubular bells (recorded)"], ["glock", "Glockenspiel (recorded)"], ["celesta", "Celesta (recorded)"], ["crotale", "Crotales (recorded)"], ["vibes", "Vibraphone (recorded)"], ["bell", "Synth bell"]], "piano", null, function () { if (run) run.inst(); });
    w.num("loops", { label: "Tape loops", min: 1, max: 9, step: 1, value: 7, fmt: function (v) { return v + (v === 1 ? " loop" : " loops"); }, on: function () { if (run) run.rebuild(); } });
    w.num("spread", { label: "Loop lengths", min: 0, max: 1, step: .01, value: 1, fmt: function (v) { return v < .05 ? "all equal (a pulse)" : v < .5 ? "close" : "far apart (never lines up)"; }, on: function () { if (run) run.rebuild(); } });
    w.num("density", { label: "Notes per loop", min: .2, max: 1, step: .01, value: .9, fmt: fmtPct, on: function () { if (run) run.rebuild(); } });
    w.pick("dtype", "Drone", [["saw", "Detuned saws"], ["pad", "Wavetable pad (scanning)"]], "saw", null, function () { if (run) run.retune(); });
    w.num("chimes", { label: "Wind chimes", min: 0, max: 1, step: .01, value: 0, fmt: function (v) { return v < .02 ? "off" : v < .4 ? "now and then" : v < .75 ? "often" : "a windy day"; } });
    w.num("drone", { label: "Drone level", min: 0, max: 1, step: .01, value: .15, fmt: fmtPct });
    w.num("noise", { label: "Noise bed", min: 0, max: 1, step: .01, value: .05, fmt: fmtPct });
    w.num("verb", { label: "Reverb", min: 0, max: 1, step: .01, value: .5, fmt: fmtPct });
    w.num("decay", { label: "Reverb length", min: 1, max: 10, step: .1, value: 6, fmt: fmtS });
    w.num("echo", { label: "Tape echo", min: 0, max: .8, step: .01, value: .25, fmt: fmtPct });
    // the noise bed's own controls (same 10-band EQ as the Noise widget)
    var nb = el("details", "amb-nb"), sum = el("summary", "", "Noise bed: colour, swell and the 10-band EQ"); nb.appendChild(sum); w.body.appendChild(nb);
    var nctl = el("div", "sk-ctls"); nb.appendChild(nctl);
    w.pick("color", "Noise", [["white", "White"], ["pink", "Pink"], ["brown", "Brown"]], "pink", nctl, function (v) { if (run && run.bed.recolor) run.bed.recolor(v); });
    w.num("swell", { label: "Swell", min: 0, max: 1, step: .01, value: .3, fmt: fmtPct }, nctl);
    w.num("rate", { label: "Swell speed", min: .02, max: .5, step: .01, value: .07, fmt: function (v) { return "one every " + fmtS(1 / v); } }, nctl);
    eqPanel(w, nb, function (i, v) { if (run && run.bed.eq) run.bed.eq.set(i, v); });
    w.P.level = 1;
    var ring = el("canvas", "sk-plot amb-rings"); ring.setAttribute("aria-label", "The tape loops: each ring is one loop, a dot is a note, the hand is the playhead"); w.body.appendChild(ring);
    w.view = K.viewer(w.body, { ms: 20, overlay: curveOverlay(w) });
    w.preset = function (p) {
      for (var k in p.set) if (w.c[k]) w.c[k].set(p.set[k]);
      if (p.color) w.c.color.set(p.color); w.c.swell.set(p.swell != null ? p.swell : .3); if (p.eq) w.setEq(p.eq);
      if (run) run.rebuild();
    };
    w.presetList = AMB_PRESETS;
    w.apply = function (k, v) {
      if (!run) return; var t = SK.ac().currentTime;
      if (k === "drone") run.droneG.gain.setTargetAtTime(v * .5, t, .3);
      if (k === "noise") run.noiseG.gain.setTargetAtTime(v, t, .3);
      if (k === "verb") { run.wet.gain.setTargetAtTime(v * 1.4, t, .2); run.dry.gain.setTargetAtTime(1 - v * .6, t, .2); }
      if (k === "decay") run.rev.set({ decay: v });
      if (k === "echo") run.echoG.gain.setTargetAtTime(v, t, .2);
      if ((k === "swell" || k === "rate") && run.bed.swell) run.bed.swell(w.P.swell, w.P.rate);
    };
    function scaleNotes() {   // the notes the loops choose from: two octaves of the scale from the key's F3–E4 octave up
      var root = 53 + ((+w.P.key - 5 + 12) % 12), m = MODES[w.P.mode], out = [];
      for (var o = 0; o < 3; o++) m.forEach(function (s) { out.push(root + 12 * o + s); });
      return out.filter(function (x) { return x <= root + 26; });
    }
    function rnd(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
    // Each loop: a length in seconds and the notes at their times on it. Lengths 17–32 s, spread apart by "Loop lengths"
    // (the Music for Airports 2/1 loops were long and unequal for the same reason: they drift in and out of phase).
    function makeLoops() {
      var notes = scaleNotes(), R = rnd(+w.P.key * 31 + w.P.mode.length * 7 + 1), L = [], base = 19;
      for (var i = 0; i < w.P.loops; i++) {
        var len = base + w.P.spread * (i * 2.37 + R() * 1.9) * (i % 2 ? 1.3 : 1), n = Math.max(1, Math.round(w.P.density * (1 + R() * 1.6))), ev = [];
        for (var j = 0; j < n; j++) ev.push({ at: (j + R() * .6) * len / n, m: notes[Math.floor(R() * notes.length)], v: .45 + R() * .35 });
        L.push({ len: len, ev: ev });
      }
      return L;
    }
    w.onStart = function (c, out) {
      var bus = c.createGain(), dry = c.createGain(), wet = c.createGain(), echoG = c.createGain(), droneG = c.createGain(), noiseG = c.createGain(), comp = c.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = .05; comp.release.value = .5; comp.connect(out);
      var rev = SK.fx("reverb", c, { decay: w.P.decay, pre: 40, damp: 5000, early: .2, size: 1 }), dly = SK.fx("delay", c, { time: 1700, fb: .4, tone: 1800, wow: .5, pp: "1" }), ehp = c.createBiquadFilter();
      ehp.type = "highpass"; ehp.frequency.value = 150;   // long, dark echoes (Frippertronics-like); the right line repeats later (2.3 s) so they blur rather than tick
      if (dly.n && dly.n.lines[1]) dly.n.lines[1].d.delayTime.value = 2.3;
      bus.connect(dry); dry.connect(comp); bus.connect(rev.input); rev.output.connect(wet); wet.connect(comp); bus.connect(ehp); ehp.connect(echoG); echoG.connect(dly.input); dly.output.connect(rev.input); dly.output.connect(comp);
      dry.gain.value = 1 - w.P.verb * .6; wet.gain.value = w.P.verb * 1.4; echoG.gain.value = w.P.echo; droneG.gain.value = w.P.drone * .5; noiseG.gain.value = w.P.noise;
      droneG.connect(bus); noiseG.connect(rev.input); noiseG.connect(comp);
      var bed = noiseBed(c, noiseG, w.P), bank = null, dead = false, t0 = c.currentTime + .3, loops = makeLoops(), drone = [];
      // the drone: root and fifth (and the octave), three detuned saws each through a slowly opening and closing low-pass
      function droneOn() {
        drone.forEach(function (d) { d.g.gain.setTargetAtTime(0, c.currentTime, 1.5); setTimeout(function () { d.stop(); }, 6000); }); drone = []; pad = null;
        var root = 41 + ((+w.P.key - 5 + 12) % 12);
        if (w.P.dtype === "pad" && SK.wtFrames) return padOn(root);
        [[root, .5], [root + 7, .3], [root + 12, .2]].forEach(function (p, i) {
          var g = c.createGain(), lp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain(), os = [];
          lp.type = "lowpass"; lp.frequency.value = 500; lp.Q.value = .5; lfo.frequency.value = .03 + i * .017; lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
          [-9, 0, 8].forEach(function (dt) { var o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(p[0]); o.detune.value = dt; o.connect(lp); o.start(); os.push(o); });
          g.gain.setValueAtTime(0, c.currentTime); g.gain.setTargetAtTime(p[1] * .12, c.currentTime, 2); lp.connect(g); g.connect(droneG);
          drone.push({ g: g, stop: function () { os.concat([lfo]).forEach(function (o) { try { o.stop(); } catch (e) {} }); g.disconnect(); } });
        });
      }
      // the wavetable pad: each drone note on four frames of the site's wavetable (Vital's idea: a wave that slowly turns into
      // another), cross-faded by the scheduler tick along a slow position that never quite repeats
      var pad = null;
      function padOn(root) {
        var fr = SK.wtFrames(), pick = [0, 1, 4, 6].map(function (i) { return Math.min(i, fr.length - 1); }), all = [];
        var waves = pick.map(function (i) { return c.createPeriodicWave(new Float32Array(fr[i][1].length), fr[i][1]); });
        [[root, .5], [root + 7, .3], [root + 12, .2], [root + 19, .08]].forEach(function (p, j) {
          var g = c.createGain(), lp = c.createBiquadFilter(), gs = [];
          lp.type = "lowpass"; lp.frequency.value = 1400; lp.Q.value = .3;
          waves.forEach(function (wv, k) { var o = c.createOscillator(), og = c.createGain(); o.setPeriodicWave(wv); o.frequency.value = mtof(p[0]); o.detune.value = (k - 1.5) * 4 + j;
            og.gain.value = k ? 0 : 1; o.connect(og); og.connect(lp); o.start(); all.push(o); gs.push(og); });
          g.gain.setValueAtTime(0, c.currentTime); g.gain.setTargetAtTime(p[1] * .16, c.currentTime, 3); lp.connect(g); g.connect(droneG);
          drone.push({ g: g, gs: gs, ph: j * 1.7, stop: function () { all.forEach(function (o) { try { o.stop(); } catch (e) {} }); g.disconnect(); } });
        });
        pad = true;
      }
      function padScan(now) {
        drone.forEach(function (d) { if (!d.gs) return;
          var pos = 1.5 + 1.5 * Math.sin(now * .021 + d.ph) * Math.cos(now * .0067 + d.ph * .5);   // 0..3 across the four frames
          d.gs.forEach(function (g, k) { g.gain.setTargetAtTime(Math.max(0, 1 - Math.abs(pos - k)), now, .3); }); });
      }
      droneOn();
      var bset = null;
      function useBank() { bank = null; bset = null; if (w.P.inst === "bell") return;
        if (BELLS[w.P.inst]) { var k = w.P.inst; bellSet(c, k).then(function (b) { if (!dead && w.P.inst === k) bset = b; }).catch(function () {}); return; } var want = w.P.inst; loadBank(c).then(function (b) { return b.load([want]).then(function () { if (!dead && w.P.inst === want && b.has(want)) bank = b; }); }).catch(function () {}); }
      useBank();
      function play(e, t) { if (BELLS[w.P.inst]) { if (bset) bset.play(bus, e.m, t, e.v); else bell(c, bus, e.m, t, e.v, 7); e.lit = t; return; }
        if (bank) bank.play(w.P.inst, { midi: e.m, vel: e.v, dur: w.P.inst === "flute" ? 3 : 4 }, t, bus); else bell(c, bus, e.m, t, e.v, 7); e.lit = t; }
      // the scheduler: each loop's next note time is worked out from t0 and the loop's own length
      var next = loops.map(function () { return 0; }), cyc = loops.map(function () { return 0; });
      // wind chimes: a recorded gust now and then, panned somewhere, a little faster or slower; how often follows the slider
      var nextGust = c.currentTime + 4;
      function gust(now) {
        if (w.P.chimes < .02) { nextGust = now + 2; return; } if (now < nextGust) return;
        nextGust = now + (8 + Math.random() * 30) * (1.15 - w.P.chimes);
        var name = "chimes-" + CHIMES[Math.floor(Math.random() * CHIMES.length)];
        fetchBuf(c, name).then(function (b) { if (dead) return; var s = c.createBufferSource(), g = c.createGain(), pn = c.createStereoPanner();
          s.buffer = b; s.playbackRate.value = .85 + Math.random() * .3; pn.pan.value = Math.random() * 1.6 - .8; g.gain.value = .25 + .35 * w.P.chimes;
          s.connect(g); g.connect(pn); pn.connect(bus); s.start(); s.onended = function () { pn.disconnect(); }; }).catch(function () {});
      }
      function tick() {
        if (dead) return; var now = c.currentTime; gust(now); if (pad) padScan(now);
        loops.forEach(function (L, i) {
          for (;;) { var e = L.ev[next[i]], t = t0 + cyc[i] * L.len + e.at; if (t > now + .2) break; if (t >= now - .05) play(e, t); next[i]++; if (next[i] >= L.ev.length) { next[i] = 0; cyc[i]++; } }
        });
      }
      var iv = setInterval(tick, 50); tick();
      function rebuild() { loops = makeLoops(); t0 = c.currentTime + .1; next = loops.map(function () { return 0; }); cyc = loops.map(function () { return 0; }); }
      // the rings
      var raf = 0;
      function draw() {
        if (dead) return; raf = requestAnimationFrame(draw);
        var r = window.devicePixelRatio || 1, W = ring.clientWidth, H = ring.clientHeight; if (!W) return;
        if (ring.width !== W * r) { ring.width = W * r; ring.height = H * r; }
        var g = ring.getContext("2d"), cs = getComputedStyle(document.body), ink = cs.getPropertyValue("--site-ink-2") || "#777", acc = cs.getPropertyValue("--site-accent") || "#3fc2b4";
        g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H);
        var cx = W / 2, cy = H / 2, maxR = Math.min(W, H) / 2 - 6, now = c.currentTime;
        loops.forEach(function (L, i) {
          var rad = maxR * (.25 + .75 * (i + 1) / loops.length), ph = ((now - t0) / L.len) % 1; if (ph < 0) ph += 1;
          g.strokeStyle = ink; g.globalAlpha = .35; g.beginPath(); g.arc(cx, cy, rad, 0, 2 * Math.PI); g.stroke(); g.globalAlpha = 1;
          L.ev.forEach(function (e) { var a = e.at / L.len * 2 * Math.PI - Math.PI / 2, glow = e.lit != null ? Math.max(0, 1 - (now - e.lit) / 2) : 0;
            g.fillStyle = glow > 0 ? acc : ink; g.beginPath(); g.arc(cx + rad * Math.cos(a), cy + rad * Math.sin(a), 3 + glow * 4, 0, 2 * Math.PI); g.fill(); });
          var a2 = ph * 2 * Math.PI - Math.PI / 2; g.strokeStyle = acc; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + (rad - 5) * Math.cos(a2), cy + (rad - 5) * Math.sin(a2)); g.lineTo(cx + (rad + 5) * Math.cos(a2), cy + (rad + 5) * Math.sin(a2)); g.stroke(); g.lineWidth = 1;
        });
        g.fillStyle = ink; g.font = "11px sans-serif"; g.fillText(loops.map(function (L) { return L.len.toFixed(1); }).join(" · ") + " s", 6, H - 6);
      }
      draw();
      run = { bed: bed, dry: dry, wet: wet, echoG: echoG, droneG: droneG, noiseG: noiseG, rev: rev,
        rebuild: rebuild, retune: function () { droneOn(); rebuild(); }, inst: useBank };
      return function () {
        dead = true; clearInterval(iv); cancelAnimationFrame(raf); run = null; bed.stop(); drone.forEach(function (d) { d.stop(); }); if (bank && bank.stopAll) bank.stopAll();
        setTimeout(function () { rev.stop(); dly.stop(); try { comp.disconnect(); } catch (e) {} }, 300);
      };
    };
    return w;
  }

  var css = document.createElement("style");
  css.textContent = ".amb-eq{display:grid;grid-template-columns:repeat(10,minmax(2.2rem,1fr));gap:2px;max-width:560px;margin:.4rem 0}" +
    ".amb-band{display:flex;flex-direction:column;align-items:center;font-family:var(--font-mono);font-size:.7rem;margin:0}" +
    ".amb-band input{writing-mode:vertical-lr;direction:rtl;height:120px;width:22px;accent-color:var(--site-accent-dk)}" +
    ".amb-band .amb-bf{color:var(--site-ink-2)}.amb-nb{margin:.4rem 0}.amb-nb summary{cursor:pointer;font-family:var(--font-display)}" +
    ".sk-plot.amb-rings{height:260px;max-width:420px}";
  document.head.appendChild(css);
  SK.kinds.noiseeq = NoiseEq; SK.kinds.ambient = Ambient;
})();
