// The Elektron Digitakt II as a FaithfulPanel layout bound to SequencerCompare's Elektron-style machine. Positions measured off
// the "3.1 Front panel" drawing, Digitakt II User Manual p. 12 (rendered 3000 px wide, cropped; 1 unit = 1 px minus the panel's
// corner). The drawing's lower edge (the second row of trig keys and the PTN / SONG keys) was read from the same page at a
// smaller size: those positions are approximate. No logo artwork: the name is plain text.
(function () {
  var I = [], X = function (x) { return x - 215; }, Y = function (y) { return y - 570; };
  I.push({ t: "section", x: 0, y: 0, w: 1685, h: 1290, label: "", head: 0, });
  [["Out", 487], ["In", 718], ["MIDI In", 920], ["MIDI Out", 1076], ["MIDI Thru", 1233], ["USB", 1405], ["DC In", 1554], ["Power", 1726]].forEach(function (j) { I.push({ t: "label", x: X(j[1]), y: Y(605), text: j[0], size: 18, dim: true }); });
  I.push({ t: "knob", x: X(351), y: Y(823), r: 48, label: "Main Volume", size: 18, cap: "#c8c8c8" });
  I.push({ t: "knob", x: X(351), y: Y(1019), r: 48, label: "Level/Data", size: 18, cap: "#c8c8c8" });
  I.push({ t: "section", x: X(459), y: Y(742), w: 576, h: 397, label: "", head: 0 });
  I.push({ t: "lcd", k: "disp", x: X(508), y: Y(792), w: 478, h: 262, size: 22 }); I.push({ t: "label", x: X(508), y: Y(1110), text: "Digitakt II", size: 34, bold: true, anchor: "start" });
  I.push({ t: "section", x: X(1083), y: Y(768), w: 740, h: 343, label: "", head: 0 });
  var KN = [["A", "lk:note", "NOTE"], ["B", "lk:vel", "VEL"], ["C", "lk:len", "LEN"], ["D", "lk:prob", "PROB"], ["E", "lk:cut", "FILTER"], ["F", "lk:micro", "µTIME"], ["G", "speed", "SPEED"], ["H", "swing", "SWING"]];
  KN.forEach(function (n, i) { I.push({ t: "knob", k: n[1], x: X([1143, 1349, 1555, 1762][i % 4]), y: Y(i < 4 ? 823 : 1019), r: 48, label: n[0] + " · " + n[2], size: 17, cap: "#c8c8c8" }); });
  I.push({ t: "section", x: X(1083), y: Y(1143), w: 740, h: 125, label: "", head: 0 });
  [["TRIG", "Quantize"], ["SRC", "Machine"], ["FLTR", "Setup"], ["AMP", "Sequencer"], ["FX", "Send FX"], ["MOD", "Mixer"]].forEach(function (p, i) { var x = [1139, 1264, 1390, 1515, 1640, 1766][i];
    I.push({ t: "key", x: X(x - 44), y: Y(1150), w: 88, h: 84, label: p[0], size: 20, on: i === 0 }); I.push({ t: "label", x: X(x), y: Y(1262), text: p[1], size: 17, dim: true }); });
  function k(x, y, label, sub, more, w) { I.push(Object.assign({ t: "key", x: X(x - (w || 88) / 2), y: Y(y - 42), w: w || 88, h: 84, label: label, size: 22 }, more || {})); if (sub) I.push({ t: "label", x: X(x), y: Y(y + 62), text: sub, size: 17, dim: true }); }
  k(370, 1274, "FUNC", "", null, 138); k(557, 1274, "♫", "Perform"); k(684, 1274, "⚙", "Save Proj"); k(811, 1274, "|||", "Samples"); k(938, 1274, "◔", "Tap Tempo");
  k(370, 1400, "▦", "KB Setup"); k(582, 1400, "○", "Copy", null, 138); k(748, 1400, "▷", "Clear", { k: "play", v: true }, 138); k(913, 1400, "□", "Paste", { k: "stop", v: true }, 138);
  k(1139, 1337, "YES", "Save"); k(1139, 1462, "NO", "Reload", { k: "deselect", v: true });
  k(1390, 1337, "∧", "Trig Mode"); k(1262, 1462, "<", "µTime−", { k: "micro-", v: true }); k(1390, 1462, "∨", "Trig Mode"); k(1516, 1462, ">", "µTime+", { k: "micro+", v: true });
  I.push({ t: "label", x: X(1520), y: Y(1345), text: "↕ KB Octave", size: 17, dim: true });
  I.push({ t: "section", x: X(1653), y: Y(1302), w: 180, h: 85, label: "", head: 0 }); I.push({ t: "lcd", k: "pages", x: X(1660), y: Y(1310), w: 166, h: 68, size: 22, seg: true });
  k(1742, 1462, "PAGE", "Fill/Setup", { k: "page", v: true }, 138);
  k(370, 1540, "TRK", "Mute Mode", null, 138); k(370, 1660, "PTN", "Bank", null, 138); k(370, 1780, "SONG", "", null, 138);
  I.push({ t: "section", x: X(498), y: Y(1550), w: 1330, h: 300, label: "", head: 0 });
  for (var i = 0; i < 16; i++) { var x = 582 + (i % 8) * 166, y = i < 8 ? 1560 : 1700;
    I.push({ t: "step", k: "step:" + i, i: i, x: X(x - 69), y: Y(y), w: 138, h: 110, label: String(i + 1), size: 22, cap: "#d0d0d0" }); }
  FaithfulPanel.register({ id: "sq-elektron", name: "Digitakt II", w: 1685, h: 1290, accent: "pink", knob: "cap", accents: { pink: "#e05a7a" },
    colors: { light: { body: "#dcdcdc", line: "#555" }, dark: { body: "#232323", line: "#888" } },
    src: ["Elektron Digitakt II User Manual p. 12: 3.1 Front panel drawing (positions measured), pp. 12-13 key list", "same manual pp. 41-54 (trigs, micro timing, speed, parameter locks, conditions)"],
    approx: "Measured off the manual's drawing; the second trig row and the PTN / SONG keys are approximate. Live: the 16 trig keys (click = note trig on / off, Shift-click = lock trig, Alt-click or right-click = select it), knobs A-H (A-F lock NOTE, VEL, LEN, PROB, the filter and µTIME on the selected trig or set the defaults; G = SPEED, H = SWING: the page's own knob assignment, on the Digitakt these sit in other menus), play / stop, NO (deselect), < and > (µTime − / +), PAGE (next 16 steps), the pattern-page LEDs. Not modelled: volume, level / data, the menu keys, record, copy / paste, YES, arrows, TRK / PTN / SONG, FUNC.",
    items: I });
})();
