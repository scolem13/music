// Rickenbacker 4003, the whole body front-on at one scale (28 units an inch), the neck-through neck to the left (a stub with frets at the
// 33.25 in scale), E string at the top, for FaithfulPanel + GuitarPickups.adapter (basses: apps/shared/lessons/bass-pickups.js): the
// "cresting wave" body (long sweeping bass horn, short treble horn; about 20.5 x 14 in, the site's reading of photos), the two-level
// white pickguard, the neck "toaster" pickup and the bridge pickup, a 3-way switch, four knobs, mono and stereo jacks. Pickup distances,
// the outline and the knob order are this site's drawing after photos (approximate, unverified); no logos.
(function () { var BX = 12 + 21.5 * 28;
  var G = GuitarPickups.drawing(28, BX, 250), X = G.X, Y = G.Y, ES = [-1.08, -0.36, 0.36, 1.08];
  function poles(d, es) { return { t: "shape", d: es.map(function (e) { return G.dot(d, e, 3.2); }).join(" "), fill: "#8d8f93", stroke: "#555", sw: .6 }; }
  function coil(d, e0, e1, w, fill, title) { return { t: "shape", d: G.rect(d + w / 2, d - w / 2, e0, e1), fill: fill, stroke: "ink2", title: title }; }
  var xn = 9.5, xb = 1.6;
  var items = [{ t: "shape", d: G.outline([[-3.8, 0], [-3.6, -3.5], [-2.5, -6.0], [0, -7.0], [3.0, -6.9], [6.0, -6.3], [8.5, -6.0], [11.5, -6.5], [14.5, -6.7], [16.7, -6.1], [16.4, -5.3], [14.8, -4.9], [13.4, -3.6], [12.8, -2.0], [12.4, -1.15], [12.4, 1.15], [12.9, 2.0], [13.7, 3.0], [13.6, 3.8], [12.2, 3.9], [10.7, 4.4], [9.2, 5.4], [7.4, 6.3], [4.6, 6.85], [1.5, 7.0], [-1.2, 6.6], [-3.0, 5.2], [-3.7, 3.0]]), fill: "#7a1e1e", stroke: "ink2", sw: 2, op: .9, title: "Body (cresting wave; about 20.5 x 14 in)" },
    { t: "shape", d: G.outline([[12.4, -1.3], [12.0, -2.6], [9.6, -3.0], [6.0, -2.7], [3.0, -2.2], [-2.0, -1.9], [-2.4, 0], [-3.0, 2.6], [-3.2, 4.4], [-2.4, 5.7], [0.5, 6.1], [3.6, 5.6], [6.6, 4.9], [9.0, 4.4], [11.6, 3.1], [12.4, 1.3]]), fill: "#f7f7f4", stroke: "ink2", title: "Pickguard (white, two levels)" }]
    .concat(G.neck(10.2, 21.5, 2.2, 1.7, 33.25, "#e2c48e", "#3a2416"), [
    { t: "shape", d: G.rect(0.8, -1.6, -1.6, 1.6), fill: "#c9cbce", stroke: "ink2", title: "Bridge" },
    { t: "shape", d: G.rect(-2.0, -3.3, -1.2, 1.2), fill: "#c9cbce", stroke: "ink2", title: "Tailpiece" },
    coil(xn, -1.7, 1.7, 1.2, "#c9cbce", "Neck pickup (\"toaster\" cover)"), coil(xb, -1.55, 1.55, 0.6, "#202124", "Bridge pickup"),
    poles(xn, ES), poles(xb, ES),
    G.strings(4, 0.72, -2.6, 21.5, 1.5),
    { t: "label", x: X(xn), y: Y(-1.95), text: "Neck", size: 10 }, { t: "label", x: X(xb), y: Y(-1.95), text: "Bridge pickup", size: 10 },
    { t: "seg", k: "sel", x: X(7.4) - 75, y: Y(3.5) - 9, w: 150, h: 18, opts: [["neck", "Neck"], ["both", "Both"], ["bridge", "Bridge"]] },
    { t: "label", x: X(7.4), y: Y(3.5) + 24, text: "3-way switch", size: 9, dim: true },
    { t: "knob", k: "vol1", x: X(3.7), y: Y(3.3), r: 14, label: "Neck vol", cap: "#2a2a2a" },
    { t: "knob", k: "tone1", x: X(2.15), y: Y(3.6), r: 14, label: "Neck tone", cap: "#2a2a2a" },
    { t: "knob", k: "vol2", x: X(0.6), y: Y(3.9), r: 14, label: "Bridge vol", cap: "#2a2a2a" },
    { t: "knob", k: "tone2", x: X(-0.95), y: Y(4.2), r: 14, label: "Bridge tone", cap: "#2a2a2a" },
    { t: "jack", x: X(-2.6), y: Y(2.75), r: 7, label: "Mono" }, { t: "jack", x: X(-2.85), y: Y(3.8), r: 7, label: "Stereo (unused)" },
    { t: "label", x: 12, y: 22, text: "RICKENBACKER 4003-STYLE", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.55) + 6, text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "bs-ric4003", name: "Rickenbacker 4003", w: 12 + 21.5 * 28 + 3.8 * 28 + 16, h: 490, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Two pickups, a volume and tone each, three-way switch, Rick-O-Sound: Wikipedia, \"Rickenbacker 4001\""],
    approx: "Whole body at one scale (28 units an inch). The outline (about 20.5 x 14 in), positions, knob order and pickup distances are this site's drawing after photos (approximate, unverified). The stereo jack is drawn, not modelled." });
})();
