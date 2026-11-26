// Fender Bassman 5F6-A (tweed, 1958-60), for FaithfulPanel + Amps.adapter. Chrome top panel facing up: four inputs (Bright and Normal,
// two each), Bright volume, Normal volume, Treble, Bass, Middle, Presence (Wikipedia, "Fender Bassman": three-knob stack, Presence).
// Jumpered as players do. Positions approximate; no logos.
(function () {
  var kn = function (k, x, label) { return { t: "knob", k: k, x: x, y: 72, r: 14, label: label, cap: "#2a1a10" }; };
  FaithfulPanel.register({ id: "amp-bassman", name: "Bassman 5F6-A", w: 760, h: 150, knob: "cap", accent: "k", accents: { k: "#c8b27a" },
    items: [
      { t: "shape", d: "M6 18 h748 v118 h-748 Z", fill: "body", stroke: "ink2", sw: 2, title: "Front panel" },
      { t: "shape", d: "M6 18 h748 v10 h-748 Z", fill: "#bfc3c7", stroke: "ink2", sw: 1, title: "Chrome control panel (the colour shown as a band so the legends read on white and black)" },
      { t: "jack", x: 35, y: 58, r: 8, label: "BRIGHT" }, { t: "jack", x: 35, y: 98, r: 8, label: "" }, { t: "jack", x: 80, y: 58, r: 8, label: "NORMAL" }, { t: "jack", x: 80, y: 98, r: 8, label: "" },
      { t: "shape", d: "M43 98 C 55 84, 64 70, 72 58", fill: "none", stroke: "#111", sw: 3, title: "Jumper cable" },
      kn("vol2", 160, "NORMAL"), kn("vol1", 225, "BRIGHT"), kn("treble", 300, "TREBLE"), kn("bass", 365, "BASS"), kn("middle", 430, "MIDDLE"), kn("presence", 495, "PRESENCE"),
      { t: "label", x: 640, y: 66, text: "BASSMAN", size: 12, bold: true }, { t: "label", x: 640, y: 100, text: "STANDBY   POWER", size: 8 }],
    src: ["Controls: Wikipedia, \"Fender Bassman\" (5F6 three-knob tone stack, Presence)"], approx: "Positions after photos (approximate); no logo." });
})();
