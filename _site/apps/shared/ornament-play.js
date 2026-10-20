// ornament-play.js — play the ornament signs abcjs draws (OrnamentPlay). abcjs's own MIDI drops them from midiPitches, so
// a player that schedules from abcjs's timing (AbcPlay, the Classical Themes' Play) asks this script how to sound each note.
//
//   var orn = OrnamentPlay.prepare(visualObj, { era })   once per play: each note's signs and its upper / lower neighbour
//                                                        in the key, with accidentals carried through the bar
//   orn.notes(m, at, dur, e) -> [{ at, dur, midi, vel }] m = one of event e's midiPitches (has startChar and pitch);
//                                                        at / dur in seconds; vel is a factor (1 = the written note's)
//   OrnamentPlay.era(composer, year) -> "old" | "new"
//
// The realisations follow the tables in lessons/grace-notes-ornaments.qmd (scripts/ornaments/*.py):
//   "old" (before Hummel, 1828: J. S. Bach's Explication, C.P.E. Bach, Türk, Clementi): trill and prall from the note above,
//       the prall (Bach's Trillo) as upper-main-upper-main, the last held.
//   "new" (Hummel, 1828, and after): trill from the main note; the prall a Schneller, main-upper-main.
//   Both: mordent main-lower-main, turn upper-main-lower-main, inverted turn lower-main-upper-main, all on the beat,
//   quick notes about a 32nd at the tempo (kept between 55 and 95 ms), the main note held for the rest.
//   A trill fills about 85 % of its note in even notes and ends on the main note. A note too short for its ornament gets
//   a shorter one (a trill becomes a prall). On a chord only the top note is ornamented.
(function (global) {
  var SEMI = [0, 2, 4, 5, 7, 9, 11];
  var ACC = { sharp: 1, flat: -1, natural: 0, dblsharp: 2, dblflat: -2, quartersharp: 0, quarterflat: 0 };
  var OLD = /\b(bach|handel|händel|vivaldi|telemann|couperin|rameau|scarlatti|purcell|corelli|haydn|mozart|gluck|boccherini|clementi|pergolesi|lully|tartini|geminiani|albinoni|pachelbel|buxtehude|frescobaldi|monteverdi|stamitz|salieri|beethoven|cimarosa|paisiello)\b/i;

  function era(composer, year) {
    if (year && +year > 0) return +year < 1828 ? "old" : "new";
    return OLD.test(composer || "") ? "old" : "new";
  }

  // staff position (0 = middle C) -> midi, with an accidental offset
  function midiOf(pos, acc) { var o = Math.floor(pos / 7), l = pos - o * 7; return 60 + 12 * o + SEMI[l] + acc; }
  function letter(pos) { return "cdefgab"[((pos % 7) + 7) % 7]; }

  // walk every voice: signs and neighbours by startChar
  function scan(v) {
    var map = {};
    (v.lines || []).forEach(function (line) {
      (line.staff || []).forEach(function (st) {
        var keyAcc = {};
        var setKey = function (k) { keyAcc = {}; ((k && k.accidentals) || []).forEach(function (a) { keyAcc[a.note.toLowerCase()] = ACC[a.acc] || 0; }); };
        setKey(st.key);
        (st.voices || []).forEach(function (voice) {
          var bar = {};   // accidentals written in this bar, by staff position
          var accAt = function (pos) { return pos in bar ? bar[pos] : (keyAcc[letter(pos)] || 0); };
          voice.forEach(function (el) {
            if (el.el_type === "bar") { bar = {}; return; }
            if (el.el_type === "key" || el.el_type === "keySignature") { setKey(el); return; }
            if (el.el_type !== "note" || !el.pitches) return;
            el.pitches.forEach(function (p) { if (p.accidental && p.accidental in ACC) bar[p.pitch] = ACC[p.accidental]; });
            var d = el.decoration || [];
            if (!d.length) return;
            var top = el.pitches.reduce(function (a, p) { return p.pitch > a.pitch ? p : a; }, el.pitches[0]);
            var main = midiOf(top.pitch, accAt(top.pitch));
            map[el.startChar] = {
              decos: d, up: midiOf(top.pitch + 1, accAt(top.pitch + 1)) - main, down: midiOf(top.pitch - 1, accAt(top.pitch - 1)) - main,
              topPos: top.pitch, nPitches: el.pitches.length,
            };
          });
        });
      });
    });
    return map;
  }

  var KINDS = ["trill", "uppermordent", "pralltriller", "lowermordent", "mordent", "turn", "invertedturn", "turnx", "invertedturnx", "roll"];

  function realise(kind, oldWay, up, down, dur, spt) {
    // spt: seconds per 32nd at the tempo
    var u = Math.max(0.055, Math.min(0.095, spt || 0.075)), seq;
    var fits = function (n) { if (n * u > dur * 0.8) u = dur * 0.8 / n; return u >= 0.035; };
    var U = up, M = 0, L = down;
    if (kind === "trill") {
      var n = Math.floor(dur * 0.85 / u);
      if (n < 5) kind = "uppermordent";
      else {
        seq = []; var first = oldWay ? U : M;
        if ((n % 2 === 1) !== (first === M)) n--;      // end on the main note
        for (var i = 0; i < n; i++) seq.push(i % 2 === 0 ? first : (first === M ? U : M));
        if (seq[seq.length - 1] !== M) seq.push(M);
        return hold(seq, u, dur);
      }
    }
    if (kind === "uppermordent" || kind === "pralltriller") seq = oldWay ? [U, M, U, M] : [M, U, M];
    else if (kind === "lowermordent" || kind === "mordent") seq = [M, L, M];
    else if (kind === "turn" || kind === "turnx") seq = [U, M, L, M];
    else if (kind === "invertedturn" || kind === "invertedturnx") seq = [L, M, U, M];
    else if (kind === "roll") seq = [M, U, M, L, M];
    else return null;
    if (!fits(seq.length)) { if (seq.length > 3 && (kind === "uppermordent" || kind === "pralltriller")) { seq = [M, U, M]; u = Math.max(0.035, Math.min(0.095, spt || 0.075)); if (!fits(3)) return null; } else return null; }
    return hold(seq, u, dur);
  }
  // quick notes of u seconds, the last one held to the end of the note
  function hold(seq, u, dur) {
    return seq.map(function (s, i) { var last = i === seq.length - 1; return { off: i * u, dur: last ? dur - i * u : u, step: s }; });
  }

  function prepare(v, opts) {
    opts = opts || {};
    var map = scan(v), oldWay = (opts.era || era(opts.composer, opts.year)) === "old";
    var spt = opts.secPer32 || null;
    if (!spt) try {
      var msBar = v.millisecondsPerMeasure(), mf = v.getMeterFraction();
      spt = msBar / 1000 / (mf.num / mf.den) / 32;
    } catch (e) {}
    return {
      map: map, old: oldWay,
      notes: function (m, at, dur, e) {
        var info = map[m.startChar], plain = [{ at: at, dur: dur, midi: m.pitch, vel: 1 }];
        if (!info) return plain;
        var kind = null;
        info.decos.forEach(function (d) { if (!kind && KINDS.indexOf(d) >= 0) kind = d; });
        if (!kind) return plain;
        // a chord: only its top note is ornamented (e = the event, whose midiPitches hold the chord)
        if (info.nPitches > 1 && e && e.midiPitches && e.midiPitches.some(function (o) { return o.startChar === m.startChar && o.pitch > m.pitch; })) return plain;
        var r = realise(kind, oldWay, info.up, info.down, dur, spt);
        if (!r) return plain;
        return r.map(function (n, i) { return { at: at + n.off, dur: n.dur, midi: m.pitch + n.step, vel: i === 0 ? 1 : 0.8 }; });
      },
    };
  }

  global.OrnamentPlay = { prepare: prepare, era: era, realise: realise, _scan: scan };
})(window);
