// The Roland TB-303 Bass Line (1981) as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.tb303.
// Positions measured off the panel drawing in the TB-303 Owner's Manual (Roland, 1982), PDF page 8 ("B. Initial settings"),
// at about 1285 units for the panel's width. Only the synth part is modelled: the six tone knobs, the waveform switch and volume;
// the sequencer (tempo, pattern group, mode, the note / step keys) is drawn but inert. Silver-grey panel (drawn plain), black
// skirted knobs with silver caps, red LEDs.
(function () {
  var I = [], RED = "red";
  function kn(k, x, y, r, label, more) { I.push(Object.assign({ t: "knob", k: k, x: x, y: y, r: r, label: label, size: 9, cap: "#c8c8c8" }, more || {})); }
  function key(x, y, label, w, h, more) { I.push(Object.assign({ t: "button", x: x - (w || 24) / 2, y: y - (h || 34) / 2, w: w || 24, h: h || 34, label: "" }, more || {}));
    if (label) I.push({ t: "label", x: x, y: y + (h || 34) / 2 + 11, text: label, size: 8, bold: true }); }
  // top row: jacks and waveform switch | the six tone knobs | jacks
  I.push({ t: "section", x: 0, y: 0, w: 330, h: 125, label: "", head: 0 }); I.push({ t: "section", x: 330, y: 0, w: 582, h: 125, label: "", head: 0 }); I.push({ t: "section", x: 912, y: 0, w: 373, h: 125, label: "", head: 0 });
  I.push({ t: "jack", x: 75, y: 22, r: 6, label: "MIX IN" }); I.push({ t: "jack", x: 260, y: 22, r: 6, label: "SYNC IN" });
  I.push({ t: "select", k: "wave", x: 128, y: 12, w: 70, h: 20, label: "", names: { saw: "⩘ SAW", square: "⊓ SQUARE" }, size: 9 }); I.push({ t: "label", x: 163, y: 44, text: "WAVEFORM", size: 8 });
  I.push({ t: "label", x: 165, y: 95, text: "Roland", size: 30, bold: true });
  [["tune", "TUNING"], ["cutoff", "CUT OFF FREQ"], ["res", "RESONANCE"], ["envMod", "ENV MOD"], ["decay", "DECAY"], ["accent", "ACCENT"]].forEach(function (c, i) { kn(c[0], 385 + i * 94.5, 62, 22, c[1]); });
  [["CV", 935], ["GATE", 990], ["HEADPHONE", 1055], ["OUTPUT", 1125], ["DC 9V", 1200]].forEach(function (j) { I.push({ t: "jack", x: j[1] - 330 + 330, y: 22, r: 6, label: j[0] }); });
  I.push({ t: "label", x: 1090, y: 95, text: "Bass Line", size: 30, bold: true });
  // middle row: tempo, track / pattern group, mode | name | volume
  I.push({ t: "section", x: 0, y: 125, w: 1285, h: 185, label: "", head: 0 });
  kn(null, 195, 225, 38, "TEMPO"); I.push({ t: "label", x: 155, y: 288, text: "SLOW", size: 7, dim: true }); I.push({ t: "label", x: 238, y: 288, text: "FAST", size: 7, dim: true });
  kn(null, 390, 225, 38, "TRACK · PATT. GROUP"); kn(null, 575, 225, 38, "MODE");
  I.push({ t: "label", x: 650, y: 190, text: "WRITE / PLAY  TRACK", size: 7, dim: true, anchor: "start" }); I.push({ t: "label", x: 650, y: 262, text: "PLAY / WRITE  PATTERN", size: 7, dim: true, anchor: "start" });
  I.push({ t: "label", x: 910, y: 215, text: "TB-303", size: 26, bold: true }); I.push({ t: "label", x: 910, y: 242, text: "Computer Controlled", size: 14 });
  I.push({ t: "section", x: 1020, y: 128, w: 200, h: 165, label: "VOLUME", title: "top", size: 10 });
  kn("vol", 1120, 222, 36, ""); I.push({ t: "label", x: 1062, y: 282, text: "POWER SW OFF", size: 7, dim: true }); I.push({ t: "label", x: 1185, y: 282, text: "MAX", size: 7, dim: true });
  // bottom: the sequencer keys (inert)
  I.push({ t: "section", x: 0, y: 310, w: 135, h: 265, label: "", head: 0 }); I.push({ t: "section", x: 135, y: 310, w: 140, h: 265, label: "", head: 0 });
  I.push({ t: "section", x: 275, y: 310, w: 595, h: 265, label: "", head: 0 }); I.push({ t: "section", x: 870, y: 310, w: 285, h: 265, label: "TIME MODE", title: "top", size: 9 }); I.push({ t: "section", x: 1155, y: 310, w: 130, h: 265, label: "", head: 0 });
  I.push({ t: "label", x: 67, y: 330, text: "D.C.  BAR RESET", size: 8, bold: true }); I.push({ t: "label", x: 67, y: 345, text: "PATTERN CLEAR", size: 8, bold: true }); key(67, 372, "", 46, 22);
  key(80, 450, "RUN / STOP", 70, 54); I.push({ t: "label", x: 205, y: 330, text: "PITCH / MODE", size: 8, bold: true }); key(205, 372, "", 46, 22);
  key(169, 470, "FUNCTION", 20, 40); I.push({ t: "label", x: 220, y: 450, text: "NORMAL MODE", size: 7, dim: true });
  ["C", "D", "E", "F", "G", "A", "B", "C"].forEach(function (n, i) { var x = 306 + i * 72.2; I.push({ t: "label", x: x, y: 327, text: n, size: 8, bold: true }); key(x, 472, String(i + 1), 22, 40); });
  [["C♯", 346], ["D♯", 415], ["F♯", 563], ["G♯", 632], ["A♯", 705]].forEach(function (b) { I.push({ t: "label", x: b[1], y: 327, text: b[0], size: 8, bold: true }); key(b[1], 385, "", 22, 40); });
  I.push({ t: "label", x: 560, y: 548, text: "PATTERN 1-8 · SELECTOR (not modelled)", size: 8, dim: true });
  key(896, 472, "DOWN", 22, 40); key(965, 472, "UP", 22, 40); I.push({ t: "label", x: 930, y: 425, text: "TRANSPOSE", size: 8, bold: true });
  key(1039, 472, "ACCENT", 22, 40); key(1112, 472, "SLIDE", 22, 40); key(1080, 375, "", 46, 22);
  I.push({ t: "label", x: 1075, y: 548, text: "A · PATT. SECTION · B", size: 8, dim: true });
  key(1220, 380, "BACK", 46, 22); key(1220, 450, "WRITE / NEXT", 70, 54);

  FaithfulPanel.register({ id: "tb303", name: "TB-303", w: 1285, h: 575, accent: RED, knob: "cap",
    accents: { red: "#e03a2f" },
    colors: { light: { body: "#ececec", line: "#555" }, dark: { body: "#1c1c1c", line: "#888" } },
    src: ["Roland TB-303 Owner's Manual (1982), PDF p. 8: panel drawing (positions measured from it)", "same manual PDF p. 34: the tone-control section"],
    approx: "Positions measured off the manual's panel drawing; key and knob sizes are this page's. The real panel is brushed silver with a printed keyboard strip; drawn here plain. The sequencer (tempo, track / pattern group, mode, note, step, transpose, accent, slide keys) is drawn but not modelled; play notes from the keys under the panel.",
    items: I });
})();
