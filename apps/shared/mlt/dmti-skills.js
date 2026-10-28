// dmti-skills.js: the exercises of Azzara and Grunow's Developing Musicianship through Improvisation (DMTI), generated from a
// unit's tune (with chord symbols), its rhythm pattern set and its tonal pattern set. Global DMTISkills. The book's own examples
// are not copied: these are new examples made the same way (see research_notes/dmti-generation-plan.md for what each skill is).
//
//   DMTISkills.parse(abc)                      -> tune model { key, tonic, minor, n, d, bq, macro, bars, mel, ch, spell }
//        mel: [{ t, dur, midi }] (quarters from the start), ch: [{ t, end, sym, root, tones, fn }] (fn: tonic / dominant /
//        subdominant / other, from the root against the key)
//   DMTISkills.rhythmBars(abcSet)              -> [[{ t, dur }]]  every bar of every pattern in a rhythm set (quarters in the bar)
//   DMTISkills.tonalPatterns(abcSet)           -> [{ steps: [semitones from the set's tonic], fn }]
//   DMTISkills.make(skill, tune, sets, seed, opts) -> { parts: [{ label, abc }], note }     skill:
//        bass      the bass line: chord roots, a note each half bar (Review)
//        roots     Skill 1: rhythms from the unit's set on the chord roots
//        voices    Skill 2: four parts (bass + three voices by least motion) over the unit's functions, solfège under each note
//        hrhythm   Skill 3: the four parts in the tune's harmonic rhythm
//        partRhy   Skill 4: one part (opts.part 0-3) in rhythms from the unit's set
//        macro     Skill 5: tonal patterns of each chord's function, a note per macrobeat (opts.macro quarters, default the tune's)
//        tonalRhy  Skill 6: those tonal patterns in rhythms from the unit's set
//        embellish Skill 7: the melody with passing and neighbour tones added
//        series    Part 2: a series of tonal patterns over the tune's first four chords
//        rseries   Part 2: two rhythm patterns joined into a phrase
//        answer    Part 3: the tune with every second phrase's melody left out (the band keeps the chords)
//   Triplets (thirds of a beat) are written as (3:2:n tuplets; notes within a beat are beamed.
//   Every abc has chord symbols, so AbcPlay with { abc } plays it with the band; { melody: false } gives the backing alone.
// Pure (no DOM); loads in Node for tests/mlt/dmti-skills.test.js (needs abc-core.js, abc-events.js, band/harmony.js).
(function (global) {
  "use strict";
  // looked up when used: on a page this script may load before abc-events.js
  var E = { fromAbc: function (t) { return (global.AbcEvents || require("../abc-events.js")).fromAbc(t); } };
  function H() { return global.BandHarmony; }

  function mod(n, m) { return ((n % m) + m) % m; }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }
  var EPS = 1e-6;

  // ---------- spelling ----------
  var LET = ["C", "D", "E", "F", "G", "A", "B"], LPC = [0, 2, 4, 5, 7, 9, 11];
  // key: "Eb", "Dm", "F", "Bbmix" ... -> letter spelling of each scale pc, and the key signature's accidental per letter
  function speller(k) {
    var m = /^\s*([A-G])([#b]?)\s*([A-Za-z]*)/.exec(k || "C") || ["", "C", "", ""];
    var li = LET.indexOf(m[1]), tonic = mod(LPC[li] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0), 12), md = m[3].toLowerCase();
    var minor = /^m(in)?$|^aeo/.test(md), steps = minor ? [0, 2, 3, 5, 7, 8, 10] : /^mix/.test(md) ? [0, 2, 4, 5, 7, 9, 10] : /^dor/.test(md) ? [0, 2, 3, 5, 7, 9, 10] : [0, 2, 4, 5, 7, 9, 11];
    var sig = {}, byPc = {};
    steps.forEach(function (st, d) {
      var L = (li + d) % 7, pc = mod(tonic + st, 12), acc = mod(pc - LPC[L] + 6, 12) - 6;
      sig[L] = acc; byPc[pc] = { L: L, acc: acc };
    });
    var flats = Object.keys(sig).some(function (L) { return sig[L] < 0; });
    function spell(pc) {
      if (byPc[pc]) return byPc[pc];
      // outside the key: minor's raised 7th and other leading tones as sharps of the lower letter, else by the key's side
      var up = byPc[mod(pc - 1, 12)], down = byPc[mod(pc + 1, 12)];
      var sharp = up && { L: up.L, acc: up.acc + 1 }, flat = down && { L: down.L, acc: down.acc - 1 };
      if (sharp && sharp.acc === 0) return sharp;            // a natural first (E natural in B flat, not F flat)
      if (flat && flat.acc === 0) return flat;
      if (sharp && (!flats || minor)) return sharp;
      return flat || sharp;
    }
    return { tonic: tonic, minor: minor, sig: sig, spell: spell, steps: steps };
  }
  // one note (or rest) to ABC; acc: the bar's current accidental per letter+octave (reset each bar)
  function noteName(midi, sp, barAcc) {
    // accidentals tracked per letter, not per octave: after =B, a B flat in another octave is written _B, so no reader can carry
    // the natural across octaves
    var s = sp.spell(mod(midi, 12)), oct = Math.floor((midi - s.acc - LPC[s.L]) / 12) - 1, key = s.L;
    var cur = barAcc[key] != null ? barAcc[key] : (sp.sig[s.L] || 0), pre = "";
    if (cur !== s.acc) { pre = s.acc === 0 ? "=" : s.acc > 0 ? new Array(s.acc + 1).join("^") : new Array(-s.acc + 1).join("_"); barAcc[key] = s.acc; }
    var n = LET[s.L];
    if (oct >= 5) { n = n.toLowerCase() + new Array(oct - 5 + 1).join("'"); }
    else n = n + new Array(4 - oct + 1).join(",");
    return pre + n;
  }
  function lenStr(q) {                       // quarters -> length with L:1/16
    var u = Math.round(q * 4); return u === 1 ? "" : String(u);
  }
  var PIECES = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
  function pieces(q) { var out = []; while (q > EPS) { var p = PIECES.filter(function (x) { return x <= q + EPS; })[0] || q; out.push(p); q -= p; } return out; }
  // notes [{ t, dur, midi | null }] -> ABC (one voice); chords [{ t, sym }] written above; words: a syllable per note (w:)
  function toAbc(notes, tune, o) {
    o = o || {};
    var sp = tune.spell, bq = tune.bq, total = o.bars ? o.bars * bq : tune.bars * bq, chs = (o.chords || tune.ch).slice();
    var evs = notes.slice().sort(function (a, b) { return a.t - b.t; }), filled = [], t = 0;
    evs.forEach(function (e) { if (e.t > t + EPS) filled.push({ t: t, dur: e.t - t, midi: null }); filled.push(e); t = e.t + e.dur; });
    if (t < total - EPS) filled.push({ t: t, dur: total - t, midi: null });
    // split at bar lines and chord changes (a note held across one is tied)
    var cuts = []; for (var b = 1; b * bq < total - EPS; b++) cuts.push(b * bq);
    chs.forEach(function (c) { if (c.t > EPS && cuts.indexOf(c.t) < 0) cuts.push(c.t); });
    cuts.sort(function (a, b) { return a - b; });
    var segs = [];
    filled.forEach(function (e, i) {
      var s = e.t, end = e.t + e.dur, first = true;
      cuts.filter(function (c) { return c > s + EPS && c < end - EPS; }).concat([end]).forEach(function (c) {
        segs.push({ t: s, dur: c - s, midi: e.midi, word: first ? e.word : null, tie: c < end - EPS && e.midi != null }); s = c; first = false;
      });
    });
    // triplets: a note off the 1/16 grid belongs to a group spanning an aligned half beat, beat or two beats (S quarters) whose
    // notes all start and end inside it; the group is written as a (3:2:n tuplet, each note at 1.5 times its sounding length
    var onGrid = function (x) { return Math.abs(x * 4 - Math.round(x * 4)) < EPS; };
    segs.forEach(function (g, i) {
      if (onGrid(g.t) && onGrid(g.dur) || g.tup) return;
      var bt = Math.floor(g.t / bq + EPS) * bq;
      [0.5, 1, 2, bq].some(function (S) {
        var s0 = bt + Math.floor((g.t - bt) / S + EPS) * S, s1 = s0 + S, grp = [];
        for (var k = 0; k < segs.length; k++) { var h = segs[k]; if (h.t >= s0 - EPS && h.t < s1 - EPS) grp.push(h); }
        var whole = grp.length && Math.abs(grp[0].t - s0) < EPS && Math.abs(grp[grp.length - 1].t + grp[grp.length - 1].dur - s1) < EPS;
        var fits = grp.every(function (h) { return Math.abs(h.dur * 6 - Math.round(h.dur * 6)) < EPS; });
        if (!whole || !fits) return false;
        grp.forEach(function (h, k) { h.tup = { first: k === 0, n: grp.length }; });
        return true;
      });
    });
    var out = "", words = [], barAcc = {}, ci = 0, bar = 0, beat = tune.d === 8 ? 1.5 : 1;
    // a space only where a beat ends, so the notes inside a beat are beamed together
    var gap = function (end) { var x = end / beat; return Math.abs(x - Math.round(x)) < EPS ? " " : ""; };
    segs.forEach(function (g) {
      var b = Math.floor(g.t / bq + EPS);
      if (b > bar) { out += " | "; bar = b; barAcc = {}; if (b % 4 === 0) out += "\n"; }
      while (ci < chs.length && chs[ci].t < g.t + EPS) { if (chs[ci].t > g.t - EPS) out += '"' + chs[ci].sym + '"'; ci++; }
      if (g.tup) {                                   // one written note, 1.5 x its sounding length, inside a (3:2:n group
        if (g.tup.first) out += "(3:2:" + g.tup.n;
        var u = Math.round(g.dur * 6);
        out += (g.midi == null ? "z" : noteName(g.midi, sp, barAcc)) + (u === 1 ? "" : u) + (g.tie ? "-" : "") + gap(g.t + g.dur);
        if (g.midi != null) words.push(g.word || "_");
        return;
      }
      // split into writable lengths within the beat
      var ps = pieces(g.dur);
      var at = g.t;
      ps.forEach(function (q, k) {
        if (g.midi == null) out += "z" + lenStr(q);
        else { out += noteName(g.midi, sp, barAcc) + lenStr(q) + (k < ps.length - 1 || g.tie ? "-" : ""); }
        at += q; out += q >= beat - EPS ? " " : gap(at);
        if (g.midi != null) words.push(k === 0 && g.word ? g.word : "_");
      });
    });
    out = out.replace(/ +$/, "") + " |]";
    var head = "X:1\n" + (o.title ? "T:" + o.title + "\n" : "") + "M:" + tune.n + "/" + tune.d + "\nL:1/16\n" + (o.qpm ? "Q:1/4=" + o.qpm + "\n" : "") + "K:" + tune.key + "\n";
    var w = o.words ? "\nw:" + words.join(" ") : "";
    return head + out + w;
  }

  // ---------- parsing ----------
  function fnOf(root, tune) {
    var d = mod(root - tune.tonic, 12);
    if (d === 0) return "tonic";
    if (d === 7) return "dominant";
    if (d === 5) return "subdominant";
    if (tune.minor && d === 10) return "subtonic";
    return "other";
  }
  function parse(abc) {
    var r = E.fromAbc(abc), key = (/^K:\s*(\S+)/m.exec(abc) || [])[1] || "C", sp = speller(key);
    var tune = { key: key, tonic: sp.tonic, minor: sp.minor, n: r.meter.n, d: r.meter.d, bq: r.barQuarters, spell: sp };
    tune.macro = tune.d === 8 ? 1.5 : 1;
    var last = 0;
    tune.mel = r.sounding.filter(function (e) { return e.pitches && e.pitches.length; }).map(function (e) {
      last = Math.max(last, e.t_off); return { t: e.t_on, dur: e.t_off - e.t_on, midi: e.pitches[0].midi };
    });
    // a pickup: the music's length is not whole bars, and the first chord comes after the start. Times are moved so that 0 is
    // the first full bar; the pickup's notes (negative times) are dropped from the generated parts
    var len = Math.max(last, r.quarters || 0), pick = Math.round(firstBar(abc) * 1000) / 1000;
    tune.pickup = pick > EPS && pick < tune.bq - EPS ? pick : 0;
    if (tune.pickup) { tune.mel.forEach(function (m) { m.t -= tune.pickup; }); tune.mel = tune.mel.filter(function (m) { return m.t > -EPS; }); }
    tune.bars = tune.pickup ? Math.ceil((len - tune.pickup) / tune.bq - 0.01) : Math.round(len / tune.bq);   // with a pickup, the short last bar counts
    var chs = [];
    r.chords.forEach(function (c) {
      var p = H().parseChord(c.name.trim(), 0);
      if (p.nc || p.unknown || p.root == null) return;
      if (chs.length && chs[chs.length - 1].sym === c.name.trim()) return;
      if (chs.length && Math.abs(chs[chs.length - 1].t - c.t) < EPS) chs.pop();
      if (c.t - tune.pickup < -EPS) return;                          // a chord over the pickup: bar 1 has its own
      chs.push({ t: c.t - (tune.pickup || 0), sym: c.name.trim(), root: p.root, tones: p.tones.slice(0, 4), scale: p.scale });
    });
    chs.forEach(function (c, i) { c.end = i + 1 < chs.length ? chs[i + 1].t : tune.bars * tune.bq; c.fn = fnOf(c.root, tune); });
    tune.ch = chs;
    tune.rest = 60 + mod(tune.tonic + (tune.minor ? 0 : 0) - 60, 12);   // the resting tone in the octave from middle C
    if (tune.rest > 66) tune.rest -= 12;
    return tune;
  }
  function chordAt(tune, t) { var k = tune.ch[0]; tune.ch.forEach(function (c) { if (c.t <= t + EPS) k = c; }); return k; }
  // a chord tone (pc) placed nearest ref, kept between lo and hi
  function place(pc, ref, lo, hi) { var m = ref + mod(pc - ref, 12); if (m - ref > 6) m -= 12; while (m < lo) m += 12; while (m > hi) m -= 12; return m; }

  function rhythmBars(src, bq) {
    var bars = [];
    String(src || "").split(/\n(?=X:)/).filter(function (t) { return /X:/.test(t); }).forEach(function (t) {
      var r = E.fromAbc(t), q = r.barQuarters, by = {}, first = firstBar(t), shift = first > EPS && first < q - EPS ? q - first : 0;
      // a pickup: move everything so the pickup ends at the first bar line; then keep only complete bars, notes cut at the bar line
      r.sounding.forEach(function (e) { var on = e.t_on + shift, b = Math.floor(on / q + EPS); (by[b] = by[b] || []).push({ t: on - b * q, dur: Math.min(e.t_off + shift, (b + 1) * q) - on }); });
      var lastBar = Math.floor((r.sounding.length ? r.sounding[r.sounding.length - 1].t_off + shift : 0) / q - EPS);
      Object.keys(by).forEach(function (b) {
        b = +b; if (shift && b === 0) return;                                    // the pickup bar
        var notes = by[b], end = notes[notes.length - 1];
        if (b === lastBar && end.t + end.dur < q - EPS && notes[0].t > EPS) return; // a short tail
        notes.forEach(function (n) { n.t = Math.round(n.t * 12) / 12; n.dur = Math.round(n.dur * 12) / 12; });   // triplets: exact thirds
        if (!bq || Math.abs(q - bq) < EPS) bars.push(notes);
      });
    });
    return bars;
  }
  // written length (quarters) of a pattern's first bar, from its text: tells a pickup from a full bar
  function firstBar(t) {
    var L = (/^L:\s*(\d+)\/(\d+)/m.exec(t) || [0, 1, 8]), unit = 4 * (+L[1]) / (+L[2]);
    var body = t.split("\n").filter(function (l) { return l.trim() && !/^[A-Za-z]:/.test(l) && !/^%/.test(l); }).join(" ");
    var bar = body.replace(/"[^"]*"/g, "").replace(/\{[^}]*\}/g, "").replace(/![^!]*!/g, "").split("|")[0], q = 0, m, left = 0, re = /\((\d)|[A-Ga-gzx][,']*(\d*)(\/*)(\d*)/g;
    while ((m = re.exec(bar))) {
      if (m[1]) { left = +m[1]; continue; }                         // (3: the next three notes take the time of two
      var num = m[2] ? +m[2] : 1, den = m[3] ? (m[4] ? +m[4] : Math.pow(2, m[3].length)) : 1, f = left > 0 ? 2 / 3 : 1;
      if (left > 0) left--;
      q += unit * num / den * f;
    }
    return q;
  }
  function tonalPatterns(src) {
    var out = [];
    String(src || "").split(/\n(?=X:)/).filter(function (t) { return /X:/.test(t); }).forEach(function (t) {
      var key = (/^K:\s*(\S+)/m.exec(t) || [])[1] || "C", sp = speller(key), chord = (/"([^"]+)"/.exec(t) || [])[1] || "";
      var midis = E.fromAbc(t).sounding.map(function (e) { return e.pitches[0].midi; });
      if (!midis.length) return;
      var ref = 60 + sp.tonic; if (ref > 66) ref -= 12;
      var p = chord ? H().parseChord(chord, 0) : null;
      var steps = midis.map(function (m) { return m - ref; }), fn = p && p.root != null ? fnOf(p.root, { tonic: sp.tonic, minor: sp.minor }) : "other";
      // the notes decide when they all belong to one chord (a set's label can sit on a pattern that spans two)
      var pcs = steps.map(function (x) { return mod(x, 12); }), third = sp.minor ? 3 : 4;
            // the function holding most of the notes (some sets label chords in another key than their notes); the label breaks ties
      var F = { tonic: [0, third, 7], dominant: [7, 11, 2, 5], subdominant: [5, sp.minor ? 8 : 9, 0] }, best = -1;
      Object.keys(F).forEach(function (k) { var n = pcs.filter(function (x) { return F[k].indexOf(x) >= 0; }).length + (k === fn ? 0.5 : 0); if (n > best) { best = n; fn = k; } });
      out.push({ steps: steps, fn: fn });
    });
    return out;
  }

  // ---------- the parts (Skill 2 / 3) ----------
  // bass = root; three voices start on the close tonic chord and move to the nearest tones of each next chord
  function voiceChain(tune, chords) {
    var rest = tune.rest, lo = rest - 5, hi = rest + 10;
    var start = [0, tune.minor ? 3 : 4, 7].map(function (x) { return rest + x; });
    var prev = start, out = [];
    chords.forEach(function (c, i) {
      if (i === 0 && mod(c.root - tune.tonic, 12) === 0) { out.push(start.slice()); return; }
      var pcs = c.tones.map(function (x) { return mod(c.root + x, 12); }), best = null;
      var cand = prev.map(function (p) { return pcs.map(function (pc) { return place(pc, p, lo, hi); }); });
      cand[0].forEach(function (a) { cand[1].forEach(function (b) { cand[2].forEach(function (d) {
        var v = [a, b, d], cost = Math.abs(a - prev[0]) + Math.abs(b - prev[1]) + Math.abs(d - prev[2]);
        var set = {}; v.forEach(function (m) { set[mod(m, 12)] = 1; });
        if (!set[mod(c.root + c.tones[1], 12)]) cost += 6;           // keep the third
        if (Object.keys(set).length < 3) cost += 2;                   // prefer three different tones
        if (a > b || b > d) cost += 1;                                // keep the order of the voices
        if (!best || cost < best.cost) best = { v: v, cost: cost };
      }); }); });
      prev = best.v; out.push(prev.slice());
    });
    return out;
  }
  function solfege(midi, tune) {
    var syl = tune.minor ? ["la", "li", "ti", "do", "di", "re", "ri", "mi", "fa", "fi", "so", "si"] : ["do", "di", "re", "ri", "mi", "fa", "fi", "so", "si", "la", "li", "ti"];
    if (tune.minor) { var d = mod(midi - tune.tonic, 12); var map = { 0: "la", 1: "te", 2: "ti", 3: "do", 4: "di", 5: "re", 6: "ri", 7: "mi", 8: "fa", 9: "fi", 10: "so", 11: "si" }; return map[d].toUpperCase(); }
    return syl[mod(midi - tune.tonic, 12)].toUpperCase();
  }
  function bassOf(c, tune) { return place(c.root, tune.rest + 3, tune.rest, tune.rest + 11); }   // DO up to TI (the book writes SO above DO)

  // ---------- generators ----------
  function make(skill, tune, sets, seed, o) {
    o = o || {};
    var r = rng(seed || 1), bq = tune.bq, bars = tune.bars, R = sets.rhythm && sets.rhythm.length ? sets.rhythm : [[{ t: 0, dur: bq }]];
    var T = sets.tonal || [];
    function rhythmFor(b) { return pick(R, r).map(function (x) { return { t: b * bq + x.t, dur: x.dur }; }); }
    function lastBarHold(notes, pitchAt) {     // the final bar: the last chord's note held
      var lb = (bars - 1) * bq;
      notes = notes.filter(function (n) { return n.t < lb - EPS; });
      notes.push({ t: lb, dur: bq, midi: pitchAt(lb) });
      return notes;
    }
    if (skill === "bass") {
      var step = bq >= 4 ? bq / 2 : bq, ns = [];
      for (var t = 0; t < bars * bq - EPS; t += step) { var c = chordAt(tune, t); ns.push({ t: t, dur: step, midi: bassOf(c, tune) }); }
      return { parts: [{ label: "Bass line (chord roots)", abc: toAbc(ns, tune) }] };
    }
    if (skill === "roots") {
      var n1 = [];
      for (var b = 0; b < bars - 1; b++) rhythmFor(b).forEach(function (x) { n1.push({ t: x.t, dur: x.dur, midi: bassOf(chordAt(tune, x.t), tune) }); });
      n1 = lastBarHold(n1, function (t) { return bassOf(chordAt(tune, t), tune); });
      return { parts: [{ label: "Rhythms on the chord roots", abc: toAbc(n1, tune) }] };
    }
    if (skill === "voices" || skill === "hrhythm" || skill === "partRhy") {
      var seq;
      if (skill === "voices") {                      // the unit's functions in order of first use, back to tonic
        var seen = {}; seq = [];
        tune.ch.forEach(function (c) { if (!seen[c.root]) { seen[c.root] = 1; seq.push(c); } });   // one chord per root (Bb and Bb7 are the same function)
        if (seq.length > 4) seq = tune.ch.filter(function (c) { return c.t < 4 * bq - EPS; });   // many chords (jazz): the first phrase, in order
        if (mod(seq[seq.length - 1].root - tune.tonic, 12) !== 0) seq.push(seq[0]);
        if (seq.length === 1) seq.push(seq[0]);
      } else seq = tune.ch;
      var v = voiceChain(tune, seq), names = ["Bass line (roots)", "Part 2", "Part 3", "Part 4"];
      var lines = [seq.map(function (c) { return bassOf(c, tune); })].concat([0, 1, 2].map(function (k) { return v.map(function (x) { return x[k]; }); }));
      var labels = lines.map(function (l, k) {
        var s = []; l.forEach(function (m) { var y = solfege(m, tune); if (s.indexOf(y) < 0) s.push(y); });
        return k === 0 ? "Bass line: " + s.join(" and ") : s.join(" and ");
      });
      if (skill === "voices") {
        var vt = { bq: 4, bars: seq.length, n: 4, d: 4, key: tune.key, spell: tune.spell, ch: seq.map(function (c, i) { return { t: i * 4, sym: c.sym }; }) };
        return { parts: lines.map(function (l, k) {
          return { label: labels[k], abc: toAbc(l.map(function (m, i) { return { t: i * 4, dur: 4, midi: m, word: solfege(m, tune) }; }), vt, { words: true }) };
        }) };
      }
      if (skill === "hrhythm") return { parts: lines.map(function (l, k) {
        return { label: names[k] + (k ? " (" + labels[k] + ")" : ""), abc: toAbc(seq.map(function (c, i) { return { t: c.t, dur: c.end - c.t, midi: l[i] }; }), tune) };
      }) };
      var part = o.part || 0, line = lines[part], at = function (t) { var i = 0; seq.forEach(function (c, k) { if (c.t <= t + EPS) i = k; }); return line[i]; }, n4 = [];
      for (var b4 = 0; b4 < bars - 1; b4++) rhythmFor(b4).forEach(function (x) { n4.push({ t: x.t, dur: x.dur, midi: at(x.t) }); });
      n4 = lastBarHold(n4, at);
      return { parts: [{ label: "Rhythms on " + names[part].toLowerCase(), abc: toAbc(n4, tune) }] };
    }
    if (skill === "macro" || skill === "tonalRhy" || skill === "series") {
      // pitches: for each chord span, a pattern of that chord's function, its notes used in turn and moved by octaves to stay close
      var prevM = tune.rest, cur = null, curC = null, idx = 0;
      function nextPitch(t) {
        var c = chordAt(tune, t);
        if (c !== curC || !cur || idx >= cur.steps.length) {
          var pool = T.filter(function (p) { return p.fn === c.fn; });
          var base = mod(tune.tonic - 0, 12);
          if (!pool.length) pool = [{ steps: c.tones.slice(0, 3).map(function (x) { return mod(c.root - base, 12) + x; }) }];
          if (c !== curC || !cur || idx >= cur.steps.length) { cur = pick(pool, r); idx = 0; curC = c; }
        }
        var m = place(mod(tune.rest + cur.steps[idx++], 12), prevM, tune.rest - 5, tune.rest + 12);
        prevM = m; return m;
      }
      if (skill === "series") {
        var n0 = [], chs = tune.ch.slice(0, 4), tt = 0, series = { bq: tune.bq, bars: chs.length, n: tune.n, d: tune.d, key: tune.key, spell: tune.spell, ch: [] };
        chs.forEach(function (c) {
          var pool = T.filter(function (p) { return p.fn === c.fn; }), p = pool.length ? pick(pool, r) : { steps: [mod(c.root - tune.tonic, 12)] };
          series.ch.push({ t: tt, sym: c.sym });
          var per = tune.macro, k = Math.min(p.steps.length, Math.round(tune.bq / per));   // a note a macrobeat; the last holds to the bar line
          p.steps.slice(0, k).forEach(function (s, i) { var m = place(mod(tune.rest + s, 12), prevM, tune.rest - 5, tune.rest + 12); prevM = m;
            n0.push({ t: tt + i * per, dur: i === k - 1 ? tune.bq - i * per : per, midi: m, word: solfege(m, tune) }); });
          tt += tune.bq;
        });
        return { parts: [{ label: "A series of patterns over " + chs.map(function (c) { return c.sym; }).join(" – "), abc: toAbc(n0, series, { words: true }) }] };
      }
      var notes = [];
      if (skill === "macro") {
        var mq = o.macro || tune.macro;
        for (var t5 = 0; t5 < (bars - 1) * bq - EPS; t5 += mq) notes.push({ t: t5, dur: mq, midi: nextPitch(t5) });
      } else for (var b6 = 0; b6 < bars - 1; b6++) rhythmFor(b6).forEach(function (x) { notes.push({ t: x.t, dur: x.dur, midi: nextPitch(x.t) }); });
      notes = lastBarHold(notes, function (t) { return place(chordAt(tune, t).root, prevM, tune.rest - 5, tune.rest + 12); });   // the last chord's root (a tune can end on a turnaround)
      return { parts: [{ label: skill === "macro" ? "Tonal patterns, a note per macrobeat" : "Tonal patterns in rhythm", abc: toAbc(notes, tune) }] };
    }
    if (skill === "embellish") {
      var mel = tune.mel.map(function (x) { return { t: x.t, dur: x.dur, midi: x.midi }; }), outN = [];
      function scaleStep(m, dir) { for (var k = 1; k <= 2; k++) { var x = m + dir * k; if (tune.spell.steps.indexOf(mod(x - tune.tonic, 12)) >= 0 || (tune.minor && mod(x - tune.tonic, 12) === 11)) return x; } return m + dir * 2; }
      mel.forEach(function (x, i) {
        var nx = mel[i + 1], gap = nx ? nx.midi - x.midi : 0, room = nx && Math.abs(nx.t - (x.t + x.dur)) < EPS;
        var even = function (q) { return Math.abs(q * 2 - Math.round(q * 2)) < EPS && Math.abs(x.t * 4 - Math.round(x.t * 4)) < EPS; };
        room = room && even(x.dur) && (x.dur < 2 - EPS || Math.abs(x.dur - Math.round(x.dur)) < EPS);
        if (room && x.dur >= 1 - EPS && Math.abs(gap) >= 3 && Math.abs(gap) <= 4 && r() < 0.7) {       // a third: a passing tone
          outN.push({ t: x.t, dur: x.dur / 2, midi: x.midi }); outN.push({ t: x.t + x.dur / 2, dur: x.dur / 2, midi: scaleStep(x.midi, gap > 0 ? 1 : -1) });
        } else if (room && x.dur >= 1 - EPS && gap === 0 && r() < 0.6) {                               // a repeat: a neighbour
          outN.push({ t: x.t, dur: x.dur / 2, midi: x.midi }); outN.push({ t: x.t + x.dur / 2, dur: x.dur / 2, midi: scaleStep(x.midi, r() < 0.5 ? 1 : -1) });
        } else if (room && x.dur >= 2 - EPS && r() < 0.5) {                                              // a long note: turn around it
          outN.push({ t: x.t, dur: x.dur / 2, midi: x.midi }); outN.push({ t: x.t + x.dur / 2, dur: x.dur / 4, midi: scaleStep(x.midi, 1) });
          outN.push({ t: x.t + 3 * x.dur / 4, dur: x.dur / 4, midi: x.midi });
        } else outN.push(x);
      });
      return { parts: [{ label: "The melody, decorated", abc: toAbc(outN, tune) }] };
    }
    if (skill === "rseries") {
      var a = pick(R, r), b2 = pick(R, r), ph = { bq: tune.bq, bars: 2, n: tune.n, d: tune.d, key: tune.key, spell: tune.spell, ch: [] };
      var nr = a.map(function (x) { return { t: x.t, dur: x.dur, midi: tune.rest }; }).concat(b2.map(function (x) { return { t: bq + x.t, dur: x.dur, midi: tune.rest }; }));
      return { parts: [{ label: "A two-bar rhythm phrase", abc: toAbc(nr, ph).replace(/^K:(.*)$/m, "K:$1 clef=none") }] };
    }
    if (skill === "answer") {
      var phrase = (o.phraseBars || 4) * bq, keep = tune.mel.filter(function (x) { return Math.floor(x.t / phrase + EPS) % 2 === 0; });
      return { parts: [{ label: "Antecedent phrases; the consequents are yours", abc: toAbc(keep, tune) }] };
    }
    throw new Error("no skill " + skill);
  }

  var api = { parse: parse, rhythmBars: rhythmBars, tonalPatterns: tonalPatterns, make: make, toAbc: toAbc, speller: speller, voiceChain: voiceChain, solfege: solfege, chordAt: chordAt };
  global.DMTISkills = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
