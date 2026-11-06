// pitch-spelling.js
// Line-of-fifths pitch spelling, key estimation, and chord-tone naming.
// Plain script — drop in via <script src="pitch-spelling.js"></script>.
//
// Line-of-fifths (LOF) basics:
//   LOF position 0 = C, +1 = a fifth up (G), -1 = a fifth down (F), etc.
//   Natural letters occupy LOF -1..5 (F C G D A E B). Beyond that range,
//   sharps (+7 per accidental) or flats (-7 per accidental) are added.
(function (global) {
  "use strict";

  // ── Line of Fifths ─────────────────────────────────────────────────────────

  var LOF_LETTERS = ["F", "C", "G", "D", "A", "E", "B"]; // index = ((lof+1) mod 7 + 7) mod 7

  // Pitch class of a LOF position (e.g. LOF 1 = G = pc 7).
  function lofPitchClass(lof) {
    return (((lof * 7) % 12) + 12) % 12;
  }

  // LOF position → { letter, accidental, name, lof, pc }
  function lofToSpelling(lof) {
    var idx = (((lof + 1) % 7) + 7) % 7;
    var accCount = Math.floor((lof + 1) / 7);
    var acc = "";
    if (accCount > 0) acc = new Array(accCount + 1).join("#");
    else if (accCount < 0) acc = new Array(-accCount + 1).join("b");
    var letter = LOF_LETTERS[idx];
    return { letter: letter, accidental: acc, name: letter + acc, lof: lof, pc: lofPitchClass(lof) };
  }

  // How expensive is this LOF position? Double-sharps/flats are penalised heavily.
  function lofComplexity(lof) {
    var n = lofToSpelling(lof).accidental.length;
    return n <= 1 ? n : n * n + 1;
  }

  // Spell a pitch class as the note closest to centerLof on the line of fifths.
  function spellPitchClass(pc, centerLof) {
    pc = (((pc % 12) + 12) % 12);
    centerLof = centerLof || 0;

    var candidates = [];
    for (var lof = centerLof - 6; lof <= centerLof + 6; lof++) {
      if (lofPitchClass(lof) === pc) candidates.push(lof);
    }
    var chosen = candidates[0];
    if (candidates.length > 1) {
      var d0 = Math.abs(candidates[0] - centerLof);
      var d1 = Math.abs(candidates[1] - centerLof);
      if (d0 === d1) {
        // Equidistant (e.g. F# vs Gb): lean sharp in sharp-side keys, flat in flat-side.
        chosen = (centerLof >= 0) ? Math.max(candidates[0], candidates[1]) : Math.min(candidates[0], candidates[1]);
      } else {
        chosen = (d0 < d1) ? candidates[0] : candidates[1];
      }
    }
    return lofToSpelling(chosen);
  }

  // How far (in fifths) the nearest spelling of pc sits from centerLof.
  function lofDistance(pc, centerLof) {
    centerLof = centerLof || 0;
    return Math.abs(spellPitchClass(pc, centerLof).lof - centerLof);
  }

  // The line-of-fifths center for a given tonic pitch class.
  function keyTonicLOF(tonicPc) {
    return spellPitchClass(tonicPc, 0).lof;
  }

  // ── Key estimation ─────────────────────────────────────────────────────────

  var MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function dot(a, b) {
    var s = 0;
    for (var i = 0; i < 12; i++) s += a[i] * b[i];
    return s;
  }
  function norm(a) {
    return Math.sqrt(dot(a, a));
  }

  // weights: array of 12 non-negative numbers (pitch-class histogram).
  // Returns { tonicPc, mode, lof } for the best-correlated key.
  function estimateKey(weights) {
    var total = 0;
    for (var i = 0; i < 12; i++) total += weights[i] || 0;
    if (total <= 0) return { tonicPc: 0, mode: "major", lof: 0 };

    var wNorm = norm(weights);
    var best = null;
    for (var mode = 0; mode < 2; mode++) {
      var profile = (mode === 0) ? MAJOR_PROFILE : MINOR_PROFILE;
      for (var tonic = 0; tonic < 12; tonic++) {
        var rotated = new Array(12);
        for (var k = 0; k < 12; k++) rotated[(k + tonic) % 12] = profile[k];
        var score = (wNorm > 0) ? dot(weights, rotated) / (wNorm * norm(rotated)) : 0;
        if (!best || score > best.score) {
          best = { score: score, tonicPc: tonic, mode: (mode === 0) ? "major" : "minor" };
        }
      }
    }
    return { tonicPc: best.tonicPc, mode: best.mode, lof: keyTonicLOF(best.tonicPc) };
  }

  // ── Note utilities ─────────────────────────────────────────────────────────

  // LOF position of each natural letter (needed to parse note names into LOF).
  var LETTER_LOF = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };

  var FLAT_NAMES  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  var SHARP_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  // Parse a note-name string into a LOF position. Returns null for invalid input.
  function parseNoteToLOF(str) {
    var letter = str.charAt(0);
    if (!LETTER_LOF.hasOwnProperty(letter)) return null;
    var acc = 0;
    for (var i = 1; i < str.length; i++) {
      if (str[i] === "#") acc += 1;
      else if (str[i] === "b") acc -= 1;
    }
    return LETTER_LOF[letter] + 7 * acc;
  }

  // Parse a note-name string → { letter, accidental, name, pc, lof }. Returns null for invalid input.
  function parseNote(str) {
    var lof = parseNoteToLOF(str);
    if (lof === null) return null;
    return lofToSpelling(lof);
  }

  // Default note name for a pitch class. Not context-sensitive — use spellChord for in-chord names.
  function noteName(pc, useFlats) {
    pc = (((pc % 12) + 12) % 12);
    return (useFlats ? FLAT_NAMES : SHARP_NAMES)[pc];
  }

  // ── Root options ───────────────────────────────────────────────────────────

  // The 12 chromatic pitch classes with conventional spellings and enharmonic aliases.
  var ROOT_OPTIONS = [
    { pc:  0, canonical: "C",  aliases: ["C"]         },
    { pc:  1, canonical: "Db", aliases: ["C#", "Db"]  },
    { pc:  2, canonical: "D",  aliases: ["D"]          },
    { pc:  3, canonical: "Eb", aliases: ["D#", "Eb"]  },
    { pc:  4, canonical: "E",  aliases: ["E",  "Fb"]  },
    { pc:  5, canonical: "F",  aliases: ["F",  "E#"]  },
    { pc:  6, canonical: "F#", aliases: ["F#", "Gb"]  },
    { pc:  7, canonical: "G",  aliases: ["G"]          },
    { pc:  8, canonical: "Ab", aliases: ["G#", "Ab"]  },
    { pc:  9, canonical: "A",  aliases: ["A"]          },
    { pc: 10, canonical: "Bb", aliases: ["A#", "Bb"]  },
    { pc: 11, canonical: "B",  aliases: ["B",  "Cb"]  }
  ];

  function getRootOption(pc) {
    pc = (((pc % 12) + 12) % 12);
    for (var i = 0; i < ROOT_OPTIONS.length; i++) {
      if (ROOT_OPTIONS[i].pc === pc) return ROOT_OPTIONS[i];
    }
    return null;
  }

  // True when the conventional spelling of this pitch class uses a flat (Db, Eb, Ab, Bb, Gb).
  function preferFlats(rootPc) {
    var opt = getRootOption(rootPc);
    return !!(opt && opt.canonical.indexOf("b") !== -1);
  }

  // ── Degree parsing ─────────────────────────────────────────────────────────

  // LOF offset from root for each natural diatonic degree (1–7), index = (degree−1) % 7.
  // Derived from the LOF positions of C D E F G A B = 0 2 4 −1 1 3 5.
  // Accidentals in the formula (e.g. b3, #11) shift by ±7 per accidental.
  var DEGREE_LOF = [0, 2, 4, -1, 1, 3, 5];

  // Parse a degree token from a chord formula. "b3" → { accidental: -1, degree: 3, label: "b3" }
  function parseDegree(str) {
    if (!str) return null;
    var m = /^([b#]*)(\d+)$/.exec(str);
    if (!m) return null;
    var acc = 0;
    for (var i = 0; i < m[1].length; i++) acc += m[1][i] === "#" ? 1 : -1;
    return { accidental: acc, degree: parseInt(m[2], 10), label: str };
  }

  // ── Chord spelling ─────────────────────────────────────────────────────────

  // Spell all chord tones given the root's LOF position.
  // Returns [{ degree, interval, pc, name, lof, isRoot }].
  //
  // intervals — semitone offsets from root, e.g. [0, 4, 7]
  // formula   — degree string, e.g. "1 3 5" or "1 b3 b5 bb7"
  function spellChordFromLOF(rootLof, intervals, formula) {
    var parts = formula.trim().split(/\s+/);
    return intervals.map(function (interval, i) {
      var parsed = parseDegree(parts[i]);
      var degree  = parsed ? parsed.degree     : i + 1;
      var accAdj  = parsed ? parsed.accidental : 0;
      var toneLof = rootLof + DEGREE_LOF[(degree - 1) % 7] + 7 * accAdj;
      var sp = lofToSpelling(toneLof);
      return {
        degree:   parsed ? parsed.label : String(degree),
        interval: interval,
        pc:       sp.pc,
        name:     sp.name,
        lof:      toneLof,
        isRoot:   (((interval % 12) + 12) % 12) === 0
      };
    });
  }

  // Find the root spelling (from ROOT_OPTIONS aliases) whose chord-tone spelling
  // has the fewest accidentals. Returns a note object with `lof` and `name`.
  function bestSpelling(rootPc, intervals, formula) {
    rootPc = (((rootPc % 12) + 12) % 12);
    var opt = getRootOption(rootPc);
    var aliases = (opt && opt.aliases && opt.aliases.length)
      ? opt.aliases
      : [noteName(rootPc, false), noteName(rootPc, true)];

    var seen = {};
    var candidates = [];
    for (var i = 0; i < aliases.length; i++) {
      if (seen[aliases[i]]) continue;
      seen[aliases[i]] = true;
      var lof = parseNoteToLOF(aliases[i]);
      if (lof === null || lofPitchClass(lof) !== rootPc) continue;
      candidates.push(lofToSpelling(lof));
    }
    if (!candidates.length) return spellPitchClass(rootPc, 0);

    var results = candidates.map(function (root) {
      var spelled    = spellChordFromLOF(root.lof, intervals, formula);
      var noteScore  = spelled.reduce(function (s, t) { return s + lofComplexity(t.lof); }, 0);
      var aliasScore = 0.25 * lofComplexity(root.lof);
      var canonBias  = (opt && root.name !== opt.canonical) ? 0.05 : 0;
      return { root: root, score: noteScore + aliasScore + canonBias };
    });
    results.sort(function (a, b) { return a.score - b.score; });
    return results[0].root;
  }

  // Spell all chord tones from a pitch class, choosing the best enharmonic root.
  // Returns [{ degree, interval, pc, name, lof, isRoot }].
  function spellChord(rootPc, intervals, formula) {
    var root = bestSpelling(rootPc, intervals, formula);
    return spellChordFromLOF(root.lof, intervals, formula);
  }

  // Build a pitch-class → note-name map for a chord. Useful in SVG rendering
  // where only the pitch class of a fretted note is known.
  // Returns e.g. { 0: "C", 4: "E", 7: "G" }.
  function noteNamesByPc(rootPc, intervals, formula) {
    var tones = spellChord(rootPc, intervals, formula);
    var map = {};
    for (var i = 0; i < tones.length; i++) {
      var pc = (((tones[i].pc % 12) + 12) % 12);
      if (!map[pc]) map[pc] = tones[i].name;
    }
    return map;
  }

  // Display name for a chord, e.g. "Dbmaj7". chord must have .symbol, .intervals, .formula.
  function chordDisplayName(rootPc, chord) {
    var root = bestSpelling(rootPc, chord.intervals, chord.formula);
    return chord.symbol ? root.name + chord.symbol : root.name;
  }

  // ── Roman numeral analysis ─────────────────────────────────────────────────

  var ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

  // Semitone offset of each scale degree (1-7) above the tonic.
  var MAJOR_DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
  var MINOR_DEGREE_SEMITONES = [0, 2, 3, 5, 7, 8, 10];
  // In minor keys, the raised 6th and 7th degrees (melodic/harmonic minor)
  // are common enough to treat as "natural" (no accidental) alternates.
  var MINOR_DEGREE_ALT = { 6: 9, 7: 11 };

  // Case/symbol/figure for each chord quality (matches director.html's
  // CHORD_QUALITY_INTERVALS keys). caseType controls I vs i; symbol is the
  // diminished/augmented/half-diminished marker; figure is the figured-bass
  // / extension suffix.
  var ROMAN_QUALITY = {
    "maj":         { caseType: "upper", symbol: "",  figure: ""      },
    "min":         { caseType: "lower", symbol: "",  figure: ""      },
    "dim":         { caseType: "lower", symbol: "°", figure: "" },
    "aug":         { caseType: "upper", symbol: "+", figure: ""      },
    "6":           { caseType: "upper", symbol: "",  figure: "6"     },
    "m6":          { caseType: "lower", symbol: "",  figure: "6"     },
    "dim_add_b6":  { caseType: "lower", symbol: "°", figure: "(b6)" },
    "7":           { caseType: "upper", symbol: "",  figure: "7"     },
    "maj7":        { caseType: "upper", symbol: "",  figure: "maj7"  },
    "min7":        { caseType: "lower", symbol: "",  figure: "7"     },
    "7#5":         { caseType: "upper", symbol: "+", figure: "7"     },
    "dim7":        { caseType: "lower", symbol: "°", figure: "7" },
    "m7b5":        { caseType: "lower", symbol: "ø", figure: "7" },
    "7b5":         { caseType: "upper", symbol: "",  figure: "7(b5)" },
    "mmaj7":       { caseType: "lower", symbol: "",  figure: "(maj7)" },
    "maj7#5":      { caseType: "upper", symbol: "+", figure: "maj7"  },
    "dimMaj7":     { caseType: "lower", symbol: "°", figure: "(maj7)" },
    "7add9":       { caseType: "upper", symbol: "",  figure: "7(9)"  },
    "7addb9":      { caseType: "upper", symbol: "",  figure: "7(b9)" },
    "maj7add9":    { caseType: "upper", symbol: "",  figure: "maj7(9)" }
  };

  // Scale degree (1-7) and chromatic alteration for a root pitch class
  // relative to a key's tonic/mode. accidental 0 = diatonic, +1/-1 = #/b, etc.
  function degreeForRoot(rootPc, tonicPc, mode) {
    var interval = (((rootPc - tonicPc) % 12) + 12) % 12;
    var base = (mode === "minor") ? MINOR_DEGREE_SEMITONES : MAJOR_DEGREE_SEMITONES;
    var best = null;
    for (var d = 0; d < 7; d++) {
      var degree = d + 1;
      var candidates = [base[d]];
      if (mode === "minor" && MINOR_DEGREE_ALT.hasOwnProperty(degree)) {
        candidates.push(MINOR_DEGREE_ALT[degree]);
      }
      for (var c = 0; c < candidates.length; c++) {
        var acc = interval - candidates[c];
        if (acc > 6) acc -= 12;
        if (acc < -6) acc += 12;
        var absAcc = Math.abs(acc);
        if (best === null || absAcc < Math.abs(best.acc) ||
            // On ties (e.g. Bb in C major = #VI or bVII), prefer the flat
            // spelling - chromatic borrowed chords are conventionally
            // written bII/bIII/bVI/bVII rather than #I/#II/#V/#VI.
            (absAcc === Math.abs(best.acc) && acc < best.acc)) {
          best = { degree: degree, acc: acc };
        }
      }
    }
    return best;
  }

  // Roman numeral label for a chord root + quality within a key context
  // ({ tonicPc, mode }), e.g. romanNumeral(9, "min7", { tonicPc: 0, mode: "major" }) -> "vi7".
  function romanNumeral(rootPc, quality, keyContext) {
    rootPc = (((rootPc % 12) + 12) % 12);
    var tonicPc = keyContext ? keyContext.tonicPc : 0;
    var mode = (keyContext && keyContext.mode === "minor") ? "minor" : "major";
    var da = degreeForRoot(rootPc, tonicPc, mode);
    var spec = ROMAN_QUALITY[quality] || { caseType: "upper", symbol: "", figure: "" };

    var numeral = ROMAN_NUMERALS[da.degree - 1];
    if (spec.caseType === "lower") numeral = numeral.toLowerCase();

    var accStr = "";
    if (da.acc > 0) accStr = new Array(da.acc + 1).join("#");
    else if (da.acc < 0) accStr = new Array(-da.acc + 1).join("b");

    return accStr + numeral + spec.symbol + spec.figure;
  }

  // Major key (tonic pitch class) that best fits a list of chords, [{ rootPc, intervals }], for the Chord Sheet's Auto-detect.
  // Krumhansl major profile over the chord tones, minus a penalty for every tone outside the candidate's major scale:
  // the profile alone chose G for Dm7 G7 Cmaj7 A7 (ii-V-I-VI), because A7's C# and G pulled it sideways.
  var KEY_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var KEY_OUTSIDE_PENALTY = 2;
  function majorFromChords(chords) {
    var w = new Array(12).fill(0), total = 0;
    (chords || []).forEach(function (c) {
      (c.intervals || []).forEach(function (iv) { w[(((c.rootPc + iv) % 12) + 12) % 12] += 1; total += 1; });
    });
    if (total < 3) return 0;
    var bestPc = 0, bestScore = -Infinity;
    for (var t = 0; t < 12; t++) {
      var score = 0;
      for (var i = 0; i < 12; i++) {
        var d = (i - t + 12) % 12;
        score += KEY_PROFILE[d] * w[i];
        // no penalty for the raised 7th of the relative minor (G# over Am in C): E7 is the usual way into it
        if (d !== 8 && MAJOR_DEGREE_SEMITONES.indexOf(d) < 0) score -= KEY_OUTSIDE_PENALTY * w[i];
      }
      if (score > bestScore) { bestScore = score; bestPc = t; }
    }
    return bestPc;
  }
  // The major key (tonic pc) that fits the chords: also what a minor tune is "in" for movable do (Am Dm E7 Am -> C).
  function keyFromChords(chords) { return majorFromChords(chords); }
  // { tonicPc, mode, doPc }: the relative minor instead when the first or last chord is its minor tonic chord, or its V7 appears
  // (Am ... E7 in C). doPc is the major key either way.
  function detectKey(chords) {
    var maj = majorFromChords(chords), min = (maj + 9) % 12;
    chords = chords || [];
    function isMinorTonic(c) { return c && ((c.rootPc % 12) + 12) % 12 === min && (c.intervals || []).indexOf(3) >= 0; }
    function isV7(c) { var iv = c.intervals || []; return ((c.rootPc % 12) + 12) % 12 === (min + 7) % 12 && iv.indexOf(4) >= 0 && iv.indexOf(10) >= 0; }
    var minor = chords.length >= 2 && (isMinorTonic(chords[0]) || isMinorTonic(chords[chords.length - 1]) || chords.some(isV7));
    return minor ? { tonicPc: min, mode: "minor", doPc: maj } : { tonicPc: maj, mode: "major", doPc: maj };
  }

  // ── Exports ────────────────────────────────────────────────────────────────

  global.PitchSpelling = {
    // LOF core
    lofPitchClass:    lofPitchClass,
    lofToSpelling:    lofToSpelling,
    spellPitchClass:  spellPitchClass,
    lofDistance:      lofDistance,
    keyTonicLOF:      keyTonicLOF,
    // Key estimation
    estimateKey:      estimateKey,
    keyFromChords:    keyFromChords,
    detectKey:        detectKey,
    // Note utilities
    parseNote:        parseNote,
    parseNoteToLOF:   parseNoteToLOF,
    noteName:         noteName,
    getRootOption:    getRootOption,
    preferFlats:      preferFlats,
    // Degree parsing
    parseDegree:      parseDegree,
    // Chord spelling
    spellChordFromLOF: spellChordFromLOF,
    bestSpelling:      bestSpelling,
    spellChord:        spellChord,
    noteNamesByPc:     noteNamesByPc,
    chordDisplayName:  chordDisplayName,
    // Roman numeral analysis
    romanNumeral:      romanNumeral,
    degreeForRoot:     degreeForRoot,
    // Constants
    ROOT_OPTIONS: ROOT_OPTIONS,
    FLAT_NAMES:   FLAT_NAMES,
    SHARP_NAMES:  SHARP_NAMES
  };

})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
