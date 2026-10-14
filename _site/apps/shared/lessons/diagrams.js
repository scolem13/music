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

  global.LessonDiagrams = { fretboard: fretboard, keyboard: keyboard, tab: tab, COLORS: COLORS.slice() };
})(typeof window !== "undefined" ? window : globalThis);
