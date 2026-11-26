// Gibson SG Standard control area (FaithfulPanel + GuitarPickups.adapter): thin double-cutaway body, two humbuckers (the neck one
// further from the bridge than on a Les Paul, as the neck joins the body higher up), the toggle in the lower bout beside the four
// knobs. Pickup centres 6.6 / 1.55 in from the bridge and all positions are this site's estimates after photos; no logo.
(function () {
  var PX = 60, BR = 700, X = function (d) { return BR - d * PX; };
  function hb(d, label) { var x = X(d), o = [{ t: "shape", d: "M" + (x - 42) + " 112 h84 v164 h-84 Z", fill: "#111111", stroke: "ink2", title: label + " humbucker (surround)" },
      { t: "shape", d: "M" + (x - 36) + " 118 h34 v152 h-34 Z M" + (x + 2) + " 118 h34 v152 h-34 Z", fill: "#c9cbce", stroke: "#666", title: label + " humbucker: two coils" },
      { t: "label", x: x, y: 300, text: label, size: 10, bold: true }];
    [0, 1, 2, 3, 4, 5].forEach(function (i) { var y = 130 + i * 26; o.push({ t: "shape", d: "M" + (x - 23) + " " + y + " a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M" + (x + 15) + " " + y + " a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", fill: "#8d8f93", stroke: "#555", sw: .6 }); });
    return o; }
  var items = [
    { t: "shape", d: "M20 40 C120 70 200 80 260 60 L300 20 C420 60 520 60 600 40 C760 20 880 100 880 200 C880 300 780 380 600 370 C500 365 420 400 300 380 L260 340 C200 320 120 330 20 360 Z", fill: "#7a1e1e", stroke: "ink2", sw: 2, op: .85, title: "Body (double cutaway, horns)" },
    { t: "shape", d: "M300 80 C380 90 480 90 520 70 C600 80 620 200 605 282 C520 290 400 290 300 282 Z", fill: "#111111", stroke: "ink2", title: "Pickguard" }
  ].concat(hb(6.6, "Neck (rhythm)"), hb(1.55, "Bridge (treble)"), [
    { t: "shape", d: "M" + (BR + 40) + " 120 h18 v150 h-18 Z M" + (BR + 100) + " 120 h14 v150 h-14 Z", fill: "#c9cbce", stroke: "ink2", title: "Bridge and stop tailpiece" },
    { t: "shape", d: "M0 140 H820 M0 166 H820 M0 192 H820 M0 218 H820 M0 244 H820 M0 270 H820", fill: "none", stroke: "ink2", sw: .7, op: .7, title: "Strings" },
    { t: "seg", k: "sel", x: 520, y: 330, w: 120, h: 18, opts: [["rhythm", "Rhythm"], ["both", "Both"], ["treble", "Treble"]] },
    { t: "label", x: 580, y: 362, text: "3-way toggle", size: 8.5, dim: true },
    { t: "knob", k: "vol1", x: 770, y: 300, r: 14, label: "Vol (neck)", cap: "#d8b24a" },
    { t: "knob", k: "vol2", x: 840, y: 270, r: 14, label: "Vol (bridge)", cap: "#d8b24a" },
    { t: "knob", k: "tone1", x: 790, y: 360, r: 14, label: "Tone (neck)", cap: "#d8b24a" },
    { t: "knob", k: "tone2", x: 855, y: 330, r: 14, label: "Tone (bridge)", cap: "#d8b24a" },
    { t: "switch", k: "phase", x: 40, y: 372, w: 230, h: 20, label: "What if: neck out of phase (a mod)", a: "mod" },
    { t: "label", x: 40, y: 24, text: "SG-STYLE CONTROLS", size: 11, anchor: "start", bold: true }]);
  FaithfulPanel.register({ id: "gt-sg", name: "SG", w: 900, h: 400, knob: "cap", accent: "sel", accents: { sel: "#e8a400", mod: "#d04a8a" }, items: items,
    src: ["Controls (a volume and a tone for each pickup, three-way switch): Wikipedia, \"Gibson SG\""],
    approx: "Positions and pickup distances are this page's drawing after photos (approximate). The out-of-phase switch is a what-if, not stock." });
})();
