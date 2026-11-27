// Paiste 2002 18" crash: from above (bell, bow, edge): drawn after photos (proportions approximate, no logos, plain names). Written by hand from a generator; clicks on
// the drawing are hit-tested by DrumKits.zoneAt against `zones` (apps/shared/lessons/drumkits.js). Positions and finishes: unverified.
(function () { var D = DrumKits.draw;
  FaithfulPanel.register({ id: "cy-p2002", name: "2002 crash", w: 300, h: 300,
    zones: [{ part: "p2002", kind: "cymbal", cx: 150, cy: 135, r: 101 }],
    items: D.cym(150, 135, 101, "#e6c46a", "Paiste 2002 18\" crash", false).concat([
      { t: "label", x: 150, y: 12, text: "click: bell / bow / edge", size: 8, dim: true },
      { t: "key", k: "choke", x: 20, y: 268, w: 48, h: 24, label: "CHOKE", led: true, cap: "#333" }]),
    src: ["Wikipedia, \"Cymbal\" (bell, bow, edge)", "Photos"],
    approx: "Lathing rings schematic; colour approximate; no logo." });
})();
