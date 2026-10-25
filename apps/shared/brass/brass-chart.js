// brass-chart.js — valve fingering tables for trumpet and tuba, and the valve diagram. Used by lessons/brass-fingerings.qmd
// (brass-page.js). Works in the browser (global BrassChart) and in node (tests/brass/brass-chart.test.js).
//
// Sources (see scripts/sources/brass.py): two one-page charts from StepWise Flashcards / StepWise Publications:
//   "Trumpet Fingering Chart" (2022 version, (c) stepwisepublications.com, "Correlates with NinGenius Music StepWise Flashcards")
//   "Essential Range Tuba Fingering Chart" ("Correlates with StepWise Flashcards", www.fingeringcharts.org)
// Every fingering below was read off those charts note by note from a 300 dpi render, staff and letter circles checked against each other.
//
//   BrassChart.INSTRUMENTS   { trumpet: {label, transpose, clef, low, high, nvalves}, tuba: {...} }  transpose: written -> concert, semitones
//   BrassChart.FINGERINGS    { trumpet: { writtenMidi: [ {valves:[2], partial:1, slide?:true, alt?:true}, ... ] }, tuba: {...} }
//                            the first fingering of a note is the usual one. valves are numbers 1..4 (0 valves = []).
//   BrassChart.lookup(inst, valves) -> [ {midi, partial, slide?, alt?} ] every note that combination plays on the chart, low to high
//   BrassChart.sameSet(a, b), name(m, "sharp"|"flat"), both(m), concert(inst, m), tone(ac, out, midi, when, dur, vel)
//   BrassChart.diagram(el, {nvalves, onToggle, small, label}) -> {set(valves), get()}   SVG valve buttons (click to press)
//
// NOT on the printed charts, so unverified / this page's reading (project rule 4):
//  - The tuba chart does not say what pitch tuba it is for (B♭, C, E♭ or F), nor that its staff is sounding pitch. The letters and staff
//    agree with a B♭ tuba (0 valves = B♭1, F2, B♭2, D3, F3, the usual open notes of a BB♭ tuba, as concert pitch in bass clef), so this file
//    calls it "B♭ tuba (concert pitch)". A CC tuba is fingered the same way but sounds a whole tone higher; E♭ and F tubas
//    use the same valve patterns for different note names. The chart's own claim is only "Essential Range".
//  - Partial numbers are the charts' own: both charts number the lowest row they print "1st Partial". Acoustically the trumpet's 1st printed
//    row (C4, 0 valves) is the 2nd partial (the true 1st partial, the pedal tone, is not printed), and the trumpet's "5th"/"7th" printed rows are the
//    6th/8th harmonics. The chart skips a row between "5th" and "7th" ("Skipped Partial (Too Flat)"). The tuba's printed rows are likewise
//    harmonics 2 to 6 (a B♭ tuba's pedal B♭0 and the 1st row's B♭1 are separate). This file keeps the charts' numbers.
//  - Trumpet transposition (written C sounds B♭, concert = written - 2) is standard but not on the chart: cited on the lesson page.
//  - The chart's footnote "*Move the 3rd valve slide out for low D and C♯" sits over the written D4 (13) and C♯4 (123) of the 2nd row; it is stored as
//    slide:true on those two. The chart's picture of the slide does not say how far; the page does not say either.
//  - The tuba's valve-4 fingerings ("4" under 13, "24" under 123) are stored as alternates (alt:true) for F1, C2 (4) and E1, B1 (24): the chart
//    prints them in grey under the 13 and 123 columns, not tied to a particular row, so they are applied to both notes of the column.
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
  var TUBA_ROWS = [
    [1, [[34, []], [33, [2]], [32, [1]], [31, [1, 2]], [30, [2, 3]], [29, [1, 3]], [28, [1, 2, 3]]]],
    [2, [[41, []], [40, [2]], [39, [1]], [38, [1, 2]], [37, [2, 3]], [36, [1, 3]], [35, [1, 2, 3]]]],
    [3, [[46, []], [45, [2]], [44, [1]], [43, [1, 2]], [42, [2, 3]]]],
    [4, [[50, []], [49, [2]], [48, [1]], [47, [1, 2]]]],
    [5, [[53, []], [52, [2]], [51, [1]]]]
  ];
  // valve 4 on the tuba chart: grey "4" under 13, grey "24" under 123
  var TUBA_ALT = { 29: [4], 36: [4], 28: [2, 4], 35: [2, 4] };

  function build(rows, alt) {
    var f = {};
    rows.forEach(function (r) { r[1].forEach(function (n) { var o = { valves: n[1].slice(), partial: r[0] }; if (n[2] === "slide") o.slide = true; (f[n[0]] = f[n[0]] || []).push(o); }); });
    if (alt) Object.keys(alt).forEach(function (m) { f[m].push({ valves: alt[m].slice(), partial: f[m][0].partial, alt: true }); });
    return f;
  }
  var FINGERINGS = { trumpet: build(TRUMPET_ROWS), tuba: build(TUBA_ROWS, TUBA_ALT) };
  var INSTRUMENTS = {
    trumpet: { label: "B♭ trumpet", transpose: -2, clef: "treble", low: 54, high: 84, nvalves: 3 },
    tuba: { label: "B♭ tuba (concert pitch, key assumed)", transpose: 0, clef: "bass", low: 28, high: 53, nvalves: 4 }
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
