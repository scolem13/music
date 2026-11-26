// Shure SM57 body for FaithfulPanel + Mics.adapter: dark grey die-cast body, flat-topped black grille, XLR at the tail (Shure product
// page photos). No switches. Drawn lying down, grille on the left. Proportions approximate; no logo (plain name).
(function () {
  FaithfulPanel.register({ id: "mic-sm57", name: "SM57", w: 440, h: 120,
    items: [
      { t: "shape", d: "M20 42 h80 v36 h-80 Z", fill: "#222", stroke: "ink", sw: 1.5, title: "Grille (flat-topped, black)" },
      { t: "shape", d: "M30 42 v36 M42 42 v36 M54 42 v36 M66 42 v36 M78 42 v36 M90 42 v36", fill: "none", stroke: "#555", sw: 1, title: "Grille mesh" },
      { t: "shape", d: "M100 46 L130 52 h250 l10 4 v8 l-10 4 h-250 L100 74 Z", fill: "#4a4c50", stroke: "ink", sw: 1.5, title: "Body (dark grey)" },
      { t: "shape", d: "M390 54 h22 v12 h-22 Z", fill: "#888", stroke: "ink", sw: 1, title: "XLR connector" },
      { t: "label", x: 250, y: 100, text: "SM57 — dynamic, cardioid, no switches", size: 10 }],
    src: ["Shape and colours: Shure SM57 product page photos (shure.com)"], approx: "Proportions after photos (approximate); no logo." });
})();
