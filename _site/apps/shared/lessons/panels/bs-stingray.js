// StingRay (2-band) control area, for FaithfulPanel + GuitarPickups.adapter (basses: apps/shared/lessons/bass-pickups.js). Drawn front-on, neck to
// the left, bridge to the right, 40 units an inch from the bridge. Pickup distances, body, pickguard and knob positions are this site's
// drawing after photos (approximate); no logos.
(function () {
  var PX = 40, BR = 780, X = function (d) { return BR - d * PX; }, YS = [150, 180, 210, 240];
  function poles(x, ys) { return ys.map(function (y) { return { t: "shape", d: "M" + (x - 4) + " " + y + " a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", fill: "#8d8f93", stroke: "#555", sw: .6 }; }); }
  function coil(x, y0, y1, w, fill, title) { return { t: "shape", d: "M" + (x - w / 2) + " " + y0 + " h" + w + " V" + y1 + " h-" + w + " Z", fill: fill, stroke: "ink2", title: title }; }
  var common = [
    { t: "shape", d: "M30 60 C200 20 420 30 540 60 C660 20 840 40 880 150 C900 220 890 300 850 340 C780 400 600 380 520 350 C400 390 200 400 80 340 C20 300 10 120 30 60 Z", fill: "body", stroke: "ink2", sw: 2, title: "Body" },
    { t: "shape", d: "M" + (BR + 20) + " 128 h44 v134 h-44 Z", fill: "#c9cbce", stroke: "ink2", title: "Bridge and saddles" },
    { t: "label", x: BR + 42, y: 280, text: "Bridge", size: 9, dim: true },
    { t: "shape", d: "M0 150 H" + (BR + 40) + " M0 180 H" + (BR + 40) + " M0 210 H" + (BR + 40) + " M0 240 H" + (BR + 40), fill: "none", stroke: "ink2", sw: 1.4, op: .7, title: "Strings (E A D G, E at the top here)" }];
  var x = X(4.0);
  var items = [{ t: "shape", d: "M120 90 C300 60 520 70 640 100 L700 300 C600 350 300 360 140 320 Z", fill: "#f7f7f4", stroke: "ink2", op: .95, title: "Pickguard" },
    { t: "shape", d: "M" + (x - 38) + " 130 h76 v130 h-76 Z", fill: "#202124", stroke: "ink2", title: "Humbucker (two coils in parallel)" }]
    .concat(poles(x - 16, YS), poles(x + 16, YS), [
    { t: "label", x: x, y: 282, text: "Humbucker", size: 10 },
    { t: "shape", d: "M610 296 h190 v48 h-190 Z", fill: "#c9cbce", stroke: "ink2", op: .8, title: "Control plate" },
    { t: "knob", k: "vol", x: 640, y: 320, r: 15, label: "Volume", cap: "#d9d9d9" },
    { t: "knob", k: "treble", x: 700, y: 320, r: 15, label: "Treble", cap: "#d9d9d9" },
    { t: "knob", k: "bass", x: 760, y: 320, r: 15, label: "Bass", cap: "#d9d9d9" },
    { t: "label", x: 620, y: 290, text: "ACTIVE PREAMP (9 V)", size: 8.5, anchor: "start", dim: true },
    { t: "jack", x: 870, y: 260, r: 9, label: "Output" },
    { t: "label", x: 50, y: 40, text: "STINGRAY-STYLE CONTROLS (2-BAND)", size: 11, anchor: "start", bold: true }]);
  FaithfulPanel.register({ id: "bs-stingray", name: "StingRay (2-band)", w: 900, h: 400, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: common.concat(items),
    src: ["Humbucker nearer the bridge, coils in parallel, active 9 V preamp, bass + treble then a mid band: Wikipedia, \"Music Man StingRay\""], approx: "Positions and knob order are this page's drawing after photos (approximate, unverified)." });
})();
