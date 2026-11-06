// bassoon-chart.js — bassoon fingering diagrams and the fingering / trill tables, for lessons/bassoon.qmd.
//
//   BassoonChart.KEYS                    [{ id, name, hand, x, y, w, h, shape: "hole"|"key", label }]  the drawing's keys
//   BassoonChart.FINGERINGS[midi]        [[key ids], …]  first = the usual fingering, the rest alternates (B♭1 34 .. B♭4 70)
//                                        The bassoon does not transpose: written = sounding, bass clef.
//   BassoonChart.TRILLS                  [{ from, to, hold: [ids], trill: [ids], unsure }]  trill = the gray key(s) to move
//   BassoonChart.diagram(el, o)          -> { set(keys, trillKeys), get(), el }   o { onToggle(keysNow), small, label }
//   BassoonChart.lookup(keys)            -> [midi, …] the notes whose fingering (any listed one) is exactly these keys
//   BassoonChart.INSTRUMENTS             { bassoon: 0 }  written -> sounding, in semitones
//   BassoonChart.name(m, how), both(m), tone(ac, out, midi, when, dur, vel), sameSet
//
// SOURCE: pp. 116-117 of the teacher book in scripts/sources/bassoon.py (the "Bassoon Fingering Chart" and "Bassoon Trill
// Fingering Chart"), read from a scan at 300 dpi, cell by cell. The book's key names are used: six holes (h1-h3 left hand, h4-h6
// right hand), W = whisper key, D = D key, T1-T7 left-thumb keys, T8-T11 right-thumb keys, L1 L2 LX LXX = left-hand finger keys,
// R1-R4 = right-hand finger keys, "C♯ trill" (cst), and h1h = half hole on the first hole. In the printed chart the six
// dots are the holes; the letters beside them are the other keys that are down.
// THE DRAWING is this site's own (the book prints a photograph-style line drawing, not a template): a schematic of the keys,
// not to scale, with the thumb clusters shown separately (they are on the back of the instrument) and the finger keys placed
// next to the hand they belong to, in the order the book's drawing shows them. Where each key really sits is NOT verified.
// UNVERIFIED / inferred:
//   - which printed fingering is "usual" is the book's order (first shown); the "slightly more open / less open" half-hole notes on
//     F♯3 and G♯3 are not drawn (one half-hole key only);
//   - trills are copied as printed; a gray letter = a gray key to move. Some printed trill cells do not match the main chart
//     (they hold different keys), and three are marked unsure because the gray / black key was hard to read: B1-C♯2, D♯2-E2, E♭2-F2.
//   - the chart stops at B♭4; the instrument goes higher (not in the book's chart, not here).
(function (global) {
  "use strict";
  var K = [];
  function key(id, name, hand, shape, x, y, w, h, label) { K.push({ id: id, name: name, hand: hand, shape: shape, x: x, y: y, w: w, h: h, label: label || "" }); }
  // left thumb (back): two columns
  [["T4", 0], ["T5", 1], ["T6", 2], ["T7", 3]].forEach(function (a) { key(a[0], a[0] + " key", "L thumb", "key", 12, 30 + a[1] * 30, 44, 24, a[0]); });
  [["D", 0, "D key"], ["T1", 1], ["T2", 2], ["T3", 3], ["W", 4, "Whisper key"]].forEach(function (a) { key(a[0], a[2] || a[0] + " key", "L thumb", "key", 64, 30 + a[1] * 30, 44, 24, a[0]); });
  // right thumb (back)
  [8, 9, 10, 11].forEach(function (n, i) { key("T" + n, "T" + n + " key", "R thumb", "key", 38, 352 + i * 30, 44, 24, "T" + n); });
  // left hand: holes at cx 185, finger keys to the right
  key("LXX", "LXX key", "L hand", "key", 232, 34, 52, 22, "LXX");
  key("h1", "Hole 1", "L hand, 1st finger", "hole", 185, 78, 19, 19, "1");
  key("h1h", "Half hole (hole 1)", "L hand, 1st finger", "key", 128, 64, 30, 22, "½");
  key("LX", "LX key", "L hand", "key", 232, 98, 52, 22, "LX");
  key("h2", "Hole 2", "L hand, 2nd finger", "hole", 185, 136, 19, 19, "2");
  key("h3", "Hole 3", "L hand, 3rd finger", "hole", 185, 194, 19, 19, "3");
  key("L1", "L1 key", "L hand", "key", 232, 190, 52, 22, "L1");
  key("L2", "L2 key", "L hand", "key", 232, 220, 52, 22, "L2");
  // right hand
  key("cst", "C♯ trill key", "R hand", "key", 232, 338, 52, 22, "C♯ tr");
  key("h4", "Hole 4", "R hand, 1st finger", "hole", 185, 380, 19, 19, "4");
  key("h5", "Hole 5", "R hand, 2nd finger", "hole", 185, 438, 19, 19, "5");
  key("h6", "Hole 6", "R hand, 3rd finger", "hole", 185, 496, 19, 19, "6");
  [1, 2, 3, 4].forEach(function (n, i) { key("R" + n, "R" + n + " key", "R hand, little finger", "key", 232, 400 + i * 30, 52, 22, "R" + n); });

  // ---------- the fingering chart ----------
  function hl(n) { var o = []; for (var i = 1; i <= n; i++) o.push("h" + i); return o; }
  function k() { var o = []; for (var i = 0; i < arguments.length; i++) o = o.concat(arguments[i]); return o; }
  var H6 = hl(6), H5 = hl(5), H4 = hl(4), H3 = hl(3), HH = ["h1h", "h2", "h3", "h4", "h5", "h6"];
  var F = {
    34: [k(H6, ["T4", "T5", "T6", "T7", "T9", "R2"])], 35: [k(H6, ["T5", "T6", "T7", "T9", "R2"])], 36: [k(H6, ["T6", "T7", "T9", "R2"])],
    37: [k(H6, ["T6", "T7", "L2", "T9", "R2"])], 38: [k(H6, ["T7", "T9", "R2"])], 39: [k(H6, ["T7", "L1", "T9", "R2"])],
    40: [k(H6, ["T9", "R2"])], 41: [k(H6, ["W", "R2"])],
    42: [k(H6, ["W", "T10"]), k(H6, ["W", "R3"])], 43: [k(H6, ["W"])], 44: [k(H6, ["W", "R4"]), k(H6, ["W", "T11"])],
    45: [k(H5, ["W"])], 46: [k(H5, ["W", "T8"]), k(H5, ["W", "R1"])], 47: [k(H4, ["W"])], 48: [k(H3, ["W"])],
    49: [k(H3, ["T3", "T7", "W"])], 50: [["h1", "h2", "W"]], 51: [["h1", "h3", "W"], ["h1", "h3", "h4", "W", "T8"]], 52: [["h1", "W"]], 53: [["W"]],
    54: [k(HH, ["W", "T10", "T11"]), k(HH, ["W", "R3"])], 55: [k(HH, ["W", "L1"])], 56: [k(HH, ["W", "R4"]), k(HH, ["W", "T11"])],
    57: [H5.slice()], 58: [k(H5, ["T8"]), k(H5, ["R1"])], 59: [H4.slice()], 60: [H3.slice()],
    61: [k(H3, ["h5", "h6", "T3", "R2"]), k(H3, ["T3", "T7"])], 62: [["D", "h1", "h2"]],
    63: [["h1", "h2", "h4", "h5", "h6"], ["h1", "h2", "h5", "h6"]],
    64: [["h1", "h3", "h4", "h5", "h6", "L1"], ["h1", "h3", "h5", "h6", "L1"]], 65: [["h1", "h3", "h4", "h5", "L1"]],
    66: [["h2", "h3", "h4", "h5", "L1", "R2"], ["h2", "h3", "h4", "h5", "L1", "T8"]],
    67: [["h1h", "h2", "h3", "h4", "W", "L1", "R2"]], 68: [["h1h", "h2", "h3", "h6", "W"]],
    69: [["h1", "h2", "h3", "h6", "T2"]], 70: [k(H5, ["T2", "R2"])]
  };

  // ---------- the trill chart: hold these, move the gray key(s) ----------
  function T(from, to, hold, trill, unsure) { return { from: from, to: to, hold: hold, trill: trill, unsure: !!unsure }; }
  var TRILLS = [
    T(35, 37, k(H6, ["T5", "T9", "R2"]), ["L2"], true), T(39, 40, k(H6, ["L1", "T9", "R2"]), ["T7"], true),
    T(39, 41, k(H6, ["T7", "W", "L1", "R2"]), ["T9"], true), T(42, 44, k(H6, ["W", "T10"]), ["R4"]),
    T(44, 45, k(H5, ["W"]), ["h6", "R4"]), T(47, 49, ["h1", "h2", "h4", "T7", "W"], ["h3"]),
    T(48, 49, H3.slice(), ["T3"]), T(49, 50, ["h1", "h2", "h6", "W", "T8"], ["h3", "cst"]), T(49, 51, ["h2", "h3", "T3", "T7", "W"], ["h1"]),
    T(50, 51, ["h1", "h2"], ["T3"]), T(51, 53, ["W", "R2"], ["h1", "h3"]), T(52, 54, ["h1", "W"], ["LX"]),
    T(53, 54, ["W"], ["LX", "R2"]), T(53, 55, [], ["T2"]), T(53, 55, [], ["W", "LXX"]),
    T(54, 56, k(HH, ["W", "T10"]), ["T11"]), T(55, 57, k(["h1h", "h2", "h3", "h4", "h5"], ["W", "L1"]), ["h6"]),
    T(56, 57, ["h1h", "h2", "h4", "h5", "h6", "W", "T11"], ["h3"]),
    T(56, 58, k(["T1"], H4), ["h5"]), T(58, 59, k(["T1"], H4), ["T8", "h5"]),
    T(58, 60, ["h1", "h2", "h4", "h5", "T8"], ["h3"]), T(58, 60, H3.slice(), ["T8", "h4", "h5"]), T(59, 61, ["h1", "h2", "h4"], ["h3"]),
    T(60, 61, H3.slice(), ["T3"]), T(60, 61, H3.slice(), ["cst"]),
    T(61, 62, ["h1", "h2", "h5", "h6", "R2"], ["h3", "T9"]), T(62, 63, ["h1", "h2"], ["h6"]), T(62, 64, ["h1", "L1"], ["h2"]),
    T(63, 64, ["h2", "h4", "h5", "h6"], ["h1", "L1"]), T(63, 64, ["h1", "h4", "h5", "h6"], ["h2", "L1"]),
    T(63, 65, ["h1", "h2", "h5", "L1"], ["h6"]), T(64, 66, ["h1", "h3", "h4", "L1"], ["h5", "h6"]),
    T(65, 66, ["h1", "h3", "h4", "L1"], ["h5"]), T(65, 67, ["h1", "h3", "h4", "h5", "L1"], ["T2"]),
    T(66, 67, ["h1h", "h2", "h3", "h4", "W", "L1", "R2"], ["h5"])
  ];

  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  var SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  function name(m, how) { var pc = ((m % 12) + 12) % 12, t = how === "flat" ? FLATS : how === "sharp" ? SHARPS : NAMES; return t[pc] + (Math.floor(m / 12) - 1); }
  function both(m) { var a = name(m, "sharp"), b = name(m, "flat"); return a === b ? a : a.replace(/\d+$/, "") + "/" + b; }
  function sameSet(a, b) { if (a.length !== b.length) return false; var s = {}; a.forEach(function (x) { s[x] = 1; }); return b.every(function (x) { return s[x]; }); }
  function lookup(keys) { var out = []; Object.keys(F).forEach(function (m) { if (F[m].some(function (f) { return sameSet(f, keys); })) out.push(+m); }); return out; }

  // ---------- drawing ----------
  var NS = "http://www.w3.org/2000/svg", uid = 0;
  var CAPS = [[12, 20, "Left thumb (back)"], [12, 342, "Right thumb (back)"], [140, 20, "Left hand"], [140, 328, "Right hand"]];
  function diagram(el, o) {
    o = o || {}; var id = "bnh" + (++uid);
    var svg = '<svg class="bnc' + (o.onToggle ? " bnc-live" : "") + (o.small ? " bnc-small" : "") + '" viewBox="0 0 300 540" role="img" aria-label="' + (o.label || "Bassoon fingering") + '" xmlns="' + NS + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="50%" stop-color="var(--bn-ink,#231f20)"/><stop offset="50%" stop-color="var(--bn-open,#fff)"/></linearGradient></defs>' +
      '<g class="bnc-deco"><rect x="156" y="14" width="58" height="500" rx="14"/><line x1="125" y1="276" x2="290" y2="276"/>' +
      '<rect x="6" y="14" width="108" height="236" rx="8" class="bnc-dash"/><rect x="6" y="336" width="108" height="150" rx="8" class="bnc-dash"/>';
    if (!o.small) CAPS.forEach(function (c) { svg += '<text x="' + c[0] + '" y="' + c[1] + '" class="bnc-cap">' + c[2] + "</text>"; });
    svg += "</g>";
    K.forEach(function (q) {
      var t = "<title>" + q.name + " — " + q.hand + "</title>", lab = "";
      if (q.shape === "hole") { svg += '<g class="bnc-k" data-k="' + q.id + '"><circle cx="' + q.x + '" cy="' + q.y + '" r="' + q.w + '"/>' + t + "</g>"; return; }
      svg += '<g class="bnc-k" data-k="' + q.id + '"><rect x="' + q.x + '" y="' + q.y + '" width="' + q.w + '" height="' + q.h + '" rx="' + (q.h / 2) + '"/>' +
        '<text x="' + (q.x + q.w / 2) + '" y="' + (q.y + q.h / 2 + 4.5) + '" text-anchor="middle">' + q.label + "</text>" + t + "</g>";
    });
    el.innerHTML = svg + "</svg>";
    var on = {}, tr = {};
    function paint() {
      el.querySelectorAll(".bnc-k").forEach(function (p) {
        var k2 = p.getAttribute("data-k");
        p.classList.toggle("bnc-down", !!on[k2]); p.classList.toggle("bnc-trill", !!tr[k2]);
        if (k2 === "h1") { var c = p.querySelector("circle"); c.style.fill = (on.h1h && !on.h1 && !tr.h1) ? "url(#" + id + ")" : ""; }
      });
    }
    if (o.onToggle) el.querySelector("svg").addEventListener("click", function (e) {
      var p = e.target.closest(".bnc-k"); if (!p) return; var k2 = p.getAttribute("data-k");
      if (on[k2]) delete on[k2]; else on[k2] = 1; paint(); o.onToggle(Object.keys(on));
    });
    return {
      el: el,
      set: function (keys, trill) { on = {}; tr = {}; (keys || []).forEach(function (x) { on[x] = 1; }); (trill || []).forEach(function (x) { tr[x] = 1; }); paint(); },
      get: function () { return Object.keys(on); }
    };
  }

  // a plain reed-like tone (the band has bassoon samples, but this page makes its own sound so it needs no loading): a sawtooth
  // and a square through a low-pass that opens with the pitch, a soft attack, a slight vibrato
  function tone(ac, out, midi, when, dur, vel) {
    var hz = 440 * Math.pow(2, (midi - 69) / 12), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.3;
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = hz; o2.frequency.value = hz; o2.detune.value = 3;
    lfo.frequency.value = 4.6; lg.gain.value = hz * 0.003; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    var mix = ac.createGain(); mix.gain.value = 0.35; o1.connect(f); o2.connect(mix); mix.connect(f);
    f.type = "lowpass"; f.frequency.value = Math.min(3200, hz * 6 + 300); f.Q.value = 1.4; f.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v, t + Math.max(0.07, dur - 0.1)); g.gain.linearRampToValueAtTime(0, t + dur);
    [o1, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  var api = { KEYS: K, FINGERINGS: F, TRILLS: TRILLS, INSTRUMENTS: { bassoon: 0 }, LOW: 34, HIGH: 70,
    diagram: diagram, lookup: lookup, name: name, both: both, tone: tone, sameSet: sameSet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BassoonChart = api;
})(typeof window !== "undefined" ? window : globalThis);
