// flute-chart.js — flute fingering diagrams and the fingering / trill tables, for lessons/flute.qmd and
// practice/flute-patterns-by-ear.qmd. The flute is NON-transposing: written pitch = concert pitch (INSTRUMENTS.flute = 0).
//
//   FluteChart.KEYS                    [{ id, name, hand, d (SVG path), tr (transform) }]  the key drawing
//   FluteChart.FINGERINGS[midi]        [[key ids], …]  first = the usual fingering, the rest alternates (C4 60 .. C7 96)
//   FluteChart.TRILLS                  [{ from, to, hold: [ids], trill: [ids], unsure }]   trill = the gray key(s) to move
//   FluteChart.diagram(el, o)          -> { set(keys, trillKeys), get(), el }   o { onToggle(keysNow), small, label }
//   FluteChart.lookup(keys)            -> [midi, …] every note (usually two octaves) whose fingering is exactly these keys
//   FluteChart.INSTRUMENTS             { flute: 0 }   written -> concert, in semitones
//   FluteChart.name(m, how), both(m), tone(ac, out, midi, when, dur, vel)  a simple synthesized flute tone
//
// SOURCE: the book's Flute Fingering Chart (p. 78) and Flute Trill Fingering Chart (p. 79) in scripts/sources/flute.py, read from
// the scan cell by cell at 300-600 dpi. The key SHAPES for the left hand, right hand, thumb B and B-flat keys, G-sharp lever and
// the D-sharp key are the user's template "Instrument SVGs/flute.svg" (same paths and coordinates, drawn y-up there, flipped
// here). The template has no foot-joint C / C-sharp keys, no trill keys and no B-flat side key: those three shapes are drawn
// fresh in this file to match the chart's little symbols.
// How the chart is read here (filled = shown filled on the chart, open = outlined; ink = key id present in the set):
//   l1 l2 l3  left index, middle, ring;   gs left-pinky G# lever (the half-moon on the third circle);  tBb, tB  left thumb B-flat / B
//   r1 r2 r3  right index, middle, ring;  ds D# key (right pinky teardrop; on the chart it is filled in most notes, outlined only in
//             C4-D4, D5, B6; the chart's convention is kept);  fc, fcs  the two foot-joint symbols (top = C, bottom = C#: C4 shows
//             both filled, C#4 only the bottom one);  t1, t2  the two small trill keys (t1 between the right index and middle fingers,
//             t2 between middle and ring, read from the trill chart's key diagram);  bs  the little B-flat side lever shown under
//             the right index finger in the third B-flat fingering.
// UNVERIFIED:
//   - the names fc / fcs / t1 / t2 / bs (the chart prints no names; read from how the flute is usually built);
//   - which physical lever the ds symbol is when it shows filled or open (kept as drawn, not interpreted);
//   - G#, D#6, E♭6 and C7 show the G# half-moon over the third circle: read as third finger down AND the G# lever down;
//   - trills marked unsure: a gray symbol or the t1 / t2 position could not be read with certainty (B to C#, D# to E, G to A).
//   - the chart prints one fingering for both octaves of most notes (e.g. G4 / G5): the flute changes octave by air, not keys.
(function (global) {
  "use strict";
  // template paths (origin and translate as in flute.svg, y up)
  var K = [
    { id: "l1", name: "Left index finger", hand: "Left hand", tr: "translate(103.92 336.22)", d: "m0 0c0-21.719-17.608-39.329-39.33-39.329-21.718 0-39.326 17.61-39.326 39.329 0 21.72 17.608 39.328 39.326 39.328 21.722 0 39.33-17.608 39.33-39.328z" },
    { id: "l2", name: "Left middle finger", hand: "Left hand", tr: "translate(227.31 336.22)", d: "m0 0c0-21.719-17.608-39.328-39.328-39.328-21.721 0-39.33 17.609-39.33 39.328 0 21.721 17.609 39.33 39.33 39.33 21.72 0 39.328-17.609 39.328-39.33z" },
    { id: "l3", name: "Left ring finger", hand: "Left hand", tr: "translate(350.7 336.22)", d: "m0 0c0-21.718-17.608-39.328-39.328-39.328-21.721 0-39.328 17.61-39.328 39.328 0 21.721 17.607 39.33 39.328 39.33 21.72 0 39.328-17.609 39.328-39.33z" },
    { id: "r1", name: "Right index finger", hand: "Right hand", tr: "translate(474.08 336.22)", d: "m0 0c0-21.72-17.609-39.331-39.331-39.331-21.718 0-39.325 17.611-39.325 39.331 0 21.719 17.607 39.328 39.325 39.328 21.722 0 39.331-17.609 39.331-39.328z" },
    { id: "r2", name: "Right middle finger", hand: "Right hand", tr: "translate(597.47 336.22)", d: "m0 0c0-21.719-17.609-39.329-39.329-39.329s-39.326 17.61-39.326 39.329c0 21.72 17.606 39.328 39.326 39.328s39.329-17.608 39.329-39.328z" },
    { id: "r3", name: "Right ring finger", hand: "Right hand", tr: "translate(720.86 336.22)", d: "m0 0c0-21.718-17.607-39.328-39.329-39.328-21.72 0-39.327 17.61-39.327 39.328 0 21.721 17.607 39.33 39.327 39.33 21.722 0 39.329-17.609 39.329-39.33z" },
    { id: "tBb", name: "B♭ thumb key", hand: "Left thumb", tr: "translate(96.215 240.74)", d: "m0 0c0-17.717-14.16-32.082-31.627-32.082-17.465 0-31.625 14.365-31.625 32.082 0 17.716 14.16 32.082 31.625 32.082 17.467 0 31.627-14.366 31.627-32.082z" },
    { id: "tB", name: "B thumb key (the long lever)", hand: "Left thumb", tr: "translate(234.97 240.45)", d: "m0 0c-27.599 0-71.366 30.501-99.166 32.369-1.586 0.109 0 0-3.138 0-17.466 0-31.625-14.366-31.625-32.082 0-17.717 14.159-32.082 31.625-32.082 1.926 0 0.496-0.195 3.394 0 27.8 1.871 71.311 31.795 98.91 31.795z" },
    { id: "gs", name: "G♯ lever", hand: "Left little finger", tr: "translate(359.42 420.8)", d: "m0 0c-19.149 13.418-62.462 22.04-65.685-3.745-3.313-27.449 62.638-16.479 63.38-43.004 0.288-10.293 0-50.797 0-50.797 0-7.385 5.546-13.37 12.388-13.37 6.843 0 12.388 5.985 12.388 13.37v67.179c-2.016 11.065-16.822 26.505-22.471 30.367z" },
    { id: "ds", name: "D♯ key", hand: "Right little finger", tr: "translate(776 333.85)", d: "m0 0v-75.002c0-7.829-14.209-10.904-23.642-10.904-17.395 0-31.49 14.298-31.49 31.949 0 17.648 14.095 31.947 31.49 31.947 1.814 0 5.281-1.699 5.281-0.504v22.514c1.445 2.069 7.112 2.41 9.57 2.366 2.272-0.023 7.481-0.437 8.791-2.366z" },
    // drawn fresh (not in the template), same y-up coordinates
    { id: "fc", name: "Foot-joint C key (top symbol)", hand: "Right little finger", tr: "", d: "M808 352h56a12 12 0 0 1 0 24h-56a12 12 0 0 1 0-24z" },
    { id: "fcs", name: "Foot-joint C♯ key (bottom symbol)", hand: "Right little finger", tr: "", d: "M797 342c0-34 76-34 76 0z" },
    { id: "t1", name: "Trill key 1 (between index and middle)", hand: "Right hand", tr: "", d: "M497 243C490 262 483 270 483 283C483 298 511 298 511 283C511 270 504 262 497 243Z" },
    { id: "t2", name: "Trill key 2 (between middle and ring)", hand: "Right hand", tr: "translate(123 0)", d: "M497 243C490 262 483 270 483 283C483 298 511 298 511 283C511 270 504 262 497 243Z" },
    { id: "bs", name: "B♭ side lever", hand: "Right index finger", tr: "", d: "M384 262h48a8 8 0 0 1 0 16h-48a8 8 0 0 1 0-16z" }
  ];
  var DECO = '<line x1="387.66" y1="374.45" x2="387.66" y2="298"/>';

  // ---------- the fingering chart, p. 78: "xxx|xx." = left hand 1-3 | right hand 1-3 (x down), then extra key ids ----------
  var F = {};
  function pat(p, extra) {
    var s = p.replace("|", ""), out = [];
    ["l1", "l2", "l3", "r1", "r2", "r3"].forEach(function (id, i) { if (s.charAt(i) === "x") out.push(id); });
    return out.concat(extra ? extra.split(" ").filter(Boolean) : []);
  }
  function put(m, list) { F[m] = list.map(function (a) { return pat(a[0], a[1]); }); }
  // first octave C4-B4
  put(60, [["xxx|xxx", "fc fcs tB"]]);
  put(61, [["xxx|xxx", "fcs tB"]]);
  put(62, [["xxx|xxx", "tB"]]);
  put(63, [["xxx|xxx", "ds tB"]]);
  put(64, [["xxx|xx.", "ds tB"]]);
  put(65, [["xxx|x..", "ds tB"]]);
  put(66, [["xxx|..x", "ds tB"]]);
  put(67, [["xxx|...", "ds tB"]]);
  put(68, [["xxx|...", "gs ds tB"]]);
  put(69, [["xx.|...", "ds tB"]]);
  put(70, [["x..|x..", "ds tB"], ["x..|...", "ds tBb"], ["x..|...", "bs ds tB"]]);
  put(71, [["x..|...", "ds tB"]]);
  // second octave C5-B5: C5..F5 differ from the first octave, F#5..B5 are the same fingerings as F#4..B4
  put(72, [["x..|...", "ds"]]);
  put(73, [["...|...", "ds"]]);
  put(74, [[".xx|xxx", "tB"]]);
  put(75, [[".xx|xxx", "ds tB"]]);
  put(76, [["xxx|xx.", "ds tB"]]);
  put(77, [["xxx|x..", "ds tB"]]);
  for (var m = 66; m <= 71; m++) F[m + 12] = F[m].map(function (f) { return f.slice(); });
  // third octave C6-C7
  put(84, [["x..|...", "ds"]]);
  put(85, [["...|...", "ds"]]);
  put(86, [[".xx|...", "ds tB"]]);
  put(87, [["xxx|xxx", "gs ds tB"]]);
  put(88, [["xx.|xx.", "ds tB"]]);
  put(89, [["x.x|x..", "ds tB"]]);
  put(90, [["x.x|..x", "ds tB"]]);
  put(91, [["xxx|...", "ds"]]);
  put(92, [[".xx|...", "gs ds"]]);
  put(93, [[".x.|x..", "ds tB"]]);
  put(94, [["...|x..", "t1 ds tB"]]);
  put(95, [["x.x|...", "t2 tB"]]);
  put(96, [["xxx|x..", "gs ds"]]);
  var LOW = 60, HIGH = 96;

  // ---------- the trill chart, p. 79: hold these keys, move the gray ones ----------
  function T(from, to, hold, trill, unsure) { return { from: from, to: to, hold: hold.split(" ").filter(Boolean), trill: trill.split(" ").filter(Boolean), unsure: !!unsure }; }
  var TRILLS = [];
  [0, 12].forEach(function (o) {   // E4 and E5: the same fingerings (rows 1 and 3 of the chart)
    TRILLS.push(T(64 + o, 66 + o, "l1 l2 l3 r2 ds tB", "r1"), T(65 + o, 66 + o, "l1 l2 l3 r3 ds tB", "r1"), T(66 + o, 68 + o, "l1 l2 l3 r3 ds tB", "gs"),
      T(68 + o, 70 + o, "l1 l3 gs tBb ds", "l2"), T(69 + o, 70 + o, "l1 r1 ds tB", "l2"), T(70 + o, 71 + o, "l1 ds tB", "r1"));
  });
  TRILLS.push(   // B♭4 / B♭5: row 2 and row 4 differ
    T(70, 72, "l1 r1 ds", "tB"), T(71, 73, "ds", "l1 tB", true), T(72, 73, "ds", "l1"), T(72, 74, "l1 ds", "t1"), T(73, 74, "ds", "t1"), T(73, 75, "ds", "t2"),
    T(82, 84, "l1 r1 ds", "tB"), T(83, 85, "l1 ds tB", "t1"), T(84, 85, "ds", "l1"), T(84, 86, "l1", "t1"), T(85, 86, "", "t1"), T(85, 87, "ds", "t1 t2"),
    T(86, 87, "l2 l3 tB", "gs"), T(86, 88, "l2 tB", "l3"), T(87, 88, "l1 l2 r1 r2 r3 ds tB", "l3 gs", true), T(87, 89, "l1 l3 gs r1 r2 r3 ds tB", "l2"),
    T(88, 89, "l1 r1 r2 ds tB", "l2"), T(88, 90, "l1 l2 r1 r2 ds", "tB"),
    T(89, 90, "l1 l3 r3 ds tB", "r1"), T(89, 91, "l1 l3 r1 ds", "tB"), T(90, 91, "l1 l3 r3 ds", "tB"), T(90, 92, "l3 r3 ds", "l1 tB"),
    T(91, 92, "l1 l2 l3 ds", "t1"), T(91, 93, "l1 l2 l3 tB", "r1 t1", true), T(92, 93, "l2 l3 gs ds", "t1"));
  // the chart's row 2 / 4 C-to-D cells: C-sharp to D (row 4) shows no D# key filled, kept as read

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
    var svg = '<svg class="flc' + (o.onToggle ? " flc-live" : "") + (o.small ? " flc-small" : "") + '" viewBox="14 -430 880 236" role="img" aria-label="' + (o.label || "Flute fingering") + '" xmlns="' + NS + '">' +
      '<g transform="scale(1 -1)"><g class="flc-deco">' + DECO + "</g>";
    K.forEach(function (q) { svg += '<path class="flc-k" data-k="' + q.id + '"' + (q.tr ? ' transform="' + q.tr + '"' : "") + ' d="' + q.d + '"><title>' + q.name + " — " + q.hand + "</title></path>"; });
    el.innerHTML = svg + "</g></svg>";
    var on = {}, tr = {};
    function paint() { el.querySelectorAll(".flc-k").forEach(function (p) { var id = p.getAttribute("data-k"); p.classList.toggle("flc-down", !!on[id]); p.classList.toggle("flc-trill", !!tr[id]); }); }
    if (o.onToggle) el.querySelector("svg").addEventListener("click", function (e) {
      var p = e.target.closest(".flc-k"); if (!p) return; var id = p.getAttribute("data-k");
      if (on[id]) delete on[id]; else on[id] = 1; paint(); o.onToggle(Object.keys(on));
    });
    return {
      el: el,
      set: function (keys, trill) { on = {}; tr = {}; (keys || []).forEach(function (x) { on[x] = 1; }); (trill || []).forEach(function (x) { tr[x] = 1; }); paint(); },
      get: function () { return Object.keys(on); }
    };
  }

  // a plain flute-like tone (no flute samples checked on the site): a sine with a little third and fifth harmonic, soft breathy attack, slight vibrato
  function tone(ac, out, midi, when, dur, vel) {
    var hz = 440 * Math.pow(2, (midi - 69) / 12), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.3;
    var g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), oscs = [lfo];
    lfo.frequency.value = 5; lg.gain.value = hz * 0.003; lfo.connect(lg);
    [[1, 1], [2, 0.18], [3, 0.06]].forEach(function (h) {
      var o = ac.createOscillator(), hg = ac.createGain(); o.type = "sine"; o.frequency.value = hz * h[0]; hg.gain.value = h[1];
      lg.connect(o.frequency); o.connect(hg); hg.connect(g); oscs.push(o);
    });
    var nb = ac.createBufferSource(), n = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate), nd = n.getChannelData(0), ng = ac.createGain(), nf = ac.createBiquadFilter();
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    nb.buffer = n; nf.type = "bandpass"; nf.frequency.value = hz * 2; nf.Q.value = 2; nb.connect(nf); nf.connect(ng); ng.connect(g);
    ng.gain.setValueAtTime(0.25, t); ng.gain.linearRampToValueAtTime(0, t + 0.09); nb.start(t);
    g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v, t + Math.max(0.06, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur);
    oscs.forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  var api = { KEYS: K, FINGERINGS: F, TRILLS: TRILLS, INSTRUMENTS: { flute: 0 }, LOW: LOW, HIGH: HIGH, diagram: diagram, lookup: lookup, sameSet: sameSet, name: name, both: both, tone: tone };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.FluteChart = api;
})(typeof window !== "undefined" ? window : globalThis);
