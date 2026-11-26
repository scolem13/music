// The 960 Sequential Controller as a FaithfulPanel layout bound to SequencerCompare's 960-style machine. Positions measured off
// the "Controls" drawing on p. 1 of the Behringer 960 Quick Start Guide (rendered 4000 px wide, cropped; 1 unit = 1 px minus the
// panel's corner): the Behringer is a copy of the Moog 960 layout. Its lower edge (the last row of jacks) is cut in the drawing:
// that row is placed from the visible tops. No Moog 960 drawing was available.
(function () {
  var I = [], X = function (x) { return x - 30; }, Y = function (y) { return y - 178; }, CX = [268, 417, 566, 715, 865, 1014, 1164, 1313];
  I.push({ t: "section", x: 0, y: 0, w: 1670, h: 730, label: "", head: 0 });
  I.push({ t: "label", x: X(865), y: Y(232), text: "SEQUENTIAL CONTROLLER", size: 15, bold: true });
  CX.forEach(function (x, i) {
    I.push({ t: "step", k: "step:" + i, i: i, x: X(x - 13), y: Y(243), w: 26, h: 24, label: "" }); I.push({ t: "label", x: X(x + 30), y: Y(262), text: String(i + 1), size: 11 });
    ["A", "B", "C"].forEach(function (r, j) { I.push({ t: "knob", k: r + ":" + i, x: X(x), y: Y([335, 445, 555][j]), r: 34, label: "", cap: "#f4f4f4", noValue: true }); });
    I.push({ t: "seg", k: "mode:" + i, x: X(x - 62), y: Y(670), w: 124, h: 34, opts: [["s", "SKIP"], ["n", "NORM"], ["t", "STOP"]], size: 8 });
    I.push({ t: "key", x: X(x - 16), y: Y(775), w: 32, h: 30, label: "" }); I.push({ t: "label", x: X(x), y: Y(765), text: "SET", size: 9 });
    I.push({ t: "jack", x: X(x - 35), y: Y(845), r: 13, label: "" }); I.push({ t: "jack", x: X(x + 35), y: Y(845), r: 13, label: "" });
    I.push({ t: "label", x: X(x - 35), y: Y(815), text: "IN", size: 8 }); I.push({ t: "label", x: X(x + 35), y: Y(815), text: "OUT", size: 8 }); });
  I.push({ t: "label", x: X(1463), y: Y(240), text: "OFF", size: 9 }); I.push({ t: "key", x: X(1450), y: Y(246), w: 26, h: 22, label: "" });
  I.push({ t: "knob", x: X(1463), y: Y(690), r: 40, label: "SKIP / STOP", size: 8, cap: "#f4f4f4" }); I.push({ t: "key", x: X(1447), y: Y(775), w: 32, h: 30, label: "" });
  ["A", "B", "C"].forEach(function (r, j) { var y = [335, 455, 600][j];
    I.push({ t: "select", k: "x" + r, x: X(1572), y: Y(y - 14), w: 80, h: 28, label: "", names: { 1: "X1", 2: "X2", 4: "X4" } });
    I.push({ t: "jack", x: X(1425), y: Y(y), r: 15, label: "" }); I.push({ t: "jack", x: X(1500), y: Y(y), r: 15, label: r }); });
  I.push({ t: "key", k: "rowC", x: X(1570), y: Y(712), w: 84, h: 40, label: "OFF   ON", size: 9 }); I.push({ t: "label", x: X(1612), y: Y(775), text: "3RD ROW CONTROL OF TIMING", size: 8 });
  I.push({ t: "label", x: X(1612), y: Y(818), text: "SHIFT", size: 9 }); I.push({ t: "jack", x: X(1575), y: Y(845), r: 13 }); I.push({ t: "jack", x: X(1650), y: Y(845), r: 13 });
  // oscillator
  I.push({ t: "label", x: X(117), y: Y(240), text: "OSCILLATOR ON", size: 9 }); I.push({ t: "key", k: "play", v: true, x: X(104), y: Y(247), w: 26, h: 20, label: "" });
  I.push({ t: "knob", x: X(115), y: Y(378), r: 40, label: "", cap: "#f4f4f4" }); I.push({ t: "label", x: X(117), y: Y(300), text: "FREQUENCY RANGE", size: 9 });
  I.push({ t: "knob", k: "rate", x: X(115), y: Y(518), r: 34, label: "", cap: "#f4f4f4" }); I.push({ t: "label", x: X(117), y: Y(447), text: "FREQUENCY VERNIER", size: 9 });
  I.push({ t: "key", k: "play", v: true, x: X(63), y: Y(600), w: 34, h: 34, label: "" }); I.push({ t: "label", x: X(80), y: Y(590), text: "OSC ON", size: 8 });
  I.push({ t: "key", k: "stop", v: true, x: X(138), y: Y(600), w: 34, h: 34, label: "" }); I.push({ t: "label", x: X(155), y: Y(590), text: "OSC OFF", size: 8 });
  I.push({ t: "jack", x: X(80), y: Y(677), r: 15 }); I.push({ t: "jack", x: X(155), y: Y(677), r: 15 });
  I.push({ t: "jack", x: X(118), y: Y(773), r: 13, label: "" }); I.push({ t: "label", x: X(117), y: Y(745), text: "CONTROL INPUT", size: 8 });
  I.push({ t: "jack", x: X(118), y: Y(845), r: 13, label: "" }); I.push({ t: "label", x: X(117), y: Y(817), text: "OSCILLATOR OUTPUT", size: 8 });
  FaithfulPanel.register({ id: "sq-a960", name: "960 Sequential Controller", w: 1670, h: 730, accent: "amber", knob: "cap", accents: { amber: "#e0a030" },
    colors: { light: { body: "#e6e6e6", line: "#444" }, dark: { body: "#262626", line: "#888" } },
    src: ["Behringer 960 Sequential Controller Quick Start Guide p. 1: Controls drawing (positions measured) and items 1-11", "Synthesizers.com Q960 data sheet pp. 1-5 (the functions)"],
    approx: "Measured off the Behringer drawing (a copy of the Moog layout); the bottom jack row is cut in the drawing and placed by eye. The stage-mode knobs are drawn as three cells you click. Live: the 24 voltage knobs, the X1 / X2 / X4 range knobs, the 8 stage modes, the stage LEDs (click = skip / normal; the running stage lights while playing), 3rd-row timing, frequency vernier (clock rate), OSC ON / OFF (play / stop). Not modelled: frequency range, the 9th stage, SET buttons, jacks, shift.",
    items: I });
})();
