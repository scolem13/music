// Hohner Pianet N bound to EPiano's "pianet" profile: a vibrato switch beside the keys and a floor volume pedal (Wikipedia
// "Pianet"); places and the 61 keys F to F (36 white) are this page's guess, UNVERIFIED. No logo.
FaithfulPanel.register({ id: "ep-pianet", name: "Hohner Pianet N", w: 1400, h: 250, accent: "amber", accents: { amber: "#e0a030" },
  src: ["Wikipedia, \"Pianet\" (vibrato switch, volume pedal); places guessed."], approx: "Places guessed; the pedal is drawn as a slider.",
  items: [
    { t: "section", x: 10, y: 10, w: 1380, h: 70, label: "", head: 0 },
    { t: "switch", k: "vibOn", x: 40, y: 28, w: 100, h: 32, label: "VIBRATO" },
    { t: "vslider", k: "vol", x: 1330, y: 14, w: 40, h: 62, label: "PEDAL" },
    { t: "keys", x: 10, y: 90, w: 1380, h: 150, n: 36 } ] });
