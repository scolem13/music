// The Sequential Prophet-5 (Rev 4, 2020; the 1978 layout) as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.prophet. Positions measured off the front-panel drawing in the Prophet-5 Rev4 User's Guide (v1.0, Oct
// 2020), PDF page 12 ("Prophet-5 front panel"), drawn here at about 2000 units for the drawing's width; section names, legends and
// the control order are the drawing's. Black panel, black knobs (white for Master Tune and Volume, as drawn), red button LEDs.
(function () {
  var I = [], RED = "red";
  function sec(x, y, w, h, label) { I.push({ t: "section", x: x, y: y, w: w, h: h, label: label, title: "border", size: 10 }); }
  function kn(k, x, y, label, more) { I.push(Object.assign({ t: "knob", k: k, x: x, y: y, r: 15, label: label, size: 8, cap: "#303030" }, more || {})); }
  function sw(k, x, y, label, more) { I.push(Object.assign({ t: "switch", k: k, x: x - 13, y: y - 9, w: 26, h: 22, label: "", a: RED }, more || {}));
    if (label) I.push({ t: "label", x: x, y: y - 15, text: label, size: /^[A-Z]/.test(label) ? 8 : 12, bold: true }); }
  function btn(x, y, label, below) { I.push({ t: "button", x: x - 13, y: y - 9, w: 26, h: 22, label: "" }); if (label) I.push({ t: "label", x: x, y: below ? y + 26 : y - 15, text: label, size: 8, bold: true }); }
  // left block: Poly-Mod, LFO, Wheel-Mod
  sec(20, 35, 315, 85, "POLY-MOD"); kn("pmFenv", 60, 70, "FILT ENV"); kn("pmOscB", 145, 70, "OSC B");
  sw("pmFA", 215, 70, "FREQ A"); sw("pmPA", 262, 70, "PW A"); sw("pmF", 311, 70, "FILTER");
  I.push({ t: "label", x: 102, y: 118, text: "SOURCE AMOUNT", size: 7, dim: true });
  sec(20, 130, 315, 85, "L F O"); kn("lfoInit", 60, 165, "INITIAL AMOUNT"); kn("lfoFreq", 145, 165, "FREQUENCY");
  sw("lfoSaw", 215, 168, "⟋"); sw("lfoTri", 262, 168, "∧"); sw("lfoSq", 311, 168, "⊓"); I.push({ t: "label", x: 262, y: 207, text: "SHAPE", size: 7, dim: true });
  sec(20, 225, 315, 85, "WHEEL-MOD"); kn("wmMix", 60, 260, "LFO ↔ NOISE", { fmt: function (v) { return v < .05 ? "LFO" : v > 9.95 ? "noise" : (+v).toFixed(1); } });
  sw("wmFA", 120, 263, "FREQ A"); sw("wmFB", 168, 263, "FREQ B"); sw("wmPA", 215, 263, "PW A"); sw("wmPB", 262, 263, "PW B"); sw("wmF", 311, 263, "FILTER");
  I.push({ t: "label", x: 215, y: 300, text: "DESTINATION", size: 7, dim: true });
  I.push({ t: "label", x: 350, y: 20, text: "", size: 8 });
  // oscillators and mixer
  sec(365, 35, 325, 85, "OSCILLATOR A"); kn("aFreq", 405, 70, "FREQUENCY"); sw("aSaw", 480, 70, "⟋"); sw("aPulse", 527, 70, "⊓");
  kn("aPw", 597, 70, "PULSE WIDTH"); sw("aSync", 668, 70, "SYNC");
  sec(365, 130, 505, 85, "OSCILLATOR B"); kn("bFreq", 405, 165, "FREQUENCY"); kn("bFine", 488, 165, "FINE");
  sw("bSaw", 560, 168, "⟋"); sw("bTri", 607, 168, "∧"); sw("bPulse", 655, 168, "⊓"); kn("bPw", 735, 165, "PULSE WIDTH");
  sw("bLo", 797, 168, "LO FREQ"); sw("bKbd", 845, 168, "KEYBOARD");
  sec(722, 35, 248, 85, "MIXER"); kn("mA", 762, 70, "OSC A"); kn("mB", 847, 70, "OSC B"); kn("mN", 930, 70, "NOISE");
  kn("vintage", 937, 165, "VINTAGE", { fmt: function (v) { return String(Math.round(v)); } });
  // filter (its envelope on the lower row) and amplifier
  sec(1003, 35, 355, 180, "FILTER");
  I.push({ t: "select", k: "rev", x: 1012, y: 58, w: 30, h: 20, label: "", names: { "1/2": "1/2", "3": "3" }, size: 8 }); I.push({ t: "label", x: 1027, y: 92, text: "REV", size: 8, bold: true });
  kn("cutoff", 1097, 70, "CUTOFF"); kn("res", 1180, 70, "RESONANCE"); kn("envAmt", 1262, 70, "ENVELOPE AMOUNT");
  I.push({ t: "select", k: "kbd", x: 1316, y: 58, w: 40, h: 20, label: "", names: { off: "off", half: "HALF", full: "FULL" }, size: 8 }); I.push({ t: "label", x: 1336, y: 92, text: "KEYBOARD", size: 8, bold: true });
  kn("fA", 1053, 165, "ATTACK"); kn("fD", 1137, 165, "DECAY"); kn("fS", 1222, 165, "SUSTAIN"); kn("fR", 1305, 165, "RELEASE");
  kn(null, 1430, 70, "MASTER TUNE", { cap: "#f2f2f2" }); btn(1510, 70, "A440", true);
  sw("velF", 1585, 70, "", { w: 22 }); sw("velA", 1610, 70, "", { w: 22 }); I.push({ t: "label", x: 1597, y: 55, text: "FILT  AMP", size: 7, bold: true }); I.push({ t: "label", x: 1597, y: 96, text: "VELOCITY", size: 8, bold: true });
  btn(1680, 70, "AFTERTOUCH", true);
  sec(1390, 130, 330, 85, "AMPLIFIER"); kn("aA", 1430, 165, "ATTACK"); kn("aD", 1515, 165, "DECAY"); kn("aS", 1597, 165, "SUSTAIN"); kn("aR", 1680, 165, "RELEASE");
  // bottom row: glide, unison, programmer, release, volume, tune
  kn("glide", 405, 260, "GLIDE RATE"); sw("uni", 485, 263, ""); I.push({ t: "label", x: 485, y: 292, text: "UNISON", size: 8, bold: true });
  sec(545, 225, 815, 88, "PROGRAMMER");
  [[567, "PRESET"], [637, "RECORD"], [703, "FACTORY"], [752, "GROUP"], [798, "BANK"]].forEach(function (b) { btn(b[0], 263, b[1], true); });
  I.push({ t: "display", x: 830, y: 250, w: 75, h: 28, draw: function () { return []; }, label: "8.8.8." });
  for (var i = 0; i < 8; i++) btn(940 + i * 46, 263, String(i + 1), true);
  I.push({ t: "label", x: 1100, y: 238, text: "PROGRAM SELECT (globals printed above: not modelled)", size: 7, dim: true });
  btn(1335, 263, "GLOBALS", true);
  sw("rel", 1420, 263, ""); I.push({ t: "label", x: 1420, y: 292, text: "RELEASE", size: 8, bold: true });
  kn("vol", 1555, 260, "VOLUME", { cap: "#f2f2f2" }); btn(1680, 263, "TUNE", true);
  // performance settings that live in the Globals menu on the real one, drawn in a strip under the panel
  sec(20, 325, 1700, 46, "");
  I.push({ t: "label", x: 30, y: 352, text: "GLOBALS / MENU (not on the panel):", size: 8, anchor: "start", dim: true });
  I.push({ t: "hslider", k: "uniN", x: 240, y: 332, w: 160, h: 26, label: "Unison voices", a: RED });
  I.push({ t: "hslider", k: "uniDet", x: 420, y: 332, w: 160, h: 26, label: "Unison detune", a: RED });
  I.push({ t: "hslider", k: "bend", x: 600, y: 332, w: 160, h: 26, label: "Pitch wheel range", a: RED });

  FaithfulPanel.register({ id: "prophet", name: "Prophet-5", w: 1740, h: 380, accent: RED, knob: "cap",
    accents: { red: "#e8392c" },
    colors: { dark: { body: "#0d0d0d", line: "#d8d8d8" }, light: { body: "#ffffff", line: "#1a1a1a" } },
    src: ["Prophet-5 Rev4 User's Guide v1.0 (Sequential, Oct 2020), PDF p. 12: front-panel drawing (positions measured from it)", "same guide pp. 17-45: the controls one by one"],
    approx: "Positions measured off the guide's front-panel drawing (p. 12); knob sizes, button sizes and spacing in between are this page's. Knob caps drawn plain black (the real ones are black with a printed 0-10 scale). Unison voices / detune and the pitch-wheel range are menu settings on the real one, shown in a strip under the panel. The programmer, A440, aftertouch, master tune and tune are drawn but not modelled.",
    items: I });
})();
