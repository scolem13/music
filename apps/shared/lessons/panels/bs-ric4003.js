// Rickenbacker 4003 control area, for FaithfulPanel + GuitarPickups.adapter (basses: apps/shared/lessons/bass-pickups.js). Drawn front-on, neck to
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
  var xn = X(9.5), xb = X(1.6);
  var items = [{ t: "shape", d: "M110 90 C300 60 520 70 650 100 L720 310 C600 350 300 360 140 320 Z", fill: "#f7f7f4", stroke: "ink2", op: .95, title: "Pickguard (white)" },
    coil(xn, 132, 258, 40, "#c9cbce", "Neck pickup (\"toaster\" cover)"), coil(xb, 132, 258, 30, "#202124", "Bridge pickup")]
    .concat(poles(xn, YS), poles(xb, YS), [
    { t: "label", x: xn, y: 280, text: "Neck", size: 10 }, { t: "label", x: xb - 40, y: 280, text: "Bridge", size: 10 },
    { t: "seg", k: "sel", x: 420, y: 52, w: 150, h: 18, opts: [["neck", "Neck"], ["both", "Both"], ["bridge", "Bridge"]] },
    { t: "label", x: 495, y: 86, text: "3-way switch", size: 8.5, dim: true },
    { t: "knob", k: "vol1", x: 620, y: 330, r: 15, label: "Neck vol", cap: "#2a2a2a" },
    { t: "knob", k: "tone1", x: 680, y: 345, r: 15, label: "Neck tone", cap: "#2a2a2a" },
    { t: "knob", k: "vol2", x: 740, y: 330, r: 15, label: "Bridge vol", cap: "#2a2a2a" },
    { t: "knob", k: "tone2", x: 800, y: 345, r: 15, label: "Bridge tone", cap: "#2a2a2a" },
    { t: "jack", x: 860, y: 290, r: 9, label: "Mono out" }, { t: "jack", x: 860, y: 320, r: 9, label: "Stereo out (not modelled)" },
    { t: "label", x: 50, y: 40, text: "RICKENBACKER 4003-STYLE CONTROLS", size: 11, anchor: "start", bold: true }]);
  FaithfulPanel.register({ id: "bs-ric4003", name: "Rickenbacker 4003", w: 900, h: 400, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: common.concat(items),
    src: ["Two pickups, a volume and tone each, three-way switch, Rick-O-Sound: Wikipedia, \"Rickenbacker 4001\""], approx: "Positions, knob order and pickup distances are this page's drawing after photos (approximate, unverified). The stereo jack is drawn, not modelled." });
})();
