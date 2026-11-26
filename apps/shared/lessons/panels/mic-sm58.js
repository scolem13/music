// Shure SM58 body: the ball grille (steel mesh) on a dark grey tapered handle, XLR at the tail (Shure product page photos).
// No switches (the SM58S has an on/off switch: not drawn). Proportions approximate; no logo.
(function () {
  FaithfulPanel.register({ id: "mic-sm58", name: "SM58", w: 440, h: 120,
    items: [
      { t: "shape", d: "M62 26 a34 34 0 1 0 0.1 0 Z", fill: "#b8bcc2", stroke: "ink", sw: 1.5, title: "Ball grille (steel mesh)" },
      { t: "shape", d: "M36 40 q26 -10 52 0 M32 60 h60 M36 80 q26 10 52 0", fill: "none", stroke: "#777", sw: 1, title: "Grille mesh" },
      { t: "shape", d: "M94 48 L130 52 h250 l10 4 v8 l-10 4 h-250 L94 72 Z", fill: "#4a4c50", stroke: "ink", sw: 1.5, title: "Handle (dark grey)" },
      { t: "shape", d: "M390 54 h22 v12 h-22 Z", fill: "#888", stroke: "ink", sw: 1, title: "XLR connector" },
      { t: "label", x: 250, y: 106, text: "SM58 — dynamic, cardioid, no switches", size: 10 }],
    src: ["Shape and colours: Shure SM58 product page photos (shure.com)"], approx: "Proportions after photos (approximate); no logo." });
})();
