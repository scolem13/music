// The ARP 2600 as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.arp2600.
// Every slider, jack, switch and printed module box measured off the whole-panel drawing in Korg's ARP 2600 M Owner's Manual,
// PDF page 7 (the locator drawing beside "Front panel (VCO-1 section)"; the 2600 M keeps the original's layout), at about 1995 units
// for the panel's width; legends from the section pages (PDF pp. 6-16) and the original ARP owner's manual (1971). Jacks are
// drawn but are decoration: this page's cords are patched from the Simple view ("Patch cords" group).
(function () {
  var I = [], OX = 5, OY = 80, OR = "or";
  function X(x) { return x - OX; } function Y(y) { return y - OY; }
  function sec(x1, y1, x2, y2) { I.push({ t: "section", x: X(x1), y: Y(y1), w: x2 - x1, h: y2 - y1, label: "", head: 0 }); }
  function hs(k, x1, y, label, more) { I.push(Object.assign({ t: "hslider", k: k, x: X(x1), y: Y(y) - 18, w: 150, h: 26, label: label, a: OR }, more || {})); }
  function vs(k, x, y1, label, more) { I.push(Object.assign({ t: "vslider", k: k, x: X(x) - 11, y: Y(y1), w: 22, h: 160, label: label || "", a: OR }, more || {})); }
  function jk(x, y, label) { I.push({ t: "jack", x: X(x), y: Y(y), r: 14, label: label || "", size: 7 }); }
  function box(x1, y1, x2, y2, label) { I.push({ t: "button", x: X(x1), y: Y(y1), w: x2 - x1, h: y2 - y1, label: label, size: 9 }); }
  function lb(x, y, t, s) { I.push({ t: "label", x: X(x), y: Y(y), text: t, size: s || 8, bold: true }); }
  function kbd(k, x, y) { I.push({ t: "switch", k: k, x: X(x) - 14, y: Y(y) - 22, w: 30, h: 44, label: "", a: "led" }); lb(x, y - 28, "AUDIO", 7); lb(x, y + 34, "KBD ON / OFF", 6.5); }
  // module columns (top) and bottom row
  sec(5, 80, 308, 775); sec(308, 80, 508, 775); sec(508, 80, 755, 775); sec(755, 80, 948, 775); sec(948, 80, 1340, 775); sec(1340, 80, 1537, 775); sec(1537, 80, 1735, 775); sec(1735, 80, 1995, 775);
  sec(5, 775, 520, 1078); sec(520, 775, 595, 1078); sec(595, 775, 750, 1078); sec(750, 775, 1145, 1078); sec(1145, 775, 1420, 1078); sec(1420, 775, 1475, 1078); sec(1475, 775, 1995, 1078);
  // preamp, envelope follower, ring modulator
  jk(90, 182); I.push({ t: "knob", k: null, x: X(182), y: Y(180), r: 28, label: "GAIN", cap: "#ddd" }); I.push({ t: "select", k: null, x: X(278), y: Y(158), w: 22, h: 44, label: "", text: "x100" }); lb(288, 220, "RANGE", 7);
  box(135, 268, 235, 305, "PREAMPLIFIER"); jk(285, 287, "OUTPUT"); box(75, 365, 155, 402, "ENV. FOLLOWER"); box(168, 365, 252, 402, "RING MOD"); jk(285, 382, "OUTPUT"); jk(140, 555, "OUTPUT");
  vs(null, 90, 485); vs(null, 187, 485); vs(null, 287, 485); I.push({ t: "select", k: null, x: X(225), y: Y(668), w: 22, h: 38, label: "", text: "" }); lb(236, 718, "DC", 7);
  // VCO-1
  lb(410, 143, "INITIAL OSCILLATOR FREQUENCY", 7); hs("f1", 335, 181, ""); hs("fine1", 335, 234, "FINE TUNE");
  box(342, 355, 438, 410, "VCO-1"); jk(482, 342, "SAWTOOTH"); jk(482, 424, "SQUARE");
  vs("v1sh", 385, 485); vs("v1adsr", 432, 485); vs("v1sin2", 483, 485); kbd("kb1", 330, 618); lb(410, 657, "F M  CONTROL", 7);
  // VCO-2
  lb(630, 143, "INITIAL OSCILLATOR FREQUENCY", 7); hs("f2", 557, 181, ""); hs("fine2", 557, 234, "FINE TUNE"); hs("pw2", 557, 286, "PULSE WIDTH");
  box(535, 355, 625, 410, "VCO-2"); jk(673, 342, "TRIANGLE"); jk(727, 342, "SAWTOOTH"); jk(673, 424, "SINE"); jk(727, 424, "PULSE");
  vs("v2sh", 578, 485); vs("v2adsr", 628, 485); vs("v2sq1", 678, 485); vs("v2pwm", 727, 485); kbd("kb2", 522, 618); lb(610, 657, "F M  CONTROL", 7); lb(712, 657, "PWM", 7);
  // VCO-3
  lb(850, 143, "INITIAL OSCILLATOR FREQUENCY", 7); hs("f3", 776, 181, ""); hs("fine3", 776, 234, "FINE TUNE"); hs("pw3", 776, 286, "PULSE WIDTH");
  box(785, 355, 875, 410, "VCO-3"); jk(922, 342, "SAWTOOTH"); jk(922, 424, "PULSE");
  vs("v3noise", 825, 485); vs("v3adsr", 875, 485); vs("v3sin2", 925, 485); kbd("kb3", 772, 618); lb(855, 657, "F M  CONTROL", 7);
  // VCF
  lb(1142, 143, "INITIAL FILTER FREQUENCY", 7); hs("cut", 1068, 181, ""); hs(null, 1068, 234, "FINE TUNE"); hs("res", 1068, 286, "RESONANCE");
  I.push({ t: "select", k: "type", x: X(1278), y: Y(212), w: 24, h: 44, label: "", names: { I: "I", II: "II" } }); lb(1290, 206, "TYPE", 7);
  box(1140, 355, 1278, 410, "VCF"); jk(1315, 384, "OUTPUT");
  vs("inRing", 970, 485); vs("inV1", 1020, 485); vs("inV2", 1070, 485); vs("inV3", 1120, 485); vs("inN", 1168, 485); vs("fAdsr", 1268, 485); vs("fSin2", 1315, 485);
  lb(1070, 657, "AUDIO", 7); lb(1268, 657, "CONTROL", 7);
  // envelopes
  [["aA", "ATTACK"], ["aD", "DECAY"], ["aS", "SUSTAIN"], ["aR", "RELEASE"]].forEach(function (c, i) { var x = 1362 + i * 49.7; lb(x, 160, c[1], 6.5); vs(c[0], x, 172, "", { h: 150 }); });
  box(1350, 352, 1475, 410, "ADSR"); jk(1510, 384, "OUTPUT");
  lb(1362, 462, "ATTACK", 6.5); vs("arA", 1362, 485); lb(1511, 462, "RELEASE", 6.5); vs("arR", 1511, 485);
  I.push({ t: "button", x: X(1395), y: Y(472), w: 34, h: 34, label: "START", size: 7 }); jk(1462, 493, "OUTPUT"); box(1383, 530, 1493, 585, "AR"); box(1438, 615, 1495, 645, "KBD GATE/TRIG");
  // VCA
  lb(1632, 157, "INITIAL GAIN", 7); hs("gain", 1560, 181, ""); box(1570, 355, 1680, 410, "VCA"); jk(1705, 384, "OUTPUT");
  vs(null, 1560, 485); vs(null, 1608, 485); vs("vAr", 1658, 485); vs("vAdsr", 1706, 485); lb(1585, 657, "AUDIO", 7); lb(1682, 652, "LINEAR · EXP'L", 6.5);
  // mixer, reverb, outputs
  jk(1778, 182, "LEFT OUT"); jk(1877, 182, "RIGHT OUT"); hs(null, 1745, 234, "PAN"); jk(1757, 287, "L IN"); jk(1805, 287, "R IN"); jk(1902, 290, "");
  box(1748, 335, 1815, 362, "MIXER"); jk(1757, 424); jk(1805, 424); box(1845, 535, 1912, 575, "REVERB");
  vs(null, 1755, 485); vs(null, 1805, 485); vs(null, 1853, 340, "", { h: 200 }); vs(null, 1903, 340, "", { h: 200 }); jk(1903, 620, "REVERB OUT");
  // jacks along the bottom of the top row (inputs, with the normalled source printed under each)
  [90, 187, 287, 335, 385, 432, 483, 532, 580, 628, 678, 727, 777, 825, 875, 925, 970, 1020, 1070, 1120, 1168, 1218, 1268, 1315, 1415, 1462, 1511, 1560, 1608, 1658, 1706, 1755, 1805, 1853].forEach(function (x) { jk(x, 688); });
  // bottom row: multiple, left speaker, noise generator, voltage processors, sample & hold, electronic switch, right speaker, power
  [800, 850, 890, 935, 980, 1022].forEach(function (y) { jk(90, y); }); lb(135, 960, "MULTIPLE", 7);
  I.push({ t: "label", x: X(310), y: Y(920), text: "(speaker grille)", size: 9, dim: true });
  lb(557, 990, "LEFT SPEAKER", 6.5); I.push({ t: "vslider", k: "vol", x: X(557) - 11, y: Y(815), w: 22, h: 160, label: "", a: OR });
  box(604, 785, 735, 802, "NOISE GENERATOR");
  I.push({ t: "select", k: "nCol", x: X(612), y: Y(860), w: 46, h: 40, label: "", names: { white: "WHITE", pink: "PINK", low: "LOW FREQ" }, size: 7 }); lb(635, 915, "COLOUR", 7);
  vs(null, 678, 815); jk(727, 888, "NOISE OUT");
  box(862, 785, 1013, 802, "VOLTAGE PROCESSORS"); [818, 865, 915, 965].forEach(function (y, i) { jk(775, y); hs(null, 848, y + 8, i === 3 ? "LAG" : ""); });
  [[1072, 793], [1072, 843], [1120, 815], [1072, 885], [1120, 915], [1120, 963]].forEach(function (p) { jk(p[0], p[1]); });
  box(1195, 785, 1310, 802, "SAMPLE & HOLD"); [793, 887, 940, 988].forEach(function (y) { jk(1163, y); });
  I.push({ t: "vslider", k: null, x: X(1247) - 11, y: Y(815), w: 22, h: 160, label: "LEVEL", a: OR }); I.push({ t: "vslider", k: "shRate", x: X(1297) - 11, y: Y(815), w: 22, h: 160, label: "RATE", a: OR });
  box(1272, 995, 1330, 1030, "INT CLOCK"); [[1372, 808], [1372, 868], [1372, 962]].forEach(function (p) { jk(p[0], p[1]); }); lb(1372, 835, "ELECTRONIC SWITCH", 6);
  lb(1447, 990, "RIGHT SPEAKER", 6.5); I.push({ t: "vslider", k: null, x: X(1447) - 11, y: Y(815), w: 22, h: 160, label: "", a: OR });
  I.push({ t: "label", x: X(1650), y: Y(895), text: "MODEL 2600 SYNTHESIZER", size: 12, bold: true }); I.push({ t: "label", x: X(1650), y: Y(940), text: "(speaker grille)", size: 9, dim: true });
  I.push({ t: "button", x: X(1890), y: Y(818), w: 26, h: 50, label: "" }); lb(1903, 812, "ON", 7); lb(1903, 900, "STANDBY", 7); jk(1907, 972, "PHONES");

  FaithfulPanel.register({ id: "arp2600", name: "ARP 2600", w: 1990, h: 1000, accent: OR, knob: "cap",
    accents: { or: "#f29a2e", led: "#e5372b" },
    colors: { dark: { body: "#151515", line: "#777" }, light: { body: "#f4f4f4", line: "#333" } },
    src: ["Korg ARP 2600 M Owner's Manual, PDF p. 7: whole-panel locator drawing (positions measured from it)", "same manual PDF pp. 6-16: front panel, section by section", "ARP 2600 Owner's Manual (ARP Instruments, 1971): module names and normalled connections"],
    approx: "Positions measured off the 2600 M manual's whole-panel drawing (small, so slider lengths and jack sizes are rounded). The original's grey panel and slider caps are drawn plain. Jacks are drawn but not live: cords are patched from the Simple view. This page's Volume is drawn on the LEFT SPEAKER slider (the real one has a slider per speaker); the preamp, envelope follower, mixer, pan, reverb, voltage processors, VCF fine tune, VCA audio levels and S/H level are drawn but not modelled.",
    items: I });
})();
