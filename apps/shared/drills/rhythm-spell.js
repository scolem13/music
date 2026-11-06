// rhythm-spell.js — rhythms spelled for the meter (Hutchinson ch. 4.6, "show the beat"). Load after drills.js.
// Two engines:
//   rhyfix  "Written:" a misspelled bar, then A / B / C: pick the same rhythm written to show the beat.
//           The wrong choices: the same notation with one tie dropped (or a rest made a note: it sounds different),
//           and the rhythm misspelled another way.
//   rhyerr  one bar: is it right, or does a note, a rest or the beaming hide the beat?
// These are the mistakes notation programs let through: they write the length you pick where you put it (a half note on
// beat 2 of 4/4 stays a half note), so the misspellings below are the ones typed in, not ones the program makes.
// (MuseScore's behaviour is from use, unverified; it has a Regroup Rhythms command, also unverified.)
//
// A bar is a list of spans {s, e, rest} in sixteenths (a tie chain or a run of rests is one span). The spelling of a span
// is split() below: a piece is kept when allowed(), else cut at the strongest point inside it (middle of the bar, then
// beats, then half beats) and each half spelled again. The rules (this site's strict reading of "show the beat"):
//   notes, simple meter: inside one beat; or starting on a beat and not crossing the middle of 4/4 (a dotted half on
//     beat 1 of 4/4 is allowed); or the eighth-quarter-eighth syncopation (a beat long, starting half a beat in, not across
//     the middle); or the whole bar.
//   notes, compound meter: inside one beat; or whole beats from a beat, not across the middle of 12/8.
//   rests: inside one beat (compound: from the beat's start, or an eighth or shorter); a beat; half of 4/4 or 12/8 from
//     its start; the whole of a two-beat bar.
// A wrong spelling merges two neighbouring pieces into one value that is clearly wrong (wrongPiece): it crosses the
// middle, or crosses a beat from off the beat (simple: not the syncopation), or (compound) crosses a beat and ends off one.
(function (global) {
  var D = global.Drills; if (!D) return;
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // T bar length, b beat, mid the middle that must show (0 = none), all in sixteenths
  var METERS = {
    "2/4": { T: 8, b: 4 }, "3/4": { T: 12, b: 4 }, "4/4": { T: 16, b: 4, mid: 8 }, "2/2": { T: 16, b: 8 },
    "6/8": { T: 12, b: 6, comp: true }, "9/8": { T: 18, b: 6, comp: true }, "12/8": { T: 24, b: 6, comp: true, mid: 12 }
  };
  var MLIST = Object.keys(METERS);
  var VALID = { 1: 1, 2: 1, 3: 1, 4: 1, 6: 1, 8: 1, 12: 1, 16: 1, 24: 1 };
  var CELLS = {
    4: [[4], [4], [2, 2], [2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1], [3, 1]],
    8: [[8], [4, 4], [4, 2, 2], [2, 2, 4], [2, 2, 2, 2], [6, 2]],
    6: [[6], [2, 2, 2], [2, 2, 2], [4, 2], [2, 4], [3, 1, 2], [2, 1, 1, 2]]
  };

  function crossesMid(m, s, e) { return !!m.mid && s < m.mid && m.mid < e; }
  function sameBeat(m, s, e) { return Math.floor(s / m.b) === Math.floor((e - 1) / m.b); }
  function allowed(m, s, e, rest) {
    var L = e - s; if (!VALID[L]) return false;
    if (rest) {
      if (sameBeat(m, s, e)) return !m.comp || s % m.b === 0 || L <= 2;
      if (s % m.b === 0 && L === m.b) return true;
      if (m.mid && s % m.mid === 0 && L === m.mid) return true;
      return s === 0 && L === m.T && m.T === 2 * m.b;
    }
    if (s === 0 && e === m.T) return true;
    if (sameBeat(m, s, e)) return true;
    if (crossesMid(m, s, e)) return m.mid === 8 && s === 0 && L === 12;          // dotted half on beat 1 of 4/4
    if (m.comp) return s % m.b === 0 && e % m.b === 0;
    if (s % m.b === 0) return true;
    return s % m.b === m.b / 2 && L === m.b;                                        // eighth-quarter-eighth
  }
  function wrongPiece(m, s, e, rest) {
    if (!VALID[e - s] || allowed(m, s, e, rest)) return false;
    if (crossesMid(m, s, e)) return true;
    if (sameBeat(m, s, e)) return false;
    if (m.comp) return s % m.b !== 0 || e % m.b !== 0;
    return s % m.b !== 0;
  }
  function level(m, t) {
    if (m.mid && t % m.mid === 0) return 5;
    if (t % m.b === 0) return 4;
    if (t % (m.comp ? 2 : m.b / 2) === 0) return 3;
    if (t % 2 === 0) return 2;
    return 1;
  }
  function split(m, s, e, rest) {
    if (allowed(m, s, e, rest)) return [[s, e]];
    var best = -1, at = -1;
    for (var t = s + 1; t < e; t++) { var l = level(m, t); if (l >= best) { best = l; at = t; } }
    return split(m, s, at, rest).concat(split(m, at, e, rest));
  }

  // a random bar: per-beat cells, some notes tied over a beat, some rests
  function makeBar(m, restChance) {
    var ev = [], at = 0;
    for (var k = 0; k < m.T / m.b; k++) pick(CELLS[m.b]).forEach(function (d) { ev.push({ s: at, e: at + d, rest: Math.random() < restChance }); at += d; });
    if (ev.every(function (x) { return x.rest; })) ev[0].rest = false;
    var spans = [];
    ev.forEach(function (x) {
      var p = spans[spans.length - 1];
      if (p && p.rest && x.rest) { p.e = x.e; return; }                                   // rests run together
      if (p && !p.rest && !x.rest && x.s % m.b === 0 && Math.random() < 0.45) { p.e = x.e; return; }   // tied over the beat
      spans.push({ s: x.s, e: x.e, rest: x.rest });
    });
    return spans;
  }
  // pieces: [{s, e, rest, tie}] (tie = tied to the next)
  function spell(m, spans) {
    var out = [];
    spans.forEach(function (sp) {
      var ps = split(m, sp.s, sp.e, sp.rest);
      ps.forEach(function (p, i) { out.push({ s: p[0], e: p[1], rest: sp.rest, tie: !sp.rest && i < ps.length - 1 }); });
    });
    return out;
  }
  // every clearly wrong merge of two neighbouring pieces of one span
  function merges(m, pcs, kind) {
    var out = [];
    for (var i = 0; i < pcs.length - 1; i++) {
      var a = pcs[i], b = pcs[i + 1];
      if (a.rest !== b.rest || (!a.rest && !a.tie)) continue;
      if ((kind === "rest") !== a.rest) continue;
      if (!wrongPiece(m, a.s, b.e, a.rest)) continue;
      var c = pcs.map(function (x) { return { s: x.s, e: x.e, rest: x.rest, tie: x.tie }; });
      c.splice(i, 2, { s: a.s, e: b.e, rest: a.rest, tie: b.tie });
      out.push({ pcs: c, s: a.s, e: b.e });
    }
    return out;
  }
  // beam groups: the beat (correct) or a wrong size (wrong); a beamable note is shorter than a quarter
  var WRONG_BEAM = { "2/4": 6, "3/4": 6, "4/4": [4, 8, 4], "2/2": 12, "6/8": 4, "9/8": 4, "12/8": 4 };
  function beamOf(m, meter, wrong) {
    if (!wrong) return function (t) { return Math.floor(t / m.b); };
    var w = WRONG_BEAM[meter];
    if (Array.isArray(w)) return function (t) { var acc = 0; for (var i = 0; i < w.length; i++) { acc += w[i]; if (t < acc) return i; } return w.length; };
    return function (t) { return Math.floor(t / w); };
  }
  var LEN = function (d) { return d === 1 ? "" : String(d); };
  function abcBar(m, pcs, groupOf, pitch) {
    var s = "";
    pcs.forEach(function (p, i) {
      var q = pcs[i - 1], beamable = function (x) { return x && !x.rest && x.e - x.s < 4; };
      var join = q && beamable(q) && beamable(p) && groupOf(q.s) === groupOf(p.s);
      if (i && !join) s += " ";
      s += (p.rest ? "z" : pitch) + LEN(p.e - p.s) + (p.tie ? "-" : "");
    });
    return s;
  }
  function beamKey(m, pcs, groupOf) { return abcBar(m, pcs, groupOf, "B"); }

  // what a misspelled bar does wrong, in words
  var BEATNAME = ["1", "2", "3", "4", "5", "6"];
  function where(m, s, e) {
    if (crossesMid(m, s, e)) return "hides the middle of the bar (beat " + BEATNAME[m.mid / m.b] + ")";
    var k = Math.floor(s / m.b) + 1;
    return "hides beat " + BEATNAME[k];
  }
  function valueName(m, L, rest) {
    var n = { 1: "sixteenth", 2: "eighth", 3: "dotted eighth", 4: "quarter", 6: "dotted quarter", 8: "half", 12: "dotted half", 16: "whole", 24: "dotted whole" }[L];
    return "the " + n + (rest ? " rest" : "");
  }

  var NAMES_K = { note: "A note across the beat (tie it)", rest: "A rest across the beat (two rests)", beam: "Beams across the beat" };
  var SET = [
    { id: "meters", label: "Meters", type: "multi", options: MLIST, def: ["2/4", "3/4", "4/4", "6/8"] },
    { id: "kinds", label: "Mistakes", type: "multi", options: ["note", "rest", "beam"], names: NAMES_K, def: ["note", "rest", "beam"] },
    { id: "show", label: "Show", type: "select", options: ["staff", "both"], names: { staff: "Staff only", both: "Staff, and play it" }, def: "staff" }
  ];
  function head(meter) { return "X:1\nM:" + meter + "\nL:1/16\nK:C clef=perc stafflines=1\n"; }
  function playOf(pcs, startAt, out) {
    var sx = 60 / 90 / 4;
    pcs.forEach(function (p, i) {
      if (p.rest) return;
      var prev = pcs[i - 1]; if (prev && prev.tie) { out.durs[out.durs.length - 1] += (p.e - p.s) * sx; return; }
      out.play.push(72); out.times.push((startAt + p.s) * sx); out.durs.push((p.e - p.s) * sx * 0.9);
    });
    return out;
  }

  // one misspelling of the bar: {pcs, beam, kind, why}
  function misspell(m, meter, good, kind) {
    var gb = beamOf(m, meter, false);
    if (kind === "beam") {
      var wb = beamOf(m, meter, true);
      if (beamKey(m, good, wb) === beamKey(m, good, gb)) return null;
      return { pcs: good, beam: wb, kind: kind, why: "the beams join notes from different beats; beam each " + (m.comp ? "dotted-quarter " : "") + "beat on its own" };
    }
    var c = merges(m, good, kind); if (!c.length) return null;
    var x = pick(c);
    return { pcs: x.pcs, beam: gb, kind: kind, why: valueName(m, x.e - x.s, kind === "rest") + " " + where(m, x.s, x.e) + (kind === "rest" ? "; write a rest for each part" : "; write it as tied notes") };
  }
  function makeGood(s, needKinds) {
    for (var t = 0; t < 400; t++) {
      var meter = pick(s.meters.length ? s.meters : MLIST), m = METERS[meter];
      var good = spell(m, makeBar(m, needKinds.indexOf("rest") >= 0 && needKinds.length === 1 ? 0.35 : 0.15));
      var ok = needKinds.every(function (k) { return misspell(m, meter, good, k); });
      if (ok) return { meter: meter, m: m, good: good };
    }
    return null;
  }
  // the same notation but a different sound: one tie dropped, or one rest made a note
  function soundsDifferent(good) {
    var ties = [], rests = [];
    good.forEach(function (p, i) { if (p.tie) ties.push(i); if (p.rest) rests.push(i); });
    var c = good.map(function (x) { return { s: x.s, e: x.e, rest: x.rest, tie: x.tie }; });
    if (ties.length) { c[pick(ties)].tie = false; return { pcs: c, why: "a tie is missing, so a note is played again" }; }
    if (rests.length) { c[pick(rests)].rest = false; return { pcs: c, why: "a rest is played as a note" }; }
    return null;
  }

  D.engines.rhyfix = {
    title: "Respell the rhythm",
    SETTINGS: SET,
    make: function (s) {
      var kinds = s.kinds.length ? s.kinds : ["note", "rest", "beam"];
      for (var t = 0; t < 60; t++) {
        var kind = pick(kinds), g = makeGood(s, [kind]); if (!g) continue;
        var m = g.m, meter = g.meter, gb = beamOf(m, meter, false);
        var shown = misspell(m, meter, g.good, kind), diff = soundsDifferent(g.good);
        if (!diff) continue;
        var others = ["note", "rest", "beam"].map(function (k) { return misspell(m, meter, g.good, k); }).filter(Boolean)
          .filter(function (x) { return abcBar(m, x.pcs, x.beam, "B") !== abcBar(m, shown.pcs, shown.beam, "B"); });
        if (!others.length) continue;
        var other = pick(others);
        var opts = shuffle([{ k: "good", pcs: g.good, beam: gb }, { k: "diff", pcs: diff.pcs, beam: gb, why: diff.why }, { k: "other", pcs: other.pcs, beam: other.beam, why: other.why }]);
        var keys = opts.map(function (o) { return abcBar(m, o.pcs, o.beam, "B"); });
        if (keys[0] === keys[1] || keys[1] === keys[2] || keys[0] === keys[2]) continue;
        var L = "ABC", ans = L[opts.findIndex(function (o) { return o.k === "good"; })];
        var abc = head(meter) + "\"^Written\"" + abcBar(m, shown.pcs, shown.beam, "B") + " ||\n" +
          opts.map(function (o, i) { return "\"^" + L[i] + "\"" + abcBar(m, o.pcs, o.beam, "B"); }).join(" |\n") + " |]\n";
        var pl = playOf(shown.pcs, 0, { play: [], times: [], durs: [] });
        return { abc: abc, answer: ans, width: 460, play: pl.play, times: pl.times, durs: pl.durs, sound: s.show === "both",
          meter: meter, kind: kind, shown: shown.pcs, good: g.good, opts: opts,
          why: "In the written bar " + shown.why + ". " + opts.filter(function (o) { return o.k !== "good"; }).map(function (o) { return L[opts.indexOf(o)] + ": " + o.why + "."; }).join(" "),
          label: "The first bar is misspelled for " + meter + ". Which bar is the same rhythm, written to show the beat?" };
      }
      return null;
    },
    answers: function () { return ["A", "B", "C"]; },
    explain: function (q) { return q.why; },
    keyHelp: function () { return "Keys: a, b, c."; },
    letterKeys: { a: "A", b: "B", c: "C" },
    noMidi: true,
    midiMatch: function () { return false; }
  };

  var ERR_NAMES = { ok: "Written right", note: "A note hides the beat", rest: "A rest hides the beat", beam: "The beams hide the beat" };
  D.engines.rhyerr = {
    title: "What hides the beat?",
    SETTINGS: SET,
    make: function (s) {
      var kinds = s.kinds.length ? s.kinds : ["note", "rest", "beam"];
      for (var t = 0; t < 60; t++) {
        var kind = Math.random() < 0.25 ? "ok" : pick(kinds), g = makeGood(s, kind === "ok" ? [] : [kind]); if (!g) continue;
        var m = g.m, gb = beamOf(m, g.meter, false);
        var w = kind === "ok" ? { pcs: g.good, beam: gb, why: "every beat" + (m.mid ? " and the middle of the bar" : "") + " can be seen" } : misspell(m, g.meter, g.good, kind);
        // a bar written right may not look like one of the mistakes by chance (it can't: good is spelled by the rules)
        var abc = head(g.meter) + abcBar(m, w.pcs, w.beam, "B") + " |]\n";
        var pl = playOf(w.pcs, 0, { play: [], times: [], durs: [] });
        return { abc: abc, answer: kind, width: 300, play: pl.play, times: pl.times, durs: pl.durs, sound: s.show === "both",
          meter: g.meter, pcs: w.pcs, good: g.good, why: kind === "ok" ? "It is written right: " + w.why + "." : "Here " + w.why + ". Written right: " + abcBar(m, g.good, gb, "B").replace(/B/g, "♩").replace(/z/g, "rest ") + "",
          label: "In " + g.meter + ": is this bar written to show the beat?" };
      }
      return null;
    },
    answers: function (s) { return ["ok"].concat(["note", "rest", "beam"].filter(function (k) { return !s.kinds.length || s.kinds.indexOf(k) >= 0; })); },
    answerName: function (a) { return ERR_NAMES[a]; },
    buttonText: function (a) { return ERR_NAMES[a]; },
    explain: function (q) { return q.why; },
    keyHelp: function () { return "Keys: o right, n note, r rest, b beams."; },
    letterKeys: { o: "ok", n: "note", r: "rest", b: "beam" },
    noMidi: true,
    midiMatch: function () { return false; }
  };
  D.rhythmSpell = { METERS: METERS, allowed: allowed, wrongPiece: wrongPiece, split: split, spell: spell, makeBar: makeBar, merges: merges, abcBar: abcBar, beamOf: beamOf };
})(window);
