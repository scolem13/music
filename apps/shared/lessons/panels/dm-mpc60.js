// The Akai MPC60 (1988) as a FaithfulPanel layout bound to DrumCompare's MPC60-style machine. The v3.1 operator's manual has
// NO panel drawing: what is on the panel comes from its text (LCD with SOFT KEY 1-4 below it, the four grey CURSOR keys toward
// the right, the DATA ENTRY knob, numeric keypad + ENTER, the command keys such as TIMING CORRECT, 16 drum pads, BANK keys:
// pp. 11-13, 21-22, 43-44). Every position and size here is this page's guess.
(function () {
  var I = [];
  I.push({ t: "section", x: 10, y: 10, w: 640, h: 330, label: "", head: 0 });
  I.push({ t: "lcd", k: "disp", x: 30, y: 30, w: 600, h: 120, size: 17 });
  [1, 2, 3, 4].forEach(function (n) { I.push({ t: "key", x: 40 + (n - 1) * 150, y: 165, w: 110, h: 26, label: "SOFT KEY " + n, size: 8 }); });
  I.push({ t: "knob", k: "swing", x: 110, y: 270, r: 34, label: "SWING % (DATA ENTRY)", size: 8, cap: "#d0d0d0" });
  I.push({ t: "select", k: "swingGrid", x: 190, y: 230, w: 70, h: 26, label: "SWING ON", names: { 8: "8ths", 16: "16ths" } });
  I.push({ t: "select", k: "quant", x: 280, y: 230, w: 110, h: 26, label: "TIMING CORRECT" });
  I.push({ t: "select", k: "len", x: 410, y: 230, w: 60, h: 26, label: "STEPS", names: {} });
  I.push({ t: "knob", k: "bpm", x: 560, y: 270, r: 30, label: "TEMPO", size: 8, cap: "#d0d0d0" });
  I.push({ t: "section", x: 10, y: 350, w: 640, h: 230, label: "", head: 0 });
  "1 2 3 4 5 6 7 8 9 0".split(" ").forEach(function (d, i) { I.push({ t: "key", x: 30 + (i % 5) * 62, y: 370 + Math.floor(i / 5) * 50, w: 50, h: 38, label: d, size: 11 }); });
  I.push({ t: "key", x: 350, y: 370, w: 70, h: 88, label: "ENTER", size: 9 });
  [["▲", 520, 370], ["◀", 460, 420], ["▼", 520, 420], ["▶", 580, 420]].forEach(function (c) { I.push({ t: "key", x: c[1], y: c[2], w: 50, h: 38, label: c[0], size: 11 }); });
  I.push({ t: "key", k: "play", v: true, x: 30, y: 500, w: 90, h: 50, label: "PLAY", size: 10, led: true });
  I.push({ t: "key", k: "stop", v: true, x: 130, y: 500, w: 90, h: 50, label: "STOP", size: 10 });
  I.push({ t: "key", x: 230, y: 500, w: 90, h: 50, label: "REC", size: 10, led: true });
  I.push({ t: "key", k: "clear", v: true, x: 330, y: 500, w: 90, h: 50, label: "ERASE", size: 10 });
  I.push({ t: "key", x: 430, y: 500, w: 90, h: 50, label: "MAIN SCREEN", size: 8 });
  // pads 4 x 4 (the page's order of sounds: DrumCompare's MPC voice list)
  var V = DrumCompare.MACHINES.mpc60.voices;
  I.push({ t: "section", x: 660, y: 10, w: 520, h: 570, label: "", head: 0 });
  V.forEach(function (v, i) { var c = i % 4, r = 3 - Math.floor(i / 4), x = 680 + c * 125, y = 30 + r * 125;
    I.push({ t: "key", k: "sel", v: v[0], x: x, y: y, w: 110, h: 105, label: v[1].toUpperCase(), size: 9, cap: null }); });
  I.push({ t: "vslider", x: 1195, y: 30, w: 40, h: 240, label: "NOTE VAR." });
  [["level", "LEVEL"], ["tune", "TUNE"], ["decay", "DECAY"]].forEach(function (p, i) { I.push({ t: "knob", k: "p:sel." + p[0], x: 1215, y: 330 + i * 85, r: 20, label: p[1], size: 8, cap: "#d0d0d0" }); });
  I.push({ t: "label", x: 1215, y: 560, text: "selected pad", size: 7, dim: true });
  // the page's step strip: the MPC60's step edit is a list on the LCD; drawn here as 16 keys for the selected pad
  I.push({ t: "section", x: 10, y: 590, w: 1230, h: 110, label: "", head: 0 });
  I.push({ t: "label", x: 20, y: 610, text: "Step strip (this page's; on the MPC60 step edit is a list on the LCD, p. 21): the selected pad's 16 steps, click = velocity 64, 95, 127, off", size: 9, anchor: "start", dim: true });
  for (var i = 0; i < 16; i++) I.push({ t: "step", k: "step:" + i, i: i, x: 25 + i * 76, y: 625, w: 64, h: 62, label: String(i + 1), size: 10 });
  FaithfulPanel.register({ id: "dm-mpc60", name: "MPC60", w: 1250, h: 710, accent: "grey", knob: "cap", accents: { grey: "#9fb3c8" },
    colors: { light: { body: "#eeeff0", line: "#555" }, dark: { body: "#1b1c1d", line: "#888" } },
    src: ["MPC60 Software v3.1 Operator's Manual pp. 11-13 (LCD, soft keys, cursor keys, data entry, keypad), 18, 21-22 (pads, 16 Levels), 43-44 (timing correct, swing)"],
    approx: "No panel drawing in the manual: the parts come from its text, every position is this page's guess (the real MPC60 has its pads on the right and the LCD top left, as here). Live: the pads (select the sound the step strip edits), the step strip (the page's own), swing % on the data-entry knob, LEVEL / TUNE / DECAY of the selected pad (the page's own knobs: on the MPC60 these are LCD screens, p. 5), swing on, timing correct, steps, tempo, play, stop, erase. Not modelled: soft keys, keypad, cursor keys, rec, main screen, note variation slider.",
    items: I });
})();
