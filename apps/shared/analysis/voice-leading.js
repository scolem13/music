// Voice-leading and species-counterpoint checker (global VoiceLeading; also require()-able in Node).
// Goes with the Theory pages for chapters 26-30 of Hutchinson's Music Theory for the 21st-Century Classroom
// (theory/voice-leading-triads.qmd, -sevenths, -ncts, -chromatic, counterpoint.qmd). The page widget is voice-leading-ui.js.
//
// SATB / chorale style:   VoiceLeading.check({ key: "C" | "a" | "Bb" | "f#",    (capital = major, lower case = minor)
//                                              voices: ["S","A","T","B"],      (default; any subset, e.g. ["S","B"])
//                                              beatsPerBar: 4,
//                                              slices: [ { t: 0, rn: "I", S: "E5", A: "C5", T: "G4", B: "C3" }, ... ] }, opts)
//   t = the slice's start in quarter-note beats; a slice WITH rn starts that chord (it holds until the next rn); a slice
//   without rn is an embellishing slice inside the chord. Pitches "C4" "F#4" "Bb3" "E##5" (C4 = middle C). null / "" = rest.
//   Roman numerals: I ii iii IV V vi viio (also "vii°"), viiø7, V7, IM7, ii7, bVI, N6 (Neapolitan), inversions 6 64 65 43 42,
//   secondary "V7/V", "viio7/V". Returns { ok, errors: [{rule, sev, chapter, slice, t, where, voices, voice, msg}],
//   ncts: [{voice, slice, type}], text() } ; sev is "error" or "warn". opts.rules = ["parallels", ...] limits the rules checked.
//
// Species counterpoint:   VoiceLeading.species({ species: 1 | 2, cf: ["D4", "F4", ...], cp: [...], cfPos: "lower" | "upper",
//                                                 mode: "D dorian" (optional, "phrygian" changes the second-species ending) })
//   First species: one note per bar in cp. Second species: cp[i] = [n1, n2] (n1 may be null for a half rest) and the last bar's
//   cp[last] = "A4" (a whole note). Returns the same shape of result (slice = bar number - 1).
//
// RULES (each with the chapter of the book it comes from; "site" = this site's reading or addition, not stated in the book):
//   ch. 26 Voice Leading Triads
//     range      voice ranges (the book's figure, read off the staff: S D4-F#5, A G3-C#5, T Eb3-F#4, B E2-C4; the figure's
//                notes are checked here as MIDI 62-78, 55-73, 51-66, 40-60: site's reading of the figure)
//     spacing    S-A and A-T no more than an octave apart; bass-tenor may be wider
//     crossing   a voice below the voice under it (site's name; the book has it under independence of parts)
//     overlap    a voice moves past where its neighbour just was (site; the book's "independence of parts")
//     parallels  parallel 5ths and 8ves (and 12ths, unisons) between any two voices
//     unequal5   d5 then P5 in similar motion (the book allows it in the Mozart K. 331 case, ch. 27; a warning here)
//     direct     direct 5th / 8ve in the outer voices with the soprano leaping (site: the usual textbook rule; the book states
//                direct motion only for species, below)
//     leaptone   leading tone doubled; leading tone (7) not rising to 8 (inner voice may fall a third to 5 over V / V7 -> I, ch. 27)
//     melody     augmented intervals; a leap larger than a 4th not followed by a change of direction (upper voices an error, bass
//                a warning); consecutive same-direction leaps outlining a triad (the book's "Rules of Melody")
//     doubling   root position: double the root (the deceptive V-vi: doubled third allowed); first inversion: not the bass,
//                except diminished (double the third) and consecutive first inversions alternate; second inversion: double the bass
//     complete   each chord has its third; its fifth too unless the root is doubled / tripled in an incomplete chord (site)
//   ch. 27 Voice Leading Seventh Chords
//     seventh    the chordal 7th resolves down by step (also over secondary sevenths, ch. 29). The one exception, the book's own:
//                I - V4/3 - I6, where the 7th rises (Mozart K. 331 I), accepted only there; its unequal fifths give the "unequal5" warning
//     viiSpecial vii dim7 / half-dim 7: if the 7th is voiced above the third, the third (scale degree 2) rises a step, else it falls; the
//                fifth (4) falls; the tonic after vii dim7 may double its third
//     voicing7   root-position sevenths: all four members, or the fifth left out and the root doubled; successive root-position
//                sevenths alternate complete / incomplete (warning)
//     chordtone  a note not in the chord must be a recognised non-chord tone (ch. 28) -- passing, neighbor, appoggiatura,
//                escape, anticipation, suspension, retardation
//   ch. 28 Voice Leading with Non-Chord Tones
//     nctpar     parallels made by an embellishing slice (same check as parallels, run between every pair of slices)
//     nctsame    non-chord tones in two voices at once, except in parallel 3rds / 6ths (warning)
//     (the types are named by nctType(); a pedal point is a note held (same in, same out) that is not in the chord; a double neighbor is
//      two embellishing slices: a step one way, a third back across, a step home to the first note)
//   ch. 29 Voice Leading Chromatic Harmonies
//     the seventh / leading-tone rules above apply to secondary chords (the leading tone is the target's); the Neapolitan
//     (N6) must double the bass and 2 resolves down (rule "neapolitan"); borrowed chords: scale degree 6 resolves down
//     ("borrowed6"). Augmented sixth chords (It+6, Fr+43, Ger+65, enGer+65, stacked on b6 in the bass, read from the symbol): rule "aug6":
//     the raised 4 rises to 5 (falls to 4 over V7), the flat 6 falls to 5 (the book states the 4 only; the b6 is this site's reading from the
//     interval's name), neither is doubled, all notes present (the Italian doubles the tonic), the enharmonic German's raised 2 rises to 3;
//     the German straight to V makes parallel fifths, which the ordinary parallels rule reports.
//   Not checked: unequal-fifths exceptions beyond d5-P5 and the K. 331 case, strict versus free resolution as an exercise asks,
//   consecutive 3rds / 6ths in SATB (the book limits them only in species), whether a Roman numeral suits a melody.
//
//   ch. 30 Introduction to Counterpoint (species)
//     first species   begin / end on unison or octave; approach the end by contrary motion, 7 -> 8 in one voice and 2 -> 1 in
//                     the other; every interval a consonance (unison, 3rd, 5th, 6th, octave and their compounds; 4ths
//                     and tritones are dissonant); imperfect consonances approached any way, perfect ones only by contrary
//                     motion; not more than three 3rds (or 6ths) in a row (site: of one size); leaps only 3rds, 4ths, 5ths,
//                     ascending minor 6ths and octaves, a leap larger than a 4th followed by a change of direction;
//                     no outlining a tritone (two turning points a tritone apart); no repeated notes (warning); no
//                     augmented intervals
//     second species  the above on the downbeats; begin on beat 1 or 3 (half rest first) at the octave / unison; the last bar a
//                     whole note; penultimate bar 5th - 6th (cf lower) or 5th - 3rd (cf upper), Phrygian 6th - 3rd (cf upper);
//                     the second half note a consonance or a passing tone; no repeated note across a barline; no octaves (5ths)
//                     on consecutive downbeats unless a leap of a 4th follows
//   Third to fifth species (the same call, species: 3 | 4 | 5; cp bars: third ["A4","G4","F4","A4"], fourth [null | "D4", "E4"], fifth
//   "A4:2 G4:1 F4:1", ":n" = quarter notes, "r:2" a rest; the last bar one whole note):
//     third     downbeats consonant; other quarters consonant or a passing tone or the cambiata (step down, leap down a 3rd, step up);
//               ending bar 4 5 6 7 / 2 1 6 7 (cf lower) or 7 5 6 7 (cf upper); the note before the end rises a half step; no note repeated
//               across a barline; direct 5ths / 8ves on downbeats refused
//     fourth    cf lower only: half rest then an octave above; beat 3 tied to the next downbeat (all bars but the penultimate); beat 3 a
//               consonance; a dissonant tied note (4th or 7th) is a suspension resolving down by step, 9-8 and 2-1 refused; the penultimate
//               bar a 7-6 suspension; syncopations (a consonant tied note) free
//     fifth     the common rules and the tied suspension; dissonance only on a quarter note as a passing tone, neighbor tone (the neighbor
//               and the quarter-note limit are the site's reading of "a free mixture") or cambiata
//     all       the counterpoint stays above (cf lower) / below (cf upper) the cantus firmus; the same leaps and direction changes as first
//   The invention exposition and fugue analysis are not checked (site's limit).
(function (g) {
  "use strict";
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var RANGES = { S: [62, 78], A: [55, 73], T: [51, 66], B: [40, 60] };
  var RANGE_NAMES = { S: "D4-F#5", A: "G3-C#5", T: "Eb3-F#4", B: "E2-C4" };
  var VNAME = { S: "soprano", A: "alto", T: "tenor", B: "bass" };
  var CH = { range: 26, spacing: 26, crossing: 26, overlap: 26, parallels: 26, unequal5: 27, direct: 26, leaptone: 26, melody: 26, doubling: 26, complete: 26,
    seventh: 27, voicing7: 27, chordtone: 28, nctpar: 28, nctsame: 28, neapolitan: 29, borrowed6: 29, viiSpecial: 27, aug6: 29, rn: 26, species: 30 };

  function pc(n) { return ((n % 12) + 12) % 12; }

  // ---- pitches
  function parseNote(s) {
    if (s == null || s === "" || s === "r" || s === "z") return null;
    var m = /^([A-Ga-g])(#{1,2}|b{1,2}|n)?(-?\d)$/.exec(String(s).trim());
    if (!m) throw new Error("Bad pitch: " + s);
    var l = LET.indexOf(m[1].toUpperCase()), acc = m[2] ? (m[2] === "n" ? 0 : m[2][0] === "#" ? m[2].length : -m[2].length) : 0, oct = +m[3];
    return { l: l, a: acc, oct: oct, midi: 12 * (oct + 1) + NAT[l] + acc, dia: oct * 7 + l, name: m[1].toUpperCase() + (m[2] || "").replace("n", "") + oct };
  }
  function pretty(n) { return n ? n.name.replace("#", "♯").replace(/b/g, "♭").replace(/^([A-G])♭/, "$1♭") : "rest"; }
  function nameOf(n) { return n.name[0] + (n.a > 0 ? "♯".repeat(n.a) : n.a < 0 ? "♭".repeat(-n.a) : "") + n.oct; }
  function parseKey(k) {
    var m = /^([A-Ga-g])(#|b)?$/.exec(String(k)); if (!m) throw new Error("Bad key: " + k);
    var minor = m[1] === m[1].toLowerCase(), l = LET.indexOf(m[1].toUpperCase()), a = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
    return { minor: minor, tonic: pc(NAT[l] + a), l: l, a: a };
  }
  var MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];

  // ---- Roman numerals -> pitch classes
  // returns { rn, root(pc), pcs:[root,third,fifth,(seventh)], bassFn: 0..3, dom(bool), lt(pc|null), seventh(bool), deg, tonic(pc of local key),
  //           dim, kind: "tri"|"7th", neapolitan, borrowed6(pc|null) }
  function parseRN(rn, key) {
    var tok = String(rn).replace(/°/g, "o").replace(/ø/g, "ø"), tail = null, sl = tok.indexOf("/");
    if (sl >= 0) { tail = tok.slice(sl + 1); tok = tok.slice(0, sl); }
    var am = /^(It|Fr|Ger|enGer)\+(6|43|65)$/.exec(tok);
    if (am) {   // augmented sixth chords (ch. 21 / 29): stacked on b6 (the bass), 1, [2 | b3 (written #2 in the enharmonic German)], #4
      var T = key.tonic, ap = am[1] === "It" ? [8, 0, 6] : am[1] === "Fr" ? [8, 0, 2, 6] : [8, 0, 3, 6];
      return { rn: rn, root: pc(T + 8), pcs: ap.map(function (x) { return pc(T + x); }), bassFn: 0, dom: false, lt: null, seventh: false, tonic: T, dim: false, upper: true, kind: "aug6",
        neapolitan: false, deg: 5, secondary: false, fig: "", isTonic: false, borrowed6: null, deceptive: false, aug6: am[1], vii7: false, half: false };
    }
    if (tok === "N6" || tok === "N") tok = "bII" + (tok === "N6" ? "6" : "");
    var m = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)([oø+]?)(M?7)?(64|65|43|42|6|2)?$/.exec(tok);
    if (!m) throw new Error("Bad Roman numeral: " + rn);
    var acc = m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0, nu = m[2], q = m[3], sev = m[4] || "", fig = m[5] || "";
    var upper = nu === nu.toUpperCase(), deg = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 }[nu.toLowerCase()];
    if ((fig === "65" || fig === "43" || fig === "42" || fig === "2") && !sev) sev = "7";
    if (fig === "2") fig = "42";
    var tonic = key.tonic, minor = key.minor;
    if (tail) {
      var t = parseRN(tail.replace(/^(.)/, function (c) { return c; }), key); tonic = t.root; minor = false;   // secondary: its root is the local tonic
      if (/^[ivx]+$/.test(tail.replace(/[^ivxIVX]/g, "")) && tail === tail.toLowerCase()) minor = true;
    }
    var scale = (minor && !tail) ? MIN : MAJ;
    // in minor, lower-case vii (diminished) takes the raised 7
    var rootSemi = scale[deg];
    if (!tail && minor && deg === 6 && !upper) rootSemi = 11;
    if (!tail && minor && deg === 6 && upper && q === "") rootSemi = 10;
    var root = pc(tonic + rootSemi + acc), third, fifth, seventh = null;
    third = (upper || q === "+") ? 4 : 3; fifth = 7; if (q === "o" || q === "ø") fifth = 6; if (q === "+") fifth = 8;
    if (sev) {
      if (q === "o") seventh = 9; else if (q === "ø") seventh = 10; else if (/^M/.test(sev)) seventh = 11; else seventh = 10;
    }
    var pcs = [root, pc(root + third), pc(root + fifth)]; if (seventh != null) pcs.push(pc(root + seventh));
    var bassFn = { "": 0, "6": 1, "64": 2, "65": 1, "43": 2, "42": 3 }[fig];
    if (sev && fig === "6") bassFn = 1;
    var dom = !acc && !tail ? (deg === 4 && upper) || (deg === 6 && !upper && (q === "o" || q === "ø")) : (deg === 4 && upper) || (deg === 6 && !upper && (q === "o" || q === "ø"));
    return { rn: rn, root: root, pcs: pcs, bassFn: bassFn, dom: dom, lt: dom ? pc(tonic + 11) : null, seventh: seventh != null, tonic: tonic, dim: q === "o", upper: upper,
      kind: seventh != null ? "7th" : "tri", neapolitan: acc === -1 && deg === 1 && upper && !tail, deg: deg, secondary: !!tail, fig: fig,
      isTonic: !tail && deg === 0 && !acc && !seventh, borrowed6: (!tail && !minor && acc === -1 && deg === 5) ? pc(tonic + 8) : (!tail && !minor && (deg === 3 && !upper)) ? pc(tonic + 8) : null,
      deceptive: !tail && deg === 5 && !acc, vii7: seventh != null && !upper && deg === 6 && (q === "o" || q === "ø"), half: q === "ø" };
  }
  function fnOf(ch, p) { var i = ch.pcs.indexOf(pc(p)); return i; }

  // ---- result helpers
  function Result(beatsPerBar) {
    var r = { ok: true, errors: [], ncts: [], bpb: beatsPerBar || 4 };
    r.add = function (rule, sev, slice, t, where, msg, voices) {
      r.errors.push({ rule: rule, sev: sev, chapter: CH[rule] || 26, slice: slice, t: t, where: where, voices: voices || null, msg: msg });
      if (sev === "error") r.ok = false;
    };
    r.where = function (t) { var b = r.bpb; return "bar " + (Math.floor(t / b) + 1) + ", beat " + ((t % b) + 1); };
    r.text = function () { return r.errors.map(function (e) { return (e.sev === "warn" ? "warning: " : "") + e.where + (e.voices ? " (" + e.voices + ")" : "") + ": " + e.msg; }).join("\n") || "No errors found."; };
    return r;
  }
  function on(opts, rule) { return !opts || !opts.rules || opts.rules.indexOf(rule) >= 0; }

  // ---- non-chord tone classification (ch. 10 / 28). p, n, q = pitches before, at, after (or null); inChordNext = n in next chord
  function stepSize(a, b) { return Math.abs(a.dia - b.dia); }   // diatonic steps
  function nctType(p, n, q, accented, inNext) {
    if (!n) return null;
    var inS = p ? stepSize(p, n) === 1 : false, inSame = p ? p.midi === n.midi : false, inLeap = p ? stepSize(p, n) > 1 : false;
    var outS = q ? stepSize(n, q) === 1 : false, outSame = q ? q.midi === n.midi : false, outLeap = q ? stepSize(n, q) > 1 : false;
    var up = p ? n.midi > p.midi : 0, qup = q ? q.midi > n.midi : 0;
    if (inSame && outS && !qup && accented) return "suspension";
    if (inSame && outS && qup && accented) return "retardation";
    if (inS && outS && ((up && qup) || (!up && !qup))) return "passing";
    if (inS && outS && q && p && q.midi === p.midi) return "neighbor";
    if (inS && outSame && inNext) return "anticipation";
    if (inLeap && outS && ((up && !qup) || (!up && qup))) return "appoggiatura";   // leap in, step out the other way (resolves toward where it came from)
    if (inLeap && outS && accented) return "appoggiatura";
    if (inS && outLeap && ((up && !qup) || (!up && qup))) return "escape tone";
    if (inSame && outSame) return "pedal point";
    return null;
  }

  // ---- SATB check
  function check(spec, opts) {
    opts = opts || {};
    var key = parseKey(spec.key), voices = spec.voices || ["S", "A", "T", "B"], bpb = spec.beatsPerBar || 4, res = Result(bpb);
    var sl = spec.slices.map(function (s, i) {
      var o = { t: s.t != null ? s.t : i, rn: s.rn || null, n: {} };
      voices.forEach(function (v) { o.n[v] = parseNote(s[v]); });
      return o;
    });
    // chord in force
    var chords = [], cur = null;
    sl.forEach(function (s, i) {
      if (s.rn) { try { cur = parseRN(s.rn, key); } catch (e) { res.add("rn", "error", i, s.t, res.where(s.t), e.message); cur = null; } }
      chords.push(cur);
    });
    var W = function (i) { return res.where(sl[i].t); };
    function tones(i) { var r = {}; voices.forEach(function (v) { var n = sl[i].n[v], c = chords[i]; r[v] = !n || !c ? true : fnOf(c, n.midi) >= 0; }); return r; }
    var isTone = sl.map(function (_, i) { return tones(i); });

    // ranges, spacing, crossing, overlap
    sl.forEach(function (s, i) {
      voices.forEach(function (v) {
        var n = s.n[v], r = RANGES[v]; if (!n || !r || !on(opts, "range")) return;
        if (n.midi < r[0] || n.midi > r[1]) res.add("range", "error", i, s.t, W(i), "The " + VNAME[v] + " note " + nameOf(n) + " is outside the range " + RANGE_NAMES[v] + ".", v);
      });
      if (on(opts, "spacing")) [["S", "A"], ["A", "T"]].forEach(function (pr) {
        var a = s.n[pr[0]], b = s.n[pr[1]]; if (a && b && a.midi - b.midi > 12) res.add("spacing", "error", i, s.t, W(i), "Spacing error: " + pr[0] + " and " + pr[1] + " are more than an octave apart (" + nameOf(a) + ", " + nameOf(b) + ").", pr[0] + "-" + pr[1]);
      });
      if (on(opts, "crossing")) for (var k = 0; k + 1 < voices.length; k++) {
        var hi = s.n[voices[k]], lo = s.n[voices[k + 1]];
        if (hi && lo && hi.midi < lo.midi) res.add("crossing", "error", i, s.t, W(i), "Voice crossing: the " + VNAME[voices[k]] + " (" + nameOf(hi) + ") is below the " + VNAME[voices[k + 1]] + " (" + nameOf(lo) + ").", voices[k] + "-" + voices[k + 1]);
      }
    });
    // pair-wise motion between consecutive slices
    for (var i = 1; i < sl.length; i++) {
      var P = sl[i - 1], C = sl[i];
      for (var a = 0; a < voices.length; a++) for (var b = a + 1; b < voices.length; b++) {
        var u = voices[a], l = voices[b], pu = P.n[u], pl = P.n[l], cu = C.n[u], cl = C.n[l];
        if (!pu || !pl || !cu || !cl) continue;
        var du = Math.sign(cu.midi - pu.midi), dl = Math.sign(cl.midi - pl.midi), m1 = pu.midi - pl.midi, m2 = cu.midi - cl.midi, pr = u + "-" + l;
        var nctMade = (!isTone[i - 1][u] || !isTone[i - 1][l] || !isTone[i][u] || !isTone[i][l]);
        if (du !== 0 && du === dl && on(opts, "parallels")) {
          if (pc(m1) === 7 && pc(m2) === 7) res.add(nctMade ? "nctpar" : "parallels", "error", i, C.t, W(i), "Parallel fifths between " + pr + (nctMade ? " (made by a non-chord tone)" : "") + ": " + nameOf(pu) + "/" + nameOf(pl) + " to " + nameOf(cu) + "/" + nameOf(cl) + ".", pr);
          else if (pc(m1) === 0 && pc(m2) === 0) res.add(nctMade ? "nctpar" : "parallels", "error", i, C.t, W(i), "Parallel octaves between " + pr + (nctMade ? " (made by a non-chord tone)" : "") + ": " + nameOf(pu) + "/" + nameOf(pl) + " to " + nameOf(cu) + "/" + nameOf(cl) + ".", pr);
          else if (pc(m1) === 6 && pc(m2) === 7 && on(opts, "unequal5")) res.add("unequal5", "warn", i, C.t, W(i), "Unequal fifths (diminished then perfect) between " + pr + ": allowed only in a few cases (the book's Mozart K. 331 example, vii-to-I).", pr);
        }
        // overlap
        if (b === a + 1 && on(opts, "overlap")) {
          if (cu.midi < pl.midi) res.add("overlap", "error", i, C.t, W(i), "Overlap: the " + VNAME[u] + " moves below where the " + VNAME[l] + " just was.", pr);
          else if (cl.midi > pu.midi) res.add("overlap", "error", i, C.t, W(i), "Overlap: the " + VNAME[l] + " moves above where the " + VNAME[u] + " just was.", pr);
        }
        // direct 5ths / 8ves in the outer voices
        if (u === voices[0] && l === voices[voices.length - 1] && on(opts, "direct") && du !== 0 && du === dl && (pc(m2) === 0 || pc(m2) === 7) && !(pc(m1) === pc(m2)) && stepSize(pu, cu) > 1)
          res.add("direct", "warn", i, C.t, W(i), "Direct " + (pc(m2) === 7 ? "fifth" : "octave") + " in the outer voices: the " + VNAME[u] + " leaps into it by similar motion.", pr);
      }
    }
    // structural analysis per chord (skips slices where any voice holds a non-chord tone: it decides at the resolution)
    var prevSeven = null, prevFirstInv = null;
    sl.forEach(function (s, i) {
      var ch = chords[i]; if (!ch || !s.rn) return;
      if (ch.aug6) {
        if (!on(opts, "aug6")) return;
        var cnt6 = {}, anyN = false; voices.forEach(function (v) { var n = s.n[v]; if (!n) return; var f = fnOf(ch, n.midi); if (f < 0) anyN = true; else cnt6[f] = (cnt6[f] || 0) + 1; });
        var b6 = cnt6[0] || 0, a4 = cnt6[ch.pcs.length - 1] || 0;
        if (b6 > 1) res.add("aug6", "error", i, s.t, W(i), "Do not double the flat six (the bass) of " + ch.rn + ": it resolves down to 5, and a double would resolve in parallel octaves.");
        if (a4 > 1) res.add("aug6", "error", i, s.t, W(i), "Do not double the raised four of " + ch.rn + ": it resolves up to 5.");
        var bnn = s.n[voices[voices.length - 1]]; if (bnn && pc(bnn.midi) !== ch.pcs[0]) res.add("aug6", "error", i, s.t, W(i), ch.rn + " has the flat six in the bass.", voices[voices.length - 1]);
        if (!anyN && voices.length === 4) for (var f6 = 0; f6 < ch.pcs.length; f6++) if (!cnt6[f6]) res.add("aug6", "error", i, s.t, W(i), "The " + ch.rn + " chord is missing one of its notes (" + ch.pcs.length + " different notes; the Italian sixth doubles the tonic).");
        return;
      }
      var pcsHere = {}; var anyNct = false; var have = {};
      voices.forEach(function (v) { var n = s.n[v]; if (!n) return; if (!isTone[i][v]) { anyNct = true; return; } pcsHere[v] = n; have[fnOf(ch, n.midi)] = (have[fnOf(ch, n.midi)] || 0) + 1; });
      var all4 = voices.length === 4 && voices.every(function (v) { return s.n[v]; });
      // leading tone doubled
      if (ch.lt != null && on(opts, "leaptone")) {
        var cnt = voices.filter(function (v) { return s.n[v] && pc(s.n[v].midi) === ch.lt; });
        if (cnt.length > 1) res.add("leaptone", "error", i, s.t, W(i), "The leading tone is doubled (" + cnt.join(" and ") + "). Double the root or the fifth instead.", cnt.join("-"));
      }
      var bn = s.n[voices[voices.length - 1]];
      if (all4 && !anyNct) {
        // doubling by chord position
        var nT = ch.pcs.length, r3 = have[0] || 0, t3 = have[1] || 0, f5 = have[2] || 0, s7 = have[3] || 0, bassFn = bn ? fnOf(ch, bn.midi) : -1;
        if (bn && bassFn !== ch.bassFn && ch.fig !== undefined && on(opts, "chordtone")) res.add("chordtone", "error", i, s.t, W(i), "The bass should be the " + ["root", "third", "fifth", "seventh"][ch.bassFn] + " of " + ch.rn + " (figure " + (ch.fig || "root position") + ").", voices[voices.length - 1]);
        if (!t3 && on(opts, "complete")) res.add("complete", "error", i, s.t, W(i), "The " + ch.rn + " chord has no third.");
        if (nT === 3) {
          var prevCh = i > 0 ? chords[i - 1] : null, prevS = prevCh ? sl.slice(0, i).filter(function (x) { return x.rn; }).pop() : null;
          if (ch.bassFn === 0) {
            var decept = (prevCh && prevCh.dom && ch.deceptive) || (prevCh && prevCh.vii7 && ch.isTonic);   // the deceptive V-vi, and vii dim7's special resolution: the third is doubled
            if (r3 < 2 && !(decept && t3 >= 2) && on(opts, "doubling")) res.add("doubling", "error", i, s.t, W(i), "Root position " + ch.rn + ": double the root (the bass) in an upper voice." + (decept ? " (In the deceptive V-vi the third may be doubled.)" : ""));
            if (!f5 && r3 < 3 && on(opts, "complete")) res.add("complete", "warn", i, s.t, W(i), "The " + ch.rn + " chord has no fifth; that is only done with the root tripled.");
            if (f5 === 0 && r3 === 3 && t3 === 1) { /* incomplete I: fine */ }
          } else if (ch.bassFn === 1) {
            var bassDoubled = t3 >= 2;
            if (ch.dim) { if (!bassDoubled && on(opts, "doubling")) res.add("doubling", "error", i, s.t, W(i), "A diminished triad in first inversion doubles the third (the bass).", voices[voices.length - 1]); }
            else if (bassDoubled && !ch.neapolitan && on(opts, "doubling")) {
              var prevInv = prevCh && prevCh.kind === "tri" && prevCh.bassFn === 1 && !prevCh.dim;
              if (!(prevInv && prevFirstInv === false)) res.add("doubling", "error", i, s.t, W(i), "First inversion " + ch.rn + ": do not double the bass (the third); double the root or the fifth. (Consecutive first inversions alternate.)");
            }
            if (prevCh && prevCh.kind === "tri" && prevCh.bassFn === 1 && !ch.dim && !prevCh.dim && prevFirstInv === bassDoubled && on(opts, "doubling")) res.add("doubling", "error", i, s.t, W(i), "Consecutive first-inversion chords alternate between doubling the third and not doubling it.");
            prevFirstInv = bassDoubled;
            if (r3 + f5 < 1) { /* fine */ }
          } else if (ch.bassFn === 2) {
            if (f5 < 2 && on(opts, "doubling")) res.add("doubling", "error", i, s.t, W(i), "Second inversion " + ch.rn + ": double the bass (the fifth of the chord).", voices[voices.length - 1]);
          }
          if (ch.neapolitan && t3 < 2 && on(opts, "neapolitan") && ch.bassFn === 1) res.add("neapolitan", "error", i, s.t, W(i), "N6: double the bass (the third of the Neapolitan chord).");
          if (!(ch.bassFn === 1)) prevFirstInv = null;
        } else {
          // seventh chords
          if (ch.bassFn === 0) {
            var complete = r3 && t3 && f5 && s7, incompleteOk = r3 >= 2 && t3 && s7 && !f5;
            if (!(complete || incompleteOk) && on(opts, "voicing7")) res.add("voicing7", "error", i, s.t, W(i), "A root position seventh chord needs its root, third and seventh: complete, or with the fifth left out and the root doubled.");
            if (complete || incompleteOk) {
              if (prevSeven !== null && prevSeven.root7 && prevSeven.complete === complete && on(opts, "voicing7") && chords[i - 1] && chords[i - 1].seventh && chords[i - 1].bassFn === 0) res.add("voicing7", "warn", i, s.t, W(i), "Successive root position sevenths alternate between complete and incomplete voicings.");
              prevSeven = { root7: true, complete: complete };
            }
          } else {
            if (!(r3 && t3 && f5 && s7) && on(opts, "voicing7")) res.add("voicing7", "error", i, s.t, W(i), "An inverted seventh chord is written complete (root, third, fifth and seventh).");
            prevSeven = null;
          }
        }
      }
      if (!(ch.seventh && ch.bassFn === 0)) prevSeven = ch.seventh && ch.bassFn === 0 ? prevSeven : null;
    });
    // resolutions: leading tone, chordal 7th, Neapolitan 2, borrowed 6; and melody rules over structural slices
    function nextStruct(i) { for (var j = i + 1; j < sl.length; j++) if (sl[j].rn) return j; return -1; }
    sl.forEach(function (s, i) {
      var ch = chords[i]; if (!ch || !s.rn) return;
      var j = nextStruct(i); if (j < 0) return; var nx = chords[j], same = nx && nx.rn === ch.rn;
      voices.forEach(function (v) {
        var n = s.n[v]; if (!n || !isTone[i][v]) return;
        var after = sl[j].n[v]; if (!after) return;
        // use the pitch the voice has when the next chord arrives (a suspension there still resolves later: look one on)
        var tgt = after, jj = j;
        if (!isTone[j][v]) { for (var k2 = j + 1; k2 < sl.length; k2++) { if (sl[k2].n[v] && sl[k2].n[v].midi !== after.midi) { tgt = sl[k2].n[v]; jj = k2; break; } if (sl[k2].rn) break; } }
        var d = tgt.midi - n.midi, lbl = res.where(sl[j].t), pi = -1;
        for (var q0 = i - 1; q0 >= 0; q0--) if (sl[q0].rn) { pi = q0; break; }
        var pvc = pi >= 0 ? chords[pi] : null;
        // vii dim7 / half-dim 7 (ch. 27): the third (scale degree 2) rises when the 7th is voiced above it, falls otherwise; the fifth (4) falls
        if (ch.vii7 && !same && on(opts, "viiSpecial")) {
          var sevP = null, thP = null; voices.forEach(function (w) { var x = s.n[w]; if (!x) return; if (pc(x.midi) === ch.pcs[3] && !sevP) sevP = x; if (pc(x.midi) === ch.pcs[1] && !thP) thP = x; });
          var sevAbove = sevP && thP && sevP.midi > thP.midi;
          if (pc(n.midi) === ch.pcs[1] && thP) {
            if (sevAbove && !(d === 1 || d === 2)) res.add("viiSpecial", "error", j, sl[j].t, lbl, "The 7th of " + ch.rn + " is above its third, so the third (scale degree 2, " + VNAME[v] + ") should rise a step (the special resolution).", v);
            if (!sevAbove && !(d === -1 || d === -2)) res.add("viiSpecial", "error", j, sl[j].t, lbl, "The 7th of " + ch.rn + " is below its third, so everything resolves normally: the third (scale degree 2, " + VNAME[v] + ") falls a step.", v);
          }
          if (pc(n.midi) === ch.pcs[2] && !(d === -1 || d === -2)) res.add("viiSpecial", "error", j, sl[j].t, lbl, "The fifth of " + ch.rn + " (scale degree 4, " + VNAME[v] + ") should fall a step.", v);
        }
        // augmented sixth chords (ch. 29): #4 rises to 5 (to 4 over V7), b6 falls to 5, the enharmonic German's #2 rises to 3
        if (ch.aug6 && nx && on(opts, "aug6")) {
          var T6 = ch.tonic, toV = nx.deg === 4 && nx.upper && !nx.secondary && !nx.aug6, toC64 = nx.isTonic && nx.fig === "64";
          if (toV || toC64) {
            if (pc(n.midi) === pc(T6 + 6)) {
              var want4 = nx.seventh ? (d === -1) : (d === 1 && pc(tgt.midi) === pc(T6 + 7));
              if (!want4) res.add("aug6", "error", j, sl[j].t, lbl, "The raised four (" + nameOf(n) + ", " + VNAME[v] + ") of " + ch.rn + " should " + (nx.seventh ? "fall to 4, the seventh of " + nx.rn : "rise a half step to 5") + ".", v);
            }
            if (pc(n.midi) === pc(T6 + 8) && !(d === -1 && pc(tgt.midi) === pc(T6 + 7))) res.add("aug6", "error", j, sl[j].t, lbl, "The flat six (" + nameOf(n) + ", " + VNAME[v] + ") of " + ch.rn + " should fall a half step to 5 (it and the raised four move outward to 5).", v);
            if (ch.aug6 === "enGer" && toC64 && pc(n.midi) === pc(T6 + 3) && !(d === 1)) res.add("aug6", "error", j, sl[j].t, lbl, "In the enharmonic German chord the raised 2 (" + nameOf(n) + ", " + VNAME[v] + ") rises to 3.", v);
          }
        }
        if (ch.lt != null && pc(n.midi) === ch.lt && !same && on(opts, "leaptone")) {
          var nextDom = nx && nx.dom && nx.lt === ch.lt, toTonic = pc(tgt.midi) === ch.tonic && d === 1;
          var third = (v === "A" || v === "T") && /^V/.test(ch.rn) && !ch.secondary && nx && nx.isTonic && pc(tgt.midi) === pc(ch.tonic + 7) && d < 0 && Math.abs(d) <= 4;
          if (!toTonic && !nextDom && !third) res.add("leaptone", "error", j, sl[j].t, lbl, "The leading tone (" + nameOf(n) + ", " + VNAME[v] + ") should rise a half step to the tonic" + (v === "A" || v === "T" ? " (or, in an inner voice over V to I, fall a third to scale degree 5)" : "") + ".", v);
        }
        if (ch.seventh && pc(n.midi) === ch.pcs[3] && !same && on(opts, "seventh")) {
          var k331 = ch.deg === 4 && ch.fig === "43" && !ch.secondary && pvc && pvc.isTonic && nx && nx.isTonic && nx.fig === "6" && (d === 1 || d === 2) && pc(n.midi) === ch.pcs[3];   // I - V4/3 - I6, the close of Mozart K. 331 I (the book's one exception)
          if (!(d === -1 || d === -2) && !k331) res.add("seventh", "error", j, sl[j].t, lbl, "The seventh of " + ch.rn + " (" + nameOf(n) + ", " + VNAME[v] + ") should resolve down by step.", v);
        }
        if (ch.borrowed6 != null && pc(n.midi) === ch.borrowed6 && !same && on(opts, "borrowed6")) {
          if (!(d === -1 || d === -2)) res.add("borrowed6", "error", j, sl[j].t, lbl, "In a borrowed chord, scale degree 6 (" + nameOf(n) + ", " + VNAME[v] + ") resolves down by step.", v);
        }
      });
    });
    // N6: its root is b2, which resolves down to the nearest note of the next chord (to 1 or 7 over V); check voices carrying the root
    sl.forEach(function (s, i) {
      var ch = chords[i]; if (!ch || !s.rn || !ch.neapolitan || !on(opts, "neapolitan")) return;
      var j = nextStruct(i); if (j < 0) return;
      voices.forEach(function (v) {
        var n = s.n[v], t = sl[j].n[v]; if (!n || !t || !isTone[i][v] || pc(n.midi) !== ch.root) return;
        if (!(t.midi < n.midi && n.midi - t.midi <= 2)) res.add("neapolitan", "error", j, sl[j].t, res.where(sl[j].t), "The Neapolitan's root (scale degree b2, " + VNAME[v] + ") resolves down to the nearest note of the next chord.", v);
      });
    });
    // melody rules on the notes that are chord tones
    if (on(opts, "melody")) voices.forEach(function (v) {
      var seq = []; sl.forEach(function (s, i) { if (s.n[v] && isTone[i][v] && s.rn) seq.push({ n: s.n[v], i: i }); });
      for (var k = 1; k < seq.length; k++) {
        var p = seq[k - 1].n, n = seq[k].n, semis = n.midi - p.midi, ds = n.dia - p.dia, ad = Math.abs(semis), adia = Math.abs(ds), i = seq[k].i;
        var augd = (adia === 1 && ad === 3) || (adia === 3 && ad === 6) || (adia === 4 && ad === 8) || (adia === 5 && ad === 10) || (adia === 2 && ad === 5);
        var dimd = (adia === 3 && ad === 4) || (adia === 4 && ad === 6) || (adia === 6 && ad === 9) || (adia === 5 && ad === 7) || (adia === 2 && ad === 2) || (adia === 7 && ad === 11);
        if (augd) res.add("melody", "error", i, sl[i].t, W(i), "The " + VNAME[v] + " has an augmented interval (" + nameOf(p) + " to " + nameOf(n) + "); avoid it.", v);
        else if (dimd && adia > 1 && !(chords[seq[k - 1].i] && chords[seq[k - 1].i].neapolitan)) res.add("melody", v === "B" ? "warn" : "error", i, sl[i].t, W(i), "The " + VNAME[v] + " leaps a diminished interval (" + nameOf(p) + " to " + nameOf(n) + ").", v);
        if (k + 1 < seq.length) {
          var nx = seq[k + 1].n, s2 = nx.midi - n.midi, big = adia > 3 && ad > 5 || dimd && adia > 1;
          if (big && !(chords[seq[k - 1].i] && chords[seq[k - 1].i].neapolitan) && Math.sign(s2) === Math.sign(semis) && s2 !== 0) res.add("melody", v === "B" ? "warn" : "error", seq[k + 1].i, sl[seq[k + 1].i].t, res.where(sl[seq[k + 1].i].t), "The " + VNAME[v] + " leaps more than a fourth (" + nameOf(p) + " to " + nameOf(n) + ") and should then change direction.", v);
          if (adia > 1 && Math.abs(s2) > 2 && Math.sign(s2) === Math.sign(semis) && Math.abs(nx.dia - n.dia) > 1) {
            var set = [pc(p.midi), pc(n.midi), pc(nx.midi)].sort(function (a, b) { return a - b; }), tri = false;
            for (var r = 0; r < 3 && !tri; r++) { var x = set[r], y = set[(r + 1) % 3], z = set[(r + 2) % 3]; var i1 = pc(y - x), i2 = pc(z - y); if ((i1 === 3 || i1 === 4) && (i2 === 3 || i2 === 4)) tri = true; }
            if (!tri) res.add("melody", "warn", seq[k + 1].i, sl[seq[k + 1].i].t, res.where(sl[seq[k + 1].i].t), "Two leaps in the same direction in the " + VNAME[v] + " should outline a triad (" + nameOf(p) + ", " + nameOf(n) + ", " + nameOf(nx) + ").", v);
          }
        }
      }
    });
    // double neighbors: a chord tone, a step to one side, a leap of a third to the other side, a step back to the first note
    var dn = {};
    voices.forEach(function (v) {
      for (var i = 1; i + 2 < sl.length; i++) {
        var p = sl[i - 1].n[v], n1 = sl[i].n[v], n2 = sl[i + 1].n[v], q = sl[i + 2].n[v];
        if (!p || !n1 || !n2 || !q || isTone[i][v] || isTone[i + 1][v] || p.midi !== q.midi) continue;
        if (stepSize(p, n1) === 1 && stepSize(n2, q) === 1 && Math.abs(n1.dia - n2.dia) === 2 && (n1.midi - p.midi) * (n2.midi - p.midi) < 0) { dn[v + i] = dn[v + (i + 1)] = true; }
      }
    });
    // chord tones and non-chord tones
    sl.forEach(function (s, i) {
      var ch = chords[i], nctHere = [];
      if (!ch) return;
      voices.forEach(function (v) {
        var n = s.n[v]; if (!n || isTone[i][v]) return;
        var p = i > 0 ? sl[i - 1].n[v] : null, q = i + 1 < sl.length ? sl[i + 1].n[v] : null, nxc = i + 1 < sl.length ? chords[i + 1] : null;
        var accented = !!s.rn || (s.t % 1 === 0 && false);
        var inNext = q && nxc ? fnOf(nxc, n.midi) >= 0 && i + 1 < sl.length && !!sl[i + 1].rn : false;
        var type = dn[v + i] ? "double neighbor" : nctType(p, n, q, !!s.rn || (s.t % bpb === 0), inNext);
        if (!type && on(opts, "chordtone")) res.add("chordtone", "error", i, s.t, W(i), "The " + VNAME[v] + " note " + nameOf(n) + " is not in " + ch.rn + " and is not a passing tone, neighbor, double neighbor, appoggiatura, escape tone, anticipation, suspension, retardation or pedal point (approached by " +
          (p ? (p.midi === n.midi ? "the same note" : stepSize(p, n) === 1 ? "step" : "leap") : "nothing") + ", left by " + (q ? (q.midi === n.midi ? "the same note" : stepSize(n, q) === 1 ? "step" : "leap") : "nothing") + ").", v);
        if (type) { res.ncts.push({ voice: v, slice: i, type: type }); nctHere.push(v); }
      });
      if (nctHere.length > 1 && on(opts, "nctsame")) {
        var u = nctHere[0], l = nctHere[1], nu = s.n[u], nl = s.n[l], c = pc(nu.midi - nl.midi);
        if (!(nctHere.length === 2 && (c === 3 || c === 4 || c === 8 || c === 9))) res.add("nctsame", "warn", i, s.t, W(i), "Non-chord tones in " + nctHere.join(" and ") + " at once: avoid it unless they move in parallel thirds or sixths.", nctHere.join("-"));
      }
    });
    res.errors.sort(function (a, b) { return a.t - b.t || (a.sev === "error" ? -1 : 1); });
    return res;
  }

  // ---- species counterpoint
  var CONS = { 0: 1, 3: 1, 4: 1, 7: 1, 8: 1, 9: 1 };
  function generic(a, b) { return (Math.abs(a.dia - b.dia) % 7) + 1; }   // 1..7, octave = 1 (use with care)
  function ivNum(lo, up) { var d = up.dia - lo.dia; return d === 0 ? 1 : (d % 7 === 0 ? 8 : (d % 7) + 1); }
  function leapOK(p, n) {
    var semis = n.midi - p.midi, a = Math.abs(semis), dd = Math.abs(n.dia - p.dia);
    if (dd <= 1) return a === 0 || a === 1 || a === 2;   // step (not augmented 2nd)
    if (dd === 2) return a === 3 || a === 4;
    if (dd === 3) return a === 5;
    if (dd === 4) return a === 7;
    if (dd === 5) return semis === 8;   // ascending minor sixth only
    if (dd === 7) return a === 12;
    return false;
  }
  function species(spec, opts) {
    opts = opts || {};
    if ((spec.species || 1) >= 3) return species345(spec, opts);
    var sp = spec.species || 1, lowerCF = spec.cfPos !== "upper", res = Result(sp === 1 ? 1 : 1);
    res.where = function (t) { return "bar " + (t + 1); };
    var cf = spec.cf.map(parseNote), N = cf.length;
    var cp = spec.cp.map(function (b) { return Array.isArray(b) ? b.map(parseNote) : [parseNote(b)]; });
    if (cp.length !== N) { res.add("species", "error", 0, 0, "", "The counterpoint has " + cp.length + " bars but the cantus firmus has " + N + "."); return res; }
    var down = cp.map(function (b) { return b[0]; });   // the note on each downbeat (null if a half rest)
    var low = function (a, b) { return lowerCF ? { lo: a, up: b } : { lo: b, up: a }; };
    var ivSemis = function (c, cp1) { return lowerCF ? cp1.midi - c.midi : c.midi - cp1.midi; };
    var phry = /phryg/i.test(spec.mode || "");
    var cfn = function (i) { return cf[i]; };
    // melody of the counterpoint: all sounding notes in order
    var seq = []; cp.forEach(function (b, i) { b.forEach(function (n, k) { if (n) seq.push({ n: n, bar: i, k: k }); }); });
    // beginning / end
    var first = seq[0];
    var f0 = first ? ivSemis(cf[0], first.n) : null;
    if (first && on(opts, "species") && pc(f0) !== 0) res.add("species", "error", 0, 0, "bar 1", "Begin with an octave or a unison against the cantus firmus.");
    if (sp === 2 && cp[0].length === 2 && cp[0][0] === null && !cp[0][1]) res.add("species", "error", 0, 0, "bar 1", "Bar 1 needs a half note on beat 3 after the half rest.");
    var last = down[N - 1], lastIv = last ? ivSemis(cf[N - 1], last) : null;
    if (!last) res.add("species", "error", N - 1, N - 1, "bar " + N, "End on a whole note.");
    else if (pc(lastIv) !== 0) res.add("species", "error", N - 1, N - 1, "bar " + N, "End on an octave or a unison.");
    if (sp === 2 && cp[N - 1].length !== 1) res.add("species", "error", N - 1, N - 1, "bar " + N, "The last bar is one whole note.");
    // first species: approach end by contrary motion, 7-8 and 2-1
    if (last && N >= 2) {
      var pl = sp === 1 ? down[N - 2] : cp[N - 2][1] || cp[N - 2][0];
      if (sp === 1 && pl) {
        var dc = cf[N - 1].midi - cf[N - 2].midi, dp = last.midi - pl.midi;
        if (!(dc * dp < 0)) res.add("species", "error", N - 1, N - 1, "bar " + N, "Approach the final octave or unison by contrary motion.");
        else {
          // one part rises a half step (7 to 8) and the other falls a step (2 to 1): both parts can be either voice
          var rise = dp > 0 ? dp : dc, fall = dp > 0 ? dc : dp;
          if (!((rise === 1 || (phry && rise === 2)) && (fall === -2 || fall === -1))) res.add("species", "error", N - 1, N - 1, "bar " + N, "End with 7 to 8 (a half step up, using the raised leading tone) in one voice and 2 to 1 in the other.");
        }
      }
      if (sp === 2) {
        var pb = cp[N - 2];
        if (pb.length === 2 && pb[0] && pb[1]) {
          var i1 = ivNum(low(cf[N - 2], pb[0]).lo, low(cf[N - 2], pb[0]).up), i2 = ivNum(low(cf[N - 2], pb[1]).lo, low(cf[N - 2], pb[1]).up);
          var gi = function (x) { return x > 8 ? ((x - 1) % 7) + 1 : x; };
          i1 = gi(i1); i2 = gi(i2);
          var want = lowerCF ? [5, 6] : (phry ? [6, 3] : [5, 3]);
          var rs = last.midi - pb[1].midi;
          if (!(rs === 1 || (phry && rs === 2))) res.add("species", "error", N - 2, N - 2, "bar " + (N - 1) + ", beat 3", "The last half note before the end must rise a half step to the final (the raised leading tone; 7 to 8).");
          if (!(i1 === want[0] && i2 === want[1])) res.add("species", "error", N - 2, N - 2, "bar " + (N - 1), "The bar before the end should be a " + want[0] + "th and a " + (want[1] === 3 ? "3rd" : want[1] + "th") + " above/below the cantus firmus (" + (lowerCF ? "cf lower: 5th then 6th" : phry ? "Phrygian, cf upper: 6th then 3rd" : "cf upper: 5th then 3rd") + "); here " + i1 + " then " + i2 + ".");
        }
      }
    }
    // consonance and dissonance
    var runs = { c: 0, kind: null };
    cp.forEach(function (b, i) {
      b.forEach(function (n, k) {
        if (!n) return;
        if ((lowerCF && n.midi < cf[i].midi) || (!lowerCF && n.midi > cf[i].midi)) res.add("species", "error", i, i, "bar " + (i + 1) + (k ? ", beat 3" : ""), "The counterpoint should stay " + (lowerCF ? "above" : "below") + " the cantus firmus (voice crossing).");
        var m = ivSemis(cf[i], n), cons = !!CONS[pc(m)] && !(Math.abs(m) < 0);
        if (!cons) {
          if (sp === 2 && k === 1) {
            var p = b[0], q = i + 1 < N ? (cp[i + 1][0]) : null;
            var passing = p && q && stepSize(p, n) === 1 && stepSize(n, q) === 1 && ((n.midi > p.midi) === (q.midi > n.midi));
            if (!passing) res.add("species", "error", i, i, "bar " + (i + 1) + ", beat 3", "The second half note makes a dissonance (" + nameIv(m) + ") that is not a passing tone. Dissonance is allowed only as a passing tone, approached and left by step in the same direction.");
          } else res.add("species", "error", i, i, "bar " + (i + 1) + (k ? ", beat 3" : ""), "A " + nameIv(m) + " against the cantus firmus is a dissonance; use unisons, 3rds, 5ths, 6ths, 8ves.");
        }
      });
    });
    function nameIv(m) { var c = pc(m); return { 1: "minor 2nd", 2: "2nd", 5: "4th", 6: "tritone", 10: "7th", 11: "7th" }[c] || "interval"; }
    // motion into each downbeat (perfect consonances only by contrary motion); runs of 3rds / 6ths
    var prevNote = null, prevCF = null, run = 0, runKind = null;
    for (var i = 0; i < N; i++) {
      var cur = down[i], pn = i > 0 ? (cp[i - 1][cp[i - 1].length - 1]) : null, pcf = i > 0 ? cf[i - 1] : null;
      if (cur && pn && pcf) {
        var dpv = cur.midi - pn.midi, dcf = cf[i].midi - pcf.midi, m = ivSemis(cf[i], cur), perfect = pc(m) === 0 || pc(m) === 7;
        if (perfect && !(dpv * dcf < 0)) res.add("species", "error", i, i, "bar " + (i + 1), "A " + (pc(m) === 0 ? "unison/octave" : "fifth") + " must be approached by contrary motion (this is " + (dpv === 0 || dcf === 0 ? "oblique" : "similar") + " motion: a direct " + (pc(m) === 0 ? "octave" : "fifth") + ").");
        if (sp === 2 && cur.midi === pn.midi) res.add("species", "error", i, i, "bar " + (i + 1), "Do not repeat a note across the barline.");
      }
      if (sp === 1 && cur && i > 0 && down[i - 1] && cur.midi === down[i - 1].midi) res.add("species", "warn", i, i, "bar " + (i + 1), "A repeated note: a flowing melody avoids repeating notes.");
      if (cur) {
        var mm = pc(ivSemis(cf[i], cur)), kind = (mm === 3 || mm === 4) ? "3rds" : (mm === 8 || mm === 9) ? "6ths" : null;
        if (kind && kind === runKind) run++; else run = kind ? 1 : 0; runKind = kind;
        if (kind && run > 3 && sp === 1) res.add("species", "error", i, i, "bar " + (i + 1), "More than three " + kind + " in a row.");
      }
      if (sp === 2 && i > 0 && cur && down[i - 1]) {
        var m1 = ivSemis(cf[i], cur), m0 = ivSemis(cf[i - 1], down[i - 1]);
        if ((pc(m1) === 0 && pc(m0) === 0) || (pc(m1) === 7 && pc(m0) === 7)) {
          var leap4 = cp[i - 1].length === 2 && cp[i - 1][1] && Math.abs(cp[i - 1][1].dia - down[i - 1].dia) === 3 && Math.abs(cp[i - 1][1].midi - down[i - 1].midi) === 5;
          if (!leap4) res.add("species", "error", i, i, "bar " + (i + 1), (pc(m1) === 0 ? "Octaves" : "Fifths") + " on consecutive downbeats; allowed only if a leap of a fourth follows the first one.");
        }
      }
    }
    // melodic rules over the whole line
    for (var k = 1; k < seq.length; k++) {
      var p = seq[k - 1].n, n = seq[k].n, semis = n.midi - p.midi, bar = seq[k].bar, tag = "bar " + (bar + 1) + (seq[k].k ? ", beat 3" : "");
      if (!leapOK(p, n)) res.add("species", "error", bar, bar, tag, "The leap " + nameOf(p) + " to " + nameOf(n) + " is not allowed: only 3rds, 4ths, 5ths, ascending minor 6ths and 8ves (and steps, never an augmented 2nd).");
      if (k + 1 < seq.length) {
        var nx = seq[k + 1].n, s2 = nx.midi - n.midi;
        if (Math.abs(semis) > 5 && Math.abs(n.dia - p.dia) > 1 && Math.sign(s2) === Math.sign(semis)) res.add("species", "error", seq[k + 1].bar, seq[k + 1].bar, "bar " + (seq[k + 1].bar + 1), "After a leap larger than a 4th, change direction.");
      }
    }
    // outlined tritone: turning points
    var pts = [seq[0] && seq[0].n]; for (var k2 = 1; k2 < seq.length - 1; k2++) { var a1 = seq[k2].n.midi - seq[k2 - 1].n.midi, b1 = seq[k2 + 1].n.midi - seq[k2].n.midi; if (a1 * b1 < 0) pts.push(seq[k2].n); } pts.push(seq.length ? seq[seq.length - 1].n : null);
    for (var k3 = 1; k3 < pts.length; k3++) if (pts[k3 - 1] && pts[k3] && Math.abs(pts[k3].midi - pts[k3 - 1].midi) === 6) res.add("species", "error", 0, 0, "melody", "The line outlines a tritone between two turning points (" + nameOf(pts[k3 - 1]) + " and " + nameOf(pts[k3]) + ").");
    res.errors.sort(function (a, b) { return a.t - b.t; });
    return res;
  }


  // ---- species 3-5 (ch. 30). cp bars: third = ["A4","G4","F4","G4"] (last bar "D4"), fourth = [null|"A4", "G4"] (a rest or the tied note first),
  // fifth = "A4:2 G4:1 F4:1" or ["A4:2","G4:1",...] (:d = quarter notes, default 4 / the number of notes in the bar; "r:2" a rest)
  function eventsOf(sp, cp) {
    var bars = cp.map(function (b) {
      var arr = Array.isArray(b) ? b : (typeof b === "string" && /\s/.test(b.trim()) ? b.trim().split(/\s+/) : [b]);
      var ev = arr.map(function (t) {
        var d = 4 / arr.length, name = t;
        if (typeof t === "string" && t.indexOf(":") >= 0) { var q = t.split(":"); name = q[0]; d = +q[1]; }
        return { n: (name == null || name === "" || name === "r") ? null : parseNote(name), d: d };
      });
      return ev;
    });
    bars.forEach(function (b, i) { var l = b[b.length - 1], nx = bars[i + 1]; if (l.n && nx && nx[0].n && nx[0].n.midi === l.n.midi) l.tie = true; });
    return bars;
  }
  function species345(spec, opts) {
    opts = opts || {};
    var sp = spec.species, lowerCF = spec.cfPos !== "upper", res = Result(1), phry = /phryg/i.test(spec.mode || "");
    res.where = function (t) { return "bar " + (t + 1); };
    var cf = spec.cf.map(parseNote), N = cf.length, bars = eventsOf(sp, spec.cp), flat = [];
    if (bars.length !== N) { res.add("species", "error", 0, 0, "", "The counterpoint has " + bars.length + " bars but the cantus firmus has " + N + "."); return res; }
    bars.forEach(function (b, i) { var st = 0; b.forEach(function (e) { e.bar = i; e.start = st; st += e.d; flat.push(e); }); if (st !== 4) res.add("species", "error", i, i, "bar " + (i + 1), "Bar " + (i + 1) + " adds up to " + st + " beats, not 4."); });
    var tonic = cf[N - 1];
    var semi = function (e) { return lowerCF ? e.n.midi - cf[e.bar].midi : cf[e.bar].midi - e.n.midi; };
    var gen = function (e) { return ((((lowerCF ? e.n.dia - cf[e.bar].dia : cf[e.bar].dia - e.n.dia)) % 7) + 7) % 7 + 1; };
    var tag = function (e) { return "bar " + (e.bar + 1) + (e.start ? ", beat " + (e.start + 1) : ""); };
    var bad = function (e, msg) { res.add("species", "error", e.bar, e.bar, tag(e), msg); };
    var prevS = function (k) { return k > 0 && flat[k - 1].n ? flat[k - 1] : null; }, nextS = function (k) { return k + 1 < flat.length && flat[k + 1].n ? flat[k + 1] : null; };
    var NM = { 1: "minor 2nd", 2: "2nd", 5: "4th", 6: "tritone", 10: "7th", 11: "7th" };
    if (sp === 4 && !lowerCF) res.add("species", "error", 0, 0, "bar 1", "In this chapter fourth species is written with the cantus firmus in the lower voice.");
    // beginning and ending
    var f0 = flat[0];
    if (sp === 4) { if (f0.n || f0.d !== 2) bad(f0, "Start with a half rest, then a half note an octave above the cantus firmus."); else if (flat[1] && flat[1].n && semi(flat[1]) !== 12) bad(flat[1], "The first half note is an octave above the cantus firmus."); }
    else { var fsn = flat.filter(function (e) { return e.n; })[0]; if (fsn && pc(semi(fsn)) !== 0) bad(fsn, "Begin with an octave or a unison against the cantus firmus."); if (!f0.n && sp === 3) bad(f0, "Begin on beat 1."); }
    var lastB = bars[N - 1], le = lastB[0];
    if (lastB.length !== 1 || le.d !== 4 || !le.n) res.add("species", "error", N - 1, N - 1, "bar " + N, "End on a whole note.");
    else if (pc(semi(le)) !== 0) bad(le, "End on an octave or a unison.");
    if (le && le.n && N >= 2) {
      var k0 = flat.indexOf(le), pe = null; for (var z = k0 - 1; z >= 0; z--) if (flat[z].n) { pe = flat[z]; break; }
      if (pe) { var rs = le.n.midi - pe.n.midi; if (!(rs === 1 || (phry && rs === 2))) bad(pe, "The note before the final must rise a half step to it (the raised leading tone; 7 to 8)."); }
      var pb = bars[N - 2], deg = function (e) { return ((((e.n.dia - tonic.dia) % 7) + 7) % 7) + 1; };
      if (sp === 3) {
        if (pb.length !== 4 || pb.some(function (e) { return !e.n; })) res.add("species", "error", N - 2, N - 2, "bar " + (N - 1), "The bar before the end has four quarter notes.");
        else { var ds = pb.map(deg).join(" "), okf = lowerCF ? (ds === "4 5 6 7" || ds === "2 1 6 7") : ds === "7 5 6 7"; if (!okf) res.add("species", "error", N - 2, N - 2, "bar " + (N - 1), "The bar before the end should go " + (lowerCF ? "4 5 6 7 or the cambiata 2 1 6 7" : "7 5 6 7") + " in scale degrees; this is " + ds + "."); }
      }
      if (sp === 4) {
        if (pb.length !== 2 || !pb[0].n || !pb[1].n) res.add("species", "error", N - 2, N - 2, "bar " + (N - 1), "The bar before the end is two half notes: a 7-6 suspension.");
        else if (!(gen(pb[0]) === 7 && gen(pb[1]) === 6)) res.add("species", "error", N - 2, N - 2, "bar " + (N - 1), "The bar before the end should have a 7-6 suspension (a 7th over the cantus firmus, then a 6th); here " + gen(pb[0]) + " then " + gen(pb[1]) + ".");
      }
    }
    if (sp === 4) for (var bi = 0; bi + 2 < N; bi++) { var lb = bars[bi][bars[bi].length - 1], fb = bars[bi + 1][0]; if (!lb.n || !fb.n || lb.n.midi !== fb.n.midi) res.add("species", "error", bi + 1, bi + 1, "bar " + (bi + 2), "Tie the half note on beat 3 of bar " + (bi + 1) + " to the first half note of bar " + (bi + 2) + "."); }
    // each event
    flat.forEach(function (e, k) {
      if (!e.n) return;
      if ((lowerCF && e.n.midi < cf[e.bar].midi) || (!lowerCF && e.n.midi > cf[e.bar].midi)) bad(e, "The counterpoint should stay " + (lowerCF ? "above" : "below") + " the cantus firmus.");
      var cons = !!CONS[pc(semi(e))], p = prevS(k), q = nextS(k), tied = e.start === 0 && p && p.bar === e.bar - 1 && p.n.midi === e.n.midi;
      if (cons) return;
      var what = "A " + (NM[pc(semi(e))] || "dissonant interval") + " against the cantus firmus";
      if (e.start === 0 && sp === 3) return bad(e, what + " on the downbeat: each downbeat must be a consonance.");
      if (sp === 4 && e.start === 2) return bad(e, what + " on beat 3: the half note on beat 3 is always a consonance.");
      if (e.start === 0) {   // downbeat dissonance: only a tied suspension (4-3, 7-6), resolving down by step
        if (!tied) return bad(e, what + " on the downbeat is allowed only as a suspension tied over the barline.");
        var g = gen(e); if (g === 2) return bad(e, "A 9-8 or 2-1 suspension is not allowed here; use 4-3 or 7-6.");
        if (!(q && q.n.dia === e.n.dia - 1 && q.n.midi < e.n.midi)) return bad(e, "A suspension resolves down by step.");
        return;
      }
      if (sp === 4) return;
      // weak-beat dissonance: passing tone, (fifth species) neighbor tone, or cambiata
      var passing = p && q && stepSize(p.n, e.n) === 1 && stepSize(e.n, q.n) === 1 && ((e.n.midi > p.n.midi) === (q.n.midi > e.n.midi));
      var neighbor = sp === 5 && p && q && stepSize(p.n, e.n) === 1 && q.n.midi === p.n.midi;
      var r = k + 2 < flat.length && flat[k + 2].n ? flat[k + 2] : null;
      var cambiata = p && q && r && e.n.dia === p.n.dia - 1 && e.n.midi < p.n.midi && q.n.dia === e.n.dia - 2 && q.n.midi < e.n.midi && r.n.dia === q.n.dia + 1 && r.n.midi > q.n.midi;
      if (e.d > 1 && sp === 5 && !passing) return bad(e, what + " is allowed only on a quarter note, as a passing tone, neighbor tone or cambiata (or a tied suspension on the downbeat).");
      if (!(passing || neighbor || cambiata)) bad(e, what + " must be a passing tone" + (sp === 5 ? ", a neighbor tone" : "") + " or the cambiata (reached and left in the ways the book allows).");
    });
    // motion into downbeats, repeated notes, leaps
    flat.forEach(function (e, k) {
      if (!e.n) return; var p = prevS(k);
      if (!p) return;
      var tied = e.start === 0 && p.bar === e.bar - 1 && p.n.midi === e.n.midi;
      if (sp === 3 && tied) bad(e, "Do not repeat a note across the barline.");
      if (e.start === 0 && !tied && e.bar > 0) {
        var m = pc(semi(e)), dpv = e.n.midi - p.n.midi, dcf = cf[e.bar].midi - cf[p.bar].midi;
        if ((m === 0 || m === 7) && !(dpv * dcf < 0)) bad(e, "A " + (m === 0 ? "unison/octave" : "fifth") + " on the downbeat must be approached by contrary motion (a direct " + (m === 0 ? "octave" : "fifth") + " otherwise).");
        if (sp === 3 && dpv === 0) bad(e, "Do not repeat a note across the barline.");
      }
      if (!tied && p.n.midi !== e.n.midi && !leapOK(p.n, e.n)) bad(e, "The leap " + nameOf(p.n) + " to " + nameOf(e.n) + " is not allowed: only 3rds, 4ths, 5ths, ascending minor 6ths and 8ves (and steps, never an augmented 2nd).");
      var nx = nextS(k);
      if (nx && p.n.midi !== e.n.midi && Math.abs(e.n.midi - p.n.midi) > 5 && Math.abs(e.n.dia - p.n.dia) > 1 && nx.n.midi !== e.n.midi && Math.sign(nx.n.midi - e.n.midi) === Math.sign(e.n.midi - p.n.midi)) bad(nx, "After a leap larger than a 4th, change direction.");
    });
    var line = flat.filter(function (e) { return e.n; }).map(function (e) { return e.n; }).filter(function (n, i, a) { return i === 0 || n.midi !== a[i - 1].midi; });
    var pts = [line[0]]; for (var u = 1; u < line.length - 1; u++) if ((line[u].midi - line[u - 1].midi) * (line[u + 1].midi - line[u].midi) < 0) pts.push(line[u]); pts.push(line[line.length - 1]);
    for (var w = 1; w < pts.length; w++) if (pts[w - 1] && pts[w] && Math.abs(pts[w].midi - pts[w - 1].midi) === 6) res.add("species", "error", 0, 0, "melody", "The line outlines a tritone between two turning points (" + nameOf(pts[w - 1]) + " and " + nameOf(pts[w]) + ").");
    res.errors.sort(function (a, b) { return a.t - b.t; });
    return res;
  }

  var API = { check: check, species: species, eventsOf: eventsOf, parseRN: parseRN, parseNote: parseNote, parseKey: parseKey, nctType: nctType, RANGES: RANGES, RANGE_NAMES: RANGE_NAMES, CH: CH,
    RULES: Object.keys(CH) };
  g.VoiceLeading = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
