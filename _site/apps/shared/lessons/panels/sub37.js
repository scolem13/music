// The Moog Sub 37 as a FaithfulPanel layout (format: faithful-panel.js header), bound to SynthCompare.PROFILES.sub37.
// The Sub 37's own manual could not be obtained, so this is the SUBSEQUENT 25's panel (the 37's smaller sibling, same
// sections and engine family): measured from the panel drawing in the Subsequent 25 manual, PDF p. 6 (drawn white on black;
// inverted, read in pixels of a 2000 px-wide view, panel x 10-1995, y 0-585), scaled by S. The 37's extra controls are not
// drawn except Duo mode, which this page's Sub 37 has (placed by guess beside Activate Panel).
(function () {
  var S = 0.64, X0 = 10, Y0 = 0, I = [], A = "or";
  function x(v) { return (v - X0) * S; } function y(v) { return (v - Y0) * S; }
  function sec(x0, x1, label) { I.push({ t: "section", x: x(x0), y: 0, w: (x1 - x0) * S, h: 585 * S, label: label, head: 15 }); }
  function k(key, cx, cy, label, r) { I.push({ t: "knob", k: key, x: x(cx), y: y(cy), r: (r || 36) * S, label: label, size: 8.5, cap: "#141414" }); }
  function b(key, cx, cy, label, more) { I.push(Object.assign({ t: key ? "switch" : "button", k: key, x: x(cx) - 22 * S, y: y(cy) - 22 * S, w: 44 * S, h: 44 * S, label: label || "", size: 7, a: A }, more || {})); }
  function lab(t, cx, cy, size, more) { I.push(Object.assign({ t: "label", x: x(cx), y: y(cy), text: t, size: size || 8 }, more || {})); }
  // sections (top strip legends, p. 6)
  sec(10, 193, "PRESETS"); sec(193, 352, "PITCH"); sec(352, 637, "MODULATION"); sec(637, 910, "OSCILLATORS"); sec(910, 1088, "MIXER"); sec(1088, 1358, "FILTER");
  sec(1358, 1858, "ENVELOPES"); sec(1858, 1995, "OUTPUT");
  I.push({ t: "section", x: x(770), y: y(30), w: 0.6, h: 555 * S, head: 0 }, { t: "section", x: x(25), y: y(405), w: 155 * S, h: 0.6, head: 0 }, { t: "section", x: x(1358), y: y(510), w: 500 * S, h: 0.6, head: 0 });
  // presets (not modelled) and Duo
  lab("BANK", 60, 68, 7); lab("PATCH", 142, 68, 7);
  [103, 190, 275, 362].forEach(function (yy, i) { b(null, 60, yy, ""); b(null, 142, yy, ""); lab(String(i + 1), 101, yy + 4, 8); });
  b(null, 70, 488, "ACTIVATE", { size: 6 }); b("duo", 148, 488, "DUO", { size: 7 }); lab("(Sub 37)", 148, 530, 6.5, { dim: true });
  // pitch
  k(null, 273, 145, "FINE TUNE"); k("glide", 273, 315, "GLIDE RATE");
  [-2, -1, 0, 1, 2].forEach(function (n, i) { I.push({ t: "jack", x: x(212 + i * 30), y: y(428), r: 6 * S, label: (n > 0 ? "+" : "") + n, size: 6 }); });
  b(null, 232, 490, "<"); b(null, 312, 490, ">"); lab("OCTAVE", 273, 552, 8);
  // modulation
  k("lfoRate", 425, 145, "LFO RATE");
  I.push({ t: "select", k: "lfoWave", x: x(562) - 40, y: y(145) - 10, w: 80, h: 20, label: "SOURCE", size: 8.5, names: { tri: "∧ tri", square: "⊓ square", saw: "◺ saw", ramp: "◿ ramp", sh: "S&H" } });
  k("pAmt", 425, 315, "PITCH AMT"); b(null, 562, 318, ""); lab("PITCH AMT", 562, 280, 7.5); lab("OSC 2 ONLY", 562, 358, 7.5);
  k("cAmt", 425, 488, "FILTER AMT"); k("wAmt", 562, 488, "WAVE AMT");
  // oscillators
  lab("1", 652, 47, 10, { bold: true }); lab("2", 787, 47, 10, { bold: true });
  I.push({ t: "select", k: "o1Oct", x: x(700) - 28, y: y(145) - 10, w: 56, h: 20, label: "OCTAVE", size: 9 });
  I.push({ t: "select", k: "o2Oct", x: x(838) - 28, y: y(145) - 10, w: 56, h: 20, label: "OCTAVE", size: 9 });
  I.push({ t: "switch", k: "sync", x: x(700) - 22 * S, y: y(318) - 22 * S, w: 44 * S, h: 44 * S, label: "", a: A }); lab("HARD SYNC", 700, 280, 7.5); lab("OSC 2", 700, 358, 7.5);
  k("o2Freq", 838, 318, "FREQUENCY"); k("o1Wave", 700, 488, "WAVE"); k("o2Wave", 838, 488, "WAVE");
  // mixer
  k("m1", 968, 108, "OSC 1"); k("mSub", 1022, 245, "SUB OSC"); k("m2", 978, 382, "OSC 2"); k("mN", 1022, 515, "NOISE");
  // filter
  k("cutoff", 1225, 145, "CUTOFF", 55); k("res", 1158, 318, "RESONANCE"); k("drive", 1290, 318, "MULTIDRIVE"); k("fAmt", 1158, 488, "EG AMOUNT"); k("kbd", 1290, 488, "KB AMOUNT");
  // envelopes
  [["A", 1420, "ATTACK"], ["D", 1545, "DECAY"], ["S", 1670, "SUSTAIN"], ["R", 1795, "RELEASE"]].forEach(function (e) { k("f" + e[0], e[1], 145, e[2]); k("a" + e[0], e[1], 382, e[2]); });
  lab("— FILTER —", 1608, 232, 8, { bold: true }); lab("— AMPLIFIER —", 1608, 316, 8, { bold: true });
  lab("SUBSEQUENT 25 panel", 1608, 555, 11, { bold: true, dim: true });
  // output
  k("vol", 1925, 145, "MASTER"); k(null, 1925, 315, "HEADPHONE"); I.push({ t: "jack", x: x(1925), y: y(440), r: 16 * S });

  FaithfulPanel.register({ id: "sub37", name: "Sub 37 (Subsequent 25 panel)", w: 1990 * S, h: 590 * S, accent: A, knob: "cap", round: 3,
    accents: { or: "#f0a23a" },
    colors: { dark: { body: "#0e0e0e", line: "#cfcfcf", ink: "#f2f2f2" }, light: { body: "#ffffff", line: "#111111", ink: "#111111" } },
    src: ["Moog Subsequent 25 manual, PDF p. 6: front panel drawing (the Sub 37 manual could not be obtained)", "pp. 13-27: the controls"],
    approx: "This is the SUBSEQUENT 25's panel: the Sub 37's own manual could not be obtained, so the 37's larger panel (its extra knobs, Duo and arpeggiator buttons) is not drawn; Duo is placed by guess beside Activate Panel. Positions measured from the Subsequent 25 drawing (p. 6); no dimensions printed. Guessed: the orange accent. Not modelled (dimmed): presets, fine tune, octave buttons, Osc 2 Only, headphone volume. The source and octave selectors are menus here.",
    items: I });
})();
