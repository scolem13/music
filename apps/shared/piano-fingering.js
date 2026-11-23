// piano-fingering.js — right-hand melody fingering for piano, several systems to choose from (global PianoFingering).
// Used by Piano: Songs with 1, 2 or 3 Chords (practice/piano-chord-songs.qmd) and the Melody Fingering Lab artifact
// (https://claude.ai/artifact/SdAdM64r8QepPXyMmGBZwN, built from this file by scripts/fingering-lab/build.mjs).
//
// PianoFingering.notes(body, kLine) reads ABC note text (one voice, key from the K: line) ->
//   [{ midi, step, at, cont, bar }]: at = index in body of the note (where !n! goes), cont = tied on from the note before
//   (it keeps that finger and gets no number), step = staff step (7 a octave, C4 = 28), bar = bar index ("|" counted).
//   Grace notes, decorations, chord symbols and quoted text are skipped; in a [chord] the top note is the melody.
// PianoFingering.shifts(played, f) -> [bool]: the finger last played another key (shown bold / coloured, or alone).
// PianoFingering.finger(notes, system, opts) -> { f: [finger per note], move: [true where the hand moves] }
//   for the notes that are not tied on (notes.filter(n => !n.cont)). opts.fixed = { index: finger } overrides
//   (finger numbers the player typed); with "rules" they are locks and the rest is solved around them.
// Systems (SYSTEMS has the names shown to people):
//   home      Home position: the thumb stays on the tune's lowest note, one finger a step (C..G = 1..5). A 6th step is
//             reached with 5 while 4 shifts up to the 5th step, only in the run of notes that goes up there; elsewhere
//             the 5th step is 5 again (the teacher's Twinkle: 11 44 55 4 | 44 33 22 1 | 5544332). Wider tunes are cut
//             into pieces that fit, each with the hand moved to its lowest note.
//   scale     Scale fingers: each note gets its finger in the right-hand major scale of the key signature (C major:
//             C D E F G A B = 1 2 3 1 2 3 4; Twinkle = 1 1 2 2 3 3 2). A note outside the key takes its letter's finger.
//             The table is the usual one from scale books, written here from memory: UNVERIFIED until checked
//             against a scale book and added to scripts/works-cited.py.
//   positions Five-finger positions (the page's first rule): five staff steps a position, the thumb on the lowest, a new
//             position when the next note does not fit.
//   rules     Least effort: the fingering with the fewest points under the twelve rules of Parncutt, Sloboda, Clarke,
//             Raekallio & Desain (1997), "An Ergonomic Model of Keyboard Fingering for Melodic Fragments", Music
//             Perception 14.4, pp. 341-382 (spans Table 1 p. 346, rules pp. 349-360), plus the site's "repeated note
//             keeps its finger" (the paper leaves repeated notes out). opts.weights / opts.spans / opts.hand change it.
(function (global) {
  "use strict";
  var STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, LET = "CDEFGAB";
  // ---- key signatures ----
  var TONIC_FIFTHS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
  var MODE_SHIFT = { "": 0, maj: 0, ion: 0, lyd: 1, mix: -1, dor: -2, m: -3, min: -3, aeo: -3, phr: -4, loc: -5 };
  function fifthsOf(kLine) {
    var k = String(kLine || "").replace(/^\s*K:\s*/, "").trim(), m = /^([A-G])([#b]?)\s*([A-Za-z]*)/.exec(k);
    if (!m) return 0;
    var t = TONIC_FIFTHS[m[1] + m[2]]; if (t == null) return 0;
    var mode = m[3].toLowerCase().slice(0, 3); if (mode === "mi" || mode === "m") mode = "m";
    if (m[3] === "m" || /^min/.test(m[3].toLowerCase())) mode = "m";
    var sh = MODE_SHIFT[mode]; return t + (sh == null ? 0 : sh);
  }
  function keyAcc(fifths) {   // letter -> -1 / 0 / +1
    var a = {}; LET.split("").forEach(function (l) { a[l] = 0; });
    if (fifths > 0) "FCGDAEB".slice(0, fifths).split("").forEach(function (l) { a[l] = 1; });
    if (fifths < 0) "BEADGCF".slice(0, -fifths).split("").forEach(function (l) { a[l] = -1; });
    return a;
  }
  // ---- reading the notes ----
  function notes(body, kLine) {
    var ka = keyAcc(fifthsOf(kLine)), out = [], bar = 0, barAcc = {}, tie = false, i = 0, s = String(body), inChord = false, chordNotes = null;
    var noteRe = /^(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)(\d*\/*\d*)/;
    while (i < s.length) {
      var c = s[i];
      if (c === '"') { var e = s.indexOf('"', i + 1); i = e < 0 ? s.length : e + 1; continue; }
      if (c === "!" || c === "+") { var e2 = s.indexOf(c, i + 1); if (e2 > i) { i = e2 + 1; continue; } i++; continue; }
      if (c === "{") { var e3 = s.indexOf("}", i + 1); i = e3 < 0 ? s.length : e3 + 1; continue; }
      if (c === "%") { var e4 = s.indexOf("\n", i); i = e4 < 0 ? s.length : e4 + 1; continue; }
      if (c === "|" || c === ":") { if (c === "|") { bar++; barAcc = {}; } i++; continue; }
      if (c === "[" && /^\[[A-Za-z]:/.test(s.slice(i))) { var e5 = s.indexOf("]", i); i = e5 < 0 ? s.length : e5 + 1; continue; }   // inline field
      if (c === "[" && /^\[\d/.test(s.slice(i))) { i++; continue; }   // ending number
      if (c === "[") { inChord = true; chordNotes = []; i++; continue; }
      if (c === "]" && inChord) {
        inChord = false; var top = chordNotes.sort(function (a, b) { return b.midi - a.midi; })[0];
        i++; var rest = /^(\d*\/*\d*)(-?)/.exec(s.slice(i)); i += rest[0].length;
        if (top) { top.cont = tie; out.push(top); tie = !!rest[2]; }
        continue;
      }
      if (c === "z" || c === "x" || c === "Z") { var r = /^[zxZ]\d*\/*\d*/.exec(s.slice(i)); i += r[0].length; tie = false; continue; }
      var m = noteRe.exec(s.slice(i));
      if (m) {
        var L = m[2].toUpperCase(), oct = 4 + (m[2] !== L ? 1 : 0);
        for (var q = 0; q < m[3].length; q++) oct += m[3][q] === "'" ? 1 : -1;
        var key = L + oct, acc;
        if (m[1]) { acc = m[1][0] === "^" ? m[1].length : m[1][0] === "_" ? -m[1].length : 0; barAcc[key] = acc; }
        else acc = barAcc[key] != null ? barAcc[key] : ka[L];
        var n = { midi: 12 * (oct + 1) + STEP[L] + acc, step: 7 * oct + LET.indexOf(L), at: i, bar: bar };
        i += m[0].length;
        var tied = s[i] === "-"; if (tied) i++;
        if (inChord) { chordNotes.push(n); continue; }
        n.cont = tie; out.push(n); tie = tied;
        continue;
      }
      i++;
    }
    return out;
  }
  var black = function (m) { return [1, 3, 6, 8, 10].indexOf(((m % 12) + 12) % 12) >= 0; };

  // ---- systems ----
  function fitPieces(ns, width) {   // greedy pieces of at most `width` staff steps; [{from, to, lo}]
    var out = [], i = 0;
    while (i < ns.length) {
      var lo = ns[i].step, hi = lo, j = i + 1;
      while (j < ns.length && Math.max(hi, ns[j].step) - Math.min(lo, ns[j].step) <= width) { lo = Math.min(lo, ns[j].step); hi = Math.max(hi, ns[j].step); j++; }
      out.push({ from: i, to: j, lo: lo, hi: hi }); i = j;
    }
    return out;
  }
  function home(ns) {
    // The thumb stays on the home note (the piece's lowest), C D E F G = 1 2 3 4 5. A 6th step (A over C) is reached by
    // shifting the top of the hand, not the thumb: in a run of notes on the 5th and 6th steps that has a 6th in it, the
    // 5th takes 4 and the 6th 5; anywhere else the 5th is 5 again. So Twinkle: 11 44 55 4 | 44 33 22 1 | 5544332.
    var f = [], move = [];
    fitPieces(ns, 5).forEach(function (p, k) {
      for (var i = p.from; i < p.to; i++) { f[i] = ns[i].step - p.lo + 1; move[i] = k > 0 && i === p.from; }
      if (p.hi - p.lo < 5) return;
      for (var r = p.from; r < p.to;) {
        if (ns[r].step - p.lo < 4) { r++; continue; }
        var e = r, six = false; while (e < p.to && ns[e].step - p.lo >= 4) { if (ns[e].step - p.lo === 5) six = true; e++; }
        for (var j = r; j < e; j++) f[j] = ns[j].step - p.lo === 5 ? 5 : six ? 4 : 5;
        r = e;
      }
    });
    return { f: f, move: move };
  }
  function positions(ns) {   // the page's first rule (piano-chord-songs.js before 2026-11-23)
    var f = [], move = [], lo = null, hi = null;
    ns.forEach(function (n, i) {
      if (lo == null || Math.max(hi, n.step) - Math.min(lo, n.step) > 4) {
        lo = hi = n.step;
        for (var j = i + 1; j < ns.length; j++) { var a = Math.min(lo, ns[j].step), b = Math.max(hi, ns[j].step); if (b - a > 4) break; lo = a; hi = b; }
        move[i] = i > 0;
      } else { lo = Math.min(lo, n.step); hi = Math.max(hi, n.step); move[i] = false; }
      f[i] = n.step - lo + 1;
    });
    return { f: f, move: move };
  }
  // right-hand major scale fingers by pitch class, keyed by the key signature (UNVERIFIED, see the header)
  var SCALE_RH = {
    0: { C: 1, D: 2, E: 3, F: 1, G: 2, A: 3, B: 4 },
    1: { G: 1, A: 2, B: 3, C: 1, D: 2, E: 3, F: 4 },
    2: { D: 1, E: 2, F: 3, G: 1, A: 2, B: 3, C: 4 },
    3: { A: 1, B: 2, C: 3, D: 1, E: 2, F: 3, G: 4 },
    4: { E: 1, F: 2, G: 3, A: 1, B: 2, C: 3, D: 4 },
    5: { B: 1, C: 2, D: 3, E: 1, F: 2, G: 3, A: 4 },
    6: { F: 2, G: 3, A: 4, B: 1, C: 2, D: 3, E: 1 },
    "-1": { F: 1, G: 2, A: 3, B: 4, C: 1, D: 2, E: 3 },
    "-2": { B: 4, C: 1, D: 2, E: 3, F: 1, G: 2, A: 3 },
    "-3": { E: 3, F: 1, G: 2, A: 3, B: 4, C: 1, D: 2 },
    "-4": { A: 3, B: 4, C: 1, D: 2, E: 3, F: 1, G: 2 },
    "-5": { D: 2, E: 3, F: 1, G: 2, A: 3, B: 4, C: 1 },
    "-6": { G: 2, A: 3, B: 4, C: 1, D: 2, E: 3, F: 1 }
  };
  function scale(ns, opts) {
    var fifths = Math.max(-6, Math.min(6, fifthsOf(opts && opts.key))), t = SCALE_RH[fifths] || SCALE_RH[0];
    var f = ns.map(function (n) { return t[LET[((n.step % 7) + 7) % 7]]; });
    return { f: f, move: f.map(function () { return false; }) };
  }

  // ---- the Parncutt et al. (1997) model ----
  var SPANS = { "1-2": [-5, -3, 1, 5, 8, 10], "1-3": [-4, -2, 3, 7, 10, 12], "1-4": [-3, -1, 5, 9, 12, 14], "1-5": [-1, 1, 7, 10, 13, 15],
    "2-3": [1, 1, 1, 2, 3, 5], "2-4": [1, 1, 3, 4, 5, 7], "2-5": [2, 2, 5, 6, 8, 10], "3-4": [1, 1, 1, 2, 2, 4], "3-5": [1, 1, 3, 4, 5, 7], "4-5": [1, 1, 1, 2, 3, 5] };
  var WEIGHTS = { stretch: 1, small: 1, large: 1, pcc: 1, pcs: 1, weak: 1, "345": 1, "3to4": 1, "4black": 1, "1black": 1, "5black": 1, pass: 1,
    repeat: 1, anymove: 0, anypass: 0, black15: 0 };
  function model(opts) {
    opts = opts || {};
    var SP = opts.spans || SPANS, hand = opts.hand || 1, Wt = Object.assign({}, WEIGHTS, opts.weights || {});
    function span(f, g) { return SP[Math.min(f, g) + "-" + Math.max(f, g)].map(function (x) { return Math.round(x * hand); }); }
    function norm(f, g, d) { return f < g ? { s: span(f, g), d: d } : { s: span(g, f), d: -d }; }
    function adder(out, tot) { return function (id, p) { if (!p) return; var v = p * (Wt[id] || 0); if (!v) return; out[id] = (out[id] || 0) + v; tot.t += v; }; }
    function pair(a, b, f, g, out) {
      var d = b.midi - a.midi, tot = { t: 0 }, add = adder(out, tot);
      if (f === g) { if (d !== 0) { out.impossible = Infinity; return Infinity; } return 0; }
      var nn = norm(f, g, d), s = nn.s, x = nn.d, thumb = f === 1 || g === 1;
      if (x < s[0] || x > s[5]) { out.impossible = Infinity; return Infinity; }
      add("stretch", x > s[4] ? 2 * (x - s[4]) : x < s[1] ? 2 * (s[1] - x) : 0);
      add("small", x < s[2] ? (s[2] - x) * (thumb ? 1 : 2) : 0);
      add("large", x > s[3] ? (x - s[3]) * (thumb ? 1 : 2) : 0);
      if (f === 3 && g === 4) add("3to4", 1);
      if ((f === 3 && g === 4 && !black(a.midi) && black(b.midi)) || (f === 4 && g === 3 && black(a.midi) && !black(b.midi))) add("4black", 1);
      if ((f === 1 && g > 1 && d < 0) || (g === 1 && f > 1 && d > 0)) {
        var lo = d < 0 ? b : a, hi = d < 0 ? a : b, loF = d < 0 ? g : f, hiF = d < 0 ? f : g;
        if (black(lo.midi) === black(hi.midi)) add("pass", 1);
        else if (!black(lo.midi) && loF !== 1 && black(hi.midi) && hiF === 1) add("pass", 3);
        add("anypass", 1);
      }
      if (d === 0) add("repeat", 1);
      return tot.t;
    }
    function triple(a, b, c, f1, f2, f3, out) {
      var tot = { t: 0 }, add = adder(out, tot), d = c.midi - a.midi;
      if (f1 === f3) { if (d !== 0) { add("pcc", 1); add("pcs", Math.abs(d)); add("anymove", 1); } }
      else {
        var nn = norm(f1, f3, d), s = nn.s, x = nn.d;
        if (d === 0 && b.midi !== a.midi) { add("pcc", 1); add("anymove", 1); }
        else if (x > s[4] || x < s[1]) {
          var between = (b.midi - a.midi) * (c.midi - b.midi) > 0, full = f2 === 1 && between && (x > s[5] || x < s[0]);
          add("pcc", full ? 2 : 1); add("pcs", x > s[4] ? x - s[4] : s[1] - x); add("anymove", 1);
        }
      }
      if (f1 !== f2 && f2 !== f3 && f1 !== f3 && [f1, f2, f3].every(function (q) { return q >= 3; })) add("345", 1);
      return tot.t;
    }
    function one(ns, i, f, out) {
      var tot = { t: 0 }, add = adder(out, tot), n = ns[i], p = ns[i - 1], q = ns[i + 1];
      if (f >= 4) add("weak", 1);
      if (f === 1 && black(n.midi)) add("1black", 1 + (p && !black(p.midi) ? 2 : 0) + (q && !black(q.midi) ? 2 : 0));
      if (f === 5 && black(n.midi)) add("5black", (p && !black(p.midi) ? 2 : 0) + (q && !black(q.midi) ? 2 : 0));
      if ((f === 1 || f === 5) && black(n.midi)) add("black15", 1);
      return tot.t;
    }
    function explain(ns, F) {
      var per = ns.map(function () { return {}; }), total = 0;
      ns.forEach(function (n, i) {
        total += one(ns, i, F[i], per[i]);
        if (i > 0) total += pair(ns[i - 1], n, F[i - 1], F[i], per[i]);
        if (i > 1) total += triple(ns[i - 2], ns[i - 1], n, F[i - 2], F[i - 1], F[i], per[i]);
      });
      return { per: per, total: total };
    }
    function solve(ns, fixed) {
      var N = ns.length, tmp = {}; if (!N) return [];
      var allowed = function (i) { return fixed && fixed[i] ? [+fixed[i]] : [1, 2, 3, 4, 5]; };
      var D = {};
      allowed(0).forEach(function (g) { D["0," + g] = { c: one(ns, 0, g, tmp), path: [g] }; });
      for (var i = 1; i < N; i++) {
        var E = {}, any = false;
        Object.keys(D).forEach(function (k) {
          var v = D[k], f0 = +k.split(",")[0], f1 = +k.split(",")[1];
          allowed(i).forEach(function (g) {
            var c = v.c + one(ns, i, g, tmp) + pair(ns[i - 1], ns[i], f1, g, tmp);
            if (i > 1) c += triple(ns[i - 2], ns[i - 1], ns[i], f0, f1, g, tmp);
            if (!isFinite(c)) return;
            var key = f1 + "," + g; if (!E[key] || c < E[key].c) { E[key] = { c: c, path: v.path.concat(g) }; any = true; }
          });
        });
        D = E; if (!any) return null;
      }
      var best = null; Object.keys(D).forEach(function (k) { if (!best || D[k].c < best.c) best = D[k]; });
      return best ? best.path : null;
    }
    return { explain: explain, solve: solve };
  }
  function rules(ns, opts) {
    var m = model(opts), f = m.solve(ns, opts && opts.fixed) || positions(ns).f;
    return { f: f, move: movesOf(ns, f) };
  }
  // where the hand moves: two notes in a row beyond the comfortable span for their fingers, or one finger on two keys
  function movesOf(ns, f) {
    return f.map(function (g, i) {
      if (!i) return false;
      var d = ns[i].midi - ns[i - 1].midi, a = f[i - 1];
      if (a === g) return d !== 0;
      var s = SPANS[Math.min(a, g) + "-" + Math.max(a, g)], x = a < g ? d : -d;
      return x < s[1] || x > s[4];
    });
  }
  var SYSTEMS = [
    { id: "home", label: "Home position" },
    { id: "scale", label: "Scale fingers" },
    { id: "positions", label: "Five-finger positions" },
    { id: "rules", label: "Least effort (Parncutt et al. 1997)" }
  ];
  function finger(all, system, opts) {
    opts = opts || {};
    var ns = all.filter(function (n) { return !n.cont; }), fixed = opts.fixed || {}, r;
    if (system === "rules") r = rules(ns, opts);
    else r = (system === "scale" ? scale(ns, opts) : system === "positions" ? positions(ns) : home(ns));
    if (system !== "rules") Object.keys(fixed).forEach(function (i) { if (i < r.f.length && fixed[i]) { r.f[i] = +fixed[i]; } });
    r.fixed = Object.keys(fixed).filter(function (i) { return fixed[i]; }).map(Number);
    return r;
  }
  // shifts: notes whose finger last played a different key (a finger shifting, or the hand moving to a new place);
  // the first note is not one. -> [true | false] per played note
  function shifts(ns, f) {
    var last = {};
    return f.map(function (g, i) { var was = last[g]; last[g] = ns[i].midi; return was != null && was !== ns[i].midi; });
  }
  // put the fingers into the ABC body: "!n!" before each note that is not tied on; opts.only = [bool by note] writes only those
  function write(body, all, r, opts) {
    var marks = [], j = 0;
    all.forEach(function (n) { if (!n.cont) { marks.push({ at: n.at, f: r.f[j], k: j }); j++; } });
    var out = body;
    marks.sort(function (a, b) { return b.at - a.at; }).forEach(function (m) {
      if (m.f >= 1 && m.f <= 5 && !(opts && opts.only && !opts.only[m.k])) out = out.slice(0, m.at) + "!" + m.f + "!" + out.slice(m.at);
    });
    return out;
  }
  global.PianoFingering = { notes: notes, finger: finger, write: write, shifts: shifts, model: model, SYSTEMS: SYSTEMS, SPANS: SPANS, WEIGHTS: WEIGHTS, fifthsOf: fifthsOf,
    systems: { home: home, scale: scale, positions: positions, rules: rules } };
  if (typeof module !== "undefined") module.exports = global.PianoFingering;
})(typeof window !== "undefined" ? window : globalThis);
