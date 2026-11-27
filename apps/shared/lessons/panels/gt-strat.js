// Fender Stratocaster, the whole body front-on at one scale (36 units an inch), neck to the left (a stub with frets at the 25.5 in
// scale), bass strings at the top, controls on the treble side below, for FaithfulPanel + GuitarPickups.adapter. Pickups at Tillman's
// distances from the bridge (6.375 / 3.875 / 1.625 in), the bridge pickup slanted. The body outline (double cutaway, longer bass horn,
// about 18 x 12.75 in), pickguard, bridge, knob, switch and jack places are this site's drawing after photos (approximate); no logo.
(function () {
  var G = GuitarPickups.drawing(36, 604, 262), X = G.X, Y = G.Y;
  function pu(d, label, slant) { var a = slant || 0, w = 0.7, h = 2.75;
    return [{ t: "shape", d: G.poly([[d + w / 2 + a, -h / 2], [d - w / 2 + a, -h / 2], [d - w / 2 - a, h / 2], [d + w / 2 - a, h / 2]]), fill: "#f3f0e6", stroke: "ink2", title: label + " single-coil pickup" },
      { t: "shape", d: [0, 1, 2, 3, 4, 5].map(function (i) { var e = (i - 2.5) * 0.41; return G.dot(d - a * e / (h / 2), e, 3); }).join(" "), fill: "#8d8f93", stroke: "#555", sw: .6 },
      { t: "label", x: X(d), y: Y(-1.62), text: label, size: 10 }]; }
  var body = [[-5.0, 0], [-4.7, -3.2], [-3.4, -5.4], [-1.0, -6.2], [1.8, -5.9], [4.2, -5.0], [6.2, -4.7], [8.6, -5.3], [11.0, -5.4], [12.8, -4.8],
    [12.7, -3.8], [11.3, -3.0], [10.3, -1.9], [10.0, -1.1], [10.0, 1.1], [10.7, 2.0], [11.5, 3.1], [11.6, 4.0], [10.8, 4.7], [9.0, 4.9], [6.8, 5.0],
    [4.5, 5.8], [2.0, 6.45], [-1.0, 6.55], [-3.4, 5.6], [-4.7, 3.4]];
  var guard = [[10.0, -1.25], [10.6, -2.3], [10.0, -3.3], [8.4, -3.8], [6.0, -3.8], [3.8, -3.2], [2.0, -2.2], [0.7, -1.75], [0.7, 1.75], [-1.3, 2.2],
    [-2.6, 3.0], [-3.3, 4.3], [-2.7, 5.25], [-0.8, 5.45], [2.0, 4.8], [4.6, 4.2], [7.2, 3.8], [9.3, 3.1], [10.5, 2.2], [10.0, 1.25]];
  var items = [{ t: "shape", d: G.outline(body), fill: "body", stroke: "ink2", sw: 2, title: "Body (alder or ash, contoured; about 18 x 12.75 in)" }]
    .concat([
    { t: "shape", d: G.outline(guard), fill: "#f7f7f4", stroke: "ink2", title: "Pickguard (white, three-ply)" }], G.neck(7.35, 16.75, 2.1, 1.98, 25.5, "#d8b47a", "#c89a5e"))
    .concat(pu(6.375, "Neck"), pu(3.875, "Middle"), pu(1.625, "Bridge", 0.14), [
    { t: "shape", d: G.rect(0.45, -1.9, -1.4, 1.4), fill: "#c9cbce", stroke: "ink2", title: "Tremolo bridge plate and six saddles" },
    { t: "shape", d: [0, 1, 2, 3, 4, 5].map(function (i) { var e = (i - 2.5) * 0.41; return "M" + X(0.15) + " " + Y(e - .17) + " h" + (0.5 * 36) + " v" + (0.34 * 36) + " h-" + (0.5 * 36) + " Z"; }).join(" "), fill: "#e3e5e8", stroke: "ink2", sw: .6, title: "Saddles" },
    G.strings(6, 0.41, 0, 16.75),
    { t: "label", x: X(-0.72), y: Y(-1.62), text: "Bridge", size: 9, dim: true },
    { t: "seg", k: "sel", x: X(4.95), y: Y(2.05), w: 130, h: 17, opts: [["p5", "5"], ["p4", "4"], ["p3", "3"], ["p2", "2"], ["p1", "1"]] },
    { t: "label", x: X(4.95) + 65, y: Y(2.05) + 30, text: "5-way: 5 neck … 1 bridge", size: 9, dim: true },
    { t: "knob", k: "vol", x: X(0.35), y: Y(2.75), r: 16, label: "Volume", cap: "#f3f0e6" },
    { t: "knob", k: "tone1", x: X(-1.2), y: Y(3.5), r: 16, label: "Tone (neck)", cap: "#f3f0e6" },
    { t: "knob", k: "tone2", x: X(-3.0), y: Y(4.3), r: 16, label: "Tone (mid, bridge)", cap: "#f3f0e6" },
    { t: "jack", x: X(-0.9), y: Y(5.55), r: 9, label: "Output (on the face)" },
    { t: "label", x: 12, y: 22, text: "STRATOCASTER-STYLE", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.6), text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "gt-strat", name: "Stratocaster", w: 830, h: 520, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Pickup distances from the bridge: Tillman (2002)", "Controls: Wikipedia, \"Fender Stratocaster\" (one volume, tone 1 = neck, tone 2 = middle + bridge on many modern models)"],
    approx: "Whole body at one scale (36 units an inch). Pickup distances are Tillman's; the outline (about 18 x 12.75 in), pickguard, bridge and knob places are this site's drawing after photos (approximate). The 5-way order runs 5 (neck) to 1 (bridge) as the lever moves away from the neck." });
})();
