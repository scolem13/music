// synth-kit.js — the sound-design lessons (synthesis and effects). Every <div class="sk" data-w="..."> on a page
// becomes a widget: a card with its controls, a ▶ button, an oscilloscope and a spectrum. Kinds (data-w):
//   series      the harmonic series of a chosen note, written out (abcjs, transposed with AbcTranspose) with cents
//   additive    sixteen harmonic sliders: Fourier synthesis, with presets for the classic waves
//   wave        one oscillator: sine, triangle, sawtooth, square, pulse with PWM
//   noise       white, pink and brown noise, and sounds made from it
//   filter lfo subtractive fm wavetable          synthesis
//   distortion compressor chorus phaser reverb   effects (each with a source picker: riff, drums, mic, your keys...)
//   vocoder     a mic (or the robot voice) shaping a synth played from the keys or MIDI
// Optional attributes: data-title, data-source (an effect's starting source), data-set="key=value,key=value"
// (starting control values), data-preset (a preset's name).
// One widget sounds at a time. A bar fixed at the foot of the page has the volume, the computer keyboard
// (a w s e d f t g y h u j k: one octave from C; z and x move the octave), an on-screen keyboard, MIDI and the
// microphone; notes go to the widget last touched. Everything goes through a limiter so nothing can blast.
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

  // ---------- sources for the effects ----------
  var SOURCES = { riff: "Synth riff", chords: "Chords", drums: "Drum loop", hits: "Single hits", voice: "Robot voice", tone: "Sine tone", noise: "White noise", uneven: "Uneven riff", keys: "Your keyboard", mic: "Microphone" };
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
      micP = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
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
      if (w.running) return; var c = ac(); claim(w);
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
      makeSource(mine, c).then(function (s) { if (!w.running || w.c.source.value !== mine) { s.stop(); return; } src = s; s.out.connect(bus); w.status.textContent = mine === "mic" ? "Microphone on. Use headphones." : mine === "keys" ? "Play the computer keys, the keyboard below or MIDI." : ""; },
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
    w.pick("shape", "Curve", [["soft", "Soft clip (overdrive)"], ["hard", "Hard clip (fuzz)"], ["asym", "Uneven (tube-like)"], ["fold", "Wavefolder"], ["crush", "Bit crusher"]], "soft");
    w.num("drive", { label: "Drive", min: 1, max: 60, log: true, value: 4, fmt: function (v) { return "×" + v.toFixed(1); } });
    w.num("tone", { label: "Tone (low-pass after)", min: 500, max: 16000, log: true, value: 8000, fmt: fmtHz });
    w.num("level", { label: "Output level", min: 0, max: 1.5, step: .01, value: .6, fmt: fmtPct });
    function fn(x) { var d = w.P.drive, s = w.P.shape;
      if (s === "soft") return Math.tanh(d * x);
      if (s === "hard") return Math.max(-.6, Math.min(.6, d * x)) / .6;
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
      var sh = c.createWaveShaper(), lp = c.createBiquadFilter(), lv = c.createGain(), inp = c.createGain(); sh.curve = curve(); sh.oversample = "4x"; lp.frequency.value = w.P.tone; lv.gain.value = w.P.level;
      inp.connect(sh); sh.connect(lp); lp.connect(lv); w.n = { sh: sh, lp: lp, lv: lv };
      return { input: inp, output: lv };
    };
    w.apply = function (k, v) { if (!w.n) return; var t = ac().currentTime; if (k === "shape" || k === "drive") w.n.sh.curve = curve(); if (k === "tone") w.n.lp.frequency.setTargetAtTime(v, t, .01); if (k === "level") w.n.lv.gain.setTargetAtTime(v, t, .01); };
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

  // ---------- reverb ----------
  function Reverb(host) {
    var w = Fx(host, "Reverb", "hits", .35);
    w.presets([
      { name: "Small room", set: { decay: .5, pre: 3, damp: 5000, early: .6, size: .25, reverse: "0" } },
      { name: "Hall", set: { decay: 2.2, pre: 20, damp: 6000, early: .4, size: .8, reverse: "0" } },
      { name: "Cathedral", set: { decay: 6, pre: 40, damp: 3000, early: .3, size: 1, reverse: "0" } },
      { name: "Plate", set: { decay: 1.8, pre: 0, damp: 12000, early: 0, size: .4, reverse: "0" } },
      { name: "Reverse", set: { decay: 1.5, pre: 0, damp: 8000, early: 0, size: .5, reverse: "1" } }
    ]);
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
      for (var ch = 0; ch < 2; ch++) {
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

  var KINDS = { series: Series, additive: Additive, wave: Wave, noise: Noise, filter: Filter, lfo: Lfo, subtractive: Subtractive, fm: Fm, wavetable: Wavetable, distortion: Distortion, compressor: Compressor, chorus: Chorus, phaser: Phaser, reverb: Reverb, vocoder: Vocoder };
  function init() {
    makeBar();
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
