// pitch-detect.js — pitch from a microphone, shared by the Tune Assessment, the lesson tuner and the bendboard.
// A plain global (window.PitchDetect) that also loads under node (module.exports) for the tests.
//
//   PitchDetect.detect(buf, sr[, o]) -> Hz, or -1 when the sound is too quiet or has no clear pitch.
//        YIN (de Cheveigne and Kawahara 2002) on a Float32Array. The constants are the Tune Assessment's own:
//        RMS_GATE .012, YIN_THRESHOLD .15, FMIN 70, FMAX 1500 (o.fmin / o.fmax / o.gate / o.threshold override them).
//   PitchDetect.rms(buf), PitchDetect.hzToMidi(hz, a4), PitchDetect.midiToHz(m, a4), PitchDetect.noteName(m)
//   PitchDetect.analyse(hz, a4) -> { midi (nearest, whole), cents (from that note), name, hz }
//   PitchDetect.mic(o) -> { start() -> Promise, stop(), running }   the microphone helper.
//        o { onFrame({hz, cents, midi, name, rms}) (about every 40 ms; hz = -1 when there is no pitch),
//            onBlock(samples, n0, sr) (every raw block, n0 = index of its first sample since start: unbroken, for phase work),
//            a4 (440), source (an AudioNode, or a function (ctx) -> AudioNode; used in place of the microphone, for tests),
//            ctx (an AudioContext to share), onError(err) }
//        The permission prompt appears only when start() is called; stop() releases the microphone.
//        Works through a ScriptProcessor (the only way to get every sample on the main thread without a worklet file).
//   PitchDetect.strobe(sr, fref, o) -> a bank of quadrature demodulators, one per partial k (see StrobeBank below).
//   PitchDetect.noteMidi("C#", 4) -> 61;  PitchDetect.parseNote(name) -> { pc, s31, letter, acc }
//   PitchDetect.refFreq(spec) -> Hz   the pitch a tuner aims at, in 12-ET, 5-limit just intonation, 31-ET or "cents above".
(function (global) {
  var RMS_GATE = 0.012, YIN_THRESHOLD = 0.15, FMIN = 70, FMAX = 1500;

  function rms(buf) { var s = 0, n = buf.length; for (var i = 0; i < n; i++) s += buf[i] * buf[i]; return Math.sqrt(s / n); }

  // YIN. The body is the Tune Assessment's original, kept line for line.
  function detect(buf, sr, o) {
    o = o || {}; var gate = o.gate != null ? o.gate : RMS_GATE, thr = o.threshold != null ? o.threshold : YIN_THRESHOLD,
        fmin = o.fmin != null ? o.fmin : FMIN, fmax = o.fmax != null ? o.fmax : FMAX;
    var SIZE = buf.length, W = Math.floor(SIZE / 2), r = 0;
    for (var i = 0; i < SIZE; i++) r += buf[i] * buf[i]; r = Math.sqrt(r / SIZE); if (r < gate) return -1;
    var d = new Float32Array(W);
    for (var tau = 1; tau < W; tau++) { var s = 0; for (var j = 0; j < W; j++) { var df = buf[j] - buf[j + tau]; s += df * df; } d[tau] = s; }
    var c = new Float32Array(W); c[0] = 1; var run = 0;
    for (tau = 1; tau < W; tau++) { run += d[tau]; c[tau] = run > 0 ? d[tau] * tau / run : 1; }
    tau = -1; for (var t = 2; t < W; t++) { if (c[t] < thr) { while (t + 1 < W && c[t + 1] < c[t]) t++; tau = t; break; } }
    if (tau === -1) return -1;
    var bt = tau; if (tau > 0 && tau < W - 1) { var s0 = c[tau - 1], s1 = c[tau], s2 = c[tau + 1], dn = 2 * (2 * s1 - s2 - s0); if (dn) bt = tau + (s2 - s0) / dn; }
    var f0 = sr / bt; return (f0 < fmin || f0 > fmax) ? -1 : f0;
  }

  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function midiToHz(m, a4) { return (a4 || 440) * Math.pow(2, (m - 69) / 12); }
  function hzToMidi(hz, a4) { return 69 + 12 * Math.log(hz / (a4 || 440)) / Math.LN2; }
  function noteName(m) { return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function analyse(hz, a4) {
    if (!(hz > 0)) return null;
    var m = hzToMidi(hz, a4), n = Math.round(m); return { hz: hz, midi: n, cents: (m - n) * 100, name: noteName(n) };
  }

  // ---------- what a tuner aims at ----------
  // 5-limit just intonation, by semitones above the tonic.
  var JI = [[1, 1], [16, 15], [9, 8], [6, 5], [5, 4], [4, 3], [45, 32], [3, 2], [8, 5], [5, 3], [9, 5], [15, 8]];
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // "C", "F#", "Bb", "C♯", "E♭" -> { pc (0-11), s31 (the step of C D E F G A B in 31-ET, with a sharp or flat moving 2 steps) }
  var S31 = { C: 0, D: 5, E: 10, F: 13, G: 18, A: 23, B: 28 };
  function parseNote(name) {
    var m = /^([A-Ga-g])([#♯b♭]*)$/.exec(String(name).trim()); if (!m) return null;
    var L = m[1].toUpperCase(), pc = PC[L], st = S31[L];
    m[2].split("").forEach(function (a) { var up = a === "#" || a === "♯"; pc += up ? 1 : -1; st += up ? 2 : -2; });
    return { pc: ((pc % 12) + 12) % 12, s31: st, letter: L, acc: pc - PC[L] };
  }
  // spec { note: "A", oct: 4, a4: 440, system: "12et" | "ji" | "31et" | "cents", tonic: "C" (ji), cents: 350 (cents) }
  //   12et   the equal-tempered pitch of the note.
  //   ji     the note as a ratio over the nearest tonic below it (the tonic itself equal-tempered from A4).
  //   31et   the note's step in 31 equal divisions of the octave, with A4 the anchor.
  //   cents  the note's 12-ET pitch raised by `cents` (350 above A3 is the neutral third).
  function refFreq(spec) {
    var a4 = spec.a4 || 440, p = parseNote(spec.note || "A"), oct = spec.oct == null ? 4 : spec.oct, sys = spec.system || "12et";
    if (!p) return NaN;
    // the MIDI number (an accidental that wraps, like B# or Cb, moves the octave)
    var midi = 12 * (oct + 1) + PC[p.letter] + p.acc;
    if (sys === "31et") { var step = 31 * (oct + 1) + p.s31, stepA4 = 31 * 5 + S31.A; return a4 * Math.pow(2, (step - stepA4) / 31); }
    if (sys === "ji") {
      var t = parseNote(spec.tonic || "C"); if (!t) return NaN;
      var tm = midi - (((midi - t.pc) % 12) + 12) % 12, iv = midi - tm, r = JI[iv];
      return midiToHz(tm, a4) * r[0] / r[1];
    }
    var f = midiToHz(midi, a4);
    return sys === "cents" ? f * Math.pow(2, (+spec.cents || 0) / 1200) : f;
  }
  function noteMidi(name, oct) { var p = parseNote(name); return p ? 12 * ((oct == null ? 4 : oct) + 1) + PC[p.letter] + p.acc : NaN; }
  function jiCents(iv) { var r = JI[iv]; return 1200 * Math.log(r[0] / r[1]) / Math.LN2; }

  // ---------- the strobe: quadrature demodulation, one band for every partial ----------
  // Band k is tuned to k * fref. The signal is multiplied by cos and sin at that frequency and averaged (two one-pole
  // low-passes in a row, each of time constant tau). A partial at exactly k * fref gives a steady complex number, so its phase stands
  // still; a partial df Hz sharp gives one that turns df times a second (counter-clockwise: the stripes move right),
  // a flat one the other way. The attack is ignored: after the sound passes the gate, nothing is shown for attackMs.
  // bank.process(block) feeds samples; bank.read() -> [{ k, f, mag (amplitude), phase (radians), driftHz, cents, alive }].
  function StrobeBank(sr, fref, o) {
    o = o || {};
    var B = { sr: sr, fref: fref, n: o.bands || 6, tau: o.tau || 0.05, attackMs: o.attackMs != null ? o.attackMs : 100,
              gate: o.gate != null ? o.gate : 0.004, n0: 0, state: "silent", since: 0, quiet: 0, smooth: o.smooth || 0.15 };
    B.bands = [];
    function reset() {
      B.bands = []; for (var k = 1; k <= B.n; k++) B.bands.push({ k: k, f: k * B.fref, re: 0, im: 0, re1: 0, im1: 0, mag: 0, phase: 0, prev: null, driftHz: 0, cents: 0, alive: false });
    }
    reset();
    B.setRef = function (f) { B.fref = f; reset(); B.state = "silent"; };
    B.process = function (x) {
      var n = x.length, alpha = 1 - Math.exp(-1 / (B.tau * sr)), dt = n / sr, r = rms(x), i, k, b;
      if (r >= B.gate) {
        B.quiet = 0;
        if (B.state === "silent") { B.state = "attack"; B.since = B.n0; }
      } else if (B.state !== "silent") {
        B.quiet += n; if (B.quiet > 0.15 * sr) { B.state = "silent"; reset(); }
      }
      if (B.state === "attack" && (B.n0 + n - B.since) / sr * 1000 >= B.attackMs) {
        B.state = "live";                               // the attack is over: start from nothing, so it does not leak in
        // (the block that straddles the end is used whole; the integrators below start from zero for it)
        reset();
      }
      if (B.state === "live") {
        var SUB = 128;                                       // the phase is read every 128 samples, so a drift of up to about 170 Hz can be followed
        for (k = 0; k < B.n; k++) {
          b = B.bands[k]; var fk = b.f, re = b.re, im = b.im, re1 = b.re1, im1 = b.im1, turn = 0, span = 0, last = 0;
          for (i = 0; i < n; i++) {
            var cyc = (fk * (B.n0 + i) / sr) % 1, a = 2 * Math.PI * cyc, v = x[i];
            re1 += alpha * (v * Math.cos(a) - re1); im1 += alpha * (-v * Math.sin(a) - im1);   // first low-pass
            re += alpha * (re1 - re); im += alpha * (im1 - im);                                  // and a second: the other partials are 80 dB down
            if ((i + 1) % SUB === 0 || i === n - 1) {
              var m2 = 2 * Math.sqrt(re * re + im * im), th = Math.atan2(im, re);
              if (m2 > 1e-4) {
                if (b.prev != null) { var d = th - b.prev; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); turn += d; span += i + 1 - last; }
                b.prev = th;
              } else b.prev = null;
              last = i + 1;
            }
          }
          b.re = re; b.im = im; b.re1 = re1; b.im1 = im1; b.mag = 2 * Math.sqrt(re * re + im * im); b.phase = Math.atan2(im, re);
          if (b.mag > 1e-4) {
            if (span > 0) {
              var inst = turn / (2 * Math.PI * span / sr), w = 1 - Math.exp(-dt / B.smooth);
              b.driftHz += w * (inst - b.driftHz);
              b.cents = 1200 * Math.log((fk + b.driftHz) / fk) / Math.LN2;
            }
            b.alive = true;
          } else b.alive = false;
        }
      }
      B.n0 += n;
    };
    B.read = function () { return B.state === "live" ? B.bands : B.bands.map(function (b) { return { k: b.k, f: b.f, mag: 0, phase: 0, driftHz: 0, cents: 0, alive: false }; }); };
    return B;
  }

  // ---------- the microphone ----------
  function mic(o) {
    o = o || {}; var M = { running: false }, ctx = null, stream = null, src = null, sp = null, mute = null, ring = null, wp = 0, filled = 0, n0 = 0, lastFrame = 0, ownCtx = false;
    var SIZE = 2048, a4 = o.a4 || 440;
    M.setA4 = function (v) { a4 = v; };
    M.start = function () {
      if (M.running) return Promise.resolve(M);
      var node;
      function wire(s) {
        src = s; sp = ctx.createScriptProcessor(1024, 1, 1); mute = ctx.createGain(); mute.gain.value = 0;
        ring = new Float32Array(SIZE); wp = 0; filled = 0; n0 = 0; lastFrame = 0;
        sp.onaudioprocess = function (e) {
          var d = e.inputBuffer.getChannelData(0), i;
          if (o.onBlock) o.onBlock(d, n0, ctx.sampleRate);
          n0 += d.length;
          for (i = 0; i < d.length; i++) { ring[wp] = d[i]; wp = (wp + 1) % SIZE; } filled = Math.min(SIZE, filled + d.length);
          if (o.onFrame && filled >= SIZE && n0 - lastFrame >= 0.04 * ctx.sampleRate) {
            lastFrame = n0;
            var win = new Float32Array(SIZE); for (i = 0; i < SIZE; i++) win[i] = ring[(wp + i) % SIZE];
            var hz = detect(win, ctx.sampleRate), r = rms(win), a = hz > 0 ? analyse(hz, a4) : null;
            // o.floorDb: ignore frames quieter than this (our own output bleeding in); o.hold(): true while a reference sounds
            if ((o.floorDb != null && r > 0 && 20 * Math.log10(r) < o.floorDb) || (o.hold && o.hold())) { hz = 0; a = null; r = 0; }
            o.onFrame({ hz: hz, cents: a ? a.cents : 0, midi: a ? a.midi : null, name: a ? a.name : "", rms: r, t: ctx.currentTime - (M.check && global.AudioCheck ? global.AudioCheck.latencySec(M.check) : 0) });
          }
        };
        s.connect(sp); sp.connect(mute); mute.connect(ctx.destination);
        M.running = true; M.ctx = ctx; return M;
      }
      if (!ctx) {
        if (o.ctx) ctx = o.ctx; else { var A = global.AudioContext || global.webkitAudioContext; if (!A) return Promise.reject(new Error("This browser has no Web Audio.")); ctx = new A(); ownCtx = true; }
      }
      var resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
      if (o.source) {
        return resume.then(function () { return wire(typeof o.source === "function" ? o.source(ctx) : o.source); });
      }
      if (!global.navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        return Promise.reject(new Error("This browser can't open a microphone here (it needs https or localhost)."));
      // AudioCheck (audio-check.js), when the page loads it: one pre-flight per session; cancelled or o.check === false -> plain constraints.
      var strict = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
      var pre = (o.check !== false && global.AudioCheck) ? global.AudioCheck.ensure(o.checkOpts || {}).catch(function () { return null; }) : Promise.resolve(null);
      return pre.then(function (r) { M.check = r; return navigator.mediaDevices.getUserMedia({ audio: Object.assign({}, r && r.constraints, strict) }); })
        .then(function (s) { stream = s; return resume; }).then(function () { return wire(ctx.createMediaStreamSource(stream)); })
        .catch(function (e) { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } throw e; });
    };
    M.stop = function () {
      M.running = false;
      try { if (sp) { sp.onaudioprocess = null; sp.disconnect(); } if (src && !o.source) src.disconnect(); else if (src && sp) { try { src.disconnect(sp); } catch (e) {} } if (mute) mute.disconnect(); } catch (e) {}
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      sp = src = mute = null;
      if (ownCtx && ctx) { try { ctx.close(); } catch (e) {} ctx = null; ownCtx = false; }
    };
    return M;
  }

  var API = { detect: detect, rms: rms, hzToMidi: hzToMidi, midiToHz: midiToHz, noteName: noteName, analyse: analyse, mic: mic,
              strobe: StrobeBank, refFreq: refFreq, parseNote: parseNote, noteMidi: noteMidi, JI: JI, jiCents: jiCents,
              RMS_GATE: RMS_GATE, YIN_THRESHOLD: YIN_THRESHOLD, FMIN: FMIN, FMAX: FMAX };
  global.PitchDetect = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
