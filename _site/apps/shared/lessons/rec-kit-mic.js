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
//   proximity a distance slider (1 cm to 1 m, logarithmic) and a pattern menu: the bass boost of a directional mic close up, drawn against
//             the same mic at 1 m and heard on a voice-like sound, low notes or noise ("Keep the level" takes off the inverse-square change).
//             data-set keys: dist (metres), pat, src (voice bass noise)
//   offaxis   drag the source round the mic (or the Angle slider): quieter and duller off axis, by pattern and diaphragm size; "Cup the grille"
//             covers the rear ports (almost omni) and adds the hand's honk. data-set keys: angle, pat, dia (small large hand), src, cup (1)
//   ampmic    a guitar speaker from the front: drag the mic from the dust cap to the edge, distance, angle, mic (dynamic ribbon condenser),
//             a live room; the tone drawn against an SM57-type at the cap edge, 3 cm, and heard on a generated riff.
//             data-set keys: x (0 cap .. 1 edge), dist (cm), angle, type, room (1)
//   vocalmic  a singer from the side: drag the mic; the air jet of plosives, sibilance off the mouth's axis, proximity, the room;
//             pop filter, mic, room menus. data-set keys: dist (cm), type (condenser dynamic), filter (1), room (treated untreated boxy)
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
    if (window.AudioTap && window.AudioTap.register) { try { window.AudioTap.register(c, lim, 'Mic lessons'); } catch (e) {} }   // (the navbar tuner can listen)
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
    var st = { pat: PAT[S.pat] ? S.pat : 'card', type: MIC[S.type] ? S.type : 'dynamic', ang: S.angle != null ? +S.angle || 0 : 180, hear: 'both',
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


  // ---------- a small frequency graph on a canvas (shared by proximity and offaxis) ----------
  function freqCanvas(box, lo, hi) {
    var cv = el('canvas'); cv.width = 480; cv.height = 170; cv.style.cssText = 'width:100%;max-width:520px;display:block;border:1px solid ' + css('--site-border', '#ccc') + ';border-radius:6px';
    box.appendChild(cv);
    var x = cv.getContext('2d'), W = cv.width, H = cv.height, l0 = Math.log(20), l1 = Math.log(20000);
    function X(f) { return 32 + (Math.log(f) - l0) / (l1 - l0) * (W - 40); }
    function Y(d) { return 8 + (hi - Math.max(lo, Math.min(hi, d))) / (hi - lo) * (H - 28); }
    return function (curves) {
      x.clearRect(0, 0, W, H); x.font = '10px ' + (css('--font-mono', 'monospace')); x.lineWidth = 1; x.strokeStyle = css('--site-border', '#ccc'); x.fillStyle = css('--site-ink-2', '#555');
      [50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach(function (f) { x.beginPath(); x.moveTo(X(f), 8); x.lineTo(X(f), H - 20); x.stroke(); x.fillText(f >= 1000 ? f / 1000 + 'k' : f, X(f) - 8, H - 6); });
      for (var d = lo; d <= hi; d += 10) { x.beginPath(); x.moveTo(32, Y(d)); x.lineTo(W - 8, Y(d)); x.stroke(); x.fillText((d > 0 ? '+' : '') + d, 2, Y(d) + 3); }
      curves.forEach(function (c) {
        x.beginPath(); x.lineWidth = c.w || 2; x.strokeStyle = c.col; x.setLineDash(c.dash || []);
        for (var i = 0; i <= 160; i++) { var f = Math.exp(l0 + (l1 - l0) * i / 160), y = Y(c.f(f)); if (i) x.lineTo(X(f), y); else x.moveTo(X(f), y); }
        x.stroke(); x.setLineDash([]);
      });
    };
  }
  // one sound source with a gain and a filter chain; parts = list of filters to update; returns {nodes, stop}
  function chain(c, srcKind, specs) {
    var src = srcKind === 'bass' ? makeBass(c) : makeSrc(c, srcKind), last = src.out, fs = specs.map(function (s) { var b = c.createBiquadFilter(); b.type = s; last.connect(b); last = b; return b; });
    var g = c.createGain(); last.connect(g); g.connect(ctx().master);
    return { f: fs, g: g, stop: function () { src.stop(); g.disconnect(); } };
  }
  // a low line: a bass guitar-ish pluck, rich in low harmonics, so the proximity effect is plain to hear
  function makeBass(c) {
    var out = c.createGain(), osc = c.createOscillator(), lp = c.createBiquadFilter(), amp = c.createGain();
    osc.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 900; amp.gain.value = 0; osc.connect(lp); lp.connect(amp); amp.connect(out);
    var notes = [55, 55, 73.4, 82.4, 65.4, 65.4, 49, 61.7], i = 0;
    function step() { var t = c.currentTime; osc.frequency.setValueAtTime(notes[i++ % notes.length], t); amp.gain.cancelScheduledValues(t); amp.gain.setValueAtTime(0.9, t); amp.gain.setTargetAtTime(0.2, t + 0.02, 0.25); amp.gain.setTargetAtTime(0, t + 0.4, 0.04); }
    step(); var iv = setInterval(step, 500); osc.start();
    return { out: out, stop: function () { clearInterval(iv); try { osc.stop(); } catch (e) {} out.disconnect(); } };
  }

  // ---------- proximity: distance -> bass ----------
  // The gradient part of a directional mic near a point source is boosted by |1 + 1/(jkr)| (k = 2πf/c): the pattern menu sets how
  // much of the mic is gradient (omni none, cardioid half, figure-8 all). Played as a low shelf at the corner f = c / (2πr), its gain the
  // boost at 60 Hz (capped at 24 dB); "Keep the level" takes off the inverse-square change so only the tone moves.
  function proxBoost(A, r, f) { var kr = 2 * Math.PI * f / 343 * r; return 20 * Math.log10(A + (1 - A) * Math.sqrt(1 + 1 / (kr * kr))); }
  function proximity(host) {
    var w = {}, S = parseSet(host.getAttribute('data-set')), st = { r: +S.dist || 0.3, pat: PAT[S.pat] ? S.pat : 'card', src: S.src || 'voice', keep: true };
    var box = card(host, 'Proximity effect: move the mic in', w), ctl = el('div', 'sk-ctls'), info = el('div', 'sk-info');
    var draw = freqCanvas(box, -10, 30); box.appendChild(ctl); box.appendChild(info);
    info.style.fontFamily = 'var(--font-mono)'; info.style.fontSize = '.82rem';
    box.appendChild(el('div', 'sk-tip', 'Play, then slide the mic in from 1 m to 1 cm. With a cardioid the bass swells as it comes close; switch to omni and it doesn\'t. The faint line is the same mic at 1 m.'));
    var acc = css('--site-accent', '#2a7de1'), ink = css('--site-ink-3', '#999');
    function A() { return PAT[st.pat].A; }
    function upd() {
      var a = A();
      draw([{ f: function (f) { return proxBoost(a, 1, f); }, col: ink, dash: [5, 4], w: 1.5 }, { f: function (f) { return proxBoost(a, st.r, f); }, col: acc, w: 2.6 }]);
      var b100 = proxBoost(a, st.r, 100), lvl = -20 * Math.log10(st.r / 0.3);
      info.innerHTML = 'Distance <b>' + (st.r < 0.1 ? (st.r * 100).toFixed(1) : Math.round(st.r * 100)) + ' cm</b> &nbsp; bass at 100 Hz <b>' + fmtdb(b100) + '</b> &nbsp; level ' + (st.keep ? 'kept the same' : '<b>' + fmtdb(lvl) + '</b> (vs 30 cm)');
      if (w.n) {
        var t = G.ctx.currentTime, fc = Math.min(2000, 343 / (2 * Math.PI * st.r)), gain = Math.min(24, proxBoost(a, st.r, 60));
        w.n.f[0].frequency.setTargetAtTime(fc, t, 0.03); w.n.f[0].gain.setTargetAtTime(gain, t, 0.03);
        var lin = st.keep ? 1 : Math.min(4, 0.3 / st.r); w.n.g.gain.setTargetAtTime(lin * Math.pow(10, -Math.max(0, gain - 6) / 40), t, 0.03);
      }
    }
    w.start = function () { var c = ctx().ctx; stopOthers(w); w.n = chain(c, st.src, ['lowshelf']); w.playing = true; w.setBtn(); upd(); };
    w.stop = function () { if (w.n) { w.n.stop(); w.n = null; } w.playing = false; w.setBtn(); };
    // the slider is logarithmic: 1 cm to 1 m
    var ds = slider(ctl, 'Distance', 0, 2, 0.01, Math.log10(st.r * 100), function (v) { var cm = Math.pow(10, v); return (cm < 10 ? cm.toFixed(1) : Math.round(cm)) + ' cm'; }, function (v) { st.r = Math.pow(10, v) / 100; upd(); });
    if (ds.el.numEdit === undefined) ds.el.numEdit = { get: function () { return Math.round(st.r * 1000) / 10; }, set: function (cm) { st.r = Math.max(0.01, Math.min(1, cm / 100)); ds.set(Math.log10(st.r * 100)); upd(); } };
    select(ctl, 'Pattern', [['omni', 'Omni'], ['card', 'Cardioid'], ['super', 'Supercardioid'], ['fig8', 'Figure-8']], st.pat, function (v) { st.pat = v; upd(); });
    select(ctl, 'Source', [['voice', 'Voice-like'], ['bass', 'Low notes'], ['noise', 'Noise']], st.src, function (v) { st.src = v; if (w.playing) { w.stop(); w.start(); } });
    var kb = el('button', 'btn btn-sm btn-outline-secondary sk-on', 'Keep the level: on'); kb.type = 'button'; ctl.appendChild(kb);
    kb.addEventListener('click', function () { st.keep = !st.keep; kb.textContent = 'Keep the level: ' + (st.keep ? 'on' : 'off'); kb.classList.toggle('sk-on', st.keep); upd(); });
    upd();
  }

  // ---------- off-axis: turn the source round the mic, and cup the grille ----------
  // Level = the pattern at that angle; the treble falls further off axis, from about c / (π · diameter) up (a model: 1 + (f/fc)²(1 − cos θ)).
  // Cupped: the rear ports covered, the pattern goes almost omni (A 0.85), the hand's hollow adds a peak near 1.2 kHz and takes the top off.
  var DIA = { small: { n: 'Small diaphragm (12 mm)', fc: 9000 }, large: { n: 'Large diaphragm (25 mm)', fc: 4000 }, hand: { n: 'Handheld vocal', fc: 5500 } };
  function offaxis(host) {
    var w = {}, S = parseSet(host.getAttribute('data-set'));
    var st = { ang: +S.angle || 0, pat: PAT[S.pat] ? S.pat : 'card', dia: DIA[S.dia] ? S.dia : 'large', src: S.src || 'voice', cup: S.cup === '1' };
    var box = card(host, 'Off axis: walk round the mic', w);
    var row = el('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start'; box.appendChild(row);
    var svg = sv('svg', { viewBox: '0 0 220 220', width: '220' }); svg.style.cssText = 'max-width:100%;border:1px solid ' + css('--site-border', '#ccc') + ';border-radius:6px;touch-action:none';
    row.appendChild(svg); var gbox = el('div'); gbox.style.cssText = 'flex:1 1 260px;min-width:0'; row.appendChild(gbox);
    var draw = freqCanvas(gbox, -40, 10), ctl = el('div', 'sk-ctls'), info = el('div', 'sk-info'); box.appendChild(ctl); box.appendChild(info);
    info.style.fontFamily = 'var(--font-mono)'; info.style.fontSize = '.82rem';
    box.appendChild(el('div', 'sk-tip', 'Drag the dot (the singer) round the mic, or use the slider. Off axis it gets quieter and duller. Then cup the grille: the back stops being quiet, and the sound goes boxy.'));
    var ink = css('--site-ink', '#222'), acc = css('--site-accent', '#2a7de1'), cx = 110, cy = 110;
    [80, 53, 27].forEach(function (r) { sv('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: css('--site-border', '#ccc') }, svg); });
    var lobe = sv('path', { fill: acc, 'fill-opacity': 0.18, stroke: acc, 'stroke-width': 1.5 }, svg);
    sv('rect', { x: cx - 6, y: cy - 6, width: 12, height: 40, rx: 4, fill: ink }, svg); sv('circle', { cx: cx, cy: cy - 6, r: 9, fill: css('--site-surface', '#fff'), stroke: ink, 'stroke-width': 2 }, svg);
    var hand = sv('path', { d: 'M' + (cx - 14) + ',' + (cy + 8) + ' C' + (cx - 18) + ',' + (cy - 8) + ' ' + (cx - 12) + ',' + (cy - 20) + ' ' + (cx - 3) + ',' + (cy - 18) + ' M' + (cx + 14) + ',' + (cy + 8) + ' C' + (cx + 18) + ',' + (cy - 8) + ' ' + (cx + 12) + ',' + (cy - 20) + ' ' + (cx + 3) + ',' + (cy - 18), fill: 'none', stroke: acc, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    var tf = sv('text', { x: cx, y: 14, 'text-anchor': 'middle', 'font-size': 11, fill: css('--site-ink-2', '#555') }, svg); tf.textContent = 'front';
    var dot = sv('g', {}, svg); sv('circle', { r: 11, fill: css('--site-surface', '#fff'), stroke: ink, 'stroke-width': 1.5 }, dot); var dt = sv('text', { y: 4, 'text-anchor': 'middle', 'font-size': 12 }, dot); dt.textContent = '♪';
    function A() { return st.cup ? 0.85 : PAT[st.pat].A; }
    function lvl(f, deg) {
      var th = deg * Math.PI / 180, a = A(), p = Math.abs(a + (1 - a) * Math.cos(th)), fc = DIA[st.dia].fc, hf = -10 * Math.log10(1 + Math.pow(f / fc, 2) * (1 - Math.cos(th)));
      var cupd = st.cup ? 9 * Math.exp(-Math.pow(Math.log2(f / 1200) * 1.6, 2)) - 10 * Math.log10(1 + Math.pow(f / 3500, 4)) : 0;
      return 20 * Math.log10(Math.max(p, 0.01)) + hf + cupd;
    }
    function upd() {
      var pts = [], a = A();
      for (var d = 0; d <= 360; d += 4) { var v = Math.abs(a + (1 - a) * Math.cos(d * Math.PI / 180)), db_ = 20 * Math.log10(Math.max(v, 1e-4)), r = 80 * Math.max(0, (db_ + 30) / 30), t = d * Math.PI / 180; pts.push((cx + r * Math.sin(t)).toFixed(1) + ',' + (cy - r * Math.cos(t)).toFixed(1)); }
      lobe.setAttribute('d', 'M' + pts.join('L') + 'Z'); hand.style.display = st.cup ? '' : 'none';
      var t = st.ang * Math.PI / 180; dot.setAttribute('transform', 'translate(' + (cx + 92 * Math.sin(t)).toFixed(1) + ',' + (cy - 92 * Math.cos(t)).toFixed(1) + ')');
      draw([{ f: function (f) { return lvl(f, 0); }, col: css('--site-ink-3', '#999'), dash: [5, 4], w: 1.5 }, { f: function (f) { return lvl(f, st.ang); }, col: acc, w: 2.6 }]);
      var off = st.ang > 180 ? 360 - st.ang : st.ang;
      info.innerHTML = Math.round(off) + '&deg; off axis &nbsp; level at 1 kHz <b>' + fmtdb(lvl(1000, st.ang) - lvl(1000, 0)) + '</b> &nbsp; at 8 kHz <b>' + fmtdb(lvl(8000, st.ang) - lvl(8000, 0)) + '</b> (vs on axis)' + (st.cup ? ' &nbsp; <b>cupped</b>' : '');
      if (w.n) {
        var c = G.ctx, now = c.currentTime, th = st.ang * Math.PI / 180, p = Math.abs(a + (1 - a) * Math.cos(th)), fc = DIA[st.dia].fc / Math.sqrt(Math.max(1 - Math.cos(th), 0.02));
        w.n.f[0].frequency.setTargetAtTime(Math.min(fc, 20000), now, 0.03);
        w.n.f[1].frequency.value = 1200; w.n.f[1].Q.value = 2.2; w.n.f[1].gain.setTargetAtTime(st.cup ? 9 : 0, now, 0.03);
        w.n.f[2].frequency.setTargetAtTime(st.cup ? 3500 : 20000, now, 0.03);
        w.n.g.gain.setTargetAtTime(Math.max(p, 0.01) * (st.cup ? 0.7 : 1), now, 0.03);
      }
    }
    w.start = function () { var c = ctx().ctx; stopOthers(w); w.n = chain(c, st.src, ['lowpass', 'peaking', 'lowpass']); w.n.f[0].Q.value = 0.5; w.n.f[2].Q.value = 0.7; w.playing = true; w.setBtn(); upd(); };
    w.stop = function () { if (w.n) { w.n.stop(); w.n = null; } w.playing = false; w.setBtn(); };
    var as = slider(ctl, 'Angle', 0, 359, 1, st.ang, function (v) { return v + '°'; }, function (v) { st.ang = v; upd(); });
    dragger(svg, dot, function (x, y) { var a = Math.atan2(x - cx, cy - y) * 180 / Math.PI; st.ang = Math.round((a + 360) % 360); as.set(st.ang); upd(); });
    select(ctl, 'Pattern', [['omni', 'Omni'], ['card', 'Cardioid'], ['super', 'Supercardioid'], ['fig8', 'Figure-8']], st.pat, function (v) { st.pat = v; upd(); });
    select(ctl, 'Mic', Object.keys(DIA).map(function (k) { return [k, DIA[k].n]; }), st.dia, function (v) { st.dia = v; upd(); });
    select(ctl, 'Source', [['voice', 'Voice-like'], ['noise', 'Noise'], ['drums', 'Drums']], st.src, function (v) { st.src = v; if (w.playing) { w.stop(); w.start(); } });
    var cb = el('button', 'btn btn-sm btn-outline-secondary', 'Cup the grille: off'); cb.type = 'button'; ctl.appendChild(cb);
    function setCup(v) { st.cup = v; cb.textContent = 'Cup the grille: ' + (v ? 'ON' : 'off'); cb.classList.toggle('sk-on', v); upd(); }
    cb.addEventListener('click', function () { setCup(!st.cup); }); setCup(st.cup);
  }


  // ---------- shared for ampmic and vocalmic: a short room (decaying noise), filters, a curve from biquads ----------
  var roomBuf = {};
  function getRoom(c, kind) {
    var k = kind + c.sampleRate; if (roomBuf[k]) return roomBuf[k];
    var sr = c.sampleRate, len = kind === 'boxy' ? 0.25 : 0.7, n = Math.round(sr * len), b = c.createBuffer(2, n, sr);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / sr * (kind === 'boxy' ? 18 : 7));
      if (kind === 'boxy') [0.0031, 0.0047, 0.0062].forEach(function (t, j) { var s = Math.round(t * sr); d[s] += 0.9 - 0.2 * j; });     // a small room's first strong reflections: the boxy comb
    }
    return (roomBuf[k] = b);
  }
  function bq(c, type, f, g, q) { var b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (g != null) b.gain.value = g; if (q != null) b.Q.value = q; return b; }
  function series(list) { for (var i = 0; i < list.length - 1; i++) list[i].connect(list[i + 1]); return list; }
  function setT(p, v) { p.setTargetAtTime(v, G.ctx.currentTime, 0.04); }

  // ---------- ampmic: a mic in front of a guitar speaker ----------
  // A model of what engineers describe (and frequency plots of close-miked speakers show): on the dust cap the brightest, the top
  // falling as the mic moves out toward the edge of the cone (lower and rounder there), angling the mic takes off treble (off axis),
  // close up a directional mic adds bass (proximity, as above), and from about 30 cm the room joins in. The speaker itself is the
  // last filter of the guitar sound: little above 5-6 kHz comes out of a guitar speaker at all.
  var AMIC = {
    dynamic:   { n: 'Dynamic (SM57 type)', A: 0.5, f: function (f) { return bump(f, 4500, 4, 1.2) - 10 * Math.log10(1 + Math.pow(f / 13000, 4)); } },
    ribbon:    { n: 'Ribbon (figure-8)', A: 0, f: function (f) { return -10 * Math.log10(1 + Math.pow(f / 5000, 2)) + 1.5; } },
    condenser: { n: 'Condenser (large)', A: 0.5, f: function (f) { return bump(f, 10000, 2, 1); } }
  };
  function bump(f, f0, g, q) { var x = Math.log2(f / f0) * q; return g * Math.exp(-x * x); }
  function ampTone(st, f) {
    var x = st.x, fc = 7500 * Math.pow(0.32, x), th = st.ang * Math.PI / 180, m = AMIC[st.type];
    var d = -10 * Math.log10(1 + Math.pow(f / fc, 4))                          // the cone's top end where the mic is
      + bump(f, 2800, 5 * (1 - x), 1) + bump(f, 220, 3 * x, 1.2)               // the cap's bite; the edge's lower mids
      - 10 * Math.log10(1 + Math.pow(f / 4000, 2) * (1 - Math.cos(th)))         // angled: off axis
      + proxBoost(m.A, st.d / 100, f) - proxBoost(m.A, 0.3, f)                // proximity, against the same mic at 30 cm
      + m.f(f);
    return d - 10 * Math.log10(1 + Math.pow(70 / f, 4));                        // (a guitar speaker has no deep bass)
  }
  function makeGuitar(c) {
    var out = c.createGain(), sh = c.createWaveShaper(), cur = new Float32Array(1024), amp = c.createGain(), oscs = [];
    for (var i = 0; i < 1024; i++) { var x = i / 1023 * 2 - 1; cur[i] = Math.tanh(x * 9) * 0.6; } sh.curve = cur;
    var pre = bq(c, 'highpass', 120, null, 0.7), cab1 = bq(c, 'lowpass', 5500, null, 0.9), cab2 = bq(c, 'peaking', 2200, 3, 1), cab3 = bq(c, 'highpass', 75, null, 0.8);
    [1, 1.498, 2].forEach(function (r) { var o = c.createOscillator(); o.type = 'sawtooth'; o.r = r; o.detune.value = (Math.random() - 0.5) * 12; o.connect(pre); oscs.push(o); o.start(); });
    series([pre, amp, sh, cab1, cab2, cab3, out]); amp.gain.value = 0;
    var riff = [[82.4, 1], [82.4, 0], [82.4, 0], [98, 1], [82.4, 0], [110, 1], [82.4, 0], [123.5, 1]], k = 0;     // eighths at 140 bpm: E5 chugs, G5 A5 B5 hits
    function step() { var r = riff[k++ % riff.length], t = c.currentTime; oscs.forEach(function (o) { o.frequency.setValueAtTime(r[0] * o.r, t); });
      amp.gain.cancelScheduledValues(t); amp.gain.setValueAtTime(r[1] ? 1 : 0.6, t); amp.gain.setTargetAtTime(r[1] ? 0.5 : 0.02, t + 0.02, r[1] ? 0.25 : 0.05); }
    step(); var iv = setInterval(step, 214);
    return { out: out, stop: function () { clearInterval(iv); oscs.forEach(function (o) { try { o.stop(); } catch (e) {} }); out.disconnect(); } };
  }
  function ampmic(host) {
    var w = {}, S = parseSet(host.getAttribute('data-set'));
    var st = { x: S.x != null ? +S.x : 0.35, d: +S.dist || 3, ang: +S.angle || 0, type: AMIC[S.type] ? S.type : 'dynamic', room: S.room === '1' };
    var box = card(host, 'Mic on a guitar speaker', w);
    var row = el('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start'; box.appendChild(row);
    var svg = sv('svg', { viewBox: '0 0 220 220', width: '220' }); svg.style.cssText = 'max-width:100%;border:1px solid ' + css('--site-border', '#ccc') + ';border-radius:6px;touch-action:none';
    row.appendChild(svg); var gbox = el('div'); gbox.style.cssText = 'flex:1 1 260px;min-width:0'; row.appendChild(gbox);
    var draw = freqCanvas(gbox, -30, 15), ctl = el('div', 'sk-ctls'), info = el('div', 'sk-info'); box.appendChild(ctl); box.appendChild(info);
    info.style.fontFamily = 'var(--font-mono)'; info.style.fontSize = '.82rem';
    box.appendChild(el('div', 'sk-tip', 'Drag the mic (the dot) from the dust cap in the middle out to the edge of the cone, and listen to the top end go. Then try further away, angled, a ribbon, and the room.'));
    var ink = css('--site-ink', '#222'), acc = css('--site-accent', '#2a7de1'), sur = css('--site-surface-2', '#eee'), cx = 110, cy = 110, R = 96;
    sv('rect', { x: 4, y: 4, width: 212, height: 212, rx: 6, fill: '#3a3a3a' }, svg);
    sv('circle', { cx: cx, cy: cy, r: R, fill: sur, stroke: ink, 'stroke-width': 2 }, svg);
    sv('circle', { cx: cx, cy: cy, r: R - 8, fill: 'none', stroke: ink, 'stroke-opacity': 0.4 }, svg);
    for (var rr = 30; rr < 88; rr += 14) sv('circle', { cx: cx, cy: cy, r: rr, fill: 'none', stroke: ink, 'stroke-opacity': 0.12 }, svg);
    sv('circle', { cx: cx, cy: cy, r: 22, fill: css('--site-surface', '#fff'), stroke: ink, 'stroke-width': 1.5 }, svg);
    [['cap', 0], ['cap edge', 30], ['cone', 58], ['edge', 84]].forEach(function (l) { var t = sv('text', { x: cx, y: cy - l[1] - (l[1] ? 3 : -4), 'text-anchor': 'middle', 'font-size': 10, fill: ink }, svg); t.textContent = l[0]; });
    var m = sv('g', {}, svg); sv('circle', { r: 10, fill: acc, 'fill-opacity': 0.85, stroke: ink, 'stroke-width': 1.5 }, m); sv('circle', { r: 3, fill: ink }, m);
    function pos() { return { x: cx + st.x * (R - 8) * 0.6, y: cy + st.x * (R - 8) * 0.8 }; }
    function where() { return st.x < 0.15 ? 'on the dust cap: brightest, most bite' : st.x < 0.4 ? 'at the cap\'s edge: bright and full, the usual start' : st.x < 0.75 ? 'on the cone: warmer, rounder' : 'near the edge: dark, woolly'; }
    var nodes = null;
    function upd() {
      var p = pos(); m.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')');
      var ref = { x: 0.3, d: 3, ang: 0, type: 'dynamic' };
      draw([{ f: function (f) { return ampTone(ref, f); }, col: css('--site-ink-3', '#999'), dash: [5, 4], w: 1.5 }, { f: function (f) { return ampTone(st, f); }, col: acc, w: 2.6 }]);
      var room = st.room ? Math.min(1, Math.max(0.08, (st.d - 5) / 80)) : 0;
      info.innerHTML = '<b>' + where() + '</b><br>' + st.d + ' cm, ' + st.ang + '&deg; angle, ' + AMIC[st.type].n + (st.room ? ', room ' + Math.round(room * 100) + '%' : '') +
        ' &nbsp; 3 kHz <b>' + fmtdb(ampTone(st, 3000) - ampTone(ref, 3000)) + '</b>, 150 Hz <b>' + fmtdb(ampTone(st, 150) - ampTone(ref, 150)) + '</b> (vs the dashed line: an SM57 at the cap edge, 3 cm)';
      if (nodes) {
        var x = st.x, th = st.ang * Math.PI / 180, mm = AMIC[st.type];
        setT(nodes.lp.frequency, 7500 * Math.pow(0.32, x) / Math.sqrt(1 + 3 * (1 - Math.cos(th))));
        setT(nodes.bite.gain, 5 * (1 - x)); setT(nodes.mids.gain, 3 * x);
        setT(nodes.prox.gain, Math.max(-6, Math.min(18, proxBoost(mm.A, st.d / 100, 80) - proxBoost(mm.A, 0.3, 80)))); setT(nodes.prox.frequency, Math.min(800, 343 / (2 * Math.PI * st.d / 100)));
        setT(nodes.type.gain, st.type === 'ribbon' ? -7 : st.type === 'condenser' ? 2 : 0); setT(nodes.pres.gain, st.type === 'dynamic' ? 4 : 0);
        setT(nodes.dry.gain, (1 - room * 0.7) * Math.min(1.5, 6 / st.d + 0.25)); setT(nodes.wet.gain, room * 0.6);
      }
    }
    w.start = function () {
      var c = ctx().ctx; stopOthers(w); var src = makeGuitar(c);
      nodes = { src: src, lp: bq(c, 'lowpass', 5000, null, 0.6), bite: bq(c, 'peaking', 2800, 0, 1.2), mids: bq(c, 'peaking', 220, 0, 1), prox: bq(c, 'lowshelf', 200, 0),
        type: bq(c, 'highshelf', 5000, 0), pres: bq(c, 'peaking', 4500, 0, 1.2), dry: c.createGain(), wet: c.createGain(), rv: c.createConvolver() };
      nodes.rv.buffer = getRoom(c, 'room');
      series([src.out, nodes.lp, nodes.bite, nodes.mids, nodes.prox, nodes.type, nodes.pres, nodes.dry, G.master]);
      nodes.pres.connect(nodes.rv); nodes.rv.connect(nodes.wet); nodes.wet.connect(G.master);
      w.playing = true; w.setBtn(); upd();
    };
    w.stop = function () { if (nodes) { nodes.src.stop(); [nodes.dry, nodes.wet, nodes.rv].forEach(function (n) { n.disconnect(); }); nodes = null; } w.playing = false; w.setBtn(); };
    dragger(svg, m, function (x, y) { var r = Math.hypot(x - cx, y - cy) / ((R - 8)); st.x = Math.round(Math.max(0, Math.min(1, r)) * 100) / 100; xs.set(st.x); upd(); });
    var xs = slider(ctl, 'Across the speaker', 0, 1, 0.01, st.x, function (v) { return v < 0.15 ? 'cap' : v < 0.4 ? 'cap edge' : v < 0.75 ? 'cone' : 'edge'; }, function (v) { st.x = v; upd(); });
    slider(ctl, 'Distance', 1, 100, 1, st.d, function (v) { return v + ' cm'; }, function (v) { st.d = v; upd(); });
    slider(ctl, 'Angle', 0, 60, 5, st.ang, function (v) { return v + '°'; }, function (v) { st.ang = v; upd(); });
    select(ctl, 'Mic', Object.keys(AMIC).map(function (k) { return [k, AMIC[k].n]; }), st.type, function (v) { st.type = v; upd(); });
    var rb = el('button', 'btn btn-sm btn-outline-secondary', ''); rb.type = 'button'; ctl.appendChild(rb);
    function setRoom(v) { st.room = v; rb.textContent = 'Room: ' + (v ? 'a live room' : 'dead (close mic only)'); rb.classList.toggle('sk-on', v); upd(); }
    rb.addEventListener('click', function () { setRoom(!st.room); }); setRoom(st.room);
  }

  // ---------- vocalmic: a singer's mouth and a mic, side view ----------
  // Plosives (p, b) are a jet of air going forward and a little down from the mouth, narrow (about ±15°): a mic in it gets a thump of
  // wind; out of it, or behind a pop filter, very little. Sibilance (s, sh, t) is high and beams forward from the mouth: above or
  // below the mouth's axis it is softer. The mic always points at the mouth here; it is the mouth's angle to the mic that changes.
  var VMIC = { condenser: { n: 'Large condenser', A: 0.5, s: 4, room: 1 }, dynamic: { n: 'Dynamic (SM7B / SM58 type)', A: 0.5, s: -2, room: 0.5 } };
  var PXCM = 5;                                                                 // the drawing: 5 units a centimetre
  function vocGeom(st) {
    var dx = st.mx - 70, dy = st.my - 110, d = Math.max(Math.hypot(dx, dy) / PXCM, 1), a = Math.atan2(dy, dx) * 180 / Math.PI;   // degrees below the mouth's axis (+ = down)
    return { d: d, a: a, jet: Math.abs(a - 8) };                                // the jet goes forward and about 8° down
  }
  function vocModel(st) {
    var g = vocGeom(st), m = VMIC[st.type];
    var inJet = Math.exp(-Math.pow(Math.max(0, g.jet - 6) / 12, 2));                       // full within ±6°, gone by about 30°
    var pop = inJet * Math.min(1, Math.pow(12 / g.d, 1.5)) * (st.filter ? 0.12 : 1);     // the jet spreads and slows with distance
    var sib = -10 * Math.log10(1 + Math.pow(7000 / 4500, 2) * (1 - Math.cos(g.a * Math.PI / 180)) * 2) + m.s;
    var prox = proxBoost(m.A, g.d / 100, 120) - proxBoost(m.A, 0.2, 120);
    var room = Math.min(1, (g.d / 60) * (st.room === 'boxy' ? 1 : st.room === 'treated' ? 0.25 : 0.6) * m.room);
    return { g: g, pop: pop, popdb: db(pop + 1e-4), sib: sib, prox: prox, room: room };
  }
  function makeSinger(c) {          // a voice-like line with a "p" at the start of a phrase and an "s" in the middle (separate outputs)
    var v = makeVoice(c), pop = c.createGain(), s = c.createGain(), nz = c.createBufferSource(); nz.buffer = getNoise(c); nz.loop = true; nz.start();
    var plp = bq(c, 'lowpass', 140, null, 0.9), pg = c.createGain(), shp = bq(c, 'bandpass', 7000, null, 1.4), sg = c.createGain();
    nz.connect(plp); plp.connect(pg); pg.connect(pop); nz.connect(shp); shp.connect(sg); sg.connect(s); pg.gain.value = 0; sg.gain.value = 0;
    function phrase() { var t = c.currentTime + 0.02;
      pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(9, t + 0.008); pg.gain.setTargetAtTime(0, t + 0.02, 0.035);      // "p": a thump of air
      sg.gain.setValueAtTime(0, t + 1.0); sg.gain.linearRampToValueAtTime(2.2, t + 1.05); sg.gain.setTargetAtTime(0, t + 1.2, 0.03); }  // "s"
    phrase(); var iv = setInterval(phrase, 2000);
    return { voice: v.out, pop: pop, s: s, stop: function () { clearInterval(iv); v.stop(); try { nz.stop(); } catch (e) {} pop.disconnect(); s.disconnect(); } };
  }
  function vocalmic(host) {
    var w = {}, S = parseSet(host.getAttribute('data-set'));
    var st = { mx: 70 + (+S.dist || 15) * PXCM, my: 110, type: VMIC[S.type] ? S.type : 'condenser', filter: S.filter === '1', room: S.room || 'untreated' };
    var box = card(host, 'Singer and mic, from the side', w);
    var svg = sv('svg', { viewBox: '0 0 420 220', width: '100%' }); svg.style.cssText = 'max-width:560px;display:block;border:1px solid ' + css('--site-border', '#ccc') + ';border-radius:6px;touch-action:none';
    box.appendChild(svg);
    var ink = css('--site-ink', '#222'), acc = css('--site-accent', '#2a7de1'), hot = '#d6336c', sur = css('--site-surface-2', '#eee');
    sv('path', { d: 'M40,20 C70,18 76,60 72,84 L80,100 L72,104 L76,112 L70,116 L74,124 C70,140 56,140 40,150 L40,210', fill: sur, stroke: ink, 'stroke-width': 2 }, svg);    // a head in profile, facing right
    sv('path', { d: 'M70,110 L420,159 L420,61 Z', fill: hot, 'fill-opacity': 0.08 }, svg);
    var jet = sv('path', { d: 'M70,110 L330,165 L330,126 Z', fill: hot, 'fill-opacity': 0.22, stroke: hot, 'stroke-dasharray': '4 3' }, svg);
    var jl = sv('text', { x: 300, y: 178, 'font-size': 10, fill: hot }, svg); jl.textContent = 'air jet (p, b)';
    for (var cm = 10; cm <= 60; cm += 10) { var t = sv('text', { x: 70 + cm * PXCM, y: 214, 'text-anchor': 'middle', 'font-size': 10, fill: css('--site-ink-2', '#555') }, svg); t.textContent = cm + ' cm'; }
    var pf = sv('g', {}, svg); sv('ellipse', { cx: 70 + 6 * PXCM, cy: 110, rx: 4, ry: 26, fill: 'none', stroke: ink, 'stroke-width': 2, 'stroke-dasharray': '2 2' }, pf);
    var pft = sv('text', { x: 70 + 6 * PXCM, y: 78, 'text-anchor': 'middle', 'font-size': 10, fill: ink }, pf); pft.textContent = 'pop filter';
    var mic = sv('g', {}, svg); sv('rect', { x: -8, y: -14, width: 34, height: 28, rx: 12, fill: css('--site-surface', '#fff'), stroke: ink, 'stroke-width': 2 }, mic); sv('rect', { x: 26, y: -5, width: 34, height: 10, rx: 3, fill: ink }, mic);
    var ctl = el('div', 'sk-ctls'), info = el('div', 'sk-info'); box.appendChild(ctl); box.appendChild(info); info.style.fontFamily = 'var(--font-mono)'; info.style.fontSize = '.82rem';
    box.appendChild(el('div', 'sk-tip', 'Drag the mic. Straight ahead and close, every "p" thumps (the air jet hits it) and the bass swells; a little above the mouth, pointing down at it, the pops go and the "s" softens. Then try the pop filter, distance, and the room.'));
    var n = null;
    function upd() {
      var M = vocModel(st), g = M.g;
      mic.setAttribute('transform', 'translate(' + st.mx.toFixed(1) + ',' + st.my.toFixed(1) + ') rotate(' + (g.a).toFixed(1) + ')');
      pf.style.display = st.filter ? '' : 'none';
      var popw = M.pop > 0.5 ? 'heavy' : M.pop > 0.15 ? 'some' : M.pop > 0.04 ? 'slight' : 'none';
      info.innerHTML = Math.round(g.d) + ' cm, ' + Math.abs(Math.round(g.a)) + '&deg; ' + (g.a > 1 ? 'below' : g.a < -1 ? 'above' : 'level with') + ' the mouth' +
        '<br>Plosives <b>' + popw + '</b> &nbsp; sibilance <b>' + fmtdb(M.sib) + '</b> (vs a flat mic, straight on) &nbsp; bass (proximity) <b>' + fmtdb(M.prox) + '</b> &nbsp; room <b>' + Math.round(M.room * 100) + '%</b>';
      if (n) {
        setT(n.popG.gain, M.pop * (st.type === 'dynamic' ? 0.7 : 1)); setT(n.sG.gain, Math.pow(10, M.sib / 20));
        setT(n.vHf.gain, Math.max(-12, M.sib * 0.6)); setT(n.prox.gain, Math.max(-6, Math.min(18, M.prox))); setT(n.prox.frequency, Math.min(600, 343 / (2 * Math.PI * g.d / 100)));
        setT(n.dry.gain, (1 - 0.6 * M.room) * Math.min(1.6, 15 / g.d + 0.2)); setT(n.wet.gain, M.room * 0.8);
        if (n.roomKind !== st.room) { n.rv.buffer = getRoom(G.ctx, st.room === 'boxy' ? 'boxy' : 'room'); n.roomKind = st.room; }
      }
    }
    w.start = function () {
      var c = ctx().ctx; stopOthers(w); var s = makeSinger(c);
      n = { s: s, popG: c.createGain(), sG: c.createGain(), vHf: bq(c, 'highshelf', 4000, 0), sum: c.createGain(), prox: bq(c, 'lowshelf', 200, 0), dry: c.createGain(), wet: c.createGain(), rv: c.createConvolver() };
      n.rv.buffer = getRoom(c, st.room === 'boxy' ? 'boxy' : 'room'); n.roomKind = st.room;
      s.voice.connect(n.vHf); n.vHf.connect(n.sum); s.pop.connect(n.popG); n.popG.connect(n.sum); s.s.connect(n.sG); n.sG.connect(n.sum);
      series([n.sum, n.prox, n.dry, G.master]); n.prox.connect(n.rv); n.rv.connect(n.wet); n.wet.connect(G.master);
      w.playing = true; w.setBtn(); upd();
    };
    w.stop = function () { if (n) { n.s.stop(); [n.dry, n.wet, n.rv, n.sum].forEach(function (x) { x.disconnect(); }); n = null; } w.playing = false; w.setBtn(); };
    dragger(svg, mic, function (x, y) { st.mx = Math.max(70 + 2 * PXCM, Math.min(410, x)); st.my = Math.max(20, Math.min(200, y)); upd(); });
    select(ctl, 'Mic', Object.keys(VMIC).map(function (k) { return [k, VMIC[k].n]; }), st.type, function (v) { st.type = v; upd(); });
    select(ctl, 'Room', [['treated', 'Treated (absorption)'], ['untreated', 'Ordinary room'], ['boxy', 'Small, bare (boxy)']], st.room, function (v) { st.room = v; upd(); });
    var fb = el('button', 'btn btn-sm btn-outline-secondary', ''); fb.type = 'button'; ctl.appendChild(fb);
    function setF(v) { st.filter = v; fb.textContent = 'Pop filter: ' + (v ? 'on' : 'off'); fb.classList.toggle('sk-on', v); upd(); }
    fb.addEventListener('click', function () { setF(!st.filter); }); setF(st.filter);
    var preset = el('button', 'btn btn-sm btn-outline-secondary', 'Usual spot: 15 cm, a little above'); preset.type = 'button'; ctl.appendChild(preset);
    preset.addEventListener('click', function () { st.mx = 70 + 15 * PXCM; st.my = 110 - 6 * PXCM; upd(); });
    w.model = function () { return vocModel(st); }; w.st = st; w.upd = upd;
  }

  var KINDS = { polar: polar, phase: phase, phantom: phantom, proximity: proximity, offaxis: offaxis, ampmic: ampmic, vocalmic: vocalmic };
  function init() {
    var hs = document.querySelectorAll('.rk');
    for (var i = 0; i < hs.length; i++) { var f = KINDS[hs[i].getAttribute('data-w')]; if (f && !hs[i].getAttribute('data-ready')) { hs[i].setAttribute('data-ready', '1'); f(hs[i]); } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
