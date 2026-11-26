// The Roland Juno-60 (1982) as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.juno.
// Section order, widths and slider / switch positions measured off the fold-out panel drawing in the Juno-60 Owner's Manual (Roland),
// PDF page 5 (drawn sideways there), at half that drawing's scale (about 1560 units for the panel); the controller block (bender,
// volume, LFO trigger, octave transpose) sits left of the keys as in the same drawing. The Juno-106's extras (portamento, the
// Model switch of this page's profile) have no place on a Juno-60 and get a box of their own. Slider caps and heading strips plain.
(function () {
  var I = [], OR = "or", TOP = 0, SY = 46, SH = 100;
  function sec(x, w, label) { I.push({ t: "section", x: x, y: TOP, w: w, h: 168, label: label, head: 22 }); }
  function vs(k, x, label, more) { I.push(Object.assign({ t: "vslider", k: k, x: x - 10, y: SY, w: 20, h: SH, label: "", a: OR }, more || {}));
    if (label) I.push({ t: "label", x: x, y: SY - 4, text: label, size: 7.5, bold: true }); }
  function sw(k, x, y, label) { I.push({ t: "switch", k: k, x: x - 12, y: y, w: 24, h: 24, label: "", a: "led" }); if (label) I.push({ t: "label", x: x, y: y - 5, text: label, size: 8, bold: true }); }
  function sel(k, x, y, w, h, label, names) { I.push({ t: "select", k: k, x: x - w / 2, y: y, w: w, h: h, label: "", names: names, size: 8 }); if (label) I.push({ t: "label", x: x, y: y + h + 10, text: label, size: 7, dim: true }); }
  function btn(x, y, w, h, label) { I.push({ t: "button", x: x - w / 2, y: y, w: w, h: h, label: "" }); if (label) I.push({ t: "label", x: x, y: y - 5, text: label, size: 7.5, bold: true }); }
  sec(0, 82, "POWER"); I.push({ t: "button", x: 30, y: 70, w: 22, h: 40, label: "" }); I.push({ t: "label", x: 41, y: 128, text: "ON / OFF", size: 7, dim: true });
  sec(82, 93, "TR · HOLD"); btn(108, 85, 24, 24, "TRANSP."); btn(150, 85, 24, 24, "HOLD");
  sec(175, 153, "ARPEGGIO"); btn(195, 85, 24, 24, "ON/OFF"); sel(null, 237, 72, 18, 46, "MODE"); sel(null, 270, 72, 18, 46, "RANGE"); vs(null, 304, "RATE");
  sec(328, 102, "LFO"); vs("lfoRate", 347, "RATE"); vs("lfoDelay", 375, "DELAY"); sel(null, 408, 75, 22, 36, "TRIG MODE");
  sec(430, 253, "DCO"); vs("dLfo", 452, "LFO"); vs("pwm", 478, "PWM");
  sel("pwmMode", 508, 70, 26, 46, "", { lfo: "LFO", man: "MAN", env: "ENV" }); I.push({ t: "label", x: 508, y: 130, text: "PWM MODE", size: 7, dim: true });
  sw("pulse", 543, 85, "⊓"); sw("saw", 570, 85, "⩘"); sw("sub", 597, 85, "SUB");
  vs("subLvl", 635, "SUB"); vs("noise", 662, "NOISE");
  sec(683, 47, "HPF"); vs("hpf", 707, "FREQ", { fmt: function (v) { return String(Math.round(v)); } });
  sec(730, 185, "VCF"); vs("cutoff", 755, "FREQ"); vs("res", 779, "RES");
  sel("envPol", 808, 75, 20, 40, "", { "+": "⊿+", "-": "⊿−" }); I.push({ t: "label", x: 808, y: 130, text: "ENV ±", size: 7, dim: true });
  vs("env", 835, "ENV"); vs("fLfo", 860, "LFO"); vs("kybd", 885, "KYBD");
  sec(915, 78, "VCA"); sel("vcaMode", 935, 75, 22, 40, "", { env: "ENV", gate: "GATE" }); I.push({ t: "label", x: 935, y: 130, text: "MODE", size: 7, dim: true }); vs("vcaLvl", 966, "LEVEL");
  sec(993, 117, "ENV"); vs("a", 1014, "A"); vs("d", 1037, "D"); vs("s", 1061, "S"); vs("r", 1084, "R");
  sec(1110, 105, "CHORUS"); I.push({ t: "seg", k: "chorus", x: 1122, y: 80, w: 82, h: 26, opts: [["off", "OFF"], ["I", "I"], ["II", "II"]], size: 9, a: "led" });
  sec(1215, 345, "MEMORY"); I.push({ t: "display", x: 1230, y: 60, w: 54, h: 34, draw: function () { return []; }, label: "BANK PATCH" });
  ["MAN", "1", "2", "3", "4"].forEach(function (s, i) { btn(1310 + i * 26, 70, 24, 24, s); }); ["SAVE", "VERIFY", "LOAD"].forEach(function (s, i) { btn(1460 + i * 28, 70, 26, 24, s); });
  for (var i = 0; i < 8; i++) btn(1238 + i * 26, 118, 24, 24, String(i + 1)); I.push({ t: "label", x: 1330, y: 110, text: "PATCH NUMBER", size: 7, dim: true });
  btn(1465, 118, 24, 24, "MANUAL"); btn(1510, 118, 24, 24, "WRITE");
  // controller block left of the keys, and the keyboard
  I.push({ t: "section", x: 0, y: 180, w: 175, h: 150, label: "", head: 0 });
  I.push({ t: "vslider", k: null, x: 40, y: 218, w: 18, h: 90, label: "", a: OR });
  I.push({ t: "label", x: 25, y: 210, text: "DCO", size: 7, bold: true }); I.push({ t: "label", x: 49, y: 210, text: "VCF", size: 7, bold: true }); I.push({ t: "vslider", k: null, x: 16, y: 218, w: 18, h: 90, label: "", a: OR });
  I.push({ t: "knob", k: null, x: 112, y: 210, r: 12, label: "VOLUME", size: 7, cap: "#ddd" });
  btn(100, 262, 40, 16, "LFO TRIG");
  sel("range", 145, 254, 26, 40, "", { "16'": "−1", "8'": "0", "4'": "+1" }); I.push({ t: "label", x: 145, y: 248, text: "OCTAVE", size: 7, bold: true }); I.push({ t: "label", x: 145, y: 306, text: "TRANSPOSE", size: 7, dim: true });
  I.push({ t: "button", x: 70, y: 304, w: 50, h: 16, label: "BENDER" });
  I.push({ t: "keys", x: 185, y: 180, w: 1180, h: 150, n: 36 });
  I.push({ t: "section", x: 1375, y: 180, w: 185, h: 150, label: "JUNO-106 ONLY", head: 18 });
  sel("model", 1420, 210, 50, 22, "MODEL", { "60": "Juno-60", "106": "Juno-106" });
  I.push({ t: "knob", k: "porta", x: 1510, y: 232, r: 14, label: "PORTAMENTO", size: 7, cap: "#ddd" });
  I.push({ t: "label", x: 1467, y: 318, text: "(not on a Juno-60's panel)", size: 7, dim: true });

  FaithfulPanel.register({ id: "juno", name: "Juno-60", w: 1560, h: 335, accent: OR, knob: "cap",
    accents: { or: "#ef7d22", led: "#e5322b" },
    src: ["Roland Juno-60 Owner's Manual, PDF p. 5: fold-out panel drawing with every control named (positions measured from it)", "same manual pp. 12-22: the controls one by one"],
    approx: "Positions measured off the manual's panel drawing at half its scale; slider lengths, button sizes and the controller block's inside are this page's guesses (the drawing is small there). The Juno-60 has no DCO range switch: this page's Range is bound to the OCTAVE TRANSPOSE switch by the bender, which shifts the keyboard an octave the same way. Arpeggio, memory, transpose / hold, the bender and the volume knob are drawn but not modelled.",
    items: I });
})();
