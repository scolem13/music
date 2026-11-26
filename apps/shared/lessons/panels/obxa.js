// The Oberheim OB-Xa (1981) as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.obxa.
// Section order and names from the annotated photograph in the OB-Xa Owner's Manual (3rd ed., April 1982), PDF page 5 (MANUAL,
// CONTROL, MODULATION, OSCILLATORS, FILTER, ENVELOPES along the top; KEYBOARD and PROGRAMMER below), and the controls inside each
// from the manual's "Front panel controls" pages (PDF pp. 9-13). The photograph is too dark to measure single knobs: positions
// inside a section are this page's, in the order the manual lists them. Black panel, black knobs, red LEDs.
(function () {
  var I = [], RED = "red";
  function sec(x, y, w, h, label) { I.push({ t: "section", x: x, y: y, w: w, h: h, label: label, title: "top", size: 10 }); }
  function kn(k, x, y, label, more) { I.push(Object.assign({ t: "knob", k: k, x: x, y: y, r: 15, label: label, size: 7.5, cap: "#2e2e2e" }, more || {})); }
  function sw(k, x, y, label) { I.push({ t: "switch", k: k, x: x - 14, y: y, w: 28, h: 18, label: "", a: RED }); if (label) I.push({ t: "label", x: x, y: y + 27, text: label, size: 7, bold: true }); }
  function btn(x, y, label) { I.push({ t: "button", x: x - 14, y: y, w: 28, h: 18, label: "" }); if (label) I.push({ t: "label", x: x, y: y + 27, text: label, size: 7, bold: true }); }
  sec(0, 0, 150, 300, "MANUAL"); kn("vol", 40, 52, "VOLUME"); kn(null, 110, 52, "BALANCE");
  btn(30, 112, "AUTO"); btn(75, 112, "HOLD"); btn(120, 112, "CHORD"); kn(null, 75, 215, "MASTER TUNE");
  sec(150, 0, 120, 300, "CONTROL"); kn("porta", 210, 52, "PORTAMENTO"); sw("uni", 210, 112, "UNISON"); kn("o2Det", 210, 215, "OSC-2 DETUNE");
  sec(270, 0, 200, 300, "MODULATION"); kn("lfoRate", 305, 52, "LFO RATE"); kn("fmDepth", 370, 52, "FREQ DEPTH"); kn("pwDepth", 435, 52, "PW DEPTH");
  sw("lSine", 305, 112, "SINE"); sw("lSq", 305, 162, "SQUARE"); sw("lSH", 305, 212, "S/H");
  sw("fmO1", 370, 112, "OSC 1"); sw("fmO2", 370, 162, "OSC 2"); sw("fmF", 370, 212, "FILTER");
  sw("pwO1", 435, 112, "OSC 1"); sw("pwO2", 435, 162, "OSC 2");
  sec(470, 0, 340, 165, "OSCILLATORS"); I.push({ t: "label", x: 545, y: 28, text: "1", size: 9, bold: true }); I.push({ t: "label", x: 715, y: 28, text: "2", size: 9, bold: true });
  kn("o1Freq", 510, 52, "FREQUENCY"); kn("pw", 590, 52, "PULSE WIDTH"); kn("o2Freq", 715, 52, "FREQUENCY");
  sw("o1Saw", 495, 112, "SAW"); sw("o1Pulse", 528, 112, "PULSE"); sw("sync", 600, 112, "SYNC"); sw("fEnvO2", 640, 112, "F-ENV");
  sw("o2Saw", 700, 112, "SAW"); sw("o2Pulse", 733, 112, "PULSE");
  sec(810, 0, 250, 165, "FILTER"); kn("cutoff", 850, 52, "FREQUENCY"); kn("res", 920, 52, "RESONANCE"); kn("fMod", 990, 52, "MODULATION");
  sw("fO1", 838, 112, "OSC 1"); I.push({ t: "select", k: "fO2", x: 858, y: 112, w: 42, h: 18, label: "", names: { off: "off", half: "HALF", full: "FULL" }, size: 8 }); I.push({ t: "label", x: 879, y: 139, text: "OSC 2", size: 7, bold: true });
  sw("fNoise", 920, 112, "NOISE"); sw("pole4", 970, 112, "4-POLE"); sw("track", 1025, 112, "TRACK");
  sec(1060, 0, 250, 300, "ENVELOPES"); I.push({ t: "label", x: 1070, y: 30, text: "FILTER", size: 7.5, anchor: "start", dim: true }); I.push({ t: "label", x: 1070, y: 180, text: "LOUDNESS", size: 7.5, anchor: "start", dim: true });
  [["A", "ATTACK"], ["D", "DECAY"], ["S", "SUSTAIN"], ["R", "RELEASE"]].forEach(function (s, i) { kn("f" + s[0], 1095 + i * 57, 62, s[1]); kn("l" + s[0], 1095 + i * 57, 212, s[1]); });
  sec(470, 165, 340, 135, "KEYBOARD"); [["SPLIT", 510], ["DOUBLE", 565], ["LOWER", 620], ["UPPER", 675]].forEach(function (b) { btn(b[1], 200, b[0]); });
  I.push({ t: "label", x: 640, y: 270, text: "split / double: not modelled", size: 7, dim: true });
  sec(810, 165, 250, 135, "PROGRAMMER"); I.push({ t: "display", x: 822, y: 190, w: 40, h: 22, draw: function () { return []; }, label: "" });
  ["A", "B", "C", "D"].forEach(function (s, i) { btn(890 + i * 34, 192, s); }); btn(840, 245, "MANUAL"); btn(890, 245, "WRITE");
  I.push({ t: "select", k: "sem", x: 935, y: 245, w: 110, h: 18, label: "", names: { off: "SEM: off", lp: "SEM: LP", bp: "SEM: BP", hp: "SEM: HP", notch: "SEM: notch" }, size: 8 });
  I.push({ t: "label", x: 990, y: 280, text: "(SEM modes: not on the OB-Xa)", size: 6.5, dim: true });
  I.push({ t: "keys", x: 140, y: 312, w: 1170, h: 70, n: 35 });
  I.push({ t: "section", x: 0, y: 312, w: 132, h: 70, label: "", head: 0 }); I.push({ t: "label", x: 66, y: 330, text: "MODULATION PANEL", size: 7, bold: true }); I.push({ t: "label", x: 66, y: 348, text: "bend · vibrato · transpose", size: 6.5, dim: true });

  FaithfulPanel.register({ id: "obxa", name: "OB-Xa", w: 1310, h: 385, accent: RED, knob: "cap",
    accents: { red: "#e5372b" },
    colors: { dark: { body: "#0f0f0f", line: "#666" }, light: { body: "#ffffff", line: "#222" } },
    src: ["Oberheim OB-Xa Owner's Manual (3rd ed., April 1982), PDF p. 5: annotated photograph (section order and names)", "same manual PDF pp. 9-13: front panel controls, section by section"],
    approx: "Section order and names from the manual's annotated photograph; the photograph is too dark to measure, so knob and switch places inside each section (and section widths) are this page's, in the manual's order. The SEM filter-mode switch is this page's addition and is not on the OB-Xa. Balance, auto-tune, hold, chord, master tune, the keyboard modes, programmer and modulation panel are drawn but not modelled.",
    items: I });
})();
