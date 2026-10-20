// mixture.js — mode mixture (Hutchinson, Music Theory for the 21st-Century Classroom, ch. 19): chords borrowed from the parallel
// minor in a major key. Adds Drills.engines.mix (name it on the staff), mixwrite (write the notes), mixsym (numeral <-> lead-sheet
// symbol), mixdc (by ear or eye: V–vi or V–♭VI, 19.4) and picardy (a minor phrase ending on i or on a major I, 19.5).
// Load after drills.js; drills.js builds its drills once the page has loaded, so these engines are there in time.
//
// The chords are the book's Figures 19.2.1 (♭6 as root, 3rd, 5th, 7th: ♭VI iv ii° iiø7 vii°7 ♭VII7) and 19.2.2 (♭3: ♭III i ♭VI;
// ♭7: ♭VII v ♭III), plus iv7 (not in those figures; on the page it is marked as the site's addition). Numerals as the book writes
// them (19.3): case and ° / ø give the quality, ♭ before the numeral lowers the root by a half step from the major key's degree
// (in A major, ♭VI is F–A–C). Inversions take the book's figures: 6, 64; 7, 65, 43, 42.
(function (global) {
  var D = global.Drills; if (!D) return;
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" }, ACC_TXT = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  // copied from drills.js (not exported there)
  function dia(n) { return n.o * 7 + n.l; }
  function fromDia(d, a) { return { l: ((d % 7) + 7) % 7, o: Math.floor(d / 7), a: a || 0 }; }
  function midi(n) { return 12 * (n.o + 1) + NAT[n.l] + n.a; }
  function name(n) { return LET[n.l] + ACC_TXT[n.a]; }
  function same(a, b) { return a && b && a.l === b.l && a.a === b.a; }
  function up(low, steps, semis) { var u = fromDia(dia(low) + steps, 0); u.a = midi(low) + semis - midi(u); return Math.abs(u.a) > 2 ? null : u; }
  // parseName and parseSymbol copied from drills.js (not exported there): a typed triad symbol -> { root, q, bass } or null
  function parseName(t) {
    var m = /^([A-Ga-g])(##|bb|x|𝄪|𝄫|#|b|♯|♭)?$/.exec(t); if (!m) return null;
    return { l: LET.indexOf(m[1].toUpperCase()), a: { "": 0, "#": 1, "♯": 1, "b": -1, "♭": -1, "##": 2, "x": 2, "𝄪": 2, "bb": -2, "𝄫": -2 }[m[2] || ""] };
  }
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
  function pcs(v) { return v.map(function (n) { return (midi(n) + 120) % 12; }); }
  var MAJ = { "-7": "C♭", "-6": "G♭", "-5": "D♭", "-4": "A♭", "-3": "E♭", "-2": "B♭", "-1": "F", "0": "C", "1": "G", "2": "D", "3": "A", "4": "E", "5": "B", "6": "F♯", "7": "C♯" };
  var MIN = { "-7": "A♭", "-6": "E♭", "-5": "B♭", "-4": "F", "-3": "C", "-2": "G", "-1": "D", "0": "A", "1": "E", "2": "B", "3": "F♯", "4": "C♯", "5": "G♯", "6": "D♯", "7": "A♯" };
  function key(mode, most) { var ks = []; for (var k = -most; k <= most; k++) ks.push(k); var k0 = pick(ks); return D.keyFrom((mode === "major" ? MAJ : MIN)[k0], mode); }

  // quality -> [diatonic steps, semitones] above the root
  var QI = { maj: [[2, 4], [4, 7]], min: [[2, 3], [4, 7]], dim: [[2, 3], [4, 6]], dom7: [[2, 4], [4, 7], [6, 10]], min7: [[2, 3], [4, 7], [6, 10]],
    hdim7: [[2, 3], [4, 6], [6, 10]], dim7: [[2, 3], [4, 6], [6, 9]] };
  var SYM = { maj: "", min: "m", dim: "°", dom7: "7", min7: "m7", hdim7: "ø7", dim7: "°7" };
  // the borrowed chords: id -> [degree, root lowered?, quality]. Spelled in the major key: the root is the major key's degree,
  // lowered a half step for ♭; the rest stacks by the quality, which gives ♭3 / ♭6 / ♭7 where the minor key has them.
  var CH = { "i": [1, 0, "min"], "ii°": [2, 0, "dim"], "iiø7": [2, 0, "hdim7"], "♭III": [3, 1, "maj"], "iv": [4, 0, "min"], "iv7": [4, 0, "min7"],
    "v": [5, 0, "min"], "♭VI": [6, 1, "maj"], "♭VII": [7, 1, "maj"], "♭VII7": [7, 1, "dom7"], "vii°7": [7, 0, "dim7"] };
  var ALL = Object.keys(CH);
  var FIG = { 3: ["", "6", "64"], 4: ["7", "65", "43", "42"] };
  function build(k, id, inv) {
    var c = CH[id], l = (k.tonic.l + c[0] - 1) % 7, root = { l: l, a: k.sig[l] - c[1], o: 4 }, ch = [root];
    if (Math.abs(root.a) > 1) return null;
    for (var i = 0; i < QI[c[2]].length; i++) { var n = up(root, QI[c[2]][i][0], QI[c[2]][i][1]); if (!n || Math.abs(n.a) > 1) return null; ch.push(n); }
    return { id: id, ch: ch, q: c[2], inv: inv, root: root, rn: id.replace(/7$/, "") + FIG[ch.length][inv], bass: ch[inv] };
  }
  function pickChord(s) {
    var ids = s.chords && s.chords.length ? s.chords : ALL;
    for (var t = 0; t < 200; t++) {
      var k = key("major", +s.most), id = pick(ids);
      var c = build(k, id, s.inv === "all" ? rnd(QI[CH[id][2]].length + 1) : 0); if (c) { c.key = k; return c; }
    }
    return null;
  }
  // a typed numeral -> normal form ("♭VI6", "iiø65", "vii°42"); b for ♭, o / dim for °, h / Ø for ø, 6/5 for 65. null when unreadable
  function normMix(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64").replace(/^b(?=[IV])/, "♭");
    var m = /^(♭)?(i{1,3}|iv|v|vi{1,2}|I{1,3}|IV|V|VI{1,2})(o|°|dim|ø|Ø|h)?(7)?(6|64|65|43|42|2)?$/.exec(t); if (!m) return null;
    var half = /^(ø|Ø|h)$/.test(m[3] || ""), dim = !!m[3] && !half, fig = m[5] === "2" ? "42" : m[5] || "";
    if (m[4] && fig) return null;   // 7 with a figure after it (the figure says seventh already)
    var sev = !!m[4] || /^(65|43|42)$/.test(fig);
    if (half && !sev) return null;
    return (m[1] || "") + m[2] + (half ? "ø" : dim ? "°" : "") + (m[4] ? "7" : fig);
  }
  function symOf(c) { return name(c.root) + SYM[c.q]; }
  function keyAbcNote(n, sig, len) {
    var s = (n.a !== sig[n.l] ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    for (var k = 5; k < n.o; k++) s += "'"; for (var j = 4; j > n.o; j--) s += ",";
    return s + (len || "");
  }
  function nextAbove(n, fromD) { var d = fromD; while (((d % 7) + 7) % 7 !== n.l) d++; return fromDia(d, n.a); }
  function voice(notes, inv, clef) {   // close position from the bass note upward, in the middle of the clef
    var base = clef === "bass" ? 2 * 7 + 3 : 4 * 7 - 1, out = [nextAbove(notes[inv], base)];
    for (var i = 1; i < notes.length; i++) out.push(nextAbove(notes[(inv + i) % notes.length], dia(out[i - 1]) + 1));
    return out;
  }
  // a bar's notes with the accidentals abcjs needs: a sign wherever the note differs from the signature, or its letter was altered
  // earlier in the bar (in any octave), so nothing relies on how far an accidental carries
  function barAbc(chords, sig, len) {
    var touched = {};
    return chords.map(function (v) {
      return "[" + v.map(function (n) {
        var s = (n.a !== sig[n.l] || touched[n.l] ? ACC_ABC[n.a] : "") + keyAbcNote(n, [n.a, n.a, n.a, n.a, n.a, n.a, n.a]);
        if (n.a !== sig[n.l]) touched[n.l] = true; return s;
      }).join("") + "]" + len;
    }).join(" ");
  }
  var CLEF_NAME = { treble: "Treble", bass: "Bass" };
  var SET = [
    { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4", "5", "6", "7"], def: "4" },
    { id: "chords", label: "Chords", type: "multi", options: ALL, def: ALL.slice() }
  ];
  var INV = { id: "inv", label: "Position", type: "select", options: ["root", "all"], names: { root: "Root position", all: "With inversions (6, 64, 65, 43, 42)" }, def: "root" };

  D.engines.mix = {
    title: "Name the borrowed chord",
    input: "text",
    palette: ["♭", "i", "ii", "iv", "v", "III", "VI", "VII", "vii", "°", "ø", "7", "6", "64", "65", "43", "42"],
    SETTINGS: SET.concat([INV, { id: "clef", label: "Clefs", type: "multi", options: ["treble", "bass"], names: CLEF_NAME, def: ["treble", "bass"] }]),
    make: function (s) {
      var c = pickChord(s); if (!c) return null;
      var clef = pick(s.clef.length ? s.clef : ["treble"]), v = voice(c.ch, c.inv, clef);
      return { abc: "X:1\nL:1/4\nK:" + c.key.abc + " clef=" + clef + "\n" + barAbc([v], c.key.sig, 4) + " |]\n", answer: c.rn, play: [v.map(midi)],
        pcs: pcs(v), bassPc: pcs(v)[0], chord: c, label: "Key: " + c.key.label + ". Name this borrowed chord with a Roman numeral" + (s.inv === "all" ? " and figure." : ".") };
    },
    check: function (q, typed) { return normMix(typed) === q.answer; },
    explain: function (q) { return "Stacked in thirds its root is " + name(q.chord.root) + "; its notes are " + q.chord.ch.map(name).join(" ") + "."; },
    keyHelp: function () { return "Type it, then Enter: iv, ♭VI (bVI works), ii°6 (o for °), iiø65 (h for ø), vii°42, ♭VII7. Figures as in the book: 6, 64; 7, 65, 43, 42."; },
    midiNeed: 3,
    midiMatch: function (q, notes) { return D.engines.triad.midiMatch(q, notes); }
  };
  D.engines.mixwrite = {
    title: "Write the borrowed chord",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "␣"],
    SETTINGS: SET.concat([INV]),
    make: function (s) {
      var c = pickChord(s); if (!c) return null;
      var order = c.ch.map(function (_, i) { return c.ch[(c.inv + i) % c.ch.length]; });
      return { answer: order.map(name).join(" "), want: order, show: c.key.label.split(" ")[0] + ": " + c.rn, abc: null, chord: c,
        play: [voice(c.ch, c.inv, "treble").map(midi)], label: "Write the notes of this chord in " + c.key.label + ", lowest first." };
    },
    check: function (q, typed) { return D.engines.spell.check(q, typed); },
    keyHelp: function () { return "Type the note names with spaces, lowest first (in A major, ♭VI is F A C), then Enter. # and b work for ♯ and ♭."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  D.engines.mixsym = {
    title: "Borrowed chords as chord symbols",
    input: "text",
    palette: ["C", "D", "E", "F", "G", "A", "B", "♯", "♭", "m", "°", "ø7", "°7", "7", "i", "ii", "iv", "v", "III", "VI", "VII", "vii"],
    SETTINGS: SET.concat([{ id: "dir", label: "Task", type: "select", options: ["find", "name", "both"], names: { find: "Roman numeral → chord symbol", name: "Chord symbol → Roman numeral", both: "Either" }, def: "find" }]),
    make: function (s) {
      var c = pickChord(Object.assign({}, s, { inv: "root" })); if (!c) return null;
      var dir = s.dir === "both" ? pick(["find", "name"]) : s.dir, k = c.key.label, sym = symOf(c), play = [voice(c.ch, 0, "treble").map(midi)];
      if (dir === "find") return { abc: null, words: true, show: "In " + k + ": " + c.rn, answer: sym, chord: c, play: play, label: "Which chord is it? Give the lead-sheet symbol." };
      return { abc: null, words: true, show: "In " + k + ": " + sym, answer: c.rn, rnq: true, chord: c, play: play, label: "Name this borrowed chord with a Roman numeral." };
    },
    check: function (q, typed) {
      if (q.rnq) return normMix(typed) === q.answer;
      var p = q.chord.ch.length === 4 ? D.parseSymbol7(typed) : parseSymbol(typed);
      return !!p && same(p.root, q.chord.root) && p.q === q.chord.q && !p.bass;
    },
    keyHelp: function () { return "A chord symbol (Fm, A♭, B♭7, Dø7, B°7: # and b work, o for °, m7b5 for ø7) or a Roman numeral (♭VI, iv, iiø7), then Enter."; },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  // ---- phrases for the ear drills: four chords, root in the bass, close triad above; one chord a bar
  function triadIn(k, deg, low, q) {   // degree of the key, lowered a half step when low, built as quality q
    var l = (k.tonic.l + deg - 1) % 7, root = { l: l, a: k.sig[l] - (low ? 1 : 0), o: 4 }, out = [root];
    QI[q].forEach(function (x) { out.push(up(root, x[0], x[1])); });
    return out;
  }
  function phrase(k, chords) {
    var top = [], bass = [], play = [];
    chords.forEach(function (c) {
      var v = voice(c, 0, "treble"), b = fromDia(2 * 7 + c[0].l + (c[0].l < 3 ? 7 : 0), c[0].a);
      top.push(barAbc([v], k.sig, 4)); bass.push(barAbc([[b]], k.sig, 4).replace(/^\[(.*)\]4$/, "$1") + "4");
      play.push([midi(b)].concat(v.map(midi)));
    });
    return { abc: "X:1\nL:1/4\nM:4/4\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + k.abc + "\n[V:1] " + top.join(" | ") + " |]\n[V:2] " + bass.join(" | ") + " |]\n", play: play };
  }
  var SHOW = { id: "show", label: "Show", type: "select", options: ["ear", "both", "staff"], names: { ear: "Sound only (the staff after you answer)", both: "Staff and sound", staff: "The staff" }, def: "ear" };
  var MOST = { id: "most", label: "Most sharps / flats in the key", type: "select", options: ["0", "1", "2", "3", "4"], def: "3" };
  var DC = { vi: "V–vi (deceptive)", bVI: "V–♭VI (deceptive, borrowed)" };
  D.engines.mixdc = {
    title: "Deceptive cadence: vi or ♭VI?",
    SETTINGS: [MOST, SHOW],
    make: function (s) {
      for (var t = 0; t < 50; t++) {
        var k = key("major", +s.most), ans = pick(["vi", "bVI"]), pre = pick([[4, 0, "maj"], [2, 0, "min"]]);
        var ch = [triadIn(k, 1, 0, "maj"), triadIn(k, pre[0], 0, pre[2]), triadIn(k, 5, 0, "maj"), ans === "vi" ? triadIn(k, 6, 0, "min") : triadIn(k, 6, 1, "maj")];
        if (ch.some(function (c) { return c.some(function (n) { return !n || Math.abs(n.a) > 1; }); })) continue;
        var w = phrase(k, ch), sx = 0.9;
        return { abc: w.abc, play: w.play, times: [0, sx, 2 * sx, 3 * sx], durs: [sx, sx, sx, 1.6], answer: ans, width: 420, ear: s.show === "ear", sound: s.show !== "staff",
          last: ch[3], key: k, rns: ["I", pre[0] === 4 ? "IV" : "ii", "V", ans === "vi" ? "vi" : "♭VI"], label: "Key: " + k.label + ". The phrase ends V and then which chord?" };
      }
      return null;
    },
    answers: function () { return ["vi", "bVI"]; },
    answerName: function (a) { return DC[a] || a; },
    buttonText: function (a) { return DC[a]; },
    explain: function (q) { return "The last chord is " + q.last.map(name).join(" ") + (q.answer === "vi" ? ", minor, in the key." : ", major, on the lowered 6th degree."); },
    keyHelp: function () { return "Keys: v for vi, b for ♭VI."; },
    letterKeys: { v: "vi", b: "bVI" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  var PIC = { i: "Minor tonic (i)", I: "Picardy third (major I)" };
  D.engines.picardy = {
    title: "Picardy third?",
    SETTINGS: [MOST, SHOW],
    make: function (s) {
      for (var t = 0; t < 50; t++) {
        var k = key("minor", +s.most), ans = pick(["i", "I"]), pre = pick([[4, "min"], [6, "maj"]]);
        var ch = [triadIn(k, 1, 0, "min"), triadIn(k, pre[0], 0, pre[1]), triadIn(k, 5, 0, "maj"), triadIn(k, 1, 0, ans === "i" ? "min" : "maj")];
        if (ch.some(function (c) { return c.some(function (n) { return !n || Math.abs(n.a) > 1; }); })) continue;
        var w = phrase(k, ch), sx = 0.9;
        return { abc: w.abc, play: w.play, times: [0, sx, 2 * sx, 3 * sx], durs: [sx, sx, sx, 1.6], answer: ans, width: 420, ear: s.show === "ear", sound: s.show !== "staff",
          last: ch[3], key: k, rns: ["i", pre[0] === 4 ? "iv" : "VI", "V", ans], label: "Key: " + k.label + ". Does it end on a minor or a major tonic?" };
      }
      return null;
    },
    answers: function () { return ["i", "I"]; },
    answerName: function (a) { return PIC[a] || a; },
    buttonText: function (a) { return PIC[a]; },
    explain: function (q) { return "The last chord is " + q.last.map(name).join(" ") + (q.answer === "I" ? ": a major 3rd above the tonic." : ": a minor 3rd above the tonic."); },
    keyHelp: function () { return "Keys: n for minor (i), j for major (I)."; },
    letterKeys: { n: "i", j: "I" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  D.normMix = normMix; D.MIX_CHORDS = CH; D.mixBuild = build;   // for tests
})(window);
