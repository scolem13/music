// diagrams.js — fingering charts for lesson pages (LessonDiagrams), drawn the way the Chord Sheet draws
// its superimposed view: one colour per chord over a single fretboard or keyboard, a split dot where
// chords share a spot, a dark ring (fretboard) or a filled square (keyboard) for the root. Given one
// chord it is that chord's own diagram, so a page draws both kinds with the same call.
// The page decides the notes; nothing here knows about voicings.
//
//   LessonDiagrams.fretboard(chords, o) -> <svg>
//        chords [{ label, notes:[{ string, fret, text, root?, soft? }] }]
//               string counts from the lowest (0); fret 0 = open; text = what to write on the dot;
//               soft = drawn hollow (a note that is there to be understood, or is optional)
//        o { strings:["E","A","D","G"], frets:[lo, hi] (the frets to show; default = the notes'),
//            colors:[index per chord] (default 0, 1, 2 ...), onPlay(chord, index) (a click on a label) }
//            rows:{ fret: label } (what to write beside each fret in place of its number: a violin's finger names),
//            rowHead (the word over those labels; default "fret"), fretless:true (no fret lines: positions only)
//            barres:[{ fret, from, to }] (one finger laid across strings from..to at that fret, drawn as a bar under the dots)
//   LessonDiagrams.tab(notes, o) -> <svg>   tablature of a run of single notes, left to right
//        notes [{ string, fret }]; o { strings:["E","A","D","G"] (low to high; the top line is the highest string) }
//   LessonDiagrams.keyboard(chords, o) -> <svg>
//        chords [{ label, notes:[{ midi, text, root?, soft?, hand?: "L" | "R" }] }]   one lane per chord
//        o { range:[lowest midi, highest midi] (default = the notes'), colors, onPlay }
//   LessonDiagrams.bendboard(spec, o) -> <svg>   a guitar string bend: the neck, a cents gauge and a pitch-over-time trace
//        spec { strings:["E","A","D","G","B","E"] (low to high; the highest is drawn on top, as in tab), frets:[4, 10] (the window),
//               box:[{ string, fret, text?, root? }] (grey dots: the scale box),
//               bend:{ string, fret, amount (cents; 100 = one fret), text? (written in the ghost dot), dir?: "up"|"down" (default:
//                      the three thin strings go up toward the high strings, the three thick ones down), label? (default from amount) },
//               shape:"bend" | "bendrelease" | "prebend" | "vibrato" (what the trace shows as the target),
//               startCents: cents of the starting note above the root (puts the blue-note zones on the gauge and the trace),
//               zones:[{ from, to, label }] (cents above the root; default 316-350 "blue third" and 575-591 "blue 5") }
//        o { cents: the bend to draw now (default 0, or the full amount for a pre-bend) }
//        The filled dot is the finger, the hollow dashed dot the fret that sounds the target, the arrow carries 1/4, 1/2, full,
//        1 1/2, PB or R. The gauge (0-300 cents) has ticks at 100, 200, 300, blue-note zones and a needle. The trace is cents
//        against time (3.6 s) with the target shape; the player's own trace goes over it.
//        The svg has .bb: { setBend(cents), setLive([[t, cents|null], ...]), setCursor(t), centsAt(clientX, clientY),
//        dot (the element to drag), cents, amount, shape, T }. All of it moves in place, so a page can redraw at animation speed.
//   LessonDiagrams.bendShape(shape, amount) -> { f(t) (cents at second t), T, onset (when the note is struck) }
//   LessonDiagrams.BEND_SHAPES   [[shape, name], ...]
//   LessonDiagrams.COLORS      the four chord colours
//   A label carries class "ld-label" and data-chord = its index, for a page that marks the sounding chord.

