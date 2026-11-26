// Mics: studio and stage microphones the way the site does amps and pedals. A model of each mic (pure maths, runs in node:
// tests/lessons/mics.test.js), a faithful drawing of each body and its switches (FaithfulPanel host adapter, panels/mic-<id>.js),
// a placement widget (distance, angle, room) on the band's sounds, A/B of two mics, and translation of a placement between mics.
// Pages: lessons/mic-compare.qmd, lessons/intro-<mic>.qmd (scripts/intro-instruments/mics.py). Ideas from rec-kit-mic.js (the
// recording lessons' polar / proximity / offaxis / ampmic widgets); no code shared with it.
//
// THE MODEL (one response H(f) per placement; the sound = the source through H, plus the room, plus self-noise)
//   on-axis curve  points [Hz, dB] per mic. DIGITISED APPROXIMATELY: the makers' charts are images the site could not read as data;
//          these points follow the published chart SHAPES as remembered (presence rise, bass roll-off), with the makers' printed range
//          ends (Shure: "presence rise", "brightened midrange and bass rolloff"; Neumann: "remarkably flat"). Every point: unverified.
//   pattern  first-order: P(θ) = a + (1 - a) cos θ (Wikipedia, "Microphone": the cardioid = omni + figure-8 summed, the figure-8's
//          negative rear signal cancelling the omni's). a = 1 omni, 0.5 cardioid, 0.37 supercardioid, 0 figure-8. Real mics widen
//          at low frequencies and narrow at high: a(f) drifts toward omni below ~150 Hz (site's) and the diaphragm's size beams the
//          top (an extra off-axis loss rising above fd, the site's per-mic corner).
//   figure-8 rear lobe  P < 0 behind: the rear signal is INVERTED (Wikipedia, "Microphone"). Kept as a sign on H, so two mics summed
//          (A+B) cancel when one hears the source from behind. Royer R-121: rear side brighter close up (royerlabs.com, R-121 page;
//          the amount here, +2 dB above 4 kHz inside 0.75 m, is the site's).
//   proximity  the gradient part of a spherical wave grows as 1 + 1/(jkr) (k = 2πf/c): bass rises as the source comes closer, for
//          every directional pattern, none for a true omni (Wikipedia, "Proximity effect (audio)"; it notes the U 87's summed-cardioid
//          "omni" is not fully free of it: here 5 % gradient, the site's). the distance is taken as sqrt(r² + 1.5 cm²) (a mouth or a drum head is not a point): site's.
//   level   SPL at the mic = source level at 1 m - 20 log10(r) (source levels the site's round figures). Output = sensitivity (dBV/Pa,
//          spec sheets) + SPL - 94. Self-noise: condensers' A-weighted equivalent noise (Neumann's figures); dynamics and ribbons
//          have no published figure, here the thermal noise of their output impedance (300 Ω, 20 kHz band) referred through the
//          sensitivity (the site's estimate). Max SPL (spec): above it the model clips softly. Pad: lowers the level and raises max SPL.
//   switches  U 87 Ai: pattern (omni / cardioid / figure-8), pad and low-cut (Neumann: "switchable low cut and pad"; pad 10 dB is
//          inferred from max SPL 117 -> 127 dB; the low-cut corner and slope are the site's). MD 421: five-position bass roll-off,
//          M (music) to S (speech) (Wikipedia; the step amounts the site's).
//   room    "dead" / "room" / "hall": a diffuse field the same at any distance, picked up in proportion to the pattern's random-energy
//          efficiency a² + (1-a)²/3 (omni 1, cardioid 1/3, figure-8 1/3; the standard first-order result), through a small
//          feedback-delay reverb. Levels and times: site's.
//   Not modelled: phase of the curve (linear-phase filter), capsule resonances beyond the curve points, handling noise, pops, the
//   transformer, tube or FET colour. Nobody has compared the sound with the real mics.
//
// API
//   Mics.MICS[id] { name, short, maker, year, type, patterns {name: a}, curve [[f,dB]], fd, sens {pattern: dBV}, noise, maxSPL,
//                   controls [[key, label, "c"|"s", values|false, ...]] }   Mics.IDS
//   Mics.defaults(id), .clean(id, st)   st = { pattern, pad, lowcut, bass }
//   Mics.H(id, st, pl, f) -> signed linear gain (pl = { dist m, angle deg, rear: true = the source behind })   .db(id, st, pl, f)
//   Mics.prox(a, r, f) -> dB of proximity boost for pattern a at r metres   .patternAt(id, st, f, deg) -> signed P
//   Mics.level(id, st, pl, src) -> { spl, out dBV, noise dB SPL-A, snr, headroom }
//   Mics.render(id, st, pl, x, sr, o) -> Float32Array   (o: { src: source key, room: "dead"|"room"|"hall", noRoom, noNoise })
//   Mics.translate(fromId, st, pl, toId) -> { state, place, quality "exact"|"approx"|"lost", notes, dist }
//   Mics.synth(kind, sr) -> a generated source (voice, guitar, snare, kick) for node / fallback
//   Browser: Mics.adapter(W), Mics.mount(el, {mic, choose}), Mics.compare(el), Mics.play(...), Mics.source(kind) -> Promise(buffer)
//   Page markup: <div class="mic" data-mic="sm57"></div>  <div class="micc" data-a="sm57" data-b="u87"></div>
//     <div class="mic-step" data-mic="u87" data-set='{"pattern":"fig8"}' data-place='{"dist":0.3,"angle":180}' data-src="voice">text</div>
//     <div class="mic-q" data-a="1">...</div>  <div class="mic-tracks" data-mic="sm57"></div>
//   Sources: voice (generated: the band has no singer), guitar amp (Amps.render when amps.js is on the page), snare and kick (the
//   band's kit samples through BandSounds in an OfflineAudioContext; generated if they do not load).
(function (global) {
  var M = {}, TAU = 2 * Math.PI, C = 343;
  var CARD = 0.5, R0 = 0.015;   // R0: the source is not a point (a mouth, a drum head): distance measured as sqrt(r² + R0²), site's
  M.MICS = {
    sm57: { name: "Shure SM57", short: "SM57", maker: "Shure", year: 1965, type: "dynamic", patterns: { cardioid: CARD }, fd: 9000,
      curve: [[20, -24], [40, -12], [60, -7], [100, -3.5], [200, -1], [500, 0], [1000, 0], [2000, 1], [3000, 2.5], [4500, 4.5], [6000, 5], [7500, 3], [9000, 1], [11000, -1], [13000, -5], [15000, -10], [20000, -22]],
      sens: { cardioid: -56.0 }, noise: null, maxSPL: null, z: 300, range: "40-15,000 Hz", controls: [] },
    sm58: { name: "Shure SM58", short: "SM58", maker: "Shure", year: 1966, type: "dynamic", patterns: { cardioid: CARD }, fd: 8000,
      curve: [[20, -26], [50, -10], [80, -5], [150, -1.5], [300, 0], [1000, 0], [2000, 1.5], [3000, 3], [4500, 4], [6000, 3.5], [8000, 1.5], [10000, 0], [12000, -3], [15000, -10], [20000, -22]],
      sens: { cardioid: -54.5 }, noise: null, maxSPL: null, z: 300, range: "50-15,000 Hz", controls: [] },
    u87: { name: "Neumann U 87 Ai", short: "U 87", maker: "Neumann", year: 1986, type: "condenser", patterns: { omni: 1, cardioid: CARD, fig8: 0 }, omniGrad: 0.05, fd: 4500,
      curve: [[20, -4], [30, -1.5], [40, -0.5], [100, 0], [1000, 0], [3000, 0.5], [6000, 1.5], [9000, 2.5], [12000, 1], [16000, -2], [20000, -6]],
      sens: { omni: 20 * Math.log10(0.020), cardioid: 20 * Math.log10(0.028), fig8: 20 * Math.log10(0.022) }, noise: { omni: 15, cardioid: 12, fig8: 14 }, maxSPL: 117, padDb: 10, range: "20-20,000 Hz",
      controls: [["pattern", "Pattern", "c", ["omni", "cardioid", "fig8"], null, null, "cardioid"], ["pad", "Pad -10 dB", "s", false, true, null, false], ["lowcut", "Low cut", "s", false, true, null, false]] },
    r121: { name: "Royer R-121", short: "R-121", maker: "Royer Labs", year: 1998, type: "ribbon", patterns: { fig8: 0 }, fd: 7000, rearBright: 2,
      curve: [[20, -6], [30, -3], [50, -1], [100, 0], [1000, 0], [3000, -0.5], [6000, -1.5], [9000, -3], [12000, -5], [15000, -8], [20000, -16]],
      sens: { fig8: -47 }, noise: null, maxSPL: 135, z: 300, range: "30-15,000 Hz ±3 dB", controls: [] },
    md421: { name: "Sennheiser MD 421", short: "MD 421", maker: "Sennheiser", year: 1960, type: "dynamic", patterns: { cardioid: CARD }, fd: 6500,
      curve: [[20, -14], [30, -6], [50, -2], [100, 0], [1000, 0], [2000, 1], [3500, 3], [5000, 4], [7000, 2.5], [10000, 0], [13000, -3], [17000, -8], [20000, -16]],
      sens: { cardioid: -54 }, sensGuess: true, noise: null, maxSPL: null, z: 300, range: "30-17,000 Hz ±3 dB",
      controls: [["bass", "Bass roll-off", "c", ["M", "2", "3", "4", "S"], null, null, "M"]] },
    beta52: { name: "Shure Beta 52A", short: "Beta 52A", maker: "Shure", year: 1996, type: "dynamic", patterns: { supercardioid: 0.37 }, fd: 5000,
      curve: [[20, -4], [40, 1], [60, 2.5], [100, 1.5], [200, -1], [500, -4], [1000, -5], [2000, -1], [3000, 4], [4000, 7], [6000, 4], [8000, 0], [10000, -4], [15000, -12], [20000, -22]],
      sens: { supercardioid: -64 }, sensGuess: true, noise: null, maxSPL: null, z: 150, range: "(not found on Shure's page)", controls: [] }
  };
  M.IDS = Object.keys(M.MICS);
  M.SOURCES = {
    voice: { name: "Voice (generated; the band has no singer)", L1: 80, dist: 0.05 },
    guitar: { name: "Guitar amp (the site's amp model)", L1: 105, dist: 0.03 },
    snare: { name: "Snare (the band's kit)", L1: 110, dist: 0.05 },
    kick: { name: "Kick (the band's kit)", L1: 112, dist: 0.1 }
  };
  M.ROOMS = { dead: { name: "Dead (treated booth)", g: 0.05, t: 0.25 }, room: { name: "Room", g: 0.35, t: 0.6 }, hall: { name: "Big room / hall", g: 0.7, t: 1.6 } };
  M.BASS = { M: 0, 2: -3, 3: -6, 4: -9, S: -12 };
  function ctl(id, k) { return M.MICS[id].controls.filter(function (c) { return c[0] === k; })[0] || null; }
  M.ctl = ctl;
  M.defaults = function (id) { var P = M.MICS[id], st = { pattern: Object.keys(P.patterns)[0], pad: false, lowcut: false, bass: "M" }; P.controls.forEach(function (c) { st[c[0]] = c[6]; }); return st; };
  M.clean = function (id, s) { var P = M.MICS[id], st = Object.assign(M.defaults(id), s || {});
    if (!(st.pattern in P.patterns)) st.pattern = Object.keys(P.patterns)[0];
    if (!ctl(id, "pad")) st.pad = false; if (!ctl(id, "lowcut")) st.lowcut = false; if (!ctl(id, "bass") || !(st.bass in M.BASS)) st.bass = "M"; st.pad = !!st.pad; st.lowcut = !!st.lowcut; return st; };
  M.cleanPlace = function (pl) { pl = Object.assign({ dist: 0.1, angle: 0 }, pl || {}); pl.dist = Math.max(0.005, Math.min(5, +pl.dist)); pl.angle = Math.max(0, Math.min(180, Math.abs(+pl.angle))); return pl; };
  function interp(pts, f) { var lf = Math.log(f); if (f <= pts[0][0]) return pts[0][1]; for (var i = 1; i < pts.length; i++) if (f <= pts[i][0]) { var a = Math.log(pts[i - 1][0]), b = Math.log(pts[i][0]), t = (lf - a) / (b - a); return pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]); } return pts[pts.length - 1][1]; }
  M.curveAt = function (id, f) { return interp(M.MICS[id].curve, f); };
  M.aOf = function (id, st) { var P = M.MICS[id], a = P.patterns[st.pattern]; if (a === 1 && P.omniGrad) a = 1 - P.omniGrad; return a; };
  function aAt(a, f) { return a > 0 && a < 1 ? a + (1 - a) * 0.25 / (1 + (f / 150) * (f / 150)) : a; }
  // signed pattern factor, gradient part with the proximity term (complex), magnitude kept with the sign of its real part
  function dirC(a, f, deg, r) { var c = Math.cos(deg * Math.PI / 180), kr = TAU * f * Math.sqrt(r * r + R0 * R0) / C, re = a + (1 - a) * c, im = -(1 - a) * c / kr; return { re: re, im: im }; }
  M.patternAt = function (id, st, f, deg) { st = M.clean(id, st); var a = aAt(M.aOf(id, st), f); return a + (1 - a) * Math.cos(deg * Math.PI / 180); };
  M.prox = function (a, r, f) { var near = dirC(a, f, 0, r), far = a + (1 - a); return 20 * Math.log10(Math.hypot(near.re, near.im) / Math.max(1e-9, Math.abs(far))); };
  M.H = function (id, st, pl, f) { st = M.clean(id, st); pl = M.cleanPlace(pl); var P = M.MICS[id], a = aAt(M.aOf(id, st), f), d = dirC(a, f, pl.angle, pl.dist);
    var mag = Math.hypot(d.re, d.im), sign = d.re < 0 ? -1 : 1, db = M.curveAt(id, f);
    var beam = (f / P.fd) * (f / P.fd); db -= 12 * beam / (1 + beam) * (1 - Math.cos(pl.angle * Math.PI / 180)) / 2 * (a < 1 ? 1 : 0.6);
    if (P.rearBright && pl.angle > 90 && pl.dist < 0.75) db += P.rearBright * (f * f / (f * f + 4000 * 4000));
    if (st.lowcut) { var x = f / 80; db += 10 * Math.log10(x * x * x * x / (1 + x * x * x * x)); }
    if (st.bass !== "M") { var amt = M.BASS[st.bass], s = 1 / (1 + Math.pow(f / 200, 2)); db += amt * s; }
    if (st.pad) db -= P.padDb || 0;
    return sign * Math.pow(10, db / 20) * mag; };
  M.db = function (id, st, pl, f) { return 20 * Math.log10(Math.abs(M.H(id, st, pl, f)) + 1e-12); };
  M.ree = function (a) { return a * a + (1 - a) * (1 - a) / 3; };
  M.sens = function (id, st) { st = M.clean(id, st); var P = M.MICS[id]; return P.sens[st.pattern] - (st.pad ? (P.padDb || 0) : 0); };
  M.selfNoise = function (id, st) { st = M.clean(id, st); var P = M.MICS[id]; if (P.noise) return P.noise[st.pattern];
    var vn = Math.sqrt(4 * 1.38e-23 * 293 * (P.z || 300) * 20000); return 94 + 20 * Math.log10(vn) - P.sens[st.pattern]; };
  M.maxSPL = function (id, st) { st = M.clean(id, st); var P = M.MICS[id]; if (P.maxSPL == null) return null; return P.maxSPL + (st.pad ? (P.padDb || 0) : 0); };
  M.level = function (id, st, pl, src) { st = M.clean(id, st); pl = M.cleanPlace(pl); var S = M.SOURCES[src || "voice"], spl = S.L1 - 20 * Math.log10(pl.dist), g = M.db(id, st, pl, 1000) + (st.pad ? (M.MICS[id].padDb || 0) : 0);
    var out = M.sens(id, st) + spl - 94 + g, n = M.selfNoise(id, st), mx = M.maxSPL(id, st);
    return { spl: spl, out: out, noise: n, snr: spl + g - n, headroom: mx == null ? null : mx - spl }; };

  // ---------- rendering: linear-phase FIR from H, the room, noise, clipping ----------
  function fir(id, st, pl, sr, n) { var N = n || 512, half = N / 2, Hk = new Float64Array(half + 1); for (var k = 0; k <= half; k++) { var f = Math.max(10, k * sr / N); Hk[k] = M.H(id, st, pl, f); }
    var h = new Float32Array(N); for (var i = 0; i < N; i++) { var s = Hk[0], t = i - half; for (var k2 = 1; k2 < half; k2++) s += 2 * Hk[k2] * Math.cos(TAU * k2 * t / N); s += Hk[half] * Math.cos(Math.PI * t); h[i] = s / N * (0.5 - 0.5 * Math.cos(TAU * (i + 0.5) / N)); } return h; }
  M.fir = fir;
  function conv(x, h) { var y = new Float32Array(x.length + h.length), L = h.length; for (var i = 0; i < x.length; i++) { var v = x[i]; if (v === 0) continue; for (var j = 0; j < L; j++) y[i + j] += v * h[j]; } return y; }
  function reverb(x, sr, t) { var D = [1031, 1327, 1523, 1871].map(function (d) { return Math.round(d * sr / 44100); }), bufs = D.map(function (d) { return new Float32Array(d); }), idx = D.map(function () { return 0; });
    var g = D.map(function (d) { return Math.pow(10, -3 * d / sr / t); }), y = new Float32Array(x.length + Math.round(sr * t)), lp = [0, 0, 0, 0];
    for (var n = 0; n < y.length; n++) { var inp = n < x.length ? x[n] : 0, out = 0; for (var k = 0; k < 4; k++) { var b = bufs[k], v = b[idx[k]]; out += v; lp[k] += 0.4 * (v - lp[k]); b[idx[k]] = inp + g[k] * lp[k] * (k % 2 ? -1 : 1); idx[k] = (idx[k] + 1) % b.length; } y[n] = out * 0.25; } return y; }
  M.render = function (id, st, pl, x, sr, o) { o = o || {}; st = M.clean(id, st); pl = M.cleanPlace(pl); var P = M.MICS[id], src = o.src || "voice";
    var h = fir(id, st, pl, sr, o.taps || 512), y = conv(x, h), off = h.length / 2;
    var lv = M.level(id, st, pl, src), out = new Float32Array(x.length + (o.noRoom ? 0 : Math.round(sr * 1.6)));
    for (var i = 0; i < x.length; i++) out[i] = y[i + off];
    if (!o.noRoom) { var R = M.ROOMS[o.room || "room"], a = M.aOf(id, st), far = { dist: 3, angle: 90 }, hr = fir(id, st, far, sr, 256),
        e = Math.sqrt(M.ree(a)) * R.g * pl.dist * 4 / (1 + pl.dist * 4) * Math.pow(10, (st.pad ? -(P.padDb || 0) : 0) / 20) * 1.5, wet = reverb(conv(x, hr), sr, R.t);
      for (var j = 0; j < out.length && j < wet.length; j++) out[j] += e * wet[j] * (1 / Math.max(0.05, Math.abs(M.H(id, st, { dist: 1, angle: 0 }, 1000)))) * Math.abs(M.H(id, st, { dist: 1, angle: 0 }, 1000)); }
    if (!o.noNoise) { var rms = 0; for (var q = 0; q < x.length; q++) rms += x[q] * x[q]; rms = Math.sqrt(rms / Math.max(1, x.length)) || 0.1;
      var na = rms * Math.pow(10, (lv.noise - lv.spl) / 20) * 2, seed = 12345; for (var m = 0; m < out.length; m++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; out[m] += na * (seed / 0x3fffffff - 1); } }
    if (lv.headroom != null && lv.headroom < 0) { var over = Math.pow(10, -lv.headroom / 20), pk = 1e-9; for (var p = 0; p < out.length; p++) pk = Math.max(pk, Math.abs(out[p])); var th = pk / over;
      for (var u = 0; u < out.length; u++) out[u] = th * Math.tanh(out[u] / th); }
    return out; };

  // ---------- generated sources ----------
  M.synth = function (kind, sr) { var len = Math.round(sr * (kind === "voice" ? 2.4 : 2)), x = new Float32Array(len), seed = 7, rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
    if (kind === "voice") { var notes = [[57, 0, 0.55], [60, 0.6, 0.55], [64, 1.2, 0.5], [62, 1.75, 0.6]], F = [[730, 80], [1090, 90], [2440, 120], [3400, 150]];
      notes.forEach(function (nt) { var f0 = 440 * Math.pow(2, (nt[0] - 69) / 12), t0 = Math.round(nt[1] * sr), n = Math.round(nt[2] * sr);
        for (var i = 0; i < n && t0 + i < len; i++) { var t = i / sr, vib = 1 + 0.006 * Math.sin(TAU * 5.5 * t), env = Math.min(1, t / 0.04) * Math.min(1, (nt[2] - t) / 0.08), s = 0;
          for (var hh = 1; hh * f0 < 6000; hh++) { var fh = hh * f0, amp = 0; F.forEach(function (fm, j) { amp += (j ? 0.5 / j : 1) / (1 + Math.pow((fh - fm[0]) / fm[1], 2)); }); s += amp / hh * Math.sin(TAU * fh * vib * t); }
          x[t0 + i] += 0.12 * env * s + (i < sr * 0.015 && nt[1] === 0.6 ? 0.25 * rnd() * (1 - i / (sr * 0.015)) : 0); } });
      for (var b = 0; b < sr * 0.12; b++) x[Math.round(1.7 * sr) + b] += 0.06 * rnd() * Math.sin(Math.PI * b / (sr * 0.12)); }   // an "s" before the last note
    else if (kind === "snare" || kind === "kick") { [0, 0.5, 1, 1.25, 1.5].forEach(function (t0) { var s0 = Math.round(t0 * sr);
        for (var i = 0; i < sr * 0.4 && s0 + i < len; i++) { var t = i / sr;
          x[s0 + i] += kind === "kick" ? 0.8 * Math.sin(TAU * (50 * t + 60 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 7) + 0.3 * rnd() * Math.exp(-t * 300)
            : 0.4 * Math.sin(TAU * 190 * t) * Math.exp(-t * 25) + 0.45 * rnd() * Math.exp(-t * 14); } }); }
    else { [[40, 0], [47, 0.5], [52, 1], [47, 1.5]].forEach(function (m) { var f = 440 * Math.pow(2, (m[0] - 69) / 12), t0 = Math.round(m[1] * sr);
        for (var i = 0; i + t0 < len; i++) { var t = i / sr, s = 0; for (var hh = 1; hh < 24; hh++) s += Math.sin(TAU * f * hh * t + hh) / hh * (hh % 2 ? 1 : 0.6); x[i + t0] += 0.12 * Math.tanh(2.5 * s) * Math.exp(-t * 1.5); } }); }
    return x; };

  // ---------- translation ----------
  var BANDS = []; for (var bi = 0; bi < 16; bi++) BANDS.push(60 * Math.pow(2, bi / 2.3));
  function shape(id, st, pl) { var v = BANDS.map(function (f) { return M.db(id, st, pl, f); }), m = v.reduce(function (a, b) { return a + b; }, 0) / v.length; return v.map(function (x) { return x - m; }); }
  M.translate = function (from, st, pl, to) { st = M.clean(from, st); pl = M.cleanPlace(pl); var Pf = M.MICS[from], Pt = M.MICS[to], notes = [], lost = false;
    if (from === to) return { state: Object.assign({}, st), place: Object.assign({}, pl), quality: "exact", notes: [], dist: 0 };
    var ns = M.defaults(to), pats = Object.keys(Pt.patterns);
    if (pats.indexOf(st.pattern) >= 0) ns.pattern = st.pattern;
    else { var aF = Pf.patterns[st.pattern]; ns.pattern = pats.slice().sort(function (x, y) { return Math.abs(Pt.patterns[x] - aF) - Math.abs(Pt.patterns[y] - aF); })[0];
      notes.push("Pattern lost: the " + Pt.short + " is " + (pats.length === 1 ? "fixed " : "") + ns.pattern + ", not " + st.pattern + "."); lost = pats.length === 1 && Math.abs(Pt.patterns[ns.pattern] - aF) > 0.3; }
    if (pl.angle > 100 && Pf.patterns[st.pattern] < 0.2 && Pt.patterns[ns.pattern] >= 0.2) { notes.push("Lost: the rear lobe. The " + Pf.short + " heard this source from behind, inverted; the " + Pt.short + " is nearly deaf there."); lost = true; }
    if (st.pad) { if (ctl(to, "pad")) ns.pad = true; else notes.push("The " + Pt.short + " has no pad" + (Pt.maxSPL == null ? " (a dynamic: it rarely needs one)." : ".")); }
    if (st.lowcut) { if (ctl(to, "lowcut")) ns.lowcut = true; else if (ctl(to, "bass")) { ns.bass = "4"; notes.push("Low cut → the MD 421's bass roll-off at 4 (approx)."); } else notes.push("No low cut on the " + Pt.short + ": cut it at the desk."); }
    if (st.bass && st.bass !== "M") { if (ctl(to, "lowcut")) { ns.lowcut = M.BASS[st.bass] <= -6; notes.push("Bass roll-off → the " + Pt.short + "'s low cut " + (ns.lowcut ? "on" : "off") + " (approx)."); } else if (!ctl(to, "bass")) notes.push("No bass roll-off on the " + Pt.short + ": cut it at the desk."); }
    var want = shape(from, st, pl), best = null;
    for (var di = 0; di <= 24; di++) { var d = 0.01 * Math.pow(100, di / 24);
      for (var an = 0; an <= 180; an += 15) { var p2 = { dist: d, angle: an }; if (Pt.patterns[ns.pattern] >= 0.2 && an > 120) continue; var v = shape(to, ns, p2), e = 0;
        for (var i = 0; i < v.length; i++) e += (v[i] - want[i]) * (v[i] - want[i]); e = Math.sqrt(e / v.length) + Math.abs(Math.log(d / pl.dist)) * 0.15; if (!best || e < best.e) best = { p: p2, e: e }; } }
    var place = { dist: Math.round(best.p.dist * 1000) / 1000, angle: best.p.angle };
    if ((Pf.type === "dynamic") !== (Pt.type === "dynamic")) notes.push("A " + Pf.type + " into a " + Pt.type + ": the transient detail and the room it hears differ more than any curve shows.");
    var mx = M.maxSPL(to, ns), lv = M.level(to, ns, place, "guitar"); if (mx != null && Pt.maxSPL != null && pl.dist < 0.05) notes.push("Check the level: max SPL " + mx + " dB on the " + Pt.short + (ctl(to, "pad") && !ns.pad ? " (try the pad)" : "") + ".");
    var q = best.e < 1.2 && !notes.length ? "exact" : best.e < 4 && !lost ? "approx" : lost ? "lost" : best.e < 4 ? "approx" : "lost";
    notes.push("Tone matched within " + best.e.toFixed(1) + " dB (rms, 60 Hz-12 kHz, the curves as modelled); placement " + place.dist * 100 + " cm at " + place.angle + "°.");
    return { state: ns, place: place, quality: q, notes: notes, dist: best.e, lv: lv }; };
  M.summary = function (id, st, pl) { st = M.clean(id, st); pl = M.cleanPlace(pl); var P = M.MICS[id], b = [P.short]; if (Object.keys(P.patterns).length > 1) b.push(st.pattern);
    if (st.pad) b.push("pad"); if (st.lowcut) b.push("low cut"); if (ctl(id, "bass")) b.push("bass " + st.bass); b.push((pl.dist * 100).toFixed(pl.dist < 0.1 ? 1 : 0).replace(/\.0$/, "") + " cm, " + Math.round(pl.angle) + "°"); return b.join(", "); };

  if (typeof module !== "undefined" && module.exports) { module.exports = M; }
  if (typeof document === "undefined") { global.Mics = M; return; }

  // ======================= browser: sound =======================
  var ctx = null, master = null, playing = [], SRC = {};
  function ac() { if (!ctx) { ctx = new (global.AudioContext || global.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.55;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "Mics"); }
    if (ctx.state === "suspended") ctx.resume(); return ctx; }
  M.ctx = function () { return ac(); };
  M.stop = function () { playing.forEach(function (s) { try { s.stop(); } catch (e) {} }); playing = []; };
  var SR = 32000;
  function kitSource(piece) { var BS = global.BandSounds, OAC = global.OfflineAudioContext; if (!BS || !OAC) return Promise.reject();
    var oc = new OAC(1, SR * 2, SR), bank = BS.create(oc);
    return bank.load(["kit"]).then(function () { if (!bank.has("kit")) throw 0; [0, 0.5, 1, 1.25, 1.5].forEach(function (t, i) { bank.play("kit", { piece: piece, vel: i === 3 ? 0.5 : 0.8 }, t); }); return oc.startRendering(); })
      .then(function (b) { var d = b.getChannelData(0); if (!d.some(function (v) { return Math.abs(v) > 1e-3; })) throw 0; return new Float32Array(d); }); }
  M.source = function (kind) { if (SRC[kind]) return SRC[kind]; var p;
    if (kind === "guitar" && global.Amps && global.GuitarPickups) p = Promise.resolve().then(function () { var st = global.Amps.defaults("twin"); st.volume = 5; return global.Amps.render("twin", st, "riff", SR).output; });
    else if (kind === "snare" || kind === "kick") p = kitSource(kind);
    else p = Promise.reject();
    return (SRC[kind] = p.catch(function () { return M.synth(kind, SR); }).then(function (x) { var pk = 1e-6; for (var i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i])); var y = new Float32Array(x.length); for (var j = 0; j < x.length; j++) y[j] = x[j] * 0.5 / pk; return y; })); };
  function out(y) { var c = ac(), pk = 1e-6; for (var i = 0; i < y.length; i++) pk = Math.max(pk, Math.abs(y[i])); var buf = c.createBuffer(1, y.length, SR), d = buf.getChannelData(0), g = Math.min(4, 0.7 / pk);
    for (var j = 0; j < y.length; j++) d[j] = y[j] * g; var s = c.createBufferSource(); s.buffer = buf; s.connect(master); s.start(); playing.push(s);
    if (global.PlayBar && PlayBar.sounding) { PlayBar.sounding("mics", M.stop); s.onended = function () { PlayBar.sounding("mics", null); }; } }
  M.renderW = function (W, x) { return M.render(W.id, W.st, W.pl, x, SR, { src: W.src, room: W.room }); };
  M.play = function (W) { ac(); M.stop(); return M.source(W.src).then(function (x) { var y = M.renderW(W, x); out(y); return y; }); };
  M.playSum = function (A2, B2) { ac(); M.stop(); return M.source(A2.src).then(function (x) { var a = M.renderW(A2, x), b = M.renderW(B2, x), n = Math.max(a.length, b.length), y = new Float32Array(n);
      for (var i = 0; i < n; i++) y[i] = 0.5 * ((a[i] || 0) + (b[i] || 0)); out(y); return y; }); };

  // ======================= browser: widgets =======================
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  M.adapter = function (W) { var subs = []; W._notify = function () { subs.forEach(function (f) { f(); }); };
    return { get: function (k) { return W.st[k]; }, set: function (k, v) { W.set(k, v); }, onChange: function (cb) { subs.push(cb); }, range: function (k) { return ctl(W.id, k); } }; };
  var PL_W = 300, PL_H = 170, SX = 40, SY = 85, SCALE = 200;   // top-down: source at left, mic placed by distance (log) and angle
  function rpx(d) { return 18 + Math.log(d / 0.005) / Math.log(5 / 0.005) * SCALE; }
  function pxr(p) { return 0.005 * Math.pow(5 / 0.005, (p - 18) / SCALE); }
  function plot(el, W) { var Wd = 560, Ht = 150, f0 = 30, f1 = 16000, paths = [], mn = -30, mx = 20;
    var lines = [[W.pl, "mic-line", "this placement"], [{ dist: 1, angle: 0 }, "mic-ref", "same mic, 1 m on axis"]];
    var s = '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" class="mic-svg" role="img" aria-label="Frequency response at this placement"><rect width="' + Wd + '" height="' + Ht + '" class="mic-bg"/>';
    [100, 1000, 10000].forEach(function (f) { var x = Math.log(f / f0) / Math.log(f1 / f0) * Wd; s += '<line x1="' + x + '" x2="' + x + '" y1="0" y2="' + Ht + '" class="mic-grid"/><text x="' + (x + 3) + '" y="' + (Ht - 4) + '">' + (f >= 1000 ? f / 1000 + " kHz" : f + " Hz") + "</text>"; });
    var ref = M.db(W.id, W.st, { dist: 1, angle: 0 }, 1000);
    lines.forEach(function (L) { var d = ""; for (var i = 0; i <= 100; i++) { var f = f0 * Math.pow(f1 / f0, i / 100), v = Math.max(mn, Math.min(mx, M.db(W.id, W.st, L[0], f) - ref)); d += (i ? "L" : "M") + (i / 100 * Wd).toFixed(1) + " " + ((mx - v) / (mx - mn) * Ht).toFixed(1); } s += '<path d="' + d + '" class="' + L[1] + '"/>'; });
    el.innerHTML = s + '<text x="6" y="12">dB against the same mic at 1 m on axis (10 dB a grid step is not drawn; range -30 to +20). Solid: this placement; dashed: 1 m on axis.</text></svg>'; }
  function polar(el, W) { var R = 60, s = '<svg viewBox="0 0 150 150" class="mic-polar" role="img" aria-label="Polar pattern at 125 Hz, 1 kHz and 8 kHz"><rect width="150" height="150" class="mic-bg"/>';
    [1, 0.5].forEach(function (k) { s += '<circle cx="75" cy="75" r="' + R * k + '" class="mic-grid" fill="none"/>'; });
    [[125, "mic-p1"], [1000, "mic-p2"], [8000, "mic-p3"]].forEach(function (F) { var d = "", neg = ""; for (var i = 0; i <= 72; i++) { var th = i * 5, p = M.patternAt(W.id, W.st, F[0], th), P = M.MICS[W.id], beam = (F[0] / P.fd) * (F[0] / P.fd), att = Math.pow(10, -12 * beam / (1 + beam) * (1 - Math.cos(th * Math.PI / 180)) / 2 / 20), r = Math.abs(p) * att * R;
        var x = 75 + r * Math.sin(th * Math.PI / 180), y = 75 - r * Math.cos(th * Math.PI / 180); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
      s += '<path d="' + d + '" class="' + F[1] + '" fill="none"/>'; });
    el.innerHTML = s + '<text x="4" y="12">0° up; 125 Hz / 1 kHz / 8 kHz</text>' + (W.st.pattern === "fig8" ? '<text x="58" y="146">rear: inverted (−)</text>' : "") + "</svg>"; }
  function room(el, W, onMove) { var s = '<svg viewBox="0 0 ' + PL_W + ' ' + PL_H + '" class="mic-room" role="img" aria-label="Placement: drag the mic"><rect width="' + PL_W + '" height="' + PL_H + '" class="mic-bg"/>' +
      '<circle cx="' + SX + '" cy="' + SY + '" r="12" class="mic-src"/><text x="' + SX + '" y="' + (SY + 26) + '" text-anchor="middle">source</text><line x1="' + SX + '" y1="' + SY + '" x2="' + (PL_W - 6) + '" y2="' + SY + '" class="mic-grid"/><g class="mic-dot" tabindex="0"><circle r="9"/><path d="M0 0 L16 0" class="mic-aim"/></g><text class="mic-rd" x="6" y="14"></text></svg>';
    el.innerHTML = s; var svg = el.firstChild, g = svg.querySelector(".mic-dot"), rd = svg.querySelector(".mic-rd");
    function draw() { var r = rpx(W.pl.dist), a = W.pl.angle * Math.PI / 180, x = SX + r * Math.cos(a * 0), y = SY; // the mic sits on the axis line; its angle is the mic's rotation
      g.setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + (180 - W.pl.angle) + ")"); rd.textContent = (W.pl.dist * 100).toFixed(W.pl.dist < 0.1 ? 1 : 0) + " cm, mic turned " + Math.round(W.pl.angle) + "° off the source"; }
    var drag = false; g.addEventListener("pointerdown", function (e) { drag = true; g.setPointerCapture && g.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", function (e) { if (!drag) return; var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * PL_W / r.width; onMove({ dist: pxr(Math.max(18, Math.min(18 + SCALE, x - SX))) }); });
    svg.addEventListener("pointerup", function () { drag = false; });
    svg.addEventListener("wheel", function (e) { e.preventDefault(); onMove({ angle: Math.max(0, Math.min(180, W.pl.angle + (e.deltaY > 0 ? 15 : -15))) }); }, { passive: false });
    g.addEventListener("keydown", function (e) { var k = e.key; if (k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); onMove({ dist: W.pl.dist * (k === "ArrowRight" ? 1.25 : 0.8) }); } if (k === "ArrowUp" || k === "ArrowDown") { e.preventDefault(); onMove({ angle: Math.max(0, Math.min(180, W.pl.angle + (k === "ArrowUp" ? 15 : -15))) }); } });
    return draw; }
  M.widgets = [];
  function face(host, W) { host.innerHTML = ""; if (!global.FaithfulPanel) { host.textContent = "(panel script missing)"; return; }
    FaithfulPanel.load("mic-" + W.id).then(function () { W.face = FaithfulPanel.mount(host, { id: "mic-" + W.id, adapter: W.A }); }).catch(function () { host.textContent = "(drawing failed to load)"; }); }
  M.mount = function (el, o) { o = o || {}; var W = { id: o.mic || "sm57", st: null, pl: M.cleanPlace(o.place || { dist: 0.05, angle: 0 }), src: o.src || "voice", room: o.room || "room" }; W.st = M.clean(W.id, o.state);
    W.A = M.adapter(W); M.widgets.push(W); el.classList.add("mic-w"); el.innerHTML = "";
    var head = h("div", "mic-head"), title = h("b", "mic-title"); head.appendChild(title); el.appendChild(head);
    if (o.choose) { var se = h("select", "mic-pick"); se.setAttribute("aria-label", "Microphone"); M.IDS.forEach(function (id) { var op = h("option", null, M.MICS[id].name); op.value = id; se.appendChild(op); }); se.onchange = function () { W.setMic(se.value); }; head.appendChild(se); W.pick = se; }
    var fh = h("div", "mic-face"); el.appendChild(fh);
    var row = h("div", "mic-row"), rm = h("div", "mic-roombox"), pol = h("div", "mic-polbox"); row.appendChild(rm); row.appendChild(pol); el.appendChild(row);
    var op = h("div", "mic-opts"); el.appendChild(op);
    function pick(label, list, get, set) { var l = h("label", null, label + " "), s2 = h("select"); list.forEach(function (x) { var oo = h("option", null, x[1]); oo.value = x[0]; s2.appendChild(oo); }); s2.value = get(); s2.onchange = function () { set(s2.value); }; l.appendChild(s2); op.appendChild(l); return s2; }
    function slider(label, cls, min, max, step, get, set) { var l = h("label", null, label + " "), r = h("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.className = cls; r.value = get(); r.oninput = function () { set(+r.value); }; l.appendChild(r); op.appendChild(l); return r; }
    var srcSel = pick("Source", Object.keys(M.SOURCES).map(function (k) { return [k, M.SOURCES[k].name]; }), function () { return W.src; }, function (v) { W.src = v; info(); });
    var roomSel = pick("Room", Object.keys(M.ROOMS).map(function (k) { return [k, M.ROOMS[k].name]; }), function () { return W.room; }, function (v) { W.room = v; info(); });
    var dS = slider("Distance", "mic-dist", 0, 100, 1, function () { return Math.round(Math.log(W.pl.dist / 0.005) / Math.log(1000) * 100); }, function (v) { W.setPlace({ dist: 0.005 * Math.pow(1000, v / 100) }); });
    var aS = slider("Angle", "mic-angle", 0, 180, 5, function () { return W.pl.angle; }, function (v) { W.setPlace({ angle: v }); });
    var bar = h("div", "mic-bar"), pb = h("button", "mic-play", "▶ Hear it"), sb = h("button", "mic-stop", "■ Stop"); pb.type = sb.type = "button"; pb.onclick = function () { W.play(); }; sb.onclick = M.stop; bar.appendChild(pb); bar.appendChild(sb); el.appendChild(bar);
    var pl = h("div", "mic-plot"), inf = h("p", "mic-info"); el.appendChild(pl); el.appendChild(inf);
    var drawRoom = room(rm, W, function (p) { W.setPlace(p); });
    function info() { var P = M.MICS[W.id], lv = M.level(W.id, W.st, W.pl, W.src);
      inf.textContent = M.summary(W.id, W.st, W.pl) + ". " + P.maker + " " + P.type + ", " + P.range + ". At this distance: " + lv.spl.toFixed(0) + " dB SPL, output " + lv.out.toFixed(0) + " dBV, self-noise " + lv.noise.toFixed(0) + " dB" + (P.noise ? "-A (spec)" : " (site's estimate)") +
        (lv.headroom == null ? ", max SPL not published (a dynamic: very high)" : lv.headroom < 0 ? ", OVER max SPL by " + (-lv.headroom).toFixed(0) + " dB (distorts" + (ctl(W.id, "pad") && !W.st.pad ? ": try the pad" : "") + ")" : ", " + lv.headroom.toFixed(0) + " dB below max SPL") + ".";
      plot(pl, W); polar(pol, W); drawRoom(); dS.value = Math.round(Math.log(W.pl.dist / 0.005) / Math.log(1000) * 100); aS.value = W.pl.angle; srcSel.value = W.src; roomSel.value = W.room; el.dataset.mic = W.id; }
    W.set = function (k, v) { var s = Object.assign({}, W.st); s[k] = v; W.st = M.clean(W.id, s); W._notify(); info(); if (o.onChange) o.onChange(W); };
    W.setAll = function (s, p) { W.st = M.clean(W.id, Object.assign({}, W.st, s)); if (p) W.pl = M.cleanPlace(Object.assign({}, W.pl, p)); W._notify(); info(); };
    W.setPlace = function (p) { W.pl = M.cleanPlace(Object.assign({}, W.pl, p)); info(); };
    W.setMic = function (id, st) { W.id = id; W.st = M.clean(id, st || {}); title.textContent = M.MICS[id].name; if (W.pick) W.pick.value = id; face(fh, W); info(); };
    W.play = function () { return M.play(W); }; W.draw = info; W.setMic(W.id, W.st); return W; };
  M.compare = function (el) { el.innerHTML = ""; var cols = h("div", "micc-cols"), a = h("div", "micc-a"), b = h("div", "micc-b"); cols.appendChild(a); cols.appendChild(b); el.appendChild(cols);
    var q = new URLSearchParams(location.search), ia = q.get("a") || el.dataset.a || "sm57", ib = q.get("b") || el.dataset.b || "u87"; if (!M.MICS[ia]) ia = "sm57"; if (!M.MICS[ib]) ib = "u87";
    var WA = M.mount(a, { mic: ia, choose: true }), WB = M.mount(b, { mic: ib, choose: true });
    var box = h("div", "micc-tr"), ab = h("button", "micc-ab", "▶ A then B"), sum = h("button", "micc-sum", "▶ A + B together"), same = h("button", "micc-same", "Same source and room for B"),
      go = h("button", "micc-go", "Translate A → B"), back = h("button", "micc-back", "Translate B → A"), res = h("div", "micc-res");
    [ab, sum, same, go, back].forEach(function (x) { x.type = "button"; box.appendChild(x); }); box.appendChild(res); el.appendChild(box);
    ab.onclick = function () { M.play(WA).then(function (y) { setTimeout(function () { M.play(Object.assign({}, WB, { src: WA.src })); }, y.length / SR * 1000 + 200); }); };
    sum.onclick = function () { M.playSum(WA, Object.assign({}, WB, { src: WA.src })); };
    same.onclick = function () { WB.src = WA.src; WB.room = WA.room; WB.draw(); };
    function run(F, T) { var r = M.translate(F.id, F.st, F.pl, T.id); T.src = F.src; T.room = F.room; T.setAll(r.state, r.place); res.innerHTML = "";
      var p = h("p"); p.innerHTML = "<b></b> → <b></b> <span class=\"micc-q micc-" + r.quality + "\">" + r.quality + "</span>"; p.querySelectorAll("b")[0].textContent = M.summary(F.id, F.st, F.pl); p.querySelectorAll("b")[1].textContent = M.summary(T.id, T.st, T.pl); res.appendChild(p);
      var ul = h("ul"); r.notes.forEach(function (n) { ul.appendChild(h("li", null, n)); }); res.appendChild(ul); el.dataset.quality = r.quality; return r; }
    go.onclick = function () { run(WA, WB); }; back.onclick = function () { run(WB, WA); }; el._micc = { a: WA, b: WB, run: run }; return el._micc; };

  function steps() { var n = 0; document.querySelectorAll(".mic-step").forEach(function (s) { n++; var b = h("button", "mic-hear", "▶ Hear step " + n); b.type = "button";
      b.onclick = function () { var W = M.widgets.filter(function (w) { return w.id === s.dataset.mic; })[0] || M.widgets[0]; if (!W) return;
        if (s.dataset.src) W.src = s.dataset.src; if (s.dataset.room) W.room = s.dataset.room;
        W.st = M.clean(W.id, Object.assign(M.defaults(W.id), s.dataset.set ? JSON.parse(s.dataset.set) : {})); W.pl = M.cleanPlace(s.dataset.place ? JSON.parse(s.dataset.place) : {}); W._notify(); W.draw(); W.play(); };
      s.insertBefore(b, s.firstChild); }); }
  function quiz(q) { var a = +q.dataset.a, why = q.querySelector(".mic-why"); if (why) why.hidden = true;
    q.querySelectorAll("li").forEach(function (li, i) { li.tabIndex = 0; li.setAttribute("role", "button"); var f = function () { q.querySelectorAll("li").forEach(function (x) { x.classList.remove("mic-right", "mic-wrong"); }); li.classList.add(i === a ? "mic-right" : "mic-wrong"); if (why) why.hidden = false; };
      li.onclick = f; li.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; }); }
  var TR = null; M.tracks = function () { return TR || (TR = fetch("/apps/shared/data/mics/tracks.json").then(function (r) { return r.json(); })); };
  function tracks(el) { M.tracks().then(function (d) { var want = el.dataset.mic, list = d.tracks.filter(function (t) { return t.mic === want; }), ul = h("ul", "mic-tl");
      list.forEach(function (t) { var li = h("li"), a = h("a", null, t.artist + ", “" + t.song + "”"); a.href = t.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a);
        li.appendChild(document.createTextNode(t.channel ? " ↗ (" + t.channel + "). " : " ↗ (a YouTube search: no video checked). "));
        li.appendChild(h("span", "mic-who", (t.useSrc ? "Mic use: " + t.useSrc + "." : "That this mic is on the record: unverified (no source found).") + " "));
        if (t.place) { var b = h("button", "mic-try", "Try a guess"); b.type = "button"; b.title = "This site's guess at the placement (no source)"; b.onclick = function () { var W = M.widgets.filter(function (w) { return w.id === want; })[0]; if (W) { if (t.src) W.src = t.src; W.setAll(t.state || {}, t.place); W.play(); } }; li.appendChild(b); }
        ul.appendChild(li); }); el.innerHTML = ""; el.appendChild(ul); el.dataset.n = list.length; }).catch(function () { el.textContent = "(the track list did not load)"; }); }
  M.init = function () { document.querySelectorAll(".mic[data-mic]").forEach(function (e) { M.mount(e, { mic: e.dataset.mic, src: e.dataset.src, place: e.dataset.place ? JSON.parse(e.dataset.place) : null }); });
    document.querySelectorAll(".micc").forEach(function (e) { M.compare(e); });
    steps(); document.querySelectorAll(".mic-q").forEach(quiz); document.querySelectorAll(".mic-tracks").forEach(tracks); };
  global.Mics = M;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", M.init); else M.init();
})(typeof window !== "undefined" ? window : globalThis);
