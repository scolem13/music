// Gibson Les Paul Standard, the whole body front-on at one scale (36 units an inch), neck to the left (a stub with frets at the
// 24.75 in scale), bass strings at the top, for FaithfulPanel + GuitarPickups.adapter: single-cutaway carved body (about 17.25 x 13 in),
// two humbuckers (two coils each, poles drawn), tune-o-matic bridge and stop tailpiece, the three-way toggle in the upper bout, two
// volume and two tone knobs in the lower bout, the raised pickguard beside the cutaway. Pickup centres 5.9 / 1.55 in from the bridge,
// the outline and all positions are this site's estimates after photos (approximate); no logo.
(function () {
  var G = GuitarPickups.drawing(36, 588, 262), X = G.X, Y = G.Y;
  function hb(d, label) { return [{ t: "shape", d: G.rect(d + 0.88, d - 0.88, -1.62, 1.62), fill: "#3a2a12", stroke: "ink2", title: label + " humbucker (mounting ring)" },
      { t: "shape", d: G.rect(d + 0.72, d + 0.04, -1.38, 1.38) + " " + G.rect(d - 0.04, d - 0.72, -1.38, 1.38), fill: "#cdb36a", stroke: "#7d6a30", title: label + " humbucker: two coils, wound and magnetised opposite ways" },
      { t: "shape", d: [0, 1, 2, 3, 4, 5].map(function (i) { var e = (i - 2.5) * 0.41; return G.dot(d + 0.38, e, 3) + " " + G.dot(d - 0.38, e, 3); }).join(" "), fill: "#8d8f93", stroke: "#555", sw: .6 },
      { t: "label", x: X(d), y: Y(-1.85), text: label, size: 10 }]; }
  var body = [[-5.25, 0], [-5.0, -3.5], [-3.8, -5.7], [-1.5, -6.5], [1.2, -6.4], [3.6, -5.6], [5.2, -5.0], [7.2, -5.1], [9.6, -5.0], [11.1, -4.0], [11.7, -2.6],
    [11.2, -1.4], [10.3, -1.1], [10.3, 1.1], [9.0, 1.35], [8.4, 1.9], [9.2, 2.6], [11.0, 2.75], [11.9, 3.0], [11.4, 3.6], [9.8, 4.1], [7.8, 4.6], [6.0, 4.75],
    [4.2, 5.6], [2.0, 6.35], [0, 6.5], [-2.2, 6.3], [-4.2, 5.0], [-5.0, 3.0]];
  var guard = [[8.3, 1.3], [6.4, 1.6], [5.2, 1.9], [4.9, 2.9], [5.8, 3.85], [7.2, 4.0], [8.2, 3.3], [8.5, 2.3]];
  var items = [{ t: "shape", d: G.outline(body), fill: "body", stroke: "ink2", sw: 2, title: "Body (carved maple top on mahogany; about 17.25 x 13 in)" }]
    .concat([
    { t: "shape", d: G.outline(guard), fill: "#efe6cf", stroke: "ink2", op: .9, title: "Pickguard (raised, cream)" }], G.neck(6.82, 16.0, 2.15, 1.98, 24.75, "#7a4a2a", "#4a2e1e"))
    .concat(hb(5.9, "Neck (rhythm)"), hb(1.55, "Bridge (treble)"), [
    { t: "shape", d: G.rect(0.12, -0.18, -1.45, 1.45), fill: "#c9cbce", stroke: "ink2", title: "Tune-o-matic bridge" },
    { t: "shape", d: G.rect(-1.45, -1.8, -1.6, 1.6), fill: "#c9cbce", stroke: "ink2", title: "Stop tailpiece" },
    G.strings(6, 0.41, -1.6, 16.0),
    { t: "seg", k: "sel", x: X(9.4) - 60, y: Y(-4.1) - 9, w: 120, h: 18, opts: [["rhythm", "Rhythm"], ["both", "Both"], ["treble", "Treble"]] },
    { t: "label", x: X(9.4), y: Y(-4.1) + 24, text: "3-way toggle", size: 9, dim: true },
    { t: "knob", k: "vol1", x: X(0.4), y: Y(3.1), r: 16, label: "Volume (neck)", cap: "#d8b24a" },
    { t: "knob", k: "vol2", x: X(-2.0), y: Y(2.6), r: 16, label: "Volume (bridge)", cap: "#d8b24a" },
    { t: "knob", k: "tone1", x: X(-0.5), y: Y(4.85), r: 16, label: "Tone (neck)", cap: "#d8b24a" },
    { t: "knob", k: "tone2", x: X(-2.9), y: Y(4.35), r: 16, label: "Tone (bridge)", cap: "#d8b24a" },
    { t: "switch", k: "phase", x: 12, y: Y(5.6), w: 230, h: 20, label: "What if: neck out of phase (a mod)", a: "mod" },
    { t: "jack", x: X(-4.5), y: Y(4.3), r: 8, label: "Output" },
    { t: "label", x: 12, y: 22, text: "LES PAUL-STYLE", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.65), text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "gt-lespaul", name: "Les Paul", w: 800, h: 530, knob: "cap", accent: "sel", accents: { sel: "#e8a400", mod: "#d04a8a" }, items: items,
    src: ["Controls (two volume, two tone, three-way switch): Wikipedia, \"Gibson Les Paul\""],
    approx: "Whole body at one scale (36 units an inch). The outline (about 17.25 x 13 in), positions and pickup distances are this site's drawing after photos (approximate). The out-of-phase switch is not on a stock Les Paul: a what-if, as some players have added." });
})();
