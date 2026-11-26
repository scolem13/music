// Vox AC30 Top Boost (AC30/6 with the Top Boost circuit on the top panel, 1963-), for FaithfulPanel + Amps.adapter. Top-mounted control
// panel, pointer ("chicken-head") knobs drawn as plain capped knobs. Modelled: Brilliant volume, Treble, Bass, Cut, the Vib-Trem
// switch and Speed (Wikipedia, "Vox AC30": channels, Top Boost bass and treble, Cut). The other channels' volumes are dimmed.
// Positions approximate; no logos.
(function () {
  var kn = function (k, x, label) { return { t: "knob", k: k, x: x, y: 72, r: 14, label: label, cap: "#e9e4d6" }; };
  FaithfulPanel.register({ id: "amp-ac30", name: "AC30 Top Boost", w: 780, h: 150, knob: "cap", accent: "k", accents: { k: "#c9a24a" },
    items: [
      { t: "shape", d: "M6 18 h768 v118 h-768 Z", fill: "body", stroke: "ink2", sw: 2, title: "Front panel" },
      { t: "shape", d: "M6 18 h768 v10 h-768 Z", fill: "#7a1f1f", stroke: "ink2", sw: 1, title: "Top control panel (copper-red) (the colour shown as a band so the legends read on white and black)" },
      { t: "label", x: 70, y: 36, text: "VIB-TREM", size: 9, bold: true }, { t: "label", x: 260, y: 36, text: "NORMAL", size: 9, bold: true, dim: true }, { t: "label", x: 420, y: 36, text: "BRILLIANT / TOP BOOST", size: 9, bold: true },
      { t: "seg", k: "vt", x: 20, y: 60, w: 110, h: 22, opts: [["off", "OFF"], ["vibrato", "VIB"], ["tremolo", "TREM"]] },
      kn("speed", 160, "SPEED"),
      { t: "knob", k: "vib_volume", x: 215, y: 72, r: 12, label: "VOL", cap: "#e9e4d6" }, { t: "knob", k: "normal_volume", x: 275, y: 72, r: 12, label: "VOL", cap: "#e9e4d6" },
      kn("volume", 345, "VOLUME"), kn("treble", 410, "TREBLE"), kn("bass", 475, "BASS"), kn("cut", 560, "CUT"),
      { t: "jack", x: 630, y: 72, r: 8, label: "IN" }, { t: "jack", x: 660, y: 72, r: 8, label: "IN" },
      { t: "label", x: 720, y: 76, text: "POWER", size: 8, dim: true }],
    src: ["Channels, Top Boost bass / treble, Cut: Wikipedia, \"Vox AC30\""], approx: "Positions after photos (approximate); knob shapes plain; no logo." });
})();
