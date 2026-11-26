// The Roland TR-808 Rhythm Composer (1980) as a FaithfulPanel layout bound to DrumCompare's TR-808-style machine (adapter in
// drum-compare.js). Positions measured off the panel photograph in the TR-808 introduction sheet ("TR-808 Introduction",
// pp. 2-3, rendered at 3000 px a page and joined; 1 unit = 1 px of that crop minus the panel's corner). The photo is small and
// grey: column, knob and key positions are measured; the small controls of the left block (mode, instrument select, auto fill)
// are placed from the photo's blobs and the sheet's callouts, their exact spots guessed. Step-key colours (red, orange, yellow,
// off-white in fours) are not visible in the grey photo: drawn from the well-known look of the machine, unverified.
(function () {
  var I = [], X = function (x) { return x - 130; }, Y = function (y) { return y - 200; };
  var COLS = [["acc", 555, "ACCENT"], ["kick", 655, "BASS DRUM"], ["snare", 755, "SNARE DRUM"], ["ltom", 855, "LOW TOM"], ["mtom", 955, "MID TOM"], ["htom", 1060, "HI TOM"],
    ["rim", 1160, "RIM SHOT"], ["clap", 1260, "HAND CLAP"], ["cowbell", 1360, "COW BELL"], ["cymbal", 1460, "CYMBAL"], ["ohh", 1555, "OPEN HIHAT"], ["chh", 1655, "CLSD HIHAT"]];
  var ALT = { ltom: "LOW CONGA", mtom: "MID CONGA", htom: "HI CONGA", rim: "CLAVES", clap: "MARACAS" };
  var KN = { acc: [["accLevel", "LEVEL"]], kick: [["level", "LEVEL"], ["tone", "TONE"], ["decay", "DECAY"]], snare: [["level", "LEVEL"], ["tone", "TONE"], ["snappy", "SNAPPY"]],
    ltom: [["level", "LEVEL"], ["tune", "TUNING"]], mtom: [["level", "LEVEL"], ["tune", "TUNING"]], htom: [["level", "LEVEL"], ["tune", "TUNING"]],
    rim: [["level", "LEVEL"]], clap: [["level", "LEVEL"]], cowbell: [["level", "LEVEL"]], cymbal: [["level", "LEVEL"], ["tone", "TONE"], ["decay", "DECAY"]], ohh: [["level", "LEVEL"], [null], ["decay", "DECAY"]], chh: [["level", "LEVEL"]] };
  I.push({ t: "section", x: X(140), y: Y(220), w: 370, h: 500, label: "", head: 0 });
  I.push({ t: "section", x: X(510), y: Y(220), w: 1200, h: 380, label: "", head: 0 });
  COLS.forEach(function (c, j) {
    if (j) I.push({ t: "section", x: X(c[1] - 50), y: Y(228), w: 0.5, h: 370, label: "", head: 0 });
    KN[c[0]].forEach(function (k, r) { if (!k[0]) return; I.push({ t: "knob", k: c[0] === "acc" ? k[0] : "p:" + c[0] + "." + k[0], x: X(c[1]), y: Y(270 + r * 110), r: 19, label: k[1], size: 8, noValue: true, cap: "#e8e8e8" }); });
    if (ALT[c[0]]) { I.push({ t: "key", k: "sw:" + c[0], x: X(c[1] - 44), y: Y(478), w: 88, h: 24, label: ALT[c[0]], size: 7.5, aria: c[2] + " / " + ALT[c[0]] + " switch" }); }
    I.push({ t: "key", k: "sel", v: c[0], x: X(c[1] - 44), y: Y(563), w: 88, h: 24, label: c[2], size: 7.5 });
  });
  I.push({ t: "label", x: X(1250), y: Y(668), text: "Rhythm Composer  TR-808", size: 30 }); I.push({ t: "label", x: X(1400), y: Y(700), text: "Computer Controlled", size: 13 });
  I.push({ t: "knob", x: X(1640), y: Y(665), r: 26, label: "MASTER VOLUME", size: 8, cap: "#e8e8e8" });
  // left block
  I.push({ t: "knob", x: X(255), y: Y(290), r: 20, label: "MODE", size: 8, cap: "#e8e8e8" });
  I.push({ t: "select", k: "sel", x: X(375), y: Y(300), w: 90, h: 26, label: "INSTRUMENT SELECT", names: { acc: "AC", kick: "BD", snare: "SD", ltom: "LT", mtom: "MT", htom: "HT", rim: "RS", clap: "CP", cowbell: "CB", cymbal: "CY", ohh: "OH", chh: "CH" } });
  I.push({ t: "knob", x: X(440), y: Y(440), r: 16, label: "AUTO FILL IN", size: 7.5, cap: "#e8e8e8" });
  I.push({ t: "knob", k: "bpm", x: X(280), y: Y(610), r: 78, label: "", cap: "#e8e8e8" }); I.push({ t: "label", x: X(280), y: Y(512), text: "TEMPO", size: 10 });
  I.push({ t: "knob", x: X(440), y: Y(650), r: 16, label: "FINE", size: 7.5, cap: "#e8e8e8" });
  // bottom
  I.push({ t: "section", x: X(180), y: Y(740), w: 1540, h: 280, label: "", head: 0 });
  I.push({ t: "key", x: X(250), y: Y(770), w: 80, h: 34, label: "A  AB  B", size: 8 }); I.push({ t: "label", x: X(290), y: Y(762), text: "BASIC VARIATION", size: 7 });
  I.push({ t: "key", k: "play", v: true, x: X(220), y: Y(880), w: 140, h: 80, label: "START / STOP", size: 10, led: true });
  I.push({ t: "select", k: "scale", x: X(410), y: Y(775), w: 56, h: 26, label: "PRE-SCALE", names: { 16: "1 · 16", 12: "2 · 12" } });
  I.push({ t: "key", k: "clear", v: true, x: X(425), y: Y(880), w: 30, h: 30, label: "" }); I.push({ t: "label", x: X(440), y: Y(925), text: "CLEAR", size: 7 });
  I.push({ t: "select", k: "len", x: X(425), y: Y(940), w: 36, h: 24, label: "", names: {} }); I.push({ t: "label", x: X(443), y: Y(978), text: "STEPS", size: 7, dim: true });
  var COL = ["#d8352a", "#ee8a2a", "#f0d23a", "#efeee6"];
  for (var i = 0; i < 16; i++) { var x = 530 + i * 66.6;
    I.push({ t: "step", k: "step:" + i, i: i, x: X(x - 25), y: Y(882), w: 50, h: 84, label: "", cap: COL[Math.floor(i / 4)] });
    I.push({ t: "label", x: X(x), y: Y(1002), text: String(i < 12 ? i + 1 : i - 11), size: 12 }); }
  I.push({ t: "key", x: X(1600), y: Y(770), w: 80, h: 34, label: "A   B", size: 8 }); I.push({ t: "label", x: X(1640), y: Y(762), text: "I/F VARIATION", size: 7 });
  I.push({ t: "key", x: X(1605), y: Y(885), w: 70, h: 70, label: "TAP", size: 10 });
  FaithfulPanel.register({ id: "dm-tr808", name: "TR-808", w: 1600, h: 840, accent: "orange", knob: "cap",
    accents: { orange: "#ee8a2a" },
    colors: { light: { body: "#f2f2f0", line: "#333" }, dark: { body: "#161616", line: "#777" } },
    src: ["Roland TR-808 Introduction sheet, pp. 2-3: panel photo (positions measured) and the callouts for mode, instrument / track select, pre-scale, clear, start / stop, tap", "TR-808 Service Notes p. 16 (knob list)"],
    approx: "Columns, knob rows, step keys and the bottom block measured off the small panel photo; the left block's small controls are placed approximately; step-key colours are not visible in the grey photo (drawn red / orange / yellow / white, unverified). Live: every voice knob, accent level, tempo, start / stop, pre-scale, clear, step count, instrument select (knob or the names), the tom / conga and rim / claves, clap / maracas switches, and the 16 step keys. Not modelled: mode, auto fill, fine tempo, variations, tap, master volume.",
    items: I });
})();
