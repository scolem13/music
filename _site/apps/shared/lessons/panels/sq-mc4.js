// The Roland MC-4 MicroComposer (1981) as a FaithfulPanel layout bound to SequencerCompare's MC-4 machine. The owner's manual
// scan has only small hook-up drawings of the MC-4 (Diagram 1A-1, PDF p. 7; Appendix B, p. 86): from them come the long low
// panel, the LED read-out at the left and the calculator keypad. Every position, and the order of the keys around the keypad,
// is this page's guess; the key names are the manual's (pp. 9-16: the numeric keys, ENTER, CV-1 / CV-2 / STEP TIME / GATE TIME
// memories, channels 1-4, TIME BASE, TEMPO, START / STOP).
(function () {
  var I = [];
  I.push({ t: "section", x: 0, y: 0, w: 1400, h: 420, label: "", head: 0 });
  I.push({ t: "label", x: 30, y: 40, text: "MC-4 MicroComposer", size: 22, bold: true, anchor: "start" });
  I.push({ t: "lcd", k: "disp", x: 30, y: 70, w: 420, h: 90, size: 26, seg: true });
  I.push({ t: "knob", k: "bpm", x: 90, y: 270, r: 40, label: "TEMPO", size: 10, cap: "#ddd" });
  I.push({ t: "select", k: "tb", x: 170, y: 250, w: 110, h: 30, label: "TIME BASE", names: { 120: "TB 120", 96: "TB 96", 48: "TB 48", 24: "TB 24" } });
  I.push({ t: "select", k: "cv2", x: 300, y: 250, w: 140, h: 30, label: "CV-2 PATCHED TO", names: { cut: "VCF", vel: "VCA" } });
  I.push({ t: "key", k: "play", v: true, x: 170, y: 320, w: 110, h: 50, label: "START", size: 10, led: true }); I.push({ t: "key", k: "stop", v: true, x: 300, y: 320, w: 110, h: 50, label: "STOP", size: 10 });
  I.push({ t: "section", x: 480, y: 20, w: 420, h: 380, label: "CALCULATOR KEYBOARD", title: "top", size: 11 });
  ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0"].forEach(function (d, i) { I.push({ t: "key", k: "kp", v: d, x: 510 + (i % 3) * 90, y: 60 + Math.floor(i / 3) * 80, w: 76, h: 64, label: d, size: 20 }); });
  I.push({ t: "key", k: "kp", v: "←", x: 600, y: 300, w: 76, h: 64, label: "CLEAR", size: 10 });
  I.push({ t: "key", k: "kp", v: "ENTER", x: 780, y: 60, w: 100, h: 304, label: "ENTER", size: 12 });
  I.push({ t: "section", x: 920, y: 20, w: 460, h: 380, label: "", head: 0 });
  I.push({ t: "label", x: 940, y: 50, text: "MEMORY (SHIFT 1-4)", size: 10, anchor: "start" });
  ["CV-1", "CV-2", "STEP TIME", "GATE TIME"].forEach(function (n, i) { I.push({ t: "key", k: "col", v: i, x: 940 + i * 108, y: 60, w: 98, h: 50, label: n, size: 10, led: true }); });
  I.push({ t: "label", x: 940, y: 150, text: "CHANNEL", size: 10, anchor: "start" });
  [0, 1, 2, 3].forEach(function (c) { I.push({ t: "key", k: "ch", v: c, x: 940 + c * 108, y: 160, w: 98, h: 50, label: "CH-" + (c + 1), size: 11, led: true }); });
  I.push({ t: "key", k: "back", v: true, x: 940, y: 250, w: 98, h: 50, label: "◀ STEP", size: 10 }); I.push({ t: "key", k: "fwd", v: true, x: 1048, y: 250, w: 98, h: 50, label: "STEP ▶", size: 10 });
  I.push({ t: "key", k: "add", v: true, x: 1156, y: 250, w: 98, h: 50, label: "INSERT", size: 10 }); I.push({ t: "key", x: 1264, y: 250, w: 98, h: 50, label: "DELETE", size: 10 });
  [["MEASURE END", 940], ["TRANSPOSE", 1048], ["SYNC", 1156], ["CASSETTE", 1264]].forEach(function (b) { I.push({ t: "key", x: b[1], y: 330, w: 98, h: 50, label: b[0], size: 8.5 }); });
  FaithfulPanel.register({ id: "sq-mc4", name: "MC-4", w: 1400, h: 420, accent: "green", knob: "cap", accents: { green: "#8fbf6a" },
    colors: { light: { body: "#efefef", line: "#555" }, dark: { body: "#1d1d1d", line: "#888" } },
    src: ["Roland MC-4 Owner's Manual PDF pp. 7, 86 (hook-up drawings showing the MC-4's panel, too small to measure)", "same manual pp. 9-16, 30 (keys, memories, channels, time base)"],
    approx: "Largely guessed: the manual's drawings of the MC-4 are too small to measure, so this is a plan of its parts (read-out, calculator keys, memory and channel keys), not its real layout. Live: tempo, time base, CV-2 patch, start / stop, the keypad with CLEAR and ENTER (types into the selected memory of the current step), the four memory keys, CH-1..4, step back / forward, insert (adds a step). Not modelled: delete, measure end, transpose, sync, cassette.",
    items: I });
})();
