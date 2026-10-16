// ipa-synth.js — a formant vowel synthesiser for the IPA chart (window.IpaSynth). Plain Web Audio.
// A glottal-like source (harmonics falling 1/n, with vibrato and a little breath noise) through four parallel band-pass
// formants. Formants come from a point on the vowel chart: height 0 (close) .. 6 (open), backness 0 (front) .. 2 (back),
// rounding 0..1, interpolated over a 4 x 3 grid of cardinal values (adult male, Hz) for unrounded and rounded vowels.
//   IpaSynth.formants(h, c, r, voice) -> [F1, F2, F3, F4]
//   IpaSynth.start() / stop()           sound on / off (start resumes the AudioContext; call it from a gesture)
//   IpaSynth.set({ h, c, r, pitch, voice, vib, F, ring, raw, glide })   move; glide is the time constant in s (default .04).
//     vib: vibrato depth as a fraction of pitch (default .0035, about 6 cents); F: [F1..F4] in Hz overrides the chart point
//     (null to go back); ring: 0..1 extra peak near 3 kHz (the singer's formant); raw: true bypasses the formants (buzz only)
//   IpaSynth.envelope(f, st) -> linear gain of the formant filter at f Hz (st: a state(), default current), for drawing
//   IpaSynth.current() -> [F1..F4] in use
//   IpaSynth.pulse(h, c, r, secs)       one sung note there
//   IpaSynth.playing()
(function (root) {
  // rows: close, close-mid, open-mid, open (chart heights 0, 2, 4, 6); columns: front, central, back. [F1, F2, F3]
  var UN = [
    [[280, 2250, 2950], [300, 1650, 2500], [310, 1350, 2400]],   // i  ɨ  ɯ
    [[400, 2100, 2700], [430, 1600, 2500], [440, 1150, 2400]],   // e  ɘ  ɤ
    [[580, 1850, 2600], [590, 1450, 2500], [610, 1180, 2450]],   // ɛ  ɜ  ʌ
    [[820, 1550, 2600], [800, 1320, 2500], [760, 1080, 2500]]];  // a  ä  ɑ
  var RO = [
    [[280, 1800, 2150], [300, 1400, 2200], [300, 750, 2250]],    // y  ʉ  u
    [[400, 1600, 2250], [430, 1250, 2300], [430, 750, 2400]],    // ø  ɵ  o
    [[580, 1500, 2350], [590, 1200, 2400], [600, 900, 2500]],    // œ  ɞ  ɔ
    [[780, 1300, 2400], [760, 1100, 2450], [720, 900, 2500]]];   // ɶ  -  ɒ
  var VOICES = { low: { scale: 1, pitch: 130 }, high: { scale: 1.16, pitch: 233 } };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function grid(G, h, c) {
    var hy = Math.max(0, Math.min(6, h)) / 2, cx = Math.max(0, Math.min(2, c));
    var r0 = Math.min(2, Math.floor(hy)), c0 = Math.min(1, Math.floor(cx)), ty = hy - r0, tx = cx - c0;
    return [0, 1, 2].map(function (k) {
      return lerp(lerp(G[r0][c0][k], G[r0][c0 + 1][k], tx), lerp(G[r0 + 1][c0][k], G[r0 + 1][c0 + 1][k], tx), ty);
    });
  }
  function formants(h, c, r, voice) {
    var u = grid(UN, h, c), o = grid(RO, h, c), s = (VOICES[voice] || VOICES.low).scale;
    return [lerp(u[0], o[0], r) * s, lerp(u[1], o[1], r) * s, lerp(u[2], o[2], r) * s, 3500 * s];
  }

  var ctx = null, nodes = null, cur = { h: 3, c: 1, r: 0, pitch: 130, voice: "low", vib: 0.0035, F: null, ring: 0, raw: false }, on = false, offTimer = 0;
  var GAINS = [1, 0.6, 0.3, 0.15], BW = [70, 90, 140, 200];

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    var N = 64, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (var n = 1; n <= N; n++) im[n] = 1 / n;
    var osc = ctx.createOscillator(); osc.setPeriodicWave(ctx.createPeriodicWave(re, im, { disableNormalization: false }));
    osc.frequency.value = cur.pitch;
    var vib = ctx.createOscillator(), vibAmt = ctx.createGain(); vib.frequency.value = 5.3; vibAmt.gain.value = cur.pitch * cur.vib;
    vib.connect(vibAmt); vibAmt.connect(osc.frequency);
    var len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    var breath = ctx.createGain(); breath.gain.value = 0.04; noise.connect(breath);
    var src = ctx.createGain(); osc.connect(src); breath.connect(src);
    var sum = ctx.createGain(); sum.gain.value = 1;
    var bp = GAINS.map(function (g, k) {
      var f = ctx.createBiquadFilter(); f.type = "bandpass"; var a = ctx.createGain(); a.gain.value = g * (k ? 1 : 1.4);
      src.connect(f); f.connect(a); a.connect(sum); return f;
    });
    var rf = ctx.createBiquadFilter(); rf.type = "bandpass"; rf.frequency.value = RING; rf.Q.value = RING / 350;
    var rg = ctx.createGain(); rg.gain.value = 0; src.connect(rf); rf.connect(rg); rg.connect(sum);
    var dry = ctx.createGain(); dry.gain.value = 0; osc.connect(dry); dry.connect(sum);
    var wet = ctx.createGain(); wet.gain.value = 1; sum.disconnect(); sum.connect(wet);
    var amp = ctx.createGain(); amp.gain.value = 0; dry.connect(amp);
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18;
    var out = ctx.createGain(); out.gain.value = 0.5;
    wet.connect(amp); amp.connect(comp); comp.connect(out); out.connect(ctx.destination);
    osc.start(); vib.start(); noise.start();
    nodes = { osc: osc, vibAmt: vibAmt, bp: bp, amp: amp, rg: rg, dry: dry, wet: wet };
    if (window.AudioTap) window.AudioTap.register(ctx, out, "IPA vowel synth");
    apply(0);
  }
  function apply(glide) {
    if (!nodes) return;
    var t = ctx.currentTime, tc = glide == null ? 0.04 : glide, F = fOf(cur);
    nodes.bp.forEach(function (f, k) {
      f.frequency.setTargetAtTime(F[k], t, tc || 0.001);
      f.Q.setTargetAtTime(qOf(cur, F, k), t, tc || 0.001);
    });
    nodes.rg.gain.setTargetAtTime(cur.raw ? 0 : cur.ring * 0.5, t, 0.03);
    nodes.wet.gain.setTargetAtTime(cur.raw ? 0 : 1, t, 0.02);
    nodes.dry.gain.setTargetAtTime(cur.raw ? 0.12 : 0, t, 0.02);
    nodes.osc.frequency.setTargetAtTime(cur.pitch, t, 0.03);
    nodes.vibAmt.gain.setTargetAtTime(cur.pitch * cur.vib, t, 0.03);
  }
  var RING = 3000;
  function fOf(st) { return st.F || formants(st.h, st.c, st.r, st.voice); }
  function qOf(st, F, k) { var h = st.F ? Math.max(0, Math.min(6, (st.F[0] - 280) / 90)) : st.h; return F[k] / (BW[k] * (k === 0 ? 1 + h / 12 : 1)); }
  // analogue band-pass magnitude, near enough to the biquads for drawing
  function bpMag(f, f0, q) { var x = f / f0 - f0 / f; return 1 / Math.sqrt(1 + q * q * x * x); }
  function envelope(f, st) {
    st = st || cur; var F = fOf(st), e = 0;
    F.forEach(function (fk, k) { e += GAINS[k] * (k ? 1 : 1.4) * bpMag(f, fk, qOf(st, F, k)); });
    return e + st.ring * 0.5 * bpMag(f, RING, RING / 350);
  }
  function set(o) {
    var g = o.glide;
    ["h", "c", "r", "pitch", "voice", "vib", "ring", "raw"].forEach(function (k) { if (o[k] != null) cur[k] = o[k]; });
    if ("F" in o) cur.F = o.F ? o.F.slice() : null;
    apply(g);
  }
  function start() {
    if (!ctx) build();
    if (ctx.state !== "running") ctx.resume();
    clearTimeout(offTimer);
    var t = ctx.currentTime; nodes.amp.gain.cancelScheduledValues(t); nodes.amp.gain.setTargetAtTime(0.9, t, 0.03); on = true;
  }
  function stop() {
    if (!nodes) return;
    var t = ctx.currentTime; nodes.amp.gain.cancelScheduledValues(t); nodes.amp.gain.setTargetAtTime(0, t, 0.06); on = false;
  }
  function pulse(h, c, r, secs) {
    set({ h: h, c: c, r: r, glide: on ? 0.05 : 0 }); start();
    offTimer = setTimeout(stop, (secs || 1.2) * 1000);
  }
  root.IpaSynth = { formants: formants, envelope: envelope, current: function () { return fOf(cur); }, RING: RING, start: start, stop: stop, set: set, pulse: pulse, VOICES: VOICES,
    playing: function () { return on; }, state: function () { return Object.assign({}, cur); } };
})(window);
