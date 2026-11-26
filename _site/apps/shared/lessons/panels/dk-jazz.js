// Jazz kit (18 / 12 / 14): the kit from above (drummer at the bottom): drawn after photos (proportions approximate, no logos, plain names). Written by hand from a generator; clicks on
// the drawing are hit-tested by DrumKits.zoneAt against `zones` (apps/shared/lessons/drumkits.js). Positions and finishes: unverified.
(function () { var D = DrumKits.draw, F = "#6b3a2a";
  var kickW = 58, kickH = 56, kx = 260 - kickW / 2;
  var items = [{ t: "shape", d: "M" + kx + " 30 h" + kickW + " v" + kickH + " h-" + kickW + " Z", fill: F, stroke: "ink", sw: 1.4, title: "Bass drum 18\" (seen from above, lying on its side): click to play" },
    { t: "label", x: 260, y: 26, text: "KICK 18\"", size: 8, dim: true }]
    .concat(D.head(215, 150, 38, 6, "#999", "Tom 12\""), D.head(370, 245, 45, 8, "#999", "Floor tom 14\""), D.head(165, 255, 45, 8, "#999", "Snare"),
      D.cym(80, 225, 27, "#d8b45a", "Hi-hats"), D.cym(430, 120, 34, "#d8b45a", "Zildjian K 20\" ride"), D.cym(100, 100, 27, "#d8b45a", "Zildjian A 16\" crash"));
  FaithfulPanel.register({ id: "dk-jazz", name: "Jazz kit", w: 520, h: 400,
    zones: [{ part: "kick", kind: "kick", x: kx, y: 30, w: kickW, h: kickH }, { part: "tom1", kind: "drum", cx: 215, cy: 150, r: 38 }, { part: "floor", kind: "drum", cx: 370, cy: 245, r: 45 },
      { part: "snare", kind: "drum", cx: 165, cy: 255, r: 45 }, { part: "hats", kind: "cymbal", cx: 80, cy: 225, r: 27, top: true },
      { part: "ride", kind: "cymbal", cx: 430, cy: 120, r: 34, top: true }, { part: "crash", kind: "cymbal", cx: 100, cy: 100, r: 27, top: true }],
    items: items.concat([
      { t: "knob", k: "kick.tension", x: 40, y: 345, r: 12, label: "KICK" }, { t: "knob", k: "kick.muffle", x: 90, y: 345, r: 12, label: "PILLOW" },
      { t: "key", k: "kick.port", x: 122, y: 334, w: 30, h: 18, label: "PORT", below: true, led: true, cap: "#333" },
      { t: "knob", k: "snare.tension", x: 190, y: 345, r: 12, label: "SNARE" }, { t: "key", k: "snare.wires", x: 222, y: 334, w: 30, h: 18, label: "SNARES", below: true, led: true, cap: "#333" },
      { t: "knob", k: "tom1.tension", x: 290, y: 345, r: 12, label: "TOM" }, { t: "knob", k: "floor.tension", x: 340, y: 345, r: 12, label: "FLOOR" },
      { t: "seg", k: "hats.pedal", x: 375, y: 336, w: 135, h: 18, opts: [["closed", "cl"], ["half", "½"], ["open", "op"], ["foot", "ft"]] },
      { t: "label", x: 442, y: 368, text: "HI-HAT PEDAL", size: 8, dim: true }]),
    src: ["Wikipedia, \"Drum kit\" (layout and usual sizes)", "Photos of kits of this style"],
    approx: "Top-down layout schematic; positions, finishes and cymbal choices the site's; no logos." });
})();
