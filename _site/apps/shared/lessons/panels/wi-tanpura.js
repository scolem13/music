// Tanpura (Miraj style), top view: four strings over the curved bridge with the cotton threads (juari), beads for fine tuning, no
// frets (Wikipedia, "Tanpura"). Click a string to pluck it. Proportions and colours: unverified (the site's drawing).
(function () { FaithfulPanel.register({ id: "wi-tanpura", name: "Tanpura", w: 700, h: 260, build: function (st) { return WorldInst.draw.tanpura(st); },
  controls: [{ t: "seg", k: "tuning", x: 20, y: 200, w: 220, h: 20, opts: [["P", "Pa"], ["M", "Ma"], ["N", "Ni"], ["D", "Dha"]] }, { t: "label", x: 130, y: 236, text: "FIRST STRING", size: 7, dim: true },
    { t: "seg", k: "sa", x: 260, y: 200, w: 150, h: 20, opts: [["C", "C"], ["C#", "C♯"], ["D", "D"], ["D#", "D♯"], ["E", "E"]] }, { t: "label", x: 335, y: 236, text: "SA", size: 7, dim: true },
    { t: "knob", k: "jawari", x: 450, y: 212, r: 13, label: "JAWARI" }, { t: "knob", k: "thread", x: 510, y: 212, r: 13, label: "THREAD" }, { t: "knob", k: "tempo", x: 570, y: 212, r: 13, label: "PACE" }],
  src: ["Garland vol. 5 (2000), pp. 332, 355 (unfretted, thread under each string, rounded bridge)", "Wikipedia, \"Tanpura\" (4 strings, tunings, bridge and thread)", "Photos of Miraj tanpuras"],
  approx: "Top-view schematic; the thread's place is drawn from the Thread knob; proportions the site's; no logos." }); })();
