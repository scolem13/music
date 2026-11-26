// Royer R-121: a long cylindrical body with a slotted window round the ribbon near the top, XLR at the tail (royerlabs.com photos).
// Passive: no switches. Front and back are both live (figure-8); the back is marked. Proportions approximate; no logo.
(function () {
  FaithfulPanel.register({ id: "mic-r121", name: "R-121", w: 440, h: 120,
    items: [
      { t: "shape", d: "M20 44 h340 a16 16 0 0 1 0 32 h-340 a16 16 0 0 1 0 -32 Z", fill: "#bfc0c2", stroke: "ink", sw: 1.5, title: "Body (satin nickel finish)" },
      { t: "shape", d: "M30 48 h90 v24 h-90 Z", fill: "#333", stroke: "ink", sw: 1, title: "Window round the ribbon" },
      { t: "shape", d: "M40 50 v20 M52 50 v20 M64 50 v20 M76 50 v20 M88 50 v20 M100 50 v20 M112 50 v20", fill: "none", stroke: "#777", sw: 1, title: "Mesh" },
      { t: "shape", d: "M376 54 h26 v12 h-26 Z", fill: "#888", stroke: "ink", sw: 1, title: "XLR connector" },
      { t: "label", x: 75, y: 36, text: "FRONT ↑ / BACK ↓ (rear lobe inverted)", size: 9 },
      { t: "label", x: 240, y: 100, text: "R-121 — ribbon, figure-8, passive (never send +48 V carelessly)", size: 10 }],
    src: ["Royer Labs R-121 page (royerlabs.com): figure-8, passive, offset ribbon (rear brighter close up)"], approx: "Proportions after photos (approximate); colours simplified; no logo." });
})();