(function (global) {
  var NS = "http://www.w3.org/2000/svg";
  var COLORS = ["#2b9c90", "#d6336c", "#d98a00", "#4c5fd5"];   // the Chord Sheet's SUPER_COLORS
  var INK = "#1f1f1f", LINE = "#333333", EDGE = "#b3b3b3", INLAY = "#c4c0b7", GRID = "#e3e0da";

  function el(tag, attrs, parent){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function text(parent, s, x, y, attrs){
    var a = { x: x, y: y, "text-anchor": "middle", "font-family": "Inter,system-ui,sans-serif", "font-size": 12, fill: INK }; for (var k in attrs) a[k] = attrs[k];
    var e = el("text", a, parent); e.textContent = s; return e;
  }
  function svgOf(w, h, title){
    var s = el("svg", { viewBox: "0 0 " + w + " " + h, width: w, role: "img", "aria-label": title });
    s.style.maxWidth = "100%"; s.style.height = "auto"; s.style.display = "block";
    el("rect", { x: 0, y: 0, width: w, height: h, fill: "#fff" }, s); return s;
  }
  function colorOf(o, k){ var c = o.colors ? o.colors[k] : k; return COLORS[((c | 0) % COLORS.length + COLORS.length) % COLORS.length]; }
  function label(svg, ch, k, x, y, size, col, o){
    var t = text(svg, ch.label, x, y, { "font-size": size, "font-weight": 800, "text-anchor": "end", fill: col, "class": "ld-label", "data-chord": k });
    if (o.onPlay){ t.style.cursor = "pointer"; t.addEventListener("click", function (){ o.onPlay(ch, k); }); el("title", {}, t).textContent = "Hear " + ch.label; }
    return t;
  }
  function names(chords){ return chords.map(function (c){ return c.label; }).join(", "); }
  function dotSize(s){ return s.length > 2 ? 10.5 : s.length > 1 ? 13 : 15; }

  // ---- fretboard: strings run down the page, the nut at the top ----
  function fretboard(chords, o){
    o = o || {};
    var strings = o.strings || ["E", "A", "D", "G", "B", "E"], n = strings.length, used = [];
    chords.forEach(function (c){ c.notes.forEach(function (x){ if (x.fret > 0) used.push(x.fret); }); });
    var lo = o.frets ? o.frets[0] : (used.length ? Math.min.apply(null, used) : 1), hi = o.frets ? o.frets[1] : (used.length ? Math.max.apply(null, used) : 4);
    var start = lo <= 2 ? 0 : lo, rows = Math.max(4, hi - (start === 0 ? 1 : start) + 1);
    var G = 78, SS = 40, FS = 48, rowH = 20, top = 8, openY = top + rowH * chords.length + 18, headY = openY + 20, boardW = SS * (n - 1);
    var w = G + boardW + 30, h = headY + FS * rows + 30, svg = svgOf(w, h, "Fretboard: " + names(chords));
    function sx(i){ return G + SS * i; }
    function fy(f){ return f === 0 ? openY : headY + ((start === 0 ? f : f - start + 1) - 0.5) * FS; }
    chords.forEach(function (c, k){ label(svg, c, k, G + boardW + 12, top + rowH * k + 14, 15, colorOf(o, k), o).setAttribute("text-anchor", "end"); });
    el("rect", { x: G, y: headY, width: boardW, height: FS * rows, fill: "#fff", stroke: EDGE }, svg);
    var r, i;
    for (r = 1; r <= rows; r++){
      var f = start === 0 ? r : start + r - 1, cy = headY + (r - 0.5) * FS, m = f % 12;
      if (o.rows) {}                                           // (a fingerboard without frets has no inlays)
      else if (m === 0) [0.3, 0.7].forEach(function (q){ el("circle", { cx: G + boardW * q, cy: cy, r: 6, fill: INLAY }, svg); });
      else if (m === 3 || m === 5 || m === 7 || m === 9) el("circle", { cx: G + boardW / 2, cy: cy, r: 6, fill: INLAY }, svg);
      var rl = o.rows ? (o.rows[f] || "") : String(f);
      text(svg, rl, G - 26, cy + 5, { "font-size": o.rows ? 11 : 15, "font-weight": 700, "text-anchor": "end" });
    }
    text(svg, o.rowHead || "fret", G - 26, headY - 6, { "font-size": 10, "text-anchor": "end", fill: "#777" });
    for (i = 0; i < n; i++){ el("line", { x1: sx(i), y1: headY, x2: sx(i), y2: headY + FS * rows, stroke: LINE, "stroke-width": 1.3 }, svg); text(svg, strings[i], sx(i), headY + FS * rows + 18, { "font-size": 13 }); }
    for (r = 0; r <= rows; r++) if (!o.fretless || r === 0 || r === rows) el("line", { x1: G, y1: headY + r * FS, x2: G + boardW, y2: headY + r * FS, stroke: LINE, "stroke-width": r === 0 && start === 0 ? 5 : 1.6 }, svg);
    (o.barres || []).forEach(function (b){                       // a barre: one finger across several strings
      var by = fy(b.fret), x0 = sx(Math.min(b.from, b.to)), x1 = sx(Math.max(b.from, b.to));
      el("rect", { x: x0 - 17, y: by - 12, width: x1 - x0 + 34, height: 24, rx: 12, fill: colorOf(o, 0), opacity: 0.35, "class": "ld-barre" }, svg);
    });
    // the notes: who plays each spot
    var spots = {}, order = [];
    chords.forEach(function (c, k){ c.notes.forEach(function (x){
      if (x.mute){                                              // a string marked with an X above the nut: damped on purpose
        var mx = sx(x.string), my = openY, d = 7;
        el("line", { x1: mx - d, y1: my - d, x2: mx + d, y2: my + d, stroke: "#c0392b", "stroke-width": 3, "stroke-linecap": "round" }, svg);
        el("line", { x1: mx - d, y1: my + d, x2: mx + d, y2: my - d, stroke: "#c0392b", "stroke-width": 3, "stroke-linecap": "round" }, svg); return; }
      if (x.fret !== 0 && (x.fret < (start === 0 ? 1 : start) || x.fret > (start === 0 ? rows : start + rows - 1))) return;
      var key = x.string + ":" + x.fret; if (!spots[key]){ spots[key] = { string: x.string, fret: x.fret, by: [] }; order.push(key); }
      spots[key].by.push({ k: k, x: x }); }); });
    order.forEach(function (key){
      var sp = spots[key], cx = sx(sp.string), cy = fy(sp.fret), m = sp.by.length, open = sp.fret === 0, R = open ? 10 : m > 1 ? 18 : 16;
      var soft = sp.by.every(function (b){ return b.x.soft; }), root = sp.by.some(function (b){ return b.x.root; });
      if (m === 1) el("circle", { cx: cx, cy: cy, r: R, fill: soft ? "#fff" : colorOf(o, sp.by[0].k), stroke: colorOf(o, sp.by[0].k), "stroke-width": 2 }, svg);
      else sp.by.forEach(function (b, q){
        var a0 = -Math.PI / 2 + 2 * Math.PI * q / m, a1 = -Math.PI / 2 + 2 * Math.PI * (q + 1) / m, col = colorOf(o, b.k);
        el("path", { d: "M" + cx + "," + cy + " L" + (cx + R * Math.cos(a0)) + "," + (cy + R * Math.sin(a0)) + " A" + R + "," + R + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + (cx + R * Math.cos(a1)) + "," + (cy + R * Math.sin(a1)) + " Z",
          fill: b.x.soft ? "#fff" : col, stroke: col, "stroke-width": 1.5 }, svg);
      });
      if (root) el("circle", { cx: cx, cy: cy, r: R + 2.5, fill: "none", stroke: "#111", "stroke-width": 3 }, svg);
      var each = sp.by.map(function (b){ return b.x.text || ""; }), same = each.every(function (t){ return t === each[0]; });
      if (same || open){ if (each[0]) text(svg, each[0], cx, cy + (open ? 3.5 : 5), { "font-size": open ? 9.5 : dotSize(each[0]), "font-weight": 800, fill: soft ? colorOf(o, sp.by[0].k) : "#fff" }); }
      else each.forEach(function (t, q){
        if (!t) return; var mid = -Math.PI / 2 + 2 * Math.PI * (q + 0.5) / m, rr = m === 2 ? R * 0.5 : R * 0.58, b = sp.by[q];
        text(svg, t, cx + rr * Math.cos(mid), cy + rr * Math.sin(mid) + 3.5, { "font-size": t.length > 1 ? 8.5 : 11, "font-weight": 800, fill: b.x.soft ? colorOf(o, b.k) : "#fff" });
      });
    });
    return svg;
  }

  // ---- tablature: one line a string, the highest on top, a fret number for every note ----
  function tab(notes, o){
    o = o || {}; var strings = o.strings || ["E", "A", "D", "G", "B", "E"], n = strings.length, GAP = 13, STEP = 26, left = 46, top = 10;
    var w = left + STEP * notes.length + 14, h = top + GAP * (n - 1) + 14, svg = svgOf(w, h, "Tablature");
    function y(s){ return top + GAP * (n - 1 - s); }
    for (var s = 0; s < n; s++){ el("line", { x1: left - 14, y1: y(s), x2: w - 6, y2: y(s), stroke: "#888" }, svg); text(svg, strings[s], 26, y(s) + 4, { "font-size": 10, fill: "#555" }); }
    el("line", { x1: left - 14, y1: y(n - 1), x2: left - 14, y2: y(0), stroke: LINE, "stroke-width": 2 }, svg); el("line", { x1: w - 6, y1: y(n - 1), x2: w - 6, y2: y(0), stroke: LINE, "stroke-width": 2 }, svg);
    text(svg, "TAB", 10, top + GAP * (n - 1) / 2 + 4, { "font-size": 9, "font-weight": 800, fill: "#555" });
    notes.forEach(function (nt, i){ var x = left + STEP * i + 6, t = String(nt.fret);
      el("rect", { x: x - 7, y: y(nt.string) - 7, width: 14, height: 14, fill: "#fff" }, svg); text(svg, t, x, y(nt.string) + 4.5, { "font-size": 12.5, "font-weight": 700 }); });
    return svg;
  }

  // ---- keyboard: one lane per chord above the keys ----
  var BLACK = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };
  function keyboard(chords, o){
    o = o || {};
    var all = []; chords.forEach(function (c){ c.notes.forEach(function (x){ all.push(x.midi); }); });
    var lo = o.range ? o.range[0] : (all.length ? Math.min.apply(null, all) : 48), hi = o.range ? o.range[1] : (all.length ? Math.max.apply(null, all) : 72);
    lo = Math.floor((lo - 1) / 12) * 12; hi = Math.ceil((hi + 2) / 12) * 12 - 1;            // whole octaves, C to B
    var whites = [], wx = {}, m; for (m = lo; m <= hi; m++) if (!BLACK[m % 12]) whites.push(m);
    var G = 84, WW = Math.max(18, Math.min(30, Math.floor(700 / whites.length))), LH = 46, top = 6, KH = 84, kbY = top + LH * chords.length + 6;
    var w = G + WW * whites.length + 8, h = kbY + KH + 6, svg = svgOf(w, h, "Keyboard: " + names(chords));
    whites.forEach(function (mm, i){ wx[mm] = G + WW * i + WW / 2; });
    function xOf(mm){ return BLACK[mm % 12] ? wx[mm - 1] + WW / 2 : wx[mm]; }
    chords.forEach(function (c, k){
      var y = top + LH * k, cy = y + LH / 2, col = colorOf(o, k);
      el("rect", { x: G, y: y, width: WW * whites.length, height: LH, fill: col, opacity: 0.07 }, svg);
      el("line", { x1: 0, y1: y + LH, x2: w, y2: y + LH, stroke: GRID }, svg);
      label(svg, c, k, G - 10, cy + 6, c.label.length > 6 ? 14 : 17, col, o);
      ["L", "R", undefined].forEach(function (hand){                     // a grey band joins the notes of one hand
        var xs = c.notes.filter(function (x){ return x.hand === hand && !x.soft; }).map(function (x){ return xOf(x.midi); });
        if (xs.length > 1) el("rect", { x: Math.min.apply(null, xs), y: cy - 3, width: Math.max.apply(null, xs) - Math.min.apply(null, xs), height: 6, fill: hand === "L" ? "#c9a3a0" : "#9aa3b2", opacity: 0.6 }, svg);
      });
    });
    whites.forEach(function (mm, i){ if (i) el("line", { x1: G + WW * i, y1: top, x2: G + WW * i, y2: kbY, stroke: GRID }, svg); });
    chords.forEach(function (c, k){
      var cy = top + LH * k + LH / 2, col = colorOf(o, k);
      c.notes.forEach(function (x){
        // black-key notes sit in the upper half of the lane and white-key notes in the lower, so neighbours a half step apart never overlap
        var cx = xOf(x.midi), black = BLACK[x.midi % 12], sz = 18, t = x.text || "", fill = x.soft ? "#fff" : x.root ? col : "#fff", ny = cy + (black ? -10 : 10);
        el("rect", { x: cx - sz / 2, y: ny - sz / 2, width: sz, height: sz, rx: 3, fill: fill, stroke: col, "stroke-width": black ? 3 : 2, "stroke-dasharray": x.soft ? "3 2" : "none" }, svg);
        if (t) text(svg, t, cx, ny + 4, { "font-size": t.length > 2 ? 8.5 : t.length > 1 ? 10 : 12.5, "font-weight": 800, fill: x.root && !x.soft ? "#fff" : "#222" });
      });
    });
    whites.forEach(function (mm, i){
      el("rect", { x: G + WW * i, y: kbY, width: WW, height: KH, fill: "#fff", stroke: LINE, "stroke-width": 1.2 }, svg);
      if (mm % 12 === 0) text(svg, "C", G + WW * i + WW / 2, kbY + KH - 7, mm === 60 ? { "font-size": 12, "font-weight": 800, fill: COLORS[0] } : { "font-size": 10, fill: "#555" });   // middle C stands out
    });
    for (m = lo; m <= hi; m++) if (BLACK[m % 12]) el("rect", { x: wx[m - 1] + WW / 2 - WW * 0.3, y: kbY, width: WW * 0.6, height: KH * 0.62, fill: "#1a1a1a", stroke: LINE }, svg);
    return svg;
  }

  // ---- bendboard: the neck runs left to right, the highest string on top; a gauge and a trace go with it ----
  var BEND_T = 3.6, BEND_SHAPES = [["bend", "Bend"], ["bendrelease", "Bend and release"], ["prebend", "Pre-bend and release"], ["vibrato", "Bend with vibrato"]];
  var BEND_ZONES = [{ from: 316, to: 350, label: "blue third" }, { from: 575, to: 591, label: "blue ♭5" }];
  function ease(x){ x = Math.max(0, Math.min(1, x)); return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  // The target pitch over time, in cents above the starting note. Vibrato wobbles from the target down by up to 30 cents, never above it.
  function bendShape(shape, amount){
    var A = amount, f, onset = 0;
    if (shape === "bendrelease") f = function (t){ return A * (ease((t - 0.4) / 0.8) - ease((t - 2.0) / 0.8)); };
    else if (shape === "prebend"){ onset = 0.3; f = function (t){ return A * (1 - ease((t - 2.0) / 0.8)); }; }
    else if (shape === "vibrato") f = function (t){ return A * ease((t - 0.4) / 0.8) - (t > 1.4 ? 30 * ease((t - 1.4) / 0.3) * (0.5 - 0.5 * Math.cos(2 * Math.PI * 5.5 * (t - 1.4))) : 0); };
    else f = function (t){ return A * ease((t - 0.4) / 0.8); };
    return { f: f, T: BEND_T, onset: onset };
  }
  function bendLabel(amount, shape){
    var base = amount <= 60 ? "¼" : amount <= 120 ? "½" : amount <= 220 ? "full" : "1½";
    return shape === "prebend" ? "PB" : shape === "bendrelease" ? base + " R" : base;
  }
  function bendboard(spec, o){
    o = o || {};
    var strings = spec.strings || ["E", "A", "D", "G", "B", "E"], n = strings.length, fr = spec.frets || [4, 10], lo = fr[0], hi = fr[1], cols = hi - lo + 1;
    var b = spec.bend || { string: 3, fret: 7, amount: 200 }, A = b.amount, shape = spec.shape || "bend", sh = bendShape(shape, A);
    var FW = 66, SG = 34, X0 = 54, Y0 = 70, neckW = FW * cols, neckH = SG * (n - 1), R = 12, maxDef = 0.85 * SG;
    var GX = X0 + neckW + 46, gT = Y0 - 24, gB = Y0 + neckH + 24, GMAX = 330;
    var TY0 = Y0 + neckH + 74, TH = 118, w = GX + 24 + 122, h = TY0 + TH + 30;
    var svg = svgOf(w, h, "Bendboard: string " + (n - b.string) + ", fret " + b.fret + ", a " + bendLabel(A, shape) + " bend");
    var dir = b.dir ? (b.dir === "up" ? -1 : 1) : (b.string >= n / 2 ? -1 : 1);   // screen y: up is negative
    function yOf(s){ return Y0 + (n - 1 - s) * SG; }
    function xFret(f){ return X0 + (f - lo + 0.5) * FW; }
    var yS = yOf(b.string), xD = xFret(b.fret), xT = xFret(b.fret + A / 100);
    function gy(g){ return gB - g / GMAX * (gB - gT); }
    function ty(g){ return TY0 + TH - Math.max(-30, Math.min(GMAX, g)) / GMAX * TH; }
    // the zones, in cents above the starting note
    var sc = spec.startCents, zones = [];
    if (sc != null) (spec.zones || BEND_ZONES).forEach(function (z){
      var a = z.from - sc, e = z.to - sc; if (e < 0 || a > 300) return; zones.push({ a: Math.max(0, a), e: Math.min(300, e), label: z.label });
    });
    // the board
    el("rect", { x: X0, y: Y0 - 14, width: neckW, height: neckH + 28, fill: "#faf6ee", stroke: EDGE }, svg);
    var i, f;
    for (i = 0; i <= cols; i++) el("line", { x1: X0 + i * FW, y1: Y0 - 14, x2: X0 + i * FW, y2: Y0 + neckH + 14, stroke: i === 0 && lo <= 1 ? LINE : "#a9a59b", "stroke-width": i === 0 && lo <= 1 ? 5 : 1.6 }, svg);
    for (f = lo; f <= hi; f++){
      var cx = xFret(f), m = f % 12;
      if (m === 3 || m === 5 || m === 7 || m === 9) el("circle", { cx: cx, cy: Y0 + neckH / 2, r: 5, fill: INLAY, opacity: 0.6 }, svg);
      else if (m === 0) [0.25, 0.75].forEach(function (q){ el("circle", { cx: cx, cy: Y0 + neckH * q, r: 5, fill: INLAY, opacity: 0.6 }, svg); });
      text(svg, String(f), cx, Y0 + neckH + 38, { "font-size": 13, "font-weight": 700 });
    }
    text(svg, "fret", X0 - 8, Y0 + neckH + 38, { "font-size": 10, "text-anchor": "end", fill: "#777" });
    for (i = 0; i < n; i++){
      el("line", { x1: X0, y1: yOf(i), x2: X0 + neckW, y2: yOf(i), stroke: i === b.string ? "#c9c5bb" : "#777", "stroke-width": 1 + (n - 1 - i) * 0.35 }, svg);
      text(svg, strings[i], X0 - 24, yOf(i) + 4.5, { "font-size": 13, "font-weight": 700 });
    }
    // the box: grey dots
    (spec.box || []).forEach(function (x){
      if (x.fret < lo || x.fret > hi || (x.string === b.string && x.fret === b.fret)) return;
      el("circle", { cx: xFret(x.fret), cy: yOf(x.string), r: R, fill: "#b9bcc2", stroke: x.root ? "#222" : "#9aa0a8", "stroke-width": x.root ? 2.5 : 1 }, svg);
      if (x.text) text(svg, x.text, xFret(x.fret), yOf(x.string) + 4, { "font-size": 11, "font-weight": 700, fill: "#333" });
    });
    // the ghost: the fret that sounds the target
    var bbox = {};
    var ghost = el("circle", { cx: xT, cy: yS, r: R, fill: "#fff", "fill-opacity": 0.85, stroke: COLORS[1], "stroke-width": 2.2, "stroke-dasharray": "4 3", "class": "bb-ghost" }, svg);
    if (b.text) text(svg, b.text, xT, yS + 4, { "font-size": 11, "font-weight": 800, fill: COLORS[1] });
    var bent = el("path", { d: "", fill: "none", stroke: "#222", "stroke-width": 1 + (n - 1 - b.string) * 0.35 + 0.6, "stroke-linecap": "round", "class": "bb-string" }, svg);
    var arrow = el("path", { d: "", fill: "none", stroke: COLORS[1], "stroke-width": 2, "class": "bb-arrow" }, svg);
    var head = el("polygon", { points: "", fill: COLORS[1] }, svg);
    var pill = el("rect", { x: 0, y: 0, width: 10, height: 18, rx: 9, fill: "#fff", stroke: COLORS[1], "stroke-width": 1.4 }, svg);
    var lab = text(svg, b.label || bendLabel(A, shape), 0, 0, { "font-size": 12.5, "font-weight": 800, fill: COLORS[1], "class": "bb-label" });
    var pillW = 14 + (b.label || bendLabel(A, shape)).length * 7.5;
    pill.setAttribute("width", pillW);
    var hit = el("circle", { cx: xD, cy: yS, r: 21, fill: "transparent", "class": "bb-hit" }, svg);
    var dot = el("circle", { cx: xD, cy: yS, r: R + 1, fill: COLORS[1], stroke: "#7a1138", "stroke-width": 1.5, "class": "bb-dot" }, svg);
    hit.style.cursor = dot.style.cursor = "ns-resize";
    // the gauge
    text(svg, "bend", GX + 11, gT - 12, { "font-size": 11, fill: "#666" });
    el("rect", { x: GX, y: gT, width: 22, height: gB - gT, fill: "#fff", stroke: EDGE }, svg);
    zones.forEach(function (z){
      el("rect", { x: GX, y: gy(z.e), width: 22, height: Math.max(3, gy(z.a) - gy(z.e)), fill: "#2f6fd6", opacity: 0.32, "class": "bb-zone" }, svg);
      text(svg, z.label, GX + 28, (gy(z.a) + gy(z.e)) / 2 + 4, { "font-size": 10.5, "text-anchor": "start", fill: "#2f6fd6", "font-weight": 700 });
    });
    [0, 100, 200, 300].forEach(function (g){
      el("line", { x1: GX - 4, y1: gy(g), x2: GX + 22, y2: gy(g), stroke: "#666" }, svg);
      text(svg, g === 0 ? "0" : String(g), GX - 15, gy(g) + 4, { "font-size": 10.5, "text-anchor": "end", fill: "#555" });
    });
    text(svg, "¢", GX - 15, gy(300) - 11, { "font-size": 10, "text-anchor": "end", fill: "#777" });
    el("line", { x1: GX - 2, y1: gy(A), x2: GX + 24, y2: gy(A), stroke: COLORS[1], "stroke-width": 2, "stroke-dasharray": "3 2" }, svg);
    text(svg, "target " + Math.round(A), GX + 28, gy(A) + 15, { "font-size": 10.5, "text-anchor": "start", fill: COLORS[1], "font-weight": 700 });
    var needle = el("polygon", { points: "", fill: "#111", "class": "bb-needle" }, svg);
    var needleLine = el("line", { x1: GX, x2: GX + 22, y1: 0, y2: 0, stroke: "#111", "stroke-width": 2.5 }, svg);
    var needleText = text(svg, "", GX + 28, 0, { "font-size": 12, "text-anchor": "start", "font-weight": 800 });
    // the trace
    text(svg, "pitch over time", X0, TY0 - 12, { "font-size": 11, "text-anchor": "start", fill: "#666" });
    el("rect", { x: X0, y: TY0, width: neckW, height: TH, fill: "#fff", stroke: EDGE }, svg);
    zones.forEach(function (z){ el("rect", { x: X0, y: ty(z.e), width: neckW, height: Math.max(3, ty(z.a) - ty(z.e)), fill: "#2f6fd6", opacity: 0.16 }, svg); });
    [0, 100, 200, 300].forEach(function (g){
      el("line", { x1: X0, y1: ty(g), x2: X0 + neckW, y2: ty(g), stroke: GRID }, svg);
      text(svg, String(g), X0 - 7, ty(g) + 4, { "font-size": 10.5, "text-anchor": "end", fill: "#555" });
    });
    [0, 1, 2, 3].forEach(function (t){ text(svg, t + " s", X0 + t / BEND_T * neckW, TY0 + TH + 16, { "font-size": 10.5, fill: "#555" }); });
    function tx(t){ return X0 + t / BEND_T * neckW; }
    function polyline(fn, t0, t1){ var d = "", k, N = 160; for (k = 0; k <= N; k++){ var t = t0 + (t1 - t0) * k / N; d += (k ? "L" : "M") + tx(t).toFixed(1) + "," + ty(fn(t)).toFixed(1); } return d; }
    if (sh.onset) el("path", { d: polyline(sh.f, 0, sh.onset), fill: "none", stroke: "#9aa", "stroke-width": 2, "stroke-dasharray": "3 3" }, svg);   // the pre-bend: bent before the pick
    el("path", { d: polyline(sh.f, sh.onset, BEND_T), fill: "none", stroke: "#444", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.85, "class": "bb-target" }, svg);
    var live = el("path", { d: "", fill: "none", stroke: "#e07a1f", "stroke-width": 2.4, "stroke-linejoin": "round", "class": "bb-live" }, svg);
    var cursor = el("line", { x1: 0, x2: 0, y1: TY0, y2: TY0 + TH, stroke: "#e07a1f", "stroke-width": 1.2, opacity: 0 }, svg);
    var C = 0;
    function setBend(c){
      c = Math.max(0, Math.min(300, c)); C = c;
      var dy = dir * c / 300 * maxDef, yd = yS + dy, xl = X0, xr = X0 + neckW, sw = 0;
      dot.setAttribute("cx", xD); dot.setAttribute("cy", yd); hit.setAttribute("cy", yd);
      bent.setAttribute("d", "M" + xl + "," + yS + " Q" + (xl + (xD - xl) * 0.7) + "," + (yS + dy * 0.12) + " " + xD + "," + yd + " Q" + (xD + (xr - xD) * 0.3) + "," + (yS + dy * 0.12) + " " + xr + "," + yS);
      // the arrow arcs over the dots, as in tab
      var x0 = xD + 4, y0 = yd - R - 2, x1 = xT - 2, y1 = yS - R - 3, cxq = (x0 + x1) / 2, cyq = Math.min(y0, y1) - 26;
      arrow.setAttribute("d", "M" + x0 + "," + y0 + " Q" + cxq + "," + cyq + " " + x1 + "," + y1);
      var tx_ = x1 - cxq, ty_ = y1 - cyq, L = Math.sqrt(tx_ * tx_ + ty_ * ty_) || 1; tx_ /= L; ty_ /= L;
      head.setAttribute("points", [x1, y1, x1 - 10 * tx_ + 4.5 * ty_, y1 - 10 * ty_ - 4.5 * tx_, x1 - 10 * tx_ - 4.5 * ty_, y1 - 10 * ty_ + 4.5 * tx_].map(function (v){ return v.toFixed(1); }).join(" "));
      var ay = 0.25 * y0 + 0.5 * cyq + 0.25 * y1, ax = cxq;
      pill.setAttribute("x", ax - pillW / 2); pill.setAttribute("y", ay - 11); lab.setAttribute("x", ax); lab.setAttribute("y", ay + 4);
      var ny = gy(c);
      needle.setAttribute("points", (GX - 1) + "," + ny + " " + (GX - 11) + "," + (ny - 5) + " " + (GX - 11) + "," + (ny + 5));
      needleLine.setAttribute("y1", ny); needleLine.setAttribute("y2", ny);
      needleText.setAttribute("y", ny - 5); needleText.setAttribute("x", GX + 28);
      needleText.textContent = Math.round(c) + "¢";
      bb.cents = c;
    }
    var bb = { cents: 0, amount: A, shape: shape, T: BEND_T, dot: dot, hit: hit,
      setBend: setBend,
      setLive: function (pts){
        var d = "", pen = false; (pts || []).forEach(function (p){ if (p[1] == null){ pen = false; return; } d += (pen ? "L" : "M") + tx(Math.min(BEND_T, p[0])).toFixed(1) + "," + ty(p[1]).toFixed(1); pen = true; });
        live.setAttribute("d", d);
      },
      setCursor: function (t){ if (t == null){ cursor.setAttribute("opacity", 0); return; } cursor.setAttribute("x1", tx(t)); cursor.setAttribute("x2", tx(t)); cursor.setAttribute("opacity", 0.8); },
      // cents for a pointer position: how far the dot is pulled toward the neighbouring string
      centsAt: function (clientX, clientY){
        var p = svg.createSVGPoint(); p.x = clientX; p.y = clientY; var m = svg.getScreenCTM(); if (!m) return C; p = p.matrixTransform(m.inverse());
        return Math.max(0, Math.min(300, dir * (p.y - yS) / maxDef * 300));
      } };
    svg.bb = bb; setBend(o.cents != null ? o.cents : (shape === "prebend" ? A : 0));
    return svg;
  }

  global.LessonDiagrams = { fretboard: fretboard, keyboard: keyboard, tab: tab, bendboard: bendboard, bendShape: bendShape, BEND_SHAPES: BEND_SHAPES, COLORS: COLORS.slice() };
})(typeof window !== "undefined" ? window : globalThis);
