// Fender Rhodes Mark I Stage 73 as a FaithfulPanel layout bound to EPiano's "rhodes" profile (adapter in epiano.js).
// The name rail with its two knobs at the left end (Volume, Bass boost) above 73 keys E to E (43 white). Positions and the knob
// legends are this page's guess from memory (no drawing measured; the service manual was not read): UNVERIFIED. No logo.
FaithfulPanel.register({ id: "ep-rhodes", name: "Rhodes Mark I Stage 73", w: 1400, h: 260, knob: "cap", accent: "silver", accents: { silver: "#9aa3ad" },
  src: ["Layout from memory of photos of the instrument; not measured."], approx: "Knob places and legends guessed (unverified). Only the two name-rail knobs are on the real Stage; the amp is separate.",
  items: [
    { t: "section", x: 10, y: 10, w: 1380, h: 80, label: "", head: 0 },
    { t: "knob", k: "vol", x: 70, y: 40, r: 19, label: "VOLUME", cap: "#202020" },
    { t: "knob", k: "bass", x: 150, y: 40, r: 19, label: "BASS BOOST", cap: "#202020" },
    { t: "label", x: 700, y: 56, text: "MARK I  STAGE  73", size: 14, dim: true },
    { t: "keys", x: 10, y: 100, w: 1380, h: 150, n: 43 } ] });
