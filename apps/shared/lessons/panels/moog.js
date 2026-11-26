// The Minimoog Model D's front panel as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.moog, for the compare page and the Model D intro page's Panel view. Every position, legend and
// colour is MoogSheet's (apps/shared/lessons/moog-sheet.js: its K / SW tables and static labels, in the 2016 manual's
// patch-sheet page pixels at 1.6x, sheets pp. 55-79), so this panel and the patch sheets look the same; MoogSheet itself is
// unchanged and still draws the sheets. Coordinates here are the sheet's minus (190, 330), scaled by S.
(function () {
  var S = 0.78, I = [];
  function x(v) { return (v - 190) * S; } function y(v) { return (v - 330) * S; }
  function k(key, cx, cy, more) { I.push(Object.assign({ t: "knob", k: key, x: x(cx), y: y(cy), r: 24 * S, label: "", size: 7, cap: "#111", noValue: false }, more || {})); }
  function rock(key, cx, cy, a, hw, hh, label) { hw = hw || 27; hh = hh || 19;   // drawn as thin as MoogSheet's rockers (12 across)
    if (hh < hw) { hh = 12; cy += 7; } else hw = 12;
    I.push({ t: "switch", k: key, x: x(cx - (hw || 27)), y: y(cy - (hh || 19)), w: 2 * (hw || 27) * S, h: 2 * (hh || 19) * S, label: label || "", size: 6.5, a: a }); }
  function sel(key, cx, cy, names) { I.push({ t: "select", k: key, x: x(cx) - 30, y: y(cy) - 10, w: 60, h: 20, label: "", size: 8, names: names }); }
  function lab(t, cx, cy, size, more) { I.push(Object.assign({ t: "label", x: x(cx), y: y(cy) + 3, text: t, size: (size || 10) * S }, more || {})); }
  // frames (MoogSheet: main panel 203-1832 x 346-779 with dividers, left-hand box 203-405 x 799-1137)
  [[203, 425, "CONTROLLERS"], [425, 788, "OSCILLATOR   BANK"], [788, 1210, "MIXER"], [1210, 1572, "MODIFIERS"], [1572, 1772, "OUTPUT"], [1772, 1832, ""]].forEach(function (s) {
    I.push({ t: "section", x: x(s[0]), y: y(346), w: (s[1] - s[0]) * S, h: 433 * S, head: 0 }); lab(s[2], (s[0] + s[1]) / 2, 745, 20, { dim: false }); });
  I.push({ t: "section", x: x(1210), y: y(598), w: 362 * S, h: 0.8, head: 0 });
  I.push({ t: "section", x: x(203), y: y(799), w: 202 * S, h: 337 * S, head: 0 });
  // printed legends (MoogSheet's static labels)
  [["TUNE", 310, 448], ["GLIDE", 257, 563], ["MODULATION MIX", 364, 563], ["OSC. 3", 228, 708, 9], ["FILTER EG", 287, 708, 9], ["NOISE", 336, 708, 9], ["LFO", 393, 708, 9],
    ["OSCILLATOR", 426, 476], ["MODULATION", 426, 487], ["RANGE", 518, 392], ["OSCILLATOR–1", 625, 392, 12.5], ["FREQUENCY", 625, 404, 9.5], ["WAVEFORM", 733, 392],
    ["OSCILLATOR–2", 625, 500, 12.5], ["OSCILLATOR–3", 625, 609, 12.5], ["OSC. 3", 449, 610, 8.5], ["CONTROL", 449, 620, 8.5],
    ["VOLUME", 841, 392], ["EXTERNAL", 1056, 438], ["INPUT VOLUME", 1056, 449], ["OVERLOAD", 1133, 480], ["NOISE VOLUME", 1056, 562], ["WHITE", 1133, 562], ["PINK", 1133, 612],
    ["FILTER", 1210, 422, 8.5], ["MODULATION", 1210, 432, 8.5], ["KEYBOARD", 1210, 524, 8.5], ["CONTROL", 1210, 534, 8.5], ["1", 1170, 494, 11], ["2", 1170, 544, 11],
    ["CUTOFF  FREQUENCY", 1302, 392], ["FILTER", 1410, 380, 13], ["EMPHASIS", 1410, 393], ["AMOUNT", 1518, 382], ["OF CONTOUR", 1518, 393],
    ["ATTACK TIME", 1302, 503], ["DECAY TIME", 1410, 503], ["SUSTAIN LEVEL", 1518, 503], ["LOUDNESS CONTOUR", 1410, 611, 13.5],
    ["ATTACK TIME", 1302, 625], ["DECAY TIME", 1410, 625], ["SUSTAIN LEVEL", 1518, 625],
    ["VOLUME", 1626, 392], ["MAIN OUTPUT", 1717, 392], ["A – 440", 1626, 528], ["VOLUME", 1626, 626], ["PHONES", 1717, 619], ["POWER", 1806, 611],
    ["LFO RATE", 254, 812], ["GLIDE", 343, 812], ["DECAY", 343, 875], ["PITCH", 280, 1102, 12.5], ["MOD.", 381, 1102, 12.5]].forEach(function (l) { lab(l[0], l[1], l[2], l[3] || 10); });
  // knobs (MoogSheet K)
  k(null, 310, 507); k("glide", 256, 615); k("modMix", 364, 615);
  sel("o1Range", 518, 453); sel("o1Wave", 733, 453); sel("o2Range", 518, 561); k("o2Freq", 625, 561, { r: 36 * S }); sel("o2Wave", 733, 561);
  sel("o3Range", 518, 669); k("o3Freq", 625, 669, { r: 36 * S }); sel("o3Wave", 733, 669);
  k("m1", 841, 454); k("m2", 841, 561); k("m3", 841, 669); k("ext", 1056, 507); k("n", 1056, 615);
  k("cutoff", 1302, 454); k("emph", 1410, 454); k("amount", 1518, 454);
  k("fA", 1302, 554); k("fD", 1410, 554); k("fS", 1518, 554); k("lA", 1302, 676); k("lD", 1410, 676); k("lS", 1518, 676);
  k("vol", 1626, 454); k(null, 1626, 676); k("lfoRate", 254, 867, { r: 24 * S * 0.8 });
  // rocker switches (MoogSheet SW; orange = modulation / keyboard, blue = mixer and output, dark = sources)
  rock("oscMod", 398, 498, "or"); rock("m1On", 921, 444, "bl"); rock("extOn", 921, 498, "bl"); rock("m2On", 921, 552, "bl"); rock("nOn", 921, 606, "bl"); rock("m3On", 921, 659, "bl", 27, 20);
  rock("filtMod", 1183, 444, "or"); rock("kb1", 1183, 494, "or"); rock("kb2", 1183, 544, "or");
  rock(null, 1690, 444, "bl"); rock(null, 1597, 552, "bl"); rock(null, 1797, 641, "dk", 19, 27);
  I.push({ t: "seg", k: "nCol", x: x(1105), y: y(568), w: 38 * S + 10, h: 22, opts: [["white", "W"], ["pink", "P"]], size: 7, a: "bl" });
  rock("o3Kbd", 439, 641, "or", 19, 27);
  I.push({ t: "seg", k: "src1", x: x(201), y: y(660), w: 54 * S + 22, h: 38 * S, opts: [["osc3", "OSC3"], ["fenv", "F.EG"]], size: 6, a: "dk" });
  I.push({ t: "seg", k: "src2", x: x(309), y: y(660), w: 54 * S + 22, h: 38 * S, opts: [["noise", "NOISE"], ["lfo", "LFO"]], size: 6, a: "dk" });
  rock("glideOn", 310, 825, "lg", 32, 23); rock("decaySw", 310, 888, "lg", 32, 23); rock("lfoSq", 254, 920, "or", 30, 14, "⊓ square");
  // overload lamp, phones jack, power lamp; pitch and mod wheels
  I.push({ t: "jack", x: x(1133), y: y(507), r: 12 * S }, { t: "jack", x: x(1717), y: y(669), r: 15 * S }, { t: "jack", x: x(1806), y: y(592), r: 8 * S });
  I.push({ t: "section", x: x(265), y: y(950), w: 30 * S, h: 130 * S, head: 0 }, { t: "section", x: x(366), y: y(950), w: 30 * S, h: 130 * S, head: 0 });
  I.push({ t: "keys", x: x(424), y: y(800), w: 1408 * S, h: 337 * S, n: 44 });

  FaithfulPanel.register({ id: "moog", name: "Minimoog Model D", w: 1660 * S, h: 820 * S, accent: "or", knob: "cap", round: 2,
    accents: { or: "#F58648", bl: "#92B6BC", dk: "#58595B", lg: "#D1D3D4" },
    colors: { dark: { body: "#000000", head: "#000000", line: "#cfcfcf", ink: "#f2f2f2" }, light: { body: "#ffffff", head: "#ffffff", line: "#111111", ink: "#111111" } },
    src: ["Minimoog Model D manual (2016), patch sheets pp. 55-79, through MoogSheet (moog-sheet.js): its control positions, legends and colours"],
    approx: "Positions, legends and colours are MoogSheet's redrawing of the manual's patch sheets (pp. 55-79), so this panel matches the sheets. The range and waveform selectors are drawn as menus and the two modulation-source switches as two-cell selectors; the LFO square (push-pull) is a switch here; the keyboard drawing fills the sheet's Notes box. Not modelled (dimmed): tune, phones volume, main output, A-440, power.",
    items: I });
})();
