// The LinnDrum (Linn Electronics, 1982) as a FaithfulPanel layout bound to DrumCompare's LinnDrum-style machine. The owner's
// manual has NO panel drawing: the sections and their order are from its text (p. 1: MIXER with an upper row of short pan
// sliders and a lower row of level faders, a TUNING section of knobs for snare, sidestick, toms, congas and hi-hat decay, drum
// buttons in the lower left with an upper row shared with PERCUSSION; p. 2: CREATE RHYTHM PATTERN/SONG buttons 1-7 and the
// PATTERN display, SONG/PATTERN key, PLAY/STOP; pp. 7-9: ERROR CORRECT and TIMING). Every position and size is this page's
// guess, and the button order inside each row is the page's own.
(function () {
  var I = [], VO = [["kick", "BASS"], ["snare", "SNARE"], ["rim", "SIDESTICK"], ["chh", "HIHAT"], ["ohh", "OPEN HH"], ["ltom", "TOM LO"], ["mtom", "TOM MID"], ["htom", "TOM HI"],
    ["lconga", "CONGA LO"], ["hconga", "CONGA HI"], ["cowbell", "COWBELL"], ["clap", "CLAPS"], ["cabasa", "CABASA"], ["tamb", "TAMB"], ["ride", "RIDE"], ["crash", "CRASH"]];
  I.push({ t: "section", x: 10, y: 10, w: 1060, h: 330, label: "MIXER", title: "border", size: 12 });
  VO.forEach(function (v, i) { var x = 30 + i * 64;
    I.push({ t: "vslider", k: "p:" + v[0] + ".pan", x: x, y: 30, w: 40, h: 100, label: "" });
    I.push({ t: "vslider", k: "p:" + v[0] + ".level", x: x, y: 140, w: 40, h: 170, label: "" });
    I.push({ t: "label", x: x + 20, y: 328, text: v[1], size: 7 }); });
  I.push({ t: "label", x: 20, y: 84, text: "PAN", size: 8, rot: -90, dim: true }); I.push({ t: "label", x: 20, y: 230, text: "LEVEL", size: 8, rot: -90, dim: true });
  I.push({ t: "section", x: 1080, y: 10, w: 370, h: 330, label: "TUNING", title: "border", size: 12 });
  [["snare", "tune", "SNARE"], ["rim", "tune", "SIDESTICK"], ["ltom", "tune", "TOM LO"], ["mtom", "tune", "TOM MID"], ["htom", "tune", "TOM HI"], ["lconga", "tune", "CONGA LO"], ["hconga", "tune", "CONGA HI"], ["chh", "decay", "HIHAT DECAY"]].forEach(function (t, i) {
    I.push({ t: "knob", k: "p:" + t[0] + "." + t[1], x: 1130 + (i % 4) * 90, y: 90 + Math.floor(i / 4) * 140, r: 22, label: t[2], size: 8, noValue: true, cap: "#d8d8d8" }); });
  I.push({ t: "section", x: 10, y: 350, w: 700, h: 300, label: "DRUMS", title: "border", size: 12 });
  VO.forEach(function (v, i) { var r = i < 8 ? 1 : 0, c = i % 8, x = 30 + c * 84, y = 390 + r * 120;
    I.push({ t: "key", k: "sel", v: v[0], x: x, y: y, w: 66, h: 56, label: "", led: false, cap: "#e9e4d8", aria: v[1] }); I.push({ t: "label", x: x + 33, y: y + 72, text: v[1], size: 8, bold: true }); });
  I.push({ t: "key", x: 600, y: 600, w: 90, h: 30, label: "PERCUSSION", size: 8 });
  I.push({ t: "section", x: 720, y: 350, w: 730, h: 300, label: "CREATE RHYTHM PATTERN / SONG", title: "border", size: 12 });
  I.push({ t: "lcd", k: "disp", x: 750, y: 380, w: 110, h: 54, size: 30, seg: true }); I.push({ t: "label", x: 805, y: 450, text: "PATTERN / TEMPO", size: 8 });
  I.push({ t: "knob", k: "bpm", x: 940, y: 410, r: 28, label: "TEMPO", size: 8, cap: "#d8d8d8" });
  I.push({ t: "key", k: "play", v: true, x: 1010, y: 380, w: 90, h: 54, label: "PLAY/STOP", size: 9, led: true });
  I.push({ t: "key", x: 1120, y: 380, w: 90, h: 54, label: "SONG/PATTERN", size: 8, led: true });
  I.push({ t: "knob", x: 1360, y: 410, r: 28, label: "VOLUME", size: 8, cap: "#d8d8d8" });
  for (var n = 1; n <= 7; n++) I.push({ t: "key", x: 740 + (n - 1) * 60, y: 490, w: 46, h: 36, label: String(n), size: 11 });
  I.push({ t: "select", k: "quant", x: 1180, y: 490, w: 110, h: 30, label: "ERROR CORRECT" });
  I.push({ t: "select", k: "timing", x: 1300, y: 490, w: 60, h: 30, label: "TIMING" }); I.push({ t: "select", k: "swingGrid", x: 1370, y: 490, w: 60, h: 30, label: "ON", names: { 8: "1/8", 16: "1/16" } });
  I.push({ t: "select", k: "len", x: 1180, y: 560, w: 60, h: 30, label: "LENGTH", names: {} }); I.push({ t: "key", k: "clear", v: true, x: 1260, y: 560, w: 80, h: 30, label: "ERASE", size: 8 });
  // the page's own step strip (the LinnDrum records in real time; this strip edits the selected drum's steps)
  I.push({ t: "section", x: 10, y: 665, w: 1440, h: 110, label: "", head: 0 });
  I.push({ t: "label", x: 20, y: 686, text: "Step strip (this page's, not on the LinnDrum: it records in real time from the drum buttons): the selected drum's 16 steps; click = level 1, 2, 3, off", size: 9, anchor: "start", dim: true });
  for (var i = 0; i < 16; i++) I.push({ t: "step", k: "step:" + i, i: i, x: 30 + i * 88, y: 700, w: 70, h: 62, label: String(i + 1), size: 10 });
  FaithfulPanel.register({ id: "dm-linn", name: "LinnDrum", w: 1460, h: 785, accent: "tan", knob: "cap", accents: { tan: "#c8a14a" },
    colors: { light: { body: "#f3f1ec", line: "#444" }, dark: { body: "#1a1a18", line: "#888" } },
    src: ["LinnDrum Owner's Manual pp. 1-2 (sections named in the text: mixer, tuning, drum buttons, create pattern / song), pp. 7-9 (error correct, timing)"],
    approx: "No panel drawing in the manual: the sections come from its text, every position is this page's guess. Live: the 16 level and pan sliders, the 8 tuning / hi-hat decay knobs, tempo, play / stop, error correct, timing (on 1/8 or 1/16), length, erase (the selected drum's steps), drum buttons (select the drum the step strip edits) and the page's own step strip. Not modelled: pattern number keys 1-7, song mode, percussion shift, volume.",
    items: I });
})();
