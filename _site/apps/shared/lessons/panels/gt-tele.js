// Fender Telecaster control area (FaithfulPanel + GuitarPickups.adapter): the neck pickup under a chrome cover in the pickguard, the
// slanted bridge pickup in the metal bridge plate, a control plate with the 3-way lever, Volume and Tone. Distances from the bridge
// (neck 6.3 in, bridge 1.45 in) and all positions are this site's estimates after photos (approximate); no logo.
(function () {
  var PX = 60, BR = 720, X = function (d) { return BR - d * PX; };
  var items = [
    { t: "shape", d: "M40 50 C220 10 420 20 540 50 C660 15 840 30 880 140 C900 220 890 300 850 345 C770 410 600 385 520 360 C400 400 200 410 80 350 C20 300 15 130 40 50 Z", fill: "body", stroke: "ink2", sw: 2, title: "Body" },
    { t: "shape", d: "M70 80 C220 50 380 60 470 80 L470 330 C330 370 180 370 90 330 C60 290 55 120 70 80 Z", fill: "#111111", stroke: "ink2", title: "Pickguard (black, as before 1955)" },
    { t: "shape", d: "M" + (X(6.3) - 22) + " 118 h44 v150 h-44 Z", fill: "#c9cbce", stroke: "ink2", title: "Neck pickup (chrome cover)" },
    { t: "label", x: X(6.3), y: 290, text: "Neck", size: 10 },
    { t: "shape", d: "M560 95 H800 V295 H560 Z", fill: "#c9cbce", stroke: "ink2", title: "Bridge plate" },
    { t: "shape", d: "M" + (X(1.45) - 28) + " 114 l40 0 l10 160 l-40 0 Z", fill: "#1b1b1b", stroke: "ink2", title: "Bridge pickup (slanted, in the bridge plate)" },
    { t: "label", x: X(1.45), y: 312, text: "Bridge", size: 10 },
    { t: "shape", d: "M0 140 H780 M0 166 H780 M0 192 H780 M0 218 H780 M0 244 H780 M0 270 H780", fill: "none", stroke: "ink2", sw: .7, op: .7, title: "Strings" },
    { t: "shape", d: "M590 330 L870 300 a14 14 0 0 1 4 28 L594 358 a14 14 0 0 1 -4 -28 Z", fill: "#c9cbce", stroke: "ink2", title: "Control plate" },
    { t: "seg", k: "sel", x: 600, y: 336, w: 96, h: 16, opts: [["neck", "N"], ["both", "B"], ["bridge", "Br"]] },
    { t: "label", x: 648, y: 372, text: "3-way: neck / both / bridge", size: 8.5, dim: true },
    { t: "knob", k: "vol", x: 750, y: 328, r: 13, label: "Volume", cap: "#d9dbde" },
    { t: "knob", k: "tone", x: 830, y: 318, r: 13, label: "Tone", cap: "#d9dbde" },
    { t: "jack", x: 870, y: 230, r: 9, label: "Output (on the side)" },
    { t: "label", x: 60, y: 34, text: "TELECASTER-STYLE CONTROLS", size: 11, anchor: "start", bold: true }];
  FaithfulPanel.register({ id: "gt-tele", name: "Telecaster", w: 900, h: 400, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Controls and the 1967 wiring (neck / both / bridge): Wikipedia, \"Fender Telecaster\""],
    approx: "Positions and pickup distances are this page's drawing after photos (approximate). Earlier Telecasters (1950-1967) were wired differently: not modelled." });
})();
