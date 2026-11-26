// Amps: valve guitar and bass amplifiers the way the site does guitars and pedals. A circuit-informed model of each amp (pure maths,
// sample by sample, runs in node: tests/lessons/amps.test.js), a faithful drawing of each control panel (FaithfulPanel host adapter,
// panels/amp-<id>.js), translation between amps, and the sound: the guitar or bass model (GuitarPickups.render) through the pedals
// (Pedals.run) into the amp. Pages: lessons/amp-compare.qmd, lessons/intro-<amp>.qmd (scripts/intro-instruments/amps.py).
//
// THE SIGNAL PATH (the same blocks for every amp; which blocks, in what order, and their values per amp below)
//   preamp stages  a 12AX7 triode stage = gain into an asymmetric soft clip (hard toward grid conduction, softer toward cutoff, so
//          even harmonics), a coupling high-pass after it and a Miller low-pass. Stage gains and clip points: the site's (unverified).
//   tone stack  the Fender / Marshall "FMV" passive network, Treble / Middle / Bass pots, solved EXACTLY from its component values by
//          the closed-form transfer function of Yeh & Smith (DAFx 2006, eqn. 1, checked against SPICE in the paper), discretised by the
//          bilinear transform (their section 2.3). Amps.stackH(c, t, m, l, f) is the analog response. Pot tapers: Bass audio, Treble
//          and Middle linear (the site's choice). The 5F6-A values are the paper's; the others (Twin AB763, Marshall 1959, Vox Top
//          Boost, Rectifier) are the commonly published schematic values from memory: unverified. The Vox Top Boost is the same network
//          "with the middle control removed" (Wikipedia, "Vox AC30"): here a fixed 10k resistor in the middle leg.
//          The SVT's tone section is NOT this network: bass and treble shelves, a five-position midrange (frequencies the site's,
//          unverified), Ultra Lo / Ultra Hi switches.
//   power amp  push-pull pair of output valves: y = g(b + x) - g(b - x), g a soft conduction curve, b the bias (hot = towards class A,
//          both valves always conducting, smoother; cold = class AB, a crossover region). Push-pull cancels even harmonics. The
//          AC30 is class AB, cathode biased, no negative feedback (Wikipedia, "Vox AC30"): here hot bias, no presence, Cut. Sag: the
//          supply droops with the current drawn (envelope, attack 15 ms, release 180 ms), squeezing headroom; a valve rectifier
//          (GZ34: 5F6-A, AC30; "Tube" on the Rectifier) sags far more than solid state (the Twin: Wikipedia). Depths: the site's.
//   presence   a treble shelf after the power amp, standing in for the presence control's cut of negative feedback at high frequencies.
//   Vox Cut    a first-order low-pass after the phase inverter, 18 kHz at 0 to 1.6 kHz at 10 (corner values the site's).
//   spring reverb (Twin)  a Hammond / Accutronics-style tank (Wikipedia, "Fender Twin Reverb"): band-limited send, three springs =
//          delays with feedback and a chain of all-pass "dispersion" stages (the chirp), mixed back by the Reverb knob. Site's values.
//   tremolo / vibrato  Twin: the "vibrato" channel is really tremolo, a neon + light-dependent resistor "bug" pulsing the volume
//          (Wikipedia): an asymmetric LFO on the level, Speed 1.5-10 Hz (site's). AC30: Vib-Trem channel, vibrato = a delay swung
//          by the LFO (pitch), tremolo = level (Wikipedia names the effects; rates and depths the site's).
//   cabinet    an impulse-response-like filter (high-pass resonance, a few peaks, a top-end roll-off) per cab: 2x12 Jensen C12N (Twin),
//          2x12 Celestion Blue (AC30), 4x10 Jensen P10R (Bassman), 4x12 Celestion (Marshall 1960), 4x12 closed (Rectifier), 8x10 (SVT).
//          Speaker models from Wikipedia where named; every curve value is the site's (not measured).
//   Not modelled: noise, hum, output transformer saturation, speaker break-up beyond a soft limit, oversampling (some aliasing).
//   Not listened against real amps.
//
// API
//   Amps.AMPS[id] { name, short, maker, year, family "guitar"|"bass", controls [[key, label, "k", 0, 10, 0.1, def] | [key, label,
//                   "c", [values], null, null, def] | [key, label, "s", false, true, null, def]], stack, cab, power, ... }
//   Amps.IDS, .defaults(id), .clean(id, st), .make(id, st, sr) -> f(x), .process(id, st, Float32Array, sr) -> Float32Array
//   Amps.stackCoef(c, t, m, l) -> {b:[0,b1,b2,b3], a:[1,a1,a2,a3]}   Amps.stackH(c, t, m, l, f) -> |H|   Amps.STACKS (component values)
//   Amps.curve(id, st, f) -> dB of the linear tone path (stack + bright + presence / Cut + cab), for pictures and translation
//   Amps.translate(fromId, st, toId) -> { state, quality "exact"|"approx"|"lost", notes, dist }
//   Amps.adapter(W)  Amps.mount(el, {amp, choose})  Amps.compare(el)  Amps.play(id, st, kind)
//   Page markup: <div class="amp" data-amp="twin"></div>  <div class="ampc" data-a="twin" data-b="ac30"></div> (compare)
//                <div class="amp-step" data-amp="twin" data-set='{"volume":7}' data-play="riff">text</div>  (tour step)
//                <div class="amp-q" data-a="1">...</div>  <div class="amp-tracks" data-amp="twin"></div>
//   Input: the guitar picker (GuitarPickups guitars and basses), Guitar volume, and "Pedals in front": none, a single pedal, or the
//   pedalboard on the same page (a Pedals `.pdb`): Pedals.run(chain) -> amp.
(function (global) {
  var A = {}, TAU = 2 * Math.PI;
  function lpA(fc, sr) { return 1 - Math.exp(-TAU * Math.min(fc, sr * 0.45) / sr); }
  A.taper = function (v) { var x = Math.max(0, Math.min(10, v)) / 10; return x <= 0.5 ? x * 0.2 : 0.1 + (x - 0.5) * 1.8; };   // audio taper (the guitar pages' curve)
  var aud = A.taper;
  var K = function (k, l, d) { return [k, l, "k", 0, 10, 0.1, d]; };

  // ---------- tone stack: Yeh & Smith 2006, eqn. (1) ----------
  A.STACKS = {
    bassman: { C1: 250e-12, C2: 20e-9, C3: 20e-9, R1: 250e3, R2: 1e6, R3: 25e3, R4: 56e3, src: "Yeh & Smith 2006, Fig. 1 ('59 Bassman)" },
    twin: { C1: 250e-12, C2: 100e-9, C3: 47e-9, R1: 250e3, R2: 250e3, R3: 10e3, R4: 100e3, src: "AB763 values as commonly published (unverified)" },
    plexi: { C1: 500e-12, C2: 22e-9, C3: 22e-9, R1: 220e3, R2: 1e6, R3: 25e3, R4: 33e3, src: "Marshall 1959 values as commonly published (unverified)" },
    ac30: { C1: 50e-12, C2: 22e-9, C3: 22e-9, R1: 1e6, R2: 1e6, R3: 10e3, R4: 100e3, fixedMid: 1, src: "Top Boost values as commonly published (unverified); middle leg a fixed 10k" },
    rect: { C1: 500e-12, C2: 22e-9, C3: 22e-9, R1: 250e3, R2: 1e6, R3: 25e3, R4: 47e3, src: "the site's Marshall-like guess (unverified)" }
  };
  A.stackCoef = function (c, t, m, l) {
    var C1 = c.C1, C2 = c.C2, C3 = c.C3, R1 = c.R1, R2 = c.R2, R3 = c.R3, R4 = c.R4, m2 = m * m;
    var b1 = t * C1 * R1 + m * C3 * R3 + l * (C1 * R2 + C2 * R2) + (C1 * R3 + C2 * R3);
    var b2 = t * (C1 * C2 * R1 * R4 + C1 * C3 * R1 * R4) - m2 * (C1 * C3 * R3 * R3 + C2 * C3 * R3 * R3) + m * (C1 * C3 * R1 * R3 + C1 * C3 * R3 * R3 + C2 * C3 * R3 * R3)
      + l * (C1 * C2 * R1 * R2 + C1 * C2 * R2 * R4 + C1 * C3 * R2 * R4) + l * m * (C1 * C3 * R2 * R3 + C2 * C3 * R2 * R3) + (C1 * C2 * R1 * R3 + C1 * C2 * R3 * R4 + C1 * C3 * R3 * R4);
    var C123 = C1 * C2 * C3;
    var b3 = l * m * C123 * (R1 * R2 * R3 + R2 * R3 * R4) - m2 * C123 * (R1 * R3 * R3 + R3 * R3 * R4) + m * C123 * (R1 * R3 * R3 + R3 * R3 * R4)
      + t * C123 * R1 * R3 * R4 - t * m * C123 * R1 * R3 * R4 + t * l * C123 * R1 * R2 * R4;
    var a1 = (C1 * R1 + C1 * R3 + C2 * R3 + C2 * R4 + C3 * R4) + m * C3 * R3 + l * (C1 * R2 + C2 * R2);
    var a2 = m * (C1 * C3 * R1 * R3 - C2 * C3 * R3 * R4 + C1 * C3 * R3 * R3 + C2 * C3 * R3 * R3) + l * m * (C1 * C3 * R2 * R3 + C2 * C3 * R2 * R3)
      - m2 * (C1 * C3 * R3 * R3 + C2 * C3 * R3 * R3) + l * (C1 * C2 * R2 * R4 + C1 * C2 * R1 * R2 + C1 * C3 * R2 * R4 + C2 * C3 * R2 * R4)
      + (C1 * C2 * R1 * R4 + C1 * C3 * R1 * R4 + C1 * C2 * R3 * R4 + C1 * C2 * R1 * R3 + C1 * C3 * R3 * R4 + C2 * C3 * R3 * R4);
    var a3 = l * m * C123 * (R1 * R2 * R3 + R2 * R3 * R4) - m2 * C123 * (R1 * R3 * R3 + R3 * R3 * R4) + m * C123 * (R3 * R3 * R4 + R1 * R3 * R3 - R1 * R3 * R4)
      + l * C123 * R1 * R2 * R4 + C123 * R1 * R3 * R4;
    return { b: [0, b1, b2, b3], a: [1, a1, a2, a3] };
  };
  A.stackH = function (c, t, m, l, f) { var k = A.stackCoef(c, t, m, l), w = TAU * f, re = function (p) { return p[0] - p[2] * w * w; }, im = function (p) { return p[1] * w - p[3] * w * w * w; };
    return Math.hypot(re(k.b), im(k.b)) / Math.hypot(re(k.a), im(k.a)); };
  function bilinear3(k, sr) { var c = 2 * sr, b = k.b, a = k.a, c2 = c * c, c3 = c2 * c;   // Yeh & Smith section 2.3 (s = c (1 - z^-1)/(1 + z^-1))
    var B = [-b[1] * c - b[2] * c2 - b[3] * c3, -b[1] * c + b[2] * c2 + 3 * b[3] * c3, b[1] * c + b[2] * c2 - 3 * b[3] * c3, b[1] * c - b[2] * c2 + b[3] * c3];
    var Q = [-a[0] - a[1] * c - a[2] * c2 - a[3] * c3, -3 * a[0] - a[1] * c + a[2] * c2 + 3 * a[3] * c3, -3 * a[0] + a[1] * c + a[2] * c2 - 3 * a[3] * c3, -a[0] + a[1] * c - a[2] * c2 + a[3] * c3];
    return { B: B.map(function (v) { return v / Q[0]; }), A: Q.map(function (v) { return v / Q[0]; }) }; }
  function iir3(z) { var s1 = 0, s2 = 0, s3 = 0, B = z.B, Q = z.A;   // transposed direct form II
    return function (x) { var y = B[0] * x + s1; s1 = B[1] * x - Q[1] * y + s2; s2 = B[2] * x - Q[2] * y + s3; s3 = B[3] * x - Q[3] * y; return y; }; }
  A.stackKnobs = function (id, st) { var c = A.STACKS[A.AMPS[id].stack]; return { t: st.treble / 10, m: c.fixedMid ? 1 : st.middle / 10, l: aud(st.bass) }; };

  // ---------- biquads (cab, shelves, SVT) ----------
  function bq(type, f, Q, gdb, sr) { var w = TAU * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * Q), Ag = Math.pow(10, (gdb || 0) / 40), b0, b1, b2, a0, a1, a2;
    if (type === "lp") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === "hp") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === "peak") { b0 = 1 + al * Ag; b1 = -2 * cw; b2 = 1 - al * Ag; a0 = 1 + al / Ag; a1 = -2 * cw; a2 = 1 - al / Ag; }
    else { var sq = 2 * Math.sqrt(Ag) * al; if (type === "ls") { b0 = Ag * ((Ag + 1) - (Ag - 1) * cw + sq); b1 = 2 * Ag * ((Ag - 1) - (Ag + 1) * cw); b2 = Ag * ((Ag + 1) - (Ag - 1) * cw - sq); a0 = (Ag + 1) + (Ag - 1) * cw + sq; a1 = -2 * ((Ag - 1) + (Ag + 1) * cw); a2 = (Ag + 1) + (Ag - 1) * cw - sq; }
      else { b0 = Ag * ((Ag + 1) + (Ag - 1) * cw + sq); b1 = -2 * Ag * ((Ag - 1) + (Ag + 1) * cw); b2 = Ag * ((Ag + 1) + (Ag - 1) * cw - sq); a0 = (Ag + 1) - (Ag - 1) * cw + sq; a1 = 2 * ((Ag - 1) - (Ag + 1) * cw); a2 = (Ag + 1) - (Ag - 1) * cw - sq; } }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]; }
  function bqRun(c) { var x1 = 0, x2 = 0, y1 = 0, y2 = 0; return function (x) { var y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; }; }
  function bqMag(c, f, sr) { var w = TAU * f / sr, cr = Math.cos(w), ci = -Math.sin(w), c2r = Math.cos(2 * w), c2i = -Math.sin(2 * w);
    return Math.hypot(c[0] + c[1] * cr + c[2] * c2r, c[1] * ci + c[2] * c2i) / Math.hypot(1 + c[3] * cr + c[4] * c2r, c[3] * ci + c[4] * c2i); }
  function chain(list) { var fs = list.map(bqRun); return function (x) { for (var i = 0; i < fs.length; i++) x = fs[i](x); return x; }; }

  // cabinets: [type, f, Q, dB] (the site's curves, not measured)
  A.CABS = {
    "2x12-jensen": { name: "2x12 open back, Jensen C12N-type", bq: [["hp", 75, 1.1], ["peak", 110, 1.4, 3], ["peak", 1800, 1.2, 2.5], ["peak", 3600, 2, 3], ["lp", 5200, 0.8]] },
    "2x12-blue": { name: "2x12 open back, Celestion Blue-type", bq: [["hp", 85, 1.0], ["peak", 1100, 1.0, 2], ["peak", 2600, 1.5, 5], ["lp", 4800, 0.9]] },
    "4x10-jensen": { name: "4x10 open back, Jensen P10R-type", bq: [["hp", 70, 0.9], ["peak", 160, 1.2, 2], ["peak", 1500, 1, 2], ["lp", 5000, 0.8]] },
    "4x12-celestion": { name: "4x12 closed back, Celestion 25 W-type", bq: [["hp", 80, 1.4], ["peak", 120, 1.5, 4], ["peak", 1500, 1.2, 3], ["peak", 3000, 1.6, 2], ["lp", 4500, 0.8]] },
    "4x12-closed": { name: "4x12 closed back, modern 70 W-type", bq: [["hp", 70, 1.5], ["peak", 100, 1.4, 4], ["peak", 2400, 1.3, 4], ["lp", 5000, 1.0]] },
    "8x10": { name: "8x10 sealed bass cabinet", bq: [["hp", 45, 1.2], ["peak", 70, 1.2, 3], ["peak", 700, 1.0, -2], ["lp", 3500, 0.8]] },
    none: { name: "No cabinet (line out)", bq: [] }
  };

  // ---------- the blocks ----------
  function triode(u) { return u >= 0 ? Math.tanh(u) : -1.5 * Math.tanh(-u / 1.5); }   // toward grid conduction = 1, cutoff = 1.5: even harmonics
  function stage(g, hp, lp, sr) { var aH = lpA(hp, sr), aL = lpA(lp, sr), h = 0, l = 0, d = 0;
    return function (x) { var y = triode(g * x); d += aH * (y - d); y -= d; l += aL * (y - l); return l; }; }
  function cond(v) { return v > 0 ? Math.tanh(v) + 0.05 * v / (1 + v) : 0.02 * Math.tanh(v); }   // one output valve: conducts above 0, saturates
  A.power = function (o, sr) {   // o { bias, drive, sag (0..1), out }
    var b = o.bias, sag = o.sag || 0, aA = lpA(1 / (TAU * 0.015), sr), aR = lpA(1 / (TAU * 0.18), sr), env = 0, V = 1, nrm = cond(b + 0.5) - cond(b - 0.5);
    return function (x) { var p = x * o.drive / V, y = V * (cond(b + p) - cond(b - p)) / nrm; var e = Math.abs(y); env += (e > env ? aA : aR) * (e - env); V = 1 / (1 + sag * env); return y * (o.out || 1); }; };
  function reverbTank(sr, mix) { if (mix <= 0) return function () { return 0; };
    var lens = [0.0297, 0.0371, 0.0411].map(function (t) { return Math.round(t * sr); }), bufs = lens.map(function (n) { return new Float32Array(n); }), w = [0, 0, 0], fb = 0.72,
      ap = [], hp = bq("hp", 350, 0.7, 0, sr), lp = bq("lp", 3800, 0.7, 0, sr), fh = bqRun(hp), fl = bqRun(lp);
    for (var s = 0; s < 3; s++) { ap.push([]); for (var k = 0; k < 8; k++) ap[s].push({ a: 0.6, z: 0 }); }
    return function (x) { var u = fl(fh(x)), out = 0;
      for (var s = 0; s < 3; s++) { var buf = bufs[s], n = lens[s], rd = buf[w[s]], v = u + fb * rd;
        for (var k = 0; k < 8; k++) { var q = ap[s][k], y = -q.a * v + q.z; q.z = v + q.a * y; v = y; }   // first-order all-pass chain: dispersion, the "chirp"
        buf[w[s]] = Math.tanh(v); w[s] = (w[s] + 1) % n; out += rd; }
      return out * mix * 0.5; }; }

  // ---------- the amps ----------
  var BIAS_A = 0.9, BIAS_AB = 0.25;
  A.AMPS = {
    twin: { name: "Fender Twin Reverb (blackface, AB763)", short: "Twin Reverb", maker: "Fender", year: 1963, family: "guitar", stack: "twin", order: "stack-first", cab: "2x12-jensen",
      watts: 85, rectifier: "solid state", tubes: "4 x 6L6GC", power: { bias: BIAS_AB, drive: 1.1, sag: 0.08 }, g1: 1.2, g2: 3.2, reverb: true, trem: "trem",
      controls: [["bright", "Bright", "s", false, true, null, false], K("volume", "Volume", 4), K("treble", "Treble", 6), K("middle", "Middle", 5), K("bass", "Bass", 4), K("reverb", "Reverb", 3), K("speed", "Speed", 5), K("intensity", "Intensity", 0)] },
    ac30: { name: "Vox AC30 Top Boost", short: "AC30", maker: "Vox (JMI)", year: 1963, family: "guitar", stack: "ac30", order: "stack-after", cab: "2x12-blue",
      watts: 30, rectifier: "valve (GZ34)", tubes: "4 x EL84, cathode biased", power: { bias: BIAS_A, drive: 1.8, sag: 0.3 }, g1: 1.4, g2: 6, cut: true, trem: "vibtrem",
      controls: [K("volume", "Brilliant volume", 5), K("treble", "Treble", 6), K("bass", "Bass", 5), K("cut", "Cut", 3), ["vt", "Vib-Trem", "c", ["off", "vibrato", "tremolo"], null, null, "off"], K("speed", "Speed", 5)] },
    plexi: { name: "Marshall 1959 Super Lead \"Plexi\" (jumpered)", short: "Plexi", maker: "Marshall", year: 1965, family: "guitar", stack: "plexi", order: "stack-after", cab: "4x12-celestion",
      watts: 100, rectifier: "solid state", tubes: "4 x EL34 (KT66 earlier)", power: { bias: BIAS_AB, drive: 2.2, sag: 0.12 }, g1: 1.5, g2: 7, jumper: true, presence: true, brightCh: 1,
      controls: [K("presence", "Presence", 5), K("bass", "Bass", 4), K("middle", "Middle", 7), K("treble", "Treble", 7), K("vol1", "Volume I (High Treble)", 7), K("vol2", "Volume II (Normal)", 4)] },
    bassman: { name: "Fender Bassman 5F6-A (tweed, 1958)", short: "Bassman", maker: "Fender", year: 1958, family: "guitar", stack: "bassman", order: "stack-after", cab: "4x10-jensen",
      watts: 45, rectifier: "valve (GZ34)", tubes: "2 x 6L6", power: { bias: BIAS_AB + 0.15, drive: 1.9, sag: 0.32 }, g1: 1.3, g2: 5, jumper: true, presence: true, brightCh: 0.6,
      controls: [K("presence", "Presence", 5), K("middle", "Middle", 5), K("bass", "Bass", 4), K("treble", "Treble", 6), K("vol1", "Bright volume", 5), K("vol2", "Normal volume", 3)] },
    rect: { name: "Mesa/Boogie Dual Rectifier (one channel)", short: "Dual Rectifier", maker: "Mesa/Boogie", year: 1991, family: "guitar", stack: "rect", order: "stack-after", cab: "4x12-closed",
      watts: 100, rectifier: "switch: silicon diodes or valve", tubes: "4 x 6L6", power: { bias: BIAS_AB, drive: 1.2, sag: 0.1 }, g1: 1.6, g2: 9, cascade: 2, presence: true, master: true,
      controls: [K("gain", "Gain", 6), K("treble", "Treble", 6), K("middle", "Mid", 4), K("bass", "Bass", 6), K("presence", "Presence", 5), K("master", "Master", 4),
        ["mode", "Mode", "c", ["raw", "vintage", "modern"], null, null, "modern"], ["rect", "Rectifier", "c", ["silicon", "tube"], null, null, "silicon"]] },
    svt: { name: "Ampeg SVT (bass)", short: "SVT", maker: "Ampeg", year: 1969, family: "bass", stack: "svt", order: "stack-first", cab: "8x10",
      watts: 300, rectifier: "solid state", tubes: "6 x 6550 (6146B in 1969-70)", power: { bias: BIAS_AB, drive: 0.9, sag: 0.06 }, g1: 1.0, g2: 3,
      controls: [K("volume", "Volume", 4), K("bass", "Bass", 6), K("middle", "Midrange", 5), K("treble", "Treble", 5), ["midf", "Midrange frequency", "c", ["220", "450", "800", "1600", "3000"], null, null, "800"],
        ["ultralo", "Ultra Lo", "s", false, true, null, false], ["ultrahi", "Ultra Hi", "s", false, true, null, false]] }
  };
  A.IDS = Object.keys(A.AMPS);
  function ctl(id, k) { var c = A.AMPS[id].controls; for (var i = 0; i < c.length; i++) if (c[i][0] === k) return c[i]; return null; }
  A.ctl = ctl;
  A.defaults = function (id) { var o = {}; A.AMPS[id].controls.forEach(function (c) { o[c[0]] = c[6]; }); return o; };
  A.clean = function (id, st) { var o = A.defaults(id); st = st || {}; A.AMPS[id].controls.forEach(function (c) { var v = st[c[0]]; if (v == null) return;
      if (c[2] === "k") o[c[0]] = Math.max(c[3], Math.min(c[4], +v)); else if (c[2] === "c") { if (c[3].indexOf(String(v)) >= 0) o[c[0]] = String(v); } else o[c[0]] = !!v; });
    if (st.cab && A.CABS[st.cab]) o.cab = st.cab; return o; };

  // the linear tone-shaping blocks as biquads (also used by curve()): bright cap, presence, Cut, SVT section, cab
  function svtEq(st) { var mid = (st.middle - 5) * 2.4; return [["ls", st.ultralo ? 50 : 80, 0.7, (st.bass - 5) * 3 + (st.ultralo ? 7 : 0)], ["peak", +st.midf, 0.9, mid + (st.ultralo ? -3 : 0)],
    ["hs", 3500, 0.7, (st.treble - 5) * 3], ["hs", 8000, 0.7, st.ultrahi ? 8 : 0]]; }
  function brightDb(P, st) { if (P.jumper) return P.brightCh * 10 * (1 - aud(st.vol1)) * (st.vol1 / 10 > 0 ? 1 : 0); if (st.bright) return 9 * (1 - aud(st.volume)); return 0; }
  function shapes(id, st) { var P = A.AMPS[id], L = [];
    var bd = brightDb(P, st); if (bd > 0.05) L.push(["hs", 1600, 0.7, bd]);
    if (P.stack === "svt") L = L.concat(svtEq(st));
    return L; }
  function post(id, st) { var P = A.AMPS[id], L = [];
    if (P.presence) L.push(["hs", 3000, 0.7, (st.presence - 5) * 1.6 + (P.stack === "rect" && st.mode === "modern" ? 2 : 0)]);
    return L; }
  A.cutFc = function (cut) { return 18000 * Math.pow(1600 / 18000, Math.max(0, Math.min(10, cut)) / 10); };
  function cabOf(id, st) { return A.CABS[st.cab || A.AMPS[id].cab] || A.CABS.none; }
  A.STACK_MAKEUP = { bassman: 4, twin: 4, plexi: 4, ac30: 5, rect: 4 };

  A.make = function (id, st, sr, o) { o = o || {}; st = A.clean(id, st); var P = A.AMPS[id];
    var pre = shapes(id, st).map(function (b) { return bq(b[0], b[1], b[2], b[3], sr); }), preF = chain(pre);
    var stackF = P.stack === "svt" ? function (x) { return x; } : (function () { var k = A.stackKnobs(id, st), z = bilinear3(A.stackCoef(A.STACKS[P.stack], k.t, k.m, k.l), sr), f = iir3(z), g = A.STACK_MAKEUP[P.stack]; return function (x) { return f(x) * g; }; })();
    var s1 = stage(P.g1 * 1.2, P.family === "bass" ? 10 : (P.stack === "plexi" ? 60 : 25), 12000, sr), s1b = stage(P.g1, 20, 6000, sr);
    var vol, vol2 = 0; if (P.jumper) { vol = aud(st.vol1); vol2 = aud(st.vol2); } else if (P.master) vol = aud(st.gain); else vol = aud(st.volume);
    var mode = st.mode || "modern", g2 = P.g2 * (mode === "vintage" ? 0.5 : mode === "raw" ? 0.75 : 1);
    var s2 = stage(g2, P.family === "bass" ? 12 : 35, 9000, sr), casc = [];
    for (var i = 0; i < (P.cascade || 0); i++) casc.push(stage(mode === "vintage" ? 2.5 : 4, 90, 7000 - i * 1500, sr));
    var cf = function (x) { return x > 0.8 ? 0.8 + 0.2 * Math.tanh((x - 0.8) / 0.2) : x; };   // cathode follower: clips on the way up
    var sag = P.power.sag; if (P.stack === "rect") sag = st.rect === "tube" ? 0.32 : 0.1;
    var master = P.master ? aud(st.master) * 2.2 : 1, pa = A.power({ bias: P.power.bias, drive: P.power.drive * master, sag: sag, out: 0.5 }, sr);
    var postF = chain(post(id, st).map(function (b) { return bq(b[0], b[1], b[2], b[3], sr); }));
    var cutA = P.cut ? lpA(A.cutFc(st.cut), sr) : 0, cutS = 0;
    var cabF = o.noCab ? function (x) { return x; } : chain(cabOf(id, st).bq.map(function (b) { return bq(b[0], b[1], b[2], b[3] || 0, sr); }));
    var rev = P.reverb && !o.noFx ? reverbTank(sr, aud(st.reverb) * 1.6) : null;
    var lfoF = 1.5 + 8.5 * (st.speed || 0) / 10, n = 0, tremDepth = P.trem === "trem" ? st.intensity / 10 : (st.vt === "tremolo" ? 0.6 : 0), vib = P.trem === "vibtrem" && st.vt === "vibrato" && !o.noFx;
    if (o.noFx) tremDepth = 0;
    var vbuf = new Float32Array(Math.ceil(sr * 0.01)), vw = 0;
    return function (x) {
      var y;
      if (P.order === "stack-first") { y = s1(x); y = stackF(preF(y)); y = s2(y * vol * 3); if (rev) y += rev(y); }
      else { y = P.jumper ? s1(preF(x)) * vol + s1b(x) * vol2 * 0.8 : s1(x) * vol; if (!P.jumper) y = preF(y);
        y = s2(y * 2); for (var i = 0; i < casc.length; i++) y = casc[i](y * 1.6); y = stackF(cf(y)); }
      if (tremDepth > 0) { var ph = (lfoF * n / sr) % 1, l = 0.5 + 0.5 * Math.sin(TAU * ph); l = Math.pow(l, 1.6); y *= 1 - tremDepth * l; }
      if (vib) { vbuf[vw] = y; var d = (0.0015 + 0.0012 * Math.sin(TAU * lfoF * n / sr)) * sr, p = vw - d; while (p < 0) p += vbuf.length; var i0 = Math.floor(p), fr = p - i0; y = vbuf[i0 % vbuf.length] * (1 - fr) + vbuf[(i0 + 1) % vbuf.length] * fr; vw = (vw + 1) % vbuf.length; }
      n++;
      y = pa(y);
      if (P.cut) { cutS += cutA * (y - cutS); y = cutS; }
      y = postF(y);
      return cabF(y); };
  };
  A.process = function (id, st, x, sr, o) { var f = A.make(id, st, sr, o), y = new Float32Array(x.length); for (var i = 0; i < x.length; i++) y[i] = f(x[i]); return y; };

  // the linear tone path in dB at f (stack + bright + presence / Cut + cab), at 48 kHz
  A.curve = function (id, st, f) { st = A.clean(id, st); var P = A.AMPS[id], sr = 48000, db = 0;
    if (P.stack !== "svt") { var k = A.stackKnobs(id, st); db += 20 * Math.log10(A.stackH(A.STACKS[P.stack], k.t, k.m, k.l, f) + 1e-12); }
    shapes(id, st).concat(post(id, st)).forEach(function (b) { db += 20 * Math.log10(bqMag(bq(b[0], b[1], b[2], b[3], sr), f, sr)); });
    if (P.cut) { var fc = A.cutFc(st.cut); db -= 10 * Math.log10(1 + (f / fc) * (f / fc)); }
    cabOf(id, st).bq.forEach(function (b) { db += 20 * Math.log10(bqMag(bq(b[0], b[1], b[2], b[3] || 0, sr), f, sr)); });
    return db; };

  // ---------- translation ----------
  var BANDS = []; for (var bi = 0; bi < 14; bi++) BANDS.push(80 * Math.pow(2, bi / 2));
  function shape(id, st) { var v = BANDS.map(function (f) { return A.curve(id, st, f); }), m = v.reduce(function (a, b) { return a + b; }, 0) / v.length; return v.map(function (x) { return x - m; }); }
  var TEST = null;
  function testSig(sr) { if (TEST) return TEST; var n = Math.round(sr * 0.12), x = new Float32Array(n); for (var i = 0; i < n; i++) { var t = i / sr, s = 0; [110, 165, 220].forEach(function (f0) { for (var h = 1; h <= 8; h++) s += Math.sin(TAU * f0 * h * t + h) / h; }); x[i] = 0.12 * s; } return (TEST = x); }
  // how hard the amp is driven: level change (dB) for a 12 dB change of input (12 = clean, lower = compressed / distorted), tone path skipped
  A.drive = function (id, st) { var sr = 16000, x = testSig(sr), r = function (g) { var f = A.make(id, st, sr, { noCab: true, noFx: true }), s = 0; for (var i = 0; i < x.length; i++) { var y = f(x[i] * g); if (i > 600) s += y * y; } return Math.sqrt(s); };
    return 20 * Math.log10(r(1) / (r(0.25) + 1e-12) + 1e-12); };
  function knobs(id, filter) { return A.AMPS[id].controls.filter(function (c) { return filter(c[0], c); }); }
  var GAINK = /^(volume|vol1|vol2|gain|master|mode|rect)$/, TONEK = /^(treble|middle|bass|presence|cut|bright|midf|ultralo|ultrahi)$/;
  function grid(cs, step) { var out = [{}]; cs.forEach(function (c) { var vals = c[2] === "c" ? c[3] : c[2] === "s" ? [false, true] : []; if (c[2] === "k") for (var v = c[3]; v <= c[4] + 1e-9; v += step) vals.push(Math.round(v * 10) / 10);
      var nx = []; out.forEach(function (o) { vals.forEach(function (v) { var p = Object.assign({}, o); p[c[0]] = v; nx.push(p); }); }); out = nx; }); return out; }
  var NOTES = {
    "twin>ac30": ["The AC30 has no Middle knob: the Top Boost is the Fender stack with the middle control taken out (Wikipedia). The closest Treble / Bass / Cut is chosen.", "Lost: spring reverb (the AC30 has none).", "The AC30 breaks up much sooner (30 W, no negative feedback, a valve rectifier): the same clean sound needs a low volume."],
    "ac30>twin": ["The Twin has no Cut: Treble is used instead.", "The Twin stays clean far louder (85 W, solid-state rectifier, negative feedback): the AC30's chime-into-crunch needs the Twin's volume high, and it never compresses the same way.", "Vibrato (pitch) is lost: the Twin's \"vibrato\" is really tremolo (Wikipedia)."],
    "plexi>bassman": ["The same tone-stack circuit, different values: the Bassman's bigger 56k slope resistor and 250 pF treble capacitor give a different curve; the knobs are moved to match.", "Marshall's higher-gain ECC83s and the cap/resistor filter after the volume (Wikipedia, \"Marshall Amplification\") mean the Bassman needs more volume for the same crunch, and its valve rectifier sags more."],
    "bassman>plexi": ["The Plexi is the Bassman's circuit made hotter and brighter (Wikipedia, JTM45 history), into a closed 4x12: the treble comes down to match the open 4x10."],
    "rect>plexi": ["A Plexi cannot reach a Dual Rectifier's gain: two more cascaded gain stages. The closest is both volumes up.", "Lost: Mode and the rectifier switch."],
    "plexi>rect": ["The Rectifier has the gain to spare: its Gain is set low and the Master sets how hard the power amp works."],
    "svt>twin": ["A guitar amp for a bass: the Twin's tone stack and open 2x12 roll off the low end the SVT's 8x10 keeps.", "Lost: the five-position midrange and the Ultra switches."],
    "twin>svt": ["The SVT is a bass amp (Wikipedia: built for the Rolling Stones' 1969 tour, where it carried guitars too); its 8x10 has far less top."]
  };
  A.translate = function (from, st, to) { st = A.clean(from, st); var Pf = A.AMPS[from], Pt = A.AMPS[to], notes = (NOTES[from + ">" + to] || []).slice();
    if (from === to) return { state: Object.assign({}, st), quality: "exact", notes: [], dist: 0 };
    var want = A.drive(from, st), wantS = shape(from, st), best = null;
    var gk = knobs(to, function (k) { return GAINK.test(k); }), tk = knobs(to, function (k) { return TONEK.test(k); });
    grid(gk, 1).forEach(function (g) { var s = Object.assign(A.defaults(to), g), d = Math.abs(A.drive(to, s) - want); if (!best || d < best.d) best = { s: s, d: d }; });
    var dDrive = best.d, base = best.s, tb = null;
    grid(tk, tk.filter(function (c) { return c[2] === "k"; }).length > 3 ? 2 : 1).forEach(function (g) { var s = Object.assign({}, base, g), v = shape(to, s), e = 0; for (var i = 0; i < v.length; i++) e += (v[i] - wantS[i]) * (v[i] - wantS[i]); e = Math.sqrt(e / v.length); if (!tb || e < tb.e) tb = { s: s, e: e }; });
    var state = tb.s; if (Pt.reverb && Pf.reverb) state.reverb = st.reverb;
    if (Pf.reverb && !Pt.reverb && st.reverb > 0.5) notes.push("Lost: the spring reverb (the " + Pt.short + " has none).");
    if (Pf.trem && !Pt.trem && ((st.intensity || 0) > 0 || (st.vt && st.vt !== "off"))) notes.push("Lost: the " + (Pf.trem === "vibtrem" ? "vibrato / tremolo" : "tremolo") + " (the " + Pt.short + " has none).");
    if (Pf.trem === "trem" && Pt.trem === "vibtrem" && st.intensity > 0) { state.vt = "tremolo"; state.speed = st.speed; }
    if (Pf.trem === "vibtrem" && Pt.trem === "trem" && st.vt !== "off") { state.intensity = 6; state.speed = st.speed; }
    if (Pf.family !== Pt.family) notes.push("A " + Pf.family + " amp into a " + Pt.family + " amp: the cabinets cover different ranges, so the match is only over the shared bands.");
    if (Pf.cut && !Pt.cut) notes.push("The " + Pt.short + " has no Cut knob: its Treble / Presence stands in.");
    var dist = tb.e + dDrive * 0.4, q = dist < 1.5 ? "exact" : dist < 5 ? "approx" : "lost"; if (q === "exact" && notes.length) q = "approx";
    notes.push("Tone curves matched within " + tb.e.toFixed(1) + " dB (rms over 80 Hz-8 kHz); drive within " + dDrive.toFixed(1) + " dB of compression.");
    return { state: state, quality: q, notes: notes, dist: dist }; };
  A.summary = function (id, st) { st = A.clean(id, st); var P = A.AMPS[id], b = [P.short];
    P.controls.forEach(function (c) { if (c[2] === "k") b.push(c[1].replace(/ \(.*\)/, "") + " " + (+st[c[0]]).toFixed(1).replace(/\.0$/, "")); else if (c[2] === "c") b.push(c[1] + ": " + st[c[0]]); else if (st[c[0]]) b.push(c[1] + " on"); }); return b.join(", "); };

  if (typeof module !== "undefined" && module.exports) { module.exports = A; }
  if (typeof document === "undefined") { global.Amps = A; return; }

  // ======================= browser: sound =======================
  var ctx = null, master = null, playing = [];
  function ac() { if (!ctx) { ctx = new (global.AudioContext || global.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.6;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "Amps"); }
    if (ctx.state === "suspended") ctx.resume(); return ctx; }
  A.ctx = function () { return ac(); };
  A.stop = function () { playing.forEach(function (s) { try { s.stop(); } catch (e) {} }); playing = []; };
  var PREFS = { guitar: "", gvol: 10, pedals: "none" };
  try { Object.assign(PREFS, JSON.parse(localStorage.getItem("amp-prefs") || "{}")); } catch (e) {}
  function savePrefs() { try { localStorage.setItem("amp-prefs", JSON.stringify(PREFS)); } catch (e) {} }
  A.prefs = PREFS;
  function guitarFor(id) { var GP = global.GuitarPickups, fam = A.AMPS[id].family; if (!GP) return null;
    if (PREFS.guitar && GP.GUITARS[PREFS.guitar] && (GP.GUITARS[PREFS.guitar].family === "bass") === (fam === "bass")) return PREFS.guitar;
    return fam === "bass" ? GP.BASS_IDS[0] : "strat"; }
  A.guitarFor = guitarFor;
  function source(id, kind, sr) { var GP = global.GuitarPickups, g = guitarFor(id);
    if (GP && g) { var fam = GP.GUITARS[g].family, notes = GP.notes(kind, 110, fam), st = GP.defaults(g); Object.keys(st).forEach(function (k) { if (/^vol/.test(k)) st[k] = 10; });
      var x = GP.render(g, st, notes, { sr: sr }), pk = 1e-6; for (var i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i])); var s = 0.5 / pk; for (var j = 0; j < x.length; j++) x[j] *= s; return x; }
    var len = Math.round(sr * 2.4), y = new Float32Array(len); [[45, 0], [52, 0.5], [57, 1], [52, 1.5]].forEach(function (m) { var f = 440 * Math.pow(2, (m[0] - 69) / 12), t0 = Math.round(m[1] * sr);
      for (var i = 0; i + t0 < len; i++) { var t = i / sr, s = 0; for (var h = 1; h < 10; h++) s += Math.sin(TAU * f * h * t) / h * Math.exp(-t * (1 + h)); y[i + t0] += 0.15 * s; } }); return y; }
  function pedalChain() { var PD = global.Pedals; if (!PD || PREFS.pedals === "none") return [];
    if (PREFS.pedals === "board") { var b = document.querySelector(".pdb"); return b && b._pdb ? b._pdb.chain.map(function (W) { return { id: W.id, st: W.st }; }) : []; }
    return PREFS.pedals.split("+").filter(function (p) { return PD.PEDALS[p]; }).map(function (p) { return { id: p, st: {} }; }); }
  A.pedalChain = pedalChain;
  A.render = function (id, st, kind, sr) { var x = source(id, kind || "riff", sr), pad = new Float32Array(x.length + Math.round(sr * 1.5)); pad.set(x);
    var ch = pedalChain(), PD = global.Pedals, inp = ch.length && PD ? PD.run(ch, pad, sr, { gvol: PREFS.gvol }) : pad.map(function (v) { return v * aud(PREFS.gvol); });
    return { input: inp, output: A.process(id, st, inp, sr) }; };
  A.play = function (id, st, kind) { var c = ac(); A.stop(); var r = A.render(id, st, kind, c.sampleRate), y = r.output, pk = 1e-6; for (var i = 0; i < y.length; i++) pk = Math.max(pk, Math.abs(y[i]));
    var g = Math.min(1, 0.7 / pk), buf = c.createBuffer(1, y.length, c.sampleRate), d = buf.getChannelData(0); for (var j = 0; j < y.length; j++) d[j] = y[j] * g;
    var src = c.createBufferSource(); src.buffer = buf; src.connect(master); src.start(); playing.push(src);
    if (global.PlayBar && PlayBar.sounding) { PlayBar.sounding("amps", A.stop); src.onended = function () { PlayBar.sounding("amps", null); }; }
    return r; };

  // ======================= browser: widgets =======================
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  A.adapter = function (W) { var subs = []; W._notify = function () { subs.forEach(function (f) { f(); }); };
    return { get: function (k) { return W.st[k]; }, set: function (k, v) { W.set(k, v); }, onChange: function (cb) { subs.push(cb); },
      range: function (k) { var c = ctl(W.id, k); return c || null; } }; };
  function playBar(host, playFn, getId) { var bar = h("div", "amp-bar");
    [["pluck", "▶ One note"], ["chord", "▶ Chord"], ["riff", "▶ Riff"], ["lead", "▶ Lead line"]].forEach(function (b) { var x = h("button", "amp-play", b[1]); x.type = "button"; x.dataset.play = b[0]; x.onclick = function () { playFn(b[0]); }; bar.appendChild(x); });
    var s = h("button", "amp-stop", "■ Stop"); s.type = "button"; s.onclick = A.stop; bar.appendChild(s); host.appendChild(bar);
    var op = h("div", "amp-opts"); host.appendChild(op);
    function pick(label, key, list) { var l = h("label", null, label + " "), se = h("select"); list.forEach(function (x) { var o = h("option", null, x[1]); o.value = x[0]; se.appendChild(o); }); se.value = PREFS[key]; se.onchange = function () { PREFS[key] = se.value; savePrefs(); }; l.appendChild(se); op.appendChild(l); return se; }
    var GP = global.GuitarPickups, gl = [["", "Match the amp (Strat, or a bass for the SVT)"]]; if (GP) GP.IDS.concat(GP.BASS_IDS || []).forEach(function (id) { gl.push([id, GP.GUITARS[id].name]); });
    pick("Instrument", "guitar", gl);
    var vl = h("label", null, "Guitar volume "), vr = h("input"), vv = h("span", "amp-gv"); vr.type = "range"; vr.min = 0; vr.max = 10; vr.step = 0.5; vr.value = PREFS.gvol; vr.className = "amp-gvol";
    vr.oninput = function () { PREFS.gvol = +vr.value; vv.textContent = vr.value; savePrefs(); }; vv.textContent = PREFS.gvol; vl.appendChild(vr); vl.appendChild(vv); op.appendChild(vl);
    var pl = [["none", "No pedals"]], PD = global.Pedals; if (PD) { PD.IDS.forEach(function (p) { pl.push([p, PD.PEDALS[p].short]); }); pl.push(["ts808+dm2", "Tube Screamer + DM-2"]); }
    if (document.querySelector(".pdb")) pl.push(["board", "The pedalboard on this page"]);
    pick("Pedals in front", "pedals", pl); return bar; }
  function plot(el, id, st) {   // the tone path's curve, 50 Hz-10 kHz
    var W = 560, H = 140, f0 = 50, f1 = 10000, d = "", mn = 1e9, mx = -1e9, pts = [];
    for (var i = 0; i <= 120; i++) { var f = f0 * Math.pow(f1 / f0, i / 120), v = A.curve(id, st, f); pts.push(v); mn = Math.min(mn, v); mx = Math.max(mx, v); }
    var top = Math.ceil((mx + 3) / 10) * 10, bot = top - 50; pts.forEach(function (v, i) { d += (i ? "L" : "M") + (i / 120 * W).toFixed(1) + " " + ((top - v) / (top - bot) * H).toFixed(1); });
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="amp-svg" role="img" aria-label="Frequency response of the tone controls and cabinet"><rect width="' + W + '" height="' + H + '" class="amp-bg"/>';
    [100, 1000, 10000].forEach(function (f) { var x = Math.log(f / f0) / Math.log(f1 / f0) * W; s += '<line x1="' + x + '" x2="' + x + '" y1="0" y2="' + H + '" class="amp-grid"/><text x="' + (x + 3) + '" y="' + (H - 4) + '">' + (f >= 1000 ? f / 1000 + " kHz" : f + " Hz") + '</text>'; });
    el.innerHTML = s + '<path d="' + d + '" class="amp-line"/><text x="6" y="12">tone stack + bright / presence / Cut + cabinet (10 dB a step); the valves are left out</text></svg>'; }
  A.widgets = [];
  function face(host, W) { host.innerHTML = ""; if (!global.FaithfulPanel) { host.textContent = "(panel script missing)"; return; }
    FaithfulPanel.load("amp-" + W.id).then(function () { W.face = FaithfulPanel.mount(host, { id: "amp-" + W.id, adapter: W.A }); }).catch(function () { host.textContent = "(panel drawing failed to load)"; }); }
  function ampW(id, st, onChange) { var W = { id: id, st: A.clean(id, st) }; W.A = A.adapter(W);
    W.set = function (k, v) { var s = Object.assign({}, W.st); s[k] = v; W.st = A.clean(W.id, s); W._notify(); if (onChange) onChange(W); };
    W.setAll = function (s) { W.st = A.clean(W.id, Object.assign({}, W.st, s)); W._notify(); if (onChange) onChange(W); }; return W; }
  A.mount = function (el, o) { o = o || {}; var W = ampW(o.amp || "twin", o.state, function () { info(); }); A.widgets.push(W); el.classList.add("amp-w"); el.innerHTML = "";
    var head = h("div", "amp-head"), title = h("b", "amp-title"); head.appendChild(title); el.appendChild(head);
    if (o.choose) { var se = h("select", "amp-pick"); se.setAttribute("aria-label", "Amp"); A.IDS.forEach(function (id) { var op = h("option", null, A.AMPS[id].name); op.value = id; se.appendChild(op); }); se.onchange = function () { W.setAmp(se.value); }; head.appendChild(se); W.pick = se; }
    var fh = h("div", "amp-face"); el.appendChild(fh); playBar(el, function (k) { W.play(k); }); var pl = h("div", "amp-plot"), inf = h("p", "amp-info"); el.appendChild(pl); el.appendChild(inf);
    function info() { var P = A.AMPS[W.id]; inf.textContent = A.summary(W.id, W.st) + ". " + P.maker + ", " + P.year + "; " + P.watts + " W, " + P.tubes + ", rectifier " + P.rectifier + "; cabinet: " + A.CABS[P.cab].name + "."; plot(pl, W.id, W.st); }
    W.setAmp = function (id, st) { W.id = id; W.st = A.clean(id, st || {}); title.textContent = A.AMPS[id].name; if (W.pick) W.pick.value = id; face(fh, W); info(); };
    W.play = function (k) { return A.play(W.id, W.st, k); };
    W.draw = info; W.setAmp(W.id, W.st); return W; };
  A.compare = function (el) { el.innerHTML = ""; var cols = h("div", "ampc-cols"), a = h("div", "ampc-a"), b = h("div", "ampc-b"); cols.appendChild(a); cols.appendChild(b); el.appendChild(cols);
    var q = new URLSearchParams(location.search), ia = q.get("a") || el.dataset.a || "twin", ib = q.get("b") || el.dataset.b || "ac30"; if (!A.AMPS[ia]) ia = "twin"; if (!A.AMPS[ib]) ib = "ac30";
    var WA = A.mount(a, { amp: ia, choose: true }), WB = A.mount(b, { amp: ib, choose: true });
    var box = h("div", "ampc-tr"), go = h("button", "ampc-go", "Translate left → right"), back = h("button", "ampc-back", "Translate right → left"), res = h("div", "ampc-res"); go.type = back.type = "button";
    box.appendChild(go); box.appendChild(back); box.appendChild(res); el.appendChild(box);
    function run(F, T) { var r = A.translate(F.id, F.st, T.id); T.setAll(r.state); res.innerHTML = ""; var p = h("p"); p.innerHTML = "<b></b> → <b></b> <span class=\"ampc-q ampc-" + r.quality + "\">" + r.quality + "</span>";
      p.querySelectorAll("b")[0].textContent = A.summary(F.id, F.st); p.querySelectorAll("b")[1].textContent = A.summary(T.id, r.state); res.appendChild(p);
      var ul = h("ul"); r.notes.forEach(function (n) { ul.appendChild(h("li", null, n)); }); res.appendChild(ul); el.dataset.quality = r.quality; return r; }
    go.onclick = function () { run(WA, WB); }; back.onclick = function () { run(WB, WA); }; el._ampc = { a: WA, b: WB, run: run }; return el._ampc; };

  // ---------- intro pages ----------
  function steps() { var n = 0; document.querySelectorAll(".amp-step").forEach(function (s) { n++; var b = h("button", "amp-hear", "▶ Hear step " + n); b.type = "button";
      b.onclick = function () { var W = A.widgets.filter(function (w) { return w.id === s.dataset.amp; })[0] || A.widgets[0]; if (!W) return; var set = s.dataset.set ? JSON.parse(s.dataset.set) : {};
        if (set.gvol != null) { PREFS.gvol = set.gvol; document.querySelectorAll(".amp-gvol").forEach(function (r) { r.value = set.gvol; r.nextSibling.textContent = set.gvol; }); delete set.gvol; }
        if (set.pedals != null) { PREFS.pedals = set.pedals; delete set.pedals; }
        W.st = A.clean(W.id, Object.assign(A.defaults(W.id), set)); W._notify(); W.draw(); W.play(s.dataset.play || "riff"); };
      s.insertBefore(b, s.firstChild); }); }
  function quiz(q) { var a = +q.dataset.a, why = q.querySelector(".amp-why"); if (why) why.hidden = true;
    q.querySelectorAll("li").forEach(function (li, i) { li.tabIndex = 0; li.setAttribute("role", "button"); var f = function () { q.querySelectorAll("li").forEach(function (x) { x.classList.remove("amp-right", "amp-wrong"); }); li.classList.add(i === a ? "amp-right" : "amp-wrong"); if (why) why.hidden = false; };
      li.onclick = f; li.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; }); }
  var TR = null; A.tracks = function () { return TR || (TR = fetch("/apps/shared/data/amps/tracks.json").then(function (r) { return r.json(); })); };
  function tracks(el) { A.tracks().then(function (d) { var want = el.dataset.amp, list = d.tracks.filter(function (t) { return t.amp === want; }), ul = h("ul", "amp-tl");
      list.forEach(function (t) { var li = h("li"), a = h("a", null, t.artist + ", “" + t.song + "”"); a.href = t.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); li.appendChild(document.createTextNode(" ↗ (" + t.channel + "). "));
        li.appendChild(h("span", "amp-who", t.player + ". " + (t.useSrc ? "Amp use: " + t.useSrc + "." : "That this amp is on the record: unverified (no source found).") + " "));
        if (t.state) { var b = h("button", "amp-try", "Try a guess"); b.type = "button"; b.title = "This site's guess at a setting (no source)"; b.onclick = function () { var W = A.widgets.filter(function (w) { return w.id === want; })[0]; if (W) { W.setAll(t.state); W.play(t.play || "riff"); } }; li.appendChild(b); }
        ul.appendChild(li); }); el.innerHTML = ""; el.appendChild(ul); el.dataset.n = list.length; }).catch(function () { el.textContent = "(the track list did not load)"; }); }
  A.init = function () { document.querySelectorAll(".amp[data-amp]").forEach(function (e) { A.mount(e, { amp: e.dataset.amp }); });
    document.querySelectorAll(".ampc").forEach(function (e) { A.compare(e); });
    steps(); document.querySelectorAll(".amp-q").forEach(quiz); document.querySelectorAll(".amp-tracks").forEach(tracks); };
  global.Amps = A;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", A.init); else A.init();
})(typeof window !== "undefined" ? window : globalThis);
