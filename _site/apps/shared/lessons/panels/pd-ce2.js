// Boss CE-2 Chorus face, for FaithfulPanel + Pedals.adapter: Rate and Depth (Guitar World), the check LED, the long Boss-style pedal
// lid. Light blue paint. Positions approximate; no logo.
(function () {
  FaithfulPanel.register({ id: "pd-ce2", name: "CE-2 Chorus", w: 240, h: 400, knob: "cap", accent: "k", accents: { k: "#222" },
    items: [
      { t: "shape", d: "M15 10 h210 a10 10 0 0 1 10 10 v360 a10 10 0 0 1 -10 10 h-210 a10 10 0 0 1 -10 -10 v-360 a10 10 0 0 1 10 -10 Z", fill: "#7fc4e4", stroke: "ink2", sw: 2, title: "Enclosure (light blue)" },
      { t: "knob", k: "rate", x: 70, y: 60, r: 18, label: "RATE", cap: "#111" },
      { t: "knob", k: "depth", x: 170, y: 60, r: 18, label: "DEPTH", cap: "#111" },
      { t: "led", k: "on", x: 120, y: 40, r: 5, label: "CHECK" },
      { t: "label", x: 120, y: 125, text: "Chorus  CE-2 (style)", size: 12, bold: true },
      { t: "key", k: "on", x: 25, y: 150, w: 190, h: 225, label: "PEDAL (on / off)", cap: "#6ab3d6" }],
    src: ["Rate and Depth only: Guitar World, \"Boss CE-2 chorus pedal history\""], approx: "Positions approximate; no logo." });
})();
