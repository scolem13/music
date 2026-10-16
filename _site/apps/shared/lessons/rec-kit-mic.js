// rec-kit-mic.js — widgets for the recording lessons on microphones and placement. Plain Web Audio, nothing shared with
// synth-kit.js. Every <div class="rk" data-w="..."> becomes a card (the .sk-w classes of _synth-kit.qmd). Kinds (data-w):
//   polar     a top-down room: drag the singer and the loud drum kit, rotate the mic, choose its polar pattern (omni, cardioid,
//             supercardioid, figure-8) and type (dynamic, condenser, ribbon). Voice and drums are generated; each is gained by
//             the pattern's response at its angle and by inverse-square distance, directional patterns boost the bass of a
//             close voice (proximity effect), the type sets EQ, sensitivity and room pickup. Readouts in dB: voice, bleed, margin.
//             data-set keys: pat (omni card super fig8), type (dynamic condenser ribbon), angle (degrees, 0 = up)
//   phase     two mics on one source: drag the second mic (or the slider), the sum and its comb filter are drawn (the curve is the
//             exact sum), a polarity flip, and a mono-sum readout. Mode "3:1 rule" has two sources, each with a close mic: move
//             the mics apart and watch the comb of the bleed shrink. data-set keys: mode (two or three), dist (metres), src (noise voice drums)
//   phantom   a small simulator: choose the mic, plug the XLR, switch +48 V. Plugging with 48 V on makes a (quiet, capped) pop and a
//             warning; a ribbon with 48 V warns; a condenser without 48 V is silent. Press the monitor button to hear it.
// One widget sounds at a time (starting one stops the others). The volume is modest by default and everything goes through
// a soft clipper and a limiter.
(function () {
  'use strict';
  var G = null, widgets = [], vol = 0.35;

  function ctx() {
    if (G) { if (G.ctx.state === 'suspended') G.ctx.resume(); return G; }
    var AC = window.AudioContext || window.webkitAudioContext, c = new AC();
    var master = c.createGain(); master.gain.value = vol;
    var sh = c.createWaveShaper(), n = 1024, cur = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; cur[i] = 0.85 * Math.tanh(x * 1.4); }
    sh.curve = cur;
    var lim = c.createDynamicsCompressor();
    lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.15;
    master.connect(sh); sh.connect(lim); lim.connect(c.destination);
    G = { ctx: c, master: master };
    return G;
  }
  function stopOthers(w) { widgets.forEach(function (o) { if (o !== w && o.playing) o.stop(); }); }

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; }
  function db(x) { return 20 * Math.log10(Math.max(x, 1e-6)); }
  function fmtdb(x) { return (x >= 0 ? '+' : '') + x.toFixed(1) + ' dB'; }
  function parseSet(s) { var o = {}; (s || '').split(',').forEach(function (p) { var k = p.split('='); if (k.length === 2) o[k[0].trim()] = k[1].trim(); }); return o; }

  function slider(box, label, min, max, step, val, fmt, on) {
    var c = el('label', 'sk-c'), l = el('span', 'sk-cl', label), o = el('output'), r = el('input');
    r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
    function upd() { o.textContent = fmt(+r.value); }
    r.addEventListener('input', function () { upd(); on(+r.value); });
    upd(); c.appendChild(l); c.appendChild(o); c.appendChild(r); box.appendChild(c);
    return { set: function (v) { r.value = v; upd(); }, el: r, range: function (a, b, s) { r.min = a; r.max = b; r.step = s; } };
  }
  function select(box, label, opts, val, on) {
    var c = el('label', 'sk-c'), l = el('span', 'sk-cl', label), s = el('select');
    opts.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; s.appendChild(op); });
    s.value = val; s.addEventListener('change', function () { on(s.value); });
    c.appendChild(l); c.appendChild(s); box.appendChild(c);
    return s;
  }
  // the card: title, play button, status; returns pieces
  function card(host, title, w) {
    var box = el('div', 'sk-w');
    var head = el('div', 'sk-head'), t = el('span', 'sk-title', host.getAttribute('data-title') || title);
    var tools = el('div', 'sk-tools'), btn = el('button', 'btn btn-sm btn-outline-secondary', '&#9654; Play'), st = el('span', 'sk-status');
    btn.type = 'button';
    tools.appendChild(st);
    var v = el('label', 'sk-c'); v.innerHTML = '<span class="sk-cl">Vol</span>';
    var vr = el('input'); vr.type = 'range'; vr.min = 0; vr.max = 0.8; vr.step = 0.01; vr.value = vol; vr.style.width = '5rem';
    vr.addEventListener('input', function () { vol = +vr.value; if (G) G.master.gain.value = vol; });
    v.appendChild(vr); tools.appendChild(v); tools.appendChild(btn);
    head.appendChild(t); head.appendChild(tools); box.appendChild(head);
    host.innerHTML = ''; host.appendChild(box);
    w.btn = btn; w.status = st; w.box = box;
    btn.addEventListener('click', function () { w.playing ? w.stop() : w.start(); });
    w.setBtn = function () {
      btn.innerHTML = w.playing ? '&#9632; Stop' : (w.playLabel || '&#9654; Play');
      btn.classList.toggle('sk-on', !!w.playing); box.classList.toggle('sk-live', !!w.playing);
    };
    widgets.push(w);
    return box;
  }

  // ---------- generated sources ----------
  var noiseBuf = null, drumBuf = null;
  function getNoise(c) {
    if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
    var n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < n; i++) { var x = Math.random() * 2 - 1; b0 = 0.99765 * b0 + x * 0.099046; b1 = 0.963 * b1 + x * 0.2965164; b2 = 0.57 * b2 + x * 1.0526913; d[i] = (b0 + b1 + b2 + x * 0.1848) * 0.12; }
    return (noiseBuf = b);
  }
  function getDrums(c) {
    if (drumBuf && drumBuf.sampleRate === c.sampleRate) return drumBuf;
    var sr = c.sampleRate, beat = 0.5, n = Math.round(sr * beat * 4), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    function add(t0, len, fn) { var s = Math.round(t0 * sr); for (var i = 0; i < len * sr && s + i < n; i++) d[s + i] += fn(i / sr); }
    [0, 2].forEach(function (k) { add(k * beat, 0.35, function (t) { return 0.9 * Math.sin(2 * Math.PI * (45 * t + 14 * (1 - Math.exp(-30 * t)) / 0.5 * 0.5 + 60 * (1 - Math.exp(-25 * t)) * 0)) * Math.exp(-9 * t) + 0.9 * Math.sin(2 * Math.PI * (50 * t + 4 * (1 - Math.exp(-30 * t)))) * Math.exp(-8 * t); }); });
    [1, 3].forEach(function (k) { add(k * beat, 0.25, function (t) { return (0.5 * (Math.random() * 2 - 1) * Math.exp(-18 * t) + 0.5 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-22 * t)); }); });
    for (var h = 0; h < 8; h++) add(h * beat / 2, 0.06, function (t) { return 0.22 * (Math.random() * 2 - 1) * Math.exp(-70 * t); });
    var pk = 0; for (var i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (i = 0; i < n; i++) d[i] = d[i] / pk * 0.6;
    return (drumBuf = b);
  }
  // each returns {out, stop}
  function makeVoice(c) {
    var out = c.createGain(), osc = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), amp = c.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 140; lfo.frequency.value = 5.3; lg.gain.value = 3;
    lfo.connect(lg); lg.connect(osc.frequency);
    var mix = c.createGain(); mix.gain.value = 0.5;
    [[700, 5, 1], [1150, 8, 0.7], [2600, 10, 0.4]].forEach(function (f) {
      var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f[0]; bp.Q.value = f[1];
      var g = c.createGain(); g.gain.value = f[2] * 1.6; osc.connect(bp); bp.connect(g); g.connect(mix);
    });
    var nz = c.createBufferSource(); nz.buffer = getNoise(c); nz.loop = true;
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
    var ng = c.createGain(); ng.gain.value = 0.05; nz.connect(hp); hp.connect(ng); ng.connect(mix);
    mix.connect(amp); amp.connect(out); amp.gain.value = 0;
    var notes = [140, 165, 185, 165, 147, 175, 196, 147], i = 0;
    function step() {
      var t = c.currentTime; osc.frequency.setTargetAtTime(notes[i++ % notes.length], t, 0.04);
      amp.gain.cancelScheduledValues(t); amp.gain.setTargetAtTime(0.9, t, 0.03); amp.gain.setTargetAtTime(0.0, t + 0.38, 0.05);
    }
    step(); var iv = setInterval(step, 500);
    osc.start(); lfo.start(); nz.start();
    return { out: out, stop: function () { clearInterval(iv); [osc, lfo, nz].forEach(function (n) { try { n.stop(); } catch (e) {} }); out.disconnect(); } };
  }
  function makeDrums(c, level) {
    var s = c.createBufferSource(), out = c.createGain(); s.buffer = getDrums(c); s.loop = true; out.gain.value = level || 1; s.connect(out); s.start();
    return { out: out, stop: function () { try { s.stop(); } catch (e) {} out.disconnect(); } };
  }
  function makeNoise(c) {
    var s = c.createBufferSource(), out = c.createGain(); s.buffer = getNoise(c); s.loop = true; out.gain.value = 1.2; s.connect(out); s.start();
    return { out: out, stop: function () { try { s.stop(); } catch (e) {} out.disconnect(); } };
  }
  function makeSrc(c, k) { return k === 'drums' ? makeDrums(c) : k === 'voice' ? makeVoice(c) : makeNoise(c); }
  function dragger(svg, node, on) {
    node.style.cursor = 'grab'; node.style.touchAction = 'none';
    node.addEventListener('pointerdown', function (e) {
      node.setPointerCapture(e.pointerId); e.preventDefault();
      function mv(ev) { var p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; var q = p.matrixTransform(svg.getScreenCTM().inverse()); on(q.x, q.y); }
      function up() { node.removeEventListener('pointermove', mv); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up); }
      node.addEventListener('pointermove', mv); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
    });
  }
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  // ---------- polar ----------
  var PAT = { omni: { n: 'Omni', A: 1, prox: 0, room: 1 }, card: { n: 'Cardioid', A: 0.5, prox: 0.8, room: 0.5 },
    super: { n: 'Supercardioid', A: 0.37, prox: 0.9, room: 0.35 }, fig8: { n: 'Figure-8', A: 0, prox: 1, room: 0.33 } };
  var MIC = {
    dynamic:   { n: 'Dynamic',   sens: 0.55, room: 0.5, ls: [120, 0],  pk: [5000, 4, 1],    hs: [9000, -4], lp: 14000 },
    condenser: { n: 'Condenser', sens: 1.2,  room: 1.2, ls: [100, 0],  pk: [3500, 1.5, 1],  hs: [9000, 4],  lp: 20000 },
    ribbon:    { n: 'Ribbon',    sens: 0.8,  room: 0.8, ls: [200, 2.5], pk: [3000, 0, 1],   hs: [6000, -6], lp: 10000 }
  };
  function resp(pat, deg) { var A = PAT[pat].A; return Math.abs(A + (1 - A) * Math.cos(deg * Math.PI / 180)); }

  function polar(host) {
    var w = {}, S = parseSet(host.getAttribute('data-set'));
    var st = { pat: PAT[S.pat] ? S.pat : 'card', type: MIC[S.type] ? S.type : 'dynamic', ang: +S.angle || 0, hear: 'both',
      sing: { x: 200, y: 215 }, kit: { x: 330, y: 60 } };
    var mic = { x: 200, y: 140 };
    var box = card(host, 'Mic, pattern and bleed', w);
    var svg = sv('svg', { viewBox: '0 0 400 280', width: '100%' });
    svg.style.cssText = 'max-width:520px;display:block;border:1px solid ' + css('--site-border', '#ccc') + ';border-radius:6px;touch-action:none';
    box.appendChild(svg);
    var ink = css('--site-ink', '#222'), acc = css('--site-accent', '#2a7de1');
    sv('rect', { x: 0, y: 0, width: 400, height: 280, fill: 'none' }, svg);
    var lobe = sv('path', { fill: acc, 'fill-opacity': 0.18, stroke: acc, 'stroke-width': 1.5 }, svg);
    var micG = sv('g', {}, svg);
    sv('rect', { x: -7, y: -14, width: 14, height: 26, rx: 6, fill: ink }, micG);
    sv('path', { d: 'M0,-14 L0,-24 M-4,-20 L0,-26 L4,-20', stroke: ink, fill: 'none', 'stroke-width': 1.5 }, micG);
    var sg = sv('g', {}, svg); sg.style.cursor = 'grab';
    sv('circle', { r: 17, fill: css('--site-surface', '#fff'), stroke: ink, 'stroke-width': 1.5 }, sg);
    var t1 = sv('text', { y: 5, 'text-anchor': 'middle', 'font-size': 15 }, sg); t1.textContent = '♪';
    var sl = sv('text', { y: 32, 'text-anchor': 'middle', 'font-size': 10, fill: ink }, sg); sl.textContent = 'singer';
    var kg = sv('g', {}, svg); kg.style.cursor = 'grab';
    sv('rect', { x: -22, y: -17, width: 44, height: 34, rx: 8, fill: '#d9822b', 'fill-opacity': 0.85, stroke: ink }, kg);
    var kt = sv('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#000' }, kg); kt.textContent = 'drums';
    var info = el('div', 'sk-info'); info.style.fontFamily = 'var(--font-mono)'; info.style.fontSize = '.82rem';
    var ctl = el('div', 'sk-ctls'); box.appendChild(ctl); box.appendChild(info);
    var tip = el('div', 'sk-tip', 'Drag the singer and the drums. Turn the mic so its quiet side (the back of a cardioid, the sides of a figure-8) faces the drums, and bring the singer close.'); box.appendChild(tip);
    function geom(p) { var dx = p.x - mic.x, dy = p.y - mic.y, d = Math.max(Math.hypot(dx, dy) / 100, 0.04);
      var a = Math.atan2(dx, -dy) * 180 / Math.PI; var off = Math.abs(((a - st.ang + 540) % 360) - 180); return { d: d, off: off }; }
    function gains() {
      var v = geom(st.sing), k = geom(st.kit), P = PAT[st.pat];
      var pv = resp(st.pat, v.off), pk = resp(st.pat, k.off);
      var gv = Math.min(pv * 0.3 / v.d, 3), gd = Math.min(pk * 4 * 1 / k.d, 6);
      var prox = P.prox * 12 * Math.max(0, Math.log10(0.3 / v.d)); if (prox > 16) prox = 16;
      return { gv: gv, gd: gd, prox: prox, v: v, k: k };
    }
    function draw() {
      var pts = [];
      for (var a = 0; a <= 360; a += 4) { var r = resp(st.pat, a) * 60 + 3, rad = (a + st.ang) * Math.PI / 180; pts.push((mic.x + r * Math.sin(rad)).toFixed(1) + ',' + (mic.y - r * Math.cos(rad)).toFixed(1)); }
      lobe.setAttribute('d', 'M' + pts.join('L') + 'Z');
      micG.setAttribute('transform', 'translate(' + mic.x + ',' + mic.y + ') rotate(' + st.ang + ')');
      sg.setAttribute('transform', 'translate(' + st.sing.x + ',' + st.sing.y + ')');
      kg.setAttribute('transform', 'translate(' + st.kit.x + ',' + st.kit.y + ')');
      var g = gains(), mc = MIC[st.type];
      var vd = db(g.gv * Math.pow(10, g.prox / 20) * mc.sens), dd = db(g.gd * mc.sens);
      info.innerHTML = 'Voice <b>' + fmtdb(vd) + '</b> at ' + Math.round(g.v.d * 100) + ' cm, ' + Math.round(g.v.off) + '&deg; off axis'
        + ' &nbsp; Drum bleed <b>' + fmtdb(dd) + '</b> at ' + (g.k.d).toFixed(1) + ' m, ' + Math.round(g.k.off) + '&deg; off axis'
        + '<br>Voice over bleed: <b>' + fmtdb(vd - dd) + '</b>' + (g.prox > 0.5 ? ' &nbsp; proximity boost ' + fmtdb(g.prox) + ' at 150 Hz' : '');
      if (w.g) apply();
    }
    var nodes = null;
    function apply() {
      var c = G.ctx, t = c.currentTime, g = gains(), mc = MIC[st.type], P = PAT[st.pat], n = w.g;
      var hv = (st.hear === 'drums') ? 0 : 1, hd = (st.hear === 'voice') ? 0 : 1;
      n.vG.gain.setTargetAtTime(g.gv * hv, t, 0.04); n.dG.gain.setTargetAtTime(g.gd * hd, t, 0.04);
      n.vS.gain.setTargetAtTime(g.prox, t, 0.05);
      var rl = 0.12 * P.room * mc.room;
      n.vR.gain.setTargetAtTime(rl * hv, t, 0.05); n.dR.gain.setTargetAtTime(rl * 2.5 * hd, t, 0.05);
      n.trim.gain.setTargetAtTime(mc.sens, t, 0.05);
      n.ls.frequency.value = mc.ls[0]; n.ls.gain.setTargetAtTime(mc.ls[1], t, 0.05);
      n.pk.frequency.value = mc.pk[0]; n.pk.gain.setTargetAtTime(mc.pk[1], t, 0.05);
      n.hs.frequency.value = mc.hs[0]; n.hs.gain.setTargetAtTime(mc.hs[1], t, 0.05);
      n.lp.frequency.setTargetAtTime(mc.lp, t, 0.05);
    }
    w.start = function () {
      stopOthers(w); var g = ctx(), c = g.ctx, n = {};
      n.voice = makeVoice(c); n.drums = makeDrums(c, 1);
      n.vS = c.createBiquadFilter(); n.vS.type = 'lowshelf'; n.vS.frequency.value = 150;
      n.vG = c.createGain(); n.dG = c.createGain(); n.vR = c.createGain(); n.dR = c.createGain();
      var conv = c.createConvolver(), len = Math.round(c.sampleRate * 1.1), ir = c.createBuffer(1, len, c.sampleRate), id = ir.getChannelData(0);
      for (var i = 0; i < len; i++) id[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      conv.buffer = ir;
      n.mix = c.createGain();
      n.voice.out.connect(n.vS); n.vS.connect(n.vG); n.vG.connect(n.mix);
      n.drums.out.connect(n.dG); n.dG.connect(n.mix);
      n.voice.out.connect(n.vR); n.vR.connect(conv); n.drums.out.connect(n.dR); n.dR.connect(conv); conv.connect(n.mix);
      n.ls = c.createBiquadFilter(); n.ls.type = 'lowshelf'; n.pk = c.createBiquadFilter(); n.pk.type = 'peaking'; n.pk.Q.value = 1;
      n.hs = c.createBiquadFilter(); n.hs.type = 'highshelf'; n.lp = c.createBiquadFilter(); n.lp.type = 'lowpass'; n.lp.Q.value = 0.5;
      n.trim = c.createGain(); n.trim.gain.value = 0.5;
      n.mix.connect(n.ls); n.ls.connect(n.pk); n.pk.connect(n.hs); n.hs.connect(n.lp); n.lp.connect(n.trim); n.trim.connect(g.master);
      w.g = n; apply(); w.playing = true; w.setBtn(); w.status.textContent = 'sounding';
    };
    w.stop = function () {
      if (w.g) { w.g.voice.stop(); w.g.drums.stop(); w.g.trim.disconnect(); w.g = null; }
      w.playing = false; w.setBtn(); w.status.textContent = '';
    };
    select(ctl, 'Pattern', Object.keys(PAT).map(function (k) { return [k, PAT[k].n]; }), st.pat, function (v) { st.pat = v; draw(); });
    select(ctl, 'Mic type', Object.keys(MIC).map(function (k) { return [k, MIC[k].n]; }), st.type, function (v) { st.type = v; draw(); });
    select(ctl, 'Hear', [['both', 'Voice and drums'], ['voice', 'Voice only'], ['drums', 'Drums only (the bleed)']], 'both', function (v) { st.hear = v; draw(); });
    var as = slider(ctl, 'Mic angle', 0, 359, 1, st.ang, function (v) { return v + '°'; }, function (v) { st.ang = v; draw(); });
    function clampPt(p, x, y) { p.x = Math.max(12, Math.min(388, x)); p.y = Math.max(30, Math.min(262, y)); }
    dragger(svg, sg, function (x, y) { clampPt(st.sing, x, y); draw(); });
    dragger(svg, kg, function (x, y) { clampPt(st.kit, x, y); draw(); });
    draw();
  }

  // ---------- phase ----------
  function phase(host) {
    var w = {}, S = parseSet(host.getAttribute('data-set'));
    var st = { mode: S.mode === 'three' ? 'three' : 'two', dist: +S.dist || 0.8, pol: 1, match: false, src: S.src || 'noise' };
    var box = card(host, 'Two mics, one comb', w);
    var svg = sv('svg', { viewBox: '0 0 400 70', width: '100%' });
    svg.style.cssText = 'max-width:520px;display:block;border:1px solid ' + css('--site-border', '#ccc') + ';border-radius:6px;touch-action:none';
    box.appendChild(svg);
    var ink = css('--site-ink', '#222'), acc = css('--site-accent', '#2a7de1'), bd = css('--site-border', '#ccc');
    var gA = sv('g', {}, svg), gB = sv('g', {}, svg), m1 = sv('g', {}, svg), m2 = sv('g', {}, svg), line = sv('line', { y1: 38, y2: 38, stroke: bd, 'stroke-dasharray': '3 3' }, svg);
    function dot(g, col, txt, r) { sv('circle', { r: r || 13, fill: col, stroke: ink }, g); var t = sv('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#000' }, g); t.textContent = txt; }
    dot(gA, '#d9822b', 'A', 14); dot(gB, '#d9822b', 'B', 14); dot(m1, css('--site-surface', '#fff'), '1'); dot(m2, acc, '2'); m2.style.cursor = 'grab';
    var cv = el('canvas', 'sk-plot sk-tall'); cv.style.cursor = 'default'; box.appendChild(cv);
    var info = el('div', 'sk-info'); info.style.fontFamily = 'var(--font-mono)'; info.style.fontSize = '.82rem';
    var ctl = el('div', 'sk-ctls'); box.appendChild(ctl); box.appendChild(info);
    var tip = el('div', 'sk-tip'); box.appendChild(tip);
    var C1 = 0.3, C3 = 0.2, SPD = 343;
    function params() {
      if (st.mode === 'two') { var D = st.dist; return { tau: (D - C1) / SPD, g: st.match ? 1 : Math.min(1, C1 / D) }; }
      return { tau: Math.max(0, st.dist - C3) / SPD, g: Math.min(1, C3 / st.dist) };
    }
    function layout() {
      var x0 = 30;
      gA.setAttribute('transform', 'translate(' + x0 + ',38)');
      if (st.mode === 'two') {
        gB.style.display = 'none'; m1.setAttribute('transform', 'translate(' + (x0 + C1 * 100) + ',38)');
        m2.setAttribute('transform', 'translate(' + (x0 + st.dist * 100) + ',38)');
      } else {
        gB.style.display = ''; var mx = x0 + C3 * 100; m1.setAttribute('transform', 'translate(' + mx + ',38)');
        var m2x = mx + st.dist * 100; m2.setAttribute('transform', 'translate(' + m2x + ',38)'); gB.setAttribute('transform', 'translate(' + (m2x + C3 * 100 + 14) + ',38)');
      }
      line.setAttribute('x1', x0); line.setAttribute('x2', 380);
    }
    function H(f, p) { var ph = -2 * Math.PI * f * p.tau, re = 1 + st.pol * p.g * Math.cos(ph), im = st.pol * p.g * Math.sin(ph); return Math.hypot(re, im); }
    function draw() {
      layout();
      var p = params(), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 400, Hh = cv.clientHeight || 230;
      cv.width = W * dpr; cv.height = Hh * dpr; var x = cv.getContext('2d'); x.scale(dpr, dpr); x.clearRect(0, 0, W, Hh);
      var lo = Math.log(20), hi = Math.log(20000), top = 8, bot = -30;
      function X(f) { return 28 + (Math.log(f) - lo) / (hi - lo) * (W - 36); }
      function Y(d) { return 8 + (top - d) / (top - bot) * (Hh - 28); }
      x.strokeStyle = bd; x.fillStyle = css('--site-ink-2', '#666'); x.font = '10px monospace'; x.lineWidth = 1;
      [100, 1000, 10000].forEach(function (f) { x.beginPath(); x.moveTo(X(f), 8); x.lineTo(X(f), Hh - 20); x.stroke(); x.fillText(f >= 1000 ? f / 1000 + 'k' : f, X(f) - 8, Hh - 6); });
      [0, -10, -20, -30].forEach(function (d) { x.beginPath(); x.moveTo(28, Y(d)); x.lineTo(W - 8, Y(d)); x.stroke(); x.fillText(d, 2, Y(d) + 3); });
      x.strokeStyle = acc; x.lineWidth = 2; x.beginPath();
      var pw = 0, cnt = 0, mn = 1e9, mf = 0;
      for (var i = 0; i <= 400; i++) { var f = Math.exp(lo + (hi - lo) * i / 400), m = H(f, p), d = Math.max(db(m), bot - 5);
        if (i === 0) x.moveTo(X(f), Y(Math.max(d, bot))); else x.lineTo(X(f), Y(Math.max(d, bot)));
        pw += m * m; cnt++; if (m < mn) { mn = m; mf = f; } }
      x.stroke();
      var mono = db(Math.sqrt(pw / cnt));
      var ms = (p.tau * 1000).toFixed(2);
      if (st.mode === 'two') {
        info.innerHTML = 'Mic 2 is ' + st.dist.toFixed(2) + ' m away: delay <b>' + ms + ' ms</b>, level ' + fmtdb(db(p.g)) + '. Mono sum vs mic 1 alone: <b>' + (mono < -30 ? 'near silence' : fmtdb(mono)) + '</b>. Deepest dip ' + Math.round(mf) + ' Hz (' + (mn < 0.03 ? 'below -30' : fmtdb(db(mn))).replace('dB', 'dB') + ').';
        tip.innerHTML = 'Slide mic 2 back and the notches walk down and crowd together: hollow, then like a flanger. Tick <b>Equal levels</b> to see the worst case, then flip the polarity.';
      } else {
        var ratio = st.dist / C3, pk = db(1 + p.g), tr = db(Math.max(1 - p.g, 0.01));
        info.innerHTML = 'Mics are ' + st.dist.toFixed(2) + ' m apart, each ' + C3 * 100 + ' cm from its player: ratio <b>' + ratio.toFixed(1) + ' : 1</b> (' + (ratio >= 3 ? 'the 3:1 rule is met' : 'under 3:1') + ').<br>Bleed of A in mic 2 is ' + fmtdb(db(p.g)) + '; the comb ripples between <b>' + fmtdb(pk) + '</b> and <b>' + (p.g > 0.99 ? 'a null' : fmtdb(tr)) + '</b>.';
        tip.innerHTML = 'The curve is what player A sounds like in the mono mix: the bleed in the other mic adds a comb. Pull the mics apart until the ratio passes 3:1 and the ripple shrinks to a few dB.';
      }
      if (w.g) apply();
    }
    var ds;
    function setDist(v) { st.dist = v; ds.set(v); draw(); }
    w.start = function () {
      stopOthers(w); var g = ctx(), c = g.ctx, n = {};
      n.A = makeSrc(c, st.mode === 'two' ? st.src : 'voice'); n.B = st.mode === 'three' ? makeDrums(c, 1) : null;
      n.sum = c.createGain(); n.sum.gain.value = 0.5; n.sum.connect(g.master);
      n.A.out.connect(n.sum);
      n.pol = c.createGain(); n.pol.connect(n.sum);
      n.gA = c.createGain(); n.dA = c.createDelay(0.05); n.A.out.connect(n.gA); n.gA.connect(n.dA); n.dA.connect(n.pol);
      if (n.B) {
        n.polB = c.createGain(); n.B.out.connect(n.polB); n.polB.connect(n.sum);
        n.gB = c.createGain(); n.dB = c.createDelay(0.05); n.B.out.connect(n.gB); n.gB.connect(n.dB); n.dB.connect(n.sum);
      }
      w.g = n; apply(); w.playing = true; w.setBtn(); w.status.textContent = 'mono sum';
    };
    function apply() {
      var n = w.g, t = G.ctx.currentTime, p = params();
      n.pol.gain.setTargetAtTime(st.pol, t, 0.03);
      n.gA.gain.setTargetAtTime(p.g, t, 0.03); n.dA.delayTime.setTargetAtTime(p.tau, t, 0.03);
      if (n.B) { n.polB.gain.setTargetAtTime(st.pol, t, 0.03); n.gB.gain.setTargetAtTime(p.g, t, 0.03); n.dB.delayTime.setTargetAtTime(p.tau, t, 0.03); }
    }
    w.stop = function () {
      if (w.g) { w.g.A.stop(); if (w.g.B) w.g.B.stop(); w.g.sum.disconnect(); w.g = null; }
      w.playing = false; w.setBtn(); w.status.textContent = '';
    };
    var modeSel = select(ctl, 'Demo', [['two', 'Two mics, one source'], ['three', '3:1 rule: two sources']], st.mode, function (v) {
      var was = w.playing; if (was) w.stop(); st.mode = v;
      var r = v === 'two' ? [0.3, 3, 0.01] : [0.2, 2, 0.01]; ds.range(r[0], r[1], r[2]);
      st.dist = v === 'two' ? 0.8 : 0.3; ds.set(st.dist); srcSel.parentNode.style.display = v === 'two' ? '' : 'none';
      host.querySelector('.sk-title').textContent = v === 'two' ? 'Two mics, one comb' : 'The 3:1 rule'; draw(); if (was) w.start();
    });
    var srcSel = select(ctl, 'Source', [['noise', 'Noise'], ['voice', 'Voice-like'], ['drums', 'Drums']], st.src, function (v) { st.src = v; if (w.playing) { w.stop(); w.start(); } });
    ds = slider(ctl, 'Distance', st.mode === 'two' ? 0.3 : 0.2, st.mode === 'two' ? 3 : 2, 0.01, st.dist, function (v) { return v.toFixed(2) + ' m'; }, function (v) { st.dist = v; draw(); });
    var pb = el('button', 'btn btn-sm btn-outline-secondary', 'Ø Polarity: normal'); pb.type = 'button';
    pb.addEventListener('click', function () { st.pol = -st.pol; pb.textContent = 'Ø Polarity: ' + (st.pol < 0 ? 'FLIPPED' : 'normal'); pb.classList.toggle('sk-on', st.pol < 0); draw(); });
    var mb = el('button', 'btn btn-sm btn-outline-secondary', 'Equal levels: off'); mb.type = 'button';
    mb.addEventListener('click', function () { st.match = !st.match; mb.textContent = 'Equal levels: ' + (st.match ? 'on' : 'off'); mb.classList.toggle('sk-on', st.match); draw(); });
    ctl.appendChild(pb); ctl.appendChild(mb);
    if (st.mode === 'three') { srcSel.parentNode.style.display = 'none'; }
    if (st.mode === 'three') host.querySelector('.sk-title').textContent = 'The 3:1 rule';
    mb.style.display = ''; 
    dragger(svg, m2, function (x) {
      var x0 = 30 + (st.mode === 'two' ? 0 : C3 * 100), v = (x - x0) / 100, r = ds.el;
      v = Math.max(+r.min, Math.min(+r.max, Math.round(v * 100) / 100)); setDist(v);
    });
    window.addEventListener('resize', draw);
    draw(); setTimeout(draw, 300);
  }

  // ---------- phantom ----------
  function phantom(host) {
    var w = {}, S = parseSet(host.getAttribute('data-set'));
    var st = { type: S.type || 'condenser', plugged: false, p48: false, log: [] };
    w.playLabel = '&#9654; Monitors on';
    var box = card(host, 'Plug in, then +48 V', w);
    var ctl = el('div', 'sk-ctls'); box.appendChild(ctl);
    var warn = el('div', 'sk-care'); warn.style.display = 'none';
    var chk = el('ul', 'sk-info'); chk.style.listStyle = 'none'; chk.style.paddingLeft = '0';
    var log = el('div', 'sk-status'); log.style.minHeight = '1.4em';
    var out = el('div', 'sk-info'); out.style.fontFamily = 'var(--font-mono)';
    box.appendChild(out); box.appendChild(warn); box.appendChild(chk); box.appendChild(log);
    var tip = el('div', 'sk-tip', 'Press <b>Monitors on</b> first (turn your speakers down: the pop is quiet and capped, a real one is not), then try the right order and the wrong ones.');
    box.appendChild(tip);
    var step = { type: false, plug: false, on: false };
    function say(m) { st.log.unshift(m); st.log = st.log.slice(0, 3); log.innerHTML = st.log.map(function (s) { return '&bull; ' + s; }).join('<br>'); }
    function pop(amt) {
      if (!w.playing) return; var g = ctx(), c = g.ctx, t = c.currentTime;
      var o = c.createOscillator(), e = c.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.25);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(Math.min(amt, 0.5), t + 0.004); e.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      var nb = c.createBufferSource(); nb.buffer = getNoise(c); var ng = c.createGain(); ng.gain.setValueAtTime(Math.min(amt, 0.5) * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(e); e.connect(w.g.out); nb.connect(ng); ng.connect(w.g.out); o.start(t); o.stop(t + 0.4); nb.start(t); nb.stop(t + 0.1);
    }
    function sounding() {
      // returns {mode, text}
      if (!st.plugged) return { m: 'none', t: 'No mic connected: no signal.' };
      if (st.type === 'condenser') return st.p48 ? { m: 'ok', t: 'Condenser powered: full, detailed signal.' } : { m: 'none', t: 'Condenser without +48 V: silence. It has no power for its amplifier.' };
      if (st.type === 'dynamic') return { m: st.p48 ? 'ok' : 'ok', t: 'Dynamic mic: signal either way (it ignores +48 V on a balanced cable).' };
      return st.p48 ? { m: 'crackle', t: 'Ribbon with +48 V: risky. A faulty cable or an old mic can crackle or be damaged.' } : { m: 'ok', t: 'Ribbon, +48 V off: right, a passive ribbon wants no power.' };
    }
    function refresh() {
      var s = sounding(); out.innerHTML = (st.plugged ? 'XLR: <b>plugged</b>' : 'XLR: <b>unplugged</b>') + ' &nbsp; +48 V: <b>' + (st.p48 ? 'ON' : 'off') + '</b> &nbsp; Mic: <b>' + st.type + '</b><br>' + s.t;
      if (w.g) { w.g.sig.gain.setTargetAtTime(s.m === 'none' ? 0 : s.m === 'crackle' ? 0.5 : 1, G.ctx.currentTime, 0.04); w.g.crk.gain.setTargetAtTime(s.m === 'crackle' ? 0.35 : 0, G.ctx.currentTime, 0.04); }
      var needs = st.type === 'condenser';
      var items = [
        [step.type, 'Pick the mic and check what it needs (a condenser: +48 V; a dynamic: nothing; a ribbon: keep it off)'],
        [st.plugged && !st.p48 || step.plug, 'Plug the XLR in with +48 V off and the monitors low'],
        [needs ? (st.plugged && st.p48) : (st.plugged && !st.p48), needs ? 'Switch +48 V on (wait a moment, then raise the fader)' : 'Leave +48 V off']
      ];
      chk.innerHTML = items.map(function (i) { return '<li>' + (i[0] ? '&#9745; ' : '&#9744; ') + i[1] + '</li>'; }).join('');
    }
    function setWarn(m) { warn.style.display = m ? '' : 'none'; warn.innerHTML = m || ''; }
    w.start = function () {
      stopOthers(w); var g = ctx(), c = g.ctx, n = {};
      n.out = c.createGain(); n.out.gain.value = 0.5; n.out.connect(g.master);
      n.sig = c.createGain(); n.sig.gain.value = 0; n.sig.connect(n.out);
      var nz = c.createBufferSource(); nz.buffer = getNoise(c); nz.loop = true; var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      var ng = c.createGain(); ng.gain.value = 0.25; nz.connect(lp); lp.connect(ng); ng.connect(n.sig); nz.start();
      var hum = c.createOscillator(); hum.frequency.value = 220; var hg = c.createGain(); hg.gain.value = 0.015; hum.connect(hg); hg.connect(n.sig); hum.start();
      n.vo = makeVoice(c); var vg = c.createGain(); vg.gain.value = 0.35; n.vo.out.connect(vg); vg.connect(n.sig);
      n.crk = c.createGain(); n.crk.gain.value = 0; n.crk.connect(n.out);
      var cb = c.createBufferSource(), cbuf = c.createBuffer(1, c.sampleRate, c.sampleRate), cd = cbuf.getChannelData(0);
      for (var i = 0; i < cd.length; i++) cd[i] = Math.random() < 0.002 ? (Math.random() * 2 - 1) : 0;
      cb.buffer = cbuf; cb.loop = true; cb.connect(n.crk); cb.start();
      n.stopAll = function () { try { nz.stop(); hum.stop(); cb.stop(); } catch (e) {} n.vo.stop(); n.out.disconnect(); };
      w.g = n; w.playing = true; w.setBtn(); w.status.textContent = 'monitors on'; refresh();
    };
    w.stop = function () { if (w.g) { w.g.stopAll(); w.g = null; } w.playing = false; w.setBtn(); w.status.textContent = ''; };
    select(ctl, 'Mic', [['dynamic', 'Dynamic (SM58)'], ['condenser', 'Condenser'], ['ribbon', 'Ribbon (passive)']], st.type, function (v) {
      st.type = v; step.type = true; setWarn(st.p48 && v === 'ribbon' ? '<b>Warning:</b> +48 V is on with a ribbon mic connected. Switch it off at once.' : ''); say('Chose a ' + v + ' mic.'); refresh(); });
    var pb = el('button', 'btn btn-sm btn-outline-secondary', 'Plug in XLR'); pb.type = 'button';
    var fb = el('button', 'btn btn-sm btn-outline-secondary', '+48 V: off'); fb.type = 'button';
    pb.addEventListener('click', function () {
      st.plugged = !st.plugged; pb.textContent = st.plugged ? 'Unplug XLR' : 'Plug in XLR'; pb.classList.toggle('sk-on', st.plugged);
      if (st.p48) {
        pop(0.3); setWarn('<b>Pop!</b> You ' + (st.plugged ? 'plugged in' : 'unplugged') + ' with +48 V on. Mic and speakers took a jolt. Switch 48 V <b>off</b> first, wait a few seconds, then ' + (st.plugged ? 'plug in' : 'unplug') + '.'
          + (st.type === 'ribbon' && st.plugged ? ' With a ribbon it can be worse than a pop.' : ''));
        say('Pop: ' + (st.plugged ? 'plugged in' : 'unplugged') + ' with 48 V on.');
      } else { setWarn(''); say(st.plugged ? 'Plugged in with 48 V off: correct.' : 'Unplugged with 48 V off: correct.'); step.plug = st.plugged || step.plug; }
      refresh();
    });
    fb.addEventListener('click', function () {
      st.p48 = !st.p48; fb.textContent = '+48 V: ' + (st.p48 ? 'ON' : 'off'); fb.classList.toggle('sk-on', st.p48);
      if (st.p48 && st.plugged && st.type === 'ribbon') { setWarn('<b>Warning:</b> +48 V on with a ribbon mic plugged in. A passive ribbon wants none; switch it off.'); say('48 V on with a ribbon: not good.'); }
      else if (st.p48 && !st.plugged) { setWarn(''); say('48 V on, nothing plugged in. Plugging in now will pop.'); }
      else if (st.p48 && st.plugged) { setWarn(''); if (st.type === 'condenser') pop(0.06); say(st.type === 'condenser' ? 'Powered up with the mic already plugged in: it works (a small thump is normal; keep the monitors down).' : '48 V on: a dynamic doesn\'t care.'); }
      else { setWarn(''); say('48 V off.'); }
      refresh();
    });
    var row = el('div', 'sk-c'); row.appendChild(el('span', 'sk-cl', 'Switches')); var rb = el('div'); rb.style.cssText = 'display:flex;gap:.4rem;flex-wrap:wrap'; rb.appendChild(pb); rb.appendChild(fb); row.appendChild(rb); ctl.appendChild(row);
    refresh();
  }

  var KINDS = { polar: polar, phase: phase, phantom: phantom };
  function init() {
    var hs = document.querySelectorAll('.rk');
    for (var i = 0; i < hs.length; i++) { var f = KINDS[hs[i].getAttribute('data-w')]; if (f && !hs[i].getAttribute('data-ready')) { hs[i].setAttribute('data-ready', '1'); f(hs[i]); } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
