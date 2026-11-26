// Echoplex EP-3 face, for FaithfulPanel + Pedals.adapter: the tape box's front with the delay slider (the record head's position),
// Repeats and Echo Volume knobs, a footswitch on its cable. Controls' names and places are the page's reading of photos (unverified);
// no logo.
(function () {
  FaithfulPanel.register({ id: "pd-echoplex", name: "Echoplex EP-3", w: 460, h: 280, knob: "cap", accent: "w", accents: { w: "#e8a400" },
    items: [
      { t: "shape", d: "M10 10 h440 v200 h-440 Z", fill: "#2a2a2a", stroke: "ink2", sw: 2, title: "Tape box (black)" },
      { t: "shape", d: "M30 30 h220 v90 h-220 Z", fill: "#444", stroke: "#666", title: "Tape cartridge cover" },
      { t: "hslider", k: "delay", x: 40, y: 140, w: 200, h: 22, label: "ECHO DELAY (head)", fmt: function (v) { return Math.round(Pedals.PEDALS.echoplex.time({ delay: v }) * 1000) + " ms"; } },
      { t: "knob", k: "repeats", x: 310, y: 80, r: 18, label: "REPEATS", cap: "#ddd" },
      { t: "knob", k: "echo", x: 390, y: 80, r: 18, label: "ECHO VOLUME", cap: "#ddd" },
      { t: "label", x: 350, y: 150, text: "ECHOPLEX EP-3 (style)", size: 12, bold: true },
      { t: "led", k: "on", x: 350, y: 175, r: 4, label: "" },
      { t: "key", k: "on", x: 330, y: 228, w: 60, h: 40, label: "FOOT SW", cap: "#8d8f93" },
      { t: "shape", d: "M360 228 C 360 215 400 215 420 210", fill: "none", stroke: "ink2", sw: 2, title: "Footswitch cable" }],
    src: ["Moving record head sets the delay: Wikipedia, \"Echoplex\""], approx: "Control places and names after photos (unverified); delay range 60-750 ms is the page's." });
})();
