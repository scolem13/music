// Zildjian A 20" ride: from above (bell, bow, edge): drawn after photos (proportions approximate, no logos, plain names). Written by hand from a generator; clicks on
// the drawing are hit-tested by DrumKits.zoneAt against `zones` (apps/shared/lessons/drumkits.js). Positions and finishes: unverified.
(function () { var D = DrumKits.draw;
  FaithfulPanel.register({ id: "cy-aride", name: "A ride", w: 300, h: 300,
    zones: [{ part: "aride", kind: "cymbal", cx: 150, cy: 135, r: 112 }],
    items: D.cym(150, 135, 112, "#d8b45a", "Zildjian A 20\" ride", false).concat([
      { t: "label", x: 150, y: 12, text: "click: bell / bow / edge", size: 8, dim: true },
      { t: "key", k: "choke", x: 20, y: 268, w: 40, h: 18, label: "CHOKE", led: true, cap: "#333" }]),
    src: ["Wikipedia, \"Cymbal\" (bell, bow, edge)", "Photos"],
    approx: "Lathing rings schematic; colour approximate; no logo." });
})();
