// pcset.js - the maths behind the post-tonal theory pages (chapters 32-35 of Hutchinson, Music Theory for the 21st-Century
// Classroom): pitch-class sets, twelve-tone rows, scale collections, planing, phasing. Pure functions, no DOM, no sound:
// runs in the page (global PCSet) and in node (tests/post-tonal/*.test.js). The widgets are pt-widgets.js.
//
// Pitch-class integers 0-11 (C = 0), T = 10, E = 11 when written as a string. Conventions (the book's, Rahn's, not Forte's):
//   normalForm(pcs)  the most compact rotation of the ascending set: smallest span first, then smallest first-to-next-to-last
//                    interval, and so on inwards (packed "to the left"), then the lower first note.
//   primeForm(pcs)   the more compact of the normal form and the normal form of the inversion, both moved to start on 0.
//                    This is Rahn's rule; Forte's own prime form differs for six classes (5-20, 6-Z29, 6-31, 7-Z18, 7-20, 8-26).
//   intervalVector   six counts of interval classes 1-6 over all pairs (ic 6 counted once per tritone pair).
//   forte(pcs)       { name: "3-11", prime, vector, z } from FORTE_DATA (3-9 notes) plus the small and large sets.
//   Tn(x) = x + n; TnI(x) = n - x (invert, then transpose: the book's T_nI; Straus writes I_n). relate(A, B) lists the n of
//   every Tn and TnI taking A to B.
// Rows: P_n starts on n; I_n starts on n (each interval of P turned upside down); R_n is P_n backwards, so it ENDS on n; RI_n is I_n
//   backwards, also ending on n (the book numbers R and RI by their last note). matrix(row) is the 12x12 grid with P_(row[0]) across
//   the top and I_(row[0]) down the left edge; P_n reads left to right in the row that starts on n, I_n top to bottom in the column
//   that starts on n; R_n reads the P_n row right to left, RI_n the I_n column bottom to top.
// Processes: phasing (stepped, Reich's way: voice 2 moves one note ahead after `reps` cycles; or a steady drift) and additive
//   / subtractive steps of a pattern.
// ABC: noteFromMidi / abcBars write explicit accidentals, tracked per bar (a natural is written only where an earlier accidental in
//   the bar needs cancelling); spellCollection spells whole-tone, octatonic, pentatonic and the modes by letter, not by sharps.
(function (g) {
  "use strict";
  var mod = function (n) { return ((n % 12) + 12) % 12; };
  var CH = "0123456789TE";
  function str(pcs, sep) { return pcs.map(function (p) { return CH[mod(p)]; }).join(sep || ""); }
  function parse(s) {   // "0 4 7", "047", "(0,4,7)", "t e" -> [0,4,7]
    var out = [], t = String(s).toUpperCase().replace(/[\[\]\(\)]/g, "");
    if (/[\s,]/.test(t.trim())) t.split(/[\s,]+/).forEach(function (w) { if (w === "") return; out.push(w === "T" ? 10 : w === "E" ? 11 : parseInt(w, 10)); });
    else t.split("").forEach(function (c) { var i = CH.indexOf(c); if (i >= 0) out.push(i); });
    return out.filter(function (x) { return x >= 0 && x < 12 && !isNaN(x); });
  }
  function uniq(pcs) { var seen = {}, out = []; pcs.forEach(function (p) { p = mod(p); if (!seen[p]) { seen[p] = 1; out.push(p); } }); return out.sort(function (a, b) { return a - b; }); }

  // ---- normal form, prime form
  function rotations(a) { return a.map(function (_, k) { var r = []; for (var i = 0; i < a.length; i++) { var v = a[(k + i) % a.length]; r.push(v + (i && v < a[k] ? 12 : 0)); } return r; }); }
  function better(r, best) {   // is rotation r more compact than best? (both start on a note and ascend)
    var n = r.length; if (!best) return true;
    for (var j = n - 1; j >= 1; j--) { var x = r[j] - r[0], y = best[j] - best[0]; if (x !== y) return x < y; }
    return r[0] < best[0];
  }
  function normalForm(pcs) {
    var a = uniq(pcs); if (a.length < 2) return a.slice();
    var best = null; rotations(a).forEach(function (r) { if (better(r, best)) best = r; });
    return best.map(mod);
  }
  function fromZero(nf) { return nf.map(function (p) { return mod(p - nf[0]); }); }
  function invert(pcs, n) { return pcs.map(function (p) { return mod((n || 0) - p); }); }
  function transpose(pcs, n) { return pcs.map(function (p) { return mod(p + n); }); }
  function primeForm(pcs) {
    var a = uniq(pcs); if (a.length < 2) return a.length ? [0] : [];
    var p = fromZero(normalForm(a)), q = fromZero(normalForm(invert(a, 0)));
    // compare as ascending lists packed to the left, same rule as better()
    var n = p.length;
    for (var j = n - 1; j >= 1; j--) { if (p[j] !== q[j]) return p[j] < q[j] ? p : q; }
    return p;
  }
  function intervalVector(pcs) {
    var a = uniq(pcs), v = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) { var d = a[j] - a[i], ic = Math.min(d, 12 - d); v[ic - 1]++; }
    return v;
  }
  function complement(pcs) { var a = uniq(pcs); return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(function (p) { return a.indexOf(p) < 0; }); }

  // ---- Forte names
  var TABLE = null;
  function table() {
    if (TABLE) return TABLE; TABLE = { byPrime: {}, byName: {}, vecs: {} };
    var data = (g.FORTE_DATA || (typeof require !== "undefined" ? require("./forte-data.js") : []));
    function add(prime, name, vec) { var o = { prime: prime, name: name, vector: vec, z: /Z/.test(name) }; TABLE.byPrime[prime] = o; TABLE.byName[name] = o; }
    data.forEach(function (row) { var w = row.split(" "); add(w[0], w[1], w[2]); });
    add("0", "1-1", "000000");
    [["01", "2-1", "100000"], ["02", "2-2", "010000"], ["03", "2-3", "001000"], ["04", "2-4", "000100"], ["05", "2-5", "000010"], ["06", "2-6", "000001"]].forEach(function (r) { add(r[0], r[1], r[2]); });
    for (var k = 1; k <= 6; k++) { var c = primeForm(complement(parse("0" + k))); add(str(c), "10-" + k, vecStr(intervalVector(c))); }
    add("0123456789T", "11-1", vecStr(intervalVector(parse("0123456789T")))); add("0123456789TE", "12-1", vecStr(intervalVector(parse("0123456789TE"))));
    return TABLE;
  }
  function vecStr(v) { return v.map(function (x) { return x > 9 ? "ABCDEF"[x - 10] : x; }).join(""); }
  function forte(pcs) {
    var pf = primeForm(pcs), key = str(pf), t = table(), hit = t.byPrime[key], v = intervalVector(pcs);
    return { name: hit ? hit.name : null, prime: pf, vector: v, z: hit ? hit.z : false, card: pf.length };
  }
  function zMate(name) {   // the Z-related class with the same vector
    var t = table(), me = t.byName[name]; if (!me || !me.z) return null;
    var out = null; Object.keys(t.byName).forEach(function (k) { var o = t.byName[k]; if (k !== name && o.z && o.vector === me.vector && k.split("-")[0] === name.split("-")[0]) out = o; });
    return out;
  }
  function allClasses() { var t = table(); return Object.keys(t.byName).map(function (k) { return t.byName[k]; }); }
  function relate(A, B) {   // every n with Tn(A) = B, and every n with TnI(A) = B
    var a = uniq(A), b = uniq(B), out = { T: [], I: [] };
    if (a.length !== b.length) return out;
    var key = str(b);
    for (var n = 0; n < 12; n++) { if (str(uniq(transpose(a, n))) === key) out.T.push(n); if (str(uniq(invert(a, n))) === key) out.I.push(n); }
    return out;
  }
  function allInPrimeClass(prime) {   // every distinct transposition and inversion of a prime form (a set class's members)
    var seen = {}, out = [];
    for (var n = 0; n < 12; n++) [transpose(prime, n), invert(prime, n)].forEach(function (s) { s = uniq(s); var k = str(s); if (!seen[k]) { seen[k] = 1; out.push(s); } });
    return out;
  }
  function pcName(pc, pref) { return (pref === "flat" ? ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] : ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"])[mod(pc)]; }

  // ---- twelve-tone rows
  function isRow(r) { return r.length === 12 && uniq(r).length === 12; }
  function P(row, n) { var d = mod(n - row[0]); return row.map(function (p) { return mod(p + d); }); }
  function I(row, n) { var d = mod(n - row[0]); return row.map(function (p) { return mod(2 * row[0] - p + d); }); }
  function R(row, n) { return P(row, n).slice().reverse(); }
  function RI(row, n) { return I(row, n).slice().reverse(); }
  function matrix(row) { var top = row; return I(row, row[0]).map(function (x) { return P(row, x); }); }
  function rowForm(row, form, n) { return form === "P" ? P(row, n) : form === "I" ? I(row, n) : form === "R" ? R(row, n) : RI(row, n); }
  function identify(row, seq) {   // which of the 48 forms is seq? -> [{ form: "P", n: 4 }, ...] (a symmetrical row has more than one)
    var out = []; if (!isRow(seq)) return out;
    ["P", "I", "R", "RI"].forEach(function (f) { for (var n = 0; n < 12; n++) if (str(rowForm(row, f, n)) === str(seq)) out.push({ form: f, n: n }); });
    return out;
  }
  function rowIntervals(row) { var out = []; for (var i = 1; i < row.length; i++) out.push(mod(row[i] - row[i - 1])); return out; }
  function allInterval(row) { var s = {}; rowIntervals(row).forEach(function (d) { s[d] = 1; }); return Object.keys(s).length === 11; }
  function hexachords(row) { return [forte(row.slice(0, 6)), forte(row.slice(6))]; }
  function randomRow(rnd) { rnd = rnd || Math.random; var a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; for (var i = 11; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // the numbers around the matrix: P_n down the left edge and R_n down the right (n = the row's first note in the P reading),
  // I_n along the top and RI_n along the bottom
  function matrixLabels(row) { var m = matrix(row); return { left: m.map(function (r) { return r[0]; }), top: m[0].slice() }; }

  // ---- collections (scales as steps from a root, spelled by letter)
  var COLLECTIONS = [
    { id: "major", name: "Major (Ionian)", kind: "mode", semis: [0, 2, 4, 5, 7, 9, 11], letters: [0, 1, 2, 3, 4, 5, 6] },
    { id: "dorian", name: "Dorian", kind: "mode", semis: [0, 2, 3, 5, 7, 9, 10], letters: [0, 1, 2, 3, 4, 5, 6] },
    { id: "phrygian", name: "Phrygian", kind: "mode", semis: [0, 1, 3, 5, 7, 8, 10], letters: [0, 1, 2, 3, 4, 5, 6] },
    { id: "lydian", name: "Lydian", kind: "mode", semis: [0, 2, 4, 6, 7, 9, 11], letters: [0, 1, 2, 3, 4, 5, 6] },
    { id: "mixolydian", name: "Mixolydian", kind: "mode", semis: [0, 2, 4, 5, 7, 9, 10], letters: [0, 1, 2, 3, 4, 5, 6] },
    { id: "aeolian", name: "Aeolian (natural minor)", kind: "mode", semis: [0, 2, 3, 5, 7, 8, 10], letters: [0, 1, 2, 3, 4, 5, 6] },
    { id: "locrian", name: "Locrian", kind: "mode", semis: [0, 1, 3, 5, 6, 8, 10], letters: [0, 1, 2, 3, 4, 5, 6] },
    { id: "wholetone", name: "Whole-tone", kind: "symmetric", semis: [0, 2, 4, 6, 8, 10], letters: [0, 1, 2, 3, 4, 5] },
    { id: "pent-maj", name: "Major pentatonic", kind: "pentatonic", semis: [0, 2, 4, 7, 9], letters: [0, 1, 2, 4, 5] },
    { id: "pent-min", name: "Minor pentatonic", kind: "pentatonic", semis: [0, 3, 5, 7, 10], letters: [0, 2, 3, 4, 6] },
    { id: "oct-wh", name: "Octatonic (whole step first)", kind: "symmetric", semis: [0, 2, 3, 5, 6, 8, 9, 11], letters: [0, 1, 2, 3, 4, 5, 5, 6] },
    { id: "oct-hw", name: "Octatonic (half step first)", kind: "symmetric", semis: [0, 1, 3, 4, 6, 7, 9, 10], letters: [0, 1, 2, 2, 3, 4, 5, 6] }
  ];
  function collection(id) { return COLLECTIONS.filter(function (c) { return c.id === id; })[0]; }
  var LETTER_PC = [0, 2, 4, 5, 7, 9, 11], LETTER_ABC = "CDEFGAB";
  // a note = { l: 0-6 (C..B), acc: -2..2, oct: scientific octave (middle C = 4) }
  function noteMidi(n) { return LETTER_PC[n.l] + n.acc + 12 * (n.oct + 1); }
  function noteFromMidi(m, pref) {
    var pc = mod(m), oct = Math.floor(m / 12) - 1;
    var sharp = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
    var flat = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
    var t = (pref === "flat" ? flat : sharp)[pc]; return { l: t[0], acc: t[1], oct: oct };
  }
  // spell a collection upward from a root note over `octaves` octaves (default 1, ending on the upper octave root)
  function spellCollection(c, root, octaves) {
    var out = [], rootMidi = noteMidi(root);
    for (var o = 0; o < (octaves || 1); o++) c.semis.forEach(function (s, i) { out.push(spellAt(root, rootMidi, s + 12 * o, c.letters[i] + 7 * o)); });
    var top = (octaves || 1);
    out.push(spellAt(root, rootMidi, 12 * top, 7 * top));
    return out;
  }
  function spellAt(root, rootMidi, semis, letters) {
    var li = root.l + letters, l = ((li % 7) + 7) % 7, oct = root.oct + Math.floor(li / 7);
    var acc = rootMidi + semis - (LETTER_PC[l] + 12 * (oct + 1));
    return { l: l, acc: acc, oct: oct };
  }
  var ACC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
  // events: [{ notes: [note, ...] (one = a note, several = a chord, none = a rest), len: in L units }]; bars: arrays of events.
  // Returns ABC body text (bars joined by " | ", final "|]"). L: and M: are the caller's; bar sums are checked by barUnits().
  function abcBars(bars) {
    return bars.map(function (bar) {
      var state = {};   // letter+octave -> accidental in force this bar
      return bar.map(function (ev) {
        var len = ev.len === 1 ? "" : String(ev.len);
        if (!ev.notes || !ev.notes.length) return "z" + len;
        var parts = ev.notes.map(function (n) {
          var key = n.l + ":" + n.oct, cur = state[key] || 0, s = "";
          if (n.acc !== cur) s = ACC[n.acc]; state[key] = n.acc;
          var L = LETTER_ABC[n.l], o = n.oct;
          var base = o >= 5 ? L.toLowerCase() + "'".repeat(o - 5) : L + ",".repeat(Math.max(0, 4 - o));
          return s + base;
        });
        return ev.notes.length > 1 ? "[" + parts.join("") + "]" + len : parts[0] + len;
      }).join(" ");
    }).join(" | ") + " |]";
  }
  function barUnits(bars) { return bars.map(function (b) { return b.reduce(function (s, e) { return s + e.len; }, 0); }); }

  // ---- planing: a melody (list of scale-degree steps in C major's white notes, or midi for real planing) with a chord shape
  // Real planing: each melody note carries the same intervals (semitones below the top note) -> exact parallel chords.
  var SHAPES = {
    triad: { name: "Major triads (root position)", below: [4, 7] },            // top note is the fifth? (see planeReal: below = semitones under the top note)
    sixfour: { name: "Major triads, second inversion (6/4)", below: [5, 9] },
    seventh: { name: "Dominant sevenths", below: [3, 6, 10] },
    ninth: { name: "Dominant ninths", below: [4, 8, 11, 14].slice(0, 4) },
    quartal: { name: "Stacked perfect fourths", below: [5, 10] },
    quintal: { name: "Stacked perfect fifths", below: [7, 14] },
    secundal: { name: "Stacked seconds (a cluster)", below: [2, 4] }
  };
  // diatonic planing: the same shape counted in scale steps of C major (white keys); below = steps under the top note
  var DIA = { triad: [2, 4], sixfour: [3, 5], seventh: [2, 4, 6], quartal: [3, 6], quintal: [4, 8], secundal: [1, 2] };
  var WHITE = [0, 2, 4, 5, 7, 9, 11];
  function whiteMidi(step, oct0) { var o = Math.floor(step / 7), d = ((step % 7) + 7) % 7; return 12 * (oct0 + 1 + o) + WHITE[d]; }
  function planeDiatonic(melodySteps, shape, oct0) {   // melodySteps: steps above C (0 = C4 when oct0 = 4)
    return melodySteps.map(function (s) { return [s].concat((DIA[shape] || []).map(function (k) { return s - k; })).map(function (x) { return whiteMidi(x, oct0 == null ? 4 : oct0); }).sort(function (a, b) { return a - b; }); });
  }
  function planeReal(melodyMidi, shape) {
    return melodyMidi.map(function (m) { return [m].concat(SHAPES[shape].below.map(function (d) { return m - d; })).sort(function (a, b) { return a - b; }); });
  }

  // ---- whole ABC texts for the pages (and the tests: every bar is checked to add up)
  var ROOTS = [["C", 0, 0, 4], ["D♭", 1, -1, 4], ["D", 1, 0, 4], ["E♭", 2, -1, 4], ["E", 2, 0, 4], ["F", 3, 0, 4], ["F♯", 3, 1, 4], ["G", 4, 0, 4], ["A♭", 5, -1, 3], ["A", 5, 0, 3], ["B♭", 6, -1, 3], ["B", 6, 0, 3]]
    .map(function (r) { return { name: r[0], l: r[1], acc: r[2], oct: r[3] }; });
  function chunk(events, perBar) {   // events of length 1 into bars of perBar, the last padded with rests
    var bars = [], i; for (i = 0; i < events.length; i += perBar) bars.push(events.slice(i, i + perBar));
    var last = bars[bars.length - 1]; while (last.length < perBar) last.push({ notes: [], len: 1 });
    return bars;
  }
  // a collection up one octave and back down, eighth notes, 4/4 (bars padded with rests)
  function collectionAbc(id, root, qpm) {
    var c = collection(id), up = spellCollection(c, root, 1), down = up.slice(0, -1).reverse();
    var bars = chunk(up.concat(down).map(function (n) { return { notes: [n], len: 1 }; }), 8);
    return { abc: "X:1\nT:" + c.name + " on " + (root.name || "") + "\nM:4/4\nL:1/8\nQ:1/4=" + (qpm || 96) + "\nK:C\n" + abcBars(bars), bars: bars, notes: up };
  }
  var MELODIES = {
    real: [{ id: "step", name: "Stepwise line", midi: [67, 69, 71, 72, 71, 69, 67, 64] }, { id: "arch", name: "Arch", midi: [64, 67, 71, 74, 72, 69, 66, 64] }, { id: "cathedral", name: "Slow rise and fall (my own line)", midi: [62, 64, 67, 69, 67, 64, 62, 60] }],
    dia: [{ id: "step", name: "Stepwise line", steps: [9, 10, 11, 12, 11, 10, 9, 8] }, { id: "arch", name: "Arch", steps: [8, 10, 12, 13, 12, 11, 9, 8] }, { id: "cathedral", name: "Slow rise and fall (my own line)", steps: [8, 9, 11, 12, 11, 9, 8, 7] }]
  };
  // two bars of four quarter-note chords; kind "real" (exact parallel) or "dia" (the white notes: same shape counted in steps)
  function planingAbc(kind, shape, melodyId, pref, qpm) {
    var list = MELODIES[kind], m = list.filter(function (x) { return x.id === melodyId; })[0] || list[0];
    var chords = kind === "real" ? planeReal(m.midi, shape) : planeDiatonic(m.steps, shape, 4);
    var evs = chords.map(function (ch) { return { notes: ch.map(function (x) { return noteFromMidi(x, pref); }), len: 1 }; });
    var bars = chunk(evs, 4);
    return { abc: "X:1\nT:" + (kind === "real" ? "Real planing: " : "Diatonic planing: ") + shape + "\nM:4/4\nL:1/4\nQ:1/4=" + (qpm || 72) + "\nK:C\n" + abcBars(bars), bars: bars, chords: chords };
  }
  function chordAbc(midis, pref, title) {   // one whole-note chord (a polychord, a quartal chord ...)
    var bars = [[{ notes: midis.slice().sort(function (a, b) { return a - b; }).map(function (x) { return noteFromMidi(x, pref); }), len: 4 }]];
    return { abc: "X:1\nT:" + (title || "") + "\nM:4/4\nL:1/4\nK:C\n" + abcBars(bars), bars: bars };
  }
  function rowAbc(seq, pref, title) {   // a twelve-note row as quarter notes, 4/4, three bars, notes from middle C up an octave
    var bars = chunk(seq.map(function (p) { return { notes: [noteFromMidi(60 + p, pref)], len: 1 }; }), 4);
    return { abc: "X:1\nT:" + (title || "") + "\nM:4/4\nL:1/4\nQ:1/4=80\nK:C\n" + abcBars(bars), bars: bars };
  }

  // ---- processes
  function additiveSteps(pattern, mode) {   // "grow": a, ab, abc... ; "shrink": full, then one fewer from the end ; "both": grow then shrink
    var n = pattern.length, grow = [], shrink = [], k;
    for (k = 1; k <= n; k++) grow.push(pattern.slice(0, k));
    for (k = n - 1; k >= 1; k--) shrink.push(pattern.slice(0, k));
    return mode === "shrink" ? grow.slice().reverse() : mode === "both" ? grow.concat(shrink) : grow;
  }
  function additiveFromFront(pattern) {   // "subtractive from the front": abc, bc, c (the other direction of removal)
    var out = []; for (var k = 0; k < pattern.length; k++) out.push(pattern.slice(k)); return out;
  }
  // stepped phasing: voice 2's offset (in notes) after `cycles` completed cycles of the pattern when it moves one note ahead
  // every `reps` cycles. Returns offset in 0..n-1.
  function steppedOffset(n, reps, cycles) { return Math.floor(cycles / reps) % n; }
  // steady drift: voice 2 runs `ratio` times as fast (ratio > 1) as voice 1; after `t` pattern-lengths of voice 1 it is ahead by
  // t * (ratio - 1) cycles; returns the offset in notes (0..n-1, fractional)
  function driftOffset(n, ratio, t) { var cyc = t * (ratio - 1); return ((cyc % 1) + 1) % 1 * n; }
  // the time (in cycles of voice 1) for voice 2 to lap voice 1 once
  function lapCycles(ratio) { return 1 / (ratio - 1); }
  // note-step schedule for stepped phasing: for each note step k of voice 1 (0-based), voice 2 plays pattern index (k + offset) % n
  function phaseIndex(n, reps, k, voice2) { if (!voice2) return k % n; return (k + steppedOffset(n, reps, Math.floor(k / n))) % n; }

  var API = {
    mod: mod, str: str, parse: parse, uniq: uniq, normalForm: normalForm, primeForm: primeForm, intervalVector: intervalVector, vecStr: vecStr,
    complement: complement, forte: forte, zMate: zMate, allClasses: allClasses, relate: relate, allInPrimeClass: allInPrimeClass, pcName: pcName,
    transpose: transpose, invert: invert, fromZero: fromZero,
    isRow: isRow, P: P, I: I, R: R, RI: RI, matrix: matrix, rowForm: rowForm, identify: identify, rowIntervals: rowIntervals, allInterval: allInterval,
    hexachords: hexachords, randomRow: randomRow, matrixLabels: matrixLabels,
    COLLECTIONS: COLLECTIONS, collection: collection, noteMidi: noteMidi, noteFromMidi: noteFromMidi, spellCollection: spellCollection, abcBars: abcBars, barUnits: barUnits,
    SHAPES: SHAPES, DIA: DIA, planeDiatonic: planeDiatonic, planeReal: planeReal,
    ROOTS: ROOTS, collectionAbc: collectionAbc, planingAbc: planingAbc, chordAbc: chordAbc, rowAbc: rowAbc, MELODIES: MELODIES,
    additiveSteps: additiveSteps, additiveFromFront: additiveFromFront, steppedOffset: steppedOffset, driftOffset: driftOffset, lapCycles: lapCycles, phaseIndex: phaseIndex
  };
  g.PCSet = API; if (typeof module !== "undefined") module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
