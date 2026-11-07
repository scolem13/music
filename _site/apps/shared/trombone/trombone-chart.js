// trombone-chart.js — slide position table for the tenor trombone and the slide diagram. Used by lessons/trombone.qmd
// (trombone-page.js). Works in the browser (global TromboneChart) and in node (tests/trombone/trombone-chart.test.js).
//
// Sources (scripts/sources/trombone.py): the teacher's instrument guide (W74, unidentified band method), the "Trombone B.C. Position Chart"
// (printed p. 214) and "Trombone T.C. Position Chart" (printed p. 215), "Tuning and Intonation" / "Attachments" (p. 206). The drawing is the
// teacher's own (trombone-art.js, from "trombone SVGs/position1.svg").
// Every position below was read off a 250 dpi render of the B.C. chart, note by note. The T.C. chart prints the SAME positions for the same
// notes (checked row by row), so it is not stored twice: the treble clef reading is the sounding note + 14 semitones (see below).
//
//   TromboneChart.FINGERINGS  { soundingMidi: [ {pos: 1..7, short?: true, alt?: true, partial: 2..8}, ... ] }   first = the usual one
//                              short = the chart's "-" (a shortened slide position); alt = the chart's "or" second choice
//   TromboneChart.TRIGGER     { soundingMidi: {pos} }   the two F-attachment alternates the book names (p. 206), nothing else
//   TromboneChart.F_SERIES    sounding midi of partials 1-6 on the F side (book's picture, p. 206)
//   TromboneChart.READINGS    { bass: {clef, shift}, treble: {clef, shift} }   shift = written - sounding
//   TromboneChart.lookup(pos, short) -> [ {midi, partial, alt} ]  every note the chart plays at that position, low to high
//   TromboneChart.name(m, "sharp"|"flat"), both(m), written(reading, m), partialOf(pos, midi)
//   TromboneChart.diagram(el, {interactive, onChange(pos, short), onMove(fractionalPos) while dragging, small, label}) -> {set(pos, short), get(), el}   the slide, drag / click / arrow keys
//   TromboneChart.tone(ac, out, midi, when, dur, vel), holdTone(ac, out, midi) -> {setMidi(m), stop()}
//
// NOT in the sources, so unverified / this page's reading (project rule 4):
//  - Which pitch the book's bass-clef chart means: sounding pitch. The tenor trombone is non-transposing (p. 196), the notes agree with the
//    standard B♭ series (pos 1 B♭2 ... pos 7 E2, each position's partials checked in the test), so the page treats the bass clef chart as sounding pitch.
//  - The treble clef reading is a B♭ treble clef: the chart's letters are the bass clef letters two steps up (E -> F♯ ...), written a major ninth
//    above the sound. The staff octave of the T.C. rows was checked against the printed ledger lines at the extremes only (F♯3 and C6).
//  - Partial numbers are worked out here (position's fundamental B♭1 lowered by one semitone per position, partials at 0 12 19 24 28 31 34 36
//    semitones above it), not printed. The 7th partial (G♯4... in "-" positions) is flat in tune; that is why the chart shortens it.
//  - How far a "-" (shortened) position is drawn from its number is this page's guess (a third of the gap). The chart does not say.
//  - G♯4 is printed "-3" (as is F♯4). On the harmonic series that note is the 8th partial of 3rd position, which needs no shortening;
//    the page keeps what is printed.
//  - The drawing's distances between positions are the teacher's drawing, not measured on an instrument.
//  - The book's F attachment text names only C (in the staff) 1st with trigger instead of 6th, and B natural 2nd with trigger instead of 7th.
//    The F-side positions of other notes are NOT in the scan (pages 207-212 are not in it) and are not guessed here.
//  - The sound is a synthesized brass-like buzz, not a recording.
(function (global) {
  "use strict";
  var ART = (typeof module !== "undefined" && module.exports) ? require("./trombone-art.js") : global.TromboneArt;
  var NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
  var SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"], FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

  // [sounding midi, "usual", "alt"...]; a number is a position, a negative number a shortened position ("-3")
  var ROWS = [
    [40, 7], [41, 6], [42, 5], [43, 4], [44, 3], [45, 2], [46, 1], [47, 7],           // E2 - B2   (chart rows 1-2)
    [48, 6], [49, 5], [50, 4], [51, 3],                                                 // C3 - E♭3  (row 3)
    [52, 2], [53, 1, 6], [54, 5], [55, 4],                                              // E3 - G3   (row 4)
    [56, 3], [57, 2, 6], [58, 1, 5], [59, 4], [60, 3], [61, 2], [62, 1, -4],            // A♭3 - D4  (row 5)
    [63, 3], [64, 2], [65, 1], [66, -3], [67, -2], [68, -3], [69, 2], [70, 1]           // E♭4 - B♭4 (row 6)
  ];
  var OFFSETS = { 0: 1, 12: 2, 19: 3, 24: 4, 28: 5, 31: 6, 34: 7, 36: 8 };   // semitones above a position's fundamental -> partial number
  function partialOf(pos, midi) { return OFFSETS[midi - (34 - (pos - 1))] || 0; }   // 34 = B♭1, the pedal tone of 1st position

  var FINGERINGS = {};
  ROWS.forEach(function (r) {
    FINGERINGS[r[0]] = r.slice(1).map(function (p, i) {
      var o = { pos: Math.abs(p), partial: partialOf(Math.abs(p), r[0]) }; if (p < 0) o.short = true; if (i) o.alt = true; return o;
    });
  });
  var LOW = 40, HIGH = 70;
  var TRIGGER = { 48: { pos: 1 }, 47: { pos: 2 } };
  var F_SERIES = [29, 41, 48, 53, 57, 60];
  var READINGS = { bass: { label: "Bass clef (the sounding pitch)", clef: "bass", shift: 0 }, treble: { label: "Treble clef (B♭ transposing, written a 9th above)", clef: "treble", shift: 14 } };

  function lookup(pos, short) {
    var out = [];
    Object.keys(FINGERINGS).map(Number).sort(function (a, b) { return a - b; }).forEach(function (m) {
      FINGERINGS[m].forEach(function (f) { if (f.pos === pos && !!f.short === !!short) out.push({ midi: m, partial: f.partial, alt: !!f.alt }); });
    });
    return out;
  }
  function name(m, how) { var pc = ((m % 12) + 12) % 12, t = how === "flat" ? FLATS : how === "sharp" ? SHARPS : NAMES; return t[pc] + (Math.floor(m / 12) - 1); }
  function written(reading, m) { return m + READINGS[reading].shift; }

  // ---------- the slide diagram ----------
  var NS = "http://www.w3.org/2000/svg", VW = 286.01517, VH = 61.859924, SHORT = 0.35;
  var TIPS = ART.shifts.map(function (s) { return 1.9163793 * 344.99 + s - 37.09178; });   // x of the slide's far bend in each position (viewBox units)
  function tipAt(p) { p = Math.max(1, Math.min(7, p)); var i = Math.min(5, Math.floor(p) - 1), f = p - (i + 1); return TIPS[i] + (TIPS[i + 1] - TIPS[i]) * f; }
  function posAtX(x) { if (x <= TIPS[0]) return 1; if (x >= TIPS[6]) return 7; for (var i = 0; i < 6; i++) if (x <= TIPS[i + 1]) return i + 1 + (x - TIPS[i]) / (TIPS[i + 1] - TIPS[i]); return 7; }
  function drawn(pos, short) { return short && pos > 1 ? pos - SHORT : pos; }   // where the slide is drawn for a (maybe shortened) position
  var styled = false;
  function addStyle() {
    if (styled || typeof document === "undefined") return; styled = true;
    var s = document.createElement("style"); s.textContent = ART.css; document.head.appendChild(s);
  }

  function diagram(el, o) {
    o = o || {}; addStyle();
    var live = !!o.interactive, cur = { pos: 1, short: false }, at = 1;
    var svg = '<svg class="tbn-art tbn-d' + (live ? " tbn-live" : "") + (o.small ? " tbn-small" : "") + '" viewBox="0 0 ' + VW + " " + VH + '" role="img" aria-label="' + (o.label || "Trombone slide position") + '"' +
      (live ? ' tabindex="0"' : "") + ' xmlns="' + NS + '"><title>' + (o.label || "Trombone slide") + '</title><g transform="translate(-37.09178,-166.23974)">' +
      '<g transform="matrix(1.9163793,0,0,-1.9083317,-92.519295,1121.4345)">' + ART.body + "</g>" +
      '<g class="tbn-slide" transform="matrix(1.9163793,0,0,-1.9083317,0,1089.947)">' + ART.slide + "</g></g>";
    for (var i = 1; i <= 7; i++) {
      var x = TIPS[i - 1];
      svg += '<g class="tbn-pos" data-p="' + i + '"><line class="tbn-guide" x1="' + x.toFixed(2) + '" x2="' + x.toFixed(2) + '" y1="10" y2="50"/>' +
        '<rect x="' + (x - 6).toFixed(2) + '" y="48" width="12" height="13" class="tbn-hit"/><text x="' + x.toFixed(2) + '" y="58" text-anchor="middle" class="tbn-num">' + i + "</text></g>";
    }
    el.innerHTML = svg + "</svg>";
    var root = el.querySelector("svg"), sl = root.querySelector(".tbn-slide");
    function shiftFor(p) { return tipAt(p) - (1.9163793 * 344.99 - 37.09178); }
    function place(p) { at = p; sl.setAttribute("transform", "matrix(1.9163793,0,0,-1.9083317," + shiftFor(p).toFixed(3) + ",1089.947)"); }
    function paint() {
      place(drawn(cur.pos, cur.short));
      root.querySelectorAll(".tbn-pos").forEach(function (g) { g.classList.toggle("tbn-on", +g.getAttribute("data-p") === cur.pos); });
    }
    function set(pos, short) { cur = { pos: Math.max(1, Math.min(7, pos)), short: !!short }; paint(); }
    function change(pos, short) { set(pos, short); if (o.onChange) o.onChange(cur.pos, cur.short); }
    if (live) {
      var drag = null;
      function vx(e) { var r = root.getBoundingClientRect(); return (e.clientX - r.left) / r.width * VW; }
      root.addEventListener("pointerdown", function (e) {
        var g = e.target.closest && e.target.closest(".tbn-pos");
        if (g) { change(+g.getAttribute("data-p"), false); return; }
        if (e.target.closest && e.target.closest(".tbn-slide")) { drag = { off: tipAt(at) - vx(e) }; if (root.setPointerCapture) { try { root.setPointerCapture(e.pointerId); } catch (x) {} } root.classList.add("tbn-grab"); e.preventDefault(); }
      });
      root.addEventListener("pointermove", function (e) { if (drag) { place(posAtX(vx(e) + drag.off)); if (o.onMove) o.onMove(at); } });
      function up() { if (!drag) return; drag = null; root.classList.remove("tbn-grab"); change(Math.round(at), false); if (o.onMove) o.onMove(Math.round(at)); }
      root.addEventListener("pointerup", up); root.addEventListener("pointercancel", up);
      root.addEventListener("keydown", function (e) {
        var k = e.key, p = cur.pos;
        if (k === "ArrowRight" || k === "ArrowUp") p++; else if (k === "ArrowLeft" || k === "ArrowDown") p--; else if (k === "Home") p = 1; else if (k === "End") p = 7;
        else if (/^[1-7]$/.test(k)) p = +k; else return;
        e.preventDefault(); change(Math.max(1, Math.min(7, p)), false);
      });
    }
    set(1, false);
    return { el: el, set: set, get: function () { return { pos: cur.pos, short: cur.short }; }, at: function () { return at; }, move: place };
  }

  // ---------- sound ----------
  function hzOf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // a plain brass-like tone: sawtooth through a low-pass that opens on the attack, a little breath attack and light vibrato
  function tone(ac, out, midi, when, dur, vel) {
    var hz = hzOf(midi), t = Math.max(when || 0, ac.currentTime), v = (vel == null ? 0.6 : vel) * 0.3 * (hz < 80 ? 1.4 : 1);
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o1.type = "sawtooth"; o2.type = "sawtooth"; o1.frequency.value = hz; o2.frequency.value = hz; o2.detune.value = 6;
    lfo.frequency.value = 5; lg.gain.value = hz * 0.003; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(f); o2.connect(f); f.type = "lowpass"; f.Q.value = 2;
    var top = Math.min(6000, Math.max(600, hz * 6));
    f.frequency.setValueAtTime(top * 0.25, t); f.frequency.linearRampToValueAtTime(top, t + 0.08); f.frequency.linearRampToValueAtTime(top * 0.6, t + Math.max(0.2, dur));
    f.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v, t + Math.max(0.07, dur - 0.1)); g.gain.linearRampToValueAtTime(0, t + dur);
    [o1, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }
  // a held tone whose pitch can be moved while it sounds (the slide glissando); midi may be fractional
  function holdTone(ac, out, midi) {
    var t = ac.currentTime, o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o1.type = "sawtooth"; o2.type = "sawtooth"; o2.detune.value = 6; o1.frequency.value = o2.frequency.value = hzOf(midi);
    f.type = "lowpass"; f.Q.value = 2; f.frequency.value = 1800; o1.connect(f); o2.connect(f); f.connect(g); g.connect(out || ac.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.08); o1.start(t); o2.start(t);
    return {
      setMidi: function (m) { var n = ac.currentTime; o1.frequency.setTargetAtTime(hzOf(m), n, 0.03); o2.frequency.setTargetAtTime(hzOf(m), n, 0.03); },
      stop: function () { var n = ac.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(0, n + 0.08); o1.stop(n + 0.1); o2.stop(n + 0.1); }
    };
  }

  var api = { LOW: LOW, HIGH: HIGH, FINGERINGS: FINGERINGS, TRIGGER: TRIGGER, F_SERIES: F_SERIES, READINGS: READINGS, TIPS: TIPS, SHORT: SHORT,
    lookup: lookup, name: name, both: function (m) { return name(m); }, written: written, partialOf: partialOf, hzOf: hzOf, drawn: drawn, posAtX: posAtX, tipAt: tipAt,
    diagram: diagram, tone: tone, holdTone: holdTone };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.TromboneChart = api;
})(typeof window !== "undefined" ? window : globalThis);
