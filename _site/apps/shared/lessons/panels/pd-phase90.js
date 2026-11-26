// MXR Phase 90 face, for FaithfulPanel + Pedals.adapter: one Speed knob, a footswitch, an LED (early ones had none: MXR article), orange
// paint. The feedback choice is the page's (inside the real pedal it is a resistor that changed between versions). No logo.
(function () {
  FaithfulPanel.register({ id: "pd-phase90", name: "Phase 90", w: 220, h: 380, knob: "cap", accent: "k", accents: { k: "#222" },
    items: [
      { t: "shape", d: "M18 10 h184 a10 10 0 0 1 10 10 v340 a10 10 0 0 1 -10 10 h-184 a10 10 0 0 1 -10 -10 v-340 a10 10 0 0 1 10 -10 Z", fill: "#f07d1a", stroke: "ink2", sw: 2, title: "Enclosure (orange)" },
      { t: "knob", k: "speed", x: 110, y: 70, r: 22, label: "SPEED", cap: "#111" },
      { t: "label", x: 110, y: 155, text: "PHASE 90 (style)", size: 13, bold: true },
      { t: "led", k: "on", x: 110, y: 185, r: 5, label: "LED (later units)" },
      { t: "key", k: "on", x: 75, y: 220, w: 70, h: 70, label: "ON / OFF", cap: "#8d8f93" },
      { t: "label", x: 110, y: 312, text: "Inside (page's switch): feedback resistor", size: 8, dim: true },
      { t: "seg", k: "fb", x: 50, y: 320, w: 120, h: 20, opts: [["on", "fitted"], ["off", "left out"]] }],
    src: ["One Speed knob: ElectroSmash's outline (search summary)", "No LEDs before 1981: Wikipedia, \"MXR\""], approx: "Positions approximate. Which logo version had the feedback resistor: unverified." });
})();
