// The Korg MS-20 (1978) as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.ms20.
// Every knob, jack and section box measured off the panel drawing in the MS-20 Owner's Manual (Korg), PDF page 10 ("Normal
// setting"), at about 1785 units for the panel's width; legends as printed there. The patch panel's jacks are drawn (with its
// printed signal-flow boxes) but are decoration: cords are patched in this page's Simple view ("Patch panel" group).
(function () {
  var I = [], OX = 80, OY = 45, OR = "or";
  function X(x) { return x - OX; } function Y(y) { return y - OY; }
  function sec(x1, y1, x2, y2, label) { I.push({ t: "section", x: X(x1), y: Y(y1), w: x2 - x1, h: y2 - y1, label: label, title: label ? "top" : null, head: 0, size: 10 }); }
  function kn(k, x, y, r, label, more) { I.push(Object.assign({ t: "knob", k: k, x: X(x), y: Y(y), r: r || 22, label: label, size: 9, cap: "#f4f4f4" }, more || {})); }
  function jk(x, y, label) { I.push({ t: "jack", x: X(x), y: Y(y), r: 11, label: label || "", size: 7 }); }
  function box(x1, y1, x2, y2, label) { I.push({ t: "button", x: X(x1), y: Y(y1), w: x2 - x1, h: y2 - y1, label: label, size: 8 }); }
  sec(80, 45, 237, 497, "VCO 1"); sec(237, 45, 365, 497, "VCO 2"); sec(365, 45, 495, 380, "VCO MIXER"); sec(495, 45, 620, 380, "VC HPF"); sec(620, 45, 748, 380, "VC LPF");
  sec(748, 45, 995, 260, "VCA"); sec(365, 380, 495, 635, "FM"); sec(495, 380, 620, 635, "FcM"); sec(620, 380, 748, 635, "FcM"); sec(748, 260, 870, 635, "MG"); sec(870, 260, 995, 635, "EG 1");
  sec(995, 45, 1113, 635, "EG 2"); sec(80, 497, 237, 635, ""); sec(237, 497, 365, 635, ""); sec(1113, 45, 1865, 405, ""); sec(1113, 405, 1865, 635, "EXT SIG PROCESSOR");
  // VCO 1 / VCO 2: waveform and scale are rotary switches on the real one
  I.push({ t: "select", k: "w1", x: X(120), y: Y(150), w: 80, h: 36, label: "", names: { tri: "∧ TRI", saw: "⩘ SAW", pulse: "⊓ PULSE", noise: "NOISE" }, size: 10 }); I.push({ t: "label", x: X(160), y: Y(222), text: "WAVE FORM", size: 9 });
  kn("pw1", 160, 295, 20, "PW");
  I.push({ t: "select", k: "s1", x: X(125), y: Y(402), w: 70, h: 36, label: "", size: 12 }); I.push({ t: "label", x: X(160), y: Y(476), text: "SCALE", size: 9 });
  I.push({ t: "select", k: "w2", x: X(265), y: Y(150), w: 80, h: 36, label: "", names: { saw: "⩘ SAW", square: "⊓ SQUARE", pulse: "⊓ PULSE", ring: "RING" }, size: 10 }); I.push({ t: "label", x: X(305), y: Y(222), text: "WAVE FORM", size: 9 });
  kn("pitch2", 305, 295, 20, "PITCH");
  I.push({ t: "select", k: "s2", x: X(270), y: Y(402), w: 70, h: 36, label: "", size: 12 }); I.push({ t: "label", x: X(305), y: Y(476), text: "SCALE", size: 9 });
  kn("porta", 160, 575, 20, "PORT"); kn(null, 305, 575, 20, "MASTER TUNE");
  kn("l1", 428, 170, 20, "VCO 1"); kn("l2", 428, 310, 20, "VCO 2");
  kn("hCut", 558, 165, 26, "fc"); kn("hPeak", 558, 305, 20, "PEAK"); kn("lCut", 685, 165, 26, "fc"); kn("lPeak", 685, 305, 20, "PEAK");
  I.push({ t: "label", x: X(870), y: Y(170), text: "▷", size: 60 }); I.push({ t: "label", x: X(870), y: Y(224), text: "EG 2 & EXT", size: 9 });
  kn("fmMg", 428, 480, 20, "MG/T.EXT"); kn("fmEg1", 428, 575, 20, "EG1/EXT");
  kn("hMg", 558, 480, 20, "MG/T.EXT"); kn("hEg2", 558, 575, 20, "EG2/EXT"); kn("lMg", 685, 480, 20, "MG/T.EXT"); kn("lEg2", 685, 575, 20, "EG2/EXT");
  I.push({ t: "jack", x: X(812), y: Y(377), r: 6, label: "" });
  kn("mgWave", 812, 480, 22, "WAVE FORM"); kn("mgFreq", 812, 575, 20, "FREQ");
  kn("e1D", 933, 375, 20, "DELAY"); kn("e1A", 933, 478, 20, "ATTACK"); kn("e1R", 933, 575, 20, "RELEASE");
  kn("e2H", 1055, 155, 20, "HOLD"); kn("e2A", 1055, 272, 20, "ATTACK"); kn("e2D", 1055, 375, 20, "DECAY"); kn("e2S", 1055, 475, 20, "SUSTAIN"); kn("e2R", 1055, 575, 20, "RELEASE");
  // patch panel: printed flow boxes, jacks, volume
  box(1142, 80, 1205, 118, "VCO 1"); box(1235, 80, 1298, 118, "VCO 2"); box(1322, 78, 1362, 120, "MIX"); box(1388, 78, 1432, 120, "HPF"); box(1466, 78, 1518, 120, "LPF"); box(1550, 80, 1605, 118, "VCA");
  box(1200, 238, 1262, 285, "MG"); box(1432, 238, 1490, 285, "EG 1"); box(1532, 238, 1590, 285, "EG 2"); box(1200, 350, 1262, 398, "S/H"); box(1565, 350, 1625, 398, "NG"); box(1745, 280, 1790, 298, "KBD");
  [[1165, 178], [1262, 178], [1338, 178], [1413, 178], [1492, 178], [1575, 178], [1165, 262], [1300, 262], [1358, 262], [1612, 262], [1733, 262], [1798, 262], [1665, 290], [1225, 318],
   [1358, 318], [1430, 318], [1530, 318], [1733, 318], [1798, 318], [1165, 375], [1300, 375], [1358, 375], [1468, 375], [1530, 375], [1662, 375], [1733, 375], [1798, 375]].forEach(function (p) { jk(p[0], p[1]); });
  jk(1795, 97, "SIG OUT"); jk(1800, 175, "PHONES");
  kn("vol", 1692, 130, 30, "VOL");
  box(1205, 445, 1250, 490, "AMP"); box(1335, 448, 1395, 488, "BPF"); box(1465, 445, 1525, 492, "F-V CON"); box(1622, 445, 1705, 492, "EF");
  [1165, 1300, 1430, 1560, 1733, 1798].forEach(function (x) { jk(x, 468); });
  [[1185, "SIG LEVEL"], [1282, "LOW CUT"], [1382, "HIGH CUT"], [1477, "CV ADJ"], [1568, "THRES LEVEL"]].forEach(function (c) { kn(null, c[0], 578, 26, c[1]); });
  I.push({ t: "keys", x: X(190), y: Y(660), w: 1310, h: 140, n: 22 });
  I.push({ t: "section", x: 0, y: Y(660), w: 105, h: 140, label: "", head: 0 }); I.push({ t: "label", x: 52, y: Y(785), text: "PITCH BEND", size: 7, dim: true });

  FaithfulPanel.register({ id: "ms20", name: "MS-20", w: 1785, h: 760, accent: OR, knob: "cap",
    accents: { or: "#f08a24" },
    colors: { dark: { body: "#141414", line: "#888" }, light: { body: "#f3f3f3", line: "#333" } },
    src: ["Korg MS-20 Owner's Manual, PDF p. 10: panel drawing in the 'Normal setting' (positions measured from it)", "same manual pp. 11-13: features and functions"],
    approx: "Knobs, jacks and boxes measured off the manual's panel drawing; knob sizes rounded. The waveform and scale rotary switches are drawn as click-through boxes. Jacks are drawn but not live: cords are patched from the Simple view. Master tune, the external signal processor, the MG LED and the pitch-bend wheel are drawn but not modelled.",
    items: I });
})();
