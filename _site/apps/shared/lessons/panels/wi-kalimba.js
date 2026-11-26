// Kalimba (17 tines, Hugh Tracey-style): lowest tine in the centre, alternating left / right going up (Wikipedia, "Mbira": lowest in the centre is common; which side first: unverified).
// Tine lengths drawn from the pitch (a clamped bar: f ~ 1 / length^2). Click a tine to pluck it (WorldInst.zoneAt). Proportions: unverified.
(function () { FaithfulPanel.register({ id: "wi-kalimba", name: "Kalimba", w: 520, h: 420, build: function (st) { return WorldInst.draw.tines("kalimba", st); },
  controls: [{ t: "seg", k: "tuning", x: 20, y: 370, w: 240, h: 20, opts: [["major", "major"], ["nyamaropa", "nyamaropa"], ["katsanzaira", "katsanz."], ["mavembe", "mavembe"]] }, { t: "label", x: 140, y: 406, text: "TUNING (RETUNE THE TINES)", size: 7, dim: true },
    { t: "seg", k: "tonic", x: 270, y: 370, w: 150, h: 20, opts: [["C", "C"], ["D", "D"], ["F", "F"], ["G", "G"], ["A", "A"]] }, { t: "label", x: 345, y: 406, text: "TONIC", size: 7, dim: true },
    { t: "switch", k: "buzz", x: 430, y: 356, w: 80, h: 18, label: "BUZZERS" }, { t: "switch", k: "deze", x: 430, y: 380, w: 80, h: 18, label: "DEZE" }],
  src: ["Wikipedia, \"Mbira\" (layouts, buzzers, deze, Tracey's kalimba)", "Photos"],
  approx: "Schematic; tine lengths from pitch, spacing and the register order the site's; no logos." }); })();
