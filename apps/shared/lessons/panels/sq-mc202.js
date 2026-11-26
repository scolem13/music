// The Roland MC-202 MicroComposer (1983) as a FaithfulPanel layout bound to SequencerCompare's MC-202 machine. Positions measured
// off the "Panel Descriptions" drawing, MC-202 Owner's Manual PDF p. 11 (rendered 3000 px, cropped, turned upright; 1 unit = 1 px
// minus the panel's corner). The keyboard's labels: gate keys 0 REST .. 4 TIE on the first five black keys, step-time keys
// (note symbols) under the first white keys, NUMBER keys under the rest (same drawing). Which note symbol is under which white key
// is hard to read in the scan: the page puts its seven step lengths on the first seven, the last two dimmed.
(function () {
  var I = [], X = function (x) { return x - 75; }, Y = function (y) { return y - 360; };
  I.push({ t: "section", x: 0, y: 0, w: 1740, h: 1075, label: "", head: 0 });
  I.push({ t: "section", x: X(110), y: Y(395), w: 1670, h: 305, label: "", head: 0 });
  [["LFO", 183, 305], ["VCO", 305, 632], ["SOURCE MIXER", 632, 960], ["VCF", 960, 1350], ["VCA", 1350, 1440], ["ENV", 1440, 1770]].forEach(function (s) { I.push({ t: "label", x: X((s[1] + s[2]) / 2), y: Y(430), text: s[0], size: 18, bold: true }); });
  [[183, "RATE"], [255, "DELAY"], [355, "MOD"], [425, "RANGE"], [505, "PULSE WIDTH"], [575, "WAVE"], [688, "⊓"], [757, "⩘"], [828, "SUB OSC"], [898, "SUB"], [1015, "FREQ"], [1085, "RES"], [1157, "ENV"], [1227, "MOD"], [1298, "KYBD"], [1397, "ENV/GATE"], [1492, "A"], [1563, "D"], [1635, "S"], [1705, "R"]].forEach(function (s) {
    I.push({ t: "vslider", x: X(s[0] - 20), y: Y(465), w: 40, h: 230, label: s[1] }); });
  I.push({ t: "section", x: X(110), y: Y(735), w: 780, h: 320, label: "", head: 0 });
  I.push({ t: "key", x: X(170), y: Y(810), w: 30, h: 60, label: "" }); I.push({ t: "label", x: X(185), y: Y(765), text: "POWER", size: 9 });
  I.push({ t: "knob", x: X(322), y: Y(840), r: 36, label: "", cap: "#ddd" }); I.push({ t: "label", x: X(322), y: Y(765), text: "TUNE", size: 9 });
  I.push({ t: "knob", x: X(477), y: Y(840), r: 34, label: "", cap: "#ddd" }); I.push({ t: "label", x: X(485), y: Y(765), text: "PORTAMENTO", size: 9 });
  I.push({ t: "knob", k: "bpm", x: X(672), y: Y(840), r: 52, label: "", cap: "#ddd" }); I.push({ t: "label", x: X(672), y: Y(762), text: "TEMPO", size: 9 });
  I.push({ t: "label", x: X(1075), y: Y(800), text: "MC-202", size: 56, bold: true }); I.push({ t: "label", x: X(1075), y: Y(880), text: "MicroComposer", size: 22, bold: true });
  I.push({ t: "lcd", k: "disp", x: X(948), y: Y(962), w: 255, h: 75, size: 15 });
  I.push({ t: "knob", x: X(1430), y: Y(830), r: 50, label: "", cap: "#ddd" }); I.push({ t: "label", x: X(1430), y: Y(755), text: "ACCENT", size: 9 });
  I.push({ t: "knob", x: X(1637), y: Y(830), r: 50, label: "", cap: "#ddd" }); I.push({ t: "label", x: X(1637), y: Y(755), text: "VOLUME", size: 9 });
  function k(x, y, label, more) { I.push(Object.assign({ t: "key", x: X(x - 37), y: Y(y - 22), w: 74, h: 44, label: label, size: 8.5 }, more || {})); }
  k(187, 1003, "SHIFT", { k: "shift", led: true }); k(318, 1003, "DOWN"); k(411, 1003, "NORM"); k(503, 1003, "UP"); I.push({ t: "label", x: X(411), y: Y(1050), text: "TRANSPOSE", size: 8 });
  k(625, 1000, "CHANNEL", { k: "ch", v: true }); k(746, 1000, "PLAY", { k: "play", v: true, led: true }); k(840, 1000, "EDIT");
  k(1313, 995, "TEMPO"); k(1435, 995, "BACK", { k: "back", v: true }); k(1525, 995, "FWD", { k: "fwd", v: true }); I.push({ t: "label", x: X(1480), y: Y(1040), text: "STEP", size: 8 });
  k(1618, 995, "BACK"); k(1710, 995, "FWD"); I.push({ t: "label", x: X(1664), y: Y(1040), text: "MEAS", size: 8 });
  k(187, 1108, "CONT/STOP", { k: "stop", v: true }); k(187, 1220, "START", { k: "play", v: true });
  k(1607, 1095, "BAR"); k(1710, 1095, "ENTER", { k: "add", v: true, aria: "ENTER (add a step)" }); k(1610, 1207, "TAP", { k: "po", led: true, aria: "TAP PORTA" }); k(1712, 1207, "TAP", { k: "acc", led: true, aria: "TAP ACC" });
  I.push({ t: "label", x: X(1610), y: Y(1258), text: "PORTA", size: 8 }); I.push({ t: "label", x: X(1712), y: Y(1258), text: "ACC", size: 8 });
  // keyboard: 19 white keys from C
  I.push({ t: "section", x: X(250), y: Y(1065), w: 1295, h: 250, label: "", head: 0 });
  var WS = [0, 2, 4, 5, 7, 9, 11], ST = ["𝅝", "𝅗𝅥", "♩", "♪", "𝅘𝅥𝅯", "♩3", "♪3", "", ""], NUM = ["", "", "", "", "", "", "", "", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], ww = 66.3, x0 = 270;
  for (var i = 0; i < 19; i++) { var s = 12 * Math.floor(i / 7) + WS[i % 7];
    I.push({ t: "key", k: "kb", v: s, x: X(x0 + i * ww), y: Y(1095), w: ww - 3, h: 190, label: "", cap: "#f2f2f2", aria: "key " + (i + 1) });
    I.push({ t: "label", x: X(x0 + i * ww + ww / 2), y: Y(1305), text: ST[i] || NUM[i], size: 11 }); }
  var nb = 0; for (i = 0; i < 18; i++) { if ([2, 6].indexOf(i % 7) >= 0) continue; var sb = 12 * Math.floor(i / 7) + WS[i % 7] + 1;
    I.push({ t: "key", k: "kb", v: sb, x: X(x0 + (i + 0.68) * ww), y: Y(1095), w: ww * 0.62, h: 110, label: "", cap: "#1c1c1c", aria: "black key " + (nb + 1) });
    if (nb < 5) I.push({ t: "label", x: X(x0 + (i + 1) * ww), y: Y(1088), text: ["0 REST", "1 STACC", "2 NON LEG", "3 LEGATO", "4 TIE"][nb], size: 8 }); nb++; }
  FaithfulPanel.register({ id: "sq-mc202", name: "MC-202", w: 1740, h: 1075, accent: "blue", knob: "cap", accents: { blue: "#5aa0d8" },
    colors: { light: { body: "#ededed", line: "#555" }, dark: { body: "#1d1d1d", line: "#888" } },
    src: ["Roland MC-202 Owner's Manual PDF p. 11: Panel Descriptions drawing (positions measured)", "same manual pp. 15-19, 29-31 (step / gate time, rest, accent, portamento)"],
    approx: "Measured off the manual's panel drawing; key sizes rounded; which step symbol sits under which white key is the page's reading of a poor scan. Live: tempo, CHANNEL, PLAY / START, CONT/STOP, STEP BACK / FWD (the step being edited), ENTER (adds a step), TAP PORTA / TAP ACC (portamento / accent of that step), SHIFT, and the keyboard (pitch of that step; with SHIFT lit, the first seven white keys set its step time and the first five black keys its gate: REST, STACC, NON LEG, LEGATO, TIE, lengths the page's own). Not modelled: the synth section (one shared voice), transpose, edit, tempo key, measure keys, bar, accent and volume knobs.",
    items: I });
})();
