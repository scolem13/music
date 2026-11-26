// Mbira dzavadzimu (22 keys): two registers on the left (the bass row lower and set back), one on the right, buzzers (machachara) on a plate, the hole for the right little finger (Wikipedia, "Mbira"); key order inside each register: unverified.
// Tine lengths drawn from the pitch (a clamped bar: f ~ 1 / length^2). Click a tine to pluck it (WorldInst.zoneAt). Proportions: unverified.
(function () { FaithfulPanel.register({ id: "wi-mbira", name: "Mbira", w: 520, h: 420, build: function (st) { return WorldInst.draw.tines("mbira", st); },
  controls: [{ t: "seg", k: "tuning", x: 20, y: 370, w: 240, h: 20, opts: [["major", "major"], ["nyamaropa", "nyamaropa"], ["katsanzaira", "katsanz."], ["mavembe", "mavembe"]] }, { t: "label", x: 140, y: 406, text: "TUNING (RETUNE THE TINES)", size: 7, dim: true },
    { t: "seg", k: "tonic", x: 270, y: 370, w: 150, h: 20, opts: [["C", "C"], ["D", "D"], ["F", "F"], ["G", "G"], ["A", "A"]] }, { t: "label", x: 345, y: 406, text: "TONIC", size: 7, dim: true },
    { t: "switch", k: "buzz", x: 430, y: 356, w: 80, h: 18, label: "BUZZERS" }, { t: "switch", k: "deze", x: 430, y: 380, w: 80, h: 18, label: "DEZE" }],
  src: ["Wikipedia, \"Mbira\" (layouts, buzzers, deze, Tracey's kalimba)", "Photos"],
  approx: "Schematic; tine lengths from pitch, spacing and the register order the site's; no logos." }); })();
