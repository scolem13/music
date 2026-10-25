// drills.js — theory drills (Drills): note names, intervals, key signatures. A teacher's settings come in the page address;
// students change them afterwards, and their changes are kept per link, so a new link from the teacher starts fresh.
//
//   <div class="drill" data-ex="note|interval|keysig" data-settings="clef=treble,bass&ledger=1"></div>   (inline in a lesson)
//   theory/theory-drills.qmd: one .drill whose exercise and settings come from the address:
//     ?ex=interval&clef=treble&ints=m3,M3,P5&dir=up&shape=harmonic&show=staff&count=20&lock=1
//   Every setting is name=value (lists joined by commas); names and values are the exercise's SETTINGS below.
//   lock=1 hides the settings (a test). Settings changed by the student: localStorage "drills-v1:" + ex + ":" + the link's settings.
//
// Answers: the buttons; the computer keys (shown on the page: a letter, then # or - for sharp or flat, Enter); a MIDI keyboard
// (pitch only: a note, two notes for an interval, the tonic or its triad for a key). Sound: the band's piano (BandSounds, loaded
// on first use), registered with AudioTap. Drills.engines (the exercises' pure parts) is exposed for tests.
(function (global) {
  "use strict";
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" }, ACC_TXT = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // a note: { l: letter index 0-6, a: accidental -2..2, o: octave (C4 = middle C) }
  function dia(n) { return n.o * 7 + n.l; }
  function fromDia(d, a) { return { l: ((d % 7) + 7) % 7, o: Math.floor(d / 7), a: a || 0 }; }
  function midi(n) { return 12 * (n.o + 1) + NAT[n.l] + n.a; }
  function name(n) { return LET[n.l] + ACC_TXT[n.a]; }
  function abcNote(n, len, showNat) {
    var s = (n.a || showNat ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    for (var k = 5; k < n.o; k++) s += "'"; for (var j = 4; j > n.o; j--) s += ",";
    return s + (len || "");
  }
  // staff lines (diatonic number of the bottom and top line) per clef
  var CLEF = { treble: [30, 38], bass: [18, 26], alto: [24, 32], tenor: [22, 30] };
  var CLEF_NAME = { treble: "Treble", bass: "Bass", alto: "Alto", tenor: "Tenor" };

  // ---- the exercises: SETTINGS, make(settings) -> question, answers(settings) -> buttons, check(q, answer)
  var EX = {};

  EX.note = {
    title: "Note names",
    SETTINGS: [
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass", "alto", "tenor"], names: CLEF_NAME, def: ["treble", "bass"] },
      { id: "ledger", label: "Ledger lines (most)", type: "select", options: ["0", "1", "2", "3"], def: "1" },
      { id: "acc", label: "Accidentals", type: "select", options: ["none", "sharps", "flats", "both", "double"], names: { none: "None", sharps: "Sharps", flats: "Flats", both: "Sharps and flats", double: "Doubles too" }, def: "none" }
    ],
    make: function (s) {
      var clef = pick(s.clef.length ? s.clef : ["treble"]), b = CLEF[clef], L = +s.ledger, ext = Math.max(1, 2 * L);
      var lo = b[0] - ext, hi = b[1] + ext, accs = accList(s.acc);
      var n = fromDia(lo + rnd(hi - lo + 1), pick(accs));
      return { clef: clef, notes: [n], abc: tune(clef, "", abcNote(n, 4)), answer: name(n), play: [midi(n)], label: "Name this note." };
    },
    answers: function (s) {
      var accs = accList(s.acc), out = [];
      accs.forEach(function (a) { for (var l = 0; l < 7; l++) out.push(LET[l] + ACC_TXT[a]); });
      return out;
    },
    keyHelp: function (s) { return s.acc === "none" ? "Keys: the letter." : "Keys: the letter, then # (sharp) or - (flat), then Enter. x is a double sharp."; },
    midiMatch: function (q, notes) { return notes.length === 1 && (notes[0] - q.play[0]) % 12 === 0; }
  };
  function accList(acc) { return { none: [0], sharps: [0, 1], flats: [0, -1], both: [-1, 0, 1], double: [-2, -1, 0, 1, 2] }[acc] || [0]; }
  function tune(clef, key, body) { return "X:1\nL:1/4\nK:" + (key || "C") + " clef=" + clef + "\n" + body + " |]\n"; }

  // intervals: generic number 1-8 and quality; semitones of the major / perfect interval of each number
  var BASE = [0, 0, 2, 4, 5, 7, 9, 11, 12], PERF = { 1: 1, 4: 1, 5: 1, 8: 1 };
  var INTS = ["m2", "M2", "m3", "M3", "P4", "A4", "d5", "P5", "m6", "M6", "m7", "M7", "P8"];
  var INT_NAME = { m2: "minor 2nd", M2: "major 2nd", m3: "minor 3rd", M3: "major 3rd", P4: "perfect 4th", A4: "augmented 4th", d5: "diminished 5th",
    P5: "perfect 5th", m6: "minor 6th", M6: "major 6th", m7: "minor 7th", M7: "major 7th", P8: "octave" };
  function semis(q, n) { var b = BASE[n]; return PERF[n] ? b + { P: 0, A: 1, d: -1 }[q] : b + { M: 0, m: -1, A: 1, d: -2 }[q]; }
  function above(low, iv) {   // the note an interval above (spelled), or null past a double accidental
    var qn = iv[0], n = +iv.slice(1), up = fromDia(dia(low) + n - 1, 0);
    up.a = midi(low) + semis(qn, n) - midi(up);
    return Math.abs(up.a) > 2 ? null : up;
  }
  EX.interval = {
    title: "Intervals",
    SETTINGS: [
      { id: "ints", label: "Intervals", type: "multi", options: INTS, names: INT_NAME, def: ["M2", "M3", "P4", "P5", "M6", "P8"] },
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass", "alto", "tenor"], names: CLEF_NAME, def: ["treble"] },
      { id: "start", label: "Lower note", type: "select", options: ["natural", "any"], names: { natural: "Naturals only", any: "With sharps and flats" }, def: "natural" },
      { id: "dir", label: "Melodic direction", type: "select", options: ["up", "down", "both"], names: { up: "Up", down: "Down", both: "Up or down" }, def: "up" },
      { id: "shape", label: "Written", type: "select", options: ["harmonic", "melodic", "both"], names: { harmonic: "Together (harmonic)", melodic: "One after the other (melodic)", both: "Either" }, def: "harmonic" },
      { id: "show", label: "Show", type: "select", options: ["staff", "ear", "both"], names: { staff: "The staff", ear: "Sound only (ear training)", both: "Staff and sound" }, def: "staff" }
    ],
    make: function (s) {
      var ints = s.ints.length ? s.ints : ["P5"];
      for (var tries = 0; tries < 200; tries++) {
        var clef = pick(s.clef.length ? s.clef : ["treble"]), b = CLEF[clef], iv = pick(ints), n = +iv.slice(1);
        var lowD = b[0] - 1 + rnd(b[1] - b[0] + 3 - (n - 1));
        var low = fromDia(lowD, s.start === "any" ? pick([-1, 0, 0, 1]) : 0), up = above(low, iv);
        if (!up) continue;
        var shape = s.shape === "both" ? pick(["harmonic", "melodic"]) : s.shape, down = s.dir === "down" || (s.dir === "both" && rnd(2));
        var body = shape === "harmonic" ? "[" + abcNote(low, "", false) + abcNote(up, "", false) + "]4"
          : down ? abcNote(up, 2) + " " + abcNote(low, 2, up.l === low.l && up.a !== low.a) : abcNote(low, 2) + " " + abcNote(up, 2, up.l === low.l && up.a !== low.a);
        var ms = [midi(low), midi(up)];
        return { clef: clef, abc: tune(clef, "", body), answer: iv, play: shape === "harmonic" ? [ms] : down ? [ms[1], ms[0]] : ms,
          semis: ms[1] - ms[0], label: "Name this interval.", ear: s.show === "ear", sound: s.show !== "staff" };
      }
      return null;
    },
    answers: function (s) { return INTS.filter(function (i) { return s.ints.indexOf(i) >= 0; }); },
    answerName: function (a) { return INT_NAME[a] || a; },
    keyHelp: function () { return "Keys: the quality (m minor, M major, p perfect, a augmented, d diminished), then the number."; },
    midiMatch: function (q, notes) { return notes.length === 2 && Math.abs(notes[1] - notes[0]) === q.semis; }
  };

  // key signatures: count of sharps (+) or flats (-) -> major / minor tonic names
  var MAJ = { "-7": "C♭", "-6": "G♭", "-5": "D♭", "-4": "A♭", "-3": "E♭", "-2": "B♭", "-1": "F", "0": "C", "1": "G", "2": "D", "3": "A", "4": "E", "5": "B", "6": "F♯", "7": "C♯" };
  var MIN = { "-7": "A♭", "-6": "E♭", "-5": "B♭", "-4": "F", "-3": "C", "-2": "G", "-1": "D", "0": "A", "1": "E", "2": "B", "3": "F♯", "4": "C♯", "5": "G♯", "6": "D♯", "7": "A♯" };
  function abcKey(t) { return t.replace("♭", "b").replace("♯", "#"); }
  function pcOf(t) { var p = NAT[LET.indexOf(t[0])] + (t.indexOf("♯") > 0 ? 1 : t.indexOf("♭") > 0 ? -1 : 0); return (p + 12) % 12; }
  EX.keysig = {
    title: "Key signatures",
    SETTINGS: [
      { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" },
      { id: "kinds", label: "Signatures", type: "select", options: ["sharps", "flats", "both"], names: { sharps: "Sharps", flats: "Flats", both: "Sharps and flats" }, def: "both" },
      { id: "most", label: "Most accidentals", type: "select", options: ["1", "2", "3", "4", "5", "6", "7"], def: "7" },
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass", "alto", "tenor"], names: CLEF_NAME, def: ["treble", "bass"] }
    ],
    counts: function (s) {
      var out = [], m = +s.most;
      for (var k = -m; k <= m; k++) { if (k > 0 && s.kinds === "flats") continue; if (k < 0 && s.kinds === "sharps") continue; out.push(k); }
      return out;
    },
    make: function (s) {
      var k = pick(this.counts(s)), mode = s.mode === "both" ? pick(["major", "minor"]) : s.mode, clef = pick(s.clef.length ? s.clef : ["treble"]);
      var tonic = (mode === "major" ? MAJ : MIN)[k], key = abcKey(tonic) + (mode === "minor" ? "m" : "");
      var root = pcOf(tonic) + 60, tri = [root, root + (mode === "major" ? 4 : 3), root + 7];
      return { clef: clef, abc: "X:1\nL:1/4\nK:" + key + " clef=" + clef + "\nx4 |]\n", answer: tonic + " " + mode, mode: mode, play: [tri],
        tonicPc: pcOf(tonic), label: "Name the " + mode + " key with this signature." };
    },
    answers: function (s, q) {
      var modes = q ? [q.mode] : s.mode === "both" ? ["major", "minor"] : [s.mode], out = [], self = this;
      modes.forEach(function (m) { self.counts(s).forEach(function (k) { out.push((m === "major" ? MAJ : MIN)[k] + " " + m); }); });
      return out;
    },
    keyHelp: function () { return "Keys: the letter, then # or - for sharp or flat, then Enter."; },
    midiMatch: function (q, notes) {
      var pcs = notes.map(function (n) { return n % 12; });
      if (pcs[0] !== undefined && notes.length === 1) return pcs[0] === q.tonicPc;
      var lo = Math.min.apply(null, notes) % 12, third = (q.mode === "major" ? 4 : 3);
      return lo === q.tonicPc && pcs.indexOf((q.tonicPc + third) % 12) >= 0;
    }
  };

  // ---- triads (Hutchinson, ch. 6): lead-sheet symbols, slash chords, sus2 / sus4, spread over a grand staff
  var QUAL = { maj: ["M3", "P5"], min: ["m3", "P5"], dim: ["m3", "d5"], aug: ["M3", "A5"], sus2: ["M2", "P5"], sus4: ["P4", "P5"] };
  var QSYM = { maj: "", min: "m", dim: "°", aug: "+", sus2: "sus2", sus4: "sus4" };
  var QNAME = { maj: "Major", min: "Minor", dim: "Diminished", aug: "Augmented", sus2: "Sus2", sus4: "Sus4" };
  function above2(low, iv) {   // above() for any number 1-8 and quality, including A5
    var qn = iv[0], n = +iv.slice(1), up = fromDia(dia(low) + n - 1, 0);
    var st = PERF[n] ? BASE[n] + { P: 0, A: 1, d: -1 }[qn] : BASE[n] + { M: 0, m: -1, A: 1, d: -2 }[qn];
    up.a = midi(low) + st - midi(up); return Math.abs(up.a) > 2 ? null : up;
  }
  function triadOf(root, q) { var t = above2(root, QUAL[q][0]), f = above2(root, QUAL[q][1]); return t && f ? [root, t, f] : null; }
  function symbol(root, q, bass) { return name(root) + QSYM[q] + (bass && (bass.l !== root.l || bass.a !== root.a) ? "/" + name(bass) : ""); }
  // a typed note name -> { l, a } (C, c#, Bb, b♭, F##, Ebb, Fx), or null
  function parseName(t) {
    var m = /^([A-Ga-g])(##|bb|x|𝄪|𝄫|#|b|♯|♭)?$/.exec(t); if (!m) return null;
    return { l: LET.indexOf(m[1].toUpperCase()), a: { "": 0, "#": 1, "♯": 1, "b": -1, "♭": -1, "##": 2, "x": 2, "𝄪": 2, "bb": -2, "𝄫": -2 }[m[2] || ""] };
  }
  // a typed lead-sheet symbol -> { root, q, bass } or null. Accepts F, Fmaj, FM, Fm, Fmin, F-, F°, Fo, Fdim, F+, Faug, Fsus, Fsus4, Fsus2, Fsus9, /bass
  function parseSymbol(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/ø/g, "°");
    var m = /^([A-Ga-g])(##|bb|x|#|b|♯|♭|𝄪|𝄫)?(maj|M|min|mi|m|-|°|o|dim|\+|aug|sus4|sus2|sus9|sus)?(?:\/([A-Ga-g](?:##|bb|x|#|b|♯|♭|𝄪|𝄫)?))?$/.exec(t);
    if (!m) return null;
    var lower = m[1] !== m[1].toUpperCase(), root = parseName(m[1].toUpperCase() + (m[2] || "")), qs = m[3] || "";
    if (lower) { if (qs === "") qs = "m"; else if (!/^(m|min|mi|-|°|o|dim)$/.test(qs)) return null; }
    var q = { "": "maj", maj: "maj", M: "maj", min: "min", mi: "min", m: "min", "-": "min", "°": "dim", o: "dim", dim: "dim", "+": "aug", aug: "aug", sus: "sus4", sus4: "sus4", sus2: "sus2", sus9: "sus2" }[qs];
    var bass = m[4] ? parseName(m[4]) : null;
    if (!root || !q || (m[4] && !bass)) return null;
    return { root: root, q: q, bass: bass };
  }
  function same(a, b) { return a && b && a.l === b.l && a.a === b.a; }
  function parseNotes(t) { var ns = String(t || "").trim().split(/[\s,–-]+/).filter(Boolean).map(parseName); return ns.some(function (n) { return !n; }) ? null : ns; }
  function noAcc(ns, s) { return ns.every(function (n) { return Math.abs(n.a) <= (s.doubles === "yes" ? 2 : 1); }); }
  function makeTriad(s) {
    var qs = s.quals.length ? s.quals : ["maj"];
    for (var tries = 0; tries < 300; tries++) {
      var q = pick(qs), root = fromDia(4 * 7 + rnd(7), s.roots === "natural" ? 0 : pick([-1, 0, 0, 1]));
      var tri = triadOf(root, q); if (!tri || !noAcc(tri, s)) continue;
      var inv = q.indexOf("sus") === 0 || s.inv === "root" ? 0 : s.inv === "inv" ? 1 + rnd(2) : rnd(3);   // Hutchinson does not invert sus chords
      return { q: q, tri: tri, inv: inv, root: root, bass: tri[inv] };
    }
    return null;
  }
  // the chord on the staff: close position from the bass, or spread over a grand staff with doublings (ch. 6.4)
  function triadAbc(t, s, clefPick) {
    var pcs = t.tri, bassD, notes = [];
    if (s.voicing === "spread") {
      var b = fromDia(2 * 7 + pcs[t.inv].l + (pcs[t.inv].l < 3 ? 7 : 0), pcs[t.inv].a);   // bass between C3 and B3 roughly
      var low = [b], up = [], d = dia(b) + 2 + rnd(4);
      if (rnd(2)) low.push(nextAbove(b, pcs, dia(b) + 3));
      var start = Math.max(4 * 7, dia(low[low.length - 1]) + 1);
      var r0 = rnd(3);   // the treble staff holds each chord tone once, from a random one up, so none is left out
      for (var k = 0, cur = start; k < 3; k++) { var n = nextAbove(null, [pcs[(r0 + k) % 3]], cur); up.push(n); cur = dia(n) + 1; }
      return "X:1\nL:1/4\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:C\n[V:1] [" + up.map(function (n) { return abcNote(n); }).join("") + "]4 |]\n[V:2] [" +
        low.map(function (n) { return abcNote(n); }).join("") + "]4 |]\n";
    }
    var clef = clefPick, base = clef === "bass" ? 2 * 7 + 3 : 4 * 7 - 1;
    var first = fromDia(base + ((pcs[t.inv].l - base % 7) % 7 + 7) % 7 + (clef === "bass" ? 0 : 0), pcs[t.inv].a);
    notes.push(first);
    for (var i = 1; i < 3; i++) notes.push(nextAbove(null, [pcs[(t.inv + i) % 3]], dia(notes[i - 1]) + 1));
    return tune(clef, "", "[" + notes.map(function (n) { return abcNote(n); }).join("") + "]4");
  }
  function nextAbove(_, pcs, fromD) {   // the lowest chord tone (any of pcs) at or above diatonic step fromD
    for (var d = fromD; d < fromD + 8; d++) for (var i = 0; i < pcs.length; i++) if (((d % 7) + 7) % 7 === pcs[i].l) return fromDia(d, pcs[i].a);
    return fromDia(fromD, 0);
  }
  var TRIAD_SET = [
    { id: "quals", label: "Qualities", type: "multi", options: ["maj", "min", "dim", "aug", "sus2", "sus4"], names: QNAME, def: ["maj", "min", "dim", "aug"] },
    { id: "roots", label: "Roots", type: "select", options: ["natural", "any"], names: { natural: "Naturals only", any: "With sharps and flats" }, def: "any" },
    { id: "inv", label: "Position", type: "select", options: ["root", "inv", "all"], names: { root: "Root position", inv: "Inversions only", all: "Root position and inversions" }, def: "root" },
    { id: "doubles", label: "Double sharps / flats", type: "select", options: ["no", "yes"], names: { no: "Never", yes: "Allowed (e.g. E G♯ B♯ is fine, but G♯+ has D𝄪)" }, def: "no" }
  ];
  EX.triad = {
    title: "Name the triad",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "m", "°", "+", "sus2", "sus4", "/"],
    SETTINGS: TRIAD_SET.concat([
      { id: "voicing", label: "Written", type: "select", options: ["close", "spread"], names: { close: "Close (stacked from the bass)", spread: "Spread over a grand staff, with doublings (6.4)" }, def: "close" },
      { id: "clef", label: "Clefs (close position)", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }
    ]),
    make: function (s) {
      var t = makeTriad(s); if (!t) return null;
      var clef = pick(s.clef.length ? s.clef : ["treble"]), abc = triadAbc(t, s, clef);
      var root = t.tri[0], pcs = t.tri.map(function (n) { return (midi(n) + 120) % 12; }), bm = (midi(t.bass) + 120) % 12;
      var ch = t.tri.map(function (n) { return midi(n); }), bassM = midi(t.bass); while (bassM > Math.min.apply(null, ch)) bassM -= 12;
      return { abc: abc, answer: symbol(root, t.q, t.bass), parsed: { root: root, q: t.q, bass: t.bass }, pcs: pcs, bassPc: bm,
        play: [[bassM].concat(ch.filter(function (m) { return (m - bassM) % 12 !== 0; }))], label: "Name this triad with a lead-sheet symbol" + (s.inv === "root" ? "." : " (a slash chord when it is inverted).") };
    },
    check: function (q, typed) {
      var p = parseSymbol(typed); if (!p) return false;
      var bassOk = p.bass ? same(p.bass, q.parsed.bass) : same(q.parsed.bass, q.parsed.root);
      return same(p.root, q.parsed.root) && p.q === q.parsed.q && bassOk;
    },
    keyHelp: function () { return "Type it, then Enter: capital letter = major (A), small letter or m = minor (a, Am), ° or o diminished, + augmented, sus2 / sus4, / and the bass (C/E). # and b work for ♯ and ♭."; },
    midiMatch: function (q, notes) {
      var pcs = notes.map(function (n) { return n % 12; }), lo = Math.min.apply(null, notes) % 12;
      return lo === q.bassPc && q.pcs.every(function (p) { return pcs.indexOf(p) >= 0; }) && pcs.every(function (p) { return q.pcs.indexOf(p) >= 0; });
    }
  };
  EX.spell = {
    title: "Write the triad",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: TRIAD_SET.concat([
      { id: "task", label: "Task", type: "select", options: ["write", "correct", "both"], names: { write: "Write from the symbol (6.7 ex. 2 and 4)", correct: "Correct a misspelled triad (6.7 ex. 5)", both: "Either" }, def: "write" }
    ]),
    make: function (s) {
      var task = s.task === "both" ? pick(["write", "correct"]) : s.task;
      for (var tries = 0; tries < 50; tries++) {
        var t = makeTriad(task === "correct" ? Object.assign({}, s, { inv: "root" }) : s); if (!t) return null;
        var order = [0, 1, 2].map(function (i) { return t.tri[(t.inv + i) % 3]; }), ans = order.map(name).join(" ");
        if (task === "write") return { answer: ans, want: order, label: "Write the notes of this chord, lowest to highest.", show: symbol(t.tri[0], t.q, t.bass), abc: null, play: [order.map(midi)], pcs: order.map(function (n) { return midi(n) % 12; }) };
        // misspell the third or the fifth enharmonically (same sound, wrong letter)
        var k = 1 + rnd(2), n = t.tri[k], wrongL = (n.l + (rnd(2) ? 1 : 6)) % 7, wrong = { l: wrongL, o: n.o + (wrongL < n.l && n.l - wrongL > 3 ? 1 : wrongL > n.l && wrongL - n.l > 3 ? -1 : 0), a: 0 };
        wrong.a = midi(n) - midi(wrong); if (Math.abs(wrong.a) > 2) continue;
        var shown = t.tri.slice(); shown[k] = wrong;
        return { answer: ans, want: order, label: "This " + QNAME[t.q].toLowerCase() + " triad is misspelled. Write it correctly, root first.",
          abc: tune("treble", "", "[" + shown.map(function (x) { return abcNote(x); }).join("") + "]4"), play: [order.map(midi)], pcs: order.map(function (x) { return midi(x) % 12; }) };
      }
      return null;
    },
    check: function (q, typed) { var ns = parseNotes(typed); return !!ns && ns.length === q.want.length && ns.every(function (n, i) { return same(n, q.want[i]); }); },
    keyHelp: function () { return "Type the three note names with spaces (B D F#, Eb G Bb), lowest first, then Enter. A MIDI keyboard can't show spelling, so it isn't used here."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- Roman numerals (Hutchinson, ch. 7): keys, diatonic triads in major and minor, "/3rd" "/5th" for inversions, cadences
  var SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];   // letters F C G D A E B / B E A D G C F
  function keySigMap(k) { var m = [0, 0, 0, 0, 0, 0, 0]; for (var i = 0; i < Math.abs(k); i++) m[(k > 0 ? SHARP_ORDER : FLAT_ORDER)[i]] = k > 0 ? 1 : -1; return m; }
  function makeKey(s) {
    var mode = s.mode === "both" ? pick(["major", "minor"]) : s.mode, ks = [], m = +s.most;
    for (var k = -m; k <= m; k++) ks.push(k);
    var k0 = pick(ks), tName = (mode === "major" ? MAJ : MIN)[k0], ton = parseName(abcKey(tName).replace("#", "#"));
    return { k: k0, mode: mode, tonic: ton, sig: keySigMap(k0), abc: abcKey(tName) + (mode === "minor" ? "m" : ""),
      label: (mode === "major" ? tName : tName.charAt(0).toLowerCase() + tName.slice(1)) + " " + mode };
  }
  // scale degree d (1-7) in the key, raised (+1) when asked: minor's raised 6 and 7
  function degNote(key, d, raise, oct) {
    var l = (key.tonic.l + d - 1) % 7, n = { l: l, a: key.sig[l] + (+raise || 0), o: oct || 4 };
    return n;
  }
  var NUM = ["", "i", "ii", "iii", "iv", "v", "vi", "vii"];
  // chords: [degree, raised degrees, prefix]; minor's common set after Hutchinson 7.3 (i ii° III iv V VI VII vii°), then the rare ones
  var MAJOR_CH = [[1], [2], [3], [4], [5], [6], [7]].map(function (x) { return [x[0], [], ""]; });
  var MINOR_COMMON = [[1, [], ""], [2, [], ""], [3, [], ""], [4, [], ""], [5, [7], ""], [6, [], ""], [7, [], ""], [7, [7], ""]];
  var MINOR_RARE = [[5, [], ""], [3, [7], ""], [2, [6], ""], [4, [6], ""], [6, [6, 7], "♯"]];
  function chordIn(key, c) {   // -> { notes (root, 3rd, 5th, spelled), rn }
    var degs = [c[0], (c[0] + 1) % 7 + 1, (c[0] + 3) % 7 + 1], notes = degs.map(function (d) { return degNote(key, d, (c[1].indexOf(d) >= 0 ? 1 : 0) - (c[1].indexOf(-d) >= 0 ? 1 : 0)); });
    var st = function (a, b) { return ((NAT[b.l] + b.a) - (NAT[a.l] + a.a) + 24) % 12; };
    var t = st(notes[0], notes[1]), f = st(notes[0], notes[2]);
    var q = t === 4 && f === 7 ? "maj" : t === 3 && f === 7 ? "min" : t === 3 && f === 6 ? "dim" : t === 4 && f === 8 ? "aug" : "?";
    var num = NUM[c[0]], rn = c[2] + (q === "maj" || q === "aug" ? num.toUpperCase() : num) + (q === "dim" ? "°" : q === "aug" ? "+" : "");
    return { notes: notes, q: q, rn: rn };
  }
  function keyAbcNote(n, sig, len) {   // a note under a key signature: an accidental only where it differs from the signature
    var s = (n.a !== sig[n.l] ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    for (var k = 5; k < n.o; k++) s += "'"; for (var j = 4; j > n.o; j--) s += ",";
    return s + (len || "");
  }
  function voiceClose(notes, inv, clef) {   // stack from the bass note upward in the clef's middle
    var base = clef === "bass" ? 2 * 7 + 3 : 4 * 7 - 1, b = notes[inv], out = [fromDia(base + ((b.l - base % 7) % 7 + 7) % 7, b.a)];
    for (var i = 1; i < notes.length; i++) { var n = notes[(inv + i) % notes.length]; out.push(nextAbove(null, [n], dia(out[i - 1]) + 1)); }
    return out;
  }
  // a typed Roman numeral -> normal form ("vii°/3rd"), case kept (case is the quality); null when unreadable
  function normRN(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/#/g, "♯").replace(/dim/g, "°").replace(/aug/g, "+").replace(/ø/g, "°");
    var m = /^(♯|♭)?(i{1,3}|iv|v|vi{1,2}|I{1,3}|IV|V|VI{1,2})(o|°|\+)?(?:(\/3rd|\/3|6)|(\/5th|\/5|64|6\/4))?$/.exec(t);
    if (!m) return null;
    return (m[1] || "") + m[2] + (m[3] ? m[3].replace("o", "°") : "") + (m[4] ? "/3rd" : m[5] ? "/5th" : "");
  }
  var KEY_SET = [
    { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" },
    { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4", "5", "6", "7"], def: "4" },
    { id: "minorset", label: "Chords in minor", type: "select", options: ["common", "all"], names: { common: "The common ones (i ii° III iv V VI VII vii°)", all: "All 13 (with v, III+, ii, IV, ♯vi°)" }, def: "common" }
  ];
  function pickChord(key, s) {
    var list = key.mode === "major" ? MAJOR_CH : s.minorset === "all" ? MINOR_COMMON.concat(MINOR_RARE) : MINOR_COMMON;
    return chordIn(key, pick(list));
  }
  EX.rn = {
    title: "Roman numerals",
    input: "text",
    palette: ["I", "V", "i", "v", "°", "+", "♯", "/3rd", "/5th"],
    SETTINGS: KEY_SET.concat([
      { id: "inv", label: "Position", type: "select", options: ["root", "all"], names: { root: "Root position", all: "With inversions (/3rd, /5th)" }, def: "root" },
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }
    ]),
    make: function (s) {
      var key = makeKey(s), c = pickChord(key, s), inv = s.inv === "all" ? rnd(3) : 0, clef = pick(s.clef.length ? s.clef : ["treble"]);
      var v = voiceClose(c.notes, inv, clef), abc = "X:1\nL:1/4\nK:" + key.abc + " clef=" + clef + "\n[" + v.map(function (n) { return keyAbcNote(n, key.sig); }).join("") + "]4 |]\n";
      var ans = c.rn + (inv === 1 ? "/3rd" : inv === 2 ? "/5th" : "");
      return { abc: abc, answer: ans, play: [v.map(midi)], pcs: v.map(function (n) { return (midi(n) + 120) % 12; }), bassPc: (midi(v[0]) + 120) % 12,
        label: "Key: " + key.label + ". Name the chord with a Roman numeral" + (s.inv === "all" ? " (add /3rd or /5th when it is inverted)." : ".") };
    },
    check: function (q, typed) { return normRN(typed) === q.answer; },
    keyHelp: function () { return "Type it, then Enter: capitals for major (V), small for minor (ii), ° or o diminished, + augmented, # for ♯ (♯vi°), /3rd or /5th for an inversion (6 and 64 work too)."; },
    midiMatch: function (q, notes) { return EX.triad.midiMatch(q, notes); }
  };
  EX.rnwrite = {
    title: "Write the chord from its Roman numeral",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: KEY_SET.concat([{ id: "inv", label: "Position", type: "select", options: ["root", "all"], names: { root: "Root position", all: "With inversions (/3rd, /5th)" }, def: "root" }]),
    make: function (s) {
      var key = makeKey(s), c = pickChord(key, s), inv = s.inv === "all" ? rnd(3) : 0, order = [0, 1, 2].map(function (i) { return c.notes[(inv + i) % 3]; });
      var rn = c.rn + (inv === 1 ? "/3rd" : inv === 2 ? "/5th" : "");
      return { answer: order.map(name).join(" "), want: order, show: key.label.split(" ")[0] + ": " + rn, abc: null, play: [voiceClose(c.notes, inv, "treble").map(midi)],
        label: "Write the notes of this chord in " + key.label + ", lowest first." };
    },
    check: function (q, typed) { return EX.spell.check(q, typed); },
    keyHelp: function () { return "Type the three note names with spaces, lowest first (in c minor, V is G B♮ D: type G B D), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // cadences (7.4): a four-chord phrase; which cadence ends it
  var CAD = { AC: "Authentic (V–I)", PC: "Plagal (IV–I)", DC: "Deceptive (V–vi)", HC: "Half (ends on V)" };
  EX.cadence = {
    title: "Cadences",
    SETTINGS: [
      { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" },
      { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4"], def: "3" },
      { id: "cads", label: "Cadences", type: "multi", options: ["AC", "PC", "DC", "HC"], names: CAD, def: ["AC", "PC", "DC", "HC"] },
      { id: "show", label: "Show", type: "select", options: ["staff", "ear", "both"], names: { staff: "The staff", ear: "Sound only (ear training)", both: "Staff and sound" }, def: "both" }
    ],
    make: function (s) {
      var key = makeKey(Object.assign({}, s, { minorset: "common" })), min = key.mode === "minor", cad = pick(s.cads.length ? s.cads : ["AC"]);
      var I = [1, [], ""], IV = [4, [], ""], V = [5, min ? [7] : [], ""], vi = [6, [], ""], ii = [2, [], ""];
      var ends = { AC: [V, I], PC: [IV, I], DC: [V, vi], HC: [pick([IV, ii, I]), V] }[cad];
      var opens = [[I, pick([vi, IV, ii])], [I, IV], [I, V], [vi, IV]].map(function (x) { return x; });
      var prog = pick(opens).concat(ends);
      if (cad === "PC" && prog[1] === IV) prog[1] = V;   // keep IV for the cadence
      var chords = prog.map(function (c) { return chordIn(key, c); });
      var top = [], bass = [], play = [];
      chords.forEach(function (c) {
        var v = voiceClose(c.notes, 0, "treble"), b = fromDia(2 * 7 + c.notes[0].l + (c.notes[0].l < 3 ? 7 : 0), c.notes[0].a);
        top.push("[" + v.map(function (n) { return keyAbcNote(n, key.sig); }).join("") + "]2"); bass.push(keyAbcNote(b, key.sig, 2));
        play.push([midi(b)].concat(v.map(midi)));
      });
      var abc = "X:1\nL:1/4\nM:4/4\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + key.abc + "\n[V:1] " + top.slice(0, 2).join(" ") + " | " + top.slice(2).join(" ") + " |]\n[V:2] " +
        bass.slice(0, 2).join(" ") + " | " + bass.slice(2).join(" ") + " |]\n";
      return { abc: abc, answer: cad, play: play, width: 420, label: "Key: " + key.label + ". Which cadence ends this phrase?", ear: s.show === "ear", sound: s.show !== "staff",
        rns: chords.map(function (c) { return c.rn; }) };
    },
    answers: function (s) { return ["AC", "PC", "DC", "HC"].filter(function (c) { return s.cads.indexOf(c) >= 0; }); },
    answerName: function (a) { return CAD[a] || a; },
    keyHelp: function () { return "Keys: a (authentic), p (plagal), d (deceptive), h (half)."; },
    letterKeys: { a: "AC", p: "PC", d: "DC", h: "HC" },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- seventh chords (Hutchinson, ch. 8): five qualities, lead-sheet symbols, /3rd /5th /7th, diatonic sevenths in major and minor
  var Q7 = { maj7: ["M3", "P5", "M7"], dom7: ["M3", "P5", "m7"], min7: ["m3", "P5", "m7"], hdim7: ["m3", "d5", "m7"], dim7: ["m3", "d5", "d7"] };
  var Q7SYM = { maj7: "maj7", dom7: "7", min7: "m7", hdim7: "ø7", dim7: "°7" };
  var Q7NAME = { maj7: "Major seventh (maj7)", dom7: "Major-minor / dominant seventh (7)", min7: "Minor seventh (m7)", hdim7: "Half-diminished seventh (ø7)", dim7: "Fully-diminished seventh (°7)" };
  // every label the book lists (8.1, Figure 8.1.2), parentheses and ♭ / ♯ written plainly first
  var Q7SUF = { maj7: ["maj7", "Maj7", "M7", "Δ7", "Δ", "MM7", "ma7"], dom7: ["7", "Mm7", "dom7", "Dom7"],
    min7: ["m7", "-7", "mm7", "min7", "mi7"], hdim7: ["ø7", "ø", "m7b5", "-7b5", "m7-5", "-7-5", "dm7", "mi7b5", "min7b5"], dim7: ["°7", "o7", "dim7", "dd7"] };
  function seventhOf(root, q) { var r = [root]; for (var i = 0; i < 3; i++) { var n = above2(root, Q7[q][i]); if (!n) return null; r.push(n); } return r; }
  function symbol7(root, q, bass) { return name(root) + Q7SYM[q] + (bass && !same(bass, root) ? "/" + name(bass) : ""); }
  // a typed seventh-chord symbol -> { root, q, bass } or null. Case as for triads: a small root letter is minor (c7 = Cm7), so maj7 / 7 after one are refused
  function parseSymbol7(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/[()]/g, "").replace(/♭5/g, "b5").replace(/Ø/g, "ø");
    var m = /^([A-Ga-g])(##|bb|x|#|b|♯|♭|𝄪|𝄫)?(.*?)(?:\/([A-Ga-g](?:##|bb|x|#|b|♯|♭|𝄪|𝄫)?))?$/.exec(t);
    if (!m) return null;
    var lower = m[1] !== m[1].toUpperCase(), suf = m[3], q = null;
    Object.keys(Q7SUF).forEach(function (k) { if (Q7SUF[k].indexOf(suf) >= 0) q = k; });
    if (lower) { if (suf === "7") q = "min7"; else if (q !== "min7" && q !== "hdim7" && q !== "dim7") return null; }
    var root = parseName(m[1].toUpperCase() + (m[2] || "")), bass = m[4] ? parseName(m[4]) : null;
    if (!root || !q || (m[4] && !bass)) return null;
    return { root: root, q: q, bass: bass };
  }
  var INV7 = ["", "/3rd", "/5th", "/7th"];
  function pickInv(s, n) { return s.inv === "root" ? 0 : s.inv === "inv" ? 1 + rnd(n - 1) : rnd(n); }
  function makeSeventh(s) {
    var qs = s.quals.length ? s.quals : ["dom7"];
    for (var tries = 0; tries < 300; tries++) {
      var q = pick(qs), root = fromDia(4 * 7 + rnd(7), s.roots === "natural" ? 0 : pick([-1, 0, 0, 1]));
      var ch = seventhOf(root, q); if (!ch || !noAcc(ch, s)) continue;
      var inv = pickInv(s, 4);
      return { q: q, ch: ch, inv: inv, root: root, bass: ch[inv] };
    }
    return null;
  }
  function stackAbc(v, clef, key) { return "X:1\nL:1/4\nK:" + (key ? key.abc : "C") + " clef=" + clef + "\n[" + v.map(function (n) { return key ? keyAbcNote(n, key.sig) : abcNote(n); }).join("") + "]4 |]\n"; }
  function pcsOf(v) { return v.map(function (n) { return (midi(n) + 120) % 12; }); }
  var SEV_SET = [
    { id: "quals", label: "Qualities", type: "multi", options: ["maj7", "dom7", "min7", "hdim7", "dim7"], names: Q7NAME, def: ["maj7", "dom7", "min7", "hdim7", "dim7"] },
    { id: "roots", label: "Roots", type: "select", options: ["natural", "any"], names: { natural: "Naturals only", any: "With sharps and flats" }, def: "any" },
    { id: "inv", label: "Position", type: "select", options: ["root", "inv", "all"], names: { root: "Root position", inv: "Inversions only", all: "Root position and inversions" }, def: "root" },
    { id: "doubles", label: "Double sharps / flats", type: "select", options: ["no", "yes"], names: { no: "Never", yes: "Allowed (B°7 has A♭, but E°7 has D♭ and so on)" }, def: "no" }
  ];
  EX.seventh = {
    title: "Name the seventh chord",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "maj7", "7", "m7", "ø7", "°7", "/"],
    SETTINGS: SEV_SET.concat([{ id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }]),
    make: function (s) {
      var t = makeSeventh(s); if (!t) return null;
      var clef = pick(s.clef.length ? s.clef : ["treble"]), v = voiceClose(t.ch, t.inv, clef);
      return { abc: stackAbc(v, clef), answer: symbol7(t.root, t.q, t.bass), parsed: { root: t.root, q: t.q, bass: t.bass }, pcs: pcsOf(v), bassPc: pcsOf(v)[0],
        play: [v.map(midi)], label: "Name this seventh chord with a lead-sheet symbol" + (s.inv === "root" ? "." : " (a slash chord when it is inverted).") };
    },
    check: function (q, typed) {
      var p = parseSymbol7(typed); if (!p) return false;
      var bassOk = p.bass ? same(p.bass, q.parsed.bass) : same(q.parsed.bass, q.parsed.root);
      return same(p.root, q.parsed.root) && p.q === q.parsed.q && bassOk;
    },
    keyHelp: function () { return "Type it, then Enter: Cmaj7 (or CM7, CΔ7), C7, Cm7 (c7 is minor too), Cø7 (or Cm7b5), C°7 (or Co7, Cdim7); / and the bass for an inversion. # and b work for ♯ and ♭."; },
    midiNeed: 4,
    midiMatch: function (q, notes) { return EX.triad.midiMatch(q, notes); }
  };
  EX.spell7 = {
    title: "Write the seventh chord",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: SEV_SET,
    make: function (s) {
      var t = makeSeventh(s); if (!t) return null;
      var order = [0, 1, 2, 3].map(function (i) { return t.ch[(t.inv + i) % 4]; });
      return { answer: order.map(name).join(" "), want: order, show: symbol7(t.root, t.q, t.bass), abc: null, play: [voiceClose(t.ch, t.inv, "treble").map(midi)],
        label: "Write the notes of this chord, lowest to highest." };
    },
    check: function (q, typed) { return EX.spell.check(q, typed); },
    keyHelp: function () { return "Type the four note names with spaces (D F# A C), lowest first, then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // diatonic sevenths (8.3): major I^M7 ii7 iii7 IV^M7 V7 vi7 viiø7; minor i7 iiø7 III^M7 iv7 V7 VI^M7 vii°7 (raised 7 in V7 and vii°7)
  var MAJOR_7 = [1, 2, 3, 4, 5, 6, 7].map(function (d) { return [d, [], ""]; });
  var MINOR_7 = [[1, [], ""], [2, [], ""], [3, [], ""], [4, [], ""], [5, [7], ""], [6, [], ""], [7, [7], ""]];
  function chordIn7(key, c) {   // -> { notes (root, 3rd, 5th, 7th), q, rn ("IVM7", "viiø7") }
    var degs = [0, 2, 4, 6].map(function (k) { return (c[0] + k - 1) % 7 + 1; }), notes = degs.map(function (d) { return degNote(key, d, c[1].indexOf(d) >= 0); });
    var st = function (a, b) { return ((NAT[b.l] + b.a) - (NAT[a.l] + a.a) + 24) % 12; };
    var sig = [1, 2, 3].map(function (i) { return st(notes[0], notes[i]); }).join(",");
    var q = { "4,7,11": "maj7", "4,7,10": "dom7", "3,7,10": "min7", "3,6,10": "hdim7", "3,6,9": "dim7" }[sig] || "?";
    var num = NUM[c[0]], up = q === "maj7" || q === "dom7";
    return { notes: notes, q: q, rn: c[2] + (up ? num.toUpperCase() : num) + { maj7: "M7", dom7: "7", min7: "7", hdim7: "ø7", dim7: "°7" }[q] };
  }
  // a typed seventh-chord numeral -> normal form ("V7/3rd", "IVM7", "viiø7"); figured bass 7 65 43 42 (or 2) works too
  function normRN7(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/#/g, "♯").replace(/dim/g, "°").replace(/Ø/g, "ø").replace(/maj7|Δ7|Δ|M7/g, "M7");
    var m = /^(♯|♭)?(i{1,3}|iv|v|vi{1,2}|I{1,3}|IV|V|VI{1,2})(o|°|ø|h)?(M7|7)?(?:(\/3rd|\/3|65|6\/5)|(\/5th|\/5|43|4\/3)|(\/7th|\/7|42|4\/2|2))?$/.exec(t);
    if (!m) return null;
    var inv = m[5] ? "/3rd" : m[6] ? "/5th" : m[7] ? "/7th" : "", fig = /^\d/.test(m[5] || m[6] || m[7] || "");
    var sev = m[4] || (fig ? "7" : "");
    if (!sev) return null;   // a triad, not a seventh chord
    var qual = m[3] ? (m[3] === "ø" || m[3] === "h" ? "ø" : "°") : "";
    if (qual && sev === "M7") return null;
    return (m[1] || "") + m[2] + qual + sev + inv;
  }
  var KEY7_SET = KEY_SET.filter(function (d) { return d.id !== "minorset"; }).concat([
    { id: "inv", label: "Position", type: "select", options: ["root", "all"], names: { root: "Root position", all: "With inversions (/3rd, /5th, /7th)" }, def: "root" }
  ]);
  function pickChord7(key) { return chordIn7(key, pick(key.mode === "major" ? MAJOR_7 : MINOR_7)); }
  EX.rn7 = {
    title: "Roman numerals: seventh chords",
    input: "text",
    palette: ["I", "V", "i", "v", "7", "M7", "ø", "°", "/3rd", "/5th", "/7th"],
    SETTINGS: KEY7_SET.concat([{ id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }]),
    make: function (s) {
      var key = makeKey(s), c = pickChord7(key), inv = s.inv === "all" ? rnd(4) : 0, clef = pick(s.clef.length ? s.clef : ["treble"]);
      var v = voiceClose(c.notes, inv, clef);
      return { abc: stackAbc(v, clef, key), answer: c.rn + INV7[inv], play: [v.map(midi)], pcs: pcsOf(v), bassPc: pcsOf(v)[0],
        label: "Key: " + key.label + ". Name the seventh chord with a Roman numeral" + (s.inv === "all" ? " (add /3rd, /5th or /7th when it is inverted)." : ".") };
    },
    check: function (q, typed) { return normRN7(typed) === q.answer; },
    keyHelp: function () { return "Type it, then Enter: V7, ii7, IVM7 (or IVmaj7), viiø7 (h works for ø), vii°7 (o works for °); /3rd /5th /7th for an inversion (65, 43, 42 work too)."; },
    midiNeed: 4,
    midiMatch: function (q, notes) { return EX.triad.midiMatch(q, notes); }
  };
  EX.rn7write = {
    title: "Write the seventh chord from its Roman numeral",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: KEY7_SET,
    make: function (s) {
      var key = makeKey(s), c = pickChord7(key), inv = s.inv === "all" ? rnd(4) : 0, order = [0, 1, 2, 3].map(function (i) { return c.notes[(inv + i) % 4]; });
      return { answer: order.map(name).join(" "), want: order, show: key.label.split(" ")[0] + ": " + c.rn + INV7[inv], abc: null, play: [voiceClose(c.notes, inv, "treble").map(midi)],
        label: "Write the notes of this chord in " + key.label + ", lowest first." };
    },
    check: function (q, typed) { return EX.spell.check(q, typed); },
    keyHelp: function () { return "Type the four note names with spaces, lowest first (in g minor, V7 is D F♯ A C), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- harmonic progression and function (Hutchinson, ch. 9)
  // functions from the book's flowcharts (9.4): major I / iii vi / IV ii / V vii°; minor i / III VI / iv ii° / V vii° (VII only leads to III: not drilled)
  var FUNC = { T: "Tonic (ton.)", TP: "Tonic prolongation (ton. prol.)", PD: "Pre-dominant (pre-dom.)", D: "Dominant (dom.)" };
  var FUNC_MAJ = [[1, "T"], [3, "TP"], [6, "TP"], [4, "PD"], [2, "PD"], [5, "D"], [7, "D"]];
  var FUNC_MIN = [[1, "T"], [3, "TP"], [6, "TP"], [4, "PD"], [2, "PD"], [5, "D"], [7, "D"]];
  EX.func = {
    title: "Harmonic function",
    SETTINGS: KEY_SET.filter(function (d) { return d.id !== "minorset"; }).concat([
      { id: "show", label: "Show", type: "select", options: ["staff", "numeral"], names: { staff: "The chord on the staff", numeral: "The Roman numeral" }, def: "numeral" },
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }
    ]),
    make: function (s) {
      var key = makeKey(s), min = key.mode === "minor", f = pick(min ? FUNC_MIN : FUNC_MAJ);
      var c = chordIn(key, [f[0], min && (f[0] === 5 || f[0] === 7) ? [7] : [], ""]), clef = pick(s.clef.length ? s.clef : ["treble"]), v = voiceClose(c.notes, 0, clef);
      var staff = s.show === "staff";
      return { abc: staff ? stackAbc(v, clef, key) : null, show: staff ? "" : key.label.split(" ")[0] + ": " + c.rn, answer: f[1], play: [v.map(midi)], rn: c.rn,
        label: (staff ? "Key: " + key.label + ". " : "") + "Which function does this chord have?" };
    },
    answers: function () { return ["T", "TP", "PD", "D"]; },
    answerName: function (a) { return FUNC[a] || a; },
    keyHelp: function () { return "Keys: t tonic, r tonic prolongation, p pre-dominant, d dominant."; },
    letterKeys: { t: "T", r: "TP", p: "PD", d: "D" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // progressions: [numerals, mode, group, name]. Chords: [degree, altered degrees (+ raised, − lowered), prefix]
  var PROGS = [
    ["I IV vii° iii vi ii V I", "major", "circle", "the circle of fifths (9.1)"],
    ["i iv VII III VI ii° V i", "minor", "circle", "the circle of fifths in minor (9.1)"],
    ["ii V I", "major", "circle", "ii–V–I (9.3)"],
    ["vi ii V I", "major", "circle", "vi–ii–V–I (9.3)"],
    ["I vi ii V", "major", "circle", "I–vi–ii–V (9.3)"],
    ["ii V I vi", "major", "circle", "ii–V–I–vi (9.3)"],
    ["iii vi ii V", "major", "circle", "iii–vi–ii–V (9.3)"],
    ["ii V iii vi", "major", "circle", "ii–V–iii–vi (9.3)"],
    ["I V I", "major", "function", "tonic–dominant–tonic (9.4)"],
    ["i V i", "minor", "function", "tonic–dominant–tonic (9.4)"],
    ["I ii V I", "major", "function", "tonic–pre-dominant–dominant–tonic (9.4)"],
    ["I IV V I", "major", "function", "tonic–pre-dominant–dominant–tonic (9.4)"],
    ["i iv V i", "minor", "function", "tonic–pre-dominant–dominant–tonic (9.4)"],
    ["I vi IV V", "major", "function", "the ’50s progression, I–vi–IV–V (9.4)"],
    ["IV V I vi", "major", "function", "I–vi–IV–V rotated (9.4)"],
    ["I V vi IV", "major", "pop", "the best-seller, I–V–vi–IV (9.7)"],
    ["vi IV I V", "major", "pop", "the best-seller rotated (9.7)"],
    ["IV I V vi", "major", "pop", "the best-seller rotated (9.7)"],
    ["I ♭VII IV I", "major", "pop", "♭VII–IV–I (9.6)"],
    ["i VII VI VII", "minor", "pop", "i–VII–VI–VII (9.8)"],
    ["VI VII i VII", "minor", "pop", "i–VII–VI–VII rotated (9.8)"],
    ["VI VII i i", "minor", "pop", "VI–VII–i (9.8)"]
  ];
  var DEG = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
  function rnChord(t, minor) {   // "♭VII", "vii°", "V" -> the chord spec chordIn takes
    var m = /^(♭|♯)?([ivIV]+)/.exec(t), d = DEG[m[2].toLowerCase()], alt = [];
    if (m[1] === "♭") alt.push(-d);
    if (minor && (t === "V" || t === "vii°")) alt.push(7);
    return [d, alt, m[1] || ""];
  }
  function progAbc(key, chords) {   // root in the bass, close triad in the treble; two chords a bar (half notes), a lone last chord a whole bar
    var top = [], bass = [], play = [];
    chords.forEach(function (c, i) {
      var v = voiceClose(c.notes, 0, "treble"), b = fromDia(2 * 7 + c.notes[0].l + (c.notes[0].l < 3 ? 7 : 0), c.notes[0].a);
      var len = (i === chords.length - 1 && i % 2 === 0) ? 4 : 2;
      top.push("[" + v.map(function (n) { return keyAbcNote(n, key.sig); }).join("") + "]" + len); bass.push(keyAbcNote(b, key.sig, len));
      play.push([midi(b)].concat(v.map(midi)));
    });
    var bars = function (a) { var out = []; for (var i = 0; i < a.length; i += 2) out.push(a.slice(i, i + 2).join(" ")); return out.join(" | ") + " |]"; };
    return { abc: "X:1\nL:1/4\nM:4/4\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + key.abc + "\n[V:1] " + bars(top) + "\n[V:2] " + bars(bass) + "\n", play: play };
  }
  function splitAnswer(t) { return String(t || "").trim().split(/[\s,–—-]+/).filter(Boolean); }
  EX.prog = {
    title: "Name the progression",
    input: "text",
    palette: ["I", "V", "i", "v", "°", "♭", "␣"],
    SETTINGS: [
      { id: "groups", label: "Progressions", type: "multi", options: ["circle", "function", "pop"], names: { circle: "Circle of fifths and its pieces (9.1, 9.3)", function: "By function (9.4)", pop: "Popular music (9.6–9.8)" }, def: ["circle", "function", "pop"] },
      { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "both" },
      { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4", "5"], def: "3" },
      { id: "answer", label: "Answer with", type: "select", options: ["rn", "symbols"], names: { rn: "Roman numerals (I vi IV V)", symbols: "Lead-sheet symbols (C Am F G)" }, def: "rn" },
      { id: "show", label: "Show", type: "select", options: ["staff", "ear", "both"], names: { staff: "The staff", ear: "Sound only (ear training)", both: "Staff and sound" }, def: "both" }
    ],
    make: function (s) {
      var list = PROGS.filter(function (p) { return s.groups.indexOf(p[2]) >= 0 && (s.mode === "both" || p[1] === s.mode); });
      if (!list.length) list = PROGS.slice(0, 1);
      var p = pick(list), key = makeKey(Object.assign({}, s, { mode: p[1] })), toks = p[0].split(" ");
      var chords = toks.map(function (t) { return chordIn(key, rnChord(t, p[1] === "minor")); }), w = progAbc(key, chords);
      var syms = chords.map(function (c) { return symbol(c.notes[0], c.q); });
      var ans = s.answer === "symbols" ? syms.join(" ") : chords.map(function (c) { return c.rn; }).join(" ");
      return { abc: w.abc, play: w.play, answer: ans, name: p[3], chords: chords, syms: syms, width: Math.min(540, Math.max(300, 90 * toks.length)), ear: s.show === "ear", sound: s.show !== "staff",
        label: "Key: " + key.label + ". " + (s.answer === "symbols" ? "Write the lead-sheet symbols, in order." : "Write the Roman numerals, in order.") };
    },
    check: function (q, typed) {
      var t = splitAnswer(typed); if (t.length !== q.chords.length) return false;
      if (/[A-G]/.test(q.answer.charAt(0)) && q.syms) return t.every(function (x, i) { var p = parseSymbol(x), c = q.chords[i]; return p && !p.bass && same(p.root, c.notes[0]) && p.q === c.q; });
      return t.every(function (x, i) { return normRN(x.replace(/^b(?=[ivIV])/, "♭")) === q.chords[i].rn; });
    },
    answerName: function (a) { return a; },
    keyHelp: function () { return "Type the chords with spaces between them (I vi IV V, or C Am F G), then Enter. b or ♭ before a numeral for ♭VII."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- non-chord tones (Hutchinson, ch. 10): a short melody over chords, the non-chord tone marked *; name its type
  var NCT = { PT: "Passing tone", NT: "Neighbor tone", APP: "Appoggiatura", ET: "Escape tone", DN: "Double neighbor", ANT: "Anticipation", PED: "Pedal point", SUS: "Suspension", RET: "Retardation" };
  var NCT_ALL = ["PT", "NT", "APP", "ET", "DN", "ANT", "PED", "SUS", "RET"];
  // three chords: X (bar 1, first half), Y (second half), Z (bar 2)
  var NCT_PROGS = { major: [["I", "V", "I"], ["I", "IV", "I"], ["IV", "V", "I"], ["ii", "V", "I"], ["I", "vi", "V"], ["vi", "IV", "V"]],
    minor: [["i", "V", "i"], ["i", "iv", "i"], ["iv", "V", "i"], ["ii°", "V", "i"], ["i", "VI", "V"]] };
  // layouts: chord letter and length in eighths for each melody note; two bars of 4/4. t = the non-chord tone(s);
  // rel[i] = the move from note i-1 to note i in diatonic steps (a number, or a test); unlisted moves are any leap or step up to a fifth.
  var LAY = { A: ["X2", "X2", "Y2", "Y2", "Z4", "Z4"], U1: ["X2", "X1", "X1", "Y2", "Y2", "Z4", "Z4"], U2: ["X2", "X2", "Y2", "Y1", "Y1", "Z4", "Z4"], D: ["X2", "X2", "X2", "X2", "Z4", "Z4"] };
  function leapBy(sg) { return function (x) { return x * sg >= 2 && x * sg <= 4; }; }
  function stepAny(x) { return Math.abs(x) === 1; }
  var NCT_FIG = {
    PT: function () { var d = pick([1, -1]), v = pick([["U1", 2], ["U2", 4], ["A", 2]]), r = {}; r[v[1]] = d; r[v[1] + 1] = d; return { lay: v[0], t: [v[1]], rel: r }; },
    NT: function () { var d = pick([1, -1]), v = pick([["U1", 2], ["U2", 4], ["A", 2]]), r = {}; r[v[1]] = d; r[v[1] + 1] = -d; return { lay: v[0], t: [v[1]], rel: r }; },
    APP: function () { var e = pick([1, -1]), t = pick([2, 4]), r = {}; r[t] = leapBy(e); r[t + 1] = -e; return { lay: "A", t: [t], rel: r }; },
    ET: function () { var d = pick([1, -1]), v = pick([["U1", 2], ["U2", 4]]), r = {}; r[v[1]] = d; r[v[1] + 1] = leapBy(-d); return { lay: v[0], t: [v[1]], rel: r }; },
    ANT: function () { return { lay: "U2", t: [4], rel: { 4: stepAny, 5: 0 } }; },
    SUS: function () { return { lay: "A", t: [2], rel: { 2: 0, 3: -1 }, tie: Math.random() < 0.6 }; },
    RET: function () { return { lay: "A", t: [2], rel: { 2: 0, 3: 1 }, tie: Math.random() < 0.6 }; },
    DN: function () { var d = pick([1, -1]); return { lay: "D", t: [1, 2], rel: { 1: d, 2: -2 * d, 3: d } }; },
    PED: function (minor) { return { lay: "A", t: [2], rel: { 1: 0, 2: 0, 3: 0 }, chords: minor ? ["i", "iv", "V", "i", "i", "i"] : pick([["I", "IV", "V", "I", "I", "I"], ["I", "vi", "V", "I", "I", "I"]]), durs: [2, 2, 2, 2, 4, 4] }; }
  };
  function nctMelody(key, slots, fig) {   // -> notes (spelled) or null. Chord tones take the chord's spelling, others the key's
    var out = [], budget = 5000;
    function acc(d, c) { var l = ((d % 7) + 7) % 7, n = c.notes.filter(function (x) { return x.l === l; })[0]; return n ? n.a : key.sig[l]; }
    function ok(i, d) {
      var c = slots[i], l = ((d % 7) + 7) % 7, ct = c.notes.some(function (x) { return x.l === l; });
      if (ct === (fig.t.indexOf(i) >= 0)) return false;
      if (!i) return true;
      var p = out[i - 1], x = d - p, r = fig.rel[i];
      if (r == null ? (x === 0 || Math.abs(x) > 4) : typeof r === "function" ? !r(x) : x !== r) return false;
      var a = fromDia(p, acc(p, slots[i - 1])), b = fromDia(d, acc(d, c)), st = Math.abs(midi(b) - midi(a));
      if (Math.abs(x) === 1 && st !== 1 && st !== 2) return false;   // no augmented seconds
      if (a.l === b.l && a.a !== b.a) return false;                   // no G then G♯
      if (x === 0 && st !== 0) return false;
      return true;
    }
    function go(i) {
      if (i === slots.length) return true;
      if (--budget < 0) return false;
      var cand = []; for (var d = 30; d <= 40; d++) cand.push(d);   // E4 to G5
      for (var k = cand.length - 1; k > 0; k--) { var j = rnd(k + 1), tmp = cand[k]; cand[k] = cand[j]; cand[j] = tmp; }
      for (var m = 0; m < cand.length; m++) if (ok(i, cand[m])) { out[i] = cand[m]; if (go(i + 1)) return true; }
      return false;
    }
    return go(0) ? out.map(function (d, i) { return fromDia(d, acc(d, slots[i])); }) : null;
  }
  function barNote(n, sig, st, len) {   // a note in a bar: an accidental where it differs from the signature or from earlier in the bar
    var k = n.l + "/" + n.o, cur = st[k] != null ? st[k] : sig[n.l]; st[k] = n.a;
    var s = (n.a !== cur ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    for (var a = 5; a < n.o; a++) s += "'"; for (var b = 4; b > n.o; b--) s += ",";
    return s + (len === 1 ? "" : len);
  }
  function abcSym(c) { return symbol(c.notes[0], c.q).replace(/♯/g, "#").replace(/♭/g, "b"); }
  function moveWords(x) { return x === 0 ? "the same note" : (Math.abs(x) === 1 ? "step " : "leap ") + (x > 0 ? "up" : "down"); }
  function nctMake(s, type) {
    var key = makeKey(s), minor = key.mode === "minor", fig = NCT_FIG[type](minor), lay = fig.chords ? null : LAY[fig.lay];
    var rns = fig.chords || (function () { var p = pick(NCT_PROGS[key.mode]); return lay.map(function (x) { return p["XYZ".indexOf(x[0])]; }); })();
    var durs = fig.durs || lay.map(function (x) { return +x.slice(1); });
    var slots = [], starts = [], pos = 0;
    rns.forEach(function (t, i) {   // one chord object per run of the same numeral inside a bar
      var same = i && rns[i - 1] === t && Math.floor(starts[i - 1] / 8) === Math.floor(pos / 8);
      slots.push(same ? slots[i - 1] : chordIn(key, rnChord(t, minor))); starts.push(pos); pos += durs[i];
    });
    var mel = nctMelody(key, slots, fig);
    if (!mel) return null;
    // the melody, chord symbols above it, * over the non-chord tone(s); the chords in the bass clef
    var top = "", bot = "", st = {}, bst = {}, playSeq = [], times = [], lens = [];
    mel.forEach(function (n, i) {
      var t0 = starts[i], newBar = t0 % 8 === 0 && i > 0, newCh = !i || slots[i] !== slots[i - 1];
      if (newBar) { top += "| "; st = {}; }
      top += (newCh && s.syms === "show" ? '"' + abcSym(slots[i]) + '"' : "") + (fig.t.indexOf(i) >= 0 ? '"^*"' : "") + barNote(n, key.sig, st, durs[i]) + (fig.tie && i === fig.t[0] - 1 ? "-" : "") + " ";
      var notes = fig.tie && i === fig.t[0] ? [] : [midi(n)];
      if (newCh) {
        var span = 0; for (var j = i; j < slots.length && slots[j] === slots[i]; j++) span += durs[j];
        var v = voiceClose(slots[i].notes, 0, "bass");
        if (newBar) { bot += "| "; bst = {}; }
        bot += "[" + v.map(function (x) { return barNote(x, key.sig, bst, 1); }).join("") + "]" + (span === 1 ? "" : span) + " ";
        notes = notes.concat(v.map(midi));
        slots[i]._bass = v[0];
      } else slots[i]._bass = slots[i - 1]._bass;
      if (notes.length) { playSeq.push(notes); times.push(t0 * 0.3); lens.push(Math.max(0.6, durs[i] * 0.3 + (fig.tie && i === fig.t[0] - 1 ? durs[i + 1] * 0.3 : 0))); }
    });
    var abc = "X:1\nM:4/4\nL:1/8\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + key.abc + "\n[V:1] " + top + "|]\n[V:2] " + bot + "|]\n";
    var t = fig.t[0], x = dia(mel[t]) - dia(mel[t - 1]), y = dia(mel[t + 1]) - dia(mel[t]), how;
    if (type === "DN") how = "Two non-chord tones, a step to each side of the note before and after.";
    else if (type === "PED") how = "The same note through three or more chords; a chord tone where it starts.";
    else {
      how = (starts[t] % 2 ? "Unaccented" : "Accented") + ": approached by " + moveWords(x) + ", left by " + moveWords(y) + ".";
      if (type === "SUS" || type === "RET") {
        var bd = dia(slots[t]._bass), a = (((dia(mel[t]) - bd) % 7) + 7) % 7 + 1, b = (((dia(mel[t + 1]) - bd) % 7) + 7) % 7 + 1;
        how += " A " + (a === 2 && b === 1 ? "9-8" : a === 7 && b === 1 ? "7-8" : a + "-" + b) + " " + (type === "SUS" ? "suspension" : "retardation") + (fig.tie ? ", tied over." : ".");
      }
    }
    return { abc: abc, answer: type, play: playSeq, times: times, durs: lens, width: 420, sound: s.show === "both", how: how, mel: mel, marks: fig.t,
      label: "Key: " + key.label + ". Name the non-chord tone marked *." };
  }
  EX.nct = {
    title: "Name the non-chord tone",
    SETTINGS: [
      { id: "types", label: "Non-chord tones", type: "multi", options: NCT_ALL, names: NCT, def: NCT_ALL.slice() },
      { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" },
      { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4", "5"], def: "3" },
      { id: "syms", label: "Chord symbols", type: "select", options: ["show", "hide"], names: { show: "Shown", hide: "Hidden (read the chords in the bass)" }, def: "show" },
      { id: "show", label: "Sound", type: "select", options: ["both", "staff"], names: { both: "Play each one", staff: "Only with ▶ Hear it" }, def: "both" }
    ],
    make: function (s) {
      var types = s.types.length ? s.types : NCT_ALL;
      for (var k = 0; k < 40; k++) { var q = nctMake(s, pick(types)); if (q) return q; }
      return null;
    },
    answers: function (s) { return NCT_ALL.filter(function (t) { return !s.types.length || s.types.indexOf(t) >= 0; }); },
    answerName: function (a) { return NCT[a] || a; },
    buttonText: function (a) { return NCT[a]; },
    explain: function (q) { return q.how; },
    keyHelp: function () { return "Keys: p passing, n neighbor, a appoggiatura, e escape, d double neighbor, t anticipation, o pedal point, s suspension, r retardation."; },
    letterKeys: { p: "PT", n: "NT", a: "APP", e: "ET", d: "DN", t: "ANT", o: "PED", s: "SUS", r: "RET" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // the book's Table 10.1.1, read the other way (its exercise 1): how a tone is approached and left -> its name
  var NCT_RULES = { PT: ["step", "step in the same direction"], NT: ["step", "step in the opposite direction"], APP: ["leap", "step"],
    ET: ["step", "leap in the opposite direction"], ANT: ["step", "the same note"], PED: ["the same note", "the same note"],
    SUS: ["the same note", "step down"], RET: ["the same note", "step up"] };
  EX.nctrule = {
    title: "Approached and left",
    SETTINGS: [],
    make: function () {
      var t = pick(Object.keys(NCT_RULES)), r = NCT_RULES[t];
      return { abc: null, show: "Approached by " + r[0] + ", left by " + r[1] + ".", answer: t, play: [], words: true, label: "Which non-chord tone is this?" };
    },
    answers: function () { return Object.keys(NCT_RULES); },
    answerName: function (a) { return NCT[a] || a; },
    buttonText: function (a) { return NCT[a]; },
    keyHelp: function () { return "Keys: p passing, n neighbor, a appoggiatura, e escape, t anticipation, o pedal point, s suspension, r retardation."; },
    letterKeys: { p: "PT", n: "NT", a: "APP", e: "ET", t: "ANT", o: "PED", s: "SUS", r: "RET" },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- secondary dominants (Hutchinson, ch. 17): V or V7 of a diatonic major or minor triad, never of a diminished one.
  // Targets after 17.3: major ii iii IV V vi; minor III iv V VI VII (the subtonic). A chord whose notes are all in the key
  // (V/IV in major, V/III and V/VI in minor) is left out: it reads as a diatonic chord (the book: B♭7 in c minor is V7/III or VII7).
  // Inversions are written with the book's figures: V6 V64, V65 V43 V42.
  var SEC_T = { major: [[2, []], [3, []], [4, []], [5, []], [6, []]], minor: [[3, []], [4, []], [5, [7]], [6, []], [7, []]] };
  var SEC_FIG = { tri: ["", "6", "64"], sev: ["7", "65", "43", "42"] };
  function secMake(s) {
    for (var tries = 0; tries < 100; tries++) {
      var key = makeKey(s), tc = pick(SEC_T[key.mode]), tgt = chordIn(key, [tc[0], tc[1], ""]);
      var kind = s.kind === "both" ? pick(["tri", "sev"]) : s.kind, root = above2(tgt.notes[0], "P5");
      var ch = root && (kind === "sev" ? seventhOf(root, "dom7") : triadOf(root, "maj"));
      if (!ch || ch.some(function (n) { return Math.abs(n.a) > 1; })) continue;
      if (ch.every(function (n) { return n.a === key.sig[n.l]; })) continue;
      var inv = s.inv === "all" ? rnd(ch.length) : 0;
      return { key: key, tgt: tgt, ch: ch, inv: inv, kind: kind, root: root, rn: "V" + SEC_FIG[kind][inv] + "/" + tgt.rn };
    }
    return null;
  }
  // a typed secondary dominant -> normal form ("V65/V"); "V7 of ii", "V6/5/V" and "V2/IV" work too; null when unreadable
  function normSec(t) {
    t = String(t || "").replace(/\s+of\s+/gi, "/").replace(/\s+/g, "").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64");
    var m = /^V(7)?(6|64|65|43|42|2)?\/(.+)$/.exec(t); if (!m) return null;
    var fig = m[2] === "2" ? "42" : m[2] || "", tgt = normRN(m[3]);
    if (!tgt || /\//.test(tgt)) return null;
    if (m[1] && fig) return null;   // V7 with a figure after it: the figure says seventh already (V65, not V765)
    return "V" + (m[1] ? "7" : fig) + "/" + tgt;
  }
  function secSym(c) { return symbol7(c.root, "dom7").replace(/7$/, c.kind === "sev" ? "7" : ""); }
  var SEC_SET = KEY_SET.filter(function (d) { return d.id !== "minorset"; }).concat([
    { id: "kind", label: "Chords", type: "select", options: ["tri", "sev", "both"], names: { tri: "Triads (V/x)", sev: "Seventh chords (V7/x)", both: "Both" }, def: "both" }
  ]);
  EX.secdom = {
    title: "Name the secondary dominant",
    input: "text",
    palette: ["V", "7", "6", "64", "65", "43", "42", "/", "ii", "iii", "IV", "vi", "III", "iv", "VI", "VII"],
    SETTINGS: SEC_SET.concat([
      { id: "inv", label: "Position", type: "select", options: ["root", "all"], names: { root: "Root position", all: "With inversions (6, 64, 65, 43, 42)" }, def: "root" },
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }
    ]),
    make: function (s) {
      var c = secMake(s); if (!c) return null;
      var clef = pick(s.clef.length ? s.clef : ["treble"]), v = voiceClose(c.ch, c.inv, clef), r = voiceClose(c.tgt.notes, 0, clef);
      var abc = "X:1\nL:1/4\nK:" + c.key.abc + " clef=" + clef + "\n[" + v.map(function (n) { return keyAbcNote(n, c.key.sig); }).join("") + "]2 [" +
        r.map(function (n) { return keyAbcNote(n, c.key.sig); }).join("") + "]2 |]\n";
      return { abc: abc, answer: c.rn, play: [v.map(midi), r.map(midi)], pcs: pcsOf(v), bassPc: pcsOf(v)[0], width: 230,
        label: "Key: " + c.key.label + ". Name the first chord: it tonicizes the second." };
    },
    check: function (q, typed) { return normSec(typed) === q.answer; },
    explain: function (q) { return "Its root is a perfect 5th above the root of the chord it resolves to."; },
    keyHelp: function () { return "Type it, then Enter: V/V, V7/ii, V6/vi, V65/V (V6/5/V and \"V7 of ii\" work too). After the slash, the chord it tonicizes: case is its quality (ii minor, IV major)."; },
    midiNeed: 3,
    midiMatch: function (q, notes) { return EX.triad.midiMatch(q, notes); }
  };
  EX.secwrite = {
    title: "Write the secondary dominant",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: SEC_SET.concat([{ id: "inv", label: "Position", type: "select", options: ["root", "all"], names: { root: "Root position", all: "With inversions (6, 64, 65, 43, 42)" }, def: "root" }]),
    make: function (s) {
      var c = secMake(s); if (!c) return null;
      var order = c.ch.map(function (_, i) { return c.ch[(c.inv + i) % c.ch.length]; });
      return { answer: order.map(name).join(" "), want: order, show: c.key.label.split(" ")[0] + ": " + c.rn, abc: null,
        play: [voiceClose(c.ch, c.inv, "treble").map(midi), voiceClose(c.tgt.notes, 0, "treble").map(midi)],
        label: "Write the notes of this chord in " + c.key.label + ", lowest first." };
    },
    check: function (q, typed) { return EX.spell.check(q, typed); },
    keyHelp: function () { return "Type the note names with spaces, lowest first (in B♭ major, V43/V is G B♭ C E: type G Bb C E), then Enter. Find the root of the chord after the slash, go up a perfect 5th, build a major triad or a dominant seventh there."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  EX.secsym = {
    title: "Secondary dominants as chord symbols",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "7", "V", "/", "ii", "iii", "IV", "vi", "III", "iv", "VI", "VII"],
    SETTINGS: SEC_SET.concat([{ id: "dir", label: "Task", type: "select", options: ["find", "name", "both"], names: { find: "Roman numeral → chord symbol", name: "Chord symbol → Roman numeral", both: "Either" }, def: "find" }]),
    make: function (s) {
      var c = secMake(Object.assign({}, s, { inv: "root" })); if (!c) return null;
      var dir = s.dir === "both" ? pick(["find", "name"]) : s.dir, k = c.key.label, sym = secSym(c), to = symbol(c.tgt.notes[0], c.tgt.q);
      var play = [voiceClose(c.ch, 0, "treble").map(midi), voiceClose(c.tgt.notes, 0, "treble").map(midi)];
      if (dir === "find") return { abc: null, words: true, show: "In " + k + ": " + c.rn, answer: sym, parsed: { root: c.root, kind: c.kind }, play: play,
        label: "Which chord is it? Give the lead-sheet symbol." };
      return { abc: null, words: true, show: "In " + k + ": " + sym + " → " + to, answer: c.rn, sec: true, play: play,
        label: "Name the first chord with a Roman numeral." };
    },
    check: function (q, typed) {
      if (q.sec) return normSec(typed) === q.answer;
      var p = q.parsed.kind === "sev" ? parseSymbol7(typed) : parseSymbol(typed);
      return !!p && same(p.root, q.parsed.root) && p.q === (q.parsed.kind === "sev" ? "dom7" : "maj") && !p.bass;
    },
    keyHelp: function () { return "A chord symbol (D7, F#, Bb7) or a Roman numeral (V7/vi, V/V), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- secondary diminished chords (Hutchinson, ch. 18): vii°, viiø7 or vii°7 of a diatonic major or minor triad. The root is a
  // minor 2nd below the root of the chord it resolves to. Targets and qualities as in the book's Figures 18.2.1 and 18.2.2: major
  // ii iii IV V vi, minor III iv V VI VII; a minor target takes vii°7, a major one viiø7 (the book: major triads "traditionally" take ø7,
  // though °7 also occurs; the drills keep to the tables). A chord whose notes are all in the key is left out, as in ch. 17: vii°/III
  // in minor (the book leaves it out: it is ii°) and viiø7/III in minor (in the book's table, but it is iiø7 note for note; only its
  // resolution tells them apart). Every other chord in the tables has an accidental. Figures: vii°6 vii°64, vii°7 vii°65 vii°43 vii°42.
  var SECDIM_T = { major: [[2, []], [3, []], [4, []], [5, []], [6, []]], minor: [[3, []], [4, []], [5, [7]], [6, []], [7, []]] };
  function belowM2(n) { var r = fromDia(dia(n) - 1, 0); r.a = midi(n) - 1 - midi(r); return Math.abs(r.a) > 2 ? null : r; }
  function secDimMake(s) {
    for (var tries = 0; tries < 100; tries++) {
      var key = makeKey(s), tc = pick(SECDIM_T[key.mode]), tgt = chordIn(key, [tc[0], tc[1], ""]);
      var kind = s.kind === "both" ? pick(["tri", "sev"]) : s.kind, root = belowM2(tgt.notes[0]);
      var q = kind === "tri" ? "dim" : tgt.q === "min" ? "dim7" : "hdim7";
      var ch = root && (kind === "sev" ? seventhOf(root, q) : triadOf(root, "dim"));
      if (!ch || ch.some(function (n) { return Math.abs(n.a) > 1; })) continue;
      if (ch.every(function (n) { return n.a === key.sig[n.l]; })) continue;
      var inv = s.inv === "all" ? rnd(ch.length) : 0, mark = q === "hdim7" ? "ø" : "°";
      return { key: key, tgt: tgt, ch: ch, inv: inv, kind: kind, root: root, q: q, rn: "vii" + mark + SEC_FIG[kind][inv] + "/" + tgt.rn };
    }
    return null;
  }
  // a typed secondary diminished chord -> normal form ("viiø65/V"); o / dim for °, Ø / h for ø, "vii°7 of iv", "vii°6/5/V", "vii°2/V"
  // work too. ø on a triad, a missing quality sign, or 7 with a figure after it -> null
  function normSecDim(t) {
    t = String(t || "").replace(/\s+of\s+/gi, "/").replace(/\s+/g, "").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64");
    var m = /^vii(o|°|dim|ø|Ø|h)(7)?(6|64|65|43|42|2)?\/(.+)$/.exec(t); if (!m) return null;
    var half = /^(ø|Ø|h)$/.test(m[1]), fig = m[3] === "2" ? "42" : m[3] || "", tgt = normRN(m[4]);
    if (!tgt || /\//.test(tgt)) return null;
    if (m[2] && fig) return null;
    var sev = !!m[2] || /^(65|43|42)$/.test(fig);
    if (half && !sev) return null;
    return "vii" + (half ? "ø" : "°") + (m[2] ? "7" : fig) + "/" + tgt;
  }
  function secDimSym(c) { return c.kind === "sev" ? symbol7(c.root, c.q) : symbol(c.root, "dim"); }
  var SECDIM_SET = KEY_SET.filter(function (d) { return d.id !== "minorset"; }).concat([
    { id: "kind", label: "Chords", type: "select", options: ["tri", "sev", "both"], names: { tri: "Triads (vii°/x)", sev: "Seventh chords (viiø7/x, vii°7/x)", both: "Both" }, def: "both" }
  ]);
  var SECDIM_INV = { id: "inv", label: "Position", type: "select", options: ["root", "all"], names: { root: "Root position", all: "With inversions (6, 64, 65, 43, 42)" }, def: "root" };
  EX.secdim = {
    title: "Name the secondary diminished chord",
    input: "text",
    palette: ["vii", "°", "ø", "7", "6", "64", "65", "43", "42", "/", "ii", "iii", "IV", "V", "vi", "III", "iv", "VI", "VII"],
    SETTINGS: SECDIM_SET.concat([SECDIM_INV, { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }]),
    make: function (s) {
      var c = secDimMake(s); if (!c) return null;
      var clef = pick(s.clef.length ? s.clef : ["treble"]), v = voiceClose(c.ch, c.inv, clef), r = voiceClose(c.tgt.notes, 0, clef);
      var abc = "X:1\nL:1/4\nK:" + c.key.abc + " clef=" + clef + "\n[" + v.map(function (n) { return keyAbcNote(n, c.key.sig); }).join("") + "]2 [" +
        r.map(function (n) { return keyAbcNote(n, c.key.sig); }).join("") + "]2 |]\n";
      return { abc: abc, answer: c.rn, play: [v.map(midi), r.map(midi)], pcs: pcsOf(v), bassPc: pcsOf(v)[0], width: 230,
        label: "Key: " + c.key.label + ". Name the first chord: it tonicizes the second." };
    },
    check: function (q, typed) { return normSecDim(typed) === q.answer; },
    explain: function (q) { return "Its root is a minor 2nd below the root of the chord it resolves to. Before a minor chord: vii°7; before a major chord: viiø7."; },
    keyHelp: function () { return "Type it, then Enter: vii°/V, vii°7/ii, viiø7/IV, viiø65/V (o for °, h or Ø for ø; vii°6/5/V and \"vii°7 of iv\" work too). After the slash, the chord it tonicizes: case is its quality."; },
    midiNeed: 3,
    midiMatch: function (q, notes) { return EX.triad.midiMatch(q, notes); }
  };
  EX.secdimwrite = {
    title: "Write the secondary diminished chord",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: SECDIM_SET.concat([SECDIM_INV]),
    make: function (s) {
      var c = secDimMake(s); if (!c) return null;
      var order = c.ch.map(function (_, i) { return c.ch[(c.inv + i) % c.ch.length]; });
      return { answer: order.map(name).join(" "), want: order, show: c.key.label.split(" ")[0] + ": " + c.rn, abc: null,
        play: [voiceClose(c.ch, c.inv, "treble").map(midi), voiceClose(c.tgt.notes, 0, "treble").map(midi)],
        label: "Write the notes of this chord in " + c.key.label + ", lowest first." };
    },
    check: function (q, typed) { return EX.spell.check(q, typed); },
    keyHelp: function () { return "Type the note names with spaces, lowest first (in E♭ major, vii°43/ii is B♭ D♭ E G: type Bb Db E G), then Enter. Find the root of the chord after the slash, go down a minor 2nd, build a diminished triad, a half-diminished seventh (ø) or a fully-diminished seventh (°) there."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  EX.secdimsym = {
    title: "Secondary diminished chords as chord symbols",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "°", "ø", "7", "vii", "/", "ii", "iii", "IV", "V", "vi", "III", "iv", "VI", "VII"],
    SETTINGS: SECDIM_SET.concat([{ id: "dir", label: "Task", type: "select", options: ["find", "name", "both"], names: { find: "Roman numeral → chord symbol", name: "Chord symbol → Roman numeral", both: "Either" }, def: "find" }]),
    make: function (s) {
      var c = secDimMake(Object.assign({}, s, { inv: "root" })); if (!c) return null;
      var dir = s.dir === "both" ? pick(["find", "name"]) : s.dir, k = c.key.label, sym = secDimSym(c), to = symbol(c.tgt.notes[0], c.tgt.q);
      var play = [voiceClose(c.ch, 0, "treble").map(midi), voiceClose(c.tgt.notes, 0, "treble").map(midi)];
      if (dir === "find") return { abc: null, words: true, show: "In " + k + ": " + c.rn, answer: sym, parsed: { root: c.root, kind: c.kind, q: c.q }, play: play,
        label: "Which chord is it? Give the lead-sheet symbol." };
      return { abc: null, words: true, show: "In " + k + ": " + sym + " → " + to, answer: c.rn, sec: true, play: play,
        label: "Name the first chord with a Roman numeral." };
    },
    check: function (q, typed) {
      if (q.sec) return normSecDim(typed) === q.answer;
      var p = q.parsed.kind === "sev" ? parseSymbol7(typed) : parseSymbol(typed);
      return !!p && same(p.root, q.parsed.root) && p.q === q.parsed.q && !p.bass;
    },
    keyHelp: function () { return "A chord symbol (C#°, F#ø7, G#°7: o and dim work for °, m7b5 for ø7) or a Roman numeral (vii°7/vi, viiø7/V), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- augmented sixth chords (Hutchinson, ch. 21): ♭6 in the bass and ♯4 above it, an augmented 6th apart, both resolving out to
  // 5. Book Figure 21.2.1: It+6 = ♭6 1 ♯4; Fr+6 adds 2; Ger+6 adds ♭3; EnGer+6 respells that ♭3 as ♯2 and occurs only in major (it
  // resolves to I64). Lead-sheet symbols (Figure 21.4.1): a dominant 7th on ♭6 with its 7th misspelled: It = A♭7 (no 5th), Fr =
  // A♭7(♭5), Ger = A♭7 (in C). "V7/N" is the site's addition for 21.6: the same sound spelled as a dominant 7th (A♭ C E♭ G♭ in C).
  var A6 = { It: [null], Fr: ["M2"], Ger: ["m3"], EnGer: ["A2"], V7N: ["m3", "d5"] };
  var A6NAME = { It: "Italian (It+6)", Fr: "French (Fr+6)", Ger: "German (Ger+6)", EnGer: "Enharmonic German (EnGer+6)", V7N: "V7/N (a dominant 7th, not a +6)" };
  var A6RN = { It: "It+6", Fr: "Fr+6", Ger: "Ger+6", EnGer: "EnGer+6", V7N: "V7/N" };
  function a6Make(s, types) {
    for (var tries = 0; tries < 100; tries++) {
      var key = makeKey(Object.assign({}, s, { minorset: "common" })), type = pick(types.length ? types : ["Ger"]);
      if (type === "EnGer" && key.mode === "minor") continue;
      var T = { l: key.tonic.l, a: key.tonic.a, o: 4 }, b6 = above2(T, "m6"), s4 = above2(T, "A4"), ch;
      if (type === "It") ch = [b6, T, s4];
      else if (type === "V7N") ch = [b6, T, above2(T, "m3"), above2(T, "d5")];
      else ch = [b6, T, above2(T, A6[type][0]), s4];
      if (ch.some(function (n) { return !n || Math.abs(n.a) > 1; })) continue;
      var V = chordIn(key, [5, key.mode === "minor" ? [7] : [], ""]), I = chordIn(key, [1, [], ""]);
      return { key: key, type: type, ch: ch, b6: b6, V: V, I: I };
    }
    return null;
  }
  function a6Play(c, clef) {   // the chord, then where it goes: V (It, Fr), I64 then V (Ger, EnGer), N (V7/N)
    var out = [voiceClose(c.ch, 0, clef || "treble").map(midi)];
    if (c.type === "V7N") { var nap = triadOf(above2(c.ch[0], "P4"), "maj"); if (nap) out.push(voiceClose(nap, 1, clef || "treble").map(midi)); return out; }
    if (c.type === "Ger" || c.type === "EnGer") out.push(voiceClose(c.I.notes, 2, clef || "treble").map(midi));
    out.push(voiceClose(c.V.notes, 0, clef || "treble").map(midi));
    return out;
  }
  var A6_SET = [
    { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "both" },
    { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4"], def: "3" }
  ];
  var A6_TYPES = { id: "types", label: "Chords", type: "multi", options: ["It", "Fr", "Ger", "EnGer"], names: A6NAME, def: ["It", "Fr", "Ger", "EnGer"] };
  EX.aug6 = {
    title: "Name the augmented sixth chord",
    SETTINGS: A6_SET.concat([
      { id: "types", label: "Chords", type: "multi", options: ["It", "Fr", "Ger", "EnGer", "V7N"], names: A6NAME, def: ["It", "Fr", "Ger", "EnGer"] },
      { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble"] }
    ]),
    make: function (s) {
      var c = a6Make(s, s.types); if (!c) return null;
      var clef = pick(s.clef.length ? s.clef : ["treble"]), v = voiceClose(c.ch, 0, clef);
      return { abc: "X:1\nL:1/4\nK:" + c.key.abc + " clef=" + clef + "\n[" + v.map(function (n) { return keyAbcNote(n, c.key.sig); }).join("") + "]4 |]\n",
        answer: c.type, play: a6Play(c, clef), label: "Key: " + c.key.label + ". Which chord is it?" };
    },
    answers: function (s) { return ["It", "Fr", "Ger", "EnGer", "V7N"].filter(function (a) { return s.types.indexOf(a) >= 0; }); },
    answerName: function (a) { return A6NAME[a] || a; },
    buttonText: function (a) { return A6RN[a]; },
    explain: function (q) { return "Find ♭6 and ♯4 (the augmented 6th). Then the other note: 1 again is It+6, 2 is Fr+6, ♭3 is Ger+6, ♯2 is EnGer+6. A dominant 7th spelled with ♭5 instead of ♯4 is V7/N."; },
    keyHelp: function () { return "Keys: i (It+6), f (Fr+6), g (Ger+6), e (EnGer+6), v (V7/N)."; },
    letterKeys: { i: "It", f: "Fr", g: "Ger", e: "EnGer", v: "V7N" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  EX.aug6write = {
    title: "Write the augmented sixth chord",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: A6_SET.concat([A6_TYPES]),
    make: function (s) {
      var c = a6Make(s, s.types); if (!c) return null;
      return { answer: c.ch.map(name).join(" "), want: c.ch, show: c.key.label.split(" ")[0] + " " + c.key.mode + ": " + A6RN[c.type], abc: null, play: a6Play(c),
        label: "Write the notes of this chord, the bass (♭6) first, then upward." };
    },
    check: function (q, typed) {   // the It+6's doubled tonic may be written or not
      var ns = parseNotes(typed); if (!ns) return false;
      ns = ns.filter(function (n, i) { return !i || !same(n, ns[i - 1]); });
      return ns.length === q.want.length && ns.every(function (n, i) { return same(n, q.want[i]); });
    },
    keyHelp: function () { return "Type the note names with spaces, the bass first (in C major, Ger+6 is A♭ C E♭ F♯: type Ab C Eb F#), then Enter. ♭6 in the bass, then 1, then 2 (Fr), ♭3 (Ger) or ♯2 (EnGer), then ♯4. It+6 has three notes."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // a typed lead-sheet symbol for an augmented sixth -> "7", "7b5" or "7no5" with its root, or null
  function parseA6Sym(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/[()]/g, "").replace(/♭/g, "b").replace(/♯/g, "#").replace(/omit/g, "no").replace(/no5th/g, "no5");
    var m = /^([A-G](?:##|bb|#|b)?)(7(?:b5|-5|no5)?)$/.exec(t); if (!m) return null;
    var r = parseName(m[1]); return r ? { root: r, suf: m[2].replace("-5", "b5") } : null;
  }
  var A6SUF = { It: ["7no5", "7"], Fr: ["7b5"], Ger: ["7"], EnGer: ["7"] };
  var A6SYMTXT = { It: "7 (no 5th)", Fr: "7(♭5)", Ger: "7", EnGer: "7" };
  // a typed augmented sixth name -> It / Fr / Ger / EnGer
  function normA6(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/\+?6$/, "").toLowerCase();
    return { it: "It", italian: "It", fr: "Fr", french: "Fr", ger: "Ger", german: "Ger", enger: "EnGer", enharmonicgerman: "EnGer" }[t] || null;
  }
  EX.aug6sym = {
    title: "Augmented sixth chords as chord symbols",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "7", "(♭5)", "(no5)", "It", "Fr", "Ger", "EnGer"],
    SETTINGS: A6_SET.concat([A6_TYPES, { id: "dir", label: "Task", type: "select", options: ["find", "name", "both"], names: { find: "Augmented sixth → chord symbol", name: "Chord symbol → augmented sixth", both: "Either" }, def: "find" }]),
    make: function (s) {
      var c = a6Make(s, s.types); if (!c) return null;
      var dir = s.dir === "both" ? pick(["find", "name"]) : s.dir, k = c.key.label, sym = name(c.b6) + A6SYMTXT[c.type];
      if (dir === "find") return { abc: null, words: true, show: "In " + k + ": " + A6RN[c.type], answer: sym, root: c.b6, type: c.type, play: a6Play(c),
        label: "Which chord symbol? Treat it as a dominant 7th on ♭6." };
      var ger = c.type === "Ger" || c.type === "EnGer", toI = c.type === "EnGer" || (c.type === "Ger" && c.key.mode === "major" && rnd(2) === 0);
      var to = toI ? symbol(c.I.notes[0], c.I.q, c.I.notes[2]) + " (I64)" : symbol(c.V.notes[0], c.V.q) + " (V)";
      var both = ger && toI && c.key.mode === "major";   // a 7th chord on ♭6 before a major I64: Ger+6 or EnGer+6, the symbol is the same
      return { abc: null, words: true, show: "In " + k + ": " + name(c.b6) + A6SYMTXT[c.type] + " → " + to, answer: both ? "Ger+6 or EnGer+6" : A6RN[c.type],
        a6: both ? ["Ger", "EnGer"] : ger ? ["Ger"] : [c.type], play: a6Play(c),
        label: "Which augmented sixth chord is it?" };
    },
    check: function (q, typed) {
      if (q.a6) return q.a6.indexOf(normA6(typed)) >= 0;
      var p = parseA6Sym(typed); return !!p && same(p.root, q.root) && A6SUF[q.type].indexOf(p.suf) >= 0;
    },
    explain: function (q) { return q.a6 ? (q.a6.length > 1 ? "A plain 7th chord on ♭6 is a German sixth. Before a major I64 it is spelled as EnGer+6, so either answer counts." : "No 5th: It+6. (♭5): Fr+6. A full 7th chord: Ger+6.") : "It+6 has no 5th, Fr+6 has a ♭5, Ger+6 is a full dominant 7th."; },
    keyHelp: function () { return "A chord symbol (Ab7, Ab7(b5), Ab7(no5)) or the chord's name (It, Fr, Ger, EnGer), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // hear a phrase I – X – I64 – V – I and name X, a pre-dominant on ♭6 or ♭2 (21.8): iv6, N6 or an augmented sixth. Voicings in C,
  // from C3; minor keys lower the tonic chords' 3rd. Moved to the key by its tonic.
  var PD_V = { iv6: [[44, 60, 65, 72], [43, 60, 64, 72]], N6: [[41, 56, 65, 73], [43, 60, 64, 72]], It: [[44, 60, 66, 72], [43, 64, 67, 72]],
    Fr: [[44, 60, 62, 66], [43, 60, 64, 67]], Ger: [[44, 60, 63, 66], [43, 60, 64, 67]] };
  var PD_NAME = { iv6: "iv6 (borrowed in major)", N6: "Neapolitan (N6)", It: "Italian (It+6)", Fr: "French (Fr+6)", Ger: "German (Ger+6)" };
  var PD_BTN = { iv6: "iv6", N6: "N6", It: "It+6", Fr: "Fr+6", Ger: "Ger+6" };
  EX.aug6ear = {
    title: "Hear the pre-dominant",
    SETTINGS: A6_SET.concat([{ id: "pds", label: "Chords", type: "multi", options: ["iv6", "N6", "It", "Fr", "Ger"], names: PD_NAME, def: ["iv6", "N6", "It", "Fr", "Ger"] }]),
    make: function (s) {
      var key = makeKey(Object.assign({}, s, { minorset: "common" })), x = pick(s.pds.length ? s.pds : ["Ger"]);
      var t = (NAT[key.tonic.l] + key.tonic.a + 12) % 12; if (t > 6) t -= 12;
      var min = key.mode === "minor", third = function (v) { return v.map(function (m) { return min && (m % 12) === 4 ? m - 1 : m; }); };
      var seq = [third([48, 55, 64, 72]), PD_V[x][0], third(PD_V[x][1]), [43, 55, 62, 71], third([48, 55, 64, 72])];
      return { abc: null, ear: true, sound: true, answer: x, play: seq.map(function (v) { return v.map(function (m) { return m + t; }); }),
        times: [0, 1, 2, 3, 4], durs: [0.95, 0.95, 0.95, 0.95, 1.8], label: "Key: " + key.label + ". I, then a pre-dominant, then I64 V I. Which is the second chord?" };
    },
    answers: function (s) { return ["iv6", "N6", "It", "Fr", "Ger"].filter(function (a) { return s.pds.indexOf(a) >= 0; }); },
    answerName: function (a) { return PD_NAME[a] || a; },
    buttonText: function (a) { return PD_BTN[a]; },
    explain: function () { return "All five have ♭6 or 4 in the bass. iv6 and N6 are plain major or minor triads; the augmented sixths add ♯4 against the bass. Fr+6 has the whole-tone sound (two major 3rds a tritone apart); Ger+6 sounds like a dominant 7th; It+6 is thinner, with only three different notes."; },
    keyHelp: function () { return "Keys: v (iv6), n (N6), i (It+6), f (Fr+6), g (Ger+6). Space plays it again."; },
    letterKeys: { v: "iv6", n: "N6", i: "It", f: "Fr", g: "Ger" },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- settings: from the host / address, the student's own on top
  function parseSettings(ex, str) {
    var E = EX[ex], s = {}, q = {};
    (str || "").replace(/^\?/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); });
    E.SETTINGS.forEach(function (d) {
      var v = q[d.id];
      if (d.type === "multi") s[d.id] = v != null ? v.split(",").filter(function (x) { return d.options.indexOf(x) >= 0; }) : d.def.slice();
      else s[d.id] = v != null && d.options.indexOf(v) >= 0 ? v : d.def;
    });
    s.count = Math.max(0, Math.min(200, parseInt(q.count, 10) || 0));
    return s;
  }
  function settingsString(ex, s) {
    return "ex=" + ex + EX[ex].SETTINGS.map(function (d) { return "&" + d.id + "=" + (d.type === "multi" ? s[d.id].join(",") : s[d.id]); }).join("") + (s.count ? "&count=" + s.count : "");
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  // ---- sound
  var snd = null;
  function sound() {
    if (snd) return snd;
    snd = new Promise(function (res, rej) {
      function go() {
        var ac = new (global.AudioContext || global.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
        if (global.AudioTap) try { global.AudioTap.register(ac, out, "Theory drills"); } catch (e) {}
        var bank = global.BandSounds.create(ac); bank.load(["piano"]).then(function () { res({ ac: ac, bank: bank, out: out }); }, rej);
      }
      if (global.BandSounds) return go();
      var sc = document.createElement("script"); sc.src = "/apps/shared/band/sounds.js?v=17"; sc.onload = go; sc.onerror = function () { snd = null; rej(); }; document.head.appendChild(sc);
    });
    return snd;
  }
  function playNotes(seq, times, durs) {   // seq: [midi | [midi, midi]] one after the other (or at times[i] seconds, each durs[i] long)
    return sound().then(function (b) {
      b.ac.resume(); var t = b.ac.currentTime + 0.05;
      seq.forEach(function (x, i) { [].concat(x).forEach(function (m) { b.bank.play("piano", { midi: m, vel: 0.7, dur: durs ? durs[i] : 0.9 }, t + (times ? times[i] : i * 0.75), b.out); }); });
    });
  }

  // ---- MIDI: notes pressed close together count as one answer
  var midiSubs = [], midiOn = false;
  function midiConnect() {
    if (midiOn || !navigator.requestMIDIAccess) return Promise.resolve(midiOn);
    return navigator.requestMIDIAccess().then(function (acc) {
      function hook(inp) { inp.onmidimessage = function (m) { var d = m.data; if ((d[0] & 0xf0) === 0x90 && d[2] > 0) midiSubs.forEach(function (f) { f(d[1]); }); }; }
      acc.inputs.forEach(hook); acc.onstatechange = function (e) { if (e.port.type === "input" && e.port.state === "connected") hook(e.port); };
      midiOn = true; return true;
    }, function () { return false; });
  }

  // ---- one drill
  function Drill(host) {
    var ex = host.getAttribute("data-ex") || "note", fromUrl = host.hasAttribute("data-from-url"), linkStr = "";
    if (fromUrl) { var m = /[?&]ex=(\w+)/.exec(location.search); if (m && EX[m[1]]) ex = m[1]; linkStr = location.search; }
    else linkStr = host.getAttribute("data-settings") || "";
    if (!EX[ex]) ex = "note";
    var E = EX[ex], linkS = parseSettings(ex, linkStr), KEY = "drills-v1:" + ex + ":" + settingsString(ex, linkS);
    var s = store(KEY) || JSON.parse(JSON.stringify(linkS)), locked = /[?&]lock=1\b/.test(linkStr) || host.hasAttribute("data-lock");
    var q = null, done = 0, right = 0, streak = 0, times = [], tAsk = 0, pending = "", busy = false, midiBuf = [], midiT = null, wrongs = [];

    host.innerHTML = ""; host.classList.add("dr");
    var head = el("div", "dr-head"), title = el("h3", "dr-title", E.title), score = el("div", "dr-score");
    head.appendChild(title); head.appendChild(score); host.appendChild(head);
    var prompt = el("div", "dr-prompt"), paper = el("div", "dr-paper"), ear = el("div", "dr-ear"), fb = el("div", "dr-fb"), typed = el("div", "dr-typed");
    var hear = el("button", "btn btn-outline-secondary btn-sm", "▶ Hear it"); hear.type = "button";
    hear.addEventListener("click", function () { if (q) playNotes(q.play, q.times, q.durs); });
    var row = el("div", "dr-row"); row.appendChild(hear);
    var mBtn = el("button", "btn btn-outline-secondary btn-sm", "Use a MIDI keyboard"); mBtn.type = "button"; row.appendChild(mBtn); mBtn.hidden = !!E.noMidi;
    var nextBtn = el("button", "btn btn-outline-secondary btn-sm", "Next ⏎"); nextBtn.type = "button"; nextBtn.hidden = true; row.appendChild(nextBtn);
    var btns = el("div", "dr-answers"), help = el("div", "dr-help");
    [prompt, paper, ear, row, fb, typed, btns, help].forEach(function (x) { host.appendChild(x); });
    var end = el("div", "dr-end"); end.hidden = true; host.appendChild(end);

    // settings panel
    var det = el("details", "dr-settings"), sum = el("summary", "", "Settings"); det.appendChild(sum);
    var form = el("div", "dr-form"); det.appendChild(form); host.appendChild(det);
    var tools = el("div", "dr-row"), resetB = el("button", "btn btn-outline-secondary btn-sm", "Back to the link's settings"), linkB = el("button", "btn btn-outline-secondary btn-sm", "Copy a link with these settings"), msg = el("span", "dr-help");
    resetB.type = linkB.type = "button"; tools.appendChild(resetB); tools.appendChild(linkB); tools.appendChild(msg); det.appendChild(tools);
    if (locked) det.hidden = true;

    function buildForm() {
      form.innerHTML = "";
      E.SETTINGS.concat([{ id: "count", label: "Questions", type: "count" }]).forEach(function (d) {
        var box = el("div", "dr-field"); box.appendChild(el("span", "dr-flabel", d.label));
        if (d.type === "multi") d.options.forEach(function (o) {
          var lab = el("label", "dr-opt"), c = el("input"); c.type = "checkbox"; c.checked = s[d.id].indexOf(o) >= 0;
          c.addEventListener("change", function () { s[d.id] = d.options.filter(function (x, i) { return x === o ? c.checked : s[d.id].indexOf(x) >= 0; }); changed(); });
          lab.appendChild(c); lab.appendChild(document.createTextNode(" " + (d.names && d.names[o] || o))); box.appendChild(lab);
        });
        else if (d.type === "count") {
          var sel0 = el("select"); [0, 10, 20, 30, 50].forEach(function (n) { var op = el("option", "", n ? n + " then a score" : "Keep going"); op.value = n; sel0.appendChild(op); });
          sel0.value = String(s.count || 0); sel0.addEventListener("change", function () { s.count = +sel0.value; changed(); }); box.appendChild(sel0);
        } else {
          var sel = el("select"); d.options.forEach(function (o) { var op = el("option", "", d.names && d.names[o] || o); op.value = o; sel.appendChild(op); });
          sel.value = s[d.id]; sel.addEventListener("change", function () { s[d.id] = sel.value; changed(); }); box.appendChild(sel);
        }
        form.appendChild(box);
      });
    }
    function changed() { store(KEY, s); restart(); }
    resetB.addEventListener("click", function () { s = JSON.parse(JSON.stringify(linkS)); store(KEY, null); buildForm(); restart(); msg.textContent = "Back to the link's settings."; });
    linkB.addEventListener("click", function () {
      var url = location.origin + "/theory/theory-drills.html?" + settingsString(ex, s);
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { msg.textContent = "Copied. Add &lock=1 to hide the settings."; }, function () { msg.textContent = url; });
      else msg.textContent = url;
    });
    mBtn.addEventListener("click", function () { midiConnect().then(function (ok) { mBtn.textContent = ok ? "MIDI keyboard on" : "No MIDI keyboard found"; }); });
    midiSubs.push(function (n) {
      if (!q || busy || !host.isConnected || host.offsetParent === null) return;
      midiBuf.push(n); clearTimeout(midiT);
      var need = E.midiNeed || (ex === "interval" ? 2 : ex === "keysig" || ex === "triad" || ex === "rn" ? 3 : 1);
      midiT = setTimeout(flushMidi, midiBuf.length >= need ? 60 : 450);
    });
    function flushMidi() {
      var notes = midiBuf.slice(); midiBuf = [];
      if (!notes.length || !q) return;
      var ok = E.midiMatch(q, notes);
      answer(ok ? q.answer : null, notes);
    }

    function restart() { done = right = streak = 0; times = []; wrongs = []; end.hidden = true; drawAnswers(); next(); }
    var box = null;
    function drawAnswers() {
      btns.innerHTML = "";
      if (E.input === "text") {
        box = el("input", "dr-text"); box.type = "text"; box.setAttribute("aria-label", "Your answer"); box.autocomplete = "off"; box.spellcheck = false;
        box.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (busy && !nextBtn.hidden) next(); else if (box.value.trim()) answer(box.value.trim()); } });
        btns.appendChild(box);
        var pal = el("div", "dr-palette");
        E.palette.forEach(function (k) {
          var b = el("button", "btn btn-outline-secondary btn-sm", k); b.type = "button";
          b.addEventListener("click", function () {
            var v = box.value, letter = /^[A-G]$/.test(k);
            if (k === "␣") v += " "; else if (letter && E === EX.spell && v && !/\s$/.test(v)) v += " " + k; else v += k;
            box.value = v; box.focus(); });
          pal.appendChild(b);
        });
        var del = el("button", "btn btn-outline-secondary btn-sm", "⌫"); del.type = "button"; del.addEventListener("click", function () { box.value = box.value.slice(0, -1); box.focus(); });
        var go = el("button", "btn btn-outline-secondary btn-sm dr-check", "Check ⏎"); go.type = "button"; go.addEventListener("click", function () { if (box.value.trim()) answer(box.value.trim()); });
        pal.appendChild(del); pal.appendChild(go); btns.appendChild(pal);
        help.textContent = E.keyHelp(s) + " Space (outside the box) plays it.";
        return;
      }
      E.answers(s, q && ex === "keysig" ? q : null).forEach(function (a) {
        var b = el("button", "btn btn-outline-secondary dr-ans", E.buttonText ? E.buttonText(a) : a); b.type = "button"; b.setAttribute("data-a", a);
        if (E.answerName) b.title = E.answerName(a);
        b.addEventListener("click", function () { answer(a); }); btns.appendChild(b);
      });
      help.textContent = E.keyHelp(s) + " Space plays it.";
    }
    function next() {
      if (s.count && done >= s.count) return finish();
      var hadFocus = host.contains(document.activeElement);
      busy = false; pending = ""; typed.textContent = ""; fb.textContent = ""; fb.className = "dr-fb"; nextBtn.hidden = true;
      q = E.make(s);
      if (!q) { prompt.textContent = "No question fits these settings. Choose more options."; paper.innerHTML = ""; return; }
      prompt.textContent = q.label + (s.count ? "  (" + (done + 1) + " of " + s.count + ")" : "");
      if (ex === "keysig") drawAnswers();
      [].forEach.call(btns.querySelectorAll(".dr-ans"), function (b) { b.className = "btn btn-outline-secondary dr-ans"; });
      if (q.ear) { paper.innerHTML = ""; ear.textContent = "Listen, then answer. ▶ Hear it plays it again."; }
      else if (!q.abc) { ear.textContent = ""; paper.innerHTML = ""; paper.appendChild(el("div", "dr-symbol" + (q.words ? " dr-words" : ""), q.show || "")); }
      else { ear.textContent = ""; if (global.ABCJS) global.ABCJS.renderAbc(paper, q.abc, { scale: q.width ? 1.25 : 1.6, staffwidth: q.width || 170, paddingleft: 0, paddingright: 0, add_classes: true }); else paper.textContent = q.abc; }
      hear.hidden = !q.play.length;
      if (q.sound || q.ear) playNotes(q.play, q.times, q.durs).catch(function () {});
      if (box) { box.value = ""; box.disabled = false; if (hadFocus) box.focus({ preventScroll: true }); }
      tAsk = performance.now(); score.textContent = scoreText();
      host.setAttribute("data-answer", q.answer);
    }
    function scoreText() { return right + " / " + done + (done ? "  (" + Math.round(100 * right / done) + "%)" : "") + (streak > 2 ? "  · streak " + streak : ""); }
    function answer(a, played) {
      if (!q || busy) return;
      busy = true; done++; if (box) box.disabled = false;
      var ok = E.check ? E.check(q, a) : a === q.answer, dt = (performance.now() - tAsk) / 1000; times.push(dt);
      if (ok) { right++; streak++; } else { streak = 0; wrongs.push(q.answer); }
      [].forEach.call(btns.children, function (b) { var v = b.getAttribute("data-a"); if (v === q.answer) b.classList.add("dr-right"); else if (v === a) b.classList.add("dr-wrong"); });
      var nm = E.answerName ? E.answerName(q.answer) + " (" + q.answer + ")" : q.answer;
      fb.className = "dr-fb " + (ok ? "dr-ok" : "dr-no");
      fb.textContent = ok ? "Right: " + nm + "." : (played ? "Not that one. " : a ? "No: " + (E.answerName ? E.answerName(a) : a) + ". " : "") + "It's " + nm + ".";
      if (E.explain) fb.textContent += " " + E.explain(q);
      score.textContent = scoreText();
      if (!q.sound && !q.ear) playNotes(q.play, q.times, q.durs).catch(function () {});
      host.setAttribute("data-done", done); host.setAttribute("data-right", right);
      if (q.ear && q.abc) global.ABCJS && global.ABCJS.renderAbc(paper, q.abc, { scale: q.width ? 1.25 : 1.6, staffwidth: q.width || 170, paddingleft: 0, paddingright: 0 });
      if (ok) setTimeout(function () { if (busy && done === +host.getAttribute("data-done")) next(); }, 900);
      else nextBtn.hidden = false;
    }
    nextBtn.addEventListener("click", function () { next(); });
    function finish() {
      q = null; busy = true; paper.innerHTML = ""; prompt.textContent = ""; btns.innerHTML = ""; fb.textContent = "";
      var avg = times.length ? times.reduce(function (a, b) { return a + b; }, 0) / times.length : 0, counts = {};
      wrongs.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; });
      var miss = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 4).map(function (k) { return (E.answerName ? E.answerName(k) : k) + " ×" + counts[k]; });
      var text = E.title + ": " + right + " of " + done + " (" + Math.round(100 * right / Math.max(1, done)) + "%), " + avg.toFixed(1) + " s an answer" +
        (miss.length ? ". Missed: " + miss.join(", ") : "") + ". " + new Date().toISOString().slice(0, 10) + ". Settings: " + settingsString(ex, s);
      end.hidden = false; end.innerHTML = "";
      end.appendChild(el("p", "dr-endtext", text));
      var again = el("button", "btn btn-outline-secondary btn-sm", "Again"), cp = el("button", "btn btn-outline-secondary btn-sm", "Copy the result"); again.type = cp.type = "button";
      again.addEventListener("click", restart); cp.addEventListener("click", function () { if (navigator.clipboard) navigator.clipboard.writeText(text); cp.textContent = "Copied"; });
      end.appendChild(again); end.appendChild(cp); host.setAttribute("data-finished", "1");
    }

    // computer keys (only while this drill is on screen and nothing else has focus)
    document.addEventListener("keydown", function (e) {
      if (!q || e.metaKey || e.ctrlKey || host.offsetParent === null) return;
      var t = e.target; if (t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable)) return;
      var k = e.key;
      if (k === " ") { e.preventDefault(); playNotes(q.play, q.times, q.durs); return; }
      if (busy) { if (k === "Enter" && !nextBtn.hidden) { e.preventDefault(); next(); } return; }
      if (E.input === "text") return;
      if (E.letterKeys) { if (E.letterKeys[k] && E.answers(s).indexOf(E.letterKeys[k]) >= 0) answer(E.letterKeys[k]); return; }
      if (ex === "interval") {
        if (/^[mMpPaAdD]$/.test(k)) { pending = k === "M" ? "M" : k === "m" ? "m" : k.toUpperCase() === "P" ? "P" : k.toUpperCase() === "A" ? "A" : "d"; typed.textContent = pending; return; }
        if (/^[1-8]$/.test(k) && pending) { var iv = pending + k; typed.textContent = iv; answer(E.answers(s).indexOf(iv) >= 0 ? iv : "?" + iv); }
        return;
      }
      if (/^[a-gA-G]$/.test(k)) {
        pending = k.toUpperCase(); typed.textContent = pending;
        if (ex === "note" && s.acc === "none") answer(pending);
        return;
      }
      if (!pending) return;
      if (k === "#") pending += "♯"; else if (k === "-") pending += "♭"; else if (k === "x") pending += "𝄪";
      else if (k === "Enter") { e.preventDefault(); var ans = pending.replace("♯♯", "𝄪").replace("♭♭", "𝄫"); answer(ex === "keysig" ? ans + " " + q.mode : ans); return; }
      typed.textContent = pending;
    });

    buildForm(); restart();
    host._drill = { settings: function () { return s; }, question: function () { return q; }, answer: answer, next: next, linkKey: KEY };
  }

  function init() { [].forEach.call(document.querySelectorAll(".drill"), function (h) { if (!h._drill) Drill(h); }); }
  function keyFrom(tonic, mode) {   // "G", "major" -> the key object makeKey builds (for tests and pages)
    var map = mode === "major" ? MAJ : MIN, k = Object.keys(map).filter(function (x) { return map[x] === tonic; })[0];
    if (k == null) return null; var tName = map[k];
    return { k: +k, mode: mode, tonic: parseName(abcKey(tName)), sig: keySigMap(+k), abc: abcKey(tName) + (mode === "minor" ? "m" : ""), label: tName + " " + mode };
  }
  global.Drills = { normSec: normSec, normSecDim: normSecDim, rnChord: rnChord, PROGS: PROGS, chordIn7: chordIn7, normRN7: normRN7, parseSymbol7: parseSymbol7, MAJOR_7: MAJOR_7, MINOR_7: MINOR_7, keyFrom: keyFrom, chordIn: chordIn, noteName: name, MINOR_COMMON: MINOR_COMMON, MINOR_RARE: MINOR_RARE, engines: EX, parseSettings: parseSettings, settingsString: settingsString, above: above, init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
