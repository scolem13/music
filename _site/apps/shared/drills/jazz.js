// jazz.js — jazz chords and scales (Hutchinson, Music Theory for the 21st-Century Classroom, ch. 31). Adds to Drills.engines; load
// it after drills.js (drills.js builds its drills when the page has loaded, so the engines are there in time).
//
// The chords are the book's Figures 31.4.1–8 (condensed there from The New Real Book), the scales its Table 31.9.4, the chord-scale
// pairs its Table 31.10.3. Chord symbols are read by the book's rules (31.1–31.2): every number up to the highest is assumed (C13 =
// C E G B♭ D F A), "9(13)" adds only the 13, Δ / maj applies to the 7th, m / – to the 3rd, sus replaces the 3rd (and the 11), +5 / –9
// are ♯5 / ♭9, ♭13 keeps the 5th and ♯5 replaces it. A typed name is right when it means the same notes over the same root. The book
// allows enharmonic respelling of altered notes (♯5 as ♭6, ♯9 as ♭10, 31.3), so written notes are checked by sound over the root,
// which must be spelled as the symbol spells it; a 5th left out is fine when naming (31.6, incomplete chords).
(function (global) {
  var D = global.Drills; if (!D) return;
  var EX = D.engines;
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" }, ACC_TXT = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
  function dia(n) { return n.o * 7 + n.l; }
  function midi(n) { return 12 * (n.o + 1) + NAT[n.l] + n.a; }
  function name(n) { return LET[n.l] + ACC_TXT[n.a]; }
  function pc(m) { return ((m % 12) + 12) % 12; }
  function parseName(t) {
    var m = /^([A-Ga-g])(##|bb|x|𝄪|𝄫|#|b|♯|♭)?$/.exec(t); if (!m) return null;
    return { l: LET.indexOf(m[1].toUpperCase()), a: { "": 0, "#": 1, "♯": 1, "b": -1, "♭": -1, "##": 2, "x": 2, "𝄪": 2, "bb": -2, "𝄫": -2 }[m[2] || ""] };
  }
  function parseNotes(t) { var ns = String(t || "").trim().split(/[\s,–-]+/).filter(Boolean).map(parseName); return ns.length && ns.every(Boolean) ? ns : null; }
  function same(a, b) { return a && b && a.l === b.l && a.a === b.a; }
  // a note `steps` letters and `semis` half steps above the root; a double sharp or flat is respelled on the next letter (31.1)
  function above(root, steps, semis) {
    var d = dia(root) + steps, n = { l: ((d % 7) + 7) % 7, o: Math.floor(d / 7), a: 0 };
    n.a = midi(root) + semis - midi(n);
    if (Math.abs(n.a) > 1) { var d2 = d + (n.a > 0 ? 1 : -1); n = { l: ((d2 % 7) + 7) % 7, o: Math.floor(d2 / 7), a: 0 }; n.a = midi(root) + semis - midi(n); }
    return Math.abs(n.a) > 1 ? null : n;
  }
  // chord members: [letter steps above the root, half steps]. As drawn: ♯5 under a ♭7 as ♭6 and ♯9 as ♭10 (31.3), °7's 𝄫7 as 6 (Figure 31.4.8)
  var DEG = { "1": [0, 0], "3": [2, 4], "b3": [2, 3], "4": [3, 5], "b5": [4, 6], "5": [4, 7], "#5": [4, 8], "6": [5, 9], "bb7": [5, 9], "b7": [6, 10], "7": [6, 11],
    "b9": [8, 13], "9": [8, 14], "#9": [9, 15], "11": [10, 17], "#11": [10, 18], "b13": [12, 20], "13": [12, 21] };
  function C(sym, degs) { return { sym: sym, degs: degs.split(" ") }; }
  var GROUPS = {
    add: { name: "Triads with added notes (31.4.1)", ch: [C("6", "1 3 5 6"), C("m6", "1 b3 5 6"), C("(add9)", "1 3 5 9"), C("m(add9)", "1 b3 5 9"), C("6/9", "1 3 5 6 9"), C("m6/9", "1 b3 5 6 9")] },
    dom: { name: "Dominant 7ths (31.4.2)", ch: [C("7", "1 3 5 b7"), C("9", "1 3 5 b7 9"), C("9(♯11)", "1 3 5 b7 9 #11"), C("9(13)", "1 3 5 b7 9 13"), C("13(♯11)", "1 3 5 b7 9 #11 13")] },
    maj: { name: "Major 7ths (31.4.3)", ch: [C("Δ7", "1 3 5 7"), C("Δ9", "1 3 5 7 9"), C("Δ9(♯11)", "1 3 5 7 9 #11"), C("Δ13(♯11)", "1 3 5 7 9 #11 13"), C("Δ7(♯5)", "1 3 #5 7"), C("Δ7(♭5)", "1 3 b5 7")] },
    min: { name: "Minor 7ths (31.4.4)", ch: [C("m7", "1 b3 5 b7"), C("m9", "1 b3 5 b7 9"), C("m11", "1 b3 5 b7 9 11"), C("m7(11)", "1 b3 5 b7 11"), C("m13", "1 b3 5 b7 9 11 13"), C("m13(♯11)", "1 b3 5 b7 9 #11 13")] },
    hdim: { name: "Half-diminished 7ths (31.4.5)", ch: [C("m7(♭5)", "1 b3 b5 b7"), C("m9(♭5)", "1 b3 b5 b7 9"), C("m11(♭5)", "1 b3 b5 b7 9 11")] },
    sus: { name: "Sus chords (31.4.6)", ch: [C("sus", "1 4 5"), C("7sus", "1 4 5 b7"), C("9sus", "1 4 5 b7 9"), C("13sus", "1 4 5 b7 9 13"), C("7sus(♭9)", "1 4 5 b7 b9"), C("13sus(♭9)", "1 4 5 b7 b9 13")] },
    alt: { name: "Altered dominants (31.4.7)", ch: [C("7(♭5)", "1 3 b5 b7"), C("7(♯5)", "1 3 #5 b7"), C("7(♭9)", "1 3 5 b7 b9"), C("7(♯9)", "1 3 5 b7 #9"), C("7(♯9♭5)", "1 3 b5 b7 #9"),
      C("7(♯9♯5)", "1 3 #5 b7 #9"), C("7(♭9♯5)", "1 3 #5 b7 b9"), C("7(♭9♭5)", "1 3 b5 b7 b9")] },
    other: { name: "Other chords (31.4.8)", ch: [C("mΔ7", "1 b3 5 7"), C("mΔ9", "1 b3 5 7 9"), C("dim", "1 b3 b5"), C("°7", "1 b3 b5 bb7"), C("dim(Δ7)", "1 b3 b5 7"), C("7(♯11♯9)", "1 3 5 b7 #9 #11")] }
  };
  var GROUP_IDS = Object.keys(GROUPS), GROUP_NAMES = {};
  GROUP_IDS.forEach(function (g) { GROUP_NAMES[g] = GROUPS[g].name; });
  function semisOf(degs) { return degs.map(function (d) { return DEG[d][1]; }); }
  function setOf(semis) { var s = {}; semis.forEach(function (x) { s[pc(x)] = 1; }); return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }); }
  // spell the chord on a root, stacked in thirds as the book draws it
  function spellChord(root, degs) {
    var dom = degs.indexOf("b7") >= 0, out = [];
    for (var i = 0; i < degs.length; i++) {
      var d = degs[i], st = DEG[d][0], se = DEG[d][1];
      if (d === "#5" && dom) st = 5;           // ♯5 written as ♭6 beside the ♭7
      var n = above(root, st, se); if (!n) return null; out.push(n);
    }
    return out.sort(function (a, b) { return dia(a) - dia(b) || midi(a) - midi(b); });
  }
  var ROOTS = { natural: ["C", "D", "E", "F", "G", "A", "B"], all: ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"] };
  var ROOT_SET = { id: "roots", label: "Roots", type: "select", options: ["natural", "all"], names: { natural: "Naturals only", all: "All twelve (with ♭ and ♯)" }, def: "all" };
  function rootNote(t, oct) { var n = parseName(t); n.o = oct; return n; }

  // ---- reading a typed chord symbol, by the book's rules -> { root, set (half steps above the root, 0-11), fifth (has a 5th of any kind) } or null
  function parseJazz(t) {
    t = String(t || "").replace(/[\s(),]/g, "").replace(/♭/g, "b").replace(/♯/g, "#").replace(/Δ|\^|maj|Maj|ma(?=\d)/g, "M").replace(/Ø/g, "ø");
    var m = /^([A-G](?:##|bb|#|b)?)(.*)$/.exec(t); if (!m) return null;
    var root = parseName(m[1]), s = m[2]; if (!root) return null;
    var minor = false, maj7 = false, hdim = false, dim = false, aug = false, sus = false, six9 = false, ext = 0, adds = [], alts = {}, i = 0, start = true;
    while (i < s.length) {
      var r = s.slice(i), x;
      if (start && (x = /^(min|mi|m|-)(?!aj)/.exec(r))) { minor = true; i += x[0].length; start = false; continue; }
      start = false;
      if ((x = /^(ø|h)/.exec(r))) { hdim = true; i += x[0].length; continue; }
      if ((x = /^(°|o|dim)/.exec(r))) { dim = true; i += x[0].length; continue; }
      if ((x = /^(\+|aug)(?![59]|11|13)/.exec(r))) { aug = true; i += x[0].length; continue; }
      if ((x = /^M/.exec(r))) { maj7 = true; i += 1; continue; }
      if ((x = /^sus4?/.exec(r))) { sus = true; i += x[0].length; continue; }
      if ((x = /^add(9|2|11|4|13|6)/.exec(r))) { adds.push({ 9: 14, 2: 14, 11: 17, 4: 17, 13: 21, 6: 21 }[x[1]]); i += x[0].length; continue; }
      if ((x = /^(6\/9|69)/.exec(r)) && !ext) { six9 = true; ext = 6; i += x[0].length; continue; }
      if ((x = /^([b#+-])(13|11|9|5)/.exec(r))) { alts[(x[1] === "b" || x[1] === "-" ? "b" : "#") + x[2]] = 1; i += x[0].length; continue; }
      if ((x = /^(13|11|9|7|6)/.exec(r))) { if (!ext) ext = +x[1]; else adds.push({ 9: 14, 11: 17, 13: 21, 6: 21, 7: -1 }[x[1]]); i += x[0].length; continue; }
      if (/^alt/.test(r)) return null;          // "7alt" doesn't say which alterations (31.3)
      return null;
    }
    if (maj7 && !ext) ext = 7;
    if (hdim && !ext) ext = 7;
    var third = sus ? 5 : (minor || hdim || dim) ? 3 : 4, fifth = (hdim || dim) ? 6 : aug ? 8 : 7, set = [0, third];
    var seventh = null;
    if (ext >= 7) seventh = maj7 ? 11 : dim && !hdim ? 9 : 10;
    if (ext === 6) set.push(9);
    if (six9) set.push(14);
    if (seventh != null) set.push(seventh);
    var nine = ext >= 9 ? 14 : null, eleven = ext >= 11 && !sus ? 17 : null, thirteen = ext === 13 ? 21 : null;
    if (alts.b5) fifth = 6; if (alts["#5"]) fifth = 8;
    if (alts.b9 || alts["#9"]) { nine = null; if (alts.b9) set.push(13); if (alts["#9"]) set.push(15); }
    if (alts["#11"]) { eleven = null; set.push(18); }
    if (alts.b13) { thirteen = null; set.push(20); }
    if (alts.b11 || alts["#13"]) return null;
    [nine, eleven, thirteen].forEach(function (v) { if (v != null) set.push(v); });
    adds.forEach(function (a) { if (a === -1) seventh == null && set.push(maj7 ? 11 : 10); else if (a != null) set.push(a); });
    set.push(fifth);
    return { root: root, set: setOf(set) };
  }
  // a typed name fits the chord: the same root (spelled the same) and the same notes, or the same with a 5th the chord leaves out
  // (31.6). So on C E G♭ B♭, C7(♯11) counts as well as C7(♭5) (31.2)
  function nameFits(typed, root, set) {
    var p = parseJazz(typed); if (!p || !same(p.root, root)) return false;
    var a = p.set.join(), b = set.join();
    if (a === b) return true;
    if (set.indexOf(7) >= 0 || set.indexOf(8) >= 0) return false;   // a 5th or ♯5 is there: exact (♯5, not ♭13, 31.3)
    return p.set.filter(function (x) { return x !== 7; }).join() === b && p.set.indexOf(7) >= 0;
  }

  function makeChord(s) {
    var gs = s.groups.length ? s.groups : ["dom"];
    for (var tries = 0; tries < 60; tries++) {
      var g = pick(gs), c = pick(GROUPS[g].ch), rt = pick(ROOTS[s.roots] || ROOTS.all), r = rootNote(rt, 4);
      r.o = 3;   // the root in the bass staff, the rest above it (grand staff)
      var notes = spellChord(r, c.degs); if (!notes) continue;
      return { g: g, c: c, root: r, notes: notes, sym: name(r) + c.sym, set: setOf(semisOf(c.degs)) };
    }
    return null;
  }
  function chordAbc(notes) {   // a grand staff: notes below middle C in the bass clef
    function voice(ns) {
      if (!ns.length) return "z4";
      var seen = {}; ns.forEach(function (n) { (seen[n.l] = seen[n.l] || {})[n.a] = 1; });
      return "[" + ns.map(function (n) {
        var showNat = !n.a && Object.keys(seen[n.l]).length > 1, s = (n.a ? ACC_ABC[n.a] : showNat ? "=" : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
        for (var k = 5; k < n.o; k++) s += "'"; for (var j = 4; j > n.o; j--) s += ","; return s;
      }).join("") + "]4";
    }
    var lo = notes.filter(function (n) { return midi(n) < 60; }), hi = notes.filter(function (n) { return midi(n) >= 60; });
    return "X:1\nL:1/4\nM:4/4\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:C\n[V:1] " + voice(hi) + " |]\n[V:2] " + voice(lo) + " |]\n";
  }
  var CHORD_SET = [{ id: "groups", label: "Chords", type: "multi", options: GROUP_IDS, names: GROUP_NAMES, def: ["add", "dom", "maj", "min", "hdim", "sus"] }, ROOT_SET];

  EX.jzwrite = {
    title: "Write the jazz chord",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: CHORD_SET,
    make: function (s) {
      var c = makeChord(s); if (!c) return null;
      return { abc: null, words: true, show: c.sym, answer: c.notes.map(name).join(" "), root: c.root, set: c.set, play: [c.notes.map(midi)],
        label: "Write the notes of this chord, root first." };
    },
    check: function (q, typed) {
      var ns = parseNotes(typed); if (!ns || !same(ns[0], q.root)) return false;
      var r = NAT[q.root.l] + q.root.a, got = setOf(ns.map(function (n) { return NAT[n.l] + n.a - r; }));
      return got.join() === q.set.join();
    },
    explain: function (q) { return "Start with the root and every major or perfect note up to the highest number (3, 5, 7, 9, 11, 13), then apply what the symbol changes (31.5)."; },
    keyHelp: function () { return "Type the notes with spaces, root first (C9: C E G Bb D), then Enter. Any order after the root. ♯5 may be written as ♭6 and ♯9 as ♭10, as the book allows."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  EX.jzname = {
    title: "Name the jazz chord",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "m", "Δ", "ø", "°", "sus", "6", "7", "9", "11", "13", "(", ")", "add"],
    SETTINGS: CHORD_SET,
    make: function (s) {
      var c = makeChord(s); if (!c) return null;
      return { abc: chordAbc(c.notes), answer: c.sym, root: c.root, set: c.set, play: [c.notes.map(midi)], width: 170, label: "Name this chord with a jazz chord symbol." };
    },
    check: function (q, typed) { return nameFits(typed, q.root, q.set); },
    explain: function () { return "Compare with all the major and perfect notes up to the 13th: the 7th's quality first, then 9, 11, 13, then what is altered (31.6). 6 only without a 7th, sus only without a 3rd (31.2)."; },
    keyHelp: function () { return "Type the symbol, then Enter: Cm9, Bb13(#11), F7sus(b9), EbΔ9, D7(#9#5), Cm7(b5) or Cø7. Δ can be typed maj or ^; ♭ ♯ as b #. Parentheses are optional."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- scales (Table 31.9.4): scale degrees; the letter is the number, the half steps follow from the sign
  var SDEG = { "1": 0, "b2": 1, "2": 2, "#2": 3, "b3": 3, "3": 4, "b4": 4, "4": 5, "#4": 6, "b5": 6, "5": 7, "#5": 8, "b6": 8, "6": 9, "b7": 10, "7": 11 };
  function S(id, nm, grp, degs) { return { id: id, name: nm, grp: grp, degs: degs.split(" ") }; }
  var SCALES = [
    S("ionian", "Major (Ionian)", "classical", "1 2 3 4 5 6 7"), S("aeolian", "Natural minor (Aeolian)", "classical", "1 2 b3 4 5 b6 b7"),
    S("harmonic", "Harmonic minor", "classical", "1 2 b3 4 5 b6 7"), S("melodic", "Melodic minor (ascending)", "classical", "1 2 b3 4 5 6 7"),
    S("mixolydian", "Mixolydian", "modes", "1 2 3 4 5 6 b7"), S("lydian", "Lydian", "modes", "1 2 3 #4 5 6 7"), S("dorian", "Dorian", "modes", "1 2 b3 4 5 6 b7"),
    S("phrygian", "Phrygian", "modes", "1 b2 b3 4 5 b6 b7"), S("locrian", "Locrian", "modes", "1 b2 b3 4 b5 b6 b7"),
    S("locrian2", "Locrian ♯2", "mm", "1 2 b3 4 b5 b6 b7"), S("lyddom", "Lydian-Dominant", "mm", "1 2 3 #4 5 6 b7"),
    S("phrydor", "Phrygian-Dorian", "mm", "1 b2 b3 4 5 6 b7"), S("lydaug", "Lydian-Augmented", "mm", "1 2 3 #4 #5 6 7"),
    S("mixob6", "Mixolydian ♭6", "mm", "1 2 3 4 5 b6 b7"), S("altered", "Diminished-Whole Tone (Altered)", "mm", "1 b2 b3 b4 b5 b6 b7"),
    S("blues", "Blues", "jazz", "1 b3 4 b5 5 b7"), S("bebopdom", "Bebop Dominant", "jazz", "1 2 3 4 5 6 b7 7"), S("bebopmaj", "Bebop Major", "jazz", "1 2 3 4 5 #5 6 7"),
    S("whole", "Whole Tone", "jazz", "1 2 3 #4 #5 b7"), S("hw", "Octatonic (Half-Whole)", "jazz", "1 b2 b3 3 #4 5 6 b7"),
    S("wh", "Octatonic (Whole-Half)", "jazz", "1 2 b3 4 #4 #5 6 7"), S("hexatonic", "Hexatonic", "jazz", "1 b2 3 4 #5 6")
  ];
  var SC = {}; SCALES.forEach(function (x) { SC[x.id] = x; });
  var SGRP = { classical: "Classical scales", modes: "Modes", mm: "Modes of melodic minor", jazz: "Jazz and synthetic scales" };
  function spellScale(root, sc) {
    var out = sc.degs.map(function (d) { return above(root, +d.replace(/[b#]/g, "") - 1, SDEG[d]); });
    return out.every(Boolean) ? out.concat([{ l: root.l, a: root.a, o: root.o + 1 }]) : null;
  }
  function scaleAbc(notes) {
    var bar = {};
    return "X:1\nL:1/4\nK:C clef=treble\n" + notes.map(function (n) {
      var k = n.l + "," + n.o, acc = bar[k] === n.a ? "" : (n.a || bar[k] != null ? ACC_ABC[n.a] : ""); bar[k] = n.a;
      var s = acc + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]); for (var j = 4; j > n.o; j--) s += ","; for (var i = 5; i < n.o; i++) s += "'"; return s;
    }).join(" ") + " |]\n";
  }
  function makeScale(s, ids) {
    for (var tries = 0; tries < 60; tries++) {
      var sc = SC[pick(ids)], r = rootNote(pick(ROOTS[s.roots] || ROOTS.all), 4); if (r.l >= 5) r.o = 3;
      var ns = spellScale(r, sc); if (ns) return { sc: sc, root: r, notes: ns };
    }
    return null;
  }
  var SCALE_GRP = { id: "sgroups", label: "Scales", type: "multi", options: Object.keys(SGRP), names: SGRP, def: ["classical", "modes", "mm", "jazz"] };
  function scaleIds(s) { return SCALES.filter(function (x) { return s.sgroups.indexOf(x.grp) >= 0; }).map(function (x) { return x.id; }); }
  EX.jzscale = {
    title: "Name the scale",
    SETTINGS: [SCALE_GRP, ROOT_SET],
    make: function (s) {
      var ids = scaleIds(s); if (!ids.length) ids = ["ionian"];
      var x = makeScale(s, ids); if (!x) return null;
      return { abc: scaleAbc(x.notes), answer: x.sc.id, play: x.notes.map(midi), width: 330, label: "Which scale is this, from " + name(x.root) + "?" };
    },
    answers: function (s) { return scaleIds(s); },
    answerName: function (a) { return SC[a] ? SC[a].name : a; },
    buttonText: function (a) { return SC[a] ? SC[a].name : a; },
    explain: function (q) { return SC[q.answer].name + ": " + SC[q.answer].degs.join(" ").replace(/b/g, "♭").replace(/#/g, "♯") + "."; },
    keyHelp: function () { return "Click the scale's name. ▶ Hear it plays it again."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  EX.jzscalewrite = {
    title: "Write the scale",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: [SCALE_GRP, ROOT_SET],
    make: function (s) {
      var ids = scaleIds(s); if (!ids.length) ids = ["ionian"];
      var x = makeScale(s, ids); if (!x) return null;
      var up = x.notes.slice(0, -1);
      return { abc: null, words: true, show: name(x.root) + " " + x.sc.name, answer: up.map(name).join(" "), root: x.root,
        steps: up.map(function (n) { return pc(midi(n) - midi(x.root)); }), play: x.notes.map(midi), label: "Write the scale going up, without the top note." };
    },
    check: function (q, typed) {
      var ns = parseNotes(typed); if (!ns || !same(ns[0], q.root) || ns.length !== q.steps.length) return false;
      var r = NAT[q.root.l] + q.root.a;
      return ns.every(function (n, i) { return pc(NAT[n.l] + n.a - r) === q.steps[i]; });
    },
    explain: function (q) { return "From the table of scales (31.9): " + q.show + " is " + q.answer + "."; },
    keyHelp: function () { return "Type the notes going up with spaces, the first one the scale's name (D Dorian: D E F G A B C), then Enter. Synthetic scales may be respelled (the book allows it): what counts is the sound of each note above the first."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- chord-scale relationships (Table 31.10.3): which scale(s) for a chord
  var CS = [["Δ7", "1 3 5 7", ["ionian", "lydian"]], ["Δ7(♯11)", "1 3 5 7 #11", ["lydian"]], ["Δ7(♯5)", "1 3 #5 7", ["lydaug"]], ["m7", "1 b3 5 b7", ["dorian", "aeolian"]],
    ["ø7", "1 b3 b5 b7", ["locrian", "locrian2"]], ["ø9", "1 b3 b5 b7 9", ["locrian2"]], ["°7", "1 b3 b5 bb7", ["wh"]], ["mΔ7", "1 b3 5 7", ["melodic"]],
    ["m6/9", "1 b3 5 6 9", ["dorian", "melodic"]], ["7", "1 3 5 b7", ["mixolydian"]], ["7(♯11)", "1 3 5 b7 #11", ["lyddom"]], ["7(♯5)", "1 3 #5 b7", ["whole"]],
    ["7(♭5)", "1 3 b5 b7", ["whole"]], ["7(♭9)", "1 3 5 b7 b9", ["hw"]], ["7(♯9)", "1 3 5 b7 #9", ["hw"]], ["13(♯11♯9)", "1 3 5 b7 #9 #11 13", ["hw"]], ["7alt", "1 3 b7", ["altered"]]];
  var CS_ANS = ["ionian", "lydian", "lydaug", "dorian", "aeolian", "locrian", "locrian2", "melodic", "mixolydian", "lyddom", "whole", "hw", "wh", "altered"];
  EX.jzchordscale = {
    title: "Which scale fits the chord?",
    SETTINGS: [ROOT_SET],
    make: function (s) {
      var x = pick(CS), r = rootNote(pick(ROOTS[s.roots] || ROOTS.all), 4), ns = spellChord(r, x[1].split(" "));
      if (!ns) return null;
      return { abc: null, words: true, show: name(r) + x[0], answer: x[2][0], ok: x[2], play: [ns.map(midi)], label: "Which scale does the book pair with this chord?" };
    },
    answers: function () { return CS_ANS; },
    check: function (q, a) { return q.ok.indexOf(a) >= 0; },
    answerName: function (a) { return SC[a] ? SC[a].name : a; },
    buttonText: function (a) { return SC[a] ? SC[a].name : a; },
    explain: function (q) { return "Table 31.10.3: " + q.show + " → " + q.ok.map(function (a) { return SC[a].name; }).join(" or ") + ". Write the chord's notes as a scale and fill the gaps without augmented 2nds or two half steps in a row (31.10)."; },
    keyHelp: function () { return "Click a scale. Where the book lists two, either is right."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- guide tones (31.7): the 3rd and 7th
  var GT = [["Δ7", "1 3 5 7"], ["7", "1 3 5 b7"], ["m7", "1 b3 5 b7"], ["m7(♭5)", "1 b3 b5 b7"], ["mΔ7", "1 b3 5 7"]];
  EX.jzguide = {
    title: "Guide tones",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: [ROOT_SET],
    make: function (s) {
      var x = pick(GT), r = rootNote(pick(ROOTS[s.roots] || ROOTS.all), 3), ns = spellChord(r, x[1].split(" ")); if (!ns) return null;
      var g = [ns[1], ns[3]];
      return { abc: null, words: true, show: name(r) + x[0], answer: g.map(name).join(" "), want: g, play: [[midi(r)].concat(g.map(function (n) { return midi(n) + 12; }))],
        label: "Type the guide tones: the 3rd, then the 7th." };
    },
    check: function (q, typed) { var ns = parseNotes(typed); return !!ns && ns.length === 2 && same(ns[0], q.want[0]) && same(ns[1], q.want[1]); },
    keyHelp: function () { return "Two note names, the 3rd first (G7: B F), then Enter. Spelled as in the chord."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // ---- tritone substitution (31.8.2): the dominant 7th a tritone away has the same guide tones
  var TT_ROOTS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  EX.jztt = {
    title: "Tritone substitutes",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "7"],
    SETTINGS: [],
    make: function () {
      var i = rnd(12), r = parseName(TT_ROOTS[i]), sub = parseName(TT_ROOTS[(i + 6) % 12]); r.o = 3; sub.o = 3;
      var a = spellChord(r, ["1", "3", "5", "b7"]), b = spellChord(sub, ["1", "3", "5", "b7"]);
      return { abc: null, words: true, show: name(r) + "7", answer: name(sub) + "7", subPc: pc(midi(sub)), play: [a.map(midi), b.map(midi)],
        label: "What is its tritone substitute?" };
    },
    check: function (q, typed) {
      var p = parseJazz(typed); if (!p) return false;
      return pc(NAT[p.root.l] + p.root.a) === q.subPc && p.set.join() === "0,4,7,10";
    },
    explain: function (q) { return "A tritone away; its 3rd and 7th are the other chord's 7th and 3rd. Either spelling of the root counts (D♭7 or C♯7)."; },
    keyHelp: function () { return "A dominant 7th symbol (Db7), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  // ---- ii–V–I (31.8.1) in a key: type the three chords. Any of the usual qualities count: ii m7 / m9 / m11 (minor: m7(♭5) / ø, with 9 or 11),
  // V any dominant (7, 9, 13, altered), I Δ7 / Δ9 / 6 / 6/9 (minor: m6/9, m6, mΔ7, m7, m9)
  var MAJ_KEYS = ["C", "F", "B♭", "E♭", "A♭", "D♭", "G", "D", "A", "E", "B"], MIN_KEYS = ["C", "F", "G", "D", "A", "E", "B"];
  function fam(set, want) {
    var has = function (x) { return set.indexOf(x) >= 0; };
    if (want === "ii") return has(3) && has(10) && has(7) && !has(4);
    if (want === "iiø") return has(3) && has(10) && has(6) && !has(7) && !has(4);
    if (want === "V") return has(4) && has(10);
    if (want === "I") return has(4) && !has(10) && !has(3) && (has(11) || has(9));
    if (want === "i") return has(3) && !has(6) && !has(4);
    return false;
  }
  EX.jz251 = {
    title: "ii–V–I in a key",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "m", "Δ", "ø", "7", "9", "6/9"],
    SETTINGS: [{ id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" }],
    make: function (s) {
      var mode = s.mode === "both" ? pick(["major", "minor"]) : s.mode, k = parseName(pick(mode === "major" ? MAJ_KEYS : MIN_KEYS)); k.o = 3;
      var ii = above(k, 1, 2), V = above(k, 4, 7);
      var syms = mode === "major" ? [name(ii) + "m9", name(V) + "9(13)", name(k) + "Δ9"] : [name(ii) + "m7(♭5)", name(V) + "7(♭9)", name(k) + "m6/9"];
      var chords = mode === "major" ? [[ii, "1 b3 5 b7 9"], [V, "1 3 5 b7 9 13"], [k, "1 3 5 7 9"]] : [[ii, "1 b3 b5 b7"], [V, "1 3 5 b7 b9"], [k, "1 b3 5 6 9"]];
      return { abc: null, words: true, show: name(k) + " " + mode, answer: syms.join("  "), roots: [ii, V, k], fams: mode === "major" ? ["ii", "V", "I"] : ["iiø", "V", "i"],
        play: chords.map(function (c) { return spellChord(c[0], c[1].split(" ")).map(midi); }), label: "Type the ii–V–I in this key: three chord symbols." };
    },
    check: function (q, typed) {
      var parts = String(typed || "").trim().split(/[\s|]+/).filter(Boolean); if (parts.length !== 3) return false;
      return parts.every(function (t, i) { var p = parseJazz(t); return p && same(p.root, q.roots[i]) && fam(p.set, q.fams[i]); });
    },
    explain: function (q) { return "The book's versions: major Dm9 G9(13) CΔ9, minor Dm7(♭5) G7alt Cm6/9 (in C). Any m7-type ii, dominant V and tonic-type I counts here."; },
    keyHelp: function () { return "Three symbols with spaces (Dm7 G7 CΔ7, or Dm9 G13 Cmaj9), then Enter. In minor, ii is half-diminished (Dm7b5) and I is minor (Cm6/9)."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- hear the chord quality, in the book's "close" voicing: the root in the bass, the rest close together above it (31.7.2)
  var EAR = { "Δ7": "1 3 5 7", "7": "1 3 5 b7", "m7": "1 b3 5 b7", "m7(♭5)": "1 b3 b5 b7", "°7": "1 b3 b5 bb7", "mΔ7": "1 b3 5 7", "7sus": "1 4 5 b7",
    "Δ9": "1 3 5 7 9", "9": "1 3 5 b7 9", "m9": "1 b3 5 b7 9", "9(13)": "1 3 b7 9 13", "7(♭9)": "1 3 5 b7 b9", "7(♯9)": "1 3 5 b7 #9", "7(♯5)": "1 3 #5 b7" };
  var EAR_SETS = { basic: ["Δ7", "7", "m7", "m7(♭5)", "°7", "mΔ7"], ext: ["Δ9", "9", "m9", "9(13)", "7sus"], alt: ["7", "7(♭9)", "7(♯9)", "7(♯5)"] };
  var EAR_ID = {}; Object.keys(EAR).forEach(function (k, i) { EAR_ID["q" + i] = k; });
  function earId(sym) { for (var k in EAR_ID) if (EAR_ID[k] === sym) return k; return null; }
  EX.jzear = {
    title: "Hear the jazz chord",
    SETTINGS: [{ id: "set", label: "Chords", type: "select", options: ["basic", "ext", "alt"], names: { basic: "Seventh chords: Δ7 7 m7 ø7 °7 mΔ7", ext: "Ninths and sus: Δ9 9 m9 9(13) 7sus", alt: "Dominants: 7 7(♭9) 7(♯9) 7(♯5)" }, def: "basic" }],
    make: function (s) {
      var sym = pick(EAR_SETS[s.set] || EAR_SETS.basic), semis = EAR[sym].split(" ").map(function (d) { return DEG[d][1]; });
      var bass = 40 + rnd(12), up = semis.slice(1).map(function (x) { return pc(x); });
      if (up.length > 4) up = up.filter(function (x) { return x !== 7; });
      var sev = up.filter(function (x) { return x >= 9; })[0], first = sev != null && rnd(2) ? sev : up[0];   // the 3rd (or 4th) or the 7th lowest
      var lo = 52 + pc(bass + first - 52);
      var chord = [bass].concat(up.map(function (x) { return lo + pc(bass + x - lo); }).sort(function (a, b) { return a - b; }));
      return { abc: null, ear: true, sound: true, answer: earId(sym), play: [chord], durs: [2.2],
        label: "Which chord is it?" };
    },
    answers: function (s) { return (EAR_SETS[s.set] || EAR_SETS.basic).map(earId); },
    answerName: function (a) { return EAR_ID[a] || a; },
    buttonText: function (a) { return EAR_ID[a] || a; },
    explain: function (q) { return "Listen for the 3rd and 7th first (31.7): they decide major 7th, dominant, minor or diminished. Then the colour on top."; },
    keyHelp: function () { return "Click the chord's quality. Space plays it again."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  D.parseJazz = parseJazz; D.jazzNameFits = nameFits; D.JAZZ_GROUPS = GROUPS; D.JAZZ_SCALES = SCALES; D.JAZZ_CS = CS; D.JAZZ_EAR = EAR;
})(window);
