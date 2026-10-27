// bass-ear.js — Bass Lines by Ear (practice/bass-ear.qmd). You hear a tune's melody with a bass line under it (no chords), then a
// bass line alone, and say whether it is the same line or a different one. Levels go from a different chord root (easy) to a walking
// line with one note a semitone away (hard). No microphone, no notation.
//
// TUNES: BassEarTunes (apps/patterns/bass-ear-tunes.js, written by scripts/bass-ear-corpus.mjs): 8-bar excerpts of Tune Library tunes
// with chord symbols, ranked for this task and put in tiers 1-3 (format in that file's header).
//
// LINES: the bass part is made here, from the chord symbols. Each chord's first note (the "anchor") is its root, or the slash bass,
// or an inversion when a question asks for one. The other notes ("fills") come from the style's vocabulary of embellishments:
//   root    the anchor again                         fifth   the chord's fifth (root-fifth, two-feel, polka)
//   octave  the anchor an octave away                third   the chord's third (or another chord tone)
//   pass    a scale step on the way to the next chord (passing tone)
//   neighbor a scale step away from the anchor and back (only when the next note is the anchor again)
//   approach a semitone into the next chord's bass (last fill before a change)
//   pump    the note repeated in eighths (rock)
//   walk    a step or chord tone heading for the next chord (jazz); the last beat before a change is an approach note
// Which ones a style uses, and why, is in STYLES (each idiom is a common description, from memory, marked unverified until it
// is checked against the sources in scripts/sources/bass-ear.py). The lines themselves are this site's inventions in those idioms.
//
// WHERE THE BASS PLAYS ("Bass on"): changes (only when the chord changes), bars (each downbeat as well), macro (each macrobeat:
// 2/4 the quarter, 3/4 the dotted half, 4/4 and 2/2 the half, 6/8 the dotted quarter, after Gordon), beats (each quarter; 6/8 each
// dotted quarter), chance (changes always, other beats at random).
//
// DIFFERENCES (what the second line changes, one place only): reharm (another chord root: a diatonic third away), inv (the 3rd or
// 5th of the chord in the bass), ct (a fill becomes another chord tone), embOn / embOff (an embellishment added or taken away),
// embSwap (one embellishment for another), step (a fill moved by a scale step), semi (a note moved by a semitone).
//
// Pure helpers (Node: tests/bass-ear/bass-ear.test.js):
//   BassEar.slots(tune, { bars, density }, rnd)   -> [quarters from the first chord] where bass notes start
//   BassEar.line(tune, opts)                      -> [{ t, dur, midi, kind, ci, slot }]  opts: { bars, density, style, embellish,
//                                                    seed, mods: { chordIndex: { inv } | { reharm: { root, tones } } }, force: { slot: kind } }
//   BassEar.question(level, opts, rnd)            -> { tune, base (line opts), alt (line opts), same, a: line, b: line, diff: { kind, text } }
//   BassEar.STYLES, .LEVELS, .DENSITY, .level(id)
// Sound: BandSounds (bass + a melody instrument), one AudioContext registered with AudioTap. Progress: localStorage "bassEar.v1".
(function (global) {
  "use strict";
  var LO = 31, HI = 55, MID = 40;          // G1..G3

  function mod(n, m) { return ((n % m) + m) % m; }
  // a small seeded generator, so one slot's choice does not move the others
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(a, b) { return (Math.imul(a ^ 0x9e3779b9, 2654435761) + Math.imul(b + 1, 40503)) >>> 0; }
  function nearest(pc, ref) { var m = ref + mod(pc - ref, 12); if (m - ref > 6) m -= 12; while (m < LO) m += 12; while (m > HI) m -= 12; return m; }

  // ---------- styles ----------
  var STYLES = {
    mlt: { label: "MLT (Gordon)", kinds: { root: 3, fifth: 3, octave: 1, pass: 1 },
      blurb: "Resting tone and dominant on the macrobeats, the way an MLT class sings a bass part: roots and fifths, a passing tone now and then." },
    rock: { label: "Rock and pop", kinds: { root: 3, pump: 2, octave: 2, fifth: 1, pass: 1 },
      blurb: "Roots, eighth-note pumping, octaves, a fifth, a scale step into the next chord." },
    jazz: { label: "Jazz", kinds: { root: 1, fifth: 2, third: 2, approach: 2, walk: 3 },
      blurb: "Two-feel roots and fifths, chord tones, walking steps and chromatic approach notes into each chord." },
    classical: { label: "Classical", kinds: { root: 2, third: 1, pass: 3, neighbor: 2, octave: 1 }, inversions: true,
      blurb: "Passing and neighbour tones, the bass moving by step, first inversions to smooth the line." }
  };
  var DENSITY = [["level", "As the level sets it"], ["changes", "Only on chord changes"], ["bars", "Each downbeat and change"],
                 ["macro", "Each macrobeat"], ["beats", "Every beat"], ["chance", "Leave it to chance"]];
  function L(id, title, tiers, density, embellish, diffs, note) { return { id: id, title: title, tiers: tiers, density: density, embellish: embellish, diffs: diffs, note: note }; }
  var LEVELS = [
    Object.assign(L("1", "Chord roots", [1], "changes", 0, ["root"], "Only chord roots, one note a chord, whatever the style or Bass on setting. The second line may put one chord on a different root of the key."), { roots: true }),
    L("2", "Roots: a different chord", [1], "changes", 0, ["reharm"], "The bass plays each chord's root once. The second line puts one chord on another root, a third away (I for vi, IV for ii, V for iii)."),
    L("3", "Roots: inversions", [1, 2], "changes", 0, ["inv", "reharm"], "One chord may have its 3rd or 5th in the bass instead of the root: same harmony, a different bass note."),
    L("4", "Macrobeats: chord tones", [1, 2], "macro", 0.4, ["ct", "inv"], "The bass plays on each macrobeat. One note may go to another note of the same chord."),
    L("5", "An embellishment in or out", [1, 2], "macro", 0.6, ["embOn", "embOff"], "The lines are the same except that one embellishment (a passing tone, an octave, a fifth, an approach) is added or taken away."),
    L("6", "Which embellishment?", [1, 2, 3], "beats", 0.7, ["embSwap", "ct"], "Both lines embellish the same place, in different ways: a passing tone for a neighbour, an octave for a fifth."),
    L("7", "Walking: a step apart", [2, 3], "beats", 0.95, ["step"], "A line on every beat. The second may move one note by a scale step."),
    L("8", "Walking: a semitone apart", [2, 3], "beats", 1, ["semi"], "A line on every beat. The second may move one note by a semitone: a chromatic approach from above instead of below, or a raised step."),
    L("9", "Anything", [1, 2, 3], "chance", 0.7, ["reharm", "inv", "ct", "embOn", "embOff", "embSwap", "step", "semi"], "Every kind of difference, every tier of tune.")
  ];
  function level(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === String(id)) return LEVELS[i]; return LEVELS[0]; }

  // ---------- where notes go ----------
  function grid(tune, density) {
    var n = tune.n, d = tune.d;
    if (density === "macro") return n === 6 ? 1.5 : n === 3 ? 3 : n === 2 && d === 4 ? 1 : 2;
    if (density === "beats" || density === "chance") return n === 6 ? 1.5 : d === 2 ? 1 : 1;
    if (density === "bars") return tune.bq;
    return null;
  }
  function chordsIn(tune, bars) { var end = bars * tune.bq; return tune.ch.filter(function (c) { return c[0] < end - 1e-6; }); }
  function slots(tune, o, rnd) {
    var end = (o.bars || 4) * tune.bq, ts = chordsIn(tune, o.bars || 4).map(function (c) { return Math.max(0, c[0]); });
    var g = grid(tune, o.density);
    if (g) for (var t = 0; t < end - 1e-6; t += g) {
      if (o.density === "chance" && (rnd || Math.random)() < 0.55 && mod(t, tune.bq) > 1e-6) continue;
      ts.push(Math.round(t * 1000) / 1000);
    }
    return ts.sort(function (a, b) { return a - b; }).filter(function (t, i, a) { return i === 0 || t - a[i - 1] > 1e-6; });
  }

  // ---------- the line ----------
  function chordIndexAt(chs, t) { var k = 0; for (var i = 0; i < chs.length; i++) if (chs[i][0] <= t + 1e-6) k = i; return k; }
  // a chord as { root, bass, tones, scale } after its mods
  function chordOf(tune, chs, i, mods) {
    var c = chs[i], m = (mods || {})[i] || {}, root = c[2], tones = c[4], scale = c[5], bass = c[3];
    if (m.reharm) { root = m.reharm.root; tones = m.reharm.tones; scale = m.reharm.scale || scale; bass = root; }
    if (m.inv) bass = mod(root + (tones[m.inv] != null ? tones[m.inv] : tones[0]), 12);
    return { root: root, bass: bass, tones: tones, scale: scale, sym: m.reharm ? m.reharm.sym : c[1] };
  }
  function keyScale(tune) { return (tune.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(function (x) { return mod(x + tune.tonic, 12); }); }
  function inChordScale(ch, midi) { return ch.scale.indexOf(mod(midi - ch.root, 12)) >= 0; }
  function stepFrom(ch, midi, dir) { for (var k = 1; k <= 2; k++) { var m = midi + dir * k; if (inChordScale(ch, m)) return m; } return midi + dir * 2; }
  function clampR(m) { while (m < LO) m += 12; while (m > HI) m -= 12; return m; }

  // a fill note of kind `kind`; null when the kind does not fit here
  function fill(kind, ch, anchor, prev, next, isLast, nextIsAnchorSame, r) {
    var up = r() < 0.5 ? 1 : -1;
    switch (kind) {
      case "root": return anchor;
      case "fifth": { var f = nearest(mod(ch.root + 7, 12), prev); return f === anchor ? null : f; }
      case "octave": { var o = anchor + 12 <= HI ? anchor + 12 : anchor - 12; return o >= LO ? o : null; }
      case "third": { var tt = ch.tones.filter(function (x) { return x !== 0; }); var pc = mod(ch.root + tt[Math.floor(r() * Math.min(2, tt.length))], 12); var m3 = nearest(pc, prev); return m3 === prev ? null : m3; }
      case "pass": {
        if (next == null) return null;
        var dir = next > prev ? 1 : next < prev ? -1 : up, s = stepFrom(ch, prev, dir);
        if (s === next || Math.abs(next - prev) < 3) { s = stepFrom(ch, next, -dir); if (s === prev) return null; }
        return clampR(s);
      }
      case "neighbor": if (!nextIsAnchorSame) return null; return clampR(stepFrom(ch, anchor, up));
      case "approach": if (next == null || !isLast) return null; return clampR(next + (r() < 0.65 ? -1 : 1));
      case "walk": {
        if (next == null) return null;
        if (isLast) return clampR(r() < 0.5 ? next - 1 : stepFrom(ch, next, next >= prev ? -1 : 1));
        var dir2 = next > prev + 2 ? 1 : next < prev - 2 ? -1 : (prev > MID ? -1 : 1);
        return clampR(r() < 0.6 ? stepFrom(ch, prev, dir2) : nearest(mod(ch.root + ch.tones[1 + Math.floor(r() * (ch.tones.length - 1))], 12), prev + dir2 * 3));
      }
      case "pump": return anchor;
    }
    return null;
  }
  function choose(weights, r) {
    var ks = Object.keys(weights), tot = 0; ks.forEach(function (k) { tot += weights[k]; });
    var x = r() * tot; for (var i = 0; i < ks.length; i++) { x -= weights[ks[i]]; if (x <= 0) return ks[i]; } return ks[ks.length - 1];
  }

  function line(tune, o) {
    o = o || {};
    var bars = o.bars || 4, end = bars * tune.bq, chs = chordsIn(tune, bars), st = STYLES[o.style] || STYLES.mlt;
    var seed = o.seed || 1, ts = o.slots || slots(tune, o, rng(hash(seed, 999)));
    var emb = o.embellish == null ? 0.5 : o.embellish, force = o.force || {}, mods = o.mods || {};
    // anchors: one per chord, voice-led
    var anchors = [], prev = nearest(tune.tonic, MID - 2);
    chs.forEach(function (c, i) {
      var ch = chordOf(tune, chs, i, mods), r = rng(hash(seed, 500 + i));
      if (o.rootsOnly) ch.bass = ch.root;
      var bass = ch.bass;
      // classical: a first inversion when it makes a step (embellishment of the anchor), never on the first or last chord
      if (st.inversions && !mods[i] && i > 0 && i < chs.length - 1 && r() < emb * 0.5) {
        var third = mod(ch.root + ch.tones[1], 12), m3 = nearest(third, prev);
        if (Math.abs(m3 - prev) <= 2 && m3 !== prev) { bass = third; ch.inv1 = true; }
      }
      var m = nearest(bass, prev);
      if (Math.abs(m - MID) > 9) m += m > MID ? -12 : 12;
      anchors.push({ midi: m = clampR(m), ch: ch }); prev = m;
    });
    var out = [], walking = o.style === "jazz" && o.density === "beats";
    prev = anchors.length ? anchors[0].midi : MID;
    ts.forEach(function (t, si) {
      var ci = chordIndexAt(chs, t), a = anchors[ci], isAnchor = Math.abs(Math.max(0, chs[ci][0]) - t) < 1e-6;
      var tNext = si + 1 < ts.length ? ts[si + 1] : end, dur = tNext - t;
      var nextCi = chordIndexAt(chs, tNext), next = tNext < end - 1e-6 ? (nextCi !== ci ? anchors[nextCi].midi : a.midi) : null;
      var isLast = nextCi !== ci && next != null, nextIsAnchorSame = nextCi === ci && tNext < end;
      var kind = "anchor", midi = a.midi, r = rng(hash(seed, si));
      if (!isAnchor) {
        var want = force[si];
        if (!want) {
          var w = {}; Object.keys(st.kinds).forEach(function (k) { if (k !== "root") w[k] = st.kinds[k]; });
          want = r() < emb ? choose(w, r) : "root";
          if (walking && want === "root" && r() < emb) want = "walk";
          if (walking && isLast && r() < emb) want = r() < 0.6 ? "approach" : "walk";   // the last beat leads into the next chord
        } else r();
        var m = fill(want, a.ch, a.midi, prev, next, isLast, nextIsAnchorSame, r);
        if (walking && !force[si] && m === prev) { var w2 = fill("walk", a.ch, a.midi, prev, next, isLast, nextIsAnchorSame, r); if (w2 != null && w2 !== prev) { m = w2; want = "walk"; } }
        if (m == null && !force[si]) { want = "root"; m = a.midi; }
        if (m == null) m = a.midi;
        if (m - prev > 9 && m - 12 >= LO) m -= 12; else if (prev - m > 9 && m + 12 <= HI) m += 12;   // no big leaps inside a line
        kind = want; midi = m;
      } else if (a.ch.inv1) kind = "inversion";
      var note = { t: t, dur: dur, midi: midi, kind: kind, ci: ci, slot: si };
      if (kind === "pump" && dur >= 1 - 1e-6) {
        var half = 0.5; for (var k = 0; k < Math.round(dur / half); k++) out.push({ t: t + k * half, dur: half, midi: midi, kind: k ? "pump" : "root", ci: ci, slot: si });
      } else out.push(note);
      prev = midi;
    });
    return out;
  }


  // ---------- notation ----------
  // ABC for a line: melody (treble, optional) over the bass (bass clef) with the chord symbols on the bass, 4 bars a system.
  // o: { bars, tr (semitones), melody: bool, syms: [chord symbol per chord index], marks: { noteIndex: true } (drawn with ▼) }
  var FLAT_KEYS = [5, 10, 3, 8, 1, 6];   // F B♭ E♭ A♭ D♭ G♭ (major tonics, spelled with flats)
  var SH = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], FL = ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"];
  var PIECES = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125];
  function frac(q) {                       // quarters -> ABC length with L:1/4
    for (var d = 1; d <= 96; d++) { var n = q * d; if (Math.abs(n - Math.round(n)) < 1e-6) { n = Math.round(n); return n === d ? "" : (n === 1 ? "" : n) + (d === 1 ? "" : "/" + d); } }
    return "";
  }
  function split(q) { var out = []; while (q > 1e-6) { var p = PIECES.filter(function (x) { return x <= q + 1e-6; })[0]; if (!p) { out.push(q); break; } out.push(p); q -= p; } return out; }
  function snap(t) { var a = Math.round(t * 8) / 8, b = Math.round(t * 12) / 12; return Math.abs(a - t) <= Math.abs(b - t) ? a : b; }
  function isTrip(d) { return Math.abs(d * 8 - Math.round(d * 8)) > 1e-6 && Math.abs(d * 12 - Math.round(d * 12)) < 1e-6; }
  function voiceAbc(notes, bars, bq, flats) {
    // notes: [{ t, dur, midi, sym, mark }] -> ABC bars (strings), rests filling gaps, ties across bar lines
    var end = bars * bq, r8 = function (x) { return Math.round(x * 8) / 8; };
    var ns = notes.filter(function (n) { return n.t >= -1e-6 && n.t < end - 1e-6; })
      .map(function (n) { var t0 = snap(n.t); return { t: t0, e: Math.min(end, Math.max(t0 + 1 / 12, snap(n.t + n.dur))), midi: n.midi, sym: n.sym, mark: n.mark }; })
      .sort(function (x, y) { return x.t - y.t; });
    ns.forEach(function (n, i) { if (ns[i + 1] && ns[i + 1].t < n.e) n.e = ns[i + 1].t; });
    // triplets: three notes back to back, one triplet length, inside one bar, starting on the eighth grid -> a (3 group
    for (var i = 0; i + 2 < ns.length; i++) {
      var g = ns.slice(i, i + 3), d = g[0].e - g[0].t, b0 = Math.floor(g[0].t / bq + 1e-6);
      if (isTrip(d) && g.every(function (x, k) { return Math.abs(x.e - x.t - d) < 1e-6 && (!k || Math.abs(x.t - g[k - 1].e) < 1e-6); }) &&
          Math.abs(g[0].t * 8 - Math.round(g[0].t * 8)) < 1e-6 && g[2].e <= (b0 + 1) * bq + 1e-6) { g.forEach(function (x, k) { x.trip = k === 0 ? 1 : 2; }); i += 2; }
    }
    // everything else is drawn on the eighth grid (the sound is not changed; swung and odd lengths are rounded for reading)
    ns.forEach(function (n) { if (!n.trip) { n.t = r8(n.t); n.e = r8(n.e); } });
    ns = ns.filter(function (n, i) { if (!n.trip && n.e - n.t < 1e-6) return false; return true; });
    var ev = [], t = 0;
    ns.forEach(function (n) {
      if (n.t < t - 1e-6) { if (n.trip) { var p = ev[ev.length - 1]; if (p && !p.rest) p.dur = Math.max(0, n.t - p.t); if (p && p.dur < 1e-6) ev.pop(); } else return; }
      if (n.t > t + 1e-6) ev.push({ t: t, dur: n.t - t, rest: true });
      ev.push({ t: n.t, dur: n.e - n.t, midi: n.midi, sym: n.sym, mark: n.mark, trip: n.trip }); t = n.e;
    });
    if (t < end - 1e-6) ev.push({ t: t, dur: end - t, rest: true });
    var out = []; for (var b = 0; b < bars; b++) out.push("");
    function spell(midi) {
      var pc = mod(midi, 12), oct = Math.floor(midi / 12) - 1, sp = (flats ? FL : SH)[pc], letter = sp.replace(/[\^_]/, ""), a = sp.length > 1 ? sp[0] : "=";
      var keyL = letter + oct, pre = a !== (acc[keyL] || "=") ? a : ""; acc[keyL] = a;
      return pre + (oct >= 5 ? letter.toLowerCase() + Array(oct - 4).join("'") : letter + Array(5 - oct).join(","));
    }
    var acc = {};
    ev.forEach(function (e) {
      var bar0 = Math.floor(e.t / bq + 1e-6), odd = !e.trip && Math.abs(e.dur * 8 - Math.round(e.dur * 8)) > 1e-6;
      if ((e.trip || odd) && e.t + e.dur <= (bar0 + 1) * bq + 1e-6) {   // a triplet member (written 3/2 as long), or an odd length as one exact fraction
        if (out[bar0] === "") acc = {};
        out[bar0] += (e.trip === 1 ? "(3" : "") + (e.sym ? '"' + e.sym + '"' : "") + (e.mark ? '"^▼"' : "") + (e.rest ? "z" : spell(e.midi)) + frac(e.trip ? e.dur * 1.5 : e.dur) + " "; return;
      }
      var s = e.t, left = e.dur, first = true;
      while (left > 1e-6) {
        var bar = Math.min(bars - 1, Math.floor(s / bq + 1e-6)), room = (bar + 1) * bq - s, len = Math.min(left, room);
        if (out[bar] === "") acc = {};
        split(len).forEach(function (p, k, arr) {
          var txt = "";
          if (first && e.sym) txt += '"' + e.sym + '"';
          if (first && e.mark) txt += '"^▼"';
          if (e.rest) txt += "z" + frac(p);
          else {
            txt += spell(e.midi) + frac(p) + (k < arr.length - 1 || left - len > 1e-6 ? "-" : "");
          }
          out[bar] += txt + " "; first = false;
        });
        s += len; left -= len;
      }
    });
    return out;
  }
  function abc(tune, l, o) {
    o = o || {}; var bars = o.bars || 4, tr = o.tr || 0, chs = chordsIn(tune, bars), syms = o.syms || chs.map(function (c) { return c[1]; });
    var tonic = mod(tune.tonic + tr + (tune.minor ? 3 : 0), 12), flats = FLAT_KEYS.indexOf(tonic) >= 0;
    var bn = l.map(function (n, i) { var anchor = Math.abs(Math.max(0, chs[n.ci][0]) - n.t) < 1e-6 && (i === 0 || l[i - 1].ci !== n.ci);
      return { t: n.t, dur: n.dur, midi: n.midi + tr + 12, sym: anchor ? syms[n.ci] : null, mark: o.marks && o.marks[i] }; });
    var meter = tune.n + "/" + tune.d, bv = voiceAbc(bn, bars, tune.bq, flats), mv = null;
    if (o.melody) { var mn = []; for (var i = 0; i < tune.mel.length; i += 3) mn.push({ t: tune.mel[i], dur: tune.mel[i + 1], midi: tune.mel[i + 2] + tr }); mv = voiceAbc(mn, bars, tune.bq, flats); }
    var head = "X:1\nM:" + meter + "\nL:1/4\nK:C\n" + (mv ? "%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass name=\"Bass 8vb\"\n" : "V:2 clef=bass name=\"Bass 8vb\"\n");
    var body = "";
    for (var b = 0; b < bars; b += 4) {
      var sl = function (v) { return v.slice(b, b + 4).join("| ") + (b + 4 >= bars ? "|]" : "|"); };
      if (mv) body += "[V:1] " + sl(mv) + "\n";
      body += "[V:2] " + sl(bv) + "\n";
    }
    return head + body;
  }

  // ---------- questions ----------
  var NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var KIND_NAME = { root: "the root again", fifth: "the fifth", octave: "the octave", third: "a chord tone", pass: "a passing tone", neighbor: "a neighbour tone",
                    approach: "a chromatic approach", walk: "a walking step", pump: "eighth-note pumping", anchor: "the root", inversion: "a first inversion" };
  function nm(m, other) { return NAMES[mod(m, 12)] + (mod(m, 12) === mod(other, 12) ? (m > other ? " (up an octave)" : " (down an octave)") : ""); }
  function where(tune, t) { var bar = Math.floor(t / tune.bq + 1e-6), beatQ = tune.n === 6 ? 1.5 : tune.d === 2 ? 2 : 1, beat = Math.floor((t - bar * tune.bq) / beatQ + 1e-6);
    return "bar " + (bar + 1) + (beat ? ", beat " + (beat + 1) : ""); }
  function sameLine(a, b) { return a.length === b.length && a.every(function (x, i) { return x.midi === b[i].midi && Math.abs(x.t - b[i].t) < 1e-6; }); }
  function pickTune(lv, opts, rnd) {
    var all = global.BassEarTunes || [];
    if (opts.tune && opts.tune !== "level" && opts.tune !== "any") { var f = all.filter(function (t) { return t.id === opts.tune; })[0]; if (f) return f; }
    var pool = opts.tune === "any" ? all : all.filter(function (t) { return lv.tiers.indexOf(t.tier) >= 0; });
    if (!pool.length) pool = all;
    return pool[Math.floor(rnd() * pool.length)];
  }
  // a diatonic chord a third away (I↔vi, IV↔ii, V↔iii), as the bass sees it
  function reharmOf(tune, c, rnd, any) {
    var sc = keyScale(tune), deg = sc.indexOf(c[2]);
    var cands = deg >= 0 ? (any ? [1, 2, 3, 4, 5, 6].map(function (k) { return mod(deg + k, 7); }) : [mod(deg + 5, 7), mod(deg + 2, 7)]) : [];
    if (!cands.length) return null;
    var d = cands[Math.floor(rnd() * cands.length)], root = sc[d], third = mod(sc[mod(d + 2, 7)] - root, 12), fifth = mod(sc[mod(d + 4, 7)] - root, 12);
    var scale = [0, 1, 2, 3, 4, 5, 6].map(function (k) { return mod(sc[mod(d + k, 7)] - root, 12); });
    return { root: root, tones: [0, third, fifth], scale: scale, sym: NAMES[root] + (third === 3 ? (fifth === 6 ? "°" : "m") : "") };
  }
  function makeDiff(kind, tune, base, a, rnd) {
    var chs = chordsIn(tune, base.bars), alt = JSON.parse(JSON.stringify(base)); alt.mods = alt.mods || {}; alt.force = alt.force || {};
    var fills = a.filter(function (n) { return n.kind !== "anchor" && n.kind !== "inversion" && n.kind !== "pump" || (n.kind === "pump" && false); });
    var embs = fills.filter(function (n) { return n.kind !== "root"; }), plain = fills.filter(function (n) { return n.kind === "root"; });
    function anyOf(arr) { return arr[Math.floor(rnd() * arr.length)]; }
    var st = STYLES[base.style] || STYLES.mlt, emKinds = Object.keys(st.kinds).filter(function (k) { return k !== "root" && k !== "pump"; });
    if (kind === "reharm" || kind === "inv" || kind === "root") {
      var idx = []; for (var i = 1; i < chs.length; i++) if (chs[i][1] !== chs[i - 1][1]) idx.push(i);
      if (!idx.length) return null;
      var k = anyOf(idx), c = chs[k], before = chordOf(tune, chs, k, base.mods);
      if (kind === "reharm" || kind === "root") { var rh = reharmOf(tune, c, rnd, kind === "root"); if (!rh) return null; alt.mods[k] = { reharm: rh };
        return { alt: alt, text: where(tune, Math.max(0, c[0])) + ": the chord changed (" + before.sym + " → " + rh.sym + "), so the bass went to " + NAMES[rh.root] + " instead of " + NAMES[before.bass] + "." }; }
      var inv = rnd() < 0.7 ? 1 : 2; if (c[4][inv] == null) return null; alt.mods[k] = { inv: inv };
      return { alt: alt, text: where(tune, Math.max(0, c[0])) + ": " + (inv === 1 ? "first" : "second") + " inversion. " + before.sym + " stayed, but the bass took its " + (inv === 1 ? "3rd" : "5th") + " (" + NAMES[mod(c[2] + c[4][inv], 12)] + ") instead of " + NAMES[before.bass] + "." };
    }
    var n, want;
    if (kind === "embOn") { if (!plain.length) return null; n = anyOf(plain); want = anyOf(emKinds); }
    else if (kind === "embOff") { if (!embs.length) return null; n = anyOf(embs); want = "root"; }
    else if (kind === "embSwap") { if (!embs.length) return null; n = anyOf(embs); want = anyOf(emKinds.filter(function (x) { return x !== n.kind; })); }
    else if (kind === "ct") { if (!fills.length) return null; n = anyOf(fills); want = "third"; }
    else if (kind === "step" || kind === "semi") {
      var cand = a.filter(function (x, i) { return x.kind !== "anchor" && x.kind !== "inversion" && x.kind !== "pump"; });
      if (!cand.length) return null; n = anyOf(cand);
      var i0 = a.indexOf(n), ch = chordOf(tune, chs, n.ci, base.mods), dir = rnd() < 0.5 ? 1 : -1, m;
      for (var tries = 0; tries < 2; tries++, dir = -dir) {
        m = kind === "semi" ? n.midi + dir : stepFrom(ch, n.midi, dir);
        var p = a[i0 - 1], q = a[i0 + 1];
        if ((!p || p.midi !== m) && (!q || q.midi !== m) && m >= LO && m <= HI) break; m = null;
      }
      if (m == null) return null;
      alt.edit = { slot: n.slot, midi: m };
      return { alt: alt, text: where(tune, n.t) + ": " + KIND_NAME[n.kind] + " moved " + (kind === "semi" ? "a semitone" : "a step") + " " + (m > n.midi ? "up" : "down") + " (" + NAMES[mod(n.midi, 12)] + " → " + NAMES[mod(m, 12)] + ")." };
    }
    if (!n || !want) return null;
    alt.force[n.slot] = want;
    var b = line(tune, alt), nb = b.filter(function (x) { return x.slot === n.slot; })[0];
    return { alt: alt, text: where(tune, n.t) + ": " + KIND_NAME[n.kind] + (nb ? " became " + KIND_NAME[nb.kind] : " changed") + " (" + NAMES[mod(n.midi, 12)] + " → " + (nb ? nm(nb.midi, n.midi) : "?") + ")." };
  }
  function render(tune, o) {
    var l = line(tune, o);
    if (o.edit) l.forEach(function (x) { if (x.slot === o.edit.slot && x.kind !== "pump") x.midi = o.edit.midi; });
    return l;
  }
  function question(lv, opts, rnd) {
    rnd = rnd || Math.random; opts = opts || {};
    for (var attempt = 0; attempt < 40; attempt++) {
      var tune = pickTune(lv, opts, rnd);
      var dens = opts.density && opts.density !== "level" ? opts.density : lv.density;
      if (lv.roots) dens = "changes";
      var base = { rootsOnly: !!lv.roots, bars: Math.min(opts.bars || 4, 8), density: dens, style: opts.style || "mlt", embellish: lv.embellish, seed: 1 + Math.floor(rnd() * 1e9), mods: {}, force: {} };
      base.slots = slots(tune, base, rng(hash(base.seed, 999)));
      var a = render(tune, base), inWin = 0;
      for (var mi = 0; mi < tune.mel.length; mi += 3) if (tune.mel[mi] >= 0 && tune.mel[mi] < base.bars * tune.bq) inWin++;
      if (!a.length || (inWin < 3 && attempt < 30)) continue;      // a melody to hear (some tunes rest for their first bars)
      var same = opts.forceSame != null ? opts.forceSame : rnd() < 0.5;
      if (same) return { tune: tune, base: base, alt: base, same: true, a: a, b: a, diff: { kind: "same", text: "The two lines were the same." } };
      var kinds = lv.diffs.slice().sort(function () { return rnd() - 0.5; }).concat(lv.roots ? ["root"] : ["inv", "reharm"]);
      for (var j = 0; j < kinds.length; j++) {
        var d = makeDiff(kinds[j], tune, base, a, rnd); if (!d) continue;
        var b = render(tune, d.alt);
        if (!sameLine(a, b)) return { tune: tune, base: base, alt: d.alt, same: false, a: a, b: b, diff: { kind: kinds[j], text: d.text } };
      }
    }
    return null;
  }

  var api = { STYLES: STYLES, LEVELS: LEVELS, DENSITY: DENSITY, level: level, slots: slots, line: line, render: render, question: question,
              grid: grid, abc: abc, rng: rng, sameLine: sameLine, NAMES: NAMES };
  global.BassEar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  // ================= the page =================
  var KEY = "bassEar.v1";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
  var ST = load();
  var DEF = { style: "mlt", level: "1", density: "level", tune: "level", bars: 4, tempo: 92, key: "written", second: "alone", notation: 0, bass: "bass", melody: "piano", mvol: 0.55, hist: {} };
  Object.keys(DEF).forEach(function (k) { if (ST[k] == null) ST[k] = DEF[k]; });
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  var snd = null, timers = [], cur = null, ui = {}, host;
  function sound() {
    if (snd) return snd;
    var ac = new (global.AudioContext || global.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
    if (global.AudioTap) try { global.AudioTap.register(ac, out, "Bass Lines by Ear"); } catch (e) {}
    snd = Promise.resolve({ ac: ac, out: out, bank: global.BandSounds.create(ac) });
    return snd;
  }
  function ready() { return sound().then(function (b) { status("Loading sounds…"); return b.bank.load([ST.bass, ST.melody]).then(function () { status(""); return b; }); }); }
  function stop() { timers.forEach(clearTimeout); timers = []; if (snd) snd.then(function (b) { b.bank.stopAll(); }); }
  function status(s) { if (ui.status) ui.status.textContent = s; }
  // play: { bass: line | null, melody: bool }. Resolves when done.
  function play(bass, withMel, label) {
    stop();
    return ready().then(function (b) {
      b.ac.resume();
      var spq = 60 / ST.tempo, tune = cur.tune, tr = cur.tr, end = cur.base.bars * tune.bq, pick = Math.max(0, -Math.min(0, tune.mel[0]));
      var t0 = b.ac.currentTime + 0.1 + pick * spq;
      if (withMel) for (var i = 0; i < tune.mel.length; i += 3) {
        var t = tune.mel[i], d = tune.mel[i + 1]; if (t >= end - 1e-6) break;
        b.bank.play(ST.melody, { midi: tune.mel[i + 2] + tr, vel: +ST.mvol, dur: Math.max(0.1, d * spq * 0.95) }, t0 + t * spq, b.out);
      }
      if (bass) bass.forEach(function (n) { b.bank.play(ST.bass, { midi: n.midi + cur.btr, vel: 0.8, dur: Math.max(0.12, n.dur * spq * 0.9) }, t0 + n.t * spq, b.out); });
      status(label || "");
      return new Promise(function (res) { timers.push(setTimeout(function () { status(""); res(); }, ((t0 - b.ac.currentTime) + end * spq) * 1000 + 250)); });
    });
  }
  function both() { return play(cur.q.a, true, "♪ Melody and bass…").then(function () { return new Promise(function (r) { timers.push(setTimeout(r, 700)); }); })
    .then(function () { return play(cur.q.b, ST.second === "melody", ST.second === "melody" ? "♪ Melody and bass, second time…" : "♪ Bass alone…"); }); }

  function hk() { return ST.style + ":" + ST.level; }
  function score() { var h = ST.hist[hk()] || [], n = h.reduce(function (a, b) { return a + b; }, 0);
    ui.score.textContent = h.length ? "Last " + h.length + ": " + n + " right" + (h.length >= 10 && n >= 8 ? " · ready for the next level ✓" : "") : "No answers yet at this level."; }

  function newQ() {
    var lv = level(ST.level), q = question(lv, { style: ST.style, density: ST.density, tune: ST.tune, bars: +ST.bars });
    if (!q) { status("No question could be made with these settings."); return; }
    // transpose so the tonic sits low; the bass line is built around G1-G3 already
    var tr = ST.key === "random" ? Math.floor(Math.random() * 12) - 5 : 0;
    cur = { q: q, tune: q.tune, base: q.base, tr: tr, btr: tr, answered: false };
    ui.result.innerHTML = ""; ui.reveal.hidden = true; cur.showB = false; drawNotation(); ui.same.disabled = ui.diff.disabled = false;
    ui.prompt.textContent = "Listen: melody with bass, then " + (ST.second === "melody" ? "the melody with a bass line" : "a bass line alone") + ". Same line, or different?";
    both();
  }
  function answer(saidSame) {
    if (!cur || cur.answered) return; cur.answered = true;
    var ok = saidSame === cur.q.same, h = ST.hist[hk()] || []; h.push(ok ? 1 : 0); if (h.length > 10) h.shift(); ST.hist[hk()] = h; save(); score();
    ui.same.disabled = ui.diff.disabled = true;
    ui.result.innerHTML = "";
    ui.result.appendChild(el("div", ok ? "be-ok" : "be-no", (ok ? "Right. " : "Not quite. ") + (cur.q.same ? "They were the same." : "They were different.")));
    if (!cur.q.same) ui.result.appendChild(el("div", null, cur.q.diff.text));
    var t = cur.tune; ui.result.appendChild(el("div", "be-hint", t.title + " (" + t.col + ") · chords: " + chordsIn(t, cur.base.bars).map(function (c) { return c[1]; }).join(" ")));
    ui.reveal.hidden = false; drawNotation();
  }
  // notation: the first line with the melody, and the second line (shown after answering, or on request), changed notes marked ▼
  function symsOf(o) { var chs = chordsIn(cur.tune, o.bars); return chs.map(function (c, i) { var m = (o.mods || {})[i]; return m && m.reharm ? m.reharm.sym : c[1]; }); }
  function drawNotation() {
    if (!ui.nota) return;
    ui.notaBtn.textContent = +ST.notation ? "♫ Hide notation" : "♫ Show notation";
    ui.nota.hidden = !+ST.notation; if (ui.nota.hidden || !cur || !global.ABCJS) { if (!cur && +ST.notation) ui.nota.textContent = "Press Start."; return; }
    ui.nota.innerHTML = "";
    var q = cur.q, o = { bars: cur.base.bars, tr: cur.tr };
    ui.nota.appendChild(el("div", "be-hint", "First line, with the melody"));
    var d1 = el("div"); ui.nota.appendChild(d1);
    global.ABCJS.renderAbc(d1, abc(cur.tune, q.a, Object.assign({ melody: true, syms: symsOf(q.base) }, o)), { responsive: "resize", add_classes: true });
    if (cur.answered || cur.showB) {
      var marks = {}; q.b.forEach(function (n, i) { var a = q.a[i]; if (!a || a.midi !== n.midi || Math.abs(a.t - n.t) > 1e-6) marks[i] = true; });
      ui.nota.appendChild(el("div", "be-hint", "Second line" + (q.same ? " (the same)" : ", differences marked ▼")));
      var d2 = el("div"); ui.nota.appendChild(d2);
      global.ABCJS.renderAbc(d2, abc(cur.tune, q.b, Object.assign({ melody: ST.second === "melody", syms: symsOf(q.alt), marks: marks }, o)), { responsive: "resize", add_classes: true });
    } else ui.nota.appendChild(btn("Show the second line too (gives the answer away)", null, function () { cur.showB = true; drawNotation(); }));
  }
  function sel(labelTxt, key, items, onchange) {
    var lab = el("label"), s = el("select"); lab.appendChild(el("span", null, labelTxt)); lab.appendChild(s);
    items.forEach(function (it) { var o = el("option", null, it[1]); o.value = it[0]; s.appendChild(o); }); s.value = String(ST[key]);
    s.onchange = function () { ST[key] = s.value; save(); if (onchange) onchange(); };
    return lab;
  }
  function soundItems(fams, fb) { var l = []; fams.forEach(function (f) { try { global.BandSounds.sounds(f).forEach(function (x) { l.push([x.id, x.label]); }); } catch (e) {} }); return l.length ? l : [[fb, fb]]; }
  function btn(txt, cls, fn) { var b = el("button", cls, txt); b.type = "button"; b.onclick = fn; return b; }
  function build(h) {
    host = h; h.innerHTML = ""; h.classList.add("be-panel"); ui = {};
    var g = el("div", "be-grid");
    g.appendChild(sel("Style", "style", Object.keys(STYLES).map(function (k) { return [k, STYLES[k].label]; }), function () { build(h); }));
    g.appendChild(sel("Level", "level", LEVELS.map(function (l) { return [l.id, l.id + " · " + l.title]; }), function () { build(h); }));
    g.appendChild(sel("Bass on", "density", DENSITY));
    var tunes = (global.BassEarTunes || []).slice().sort(function (a, b) { return a.title < b.title ? -1 : 1; });
    g.appendChild(sel("Tune", "tune", [["level", "Suited to the level"], ["any", "Any tune"]].concat(tunes.map(function (t) { return [t.id, t.title + " (tier " + t.tier + ")"]; }))));
    h.appendChild(g);
    var more = el("details", "be-more"); more.appendChild(el("summary", null, "Sound and options")); var g2 = el("div", "be-grid");
    g2.appendChild(sel("Bars", "bars", [["2", "2 bars"], ["4", "4 bars"], ["8", "8 bars"]]));
    g2.appendChild(sel("Tempo", "tempo", [60, 72, 84, 92, 104, 120, 132].map(function (x) { return [String(x), x + " a quarter"]; })));
    g2.appendChild(sel("Key", "key", [["written", "As written"], ["random", "Moved at random"]]));
    g2.appendChild(sel("Second time", "second", [["alone", "Bass alone"], ["melody", "Bass with the melody"]]));
    g2.appendChild(sel("Bass sound", "bass", soundItems(["bass"], "bass")));
    g2.appendChild(sel("Melody sound", "melody", soundItems(["piano", "guitar"], "piano")));
    g2.appendChild(sel("Melody level", "mvol", [["0.3", "Soft"], ["0.55", "Medium"], ["0.8", "Loud"]]));
    more.appendChild(g2); h.appendChild(more);
    var lv = level(ST.level);
    h.appendChild(el("p", "be-hint be-note", STYLES[ST.style].blurb + " " + lv.note));
    var bar = el("div", "be-bar");
    bar.appendChild(btn("Start", "be-go", newQ));
    bar.appendChild(btn("▶ Both again", null, function () { if (cur) both(); }));
    bar.appendChild(btn("▶ First (with melody)", null, function () { if (cur) play(cur.q.a, true, "♪ First line, with the melody"); }));
    bar.appendChild(btn("▶ Second", null, function () { if (cur) play(cur.q.b, ST.second === "melody", "♪ Second line"); }));
    bar.appendChild(btn("■", null, function () { stop(); status(""); }));
    bar.appendChild(ui.notaBtn = btn("♫ Show notation", "be-nota-btn", function () { ST.notation = +ST.notation ? 0 : 1; save(); drawNotation(); }));
    h.appendChild(bar);
    ui.prompt = el("div", "be-prompt", "Press Start.");
    h.appendChild(ui.prompt);
    var ch = el("div", "be-choices");
    ch.appendChild(ui.same = btn("Same", "be-choice", function () { answer(true); }));
    ch.appendChild(ui.diff = btn("Different", "be-choice", function () { answer(false); }));
    ui.same.disabled = ui.diff.disabled = true;
    h.appendChild(ch);
    ui.status = el("div", "be-status"); h.appendChild(ui.status);
    ui.result = el("div", "be-result"); h.appendChild(ui.result);
    ui.reveal = el("div", "be-bar"); ui.reveal.hidden = true;
    ui.reveal.appendChild(btn("▶ First bass alone", null, function () { play(cur.q.a, false, "♪ First line"); }));
    ui.reveal.appendChild(btn("▶ Second bass alone", null, function () { play(cur.q.b, false, "♪ Second line"); }));
    ui.reveal.appendChild(btn("Next", "be-go", newQ));
    h.appendChild(ui.reveal);
    ui.nota = el("div", "be-nota"); h.appendChild(ui.nota);
    ui.score = el("div", "be-hint"); h.appendChild(ui.score); score(); drawNotation();
  }
  document.addEventListener("keydown", function (e) {
    if (!host || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || "")) return;
    if (e.key === " ") { e.preventDefault(); if (cur) both(); }
    else if (e.key === "s" || e.key === "S") answer(true);
    else if (e.key === "d" || e.key === "D") answer(false);
    else if (e.key === "Enter") { e.preventDefault(); newQ(); }
  });
  api._cur = function () { return cur; }; api._ST = ST;
  function boot() { var h = document.getElementById("bass-ear"); if (h) build(h); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : globalThis);
