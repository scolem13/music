// live-kit.js — the Live Sound lessons: one input channel of a Behringer X32, top to bottom, playing "problem" audio.
// Every <div class="lk" data-w="strip"> becomes a channel strip:
//   CONFIG/PREAMP  Gain (-12..+60 dB) with the X32's input meter (-54 .. clip, a latching CLIP light), polarity, Low Cut (on,
//                  20-400 Hz, 12/18/24 dB/oct)
//   GATE           on, mode EXP2 EXP3 EXP4 GATE, Threshold (-80..0), Range (3-60 dB), Attack (0-120 ms), Hold (0.02-2000 ms),
//                  Release (5-4000 ms), a gain-reduction meter
//   EQUALIZER      on, four bands (Low, Lo Mid, Hi Mid, High), each Type (LCut LShv PEQ VEQ HShv HCut), Freq, Gain (+/-15), Q (10-0.3),
//                  with the curve drawn over a live spectrum
//   DYNAMICS       on, Threshold (-60..0), Ratio (the X32's twelve), Knee (0-5), Attack, Hold, Release, makeup Gain (0-24),
//                  detector PEAK/RMS, position PRE/POST EQ, a gain-reduction meter
//   FADER          mute, fader (-oo..+10 dB on the X32's own fader law), output meter
// Ranges are the X32's (Maillot, Unofficial X32/M32 OSC Remote Protocol; X32 User Manual). The DSP is ours: RBJ biquads, a gate and
// a feed-forward compressor (Giannoulis et al.) in an AudioWorklet. VEQ is drawn as a PEQ whose Q narrows as the gain grows (an
// approximation; Behringer doesn't document it). Knee n = a soft knee 2n dB wide (also ours).
// Sources (generated, no samples; seeded so they are the same every time; each peaks at -12 dBFS when Gain = its "right" gain):
//   speech  a quiet talker at a podium            (gain)        vocal  lead vocal, soft verse, belted chorus  (compression)
//   kick    kick mic with snare / hat / crash bleed (gate)      bass   bass DI with popped notes              (compression)
//   toms    rack tom mic: fills, ring, cymbal bleed (gate)      mud    vocal on a boomy mic, rumble, thumps   (low cut + EQ)
//   guitar  electric guitar, harsh 3 kHz and fizz  (EQ)
// Attributes: data-source, data-show (sections shown: any of pre gate eq dyn fader; default all), data-set="key=value,..."
// (keys = the P object below, e.g. gain=20,gate=1,gthr=-30,e2g=-6), data-tries="Label:key=v,key=v;Label2:..." (buttons),
// data-goal (gain | gate | comp | eq | auto = the source's own; a "Check my channel" button), data-sources="kick,toms" (the menu),
// data-quiz (a mystery problem: the source is hidden, everything starts flat; say what is wrong, then fix it).
// The worklet plays the source itself, so it knows where the hits and the bleed are and measures the gate and the compressor
// there (host.lk.stats). Test hooks: host.lk = { set(k, v), P, stats, meters, check(), play(), stop(), source }.
// One strip sounds at a time. Output: a volume slider (localStorage lk-vol), then a limiter, so nothing can blast.
// "⤓ WAV" saves 32 s of the raw source (stereo, 16-bit) to play through a real desk.
(function () {
  "use strict";
  var SR = 44100, AC = window.AudioContext || window.webkitAudioContext, ctx = null, master = null, outVol = null, modP = null, current = null;
  var vol = 0.6; try { vol = +(localStorage.getItem("lk-vol") || 0.6); } catch (e) {}
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function db2g(d) { return Math.pow(10, d / 20); }
  function g2db(g) { return 20 * Math.log10(Math.max(g, 1e-9)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmtDb(v, d) { if (!isFinite(v) || v < -150) return "−∞"; return (v > 0 ? "+" : "") + v.toFixed(d == null ? 1 : d).replace("-", "−"); }
  function fmtHz(v) { return v < 1000 ? Math.round(v) + " Hz" : (v / 1000).toFixed(v < 10000 ? 2 : 1) + " kHz"; }
  function fmtMs(v) { return v < 1 ? v.toFixed(2) + " ms" : v < 1000 ? (v < 10 ? v.toFixed(1) : Math.round(v)) + " ms" : (v / 1000).toFixed(2) + " s"; }

  // ---------- the DSP shared by the worklet and the curve drawing ----------
  function LIB() {
    function biq(type, f, q, g, sr) {
      var A = Math.pow(10, g / 40), w = 2 * Math.PI * Math.min(Math.max(f, 5), sr * 0.45) / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q), b0, b1, b2, a0, a1, a2, s2;
      if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
      else if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
      else if (type === "hp1") { var k = Math.tan(w / 2); return [1 / (1 + k), -1 / (1 + k), 0, (k - 1) / (k + 1), 0]; }
      else if (type === "ls") { s2 = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cs + s2); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - s2); a0 = (A + 1) + (A - 1) * cs + s2; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - s2; }
      else if (type === "hs") { s2 = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + s2); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - s2); a0 = (A + 1) - (A - 1) * cs + s2; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - s2; }
      else { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
      return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
    }
    var EQT = ["LCut", "LShv", "PEQ", "VEQ", "HShv", "HCut"];
    // the low cut and EQ of P as a list of biquads
    function filters(P, sr, part) {
      var out = [];
      if ((!part || part === "lc") && P.lc) {
        if (P.lcs == 12) out.push(biq("hp", P.lcf, 0.7071, 0, sr));
        else if (P.lcs == 18) { out.push(biq("hp1", P.lcf, 1, 0, sr)); out.push(biq("hp", P.lcf, 1, 0, sr)); }
        else { out.push(biq("hp", P.lcf, 0.5412, 0, sr)); out.push(biq("hp", P.lcf, 1.3066, 0, sr)); }
      }
      if ((!part || part === "eq") && P.eq) for (var b = 1; b <= 4; b++) {
        var t = EQT[P["e" + b + "t"]], f = P["e" + b + "f"], g = P["e" + b + "g"], q = P["e" + b + "q"];
        if (t === "LCut") out.push(biq("hp", f, 0.7071, 0, sr));
        else if (t === "HCut") out.push(biq("lp", f, 0.7071, 0, sr));
        else if (g === 0) continue;
        else if (t === "LShv") out.push(biq("ls", f, Math.min(q, 2) * 0.5, g, sr));
        else if (t === "HShv") out.push(biq("hs", f, Math.min(q, 2) * 0.5, g, sr));
        else if (t === "VEQ") out.push(biq("peak", f, q * (0.6 + Math.abs(g) / 15), g, sr));
        else out.push(biq("peak", f, q, g, sr));
      }
      return out;
    }
    function magDb(list, f, sr) {
      var w = 2 * Math.PI * f / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w), d = 0;
      list.forEach(function (k) {
        var nr = k[0] + k[1] * c1 + k[2] * c2, ni = -(k[1] * s1 + k[2] * s2), dr = 1 + k[3] * c1 + k[4] * c2, di = -(k[3] * s1 + k[4] * s2);
        d += 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di) + 1e-30);
      });
      return d;
    }
    var RATIOS = [1.1, 1.3, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 20, 100];
    // the X32 fader law (Maillot): position 0..1 -> dB
    function faderDb(f) { return f <= 0 ? -Infinity : f >= 0.5 ? f * 40 - 30 : f >= 0.25 ? f * 80 - 50 : f >= 0.0625 ? f * 160 - 70 : f * 480 - 90; }
    function faderPos(d) { return d === -Infinity || d < -90 ? 0 : d < -60 ? (d + 90) / 480 : d < -30 ? (d + 70) / 160 : d < -10 ? (d + 50) / 80 : (d + 30) / 40; }
    return { biq: biq, filters: filters, magDb: magDb, EQT: EQT, RATIOS: RATIOS, faderDb: faderDb, faderPos: faderPos };
  }
  var L = LIB();

  // ---------- the worklet ----------
  var WORKLET = "var L=(" + LIB.toString() + ")();\n(" + function () {
    function db2g(d) { return Math.pow(10, d / 20); }
    var seed = 12345; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; }
    class Strip extends AudioWorkletProcessor {
      constructor() {
        super(); this.buf = null; this.lab = null; this.pos = 0; this.play = false; this.P = null; this.f = []; this.z = [];
        this.genv = 0; this.gg = -60; this.hold = 0; this.cenv = 0; this.cms = 0; this.cy = 0; this.chold = 0; this.cnt = 0; this.newStats();
        this.m = { inPk: 0, gr: 0, cr: 0, outPk: 0, clip: 0, det: -120 }; this.hist = [];
        this.port.onmessage = (e) => { var d = e.data;
          if (d.buf) { this.buf = d.buf; this.lab = d.lab; this.right = d.right; this.pos = 0; this.newStats(); }
          if (d.P) { this.P = d.P; this.f = L.filters(d.P, sampleRate, "lc"); this.e = L.filters(d.P, sampleRate, "eq");
            this.z = this.f.map(() => [0, 0, 0, 0]); this.ze = this.e.map(() => [0, 0, 0, 0]); }
          if (d.play != null) this.play = d.play; };
      }
      newStats() { this.S = { hit: [0, 0], bleed: [0, 0], tail: [0, 0], q: [0, 0], l: [0, 0], lgr: [0, 0], inPk: 0, clips: 0, outPk: 0 }; }
      run(list, zs, x) { for (var i = 0; i < list.length; i++) { var k = list[i], z = zs[i], y = k[0] * x + k[1] * z[0] + k[2] * z[1] - k[3] * z[2] - k[4] * z[3]; z[1] = z[0]; z[0] = x; z[3] = z[2]; z[2] = y; x = y; } return x; }
      comp(x, P) {
        var lv;
        if (P.ddet == 1) { this.cms += (x * x - this.cms) * (1 - Math.exp(-1 / (0.01 * sampleRate))); lv = 10 * Math.log10(this.cms * 2 + 1e-12); }
        else { var a = Math.abs(x); this.cenv = a > this.cenv ? a : this.cenv * Math.exp(-1 / (0.002 * sampleRate)); lv = 20 * Math.log10(this.cenv + 1e-9); }
        var R = L.RATIOS[P.dratio], W = P.dknee * 2, ov = lv - P.dthr, gr = 0;
        if (2 * ov < -W) gr = 0; else if (W > 0 && 2 * Math.abs(ov) <= W) gr = (1 / R - 1) * (ov + W / 2) * (ov + W / 2) / (2 * W); else gr = (1 / R - 1) * ov;
        if (gr < this.cy) { var ca = P.datt <= 0 ? 0 : Math.exp(-1 / (P.datt / 1000 * sampleRate)); this.cy = ca * this.cy + (1 - ca) * gr; this.chold = P.dhold / 1000 * sampleRate; }
        else if (this.chold > 0) this.chold--;
        else { var cr = Math.exp(-1 / (P.drel / 1000 * sampleRate)); this.cy = cr * this.cy + (1 - cr) * gr; }
        return x * db2g(this.cy + P.dgain);
      }
      process(ins, outs) {
        var o = outs[0][0], P = this.P, B = this.buf; if (!o) return true;
        if (!B || !P || !this.play) { o.fill(0); return true; }
        var s = db2g(P.gain - this.right - 12), nz = db2g(P.gain - 120) * 1.7, M = this.m, S = this.S;
        var fad = P.mute ? 0 : db2g(L.faderDb(P.fader)), mode = P.gmode;
        var gA = P.gatt <= 0 ? 1 : 1 - Math.exp(-1 / (P.gatt / 1000 * sampleRate)), gR = 1 - Math.exp(-1 / (P.grel / 1000 * sampleRate * 0.25));
        for (var i = 0; i < o.length; i++) {
          var x = B[this.pos] * s + rnd() * nz, lab = this.lab[this.pos];
          if (x > 1) { x = 1; M.clip = 1; S.clips++; } else if (x < -1) { x = -1; M.clip = 1; S.clips++; }
          var ax = Math.abs(x); if (ax > M.inPk) M.inPk = ax; if (ax > S.inPk) S.inPk = ax;
          if (P.inv) x = -x;
          x = this.run(this.f, this.z, x);
          // gate
          var gdb = 0;
          var a2 = Math.abs(x); this.genv = a2 > this.genv ? a2 : this.genv * 0.9985;
          var lv = 20 * Math.log10(this.genv + 1e-9); if (lv > M.det) M.det = lv;
          if (P.gate) {
            var tg;
            if (lv >= P.gthr) { this.hold = P.ghold / 1000 * sampleRate; tg = 0; }
            else if (this.hold > 0) { this.hold--; tg = 0; }
            else tg = mode == 3 ? -P.grange : Math.max(-P.grange, (lv - P.gthr) * (mode + 1));
            this.gg += (tg - this.gg) * (tg > this.gg ? gA : gR);
            gdb = this.gg; x *= db2g(gdb);
          } else this.gg = 0;
          if (-gdb > M.gr) M.gr = -gdb;
          if (P.dyn && P.dpos == 0) x = this.comp(x, P);
          x = this.run(this.e, this.ze, x);
          if (P.dyn && P.dpos == 1) x = this.comp(x, P);
          if (!P.dyn) this.cy = 0;
          if (-this.cy > M.cr) M.cr = -this.cy;
          x *= fad; o[i] = x;
          var ao = Math.abs(x); if (ao > M.outPk) M.outPk = ao; if (ao > S.outPk) S.outPk = ao;
          if (lab === 1) { S.hit[0] += gdb; S.hit[1]++; }
          else if (lab === 2) { S.bleed[0] += gdb; S.bleed[1]++; }
          else if (lab === 3) { S.tail[0] += gdb; S.tail[1]++; }
          else if (lab === 4) { S.q[0] += x * x; S.q[1]++; }
          else if (lab === 5) { S.l[0] += x * x; S.l[1]++; S.lgr[0] += this.cy; S.lgr[1]++; }
          if (++this.pos >= B.length) {
            this.pos = 0; var av = (a) => a[1] ? a[0] / a[1] : null, rm = (a) => a[1] ? 10 * Math.log10(a[0] / a[1] + 1e-12) : null;
            this.port.postMessage({ stats: { hit: av(S.hit), bleed: av(S.bleed), tail: av(S.tail), quiet: rm(S.q), loud: rm(S.l), loudGr: av(S.lgr),
              inPk: 20 * Math.log10(S.inPk + 1e-9), clips: S.clips, outPk: 20 * Math.log10(S.outPk + 1e-9) } });
            this.newStats(); S = this.S;
          }
        }
        if (++this.cnt >= 6) {
          this.cnt = 0;
          this.port.postMessage({ m: { inPk: 20 * Math.log10(M.inPk + 1e-9), gr: M.gr, cr: M.cr, outPk: 20 * Math.log10(M.outPk + 1e-9), clip: M.clip, det: M.det, pos: this.pos / B.length } });
          M.inPk = 0; M.gr = 0; M.cr = 0; M.outPk = 0; M.clip = 0; M.det = -120;
        }
        return true;
      }
    }
    registerProcessor("x32-strip", Strip);
  }.toString() + ")();";

  function getCtx() {
    if (!ctx) {
      ctx = new AC({ sampleRate: SR });
      outVol = ctx.createGain(); outVol.gain.value = vol * 2.2;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
      outVol.connect(lim); lim.connect(ctx.destination); master = outVol;
      if (window.AudioTap) window.AudioTap.register(ctx, outVol, "Live sound");
      modP = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" })));
    }
    if (ctx.state === "suspended") ctx.resume();
    return modP.then(function () { return ctx; });
  }

  // ---------- the sources, rendered offline ----------
  function mkRnd(sd) { return function () { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }; }
  function noise(c, secs, r) { var b = c.createBuffer(1, Math.ceil(secs * c.sampleRate), c.sampleRate), a = b.getChannelData(0); for (var i = 0; i < a.length; i++) a[i] = r() * 2 - 1; return b; }
  function brown(c, secs, r) { var b = c.createBuffer(1, Math.ceil(secs * c.sampleRate), c.sampleRate), a = b.getChannelData(0), l = 0; for (var i = 0; i < a.length; i++) { l = (l + 0.02 * (r() * 2 - 1)) / 1.02; a[i] = l * 3.5; } return b; }
  function dec(c, d, t, amp, len) { var g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.0015); g.gain.exponentialRampToValueAtTime(amp * 0.001, t + len); g.connect(d); return g; }
  function nz(c, d, nb, t, len, type, f, q, amp) {
    var s = c.createBufferSource(), fl = c.createBiquadFilter(); s.buffer = nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7;
    s.connect(fl); fl.connect(dec(c, d, t, amp, len)); s.start(t, (t * 0.37) % 1); s.stop(t + len + 0.02);
  }
  function kick(c, d, t, a, nb) {
    var o = c.createOscillator(); o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
    o.connect(dec(c, d, t, a, 0.45)); o.start(t); o.stop(t + 0.5); nz(c, d, nb, t, 0.012, "highpass", 2500, 0.7, a * 0.35);
  }
  function snare(c, d, t, a, nb) {
    nz(c, d, nb, t, 0.2, "bandpass", 2200, 0.6, a);
    var o = c.createOscillator(); o.type = "triangle"; o.frequency.value = 185; o.connect(dec(c, d, t, a * 0.6, 0.12)); o.start(t); o.stop(t + 0.15);
  }
  function hat(c, d, t, a, nb) { nz(c, d, nb, t, 0.05, "highpass", 7500, 0.7, a); }
  function cym(c, d, t, a, nb, len) { nz(c, d, nb, t, len, "highpass", 4500, 0.7, a); nz(c, d, nb, t, len * 0.7, "bandpass", 6500, 2, a * 0.6); }
  function tom(c, d, t, a, f, nb) {
    var o = c.createOscillator(), o2 = c.createOscillator(); o.frequency.setValueAtTime(f * 1.45, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    o2.frequency.value = f * 1.58; o.connect(dec(c, d, t, a, 0.95)); o2.connect(dec(c, d, t, a * 0.25, 0.4)); o.start(t); o.stop(t + 1); o2.start(t); o2.stop(t + 0.45);
    nz(c, d, nb, t, 0.02, "bandpass", 1500, 0.8, a * 0.4);
  }
  function bassNote(c, d, t, f, dur, a, cut) {
    var o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o.frequency.value = f; o2.frequency.value = f;
    lp.type = "lowpass"; lp.Q.value = 1.2; lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(Math.max(150, cut / 4), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(a * 0.35, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(d); o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  var VOW = { a: [[730, 1], [1090, 0.5], [2440, 0.25]], o: [[570, 1], [840, 0.45], [2410, 0.2]], e: [[530, 1], [1840, 0.5], [2480, 0.3]], i: [[300, 1], [2200, 0.4], [3000, 0.3]], u: [[320, 1], [800, 0.35], [2240, 0.15]] };
  function voice(c, d, t, f, dur, a, vw, nb, glide, vib) {
    var o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(); o.type = "sawtooth";
    o.frequency.setValueAtTime(f, t); if (glide) o.frequency.linearRampToValueAtTime(f * glide, t + dur);
    lfo.frequency.value = 5.3; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(vib ? f * 0.013 : 0, t + Math.min(0.4, dur)); lfo.connect(lg); lg.connect(o.frequency);
    var at = Math.min(0.05, dur / 4); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + at); g.gain.setValueAtTime(a, t + dur - at * 1.5); g.gain.linearRampToValueAtTime(0, t + dur); g.connect(d);
    VOW[vw].forEach(function (fm) { var b = c.createBiquadFilter(), bg = c.createGain(); b.type = "bandpass"; b.frequency.value = fm[0]; b.Q.value = 6; bg.gain.value = fm[1] * 2.2; o.connect(b); b.connect(bg); bg.connect(g); });
    var s = c.createBufferSource(), bf = c.createBiquadFilter(), sg = c.createGain(); s.buffer = nb; bf.type = "bandpass"; bf.frequency.value = 5000; sg.gain.value = 0.04; s.connect(bf); bf.connect(sg); sg.connect(g); s.start(t, 0.1); s.stop(t + dur);
    o.start(t); o.stop(t + dur + 0.02); lfo.start(t); lfo.stop(t + dur + 0.02);
  }
  function cons(c, d, t, a, nb, f) { nz(c, d, nb, t, 0.06, "bandpass", f || 5500, 1.5, a); }

  // marks: [t0, t1, kind] (1 hit onset, 2 bleed, 3 tail, 4 quiet part, 5 loud part)
  var SOURCES = {
    speech: { label: "Podium speech (quiet talker)", right: 52, len: 8, goal: "gain", problem: "gain",
      build: function (c, d, r, M) {
        var nb = noise(c, 2, r), vs = ["a", "e", "o", "i", "a", "u", "e", "a"], t = 0.3;
        [[5, 0.6], [4, 0.7], [6, 1.2], [5, 0.5]].forEach(function (ph) {
          for (var k = 0; k < ph[0]; k++) { var dur = 0.12 + r() * 0.16, f = 118 + r() * 25 - k * 3; if (r() < 0.5) cons(c, d, t, 0.12, nb, 3000 + r() * 4000); voice(c, d, t + 0.03, f, dur, 0.5 + r() * 0.5, vs[(k * 3 + ph[0]) % 8], nb, 0.92 + r() * 0.12, false); t += dur + 0.05; }
          t += ph[1];
        });
        nz(c, d, brown(c, 9, r), 0, 8, "lowpass", 400, 0.7, 0.012);
      } },
    vocal: { label: "Lead vocal (soft verse, loud chorus)", right: 30, len: 8, goal: "comp", problem: "comp",
      build: function (c, d, r, M) {
        var nb = noise(c, 2, r);
        [[0.2, 220, 0.8, "a"], [1.1, 247, 0.7, "o"], [2.0, 262, 0.8, "e"], [2.9, 247, 0.9, "a"]].forEach(function (n) { voice(c, d, n[0], n[1], n[2], 0.11, n[3], nb, 1, true); });
        [[4.1, 294, 0.8, "a"], [5.0, 330, 0.8, "o"], [5.9, 392, 0.9, "a"], [6.9, 330, 0.9, "e"]].forEach(function (n, i) { voice(c, d, n[0], n[1], n[2], i === 2 ? 1 : 0.75, n[3], nb, 1, true); });
        M.push([0.2, 3.8, 4], [4.1, 7.8, 5]);
      } },
    kick: { label: "Kick drum mic (snare, hat and crash bleed)", right: 24, len: 8, goal: "gate", problem: "gate",
      build: function (c, d, r, M) {
        var nb = noise(c, 2, r);
        [0, 0.75, 1, 2, 2.75, 3, 4, 4.75, 5, 6, 6.75, 7, 7.75].forEach(function (t) { var a = t === 7.75 ? 0.5 : t === 2.75 ? 0.6 : 1; kick(c, d, t, a, nb); M.push([t + 0.0005, t + 0.008, 1]); });
        for (var t = 0.5; t < 8; t += 1) { snare(c, d, t, 0.13, nb); M.push([t, t + 0.06, 2]); }
        for (t = 0; t < 8; t += 0.25) hat(c, d, t, 0.035, nb);
        cym(c, d, 0, 0.06, nb, 2.5);
        nz(c, d, noise(c, 9, r), 0, 8, "lowpass", 3000, 0.7, 0.004);
      } },
    toms: { label: "Rack tom mic (ring, snare and cymbal bleed)", right: 26, len: 8, goal: "gate", problem: "gate",
      build: function (c, d, r, M) {
        var nb = noise(c, 2, r), hits = [3, 3.125, 3.25, 3.375, 6, 7, 7.125, 7.25];
        hits.forEach(function (t, i) { tom(c, d, t, 0.9 - (i % 4) * 0.08, 165, nb); M.push([t + 0.0005, t + 0.008, 1]); if (hits[i + 1] == null || hits[i + 1] - t > 0.2) M.push([t + 0.1, t + 0.16, 3]); });
        for (var t = 0.5; t < 8; t += 1) { snare(c, d, t, 0.22, nb); if (!hits.some(function (h) { return h <= t && t - h < 1.0; })) M.push([t, t + 0.06, 2]); }
        for (t = 0; t < 8; t += 0.5) { cym(c, d, t, 0.05, nb, 0.6); kick(c, d, t, 0.07, nb); }
      } },
    bass: { label: "Bass DI (uneven, popped notes)", right: 16, len: 8, goal: "comp", problem: "comp",
      build: function (c, d, r, M) {
        var seq = [41.2, 41.2, 55, 41.2, 49, 41.2, 55, 61.7];
        for (var i = 0; i < 32; i++) { var t = i * 0.25, pop = i % 8 === 3 || i % 8 === 6 || i === 29, f = seq[i % 8] * (i >= 16 && i < 24 ? 4 / 3 : 1);
          bassNote(c, d, t, f, 0.22, pop ? 1 : 0.26, pop ? 4500 : 1400); M.push([t + 0.01, t + 0.18, pop ? 5 : 4]); }
      } },
    mud: { label: "Vocal on a boomy mic (rumble, thumps)", right: 32, len: 8, goal: "eq", problem: "eq",
      build: function (c, d, r, M) {
        var nb = noise(c, 2, r), ls = c.createBiquadFilter(), pk = c.createBiquadFilter(); ls.type = "lowshelf"; ls.frequency.value = 220; ls.gain.value = 10; pk.type = "peaking"; pk.frequency.value = 300; pk.Q.value = 1.2; pk.gain.value = 7;
        ls.connect(pk); pk.connect(d);
        [[0.2, 196, 0.9, "a"], [1.2, 220, 0.7, "o"], [2.1, 247, 1.2, "e"], [3.6, 220, 0.8, "a"], [4.6, 196, 0.9, "u"], [5.6, 247, 0.8, "o"], [6.6, 220, 1.2, "a"]].forEach(function (n) { voice(c, ls, n[0], n[1], n[2], 0.3, n[3], nb, 1, true); });
        nz(c, d, brown(c, 9, r), 0, 8, "lowpass", 70, 0.7, 0.5);
        [1.9, 5.3].forEach(function (t) { nz(c, d, nb, t, 0.18, "lowpass", 90, 1, 1.2); });
      } },
    guitar: { label: "Electric guitar (harsh and fizzy)", right: 28, len: 8, goal: "eq", problem: "eq",
      build: function (c, d, r, M) {
        var ws = c.createWaveShaper(), cv = new Float32Array(1024); for (var i = 0; i < 1024; i++) { var x = i / 511.5 - 1; cv[i] = Math.tanh(x * 6); } ws.curve = cv;
        var cab = c.createBiquadFilter(), pk = c.createBiquadFilter(), hs = c.createBiquadFilter(), hp = c.createBiquadFilter(); cab.type = "lowpass"; cab.frequency.value = 6500;
        pk.type = "peaking"; pk.frequency.value = 3200; pk.Q.value = 2.5; pk.gain.value = 11; hs.type = "highshelf"; hs.frequency.value = 7000; hs.gain.value = 8; hp.type = "highpass"; hp.frequency.value = 90;
        ws.connect(hp); hp.connect(cab); cab.connect(pk); pk.connect(hs); hs.connect(d);
        var roots = [82.4, 82.4, 110, 98], pre = c.createGain(); pre.gain.value = 0.5; pre.connect(ws);
        for (var k = 0; k < 32; k++) { var t = k * 0.25, f = roots[Math.floor(k / 8)], g = c.createGain(), a = k % 4 === 0 ? 1 : 0.7;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.005); g.gain.exponentialRampToValueAtTime(a * 0.3, t + 0.23); g.gain.linearRampToValueAtTime(0, t + 0.245); g.connect(pre);
          [1, 1.5, 2].forEach(function (m) { var o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * m; o.detune.value = m * 4 - 6; o.connect(g); o.start(t); o.stop(t + 0.25); }); }
      } }
  };
  var cache = {};
  function sourceData(id) {
    if (cache[id]) return cache[id];
    var S = SOURCES[id], OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, n = Math.round(S.len * SR), oc = new OC(1, n, SR), M = [];
    S.build(oc, oc.destination, mkRnd(id.length * 7919 + 17), M);
    return (cache[id] = oc.startRendering().then(function (b) {
      var d = b.getChannelData(0).slice(), m = 1e-9, i; for (i = 0; i < n; i++) m = Math.max(m, Math.abs(d[i])); for (i = 0; i < n; i++) d[i] /= m;
      var lab = new Int8Array(n); M.forEach(function (k) { for (var j = Math.round(k[0] * SR); j < Math.min(n, Math.round(k[1] * SR)); j++) lab[j] = k[2]; });
      return { data: d, lab: lab };
    }));
  }

  function wav(data, reps) {
    var n = data.length * reps, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf), g = db2g(-12);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 4, true);
    for (var i = 0, o = 44; i < n; i++, o += 4) { var s = clamp(data[i % data.length] * g, -1, 1) * 32767; v.setInt16(o, s, true); v.setInt16(o + 2, s, true); }
    return new Blob([buf], { type: "audio/wav" });
  }

  // ---------- styles ----------
  if (!document.getElementById("lk-style")) {
    var st = el("style"); st.id = "lk-style";
    st.textContent = [
      ".lk-w{--x-bg:#1d1f22;--x-panel:#2a2d31;--x-ink:#e8e6e1;--x-ink2:#9aa0a6;--x-amber:#f2a33a;--x-line:#41454b;border:1px solid var(--site-border);border-radius:10px;background:var(--x-bg);color:var(--x-ink);padding:.7rem .8rem .9rem;margin:1.1rem 0 1.6rem}",
      ".lk-w.lk-live{box-shadow:0 0 0 2px var(--x-amber)}",
      ".lk-head{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .7rem;margin-bottom:.55rem}",
      ".lk-title{font-family:var(--font-display);font-size:1.02rem;color:var(--x-ink)}",
      ".lk-w button{font-family:var(--font-mono);font-size:.75rem;background:var(--x-panel);color:var(--x-ink);border:1px solid var(--x-line);border-radius:5px;padding:.15rem .5rem;cursor:pointer}",
      ".lk-w button:hover{border-color:var(--x-amber)}",
      ".lk-w button.lk-on{background:var(--x-amber);border-color:var(--x-amber);color:#1d1f22}",
      ".lk-w select{font-family:var(--font-mono);font-size:.75rem;background:var(--x-panel);color:var(--x-ink);border:1px solid var(--x-line);border-radius:5px;padding:.1rem .25rem;max-width:100%}",
      ".lk-vol{display:inline-flex;align-items:center;gap:.3rem;font-family:var(--font-mono);font-size:.7rem;color:var(--x-ink2);margin:0}",
      ".lk-vol input{width:5.5rem;accent-color:var(--x-amber)}",
      ".lk-status{font-size:.78rem;color:var(--x-ink2);flex:1 1 10rem}",
      ".lk-tries{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:0 0 .55rem}",
      ".lk-tries span{font-family:var(--font-mono);font-size:.68rem;text-transform:uppercase;color:var(--x-ink2)}",
      ".lk-strip{display:flex;flex-wrap:wrap;gap:.5rem;align-items:stretch}",
      ".lk-sec{background:var(--x-panel);border:1px solid var(--x-line);border-radius:7px;padding:.4rem .5rem .5rem;flex:1 1 auto;min-width:0}",
      ".lk-sec.lk-hide{display:none}",
      ".lk-sh{display:flex;align-items:center;gap:.4rem;margin-bottom:.35rem;font-family:var(--font-mono);font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--x-ink2)}",
      ".lk-sh b{color:var(--x-ink);font-weight:600}",
      ".lk-sh button{font-size:.66rem;padding:0 .35rem}",
      ".lk-knobs{display:flex;flex-wrap:wrap;gap:.3rem .45rem;align-items:flex-start}",
      ".lk-k{display:flex;flex-direction:column;align-items:center;width:4.3rem;font-family:var(--font-mono)}",
      ".lk-k .lk-kl{font-size:.6rem;text-transform:uppercase;color:var(--x-ink2);letter-spacing:.04em}",
      ".lk-k .lk-kv{font-size:.7rem;color:var(--x-ink);white-space:nowrap}",
      ".lk-dial{width:2.9rem;height:2.9rem;cursor:ns-resize;touch-action:none;outline:none;border-radius:50%}",
      ".lk-dial:focus-visible{box-shadow:0 0 0 2px var(--x-amber)}",
      ".lk-dial svg{width:100%;height:100%;display:block}",
      ".lk-sel{display:flex;flex-direction:column;gap:.1rem;font-family:var(--font-mono);font-size:.6rem;text-transform:uppercase;color:var(--x-ink2);margin:0}",
      ".lk-meter{position:relative;width:.7rem;background:#0d0e10;border-radius:2px;overflow:hidden;border:1px solid var(--x-line)}",
      ".lk-mfill{position:absolute;left:0;right:0;bottom:0;background:#3fb950}",
      ".lk-mfill.lk-gr{top:0;bottom:auto;background:var(--x-amber)}",
      ".lk-mpk{position:absolute;left:0;right:0;height:2px;background:#fff}",
      ".lk-mrow{display:flex;gap:.45rem;align-items:stretch}",
      ".lk-scale{position:relative;width:1.6rem;font-family:var(--font-mono);font-size:.55rem;color:var(--x-ink2)}",
      ".lk-scale span{position:absolute;right:0;transform:translateY(-50%)}",
      ".lk-clip{font-family:var(--font-mono);font-size:.6rem;padding:0 .3rem;border-radius:3px;background:#3a2626;color:#a88;cursor:pointer;text-align:center}",
      ".lk-clip.lk-over{background:#e5322d;color:#fff;box-shadow:0 0 6px #e5322d}",
      ".lk-bands{display:flex;gap:.25rem;margin-bottom:.3rem;flex-wrap:wrap}",
      ".lk-eqcv,.lk-hist{width:100%;height:120px;display:block;background:#0d0e10;border:1px solid var(--x-line);border-radius:5px;margin-top:.35rem}",
      ".lk-hist{height:90px}",
      ".lk-fader{writing-mode:vertical-lr;direction:rtl;height:9.5rem;width:1.5rem;accent-color:var(--x-amber)}",
      ".lk-fv{font-family:var(--font-mono);font-size:.75rem;text-align:center;color:var(--x-ink)}",
      ".lk-check{margin-top:.55rem;font-size:.88rem;color:var(--x-ink)}",
      ".lk-check ul{margin:.3rem 0 0;padding-left:1.1rem}",
      ".lk-check li.lk-ok::marker{content:'✓ ';color:#3fb950}",
      ".lk-check li.lk-no::marker{content:'✗ ';color:#e5322d}",
      ".lk-quiz{background:var(--x-panel);border:1px dashed var(--x-amber);border-radius:7px;padding:.5rem .6rem;margin-bottom:.55rem;font-size:.9rem}",
      ".lk-quiz .lk-ans{display:flex;flex-wrap:wrap;gap:.35rem;margin:.35rem 0}",
      ".lk-quiz .lk-fb{min-height:1.3em;color:var(--x-ink)}",
      ".lk-quiz button.lk-right{background:#2f7d3e;border-color:#2f7d3e;color:#fff}",
      ".lk-quiz button.lk-wrong{background:#8a2a27;border-color:#8a2a27;color:#fff}",
      "@media (max-width:640px){.lk-k{width:3.9rem}.lk-dial{width:2.5rem;height:2.5rem}}"
    ].join("\n");
    document.head.appendChild(st);
  }

  // ---------- a knob ----------
  // spec: { label, min, max, step, log, fmt, list (values), def }
  function knob(parent, spec, get, set) {
    var w = el("div", "lk-k"), d = el("div", "lk-dial"), v = el("div", "lk-kv"), lab = el("div", "lk-kl", spec.label);
    d.tabIndex = 0; d.setAttribute("role", "slider"); d.setAttribute("aria-label", spec.label);
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 40 40");
    function arc(a0, a1) { var r = 16, p = function (a) { return [20 + r * Math.cos(a), 20 + r * Math.sin(a)]; }, s = p(a0), e = p(a1); return "M" + s[0] + " " + s[1] + "A" + r + " " + r + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + e[0] + " " + e[1]; }
    var A0 = Math.PI * 0.75, A1 = Math.PI * 2.25;
    svg.innerHTML = '<path d="' + arc(A0, A1) + '" fill="none" stroke="#41454b" stroke-width="4" stroke-linecap="round"/><path class="v" fill="none" stroke="#f2a33a" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="20" r="10.5" fill="#3a3e44" stroke="#55595f"/><line class="p" x1="20" y1="20" stroke="#e8e6e1" stroke-width="2.2" stroke-linecap="round"/>';
    d.appendChild(svg); w.appendChild(d); w.appendChild(v); w.appendChild(lab); parent.appendChild(w);
    var pv = svg.querySelector(".v"), pl = svg.querySelector(".p");
    function toN(x) { if (spec.list) return spec.list.indexOf(x) / (spec.list.length - 1); return spec.log ? Math.log(x / spec.min) / Math.log(spec.max / spec.min) : (x - spec.min) / (spec.max - spec.min); }
    function fromN(n) {
      n = clamp(n, 0, 1); if (spec.list) return spec.list[Math.round(n * (spec.list.length - 1))];
      var x = spec.log ? spec.min * Math.pow(spec.max / spec.min, n) : spec.min + n * (spec.max - spec.min);
      var stp = spec.step || 0; if (stp) x = Math.round(x / stp) * stp; if (spec.log) x = +x.toPrecision(3); return clamp(x, spec.min, spec.max);
    }
    function draw() {
      var x = get(), n = clamp(toN(x), 0, 1), a = A0 + n * (A1 - A0);
      pv.setAttribute("d", n > 0.002 ? arc(A0, a) : ""); pl.setAttribute("x2", 20 + 9 * Math.cos(a)); pl.setAttribute("y2", 20 + 9 * Math.sin(a));
      v.textContent = spec.fmt(x); d.setAttribute("aria-valuetext", spec.fmt(x));
    }
    var y0 = 0, n0 = 0;
    d.addEventListener("pointerdown", function (e) { d.setPointerCapture(e.pointerId); y0 = e.clientY; n0 = toN(get()); e.preventDefault(); d.focus(); });
    d.addEventListener("pointermove", function (e) { if (!d.hasPointerCapture(e.pointerId)) return; set(fromN(n0 + (y0 - e.clientY) / (e.shiftKey ? 600 : 150))); draw(); });
    d.addEventListener("wheel", function (e) { e.preventDefault(); set(fromN(toN(get()) + (e.deltaY < 0 ? 1 : -1) / (spec.list ? spec.list.length - 1 : 60))); draw(); }, { passive: false });
    d.addEventListener("keydown", function (e) {
      var k = e.key, s = spec.list ? 1 / (spec.list.length - 1) : (e.shiftKey ? 1 / 300 : 1 / 60);
      if (k === "ArrowUp" || k === "ArrowRight") { set(fromN(toN(get()) + s)); draw(); e.preventDefault(); }
      else if (k === "ArrowDown" || k === "ArrowLeft") { set(fromN(toN(get()) - s)); draw(); e.preventDefault(); }
    });
    d.addEventListener("dblclick", function () { if (spec.def != null) { set(spec.def); draw(); } });
    draw(); return { draw: draw, el: w };
  }

  // ---------- the strip ----------
  var DEF = { gain: 30, inv: 0, lc: 0, lcf: 80, lcs: 12, gate: 0, gmode: 3, gthr: -40, grange: 60, gatt: 0.5, ghold: 50, grel: 200,
    eq: 1, e1t: 1, e1f: 100, e1g: 0, e1q: 2, e2t: 2, e2f: 400, e2g: 0, e2q: 2, e3t: 2, e3f: 2500, e3g: 0, e3q: 2, e4t: 4, e4f: 8000, e4g: 0, e4q: 2,
    dyn: 0, dthr: -20, dratio: 6, dknee: 2, datt: 10, dhold: 0.02, drel: 150, dgain: 0, ddet: 0, dpos: 1, mute: 0, fader: 0.75 };
  var BANDS = ["Low", "Lo Mid", "Hi Mid", "High"];
  var GMODES = ["EXP2", "EXP3", "EXP4", "GATE"];

  function parseSet(s, P) {
    (s || "").split(",").forEach(function (kv) { var p = kv.split("="); if (p.length < 2) return; var k = p[0].trim(), v = p[1].trim();
      if (k === "fdb") P.fader = L.faderPos(+v); else if (k in P) P[k] = +v; });
  }

  function Strip(host) {
    var self = this, P = Object.assign({}, DEF), quiz = host.hasAttribute("data-quiz");
    var srcIds = (host.dataset.sources || Object.keys(SOURCES).join(",")).split(",").map(function (s) { return s.trim(); }).filter(function (s) { return SOURCES[s]; });
    var srcId = SOURCES[host.dataset.source] ? host.dataset.source : srcIds[0];
    P.gain = SOURCES[srcId].right; parseSet(host.dataset.set, P);
    var startP = Object.assign({}, P);
    var shown = (host.dataset.show || "pre gate eq dyn fader").split(/[\s,]+/), node = null, an = null, raf = 0, stats = null, meters = {}, clipLatched = false, hist = [];
    var knobs = [];
    host.className += " lk-w"; host.innerHTML = "";
    this.P = P;

    // head
    var head = el("div", "lk-head"); host.appendChild(head);
    head.appendChild(el("span", "lk-title", host.dataset.title || (quiz ? "Mystery channel" : "X32 input channel")));
    var playB = el("button", null, "▶ Play"); head.appendChild(playB);
    var sel = el("select"); sel.setAttribute("aria-label", "Source");
    srcIds.forEach(function (id) { var o = el("option", null, SOURCES[id].label); o.value = id; sel.appendChild(o); }); sel.value = srcId;
    if (!quiz) head.appendChild(sel);
    var volL = el("label", "lk-vol", "Speakers"), volR = el("input"); volR.type = "range"; volR.min = 0; volR.max = 1; volR.step = 0.01; volR.value = vol; volL.appendChild(volR); head.appendChild(volL);
    volR.addEventListener("input", function () { vol = +volR.value; try { localStorage.setItem("lk-vol", vol); } catch (e) {} if (outVol) outVol.gain.value = vol * 2.2; });
    var wavB = el("button", null, "⤓ WAV"); wavB.title = "32 seconds of this source, raw (no processing), to play through a real desk"; if (!quiz) head.appendChild(wavB);
    var resetB = el("button", null, "Reset"); head.appendChild(resetB);
    var status = el("span", "lk-status", ""); head.appendChild(status);

    // quiz panel
    var qz = null, qProblem = null;
    if (quiz) {
      qz = el("div", "lk-quiz"); host.appendChild(qz);
      qz.appendChild(el("div", null, "Press ▶ and listen (watch the meter too). What does this channel need first?"));
      var ans = el("div", "lk-ans"), fb = el("div", "lk-fb"); qz.appendChild(ans); qz.appendChild(fb);
      var A = [["hot", "Less gain (it's clipping)"], ["low", "More gain (too quiet)"], ["gate", "A gate (bleed between hits)"], ["comp", "Compression (too uneven)"], ["eq", "Low cut / EQ (muddy or harsh)"]];
      var nextB = el("button", null, "Next problem →"); nextB.hidden = true;
      A.forEach(function (a) { var b = el("button", null, a[1]); b.dataset.a = a[0]; ans.appendChild(b);
        b.addEventListener("click", function () {
          if (!qProblem || qProblem.done) return;
          var ok = a[0] === qProblem.kind; b.classList.add(ok ? "lk-right" : "lk-wrong");
          if (!ok) { fb.textContent = "Not that. Listen again: " + qProblem.hint; return; }
          qProblem.done = true; fb.textContent = "Yes. It's the " + SOURCES[qProblem.src].label.toLowerCase() + ". " + qProblem.why + " Now fix it, then press Check my channel."; nextB.hidden = false;
        }); });
      qz.appendChild(nextB);
      nextB.addEventListener("click", function () { newProblem(); });
      self.answer = function (k) { var b = ans.querySelector('[data-a="' + k + '"]'); if (b) b.click(); };
    }
    var POOL = [
      { kind: "gate", src: "kick", hint: "what do you hear between the kicks?", why: "Between the kicks, the mic hears the snare, the hats and the crash." },
      { kind: "gate", src: "toms", hint: "what do you hear when the toms aren't playing?", why: "The tom mic hears the snare and cymbals all the time." },
      { kind: "comp", src: "vocal", hint: "compare the first half with the second.", why: "The verse is about 18 dB quieter than the chorus." },
      { kind: "comp", src: "bass", hint: "are all the notes the same loudness?", why: "Some notes are popped, 12 dB louder than the rest." },
      { kind: "eq", src: "mud", hint: "listen to the low end: rumble, thumps, boom.", why: "Low rumble, two thumps and a boomy 200-300 Hz." },
      { kind: "eq", src: "guitar", hint: "does anything hurt your ears?", why: "A harsh peak around 3 kHz and fizz on top." },
      { kind: "hot", src: "speech", hint: "look at the input meter and the CLIP light.", why: "The gain is far too high: every peak is cut off at 0 dBFS." },
      { kind: "hot", src: "vocal", hint: "look at the input meter and the CLIP light.", why: "The gain is too high: the chorus clips." },
      { kind: "low", src: "kick", hint: "look at the input meter, and where the fader is.", why: "The gain is 26 dB too low; even with the fader at +10 it's thin and the meter barely moves." },
      { kind: "low", src: "speech", hint: "look at the input meter, and where the fader is.", why: "The gain is 30 dB too low; the fader is already at +10." }
    ];
    var lastQ = -1;
    function newProblem() {
      var i; do { i = Math.floor(Math.random() * POOL.length); } while (i === lastQ && POOL.length > 1); lastQ = i;
      loadProblem(POOL[i]);
    }
    function loadProblem(q) {
      qProblem = Object.assign({ done: false }, q);
      var S = SOURCES[q.src]; Object.assign(P, DEF); P.gain = S.right;
      if (q.kind === "hot") P.gain = S.right + 20; if (q.kind === "low") { P.gain = S.right - (q.src === "speech" ? 30 : 26); P.fader = 1; }
      startP = Object.assign({}, P);
      if (qz) { qz.querySelectorAll(".lk-ans button").forEach(function (b) { b.classList.remove("lk-right", "lk-wrong"); }); qz.querySelector(".lk-fb").textContent = ""; qz.querySelector(".lk-ans").nextSibling.nextSibling.hidden = true; }
      setSource(q.src); refresh(); checkBox.innerHTML = "";
    }
    self.loadProblem = function (kind, src) { loadProblem(POOL.filter(function (q) { return q.kind === kind && (!src || q.src === src); })[0]); };

    // tries
    if (host.dataset.tries) {
      var tr = el("div", "lk-tries"); tr.appendChild(el("span", null, "Try"));
      host.dataset.tries.split(";").forEach(function (t) { var i = t.indexOf(":"); if (i < 0) return; var b = el("button", null, t.slice(0, i).trim()), set = t.slice(i + 1);
        b.addEventListener("click", function () { var m = /(?:^|,)\s*source=([a-z]+)/.exec(set); if (m && SOURCES[m[1]]) { setSource(m[1]); sel.value = m[1]; }
          Object.assign(P, startP); parseSet(set, P); refresh(); clipLatched = false; if (!node) self.play(); });
        tr.appendChild(b); });
      host.appendChild(tr);
    }

    var strip = el("div", "lk-strip"); host.appendChild(strip);
    function section(id, name, onKey) {
      var s = el("div", "lk-sec" + (shown.indexOf(id) < 0 ? " lk-hide" : "")), h = el("div", "lk-sh"); h.appendChild(el("b", null, name));
      var b = null; if (onKey) { b = el("button", null, "ON"); h.appendChild(b); b.addEventListener("click", function () { P[onKey] = P[onKey] ? 0 : 1; refresh(); }); }
      s.appendChild(h); strip.appendChild(s); return { el: s, head: h, btn: b, key: onKey };
    }
    var secs = [];
    function K(parent, spec, key) { var k = knob(parent, spec, function () { return P[key]; }, function (v) { P[key] = v; push(); }); knobs.push(k); return k; }
    function S(parent, label, opts, key) {
      var w = el("label", "lk-sel", label), s = el("select"); opts.forEach(function (o, i) { var op = el("option", null, o); op.value = i; s.appendChild(op); });
      s.addEventListener("change", function () { P[key] = +s.value; push(); }); w.appendChild(s); parent.appendChild(w);
      knobs.push({ draw: function () { s.value = P[key]; } }); return s;
    }
    function meter(parent, kind) {
      var m = el("div", "lk-meter"), f = el("div", "lk-mfill" + (kind === "gr" ? " lk-gr" : "")), p = el("div", "lk-mpk"); m.appendChild(f); if (kind !== "gr") m.appendChild(p); parent.appendChild(m);
      return { set: function (db, pk) {
        if (kind === "gr") { f.style.height = clamp(db / 30, 0, 1) * 100 + "%"; return; }
        var n = function (x) { return clamp((x + 60) / 60, 0, 1) * 100; }; f.style.height = n(db) + "%"; f.style.background = db > -3 ? "#e5322d" : db > -9 ? "#e0b020" : "#3fb950"; p.style.bottom = n(pk) + "%"; } };
    }
    function scale(parent, marks) { var s = el("div", "lk-scale"); marks.forEach(function (m) { var sp = el("span", null, m[1]); sp.style.top = (1 - clamp((m[0] + 60) / 60, 0, 1)) * 100 + "%"; s.appendChild(sp); }); parent.appendChild(s); }

    // CONFIG / PREAMP
    var sp = section("pre", "Config / Preamp"); secs.push(sp);
    var spRow = el("div", "lk-mrow"); sp.el.appendChild(spRow);
    var spK = el("div", "lk-knobs"); spRow.appendChild(spK);
    K(spK, { label: "Gain", min: -12, max: 60, step: 0.5, fmt: function (v) { return fmtDb(v) + " dB"; }, def: 30 }, "gain");
    var invB = el("button", null, "Ø"); invB.title = "Polarity invert";
    var lcB = el("button", null, "LOW CUT");
    var btns = el("div"); btns.style.cssText = "display:flex;flex-direction:column;gap:.25rem"; btns.appendChild(invB); btns.appendChild(lcB); spK.appendChild(btns);
    invB.addEventListener("click", function () { P.inv = P.inv ? 0 : 1; refresh(); }); lcB.addEventListener("click", function () { P.lc = P.lc ? 0 : 1; refresh(); });
    K(spK, { label: "Low cut", min: 20, max: 400, log: true, fmt: fmtHz, def: 80 }, "lcf");
    S(spK, "Slope", ["12 dB/oct", "18 dB/oct", "24 dB/oct"].map(String), "lcsI");
    knobs[knobs.length - 1].draw = (function (s) { return function () { s.value = [12, 18, 24].indexOf(+P.lcs); }; })(spK.querySelectorAll("select")[0]);
    spK.querySelectorAll("select")[0].onchange = function (e) { e.stopImmediatePropagation(); P.lcs = [12, 18, 24][+this.value]; push(); };
    var inCol = el("div"); inCol.style.cssText = "display:flex;flex-direction:column;gap:.25rem;align-items:center";
    var inRow = el("div", "lk-mrow"); inRow.style.height = "6.5rem"; scale(inRow, [[0, "clip"], [-6, "−6"], [-12, "−12"], [-18, "−18"], [-30, "−30"], [-42, "−42"], [-54, "−54"]]);
    var inM = meter(inRow); inCol.appendChild(inRow); var clipL = el("div", "lk-clip", "CLIP"); clipL.title = "Latches when the converter clipped. Click to reset."; inCol.appendChild(clipL); spRow.appendChild(inCol);
    clipL.addEventListener("click", function () { clipLatched = false; clipL.classList.remove("lk-over"); });

    // GATE
    var sg = section("gate", "Gate", "gate"); secs.push(sg);
    var sgRow = el("div", "lk-mrow"); sg.el.appendChild(sgRow); var sgK = el("div", "lk-knobs"); sgRow.appendChild(sgK);
    S(sgK, "Mode", GMODES, "gmode");
    K(sgK, { label: "Thresh", min: -80, max: 0, step: 0.5, fmt: function (v) { return fmtDb(v) + " dB"; }, def: -40 }, "gthr");
    K(sgK, { label: "Range", min: 3, max: 60, step: 1, fmt: function (v) { return v + " dB"; }, def: 60 }, "grange");
    K(sgK, { label: "Attack", min: 0, max: 120, step: 0.5, fmt: fmtMs, def: 0.5 }, "gatt");
    K(sgK, { label: "Hold", min: 0.02, max: 2000, log: true, fmt: fmtMs, def: 50 }, "ghold");
    K(sgK, { label: "Release", min: 5, max: 4000, log: true, fmt: fmtMs, def: 200 }, "grel");
    var gM = meter(sgRow, "gr"); gM.el = sgRow.lastChild; sgRow.lastChild.title = "Gate: how far it is turning the channel down";

    // EQ
    var se = section("eq", "Equalizer", "eq"); secs.push(se);
    var bandsRow = el("div", "lk-bands"), band = 2, bandBtns = []; se.el.appendChild(bandsRow);
    BANDS.forEach(function (n, i) { var b = el("button", null, n); b.addEventListener("click", function () { band = i + 1; buildBand(); }); bandBtns.push(b); bandsRow.appendChild(b); });
    var bandK = el("div", "lk-knobs"); se.el.appendChild(bandK);
    var eqCv = el("canvas", "lk-eqcv"); se.el.appendChild(eqCv);
    var bandKnobs = [];
    function buildBand() {
      bandK.innerHTML = ""; bandKnobs.forEach(function (k) { var i = knobs.indexOf(k); if (i >= 0) knobs.splice(i, 1); }); bandKnobs = [];
      bandBtns.forEach(function (b, i) { b.classList.toggle("lk-on", i + 1 === band); });
      var n = knobs.length;
      S(bandK, "Type", L.EQT, "e" + band + "t");
      K(bandK, { label: "Freq", min: 20, max: 20000, log: true, fmt: fmtHz }, "e" + band + "f");
      K(bandK, { label: "Gain", min: -15, max: 15, step: 0.25, fmt: function (v) { return fmtDb(v) + " dB"; }, def: 0 }, "e" + band + "g");
      K(bandK, { label: "Q", min: 0.3, max: 10, log: true, fmt: function (v) { return v.toFixed(1); }, def: 2 }, "e" + band + "q");
      bandKnobs = knobs.slice(n); refresh();
    }
    self.band = function (b) { band = b; buildBand(); };

    // DYNAMICS
    var sd = section("dyn", "Dynamics", "dyn"); secs.push(sd);
    var sdRow = el("div", "lk-mrow"); sd.el.appendChild(sdRow); var sdK = el("div", "lk-knobs"); sdRow.appendChild(sdK);
    K(sdK, { label: "Thresh", min: -60, max: 0, step: 0.5, fmt: function (v) { return fmtDb(v) + " dB"; }, def: -20 }, "dthr");
    S(sdK, "Ratio", L.RATIOS.map(function (r) { return r + ":1"; }), "dratio");
    K(sdK, { label: "Knee", min: 0, max: 5, step: 1, fmt: function (v) { return String(v); }, def: 2 }, "dknee");
    K(sdK, { label: "Attack", min: 0, max: 120, step: 0.5, fmt: fmtMs, def: 10 }, "datt");
    K(sdK, { label: "Hold", min: 0.02, max: 2000, log: true, fmt: fmtMs, def: 0.02 }, "dhold");
    K(sdK, { label: "Release", min: 5, max: 4000, log: true, fmt: fmtMs, def: 150 }, "drel");
    K(sdK, { label: "Gain", min: 0, max: 24, step: 0.5, fmt: function (v) { return "+" + v.toFixed(1) + " dB"; }, def: 0 }, "dgain");
    S(sdK, "Detect", ["PEAK", "RMS"], "ddet"); S(sdK, "Pos", ["PRE EQ", "POST EQ"], "dpos");
    var cM = meter(sdRow, "gr"); sdRow.lastChild.title = "Compressor: gain reduction";

    // FADER
    var sf = section("fader", "Main"); secs.push(sf);
    var fRow = el("div", "lk-mrow"); sf.el.appendChild(fRow);
    var fCol = el("div"); fCol.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:.25rem";
    var muteB = el("button", null, "MUTE"); fCol.appendChild(muteB); muteB.addEventListener("click", function () { P.mute = P.mute ? 0 : 1; refresh(); });
    var fad = el("input", "lk-fader"); fad.type = "range"; fad.min = 0; fad.max = 1; fad.step = 1 / 1023; fad.setAttribute("aria-label", "Fader"); fCol.appendChild(fad);
    var fv = el("div", "lk-fv"); fCol.appendChild(fv); fRow.appendChild(fCol);
    fad.addEventListener("input", function () { P.fader = +fad.value; push(); });
    fad.addEventListener("dblclick", function () { P.fader = 0.75; refresh(); });
    var oRow = el("div", "lk-mrow"); oRow.style.height = "9.5rem"; scale(oRow, [[0, "0"], [-6, "−6"], [-12, "−12"], [-18, "−18"], [-30, "−30"], [-42, "−42"], [-54, "−54"]]);
    var oM = meter(oRow); fRow.appendChild(oRow);
    knobs.push({ draw: function () { fad.value = P.fader; fv.textContent = fmtDb(L.faderDb(P.fader)) + " dB"; } });

    // level history (gate thresholds, compressor) and the check
    var histCv = el("canvas", "lk-hist"); host.appendChild(histCv);
    histCv.title = "The last 4 seconds: the level the gate sees (grey), the gate threshold (green), what comes out (amber)";
    var checkBar = el("div", "lk-tries"), checkB = el("button", null, "Check my channel"), checkBox = el("div", "lk-check");
    var goal = host.dataset.goal; if (goal || quiz) { checkBar.appendChild(checkB); host.appendChild(checkBar); host.appendChild(checkBox); }
    checkB.addEventListener("click", function () { renderCheck(self.check()); });

    function push() {
      fv.textContent = fmtDb(L.faderDb(P.fader)) + " dB";
      if (node) node.port.postMessage({ P: Object.assign({}, P) }); drawEq();
    }
    function refresh() {
      knobs.forEach(function (k) { k.draw(); });
      invB.classList.toggle("lk-on", !!P.inv); lcB.classList.toggle("lk-on", !!P.lc); muteB.classList.toggle("lk-on", !!P.mute);
      secs.forEach(function (s) { if (s.btn) s.btn.classList.toggle("lk-on", !!P[s.key]); });
      push();
    }
    this.refresh = refresh;

    function css(v, f) { return getComputedStyle(host).getPropertyValue(v).trim() || f; }
    var spec = null;
    function sizeCv(cv) { var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, W = Math.max(200, r.width), H = r.height || 120; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); } var x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); return { x: x, W: W, H: H }; }
    function drawEq() {
      var c = sizeCv(eqCv), x = c.x, W = c.W, H = c.H, fx = function (f) { return Math.log(f / 20) / Math.log(1000) * W; }, dy = function (d) { return H / 2 - d / 36 * H; };
      x.clearRect(0, 0, W, H); x.font = "9px ui-monospace,monospace"; x.fillStyle = "#6b7177"; x.strokeStyle = "#2c3035"; x.lineWidth = 1;
      [50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach(function (f) { var X = fx(f); x.beginPath(); x.moveTo(X, 0); x.lineTo(X, H); x.stroke(); x.fillText(f < 1000 ? f : f / 1000 + "k", X + 2, H - 3); });
      [-12, 0, 12].forEach(function (d) { x.beginPath(); x.moveTo(0, dy(d)); x.lineTo(W, dy(d)); x.stroke(); x.fillText((d > 0 ? "+" : "") + d, 2, dy(d) - 2); });
      if (an && spec) { an.getFloatFrequencyData(spec); x.fillStyle = "rgba(120,170,220,.28)"; x.beginPath(); x.moveTo(0, H);
        for (var X = 0; X < W; X += 2) { var f = 20 * Math.pow(1000, X / W), b = Math.round(f / (SR / 2) * spec.length), v = spec[Math.min(b, spec.length - 1)]; x.lineTo(X, clamp(H - (v + 100) / 80 * H, 0, H)); }
        x.lineTo(W, H); x.fill(); }
      var list = L.filters(P, SR); x.strokeStyle = "#f2a33a"; x.lineWidth = 2; x.beginPath();
      for (X = 0; X <= W; X += 2) { var f2 = 20 * Math.pow(1000, X / W), d = L.magDb(list, f2, SR); X ? x.lineTo(X, clamp(dy(d), 0, H)) : x.moveTo(X, clamp(dy(d), 0, H)); }
      x.stroke();
      if (P.eq) { var bf = P["e" + band + "f"]; x.fillStyle = "#f2a33a"; x.beginPath(); x.arc(fx(bf), clamp(dy(L.magDb(list, bf, SR)), 4, H - 4), 4, 0, 7); x.fill(); }
    }
    function drawHist() {
      var c = sizeCv(histCv), x = c.x, W = c.W, H = c.H, dy = function (d) { return clamp(-d / 72 * H, 0, H); }, N = 280;
      x.clearRect(0, 0, W, H); x.font = "9px ui-monospace,monospace"; x.fillStyle = "#6b7177"; x.strokeStyle = "#2c3035";
      [-12, -24, -36, -48, -60].forEach(function (d) { x.beginPath(); x.moveTo(0, dy(d)); x.lineTo(W, dy(d)); x.stroke(); x.fillText(d, 2, dy(d) - 2); });
      function line(k, col, w) { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); hist.forEach(function (h, i) { var X = W - (hist.length - i) * W / N, Y = dy(h[k]); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke(); }
      line("det", "#8a9096", 1.2); line("out", "#f2a33a", 1.6);
      if (P.gate) { x.strokeStyle = "#3fb950"; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(0, dy(P.gthr)); x.lineTo(W, dy(P.gthr)); x.stroke(); x.setLineDash([]); x.fillStyle = "#3fb950"; x.fillText("gate", W - 26, dy(P.gthr) - 2); }
      if (P.dyn) { x.strokeStyle = "#d9822b"; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(0, dy(P.dthr)); x.lineTo(W, dy(P.dthr)); x.stroke(); x.setLineDash([]); x.fillStyle = "#d9822b"; x.fillText("comp", W - 30, dy(P.dthr) + 9); }
    }
    function tick() {
      var m = meters; inM.set(m.inPk == null ? -120 : m.inPk, m.inPk == null ? -120 : m.inPk); oM.set(m.outPk == null ? -120 : m.outPk, m.outPk == null ? -120 : m.outPk);
      gM.set(m.gr || 0); cM.set(m.cr || 0); if (m.clip) { clipLatched = true; } clipL.classList.toggle("lk-over", clipLatched);
      drawEq(); drawHist(); raf = node ? requestAnimationFrame(tick) : 0;
    }

    function setSource(id) {
      srcId = id; status.textContent = "Making the sound…";
      return sourceData(id).then(function (s) { status.textContent = quiz ? "" : SOURCES[id].label; if (node) node.port.postMessage({ buf: s.data, lab: s.lab, right: SOURCES[id].right }); stats = null; });
    }
    sel.addEventListener("change", function () { var S = SOURCES[sel.value]; Object.assign(P, DEF); P.gain = S.right; startP = Object.assign({}, P); setSource(sel.value); refresh(); checkBox.innerHTML = ""; });
    this.play = function () {
      if (current && current !== self) current.stop();
      current = self; host.classList.add("lk-live"); playB.textContent = "■ Stop"; playB.classList.add("lk-on");
      return getCtx().then(function (c) {
        return sourceData(srcId).then(function (s) {
          if (current !== self) return;
          node = new AudioWorkletNode(c, "x32-strip", { numberOfInputs: 0, outputChannelCount: [1] });
          an = c.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0.8; spec = new Float32Array(an.frequencyBinCount);
          node.connect(an); an.connect(master);
          node.port.onmessage = function (e) { var d = e.data; if (d.m) { meters = d.m; hist.push({ det: d.m.det, out: d.m.outPk }); if (hist.length > 280) hist.shift(); } if (d.stats) { stats = d.stats; self.stats = stats; } };
          node.port.postMessage({ buf: s.data, lab: s.lab, right: SOURCES[srcId].right, P: Object.assign({}, P), play: true });
          status.textContent = quiz ? "" : SOURCES[srcId].label; tick();
        });
      });
    };
    this.stop = function () {
      if (node) { node.port.postMessage({ play: false }); node.disconnect(); node = null; }
      if (current === self) current = null; host.classList.remove("lk-live"); playB.textContent = "▶ Play"; playB.classList.remove("lk-on");
      cancelAnimationFrame(raf); raf = 0; meters = {};
    };
    playB.addEventListener("click", function () { node ? self.stop() : self.play(); });
    resetB.addEventListener("click", function () { Object.assign(P, startP); clipLatched = false; refresh(); checkBox.innerHTML = ""; });
    wavB.addEventListener("click", function () {
      sourceData(srcId).then(function (s) { var a = el("a"); a.href = URL.createObjectURL(wav(s.data, 4)); a.download = "live-sound-" + srcId + ".wav"; document.body.appendChild(a); a.click(); a.remove(); });
    });

    // ---------- the checks ----------
    this.check = function () {
      var g = quiz && qProblem ? (qProblem.kind === "hot" || qProblem.kind === "low" ? "gain" : qProblem.kind) : (goal === "auto" || !goal ? SOURCES[srcId].goal : goal);
      var R = [], st = stats, add = function (ok, txt) { R.push({ ok: !!ok, text: txt }); };
      if (!st) return { ready: false, items: [{ ok: false, text: "Play it all the way through once (8 seconds) with your settings, then check." }] };
      var pk = st.inPk;
      if (g === "gain" || true) {
        if (st.clips > 0) add(false, "The input clipped (" + st.clips + " samples over 0 dBFS). Turn the Gain down; the fader can't undo it.");
        else if (g === "gain") add(pk >= -18 && pk <= -4, "Input peaks at " + fmtDb(pk) + " dBFS" + (pk < -18 ? ": too low, raise the Gain (not the fader)." : pk > -4 ? ": too close to clipping, a little less Gain." : ": a healthy level with headroom."));
        else add(pk > -30, "Input level " + fmtDb(pk) + " dBFS" + (pk <= -30 ? ": set the Gain first." : "."));
      }
      if (g === "gain") { var fd = L.faderDb(P.fader); add(fd > -15 && fd < 6, "Fader at " + fmtDb(fd) + " dB" + (fd >= 6 ? ": near the top means the gain is too low." : fd <= -15 ? ": far down; with the gain right it should sit near 0 dB." : ": near 0 dB, with room both ways.")); }
      if (g === "gate") {
        add(P.gate, P.gate ? "Gate on." : "Turn the Gate on.");
        if (P.gate) {
          add(st.hit != null && st.hit > -3, st.hit != null && st.hit > -3 ? "Every hit gets through, start included." : "Some hits are cut or their start is lost (" + fmtDb(st.hit) + " dB at the start): lower the Threshold, or shorten the Attack.");
          add(st.bleed != null && st.bleed < -15, st.bleed != null && st.bleed < -15 ? "Between hits the bleed is down " + Math.round(-st.bleed) + " dB." : "The bleed still gets through (" + fmtDb(st.bleed) + " dB): raise the Threshold until the snare stops opening it, or shorten Hold/Release.");
          if (st.tail != null) add(st.tail > -8, st.tail > -8 ? "The tom's ring is kept." : "The ring is chopped off (" + fmtDb(st.tail) + " dB, 0.1 s after the hit): a longer Hold or Release.");
        }
      }
      if (g === "comp") {
        var raw = srcId === "bass" ? 12 : 18, diff = st.loud != null && st.quiet != null ? st.loud - st.quiet : null, target = srcId === "bass" ? 6 : 10;
        add(P.dyn, P.dyn ? "Compressor on." : "Turn Dynamics on.");
        if (P.dyn && diff != null) {
          add(diff <= target, "Loud parts are " + diff.toFixed(1) + " dB above the quiet ones (was about " + raw + ")" + (diff <= target ? "." : ": a lower Threshold or a higher Ratio."));
          var lg = -(st.loudGr || 0);
          add(lg <= 14, lg > 14 ? "It's turning the loud parts down " + lg.toFixed(0) + " dB on average: squashed. Ease the Threshold or Ratio." : "Gain reduction on the loud parts about " + lg.toFixed(0) + " dB.");
          add(P.datt >= 1, P.datt >= 1 ? "Attack " + fmtMs(P.datt) + "." : "Attack at 0 ms flattens every consonant / pluck; try 5-20 ms.");
          add(st.outPk > -14, st.outPk > -14 ? "Makeup Gain or the fader brings it back up." : "It got quieter overall: add makeup Gain.");
        }
      }
      if (g === "eq") {
        var cutIn = function (lo, hi, amt) { if (!P.eq) return false; for (var b = 1; b <= 4; b++) { var t = P["e" + b + "t"], f = P["e" + b + "f"], gg = P["e" + b + "g"]; if ((t === 2 || t === 3 || t === 1 || t === 4) && gg <= -amt && f >= lo && f <= hi) return true; } return false; };
        var boost = function (lo, hi, amt) { for (var b = 1; b <= 4; b++) { var f = P["e" + b + "f"], gg = P["e" + b + "g"], t = P["e" + b + "t"]; if (P.eq && gg >= amt && f >= lo && f <= hi && t > 0 && t < 5) return true; } return false; };
        if (srcId === "mud") {
          add(P.lc && P.lcf >= 70 && P.lcf <= 200, P.lc ? (P.lcf < 70 ? "Low cut at " + fmtHz(P.lcf) + ": higher, the rumble is still there." : P.lcf > 200 ? "Low cut at " + fmtHz(P.lcf) + ": too high, the voice gets thin." : "Low cut at " + fmtHz(P.lcf) + ": rumble and thumps gone.") : "Turn the LOW CUT on (in Config/Preamp) for the rumble and thumps.");
          add(cutIn(160, 500, 3), cutIn(160, 500, 3) ? "A cut in the boom region (200-400 Hz)." : "Still boomy: cut 4-8 dB somewhere around 200-400 Hz (sweep to find it).");
          add(!boost(20, 500, 3), boost(20, 500, 3) ? "You're boosting the lows: that makes the mud worse." : "No low boosts.");
        } else if (srcId === "guitar") {
          add(cutIn(2200, 4600, 4), cutIn(2200, 4600, 4) ? "The harsh peak around 3 kHz is cut." : "Still harsh: sweep a narrow boost to find the ugly peak (around 3 kHz), then cut it 5-10 dB.");
          var fizz = P.eq && [1, 2, 3, 4].some(function (b) { var t = P["e" + b + "t"]; return (t === 5 && P["e" + b + "f"] < 12000) || (t === 4 && P["e" + b + "g"] <= -3); });
          add(fizz, fizz ? "The fizz on top is tamed." : "Some fizz left on top: a high shelf cut or a high cut (HCut) around 7-10 kHz.");
          add(!boost(2000, 5000, 3), boost(2000, 5000, 3) ? "You're boosting the harsh region." : "No boosts in the harsh region.");
        } else add(true, "EQ to taste.");
      }
      return { ready: true, ok: R.every(function (r) { return r.ok; }), items: R };
    };
    function renderCheck(r) {
      checkBox.innerHTML = ""; var ul = el("ul");
      r.items.forEach(function (it) { ul.appendChild(el("li", it.ok ? "lk-ok" : "lk-no", it.text)); });
      if (r.ready) checkBox.appendChild(el("div", null, r.ok ? "Channel fixed." : "Not yet:")); checkBox.appendChild(ul);
    }

    host.lk = { set: function (k, v) { P[k] = v; refresh(); }, P: P, get stats() { return stats; }, get meters() { return meters; }, check: this.check,
      play: this.play, stop: this.stop, get source() { return srcId; }, setSource: function (id) { sel.value = id; sel.dispatchEvent(new Event("change")); }, strip: this };
    buildBand();
    if (quiz) newProblem(); else setSource(srcId);
    refresh();
  }

  function init() { document.querySelectorAll(".lk[data-w=strip]").forEach(function (h) { if (!h.lk) try { new Strip(h); } catch (e) { h.textContent = "Couldn't build the channel: " + e.message; } }); }
  window.LiveKit = { init: init, SOURCES: SOURCES, L: L };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
