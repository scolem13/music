// Yamaha CP-70 bound to EPiano's "cp70" profile: a control panel at the left of the key block with Volume, a three-band EQ
// (Bass, Middle, Treble) and Tremolo speed and depth. Which knobs and where: from memory, UNVERIFIED (Wikipedia names only the
// graphic EQ of the D models and the effects loop). 73 keys (43 white). No logo.
FaithfulPanel.register({ id: "ep-cp70", name: "Yamaha CP-70", w: 1400, h: 270, knob: "cap", accent: "white", accents: { white: "#cfcfcf" },
  src: ["Layout from memory of photos of the instrument; not measured."], approx: "Knob set and places guessed (unverified).",
  items: [
    { t: "section", x: 10, y: 10, w: 520, h: 90, label: "", head: 0 },
    { t: "knob", k: "vol", x: 60, y: 46, r: 18, label: "VOLUME", cap: "#f0f0f0" },
    { t: "section", x: 110, y: 18, w: 230, h: 76, label: "EQUALIZER", title: "border", size: 9 },
    { t: "knob", k: "bass", x: 150, y: 52, r: 15, label: "BASS", cap: "#f0f0f0" },
    { t: "knob", k: "mid", x: 225, y: 52, r: 15, label: "MIDDLE", cap: "#f0f0f0" },
    { t: "knob", k: "treble", x: 300, y: 52, r: 15, label: "TREBLE", cap: "#f0f0f0" },
    { t: "section", x: 350, y: 18, w: 170, h: 76, label: "TREMOLO", title: "border", size: 9 },
    { t: "knob", k: "rate", x: 395, y: 52, r: 15, label: "SPEED", cap: "#f0f0f0" },
    { t: "knob", k: "trem", x: 470, y: 52, r: 15, label: "DEPTH", cap: "#f0f0f0" },
    { t: "keys", x: 10, y: 110, w: 1380, h: 150, n: 43 } ] });
