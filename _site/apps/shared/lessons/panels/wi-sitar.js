// Sitar, top view (gourd left, neck right): drawn after photos (proportions approximate, no maker's marks, plain names). Frets are
// placed from the raga (WorldInst.frets: just cents, as on lessons/ragas.qmd) and redrawn when the raga changes; click a space between
// frets to play that note on the main string, the chikari, the jod / kharaj, or the sympathetic strings (WorldInst.zoneAt).
// Positions, string colours and the 13 taraf routes: unverified (the site's drawing).
(function () { FaithfulPanel.register({ id: "wi-sitar", name: "Sitar", w: 680, h: 300, build: function (st) { return WorldInst.draw.sitar(st); },
  controls: [{ t: "seg", k: "raga", x: 20, y: 200, w: 330, h: 20, opts: [["yaman", "Yaman"], ["bhairav", "Bhairav"], ["bhupali", "Bhupali"], ["todi", "Todi"], ["malkauns", "Malkauns"], ["khamaj", "Khamaj"]] },
    { t: "label", x: 185, y: 236, text: "RAGA (MOVES THE FRETS, RETUNES THE TARAF)", size: 7, dim: true },
    { t: "seg", k: "sa", x: 370, y: 200, w: 150, h: 20, opts: [["C", "C"], ["C#", "C♯"], ["D", "D"], ["D#", "D♯"], ["E", "E"]] }, { t: "label", x: 445, y: 236, text: "SA", size: 7, dim: true },
    { t: "knob", k: "jawari", x: 560, y: 212, r: 13, label: "JAWARI" }, { t: "knob", k: "meend", x: 620, y: 212, r: 13, label: "MEEND" },
    { t: "switch", k: "taraf", x: 20, y: 256, w: 150, h: 20, label: "TARAF RINGING" },
    { t: "seg", k: "string", x: 190, y: 256, w: 200, h: 20, opts: [["main", "main"], ["jod", "jod"], ["chikari", "chikari"]] }, { t: "label", x: 290, y: 292, text: "BUTTON STRING (the drawing plays whatever you click)", size: 7, dim: true }],
  src: ["Wikipedia, \"Sitar\" (strings, frets, two bridges, gourds, Kharaj Pancham tuning)", "Photos of instrumental-style sitars"],
  approx: "Top-view schematic; fret places from the raga's just cents, string routes and proportions the site's; no logos." }); })();
