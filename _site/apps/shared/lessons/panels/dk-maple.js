// Maple wood snare: top view (batter head, lugs) and side view (shell, strainer with throw-off, butt end): drawn after photos (top and side views at one scale (11 units an inch) from the nominal sizes, no logos, plain names). Written by hand from a generator; clicks on
// the drawing are hit-tested by DrumKits.zoneAt against `zones` (apps/shared/lessons/drumkits.js). Positions and finishes: unverified.
(function () { var D = DrumKits.draw, F = "#c8955a";
  var top = D.head(105, 118, 78.0, 10, F, "Maple", "die-cast");
  var sh = 61, y0 = 115 - sh / 2;
  var side = [
    { t: "shape", d: "M242 " + y0 + " h156 v" + sh + " h-156 Z", fill: F, stroke: "ink", sw: 1.4, title: "Maple shell, 14 x 5.5\"" },
    
    { t: "shape", d: "M236 " + (y0 - 6) + " h168 v6 h-168 Z M236 " + (y0 + sh) + " h168 v6 h-168 Z", fill: "#b8bcc2", stroke: "ink", sw: 1, title: "hoops (top: batter, bottom: snare side)" }];
  for (var i = 0; i < 5; i++) { var x = 256 + i * 32.0; side.push({ t: "shape", d: "M" + (x - 3) + " " + (y0 + 4) + " h6 v" + (sh - 8) + " h-6 Z", fill: "#d0d3d8", stroke: "ink", sw: 0.8, title: "lug" }); }
  side.push({ t: "shape", d: "M386 " + (y0 + 6) + " h10 v" + (sh - 6) + " h-10 Z", fill: "#9a9ea4", stroke: "ink", sw: 1, title: "butt end (snares anchored)" },
    { t: "shape", d: "M242 " + (y0 + sh + 8) + " h156", fill: "none", stroke: "#777", sw: 2, op: 0.9, title: "snare wires under the bottom head" });
  FaithfulPanel.register({ id: "dk-maple", name: "Maple", w: 440, h: 290,
    zones: [{ part: "snare", kind: "drum", cx: 105, cy: 118, r: 78.0 }],
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
