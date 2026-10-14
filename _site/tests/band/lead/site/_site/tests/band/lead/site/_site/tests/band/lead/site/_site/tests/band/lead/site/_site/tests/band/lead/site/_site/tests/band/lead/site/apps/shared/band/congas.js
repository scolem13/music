// congas.js — conga part for the backing band (BandCongas).
// A pair of congas (a higher drum, the conga, and a lower one, the tumba) played with the hands. Pure logic: it returns
// abstract events and never touches audio. Silent unless a pattern is asked for.
//
//   var congas = BandCongas.create({ rng });   // rng: () => [0,1), seeded by the player; its own, so the other parts draw the same numbers with or without congas
//   congas.bar(ctx)    -> [{ pos, piece, vel, stroke, hand, straight? }]   one bar of events
//   congas.ending(ctx) -> the final tone
//   congas.reset()
//
// ctx is the shared bar context (see player.js; the same one drums.js reads). This part reads index, beats, compound, tempo,
// phrase, intensity, stop, last, intro and opts.congas: a PATTERNS id (unset, "" or "none" = silent: no events, no random numbers).
// pos is in beats from the bar start; x.5 is the off-beat eighth and the PLAYER swings it. In a compound meter (6/8, 9/8, 12/8) a beat
// is a dotted quarter and its eighths sit at x.333 and x.667, written straight:true.
// stroke: "H" heel, "T" toe (fingertips), "S" slap, "O" open tone, "M" muffled tone, "B" bass tone. hand: "L" | "R".
// piece: congaHeel congaToe congaSlap congaOpen congaMute congaBass tumbaOpen tumbaMute tumbaBass — sounds.js decides which sample
// each is. The tumba has no heel, toe or slap of its own here: they are played as its muffled tone.
//
// PATTERNS: id -> { bars, three?, triplet? }. Each is a list of rows [pos, drum, stroke, hand, vel], drum "c" (conga) or "t" (tumba).
//   bars     a list of 4/4 bars (one or two; a two-bar pattern follows ctx.index, odd/even, as the drum grooves do). A 2/4 bar takes the
//            first half; a bar of five or more beats goes on from the top.
//   three    optional: one bar of 3/4 (a list of rows).
//   triplet  optional: one bar of 12/8, four beats of three. In 6/8 and 9/8 its last beat stays last and the beats before it are taken
//            from the front. Positions are written straight (x.333, x.667).
// A pattern with no bar for the meter plays the one `steady` has. To add one: a row in PATTERNS, then the catalog (see ADDING-STYLES.md).
//
// Stop time (ctx.stop): one open tone on beat 1, then nothing. The final bar of a turnaround (ctx.last) plays on, for now: fill(ctx) is
// the place for a fill into the next chorus. ending(): one open tone on beat 1.

