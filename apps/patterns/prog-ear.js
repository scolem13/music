// prog-ear.js — Odd Progression Out (practice/prog-ear.qmd). Three clips: two play the SAME chord progression in two different
// band styles, the third plays a slightly DIFFERENT progression in a third style. Which one is different? Levels go from a chord of
// another function (IV for V) up to progressions where sevenths, inversions and extensions must be heard as "the same" while one
// chord turns into its borrowed, applied or tritone-substitute cousin. A second mode plays each version as a single melodic line
// that outlines the chords: chord tones only at first, then passing, neighbour, appoggiatura, suspension and anticipation notes.
// Notation (block-chord voicings or the melody, with chord symbols) can be shown at any time.
//
// PROGRESSIONS are Roman-numeral templates in major keys (TEMPLATES; 4 chords a bar each, or 8 chords two a bar). Tokens (ROMAN):
//   I ii iii IV V vi vii°   diatonic           V7 the dominant seventh
//   II7 III7 VI7 I7          applied dominants (V/V, V/vi, V/ii, V/IV)
//   iv bVI bVII bIII         borrowed from the parallel minor          bII7 tritone substitute for V     #iv°7 passing diminished
// COLOUR (what still counts as the same chord): each clip voices each chord in its own way, from the colours the level allows:
//   tier 0 triads; 1 + inversions (slash bass on the 3rd or 5th); 2 + sevenths; 3 + 6, add9, 9, 11, 13, 6/9, sus4 on V, b9 on applied V.
// DIFFERENCES (the odd clip changes one chord): far (a chord of another function, not a third away), rel (a third away: I/vi, IV/ii,
//   V/iii, vi/IV), mode (borrowed or applied: IV->iv, ii->II7, vi->VI7, iii->III7, I->I7, V->bVII), chrom (V->bII7, IV->#iv°7, vi->bVI).
// MELODY (mode "melody"): made here from the chords, one line, D4..G5. Strong beats are chord tones; weak beats chord tones or,
//   as the level rises, passing (P) and neighbour (N) tones, then appoggiaturas (A), suspensions (S), anticipations (Ant),
//   escape tones (E) and chromatic lower neighbours (CN). The two "same" clips get different melodies over the same chords.
// TONALITIES: Gordon's eight (major, harmonic minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian), each with its own templates
//   and substitutes (MODAL); keys are "D dorian" etc. (keyInfo, keysFor). Harmonic minor also uses the natural 7th's chords (bIII, bVII).
// The idioms and NHT names are standard textbook terms; the templates and melodies are this site's inventions.
//
// Pure helpers (Node: tests/prog-ear/prog-ear.test.js):
//   ProgEar.question(levelId, { tonality, pool, key }, rnd) -> { key, perBar, base: [tok], odd: [tok], at, diff: {kind,text},
//        clips: [{ odd, style|sound, chords: [{tok, sym, tones, bass}], melody? }], oddIndex }
//   ProgEar.chord(tok, keyName, colour, inv) -> { sym, root, tones (semitones over root), bass (pc) }
//   ProgEar.melody(chords, perBar, levelN, rnd) -> [{ t, d, midi, ci, nht }]
//   ProgEar.abcBand(clip, q) / ProgEar.abcMelody(clip, q, labels) / ProgEar.abcPlay(clip, q) -> ABC text
//   ProgEar.LEVELS, .MLEVELS, .STYLE_POOLS, .TEMPLATES, .ROMAN, .rng
// Sound: AbcPlay (band: chord symbols in a BandCatalog style, opts.drums; melody: a BandSounds instrument). Progress: localStorage "progEar.v1".
(function (global) {
  "use strict";
  function mod(n, m) { return ((n % m) + m) % m; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------- keys and spelling ----------
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var KEYS = { C: [0, 0], G: [4, 7], D: [1, 2], A: [5, 9], F: [3, 5], Bb: [6, 10], Eb: [2, 3] };  // [letter index, tonic pc]
  function accStr(a) { return a > 0 ? "#".repeat(a) : a < 0 ? "b".repeat(-a) : ""; }
  function nameOf(letter, pc) { var a = mod(pc - NAT[letter] + 6, 12) - 6; return LET[letter] + accStr(a); }
  // the key signature: letter -> accidental
  // TONALITIES (Gordon's eight). A key is "<tonic>" for major or "<tonic> <tonality id>": "D dorian", "E minor". Each tonality is
  // the major scale from another degree (deg) of a parent major key in KEYS, except harmonic minor (aeolian with a raised 7th).
  var MAJ = [0, 2, 4, 5, 7, 9, 11];
  var TONALITIES = {
    major: { label: "Major", deg: 0, abc: "" }, minor: { label: "Harmonic minor", deg: 5, abc: "m", raise7: true },
    dorian: { label: "Dorian", deg: 1, abc: "dor" }, phrygian: { label: "Phrygian", deg: 2, abc: "phr" }, lydian: { label: "Lydian", deg: 3, abc: "lyd" },
    mixolydian: { label: "Mixolydian", deg: 4, abc: "mix" }, aeolian: { label: "Aeolian", deg: 5, abc: "aeo" }, locrian: { label: "Locrian", deg: 6, abc: "loc" }
  };
  var KI = {};
  function keyInfo(k) {
    if (KI[k]) return KI[k];
    var parts = String(k).split(" "), mode = parts[1] || "major", T = TONALITIES[mode], parent = null;
    Object.keys(KEYS).forEach(function (pk) { var P = KEYS[pk], l = (P[0] + T.deg) % 7, pc = mod(P[1] + MAJ[T.deg], 12); if (nameOf(l, pc) === parts[0]) parent = pk; });
    if (!parent) parent = "C";
    var P = KEYS[parent], sc = MAJ.map(function (x) { return mod(x - MAJ[T.deg] + 12, 12); }).slice(T.deg).concat(MAJ.map(function (x) { return mod(x - MAJ[T.deg] + 12, 12); }).slice(0, T.deg)).sort(function (a, b) { return a - b; });
    if (T.raise7) sc[6] = 11;
    var info = { k: k, mode: mode, parent: parent, letter: (P[0] + T.deg) % 7, pc: mod(P[1] + MAJ[T.deg], 12), sc: sc,
      sharp: ["C", "G", "D", "A"].indexOf(parent) >= 0, abc: parts[0] + T.abc, label: parts[0] + " " + T.label.toLowerCase() };
    return (KI[k] = info);
  }
  function keysFor(mode) { var T = TONALITIES[mode] || TONALITIES.major; return Object.keys(KEYS).map(function (pk) { var P = KEYS[pk]; return nameOf((P[0] + T.deg) % 7, mod(P[1] + MAJ[T.deg], 12)) + (mode === "major" ? "" : " " + mode); }); }
  function keySig(k) { var P = KEYS[keyInfo(k).parent], sig = {}; for (var i = 0; i < 7; i++) { var L = (P[0] + i) % 7, pc = mod(P[1] + MAJ[i], 12); sig[L] = mod(pc - NAT[L] + 6, 12) - 6; } return sig; }

  // ---------- chords ----------
  // r: semitones over the tonic; d: scale degree (for the letter); q: base quality
  var ROMAN = {
    "I": { r: 0, d: 0, q: "M", f: "T" }, "ii": { r: 2, d: 1, q: "m", f: "P" }, "iii": { r: 4, d: 2, q: "m", f: "T" }, "IV": { r: 5, d: 3, q: "M", f: "P" },
    "V": { r: 7, d: 4, q: "V", f: "D" }, "vi": { r: 9, d: 5, q: "m", f: "T" }, "vii°": { r: 11, d: 6, q: "d", f: "D" }, "V7": { r: 7, d: 4, q: "7", f: "D" },
    "II7": { r: 2, d: 1, q: "A", f: "P" }, "III7": { r: 4, d: 2, q: "A", f: "T" }, "VI7": { r: 9, d: 5, q: "A", f: "T" }, "I7": { r: 0, d: 0, q: "A", f: "T" },
    "iv": { r: 5, d: 3, q: "m", f: "P" }, "bVI": { r: 8, d: 5, q: "M", f: "P" }, "bVII": { r: 10, d: 6, q: "M", f: "D" }, "bIII": { r: 3, d: 2, q: "M", f: "T" },
    "bII7": { r: 1, d: 1, q: "A", f: "D" }, "#iv°7": { r: 6, d: 3, q: "o", f: "P" },
    // for the other tonalities
    "i": { r: 0, d: 0, q: "m" }, "i°": { r: 0, d: 0, q: "d" }, "ii°": { r: 2, d: 1, q: "d" }, "II": { r: 2, d: 1, q: "M" }, "bII": { r: 1, d: 1, q: "M" },
    "biii": { r: 3, d: 2, q: "m" }, "iii°": { r: 4, d: 2, q: "d" }, "IV7": { r: 5, d: 3, q: "A" }, "#iv°": { r: 6, d: 3, q: "d" }, "bV": { r: 6, d: 4, q: "M" },
    "v": { r: 7, d: 4, q: "m" }, "v°": { r: 7, d: 4, q: "d" }, "vi°": { r: 9, d: 5, q: "d" }, "VI": { r: 9, d: 5, q: "M" }, "bvii": { r: 10, d: 6, q: "m" },
    "vii": { r: 11, d: 6, q: "m" }, "VII": { r: 11, d: 6, q: "M" }, "vii°7": { r: 11, d: 6, q: "o" }
  };
  // colours by base quality and tier: [suffix, intervals over the root, letter steps for spelling]
  var C = {
    "":     [[0, 4, 7], [0, 2, 4]],       "maj7": [[0, 4, 7, 11], [0, 2, 4, 6]], "6": [[0, 4, 7, 9], [0, 2, 4, 5]],
    "add9": [[0, 4, 7, 14], [0, 2, 4, 1]], "maj9": [[0, 4, 7, 11, 14], [0, 2, 4, 6, 1]], "6/9": [[0, 4, 9, 14], [0, 2, 5, 1]],
    "m":    [[0, 3, 7], [0, 2, 4]],       "m7": [[0, 3, 7, 10], [0, 2, 4, 6]], "m9": [[0, 3, 7, 10, 14], [0, 2, 4, 6, 1]], "m11": [[0, 3, 10, 14, 17], [0, 2, 6, 1, 3]],
    "7":    [[0, 4, 7, 10], [0, 2, 4, 6]], "9": [[0, 4, 7, 10, 14], [0, 2, 4, 6, 1]], "13": [[0, 4, 10, 14, 21], [0, 2, 6, 1, 5]],
    "7sus4": [[0, 5, 7, 10], [0, 3, 4, 6]], "7b9": [[0, 4, 7, 10, 13], [0, 2, 4, 6, 1]], "7#9": [[0, 4, 7, 10, 15], [0, 2, 4, 6, 1]],
    "dim":  [[0, 3, 6], [0, 2, 4]],       "m7b5": [[0, 3, 6, 10], [0, 2, 4, 6]], "dim7": [[0, 3, 6, 9], [0, 2, 4, 6]]
  };
  var COLOURS = {   // quality -> [tier0, tier2 (sevenths), tier3 (extensions)] choices
    M: [[""], ["", "maj7"], ["maj7", "6", "add9", "maj9", "6/9"]],
    m: [["m"], ["m", "m7"], ["m7", "m9", "m11"]],
    V: [[""], ["", "7"], ["7", "9", "13", "7sus4"]],
    "7": [["7"], ["7"], ["7", "9", "13"]],
    A: [["7"], ["7"], ["7", "9", "7b9"]],
    d: [["dim"], ["m7b5"], ["m7b5"]],
    o: [["dim7"], ["dim7"], ["dim7"]]
  };
  function colourFor(tok, tier, r, tonality) {
    var q = ROMAN[tok].q, c = COLOURS[q], l = tier >= 3 ? c[2] : tier >= 2 ? c[1] : c[0];
    if (tier >= 3 && tonality === "minor" && tok === "V") l = ["7", "7b9"];          // the key's own lowered 6th is the 9th of V
    if (tier >= 3 && tonality === "phrygian" && q === "m") l = ["m7"];               // a minor 9th over the tonic would be outside the mode
    if (tok === "iii" && tier >= 3) l = ["m7"];
    if ((tok === "bVI" || tok === "bVII" || tok === "bIII") && tier >= 2) l = ["", "maj7"];
    return pick(l, r);
  }
  function chord(tok, k, colour, inv) {
    if (colour == null) colour = COLOURS[ROMAN[tok].q][0][0];
    var R = ROMAN[tok], K = keyInfo(k), root = mod(K.pc + R.r, 12), letter = (K.letter + R.d) % 7, c = C[colour] || C[""];
    var sym = nameOf(letter, root) + colour, bass = root;
    if (inv && c[0].length >= 3) {
      var iv = c[0].indexOf(inv === 1 ? (c[0].indexOf(3) >= 0 ? 3 : 4) : 7);
      if (iv > 0) { bass = mod(root + c[0][iv], 12); sym += "/" + nameOf((letter + c[1][iv]) % 7, bass); }
    }
    return { tok: tok, sym: sym, root: root, letter: letter, tones: c[0], steps: c[1], bass: bass, colour: colour, inv: inv || 0 };
  }

  // ---------- templates ----------
  var TEMPLATES = {
    four: [["I", "IV", "V", "I"], ["I", "vi", "IV", "V"], ["I", "V", "vi", "IV"], ["I", "ii", "V", "I"], ["I", "IV", "I", "V"], ["vi", "IV", "I", "V"],
      ["I", "vi", "ii", "V"], ["I", "iii", "IV", "V"], ["IV", "V", "iii", "vi"], ["I", "IV", "ii", "V"], ["I", "V", "IV", "I"], ["ii", "V", "I", "vi"]],
    eight: [["I", "vi", "ii", "V", "I", "vi", "ii", "V"], ["I", "V", "vi", "iii", "IV", "I", "IV", "V"], ["I", "IV", "vii°", "iii", "vi", "ii", "V", "I"],
      ["I", "iii", "vi", "IV", "ii", "V", "I", "I"], ["vi", "ii", "V", "I", "IV", "vii°", "iii", "vi"], ["I", "IV", "I", "V", "vi", "IV", "V", "I"],
      ["ii", "V", "I", "vi", "ii", "V", "I", "I"], ["I", "vi", "IV", "V", "I", "IV", "V", "I"]]
  };
  // the chords a difference may put in place of each token
  var SUBS = {
    far: { I: ["IV", "V"], ii: ["V", "I"], iii: ["IV", "ii"], IV: ["V", "I"], V: ["IV", "ii", "I"], vi: ["V", "ii"], "vii°": ["IV", "ii"] },
    rel: { I: ["vi", "iii"], ii: ["IV"], iii: ["V", "I"], IV: ["ii", "vi"], V: ["iii", "vii°"], vi: ["IV", "I"], "vii°": ["V"] },
    mode: { IV: ["iv"], ii: ["II7"], vi: ["VI7"], iii: ["III7"], I: ["I7"], V: ["bVII"] },
    chrom: { V: ["bII7"], IV: ["#iv°7"], vi: ["bVI"], ii: ["#iv°7"], I: ["bIII"] }
  };
  // the other tonalities: their own templates and substitutes. "mode" swaps the tonality's characteristic chord for the one the
  // nearest other tonality has (Dorian IV for Aeolian iv, Mixolydian bVII for major V); "chrom" brings in a chord from outside.
  var MODAL = {
    minor: { four: [["i", "iv", "V", "i"], ["i", "bVI", "bIII", "bVII"], ["i", "ii°", "V", "i"], ["i", "iv", "i", "V"], ["i", "bVI", "iv", "V"], ["i", "bVII", "bVI", "V"], ["iv", "V", "i", "bVI"], ["i", "bIII", "iv", "V"]],
      eight: [["i", "iv", "bVII", "bIII", "bVI", "ii°", "V", "i"], ["i", "bVI", "bIII", "bVII", "i", "iv", "V", "V"], ["i", "iv", "V", "i", "bVI", "iv", "V", "i"], ["i", "bVII", "bVI", "V", "i", "ii°", "V", "i"]],
      far: { i: ["iv", "V"], iv: ["V", "i"], V: ["iv"], bVI: ["V"], bIII: ["iv", "V"], bVII: ["iv"], "ii°": ["i"] },
      rel: { i: ["bVI", "bIII"], iv: ["ii°", "bVI"], V: ["vii°"], bVI: ["iv", "i"], bIII: ["i"], bVII: ["V"], "ii°": ["iv"] },
      mode: { iv: ["IV"], V: ["v"], bVI: ["vi°"], "ii°": ["ii"], i: ["I"] }, chrom: { "ii°": ["bII"], iv: ["bII"], V: ["bII7"], bVI: ["#iv°7"] } },
    dorian: { four: [["i", "IV", "i", "IV"], ["i", "bVII", "IV", "i"], ["i", "IV", "bVII", "i"], ["i", "ii", "bIII", "IV"], ["i", "v", "IV", "i"], ["i", "bIII", "IV", "i"], ["i", "IV", "v", "i"]],
      eight: [["i", "IV", "i", "IV", "bVII", "IV", "i", "i"], ["i", "bIII", "IV", "IV", "i", "bVII", "IV", "i"], ["i", "ii", "bIII", "IV", "v", "IV", "i", "i"], ["i", "IV", "bVII", "i", "i", "IV", "v", "i"]],
      far: { i: ["IV", "v"], IV: ["i", "v"], bVII: ["IV", "i"], v: ["IV", "i"], ii: ["v"], bIII: ["v"] },
      rel: { i: ["bIII"], IV: ["ii", "vi°"], bVII: ["v"], v: ["bVII"], bIII: ["i"], ii: ["IV"] },
      mode: { IV: ["iv"], ii: ["ii°"], v: ["V"], bVII: ["VII"] }, chrom: { bVII: ["bVI"], IV: ["IV7"], v: ["bII"] } },
    phrygian: { four: [["i", "bII", "i", "bII"], ["i", "bII", "bIII", "bII"], ["i", "bvii", "bVI", "bII"], ["i", "iv", "bII", "i"], ["i", "bVI", "bII", "i"], ["i", "bII", "bvii", "i"]],
      eight: [["i", "bII", "i", "bII", "bIII", "bII", "i", "i"], ["i", "bvii", "bVI", "bII", "i", "iv", "bII", "i"], ["i", "bII", "bIII", "iv", "bIII", "bII", "i", "i"]],
      far: { bII: ["iv", "i"], iv: ["bII"], bvii: ["iv"], bVI: ["bII"], bIII: ["iv"] },
      rel: { i: ["bVI", "bIII"], bII: ["bvii"], iv: ["bVI"], bvii: ["bII"], bVI: ["iv", "i"], bIII: ["i"] },
      mode: { bII: ["ii°"], bvii: ["bVII"], iv: ["IV"] }, chrom: { bII: ["V"], bvii: ["V"] } },
    lydian: { four: [["I", "II", "I", "II"], ["I", "II", "vii", "I"], ["I", "II", "iii", "II"], ["I", "II", "V", "I"], ["I", "vi", "II", "I"], ["I", "V", "II", "I"]],
      eight: [["I", "II", "I", "II", "vii", "II", "I", "I"], ["I", "II", "iii", "II", "I", "vi", "II", "I"], ["I", "V", "II", "I", "vi", "vii", "II", "I"]],
      far: { II: ["V", "I"], vii: ["II"], iii: ["II"], V: ["II"], vi: ["V"] },
      rel: { I: ["vi", "iii"], II: ["#iv°"], vii: ["V"], iii: ["V", "I"], V: ["iii", "vii"], vi: ["I"] },
      mode: { II: ["IV", "ii"], vii: ["vii°"] }, chrom: { II: ["bVII"], vii: ["bII"] } },
    mixolydian: { four: [["I", "bVII", "IV", "I"], ["I", "bVII", "I", "bVII"], ["I", "v", "IV", "I"], ["I", "IV", "bVII", "I"], ["I", "bVII", "vi", "IV"], ["I", "ii", "bVII", "I"]],
      eight: [["I", "bVII", "IV", "I", "I", "bVII", "IV", "I"], ["I", "v", "IV", "I", "bVII", "IV", "I", "I"], ["I", "IV", "bVII", "IV", "I", "v", "IV", "I"]],
      far: { bVII: ["IV", "ii"], IV: ["bVII", "v"], v: ["IV"], vi: ["bVII"], ii: ["v"] },
      rel: { I: ["vi"], bVII: ["v"], IV: ["ii", "vi"], v: ["bVII", "iii°"], vi: ["IV", "I"], ii: ["IV"] },
      mode: { bVII: ["V", "vii°"], v: ["V"] }, chrom: { bVII: ["bVI"], IV: ["iv"], vi: ["bIII"] } },
    aeolian: { four: [["i", "bVI", "bIII", "bVII"], ["i", "bVII", "bVI", "bVII"], ["i", "iv", "v", "i"], ["i", "bVI", "bVII", "i"], ["i", "iv", "bVII", "bIII"], ["i", "v", "bVI", "bVII"]],
      eight: [["i", "bVI", "bIII", "bVII", "i", "bVI", "bVII", "i"], ["i", "iv", "v", "i", "bVI", "bVII", "i", "i"], ["i", "bVII", "bVI", "bVII", "i", "iv", "v", "i"]],
      far: { i: ["iv", "v"], iv: ["v", "i"], v: ["iv"], bVI: ["v", "bVII"], bIII: ["iv"], bVII: ["iv"] },
      rel: { i: ["bVI", "bIII"], iv: ["bVI", "ii°"], v: ["bVII"], bVI: ["iv", "i"], bIII: ["i", "v"], bVII: ["v"] },
      mode: { v: ["V"], iv: ["IV"], bVI: ["vi°"] }, chrom: { bVII: ["bII"], v: ["bII"] } },
    locrian: { four: [["i°", "bII", "i°", "bII"], ["i°", "bvii", "bVI", "bII"], ["i°", "biii", "bII", "i°"], ["i°", "bV", "bII", "i°"], ["i°", "iv", "bII", "i°"]],
      eight: [["i°", "bII", "i°", "bII", "biii", "bII", "i°", "i°"], ["i°", "bvii", "bVI", "bII", "i°", "bV", "bII", "i°"]],
      far: { bII: ["iv", "bV"], biii: ["bV"], bV: ["bII"], bvii: ["iv"], bVI: ["bII"], iv: ["bII"] },
      rel: { "i°": ["bVI"], bII: ["bvii", "iv"], biii: ["bV"], iv: ["bII", "bVI"], bV: ["biii"], bVI: ["iv"], bvii: ["bII"] },
      mode: { "i°": ["i"], bV: ["v"] }, chrom: { bII: ["V"], bvii: ["V"] } }
  };
  var DIATONIC = {
    major: ["I", "ii", "iii", "IV", "V", "vi"], minor: ["i", "bIII", "iv", "V", "bVI", "bVII"], dorian: ["i", "ii", "bIII", "IV", "v", "bVII"],
    phrygian: ["i", "bII", "bIII", "iv", "bVI", "bvii"], lydian: ["I", "II", "iii", "V", "vi", "vii"], mixolydian: ["I", "ii", "IV", "v", "vi", "bVII"],
    aeolian: ["i", "bIII", "iv", "v", "bVI", "bVII"], locrian: ["bII", "biii", "iv", "bV", "bVI", "bvii"]
  };
  // movable do from the parent major (Gordon: la-based minor, dorian on re ...)
  var SYL = ["do", "di", "re", "me", "mi", "fa", "fi", "so", "si", "la", "te", "ti"];
  function syllable(pc, k) { var K = keyInfo(k); return SYL[mod(pc - KEYS[K.parent][1], 12)]; }
  // a diatonic chord in place of base[i] that still holds every anchor pitch class (the melody's chord tones there):
  // as a chord tone, or as the 9th of a major chord (IV under so: the gospel sound). null when none fits.
  function reharm(base, i, k, tonality, anchors, r) {
    var out = [];
    (DIATONIC[tonality] || DIATONIC.major).forEach(function (tok) {
      if (tok === base[i] || tok === base[i - 1] || tok === base[i + 1]) return;
      var c = chord(tok, k), pcs = c.tones.map(function (x) { return mod(c.root + x, 12); }), nine = mod(c.root + 2, 12), gospel = false;
      var fits = anchors.every(function (a) { if (pcs.indexOf(a) >= 0) return true; if (a === nine && ROMAN[tok].q === "M") { gospel = true; return true; } return false; });
      if (fits) out.push({ tok: tok, gospel: gospel });
    });
    if (!out.length) return null;
    var plain = out.filter(function (x) { return !x.gospel; });
    return plain.length && r() < 0.65 ? pick(plain, r) : pick(out, r);
  }
  function tables(mode) { var M = MODAL[mode]; return M ? { four: M.four, eight: M.eight, subs: { far: M.far, rel: M.rel, mode: M.mode, chrom: M.chrom } } : { four: TEMPLATES.four, eight: TEMPLATES.eight, subs: SUBS }; }
  var DIFF_TEXT = {
    diat: "another chord of the key", far: "a chord of another function", rel: "a chord a third away (it shares two notes with the first)",
    mode: "its cousin from a neighbouring tonality or an applied chord (often one note moved by a semitone)", chrom: "a chromatic substitute"
  };

  function L(id, title, tier, inv, chords, diffs, pool, note) { return { id: id, title: title, tier: tier, inv: inv, chords: chords, diffs: diffs, pool: pool, note: note }; }
  var LEVELS = [
    L("1", "Triads: another function", 0, 0, "four", ["far"], "pop", "Plain triads, one a bar. The odd one changes one chord to a chord with another job (IV for V, V for I)."),
    L("2", "Triads: a third away", 0, 0, "four", ["rel"], "pop", "The odd one changes one chord to a chord a third away, which shares two of its notes (vi for I, ii for IV)."),
    L("3", "Inversions are the same", 1, 0.35, "four", ["rel", "far"], "pop", "A chord may have its 3rd or 5th in the bass in one version and still be the same chord."),
    L("4", "Sevenths are the same", 2, 0.25, "four", ["rel"], "mixed", "One version may add sevenths (Cmaj7 for C, Dm7 for Dm). That is still the same progression."),
    L("5", "Borrowed and applied chords", 2, 0.25, "four", ["mode"], "mixed", "The odd one turns one chord into its cousin: IV into iv, ii into II7 (V/V), vi into VI7. Often one note a semitone away."),
    L("6", "Extensions are the same", 3, 0.2, "eight", ["rel", "mode"], "mixed", "Two chords a bar. Ninths, elevenths, thirteenths, 6/9 and sus4 colour the chords and still count as the same progression."),
    L("7", "Jazz colour: substitutes", 3, 0.2, "eight", ["chrom", "mode"], "jazz", "Extended chords throughout. The odd one uses a tritone substitute (bII7 for V), a passing diminished chord or a borrowed bVI."),
    L("8", "Anything", 3, 0.25, "eight", ["far", "rel", "mode", "chrom"], "all", "Every kind of difference and colour, every style.")
  ];
  var MLEVELS = [
    L("m1", "Melody: chord tones only", 0, 0, "four", ["far", "rel"], "pop", "A single line of chord tones, one a beat, starting each bar on the root or third."),
    L("m2", "Melody: passing tones", 0, 0, "four", ["rel"], "pop", "Chord tones on the strong beats; a passing tone may fill a third on a weak beat."),
    L("m3", "Melody: neighbour tones", 2, 0, "four", ["rel", "mode"], "pop", "Eighth notes, passing and neighbour tones. Sevenths may be in the line."),
    L("m4", "Melody: appoggiaturas and suspensions", 2, 0, "eight", ["rel", "mode"], "pop", "Some strong beats now hold a non-chord tone that resolves by step: appoggiaturas and suspensions."),
    L("m5", "Melody: anything", 3, 0, "eight", ["rel", "mode", "chrom"], "pop", "Anticipations, escape tones, chromatic neighbours, and chromatic chords.")
  ];
  // with "Borrowed chords" off (the default) the borrowed / applied / chromatic changes become diatonic reharmonisations (diat)
  var DIATONIC_TITLES = {
    "5": ["Reharmonised: the melody still fits", "The odd one puts another chord of the key under the same notes: so under V can take I or iii instead (both hold so), or IV with so as its 9th (a gospel sound)."],
    "7": ["Reharmonised, in colour", "Extended chords throughout. The odd one reharmonises a chord with another chord of the key that still holds the melody's notes, or one a third away."]
  };
  function levelText(lv, borrowed) { var a = !borrowed && DIATONIC_TITLES[lv.id]; return a ? { title: a[0], note: a[1] } : { title: lv.title, note: lv.note }; }
  function level(id) { var all = LEVELS.concat(MLEVELS); for (var i = 0; i < all.length; i++) if (all[i].id === String(id)) return all[i]; return LEVELS[0]; }
  var STYLE_POOLS = {
    pop: ["pop", "rock", "strum", "folk", "motown", "dance", "train", "emo"],
    jazz: ["swing", "ballad", "bossa", "boogaloo", "jump"],
    mixed: ["pop", "rock", "strum", "motown", "bossa", "swing", "ballad", "reggae", "dance", "train"],
    all: ["pop", "rock", "strum", "folk", "motown", "dance", "train", "emo", "swing", "ballad", "bossa", "boogaloo", "reggae", "calypso", "chacha", "doowop"]
  };
  var MELODY_SOUNDS = ["piano", "epiano", "clguitar", "organ"];

  // ---------- melody ----------
  var LO = 62, HI = 79;
  function nearestPc(pc, ref) { var m = ref + mod(pc - ref, 12); if (m - ref > 6) m -= 12; while (m < LO) m += 12; while (m > HI) m -= 12; return m; }
  function chordPcs(ch) { return ch.tones.map(function (x) { return mod(ch.root + x, 12); }); }
  function isCT(ch, midi) { return chordPcs(ch).indexOf(mod(midi, 12)) >= 0; }
  // kpc: the key ({ pc, sc }: tonic and its scale), or a tonic pc for major
  function scOf(kpc) { return typeof kpc === "number" ? { pc: kpc, sc: MAJ } : kpc; }
  function inScale(midi, kpc) { var K = scOf(kpc); return K.sc.indexOf(mod(midi - K.pc, 12)) >= 0; }
  function scaleStep(midi, dir, kpc) { for (var k = 1; k <= 3; k++) { var m = midi + dir * k; if (inScale(m, kpc)) return m; } return midi + dir; }
  // the step from `midi` toward a chord tone of `ch`, in the chord's own colour where it is chromatic
  function stepIn(ch, midi, dir, kpc) {
    var s = scaleStep(midi, dir, kpc), alt = midi + dir * (Math.abs(s - midi) === 1 ? 2 : 1);
    var pcs = chordPcs(ch);
    if (pcs.indexOf(mod(alt, 12)) >= 0 && pcs.indexOf(mod(s, 12)) < 0 && Math.abs(alt - midi) <= 2) {
      // the chord's chromatic note (II7's raised 4th, iv's lowered 6th) stands in for the scale step it replaces
      return alt;
    }
    return s;
  }
  function chordToneNear(ch, ref, r, avoid) {
    var c = chordPcs(ch).slice(0, 4).map(function (pc) { return nearestPc(pc, ref); }).filter(function (m) { return m !== avoid; });
    c.sort(function (a, b) { return Math.abs(a - ref) - Math.abs(b - ref); });
    return c[Math.min(c.length - 1, r() < 0.65 ? 0 : 1)];
  }
  function melody(chords, perBar, n, kpc, r) {
    var out = [], prev = 67 + Math.floor(r() * 5), acc = 0;   // a chord's length: ch.beats, else 4 / perBar
    chords.forEach(function (ch, ci) {
      var per = ch.beats || 4 / perBar, t0 = acc, nxt = chords[ci + 1]; acc += per;
      // strong-beat targets: every 2 beats
      var targets = [];
      for (var b = 0; b < per; b += 2) {
        var m;
        if (b === 0 && n <= 2) m = nearestPc(mod(ch.root + ch.tones[r() < 0.6 ? 0 : 1], 12), prev);
        else m = chordToneNear(ch, prev, r, b > 0 && n <= 2 ? prev : null);
        targets.push(m); prev = m;
      }
      var nextT = nxt ? nearestPc(mod(nxt.root + nxt.tones[r() < 0.5 ? 0 : 1], 12), prev) : null;
      targets.forEach(function (X, ti) {
        var bt = t0 + ti * 2, Y = ti + 1 < targets.length ? targets[ti + 1] : nextT, notes = [];
        // the strong beat
        var last = out.length ? out[out.length - 1] : null;
        if (n >= 4 && ti === 0 && last && r() < 0.35) {
          // suspension: the last note held over, if it is a step above a chord tone of the new chord and not in it
          var res = chordPcs(ch).map(function (pc) { return nearestPc(pc, last.midi - 1); }).filter(function (x) { return last.midi - x >= 1 && last.midi - x <= 2; })[0];
          if (res != null && !isCT(ch, last.midi)) { notes.push({ o: 0, d: 1, midi: last.midi, nht: "S", tie: true }); notes.push({ o: 1, d: 1, midi: res }); X = res; }
        }
        if (!notes.length && n >= 4 && ti === 0 && r() < 0.3) {
          var ap = stepIn(ch, X, 1, kpc);
          if (!isCT(ch, ap)) { notes.push({ o: 0, d: 1, midi: ap, nht: "A" }); notes.push({ o: 1, d: 1, midi: X }); }
        }
        if (!notes.length) notes.push({ o: 0, d: 1, midi: X });
        // the weak beat(s): from o = filled-so-far to 2
        var used = notes.reduce(function (a, x) { return Math.max(a, x.o + x.d); }, 0), from = notes[notes.length - 1].midi;
        if (used < 2) {
          var gap = Y == null ? 0 : Y - from, ad = Math.abs(gap), dir = gap > 0 ? 1 : -1, w;
          var pP = n >= 2 ? 0.7 : 0, pN = n >= 3 ? 0.45 : 0;
          if (ad >= 3 && ad <= 4 && r() < pP) { w = stepIn(ch, from, dir, kpc); w = { midi: w, nht: isCT(ch, w) ? null : "P" }; }
          else if (ad >= 5 && n >= 3 && r() < pP) {   // two eighths of passing tones down a fourth
            var p1 = stepIn(ch, from, dir, kpc), p2 = stepIn(ch, p1, dir, kpc);
            if (Math.abs(Y - p2) <= 2 && p2 !== Y) { notes.push({ o: 1, d: 0.5, midi: p1, nht: isCT(ch, p1) ? null : "P" }); notes.push({ o: 1.5, d: 0.5, midi: p2, nht: isCT(ch, p2) ? null : "P" }); used = 2; }
          }
          if (used < 2 && !w && ad <= 2 && r() < pN) {
            var nb = (n >= 5 && r() < 0.4) ? from - 1 : stepIn(ch, from, r() < 0.5 ? 1 : -1, kpc);
            if (!isCT(ch, nb)) w = { midi: nb, nht: nb === from - 1 && !isCT(ch, nb) && !inScale(nb, kpc) ? "CN" : "N", back: from };
          }
          if (used < 2) {
            if (!w) { var c2 = chordToneNear(ch, from, r, from); w = { midi: c2 }; }
            if (w.back != null && n >= 3) { notes.push({ o: 1, d: 0.5, midi: w.midi, nht: w.nht }); notes.push({ o: 1.5, d: 0.5, midi: w.back }); }
            else if (n >= 5 && Y != null && ti === targets.length - 1 && nxt && !isCT(ch, Y) && r() < 0.4) {   // anticipation of the next chord
              notes.push({ o: 1, d: 0.5, midi: w.midi, nht: w.nht }); notes.push({ o: 1.5, d: 0.5, midi: Y, nht: "Ant" });
            } else if (n >= 5 && !w.nht && Y != null && r() < 0.2) {   // escape tone: a step away, leap to the next
              var e = stepIn(ch, from, Y >= from ? -1 : 1, kpc);
              if (!isCT(ch, e)) { notes.push({ o: 1, d: 0.5, midi: w.midi }); notes.push({ o: 1.5, d: 0.5, midi: e, nht: "E" }); } else notes.push({ o: 1, d: 1, midi: w.midi });
            } else if (w.back != null) notes.push({ o: 1, d: 1, midi: w.midi, nht: w.nht });
            else notes.push({ o: 1, d: 1, midi: w.midi, nht: w.nht });
          }
        }
        notes.forEach(function (x) { out.push({ t: bt + x.o, d: x.d, midi: Math.max(LO - 2, Math.min(HI + 2, x.midi)), ci: ci, nht: x.nht || null, tie: !!x.tie }); });
        prev = out[out.length - 1].midi;
      });
    });
    // melody M1 at the end: land on the tonic chord's root if the last chord is I
    return out;
  }

  // ---------- questions ----------
  function tierColour(lv) { return lv.tier >= 3 ? 3 : lv.tier >= 2 ? 2 : 0; }
  function voice(prog, k, lv, r, tonality, over) {
    var t = tierColour(lv);
    return prog.map(function (tok, i) {
      var inv = lv.inv && r() < lv.inv && ROMAN[tok].q !== "o" && ROMAN[tok].q !== "d" ? (r() < 0.6 ? 1 : 2) : 0;
      if (over && over.at === i && over.gospel) return chord(tok, k, t >= 3 ? pick(["add9", "maj9"], r) : "add9", 0);
      if (over && over.at === i && over.anchors) {     // a reharmonised chord keeps the tune's notes in whatever colour it takes
        for (var g = 0; g < 12; g++) { var c = chord(tok, k, colourFor(tok, t, r, tonality), inv), pcs = c.tones.map(function (x) { return mod(c.root + x, 12); });
          if (over.anchors.every(function (a) { return pcs.indexOf(a) >= 0; })) return c; }
        return chord(tok, k, null, inv);
      }
      return chord(tok, k, colourFor(tok, t, r, tonality), inv);
    });
  }
  function question(id, opts, r) {
    opts = opts || {}; r = r || Math.random;
    var lv = level(id), melodyMode = lv.id[0] === "m";
    var borrowed = !!opts.borrowed, shared = !melodyMode && !!opts.tune;
    var tonality = opts.tonality === "any" ? pick(Object.keys(TONALITIES), r) : TONALITIES[opts.tonality] ? opts.tonality : "major";
    var keys = keysFor(tonality), k = opts.key && keys.indexOf(opts.key) >= 0 ? opts.key : opts.key && KEYS[opts.key] && tonality === "major" ? opts.key : pick(keys, r), TB = tables(tonality);
    for (var tries = 0; tries < 60; tries++) {
      var base = pick(TB[lv.chords], r).slice(), done = null, perBar0 = lv.chords === "eight" ? 2 : 1;
      var lvDiffs = borrowed ? lv.diffs : lv.diffs.map(function (d) { return d === "mode" || d === "chrom" ? "diat" : d; }).filter(function (d, x, a) { return a.indexOf(d) === x; });
      var kinds = shuffle(lvDiffs, r).concat(tonality === "major" && borrowed ? [] : ["rel", "far"]);
      // a tune over the band: one melody, the same in all three clips (made over the plain triads of the base progression)
      var tuneMel = shared ? melody(base.map(function (tok) { return chord(tok, k); }), perBar0, lv.tier >= 3 ? 3 : lv.tier >= 2 ? 2 : 1, keyInfo(k), r) : null;
      for (var j = 0; j < kinds.length && !done; j++) {
        var places = shuffle(base.map(function (_, i) { return i; }), r);
        for (var p = 0; p < places.length && !done; p++) {
          var i = places[p];
          if (kinds[j] === "diat") {
            if (i === 0) continue;
            var c0 = chord(base[i], k), anchors;
            if (tuneMel) anchors = tuneMel.filter(function (m) { return m.ci === i && !m.nht; }).map(function (m) { return mod(m.midi, 12); });
            else anchors = [mod(c0.root + c0.tones[1 + Math.floor(r() * 2)], 12)];   // a note a melody could hold there: the chord's 3rd or 5th
            anchors = anchors.filter(function (a, x, A) { return A.indexOf(a) === x; });
            var rh = anchors.length ? reharm(base, i, k, tonality, anchors, r) : null;
            if (!rh) continue;
            var oddD = base.slice(); oddD[i] = rh.tok;
            done = { odd: oddD, at: i, kind: "diat", gospel: rh.gospel, anchors: anchors };
            continue;
          }
          var subs = ((TB.subs[kinds[j]] || {})[base[i]] || []).filter(function (s) { return s !== base[i - 1] && s !== base[i + 1]; });
          if (i === 0 && kinds[j] !== "rel") continue;            // keep the start; a third-related start is still musical
          if (!subs.length) continue;
          var odd = base.slice(); odd[i] = pick(subs, r);
          done = { odd: odd, at: i, kind: kinds[j] };
        }
      }
      if (!done) continue;
      var perBar = lv.chords === "eight" ? 2 : 1, poolName = opts.pool && opts.pool !== "level" ? opts.pool : lv.pool;
      var styles = shuffle(STYLE_POOLS[poolName] || STYLE_POOLS.pop, r).slice(0, 3), sounds = shuffle(MELODY_SOUNDS, r).slice(0, 3);
      var oddIndex = Math.floor(r() * 3), clips = [], n = melodyMode ? +lv.id.slice(1) : 0, si = 0;
      for (var c = 0; c < 3; c++) {
        var isOdd = c === oddIndex, prog = isOdd ? done.odd : base, chs = voice(prog, k, lv, r, tonality, isOdd ? done : null);
        var clip = { odd: isOdd, chords: chs, style: styles[isOdd ? 2 : si], sound: sounds[isOdd ? 2 : si] };
        if (!isOdd) si++;
        if (melodyMode) clip.melody = melody(chs, perBar, n, keyInfo(k), r);
        else if (tuneMel) clip.melody = tuneMel;
        clips.push(clip);
      }
      var from = base[done.at], to = done.odd[done.at], text = DIFF_TEXT[done.kind];
      if (done.kind === "diat") {
        var sy = done.anchors.map(function (a) { return syllable(a, k); }).join(" and ");
        text = (tuneMel ? "under the tune's " : "a chord that still holds ") + sy + (done.gospel ? " (" + syllable(mod(chord(to, k).root + 2, 12), k) + " is the 9th of " + to + ": a gospel sound)" : (tuneMel ? ", which both chords hold" : ""));
      }
      return { shared: !!tuneMel, borrowed: borrowed, level: lv, key: k, tonality: tonality, keyLabel: keyInfo(k).label, perBar: perBar, base: base, odd: done.odd, at: done.at, oddIndex: oddIndex, clips: clips, melodyMode: melodyMode,
        diff: { kind: done.kind, text: "Chord " + (done.at + 1) + " (bar " + (Math.floor(done.at / perBar) + 1) + "): " + from + " became " + to + ", " + text + "." } };
    }
    return null;
  }

  // ---------- ABC ----------
  function abcPitch(midi, letter, sig, barAcc) {
    var nat = NAT[letter], a = mod(midi - nat + 6, 12) - 6, natMidi = midi - a, oct = Math.round((natMidi - nat) / 12) - 1;
    var keyA = sig[letter] || 0, k = letter + ":" + oct, cur = barAcc[k] != null ? barAcc[k] : keyA, s = "";
    if (a !== cur) { s = a === 0 ? "=" : a > 0 ? "^".repeat(a) : "_".repeat(-a); barAcc[k] = a; }
    var L = LET[letter];
    if (oct >= 5) { L = L.toLowerCase() + "'".repeat(oct - 5); } else { L = L + ",".repeat(Math.max(0, 4 - oct)); }
    return s + L;
  }
  // a letter for a melody note: a chord tone takes the chord's spelling, anything else the key's (or the nearer chromatic)
  function letterFor(midi, ch, k) {
    var pcs = chordPcs(ch), i = pcs.indexOf(mod(midi, 12));
    if (i >= 0) return (ch.letter + ch.steps[i]) % 7;
    var K = keyInfo(k), deg = K.sc.indexOf(mod(midi - K.pc, 12));
    if (deg >= 0) return (K.letter + deg) % 7;
    // chromatic: a raised note below in sharp keys / C, a lowered note above in flat keys
    var d2 = K.sc.indexOf(mod(midi - K.pc + (K.sharp ? -1 : 1), 12));
    return (K.letter + (d2 >= 0 ? d2 : 0)) % 7;
  }
  function len(d8) { return d8 === 1 ? "" : String(d8); }
  function header(q, title) { return "X:1\nT:" + title + "\nM:4/4\nL:1/8\nK:" + keyInfo(q.key).abc + "\n"; }
  function abcBand(clip, q, showSyms) {
    var sig = keySig(q.key), up = [], lo = [], prevTop = null, bar = {}, bbar = {}, at8 = 0;
    clip.chords.forEach(function (ch, i) {
      var per = ch.beats ? ch.beats * 2 : 8 / q.perBar, blank = at8 % 8 === 0; at8 += per;
      if (blank) { bar = {}; bbar = {}; }
      // upper voices: the chord tones above the bass, close, near the last voicing
      var pcs = ch.tones.map(function (x, j) { return { pc: mod(ch.root + x, 12), l: (ch.letter + ch.steps[j]) % 7 }; });
      var upper = pcs.filter(function (x, j) { return !(j === 0 && ch.tones.length >= 4 && ch.bass === ch.root); });
      var ref = prevTop || 67, notes = upper.map(function (x) { var m = 60 + mod(x.pc - 60, 12); if (m < 60) m += 12; return { m: m, l: x.l }; });
      notes.sort(function (a, b) { return a.m - b.m; });
      // rotate to sit around ref
      for (var g = 0; g < 4 && notes[notes.length - 1].m < ref - 2; g++) { var lo1 = notes.shift(); lo1.m += 12; notes.push(lo1); }
      while (notes[notes.length - 1].m > 79) { var hi1 = notes.pop(); hi1.m -= 12; notes.unshift(hi1); }
      prevTop = notes[notes.length - 1].m;
      var bassL = ch.bass === ch.root ? ch.letter : (pcs.filter(function (x) { return x.pc === ch.bass; })[0] || { l: ch.letter }).l;
      var bm = 40 + mod(ch.bass - 40, 12);
      var sym = showSyms ? '"' + ch.sym + '"' : "";
      var g8 = len(per);
      up.push((blank && i ? "| " : "") + sym + "[" + notes.map(function (x) { return abcPitch(x.m, x.l, sig, bar); }).join("") + "]" + g8 + " ");
      lo.push((blank && i ? "| " : "") + abcPitch(bm, bassL, sig, bbar) + g8 + " ");
    });
    if (clip.melody) return header(q, "") + "%%staves 0 {1 2}\nV:0 clef=treble name=\"Tune\"\nV:1 clef=treble\nV:2 clef=bass\n[V:0] " + melBody(clip, q, showSyms, false) + "|]\n[V:1] " + up.join("").replace(/"[^"]*"/g, "") + "|]\n[V:2] " + lo.join("") + "|]\n";
    return header(q, "") + "%%staves {1 2}\nV:1 clef=treble\nV:2 clef=bass\n[V:1] " + up.join("") + "|]\n[V:2] " + lo.join("") + "|]\n";
  }
  function abcMelody(clip, q, showSyms, labels) { return header(q, "") + melBody(clip, q, showSyms, labels) + "|]\n"; }
  function melBody(clip, q, showSyms, labels) {
    var sig = keySig(q.key), s = "", bar = {}, curBar = -1, lastCi = -1, starts = [], acc = 0;
    // the chord sounding at each note, by time (a shared tune can sit over a version with more or fewer chords; chords change on 2-beat boundaries, where a note always starts)
    clip.chords.forEach(function (c) { starts.push(acc); acc += c.beats || 4 / q.perBar; });
    function ciAt(t) { var k = 0; for (var i = 0; i < starts.length; i++) if (starts[i] <= t + 1e-6) k = i; return k; }
    clip.melody.forEach(function (n) {
      var b = Math.floor(n.t / 4 + 1e-6);
      if (b !== curBar) { if (curBar >= 0) s += "| "; curBar = b; bar = {}; }
      var ci = ciAt(n.t), ch = clip.chords[ci];
      if (ci !== lastCi && showSyms) s += '"' + ch.sym + '"';
      lastCi = ci;
      if (labels && n.nht) s += '"_' + n.nht + '"';
      s += abcPitch(n.midi, letterFor(n.midi, ch, q.key), sig, bar) + len(Math.round(n.d * 2)) + (n.tie ? "-" : "") + (n.d < 1 && (n.t * 2) % 2 === 0 ? "" : " ");
    });
    return s;
  }
  // what the band reads: the chord symbols over a placeholder note per chord (the band plays the chords; melody is off)
  function abcPlay(clip, q) {
    if (clip.melody && q.shared) return abcMelody(clip, q, true, false);   // the tune with its chord symbols: the band plays both
    var s = "", at8 = 0;
    clip.chords.forEach(function (ch, i) { var per = ch.beats ? ch.beats * 2 : 8 / q.perBar; if (i && at8 % 8 === 0) s += "| "; at8 += per; s += '"' + ch.sym + '"C' + len(per) + " "; });
    return "X:1\nM:4/4\nL:1/8\nK:C\n" + s + "|]\n";
  }

  var api = { LEVELS: LEVELS, MLEVELS: MLEVELS, STYLE_POOLS: STYLE_POOLS, TEMPLATES: TEMPLATES, ROMAN: ROMAN, KEYS: KEYS, SUBS: SUBS, TONALITIES: TONALITIES, MODAL: MODAL, keyInfo: keyInfo, keysFor: keysFor, DIATONIC: DIATONIC, reharm: reharm, syllable: syllable, levelText: levelText,
    level: level, chord: chord, melody: melody, question: question, abcBand: abcBand, abcMelody: abcMelody, abcPlay: abcPlay, keySig: keySig, rng: rng };
  global.ProgEar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  // ================= the page =================
  // The page is shared: ProgEar.mount(hostId, cfg) runs it with another question maker (Blues Changes by Ear, blues-ear.js).
  // cfg: { store, defaults, question(ST) -> q, hk(ST), note(ST), none(ST), controls(sel, G, rebuild) } (G.question, G.band: the groups'
  // grids; G.busy() adds the Busyness menu); the q it makes has the shape question() returns
  // (q.join separates the chords of q.base / q.odd when shown).
  var KEY = "progEar.v1", ST = {}, CFG = null;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
  var DEF = { mode: "band", level: "1", mlevel: "m1", drums: "on", pool: "level", key: "random", tempo: 100, notation: "off", syms: "after", tonality: "major", borrowed: "off", tune: "off", busy: "full", hist: {} };
  var PROG_CFG = {
    store: "progEar.v1", defaults: DEF,
    question: function (ST) { return question(lv().id, { pool: ST.pool, tonality: ST.tonality, borrowed: ST.borrowed === "on", tune: ST.tune === "on", key: ST.key === "random" ? null : ST.key }); },
    hk: function (ST) { return lv().id + (ST.tonality === "major" ? "" : ":" + ST.tonality); },
    note: function (ST) { return levelText(lv(), ST.borrowed === "on").note; },
    controls: function (sel, G, rebuild) {
      var g = G.question, g2 = G.band;
      g.appendChild(sel("Hear it as", "mode", [["band", "The band"], ["melody", "A melody line"]], function () { stop(); cur = null; rebuild(); }));
      if (ST.mode === "melody") g.appendChild(sel("Level", "mlevel", MLEVELS.map(function (l) { return [l.id, l.id.slice(1) + " · " + l.title.replace(/^Melody: /, "")]; }), rebuild));
      else g.appendChild(sel("Level", "level", LEVELS.map(function (l) { return [l.id, l.id + " · " + levelText(l, ST.borrowed === "on").title]; }), rebuild));
      g.appendChild(sel("Tonality", "tonality", Object.keys(TONALITIES).map(function (t) { return [t, TONALITIES[t].label]; }).concat([["any", "Any tonality"]]), rebuild));
      g.appendChild(sel("Borrowed chords", "borrowed", [["off", "Off: diatonic only"], ["on", "On"]], rebuild));
      if (ST.mode === "band") g2.appendChild(sel("A tune on top", "tune", [["off", "No: chords only"], ["on", "Yes: the same tune"]]));
      if (ST.mode === "band") g2.appendChild(sel("Drums", "drums", [["on", "With drums"], ["off", "Without drums"]]));
      if (ST.mode === "band") G.busy();
      if (ST.mode === "band") g2.appendChild(sel("Styles", "pool", [["level", "As the level sets it"], ["pop", "Pop, rock, folk"], ["jazz", "Jazz and Latin"], ["mixed", "A mix"], ["all", "Any style"]]));
      var tk = ST.tonality === "any" ? [] : keysFor(ST.tonality);
      if (ST.key !== "random" && tk.indexOf(ST.key) < 0) ST.key = "random";
      g.appendChild(sel("Key", "key", [["random", "Any key"]].concat(tk.map(function (k) { return [k, keyInfo(k).label]; }))));
    }
  };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var cur = null, ui = {}, host, playing = null, run = 0;
  var NAMES = ["A", "B", "C"];
  function styleLabel(id) { try { var s = global.BandCatalog && global.BandCatalog.byId(global.BandCatalog.styles, id); if (s) return s.label; } catch (e) {} return id; }
  function soundLabel(id) { return { piano: "Piano", epiano: "Electric piano", clguitar: "Classical guitar", organ: "Organ" }[id] || id; }
  function status(s) { if (ui.status) ui.status.textContent = s; }
  function stop() { run++; if (playing) try { playing.stop(); } catch (e) {} playing = null; try { global.AbcPlay && global.AbcPlay.stop(); } catch (e) {} lightClip(-1); }
  function lightClip(i) { (ui.clipBtns || []).forEach(function (b, j) { b.classList.toggle("pe-now", j === i); }); }
  function visual(abc, target) { return global.ABCJS.renderAbc(target, abc, { add_classes: true, responsive: "resize", paddingtop: 0, paddingbottom: 0 })[0]; }
  // Busyness: band parts swapped for plainer ones (BandCatalog ids). full = the style as written; less = no fills, a two-feel or
  // roots on 1 and 3, steady chords; calm = held roots, long chords, light time on brushes (none when the drums are off).
  function busyOpts(styleId) {
    var b = ST.busy || "full"; if (b === "full") return null;
    var st = null; try { st = global.BandCatalog.byId(global.BandCatalog.styles, styleId); } catch (e) {}
    var swing = st ? st.feel !== "straight" : false;
    if (b === "less") return swing ? { fills: "none", bassFeel: "two", compRhythm: "four", groove: "ridetime" } : { fills: "none", bassFeel: "halves", compRhythm: "quarters" };
    return { fills: "none", bassFeel: "held", compRhythm: "pad", groove: swing ? "brushswing" : "brushes", push: false };
  }
  api.busyOpts = function (id, b) { var o = ST.busy; ST.busy = b; try { return busyOpts(id); } finally { ST.busy = o; } };
  function playClip(i, myRun) {
    var clip = cur.q.clips[i], h;
    lightClip(i); status("♪ " + NAMES[i] + "…");
    if (cur.q.melodyMode) {
      var v = visual(abcMelody(clip, cur.q, false, false), ui.scratch);
      h = global.AbcPlay.play(v, { sound: clip.sound, qpm: +ST.tempo, light: false });
    } else {
      var abc = abcPlay(clip, cur.q), v2 = visual(abc, ui.scratch);
      h = global.AbcPlay.play(v2, { abc: abc, style: clip.style, qpm: +ST.tempo, drums: ST.drums === "on", melody: !!cur.q.shared, light: false, bandOpts: busyOpts(clip.style) || undefined });
    }
    playing = h;
    return h.done.then(function () { if (myRun === run) { lightClip(-1); status(""); } });
  }
  function playAll() {
    if (!cur) return; stop(); var my = run, i = 0;
    (function next() {
      if (my !== run || i > 2) return;
      playClip(i, my).then(function () { i++; if (my === run && i <= 2) setTimeout(next, 900); });
    })();
  }
  function one(i) { if (!cur) return; stop(); playClip(i, run); }
  function lv() { return level(ST.mode === "melody" ? ST.mlevel : ST.level); }
  function hk() { return CFG.hk(ST); }
  function score() { var h = ST.hist[hk()] || [], n = h.reduce(function (a, b) { return a + b; }, 0);
    ui.score.textContent = h.length ? "Last " + h.length + ": " + n + " right" + (h.length >= 10 && n >= 8 ? " · ready for the next level ✓" : "") : "No answers yet at this level."; }
  function newQ() {
    stop();
    var q = CFG.question(ST);
    if (!q) { status(CFG.none ? CFG.none(ST) : "No question could be made with these settings."); return; }
    cur = { q: q, answered: false };
    ui.result.innerHTML = ""; ui.reveal.hidden = true;
    ui.choices.forEach(function (b) { b.disabled = false; b.classList.remove("pe-right", "pe-wrong"); });
    ui.prompt.textContent = q.melodyMode ? "Three melodies over chords. Two outline the same progression. Which is different?"
      : q.prompt ? q.prompt : q.shared ? "The same tune three times, in three styles. Under two of them the chords are the same. Which is different?"
      : "Three versions in three styles. Two are the same progression. Which is different?";
    drawNotation(); playAll();
  }
  function describe(clip) { return clip.chords.map(function (c) { return c.sym; }).join("  "); }
  function drawNotation() {
    if (!ui.notes) return;
    ui.notes.innerHTML = ""; ui.notes.hidden = ST.notation !== "on" || !cur;
    if (ui.notes.hidden) return;
    var syms = ST.syms === "always" || cur.answered, labels = cur.answered && cur.q.melodyMode;
    cur.q.clips.forEach(function (clip, i) {
      var box = el("div", "pe-clip" + (cur.answered && clip.odd ? " pe-oddclip" : "")), head = el("div", "pe-cliphead");
      head.appendChild(el("b", null, NAMES[i]));
      if (cur.answered) head.appendChild(el("span", "pe-hint", " · " + (cur.q.melodyMode ? soundLabel(clip.sound) : styleLabel(clip.style)) + (clip.odd ? " · the different one" : "")));
      var b = btnEl("▶", "pe-mini", function () { one(i); }); head.appendChild(b);
      box.appendChild(head);
      var svg = el("div", "pe-svg"); box.appendChild(svg); ui.notes.appendChild(box);
      try { visual(cur.q.melodyMode ? abcMelody(clip, cur.q, syms, labels) : abcBand(clip, cur.q, syms), svg); } catch (e) { svg.textContent = "(could not draw)"; }
    });
    if (labels) ui.notes.appendChild(el("div", "pe-hint", "Under the notes: P passing, N neighbour, CN chromatic neighbour, A appoggiatura, S suspension, Ant anticipation, E escape tone."));
  }
  function answer(i) {
    if (!cur || cur.answered) return; cur.answered = true;
    var q = cur.q, ok = i === q.oddIndex, h = ST.hist[hk()] || []; h.push(ok ? 1 : 0); if (h.length > 10) h.shift(); ST.hist[hk()] = h; save(); score();
    ui.choices.forEach(function (b, j) { b.disabled = true; if (j === q.oddIndex) b.classList.add("pe-right"); else if (j === i) b.classList.add("pe-wrong"); });
    ui.result.innerHTML = "";
    ui.result.appendChild(el("div", ok ? "pe-ok" : "pe-no", (ok ? "Right. " : "Not quite. ") + NAMES[q.oddIndex] + " was the different one."));
    ui.result.appendChild(el("div", null, q.diff.text));
    var tbl = el("div", "pe-prog");
    q.clips.forEach(function (clip, j) {
      var row = el("div", clip.odd ? "pe-oddrow" : null);
      row.appendChild(el("b", null, NAMES[j] + " "));
      row.appendChild(el("span", "pe-hint", "(" + (q.melodyMode ? soundLabel(clip.sound) : styleLabel(clip.style)) + ") "));
      row.appendChild(el("span", null, (clip.odd ? q.odd : q.base).join(q.join || " – ") + "   ·   " + describe(clip)));
      tbl.appendChild(row);
    });
    ui.result.appendChild(tbl);
    ui.result.appendChild(el("div", "pe-hint", "Key: " + q.keyLabel + ". " + (q.level.tier >= 1 ? "Inversions, sevenths and extensions differ between the two same versions on purpose." : "")));
    ui.reveal.hidden = false; drawNotation();
  }
  function sel(labelTxt, key, items, onchange) {
    var lab = el("label"), s = el("select"); lab.appendChild(el("span", null, labelTxt)); lab.appendChild(s);
    items.forEach(function (it) { var o = el("option", null, it[1]); o.value = it[0]; s.appendChild(o); }); s.value = String(ST[key]);
    s.onchange = function () { ST[key] = s.value; save(); if (onchange) onchange(); };
    return lab;
  }
  function btnEl(txt, cls, fn) { var b = el("button", cls, txt); b.type = "button"; b.onclick = fn; return b; }
  function build(h) {
    host = h; h.innerHTML = ""; h.classList.add("pe-panel"); ui = {};
    // three groups: what the question is, how the band plays it, what is drawn
    var groups = el("div", "pe-groups");
    function group(title) { var f = el("fieldset", "pe-group"), lg = el("legend", null, title), gg = el("div", "pe-grid"); f.appendChild(lg); f.appendChild(gg); groups.appendChild(f); return gg; }
    var G = { question: group("The question"), band: group("The band"), show: null };
    G.busy = function () { G.band.appendChild(sel("Busyness", "busy", [["full", "As the style plays it"], ["less", "Less busy"], ["calm", "Calm: long notes"]])); };
    CFG.controls(sel, G, function () { build(h); });
    G.band.appendChild(sel("Tempo", "tempo", [72, 84, 92, 100, 112, 126, 138, 152, 168].map(function (x) { return [String(x), x + " a quarter"]; })));
    G.show = group("Notation");
    var ns = sel("Notation", "notation", [["off", "Hidden"], ["on", "Shown"]], drawNotation); ui.notationSel = ns.querySelector("select"); G.show.appendChild(ns);
    G.show.appendChild(sel("Chord symbols", "syms", [["after", "After I answer"], ["always", "Always"]], drawNotation));
    h.appendChild(groups);
    h.appendChild(el("p", "pe-hint pe-note", CFG.note(ST)));
    var bar = el("div", "pe-bar");
    bar.appendChild(btnEl("Start", "pe-go", newQ));
    bar.appendChild(btnEl("▶ All three", null, playAll));
    ui.clipBtns = NAMES.map(function (n, i) { var b = btnEl("▶ " + n, null, function () { one(i); }); bar.appendChild(b); return b; });
    bar.appendChild(btnEl("■", null, function () { stop(); status(""); }));
    h.appendChild(bar);
    ui.prompt = el("div", "pe-prompt", "Press Start."); h.appendChild(ui.prompt);
    var ch = el("div", "pe-choices");
    ui.choices = NAMES.map(function (n, i) { var b = btnEl(n + " is different", "pe-choice", function () { answer(i); }); b.disabled = true; ch.appendChild(b); return b; });
    h.appendChild(ch);
    ui.status = el("div", "pe-status"); h.appendChild(ui.status);
    ui.result = el("div", "pe-result"); h.appendChild(ui.result);
    ui.reveal = el("div", "pe-bar"); ui.reveal.hidden = true;
    ui.reveal.appendChild(btnEl("Next", "pe-go", newQ)); h.appendChild(ui.reveal);
    ui.notes = el("div", "pe-notes"); ui.notes.hidden = true; h.appendChild(ui.notes);
    ui.scratch = el("div", "pe-scratch"); ui.scratch.setAttribute("aria-hidden", "true"); h.appendChild(ui.scratch);
    ui.score = el("div", "pe-hint"); h.appendChild(ui.score); score();
  }
  document.addEventListener("keydown", function (e) {
    if (!host || /INPUT|SELECT|TEXTAREA|BUTTON/.test((e.target || {}).tagName || "")) return;
    var k = e.key.toLowerCase();
    if (k === " ") { e.preventDefault(); playAll(); }
    else if (k === "a" || k === "1") answer(0); else if (k === "b" || k === "2") answer(1); else if (k === "c" || k === "3") answer(2);
    else if (k === "n") { ST.notation = ST.notation === "on" ? "off" : "on"; save(); if (ui.notationSel) ui.notationSel.value = ST.notation; drawNotation(); }
    else if (k === "enter") { e.preventDefault(); newQ(); }
  });
  api._cur = function () { return cur; }; api._ST = function () { return ST; };
  function mount(id, cfg) {
    function go() {
      var h = document.getElementById(id); if (!h || host) return;
      CFG = cfg; KEY = cfg.store; ST = load();
      Object.keys(cfg.defaults).forEach(function (k) { if (ST[k] == null) ST[k] = cfg.defaults[k]; });
      build(h);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
  api._save = save;
  api.mount = mount; api.stop = function () { stop(); };
  mount("prog-ear", PROG_CFG);
})(typeof window !== "undefined" ? window : globalThis);
