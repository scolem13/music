// The Roland TR-909 Rhythm Composer (1983) as a FaithfulPanel layout bound to DrumCompare's TR-909-style machine (adapter in
// drum-compare.js). Positions measured off the "Panel Description" drawing, TR-909 Owner's Manual p. 3 (rendered at 3000 px
// wide, cropped; 1 unit = 1 px of the crop minus the panel's corner). Knob, key and section positions are measured; sizes
// rounded. Instrument select: on the real 909 you hold INSTRUMENT SELECT and press a step key; here a click on the instrument
// names printed under the keys does it (the same keys, one press less). Total accent = the TOTAL ACCENT label under ENTER.
(function () {
  var I = [], X = function (x) { return x - 150; }, Y = function (y) { return y - 30; };
  function sec(x0, x1, label) { I.push({ t: "section", x: X(x0), y: Y(46), w: x1 - x0, h: 230, label: label, head: 22 }); }
  function kn(k, x, y, label) { I.push({ t: "knob", k: k, x: X(x), y: Y(y), r: 20, label: label, size: 8.5, noValue: true, cap: "#e8e8e8" }); }
  sec(160, 312, "TOTAL ACCENT"); sec(318, 505, "BASS DRUM"); sec(512, 698, "SNARE DRUM"); sec(706, 890, "LOW TOM"); sec(898, 1083, "MID TOM");
  sec(1090, 1277, "HI TOM"); sec(1283, 1468, "RIM SHOT  HAND CLAP"); sec(1477, 1663, "HI HAT"); sec(1671, 1862, "CYMBAL");
  kn("accLevel", 243, 230, "");
  kn("p:kick.tune", 367, 140, "TUNE"); kn("p:kick.level", 455, 140, "LEVEL"); kn("p:kick.attack", 367, 225, "ATTACK"); kn("p:kick.decay", 455, 225, "DECAY");
  kn("p:snare.tune", 560, 140, "TUNE"); kn("p:snare.level", 648, 140, "LEVEL"); kn("p:snare.tone", 560, 225, "TONE"); kn("p:snare.snappy", 648, 225, "SNAPPY");
  [["ltom", 752], ["mtom", 945], ["htom", 1138]].forEach(function (t) { kn("p:" + t[0] + ".tune", t[1], 140, "TUNE"); kn("p:" + t[0] + ".level", t[1] + 88, 140, "LEVEL"); kn("p:" + t[0] + ".decay", t[1], 225, "DECAY"); });
  kn("p:rim.level", 1330, 140, "LEVEL"); kn("p:clap.level", 1420, 140, "LEVEL");
  kn("p:hh.level", 1613, 140, "LEVEL"); kn("p:chh.decay", 1522, 225, "CH DECAY"); kn("p:ohh.decay", 1613, 225, "OH DECAY");
  kn("p:crash.level", 1718, 140, "LEVEL"); kn("p:ride.level", 1810, 140, "LEVEL"); kn("p:crash.tune", 1718, 225, "CRASH TUNE"); kn("p:ride.tune", 1810, 225, "RIDE TUNE");
  // middle row
  I.push({ t: "section", x: X(160), y: Y(300), w: 1702, h: 160, label: "", head: 0 });
  I.push({ t: "key", k: "play", v: true, x: X(193), y: Y(355), w: 70, h: 70, label: "START", below: true });
  I.push({ t: "key", k: "stop", v: true, x: X(297), y: Y(355), w: 70, h: 70, label: "STOP/CONT", below: true });
  I.push({ t: "lcd", k: "disp", x: X(415), y: Y(352), w: 142, h: 64, size: 34, seg: true }); I.push({ t: "label", x: X(485), y: Y(334), text: "MEAS/TEMPO", size: 8.5 });
  I.push({ t: "knob", k: "bpm", x: X(690), y: Y(390), r: 44, label: "", cap: "#e8e8e8" }); I.push({ t: "label", x: X(690), y: Y(322), text: "TEMPO", size: 9 });
  I.push({ t: "label", x: X(636), y: Y(458), text: "SLOW", size: 7, dim: true }); I.push({ t: "label", x: X(742), y: Y(458), text: "FAST", size: 7, dim: true });
  function sq(x, label, under, k, v) { I.push({ t: "key", k: k, v: v, x: X(x - 16), y: Y(358), w: 32, h: 32, label: "" }); if (label) I.push({ t: "label", x: X(x), y: Y(334), text: label, size: 7 }); if (under) I.push({ t: "label", x: X(x), y: Y(410), text: under, size: 7 }); }
  I.push({ t: "label", x: X(903), y: Y(334), text: "TRACK PLAY", size: 7 }); [826, 878, 929, 980].forEach(function (x, i) { sq(x, "", String(i + 1)); });
  I.push({ t: "button", x: X(806), y: Y(422), w: 194, h: 24, label: "TRACK WRITE", size: 8 });
  I.push({ t: "label", x: X(1105), y: Y(334), text: "PATTERN PLAY", size: 7 }); [1053, 1104, 1155].forEach(function (x, i) { sq(x, "", String(i + 1)); }); sq(1205, "", "");
  I.push({ t: "button", x: X(1033), y: Y(422), w: 140, h: 24, label: "PATTERN WRITE", size: 8 }); I.push({ t: "button", x: X(1188), y: Y(422), w: 36, h: 24, label: "EXT", size: 7 });
  [[1280, "TEMPO", "STEP"], [1331, "BACK", "TAP"], [1382, "FWD", "I"], [1433, "AVAIL.", "II"], [1492, "CYCLE", ""], [1542, "TAPE SYNC", ""]].forEach(function (b) { sq(b[0], b[1], b[2]); });
  I.push({ t: "key", k: "sel", v: "acc", x: X(1600), y: Y(352), w: 70, h: 62, label: "ENTER", led: true }); I.push({ t: "label", x: X(1640), y: Y(456), text: "TOTAL ACCENT", size: 8 });
  I.push({ t: "knob", x: X(1805), y: Y(380), r: 48, label: "", cap: "#e8e8e8" }); I.push({ t: "label", x: X(1805), y: Y(322), text: "VOLUME", size: 9 });
  // the step section
  I.push({ t: "section", x: X(160), y: Y(465), w: 1702, h: 315, label: "", head: 0 });
  I.push({ t: "select", k: "len", x: X(188), y: Y(495), w: 34, h: 30, label: "", names: {} }); I.push({ t: "label", x: X(205), y: Y(545), text: "LAST STEP", size: 7 });
  I.push({ t: "select", k: "scale", x: X(251), y: Y(495), w: 34, h: 30, label: "", names: { 16: "16", 12: "12" } }); I.push({ t: "label", x: X(268), y: Y(545), text: "SCALE", size: 7 });
  I.push({ t: "select", k: "shuffle", x: X(188), y: Y(573), w: 34, h: 30, label: "" }); I.push({ t: "label", x: X(205), y: Y(623), text: "SHUFFLE/FLAM", size: 7 });
  I.push({ t: "key", k: "clear", v: true, x: X(251), y: Y(573), w: 34, h: 30, label: "" }); I.push({ t: "label", x: X(268), y: Y(623), text: "CLEAR", size: 7 });
  I.push({ t: "key", x: X(188), y: Y(647), w: 34, h: 30, label: "" }); I.push({ t: "label", x: X(205), y: Y(697), text: "INSTRUMENT SELECT", size: 7 });
  I.push({ t: "key", x: X(251), y: Y(647), w: 34, h: 30, label: "" }); I.push({ t: "label", x: X(268), y: Y(697), text: "SHIFT", size: 7, bold: true });
  [478, 510, 541, 573].forEach(function (y) { I.push({ t: "section", x: X(305), y: Y(y - 12), w: 1557, h: 22, label: "", head: 0 }); });
  I.push({ t: "label", x: X(1080), y: Y(530), text: "scale lights (drawn, not lit)", size: 8, dim: true });
  for (var i = 0; i < 16; i++) { var x = 360 + i * 96.8;
    I.push({ t: "label", x: X(x), y: Y(612), text: String(i + 1), size: 11 });
    I.push({ t: "step", k: "step:" + i, i: i, x: X(x - 38), y: Y(625), w: 76, h: 72, label: "", cap: "#d9d9d9" });
    I.push({ t: "label", x: X(x), y: Y(737), text: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "COPY", "INS", "DEL", "SAVE", "VERIFY", "LOAD"][i], size: 9, bold: true }); }
  [["kick", 320, 497, "BASS DRUM"], ["snare", 514, 690, "SNARE DRUM"], ["ltom", 708, 883, "LOW TOM"], ["mtom", 900, 1077, "MID TOM"], ["htom", 1094, 1270, "HI TOM"],
   ["rim", 1285, 1370, "RIM SHOT"], ["clap", 1375, 1460, "HAND CLAP"], ["chh", 1478, 1545, "CLOSED"], ["ohh", 1547, 1600, "OPEN"], ["crash", 1660, 1758, "CRASH"], ["ride", 1762, 1850, "RIDE"]].forEach(function (b) {
    I.push({ t: "key", k: "sel", v: b[0], x: X(b[1]), y: Y(750), w: b[2] - b[1], h: 22, label: b[3], size: 8 }); });
  FaithfulPanel.register({ id: "dm-tr909", name: "TR-909", w: 1730, h: 760, accent: "orange", knob: "cap",
    accents: { orange: "#f08a24" },
    colors: { light: { body: "#f4f4f2", line: "#333" }, dark: { body: "#1a1a1a", line: "#888" } },
    src: ["Roland TR-909 Owner's Manual, p. 3: Panel Description drawing (positions measured)", "same manual pp. 7-8 (keys, sound controls), 24-26 (scale, last step, accent, shuffle / flam)"],
    approx: "Measured off the manual's panel drawing; knob and key sizes rounded. Live: every sound knob, total accent, tempo, start / stop, last step, scale, shuffle, clear, the 16 step keys (click = on, accent, flam, off: the page's cycle) and instrument select (click a name under the keys; on the 909 you hold INSTRUMENT SELECT). The HI HAT LEVEL knob sets both hats. Not modelled (dimmed): track / pattern / bank / tape keys, volume, shift. The scale lights are drawn but not lit.",
    items: I });
})();
