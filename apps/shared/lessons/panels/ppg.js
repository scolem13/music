// The PPG Wave 2.2 / 2.3 as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.ppg.
// NOT MEASURED: the only PPG documents here are the Wave 2.2 and 2.3 SERVICE manuals, and neither has a front-panel drawing.
// What they do say is used: an analog panel board of potentiometers read by an A/D converter, each 0-63 (Wave 2.3 service
// manual PDF p. 5; Wave 2.2 PDF p. 2), master volume and "Basis" pots outside it (2.3 p. 4), and a digital panel with an LC
// display and "Numerical" and "Display Select" keypads (2.3 p. 5). The arrangement of knobs into rows, their order and
// every size is this page's own, grouped as the profile's knob groups.
(function () {
  var I = [], A = "ppg";
  function k(key, x, y, label) { I.push({ t: "knob", k: key, x: x, y: y, r: 15, label: label, size: 8, cap: "#d7d7d7" }); }
  I.push({ t: "section", x: 10, y: 10, w: 620, h: 300, label: "ANALOG PANEL (0-63 each)", head: 18 });
  I.push({ t: "section", x: 640, y: 10, w: 400, h: 300, label: "DIGITAL PANEL", head: 18 });
  I.push({ t: "label", x: 20, y: 46, text: "ENVELOPE 1", size: 8, anchor: "start", bold: true }, { t: "label", x: 330, y: 46, text: "ENVELOPE 2 (VCA)", size: 8, anchor: "start", bold: true });
  [["e1A", "ATTACK"], ["e1D", "DECAY"], ["e1S", "SUSTAIN"], ["e1R", "RELEASE"]].forEach(function (c, i) { k(c[0], 50 + i * 70, 75, c[1]); });
  [["e2A", "ATTACK"], ["e2D", "DECAY"], ["e2S", "SUSTAIN"], ["e2R", "RELEASE"]].forEach(function (c, i) { k(c[0], 360 + i * 70, 75, c[1]); });
  I.push({ t: "label", x: 20, y: 136, text: "WAVES", size: 8, anchor: "start", bold: true }, { t: "label", x: 330, y: 136, text: "FILTER", size: 8, anchor: "start", bold: true });
  [["waveA", "WAVE A"], ["waveB", "WAVE B"], ["envWave", "ENV 1 → WAVE"], ["lfoWave", "LFO → WAVE"]].forEach(function (c, i) { k(c[0], 50 + i * 70, 165, c[1]); });
  [["cutoff", "CUTOFF"], ["emph", "EMPHASIS"], ["envF", "ENV 1 → VCF"], ["kbdF", "KEYBOARD"]].forEach(function (c, i) { k(c[0], 360 + i * 70, 165, c[1]); });
  I.push({ t: "label", x: 20, y: 226, text: "LFO", size: 8, anchor: "start", bold: true }, { t: "label", x: 330, y: 226, text: "OSC B AND OUTPUT", size: 8, anchor: "start", bold: true });
  k("lfoRate", 50, 255, "RATE"); k("lfoDelay", 120, 255, "DELAY");
  I.push({ t: "select", k: "lfoShape", x: 165, y: 245, w: 60, h: 20, label: "SHAPE", size: 8, names: { tri: "tri", saw: "saw", square: "square", random: "random" } });
  k("lfoPitch", 260, 255, "LFO → PITCH");
  [["semiB", "SEMITONES"], ["detB", "DETUNE"], ["mixB", "B LEVEL"], ["vol", "VOLUME"]].forEach(function (c, i) { k(c[0], 360 + i * 70, 255, c[1]); });
  // digital panel: the LC display shows the wavetable picked; keypads drawn, not modelled
  I.push({ t: "display", x: 660, y: 40, w: 360, h: 50, draw: function () { return []; }, label: "LC DISPLAY" });
  I.push({ t: "select", k: "table", x: 760, y: 98, w: 160, h: 22, label: "WAVETABLE", size: 9 });
  I.push({ t: "label", x: 740, y: 140, text: "DISPLAY SELECT", size: 7.5, bold: true }, { t: "label", x: 930, y: 140, text: "NUMERICAL", size: 7.5, bold: true });
  for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) {
    I.push({ t: "button", x: 690 + c * 34, y: 150 + r * 36, w: 28, h: 26, label: "", size: 7 });
    I.push({ t: "button", x: 880 + c * 34, y: 150 + r * 36, w: 28, h: 26, label: ["7", "8", "9", "4", "5", "6", "1", "2", "3", "", "0", ""][r * 3 + c], size: 8 }); }
  I.push({ t: "keys", x: 10, y: 320, w: 1030, h: 60, n: 35 });

  FaithfulPanel.register({ id: "ppg", name: "PPG Wave (this page's layout)", w: 1050, h: 390, accent: A, knob: "cap", round: 3,
    accents: { ppg: "#2f86d6" },
    colors: { dark: { body: "#15171a", head: "#1f3a5a", line: "#4f5a66" }, light: { body: "#f4f6f8", head: "#cfe0f1", line: "#9aa8b6" } },
    src: ["PPG Wave 2.3 Service Manual, PDF pp. 4-5: analog panel pots (0-63), digital panel with LC display and Numerical / Display Select keypads", "PPG Wave 2.2 Service Manual, PDF p. 2"],
    approx: "NOT the real layout: no front-panel drawing was found in either PPG manual (both are service manuals). The two panels (analog pots, digital LCD + keypads) are from the service manuals' text; the rows, order, sizes, labels and colours are this page's own. The wavetable menu stands for choosing a table on the LCD. The keypads are not modelled.",
    items: I });
})();
