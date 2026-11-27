// Precision Bass, the whole body front-on at one scale (28 units an inch), neck to the left (a stub with frets at the 34 in scale), E
// string at the top, for FaithfulPanel + GuitarPickups.adapter (basses: apps/shared/lessons/bass-pickups.js): Strat-like double-cutaway
// body (about 19.5 x 13 in, the site's reading of photos), split-coil pickup, pickguard, bridge, chrome control plate with Volume, Tone
// and the jack. Pickup distances, the outline and the knob places are this site's drawing after photos (approximate); no logos.
(function () { var BX = 12 + 21.5 * 28;
  var G = GuitarPickups.drawing(28, BX, 250), X = G.X, Y = G.Y, ES = [-1.08, -0.36, 0.36, 1.08];
  function poles(d, es) { return { t: "shape", d: es.map(function (e) { return G.dot(d, e, 3.2); }).join(" "), fill: "#8d8f93", stroke: "#555", sw: .6 }; }
  function coil(d, e0, e1, w, fill, title) { return { t: "shape", d: G.rect(d + w / 2, d - w / 2, e0, e1), fill: fill, stroke: "ink2", title: title }; }
  var items = [{ t: "shape", d: G.outline([[-3.6, 0], [-3.3, -3.4], [-2.0, -5.6], [0.6, -6.4], [3.5, -6.1], [6.0, -5.1], [8.2, -4.8], [10.8, -5.4], [13.6, -5.6], [15.8, -4.9], [15.7, -3.9], [14.2, -3.0], [13.1, -1.9], [12.8, -1.2], [12.8, 1.2], [13.5, 2.1], [14.3, 3.2], [14.4, 4.1], [13.4, 4.8], [11.3, 5.0], [8.8, 5.1], [6.4, 5.9], [3.8, 6.55], [0.6, 6.6], [-2.0, 5.7], [-3.3, 3.5]]), fill: "body", stroke: "ink2", sw: 2, title: "Body (about 19.5 x 13 in)" },
    { t: "shape", d: G.outline([[12.8, -1.3], [13.6, -2.4], [13.0, -3.6], [10.4, -4.2], [7.6, -3.9], [5.4, -2.9], [4.1, -1.7], [4.1, 1.6], [4.9, 2.6], [7.0, 3.2], [9.6, 3.6], [12.0, 3.2], [13.2, 2.2], [12.8, 1.3]]), fill: "#f7f7f4", stroke: "ink2", title: "Pickguard" }]
    .concat(G.neck(10.45, 21.5, 2.45, 2.0, 34, "#d8b47a", "#4a2e1e"), [
    { t: "shape", d: G.rect(0.9, -2.0, -1.55, 1.55), fill: "#c9cbce", stroke: "ink2", title: "Bridge plate" },
    { t: "shape", d: ES.map(function (e) { return G.rect(0.25, -0.45, e - 0.22, e + 0.22); }).join(" "), fill: "#e3e5e8", stroke: "ink2", sw: .6, title: "Four saddles" },
    coil(6.0, -1.5, 0.05, 0.75, "#202124", "Split coil, E-A half (nearer the bridge here: unverified)"), coil(6.9, -0.05, 1.5, 0.75, "#202124", "Split coil, D-G half"),
    poles(6.0 + 0.16, [-1.08, -0.36]), poles(6.0 - 0.16, [-1.08, -0.36]), poles(6.9 + 0.16, [0.36, 1.08]), poles(6.9 - 0.16, [0.36, 1.08]),
    G.strings(4, 0.72, -0.4, 21.5, 1.5),
    { t: "label", x: X(6.45), y: Y(-1.85), text: "Split-coil pickup", size: 10 },
    { t: "label", x: X(-0.55), y: Y(-1.85), text: "Bridge", size: 9, dim: true },
    { t: "shape", d: G.outline([[3.1, 3.05], [3.35, 3.5], [3.1, 3.95], [-1.6, 4.55], [-1.95, 4.1], [-1.6, 3.65]]), fill: "#c9cbce", stroke: "ink2", title: "Control plate (chrome)" },
    { t: "knob", k: "vol", x: X(2.35), y: Y(3.55), r: 14, label: "Volume", cap: "#d9d9d9" },
    { t: "knob", k: "tone", x: X(0.75), y: Y(3.8), r: 14, label: "Tone", cap: "#d9d9d9" },
    { t: "jack", x: X(-1.0), y: Y(4.15), r: 8, label: "Output" },
    { t: "label", x: 12, y: 22, text: "PRECISION BASS-STYLE", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.55) + 6, text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "bs-pbass", name: "Precision Bass", w: 12 + 21.5 * 28 + 3.6 * 28 + 16, h: 470, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Pickup, controls: Wikipedia, \"Fender Precision Bass\" (split coil from 1957; the knobs as on photos)"],
    approx: "Whole body at one scale (28 units an inch). The outline (about 19.5 x 13 in), positions and pickup distances are this site's drawing after photos (approximate). Which half sits nearer the bridge is this page's reading of photos (unverified)." });
})();
