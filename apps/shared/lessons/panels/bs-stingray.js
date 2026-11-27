// StingRay (2-band), the whole body front-on at one scale (28 units an inch), neck to the left (a stub with frets at the 34 in scale), E
// string at the top, for FaithfulPanel + GuitarPickups.adapter (basses: apps/shared/lessons/bass-pickups.js): rounded double-cutaway
// body with short horns (about 18 x 13.5 in, the site's reading of photos), oval pickguard, one large humbucker near the bridge, the
// chrome control plate of the active preamp. Positions and knob order are this site's drawing after photos (approximate); no logos.
(function () { var BX = 12 + 20.5 * 28;
  var G = GuitarPickups.drawing(28, BX, 250), X = G.X, Y = G.Y, ES = [-1.08, -0.36, 0.36, 1.08];
  function poles(d, es) { return { t: "shape", d: es.map(function (e) { return G.dot(d, e, 3.2); }).join(" "), fill: "#8d8f93", stroke: "#555", sw: .6 }; }
  function coil(d, e0, e1, w, fill, title) { return { t: "shape", d: G.rect(d + w / 2, d - w / 2, e0, e1), fill: fill, stroke: "ink2", title: title }; }
  var x = 4.0;
  var items = [{ t: "shape", d: G.outline([[-3.4, 0], [-3.2, -3.5], [-1.9, -5.8], [0.8, -6.6], [3.6, -6.3], [6.0, -5.4], [8.4, -5.2], [10.8, -5.7], [13.2, -5.6], [14.9, -4.7], [14.6, -3.6], [13.3, -2.8], [12.6, -1.7], [12.4, -1.2], [12.4, 1.2], [13.0, 2.2], [13.6, 3.3], [13.4, 4.2], [12.2, 4.7], [10.2, 5.0], [8.2, 5.4], [6.0, 6.3], [3.4, 6.8], [0.4, 6.8], [-2.0, 5.9], [-3.2, 3.6]]), fill: "body", stroke: "ink2", sw: 2, title: "Body (about 18 x 13.5 in)" },
    { t: "shape", d: G.outline([[12.4, -1.3], [12.6, -2.6], [11.0, -3.6], [8.0, -3.9], [5.2, -3.4], [2.8, -2.2], [2.4, 0], [2.8, 2.2], [5.2, 3.3], [8.0, 3.6], [11.0, 3.3], [12.6, 2.4], [12.4, 1.3]]), fill: "#f7f7f4", stroke: "ink2", title: "Pickguard" }]
    .concat(G.neck(10.45, 20.5, 2.4, 1.85, 34, "#d8b47a", "#d8b47a"), [
    { t: "shape", d: G.rect(1.0, -2.2, -1.6, 1.6), fill: "#c9cbce", stroke: "ink2", title: "Bridge (strings through the body)" },
    { t: "shape", d: ES.map(function (e) { return G.rect(0.25, -0.45, e - 0.22, e + 0.22); }).join(" "), fill: "#e3e5e8", stroke: "ink2", sw: .6, title: "Four saddles" },
    { t: "shape", d: G.rect(x + 1.1, x - 1.1, -1.85, 1.85), fill: "#202124", stroke: "ink2", title: "Humbucker (two coils in parallel)" },
    poles(x + 0.45, ES), poles(x - 0.45, ES),
    G.strings(4, 0.72, -0.4, 20.5, 1.5),
    { t: "label", x: X(x), y: Y(-2.1), text: "Humbucker", size: 10 },
    { t: "label", x: X(-0.6), y: Y(-1.85), text: "Bridge", size: 9, dim: true },
    { t: "shape", d: G.outline([[2.7, 3.4], [3.0, 3.85], [2.7, 4.3], [-2.0, 4.95], [-2.35, 4.5], [-2.0, 4.05]]), fill: "#c9cbce", stroke: "ink2", title: "Control plate (active preamp, 9 V battery behind)" },
    { t: "knob", k: "vol", x: X(1.9), y: Y(3.85), r: 14, label: "Volume", cap: "#d9d9d9" },
    { t: "knob", k: "treble", x: X(0.3), y: Y(4.05), r: 14, label: "Treble", cap: "#d9d9d9" },
    { t: "knob", k: "bass", x: X(-1.3), y: Y(4.25), r: 14, label: "Bass", cap: "#d9d9d9" },
    { t: "label", x: X(0.35), y: Y(2.95), text: "ACTIVE PREAMP (9 V)", size: 8.5, dim: true },
    { t: "jack", x: X(-2.6), y: Y(5.85), r: 7, label: "Output (in the edge)" },
    { t: "label", x: 12, y: 22, text: "STINGRAY-STYLE (2-BAND)", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.55) + 6, text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "bs-stingray", name: "StingRay (2-band)", w: 12 + 20.5 * 28 + 3.4 * 28 + 16, h: 470, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Humbucker nearer the bridge, coils in parallel, active 9 V preamp, bass + treble then a mid band: Wikipedia, \"Music Man StingRay\""],
    approx: "Whole body at one scale (28 units an inch). The outline (about 18 x 13.5 in), positions and knob order are this site's drawing after photos (approximate, unverified)." });
})();
