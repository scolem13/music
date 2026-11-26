// The Roland TB-303's pattern-write keys as a FaithfulPanel layout bound to SequencerCompare's TB-303 machine. The same
// measured positions as panels/tb303.js (TB-303 Owner's Manual PDF p. 8, panel drawing), but here the sequencer is live and the
// tone knobs are dimmed (this page plays every sequencer on one shared voice). Time mode keys from the TB-03 manual p. 1
// (Original mode = the 303's pattern write): with TIME MODE on, DOWN = note, UP = tie, ACCENT = rest.
(function () {
  var I = [];
  function kn(k, x, y, r, label) { I.push({ t: "knob", k: k, x: x, y: y, r: r, label: label, size: 9, cap: "#c8c8c8", noValue: !k }); }
  function key(x, y, label, w, h, more) { I.push(Object.assign({ t: "key", x: x - (w || 24) / 2, y: y - (h || 34) / 2, w: w || 24, h: h || 34, label: "", cap: "#d9d9d9" }, more || {}));
    if (label) I.push({ t: "label", x: x, y: y + (h || 34) / 2 + 11, text: label, size: 8, bold: true }); }
  I.push({ t: "section", x: 0, y: 0, w: 330, h: 125, label: "", head: 0 }); I.push({ t: "section", x: 330, y: 0, w: 582, h: 125, label: "", head: 0 }); I.push({ t: "section", x: 912, y: 0, w: 373, h: 125, label: "", head: 0 });
  I.push({ t: "jack", x: 75, y: 22, r: 6, label: "MIX IN" }); I.push({ t: "jack", x: 260, y: 22, r: 6, label: "SYNC IN" });
  I.push({ t: "select", x: 128, y: 12, w: 70, h: 20, label: "", text: "WAVEFORM" });
  [["TUNING"], ["CUT OFF FREQ"], ["RESONANCE"], ["ENV MOD"], ["DECAY"], ["ACCENT"]].forEach(function (c, i) { kn(null, 385 + i * 94.5, 62, 22, c[0]); });
  [["CV", 935], ["GATE", 990], ["HEADPHONE", 1055], ["OUTPUT", 1125], ["DC 9V", 1200]].forEach(function (j) { I.push({ t: "jack", x: j[1], y: 22, r: 6, label: j[0] }); });
  I.push({ t: "label", x: 1090, y: 95, text: "Bass Line", size: 30, bold: true });
  I.push({ t: "section", x: 0, y: 125, w: 1285, h: 185, label: "", head: 0 });
  kn("bpm", 195, 225, 38, "TEMPO"); kn(null, 390, 225, 38, "TRACK · PATT. GROUP"); kn(null, 575, 225, 38, "MODE");
  I.push({ t: "label", x: 910, y: 215, text: "TB-303", size: 26, bold: true }); I.push({ t: "label", x: 910, y: 242, text: "Computer Controlled", size: 14 });
  kn(null, 1120, 222, 36, "VOLUME");
  I.push({ t: "section", x: 0, y: 310, w: 135, h: 265, label: "", head: 0 }); I.push({ t: "section", x: 135, y: 310, w: 140, h: 265, label: "", head: 0 });
  I.push({ t: "section", x: 275, y: 310, w: 595, h: 265, label: "", head: 0 }); I.push({ t: "section", x: 870, y: 310, w: 285, h: 265, label: "TIME MODE", title: "top", size: 9 }); I.push({ t: "section", x: 1155, y: 310, w: 130, h: 265, label: "", head: 0 });
  I.push({ t: "label", x: 67, y: 330, text: "D.C.  BAR RESET", size: 8, bold: true }); I.push({ t: "label", x: 67, y: 345, text: "PATTERN CLEAR", size: 8, bold: true }); key(67, 372, "", 46, 22);
  key(80, 450, "RUN / STOP", 70, 54, { k: "play", v: true, led: true }); I.push({ t: "label", x: 205, y: 330, text: "PITCH / MODE", size: 8, bold: true }); key(205, 372, "", 46, 22, { k: "mode", v: "pitch", led: true });
  key(169, 470, "FUNCTION", 20, 40); I.push({ t: "label", x: 220, y: 450, text: "NORMAL MODE", size: 7, dim: true });
  ["C", "D", "E", "F", "G", "A", "B", "C"].forEach(function (n, i) { var x = 306 + i * 72.2; I.push({ t: "label", x: x, y: 327, text: n, size: 8, bold: true }); key(x, 472, String(i + 1), 22, 40, { k: "key", v: [0, 2, 4, 5, 7, 9, 11, 12][i], aria: "key " + n }); });
  [["C♯", 346, 1], ["D♯", 415, 3], ["F♯", 563, 6], ["G♯", 632, 8], ["A♯", 705, 10]].forEach(function (b) { I.push({ t: "label", x: b[1], y: 327, text: b[0], size: 8, bold: true }); key(b[1], 385, "", 22, 40, { k: "key", v: b[2], cap: "#333", aria: "key " + b[0] }); });
  I.push({ t: "label", x: 560, y: 548, text: "PATTERN 1-8 · SELECTOR", size: 8, dim: true });
  key(896, 472, "DOWN", 22, 40, { k: "down", led: true }); key(965, 472, "UP", 22, 40, { k: "up", led: true }); I.push({ t: "label", x: 930, y: 425, text: "TRANSPOSE", size: 8, bold: true });
  I.push({ t: "label", x: 896, y: 545, text: "note", size: 7, dim: true }); I.push({ t: "label", x: 965, y: 545, text: "tie", size: 7, dim: true }); I.push({ t: "label", x: 1039, y: 545, text: "rest", size: 7, dim: true });
  key(1039, 472, "ACCENT", 22, 40, { k: "accent", led: true }); key(1112, 472, "SLIDE", 22, 40, { k: "slide", led: true }); key(1080, 375, "", 46, 22, { k: "mode", v: "time", led: true });
  I.push({ t: "label", x: 1075, y: 562, text: "A · PATT. SECTION · B", size: 8, dim: true });
  key(1220, 380, "BACK", 46, 22, { k: "back", v: true }); key(1220, 450, "WRITE / NEXT", 70, 54, { k: "next", v: true });
  FaithfulPanel.register({ id: "sq-tb303", name: "TB-303 (sequencer)", w: 1285, h: 575, accent: "red", knob: "cap", accents: { red: "#e03a2f" },
    colors: { light: { body: "#ececec", line: "#555" }, dark: { body: "#1c1c1c", line: "#888" } },
    src: ["Roland TB-303 Owner's Manual (1982), PDF p. 8: panel drawing (positions measured, as panels/tb303.js)", "Roland TB-03 Owner's Manual p. 1: time mode keys DOWN = note, UP = tie, ACCENT = rest"],
    approx: "Positions as the synth panel (measured off the manual's drawing). Live: tempo, run / stop, PITCH MODE and TIME MODE keys, the 13 note keys (pitch mode: write the next pitch), DOWN / UP / ACCENT / SLIDE (pitch mode: held flags for the next note; time mode: note / tie / rest), BACK and WRITE / NEXT (move the write position). The memory table under the panel shows what is stored. Not modelled: the tone knobs (one shared voice plays every machine), track / pattern group, mode, clear, function, volume.",
    items: I });
})();
