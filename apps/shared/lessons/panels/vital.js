// Vital's main window as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.vital.
// Section rectangles are computed from Vital's own layout code at its default 1400 x 820 window (github mtytel/vital):
// full_interface.cpp resized() (header 48 high, macro column 68 wide at x 10, synthesis area 704 wide at x 88, modulation
// area to its right, voice + portamento strip and keyboard below), synthesis_interface.cpp (three oscillator rows of
// 2 x knob-section-height, sample row, Filter 1 / Filter 2 side by side), modulation_interface.cpp (envelopes : LFOs : random
// = 3 : 4 : 2 of the height, 68-wide tab column, keyboard modulations at the right of the random row) and default.vitalskin
// (knob section height 71, padding 4, large padding 10, background #262a2d, body #4c4f52, accents #aa88ff, filter #ffb74d,
// envelope #1de9b6). Positions of the knobs INSIDE each section are this page's approximation of the plug-in's screen.
(function () {
  var I = [], x0 = 88, A = { osc: "osc", flt: "flt", env: "env", lfo: "lfo", fx: "fx" };
  function sec(x, y, w, h, label, a, more) { I.push(Object.assign({ t: "section", x: x, y: y, w: w, h: h, label: label, a: a, head: 22 }, more || {})); }
  function k(key, x, y, label, a, r, more) { I.push(Object.assign({ t: "knob", k: key, x: x, y: y, r: r || 15, label: label, a: a }, more || {})); }
  // header: tabs, preset, volume
  I.push({ t: "label", x: 44, y: 30, text: "VITAL", size: 14, bold: true });
  [["VOICE", "voice"], ["EFFECTS", "fx"], ["MATRIX"], ["ADVANCED"]].forEach(function (b, i) { I.push(b[1] ? { t: "button", go: b[1], x: x0 + i * 96, y: 12, w: 90, h: 26, label: b[0], a: "osc" } : { t: "button", x: x0 + i * 96, y: 12, w: 90, h: 26, label: b[0] }); });
  I.push({ t: "button", x: 500, y: 10, w: 420, h: 30, label: "Init Preset   ‹  ›   (the preset browser: not modelled)" });
  I.push({ t: "display", x: 940, y: 8, w: 200, h: 34, draw: "wave:o1Frame", a: "osc" });
  k("vol", 1180, 24, "", "osc", 12, { noValue: true }); I.push({ t: "label", x: 1215, y: 28, text: "VOLUME", size: 9, anchor: "start" });
  // macro column and wheels
  sec(10, 48, 68, 696, "", null, { head: 0, name: "Macros" });
  [1, 2, 3, 4].forEach(function (n) { k(null, 44, 48 + 60 + (n - 1) * 150, "MACRO " + n, "osc", 17); });
  sec(10, 745, 68, 71, "", null, { head: 0, name: "Logo / settings" });
  I.push({ t: "button", x: 18, y: 752, w: 22, h: 56, label: "P" }, { t: "button", x: 48, y: 752, w: 22, h: 56, label: "M" });
  // ---- VOICE page: oscillators, sample, filters ----
  [0, 1, 2].forEach(function (i) {
    var y = 48 + i * 140, p = "o" + (i + 1);
    sec(x0, y, 704, 136, "", "osc", { head: 32, vertical: true, page: "voice", name: "Osc " + (i + 1) });
    I.push({ t: "label", x: x0 + 18, y: y + 74, text: "OSC " + (i + 1), size: 11, bold: true, rot: -90, page: "voice" });
    I.push({ t: "switch", k: p + "On", x: x0 + 3, y: y + 4, w: 26, h: 18, label: "", a: "osc", page: "voice" });
    I.push({ t: "button", x: x0 + 40, y: y + 6, w: 230, h: 18, label: "Basic Shapes", page: "voice" });
    I.push({ t: "display", x: x0 + 40, y: y + 28, w: 300, h: 76, draw: "wave:" + p + "Frame", a: "osc", page: "voice" });
    I.push({ t: "select", x: x0 + 40, y: y + 110, w: 96, h: 20, text: "Spectral: none", label: "", page: "voice" });
    I.push({ t: "select", x: x0 + 140, y: y + 110, w: 96, h: 20, text: "Distort: none", label: "", page: "voice" });
    k(null, x0 + 262, y + 120, "", "osc", 8, { page: "voice", label: "" });
    k(null, x0 + 318, y + 120, "", "osc", 8, { page: "voice", label: "" });
    // right block: two rows of knobs (approximate)
    var row1 = [[p + "Frame", "FRAME"], [p + "Lvl", "LEVEL"], [null, "PAN"], [null, "PHASE"], [null, "RANDOM"]];
    var row2 = [["uni", "UNISON"], [null, "DETUNE"], [null, "STEREO"], [p + "Tr", "TRANSPOSE"], [p + "Tune", "TUNE"]];
    row1.forEach(function (c, j) { k(c[0], x0 + 384 + j * 64, y + 34, c[1], "osc", 14, { page: "voice" }); });
    row2.forEach(function (c, j) { k(c[0], x0 + 384 + j * 64, y + 94, c[1], "osc", 14, { page: "voice" }); });
  });
  sec(x0, 468, 704, 70, "", "osc", { head: 32, vertical: true, page: "voice", name: "Sample" });
  I.push({ t: "label", x: x0 + 18, y: 503, text: "SMP", size: 11, bold: true, rot: -90, page: "voice" });
  I.push({ t: "switch", k: "smpOn", x: x0 + 3, y: 472, w: 26, h: 18, label: "", a: "osc", page: "voice" });
  I.push({ t: "button", x: x0 + 40, y: 474, w: 230, h: 18, label: "White Noise", page: "voice" });
  I.push({ t: "display", x: x0 + 40, y: 496, w: 300, h: 36, draw: function (g, w, h) { var d = "M4 " + h / 2; for (var i = 1; i < 90; i++) d += "L" + (4 + i * (w - 8) / 90) + " " + (h / 2 + Math.sin(i * 12.9898) * 43758.5453 % 1 * (h / 2 - 4)); return [d]; }, a: "osc", page: "voice" });
  [["smp", "LEVEL"], [null, "PAN"], [null, "TRANSPOSE"], [null, "TUNE"]].forEach(function (c, j) { k(c[0], x0 + 384 + j * 64, 500, c[1], "osc", 13, { page: "voice" }); });
  [[x0, 348, 1], [x0 + 352, 352, 2]].forEach(function (f) {
    var X = f[0], W = f[1], n = f[2], on = n === 1;
    sec(X, 548, W, 223, "FILTER " + n, "flt", { page: "voice" });
    I.push({ t: "select", k: on ? "fModel" : null, x: X + 90, y: 551, w: 110, h: 17, label: "", text: "Analog", page: "voice" });
    I.push({ t: "select", k: on ? "fStyle" : null, x: X + 206, y: 551, w: 80, h: 17, label: "", text: "12dB", page: "voice" });
    I.push({ t: "display", x: X + 8, y: 576, w: 200, h: 110, draw: on ? "filter:cut,res" : "filter:x,y", a: "flt", page: "voice" });
    k(on ? "cut" : null, X + 248, 600, "CUTOFF", "flt", 20, { page: "voice" });
    k(on ? "res" : null, X + 248, 676, "RESONANCE", "flt", 16, { page: "voice" });
    [[on ? "drive" : null, "DRIVE"], [on ? "fBlend" : null, "BLEND"], [on ? "key" : null, "KEY TRK"], [null, "MIX"]].forEach(function (c, j) { k(c[0], X + 32 + j * 56, 703, c[1], "flt", 12, { page: "voice" }); });
    ["OSC1", "OSC2", "OSC3", "SMP"].forEach(function (s, j) { I.push({ t: "button", x: X + 8 + j * 48, y: 753, w: 44, h: 14, label: s, size: 8, on: on, a: "flt", page: "voice" }); });
  });
  // ---- EFFECTS page: Vital's nine effects in two columns ----
  var FX = [["CHORUS", "fxCho"], ["COMPRESSOR"], ["DELAY", "fxDly"], ["DISTORTION"], ["PHASER"], ["FLANGER"], ["REVERB", "fxRev"], ["EQ"], ["FILTER"]];
  FX.forEach(function (f, i) { var col = i < 5 ? 0 : 1, row = col ? i - 5 : i, X = x0 + col * 354, W = 350, H = col ? 178 : 141, Y = 48 + row * (H + 4);
    sec(X, Y, W, H, f[0], "fx", { page: "fx" });
    I.push({ t: "switch", k: null, x: X + W - 34, y: Y + 3, w: 28, h: 16, label: "", page: "fx" });
    I.push({ t: "display", x: X + 8, y: Y + 28, w: 180, h: H - 36, draw: f[1] ? "lfo:sineX" : function () { return []; }, a: "fx", page: "fx" });
    k(f[1] || null, X + 230, Y + 60, f[1] ? "MIX" : "", "fx", 18, { page: "fx" });
    k(null, X + 300, Y + 60, "", "fx", 14, { page: "fx" });
  });
  // ---- modulation area (always shown, as in the plug-in) ----
  var MX = 802;
  sec(MX, 48, 68, 213, "", null, { head: 0, name: "Envelope tabs" }); ["ENV 1", "ENV 2", "ENV 3"].forEach(function (s, j) { I.push({ t: "button", x: MX + 4, y: 54 + j * 68, w: 60, h: 62, label: s, on: j < 2, a: "env" }); });
  [["e1", "ENVELOPE 1", MX + 72], ["e2", "ENVELOPE 2", MX + 72 + 260]].forEach(function (e) { var p = e[0], X = e[2];
    sec(X, 48, 256, 213, e[1], "env");
    I.push({ t: "display", x: X + 6, y: 74, w: 244, h: 100, draw: "env:" + p + "A," + p + "D," + p + "S," + p + "R", a: "env" });
    [[null, "DELAY"], [p + "A", "ATTACK"], [null, "HOLD"], [p + "D", "DECAY"], [p + "S", "SUSTAIN"], [p + "R", "RELEASE"]].forEach(function (c, j) { k(c[0], X + 22 + j * 42, 196, c[1], "env", 11, { size: 7.5 }); });
  });
  k("e2Cut", MX + 72 + 260 + 60, 248, "", "env", 7, { noValue: true }); I.push({ t: "label", x: MX + 72 + 260 + 72, y: 251, text: "→ cutoff", size: 8, anchor: "start" });
  k("e2Frame", MX + 72 + 260 + 160, 248, "", "env", 7, { noValue: true }); I.push({ t: "label", x: MX + 72 + 260 + 172, y: 251, text: "→ frame", size: 8, anchor: "start" });
  sec(MX, 265, 68, 284, "", null, { head: 0, name: "LFO tabs" }); ["LFO 1", "LFO 2", "LFO 3", "LFO 4"].forEach(function (s, j) { I.push({ t: "button", x: MX + 4, y: 271 + j * 69, w: 60, h: 63, label: s, on: j === 0, a: "lfo" }); });
  sec(MX + 72, 265, 516, 284, "LFO 1", "lfo");
  I.push({ t: "display", x: MX + 78, y: 291, w: 400, h: 170, draw: "lfo:lfoShape", a: "lfo" });
  I.push({ t: "select", k: "lfoShape", x: MX + 486, y: 300, w: 96, h: 20, label: "SHAPE", names: { tri: "Triangle", sine: "Sine", saw: "Saw", square: "Square" } });
  k("lfoRate", MX + 534, 360, "FREQUENCY", "lfo", 18); k(null, MX + 534, 428, "FADE IN", "lfo", 12);
  [[null, "MODE"], [null, "SYNC"], ["lfoPitch", "→ PITCH"], ["lfoCut", "→ CUTOFF"], ["lfoFrame", "→ FRAME"], [null, "SMOOTH"]].forEach(function (c, j) { k(c[0], MX + 110 + j * 70, 494, c[1], "lfo", 12); });
  sec(MX, 553, 68, 143, "", null, { head: 0, name: "Random tabs" }); ["RAND 1", "RAND 2"].forEach(function (s, j) { I.push({ t: "button", x: MX + 4, y: 559 + j * 68, w: 60, h: 62, label: s }); });
  sec(MX + 72, 553, 240, 143, "RANDOM 1", "lfo"); I.push({ t: "display", x: MX + 78, y: 580, w: 160, h: 108, draw: function () { return []; } });
  sec(1118, 553, 272, 143, "KEYBOARD MODS", null);
  ["NOTE", "VELOCITY", "LIFT", "AFTERTOUCH", "SLIDE", "STEREO", "RANDOM", "PITCH WH"].forEach(function (s, j) { I.push({ t: "button", x: 1122 + (j % 4) * 67, y: 580 + Math.floor(j / 4) * 56, w: 63, h: 50, label: s, size: 7.5 }); });
  sec(802, 700, 312, 71, "VOICE", null, { head: 0 });
  [["poly", "VOICES"], [null, "VEL TRK"], [null, "SPREAD"], [null, "STEREO"]].forEach(function (c, j) { k(c[0], 874 + j * 72, 728, c[1], "osc", 12); });
  sec(1118, 700, 272, 71, "", null, { head: 0, name: "Portamento" });
  [["glide", "GLIDE"], [null, "SLOPE"], [null, "LEGATO"]].forEach(function (c, j) { k(c[0], 1160 + j * 80, 728, c[1], "osc", 12); });
  I.push({ t: "keys", x: 88, y: 781, w: 1302, h: 35, n: 52 });

  FaithfulPanel.register({ id: "vital", name: "Vital", w: 1400, h: 820, page: "voice", accent: "osc", knob: "arc", round: 6,
    accents: { osc: "#aa88ff", flt: "#ffb74d", env: "#1de9b6", lfo: "#aa88ff", fx: "#ff99e9" },
    colors: { dark: { bg: "#000000", body: "#262a2d", head: "#3e4245", line: "#4c4f52", track: "#4c4f52", screen: "#1d2125", ink: "#dfdfdf", ink2: "#a3a7aa" },
      light: { bg: "#ffffff", body: "#f1f2f4", head: "#dcdee2", line: "#b9bdc2", track: "#c9ccd1", screen: "#ffffff", ink: "#1d2125", ink2: "#565b61" } },
    envTime: function (key, v) { return Math.pow(v, 4); }, susMax: 100,
    src: ["github mtytel/vital: full_interface.cpp, synthesis_interface.cpp, modulation_interface.cpp (section bounds at 1400 x 820)", "default.vitalskin (sizes and colours)"],
    approx: "Section boxes from Vital's layout code at its default 1400 × 820 window; the knobs inside each box are this page's approximation, not measured from the plug-in. Dimmed controls are drawn but not modelled. Vital shows one envelope and one LFO at a time; here Envelopes 1 and 2 sit side by side, the → cutoff / → frame / → pitch knobs stand for Vital's drag-and-drop modulation, and one Unison knob is shared by the three oscillators.",
    items: I });
})();
