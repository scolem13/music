// Fender Telecaster, the whole body front-on at one scale (36 units an inch), neck to the left (a stub with frets at the 25.5 in
// scale), bass strings at the top, for FaithfulPanel + GuitarPickups.adapter: the slab single-cutaway body (about 15.75 x 12.75 in),
// the neck pickup under a chrome cover in the pickguard, the slanted bridge pickup in the metal bridge plate, the chrome control plate
// with the 3-way lever, Volume and Tone, the jack in the lower edge. Distances from the bridge (neck 6.3 in, bridge 1.45 in), the
// outline and all positions are this site's estimates after photos (approximate); no logo.
(function () {
  var G = GuitarPickups.drawing(36, 570, 262), X = G.X, Y = G.Y;
  var body = [[-4.0, 0], [-3.9, -3.6], [-3.0, -5.6], [-1.0, -6.3], [2.5, -6.2], [5.5, -5.7], [8.0, -5.5], [10.6, -4.9], [11.4, -3.7], [11.2, -2.3],
    [10.2, -1.1], [10.2, 1.1], [9.4, 1.7], [8.3, 2.7], [7.6, 3.9], [6.8, 5.1], [5.3, 6.0], [3.0, 6.4], [0, 6.45], [-2.5, 6.1], [-3.7, 4.6]];
  var guard = [[10.2, -1.2], [10.9, -2.5], [10.1, -3.6], [7.6, -4.1], [4.6, -3.7], [2.7, -2.4], [2.7, 2.0], [3.6, 2.6], [5.6, 3.0], [7.4, 2.9], [8.6, 2.2], [9.8, 1.4], [10.2, 1.2]];
  var items = [{ t: "shape", d: G.outline(body), fill: "body", stroke: "ink2", sw: 2, title: "Body (slab, single cutaway; about 15.75 x 12.75 in)" }]
    .concat([
    { t: "shape", d: G.outline(guard), fill: "#f7f7f4", stroke: "ink2", title: "Pickguard (white; black on the early-1950s ones)" }], G.neck(7.35, 15.5, 2.05, 1.98, 25.5, "#e2c48e", "#e2c48e"), [
    { t: "shape", d: G.rect(6.3 + 0.38, 6.3 - 0.38, -1.4, 1.4), fill: "#c9cbce", stroke: "ink2", title: "Neck pickup (chrome cover)" },
    { t: "label", x: X(6.3), y: Y(-1.62), text: "Neck", size: 10 },
    { t: "shape", d: G.poly([[2.6, -1.65], [-1.2, -1.65], [-1.45, -1.3], [-1.45, 1.3], [-1.2, 1.65], [2.6, 1.65]]), fill: "#c9cbce", stroke: "ink2", title: "Bridge plate (pickup and three saddles)" },
    { t: "shape", d: G.poly([[1.45 + 0.37 + 0.12, -1.38], [1.45 - 0.37 + 0.12, -1.38], [1.45 - 0.37 - 0.12, 1.38], [1.45 + 0.37 - 0.12, 1.38]]), fill: "#1b1b1b", stroke: "ink2", title: "Bridge pickup (slanted, in the bridge plate)" },
    { t: "shape", d: [-1, 0, 1].map(function (i) { return G.rect(0.25, -0.35, i * 0.82 - 0.36, i * 0.82 + 0.36); }).join(" "), fill: "#e3e5e8", stroke: "ink2", sw: .6, title: "Three saddles" },
    { t: "label", x: X(1.45), y: Y(-1.9), text: "Bridge", size: 10 },
    G.strings(6, 0.41, -0.6, 15.5),
    { t: "shape", d: G.outline([[2.0, 3.0], [2.15, 3.35], [2.0, 3.7], [-3.4, 3.75], [-3.6, 3.4], [-3.4, 3.05]]), fill: "#c9cbce", stroke: "ink2", title: "Control plate (chrome)" },
    { t: "seg", k: "sel", x: X(1.95), y: Y(3.4) - 8, w: 82, h: 16, opts: [["neck", "N"], ["both", "B"], ["bridge", "Br"]] },
    { t: "label", x: X(1.95) + 41, y: Y(3.4) + 30, text: "3-way lever", size: 9, dim: true },
    { t: "knob", k: "vol", x: X(-1.35), y: Y(3.4), r: 15, label: "Volume", cap: "#d9dbde" },
    { t: "knob", k: "tone", x: X(-2.75), y: Y(3.4), r: 15, label: "Tone", cap: "#d9dbde" },
    { t: "jack", x: X(-1.2), y: Y(6.0), r: 8, label: "Output (in the edge)" },
    { t: "label", x: 12, y: 22, text: "TELECASTER-STYLE", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.6), text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "gt-tele", name: "Telecaster", w: 740, h: 530, knob: "cap", accent: "sel", accents: { sel: "#e8a400" }, items: items,
    src: ["Controls and the 1967 wiring (neck / both / bridge): Wikipedia, \"Fender Telecaster\""],
    approx: "Whole body at one scale (36 units an inch). The outline (about 15.75 x 12.75 in), positions and pickup distances are this site's drawing after photos (approximate). Earlier Telecasters (1950-1967) were wired differently: not modelled." });
})();
