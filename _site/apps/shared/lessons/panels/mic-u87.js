// Neumann U 87 Ai: satin nickel body and head grille; the polar pattern switch on the front under the grille; pad and low-cut on the
// back (Neumann product page: "switchable low cut and pad"; photos for where). Front and back drawn side by side. The pad as 10 dB is
// inferred from max SPL 117 -> 127 dB; the low-cut's corner is the site's. Proportions approximate; no logo.
(function () {
  var body = function (x, t) { return [
    { t: "shape", d: "M" + x + " 50 q0 -34 40 -34 q40 0 40 34 v20 h-80 Z", fill: "#c9c6bd", stroke: "ink", sw: 1.5, title: "Head grille (" + t + ")" },
    { t: "shape", d: "M" + (x + 8) + " 30 h64 M" + (x + 3) + " 42 h74 M" + (x + 1) + " 56 h78", fill: "none", stroke: "#8a877f", sw: 1, title: "Grille mesh" },
    { t: "shape", d: "M" + x + " 70 h80 v130 q0 10 -10 10 h-60 q-10 0 -10 -10 Z", fill: "#d8d5cc", stroke: "ink", sw: 1.5, title: "Body (satin nickel)" }]; };
  FaithfulPanel.register({ id: "mic-u87", name: "U 87 Ai", w: 360, h: 240,
    items: body(30, "front").concat(body(220, "back"), [
      { t: "label", x: 70, y: 232, text: "FRONT", size: 9, bold: true }, { t: "label", x: 260, y: 232, text: "BACK", size: 9, bold: true },
      { t: "seg", k: "pattern", x: 34, y: 96, w: 72, h: 22, opts: [["omni", "○"], ["cardioid", "♡"], ["fig8", "8"]] },
      { t: "label", x: 70, y: 132, text: "PATTERN", size: 8, dim: true },
      { t: "key", k: "pad", x: 228, y: 96, w: 30, h: 20, label: "-10", below: true, led: true, cap: "#333" },
      { t: "key", k: "lowcut", x: 262, y: 96, w: 30, h: 20, label: "LOW CUT", below: true, led: true, cap: "#333" }]),
    src: ["Neumann U 87 Ai product page (neumann.com): three patterns, switchable pad and low cut", "Positions after photos"],
    approx: "Switch shapes simplified (the real ones are small slide switches); positions after photos; pad 10 dB inferred; no logo." });
})();
