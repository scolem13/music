// Shure Beta 52A: a large dark grille head on a pneumatic shock mount, with the built-in locking stand adapter and the XLR in it
// (Shure product page). No switches. Proportions after photos (approximate); no logo.
(function () {
  FaithfulPanel.register({ id: "mic-beta52", name: "Beta 52A", w: 440, h: 130,
    items: [
      { t: "shape", d: "M20 20 h120 a16 16 0 0 1 16 16 v58 a16 16 0 0 1 -16 16 h-120 Z", fill: "#2c2d30", stroke: "ink", sw: 1.5, title: "Grille (large, dark)" },
      { t: "shape", d: "M36 26 v78 M56 26 v78 M76 26 v78 M96 26 v78 M116 26 v78", fill: "none", stroke: "#666", sw: 1, title: "Mesh" },
      { t: "shape", d: "M156 44 h150 l10 10 v22 l-10 10 h-150 Z", fill: "#55575c", stroke: "ink", sw: 1.5, title: "Body" },
      { t: "shape", d: "M316 52 h40 v26 h-40 Z M336 78 v30 h-10 v-30", fill: "#777", stroke: "ink", sw: 1, title: "Locking stand adapter with XLR" },
      { t: "label", x: 230, y: 120, text: "Beta 52A — dynamic, supercardioid, no switches", size: 10 }],
    src: ["Shure Beta 52A product page (shure.com): integral locking stand adapter, pneumatic shock mount"], approx: "Proportions after photos (approximate); no logo." });
})();