(function (global) {
  var T = 1 / 3;

  // drum + stroke -> the band's piece name
  var PIECE = {
    c: { H:"congaHeel", T:"congaToe", S:"congaSlap", O:"congaOpen", M:"congaMute", B:"congaBass" },
    t: { H:"tumbaMute", T:"tumbaMute", S:"tumbaMute", O:"tumbaOpen", M:"tumbaMute", B:"tumbaBass" }
  };
  var STROKES = { H:"heel", T:"toe", S:"slap", O:"open", M:"muffled", B:"bass" };

  // the tumbao's eight eighths: heel toe slap toe heel toe open open, all on the conga (a = quiet strokes, s = slap, o = opens)
  function tumbao(a, ta, s, o){
    return [[0, "c", "H", "L", a], [0.5, "c", "T", "L", ta], [1, "c", "S", "R", s], [1.5, "c", "T", "L", ta],
            [2, "c", "H", "L", a], [2.5, "c", "T", "L", ta], [3, "c", "O", "R", o], [3.5, "c", "O", "R", o]];
  }
  // 12/8: on each beat heel-toe-toe, quietly; a slap on beat 2; the last two eighths of beat 4 open
  function twelve(a, ta, s, o){
    var out = [];
    for (var b = 0; b < 4; b++){
      var h = b === 1 ? ["S", "R", s] : ["H", "L", a];
      out.push([b, "c", h[0], h[1], h[2]]);
      if (b === 3){ out.push([b + T, "c", "O", "R", o], [b + 2 * T, "c", "O", "L", o]); }
      else { out.push([b + T, "c", "T", b === 1 ? "L" : "R", ta], [b + 2 * T, "c", "T", b === 1 ? "R" : "L", ta]); }
    }
    return out;
  }

  var PATTERNS = {
    // Heel, toe, slap, toe, heel, toe, open, open: the basic conga part of son, cha-cha and boogaloo. One drum, the hands alternating.
    tumbao: { bars: [ tumbao(0.30, 0.34, 0.62, 0.60) ] },
    // The same, with two open tones on the lower drum in the second bar, on the and of 2 and on 3 (right hand, in place of the
    // toe and the heel). That is the bar of the clave's three notes when the clave is 2-3, as in the Son montuno style: the low
    // drum sounds the bombo (Mauleón, Salsa Guidebook, p. 64).
    tumbao2: { bars: [ tumbao(0.30, 0.34, 0.62, 0.60),
                       tumbao(0.30, 0.34, 0.62, 0.60).map(function (r){ return r[0] === 1.5 || r[0] === 2 ? [r[0], "t", "O", "R", 0.58] : r; }) ] },
    // Learning steps: each is a true subset of the tumbao, so they can be layered (the lessons build the tumbao from them).
    // opens: only the two right-hand open tones, on 4 and the and of 4.
    opens: { bars: [ tumbao(0.30, 0.34, 0.62, 0.60).filter(function (r){ return r[0] >= 3; }) ] },
    // slapopen: the right hand alone: the slap on 2 and the two open tones.
    slapopen: { bars: [ tumbao(0.30, 0.34, 0.62, 0.60).filter(function (r){ return r[3] === "R"; }) ] },
    // heeltoe: the left hand alone: heel on 1, toe on the and of 1, toe on the and of 2, heel on 3, toe on the and of 3.
    heeltoe: { bars: [ tumbao(0.30, 0.34, 0.62, 0.60).filter(function (r){ return r[3] === "L"; }) ] },
    // A part for any music: opens on 4 and the and of 4, a slap on 2, light heel-toe between; quieter than the tumbao.
    // Also what every other pattern falls back on in a meter it has no bar for.
    steady: {
      bars: [ tumbao(0.26, 0.30, 0.54, 0.52) ],
      three: [[0, "c", "H", "L", 0.26], [0.5, "c", "T", "L", 0.30], [1, "c", "S", "R", 0.54], [1.5, "c", "T", "L", 0.30], [2, "c", "O", "R", 0.52], [2.5, "c", "O", "R", 0.52]],
      triplet: twelve(0.24, 0.28, 0.54, 0.52)
    }
  };

  function isBars(x){ return !!(x && x[0] && typeof x[0][0] === "object"); }
  function fallback(){ return PATTERNS.steady; }

  // the rows for this bar: [[pos, drum, stroke, hand, vel], ...] already fitted to the meter
  function rowsFor(pat, ctx){
    var beats = ctx.beats || 4, i = ctx.index | 0, st = fallback();
    if (ctx.compound){
      var tr = pat.triplet || st.triplet, last = [], head = [];
      if (beats >= 4){ var more = []; for (var k = 0; k * 4 < beats; k++) tr.forEach(function (r){ if (r[0] + 4 * k < beats - 1e-6) more.push([r[0] + 4 * k, r[1], r[2], r[3], r[4]]); }); return more; }
      tr.forEach(function (r){ if (r[0] >= 3) last.push([r[0] - 3 + (beats - 1), r[1], r[2], r[3], r[4]]); else if (r[0] < beats - 1) head.push(r); });
      return head.concat(last);
    }
    if (beats === 3){
      var th = pat.three || st.three;
      return isBars(th) ? th[i % th.length] : th;
    }
    var bars = pat.bars || st.bars, bar = bars[i % bars.length];
    if (beats === 4) return bar;
    var out = [];
    for (var k = 0; k * 4 < beats; k++) bar.forEach(function (r){ var p = r[0] + 4 * k; if (p < beats - 1e-6) out.push([p, r[1], r[2], r[3], r[4]]); });
    return out;
  }

  function create(cfg){
    var rng = (cfg && cfg.rng) || Math.random;

    function id(ctx){ var p = ctx && ctx.opts && ctx.opts.congas; return p && p !== "none" && PATTERNS.hasOwnProperty(p) ? p : null; }
    function one(pos, stroke, hand, vel, drum){ return { pos: pos, piece: PIECE[drum || "c"][stroke], vel: vel, stroke: stroke, hand: hand }; }

    // Fill into the next chorus or section. Not written yet: congas play straight through, as they do in the bars before a chorus.
    // Return { from, hits } like drums.fillNow, or events for the last beats of the bar; null = no fill.
    function fill(ctx){ return null; }

    // opts.written (a BandGroove object or its text): the hand lanes of a groove somebody wrote down, played as written (see
    // drums.js, which does the same with the kit's lanes). It takes the place of any pattern.
    function writtenBar(ctx){
      var w = ctx.opts.written, B = global.BandGroove; if (typeof w === "string") w = B.parse(w);
      var sw = ctx.opts.writtenSwing, bars = B.congaEvents(w, { swing: sw == null ? true : sw }), beats = ctx.beats || 4;
      return bars[(ctx.index || 0) % bars.length].filter(function (e){ return e.pos < beats; })
        .map(function (e){ return { pos: e.pos, piece: e.piece, vel: e.vel, stroke: e.stroke, hand: "R", straight: true }; });
    }
    function bar(ctx){
      if (ctx && ctx.opts && ctx.opts.written && global.BandGroove) return writtenBar(ctx);
      var p = id(ctx); if (!p) return [];
      if (ctx.stop) return [one(0, "O", "R", 0.6)];
      var rows = rowsFor(PATTERNS[p], ctx), busy = ctx.intensity == null ? 0.5 : ctx.intensity, f = fill(ctx), out = [];
      rows.forEach(function (r){
        var v = r[4];
        if (v < 0.45) v *= 0.85 + 0.30 * busy;                  // the light strokes lift as the band builds; the accents stay
        v += (rng() - 0.5) * 0.04;                              // never twice the same
        var ev = one(r[0], r[2], r[3], Math.round(Math.max(0.05, Math.min(1, v)) * 1000) / 1000, r[1]);
        if (ctx.compound || Math.abs(r[0] * 2 - Math.round(r[0] * 2)) > 1e-6) ev.straight = true;
        out.push(ev);
      });
      if (f && f.length) out = out.concat(f);
      return out;
    }
    function ending(ctx){ if (ctx && ctx.opts && ctx.opts.written) return []; return id(ctx) ? [one(0, "O", "R", 0.62)] : []; }
    function reset(){}

    return { bar: bar, ending: ending, reset: reset, fill: fill };
  }

  global.BandCongas = { create: create, PATTERNS: PATTERNS, STROKES: STROKES, PIECE: PIECE };
})(typeof window !== "undefined" ? window : globalThis);
