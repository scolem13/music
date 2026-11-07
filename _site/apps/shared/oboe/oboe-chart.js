// oboe-chart.js — oboe fingering diagrams and the fingering / trill tables, for lessons/oboe.qmd.
//
//   OboeChart.KEYS                     [{ id, name, hand, d (SVG path) }]  the key drawing, DRAWN FOR THIS SITE (no source file exists):
//                                      the same layout as the book's key diagram (thumb teardrop, 6 finger holes with the half-hole
//                                      vent, the divider between the hands, side keys, the three left-pinky lobes, the lens key under hole 5,
//                                      the right-pinky cluster), as one clickable shape per key; viewBox 0 0 260 640
//   OboeChart.FINGERINGS[writtenMidi]  [[key ids], …]  first = the usual fingering, the rest alternates (B♭3 58 .. D♯6 87)
//   OboeChart.LABELS[midi]             ["usual label", "alternate label", …]  for the notes with alternates
//   OboeChart.TRILLS                   [{ from, to, hold: [ids], trill: [ids], unsure }]  trill = the gray key(s) to move
//   OboeChart.diagram(el, o)           -> { set(keys, trillKeys), get(), el }   o { onToggle(keysNow), small, label }
//   OboeChart.lookup(keys)             -> [writtenMidi, …] the notes whose fingering (any listed one) is exactly these keys
//   OboeChart.INSTRUMENTS              { oboe: 0 }  the oboe does not transpose: written = sounding
//   OboeChart.name(m, how), both(m), tone(ac, out, midi, when, dur, vel)  a synthesized double-reed tone (used only if the band's
//                                      "oboe" sample is not available, see oboe-page.js)
//
// SOURCE: the Oboe Fingering Chart (print p. 100) and Oboe Trill Fingering Chart (p. 101) of the teacher book in scripts/sources/oboe.py,
// read from the scan, note by note at 300-700 dpi. Both pages are for the ordinary (Conservatoire-style) oboe.
// HOW THE BOOK'S SYMBOLS BECAME KEYS (read from the printed chart; the BOOK NAMES NONE OF THE KEYS except "h.h."):
//   - teardrop in the bars on the left = thumb key; empty = not pressed, filled = pressed.
//   - hole 1 has a small circle under it: empty small circle = the finger covers the whole hole; the book's "h.h." (half hole)
//     draws the big hole empty and the small circle filled. Here: key h1 (down = covered) and key hh (down = h.h.).
//     A fingering with neither is the fully open hole.
//   - the little vertical rectangle beside hole 1 (A5 and up) = "top".
//   - the dash between hole 3 and hole 4 on every cell is the line between the hands.
//   - the curved dash at the left hand's third finger = gs (used for G♯4, G♯5 and the G♯ trills): its use proves what it is for.
//   - the three-lobed key between the hands = tl, tm, tr (left, middle, right lobe). Which lobe does what is read from which notes use it:
//     right lobe = low B♭, middle = low B, left = the E♭ alternate (D♯4 / D♯5).
//   - the lens-shaped key under hole 5 = lens (the F key: E4 + lens = F4; used for F4, F5 and the F-to-G trills).
//   - the two-lobed cluster at the bottom of the book's diagram (right pinky): upper lobe = c (low C), the small inner lobe = cs (C♯),
//     lower lobe = eb (E♭).
//   - the book's small "+" over F (right-hand fingering) and the small circle over the forked F (forked fingering) are labels, not keys.
// UNVERIFIED:
//   - the NAMES in KEYS (above), and which hand / finger plays gs, lens and the three lobes: not printed in the book.
//   - the register names in the page ("octave key", "side key") describe what the chart shows, not what a maker calls the keys.
//   - the oboe's actual tuning: pitches here are the written and sounding notes at A = 440, not measured.
//   - trills marked unsure: the trill key is one lobe of the three-lobed or two-lobed cluster, small shapes whose shading was hard to read.
(function (global) {
  "use strict";
  function circ(cx, cy, r) { return "M" + (cx - r) + "," + cy + "a" + r + "," + r + " 0 1 0 " + 2 * r + ",0a" + r + "," + r + " 0 1 0 " + -2 * r + ",0Z"; }
  function rrect(x, y, w, h, r) { return "M" + (x + r) + "," + y + "h" + (w - 2 * r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r + "v" + (h - 2 * r) + "a" + r + "," + r + " 0 0 1 " + -r + "," + r +
    "h" + -(w - 2 * r) + "a" + r + "," + r + " 0 0 1 " + -r + "," + -r + "v" + -(h - 2 * r) + "a" + r + "," + r + " 0 0 1 " + r + "," + -r + "Z"; }
  function ell(cx, cy, rx, ry, rot) { rot = rot || 0; var a = rot * Math.PI / 180, dx = rx * Math.cos(a), dy = rx * Math.sin(a);
    return "M" + (cx - dx) + "," + (cy - dy) + "A" + rx + "," + ry + " " + rot + " 1 0 " + (cx + dx) + "," + (cy + dy) + "A" + rx + "," + ry + " " + rot + " 1 0 " + (cx - dx) + "," + (cy - dy) + "Z"; }

  var K = [
    { id: "oct", name: "Thumb octave key", hand: "L thumb (back of the oboe)", d: "M44,88C32,112 28,138 44,148C60,138 56,112 44,88Z" },
    { id: "top", name: "Top side key", hand: "L 1st finger (side)", d: rrect(152, 98, 16, 36, 7) },
    { id: "h1", name: "Hole 1", hand: "L 1st finger", d: circ(120, 118, 22) },
    { id: "hh", name: "Half-hole vent (hole 1)", hand: "L 1st finger, rolled", d: circ(103, 142, 8) },
    { id: "h2", name: "Hole 2", hand: "L 2nd finger", d: circ(120, 186, 22) },
    { id: "h3", name: "Hole 3", hand: "L 3rd finger", d: circ(120, 250, 22) },
    { id: "gs", name: "G♯ key", hand: "L 3rd finger (side)", d: ell(158, 268, 22, 8, -22) },
    { id: "tl", name: "Left lobe (E♭ alternate)", hand: "L pinky", d: rrect(168, 296, 16, 42, 8) },
    { id: "tm", name: "Middle lobe (low B)", hand: "L pinky", d: rrect(190, 300, 16, 48, 8) },
    { id: "tr", name: "Right lobe (low B♭)", hand: "L pinky", d: rrect(212, 304, 16, 54, 8) },
    { id: "h4", name: "Hole 4", hand: "R 1st finger", d: circ(120, 322, 22) },
    { id: "h5", name: "Hole 5", hand: "R 2nd finger", d: circ(120, 386, 22) },
    { id: "lens", name: "F key (lens)", hand: "R side", d: ell(158, 434, 22, 8, 0) },
    { id: "h6", name: "Hole 6", hand: "R 3rd finger", d: circ(120, 482, 22) },
    { id: "c", name: "Low C key", hand: "R pinky", d: rrect(30, 520, 96, 24, 12) },
    { id: "cs", name: "Low C♯ key", hand: "R pinky", d: rrect(46, 548, 80, 22, 11) },
    { id: "eb", name: "Low E♭ key", hand: "R pinky", d: rrect(30, 574, 96, 24, 12) }
  ];
  // decoration: the bars round the thumb key and the line between the hands (as in the book's chart), the body, the reed
  var DECO_BODY = "M92,52V548Q92,586 70,624H170Q148,586 148,548V52Z";
  var DECO = '<path class="obc-body" d="' + DECO_BODY + '"/><rect class="obc-body" x="112" y="6" width="16" height="46" rx="5"/>' +
    '<line x1="24" y1="84" x2="24" y2="156"/><line x1="64" y1="84" x2="64" y2="156"/><line x1="84" y1="288" x2="156" y2="288"/>';

  // ---------- the fingering chart (written pitch = sounding pitch) ----------
  function k() { var o = []; for (var i = 0; i < arguments.length; i++) o = o.concat(arguments[i]); return o; }
  var S6 = ["h1", "h2", "h3", "h4", "h5", "h6"], S5 = ["h1", "h2", "h3", "h4", "h5"], HH6 = ["hh", "h2", "h3", "h4", "h5", "h6"];
  var F = {
    58: [k(S6, "c", "tr")], 59: [k(S6, "c", "tm")], 60: [k(S6, "c")], 61: [k(S6, "cs")], 62: [S6.slice()],
    63: [k(S6, "eb"), k(S6, "tl")],
    64: [S5.slice()],
    65: [k(S5, "lens"), ["h1", "h2", "h3", "h4", "h6", "eb"]],
    66: [["h1", "h2", "h3", "h4"]], 67: [["h1", "h2", "h3"]], 68: [["h1", "h2", "h3", "gs"]], 69: [["h1", "h2"]],
    70: [["h1", "h2", "h4"]], 71: [["h1"]], 72: [["h1", "h4"]],
    73: [k(HH6, "cs")], 74: [HH6.slice()], 75: [k(HH6, "eb"), k(HH6, "tl")]
  };
  F[76] = [k("oct", S5)];
  F[77] = [k("oct", S5, "lens"), ["oct", "h1", "h2", "h3", "h4", "h6", "eb"]];
  F[78] = [["oct", "h1", "h2", "h3", "h4"]]; F[79] = [["oct", "h1", "h2", "h3"]]; F[80] = [["oct", "h1", "h2", "h3", "gs"]];
  F[81] = [["top", "h1", "h2"]]; F[82] = [["top", "h1", "h2", "h4"]]; F[83] = [["top", "h1"]]; F[84] = [["top", "h1", "h4"]];
  F[85] = [["h2", "h3", "h4", "c"], ["top", "h4"]];
  F[86] = [["hh", "h2", "h3", "c"]]; F[87] = [["top", "hh", "h2", "h3", "h5", "h6"]];
  var LABELS = {
    63: ["Right pinky E♭ key", "Left pinky E♭ key"], 65: ["With the F key (the book's +)", "Forked F"],
    75: ["Right pinky E♭ key", "Left pinky E♭ key"], 77: ["With the F key (the book's +)", "Forked F"], 85: ["Usual", "With the top side key"]
  };

  // ---------- the trill chart (p. 101): hold the dark keys, move the gray ones ----------
  function T(from, to, hold, trill, unsure) { return { from: from, to: to, hold: hold, trill: trill, unsure: !!unsure }; }
  var TRILLS = [
    // first octave
    T(59, 61, S6, ["tm", "cs"], true), T(61, 63, k(S6, "tl"), ["cs"], true), T(63, 64, k(S5, "tl"), ["h6"]), T(63, 65, ["h1", "h2", "h3", "h4", "h6", "eb"], ["h5"]),
    T(65, 67, ["h1", "h2", "h3", "h5", "lens"], ["h4"]),
    T(66, 68, ["h1", "h2", "h3", "gs"], ["h4"]), T(67, 68, ["h1", "h2", "h3"], ["gs"]), T(68, 69, ["h1", "h2", "gs"], ["h3"]),
    T(68, 70, ["h1", "h3", "gs", "h6"], ["h2"]), T(70, 71, ["h1", "h3", "gs", "h4"], ["h2"]),
    // second octave, half-hole notes
    T(72, 73, ["h4"], ["h1"]), T(72, 74, ["h1", "h4"], ["lens"]),
    T(73, 75, k(HH6, "tl"), ["cs"], true), T(75, 76, k(["hh", "h2", "h3", "h4", "h5"], "tl"), ["h6"]), T(75, 77, ["hh", "h2", "h3", "h4", "h6", "eb"], ["h5"]),
    // octave key pressed
    T(77, 79, ["oct", "h1", "h2", "h3", "h5", "lens"], ["h4"]), T(78, 80, ["oct", "h1", "h2", "h3", "gs"], ["h4"]),
    T(79, 80, ["oct", "h1", "h2", "h3"], ["gs"]), T(80, 81, ["oct", "h1", "h2", "gs"], ["h3"]), T(80, 82, ["oct", "h1", "h3", "gs"], ["h2"]),
    // top side key
    T(82, 83, ["top", "h1", "h3", "h4"], ["h2"]), T(84, 85, ["top", "h4"], ["h1"]), T(84, 86, ["top", "h1", "h4"], ["lens"]), T(85, 86, ["h2", "h3", "c"], ["h4"])
  ];

  // the labels as printed above each cell of the chart
  ["B to C♯", "D♭ to E♭", "D♯ to E", "E♭ to F", "F to G", "F♯ to G♯", "G to A♭", "G♯ to A", "A♭ to B♭", "A♯ to B", "C to D♭", "C to D", "D♭ to E♭", "D♯ to E", "E♭ to F",
   "F to G", "F♯ to G♯", "G to A♭", "G♯ to A", "A♭ to B♭", "A♯ to B", "C to D♭", "C to D", "C♯ to D"].forEach(function (l, i) { TRILLS[i].label = l; });

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
    var svg = '<svg class="obc' + (o.onToggle ? " obc-live" : "") + (o.small ? " obc-small" : "") + '" viewBox="0 0 260 640" role="img" aria-label="' + (o.label || "Oboe fingering") + '" xmlns="' + NS + '">' +
      '<g class="obc-deco">' + DECO + '</g>';
    K.forEach(function (q) { svg += '<path class="obc-k" data-k="' + q.id + '" d="' + q.d + '"><title>' + q.name + " — " + q.hand + "</title></path>"; });
    el.innerHTML = svg + "</svg>";
    var on = {}, tr = {};
    function paint() { el.querySelectorAll(".obc-k").forEach(function (p) { var id = p.getAttribute("data-k"); p.classList.toggle("obc-down", !!on[id]); p.classList.toggle("obc-trill", !!tr[id]); }); }
    if (o.onToggle) el.querySelector("svg").addEventListener("click", function (e) {
      var p = e.target.closest(".obc-k"); if (!p) return; var id = p.getAttribute("data-k");
      if (on[id]) delete on[id]; else on[id] = 1; paint(); o.onToggle(Object.keys(on));
    });
    return {
      el: el,
      set: function (keys, trill) { on = {}; tr = {}; (keys || []).forEach(function (x) { on[x] = 1; }); (trill || []).forEach(function (x) { tr[x] = 1; }); paint(); },
      get: function () { return Object.keys(on); }
    };
  }

  // a plain double-reed tone for when the band's oboe samples are not there: a sawtooth through two narrow resonances (the
  // nasal "oboe" vowel, about 1.1 and 2.9 kHz) with a soft attack and a slight vibrato
  function tone(ac, out, midi, when, dur, vel) {
    var hz = 440 * Math.pow(2, (midi - 69) / 12), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.3;
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), b1 = ac.createBiquadFilter(), b2 = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o1.type = "sawtooth"; o2.type = "sawtooth"; o1.frequency.value = hz; o2.frequency.value = hz; o2.detune.value = 5;
    lfo.frequency.value = 5.2; lg.gain.value = hz * 0.004; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    b1.type = "bandpass"; b1.frequency.value = 1100; b1.Q.value = 2.5; b2.type = "bandpass"; b2.frequency.value = 2900; b2.Q.value = 3;
    var g1 = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter(); g1.gain.value = 1; g2.gain.value = 0.6;
    lp.type = "lowpass"; lp.frequency.value = Math.max(2500, hz * 8);
    o1.connect(lp); o2.connect(lp); lp.connect(b1); lp.connect(b2); b1.connect(g1); b2.connect(g2); g1.connect(g); g2.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v, t + Math.max(0.06, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur);
    [o1, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  var api = { KEYS: K, FINGERINGS: F, LABELS: LABELS, TRILLS: TRILLS, INSTRUMENTS: { oboe: 0 }, LOW: 58, HIGH: 87,
    diagram: diagram, lookup: lookup, name: name, both: both, tone: tone, sameSet: sameSet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.OboeChart = api;
})(typeof window !== "undefined" ? window : globalThis);
