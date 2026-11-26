// Hohner Clavinet D6 bound to EPiano's "clav" profile. Wikipedia "Clavinet": four tone rockers on the left (Brilliant, Treble,
// Medium, Soft), two pickup rockers on the right (marked AB and CD), a mute slider on the right. Places and sizes are this
// page's guess; which rocker position picks which pickup is this page's reading (UNVERIFIED). 60 keys F to E (35 white). No logo.
FaithfulPanel.register({ id: "ep-clav", name: "Clavinet D6", w: 1400, h: 260, accent: "red", accents: { red: "#d8473a" },
  src: ["Wikipedia, \"Clavinet\" (the controls and where they are); exact places guessed."], approx: "Places guessed; the pickup rocker meanings are this page's reading (unverified).",
  items: [
    { t: "section", x: 10, y: 10, w: 1380, h: 90, label: "", head: 0 },
    { t: "switch", k: "brill", x: 40, y: 40, w: 90, h: 34, label: "BRILLIANT" },
    { t: "switch", k: "treb", x: 140, y: 40, w: 90, h: 34, label: "TREBLE" },
    { t: "switch", k: "med", x: 240, y: 40, w: 90, h: 34, label: "MEDIUM" },
    { t: "switch", k: "soft", x: 340, y: 40, w: 90, h: 34, label: "SOFT" },
    { t: "seg", k: "pa", x: 470, y: 40, w: 80, h: 34, opts: [["A", "A"], ["B", "B"]] },
    { t: "seg", k: "pc", x: 560, y: 40, w: 80, h: 34, opts: [["C", "C"], ["D", "D"]] },
    { t: "label", x: 555, y: 30, text: "PICKUPS", size: 9, dim: true },
    { t: "hslider", k: "mute", x: 1150, y: 45, w: 210, h: 22, label: "MUTE" },
    { t: "keys", x: 10, y: 110, w: 1380, h: 140, n: 35 } ] });
