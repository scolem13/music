// Fender Twin Reverb (blackface, AB763) Vibrato channel, for FaithfulPanel + Amps.adapter. Black front panel, white legends, black skirted
// knobs numbered 1-10, red jewel pilot light (Wikipedia, "Fender Twin Reverb"). Only the Vibrato channel is modelled: the Normal
// channel's inputs and knobs are drawn dimmed. Positions after photos (approximate); no logos.
(function () {
  var kn = function (k, x, label) { return { t: "knob", k: k, x: x, y: 70, r: 15, label: label, cap: "#111" }; };
  FaithfulPanel.register({ id: "amp-twin", name: "Twin Reverb (blackface)", w: 820, h: 150, knob: "cap", accent: "k", accents: { k: "#d8d8d8" },
    items: [
      { t: "shape", d: "M6 18 h808 v118 h-808 Z", fill: "body", stroke: "ink2", sw: 2, title: "Front panel" },
      { t: "shape", d: "M6 18 h808 v10 h-808 Z", fill: "#111", stroke: "ink2", sw: 1, title: "Black front panel (the colour shown as a band so the legends read on white and black)" },
      { t: "label", x: 60, y: 36, text: "NORMAL", size: 10, bold: true, dim: true },
      { t: "jack", x: 30, y: 70, r: 8, label: "1" }, { t: "jack", x: 60, y: 70, r: 8, label: "2" },
      { t: "knob", k: "n_volume", x: 100, y: 70, r: 12, label: "VOLUME", cap: "#111" }, { t: "knob", k: "n_treble", x: 140, y: 70, r: 12, label: "TREBLE", cap: "#111" },
      { t: "knob", k: "n_middle", x: 180, y: 70, r: 12, label: "MIDDLE", cap: "#111" }, { t: "knob", k: "n_bass", x: 220, y: 70, r: 12, label: "BASS", cap: "#111" },
      { t: "label", x: 520, y: 36, text: "VIBRATO", size: 10, bold: true },
      { t: "jack", x: 265, y: 70, r: 8, label: "1" }, { t: "jack", x: 295, y: 70, r: 8, label: "2" },
      { t: "key", k: "bright", x: 318, y: 58, w: 34, h: 22, label: "BRIGHT", below: true, led: true, cap: "#333" },
      kn("volume", 385, "VOLUME"), kn("treble", 435, "TREBLE"), kn("middle", 485, "MIDDLE"), kn("bass", 535, "BASS"),
      kn("reverb", 595, "REVERB"), kn("speed", 645, "SPEED"), kn("intensity", 695, "INTENSITY"),
      { t: "shape", d: "M770 60 l10 -8 l10 8 l-4 12 h-12 Z", fill: "#d01818", stroke: "#600", sw: 1, title: "Pilot light (red jewel)" },
      { t: "label", x: 780, y: 100, text: "PILOT", size: 8, dim: true }],
    src: ["Controls and colours: Wikipedia, \"Fender Twin Reverb\" (Normal and Vibrato channels, bright switch, black-skirted 1-10 knobs, red jewel)"],
    approx: "Positions after photos (approximate); the Normal channel is drawn but not modelled; no logo." });
})();
