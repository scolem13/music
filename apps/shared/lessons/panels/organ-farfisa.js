// Farfisa Combo Compact as a FaithfulPanel layout bound to OrganCompare's "farfisa" profile. Tab list from Wikipedia "Farfisa"
// (16′ bass and strings; 8′ flute, oboe, trumpet, strings; 4′ flute, piccolo, strings). Tab colours, order and the vibrato tabs'
// names are this page's own (UNVERIFIED). No logo artwork.
(function () {
  var I = [], T = [["bass16", "BASS 16"], ["str16", "STRINGS 16"], ["fl8", "FLUTE 8"], ["ob8", "OBOE 8"], ["tr8", "TRUMPET 8"], ["str8", "STRINGS 8"], ["fl4", "FLUTE 4"], ["pic4", "PICCOLO 4"], ["str4", "STRINGS 4"]];
  var col = function (k) { return /^str/.test(k) ? "#f0d8a8" : /^(ob|tr)/.test(k) ? "#e46a3a" : /^bass/.test(k) ? "#6b3a2a" : "#f6f6f0"; };
  I.push({ t: "section", x: 10, y: 10, w: 840, h: 120, label: "VOICES", title: "border", size: 9 });
  T.forEach(function (t, i) { I.push({ t: "key", k: t[0], x: 24 + i * 66, y: 30, w: 58, h: 70, label: t[1], cap: col(t[0]), size: 7.5 }); });
  I.push({ t: "section", x: 10, y: 142, w: 840, h: 60, label: "VIBRATO · REVERB · VOLUME", title: "border", size: 9 });
  I.push({ t: "seg", k: "vib", x: 24, y: 158, w: 380, h: 26, opts: [["off", "OFF"], ["ls", "LIGHT SLOW"], ["lf", "LIGHT FAST"], ["hs", "HEAVY SLOW"], ["hf", "HEAVY FAST"]] });
  I.push({ t: "switch", k: "rev", x: 420, y: 158, w: 100, h: 26, label: "REVERB" });
  I.push({ t: "hslider", k: "swell", x: 540, y: 156, w: 290, h: 30, label: "VOLUME PEDAL", a: "red" });
  I.push({ t: "keys", x: 24, y: 214, w: 812, h: 70, n: 29 });
  FaithfulPanel.register({ id: "organ-farfisa", name: "Farfisa Combo Compact", w: 860, h: 296, knob: "cap", accent: "red",
    accents: { red: "#d23a2a" }, colors: { light: { body: "#fbeee6" }, dark: { body: "#2b1714" } },
    src: ["Wikipedia, 'Farfisa' (tab list, four vibrato settings, valve-driven reverb)"], approx: "Tab order and colours, and the vibrato tabs' names, are this page's own (UNVERIFIED); no measured drawing.",
    items: I });
})();
