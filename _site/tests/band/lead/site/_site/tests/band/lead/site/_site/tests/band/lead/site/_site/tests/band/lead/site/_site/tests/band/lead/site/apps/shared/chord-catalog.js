// chord-catalog.js — the Chord Library's encyclopaedia (ChordCatalog).
// Every playable voicing of a chord on a fretted instrument, found by search from the tuning
// (never hard-coded), each one described by the things a player looks a shape up by: which
// string the bass is on, which strings carry the root, which strings are used and which are
// skipped, what is in the bass and on top, whether it is close, drop 2, drop 3, drop 2+4 ...
// Keyboard voicings come from ChordVoicings (voicings.js) and get the same description.
//
//   ChordCatalog.QUALITIES                     [{ id, label, symbol, family, formula, intervals, optional? }]
//   ChordCatalog.FAMILIES                      [{ id, label }]
//   ChordCatalog.quality(id)                   -> quality
//   ChordCatalog.fretted(rootPc, quality, opts) -> [voicing]
//        opts { tuning:[open MIDI, lowest string first], maxFret:15, maxSpan:4 }
//   ChordCatalog.keyboard(rootPc, quality)     -> [voicing]   (needs voicings.js loaded first)
//   ChordCatalog.describe(midis, rootPc, quality) -> { tones, bassTone, topTone, structure, ... }
//   ChordCatalog.parseSymbol("Bbm7b5")         -> { rootPc, quality } or null
//
//   voicing { frets:[fret | null, lowest string first] (fretted only), midis:[low..high],
//             tones:[degree names low..high], bassTone, topTone, inversion ("root" | "3rd" | ...),
//             structure: "close" | "drop2" | "drop3" | "drop2+4" | "drop2+3" | ... | "spread" | "doubled"
//                        (three-note shapes: "close" | "open" | "spread" | "doubled"),
//             type: "full" | "shell" (R-3-7) | "guide" (3-7) | "rootless" | "partial" (tones left out),
//             bassString, topString, rootStrings:[..], stringSet:[..], skipped:[..]   string NUMBERS, 1 = highest
//             notes, omitted:[names], rootless, openStrings, position (lowest fretted fret), span,
//             barre, fingers, style (keyboard: the ChordVoicings style id),
//             caged:["E", ...] the CAGED shapes it lies inside (standard tuning), cagedFull: it is a whole shape }
//
// CAGED: the open C A G E D shapes of major, minor, 7, maj7 and m7, moved up the neck. A voicing
// of three strings or more that sits inside one (with a root on one of the shape's roots) is
// tagged with it; other qualities are read against their base chord (9 -> 7, m11 -> m7, 6 -> major)
// and may move one string by up to two frets for the added tone. Sus and diminished chords get none.
//
// Which tones a shape may leave out: the natural 5th, and the root once the chord has four
// tones or more (the shape is then marked rootless); a quality can list more in `optional`
// (an 11th chord can lose its 3rd and 9th, a 13th its 9th). A chord of four or more tones
// must still sound at least three of them, five or more at least four.
//
// Playability: at most four fingers, counting a barre as one finger (a barre needs every
// string under it fretted); the fretted notes span at most maxSpan frets; skipped strings
// inside the shape are allowed one at a time (drop 3, Freddie Green), at most two in all.

