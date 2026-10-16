// synth-kit.js — the sound-design lessons (synthesis and effects). Every <div class="sk" data-w="..."> on a page
// becomes a widget: a card with its controls, a ▶ button, an oscilloscope and a spectrum. Kinds (data-w):
//   series      the harmonic series of a chosen note, written out (abcjs, transposed with AbcTranspose) with cents
//   interval    two notes, pure (a whole-number ratio) or equal-tempered, and the beating where their harmonics should agree
//               (the tuning lesson). data-set keys: iv (M3 m3 P5 P4 M6 m6 M2 P8), tun (just equal), show (notes pair), root (80-440 Hz)
//   additive    sixteen harmonic sliders: Fourier synthesis, with presets for the classic waves
//   wave        one oscillator: sine, triangle, sawtooth, square, pulse with PWM
//   noise       white, pink and brown noise, and sounds made from it
//   filter lfo subtractive fm wavetable          synthesis
//   distortion compressor delay glitch chorus phaser reverb   effects (each with a source picker: riff, drums, mic, your keys...)
//   envelope    one ADSR on volume, played from the keys or a demo
//   granular    a three-second sound (or the mic) read as grains
//   eq sidechain gate transient tremolo rotary octaver harmonizer autotune stereo chain shimmer   more effects
//   vocoder     a mic (or the robot voice) shaping a synth played from the keys or MIDI
//   tuner       a strobe tuner: one band for every partial of the note you play, which stands still when that partial is exactly
//               k times the target pitch (drifts right if sharp, left if flat; the first 100 ms of an attack are ignored).
//               data-set keys: note (C C# Db ... B), oct (1-6), a4 (415-466), sys (12et ji 31et cents), tonic (for ji), cents
//               (for "cents": above the note; 350 = neutral third), bands, demo (off on tap: a made-up string, or tap = the page's own sound via audio-tap.js, in place of the
//               microphone), detune (cents), stiff (inharmonicity B), fund (the fundamental's strength 0-1, a control only when the host has data-fund),
//               inst (the made-up source's "practice instrument": string [the default: the stiffness slider], oldstring, marimba, rawbar,
//               xylophone, chime, bell, timpani, clarinet, voice, brass; the partials of each, with their sources, are in SK.INSTRUMENTS
//               below; band 1 is the instrument's reference pitch, which for the bell is the hum and for the chime and timpani the
//               virtual pitch with nothing sounding there; SynthKit.partials(id, {stiff, fund, fref}) -> [[ratio to band 1, level]]). Also data-bands. Needs pitch-detect.js. The microphone
//               opens only on Start and is let go on Stop. w.setSource(node or fn(ctx)) feeds a test signal in its place.
//   bendboard   a guitar string bend (LessonDiagrams.bendboard, needs diagrams.js and pitch-detect.js): drag the dot to bend and a tone
//               follows; a gauge in cents and a trace in time show the target (bend, bend and release, pre-bend, vibrato);
//               the microphone draws your own pitch over it; a MIDI wheel can drive the bend. data-set keys: ex (4to5 b7to1 5tob7
//               curl b5to5 4tob5), shape (bend bendrelease prebend vibrato), vol.
// Optional attributes: data-title, data-source (an effect's starting source), data-set="key=value,key=value"
// (starting control values), data-preset (a preset's name).
// One widget sounds at a time. A bar fixed at the foot of the page has the volume, the computer keyboard
// (a w s e d f t g y h u j k: one octave from C; z and x move the octave), an on-screen keyboard, MIDI and the
// microphone; notes go to the widget last touched. Everything goes through a limiter so nothing can blast.
// A page that has a bar of its own sets window.SK_NO_BAR = true before this script: no bar is made (and no computer-keyboard
// shortcuts are bound); the widgets still work, and the ones that sound have their own volume.
(function (global) {
  var SK = {}, ctx = null, masterIn = null, vol = 0.5, cur = null, target = null, widgets = [];
  try { vol = +(localStorage.getItem("sk-vol") || 0.5); } catch (e) {}

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ac() {
    if (!ctx) {
      ctx = new (global.AudioContext || global.webkitAudioContext)();
      masterIn = ctx.createGain(); masterIn.gain.value = vol;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
      masterIn.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, masterIn, "Lesson sounds");
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function noteName(m) { return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function fmtHz(v) { return v < 1000 ? (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + " Hz" : (v / 1000).toFixed(v < 10000 ? 2 : 1) + " kHz"; }
  function fmtN(d) { return function (v) { return (+v).toFixed(d); }; }
  function fmtS(v) { return v < 1 ? Math.round(v * 1000) + " ms" : v.toFixed(2) + " s"; }
  function fmtPct(v) { return Math.round(v * 100) + "%"; }
  function fmtDb(v) { return (v > 0 ? "+" : "") + v.toFixed(1) + " dB"; }
  function fmtMs(v) { return v.toFixed(1) + " ms"; }
  function fmtCt(v) { return Math.round(v) + " cents"; }

  // ---------- envelopes ----------
  function adsrOn(p, t, a, d, s, peak, base) {
    p.cancelScheduledValues(t); p.setValueAtTime(base, t);
    p.linearRampToValueAtTime(peak, t + Math.max(a, 0.002));
    p.setTargetAtTime(base + (peak - base) * s, t + Math.max(a, 0.002), Math.max(d, 0.005) / 3);
  }
  function adsrOff(p, t, r, base) {
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
    p.setTargetAtTime(base, t, Math.max(r, 0.005) / 4);
    return t + Math.max(r, 0.005) * 1.6 + 0.02;
  }

  // ---------- oscillators ----------
  // A pulse wave is a sawtooth minus the same sawtooth a little later: the delay, as a fraction of the period, is the width.
  function mkOsc(c, type, f, width) {
    if (type !== "pulse") {
      var o = c.createOscillator(); o.type = type; o.frequency.value = f;
      return { out: o, osc: o, frequency: o.frequency, detune: o.detune, start: function (t) { o.start(t); }, stop: function (t) { o.stop(t); }, setWidth: function () {}, onended: function (fn) { o.onended = fn; } };
    }
    var saw = c.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = f;
    var dl = c.createDelay(1), inv = c.createGain(), out = c.createGain(); inv.gain.value = -1; out.gain.value = 0.5;
    var w = width == null ? 0.5 : width; dl.delayTime.value = w / f;
    saw.connect(out); saw.connect(dl); dl.connect(inv); inv.connect(out);
    return { out: out, osc: saw, frequency: saw.frequency, detune: saw.detune, delay: dl,
      start: function (t) { saw.start(t); }, stop: function (t) { saw.stop(t); }, onended: function (fn) { saw.onended = fn; },
      setWidth: function (x, t) { w = x; dl.delayTime.setTargetAtTime(w / saw.frequency.value, t || c.currentTime, 0.01); },
      setFreq: function (x, t) { saw.frequency.setValueAtTime(x, t || c.currentTime); dl.delayTime.setValueAtTime(w / x, t || c.currentTime); } };
  }
  var bufs = {};
  function noiseBuf(kind) {
    var c = ac(); if (bufs[kind]) return bufs[kind];
    var n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (kind === "pink") { b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .1; b6 = w * .115926; }
      else if (kind === "brown") { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }
      else d[i] = w * .4;
    }
    return (bufs[kind] = b);
  }
  function noiseSrc(kind) { var s = ac().createBufferSource(); s.buffer = noiseBuf(kind || "white"); s.loop = true; s.loopStart = Math.random(); return s; }

  // ---------- one-shot sounds the sources are made of ----------
  function kick(c, out, t, v) { var o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .42); o.connect(g); g.connect(out); o.start(t); o.stop(t + .45); }
  function snare(c, out, t, v) {
    var n = noiseSrc("white"), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = "highpass"; hp.frequency.value = 1200; g.gain.setValueAtTime(v * 1.1, t); g.gain.exponentialRampToValueAtTime(.001, t + .2);
    n.connect(hp); hp.connect(g); g.connect(out); n.start(t); n.stop(t + .22);
    var o = c.createOscillator(), og = c.createGain(); o.type = "triangle"; o.frequency.value = 190; og.gain.setValueAtTime(v * .5, t); og.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(og); og.connect(out); o.start(t); o.stop(t + .12);
  }
  function hat(c, out, t, v, open) { var n = noiseSrc("white"), hp = c.createBiquadFilter(), g = c.createGain(), d = open ? .3 : .05; hp.type = "highpass"; hp.frequency.value = 7000; g.gain.setValueAtTime(v * .6, t); g.gain.exponentialRampToValueAtTime(.001, t + d); n.connect(hp); hp.connect(g); g.connect(out); n.start(t); n.stop(t + d + .02); }
  function pluck(c, out, t, f, v, dur) {
    var o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o.frequency.value = f;
    lp.type = "lowpass"; lp.Q.value = 2; lp.frequency.setValueAtTime(3500, t); lp.frequency.exponentialRampToValueAtTime(400, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .35, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
  }
  function pad(c, out, t, notes, dur) {
    var lp = c.createBiquadFilter(), g = c.createGain(); lp.type = "lowpass"; lp.frequency.value = 1400; lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .25); g.gain.setValueAtTime(.12, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur);
    notes.forEach(function (m) { [-6, 6].forEach(function (dt) { var o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + .02); }); });
  }
  function tone(c, out, f, t, dur, v) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.setValueAtTime(v, t + dur - .08); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02); return o; }

  // A step sequencer on the audio clock: fn(step, time) for every step, scheduled a little ahead.
  function loop(c, stepDur, fn) {
    var step = 0, next = c.currentTime + .06;
    function run() { while (next < c.currentTime + .15) { fn(step, next); step++; next += stepDur; } }
    run(); var id = setInterval(run, 25);
    return function () { clearInterval(id); };
  }

  // A small polyphonic synth: voices are made by make(midi, velocity, time) and have release(time).
  function Poly(make) { this.make = make; this.v = {}; }
  Poly.prototype.on = function (m, vel, t) { this.off(m, t); this.v[m] = this.make(m, vel, t); };
  Poly.prototype.off = function (m, t) { var v = this.v[m]; if (v) { delete this.v[m]; v.release(t); } };
  Poly.prototype.all = function (t) { for (var m in this.v) this.off(+m, t); };
  Poly.prototype.each = function (fn) { for (var m in this.v) fn(this.v[m], +m); };
  Poly.prototype.count = function () { return Object.keys(this.v).length; };
  function sawVoice(c, out, m, vel, t, o) {
    o = o || {}; var g = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = o.cut || 3000; lp.Q.value = .7; lp.connect(g); g.connect(out);
    var oscs = [-7, 7].map(function (dt) { var x = c.createOscillator(); x.type = o.type || "sawtooth"; x.frequency.value = mtof(m); x.detune.value = dt; x.connect(lp); x.start(t); return x; });
    adsrOn(g.gain, t, o.a || .01, .3, .8, .22 * (vel || .8), 0);
    return { release: function (t2) { var end = adsrOff(g.gain, t2, o.r || .25, 0); oscs.forEach(function (x) { x.stop(end); }); } };
  }

  // The robot voice: a buzz through three formant filters that step through vowels, with the odd "s".
  var VOWELS = [[800, 1150, 2900], [400, 1700, 2600], [300, 2300, 3000], [450, 800, 2830], [325, 700, 2530], [600, 1000, 2450]];
  function robot(c, out) {
    var buzz = c.createOscillator(); buzz.type = "sawtooth"; buzz.frequency.value = 120;
    var vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5; vg.gain.value = 1.5; vib.connect(vg); vg.connect(buzz.frequency);
    var amp = c.createGain(); amp.gain.value = 0; amp.connect(out);
    var fs = [0, 1, 2].map(function (i) { var f = c.createBiquadFilter(), g = c.createGain(); f.type = "bandpass"; f.Q.value = 8 + i * 3; g.gain.value = [1.4, .9, .5][i] * 2.2; buzz.connect(f); f.connect(g); g.connect(amp); return f; });
    var hiss = noiseSrc("white"), hp = c.createBiquadFilter(), hg = c.createGain(); hp.type = "highpass"; hp.frequency.value = 5000; hg.gain.value = 0; hiss.connect(hp); hp.connect(hg); hg.connect(out);
    buzz.start(); vib.start(); hiss.start();
    var pitch = [120, 135, 110, 150, 120, 100, 130, 140];
    var stop = loop(c, .32, function (s, t) {
      if (s % 8 === 7) { amp.gain.setTargetAtTime(0, t, .03); return; }
      var v = VOWELS[(s * 7 + (s >> 3)) % VOWELS.length]; fs.forEach(function (f, i) { f.frequency.setTargetAtTime(v[i], t, .03); });
      buzz.frequency.setTargetAtTime(pitch[s % 8], t, .05);
      amp.gain.setTargetAtTime(.9, t, .02); amp.gain.setTargetAtTime(.25, t + .2, .03);
      if (s % 5 === 2) { hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(.5, t + .05); hg.gain.linearRampToValueAtTime(0, t + .14); }
    });
    return function () { stop(); var t = c.currentTime + .1; [buzz, vib, hiss].forEach(function (x) { x.stop(t); }); };
  }


  // ---------- shared pieces for the later effects ----------
  function shaper(c, fn, n) { var sh = c.createWaveShaper(), k = n || 1025, a = new Float32Array(k); for (var i = 0; i < k; i++) a[i] = fn(i / (k - 1) * 2 - 1); sh.curve = a; return sh; }
  // A pitch shifter from two delay lines. A sawtooth sweeps each delay time across a short window: a delay that keeps
  // shrinking plays the sound back faster (higher), one that keeps growing plays it slower (lower). The second line runs
  // half a window behind, and each fades out at its jump, so the two together never click.
  function shifter(c, ratio, win) {
    win = win || .06; var inp = c.createGain(), out = c.createGain(), saw = c.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = 0;
    var wrap = shaper(c, function (x) { return x < 0 ? x + 1 : x - 1; }), mods = [];
    saw.connect(wrap);
    [saw, wrap].forEach(function (src) {
      var d = c.createDelay(.5), mg = c.createGain(), wn = shaper(c, function (x) { return 1 - Math.abs(x); }), g = c.createGain();
      d.delayTime.value = win / 2 + .002; g.gain.value = 0; src.connect(mg); mg.connect(d.delayTime); src.connect(wn); wn.connect(g.gain);
      inp.connect(d); d.connect(g); g.connect(out); mods.push(mg);
    });
    saw.start();
    function set(r, t, tc) { t = t || c.currentTime; var s = r > 1 ? -1 : 1; saw.frequency.setTargetAtTime(Math.abs(1 - r) / win, t, tc || .01); mods.forEach(function (mg) { mg.gain.setValueAtTime(s * win / 2, t); }); }
    set(ratio == null ? 1 : ratio);
    return { input: inp, output: out, set: set, stop: function () { saw.stop(); } };
  }
  // A plain synthetic room: decaying noise that darkens as it fades (the reverb page builds a fancier one).
  function irNoise(c, decay, damp) {
    var sr = c.sampleRate, len = Math.ceil(sr * decay * 1.2), b = c.createBuffer(2, len, sr), k = 6.91 / decay, sum = 0;
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch), lp = 0; for (var i = 0; i < len; i++) { var t = i / sr, fc = damp + (16000 - damp) * Math.exp(-4 * t / decay), a = Math.exp(-2 * Math.PI * fc / sr); lp = lp * a + (Math.random() * 2 - 1) * (1 - a); d[i] = lp * Math.exp(-k * t) * Math.min(1, t / .01); sum += d[i] * d[i]; } }
    var g = 1.6 / Math.sqrt(sum / 2 + 1e-9); for (var c2 = 0; c2 < 2; c2++) { var dd = b.getChannelData(c2); for (var q = 0; q < len; q++) dd[q] *= g; }
    return b;
  }
  // Pitch by autocorrelation (the normalised kind, after McLeod): the lag at which the sound best matches itself.
  function detectPitch(d, sr) {
    var n = d.length, P = new Float64Array(n + 1), i; for (i = 0; i < n; i++) P[i + 1] = P[i] + d[i] * d[i];
    if (P[n] / n < 1e-4) return 0;
    var lo = Math.floor(sr / 1000), hi = Math.min(n >> 1, Math.floor(sr / 65)), ns = new Float32Array(hi + 2), top = 0;
    for (var L = lo; L <= hi; L++) { var s = 0; for (i = 0; i < n - L; i++) s += d[i] * d[i + L]; ns[L] = 2 * s / (P[n - L] + P[n] - P[L] + 1e-9); if (ns[L] > top) top = ns[L]; }
    if (top < .6) return 0;
    for (L = lo + 1; L < hi; L++) if (ns[L] >= .9 * top && ns[L] >= ns[L - 1] && ns[L] >= ns[L + 1]) {
      var a = ns[L - 1], b = ns[L], cc = ns[L + 1], sh = (a - cc) / (2 * (a - 2 * b + cc) || 1); return sr / (L + sh);
    }
    return 0;
  }
  // One grain: a slice of a buffer under a smooth (Hann) window.
  var HANN = (function () { var a = new Float32Array(64); for (var i = 0; i < 64; i++) a[i] = .5 - .5 * Math.cos(2 * Math.PI * i / 63); return a; })();
  function grain(c, buf, out, t, off, dur, rate, pan, v) {
    var s = c.createBufferSource(), g = c.createGain(), p = c.createStereoPanner(); s.buffer = buf; s.playbackRate.value = rate; p.pan.value = pan || 0;
    g.gain.value = 0; g.gain.setValueCurveAtTime(HANN.map(function (x) { return x * (v || .5); }), t, dur);
    s.connect(g); g.connect(p); p.connect(out); s.start(t, Math.max(0, Math.min(buf.duration - .01, off)), dur * rate + .01); s.stop(t + dur + .02);
  }
  // A recorder that keeps the last few seconds of whatever is connected to it.
  function recorder(c, secs) {
    var n = Math.floor(c.sampleRate * secs), ring = new Float32Array(n), wp = 0, sp = c.createScriptProcessor(1024, 1, 1), mute = c.createGain(); mute.gain.value = 0;
    sp.onaudioprocess = function (e) { var d = e.inputBuffer.getChannelData(0); for (var i = 0; i < d.length; i++) { ring[wp] = d[i]; wp = (wp + 1) % n; } };
    sp.connect(mute); mute.connect(c.destination);
    return { input: sp, take: function (sec) { var m = Math.min(n, Math.floor(sec * c.sampleRate)), b = c.createBuffer(1, m, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < m; i++) d[i] = ring[(wp - m + i + n) % n]; return b; },
      stop: function () { sp.onaudioprocess = null; try { sp.disconnect(); mute.disconnect(); } catch (e) {} } };
  }
  // Sample-by-sample dynamics in a ScriptProcessor: left, right and a key (the signal that decides) go in, and
  // fn(L, R, K, outL, outR) writes the result. Used by the gate, the transient shaper and the sidechain.
  function dynProc(c, fn) {
    var sig = c.createGain(), key = c.createGain(), mg = c.createChannelMerger(3), sp = c.createScriptProcessor(1024, 3, 2), up = c.createGain(), sp2 = c.createChannelSplitter(2);
    up.channelCount = 2; up.channelCountMode = "explicit"; up.channelInterpretation = "speakers"; sig.connect(up); up.connect(sp2);
    var kd = c.createGain(); kd.channelCount = 1; kd.channelCountMode = "explicit"; key.connect(kd);
    sp2.connect(mg, 0, 0); sp2.connect(mg, 1, 1); kd.connect(mg, 0, 2); mg.connect(sp);
    sp.onaudioprocess = function (e) { var I = e.inputBuffer, O = e.outputBuffer; fn(I.getChannelData(0), I.getChannelData(1), I.getChannelData(2), O.getChannelData(0), O.getChannelData(1)); };
    return { input: sig, key: key, output: sp, stop: function () { sp.onaudioprocess = null; } };
  }
  function coef(sec, sr) { return Math.exp(-1 / (Math.max(sec, 1e-4) * sr)); }
  function todb(x) { return 20 * Math.log10(x + 1e-9); }

  // The out-of-tune singer: a voice ("ah") that slides between notes and lands a little sharp or flat each time.
  var SING = [57, 60, 62, 64, 62, 60, 59, 57];
  function singer(c, out) {
    var buzz = c.createOscillator(); buzz.type = "sawtooth"; buzz.frequency.value = mtof(57);
    var vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.5; vg.gain.value = 18; vib.connect(vg); vg.connect(buzz.detune);
    var amp = c.createGain(); amp.gain.value = 0; amp.connect(out);
    [[800, 1.4], [1150, .9], [2900, .5]].forEach(function (f, i) { var b = c.createBiquadFilter(), g = c.createGain(); b.type = "bandpass"; b.frequency.value = f[0]; b.Q.value = 8 + i * 3; g.gain.value = f[1] * 2.2; buzz.connect(b); b.connect(g); g.connect(amp); });
    buzz.start(); vib.start();
    var stop = loop(c, .6, function (s, t) {
      if (s % 8 === 7) { amp.gain.setTargetAtTime(0, t, .04); return; }
      var off = (Math.random() < .5 ? -1 : 1) * (20 + Math.random() * 30);   // 20 to 50 cents out
      buzz.frequency.setTargetAtTime(mtof(SING[s % 8]) * Math.pow(2, off / 1200), t, .06);
      amp.gain.setTargetAtTime(.8, t, .03); amp.gain.setTargetAtTime(.55, t + .4, .05);
    });
    return function () { stop(); var t = c.currentTime + .1; buzz.stop(t); vib.stop(t); };
  }
  // Organ chords: sine waves at the drawbar pitches (16', 8', 5 1/3', 4', 2'), no attack, no decay.
  function organ(c, out, t, notes, dur) {
    var g = c.createGain(); g.connect(out); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .01); g.gain.setValueAtTime(.09, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur);
    notes.forEach(function (m) { [[.5, .6], [1, 1], [1.5, .7], [2, .5], [4, .35]].forEach(function (h) { var o = c.createOscillator(); o.frequency.value = mtof(m + 12) * h[0]; var og = c.createGain(); og.gain.value = h[1]; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .02); }); });
  }

  // ---------- sources for the effects ----------
  var SOURCES = { riff: "Synth riff", chords: "Chords", drums: "Drum loop", hits: "Single hits", voice: "Robot voice", tone: "Sine tone", noise: "White noise", uneven: "Uneven riff", singer: "Out-of-tune singer", organ: "Organ chords", keys: "Your keyboard", mic: "Microphone" };
  var RIFF = [57, 60, 64, 67, 69, 67, 64, 60, 53, 57, 60, 64, 55, 59, 62, 67];
  var CHORDS = [[48, 55, 64, 71], [45, 52, 60, 67], [50, 57, 65, 72], [43, 53, 59, 62]];
  function makeSource(kind, c) {
    var out = c.createGain(), stop = function () {}, src = { out: out };
    if (kind === "riff" || kind === "uneven") {
      stop = loop(c, 60 / 112 / 4, function (s, t) { var v = kind === "uneven" ? (s % 4 === 0 ? 1 : .08 + Math.random() * .5) : (s % 4 === 0 ? 1 : .7); pluck(c, out, t, mtof(RIFF[s % 16]), v, .3); });
    } else if (kind === "chords") {
      stop = loop(c, 2.4, function (s, t) { pad(c, out, t, CHORDS[s % 4], 2.4); });
    } else if (kind === "drums") {
      stop = loop(c, 60 / 100 / 4, function (s, t) { s %= 16; if (s === 0 || s === 8 || s === 10) kick(c, out, t, 1); if (s === 4 || s === 12) snare(c, out, t, .8); if (s % 2 === 0) hat(c, out, t, s === 14 ? .4 : .3, s === 14); });
    } else if (kind === "hits") {
      stop = loop(c, 1.4, function (s, t) { if (s % 2) snare(c, out, t, 1); else { kick(c, out, t, 1); hat(c, out, t, .5); } });
    } else if (kind === "singer") {
      stop = singer(c, out);
    } else if (kind === "organ") {
      stop = loop(c, 2.4, function (s, t) { organ(c, out, t, CHORDS[s % 4], 2.4); });
    } else if (kind === "voice") {
      stop = robot(c, out);
    } else if (kind === "tone") {
      var o = c.createOscillator(); o.frequency.value = 220; var g = c.createGain(); g.gain.value = .5; o.connect(g); g.connect(out); o.start();
      src.osc = o; stop = function () { o.stop(); };
    } else if (kind === "noise") {
      var n = noiseSrc("white"); n.connect(out); n.start(); stop = function () { n.stop(); };
    } else if (kind === "keys") {
      var p = new Poly(function (m, v, t) { return sawVoice(c, out, m, v, t); });
      src.noteOn = function (m, v, t) { p.on(m, v, t || c.currentTime); }; src.noteOff = function (m, t) { p.off(m, t || c.currentTime); };
      stop = function () { p.all(c.currentTime); };
    } else if (kind === "mic") {
      return SK.mic().then(function (node) { node.connect(out); src.stop = function () { try { node.disconnect(); } catch (e) {} }; return src; });
    }
    src.stop = stop;
    return Promise.resolve(src);
  }

  // ---------- microphone ----------
  var micP = null, micStream = null;
  SK.mic = function () {
    if (!micP) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("This browser can't open a microphone here."));
      var strict = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
      var pre = window.AudioCheck ? window.AudioCheck.ensure().catch(function () { return null; }) : Promise.resolve(null);   // cancelled -> plain constraints
      micP = pre.then(function (r) { SK.micResult = r; return navigator.mediaDevices.getUserMedia({ audio: Object.assign({}, r && r.constraints, strict) }); })
        .then(function (s) { micStream = s; bar.mic(true); return s; }, function (e) { micP = null; throw e; });
    }
    return micP.then(function (s) { return ac().createMediaStreamSource(s); });
  };
  SK.micOff = function () { if (micStream) micStream.getTracks().forEach(function (t) { t.stop(); }); micStream = null; micP = null; widgets.forEach(function (w) { if (w.running && w.usesMic && w.usesMic()) w.stop(); }); bar.mic(false); };

  // ---------- drawing ----------
  function colors() {
    var s = getComputedStyle(document.body), g = function (n, d) { var v = s.getPropertyValue(n).trim(); return v || d; };
    return { ink: g("--site-ink", "#222"), ink2: g("--site-ink-2", "#777"), line: g("--site-border", "#ccc"), acc: g("--site-accent", "#3fc2b4"), acc2: g("--site-accent-dk", "#1f8f84"), hot: "#d6336c", bg: g("--site-surface", "#fff") };
  }
  function fit(cv) {
    var r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
    var g = cv.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h); return { g: g, w: w, h: h };
  }
  function logX(f, w) { return w * Math.log(f / 20) / Math.log(1000); }   // 20 Hz .. 20 kHz
  function freqGrid(g, w, h, C) {
    g.strokeStyle = C.line; g.fillStyle = C.ink2; g.lineWidth = 1; g.font = "10px system-ui, sans-serif";
    [50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach(function (f) { var x = logX(f, w); g.globalAlpha = .5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h - 12); g.stroke(); g.globalAlpha = 1; g.fillText(f >= 1000 ? f / 1000 + "k" : f, x + 2, h - 2); });
  }

  var viewers = [];
  function viewer(host, o) {
    o = o || {};
    var box = el("div", "sk-view"), v = { box: box, overlay: o.overlay || null, ms: o.ms || 20, on: false, dirty: true };
    if (!o.noScope) { v.sc = el("canvas", "sk-scope"); v.sc.setAttribute("aria-label", "Oscilloscope: the shape of the sound"); box.appendChild(v.sc); }
    if (!o.noSpec) { v.sp = el("canvas", "sk-spec"); v.sp.setAttribute("aria-label", "Spectrum: how loud each frequency is"); box.appendChild(v.sp); }
    host.appendChild(box);
    v.attach = function (node) { var c = ac(); if (!v.an) { v.an = c.createAnalyser(); v.an.fftSize = 8192; v.an.smoothingTimeConstant = .55; v.td = new Float32Array(v.an.fftSize); v.fd = new Float32Array(v.an.frequencyBinCount); } node.connect(v.an); v.src = node; v.on = true; };
    v.detach = function () { if (v.src) try { v.src.disconnect(v.an); } catch (e) {} v.src = null; v.on = false; v.dirty = true; };
    v.paint = function (C) {
      if (v.sc) {
        var s = fit(v.sc), g = s.g, w = s.w, h = s.h;
        g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
        g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("shape (" + v.ms + " ms)", 4, 11);
        if (v.on) {
          v.an.getFloatTimeDomainData(v.td);
          var n = Math.min(v.td.length / 2, Math.round(ctx.sampleRate * v.ms / 1000)), st = 0;
          for (var i = 1; i < v.td.length / 2; i++) if (v.td[i - 1] < 0 && v.td[i] >= 0) { st = i; break; }
          g.strokeStyle = C.acc2; g.lineWidth = 1.6; g.beginPath();
          for (var k = 0; k < n; k++) { var x = k / n * w, y = h / 2 - Math.max(-1.1, Math.min(1.1, v.td[st + k])) * h * .42; k ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        }
      }
      if (v.sp) {
        var s2 = fit(v.sp), g2 = s2.g, w2 = s2.w, h2 = s2.h;
        freqGrid(g2, w2, h2, C); g2.fillStyle = C.ink2; g2.fillText("spectrum", 4, 11);
        var X = function (f) { return logX(f, w2); };
        if (v.on) {
          v.an.getFloatFrequencyData(v.fd);
          var bw = ctx.sampleRate / v.an.fftSize; g2.beginPath(); g2.moveTo(0, h2 - 12);
          for (var px = 0; px <= w2; px += 1) {
            var f0 = 20 * Math.pow(1000, px / w2), f1 = 20 * Math.pow(1000, (px + 1) / w2), b0 = Math.floor(f0 / bw), b1 = Math.max(b0, Math.floor(f1 / bw)), m = -200;
            for (var b = b0; b <= b1 && b < v.fd.length; b++) if (v.fd[b] > m) m = v.fd[b];
            var y2 = (h2 - 12) * (1 - Math.max(0, Math.min(1, (m + 100) / 90))); g2.lineTo(px, y2);
          }
          g2.lineTo(w2, h2 - 12); g2.closePath(); g2.fillStyle = C.acc; g2.globalAlpha = .45; g2.fill(); g2.globalAlpha = 1; g2.strokeStyle = C.acc2; g2.lineWidth = 1; g2.stroke();
        }
        if (v.overlay) v.overlay(g2, X, w2, h2 - 12, C);
      }
      v.dirty = false;
    };
    viewers.push(v); return v;
  }
  var anims = [];
  function frame() {
    var C = null;
    viewers.forEach(function (v) { if ((v.on || v.dirty) && isShown(v.box)) { C = C || colors(); v.paint(C); } });
    anims.forEach(function (a) { if ((a.w.running || a.dirty) && isShown(a.el)) { C = C || colors(); a.fn(C); a.dirty = false; } });
    requestAnimationFrame(frame);
  }
  function isShown(e) { return e.offsetParent !== null; }
  function anim(w, elm, fn) { var a = { w: w, el: elm, fn: fn, dirty: true }; anims.push(a); return function () { a.dirty = true; }; }
  window.addEventListener("resize", function () { viewers.forEach(function (v) { v.dirty = true; }); anims.forEach(function (a) { a.dirty = true; }); });

  // ---------- controls ----------
  function ctl(box, o) {
    var w = el("label", "sk-c"), name = el("span", "sk-cl", o.label), val = el("output", "sk-cv"), r = el("input"), lo = o.min, hi = o.max;
    r.type = "range";
    if (o.log) { r.min = 0; r.max = 1000; r.step = 1; } else { r.min = lo; r.max = hi; r.step = o.step || "any"; }
    function toV(x) { return o.log ? lo * Math.pow(hi / lo, x / 1000) : +x; }
    function toX(v) { return o.log ? 1000 * Math.log(v / lo) / Math.log(hi / lo) : v; }
    function show() { val.textContent = (o.fmt || fmtN(2))(toV(r.value)); }
    r.addEventListener("input", function () { show(); if (o.on) o.on(toV(r.value)); });
    r.value = toX(o.value); show();
    if (o.title) w.title = o.title;
    w.appendChild(name); w.appendChild(val); w.appendChild(r); box.appendChild(w);
    return { el: w, input: r, get value() { return toV(r.value); }, set: function (v) { r.value = toX(v); show(); if (o.on) o.on(toV(r.value)); } };
  }
  function sel(box, label, opts, value, on) {
    var w = el("label", "sk-c sk-s"), s = el("select");
    opts.forEach(function (p) { var op = el("option", null, p[1]); op.value = p[0]; s.appendChild(op); });
    s.value = value; s.addEventListener("change", function () { on(s.value); });
    w.appendChild(el("span", "sk-cl", label)); w.appendChild(s); box.appendChild(w);
    return { el: w, input: s, get value() { return s.value; }, set: function (v) { s.value = v; on(s.value); } };
  }
  function button(box, text, on, cls) { var b = el("button", "btn btn-sm " + (cls || "btn-outline-secondary"), text); b.type = "button"; b.addEventListener("click", on); box.appendChild(b); return b; }

  // ---------- the widget base ----------
  // w.P holds the control values; w.apply(key, value) pushes a change into the running sound; w.onStart(c, out)
  // builds the sound and returns a function that stops it.
  function Base(host, title) {
    var w = { host: host, P: {}, c: {}, running: false, title: host.getAttribute("data-title") || title };
    host.classList.add("sk-w"); host.innerHTML = "";
    var head = el("div", "sk-head"); head.appendChild(el("strong", "sk-title", w.title));
    w.head = head; w.tools = el("div", "sk-tools"); head.appendChild(w.tools); host.appendChild(head);
    w.body = el("div", "sk-body"); host.appendChild(w.body);
    w.ctls = el("div", "sk-ctls"); w.body.appendChild(w.ctls);
    w.playBtn = button(w.tools, "▶ Play", function () { w.running ? w.stop() : w.start(); }, "btn-outline-primary sk-play");
    w.num = function (key, o, box) { o.on = (function (f) { return function (v) { w.P[key] = v; if (w.running && w.apply) w.apply(key, v); if (w.redraw) w.redraw(); if (f) f(v); }; })(o.on); w.P[key] = o.value; return (w.c[key] = ctl(box || w.ctls, o)); };
    w.pick = function (key, label, opts, value, box, extra) { w.P[key] = value; return (w.c[key] = sel(box || w.ctls, label, opts, value, function (v) { w.P[key] = v; if (w.running && w.apply) w.apply(key, v); if (w.redraw) w.redraw(); if (extra) extra(v); })); };
    w.presets = function (list) {
      var box = el("div", "sk-presets"); box.appendChild(el("span", "sk-cl", "Presets"));
      list.forEach(function (p) { button(box, p.name, function () { w.preset(p); }); });
      w.presetList = list; w.body.insertBefore(box, w.ctls);
    };
    w.preset = function (p) { for (var k in p.set) if (w.c[k]) w.c[k].set(p.set[k]); if (p.then) p.then(); };
    w.start = function () {
      if (w.running) return; var c = ac(); if (!(w.noClaim && w.noClaim())) claim(w);
      w.out = c.createGain(); w.out.connect(masterIn); if (w.view) w.view.attach(w.out);
      w.running = true; w.playBtn.textContent = "■ Stop"; host.classList.add("sk-live");
      try { w.halt = w.onStart(c, w.out) || function () {}; } catch (e) { w.running = false; console.error(e); w.stop(); }
    };
    w.stop = function () {
      if (!w.running) return; w.running = false;
      try { w.halt && w.halt(); } catch (e) {}
      var o = w.out, c = ac(); o.gain.setTargetAtTime(0, c.currentTime, .02); setTimeout(function () { try { o.disconnect(); } catch (e) {} }, 250);
      if (w.view) w.view.detach(); w.playBtn.textContent = w.playLabel || "▶ Play"; host.classList.remove("sk-live");
      if (cur === w) cur = null;
    };
    host.addEventListener("pointerdown", function () { if (w.noteOn) setTarget(w); });
    widgets.push(w);
    return w;
  }
  function claim(w) { if (cur && cur !== w) cur.stop(); cur = w; if (w.noteOn) setTarget(w); }
  function setTarget(w) { if (target === w) return; if (target) target.host.classList.remove("sk-target"); target = w; w.host.classList.add("sk-target"); bar.target(w.title); }
  function applyAttrs(w) {
    var p = w.host.getAttribute("data-preset"); if (p && w.presetList) w.presetList.forEach(function (x) { if (x.name.toLowerCase() === p.toLowerCase()) w.preset(x); });
    (w.host.getAttribute("data-set") || "").split(",").forEach(function (kv) { var m = /^\s*(\w+)\s*=\s*(.+?)\s*$/.exec(kv); if (m && w.c[m[1]]) w.c[m[1]].set(isNaN(+m[2]) ? m[2] : +m[2]); });
  }
  // Mono instruments (wave, additive, lfo) sound while a key is held, at that key's pitch.
  function monoKeys(w, setFreq) {
    var held = [];
    w.noteOn = function (m) { held = held.filter(function (x) { return x !== m; }); held.push(m); setFreq(mtof(m), m); if (!w.running) { w.byKeys = true; w.start(); } };
    w.noteOff = function (m) { held = held.filter(function (x) { return x !== m; }); if (held.length) setFreq(mtof(held[held.length - 1]), held[held.length - 1]); else if (w.byKeys) { w.byKeys = false; w.stop(); } };
  }
  // Event list player for demos: [beat, beats, midi or [midis], velocity?]
  function phrase(w, bpm, evs, loopBeats) {
    var c = ac(), spb = 60 / bpm, t0 = c.currentTime + .08, q = [], rep = 0;
    function fill() { evs.forEach(function (e) { (Array.isArray(e[2]) ? e[2] : [e[2]]).forEach(function (m) { var t = t0 + (rep * loopBeats + e[0]) * spb; q.push([t, 1, m, e[3] || .8]); q.push([t + e[1] * spb * .95, 0, m]); }); }); rep++; q.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); }
    fill();
    var id = setInterval(function () {
      while (q.length && q[0][0] < c.currentTime + .12) { var e = q.shift(); if (e[1]) w.noteOn(e[2], e[3], e[0], true); else w.noteOff(e[2], e[0], true); }
      if (q.length < 8) fill();
    }, 20);
    return function () { clearInterval(id); q.forEach(function (e) { if (!e[1]) w.noteOff(e[2], c.currentTime, true); }); q = []; };
  }

  // ======================================================================================
  // series: the harmonic series written out over a chosen root, every harmonic clickable.
  var ROOTS = [["C", "C", 36], ["Db", "D♭", 37], ["D", "D", 38], ["Eb", "E♭", 39], ["E", "E", 40], ["F", "F", 41], ["F#", "F♯", 42], ["G", "G", 43], ["Ab", "A♭", 44], ["A", "A", 45], ["Bb", "B♭", 46], ["B", "B", 47]];
  function cents(n) { var c = 1200 * Math.log2(n); return c - 100 * Math.round(c / 100); }
  function semis(n) { return Math.round(1200 * Math.log2(n) / 100); }
  var SERIES_C = ["C,,", "C,", "G,", "C", "E", "G", "_B", "c", "d", "e", "^f", "g", "_a", "_b", "=b", "c'"];
  function seriesAbc() {
    var t = function (n) { var ct = Math.round(cents(n)); return '"^' + (ct > 0 ? "+" : ct < 0 ? "−" : "") + Math.abs(ct) + '""_' + n + '"' + SERIES_C[n - 1]; };
    var v1 = [], v2 = [];
    for (var n = 1; n <= 16; n++) { (n <= 4 ? v2 : v1).push(t(n)); (n <= 4 ? v1 : v2).push("x"); if (n % 4 === 0 && n < 16) { v1.push("|"); v2.push("|"); } }
    return "X:1\nL:1/4\nM:none\nK:C\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\n[V:1] " + v1.join(" ") + " |]\n[V:2] " + v2.join(" ") + " |]\n";
  }
  function Series(host) {
    var w = Base(host, "The harmonic series"); w.playLabel = "▶ Play"; w.playBtn.remove();
    var root = ROOTS[0], staff = el("div", "sk-staff"), info = el("p", "sk-info", "Click a note to hear that harmonic.");
    w.pick("root", "Fundamental", ROOTS.map(function (r) { return [r[0], r[1] + (Math.floor(r[2] / 12) - 1)]; }), "C", null, function (v) { root = ROOTS.filter(function (r) { return r[0] === v; })[0]; draw(); });
    w.body.appendChild(staff); w.body.appendChild(info);
    var row = el("div", "sk-presets");
    button(row, "▶ Up the series", function () { play("up"); });
    button(row, "▶ Same notes, equal-tempered", function () { play("et"); });
    button(row, "▶ Harmonic, then tempered", function () { play("ab"); });
    button(row, "▶ Build the tone, one harmonic at a time", function () { play("build"); });
    button(row, "■", function () { w.stop(); });
    w.body.insertBefore(row, staff);
    w.view = viewer(w.body, { noScope: false, ms: 40, overlay: function (g, X, W, H, C) {
      var f0 = mtof(root[2]); g.strokeStyle = C.hot; g.globalAlpha = .35; g.setLineDash([2, 3]);
      for (var n = 1; n <= 16; n++) { var x = X(f0 * n); g.beginPath(); g.moveTo(x, 14); g.lineTo(x, H); g.stroke(); }
      g.setLineDash([]); g.globalAlpha = 1;
    } });
    var text = "";
    function draw() {
      if (!global.ABCJS) { staff.textContent = "(notation library missing)"; return; }
      text = global.AbcTranspose ? AbcTranspose.transpose(seriesAbc(), root[0]) : seriesAbc();
      ABCJS.renderAbc(staff, text, { responsive: "resize", add_classes: true, paddingleft: 0, paddingright: 0, clickListener: function (e) { var s = text.slice(0, e.endChar), m, last = null, re = /"_(\d+)"/g; while ((m = re.exec(s))) last = +m[1]; if (last) one(last); } });
      w.view.dirty = true;
    }
    function f(n, et) { return et ? mtof(root[2] + semis(n)) : mtof(root[2]) * n; }
    function one(n) {
      w.start(); var c = ac(), t = c.currentTime + .02;
      tone(c, w.out, f(n), t, 1.2, .35);
      var ct = Math.round(cents(n));
      info.textContent = "Harmonic " + n + ": " + fmtHz(f(n)) + ", " + n + " × the fundamental. Nearest note " + noteName(root[2] + semis(n)) + (ct ? ", " + Math.abs(ct) + " cents " + (ct > 0 ? "sharp" : "flat") + " of the piano's " + fmtHz(f(n, true)) : ", the same as the piano") + ".";
    }
    var timer = null;
    w.onStart = function () { return function () { clearTimeout(timer); }; };
    function play(how) {
      w.stop(); w.start(); var c = ac(), t = c.currentTime + .05;
      if (how === "build") { for (var n = 1; n <= 16; n++) tone(c, w.out, f(n), t + (n - 1) * .45, 16 * .45 - (n - 1) * .45 + 2.5, .3 / n); info.textContent = "Each harmonic enters at strength 1/n. With all sixteen it is close to a sawtooth wave."; timer = setTimeout(function () { w.stop(); }, 10500); return; }
      for (var k = 1; k <= 16; k++) {
        if (how === "ab") { tone(c, w.out, f(k), t + (k - 1) * 1.1, .5, .3); tone(c, w.out, f(k, true), t + (k - 1) * 1.1 + .52, .5, .3); }
        else tone(c, w.out, f(k, how === "et"), t + (k - 1) * .42, .4, .3);
      }
      info.textContent = how === "ab" ? "Each harmonic, then the piano's version of the same note. Listen at 7, 11, 13 and 14." : how === "et" ? "The nearest piano notes. Harmonics 7, 11 and 13 have no close match on a piano." : "Harmonics 1 to 16, exactly n × the fundamental.";
      timer = setTimeout(function () { w.stop(); }, (how === "ab" ? 18 : 7.5) * 1000);
    }
    draw();
    return w;
  }

  // ======================================================================================
  // interval: two notes, tuned pure (a whole-number ratio) or equal-tempered. Where the harmonics of the two notes should
  // coincide, the tempered ones are a few Hz apart and beat. "Only the two harmonics that should match" plays just that pair of
  // sine waves, so the beating is the whole sound; the picture is their sum, drawn slowed down.
  var IVS = [["M3", "Major third, 5:4", 5, 4, 4], ["m3", "Minor third, 6:5", 6, 5, 3], ["P5", "Fifth, 3:2", 3, 2, 7], ["P4", "Fourth, 4:3", 4, 3, 5],
             ["M6", "Major sixth, 5:3", 5, 3, 9], ["m6", "Minor sixth, 8:5", 8, 5, 8], ["M2", "Major second, 9:8", 9, 8, 2], ["P8", "Octave, 2:1", 2, 1, 12]];
  function Interval(host) {
    var w = Base(host, "Two notes, two tunings"), NP = 6;
    var ivs = {}; IVS.forEach(function (r) { ivs[r[0]] = { n: r[2], d: r[3], st: r[4] }; });
    w.pick("iv", "Interval", IVS.map(function (r) { return [r[0], r[1]]; }), "M3", null, function () { retune(); });
    w.pick("tun", "Tuning", [["just", "Just: the pure ratio"], ["equal", "Equal temperament: the piano"]], "just", null, function () { retune(); });
    w.pick("show", "Sound", [["notes", "The two notes, with harmonics"], ["pair", "Only the two harmonics that should match"]], "notes", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.num("root", { label: "Lower note", min: 80, max: 440, log: true, value: 220, fmt: fmtHz, on: function () { retune(); } });
    function ratio(tun) { var v = ivs[w.P.iv]; return tun === "equal" ? Math.pow(2, v.st / 12) : v.n / v.d; }
    function fLow() { return +w.P.root; }
    function fHigh(tun) { return fLow() * ratio(tun || w.P.tun); }
    function beat(tun) { var v = ivs[w.P.iv]; return Math.abs(v.n * fLow() - v.d * fHigh(tun)); }   // the n-th harmonic of the lower note against the d-th of the upper
    var info = el("p", "sk-info"); w.body.appendChild(info);
    var row = el("div", "sk-presets"); w.body.insertBefore(row, w.ctls);
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "The sum of the two matching harmonics, slowed down: its loudness swells and fades as they drift in and out of step"); w.body.appendChild(cv);
    w.view = viewer(w.body, { ms: 25 });
    var oscs = [];
    function parts() {
      var ps = [], k;
      if (w.P.show === "pair") { ps.push({ lvl: 1, f: function () { return ivs[w.P.iv].n * fLow(); } }); ps.push({ lvl: 1, f: function () { return ivs[w.P.iv].d * fHigh(); } }); }
      else for (k = 1; k <= NP; k++) (function (k) { ps.push({ lvl: 1 / k, f: function () { return k * fLow(); } }); ps.push({ lvl: 1 / k, f: function () { return k * fHigh(); } }); })(k);
      return ps;
    }
    function retune() { if (!oscs.length) return; var t = ac().currentTime; oscs.forEach(function (p) { p.o.frequency.setTargetAtTime(p.f(), t, .01); }); }
    w.onStart = function (c, out) {
      if (w.demo) return function () {};
      var mix = c.createGain(); mix.gain.value = w.P.show === "pair" ? .16 : .09; mix.connect(out);
      oscs = parts().map(function (p) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = p.f(); g.gain.value = p.lvl; o.connect(g); g.connect(mix); o.start(); return { o: o, f: p.f }; });
      return function () { var t = c.currentTime + .1; oscs.forEach(function (p) { p.o.stop(t); }); oscs = []; };
    };
    function demo(first) {   // the same interval in one tuning, then the other
      var second = first === "just" ? "equal" : "just";
      w.demo = true; w.stop(); w.start(); w.demo = false; var c = ac(), t = c.currentTime + .05;
      [first, second].forEach(function (tun, i) {
        var t0 = t + i * 3.3, lo = fLow(), hi = fHigh(tun), v = ivs[w.P.iv];
        if (w.P.show === "pair") { tone(c, w.out, v.n * lo, t0, 3, .2); tone(c, w.out, v.d * hi, t0, 3, .2); }
        else for (var k = 1; k <= NP; k++) { tone(c, w.out, k * lo, t0, 3, .09 / k); tone(c, w.out, k * hi, t0, 3, .09 / k); }
      });
      w.demoOn = true; info.textContent = "First " + (first === "just" ? "just" : "equal-tempered") + ", then " + (second === "just" ? "just" : "equal-tempered") + ". Listen for the slow wobble in the tempered one.";
      clearTimeout(w.dt); w.dt = setTimeout(function () { w.stop(); w.demoOn = false; w.redraw(); }, 6900);
    }
    button(row, "▶ Just, then equal", function () { demo("just"); });
    button(row, "▶ Equal, then just", function () { demo("equal"); });
    button(row, "■", function () { w.stop(); });
    w.redraw = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, v = ivs[w.P.iv], b = beat(), mid = H / 2, N = 600, carrier = 24, span = b < .05 ? 1 : 3, i;
      var cs = 1200 * Math.log2(ratio(w.P.tun) / (v.n / v.d)), nm = IVS.filter(function (r) { return r[0] === w.P.iv; })[0][1];
      if (!w.demoOn) info.textContent = nm + ", " + (w.P.tun === "just" ? "just" : "equal-tempered") + ": " + fmtHz(fLow()) + " and " + fmtHz(fHigh()) + ". "
        + (w.P.tun === "just" ? "The pure ratio, 0 cents off." : "That is " + (cs >= 0 ? "+" : "−") + Math.abs(cs).toFixed(1) + " cents from the pure " + v.n + ":" + v.d + ".")
        + " Harmonic " + v.n + " of the lower note meets harmonic " + v.d + " of the upper: " + (v.n * fLow()).toFixed(1) + " Hz against " + (v.d * fHigh()).toFixed(1) + " Hz, "
        + (b < .05 ? "the same pitch, so they do not beat." : "which beat " + (b < 10 ? b.toFixed(1) : Math.round(b)) + " times a second.");
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, mid); g.lineTo(W, mid); g.stroke();
      // two sines added, drawn slowed down: 24 cycles of the carrier per swell, three swells across
      g.strokeStyle = C.hot; g.lineWidth = 1.2; g.beginPath();
      for (i = 0; i <= N; i++) { var u = i / N * span, y = mid - (b < .05 ? 1 : Math.cos(Math.PI * u)) * Math.sin(2 * Math.PI * carrier * u) * (H / 2 - 8); i ? g.lineTo(i / N * W, y) : g.moveTo(0, y); }
      g.stroke();
      if (b >= .05) {
        g.strokeStyle = C.acc2; g.globalAlpha = .6; g.setLineDash([4, 3]);
        [-1, 1].forEach(function (sg) { g.beginPath(); for (i = 0; i <= N; i++) { var y = mid - sg * Math.abs(Math.cos(Math.PI * i / N * span)) * (H / 2 - 8); i ? g.lineTo(i / N * W, y) : g.moveTo(0, y); } g.stroke(); });
        g.setLineDash([]); g.globalAlpha = 1;
      }
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif";
      g.fillText(b < .05 ? "the two matching harmonics agree: a steady tone (not to scale)" : "the two matching harmonics added together, slowed down, " + (b < 10 ? b.toFixed(1) : Math.round(b)) + " swells a second (not to scale)", 6, H - 4);
    });
    return w;
  }

  // ======================================================================================
  // additive: sixteen harmonic sliders.
  function Additive(host) {
    var w = Base(host, "Build a wave from sine waves"), N = 16, amps = new Array(N + 1).fill(0); amps[1] = 1;
    var grid = el("div", "sk-harm"), sliders = [];
    for (var n = 1; n <= N; n++) (function (n) {
      var col = el("div", "sk-hcol"), r = el("input"), b = el("button", "sk-hn", String(n)); r.type = "range"; r.min = -1; r.max = 1; r.step = .01; r.value = amps[n];
      r.setAttribute("aria-label", "Harmonic " + n + " strength"); b.type = "button"; b.title = "Hear harmonic " + n + " alone";
      r.addEventListener("input", function () { amps[n] = +r.value; update(); });
      b.addEventListener("click", function () { var c = ac(); if (!w.running) w.start(); var t = c.currentTime; w.solo(n); });
      col.appendChild(r); col.appendChild(b); grid.appendChild(col); sliders[n] = r;
    })(n);
    var keep = { n: 16 };
    w.presets([
      { name: "Sine", then: function () { fill(function (n) { return n === 1 ? 1 : 0; }); } },
      { name: "Sawtooth", then: function () { fill(function (n) { return 1 / n; }); } },
      { name: "Square", then: function () { fill(function (n) { return n % 2 ? 1 / n : 0; }); } },
      { name: "Triangle", then: function () { fill(function (n) { return n % 2 ? (((n - 1) / 2) % 2 ? -1 : 1) / (n * n) : 0; }); } },
      { name: "Pulse 25%", then: function () { fill(function (n) { return Math.sin(Math.PI * n * .25) / n; }); } },
      { name: "Pulse 1/3", then: function () { fill(function (n) { return Math.sin(Math.PI * n / 3) / n; }); } },
      { name: "Organ", then: function () { fill(function (n) { return [0, 1, .8, 0, .6, 0, 0, 0, .5, 0, 0, 0, .3, 0, 0, 0, .3][n]; }); } },
      { name: "Clear", then: function () { fill(function () { return 0; }); } }
    ]);
    var last = function (n) { return n === 1 ? 1 : 0; };
    function fill(fn) { last = fn; for (var n = 1; n <= N; n++) { amps[n] = n <= keep.n ? fn(n) : 0; sliders[n].value = amps[n]; } update(); }
    w.num("use", { label: "Harmonics used", min: 1, max: 16, step: 1, value: 16, fmt: fmtN(0), on: function (v) { keep.n = v; fill(last); } });
    w.num("freq", { label: "Fundamental", min: 40, max: 1000, log: true, value: 110, fmt: fmtHz });
    w.body.appendChild(grid);
    var cv = el("canvas", "sk-plot"); cv.setAttribute("aria-label", "Each harmonic as a faint sine wave and their sum as a bold line"); w.body.appendChild(cv);
    var redraw = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, P = 300;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
      var sum = new Float32Array(P), peak = 0;
      for (var n = 1; n <= N; n++) { if (!amps[n]) continue; g.strokeStyle = C.ink2; g.globalAlpha = .35; g.beginPath();
        for (var i = 0; i < P; i++) { var y = amps[n] * Math.sin(2 * Math.PI * n * 2 * i / P); sum[i] += y; var py = H / 2 - y * H * .22; i ? g.lineTo(i / P * W, py) : g.moveTo(0, py); } g.stroke(); }
      g.globalAlpha = 1; for (var j = 0; j < P; j++) peak = Math.max(peak, Math.abs(sum[j]));
      var k = peak > 1 ? 1 / peak : 1; g.strokeStyle = C.acc2; g.lineWidth = 2.2; g.beginPath();
      for (var i2 = 0; i2 < P; i2++) { var py2 = H / 2 - sum[i2] * k * H * .42; i2 ? g.lineTo(i2 / P * W, py2) : g.moveTo(0, py2); } g.stroke(); g.lineWidth = 1;
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("two cycles: faint lines are the harmonics, the bold line is their sum", 4, 11);
    });
    w.redraw = redraw;
    w.view = viewer(w.body, { ms: 25 });
    var osc = null, g = null;
    function wave() { var c = ac(), re = new Float32Array(N + 1), im = new Float32Array(N + 1), any = false; for (var n = 1; n <= N; n++) { im[n] = amps[n]; if (amps[n]) any = true; } return any ? c.createPeriodicWave(re, im) : null; }
    function update() { redraw(); if (osc) { var p = wave(); if (p) { osc.setPeriodicWave(p); g.gain.setTargetAtTime(.35, ac().currentTime, .01); } else g.gain.setTargetAtTime(0, ac().currentTime, .01); } }
    w.onStart = function (c, out) {
      osc = c.createOscillator(); osc.frequency.value = w.P.freq; g = c.createGain(); g.gain.value = 0; osc.connect(g); g.connect(out); osc.start(); update();
      return function () { osc.stop(c.currentTime + .1); osc = null; };
    };
    w.apply = function (k, v) { if (k === "freq" && osc) osc.frequency.setTargetAtTime(v, ac().currentTime, .01); };
    w.solo = function (n) { var c = ac(); tone(c, w.out, w.P.freq * n, c.currentTime + .01, .8, .3); };
    monoKeys(w, function (f) { w.c.freq.set(Math.max(40, Math.min(1000, f))); });
    return w;
  }

  // ======================================================================================
  // wave: one oscillator, with pulse width and PWM.
  function Wave(host) {
    var w = Base(host, "Oscillator");
    w.pick("type", "Wave", [["sine", "Sine"], ["triangle", "Triangle"], ["sawtooth", "Sawtooth"], ["square", "Square"], ["pulse", "Pulse"]], "sawtooth", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.num("freq", { label: "Pitch", min: 30, max: 2000, log: true, value: 110, fmt: fmtHz });
    w.num("width", { label: "Pulse width", min: .02, max: .98, step: .01, value: .5, fmt: fmtPct });
    w.num("pwmRate", { label: "PWM rate", min: .05, max: 10, log: true, value: .5, fmt: fmtHz });
    w.num("pwmDepth", { label: "PWM depth", min: 0, max: .45, step: .01, value: 0, fmt: fmtPct });
    w.view = viewer(w.body, { ms: 25 });
    var o = null, lfo = null, lg = null;
    function pwmGain() { return w.P.pwmDepth / w.P.freq; }
    w.onStart = function (c, out) {
      o = mkOsc(c, w.P.type, w.P.freq, w.P.width); var g = c.createGain(); g.gain.value = .4; o.out.connect(g); g.connect(out); o.start(c.currentTime);
      if (o.delay) { lfo = c.createOscillator(); lfo.frequency.value = w.P.pwmRate; lg = c.createGain(); lg.gain.value = pwmGain(); lfo.connect(lg); lg.connect(o.delay.delayTime); lfo.start(); }
      return function () { var t = c.currentTime + .1; o.stop(t); if (lfo) lfo.stop(t); o = lfo = lg = null; };
    };
    w.apply = function (k, v) {
      var c = ac(), t = c.currentTime; if (!o) return;
      if (k === "freq") { if (o.setFreq) o.setFreq(v, t); else o.frequency.setTargetAtTime(v, t, .005); if (lg) lg.gain.setValueAtTime(pwmGain(), t); }
      if (k === "width") o.setWidth(v, t);
      if (k === "pwmRate" && lfo) lfo.frequency.setTargetAtTime(v, t, .01);
      if (k === "pwmDepth" && lg) lg.gain.setTargetAtTime(pwmGain(), t, .01);
    };
    monoKeys(w, function (f) { w.c.freq.set(Math.max(30, Math.min(2000, f))); });
    return w;
  }

  // ======================================================================================
  // noise: colours of noise, and sounds made from noise.
  function Noise(host) {
    var w = Base(host, "Noise");
    w.pick("color", "Colour", [["white", "White"], ["pink", "Pink"], ["brown", "Brown"]], "white", null, function () { if (w.running && w.mode === "plain") { w.stop(); w.start(); } });
    var row = el("div", "sk-presets"); row.appendChild(el("span", "sk-cl", "Made from noise"));
    [["wind", "Wind"], ["surf", "Surf"], ["hat", "Hi-hat"], ["snare", "Snare"], ["steam", "Steam"], ["rain", "Rain"]].forEach(function (p) { button(row, p[1], function () { w.stop(); w.mode = p[0]; w.start(); }); });
    w.body.insertBefore(row, w.ctls);
    w.view = viewer(w.body, { ms: 20 });
    w.mode = "plain";
    w.playBtn.addEventListener("click", function () { w.mode = "plain"; }, true);
    w.onStart = function (c, out) {
      var stops = [], m = w.mode, t = c.currentTime;
      function src(kind) { var n = noiseSrc(kind); n.start(); stops.push(function () { n.stop(); }); return n; }
      function lfo(rate, depth, param) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); stops.push(function () { o.stop(); }); }
      if (m === "plain") { src(w.P.color).connect(out); }
      else if (m === "wind") { var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 6; src("pink").connect(bp); var g = c.createGain(); g.gain.value = 2.5; bp.connect(g); g.connect(out); lfo(.13, 1100, bp.detune); lfo(.07, 250, bp.frequency); }
      else if (m === "surf") { var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; var a = c.createGain(); a.gain.value = .45; src("pink").connect(lp); lp.connect(a); a.connect(out); lfo(.12, .42, a.gain); lfo(.12, 2400, lp.detune); }
      else if (m === "steam") { var hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000; src("white").connect(hp); hp.connect(out); }
      else if (m === "rain") { var lp2 = c.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 2500; var bg = c.createGain(); bg.gain.value = .5; src("pink").connect(lp2); lp2.connect(bg); bg.connect(out);
        stops.push(loop(c, .03, function (s, tt) { if (Math.random() < .35) { var b = c.createBiquadFilter(), gg = c.createGain(), n = noiseSrc("white"); b.type = "bandpass"; b.frequency.value = 1500 + Math.random() * 5000; b.Q.value = 20; gg.gain.setValueAtTime(Math.random() * 2, tt); gg.gain.exponentialRampToValueAtTime(.001, tt + .03); n.connect(b); b.connect(gg); gg.connect(out); n.start(tt); n.stop(tt + .04); } })); }
      else if (m === "hat") stops.push(loop(c, 60 / 120 / 2, function (s, tt) { hat(c, out, tt, .9, s % 8 === 7); }));
      else if (m === "snare") stops.push(loop(c, 60 / 100, function (s, tt) { snare(c, out, tt, 1); }));
      return function () { stops.forEach(function (f) { f(); }); };
    };
    return w;
  }

  // ======================================================================================
  // Effects: source picker, dry/wet mix, bypass, and the effect itself (w.build).
  function Fx(host, title, defSource, defMix) {
    var w = Base(host, title), src = null;
    var sources = Object.keys(SOURCES).map(function (k) { return [k, SOURCES[k]]; });
    w.pick("source", "Source", sources, host.getAttribute("data-source") || defSource, w.tools, function () { if (w.running) swap(); });
    w.tools.insertBefore(w.c.source.el, w.playBtn);
    var byp = button(w.tools, "Bypass", function () { w.bypass = !w.bypass; byp.classList.toggle("sk-on", w.bypass); byp.setAttribute("aria-pressed", String(w.bypass)); mix(); });
    byp.title = "Switch the effect out and back in to compare"; byp.setAttribute("aria-pressed", "false");
    w.status = el("span", "sk-status"); w.tools.appendChild(w.status);
    var mixC = w.num("mix", { label: "Mix (dry → wet)", min: 0, max: 1, step: .01, value: defMix == null ? 1 : defMix, fmt: fmtPct, on: function () { mix(); } });
    var dry, wet, bus;
    function mix() { if (!dry) return; var t = ac().currentTime, m = w.bypass ? 0 : w.P.mix; dry.gain.setTargetAtTime(1 - m, t, .02); wet.gain.setTargetAtTime(m, t, .02); }
    function swap() {
      var c = ac(); if (src) { src.stop(); try { src.out.disconnect(); } catch (e) {} src = null; }
      var mine = w.c.source.value; w.status.textContent = mine === "mic" ? "Opening the microphone… use headphones." : "";
      makeSource(mine, c).then(function (s) { if (!w.running || w.c.source.value !== mine) { s.stop(); return; } src = s; s.out.connect(bus); w.status.textContent = mine === "mic" ? (SK.micResult && SK.micResult.output === "speakers" ? "Microphone on, but your speakers are playing. Put on headphones now or this will feed back; Stop silences it." : "Microphone on. Use headphones.") : mine === "keys" ? "Play the computer keys, the keyboard below or MIDI." : ""; },
        function (e) { w.status.textContent = "Microphone not available: " + (e.message || e.name); });
    }
    w.usesMic = function () { return w.c.source.value === "mic"; };
    w.onStart = function (c, out) {
      bus = c.createGain(); dry = c.createGain(); wet = c.createGain(); bus.connect(dry); dry.connect(out); wet.connect(out);
      var fx = w.build(c); bus.connect(fx.input); fx.output.connect(wet); mix(); swap();
      return function () { if (src) { src.stop(); src = null; } if (fx.stop) fx.stop(); w.n = null; dry = wet = bus = null; };
    };
    w.noteOn = function (m, v, t) { if (w.c.source.value !== "keys") { w.c.source.input.value = "keys"; w.P.source = "keys"; if (w.running) swap(); } if (!w.running) w.start(); var go = function () { if (src && src.noteOn) src.noteOn(m, v || .8, t); else setTimeout(go, 20); }; go(); };
    w.noteOff = function (m, t) { if (src && src.noteOff) src.noteOff(m, t); };
    return w;
  }

  // ---------- filter ----------
  function Filter(host) {
    var w = Fx(host, "Filter", "noise", 1), resp = new Float32Array(200), mag = new Float32Array(200), ph = new Float32Array(200);
    for (var i = 0; i < 200; i++) resp[i] = 20 * Math.pow(1000, i / 199);
    w.pick("type", "Type", [["lowpass", "Low-pass"], ["highpass", "High-pass"], ["bandpass", "Band-pass"], ["notch", "Notch"], ["peaking", "Peak (bell)"], ["lowshelf", "Low shelf"], ["highshelf", "High shelf"]], "lowpass");
    w.num("cutoff", { label: "Cutoff", min: 30, max: 18000, log: true, value: 1000, fmt: fmtHz });
    w.num("q", { label: "Resonance (Q)", min: .3, max: 30, log: true, value: .7, fmt: fmtN(1) });
    w.num("gain", { label: "Boost/cut (peak, shelf)", min: -24, max: 24, step: .5, value: 12, fmt: fmtDb });
    w.pick("slope", "Slope", [["1", "12 dB per octave"], ["2", "24 dB per octave"]], "1");
    var sweepB = button(w.tools, "Sweep", function () { w.sweeping = !w.sweeping; sweepB.classList.toggle("sk-on", w.sweeping); if (w.sweeping && !w.running) w.start(); });
    sweepB.title = "Move the cutoff up and down slowly";
    var probe = null;
    w.view = viewer(w.body, { ms: 20, overlay: function (g, X, W, H, C) {
      var c = ac(); if (!probe) probe = c.createBiquadFilter();
      probe.type = w.P.type; probe.frequency.value = w.n ? w.n.f[0].frequency.value : w.P.cutoff; probe.Q.value = w.P.q; probe.gain.value = w.P.gain;
      probe.getFrequencyResponse(resp, mag, ph);
      g.strokeStyle = C.hot; g.lineWidth = 2; g.beginPath();
      for (var i = 0; i < 200; i++) { var db = 20 * Math.log10(mag[i] + 1e-9) * (+w.P.slope), y = H * (.5 - db / 72); y = Math.max(14, Math.min(H, y)); i ? g.lineTo(X(resp[i]), y) : g.moveTo(X(resp[i]), y); }
      g.stroke(); g.lineWidth = 1; g.fillStyle = C.hot; g.fillText("filter response (0 dB at middle)", W - 170, 11);
      g.strokeStyle = C.hot; g.globalAlpha = .3; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    } });
    w.redraw = function () { w.view.dirty = true; };
    w.build = function (c) {
      var f = [c.createBiquadFilter(), c.createBiquadFilter()], inp = c.createGain(), out = c.createGain();
      f.forEach(function (x) { x.type = w.P.type; x.frequency.value = w.P.cutoff; x.Q.value = w.P.q; x.gain.value = w.P.gain; });
      inp.connect(f[0]); route();
      function route() { try { f[0].disconnect(); f[1].disconnect(); } catch (e) {} if (w.P.slope === "2") { f[0].connect(f[1]); f[1].connect(out); f[1].Q.value = .7071; } else f[0].connect(out); }
      var t0 = c.currentTime, id = setInterval(function () { if (!w.sweeping) return; var t = c.currentTime - t0, v = 80 * Math.pow(100, .5 - .5 * Math.cos(t * .9)); f.forEach(function (x) { x.frequency.setTargetAtTime(v, c.currentTime, .03); }); w.c.cutoff.input.value = 1000 * Math.log(v / 30) / Math.log(600); }, 30);
      w.n = { f: f, route: route };
      return { input: inp, output: out, stop: function () { clearInterval(id); } };
    };
    w.apply = function (k, v) {
      if (!w.n) return; var t = ac().currentTime, f = w.n.f;
      if (k === "type") f.forEach(function (x) { x.type = v; });
      if (k === "cutoff") f.forEach(function (x) { x.frequency.setTargetAtTime(v, t, .01); });
      if (k === "q") f[0].Q.setTargetAtTime(v, t, .01);
      if (k === "gain") f.forEach(function (x) { x.gain.setTargetAtTime(v, t, .01); });
      if (k === "slope") w.n.route();
    };
    return w;
  }

  // ---------- LFO ----------
  function Lfo(host) {
    var w = Base(host, "LFO");
    w.pick("dest", "LFO moves", [["pitch", "Pitch (vibrato)"], ["amp", "Volume (tremolo)"], ["cutoff", "Filter cutoff (wah)"], ["pan", "Pan (left ↔ right)"]], "pitch");
    w.pick("shape", "LFO shape", [["sine", "Sine"], ["triangle", "Triangle"], ["square", "Square"], ["sawtooth", "Sawtooth (ramp)"], ["random", "Random (sample & hold)"]], "sine");
    w.num("rate", { label: "Rate", min: .05, max: 200, log: true, value: 5, fmt: fmtHz });
    w.num("depth", { label: "Depth", min: 0, max: 1, step: .01, value: .3, fmt: fmtPct });
    w.pick("tone", "Sound", [["sawtooth", "Sawtooth"], ["sine", "Sine"], ["chords", "Chords"]], "sawtooth", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.num("freq", { label: "Pitch", min: 50, max: 1000, log: true, value: 220, fmt: fmtHz });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "The LFO's shape over two seconds; the dot is where it is now"); w.body.appendChild(cv);
    w.view = viewer(w.body, { ms: 40 });
    var n = null, t0 = 0, rnd = [];
    function shapeAt(x) { x = x - Math.floor(x); var s = w.P.shape; return s === "sine" ? Math.sin(2 * Math.PI * x) : s === "square" ? (x < .5 ? 1 : -1) : s === "sawtooth" ? 2 * x - 1 : 0; }
    function tri(x) { x = x - Math.floor(x); return x < .25 ? 4 * x : x < .75 ? 2 - 4 * x : 4 * x - 4; }
    w.redraw = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, secs = 2, now = w.running ? ac().currentTime - t0 : 0, rate = w.P.rate;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
      g.strokeStyle = C.acc2; g.lineWidth = 1.8; g.beginPath();
      var steps = Math.min(2000, Math.max(200, rate * secs * 40));
      for (var i = 0; i <= steps; i++) { var tt = now - secs + i / steps * secs, ph = tt * rate, v = w.P.shape === "triangle" ? tri(ph) : w.P.shape === "random" ? rv(Math.floor(ph)) : shapeAt(ph); var y = H / 2 - v * w.P.depth * H * .42; i ? g.lineTo(i / steps * W, y) : g.moveTo(0, y); }
      g.stroke(); g.lineWidth = 1;
      if (w.running) { var ph2 = now * rate, v2 = w.P.shape === "triangle" ? tri(ph2) : w.P.shape === "random" ? rv(Math.floor(ph2)) : shapeAt(ph2); g.fillStyle = C.hot; g.beginPath(); g.arc(W - 4, H / 2 - v2 * w.P.depth * H * .42, 5, 0, 7); g.fill(); }
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("LFO, last 2 seconds", 4, 11);
    });
    function rv(k) { k = ((k % 4096) + 4096) % 4096; if (rnd[k] == null) rnd[k] = Math.random() * 2 - 1; return rnd[k]; }
    function amount() { var d = w.P.depth; return w.P.dest === "pitch" ? d * 200 : w.P.dest === "amp" ? d * .5 : w.P.dest === "cutoff" ? d * 3600 : d; }
    w.onStart = function (c, out) {
      t0 = c.currentTime; rnd = [];
      var pan = c.createStereoPanner(), amp = c.createGain(), lp = c.createBiquadFilter(), stops = [], dets = [];
      amp.gain.value = .5; lp.type = "lowpass"; lp.frequency.value = 1200; lp.Q.value = 6; lp.connect(amp); amp.connect(pan); pan.connect(out);
      if (w.P.tone === "chords") { var srcStop = loop(c, 2.4, function (s, t) { pad(c, lp, t, CHORDS[s % 4], 2.4); }); stops.push(srcStop); }
      else { var o = c.createOscillator(); o.type = w.P.tone; o.frequency.value = w.P.freq; o.connect(lp); o.start(); dets.push(o); stops.push(function () { o.stop(); }); }
      var lfo, lg = c.createGain(); lg.gain.value = amount();
      if (w.P.shape === "random") { lfo = c.createConstantSource(); lfo.offset.value = 0; var k = -1; stops.push(loop(c, .02, function (s, t) { var j = Math.floor((t - t0) * w.P.rate); if (j !== k) { k = j; lfo.offset.setValueAtTime(rv(j), t); } })); }
      else if (w.P.shape === "triangle" || w.P.shape === "sawtooth" || w.P.shape === "square") {
        // the browser's own triangle/saw/square are fine as LFOs, but start them in phase with the drawing
        lfo = c.createOscillator(); lfo.type = w.P.shape; lfo.frequency.value = w.P.rate;
        if (w.P.shape === "triangle") { lfo.type = "custom"; var re = new Float32Array(32), im = new Float32Array(32); for (var h = 1; h < 32; h += 2) im[h] = 8 / (Math.PI * Math.PI) * ((h - 1) / 2 % 2 ? -1 : 1) / (h * h); lfo.setPeriodicWave(c.createPeriodicWave(re, im, { disableNormalization: true })); }
      } else { lfo = c.createOscillator(); lfo.frequency.value = w.P.rate; }
      lfo.connect(lg); lfo.start(); stops.push(function () { lfo.stop(); });
      n = { lfo: lfo, lg: lg, lp: lp, amp: amp, pan: pan, dets: dets, osc: dets[0] };
      connect();
      return function () { stops.forEach(function (f) { f(); }); n = null; };
    };
    function connect() {
      try { n.lg.disconnect(); } catch (e) {}
      var d = w.P.dest; if (d === "pitch") { n.dets.forEach(function (o) { n.lg.connect(o.detune); }); if (!n.dets.length) n.lg.connect(n.lp.detune); }
      else if (d === "amp") n.lg.connect(n.amp.gain); else if (d === "cutoff") n.lg.connect(n.lp.detune); else n.lg.connect(n.pan.pan);
      n.lp.frequency.value = d === "cutoff" ? 900 : 4000; n.lp.Q.value = d === "cutoff" ? 8 : .7;
    }
    w.apply = function (k, v) {
      if (!n) return; var t = ac().currentTime;
      if (k === "rate" && n.lfo.frequency) n.lfo.frequency.setTargetAtTime(v, t, .01);
      if (k === "depth") n.lg.gain.setTargetAtTime(amount(), t, .01);
      if (k === "dest") { connect(); n.lg.gain.setValueAtTime(amount(), t); }
      if (k === "shape") { w.stop(); w.start(); }
      if (k === "freq" && n.osc) n.osc.frequency.setTargetAtTime(v, t, .01);
    };
    monoKeys(w, function (f) { w.c.freq.set(Math.max(50, Math.min(1000, f))); });
    return w;
  }

  // ---------- a poly instrument base: voices, a demo phrase, keys ----------
  function Instrument(host, title, voice, demos) {
    var w = Base(host, title), poly = null, demoStop = null;
    w.playLabel = "▶ Demo"; w.playBtn.textContent = "▶ Demo";
    w.demo = Object.keys(demos)[0];
    w.onStart = function (c, out) {
      w.bus = c.createGain(); w.bus.connect(out); if (w.setup) w.setup(c, w.bus);
      poly = new Poly(function (m, v, t) { return voice(c, m, v, t); });
      if (!w.byKeys) { var d = demos[w.demo] || demos[Object.keys(demos)[0]]; demoStop = phrase(w, d.bpm, d.evs, d.beats); }
      return function () { if (demoStop) demoStop(); demoStop = null; poly.all(c.currentTime); poly = null; if (w.teardown) w.teardown(); };
    };
    w.noteOn = function (m, v, t, fromDemo) { if (!fromDemo && demoStop) { demoStop(); demoStop = null; } if (!w.running) { w.byKeys = true; w.start(); w.byKeys = false; } if (poly) poly.on(m, v || .8, t || ac().currentTime); };
    w.noteOff = function (m, t) { if (poly) poly.off(m, t || ac().currentTime); };
    w.voices = function (fn) { if (poly) poly.each(fn); };
    return w;
  }
  var DEMOS = {
    bass: { bpm: 112, beats: 8, evs: [[0, .45, 36], [.5, .45, 36], [1, .45, 48], [1.5, .45, 36], [2, .45, 39], [2.5, .45, 41], [3, .45, 43], [3.5, .45, 46], [4, .45, 41], [4.5, .45, 41], [5, .45, 53], [5.5, .45, 41], [6, .45, 43], [6.5, .45, 44], [7, .45, 46], [7.5, .45, 34]] },
    chords: { bpm: 80, beats: 16, evs: [[0, 3.8, [48, 55, 60, 64, 67]], [4, 3.8, [45, 52, 57, 60, 64]], [8, 3.8, [41, 53, 57, 60, 64]], [12, 3.8, [43, 50, 55, 59, 62]]] },
    lead: { bpm: 100, beats: 8, evs: [[0, .9, 72], [1, .45, 74], [1.5, .45, 75], [2, 1.4, 79], [3.5, .45, 77], [4, .45, 75], [4.5, .45, 74], [5, 2.8, 72]] },
    pluck: { bpm: 120, beats: 4, evs: [[0, .2, 60], [.25, .2, 67], [.5, .2, 72], [.75, .2, 76], [1, .2, 79], [1.25, .2, 76], [1.5, .2, 72], [1.75, .2, 67], [2, .2, 57], [2.25, .2, 64], [2.5, .2, 69], [2.75, .2, 72], [3, .2, 76], [3.25, .2, 72], [3.5, .2, 69], [3.75, .2, 64]] },
    bells: { bpm: 70, beats: 8, evs: [[0, 1.8, 72], [1, 1.8, 76], [2, 1.8, 79], [3, 3.5, 84], [5, 2.5, [67, 76]]] }
  };
  function demoPick(w, demos, def) { w.pick("demo", "Demo plays", Object.keys(demos).map(function (k) { return [k, k[0].toUpperCase() + k.slice(1)]; }), def, w.tools, function (v) { w.demo = v; if (w.running) { w.stop(); w.start(); } }); w.tools.insertBefore(w.c.demo.el, w.playBtn); w.demo = def; }
  function envCtls(w, box, pre, label, a, d, s, r) {
    var g = el("div", "sk-group"); g.appendChild(el("div", "sk-gl", label)); box.appendChild(g);
    var gg = el("div", "sk-ctls"); g.appendChild(gg);
    w.num(pre + "a", { label: "Attack", min: .001, max: 3, log: true, value: a, fmt: fmtS }, gg);
    w.num(pre + "d", { label: "Decay", min: .01, max: 4, log: true, value: d, fmt: fmtS }, gg);
    w.num(pre + "s", { label: "Sustain", min: 0, max: 1, step: .01, value: s, fmt: fmtPct }, gg);
    w.num(pre + "r", { label: "Release", min: .01, max: 5, log: true, value: r, fmt: fmtS }, gg);
    return gg;
  }
  function group(w, label) { var g = el("div", "sk-group"); g.appendChild(el("div", "sk-gl", label)); var gg = el("div", "sk-ctls"); g.appendChild(gg); w.ctls.appendChild(g); return gg; }
  function envPlot(w, keys) {
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "Envelope shapes"); w.body.appendChild(cv);
    return anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, hold = .6;
      keys.forEach(function (k, i) {
        var P = w.P, a = P[k[0] + "a"], d = P[k[0] + "d"], su = P[k[0] + "s"], r = P[k[0] + "r"], tot = Math.min(3, a) + Math.min(3, d) + hold + Math.min(3, r), X = function (t) { return t / tot * (W - 10) + 5; }, Y = function (v) { return H - 6 - v * (H - 20); };
        g.strokeStyle = i ? C.hot : C.acc2; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), Y(0)); var aa = Math.min(3, a); g.lineTo(X(aa), Y(1));
        var dd = Math.min(3, d); for (var j = 1; j <= 20; j++) { var tt = dd * j / 20; g.lineTo(X(aa + tt), Y(su + (1 - su) * Math.exp(-3 * tt / Math.max(d, .005)))); }
        g.lineTo(X(aa + dd + hold), Y(su)); var rr = Math.min(3, r); for (var q = 1; q <= 20; q++) { var t2 = rr * q / 20; g.lineTo(X(aa + dd + hold + t2), Y(su * Math.exp(-4 * t2 / Math.max(r, .005)))); }
        g.stroke(); g.fillStyle = i ? C.hot : C.acc2; g.font = "10px system-ui, sans-serif"; g.fillText(k[1], 6 + i * 120, 11);
      });
      g.lineWidth = 1;
    });
  }

  // ---------- subtractive ----------
  var WAVES = [["sawtooth", "Sawtooth"], ["square", "Square"], ["pulse", "Pulse"], ["triangle", "Triangle"], ["sine", "Sine"]];
  function Subtractive(host) {
    var w = Instrument(host, "Subtractive synth", function (c, m, vel, t) {
      var P = w.P, f = mtof(m), out = c.createGain(); out.gain.value = 0; out.connect(w.bus);
      var o1 = mkOsc(c, P.w1, f, P.pw), o2 = mkOsc(c, P.w2, f * Math.pow(2, +P.oct2), P.pw); o2.detune.value = P.det;
      var g1 = c.createGain(), g2 = c.createGain(); g1.gain.value = (1 - P.mix) * .5; g2.gain.value = P.mix * .5; o1.out.connect(g1); o2.out.connect(g2);
      var f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); [f1, f2].forEach(function (x) { x.type = P.ftype; x.frequency.value = P.cut; }); f1.Q.value = P.res; f2.Q.value = .7071;
      g1.connect(f1); g2.connect(f1); f1.connect(f2); f2.connect(out);
      var nz = null; if (P.noise > 0) { nz = noiseSrc("white"); var ng = c.createGain(); ng.gain.value = P.noise * .6; nz.connect(ng); ng.connect(f1); nz.start(t); }
      var amt = P.fenv * 1200; adsrOn(f1.detune, t, P.fa, P.fd, P.fs, amt, 0); adsrOn(f2.detune, t, P.fa, P.fd, P.fs, amt, 0);
      adsrOn(out.gain, t, P.aa, P.ad, P.as, .5 * vel, 0);
      [o1.detune, o2.detune].forEach(function (p) { w.lp.connect(p); }); [f1.detune, f2.detune].forEach(function (p) { w.lc.connect(p); });
      o1.start(t); o2.start(t);
      return { f: [f1, f2], release: function (t2) {
        var end = adsrOff(out.gain, t2, P.ar, 0); adsrOff(f1.detune, t2, P.ar, 0); adsrOff(f2.detune, t2, P.ar, 0);
        o1.stop(end); o2.stop(end); if (nz) nz.stop(end);
        o1.onended(function () { try { w.lp.disconnect(o1.detune); w.lp.disconnect(o2.detune); w.lc.disconnect(f1.detune); w.lc.disconnect(f2.detune); } catch (e) {} out.disconnect(); });
      } };
    }, DEMOS);
    demoPick(w, DEMOS, "chords");
    w.presets([
      { name: "Bass", set: { w1: "sawtooth", w2: "square", oct2: "-1", det: 0, mix: .4, noise: 0, ftype: "lowpass", cut: 180, res: 6, fenv: 3, fa: .002, fd: .18, fs: 0, fr: .1, aa: .002, ad: .3, as: .8, ar: .08, lfoRate: 5, lfoPitch: 0, lfoCut: 0, demo: "bass" } },
      { name: "Brass", set: { w1: "sawtooth", w2: "sawtooth", oct2: "0", det: 8, mix: .5, noise: 0, ftype: "lowpass", cut: 500, res: 1, fenv: 2.5, fa: .08, fd: .4, fs: .5, fr: .2, aa: .04, ad: .2, as: .85, ar: .2, lfoRate: 5, lfoPitch: 8, lfoCut: 0, demo: "lead" } },
      { name: "Pad", set: { w1: "sawtooth", w2: "sawtooth", oct2: "0", det: 14, mix: .5, noise: .05, ftype: "lowpass", cut: 900, res: 2, fenv: 1, fa: 1.5, fd: 2, fs: .6, fr: 1.5, aa: 1.2, ad: 1, as: .9, ar: 1.8, lfoRate: .3, lfoPitch: 0, lfoCut: 400, demo: "chords" } },
      { name: "Pluck", set: { w1: "pulse", w2: "sawtooth", oct2: "1", det: 5, mix: .3, pw: .25, noise: 0, ftype: "lowpass", cut: 300, res: 4, fenv: 4, fa: .002, fd: .25, fs: 0, fr: .2, aa: .002, ad: .5, as: 0, ar: .3, lfoRate: 5, lfoPitch: 0, lfoCut: 0, demo: "pluck" } },
      { name: "Lead", set: { w1: "square", w2: "sawtooth", oct2: "0", det: 6, mix: .5, noise: 0, ftype: "lowpass", cut: 1400, res: 5, fenv: 1, fa: .01, fd: .3, fs: .7, fr: .2, aa: .01, ad: .1, as: .9, ar: .2, lfoRate: 5.5, lfoPitch: 18, lfoCut: 0, demo: "lead" } },
      { name: "Strings", set: { w1: "sawtooth", w2: "sawtooth", oct2: "0", det: 10, mix: .5, noise: 0, ftype: "lowpass", cut: 2200, res: .7, fenv: 0, fa: .1, fd: .5, fs: 1, fr: .5, aa: .35, ad: .3, as: .9, ar: .7, lfoRate: 5, lfoPitch: 6, lfoCut: 0, demo: "chords" } },
      { name: "Wind (noise)", set: { w1: "sine", w2: "sine", oct2: "0", det: 0, mix: 0, noise: 1, ftype: "bandpass", cut: 800, res: 12, fenv: 0, fa: .3, fd: .5, fs: 1, fr: .5, aa: .4, ad: .3, as: 1, ar: 1, lfoRate: .2, lfoPitch: 0, lfoCut: 900, demo: "lead" } }
    ]);
    var go = group(w, "Oscillators");
    w.pick("w1", "Osc 1", WAVES, "sawtooth", go); w.pick("w2", "Osc 2", WAVES, "sawtooth", go);
    w.pick("oct2", "Osc 2 octave", [["-1", "−1"], ["0", "0"], ["1", "+1"]], "0", go);
    w.num("det", { label: "Osc 2 detune", min: -50, max: 50, step: 1, value: 7, fmt: fmtCt }, go);
    w.num("mix", { label: "Mix 1 ↔ 2", min: 0, max: 1, step: .01, value: .5, fmt: fmtPct }, go);
    w.num("pw", { label: "Pulse width", min: .05, max: .95, step: .01, value: .5, fmt: fmtPct }, go);
    w.num("noise", { label: "Noise", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct }, go);
    var gf = group(w, "Filter");
    w.pick("ftype", "Type", [["lowpass", "Low-pass"], ["highpass", "High-pass"], ["bandpass", "Band-pass"]], "lowpass", gf);
    w.num("cut", { label: "Cutoff", min: 40, max: 16000, log: true, value: 800, fmt: fmtHz }, gf);
    w.num("res", { label: "Resonance", min: .5, max: 25, log: true, value: 3, fmt: fmtN(1) }, gf);
    w.num("fenv", { label: "Envelope amount", min: -4, max: 6, step: .1, value: 2, fmt: function (v) { return (v > 0 ? "+" : "") + v.toFixed(1) + " oct"; } }, gf);
    envCtls(w, w.ctls, "f", "Filter envelope", .01, .4, .3, .3);
    envCtls(w, w.ctls, "a", "Amp envelope", .01, .3, .8, .3);
    var gl = group(w, "LFO");
    w.num("lfoRate", { label: "Rate", min: .05, max: 20, log: true, value: 5, fmt: fmtHz }, gl);
    w.num("lfoPitch", { label: "→ Pitch", min: 0, max: 100, step: 1, value: 0, fmt: fmtCt }, gl);
    w.num("lfoCut", { label: "→ Cutoff", min: 0, max: 2400, step: 10, value: 0, fmt: fmtCt }, gl);
    w.redraw = envPlot(w, [["f", "filter envelope"], ["a", "amp envelope"]]);
    w.view = viewer(w.body, { ms: 25 });
    w.setup = function (c) { var o = c.createOscillator(); o.frequency.value = w.P.lfoRate; w.lp = c.createGain(); w.lc = c.createGain(); w.lp.gain.value = w.P.lfoPitch; w.lc.gain.value = w.P.lfoCut; o.connect(w.lp); o.connect(w.lc); o.start(); w.lfo = o; };
    w.teardown = function () { var o = w.lfo; setTimeout(function () { o.stop(); }, 6000); };
    w.apply = function (k, v) {
      var t = ac().currentTime;
      if (k === "cut" || k === "res") w.voices(function (x) { if (k === "cut") x.f.forEach(function (f) { f.frequency.setTargetAtTime(v, t, .01); }); else x.f[0].Q.setTargetAtTime(v, t, .01); });
      if (k === "lfoRate") w.lfo.frequency.setTargetAtTime(v, t, .01);
      if (k === "lfoPitch") w.lp.gain.setTargetAtTime(v, t, .01);
      if (k === "lfoCut") w.lc.gain.setTargetAtTime(v, t, .01);
    };
    return w;
  }

  // ---------- FM ----------
  function Fm(host) {
    var lastF = 220;
    var w = Instrument(host, "FM synth", function (c, m, vel, t) {
      var P = w.P, f = mtof(m), fm = f * P.ratio; lastF = f; w.view.dirty = true;
      var car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), out = c.createGain();
      car.frequency.value = f; mod.frequency.value = fm; mod.detune.value = P.fine; out.gain.value = 0;
      mod.connect(mg); mg.connect(car.frequency); car.connect(out); out.connect(w.bus);
      adsrOn(mg.gain, t, P.ia, P.id, P.is, P.index * fm, P.index * fm * P.ifloor);
      adsrOn(out.gain, t, P.aa, P.ad, P.as, .4 * vel, 0);
      car.start(t); mod.start(t);
      return { car: car, mod: mod, mg: mg, f: f, release: function (t2) { var end = adsrOff(out.gain, t2, P.ar, 0); car.stop(end); mod.stop(end); } };
    }, DEMOS);
    demoPick(w, DEMOS, "bells");
    w.presets([
      { name: "Bell", set: { ratio: 3.5, fine: 0, index: 5, ifloor: 0, ia: .001, id: 2.5, is: 0, aa: .001, ad: 4, as: 0, ar: 2, demo: "bells" } },
      { name: "Electric piano", set: { ratio: 1, fine: 0, index: 2.2, ifloor: 0, ia: .001, id: .7, is: .1, aa: .001, ad: 1.8, as: .2, ar: .5, demo: "chords" } },
      { name: "Bass", set: { ratio: 1, fine: 0, index: 3.5, ifloor: 0, ia: .001, id: .25, is: .15, aa: .001, ad: .5, as: .7, ar: .1, demo: "bass" } },
      { name: "Brass", set: { ratio: 1, fine: 0, index: 4, ifloor: .2, ia: .08, id: .3, is: .6, aa: .05, ad: .3, as: .9, ar: .2, demo: "lead" } },
      { name: "Clarinet-ish", set: { ratio: 2, fine: 0, index: 1.5, ifloor: 0, ia: .05, id: .2, is: .8, aa: .05, ad: .2, as: .9, ar: .15, demo: "lead" } },
      { name: "Metal", set: { ratio: 1.414, fine: 0, index: 8, ifloor: .1, ia: .001, id: 1.5, is: .2, aa: .001, ad: 2, as: .3, ar: 1, demo: "bells" } },
      { name: "Steady (to study)", set: { ratio: 1, fine: 0, index: 2, ifloor: 1, ia: .001, id: .1, is: 1, aa: .01, ad: .1, as: 1, ar: .2, demo: "lead" } }
    ]);
    var go = group(w, "Modulator");
    w.num("ratio", { label: "Ratio (mod ÷ carrier)", min: .5, max: 12, step: .01, value: 3.5, fmt: fmtN(2) }, go);
    w.num("fine", { label: "Modulator fine tune", min: -100, max: 100, step: 1, value: 0, fmt: fmtCt }, go);
    w.num("index", { label: "Index (depth)", min: 0, max: 20, step: .1, value: 5, fmt: fmtN(1) }, go);
    w.num("ifloor", { label: "Index never falls below", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct }, go);
    envCtls(w, w.ctls, "i", "Index envelope (brightness)", .001, 2.5, 0, 2);
    envCtls(w, w.ctls, "a", "Amp envelope", .001, 4, 0, 2);
    w.redraw = envPlot(w, [["i", "index envelope"], ["a", "amp envelope"]]);
    w.view = viewer(w.body, { ms: 25, overlay: function (g, X, W, H, C) {
      var fm = lastF * w.P.ratio * Math.pow(2, w.P.fine / 1200); g.strokeStyle = C.hot; g.globalAlpha = .5; g.setLineDash([2, 3]);
      for (var k = -8; k <= 8; k++) { var f = Math.abs(lastF + k * fm); if (f < 20 || f > 20000) continue; var x = X(f); g.beginPath(); g.moveTo(x, k ? 24 : 14); g.lineTo(x, H); g.stroke(); }
      g.setLineDash([]); g.globalAlpha = 1; g.fillStyle = C.hot; g.fillText("dashed: carrier ± k × modulator", W - 170, 11);
    } });
    w.apply = function (k, v) {
      var t = ac().currentTime;
      if (k === "ratio" || k === "fine") w.voices(function (x) { x.mod.frequency.setTargetAtTime(x.f * w.P.ratio, t, .01); x.mod.detune.setTargetAtTime(w.P.fine, t, .01); });
      if ((k === "index" || k === "ratio") && w.P.is > .99) w.voices(function (x) { x.mg.gain.setTargetAtTime(w.P.index * x.f * w.P.ratio, t, .01); });
      w.view.dirty = true;
    };
    return w;
  }

  // ---------- wavetable ----------
  var WT_H = 48;
  function wtFrames() {
    var F = [], mk = function (fn) { var a = new Float32Array(WT_H + 1); for (var n = 1; n <= WT_H; n++) a[n] = fn(n); return a; };
    F.push(["Sine", mk(function (n) { return n === 1 ? 1 : 0; })]);
    F.push(["Triangle", mk(function (n) { return n % 2 ? (((n - 1) / 2) % 2 ? -1 : 1) / (n * n) : 0; })]);
    F.push(["Sawtooth", mk(function (n) { return 1 / n; })]);
    F.push(["Square", mk(function (n) { return n % 2 ? 1 / n : 0; })]);
    F.push(["Pulse 15%", mk(function (n) { return Math.sin(Math.PI * n * .15) / n; })]);
    F.push(["Vowel ‘ah’", mk(function (n) { return (1 / n) * (Math.exp(-Math.pow((n - 6) / 2, 2)) * 6 + Math.exp(-Math.pow((n - 11) / 2, 2)) * 4 + .2); })]);
    F.push(["Hollow", mk(function (n) { return n % 2 && n >= 3 ? 1 / Math.sqrt(n) : n === 1 ? .3 : 0; })]);
    F.push(["Glass", mk(function (n) { return [1, 4, 9, 16, 25, 36].indexOf(n) >= 0 ? 1 / Math.sqrt(n) : 0; })]);
    return F;
  }
  function Wavetable(host) {
    var frames = wtFrames(), last = -1;
    function at(pos) { var i = Math.min(frames.length - 2, Math.floor(pos)), fr = pos - i, a = frames[i][1], b = frames[i + 1][1], r = new Float32Array(WT_H + 1); for (var n = 1; n <= WT_H; n++) r[n] = a[n] * (1 - fr) + b[n] * fr; return r; }
    function pos() { var P = w.P, p = P.pos; if (w.running && w.t0 != null) p += P.scanDepth * (frames.length - 1) * .5 * Math.sin(2 * Math.PI * P.scanRate * (ac().currentTime - w.t0)); return Math.max(0, Math.min(frames.length - 1, p)); }
    function pw(c, p) { var im = at(p), re = new Float32Array(WT_H + 1); return c.createPeriodicWave(re, im); }
    var w = Instrument(host, "Wavetable synth", function (c, m, vel, t) {
      var P = w.P, o = c.createOscillator(), g = c.createGain(); o.frequency.value = mtof(m); o.setPeriodicWave(w.wave || pw(c, pos())); g.gain.value = 0; o.connect(g); g.connect(w.bus);
      adsrOn(g.gain, t, P.aa, P.ad, P.as, .3 * vel, 0); o.start(t);
      return { o: o, release: function (t2) { o.stop(adsrOff(g.gain, t2, P.ar, 0)); } };
    }, DEMOS);
    demoPick(w, DEMOS, "chords");
    w.num("pos", { label: "Position in the table", min: 0, max: frames.length - 1, step: .01, value: 2, fmt: function (v) { var i = Math.round(v); return frames[i][0] + (Math.abs(v - i) > .05 ? " ~" : ""); } });
    w.num("scanRate", { label: "Scan LFO rate", min: .02, max: 8, log: true, value: .25, fmt: fmtHz });
    w.num("scanDepth", { label: "Scan LFO depth", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct });
    envCtls(w, w.ctls, "a", "Amp envelope", .02, .4, .8, .6);
    var cv = el("canvas", "sk-plot sk-tall"); cv.setAttribute("aria-label", "The wavetable: every shape in a row, the current position marked, and the shape now playing drawn large"); w.body.appendChild(cv);
    function path(a, P) { var pts = [], pk = 0; for (var i = 0; i < P; i++) { var x = 0; for (var n = 1; n <= WT_H; n++) if (a[n]) x += a[n] * Math.sin(2 * Math.PI * n * i / P); pts.push(x); pk = Math.max(pk, Math.abs(x)); } return pts.map(function (v) { return pk ? v / pk : 0; }); }
    function line(g, pts, x0, y0, ww, hh) { g.beginPath(); pts.forEach(function (v, i) { var x = x0 + i / (pts.length - 1) * ww, y = y0 + hh / 2 - v * hh * .42; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    w.redraw = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, N = frames.length, p = pos(), tw = W / N, th = 64;
      if (!w.paths) w.paths = frames.map(function (f) { return path(f[1], 120); });
      g.font = "10px system-ui, sans-serif";
      for (var k = 0; k < N; k++) {
        var near = Math.max(0, 1 - Math.abs(p - k));   // how much of this shape is in the mix
        g.fillStyle = C.hot; g.globalAlpha = near * .15; g.fillRect(k * tw + 2, 0, tw - 4, th + 14); g.globalAlpha = 1;
        g.strokeStyle = near > 0 ? C.hot : C.ink2; g.lineWidth = near > 0 ? 1 + near : 1; line(g, w.paths[k], k * tw + 6, 2, tw - 12, th - 4);
        g.fillStyle = C.ink2; g.fillText(frames[k][0], k * tw + 6, th + 10);
      }
      var mx = 6 + p / (N - 1) * (W - 12 - tw) + tw / 2 - 6; g.fillStyle = C.hot; g.beginPath(); g.moveTo(mx, th + 16); g.lineTo(mx - 6, th + 24); g.lineTo(mx + 6, th + 24); g.fill();
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, th + 24 + (H - th - 30) / 2); g.lineTo(W, th + 24 + (H - th - 30) / 2); g.stroke();
      g.strokeStyle = C.hot; g.lineWidth = 2.2; line(g, path(at(p), 240), 6, th + 26, W - 12, H - th - 30); g.lineWidth = 1;
      g.fillStyle = C.ink2; g.fillText("now playing (one cycle)", 6, H - 4);
    });
    w.view = viewer(w.body, { ms: 25 });
    w.setup = function (c) { w.t0 = c.currentTime; last = -1; w.wave = pw(c, pos()); w.timer = setInterval(function () { var p = pos(); if (Math.abs(p - last) > .01) { last = p; w.wave = pw(c, p); w.voices(function (v) { v.o.setPeriodicWave(w.wave); }); } }, 30); };
    w.teardown = function () { clearInterval(w.timer); w.t0 = null; };
    return w;
  }

  // ---------- distortion ----------
  function Distortion(host) {
    var w = Fx(host, "Distortion", "tone", 1);
    // the three pedal families: what each clips with, and what it does to the sound before and after
    w.presets([
      { name: "Clean", set: { shape: "soft", drive: 1, low: 20, tone: 16000, level: .6 } },
      { name: "Overdrive", set: { shape: "soft", drive: 5, low: 700, tone: 5000, level: .7 } },
      { name: "Distortion", set: { shape: "hard", drive: 25, low: 150, tone: 3500, level: .5 } },
      { name: "Fuzz", set: { shape: "fuzz", drive: 60, low: 20, tone: 2500, level: .45 } }
    ]);
    w.pick("shape", "Curve", [["soft", "Soft clip (overdrive)"], ["hard", "Hard clip (distortion)"], ["fuzz", "Fuzz (lopsided, gated)"], ["asym", "Uneven (tube-like)"], ["fold", "Wavefolder"], ["crush", "Bit crusher"]], "soft");
    w.num("drive", { label: "Drive", min: 1, max: 60, log: true, value: 4, fmt: function (v) { return "×" + v.toFixed(1); } });
    w.num("low", { label: "Low cut (before)", min: 20, max: 1200, log: true, value: 20, fmt: fmtHz });
    w.num("tone", { label: "Tone (low-pass after)", min: 500, max: 16000, log: true, value: 8000, fmt: fmtHz });
    w.num("level", { label: "Output level", min: 0, max: 1.5, step: .01, value: .6, fmt: fmtPct });
    function fn(x) { var d = w.P.drive, s = w.P.shape;
      if (s === "soft") return Math.tanh(d * x);
      if (s === "hard") return Math.max(-.6, Math.min(.6, d * x)) / .6;
      // a fuzz's transistors clip one side much sooner than the other, and quiet signals fall into a dead zone (the sputter)
      if (s === "fuzz") { var u = d * x, gte = .02 * d; u = Math.abs(u) < gte ? 0 : u - (u > 0 ? gte : -gte); return u > 0 ? Math.min(1, u) : Math.max(-.45, u * .7); }
      if (s === "asym") return Math.tanh(d * x + .5) - Math.tanh(.5);
      if (s === "fold") return Math.sin(d * x * Math.PI / 2);
      var lv = Math.max(1, Math.round(64 / d)); return Math.round(x * lv) / lv; }
    function curve() { var n = 2049, a = new Float32Array(n); for (var i = 0; i < n; i++) a[i] = fn(i / (n - 1) * 2 - 1); return a; }
    var cv = el("canvas", "sk-plot sk-square"); cv.setAttribute("aria-label", "The distortion curve: input level across, output level up"); w.body.appendChild(cv);
    var dirty = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, S = Math.min(W, H) - 20, ox = 10, oy = 10;
      g.strokeStyle = C.line; g.strokeRect(ox, oy, S, S); g.beginPath(); g.moveTo(ox, oy + S / 2); g.lineTo(ox + S, oy + S / 2); g.moveTo(ox + S / 2, oy); g.lineTo(ox + S / 2, oy + S); g.stroke();
      g.setLineDash([3, 3]); g.beginPath(); g.moveTo(ox, oy + S); g.lineTo(ox + S, oy); g.stroke(); g.setLineDash([]);
      g.strokeStyle = C.hot; g.lineWidth = 2; g.beginPath(); for (var i = 0; i <= 200; i++) { var x = i / 200 * 2 - 1, y = Math.max(-1.2, Math.min(1.2, fn(x))); var px = ox + (x + 1) / 2 * S, py = oy + S / 2 - y * S / 2; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.lineWidth = 1;
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("in →", ox + S - 26, oy + S / 2 - 4); g.fillText("out ↑", ox + S / 2 + 4, oy + 10); g.fillText("dashed: no change", ox + 4, oy + S - 4);
    });
    w.redraw = function () { dirty(); };
    w.view = viewer(w.body, { ms: 15 });
    w.build = function (c) {
      var sh = c.createWaveShaper(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), lv = c.createGain(), inp = c.createGain(); sh.curve = curve(); sh.oversample = "4x"; lp.frequency.value = w.P.tone; lv.gain.value = w.P.level;
      hp.type = "highpass"; hp.frequency.value = w.P.low; hp.Q.value = .5;
      inp.connect(hp); hp.connect(sh); sh.connect(lp); lp.connect(lv); w.n = { sh: sh, hp: hp, lp: lp, lv: lv };
      return { input: inp, output: lv };
    };
    w.apply = function (k, v) { if (!w.n) return; var t = ac().currentTime; if (k === "shape" || k === "drive") w.n.sh.curve = curve(); if (k === "tone") w.n.lp.frequency.setTargetAtTime(v, t, .01); if (k === "low") w.n.hp.frequency.setTargetAtTime(v, t, .01); if (k === "level") w.n.lv.gain.setTargetAtTime(v, t, .01); };
    return w;
  }

  // ---------- compressor ----------
  function Compressor(host) {
    var w = Fx(host, "Compressor", "uneven", 1);
    w.num("thr", { label: "Threshold", min: -60, max: 0, step: .5, value: -24, fmt: fmtDb });
    w.num("ratio", { label: "Ratio", min: 1, max: 20, step: .1, value: 4, fmt: function (v) { return v.toFixed(1) + " : 1"; } });
    w.num("knee", { label: "Knee", min: 0, max: 30, step: .5, value: 6, fmt: fmtDb });
    w.num("att", { label: "Attack", min: .001, max: .5, log: true, value: .01, fmt: fmtS });
    w.num("rel", { label: "Release", min: .02, max: 1, log: true, value: .2, fmt: fmtS });
    w.num("makeup", { label: "Make-up gain", min: 0, max: 24, step: .5, value: 6, fmt: fmtDb });
    var cv = el("canvas", "sk-plot sk-square"); cv.setAttribute("aria-label", "Input level across, output level up; the bar is gain reduction"); w.body.appendChild(cv);
    var td = new Float32Array(1024), lvIn = -90, lvOut = -90, gr = 0;
    function db(an) { an.getFloatTimeDomainData(td); var s = 0; for (var i = 0; i < td.length; i++) s += td[i] * td[i]; return 10 * Math.log10(s / td.length + 1e-12) + 3; }
    function curveOut(x) { var T = w.P.thr, R = w.P.ratio, K = w.P.knee, y; if (2 * (x - T) < -K) y = x; else if (2 * Math.abs(x - T) <= K) y = x + (1 / R - 1) * Math.pow(x - T + K / 2, 2) / (2 * K || 1); else y = T + (x - T) / R; return y + w.P.makeup; }
    var dirty = anim(w, cv, function (C) {
      if (w.n) { lvIn = Math.max(db(w.n.ai), lvIn - 1.5); lvOut = Math.max(db(w.n.ao), lvOut - 1.5); gr = w.n.comp.reduction; } else { lvIn = lvOut = -90; gr = 0; }
      var s = fit(cv), g = s.g, W = s.w, H = s.h, S = Math.min(W - 50, H) - 20, ox = 10, oy = 10, P = function (d) { return (d + 60) / 60 * S; };
      g.strokeStyle = C.line; g.strokeRect(ox, oy, S, S); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(ox, oy + S); g.lineTo(ox + S, oy); g.stroke(); g.setLineDash([]);
      var tx = ox + P(w.P.thr); g.strokeStyle = C.ink2; g.globalAlpha = .4; g.beginPath(); g.moveTo(tx, oy); g.lineTo(tx, oy + S); g.stroke(); g.globalAlpha = 1;
      g.strokeStyle = C.acc2; g.lineWidth = 2; g.beginPath(); for (var i = 0; i <= 120; i++) { var x = -60 + i / 2, y = Math.min(6, curveOut(x)); var px = ox + P(x), py = oy + S - P(y); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.lineWidth = 1;
      if (lvIn > -60) { g.fillStyle = C.hot; g.beginPath(); g.arc(ox + P(Math.min(0, lvIn)), oy + S - P(Math.min(6, curveOut(Math.min(0, lvIn)))), 5, 0, 7); g.fill(); }
      var bx = ox + S + 16; g.strokeStyle = C.line; g.strokeRect(bx, oy, 14, S); g.fillStyle = C.hot; var gh = Math.min(S, -gr / 30 * S); g.fillRect(bx, oy, 14, gh);
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("GR", bx, oy + S + 10); g.fillText(gr.toFixed(1), bx - 2, oy + S - 2 < gh + oy + 10 ? oy + S - 2 : gh + oy + 10);
      g.fillText("in → (−60 to 0 dB)", ox + 4, oy + S - 4); g.fillText("threshold", tx + 3, oy + 10);
    });
    w.redraw = function () { dirty(); };
    w.view = viewer(w.body, { ms: 40 });
    w.build = function (c) {
      var inp = c.createGain(), comp = c.createDynamicsCompressor(), mk = c.createGain(), ai = c.createAnalyser(), ao = c.createAnalyser(); ai.fftSize = ao.fftSize = 1024;
      comp.threshold.value = w.P.thr; comp.ratio.value = w.P.ratio; comp.knee.value = w.P.knee; comp.attack.value = w.P.att; comp.release.value = w.P.rel; mk.gain.value = Math.pow(10, w.P.makeup / 20);
      inp.connect(comp); inp.connect(ai); comp.connect(mk); mk.connect(ao); w.n = { comp: comp, mk: mk, ai: ai, ao: ao };
      return { input: inp, output: mk };
    };
    w.apply = function (k, v) {
      if (!w.n) return; var cp = w.n.comp, t = ac().currentTime, p = { thr: cp.threshold, ratio: cp.ratio, knee: cp.knee, att: cp.attack, rel: cp.release }[k];
      if (p) p.setValueAtTime(v, t); else if (k === "makeup") w.n.mk.gain.setTargetAtTime(Math.pow(10, v / 20), t, .01);
    };
    return w;
  }

  // ---------- chorus / flanger ----------
  function Chorus(host) {
    var w = Fx(host, "Chorus and flanger", "chords", .5);
    w.presets([
      { name: "Chorus", set: { voices: 2, base: 18, depth: 4, rate: .8, fb: 0, mix: .5 } },
      { name: "Wide chorus", set: { voices: 3, base: 22, depth: 6, rate: .5, fb: 0, mix: .5 } },
      { name: "Flanger", set: { voices: 1, base: 2.5, depth: 2, rate: .25, fb: .7, mix: .5 } },
      { name: "Vibrato", set: { voices: 1, base: 5, depth: 3, rate: 5.5, fb: 0, mix: 1 } },
      { name: "Doubler", set: { voices: 1, base: 35, depth: 1, rate: .15, fb: 0, mix: .45 } }
    ]);
    w.num("voices", { label: "Voices", min: 1, max: 3, step: 1, value: 2, fmt: fmtN(0) });
    w.num("base", { label: "Delay", min: .5, max: 40, step: .1, value: 18, fmt: fmtMs });
    w.num("depth", { label: "Depth (delay swing)", min: 0, max: 10, step: .1, value: 4, fmt: function (v) { return "± " + v.toFixed(1) + " ms"; } });
    w.num("rate", { label: "Rate", min: .05, max: 8, log: true, value: .8, fmt: fmtHz });
    w.num("fb", { label: "Feedback", min: 0, max: .9, step: .01, value: 0, fmt: fmtPct });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "Each voice's delay time over four seconds"); w.body.appendChild(cv);
    function dms(i, t) { var P = w.P, d = Math.min(P.depth, P.base - .2), r = i === 2 ? P.rate * 1.13 : P.rate; return P.base + (i === 1 ? -1 : 1) * d * Math.sin(2 * Math.PI * r * t); }
    var dirty = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, now = w.running ? ac().currentTime - w.t0 : 0, top = 45, Y = function (ms) { return H - 4 - ms / top * (H - 18); };
      ["#1f8f84", "#d6336c", "#7a5cc4"].slice(0, w.P.voices).forEach(function (col, i) { g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); for (var k = 0; k <= 300; k++) { var t = now - 4 + k / 300 * 4, y = Y(dms(i, t)); k ? g.lineTo(k / 300 * W, y) : g.moveTo(0, y); } g.stroke(); });
      g.lineWidth = 1; g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("delay time of each voice, last 4 seconds (0 to 45 ms)", 4, 11);
    });
    w.redraw = function () { dirty(); };
    w.view = viewer(w.body, { ms: 20 });
    w.build = function (c) {
      w.t0 = c.currentTime; var inp = c.createGain(), out = c.createGain(), stops = [], lfos = [c.createOscillator(), c.createOscillator()];
      lfos[0].frequency.value = w.P.rate; lfos[1].frequency.value = w.P.rate * 1.13; lfos.forEach(function (o) { o.start(w.t0); stops.push(o); });
      var vs = [];
      for (var i = 0; i < w.P.voices; i++) {
        var d = c.createDelay(.1), g = c.createGain(), fb = c.createGain(), pan = c.createStereoPanner(), sw = Math.min(w.P.depth, w.P.base - .2) / 1000;
        d.delayTime.value = w.P.base / 1000; g.gain.value = (i === 1 ? -1 : 1) * sw; (i === 2 ? lfos[1] : lfos[0]).connect(g); g.connect(d.delayTime);
        fb.gain.value = w.P.fb; d.connect(fb); fb.connect(d); pan.pan.value = w.P.voices === 1 ? 0 : [-.7, .7, 0][i];
        inp.connect(d); d.connect(pan); pan.connect(out); vs.push({ d: d, g: g, fb: fb, i: i });
      }
      w.n = { lfos: lfos, vs: vs };
      out.gain.value = 1 / Math.sqrt(w.P.voices);
      return { input: inp, output: out, stop: function () { stops.forEach(function (o) { o.stop(); }); } };
    };
    w.apply = function (k, v) {
      if (!w.n) return; var t = ac().currentTime;
      if (k === "voices") { w.stop(); w.start(); return; }
      if (k === "rate") { w.n.lfos[0].frequency.setTargetAtTime(v, t, .02); w.n.lfos[1].frequency.setTargetAtTime(v * 1.13, t, .02); }
      w.n.vs.forEach(function (x) { var sw = Math.min(w.P.depth, w.P.base - .2) / 1000;
        if (k === "base") x.d.delayTime.setTargetAtTime(v / 1000, t, .02);
        if (k === "base" || k === "depth") x.g.gain.setTargetAtTime((x.i === 1 ? -1 : 1) * sw, t, .02);
        if (k === "fb") x.fb.gain.setTargetAtTime(v, t, .02); });
    };
    return w;
  }

  // ---------- phaser ----------
  function Phaser(host) {
    var w = Fx(host, "Phaser", "chords", .5);
    w.num("stages", { label: "Stages", min: 2, max: 12, step: 2, value: 4, fmt: fmtN(0) });
    w.num("base", { label: "Centre", min: 100, max: 4000, log: true, value: 700, fmt: fmtHz });
    w.num("depth", { label: "Sweep", min: 0, max: 3, step: .05, value: 1.5, fmt: function (v) { return "± " + v.toFixed(2) + " oct"; } });
    w.num("rate", { label: "Rate", min: .02, max: 6, log: true, value: .3, fmt: fmtHz });
    w.num("q", { label: "Width (Q)", min: .2, max: 4, step: .05, value: .7, fmt: fmtN(2) });
    w.num("fb", { label: "Feedback", min: 0, max: .85, step: .01, value: .3, fmt: fmtPct });
    function centre() { return w.P.base * Math.pow(2, w.P.depth * Math.sin(2 * Math.PI * w.P.rate * (w.running && w.t0 != null ? ac().currentTime - w.t0 : 0))); }
    w.view = viewer(w.body, { ms: 20, overlay: function (g, X, W, H, C) {
      var f0 = centre(), Q = w.P.q, st = w.P.stages, m = w.bypass ? 0 : w.P.mix; g.strokeStyle = C.hot; g.lineWidth = 2; g.beginPath();
      for (var px = 0; px <= W; px += 2) { var f = 20 * Math.pow(1000, px / W), r = f / f0, ph = -2 * Math.atan2(r / Q, 1 - r * r) * st;
        var re = (1 - m) + m * Math.cos(ph), im = m * Math.sin(ph), db = 20 * Math.log10(Math.sqrt(re * re + im * im) + 1e-6), y = Math.max(14, Math.min(H, H * (.35 - db / 60))); px ? g.lineTo(px, y) : g.moveTo(px, y); }
      g.stroke(); g.lineWidth = 1; g.fillStyle = C.hot; g.fillText("notches (no feedback shown)", W - 160, 11);
    } });
    w.redraw = function () { w.view.dirty = true; };
    anim(w, w.view.box, function () { w.view.dirty = true; });
    w.build = function (c) {
      w.t0 = c.currentTime; var inp = c.createGain(), sum = c.createGain(), out = c.createGain(), fb = c.createGain(), loopD = c.createDelay(.01);
      var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = w.P.rate; lg.gain.value = w.P.depth * 1200; lfo.connect(lg); lfo.start(w.t0);
      inp.connect(sum); var prev = sum, aps = [];
      for (var i = 0; i < w.P.stages; i++) { var ap = c.createBiquadFilter(); ap.type = "allpass"; ap.frequency.value = w.P.base; ap.Q.value = w.P.q; lg.connect(ap.detune); prev.connect(ap); prev = ap; aps.push(ap); }
      prev.connect(out); prev.connect(fb); fb.gain.value = w.P.fb; loopD.delayTime.value = 0; fb.connect(loopD); loopD.connect(sum);
      w.n = { aps: aps, lfo: lfo, lg: lg, fb: fb };
      return { input: inp, output: out, stop: function () { lfo.stop(); } };
    };
    w.apply = function (k, v) {
      if (!w.n) return; var t = ac().currentTime;
      if (k === "stages") { w.stop(); w.start(); return; }
      if (k === "base") w.n.aps.forEach(function (a) { a.frequency.setTargetAtTime(v, t, .01); });
      if (k === "q") w.n.aps.forEach(function (a) { a.Q.setTargetAtTime(v, t, .01); });
      if (k === "depth") w.n.lg.gain.setTargetAtTime(v * 1200, t, .01);
      if (k === "rate") { w.stop(); w.start(); }
      if (k === "fb") w.n.fb.gain.setTargetAtTime(v, t, .01);
    };
    return w;
  }

  // ---------- delay (echo) ----------
  // Two delay lines: alone, the first feeds itself; in ping-pong each feeds the other, one panned left, one right. The
  // feedback passes a low-pass (each echo duller, as on tape) and a soft clipper, so feedback past 100% grows into a
  // roar instead of blowing up.
  function Delay(host) {
    var w = Fx(host, "Delay", "hits", .4), BEAT = 60 / 112;   // the synth riff is at 112 bpm
    w.presets([
      { name: "Slapback", set: { time: 110, fb: 0, tone: 7000, wow: 0, pp: "0", mix: .4 } },
      { name: "Echo", set: { time: 360, fb: .35, tone: 6000, wow: 0, pp: "0", mix: .35 } },
      { name: "Dotted eighth", set: { time: BEAT * 750, fb: .4, tone: 5000, wow: 0, pp: "0", mix: .4 } },
      { name: "Ping-pong", set: { time: BEAT * 500, fb: .5, tone: 6000, wow: 0, pp: "1", mix: .45 } },
      { name: "Tape echo", set: { time: 330, fb: .55, tone: 2500, wow: .6, pp: "0", mix: .45 } },
      { name: "Dub", set: { time: BEAT * 1000, fb: .8, tone: 1400, wow: .3, pp: "1", mix: .5 } },
      { name: "Runaway", set: { time: 280, fb: 1.05, tone: 2200, wow: .5, pp: "0", mix: .5 } }
    ]);
    w.num("time", { label: "Delay time", min: 20, max: 1500, log: true, value: 360, fmt: function (v) { return Math.round(v) + " ms"; } });
    w.num("fb", { label: "Feedback (repeats)", min: 0, max: 1.1, step: .01, value: .35, fmt: fmtPct });
    w.num("tone", { label: "Tone of the repeats", min: 600, max: 16000, log: true, value: 6000, fmt: fmtHz });
    w.num("wow", { label: "Wow and flutter (tape)", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct });
    w.pick("pp", "Ping-pong (left, right)", [["0", "No"], ["1", "Yes"]], "0");
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "When each echo arrives and how loud it is"); w.body.appendChild(cv);
    var dirty = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, T = 3, P = w.P, X = function (sec) { return 6 + sec / T * (W - 12); };
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, H - 4); g.lineTo(W, H - 4); g.stroke();
      g.fillStyle = C.ink2; g.fillRect(X(0) - 1.5, 16, 3, H - 20);
      for (var n = 1, a = 1; n < 80; n++) { var t = n * P.time / 1000; if (t > T) break; a *= Math.min(P.fb, 1); if (a < .01) break;
        g.fillStyle = P.pp === "1" ? (n % 2 ? "#1f8f84" : "#d6336c") : C.acc2; g.fillRect(X(t) - 1.5, H - 4 - a * (H - 20), 3, a * (H - 20)); }
      g.font = "10px system-ui, sans-serif"; g.fillStyle = C.ink2;
      g.fillText("one hit and its echoes over 3 s" + (P.pp === "1" ? " (green left, pink right)" : "") + (P.fb >= 1 ? ": they never die away" : ""), 4, 11);
    });
    w.redraw = function () { dirty(); };
    w.view = viewer(w.body, { ms: 40 });
    function sat(c) { var sh = c.createWaveShaper(), n = 1025, a = new Float32Array(n); for (var i = 0; i < n; i++) a[i] = Math.tanh((i / (n - 1) * 2 - 1) * 1.5) / Math.tanh(1.5); sh.curve = a; return sh; }
    w.build = function (c) {
      var P = w.P, inp = c.createGain(), out = c.createGain(), lfo = c.createOscillator(), flut = c.createOscillator(), lg = c.createGain(), fg = c.createGain(), lines = [];
      lfo.frequency.value = .6; flut.frequency.value = 7; lfo.connect(lg); flut.connect(fg); lfo.start(); flut.start();
      for (var i = 0; i < (P.pp === "1" ? 2 : 1); i++) {
        var d = c.createDelay(2), lp = c.createBiquadFilter(), fb = c.createGain(), pan = c.createStereoPanner();
        d.delayTime.value = P.time / 1000; lp.frequency.value = P.tone; fb.gain.value = P.fb; pan.pan.value = P.pp === "1" ? (i ? .8 : -.8) : 0;
        lg.connect(d.delayTime); fg.connect(d.delayTime); d.connect(lp); lp.connect(pan); pan.connect(out); var s1 = sat(c); lp.connect(s1); s1.connect(fb);
        lines.push({ d: d, lp: lp, fb: fb });
      }
      inp.connect(lines[0].d);
      if (lines.length === 2) { lines[0].fb.connect(lines[1].d); lines[1].fb.connect(lines[0].d); } else lines[0].fb.connect(lines[0].d);
      w.n = { lines: lines, lg: lg, fg: fg }; wow(c.currentTime);
      return { input: inp, output: out, stop: function () { lfo.stop(); flut.stop(); } };
    };
    function wow(t) { w.n.lg.gain.setTargetAtTime(w.P.wow * .004, t, .05); w.n.fg.gain.setTargetAtTime(w.P.wow * .0004, t, .05); }
    w.apply = function (k, v) {
      if (!w.n) return; var t = ac().currentTime;
      if (k === "pp") { w.stop(); w.start(); return; }
      if (k === "wow") wow(t);
      w.n.lines.forEach(function (x) {
        if (k === "time") x.d.delayTime.setTargetAtTime(v / 1000, t, .08);   // a slow glide: the pitch bends as the tape speeds up
        if (k === "fb") x.fb.gain.setTargetAtTime(v, t, .02);
        if (k === "tone") x.lp.frequency.setTargetAtTime(v, t, .02);
      });
    };
    return w;
  }

  // ---------- glitch (stutter / beat repeat) ----------
  // A delay line as long as one slice. When a glitch fires, the input is cut and the feedback goes to 100%: the last slice
  // loops exactly, a machine-gun repeat. Shortening the delay while it loops makes the repeats rise in pitch.
  var SLICES = [["0.5", "1/8 note"], ["0.25", "1/16 note"], ["0.125", "1/32 note"], ["0.0625", "1/64 note"]];
  function Glitch(host) {
    var w = Fx(host, "Glitch (stutter)", "drums", 1), fired = [], want = false;
    w.presets([
      { name: "Gentle", set: { chance: .15, slice: "0.25", len: 1, drift: 0, crush: "0", rev: "0" } },
      { name: "Stutter", set: { chance: .35, slice: "0.125", len: 1, drift: 0, crush: "0", rev: "0" } },
      { name: "Riser", set: { chance: .3, slice: "0.25", len: 2, drift: 12, crush: "0", rev: "0" } },
      { name: "Tape stop", set: { chance: .25, slice: "0.5", len: 1, drift: -12, crush: "0", rev: "0" } },
      { name: "Broken", set: { chance: .6, slice: "0.0625", len: .5, drift: 7, crush: "1", rev: "1" } }
    ]);
    w.num("bpm", { label: "Tempo", min: 60, max: 160, step: 1, value: 100, fmt: function (v) { return Math.round(v) + " bpm"; } });
    w.num("chance", { label: "Chance on each half beat", min: 0, max: 1, step: .01, value: .35, fmt: fmtPct });
    w.pick("slice", "Slice", SLICES, "0.125");
    w.num("len", { label: "Repeat for", min: .5, max: 4, step: .5, value: 1, fmt: function (v) { return v + (v === 1 ? " beat" : " beats"); } });
    w.num("drift", { label: "Pitch drift", min: -24, max: 24, step: 1, value: 0, fmt: function (v) { return (v > 0 ? "+" : "") + Math.round(v) + " semitones"; } });
    w.pick("crush", "Crush the repeats", [["0", "No"], ["1", "Yes"]], "0");
    w.pick("rev", "Backwards slices too", [["0", "No"], ["1", "Yes"]], "0");
    var now = button(w.tools, "Glitch now", function () { if (!w.running) w.start(); want = true; }); w.tools.insertBefore(now, w.status);
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "The beats of the last four seconds; the blocks are the glitches"); w.body.appendChild(cv);
    var dirty = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, c = ac(), tn = w.running ? c.currentTime : 0, spb = 60 / w.P.bpm, X = function (t) { return (t - tn + 4) / 4 * W; };
      g.strokeStyle = C.line; for (var b = Math.ceil((tn - 4) / spb); b * spb < tn; b++) { var x = X(b * spb); g.beginPath(); g.moveTo(x, 16); g.lineTo(x, H); g.stroke(); }
      fired.forEach(function (f) { g.fillStyle = f.rev ? "#d6336c" : C.hot; g.globalAlpha = .55; g.fillRect(X(f.t), 18, Math.max(2, X(f.t + f.len) - X(f.t)), H - 20); g.globalAlpha = 1; });
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("last 4 s: lines are beats, blocks are glitches (pink: backwards)", 4, 11);
    });
    w.redraw = function () { dirty(); };
    w.view = viewer(w.body, { ms: 40 });
    function crushCurve(on) { var n = 1025, a = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; a[i] = on ? Math.round(x * 5) / 5 : x; } return a; }
    w.build = function (c) {
      var inp = c.createGain(), out = c.createGain(), dry = c.createGain(), rec = c.createGain(), dl = c.createDelay(4), fb = c.createGain(), lp = c.createGain(), cr = c.createWaveShaper();
      // backwards: a ScriptProcessor keeps the last two seconds, so a slice can be played in reverse
      var hist = c.sampleRate * 2, ring = new Float32Array(hist), wp = 0, sp = c.createScriptProcessor(1024, 1, 1), mute = c.createGain(); mute.gain.value = 0;
      sp.onaudioprocess = function (e) { var d = e.inputBuffer.getChannelData(0); for (var i = 0; i < d.length; i++) { ring[wp] = d[i]; wp = (wp + 1) % hist; } };
      inp.connect(sp); sp.connect(mute); mute.connect(out);
      fb.gain.value = 0; lp.gain.value = 0; cr.curve = crushCurve(w.P.crush === "1");
      inp.connect(dry); dry.connect(out); inp.connect(rec); rec.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(cr); cr.connect(lp); lp.connect(out);
      var spb = 60 / w.P.bpm, busy = 0;
      function at(p, v, t) { p.setTargetAtTime(v, t, .003); }
      function fire(t) {
        var slice = Math.max(.006, +w.P.slice * spb), len = w.P.len * spb, end = t + len, rev = w.P.rev === "1" && Math.random() < .5;
        fired.push({ t: t, len: len, rev: rev }); fired = fired.filter(function (f) { return f.t + f.len > c.currentTime - 5; }); busy = end;
        if (rev) {   // play the last half beat backwards, once, in place of the music
          var n = Math.floor(Math.min(len, spb / 2) * c.sampleRate), bf = c.createBuffer(1, n, c.sampleRate), d = bf.getChannelData(0);
          for (var i = 0; i < n; i++) d[i] = ring[((wp - 1 - i) % hist + hist) % hist];
          var bs = c.createBufferSource(), bg = c.createGain(); bs.buffer = bf; bs.connect(bg); bg.connect(out); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(1, t + .005); bg.gain.setValueAtTime(1, t + n / c.sampleRate - .01); bg.gain.linearRampToValueAtTime(0, t + n / c.sampleRate);
          bs.start(t); at(dry.gain, 0, t); at(dry.gain, 1, t + n / c.sampleRate); busy = t + n / c.sampleRate; fired[fired.length - 1].len = n / c.sampleRate; return;
        }
        dl.delayTime.cancelScheduledValues(t); dl.delayTime.setValueAtTime(slice, t);
        if (w.P.drift) dl.delayTime.linearRampToValueAtTime(Math.max(.004, slice * Math.pow(2, -w.P.drift / 12)), end);
        at(rec.gain, 0, t); at(fb.gain, 1, t); at(dry.gain, 0, t); at(lp.gain, 1, t);
        at(rec.gain, 1, end); at(fb.gain, 0, end); at(dry.gain, 1, end); at(lp.gain, 0, end);
      }
      var halt = loop(c, spb / 2, function (step, t) { if (t < busy) return; if (want || Math.random() < w.P.chance) { want = false; fire(t); } });
      w.n = { cr: cr };
      return { input: inp, output: out, stop: function () { halt(); sp.disconnect(); sp.onaudioprocess = null; } };
    };
    w.apply = function (k, v) { if (!w.n) return; if (k === "bpm") { w.stop(); w.start(); } if (k === "crush") w.n.cr.curve = crushCurve(v === "1"); };
    return w;
  }

  // ---------- envelope (ADSR on volume alone) ----------
  var ENV_DEMOS = { tune: DEMOS.lead, chords: DEMOS.chords, fast: DEMOS.pluck };
  function Envelope(host) {
    var w = Instrument(host, "Envelope (ADSR)", function (c, m, vel, t) {
      var P = w.P, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = P.wave; o.frequency.value = mtof(m); lp.frequency.value = 3500; g.gain.value = 0;
      o.connect(lp); lp.connect(g); g.connect(w.bus); adsrOn(g.gain, t, P.aa, P.ad, P.as, .4 * vel, 0); o.start(t);
      return { release: function (t2) { var end = adsrOff(g.gain, t2, P.ar, 0); o.stop(end); o.onended = function () { g.disconnect(); }; } };
    }, ENV_DEMOS);
    demoPick(w, ENV_DEMOS, "tune");
    w.presets([
      { name: "Organ", set: { aa: .004, ad: .05, as: 1, ar: .02 } },
      { name: "Piano", set: { aa: .002, ad: 1.6, as: 0, ar: .35 } },
      { name: "Pluck", set: { aa: .002, ad: .22, as: 0, ar: .1 } },
      { name: "Brass", set: { aa: .06, ad: .2, as: .7, ar: .15 } },
      { name: "Strings", set: { aa: .35, ad: .3, as: .9, ar: .7 } },
      { name: "Pad", set: { aa: 1.5, ad: 1, as: .8, ar: 2.5 } },
      { name: "Click", set: { aa: .001, ad: .01, as: 1, ar: .001 } }
    ]);
    w.pick("wave", "Wave", WAVES.filter(function (x) { return x[0] !== "pulse"; }), "sawtooth");
    envCtls(w, w.ctls, "a", "Amp envelope", .01, .3, .7, .3);
    w.redraw = envPlot(w, [["a", "amp envelope: key down … key up"]]);
    w.view = viewer(w.body, { ms: 25 });
    return w;
  }

  // ---------- granular ----------
  // A buffer of sound, read as hundreds of tiny overlapping grains: where each is read from, how long it is, how fast it
  // plays and where it sits in the stereo field are each a control.
  function renderBuf(kind) {
    var sr = ac().sampleRate, oc = new OfflineAudioContext(1, sr * 3, sr), out = oc.createGain(); out.connect(oc.destination);
    if (kind === "chords") { pad(oc, out, 0, CHORDS[0], 1.5); pad(oc, out, 1.5, CHORDS[1], 1.5); }
    else if (kind === "riff") for (var s = 0; s < 22; s++) pluck(oc, out, s * .134, mtof(RIFF[s % 16]), s % 4 ? .7 : 1, .3);
    else if (kind === "vowels") {
      var buzz = oc.createOscillator(), amp = oc.createGain(); buzz.type = "sawtooth"; buzz.frequency.value = 140; amp.connect(out); amp.gain.value = .9;
      var fs = [0, 1, 2].map(function (i) { var f = oc.createBiquadFilter(), g = oc.createGain(); f.type = "bandpass"; f.Q.value = 8 + i * 3; g.gain.value = [1.4, .9, .5][i] * 2.2; buzz.connect(f); f.connect(g); g.connect(amp); return f; });
      VOWELS.forEach(function (v, j) { fs.forEach(function (f, i) { f.frequency.setTargetAtTime(v[i], j * .5, .04); }); buzz.frequency.setTargetAtTime([140, 165, 125, 185, 150, 110][j], j * .5, .05); });
      buzz.start(0); buzz.stop(3);
    } else { var o = oc.createOscillator(), g2 = oc.createGain(); o.frequency.value = 220; o.type = "triangle"; g2.gain.value = .5; o.connect(g2); g2.connect(out); o.frequency.setValueAtTime(220, 0); o.frequency.exponentialRampToValueAtTime(880, 3); o.start(0); o.stop(3); }
    return oc.startRendering();
  }
  function Granular(host) {
    var w = Base(host, "Granular"), buf = null, rbuf = null, pos = .3, keyR = 1, marks = [], loaded = null;
    w.pick("src", "Sound to cut up", [["chords", "Chords"], ["vowels", "Vowels"], ["riff", "Synth riff"], ["glide", "A rising tone"], ["mic", "Record the mic (3 s)"]], "chords", w.tools, function () { load(); });
    w.tools.insertBefore(w.c.src.el, w.playBtn);
    w.status = el("span", "sk-status"); w.tools.appendChild(w.status);
    w.presets([
      { name: "Cloud", set: { size: 120, dens: 30, spray: .25, scan: 0, pitch: 0, prand: 0, rev: 0, spread: .8 } },
      { name: "Freeze", set: { size: 180, dens: 25, spray: .02, scan: 0, pitch: 0, prand: 0, rev: 0, spread: .5 } },
      { name: "Stretch (slow motion)", set: { size: 90, dens: 40, spray: .01, scan: .2, pitch: 0, prand: 0, rev: 0, spread: .2 } },
      { name: "Shimmer", set: { size: 200, dens: 30, spray: .15, scan: 0, pitch: 12, prand: 0, rev: 0, spread: 1 } },
      { name: "Scatter", set: { size: 25, dens: 12, spray: 1, scan: 0, pitch: 0, prand: 7, rev: .5, spread: 1 } }
    ]);
    w.num("pos", { label: "Position", min: 0, max: 1, step: .001, value: .3, fmt: fmtPct, on: function (v) { pos = v; } });
    w.num("scan", { label: "Scan speed", min: -1, max: 2, step: .05, value: 0, fmt: function (v) { return v ? "×" + v.toFixed(2) : "frozen"; } });
    w.num("size", { label: "Grain size", min: 5, max: 500, log: true, value: 120, fmt: function (v) { return Math.round(v) + " ms"; } });
    w.num("dens", { label: "Grains per second", min: 2, max: 120, log: true, value: 30, fmt: fmtN(0) });
    w.num("spray", { label: "Spray (random position)", min: 0, max: 1, step: .01, value: .25, fmt: fmtPct });
    w.num("pitch", { label: "Pitch", min: -24, max: 24, step: 1, value: 0, fmt: function (v) { return (v > 0 ? "+" : "") + v + " semitones"; } });
    w.num("prand", { label: "Random pitch", min: 0, max: 12, step: .1, value: 0, fmt: function (v) { return "± " + v.toFixed(1) + " st"; } });
    w.num("rev", { label: "Backwards grains", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct });
    w.num("spread", { label: "Stereo spread", min: 0, max: 1, step: .01, value: .8, fmt: fmtPct });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "The recorded sound; the marks are the grains being read from it"); w.body.appendChild(cv);
    var peaks = null;
    function load() {
      buf = null; peaks = null; var k = w.c.src.value, c = ac(); loaded = k;
      var done = function (b) { buf = b; rbuf = c.createBuffer(1, b.length, b.sampleRate); rbuf.getChannelData(0).set(b.getChannelData(0).slice().reverse()); peaks = null; w.status.textContent = ""; };
      if (k !== "mic") { renderBuf(k).then(done); return; }
      w.status.textContent = "Opening the microphone… use headphones.";
      SK.mic().then(function (node) { var r = recorder(c, 3); node.connect(r.input); w.status.textContent = "Recording 3 seconds: sing, speak, clap…";
        setTimeout(function () { var b = r.take(3); try { node.disconnect(r.input); } catch (e) {} r.stop(); done(b); w.status.textContent = "Got it. Press ▶."; }, 3100); },
        function (e) { w.status.textContent = "Microphone not available: " + (e.message || e.name); });
    }
    w.usesMic = function () { return false; };
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, now = ac().currentTime;
      if (!buf) { g.fillStyle = C.ink2; g.font = "11px system-ui, sans-serif"; g.fillText(loaded ? "Making the sound…" : "Press ▶ to make the sound and cut it into grains.", 6, H / 2); return; }
      if (!peaks || peaks.length !== Math.round(W)) { var d = buf.getChannelData(0); peaks = new Float32Array(Math.round(W)); for (var x = 0; x < peaks.length; x++) { var a = Math.floor(x / peaks.length * d.length), b = Math.floor((x + 1) / peaks.length * d.length), m = 0; for (var j = a; j < b; j++) m = Math.max(m, Math.abs(d[j])); peaks[x] = m; } var pk = Math.max.apply(null, peaks) || 1; for (x = 0; x < peaks.length; x++) peaks[x] /= pk; }
      g.strokeStyle = C.acc2; g.beginPath(); for (var x2 = 0; x2 < peaks.length; x2++) { g.moveTo(x2, H / 2 - peaks[x2] * (H / 2 - 8)); g.lineTo(x2, H / 2 + peaks[x2] * (H / 2 - 8)); } g.stroke();
      marks = marks.filter(function (m) { return m.t > now - .4; });
      marks.forEach(function (m) { g.fillStyle = m.r ? "#d6336c" : C.hot; g.globalAlpha = Math.max(0, 1 - (now - m.t) / .4) * .6; g.fillRect(m.x * W, 8, Math.max(2, m.w * W), H - 16); }); g.globalAlpha = 1;
      g.fillStyle = C.ink; g.fillRect(pos * W - 1, 0, 2, H);
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("the sound (3 s); the line is the position, the flashes are grains", 4, 11);
    });
    w.view = viewer(w.body, { ms: 40 });
    w.onStart = function (c, out) {
      if (!loaded) load();
      var next = c.currentTime + .05, last = c.currentTime, bus = c.createGain(); bus.gain.value = .8; bus.connect(out);
      var id = setInterval(function () {
        var now = c.currentTime, P = w.P; if (P.scan) { pos += P.scan * (now - last) / 3; pos -= Math.floor(pos); w.c.pos.input.value = pos; } last = now;
        if (!buf) return;
        while (next < now + .1) {
          var dur = P.size / 1000, r = Math.pow(2, (P.pitch + (Math.random() * 2 - 1) * P.prand) / 12) * keyR, back = Math.random() < P.rev;
          var at = Math.max(0, Math.min(1, pos + (Math.random() * 2 - 1) * P.spray * .5)), off = at * buf.duration;
          grain(c, back ? rbuf : buf, bus, next, back ? buf.duration - off - dur * r : off, dur, r, (Math.random() * 2 - 1) * P.spread, Math.min(.6, 2.5 / Math.sqrt(P.dens * dur + 1)));
          marks.push({ t: next, x: at, w: dur * r / buf.duration, r: back });
          next += (1 / P.dens) * (.7 + Math.random() * .6);
        }
      }, 20);
      return function () { clearInterval(id); };
    };
    monoKeys(w, function (f, m) { keyR = Math.pow(2, (m - 60) / 12); });
    var stopK = w.stop; w.stop = function () { keyR = 1; stopK(); };
    return w;
  }

  // ---------- EQ ----------
  var EQB = [["hp", "highpass"], ["ls", "lowshelf"], ["p1", "peaking"], ["p2", "peaking"], ["hs", "highshelf"], ["lp", "lowpass"]];
  function Eq(host) {
    var w = Fx(host, "Equaliser", "chords", 1), N = 240, fr = new Float32Array(N), mag = new Float32Array(N), ph = new Float32Array(N), probes = null, hidden = null, shown = false;
    for (var i = 0; i < N; i++) fr[i] = 20 * Math.pow(1000, i / (N - 1));
    w.presets([
      { name: "Flat", set: { hpF: 20, lsG: 0, p1G: 0, p2G: 0, hsG: 0, lpF: 20000, p1Q: 1, p2Q: 1 } },
      { name: "Cut the mud", set: { hpF: 80, lsG: 0, p1F: 300, p1G: -6, p1Q: 1.2, p2G: 0, hsG: 0, lpF: 20000 } },
      { name: "Presence", set: { hpF: 60, lsG: 0, p1G: 0, p2F: 3000, p2G: 5, p2Q: 1, hsG: 0, lpF: 20000 } },
      { name: "Air", set: { hpF: 20, lsG: 0, p1G: 0, p2G: 0, hsF: 10000, hsG: 6, lpF: 20000 } },
      { name: "Scooped", set: { hpF: 20, lsF: 120, lsG: 5, p1F: 700, p1G: -8, p1Q: .8, p2G: 0, hsF: 6000, hsG: 5, lpF: 20000 } },
      { name: "Telephone", set: { hpF: 400, lsG: 0, p1F: 1500, p1G: 6, p1Q: 1, p2G: 0, hsG: 0, lpF: 3200 } },
      { name: "Search (narrow boost)", set: { p2F: 1000, p2G: 12, p2Q: 8 } }
    ]);
    var gc = group(w, "Low end");
    w.num("hpF", { label: "High-pass (low cut)", min: 20, max: 1000, log: true, value: 20, fmt: fmtHz }, gc);
    w.num("lsF", { label: "Low shelf frequency", min: 40, max: 500, log: true, value: 120, fmt: fmtHz }, gc);
    w.num("lsG", { label: "Low shelf gain", min: -15, max: 15, step: .5, value: 0, fmt: fmtDb }, gc);
    var gm = group(w, "Middle: two bells");
    w.num("p1F", { label: "Bell 1 frequency", min: 60, max: 8000, log: true, value: 400, fmt: fmtHz }, gm);
    w.num("p1G", { label: "Bell 1 gain", min: -15, max: 15, step: .5, value: 0, fmt: fmtDb }, gm);
    w.num("p1Q", { label: "Bell 1 width (Q)", min: .3, max: 12, log: true, value: 1, fmt: fmtN(1) }, gm);
    w.num("p2F", { label: "Bell 2 frequency", min: 200, max: 12000, log: true, value: 2500, fmt: fmtHz }, gm);
    w.num("p2G", { label: "Bell 2 gain", min: -15, max: 15, step: .5, value: 0, fmt: fmtDb }, gm);
    w.num("p2Q", { label: "Bell 2 width (Q)", min: .3, max: 12, log: true, value: 1, fmt: fmtN(1) }, gm);
    var gh = group(w, "Top end");
    w.num("hsF", { label: "High shelf frequency", min: 2000, max: 16000, log: true, value: 8000, fmt: fmtHz }, gh);
    w.num("hsG", { label: "High shelf gain", min: -15, max: 15, step: .5, value: 0, fmt: fmtDb }, gh);
    w.num("lpF", { label: "Low-pass (high cut)", min: 1000, max: 20000, log: true, value: 20000, fmt: fmtHz }, gh);
    w.pick("problem", "Hidden problem", [["none", "None"], ["ring", "A ringing frequency"], ["boom", "Boomy"], ["harsh", "Harsh"]], "none", null, function (v) { shown = false; hidden = v === "none" ? null : { type: "peaking", f: v === "ring" ? 300 * Math.pow(12, Math.random()) : v === "boom" ? 160 + Math.random() * 80 : 2500 + Math.random() * 1500, q: v === "ring" ? 10 : 1.4, g: v === "ring" ? 16 : 9 }; if (w.running) { w.stop(); w.start(); } });
    var rev = button(w.tools, "Reveal", function () { shown = true; w.status.textContent = hidden ? "The problem was at " + fmtHz(hidden.f) + "." : "No problem is hidden."; w.view.dirty = true; });
    w.tools.insertBefore(rev, w.status);
    function setF(f, k) { var P = w.P; if (k === "hp") { f.frequency.value = P.hpF; f.Q.value = .7071; } else if (k === "lp") { f.frequency.value = P.lpF; f.Q.value = .7071; } else { f.frequency.value = P[k + "F"]; f.gain.value = P[k + "G"]; if (P[k + "Q"]) f.Q.value = P[k + "Q"]; } }
    w.view = viewer(w.body, { ms: 20, overlay: function (g, X, W, H, C) {
      var c = ac(); if (!probes) probes = EQB.map(function (b) { var f = c.createBiquadFilter(); f.type = b[1]; return f; });
      var tot = new Float32Array(N); probes.forEach(function (f, j) { setF(f, EQB[j][0]); f.getFrequencyResponse(fr, mag, ph); for (var i = 0; i < N; i++) tot[i] += 20 * Math.log10(mag[i] + 1e-9); });
      var Y = function (db) { return Math.max(14, Math.min(H, H * (.5 - db / 48))); };
      g.strokeStyle = C.hot; g.globalAlpha = .3; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      g.strokeStyle = C.hot; g.lineWidth = 2; g.beginPath(); for (var i = 0; i < N; i++) i ? g.lineTo(X(fr[i]), Y(tot[i])) : g.moveTo(X(fr[i]), Y(tot[i])); g.stroke(); g.lineWidth = 1;
      if (shown && hidden) { g.fillStyle = "#d9822b"; g.fillRect(X(hidden.f) - 1, 14, 2, H - 14); g.fillText("the problem", X(hidden.f) + 3, 24); }
      g.fillStyle = C.hot; g.fillText("EQ curve (±24 dB, 0 in the middle)", W - 190, 11);
    } });
    w.redraw = function () { w.view.dirty = true; };
    w.build = function (c) {
      var inp = c.createGain(), prev = inp, fs = {};
      if (hidden) { var h = c.createBiquadFilter(); h.type = "peaking"; h.frequency.value = hidden.f; h.Q.value = hidden.q; h.gain.value = hidden.g; inp.connect(h); prev = h; }
      EQB.forEach(function (b) { var f = c.createBiquadFilter(); f.type = b[1]; setF(f, b[0]); prev.connect(f); prev = f; fs[b[0]] = f; });
      w.n = fs; return { input: inp, output: prev };
    };
    w.apply = function (k, v) { if (!w.n || !/^(hp|lp|ls|hs|p1|p2)/.test(k)) return; var b = k.slice(0, 2), f = w.n[b], t = ac().currentTime, x = k.slice(2);
      if (x === "F") f.frequency.setTargetAtTime(v, t, .01); else if (x === "G") f.gain.setTargetAtTime(v, t, .01); else if (x === "Q") f.Q.setTargetAtTime(v, t, .01); };
    return w;
  }
  // a strip of values over the last few seconds, pushed once per audio block
  function history(n) { var h = { a: [], push: function (x) { h.a.push(x); if (h.a.length > n) h.a.shift(); } }; return h; }

  // ---------- sidechain ----------
  // The music's volume is set by another sound (the key): when the kick (or a voice) is loud, the music is turned down.
  function Sidechain(host) {
    var w = Fx(host, "Sidechain ducking", "chords", 1), hist = history(160);
    w.presets([
      { name: "Off", set: { depth: 0 } },
      { name: "Glue", set: { key: "kick", depth: .3, att: .005, rel: .12 } },
      { name: "Pumping", set: { key: "kick", depth: .85, att: .003, rel: .3 } },
      { name: "Huge pump", set: { key: "kick", depth: 1, att: .001, rel: .42 } },
      { name: "Radio voice-over", set: { key: "voice", depth: .7, att: .02, rel: .5 } }
    ]);
    w.pick("key", "Ducked by (the key)", [["kick", "A kick drum, four to the floor"], ["voice", "A voice talking"]], "kick", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.pick("hear", "Hear the key", [["1", "Yes"], ["0", "No"]], "1");
    w.num("bpm", { label: "Tempo", min: 80, max: 160, step: 1, value: 124, fmt: function (v) { return Math.round(v) + " bpm"; } });
    w.num("depth", { label: "Depth (how far down)", min: 0, max: 1, step: .01, value: .85, fmt: fmtPct });
    w.num("att", { label: "Attack", min: .001, max: .1, log: true, value: .003, fmt: fmtS });
    w.num("rel", { label: "Release", min: .02, max: 1, log: true, value: .3, fmt: fmtS });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "The music's volume over the last three seconds"); w.body.appendChild(cv);
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, a = hist.a; g.strokeStyle = C.acc2; g.lineWidth = 2; g.beginPath();
      a.forEach(function (v, i) { var x = i / 159 * W, y = 16 + (1 - v) * (H - 22); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.lineWidth = 1;
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("the music's volume, last 3 s (top: full, bottom: silent)", 4, 11);
    });
    w.view = viewer(w.body, { ms: 40 });
    w.build = function (c) {
      var out = c.createGain(), keyBus = c.createGain(), hear = c.createGain(), env = 0, gn = 1, sr = c.sampleRate, stop;
      hear.gain.value = +w.P.hear; keyBus.connect(hear); hear.connect(out);
      var d = dynProc(c, function (L, R, K, oL, oR) {
        var a = coef(w.P.att, sr), r = coef(w.P.rel, sr), lo = 1;
        for (var i = 0; i < L.length; i++) { var x = Math.abs(K[i]); env = x > env ? a * env + (1 - a) * x : r * env + (1 - r) * x;
          gn = 1 - w.P.depth * Math.min(1, env * (w.P.key === "kick" ? 2.2 : 4)); oL[i] = L[i] * gn; oR[i] = R[i] * gn; if (gn < lo) lo = gn; }
        hist.push(lo);
      });
      keyBus.connect(d.key); d.output.connect(out);
      if (w.P.key === "kick") stop = loop(c, 60 / w.P.bpm, function (s, t) { kick(c, keyBus, t, 1); if (s % 2) hat(c, keyBus, t + 30 / w.P.bpm, .3); });
      else stop = robot(c, keyBus);
      w.n = { hear: hear };
      return { input: d.input, output: out, stop: function () { stop(); d.stop(); } };
    };
    w.apply = function (k, v) { if (!w.n) return; if (k === "hear") w.n.hear.gain.setTargetAtTime(+v, ac().currentTime, .02); if (k === "bpm" && w.P.key === "kick") { w.stop(); w.start(); } };
    return w;
  }

  // ---------- noise gate ----------
  function Gate(host) {
    var w = Fx(host, "Noise gate", "hits", 1), hist = history(150);
    w.presets([
      { name: "Clean up hiss", set: { noise: .5, verb: "0", thr: -30, att: .002, hold: .05, rel: .15, range: -80 } },
      { name: "Gentle (−12 dB)", set: { noise: .5, verb: "0", thr: -30, att: .002, hold: .05, rel: .3, range: -12 } },
      { name: "80s gated snare", set: { noise: 0, verb: "1", thr: -22, att: .001, hold: .18, rel: .03, range: -80 } },
      { name: "Choppy", set: { noise: .3, verb: "1", thr: -12, att: .001, hold: 0, rel: .01, range: -80 } }
    ]);
    w.num("noise", { label: "Background hiss and hum", min: 0, max: 1, step: .01, value: .5, fmt: fmtPct });
    w.pick("verb", "A big reverb before the gate", [["0", "No"], ["1", "Yes"]], "0", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.num("thr", { label: "Threshold", min: -70, max: 0, step: .5, value: -30, fmt: fmtDb });
    w.num("att", { label: "Attack (opening)", min: .0005, max: .1, log: true, value: .002, fmt: fmtS });
    w.num("hold", { label: "Hold", min: 0, max: .5, step: .005, value: .05, fmt: fmtS });
    w.num("rel", { label: "Release (closing)", min: .005, max: 1, log: true, value: .15, fmt: fmtS });
    w.num("range", { label: "Range (how far it shuts)", min: -80, max: 0, step: 1, value: -80, fmt: fmtDb });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "Level of the key against the threshold; shaded where the gate is open"); w.body.appendChild(cv);
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, a = hist.a, Y = function (db) { return 14 + (-Math.max(-80, db)) / 80 * (H - 18); };
      a.forEach(function (v, i) { if (v[1] > .5) { g.fillStyle = C.acc; g.globalAlpha = .25 * v[1]; g.fillRect(i / 149 * W, 14, W / 149 + 1, H - 14); } }); g.globalAlpha = 1;
      g.strokeStyle = C.acc2; g.beginPath(); a.forEach(function (v, i) { var x = i / 149 * W; i ? g.lineTo(x, Y(v[0])) : g.moveTo(x, Y(v[0])); }); g.stroke();
      g.strokeStyle = C.hot; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(0, Y(w.P.thr)); g.lineTo(W, Y(w.P.thr)); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("level, last 3 s (0 to −80 dB); dashed: threshold; shaded: gate open", 4, 11);
    });
    w.view = viewer(w.body, { ms: 40 });
    w.build = function (c) {
      var inp = c.createGain(), sig = c.createGain(), env = 0, gn = 0, held = 0, sr = c.sampleRate, stops = [];
      var hiss = noiseSrc("pink"), hg = c.createGain(), hum = c.createOscillator(), hl = c.createBiquadFilter(), hm = c.createGain(); hum.type = "sawtooth"; hum.frequency.value = 50; hl.frequency.value = 400;
      hiss.connect(hg); hum.connect(hl); hl.connect(hm); hm.connect(hg); hm.gain.value = .5; hiss.start(); hum.start(); stops.push(function () { hiss.stop(); hum.stop(); });
      hg.gain.value = w.P.noise * .06;
      var d = dynProc(c, function (L, R, K, oL, oR) {
        var a = coef(.0005, sr), r = coef(.03, sr), ga = coef(w.P.att / 3, sr), gr = coef(w.P.rel / 3, sr), floor = Math.pow(10, w.P.range / 20), thr = Math.pow(10, w.P.thr / 20), hs = w.P.hold * sr, pk = 0, open = 0;
        for (var i = 0; i < L.length; i++) { var x = Math.abs(K[i]); env = x > env ? a * env + (1 - a) * x : r * env + (1 - r) * x;
          if (env > thr) held = hs; else if (held > 0) held--;
          var tgt = env > thr || held > 0 ? 1 : floor; gn = tgt > gn ? ga * gn + (1 - ga) * tgt : gr * gn + (1 - gr) * tgt;
          oL[i] = L[i] * gn; oR[i] = R[i] * gn; if (env > pk) pk = env; if (gn > open) open = gn; }
        hist.push([todb(pk), open]);
      });
      inp.connect(sig); hg.connect(sig); sig.connect(d.key);
      if (w.P.verb === "1") { var cv2 = c.createConvolver(), wet = c.createGain(); cv2.buffer = irNoise(c, 2.5, 5000); wet.gain.value = 1.4; sig.connect(cv2); cv2.connect(wet); wet.connect(d.input); }
      sig.connect(d.input);
      w.n = { hg: hg };
      return { input: inp, output: d.output, stop: function () { stops.forEach(function (f) { f(); }); d.stop(); } };
    };
    w.apply = function (k, v) { if (w.n && k === "noise") w.n.hg.gain.setTargetAtTime(v * .06, ac().currentTime, .02); };
    return w;
  }

  // ---------- transient shaper ----------
  // Two envelope followers, one quick and one slow. Where the quick one is ahead, a hit is starting (the attack); where
  // it has fallen behind, the sound is ringing on (the sustain). Each gets its own amount of boost or cut.
  function Transient(host) {
    var w = Fx(host, "Transient shaper", "drums", 1), hist = history(150);
    w.presets([
      { name: "Neutral", set: { atk: 0, sus: 0 } },
      { name: "Punchy", set: { atk: .8, sus: -.3 } },
      { name: "Tight (dry room)", set: { atk: .2, sus: -1 } },
      { name: "Soft (far away)", set: { atk: -.8, sus: .4 } },
      { name: "Roomy", set: { atk: 0, sus: 1 } }
    ]);
    w.num("atk", { label: "Attack", min: -1, max: 1, step: .01, value: .8, fmt: function (v) { return (v > 0 ? "+" : "") + Math.round(v * 100) + "%"; } });
    w.num("sus", { label: "Sustain", min: -1, max: 1, step: .01, value: -.3, fmt: function (v) { return (v > 0 ? "+" : "") + Math.round(v * 100) + "%"; } });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "Gain applied over the last three seconds: up for boost, down for cut"); w.body.appendChild(cv);
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, a = hist.a, Y = function (db) { return H / 2 + 7 - Math.max(-18, Math.min(18, db)) / 18 * (H / 2 - 9); };
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke();
      [["#1f8f84", 0], ["#d6336c", 1]].forEach(function (p) { g.strokeStyle = p[0]; g.beginPath(); a.forEach(function (v, i) { var x = i / 149 * W; i ? g.lineTo(x, Y(v[p[1]])) : g.moveTo(x, Y(v[p[1]])); }); g.stroke(); });
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("gain, last 3 s (±18 dB): green the most boost, pink the most cut in each moment", 4, 11);
    });
    w.view = viewer(w.body, { ms: 40 });
    w.build = function (c) {
      var sr = c.sampleRate, f = 0, sl = 0, gs = 1, fa = coef(.0005, sr), fr = coef(.02, sr), sa = coef(.03, sr), sR = coef(.3, sr), sm = coef(.002, sr);
      var d = dynProc(c, function (L, R, K, oL, oR) {
        var A = w.P.atk * 2.2, S = w.P.sus * 2.2, hi = -99, lo = 99;
        for (var i = 0; i < L.length; i++) { var x = Math.abs(K[i]);
          f = x > f ? fa * f + (1 - fa) * x : fr * f + (1 - fr) * x; sl = x > sl ? sa * sl + (1 - sa) * x : sR * sl + (1 - sR) * x;
          var r = (f + 1e-4) / (sl + 1e-4), gn = r > 1 ? Math.pow(r, A) : Math.pow(1 / r, S); gn = Math.max(.06, Math.min(6, gn)); gs = sm * gs + (1 - sm) * gn;
          oL[i] = L[i] * gs; oR[i] = R[i] * gs; var db = todb(gs); if (db > hi) hi = db; if (db < lo) lo = db; }
        hist.push([hi, lo]);
      });
      var inp = c.createGain(), out = c.createGain(); out.gain.value = .7; inp.connect(d.input); inp.connect(d.key); d.output.connect(out);
      return { input: inp, output: out, stop: d.stop };
    };
    return w;
  }

  // ---------- tremolo and auto-pan ----------
  function Tremolo(host) {
    var w = Fx(host, "Tremolo and auto-pan", "chords", 1);
    w.presets([
      { name: "Surf tremolo", set: { what: "amp", shape: "triangle", rate: 6, depth: .6 } },
      { name: "Slow throb", set: { what: "amp", shape: "sine", rate: 2.5, depth: .8 } },
      { name: "Chopper", set: { what: "amp", shape: "square", rate: 8, depth: 1 } },
      { name: "Auto-pan", set: { what: "pan", shape: "sine", rate: .4, depth: 1 } },
      { name: "Fast pan", set: { what: "pan", shape: "triangle", rate: 5, depth: .9 } }
    ]);
    w.pick("what", "The LFO moves", [["amp", "Volume (tremolo)"], ["pan", "Left ↔ right (auto-pan)"]], "amp", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.pick("shape", "Shape", [["sine", "Sine"], ["triangle", "Triangle"], ["square", "Square"]], "triangle");
    w.num("rate", { label: "Rate", min: .1, max: 15, log: true, value: 6, fmt: fmtHz });
    w.num("depth", { label: "Depth", min: 0, max: 1, step: .01, value: .6, fmt: fmtPct });
    w.view = viewer(w.body, { ms: 400 });
    w.build = function (c) {
      var inp = c.createGain(), amp = c.createGain(), pan = c.createStereoPanner(), lfo = c.createOscillator(), lg = c.createGain();
      lfo.type = w.P.shape; lfo.frequency.value = w.P.rate; lfo.connect(lg); lfo.start(); inp.connect(amp); amp.connect(pan);
      function set() { var t = ac().currentTime, dd = w.P.depth; if (w.P.what === "amp") { amp.gain.setTargetAtTime(1 - dd / 2, t, .01); lg.gain.setTargetAtTime(dd / 2, t, .01); } else lg.gain.setTargetAtTime(dd, t, .01); }
      lg.connect(w.P.what === "amp" ? amp.gain : pan.pan); w.n = { lfo: lfo, set: set }; set();
      return { input: inp, output: pan, stop: function () { lfo.stop(); } };
    };
    w.apply = function (k, v) { if (!w.n) return; if (k === "shape") w.n.lfo.type = v; if (k === "rate") w.n.lfo.frequency.setTargetAtTime(v, ac().currentTime, .01); if (k === "depth") w.n.set(); };
    return w;
  }

  // ---------- rotary speaker (Leslie) ----------
  // A horn for the highs and a drum for the lows, spinning. As each turns toward you it gets louder and (Doppler) higher,
  // and it moves left to right. The horn is light and gets up to speed in about a second; the heavy drum takes five.
  var ROT = { slow: [.8, .7], fast: [6.7, 5.9], stop: [0, 0] };
  function Rotary(host) {
    var w = Fx(host, "Rotary speaker", "organ", 1), ang = [0, 0], lastT = 0;
    w.pick("speed", "Speed", [["slow", "Slow (chorale)"], ["fast", "Fast (tremolo)"], ["stop", "Stopped"]], "slow");
    var fast = button(w.tools, "Slow ⇄ Fast", function () { if (!w.running) w.start(); w.c.speed.set(w.P.speed === "fast" ? "slow" : "fast"); }); w.tools.insertBefore(fast, w.status);
    w.num("hornAcc", { label: "Horn speeds up in", min: .2, max: 3, step: .1, value: .8, fmt: fmtS });
    w.num("drumAcc", { label: "Drum speeds up in", min: 1, max: 10, step: .1, value: 5, fmt: fmtS });
    w.num("xover", { label: "Crossover", min: 300, max: 2000, log: true, value: 800, fmt: fmtHz });
    w.num("drive", { label: "Amp drive", min: 1, max: 8, step: .1, value: 1.5, fmt: function (v) { return "×" + v.toFixed(1); } });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "The horn and the drum seen from above, spinning"); w.body.appendChild(cv);
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, now = ac().currentTime, dt = Math.min(.1, now - lastT); lastT = now;
      if (w.n) { ang[0] += 2 * Math.PI * w.n.h.value * dt; ang[1] += 2 * Math.PI * w.n.d.value * dt; }
      [["horn (highs)", W * .3, "#d6336c", 0, 1], ["drum (lows)", W * .7, "#1f8f84", 1, .6]].forEach(function (p) {
        var cx = p[1], cy = H / 2 + 6, r = (H / 2 - 14); g.strokeStyle = C.line; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
        g.strokeStyle = p[2]; g.lineWidth = 5 * p[4]; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r * Math.sin(ang[p[3]]), cy + r * Math.cos(ang[p[3]])); g.stroke(); g.lineWidth = 1;
        g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText(p[0] + ": " + (w.n ? (p[3] ? w.n.d : w.n.h).value.toFixed(1) : "0") + " turns/s", cx - 45, 11);
      });
      g.fillText("you ↓", W / 2 - 12, H - 2);
    });
    w.view = viewer(w.body, { ms: 30 });
    w.build = function (c) {
      var inp = c.createGain(), pre = shaper(c, function (x) { return Math.tanh(x * w.P.drive) / Math.tanh(w.P.drive); }), out = c.createGain();
      inp.connect(pre); w.n = { pre: pre, xs: [] };
      [["h", "highpass", .00035, .5, .9], ["d", "lowpass", .0001, .35, .8]].forEach(function (r) {
        var x = c.createBiquadFilter(); x.type = r[1]; x.frequency.value = w.P.xover; w.n.xs.push(x); pre.connect(x);
        var spin = c.createOscillator(); spin.frequency.value = ROT[w.P.speed][r[0] === "h" ? 0 : 1]; spin.start(); w.n[r[0]] = spin.frequency; w.n[r[0] + "o"] = spin;
        var dl = c.createDelay(.01), dg = c.createGain(), amp = c.createGain(), ag = c.createGain(), pan = c.createStereoPanner(), pg = c.createGain();
        dl.delayTime.value = .002; dg.gain.value = r[2]; spin.connect(dg); dg.connect(dl.delayTime);
        amp.gain.value = 1 - r[3] / 2; ag.gain.value = r[3] / 2; spin.connect(ag); ag.connect(amp.gain);   // loudest facing you
        pg.gain.value = r[4]; spin.connect(pg); pg.connect(pan.pan);
        x.connect(dl); dl.connect(amp); amp.connect(pan); pan.connect(out);
      });
      return { input: inp, output: out, stop: function () { w.n.ho.stop(); w.n.do.stop(); } };
    };
    w.apply = function (k, v) {
      if (!w.n) return; var t = ac().currentTime;
      if (k === "speed") { w.n.h.setTargetAtTime(ROT[v][0], t, w.P.hornAcc / 3); w.n.d.setTargetAtTime(ROT[v][1], t, w.P.drumAcc / 3); }
      if (k === "xover") w.n.xs.forEach(function (x) { x.frequency.setTargetAtTime(v, t, .01); });
      if (k === "drive") w.n.pre.curve = shaper(ac(), function (x) { return Math.tanh(x * v) / Math.tanh(v); }).curve;
    };
    return w;
  }
  // ---------- octaver ----------
  function Octaver(host) {
    var w = Fx(host, "Octaver", "riff", 1);
    w.presets([
      { name: "Sub bass", set: { dry: .8, down1: .9, down2: 0, up: 0, upKind: "shift" } },
      { name: "Organ-ish", set: { dry: .7, down1: .6, down2: 0, up: .5, upKind: "shift" } },
      { name: "Octave fuzz", set: { dry: .4, down1: 0, down2: 0, up: 1, upKind: "rect" } },
      { name: "Huge", set: { dry: .6, down1: .8, down2: .6, up: .3, upKind: "shift" } }
    ]);
    w.num("dry", { label: "Original", min: 0, max: 1, step: .01, value: .8, fmt: fmtPct });
    w.num("down1", { label: "One octave down", min: 0, max: 1, step: .01, value: .9, fmt: fmtPct });
    w.num("down2", { label: "Two octaves down", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct });
    w.num("up", { label: "One octave up", min: 0, max: 1, step: .01, value: 0, fmt: fmtPct });
    w.pick("upKind", "Octave up made by", [["shift", "Pitch shifting (digital)"], ["rect", "Folding the wave (analog)"]], "shift", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.view = viewer(w.body, { ms: 20 });
    w.build = function (c) {
      var inp = c.createGain(), out = c.createGain(), gs = {}, stops = [];
      function lane(k, node) { var g = c.createGain(); g.gain.value = w.P[k]; node.connect(g); g.connect(out); gs[k] = g; }
      lane("dry", inp);
      [["down1", .5], ["down2", .25]].forEach(function (x) { var s = shifter(c, x[1], .08); inp.connect(s.input); lane(x[0], s.output); stops.push(s.stop); });
      if (w.P.upKind === "rect") { var r = shaper(c, function (x) { return Math.abs(x) * 1.6; }), hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 60; inp.connect(r); r.connect(hp); lane("up", hp); }
      else { var s2 = shifter(c, 2, .05); inp.connect(s2.input); lane("up", s2.output); stops.push(s2.stop); }
      w.n = gs; return { input: inp, output: out, stop: function () { stops.forEach(function (f) { f(); }); } };
    };
    w.apply = function (k, v) { if (w.n && w.n[k]) w.n[k].gain.setTargetAtTime(v, ac().currentTime, .02); };
    return w;
  }

  // ---------- harmonizer ----------
  var IVALS = [["-12", "Octave down"], ["-5", "4th down"], ["3", "Minor 3rd up"], ["4", "Major 3rd up"], ["5", "4th up"], ["7", "5th up"], ["8", "Minor 6th up"], ["9", "Major 6th up"], ["12", "Octave up"]];
  var MAJOR = [0, 2, 4, 5, 7, 9, 11];
  function scaleStep(m, steps, key) { var pc = ((Math.round(m) - key) % 12 + 12) % 12, deg = 0, best = 99; MAJOR.forEach(function (x, i) { if (Math.abs(x - pc) < best) { best = Math.abs(x - pc); deg = i; } });
    var oct = Math.floor((deg + steps) / 7), tgt = MAJOR[(deg + steps) % 7] + 12 * oct; return tgt - MAJOR[deg]; }
  function Harmonizer(host) {
    var w = Fx(host, "Harmonizer", "voice", 1), lastF = 0, an = null;
    w.pick("mode", "Harmony", [["fixed", "Fixed intervals"], ["key", "In the key of C major"]], "fixed");
    w.pick("i1", "Voice 1 (fixed)", IVALS, "4"); w.pick("i2", "Voice 2 (fixed)", IVALS, "7");
    w.pick("k1", "Voice 1 (in key)", [["2", "A 3rd up"], ["-2", "A 3rd down"], ["5", "A 6th up"]], "2"); w.pick("k2", "Voice 2 (in key)", [["4", "A 5th up"], ["-3", "A 4th down"], ["7", "An octave up"]], "4");
    w.num("l1", { label: "Voice 1 level", min: 0, max: 1, step: .01, value: .7, fmt: fmtPct }); w.num("l2", { label: "Voice 2 level", min: 0, max: 1, step: .01, value: .5, fmt: fmtPct });
    w.view = viewer(w.body, { ms: 30 });
    w.build = function (c) {
      var inp = c.createGain(), out = c.createGain(), vs = []; inp.connect(out); an = c.createAnalyser(); an.fftSize = 2048; inp.connect(an); var buf = new Float32Array(2048);
      [1, 2].forEach(function (i) { var s = shifter(c, 1, .05), g = c.createGain(); g.gain.value = w.P["l" + i]; inp.connect(s.input); s.output.connect(g); g.connect(out); vs.push({ s: s, g: g }); });
      function upd() { var t = c.currentTime;
        if (w.P.mode === "key") { an.getFloatTimeDomainData(buf); var f = detectPitch(buf, c.sampleRate); if (f) lastF = f; }
        vs.forEach(function (v, j) { var st = w.P.mode === "key" ? (lastF ? scaleStep(69 + 12 * Math.log2(lastF / 440), +w.P["k" + (j + 1)], 0) : 0) : +w.P["i" + (j + 1)]; v.s.set(Math.pow(2, st / 12), t, .02); }); }
      upd(); var id = setInterval(upd, 40);
      w.n = vs; return { input: inp, output: out, stop: function () { clearInterval(id); vs.forEach(function (v) { v.s.stop(); }); } };
    };
    w.apply = function (k, v) { if (w.n && /^l\d/.test(k)) w.n[+k[1] - 1].g.gain.setTargetAtTime(v, ac().currentTime, .02); };
    return w;
  }

  // ---------- auto-tune (pitch correction) ----------
  var SCALES = { chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9] };
  function AutoTune(host) {
    var w = Fx(host, "Pitch correction", "singer", 1), hist = history(200), shift = null;
    w.presets([
      { name: "Off", set: { amt: 0 } },
      { name: "Natural", set: { amt: 1, speed: 120, scale: "major" } },
      { name: "Hard (the T-Pain sound)", set: { amt: 1, speed: 1, scale: "major" } },
      { name: "Wrong key", set: { amt: 1, speed: 1, scale: "minor", key: "1" } }
    ]);
    w.pick("key", "Key", ROOTS.map(function (r, i) { return [String(i), r[1]]; }), "0");
    w.pick("scale", "Scale", [["major", "Major"], ["minor", "Natural minor"], ["pent", "Major pentatonic"], ["chromatic", "Chromatic (every semitone)"]], "major");
    w.num("speed", { label: "Retune speed", min: 1, max: 400, log: true, value: 1, fmt: function (v) { return Math.round(v) + " ms"; } });
    w.num("amt", { label: "Amount", min: 0, max: 1, step: .01, value: 1, fmt: fmtPct });
    var cv = el("canvas", "sk-plot"); cv.setAttribute("aria-label", "Pitch over the last four seconds: grey as sung, coloured after correction, lines are the scale's notes"); w.body.appendChild(cv);
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, a = hist.a.filter(function (x) { return x; }), lo = 52, hi = 70;
      if (a.length) { lo = Math.floor(Math.min.apply(null, a.map(function (x) { return x[0]; }))) - 2; hi = lo + 18; }
      var Y = function (m) { return H - 4 - (m - lo) / (hi - lo) * (H - 18); }, sc = SCALES[w.P.scale], key = +w.P.key;
      for (var m = lo; m <= hi; m++) { var on = sc.indexOf(((m - key) % 12 + 12) % 12) >= 0; g.strokeStyle = C.line; g.globalAlpha = on ? .9 : .25; g.beginPath(); g.moveTo(0, Y(m)); g.lineTo(W, Y(m)); g.stroke(); if (on) { g.fillStyle = C.ink2; g.fillText(noteName(m), 2, Y(m) - 1); } } g.globalAlpha = 1;
      [[0, C.ink2, 1.2], [1, C.hot, 2]].forEach(function (p) { g.strokeStyle = p[1]; g.lineWidth = p[2]; g.beginPath(); var pen = false;
        hist.a.forEach(function (x, i) { if (!x) { pen = false; return; } var X = i / 199 * W, yy = Y(x[p[0]]); pen ? g.lineTo(X, yy) : g.moveTo(X, yy); pen = true; }); g.stroke(); });
      g.lineWidth = 1; g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("last 4 s: grey as sung, pink after correction", 40, 11);
    });
    w.view = viewer(w.body, { ms: 30 });
    w.build = function (c) {
      var inp = c.createGain(), an = c.createAnalyser(), buf = new Float32Array(2048); an.fftSize = 2048; inp.connect(an);
      shift = shifter(c, 1, .04); inp.connect(shift.input); var cur = 0;
      var id = setInterval(function () {
        an.getFloatTimeDomainData(buf); var f = detectPitch(buf, c.sampleRate); if (!f) { hist.push(null); return; }
        var m = 69 + 12 * Math.log2(f / 440), sc = SCALES[w.P.scale], key = +w.P.key, best = m, bd = 99;
        for (var k = Math.floor(m) - 2; k <= Math.ceil(m) + 2; k++) if (sc.indexOf(((k - key) % 12 + 12) % 12) >= 0 && Math.abs(k - m) < bd) { bd = Math.abs(k - m); best = k; }
        var want = (best - m) * w.P.amt; cur = want;
        shift.set(Math.pow(2, want / 12), c.currentTime, Math.max(.001, w.P.speed / 3000));
        hist.push([m, m + want]);
      }, 20);
      return { input: inp, output: shift.output, stop: function () { clearInterval(id); shift.stop(); } };
    };
    return w;
  }

  // ---------- stereo: pan, Haas, mid/side width ----------
  function Stereo(host) {
    var w = Fx(host, "Stereo", "riff", 1), aL = null, aR = null, td = [new Float32Array(1024), new Float32Array(1024)];
    w.pick("mode", "Tool", [["pan", "Pan"], ["haas", "Haas delay"], ["width", "Width (mid / side)"]], "pan", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.num("pan", { label: "Pan", min: -1, max: 1, step: .01, value: 0, fmt: function (v) { return v === 0 ? "centre" : Math.round(Math.abs(v) * 100) + "% " + (v < 0 ? "left" : "right"); } });
    w.num("haas", { label: "Haas: delay the right side", min: 0, max: 40, step: .1, value: 15, fmt: fmtMs });
    w.num("width", { label: "Width", min: 0, max: 2, step: .01, value: 1, fmt: fmtPct });
    var mono = button(w.tools, "Mono", function () { w.mono = !w.mono; mono.classList.toggle("sk-on", w.mono); if (w.n) w.n.setMono(); }); w.tools.insertBefore(mono, w.status);
    mono.title = "Fold left and right together, as a phone speaker or a club PA does";
    var cv = el("canvas", "sk-plot sk-square"); cv.setAttribute("aria-label", "Vectorscope: up is the middle, sideways is the difference between left and right"); w.body.appendChild(cv);
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, S = Math.min(W, H) - 20, cx = 10 + S / 2, cy = 10 + S / 2;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(cx, 10); g.lineTo(cx, 10 + S); g.moveTo(10, cy); g.lineTo(10 + S, cy); g.moveTo(10, 10); g.lineTo(10 + S, 10 + S); g.moveTo(10 + S, 10); g.lineTo(10, 10 + S); g.stroke();
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("L", 14, 22); g.fillText("R", 4 + S, 22); g.fillText("mono", cx + 3, 20);
      if (!aL || !w.running) return; aL.getFloatTimeDomainData(td[0]); aR.getFloatTimeDomainData(td[1]);
      g.fillStyle = C.acc2; for (var i = 0; i < 1024; i += 2) { var L = td[0][i], R = td[1][i], x = (R - L) * .7, y = (L + R) * .7; g.fillRect(cx + x * S / 2.2, cy - Math.abs(y) * S / 2.2 * Math.sign(y || 1), 1.5, 1.5); }
    });
    w.view = viewer(w.body, { ms: 20 });
    w.build = function (c) {
      var inp = c.createGain(), out = c.createGain(), sp = c.createChannelSplitter(2), mg = c.createChannelMerger(2), stops = [];
      out.channelCount = 2; out.channelCountMode = "explicit";
      var P = w.P, Lb = c.createGain(), Rb = c.createGain(), n = {};
      if (P.mode === "pan") { var pn = c.createStereoPanner(); pn.pan.value = P.pan; inp.connect(pn); pn.connect(sp); n.pn = pn; }
      else if (P.mode === "haas") { var d = c.createDelay(.1); d.delayTime.value = P.haas / 1000; inp.connect(Lb); inp.connect(d); d.connect(Rb); Lb.connect(mg, 0, 0); Rb.connect(mg, 0, 1); mg.connect(sp); n.d = d; }
      else {
        // a stereo source first (a slow chorus on each side, opposite ways), then mid = L+R, side = L−R; width scales the side
        var lfo = c.createOscillator(); lfo.frequency.value = .3; lfo.start(); stops.push(function () { lfo.stop(); });
        [-1, 1].forEach(function (sg, i) { var dl = c.createDelay(.05), lg = c.createGain(); dl.delayTime.value = .012 + i * .007; lg.gain.value = .003 * sg; lfo.connect(lg); lg.connect(dl.delayTime); var b = i ? Rb : Lb; inp.connect(dl); dl.connect(b); b.connect(mg, 0, i); });
        var m2 = c.createChannelSplitter(2), mid = c.createGain(), side = c.createGain(), sw = c.createGain(), inv = c.createGain(), oL = c.createGain(), oR = c.createGain(), mg2 = c.createChannelMerger(2);
        mg.connect(m2); mid.gain.value = .5; side.gain.value = .5; m2.connect(mid, 0); m2.connect(mid, 1); m2.connect(side, 0); var neg = c.createGain(); neg.gain.value = -1; m2.connect(neg, 1); neg.connect(side);
        sw.gain.value = P.width; side.connect(sw); inv.gain.value = -1; sw.connect(inv);
        mid.connect(oL); sw.connect(oL); mid.connect(oR); inv.connect(oR); oL.connect(mg2, 0, 0); oR.connect(mg2, 0, 1); mg2.connect(sp); n.sw = sw;
      }
      // the mono switch: each output channel is (L + R) / 2
      var fL = c.createGain(), fR = c.createGain(), xL = c.createGain(), xR = c.createGain(), mo = c.createChannelMerger(2);
      sp.connect(fL, 0); sp.connect(xL, 0); sp.connect(fR, 1); sp.connect(xR, 1); fL.connect(mo, 0, 0); xR.connect(mo, 0, 0); fR.connect(mo, 0, 1); xL.connect(mo, 0, 1); mo.connect(out);
      n.setMono = function () { var m = w.mono ? .5 : 1, x = w.mono ? .5 : 0, t = c.currentTime; fL.gain.setTargetAtTime(m, t, .01); fR.gain.setTargetAtTime(m, t, .01); xL.gain.setTargetAtTime(x, t, .01); xR.gain.setTargetAtTime(x, t, .01); }; n.setMono();
      var s2 = c.createChannelSplitter(2); out.connect(s2); aL = c.createAnalyser(); aR = c.createAnalyser(); aL.fftSize = aR.fftSize = 1024; s2.connect(aL, 0); s2.connect(aR, 1);
      w.n = n; return { input: inp, output: out, stop: function () { stops.forEach(function (f) { f(); }); } };
    };
    w.apply = function (k, v) { if (!w.n) return; var t = ac().currentTime; if (k === "pan" && w.n.pn) w.n.pn.pan.setTargetAtTime(v, t, .01); if (k === "haas" && w.n.d) w.n.d.delayTime.setTargetAtTime(v / 1000, t, .01); if (k === "width" && w.n.sw) w.n.sw.gain.setTargetAtTime(v, t, .01); };
    return w;
  }

  // ---------- signal chain and gain staging ----------
  var STAGES = [["none", "—"], ["dist", "Distortion"], ["comp", "Compressor"], ["delay", "Delay"], ["verb", "Reverb"], ["wah", "Auto-wah"], ["eq", "Bass boost EQ"]];
  function stage(c, k) {
    var i = c.createGain(), o;
    if (k === "dist") { var sh = shaper(c, function (x) { return Math.tanh(x * 12) * .7; }), lp = c.createBiquadFilter(); lp.frequency.value = 4000; sh.oversample = "4x"; i.connect(sh); sh.connect(lp); o = lp; }
    else if (k === "comp") { var cp = c.createDynamicsCompressor(), mk = c.createGain(); cp.threshold.value = -30; cp.ratio.value = 6; cp.attack.value = .005; cp.release.value = .15; mk.gain.value = 3; i.connect(cp); cp.connect(mk); o = mk; }
    else if (k === "delay") { var d = c.createDelay(1), fb = c.createGain(), sum = c.createGain(); d.delayTime.value = .36; fb.gain.value = .45; i.connect(sum); i.connect(d); d.connect(fb); fb.connect(d); d.connect(sum); o = sum; }
    else if (k === "verb") { var cv = c.createConvolver(), s2 = c.createGain(), wg = c.createGain(); cv.buffer = irNoise(c, 2.5, 5000); wg.gain.value = .6; i.connect(s2); i.connect(cv); cv.connect(wg); wg.connect(s2); o = s2; }
    else if (k === "wah") { var bp = c.createBiquadFilter(), lf = c.createOscillator(), lg = c.createGain(), mk2 = c.createGain(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 5; lf.frequency.value = 1.6; lg.gain.value = 1500; lf.connect(lg); lg.connect(bp.detune); lf.start(); mk2.gain.value = 2.5; i.connect(bp); bp.connect(mk2); o = mk2; o.stop = function () { lf.stop(); }; }
    else if (k === "eq") { var ls = c.createBiquadFilter(); ls.type = "lowshelf"; ls.frequency.value = 200; ls.gain.value = 12; i.connect(ls); o = ls; }
    else o = i;
    return { input: i, output: o };
  }
  function Chain(host) {
    var w = Fx(host, "Signal chain", "riff", 1), ans = [], buf = new Float32Array(2048), pk = [];
    w.presets([
      { name: "Distortion → Delay", set: { s1: "dist", s2: "delay", s3: "none" } },
      { name: "Delay → Distortion", set: { s1: "delay", s2: "dist", s3: "none" } },
      { name: "Distortion → Reverb", set: { s1: "dist", s2: "verb", s3: "none" } },
      { name: "Reverb → Distortion", set: { s1: "verb", s2: "dist", s3: "none" } },
      { name: "Compressor → Wah", set: { s1: "comp", s2: "wah", s3: "none" } },
      { name: "Wah → Compressor", set: { s1: "wah", s2: "comp", s3: "none" } },
      { name: "Too hot", set: { s1: "eq", s2: "comp", s3: "delay", trim: 10, clip: "1" } }
    ]);
    ["s1", "s2", "s3"].forEach(function (k, i) { w.pick(k, "Slot " + (i + 1), STAGES, ["dist", "delay", "none"][i], null, function () { if (w.running) { w.stop(); w.start(); } }); });
    w.num("trim", { label: "Input gain", min: -20, max: 20, step: .5, value: 0, fmt: fmtDb });
    w.pick("clip", "Clip above 0 dB at every stage, like real gear", [["0", "No"], ["1", "Yes"]], "1", null, function () { if (w.running) { w.stop(); w.start(); } });
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "Peak level after each stage; red when over 0 dB"); w.body.appendChild(cv);
    anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, labels = ["input"].concat(["s1", "s2", "s3"].map(function (k) { return STAGES.filter(function (x) { return x[0] === w.P[k]; })[0][1]; })), n = labels.length, bw = W / n;
      var Y = function (db) { return H - 14 - (Math.max(-48, Math.min(12, db)) + 48) / 60 * (H - 30); };
      g.strokeStyle = C.hot; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke(); g.setLineDash([]);
      labels.forEach(function (lb, i) {
        var db = -90; if (ans[i] && w.running) { ans[i].getFloatTimeDomainData(buf); var m = 0; for (var j = 0; j < buf.length; j++) m = Math.max(m, Math.abs(buf[j])); db = todb(m); }
        pk[i] = Math.max(db, (pk[i] || -90) - .7); var x = i * bw + bw * .25;
        g.fillStyle = pk[i] > 0 ? "#d6336c" : C.acc2; g.fillRect(x, Y(pk[i]), bw * .5, H - 14 - Y(pk[i]));
        g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText(lb + (pk[i] > -90 ? " " + pk[i].toFixed(0) + " dB" : ""), x - 6, H - 2);
      });
      g.fillText("peak level after each stage (dashed: 0 dB, the ceiling)", 4, 11);
    });
    w.view = viewer(w.body, { ms: 30 });
    w.build = function (c) {
      var inp = c.createGain(), stops = [], clip = w.P.clip === "1"; inp.gain.value = Math.pow(10, w.P.trim / 20); ans = [];
      function tap(node) { var a = c.createAnalyser(); a.fftSize = 2048; node.connect(a); ans.push(a); }
      var prev = inp; tap(prev);
      ["s1", "s2", "s3"].forEach(function (k) { var st = stage(c, w.P[k]); prev.connect(st.input); prev = st.output; if (st.output.stop) stops.push(st.output.stop);
        if (clip) { var h = shaper(c, function (x) { return Math.max(-1, Math.min(1, x * 4)); }), pre = c.createGain(); pre.gain.value = .25; prev.connect(pre); pre.connect(h); prev = h; }
        tap(prev); });
      var out = c.createGain(); out.gain.value = .5; prev.connect(out); w.n = { inp: inp };
      return { input: inp, output: out, stop: function () { stops.forEach(function (f) { f(); }); } };
    };
    w.apply = function (k, v) { if (w.n && k === "trim") w.n.inp.gain.setTargetAtTime(Math.pow(10, v / 20), ac().currentTime, .02); };
    return w;
  }

  // ---------- shimmer and freeze ----------
  function Shimmer(host) {
    var w = Fx(host, "Shimmer and freeze", "chords", .5), rec = null, frozen = null;
    w.presets([
      { name: "Plain long reverb", set: { decay: 5, shimmer: 0, fb: .3 } },
      { name: "Shimmer", set: { decay: 5, shimmer: .7, fb: .45, interval: "12" } },
      { name: "Fifths", set: { decay: 4, shimmer: .6, fb: .4, interval: "7" } }
    ]);
    w.num("decay", { label: "Reverb decay", min: 1, max: 10, step: .1, value: 5, fmt: fmtS });
    w.num("shimmer", { label: "Shimmer (pitched feedback)", min: 0, max: 1, step: .01, value: .7, fmt: fmtPct });
    w.pick("interval", "Shimmer interval", [["12", "Octave up"], ["7", "5th up"], ["24", "Two octaves up"], ["-12", "Octave down"]], "12");
    w.num("fb", { label: "Feedback", min: 0, max: .6, step: .01, value: .45, fmt: fmtPct });
    var fz = button(w.tools, "❄ Freeze", function () { if (!w.running) return; frozen ? thaw() : freeze(); }); w.tools.insertBefore(fz, w.status);
    fz.title = "Hold the last second of sound forever";
    w.view = viewer(w.body, { ms: 30 });
    var timer = null;
    function freeze() {
      var c = ac(), b = rec.take(1.2), out = w.n.frzIn, next = c.currentTime + .02; frozen = setInterval(function () { while (next < c.currentTime + .1) { grain(c, b, out, next, .1 + Math.random() * .8, .25, 1, Math.random() * 1.2 - .6, .35); next += .05; } }, 20);
      w.n.live.gain.setTargetAtTime(0, c.currentTime, .05); fz.classList.add("sk-on"); w.status.textContent = "Frozen: change the chord and listen to the old one hang.";
    }
    function thaw() { clearInterval(frozen); frozen = null; if (w.n) w.n.live.gain.setTargetAtTime(1, ac().currentTime, .05); fz.classList.remove("sk-on"); w.status.textContent = ""; }
    w.build = function (c) {
      var inp = c.createGain(), live = c.createGain(), frzIn = c.createGain(), conv = c.createConvolver(), out = c.createGain(), sh = shifter(c, Math.pow(2, +w.P.interval / 12), .08);
      var shg = c.createGain(), fb = c.createGain(), lp = c.createBiquadFilter(), sat = shaper(c, function (x) { return Math.tanh(x); }), dl = c.createDelay(.2);
      conv.buffer = irNoise(c, w.P.decay, 6000); dl.delayTime.value = .03; lp.frequency.value = 7000; shg.gain.value = w.P.shimmer; fb.gain.value = w.P.fb;
      inp.connect(live); live.connect(conv); frzIn.connect(conv); conv.connect(out);
      conv.connect(sh.input); sh.output.connect(shg); conv.connect(fb); shg.connect(lp); fb.connect(lp); lp.connect(sat); sat.connect(dl); dl.connect(conv);
      // the shimmer path and the plain path share the feedback gain: shimmer only moves energy up the octave
      shg.gain.value = w.P.fb * w.P.shimmer; fb.gain.value = w.P.fb * (1 - w.P.shimmer);
      rec = recorder(c, 2); inp.connect(rec.input);
      w.n = { conv: conv, sh: sh, shg: shg, fb: fb, live: live, frzIn: frzIn };
      return { input: inp, output: out, stop: function () { thaw(); sh.stop(); rec.stop(); w.n = null; } };
    };
    w.apply = function (k, v) {
      if (!w.n) return; var t = ac().currentTime, P = w.P;
      if (k === "shimmer" || k === "fb") { w.n.shg.gain.setTargetAtTime(P.fb * P.shimmer, t, .05); w.n.fb.gain.setTargetAtTime(P.fb * (1 - P.shimmer), t, .05); }
      if (k === "interval") w.n.sh.set(Math.pow(2, +v / 12), t);
      if (k === "decay") { clearTimeout(timer); timer = setTimeout(function () { if (w.n) w.n.conv.buffer = irNoise(ac(), w.P.decay, 6000); }, 150); }
    };
    return w;
  }

  // ---------- reverb ----------
  function Reverb(host) {
    var w = Fx(host, "Reverb", "hits", .35);
    w.presets([
      { name: "Small room", set: { decay: .5, pre: 3, damp: 5000, early: .6, size: .25, reverse: "0", type: "room" } },
      { name: "Hall", set: { decay: 2.2, pre: 20, damp: 6000, early: .4, size: .8, reverse: "0", type: "room" } },
      { name: "Cathedral", set: { decay: 6, pre: 40, damp: 3000, early: .3, size: 1, reverse: "0", type: "room" } },
      { name: "Plate", set: { decay: 1.8, pre: 0, damp: 12000, early: 0, size: .4, reverse: "0", type: "room" } },
      { name: "Reverse", set: { decay: 1.5, pre: 0, damp: 8000, early: 0, size: .5, reverse: "1", type: "room" } },
      { name: "Spring", set: { decay: 2.5, pre: 0, damp: 4500, early: 0, size: .35, reverse: "0", type: "spring" } }
    ]);
    w.pick("type", "Kind", [["room", "Room (noise)"], ["spring", "Spring"]], "room");
    w.num("decay", { label: "Decay time (RT60)", min: .1, max: 10, log: true, value: 2, fmt: fmtS });
    w.num("pre", { label: "Pre-delay", min: 0, max: 200, step: 1, value: 20, fmt: fmtMs });
    w.num("damp", { label: "Damping (highs fade)", min: 800, max: 16000, log: true, value: 6000, fmt: fmtHz });
    w.num("early", { label: "Early reflections", min: 0, max: 1, step: .01, value: .4, fmt: fmtPct });
    w.num("size", { label: "Room size", min: .1, max: 1, step: .01, value: .7, fmt: fmtPct });
    w.pick("reverse", "Play the echo backwards", [["0", "No"], ["1", "Yes"]], "0");
    var ir = null, cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "The impulse response: what one clap sounds like in this room"); w.body.appendChild(cv);
    function makeIR() {
      var c = ac(), sr = c.sampleRate, P = w.P, len = Math.ceil(sr * Math.min(10, P.decay * 1.2 + .05)), b = c.createBuffer(2, len, sr);
      var k = 6.91 / P.decay;
      // a spring: the wave runs to the end of the coil and back again and again (Room size sets the trip time). The coil
      // carries low frequencies faster than high ones, so each trip arrives as a falling chirp: the "drip" and the "boing".
      if (P.type === "spring") for (var sc = 0; sc < 2; sc++) {
        var ds = b.getChannelData(sc), trip = .025 + .06 * P.size * (sc ? 1.07 : 1), cl = Math.floor(sr * trip), fl = 0, fa = Math.exp(-2 * Math.PI * P.damp / sr);
        for (var r = 0; r * cl < len; r++) {
          var ph = 0, at0 = r * cl, spread = Math.min(cl * 2.5, (r + 1) * .012 * sr);   // each trip smears the chirp out a bit more
          for (var q0 = 0; q0 < spread && at0 + q0 < len; q0++) { var x0 = q0 / spread, f = 4200 * Math.pow(1 - x0, 2) + 180; ph += 2 * Math.PI * f / sr;
            ds[at0 + q0] += Math.sin(ph) * Math.sin(Math.PI * x0) * (r % 2 ? -.8 : 1); }
        }
        for (var i2 = 0; i2 < len; i2++) { fl = fl * fa + (ds[i2] + (Math.random() * 2 - 1) * .08) * (1 - fa); ds[i2] = fl * Math.exp(-k * i2 / sr); }
        if (P.reverse === "1") Array.prototype.reverse.call(ds);
      }
      else for (var ch = 0; ch < 2; ch++) {
        var d = b.getChannelData(ch), lp = 0;
        // noise that dies away, through a low-pass that closes as it goes: the highs fade first, as in a real room
        for (var i = 0; i < len; i++) { var t = i / sr, fc = P.damp + (18000 - P.damp) * Math.exp(-4 * t / P.decay), a = Math.exp(-2 * Math.PI * fc / sr);
          lp = lp * a + (Math.random() * 2 - 1) * (1 - a); d[i] = lp * Math.exp(-k * t) * Math.min(1, t / (.002 + .03 * P.size)); }
        if (P.early > 0) for (var j = 0; j < 8; j++) { var at = Math.floor(sr * (.004 + Math.random() * .07 * P.size)); if (at < len) d[at] += (Math.random() < .5 ? -1 : 1) * P.early * (1 - j / 10) * .8; }
        if (P.reverse === "1") Array.prototype.reverse.call(d);
      }
      // normalise so long and short rooms are about as loud
      var sum = 0; for (var c2 = 0; c2 < 2; c2++) { var dd = b.getChannelData(c2); for (var q = 0; q < len; q++) sum += dd[q] * dd[q]; }
      var g = 1 / Math.sqrt(sum / 2 + 1e-9) * 2.4; for (var c3 = 0; c3 < 2; c3++) { var d3 = b.getChannelData(c3); for (var q2 = 0; q2 < len; q2++) d3[q2] *= g; }
      return b;
    }
    var dirty = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h; if (!ir) { g.fillStyle = C.ink2; g.font = "11px system-ui, sans-serif"; g.fillText("Press ▶ to make the room; its echo pattern shows here.", 6, H / 2); return; }
      var d = ir.getChannelData(0), n = d.length, pre = w.P.pre / 1000 * ir.sampleRate, tot = n + pre, pk = 0; for (var i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
      g.strokeStyle = C.acc2; g.beginPath(); for (var x = 0; x < W; x++) { var a = Math.floor(x / W * tot - pre), b2 = Math.floor((x + 1) / W * tot - pre), m = 0; for (var j = Math.max(0, a); j < Math.min(n, b2); j++) m = Math.max(m, Math.abs(d[j])); var hgt = m / pk * (H - 18); g.moveTo(x, H - 2); g.lineTo(x, H - 2 - hgt); } g.stroke();
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("impulse response: " + (tot / ir.sampleRate).toFixed(2) + " s", 4, 11);
    });
    var timer = null;
    w.redraw = function () { clearTimeout(timer); timer = setTimeout(function () { if (w.n) { ir = makeIR(); w.n.conv.buffer = ir; w.n.pd.delayTime.value = w.P.pre / 1000; } dirty(); }, 120); };
    w.view = viewer(w.body, { ms: 20 });
    w.build = function (c) { var inp = c.createGain(), pd = c.createDelay(1), conv = c.createConvolver(); ir = makeIR(); conv.buffer = ir; pd.delayTime.value = w.P.pre / 1000; inp.connect(pd); pd.connect(conv); w.n = { conv: conv, pd: pd }; dirty(); return { input: inp, output: conv }; };
    return w;
  }

  // ---------- vocoder ----------
  function Vocoder(host) {
    var w = Base(host, "Vocoder"), poly = null, held = null, bands = [], meters = null;
    w.pick("mod", "Modulator (the voice)", [["mic", "Microphone"], ["voice", "Robot voice"], ["drums", "Drum loop"], ["riff", "Synth riff"]], host.getAttribute("data-source") || "voice", w.tools, function () { if (w.running) { w.stop(); w.start(); } });
    w.tools.insertBefore(w.c.mod.el, w.playBtn);
    w.pick("car", "Carrier (the instrument)", [["saw", "Sawtooth synth"], ["square", "Square synth"], ["noise", "Noise (a whisper)"]], "saw", null, function () { if (w.running) { w.stop(); w.start(); } });
    w.num("bands", { label: "Bands", min: 4, max: 32, step: 1, value: 16, fmt: fmtN(0) });
    w.num("q", { label: "Band sharpness (Q)", min: 2, max: 30, log: true, value: 8, fmt: fmtN(1) });
    w.num("smooth", { label: "Envelope speed", min: 4, max: 80, log: true, value: 25, fmt: fmtHz });
    w.num("sib", { label: "Let “s” sounds through", min: 0, max: 1, step: .01, value: .25, fmt: fmtPct });
    w.num("gain", { label: "Output", min: 0, max: 2, step: .01, value: 1, fmt: fmtPct });
    w.pick("listen", "Listen to", [["voc", "Vocoder"], ["mod", "Modulator only"], ["car", "Carrier only"]], "voc");
    w.status = el("span", "sk-status"); w.tools.appendChild(w.status);
    var cv = el("canvas", "sk-plot sk-short"); cv.setAttribute("aria-label", "How loud each band of the voice is right now"); w.body.appendChild(cv);
    var tdb = new Float32Array(64);
    w.redraw = anim(w, cv, function (C) {
      var s = fit(cv), g = s.g, W = s.w, H = s.h, n = bands.length || w.P.bands, bw = W / n;
      g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.fillText("band levels, low to high", 4, 11);
      bands.forEach(function (b, i) { b.an.getFloatTimeDomainData(tdb); var v = Math.min(1, Math.abs(tdb[tdb.length - 1]) * 1.5); g.fillStyle = C.acc2; g.fillRect(i * bw + 1, H - v * (H - 16), bw - 2, v * (H - 16)); });
    });
    w.view = viewer(w.body, { ms: 25 });
    var keysUsed = false;
    w.usesMic = function () { return w.P.mod === "mic"; };
    w.onStart = function (c, out) {
      var stops = [], modIn = c.createGain(), carIn = c.createGain(), voc = c.createGain(), lm = c.createGain(), lc = c.createGain(), N = Math.round(w.P.bands), lo = 120, hi = 7500;
      bands = [];
      voc.connect(out); lm.connect(out); lc.connect(out); modIn.connect(lm); carIn.connect(lc);
      var rect = new Float32Array(1025); for (var i = 0; i < 1025; i++) rect[i] = Math.abs(i / 512 - 1);
      for (var b = 0; b < N; b++) {
        var f = lo * Math.pow(hi / lo, (b + .5) / N);
        var m1 = c.createBiquadFilter(), m2 = c.createBiquadFilter(), c1 = c.createBiquadFilter(), c2 = c.createBiquadFilter();
        [m1, m2, c1, c2].forEach(function (x) { x.type = "bandpass"; x.frequency.value = f; x.Q.value = w.P.q; });
        var sh = c.createWaveShaper(); sh.curve = rect; var env = c.createBiquadFilter(); env.type = "lowpass"; env.frequency.value = w.P.smooth; env.Q.value = .5;
        var boost = c.createGain(); boost.gain.value = 6 * Math.sqrt(w.P.q / 8); var vca = c.createGain(); vca.gain.value = 0; var an = c.createAnalyser(); an.fftSize = 64;
        modIn.connect(m1); m1.connect(m2); m2.connect(sh); sh.connect(env); env.connect(boost); boost.connect(vca.gain); env.connect(an);
        carIn.connect(c1); c1.connect(c2); c2.connect(vca); vca.connect(voc);
        bands.push({ m: [m1, m2], c: [c1, c2], env: env, an: an, boost: boost });
      }
      var hp = c.createBiquadFilter(), sg = c.createGain(); hp.type = "highpass"; hp.frequency.value = 6000; sg.gain.value = w.P.sib * .6; modIn.connect(hp); hp.connect(sg); sg.connect(voc);
      w.n = { voc: voc, lm: lm, lc: lc, sg: sg };
      listen();
      // carrier
      if (w.P.car === "noise") { var nz = noiseSrc("white"); var ng = c.createGain(); ng.gain.value = 1.2; nz.connect(ng); ng.connect(carIn); nz.start(); stops.push(function () { nz.stop(); }); }
      else { poly = new Poly(function (m, v, t) { return sawVoice(c, carIn, m, v, t, { type: w.P.car === "square" ? "square" : "sawtooth", cut: 9000, a: .005, r: .15 }); }); stops.push(function () { poly.all(c.currentTime); poly = null; }); }
      if (poly && !keysUsed) { held = [48, 55, 58, 62, 67]; held.forEach(function (m) { poly.on(m, .9, c.currentTime); }); }
      // modulator
      var mine = w.P.mod; w.status.textContent = mine === "mic" ? "Opening the microphone… use headphones." : "";
      makeSource(mine, c).then(function (s) { if (!w.running) { s.stop(); return; } s.out.connect(modIn); stops.push(function () { s.stop(); }); w.status.textContent = mine === "mic" ? "Microphone on (headphones!). Talk, and play notes on the keys or MIDI." : "Play notes on the keys or MIDI to change the chord."; },
        function (e) { w.status.textContent = "Microphone not available (" + (e.message || e.name) + "). Try the robot voice."; });
      return function () { stops.forEach(function (f) { f(); }); bands = []; w.n = null; held = null; };
    };
    function listen() { if (!w.n) return; var v = w.P.listen, t = ac().currentTime; w.n.voc.gain.setTargetAtTime(v === "voc" ? w.P.gain * 2.5 : 0, t, .02); w.n.lm.gain.setTargetAtTime(v === "mod" ? .8 : 0, t, .02); w.n.lc.gain.setTargetAtTime(v === "car" ? .5 : 0, t, .02); }
    w.apply = function (k, v) {
      var t = ac().currentTime;
      if (k === "bands") { clearTimeout(w.rb); w.rb = setTimeout(function () { if (w.running) { w.stop(); w.start(); } }, 250); return; }
      if (k === "q") bands.forEach(function (b) { b.m.concat(b.c).forEach(function (x) { x.Q.setTargetAtTime(v, t, .01); }); b.boost.gain.setTargetAtTime(6 * Math.sqrt(v / 8), t, .01); });
      if (k === "smooth") bands.forEach(function (b) { b.env.frequency.setTargetAtTime(v, t, .01); });
      if (k === "sib" && w.n) w.n.sg.gain.setTargetAtTime(v * .6, t, .01);
      if (k === "gain" || k === "listen") listen();
    };
    w.noteOn = function (m, v, t) { keysUsed = true; if (!w.running) w.start(); if (!poly) return; if (held) { held.forEach(function (x) { poly.off(x, ac().currentTime); }); held = null; } poly.on(m, v || .9, t || ac().currentTime); };
    w.noteOff = function (m, t) { if (poly) poly.off(m, t || ac().currentTime); };
    return w;
  }

  // ======================================================================================
  // tuner: a strobe tuner. One band for every partial: the microphone is multiplied by cos and sin at k times the
  // reference pitch and averaged (pitch-detect.js, PitchDetect.strobe); the phase of that average moves the stripes.
  var NOTE_OPTS = [["C", "C"], ["C#", "C♯"], ["Db", "D♭"], ["D", "D"], ["D#", "D♯"], ["Eb", "E♭"], ["E", "E"], ["F", "F"], ["F#", "F♯"], ["Gb", "G♭"], ["G", "G"], ["G#", "G♯"], ["Ab", "A♭"], ["A", "A"], ["A#", "A♯"], ["Bb", "B♭"], ["B", "B"]];
  var JI_NAMES = ["1:1", "16:15", "9:8", "6:5", "5:4", "4:3", "45:32", "3:2", "8:5", "5:3", "9:5", "15:8"];
  // ---------- practice instruments for the tuner's made-up source ----------
  // Each entry: label, hint (shown under the menu), make(P) -> [[ratio to the reference pitch (band 1), level]], P = {stiff, fund, fref}.
  // Levels are relative (the first, 1/k^1.1, is what the made-up string always used). A ratio of exactly k stands still on band k.
  // Sources (full references in lessons/inharmonicity.qmd):
  //  string     f_k = k f sqrt(1 + B k^2): Fletcher, Blackham & Stratton 1962 JASA 34:749; Fletcher & Rossing 1998 ch. 2.
  //  oldstring  the same, plus a deterministic scatter and a split of every partial into two close frequencies (beats) and damped highs.
  //             The sizes are illustrative: Wolfe (UNSW) and Wikipedia say dirt/grease make strings inharmonic and hard to tune;
  //             Allen 1976 (Catgut Acoustical Soc. Newsletter, via the AUDITORY list) found the damping of high partials changed, not B.
  //  rawbar     free-free uniform bar (Euler-Bernoulli): roots of cos(x)cosh(x) = 1 are 4.7300, 7.8532, 10.9956, 14.1372, so the modes are
  //             (7.8532/4.7300)^2 = 2.756, (10.9956/4.7300)^2 = 5.404, (14.1372/4.7300)^2 = 8.933 times the first (glockenspiel: Rossing 2000).
  //  marimba    undercut bars tuned 1:4:10 (Rossing 2000; patents US5198602, US5902945); measured third modes are often nearer 9 (CCRMA).
  //  xylophone  first overtone tuned to a twelfth, 3:1 (Stanford CCRMA percussion notes; Rossing 2000).
  //  chime      modes 4, 5, 6 of a tube are close to 9^2:11^2:13^2 (about 2:3:4); the strike pitch is the virtual pitch an octave below mode 4
  //             (Rossing 2000 pp. 67-69). Here band 1 is that pitch; nothing sounds there.
  //  bell       a tuned church bell, ratios to the prime (Rossing 2000 pp. 68, 133, as tabulated at en.wikipedia.org/wiki/Strike_tone):
  //             hum .500, prime 1, tierce 1.183, quint 1.506, nominal 2, deciem 2.514, undeciem 2.662, duodeciem 3.011, upper octave 4.166.
  //             Band 1 here is the HUM (so the numbers are those times two).
  //  timpani    air-loaded modes (1,1) (2,1) (3,1) (4,1) in the ratios 2:3:4:5 (Rossing 1996 ASA lay-language paper; Packer 1993 Durham
  //             thesis on air loading); the ear hears a virtual pitch an octave below the (1,1) mode, so band 1 is that pitch and is silent.
  //             The ideal membrane would give the Bessel zeros 3.832 : 5.136 : 6.380 : 7.588 (HyperPhysics circular membrane).
  //  clarinet   a cylinder closed at one end gives odd harmonics only (Wolfe, UNSW clarinet acoustics); mode locking makes them exactly k.
  //  voice      exact harmonics (the vocal folds are a self-sustained oscillator, Fletcher 1978 JASA 64:1566) shaped by two formants,
  //             F1 700 Hz and F2 1100 Hz, an "ah": illustrative round numbers, not a measurement of anyone (Wolfe, UNSW; Sundberg 1987).
  //  brass      a played note: partials locked to exact k (Fletcher 1978); the pedal note k = 1 is weak because the air column has no
  //             resonance there (HyperPhysics brassa; Benade 1976). Against 12-ET the 7th, 11th and 13th are 31, 49 and 41 cents off.
  var INST = {
    string: { label: "Stiff string (the stiffness slider)", hint: "Partial k sounds at k f sqrt(1 + B k^2): use the stiffness slider.", make: function (P) { var r = []; for (var k = 1; k <= 14; k++) r.push([k * Math.sqrt(1 + P.stiff * k * k), 1 / Math.pow(k, 1.1) * (k === 1 ? P.fund : 1)]); return r; } },
    oldstring: { label: "Old, dirty string (scattered, split partials)", hint: "Every partial is stiff-sharp, scattered a few cents and split in two (so it beats), and the highs die quickly. The amounts are illustrative.", make: function (P) { var r = []; for (var k = 1; k <= 8; k++) { var base = k * Math.sqrt(1 + P.stiff * k * k), sc = 4 * Math.sin(2.1 * k + 0.7), d = 3 + 1.2 * k, a = 0.5 / Math.pow(k, 1.1) * Math.exp(-0.12 * (k - 1)) * (k === 1 ? P.fund : 1); r.push([base * Math.pow(2, (sc - d / 2) / 1200), a]); r.push([base * Math.pow(2, (sc + d / 2) / 1200), a]); } return r; } },
    marimba: { label: "Marimba bar (tuned 1 : 4 : 10)", hint: "An undercut bar: the modes at 1, 4 and 10 times the fundamental, so the bands for 4 and 10 stand still.", make: function () { return [[1, 1], [4, 0.35], [10, 0.12]]; } },
    rawbar: { label: "Raw bar (1 : 2.756 : 5.404 : 8.933)", hint: "A plain free bar (a glockenspiel bar): none of its overtones is on a band, so they slide past.", make: function () { return [[1, 1], [2.7565, 0.5], [5.4039, 0.25], [8.9330, 0.12]]; } },
    xylophone: { label: "Xylophone bar (1 : 3)", hint: "The first overtone tuned to a twelfth: the third band stands still.", make: function () { return [[1, 1], [3, 0.5]]; } },
    chime: { label: "Tubular chime (modes 4, 5, 6)", hint: "Band 1 is the strike pitch you hear and nothing sounds there. The three modes lie near 2, 3 and 4 times it, but the third is not quite 4.", make: function () { return [[2, 1], [2 * 121 / 81, 0.8], [2 * 169 / 81, 0.6]]; } },
    bell: { label: "Church bell (hum, prime, tierce, quint, nominal...)", hint: "Band 1 is the hum. The prime and nominal are the second and fourth bands; the tierce (a minor third over the prime) is between bands.", make: function () { return [[1, 0.45], [2, 1], [2 * 1.183, 0.7], [2 * 1.506, 0.6], [4, 0.8], [2 * 2.514, 0.3], [2 * 2.662, 0.25], [2 * 3.011, 0.25], [2 * 4.166, 0.2]]; } },
    timpani: { label: "Timpani (air-loaded 2 : 3 : 4 : 5)", hint: "Band 1 is the pitch you hear, an octave below the loudest mode, and nothing sounds there; the four modes are bands 2 to 5.", make: function () { return [[2, 1], [3, 0.7], [4, 0.45], [5, 0.3]]; } },
    clarinet: { label: "Clarinet (odd harmonics, exactly harmonic)", hint: "Only 1, 3, 5, 7...: the even bands are empty, the odd ones stand still.", make: function () { var r = []; for (var k = 1; k <= 13; k += 2) r.push([k, 1 / k]); return r; } },
    voice: { label: "Voice (harmonic, two formants)", hint: "Every harmonic stands still; their levels follow F1 700 Hz and F2 1100 Hz (an illustrative \"ah\").", make: function (P) { var r = []; for (var k = 1; k <= 14; k++) { var f = k * P.fref, e = 0.12 + 1 / (1 + Math.pow((f - 700) / 130, 2)) + 0.7 / (1 + Math.pow((f - 1100) / 90, 2)); r.push([k, e / k]); } return r; } },
    brass: { label: "Brass, a played note (natural series)", hint: "Exact harmonics with a weak pedal note: they stand still on the bands. Against 12-ET the 7th, 11th and 13th are 31, 49 and 41 cents off.", make: function () { var r = []; for (var k = 1; k <= 12; k++) r.push([k, (k === 1 ? 0.08 : 1 / Math.pow(k, 0.5) * Math.exp(-0.06 * k))]); return r; } }
  };
  var INST_ORDER = ["string", "oldstring", "marimba", "rawbar", "xylophone", "chime", "bell", "timpani", "clarinet", "voice", "brass"];
  SK.INSTRUMENTS = INST;
  SK.partials = function (id, P) { var q = { stiff: 0.0004, fund: 1, fref: 220 }; for (var k in P) q[k] = P[k]; return (INST[id] || INST.string).make(q); };

  function Tuner(host) {
    var w = Base(host, "Strobe tuner"), PD = global.PitchDetect, SV = global.StrobeView;
    w.playLabel = "🎤 Start"; w.playBtn.textContent = w.playLabel; w.playBtn.title = "Ask for the microphone and listen. Stop lets it go.";
    if (!PD || !SV) { w.body.appendChild(el("p", "sk-info", "This widget needs apps/shared/pitch-detect.js and strobe-view.js on the page.")); w.playBtn.disabled = true; return w; }
    var bank = null, fref = 440, last = null, mic = null, demo = null;
    w.noClaim = function () { return w.P.demo === "tap"; };   // listening to the page's sound must not stop the widget that is making it
    function retarget() {
      var d = SV.describe({ note: w.P.note, oct: +w.P.oct, a4: w.P.a4, system: w.P.sys, tonic: w.P.tonic, cents: w.P.cents }, { note: w.c.note.input.selectedOptions[0].textContent, tonic: w.c.tonic.input.selectedOptions[0].textContent });
      fref = d.fref; info.textContent = d.text; var sys = w.P.sys;
      w.c.tonic.el.style.display = sys === "ji" ? "" : "none"; w.c.cents.el.style.display = sys === "cents" ? "" : "none";
      if (bank) bank.setRef(fref);
      if (demo) demo.set();
      w.fref = fref; if (w.redraw) w.redraw();
    }
    w.pick("note", "Note", NOTE_OPTS, "A", null, retarget);
    w.pick("oct", "Octave", [1, 2, 3, 4, 5, 6].map(function (o) { return [String(o), String(o)]; }), "4", null, retarget);
    w.num("a4", { label: "A4", min: 415, max: 466, step: 1, value: 440, fmt: function (v) { return Math.round(v) + " Hz"; }, on: retarget });
    w.pick("sys", "Target tuning", [["12et", "12-ET (the piano)"], ["ji", "Just intonation, over a tonic"], ["31et", "31-ET"], ["cents", "Cents above the note"]], "12et", null, retarget);
    w.pick("tonic", "Tonic", NOTE_OPTS, "C", null, retarget);
    w.num("cents", { label: "Cents above the note", min: -100, max: 700, step: 1, value: 350, fmt: function (v) { return Math.round(v) + " ¢"; }, on: retarget, title: "350 is the neutral third above the note" });
    w.num("bands", { label: "Bands (partials)", min: 1, max: 10, step: 1, value: +host.getAttribute("data-bands") || 6, fmt: function (v) { return String(Math.round(v)); }, on: function () { cv.style.height = Math.max(120, 38 * w.P.bands + 22) + "px"; if (bank) { bank.n = Math.round(w.P.bands); bank.setRef(fref); } w.redraw(); } });
    var dbox = group(w, "Or listen to a made-up string, or to the page's own sound, instead of the microphone");
    w.pick("demo", "Source", [["off", "Microphone"], ["on", "Made-up string or instrument"], ["tap", "This page's sound"]], "off", dbox, function () { showHint(); if (w.running) { w.stop(); w.start(); } });
    w.num("detune", { label: "String is off by", min: -50, max: 50, step: 0.5, value: 0, fmt: function (v) { return (v > 0 ? "+" : "") + v.toFixed(1) + " ¢"; }, on: function () { if (demo) demo.set(); } }, dbox);
    w.pick("inst", "Practice instrument", INST_ORDER.map(function (k) { return [k, INST[k].label]; }), "string", dbox, function () { if (demo) demo.set(); showHint(); });
    var hintP = el("p", "sk-hint"); hintP.style.cssText = "grid-column:1/-1;margin:.1rem 0;font-size:.85rem;color:var(--site-ink-2)"; dbox.appendChild(hintP); function showHint() { hintP.textContent = w.P.demo === "on" ? INST[w.P.inst].hint : ""; }
    w.num("stiff", { label: "Stiffness (inharmonicity B)", min: 0, max: 0.003, step: 0.0001, value: 0.0004, fmt: function (v) { return v.toFixed(4); }, on: function () { if (demo) demo.set(); }, title: "Partial k sounds at k f sqrt(1 + B k^2): a stiff string's upper partials are sharp" }, dbox);
    w.P.fund = 1;
    if (host.hasAttribute("data-fund")) w.num("fund", { label: "Fundamental's strength", min: 0, max: 1, step: 0.01, value: 1, fmt: function (v) { return Math.round(v * 100) + "%"; }, on: function () { if (demo) demo.set(); }, title: "A low guitar string's fundamental is often weak" }, dbox);
    var info = el("p", "sk-info"); w.body.appendChild(info);
    var read = el("div", "sk-tune-read"), rNote = el("span", "sk-tune-note", "—"), rCents = el("span", "sk-tune-cents", ""), rHz = el("span", "sk-tune-hz", "");
    read.appendChild(rNote); read.appendChild(rCents); read.appendChild(rHz); w.body.appendChild(read);
    var cv = el("canvas", "sk-plot"); cv.style.height = Math.max(120, 38 * w.P.bands + 22) + "px"; w.body.appendChild(cv);
    cv.setAttribute("aria-label", "Strobe bands, one row for every partial. A row that stands still is exactly in tune; stripes moving right mean sharp, left flat.");
    var how = el("p", "sk-info", "Press Start and play or sing one steady note. Each row is one partial (row k listens at k times the target pitch). A row whose stripes stand still is exactly on pitch; stripes drifting right are sharp, left are flat, and the faster they go the further off. Rows fade where that partial is weak. The first moment of each note is ignored.");
    w.body.appendChild(how);
    w.setSource = function (s) { w.testSource = s; };   // a test can feed an AudioNode (or a function (ctx) -> node) in place of the microphone
    var fmtC = SV.fmtC;
    var redraw = anim(w, cv, function (C) {
      var q = fit(cv);
      SV.draw(q.g, q.w, q.h, { bands: bank ? bank.read() : [], N: Math.round(w.P.bands), fref: fref, running: w.running, idle: "Press Start (or pick the made-up string) to see the bands move" }, C);
    });
    w.redraw = redraw;
    function onFrame(r) {
      last = r;
      if (r.hz > 0) { rNote.textContent = r.name; rCents.textContent = fmtC(r.cents) + " ¢"; rHz.textContent = r.hz.toFixed(1) + " Hz, " + fmtC(1200 * Math.log(r.hz / fref) / Math.LN2) + " ¢ from the target"; }
      else { rNote.textContent = "—"; rCents.textContent = ""; rHz.textContent = r.rms > 0.004 ? "no clear pitch" : "listening…"; }
    }
    function makeDemo(c, out, tap) {
      var os = [], d = { };
      for (var k = 0; k < 16; k++) (function () {
        var o = c.createOscillator(), g = c.createGain(); g.gain.value = 0; o.connect(g); g.connect(tap); os.push({ o: o, g: g }); o.start();
      })();
      var listen = c.createGain(); listen.gain.value = 0.35; tap.connect(listen); listen.connect(out);
      d.set = function () {
        var f0 = fref * Math.pow(2, w.P.detune / 1200), t = c.currentTime, pl = SK.partials(w.P.inst, { stiff: w.P.stiff, fund: w.P.fund, fref: fref });
        os.forEach(function (p, i) {
          var q = pl[i];
          if (!q) { p.g.gain.setTargetAtTime(0, t, 0.03); return; }
          p.o.frequency.setValueAtTime(Math.min(q[0] * f0, c.sampleRate * 0.45), t); p.g.gain.setTargetAtTime(0.2 * q[1], t, 0.03);
        });
      };
      d.stop = function () { os.forEach(function (p) { try { p.o.stop(); p.o.disconnect(); p.g.disconnect(); } catch (e) {} }); try { listen.disconnect(); } catch (e) {} };
      d.set(); return d;
    }
    w.onStart = function (c, out) {
      var dead = false, tap = null;
      retarget(); last = null; rNote.textContent = "—"; rCents.textContent = ""; rHz.textContent = "starting…";
      bank = PD.strobe(c.sampleRate, fref, { bands: Math.round(w.P.bands) });
      if (w.P.demo === "on") { tap = c.createGain(); demo = makeDemo(c, out, tap); }
      var micCtx = c, src = demo ? tap : (w.testSource || null);
      if (w.P.demo === "tap") {                                        // the page's own sound (audio-tap.js): analysed in the context it lives in
        var es = global.AudioTap ? global.AudioTap.sources() : [], e0 = es.filter(function (x) { return x.ctx === c; })[0] || es[0];
        if (!e0) { info.textContent = "Nothing on this page has made a sound yet."; w.stop(); return function () {}; }
        micCtx = e0.ctx; src = e0.node;
      }
      mic = PD.mic({ ctx: micCtx, a4: w.P.a4, checkOpts: { levelCheck: false }, source: src, onBlock: function (x) { if (bank) bank.process(x); }, onFrame: onFrame });
      mic.start().then(function () { if (dead) { mic.stop(); return; } rHz.textContent = "listening…"; },
        function (e) { if (dead) return; dead = true; rHz.textContent = ""; rNote.textContent = "—"; info.textContent = "Microphone: " + (e && (e.message || e.name) || "not available") + ". Pick “Made-up string” to try the tuner without one."; w.stop(); });
      return function () { dead = true; if (mic) mic.stop(); mic = null; if (demo) demo.stop(); demo = null; bank = null; redraw(); };
    };
    w.state = function () { return { fref: fref, bands: bank ? bank.read() : [], last: last }; };
    retarget();
    return w;
  }

  // ======================================================================================
  // bendboard: a string bend on the neck (LessonDiagrams.bendboard), a gauge and a trace; drag the dot to bend, and a tone follows.
  var BEND_OPEN = [40, 45, 50, 55, 59, 64];                                  // E2 A2 D3 G3 B3 E4, low to high
  var BEND_BOX = [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]];             // A minor pentatonic, box 1
  var BEND_EX = {
    "4to5": ["4 to 5, a whole step: D to E (G string, fret 7)", 3, 7, 200, "E"],
    "b7to1": ["♭7 to the root, a whole step: G to A (B string, fret 8)", 4, 8, 200, "A"],
    "5tob7": ["5 up a step and a half: E to G (B string, fret 5)", 4, 5, 300, "G"],
    "curl": ["The blue third: C curled toward C♯ (high E, fret 8)", 5, 8, 50, ""],
    "b5to5": ["♭5 to 5, a half step: E♭ to E (G string, fret 8)", 3, 8, 100, "E"],
    "4tob5": ["4 to ♭5, a half step: D to E♭ (G string, fret 7)", 3, 7, 100, "E♭"]
  };
  function Bendboard(host) {
    var w = Base(host, "Bend to a target"), LD = global.LessonDiagrams, PD = global.PitchDetect, ROOT_PC = 9, T = 3.6;
    w.playLabel = "▶ Hold the note"; w.playBtn.textContent = w.playLabel;
    if (!LD || !LD.bendboard) { w.body.appendChild(el("p", "sk-info", "This widget needs apps/shared/lessons/diagrams.js on the page.")); w.playBtn.disabled = true; return w; }
    var board = null, bend = 0, engine = null, level = 0.35, pend = true, play = null, micM = null, live = [], midiOn = false, midiAuto = false, dragAuto = false, tTimer = 0;
    function ex() { var e = BEND_EX[w.P.ex]; return { name: e[0], s: e[1], f: e[2], A: e[3], text: e[4] }; }
    function midiOf(s, f) { return BEND_OPEN[s] + f; }
    function f0() { var e = ex(); return 440 * Math.pow(2, (midiOf(e.s, e.f) - 69) / 12); }
    var NM = ["A", "B♭", "B", "C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭"];
    function build() {
      var e = ex(), box = [];
      BEND_BOX.forEach(function (fs, s) { fs.forEach(function (f) { var m = midiOf(s, f); box.push({ string: s, fret: f, text: NM[((m - ROOT_PC) % 12 + 12) % 12], root: m % 12 === ROOT_PC }); }); });
      var m0 = midiOf(e.s, e.f), svg = LD.bendboard({ frets: [4, 10], box: box, shape: w.P.shape, startCents: ((m0 - ROOT_PC) % 12 + 12) % 12 * 100,
        bend: { string: e.s, fret: e.f, amount: e.A, text: e.text } }, { cents: w.P.shape === "prebend" ? e.A : 0 });
      if (board) holder.replaceChild(svg, board.svg); else holder.appendChild(svg);
      board = svg.bb; board.svg = svg; bend = svg.bb.cents;
      svg.style.touchAction = "none";
      var ptr = null;
      board.hit.addEventListener("pointerdown", down); board.dot.addEventListener("pointerdown", down);
      function down(ev) { ev.preventDefault(); if (play || micM) return; ptr = ev.pointerId; try { svg.setPointerCapture(ptr); } catch (x) {} if (!w.running) { dragAuto = true; begin(true); } else if (engine) engine.gate(true); set(board.centsAt(ev.clientX, ev.clientY)); }
      svg.addEventListener("pointermove", function (ev) { if (ptr !== ev.pointerId) return; set(board.centsAt(ev.clientX, ev.clientY)); });
      function up(ev) { if (ptr !== ev.pointerId) return; ptr = null; if (dragAuto) { dragAuto = false; w.stop(); } else if (engine && !holding) engine.gate(false); }
      svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
      board.dot.setAttribute("tabindex", "0"); board.dot.setAttribute("role", "slider"); board.dot.setAttribute("aria-label", "Bend, in cents"); board.dot.setAttribute("aria-valuemin", 0); board.dot.setAttribute("aria-valuemax", 300);
      board.dot.addEventListener("keydown", function (ev) {
        var d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[ev.key]; if (!d) return; ev.preventDefault(); set(bend + d * (ev.shiftKey ? 25 : 5));
      });
      set(bend); if (w.redraw) w.redraw();
    }
    var holding = false;
    // pick, shape, slider
    var ctlRow = w.ctls;
    w.pick("ex", "Bend", Object.keys(BEND_EX).map(function (k) { return [k, BEND_EX[k][0]]; }), "4to5", ctlRow, function () { stopAll(); build(); });
    w.pick("shape", "Shape of the bend", LD.BEND_SHAPES, "bend", ctlRow, function () { stopAll(); build(); });
    var slider = ctl(ctlRow, { label: "Bend (drag the dot, or this)", min: 0, max: 300, step: 1, value: 0, fmt: function (v) { return Math.round(v) + " ¢"; }, on: function (v) { if (!sync) set(v); } });
    w.c.bend = slider; var sync = false;
    w.num("vol", { label: "Volume", min: 0, max: 1, step: 0.01, value: 0.35, fmt: fmtPct, on: function (v) { level = v; if (engine) engine.level(); } }, ctlRow);
    var holder = el("div", "sk-bb"); w.body.appendChild(holder);
    var info = el("p", "sk-info", ""); w.body.appendChild(info);
    var btns = el("div", "sk-presets"); w.body.appendChild(btns);
    function cur() { return play ? play.sh.f(play.t) : ex().A; }
    function readout() {
      var e = ex(), tgt = micM || play ? (micM ? micM.sh : play.sh).f(micM ? micM.t : play.t) : e.A, d = bend - tgt, tx = micM ? "you" : "now";
      info.textContent = "Bend " + Math.round(bend) + "¢, target " + Math.round(tgt) + "¢: " + (Math.abs(d) < 5 ? "on the target." : Math.round(Math.abs(d)) + " cents " + (d < 0 ? "flat" : "sharp") + ".");
      w.off = d;
    }
    function set(c) {
      c = Math.max(0, Math.min(300, c)); bend = c; board.setBend(c); board.dot.setAttribute("aria-valuenow", Math.round(c));
      sync = true; slider.input.value = c; slider.el.querySelector("output").textContent = Math.round(c) + " ¢"; sync = false;
      if (engine) engine.pitch(c); readout();
    }
    w.setBend = set; w.getBend = function () { return bend; };
    function begin(gate) { pend = gate; if (!w.running) w.start(); else if (engine) engine.gate(gate); }
    w.onStart = function (c, out) {
      var o = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(), vg = c.createGain(), on = pend !== false; pend = true;
      g2.gain.value = 0.12; vg.gain.value = 0; o.connect(vg); o2.connect(g2); g2.connect(vg); vg.connect(out); o.start(); o2.start();
      engine = {
        pitch: function (cents, tau) { var f = f0() * Math.pow(2, cents / 1200), t = c.currentTime; o.frequency.setTargetAtTime(f, t, tau || 0.02); o2.frequency.setTargetAtTime(2 * f, t, tau || 0.02); },
        gate: function (on) { vg.gain.setTargetAtTime(on ? level : 0, c.currentTime, on ? 0.01 : 0.06); },
        level: function () { if (vg.gain.value > 0.001) vg.gain.setTargetAtTime(level, c.currentTime, 0.02); }
      };
      var f = f0() * Math.pow(2, bend / 1200); o.frequency.value = f; o2.frequency.value = 2 * f; holding = on && !dragAuto && !play; engine.gate(on);
      return function () { try { o.stop(); o2.stop(); } catch (e) {} engine = null; holding = false; };
    };
    var baseStop = w.stop;
    w.stop = function () { if (play) { play = null; board.setCursor(null); } holding = false; baseStop(); };
    function stopAll() { if (micM) stopListen(); if (play) { play = null; board.setCursor(null); } if (w.running) w.stop(); set(w.P.shape === "prebend" ? ex().A : 0); board.setLive([]); }
    function btn(text, fn, title) { var b = button(btns, text, fn); if (title) b.title = title; return b; }
    btn("Start", function () { oneShot(0); }, "Hear the note you start on");
    btn("Target", function () { oneShot(ex().A); }, "Hear the note the bend is aiming at");
    function oneShot(c) { stopAll(); set(c); var was = w.running; begin(true); if (!was) holding = false; clearTimeout(tTimer); w.byBtn = true; tTimer = setTimeout(function () { if (w.running && !holding0()) w.stop(); }, 1400); }
    function holding0() { return holding; }
    btn("▶ Play the shape", playShape, "The target, bent for you: the dot and the trace follow it");
    function playShape() {
      stopAll(); var sh = LD.bendShape(w.P.shape, ex().A); play = { sh: sh, t: 0, t0: performance.now() };
      begin(false); set(sh.f(0)); board.setLive([]);
      (function tick() {
        if (!play) return; var t = (performance.now() - play.t0) / 1000; play.t = t;
        if (t > sh.T) { w.stop(); set(w.P.shape === "prebend" ? ex().A : 0); return; }
        set(sh.f(t)); board.setCursor(t); if (engine) engine.gate(t >= sh.onset); requestAnimationFrame(tick);
      })();
    }
    w.playShape = playShape;
    var listenB = btn("🎤 Listen and compare", function () { micM ? stopListen() : listen(); }, "Play the bend on your guitar (the first string, standard tuning): your pitch is drawn over the target");
    function stopListen() {
      if (!micM) return; var m = micM; micM = null; m.m.stop(); board.setCursor(null); listenB.classList.remove("sk-on"); listenB.textContent = "🎤 Listen and compare";
    }
    function listen() {
      stopAll(); live = []; board.setLive(live); var sh = LD.bendShape(w.P.shape, ex().A), t0 = performance.now(), base = f0();
      micM = { sh: sh, t: 0 }; set(w.P.shape === "prebend" ? ex().A : 0);
      micM.m = PD.mic({ ctx: ac(), source: w.testSource || null, onFrame: function (r) {
        if (!micM) return; var t = Math.max(0, (performance.now() - t0) / 1000 - (micM.m && micM.m.check && global.AudioCheck ? global.AudioCheck.latencySec(micM.m.check) : 0)); micM.t = Math.min(t, sh.T);
        if (r.hz > 0) { var c = 1200 * Math.log(r.hz / base) / Math.LN2; c -= 1200 * Math.round(c / 1200); live.push([t, c]); set(Math.max(0, c)); } else live.push([t, null]);
        board.setLive(live); board.setCursor(micM.t); readout();
        if (t > sh.T + 0.2) stopListen();
      } });
      listenB.classList.add("sk-on"); listenB.textContent = "■ Stop listening"; info.textContent = "Listening… play the note now. The trace runs for " + T + " seconds.";
      micM.m.start().then(function () { t0 = performance.now(); }, function (e) { stopListen(); info.textContent = "Microphone: " + (e && (e.message || e.name) || "not available") + ". You can still drag the dot and use “Play the shape”."; });
    }
    w.setSource = function (s) { w.testSource = s; };
    w.listen = listen; w.stopListen = stopListen; w.live = function () { return live; };
    var midiB = btn("MIDI wheel", connectMidi, "Use a MIDI keyboard's pitch wheel or mod wheel as the bend");
    function onMidi(ev) {
      var d = ev.data, cmd = d[0] & 0xf0, c = null;
      if (cmd === 0xe0) c = Math.max(0, ((d[2] << 7 | d[1]) - 8192) / 8191) * 300; else if (cmd === 0xb0 && d[1] === 1) c = d[2] / 127 * 300;
      if (c == null || play || micM) return;
      if (c > 1 && !w.running) { midiAuto = true; begin(true); } set(c);
      if (c <= 1 && midiAuto) { midiAuto = false; w.stop(); }
    }
    w.onMidi = onMidi;
    function connectMidi() {
      if (!navigator.requestMIDIAccess) { midiB.textContent = "No MIDI in this browser"; return; }
      navigator.requestMIDIAccess().then(function (a) {
        var seen = [];
        function bind() { var names = []; a.inputs.forEach(function (i) { if (seen.indexOf(i.id) < 0) { seen.push(i.id); i.addEventListener("midimessage", onMidi); } names.push(i.name); }); midiB.textContent = names.length ? "MIDI wheel: " + names[0] : "MIDI wheel: plug in a keyboard"; midiB.classList.toggle("sk-on", names.length > 0); }
        a.onstatechange = bind; bind();
      }, function () { midiB.textContent = "MIDI blocked"; });
    }
    build();
    return w;
  }

  // ======================================================================================
  // The bar at the foot of the page: volume, keys, MIDI, microphone, stop.
  var KEYMAP = "awsedftgyhujkolp;'";
  var bar = { target: function () {}, mic: function () {} };
  function makeBar() {
    var b = el("div", "sk-bar"); b.id = "sk-bar";
    var v = el("label", "sk-bl"); v.appendChild(el("span", null, "Volume ")); var vr = el("input"); vr.type = "range"; vr.min = 0; vr.max = 1; vr.step = .01; vr.value = vol; v.appendChild(vr); b.appendChild(v);
    vr.addEventListener("input", function () { vol = +vr.value; try { localStorage.setItem("sk-vol", vol); } catch (e) {} if (masterIn) masterIn.gain.setTargetAtTime(vol, ctx.currentTime, .02); });
    var oct = 4, octL = el("span", "sk-bl"), down = button(b, "z ◀", function () { setOct(oct - 1); }), up;
    b.appendChild(octL); up = button(b, "▶ x", function () { setOct(oct + 1); });
    down.title = "Octave down (z)"; up.title = "Octave up (x)";
    function setOct(o) { oct = Math.max(1, Math.min(7, o)); octL.textContent = "Keys from C" + oct; drawKeys(); }
    var kb = button(b, "⌨ Keyboard", function () { kbd.hidden = !kbd.hidden; kb.classList.toggle("sk-on", !kbd.hidden); });
    var midiB = button(b, "MIDI", function () { connectMidi(); }); midiB.title = "Use a MIDI keyboard";
    var micB = button(b, "🎤 Mic", function () { if (micStream) SK.micOff(); else SK.mic().catch(function (e) { tgt.textContent = "Microphone: " + (e.message || e.name); }); }); micB.title = "Turn the microphone on or off. Use headphones, or it will feed back.";
    var tgt = el("span", "sk-bl sk-tgt", "Click a synth, then play a w s e d f…"); b.appendChild(tgt);
    button(b, "■ Stop", function () { if (cur) cur.stop(); widgets.forEach(function (w) { if (w.running) w.stop(); }); }, "btn-outline-danger");
    var kbd = el("div", "sk-kbd"); kbd.hidden = true; b.appendChild(kbd);
    function drawKeys() {
      kbd.innerHTML = ""; var base = 12 * (oct + 1);
      for (var m = base; m <= base + 24; m++) (function (m) {
        var black = [1, 3, 6, 8, 10].indexOf(m % 12) >= 0, k = el("button", "sk-key" + (black ? " sk-blk" : "")); k.type = "button"; k.setAttribute("aria-label", noteName(m)); k.dataset.m = m;
        if (m % 12 === 0) k.textContent = "C" + (Math.floor(m / 12) - 1);
        k.addEventListener("pointerdown", function (e) { e.preventDefault(); k.setPointerCapture && k.releasePointerCapture(e.pointerId); noteOn(m, .8); k.classList.add("sk-down"); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { k.addEventListener(ev, function () { if (k.classList.contains("sk-down")) { k.classList.remove("sk-down"); noteOff(m); } }); });
        kbd.appendChild(k);
      })(m);
    }
    setOct(4);
    var down2 = {};
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return; var t = e.target; if (t && (t.tagName === "SELECT" || (t.tagName === "INPUT" && t.type !== "range" && t.type !== "checkbox") || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      var k = e.key.toLowerCase(); if (k === "z") { setOct(oct - 1); return; } if (k === "x") { setOct(oct + 1); return; }
      var i = KEYMAP.indexOf(k); if (i < 0 || !target) return; e.preventDefault(); var m = 12 * (oct + 1) + i; down2[k] = m; noteOn(m, .8);
    });
    document.addEventListener("keyup", function (e) { var k = e.key.toLowerCase(); if (down2[k] != null) { noteOff(down2[k]); delete down2[k]; } });
    function connectMidi() {
      if (!navigator.requestMIDIAccess) { midiB.textContent = "No MIDI in this browser"; return; }
      navigator.requestMIDIAccess().then(function (a) {
        function bind() { var names = []; a.inputs.forEach(function (i) { i.onmidimessage = msg; names.push(i.name); }); midiB.textContent = names.length ? "MIDI: " + names[0] : "MIDI: plug in a keyboard"; midiB.classList.toggle("sk-on", names.length > 0); }
        a.onstatechange = bind; bind(); try { localStorage.setItem("sk-midi", "1"); } catch (e) {}
      }, function () { midiB.textContent = "MIDI blocked"; });
    }
    function msg(e) { var d = e.data, cmd = d[0] & 0xf0; if (cmd === 0x90 && d[2] > 0) noteOn(d[1], d[2] / 127); else if (cmd === 0x80 || cmd === 0x90) noteOff(d[1]); }
    try { if (localStorage.getItem("sk-midi") === "1" && navigator.permissions) navigator.permissions.query({ name: "midi" }).then(function (p) { if (p.state === "granted") connectMidi(); }, function () {}); } catch (e) {}
    bar.target = function (t) { tgt.textContent = "Keys play: " + t; };
    bar.mic = function (on) { micB.classList.toggle("sk-on", on); micB.textContent = on ? "🎤 Mic on" : "🎤 Mic"; };
    document.body.appendChild(b); document.body.classList.add("sk-has-bar");
  }
  function noteOn(m, v) { if (!target) { var first = widgets.filter(function (w) { return w.noteOn; })[0]; if (first) setTarget(first); } if (target) target.noteOn(m, v); }
  function noteOff(m) { if (target && target.noteOff) target.noteOff(m); }

  var KINDS = { series: Series, interval: Interval, additive: Additive, wave: Wave, noise: Noise, filter: Filter, lfo: Lfo, subtractive: Subtractive, fm: Fm, wavetable: Wavetable, distortion: Distortion, compressor: Compressor, chorus: Chorus, phaser: Phaser, reverb: Reverb, delay: Delay, glitch: Glitch, envelope: Envelope, granular: Granular, eq: Eq, sidechain: Sidechain, gate: Gate, transient: Transient, tremolo: Tremolo, rotary: Rotary, octaver: Octaver, harmonizer: Harmonizer, autotune: AutoTune, stereo: Stereo, chain: Chain, shimmer: Shimmer, vocoder: Vocoder, tuner: Tuner, bendboard: Bendboard };
  function init() {
    if (!global.SK_NO_BAR) makeBar();
    Array.prototype.forEach.call(document.querySelectorAll("div.sk[data-w]"), function (host) {
      var K = KINDS[host.getAttribute("data-w")]; if (!K) { host.textContent = "Unknown widget: " + host.getAttribute("data-w"); return; }
      try { var w = K(host); w.kind = host.getAttribute("data-w"); applyAttrs(w); } catch (e) { console.error(e); host.textContent = "This widget failed to load: " + e.message; }
    });
    requestAnimationFrame(frame);
  }
  SK.widgets = widgets; SK.ac = ac; SK.cents = cents; SK.seriesAbc = seriesAbc; SK.noteOn = noteOn; SK.noteOff = noteOff;
  global.SynthKit = SK;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
