// The Sequential Prophet-6's front panel as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.p6. Positions measured from the "Prophet-6 front panel" drawing in the Prophet-6 Operation Manual,
// printed p. 1 (PDF p. 11), a vector drawing rendered at 3960 px page width; left and right halves read in pixels (a: page
// x = 380 + cx, b: page x = 1900 + cx, y = 2720 + cy), panel origin page (383, 2729), scaled by S. Section outlines with their
// names set in the top border, knobs, buttons and LED legends as drawn.
(function () {
  var S = 0.42, I = [], A = "p6";
  function ax(cx) { return (380 + cx - 383) * S; } function bx(cx) { return (1900 + cx - 383) * S; } function yy(cy) { return (2720 + cy - 2729) * S; }
  function X(h, cx) { return h === "a" ? ax(cx) : bx(cx); }
  function sec(h, x0, y0, x1, y1, label) { I.push({ t: "section", x: X(h, x0), y: yy(y0), w: (x1 - x0) * S, h: (y1 - y0) * S, label: label, title: label ? "border" : null, head: 0, size: 8.5 }); }
  function k(key, h, cx, cy, label, more) { I.push(Object.assign({ t: "knob", k: key, x: X(h, cx), y: yy(cy), r: 11, label: label, size: 6.5, cap: "#111", noValue: true }, more || {})); }
  function b(key, h, cx, cy, label, more) { I.push(Object.assign({ t: key ? "switch" : "button", k: key, x: X(h, cx) - 20 * S, y: yy(cy) - 11 * S, w: 40 * S + 4, h: 22 * S + 2, label: "", a: A }, more || {}));
    if (label) I.push({ t: "label", x: X(h, cx) + 2, y: yy(cy) + 13, text: label, size: 6.2 }); }
  function lab(t, h, cx, cy, size, more) { I.push(Object.assign({ t: "label", x: X(h, cx), y: yy(cy), text: t, size: size || 6.5 }, more || {})); }
  // whole panel (outline only)
  I.push({ t: "section", x: 0, y: 0, w: (3525 - 383) * S, h: (3360 - 2729) * S, head: 0 });
  // rear-panel jack names printed along the top edge
  [["Phones", "a", 525], ["Left", "a", 597], ["Right", "a", 668], ["LP Filter", "a", 1420], ["Volume", "a", 1490], ["Sustain", "b", 42], ["Sequencer", "b", 113], ["MIDI Thru", "b", 192], ["MIDI Out", "b", 278], ["MIDI In", "b", 360], ["USB", "b", 437], ["AC In", "b", 1388], ["On/Off", "b", 1516]].forEach(function (j) { lab(j[0], j[1], j[2], 50, 5, { dim: true }); });
  // sections (p. 1)
  sec("a", 163, 95, 795, 208, "POLY MOD"); sec("a", 815, 95, 1380, 208, "CLOCK"); sec("b", -140, 95, 502, 208, "ARPEGGIATOR  ·  SEQUENCER");
  sec("b", 522, 95, 1118, 208, "AFTERTOUCH"); sec("b", 1138, 95, 1595, 208, "MISC PARAMETERS");
  sec("a", 28, 228, 140, 340, "DISTORT"); sec("a", 163, 228, 975, 340, "EFFECTS"); sec("a", 995, 228, 1525, 340, "OSCILLATOR 1"); sec("a", 995, 362, 1525, 475, "OSCILLATOR 2");
  sec("a", 28, 362, 975, 475, "LOW FREQUENCY OSCILLATOR"); sec("b", 25, 228, 137, 340, "SLOP"); sec("b", 158, 228, 395, 475, "MIXER");
  sec("b", 415, 228, 958, 340, "HIGH-PASS FILTER"); sec("b", 415, 362, 958, 475, "LOW-PASS FILTER"); sec("b", 978, 228, 1595, 340, "FILTER ENVELOPE"); sec("b", 978, 362, 1595, 475, "AMPLIFIER ENVELOPE");
  // master volume, poly mod
  k(null, "a", 85, 150, "MASTER VOL");
  k("pmFenv", "a", 215, 150, "FILTER ENV"); k("pmOsc2", "a", 343, 150, "OSC 2"); b("pmF1", "a", 455, 150, "FREQ 1"); b("pmSh1", "a", 552, 150, "SHAPE 1"); b("pmPw1", "a", 650, 150, "PW 1");
  b("pmLp", "a", 728, 150, "LP"); b("pmHp", "a", 772, 150, "HP"); lab("FILTER", "a", 750, 192, 6.2);
  // clock, arpeggiator, sequencer (not modelled)
  b(null, "a", 862, 150, "TAP TEMPO"); k(null, "a", 965, 150, "BPM"); I.push({ t: "display", x: ax(1022), y: yy(130), w: 88 * S, h: 40 * S, draw: function () { return []; } }); k(null, "a", 1175, 150, "VALUE");
  lab("Half · Qtr · 8th D · 8th · 8th S", "a", 1290, 118, 4.8, { dim: true });
  b(null, "a", 1438, 150, "ON/OFF"); k(null, "a", 1530, 150, "OCTAVES"); k(null, "b", 152, 150, "MODE"); lab("Up · Down · Up/Down · Random · Assign", "b", 245, 118, 4.8, { dim: true });
  b(null, "b", 363, 150, "RECORD"); b(null, "b", 455, 150, "PLAY");
  // aftertouch (not modelled), misc parameters
  k(null, "b", 578, 150, "AMOUNT"); ["FREQ 1", "FREQ 2", "LFO AMT", "AMP", "FILTER"].forEach(function (t, i) { b(null, "b", 682 + i * 97.5, 150, t); });
  k(null, "b", 1197, 150, "PAN SPREAD"); b(null, "b", 1313, 150, "KEY MODE"); b(null, "b", 1425, 150, "P WHL RANGE"); k("vol", "b", 1540, 150, "PRGM VOL");
  // distortion, effects: the EFFECT A / B button picks which slot the Type / Mix / Param knobs edit (pages fa / fb)
  k("dist", "a", 85, 285, "AMOUNT");
  b("fxOn", "a", 210, 283, "ON/OFF");
  I.push({ t: "button", go: "fa", x: ax(280), y: yy(270), w: 22 * S + 3, h: 24 * S, label: "A", size: 6.5, a: A }, { t: "button", go: "fb", x: ax(280) + 22 * S + 4, y: yy(270), w: 22 * S + 3, h: 24 * S, label: "B", size: 6.5, a: A });
  lab("EFFECT", "a", 302, 323, 6.2);
  var FXA = { off: "off", bbd: "bbd", ddl: "ddL", cho: "CHO", ph1: "PH1", ph2: "PH2" }, FXB = Object.assign({ hal: "HAL", roo: "rOO", pla: "PLA", spr: "SPr" }, FXA);
  I.push({ t: "select", k: "fxA", x: ax(458), y: yy(240), w: 90 * S, h: 38 * S, label: "", size: 8, names: FXA }, { t: "select", k: "fxB", x: ax(458), y: yy(290), w: 90 * S, h: 38 * S, label: "", size: 8, names: FXB });
  lab("A", "a", 438, 262, 6); lab("B", "a", 438, 312, 6);
  [["fa", "a"], ["fb", "b"]].forEach(function (pg) { var p = pg[1];
    k(null, "a", 395, 285, "TYPE", { page: pg[0] }); k(p + "Mix", "a", 600, 285, "MIX", { page: pg[0] }); k(p + "P1", "a", 740, 285, "1", { page: pg[0] }); k(p + "P2", "a", 910, 285, "2", { page: pg[0] }); });
  b(null, "a", 677, 283, "CLOCK SYNC");
  I.push({ t: "display", x: ax(790), y: yy(240), w: 90 * S, h: 38 * S, draw: function () { return []; } }, { t: "display", x: ax(790), y: yy(290), w: 90 * S, h: 38 * S, draw: function () { return []; } });
  // oscillators
  k("o1Freq", "a", 1050, 285, "FREQUENCY"); b("sync", "a", 1175, 283, "SYNC"); k("o1Shape", "a", 1295, 285, "SHAPE"); k("o1Pw", "a", 1415, 285, "PULSE WIDTH");
  k("o2Freq", "a", 1050, 418, "FREQUENCY"); k("o2Fine", "a", 1175, 418, "FINE"); k("o2Shape", "a", 1295, 418, "SHAPE"); k("o2Pw", "a", 1415, 418, "PULSE WIDTH");
  b("o2Lo", "a", 1505, 418, "LOW FREQ"); b("o2Kbd", "b", 90, 418, "KEYBOARD");
  // LFO
  k("lfoFreq", "a", 85, 418, "FREQUENCY"); b(null, "a", 163, 418, "LFO SYNC");
  I.push({ t: "select", k: "lfoShape", x: ax(205), y: yy(400), w: 120 * S, h: 36 * S, label: "", size: 7, names: { tri: "Triangle", saw: "Sawtooth", rsaw: "Rev Saw", square: "Square", random: "Random" } });
  lab("SHAPE", "a", 265, 460, 6.2);
  k("lfoInit", "a", 437, 418, "INITIAL AMT"); b("lfF1", "a", 537, 418, "FREQ 1"); b("lfF2", "a", 635, 418, "FREQ 2"); b("lfPw", "a", 733, 418, "PW 1+2"); b("lfAmp", "a", 830, 418, "AMP");
  b("lfLp", "a", 910, 418, "LP"); b("lfHp", "a", 952, 418, "HP");
  // slop, mixer
  k("slop", "b", 80, 285, "AMOUNT");
  k("m1", "b", 213, 285, "OSC 1"); k("m2", "b", 338, 285, "OSC 2"); k("mSub", "b", 213, 418, "SUB OCTAVE"); k("mN", "b", 338, 418, "NOISE");
  // filters
  var KB = { off: "off", half: "Half", full: "Full" };
  [["h", 285], ["l", 418]].forEach(function (f) { var p = f[0], Y = f[1];
    k(p + "Cut", "b", 470, Y, "CUTOFF"); k(p + "Res", "b", 595, Y, "RESONANCE"); k(p + "Env", "b", 717, Y, "ENV AMOUNT"); b(p + "Vel", "b", 820, Y - 2, "VELOCITY");
    I.push({ t: "select", k: p + "Kbd", x: bx(885), y: yy(Y) - 14, w: 56 * S, h: 18, label: "", size: 7, names: KB }); lab("KEYBOARD", "b", 912, Y + 26, 6.2); });
  // envelopes
  [["A", 1103, "ATTACK"], ["D", 1225, "DECAY"], ["S", 1350, "SUSTAIN"], ["R", 1473, "RELEASE"]].forEach(function (e) { k("f" + e[0], "b", e[1], 285, e[2]); });
  k("aAmt", "b", 1035, 418, "ENV AMOUNT"); b("aVel", "b", 1103, 418, "VELOCITY");
  [["A", 1168, "ATTACK"], ["D", 1292, "DECAY"], ["S", 1415, "SUSTAIN"], ["R", 1538, "RELEASE"]].forEach(function (e) { k("a" + e[0], "b", e[1], 418, e[2]); });
  // bottom row: transpose, hold, glide, unison, bank / program, number buttons, write / globals / preset
  b(null, "a", 118, 567, "DOWN"); b(null, "a", 240, 567, "UP"); lab("TRANSPOSE", "a", 180, 618, 6.8, { bold: true }); lab("-2  -1  0  +1  +2", "a", 180, 528, 5.5, { dim: true });
  b(null, "a", 505, 570, "HOLD"); k("glide", "a", 690, 563, "GLIDE RATE"); b(null, "a", 815, 570, "GLIDE"); b("uni", "a", 997, 570, "UNISON");
  b(null, "a", 1178, 570, "SELECT"); lab("BANK", "a", 1178, 510, 7, { bold: true });
  I.push({ t: "display", x: ax(1232), y: yy(525), w: 150 * S, h: 66 * S, draw: function () { return []; } }); lab("BANK   PROGRAM", "a", 1305, 618, 6.5);
  b(null, "a", 1435, 570, "SELECT"); lab("TENS", "a", 1435, 510, 7, { bold: true });
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (n) { b(null, "b", 24 + n * 92.3, 570, String(n)); });
  b(null, "b", 1040, 570, "WRITE"); b(null, "b", 1225, 570, "GLOBALS"); b(null, "b", 1410, 570, "PRESET");
  // unison voices: set from the Unison button + number keys on the instrument; a knob here (this page's)
  k("uniN", "a", 1085, 563, "UNI VOICES", { r: 8 });

  FaithfulPanel.register({ id: "p6", name: "Prophet-6", w: (3530 - 383) * S, h: (3360 - 2729) * S, page: "fa", accent: A, knob: "cap", round: 8,
    accents: { p6: "#e23b2e" },
    colors: { dark: { body: "#000000", head: "#000000", line: "#d8d8d8", ink: "#f2f2f2" }, light: { body: "#ffffff", head: "#ffffff", line: "#111111", ink: "#111111" } },
    src: ["Prophet-6 Operation Manual, printed p. 1 (PDF p. 11): \"Prophet-6 front panel\" drawing", "pp. 9-60 (printed = PDF - 10): the controls"],
    approx: "Positions measured from the manual's front-panel drawing (p. 1); no dimensions printed, sizes measured. The Effects Type knob, Value knob and LED displays are drawn but the effect type is picked from the two menus (A, B) and the EFFECT A / B button pages the Mix / 1 / 2 knobs between the slots, as the real button does; LP / HP and keyboard Half / Full LED pairs are separate switches or a menu here. Unison voices is a small knob added by this page (set from the number keys on the instrument). Guessed: red LEDs. Not modelled (dimmed): master volume, clock, arpeggiator, sequencer, aftertouch, pan spread, key mode, bend range, transpose, hold, glide on, the program buttons.",
    items: I });
})();
