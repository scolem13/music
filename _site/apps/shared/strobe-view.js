// strobe-view.js — how a strobe tuner looks and what it says, shared by the lessons' `tuner` widget (synth-kit.js) and the navbar's
// Tuner panel (tuner-panel.js). The maths is not here: PitchDetect.strobe (pitch-detect.js) makes the bands, this only draws them.
// A plain global (window.StrobeView) that also loads under node (module.exports) for the tests.
//
//   StrobeView.draw(g, W, H, st, C)   draws one row for every partial on a 2d context already sized W x H (css pixels).
//        st { bands (PitchDetect.strobe(...).read()), N (rows), fref (Hz of band 1), running (bool) , idle (text shown while stopped) }
//        C  { ink, ink2, line, acc2, bg }  colours. A row that stands still is on pitch; stripes moving right are sharp, left flat.
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

  function draw(g, W, H, st, C) {
    var bands = st.bands || [], N = st.N, fref = st.fref, TOP = 14, rh = (H - TOP) / N, x0 = 70, x1 = W - 128, P = Math.max(22, Math.min(44, (x1 - x0) / 14)), k;
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
    g.textAlign = "center"; g.fillStyle = C.ink2; g.fillText("◀ flat", x0 + 40, 7); g.fillText("sharp ▶", x1 - 40, 7);
    if (!st.running) { g.fillStyle = C.ink2; g.font = "13px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(st.idle || "Press Start to see the bands move", (x0 + x1) / 2, H / 2); }
  }

  function mount(cv, getState) {
    var dirty = true, raf = 0, dead = false;
    function frame() {
      if (dead) return; raf = requestAnimationFrame(frame);
      if (!cv.offsetParent) return;                                   // hidden: no drawing
      var st = getState(); if (!st) return;
      if (!st.running && !dirty) return; dirty = false;
      var r = global.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
      var g = cv.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
      draw(g, w, h, st, colors());
    }
    raf = requestAnimationFrame(frame);
    return { redraw: function () { dirty = true; }, destroy: function () { dead = true; cancelAnimationFrame(raf); } };
  }

  var API = { draw: draw, colors: colors, mount: mount, describe: describe, fmtC: fmtC, NOTES: NOTES, JI_NAMES: JI_NAMES };
  global.StrobeView = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
