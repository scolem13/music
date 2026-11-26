// Marshall 1959 Super Lead "Plexi" (1965-69), for FaithfulPanel + Amps.adapter. Gold-coloured plexiglass front panel: Presence, Bass,
// Middle, Treble, Volume I (High Treble), Volume II (Normal), four inputs; "jumpered" = a short cable from a High Treble input to a
// Normal input so both volumes mix (Wikipedia, "Marshall Amplification": daisy-chaining inputs). Positions approximate; no logos.
(function () {
  var kn = function (k, x, label) { return { t: "knob", k: k, x: x, y: 72, r: 15, label: label, cap: "#c8a640" }; };
  FaithfulPanel.register({ id: "amp-plexi", name: "1959 Super Lead (jumpered)", w: 760, h: 150, knob: "cap", accent: "k", accents: { k: "#c8a640" },
    items: [
      { t: "shape", d: "M6 18 h748 v118 h-748 Z", fill: "body", stroke: "ink2", sw: 2, title: "Front panel" },
      { t: "shape", d: "M6 18 h748 v10 h-748 Z", fill: "#c9a844", stroke: "ink2", sw: 1, title: "Gold plexiglass front panel (the colour shown as a band so the legends read on white and black)" },
      { t: "jack", x: 40, y: 58, r: 8, label: "I" }, { t: "jack", x: 40, y: 98, r: 8, label: "II" }, { t: "jack", x: 80, y: 58, r: 8, label: "I" }, { t: "jack", x: 80, y: 98, r: 8, label: "II" },
      { t: "shape", d: "M48 58 C 62 70, 66 86, 72 98", fill: "none", stroke: "#111", sw: 3, title: "Jumper cable (High Treble to Normal)" },
      { t: "label", x: 60, y: 130, text: "HIGH TREBLE / NORMAL", size: 7.5 },
      kn("presence", 150, "PRESENCE"), kn("bass", 220, "BASS"), kn("middle", 290, "MIDDLE"), kn("treble", 360, "TREBLE"), kn("vol1", 440, "VOLUME I"), kn("vol2", 510, "VOLUME II"),
      { t: "label", x: 640, y: 66, text: "SUPER LEAD 100", size: 11, bold: true }, { t: "label", x: 620, y: 100, text: "STANDBY   ON", size: 8 }],
    src: ["Model, panel and jumpering: Wikipedia, \"Marshall Amplification\""], approx: "Positions after photos (approximate); no logo script." });
})();
