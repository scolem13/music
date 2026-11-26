// Mesa/Boogie Dual Rectifier (1991-), one channel, for FaithfulPanel + Amps.adapter. Diamond-plate front (Wikipedia, "Mesa Boogie":
// "characteristic steel, diamond faceplate") drawn as a plain grey plate. Gain, Treble, Mid, Bass, Presence, Master, Mode and the
// rectifier switch as on one channel; mode names and the switch from general knowledge (unverified). Positions approximate; no logos.
(function () {
  var kn = function (k, x, label) { return { t: "knob", k: k, x: x, y: 70, r: 14, label: label, cap: "#111" }; };
  FaithfulPanel.register({ id: "amp-rect", name: "Dual Rectifier (one channel)", w: 800, h: 150, knob: "cap", accent: "k", accents: { k: "#bbbbbb" },
    items: [
      { t: "shape", d: "M6 18 h788 v118 h-788 Z", fill: "body", stroke: "ink2", sw: 2, title: "Front panel" },
      { t: "shape", d: "M6 18 h788 v10 h-788 Z", fill: "#8d9196", stroke: "ink2", sw: 1, title: "Diamond-plate front (drawn plain) (the colour shown as a band so the legends read on white and black)" },
      { t: "jack", x: 30, y: 70, r: 8, label: "INPUT" },
      kn("gain", 90, "GAIN"), kn("treble", 150, "TREBLE"), kn("middle", 210, "MID"), kn("bass", 270, "BASS"), kn("presence", 330, "PRESENCE"), kn("master", 390, "MASTER"),
      { t: "seg", k: "mode", x: 440, y: 58, w: 150, h: 22, opts: [["raw", "RAW"], ["vintage", "VINTAGE"], ["modern", "MODERN"]] },
      { t: "label", x: 515, y: 98, text: "MODE", size: 8 },
      { t: "seg", k: "rect", x: 610, y: 58, w: 120, h: 22, opts: [["silicon", "DIODE"], ["tube", "TUBE"]] },
      { t: "label", x: 670, y: 98, text: "RECTIFIER", size: 8 }],
    src: ["Faceplate: Wikipedia, \"Mesa Boogie\"; controls and switches: general knowledge (unverified)"], approx: "Positions guessed; one channel of three; no logo." });
})();
