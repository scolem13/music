// horn-chart.js — French horn fingering table (single F, single B♭, double F/B♭) and the valve-lever diagram. Used by lessons/horn.qmd
// (horn-page.js). Browser (global HornChart) and node (tests/horn/horn-chart.test.js).
//
// Source (scripts/sources/horn.py): the "Horn Fingering Chart" page of the instrument guide (the book's footer code is "W74", title and
// publisher not printed on the pages seen; printed page 189 is the chart's neighbour, the chart page itself shows no number). Every
// fingering below was read off a 300 dpi render of that page, cell by cell, and checked against the horn's own arithmetic (see test).
// The chart prints WRITTEN pitch in treble clef, F3 up to C6, three rows of four low notes then three rows of seven; each cell gives the
// F-horn fingering on top and the B♭-horn one in brackets. "Use either fingering if you play a double horn. Depress the thumb lever to
// switch from the F side to the B♭ side. ... players switch from the F fingering to the B♭ fingering on [G♯4/A♭4] and above."
//
//   HornChart.NOTES      [{midi, f:[valves], b:[valves], altF?:[valves]}]   written MIDI, F3 (53) .. C6 (84); valves are lever numbers 1..3, [] = 0
//   HornChart.TYPES      { double:{label, sides:["F","Bb"]}, f:{...}, bb:{...} }
//   HornChart.SWITCH     68 (written G♯4/A♭4): where the book says a double-horn player moves to the B♭ side
//   HornChart.lookup(side, valves) -> [ {midi, partial, alt?} ]  every written note that lever combination plays on that side, low to high
//   HornChart.fingerings(midi, type) -> [ {side, valves, alt?} ]  usual first
//   HornChart.concert(m) = m - 7 (horn in F), name(m, how), partial(side, valves, midi), sameSet, tone(...)
//   HornChart.diagram(el, {thumb, onToggle, small, label}) -> {set(valves, thumb), get(), thumb()}   levers 1-3 (traced from horn.ai) + thumb lever
//
// NOT on the printed chart, so inferred / unverified (project rule 4):
//  - Partial numbers are worked out here, not printed: the F side's tube is taken as a horn in F (fundamental sounding F1), the B♭ side as B♭1,
//    each lengthened by the levers' usual intervals (1 = 2 semitones, 2 = 1, 3 = 3); the partial is the harmonic nearest the sounding pitch.
//    The test checks each is within half a semitone of a harmonic. Standard horn acoustics, not read from this book.
//  - Written to concert is a perfect fifth down (horn in F): standard, not printed on the chart (the page cites it as unverified).
//  - The valve intervals of the double horn's thumb (B♭ side) are not on the chart either.
//  - The chart shows B♭-side A♭4 / A4 as (2 3) / (1 2) although the open B♭ horn can reach A4 as a harmonic; stored as printed.
//  - "2 or 1 2" (C♯5) and "0 or 1" (D5) are both on the chart for the F side; the first is stored as usual, the second as altF.
//  - The lever diagram is traced from the three tear-drop shapes in horn.ai (numbers 1 2 3); the thumb lever is this page's addition (the .ai has none).
//  - HornChart.tone is a synthesized mellow buzz: the fallback. horn-page.js plays the band's french_horn samples (BandSounds, soundfont) when band/sounds.js is on the page.
(function (global) {
  "use strict";
  var NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
  var SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"], FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

  // [written midi, F side, B♭ side, F alternate]
  var RAW = [
    [53, [1], []], [54, [2], [1, 2, 3]], [55, [], [1, 3]], [56, [2, 3], [2, 3]], [57, [1, 2], [1, 2]], [58, [1], [1]], [59, [2], [2]],
    [60, [], []], [61, [1, 2], [2, 3]], [62, [1], [1, 2]], [63, [2], [1]], [64, [], [2]],
    [65, [1], []], [66, [2], [1, 2]], [67, [], [1]], [68, [2, 3], [2, 3]], [69, [1, 2], [1, 2]], [70, [1], [1]], [71, [2], [2]],
    [72, [], []], [73, [2], [2, 3], [1, 2]], [74, [], [1, 2], [1]], [75, [2], [1]], [76, [], [2]], [77, [1], []],
    [78, [2], [2]], [79, [], []], [80, [2, 3], [2, 3]], [81, [1, 2], [1, 2]], [82, [1], [1]], [83, [2], [2]], [84, [], []]
  ];
  var NOTES = RAW.map(function (r) { var o = { midi: r[0], f: r[1], b: r[2] }; if (r[3]) o.altF = r[3]; return o; });
  var BY = {}; NOTES.forEach(function (n) { BY[n.midi] = n; });
  var LOW = 53, HIGH = 84, SWITCH = 68;
  var TYPES = {
    double: { label: "Double horn (F / B♭, thumb lever)", sides: ["F", "Bb"], thumb: true },
    f: { label: "Single F horn", sides: ["F"], thumb: false },
    bb: { label: "Single B♭ horn", sides: ["Bb"], thumb: false }
  };
  var DROP = { 1: 2, 2: 1, 3: 3 };

  function key(v) { return v.slice().sort().join(""); }
  function sameSet(a, b) { return key(a) === key(b); }
  function partial(side, valves, midi) {
    var d = 0; valves.forEach(function (v) { d += DROP[v]; });
    var fund = (side === "F" ? 29 : 34) - d, st = midi - 7 - fund;
    return Math.round(Math.pow(2, st / 12));
  }
  function partialError(side, valves, midi) {   // semitones between the note and the nearest harmonic
    var d = 0; valves.forEach(function (v) { d += DROP[v]; });
    var st = midi - 7 - ((side === "F" ? 29 : 34) - d), n = Math.round(Math.pow(2, st / 12));
    return Math.abs(st - 12 * Math.log(n) / Math.LN2);
  }
  function fingerings(midi, type) {
    var n = BY[midi], out = [], sides = (TYPES[type] || TYPES.double).sides;
    if (!n) return out;
    if (sides.indexOf("F") >= 0) { out.push({ side: "F", valves: n.f.slice() }); if (n.altF) out.push({ side: "F", valves: n.altF.slice(), alt: true }); }
    if (sides.indexOf("Bb") >= 0) out.push({ side: "Bb", valves: n.b.slice() });
    return out;
  }
  function lookup(side, valves) {
    var out = [];
    NOTES.forEach(function (n) {
      if (side === "F") {
        if (sameSet(n.f, valves)) out.push({ midi: n.midi, partial: partial("F", valves, n.midi) });
        else if (n.altF && sameSet(n.altF, valves)) out.push({ midi: n.midi, partial: partial("F", valves, n.midi), alt: true });
      } else if (sameSet(n.b, valves)) out.push({ midi: n.midi, partial: partial("Bb", valves, n.midi) });
    });
    return out;
  }
  function name(m, how) { var pc = ((m % 12) + 12) % 12, t = how === "flat" ? FLATS : how === "sharp" ? SHARPS : NAMES; return t[pc] + (Math.floor(m / 12) - 1); }
  function concert(m) { return m - 7; }

  // ---- the lever diagram: the three tear-drop shapes of horn.ai (centres x 86.7, 305.3, 523.9; top y 78, bottom y 576) + a thumb lever ----
  var NS = "http://www.w3.org/2000/svg";
  var DROPLET = "M0 0C0-123.4-67.23-274.851-67.23-274.851-67.23-274.851-134.459-123.4-134.459 0-134.459 123.402-104.36 223.439-67.23 223.439-30.099 223.439 0 123.402 0 0Z";
  function diagram(el, o) {
    o = o || {};
    var svg = '<svg class="hnc' + (o.onToggle ? " hnc-live" : "") + (o.small ? " hnc-small" : "") + '" viewBox="0 60 612 ' + (o.thumb ? 700 : 560) + '" role="img" aria-label="' + (o.label || "Horn levers") + '" xmlns="' + NS + '">';
    [1, 2, 3].forEach(function (i) {
      var cx = 86.7 + (i - 1) * 218.6;
      svg += '<g class="hnc-v" data-v="' + i + '" tabindex="' + (o.onToggle ? 0 : -1) + '"><title>Lever ' + i + '</title><path class="hnc-k" transform="matrix(1,0,0,-1,' + (cx + 67.23) + ',301.54)" d="' + DROPLET + '"/><text class="hnc-n" x="' + cx + '" y="330" text-anchor="middle">' + i + '</text></g>';
    });
    if (o.thumb) svg += '<g class="hnc-v hnc-t" data-v="T" tabindex="' + (o.onToggle ? 0 : -1) + '"><title>Thumb lever (B♭ side)</title><rect class="hnc-k" x="86" y="620" width="440" height="110" rx="55"/><text class="hnc-n hnc-nt" x="306" y="688" text-anchor="middle">thumb</text></g>';
    el.innerHTML = svg + "</svg>";
    var on = {}, th = false;
    function paint() {
      el.querySelectorAll(".hnc-v").forEach(function (g) {
        var id = g.getAttribute("data-v"), d = id === "T" ? th : !!on[id];
        g.classList.toggle("hnc-down", d); g.setAttribute("aria-pressed", d ? "true" : "false");
      });
    }
    function get() { return Object.keys(on).map(Number).sort(); }
    function toggle(g) { var id = g.getAttribute("data-v"); if (id === "T") th = !th; else if (on[id]) delete on[id]; else on[id] = 1; paint(); o.onToggle(get(), th); }
    if (o.onToggle) {
      var s = el.querySelector("svg");
      s.addEventListener("click", function (e) { var g = e.target.closest(".hnc-v"); if (g) toggle(g); });
      s.addEventListener("keydown", function (e) { var g = e.target.closest && e.target.closest(".hnc-v"); if (g && (e.key === " " || e.key === "Enter")) { e.preventDefault(); toggle(g); } });
    }
    return { el: el, set: function (valves, thumb) { on = {}; (valves || []).forEach(function (x) { on[x] = 1; }); th = !!thumb; paint(); }, get: get, thumb: function () { return th; } };
  }

  // a mellow horn-like tone: two saw oscillators through a low low-pass, slow attack, a little vibrato
  function tone(ac, out, midi, when, dur, vel) {
    var hz = 440 * Math.pow(2, (midi - 69) / 12), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.32 * (hz < 90 ? 1.5 : 1);
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o1.type = "sawtooth"; o2.type = "triangle"; o1.frequency.value = hz; o2.frequency.value = hz; o2.detune.value = 5;
    lfo.frequency.value = 4.8; lg.gain.value = hz * 0.0025; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(f); o2.connect(f); f.type = "lowpass"; f.Q.value = 1.2;
    var top = Math.min(2600, Math.max(500, hz * 4));
    f.frequency.setValueAtTime(top * 0.3, t); f.frequency.linearRampToValueAtTime(top, t + 0.12); f.frequency.linearRampToValueAtTime(top * 0.7, t + Math.max(0.25, dur));
    f.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.09); g.gain.setValueAtTime(v, t + Math.max(0.1, dur - 0.12)); g.gain.linearRampToValueAtTime(0, t + dur);
    [o1, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  var api = { NOTES: NOTES, TYPES: TYPES, LOW: LOW, HIGH: HIGH, SWITCH: SWITCH, lookup: lookup, fingerings: fingerings, partial: partial, partialError: partialError, sameSet: sameSet,
    name: name, concert: concert, diagram: diagram, tone: tone };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.HornChart = api;
})(typeof window !== "undefined" ? window : globalThis);
