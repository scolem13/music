// figured.js — figured bass (Hutchinson, Music Theory for the 21st-Century Classroom, ch. 16). Load after drills.js. Adds
// Drills.engines:
//   fbrn     name the chord on the staff with a Roman numeral and figured-bass inversion symbol (I64, V65, viiø42; 16.2, ex. 1–3)
//   fbwrite  write the notes of a numeral with figures (ex. 4)
//   fbfig    the chord on the staff: which figure? (buttons 53 6 64 7 65 43 42), no Roman numeral needed
//   fbreal   a bass note, a key and figures: write the notes the figures stand for (intervals above the bass, in the key signature)
//   sixfour  four voices, four chords: cadential, passing or pedal six-four? (16.3–16.4)
// The figures follow the book's Figures 16.2.1–2: triads 5/3 (none written), 6, 6/4; seventh chords 7, 6/5, 4/3, 4/2, and an
// inverted seventh chord drops the "7" (V65, not V765) but keeps M, ø, ° (IM43, viiø42).
(function (global) {
  "use strict";
  var D = global.Drills; if (!D) return;
  var EX = D.engines;
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" }, ACC_TXT = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function dia(n) { return n.o * 7 + n.l; }
  function fromDia(d, a) { return { l: ((d % 7) + 7) % 7, o: Math.floor(d / 7), a: a || 0 }; }
  function midi(n) { return 12 * (n.o + 1) + NAT[n.l] + n.a; }
  function name(n) { return LET[n.l] + ACC_TXT[n.a]; }
  function same(a, b) { return !!(a && b && a.l === b.l && a.a === b.a); }
  var MAJ = { "-7": "C♭", "-6": "G♭", "-5": "D♭", "-4": "A♭", "-3": "E♭", "-2": "B♭", "-1": "F", "0": "C", "1": "G", "2": "D", "3": "A", "4": "E", "5": "B", "6": "F♯", "7": "C♯" };
  var MIN = { "-7": "A♭", "-6": "E♭", "-5": "B♭", "-4": "F", "-3": "C", "-2": "G", "-1": "D", "0": "A", "1": "E", "2": "B", "3": "F♯", "4": "C♯", "5": "G♯", "6": "D♯", "7": "A♯" };
  var SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  function keySigMap(k) { var m = [0, 0, 0, 0, 0, 0, 0]; for (var i = 0; i < Math.abs(k); i++) m[(k > 0 ? SHARP_ORDER : FLAT_ORDER)[i]] = k > 0 ? 1 : -1; return m; }
  function parseName(t) {
    var m = /^([A-Ga-g])(##|bb|x|𝄪|𝄫|#|b|♯|♭)?$/.exec(t); if (!m) return null;
    return { l: LET.indexOf(m[1].toUpperCase()), a: { "": 0, "#": 1, "♯": 1, "b": -1, "♭": -1, "##": 2, "x": 2, "𝄪": 2, "bb": -2, "𝄫": -2 }[m[2] || ""] };
  }
  function parseNotes(t) { var ns = String(t || "").trim().split(/[\s,–-]+/).filter(Boolean).map(parseName); return ns.some(function (n) { return !n; }) ? null : ns; }
  function makeKey(s) {
    var mode = s.mode === "both" ? pick(["major", "minor"]) : s.mode, m = +s.most, k0 = -m + rnd(2 * m + 1), tName = (mode === "major" ? MAJ : MIN)[k0];
    return { k: k0, mode: mode, tonic: parseName(tName.replace("♭", "b").replace("♯", "#")), sig: keySigMap(k0),
      abc: tName.replace("♭", "b").replace("♯", "#") + (mode === "minor" ? "m" : ""),
      label: (mode === "major" ? tName : tName.charAt(0).toLowerCase() + tName.slice(1)) + " " + mode };
  }
  // the note `steps` scale steps above the tonic in octave `oct`, as the key signature has it (raise: the minor key's leading tone)
  function deg(key, steps, oct, raise) {
    var n = fromDia(key.tonic.l + 7 * oct + steps, 0); n.a = key.sig[n.l];
    if (raise && key.mode === "minor" && ((steps % 7) + 7) % 7 === 6) n.a += 1;
    return n;
  }
  function barNote(n, sig, st) {
    var now = n.l in st ? st[n.l] : sig[n.l], s = (n.a !== now ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    st[n.l] = n.a;
    for (var i = 5; i < n.o; i++) s += "'"; for (var j = 4; j > n.o; j--) s += ",";
    return s;
  }
  function chordAbc(v, sig, st, len) { return "[" + v.map(function (n) { return barNote(n, sig, st); }).join("") + "]" + len; }

  // ---- figures
  var TRI_FIG = ["", "6", "64"], SEV_FIG = ["7", "65", "43", "42"];
  var FIG_TXT = { "53": "5/3 (root position)", "6": "6", "64": "6/4", "7": "7", "65": "6/5", "43": "4/3", "42": "4/2" };
  var FIG_SHOW = { "53": "⁵₃", "6": "⁶", "64": "⁶₄", "7": "⁷", "65": "⁶₅", "43": "⁴₃", "42": "⁴₂" };
  var MEMBER = ["root", "3rd", "5th", "7th"];
  // what each figure means: the intervals above the bass it stands for (16.5), and the chord member in the bass
  var MEANS = {
    "53": "a 5th and a 3rd above the bass: the root is in the bass (root position; usually no figure is written)",
    "6": "short for 6/3: a 6th and a 3rd above the bass. The bass is the chord's 3rd (first inversion)",
    "64": "a 6th and a 4th above the bass. The bass is the chord's 5th (second inversion), and the 4th above it is the root",
    "7": "short for 7/5/3: a 7th, a 5th and a 3rd above the bass. The root is in the bass",
    "65": "short for 6/5/3: a 6th, a 5th and a 3rd above the bass. The 3rd is in the bass; the 5th above it is the 7th of the chord",
    "43": "short for 6/4/3: a 6th, a 4th and a 3rd above the bass. The 5th is in the bass; the 3rd above it is the 7th of the chord",
    "42": "short for 6/4/2: a 6th, a 4th and a 2nd above the bass. The 7th is in the bass; the 2nd above it is the root"
  };
  // "V7/3rd" -> "V65", "I/5th" -> "I64", "viiø7" -> "viiø7"
  function toFig(rn) {
    var m = /^(.*?)(7?)(\/3rd|\/5th|\/7th)?$/.exec(rn), seventh = m[2] === "7" || /M7/.test(rn), inv = { "": 0, "/3rd": 1, "/5th": 2, "/7th": 3 }[m[3] || ""];
    if (!seventh) return m[1] + TRI_FIG[inv];
    var base = rn.replace(/\/(3rd|5th|7th)$/, "").replace(/7$/, "");   // IM7 -> IM, V7 -> V, viiø7 -> viiø
    return base + SEV_FIG[inv];
  }
  function figOf(seventh, inv) { return seventh ? SEV_FIG[inv] : (TRI_FIG[inv] || "53"); }

  var KIND = { id: "kind", label: "Chords", type: "select", options: ["triads", "sevenths", "both"], names: { triads: "Triads (6, 6/4)", sevenths: "Seventh chords (7, 6/5, 4/3, 4/2)", both: "Both" }, def: "both" };
  var KEYS = [
    { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" },
    { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4", "5", "6", "7"], def: "4" }
  ];
  var INVS = { id: "inv", label: "Position", type: "select", options: ["all", "inv"], names: { all: "Root position and inversions", inv: "Inversions only" }, def: "all" };
  var CLEFS = { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: { treble: "Treble", bass: "Bass" }, def: ["treble", "bass"] };
  function sevenths(s) { return s.kind === "sevenths" || (s.kind === "both" && rnd(2)); }
  // a question from drills.js's own rn / rn7 engines (same keys and chords), re-labelled with figures
  function base(s, write) {
    var sev = sevenths(s), E = sev ? EX[write ? "rn7write" : "rn7"] : EX[write ? "rnwrite" : "rn"];
    var ss = { mode: s.mode, most: s.most, minorset: "common", inv: "all", clef: s.clef || ["treble"] };
    for (var t = 0; t < 50; t++) {
      var q = E.make(ss), slash = write ? q.show.split(": ")[1] : q.answer, inv = /\/7th/.test(slash) ? 3 : /\/5th/.test(slash) ? 2 : /\/3rd/.test(slash) ? 1 : 0;
      if (s.inv === "inv" && !inv) continue;
      q.slash = slash; q.sev = sev; q.inv = inv; q.fig = figOf(sev, inv); q.E = E;
      return q;
    }
    return null;
  }
  function explainFig(q) { return "Figure " + FIG_TXT[q.fig] + ": " + MEANS[q.fig] + "."; }

  EX.fbrn = {
    title: "Roman numerals with figured bass",
    input: "text",
    palette: ["I", "V", "i", "v", "°", "ø", "M", "6", "64", "7", "65", "43", "42"],
    SETTINGS: KEYS.concat([KIND, INVS, CLEFS]),
    make: function (s) {
      var q = base(s, false); if (!q) return null;
      q.answer = toFig(q.slash);
      q.label = q.label.replace(/ \(add .*$/, ".").replace(/\.?$/, ". Add the figures (6, 64, 65, 43, 42) when it is inverted.");
      return q;
    },
    check: function (q, typed) {
      var t = String(typed || "").replace(/\s+/g, "").replace(/(M|maj|Δ)(?=65|6\/5|43|4\/3|42|4\/2|2$)/, "M7");   // the book's IM43 = IM7/5th
      return q.E.check({ answer: q.slash }, t);
    },
    explain: explainFig,
    keyHelp: function () { return "Type it, then Enter: capitals for major, small for minor, o for °, h for ø, M for a major 7th (IM7, IVM65). Triads: 6 or 64. Seventh chords: 7, 65, 43, 42 (no 7 when inverted: V65)."; },
    midiNeed: 3,
    midiMatch: function (q, notes) { return EX.triad.midiMatch(q, notes); }
  };
  EX.fbwrite = {
    title: "Write the chord from figured bass",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: KEYS.concat([KIND, INVS]),
    make: function (s) {
      var q = base(s, true); if (!q) return null;
      q.show = q.show.split(": ")[0] + ": " + toFig(q.slash);
      q.words = true;
      return q;
    },
    check: function (q, typed) { return q.E.check(q, typed); },
    explain: explainFig,
    keyHelp: function () { return "Type the note names with spaces, lowest first (in C, V65 is B D F G), then Enter. The figure tells you which chord member goes in the bass."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  EX.fbfig = {
    title: "Which figure?",
    SETTINGS: KEYS.concat([KIND, CLEFS]),
    make: function (s) {
      var q = base(Object.assign({}, s, { inv: "all" }), false); if (!q) return null;
      q.answer = q.fig;
      q.label = "Key: " + q.label.split(".")[0].replace("Key: ", "") + ". Count up from the lowest note: which figured-bass symbol fits?";
      return q;
    },
    answers: function (s) { return (s.kind === "sevenths" ? [] : ["53", "6", "64"]).concat(s.kind === "triads" ? [] : ["7", "65", "43", "42"]); },
    buttonText: function (a) { return FIG_SHOW[a]; },
    answerName: function (a) { return FIG_TXT[a]; },
    explain: function (q) { return MEANS[q.fig] + "."; },
    keyHelp: function () { return "Keys: 5 root-position triad, 6, 4 (6/4), 7, f (6/5), t (4/3), 2 (4/2)."; },
    letterKeys: { "5": "53", "6": "6", "4": "64", "7": "7", f: "65", t: "43", "2": "42" },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- realize: a bass note and figures -> the notes, from the bass up, in the key signature (16.1: "intervals above the bass within the key signature")
  var REAL = { "53": [2, 4], "6": [2, 5], "64": [3, 5], "7": [2, 4, 6], "65": [2, 4, 5], "43": [2, 3, 5], "42": [1, 3, 5] };   // scale steps above the bass
  var BASS_INV = { "53": 0, "6": 1, "64": 2, "7": 0, "65": 1, "43": 2, "42": 3 };
  EX.fbreal = {
    title: "Realize the figures",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: KEYS.concat([KIND, { id: "show", label: "The bass", type: "select", options: ["staff", "name"], names: { staff: "On the staff", name: "As a note name" }, def: "staff" }]),
    make: function (s) {
      var key = makeKey(Object.assign({}, s, { mode: s.mode === "both" ? pick(["major", "minor"]) : s.mode }));
      var figs = (s.kind === "sevenths" ? [] : ["53", "6", "64"]).concat(s.kind === "triads" ? [] : ["7", "65", "43", "42"]), fig = pick(figs);
      var step = rnd(7), bass = deg(key, step, 3), ups = REAL[fig].map(function (x) { return deg(key, step + x, 3); });
      var notes = [bass].concat(ups), inv = BASS_INV[fig];
      // the root: the bass for 53 / 7; otherwise the note the figure names (64: the 4th, 6: the 6th, 65: the 6th, 43: the 4th, 42: the 2nd)
      var root = inv === 0 ? bass : ups[{ "6": 1, "64": 0, "65": 2, "43": 1, "42": 0 }[fig]];
      var abc = "X:1\nL:1/4\nK:" + key.abc + " clef=bass\n" + barNote(bass, key.sig, {}) + "4 |]\n";
      return { abc: s.show === "staff" ? abc : null, words: true, show: s.show === "staff" ? "" : "Bass " + name(bass) + ", figures " + FIG_TXT[fig].split(" ")[0],
        answer: notes.map(name).join(" "), want: notes, fig: fig, root: root, bass: bass, key: key, play: [notes.map(midi)], width: 120,
        label: "Key: " + key.label + ". Figures under the bass: " + FIG_TXT[fig].split(" ")[0] + ". Type every note, the bass first, then each interval above it, going up." };
    },
    check: function (q, typed) { var ns = parseNotes(typed); return !!ns && ns.length === q.want.length && ns.every(function (n, i) { return same(n, q.want[i]); }); },
    explain: function (q) {
      var ups = q.want.slice(1), nums = REAL[q.fig].map(function (x) { return x + 1; });
      return nums.map(function (n, i) { return "a " + n + (n === 2 ? "nd" : n === 3 ? "rd" : "th") + " above " + name(q.bass) + " is " + name(ups[i]); }).join(", ") +
        ". The root is " + name(q.root) + ", so " + name(q.bass) + " is the chord's " + MEMBER[BASS_INV[q.fig]] + ".";
    },
    keyHelp: function () { return "Count letter names up from the bass and use the key signature's sharps or flats (in C major, 6/4 over D is D G B). Type the notes with spaces, then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- the six-four chords in context (16.3–16.4). Four voices as scale steps above the tonic: [bass, tenor, alto, soprano],
  // r = raise the leading tone in minor (the V chords). The voicings are this site's own.
  var SIXFOUR = {
    cad: { rn: ["IV", "I64", "V", "I"], six: 1, ch: [[[-4, 5, 7, 10]], [[-3, 4, 7, 9]], [[-3, 4, 6, 8], 1], [[0, 4, 7, 9]]] },
    pass: { rn: ["I", "V64", "I6", "IV"], six: 1, ch: [[[0, 4, 9, 14]], [[1, 4, 8, 13], 1], [[2, 4, 7, 14]], [[3, 5, 7, 14]]] },
    ped: { rn: ["I", "IV64", "I", "V"], six: 1, ch: [[[0, 4, 9, 14]], [[0, 5, 10, 14]], [[0, 4, 9, 14]], [[-3, 4, 8, 13], 1]] }
  };
  var SF_NAME = { cad: "Cadential six-four", pass: "Passing six-four", ped: "Pedal six-four" };
  EX.sixfour = {
    title: "Which six-four?",
    SETTINGS: [
      { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" },
      { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4"], def: "3" },
      { id: "show", label: "Show", type: "select", options: ["both", "ear"], names: { both: "Staff and sound", ear: "Sound only (the staff after you answer)" }, def: "both" }
    ],
    make: function (s) {
      for (var t = 0; t < 100; t++) {
        var key = makeKey(s), type = pick(["cad", "pass", "ped"]), P = SIXFOUR[type], oct = key.tonic.l <= 2 ? 3 : 2;
        var seq = P.ch.map(function (c) { return c[0].map(function (st) { return deg(key, st, oct, !!c[1]); }); });
        if (seq.some(function (c) { return c.some(function (n) { return Math.abs(n.a) > 1; }); })) continue;
        var sig = key.sig, voice = function (lo, hi) {
          var b1 = {}, b2 = {};
          return chordAbc(seq[0].slice(lo, hi), sig, b1, 2) + " " + chordAbc(seq[1].slice(lo, hi), sig, b1, 2) + " | " +
            chordAbc(seq[2].slice(lo, hi), sig, b2, 2) + " " + chordAbc(seq[3].slice(lo, hi), sig, b2, 2) + " |]";
        };
        var rnText = P.rn.map(function (r) { return key.mode === "minor" ? r.replace(/^I(?!V)/, "i").replace(/^IV/, "iv") : r; });
        var abc = "X:1\nL:1/4\nM:4/4\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + key.abc + "\n[V:1] " + voice(2, 4) + "\n[V:2] " + voice(0, 2) + "\n";
        return { abc: abc, answer: type, rn: rnText, voices: seq, play: seq.map(function (c) { return c.map(midi); }), width: 300,
          times: [0, 1, 2, 3], durs: [0.95, 0.95, 0.95, 1.6], sound: true, ear: s.show === "ear",
          label: "Key: " + key.label + ". The second chord is a six-four chord. Which kind? Watch the bass." };
      }
      return null;
    },
    answers: function () { return ["cad", "pass", "ped"]; },
    buttonText: function (a) { return SF_NAME[a]; },
    answerName: function (a) { return SF_NAME[a]; },
    explain: function (q) {
      return q.rn.join(" – ") + ". " + {
        cad: "The six-four comes before V over the same bass note and resolves to it: the 6th and 4th above the bass fall to a 5th and 3rd.",
        pass: "The bass moves by step through the six-four (three notes in a row), like a passing tone.",
        ped: "The bass stays on one note while the upper voices move to the six-four and back, like neighbor tones."
      }[q.answer];
    },
    keyHelp: function () { return "Keys: c cadential, p passing, d pedal."; },
    letterKeys: { c: "cad", p: "pass", d: "ped" },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  D.figured = { toFig: toFig, REAL: REAL, SIXFOUR: SIXFOUR, MEANS: MEANS };   // for tests and the explorer
})(window);
