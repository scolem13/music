// The Minimoog Voyager Old School front panel as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.voyager. Positions measured from the panel drawing in the Voyager Old School User's Manual
// ("Overview and Features", printed p. 8 = PDF p. 6, the drawing rotated on the page): rendered, turned upright and read in
// pixels of a 2000 px-wide view (panel x 85-1915, y 25-585), scaled by S. Section boxes and every control centre from it.
(function () {
  var S = 0.68, X0 = 85, Y0 = 25, I = [], A = "vo";
  function x(v) { return (v - X0) * S; } function y(v) { return (v - Y0) * S; }
  function sec(x0, x1, label, y0, y1, more) { I.push(Object.assign({ t: "section", x: x(x0), y: y(y0 || 25), w: (x1 - x0) * S, h: ((y1 || 585) - (y0 || 25)) * S, label: label, head: 15 }, more || {})); }
  function k(key, cx, cy, label, r) { I.push({ t: "knob", k: key, x: x(cx), y: y(cy), r: (r || 28) * S, label: label, size: 8, cap: "#d9d9d9" }); }
  function rocker(key, cx, cy, top, bot) { I.push({ t: "switch", k: key, x: x(cx) - 14 * S, y: y(cy) - 34 * S, w: 28 * S, h: 68 * S, label: "", a: A });
    I.push({ t: "label", x: x(cx) + 16 * S + 6, y: y(cy) - 18 * S, text: top, size: 6.5, anchor: "start", dim: true }, { t: "label", x: x(cx) + 16 * S + 6, y: y(cy) + 26 * S, text: bot, size: 6.5, anchor: "start", dim: true }); }
  function lab(t, cx, cy, size, more) { I.push(Object.assign({ t: "label", x: x(cx), y: y(cy), text: t, size: size || 8 }, more || {})); }
  // sections (p. 8)
  sec(85, 270, "LFO"); sec(272, 582, "MODULATION BUSSES"); sec(582, 1012, "OSCILLATORS"); sec(1012, 1247, "MIXER"); sec(1247, 1430, "FILTERS");
  sec(1430, 1725, "ENVELOPES"); sec(1725, 1915, "OUTPUT");
  I.push({ t: "section", x: x(427), y: y(45), w: 0.6, h: 540 * S, head: 0 }, { t: "section", x: x(732), y: y(45), w: 0.6, h: 415 * S, head: 0 }, { t: "section", x: x(870), y: y(45), w: 0.6, h: 415 * S, head: 0 },
    { t: "section", x: x(1578), y: y(45), w: 0.6, h: 435 * S, head: 0 }, { t: "section", x: x(95), y: y(325), w: 165 * S, h: 0.6, head: 0 }, { t: "section", x: x(596), y: y(462), w: 408 * S, h: 0.6, head: 0 });
  lab("MOD BUS 1", 310, 58, 7, { bold: true }); lab("MOD BUS 2", 470, 58, 7, { bold: true }); lab("1", 592, 58, 8, { bold: true }); lab("2", 742, 58, 8, { bold: true }); lab("3", 880, 58, 8, { bold: true });
  lab("FILTER", 1555, 58, 7, { bold: true }); lab("VOLUME", 1695, 58, 7, { bold: true });
  // LFO
  k("lfoRate", 180, 128, "RATE", 40); k(null, 180, 265, "WAVE", 36); k(null, 180, 400, "FINE TUNE"); k("glide", 180, 525, "GLIDE RATE");
  // modulation busses: bus 1 is this page's one bus
  I.push({ t: "select", k: "modSrc", x: x(350) - 44, y: y(130) - 10, w: 88, h: 20, label: "SOURCE", size: 8, names: { tri: "LFO tri", square: "LFO square", sh: "S&H", osc3: "OSC 3", noise: "NOISE", fenv: "FILT. ENV" } });
  I.push({ t: "select", k: "modDst", x: x(350) - 44, y: y(268) - 10, w: 88, h: 20, label: "DESTINATION", size: 8, names: { pitch: "PITCH", osc2: "OSC 2", filter: "FILTER", wave: "WAVE" } });
  k(null, 350, 400, "CONTROLLER", 36); k("modAmt", 350, 525, "AMOUNT");
  k(null, 505, 130, "SOURCE", 36); k(null, 505, 268, "DESTINATION", 36); k(null, 505, 400, "CONTROLLER", 36); k(null, 505, 525, "AMOUNT");
  // oscillators
  [[1, 663], [2, 800], [3, 940]].forEach(function (o) { var p = "o" + o[0], X = o[1];
    if (o[0] > 1) k(p + "Freq", X, 130, "FREQUENCY", 36);
    I.push({ t: "select", k: p + "Oct", x: x(X) - 30, y: y(268) - 10, w: 60, h: 20, label: "OCTAVE", size: 9 });
    k(p + "Wave", X, 405, "WAVE"); });
  lab("1–2 SYNC", 662, 478, 7.5); lab("3–1 FM", 740, 478, 7.5); lab("3 KB CONT", 865, 478, 7.5); lab("3 FREQ", 940, 478, 7.5);
  rocker("sync", 662, 530, "ON", "OFF"); rocker("linFm", 740, 530, "ON", "OFF"); rocker("o3Kbd", 865, 530, "OFF", "ON"); rocker(null, 940, 530, "LO", "HI");
  // mixer: level knob + on/off rocker per source
  [["ext", 135, "EXTERNAL"], ["m1", 232, "OSCILLATOR 1"], ["m2", 330, "OSCILLATOR 2"], ["m3", 430, "OSCILLATOR 3"], ["mN", 528, "NOISE"]].forEach(function (m) {
    k(m[0], 1088, m[1], ""); I.push({ t: "button", x: x(1148), y: y(m[1]) - 15 * S, w: 70 * S, h: 30 * S, label: "OFF  ON", size: 6.5 });
    lab(m[2], 1240, m[1] - 42, 7, { anchor: "end", bold: true }); });
  // filters
  k("cutoff", 1338, 135, "CUTOFF", 42); k("space", 1338, 238, "SPACING"); k("res", 1338, 335, "RESONANCE"); k("kbd", 1338, 432, "KB. CONT. AMOUNT");
  I.push({ t: "seg", k: "mode", x: x(1300), y: y(515), w: 76 * S, h: 30 * S, opts: [["dual", "DUAL"], ["hplp", "HP/LP"]], size: 7, a: A }); lab("MODE", 1400, 495, 7, { bold: true });
  // envelopes
  [["A", 135, "ATTACK"], ["D", 233, "DECAY"], ["S", 330, "SUSTAIN"], ["R", 430, "RELEASE"]].forEach(function (e) { k("f" + e[0], 1507, e[1], e[2]); k("a" + e[0], 1648, e[1], e[2]); });
  k("fAmt", 1507, 530, "AMOUNT TO FILTER");
  I.push({ t: "button", x: x(1613), y: y(515), w: 72 * S, h: 30 * S, label: "KBD  ON/EXT", size: 6 }); lab("ENV. GATE", 1650, 495, 7, { bold: true });
  // output
  k("vol", 1820, 140, "MASTER VOLUME", 42); k(null, 1820, 330, "HEADPHONE VOLUME"); I.push({ t: "jack", x: x(1820), y: y(530), r: 14 * S, label: "HEADPHONES", size: 7 });
  // the left-hand panel under the main panel (Glide on / off is there on the instrument)
  I.push({ t: "section", x: x(85), y: y(600), w: 300 * S, h: 70 * S, head: 0, label: "" });
  I.push({ t: "switch", k: "glideOn", x: x(110), y: y(615), w: 110 * S, h: 38 * S, label: "GLIDE", size: 8, a: A });
  I.push({ t: "keys", x: x(400), y: y(600), w: 1515 * S, h: 70 * S, n: 30 });

  FaithfulPanel.register({ id: "voyager", name: "Voyager Old School", w: 1830 * S, h: 650 * S, accent: A, knob: "cap", round: 3,
    accents: { vo: "#7fb2d8" },
    colors: { dark: { body: "#2b2c2e", head: "#3a3b3e", line: "#6a6c70" }, light: { body: "#e9eaec", head: "#d4d6d9", line: "#8d9096" } },
    src: ["Minimoog Voyager Old School User's Manual, printed p. 8 (PDF p. 6): front panel drawing", "pp. 13-27: the controls"],
    approx: "Positions measured from the panel drawing on p. 8 (no dimensions printed; sizes measured from it). Mod Bus 1 stands for this page's one modulation bus (its controller knob and all of Mod Bus 2 are not modelled); the source and destination selectors are drawn as menus, the octave selectors as menus. Guessed: the panel and knob colours (the drawing is grey), the light-blue accent, the Glide switch's place (on the left-hand panel of the instrument). Not modelled (dimmed): LFO wave, fine tune, the mixer's on / off rockers, 3 FREQ LO / HI, env gate, headphone volume.",
    items: I });
})();
