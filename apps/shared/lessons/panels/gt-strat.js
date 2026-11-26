// Fender Stratocaster control area, for FaithfulPanel + GuitarPickups.adapter. Drawn front-on, neck to the left, bridge to the right;
// pickups placed at Tillman's distances from the bridge (6.375 / 3.875 / 1.625 in) at 60 units an inch, the bridge pickup slanted.
// Body outline, pickguard, knob and switch positions are this site's drawing after photos of the instrument (approximate, no
// measured drawing used). No logo or headstock: plain text names only.
(function () {
  var PX = 60, BR = 720, X = function (d) { return BR - d * PX; };
  function pu(d, label, slant) { var x = X(d), a = slant || 0, h = 150, w = 40;
    return [{ t: "shape", d: "M" + (x - w / 2 + a) + " 118 h" + w + " L" + (x + w / 2 - a) + " 268 h-" + w + " Z", fill: "#f3f0e6", stroke: "ink2", title: label + " single-coil pickup" },
      { t: "label", x: x, y: 290, text: label, size: 10 }]
      .concat([0, 1, 2, 3, 4, 5].map(function (i) { var y = 130 + i * 26, xx = x + a * (1 - i / 2.5); return { t: "shape", d: "M" + (xx - 4) + " " + y + " a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", fill: "#8d8f93", stroke: "#555", sw: .6 }; })); }
  var items = [
    { t: "shape", d: "M40 40 C200 0 380 10 520 40 C640 0 820 10 880 120 C910 190 900 260 870 320 C820 410 640 390 540 350 C420 395 220 410 90 350 C20 300 10 120 40 40 Z", fill: "body", stroke: "ink2", sw: 2, title: "Body" },
    { t: "shape", d: "M80 70 C230 40 420 45 560 70 C650 50 760 70 800 150 L800 250 C780 330 700 360 620 340 C520 370 300 380 120 330 C70 300 60 120 80 70 Z", fill: "#f7f7f4", stroke: "ink2", title: "Pickguard (white)" }
  ].concat(pu(6.375, "Neck"), pu(3.875, "Middle"), pu(1.625, "Bridge", 8), [
    { t: "shape", d: "M" + (BR + 30) + " 110 h50 v170 h-50 Z", fill: "#c9cbce", stroke: "ink2", title: "Bridge and saddles" },
    { t: "label", x: BR + 55, y: 300, text: "Bridge", size: 9, dim: true },
    { t: "shape", d: "M0 140 H900 M0 166 H900 M0 192 H900 M0 218 H900 M0 244 H900 M0 270 H900".replace(/H900/g, "H780"), fill: "none", stroke: "ink2", sw: .7, op: .7, title: "Strings" },
    { t: "label", x: 580, y: 318, text: "5-way selector (1 = bridge … 5 = neck)", size: 9, dim: true },
    { t: "seg", k: "sel", x: 500, y: 322, w: 160, h: 18, opts: [["p5", "5"], ["p4", "4"], ["p3", "3"], ["p2", "2"], ["p1", "1"]] },
    { t: "knob", k: "vol", x: 700, y: 330, r: 15, label: "Volume", cap: "#f3f0e6" },
    { t: "knob", k: "tone1", x: 765, y: 345, r: 15, label: "Tone (neck)", cap: "#f3f0e6" },
    { t: "knob", k: "tone2", x: 830, y: 330, r: 15, label: "Tone (mid, bridge)", cap: "#f3f0e6" },
    { t: "jack", x: 860, y: 230, r: 9, label: "Output (on the face)" },
    { t: "label", x: 60, y: 30, text: "STRATOCASTER-STYLE CONTROLS", size: 11, anchor: "start", bold: true }]);
  FaithfulPanel.register({ id: "gt-strat", name: "Stratocaster", w: 900, h: 400, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Pickup distances from the bridge: Tillman (2002)", "Controls: Wikipedia, \"Fender Stratocaster\" (one volume, tone 1 = neck, tone 2 = middle + bridge on many modern models)"],
    approx: "Pickup distances are Tillman's; body, pickguard and knob positions are this page's drawing (approximate). The 5-way order runs 5 (neck) to 1 (bridge) as the lever moves away from the neck." });
})();
