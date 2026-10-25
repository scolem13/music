// style-engine.js: the rules behind the Style Arranger (tools/arranger.qmd), after Yamaha's arranger keyboards (PSR, Tyros,
// Genos). No audio and no page: chord recognition from the held keys, and the conversion of a pattern written over one
// chord (the source chord, CM7 by default) to the chord being played. Runs in Node for the tests.
//
//   StyleEngine.recognize(midis, mode, prev) -> { root, type, bass, name } | null      mode: "fingered" | "single" | "multi" | "onbass"
//   StyleEngine.convert(midi, ch, src, chord, group) -> MIDI | null                   one written note to the sounding note
//       ch:  { ntr: "trans" | "fixed", ntt: "bypass" | "melody" | "chord" | "melodicMinor" | "harmonicMinor" | "naturalMinor" | "dorian"
//              (+ "5th" variants: "melodicMinor5" …), highKey: 0..11, lo, hi (note limit), nttBass: bool }
//       src: { root: 0, type: "M7" }    chord: from recognize()    group: the written notes sounding with it (Root Fixed)
//   StyleEngine.convertPhrase(notes, ch, src, chord) -> notes with .midi converted (chord groups kept together)
//   StyleEngine.chordName({ root, type, bass }) -> "Am7", "C/E"
//   StyleEngine.TYPES: chord types { id: { name, tones: [4 slots], scale: [7 degrees], third: "maj" | "min" | "none", fifth } }
//
// From Yamaha's manuals (scripts/sources/arranger.py):
//   Genos Reference Manual pp. 23, 28–30: the source pattern is recorded over CM7 (Bass and Phrase channels use only the
//   CM7 scale tones C D E G A B, Chord and Pad channels only its chord tones C E G B). NTR Root Trans keeps the intervals
//   (C3 E3 G3 over F become F3 A3 C4); Root Fixed keeps notes close to their range (C3 E3 G3 become C3 F3 A3). NTT Bypass:
//   with Root Fixed no conversion at all (the rhythm channels), with Root Trans transposition only. Melody for lines,
//   Chord for chordal parts; Melodic / Harmonic / Natural Minor and Dorian lower the 3rd / 3rd+6th / 3rd+6th+7th / 3rd+7th
//   when the chord turns minor (raise them back for major), the "5th" versions also move the 5th for aug and dim chords.
//   High Key: with Root Trans, notes that would go above it drop an octave. Note Limit folds notes into a range. NTT Bass:
//   the root plays as the on-bass note of a slash chord.
//   PSR-I610/I510 Reference Manual p. 45: Single Finger: one key = major; with the nearest black key to its left = minor;
//   with the nearest white key to its left = 7th; with both = minor 7th. Multi Finger reads Single Finger or Fingered.
//   Genos p. 9: Fingered On Bass takes the lowest key as the bass note.
// This site's own reading, unverified (the manuals give the rules, not the tables): the scale and chord-tone table per
// chord type below (e.g. Melody over a minor 7th uses Dorian); the High Key default (F, the manual's example); Root Fixed
// placing each chord group in the window from 2 semitones below its lowest written note to 9 above, which reproduces the
// manual's example; chromatic (non-scale) written notes following the scale degree below them.
(function (global) {
  "use strict";
  var NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  // tones: 4 chord-tone slots (root, 3rd, 5th, 7th-or-doubling) for the Chord table; scale: degrees 1–7 for the Melody table
  var MAJ = [0, 2, 4, 5, 7, 9, 11], MIX = [0, 2, 4, 5, 7, 9, 10], DOR = [0, 2, 3, 5, 7, 9, 10], MEL = [0, 2, 3, 5, 7, 9, 11];
  var TYPES = {
    "M":    { name: "",     tones: [0, 4, 7, 12], scale: MAJ, third: "maj", fifth: 7 },
    "M7":   { name: "M7",   tones: [0, 4, 7, 11], scale: MAJ, third: "maj", fifth: 7 },
    "6":    { name: "6",    tones: [0, 4, 7, 9],  scale: MAJ, third: "maj", fifth: 7 },
    "add9": { name: "add9", tones: [0, 4, 7, 14], scale: MAJ, third: "maj", fifth: 7 },
    "7":    { name: "7",    tones: [0, 4, 7, 10], scale: MIX, third: "maj", fifth: 7 },
    "m":    { name: "m",    tones: [0, 3, 7, 12], scale: DOR, third: "min", fifth: 7 },
    "m7":   { name: "m7",   tones: [0, 3, 7, 10], scale: DOR, third: "min", fifth: 7 },
    "m6":   { name: "m6",   tones: [0, 3, 7, 9],  scale: DOR, third: "min", fifth: 7 },
    "mM7":  { name: "mM7",  tones: [0, 3, 7, 11], scale: MEL, third: "min", fifth: 7 },
    "m7b5": { name: "m7♭5", tones: [0, 3, 6, 10], scale: [0, 1, 3, 5, 6, 8, 10], third: "min", fifth: 6 },
    "dim":  { name: "dim",  tones: [0, 3, 6, 12], scale: [0, 2, 3, 5, 6, 8, 9], third: "min", fifth: 6 },
    "dim7": { name: "dim7", tones: [0, 3, 6, 9],  scale: [0, 2, 3, 5, 6, 8, 9], third: "min", fifth: 6 },
    "aug":  { name: "aug",  tones: [0, 4, 8, 12], scale: [0, 2, 4, 6, 8, 9, 11], third: "maj", fifth: 8 },
    "sus4": { name: "sus4", tones: [0, 5, 7, 12], scale: [0, 2, 5, 5, 7, 9, 11], third: "none", fifth: 7 },
    "7sus4":{ name: "7sus4",tones: [0, 5, 7, 10], scale: [0, 2, 5, 5, 7, 9, 10], third: "none", fifth: 7 },
    "sus2": { name: "sus2", tones: [0, 2, 7, 12], scale: [0, 2, 2, 5, 7, 9, 11], third: "none", fifth: 7 }
  };
  // what a held set must be (pitch classes from the root); "opt" may be left out (the 5th of a seventh chord)
  var SHAPES = [
    ["M", [0, 4, 7]], ["m", [0, 3, 7]], ["7", [0, 4, 7, 10], 7], ["M7", [0, 4, 7, 11], 7], ["m7", [0, 3, 7, 10], 7], ["6", [0, 4, 7, 9]],
    ["m6", [0, 3, 7, 9]], ["mM7", [0, 3, 7, 11], 7], ["m7b5", [0, 3, 6, 10]], ["dim", [0, 3, 6]], ["dim7", [0, 3, 6, 9]], ["aug", [0, 4, 8]],
    ["sus4", [0, 5, 7]], ["7sus4", [0, 5, 7, 10], 7], ["sus2", [0, 2, 7]], ["add9", [0, 2, 4, 7]]
  ];
  function pc(m) { return ((m % 12) + 12) % 12; }
  function chordName(c) { if (!c) return ""; var s = NAMES[c.root] + TYPES[c.type].name; return c.bass != null && c.bass !== c.root ? s + "/" + NAMES[c.bass] : s; }
  function isBlack(m) { return [1, 3, 6, 8, 10].indexOf(pc(m)) >= 0; }

  function fingered(midis) {
    var ms = midis.slice().sort(function (a, b) { return a - b; }), pcs = [];
    ms.forEach(function (m) { if (pcs.indexOf(pc(m)) < 0) pcs.push(pc(m)); });
    if (pcs.length < 3) return null;
    var low = pc(ms[0]), best = null;
    pcs.forEach(function (r) {
      var rel = pcs.map(function (p) { return pc(p - r); }).sort(function (a, b) { return a - b; });
      SHAPES.forEach(function (sh, k) {
        var need = sh[1], opt = sh[2];
        var full = need.length === rel.length && need.every(function (x, i) { return x === rel[i]; });
        var less = opt != null && rel.length === need.length - 1 && need.filter(function (x) { return x !== opt; }).every(function (x, i) { return x === rel[i]; });
        if (!full && !less) return;
        var score = (r === low ? 100 : 0) + (full ? 10 : 0) - k * 0.1;   // the lowest key as root first, then whole shapes, then common types
        if (!best || score > best.score) best = { root: r, type: sh[0], score: score };
      });
    });
    return best ? { root: best.root, type: best.type, bass: best.root } : null;
  }
  function single(midis) {      // PSR-I610/I510 p. 45: the root is the highest key; the others are its nearest neighbours to the left
    var ms = midis.slice().sort(function (a, b) { return a - b; }); if (!ms.length || ms.length > 3) return null;
    var root = ms[ms.length - 1], rest = ms.slice(0, -1), wb = null, bb = null;
    for (var m = root - 1; m >= root - 3; m--) { if (isBlack(m) && bb == null) bb = m; if (!isBlack(m) && wb == null) wb = m; }
    var hasB = rest.indexOf(bb) >= 0, hasW = rest.indexOf(wb) >= 0;
    if (rest.length !== (hasB ? 1 : 0) + (hasW ? 1 : 0)) return null;
    var type = hasB && hasW ? "m7" : hasB ? "m" : hasW ? "7" : "M";
    return { root: pc(root), type: type, bass: pc(root) };
  }
  function recognize(midis, mode, prev) {
    if (!midis || !midis.length) return null;
    var c = null;
    if (mode === "single") c = single(midis);
    else if (mode === "multi") c = (midis.length < 3 || single(midis) && midis.length === 3 && !fingered(midis)) ? single(midis) : fingered(midis);
    else c = fingered(midis);
    if (c && mode === "onbass") c.bass = pc(Math.min.apply(null, midis));
    if (c) c.name = chordName(c);
    return c;
  }

  // ---------- conversion ----------
  var MINOR_LOWER = { melodicMinor: [2], harmonicMinor: [2, 5], naturalMinor: [2, 5, 6], dorian: [2, 6] };   // scale-degree indices (3rd=2, 6th=5, 7th=6)
  function degreeOf(rel, scale) {   // -> [index, chromatic offset above that degree]
    for (var i = scale.length - 1; i >= 0; i--) if (rel >= scale[i]) return [i, rel - scale[i]];
    return [0, rel];
  }
  // the written note's pitch class relative to the source root -> semitones to add for the chord type (still on the source root)
  function typeShift(rel, ntt, srcT, tgtT) {
    var base = ntt.replace(/5$/, "");
    if (ntt === "bypass") return 0;
    if (ntt === "chord") {
      var k = srcT.tones.map(pc).indexOf(rel);
      if (k >= 0) return tgtT.tones[k] - srcT.tones[k];
      ntt = "melody";
    }
    if (ntt === "melody") { var d = degreeOf(rel, srcT.scale); return tgtT.scale[d[0]] + d[1] - rel; }
    if (MINOR_LOWER[base]) {             // only the major/minor change, and the 5th for aug/dim in the "5th" tables
      var dg = degreeOf(rel, MAJ), shift = 0;
      if (dg[1] === 0 || srcT.third === "min") {
        var to = tgtT.third === "min" ? -1 : 0, from = srcT.third === "min" ? -1 : 0;
        if (MINOR_LOWER[base].indexOf(dg[0]) >= 0) shift += to - from;
        if (/5$/.test(ntt) && dg[0] === 4) shift += (tgtT.fifth - 7) - (srcT.fifth - 7);
      }
      return shift;
    }
    return 0;
  }
  function fold(m, lo, hi) { while (m < lo) m += 12; while (m > hi) m -= 12; return m < lo ? null : m; }

  function convert(midi, ch, src, chord, group) {
    if (!chord) return null;
    src = src || { root: 0, type: "M7" };
    var srcT = TYPES[src.type], tgtT = TYPES[chord.type] || TYPES.M;
    if (ch.ntr === "fixed" && ch.ntt === "bypass") return midi;
    var rel = pc(midi - src.root), m = midi + typeShift(rel, ch.ntt, srcT, tgtT);
    var d = pc(chord.root - src.root), out;
    if (ch.ntr === "trans") {
      var hk = ch.highKey == null ? 5 : ch.highKey;               // the root goes up to the High Key, above it drops an octave
      if (pc(src.root + d) > hk && d > 0) d -= 12;
      out = m + d;
    } else {
      var low = Math.min.apply(null, (group && group.length ? group : [midi]));
      out = m + d; while (out < low - 2) out += 12; while (out > low + 9) out -= 12;
    }
    if (ch.nttBass && chord.bass != null && chord.bass !== chord.root && pc(out) === chord.root) out += pc(chord.bass - chord.root) - (pc(chord.bass - chord.root) > 6 ? 12 : 0);
    if (ch.lo != null || ch.hi != null) out = fold(out, ch.lo == null ? 0 : ch.lo, ch.hi == null ? 127 : ch.hi);
    return out;
  }
  function convertPhrase(notes, ch, src, chord) {
    var byT = {};
    notes.forEach(function (n) { if (n.midi != null) (byT[n.t.toFixed(4)] = byT[n.t.toFixed(4)] || []).push(n.midi); });
    return notes.map(function (n) {
      var o = Object.assign({}, n);
      if (n.midi != null) { o.src = n.midi; o.midi = convert(n.midi, ch, src, chord, byT[n.t.toFixed(4)]); }
      return o;
    }).filter(function (n) { return n.piece || n.midi != null; });
  }

  var api = { recognize: recognize, convert: convert, convertPhrase: convertPhrase, chordName: chordName, TYPES: TYPES, NAMES: NAMES, single: single, fingered: fingered };
  global.StyleEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