(function (global) {
  "use strict";
  function mod12(n){ return ((n % 12) + 12) % 12; }

  var FAMILIES = [
    { id:"major", label:"Major" }, { id:"minor", label:"Minor" }, { id:"dominant", label:"Dominant" },
    { id:"sus", label:"Suspended" }, { id:"diminished", label:"Diminished" }, { id:"augmented", label:"Augmented" },
    { id:"power", label:"Power" }
  ];

  // formula -> intervals. Degrees above 7 sit above the octave (9 = 14, 11 = 17, 13 = 21).
  var DEG = { 1:0, 2:2, 3:4, 4:5, 5:7, 6:9, 7:11, 9:14, 11:17, 13:21 };
  function intervalsOf(formula){
    return formula.split(/\s+/).map(function (tok){
      var m = /^([b#]*)(\d+)$/.exec(tok), acc = 0;
      for (var i = 0; i < m[1].length; i++) acc += m[1][i] === "#" ? 1 : -1;
      return DEG[+m[2]] + acc;
    });
  }
  function Q(id, label, symbol, family, formula, optional, aliases){
    return { id:id, label:label, symbol:symbol, family:family, formula:formula, intervals:intervalsOf(formula),
             optional:optional || null, aliases:aliases || [] };
  }
  var QUALITIES = [
    Q("major", "Major", "", "major", "1 3 5", null, ["maj", "M"]),
    Q("6", "Six", "6", "major", "1 3 5 6", null, ["maj6", "M6"]),
    Q("69", "Six-Nine", "6/9", "major", "1 3 5 6 9", ["1", "5"], ["69", "6add9"]),
    Q("add9", "Add 9", "add9", "major", "1 3 5 9", null, ["add2"]),
    Q("add11", "Add 11", "add11", "major", "1 3 5 11", null, ["add4"]),
    Q("maj7", "Major 7", "maj7", "major", "1 3 5 7", null, ["M7", "ma7", "Δ", "Δ7"]),
    Q("maj9", "Major 9", "maj9", "major", "1 3 5 7 9", null, ["M9", "Δ9"]),
    Q("maj7#11", "Major 7 ♯11", "maj7#11", "major", "1 3 5 7 #11", null, ["M7#11", "maj7(#11)", "Δ#11"]),
    Q("maj9#11", "Major 9 ♯11", "maj9#11", "major", "1 3 5 7 9 #11", ["1", "5", "9"], ["M9#11"]),
    Q("maj13", "Major 13", "maj13", "major", "1 3 5 7 9 13", ["1", "5", "9"], ["M13", "Δ13"]),
    Q("minor", "Minor", "m", "minor", "1 b3 5", null, ["min", "-", "mi"]),
    Q("m6", "Minor 6", "m6", "minor", "1 b3 5 6", null, ["min6", "-6"]),
    Q("m69", "Minor 6/9", "m6/9", "minor", "1 b3 5 6 9", ["1", "5"], ["m69", "-69"]),
    Q("madd9", "Minor Add 9", "m(add9)", "minor", "1 b3 5 9", null, ["madd9", "m(add9)", "-add9"]),
    Q("m7", "Minor 7", "m7", "minor", "1 b3 5 b7", null, ["min7", "-7", "mi7"]),
    Q("m9", "Minor 9", "m9", "minor", "1 b3 5 b7 9", null, ["min9", "-9"]),
    Q("m11", "Minor 11", "m11", "minor", "1 b3 5 b7 9 11", ["1", "5", "9"], ["min11", "-11"]),
    Q("m13", "Minor 13", "m13", "minor", "1 b3 5 b7 9 13", ["1", "5", "9"], ["min13", "-13"]),
    Q("mMaj7", "Minor Major 7", "m(maj7)", "minor", "1 b3 5 7", null, ["mMaj7", "mM7", "m(maj7)", "-maj7", "-Δ"]),
    Q("mMaj9", "Minor Major 9", "m(maj9)", "minor", "1 b3 5 7 9", null, ["mMaj9", "mM9", "-maj9"]),
    Q("7", "Dominant 7", "7", "dominant", "1 3 5 b7", null, ["dom7"]),
    Q("9", "Nine", "9", "dominant", "1 3 5 b7 9", null, ["dom9"]),
    Q("11", "Eleven", "11", "dominant", "1 3 5 b7 9 11", ["1", "3", "5", "9"]),
    Q("13", "Thirteen", "13", "dominant", "1 3 5 b7 9 13", ["1", "5", "9"]),
    Q("7b9", "7 Flat 9", "7b9", "dominant", "1 3 5 b7 b9", null, ["7(b9)", "7-9"]),
    Q("7#9", "7 Sharp 9", "7#9", "dominant", "1 3 5 b7 #9", null, ["7(#9)", "7+9"]),
    Q("7b5", "7 Flat 5", "7b5", "dominant", "1 3 b5 b7", null, ["7(b5)", "7-5"]),
    Q("7#5", "7 Sharp 5", "7#5", "dominant", "1 3 #5 b7", null, ["7(#5)", "+7", "aug7", "7+5", "7+"]),
    Q("7#11", "7 Sharp 11", "7#11", "dominant", "1 3 5 b7 #11", null, ["7(#11)", "7+11"]),
    Q("7b13", "7 Flat 13", "7b13", "dominant", "1 3 5 b7 b13", null, ["7(b13)"]),
    Q("9#11", "9 Sharp 11", "9#11", "dominant", "1 3 5 b7 9 #11", ["1", "5", "9"], ["9(#11)"]),
    Q("13b9", "13 Flat 9", "13b9", "dominant", "1 3 5 b7 b9 13", ["1", "5"], ["13(b9)"]),
    Q("13#11", "13 Sharp 11", "13#11", "dominant", "1 3 5 b7 9 #11 13", ["1", "5", "9"], ["13(#11)"]),
    Q("7b9b13", "7 Flat 9 Flat 13", "7b9b13", "dominant", "1 3 5 b7 b9 b13", ["1", "5"], ["7(b9,b13)"]),
    Q("7#9b13", "7 Sharp 9 Flat 13", "7#9b13", "dominant", "1 3 5 b7 #9 b13", ["1", "5"], ["7(#9,b13)"]),
    Q("7alt", "Altered 7", "7alt", "dominant", "1 3 #5 b7 b9 #9", ["1", "#5", "b9"], ["alt", "7#5#9"]),
    Q("sus2", "Sus 2", "sus2", "sus", "1 2 5", null, ["sus9"]),
    Q("sus4", "Sus 4", "sus4", "sus", "1 4 5", null, ["sus"]),
    Q("7sus4", "7 Sus 4", "7sus4", "sus", "1 4 5 b7", null, ["7sus", "sus7"]),
    Q("7sus2", "7 Sus 2", "7sus2", "sus", "1 2 5 b7", null, []),
    Q("9sus4", "9 Sus 4", "9sus4", "sus", "1 4 5 b7 9", null, ["9sus"]),
    Q("13sus4", "13 Sus 4", "13sus4", "sus", "1 4 5 b7 9 13", ["1", "5", "9"], ["13sus"]),
    Q("dim", "Diminished", "dim", "diminished", "1 b3 b5", null, ["o", "°", "mb5"]),
    Q("dim7", "Diminished 7", "dim7", "diminished", "1 b3 b5 bb7", null, ["o7", "°7"]),
    Q("m7b5", "Half Diminished", "m7b5", "diminished", "1 b3 b5 b7", null, ["ø", "ø7", "-7b5", "min7b5"]),
    Q("m9b5", "Half Diminished 9", "m9b5", "diminished", "1 b3 b5 b7 9", null, ["ø9"]),
    Q("aug", "Augmented", "aug", "augmented", "1 3 #5", null, ["+", "#5", "(#5)"]),
    Q("9#5", "9 Sharp 5", "9#5", "augmented", "1 3 #5 b7 9", null, ["+9", "aug9"]),
    Q("augMaj7", "Augmented Major 7", "maj7#5", "augmented", "1 3 #5 7", null, ["+maj7", "maj7(#5)", "M7#5", "Δ#5"]),
    Q("5", "Power Chord", "5", "power", "1 5", null, ["power"])
  ];
  var BY_ID = {}; QUALITIES.forEach(function (q){ BY_ID[q.id] = q; });
  function quality(id){ return BY_ID[id] || null; }

  // ---- naming the tones of a quality ----
  function toneMap(q){                           // pitch-class offset -> degree name ("b7")
    var map = {}, toks = q.formula.split(/\s+/);
    q.intervals.forEach(function (iv, i){ map[mod12(iv)] = toks[i]; });
    return map;
  }
  function degreeNumber(name){ return +/\d+/.exec(name)[0]; }
  // What a bass note is called: root, 3rd (any third, or the sus 2/4 standing in for it), 5th,
  // 7th (b7, 7, bb7, and the 6 of a sixth chord), or the extension's own name.
  function roleOf(name){
    var d = degreeNumber(name);
    if (d === 1) return "root";
    if (d === 3 || d === 2 || d === 4) return "3rd";
    if (d === 5) return "5th";
    if (d === 7 || d === 6) return "7th";
    return name;
  }

  // ---- structure: close, drop 2 / 3 / 2+4 / 2+3, spread, doubled ----
  // A drop voicing is a close-position voicing with one or more voices (counted from the top)
  // dropped an octave; to read it back, lift voices an octave until it closes up.
  function structureOf(midis){
    var pcs = {}, i;
    for (i = 0; i < midis.length; i++){ if (pcs[mod12(midis[i])]) return { structure:"doubled" }; pcs[mod12(midis[i])] = 1; }
    var asc = midis.slice().sort(function (a, b){ return a - b; }), n = asc.length;
    if (n < 3) return { structure: asc[n - 1] - asc[0] < 12 ? "close" : "spread" };
    if (asc[n - 1] - asc[0] < 12) return { structure:"close" };
    var best = null;
    for (var mask = 1; mask < (1 << (n - 1)); mask++){      // never lift the top voice
      var lifted = asc.map(function (m, j){ return (mask >> j) & 1 ? { m: m + 12, up: true } : { m: m, up: false }; });
      lifted.sort(function (a, b){ return a.m - b.m; });
      if (lifted[n - 1].m - lifted[0].m >= 12) continue;
      var from = []; lifted.forEach(function (v, j){ if (v.up) from.push(n - j); });   // position from the top
      from.sort(function (a, b){ return a - b; });
      if (from.indexOf(1) >= 0) continue;
      if (!best || from.length < best.length) best = from;
    }
    return { structure: best ? "drop" + best.join("+") : "spread" };
  }

  // Everything about a voicing that does not depend on strings.
  function describe(midis, rootPc, q){
    var map = toneMap(q), asc = midis.slice().sort(function (a, b){ return a - b; });
    var tones = asc.map(function (m){ return map[mod12(m - rootPc)]; });
    var has = {}; tones.forEach(function (t){ has[t] = 1; });
    var omitted = q.formula.split(/\s+/).filter(function (t){ return !has[t]; });
    var bassTone = tones[0], roles = {};
    tones.forEach(function (t){ roles[roleOf(t)] = 1; });
    var type = !omitted.length ? "full"
      : (roles.root && roles["3rd"] && roles["7th"] && Object.keys(roles).length === 3) ? "shell"
      : (!roles.root && roles["3rd"] && roles["7th"] && Object.keys(roles).length === 2) ? "guide"
      : !has["1"] ? "rootless" : "partial";
    var structure = structureOf(asc).structure;
    if (asc.length === 3 && structure !== "close" && structure !== "doubled") structure = structure === "drop2" ? "open" : "spread";
    return {
      type: type,
      midis: asc, tones: tones, bassTone: bassTone, topTone: tones[tones.length - 1], inversion: roleOf(bassTone),
      structure: structure, notes: asc.length, omitted: omitted, rootless: !has["1"]
    };
  }

  // Which tones must sound, and how many different ones.
  function needs(q){
    var toks = q.formula.split(/\s+/), n = toks.length;
    var opt = q.optional ? q.optional.slice() : (n >= 4 ? ["1", "5"] : []);
    var required = toks.filter(function (t){ return opt.indexOf(t) < 0; });
    return { required: required, minDistinct: n >= 5 ? 4 : n === 4 ? 3 : n };
  }

  // ---- CAGED ----
  // The five open shapes of each base chord, frets low string to high (null = not played),
  // in standard tuning. A barre at fret k moves a shape up k frets.
  var STD = [40, 45, 50, 55, 59, 64], X = null;
  var CAGED = {
    major: { C:[X,3,2,0,1,0], A:[X,0,2,2,2,0], G:[3,2,0,0,0,3], E:[0,2,2,1,0,0], D:[X,X,0,2,3,2] },
    minor: { C:[X,3,1,0,1,3], A:[X,0,2,2,1,0], G:[3,1,0,0,3,3], E:[0,2,2,0,0,0], D:[X,X,0,2,3,1] },
    "7":   { C:[X,3,2,3,1,0], A:[X,0,2,0,2,0], G:[3,2,0,0,0,1], E:[0,2,0,1,0,0], D:[X,X,0,2,1,2] },
    maj7:  { C:[X,3,2,0,0,0], A:[X,0,2,1,2,0], G:[3,2,0,0,0,2], E:[0,2,1,1,0,0], D:[X,X,0,2,2,2] },
    m7:    { C:[X,3,1,3,4,X], A:[X,0,2,0,1,0], G:[3,1,0,0,3,1], E:[0,2,0,0,0,0], D:[X,X,0,2,1,1] }
  };
  var SHAPE_ROOT = { C:0, A:9, G:7, E:4, D:2 };
  // Which base chord's shapes a quality is read against (null: none, e.g. sus and diminished).
  function cagedBase(q){
    if (CAGED[q.id]) return q.id;
    var iv = q.intervals.map(mod12), has = function (x){ return iv.indexOf(x) >= 0; };
    if (q.family === "dominant") return "7";
    if (q.family === "major") return has(11) ? "maj7" : "major";
    if (q.family === "minor") return has(10) ? "m7" : "minor";
    if (q.family === "augmented") return has(10) ? "7" : has(11) ? "maj7" : "major";
    return null;
  }
  // Every CAGED shape this voicing lies inside, as [{ shape, exact, full }]. exact: every played
  // string sits on the shape (a quality that is not the base chord may move one string by up to
  // two frets, for its added colour tone); full: it is the whole shape.
  function cagedOf(frets, rootPc, q, tuning){
    var base = cagedBase(q), out = [];
    if (!base) return out;
    var same = tuning.map(function (m, i){ return tuning.length === 6 && m === STD[i]; });
    var own = base === q.id;
    Object.keys(CAGED[base]).forEach(function (shape){
      var t = CAGED[base][shape], k0 = mod12(rootPc - SHAPE_ROOT[shape]);
      [k0, k0 + 12].forEach(function (k){
        var agree = 0, off = 0, rootOn = false, all = true;
        for (var s = 0; s < 6; s++){
          var f = frets[s], tf = same[s] && t[s] != null ? t[s] + k : null;
          if (tf != null && f == null) all = false;
          if (f == null) continue;
          if (tf === f){ agree++; if (mod12(tuning[s] + f - rootPc) === 0) rootOn = true; }
          else if (!own && tf != null && Math.abs(tf - f) <= 2) off++;
          else if (!own && tf == null && off === 0) off++;
          else return;
        }
        if (off > 1 || agree < 3 || !rootOn) return;
        if (k > 0 && frets.some(function (f){ return f === 0; })) return;      // open strings only in the open shape
        out.push({ shape: shape, full: all && off === 0, fret: k });
      });
    });
    return out;
  }

  // ---- fretted search ----
  var DEFAULT_TUNING = [40, 45, 50, 55, 59, 64];
  var cache = {};

  function fretted(rootPc, q, opts){
    opts = opts || {};
    var tuning = opts.tuning || DEFAULT_TUNING, nStr = tuning.length;
    var maxFret = opts.maxFret == null ? 15 : opts.maxFret, maxSpan = opts.maxSpan == null ? 4 : opts.maxSpan;
    rootPc = mod12(rootPc);
    var key = [rootPc, q.id, tuning.join("."), maxFret, maxSpan].join("|");
    if (cache[key]) return cache[key];

    var map = toneMap(q), need = needs(q), minStrings = q.intervals.length === 2 ? 2 : 3, seen = {}, out = [];
    function tone(s, f){ return map[mod12(tuning[s] + f - rootPc)]; }

    for (var base = 1; base + maxSpan - 1 <= maxFret + maxSpan - 1 && base <= maxFret; base++){
      var choices = [];
      for (var s = 0; s < nStr; s++){
        var c = [null];
        if (base <= 5 && tone(s, 0)) c.push(0);      // open strings only in the low positions
        for (var f = base; f < base + maxSpan && f <= maxFret; f++) if (tone(s, f)) c.push(f);
        choices.push(c);
      }
      var cur = new Array(nStr);
      (function rec(s){
        if (s === nStr){ consider(cur.slice()); return; }
        for (var k = 0; k < choices[s].length; k++){ cur[s] = choices[s][k]; rec(s + 1); }
      })(0);
    }

    function consider(frets){
      var key = frets.join(",");
      if (seen[key]) return; seen[key] = 1;
      var used = [], i;
      for (i = 0; i < nStr; i++) if (frets[i] != null) used.push(i);
      if (used.length < minStrings) return;
      // skipped strings inside the shape: one at a time, two at most
      var skipped = [], gapRun = 0;
      for (i = used[0]; i <= used[used.length - 1]; i++){
        if (frets[i] == null){ skipped.push(i); if (++gapRun > 1) return; } else gapRun = 0;
      }
      if (skipped.length > 2) return;
      var midis = used.map(function (s){ return tuning[s] + frets[s]; });
      var dup = {}; for (i = 0; i < midis.length; i++){ if (dup[midis[i]]) return; dup[midis[i]] = 1; }
      // tones present
      var has = {}, distinct = 0;
      used.forEach(function (s){ var t = tone(s, frets[s]); if (!has[t]){ has[t] = 1; distinct++; } });
      for (i = 0; i < need.required.length; i++) if (!has[need.required[i]]) return;
      if (distinct < need.minDistinct) return;
      // the hand: span, fingers, barre
      var fr = used.filter(function (s){ return frets[s] > 0; });
      var position = fr.length ? Math.min.apply(null, fr.map(function (s){ return frets[s]; })) : 0;
      var top = fr.length ? Math.max.apply(null, fr.map(function (s){ return frets[s]; })) : 0;
      var span = fr.length ? top - position + 1 : 0;
      var atMin = fr.filter(function (s){ return frets[s] === position; });
      var barre = false, fingers = fr.length;
      if (atMin.length >= 2){
        var lo = atMin[0], hi = atMin[atMin.length - 1], ok = true;
        for (i = lo; i <= hi; i++) if (frets[i] == null || frets[i] < position) { ok = false; break; }
        if (ok && fingers > 4){ barre = true; fingers = fingers - atMin.length + 1; }
        else if (ok && atMin.length >= 3 && position > 0){ barre = true; fingers = fingers - atMin.length + 1; }
      }
      if (fingers > 4) return;
      var openStrings = used.filter(function (s){ return frets[s] === 0; }).length;
      var d = describe(midis, rootPc, q);
      var num = function (s){ return nStr - s; };
      var lowS = used[0];
      used.forEach(function (s){ if (tuning[s] + frets[s] < tuning[lowS] + frets[lowS]) lowS = s; });   // re-entrant tunings
      var highS = used[0];
      used.forEach(function (s){ if (tuning[s] + frets[s] > tuning[highS] + frets[highS]) highS = s; });
      d.frets = frets;
      d.bassString = num(lowS); d.topString = num(highS);
      d.rootStrings = used.filter(function (s){ return tone(s, frets[s]) === "1"; }).map(num);
      d.stringSet = used.map(num); d.skipped = skipped.map(num);
      d.position = position; d.span = span; d.barre = barre; d.fingers = fingers; d.openStrings = openStrings;
      d.mutedOutside = nStr - used.length - skipped.length;
      var cg = cagedOf(frets, rootPc, q, tuning);
      d.caged = cg.map(function (c){ return c.shape; }).filter(function (x, i, a){ return a.indexOf(x) === i; });
      d.cagedFull = cg.some(function (c){ return c.full; });
      out.push(d);
    }

    out.sort(function (a, b){ return a.position - b.position || b.stringSet[0] - a.stringSet[0] || a.notes - b.notes; });
    cache[key] = out;
    return out;
  }

  // ---- keyboard: ChordVoicings' piano styles, described the same way ----
  var PIANO_STYLES = ["standard", "shell", "guide", "rootless", "drop2", "drop3"];
  function keyboard(rootPc, q){
    var CV = global.ChordVoicings;
    if (!CV) return [];
    var seen = {}, out = [];
    PIANO_STYLES.forEach(function (style){
      CV.piano({ root: mod12(rootPc), intervals: q.intervals }, style, {}).forEach(function (c){
        var k = c.midis.join(",");
        if (seen[k]) return; seen[k] = 1;
        var map = toneMap(q);                    // skip voicings with a tone the quality doesn't name
        if (c.midis.some(function (m){ return !map[mod12(m - rootPc)]; })) return;
        var d = describe(c.midis, mod12(rootPc), q);
        d.style = style; d.label = c.label;
        d.structure = style === "drop2" || style === "drop3" ? style : "close";
        out.push(d);
      });
    });
    return out;
  }

  // ---- chord symbols ----
  var ROOT_PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  var SYMBOLS = [];
  QUALITIES.forEach(function (q){
    [q.symbol, q.id].concat(q.aliases).forEach(function (s){ SYMBOLS.push({ s: s, q: q }); });
  });
  SYMBOLS.sort(function (a, b){ return b.s.length - a.s.length; });
  function parseSymbol(text){
    var m = /^([A-Ga-g])([#b♯♭]?)(.*)$/.exec((text || "").trim());
    if (!m) return null;
    var pc = ROOT_PC[m[1].toUpperCase()] + (m[2] === "#" || m[2] === "♯" ? 1 : m[2] ? -1 : 0);
    var rest = m[3].replace(/♯/g, "#").replace(/♭/g, "b");
    for (var i = 0; i < SYMBOLS.length; i++) if (SYMBOLS[i].s === rest) return { rootPc: mod12(pc), quality: SYMBOLS[i].q, rootName: m[1].toUpperCase() + m[2] };
    return null;
  }

  global.ChordCatalog = {
    QUALITIES: QUALITIES, FAMILIES: FAMILIES, quality: quality,
    fretted: fretted, keyboard: keyboard, describe: describe, parseSymbol: parseSymbol,
    structureOf: structureOf, cagedOf: cagedOf, CAGED: CAGED, roleOf: roleOf, DEFAULT_TUNING: DEFAULT_TUNING.slice()
  };
})(typeof window !== "undefined" ? window : globalThis);
