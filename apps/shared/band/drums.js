// drums.js — jazz drum-set part for the backing band (BandDrums).
// Simple swing time with a few fills: ride pattern, hi-hat foot on 2 and 4, a feathered
// kick, sparse snare comping, a setup at the end of some 4-bar phrases and a fill into
// every new chorus. Pure logic: it returns abstract events and never touches audio.
//
//   var drums = BandDrums.create({ rng });      // rng: () => [0,1), seeded by the player
//   drums.bar(ctx)    -> [{ pos, piece, vel, straight? }]   one bar of events
//   drums.ending(ctx) -> the final hit
//   drums.reset()
//
// pos is in beats from the bar start. An off-beat eighth is written x.5 and the PLAYER
// swings it; triplet positions carry straight:true so they are left alone.
// piece is a kit-piece NAME (kick snare rim hatClosed hatFoot hatOpen ride rideBell crash
// tomHi tomMid tomLo sticks) — which sample that is lives in sounds.js, not here.
// ctx is the shared bar context (see player.js); this part reads index, length, beats,
// tempo, last and opts: bassFeel ("walk" | "two"), feel ("swing" | "straight": a straight-
// eighths groove with cross-stick on 2 and 4) and ride ("ride" | "hat" | "bell": which
// cymbal keeps the time).
// Stop time (ctx.stop): one hit on beat 1 — kick, snare and a closed hat — then nothing; a
// { pos, choke:"cymbals" } event asks the player to damp whatever cymbal is still ringing. The
// bar after it comes back in with a crash.
// Meters: 3/4 is a jazz waltz (ride "ding, ding-a, ding", hat foot on 2 and 3, kick on 1). The
// compound meters (ctx.compound: 6/8, 9/8, 12/8, where a beat is a dotted quarter) get their own
// groove whatever opts.feel says: all three eighths on the cymbal, kick on 1 (and 3), backbeat on
// 2 (and 4).

