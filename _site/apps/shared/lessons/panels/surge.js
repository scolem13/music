// Surge XT's main window (one scene) as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.surge. Every control position is the default skin's own, from github surge-synthesizer/surge
// src/common/SkinModel.cpp (Connector("name", x, y[, w, h]) in a 913 x 569 window; group children add their parent's x, y).
// Slider sizes (horizontal 140 x 22, vertical 20 x 84) are read off the spacing there, not from the skin images; the section
// boxes and their names are this page's (the real ones are part of the background bitmap). Accent: Surge's orange.
(function () {
  var I = [], OR = "or";
  function sec(x, y, w, h, label) { I.push({ t: "section", x: x, y: y, w: w, h: h, label: label, head: 14 }); }
  function hs(k, x, y, label, more) { I.push(Object.assign({ t: "hslider", k: k, x: x, y: y, w: 140, h: 22, label: label, a: OR }, more || {})); }
  function vs(k, x, y, label, more) { I.push(Object.assign({ t: "vslider", k: k, x: x, y: y, w: 20, h: 84, label: label, a: OR }, more || {})); }
  function btn(x, y, w, h, label, more) { I.push(Object.assign({ t: "button", x: x, y: y, w: w, h: h, label: label, size: Math.min(9, h - 3) }, more || {})); }
  // sections (drawn first)
  sec(2, 60, 148, 340, "OSCILLATOR"); sec(152, 60, 146, 340, "SCENE · MIXER"); sec(302, 60, 298, 203, "FILTERS"); sec(602, 60, 152, 125, "SCENE OUTPUT");
  sec(602, 186, 152, 77, "FILTER 2"); sec(302, 265, 452, 135, ""); sec(756, 60, 155, 340, "FX"); sec(2, 402, 909, 72, "MODULATION"); sec(2, 476, 909, 91, "");
  // header: global.active_scene, scene_mode, patch browser, status, fx bypass, character, VU, global volume
  btn(7, 12, 20, 42, "A", { on: true, a: OR }); btn(27, 12, 20, 42, "B");
  btn(54, 12, 40, 42, "Single");
  btn(100, 11, 43, 14, "Split"); btn(100, 41, 43, 14, "Poly 16");
  btn(157, 12, 390, 28, "Init Saw  (patch browser: not modelled)"); btn(157, 42, 85, 12, "‹ category ›"); btn(246, 42, 85, 12, "‹ patch ›"); btn(510, 42, 37, 12, "Save");
  btn(562, 12, 31, 12, "MPE"); btn(562, 27, 31, 12, "Tune"); btn(562, 42, 31, 12, "Zoom");
  btn(607, 12, 135, 27, "FX bypass: off"); btn(607, 42, 135, 12, "Character: Warm");
  I.push({ t: "display", x: 767, y: 15, w: 123, h: 13, draw: function () { return []; } });
  hs("vol", 760, 29, "Global Volume");
  // oscillator: osc.select tabs pick which oscillator the column shows (pages o1 / o2 / o3)
  [1, 2, 3].forEach(function (n) { I.push({ t: "button", go: "o" + n, x: 66 + (n - 1) * 25, y: 69, w: 25, h: 13, label: String(n), size: 9, a: OR }); });
  I.push({ t: "label", x: 8, y: 79, text: "Osc", size: 9, anchor: "start" });
  function oscWave(p) { return function (get, w, h) { var sh = +get(p + "Shape") || 0, wd = (+get(p + "W") || 50) / 100, d = "", n = 140;
    for (var i = 0; i <= n; i++) { var ph = i / n * 2 % 1, saw = 1 - 2 * ph, pu = ph < Math.max(.02, Math.min(.98, wd)) ? 1 : -1, v = sh < 0 ? saw * (1 + sh / 100) + pu * (-sh / 100) : saw;
      d += (i ? "L" : "M") + (4 + i / n * (w - 8)).toFixed(1) + " " + (h / 2 - v * (h / 2 - 10)).toFixed(1); } return [d]; }; }
  [1, 2, 3].forEach(function (n) { var p = "o" + n, on = n < 3, pg = { page: p };
    I.push({ t: "display", x: 4, y: 81, w: 141, h: 99, draw: on ? oscWave(p) : function () { return []; }, a: OR, page: p, label: on ? "" : "Osc 3: not modelled" });
    I.push({ t: "switch", k: n === 2 ? "o2Kbd" : null, x: 3, y: 181, w: 47, h: 10, label: "Keytrack", size: 7, page: p });
    I.push({ t: "switch", k: null, x: 51, y: 181, w: 47, h: 10, label: "Retrigger", size: 7, page: p });
    I.push({ t: "seg", k: on ? p + "Oct" : null, x: 0, y: 194, w: 96, h: 18, opts: [[-3, "-3"], [-2, "-2"], [-1, "-1"], [0, "0"], [1, "1"], [2, "2"], [3, "3"]], size: 8, a: OR, page: p });
    btn(96, 194, 49, 18, "CLASSIC", pg);
    var P0 = [[on ? p + "Pitch" : null, "Pitch"], [on ? p + "Shape" : null, "Shape"], [on ? p + "W" : null, "Width 1"], [null, "Width 2"], [n === 1 ? "o1Sub" : null, "Sub Mix"], [null, "Sync"], [null, "Unison Detune"], ["uni", "Unison Voices"]];
    P0.forEach(function (c, j) { hs(c[0], 6, 212 + j * 22, c[1], pg); });
  });
  // scene: play mode, pitch bend range, drift, noise colour, FM, scene octave / pitch / portamento, keytrack root
  I.push({ t: "select", k: "play", x: 239, y: 87, w: 50, h: 47, label: "", size: 9 });
  I.push({ t: "label", x: 156, y: 120, text: "Bend", size: 8, anchor: "start" });
  I.push({ t: "hslider", k: null, x: 159, y: 110, w: 30, h: 13, label: "", a: OR });
  I.push({ t: "hslider", k: "bend", x: 187, y: 110, w: 30, h: 13, label: "", a: OR, fmt: function (v) { return Math.round(v); } });
  hs(null, 156, 141, "Drift"); hs(null, 156, 162, "Noise Color");
  btn(309, 83, 134, 52, "FM routing: off"); hs(null, 306, 152, "FM Depth");
  I.push({ t: "seg", k: null, x: 202, y: 194, w: 96, h: 18, opts: [[-3, "-3"], [-2, "-2"], [-1, "-1"], [0, "0"], [1, "1"], [2, "2"], [3, "3"]], size: 8 });
  hs(null, 156, 212, "Pitch"); hs("glide", 156, 234, "Portamento");
  btn(311, 266, 43, 14, "C4");
  // mixer (mixer.panel 154, 263): mute / solo / route rows, then level sliders
  [["m1", "O1"], ["m2", "O2"], [null, "O3"], ["r12", "R12"], [null, "R23"], ["n", "N"], [null, "Pre"]].forEach(function (c, j) { var x = 154 + j * 20;
    if (j < 6) { btn(x + 1, 263, 18, 10, "M", { size: 7 }); btn(x + 1, 274, 18, 10, "S", { size: 7 }); btn(x + 1, 285, 18, 10, "1", { size: 7 }); }
    vs(c[0], x, 301, c[1]); });
  // filters
  btn(455, 83, 134, 52, "Serial 1"); hs(null, 457, 152, "Feedback");
  I.push({ t: "select", k: "fType", x: 305, y: 191, w: 124, h: 21, label: "" });
  hs("cut", 306, 212, "Cutoff"); hs("res", 306, 234, "Resonance"); hs(null, 456, 224, "Balance");
  I.push({ t: "select", k: null, x: 605, y: 191, w: 124, h: 21, label: "", text: "Off" });
  hs(null, 600, 212, "Cutoff"); hs(null, 600, 234, "Resonance");
  vs("key", 309, 301, "KT1"); vs(null, 329, 301, "KT2"); vs(null, 353, 301, "HP"); btn(386, 310, 34, 47, "WS"); vs(null, 421, 301, "Drv");
  vs("feg", 549, 301, "F1"); vs(null, 569, 301, "F2");
  // scene output (scene.output.panel 606, 78), FEG (459, 267), AEG (609, 267)
  [[null, "Volume"], [null, "Pan"], [null, "Width"], [null, "Send FX 1"], [null, "Send FX 2"]].forEach(function (c, j) { hs(c[0], 606, 78 + j * 21, c[1]); });
  [["f", 459, "Filter EG"], ["a", 609, "Amp EG"]].forEach(function (e) { var X = e[1];
    I.push({ t: "label", x: X + 4, y: 263, text: e[2], size: 8, anchor: "start", dim: true });
    btn(X + 4, 267, 20, 18, "⌒", { size: 9 }); btn(X + 24, 267, 20, 18, "⌒", { size: 9 }); btn(X + 65, 267, 20, 18, "⌒", { size: 9 }); btn(X + 93, 267, 34, 18, "Digi", { size: 8 });
    ["A", "D", "S", "R"].forEach(function (s, j) { vs(e[0] + s, X + j * 20, 301, s); });
    I.push({ t: "display", x: X + 84, y: 290, w: 60, h: 60, draw: "env:" + e[0] + "A," + e[0] + "D," + e[0] + "S," + e[0] + "R", a: OR });
  });
  vs(null, 699, 301, "Vel"); vs(null, 719, 301, "Gain");
  // FX (fx.selector 760, 74; fx.param.panel 763, 224); this page's three effect mixes stand in the slots' places
  I.push({ t: "display", x: 760, y: 74, w: 139, h: 57, draw: function () { return []; }, label: "A1 A2 B1 B2 S1 S2 G1 G2" });
  hs(null, 763, 141, "FX1 Return"); hs(null, 763, 162, "FX2 Return");
  btn(765, 194, 133, 18, "Chorus · Delay · Reverb"); btn(766, 212, 95, 12, "Default", { size: 8 });
  [["fxCho", "Chorus mix"], ["fxDly", "Delay mix"], ["fxRev", "Reverb mix"], [null, "Time"], [null, "Feedback"], [null, "Low Cut"], [null, "High Cut"], [null, "Width"]].forEach(function (c, j) { I.push({ t: "hslider", k: c[0], x: 763, y: 224 + j * 20, w: 140, h: 20, label: c[1], a: OR }); });
  // modulation sources (controls.modulation.panel 3, 402); the routing sliders stand for Surge's drag-to-route modulation
  ["LFO 1", "LFO 2", "LFO 3", "LFO 4", "LFO 5", "LFO 6", "S-LFO 1", "Filter EG", "Amp EG", "Velocity", "Keytrack", "Mod Wheel"].forEach(function (s, j) { btn(8 + j * 64, 420, 60, 16, s, { size: 8, on: j === 0, a: OR }); });
  hs("lfoPitch", 8, 444, "LFO 1 → Pitch"); hs("lfoCut", 158, 444, "LFO 1 → Cutoff"); hs("lfoW", 308, 444, "LFO 1 → Width 1");
  // LFO (lfo.main.panel 28, 478; trigger 172, 484; shape + display 235, 480, 359 x 84; envelope 616, 493)
  I.push({ t: "label", x: 14, y: 534, text: "LFO 1", size: 10, bold: true, rot: -90 });
  hs("lfoRate", 28, 478, "Rate"); hs(null, 28, 499, "Phase"); hs(null, 28, 520, "Deform"); hs(null, 28, 541, "Amplitude");
  btn(172, 484, 51, 39, "Freerun"); btn(172, 546, 51, 14, "Unipolar");
  I.push({ t: "seg", k: "lfoShape", x: 235, y: 480, w: 100, h: 18, opts: [["sine", "∿"], ["tri", "∧"], ["square", "⊓"], ["saw", "⟋"], ["sh", "S&H"]], size: 9, a: OR });
  I.push({ t: "display", x: 340, y: 480, w: 254, h: 84, draw: "lfo:lfoShape", a: OR });
  ["Delay", "Attack", "Hold", "Decay", "Sustain", "Release"].forEach(function (s, j) { vs(null, 616 + j * 20, 482, s.slice(0, 1)); });
  btn(848, 550, 50, 15, "Menu");

  FaithfulPanel.register({ id: "surge", name: "Surge XT", w: 913, h: 569, page: "o1", accent: OR, knob: "arc", round: 3,
    accents: { or: "#ff9000" },
    colors: { dark: { bg: "#000000", body: "#1e1f21", head: "#2c2e31", line: "#45484c", track: "#4a4d52", screen: "#101112" },
      light: { bg: "#ffffff", body: "#eceef0", head: "#d9dce0", line: "#b3b7bd", track: "#bfc3c8", screen: "#ffffff" } },
    envTime: function (key, v) { return Math.pow(2, v); }, susMax: 100,
    src: ["github surge-synthesizer/surge: src/common/SkinModel.cpp (default skin positions, 913 x 569)"],
    approx: "Control positions from Surge XT's default skin (SkinModel.cpp); section boxes, slider sizes and the drawn waves are this page's. Dimmed controls are drawn but not modelled. The routing sliders under the modulation buttons stand for Surge's drag-to-route modulation, the FX slots show this page's three effect mixes, and Unison Voices is one setting for the scene.",
    items: I });
})();
