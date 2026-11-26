// The Moog Taurus 205A bass pedals' control panel as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.taurus. From the two photographs in the Taurus service manual (OCR'd scan, PDF pp. 35-36): Figure 4-2
// "Front Panel" (the whole console: LOUDNESS and FILTER foot knobs, the VARIABLES window, the PRESETS buttons and the
// GLIDE / DECAY / OCTAVE buttons) gives the outline and the section places; Figure 4-3 "Front Panel Variables Controls"
// gives the knobs and the twelve sliders inside the window. Both measured in pixels of the rendered pages (a 1545 px-wide
// view) and scaled; the window is drawn larger than in Fig. 4-2 so its sliders can be used (its inside keeps Fig. 4-3's
// proportions).
(function () {
  var I = [], A = "led", SC = 1.0, X0 = 330, Y0 = 165;
  function x(v) { return (v - X0) * SC; } function y(v) { return (v - Y0) * SC; }
  function lab(t, xx, yy, size, more) { I.push(Object.assign({ t: "label", x: xx, y: yy, text: t, size: size || 8 }, more || {})); }
  I.push({ t: "section", x: 0, y: 0, w: 920 * SC, h: 485 * SC, head: 0 });
  // the two foot knobs (Fig. 4-2: labels LOUDNESS at left, FILTER at right)
  I.push({ t: "knob", k: "vol", x: x(490), y: y(300), r: 40, label: "LOUDNESS", size: 9, cap: "#1a1a1a" });
  I.push({ t: "knob", k: null, x: x(1115), y: y(330), r: 40, label: "FILTER", size: 9, cap: "#1a1a1a" });
  // VARIABLES window (Fig. 4-2 place, Fig. 4-3 inside: box 590 x 310 px there, scaled by F)
  var BX = x(575), BY = y(195), F = 0.78;
  function bx(v) { return BX + v * F; } function by(v) { return BY + v * F; }
  I.push({ t: "section", x: BX, y: BY, w: 590 * F, h: 310 * F, label: "VARIABLES", head: 0 });
  lab("PROGRAMMED PRESET", bx(345), by(28), 8.5, { bold: true });
  I.push({ t: "knob", k: null, x: bx(70), y: by(95), r: 16, label: "TUNE", size: 7.5, cap: "#e8e8e8" });
  I.push({ t: "knob", k: "beat", x: bx(70), y: by(200), r: 16, label: "BEAT", size: 7.5, cap: "#e8e8e8" });
  // sliders: glide, then octave / B-mix-A / osc B freq, then LOUDNESS (attack, sustain level, decay), then FILTER (5)
  var SL = [["glide", 140, "GLIDE"], [null, 180, "OCTAVE"], ["mixB", 215, "B-MIX-A"], ["bFreq", 250, "OSC B FREQ"], ["lA", 290, "ATTACK"], ["lS", 325, "SUSTAIN LEVEL"], ["lD", 360, "DECAY"],
    ["cutoff", 400, "CUT-OFF"], ["emph", 435, "EMPHASIS"], ["cAmt", 470, "CONTOUR AMOUNT"], ["cA", 505, "CONTOUR ATTACK"], ["cD", 540, "CONTOUR DECAY"]];
  SL.forEach(function (s) {
    if (s[2] === "OCTAVE") I.push({ t: "select", k: "range", x: bx(s[1]) - 12, y: by(115), w: 24, h: 120 * F, label: "", size: 7, names: { LO: "LO", MED: "MED", HI: "HI" } });
    else I.push({ t: "vslider", k: s[0], x: bx(s[1]) - 11, y: by(95), w: 22, h: 190 * F, label: "", a: A });
    lab(s[2], bx(s[1]) + 13, by(95) + 4, 6.5, { anchor: "start", rot: 90 }); });
  I.push({ t: "section", x: bx(280), y: by(268), w: 92 * F, h: 0.6, head: 0 }, { t: "section", x: bx(390), y: by(268), w: 165 * F, h: 0.6, head: 0 });
  lab("LOUDNESS", bx(325), by(290), 7.5, { bold: true }); lab("FILTER", bx(470), by(290), 7.5, { bold: true });
  // PRESETS (four latching buttons) and GLIDE / DECAY / OCTAVE (Fig. 4-2)
  I.push({ t: "section", x: x(395), y: y(488), w: 443 * SC, h: 94 * SC, head: 0 }, { t: "section", x: x(848), y: y(488), w: 332 * SC, h: 94 * SC, head: 0 });
  [["VARIABLE", 445], ["TAURUS", 560], ["TUBA", 675], ["BASS", 790]].forEach(function (p) { I.push({ t: "button", x: x(p[1]) - 18, y: y(490) - 7, w: 36, h: 14, label: "", size: 7 }); lab(p[0], x(p[1]), y(555), 8); });
  lab("—————  PRESETS  —————", x(616), y(574), 8.5, { bold: true });
  I.push({ t: "switch", k: "glideOn", x: x(900) - 18, y: y(490) - 7, w: 36, h: 14, label: "", a: A }); lab("GLIDE", x(900), y(555), 8);
  I.push({ t: "switch", k: "decaySw", x: x(1015) - 18, y: y(490) - 7, w: 36, h: 14, label: "", a: A }); lab("DECAY", x(1015), y(555), 8);
  I.push({ t: "button", x: x(1130) - 18, y: y(490) - 7, w: 36, h: 14, label: "", size: 7 }); lab("OCTAVE", x(1130), y(555), 8);
  I.push({ t: "label", x: x(330) + 14, y: y(605), text: "Presets: only VARIABLE is modelled (this panel is always on VARIABLE)", size: 7, anchor: "start", dim: true });

  FaithfulPanel.register({ id: "taurus", name: "Taurus 205A", w: 920 * SC, h: 485 * SC, accent: A, knob: "cap", round: 6,
    accents: { led: "#e5372b" },
    colors: { dark: { body: "#101010", head: "#101010", line: "#9a9a9a", ink: "#f0f0f0" }, light: { body: "#ffffff", head: "#ffffff", line: "#111111", ink: "#111111" } },
    src: ["Moog Taurus service manual (OCR'd scan), PDF p. 35: Figure 4-2 Front Panel (photograph)", "PDF p. 36: Figure 4-3 Front Panel Variables Controls (photograph)"],
    approx: "Both figures are small, dark photographs: section places are measured from Fig. 4-2 and the window's knobs and sliders from Fig. 4-3, by eye in pixels. The VARIABLES window is drawn about three times its real size relative to the console so its sliders can be used; the foot knobs' exact places and sizes, the button sizes and the LED colour are guessed. The octave slider (LO / MED / HI) is a menu here. Not modelled (dimmed): TUNE, the FILTER foot knob, the TAURUS / TUBA / BASS presets and the OCTAVE button.",
    items: I });
})();
