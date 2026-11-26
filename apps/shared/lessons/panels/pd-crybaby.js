// Cry Baby wah face, for FaithfulPanel + Pedals.adapter: the treadle seen from above (drawn as a slider, heel at the bottom, toe at the
// top; pressing the toe raises the resonance), the footswitch under the toe, and the page's own auto controls (not on the pedal,
// marked so). Positions approximate; no logo.
(function () {
  FaithfulPanel.register({ id: "pd-crybaby", name: "Cry Baby wah", w: 300, h: 440, knob: "cap", accent: "w", accents: { w: "#e8a400" },
    items: [
      { t: "shape", d: "M40 10 h220 a14 14 0 0 1 14 14 v330 h-248 v-330 a14 14 0 0 1 14 -14 Z", fill: "#1d1d1d", stroke: "ink2", sw: 2, title: "Enclosure and treadle (black)" },
      { t: "shape", d: "M62 30 h176 v300 h-176 Z", fill: "#2b2b2b", stroke: "#555", title: "Treadle (rubber grip)" },
      { t: "vslider", k: "pos", x: 135, y: 45, w: 30, h: 270, label: "TREADLE" },
      { t: "label", x: 150, y: 40, text: "toe", size: 9, dim: true }, { t: "label", x: 150, y: 345, text: "heel", size: 9, dim: true },
      { t: "label", x: 100, y: 180, text: "CRY BABY (style)", size: 12, bold: true, rot: -90 },
      { t: "key", k: "on", x: 205, y: 40, w: 28, h: 22, label: "", cap: "#8d8f93", aria: "On / off (under the toe)" },
      { t: "led", k: "on", x: 219, y: 75, r: 4 },
      { t: "label", x: 150, y: 368, text: "This page's own (not on the pedal): who moves the treadle", size: 8, dim: true },
      { t: "seg", k: "mode", x: 40, y: 376, w: 160, h: 20, opts: [["foot", "Your foot"], ["rock", "Rocking"], ["env", "Playing"]] },
      { t: "knob", k: "rate", x: 245, y: 395, r: 12, label: "Rock speed", cap: "#555" }],
    src: ["Band-pass swept by the treadle: Wikipedia, \"Wah-wah pedal\""], approx: "Treadle drawn as a slider; the auto controls are the page's, not the pedal's. Positions approximate." });
})();
