// The Yamaha DX7 (1983) as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.dx7.
// The panel's parts and their order (volume, data entry, mode select and editing buttons, LED and LCD, the 32 voice / parameter
// buttons, power) from the photograph with callouts in the DX7 Operation Manual (Yamaha), PDF page 5; each button's edit-mode
// legend from "Yamaha DX7 Control Panel Buttons" (dx7-controls.pdf, a one-page table of the 32 + 10 buttons). As on the real one,
// a parameter button picks what the DATA ENTRY slider changes: here a button is a tab, and the slider (or, for the operator
// parameters, six rows standing in for OP SELECT and the LCD) on that tab is bound to the profile key. Positions are this page's.
(function () {
  var I = [], G = "grn", M = "mar";
  function lb(x, y, t, s, more) { I.push(Object.assign({ t: "label", x: x, y: y, text: t, size: s || 8, bold: true }, more || {})); }
  I.push({ t: "section", x: 0, y: 0, w: 1500, h: 300, label: "", head: 0 });
  // volume and data entry
  I.push({ t: "vslider", k: "vol", x: 22, y: 40, w: 26, h: 170, label: "", a: G }); lb(35, 32, "VOLUME", 8);
  lb(100, 32, "DATA ENTRY", 8);
  var DATA = { alg: ["alg", "ALGORITHM"], fb: ["fb", "FEEDBACK"], spd: ["lfoSpeed", "LFO SPEED"], pmd: ["pmd", "LFO PMD"] };
  Object.keys(DATA).forEach(function (p) { I.push({ t: "vslider", k: DATA[p][0], x: 87, y: 40, w: 26, h: 170, label: "", a: G, page: p, fmt: function (v) { return String(Math.round(v)); } }); });
  ["wave", "c", "f", "d", "r", "l", "ol"].forEach(function (p) { I.push({ t: "vslider", k: null, x: 87, y: 40, w: 26, h: 170, label: "", page: p }); });
  I.push({ t: "button", x: 70, y: 225, w: 28, h: 22, label: "−1", size: 8 }); I.push({ t: "button", x: 102, y: 225, w: 28, h: 22, label: "+1", size: 8 }); lb(84, 262, "NO", 7); lb(116, 262, "YES", 7);
  // mode select and editing control
  I.push({ t: "section", x: 150, y: 150, w: 285, h: 130, label: "", head: 0 });
  [["STORE", 165], ["MEMORY PROTECT INT", 205], ["CRT", 245], ["OP SELECT", 285], ["EDIT/COMPARE", 325], ["MEMORY SELECT INT", 365], ["CRT", 395], ["FUNCTION", 425]].forEach(function (b, i) {
    var x = 160 + i * 34; I.push({ t: "button", x: x, y: 200, w: 26, h: 22, label: "", on: false }); lb(x + 13, 192, b[0], 6, { rot: -90, anchor: "start" }); });
  // LED + LCD, with the page's edit rows
  I.push({ t: "display", x: 150, y: 40, w: 60, h: 40, draw: function () { return []; }, label: "LED" });
  I.push({ t: "display", x: 220, y: 40, w: 520, h: 40, draw: function () { return []; } });
  var LCD = { alg: "ALGORITHM SELECTOR", fb: "FEEDBACK", wave: "LFO WAVE", spd: "LFO SPEED", pmd: "P MOD SENS / LFO PMD", c: "OSC FREQ COARSE", f: "OSC FREQ FINE", d: "OSC DETUNE", r: "EG  RATE 1-4", l: "EG  LEVEL 1-4", ol: "OPERATOR OUTPUT LEVEL" };
  for (var p in LCD) I.push({ t: "label", x: 232, y: 64, text: LCD[p], size: 13, anchor: "start", page: p });
  I.push({ t: "select", k: "lfoWave", x: 480, y: 47, w: 130, h: 26, label: "", page: "wave", names: { tri: "TRIANGLE", sawdown: "SAW DOWN", sawup: "SAW UP", square: "SQUARE", sine: "SINE", sh: "SAMPLE/HOLD" } });
  I.push({ t: "label", x: 760, y: 135, text: "", size: 8 });
  [["c", "c", "COARSE"], ["f", "f", "FINE"], ["d", "d", "DETUNE"], ["ol", "l", "LEVEL"]].forEach(function (q) {
    for (var o = 1; o <= 6; o++) { I.push({ t: "label", x: 440, y: 103 + o * 23, text: "OP" + o, size: 8, page: q[0] });
      I.push({ t: "hslider", k: "o" + o + q[1], x: 460, y: 88 + o * 23, w: 280, h: 21, label: "", a: G, page: q[0] }); } });
  [["r", "r"], ["l", "l"]].forEach(function (q) {
    for (var o = 1; o <= 6; o++) { I.push({ t: "label", x: 440, y: 103 + o * 23, text: "OP" + o, size: 8, page: q[0] });
      for (var s = 1; s <= 4; s++) I.push({ t: "hslider", k: "o" + o + q[1] + s, x: 460 + (s - 1) * 70, y: 88 + o * 23, w: 68, h: 21, label: q[1].toUpperCase() + s, a: G, page: q[0] }); } });
  I.push({ t: "label", x: 600, y: 268, text: "the six rows stand for OP SELECT 1-6 on the real panel", size: 7, dim: true, page: "c" });
  // the 32 voice / parameter buttons; legends = their edit-mode parameters
  I.push({ t: "section", x: 760, y: 10, w: 725, h: 280, label: "", head: 0 });
  I.push({ t: "display", x: 770, y: 20, w: 705, h: 70, draw: function () { return []; }, label: "algorithm chart (printed on the panel)" });
  var LEG = ["OP 1", "OP 2", "OP 3", "OP 4", "OP 5", "OP 6", "ALGORITHM", "FEEDBACK", "LFO WAVE", "LFO SPEED", "LFO DELAY", "LFO PMD", "LFO AMD", "LFO SYNC", "P MOD SENS", "A MOD SENS",
    "OSC MODE/SYNC", "FREQ COARSE", "FREQ FINE", "DETUNE", "EG RATE", "EG LEVEL", "BREAK POINT", "CURVE", "DEPTH", "RATE SCALING", "OUTPUT LEVEL", "KEY VELOCITY", "PITCH EG RATE", "PITCH EG LEVEL", "KEY TRANSPOSE", "VOICE NAME"];
  var GO = { 7: "alg", 8: "fb", 9: "wave", 10: "spd", 12: "pmd", 18: "c", 19: "f", 20: "d", 21: "r", 22: "l", 27: "ol" };
  LEG.forEach(function (t, i) { var n = i + 1, x = 772 + i * 22.1;
    lb(x + 10, 222, t, 6.5, { rot: -90, anchor: "start", bold: false, dim: !GO[n] });
    if (GO[n]) I.push({ t: "button", go: GO[n], x: x, y: 230, w: 19, h: 30, label: String(n), size: 7.5, a: n < 17 ? G : M });
    else I.push({ t: "button", x: x, y: 230, w: 19, h: 30, label: String(n), size: 7.5 }); });
  lb(860, 280, "VOICE / PARAMETER SELECT", 8); lb(1300, 280, "(dimmed legends: not modelled)", 7, { bold: false, dim: true });
  I.push({ t: "keys", x: 140, y: 310, w: 1350, h: 80, n: 35 });
  I.push({ t: "section", x: 0, y: 310, w: 130, h: 80, label: "", head: 0 }); lb(65, 355, "PITCH BEND · MOD", 7, { bold: false, dim: true });

  FaithfulPanel.register({ id: "dx7", name: "DX7", w: 1500, h: 392, page: "alg", accent: G, knob: "cap",
    accents: { grn: "#1fa48b", mar: "#b0384b" },
    colors: { dark: { body: "#17130f", line: "#5a5047", screen: "#0f1a12" }, light: { body: "#f5f3f0", line: "#6b5e52", screen: "#eef6ec" } },
    src: ["Yamaha DX7 Operation Manual, PDF p. 5: photograph with the panel's parts named (their order)", "'Yamaha DX7 Control Panel Buttons' (dx7-controls.pdf, p. 1): the 32 voice / parameter buttons' edit-mode legends"],
    approx: "The parts' order is from the manual's photograph; their sizes and spacing, and every button position, are this page's (the manual has no measured drawing). The algorithm chart printed above the buttons is left blank; button colours (green for 1-16, maroon for 17-32) are approximate. On the real one OP SELECT picks one operator for the DATA ENTRY slider; here the operator parameters show all six operators as rows. Operator on / off, LFO delay / AMD / sync, sensitivities, keyboard scaling, pitch EG, the mode buttons and function mode are drawn but not modelled.",
    items: I });
})();
