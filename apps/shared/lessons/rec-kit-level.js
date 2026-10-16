// rec-kit-level.js — the recording lessons about level (gain staging, loudness). Plain Web Audio, nothing shared with the
// band or synth-kit.js; it only borrows the .sk-w card styles from lessons/_synth-kit.qmd. Every <div class="rk" data-w="...">
// becomes a widget. Everything is generated (no samples); one widget sounds at a time (▶ / ■); the output goes through a
// fixed -6 dB trim, a volume slider (default 0.5), a limiter and a hard clamp, so nothing can blast.
//   gainstage  a mic-level source (data-source="voice" or "drums", changeable) -> preamp gain (0-60 dB) -> a converter that
//              clips hard at 0 dBFS -> a DAW fader (-40..+6 dB). The mic has a constant hiss, and the interface adds a little
//              of its own after the preamp. Meters in dBFS (bar = RMS, tick = held peak; marks at -18 -12 -6 0) before and
//              after the fader, a red CLIP light that latches (click it to reset), and the signal-to-noise ratio.
//              Preset buttons: Too quiet / Just right / Too hot. Shows that the fader after the converter cannot undo clipping,
//              and that low gain with the fader up raises the hiss along with the signal.
//   loudness   an 8-second song-like loop (drums, bass, pads, a lead) -> input drive (0-20 dB) -> a look-ahead brickwall limiter
//              (ceiling -6..0 dBFS) -> ITU-R BS.1770 meters: K-weighting (two biquads), 400 ms momentary, 3 s short-term,
//              gated integrated (-70 absolute, -10 relative), and an approximate true peak (4x oversampled, 12-tap sinc).
//              The loop is periodic, so the meters are computed for the whole loop and read at the playhead.
//              A "streaming normalisation" button turns the output down to -14 LUFS integrated (down only, like most services),
//              so the listener hears that a crushed master gets quieter and smaller, not louder.
//              Preset buttons: Dynamic / Loud / Crushed.
// Optional attributes: data-title, data-source (gainstage: voice | drums).
(function () {
  "use strict";
  var SR = 44100, AC = window.AudioContext || window.webkitAudioContext, ctx = null, current = null;

  function getCtx() { if (!ctx) ctx = new AC(); if (ctx.state === "suspended") ctx.resume(); return ctx; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function db2g(d) { return Math.pow(10, d / 20); }
  function g2db(g) { return 20 * Math.log10(Math.max(g, 1e-9)); }
  function fmt(v, d) { if (!isFinite(v)) return "−∞"; return v.toFixed(d == null ? 1 : d).replace("-", "−"); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- styles (only what _synth-kit.qmd lacks)
  if (!document.getElementById("rk-style")) {
    var st = el("style"); st.id = "rk-style";
    st.textContent =
      ".rk-meter{width:100%;height:84px;display:block;border:1px solid var(--site-border);border-radius:6px;margin:.3rem 0}" +
      ".rk-meter.rk-three{height:112px}" +
      ".rk-light{display:inline-block;width:.95rem;height:.95rem;border-radius:50%;background:var(--site-border);vertical-align:-.15rem;margin-right:.3rem;cursor:pointer;border:1px solid var(--site-border)}" +
      ".rk-light.rk-hot{background:#e5322d;border-color:#e5322d;box-shadow:0 0 6px #e5322d}" +
      ".rk-clipl{font-family:var(--font-mono);font-size:.72rem;color:var(--site-ink-2);margin-right:.9rem}" +
      ".rk-read{display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:.15rem .8rem;font-family:var(--font-mono);font-size:.76rem;color:var(--site-ink-2);margin:.2rem 0 .4rem}" +
      ".rk-read b{color:var(--site-ink);font-weight:600}";
    document.head.appendChild(st);
  }

  // ---- ui helpers
  function slider(parent, label, min, max, step, val, f, cb) {
    var w = el("label", "sk-c"), nm = el("span", "sk-cl", label), o = el("output"), r = el("input");
    r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = val;
    function show() { o.textContent = f(+r.value); } show();
    r.addEventListener("input", function () { show(); cb(+r.value); });
    w.appendChild(nm); w.appendChild(o); w.appendChild(r); parent.appendChild(w);
    return { set: function (v) { r.value = v; show(); cb(+r.value); }, get: function () { return +r.value; } };
  }
  function select(parent, label, opts, val, cb) {
    var w = el("label", "sk-c sk-s"), s = el("select");
    w.appendChild(el("span", "sk-cl", label));
    opts.forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; s.appendChild(op); });
    s.value = val; s.addEventListener("change", function () { cb(s.value); });
    w.appendChild(s); parent.appendChild(w); return s;
  }
  function button(parent, txt, cb, cls) {
    var b = el("button", "btn btn-sm " + (cls || "btn-outline-secondary"), txt); b.type = "button";
    b.addEventListener("click", cb); parent.appendChild(b); return b;
  }
  function readout(parent, labels) {
    var box = el("div", "rk-read"), out = {};
    labels.forEach(function (l) { var s = el("span", null, l[1] + " "), b = el("b", null, "–"); s.appendChild(b); box.appendChild(s); out[l[0]] = b; });
    parent.appendChild(box); return out;
  }

  // The card: header with ▶/■, controls grid, body. impl.start(c, tok) may return a promise; it must check w.tok === tok
  // after waiting before it builds anything. impl.stop() tears the graph down.
  function shell(host, title, impl) {
    host.classList.add("sk-w"); host.innerHTML = "";
    var w = { host: host, on: false, tok: 0 };
    var head = el("div", "sk-head"), tools = el("div", "sk-tools");
    head.appendChild(el("strong", "sk-title", host.dataset.title || title)); head.appendChild(tools);
    w.btn = button(tools, "▶ Play", function () { w.on ? w.stop() : w.start(); }, "btn-outline-primary");
    w.status = el("span", "sk-status", ""); tools.appendChild(w.status);
    w.ctls = el("div", "sk-ctls"); w.body = el("div");
    host.appendChild(head); host.appendChild(w.ctls); host.appendChild(w.body);
    function ui() { w.btn.textContent = w.on ? "■ Stop" : "▶ Play"; w.btn.classList.toggle("sk-on", w.on); host.classList.toggle("sk-live", w.on); }
    w.start = function () {
      if (current && current !== w) current.stop();
      current = w; w.on = true; var tok = ++w.tok; ui(); w.status.textContent = "preparing…";
      Promise.resolve(impl.start(getCtx(), tok)).then(function () { if (w.tok === tok) w.status.textContent = ""; })
        .catch(function (e) { w.status.textContent = "audio error: " + e.message; w.on = false; ui(); });
    };
    w.stop = function () { if (!w.on) return; w.on = false; w.tok++; impl.stop(); ui(); if (current === w) current = null; w.status.textContent = ""; };
    return w;
  }

  // Final safety: fixed -6 dB trim x volume, a limiter, a hard clamp at 0.98. Returns the input node and the volume param.
  function master(c, nodes, vol) {
    var trim = c.createGain(); trim.gain.value = 0.5 * vol;
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -6; comp.knee.value = 0; comp.ratio.value = 20; comp.attack.value = 0.001; comp.release.value = 0.1;
    var cl = c.createWaveShaper(); cl.curve = new Float32Array([-0.98, 0.98]);
    trim.connect(comp); comp.connect(cl); cl.connect(c.destination);
    nodes.push(trim, comp, cl);
    return { input: trim, setVol: function (v) { trim.gain.setTargetAtTime(0.5 * v, c.currentTime, 0.02); } };
  }

  // ---- meter canvas: rows {label, bar, tick, text, red}; values in the dB range lo..hi; marks [{v, label, strong}]
  function drawMeter(cv, rows, lo, hi, marks) {
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var x = cv.getContext("2d"), cs = getComputedStyle(cv);
    function col(n, d) { return (cs.getPropertyValue(n) || "").trim() || d; }
    var ink = col("--site-ink", "#222"), ink2 = col("--site-ink-2", "#666"), bord = col("--site-border", "#ccc"), acc = col("--site-accent", "#2a6fdb");
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    var x0 = 6, x1 = W - 78, top = 3, bot = 15, rh = (H - top - bot) / rows.length;
    function xo(v) { return x0 + (clamp(v, lo, hi) - lo) / (hi - lo) * (x1 - x0); }
    x.font = "10px ui-monospace,Menlo,monospace"; x.textBaseline = "middle";
    rows.forEach(function (r, i) {
      var y = top + i * rh + 2, h = rh - 4;
      x.fillStyle = bord; x.globalAlpha = 0.35; x.fillRect(x0, y, x1 - x0, h); x.globalAlpha = 1;
      if (isFinite(r.bar) && r.bar > lo) { x.fillStyle = acc; x.fillRect(x0, y, xo(r.bar) - x0, h); }
      if (r.tick != null && isFinite(r.tick) && r.tick > lo) { x.fillStyle = r.red ? "#e5322d" : ink; x.fillRect(xo(r.tick) - 1.5, y - 1, 3, h + 2); }
    });
    marks.forEach(function (m) {
      var mx = xo(m.v);
      x.strokeStyle = m.strong ? ink : ink2; x.globalAlpha = m.strong ? 0.9 : 0.5; x.setLineDash(m.strong ? [] : [2, 3]);
      x.beginPath(); x.moveTo(mx, top); x.lineTo(mx, H - bot + 2); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
      x.fillStyle = ink2; x.textAlign = "center"; x.fillText(m.label, mx, H - 6);
    });
    rows.forEach(function (r, i) {
      var y = top + i * rh + rh / 2;
      x.textAlign = "left"; x.fillStyle = ink; x.fillText(r.label, x0 + 4, y);
      x.textAlign = "right"; x.fillText(r.text || "", W - 4, y);
    });
  }

  // ---- offline sound generators (mono, 44100 Hz)
  var cache = {};
  function render(key, secs, build, post) {
    if (cache[key]) return cache[key];
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, oc = new OC(1, Math.ceil(secs * SR), SR);
    build(oc, oc.destination);
    return (cache[key] = oc.startRendering().then(function (b) { var d = b.getChannelData(0).slice(); return post ? post(d) : d; }));
  }
  function peakNorm(d, p) { var m = 1e-9, i; for (i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); for (i = 0; i < d.length; i++) d[i] *= p / m; return d; }
  function noiseBuf(c, secs) { var b = c.createBuffer(1, Math.ceil(secs * c.sampleRate), c.sampleRate), a = b.getChannelData(0); for (var i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; return b; }
  function env(c, d, t, a, dur, rel, peak) {
    var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(dur, a)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a) + rel); g.connect(d); return g;
  }
  function decay(c, d, t, amp, len) { var g = c.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); g.connect(d); return g; }
  function kick(c, d, t, amp) {
    var o = c.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
    o.connect(decay(c, d, t, amp, 0.35)); o.start(t); o.stop(t + 0.4);
  }
  function snare(c, d, t, amp, nb) {
    var s = c.createBufferSource(); s.buffer = nb; var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.8;
    s.connect(f); f.connect(decay(c, d, t, amp, 0.2)); s.start(t, Math.random() * 0.5); s.stop(t + 0.25);
    var o = c.createOscillator(); o.type = "triangle"; o.frequency.value = 190; o.connect(decay(c, d, t, amp * 0.5, 0.1)); o.start(t); o.stop(t + 0.15);
  }
  function hat(c, d, t, amp, nb, open) {
    var s = c.createBufferSource(); s.buffer = nb; var f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
    var len = open ? 0.2 : 0.045; s.connect(f); f.connect(decay(c, d, t, amp, len)); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
  }
  function tone(c, d, t, type, f, dur, rel, peak, cutoff, detune) {
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cutoff; lp.connect(env(c, d, t, 0.008, dur, rel, peak));
    (detune ? [-detune, detune] : [0]).forEach(function (dt) {
      var o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + rel + 0.05);
    });
  }
  var VOICE_LEN = 6, DRUM_LEN = 4.8, SONG_LEN = 8;
  function voiceData() {
    return render("voice", VOICE_LEN, function (c, d) {
      var nb = noiseBuf(c, 1), V = { a: [730, 1090], o: [570, 840], e: [530, 1840] };
      [[0.15, 196, 0.35, "a"], [1.6, 220, 0.5, "o"], [3.0, 247, 0.7, "e"], [4.4, 294, 1.0, "a"]].forEach(function (n) {
        var t = n[0], f = n[1], dur = 1.1, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), e = env(c, d, t, 0.06, dur, 0.25, n[2]);
        o.type = "sawtooth"; o.frequency.value = f; lfo.frequency.value = 5.5;
        lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.5); lfo.connect(lg); lg.connect(o.frequency);
        V[n[3]].forEach(function (fc, i) {
          var b = c.createBiquadFilter(), g = c.createGain(); b.type = "bandpass"; b.frequency.value = fc; b.Q.value = 5; g.gain.value = i ? 0.6 : 1;
          o.connect(b); b.connect(g); g.connect(e);
        });
        var s = c.createBufferSource(), bf = c.createBiquadFilter(), bg = c.createGain(); s.buffer = nb; bf.type = "bandpass"; bf.frequency.value = 3500; bg.gain.value = 0.12;
        s.connect(bf); bf.connect(bg); bg.connect(e); s.start(t); s.stop(t + dur + 0.3);
        o.start(t); o.stop(t + dur + 0.3); lfo.start(t); lfo.stop(t + dur + 0.3);
      });
    }, function (d) { return peakNorm(d, 1); });
  }
  function drumData() {
    return render("drums", DRUM_LEN, function (c, d) {
      var nb = noiseBuf(c, 1), B = 0.6, i;
      [0, 2.5, 4, 6.5, 7].forEach(function (b) { kick(c, d, b * B, 0.9); });
      [2, 6].forEach(function (b) { snare(c, d, b * B, 0.7, nb); }); snare(c, d, 7.5 * B, 0.2, nb);
      for (i = 0; i < 16; i++) hat(c, d, i * B / 2, i % 2 ? 0.2 : 0.35, nb, i === 7);
    }, function (d) { return peakNorm(d, 1); });
  }

  // ---- BS.1770 pieces
  function kcoefs(fs) {
    var f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan(Math.PI * f0 / fs), Vh = db2g(G), Vb = Math.pow(Vh, 0.499666774155);
    var a0 = 1 + K / Q + K * K, s1 = { b: [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], a: [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] };
    f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / fs); a0 = 1 + K / Q + K * K;
    return [s1, { b: [1, -2, 1], a: [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] }];
  }
  function biq(x, c) {
    var y = new Float64Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0, v;
    for (var i = 0; i < x.length; i++) { v = c.b[0] * x[i] + c.b[1] * x1 + c.b[2] * x2 - c.a[1] * y1 - c.a[2] * y2; y[i] = v; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; }
    return y;
  }
  function lufs(ms) { return -0.691 + 10 * Math.log10(ms + 1e-12); }
  // x is one period of a looping signal. Returns prefix sums of the K-weighted power over two periods, and the integrated loudness.
  function analyse(x) {
    var N = x.length, xx = new Float64Array(2 * N), i, k = kcoefs(SR);
    for (i = 0; i < N; i++) xx[i] = xx[i + N] = x[i];
    var z = biq(biq(xx, k[0]), k[1]), ps = new Float64Array(2 * N + 1);
    for (i = 0; i < 2 * N; i++) { var zi = i < N ? z[i + N] : z[i]; ps[i + 1] = ps[i] + zi * zi; }
    // the second pass of the filter is the steady state; the first half of ps uses the same values as the second
    var w = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), ls = [], s;
    for (s = 0; s < N; s += hop) ls.push((ps[s + w] - ps[s]) / w);
    var kept = ls.filter(function (m) { return lufs(m) > -70; });
    if (!kept.length) return { ps: ps, I: -Infinity };
    var rel = lufs(kept.reduce(function (a, b) { return a + b; }, 0) / kept.length) - 10;
    kept = kept.filter(function (m) { return lufs(m) > rel; });
    return { ps: ps, I: kept.length ? lufs(kept.reduce(function (a, b) { return a + b; }, 0) / kept.length) : -Infinity };
  }
  function window_(ps, N, end, secs) { var w = Math.round(secs * SR), e = end + N; return lufs((ps[e] - ps[e - w]) / w); }
  var TPK = null;
  function truePeak(y) {
    var N = y.length, T = 6, i, j, p, pk = 0;
    if (!TPK) {
      TPK = [];
      for (p = 1; p < 4; p++) {
        var f = p / 4, h = [];
        for (j = -T + 1; j <= T; j++) { var u = j - f, sinc = Math.sin(Math.PI * u) / (Math.PI * u); h.push(sinc * 0.5 * (1 + Math.cos(Math.PI * u / T))); }
        TPK.push(h);
      }
    }
    for (i = 0; i < N; i++) pk = Math.max(pk, Math.abs(y[i]));
    var thr = pk * 0.5, tp = pk;
    for (i = 0; i < N; i++) {
      if (Math.abs(y[i]) < thr && Math.abs(y[(i + 1) % N]) < thr) continue;
      for (p = 0; p < 3; p++) {
        var h2 = TPK[p], s = 0;
        for (j = 0; j < 2 * T; j++) s += y[(i + j - T + 1 + N) % N] * h2[j];
        tp = Math.max(tp, Math.abs(s));
      }
    }
    return tp;
  }
  // look-ahead brickwall limiter (2 ms look-ahead, 100 ms release); x is one period, treated as circular
  function limit(x, ceil) {
    var N = x.length, L = Math.round(0.002 * SR), m = new Float32Array(N), i, k, j, a, r;
    for (i = 0; i < N; i++) m[i] = 1;
    for (i = 0; i < N; i++) {
      a = Math.abs(x[i]);
      if (a > ceil) { r = ceil / a; for (k = 0; k < L; k++) { j = i - k; if (j < 0) j += N; if (r < m[j]) m[j] = r; } }
    }
    var rc = 1 - Math.exp(-1 / (0.1 * SR)), s = new Float32Array(N), cur = 1, p, n;
    for (p = 0; p < 2 * N; p++) { n = p % N; var v = m[n]; cur = v < cur ? v : Math.min(v, cur + (1 - cur) * rc); if (p >= N) s[n] = cur; }
    var sum = 0, y = new Float32Array(N), gmin = 1, gs = 0, gc = 0, g;
    for (k = 0; k < L; k++) sum += s[(N - k) % N];
    for (n = 0; n < N; n++) {
      if (n > 0) sum += s[n] - s[(n - L + N) % N];
      g = sum / L; y[n] = x[n] * g;
      if (g < gmin) gmin = g; if (g < 0.999) { gs += g2db(g); gc++; }
    }
    return { y: y, grMax: -g2db(gmin), grAvg: gc ? -gs / gc : 0 };
  }
  function songData() {
    return render("song", SONG_LEN + 1, function (c, d) {
      var nb = noiseBuf(c, 1), B = 0.5, bar, i, t;
      var chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 261.63, 329.63], [196, 246.94, 293.66]], roots = [55, 43.65, 65.41, 49];
      for (bar = 0; bar < 4; bar++) {
        var t0 = bar * 4 * B, ch = chords[bar];
        ch.forEach(function (f) { tone(c, d, t0, "sawtooth", f, 3 * B * 2 / 2 + 0.5, 0.3, 0.05, 1200, 7); });
        [1.5, 3.5].forEach(function (b) { ch.forEach(function (f) { tone(c, d, t0 + b * B, "sawtooth", f * 2, 0.08, 0.15, 0.05, 2800, 0); }); });
        for (i = 0; i < 8; i++) tone(c, d, t0 + i * B / 2, "square", roots[bar] * (i % 2 ? 2 : 1), 0.16, 0.05, 0.28, 500, 0);
        for (i = 0; i < 8; i++) tone(c, d, t0 + i * B / 2, "triangle", ch[(i * 2 + bar) % 3] * (i % 4 > 1 ? 4 : 2), 0.06, 0.2, 0.07, 6000, 0);
        for (i = 0; i < 4; i++) { t = t0 + i * B; kick(c, d, t, 1); if (i % 2) snare(c, d, t, 0.6, nb); }
        for (i = 0; i < 8; i++) hat(c, d, t0 + i * B / 2, i % 2 ? 0.25 : 0.14, nb, i === 7);
      }
    }, function (full) {
      var N = SONG_LEN * SR, out = new Float32Array(N), i;
      for (i = 0; i < N; i++) out[i] = full[i];
      for (i = 0; i < full.length - N; i++) out[i] += full[N + i];   // tails past the end ring over the start
      var a = analyse(out), g = db2g(-20 - a.I);
      for (i = 0; i < N; i++) out[i] *= g;
      return out;
    });
  }

  // ---- noise for the gain-stage widget: Gaussian, rms 1, an independent buffer per use
  var NZ = [];
  function gauss(k) {
    if (NZ[k]) return NZ[k];
    var n = 3 * SR, a = new Float32Array(n), i, u, v, s = 0;
    for (i = 0; i < n; i++) { u = Math.random() || 1e-9; v = Math.random(); a[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); s += a[i] * a[i]; }
    s = Math.sqrt(s / n); for (i = 0; i < n; i++) a[i] /= s;
    return (NZ[k] = a);
  }
  function toBuf(c, data) { var b = c.createBuffer(1, data.length, SR); b.copyToChannel(data, 0); return b; }
  function loopSrc(c, data, nodes, randomStart) {
    var s = c.createBufferSource(); s.buffer = toBuf(c, data); s.loop = true; s.start(0, randomStart ? Math.random() * data.length / SR : 0); nodes.push(s); return s;
  }
  function hardClipper(c) { var s = c.createWaveShaper(); s.curve = new Float32Array([-1, 1]); return s; }
  function analyser(c, nodes) { var a = c.createAnalyser(); a.fftSize = 2048; a.smoothingTimeConstant = 0; nodes.push(a); return a; }
  function peakPow(buf) { var pk = 0, p = 0; for (var i = 0; i < buf.length; i++) { var a = Math.abs(buf[i]); if (a > pk) pk = a; p += buf[i] * buf[i]; } return [pk, p / buf.length]; }
  function killAll(nodes) { nodes.forEach(function (n) { try { if (n.stop) n.stop(); } catch (e) { } try { n.disconnect(); } catch (e) { } }); }

  // ================= gainstage
  var MIC_DB = -96, FLOOR_DB = -66, SRC_PEAK_DB = -48;
  function gainstage(host) {
    var S = { src: host.dataset.source === "drums" ? "drums" : "voice", G: 40, F: 0, V: 0.5 }, g = null, raf = 0, latched = false;
    var w = shell(host, "Gain staging: microphone, preamp, converter, fader", { start: start, stop: stop });
    select(w.ctls, "Source", [["voice", "Voice (sung vowels)"], ["drums", "Drum loop"]], S.src, function (v) { S.src = v; if (w.on) { w.stop(); w.start(); } });
    var sg = slider(w.ctls, "Preamp gain", 0, 60, 0.5, S.G, function (v) { return fmt(v) + " dB"; }, function (v) { S.G = v; if (g) { g.preA.gain.setTargetAtTime(db2g(v), g.c.currentTime, 0.02); g.preB.gain.setTargetAtTime(db2g(v), g.c.currentTime, 0.02); } });
    var sf = slider(w.ctls, "DAW fader (after the converter)", -40, 6, 0.5, S.F, function (v) { return fmt(v) + " dB"; }, function (v) { S.F = v; if (g) g.fader.gain.setTargetAtTime(db2g(v), g.c.currentTime, 0.02); });
    slider(w.ctls, "Monitor volume", 0, 1, 0.01, S.V, function (v) { return Math.round(v * 100) + "%"; }, function (v) { S.V = v; if (g) g.mst.setVol(v); });
    var pr = el("div", "sk-presets"); pr.appendChild(el("span", "sk-cl", "Try"));
    function preset(gv, fv) { latched = false; sg.set(gv); sf.set(fv); }
    button(pr, "Too quiet, fader up", function () { preset(14, 6); });
    button(pr, "Just right", function () { preset(40, 0); });
    button(pr, "Too hot, fader down", function () { preset(56, -20); });
    w.body.appendChild(pr);
    var lrow = el("div"), light = el("span", "rk-light"); light.title = "Click to reset the clip light";
    light.addEventListener("click", function () { latched = false; paintLight(); });
    lrow.appendChild(light); lrow.appendChild(el("span", "rk-clipl", "CLIP (latches at the converter; click to reset)"));
    w.body.appendChild(lrow);
    var cv = el("canvas", "rk-meter"); w.body.appendChild(cv);
    var R = readout(w.body, [["cp", "Converter peak"], ["cr", "RMS"], ["hiss", "Hiss at output"], ["sig", "Signal RMS at output"], ["snr", "Signal-to-noise"]]);
    var info = el("div", "sk-info"); w.body.appendChild(info);
    function paintLight() { light.classList.toggle("rk-hot", latched); }
    var marks = [{ v: -18, label: "−18" }, { v: -12, label: "−12" }, { v: -6, label: "−6" }, { v: 0, label: "0", strong: true }];
    function idle() { drawMeter(cv, [{ label: "Converter", bar: -Infinity }, { label: "Track out", bar: -Infinity }], -60, 6, marks); }
    function start(c, tok) {
      return (S.src === "voice" ? voiceData() : drumData()).then(function (data) {
        if (w.tok !== tok || !w.on) return;
        var nodes = [], mk = function (n) { nodes.push(n); return n; };
        g = { c: c, nodes: nodes, hold: [0, 0], holdT: [0, 0], rms: [0, 0], sigPow: 0, bC: new Float32Array(2048), bO: new Float32Array(2048), bR: new Float32Array(2048) };
        var src = loopSrc(c, data, nodes, false), srcG = mk(c.createGain()), nPre = mk(c.createGain()), nPost = mk(c.createGain());
        srcG.gain.value = db2g(SRC_PEAK_DB); nPre.gain.value = db2g(MIC_DB); nPost.gain.value = db2g(FLOOR_DB);
        g.preA = mk(c.createGain()); g.preB = mk(c.createGain()); g.preA.gain.value = g.preB.gain.value = db2g(S.G);
        var sum = mk(c.createGain()), clipA = mk(hardClipper(c)), clipB = mk(hardClipper(c));
        g.fader = mk(c.createGain()); g.fader.gain.value = db2g(S.F);
        g.anC = analyser(c, nodes); g.anO = analyser(c, nodes); g.anR = analyser(c, nodes);
        var zero = mk(c.createGain()); zero.gain.value = 0;
        g.mst = master(c, nodes, S.V);
        src.connect(srcG); srcG.connect(g.preA); loopSrc(c, gauss(0), nodes, true).connect(nPre); nPre.connect(g.preA);
        g.preA.connect(sum); loopSrc(c, gauss(1), nodes, true).connect(nPost); nPost.connect(sum); sum.connect(clipA);
        clipA.connect(g.anC); clipA.connect(g.fader); g.fader.connect(g.anO); g.fader.connect(g.mst.input);
        srcG.connect(g.preB); g.preB.connect(clipB); clipB.connect(g.anR); g.anR.connect(zero); zero.connect(c.destination);
        g.anC.connect(zero); g.anO.connect(zero);
        frame();
      });
    }
    function stop() { cancelAnimationFrame(raf); if (g) { killAll(g.nodes); g = null; } idle(); }
    function frame() {
      if (!g) return;
      g.anC.getFloatTimeDomainData(g.bC); g.anO.getFloatTimeDomainData(g.bO); g.anR.getFloatTimeDomainData(g.bR);
      var now = performance.now(), pc = peakPow(g.bC), po = peakPow(g.bO), pr2 = peakPow(g.bR), P = [pc, po], i;
      for (i = 0; i < 2; i++) {
        if (P[i][0] >= g.hold[i]) { g.hold[i] = P[i][0]; g.holdT[i] = now; } else if (now - g.holdT[i] > 1000) g.hold[i] *= 0.97;
        g.rms[i] = g.rms[i] * 0.9 + P[i][1] * 0.1;
      }
      g.sigPow = g.sigPow * 0.99 + pr2[1] * 0.01;
      if (pc[0] >= 0.999 && !latched) { latched = true; paintLight(); }
      var hotC = g.hold[0] >= 0.999, hotO = g.hold[1] >= 1;
      drawMeter(cv, [
        { label: "Converter", bar: g2db(Math.sqrt(g.rms[0])), tick: g2db(g.hold[0]), red: hotC, text: fmt(g2db(g.hold[0])) + " pk" },
        { label: "Track out", bar: g2db(Math.sqrt(g.rms[1])), tick: g2db(g.hold[1]), red: hotO, text: fmt(g2db(g.hold[1])) + " pk" }], -60, 6, marks);
      var gl = db2g(S.G), nPow = Math.pow(db2g(MIC_DB) * gl, 2) + Math.pow(db2g(FLOOR_DB), 2), snr = 10 * Math.log10((g.sigPow + 1e-14) / nPow);
      R.cp.textContent = fmt(g2db(g.hold[0])) + " dBFS";
      R.cr.textContent = fmt(g2db(Math.sqrt(g.rms[0]))) + " dBFS";
      R.hiss.textContent = fmt(10 * Math.log10(nPow) + S.F) + " dBFS";
      R.sig.textContent = fmt(10 * Math.log10(g.sigPow + 1e-14) + S.F) + " dBFS";
      R.snr.textContent = fmt(snr, 0) + " dB";
      var pk = g2db(g.hold[0]);
      info.textContent = latched ? "Clipped: the converter flattened the peaks. The fader comes after it, so turning it down only makes the crunch quieter."
        : snr < 20 ? "The hiss is close to the signal: this much noise comes from raising a quiet recording later. Raise the preamp gain instead of the fader."
        : pk < -24 ? "Very quiet at the converter. It will work, but every dB the fader adds raises the hiss too."
        : pk > -6 ? "Close to the top: one louder note could clip. Back off a few dB."
        : "In the zone: peaks around −12 to −6 dBFS, hiss far below the signal.";
      raf = requestAnimationFrame(frame);
    }
    idle();
  }

  // ================= loudness
  function loudness(host) {
    var S = { drive: 8, ceil: -1, V: 0.5, norm: false }, base = null, L = null, g = null, raf = 0, timer = 0;
    var w = shell(host, "Loudness: limiter, LUFS and streaming normalisation", { start: start, stop: stop });
    var sd = slider(w.ctls, "Input drive (into the limiter)", 0, 20, 0.5, S.drive, function (v) { return "+" + fmt(v) + " dB"; }, function (v) { S.drive = v; later(); });
    var sc = slider(w.ctls, "Limiter ceiling", -6, 0, 0.1, S.ceil, function (v) { return fmt(v) + " dBFS"; }, function (v) { S.ceil = v; later(); });
    slider(w.ctls, "Monitor volume", 0, 1, 0.01, S.V, function (v) { return Math.round(v * 100) + "%"; }, function (v) { S.V = v; if (g) g.mst.setVol(v); });
    var pr = el("div", "sk-presets"); pr.appendChild(el("span", "sk-cl", "Master"));
    button(pr, "Dynamic", function () { sd.set(1); sc.set(-1); });
    button(pr, "Loud", function () { sd.set(9); sc.set(-1); });
    button(pr, "Crushed", function () { sd.set(20); sc.set(-0.3); });
    var nb = button(pr, "Streaming normalisation to −14 LUFS: off", function () { S.norm = !S.norm; applyNorm(); }, "btn-outline-primary");
    w.body.appendChild(pr);
    var cv = el("canvas", "rk-meter rk-three"); w.body.appendChild(cv);
    var R = readout(w.body, [["m", "Momentary"], ["s", "Short-term"], ["i", "Integrated"], ["tp", "True peak"], ["plr", "Peak-to-loudness"], ["gr", "Limiter reduction"], ["ng", "Normalisation gain"]]);
    var info = el("div", "sk-info", "Press play, then compare Dynamic with Crushed with normalisation off, then on."); w.body.appendChild(info);
    var marks = [{ v: -30, label: "−30" }, { v: -23, label: "−23" }, { v: -14, label: "−14", strong: true }, { v: -9, label: "−9" }, { v: 0, label: "0" }];
    function normDb() { return S.norm && L ? Math.min(0, -14 - L.I) : 0; }
    function applyNorm() {
      nb.textContent = "Streaming normalisation to −14 LUFS: " + (S.norm ? "on" : "off"); nb.classList.toggle("sk-on", S.norm);
      if (g) g.normG.gain.setTargetAtTime(db2g(normDb()), g.c.currentTime, 0.03);
      if (L) { R.ng.textContent = fmt(normDb()) + " dB"; paint(0); }
    }
    function later() { clearTimeout(timer); if (base) timer = setTimeout(recompute, 40); }
    function recompute() {
      var N = base.length, d = db2g(S.drive), x = new Float32Array(N), i;
      for (i = 0; i < N; i++) x[i] = base[i] * d;
      var lim = limit(x, db2g(S.ceil)), a = analyse(lim.y), tp = truePeak(lim.y);
      L = { y: lim.y, ps: a.ps, I: a.I, tp: g2db(tp), grMax: lim.grMax, grAvg: lim.grAvg, N: N };
      R.i.textContent = fmt(a.I) + " LUFS"; R.tp.textContent = fmt(L.tp) + " dBTP"; R.plr.textContent = fmt(L.tp - a.I) + " dB";
      R.gr.textContent = "max " + fmt(lim.grMax) + " dB, avg " + fmt(lim.grAvg) + " dB";
      applyNorm();
      if (g) swap();
      info.textContent = "Integrated " + fmt(a.I) + " LUFS" + (a.I > -14 ? ": " + fmt(a.I + 14) + " dB louder than the streaming target, which gets turned down by that much." : ": quieter than the target, so streaming leaves it alone.");
    }
    function swap() {
      var c = g.c, now = c.currentTime, pos = ((now - g.t0) % (L.N / SR) + L.N / SR) % (L.N / SR);
      var old = g.cur; if (old) { old.g.gain.setTargetAtTime(0, now, 0.005); try { old.s.stop(now + 0.06); } catch (e) { } }
      var s = c.createBufferSource(), gg = c.createGain(); s.buffer = toBuf(c, L.y); s.loop = true; gg.gain.value = 0; gg.gain.setTargetAtTime(1, now, 0.005);
      s.connect(gg); gg.connect(g.normG); s.start(now, pos); g.nodes.push(s, gg); g.cur = { s: s, g: gg }; g.t0 = now - pos;
    }
    function paint(pos) {
      var off = normDb(), ix = Math.floor(pos * SR / 100) * 100, M = -Infinity, Sx = -Infinity;
      if (L && pos != null && g) { M = window_(L.ps, L.N, ix, 0.4) + off; Sx = window_(L.ps, L.N, ix, 3) + off; R.m.textContent = fmt(M) + " LUFS"; R.s.textContent = fmt(Sx) + " LUFS"; }
      else { R.m.textContent = R.s.textContent = "–"; }
      var I = L ? L.I + off : -Infinity;
      drawMeter(cv, [{ label: "Momentary", bar: M, text: isFinite(M) ? fmt(M) : "" }, { label: "Short-term", bar: Sx, text: isFinite(Sx) ? fmt(Sx) : "" },
        { label: "Integrated", bar: I, text: isFinite(I) ? fmt(I) : "", red: false }], -40, 0, marks);
    }
    function start(c, tok) {
      return songData().then(function (d) {
        if (w.tok !== tok || !w.on) return;
        base = d; if (!L || L.N !== d.length) recompute(); else if (!L) recompute();
        var nodes = [];
        g = { c: c, nodes: nodes, t0: c.currentTime, cur: null };
        g.normG = c.createGain(); g.normG.gain.value = db2g(normDb()); nodes.push(g.normG);
        g.mst = master(c, nodes, S.V); g.normG.connect(g.mst.input);
        swap(); frame();
      });
    }
    function stop() { cancelAnimationFrame(raf); if (g) { killAll(g.nodes); g = null; } paint(null); }
    function frame() {
      if (!g) return;
      var len = L.N / SR, pos = ((g.c.currentTime - g.t0) % len + len) % len;
      paint(pos); raf = requestAnimationFrame(frame);
    }
    applyNorm(); paint(null);
  }

  var KINDS = { gainstage: gainstage, loudness: loudness };
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("div.rk"), function (h) {
      var f = KINDS[h.dataset.w]; if (f && !h.dataset.rkDone) { h.dataset.rkDone = "1"; f(h); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
