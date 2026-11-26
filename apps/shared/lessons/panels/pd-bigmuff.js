// Big Muff Pi face, for FaithfulPanel + Pedals.adapter. Three knobs (Volume, Tone, Sustain) as the "Triangle" first version laid them
// out (Wikipedia), a footswitch and LED. Positions approximate (no measured drawing); no logo or artwork.
(function () {
  FaithfulPanel.register({ id: "pd-bigmuff", name: "Big Muff Pi", w: 300, h: 400, knob: "cap", accent: "k", accents: { k: "#e8e8e8" },
    items: [
      { t: "shape", d: "M18 10 h264 a10 10 0 0 1 10 10 v360 a10 10 0 0 1 -10 10 h-264 a10 10 0 0 1 -10 -10 v-360 a10 10 0 0 1 10 -10 Z", fill: "#c9ccd0", stroke: "ink2", sw: 2, title: "Enclosure (bare metal)" },
      { t: "knob", k: "volume", x: 70, y: 60, r: 18, label: "VOLUME", cap: "#111" },
      { t: "knob", k: "sustain", x: 230, y: 60, r: 18, label: "SUSTAIN", cap: "#111" },
      { t: "knob", k: "tone", x: 150, y: 125, r: 18, label: "TONE", cap: "#111" },
      { t: "label", x: 150, y: 200, text: "BIG MUFF π (style)", size: 14, bold: true },
      { t: "led", k: "on", x: 150, y: 228, r: 5 },
      { t: "key", k: "on", x: 105, y: 260, w: 90, h: 80, label: "ON / OFF", cap: "#8d8f93" }],
    src: ["Controls and the triangle layout: Wikipedia, \"Big Muff\""], approx: "Positions approximate; no artwork or logo." });
})();
