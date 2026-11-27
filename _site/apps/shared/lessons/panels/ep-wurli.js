// Wurlitzer 200A bound to EPiano's "wurli" profile: Volume and Vibrato knobs at the left end of the key slip, a headphone
// socket, 64 keys A to C (38 white). Places from memory: UNVERIFIED. No logo.
FaithfulPanel.register({ id: "ep-wurli", name: "Wurlitzer 200A", w: 1400, h: 250, knob: "cap", accent: "cream", accents: { cream: "#d9c9a3" },
  src: ["Layout from memory of photos of the instrument; not measured."], approx: "Knob places guessed (unverified). The vibrato has one speed (Wikipedia); its rate here is this page's.",
  items: [
    { t: "section", x: 10, y: 10, w: 1380, h: 70, label: "", head: 0 },
    { t: "knob", k: "vol", x: 60, y: 37, r: 16, label: "VOLUME", cap: "#e8e2d4" },
    { t: "knob", k: "vib", x: 130, y: 37, r: 16, label: "VIBRATO", cap: "#e8e2d4" },
    { t: "jack", x: 200, y: 45, r: 8, label: "PHONES" },
    { t: "label", x: 760, y: 50, text: "200A", size: 14, dim: true },
    { t: "keys", x: 10, y: 90, w: 1380, h: 150, n: 38 } ] });
