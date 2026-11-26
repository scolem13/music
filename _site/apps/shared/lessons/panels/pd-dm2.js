// Boss DM-2 Delay face, for FaithfulPanel + Pedals.adapter: Repeat Rate, Echo, Intensity (Boss DM-2W manual's names), check LED, the
// long pedal lid; pink-red paint. Positions approximate; no logo.
(function () {
  FaithfulPanel.register({ id: "pd-dm2", name: "DM-2 Delay", w: 240, h: 400, knob: "cap", accent: "k", accents: { k: "#222" },
    items: [
      { t: "shape", d: "M15 10 h210 a10 10 0 0 1 10 10 v360 a10 10 0 0 1 -10 10 h-210 a10 10 0 0 1 -10 -10 v-360 a10 10 0 0 1 10 -10 Z", fill: "#d84a5a", stroke: "ink2", sw: 2, title: "Enclosure (pink-red)" },
      { t: "knob", k: "rate", x: 50, y: 62, r: 16, label: "REPEAT RATE", cap: "#111", fmt: function (v) { return Math.round(Pedals.dm2Time(v) * 1000) + " ms"; } },
      { t: "knob", k: "echo", x: 120, y: 62, r: 16, label: "ECHO", cap: "#111" },
      { t: "knob", k: "intensity", x: 190, y: 62, r: 16, label: "INTENSITY", cap: "#111" },
      { t: "led", k: "on", x: 120, y: 30, r: 5, label: "" },
      { t: "label", x: 120, y: 125, text: "Delay  DM-2 (style)", size: 12, bold: true },
      { t: "key", k: "on", x: 25, y: 150, w: 190, h: 225, label: "PEDAL (on / off)", cap: "#c23c4c" }],
    src: ["Controls and 20-300 ms: Boss (DM-2W page, Standard mode); Repeat Rate clockwise = shorter"], approx: "Positions approximate; no logo." });
})();
