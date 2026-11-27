// Gibson SG Standard, the whole body front-on at one scale (36 units an inch), neck to the left (a stub with frets at the 24.75 in
// scale), bass strings at the top, for FaithfulPanel + GuitarPickups.adapter: thin double-cutaway body with pointed horns (about
// 15.5 x 12.75 in), the neck joining high up (around the 19th-20th fret), two humbuckers (the neck one further from the bridge than on
// a Les Paul), the toggle in the lower bout beside the four knobs. Pickup centres 6.6 / 1.55 in from the bridge, the outline and all
// positions are this site's estimates after photos; no logo.
(function () {
  var G = GuitarPickups.drawing(36, 516, 262), X = G.X, Y = G.Y;
  function hb(d, label) { return [{ t: "shape", d: G.rect(d + 0.95, d - 0.95, -1.62, 1.62), fill: "#111111", stroke: "ink2", title: label + " humbucker (mounting ring)" },
      { t: "shape", d: G.rect(d + 0.72, d + 0.04, -1.38, 1.38) + " " + G.rect(d - 0.04, d - 0.72, -1.38, 1.38), fill: "#c9cbce", stroke: "#666", title: label + " humbucker: two coils" },
      { t: "shape", d: [0, 1, 2, 3, 4, 5].map(function (i) { var e = (i - 2.5) * 0.41; return G.dot(d + 0.38, e, 3) + " " + G.dot(d - 0.38, e, 3); }).join(" "), fill: "#8d8f93", stroke: "#555", sw: .6 },
      { t: "label", x: X(d), y: Y(-2.65), text: label, size: 10, bold: true }]; }
  var body = [[-4.3, 0], [-4.1, -3.4], [-3.0, -5.6], [-0.8, -6.3], [1.8, -6.0], [3.6, -5.2], [5.4, -5.0], [7.6, -5.3], [9.7, -5.0], [11.3, -4.05], [10.6, -3.4],
    [9.2, -2.6], [8.0, -1.6], [7.7, -1.1], [7.7, 1.1], [8.0, 1.6], [9.0, 2.5], [10.6, 3.4], [10.9, 3.95], [9.4, 4.8], [7.4, 5.3], [5.4, 5.2], [3.6, 5.6],
    [1.6, 6.35], [-0.8, 6.45], [-3.0, 5.7], [-4.1, 3.5]];
  var guard = [[7.7, -1.3], [7.1, -2.2], [4.0, -2.45], [2.5, -2.0], [2.4, 1.8], [3.2, 2.6], [5.6, 2.9], [7.2, 2.0], [7.7, 1.3]];
  var items = [{ t: "shape", d: G.outline(body), fill: "#7a1e1e", stroke: "ink2", sw: 2, op: .9, title: "Body (thin mahogany, double cutaway with pointed horns; about 15.5 x 12.75 in)" }]
    .concat([
    { t: "shape", d: G.outline(guard), fill: "#111111", stroke: "ink2", title: "Pickguard" }], G.neck(7.6, 14.0, 2.15, 2.0, 24.75, "#6a3a22", "#3e2416"))
    .concat(hb(6.6, "Neck (rhythm)"), hb(1.55, "Bridge (treble)"), [
    { t: "shape", d: G.rect(0.12, -0.18, -1.45, 1.45), fill: "#c9cbce", stroke: "ink2", title: "Tune-o-matic bridge" },
    { t: "shape", d: G.rect(-1.45, -1.8, -1.6, 1.6), fill: "#c9cbce", stroke: "ink2", title: "Stop tailpiece" },
    G.strings(6, 0.41, -1.6, 14.0),
    { t: "seg", k: "sel", x: X(3.7) - 60, y: Y(3.6) - 9, w: 120, h: 18, opts: [["rhythm", "Rhythm"], ["both", "Both"], ["treble", "Treble"]] },
    { t: "label", x: X(3.7), y: Y(3.6) + 24, text: "3-way toggle", size: 9 },
    { t: "knob", k: "vol1", x: X(0.0), y: Y(3.1), r: 16, label: "Vol (neck)", cap: "#d8b24a" },
    { t: "knob", k: "vol2", x: X(-2.1), y: Y(2.6), r: 16, label: "Vol (bridge)", cap: "#d8b24a" },
    { t: "knob", k: "tone1", x: X(-0.7), y: Y(4.85), r: 16, label: "Tone (neck)", cap: "#d8b24a" },
    { t: "knob", k: "tone2", x: X(-2.9), y: Y(4.35), r: 16, label: "Tone (bridge)", cap: "#d8b24a" },
    { t: "switch", k: "phase", x: 12, y: Y(6.0), w: 200, h: 20, label: "What if: neck out of phase (a mod)", a: "mod" },
    { t: "jack", x: X(-3.4), y: Y(2.4), r: 8, label: "Output" },
    { t: "label", x: 12, y: 22, text: "SG-STYLE", size: 12, anchor: "start", bold: true },
    { t: "label", x: 12, y: Y(1.65), text: "← neck (to the headstock)", size: 9, anchor: "start", dim: true }]);
  FaithfulPanel.register({ id: "gt-sg", name: "SG", w: 700, h: 530, knob: "cap", accent: "sel", accents: { sel: "#e8a400", mod: "#d04a8a" }, items: items,
    src: ["Controls (a volume and a tone for each pickup, three-way switch): Wikipedia, \"Gibson SG\""],
    approx: "Whole body at one scale (36 units an inch). The outline (about 15.5 x 12.75 in), positions and pickup distances are this site's drawing after photos (approximate). The out-of-phase switch is a what-if, not stock." });
})();
