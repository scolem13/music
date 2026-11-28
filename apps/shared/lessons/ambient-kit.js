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
    { name: "Night", set: { dtype: "pad", chimes: .15, inst: "mbar", mode: "aeolian", key: "4", loops: 6, spread: .9, drone: .5, noise: .2, verb: .7, decay: 10, echo: .4, density: .4 }, color: "brown", eq: [0, 3, 2, 0, -3, -6, -9, -12, -15, -18] },
    { name: "Chime garden", set: { dtype: "pad", chimes: .7, inst: "chime", mode: "pent", key: "2", loops: 4, spread: 1, drone: .3, noise: .35, verb: .6, decay: 7, echo: .15, density: .5 }, color: "pink", eq: [-18, -10, -2, 4, 8, 4, -4, -10, -16, -18], swell: .6 },
    { name: "Glass and metal", set: { dtype: "pad", chimes: .25, inst: "wbar", mode: "lydian", key: "7", loops: 6, spread: 1, drone: .35, noise: .1, verb: .7, decay: 9, echo: .3, density: .5 }, color: "pink", eq: [-18, -12, -6, -3, 0, 0, 0, -2, -6, -12] }
  ];
  function loadBank(c) {
    var have = window.BandSounds ? Promise.resolve() : new Promise(function (res, rej) {
      var sc = document.querySelector('script[src^="/apps/shared/band/sounds.js"]');
      if (!sc) { sc = document.createElement("script"); sc.src = "/apps/shared/band/sounds.js?v=23"; document.head.appendChild(sc); }
      sc.addEventListener("load", res); sc.addEventListener("error", rej); });
    return have.then(function () { if (!loadBank.b || loadBank.c !== c) { loadBank.b = BandSounds.create(c); loadBank.c = c; } return loadBank.b; });
  }
  // ---- modelled chimes and bars (2026-11-28; no recordings). Additive modal synthesis: one sine per partial, each with its own level and
  // ring time (T60). Numbers from published measurements where they exist, else estimates (both listed in the sources and in
  // research_notes/bell-chime-samples/MODELS.md). Wind-chime tube: free-free ratios 1, 2.756, 5.404, 8.933, 13.34 (Hite, Compendium
  // p. 56); the fundamental carries the sustain, the 1st overtone about 2 s at 272 Hz, the next fades fast (p. 57); long tubes barely
  // radiate their fundamental (a C2 chime sounds about like C5, pp. 15-16: modelled as weak radiation below 250 Hz, an estimate).
  // Bars: carved 1 : 4 : 10 (Rossing, Yoo and Morrison 2004); wood 2 s at C3 falling to 1/50 s at C7, metal 30 s low to 6 s high
  // (US 4,411,187); overtones ring 1/2 and 1/7 of the fundamental's time (Bork and Meyer, via McCarthy 1994); a resonator adds up to
  // 10 dB to the fundamental and builds up slowly in low notes (McCarthy). Mallet / striker contact time tc damps partials above about
  // 2/tc (Kirkby, lecture 14). The bell model is not here yet: it needs more work.
  function contact(f, tc) { var x = f * tc / 2; return 1 / (1 + x * x * x * x); }
  function partial(c, out, f, a, T60, t, att) {
    if (f > c.sampleRate * .45 || a < 1e-4) return; var g = c.createGain(), o = c.createOscillator(); att = att || .003;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + att); g.gain.setTargetAtTime(0, t + att, T60 / 6.9);
    o.frequency.value = f; o.connect(g); g.connect(out); o.start(t); o.stop(t + att + T60 * 1.2 + .05); o.onended = function () { g.disconnect(); };
  }
  var MODAL = {
    chime: function (c, out, f1, t, v, hard, ring) {
      var tc = .004 - .003 * (hard == null ? .35 : hard), T1 = 20 * Math.pow(220 / f1, .5) * (ring || 1);
      [1, 2.756, 5.404, 8.933, 13.34].forEach(function (r, k) { var fr = f1 * r, rad = Math.min(1, Math.pow(fr / 250, 1.5));
        var T = k === 0 ? T1 : k === 1 ? Math.min(T1, 2 * Math.pow(272 / f1, .5) * (ring || 1)) : T1 * Math.pow(1 / r, 1.4);
        partial(c, out, fr, v * .3 * [1, .55, .35, .22, .12][k] * rad * contact(fr, tc), T, t); });
    },
    bar: function (c, out, f0, t, v, metal, hard, ring) {
      var tc = .008 - .006 * (hard == null ? .3 : hard), T = metal ? Math.min(40, 30 * Math.pow(175 / f0, .77)) * .8 : (f0 > 131 ? 2 * Math.pow(131 / f0, 1.66) : 2 * Math.pow(131 / f0, .6)) * 1.3;
      T *= ring || 1; var att = f0 < 200 ? .25 : .06;
      [1, 4, 10, 17.5].forEach(function (r, k) { partial(c, out, f0 * r, v * .35 * [2.5, .5, .25, .1][k] * contact(f0 * r, tc), T * [1, .5, 1 / 7, 1 / 12][k], t, k ? .003 : att); });
    }
  };
  // church bell (work in progress: it needs more work, the owner says). Partial ratios to the prime as measured on the Westminster Abbey
  // tenor (Hibbert); tierce often loudest, quint very quiet (Hibbert); a C3 carillon bell's low modes ring about 100 s (Rau et al.,
  // DAFx-19); clapper contact 1-1.4 ms; doublets about 1.2 cents apart (Hibbert). The other levels and the 1/frequency ring-time
  // scaling are estimates. The note played is the strike note: the prime is an octave below it.
  var BELLP = [[.501, .7, 1.7], [1, .6, 1], [1.187, 1, .84], [1.499, .15, .67], [2, .85, .5], [2.49, .12, .4], [2.54, .1, .39], [2.58, .1, .39], [2.79, .08, .36], [2.998, .35, .33], [4.13, .3, .24], [5.36, .2, .19], [6.69, .12, .15], [8.05, .08, .12], [9.53, .05, .1]];
  // temple bells (research_notes/bell-chime-samples/BELLS-RESEARCH.md). Struck from outside by a wooden log: a soft, long contact
  // (5-15 ms: an estimate, nothing measured) that still excites modes up to about 800 Hz (Kim and Kim 1997). Rows: [ratio to the lowest
  // mode, level, T60 at the reference pitch (s), doublet split at the reference pitch (Hz)]. Korean: the Divine Bell of King Seongdeok,
  // hum pair 64.06 / 64.38-64.50 Hz split 0.32-0.37 Hz (Kim and Lee 2025; Kim and Kim 1997), 168.3-168.75 Hz split 0.08-0.13 (the
  // sources differ), then 190.1 (1.26), 228.3 (0.32), 282.6 (0.66) and a cluster at 346-350 Hz (Cho et al. 2023, Table 1, as read);
  // after about 10 s only the hum is left (1997), the 168 Hz tone lasts about 20 s (2025). Japanese: the Mii-dera bonsho, 109, 216, 253,
  // 320 / 323, 350, 409, 466 / 477, 567 Hz, and a weak 47 Hz mode heard inside the bell; at 13 s only 109 and 216 Hz remain (Sakurai
  // et al. 2020). Every level, every T60 and the Japanese splits are estimates. Vietnamese: nothing measured; their shape is near-
  // cylindrical like Chinese and Japanese bells (Vietnam National Museum of History), so it starts from the Japanese table until the
  // owner's recording of a Vietnamese temple bell sets it.
  var TEMPLE = {
    korean: { ref: 64.35, rows: [[1, 1, 75, .34], [2.62, .8, 28, .1], [2.95, .6, 12, 1.26], [3.55, .55, 10, .32], [4.39, .45, 8, .66], [5.4, .35, 6, .5], [5.43, .3, 6, .4]] },
    japanese: { ref: 109, rows: [[.43, .15, 60, .05], [1, 1, 45, .2], [1.98, .8, 35, .25], [2.32, .45, 10, .3], [2.95, .35, 8, .2], [2.96, .3, 8, .2], [3.21, .3, 7, .3], [3.75, .25, 6, .3], [4.28, .2, 5, .3], [4.38, .18, 5, .3], [5.2, .14, 4, .3]] }
  };
  // Western bell types: hum, prime, tierce, quint, nominal as ratios to the prime, worked out from the tables of hum-relative ratios
  // in Hibbert, "Basic Principles of Bell Tuning" (Taylor 1980s, Mears 1859) and Lehr's Tables II and V on Hibbert's site (Thomas Both
  // 1591, van den Ghein 1615, Bourlet 1679, Eijsbouts 1955); `up` replaces upper partials where those tables give them (van den Ghein
  // I-5 3.15 and I-6 4.37 of nominal/2; Eijsbouts I-5 2.99, I-6 4.15, I-7 5.40, I-8 6.78); the rest are Westminster's, scaled with
  // the nominal. Old bells: "the hum is often a tone or more sharp ... the prime often a tone or more flat" (Hibbert).
  var WBELL = {
    westminster: { r: [.501, 1, 1.187, 1.499, 2], label: "Westminster Abbey tenor (tuned)" },
    taylor: { r: [.5, 1, 1.185, 1.505, 2], label: "Taylor, 1980s (true-harmonic)" },
    eijsbouts: { r: [.5, 1, 1.2, 1.5, 2], up: { 9: 2.99, 10: 4.15, 11: 5.4, 12: 6.78 }, label: "Eijsbouts carillon bell, 1955" },
    both: { r: [.568, 1, 1.352, 1.705, 2.278], label: "Thomas Both, 1591" },
    ghein: { r: [.49, 1, 1.176, 1.392, 1.961], up: { 9: 3.088, 10: 4.284 }, label: "van den Ghein, 1615" },
    bourlet: { r: [.485, 1, 1.267, 1.535, 1.98], label: "Bourlet, 1679" },
    mears: { r: [.613, 1, 1.331, 1.767, 2.196], label: "Mears, 1859 (old style: sharp hum, flat prime)" }
  };
  function bellRows(kind) {
    var W = WBELL[kind] || WBELL.westminster, k = W.r[4] / 2;
    return BELLP.map(function (p, i) { var r = i < 5 ? W.r[i] : (W.up && W.up[i]) || p[0] * k; return [r, p[1], p[2]]; });
  }
  MODAL.bell = function (c, out, nom, t, v, hard, warble, type, beat) {
    var h = hard == null ? .55 : hard, depth = beat == null ? .5 : beat;
    if (type === "korean" || type === "japanese" || type === "vietnamese") {
      var B = TEMPLE[type === "vietnamese" ? "japanese" : type] || TEMPLE.korean, f1 = nom, sc = f1 / B.ref, tc = .015 - .01 * h;
      B.rows.forEach(function (r) { var f = f1 * r[0], a = v * .2 * r[1] * contact(f, tc), T = Math.min(240, r[2] / Math.pow(sc, .8)), sp = r[3] * sc;
        partial(c, out, f - sp / 2, a, T, t, .006); partial(c, out, f + sp / 2, a * (1 - .8 * depth), T, t, .006); });   // unequal lines: the beat is stronger in some directions (Kim and Lee 2025)
      var n = Math.round(c.sampleRate * .08), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
      var s0 = c.createBufferSource(), lp = c.createBiquadFilter(), g0 = c.createGain(); s0.buffer = b; lp.type = "lowpass"; lp.frequency.value = 500 + 900 * h; g0.gain.value = v * .12 * (.4 + h); s0.connect(lp); lp.connect(g0); g0.connect(out); s0.start(t);   // the log's thud
      return;
    }
    var rows = bellRows(type && type.indexOf("w-") === 0 ? type.slice(2) : "westminster"), f0 = nom / rows[4][0], tc2 = .0034 - .0022 * h, T0 = 100 * (129 / f0), cents = warble == null ? 1.2 : warble;
    rows.forEach(function (p) { var f = f0 * p[0], a = v * .16 * p[1] * contact(f, tc2) * (f > 1500 && f < 3000 ? 1 + .6 * h : 1), sp = f * cents * Math.LN2 / 1200 * (.6 + .8 * Math.random());
      partial(c, out, f - sp / 2, a, Math.min(240, T0 * p[2]), t); partial(c, out, f + sp / 2, a, Math.min(240, T0 * p[2]), t); });
  };
  var VOICES = { kbell: { oct: -24, play: function (c, o, m, t, v) { MODAL.bell(c, o, mtof(m), t, v, .5, null, "korean"); } },
    jbell: { oct: -24, play: function (c, o, m, t, v) { MODAL.bell(c, o, mtof(m), t, v, .5, null, "japanese"); } },
    cbell: { oct: -12, play: function (c, o, m, t, v, P) { MODAL.bell(c, o, mtof(m), t, v, .55, null, "w-" + (P && P.btype || "westminster")); } }, mbar: { oct: -12, play: function (c, o, m, t, v) { MODAL.bar(c, o, mtof(m), t, v, true); } },
    wbar: { oct: -12, play: function (c, o, m, t, v) { MODAL.bar(c, o, mtof(m), t, v, false); } },
    chime: { oct: -12, play: function (c, o, m, t, v) { MODAL.chime(c, o, mtof(m), t, v); } } };
  // a soft bell, for when there are no samples (or "Synth bell" is chosen): two sines a fifth and two octaves up, slow fade
  function bell(c, out, m, t, v, dur) {
    var g = c.createGain(), f = mtof(m); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .25, t + .04); g.gain.exponentialRampToValueAtTime(.0005, t + dur); g.connect(out);
    [[1, 1], [3, .12], [4.01, .06]].forEach(function (p) { var o = c.createOscillator(), og = c.createGain(); o.frequency.value = f * p[0]; og.gain.value = p[1]; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .05); });
  }
  // ---- Energy: one knob that moves many settings, after the MODX Super Knob (each assigned parameter has its own From and To; the
  // knob sweeps every one of them at once, and the controls themselves move so you can see what it is doing). From = where the
  // setting was when Energy was last at 0 (move a control with Energy at 0 to change it); To is typed in the table.
  var ENERGY = [   // key, To at full energy
    ["density", 2.6], ["pace", 4], ["noise", .75], ["echo", .7], ["fb", .9], ["drive", .85], ["bright", 9000],
    ["chimes", .9], ["cymbals", .8], ["drone", .8], ["verb", .8]
  ];
  function energyPanel(w) {
    var box = el("details", "amb-en"); box.open = true; box.appendChild(el("summary", "", "Energy: one knob, many settings (like the MODX Super Knob)"));
    var top = el("div", "sk-ctls"); box.appendChild(top); w.body.appendChild(box);
    var tbl = el("table", "amb-en-t"), head = el("tr"); ["On", "Setting", "From", "To", "Now"].forEach(function (h) { head.appendChild(el("th", "", h)); }); tbl.appendChild(head); box.appendChild(tbl);
    var rows = {}, driving = false;
    w.energy = { rows: rows, map: ENERGY };
    ENERGY.forEach(function (e) {
      var k = e[0], c = w.c[k], tr = el("tr"), on = el("input"), fr = el("input"), to = el("input"), bar = el("span", "amb-en-bar"), fill = el("span");
      on.type = "checkbox"; on.checked = true; [fr, to].forEach(function (x) { x.type = "number"; x.step = "any"; x.className = "amb-en-n"; });
      var o = c.input, lo = k === "bright" ? 600 : +o.min, hi = k === "bright" ? 18000 : +o.max;
      fr.value = round(c.value); to.value = e[1]; bar.appendChild(fill);
      [on, el("span", "", c.el.querySelector(".sk-cl").textContent), fr, to, bar].forEach(function (x) { var td = el("td"); td.appendChild(x); tr.appendChild(td); });
      tbl.appendChild(tr); rows[k] = { on: on, from: fr, to: to, fill: fill, lo: lo, hi: hi };
      // a control moved by hand while Energy is at 0 becomes the new From
      c.input.addEventListener("input", function () { if (!driving && w.P.energy < .005) fr.value = round(c.value); paint(k); });
      [on, fr, to].forEach(function (x) { x.addEventListener("change", function () { sweep(w.P.energy); }); });
    });
    function round(v) { return Math.round(v * 1000) / 1000; }
    function paint(k) { var r = rows[k], v = w.c[k].value, f = k === "bright" ? Math.log(v / r.lo) / Math.log(r.hi / r.lo) : (v - r.lo) / (r.hi - r.lo); r.fill.style.width = Math.max(0, Math.min(100, f * 100)) + "%"; }
    function sweep(E) {
      driving = true;
      ENERGY.forEach(function (e) { var k = e[0], r = rows[k]; if (!r.on.checked) return; var a = +r.from.value, b = +r.to.value;
        var v = k === "bright" ? a * Math.pow(b / a, E) : a + (b - a) * E;   // brightness sweeps in octaves, the rest in a straight line
        w.c[k].set(v); paint(k); });
      driving = false;
    }
    w.num("energy", { label: "Energy", min: 0, max: 1, step: .005, value: 0, fmt: function (v) { return v < .02 ? "calm" : v < .35 ? "stirring" : v < .7 ? "busy" : v < .9 ? "loud" : "noise"; }, on: sweep }, top);
    w.c.energy.el.classList.add("amb-en-knob");
    w.energy.resetFrom = function () { ENERGY.forEach(function (e) { rows[e[0]].from.value = round(w.c[e[0]].value); paint(e[0]); }); };
    setTimeout(function () { ENERGY.forEach(function (e) { paint(e[0]); }); }, 0);
  }
  // ---- Record take -> Open in DAW (2026-11-28). While a take records, every loop note, chime gust, cymbal swell and settings change
  // is logged, and eight stems (master as heard, loop notes, chimes, cymbals, drone, noise, reverb and echo returns) are captured
  // by one AudioWorklet at half the sample rate, mono, so five minutes is about 90 MB. "Open in DAW" writes the stems into the
  // DAW's own recordings store (IndexedDB "mini-daw" / "takes", the schema mini-daw.js's putTake uses), and hands the DAW page a
  // project (localStorage "mdaw:handoff-project", read by MiniDaw's takeHandoff): 60 bpm so one beat is one second, a note track
  // per tape loop, an audio track per stem (all but Master muted: Master is what you heard; solo a stem to hear it alone), and a
  // muted "setting" track per changed setting whose volume line draws the setting (0 dB = top of its range, -40 dB = bottom).
  var TAKE_MAX = 300, REC_WORKLET = "registerProcessor('amb-take',class extends AudioWorkletProcessor{constructor(o){super();this.n=o.numberOfInputs;this.b=[];this.k=0;this.on=true;for(var i=0;i<this.n;i++)this.b.push(new Float32Array(8192));this.port.onmessage=e=>{if(e.data==='stop'){this.flush();this.on=false;}};}" +
    "flush(){if(!this.k)return;this.port.postMessage(this.b.map(a=>a.slice(0,this.k)));this.k=0;}" +
    "process(ins){for(var i=0;i<this.n;i++){var ch=ins[i],a=this.b[i],L=ch&&ch[0],R=ch&&ch[1]||L;if(!L){for(var j=0;j<64;j++)a[this.k+j]=0;continue;}for(var j=0;j<64;j++)a[this.k+j]=(L[2*j]+R[2*j]+L[2*j+1]+R[2*j+1])/4;}this.k+=64;if(this.k>=8192)this.flush();return this.on;}});";
  function idbPut(id, data, rate) {
    return new Promise(function (res, rej) { var r = indexedDB.open("mini-daw", 1); r.onupgradeneeded = function () { r.result.createObjectStore("takes"); };
      r.onsuccess = function () { var t = r.result.transaction("takes", "readwrite"); t.objectStore("takes").put({ data: data, rate: rate }, id); t.oncomplete = res; t.onerror = function () { rej(t.error); }; }; r.onerror = function () { rej(r.error); }; });
  }
  var DAW_INST = { piano: "piano", rhodes: "rhodes", flute: "syn-sub" };
  function takeUI(w, getRun) {
    var box = el("div", "amb-take"); w.body.insertBefore(box, w.ctls);
    var recB = button(box, "● Record take", function () { w.take && w.take.on ? w.take.finish() : w.recordTake(); }, "btn-outline-danger"),
      dawB = button(box, "Open in DAW ↗", function () { w.openTake(); }, "btn-outline-primary"), msg = el("span", "amb-take-n", ""); box.appendChild(msg);
    dawB.disabled = true;
    w.recordTake = function () {
      var run = getRun(); if (!run) { w.start(); setTimeout(w.recordTake, 400); return; }
      var c = run.ctx, T = run.taps(), url = URL.createObjectURL(new Blob([REC_WORKLET], { type: "application/javascript" }));
      var tk = w.take = { on: true, t0: c.currentTime, rate: c.sampleRate / 2, names: T.map(function (x) { return x[0]; }), chunks: T.map(function () { return []; }), notes: [], events: [], changes: [],
        start: {}, loops: run.loopsNow().map(function (L) { return L.len; }), inst: w.P.inst, node: null };
      Object.keys(w.P).forEach(function (k) { if (typeof w.P[k] === "number") tk.start[k] = w.P[k]; });
      tk.note = function (li, m, v, t, inst) { tk.notes.push({ li: li, m: m, v: v, t: Math.max(0, t - tk.t0), inst: inst }); };
      tk.event = function (kind, name, s, pn) { tk.events.push({ t: c.currentTime - tk.t0, kind: kind, name: name, rate: s.playbackRate.value, pan: pn.pan.value }); };
      tk.change = function (k, v) { if (typeof v !== "number") { tk.changes.push({ t: c.currentTime - tk.t0, k: k, v: v }); return; } var last = null; for (var i = tk.changes.length - 1; i >= 0; i--) if (tk.changes[i].k === k) { last = tk.changes[i]; break; }
        var t = c.currentTime - tk.t0; if (last && t - last.t < .25 && i === tk.changes.length - 1) { last.v = v; return; } tk.changes.push({ t: t, k: k, v: v }); };
      tk.finish = function () { if (!tk.on) return; tk.on = false; tk.dur = c.currentTime - tk.t0; clearInterval(tk.iv); if (tk.node) { tk.node.port.postMessage("stop"); setTimeout(function () { try { tk.node.disconnect(); } catch (e) {} }, 300); }
        recB.textContent = "● Record take"; dawB.disabled = false; setTimeout(function () { msg.textContent = "Take: " + fmtS(tk.dur) + ", " + tk.notes.length + " notes, " + tk.events.length + " chimes and swells, " + tk.changes.length + " setting changes. Open it in the DAW."; }, 350); };
      c.audioWorklet.addModule(url).then(function () {
        if (!tk.on) return; var n = new AudioWorkletNode(c, "amb-take", { numberOfInputs: T.length, numberOfOutputs: 0, channelCount: 2, channelCountMode: "explicit" });
        tk.node = n; T.forEach(function (x, i) { x[1].connect(n, 0, i); }); tk.t0 = c.currentTime;
        n.port.onmessage = function (e) { e.data.forEach(function (a, i) { tk.chunks[i].push(a); }); };
      }).catch(function (e) { msg.textContent = "This browser cannot record a take: " + e.message; tk.on = false; });
      recB.textContent = "■ Stop take"; dawB.disabled = true;
      tk.iv = setInterval(function () { var d = c.currentTime - tk.t0; msg.textContent = "Recording " + fmtS(d) + " of at most " + fmtS(TAKE_MAX) + " · " + tk.notes.length + " notes"; if (d >= TAKE_MAX) tk.finish(); }, 500);
    };
    w.takeProject = function () {   // -> { project, stems: [{ id, data, rate }] }
      var tk = w.take; if (!tk || tk.on) return null; var beats = Math.ceil(tk.dur), bars = Math.max(1, Math.ceil(beats / 4)), id0 = "amb" + Date.now().toString(36), tracks = [], stems = [];
      var loopsUsed = {}; tk.notes.forEach(function (n) { (loopsUsed[n.li] = loopsUsed[n.li] || []).push(n); });
      Object.keys(loopsUsed).sort(function (a, b) { return a - b; }).forEach(function (li) { var ns = loopsUsed[li], inst = DAW_INST[ns[0].inst] || "syn-fm";
        tracks.push({ name: "Loop " + (+li + 1) + (tk.loops[li] ? " (" + tk.loops[li].toFixed(1) + " s)" : "") + " · " + ns[0].inst, inst: inst, vol: -6, pan: 0, mute: true, solo: false,
          clips: [{ start: 0, len: bars * 4, notes: ns.map(function (n) { return { t: n.t, d: Math.min(4, bars * 4 - n.t), m: n.m, v: n.v }; }) }] }); });
      tk.names.forEach(function (nm, i) {
        var parts = tk.chunks[i], len = parts.reduce(function (a, p) { return a + p.length; }, 0), data = new Float32Array(len), o = 0; parts.forEach(function (p) { data.set(p, o); o += p.length; });
        var pk = 0; for (var j = 0; j < data.length; j++) if (Math.abs(data[j]) > pk) pk = Math.abs(data[j]); if (i > 0 && pk < 1e-4) return;   // a stem that stayed silent is left out
        var tid = id0 + "-" + i; stems.push({ id: tid, data: data, rate: tk.rate });
        tracks.push({ name: nm, inst: "audio", vol: 0, pan: 0, mute: i > 0, solo: false, clips: [{ start: 0, len: len / tk.rate, take: tid, off: 0, gain: 0, nudge: 0, notes: [] }] });
      });
      var by = {}; tk.changes.forEach(function (ch) { if (typeof ch.v === "number") (by[ch.k] = by[ch.k] || []).push(ch); });
      Object.keys(by).forEach(function (k) { var c0 = w.c[k], inp = c0 && c0.input; if (!inp) return; var lo = k === "bright" ? 600 : +inp.min, hi = k === "bright" ? 18000 : +inp.max;
        var f = function (v) { return Math.max(0, Math.min(1, k === "bright" ? Math.log(v / lo) / Math.log(hi / lo) : (v - lo) / (hi - lo || 1))); };
        var label = c0.el.querySelector(".sk-cl") ? c0.el.querySelector(".sk-cl").textContent : k, pts = [{ t: 0, v: -40 * (1 - f(tk.start[k] != null ? tk.start[k] : by[k][0].v)) }];
        by[k].forEach(function (ch) { pts.push({ t: Math.min(beats, ch.t), v: -40 * (1 - f(ch.v)) }); });
        tracks.push({ name: "⚙ " + label + " (a setting: its line, not a sound)", inst: "audio", vol: 0, pan: 0, mute: true, solo: false, clips: [], auto: { vol: pts } }); });
      var marks = tk.changes.filter(function (ch) { return typeof ch.v !== "number"; }).map(function (ch) { return fmtS(ch.t) + " " + ch.k + " → " + ch.v; });
      return { project: { tempo: 60, bars: bars, ts: [4, 4], loop: { on: false, from: 0, to: 4 }, click: false, tracks: tracks, notes: "Ambient Generator take, " + new Date().toLocaleString() + ". " + tk.events.length + " chime gusts and cymbal swells. " + (marks.length ? "Switched: " + marks.join("; ") : "") }, stems: stems };
    };
    w.openTake = function () {
      var r = w.takeProject(); if (!r) return; msg.textContent = "Saving the take for the DAW…";
      Promise.all(r.stems.map(function (s) { return idbPut(s.id, s.data, s.rate); })).then(function () {
        try { localStorage.setItem("mdaw:handoff-project", JSON.stringify({ at: Date.now(), name: "Ambient take " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), project: r.project })); } catch (e) { throw new Error("the browser would not keep the project (" + e.message + ")"); }
        msg.textContent = "Opened in the DAW (a new tab)."; window.open("/tools/daw.html", "_blank");
      }).catch(function (e) { msg.textContent = "Could not hand the take to the DAW: " + e.message; });
    };
  }
  function Ambient(host) {
    var w = K.Base(host, "Ambient Generator"), run = null;
    w.knobView && w.knobView();
    var pr = el("div", "sk-presets"); pr.appendChild(el("span", "sk-cl", "Presets"));
    AMB_PRESETS.forEach(function (p) { button(pr, p.name, function () { w.preset(p); }); });
    w.body.insertBefore(pr, w.ctls);
    w.pick("key", "Key", KEYS, "5", null, function () { if (run) run.retune(); });
    w.pick("mode", "Scale", [["major", "Major"], ["lydian", "Lydian (♯4: floating)"], ["pent", "Major pentatonic"], ["dorian", "Dorian"], ["aeolian", "Natural minor"], ["minpent", "Minor pentatonic"]], "major", null, function () { if (run) run.retune(); });
    w.pick("inst", "Loop notes on", [["piano", "Piano (samples)"], ["rhodes", "Electric piano (samples)"], ["flute", "Flute (samples)"], ["cbell", "Church bells (model, in progress)"], ["kbell", "Korean temple bells (model)"], ["jbell", "Japanese temple bells (model)"], ["mbar", "Bass metal bars (model)"], ["wbar", "Bass wooden bars (model)"], ["chime", "Chime tubes (model)"], ["bell", "Synth bell"]], "piano", null, function () { if (run) run.inst(); });
    w.pick("btype", "Church bell type", [["westminster", "Westminster Abbey tenor (tuned)"], ["taylor", "Taylor, 1980s"], ["eijsbouts", "Eijsbouts carillon, 1955"], ["both", "Thomas Both, 1591"], ["ghein", "van den Ghein, 1615"], ["bourlet", "Bourlet, 1679"], ["mears", "Mears, 1859 (old style)"]], "westminster");
    w.num("oct", { label: "Loop octave", min: -3, max: 2, step: 1, value: 0, fmt: function (v) { return v === 0 ? "as written (F3 up)" : (v > 0 ? "+" : "") + v + (Math.abs(v) === 1 ? " octave" : " octaves"); } });
    w.num("loops", { label: "Tape loops", min: 1, max: 9, step: 1, value: 7, fmt: function (v) { return v + (v === 1 ? " loop" : " loops"); }, on: function () { if (w.renderLoops) w.renderLoops(); if (run) run.rebuild(); } });
    w.num("spread", { label: "Loop lengths", min: 0, max: 1, step: .01, value: 1, fmt: function (v) { return v < .05 ? "all equal (a pulse)" : v < .5 ? "close" : "far apart (never lines up)"; }, on: function () { if (run) run.rebuild(); } });
    w.num("density", { label: "Notes per loop", min: .2, max: 3, step: .01, value: .9, fmt: fmtPct, on: function () { if (run) run.rebuildSoon(); } });
    w.num("pace", { label: "Loop speed", min: 1, max: 6, step: .01, value: 1, fmt: function (v) { return v < 1.05 ? "as recorded" : "x" + v.toFixed(1); }, on: function () { if (run) run.rebuildSoon(); } });
    w.pick("dtype", "Drone", [["saw", "Detuned saws"], ["pad", "Wavetable pad (scanning)"]], "saw", null, function () { if (run) run.retune(); });
    w.num("chimes", { label: "Wind chimes", min: 0, max: 1, step: .01, value: 0, fmt: function (v) { return v < .02 ? "off" : v < .4 ? "now and then" : v < .75 ? "often" : "a windy day"; } });
    w.num("drone", { label: "Drone level", min: 0, max: 1, step: .01, value: .15, fmt: fmtPct });
    w.num("noise", { label: "Noise bed", min: 0, max: 1, step: .01, value: .05, fmt: fmtPct });
    w.num("verb", { label: "Reverb", min: 0, max: 1, step: .01, value: .5, fmt: fmtPct });
    w.num("decay", { label: "Reverb length", min: 1, max: 10, step: .1, value: 6, fmt: fmtS });
    w.num("echo", { label: "Tape echo", min: 0, max: .8, step: .01, value: .25, fmt: fmtPct });
    w.num("fb", { label: "Echo feedback", min: .2, max: .97, step: .01, value: .4, fmt: fmtPct });
    w.num("drive", { label: "Drive", min: 0, max: 1, step: .01, value: 0, fmt: function (v) { return v < .02 ? "clean" : fmtPct(v); } });
    w.num("bright", { label: "Brightness", min: 600, max: 18000, log: true, value: 18000, fmt: fmtHz });
    w.num("cymbals", { label: "Cymbal swells", min: 0, max: 1, step: .01, value: 0, fmt: function (v) { return v < .02 ? "off" : fmtPct(v); } });
    // the chime and cymbal menus: the chimes are modelled tubes (their tuning, size and striker); the cymbals are the Drum Kits' recordings
    function soundMenu(title, cls, key, names, on, rows) {
      var d = el("details", "amb-nb " + cls); d.appendChild(el("summary", "", title)); w.body.appendChild(d);
      var ck = el("div", "amb-ck"); d.appendChild(ck); if (!names) { var ctl0 = el("div", "sk-ctls"); d.appendChild(ctl0); rows.forEach(function (r) { r[2] ? w.pick(r[0], r[1].label, r[2], r[1].value, ctl0) : w.num(r[0], r[1], ctl0); }); return; }
      w.P[key] = names.filter(function (n, i) { return on[i]; }).map(function (n) { return n[0]; });
      names.forEach(function (n, i) { var lb = el("label"), x = el("input"); x.type = "checkbox"; x.checked = !!on[i]; x.value = n[0];
        x.addEventListener("change", function () { w.P[key] = [].slice.call(ck.querySelectorAll("input:checked")).map(function (y) { return y.value; }); });
        lb.appendChild(x); lb.appendChild(document.createTextNode(" " + n[1])); ck.appendChild(lb); });
      var ctl = el("div", "sk-ctls"); d.appendChild(ctl); rows.forEach(function (r) { w.num(r[0], r[1], ctl); });
    }
    soundMenu("Wind chimes: a set of modelled tubes, their tuning, size and striker", "amb-chm", "chimeSet", null, null, [
        ["chTune", { label: "Tubes tuned to", value: "0,2,4,7,9" }, [["0,2,4,7,9", "Major pentatonic"], ["0,3,5,7,10", "Minor pentatonic"], ["0,7,12,16,19", "Open fifths"], ["0,2,7,9,14", "Sus (no third)"]]],
        ["chLow", { label: "Longest tube", min: 36, max: 64, step: 1, value: 45, fmt: function (v) { return ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][v % 12] + (Math.floor(v / 12) - 1) + (v < 48 ? " (bass)" : v < 55 ? " (baritone)" : " (tenor)"); } }],
        ["chHard", { label: "Striker", min: 0, max: 1, step: .01, value: .35, fmt: function (v) { return v < .3 ? "soft (wood)" : v < .7 ? "medium" : "hard (metal)"; } }],
        ["chRing", { label: "Ring length", min: .3, max: 2.5, step: .01, value: 1, fmt: function (v) { return "x" + v.toFixed(2); } }],
        ["chLevel", { label: "Level", min: 0, max: 2, step: .01, value: 1, fmt: fmtPct }],
        ["chWidth", { label: "Stereo width", min: 0, max: 1, step: .01, value: .8, fmt: fmtPct }]]);
    soundMenu("Cymbal swells: which cymbals, backwards or forwards, level, speed, width", "amb-cym", "cymSet",
      [["crash16-edge", "16\" crash"], ["crash13-edge", "13\" crash"], ["hat-open", "Open hi-hat"], ["china", "China"], ["ride20-bow", "20\" ride (bow)"], ["ride20-bell", "20\" ride (bell)"], ["ride17-bow", "17\" ride"]],
      [1, 1, 1, 1, 0, 0, 0], [
        ["cyLevel", { label: "Level", min: 0, max: 2, step: .01, value: 1, fmt: fmtPct }],
        ["cyRev", { label: "Backwards", min: 0, max: 1, step: .01, value: .7, fmt: function (v) { return Math.round(v * 100) + "% of them"; } }],
        ["cySpeed", { label: "Speed (pitch)", min: .3, max: 1.5, step: .01, value: .85, fmt: function (v) { return "x" + v.toFixed(2); } }],
        ["cyVary", { label: "Speed varies by", min: 0, max: .5, step: .01, value: .25, fmt: function (v) { return "±" + Math.round(v * 100) + "%"; } }],
        ["cyWidth", { label: "Stereo width", min: 0, max: 1, step: .01, value: .7, fmt: fmtPct }]]);
    // ---- per-loop instruments and octaves; the drone voice; slow LFOs (after Vital: several at once, each with a target and an amount)
    var INSTS = [["same", "(as Loop notes on)"], ["dvoice", "Drone voice"], ["piano", "Piano"], ["rhodes", "Electric piano"], ["flute", "Flute"], ["cbell", "Church bell"], ["kbell", "Korean temple bell"], ["jbell", "Japanese temple bell"], ["mbar", "Bass metal bar"], ["wbar", "Bass wooden bar"], ["chime", "Chime tube"], ["bell", "Synth bell"]];
    w.P.loopInst = []; w.P.loopOct = [];
    var lt = el("details", "amb-nb amb-lt"); lt.appendChild(el("summary", "", "Loops: an instrument and an octave for each loop")); w.body.appendChild(lt);
    var ltBox = el("div", "amb-ltb"); lt.appendChild(ltBox);
    w.renderLoops = function () {
      ltBox.innerHTML = ""; var n = w.P.loops;
      for (var i = 0; i < n; i++) (function (i) {
        var row = el("div", "amb-ltr"), si = document.createElement("select"), so = document.createElement("select");
        row.appendChild(el("span", "amb-ltn", "Loop " + (i + 1)));
        INSTS.forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; si.appendChild(op); }); si.value = w.P.loopInst[i] || "same";
        [-2, -1, 0, 1, 2].forEach(function (o) { var op = document.createElement("option"); op.value = o; op.textContent = o === 0 ? "same octave" : (o > 0 ? "+" : "") + o + " oct"; so.appendChild(op); }); so.value = w.P.loopOct[i] || 0;
        si.setAttribute("aria-label", "Loop " + (i + 1) + " instrument"); so.setAttribute("aria-label", "Loop " + (i + 1) + " octave");
        si.onchange = function () { w.P.loopInst[i] = si.value; if (run) run.inst(); }; so.onchange = function () { w.P.loopOct[i] = +so.value; };
        row.appendChild(si); row.appendChild(so); ltBox.appendChild(row);
      })(i);
    };
    w.setLoop = function (i, inst, oct) { w.P.loopInst[i] = inst; if (oct != null) w.P.loopOct[i] = oct; w.renderLoops(); if (run) run.inst(); };
    var dv = el("details", "amb-nb"); dv.appendChild(el("summary", "", "Drone voice: a drone-like note with its own envelope, for loops set to it")); w.body.appendChild(dv);
    var dvc = el("div", "sk-ctls"); dv.appendChild(dvc);
    w.pick("dvWave", "Wave", [["saw", "Detuned saws"], ["pad", "Wavetable (scanned)"]], "pad", dvc);
    w.num("dvA", { label: "Attack", min: .05, max: 20, log: true, value: 3, fmt: fmtS }, dvc);
    w.num("dvH", { label: "Hold", min: 0, max: 30, step: .1, value: 4, fmt: fmtS }, dvc);
    w.num("dvR", { label: "Release", min: .3, max: 40, log: true, value: 8, fmt: fmtS }, dvc);
    w.num("dvCut", { label: "Filter", min: 150, max: 8000, log: true, value: 1200, fmt: fmtHz }, dvc);
    w.num("dvLvl", { label: "Level", min: 0, max: 2, step: .01, value: 1, fmt: fmtPct }, dvc);
    var LT = [["off", "Off"], ["cutoff", "Drone filters"], ["scan", "Wavetable scan"], ["bright", "Brightness"], ["drone", "Drone level"], ["noise", "Noise level"], ["echo", "Echo send"], ["verb", "Reverb"], ["pan", "Drone-voice pan"]];
    var lf = el("details", "amb-nb amb-lfo"); lf.appendChild(el("summary", "", "LFOs: slow movement for filters, the wavetable scan and levels")); w.body.appendChild(lf);
    var lfoView = el("canvas", "sk-plot amb-lfov"); lfoView.setAttribute("aria-label", "The three LFOs over the last minute"); lf.appendChild(lfoView);
    [0, 1, 2].forEach(function (i) {
      var rowc = el("div", "sk-ctls amb-lfor"); rowc.appendChild(el("span", "amb-ltn", "LFO " + (i + 1))); lf.appendChild(rowc);
      w.pick("l" + i + "t", "Moves", LT, ["cutoff", "scan", "off"][i], rowc);
      w.pick("l" + i + "s", "Shape", [["sine", "Sine"], ["tri", "Triangle"], ["drift", "Drift (smooth random)"], ["ramp", "Rise"]], ["sine", "tri", "drift"][i], rowc);
      w.num("l" + i + "r", { label: "One cycle every", min: 2, max: 600, log: true, value: [40, 97, 230][i], fmt: function (v) { return v < 60 ? Math.round(v) + " s" : (v / 60).toFixed(1) + " min"; } }, rowc);
      w.num("l" + i + "d", { label: "Amount", min: 0, max: 1, step: .01, value: [.5, .6, .4][i], fmt: fmtPct }, rowc);
    });
    energyPanel(w);
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
      if (w.c.energy) w.c.energy.set(0);
      ["pace", "fb", "drive", "bright", "cymbals"].forEach(function (k) { if (!(k in p.set)) w.c[k].set({ pace: 1, fb: .4, drive: 0, bright: 18000, cymbals: 0 }[k]); });
      for (var k in p.set) if (w.c[k]) w.c[k].set(p.set[k]);
      if (p.color) w.c.color.set(p.color); w.c.swell.set(p.swell != null ? p.swell : .3); if (p.eq) w.setEq(p.eq);
      if (w.energy) w.energy.resetFrom(); if (run) run.rebuild();
    };
    w.presetList = AMB_PRESETS;
    takeUI(w, function () { return run; }); w.renderLoops();
    // ---- cued changes: with Changes = Cued, moving a control while it plays only marks it (the slider shows the new value, the
    // sound keeps the old); Go glides every cued setting there over the Transition time. Keys that rebuild the loops or swap
    // sounds (scale, key, instrument, drone type, loop count / lengths / notes / speed) change at the start of the glide.
    // Not cued: the noise EQ bands and colour, and the chime and cymbal checkboxes (they act at once).
    var live = {}, cued = {}, gliding = false, glideT = 0, STEP = ["key", "mode", "inst", "dtype", "loops", "spread", "density", "pace"];
    var cueBox = el("div", "amb-cue"); w.body.insertBefore(cueBox, w.ctls);
    w.pick("cue", "Changes", [["now", "Immediate"], ["cued", "Cued (press Go)"]], "now", cueBox, function (v) { if (v === "now") w.go(); });
    w.num("trans", { label: "Transition", min: 0, max: 120, step: .5, value: 8, fmt: fmtS }, cueBox);
    var stopBox = el("div", "amb-cue"); w.body.insertBefore(stopBox, w.ctls);
    w.pick("stopMode", "Stop", [["hard", "Hard stop"], ["fade", "Gradual stop"], ["ring", "Stop and ring"]], "hard", stopBox);
    w.num("stopT", { label: "Wind-down", min: 1, max: 180, log: true, value: 20, fmt: fmtS }, stopBox);
    var hardStop = w.stop;
    // Hard stop: everything at once. Gradual: everything winds down to silence over Wind-down, then the reverb and the rings run out
    // before it really stops. Stop and ring: no new sounds at once (the drone and noise fade in 2 s), the rings and the reverb play out.
    // Pressing ■ again while it winds down stops it at once.
    w.stop = function (force) { if (force === true || !run || run.stopping || w.P.stopMode === "hard") return hardStop.call(w); run.windDown(w.P.stopMode, w.P.stopT); };
    w.hardStop = function () { return hardStop.call(w); };
    var goB = button(cueBox, "Go", function () { w.go(); }, "btn-primary amb-go"), cancelB = button(cueBox, "Cancel", function () { w.cancelCue(); }, "btn-outline-secondary"), cueN = el("span", "amb-cue-n", ""); cueBox.appendChild(cueN);
    function label(k) { var c = w.c[k], l = c && c.el && c.el.querySelector(".sk-cl"); return l ? l.textContent : k; }
    function showCue() { var ks = Object.keys(cued), n = ks.length; cueN.textContent = gliding ? "moving…" : n ? n + (n === 1 ? " change" : " changes") + " cued: " + ks.map(label).join(", ") : ""; goB.disabled = !n; cancelB.disabled = !n; }
    showCue();
    w.cued = function () { return Object.assign({}, cued); };
    w.gliding = function () { return gliding; };
    w.go = function () {
      var ks = Object.keys(cued); if (!ks.length) return; var T = w.P.trans, from = {}, to = cued; cued = {};
      ks.forEach(function (k) { from[k] = live[k]; if (STEP.indexOf(k) >= 0 || typeof to[k] !== "number") { w.P[k] = live[k] = to[k]; realApply(k, to[k]); stepKey(k); } });
      var nums = ks.filter(function (k) { return STEP.indexOf(k) < 0 && typeof to[k] === "number"; });
      if (!nums.length || T <= 0) { nums.forEach(function (k) { w.P[k] = live[k] = to[k]; realApply(k, to[k]); }); showCue(); return; }
      var t0 = performance.now(); gliding = true; showCue(); clearInterval(glideT);
      glideT = setInterval(function () {
        var f = Math.min(1, (performance.now() - t0) / (T * 1000)), e = f * f * (3 - 2 * f);   // ease in and out
        nums.forEach(function (k) { var a = from[k], b = to[k], v = k === "bright" ? a * Math.pow(b / a, e) : a + (b - a) * e; w.P[k] = live[k] = v; realApply(k, v); });
        if (f >= 1) { clearInterval(glideT); gliding = false; showCue(); }
      }, 100);
    };
    w.cancelCue = function () { var ks = Object.keys(cued); cued = {}; ks.forEach(function (k) { var c = w.c[k]; if (c && c.set) c.set(live[k]); w.P[k] = live[k]; }); showCue(); };
    function stepKey(k) { if (!run) return; if (k === "key" || k === "mode" || k === "dtype") run.retune(); else if (k === "inst") run.inst(); else run.rebuildSoon(); }
    w.apply = function (k, v) {
      if (k === "cue" || k === "trans" || k === "stopMode" || k === "stopT" || /^(l\d[tsrd]|dv\w+|oct|btype)$/.test(k)) return;
      if (w.P.cue === "cued" && run && !gliding && k in live) { cued[k] = v; w.P[k] = live[k]; showCue(); return; }
      live[k] = v; realApply(k, v);
    };
    var realApply = function (k, v) {
      if (!run) return; if (w.take && w.take.on) w.take.change(k, v); var t = SK.ac().currentTime;
      if (k === "drone") run.droneG.gain.setTargetAtTime(v * .5, t, .3);
      if (k === "noise") run.noiseG.gain.setTargetAtTime(v, t, .3);
      if (k === "verb") { run.wet.gain.setTargetAtTime(v * 1.4, t, .2); run.dry.gain.setTargetAtTime(1 - v * .6, t, .2); }
      if (k === "decay") run.rev.set({ decay: v });
      if (k === "echo") run.echoG.gain.setTargetAtTime(v, t, .2);
      if (k === "fb") run.setFb(v);
      if (k === "drive") run.setDrive(v);
      if (k === "bright") run.mlp.frequency.setTargetAtTime(v, t, .15);
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
        var len = (base + w.P.spread * (i * 2.37 + R() * 1.9) * (i % 2 ? 1.3 : 1)) / (w.P.pace || 1), n = Math.max(1, Math.round(w.P.density * (1 + R() * 1.6))), ev = [];
        for (var j = 0; j < n; j++) ev.push({ at: (j + R() * .6) * len / n, m: notes[Math.floor(R() * notes.length)], v: .45 + R() * .35 });
        L.push({ len: len, ev: ev });
      }
      return L;
    }
    w.onStart = function (c, out) {
      live = {}; Object.keys(w.P).forEach(function (k) { if (typeof w.P[k] !== "object") live[k] = w.P[k]; }); cued = {}; setTimeout(showCue, 0);
      var bus = c.createGain(), dry = c.createGain(), wet = c.createGain(), echoG = c.createGain(), droneG = c.createGain(), noiseG = c.createGain(), comp = c.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = .05; comp.release.value = .5; 
      // energy's parts: drive (tanh, harder as it rises, level kept roughly even), a master low-pass (Brightness) and a limiter, so
      // high feedback and drive can pile up without running away
      var src = c.createGain(), drv = c.createWaveShaper(), dmk = c.createGain(), mlp = c.createBiquadFilter(), lim = c.createDynamicsCompressor();
      mlp.type = "lowpass"; mlp.Q.value = -3; mlp.frequency.value = w.P.bright; lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .003; lim.release.value = .25;
      comp.connect(mlp); mlp.connect(lim); lim.connect(out);
      function setDrive(v) { var k = 1 + v * 14, n = 2049, a = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; a[i] = v < .01 ? x : Math.tanh(k * x) / Math.tanh(k); } drv.curve = a; drv.oversample = "4x"; dmk.gain.setTargetAtTime(1 / (1 + v * 2.2), c.currentTime, .1); }
      var notesB = c.createGain(), chimeB = c.createGain(), cymB = c.createGain(); [notesB, chimeB, cymB].forEach(function (g) { g.connect(src); });
      setDrive(w.P.drive); src.connect(drv); drv.connect(dmk); dmk.connect(bus);
      var rev = SK.fx("reverb", c, { decay: w.P.decay, pre: 40, damp: 5000, early: .2, size: 1 }), dP = { time: 1700, fb: w.P.fb, tone: 1800, wow: .5, pp: "1" }, dly = SK.fx("delay", c, dP), ehp = c.createBiquadFilter();
      ehp.type = "highpass"; ehp.frequency.value = 150;   // long, dark echoes (Frippertronics-like); the right line repeats later (2.3 s) so they blur rather than tick
      if (dly.n && dly.n.lines[1]) dly.n.lines[1].d.delayTime.value = 2.3;
      bus.connect(dry); dry.connect(comp); bus.connect(rev.input); rev.output.connect(wet); wet.connect(comp); bus.connect(ehp); ehp.connect(echoG); echoG.connect(dly.input); dly.output.connect(rev.input); dly.output.connect(comp);
      dry.gain.value = 1 - w.P.verb * .6; wet.gain.value = w.P.verb * 1.4; echoG.gain.value = w.P.echo; droneG.gain.value = w.P.drone * .5; noiseG.gain.value = w.P.noise;
      droneG.connect(src);
      function setFb(v) { dly.set({ fb: v }); } noiseG.connect(src);   // the noise bed goes through Drive too (Energy turns it into grit)
      var bed = noiseBed(c, noiseG, w.P), bank = null, dead = false, t0 = c.currentTime + .3, loops = makeLoops(), drone = [];
      // the drone: root and fifth (and the octave), three detuned saws each through a slowly opening and closing low-pass
      function droneOn() {
        drone.forEach(function (d) { d.g.gain.setTargetAtTime(0, c.currentTime, 1.5); setTimeout(function () { d.stop(); }, 6000); }); drone = []; pad = null;
        var root = 41 + ((+w.P.key - 5 + 12) % 12);
        if (w.P.dtype === "pad" && SK.wtFrames) return padOn(root);
        [[root, .5], [root + 7, .3], [root + 12, .2]].forEach(function (p, i) {
          var g = c.createGain(), lp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain(), os = [];
          lp.type = "lowpass"; lp.frequency.value = 500; lp.Q.value = .5; var lpBase = 500; lfo.frequency.value = .03 + i * .017; lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
          [-9, 0, 8].forEach(function (dt) { var o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(p[0]); o.detune.value = dt; o.connect(lp); o.start(); os.push(o); });
          g.gain.setValueAtTime(0, c.currentTime); g.gain.setTargetAtTime(p[1] * .12, c.currentTime, 2); lp.connect(g); g.connect(droneG);
          drone.push({ g: g, lp: lp, base: lpBase, stop: function () { os.concat([lfo]).forEach(function (o) { try { o.stop(); } catch (e) {} }); g.disconnect(); } });
        });
      }
      // the wavetable pad: each drone note on four frames of the site's wavetable (Vital's idea: a wave that slowly turns into
      // another), cross-faded by the scheduler tick along a slow position that never quite repeats
      var pad = null, scanOff = 0;
      function padOn(root) {
        var fr = SK.wtFrames(), pick = [0, 1, 4, 6].map(function (i) { return Math.min(i, fr.length - 1); }), all = [];
        var waves = pick.map(function (i) { return c.createPeriodicWave(new Float32Array(fr[i][1].length), fr[i][1]); });
        [[root, .5], [root + 7, .3], [root + 12, .2], [root + 19, .08]].forEach(function (p, j) {
          var g = c.createGain(), lp = c.createBiquadFilter(), gs = [];
          lp.type = "lowpass"; lp.frequency.value = 1400; lp.Q.value = .3;
          waves.forEach(function (wv, k) { var o = c.createOscillator(), og = c.createGain(); o.setPeriodicWave(wv); o.frequency.value = mtof(p[0]); o.detune.value = (k - 1.5) * 4 + j;
            og.gain.value = k ? 0 : 1; o.connect(og); og.connect(lp); o.start(); all.push(o); gs.push(og); });
          g.gain.setValueAtTime(0, c.currentTime); g.gain.setTargetAtTime(p[1] * .16, c.currentTime, 3); lp.connect(g); g.connect(droneG);
          drone.push({ g: g, gs: gs, lp: lp, base: 1400, ph: j * 1.7, stop: function () { all.forEach(function (o) { try { o.stop(); } catch (e) {} }); g.disconnect(); } });
        });
        pad = true;
      }
      function padScan(now) {
        drone.forEach(function (d) { if (!d.gs) return;
          var pos = Math.max(0, Math.min(3, 1.5 + 1.5 * Math.sin(now * .021 + d.ph) * Math.cos(now * .0067 + d.ph * .5) + scanOff));   // 0..3 across the four frames; the LFOs aimed at the scan add scanOff
          d.gs.forEach(function (g, k) { g.gain.setTargetAtTime(Math.max(0, 1 - Math.abs(pos - k)), now, .3); }); });
      }
      droneOn();
      var SAMPLED = { piano: 1, rhodes: 1, flute: 1 };
      function instOf(li) { var x = w.P.loopInst[li]; return x && x !== "same" ? x : w.P.inst; }
      function useBank() { var want = []; for (var i = 0; i < 9; i++) { var x = instOf(i); if (SAMPLED[x] && want.indexOf(x) < 0) want.push(x); } if (!want.length) return;
        loadBank(c).then(function (b) { return b.load(want).then(function () { if (!dead) bank = b; }); }).catch(function () {}); }
      useBank();
      function play(e, t, li) {
        var inst = instOf(li), m = e.m + 12 * ((w.P.oct || 0) + (w.P.loopOct[li] || 0)); if (w.take && w.take.on) w.take.note(li, m, e.v, t, inst); e.lit = t;
        if (inst === "dvoice") return droneVoice(m, t, e.v);
        if (VOICES[inst]) { var V = VOICES[inst]; return V.play(c, notesB, m + V.oct, t, e.v, w.P); }
        if (SAMPLED[inst] && bank && bank.has(inst)) return bank.play(inst, { midi: m, vel: e.v, dur: inst === "flute" ? 3 : 4 }, t, notesB);
        bell(c, notesB, m, t, e.v, 7); }
      // the drone voice: the drone's sound (detuned saws, or the scanned wavetable) as a note with its own attack, hold and release,
      // through a low-pass the LFOs can move; panned by the LFO aimed at "Drone-voice pan"
      var dvs = [], dvWaves = null;
      function droneVoice(m, t, v) {
        var A = w.P.dvA, H = w.P.dvH, R = w.P.dvR, g = c.createGain(), lp = c.createBiquadFilter(), pn = c.createStereoPanner(), os = [], f = mtof(m), lvl = v * .09 * w.P.dvLvl;
        lp.type = "lowpass"; lp.Q.value = .4; lp.frequency.value = w.P.dvCut; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + A); g.gain.setValueAtTime(lvl, t + A + H); g.gain.setTargetAtTime(0, t + A + H, R / 4.6);
        if (w.P.dvWave === "pad" && SK.wtFrames) { if (!dvWaves) { var fr = SK.wtFrames(); dvWaves = [1, 4].map(function (i) { var x = fr[Math.min(i, fr.length - 1)][1]; return c.createPeriodicWave(new Float32Array(x.length), x); }); }
          dvWaves.forEach(function (wv, k) { var o = c.createOscillator(); o.setPeriodicWave(wv); o.frequency.value = f; o.detune.value = k ? 5 : -5; o.connect(lp); os.push(o); }); }
        else [-8, 0, 7].forEach(function (dt) { var o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = dt; o.connect(lp); os.push(o); });
        lp.connect(g); g.connect(pn); pn.connect(notesB); var end = t + A + H + R * 1.5 + .1; os.forEach(function (o) { o.start(t); o.stop(end); });
        var d = { lp: lp, pn: pn, end: end }; dvs.push(d); os[0].onended = function () { dvs.splice(dvs.indexOf(d), 1); try { pn.disconnect(); } catch (x) {} };
      }
      // ---- the LFOs (after Vital's): each a slow shape aimed at one target; several can aim at the same one and add up
      var lph = [Math.random(), Math.random(), Math.random()], ldr = [[0, Math.random() * 2 - 1, Math.random() * 2 - 1], [0, Math.random() * 2 - 1, Math.random() * 2 - 1], [0, Math.random() * 2 - 1, Math.random() * 2 - 1]], lastT = c.currentTime, lhist = [];
      function lfoVal(i) { var ph = lph[i], sh = w.P["l" + i + "s"];
        if (sh === "tri") return 1 - 4 * Math.abs(ph - .5); if (sh === "ramp") return ph * 2 - 1;
        if (sh === "drift") { var a = ldr[i][1], b = ldr[i][2], x = ph * ph * (3 - 2 * ph); return a + (b - a) * x; }
        return Math.sin(2 * Math.PI * ph); }
      function lfos(now) {
        var dt = Math.max(0, now - lastT); lastT = now; var mod = {}, vals = [];
        for (var i = 0; i < 3; i++) { lph[i] += dt / Math.max(1, w.P["l" + i + "r"]); if (lph[i] >= 1) { lph[i] -= 1; ldr[i] = [0, ldr[i][2], Math.random() * 2 - 1]; }
          var v = lfoVal(i); vals.push(v); var tg = w.P["l" + i + "t"]; if (tg && tg !== "off") mod[tg] = (mod[tg] || 0) + v * w.P["l" + i + "d"]; }
        lhist.push(vals); if (lhist.length > 1200) lhist.shift();
        var tt = now, ex = function (m) { return Math.pow(2, 2.5 * (m || 0)); };
        drone.forEach(function (d) { if (d.lp) d.lp.frequency.setTargetAtTime(d.base * ex(mod.cutoff), tt, .2); });
        dvs.forEach(function (d) { d.lp.frequency.setTargetAtTime(w.P.dvCut * ex(mod.cutoff), tt, .2); d.pn.pan.setTargetAtTime(Math.max(-1, Math.min(1, mod.pan || 0)), tt, .3); });
        scanOff = (mod.scan || 0) * 1.5;
        if ("bright" in mod) mlp.frequency.setTargetAtTime(Math.max(120, Math.min(20000, w.P.bright * ex(mod.bright))), tt, .2);
        if (!run || !run.stopping) {
          if ("drone" in mod) droneG.gain.setTargetAtTime(Math.max(0, w.P.drone * .5 * (1 + mod.drone)), tt, .3);
          if ("noise" in mod) noiseG.gain.setTargetAtTime(Math.max(0, w.P.noise * (1 + mod.noise)), tt, .3);
        }
        if ("echo" in mod) echoG.gain.setTargetAtTime(Math.max(0, w.P.echo * (1 + mod.echo)), tt, .3);
        if ("verb" in mod) wet.gain.setTargetAtTime(Math.max(0, w.P.verb * 1.4 * (1 + mod.verb)), tt, .3);
        if (lf.open && lhist.length % 4 === 0) drawLfos();
      }
      function drawLfos() {
        var r = window.devicePixelRatio || 1, W = lfoView.clientWidth, H = lfoView.clientHeight; if (!W) return; if (lfoView.width !== W * r) { lfoView.width = W * r; lfoView.height = H * r; }
        var g = lfoView.getContext("2d"), cs = getComputedStyle(document.body), cols = [cs.getPropertyValue("--site-accent") || "#3fc2b4", cs.getPropertyValue("--site-accent-dk") || "#2a8", cs.getPropertyValue("--site-ink-2") || "#888"];
        g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H);
        for (var i = 0; i < 3; i++) { if (w.P["l" + i + "t"] === "off") continue; g.strokeStyle = cols[i]; g.lineWidth = 1.6; g.beginPath();
          lhist.forEach(function (v, k) { var x = W * k / 1199, y = H / 2 - v[i] * w.P["l" + i + "d"] * (H / 2 - 4); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
        g.fillStyle = cols[2]; g.font = "11px sans-serif"; g.fillText("the last minute", 6, H - 6);
      }
      // the scheduler: each loop's next note time is worked out from t0 and the loop's own length
      var next = loops.map(function () { return 0; }), cyc = loops.map(function () { return 0; });
      // wind chimes: now and then a gust sets the modelled tubes ringing, a handful of strikes over a few seconds; how often follows the slider.
      // The tubes are tuned to the key: the longest tube is the key's note nearest "Longest tube".
      var nextGust = c.currentTime + 4;
      function gust(now) {
        if (w.P.chimes < .02) { nextGust = now + 2; return; } if (now < nextGust) return;
        nextGust = now + (8 + Math.random() * 30) * (1.15 - w.P.chimes);
        var set = String(w.P.chTune || "0,2,4,7,9").split(",").map(Number), key = (+w.P.key - 5 + 12) % 12, low = w.P.chLow - ((w.P.chLow - key) % 12 + 12) % 12;
        var tt = now + .05, end = now + 2 + Math.random() * 5 * (.5 + w.P.chimes), lvl = (.25 + .35 * w.P.chimes) * w.P.chLevel;
        while (tt < end) { var m = low + set[Math.floor(Math.random() * set.length)], pn = c.createStereoPanner(); pn.pan.value = (Math.random() * 2 - 1) * w.P.chWidth; pn.connect(chimeB);
          MODAL.chime(c, pn, mtof(m), tt, lvl * (.35 + .65 * Math.random()), w.P.chHard, w.P.chRing); (function (p, d) { setTimeout(function () { try { p.disconnect(); } catch (x) {} }, d); })(pn, (tt - now + 60) * 1000);
          if (w.take && w.take.on) w.take.event("chime", "tube " + m, { playbackRate: { value: 1 } }, pn); tt += (.15 + Math.random() * 1.1) / (.4 + w.P.chimes); }
      }
      // cymbal swells: a recorded crash played backwards (it rises into the hit) or forwards, now and then; from the Drum Kits' recordings
      var nextCym = c.currentTime + 3, cymRev = {};
      function cymbal(now) {
        if (w.P.cymbals < .02 || now < nextCym) return; nextCym = now + (5 + Math.random() * 18) * (1.1 - w.P.cymbals);
        var set = w.P.cymSet && w.P.cymSet.length ? w.P.cymSet : null; if (!set) return;
        var name = set[Math.floor(Math.random() * set.length)] + "-" + (1 + Math.floor(Math.random() * 3));
        var get = cymRev[name] || (cymRev[name] = fetch("/apps/shared/lessons/cymbal-samples/" + name + ".m4a").then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
          .then(function (a) { return new Promise(function (res, rej) { c.decodeAudioData(a, res, rej); }); })
          .then(function (b) { var r2 = c.createBuffer(b.numberOfChannels, b.length, b.sampleRate); for (var ch = 0; ch < b.numberOfChannels; ch++) { var d = b.getChannelData(ch), o = r2.getChannelData(ch); for (var i = 0; i < d.length; i++) o[i] = d[d.length - 1 - i]; } return [b, r2]; }));
        get.then(function (pair) { if (dead) return; var s = c.createBufferSource(), g = c.createGain(), pn = c.createStereoPanner();
          s.buffer = pair[Math.random() < w.P.cyRev ? 1 : 0]; s.playbackRate.value = Math.max(.1, w.P.cySpeed * (1 + (Math.random() * 2 - 1) * w.P.cyVary)); pn.pan.value = (Math.random() * 2 - 1) * w.P.cyWidth; g.gain.value = (.2 + .4 * w.P.cymbals) * w.P.cyLevel;
          s.connect(g); g.connect(pn); pn.connect(cymB); s.start(); if (w.take && w.take.on) w.take.event(s.buffer === pair[1] ? "cymbal (backwards)" : "cymbal", name, s, pn); s.onended = function () { pn.disconnect(); }; }).catch(function () {});
      }
      function tick() {
        if (dead) return; var now = c.currentTime; lfos(now); if (pad) padScan(now); if (quiet) return; gust(now); cymbal(now);
        loops.forEach(function (L, i) {
          for (;;) { var e = L.ev[next[i]], t = t0 + cyc[i] * L.len + e.at; if (t > now + .2) break; if (t >= now - .05) play(e, t, i); next[i]++; if (next[i] >= L.ev.length) { next[i] = 0; cyc[i]++; } }
        });
      }
      var iv = setInterval(tick, 50); tick();
      var rbT = 0;
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
      // ---- stopping gently
      var quiet = false, an2 = c.createAnalyser(); an2.fftSize = 2048; lim.connect(an2);
      function windDown(mode, T) {
        run.stopping = mode; var now = c.currentTime; w.playBtn.textContent = mode === "fade" ? "■ Winding down… (stop now)" : "■ Ringing out… (stop now)";
        if (mode === "fade") { src.gain.setValueAtTime(src.gain.value, now); src.gain.linearRampToValueAtTime(0, now + T); setTimeout(function () { quiet = true; waitSilence(); }, T * 1000); }
        else { quiet = true; [droneG, noiseG].forEach(function (g) { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 2); }); setTimeout(waitSilence, 2200); }
      }
      function waitSilence() {   // the reverb and the rings run out: stop when the output has stayed below -80 dB for a second (at most 5 minutes)
        var buf = new Float32Array(an2.fftSize), calm = 0, t0w = Date.now(), iv2 = setInterval(function () {
          if (dead) return clearInterval(iv2); an2.getFloatTimeDomainData(buf); var sq = 0; for (var i = 0; i < buf.length; i++) sq += buf[i] * buf[i];
          calm = Math.sqrt(sq / buf.length) < 1e-4 ? calm + 1 : 0; if (calm >= 4 || Date.now() - t0w > 300000) { clearInterval(iv2); w.hardStop(); } }, 250);
      }
      var take = null;
      function taps() { return [["Master (as heard)", lim], ["Loop notes", notesB], ["Wind chimes", chimeB], ["Cymbal swells", cymB], ["Drone", droneG], ["Noise bed", noiseG], ["Reverb return", rev.output], ["Echo return", dly.output]]; }
      run = { windDown: windDown, stopping: false, taps: taps, setTake: function (t) { take = t; }, loopsNow: function () { return loops; }, ctx: c, bed: bed, dry: dry, wet: wet, echoG: echoG, droneG: droneG, noiseG: noiseG, rev: rev,
        rebuild: rebuild, rebuildSoon: function () { clearTimeout(rbT); rbT = setTimeout(function () { if (!dead) rebuild(); }, 400); }, setFb: setFb, setDrive: setDrive, mlp: mlp, retune: function () { droneOn(); rebuild(); }, inst: useBank };
      return function () {
        if (w.take && w.take.on) w.take.finish();
        dead = true; clearInterval(iv); cancelAnimationFrame(raf); run = null; bed.stop(); drone.forEach(function (d) { d.stop(); }); if (bank && bank.stopAll) bank.stopAll();
        setTimeout(function () { rev.stop(); dly.stop(); try { comp.disconnect(); } catch (e) {} }, 300);
      };
    };
    return w;
  }

  // ---- the models on their own: <div class="sk" data-w="modal"> strike a church bell, a chime tube or a bass bar, or let it play
  // (bell: tolls; chimes: gusts on a pentatonic set; bars: a bass ostinato)
  function Modal(host) {
    var w = K.Base(host, "Bells, chimes and bass bars (models)"), out = null, iv = 0;
    w.knobView && w.knobView();
    w.pick("model", "Instrument", [["bell", "Church bell (in progress)"], ["kbell", "Korean temple bell"], ["jbell", "Japanese temple bell"], ["vbell", "Vietnamese temple bell (for now, the Japanese model)"], ["chime", "Chime tube"], ["mbar", "Bass metal bar"], ["wbar", "Bass wooden bar"]], "chime");
    w.num("note", { label: "Note", min: 24, max: 72, step: 1, value: 45, fmt: function (v) { return ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][v % 12] + (Math.floor(v / 12) - 1) + " (" + Math.round(mtof(v)) + " Hz)"; } });
    w.num("hard", { label: "Strike", min: 0, max: 1, step: .01, value: .4, fmt: function (v) { return v < .3 ? "soft" : v < .7 ? "medium" : "hard"; } });
    w.num("ring", { label: "Ring length", min: .3, max: 2.5, step: .01, value: 1, fmt: function (v) { return "x" + v.toFixed(2); } });
    w.pick("btype", "Church bell type", [["westminster", "Westminster Abbey tenor (tuned)"], ["taylor", "Taylor, 1980s"], ["eijsbouts", "Eijsbouts carillon, 1955"], ["both", "Thomas Both, 1591"], ["ghein", "van den Ghein, 1615"], ["bourlet", "Bourlet, 1679"], ["mears", "Mears, 1859 (old style)"]], "westminster");
    w.num("beat", { label: "Temple-bell beat", min: 0, max: 1, step: .01, value: .5, fmt: function (v) { return v < .2 ? "faint (listener in line with the strike)" : v < .7 ? "clear" : "deep"; } });
    w.P.level = 1;
    function strike(c, o, m, t, v) { var f = mtof(m), P = w.P;
      var BT = { bell: "w-" + (w.P.btype || "westminster"), kbell: "korean", jbell: "japanese", vbell: "vietnamese" };
      if (BT[P.model]) MODAL.bell(c, o, f, t, v, P.hard, null, BT[P.model], P.beat); else if (P.model === "chime") MODAL.chime(c, o, f, t, v, P.hard, P.ring); else MODAL.bar(c, o, f, t, v, P.model === "mbar", P.hard, P.ring); }
    button(w.tools, "Strike", function () { if (!w.running) w.start(); setTimeout(function () { if (out) strike(SK.ac(), out, w.P.note, SK.ac().currentTime + .02, 1); }, 60); }, "btn-outline-primary");
    w.view = K.viewer(w.body, { ms: 20 });
    w.onStart = function (c, o) {
      out = c.createGain(); out.gain.value = .9; out.connect(o); var next = c.currentTime + .1, i = 0;
      iv = setInterval(function () { var now = c.currentTime, P = w.P; if (now + .3 < next) return;
        if (/bell/.test(P.model)) { strike(c, out, P.note, next, .8 + .2 * Math.random()); next += P.model === "bell" ? 3.2 : 12; }
        else if (P.model === "chime") { var set = [0, 2, 4, 7, 9]; strike(c, out, P.note + set[Math.floor(Math.random() * 5)], next, .35 + .65 * Math.random()); next += .15 + Math.random() * 1.2; }
        else { var seq = [0, 7, 12, 7, 0, 5, 10, 5]; strike(c, out, P.note - 12 + seq[i++ % 8], next, i % 4 === 1 ? 1 : .75); next += .6; } }, 50);
      return function () { clearInterval(iv); var g = out; out = null; setTimeout(function () { try { g.disconnect(); } catch (e) {} }, 8000); };
    };
    return w;
  }

  var css = document.createElement("style");
  css.textContent = ".amb-eq{display:grid;grid-template-columns:repeat(10,minmax(2.2rem,1fr));gap:2px;max-width:560px;margin:.4rem 0}" +
    ".amb-band{display:flex;flex-direction:column;align-items:center;font-family:var(--font-mono);font-size:.7rem;margin:0}" +
    ".amb-band input{writing-mode:vertical-lr;direction:rtl;height:120px;width:22px;accent-color:var(--site-accent-dk)}" +
    ".amb-band .amb-bf{color:var(--site-ink-2)}.amb-nb{margin:.4rem 0}.amb-nb summary{cursor:pointer;font-family:var(--font-display)}" +
    ".sk-plot.amb-rings{height:260px;max-width:420px}" +
    ".amb-ltb{display:grid;gap:.25rem;margin:.3rem 0}.amb-ltr{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;font-size:.85rem}.amb-ltn{font-family:var(--font-mono);font-size:.8rem;min-width:4.5rem}" +
    ".amb-lfor{align-items:center;border-top:1px solid var(--site-rule,#ddd);padding-top:.3rem}.sk-plot.amb-lfov{height:90px;max-width:560px}" +
    ".amb-take{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.3rem 0}.amb-take-n{font-size:.82rem;color:var(--site-ink-2)}" +
    ".amb-cue{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.3rem 0}.amb-cue .sk-c{min-width:12rem}.amb-cue-n{font-size:.82rem;color:var(--site-ink-2)}" +
    ".amb-ck{display:flex;flex-wrap:wrap;gap:.2rem 1rem;font-size:.85rem;margin:.3rem 0}" +
    ".amb-en{margin:.5rem 0}.amb-en summary{cursor:pointer;font-family:var(--font-display)}.amb-en-knob .sk-cl{font-weight:700}" +
    ".amb-en-t{border-collapse:collapse;font-size:.82rem;margin:.3rem 0}.amb-en-t th,.amb-en-t td{padding:2px 6px;text-align:left}" +
    ".amb-en-n{width:5.5em;font-family:var(--font-mono);font-size:.8rem}" +
    ".amb-en-bar{display:inline-block;width:90px;height:8px;border:1px solid var(--site-ink-2);border-radius:4px;overflow:hidden;vertical-align:middle}" +
    ".amb-en-bar span{display:block;height:100%;background:var(--site-accent);transition:width .1s}";
  document.head.appendChild(css);
  SK.kinds.noiseeq = NoiseEq; SK.kinds.ambient = Ambient; SK.kinds.modal = Modal;
})();