(function (global) {
  var T = 1 / 3;   // one triplet step

  // Ride-pattern variants: which of the bar's "2 and 4" beats get the skip note after them.
  var RIDE = [ { w:70, skip:"all" }, { w:12, skip:"last" }, { w:8, skip:"first" }, { w:10, skip:"none" } ];
  var RIDE_FAST = [ { w:45, skip:"all" }, { w:20, skip:"last" }, { w:5, skip:"first" }, { w:30, skip:"none" } ];

  // Snare/kick comping for a bar of plain time: [weight, [[pos, piece, vel], ...]].
  // Mostly space; everything is quiet so it colours the time rather than leading it.
  var COMPS = [
    [38, []],
    [14, [[3.5, "snare", 0.38]]],
    [12, [[1.5, "snare", 0.36]]],
    [ 8, [[3,   "snare", 0.33]]],
    [ 8, [[1.5, "snare", 0.34], [3.5, "snare", 0.40]]],
    [ 6, [[0.5, "snare", 0.32]]],
    [ 8, [[2.5, "snare", 0.36]]],
    [ 6, [[3.5, "kick",  0.50]]]
  ];

  // Fills, written against the LAST n beats of the bar: [offset from the fill's first
  // beat, piece, vel]. Offsets on the triplet grid are emitted straight; x.5 offsets
  // are swung eighths. trip:true fills are skipped at fast tempos.
  var FILLS = {
    small: [
      { n:1, hits:[[0, "snare", 0.46], [0.5, "snare", 0.62]] },
      { n:1, trip:true, hits:[[0, "snare", 0.42], [T, "snare", 0.50], [2*T, "snare", 0.64]] },
      { n:1, hits:[[0.5, "snare", 0.62], [0.5, "kick", 0.50]] },
      { n:1, hits:[[0, "tomHi", 0.52], [0.5, "tomLo", 0.60]] }
    ],
    medium: [
      { n:2, trip:true, hits:[[0, "snare", 0.46], [T, "snare", 0.50], [2*T, "snare", 0.55],
                              [1, "tomHi", 0.60], [1+T, "tomMid", 0.64], [1+2*T, "tomLo", 0.70]] },
      { n:2, hits:[[0, "snare", 0.50], [0.5, "snare", 0.55], [1, "tomHi", 0.60], [1.5, "tomLo", 0.68]] },
      { n:2, hits:[[0.5, "snare", 0.50], [1, "snare", 0.56], [1.5, "snare", 0.68]] },
      { n:2, trip:true, hits:[[0, "snare", 0.48], [2*T, "snare", 0.54], [1, "snare", 0.60], [1+2*T, "tomLo", 0.68]] }
    ],
    large: [
      { n:3, trip:true, hits:[[0.5, "snare", 0.48], [1, "snare", 0.50], [1+T, "snare", 0.54], [1+2*T, "snare", 0.58],
                              [2, "tomHi", 0.62], [2+T, "tomMid", 0.66], [2+2*T, "tomLo", 0.72]] },
      { n:3, hits:[[0, "snare", 0.48], [0.5, "snare", 0.52], [1, "tomHi", 0.56], [1.5, "tomHi", 0.60],
                   [2, "tomMid", 0.64], [2.5, "tomLo", 0.72]] },
      { n:3, trip:true, hits:[[0, "snare", 0.50], [1, "snare", 0.52], [1.5, "snare", 0.56], [2, "snare", 0.60],
                              [2+T, "tomHi", 0.64], [2+2*T, "tomLo", 0.72]] }
    ]
  };

  // ctx.intensity (0..1, from the player's conductor; 0.5 = the plain pattern)
  function busy(ctx){ return ctx.intensity == null ? 0.5 : ctx.intensity; }
  function onEighthGrid(x){ return Math.abs(x * 2 - Math.round(x * 2)) < 1e-6; }

  function create(cfg){
    var rng = (cfg && cfg.rng) || Math.random;
    var afterFill = null;      // "crash" | "kick": how the bar after a fill lands on beat 1
    var lastComp = -1, lastFill = null;

    function weighted(list, weightOf){
      var total = 0, i;
      for (i = 0; i < list.length; i++) total += weightOf(list[i]);
      var r = rng() * total;
      for (i = 0; i < list.length; i++){ r -= weightOf(list[i]); if (r < 0) return i; }
      return list.length - 1;
    }

    // Which size of fill (if any) this bar gets. Every chorus turns around with one;
    // the other 4-bar phrase endings get a small setup less than half the time.
    function fillSize(ctx, beats){
      if (beats < 2) return null;
      var size = null;
      if (ctx.last) size = "large";
      else if (ctx.loopEnd != null ? ctx.loopEnd : ctx.index === ctx.length - 1) size = rng() < 0.6 ? "medium" : "large";
      else if (ctx.index % 4 === 3){ var r = rng(), k = 2 * busy(ctx); size = r < 0.30 * k ? "small" : r < 0.42 * k ? "medium" : null; }   // more set-ups as the band builds
      // a fill never takes the whole bar: at most one beat of a two-beat bar, two of a three-beat bar
      if (size && beats === 2) size = "small";
      if (size === "large" && beats === 3) size = "medium";
      return size;
    }
    function chooseFill(ctx, beats){
      var size = fillSize(ctx, beats); if (!size) return null;
      var playable = FILLS[size].filter(function (f){ return !(f.trip && ctx.tempo > 220); });
      if (ctx.compound){ var tr = playable.filter(function (f){ return f.trip; }); if (tr.length) playable = tr; }   // the beat is already in three
      else if (ctx.opts && ctx.opts.feel === "straight") playable = playable.filter(function (f){ return !f.trip; });
      var pool = playable.filter(function (f){ return f !== lastFill; });   // don't play the same fill twice running
      if (!pool.length) pool = playable;
      var f = pool[Math.floor(rng() * pool.length)];
      lastFill = f;
      return { size: size, n: f.n, hits: f.hits };
    }

    // Compound meters: every eighth on the cymbal, kick on beats 1 and 3, backbeat on 2 and 4
    // (a three-beat bar gets a cross-stick on 2 and 3). The slow-blues / ballad 12/8.
    function compoundBar(ctx){
      var ev = [], beats = ctx.beats || 4, i, b = busy(ctx);
      var fill = chooseFill(ctx, beats), timeEnds = fill ? beats - fill.n : beats;
      var landing = afterFill; afterFill = null;
      var cym = (ctx.opts && ctx.opts.ride) || "ride";
      var beatPiece = cym === "hat" ? "hatClosed" : cym === "bell" ? "rideBell" : "ride";
      var offPiece = cym === "hat" ? "hatClosed" : "ride";
      var back = b < 0.4 ? "rim" : "snare";                              // cross-stick while the band plays down
      if (landing === "crash") ev.push({ pos:0, piece:"crash", vel:0.74 });
      for (i = 0; i < timeEnds; i++){
        if (!(i === 0 && landing === "crash")) ev.push({ pos:i, piece:beatPiece, vel:0.66 });
        ev.push({ pos:i + T, piece:offPiece, vel:0.34, straight:true });
        ev.push({ pos:i + 2 * T, piece:offPiece, vel:0.44, straight:true });
        var isBack = beats === 3 ? i > 0 : i % 2 === 1;
        if (isBack) ev.push({ pos:i, piece: beats === 3 ? "rim" : back, vel: back === "snare" && beats !== 3 ? 0.60 : 0.52 });
        else ev.push({ pos:i, piece:"kick", vel: i === 0 ? (landing ? 0.60 : 0.54) : 0.48 });
      }
      if (cym !== "hat") for (i = 1; i < beats; i += 2) ev.push({ pos:i, piece:"hatFoot", vel:0.42 });
      // a kick pickup on the last eighth before a strong beat, more often as the band builds
      for (i = 1; i < timeEnds; i += 2) if (rng() < 0.12 + 0.3 * b) ev.push({ pos:i + 2 * T, piece:"kick", vel:0.40, straight:true });
      if (fill){
        fill.hits.forEach(function (h){
          var e = { pos: timeEnds + h[0], piece: h[1], vel: h[2] };
          if (!onEighthGrid(h[0])) e.straight = true;
          ev.push(e);
        });
        afterFill = fill.size === "small" ? (rng() < 0.4 ? "crash" : "kick") : (rng() < 0.9 ? "crash" : "kick");
      }
      ev.sort(function (a, c){ return a.pos - c.pos; });
      return ev;
    }

    function stopBar(){
      afterFill = "crash";
      return [ { pos:0, piece:"kick", vel:0.70 }, { pos:0, piece:"snare", vel:0.62 }, { pos:0, piece:"hatClosed", vel:0.55 },
               { pos:0.3, choke:"cymbals", straight:true } ];
    }

    function bar(ctx){
      if (ctx.stop) return stopBar();
      if (ctx.compound) return compoundBar(ctx);
      var ev = [], beats = ctx.beats || 4, i, waltz = beats === 3;
      var two = !!(ctx.opts && ctx.opts.bassFeel === "two");
      var fill = chooseFill(ctx, beats), timeEnds = fill ? beats - fill.n : beats;
      var landing = afterFill; afterFill = null;
      var straight = !!(ctx.opts && ctx.opts.feel === "straight");
      // which cymbal keeps time: the ride, a closed hi-hat (then no hat foot), or the ride's bell on the beats
      var cym = (ctx.opts && ctx.opts.ride) || "ride";
      var beatPiece = cym === "hat" ? "hatClosed" : cym === "bell" ? "rideBell" : "ride";
      var offPiece = cym === "hat" ? "hatClosed" : "ride";

      // beat 1 after a fill: crash (or just a kick accent) instead of the plain ride note
      if (landing === "crash") ev.push({ pos:0, piece:"crash", vel:0.74 });
      if (landing) ev.push({ pos:0, piece:"kick", vel:0.60 });

      // ride: every beat, accenting 2 and 4, with the skip note after them
      var variants = ctx.tempo > 220 ? RIDE_FAST : RIDE;
      var skip = straight ? "none" : variants[weighted(variants, function (v){ return v.w; })].skip;
      var skipBeats = [];
      for (i = 1; i < beats; i += 2) skipBeats.push(i);
      if (skip === "last") skipBeats = skipBeats.slice(-1);
      else if (skip === "first") skipBeats = skipBeats.slice(0, 1);
      else if (skip === "none") skipBeats = [];
      for (i = 0; i < timeEnds; i++){
        if (!(i === 0 && landing === "crash")) ev.push({ pos:i, piece:beatPiece, vel: straight ? 0.62 : (i % 2 ? 0.72 : 0.62) });
        if (straight || skipBeats.indexOf(i) >= 0) ev.push({ pos:i + 0.5, piece:offPiece, vel:0.45 });
      }

      // hi-hat foot on 2 and 4, straight through fills (it is the time-keeper) — unless the hat is being played
      if (cym !== "hat") for (i = 1; i < beats; i += 2) ev.push({ pos:i, piece:"hatFoot", vel:0.52 });
      if (cym !== "hat" && waltz) ev.push({ pos:2, piece:"hatFoot", vel:0.42 });       // waltz: the foot on 2 and 3

      if (straight){
        // straight eighths: kick on 1 and 3 (sometimes pushed onto the "and" of 2), cross-stick on 2 and 4
        var pushK = rng() < 0.3;
        for (i = 0; i < timeEnds; i++){
          if (waltz ? i === 0 : i % 2 === 0){ if (!(i === 0 && landing)) ev.push({ pos:(i === 2 && pushK) ? 1.5 : i, piece:"kick", vel:0.50 }); }
          else ev.push({ pos:i, piece:"rim", vel:0.55 });
        }
      } else {
        // feathered kick: felt more than heard. Follows the bass in a two-feel.
        for (i = landing ? 1 : 0; i < timeEnds; i++){
          if ((two && i % 2) || (waltz && i > 0)) continue;              // a waltz leans on beat 1 only
          ev.push({ pos:i, piece:"kick", vel: waltz ? 0.26 : 0.20 });
        }
      }

      if (fill){
        fill.hits.forEach(function (h){
          var e = { pos: timeEnds + h[0], piece: h[1], vel: h[2] };
          if (!onEighthGrid(h[0])) e.straight = true;
          ev.push(e);
        });
        afterFill = fill.size === "small" ? (rng() < 0.4 ? "crash" : "kick") : (rng() < 0.9 ? "crash" : "kick");
      } else if (straight){
        // the groove above is the whole part
      } else if (two){
        // two-feel: cross-stick on the last beat most bars, no snare chatter
        if (rng() < 0.75) ev.push({ pos:beats - 1, piece:"rim", vel:0.50 });
      } else {
        var quiet = 2 * (1 - busy(ctx));                               // the empty bar gets likelier when the band is playing down
        var ci = weighted(COMPS, function (c){ return c[1].length ? c[0] : c[0] * quiet; });
        if (ci === lastComp && COMPS[ci][1].length) ci = weighted(COMPS, function (c){ return c[0]; });   // one re-roll against repeats
        lastComp = ci;
        COMPS[ci][1].forEach(function (h){ if (h[0] < beats) ev.push({ pos:h[0], piece:h[1], vel:h[2] }); });
      }

      ev.sort(function (a, b){ return a.pos - b.pos; });
      return ev;
    }

    function ending(){
      afterFill = null;
      return [ { pos:0, piece:"crash", vel:0.80 }, { pos:0, piece:"kick", vel:0.70 } ];
    }

    function reset(){ afterFill = null; lastComp = -1; lastFill = null; }

    return { bar: bar, ending: ending, reset: reset };
  }

  global.BandDrums = { create: create };
})(typeof window !== "undefined" ? window : globalThis);
