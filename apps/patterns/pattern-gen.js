// pattern-gen.js — makes a tonal pattern set from a list of chords, in the style of the hand-written sets in pattern-set.js.
//
// What the hand-written sets do, and so what this does:
//   - every note is a tone of the pattern's chord, written as a zero-length note ("D0") with the chord symbol above;
//   - "322a"/"322b": 16 patterns, the 3-note ones first, then the 2-note ones. "323"/"324": 12 patterns of 2 to 5 notes, mixed;
//   - the first pattern is the first chord (the tonic) starting on the tonic; the last is the tonic chord ending on the tonic;
//   - the chords move as a progression: tonic -> predominant -> dominant -> tonic, a secondary chord to its target (V7/V -> V);
//     style "rock" (on by itself with ♭VII ♭III ♭VI in major, or mixolydian) adds IV -> I, V -> IV, ♭VII -> IV -> I;
//   - each pattern joins the one before by the same note or a step, and across a chord change a 7th falls by step and a leading
//     tone rises a half step; the next pattern is often the last one's shape upside down (an answer);
//   - no note straight after itself, no leap over a minor 6th, tritone leaps avoided, a pattern spans an octave at most, and notes stay near the tonic
//     (a 4th below to a 9th above in the written sets);
//   - shapes vary: arpeggios up and down, a note and back ("La Do La"), turns ("Mi Re Ti"); patterns start on different notes;
//   - each chord's own colour shows up: the leading tone and the 7th of a dominant, the 3rd of any chord;
//   - movable Do with the mode's own starting syllable: minor is La-based, dorian Re-based, mixolydian So-based;
//     raised notes are Di Ri Fi Si Li, lowered ones Ra Me Se Le Te.
//
//   TonalPatternGen.generate({ chords: "i7, V7, iiø7", mode: "minor", sizes: [2, 3], count: 16, order: "blocks" | "mixed",
//                               tonic: "C", seed: 1, low: -5, high: 14, style: "auto" | "classical" | "rock" })
//     -> { abc, patterns: [{ chord, sym, notes: [{ abc, midi, solfege }], solfege }], key }
//   chords: Roman numerals (I ii iii IV V vi vii°, ♭VII, V7, ii7, iiø7, vii°7, Imaj7, V7/V, vii°7/V, IV/IV) or chord symbols (Dm, A7, Bbmaj7).
//   low / high: the range in semitones from the tonic (tonic written in the middle-C octave). Patterns are written with tonic C
//   by default, as the page's Key menu expects. Throws an Error with a readable message for a chord it can't read.
(function (global) {
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], MAJ = NAT;
  var MODES = {   // semitones of each degree, and the mode's place in its parent major scale (for solfège)
    major: { s: [0, 2, 4, 5, 7, 9, 11], deg: 0, k: "" }, minor: { s: [0, 2, 3, 5, 7, 8, 10], deg: 5, k: "m" },
    dorian: { s: [0, 2, 3, 5, 7, 9, 10], deg: 1, k: "dor" }, phrygian: { s: [0, 1, 3, 5, 7, 8, 10], deg: 2, k: "phr" },
    lydian: { s: [0, 2, 4, 6, 7, 9, 11], deg: 3, k: "lyd" }, mixolydian: { s: [0, 2, 4, 5, 7, 9, 10], deg: 4, k: "mix" },
    locrian: { s: [0, 1, 3, 5, 6, 8, 10], deg: 6, k: "loc" } };
  var SOLF = { 0: ["Do"], 1: ["Di", "Ra"], 2: ["Re"], 3: ["Ri", "Me"], 4: ["Mi"], 5: ["Fa"], 6: ["Fi", "Se"], 7: ["So"], 8: ["Si", "Le"], 9: ["La"], 10: ["Li", "Te"], 11: ["Ti"] };
  var Q = { M: [[2, 4], [4, 7]], m: [[2, 3], [4, 7]], d: [[2, 3], [4, 6]], A: [[2, 4], [4, 8]], dom7: [[2, 4], [4, 7], [6, 10]],
    m7: [[2, 3], [4, 7], [6, 10]], hd: [[2, 3], [4, 6], [6, 10]], d7: [[2, 3], [4, 6], [6, 9]], M7: [[2, 4], [4, 7], [6, 11]], mM7: [[2, 3], [4, 7], [6, 11]] };
  var QSYM = { M: "", m: "m", d: "dim", A: "aug", dom7: "7", m7: "m7", hd: "m7b5", d7: "dim7", M7: "maj7", mM7: "m(maj7)" };
  var DEG = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

  function pc(m) { return ((m % 12) + 12) % 12; }
  function npc(n) { return pc(NAT[n.l] + n.a); }
  function above(n, steps, semis) {   // the note `steps` letters and `semis` semitones above n, spelled
    var l = ((n.l + steps) % 7 + 7) % 7, a = pc(npc(n) + semis - NAT[l]); if (a > 6) a -= 12;
    return { l: l, a: a };
  }
  function parseNote(s) {
    var m = /^([A-Ga-g])(#|♯|b|♭)?$/.exec(s); if (!m) throw new Error("not a note name: " + s);
    return { l: LET.indexOf(m[1].toUpperCase()), a: m[2] === "#" || m[2] === "♯" ? 1 : m[2] ? -1 : 0 };
  }
  function nameOf(n) { return LET[n.l] + (n.a > 0 ? "#".repeat(n.a) : "b".repeat(-n.a)); }

  // One chord token -> { tok, root, q, tones: [{l,a}], sym, roles: ["R","3","5","7"] }
  function chord(key, tok) {
    tok = tok.trim().replace(/^b(?=[iIvV])/, "♭").replace(/^#(?=[iIvV])/, "♯").replace(/o(?=7|$|\/)/, "°").replace(/Δ|M7|maj7/, "maj7");
    var sym = /^([A-G](?:#|b|♯|♭)?)(maj7|m7b5|ø7|dim7|°7|m7|7|m|dim|°|aug|\+)?$/.exec(tok);
    if (sym) {
      var sq = { "maj7": "M7", "m7b5": "hd", "ø7": "hd", "dim7": "d7", "°7": "d7", "m7": "m7", "7": "dom7", "m": "m", "dim": "d", "°": "d", "aug": "A", "+": "A" }[sym[2]] || "M";
      return place(key, build(tok, parseNote(sym[1]), sq), null);
    }
    var m = /^(♭|♯)?(vii|vi|v|iv|iii|ii|i|VII|VI|V|IV|III|II|I)(°|ø|\+)?(maj7|7)?(?:\/(.+))?$/.exec(tok);
    if (!m) throw new Error("Can't read the chord \"" + tok + "\". Try I, ii7, V7, iiø7, vii°7, ♭VII, V7/V, or a chord symbol like A7.");
    var up = m[2] === m[2].toUpperCase(), deg = DEG[m[2].toLowerCase()], sev = !!m[4], q;
    if (m[4] === "maj7") q = up ? "M7" : "mM7";
    else if (sev) q = m[3] === "ø" ? "hd" : m[3] === "°" ? "d7" : up ? "dom7" : "m7";
    else q = m[3] === "°" ? "d" : m[3] === "ø" ? "hd" : m[3] === "+" ? "A" : up ? "M" : "m";
    var root, target = null;
    if (m[5]) {   // secondary: the numeral counted in the major key of the target chord's root
      var t = (target = chord(key, m[5])).root;
      root = above(t, deg - 1, MAJ[deg - 1] + (m[1] === "♭" ? -1 : m[1] === "♯" ? 1 : 0));
    } else if (m[1]) {   // ♭VII, ♯iv°: altered from the major scale
      root = above(key.tonic, deg - 1, MAJ[deg - 1] + (m[1] === "♭" ? -1 : 1));
    } else {
      var semis = key.scale[deg - 1];
      // minor's dominant chords borrow the raised 7th (A7 and C♯° in D minor, as in 322a)
      if (key.mode === "minor" && deg === 7 && (q === "d" || q === "d7" || q === "hd")) semis = 11;
      root = above(key.tonic, deg - 1, semis);
    }
    return place(key, build(tok, root, q), target);
  }
  // Where a chord sits in the key: its degree, and for a secondary chord (V7/V, vii°/ii, or a symbol such as D7 in C) the root of
  // the chord it leads to. A dominant 7th on any degree but 5 (♭VII in mixolydian aside) is read as a secondary dominant.
  function place(key, c, target) {
    c.deg = ((c.root.l - key.tonic.l) % 7 + 7) % 7 + 1;
    if (target) c.to = npc(target.root);
    else if (c.q === "dom7" && c.deg !== 5 && !(c.deg === 7 && key.mode !== "major" && key.mode !== "minor")) c.to = pc(npc(c.root) + 5);
    if (c.to != null) c.fn = "S";
    else c.fn = c.deg === 1 ? "T" : c.deg === 6 || c.deg === 3 ? "t" : c.deg === 2 || c.deg === 4 ? "P" : "D";
    // a chord on a lowered 3rd, 6th or 7th degree (♭III ♭VI ♭VII in major; VII in mixolydian / dorian): borrowed, rock's
    // "L" chords. They play as dominants in the classical style and as their own kind in the rock style.
    var off = pc(npc(c.root) - npc(key.tonic));
    c.low = c.to == null && (c.deg === 3 || c.deg === 6 || c.deg === 7) && off === MAJ[c.deg - 1] - 1 && key.mode !== "minor";
    return c;
  }
  function build(tok, root, q) {
    var tones = [root].concat(Q[q].map(function (iv) { return above(root, iv[0], iv[1]); }));
    return { tok: tok, root: root, q: q, tones: tones, roles: ["R", "3", "5", "7"].slice(0, tones.length), sym: nameOf(root) + QSYM[q] };
  }

  function makeKey(tonicName, mode) {
    var M = MODES[mode]; if (!M) throw new Error("unknown mode " + mode);
    var tonic = parseNote(tonicName || "C");
    var key = { tonic: tonic, mode: mode, scale: M.s.slice(), abc: nameOf(tonic) + M.k };
    // Do: the tonic of the parent major scale
    key.doNote = above(tonic, -M.deg, -MAJ[M.deg]);
    key.sig = LET.split("").map(function (_, i) { var n = above(key.doNote, ((i - key.doNote.l) % 7 + 7) % 7, MAJ[((i - key.doNote.l) % 7 + 7) % 7]); return n.a; });
    key.tonicMidi = 60 + NAT[tonic.l] + tonic.a;
    return key;
  }
  function solfege(key, n) {
    var st = ((n.l - key.doNote.l) % 7 + 7) % 7, diat = above(key.doNote, st, MAJ[st]);
    var alt = n.a - diat.a, semi = pc(MAJ[st] + alt), names = SOLF[semi];
    if (alt === 0 || names.length === 1) return names[0];
    return alt > 0 ? names[0] : names[1];
  }

  // Every way of placing a chord's tones within [lo, hi] (MIDI): [{ l, a, midi, role }]
  function placements(c, lo, hi) {
    var out = [];
    c.tones.forEach(function (t, i) {
      for (var oct = 1; oct <= 7; oct++) {
        var midi = 12 * (oct + 1) + NAT[t.l] + t.a;
        if (midi >= lo && midi <= hi) out.push({ l: t.l, a: t.a, oct: oct, midi: midi, role: c.roles[i] });
      }
    });
    return out.sort(function (a, b) { return a.midi - b.midi; });
  }
  function mirror(ct) { return ct === "up" ? "down" : ct === "down" ? "up" : ct.replace(/[ud]/g, function (x) { return x === "u" ? "d" : "u"; }); }
  function contour(p) {
    if (p.length === 2) return p[1].midi > p[0].midi ? "up" : "down";
    var d = [];
    for (var i = 1; i < p.length; i++) d.push(p[i].midi > p[i - 1].midi ? "u" : "d");
    return d.join("");
  }
  // All acceptable patterns of a size for one chord
  function candidates(c, size, lo, hi) {
    var pl = placements(c, lo, hi), out = [];
    (function rec(cur) {
      if (cur.length === size) {
        var ms = cur.map(function (n) { return n.midi; }), span = Math.max.apply(null, ms) - Math.min.apply(null, ms);
        if (span > 12) return;
        out.push(cur.slice()); return;
      }
      pl.forEach(function (n) {
        var prev = cur[cur.length - 1];
        if (prev && (n.midi === prev.midi || Math.abs(n.midi - prev.midi) > 8)) return;   // no repeats in a row, no leap over a minor 6th
        // the same note at most twice in a pattern
        if (cur.filter(function (x) { return x.midi === n.midi; }).length >= 2) return;
        cur.push(n); rec(cur); cur.pop();
      });
    })([]);
    return out;
  }

  function rng(seed) {   // mulberry32
    var a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // The chord for each slot, as a progression. The hand-written sets move tonic -> predominant -> dominant -> tonic
  // (322b: Dm Gm A7 Dm, never A7 to Gm), a dominant may come twice (322a: A7 A7) but a chord not three times, and every block
  // opens and closes on the first chord listed. A secondary chord goes to its target (V7/V -> V or V7) whenever the target is
  // in the list. Weights below are how likely each move is; the best of many tries that also uses the chords evenly is kept.
  var MOVE = { T: { T: 0.3, t: 1, P: 3, D: 3, S: 2 }, t: { T: 0.5, t: 0.3, P: 3, D: 1.5, S: 2 }, P: { T: 0.4, t: 0.3, P: 0.8, D: 4, S: 1.5 },
    D: { T: 4, t: 0.15, P: 0.05, D: 0.8, S: 0.5 } };
  // Rock: IV goes home as readily as V does (plagal I–IV–I), V may fall back to IV (I–V–IV–I), and ♭VII goes to IV or straight
  // home (♭VII–IV–I, ♭VII–I); V to ♭VII and back is avoided. My own rule of thumb from familiar songs, not from a corpus study.
  var ROCK = { T: { T: 0.3, t: 1, P: 3, D: 2, L: 2, S: 1 }, t: { T: 0.5, t: 0.3, P: 3, D: 1, L: 1, S: 1 },
    P: { T: 3, t: 0.5, P: 0.5, D: 2, L: 0.8, S: 0.5 }, D: { T: 3, t: 0.8, P: 2, D: 0.5, L: 0.05, S: 0.3 },
    L: { T: 3, t: 0.3, P: 3, D: 0.05, L: 0.8, S: 0.3 } };
  function fnOf(c, rock) { return rock && c.low ? "L" : c.fn; }
  function moveW(chords, a, b) {
    var A = chords[a], B = chords[b], rock = chords.rock, M = rock ? ROCK : MOVE, fa = fnOf(A, rock), fb = fnOf(B, rock);
    if (fa === "S") {
      var has = chords.some(function (c) { return c.fn !== "S" && npc(c.root) === A.to || c.fn === "S" && c !== A && npc(c.root) === A.to; });
      if (has) return npc(B.root) === A.to ? 10 : 0.02;
      return M.D[fb === "L" && !rock ? "D" : fb];
    }
    if (!rock) { if (fa === "L") fa = "D"; if (fb === "L") fb = "D"; }
    var w = M[fa][fb];
    if (a === b) w *= 0.4;
    return w;
  }
  function chordPlan(n, chords, rand) {
    var nC = chords.length; if (nC === 1 || n === 1) { var z = []; for (var i0 = 0; i0 < n; i0++) z.push(0); return z; }
    var best = null, bestScore = -1e9;
    for (var tr = 0; tr < 300; tr++) {
      var seq = [0], logw = 0, cnt = []; for (var c = 0; c < nC; c++) cnt.push(0); cnt[0] = 1;
      for (var i = 1; i < n; i++) {
        var prev = seq[i - 1], ws = [], tot = 0;
        for (var j = 0; j < nC; j++) {
          var w = moveW(chords, prev, j);
          if (w < 0.1) w = 0;                                                       // a move the sets never make (V -> ii, V7/V -> I)
          if (i === n - 2 && moveW(chords, j, 0) < 0.3) w = 0;                       // the one before last must lead home
          if (i >= 2 && seq[i - 2] === prev && prev === j) w = 0;                 // never three in a row
          if (i === n - 1) w = j === 0 ? w : 0;                                     // close on the first chord
          else if (j !== 0) w *= Math.exp(-0.9 * Math.max(0, cnt[j] - i / nC));    // keep the chords even (the tonic may come more)
          ws.push(w); tot += w;
        }
        if (tot <= 0) { logw -= 50; ws = ws.map(function (_, j) { return j === 0 ? 1 : 0; }); tot = 1; }
        var r = rand() * tot, pick = 0; for (j = 0; j < nC; j++) { r -= ws[j]; if (r <= 0) { pick = j; break; } }
        logw += Math.log(Math.max(1e-6, moveW(chords, prev, pick))); seq.push(pick); cnt[pick]++;
      }
      var mean = n / nC, spread = cnt.reduce(function (x, y) { return x + (y - mean) * (y - mean); }, 0);
      // any sensible progression will do (every move at least "possible"), so evenness and chance pick among them
      var sc = (logw < (n - 1) * Math.log(0.3) ? logw : 0) - 0.3 * spread + rand() * 2;
      if (sc > bestScore) { bestScore = sc; best = seq; }
    }
    return best;
  }

  function generate(o) {
    o = o || {};
    var mode = (o.mode || "major").toLowerCase(), key = makeKey(o.tonic || "C", mode);
    var toks = Array.isArray(o.chords) ? o.chords : String(o.chords || "I, V7").replace(/[\[\]]/g, "").split(/[,\s]+/).filter(Boolean);
    if (!toks.length) throw new Error("List at least one chord.");
    var chords = toks.map(function (t) { return chord(key, t); });
    var sizes = (o.sizes || [2, 3]).map(Number).filter(function (s) { return s >= 2 && s <= 6; }).sort(function (a, b) { return b - a; });
    if (!sizes.length) throw new Error("Pick at least one pattern length.");
    var count = Math.max(1, Math.min(64, o.count || 16)), rand = rng(o.seed == null ? 1 : o.seed);
    // style: "classical" (the hand-written sets), "rock", or "auto": rock when a major-key list borrows ♭III ♭VI ♭VII, or in mixolydian
    var style = o.style || "auto";
    chords.rock = style === "rock" || style === "auto" && (mode === "mixolydian" || mode === "major" && chords.some(function (c) { return c.low; }));
    var lo = key.tonicMidi + (o.low == null ? -5 : o.low), hi = key.tonicMidi + (o.high == null ? 14 : o.high);

    // Lengths per slot: blocks (longest first, as 322a/b) or mixed (as 323/324: shuffled, no length three times running)
    var lens = [], per = Math.floor(count / sizes.length), extra = count - per * sizes.length;
    if ((o.order || "blocks") === "blocks") sizes.forEach(function (s, i) { for (var k = 0; k < per + (i < extra ? 1 : 0); k++) lens.push(s); });
    else {
      for (var i = 0; i < count; i++) lens.push(sizes[i % sizes.length]);
      for (var j = lens.length - 1; j > 0; j--) { var r = Math.floor(rand() * (j + 1)), t = lens[j]; lens[j] = lens[r]; lens[r] = t; }
      if (lens[0] < 3 && sizes.some(function (s) { return s >= 3; })) { var big = lens.findIndex(function (s) { return s >= 3; }); var tt = lens[0]; lens[0] = lens[big]; lens[big] = tt; }
    }
    // Chord plan within each block of equal length, so each block opens on the tonic
    var plan = [], start = 0;
    while (start < count) {
      var end = start;
      if ((o.order || "blocks") === "blocks") while (end < count && lens[end] === lens[start]) end++; else end = count;
      plan = plan.concat(chordPlan(end - start, chords, rand)); start = end;
    }

    var cache = {}, used = {}, startsBy = {}, shapesBy = {}, chosen = [], tonicPc = npc(key.tonic);
    for (var s = 0; s < count; s++) {
      var ci = plan[s], c = chords[ci], size = lens[s], ck = ci + ":" + size;
      var cands = cache[ck] || (cache[ck] = candidates(c, size, lo, hi));
      if (!cands.length) throw new Error("No " + size + "-note pattern for " + c.tok + " fits the range. Widen the range.");
      var prev = chosen[chosen.length - 1], best = null, bestScore = -1e9;
      cands.forEach(function (p) {
        var id = p.map(function (n) { return n.midi; }).join(","), score = rand() * 1.5;
        if (used[id]) score -= 100;
        var octId = p.map(function (n) { return pc(n.midi); }).join(",") + "|" + contour(p);
        if (used[octId]) score -= 6;   // the same shape an octave away
        var roles = p.map(function (n) { return n.role; });
        if (roles.indexOf("R") >= 0) score += 1.5;
        if (roles.indexOf("3") >= 0) score += 1.5;   // the 3rd: major/minor colour, the leading tone in a dominant
        if (roles.indexOf("7") >= 0) score += c.q === "dom7" || c.q === "hd" || c.q === "d7" ? 1.5 : 0.8;
        if (new Set(roles).size === roles.length) score += 0.5;
        // leaps: 3rds to 5ths are the norm; 6ths are rare in the written sets
        for (var i = 1; i < p.length; i++) { var lp = Math.abs(p[i].midi - p[i - 1].midi); if (lp === 6) score -= 4; else if (lp > 7) score -= 1.2; else if (lp >= 3 && lp <= 5) score += 0.3; }
        // stay near the tonic's octave: the written sets mostly sit between the 5th below and the 5th above the octave
        p.forEach(function (n) { var d = n.midi - key.tonicMidi; if (d < -2 || d > 12) score -= 0.5; });
        var stK = ci + ":" + p[0].midi;
        score -= 1.6 * (startsBy[stK] || 0);
        score -= 1.2 * (shapesBy[ci + ":" + contour(p)] || 0);
        if (prev && contour(prev.notes) === contour(p)) score -= 0.8;
        if (prev && prev.notes[0].midi === p[0].midi) score -= 0.6;
        if (prev) {
          // Voice leading from the last note of the pattern before: the hand-written sets join by the same note or a step
          // (322a: 14 of 15 joins), a random order only half the time.
          var last = prev.notes[prev.notes.length - 1], d = p[0].midi - last.midi, ad = Math.abs(d);
          score += ad === 0 ? 2 : ad <= 2 ? 2.5 : ad <= 4 ? 0.6 : -0.5 * (ad - 4);
          // Tendency tones across a chord change: a 7th falls by step (So -> Fa as G7 goes to C), a leading tone rises a
          // half step (Ti -> Do, Fi -> So as V7/V goes to V).
          if (prev.chord !== c) {
            var pc0 = prev.chord, lt = (pc0.fn === "D" || pc0.fn === "S") && (last.role === "3" && /^(M|dom7)$/.test(pc0.q) || last.role === "R" && /^(d|d7|hd)$/.test(pc0.q));
            if (last.role === "7") score += d === -1 || d === -2 ? 4 : -1.5;
            else if (lt) score += d === 1 ? 4 : -1.5;
          }
          // an answer: the shape before, upside down (C D E then E D C; C E G then G F D)
          if (prev.notes.length === p.length && contour(prev.notes) === mirror(contour(p))) score += 0.6;
        }
        if (s === 0) score += pc(p[0].midi) === tonicPc ? 20 : -5;               // open on the tonic
        if (s === count - 1 && ci === 0) score += pc(p[p.length - 1].midi) === tonicPc ? 20 : -5;   // close on it
        if (score > bestScore) { bestScore = score; best = p; }
      });
      used[best.map(function (n) { return n.midi; }).join(",")] = 1;
      used[best.map(function (n) { return pc(n.midi); }).join(",") + "|" + contour(best)] = 1;
      startsBy[ci + ":" + best[0].midi] = (startsBy[ci + ":" + best[0].midi] || 0) + 1;
      shapesBy[ci + ":" + contour(best)] = (shapesBy[ci + ":" + contour(best)] || 0) + 1;
      chosen.push({ chord: c, notes: best });
    }

    // ABC: accidentals only where they differ from the key signature or from earlier in the pattern
    var ACC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
    var tunes = chosen.map(function (pt, i) {
      var state = key.sig.slice(), notes = pt.notes.map(function (n) {
        var acc = n.a === state[n.l] ? "" : ACC[n.a]; state[n.l] = n.a;
        var letter = n.oct >= 5 ? LET[n.l].toLowerCase() : LET[n.l];
        var marks = n.oct >= 5 ? "'".repeat(n.oct - 5) : ",".repeat(4 - n.oct);
        return { abc: acc + letter + marks + "0", midi: n.midi, solfege: solfege(key, n) };
      });
      return { chord: pt.chord.tok, sym: pt.chord.sym, notes: notes, solfege: notes.map(function (n) { return n.solfege; }).join(" ") };
    });
    var abc = tunes.map(function (t, i) {
      return "X:" + (i + 1) + "\nK:" + key.abc + "\n[V: V1] \"" + t.sym + "\" " + t.notes.map(function (n) { return n.abc; }).join(" ") + " \nw: " + t.solfege;
    }).join("\n\n") + "\n";
    return { abc: abc, patterns: tunes, key: key.abc, style: chords.rock ? "rock" : "classical" };
  }

  // Saved sets (made on either page) live in localStorage and join patternObject as "★ <name>".
  var STORE = "tp-generated";
  function saved() { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch (e) { return []; } }
  function save(name, spec, abc) {
    var all = saved().filter(function (s) { return s.name !== name; }); all.unshift({ name: name, spec: spec, abc: abc });
    try { localStorage.setItem(STORE, JSON.stringify(all.slice(0, 30))); } catch (e) {}
  }
  function remove(name) { try { localStorage.setItem(STORE, JSON.stringify(saved().filter(function (s) { return s.name !== name; }))); } catch (e) {} }
  function loadSaved(obj) { saved().forEach(function (s) { obj["★ " + s.name] = s.abc; }); return obj; }

  var api = { generate: generate, chord: function (tok, mode, tonic) { return chord(makeKey(tonic || "C", mode || "major"), tok); },
    makeKey: makeKey, modes: Object.keys(MODES), saved: saved, save: save, remove: remove, loadSaved: loadSaved };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.TonalPatternGen = api;
})(typeof window !== "undefined" ? window : globalThis);
