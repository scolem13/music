// Sennheiser MD 421: a dark, slotted grille head with a clip, and the five-position bass roll-off ring at the tail, M (music) to
// S (speech) (Wikipedia, "Sennheiser MD 421"). Step amounts are the site's. Proportions after photos (approximate); no logo.
(function () {
  FaithfulPanel.register({ id: "mic-md421", name: "MD 421", w: 440, h: 130,
    items: [
      { t: "shape", d: "M20 30 h150 l30 14 v32 l-30 14 h-150 Z", fill: "#2a2a2a", stroke: "ink", sw: 1.5, title: "Head with slotted grille (black)" },
      { t: "shape", d: "M36 40 v40 M52 40 v40 M68 40 v40 M84 40 v40 M100 40 v40 M116 40 v40 M132 40 v40 M148 40 v40", fill: "none", stroke: "#666", sw: 2, title: "Slots" },
      { t: "shape", d: "M200 48 h150 v24 h-150 Z", fill: "#3a3a3a", stroke: "ink", sw: 1.5, title: "Body" },
      { t: "shape", d: "M350 50 h30 v20 h-30 Z", fill: "#888", stroke: "ink", sw: 1, title: "XLR connector" },
      { t: "seg", k: "bass", x: 210, y: 94, w: 140, h: 20, opts: [["M", "M"], ["2", "·"], ["3", "·"], ["4", "·"], ["S", "S"]] },
      { t: "label", x: 280, y: 126, text: "BASS ROLL-OFF (ring at the tail)", size: 8, dim: true }],
    src: ["Wikipedia, \"Sennheiser MD 421\": five-step bass roll-off, M to S"], approx: "The ring drawn flat below the body; proportions after photos; no logo." });
})();
