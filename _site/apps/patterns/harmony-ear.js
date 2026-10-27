// harmony-ear.js — Hearing Harmony (practice/harmony-ear.qmd): harmonic progressions by ear, in levels of growing difficulty, along
// several paths ("orders") for listeners who know different kinds of music. No microphone, no notation: made for headphones on a bus.
//
// PATHS: one list of levels each. "mlt" follows Gordon, Learning Sequences in Music (2012), pp. 313, 318–320 (I V7 I and I IV I first,
// joined; harmonic minor before more major; Dorian IV; vi and relative keys; then the modes, seventh chords and diminished chords;
// the supertonic last) and Mullen's Literate Musician Harmony lessons. "rock", "jazz" and "classical" are this site's own orders
// (classical follows Hutchinson's chapters 7, 9, 17, 19, 20). "custom" builds progressions from chords you tick.
//
// A level: { id, title, modes: ["major", ...], pool: [chord tokens the answer buttons offer], progs: [[tokens], ...] | null (null = made
// from pool by walk()), note }. Tokens are Roman numerals counted from the resting tone of the level's mode:
//   case = quality (V major, v minor), o = diminished, + = augmented, ø7 half-diminished, o7 diminished 7th, 7 (dominant on a capital,
//   minor 7th on a small numeral), maj7; b / # before the numeral = lowered / raised from the MAJOR scale on the resting tone (bVII, bIII);
//   "/x" = secondary, counted from x's root (V7/V).
//
// Pure helpers (Node: tests/patterns/harmony-ear.test.js):
//   HarmonyEar.parse(token)            -> { tok, root (semitones above the resting tone), q, pcs: [rel semitones, root first] } | null
//   HarmonyEar.fn(token)               -> function name, by the root: Tonic, Dominant, Subdominant, Subtonic, Submediant, ...
//   HarmonyEar.PATHS / .path(id)       -> { id, label, levels }
//   HarmonyEar.voice(tokens, restPc, { voices: 3|4, lo }) -> [{ bass, upper: [midis] }]   (3 voices = bass + 2, 4 = bass + 3;
//                                         nearest motion, root in the bass; SATB.voice is used for 4 when it is loaded)
//   HarmonyEar.walk(pool, len, rnd)    -> a progression from the pool that starts and ends on the tonic chord (if the pool has one)
//   HarmonyEar.question(level, kind, opts, rnd) -> { kind, mode, progs: [[tok]..], answer: [...], choices: [...] }
//
// Sound: BandSounds (bass + piano, sound choices from BandSounds.sounds(family); never drums), one AudioContext registered with AudioTap.
// Progress: localStorage "harmonyEar.v1" (settings and the last 10 results per path + level). Supabase later.
(function (global) {
  "use strict";

  // ---------- chords ----------
  var MAJ = [0, 2, 4, 5, 7, 9, 11];
  var RN = ["vii", "iii", "vi", "iv", "ii", "v", "i"];          // longest first, for the regex
  var DEG = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
  var Q = {                                                     // semitones above the root
    maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
    dom7: [0, 4, 7, 10], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], hd7: [0, 3, 6, 10], dim7: [0, 3, 6, 9], minmaj7: [0, 3, 7, 11]
  };
  function parse1(t) {
    var m = /^([b#]?)(vii|iii|vi|iv|ii|v|i|VII|III|VI|IV|II|V|I)(maj7|ø7|o7|o|\+|7)?$/.exec(t);
    if (!m) return null;
    var up = m[2] === m[2].toUpperCase(), sfx = m[3] || "";
    var root = MAJ[DEG[m[2].toLowerCase()]] + (m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0);
    var q = sfx === "maj7" ? (up ? "maj7" : "minmaj7") : sfx === "ø7" ? "hd7" : sfx === "o7" ? "dim7" : sfx === "o" ? "dim" :
            sfx === "+" ? "aug" : sfx === "7" ? (up ? "dom7" : "min7") : (up ? "maj" : "min");
    return { root: ((root % 12) + 12) % 12, q: q, deg: DEG[m[2].toLowerCase()] };
  }
  function parse(tok) {
    var parts = String(tok).split("/"), c = parse1(parts[0]); if (!c) return null;
    if (parts[1]) { var t = parse1(parts[1]); if (!t) return null; c.root = (c.root + t.root) % 12; c.deg = (c.deg + t.deg) % 7; c.secondary = true; }
    c.tok = tok; c.pcs = Q[c.q].map(function (i) { return (c.root + i) % 12; });
    return c;
  }
  var FN = { 0: "Tonic", 1: "Neapolitan", 2: "Supertonic", 3: "Mediant", 4: "Mediant", 5: "Subdominant", 6: "Tritone",
             7: "Dominant", 8: "Submediant", 9: "Submediant", 10: "Subtonic", 11: "Leading tone" };
  function fn(tok) { var c = parse(tok); if (!c) return ""; return c.secondary ? "Secondary dominant" : FN[c.root]; }

  // ---------- modes ----------
  // DO measured from the resting tone (movable do, la-based minor), as in audiation.js
  var MODES = {
    major: { label: "Major", doOff: 0 }, minor: { label: "Minor (harmonic)", doOff: 3 }, aeolian: { label: "Aeolian", doOff: 3 },
    dorian: { label: "Dorian", doOff: -2 }, mixolydian: { label: "Mixolydian", doOff: -7 }, phrygian: { label: "Phrygian", doOff: -4 },
    lydian: { label: "Lydian", doOff: -5 }, locrian: { label: "Locrian", doOff: 1 }
  };
  var SYL = ["Do", "Di", "Re", "Me", "Mi", "Fa", "Fi", "So", "Si", "La", "Te", "Ti"];
  function syllable(relPc, mode) {     // relPc: semitones above the resting tone
    var off = (MODES[mode] || MODES.major).doOff;
    if (global.DegreeNames && global.DegreeNames.label) {
      var rest = 0, doPc = ((off % 12) + 12) % 12;
      return global.DegreeNames.label(((relPc % 12) + 12) % 12, { doPc: doPc, restPc: rest });
    }
    return SYL[(((relPc - off) % 12) + 12) % 12];
  }

  // ---------- paths ----------
  function L(id, title, modes, pool, progs, note) { return { id: id, title: title, modes: modes, pool: pool, progs: progs, note: note || "" }; }
  var G = "Gordon, LSM p. 320";
  var PATHS = [
    { id: "mlt", label: "MLT (Gordon / Mullen)", blurb: "Tonic and dominant first, then subdominant, then the modes; the supertonic (ii) comes last.", levels: [
      L("A1", "Major: tonic and dominant", ["major"], ["I", "V7"], [["I", "V7", "I"], ["I", "I", "V7", "I"], ["I", "V7", "V7", "I"], ["I", "V7", "I", "V7", "I"], ["V7", "I", "V7", "I"]], "Gordon, LSM p. 318: I V7 I is taught first. Mullen, Literate Musician, Harmony lessons 2 and 4."),
      L("A2", "Minor: tonic and dominant", ["minor"], ["i", "V7"], [["i", "V7", "i"], ["i", "i", "V7", "i"], ["i", "V7", "V7", "i"], ["i", "V7", "i", "V7", "i"], ["V7", "i", "V7", "i"]], "Mullen, Literate Musician, Harmony lessons 3 and 5. Minor here is harmonic minor: V7 has si."),
      L("A3", "Major or minor?", ["major", "minor"], null, null, "Mullen, Literate Musician, Harmony lesson 7: comparing major and minor. Answer with the tonality."),
      L("B1", "Major: subdominant", ["major"], ["I", "IV"], [["I", "IV", "I"], ["I", "I", "IV", "I"], ["I", "IV", "IV", "I"], ["IV", "I", "IV", "I"]], "Gordon, LSM p. 318: I IV I after I V7 I. Mullen, Major Subdominant FPIFO (Literate Musician p. 293)."),
      L("B2", "Major: I, IV and V7 joined", ["major"], ["I", "IV", "V7"], [["I", "IV", "V7", "I"], ["I", "V7", "IV", "I"], ["I", "IV", "I", "V7", "I"], ["V7", "I", "IV", "I"], ["I", "IV", "V7", "V7", "I"]], G + ": easy patterns joined into progressions; these are his examples."),
      L("B3", "Minor: subdominant", ["minor"], ["i", "iv", "V7"], [["i", "iv", "i"], ["i", "iv", "V7", "i"], ["i", "V7", "iv", "i"], ["i", "iv", "i", "V7", "i"], ["V7", "i", "iv", "i"]], "Gordon, LSM p. 319: I IV V7 I in harmonic minor before any more major."),
      L("C1", "Dorian: tonic and subdominant", ["dorian"], ["i", "IV"], [["i", "IV", "i"], ["i", "IV", "IV", "i"], ["IV", "i", "IV", "i"], ["i", "i", "IV", "i"]], G + ": the subdominant in Dorian is an easy pattern. Dorian's IV is a major chord (so ti re, with re as the resting tone)."),
      L("C2", "Mixolydian: tonic and subtonic", ["mixolydian"], ["I", "bVII"], [["I", "bVII", "I"], ["I", "I", "bVII", "I"], ["bVII", "I", "bVII", "I"], ["I", "bVII", "bVII", "I"]], "Mullen, Literate Musician: the Harmonic Loop in Mixolydian. Gordon places Mixolydian with the moderately difficult tonalities (p. 320)."),
      L("C3", "Aeolian", ["aeolian"], ["i", "iv", "bVI", "bVII"], [["i", "bVII", "i"], ["i", "bVI", "bVII", "i"], ["i", "iv", "bVII", "i"], ["i", "bVII", "bVI", "bVII", "i"]], "Aeolian uses ♭VII where minor uses V7 (Mullen, Literate Musician, the tonality pages)."),
      L("C4", "Phrygian and Lydian", ["phrygian", "lydian"], null, null, G + ": Phrygian and Lydian among the moderately difficult tonalities. Phrygian: i and ♭II. Lydian: I and II."),
      L("C5", "Which tonality?", ["major", "minor", "dorian", "mixolydian", "aeolian", "phrygian", "lydian"], null, null, "Answer with the tonality. A loop of each tonality's own characteristic chords."),
      L("D1", "Submediant", ["major", "minor"], null, null, G + ": vi in major and VI in minor (relative keys) are taught with the easy patterns."),
      L("E1", "Sevenths in major", ["major"], ["I", "IV", "V7", "vi7", "viiø7", "bVII7"], [["I", "vi7", "IV", "V7", "I"], ["I", "viiø7", "I"], ["I", "IV", "viiø7", "I"], ["I", "bVII7", "I"], ["I", "vi7", "V7", "I"], ["I", "bVII7", "IV", "I"]], G + ": submediant seventh, leading-tone seventh and subtonic seventh in major are moderately difficult."),
      L("E2", "Diminished chords", ["major", "minor"], null, null, G + ": harmonic patterns with the diminished chords. Major: vii°. Minor: ii° and vii°7."),
      L("F1", "Supertonic", ["major"], ["I", "ii", "ii7", "IV", "V7"], [["I", "ii", "V7", "I"], ["I", "ii7", "V7", "I"], ["I", "IV", "ii", "V7", "I"], ["ii", "V7", "I"], ["I", "ii7", "V7", "V7", "I"]], "Gordon, LSM p. 313 gives I II V7 I and I II7 V7 I; p. 320 keeps the supertonic back until after all the levels above."),
      L("F2", "Everything so far", ["major"], ["I", "ii", "IV", "V7", "vi", "viiø7"], null, "Random progressions from every major chord above.")
    ] },
    { id: "rock", label: "Rock and pop", blurb: "Three chords, then ♭VII and the four-chord loops; ii and the borrowed chords come late.", levels: [
      L("R1", "I and IV", ["major"], ["I", "IV"], [["I", "IV", "I", "IV"], ["I", "I", "IV", "I"], ["IV", "I", "IV", "I"], ["I", "IV", "IV", "I"]], ""),
      L("R2", "I and V", ["major"], ["I", "V"], [["I", "V", "I", "V"], ["I", "I", "V", "I"], ["V", "I", "V", "I"], ["I", "V", "V", "I"]], ""),
      L("R3", "Three chords", ["major"], ["I", "IV", "V"], [["I", "IV", "V", "I"], ["I", "V", "IV", "I"], ["I", "IV", "I", "V"], ["V", "IV", "I", "I"], ["I", "I", "IV", "V"]], ""),
      L("R4", "♭VII rock", ["mixolydian"], ["I", "IV", "bVII"], [["I", "bVII", "IV", "I"], ["I", "bVII", "I", "I"], ["bVII", "IV", "I", "I"], ["I", "IV", "bVII", "I"]], "♭VII–IV–I: Hutchinson ch. 9.6."),
      L("R5", "vi joins: the loops", ["major"], ["I", "IV", "V", "vi"], [["I", "V", "vi", "IV"], ["I", "vi", "IV", "V"], ["vi", "IV", "I", "V"], ["IV", "I", "V", "vi"], ["I", "IV", "vi", "V"]], "The best-seller progression and its rotations (Hutchinson ch. 9.7)."),
      L("R6", "Minor loops", ["aeolian"], ["i", "iv", "bIII", "bVI", "bVII"], [["i", "bVII", "bVI", "bVII"], ["i", "bVI", "bIII", "bVII"], ["i", "iv", "bVII", "i"], ["i", "bVI", "bVII", "i"], ["i", "bIII", "bVII", "iv"]], "i–VII–VI–VII (Hutchinson ch. 9.8)."),
      L("R7", "ii and iii", ["major"], ["I", "ii", "iii", "IV", "V", "vi"], [["I", "vi", "ii", "V"], ["I", "iii", "IV", "V"], ["ii", "V", "I", "I"], ["I", "iii", "vi", "IV"], ["IV", "V", "iii", "vi"]], ""),
      L("R8", "Borrowed chords", ["major"], ["I", "IV", "iv", "V", "bVI", "bVII"], [["I", "IV", "iv", "I"], ["I", "bVI", "bVII", "I"], ["I", "bVII", "IV", "I"], ["IV", "iv", "I", "I"], ["I", "bVI", "IV", "I"]], "Mode mixture (Hutchinson ch. 19)."),
      L("R9", "Twelve-bar blues", ["major"], ["I7", "IV7", "V7"], [["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"], ["I7", "IV7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "I7"]], "One chord a bar. The quick-change form has IV7 in bar 2.")
    ] },
    { id: "jazz", label: "Jazz", blurb: "ii–V–I from the start, then turnarounds, secondary dominants and substitutes.", levels: [
      L("J1", "ii–V–I in major", ["major"], ["Imaj7", "ii7", "V7"], [["ii7", "V7", "Imaj7"], ["Imaj7", "ii7", "V7", "Imaj7"], ["ii7", "V7", "Imaj7", "Imaj7"], ["ii7", "ii7", "V7", "Imaj7"]], ""),
      L("J2", "ii–V–i in minor", ["minor"], ["i7", "iiø7", "V7"], [["iiø7", "V7", "i7"], ["i7", "iiø7", "V7", "i7"], ["iiø7", "V7", "i7", "i7"]], "Minor tonic as i7 here; some players use i6 or i(maj7)."),
      L("J3", "Major or minor ii–V?", ["major", "minor"], null, null, "Answer with the tonality."),
      L("J4", "Turnaround", ["major"], ["Imaj7", "vi7", "ii7", "V7"], [["Imaj7", "vi7", "ii7", "V7"], ["Imaj7", "vi7", "ii7", "V7", "Imaj7"], ["vi7", "ii7", "V7", "Imaj7"]], ""),
      L("J5", "iii–vi–ii–V", ["major"], ["Imaj7", "iii7", "vi7", "ii7", "V7", "IVmaj7"], [["iii7", "vi7", "ii7", "V7", "Imaj7"], ["Imaj7", "IVmaj7", "iii7", "vi7", "ii7", "V7"], ["Imaj7", "iii7", "vi7", "ii7", "V7", "Imaj7"]], ""),
      L("J6", "Secondary dominants", ["major"], ["Imaj7", "ii7", "V7", "vi7", "VI7", "II7", "III7"], [["Imaj7", "VI7", "ii7", "V7"], ["Imaj7", "II7", "ii7", "V7", "Imaj7"], ["III7", "VI7", "II7", "V7", "Imaj7"], ["Imaj7", "vi7", "II7", "V7", "Imaj7"]], "VI7 = V7/ii, II7 = V7/V, III7 = V7/vi."),
      L("J7", "Tritone substitutes", ["major"], ["Imaj7", "ii7", "V7", "bII7"], [["ii7", "bII7", "Imaj7"], ["ii7", "V7", "Imaj7"], ["Imaj7", "ii7", "bII7", "Imaj7"], ["ii7", "bII7", "Imaj7", "Imaj7"]], "♭II7 for V7 (Hutchinson ch. 31)."),
      L("J8", "Backdoor and minor iv", ["major"], ["Imaj7", "IVmaj7", "iv7", "bVII7", "ii7", "V7"], [["IVmaj7", "iv7", "Imaj7"], ["iv7", "bVII7", "Imaj7"], ["Imaj7", "IVmaj7", "iv7", "bVII7", "Imaj7"], ["ii7", "V7", "iv7", "bVII7", "Imaj7"]], ""),
      L("J9", "Jazz blues", ["major"], ["I7", "IV7", "V7", "ii7", "VI7"], [["I7", "IV7", "I7", "I7", "IV7", "IV7", "I7", "VI7", "ii7", "V7", "I7", "V7"]], "One chord a bar.")
    ] },
    { id: "classical", label: "Classical (Hutchinson)", blurb: "Follows Music Theory for the 21st-Century Classroom: function, the circle of fifths, then chromatic chords.", levels: [
      L("K1", "Cadences: authentic and half", ["major"], ["I", "IV", "V", "V7"], [["I", "IV", "V", "I"], ["I", "IV", "I", "V"], ["I", "V7", "I"], ["IV", "I", "IV", "V"]], "Ch. 7. Listen to the last chord: tonic (authentic) or V (half)."),
      L("K2", "Predominants: ii and IV", ["major"], ["I", "ii", "IV", "V", "V7"], [["I", "ii", "V", "I"], ["I", "IV", "V7", "I"], ["I", "IV", "ii", "V"], ["I", "ii", "V7", "I"]], "Ch. 9.4: T → PD → D → T."),
      L("K3", "Deceptive cadence", ["major"], ["I", "ii", "IV", "V", "V7", "vi"], [["I", "IV", "V", "vi"], ["I", "IV", "V7", "I"], ["I", "V7", "vi", "IV"], ["I", "ii", "V", "vi"]], "Ch. 7: V to vi."),
      L("K4", "Circle of fifths", ["major"], ["I", "ii", "iii", "IV", "V", "vi", "viio"], [["I", "vi", "ii", "V", "I"], ["I", "IV", "viio", "iii", "vi", "ii", "V", "I"], ["iii", "vi", "ii", "V", "I"], ["vi", "ii", "V", "I"]], "Ch. 9.1."),
      L("K5", "Minor keys", ["minor"], ["i", "iio", "iv", "V", "V7", "VI"], [["i", "iv", "V", "i"], ["i", "iio", "V", "i"], ["i", "VI", "iv", "V"], ["i", "iv", "V7", "VI"]], "Ch. 7 and 9, harmonic minor."),
      L("K6", "Secondary dominants", ["major"], ["I", "ii", "IV", "V", "V7", "V7/V", "V7/ii", "V7/IV", "vi"], [["I", "V7/V", "V", "I"], ["I", "V7/ii", "ii", "V7", "I"], ["I", "V7/IV", "IV", "V7", "I"], ["I", "vi", "V7/V", "V", "I"]], "Ch. 17."),
      L("K7", "Mode mixture", ["major"], ["I", "IV", "iv", "V7", "bVI", "iio"], [["I", "iv", "V7", "I"], ["I", "IV", "iv", "I"], ["I", "bVI", "V7", "I"], ["I", "iio", "V7", "I"]], "Ch. 19."),
      L("K8", "Neapolitan", ["minor"], ["i", "iv", "bII", "V7"], [["i", "bII", "V7", "i"], ["i", "iv", "V7", "i"], ["i", "bII", "V7", "i"], ["i", "iv", "bII", "V7", "i"]], "Ch. 20. Played in root position here; the book's usual N6 has the 3rd in the bass.")
    ] },
    { id: "custom", label: "Make your own", blurb: "Pick a tonality and the chords; progressions are made at random from them.", levels: [] }
  ];

  // chords the "made" levels draw from, per mode
  var MODE_POOL = {
    major: ["I", "ii", "iii", "IV", "V", "V7", "vi", "viio", "viiø7", "bVII", "iv", "bVI", "Imaj7", "ii7", "vi7"],
    minor: ["i", "iio", "III", "iv", "V", "V7", "VI", "viio7", "bII"],
    aeolian: ["i", "iv", "v", "bIII", "bVI", "bVII"], dorian: ["i", "ii", "bIII", "IV", "v", "bVII"],
    mixolydian: ["I", "ii", "IV", "v", "vi", "bVII"], phrygian: ["i", "bII", "bIII", "iv", "bvii"],
    lydian: ["I", "II", "iii", "V", "vi"], locrian: ["io", "bII", "biii", "biv", "bV"]
  };
  // the characteristic loop of each tonality, for the "which tonality?" levels
  var MODE_LOOPS = {
    major: [["I", "IV", "V7", "I"], ["I", "V7", "I"]], minor: [["i", "iv", "V7", "i"], ["i", "V7", "i"]],
    dorian: [["i", "IV", "i"], ["i", "IV", "i", "IV"]], mixolydian: [["I", "bVII", "I"], ["I", "bVII", "IV", "I"]],
    aeolian: [["i", "bVII", "bVI", "bVII", "i"], ["i", "bVI", "bVII", "i"]], phrygian: [["i", "bII", "i"], ["i", "bII", "bIII", "bII", "i"]],
    lydian: [["I", "II", "I"], ["I", "II", "I", "II"]], locrian: [["io", "bII", "io"]]
  };
  var MADE = {   // levels with progs: null and more than one mode: what each mode plays
    D1: { major: { pool: ["I", "IV", "V7", "vi"], progs: [["I", "vi", "IV", "V7", "I"], ["I", "vi", "I"], ["I", "IV", "vi", "V7", "I"], ["I", "V7", "vi", "IV", "I"]] },
          minor: { pool: ["i", "iv", "V7", "VI"], progs: [["i", "VI", "iv", "V7", "i"], ["i", "VI", "i"], ["i", "iv", "VI", "V7", "i"], ["i", "V7", "VI", "iv", "i"]] } },
    E2: { major: { pool: ["I", "IV", "V7", "viio"], progs: [["I", "viio", "I"], ["I", "IV", "viio", "I"], ["I", "viio", "V7", "I"]] },
          minor: { pool: ["i", "iio", "iv", "V7", "viio7"], progs: [["i", "viio7", "i"], ["i", "iio", "V7", "i"], ["i", "iv", "viio7", "i"], ["i", "iio", "viio7", "i"]] } },
    C4: { phrygian: { pool: ["i", "bII", "bIII", "iv"], progs: [["i", "bII", "i"], ["i", "bII", "bIII", "bII", "i"], ["i", "iv", "bII", "i"]] },
          lydian: { pool: ["I", "II", "V", "vi"], progs: [["I", "II", "I"], ["I", "II", "V", "I"], ["I", "II", "vi", "I"]] } },
    J3: { major: { pool: ["Imaj7", "ii7", "V7"], progs: [["ii7", "V7", "Imaj7"]] }, minor: { pool: ["i7", "iiø7", "V7"], progs: [["iiø7", "V7", "i7"]] } }
  };
  function path(id) { for (var i = 0; i < PATHS.length; i++) if (PATHS[i].id === id) return PATHS[i]; return PATHS[0]; }

  // ---------- making progressions ----------
  function rndInt(rnd, n) { return Math.floor(rnd() * n); }
  function pick(rnd, a) { return a[rndInt(rnd, a.length)]; }
  function walk(pool, len, rnd) {
    rnd = rnd || Math.random;
    var tonic = pool.filter(function (t) { var c = parse(t); return c && c.root === 0 && !c.secondary; })[0];
    var out = [], prev = null;
    for (var i = 0; i < len; i++) {
      var opts = pool.filter(function (t) { return t !== prev; });
      if (tonic && (i === 0 || i === len - 1) && tonic !== prev) { out.push(tonic); prev = tonic; continue; }
      if (i === len - 2 && tonic) opts = opts.filter(function (t) { return t !== tonic; });   // something before the final tonic
      var t = pick(rnd, opts.length ? opts : pool); out.push(t); prev = t;
    }
    return out;
  }
  // what one mode of a level plays: { pool, progs }
  function modeSet(level, mode, opts) {
    if (level.progs) return { pool: level.pool, progs: level.progs };
    if (MADE[level.id] && MADE[level.id][mode]) return MADE[level.id][mode];
    if (level.modes.length > 1 && !level.pool) return { pool: [].concat.apply([], MODE_LOOPS[mode]).filter(uniqF), progs: MODE_LOOPS[mode] };
    var pool = level.pool || MODE_POOL[mode], n = (opts && opts.len) || 4, progs = [];
    for (var i = 0; i < 12; i++) progs.push(walk(pool, n, opts && opts.rnd));
    return { pool: pool, progs: progs };
  }
  function uniqF(x, i, a) { return a.indexOf(x) === i; }

  // ---------- questions ----------
  // kinds: change (two chords: same or changed), func (function of each chord), bass (the bass of each chord in solfège),
  //        rn (each chord's numeral), next (the last chord), same (two progressions: same or different), mode (which tonality),
//        inv (two steps a chord: the bass note in solfège, then root or not / which member). opts.inv "off" | "some" | "many" inverts chords
//        in every kind (q.invs: per progression, the member in the bass); a kind with steps has q.slots [{ chord, step, choices, labels }]
  var KINDS = [
    { id: "rn", label: "Name each chord (numerals)" }, { id: "func", label: "Name each function" },
    { id: "bass", label: "Name each bass note (solfège)" }, { id: "next", label: "What comes next?" },
    { id: "change", label: "Did the chord change?" }, { id: "same", label: "Same or different?" }, { id: "mode", label: "Which tonality?" },
    { id: "inv", label: "Inversions: the bass, then root or not" },
    { id: "voice", label: "Follow a voice (solfège)" }
  ];
  var MEMBER = ["Root", "3rd", "5th", "7th"];
  // the figure of an inverted chord: triads 6 / 64, sevenths 7 65 43 42 (Hutchinson ch. 7-8)
  function figured(tok, inv) {
    if (!inv) return pretty(tok);
    var c = parse(tok), sev = c.pcs.length === 4, parts = String(tok).split("/"), head = parts[0];
    var fig = sev ? ["7", "65", "43", "42"][inv] : ["", "6", "64"][inv];
    head = sev ? head.replace(/7$/, "") + fig : head + fig;
    return pretty(head + (parts[1] ? "/" + parts[1] : ""));
  }
  // which member is in the bass of each chord: 0 root, 1 3rd, 2 5th, 3 7th. rate = share of chords inverted (the last chord stays in root position)
  function inversions(prog, rate, rnd, force) {
    var out = prog.map(function (t, i) {
      if (!rate || i === prog.length - 1) return 0;
      var n = parse(t).pcs.length; return rnd() < rate ? 1 + rndInt(rnd, n - 1) : 0;
    });
    if (force && prog.length > 1 && out.every(function (x) { return !x; })) { var k = rndInt(rnd, prog.length - 1); out[k] = 1 + rndInt(rnd, parse(prog[k]).pcs.length - 1); }
    return out;
  }
  function question(level, kind, opts, rnd) {
    opts = opts || {}; rnd = rnd || Math.random;
    var mode = pick(rnd, level.modes), set = modeSet(level, mode, { len: opts.len, rnd: rnd });
    var prog = pick(rnd, set.progs).slice();
    if (opts.len && !level.progs && set.progs[0].length !== opts.len) prog = walk(set.pool, opts.len, rnd);
    var pool = set.pool.slice().sort(byRoot);
    var rate = { off: 0, some: 0.3, many: 0.6 }[opts.inv || "off"] || 0;
    if (kind === "inv" && !rate) rate = 0.5;
    var q = { kind: kind, mode: mode, progs: [prog], pool: pool, invs: [inversions(prog, rate, rnd, kind === "inv")] };
    if (kind === "mode" || level.modes.length > 1 && kind === "mode") {
      q.answer = [mode]; q.choices = level.modes.slice(); q.labels = level.modes.map(function (m) { return MODES[m].label; });
    } else if (kind === "change") {
      var a = pick(rnd, pool), b = rnd() < 0.5 ? a : pick(rnd, pool.filter(function (t) { return t !== a; }).concat(pool.length < 2 ? [a] : []));
      q.progs = [[a, b]]; q.invs = [[0, 0]]; q.answer = [a === b ? "same" : "changed"]; q.choices = ["same", "changed"]; q.labels = ["Same", "Changed"];
    } else if (kind === "same") {
      var p2 = prog.slice();
      if (rnd() >= 0.5) {   // change one chord, not the first
        var idx = 1 + rndInt(rnd, Math.max(1, prog.length - 1)); if (idx >= prog.length) idx = prog.length - 1;
        var others = pool.filter(function (t) { return t !== prog[idx] && t !== prog[idx - 1] && t !== prog[idx + 1]; });
        if (!others.length) others = pool.filter(function (t) { return t !== prog[idx]; });
        if (others.length) p2[idx] = pick(rnd, others);
      }
      q.invs = [q.invs[0], q.invs[0].map(function (v, i) { return p2[i] === prog[i] ? v : 0; })];
      q.progs = [prog, p2]; q.answer = [prog.join() === p2.join() ? "same" : "different"]; q.choices = ["same", "different"]; q.labels = ["Same", "Different"];
    } else if (kind === "next") {
      q.answer = [prog[prog.length - 1]]; q.choices = pool; q.labels = pool.map(pretty); q.hidden = 1;
    } else if (kind === "func") {
      q.answer = prog.map(fn); q.choices = pool.map(fn).filter(uniqF); q.labels = q.choices.slice();
    } else if (kind === "voice") {   // the page fills the answer once the chords are voiced (it depends on the voicing)
      q.answer = []; q.choices = poolSyls(pool, mode); q.labels = q.choices.slice();
    } else if (kind === "bass" || kind === "inv") {
      var inv = q.invs[0];
      var bassSyl = prog.map(function (t, i) { return spelledSyl(t, inv[i], mode); });
      var sylChoices = poolSyls(pool, mode, !rate);
      if (kind === "bass") { q.answer = bassSyl; q.choices = sylChoices; q.labels = sylChoices.slice(); }
      else {   // two steps a chord: the bass note, then root or not (or which member)
        var detail = opts.invDetail === "member", maxN = Math.max.apply(null, pool.map(function (t) { return parse(t).pcs.length; }));
        var memC = detail ? MEMBER.slice(0, maxN) : ["root", "not"], memL = detail ? memC.slice() : ["Root", "Not the root"];
        q.answer = []; q.slots = [];
        prog.forEach(function (t, i) {
          q.answer.push(bassSyl[i]); q.slots.push({ chord: i, step: "bass", choices: sylChoices, labels: sylChoices });
          q.answer.push(detail ? MEMBER[inv[i]] : inv[i] ? "not" : "root"); q.slots.push({ chord: i, step: "member", choices: memC, labels: memL });
        });
        q.choices = sylChoices.concat(memC); q.labels = sylChoices.concat(memL);
      }
    } else {
      q.kind = "rn"; q.answer = prog.slice(); q.choices = pool; q.labels = pool.map(pretty);
    }
    return q;
  }
  // A chord tone's syllable, spelled from the chord: the 3rd of V7/V is Fi (raised), the root of bVII is Te (lowered).
  // DegreeNames' own table names every chromatic note one way, so it is used only when the site-wide choice is not solfège.
  var PLAIN = ["Do", "Re", "Mi", "Fa", "So", "La", "Ti"], RAISED = ["Di", "Ri", "Mi♯", "Fi", "Si", "Li", "Ti♯"], LOWERED = ["Do♭", "Ra", "Me", "Fa♭", "Se", "Le", "Te"];
  var MODE_STEP = { major: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, minor: 5, aeolian: 5, locrian: 6 };
  function spelledSyl(tok, member, mode) {
    var c = parse(tok), rel = c.pcs[member || 0];
    if (global.DegreeNames && global.DegreeNames.get && global.DegreeNames.get() !== "solfege") return syllable(rel, mode);
    var off = (MODES[mode] || MODES.major).doOff, step = ((MODE_STEP[mode] || 0) + c.deg + 2 * (member || 0)) % 7;
    var fromDo = (((rel - off) % 12) + 12) % 12, diff = ((fromDo - MAJ[step] + 18) % 12) - 6;
    return diff === 0 ? PLAIN[step] : diff === 1 ? RAISED[step] : diff === -1 ? LOWERED[step] : syllable(rel, mode);
  }
  // the semitones above the resting tone that a syllable names in a mode (null if none)
  function sylToRel(syl, mode) {
    for (var r = 0; r < 12; r++) if (syllable(r, mode) === syl) return r;
    var off = (MODES[mode] || MODES.major).doOff;
    for (var st = 0; st < 7; st++) {
      var d = PLAIN[st] === syl ? 0 : RAISED[st] === syl ? 1 : LOWERED[st] === syl ? -1 : null;
      if (d != null) return (((MAJ[st] + d + off) % 12) + 12) % 12;
    }
    return null;
  }
  // every chord tone of a pool, as spelled syllables, low to high (roots only when rootsOnly)
  function poolSyls(pool, mode, rootsOnly) {
    var out = [];
    pool.forEach(function (t) { parse(t).pcs.forEach(function (pc, k) { if (!rootsOnly || !k) out.push(spelledSyl(t, k, mode)); }); });
    return out.filter(uniqF).sort(function (a, b) { return sylToRel(a, mode) - sylToRel(b, mode); });
  }
  // typing an answer: which choices the typed text could still become. Numerals are case-sensitive (ii is not II); b = ♭, o = °, h = ø.
  function typeMatch(typed, choices, labels, caseSens) {
    function norm(x) { x = String(x).replace(/♭/g, "b").replace(/♯/g, "#").replace(/°/g, "o").replace(/ø/g, "h"); return caseSens ? x : x.toLowerCase(); }
    var t = norm(typed).replace(/ø/g, "h"), exact = [], prefix = [];
    choices.forEach(function (c, i) {
      var keys = [norm(c), norm(labels[i])];
      if (keys.some(function (k) { return k === t; })) exact.push(c);
      if (keys.some(function (k) { return k.indexOf(t) === 0; })) prefix.push(c);
    });
    return { exact: exact, prefix: prefix };
  }
  function byRoot(a, b) { var x = parse(a), y = parse(b); return x.root - y.root || (a < b ? -1 : 1); }
  function pretty(t) { return String(t).replace(/^b/, "♭").replace(/\/b/, "/♭").replace(/o7/, "°7").replace(/o$/, "°").replace(/^#/, "♯"); }

  // ---------- voicing ----------
  var NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  var SYM = { maj: "", min: "m", dim: "dim", aug: "aug", dom7: "7", min7: "m7", maj7: "maj7", hd7: "m7b5", dim7: "dim7", minmaj7: "m" };
  function symbol(tok, restPc, inv) { var c = parse(tok); return NAMES[(c.root + restPc) % 12] + SYM[c.q] + (inv ? "/" + NAMES[(c.pcs[inv] + restPc) % 12] : ""); }
  function nearOct(pc, target) { var m = target + ((((pc - target) % 12) + 12) % 12); return m - target > 6 ? m - 12 : m; }
  // upper voices: every arrangement of the wanted pitch classes in [lo, hi], adjacent voices within an octave
  function uppers(c, n, lo, hi, inv, maxGap) {
    maxGap = maxGap || 12;
    var p = c.pcs, sets = [];
    if (inv) {   // an inversion: the tones not in the bass, 3rd and 7th first; a triad keeps all three
      var rest = [1, 3, 0, 2].filter(function (k) { return k < p.length && k !== inv; }).map(function (k) { return p[k]; });
      if (n === 2) sets = [[rest[0], rest[1]], [rest[0], rest[2] != null ? rest[2] : rest[1]]];
      else sets = p.length === 4 ? [rest] : [[p[0], p[1], p[2]]];
    }
    else if (n === 2) sets = p.length === 4 ? [[p[1], p[3]]] : [[p[1], p[0]], [p[1], p[2]]];
    else sets = p.length === 4 ? [[p[1], p[2], p[3]], [p[0], p[1], p[3]]] : [[p[0], p[1], p[2]]];
    var out = [];
    sets.forEach(function (s, si) {
      (function rec(i, acc) {
        if (i === s.length) { var v = acc.slice().sort(function (a, b) { return a - b; });
          for (var k = 1; k < v.length; k++) if (v[k] - v[k - 1] > maxGap || v[k] === v[k - 1]) return;
          out.push({ m: v, pen: si * 3 }); return; }
        for (var m = lo; m <= hi; m++) if (((m % 12) + 12) % 12 === s[i]) { acc.push(m); rec(i + 1, acc); acc.pop(); }
      })(0, []);
    });
    return out;
  }
  function voice(tokens, restPc, opts) {
    opts = opts || {}; var invs = opts.inv || [], n = (opts.voices || 4) - 1, sp = opts.spacing || "";
    var lo = opts.lo || (sp === "open" ? 50 : 57), hi = opts.hi || lo + (sp === "open" ? 31 : 22), bassC = opts.bassCenter || 45;
    function withPcs(out) { out.forEach(function (o, i) { o.pcs = parse(tokens[i]).pcs.map(function (x) { return (x + restPc) % 12; }); }); return out; }
    if (n === 3 && !sp && global.SATB && global.SATB.voice && !opts.own) {
      var v = global.SATB.voice(tokens.map(function (t, i) { return symbol(t, restPc, invs[i]); }), restPc);
      var fits = v.every(function (x, i) { if (!x) return false; var want = parse(tokens[i]).pcs.map(function (y) { return (y + restPc) % 12; });
        return [x.b, x.t, x.a, x.s].every(function (m) { return want.indexOf(((m % 12) + 12) % 12) >= 0; }) && ((x.b % 12) + 12) % 12 === want[invs[i] || 0]; });
      if (fits) return withPcs(v.map(function (x) { return { bass: x.b, upper: [x.t, x.a, x.s] }; }));
    }
    var out = [], prev = null, prevBass = bassC;
    tokens.forEach(function (t, ti) {
      var c = parse(t), abs = { pcs: c.pcs.map(function (x) { return (x + restPc) % 12; }) }, iv = invs[ti] || 0;
      var bass = nearOct(abs.pcs[iv], prevBass); if (bass < 38) bass += 12; if (bass > 55) bass -= 12;
      var cands = uppers(abs, n, lo, hi, iv, sp === "open" && n === 2 ? 21 : 12), best = null, bc = Infinity;
      // close: the upper voices within an octave; open: wider than an octave (two upper voices: more than an octave apart)
      if (sp) { var f = cands.filter(function (cd) { var w = cd.m[n - 1] - cd.m[0]; return sp === "close" ? w <= 12 : w > 12; }); if (f.length) cands = f; }
      cands.forEach(function (cd) {
        var cost = cd.pen;
        if (prev) for (var i = 0; i < n; i++) cost += Math.abs(cd.m[i] - prev[i]);
        else cost += Math.abs(cd.m[0] - (lo + 6)) + Math.abs(cd.m[n - 1] - (lo + 16));
        if (cd.m[0] - bass < 7) cost += 6;
        if (cost < bc) { bc = cost; best = cd.m; }
      });
      out.push({ bass: bass, upper: best || [] }); prev = best; prevBass = bass;
    });
    return withPcs(out);
  }

  // ---------- notation ----------
  // Each chord is spelled from its numeral: the root's letter is the scale step above the tonic's letter, then 3rd, 5th, 7th by letter,
  // so V7 in A minor has G♯ (si), not A♭. The key signature is the major key of DO (a Dorian on D shows no sharps or flats).
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var DO_NAME = { 0: ["C", 0], 1: ["Db", -5], 2: ["D", 2], 3: ["Eb", -3], 4: ["E", 4], 5: ["F", -1], 6: ["F#", 6], 7: ["G", 1], 8: ["Ab", -4], 9: ["A", 3], 10: ["Bb", -2], 11: ["B", 5] };
  var MODE_DEG = { major: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, minor: 5, aeolian: 5, locrian: 6 };
  function keySig(lof) {   // letter index -> accidental (+1 sharp, -1 flat) in the key signature
    var sig = [0, 0, 0, 0, 0, 0, 0], i;
    for (i = 0; i < lof; i++) sig[LET.indexOf("FCGDAEB"[i])] = 1;
    for (i = 0; i < -lof; i++) sig[LET.indexOf("BEADGCF"[i])] = -1;
    return sig;
  }
  function spellKey(restPc, mode) {
    var doPc = (((restPc + (MODES[mode] || MODES.major).doOff) % 12) + 12) % 12, dn = DO_NAME[doPc];
    return { doName: dn[0], sig: keySig(dn[1]), tonicLetter: (LET.indexOf(dn[0][0]) + (MODE_DEG[mode] || 0)) % 7 };
  }
  function abcNote(midi, letter, sig) {
    var pc = ((midi % 12) + 12) % 12, acc = ((pc - NAT[letter] + 18) % 12) - 6;
    if (acc > 2 || acc < -2) acc = 0;
    var oct = Math.round((midi - acc - NAT[letter]) / 12) - 1;
    var a = acc === sig[letter] ? "" : { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" }[acc];
    var L = LET[letter];
    var n = oct >= 5 ? L.toLowerCase() + new Array(oct - 4).join("'") : L + new Array(Math.max(0, 4 - oct) + 1).join(",");
    return a + n;
  }
  // progs: [[tokens]], voiced: [[{ bass, upper }]], invs; opts { hideLast, numerals, restPc, mode, beats }  -> ABC (treble + bass staff)
  function toAbc(progs, voiced, invs, opts) {
    var k = spellKey(opts.restPc, opts.mode), d = opts.beats || 2, top = [], bot = [];
    progs.forEach(function (prog, pi) {
      var n = opts.hideLast && pi === 0 ? prog.length - 1 : prog.length;
      for (var i = 0; i < n; i++) {
        var c = parse(prog[i]), ch = voiced[pi][i], rootL = (k.tonicLetter + c.deg) % 7;
        function letterOf(m) { var pc = ((m - (opts.restPc || 0)) % 12 + 12) % 12, idx = c.pcs.indexOf(pc); return idx < 0 ? rootL : (rootL + 2 * idx) % 7; }
        var all = (ch.bass != null ? [ch.bass] : []).concat(ch.upper || []);
        var hi = all.filter(function (m) { return m >= 60; }), lo = all.filter(function (m) { return m < 60; });
        function group(ms) { if (!ms.length) return "z" + d; var t = ms.map(function (m) { return abcNote(m, letterOf(m), k.sig); }); return (t.length > 1 ? "[" + t.join("") + "]" : t[0]) + d; }
        var ann = opts.numerals ? '"_' + figured(prog[i], (invs[pi] || [])[i] || 0).replace(/"/g, "") + '"' : "";
        top.push(group(hi)); bot.push(ann + group(lo));
        var end = i === n - 1 && pi < progs.length - 1 ? " || " : " | ";
        top.push(end); bot.push(end);
      }
    });
    top.pop(); bot.pop();
    return "X:1\nL:1/4\nM:none\n%%staves {1 2}\nK:" + k.doName + "\nV:1 clef=treble\nV:2 clef=bass\n[V:1] " + top.join("") + "|]\n[V:2] " + bot.join("") + "|]\n";
  }

  var api = { parse: parse, toAbc: toAbc, spellKey: spellKey, fn: fn, syllable: syllable, MODES: MODES, PATHS: PATHS, path: path, walk: walk, modeSet: modeSet,
              question: question, KINDS: KINDS, sylToRel: sylToRel, spelledSyl: spelledSyl, typeMatch: typeMatch, voice: voice, figured: figured, inversions: inversions, symbol: symbol, pretty: pretty, MODE_POOL: MODE_POOL };
  global.HarmonyEar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  // ================= the page =================
  var KEY = "harmonyEar.v1";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
  var ST = load();
  var DEF = { path: "mlt", level: "A1", kind: "rn", voices: 4, key: "random", tempo: 72, beats: 2, establish: "cadence", len: 4,
              piano: "piano", bass: "bass", repeat: 1, given: "first", auto: 0, customMode: "major", customPool: ["I", "IV", "V7"], inv: "off", invDetail: "root", bassOnly: 0,
              gap: 0, bring: "", arp: "off", pan: 0, spacing: "", leave: "", length: "full", reg: 0,
              drone: "off", follow: "s", notation: "off", rekey: "same", slow: 0, topSound: "", hist: {} };
  Object.keys(DEF).forEach(function (k) { if (ST[k] == null) ST[k] = DEF[k]; });

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function opt(sel, v, label) { var o = el("option", null, label); o.value = v; sel.appendChild(o); return o; }

  // ---- sound
  var snd = null, timers = [];
  function sound() {
    if (snd) return snd;
    snd = new Promise(function (res, rej) {
      var ac = new (global.AudioContext || global.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) try { global.AudioTap.register(ac, out, "Hearing Harmony"); } catch (e) {}
      var bank = global.BandSounds.create(ac), pan = {};
      ["s", "a", "t", "b"].forEach(function (v) { if (ac.createStereoPanner) { pan[v] = ac.createStereoPanner(); pan[v].connect(out); } else pan[v] = out; });
      res({ ac: ac, bank: bank, out: out, pan: pan });
    });
    return snd;
  }
  function ready() {
    return sound().then(function (b) {
      setStatus("Loading sounds…");
      return b.bank.load([ST.piano, ST.bass, ST.topSound].filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; })).then(function () { setStatus(""); return b; });
    });
  }
  // a soft drone on the resting tone (and its 5th) under the progression: two low triangle waves, its own small mixer
  var drone = null;
  function droneOn(rest) {
    if (ST.drone === "off") return Promise.resolve();
    return sound().then(function (b) {
      droneOff(); var g = b.ac.createGain(), t = b.ac.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.3); g.connect(b.out);
      var pcs = ST.drone === "fifth" ? [0, 7] : [0];
      var oscs = pcs.map(function (iv) { var o = b.ac.createOscillator(); o.type = "triangle";
        o.frequency.value = 440 * Math.pow(2, (36 + ((rest + iv) % 12) - 69 + 12) / 12); o.connect(g); o.start(t); return o; });
      drone = { g: g, oscs: oscs, ac: b.ac };
    });
  }
  function droneOff() {
    if (!drone) return; var d = drone, t = d.ac.currentTime; drone = null;
    d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.linearRampToValueAtTime(0, t + 0.25);
    d.oscs.forEach(function (o) { o.stop(t + 0.3); });
  }
  function stop() { droneOff(); timers.forEach(clearTimeout); timers = []; if (snd) snd.then(function (b) { b.bank.stopAll(); }); }

  // the voices of a chord, low to high: [{ midi, role: "b" | "t" | "a" | "s", inst }]. Three voices: bass, a (the middle) and s.
  function voicesOf(ch) {
    var up = ch.upper || [], roles = up.length === 3 ? ["t", "a", "s"] : up.length === 2 ? ["a", "s"] : ["s"];
    var out = ch.bass != null ? [{ midi: ch.bass, role: "b", inst: "bass" }] : [];
    up.forEach(function (m, i) { out.push({ midi: m + 12 * (+ST.reg || 0), role: roles[i], inst: "piano" }); });
    return out;
  }
  // is this note the voice or chord member being brought out? ("s" "a" "t" "b", or "root" "3rd" "5th" "7th")
  function brought(v, ch) {
    var k = ST.bring; if (!k) return null;
    if (/^[satb]$/.test(k)) return v.role === k;
    var idx = MEMBER.map(function (m) { return m.toLowerCase(); }).indexOf(k);
    return ch.pcs && idx >= 0 && ch.pcs[idx] != null ? ((v.midi % 12) + 12) % 12 === ch.pcs[idx] : null;
  }
  var PAN = { 4: { s: 0.5, a: 0.2, t: -0.2, b: -0.5 }, 3: { s: 0.5, a: 0, t: 0, b: -0.5 } };
  // plays chords; returns a Promise when done. lit(i) is called as chord i sounds.
  // Each chord sounds for "beats per chord", then ST.gap seconds of silence. ST.arp spreads its notes: roll (quick), up, down.
  function playChords(chords, opts) {
    opts = opts || {};
    return ready().then(function (b) {
      b.ac.resume();
      var sc = opts.scale || 1, spb = 60 / ST.tempo, dur = spb * (opts.beats || ST.beats) * sc, gap = (opts.beats ? 0.1 : (+ST.gap || 0)) * sc, t0 = b.ac.currentTime + 0.08;
      var pans = PAN[ST.voices] || PAN[4];
      Object.keys(b.pan).forEach(function (r) { if (b.pan[r].pan) b.pan[r].pan.value = +ST.pan ? pans[r] : 0; });
      var len = ST.length === "short" ? 0.45 : 0.95;
      chords.forEach(function (ch, i) {
        var t = t0 + i * (dur + gap), vs = voicesOf(ch).filter(function (v) { return v.role !== ST.leave; });
        var order = ST.arp === "down" ? vs.slice().reverse() : vs, step = ST.arp === "roll" ? 0.06 : ST.arp === "up" || ST.arp === "down" ? dur / Math.max(1, vs.length) : 0;
        order.forEach(function (v, k) {
          var on = ST.arp === "off" ? 0 : k * step, inst = v.inst === "bass" ? ST.bass : v.role === "s" && ST.topSound && v.inst === "piano" && (ch.upper || []).length > 1 ? ST.topSound : ST.piano; if (!inst) return;
          var vel = v.inst === "bass" ? 0.75 : 0.6, hit = brought(v, ch);
          if (hit === true) vel = Math.min(1, vel * 1.5); else if (hit === false) vel *= 0.6;
          b.bank.play(inst, { midi: v.midi, vel: vel, dur: Math.max(0.15, dur * len - on) }, t + on, b.pan[v.role] || b.out);
        });
        if (opts.lit) timers.push(setTimeout(function () { opts.lit(i); }, (t - b.ac.currentTime) * 1000));
      });
      var total = (t0 - b.ac.currentTime) + chords.length * (dur + gap) - gap;
      return new Promise(function (r) { timers.push(setTimeout(function () { if (opts.lit) opts.lit(-1); r(); }, total * 1000 + 150)); });
    });
  }

  // ---- state of the current question
  var cur = null;   // { q, rest, voiced: [[chords]], est: [chords], filled: [], checked }
  var root, ui = {};

  function level() {
    if (ST.path === "custom") {
      return L("custom", "Your chords in " + MODES[ST.customMode].label, [ST.customMode], ST.customPool.length ? ST.customPool : ["I"], null, "");
    }
    var p = path(ST.path), lv = p.levels.filter(function (x) { return x.id === ST.level; })[0];
    return lv || p.levels[0];
  }
  function histKey() { return ST.path + ":" + (ST.path === "custom" ? "custom" : level().id) + ":" + ST.kind; }
  function record(ok) {
    var k = histKey(), h = ST.hist[k] || []; h.push(ok ? 1 : 0); if (h.length > 10) h.shift(); ST.hist[k] = h; save(); score();
  }
  function score() {
    var h = ST.hist[histKey()] || [], n = h.reduce(function (a, b) { return a + b; }, 0);
    ui.score.textContent = h.length ? "Last " + h.length + ": " + n + " right" + (h.length >= 10 && n >= 8 ? " · ready for the next level ✓" : "") : "No answers yet at this level.";
  }
  function setStatus(s) { if (ui.status) ui.status.textContent = s; }

  function restPc() { return ST.key === "random" ? Math.floor(Math.random() * 12) : +ST.key; }
  function establishChords(mode, rest) {
    if (ST.establish === "none") return null;
    var toks = ST.establish === "tonic" ? [mode === "major" || mode === "mixolydian" || mode === "lydian" ? "I" : mode === "locrian" ? "io" : "i"]
      : (({ major: ["I", "IV", "V7", "I"], minor: ["i", "iv", "V7", "i"] })[mode] || MODE_LOOPS[mode][0]);
    return voice(toks, rest, { voices: ST.voices });
  }

  function revoice(q, rest, spacing) { return q.progs.map(function (p, pi) { return voice(p, rest, { voices: ST.voices, inv: q.invs[pi], spacing: spacing }); }); }
  function followRole() { var r = ST.follow; return +ST.voices === 3 && r === "t" ? "a" : r; }
  function setVoiceAnswer() {
    var role = followRole();
    cur.q.answer = cur.voiced[0].map(function (ch, i) {
      var v = voicesOf(ch).filter(function (x) { return x.role === role; })[0], m = v ? v.midi : ch.bass, tok = cur.q.progs[0][i];
      var k = parse(tok).pcs.indexOf(((m - cur.rest) % 12 + 12) % 12);
      return k >= 0 ? spelledSyl(tok, k, cur.q.mode) : syllable(((m - cur.rest) % 12 + 12) % 12, cur.q.mode);
    });
  }
  var ROLE_NAME = { s: "soprano", a: "alto", t: "tenor", b: "bass" };
  function newQuestion() {
    stop();
    var lv = level();
    var q = question(lv, ST.kind, { len: ST.len, inv: ST.inv, invDetail: ST.invDetail }, Math.random);
    var rest = restPc();
    typed = "";
    cur = { q: q, rest: rest, voiced: revoice(q, rest, ST.spacing),
            est: establishChords(q.mode, rest), filled: [], checked: false };
    if (q.kind === "voice") setVoiceAnswer();
    if (ST.given === "first" && (q.kind === "rn" || q.kind === "func" || q.kind === "bass" || q.kind === "voice") && q.answer.length > 1) cur.filled[0] = q.answer[0];
    if (ST.given === "first" && q.kind === "inv" && q.answer.length > 2) { cur.filled[0] = q.answer[0]; cur.filled[1] = q.answer[1]; }
    draw(); playAll(true);
  }

  // first = the first hearing of a new question (played slower when "First hearing" is half speed)
  function playAll(first) {
    if (!cur) return; stop();
    var seq = Promise.resolve(), hide = cur.q.kind === "next" && !cur.checked;
    if (cur.est) seq = seq.then(function () { setStatus("Tonality…"); return playChords(cur.est, { beats: 1 }); }).then(pause(600));
    cur.voiced.forEach(function (v, pi) {
      for (var r = 0; r < (+ST.repeat || 1); r++) (function (r) {
        seq = seq.then(function () {
          var rest = cur.rest, chords = v, moved = r > 0 && ST.rekey === "new";
          if (moved) { rest = (cur.rest + 1 + Math.floor(Math.random() * 11)) % 12; chords = voice(cur.q.progs[pi], rest, { voices: ST.voices, inv: cur.q.invs[pi], spacing: ST.spacing }); }
          if (hide) chords = chords.slice(0, -1);
          var est = moved ? establishChords(cur.q.mode, rest) : null;
          var pre = est ? (setStatus("New key: " + NAMES[rest].replace("b", "♭") + "…"), playChords(est, { beats: 1 }).then(pause(400))) : Promise.resolve();
          return pre.then(function () { return droneOn(rest); }).then(function () {
            setStatus(cur.voiced.length > 1 ? "Progression " + (pi + 1) : first && r === 0 && +ST.slow ? "Listen (slowly)…" : "Listen…");
            return playChords(chords, { lit: function (i) { light(pi, i); }, scale: first && r === 0 && +ST.slow ? 2 : 1 });
          }).then(function () { droneOff(); });
        }).then(pause(400));
      })(r);
      if (hide) seq = seq.then(function () { setStatus("What comes next?"); });
    });
    return seq.then(function () { if (!cur.checked && !hide) setStatus(""); });
  }
  function pause(ms) { return function () { return new Promise(function (r) { timers.push(setTimeout(r, ms)); }); }; }
  // notation: "off" | "after" (once answered) | "on"
  var notaEls = [];
  function notaCount(q) { return q.progs.reduce(function (a, p) { return a + p.length; }, 0); }
  function drawNotation() {
    if (!ui.nota) return;
    var show = cur && (ST.notation === "on" || ST.notation === "after" && cur.checked);
    ui.nota.style.display = show ? "" : "none"; notaEls = [];
    if (ui.notaBtn) { ui.notaBtn.textContent = ST.notation === "off" ? "♫ Show notation" : "♫ Hide notation"; ui.notaBtn.classList.toggle("he-sel", ST.notation !== "off"); }
    if (!show) return;
    if (!global.ABCJS) { ui.nota.textContent = "The notation could not be loaded."; return; }
    var q = cur.q, abc = toAbc(q.progs, cur.voiced, q.invs, { restPc: cur.rest, mode: q.mode, beats: 2,
      hideLast: q.kind === "next" && !cur.checked, numerals: cur.checked });
    global.ABCJS.renderAbc(ui.nota, abc, { responsive: "resize", staffwidth: Math.min(640, 90 + 80 * notaCount(q)), add_classes: true, paddingtop: 0, paddingbottom: 12 });
    ui.nota.dataset.abc = abc;
    // the drawn notes of each chord, in order, for lighting them as they sound
    var v0 = [].slice.call(ui.nota.querySelectorAll(".abcjs-v0.abcjs-note, .abcjs-v0.abcjs-rest")),
        v1 = [].slice.call(ui.nota.querySelectorAll(".abcjs-v1.abcjs-note, .abcjs-v1.abcjs-rest"));
    var k = 0;
    q.progs.forEach(function (p, pi) { var n = q.kind === "next" && !cur.checked && pi === 0 ? p.length - 1 : p.length;
      for (var i = 0; i < n; i++, k++) notaEls.push({ pi: pi, i: i, els: [v0[k], v1[k]].filter(Boolean) }); });
  }
  function light(pi, i) {
    notaEls.forEach(function (x) { x.els.forEach(function (e) { e.classList.toggle("he-lit", x.pi === pi && x.i === i); }); });
    [].forEach.call(root.querySelectorAll(".he-slot, .he-one"), function (s) { s.classList.toggle("he-on", +s.dataset.p === pi && +s.dataset.i === i); });
  }

  function slotCount() { var k = cur.q.kind; return k === "rn" || k === "func" || k === "bass" || k === "inv" || k === "voice" ? cur.q.answer.length : 1; }
  function slotChoices(i) { var q = cur.q; return q.slots ? q.slots[i] : q; }
  function nextEmpty() { for (var i = 0; i < slotCount(); i++) if (!cur.filled[i]) return i; return -1; }
  // one ▶ per chord heard (the hidden last chord of "What comes next?" only after checking)
  function drawOnes() {
    ui.ones.innerHTML = "";
    cur.voiced.forEach(function (v, pi) {
      var row = el("div", "he-onerow");
      row.appendChild(el("span", "he-hint", cur.voiced.length > 1 ? (pi ? "B" : "A") : "Chords"));
      var n = cur.q.kind === "next" && !cur.checked ? v.length - 1 : v.length;
      for (var i = 0; i < n; i++) (function (i) {
        var b = el("button", "he-one", "▶ " + (i + 1)); b.type = "button"; b.dataset.p = pi; b.dataset.i = i;
        b.title = "Play chord " + (i + 1) + " alone";
        b.onclick = function () { stop(); var ch = v[i]; playChords([+ST.bassOnly ? { bass: ch.bass, upper: [] } : ch], { lit: function (k) { light(k < 0 ? -1 : pi, k < 0 ? -1 : i); } }); };
        row.appendChild(b);
      })(i);
      ui.ones.appendChild(row);
    });
    if (cur.checked || cur.q.kind !== "next") {
      var vr = el("div", "he-onerow"); vr.appendChild(el("span", "he-hint", "Hear it"));
      [["close", "Close"], ["open", "Open"], ["", "Voice-led"]].forEach(function (x) {
        var vb = el("button", "he-one he-spacing", x[1]); vb.type = "button"; vb.title = "Play this exercise again in " + x[1].toLowerCase() + " position";
        vb.onclick = function () { stop(); var vv = revoice(cur.q, cur.rest, x[0]), seq = Promise.resolve();
          vv.forEach(function (v, pi) { seq = seq.then(function () { return playChords(v, { lit: function (i) { light(pi, i); } }); }).then(pause(400)); }); };
        vr.appendChild(vb);
      });
      ui.ones.appendChild(vr);
    }
    var t = el("button", "he-bassonly" + (+ST.bassOnly ? " he-sel" : ""), +ST.bassOnly ? "Bass alone ✓" : "Bass alone"); t.type = "button";
    t.title = "The ▶ buttons play only the bass note";
    t.onclick = function () { ST.bassOnly = +ST.bassOnly ? 0 : 1; save(); drawOnes(); };
    ui.ones.firstChild.appendChild(t);
  }
  function draw() {
    ui.slots.innerHTML = ""; ui.choices.innerHTML = ""; ui.result.textContent = "";
    var q = cur.q, n = slotCount();
    ui.prompt.textContent = ({ rn: "Name each chord.", func: "Name each chord's function.", bass: "Name each bass note.", next: "Which chord comes next?",
      change: "Did the chord change?", same: "Two progressions: the same or different?", mode: "Which tonality?",
      voice: "Follow the " + (+ST.voices === 3 ? { s: "top", a: "middle", t: "middle", b: "bass" }[ST.follow] + " voice" : ROLE_NAME[ST.follow]) + ": its note in each chord.",
      inv: "For each chord: the bass note, then " + (ST.invDetail === "member" ? "which chord member it is." : "is it the root?") })[q.kind];
    ui.mode.textContent = ST.kind === "mode" || level().modes.length === 1 || cur.checked ? "Tonality: " + MODES[q.mode].label : "Tonality: ?";
    for (var i = 0; i < n; i++) {
      var s = el("button", "he-slot", cur.filled[i] ? label(cur.filled[i], i) : "?"); s.type = "button"; s.dataset.p = 0;
      s.dataset.i = q.kind === "next" ? q.progs[0].length - 1 : q.slots ? q.slots[i].chord : i;
      if (q.slots) { s.classList.add(q.slots[i].step === "bass" ? "he-step1" : "he-step2"); s.title = "Chord " + (q.slots[i].chord + 1) + (q.slots[i].step === "bass" ? ": bass note" : ": root or not"); }
      if (!cur.checked && i === nextEmpty()) { s.classList.add("he-next"); if (typed) s.textContent = typed + "…"; }
      if (!cur.filled[i]) s.classList.add("he-empty");
      (function (i) { s.onclick = function () { if (cur.checked) return; if (ST.given === "first" && (q.slots ? i < 2 : i === 0) && n > 1) return; cur.filled[i] = null; draw(); }; })(i);
      if (q.slots) {   // the two steps of a chord sit together in a numbered box
        if (q.slots[i].step === "bass") { var pair = el("div", "he-pair"); pair.appendChild(el("span", "he-pairn", String(q.slots[i].chord + 1))); ui.slots.appendChild(pair); }
        ui.slots.lastChild.appendChild(s);
      } else ui.slots.appendChild(s);
    }
    var sc = slotChoices(Math.max(0, nextEmpty()));
    if (q.slots && nextEmpty() >= 0) ui.choices.appendChild(el("span", "he-hint he-steplabel", "Chord " + (sc.chord + 1) + ", " + (sc.step === "bass" ? "bass note:" : ST.invDetail === "member" ? "which member?" : "root?")));
    sc.choices.forEach(function (c, ci) {
      var b = el("button", "he-choice", sc.labels[ci]); b.type = "button";
      b.onclick = function () { choose(c); };
      ui.choices.appendChild(b);
    });
    ui.check.disabled = cur.checked;
    drawOnes(); drawNotation();
  }
  function label(v, slot) { var sc = slot != null ? slotChoices(slot) : cur.q, i = sc.choices.indexOf(v); return i >= 0 ? sc.labels[i] : pretty(v); }
  function choose(c) {
    if (!cur || cur.checked) return;
    var n = slotCount();
    for (var i = 0; i < n; i++) if (!cur.filled[i]) { cur.filled[i] = c; break; }
    draw();
    if (n === 1 || cur.filled.filter(Boolean).length === n) check();
  }
  // "▶ My answer": what you have entered so far, as sound. Empty boxes are silent.
  var SILENT = { bass: null, upper: [] };
  function voiceSparse(tokens, rest, invs) {
    var real = [], idx = [];
    tokens.forEach(function (t, i) { if (t) { real.push(t); idx.push(i); } });
    var v = real.length ? voice(real, rest, { voices: ST.voices, spacing: ST.spacing, inv: invs ? idx.map(function (i) { return invs[i] || 0; }) : null }) : [];
    return tokens.map(function (t, i) { var k = idx.indexOf(i); return k >= 0 ? v[k] : SILENT; });
  }
  function mine() {
    var q = cur.q, f = cur.filled, rest = cur.rest, pool = q.pool, n = q.progs[0].length;
    function relOf(syl) { return sylToRel(syl, q.mode); }
    function nearMidi(rel, c) { var pc = (rel + rest) % 12; return nearOct(pc, c); }
    function byFn(name) { return pool.filter(function (t) { return fn(t) === name; })[0] || null; }
    if (q.kind === "rn") return voiceSparse(q.answer.map(function (x, i) { return f[i] || null; }), rest);
    if (q.kind === "func") return voiceSparse(q.answer.map(function (x, i) { return f[i] ? byFn(f[i]) : null; }), rest);
    if (q.kind === "next") return voiceSparse(q.progs[0].slice(0, -1).concat([f[0] || null]), rest, q.invs[0]);
    if (q.kind === "bass") return q.answer.map(function (x, i) { var r = f[i] && relOf(f[i]); return r == null || !f[i] ? SILENT : { bass: nearMidi(r, 45), upper: [] }; });
    if (q.kind === "voice") return q.answer.map(function (x, i) { var r = f[i] && relOf(f[i]); return r == null || !f[i] ? SILENT : { bass: null, upper: [nearMidi(r, 69)] }; });
    if (q.kind === "mode") return f[0] ? voice(MODE_LOOPS[f[0]][0], rest, { voices: ST.voices }) : [];
    if (q.kind === "inv") {
      var real = cur.voiced[0], out = [];
      for (var i = 0; i < n; i++) {
        var syl = f[2 * i], mem = f[2 * i + 1], r = syl ? relOf(syl) : null;
        if (r == null) { out.push(SILENT); continue; }
        var memIdx = mem === "root" ? 0 : MEMBER.indexOf(mem), tok = null;
        if (memIdx >= 0) tok = pool.filter(function (t) { var c = parse(t); return c.pcs[memIdx] === r; })[0];
        if (tok) out.push(voice([tok], rest, { voices: ST.voices, inv: [memIdx] })[0]);
        else out.push({ bass: nearMidi(r, 45), upper: real[i].upper, pcs: real[i].pcs });   // your bass under the real chord
      }
      return out;
    }
    return null;
  }
  function hearMine() {
    if (!cur) return;
    var chords = mine();
    if (!chords) { setStatus("Nothing to play for this question: answer with the buttons."); return; }
    if (!chords.length || chords.every(function (c) { return c === SILENT; })) { setStatus("Nothing entered yet."); return; }
    stop(); setStatus("Your answer…");
    var pi = 0;
    playChords(chords, { lit: function (i) { light(pi, i); } }).then(function () { setStatus(""); });
  }
  function check() {
    if (!cur || cur.checked) return;
    var q = cur.q, n = slotCount(), ok = true;
    for (var i = 0; i < n; i++) if (cur.filled[i] !== q.answer[i]) ok = false;
    cur.checked = true; draw();
    [].forEach.call(ui.slots.querySelectorAll(".he-slot"), function (s, i) {
      var good = cur.filled[i] === q.answer[i]; s.classList.add(good ? "he-good" : "he-bad");
      if (!good) s.textContent = (cur.filled[i] ? label(cur.filled[i], i) + " → " : "") + label(q.answer[i], i);
    });
    record(ok);
    var full = q.progs.map(function (p, pi) { return p.map(function (t, i) { return figured(t, q.invs[pi][i]); }).join(" – "); }).join("   |   ");
    var bassLine = q.progs[0].map(function (t, i) { return spelledSyl(t, q.invs[0][i], q.mode); }).join(" ");
    var key = NAMES[cur.rest] + " " + MODES[q.mode].label.toLowerCase().replace(" (harmonic)", "");
    ui.result.innerHTML = "";
    ui.result.appendChild(el("div", ok ? "he-ok" : "he-no", ok ? "Right." : "Not quite."));
    ui.result.appendChild(el("div", null, full + "  ·  in " + key.replace("b", "♭")));
    ui.result.appendChild(el("div", "he-hint", "Bass: " + bassLine + "  ·  " + q.progs[0].map(fn).join(", ")));
    if (q.kind === "next") playAll();
    if (+ST.auto) timers.push(setTimeout(newQuestion, 2600));
  }

  // ---- the panel
  function sel(labelTxt, key, items, onchange) {
    var lab = el("label"), s = el("select"); s.dataset.k = key; lab.appendChild(el("span", null, labelTxt)); lab.appendChild(s);
    items.forEach(function (it) { opt(s, it[0], it[1]); }); s.value = String(ST[key]);
    s.onchange = function () { ST[key] = /^\d+$/.test(s.value) && key !== "key" && key !== "level" ? +s.value : s.value; save(); if (onchange) onchange(); };
    return { lab: lab, s: s };
  }
  function soundItems(fam, fallback) {
    var list = []; try { list = global.BandSounds.sounds(fam).map(function (x) { return [x.id, x.label]; }); } catch (e) {}
    return list.length ? list : [[fallback, fallback]];
  }
  function build(host) {
    root = host; host.innerHTML = "";
    host.classList.add("he-panel");
    var g1 = el("div", "he-grid"), g2 = el("details", "he-more"), g2s = el("summary", null, "Sound and options"), g2g = el("div", "he-grid");
    var pathS = sel("Path", "path", PATHS.map(function (p) { return [p.id, p.label]; }), function () { ST.level = (path(ST.path).levels[0] || {}).id || ""; build(host); });
    g1.appendChild(pathS.lab);
    if (ST.path !== "custom") {
      var lv = sel("Level", "level", path(ST.path).levels.map(function (l) { return [l.id, l.id + " · " + l.title]; }), function () { fixKind(); build(host); });
      g1.appendChild(lv.lab);
    } else {
      g1.appendChild(sel("Tonality", "customMode", Object.keys(MODES).map(function (m) { return [m, MODES[m].label]; }), function () {
        ST.customPool = MODE_POOL[ST.customMode].slice(0, 3); save(); build(host); }).lab);
    }
    var kinds = KINDS.filter(function (k) { return k.id !== "mode" || level().modes.length > 1; });
    if (!kinds.some(function (k) { return k.id === ST.kind; })) ST.kind = kinds[0].id;
    g1.appendChild(sel("Question", "kind", kinds.map(function (k) { return [k.id, k.label]; }), function () { build(host); }).lab);
    g1.appendChild(sel("Voices", "voices", [[3, "Three (bass + 2)"], [4, "Four (bass + 3)"]], function () { if (ST.voices === 3 && ST.bring === "t") ST.bring = ""; if (ST.voices === 3 && ST.leave === "t") ST.leave = ""; save(); build(host); if (cur) newQuestion(); }).lab);
    host.appendChild(g1);

    if (ST.path === "custom") {
      var box = el("div", "he-pool"); box.appendChild(el("span", "he-hint", "Chords: "));
      MODE_POOL[ST.customMode].forEach(function (t) {
        var l = el("label"), c = el("input"); c.type = "checkbox"; c.checked = ST.customPool.indexOf(t) >= 0;
        c.onchange = function () { ST.customPool = MODE_POOL[ST.customMode].filter(function (x, i) { return box.querySelectorAll("input")[i].checked; }); save(); };
        l.appendChild(c); l.appendChild(document.createTextNode(" " + pretty(t))); box.appendChild(l);
      });
      host.appendChild(box);
    }

    g2.appendChild(g2s); g2.appendChild(g2g);
    g2g.appendChild(sel("Key", "key", [["random", "Random"]].concat(NAMES.map(function (n, i) { return [String(i), n.replace("b", "♭")]; }))).lab);
    g2g.appendChild(sel("Tempo", "tempo", [48, 60, 72, 84, 96, 112, 132].map(function (t) { return [t, t + " bpm"]; })).lab);
    g2g.appendChild(sel("Beats per chord", "beats", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]]).lab);
    g2g.appendChild(sel("Silence between chords", "gap", [["0", "None"], ["0.25", "¼ second"], ["0.5", "½ second"], ["1", "1 second"], ["1.5", "1½ seconds"], ["2", "2 seconds"], ["3", "3 seconds"], ["5", "5 seconds"]]).lab);
    var three = +ST.voices === 3;
    g2g.appendChild(sel("Bring out", "bring", [["", "Nothing (even)"], ["s", three ? "Top voice" : "Soprano"], ["a", three ? "Middle voice" : "Alto"]]
      .concat(three ? [] : [["t", "Tenor"]]).concat([["b", "Bass"], ["root", "The root"], ["3rd", "The 3rd"], ["5th", "The 5th"], ["7th", "The 7th"]])).lab);
    g2g.appendChild(sel("Leave out", "leave", [["", "Nothing"], ["s", three ? "Top voice" : "Soprano"], ["a", three ? "Middle voice" : "Alto"]].concat(three ? [] : [["t", "Tenor"]]).concat([["b", "Bass"]])).lab);
    g2g.appendChild(sel("Arpeggiate", "arp", [["off", "Off (together)"], ["roll", "Rolled"], ["up", "Up, bass first"], ["down", "Down, top first"]]).lab);
    g2g.appendChild(sel("Pan the voices", "pan", [[0, "Off (centre)"], [1, three ? "Top +50, middle 0, bass −50" : "S +50, A +20, T −20, B −50"]]).lab);
    g2g.appendChild(sel("Spacing", "spacing", [["", "Voice-led (smoothest)"], ["close", "Close"], ["open", "Open"]], function () { if (cur) { cur.voiced = revoice(cur.q, cur.rest, ST.spacing); if (cur.q.kind === "voice" && !cur.checked) { setVoiceAnswer(); } } }).lab);
    g2g.appendChild(sel("Notation", "notation", [["off", "Hidden"], ["after", "After answering"], ["on", "Always"]], function () { drawNotation(); }).lab);
    g2g.appendChild(sel("Drone", "drone", [["off", "Off"], ["tonic", "Resting tone"], ["fifth", "Resting tone and 5th"]]).lab);
    g2g.appendChild(sel("Repeats", "rekey", [["same", "Same key"], ["new", "A new key each time"]]).lab);
    g2g.appendChild(sel("First hearing", "slow", [[0, "At tempo"], [1, "Half speed"]]).lab);
    g2g.appendChild(sel("Top voice sound", "topSound", [["", "Same as the chords"]].concat(soundItems("piano", "piano")), function () { stop(); }).lab);
    g2g.appendChild(sel("Voice to follow", "follow", [["s", three ? "Top voice" : "Soprano"], ["a", three ? "Middle voice" : "Alto"]].concat(three ? [] : [["t", "Tenor"]]).concat([["b", "Bass"]]), function () { if (cur && cur.q.kind === "voice") newQuestion(); }).lab);
    g2g.appendChild(sel("Notes", "length", [["full", "Held"], ["short", "Short"]]).lab);
    g2g.appendChild(sel("Chord register", "reg", [["-1", "An octave lower"], ["0", "Middle"], ["1", "An octave higher"]]).lab);
    g2g.appendChild(sel("Chords (made levels)", "len", [[3, "3"], [4, "4"], [5, "5"], [6, "6"], [8, "8"]]).lab);
    g2g.appendChild(sel("Establish the key", "establish", [["cadence", "Cadence first"], ["tonic", "Tonic chord first"], ["none", "Nothing first"]]).lab);
    g2g.appendChild(sel("Inversions", "inv", [["off", "Off (root position)"], ["some", "Some"], ["many", "Many"]], function () { if (cur) newQuestion(); }).lab);
    g2g.appendChild(sel("Inversion step 2", "invDetail", [["root", "Root or not"], ["member", "Root, 3rd, 5th or 7th"]], function () { if (cur && ST.kind === "inv") newQuestion(); }).lab);
    g2g.appendChild(sel("First chord", "given", [["first", "Given"], ["none", "You name it"]]).lab);
    g2g.appendChild(sel("Play each", "repeat", [[1, "Once"], [2, "Twice"]]).lab);
    g2g.appendChild(sel("After answering", "auto", [[0, "Wait for Next"], [1, "Next by itself"]]).lab);
    g2g.appendChild(sel("Chords on", "piano", [["", "(off)"]].concat(soundItems("piano", "piano")), function () { stop(); }).lab);
    g2g.appendChild(sel("Bass on", "bass", [["", "(off)"]].concat(soundItems("bass", "bass")), function () { stop(); }).lab);
    host.appendChild(g2);

    var lvl = level();
    host.appendChild(el("p", "he-hint he-note", (ST.path === "custom" ? path("custom").blurb : path(ST.path).blurb) + (lvl.note ? "  " + lvl.note : "")));

    var bar = el("div", "he-bar");
    var go = el("button", "he-go", cur ? "Next ▶" : "Start ▶"); go.type = "button"; go.onclick = function () { go.textContent = "Next ▶"; newQuestion(); };
    var again = el("button", null, "↻ Again"); again.type = "button"; again.onclick = function () { playAll(); };
    var est = el("button", null, "Key"); est.type = "button"; est.title = "Play the cadence again"; est.onclick = function () { if (cur) { stop(); playChords(establishChords(cur.q.mode, cur.rest), { beats: 1 }); } };
    ui.check = el("button", null, "Check"); ui.check.type = "button"; ui.check.onclick = check;
    var st = el("button", null, "■"); st.type = "button"; st.title = "Stop"; st.onclick = stop;
    ui.notaBtn = el("button", "he-notabtn", "♫ Show notation"); ui.notaBtn.type = "button";
    ui.notaBtn.onclick = function () { ST.notation = ST.notation === "off" ? "on" : "off"; save(); var s2 = root.querySelector("select[data-k=notation]"); if (s2) s2.value = ST.notation; drawNotation(); };
    var my = el("button", "he-mine", "▶ My answer"); my.type = "button"; my.title = "Hear what you have entered so far"; my.onclick = hearMine;
    [go, again, est, ui.check, st, my, ui.notaBtn].forEach(function (b) { bar.appendChild(b); });
    host.appendChild(bar);
    ui.status = el("div", "he-status"); ui.mode = el("div", "he-hint"); ui.prompt = el("div", "he-prompt");
    ui.slots = el("div", "he-slots"); ui.nota = el("div", "he-nota"); ui.ones = el("div", "he-ones"); ui.choices = el("div", "he-choices"); ui.result = el("div", "he-result"); ui.score = el("div", "he-hint he-score");
    ui.keys = el("div", "he-hint he-keys", "Keyboard: type the answer into the outlined box (V7, ii, bVII, viio, viih7; do so la; tonic, dom…; r or n for root or not), Enter to check, Backspace to undo, Space to hear it again.");
    [ui.status, ui.prompt, ui.mode, ui.slots, ui.nota, ui.choices, ui.keys, ui.ones, ui.result, ui.score].forEach(function (x) { host.appendChild(x); });
    drawNotation();
    if (cur) draw(); else ui.prompt.textContent = "Press Start. Headphones help: the bass is low.";
    score();
  }
  function fixKind() { if (ST.kind === "mode" && level().modes.length < 2) ST.kind = "rn"; save(); }

  var typed = "";
  function caseSens() { return cur && (cur.q.kind === "rn" || cur.q.kind === "next"); }
  function typeKey(k) {
    var i = nextEmpty(); if (!cur || cur.checked || i < 0) return false;
    var sc = slotChoices(i), m = typeMatch(typed + k, sc.choices, sc.labels, caseSens());
    if (!m.prefix.length) { flashTyped(); return true; }
    typed += k;
    if (m.exact.length === 1 && m.prefix.length === 1) { typed = ""; choose(m.exact[0]); } else draw();
    return true;
  }
  function commitTyped() {
    var i = nextEmpty(); if (i < 0 || !typed) return false;
    var sc = slotChoices(i), m = typeMatch(typed, sc.choices, sc.labels, caseSens()), c = m.exact.length === 1 ? m.exact[0] : m.prefix.length === 1 ? m.prefix[0] : null;
    if (!c) { flashTyped(); return true; }
    typed = ""; choose(c); return true;
  }
  function flashTyped() { var s = ui.slots.querySelector(".he-next"); if (s) { s.classList.remove("he-nope"); void s.offsetWidth; s.classList.add("he-nope"); } }
  function undo() {
    if (!cur || cur.checked) return;
    if (typed) { typed = typed.slice(0, -1); draw(); return; }
    var keep = ST.given === "first" ? (cur.q.slots ? 2 : 1) : 0, n = slotCount(); if (n < 2) keep = 0;
    for (var i = n - 1; i >= keep; i--) if (cur.filled[i]) { cur.filled[i] = null; break; }
    draw();
  }
  document.addEventListener("keydown", function (e) {
    if (!root || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === " " && !typed) { e.preventDefault(); playAll(); }
    else if (e.key === "Enter") { e.preventDefault(); if (commitTyped()) return; if (cur && !cur.checked) check(); else newQuestion(); }
    else if (e.key === "Backspace") { if (cur && !cur.checked) { e.preventDefault(); undo(); } }
    else if (e.key === "Escape") { typed = ""; if (cur) draw(); }
    else if (e.key.length === 1 && e.key !== " " && cur && !cur.checked) { if (typeKey(e.key)) e.preventDefault(); }
  });
  api._cur = function () { return cur; };
  function init() { var h = document.getElementById("harmony-ear"); if (h) build(h); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
