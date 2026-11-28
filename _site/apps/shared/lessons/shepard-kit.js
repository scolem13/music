// shepard-kit.js — widgets for Sound 28: Shepard tones (lessons/sound-shepard.qmd). Load after synth-kit.js.
//   <div class="sk" data-w="shepard">   a Shepard scale (steps) or Shepard–Risset glissando (glide), up or down. Sine partials an
//                                        octave apart move together under a fixed bell-shaped loudness curve on a log-frequency
//                                        axis (a raised cosine, as on the Wikipedia page); a partial fades out at the top as a new
//                                        one fades in at the bottom, so the sound rises forever. Envelope "flat" gives away the
//                                        trick: you hear each partial jump back down. The plot shows the partials under the curve.
//   <div class="sk" data-w="tritone">   the tritone paradox (Deutsch 1986): two Shepard tones a tritone apart; you say up or down;
//                                        your answers are drawn on the pitch-class circle.
// Partials are recomputed every 20 ms with setTargetAtTime (a glide that smooth is inaudible as steps).
(function () {
  "use strict";
  var SK = window.SynthKit || window.SK; if (!SK || !SK.kit) return;
  var K = SK.kit, el = K.el, button = K.button;
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var C0 = 16.3516;   // C0 in Hz: pitch class 0 sits on every C
  function bell(x) { return x <= 0 || x >= 1 ? 0 : .5 - .5 * Math.cos(2 * Math.PI * x); }   // raised cosine over the span

  // a bank of octave-spaced sines; set(pos) puts pitch position pos (in octaves, any real) under the envelope
  function bank(c, out, oct, lo) {
    var parts = [];
    for (var k = 0; k < oct; k++) { var o = c.createOscillator(), g = c.createGain(); o.type = "sine"; g.gain.value = 0; o.connect(g); g.connect(out); o.start(); parts.push({ o: o, g: g }); }
    var span = oct, last = null;
    return {
      parts: parts,
      // pos: octaves above `lo`, mod 1 is the pitch class; flat: no envelope; tc: smoothing time
      set: function (pos, flat, tc, lvl) {
        var t = c.currentTime, frac = ((pos % 1) + 1) % 1, st = [];
        parts.forEach(function (p, k) {
          var x = (k + frac) / span, f = lo * Math.pow(2, k + frac), a = flat ? (x < .02 || x > .98 ? 0 : 1) : bell(x);
          var jump = last && Math.abs(last[k].f - f) > f * .2;     // the partial wrapped round: move it at once (it is silent there)
          if (jump || tc === 0) p.o.frequency.setValueAtTime(f, t); else p.o.frequency.setTargetAtTime(f, t, tc);
          p.g.gain.setTargetAtTime(a * lvl / Math.sqrt(span), t, tc || .005); st.push({ f: f, a: a, x: x });
        });
        last = st; return st;
      },
      stop: function () { parts.forEach(function (p) { try { p.o.stop(); } catch (e) {} }); }
    };
  }
  function css(name, d) { var v = getComputedStyle(document.body).getPropertyValue(name); return (v && v.trim()) || d; }
  // the partials (bars at log frequency, height = loudness) under the envelope
  function drawParts(cv, st, oct, flat, note) {
    var r = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
    if (cv.width !== W * r) { cv.width = W * r; cv.height = H * r; }
    var g = cv.getContext("2d"), ink = css("--site-ink-2", "#777"), acc = css("--site-accent", "#3fc2b4"), pad = 18;
    g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H); g.font = "11px sans-serif";
    g.strokeStyle = ink; g.globalAlpha = .5; g.beginPath();
    for (var i = 0; i <= 200; i++) { var x = i / 200, y = H - pad - (flat ? (x < .02 || x > .98 ? 0 : 1) : bell(x)) * (H - 2 * pad); i ? g.lineTo(x * W, y) : g.moveTo(x * W, y); }
    g.stroke(); g.globalAlpha = 1;
    for (i = 0; i <= oct; i++) { g.fillStyle = ink; g.fillRect(i / oct * W, H - pad, 1, 4); }
    g.fillStyle = ink; g.fillText("low", 2, H - 4); g.fillText("high (log frequency, one tick an octave)", W - 230, H - 4);
    g.fillText(flat ? "envelope: flat (the trick is gone)" : "envelope: bell (fixed)", 4, 12);
    (st || []).forEach(function (p) { var x = p.x * W, h = p.a * (H - 2 * pad); g.fillStyle = acc; g.fillRect(x - 3, H - pad - h, 6, h); });
    if (note) { g.fillStyle = acc; g.font = "bold 16px sans-serif"; g.fillText(note, W - 60, 18); }
  }

  function Shepard(host) {
    var w = K.Base(host, "Shepard tone"), run = null, cv;
    w.pick("motion", "Motion", [["glide", "Glide (Risset)"], ["steps", "Steps (Shepard scale)"]], "steps");
    w.pick("dir", "Direction", [["up", "Up"], ["down", "Down"], ["hold", "Hold still"]], "up");
    w.pick("env", "Loudness curve", [["bell", "Bell (the illusion)"], ["flat", "Flat (give the trick away)"]], "bell");
    w.num("speed", { label: "Speed", min: .5, max: 8, step: .1, value: 2, fmt: function (v) { return v.toFixed(1) + " semitones/s"; } });
    w.num("oct", { label: "Octaves in the stack", min: 3, max: 10, step: 1, value: 8, fmt: function (v) { return v + " octaves"; }, on: function () { if (w.running) { w.stop(); w.start(); } } });
    w.num("level", { label: "Level", min: 0, max: 1, step: .01, value: .6, fmt: function (v) { return Math.round(v * 100) + "%"; } });
    w.presets([
      { name: "Endless staircase", set: { motion: "steps", dir: "up", env: "bell", speed: 2 } },
      { name: "Falling forever", set: { motion: "glide", dir: "down", env: "bell", speed: 1 } },
      { name: "Riser", set: { motion: "glide", dir: "up", env: "bell", speed: 4 } },
      { name: "Give it away", set: { motion: "glide", dir: "up", env: "flat", speed: 3 } }
    ]);
    cv = el("canvas", "sk-plot shp-plot"); cv.setAttribute("aria-label", "The partials of the Shepard tone: each bar is one sine wave, its height its loudness, under the fixed loudness curve"); w.body.appendChild(cv);
    var noteOut = el("p", "shp-note", ""); w.body.appendChild(noteOut);
    w.view = K.viewer(w.body, { ms: 20 });
    w.pos = 0;
    w.onStart = function (c, out) {
      var oct = w.P.oct, lo = C0 * Math.pow(2, Math.floor(4.75 - oct / 2)), b = bank(c, out, oct, lo), last = performance.now(), acc = 0, step = 0, gate = c.createGain();
      // lo is a C, chosen so the stack is centred near 440 Hz whatever its size
      b.parts.forEach(function (p) { p.g.disconnect(); p.g.connect(gate); }); gate.connect(out);
      var iv = setInterval(function () {
        var now = performance.now(), dt = (now - last) / 1000; last = now;
        var sgn = w.P.dir === "up" ? 1 : w.P.dir === "down" ? -1 : 0, flat = w.P.env === "flat";
        if (w.P.motion === "glide") { w.pos += sgn * w.P.speed * dt / 12; w.st = b.set(w.pos, flat, .02, w.P.level); gate.gain.setTargetAtTime(1, c.currentTime, .02); }
        else {
          acc += dt * w.P.speed; var dur = 1 / w.P.speed;
          if (acc >= 1 || step === 0) { if (step) w.pos += sgn / 12; acc = acc % 1; step++;
            var t = c.currentTime; w.st = b.set(w.pos, flat, 0, w.P.level);
            gate.gain.cancelScheduledValues(t); gate.gain.setValueAtTime(0, t); gate.gain.linearRampToValueAtTime(1, t + .01);
            gate.gain.setValueAtTime(1, t + dur * .75); gate.gain.linearRampToValueAtTime(0, t + dur * .9); }   // short gaps: a clearer illusion
        }
        var pc = ((Math.round(w.pos * 12) % 12) + 12) % 12; w.pc = pc;
        noteOut.textContent = "Note: " + NAMES[pc] + (w.P.motion === "glide" ? " (passing)" : "") + "  ·  steps taken: " + Math.round(w.pos * 12);
        drawParts(cv, w.st, oct, flat, NAMES[pc]);
      }, 20);
      return function () { clearInterval(iv); setTimeout(function () { b.stop(); }, 200); };
    };
    w.redraw = function () { if (!w.running) drawParts(cv, w.st, w.P.oct, w.P.env === "flat"); };
    setTimeout(function () { var oct = w.P.oct, st = []; for (var k = 0; k < oct; k++) st.push({ x: k / oct, a: bell(k / oct) }); w.st = st; w.redraw(); }, 50);
    return w;
  }

  // ---- the tritone paradox ----
  function Tritone(host) {
    var w = K.Base(host, "The tritone paradox"), pair = null, ans = {}, cv, msg;
    w.playLabel = "▶ Play a pair"; w.playBtn.textContent = w.playLabel;
    var row = el("div", "sk-presets"); row.appendChild(el("span", "sk-cl", "Did it go"));
    var up = button(row, "Up ↑", function () { answer(1); }), dn = button(row, "Down ↓", function () { answer(-1); });
    button(row, "Hear it again", function () { if (pair != null) play(pair); });
    button(row, "Clear answers", function () { ans = {}; draw(); });
    w.body.insertBefore(row, w.ctls);
    msg = el("p", "shp-note", "Press Play a pair. Two Shepard tones a tritone (half an octave) apart: which way did it move?"); w.body.appendChild(msg);
    cv = el("canvas", "sk-plot shp-circle"); cv.setAttribute("aria-label", "The pitch-class circle: each note is coloured by your answers when the pair started on it"); w.body.appendChild(cv);
    w.view = K.viewer(w.body, { ms: 20 });
    function tone(c, out, pc, t, dur) {
      var oct = 6, lo = C0 * Math.pow(2, 1.5), env = c.createGain();   // span ~ 6 octaves centred near 370 Hz, as in the article's example
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + .02); env.gain.setValueAtTime(1, t + dur - .08); env.gain.linearRampToValueAtTime(0, t + dur); env.connect(out);
      for (var k = 0; k < oct; k++) { var x = (k + pc / 12) / oct, o = c.createOscillator(), g = c.createGain(); o.frequency.value = lo * Math.pow(2, k + pc / 12); g.gain.value = bell(x) * .25; o.connect(g); g.connect(env); o.start(t); o.stop(t + dur + .05); }
    }
    function play(pc) {
      pair = pc; w.stop(); w.start(); var c = SK.ac(), t = c.currentTime + .05;
      tone(c, w.out, pc, t, .6); tone(c, w.out, (pc + 6) % 12, t + .8, .6);
      clearTimeout(w.tm); w.tm = setTimeout(function () { w.stop(); }, 1700);
      msg.textContent = "Played " + NAMES[pc] + " then " + NAMES[(pc + 6) % 12] + ". Up or down?";
    }
    w.onStart = function () { return function () {}; };
    // the Base button toggles start/stop; for a pair we want a fresh pair each press
    w.playBtn.replaceWith(w.playBtn = button(w.tools, w.playLabel, function () { w.next(); }, "btn-outline-primary sk-play"));
    w.next = function () {
      var left = []; for (var i = 0; i < 12; i++) if (!(ans[i] && ans[i].length >= 2)) left.push(i);
      pair = (left.length ? left : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])[Math.floor(Math.random() * (left.length || 12))]; play(pair);
    };
    w.play = play;
    function answer(d) {
      if (pair == null) { msg.textContent = "Play a pair first."; return; }
      (ans[pair] = ans[pair] || []).push(d);
      msg.textContent = "You heard " + NAMES[pair] + " → " + NAMES[(pair + 6) % 12] + " go " + (d > 0 ? "up" : "down") + ". Next pair…"; draw(); pair = null;
      setTimeout(w.next, 700);
    }
    w.answers = function () { return ans; };
    function draw() {
      var r = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
      if (cv.width !== W * r) { cv.width = W * r; cv.height = H * r; }
      var g = cv.getContext("2d"), ink = css("--site-ink-2", "#777"), upC = css("--site-accent", "#3fc2b4"), dnC = "#d9822b";
      g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H); var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 24;
      g.strokeStyle = ink; g.globalAlpha = .4; g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke(); g.globalAlpha = 1;
      g.font = "12px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * 2 * Math.PI - Math.PI / 2, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a), l = ans[i] || [], s = l.reduce(function (p, q) { return p + q; }, 0);
        g.fillStyle = !l.length ? css("--site-bg", "#fff") : s > 0 ? upC : s < 0 ? dnC : ink; g.beginPath(); g.arc(x, y, 14, 0, 2 * Math.PI); g.fill(); g.strokeStyle = ink; g.stroke();
        g.fillStyle = l.length ? "#fff" : ink; g.fillText(NAMES[i], x, y);
        if (l.length) { g.fillStyle = ink; g.fillText((s > 0 ? "↑" : s < 0 ? "↓" : "?") + l.length, cx + (R - 30) * Math.cos(a), cy + (R - 30) * Math.sin(a)); }
      }
      g.fillStyle = upC; g.fillText("■ heard up", cx - 45, cy - 8); g.fillStyle = dnC; g.fillText("■ heard down", cx + 45, cy - 8);
      g.fillStyle = ink; g.fillText("(by the first note of the pair)", cx, cy + 10); g.textAlign = "start"; g.textBaseline = "alphabetic";
    }
    setTimeout(draw, 50); window.addEventListener("resize", draw);
    return w;
  }

  var st = document.createElement("style");
  st.textContent = ".sk-plot.shp-plot{height:200px}.sk-plot.shp-circle{height:300px;max-width:340px}.shp-note{font-family:var(--font-mono);font-size:.85rem;margin:.3rem 0}";
  document.head.appendChild(st);
  SK.kinds.shepard = Shepard; SK.kinds.tritone = Tritone;
})();
