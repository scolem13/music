// Tenor (lead) steel pan, from above: 29 note areas of a low-C tenor in the fourths-and-fifths layout (Wikipedia, "Steelpan":
// Anthony Williams's arrangement, the standard for lead pans); outer ring C4-B4 going round in fifths, middle ring the octave above at
// the same angles, inner ring C6-E6. Exact note shapes and inner-ring order: unverified (makers differ). Click a note area to strike it.
(function () { FaithfulPanel.register({ id: "wi-tenorpan", name: "Tenor pan", w: 520, h: 520, build: function () { return WorldInst.draw.pan(); },
  controls: [{ t: "knob", k: "oct", x: 40, y: 470, r: 13, label: "OCTAVE ¢" }, { t: "knob", k: "twelfth", x: 100, y: 470, r: 13, label: "TWELFTH ¢" },
    { t: "seg", k: "stick", x: 150, y: 460, w: 150, h: 20, opts: [["soft", "soft"], ["medium", "med"], ["hard", "hard"]] }, { t: "label", x: 225, y: 496, text: "STICK TIP", size: 7, dim: true },
    { t: "seg", k: "place", x: 315, y: 460, w: 110, h: 20, opts: [["centre", "centre"], ["edge", "edge"]] }, { t: "label", x: 370, y: 496, text: "STRIKE PLACE", size: 7, dim: true },
    { t: "knob", k: "couple", x: 475, y: 470, r: 13, label: "NEIGHBOUR" }],
  src: ["Wikipedia, \"Steelpan\" (fourths and fifths, tuned partials, bigger area lower)", "Photos of tenor pans"],
  approx: "Plan view; ring radii, area sizes and the inner ring's order the site's; no logos." }); })();
