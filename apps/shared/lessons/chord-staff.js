// chord-staff.js — a chord chart written on a grand staff (LessonChordStaff), for the lessons on chord changes.
// The chords are block chords in the treble clef (close position, root at or above middle C) with the chord symbol over
// them, and the bass note (the root, or the note after the slash) in the bass clef. Notes are spelled from the chord's
// own letters (a third is two letters above the root), so G7 is G B D F and F#dim is F# A C, in any key.
//
//   var s = LessonChordStaff.create(host, { bars: ["C", "Am:2 Gm7 C7"], tonic: 0, minor: false, transpose: 0, flats: true })
//        bars       one string per bar: chords separated by spaces, "C:2" = two beats, chords without a length share the rest
//                   (the bar is four beats), the same notation the lessons' charts use. Written in the key `tonic` (a pitch class).
//        transpose  semitones added to everything (the key menu); flats  spell the new key with flats (default) or sharps
//   s.set(bars)                    new chords          s.rekey(transpose, flats)   a new key
//   s.light(i)                     light bar i (-1 = none); the band's player calls it as each bar sounds
//
// Needs abcjs, LessonScore (score.js) and BandHarmony (band/harmony.js).
(function (global) {
  var FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var LETTERS = "CDEFGAB", NATPC = [0, 2, 4, 5, 7, 9, 11];
  var MAJOR_KEY = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];                     // the key signature written for each tonic
  var MINOR_KEY = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
  var SIG = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5, 6: -6 };           // sharps (+) or flats (-) of the major key on that pitch class
  var SHARPS = "FCGDAEB", FLATS = "BEADGCF";
  function mod(n, m) { return ((n % m) + m) % m; }

  // [{ chord: "Bm7", beats: 1 }, ...] for one bar
  function splitBar(b) {
    var cs = String(b).trim().split(/\s+/), fixed = 0, free = 0;
    cs.forEach(function (c) { var m = /:(\d)$/.exec(c); if (m) fixed += +m[1]; else free++; });
    var each = free ? (4 - fixed) / free : 0;
    return cs.map(function (c) { var m = /^(.*):(\d)$/.exec(c); return { chord: m ? m[1] : c, beats: m ? +m[2] : each }; });
  }

  function spell(pc, flats) { return (flats ? FLAT : SHARP)[mod(pc, 12)]; }
  function nameOf(sym, t, flats) {                                    // the symbol, moved by t semitones: { name, suffix, bass }
    var m = /^([A-G])([#b♯♭]*)(.*?)(?:\/([A-G])([#b♯♭]*))?$/.exec(sym);
    if (!m) return null;
    function pcOf(l, a) { return NATPC[LETTERS.indexOf(l)] + (a.match(/[#♯]/g) || []).length - (a.match(/[b♭]/g) || []).length; }
    function moved(l, a) { return mod(t, 12) === 0 ? l + a.replace("♯", "#").replace("♭", "b") : spell(pcOf(l, a) + t, flats); }       // not moved: as written (F#dim stays F#dim)
    return { name: moved(m[1], m[2]), suffix: m[3], bass: m[4] ? moved(m[4], m[5] || "") : null };
  }

  // a note, written: name = "Eb", midi = its pitch; the key signature and the accidentals earlier in the bar decide what is drawn
  function abcNote(letter, acc, octave, state) {
    var key = letter + octave, want = acc, have = state.hasOwnProperty(key) ? state[key] : state.sig[letter] || 0, pre = "";
    if (have !== want) { pre = want === 0 ? "=" : want === 1 ? "^" : want === -1 ? "_" : want === 2 ? "^^" : "__"; state[key] = want; }
    var s = octave >= 5 ? letter.toLowerCase() : letter;
    for (var o = 6; o <= octave; o++) s += "'";
    for (var o2 = 3; o2 >= octave; o2--) s += ",";
    return pre + s;
  }
  // one chord tone: the letter `off` steps above the root's, `semis` above its pitch; the root is at midi `rootMidi`
  function tone(root, rootMidi, off, semis, state) {
    var li = mod(LETTERS.indexOf(root.letter) + off, 7), m = rootMidi + semis, nat = NATPC[li];
    var acc = mod(m - nat + 6, 12) - 6, n = m - acc, octave = Math.floor(n / 12) - 1;
    return { midi: m, abc: abcNote(LETTERS[li], acc, octave, state) };
  }
  function rootOf(name) { var m = /^([A-G])(#|b)?$/.exec(name); return { letter: m[1], midi: 0, acc: m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0 }; }

  function build(sym, t, flats, H, state) {                           // { top: "[C E G]", bass: "C,," } for one chord (no length)
    var nm = nameOf(sym, t, flats), c = H.parseChord(sym, 0);
    if (!nm || !c || c.nc || c.unknown) return null;
    var r = rootOf(nm.name), rpc = mod(NATPC[LETTERS.indexOf(r.letter)] + r.acc, 12);
    var rootMidi = 57 + mod(rpc - 9, 12);                                // the root, A3 to Ab4: the chord sits around middle C
    // [letter steps, semitones] of each tone, from the root
    var ts = [[0, 0]];
    if (c.third != null) ts.push([2, c.third]); else if (c.sus) ts.push(c.sus === 2 ? [1, 2] : [3, 5]);
    ts.push([4, c.fifth]);
    if (c.seventh != null) ts.push([6, c.seventh]); else if (c.sixth != null) ts.push([5, c.sixth]);
    if (c.add9 || c.ext === 9 || c.ext === 13) ts.push([8, c.b9 ? 13 : 14]);
    var top = ts.map(function (x) { return tone(r, rootMidi, x[0], x[1], state); });
    // the bass: the root (or the note after the slash), E2 to Eb3
    var bn = nm.bass ? rootOf(nm.bass) : r, bpc = mod(NATPC[LETTERS.indexOf(bn.letter)] + bn.acc, 12), bm = 40 + mod(bpc - 4, 12);
    var bacc = bn.acc, bnote = abcNote(bn.letter, bacc, Math.floor((bm - bacc) / 12) - 1, state.bass);
    return { top: top.map(function (x) { return x.abc; }), bass: bnote, name: nm.name + nm.suffix + (nm.bass ? "/" + nm.bass : "") };
  }

  function sigState(tonic, minor, t) {
    var maj = mod(tonic + t + (minor ? 3 : 0), 12), n = SIG[maj], sig = {}, i;
    for (i = 0; i < Math.abs(n); i++) sig[(n > 0 ? SHARPS : FLATS)[i]] = n > 0 ? 1 : -1;
    return sig;
  }
  function len(beats) { return beats === 1 ? "" : String(beats); }

  function abcOf(bars, o) {
    var H = global.BandHarmony, t = mod(o.transpose || 0, 12), flats = o.flats !== false;
    var tonic = mod(o.tonic + t, 12), key = (o.minor ? MINOR_KEY : MAJOR_KEY)[tonic];
    var sig = sigState(o.tonic, o.minor, t), rows = [], upper = [], lower = [];
    bars.forEach(function (b, i) {
      var st = { sig: sig, bass: { sig: sig } }, st2 = st.bass, hi = [], lo = [];
      splitBar(b).forEach(function (x) {
        var ch = build(x.chord, t, flats, H, st);
        if (!ch) { hi.push('z' + len(x.beats)); lo.push('z' + len(x.beats)); return; }
        hi.push('"' + ch.name + '"[' + ch.top.join("") + ']' + len(x.beats)); lo.push(ch.bass + len(x.beats));
      });
      upper.push(hi.join(" ")); lower.push(lo.join(" "));
      if (i % 4 === 3 || i === bars.length - 1) {
        rows.push("[V:1] " + upper.join(" | ") + (i === bars.length - 1 ? " |]" : " |"), "[V:2] " + lower.join(" | ") + (i === bars.length - 1 ? " |]" : " |"));
        upper = []; lower = [];
      }
    });
    return "X:1\nM:4/4\nL:1/4\n%%staves {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + key + "\n" + rows.join("\n");
  }

  function create(host, o) {
    var s = { bars: o.bars, o: { tonic: o.tonic || 0, minor: !!o.minor, transpose: o.transpose || 0, flats: o.flats !== false }, score: null, host: host, live: -1 };
    function draw() {
      s.score = global.LessonScore ? global.LessonScore.engrave(host, abcOf(s.bars, s.o), { width: 680, fluid: true }) : null;
      if (s.live >= 0) s.light(s.live);
    }
    s.set = function (bars) { s.bars = bars; draw(); };
    s.rekey = function (t, flats) { s.o.transpose = t; s.o.flats = flats !== false; draw(); };
    s.light = function (i) { s.live = i; if (s.score) { if (i < 0) s.score.clear(); else s.score.markMeasure(i); } };
    s.abc = function () { return abcOf(s.bars, s.o); };
    draw(); return s;
  }

  global.LessonChordStaff = { create: create, abc: abcOf, splitBar: splitBar };
})(typeof window !== "undefined" ? window : globalThis);
