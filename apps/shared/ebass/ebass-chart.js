// ebass-chart.js — the electric bass fretboard (global EBassChart): data, spelling, staff ABC and the SVG fretboard.
// Pure data + drawing; no sound (ebass-page.js plays through the band's "ebass" samples).
//
// What is READ from the source (the "Electric Bass" chapter of the instrument guide, book pp. 254-263, scan footer "W74"):
//   - four strings E A D G, thickest (E) nearest the ceiling; open-string fingerboard diagram with fret numbers 1-5;
//   - the bass is written an octave higher than it sounds, in the bass clef;
//   - the chart's fingerings: fret 1 = finger 1, 2 = 2, 3 = 3, 4 = 4 (one finger per fret, first position), and a fifth-position
//     extension for the highest notes on the chart (marked *).
// What is NOT in the source (marked unverified, rule 4):
//   - the tuning's MIDI numbers E1 A1 D2 G2 = 28 33 38 43 and the frequencies on the page (standard four-string tuning; from
//     the usual A4 = 440 Hz equal temperament, not read from the book);
//   - frets 6-12 (the book's chart stops near fret 5); there the finger advice is "same idea, shift the hand", nothing more.
//   - the number of frets on a real bass (many have 20 or more); this chart draws 12, where the pattern repeats an octave up.
//
// API
//   EBassChart.STRINGS     [{ id: 1..4, name: "G"|"D"|"A"|"E", midi }] highest string first (as drawn, as tab is written)
//   EBassChart.LOW / HIGH  lowest / highest sounding MIDI the chart draws (open E = 28, fret 12 on G = 55)
//   .midi(stringId, fret)  sounding MIDI
//   .written(m)            the note as written (an octave up)
//   .name(m, flats?)       "E1" ... for a sounding note; black keys "F♯1" (or "G♭1" with flats)
//   .pcName(pc, both?)     "F♯" or "F♯/G♭"
//   .positions(m, maxFret) [{ s: stringId, f: fret }] every place the pitch can be played, lowest string first
//   .abc(m)                ABC note for a WRITTEN midi number (bass clef, sharps)
//   .finger(f)             1-4 for frets 1-4, else null
//   .freq(m)               Hz at A4 = 440
//   .diagram(el, { frets, onPick })  draws the fretboard; returns { mark(list), clear(), names(bool), cells }
(function (g) {
  "use strict";
  var STRINGS = [
    { id: 1, name: "G", midi: 43 }, { id: 2, name: "D", midi: 38 }, { id: 3, name: "A", midi: 33 }, { id: 4, name: "E", midi: 28 }
  ];
  var SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  var FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  var FRETS = 12, LOW = 28, HIGH = 43 + FRETS;
  function byId(id) { for (var i = 0; i < 4; i++) if (STRINGS[i].id === id) return STRINGS[i]; return null; }
  function midi(sid, f) { return byId(sid).midi + f; }
  function pcName(pc, both) { var s = SHARP[pc], f = FLAT[pc]; return both && s !== f ? s + "/" + f : s; }
  function name(m, flats) { return (flats ? FLAT : SHARP)[m % 12] + (Math.floor(m / 12) - 1); }
  function positions(m, maxFret) {
    var out = [], mf = maxFret == null ? FRETS : maxFret;
    for (var i = 3; i >= 0; i--) { var s = STRINGS[i], f = m - s.midi; if (f >= 0 && f <= mf) out.push({ s: s.id, f: f }); }
    return out;
  }
  function abc(w) {   // ABC: C = 60, c = 72, C, = 48
    var pc = w % 12, oct = Math.floor(w / 12), letters = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], L = letters[pc], acc = "";
    if (L.charAt(0) === "^") { acc = "^"; L = L.charAt(1); }
    if (oct >= 6) { L = L.toLowerCase(); return acc + L + new Array(oct - 6 + 1).join("'"); }
    return acc + L + new Array(5 - oct + 1).join(",");
  }
  function finger(f) { return f >= 1 && f <= 4 ? f : null; }
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---- SVG fretboard (horizontal; G string on top as in tab, E at the bottom) ----
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  var X0 = 72, FW = 64, Y0 = 34, YG = 36, W = X0 + FRETS * FW + 20, H = Y0 + 3 * YG + 58;
  function diagram(host, opts) {
    opts = opts || {};
    var wrap = document.createElement("div"); wrap.className = "ebc-wrap"; host.appendChild(wrap);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "ebc", role: "img", "aria-label": "Electric bass fretboard, frets 0 to " + FRETS }, null); wrap.appendChild(svg);
    el("rect", { x: X0, y: Y0 - 16, width: FRETS * FW, height: 3 * YG + 32, class: "ebc-board" }, svg);
    for (var f = 0; f <= FRETS; f++) el("line", { x1: X0 + f * FW, x2: X0 + f * FW, y1: Y0 - 16, y2: Y0 + 3 * YG + 16, class: f === 0 ? "ebc-nut" : "ebc-fret" }, svg);
    [3, 5, 7, 9, 12].forEach(function (fr) {
      var cx = X0 + (fr - 0.5) * FW;
      if (fr === 12) { el("circle", { cx: cx, cy: Y0 + 0.5 * YG, r: 5, class: "ebc-inlay" }, svg); el("circle", { cx: cx, cy: Y0 + 2.5 * YG, r: 5, class: "ebc-inlay" }, svg); }
      else el("circle", { cx: cx, cy: Y0 + 1.5 * YG, r: 5, class: "ebc-inlay" }, svg);
    });
    STRINGS.forEach(function (s, i) {
      var y = Y0 + i * YG;
      el("line", { x1: 30, x2: X0 + FRETS * FW, y1: y, y2: y, class: "ebc-str", "stroke-width": 1 + i * 0.7 }, svg);
      var t = el("text", { x: 12, y: y + 5, class: "ebc-sname" }, svg); t.textContent = s.name;
    });
    for (var n = 1; n <= FRETS; n++) { var tx = el("text", { x: X0 + (n - 0.5) * FW, y: Y0 + 3 * YG + 40, class: "ebc-fnum" }, svg); tx.textContent = n; }
    var t0 = el("text", { x: 44, y: Y0 + 3 * YG + 40, class: "ebc-fnum" }, svg); t0.textContent = "open";
    var cells = {}, dots = {}, showNames = false, marks = [];
    function cx(f) { return f === 0 ? 44 : X0 + (f - 0.5) * FW; }
    STRINGS.forEach(function (s, i) {
      for (var fr = 0; fr <= FRETS; fr++) {
        var key = s.id + ":" + fr, y = Y0 + i * YG;
        var gEl = el("g", { class: "ebc-cell", "data-s": s.id, "data-f": fr, tabindex: 0, role: "button", "aria-label": name(s.midi + fr) + ", string " + s.name + " fret " + fr }, svg);
        el("rect", { x: fr === 0 ? 16 : X0 + (fr - 1) * FW, y: y - YG / 2, width: fr === 0 ? 56 : FW, height: YG, class: "ebc-hit" }, gEl);
        var c = el("circle", { cx: cx(fr), cy: y, r: 13, class: "ebc-dot" }, gEl), tt = el("text", { x: cx(fr), y: y + 4, class: "ebc-dtext" }, gEl);
        cells[key] = gEl; dots[key] = { c: c, t: tt, midi: s.midi + fr };
        (function (sid, fret, m, node) {
          function pick() { if (opts.onPick) opts.onPick(sid, fret, m); }
          node.addEventListener("click", pick);
          node.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
        })(s.id, fr, s.midi + fr, gEl);
      }
    });
    function paint() {
      Object.keys(dots).forEach(function (k) {
        var d = dots[k]; d.c.setAttribute("class", "ebc-dot"); d.t.textContent = showNames ? SHARP[d.midi % 12] : "";
        if (showNames) d.c.classList.add("ebc-faint");
      });
      marks.forEach(function (m) {
        var d = dots[m.s + ":" + m.f]; if (!d) return;
        d.c.setAttribute("class", "ebc-dot ebc-on " + (m.cls || "")); if (m.text != null) d.t.textContent = m.text;
      });
    }
    paint();
    return {
      el: svg, cells: cells,
      mark: function (list) { marks = list || []; paint(); },
      clear: function () { marks = []; paint(); },
      names: function (b) { showNames = !!b; paint(); }
    };
  }

  var api = { STRINGS: STRINGS, LOW: LOW, HIGH: HIGH, FRETS: FRETS, midi: midi, written: function (m) { return m + 12; }, name: name, pcName: pcName,
    positions: positions, abc: abc, finger: finger, freq: freq, diagram: diagram, SHARP: SHARP, FLAT: FLAT };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else g.EBassChart = api;
})(typeof window !== "undefined" ? window : globalThis);
