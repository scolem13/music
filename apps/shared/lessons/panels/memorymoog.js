// The Moog Memorymoog's front panel as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.memorymoog. Positions measured from the blank sound chart at the end of the 1982 Owners and
// Service Manual (PDF p. 105; the same panel drawing as every factory sound chart, pp. 55-104), rendered, turned upright
// and read in pixels of a 2000 px-wide view (main panel x 12-1990, y 8-418; wheel box below at the left), scaled by S.
(function () {
  var S = 0.66, X0 = 12, Y0 = 8, I = [], A = "led";
  function x(v) { return (v - X0) * S; } function y(v) { return (v - Y0) * S; }
  function sec(x0, y0, x1, y1, label, size) { I.push({ t: "section", x: x(x0), y: y(y0), w: (x1 - x0) * S, h: (y1 - y0) * S, label: label, title: label ? "top" : null, head: 0, size: size || 10.5 }); }
  function k(key, cx, cy, label, r) { I.push({ t: "knob", k: key, x: x(cx), y: y(cy), r: (r || 25) * S, label: label, size: 7, cap: "#1b1b1b", noValue: true }); }
  function b(key, cx, cy, label, w) { I.push({ t: "switch", k: key, x: x(cx) - (w || 30) * S / 2, y: y(cy) - 14 * S, w: (w || 30) * S, h: 28 * S, label: "", a: A });
    if (label) I.push({ t: "label", x: x(cx), y: y(cy) + 18 * S + 6, text: label, size: 5.6 }); }
  function lab(t, cx, cy, size, more) { I.push(Object.assign({ t: "label", x: x(cx), y: y(cy), text: t, size: size || 7.5 }, more || {})); }
  function rule(x0, x1, yy) { I.push({ t: "section", x: x(x0), y: y(yy), w: (x1 - x0) * S, h: 0.6, head: 0 }); }
  // sections (p. 105)
  sec(12, 8, 203, 418, ""); sec(205, 8, 400, 418, "SYSTEM CONTROLLER"); sec(402, 8, 512, 418, "FOOT PEDALS", 8.5); sec(517, 8, 862, 418, "MODULATION");
  sec(862, 8, 1397, 418, "OSCILLATORS"); sec(1397, 8, 1487, 418, "MIXER"); sec(1497, 8, 1885, 418, "VOLTAGE CONTROLLED FILTER"); sec(1887, 8, 1985, 418, "OUTPUTS", 9.5);
  rule(20, 195, 105); rule(20, 195, 250); rule(870, 1390, 125); rule(870, 1390, 235); rule(1405, 1480, 130); rule(1405, 1480, 232); rule(1405, 1480, 330); rule(1893, 1980, 135); rule(1893, 1980, 265);
  rule(1505, 1880, 262); rule(410, 505, 45); rule(410, 505, 262);
  // performance controls (left)
  b(null, 62, 80, "AUTO TUNE"); k(null, 128, 55, "TUNE", 22);
  b("mono", 60, 140, "MONO"); b(null, 108, 140, "MULT. TRIG."); b(null, 156, 140, "KB OUT");
  k("glide", 60, 205, "GLIDE"); b("glideOn", 130, 213, "GLIDE ON/OFF");
  b(null, 60, 290, "KB MODE"); b(null, 108, 290, "HOLD"); b(null, 156, 290, "ARPEGGIATOR");
  k(null, 60, 365, "PITCH BEND AMT"); k(null, 157, 365, "MOD. AMOUNT");
  // system controller: program display, alphanumeric display, keypad (not modelled)
  I.push({ t: "display", x: x(270), y: y(68), w: 64 * S, h: 36 * S, draw: function () { return []; } }); lab("PROGRAM", 302, 128, 7.5);
  I.push({ t: "display", x: x(243), y: y(143), w: 120 * S, h: 36 * S, draw: function () { return []; } });
  [["1", "2", "3", "A"], ["4", "5", "6", "B"], ["7", "8", "9", "C"], ["", "0", "", "D"]].forEach(function (row, r) { row.forEach(function (t, c) {
    I.push({ t: "button", x: x([230, 280, 328, 375][c]) - 13 * S, y: y(215 + r * 49) - 14 * S, w: 26 * S, h: 28 * S, label: t, size: 8 }); }); });
  lab("RECORD", 232, 388, 6); lab("INTERLOCK", 232, 396, 6); lab("ENTER", 328, 388, 6);
  // foot pedals (not modelled)
  lab("— AMOUNT 1 —", 457, 40, 6); k(null, 455, 80, ""); b(null, 427, 155, "PITCH"); b(null, 477, 155, "VOLUME"); b(null, 452, 222, "FILTER");
  lab("— AMOUNT 2 —", 457, 258, 6); k(null, 455, 305, ""); b(null, 427, 383, "MOD AMT"); b(null, 477, 383, "OSC 2");
  // modulation: LFO, its destinations, voice modulation and its destinations
  lab("— LFO MODULATION —", 690, 40, 7); k("lfoRate", 560, 80, "RATE (HZ)");
  I.push({ t: "seg", k: "lfoWave", x: x(618), y: y(66), w: 240 * S, h: 28 * S, opts: [["tri", "∧"], ["sawup", "◿"], ["sawdown", "◺"], ["square", "⊓"], ["sh", "S-H"]], size: 8 });
  lab("DESTINATION", 688, 137, 7);
  [["lO1", 540, "OSC 1 FREQ"], ["lO2", 590, "OSC 2 FREQ"], ["lO3", 638, "OSC 3 FREQ"], ["lPw", 687, "PW 1"], ["lPw", 737, "PW 2"], ["lPw", 786, "PW 3"], ["lF", 835, "FILTER"]].forEach(function (d) { b(d[0], d[1], 178, d[2], 28); });
  lab("— VOICE MODULATION —", 690, 222, 7);
  k("vmO3", 565, 275, "OSC 3"); k("vmF", 675, 275, "FILTER CONTOUR"); b(null, 768, 272, "CONTOURED OSC 3"); b(null, 825, 272, "INVERT");
  lab("DESTINATION", 688, 340, 7);
  [["vO1", 590, "OSC 1 FREQ"], ["vO2", 638, "OSC 2 FREQ"], ["vPw", 687, "PW 1"], ["vPw", 737, "PW 2"], ["vF", 787, "FILTER"]].forEach(function (d) { b(d[0], d[1], 380, d[2], 28); });
  // oscillators: three rows
  [[1, 75], [2, 183], [3, 295]].forEach(function (o) { var n = o[0], Y = o[1], p = "o" + n;
    lab("OCTAVE", 962, Y - 38, 7); lab("WAVESHAPE", 1320, Y - 38, 7);
    I.push({ t: "seg", k: p + "Oct", x: x(872), y: y(Y) - 14 * S, w: 180 * S, h: 28 * S, opts: [["16'", "16'"], ["8'", "8'"], ["4'", "4'"], ["2'", "2'"]], size: 8 });
    lab(String(n), 1152, Y + 8, 16, { bold: true });
    if (n === 1) b("sync", 1105, Y, "SYNC 2 TO 1"); else k(p + "Freq", 1105, Y, "FREQUENCY");
    k(n === 3 ? null : "pw" + n, 1205, Y, "PULSE WIDTH (%)");
    [[p + "Pulse", 1270, "⊓"], [p + "Saw", 1322, "◿"], [p + "Tri", 1370, "∧"]].forEach(function (w) { b(w[0], w[1], Y, w[2], 30); });
  });
  b("o3Low", 938, 365, "LOW"); b("o3Kbd", 1040, 365, "KEYBOARD CONTROL");
  // mixer
  k("m1", 1442, 72, "LEVEL"); k("m2", 1442, 180, "LEVEL"); k("m3", 1442, 280, "LEVEL"); k("mN", 1442, 375, "NOISE");
  // filter and amplifier
  lab("KB TRACK", 1547, 40, 7); b("kb1", 1522, 85, "1/3"); b("kb2", 1572, 85, "2/3");
  k("cutoff", 1645, 80, "CUTOFF"); k("emph", 1740, 80, "EMPHASIS"); k("cAmt", 1835, 80, "CONTOUR AMOUNT");
  [["fA", "ATTACK"], ["fD", "DECAY"], ["fS", "SUSTAIN"], ["fR", "RELEASE"]].forEach(function (c, i) { k(c[0], [1545, 1645, 1740, 1835][i], 172, c[1]); });
  [["RETURN TO ZERO"], ["UNCONDITIONAL CONTOUR"], ["KEYBOARD FOLLOW"], ["RELEASE"]].forEach(function (c, i) { b(null, [1550, 1645, 1740, 1835][i], 262, c[0]); });
  [["lA", "ATTACK"], ["lD", "DECAY"], ["lS", "SUSTAIN"], ["lR", "RELEASE"]].forEach(function (c, i) { k(c[0], [1545, 1645, 1740, 1835][i], 340, c[1]); });
  lab("VOLTAGE CONTROLLED AMPLIFIER", 1690, 410, 8.5, { bold: true });
  // outputs
  k("vol", 1935, 72, "MASTER VOLUME"); lab("PROGRAMMABLE", 1935, 150, 6.5, { bold: true }); k(null, 1935, 205, "VOLUME"); lab("HEADPHONE", 1935, 282, 6.5, { bold: true }); k(null, 1935, 340, "VOLUME");
  // the wheel box below the panel (octave buttons, pitch and mod wheels)
  sec(15, 430, 180, 678, ""); b(null, 80, 470, ""); b(null, 135, 470, ""); lab("OCTAVE", 107, 500, 7);
  I.push({ t: "section", x: x(72), y: y(518), w: 24 * S, h: 125 * S, head: 0 }, { t: "section", x: x(148), y: y(518), w: 24 * S, h: 125 * S, head: 0 });
  lab("PITCH", 60, 580, 6.5, { rot: -90 }); lab("MOD", 135, 580, 6.5, { rot: -90 });

  FaithfulPanel.register({ id: "memorymoog", name: "Memorymoog", w: 1978 * S, h: 680 * S, accent: A, knob: "cap", round: 4,
    accents: { led: "#e5372b" },
    colors: { dark: { body: "#101010", head: "#101010", line: "#bdbdbd", ink: "#f2f2f2", ink2: "#b0b0b0" }, light: { body: "#ffffff", head: "#ffffff", line: "#111111", ink: "#111111" } },
    src: ["Moog Memorymoog Owners and Service Manual (1982), PDF p. 105: blank sound chart (the panel drawing used for every factory sound, pp. 55-104)", "Section II (pp. 9-20): what each control does"],
    approx: "Positions measured from the manual's blank sound chart (p. 105); no dimensions are printed, so sizes are measured from the drawing. Each button's LED is drawn inside the button here (above it on the panel). One LFO \"PW 1-3\" and one voice-mod \"PW 1+2\" setting in this page's model, so those buttons move together. Guessed: colours (the drawing is black on white; red LEDs). Not modelled (dimmed): auto tune, tune, keyboard modes, hold, arpeggiator, the programmer, foot pedals, contoured osc 3 / invert, the filter's contour-mode buttons, osc 3 pulse width, programmable and headphone volume.",
    items: I });
})();
