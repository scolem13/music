// Fuzz Face face, for FaithfulPanel + Pedals.adapter. The round enclosure with two knobs (Volume, Fuzz) and a footswitch, drawn after
// photos (positions approximate, no measured drawing; no logo). The original had no LED: the LED here is the page's, marked so.
(function () {
  FaithfulPanel.register({ id: "pd-fuzzface", name: "Fuzz Face", w: 300, h: 320, knob: "cap", accent: "k", accents: { k: "#e8e8e8" },
    items: [
      { t: "shape", d: "M150 10 a150 150 0 1 0 0.1 0 Z", fill: "#c23a2e", stroke: "ink2", sw: 2, title: "Round enclosure (red; also grey and blue in its history)" },
      { t: "knob", k: "vol", x: 105, y: 95, r: 17, label: "VOLUME", cap: "#111" },
      { t: "knob", k: "fuzz", x: 195, y: 95, r: 17, label: "FUZZ", cap: "#111" },
      { t: "label", x: 150, y: 165, text: "FUZZ FACE (style)", size: 13, bold: true },
      { t: "key", k: "on", x: 110, y: 205, w: 80, h: 50, label: "ON / OFF", cap: "#d8d8d8" },
      { t: "led", k: "on", x: 150, y: 280, r: 4, label: "LED (not on the original)" }],
    src: ["Controls: Wikipedia, \"Fuzz Face\" (Volume and Fuzz)"], approx: "Round enclosure after photos; positions approximate. The original had no LED (this page adds one to show on/off)." });
})();
