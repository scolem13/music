// Jazz Bass (1960s) control area, for FaithfulPanel + GuitarPickups.adapter (basses: apps/shared/lessons/bass-pickups.js). Drawn front-on, neck to
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
  var xn = X(6.3), xb = X(2.7);
  var items = [{ t: "shape", d: "M120 90 C300 60 520 70 640 100 L720 300 C600 350 300 360 140 320 Z", fill: "#f7f7f4", stroke: "ink2", op: .95, title: "Pickguard" },
    coil(xn, 136, 254, 24, "#202124", "Neck single coil"), coil(xb, 136, 254, 24, "#202124", "Bridge single coil (reverse wound, reverse polarity)")]
    .concat(poles(xn, [144, 156, 174, 186, 204, 216, 234, 246]), poles(xb, [144, 156, 174, 186, 204, 216, 234, 246]), [
    { t: "label", x: xn, y: 278, text: "Neck", size: 10 }, { t: "label", x: xb, y: 278, text: "Bridge", size: 10 },
    { t: "label", x: (xn + xb) / 2, y: 120, text: "pickups 3.6 in apart", size: 9, dim: true },
    { t: "shape", d: "M640 300 l200 -20 v44 l-200 20 Z", fill: "#c9cbce", stroke: "ink2", op: .8, title: "Control plate (chrome)" },
    { t: "knob", k: "vol1", x: 680, y: 318, r: 15, label: "Neck vol", cap: "#2a2a2a" },
    { t: "knob", k: "vol2", x: 740, y: 312, r: 15, label: "Bridge vol", cap: "#2a2a2a" },
    { t: "knob", k: "tone", x: 800, y: 306, r: 15, label: "Tone", cap: "#2a2a2a" },
    { t: "jack", x: 855, y: 270, r: 9, label: "Output" },
    { t: "label", x: 50, y: 40, text: "JAZZ BASS-STYLE CONTROLS", size: 11, anchor: "start", bold: true }]);
  FaithfulPanel.register({ id: "bs-jbass", name: "Jazz Bass (1960s)", w: 900, h: 400, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: common.concat(items),
    src: ["Controls (a volume per pickup + master tone, late 1961 on) and pickup spacing 3.6 in to late 1970, 4 in after: Wikipedia, \"Fender Jazz Bass\""], approx: "The spacing is sourced; the neck pickup's distance from the bridge, the body and the knobs are this page's drawing (approximate)." });
})();
