// Vox Continental (single manual) as a FaithfulPanel layout bound to OrganCompare's "vox" profile. Facts from Wikipedia "Vox
// Continental": six drawbars, the four on the left footages 16′ 8′ 4′ IV, the two on the right the voices (flute, reed); one vibrato;
// reverse-coloured keys (black naturals, white sharps). Positions and colours approximate (no measured drawing); no logo artwork.
(function () {
  var I = [];
  I.push({ t: "section", x: 10, y: 10, w: 760, h: 200, label: "", head: 0 });
  [["d16", "16′"], ["d8", "8′"], ["d4", "4′"], ["dIV", "IV"]].forEach(function (d, i) {
    I.push({ t: "button", x: 44 + i * 40, y: 22, w: 18, h: 8, label: "", on: true, a: "grey" });
    I.push({ t: "vslider", k: "inv:" + d[0], x: 40 + i * 40, y: 34, w: 26, h: 166, label: d[1], a: "clear", fmt: function (v) { return String(Math.abs(v)); } }); });
  [["flute", "~"], ["reed", "Λ"]].forEach(function (d, i) {
    I.push({ t: "button", x: 254 + i * 40, y: 22, w: 18, h: 8, label: "", on: true, a: "red" });
    I.push({ t: "vslider", k: "inv:" + d[0], x: 250 + i * 40, y: 34, w: 26, h: 166, label: d[1], a: "clear", fmt: function (v) { return String(Math.abs(v)); } }); });
  I.push({ t: "label", x: 120, y: 16, text: "FOOTAGES", size: 7, dim: true }); I.push({ t: "label", x: 283, y: 16, text: "VOICES", size: 7, dim: true });
  I.push({ t: "switch", k: "vib", x: 380, y: 50, w: 110, h: 26, label: "VIBRATO" });
  I.push({ t: "hslider", k: "swell", x: 380, y: 110, w: 200, h: 30, label: "VOLUME PEDAL", a: "red" });
  // reverse-coloured keyboard (decoration): black naturals, white sharps
  var x0 = 30, kw = 25; for (var i = 0; i < 29; i++) I.push({ t: "button", x: x0 + i * kw, y: 222, w: kw - 2, h: 70, label: "", on: true, a: "keyblack" });
  for (i = 0; i < 28; i++) if ([0, 1, 3, 4, 5].indexOf(i % 7) >= 0) I.push({ t: "button", x: x0 + (i + 0.68) * kw, y: 222, w: kw * 0.6, h: 42, label: "", on: true, a: "keywhite" });
  FaithfulPanel.register({ id: "organ-vox", name: "Vox Continental", w: 780, h: 304, knob: "cap", accent: "red",
    accents: { red: "#c8352b", grey: "#9a9a9a", clear: "rgba(0,0,0,0)", keyblack: "#141414", keywhite: "#f4f4f0" },
    colors: { light: { body: "#f6e9dc" }, dark: { body: "#2a1a16" } },
    src: ["Wikipedia, 'Vox Continental'"], approx: "Layout and colours approximate (no measured drawing). The keyboard is a picture; play from the keys below.",
    items: I });
})();
