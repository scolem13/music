// Gibson Les Paul Standard control area (FaithfulPanel + GuitarPickups.adapter): two humbuckers (two coils each, poles drawn), the
// three-way toggle in the upper bout labelled Rhythm / Treble, two volume and two tone "top hat" knobs in the lower bout.
// Pickup centres 5.9 / 1.55 in from the bridge and all positions are this site's estimates after photos (approximate); no logo.
(function () {
  var PX = 60, BR = 700, X = function (d) { return BR - d * PX; };
  function hb(d, label) { var x = X(d), o = [{ t: "shape", d: "M" + (x - 42) + " 112 h84 v164 h-84 Z", fill: "#3a2a12", stroke: "ink2", title: label + " humbucker (surround)" },
      { t: "shape", d: "M" + (x - 36) + " 118 h34 v152 h-34 Z M" + (x + 2) + " 118 h34 v152 h-34 Z", fill: "#cdb36a", stroke: "#7d6a30", title: label + " humbucker: two coils, wound and magnetised opposite ways" },
      { t: "label", x: x, y: 296, text: label, size: 10 }];
    [0, 1, 2, 3, 4, 5].forEach(function (i) { var y = 130 + i * 26; o.push({ t: "shape", d: "M" + (x - 23) + " " + y + " a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M" + (x + 15) + " " + y + " a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", fill: "#8d8f93", stroke: "#555", sw: .6 }); });
    return o; }
  var items = [
    { t: "shape", d: "M60 60 C220 20 420 40 520 70 C620 20 820 20 870 150 C900 240 860 340 760 370 C650 400 560 370 500 350 C380 400 180 400 90 340 C30 290 30 110 60 60 Z", fill: "body", stroke: "ink2", sw: 2, title: "Body (carved top)" },
    { t: "shape", d: "M150 90 C230 70 300 75 330 95 L330 300 C280 330 200 330 150 310 Z", fill: "#efe6cf", stroke: "ink2", op: .9, title: "Pickguard (raised)" }
  ].concat(hb(5.9, "Neck (rhythm)"), hb(1.55, "Bridge (treble)"), [
    { t: "shape", d: "M" + (BR + 40) + " 120 h18 v150 h-18 Z M" + (BR + 100) + " 120 h14 v150 h-14 Z", fill: "#c9cbce", stroke: "ink2", title: "Bridge and stop tailpiece" },
    { t: "shape", d: "M0 140 H820 M0 166 H820 M0 192 H820 M0 218 H820 M0 244 H820 M0 270 H820", fill: "none", stroke: "ink2", sw: .7, op: .7, title: "Strings" },
    { t: "label", x: 480, y: 42, text: "RHYTHM        TREBLE", size: 9, bold: true },
    { t: "seg", k: "sel", x: 425, y: 50, w: 120, h: 18, opts: [["rhythm", "Rhythm"], ["both", "Both"], ["treble", "Treble"]] },
    { t: "label", x: 485, y: 84, text: "3-way toggle", size: 8.5, dim: true },
    { t: "knob", k: "vol1", x: 660, y: 318, r: 15, label: "Volume (neck)", cap: "#d8b24a" },
    { t: "knob", k: "vol2", x: 740, y: 296, r: 15, label: "Volume (bridge)", cap: "#d8b24a" },
    { t: "knob", k: "tone1", x: 700, y: 365, r: 15, label: "Tone (neck)", cap: "#d8b24a" },
    { t: "knob", k: "tone2", x: 790, y: 345, r: 15, label: "Tone (bridge)", cap: "#d8b24a" },
    { t: "switch", k: "phase", x: 40, y: 360, w: 230, h: 20, label: "What if: neck out of phase (a mod)", a: "mod" },
    { t: "jack", x: 860, y: 260, r: 9, label: "Output (on the side)" },
    { t: "label", x: 70, y: 34, text: "LES PAUL-STYLE CONTROLS", size: 11, anchor: "start", bold: true }]);
  FaithfulPanel.register({ id: "gt-lespaul", name: "Les Paul", w: 900, h: 400, knob: "cap", accent: "sel", accents: { sel: "#e8a400", mod: "#d04a8a" }, items: items,
    src: ["Controls (two volume, two tone, three-way switch): Wikipedia, \"Gibson Les Paul\""],
    approx: "Positions and pickup distances are this page's drawing after photos (approximate). The out-of-phase switch is not on a stock Les Paul: a what-if, as some players have added." });
})();
