// neapolitan.js — the Neapolitan chord (Hutchinson, Music Theory for the 21st-Century Classroom, ch. 20): ♭II, a major triad on
// the lowered 2nd degree, labelled "N" (first inversion "N6", its most common position). Adds Drills.engines.neap (name it on
// the staff, followed by V), neapwrite (write the notes), neapsym (Roman numeral ↔ lead-sheet symbol) and neapear (hear
// i–PD–V–i and tell N6 from iv / ii°6 in minor, IV / ii6 in major). Load after drills.js; the helpers it needs are copied here.
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
  // a typed triad symbol (major, minor or diminished, with an optional /bass) -> { root, q, bass } or null
  function parseSym(t) {
    t = String(t || "").replace(/\s+/g, "");
    var m = /^([A-Ga-g])(##|bb|x|#|b|♯|♭|𝄪|𝄫)?(maj|M|min|mi|m|-|°|o|dim)?(?:\/([A-Ga-g](?:##|bb|x|#|b|♯|♭|𝄪|𝄫)?))?$/.exec(t);
    if (!m) return null;
    var lower = m[1] !== m[1].toUpperCase(), qs = m[3] || "";
    if (lower) { if (qs === "") qs = "m"; else if (!/^(m|min|mi|-|°|o|dim)$/.test(qs)) return null; }
    var q = { "": "maj", maj: "maj", M: "maj", min: "min", mi: "min", m: "min", "-": "min", "°": "dim", o: "dim", dim: "dim" }[qs];
    var root = parseName(m[1].toUpperCase() + (m[2] || "")), bass = m[4] ? parseName(m[4]) : null;
    if (!root || (m[4] && !bass)) return null;
    return { root: root, q: q, bass: bass };
  }
  function makeKey(s) {
    var mode = s.mode === "both" ? pick(["major", "minor"]) : s.mode, m = +s.most, k0 = -m + rnd(2 * m + 1), tName = (mode === "major" ? MAJ : MIN)[k0];
    return { k: k0, mode: mode, tonic: parseName(tName.replace("♭", "b").replace("♯", "#")), sig: keySigMap(k0),
      abc: tName.replace("♭", "b").replace("♯", "#") + (mode === "minor" ? "m" : ""),
      label: (mode === "major" ? tName : tName.charAt(0).toLowerCase() + tName.slice(1)) + " " + mode };
  }
  // a note `steps` scale steps and `semis` semitones above the tonic (octave 4)
  function rel(key, steps, semis, oct) {
    var t = { l: key.tonic.l, a: key.tonic.a, o: oct == null ? 4 : oct }, n = fromDia(dia(t) + steps, 0);
    n.a = midi(t) + semis - midi(n); return n;
  }
  // chords as [steps, semitones] of root, 3rd, 5th above the tonic
  var CH = {
    N: [[1, 1], [3, 5], [5, 8]],
    iv: [[3, 5], [5, 8], [7, 12]], IV: [[3, 5], [5, 9], [7, 12]],
    "ii°": [[1, 2], [3, 5], [5, 8]], ii: [[1, 2], [3, 5], [5, 9]],
    V: [[4, 7], [6, 11], [8, 14]]
  };
  function chord(key, c) { return CH[c].map(function (x) { return rel(key, x[0], x[1]); }); }
  function nextAbove(pcs, fromD) {
    for (var d = fromD; d < fromD + 8; d++) for (var i = 0; i < pcs.length; i++) if (((d % 7) + 7) % 7 === pcs[i].l) return fromDia(d, pcs[i].a);
    return fromDia(fromD, 0);
  }
  function voiceClose(notes, inv, clef) {
    var base = clef === "bass" ? 2 * 7 + 3 : 4 * 7 - 1, b = notes[inv], out = [fromDia(base + ((b.l - base % 7) % 7 + 7) % 7, b.a)];
    for (var i = 1; i < notes.length; i++) out.push(nextAbove([notes[(inv + i) % notes.length]], dia(out[i - 1]) + 1));
    return out;
  }
  function keyAbcNote(n, sig, len) {
    var s = (n.a !== sig[n.l] ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    for (var k = 5; k < n.o; k++) s += "'"; for (var j = 4; j > n.o; j--) s += ",";
    return s + (len || "");
  }
  // a note in a bar: an accidental where it differs from the signature or from the same letter earlier in the bar (in any octave, so every reader agrees)
  function barNote(n, sig, st) {
    var k = n.l, now = k in st ? st[k] : sig[n.l], s = (n.a !== now ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    st[k] = n.a;
    for (var i = 5; i < n.o; i++) s += "'"; for (var j = 4; j > n.o; j--) s += ",";
    return s;
  }
  function chordAbc(v, sig, st, len) { return "[" + v.map(function (n) { return barNote(n, sig, st); }).join("") + "]" + len; }
  function pcsOf(v) { return v.map(function (n) { return (midi(n) + 120) % 12; }); }
  function sym(notes, q, inv) { return name(notes[0]) + { maj: "", min: "m", dim: "°" }[q] + (inv ? "/" + name(notes[inv]) : ""); }

  // a typed numeral -> normal form: "N" / "N6" (♭II, bII, ♭II6 too), "iv" "iv6" "IV" "IV6" "ii" "ii6" "ii°" "ii°6"; null otherwise
  function normN(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/6\/3/g, "6").replace(/^b(?=II)/, "♭").replace(/(o|dim)/g, "°");
    var m = /^(N|♭II)(6)?$/.exec(t); if (m) return "N" + (m[2] || "");
    m = /^(ii°|ii|iv|IV)(6)?$/.exec(t); return m ? m[1] + (m[2] || "") : null;
  }
  var QOF = { N: "maj", iv: "min", IV: "maj", "ii°": "dim", ii: "min" };
  // one chord: N, or (when s.chords = "pd") another pre-dominant of the mode; root position or 6. All within single sharps / flats.
  function neapMake(s, only) {
    for (var t = 0; t < 100; t++) {
      var key = makeKey(s), minor = key.mode === "minor";
      var c = only || (s.chords === "pd" && rnd(2) ? pick(minor ? ["iv", "ii°"] : ["IV", "ii"]) : "N");
      var notes = chord(key, c);
      if (notes.some(function (n) { return Math.abs(n.a) > 1; })) continue;
      var inv = s.inv === "root" ? 0 : s.inv === "six" ? 1 : rnd(2);
      if (c === "ii°" && s.inv !== "root") inv = 1;   // ii° in first inversion, as the book's 20.2 compares it
      return { key: key, c: c, notes: notes, inv: inv, q: QOF[c], rn: c + (inv ? "6" : ""), v: chord(key, "V") };
    }
    return null;
  }
  var KEYS = [
    { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "both" },
    { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4", "5", "6", "7"], def: "4" }
  ];
  var INV = { id: "inv", label: "Position", type: "select", options: ["root", "six", "both"], names: { root: "Root position (N)", six: "First inversion (N6)", both: "Both" }, def: "both" };
  var CLEF_NAME = { treble: "Treble", bass: "Bass" };

  EX.neap = {
    title: "Name the chord (Neapolitan)",
    input: "text",
    palette: ["N", "6", "♭II", "ii", "°", "iv", "IV"],
    SETTINGS: KEYS.concat([INV,
      { id: "chords", label: "Chords", type: "select", options: ["n", "pd"], names: { n: "The Neapolitan only", pd: "With other pre-dominants (iv, ii°6 in minor; IV, ii in major)" }, def: "pd" },
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }]),
    make: function (s) {
      var c = neapMake(s); if (!c) return null;
      var clef = pick(s.clef.length ? s.clef : ["treble"]), v = voiceClose(c.notes, c.inv, clef), r = voiceClose(c.v, 0, clef), sig = c.key.sig;
      var st = {}, abc = "X:1\nL:1/4\nK:" + c.key.abc + " clef=" + clef + "\n" + chordAbc(v, sig, st, 2) + " " + chordAbc(r, sig, st, 2) + " |]\n";
      return { abc: abc, answer: c.rn, chord: c.c, inv: c.inv, notes: c.notes, play: [v.map(midi), r.map(midi)], pcs: pcsOf(v), bassPc: pcsOf(v)[0], width: 230,
        label: "Key: " + c.key.label + ". Name the first chord (the second is V)." };
    },
    check: function (q, typed) { return normN(typed) === q.answer; },
    explain: function (q) { return q.chord === "N" ? "A major triad on the lowered 2nd degree: N, " + (q.inv ? "with its 3rd (scale degree 4) in the bass: N6." : "in root position.") : "No lowered 2nd degree, so not N."; },
    keyHelp: function () { return "Type it, then Enter: N or N6 (♭II and ♭II6, or bII6, work too), or iv, iv6, IV6, ii6, ii°6 (o for °)."; },
    midiNeed: 3,
    midiMatch: function (q, notes) { return EX.triad.midiMatch(q, notes); }
  };
  EX.neapwrite = {
    title: "Write the Neapolitan",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: KEYS.concat([INV]),
    make: function (s) {
      var c = neapMake(s, "N"); if (!c) return null;
      var order = [0, 1, 2].map(function (i) { return c.notes[(c.inv + i) % 3]; });
      return { answer: order.map(name).join(" "), want: order, show: c.key.label.split(" ")[0] + ": " + c.rn, abc: null, words: true,
        play: [voiceClose(c.notes, c.inv, "treble").map(midi), voiceClose(c.v, 0, "treble").map(midi)],
        label: "Write the notes of this chord in " + c.key.label + ", lowest first." };
    },
    check: function (q, typed) { var ns = parseNotes(typed); return !!ns && ns.length === q.want.length && ns.every(function (n, i) { return same(n, q.want[i]); }); },
    keyHelp: function () { return "Type the note names with spaces, lowest first (in C, N6 is F A♭ D♭: type F Ab Db), then Enter. Lower the 2nd degree a half step and build a major triad on it."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  EX.neapsym = {
    title: "The Neapolitan as a chord symbol",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "/", "N", "6"],
    SETTINGS: KEYS.concat([INV, { id: "dir", label: "Task", type: "select", options: ["find", "name", "both"], names: { find: "Roman numeral → chord symbol", name: "Chord symbol → Roman numeral", both: "Either" }, def: "both" }]),
    make: function (s) {
      var c = neapMake(s, "N"); if (!c) return null;
      var dir = s.dir === "both" ? pick(["find", "name"]) : s.dir, k = c.key.label, sm = sym(c.notes, "maj", c.inv);
      var play = [voiceClose(c.notes, c.inv, "treble").map(midi), voiceClose(c.v, 0, "treble").map(midi)];
      if (dir === "find") return { abc: null, words: true, show: "In " + k + ": " + c.rn, answer: sm, parsed: { root: c.notes[0], bass: c.inv ? c.notes[c.inv] : null }, play: play,
        label: "Which chord is it? Give the lead-sheet symbol (with /bass for an inversion)." };
      return { abc: null, words: true, show: "In " + k + ": " + sm + " → " + name(c.v[0]), answer: c.rn, sec: true, play: play,
        label: "Name the first chord with a Roman numeral." };
    },
    check: function (q, typed) {
      if (q.sec) return normN(typed) === q.answer;
      var p = parseSym(typed); if (!p || p.q !== "maj" || !same(p.root, q.parsed.root)) return false;
      return q.parsed.bass ? same(p.bass, q.parsed.bass) : (!p.bass || same(p.bass, q.parsed.root));
    },
    keyHelp: function () { return "A chord symbol (D♭, Db/F) or a numeral (N, N6, ♭II6), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- by ear: i – PD – V – i in four voices. The three pre-dominants share the bass (scale degree 4, doubled in the alto),
  // the tenor (♭6 / 6) and the alto; only the soprano differs: ♭2 (N6), 1 (iv / IV), 2 (ii°6 / ii6). In N6 the ♭2 goes down
  // to the leading tone. Voices as [steps, semitones] from the tonic, bass first.
  var EAR = {
    i: function (minor) { return [[0, 0], [4, 7], [9, minor ? 15 : 16], [14, 24]]; },
    N6: function () { return [[-4, -7], [5, 8], [10, 17], [15, 25]]; },
    iv: function (minor) { return [[-4, -7], [5, minor ? 8 : 9], [10, 17], [14, 24]]; },
    ii6: function (minor) { return [[-4, -7], [5, minor ? 8 : 9], [10, 17], [15, 26]]; },
    V: function () { return [[-3, -5], [4, 7], [8, 14], [13, 23]]; }
  };
  var EAR_NAME = { major: { N6: "N6", iv: "IV", ii6: "ii6" }, minor: { N6: "N6", iv: "iv", ii6: "ii°6" } };
  EX.neapear = {
    title: "Hear the Neapolitan",
    SETTINGS: [
      { id: "mode", label: "Keys", type: "select", options: ["minor", "major", "both"], names: { minor: "Minor (N6, iv, ii°6)", major: "Major (N6, IV, ii6)", both: "Both" }, def: "minor" },
      { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4"], def: "3" },
      { id: "show", label: "Show", type: "select", options: ["ear", "both"], names: { ear: "Sound only (the staff after you answer)", both: "Staff and sound" }, def: "ear" }
    ],
    make: function (s) {
      for (var t = 0; t < 100; t++) {
        var key = makeKey(s), minor = key.mode === "minor", pd = pick(["N6", "iv", "ii6"]);
        var oct = key.tonic.l <= 2 ? 3 : 2;   // tonic C3–E3 or F2–B2
        var seq = [EAR.i(minor), EAR[pd](minor), EAR.V(), EAR.i(minor)].map(function (c) { return c.map(function (x) { return rel(key, x[0], x[1], oct); }); });
        if (seq.some(function (c) { return c.some(function (n) { return Math.abs(n.a) > 1; }); })) continue;
        var sig = key.sig, voice = function (lo, hi) {   // two bars; the accidentals of each bar start afresh
          var b1 = {}, b2 = {};
          return chordAbc(seq[0].slice(lo, hi), sig, b1, 2) + " " + chordAbc(seq[1].slice(lo, hi), sig, b1, 2) + " | " +
            chordAbc(seq[2].slice(lo, hi), sig, b2, 2) + " " + chordAbc(seq[3].slice(lo, hi), sig, b2, 2) + " |]";
        };
        var top = voice(2, 4), bot = voice(0, 2);
        var abc = "X:1\nL:1/4\nM:4/4\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + key.abc + "\n[V:1] " + top + "\n[V:2] " + bot + "\n";
        return { abc: abc, answer: pd, mode: key.mode, play: seq.map(function (c) { return c.map(midi); }), voices: seq, width: 300,
          times: [0, 1, 2, 3], durs: [0.95, 0.95, 0.95, 1.6], sound: true, ear: s.show === "ear",
          label: "Key: " + key.label + ". Which chord comes before V?" };
      }
      return null;
    },
    answers: function () { return ["N6", "iv", "ii6"]; },
    buttonText: function (a) { return a === "N6" ? "N6" : a === "iv" ? "iv / IV" : "ii°6 / ii6"; },
    answerName: function (a) { return { N6: "N6", iv: "iv (IV in major)", ii6: "ii°6 (ii6 in major)" }[a]; },
    explain: function (q) {
      return "All three have scale degree 4 in the bass; listen to the top voice: " +
        { N6: "the lowered 2nd degree, falling to the leading tone.", iv: "the tonic, falling a half step to the leading tone.", ii6: "the 2nd degree, falling a 3rd to the leading tone." }[q.answer];
    },
    keyHelp: function () { return "Keys: n N6, i iv / IV, t ii°6 / ii6."; },
    letterKeys: { n: "N6", i: "iv", t: "ii6" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  D.normN = normN;   // for tests
})(window);
