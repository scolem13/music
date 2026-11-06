// clarinet-chart.js — clarinet fingering diagrams and the fingering / trill tables, for lessons/clarinet.qmd and
// practice/clarinet-patterns-by-ear.qmd.
//
//   ClarChart.KEYS                     [{ id, name, hand, t:[x,y], d }]  the key drawing, from clarinet.svg (the template the printed
//                                      chart uses; the same shapes and coordinates, in the template's own flipped page units)
//   ClarChart.FINGERINGS[writtenMidi]  [[key ids], …]  first = the one the book shows first, the rest alternates (E3 52 .. F6 89).
//                                      "reg" = register key pressed, "th" = thumb hole closed.
//   ClarChart.TAGS[writtenMidi]        ["LR", "L", "R"] … the letter printed under each little-finger fingering on the chart
//   ClarChart.ALTO                     the second chart (E♭ alto, B♭ bass, contra-alto, contrabass): E♭3 added, and the highest notes
//                                      C♯6-F6 with the first hole half covered ("l1~"). Everything else is the same as FINGERINGS.
//   ClarChart.TRILLS                   [{ from, to, hold: [ids], trill: [ids], unsure }]  trill = the gray key(s) to move
//   ClarChart.diagram(el, o)           -> { set(keys, trillKeys), get(), el }   o { onToggle(keysNow), small, label, ext }
//                                      a key id with "~" on the end is drawn half covered ("l1~")
//   ClarChart.lookup(keys, chart)      -> [writtenMidi, …] the notes whose fingering (any listed one) is exactly these keys
//   ClarChart.INSTRUMENTS              { bb: {name, trans, chart, low}, … }  trans = written -> concert, in semitones
//   ClarChart.name(m, how), both(m), tone(ac, out, midi, when, dur, vel)  a synthesized clarinet-like tone (see tone())
//
// SOURCE: the Bb clarinet fingering chart (book p. 136), the trill chart (p. 137), and the alto / bass / contralto / contrabass
// chart (pp. 138-139) of the instrument guide in scripts/sources/clarinet.py, read from a scan, key by key. A column on the chart
// has: a box at the top left with the register key (the teardrop) over the thumb hole (the dot); six holes (left 3, line, right 3);
// to the right of the line a "tulip" of three petals; four small side circles; a leaf key; and 2 x 2 little-finger ovals. A
// teardrop or dot is dark when pressed.
// UNVERIFIED (not printed with names on the chart):
//   - what each of tulip petals / ovals / small circles / leaf / the two oval keys by hole 1 is called on a real clarinet. They are
//     named by where they are drawn. The letters under the little-finger fingerings (L, R, LR) are copied as printed; which pinky
//     each oval belongs to is not read from the chart. In particular LR for E3 shows the tulip's left petal AND bottom-right oval.
//   - the leaf key is drawn in slightly different places beside the holes on the chart (by hole 3, 4 or 5); it is one key here.
//   - C♯6 (reg, thumb, holes 2 3 4 5) is as drawn; it does not look like the usual C♯6 fingering and the trill chart's B-C♯ (p. 137)
//     does not agree with it. Trills flagged unsure were hard to read or do not agree with the main chart.
//   - the book says the other family members finger alike; the alto chart was compared with the B♭ chart only for E♭3 and C♯6-F6.
//   - the transpositions in INSTRUMENTS are not from the book (it gives none): general knowledge, see the sources file.
(function (global) {
  "use strict";
  var K = [
    { id: "reg", name: "Register key", hand: "L thumb", t: [180.74, 742.23], d: "m0 0c0.117-26.192-28.646-67.857-30.303-94.249-0.094-1.505 0 0 0.014-2.979 0.073-16.574 13.767-29.95 30.579-29.876 16.815 0.075 30.388 13.572 30.313 30.146-7e-3 1.828 0.183 0.473-0.013 3.222-1.893 26.375-30.473 67.544-30.59 93.736z" },
    { id: "th", name: "Thumb hole", hand: "L thumb", t: [181.06, 610.55], d: "m0 0c16.812 0.075 30.504-13.304 30.577-29.88 0.075-16.572-13.497-30.071-30.312-30.148-16.813-0.073-30.507 13.305-30.579 29.879-0.075 16.574 13.5 30.074 30.314 30.149z" },
    { id: "ka", name: "Small oval key above hole 1 (A key, name unverified)", hand: "L 1st finger", t: [318.07, 745.69], d: "m0 0c0-13.289-5.875-24.06-13.124-24.06s-13.124 10.771-13.124 24.06c0 13.288 5.875 24.06 13.124 24.06s13.124-10.772 13.124-24.06z" },
    { id: "kg", name: "Long oval key beside hole 1 (G♯ key, name unverified)", hand: "L 1st finger", t: [355.99, 712.73], d: "m0 0c0-17.503-6.203-31.692-13.854-31.692-7.65 0-13.853 14.189-13.853 31.692s6.203 31.692 13.853 31.692c7.651 0 13.854-14.189 13.854-31.692z" },
    { id: "l1", name: "Hole 1", hand: "L 1st finger", t: [340.79, 655.35], d: "m0 0c0-20.613-16.71-37.325-37.325-37.325-20.612 0-37.323 16.712-37.323 37.325 0 20.612 16.711 37.324 37.323 37.324 20.615 0 37.325-16.712 37.325-37.324z" },
    { id: "l2", name: "Hole 2", hand: "L 2nd finger", t: [340.79, 558.85], d: "m0 0c0-20.612-16.71-37.325-37.325-37.325-20.612 0-37.322 16.713-37.322 37.325 0 20.613 16.71 37.324 37.322 37.324 20.615 0 37.325-16.711 37.325-37.324z" },
    { id: "l3", name: "Hole 3", hand: "L 3rd finger", t: [340.79, 462.34], d: "m0 0c0-20.612-16.71-37.324-37.325-37.324-20.612 0-37.322 16.712-37.322 37.324 0 20.613 16.71 37.324 37.322 37.324 20.615 0 37.325-16.711 37.325-37.324z" },
    { id: "r1", name: "Hole 4", hand: "R 1st finger", t: [340.79, 365.84], d: "m0 0c0-20.612-16.71-37.324-37.325-37.324-20.612 0-37.322 16.712-37.322 37.324s16.71 37.324 37.322 37.324c20.615 0 37.325-16.712 37.325-37.324z" },
    { id: "r2", name: "Hole 5", hand: "R 2nd finger", t: [340.79, 269.33], d: "m0 0c0-20.613-16.71-37.325-37.325-37.325-20.612 0-37.322 16.712-37.322 37.325 0 20.611 16.71 37.323 37.322 37.323 20.615 0 37.325-16.712 37.325-37.323z" },
    { id: "r3", name: "Hole 6", hand: "R 3rd finger", t: [340.79, 172.82], d: "m0 0c0-20.612-16.71-37.324-37.325-37.324-20.612 0-37.322 16.712-37.322 37.324s16.71 37.325 37.322 37.325c20.615 0 37.325-16.713 37.325-37.325z" },
    { id: "s1", name: "Side key 1 (top)", hand: "R side", t: [218.6, 443.68], d: "m0 0c0-10.306-8.356-18.662-18.663-18.662-10.306 0-18.662 8.356-18.662 18.662 0 10.308 8.356 18.662 18.662 18.662 10.307 0 18.663-8.354 18.663-18.662z" },
    { id: "s2", name: "Side key 2", hand: "R side", t: [209.09, 420.57], d: "m0 0c8.984-5.053 12.168-16.434 7.117-25.416-5.054-8.982-16.435-12.169-25.416-7.115-8.985 5.053-12.169 16.432-7.116 25.414 5.052 8.984 16.43 12.169 25.415 7.117z" },
    { id: "s3", name: "Side key 3", hand: "R side", t: [218.6, 366.09], d: "m0 0c0-10.307-8.355-18.662-18.662-18.662-10.306 0-18.663 8.355-18.663 18.662 0 10.308 8.357 18.662 18.663 18.662 10.307 0 18.662-8.354 18.662-18.662z" },
    { id: "s4", name: "Side key 4 (bottom)", hand: "R side", t: [209.09, 342.99], d: "m0 0c8.985-5.054 12.169-16.434 7.118-25.416-5.055-8.981-16.435-12.169-25.417-7.115-8.984 5.052-12.169 16.432-7.115 25.415 5.052 8.982 16.43 12.168 25.414 7.116z" },
    { id: "lf", name: "Leaf key (name not printed)", hand: "hand split", t: [291.84, 418.86], d: "m0 0 1.568 3.841s24.686-1.645 34.552 3.492c13.463 7.009 33.61 12.003 41.871 9.186 6.85-2.335 4.837-8.197-10.475-13.006-6.267-1.967-24.131-3.929-32.051-4.141-9.487-0.254-35.465 0.628-35.465 0.628z" },
    { id: "tt", name: "Tulip, top petal", hand: "little finger", t: [379.74, 401.73], d: "m0 0c7.963 6.068 12.789 15.948 22.274 22.11 16.841 8.691 43.756 7.062 50.312-13.412 0.192-5.494-0.912-10.712-3.325-15.65-3.995-5.968-10.042-8.773-17.116-9.995-13.876-1.142-28.496 0.6-42.012 7.562-3.635 2.134-6.992 5.575-9.289 9.902Z" },
    { id: "tl", name: "Tulip, left petal", hand: "little finger", t: [418.4, 370.73], d: "m0 0s-20.439 51.365-45.64 32.187c-25.203-19.183-1.538-52.153-1.538-52.153s33.213-32.951 36.447-46.589c3.236-13.634 10.731 66.555 10.731 66.555Z" },
    { id: "tr", name: "Tulip, right petal and stem", hand: "little finger", t: [404.9, 268.84], d: "m0 0 14.658,0.186 c 0,0 -10.564,41.694 7.727,54.737 24.956,17.805 40.951,47.874 28.608,63.241 C 40.764,130.908 18.327,131.251 2.23,109.03 -4.35,99.932 -8.953,71.731 -8.437,58.816 -7.821,43.346 0,0 0,0 Z" },
    { id: "p1", name: "Little-finger oval, top left", hand: "little finger", t: [258.29, 87.681], d: "m0 0c0-12.885-18.28-23.329-40.829-23.329-22.548 0-40.829 10.444-40.829 23.329s18.281 23.329 40.829 23.329c22.549 0 40.829-10.444 40.829-23.329z" },
    { id: "p2", name: "Little-finger oval, top right", hand: "little finger", t: [342.13, 87.681], d: "m0 0c0-12.887-18.279-23.331-40.829-23.331-22.548 0-40.828 10.444-40.828 23.331 0 12.885 18.28 23.329 40.828 23.329 22.55 0 40.829-10.444 40.829-23.329z" },
    { id: "p3", name: "Little-finger oval, bottom left", hand: "little finger", t: [258.29, 38.83], d: "m0 0c0-12.884-18.28-23.33-40.829-23.33-22.548 0-40.829 10.446-40.829 23.33 0 12.885 18.281 23.329 40.829 23.329 22.549 0 40.829-10.444 40.829-23.329z" },
    { id: "p4", name: "Little-finger oval, bottom right", hand: "little finger", t: [342.13, 38.834], d: "m0 0c0-12.888-18.279-23.334-40.829-23.334-22.548 0-40.828 10.446-40.828 23.334 0 12.885 18.28 23.33 40.828 23.33 22.55 0 40.829-10.445 40.829-23.33z" },
    { id: "pX", name: "Extra low E♭ oval (alto, bass and larger only)", hand: "little finger", t: [258.29, -10.02], alto: true, d: "little finger" }
  ];
  var NS = "http://www.w3.org/2000/svg";

  // ---------- the fingering chart (written pitch; same for every size of clarinet except as noted) ----------
  function k() { var o = []; for (var i = 0; i < arguments.length; i++) o = o.concat(arguments[i]); return o; }
  var SIX = ["l1", "l2", "l3", "r1", "r2", "r3"], TH = ["th"], RG = ["reg", "th"];
  var F = {}, TAGS = {};
  function put(m, list, tags) { F[m] = list; if (tags) TAGS[m] = tags; }
  // chalumeau
  put(52, [k(TH, SIX, ["tl", "p4"]), k(TH, SIX, ["tl"]), k(TH, SIX, ["p3"])], ["LR", "L", "R"]);
  put(53, [k(TH, SIX, ["p4"]), k(TH, SIX, ["tt"])], ["R", "L"]);
  put(54, [k(TH, SIX, ["tr", "p4"]), k(TH, SIX, ["tr"]), k(TH, SIX, ["p1"])], ["LR", "L", "R"]);
  put(55, [k(TH, SIX)]); put(56, [k(TH, SIX, ["p2"])]);
  put(57, [k(TH, ["l1", "l2", "l3", "r1", "r2"])]);
  put(58, [k(TH, ["l1", "l2", "l3", "r1"])]);
  put(59, [k(TH, ["l1", "l2", "l3", "r2"]), k(TH, ["l1", "l2", "l3", "r1", "lf"])]);
  put(60, [k(TH, ["l1", "l2", "l3"])]); put(61, [k(TH, ["l1", "l2", "l3", "lf"])]);
  put(62, [k(TH, ["l1", "l2"])]);
  put(63, [k(TH, ["l1", "l2", "s4"]), k(TH, ["l1", "l2", "lf"]), k(TH, ["l1", "r1"])]);
  put(64, [k(TH, ["l1"])]); put(65, [k(TH)]);
  put(66, [["l1"], k(TH, ["s3", "s4"])]);
  put(67, [[]]); put(68, [["kg"]]); put(69, [["ka"]]);
  put(70, [["reg", "ka"]]);
  // clarion: the chalumeau fingering a twelfth lower, with the register key (11 notes), and the throat tones above
  [[52, 71], [53, 72], [54, 73]].forEach(function (p) { F[p[1]] = F[p[0]].map(function (f) { return ["reg"].concat(f); }); TAGS[p[1]] = TAGS[p[0]]; });
  [[55, 74], [56, 75], [57, 76], [58, 77], [59, 78], [60, 79], [61, 80], [62, 81], [63, 82], [64, 83], [65, 84]].forEach(function (p) {
    F[p[1]] = F[p[0]].map(function (f) { return ["reg"].concat(f); });
  });
  // the highest notes as drawn (hole 1 up, holes 2 3 ...)
  put(85, [["reg", "th", "l2", "l3", "r1", "r2"]]);
  put(86, [["reg", "th", "l2", "l3", "r1", "p2"]]);
  put(87, [["reg", "th", "l2", "l3", "r1", "lf", "p2"], ["reg", "th", "l2", "l3", "r2", "p2"]]);
  put(88, [["reg", "th", "l2", "l3", "p2"]]);
  put(89, [["reg", "th", "l2", "l3", "lf", "p2"]]);
  var ALTO = {};
  Object.keys(F).forEach(function (m) { ALTO[m] = F[m]; });
  ALTO[51] = [k(TH, SIX, ["tl", "pX"])]; TAGS[51] = ["L"];
  [85, 86, 87, 88, 89].forEach(function (m) { ALTO[m] = F[m].map(function (f) { return ["l1~"].concat(f); }); });

  // ---------- the trill chart: hold these, move the gray key(s) ----------
  function T(from, to, hold, trill, unsure) { return { from: from, to: to, hold: hold, trill: trill, unsure: !!unsure }; }
  var R5 = ["l1", "l2", "l3"], RR = ["reg", "th"];
  var TRILLS = [
    T(52, 53, k(TH, SIX, ["p4"]), ["tl"]), T(52, 53, k(TH, SIX, ["tt"]), ["p3"]),
    T(52, 54, k(TH, SIX, ["p1"]), ["tl"]), T(52, 54, k(TH, SIX, ["tr"]), ["p3"]),
    T(53, 54, k(TH, SIX, ["p4"]), ["tr"]), T(53, 54, k(TH, SIX, ["tt"]), ["p1"]),
    T(54, 56, k(TH, SIX, ["tr"]), ["p2"]), T(55, 56, k(TH, SIX), ["p2"]),
    T(57, 59, k(TH, R5, ["r2"]), ["r1"]), T(58, 59, k(TH, R5, ["r1"]), ["lf"]),
    T(62, 63, k(TH, ["l1", "l2"]), ["s4"]), T(62, 63, k(TH, ["l1", "l2"]), ["lf"]),
    T(64, 66, ["l1"], ["th"]), T(65, 66, TH, ["s3", "s4"]),
    T(69, 70, ["ka"], ["reg"]), T(69, 70, ["ka"], ["s3"]), T(69, 71, ["ka"], ["s1"]), T(70, 72, ["reg", "ka"], ["s1"]),
    T(71, 72, k(RR, SIX, ["p4"]), ["tl"]), T(71, 72, k(RR, SIX, ["tt"]), ["p3"]),
    T(71, 73, k(RR, SIX, ["p1"]), ["tl"]), T(71, 73, k(RR, SIX, ["tr"]), ["p3"]),
    T(74, 75, k(RR, SIX), ["p2"]),
    T(76, 78, k(RR, R5, ["r2"]), ["r1"]), T(77, 78, k(RR, R5, ["r1"]), ["lf"]), T(78, 80, k(RR, R5, ["r2"]), ["lf"], true),
    T(79, 80, k(RR, R5), ["lf"]),
    T(81, 82, k(RR, ["l1", "l2"]), ["s4"]), T(81, 82, k(RR, ["l1", "l2"]), ["lf"]),
    T(82, 84, k(RR, ["s4"]), ["l1", "l2"], true), T(82, 84, k(RR, ["l1", "l2", "lf"]), ["s3", "s4"], true),
    T(83, 85, ["l1"], RR, true), T(83, 85, k(RR, ["l1"]), ["s3", "s4"], true),
    T(86, 87, k(RR, ["l2", "l3", "r1"]), ["lf"], true)
  ];

  // ---------- instruments: written -> concert (semitones) ----------
  // trans, written -> concert. Not from the book (it prints none): general knowledge, UNVERIFIED (see the sources file).
  var INSTRUMENTS = {
    bb:    { name: "B♭ clarinet", trans: -2, chart: "bb", low: 52 },
    a:     { name: "A clarinet", trans: -3, chart: "bb", low: 52 },
    eb:    { name: "E♭ clarinet", trans: 3, chart: "bb", low: 52 },
    alto:  { name: "E♭ alto clarinet", trans: -9, chart: "alto", low: 51 },
    bass:  { name: "B♭ bass clarinet", trans: -14, chart: "alto", low: 51 },
    contra:{ name: "E♭ contra-alto clarinet", trans: -21, chart: "alto", low: 51 },
    cbass: { name: "B♭ contrabass clarinet", trans: -26, chart: "alto", low: 51 }
  };
  function table(chart) { return chart === "alto" ? ALTO : F; }

  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  var SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  function name(m, how) { var pc = ((m % 12) + 12) % 12, t = how === "flat" ? FLATS : how === "sharp" ? SHARPS : NAMES; return t[pc] + (Math.floor(m / 12) - 1); }
  function both(m) { var a = name(m, "sharp"), b = name(m, "flat"); return a === b ? a : a.replace(/\d+$/, "") + "/" + b; }

  function sameSet(a, b) { if (a.length !== b.length) return false; var s = {}; a.forEach(function (x) { s[x] = 1; }); return b.every(function (x) { return s[x]; }); }
  function lookup(keys, chart) {
    var T0 = table(chart), out = [];
    Object.keys(T0).forEach(function (m) { if (T0[m].some(function (f) { return sameSet(f, keys); })) out.push(+m); });
    return out;
  }

  // ---------- drawing ----------
  var DECO = '<path d="M266.15 415.69h75.987"/>';   // the line between the hands, from the template
  function diagram(el, o) {
    o = o || {};
    var svg = '<svg class="clc' + (o.onToggle ? " clc-live" : "") + (o.small ? " clc-small" : "") + '" viewBox="190 20 440 ' + (o.ext ? 1085 : 1030) + '" role="img" aria-label="' + (o.label || "Clarinet fingering") + '" xmlns="' + NS + '">' +
      '<defs><linearGradient id="clcHalf" x1="0" y1="0" x2="0" y2="1"><stop offset="48%" style="stop-color:var(--cl-ink,#231f20)"/><stop offset="52%" style="stop-color:var(--cl-open,#fff)"/></linearGradient></defs>' +
      '<g transform="matrix(1.3333 0 0 -1.3333 0 1056)"><g class="clc-deco" transform="translate(0 0)">' + DECO + '</g>';
    K.forEach(function (q) {
      if (q.alto && !o.ext) return;
      svg += '<path class="clc-k" data-k="' + q.id + '" transform="translate(' + q.t[0] + " " + q.t[1] + ')" d="' + q.d + '"><title>' + q.name + " — " + q.hand + "</title></path>";
    });
    el.innerHTML = svg + "</g></svg>";
    var on = {}, tr = {};
    function paint() {
      el.querySelectorAll(".clc-k").forEach(function (p) {
        var id = p.getAttribute("data-k");
        p.classList.toggle("clc-down", on[id] === 1); p.classList.toggle("clc-half", on[id] === 2); p.classList.toggle("clc-trill", !!tr[id]);
      });
    }
    if (o.onToggle) el.querySelector("svg").addEventListener("click", function (e) {
      var p = e.target.closest(".clc-k"); if (!p) return; var id = p.getAttribute("data-k");
      if (on[id]) delete on[id]; else on[id] = 1; paint(); o.onToggle(get());
    });
    function get() { return Object.keys(on).map(function (x) { return on[x] === 2 ? x + "~" : x; }); }
    return {
      el: el,
      set: function (keys, trill) {
        on = {}; tr = {};
        (keys || []).forEach(function (x) { if (/~$/.test(x)) on[x.slice(0, -1)] = 2; else on[x] = 1; });
        (trill || []).forEach(function (x) { tr[x] = 1; }); paint();
      },
      get: get
    };
  }

  // No clarinet sound is used here: a synthesized one (square wave = odd harmonics, which is what a cylindrical pipe with a single
  // reed produces, through a low-pass, a soft attack, no vibrato because clarinetists generally don't use it). The band has clarinet
  // samples (BandSounds "clarinet"); not used so the page needs no sample loading. Unverified as a likeness.
  function tone(ac, out, midi, when, dur, vel) {
    var hz = 440 * Math.pow(2, (midi - 69) / 12), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.2;
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), mix = ac.createGain();
    o1.type = "square"; o2.type = "triangle"; o1.frequency.value = hz; o2.frequency.value = hz * 2; mix.gain.value = 0.35;
    o1.connect(f); o2.connect(mix); mix.connect(f);
    f.type = "lowpass"; f.frequency.value = Math.min(6000, hz * 6); f.Q.value = 0.8; f.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v, t + Math.max(0.06, dur - 0.09)); g.gain.linearRampToValueAtTime(0, t + dur);
    [o1, o2].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  var api = { KEYS: K, FINGERINGS: F, ALTO: ALTO, TAGS: TAGS, TRILLS: TRILLS, INSTRUMENTS: INSTRUMENTS, LOW: 52, HIGH: 89,
    table: table, diagram: diagram, lookup: lookup, name: name, both: both, tone: tone, sameSet: sameSet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ClarChart = api;
})(typeof window !== "undefined" ? window : globalThis);
