// strobe-view.js — how a strobe tuner looks and what it says, shared by the lessons' `tuner` widget (synth-kit.js) and the navbar's
// Tuner panel (tuner-panel.js). The maths is not here: PitchDetect.strobe (pitch-detect.js) makes the bands, this only draws them.
// A plain global (window.StrobeView) that also loads under node (module.exports) for the tests.
//
//   StrobeView.draw(g, W, H, st, C)   draws one row for every partial on a 2d context already sized W x H (css pixels).
//        st { bands (PitchDetect.strobe(...).read()), N (rows), fref (Hz of band 1), running (bool) , idle (text shown while stopped) }
//        C  { ink, ink2, line, acc2, bg }  colours. A row that stands still is on pitch; stripes moving right are sharp, left flat.
//        st.mode picks the look (default "strobe"): bar (a slider along -50..+50 cents), strip (one strobe row, the fundamental's),
//        trace (the last few seconds of cents), light (flat / in tune / sharp lamps), wheel (the 12 pitch classes on a circle),
//        strobe (every partial). The other modes also read st.cents (cents from the target, or null), st.hz, st.a4, st.hist, st.now.
//   StrobeView.MODES [[id, label, note]], StrobeView.HEIGHTS {mode: css px or 0 = the caller's own}, StrobeView.TOL (cents counted as in tune)
//   StrobeView.tracker() -> fn(st) adding cents (smoothed) / hist / now to st; mount uses one, a caller with its own loop makes its own
//   StrobeView.fundCents(bands) -> cents from the target of the fundamental (else the strongest live partial), or null
//   StrobeView.colors()               C from the site's CSS variables.
//   StrobeView.mount(canvas, getState) -> { redraw(), destroy() }   a canvas that redraws itself (own requestAnimationFrame loop,
//        idle while the canvas is hidden); getState() returns the st above.
//   StrobeView.describe(spec, labels) -> { fref, text, off }   the line "Target: E4 is 3:2 over A ... = 330.00 Hz"; spec as PitchDetect.refFreq;
//        labels { note: "E", tonic: "A" } are the names to print (default: spec's own).
//   StrobeView.fmtC(cents)            "+3.2" / "−3.2"
//   StrobeView.NOTES                  [[value, label]] for a note menu (C C# Db ... B)
(function (global) {
  var NOTES = [["C", "C"], ["C#", "C♯"], ["Db", "D♭"], ["D", "D"], ["D#", "D♯"], ["Eb", "E♭"], ["E", "E"], ["F", "F"], ["F#", "F♯"], ["Gb", "G♭"], ["G", "G"], ["G#", "G♯"], ["Ab", "A♭"], ["A", "A"], ["A#", "A♯"], ["Bb", "B♭"], ["B", "B"]];
  var JI_NAMES = ["1:1", "16:15", "9:8", "6:5", "5:4", "4:3", "45:32", "3:2", "8:5", "5:3", "9:5", "15:8"];
  function fmtC(c) { return (c >= 0 ? "+" : "−") + Math.abs(c).toFixed(1); }
  function label(v) { for (var i = 0; i < NOTES.length; i++) if (NOTES[i][0] === v) return NOTES[i][1]; return v; }

  function describe(spec, labels) {
    var PD = global.PitchDetect; labels = labels || {};
    var sys = spec.system || "12et", fref = PD.refFreq(spec), m = PD.noteMidi(spec.note, +spec.oct), f12 = PD.midiToHz(m, spec.a4), off = 1200 * Math.log(fref / f12) / Math.LN2;
    var nm = (labels.note || label(spec.note)) + spec.oct, d;
    if (sys === "ji") { var t = PD.parseNote(spec.tonic), tm = m - (((m - t.pc) % 12) + 12) % 12; d = nm + " is " + JI_NAMES[m - tm] + " over " + (labels.tonic || label(spec.tonic)) + " (5-limit just intonation)"; }
    else if (sys === "31et") d = nm + " in 31-ET (31 equal steps to the octave; a sharp is two steps, a flat two down)";
    else if (sys === "cents") d = nm + " raised by " + Math.round(spec.cents) + " cents";
    else d = nm + " in 12-ET";
    return { fref: fref, off: off, text: "Target: " + d + " = " + fref.toFixed(2) + " Hz" + (Math.abs(off) > 0.05 ? " (" + (off > 0 ? "+" : "") + off.toFixed(1) + " cents from the equal-tempered note)" : "") + "." };
  }

  function colors() {
    var cs = getComputedStyle(document.documentElement);
    function g(n, d) { return (cs.getPropertyValue(n) || "").trim() || d; }
    return { ink: g("--site-ink", "#222"), ink2: g("--site-ink-2", "#777"), line: g("--site-border", "#ccc"), acc: g("--site-accent", "#3fc2b4"), acc2: g("--site-accent-dk", "#1f8f84"), bg: g("--site-surface", "#fff") };
  }

  var TOL = 5, WARN = 15, SPAN = 50, AMBER = "#d19a1a", RED = "#c8443a";
  var MODES = [
    ["bar", "Cents bar", "A marker slides along −50 to +50 cents; the shaded middle is within ±5¢."],
    ["strip", "One strobe strip", "The fundamental's strobe row alone: stripes standing still mean on pitch, drifting right is sharp, left flat."],
    ["trace", "Pitch trace", "The last few seconds of how far off you were, so drifting, settling and wobbling show."],
    ["light", "Flat / in tune / sharp", "Three lamps and no scale: quick tuning, too coarse for fine intonation."],
    ["wheel", "Pitch-class wheel", "The 12 notes around a circle; the dot sits between neighbours by the exact cents, the ring mark is the target."],
    ["strobe", "Full strobe (every partial)", "One row for every partial of the note; rows fade where that partial is weak."]
  ];
  var HEIGHTS = { bar: 52, strip: 52, trace: 80, light: 64, wheel: 130, strobe: 0 };
  function fundCents(bands) {
    if (!bands || !bands.length) return null;
    if (bands[0] && bands[0].alive) return bands[0].cents;
    var best = null; bands.forEach(function (b) { if (b && b.alive && (!best || b.mag > best.mag)) best = b; });
    return best ? best.cents : null;
  }
  function tone(c, C) { var a = Math.abs(c); return a <= TOL ? C.acc2 : a <= WARN ? AMBER : RED; }
  function note(g, st, C, W, H) {
    if (st.running) return;
    g.fillStyle = C.ink2; g.font = "13px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(st.idle || "Press Start", W / 2, H / 2);
  }

  function drawBar(g, W, H, st, C) {
    var x0 = 14, x1 = W - 96, y = H / 2, h = 14, c = st.cents, sx = function (v) { return x0 + (Math.max(-SPAN, Math.min(SPAN, v)) + SPAN) / (2 * SPAN) * (x1 - x0); };
    g.fillStyle = C.bg; g.fillRect(x0, y - h / 2, x1 - x0, h); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(x0 + .5, y - h / 2 + .5, x1 - x0 - 1, h - 1);
    g.globalAlpha = .25; g.fillStyle = C.acc2; g.fillRect(sx(-TOL), y - h / 2, sx(TOL) - sx(-TOL), h); g.globalAlpha = 1;
    g.strokeStyle = C.ink2; g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "top";
    for (var v = -50; v <= 50; v += 10) { var x = Math.round(sx(v)) + .5, big = v % 50 === 0 || v === 0; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x, y + h / 2 + (big ? 5 : 3)); g.stroke(); if (big) g.fillText(v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v), x, y + h / 2 + 6); }
    g.textBaseline = "middle";
    if (st.running && c != null) {
      var mx = sx(c), col = tone(c, C); g.fillStyle = col; g.fillRect(mx - 3, y - h / 2 - 5, 6, h + 10);
      g.textAlign = "left"; g.font = "600 16px system-ui, sans-serif"; g.fillText(fmtC(c) + " ¢", x1 + 12, y);
    } else if (st.running) { g.fillStyle = C.ink2; g.textAlign = "left"; g.font = "13px system-ui, sans-serif"; g.fillText("—", x1 + 12, y); }
    else note(g, st, C, W, H);
  }

  function drawLight(g, W, H, st, C) {
    var c = st.cents, on = st.running && c != null, r = Math.min(H / 2 - 8, 22), cx = W / 2, cy = H / 2, gap = r * 2.8, col = on ? tone(c, C) : null;
    var lamps = [["♭", on && c < -TOL], ["●", on && Math.abs(c) <= TOL], ["♯", on && c > TOL]];
    g.textAlign = "center"; g.textBaseline = "middle";
    lamps.forEach(function (l, i) {
      var x = cx + (i - 1) * gap; g.beginPath(); g.arc(x, cy, r, 0, 2 * Math.PI);
      g.globalAlpha = l[1] ? 1 : .35; g.fillStyle = l[1] ? col : C.bg; g.fill(); g.strokeStyle = l[1] ? col : C.line; g.lineWidth = 1.5; g.stroke(); g.globalAlpha = 1;
      g.fillStyle = l[1] ? "#fff" : C.ink2; g.font = "600 " + Math.round(r) + "px system-ui, sans-serif"; g.fillText(l[0], x, cy + 1);
    });
    if (on) { g.fillStyle = C.ink2; g.font = "12px system-ui, sans-serif"; g.textAlign = "left"; g.fillText(fmtC(c) + " ¢", cx + gap * 1.5 + r * .6, cy); }
    else note(g, st, C, W, H);
  }

  function drawTrace(g, W, H, st, C) {
    var x0 = 34, x1 = W - 74, T = 4, y0 = 6, y1 = H - 6, sy = function (v) { return y0 + (SPAN - Math.max(-SPAN, Math.min(SPAN, v))) / (2 * SPAN) * (y1 - y0); };
    g.fillStyle = C.bg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.globalAlpha = .22; g.fillStyle = C.acc2; g.fillRect(x0, sy(TOL), x1 - x0, sy(-TOL) - sy(TOL)); g.globalAlpha = 1;
    g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(x0 + .5, y0 + .5, x1 - x0 - 1, y1 - y0 - 1);
    g.strokeStyle = C.ink2; g.beginPath(); g.moveTo(x0, Math.round(sy(0)) + .5); g.lineTo(x1, Math.round(sy(0)) + .5); g.stroke();
    g.fillStyle = C.ink2; g.font = "10px system-ui, sans-serif"; g.textAlign = "right"; g.textBaseline = "middle";
    g.fillText("+50", x0 - 4, y0 + 5); g.fillText("0", x0 - 4, sy(0)); g.fillText("−50", x0 - 4, y1 - 5);
    var h = st.hist || [], now = st.now || 0, open = false;
    g.lineWidth = 2; g.lineJoin = "round";
    for (var i = 0; i < h.length; i++) {
      var p = h[i], age = now - p[0]; if (age > T) continue;
      if (p[1] == null) { if (open) { g.stroke(); open = false; } continue; }
      var x = x1 - age / T * (x1 - x0), y = sy(p[1]);
      if (!open) { g.beginPath(); g.strokeStyle = tone(p[1], C); g.moveTo(x, y); open = true; } else g.lineTo(x, y);
    }
    if (open) g.stroke();
    if (st.running && st.cents != null) { g.fillStyle = tone(st.cents, C); g.textAlign = "left"; g.font = "600 15px system-ui, sans-serif"; g.fillText(fmtC(st.cents) + " ¢", x1 + 8, H / 2); }
    else note(g, st, C, W, H);
  }

  function drawWheel(g, W, H, st, C) {
    var cx = W / 2, cy = H / 2, R = Math.min(H / 2 - 14, 52), a4 = st.a4 || 440, names = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
    function ang(pc) { return -Math.PI / 2 + (pc / 12) * 2 * Math.PI; }
    function pcOf(hz) { var m = 69 + 12 * Math.log(hz / a4) / Math.LN2; return ((m % 12) + 12) % 12; }
    g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke();
    g.font = "11px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    var near = st.running && st.hz > 0 ? Math.round(pcOf(st.hz)) % 12 : -1;
    for (var i = 0; i < 12; i++) {
      var a = ang(i), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, tx = cx + Math.cos(a) * (R + 12), ty = cy + Math.sin(a) * (R + 12);
      g.fillStyle = i === near ? C.ink : C.ink2; g.beginPath(); g.arc(x, y, i === near ? 2.5 : 1.5, 0, 2 * Math.PI); g.fill();
      g.font = (i === near ? "600 " : "") + "11px system-ui, sans-serif"; g.fillText(names[i], tx, ty);
    }
    if (st.fref) { var pt = pcOf(st.fref), at = ang(pt); g.strokeStyle = C.acc2; g.lineWidth = 2; g.beginPath(); g.arc(cx + Math.cos(at) * R, cy + Math.sin(at) * R, 6, 0, 2 * Math.PI); g.stroke(); }
    if (st.running && st.hz > 0) {
      var ph = pcOf(st.hz), ap = ang(ph), c = st.cents, col = c != null ? tone(c, C) : C.ink;
      g.fillStyle = col; g.beginPath(); g.arc(cx + Math.cos(ap) * R, cy + Math.sin(ap) * R, 5, 0, 2 * Math.PI); g.fill();
      g.fillStyle = C.ink; g.font = "600 13px system-ui, sans-serif"; g.fillText(c != null ? fmtC(c) + " ¢" : "", cx, cy);
    } else if (!st.running) { g.fillStyle = C.ink2; g.font = "12px system-ui, sans-serif"; g.fillText(st.idle || "Press Start", cx, cy); }
  }

  function draw(g, W, H, st, C) {
    var m = st.mode || "strobe";
    if (m === "bar") return drawBar(g, W, H, st, C);
    if (m === "light") return drawLight(g, W, H, st, C);
    if (m === "trace") return drawTrace(g, W, H, st, C);
    if (m === "wheel") return drawWheel(g, W, H, st, C);
    if (m === "strip") {
      var bs = st.bands || [], one = bs[0] && bs[0].alive ? bs[0] : bs.filter(function (b) { return b && b.alive; }).sort(function (a, b) { return b.mag - a.mag; })[0];
      return drawStrobe(g, W, H, { bands: one ? [one] : [], N: 1, fref: one ? one.f : st.fref, running: st.running, idle: st.idle, strip: true }, C);
    }
    return drawStrobe(g, W, H, st, C);
  }

  function drawStrobe(g, W, H, st, C) {
    var bands = st.bands || [], N = st.N, fref = st.fref, TOP = st.strip ? 0 : 14, rh = (H - TOP) / N, x0 = 70, x1 = W - 128, P = Math.max(22, Math.min(44, (x1 - x0) / 14)), k;
    var maxDb = -200; bands.forEach(function (b) { if (b.alive) maxDb = Math.max(maxDb, 20 * Math.log10(b.mag)); });
    g.font = "11px system-ui, sans-serif"; g.textBaseline = "middle";
    for (k = 0; k < N; k++) {
      var b = bands[k], y = TOP + k * rh, op = 0.07;
      if (b && b.alive) { var db = 20 * Math.log10(b.mag); op = Math.max(0.06, Math.min(1, 1 - (maxDb - db) / 36)) * Math.max(0, Math.min(1, (db + 62) / 18)); op = Math.max(op, 0.06); }
      g.fillStyle = C.ink2; g.textAlign = "left"; g.fillText((k + 1) + "×  " + (fref * (k + 1)).toFixed(1), 4, y + rh / 2);
      g.save(); g.beginPath(); g.rect(x0, y + 3, x1 - x0, rh - 6); g.clip();
      g.fillStyle = C.bg; g.fillRect(x0, y + 3, x1 - x0, rh - 6);
      g.globalAlpha = op; g.fillStyle = Math.abs(b ? b.cents : 0) < 2 && b && b.alive ? C.acc2 : C.ink;
      var off = b && b.alive ? (b.phase / (2 * Math.PI)) * P : 0; off = ((off % P) + P) % P;
      for (var x = x0 - P + off; x < x1; x += P) g.fillRect(x, y + 3, P / 2, rh - 6);
      g.restore();
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(x0 + .5, y + 3.5, x1 - x0, rh - 7);
      g.fillStyle = b && b.alive ? C.ink : C.ink2; g.textAlign = "left";
      g.fillText(b && b.alive ? fmtC(b.cents) + " ¢  " + (b.driftHz >= 0 ? "+" : "−") + Math.abs(b.driftHz).toFixed(2) + " Hz" : "—", x1 + 8, y + rh / 2);
    }
    if (!st.strip) { g.textAlign = "center"; g.fillStyle = C.ink2; g.fillText("◀ flat", x0 + 40, 7); g.fillText("sharp ▶", x1 - 40, 7); }
    if (!st.running) { g.fillStyle = C.ink2; g.font = "13px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(st.idle || "Press Start to see the bands move", (x0 + x1) / 2, H / 2); }
  }

  // tracker() -> fn(st) returning st plus cents (smoothed, for the bar / lamps / wheel), hist ([[seconds, raw cents | null]], for the trace) and now.
  // One per canvas, called once per drawn frame.
  function tracker() {
    var sm = null, hist = [], t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
    return function (st) {
      var now = ((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0) / 1000, raw = st.running ? fundCents(st.bands) : null;
      if (raw == null) sm = null; else sm = sm == null ? raw : sm + (raw - sm) * 0.35;
      if (st.running) { hist.push([now, raw]); while (hist.length && now - hist[0][0] > 6) hist.shift(); } else hist.length = 0;
      return Object.assign({}, st, { cents: sm, hist: hist, now: now });
    };
  }

  function mount(cv, getState) {
    var dirty = true, raf = 0, dead = false, track = tracker();
    function frame() {
      if (dead) return; raf = requestAnimationFrame(frame);
      if (!cv.offsetParent) return;                                   // hidden: no drawing
      var st = getState(); if (!st) return;
      if (!st.running && !dirty) return; dirty = false;
      st = track(st);
      var r = global.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
      var g = cv.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
      draw(g, w, h, st, colors());
    }
    raf = requestAnimationFrame(frame);
    return { redraw: function () { dirty = true; }, destroy: function () { dead = true; cancelAnimationFrame(raf); } };
  }

  var API = { tracker: tracker, MODES: MODES, HEIGHTS: HEIGHTS, TOL: TOL, fundCents: fundCents, draw: draw, colors: colors, mount: mount, describe: describe, fmtC: fmtC, NOTES: NOTES, JI_NAMES: JI_NAMES };
  global.StrobeView = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
