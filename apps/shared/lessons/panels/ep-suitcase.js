// Fender Rhodes Mark I Suitcase 73 bound to EPiano's "suitcase" profile. Name-rail knobs Volume, Bass, Treble and the
// "Vibrato" (really a stereo tremolo: Wikipedia "Rhodes piano") Intensity and Speed. Order and places from memory: UNVERIFIED. No logo.
FaithfulPanel.register({ id: "ep-suitcase", name: "Rhodes Mark I Suitcase 73", w: 1400, h: 260, knob: "cap", accent: "silver", accents: { silver: "#9aa3ad" },
  src: ["Layout from memory of photos of the instrument; not measured."], approx: "Knob order, places and legends guessed (unverified). The speaker cabinet under it is not drawn.",
  items: [
    { t: "section", x: 10, y: 10, w: 1380, h: 80, label: "", head: 0 },
    { t: "knob", k: "vol", x: 60, y: 40, r: 18, label: "VOLUME", cap: "#202020" },
    { t: "knob", k: "bass", x: 130, y: 40, r: 18, label: "BASS", cap: "#202020" },
    { t: "knob", k: "treble", x: 200, y: 40, r: 18, label: "TREBLE", cap: "#202020" },
    { t: "knob", k: "vib", x: 270, y: 40, r: 18, label: "VIBRATO", cap: "#202020" },
    { t: "knob", k: "rate", x: 340, y: 40, r: 18, label: "SPEED", cap: "#202020" },
    { t: "label", x: 800, y: 56, text: "MARK I  SUITCASE  73", size: 14, dim: true },
    { t: "keys", x: 10, y: 100, w: 1380, h: 150, n: 43 } ] });
