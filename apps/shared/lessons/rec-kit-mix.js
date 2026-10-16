// rec-kit-mix.js - recording lessons 4 and 5 (monitoring, mixing). Plain Web Audio, nothing shared with the band.
// Every <div class="rk" data-w="..."> becomes a card (.sk-w) with a ▶/■ button. Kinds (data-w):
//   latency    the mic played back to you through a delay of 0-60 ms (buffer-size presets 64-1024 samples, shown in ms at the
//              context's sample rate), a mode for "direct monitoring AND DAW monitoring both on" (0 ms + the delay: the flanging
//              double, with the first notch of the comb shown), and a click to clap along to. WEAR HEADPHONES. The mic opens
//              only on Start and is released on Stop.
//   headmix    a cue mix: a generated backing (drums, bass, chords), a click and, if ticked, your mic; a fader for each, a headphone
//              reverb send, and a "speakers instead of headphones" switch that simulates bleed: backing and click reach the
//              recorded track about 18 dB down, delayed and dulled. Meters show the bleed against the voice (a voice at -18 dBFS
//              is assumed when the mic is off), and "Listen to" switches between the cue mix and the recorded track.
//   multitrack a five-track generated mini-song (drums, bass, chords, lead, pad): per track fader, pan, high-pass, mute and solo,
//              a shared reverb send, a master meter (RMS and peak) and a mono button. Presets: Flat, Bad mix, and a Reference
//              balance; A/B swaps your mix with the reference.
// One widget sounds at a time. Master volume starts modest; all output goes through a limiter.
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var current = null;
  function stopCurrent() { if (current) { var f = current; current = null; f(); } }
  function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function dbToG(d) { return Math.pow(10, d / 20); }
  function gToDb(g) { return g > 1e-5 ? 20 * Math.log10(g) : -100; }
  function smooth(ctx, p, v) { p.setTargetAtTime(v, ctx.currentTime, 0.02); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function fmtDb(v) { return (v <= -40 ? 'off' : (v > 0 ? '+' : '') + v.toFixed(1) + ' dB'); }

  var css = '.rk-row{display:grid;grid-template-columns:4.2rem repeat(4,minmax(6rem,1fr)) auto;gap:.2rem .8rem;align-items:end;padding:.3rem 0;border-top:1px dashed var(--site-border)}' +
    '.rk-row .rk-name{font-family:var(--font-display);font-size:.9rem;align-self:center}' +
    '.rk-ms{display:flex;gap:.25rem;align-self:center}' +
    '@media (max-width:700px){.rk-row{grid-template-columns:1fr 1fr}.rk-row .rk-name{grid-column:1/-1}}' +
    '.rk-meter{position:relative;height:14px;border:1px solid var(--site-border);border-radius:4px;background:var(--site-bg,transparent);overflow:hidden;margin:.15rem 0}' +
    '.rk-meter i{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--site-accent)}' +
    '.rk-meter b{position:absolute;top:0;bottom:0;width:2px;background:var(--site-ink)}' +
    '.rk-ml{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:.72rem;color:var(--site-ink-2)}' +
    '.rk-seg{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;margin:.3rem 0}' +
    '.rk-seg .sk-cl{font-family:var(--font-mono);font-size:.7rem;text-transform:uppercase;color:var(--site-ink-2)}';
  var cssDone = false;
  function injectCss() { if (cssDone) return; cssDone = true; var s = mk('style'); s.textContent = css; document.head.appendChild(s); }

  function ctl(label, min, max, step, val, fmt, cb) {
    var d = mk('label', 'sk-c'), l = mk('span', 'sk-cl', label), o = mk('output'), i = mk('input');
    i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    d.appendChild(l); d.appendChild(o); d.appendChild(i);
    function show() { o.textContent = fmt(+i.value); }
    i.addEventListener('input', function () { show(); cb(+i.value); });
    show();
    return { el: d, input: i, set: function (v) { i.value = v; show(); } };
  }
  function btn(txt, cb) { var b = mk('button', 'btn btn-sm btn-outline-secondary', txt); b.type = 'button'; b.addEventListener('click', cb); return b; }

  // a card with a title, a play button and a status line; returns the pieces and wires start/stop
  function card(el, title, start, stop) {
    injectCss();
    el.classList.add('sk-w');
    var head = mk('div', 'sk-head'), t = mk('span', 'sk-title', el.dataset.title || title);
    var tools = mk('div', 'sk-tools'), play = btn('▶', function () { playing ? halt() : go(); });
    var status = mk('span', 'sk-status', '');
    tools.appendChild(play); head.appendChild(t); head.appendChild(tools); el.appendChild(head);
    var body = mk('div'); el.appendChild(body);
    var playing = false;
    function halt() { if (!playing) return; playing = false; if (current === halt) current = null; el.classList.remove('sk-live'); play.textContent = '▶'; play.classList.remove('sk-on'); stop(); }
    function go() {
      stopCurrent(); playing = true; current = halt; el.classList.add('sk-live'); play.textContent = '■'; play.classList.add('sk-on');
      Promise.resolve(start()).catch(function (e) { status.textContent = 'Could not start: ' + (e && e.message || e); halt(); });
    }
    tools.appendChild(status);
    return { body: body, status: status, tools: tools, isPlaying: function () { return playing; }, halt: halt };
  }

  // a context with a master volume and a limiter
  function base(vol) {
    var ctx = new AC({ latencyHint: 'interactive' });
    var master = ctx.createGain(); master.gain.value = vol;
    var lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.08;
    master.connect(lim); lim.connect(ctx.destination);
    return { ctx: ctx, master: master };
  }
  function impulse(ctx, secs) {
    var len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  function openMic() {
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  }
  function rmsDb(an, buf) {
    an.getFloatTimeDomainData(buf);
    var s = 0, pk = 0; for (var i = 0; i < buf.length; i++) { var x = buf[i]; s += x * x; if (Math.abs(x) > pk) pk = Math.abs(x); }
    return { rms: gToDb(Math.sqrt(s / buf.length)), peak: gToDb(pk) };
  }
  function meter() {
    var m = mk('div', 'rk-meter'), bar = mk('i'), hold = mk('b'); m.appendChild(bar); m.appendChild(hold);
    function pos(db) { return Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%'; }
    return { el: m, set: function (db, pk) { bar.style.width = pos(db); if (pk != null) hold.style.left = pos(pk); } };
  }

  // ---- the generated band: 96 bpm, 4 bars of Am F C G, 16 steps a bar ----
  var CH = [{ r: 33, t: [57, 60, 64] }, { r: 29, t: [57, 60, 65] }, { r: 36, t: [55, 60, 64] }, { r: 31, t: [55, 59, 62] }];
  function Band(ctx, out, bpm) {
    var sr = ctx.sampleRate, nb = ctx.createBuffer(1, sr, sr), nd = nb.getChannelData(0);
    for (var i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
    var spb = 60 / bpm / 4, timer = null, next = 0, step = 0;
    function env(g, t, a, pk, end) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + end); }
    function osc(type, f, t, dur, to) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(t + dur + 0.05); o.connect(to); return o; }
    function noise(t, dur, to) { var s = ctx.createBufferSource(); s.buffer = nb; s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); s.connect(to); }
    function kick(t, o) {
      var g = ctx.createGain(), s = ctx.createOscillator(); s.frequency.setValueAtTime(130, t); s.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      env(g, t, 0.003, 0.9, 0.35); s.connect(g); g.connect(o); s.start(t); s.stop(t + 0.4);
    }
    function snare(t, o) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200; env(g, t, 0.002, 0.45, 0.18);
      noise(t, 0.2, f); f.connect(g); g.connect(o);
      var g2 = ctx.createGain(); env(g2, t, 0.002, 0.3, 0.1); osc('triangle', 190, t, 0.12, g2); g2.connect(o);
    }
    function hat(t, o, v) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; env(g, t, 0.001, v, 0.05);
      noise(t, 0.06, f); f.connect(g); g.connect(o);
    }
    function bass(t, o, m, d) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      env(g, t, 0.01, 0.4, d); osc('sawtooth', mtof(m), t, d, f); f.connect(g); g.connect(o);
    }
    function stab(t, o, tri, d) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      env(g, t, 0.005, 0.1, d); tri.forEach(function (m) { osc('sawtooth', mtof(m), t, d, f); }); f.connect(g); g.connect(o);
    }
    function lead(t, o, m, d) {
      var g = ctx.createGain(); env(g, t, 0.01, 0.2, d); osc('triangle', mtof(m), t, d, g); osc('square', mtof(m) * 1.003, t, d, g).frequency.value *= 1; g.connect(o);
    }
    function pad(t, o, tri, d) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.45); g.gain.setValueAtTime(0.06, t + d - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.3);
      tri.forEach(function (m) { osc('sawtooth', mtof(m) * 0.997, t, d + 0.3, f); osc('sawtooth', mtof(m) * 1.003, t, d + 0.3, f); });
      f.connect(g); g.connect(o);
    }
    function click(t, o, acc) {
      var g = ctx.createGain(); env(g, t, 0.001, acc ? 0.5 : 0.35, 0.04); osc('square', acc ? 2000 : 1500, t, 0.05, g); g.connect(o);
    }
    var LEAD = [[0, 1, 2, 1, 0, -1, 2, 1], [2, 1, 0, 1, 2, 2, -1, 1]];
    function sched(s, t) {
      var bar = Math.floor(s / 16) % 4, st = s % 16, c = CH[bar];
      if (out.click && st % 4 === 0) click(t, out.click, st === 0);
      if (out.drums) {
        if (st === 0 || st === 7 || st === 10) kick(t, out.drums);
        if (st === 4 || st === 12) snare(t, out.drums);
        if (st % 2 === 0) hat(t, out.drums, st % 4 === 0 ? 0.18 : 0.1);
      }
      if (out.bass) {
        if (st === 0 || st === 6 || st === 8 || st === 14) bass(t, out.bass, c.r, spb * 2);
        else if (st === 11) bass(t, out.bass, c.r + 7, spb * 2);
      }
      if (out.chords && st % 4 === 2) stab(t, out.chords, c.t, spb * 1.5);
      if (out.lead && st % 2 === 0) {
        var k = LEAD[bar % 2][st / 2]; if (k >= 0) lead(t, out.lead, c.t[k] + 12, spb * 1.8);
      }
      if (out.pad && st === 0) pad(t, out.pad, c.t, spb * 16);
    }
    function tick() { while (next < ctx.currentTime + 0.12) { sched(step, next); next += spb; step++; } }
    return {
      start: function () { next = ctx.currentTime + 0.1; step = 0; timer = setInterval(tick, 25); },
      stop: function () { clearInterval(timer); timer = null; }
    };
  }

  // ---- latency ----
  function latency(el) {
    var A = null, band = null, stream = null, sr = 48000, raf = 0, mode = 'delayed', ms = 11, clickOn = true;
    var delay, dG, wG, micG, clickG, msCtl, info, presets = [];
    var c = card(el, 'Hear your own latency (wear headphones)', start, stop);
    var b = c.body;
    b.appendChild(mk('div', 'sk-care', 'Wear headphones, closed-back if you can. Your microphone opens when you press ▶; with speakers it will howl. Turn the volume down first.'));
    var pr = mk('div', 'rk-seg'); pr.appendChild(mk('span', 'sk-cl', 'Buffer size'));
    [64, 128, 256, 512, 1024].forEach(function (n) {
      var bt = btn('', function () { setMs(Math.min(60, 2 * n / sr * 1000)); }); bt.dataset.n = n; presets.push(bt); pr.appendChild(bt);
    });
    b.appendChild(pr);
    function labels() { presets.forEach(function (bt) { var n = +bt.dataset.n, e = n / sr * 1000; bt.textContent = n + ' = ' + e.toFixed(1) + ' ms'; bt.title = 'each way; in and out together ' + (2 * e).toFixed(1) + ' ms'; }); }
    labels();
    var ctls = mk('div', 'sk-ctls');
    msCtl = ctl('Delay (the round trip in + out)', 0, 60, 0.5, ms, function (v) { return v.toFixed(1) + ' ms'; }, function (v) { setMs(v); });
    var modeSel = mk('select'); [['delayed', 'DAW monitoring only (delayed)'], ['direct', 'Direct monitoring only (0 ms)'], ['both', 'Both on (0 ms + delayed)']].forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; modeSel.appendChild(op); });
    modeSel.addEventListener('change', function () { mode = modeSel.value; apply(); });
    var mw = mk('label', 'sk-c'); mw.appendChild(mk('span', 'sk-cl', 'Monitoring')); mw.appendChild(modeSel);
    var vol = ctl('Volume', 0, 1, 0.01, 0.5, function (v) { return Math.round(v * 100) + '%'; }, function (v) { if (A) smooth(A.ctx, A.master.gain, v); });
    ctls.appendChild(msCtl.el); ctls.appendChild(mw); ctls.appendChild(vol.el); b.appendChild(ctls);
    var ck = btn('Click: on', function () { clickOn = !clickOn; ck.textContent = 'Click: ' + (clickOn ? 'on' : 'off'); ck.classList.toggle('sk-on', clickOn); apply(); }); ck.classList.add('sk-on');
    c.tools.insertBefore(ck, c.tools.firstChild);
    info = mk('div', 'sk-info'); b.appendChild(info);
    b.appendChild(mk('p', 'sk-info', 'Clap or speak along with the click. Under about 10 ms feels immediate; past 20 ms your voice sounds late. With both monitors on, the 0 ms and delayed copies add up to a comb filter: that is the flanging described above.'));
    function setMs(v) { ms = v; msCtl.set(v); apply(); }
    function apply() {
      var total = ms, text;
      if (A) {
        smooth(A.ctx, delay.delayTime, ms / 1000);
        smooth(A.ctx, dG.gain, mode === 'delayed' ? 0 : mode === 'direct' ? 1 : 0.7);
        smooth(A.ctx, wG.gain, mode === 'direct' ? 0 : mode === 'delayed' ? 1 : 0.7);
        smooth(A.ctx, clickG.gain, clickOn ? 0.5 : 0);
      }
      if (mode === 'direct') text = 'Direct: you hear yourself with no added delay.';
      else if (mode === 'both') text = 'Both on: 0 ms plus ' + total.toFixed(1) + ' ms. ' + (total > 0 ? 'The first notch of the comb is near ' + Math.round(500 / total * 1) + ' Hz (hollow, flanged sound).' : 'No gap, so it just sounds louder.');
      else text = total.toFixed(1) + ' ms: ' + (total < 10 ? 'most players will not notice.' : total < 20 ? 'noticeable; drummers and singers feel it.' : 'sounds like singing in a tunnel and timing suffers.');
      if (A) { var sys = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0); text += ' This browser already adds about ' + (sys * 1000).toFixed(0) + ' ms of its own.'; }
      info.textContent = text;
    }
    async function start() {
      c.status.textContent = 'Opening the microphone...';
      A = base(vol.input.value * 1); var ctx = A.ctx; sr = ctx.sampleRate; labels();
      delay = ctx.createDelay(1); dG = ctx.createGain(); wG = ctx.createGain(); clickG = ctx.createGain();
      dG.gain.value = 0; wG.gain.value = 0; delay.connect(wG); wG.connect(A.master); dG.connect(A.master); clickG.connect(A.master);
      band = Band(ctx, { click: clickG }, 90); band.start(); apply();
      try {
        stream = await openMic();
        if (!c.isPlaying()) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        var src = ctx.createMediaStreamSource(stream); src.connect(dG); src.connect(delay);
        c.status.textContent = 'Live at ' + Math.round(sr) + ' Hz.';
      } catch (e) { c.status.textContent = 'No microphone (' + (e && e.name || 'denied') + '): the click plays, but there is nothing to monitor.'; }
    }
    function stop() {
      if (band) band.stop(); band = null;
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null;
      if (A) { try { A.ctx.close(); } catch (e) { } } A = null; c.status.textContent = '';
    }
  }

  // ---- headmix ----
  function headmix(el) {
    var A = null, band = null, stream = null, raf = 0, micOn = false, speakers = false, listen = 'cue';
    var G = {}, lv = { drums: -6, bass: -6, chords: -10, click: -14, mic: -3 }, send = 0.25;
    var micSrc, micG, micRec, revSend, cueOut, recOut, couple = [], an = {}, bufs = {};
    var c = card(el, 'Build a headphone mix', start, stop);
    var b = c.body;
    b.appendChild(mk('div', 'sk-care', 'Wear headphones. If you tick the microphone, it opens only while this is playing. Never use speakers with an open mic here.'));
    var ctls = mk('div', 'sk-ctls'), cs = {};
    [['drums', 'Drums'], ['bass', 'Bass'], ['chords', 'Chords'], ['click', 'Click'], ['mic', 'Your mic']].forEach(function (k) {
      cs[k[0]] = ctl(k[1], -40, 6, 0.5, lv[k[0]], fmtDb, function (v) { lv[k[0]] = v; apply(); }); ctls.appendChild(cs[k[0]].el);
    });
    var rv = ctl('Headphone reverb send', 0, 1, 0.01, send, function (v) { return Math.round(v * 100) + '%'; }, function (v) { send = v; apply(); });
    var vol = ctl('Volume', 0, 1, 0.01, 0.5, function (v) { return Math.round(v * 100) + '%'; }, function (v) { if (A) smooth(A.ctx, A.master.gain, v); });
    ctls.appendChild(rv.el); ctls.appendChild(vol.el); b.appendChild(ctls);
    var row = mk('div', 'rk-seg');
    var micB = btn('Include my microphone: off', function () {
      micOn = !micOn; micB.textContent = 'Include my microphone: ' + (micOn ? 'on' : 'off'); micB.classList.toggle('sk-on', micOn);
      if (c.isPlaying()) micOn ? openMicIn() : closeMicIn();
    });
    var spB = btn('Speakers instead of headphones: off', function () {
      speakers = !speakers; spB.textContent = 'Speakers instead of headphones: ' + (speakers ? 'ON' : 'off'); spB.classList.toggle('sk-on', speakers); apply();
    });
    var lsel = mk('select'); [['cue', 'what the singer hears (cue mix)'], ['rec', 'what gets recorded (mic + bleed)']].forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; lsel.appendChild(op); });
    lsel.addEventListener('change', function () { listen = lsel.value; apply(); });
    row.appendChild(micB); row.appendChild(spB); row.appendChild(mk('span', 'sk-cl', 'Listen to')); row.appendChild(lsel); b.appendChild(row);
    var mBleed = meter(), mClick = meter(), mVoice = meter();
    var tB = mk('div', 'rk-ml'), tC = mk('div', 'rk-ml'), tV = mk('div', 'rk-ml'), res = mk('div', 'sk-info');
    [[tV, mVoice], [tB, mBleed], [tC, mClick]].forEach(function (p) { b.appendChild(p[0]); b.appendChild(p[1].el); });
    b.appendChild(res);
    b.appendChild(mk('p', 'sk-info', 'The meters show the recorded track (the mic as it records): your voice, then the backing and click that reach the mic. On speakers the click lands in the recording and cannot be removed; on closed-back headphones it nearly disappears.'));
    function apply() {
      if (!A) return; var ctx = A.ctx;
      ['drums', 'bass', 'chords', 'click', 'mic'].forEach(function (k) { smooth(ctx, G[k].gain, lv[k] <= -40 ? 0 : dbToG(lv[k])); });
      smooth(ctx, revSend.gain, send * 0.6);
      var cp = speakers ? dbToG(-18) : dbToG(-60);
      couple.forEach(function (n) { smooth(ctx, n.gain, cp); });
      smooth(ctx, cueOut.gain, listen === 'cue' ? 1 : 0); smooth(ctx, recOut.gain, listen === 'rec' ? 1 : 0);
    }
    async function openMicIn() {
      try {
        stream = await openMic();
        if (!c.isPlaying() || !micOn) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; return; }
        micSrc = A.ctx.createMediaStreamSource(stream); micSrc.connect(G.mic); micSrc.connect(micRec);
      } catch (e) { micOn = false; micB.textContent = 'Include my microphone: off'; micB.classList.remove('sk-on'); c.status.textContent = 'No microphone (' + (e && e.name || 'denied') + ').'; }
    }
    function closeMicIn() {
      if (micSrc) { try { micSrc.disconnect(); } catch (e) { } micSrc = null; }
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null;
    }
    function draw() {
      raf = requestAnimationFrame(draw); if (!A) return;
      var v = rmsDb(an.voice, bufs.v), bl = rmsDb(an.bleed, bufs.b), ck = rmsDb(an.click, bufs.c);
      var voice = micOn && micSrc ? v.rms : -18;
      mVoice.set(micOn && micSrc ? v.rms : -18, null); mBleed.set(bl.rms, null); mClick.set(ck.rms, null);
      tV.textContent = ''; tV.appendChild(mk('span', null, micOn && micSrc ? 'Your voice in the recording' : 'Your voice (assumed -18 dBFS: mic is off)')); tV.appendChild(mk('span', null, Math.round(voice) + ' dB'));
      tB.textContent = ''; tB.appendChild(mk('span', null, 'Backing + click bleeding in')); tB.appendChild(mk('span', null, bl.rms > -90 ? Math.round(bl.rms) + ' dB' : 'silent'));
      tC.textContent = ''; tC.appendChild(mk('span', null, 'Click alone')); tC.appendChild(mk('span', null, ck.rms > -90 ? Math.round(ck.rms) + ' dB' : 'silent'));
      if (bl.rms < -80) res.textContent = 'Nothing but your voice reaches the recording.';
      else { var gap = voice - bl.rms; res.textContent = 'Bleed sits ' + Math.round(gap) + ' dB under the voice: ' + (gap > 30 ? 'hardly audible.' : gap > 20 ? 'faint, but the click will show in quiet passages.' : 'plainly audible and impossible to remove.'); }
    }
    async function start() {
      A = base(vol.input.value * 1); var ctx = A.ctx;
      ['drums', 'bass', 'chords', 'click', 'mic'].forEach(function (k) { G[k] = ctx.createGain(); G[k].gain.value = 0; });
      var back = ctx.createGain(), cue = ctx.createGain(), rec = ctx.createGain(), bleed = ctx.createGain();
      cueOut = ctx.createGain(); recOut = ctx.createGain(); micRec = ctx.createGain(); revSend = ctx.createGain();
      ['drums', 'bass', 'chords'].forEach(function (k) { G[k].connect(back); });
      back.connect(cue); G.click.connect(cue); G.mic.connect(cue);
      var rv = ctx.createConvolver(); rv.buffer = impulse(ctx, 1.8); var rr = ctx.createGain(); rr.gain.value = 0.8;
      G.mic.connect(revSend); back.connect(revSend); revSend.connect(rv); rv.connect(rr); rr.connect(cue);
      cue.connect(cueOut); cueOut.connect(A.master);
      var cb = ctx.createGain(), cc = ctx.createGain(); couple = [cb, cc];
      var dl = ctx.createDelay(0.1); dl.delayTime.value = 0.012; var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
      back.connect(cb); G.click.connect(cc); cb.connect(bleed); cc.connect(bleed); bleed.connect(dl); dl.connect(lp); lp.connect(rec);
      micRec.connect(rec); rec.connect(recOut); recOut.connect(A.master);
      an.voice = ctx.createAnalyser(); an.bleed = ctx.createAnalyser(); an.click = ctx.createAnalyser();
      micRec.connect(an.voice); bleed.connect(an.bleed); cc.connect(an.click);
      bufs.v = new Float32Array(an.voice.fftSize); bufs.b = new Float32Array(an.bleed.fftSize); bufs.c = new Float32Array(an.click.fftSize);
      band = Band(ctx, { drums: G.drums, bass: G.bass, chords: G.chords, click: G.click }, 96); band.start(); apply(); draw();
      c.status.textContent = 'Playing.';
      if (micOn) openMicIn();
    }
    function stop() {
      cancelAnimationFrame(raf); if (band) band.stop(); band = null; closeMicIn();
      if (A) { try { A.ctx.close(); } catch (e) { } } A = null; c.status.textContent = '';
    }
  }

  // ---- multitrack ----
  var TR = [['drums', 'Drums'], ['bass', 'Bass'], ['chords', 'Chords'], ['lead', 'Lead'], ['pad', 'Pad']];
  var MIX = {
    flat: { drums: [-10, 0, 20, 0], bass: [-10, 0, 20, 0], chords: [-10, 0, 20, 0], lead: [-10, 0, 20, 0], pad: [-10, 0, 20, 0] },
    bad: { drums: [-16, 0, 20, 0.6], bass: [2, 0, 20, 0.6], chords: [0, -1, 20, 0.1], lead: [-18, 0, 20, 0], pad: [-1, -1, 20, 0.3] },
    ref: { drums: [-6, 0, 30, 0.05], bass: [-7, 0, 30, 0], chords: [-13, -0.5, 150, 0.15], lead: [-9, 0.2, 150, 0.25], pad: [-16, 0.5, 200, 0.35] }
  };
  function clone(m) { var o = {}; TR.forEach(function (t) { o[t[0]] = m[t[0]].slice(); }); return o; }
  function multitrack(el) {
    var A = null, band = null, raf = 0, mono = false, state = clone(MIX.flat), mine = null, ab = 'A', pkHold = -100, pkT = 0;
    var muted = {}, soloed = {}, nodes = {}, rows = {}, monoNode, an, buf, revRet;
    var c = card(el, 'Mix a five-track song', start, stop);
    var b = c.body;
    var pre = mk('div', 'sk-presets'); pre.appendChild(mk('span', 'sk-cl', 'Start from'));
    var abB = mk('div', 'rk-seg'); abB.appendChild(mk('span', 'sk-cl', 'Compare'));
    var bA = btn('A: my mix', function () { setAB('A'); }), bB = btn('B: reference', function () { setAB('B'); });
    abB.appendChild(bA); abB.appendChild(bB);
    pre.appendChild(btn('Flat', function () { load(MIX.flat); })); pre.appendChild(btn('A bad mix', function () { load(MIX.bad); }));
    var monoB = btn('Mono: off', function () {
      mono = !mono; monoB.textContent = 'Mono: ' + (mono ? 'on' : 'off'); monoB.classList.toggle('sk-on', mono);
      if (monoNode) monoNode.channelCount = mono ? 1 : 2;
    });
    pre.appendChild(monoB); b.appendChild(pre); b.appendChild(abB);
    var hzf = function (v) { return Math.round(20 * Math.pow(20, v / 100)); };
    TR.forEach(function (t) {
      var k = t[0], r = mk('div', 'rk-row'), cs = {};
      r.appendChild(mk('span', 'rk-name', t[1]));
      cs.db = ctl('Fader', -40, 6, 0.5, state[k][0], fmtDb, function (v) { edit(); state[k][0] = v; apply(); });
      cs.pan = ctl('Pan', -1, 1, 0.05, 0, function (v) { return Math.abs(v) < 0.03 ? 'C' : (v < 0 ? 'L' : 'R') + Math.round(Math.abs(v) * 100); }, function (v) { edit(); state[k][1] = v; apply(); });
      cs.hp = ctl('High-pass', 0, 100, 1, 0, function (v) { return hzf(v) + ' Hz'; }, function (v) { edit(); state[k][2] = hzf(v); apply(); });
      cs.send = ctl('Reverb send', 0, 1, 0.01, 0, function (v) { return Math.round(v * 100) + '%'; }, function (v) { edit(); state[k][3] = v; apply(); });
      ['db', 'pan', 'hp', 'send'].forEach(function (n) { r.appendChild(cs[n].el); });
      var ms = mk('div', 'rk-ms'), mB = btn('M', function () { muted[k] = !muted[k]; mB.classList.toggle('sk-on', !!muted[k]); apply(); }),
        sB = btn('S', function () { soloed[k] = !soloed[k]; sB.classList.toggle('sk-on', !!soloed[k]); apply(); });
      mB.title = 'mute'; sB.title = 'solo'; ms.appendChild(mB); ms.appendChild(sB); r.appendChild(ms); b.appendChild(r); rows[k] = cs;
    });
    var gl = mk('div', 'sk-ctls');
    var rvl = ctl('Reverb length', 0.5, 4, 0.1, 1.8, function (v) { return v.toFixed(1) + ' s'; }, function (v) { if (A) revConv.buffer = impulse(A.ctx, v); });
    var vol = ctl('Master volume', 0, 1, 0.01, 0.5, function (v) { return Math.round(v * 100) + '%'; }, function (v) { if (A) smooth(A.ctx, A.master.gain, v); });
    gl.appendChild(rvl.el); gl.appendChild(vol.el); b.appendChild(gl);
    var mm = meter(), ml = mk('div', 'rk-ml'); b.appendChild(ml); b.appendChild(mm.el);
    b.appendChild(mk('p', 'sk-info', 'Aim for a balance where every part can be heard, the master peaking around -6 dB, and the mix still working with Mono on. Try Bad mix, fix it, then press B to compare with a reference balance.'));
    var revConv;
    function hpHz(h) { return h; }
    function writeUI() {
      TR.forEach(function (t) {
        var k = t[0], s = state[k], cs = rows[k];
        cs.db.set(s[0]); cs.pan.set(s[1]); cs.hp.set(Math.round(100 * Math.log(s[2] / 20) / Math.log(20))); cs.send.set(s[3]);
      });
    }
    function load(m) { state = clone(m); ab = 'A'; mine = null; syncAB(); writeUI(); apply(); }
    function setAB(w) {
      if (w === ab) return;
      if (w === 'B') { mine = clone(state); state = clone(MIX.ref); } else { state = mine ? clone(mine) : state; }
      ab = w; syncAB(); writeUI(); apply();
    }
    function edit() { if (ab === 'B') { ab = 'A'; mine = null; syncAB(); } }
    function syncAB() { bA.classList.toggle('sk-on', ab === 'A'); bB.classList.toggle('sk-on', ab === 'B'); }
    syncAB();
    function apply() {
      if (!A) return; var ctx = A.ctx, anySolo = TR.some(function (t) { return soloed[t[0]]; });
      TR.forEach(function (t) {
        var k = t[0], s = state[k], n = nodes[k], off = muted[k] || (anySolo && !soloed[k]) || s[0] <= -40;
        smooth(ctx, n.fad.gain, off ? 0 : dbToG(s[0])); smooth(ctx, n.pan.pan, s[1]); smooth(ctx, n.hp.frequency, Math.max(20, s[2])); smooth(ctx, n.send.gain, s[3]);
      });
    }
    function draw() {
      raf = requestAnimationFrame(draw); if (!A) return;
      var r = rmsDb(an, buf), now = performance.now();
      if (r.peak > pkHold || now - pkT > 1500) { pkHold = Math.max(r.peak, pkHold - 0.5); if (r.peak >= pkHold) pkT = now; }
      mm.set(r.rms, pkHold);
      ml.textContent = ''; ml.appendChild(mk('span', null, 'Master  RMS ' + Math.round(r.rms) + ' dB   peak ' + Math.round(pkHold) + ' dB'));
      ml.appendChild(mk('span', null, pkHold > -1 ? 'too hot: turn things down' : pkHold < -18 ? 'quiet' : pkHold > -3 ? 'hot' : 'good headroom'));
    }
    function start() {
      A = base(vol.input.value * 1); var ctx = A.ctx;
      var bus = ctx.createGain(), rvIn = ctx.createGain(); revConv = ctx.createConvolver(); revConv.buffer = impulse(ctx, +rvl.input.value);
      var rhp = ctx.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 200; var rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 6000;
      rvIn.connect(rhp); rhp.connect(revConv); revConv.connect(rlp); rlp.connect(bus);
      var out = {};
      TR.forEach(function (t) {
        var n = { tin: ctx.createGain(), hp: ctx.createBiquadFilter(), pan: ctx.createStereoPanner(), fad: ctx.createGain(), send: ctx.createGain() };
        n.hp.type = 'highpass'; n.fad.gain.value = 0; n.send.gain.value = 0;
        n.tin.connect(n.hp); n.hp.connect(n.pan); n.pan.connect(n.fad); n.fad.connect(bus); n.fad.connect(n.send); n.send.connect(rvIn);
        nodes[t[0]] = n; out[t[0]] = n.tin;
      });
      monoNode = ctx.createGain(); monoNode.channelCountMode = 'explicit'; monoNode.channelInterpretation = 'speakers'; monoNode.channelCount = mono ? 1 : 2;
      an = ctx.createAnalyser(); buf = new Float32Array(an.fftSize); pkHold = -100;
      bus.connect(monoNode); monoNode.connect(an); monoNode.connect(A.master);
      band = Band(ctx, out, 96); band.start(); apply(); draw(); c.status.textContent = 'Playing.';
    }
    function stop() {
      cancelAnimationFrame(raf); if (band) band.stop(); band = null; monoNode = null;
      if (A) { try { A.ctx.close(); } catch (e) { } } A = null; c.status.textContent = '';
    }
    load(MIX.flat);
  }

  var KINDS = { latency: latency, headmix: headmix, multitrack: multitrack };
  function init() {
    var els = document.querySelectorAll('div.rk[data-w]');
    for (var i = 0; i < els.length; i++) { var f = KINDS[els[i].dataset.w]; if (f && !els[i].dataset.rkDone) { els[i].dataset.rkDone = 1; f(els[i]); } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
