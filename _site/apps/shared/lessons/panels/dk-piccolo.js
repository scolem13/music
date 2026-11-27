// Piccolo snare: top view (batter head, lugs) and side view (shell, strainer with throw-off, butt end): drawn after photos (top and side views at one scale (11 units an inch) from the nominal sizes, no logos, plain names). Written by hand from a generator; clicks on
// the drawing are hit-tested by DrumKits.zoneAt against `zones` (apps/shared/lessons/drumkits.js). Positions and finishes: unverified.
(function () { var D = DrumKits.draw, F = "#d6d9dd";
  var top = D.head(105, 118, 72.4, 8, F, "Piccolo", "triple-flanged");
  var sh = 33, y0 = 115 - sh / 2;
  var side = [
    { t: "shape", d: "M248 " + y0 + " h145 v" + sh + " h-145 Z", fill: F, stroke: "ink", sw: 1.4, title: "Steel shell, 13 x 3\"" },
    
    { t: "shape", d: "M242 " + (y0 - 6) + " h157 v6 h-157 Z M242 " + (y0 + sh) + " h157 v6 h-157 Z", fill: "#b8bcc2", stroke: "ink", sw: 1, title: "hoops (top: batter, bottom: snare side)" }];
  for (var i = 0; i < 4; i++) { var x = 262 + i * 39; side.push({ t: "shape", d: "M" + (x - 3) + " " + (y0 + 4) + " h6 v" + (sh - 8) + " h-6 Z", fill: "#d0d3d8", stroke: "ink", sw: 0.8, title: "lug" }); }
  side.push({ t: "shape", d: "M381 " + (y0 + 6) + " h10 v" + (sh - 6) + " h-10 Z", fill: "#9a9ea4", stroke: "ink", sw: 1, title: "butt end (snares anchored)" },
    { t: "shape", d: "M248 " + (y0 + sh + 8) + " h145", fill: "none", stroke: "#777", sw: 2, op: 0.9, title: "snare wires under the bottom head" });
  FaithfulPanel.register({ id: "dk-piccolo", name: "Piccolo", w: 440, h: 290,
    zones: [{ part: "snare", kind: "drum", cx: 105, cy: 118, r: 72.4 }],
    items: top.concat(side, [
      { t: "label", x: 105, y: 20, text: "TOP (click: centre / edge / rim)", size: 8, dim: true }, { t: "label", x: 320, y: 20, text: "SIDE", size: 8, dim: true },
      { t: "key", k: "wires", x: 252, y: y0 + sh + 14, w: 34, h: 18, label: "THROW-OFF", below: true, led: true, cap: "#333" },
      { t: "knob", k: "wireTension", x: 345, y: y0 + sh + 24, r: 10, label: "STRAINER" },
      { t: "knob", k: "tension", x: 60, y: 238, r: 13, label: "TUNE (keys)" }, { t: "knob", k: "reso", x: 120, y: 238, r: 13, label: "RESO" },
      { t: "knob", k: "muffle", x: 180, y: 238, r: 13, label: "MUFFLE" },
      { t: "seg", k: "head", x: 230, y: 228, w: 190, h: 20, opts: [["coated1", "coated"], ["clear1", "clear"], ["coated2", "2-ply"], ["calf", "calf"]] },
      { t: "label", x: 325, y: 262, text: "HEAD", size: 8, dim: true }]),
    src: ["Photos of the drum (positions); Wikipedia, \"Snare drum\" (strainer, throw-off, wires on the bottom head)"],
    approx: "Top and side views at one scale from the nominal size; lug count, hoop and finish from memory (unverified); no logo." });
})();
