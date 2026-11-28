// Hammond B-3 / C-3 + Leslie 122 as a FaithfulPanel layout bound to OrganCompare's "b3" profile (adapter in organ-compare.js).
// Arrangement from general descriptions (Wikipedia "Hammond organ": one octave of reverse-coloured preset keys left of each manual,
// C = cancel, A# and B = the drawbar sets; two drawbar sets per manual + pedal drawbars). Drawn here with ONE set per manual (B)
// and no preset octave (2026-11-27). NO measured drawing: positions, spacing and
// the switch row are this page's own (approx). Drawbars pull DOWN: the handle lower = louder. No logo artwork.
(function () {
  var I = [], FT = ["16′", "5⅓′", "8′", "4′", "2⅔′", "2′", "1⅗′", "1⅓′", "1′"], COL = ["brown", "brown", "white", "white", "black", "white", "black", "black", "white"];
  var x = 150;
  function set(g, label, n, ft, cols) { var x0 = x; I.push({ t: "section", x: x0 - 6, y: 10, w: n * 24 + 10, h: 214, label: label, title: "border", size: 9 });
    for (var i = 0; i < n; i++) { I.push({ t: "button", x: x + 3, y: 24, w: 16, h: 8, label: "", on: true, a: cols[i] });
      I.push({ t: "vslider", k: "inv:" + g + "." + i, x: x, y: 36, w: 22, h: 180, label: ft[i], a: "clear", fmt: function (v) { return String(Math.abs(v)); } }); x += 24; } x += 18; }
  I.push({ t: "section", x: 8, y: 10, w: 130, h: 214, label: "VIBRATO", title: "border", size: 9 });
  I.push({ t: "select", k: "vib", x: 30, y: 50, w: 86, h: 26, label: "V1-3 · C1-3" });
  I.push({ t: "switch", k: "vibU", x: 22, y: 100, w: 100, h: 24, label: "UPPER" });
  I.push({ t: "switch", k: "vibL", x: 22, y: 134, w: 100, h: 24, label: "LOWER" });
  // ONE drawbar set per manual (2026-11-27, the teacher's choice): the B-3's preset octave and its A♯ sets are left off; the panel
  // holds both manuals on their B set (layout `init`), so the drawbars shown are always the ones sounding.
  set("uB", "UPPER", 9, FT, COL); set("p", "PEDAL", 2, ["16′", "8′"], ["brown", "brown"]); set("lB", "LOWER", 9, FT, COL);
  var rx = x; I.push({ t: "section", x: rx, y: 10, w: 190, h: 214, label: "PERCUSSION", title: "border", size: 9 });
  I.push({ t: "switch", k: "perc", x: rx + 10, y: 30, w: 170, h: 22, label: "ON" });
  I.push({ t: "seg", k: "percVol", x: rx + 10, y: 66, w: 170, h: 22, opts: [["normal", "NORMAL"], ["soft", "SOFT"]] });
  I.push({ t: "seg", k: "percDec", x: rx + 10, y: 100, w: 170, h: 22, opts: [["slow", "SLOW"], ["fast", "FAST"]] });
  I.push({ t: "seg", k: "percH", x: rx + 10, y: 134, w: 170, h: 22, opts: [["2nd", "SECOND"], ["3rd", "THIRD"]] });
  I.push({ t: "label", x: rx + 95, y: 182, text: "upper manual, preset B only", size: 8, dim: true });
  I.push({ t: "label", x: rx + 95, y: 62, text: "VOLUME", size: 7, dim: true });
  x = rx + 200;
  I.push({ t: "section", x: x, y: 10, w: 190, h: 214, label: "LESLIE 122 · AMP", title: "border", size: 9 });
  I.push({ t: "seg", k: "leslie", x: x + 10, y: 30, w: 170, h: 24, opts: [["stop", "STOP"], ["slow", "CHORALE"], ["fast", "TREMOLO"]] });
  I.push({ t: "knob", k: "drive", x: x + 50, y: 100, r: 16, label: "DRIVE", cap: "#d8d2c4" });
  I.push({ t: "knob", k: "click", x: x + 140, y: 100, r: 16, label: "KEY CLICK", cap: "#d8d2c4" });
  I.push({ t: "hslider", k: "swell", x: x + 10, y: 160, w: 170, h: 30, label: "SWELL PEDAL", a: "amber" });
  var W = x + 200;
  I.push({ t: "label", x: 12, y: 246, text: "One drawbar set per manual; the B-3's preset keys and second (A♯) sets are left off. Split one MIDI keyboard into pedal / lower / upper under the panel.", anchor: "start", size: 8.5, dim: true });
  FaithfulPanel.register({ id: "organ-b3", name: "Hammond B-3 + Leslie 122", w: W, h: 256, knob: "cap", init: { "pre:upre": "B", "pre:lpre": "B" },
    accents: { brown: "#7a4a24", white: "#f2efe6", black: "#161616", clear: "rgba(0,0,0,0)", amber: "#e0a030" }, accent: "amber",
    colors: { light: { body: "#efe7da" }, dark: { body: "#241d17" } },
    src: ["Wikipedia, 'Hammond organ' (preset keys, drawbar sets)", "Hammond XK-5 manual on B-3 percussion"],
    approx: "Arrangement after descriptions of the B-3; positions and the switch blocks are this page's own (no measured drawing). Drawbars: lower handle = pulled out = louder. Leslie switch lives on a half-moon or pedal in real rigs.",
    // computer-key control (panel-keys.js)
    keys: { groups: [
      { k: "u", name: "Upper drawbars", ctl: dbs("uB") },
      { k: "l", name: "Lower drawbars", ctl: dbs("lB") },
      { k: "b", name: "Bass pedal drawbars", ctl: ["inv:p.0", "inv:p.1"] },
      { k: "p", name: "Percussion", ctl: ["perc", "percVol", "percDec", "percH"] },
      { k: "v", name: "Vibrato / chorus", ctl: ["vib", "vibU", "vibL"] },
      { k: "s", name: "Speaker (Leslie, amp, swell)", ctl: ["leslie", "drive", "click", "swell"] } ],
      hold: [{ code: "Space", key: "leslie", on: "fast", off: "slow", name: "held = Leslie fast, let go = back · Shift + Space = latch chorale / tremolo" }] },
    items: I });
  function dbs(st) { var a = []; for (var i = 0; i < 9; i++) a.push("inv:" + st + "." + i); return a; }
})();
