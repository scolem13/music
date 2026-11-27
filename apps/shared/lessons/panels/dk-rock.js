// Rock kit (22 / 12 / 16): the kit from above (drummer at the bottom): drawn by DrumKits.draw.kit at 6 units an inch (nominal sizes, placement after photos, no logos, plain names). Written by hand from a generator; clicks on
// the drawing are hit-tested by DrumKits.zoneAt against `zones` (apps/shared/lessons/drumkits.js). Positions and finishes: unverified.
(function () { var D = DrumKits.draw, F = "#d98a2b";
  var K = D.kit({ S: 6, kick: [22, 18, F], tom: 12, floor: 16, snare: 14, hats: 14, ride: 20, crash: 18, names: { ride: "Zildjian A ride", crash: "Paiste 2002 crash" } }), items = K.items;
  FaithfulPanel.register({ id: "dk-rock", name: "Rock kit", w: 560, h: 500,
    zones: K.zones,
    items: items.concat([
      { t: "knob", k: "kick.tension", x: 40, y: 433, r: 12, label: "KICK" }, { t: "knob", k: "kick.muffle", x: 90, y: 433, r: 12, label: "PILLOW" },
      { t: "key", k: "kick.port", x: 122, y: 422, w: 30, h: 18, label: "PORT", below: true, led: true, cap: "#333" },
      { t: "knob", k: "snare.tension", x: 190, y: 433, r: 12, label: "SNARE" }, { t: "key", k: "snare.wires", x: 222, y: 422, w: 30, h: 18, label: "SNARES", below: true, led: true, cap: "#333" },
      { t: "knob", k: "tom1.tension", x: 290, y: 433, r: 12, label: "TOM" }, { t: "knob", k: "floor.tension", x: 340, y: 433, r: 12, label: "FLOOR" },
      { t: "seg", k: "hats.pedal", x: 375, y: 424, w: 135, h: 18, opts: [["closed", "cl"], ["half", "½"], ["open", "op"], ["foot", "ft"]] },
      { t: "label", x: 442, y: 456, text: "HI-HAT PEDAL", size: 8, dim: true }]),
    src: ["Wikipedia, \"Drum kit\" (layout and usual sizes)", "Photos of kits of this style"],
    approx: "Top-down at one scale (6 units an inch) from the nominal sizes; placement, finishes and cymbal choices the site's (after photos of a usual right-handed set-up); no logos." });
})();
