// Ampeg SVT (1969-), for FaithfulPanel + Amps.adapter. Black faceplate with blue (1969-70 "blue line") or black screen printing
// (Wikipedia, "Ampeg SVT"); drawn with blue lines. Volume, Bass, Midrange, Treble, the five-position Midrange frequency, Ultra Lo / Ultra Hi:
// controls from general knowledge (unverified). Positions approximate; no logos.
(function () {
  var kn = function (k, x, label) { return { t: "knob", k: k, x: x, y: 70, r: 14, label: label, cap: "#111" }; };
  FaithfulPanel.register({ id: "amp-svt", name: "SVT", w: 800, h: 150, knob: "cap", accent: "k", accents: { k: "#4a78c8" },
    items: [
      { t: "shape", d: "M6 18 h788 v118 h-788 Z", fill: "body", stroke: "ink2", sw: 2, title: "Front panel" },
      { t: "shape", d: "M6 18 h788 v10 h-788 Z", fill: "#141414", stroke: "ink2", sw: 1, title: "Black faceplate (the colour shown as a band so the legends read on white and black)" },
      { t: "shape", d: "M130 40 h360 v70 h-360 Z", fill: "none", stroke: "#4a78c8", sw: 2, title: "Blue line round the tone controls" },
      { t: "jack", x: 30, y: 70, r: 8, label: "INPUT" },
      kn("volume", 90, "VOLUME"), kn("bass", 170, "BASS"), kn("middle", 250, "MIDRANGE"), kn("treble", 330, "TREBLE"),
      { t: "seg", k: "midf", x: 370, y: 58, w: 115, h: 22, size: 7.5, opts: [["220", "220"], ["450", "450"], ["800", "800"], ["1600", "1.6k"], ["3000", "3k"]] },
      { t: "label", x: 428, y: 98, text: "MID FREQ (Hz)", size: 7.5 },
      { t: "key", k: "ultralo", x: 520, y: 58, w: 50, h: 22, label: "ULTRA LO", below: true, led: true, cap: "#333" },
      { t: "key", k: "ultrahi", x: 590, y: 58, w: 50, h: 22, label: "ULTRA HI", below: true, led: true, cap: "#333" },
      { t: "label", x: 720, y: 74, text: "STANDBY   POWER", size: 8, dim: true }],
    src: ["Faceplate lines: Wikipedia, \"Ampeg SVT\"; controls: general knowledge (unverified)"], approx: "Positions guessed; no logo." });
})();
