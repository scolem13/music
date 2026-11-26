// Tube Screamer TS808 face, for FaithfulPanel + Pedals.adapter. Layout after photos: three knobs (Drive, Tone in the middle, Level)
// across the top, the LED between, a wide footswitch below; green paint. Positions approximate (no measured drawing); no logos.
(function () {
  FaithfulPanel.register({ id: "pd-ts808", name: "Tube Screamer TS808", w: 260, h: 400, knob: "cap", accent: "k", accents: { k: "#e8e8e8" },
    items: [
      { t: "shape", d: "M20 10 h220 a12 12 0 0 1 12 12 v356 a12 12 0 0 1 -12 12 h-220 a12 12 0 0 1 -12 -12 v-356 a12 12 0 0 1 12 -12 Z", fill: "#3f8a4a", stroke: "ink2", sw: 2, title: "Enclosure (green)" },
      { t: "knob", k: "drive", x: 60, y: 62, r: 18, label: "OVERDRIVE", cap: "#1a1a1a" },
      { t: "knob", k: "level", x: 200, y: 62, r: 18, label: "LEVEL", cap: "#1a1a1a" },
      { t: "knob", k: "tone", x: 130, y: 100, r: 14, label: "TONE", cap: "#1a1a1a" },
      { t: "led", k: "on", x: 130, y: 40, r: 5 },
      { t: "label", x: 130, y: 175, text: "TUBE SCREAMER (TS808-style)", size: 12, bold: true },
      { t: "key", k: "on", x: 45, y: 210, w: 170, h: 120, label: "ON / OFF", cap: "#d8d8d8" },
      { t: "jack", x: 18, y: 120, r: 8, label: "OUT" }, { t: "jack", x: 242, y: 120, r: 8, label: "IN" }],
    src: ["Controls: Wikipedia, \"Ibanez Tube Screamer\" (Drive, Tone, Level)"], approx: "Knob, LED and switch positions after photos (approximate); legends plain text, no logo." });
})();
