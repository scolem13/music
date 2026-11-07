// brass-chart.js — valve fingering tables for trumpet, baritone / euphonium and tuba, and the valve diagram. Used by lessons/brass-fingerings.qmd
// (brass-page.js). Works in the browser (global BrassChart) and in node (tests/brass/brass-chart.test.js).
//
// Sources (see scripts/sources/brass.py):
//   1. Two one-page charts from StepWise Flashcards / StepWise Publications: "Trumpet Fingering Chart" (2022 version) and "Essential Range Tuba Fingering Chart".
//      Every fingering was read off those charts note by note from a 300 dpi render, staff and letter circles checked against each other.
//   2. The scanned instrument guide (unidentified band method, a teacher's guide; pages numbered 160-253 in the brass chapters, footer "W74"):
//      B♭ Trumpet / Cornet / Flugelhorn chart (p. 173), Baritone/Euphonium B.C. (p. 233) and T.C. (p. 234), BB♭ Tuba and Sousaphone (p. 251),
//      E♭ Tuba (p. 252), Tuba T.C. (p. 253). Read from 200 dpi renders; the staff positions were checked against the printed letters and against
//      the harmonic series (every row steps down 1, 2, 3, 4, 5, 6 semitones for valves 2, 1, 12, 23, 13, 123).
//
//   BrassChart.INSTRUMENTS   { trumpet, euph, euphtc, tuba, tubaeb, tubatc: {label, option, transpose, clef, concertClef, low, high, nvalves, rows, groups} }
//                            transpose: written -> concert, semitones (trumpet -2; euphonium T.C. -14; tuba T.C. -26; the bass-clef ones 0)
//   BrassChart.FINGERINGS    { inst: { writtenMidi: [ {valves:[2], partial:1, slide?:true, alt?:true}, ... ] } }
//                            the first fingering of a note is the usual one. valves are numbers 1..4 (0 valves = []).
//   BrassChart.lookup(inst, valves) -> [ {midi, partial, slide?, alt?} ] every note that combination plays on the chart, low to high
//   BrassChart.sameSet(a, b), name(m, "sharp"|"flat"), both(m), concert(inst, m), tone(ac, out, midi, when, dur, vel)
//   BrassChart.diagram(el, {nvalves, onToggle, small, label}) -> {set(valves), get()}   SVG valve buttons (click to press)
//
// Checked against the book (2026-11): the trumpet table is note for note the book's chart (F♯3 to C6; the book does not print the 3rd-slide
// footnote). The tuba table (28..53) is the book's BB♭ chart, and the book's chart has one more row (54..58), added as row 6. The book's chart is
// headed "BB♭ Tuba and Sousaphone": so the tuba IS a BB♭ tuba, read at concert pitch in bass clef. The E♭ tuba chart is the same table 7 semitones
// lower (21..46, A0 to B♭2); the book's valve 4 alternates are tied to the notes (E, F, B, C of the BB♭; A, B♭, E, F of the E♭).
// The T.C. charts are the bass-clef ones written higher (euphonium +14 = a major ninth, tuba +26), checked on the first and last note of each.
//
// NOT on the printed charts, so unverified / this page's reading (project rule 4):
//  - The tuba T.C. chart does not say which tuba it is for. Its notes are the BB♭ chart +26 (F♯3 at 1-2-3 for the BB♭ E1), so it is read as a BB♭ tuba.
//  - The baritone / euphonium B.C. chart is read as sounding pitch (open = B♭2, F3, B♭3, D4, F4, B♭4: the open notes of a B♭ instrument).
//    The book's compensating-system tuba note ("Compensating or 4") is only a label on the E♭ tuba picture; compensating fingerings are not given.
//  - Partial numbers: the StepWise charts number the lowest row they print "1st Partial" (acoustically the trumpet's 1st printed row, C4, is the 2nd
//    partial; the pedal tone is not printed). This file keeps those numbers for the trumpet and tuba rows. The book prints no rows, so the
//    euphonium rows carry the harmonic number of the open tube (4, 6, 8, 10, 12, 16), worked out here (INSTRUMENTS.rows = "harmonic").
//  - Trumpet transposition (written C sounds B♭, concert = written - 2) is standard but not on the chart: cited on the lesson page.
//    The book's own words: treble-clef baritone is also a B♭ instrument; the size of the transposition (a major ninth) is read off its chart, not stated.
//  - The StepWise footnote "*Move the 3rd valve slide out for low D and C♯" sits over the written D4 (13) and C♯4 (123); stored as slide:true.
//  - The sounds are a synthesized buzz, not brass samples.
(function (global) {
  "use strict";
  var NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
  var SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"], FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

  // [chart row (partial), [[written midi, valves], ...]]; trumpet columns are 0, 2, 1, 12, 23, 13, 123
  var TRUMPET_ROWS = [
    [1, [[60, []], [59, [2]], [58, [1]], [57, [1, 2]], [56, [2, 3]], [55, [1, 3]], [54, [1, 2, 3]]]],
    [2, [[67, []], [66, [2]], [65, [1]], [64, [1, 2]], [63, [2, 3]], [62, [1, 3], "slide"], [61, [1, 2, 3], "slide"]]],
    [3, [[72, []], [71, [2]], [70, [1]], [69, [1, 2]], [68, [2, 3]]]],
    [4, [[76, []], [75, [2]], [74, [1]], [73, [1, 2]]]],
    [5, [[79, []], [78, [2]], [77, [1]]]],
    [7, [[84, []], [83, [2]], [82, [1]], [81, [1, 2]], [80, [2, 3]]]]
  ];
  // row 6 of the tuba: from the book's BB♭ chart (p. 251), which goes one partial higher than the StepWise chart
  var TUBA_ROWS = [
    [1, [[34, []], [33, [2]], [32, [1]], [31, [1, 2]], [30, [2, 3]], [29, [1, 3]], [28, [1, 2, 3]]]],
    [2, [[41, []], [40, [2]], [39, [1]], [38, [1, 2]], [37, [2, 3]], [36, [1, 3]], [35, [1, 2, 3]]]],
    [3, [[46, []], [45, [2]], [44, [1]], [43, [1, 2]], [42, [2, 3]]]],
    [4, [[50, []], [49, [2]], [48, [1]], [47, [1, 2]]]],
    [5, [[53, []], [52, [2]], [51, [1]]]],
    [6, [[58, []], [57, [2]], [56, [1]], [55, [1, 2]], [54, [2, 3]]]]
  ];
  // valve 4 on the tuba chart: grey "4" under 13, grey "24" under 123
  var TUBA_ALT = { 29: [4], 36: [4], 28: [2, 4], 35: [2, 4] };
  // Baritone / euphonium, B.C. chart of the instrument guide (p. 233): sounding pitch, bass clef. The book prints no rows; the first number
  // of each row here is the harmonic of the open tube (B♭ tube: harmonic 4 = B♭2, 6 = F3, 8 = B♭3, 10 = D4, 12 = F4, 16 = B♭4), worked out for this page.
  var EUPH_ROWS = [
    [4, [[46, []], [45, [2]], [44, [1]], [43, [1, 2]], [42, [2, 3]], [41, [1, 3]], [40, [1, 2, 3]]]],
    [6, [[53, []], [52, [2]], [51, [1]], [50, [1, 2]], [49, [2, 3]], [48, [1, 3]], [47, [1, 2, 3]]]],
    [8, [[58, []], [57, [2]], [56, [1]], [55, [1, 2]], [54, [2, 3]]]],
    [10, [[62, []], [61, [2]], [60, [1]], [59, [1, 2]]]],
    [12, [[65, []], [64, [2]], [63, [1]]]],
    [16, [[70, []], [69, [2]], [68, [1]], [67, [1, 2]], [66, [2, 3]]]]
  ];
  var EUPH_ALT = { 41: [4], 48: [4], 40: [2, 4], 47: [2, 4] };

  // shift: semitones added to every note (the treble-clef charts are the bass-clef ones written higher); rows: how many rows to keep
  function build(rows, alt, shift, nrows) {
    var f = {}; shift = shift || 0;
    rows.slice(0, nrows || rows.length).forEach(function (r) { r[1].forEach(function (n) { var o = { valves: n[1].slice(), partial: r[0] }; if (n[2] === "slide") o.slide = true; (f[n[0] + shift] = f[n[0] + shift] || []).push(o); }); });
    if (alt) Object.keys(alt).forEach(function (m) { if (f[+m + shift]) f[+m + shift].push({ valves: alt[m].slice(), partial: f[+m + shift][0].partial, alt: true }); });
    return f;
  }
  var FINGERINGS = {
    trumpet: build(TRUMPET_ROWS),
    euph: build(EUPH_ROWS, EUPH_ALT), euphtc: build(EUPH_ROWS, EUPH_ALT, 14),
    tuba: build(TUBA_ROWS, TUBA_ALT), tubaeb: build(TUBA_ROWS, TUBA_ALT, -7, 5), tubatc: build(TUBA_ROWS, TUBA_ALT, 26)
  };
  // option: the drop-down text. concertClef: clef when the staff shows concert pitch. quizLow: lowest note the quiz asks. groups: the explorer's rows of buttons.
  // rows: "chart" = the printed chart's own row numbers, "harmonic" = harmonic of the open tube (not printed).
  var INSTRUMENTS = {
    trumpet: { label: "B♭ trumpet", option: "Trumpet (B♭)", transpose: -2, clef: "treble", concertClef: "treble", low: 54, high: 84, quizLow: 55, nvalves: 3, rows: "chart",
      groups: [["Low", 54, 66], ["Middle", 67, 78], ["High", 79, 84]] },
    euph: { label: "Baritone / euphonium, bass clef", option: "Baritone / euphonium (bass clef, B♭)", transpose: 0, clef: "bass", low: 40, high: 70, nvalves: 4, rows: "harmonic",
      note: "sounding pitch, bass clef (a baritone or euphonium in bass clef is not transposed)", groups: [["Low", 40, 52], ["Middle", 53, 62], ["High", 63, 70]] },
    euphtc: { label: "Baritone / euphonium, treble clef", option: "Baritone / euphonium (treble clef, B♭)", transpose: -14, clef: "treble", concertClef: "bass", low: 54, high: 84, nvalves: 4, rows: "harmonic",
      groups: [["Low", 54, 66], ["Middle", 67, 76], ["High", 77, 84]] },
    tuba: { label: "BB♭ tuba (concert pitch)", option: "BB♭ tuba (bass clef, concert pitch)", transpose: 0, clef: "bass", low: 28, high: 58, nvalves: 4, rows: "chart",
      note: "sounding pitch, bass clef (a tuba in bass clef is not transposed)", groups: [["Pedal-to-low", 28, 40], ["Middle", 41, 53], ["High", 54, 58]] },
    tubaeb: { label: "E♭ tuba (concert pitch)", option: "E♭ tuba (bass clef, concert pitch)", transpose: 0, clef: "bass", low: 21, high: 46, nvalves: 4, rows: "chart",
      note: "sounding pitch, bass clef (a tuba in bass clef is not transposed)", groups: [["Low", 21, 33], ["Middle", 34, 46]] },
    tubatc: { label: "Tuba, treble clef", option: "Tuba (treble clef, B♭ tuba)", transpose: -26, clef: "treble", concertClef: "bass", low: 54, high: 84, nvalves: 4, rows: "chart",
      groups: [["Low", 54, 66], ["Middle", 67, 77], ["High", 78, 84]] }
  };

  function key(v) { return v.slice().sort().join(""); }
  function sameSet(a, b) { return key(a) === key(b); }
  function lookup(inst, valves) {
    var out = [], f = FINGERINGS[inst];
    Object.keys(f).map(Number).sort(function (a, b) { return a - b; }).forEach(function (m) {
      f[m].forEach(function (fg) { if (sameSet(fg.valves, valves)) out.push({ midi: m, partial: fg.partial, slide: !!fg.slide, alt: !!fg.alt }); });
    });
    return out;
  }
  function name(m, how) { var pc = ((m % 12) + 12) % 12, t = how === "flat" ? FLATS : how === "sharp" ? SHARPS : NAMES; return t[pc] + (Math.floor(m / 12) - 1); }
  function both(m) { return name(m); }
  function concert(inst, m) { return m + INSTRUMENTS[inst].transpose; }

  var NS = "http://www.w3.org/2000/svg";
  function diagram(el, o) {
    o = o || {}; var n = o.nvalves || 3, w = 54 * n + 6;
    var svg = '<svg class="brc' + (o.onToggle ? " brc-live" : "") + (o.small ? " brc-small" : "") + '" viewBox="0 0 ' + w + ' 70" role="img" aria-label="' + (o.label || "Valves") + '" xmlns="' + NS + '">';
    for (var i = 1; i <= n; i++) {
      var cx = 3 + 27 + (i - 1) * 54;
      svg += '<g class="brc-v" data-v="' + i + '" tabindex="' + (o.onToggle ? 0 : -1) + '"><title>Valve ' + i + '</title><circle class="brc-k" cx="' + cx + '" cy="26" r="22"/><text class="brc-n" x="' + cx + '" y="33" text-anchor="middle">' + i + "</text></g>";
    }
    el.innerHTML = svg + "</svg>";
    var on = {};
    function paint() { el.querySelectorAll(".brc-v").forEach(function (g) { g.classList.toggle("brc-down", !!on[g.getAttribute("data-v")]); g.setAttribute("aria-pressed", on[g.getAttribute("data-v")] ? "true" : "false"); }); }
    function toggle(g) { var id = g.getAttribute("data-v"); if (on[id]) delete on[id]; else on[id] = 1; paint(); o.onToggle(get()); }
    function get() { return Object.keys(on).map(Number).sort(); }
    if (o.onToggle) {
      el.querySelector("svg").addEventListener("click", function (e) { var g = e.target.closest(".brc-v"); if (g) toggle(g); });
      el.querySelector("svg").addEventListener("keydown", function (e) { var g = e.target.closest && e.target.closest(".brc-v"); if (g && (e.key === " " || e.key === "Enter")) { e.preventDefault(); toggle(g); } });
    }
    return { el: el, set: function (valves) { on = {}; (valves || []).forEach(function (x) { on[x] = 1; }); paint(); }, get: get };
  }

  // a plain brass-like tone: sawtooth through a low-pass that opens on the attack, a little breath attack and light vibrato
  function tone(ac, out, midi, when, dur, vel) {
    var hz = 440 * Math.pow(2, (midi - 69) / 12), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.3 * (hz < 80 ? 1.4 : 1);
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o1.type = "sawtooth"; o2.type = "sawtooth"; o1.frequency.value = hz; o2.frequency.value = hz; o2.detune.value = 6;
    lfo.frequency.value = 5; lg.gain.value = hz * 0.003; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(f); o2.connect(f); f.type = "lowpass"; f.Q.value = 2;
    var top = Math.min(7000, Math.max(700, hz * 7));
    f.frequency.setValueAtTime(top * 0.25, t); f.frequency.linearRampToValueAtTime(top, t + 0.08); f.frequency.linearRampToValueAtTime(top * 0.6, t + Math.max(0.2, dur));
    f.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v, t + Math.max(0.07, dur - 0.1)); g.gain.linearRampToValueAtTime(0, t + dur);
    [o1, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  var api = { INSTRUMENTS: INSTRUMENTS, FINGERINGS: FINGERINGS, lookup: lookup, sameSet: sameSet, name: name, both: both, concert: concert, diagram: diagram, tone: tone };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BrassChart = api;
})(typeof window !== "undefined" ? window : globalThis);
