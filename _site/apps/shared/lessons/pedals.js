// Pedals: guitar effects pedals the way the site does guitars and synths. A circuit-informed model of each pedal (pure maths, sample
// by sample, runs in node: tests/lessons/pedals.test.js), a faithful drawing of each pedal's face (FaithfulPanel host adapter,
// panels/pd-<id>.js), a pedalboard (drag to reorder, bypass each, translate one pedal into a similar one), and the sound: the
// guitar model (GuitarPickups.render) through the chain, into SynthKit's amp. Pages: lessons/pedal-compare.qmd, lessons/intro-<pedal>.qmd.
//
// THE MODELS (what is from a source and what is this site's is said per pedal; sources in scripts/sources/pedals.py)
//   ts808  Tube Screamer. Clipping stage = non-inverting op-amp, gain 1 + (51k + Drive)/4.7k with the 4.7k in series with 0.047 uF
//          (a high-pass, about 720 Hz) in the feedback leg, so only the mids and highs get the gain; the lows pass at unity (the
//          "mid hump", Wikipedia: boosts mids, cuts bass). Two diodes across the feedback: the clipped part is ADDED to the clean
//          input (soft clipping). 51 pF across the feedback: a low-pass that falls as Drive rises. Tone: a 723 Hz low-pass blended
//          with the full signal. Resistor / capacitor values: from memory of the schematic (ElectroSmash's analysis unreachable
//          2026-11-26): unverified. Audio-taper Drive and Level: the site's.
//   fuzzface  Fuzz Face (1966, Arbiter). Two transistors with feedback, modelled as one high gain stage with an asymmetric (biased)
//          clipper: even harmonics, as germanium fuzz is said to have (site's reading). Its input impedance is LOW (ElectroSmash
//          simulation 5.2-8.4 kOhm with the Fuzz pot, from a search summary) so it loads the pickup: at guitar volume 10 the
//          pickup's inductance into that load loses treble, turned down the pot's resistance isolates the pickup, the level drops
//          and the fuzz cleans up (Wikipedia, "Fuzz Face"). PD.loading(gvol, zin) does that; gain curve and bias are the site's.
//   bigmuff  Big Muff Pi (1969, Electro-Harmonix). Input booster (Sustain), two clipping stages each with a diode pair in its
//          feedback, a tone stack that blends a low-pass and a high-pass (a mid scoop at noon, about 1 kHz), an output booster
//          (Wikipedia "Big Muff"; scoop frequency from a student report found by search). Corners 408 Hz (39k, 10 nF) and 1.54 kHz
//          (22k, 4.7 nF) and the stage gains are the site's choices (unverified for any one version).
//   crybaby  Cry Baby wah (Plunkett, Thomas Organ, 1966-67). A band-pass resonance swept by the treadle (Wikipedia, "Wah-wah
//          pedal"); a fixed inductor and capacitor tuned by a pot. Sweep 400 Hz (heel) to 2.2 kHz (toe), Q 4: site's values (an
//          LTspice analysis found by search gives a resonance near 2.1 kHz). Auto modes (the page rocks the treadle, or the playing
//          does: an envelope) stand in for a foot.
//   phase90  Phase 90 (MXR, 1974). Four first-order all-pass stages swept by one LFO (Speed), mixed with the dry signal: two
//          notches (ElectroSmash outline / DAFx 2024, from search summaries). Feedback switch: the logo versions differ in
//          feedback (a builder's forum post); which had it is unverified here. LFO range 0.1-8 Hz and sweep 250-2000 Hz: site's.
//   ce2    Boss CE-2 Chorus (late 1979). A bucket-brigade delay (MN3007) of a few ms swept by a triangle LFO, Rate and Depth only
//          (Guitar World), mixed 50/50 with the dry signal. Delay 1.5-7.5 ms, rate 0.1-7 Hz, the 7 kHz BBD filter: site's.
//   dm2    Boss DM-2 (1981) analog delay: 20-300 ms (Boss on the DM-2W's Standard mode), Repeat Rate clockwise = shorter, Echo =
//          the repeats' level, Intensity = how many (0 = one repeat), high Intensity self-oscillates (Guitar World). A BBD of N =
//          4096 stages (MN3005, a seller's listing) has delay T = N / (2 f_clock), so a longer delay = a slower clock = less
//          bandwidth (about N / 4T): the filter in the loop darkens every repeat, more so at long times. Taper of the Repeat Rate
//          knob and the soft clip in the loop: site's.
//   echoplex  Echoplex EP-3 (Maestro, solid state, 1970). Tape loop with a record head moved to set the delay (Wikipedia,
//          "Echoplex"), Repeats, Echo volume. Delay 60-750 ms, wow 0.5 Hz / flutter 7 Hz depths, tape saturation and head
//          filters (80 Hz-5 kHz) and the preamp colour: all the site's (unverified).
//   Not listened against real pedals. Not modelled: noise, power-supply sag, the true-bypass vs buffered switching of each.
//
// API
//   Pedals.PEDALS[id] { name, short, maker, year, kind: "drive"|"wah"|"mod"|"delay", controls: [[key, label, "k", min, max, step, def]
//                       | [key, label, "c", [values], null, null, def] | ["on", "On", "s", false, true, null, true]], make(st, sr) -> f(x) }
//   Pedals.IDS, .defaults(id), .clean(id, st), .process(id, st, Float32Array, sr) -> Float32Array (bypassed = a copy)
//   Pedals.run(chain [{id, st}], input, sr, { gvol }) -> Float32Array   (gvol: the guitar's volume knob, for the Fuzz Face's load)
//   Pedals.loading(gvol, zin) -> { gain, fc }    Pedals.muffTone(f, tone) -> |H|    Pedals.phaserResponse(fc, f, stages) -> |H|
//   Pedals.wahFreq(pos) -> Hz    Pedals.dm2Time(rate) -> s    Pedals.dm2Band(T) -> Hz    Pedals.describe(id, st) -> numbers
//   Pedals.translate(fromId, st, toId) -> { state, quality: "exact"|"approx"|"lost", notes: [text], dist }
//   Pedals.adapter(widget) -> FaithfulPanel host adapter      Pedals.mount(el, { pedal, choose }) -> widget
//   Pedals.board(el, { chain: [ids] }) -> board { chain: [{id, st}], move(i, j), swap(i, toId), toggle(i), play(kind) }
//   Page markup: <div class="pdp" data-pedal="ts808"></div> (one pedal)   <div class="pdc" data-a="fuzzface" data-b="bigmuff"></div> (compare)
//                <div class="pdb" data-chain="ts808,phase90,dm2"></div> (pedalboard)
//                <div class="pd-step" data-pedal="ts808" data-set='{"drive":8}' data-play="riff">text</div>  (tour step)
//                <div class="pd-q" data-a="1"><p>q</p><ul><li>..</li></ul><p class="pd-why">..</p></div>  <div class="pd-tracks" data-pedal="ts808"></div>
(function (global) {
  var PD = {}, TAU = 2 * Math.PI;
  function lpA(fc, sr) { return 1 - Math.exp(-TAU * Math.min(fc, sr * 0.45) / sr); }
  PD.taper = function (v) { var x = Math.max(0, Math.min(10, v)) / 10; return x <= 0.5 ? x * 0.2 : 0.1 + (x - 0.5) * 1.8; };   // audio taper, the guitar pages' curve
  var aud = PD.taper;
  function ring(n) { return { b: new Float32Array(n), w: 0, n: n }; }
  function rread(r, d) { var p = r.w - d; while (p < 0) p += r.n; var i = Math.floor(p), f = p - i, a = r.b[i % r.n], b = r.b[(i + 1) % r.n]; return a + (b - a) * f; }
  function rwrite(r, x) { r.b[r.w] = x; r.w = (r.w + 1) % r.n; }
  var ON = ["on", "On (footswitch)", "s", false, true, null, true], K = function (k, l, d) { return [k, l, "k", 0, 10, 0.1, d]; };

  PD.PEDALS = {
    ts808: { name: "Ibanez Tube Screamer TS808", short: "Tube Screamer", maker: "Ibanez (Nisshin)", year: 1979, kind: "drive",
      controls: [K("drive", "Drive", 5), K("tone", "Tone", 5), K("level", "Level", 6), ON],
      make: function (st, sr) { var Rd = 500e3 * aud(st.drive), G = (51e3 + Rd) / 4.7e3, aH = lpA(720, sr), aL = lpA(1 / (TAU * (51e3 + Rd) * 51e-12), sr), aT = lpA(723, sr), tone = st.tone / 10, lvl = aud(st.level) * 2.2, h = 0, l = 0, t = 0;
        return function (x) { h += aH * (x - h); l += aL * ((x - h) * (G - 1) - l); var y = x + 0.6 * Math.tanh(l / 0.6); t += aT * (y - t); return (t + tone * (y - t)) * lvl; }; } },
    fuzzface: { name: "Arbiter Fuzz Face", short: "Fuzz Face", maker: "Arbiter", year: 1966, kind: "drive", loads: true,
      controls: [K("fuzz", "Fuzz", 8), K("vol", "Volume", 6), ON],
      zin: function (st) { return 8400 - 3200 * st.fuzz / 10; },   // 5.2-8.4 k (ElectroSmash, search summary); lower with more Fuzz: site's assumption
      make: function (st, sr) { var f = st.fuzz / 10, G = 3 + 50 * f * f, b = 0.04, sat = function (u) { return u > 0 ? Math.tanh(u) : 0.7 * Math.tanh(u / 0.7); }, tb = sat(G * b), aD = lpA(25, sr), aL = lpA(6000, sr), v = aud(st.vol) * 0.9, d = 0, l = 0;
        return function (x) { var y = sat(G * (x + b)) - tb; /* the bias moves the crossing (uneven duty), the rails differ: even harmonics */ d += aD * (y - d); l += aL * ((y - d) - l); return l * v; }; } },
    bigmuff: { name: "Electro-Harmonix Big Muff Pi", short: "Big Muff", maker: "Electro-Harmonix", year: 1969, kind: "drive",
      controls: [K("sustain", "Sustain", 7), K("tone", "Tone", 5), K("volume", "Volume", 6), ON],
      make: function (st, sr) { var g1 = 1 + 40 * aud(st.sustain), A = 25, aH = lpA(100, sr), aC = lpA(3500, sr), aLP = lpA(408, sr), aHP = lpA(1540, sr), t = st.tone / 10, v = aud(st.volume) * 2.6;
        var s = [0, 0, 0, 0], lp = 0, hp = 0;
        function stage(x, i) { s[i] += aH * (x - s[i]); var y = 0.7 * Math.tanh((x - s[i]) * A / 0.7); s[i + 2] += aC * (y - s[i + 2]); return s[i + 2]; }
        return function (x) { var y = stage(stage(Math.tanh(x * g1), 0), 1); lp += aLP * (y - lp); hp += aHP * (y - hp); return ((1 - t) * lp + t * (y - hp)) * v; }; } },
    crybaby: { name: "Dunlop Cry Baby wah", short: "Cry Baby", maker: "Thomas Organ, later Dunlop", year: 1966, kind: "wah",
      controls: [K("pos", "Treadle (heel 0, toe 10)", 5), ["mode", "Who moves it", "c", ["foot", "rock", "env"], null, null, "rock"], K("rate", "Rocking speed", 4), ON],
      make: function (st, sr) { var p0 = st.pos / 10, rate = 0.3 + 3.7 * st.rate / 10, n = 0, b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0, env = 0, aE = lpA(8, sr);
        function coef(p) { var f = PD.wahFreq(p), w = TAU * f / sr, al = Math.sin(w) / (2 * PD.WAH_Q), a0 = 1 + al; b0 = al / a0; b1 = 0; b2 = -al / a0; a1 = -2 * Math.cos(w) / a0; a2 = (1 - al) / a0; }
        return function (x) { env += aE * (Math.abs(x) - env);
          if ((n++ & 15) === 0) { var p = st.mode === "foot" ? p0 : st.mode === "env" ? Math.min(1, env * 12) : 0.5 - 0.5 * Math.cos(TAU * rate * n / sr); coef(p); }
          var y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y * 2.4 + x * 0.08; }; } },
    phase90: { name: "MXR Phase 90", short: "Phase 90", maker: "MXR", year: 1974, kind: "mod",
      controls: [K("speed", "Speed", 3), ["fb", "Feedback resistor", "c", ["on", "off"], null, null, "on"], ON],
      rate: function (st) { return 0.1 * Math.pow(80, st.speed / 10); },
      make: function (st, sr) { var rate = PD.PEDALS.phase90.rate(st), fb = st.fb === "on" ? 0.4 : 0, z = [0, 0, 0, 0], last = 0, n = 0, a = 0;
        return function (x) { if ((n & 7) === 0) { var fc = PD.PH_LO * Math.pow(PD.PH_HI / PD.PH_LO, 0.5 - 0.5 * Math.cos(TAU * rate * n / sr)), tt = Math.tan(Math.PI * fc / sr); a = (tt - 1) / (tt + 1); } n++;
          var u = x + fb * last; for (var i = 0; i < 4; i++) { var y = a * u + z[i]; z[i] = u - a * y; u = y; } last = u; return 0.5 * (x + u); }; } },
    ce2: { name: "Boss CE-2 Chorus", short: "CE-2", maker: "Boss", year: 1979, kind: "mod",
      controls: [K("rate", "Rate", 3), K("depth", "Depth", 5), ON],
      rate: function (st) { return 0.1 * Math.pow(70, st.rate / 10); }, depthMs: function (st) { return 6 * st.depth / 10; },
      make: function (st, sr) { var r = ring(Math.ceil(sr * 0.02)), rate = PD.PEDALS.ce2.rate(st), dep = PD.PEDALS.ce2.depthMs(st), aL = lpA(7000, sr), l = 0, n = 0;
        return function (x) { var ph = (rate * n++ / sr) % 1, tri = ph < 0.5 ? ph * 2 : 2 - ph * 2, d = (1.5 + dep * tri) * sr / 1000; rwrite(r, x); l += aL * (rread(r, d) - l); return 0.5 * x + 0.5 * l; }; } },
    dm2: { name: "Boss DM-2 Delay", short: "DM-2", maker: "Boss", year: 1981, kind: "delay",
      controls: [K("rate", "Repeat Rate", 5), K("echo", "Echo", 6), K("intensity", "Intensity", 4), ON],
      make: function (st, sr) { var T = PD.dm2Time(st.rate), D = T * sr, r = ring(Math.ceil(D) + 4), a = lpA(PD.dm2Band(T), sr), fb = 1.05 * st.intensity / 10, wet = 1.2 * st.echo / 10, l1 = 0, l2 = 0;
        return function (x) { var y = rread(r, D); l1 += a * (y - l1); l2 += a * (l1 - l2); rwrite(r, x + 0.8 * Math.tanh(fb * l2 / 0.8)); return x + wet * l2; }; } },
    echoplex: { name: "Maestro Echoplex EP-3", short: "Echoplex", maker: "Maestro (Market Electronics)", year: 1970, kind: "delay",
      controls: [K("delay", "Echo delay (head position)", 5), K("repeats", "Repeats", 4), K("echo", "Echo volume", 6), ON],
      time: function (st) { return 0.06 + 0.69 * st.delay / 10; },
      make: function (st, sr) { var T = PD.PEDALS.echoplex.time(st), r = ring(Math.ceil((T * 1.01) * sr) + 8), fb = 1.05 * st.repeats / 10, wet = st.echo / 10, aH = lpA(80, sr), aL = lpA(5000, sr), h = 0, l = 0, n = 0;
        return function (x) { var t = n++ / sr, d = T * sr * (1 + 0.003 * Math.sin(TAU * 0.5 * t) + 0.001 * Math.sin(TAU * 7 * t)), y = rread(r, d); h += aH * (y - h); l += aL * ((y - h) - l);
          var pre = Math.tanh(1.3 * x) / 1.3; rwrite(r, Math.tanh(pre + fb * l)); return pre + wet * l; }; } }
  };
  PD.IDS = Object.keys(PD.PEDALS);
  PD.WAH_Q = 4; PD.WAH_LO = 400; PD.WAH_HI = 2200; PD.PH_LO = 250; PD.PH_HI = 2000;
  PD.wahFreq = function (p) { return PD.WAH_LO * Math.pow(PD.WAH_HI / PD.WAH_LO, Math.max(0, Math.min(1, p))); };
  PD.dm2Time = function (rate) { return 0.3 * Math.pow(0.02 / 0.3, Math.max(0, Math.min(10, rate)) / 10); };
  PD.dm2Band = function (T) { return Math.min(8000, 0.8 * 4096 / (4 * T)); };
  function ctl(id, k) { var c = PD.PEDALS[id].controls; for (var i = 0; i < c.length; i++) if (c[i][0] === k) return c[i]; return null; }
  PD.ctl = ctl;
  PD.defaults = function (id) { var o = {}; PD.PEDALS[id].controls.forEach(function (c) { o[c[0]] = c[6]; }); return o; };
  PD.clean = function (id, st) { var o = PD.defaults(id); st = st || {}; PD.PEDALS[id].controls.forEach(function (c) { var v = st[c[0]]; if (v == null) return;
      if (c[2] === "k") o[c[0]] = Math.max(c[3], Math.min(c[4], +v)); else if (c[2] === "c") { if (c[3].indexOf(v) >= 0) o[c[0]] = v; } else o[c[0]] = !!v; }); return o; };
  PD.process = function (id, st, x, sr) { st = PD.clean(id, st); var y = new Float32Array(x.length); if (!st.on) { y.set(x); return y; }
    var f = PD.PEDALS[id].make(st, sr); for (var i = 0; i < x.length; i++) y[i] = f(x[i]); return y; };
  // the guitar's volume pot and pickup into a load zin (ohm): Thevenin source a * V, R = 250k a (1 - a) + a^2 (6 k), L = a^2 (2.4 H)
  // (pickup values the guitar pages' estimates, unverified) -> level and a first-order treble corner
  PD.loading = function (gvol, zin) { var a = aud(gvol == null ? 10 : gvol); if (a <= 0) return { gain: 0, fc: 20000 };
    var R = 250e3 * a * (1 - a) + a * a * 6000, L = a * a * 2.4; return { gain: a * zin / (zin + R), fc: Math.min(20000, (zin + R) / (TAU * L)) }; };
  PD.run = function (chain, input, sr, o) { o = o || {}; var x = input;
    if (o.gvol != null) {   // the guitar's volume knob, seen by the first pedal that is switched on (bypassed ones treated as true bypass)
      var p0 = chain.filter(function (p) { return PD.clean(p.id, p.st).on; })[0], y = new Float32Array(x.length);
      if (p0 && PD.PEDALS[p0.id].loads) { var ld = PD.loading(o.gvol, PD.PEDALS[p0.id].zin(PD.clean(p0.id, p0.st))), a = lpA(ld.fc, sr), l = 0;
        for (var i = 0; i < x.length; i++) { l += a * (x[i] - l); y[i] = l * ld.gain; } }
      else { var g = aud(o.gvol); for (var k = 0; k < x.length; k++) y[k] = x[k] * g; }
      x = y; }
    chain.forEach(function (p) { x = PD.process(p.id, p.st, x, sr); }); return x; };
  // analytic responses (for the pictures and the tests)
  function cx(re, im) { return { re: re, im: im }; }
  function lp1(f, fc) { var r = f / fc, d = 1 + r * r; return cx(1 / d, -r / d); } function hp1(f, fc) { var r = f / fc, d = 1 + r * r; return cx(r * r / d, r / d); }
  PD.muffTone = function (f, tone) { var t = tone / 10, a = lp1(f, 408), b = hp1(f, 1540); return Math.hypot((1 - t) * a.re + t * b.re, (1 - t) * a.im + t * b.im); };
  PD.phaserResponse = function (fc, f, stages) { var ph = -2 * stages * Math.atan(f / fc); return Math.hypot(0.5 + 0.5 * Math.cos(ph), 0.5 * Math.sin(ph)); };   // no feedback
  PD.tsGain = function (drive) { return 1 + (51e3 + 500e3 * aud(drive)) / 4.7e3; };

  // ---------- translation ----------
  var TEST = null;
  function testSignal(sr) { if (TEST) return TEST; var n = Math.round(sr * 0.14), x = new Float32Array(n);
    for (var i = 0; i < n; i++) { var t = i / sr, s = 0; [110, 165, 220].forEach(function (f0) { for (var h = 1; h <= 12; h++) s += Math.sin(TAU * f0 * h * t + h) / h; }); x[i] = 0.06 * s * Math.exp(-t * 3); } return (TEST = x); }
  function goertzel(x, f, sr, from) { var w = TAU * f / sr, c = 2 * Math.cos(w), s1 = 0, s2 = 0; for (var i = from; i < x.length; i++) { var s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; } return s1 * s1 + s2 * s2 - c * s1 * s2; }
  function finger(id, st) { var sr = 16000, y = PD.process(id, Object.assign({}, st, { on: true }), testSignal(sr), sr), from = 400, bands = [], tot = 0, rms = 0, pk = 0;
    for (var b = 0; b < 18; b++) { var fc = 100 * Math.pow(2, b / 3), e = 0; [-1, 0, 1].forEach(function (d) { e += goertzel(y, fc * Math.pow(2, d / 9), sr, from); }); bands.push(e); tot += e; }
    for (var i = from; i < y.length; i++) { rms += y[i] * y[i]; pk = Math.max(pk, Math.abs(y[i])); } rms = Math.sqrt(rms / (y.length - from));
    var v = bands.map(function (e) { return Math.max(-40, 10 * Math.log10(e / (tot + 1e-20) + 1e-12)); }); v.push(20 * Math.log10(pk / (rms + 1e-9)) * 2); v.push(Math.max(-30, 20 * Math.log10(rms + 1e-9)) * 0.3); return v; }
  PD.describe = function (id, st) { st = PD.clean(id, st); var P = PD.PEDALS[id];
    if (id === "phase90") return { rate: P.rate(st), depth: 3, fb: st.fb === "on" ? 1 : 0 };
    if (id === "ce2") return { rate: P.rate(st), depth: P.depthMs(st), fb: 0 };
    if (id === "dm2") return { time: PD.dm2Time(st.rate), fb: 1.05 * st.intensity / 10, mix: 1.2 * st.echo / 10 };
    if (id === "echoplex") return { time: P.time(st), fb: 1.05 * st.repeats / 10, mix: st.echo / 10 };
    if (id === "crybaby") return { pos: st.pos, mode: st.mode, rate: st.rate };
    return { finger: finger(id, st) }; };
  function dvec(a, b) { var s = 0; for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; } return Math.sqrt(s / a.length); }
  function ddesc(a, b) { if (a.finger) return dvec(a.finger, b.finger);
    if (a.time != null) return Math.abs(Math.log(a.time / b.time)) * 8 + Math.abs(a.fb - b.fb) * 10 + Math.abs(a.mix - b.mix) * 5;
    return Math.abs(Math.log(a.rate / b.rate)) * 6 + Math.abs(a.depth - b.depth) * 1 + Math.abs(a.fb - b.fb) * 2; }
  function grid(id, step) { var ks = PD.PEDALS[id].controls.filter(function (c) { return c[2] !== "s"; }), out = [{}];
    ks.forEach(function (c) { var vals = c[2] === "c" ? c[3] : []; if (c[2] === "k") for (var v = c[3]; v <= c[4] + 1e-9; v += step) vals.push(Math.round(v * 10) / 10);
      var nx = []; out.forEach(function (o) { vals.forEach(function (v) { var p = Object.assign({}, o); p[c[0]] = v; nx.push(p); }); }); out = nx; }); return out; }
  var NOTES = {
    "fuzzface>bigmuff": ["The Big Muff has a Tone knob: at noon its blend of a low-pass and a high-pass scoops the mids (about 1 kHz). The Fuzz Face has no tone control, so Tone is set where the match is closest.",
      "Lost: clean-up with the guitar's volume knob. The Fuzz Face's low input impedance (about 5-8 kOhm) loads the pickup; the Big Muff's input stage does not, so turning the guitar down mostly makes it quieter.",
      "The Big Muff's two clipping stages in a row compress harder: more sustain, less of the Fuzz Face's touch."],
    "bigmuff>fuzzface": ["Lost: the Big Muff's mid scoop and Tone knob. The Fuzz Face has only Fuzz and Volume.", "Gained: the Fuzz Face cleans up when the guitar's volume is turned down (try the guitar volume slider).", "Less sustain: one clipping stage instead of two."],
    "ts808>fuzzface": ["The Tube Screamer clips only what is above about 720 Hz and passes the lows clean; the Fuzz Face clips everything, so the low end gets fuzzy and the mid hump is lost.", "The Fuzz Face has no Tone knob."],
    "ts808>bigmuff": ["The Tube Screamer's mid hump becomes the Big Muff's mid scoop: nearly opposite curves. The Tone knob is set to the closest overall balance.", "The Big Muff clips the whole signal, lows too: far more gain than a Tube Screamer can reach."],
    "fuzzface>ts808": ["The Tube Screamer's most gain (about 118 times, 41 dB, in this model) is far less than a fuzz: a full-up Fuzz Face cannot be matched.", "The lows stay clean on the Tube Screamer (its gain is above about 720 Hz only).", "Lost: guitar-volume clean-up of the Fuzz Face kind (the Tube Screamer has a buffered input)."],
    "bigmuff>ts808": ["The Tube Screamer cannot reach a Big Muff's gain, and its mid hump is the opposite of the Muff's scoop.", "Its Tone knob is set to the closest balance."],
    "phase90>ce2": ["A phaser's notches come from all-pass phase shift; a chorus's comb comes from a short delay that moves, so it also wobbles the pitch slightly. Rate is matched; the sweep is not the same sound.", "Lost: the Phase 90's feedback (the CE-2 has none)."],
    "ce2>phase90": ["The Phase 90 has no Depth knob (its sweep is fixed) and no pitch wobble. Speed is matched to Rate.", "Its two notches sound more vocal than a chorus's many."],
    "dm2>echoplex": ["Gained: tape wow and flutter (the repeats waver in pitch) and tape saturation.", "The Echoplex's delay is set by sliding the record head; the time is matched."],
    "echoplex>dm2": ["Lost: tape wow and flutter; the DM-2's bucket-brigade repeats are steady in pitch.", "The DM-2 reaches only 300 ms: a longer Echoplex delay is cut to 300 ms."]
  };
  PD.translate = function (from, st, to) { st = PD.clean(from, st); var Pf = PD.PEDALS[from], Pt = PD.PEDALS[to], notes = (NOTES[from + ">" + to] || []).slice();
    if (from === to) return { state: Object.assign({}, st), quality: "exact", notes: [], dist: 0 };
    var same = Pf.kind === Pt.kind; if (!same) return { state: Object.assign(PD.defaults(to), { on: st.on }), quality: "lost", dist: Infinity,
      notes: ["A " + kindName(Pf.kind) + " and a " + kindName(Pt.kind) + " do different jobs: nothing on the " + Pt.short + " sounds like this " + Pf.short + " setting. The " + Pt.short + " is left at its defaults."] };
    var want = PD.describe(from, st), best = null;
    grid(to, Pt.kind === "drive" ? 2 : 0.5).forEach(function (g) { var s = Object.assign(PD.defaults(to), g), d = ddesc(want, PD.describe(to, s)); if (!best || d < best.d) best = { s: s, d: d }; });
    best.s.on = st.on;
    var thr = Pt.kind === "drive" ? [2.5, 7] : [1.5, 8], q = best.d < thr[0] ? "exact" : best.d < thr[1] ? "approx" : "lost";
    if (q === "exact" && notes.length) q = "approx";
    if (to === "dm2" && want.time > 0.3) notes.push("Wanted " + Math.round(want.time * 1000) + " ms: the DM-2 stops at 300 ms.");
    return { state: best.s, quality: q, notes: notes, dist: best.d }; };
  function kindName(k) { return { drive: "drive (fuzz / overdrive)", wah: "wah", mod: "modulation pedal", delay: "delay" }[k]; }
  PD.summary = function (id, st) { st = PD.clean(id, st); var P = PD.PEDALS[id], b = [P.short + (st.on ? "" : " (bypassed)")];
    P.controls.forEach(function (c) { if (c[2] === "k") b.push(c[1].replace(/ \(.*\)/, "") + " " + (+st[c[0]]).toFixed(1).replace(/\.0$/, "")); else if (c[2] === "c") b.push(c[1] + ": " + st[c[0]]); }); return b.join(", "); };

  if (typeof module !== "undefined" && module.exports) { module.exports = PD; }
  if (typeof document === "undefined") { global.Pedals = PD; return; }

  // ======================= browser: sound =======================
  var ctx = null, master = null, amp = null, playing = [];
  function ac() { if (!ctx) { ctx = new (global.AudioContext || global.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "Pedals"); }
    if (ctx.state === "suspended") ctx.resume(); return ctx; }
  PD.ctx = function () { return ac(); };
  var AMPS = { clean: { gain: 2, bass: 5, mid: 5, treble: 6, master: 4, presence: 5 }, crunch: { gain: 5, bass: 5, mid: 6, treble: 6, master: 4, presence: 6 }, none: null };
  function chainOut(kind) { var c = ac(); if (amp) { try { amp.output.disconnect(); amp.stop(); } catch (e) {} amp = null; }
    var dry = c.createGain(); if (kind === "none" || !global.SynthKit || !SynthKit.fx) { dry.connect(master); return dry; }
    amp = SynthKit.fx("amp", c, AMPS[kind] || AMPS.clean); dry.connect(amp.input); amp.output.connect(master); return dry; }
  PD.stop = function () { playing.forEach(function (s) { try { s.stop(); } catch (e) {} }); playing = []; };
  var PREFS = { guitar: "strat", gvol: 10, amp: "clean" };
  try { Object.assign(PREFS, JSON.parse(localStorage.getItem("pd-prefs") || "{}")); } catch (e) {}
  function savePrefs() { try { localStorage.setItem("pd-prefs", JSON.stringify(PREFS)); } catch (e) {} }
  PD.prefs = PREFS;
  function source(kind, sr) {   // the guitar model at full volume (the volume knob is applied by PD.run), or a plain pluck
    var GP = global.GuitarPickups, notes;
    if (GP && GP.GUITARS[PREFS.guitar]) { notes = GP.notes(kind, 110); var st = GP.defaults(PREFS.guitar); Object.keys(st).forEach(function (k) { if (/^vol/.test(k)) st[k] = 10; });
      var x = GP.render(PREFS.guitar, st, notes, { sr: sr }), ref = GP.level("strat", GP.defaults("strat"), 110) * 0.8, n = 0.3 / Math.max(1e-6, ref) * 0.25; for (var i = 0; i < x.length; i++) x[i] *= n * 2.2; return x; }
    var len = Math.round(sr * 2.4), y = new Float32Array(len); [[45, 0], [52, 0.5], [57, 1], [52, 1.5]].forEach(function (m) { var f = 440 * Math.pow(2, (m[0] - 69) / 12), t0 = Math.round(m[1] * sr);
      for (var i = 0; i + t0 < len; i++) { var t = i / sr, s = 0; for (var h = 1; h < 10; h++) s += Math.sin(TAU * f * h * t) / h * Math.exp(-t * (1 + h)); y[i + t0] += 0.2 * s; } }); return y; }
  PD.play = function (chain, kind) { var c = ac(); PD.stop(); var x = source(kind || "riff", c.sampleRate), tail = chain.some(function (p) { return PD.PEDALS[p.id].kind === "delay"; }) ? 3 : 0.3;
    var pad = new Float32Array(x.length + Math.round(tail * c.sampleRate)); pad.set(x); var y = PD.run(chain, pad, c.sampleRate, { gvol: PREFS.gvol });
    var buf = c.createBuffer(1, y.length, c.sampleRate); buf.getChannelData(0).set(y); var src = c.createBufferSource(); src.buffer = buf; src.connect(chainOut(PREFS.amp)); src.start(); playing.push(src);
    if (global.PlayBar && PlayBar.sounding) { PlayBar.sounding("pedals", PD.stop); src.onended = function () { PlayBar.sounding("pedals", null); }; }
    return { input: pad, output: y }; };

  // ======================= browser: widgets =======================
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  PD.adapter = function (W) { var subs = []; W._notify = function () { subs.forEach(function (f) { f(); }); };
    return { get: function (k) { return W.st[k]; }, set: function (k, v) { W.set(k, v); }, onChange: function (cb) { subs.push(cb); },
      range: function (k) { var c = ctl(W.id, k); if (!c) return null; return c[2] === "c" ? [c[0], c[1], "c", c[3], null, null, c[6]] : c; } }; };
  function playBar(host, playFn) { var bar = h("div", "pdp-bar");
    [["pluck", "▶ One note"], ["chord", "▶ Chord"], ["riff", "▶ Riff"], ["lead", "▶ Lead line"]].forEach(function (b) { var x = h("button", "pdp-play", b[1]); x.type = "button"; x.dataset.play = b[0]; x.onclick = function () { playFn(b[0]); }; bar.appendChild(x); });
    var s = h("button", "pdp-stop", "■ Stop"); s.type = "button"; s.onclick = PD.stop; bar.appendChild(s); host.appendChild(bar);
    var op = h("div", "pdp-opts"); host.appendChild(op);
    function pick(label, key, list) { var l = h("label", null, label + " "), se = h("select"); list.forEach(function (x) { var o = h("option", null, x[1]); o.value = x[0]; se.appendChild(o); }); se.value = PREFS[key]; se.onchange = function () { PREFS[key] = se.value; savePrefs(); }; l.appendChild(se); op.appendChild(l); }
    var GP = global.GuitarPickups; pick("Guitar", "guitar", (GP ? GP.IDS : ["strat"]).map(function (id) { return [id, GP ? GP.GUITARS[id].name : id]; }));
    var gl = h("label", null, "Guitar volume "), gr = h("input"), gv = h("span", "pdp-gv"); gr.type = "range"; gr.min = 0; gr.max = 10; gr.step = 0.5; gr.value = PREFS.gvol; gr.className = "pdp-gvol";
    gr.oninput = function () { PREFS.gvol = +gr.value; gv.textContent = gr.value; savePrefs(); }; gv.textContent = PREFS.gvol; gl.appendChild(gr); gl.appendChild(gv); op.appendChild(gl);
    pick("Amp", "amp", [["clean", "Clean amp"], ["crunch", "Crunch amp"], ["none", "No amp"]]); return bar; }
  function wave(el, inp, out, sr) {   // what goes in and what comes out, min / max per pixel, the first 2.4 s
    var W = 560, H = 120, n = Math.min(inp.length, Math.round(sr * 2.4)), per = Math.max(1, Math.floor(n / W)), s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="pdp-svg" role="img" aria-label="Waveform in and out"><rect width="' + W + '" height="' + H + '" class="pdp-bg"/>';
    [[inp, H * 0.27, "pdp-in"], [out, H * 0.73, "pdp-out"]].forEach(function (r) { var mx = 1e-6; for (var i = 0; i < n; i++) mx = Math.max(mx, Math.abs(r[0][i])); var d = "";
      for (var x = 0; x < W; x++) { var lo = 0, hi = 0; for (var j = x * per; j < Math.min(n, (x + 1) * per); j++) { lo = Math.min(lo, r[0][j]); hi = Math.max(hi, r[0][j]); } d += "M" + x + " " + (r[1] - hi / mx * H * 0.22).toFixed(1) + "V" + (r[1] - lo / mx * H * 0.22).toFixed(1); }
      s += '<path d="' + d + '" class="' + r[2] + '"/>'; });
    el.innerHTML = s + '<text x="6" y="12">in (the guitar)</text><text x="6" y="' + (H / 2 + 12) + '">out (after the pedals, before the amp; each scaled to fit)</text></svg>'; }
  PD.widgets = [];
  function face(host, W) { host.innerHTML = ""; if (!global.FaithfulPanel) { host.textContent = "(panel script missing)"; return; }
    FaithfulPanel.load("pd-" + W.id).then(function () { W.face = FaithfulPanel.mount(host, { id: "pd-" + W.id, adapter: W.A }); }).catch(function () { host.textContent = "(panel drawing failed to load)"; }); }
  function pedalW(id, st, onChange) { var W = { id: id, st: PD.clean(id, st) }; W.A = PD.adapter(W);
    W.set = function (k, v) { var s = Object.assign({}, W.st); s[k] = v; W.st = PD.clean(W.id, s); W._notify(); if (onChange) onChange(W); };
    W.setAll = function (s) { W.st = PD.clean(W.id, Object.assign({}, W.st, s)); W._notify(); if (onChange) onChange(W); }; return W; }
  PD.mount = function (el, o) { o = o || {}; var W = pedalW(o.pedal || "ts808", o.state, function () { info(); }); PD.widgets.push(W); el.classList.add("pdp-w"); el.innerHTML = "";
    var head = h("div", "pdp-head"), title = h("b", "pdp-title"); head.appendChild(title); el.appendChild(head);
    if (o.choose) { var se = h("select", "pdp-pick"); se.setAttribute("aria-label", "Pedal"); PD.IDS.forEach(function (id) { var op = h("option", null, PD.PEDALS[id].name); op.value = id; se.appendChild(op); }); se.onchange = function () { W.setPedal(se.value); }; head.appendChild(se); W.pick = se; }
    var fh = h("div", "pdp-face"); el.appendChild(fh); playBar(el, function (k) { W.play(k); }); var plot = h("div", "pdp-plot"), inf = h("p", "pdp-info"); el.appendChild(plot); el.appendChild(inf);
    function info() { inf.textContent = PD.summary(W.id, W.st) + ". " + PD.PEDALS[W.id].maker + ", " + PD.PEDALS[W.id].year + "."; }
    W.setPedal = function (id, st) { W.id = id; W.st = PD.clean(id, st || {}); title.textContent = PD.PEDALS[id].name; if (W.pick) W.pick.value = id; face(fh, W); info(); };
    W.play = function (k) { var r = PD.play([{ id: W.id, st: W.st }], k); wave(plot, r.input, r.output, PD.ctx().sampleRate); return r; };
    W.draw = info; W.setPedal(W.id, W.st); return W; };
  PD.compare = function (el) { el.innerHTML = ""; var cols = h("div", "pdc-cols"), a = h("div", "pdc-a"), b = h("div", "pdc-b"); cols.appendChild(a); cols.appendChild(b); el.appendChild(cols);
    var q = new URLSearchParams(location.search), ia = q.get("a") || el.dataset.a || "fuzzface", ib = q.get("b") || el.dataset.b || "bigmuff"; if (!PD.PEDALS[ia]) ia = "fuzzface"; if (!PD.PEDALS[ib]) ib = "bigmuff";
    var WA = PD.mount(a, { pedal: ia, choose: true }), WB = PD.mount(b, { pedal: ib, choose: true });
    var box = h("div", "pdc-tr"), go = h("button", "pdc-go", "Translate left → right"), back = h("button", "pdc-back", "Translate right → left"), res = h("div", "pdc-res"); go.type = back.type = "button";
    box.appendChild(go); box.appendChild(back); box.appendChild(res); el.appendChild(box);
    function run(F, T) { var r = PD.translate(F.id, F.st, T.id); T.setAll(r.state); report(res, F, T, r); el.dataset.quality = r.quality; return r; }
    go.onclick = function () { run(WA, WB); }; back.onclick = function () { run(WB, WA); }; el._pdc = { a: WA, b: WB, run: run }; return el._pdc; };
  function report(res, F, T, r) { res.innerHTML = ""; var p = h("p"); p.innerHTML = "<b></b> → <b></b> <span class=\"pdc-q pdc-" + r.quality + "\">" + r.quality + "</span>";
    p.querySelectorAll("b")[0].textContent = PD.summary(F.id, F.st); p.querySelectorAll("b")[1].textContent = PD.summary(T.id, r.state); res.appendChild(p);
    if (r.notes.length) { var ul = h("ul"); r.notes.forEach(function (n) { ul.appendChild(h("li", null, n)); }); res.appendChild(ul); } }
  // ---------- the pedalboard ----------
  var SIMILAR = { drive: ["fuzzface", "bigmuff", "ts808"], mod: ["phase90", "ce2"], delay: ["dm2", "echoplex"], wah: ["crybaby"] };
  PD.board = function (el, o) { o = o || {}; el.innerHTML = ""; el.classList.add("pdb-w");
    var B = { chain: [] }, ids = (o.chain || (el.dataset.chain || "crybaby,fuzzface,phase90,dm2").split(",")).filter(function (id) { return PD.PEDALS[id]; });
    var flow = h("p", "pdb-flow"), row = h("div", "pdb-row"), add = h("div", "pdb-add"), res = h("div", "pdb-res"); el.appendChild(flow); el.appendChild(row); el.appendChild(add);
    playBar(el, function (k) { B.play(k); }); var plot = h("div", "pdp-plot"); el.appendChild(plot); el.appendChild(res);
    var as = h("select", "pdb-addsel"); as.setAttribute("aria-label", "Add a pedal"); PD.IDS.forEach(function (id) { var op = h("option", null, PD.PEDALS[id].name); op.value = id; as.appendChild(op); });
    var ab = h("button", "pdb-addb", "+ Add to the end"); ab.type = "button"; ab.onclick = function () { B.chain.push(pedalW(as.value, {}, upd)); draw(); }; add.appendChild(as); add.appendChild(ab);
    function upd() { flow.textContent = "Guitar → " + B.chain.map(function (W) { return PD.PEDALS[W.id].short + (W.st.on ? "" : " (off)"); }).join(" → ") + " → Amp"; }
    var dragFrom = null;
    function draw() { row.innerHTML = ""; B.chain.forEach(function (W, i) { var card = h("div", "pdb-card"); card.draggable = true; card.dataset.i = i;
        var top = h("div", "pdb-top"), grip = h("span", "pdb-grip", "⠿"); grip.title = "Drag to move"; top.appendChild(grip); top.appendChild(h("b", null, (i + 1) + ". " + PD.PEDALS[W.id].short));
        [["←", "Move earlier", -1], ["→", "Move later", 1]].forEach(function (m) { var bt = h("button", "pdb-mv", m[0]); bt.type = "button"; bt.title = m[1]; bt.setAttribute("aria-label", m[1] + ": " + PD.PEDALS[W.id].short); bt.disabled = i + m[2] < 0 || i + m[2] >= B.chain.length; bt.onclick = function () { B.move(i, i + m[2]); }; top.appendChild(bt); });
        var x = h("button", "pdb-rm", "✕"); x.type = "button"; x.title = "Remove"; x.setAttribute("aria-label", "Remove " + PD.PEDALS[W.id].short); x.onclick = function () { B.chain.splice(i, 1); draw(); }; top.appendChild(x); card.appendChild(top);
        var fh = h("div", "pdb-face"); card.appendChild(fh); face(fh, W);
        var sw = h("label", "pdb-swap", "Translate to "), ss = h("select"), opt0 = h("option", null, "…"); opt0.value = ""; ss.appendChild(opt0);
        SIMILAR[PD.PEDALS[W.id].kind].concat(PD.IDS.filter(function (id) { return SIMILAR[PD.PEDALS[W.id].kind].indexOf(id) < 0; })).forEach(function (id) { if (id === W.id) return; var op = h("option", null, PD.PEDALS[id].short); op.value = id; ss.appendChild(op); });
        ss.onchange = function () { if (ss.value) B.swap(i, ss.value); }; sw.appendChild(ss); card.appendChild(sw);
        card.addEventListener("dragstart", function (e) { dragFrom = i; card.classList.add("pdb-drag"); try { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; } catch (er) {} });
        card.addEventListener("dragend", function () { card.classList.remove("pdb-drag"); });
        card.addEventListener("dragover", function (e) { e.preventDefault(); });
        card.addEventListener("drop", function (e) { e.preventDefault(); if (dragFrom != null && dragFrom !== i) B.move(dragFrom, i); dragFrom = null; });
        row.appendChild(card); }); upd(); el.dataset.order = B.chain.map(function (W) { return W.id; }).join(","); }
    B.move = function (i, j) { if (j < 0 || j >= B.chain.length) return; var W = B.chain.splice(i, 1)[0]; B.chain.splice(j, 0, W); draw(); };
    B.toggle = function (i) { B.chain[i].set("on", !B.chain[i].st.on); };
    B.swap = function (i, to) { var F = B.chain[i], r = PD.translate(F.id, F.st, to), T = pedalW(to, r.state, upd); report(res, F, T, r); el.dataset.quality = r.quality; B.chain[i] = T; draw(); return r; };
    B.play = function (k) { var r = PD.play(B.chain.map(function (W) { return { id: W.id, st: W.st }; }), k); wave(plot, r.input, r.output, PD.ctx().sampleRate); return r; };
    ids.forEach(function (id) { B.chain.push(pedalW(id, {}, upd)); }); draw(); el._pdb = B; return B; };

  // ---------- intro pages ----------
  function steps() { var n = 0; document.querySelectorAll(".pd-step").forEach(function (s) { n++; var b = h("button", "pd-hear", "▶ Hear step " + n); b.type = "button";
      b.onclick = function () { var W = PD.widgets.filter(function (w) { return w.id === s.dataset.pedal; })[0] || PD.widgets[0]; if (!W) return; var set = s.dataset.set ? JSON.parse(s.dataset.set) : {};
        if (set.gvol != null) { PREFS.gvol = set.gvol; document.querySelectorAll(".pdp-gvol").forEach(function (r) { r.value = set.gvol; r.nextSibling.textContent = set.gvol; }); delete set.gvol; }
        W.st = PD.clean(W.id, Object.assign(PD.defaults(W.id), set)); W._notify(); W.draw(); W.play(s.dataset.play || "riff"); };
      s.insertBefore(b, s.firstChild); }); }
  function quiz(q) { var a = +q.dataset.a, why = q.querySelector(".pd-why"); if (why) why.hidden = true;
    q.querySelectorAll("li").forEach(function (li, i) { li.tabIndex = 0; li.setAttribute("role", "button"); var f = function () { q.querySelectorAll("li").forEach(function (x) { x.classList.remove("pd-right", "pd-wrong"); }); li.classList.add(i === a ? "pd-right" : "pd-wrong"); if (why) why.hidden = false; };
      li.onclick = f; li.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; }); }
  var TR = null; PD.tracks = function () { return TR || (TR = fetch("/apps/shared/data/pedals/tracks.json").then(function (r) { return r.json(); })); };
  function tracks(el) { PD.tracks().then(function (d) { var want = el.dataset.pedal, list = d.tracks.filter(function (t) { return t.pedal === want; }), ul = h("ul", "pd-tl");
      list.forEach(function (t) { var li = h("li"), a = h("a", null, t.artist + ", “" + t.song + "”"); a.href = t.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); li.appendChild(document.createTextNode(" ↗ (" + t.channel + "). "));
        li.appendChild(h("span", "pd-who", t.player + ". " + (t.useSrc ? "Pedal use: " + t.useSrc + "." : "That this pedal is on the record: unverified (no source found).") + " "));
        if (t.state) { var b = h("button", "pd-try", "Try a guess"); b.type = "button"; b.title = "This site's guess at a setting (no source)"; b.onclick = function () { var W = PD.widgets.filter(function (w) { return w.id === want; })[0]; if (W) { W.setAll(t.state); W.play(t.play || "riff"); } }; li.appendChild(b); }
        ul.appendChild(li); }); el.innerHTML = ""; el.appendChild(ul); el.dataset.n = list.length; }).catch(function () { el.textContent = "(the track list did not load)"; }); }
  PD.init = function () { document.querySelectorAll(".pdp[data-pedal]").forEach(function (e) { PD.mount(e, { pedal: e.dataset.pedal }); });
    document.querySelectorAll(".pdc").forEach(function (e) { PD.compare(e); }); document.querySelectorAll(".pdb").forEach(function (e) { PD.board(e); });
    steps(); document.querySelectorAll(".pd-q").forEach(quiz); document.querySelectorAll(".pd-tracks").forEach(tracks); };
  global.Pedals = PD;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", PD.init); else PD.init();
})(typeof window !== "undefined" ? window : globalThis);
