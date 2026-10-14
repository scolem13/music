// fret-positions.js — playable fretboard positions (CAGED, 3 notes per string) for any scale.
// Pure logic, no DOM, no dependencies. Browser: window.FretPositions. Node: module.exports.
//
// Conventions
//   tuning   MIDI numbers, LOWEST string first as strung (guitar [40,45,50,55,59,64]).
//   string   1 = highest-pitched string ... N = lowest (guitar: 6 = low E).
//   fret     0 = open string. minFret/maxFret of a position are over FRETTED notes only
//            (open strings are ignored), so the UI can scroll/zoom to the hand position.
//   offsets  semitones from the root; a trailing 12 and duplicates are ignored.
//
// How positions are defined
//   CAGED: five positions that TILE the neck (see cagedTiling): 2-3 scale notes per string inside
//     5 fret numbers (span <= 4), consecutive across the strings (no skipped/repeated pitch),
//     every degree present, ascending with overlap, closing after 12 frets. The tiling depends only
//     on the pitch-class set, so every mode of a parent has the same five physical patterns; each is
//     named for the open-chord form (C A G E D) whose anchor strings carry its roots.
//     Bass (four strings in fourths) = the guitar's lowest four strings, an octave down: the
//     guitar positions restricted to those strings (guitar strings 6,5,4,3 = bass 4,3,2,1).
//   3NPS: seven-note scales only. Position n starts on scale degree n on the lowest string and
//     takes exactly three consecutive scale notes on every string.
//   A position is generated once as a pattern (key independent up to a fret shift) and then
//   placed at its lowest playable location, plus the same pattern 12 frets up if it fits.
(function (global) {
  "use strict";

  var SHAPES = ["C", "A", "G", "E", "D"];            // ascending order around the neck
  var ANCHORS = { C: [5, 2], A: [5, 3], G: [6, 3, 1], E: [6, 4, 1], D: [4, 2] };
  var MODE_NAMES = ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
  var PARENTS = [
    { type: "Major",          offs: [0, 2, 4, 5, 7, 9, 11] },
    { type: "Harmonic Minor", offs: [0, 2, 3, 5, 7, 8, 11] },
    { type: "Melodic Minor",  offs: [0, 2, 3, 5, 7, 9, 11] },
    { type: "Harmonic Major", offs: [0, 2, 4, 5, 7, 8, 11] }
  ];
  var GUITAR_STD = [40, 45, 50, 55, 59, 64];

  function mod(a, n) { return ((a % n) + n) % n; }

  // ---- tuning / scale analysis ------------------------------------------------------------
  function classify(t) {
    if (!Array.isArray(t)) return null;
    for (var i = 0; i < t.length; i++) if (typeof t[i] !== "number" || !isFinite(t[i])) return null;
    var d = [];
    for (i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
    function eq(a) { if (a.length !== d.length) return false; for (var k = 0; k < a.length; k++) if (a[k] !== d[k]) return false; return true; }
    if (t.length === 6 && eq([5, 5, 5, 4, 5])) return { kind: "guitar", n: 6 };
    if (t.length === 4 && eq([5, 5, 5])) return { kind: "bass", n: 4 };
    return null;
  }

  function scaleInfo(offsets) {
    if (!Array.isArray(offsets)) return null;
    var seen = {}, pcs = [];
    for (var i = 0; i < offsets.length; i++) {
      if (typeof offsets[i] !== "number" || !isFinite(offsets[i])) return null;
      var p = mod(Math.round(offsets[i]), 12);
      if (!seen[p]) { seen[p] = 1; pcs.push(p); }
    }
    pcs.sort(function (a, b) { return a - b; });
    if (!pcs.length || pcs[0] !== 0) return null;
    var degOf = [];
    for (i = 0; i < 12; i++) degOf.push(-1);
    pcs.forEach(function (p, k) { degOf[p] = k; });
    return { offs: pcs, L: pcs.length, degOf: degOf,
             minor: degOf[3] >= 0 && degOf[4] < 0 };
  }

  function makeCtx(tuning, rootPc, sc) {
    return { tuning: tuning, N: tuning.length, rootPc: mod(rootPc, 12), sc: sc, L: sc.L };
  }
  function idxOfMidi(ctx, m) {
    var rel = m - ctx.rootPc, d = ctx.sc.degOf[mod(rel, 12)];
    return d < 0 ? -1 : Math.floor(rel / 12) * ctx.L + d;
  }
  function pitchOfIdx(ctx, idx) {
    return ctx.rootPc + Math.floor(idx / ctx.L) * 12 + ctx.sc.offs[mod(idx, ctx.L)];
  }

  // ---- CAGED tiling ------------------------------------------------------------------------
  // The five CAGED positions of a scale are a TILING of the neck: five patterns that ascend, each
  // overlapping the next (>= 1 shared note per string, no gap), and that close up after 12 frets.
  // The tiling depends only on the pitch-class set (so every mode of a parent shares it), and is
  // chosen without looking at the root:
  //   candidates  2-3 consecutive scale notes on every string, inside 5 fret numbers (span <= 4),
  //               consecutive across the strings (no skipped/repeated pitch), every degree present;
  //   cycle       5 candidates that chain as above and close up one octave later;
  //   best cycle  most notes, then least total span, then least total per-string width, then most
  //               even spacing, then a transposition-invariant key (so a mode picks the same tiling
  //               as its parent).
  // Each position is then NAMED by where its roots fall: the open-chord form (C A G E D) whose
  // anchor strings are exactly the strings carrying a root. Needs five distinct names, else the
  // scale has no CAGED system. Computed once at root 0 and shifted by the root.
  var tilingCache = {};
  function cagedTiling(tun6, sc) {
    var ckey = tun6.join(",") + "|" + sc.offs.join(",");
    if (ckey in tilingCache) return tilingCache[ckey];
    tilingCache[ckey] = null;
    var ctx = makeCtx(tun6, 0, sc), N = ctx.N, L = ctx.L, C = [];
    for (var lo = 12; lo <= 23; lo++) {
      var win = [];
      for (var i = 0; i < N; i++) {
        var S = [];
        for (var f = lo; f <= lo + 4; f++) {
          var idx = idxOfMidi(ctx, tun6[i] + f);
          if (idx >= 0) S.push({ i: i, fret: f, idx: idx });
        }
        win.push(S);
      }
      var chosen = [];
      (function dfs(i, prevIdx) {
        if (i === N) { evaluate(); return; }
        var S = win[i];
        for (var j = 0; j < S.length; j++) {
          if (i > 0 && S[j].idx !== prevIdx + 1) continue;
          for (var c = 2; c <= 3 && j + c <= S.length; c++) {
            chosen[i] = S.slice(j, j + c);
            dfs(i + 1, S[j + c - 1].idx);
          }
        }
      })(0, -1);
      // eslint-disable-next-line no-inner-declarations
      function evaluate() {
        var notes = [], degs = {}, minF = 1e9, maxF = -1e9, wid = 0, runs = [];
        for (var i = 0; i < N; i++) {
          var ch = chosen[i];
          ch.forEach(function (n) {
            notes.push({ i: n.i, fret: n.fret });
            degs[mod(n.idx, L)] = 1;
            minF = Math.min(minF, n.fret); maxF = Math.max(maxF, n.fret);
          });
          wid += ch[ch.length - 1].fret - ch[0].fret;
          runs.push([ch[0].idx, ch[ch.length - 1].idx]);
        }
        if (minF !== lo || Object.keys(degs).length !== L) return;
        C.push({ lo: lo, span: maxF - minF, count: notes.length, wid: wid, runs: runs, notes: notes });
      }
    }
    function adjacent(X, Y, t) {
      for (var s = 0; s < N; s++) {
        var xa = X.runs[s][0], xb = X.runs[s][1], ya = Y.runs[s][0] + L * t, yb = Y.runs[s][1] + L * t;
        if (!(ya > xa && yb > xb && ya <= xb + 1)) return false;
      }
      return true;
    }
    var adj = C.map(function (x) {
      var l = [];
      C.forEach(function (y, b) { for (var t = -1; t <= 1; t++) if (adjacent(x, y, t)) l.push([b, t]); });
      return l;
    });
    var seen = {}, best = null, bestKey = null;
    function better(a, b) {   // is score a better than b?
      if (!b) return true;
      if (a.cnt !== b.cnt) return a.cnt > b.cnt;
      if (a.span !== b.span) return a.span < b.span;
      if (a.wid !== b.wid) return a.wid < b.wid;
      if (a.even !== b.even) return a.even < b.even;
      return a.key < b.key;
    }
    function consider(path) {
      var k = path.map(function (p) { return p[0]; }).sort(function (a, b) { return a - b; }).join(",");
      if (seen[k]) return; seen[k] = 1;
      var cnt = 0, span = 0, wid = 0, gaps = [], los = [];
      path.forEach(function (p) { var c = C[p[0]]; cnt += c.count; span += c.span; wid += c.wid; los.push(c.lo + 12 * p[1]); });
      for (var q = 0; q < path.length; q++) gaps.push((q + 1 < path.length ? los[q + 1] : los[0] + 12) - los[q]);
      var even = 0; gaps.forEach(function (g) { even += g * g; });
      var parts = path.map(function (p, q) {
        var c = C[p[0]];
        return gaps[q] + ":" + c.notes.map(function (n) { return n.i + "." + (n.fret - c.lo); }).join(" ");
      }), key = null;
      for (q = 0; q < parts.length; q++) {
        var rk = parts.slice(q).concat(parts.slice(0, q)).join("|");
        if (key === null || rk < key) key = rk;
      }
      var sc2 = { cnt: cnt, span: span, wid: wid, even: even, key: key, path: path.slice() };
      if (better(sc2, best)) best = sc2;
    }
    C.forEach(function (c0, a) {
      (function rec(cur, path, off) {
        if (path.length === 5) {
          for (var q = 0; q < adj[cur].length; q++) if (adj[cur][q][0] === a && off + adj[cur][q][1] === 1) { consider(path); break; }
          return;
        }
        adj[cur].forEach(function (e) {
          if (e[0] === a) return;
          path.push([e[0], off + e[1]]); rec(e[0], path, off + e[1]); path.pop();
        });
      })(a, [[a, 0]], 0);
    });
    if (!best) return null;
    // name by root strings: minimise the total mismatch between a position's root strings and the
    // anchor strings over all 5! assignments; every position must be within 1 string of its name.
    var rootSets = [];
    for (var q2 = 0; q2 < 5; q2++) {
      var c2 = C[best.path[q2][0]], roots = [];
      c2.notes.forEach(function (n) { if (mod(idxOfMidi(ctx, tun6[n.i] + n.fret), L) === 0) roots.push(N - n.i); });
      rootSets.push(roots);
    }
    // positions ascend in the order of SHAPES (cyclically), so only the 5 rotations are possible.
    // Neighbouring windows overlap so a window may carry extra roots; for a few modes (e.g. Lydian)
    // one window lacks one anchor root. Cost = 3*missing + extra; a name may miss at most one anchor.
    function cost(roots, shape) {
      var a = ANCHORS[shape], miss = 0, extra = 0;
      roots.forEach(function (r) { if (a.indexOf(r) < 0) extra++; });
      a.forEach(function (r) { if (roots.indexOf(r) < 0) miss++; });
      return miss > 1 ? 1000 : miss * 3 + extra;
    }
    var bestRot = -1, bestCost = 1e9;
    for (var rot = 0; rot < 5; rot++) {
      var tot = 0;
      for (q2 = 0; q2 < 5; q2++) tot += cost(rootSets[q2], SHAPES[(q2 + rot) % 5]);
      if (tot < bestCost) { bestCost = tot; bestRot = rot; }
    }
    if (bestCost >= 1000) return null;
    var named = {};
    for (q2 = 0; q2 < 5; q2++) {
      var c3 = C[best.path[q2][0]], sh = SHAPES[(q2 + bestRot) % 5];
      named[sh] = { shape: sh, exact: cost(rootSets[q2], sh) === 0,
        notes: c3.notes.map(function (n) { return { i: n.i, fret: n.fret + 12 * best.path[q2][1] }; }) };
    }
    return (tilingCache[ckey] = SHAPES.map(function (s) { return named[s]; }));
  }

  function isMinorLike(ctx) { return ctx.sc.minor; }

  function cagedPatterns(ctx, kind) {
    var tun = ctx.tuning, tun6 = tun;
    if (kind === "bass") tun6 = tun.concat([tun[3] + 4, tun[3] + 9]);
    var til = cagedTiling(tun6, ctx.sc);
    if (!til) return null;
    var res = [];
    for (var k = 0; k < SHAPES.length; k++) {
      var s = SHAPES[k];
      var notes = til[k].notes.filter(function (n) { return n.i < ctx.N; })
        .map(function (n) { return { i: n.i, fret: n.fret + ctx.rootPc }; });
      var perStr = {}, degs = {};
      notes.forEach(function (n) {
        perStr[n.i] = (perStr[n.i] || 0) + 1;
        degs[mod(idxOfMidi(ctx, tun[n.i] + n.fret), ctx.L)] = 1;
      });
      for (var i = 0; i < ctx.N; i++) if (!(perStr[i] >= 2 && perStr[i] <= 3)) return null;
      if (Object.keys(degs).length !== ctx.L) return null;
      res.push({ id: s, label: s + (isMinorLike(ctx) ? "m" : "") + " shape", notes: notes, mode: "caged", rank: k });
    }
    return res;
  }

  // ---- 3NPS patterns -----------------------------------------------------------------------
  function npsPatterns(ctx) {
    if (ctx.L !== 7) return null;
    var res = [];
    for (var n = 0; n < 7; n++) {
      var f0 = -1;
      for (var f = 12; f <= 23; f++) if (ctx.sc.degOf[mod(ctx.tuning[0] + f - ctx.rootPc, 12)] === n) { f0 = f; break; }
      var idx0 = idxOfMidi(ctx, ctx.tuning[0] + f0), notes = [];
      for (var i = 0; i < ctx.N; i++) {
        var lo = 1e9, hi = -1e9;
        for (var k = 0; k < 3; k++) {
          var fr = pitchOfIdx(ctx, idx0 + 3 * i + k) - ctx.tuning[i];
          notes.push({ i: i, fret: fr });
          lo = Math.min(lo, fr); hi = Math.max(hi, fr);
        }
        if (hi - lo > 5) return null;
      }
      res.push({ id: "3nps-" + (n + 1), label: "Position " + (n + 1), notes: notes, mode: "nps", rank: n, start: n });
    }
    return res;
  }

  // ---- fingering ---------------------------------------------------------------------------
  function byString(notes) {
    var m = {};
    notes.forEach(function (n) { (m[n.i] = m[n.i] || []).push(n); });
    Object.keys(m).forEach(function (k) { m[k].sort(function (a, b) { return a.fret - b.fret; }); });
    return m;
  }
  function strictFix(list) {          // list of fingers (fretted notes on one string, ascending fret)
    var k = list.length, j;
    if (!k) return list;
    for (j = 0; j < k; j++) { list[j] = Math.max(1, Math.min(4, list[j])); if (j && list[j] <= list[j - 1]) list[j] = list[j - 1] + 1; }
    list[k - 1] = Math.min(list[k - 1], 4);
    for (j = k - 2; j >= 0; j--) list[j] = Math.min(list[j], list[j + 1] - 1);
    for (j = 0; j < k; j++) { list[j] = Math.max(1, list[j]); if (j && list[j] <= list[j - 1]) list[j] = list[j - 1] + 1; }
    return list;
  }
  // CAGED: one finger per fret in a 4-fret hand position starting at p. For a 5-fret position the
  // hand either keeps p = lowest fret and the pinky stretches up one, or p = lowest + 1 and the
  // index reaches back one. We take whichever moves fewer notes (a note on a string that also has
  // a note on the adjacent fret is penalised because one finger cannot cover both); ties go to the
  // pinky stretch.
  function fingerCaged(notes) {
    var fretted = notes.filter(function (n) { return n.fret > 0; });
    var res = { stretch: false };
    if (!fretted.length) { res.fingers = notes.map(function () { return 0; }); return res; }
    var lo = Infinity, hi = -Infinity;
    fretted.forEach(function (n) { lo = Math.min(lo, n.fret); hi = Math.max(hi, n.fret); });
    var p = lo;
    if (hi - lo + 1 > 4) {
      res.stretch = true;
      var bs = byString(fretted), costA = 0, costB = 0;
      fretted.forEach(function (n) { if (n.fret === hi) costA++; if (n.fret === lo) costB++; });
      Object.keys(bs).forEach(function (k) {
        var fr = bs[k].map(function (n) { return n.fret; });
        if (fr.indexOf(hi) >= 0 && fr.indexOf(hi - 1) >= 0) costA += 10;
        if (fr.indexOf(lo) >= 0 && fr.indexOf(lo + 1) >= 0) costB += 10;
      });
      p = costB < costA ? lo + 1 : lo;
    }
    var bs2 = byString(notes);
    Object.keys(bs2).forEach(function (k) {
      var fr = bs2[k].filter(function (n) { return n.fret > 0; });
      var fg = strictFix(fr.map(function (n) { return n.fret - p + 1; }));
      fr.forEach(function (n, j) { n.finger = fg[j]; });
      bs2[k].forEach(function (n) { if (n.fret === 0) n.finger = 0; });
    });
    return res;
  }
  // 3NPS: per string, by the two gaps (in frets) between the three notes:
  //   (1,1) 1-2-3   (1,>=1) 1-2-4   (>=2,1) 1-3-4   (>=2,>=2) 1-2-4 (stretch for tone+tone and wider)
  // so semitone+tone 1-2-4, tone+semitone 1-3-4, tone+tone 1-2-4, augmented second + semitone 1-3-4,
  // semitone + augmented second 1-2-4. An open string takes finger 0 and the rest follow as usual.
  function fingerNps(notes) {
    var bs = byString(notes), stretch = false;
    Object.keys(bs).forEach(function (k) {
      var s = bs[k], d1 = s[1].fret - s[0].fret, d2 = s[2].fret - s[1].fret, f;
      if (s[2].fret - s[0].fret >= 5) stretch = true;
      if (d1 === 1 && d2 === 1) f = [1, 2, 3];
      else if (d1 >= 2 && d2 === 1) f = [1, 3, 4];
      else f = [1, 2, 4];
      if (s[0].fret === 0) f = f.map(function () { return 0; }), f = (d1 === 1 && d2 === 1) ? [0, 1, 2] : (d1 >= 2 && d2 === 1 ? [0, 2, 3] : [0, 1, 3]);
      s.forEach(function (n, j) { n.finger = f[j]; });
    });
    return { stretch: stretch };
  }

  // ---- placing patterns --------------------------------------------------------------------
  function placements(ctx, pat, maxFret) {
    var out = [];
    for (var s = -60; s <= 60; s += 12) {
      var ok = true, minFretted = Infinity, anyOpen = false;
      for (var j = 0; j < pat.notes.length; j++) {
        var f = pat.notes[j].fret + s;
        if (f < 0 || f > maxFret) { ok = false; break; }
        if (f === 0) anyOpen = true; else minFretted = Math.min(minFretted, f);
      }
      if (!ok) continue;
      if (anyOpen && minFretted > 3) continue;
      out.push(s);
    }
    return out;
  }

  function buildPosition(ctx, pat, shift, octave, rootDesc) {
    var notes = pat.notes.map(function (n) { return { i: n.i, fret: n.fret + shift }; });
    var info = pat.mode === "caged" ? fingerCaged(notes) : fingerNps(notes);
    var out = notes.map(function (n) {
      var midi = ctx.tuning[n.i] + n.fret, deg = ctx.sc.degOf[mod(midi - ctx.rootPc, 12)];
      return { string: ctx.N - n.i, fret: n.fret, finger: n.finger, midi: midi, pc: mod(midi, 12),
               degree: deg, isRoot: deg === 0 };
    });
    out.sort(function (a, b) { return a.midi - b.midi || b.string - a.string; });
    var minF = Infinity, maxF = -Infinity;
    out.forEach(function (n) { if (n.fret > 0) { minF = Math.min(minF, n.fret); maxF = Math.max(maxF, n.fret); } });
    if (minF === Infinity) { minF = 0; maxF = 0; }
    var rootStrings = out.filter(function (n) { return n.isRoot; }).map(function (n) { return n.string; })
      .sort(function (a, b) { return b - a; });
    return { id: pat.id, label: pat.label, sublabel: pat.sublabel || null, octave: octave,
             minFret: minF, maxFret: maxF, stretch: !!info.stretch, rootStrings: rootStrings, notes: out };
  }

  function describeRoot(pos) {
    var r = pos.notes.filter(function (n) { return n.isRoot; })[0];
    if (!r) return null;
    return "root on string " + r.string + (r.fret === 0 ? ", open" : ", finger " + r.finger);
  }

  // ---- parent detection --------------------------------------------------------------------
  function findParent(rootPc, sc) {
    if (sc.L !== 7) return null;
    for (var a = 0; a < PARENTS.length; a++) {
      var P = PARENTS[a];
      for (var d = 0; d < 7; d++) {
        var rot = [];
        for (var k = 0; k < 7; k++) rot.push(mod(P.offs[(d + k) % 7] - P.offs[d], 12));
        rot.sort(function (x, y) { return x - y; });
        var same = true;
        for (k = 0; k < 7; k++) if (rot[k] !== sc.offs[k]) { same = false; break; }
        if (same) return { type: P.type, offs: P.offs, degree: d + 1, rootPc: mod(rootPc - P.offs[d], 12) };
      }
    }
    return null;
  }

  // ---- public ------------------------------------------------------------------------------
  function patternsFor(system, ctx, kind) {
    return system === "caged" ? cagedPatterns(ctx, kind) : system === "3nps" ? npsPatterns(ctx) : null;
  }

  var sysCache = {};
  function systems(tuning, offsets) {
    var cl = classify(tuning), sc = scaleInfo(offsets);
    if (!cl || !sc || sc.L < 5) return [];
    var key = tuning.join(",") + "|" + sc.offs.join(",");
    if (sysCache[key]) return sysCache[key].map(function (x) { return Object.assign({}, x); });
    var ctx = makeCtx(tuning, 0, sc), out = [];
    if (patternsFor("caged", ctx, cl.kind) && positions({ system: "caged", tuning: tuning, rootPc: 0, offsets: offsets, maxFret: 22, _skipCheck: true }).length)
      out.push({ id: "caged", label: "CAGED", count: 5 });
    if (sc.L === 7 && patternsFor("3nps", ctx, cl.kind) && positions({ system: "3nps", tuning: tuning, rootPc: 0, offsets: offsets, maxFret: 22, _skipCheck: true }).length)
      out.push({ id: "3nps", label: "3 notes per string", count: 7 });
    sysCache[key] = out;
    return out.map(function (x) { return Object.assign({}, x); });
  }

  function positions(o) {
    o = o || {};
    var cl = classify(o.tuning), sc = scaleInfo(o.offsets);
    if (!cl || !sc || sc.L < 5) return [];
    if (!o._skipCheck && !systems(o.tuning, o.offsets).some(function (s) { return s.id === o.system; })) return [];
    var maxFret = typeof o.maxFret === "number" ? o.maxFret : 22;
    var ctx = makeCtx(o.tuning, o.rootPc || 0, sc);
    var pats = patternsFor(o.system, ctx, cl.kind);
    if (!pats) return [];
    var parent = o.system === "3nps" ? findParent(ctx.rootPc, sc) : null;
    var res = [];
    pats.forEach(function (pat) {
      if (pat.mode === "nps") {
        if (parent) {
          var k = (parent.degree - 1 + pat.start) % 7;
          pat.sublabel = parent.type === "Major" ? MODE_NAMES[k] + " pattern" : parent.type + " pattern " + (k + 1);
        }
      }
      var pl = placements(ctx, pat, maxFret);
      if (!pl.length) return;
      var first = pl[0], p0 = buildPosition(ctx, pat, first, 0);
      if (pat.mode === "caged" && cl.kind === "bass") p0.sublabel = describeRoot(p0);
      res.push(p0);
      if (pl.indexOf(first + 12) >= 0) {
        var p1 = buildPosition(ctx, pat, first + 12, 1);
        if (pat.mode === "caged" && cl.kind === "bass") p1.sublabel = describeRoot(p1);
        res.push(p1);
      }
    });
    res.sort(function (a, b) { return a.minFret - b.minFret || (a.id < b.id ? -1 : 1); });
    return res;
  }

  function signature(ctx, notes) {
    var minF = Infinity;
    notes.forEach(function (n) { minF = Math.min(minF, n.fret); });
    var sh = -12 * Math.floor(minF / 12);
    return notes.map(function (n) { return n.i + "@" + (n.fret + sh); }).sort().join(" ");
  }

  function relatedPositions(o) {
    o = o || {};
    var cl = classify(o.tuning), sc = scaleInfo(o.offsets);
    if (!cl || !sc || (o.system !== "caged" && o.system !== "3nps")) return null;
    var rootPc = mod(o.rootPc || 0, 12), par = findParent(rootPc, sc);
    if (!par) return null;
    var psc = scaleInfo(par.offs);
    var ctx = makeCtx(o.tuning, rootPc, sc), pctx = makeCtx(o.tuning, par.rootPc, psc);
    var mine = patternsFor(o.system, ctx, cl.kind), theirs = patternsFor(o.system, pctx, cl.kind);
    if (!mine || !theirs) return null;
    var sigs = {};
    theirs.forEach(function (p) { sigs[signature(pctx, p.notes)] = p; });
    var map = {};
    mine.forEach(function (p) {
      var q = sigs[signature(ctx, p.notes)];
      if (q) map[p.id] = { parentPositionId: q.id, parentLabel: q.label };
    });
    return { parent: { rootPc: par.rootPc, type: par.type, degree: par.degree }, map: map };
  }

  var analysisCache = null;
  function analysis() {
    if (analysisCache) return JSON.parse(JSON.stringify(analysisCache));
    var T = GUITAR_STD, MAJ = PARENTS[0].offs, NM = [0, 2, 3, 5, 7, 8, 10];
    var scM = scaleInfo(MAJ), scN = scaleInfo(NM);
    var cM = makeCtx(T, 0, scM), cN = makeCtx(T, 9, scN);          // C major, A natural minor
    var res = { majorKey: "C", minorKey: "A", caged: [], threeNps: [], modes: [], altered: [] };
    var pm = cagedPatterns(cM, "guitar"), pn = cagedPatterns(cN, "guitar");
    var sigN = {};
    pn.forEach(function (p) { sigN[signature(cN, p.notes)] = p; });
    pm.forEach(function (p) {
      var q = sigN[signature(cM, p.notes)];
      res.caged.push({ majorShape: p.id, minorShape: q ? q.id + "m" : null, sameNotes: !!q,
        orderShift: q ? mod(SHAPES.indexOf(q.id) - SHAPES.indexOf(p.id), 5) : null });
    });
    res.cagedOrderShift = res.caged.every(function (r) { return r.orderShift === res.caged[0].orderShift; }) ? res.caged[0].orderShift : null;
    res.relativeMinorFretShift = mod(9 - 0 + 6, 12) - 6;           // minor root sits this many frets from the major root on any string: -3
    var nm = npsPatterns(cM), nn = npsPatterns(cN), sigNn = {};
    nn.forEach(function (p) { sigNn[signature(cN, p.notes)] = p; });
    nm.forEach(function (p) {
      var q = sigNn[signature(cM, p.notes)];
      res.threeNps.push({ majorPattern: p.start + 1, minorPattern: q ? q.start + 1 : null, sameNotes: !!q });
    });
    res.threeNpsShift = res.threeNps.every(function (r) { return mod(r.minorPattern - r.majorPattern, 7) === mod(res.threeNps[0].minorPattern - res.threeNps[0].majorPattern, 7); })
      ? mod(res.threeNps[0].minorPattern - res.threeNps[0].majorPattern, 7) : null;
    // modes of major: same five patterns, shape name changes by where the mode's root falls
    var names = ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
    for (var d = 0; d < 7; d++) {
      var offs = []; for (var k = 0; k < 7; k++) offs.push(mod(MAJ[(d + k) % 7] - MAJ[d], 12));
      offs.sort(function (a, b) { return a - b; });
      var rootPc = mod(MAJ[d], 12), sc = scaleInfo(offs), ctx = makeCtx(T, rootPc, sc);
      var pmode = cagedPatterns(ctx, "guitar"), pnm = npsPatterns(ctx), sg = {};
      pm.forEach(function (p) { sg[signature(cM, p.notes)] = p; });
      var sg3 = {}; nm.forEach(function (p) { sg3[signature(cM, p.notes)] = p; });
      res.modes.push({
        mode: names[d], degree: d + 1,
        caged: pmode.map(function (p) { var q = sg[signature(ctx, p.notes)];
          return { modeShape: p.id + (sc.minor ? "m" : ""), parentShape: q ? q.id : null, sameNotes: !!q }; }),
        threeNps: pnm.map(function (p) { var q = sg3[signature(ctx, p.notes)];
          return { modePosition: p.start + 1, parentPosition: q ? q.start + 1 : null, sameNotes: !!q }; })
      });
    }
    // altered parents: how far each position moves from the diatonic parent pattern in the same key
    [["Harmonic Minor", [0, 2, 3, 5, 7, 8, 11], NM], ["Melodic Minor", [0, 2, 3, 5, 7, 9, 11], NM],
     ["Harmonic Major", [0, 2, 4, 5, 7, 8, 11], MAJ]].forEach(function (a) {
      var sa = scaleInfo(a[1]), sb = scaleInfo(a[2]), ca = makeCtx(T, 0, sa), cb = makeCtx(T, 0, sb);
      var A = cagedPatterns(ca, "guitar"), B = cagedPatterns(cb, "guitar"), rows = [];
      A.forEach(function (p, i) {
        var q = B[i], best = null;
        for (var s = -12; s <= 12; s += 12) {
          var set = {}; q.notes.forEach(function (n) { set[n.i + "@" + (n.fret + s)] = 1; });
          var diff = p.notes.filter(function (n) { return !set[n.i + "@" + n.fret]; }).length;
          if (best === null || diff < best) best = diff;
        }
        var cnt = function (pat) { var c = {}; pat.notes.forEach(function (n) { c[n.i] = (c[n.i] || 0) + 1; }); return Object.keys(c).sort().map(function (k) { return c[k]; }).join(""); };
        rows.push({ shape: p.id, notesNotInBase: best, sameStringCounts: cnt(p) === cnt(q) });
      });
      res.altered.push({ scale: a[0], base: a[2] === NM ? "Natural Minor" : "Major", positions: rows });
    });
    analysisCache = res;
    return JSON.parse(JSON.stringify(res));
  }

  var api = { systems: systems, positions: positions, relatedPositions: relatedPositions, analysis: analysis,
              _makeCtx: makeCtx, _scaleInfo: scaleInfo };
  global.FretPositions = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
