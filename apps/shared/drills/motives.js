// motives.js — motivic alteration (Hutchinson, Music Theory for the 21st-Century Classroom, ch. 11.2): a short motive in bar 1,
// a changed copy of it in bar 2, and the student names the change. Adds Drills.engines.motive; load it after drills.js
// (drills.js builds its drills when the page has loaded, so the engine is there in time).
//
// The book's seven alterations: inversion (tonal, mirrored by scale steps), intervallic change (same rhythm, some intervals
// different), augmentation / diminution (every duration doubled / halved), rhythmic change (same notes, some durations
// different), ornamentation (notes added between the motive's notes, its length kept), extension (notes added at the end),
// retrograde (the notes in reverse order). A plain transposition (sequence) is not an alteration in the book (11.2.7), so it
// is offered as its own answer. Inversion, augmentation and diminution may also be transposed; the others start on the
// motive's first note (retrograde: its last), so the change is the only difference.
//
// A motive: degrees d[] (scale steps from the tonic, 0 = tonic) and durations r[] in sixteenths, 8 in all (half a bar of 4/4).
(function (global) {
  var D = global.Drills; if (!D) return;
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  var NAMES = { INV: "Inversion", INT: "Intervallic change", AUG: "Augmentation", DIM: "Diminution", RHY: "Rhythmic change",
    ORN: "Ornamentation", EXT: "Extension", RET: "Retrograde", SEQ: "Sequence (transposed only)" };
  var ALL = ["INV", "INT", "AUG", "DIM", "RHY", "ORN", "EXT", "RET", "SEQ"];
  // rhythms of half a bar, in sixteenths
  var CELLS = [[2, 2, 4], [2, 2, 2, 2], [3, 1, 4], [4, 2, 2], [1, 1, 2, 4], [2, 1, 1, 4], [2, 2, 2, 1, 1], [3, 1, 2, 2], [4, 4], [2, 6], [6, 2],
    [1, 1, 1, 1, 4], [2, 2, 1, 1, 2], [4, 1, 1, 2]];
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var KEYS = { major: ["C", "G", "F", "D", "B♭", "A", "E♭"], minor: ["A", "E", "D", "G", "C", "B"] };

  function same(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }
  function steps(d) { return d.slice(1).map(function (x, i) { return x - d[i]; }); }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }

  function motive() {
    for (var t = 0; t < 200; t++) {
      var r = pick(CELLS).slice(), d = [pick([0, 2, 4, 7])];
      for (var i = 1; i < r.length; i++) d.push(d[i - 1] + pick([1, -1, 1, -1, 2, -2, 3, -3, 4, -4, 0]));
      var st = steps(d);
      if (r.length < 3 && Math.abs(st[0]) < 2) continue;                       // two notes: a leap, so it is a motive at all
      if (st.every(function (x) { return x === 0; })) continue;
      if (st.filter(function (x) { return x === 0; }).length > 1) continue;
      if (Math.max.apply(null, d) - Math.min.apply(null, d) > 7) continue;
      return { d: d, r: r };
    }
    return { d: [0, 2, 4, 2], r: [2, 2, 2, 2] };
  }
  // the change; null when this motive can't take it cleanly (the caller tries again)
  function alter(m, type) {
    var d = m.d, r = m.r, n = d.length, k = pick([1, -1, 2, -2, 3, -3, 4, -4]), tr = rnd(2) ? 0 : k;
    var lastOrig = [d.slice(), r.slice()];
    if (type === "SEQ") return { d: d.map(function (x) { return x + k; }), r: r.slice(), how: "every note moved " + Math.abs(k) + " step" + (Math.abs(k) > 1 ? "s" : "") + " " + (k > 0 ? "up" : "down") + ", the rhythm the same" };
    if (type === "INV") {
      if (steps(d).every(function (x) { return x === 0; })) return null;
      var a0 = d[0] + tr;
      return { d: d.map(function (x) { return a0 - (x - d[0]); }), r: r.slice(), how: "every step that went up now goes down by the same number of scale steps, and the other way round" };
    }
    if (type === "RET") {
      var rd = d.slice().reverse(), rr = r.slice().reverse();
      if (isTrans(rd, d) || isInv(rd, d)) return null;
      return { d: rd, r: rr, how: "the same notes from last to first" };
    }
    if (type === "AUG") return { d: d.map(function (x) { return x + tr; }), r: r.map(function (x) { return 2 * x; }), how: "every note twice as long" };
    if (type === "DIM") {
      if (r.some(function (x) { return x % 2; })) return null;
      return { d: d.map(function (x) { return x + tr; }), r: r.map(function (x) { return x / 2; }), how: "every note half as long" };
    }
    if (type === "RHY") {
      var others = CELLS.filter(function (c) { return c.length === n && !same(c, r); });
      if (!others.length) return null;
      return { d: d.slice(), r: pick(others).slice(), how: "the same notes in a different rhythm" };
    }
    if (type === "INT") {
      if (n < 3) return null;
      for (var t = 0; t < 30; t++) {
        var nd = d.slice(), j = 1 + rnd(n - 1);
        nd[j] += pick([1, -1, 2, -2]);
        if (rnd(3) === 0 && n > 3) { var j2 = 1 + rnd(n - 1); if (j2 !== j) nd[j2] += pick([1, -1]); }
        if (same(nd, d) || isTrans(nd, d) || isInv(nd, d)) continue;
        var ch = steps(nd).filter(function (x, i) { return x !== steps(d)[i]; }).length;
        if (ch > 2 || ch === steps(d).length) continue;                         // some intervals, not all
        return { d: nd, r: r.slice(), how: "the same rhythm, but " + ch + " of the intervals different" };
      }
      return null;
    }
    if (type === "ORN") {
      // fill a leap of a 3rd with a passing tone, or turn a long note into note–neighbour–note; the length stays the same
      var od = [], or = [], done = false;
      for (var i = 0; i < n; i++) {
        var gap = i < n - 1 ? d[i + 1] - d[i] : 0;
        if (!done && Math.abs(gap) === 2 && r[i] >= 2) { od.push(d[i], d[i] + gap / 2); or.push(r[i] / 2, r[i] / 2); done = "a passing tone"; continue; }
        if (!done && r[i] >= 4 && i < n - 1) { od.push(d[i], d[i] + pick([1, -1]), d[i]); or.push(r[i] / 2, r[i] / 4, r[i] / 4); done = "a neighbor tone"; continue; }
        od.push(d[i]); or.push(r[i]);
      }
      if (!done) return null;
      return { d: od, r: or, how: done + " added between the motive's notes; it takes no longer" };
    }
    if (type === "EXT") {
      var ed = d.slice(), er = r.slice(), add = pick([[2, 2], [2, 2, 4], [4, 4], [2, 6], [4, 2, 2]]);
      add.forEach(function (x) { ed.push(ed[ed.length - 1] + pick([1, -1, 1, -1, 2, -2])); er.push(x); });
      return { d: ed, r: er, how: "the motive whole, then " + add.length + " more notes" };
    }
    return null;
  }
  // every alteration this pair fits; a question is asked only when it fits exactly one
  function fits(m, x) {
    var out = [], n = m.d.length, sr = same(x.r, m.r), sub = function () { var j = 0; x.d.forEach(function (v) { if (j < n && v === m.d[j]) j++; }); return j === n; };
    if (sr && isTrans(x.d, m.d) && x.d[0] !== m.d[0]) out.push("SEQ");
    if (sr && isInv(x.d, m.d)) out.push("INV");
    if (same(x.d, m.d.slice().reverse()) && same(x.r, m.r.slice().reverse())) out.push("RET");
    if (isTrans(x.d, m.d) && same(x.r, m.r.map(function (v) { return 2 * v; }))) out.push("AUG");
    if (isTrans(x.d, m.d) && same(x.r, m.r.map(function (v) { return v / 2; }))) out.push("DIM");
    if (same(x.d, m.d) && !sr && x.r.length === n && sum(x.r) === sum(m.r)) out.push("RHY");
    if (sr && x.d[0] === m.d[0] && !isTrans(x.d, m.d) && !isInv(x.d, m.d)) out.push("INT");
    if (x.d.length > n && sum(x.r) === sum(m.r) && sub()) out.push("ORN");
    if (x.d.length > n && same(x.d.slice(0, n), m.d) && same(x.r.slice(0, n), m.r)) out.push("EXT");
    return out;
  }
  function isTrans(a, b) { return a.length === b.length && same(steps(a), steps(b)); }
  function isInv(a, b) { return a.length === b.length && same(steps(a), steps(b).map(function (x) { return -x; })); }

  // notes of the key
  function keyOf(tonic, mode) { var k = D.keyFrom(tonic, mode); return k; }
  function noteOf(key, deg, base) {   // base: the diatonic number (octave*7 + letter) of the tonic
    var dn = base + deg, l = ((dn % 7) + 7) % 7, o = Math.floor(dn / 7), a = key.sig[l];
    return { l: l, o: o, a: a, midi: 12 * (o + 1) + NAT[l] + a };
  }
  function abcOf(n, len) {
    var s = n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l];
    for (var k = 5; k < n.o; k++) s += "'"; for (var j = 4; j > n.o; j--) s += ",";
    return s + (len === 1 ? "" : len);
  }
  // a bar of 16 sixteenths: the notes, then rests to fill it
  function bar(notes, lens) {
    var out = notes.map(function (n, i) { return abcOf(n, lens[i]); }), left = 16 - sum(lens);
    while (left > 0) { var z = left >= 8 ? 8 : left >= 4 ? 4 : left >= 2 ? 2 : 1; out.push("z" + (z === 1 ? "" : z)); left -= z; }
    return out.join(" ");
  }

  var engine = {
    title: "Motivic alteration",
    SETTINGS: [
      { id: "types", label: "Alterations", type: "multi", options: ALL, names: NAMES, def: ALL.slice() },
      { id: "mode", label: "Keys", type: "select", options: ["major", "minor", "both"], names: { major: "Major", minor: "Minor", both: "Major and minor" }, def: "major" },
      { id: "show", label: "Show", type: "select", options: ["both", "staff", "ear"], names: { both: "Staff, and play it", staff: "Staff only", ear: "By ear only (the staff after you answer)" }, def: "both" }
    ],
    make: function (s) {
      var types = s.types.length ? s.types : ALL;
      for (var t = 0; t < 300; t++) {
        var type = pick(types), m = motive(), alt = alter(m, type); if (!alt) continue;
        var f = fits(m, alt); if (f.length !== 1 || f[0] !== type) continue;
        if (sum(alt.r) > 16 || alt.r.some(function (x) { return x !== Math.floor(x) || x < 1; })) continue;
        var mode = s.mode === "both" ? pick(["major", "minor"]) : s.mode, tonic = pick(KEYS[mode]), key = keyOf(tonic, mode); if (!key) continue;
        var lo = Math.min.apply(null, m.d.concat(alt.d)), hi = Math.max.apply(null, m.d.concat(alt.d));
        var base0 = 4 * 7 + key.tonic.l, base = base0;
        while (base + lo < 4 * 7 + 1) base += 7;                                   // keep it on the treble staff: D4 up to about A5
        while (base + hi > 5 * 7 + 5) base -= 7;
        if (base + lo < 4 * 7) continue;                                       // nothing below middle C
        var a = m.d.map(function (x) { return noteOf(key, x, base); }), b = alt.d.map(function (x) { return noteOf(key, x, base); });
        var abc = "X:1\nM:4/4\nL:1/16\nK:" + key.abc + "\n" + bar(a, m.r) + " | " + bar(b, alt.r) + " |]\n";
        var sx = 60 / 84 / 4, play = [], times = [], durs = [], at = 0;
        a.forEach(function (n, i) { play.push(n.midi); times.push(at * sx); durs.push(m.r[i] * sx * 0.95); at += m.r[i]; });
        at = 16;
        b.forEach(function (n, i) { play.push(n.midi); times.push(at * sx); durs.push(alt.r[i] * sx * 0.95); at += alt.r[i]; });
        return { abc: abc, answer: type, how: alt.how, play: play, times: times, durs: durs, width: 420, sound: s.show !== "staff", ear: s.show === "ear",
          motive: { d: m.d, r: m.r }, altered: { d: alt.d, r: alt.r },
          label: "Bar 1 is the motive. How is it changed in bar 2? (" + key.label + ")" };
      }
      return null;
    },
    answers: function (s) { return s.types.length ? s.types : ALL; },
    answerName: function (a) { return NAMES[a] || a; },
    buttonText: function (a) { return NAMES[a]; },
    explain: function (q) { return "Bar 2 has " + q.how + "."; },
    keyHelp: function () { return "Keys: i inversion, c intervallic change, a augmentation, d diminution, r rhythmic change, o ornamentation, x extension, g retrograde, s sequence."; },
    letterKeys: { i: "INV", c: "INT", a: "AUG", d: "DIM", r: "RHY", o: "ORN", x: "EXT", g: "RET", s: "SEQ" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  D.engines.motive = engine;
  D.motiveAlter = alter; D.motiveFits = fits; D.motiveMake = motive;   // for tests
})(window);
