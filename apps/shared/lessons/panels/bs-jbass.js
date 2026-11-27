// Jazz Bass (1960s), the whole body front-on at one scale (28 units an inch), neck to the left (a stub with frets at the 34 in scale), E
// string at the top, for FaithfulPanel + GuitarPickups.adapter (basses: apps/shared/lessons/bass-pickups.js): offset-waist body (about
// 19.5 x 13 in, the site's reading of photos), two single coils 3.6 in apart (sourced), chrome control plate with two volumes and a tone.
// The neck pickup's distance, the outline and the knob places are this site's drawing after photos (approximate); no logos.
(function () { var BX = 12 + 21.5 * 28;
  var G = GuitarPickups.drawing(28, BX, 250), X = G.X, Y = G.Y, ES = [-1.08, -0.36, 0.36, 1.08];
  function poles(d, es) { return { t: "shape", d: es.map(function (e) { return G.dot(d, e, 3.2); }).join(" "), fill: "#8d8f93", stroke: "#555", sw: .6 }; }
  function coil(d, e0, e1, w, fill, title) { return { t: "shape", d: G.rect(d + w / 2, d - w / 2, e0, e1), fill: fill, stroke: "ink2", title: title }; }
  var xn = 6.3, xb = 2.7, EP = [-1.26, -0.9, -0.54, -0.18, 0.18, 0.54, 0.9, 1.26];
  var items = [{ t: "shape", d: G.outline([[-3.7, -0.4], [-3.2, -3.6], [-1.8, -5.5], [0.4, -6.2], [2.6, -5.8], [4.6, -4.7], [6.8, -4.5], [9.6, -5.3], [12.8, -5.7], [16.0, -5.0], [15.9, -4.0], [14.2, -3.1], [13.1, -1.9], [12.8, -1.2], [12.8, 1.2], [13.5, 2.1], [14.2, 3.1], [14.3, 4.0], [13.3, 4.6], [11.2, 4.7], [9.6, 4.9], [7.6, 6.0], [4.6, 6.75], [1.2, 6.9], [-1.8, 6.2], [-3.4, 4.0]]), fill: "body", stroke: "ink2", sw: 2, title: "Body (offset waist; about 19.5 x 13 in)" },
    { t: "shape", d: G.outline([[12.8, -1.3], [13.6, -2.4], [13.0, -3.6], [10.4, -4.2], [7.6, -3.9], [5.4, -2.9], [4.1, -1.7], [4.1, 1.6], [4.9, 2.6], [7.0, 3.2], [9.6, 3.6], [12.0, 3.2], [13.2, 2.2], [12.8, 1.3]]), fill: "#f7f7f4", stroke: "ink2", title: "Pickguard" }]
    .concat(G.neck(10.45, 21.5, 2.3, 1.75, 34, "#d8b47a", "#4a2e1e"), [
    { t: "shape", d: G.rect(0.9, -2.0, -1.55, 1.55), fill: "#c9cbce", stroke: "ink2", title: "Bridge plate" },
    { t: "shape", d: ES.map(function (e) { return G.rect(0.25, -0.45, e - 0.22, e + 0.22); }).join(" "), fill: "#e3e5e8", stroke: "ink2", sw: .6, title: "Four saddles" },
    coil(xn, -1.55, 1.55, 0.6, "#202124", "Neck single coil"), coil(xb, -1.55, 1.55, 0.6, "#202124", "Bridge single coil (reverse wound, reverse polarity)"),
    poles(xn, EP), poles(xb, EP),
    G.strings(4, 0.72, -0.4, 21.5, 1.5),
    { t: "label", x: X(xn), y: Y(-1.85), text: "Neck", size: 10 }, { t: "label", x: X(xb), y: Y(-1.85), text: "Bridge pickup", size: 10 },
    { t: "label", x: X((xn + xb) / 2), y: Y(-2.35), text: "3.6 in apart", size: 9, dim: true },
    { t: "shape", d: G.outline([[2.8, 3.55], [3.05, 3.95], [2.8, 4.35], [-3.0, 5.0], [-3.35, 4.55], [-3.0, 4.15]]), fill: "#c9cbce", stroke: "ink2", title: "Control plate (chrome)" },
    { t: "knob", k: "vol1", x: X(2.1), y: Y(3.98), r: 14, label: "Neck vol", cap: "#2a2a2a" },
    { t: "knob", k: "vol2", x: X(0.4), y: Y(4.2), r: 14, label: "Bridge vol", cap: "#2a2a2a" },
    { t: "knob", k: "tone", x: X(-1.3), y: Y(4.42), r: 14, label: "Tone", cap: "#2a2a2a" },
    { t: "jack", x: X(-2.75), y: Y(4.6), r: 7, label: "Output" },
    { t: "label", x: 12, y: 22, text: "JAZZ BASS-STYLE (1960S)", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.55) + 6, text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "bs-jbass", name: "Jazz Bass (1960s)", w: 12 + 21.5 * 28 + 3.7 * 28 + 16, h: 470, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Controls (a volume per pickup + master tone, late 1961 on) and pickup spacing 3.6 in to late 1970, 4 in after: Wikipedia, \"Fender Jazz Bass\""],
    approx: "Whole body at one scale (28 units an inch). The pickup spacing is sourced; the neck pickup's distance from the bridge, the outline (about 19.5 x 13 in) and the knobs are this site's drawing (approximate)." });
})();
