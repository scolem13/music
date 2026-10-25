// sax-chart.js — saxophone fingering diagrams and the fingering / trill tables, for lessons/saxophone.qmd and
// practice/sax-patterns-by-ear.qmd.
//
//   SaxChart.KEYS                     [{ id, name, hand, d (SVG path) | line }]  the key drawing, from saxophone.svg (the
//                                     template the printed chart uses: same shapes, same coordinates, viewBox 358 x 764)
//   SaxChart.FINGERINGS[writtenMidi]  [[key ids], …]  first = the usual fingering, the rest alternates (B♭3 58 .. F6 89)
//   SaxChart.ALTISSIMO               [{ m, keys, label, src }]  front-F and altissimo fingerings for alto (E6-G♯6)
//   SaxChart.TRILLS                   [{ from, to, hold: [ids], trill: [ids], unsure }]  trill = the gray key(s) to move
//   SaxChart.diagram(el, o)           -> { set(keys, trillKeys), get(), el }   o { onToggle(keysNow), small, label }
//   SaxChart.lookup(keys)             -> [writtenMidi, …] the notes whose fingering (any listed one) is exactly these keys
//   SaxChart.INSTRUMENTS              { alto: -9, tenor: -14, bari: -21 }  written -> concert, in semitones
//   SaxChart.name(m, flat)            "F♯5"; SaxChart.tone(ac, out, midi, when, dur, vel)  a simple synthesized reed tone
//
// SOURCE: the chart pages 158-159 of the teacher book in scripts/sources/saxophone.py, read from a scan, key by key.
// UNVERIFIED (not printed with names on the chart, so read from how saxophones are usually built):
//   - which of the three palm-key ovals is D, E♭ and F;  which middle key of the left pinky table is B and which C♯;
//   - the ellipse under the side F♯ key is drawn but no fingering on the chart uses it (labelled high F♯, on models with it).
//   - trills marked unsure: the gray key could not be read with certainty in the scan.
(function (global) {
  "use strict";
  var K = [
    { id: "oct", name: "Octave key", hand: "L thumb", d: "M36.98,66.42c-2.22-.02-4.39,2.34-13.06,25.78,0,0-12.02,32.51-16.81,67.11-.06,.4-.04,.8-.04,.8,0,.19,.05,.28,.05,2.13,.07,16.33,13.57,29.52,30.14,29.44,16.57-.07,29.950-13.38,29.88-29.71,0-.94,.05-1.03,.07-1.28,.05-.66-.04-1.68-.08-1.9-5.85-34.42-17.47-66.24-17.47-66.24-7.99-21.87-9.72-26.11-12.68-26.14Z" },
    { id: "ff", name: "Front F key", hand: "L 1st finger", d: circ(157.93, 54.28, 36.79) },
    { id: "b1", name: "B key (1)", hand: "L 1st finger", d: circ(157.93, 144.69, 36.79) },
    { id: "bis", name: "Bis key (B♭)", hand: "L 1st finger", d: circ(192.93, 193.41, 18.39) },
    { id: "a2", name: "A key (2)", hand: "L 2nd finger", d: circ(157.93, 247.16, 36.79) },
    { id: "g3", name: "G key (3)", hand: "L 3rd finger", d: circ(157.93, 342.27, 36.79) },
    { id: "f4", name: "F key (4)", hand: "R 1st finger", d: circ(157.93, 437.38, 36.79) },
    { id: "e5", name: "E key (5)", hand: "R 2nd finger", d: circ(157.93, 532.49, 36.79) },
    { id: "d6", name: "D key (6)", hand: "R 3rd finger", d: circ(157.93, 627.61, 36.79) },
    { id: "pD", name: "Palm D key", hand: "L palm", d: ell(278.38, 50.61, 24.81, 50.1) },
    { id: "pEb", name: "Palm E♭ key", hand: "L palm", d: ell(243.98, 131.21, 24.81, 50.1) },
    { id: "pF", name: "Palm F key", hand: "L palm", d: ell(323.76, 107.25, 24.81, 50.1) },
    { id: "sE", name: "Side high E key", hand: "R side", d: "M53.65,417.52c0,12.18-8.15,22.06-18.2,22.06h-5.06c-10.05,0-18.2-9.88-18.2-22.06v-48.3c0-12.18,8.15-22.06,18.2-22.060h5.06c10.05,0,18.2,9.88,18.2,22.06v48.3Z" },
    { id: "sC", name: "Side C key", hand: "R side", d: "M30.4,439.58h5.06c10.04,0,18.2,8.15,18.2,18.2v14.75c0,10.04-8.16,18.2-18.2,18.2h-5.05c-10.04,0-18.2-8.16-18.2-18.2v-14.75c0-10.04,8.15-18.2,18.2-18.2Z" },
    { id: "sBb", name: "Side B♭ key", hand: "R side", d: "M53.65,552c0,10.27-8.15,18.6-18.2,18.6h-5.06c-10.05,0-18.2-8.33-18.2-18.6v-40.74c0-10.27,8.150-18.6,18.2-18.6h5.06c10.05,0,18.2,8.33,18.2,18.6v40.74Z" },
    { id: "sFs", name: "Alternate F♯ key", hand: "R side", d: "M113.75,500.57c0,9.56-7.09,17.32-15.83,17.32h-4.4c-8.74,0-15.83-7.76-15.830-17.32v-37.92c0-9.56,7.09-17.32,15.83-17.32h4.4c8.74,0,15.83,7.76,15.83,17.32v37.92Z" },
    { id: "hFs", name: "High F♯ key (some models)", hand: "R side", d: ell(97.69, 577.58, 37, 16, 9) },
    { id: "gs", name: "G♯ key", hand: "L pinky", d: "M348.51,344.28c.88,9.15-7.7,17.45-19.14,18.55l-72.37,6.9c-11.45,1.09-21.43-5.44-22.3-14.6l-1.33-13.94c-.87-9.15,7.7-17.46,19.14-18.55l72.37-6.9c11.45-1.09,21.43,5.44,22.3,14.6l1.32,13.94Z" },
    { id: "bL", name: "Low B key", hand: "L pinky", d: "M295.8,393.64c.87,9.15-7.7,17.45-19.14,18.54l-15.47,1.48c-11.44,1.09-21.43-5.44-22.3-14.6l-1.03-10.79c-.87-9.15,7.7-17.45,19.15-18.55l15.46-1.48c11.44-1.09,21.43,5.44,22.3,14.6l1.03,10.8Z" },
    { id: "cs", name: "Low C♯ key", hand: "L pinky", d: "M352.71,388.21c.87,9.16-7.7,17.46-19.14,18.55l-15.46,1.47c-11.45,1.09-21.43-5.44-22.3-14.59l-1.03-10.8c-.87-9.15,7.7-17.46,19.14-18.55l15.47-1.47c11.44-1.09,21.43,5.44,22.3,14.6l1.03,10.79Z" },
    { id: "bbL", name: "Low B♭ key", hand: "L pinky", d: "M357.2,435.29c.87,9.15-7.7,17.46-19.14,18.55l-72.37,6.9c-11.44,1.09-21.43-5.44-22.3-14.59l-1.33-13.94c-.87-9.15,7.7-17.46,19.14-18.55l72.37-6.9c11.44-1.09,21.43,5.44,22.3,14.6l1.33,13.94Z" },
    { id: "eb", name: "Low E♭ key", hand: "R pinky", d: "M67.22,720.98a42.69,42.69 0 0 1 85.37,0Z" },
    { id: "c", name: "Low C key", hand: "R pinky", d: "M67.22,720.98a42.69,42.69 0 0 0 85.37,0Z" }
  ];
  function circ(cx, cy, r) { return "M" + (cx - r) + "," + cy + "a" + r + "," + r + " 0 1 0 " + 2 * r + ",0a" + r + "," + r + " 0 1 0 " + -2 * r + ",0Z"; }
  function ell(cx, cy, rx, ry, rot) { rot = rot || 0; var a = rot * Math.PI / 180, dx = rx * Math.cos(a), dy = rx * Math.sin(a);
    return "M" + (cx - dx) + "," + (cy - dy) + "A" + rx + "," + ry + " " + rot + " 1 0 " + (cx + dx) + "," + (cy + dy) + "A" + rx + "," + ry + " " + rot + " 1 0 " + (cx - dx) + "," + (cy - dy) + "Z"; }
  // decoration from the template: the thumb-rest lines beside the octave key, the line between the hands, the palm-key outline
  var DECO = '<line x1="75.02" y1="197.93" x2="74.44" y2="66.26"/><line x1="1.08" y1="197.93" x2=".5" y2="66.26"/>' +
    '<line x1="121.15" y1="388.24" x2="196.03" y2="388.24"/><line x1="67.22" y1="720.98" x2="152.59" y2="720.98"/>';

  // ---------- the fingering chart (written pitch; the same for alto, tenor and baritone) ----------
  var L6 = ["b1", "a2", "g3", "f4", "e5", "d6"];
  function k() { var o = []; for (var i = 0; i < arguments.length; i++) o = o.concat(arguments[i]); return o; }
  var low = {
    58: [k(L6, "bbL", "c")], 59: [k(L6, "bL", "c")], 60: [k(L6, "c")], 61: [k(L6, "cs", "c")], 62: [L6.slice()], 63: [k(L6, "eb")],
    64: [["b1", "a2", "g3", "f4", "e5"]], 65: [["b1", "a2", "g3", "f4"]],
    66: [["b1", "a2", "g3", "e5"], ["b1", "a2", "g3", "f4", "sFs"]],
    67: [["b1", "a2", "g3"]], 68: [["b1", "a2", "g3", "gs"]], 69: [["b1", "a2"]],
    70: [["b1", "a2", "sBb"], ["b1", "f4"], ["b1", "bis"], ["b1", "e5"]],
    71: [["b1"]], 72: [["a2"], ["b1", "sC"]], 73: [[]]
  };
  var F = {};
  Object.keys(low).forEach(function (m) { F[m] = low[m]; });
  [62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73].forEach(function (m) {
    F[m + 12] = low[m].map(function (f) { return ["oct"].concat(f); });
  });
  F[86] = [["oct", "pD"]]; F[87] = [["oct", "pD", "pEb"]]; F[88] = [["oct", "pD", "pEb", "sE"]];
  F[89] = [["oct", "pD", "pEb", "pF", "sE"], ["oct", "ff", "a2"]];

  // ---------- the trill chart: hold these, move the gray key(s) ----------
  var O = ["oct"];
  function T(from, to, hold, trill, unsure) { return { from: from, to: to, hold: hold, trill: trill, unsure: !!unsure }; }
  var TRILLS = [
    T(61, 62, L6, ["cs", "c"]), T(63, 64, ["b1", "a2", "g3", "f4", "e5", "eb"], ["d6"]),
    T(63, 65, ["b1", "a2", "g3", "f4", "eb"], ["e5", "d6"]), T(65, 66, ["b1", "a2", "g3", "f4"], ["sFs"]),
    T(66, 68, ["b1", "a2", "g3", "gs"], ["e5"]), T(68, 69, ["b1", "a2", "gs"], ["g3"]),
    T(68, 70, ["b1", "a2", "g3", "gs"], ["sBb"]), T(69, 70, ["b1", "a2"], ["sBb"]),
    T(70, 71, ["b1"], ["f4"]), T(70, 72, ["a2", "sBb"], ["b1"]),
    T(71, 72, ["b1"], ["sC"]), T(72, 74, ["a2"], ["pD"]), T(73, 74, [], ["pD"]), T(73, 75, [], ["sE"], true),
    T(75, 76, k(O, "b1", "a2", "g3", "f4", "e5", "eb"), ["d6"]),
    T(75, 77, k(O, "b1", "a2", "g3", "f4", "eb"), ["e5", "d6"]), T(77, 78, k(O, "b1", "a2", "g3", "f4"), ["sFs"]),
    T(78, 80, k(O, "b1", "a2", "g3", "gs"), ["e5"]), T(80, 82, k(O, "b1", "a2", "g3", "gs"), ["sBb"]),
    T(82, 83, k(O, "b1", "sBb"), ["a2"]), T(82, 84, k(O, "a2", "sBb"), ["b1"]), T(83, 84, k(O, "b1"), ["sC"], true),
    T(84, 85, k(O, "sC"), ["b1"]), T(84, 86, k(O, "a2"), ["pD"]), T(85, 87, O.slice(), ["pD", "pEb"], true),
    T(86, 88, k(O, "pD"), ["pEb", "sE"], true), T(87, 89, k(O, "pD", "pEb"), ["pF"], true), T(88, 89, k(O, "pD", "pEb", "sE"), ["pF"])
  ];

  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  var SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  function name(m, how) { var pc = ((m % 12) + 12) % 12, t = how === "flat" ? FLATS : how === "sharp" ? SHARPS : NAMES; return t[pc] + (Math.floor(m / 12) - 1); }
  function both(m) { var a = name(m, "sharp"), b = name(m, "flat"); return a === b ? a : a.replace(/\d+$/, "") + "/" + b; }

  function sameSet(a, b) { if (a.length !== b.length) return false; var s = {}; a.forEach(function (x) { s[x] = 1; }); return b.every(function (x) { return s[x]; }); }
  function lookup(keys) { var out = []; Object.keys(F).forEach(function (m) { if (F[m].some(function (f) { return sameSet(f, keys); })) out.push(+m); }); return out; }

  // ---------- drawing ----------
  var NS = "http://www.w3.org/2000/svg";
  function diagram(el, o) {
    o = o || {};
    var svg = '<svg class="sxc' + (o.onToggle ? " sxc-live" : "") + (o.small ? " sxc-small" : "") + '" viewBox="-4 -4 366 772" role="img" aria-label="' + (o.label || "Saxophone fingering") + '" xmlns="' + NS + '">' +
      '<g class="sxc-deco">' + DECO + '</g>';
    K.forEach(function (q) { svg += '<path class="sxc-k" data-k="' + q.id + '" d="' + q.d + '"><title>' + q.name + " — " + q.hand + "</title></path>"; });
    el.innerHTML = svg + "</svg>";
    var on = {}, tr = {};
    function paint() { el.querySelectorAll(".sxc-k").forEach(function (p) { var id = p.getAttribute("data-k"); p.classList.toggle("sxc-down", !!on[id]); p.classList.toggle("sxc-trill", !!tr[id]); }); }
    if (o.onToggle) el.querySelector("svg").addEventListener("click", function (e) {
      var p = e.target.closest(".sxc-k"); if (!p) return; var id = p.getAttribute("data-k");
      if (on[id]) delete on[id]; else on[id] = 1; paint(); o.onToggle(Object.keys(on));
    });
    return {
      el: el,
      set: function (keys, trill) { on = {}; tr = {}; (keys || []).forEach(function (x) { on[x] = 1; }); (trill || []).forEach(function (x) { tr[x] = 1; }); paint(); },
      get: function () { return Object.keys(on); }
    };
  }

  // a plain reed-like tone (no saxophone samples on the site): a sawtooth through a low-pass, a soft attack, slight vibrato
  function tone(ac, out, midi, when, dur, vel) {
    var hz = 440 * Math.pow(2, (midi - 69) / 12), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.22;
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = hz; o2.frequency.value = hz; o2.detune.value = 4;
    lfo.frequency.value = 5; lg.gain.value = hz * 0.004; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    var mix = ac.createGain(); mix.gain.value = 0.5; o1.connect(f); o2.connect(mix); mix.connect(f);
    f.type = "lowpass"; f.frequency.value = Math.min(9000, hz * 5); f.Q.value = 1.2; f.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.04); g.gain.setValueAtTime(v, t + Math.max(0.05, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur);
    [o1, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  // ---------- front-F and altissimo fingerings (alto / soprano), not on the book's chart ----------
  // Read from the Dansr chart "Soprano and Alto Saxophone Front Fingerings" (Thorpe, 2024) and Crunch G from Thorpe's
  // Part Three article (2023), key by key from their diagrams; each one also checked against the Woodwind Fingering Guide
  // lists (WFG: "T f-2-| Bb ---" etc.). Crunch G's text says "octave key, 1, 4, C5, and Ta": the diagram shows the
  // octave key, B (1), F (4), the side B♭ key and the alternate F♯ key. Which printed name is which key is NOT verified.
  var ALTISSIMO = [
    { m: 88, keys: ["oct", "ff", "a2", "g3"], label: "Front-F E", src: "dansr" },
    { m: 89, keys: ["oct", "ff", "a2"], label: "Front-F F", src: "dansr" },
    { m: 90, keys: ["oct", "ff", "a2", "sBb"], label: "F♯", src: "dansr" },
    { m: 91, keys: ["oct", "ff", "f4", "sBb"], label: "G", src: "dansr" },
    { m: 91, keys: ["oct", "b1", "f4", "sBb", "sFs"], label: "Crunch G", src: "crunch" },
    { m: 92, keys: ["oct", "ff", "sBb"], label: "G♯", src: "dansr" }
  ];

  var api = { KEYS: K, FINGERINGS: F, TRILLS: TRILLS, ALTISSIMO: ALTISSIMO, INSTRUMENTS: { alto: -9, tenor: -14, bari: -21 }, LOW: 58, HIGH: 89,
    diagram: diagram, lookup: lookup, name: name, both: both, tone: tone, sameSet: sameSet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.SaxChart = api;
})(typeof window !== "undefined" ? window : globalThis);
