// comp.js — piano / guitar comping for the jazz band engine (needs harmony.js).
// ctx.opts.comp picks the instrument ("piano" | "guitar"), ctx.opts.voicing the style
// (see BandHarmony.styleList: piano rootless | guide | shell | standard | drop2 | drop3; guitar
// shell3 | drop2 | drop3 | triad3) and ctx.opts.compRhythm the rhythm ("syncopated" | "four" =
// four-to-the-bar). Voicings come from BandHarmony.voicing, voice-led from one chord to the next;
// the rhythm is drawn from a small vocabulary of swing comping figures, strung together as two-bar phrases.
//
// Pinned voicings: ctx.opts.pins maps "<form bar index>:<beat>" (where a chord starts) to the exact
// MIDI notes to play for that chord, in every rhythm and including a push into the next bar's first
// chord ("<next index>:0"). Pinned notes still become the voicing the next unpinned chord is led from.
// Each event also says which chord it sounds: `of` is that chord's "<index>:<beat>" key.
//
//   var comp = BandComp.create({ rng });   // rng() -> [0,1); all randomness goes through it
//   comp.bar(ctx)    -> [{ pos, dur, midis:[low..high], vel, inst:"piano"|"guitar" }]
//   comp.ending(ctx) -> the final held chord
//   comp.reset()
//
// Meters: the figures are written for four beats and fitted to shorter bars (a push on the last
// off-beat stays a push; hits past the end are dropped). In the compound meters (ctx.compound) a
// beat is a dotted quarter and x.5 is its third eighth, so the same figures become 12/8 comping.
//
// Anticipation: a hit on the off-beat just before a chord change plays the UPCOMING chord
// and is held across the change; after a push on the "and of 4" the next bar does not
// re-attack beat 1. To time those holds, each bar's rhythm is settled one bar ahead.

(function (global) {
  // one-bar figures: [beat position, L(ong) | S(hort)]; x.5 = the swung off-beat
  var FIG = {
    charleston: [[0, "L"], [1.5, "S"]],
    reverse:    [[0.5, "S"], [2, "L"]],
    garland:    [[1.5, "S"], [3.5, "L"]],
    offbeats:   [[0.5, "S"], [2.5, "L"]],
    pad:        [[0, "L"]],
    and2:       [[1.5, "L"]],
    push:       [[3.5, "L"]],
    oneAnd3:    [[0, "S"], [2.5, "L"]],
    space:      []
  };
  // two-bar phrases, plainer ones weighted more heavily
  var PHRASES = [
    { id: "ch-ch",     bars: ["charleston", "charleston"], w: 3.0 },
    { id: "ch-and2",   bars: ["charleston", "and2"],       w: 3.0 },
    { id: "ch-gar",    bars: ["charleston", "garland"],    w: 2.5 },
    { id: "rev-ch",    bars: ["reverse", "charleston"],    w: 2.0 },
    { id: "and2-ch",   bars: ["and2", "charleston"],       w: 2.0 },
    { id: "gar-gar",   bars: ["garland", "garland"],       w: 2.0 },
    { id: "off-push",  bars: ["offbeats", "push"],         w: 1.5 },
    { id: "pad-off",   bars: ["pad", "offbeats"],          w: 1.5 },
    { id: "one-gar",   bars: ["oneAnd3", "garland"],       w: 1.5 },
    { id: "rev-and2",  bars: ["reverse", "and2"],          w: 1.5 },
    { id: "ch-rest",   bars: ["charleston", "space"],      w: 1.6 },
    { id: "pad-rest",  bars: ["pad", "space"],             w: 1.3 },
    { id: "push-rest", bars: ["push", "space"],            w: 1.2 },
    { id: "and2-push", bars: ["and2", "push"],             w: 1.2 }
  ];
  PHRASES.forEach(function (p){ p.hits = FIG[p.bars[0]].length + FIG[p.bars[1]].length; });

  function firstChord(chords){
    var c = chords && chords.length && chords[0].pos === 0 ? chords[0].chord : null;
    return (c && !c.nc) ? c : null;
  }
  function sigOf(chords){ return (chords || []).map(function (c){ return c.pos + "=" + c.chord.key; }).join(","); }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
  // instrument + voicing style from the page options (unknown style -> that instrument's default)
  function setup(opts){
    var H = global.BandHarmony, inst = (opts && opts.comp === "guitar") ? "guitar" : "piano";
    var style = (opts && H.hasStyle(inst, opts.voicing)) ? opts.voicing : H.defaultStyle(inst);
    // rhythm: "four" | "stabs" | one of the FIG names (that figure every bar) | anything else = varied phrases
    var r = opts && opts.compRhythm, fig = (r && FIG[r] && r !== "space") ? r : null;
    return { inst: inst, style: style, four: r === "four", stabs: r === "stabs", fig: fig, pins: (opts && opts.pins) || null };
  }
  // the beat where the chord sounding at `pos` started (the chord list is in beat order)
  function startAt(chords, pos){
    var s = null;
    for (var i = 0; i < (chords || []).length; i++){ if (chords[i].pos <= pos + 1e-6) s = chords[i].pos; else break; }
    return s;
  }
  // key of the chord sounding at `pos` of bar `index`; the pinned notes for it, or null
  function keyAt(index, chords, pos){ var s = startAt(chords, pos); return s == null ? null : index + ":" + s; }
  function pinOf(su, key){ var m = su.pins && key && su.pins[key]; return (m && m.length) ? m : null; }

  function create(o){
    var rng = (o && o.rng) || Math.random;
    var st;
    function reset(){ st = { prevV: null, lastKey: null, antic: false, queue: [], recent: [], plan: null, started: false, fixed: null }; }
    reset();

    // The notes for a chord: its pin when there is one, else a voicing led from the last one. The
    // previous voicing is reused while the chord (or pin) is unchanged.
    function pick(chord, su, key){
      var pin = pinOf(su, key), id = pin ? "pin|" + pin.join(",") : chord.key + "|" + su.style + "|" + su.inst;
      if (id !== st.lastKey || !st.prevV){ st.prevV = pin ? pin.slice() : global.BandHarmony.voicing(chord, su.style, st.prevV, su.inst); st.lastKey = id; }
      return st.prevV;
    }

    // keep at least this bar's and the next bar's figure queued
    function fill(tempo, busy){
      while (st.queue.length < 2){
        if (st.fixed){ st.queue.push(st.fixed); st.started = true; continue; }      // the chosen figure, every bar
        var fast = tempo > 200, sum = 0;
        var ws = PHRASES.map(function (p){
          var w = p.w;
          if (fast) w *= p.hits <= 2 ? 2.2 : 0.7;                       // leave more space up-tempo
          if (busy != null) w *= p.hits <= 2 ? Math.max(0.25, 2 - 2 * busy) : Math.max(0.25, 2 * busy);   // sparser when the band plays down, fuller as it builds
          if (st.recent.indexOf(p.id) >= 0) w *= 0.2;                   // don't keep repeating a phrase
          if (!st.started && !(FIG[p.bars[0]][0] && FIG[p.bars[0]][0][0] === 0)) w = 0;   // state the first chord on beat 1
          sum += w; return w;
        });
        var r = rng() * sum, k = 0;
        for (; k < ws.length - 1; k++){ r -= ws[k]; if (r <= 0) break; }
        st.queue.push(PHRASES[k].bars[0], PHRASES[k].bars[1]);
        st.recent.push(PHRASES[k].id); if (st.recent.length > 2) st.recent.shift();
        st.started = true;
      }
    }
    // a figure's hits for a particular bar: [{ pos, len }]
    function realise(figName, chords, beats, prevAntic){
      if (!chords || !chords.length) return [];
      var hits = [];
      FIG[figName].forEach(function (h){
        var pos = h[0];
        if (pos >= beats){ if (pos !== 3.5) return; pos = beats - 0.5; }                    // the push into the next bar moves with the barline
        if (!hits.some(function (x){ return x.pos === pos; })) hits.push({ pos: pos, len: h[1] });
      });
      if (prevAntic) hits = hits.filter(function (h){ return h.pos >= 0.5; });   // that chord is already ringing
      var sounding = chords.filter(function (c){ return c.chord && !c.chord.nc; });
      if (sounding.length > 1){
        // two (or more) chords in the bar: each must be heard, on its beat or pushed just before it
        chords.forEach(function (c, k){
          if (!c.chord || c.chord.nc) return;
          var p = c.pos, e = k + 1 < chords.length ? chords[k + 1].pos : beats;
          if (p === 0 && prevAntic) return;
          var heard = hits.some(function (h){ return h.pos >= p - 0.5 - 1e-6 && h.pos < e - 0.5 - 1e-6; });
          if (!heard) hits.push({ pos: (p === 0 || rng() < 0.5) ? p : p - 0.5, len: "L" });
        });
      }
      hits.sort(function (a, b){ return a.pos - b.pos; });
      return hits;
    }

    function bar(ctx){
      var H = global.BandHarmony, beats = ctx.beats, chords = ctx.chords, nextChords = ctx.nextChords || [];
      var su = setup(ctx.opts), style = su.style, inst = su.inst;
      var tempo = ctx.tempo || 120;
      if (su.four) return fourToBar(ctx, su);
      if (su.stabs || (!su.fig && !ctx.compound && ctx.opts && ctx.opts.feel === "straight")) return straightBar(ctx, su);
      if (st.fixed !== su.fig){ st.fixed = su.fig; st.queue = []; st.plan = null; }   // rhythm choice changed: replan
      fill(tempo, ctx.intensity);
      var figName = st.queue.shift();
      if (!chords || !chords.length){ st.antic = false; st.plan = null; return []; }       // N.C.

      var plan = st.plan; st.plan = null;
      var hits = (plan && plan.bar === ctx.bar && plan.sig === sigOf(chords)) ? plan.hits : realise(figName, chords, beats, st.antic);
      hits = hits.filter(function (h){ return h.pos < beats - 1e-6; });                       // the plan assumed a bar as long as the last one
      if (ctx.last) hits = hits.filter(function (h){ return h.pos < beats - 0.5 - 1e-6; });   // leave the final hit to the ending

      var nextC = firstChord(nextChords);
      var lastHit = hits[hits.length - 1];
      var endsAntic = !!(lastHit && nextC && Math.abs(lastHit.pos - (beats - 0.5)) < 1e-6);
      fill(tempo, ctx.intensity);
      var nextHits = ctx.last ? [] : realise(st.queue[0], nextChords, beats, endsAntic);
      var nextFirst = ctx.last ? 0 : (nextHits.length ? nextHits[0].pos : Infinity);

      var sLen = Math.max(0.3 + rng() * 0.1, 0.13 * tempo / 60);       // a stab never gets shorter than ~130 ms
      var ev = [];
      hits.forEach(function (h, i){
        var off = Math.abs(h.pos - Math.floor(h.pos) - 0.5) < 1e-6, up = h.pos + 0.5;
        var chord = H.chordAt(chords, h.pos), from = h.pos, across = false, ck = keyAt(ctx.index, chords, h.pos);
        if (off && up >= beats - 1e-6){ if (nextC){ chord = nextC; across = true; ck = (ctx.length > 0 ? (ctx.index + 1) % ctx.length : ctx.index + 1) + ":0"; } }
        else if (off){ var cu = H.chordAt(chords, up); if (cu && (!chord || cu.key !== chord.key)){ chord = cu; from = up; ck = keyAt(ctx.index, chords, up); } }
        if (!chord) return;
        // the hold ends before the next hit and before the harmony moves on
        var nextPos = i + 1 < hits.length ? hits[i + 1].pos : beats + nextFirst, changeAt;
        if (across) changeAt = beats + (nextChords.length > 1 ? nextChords[1].pos : beats);
        else {
          changeAt = beats;
          for (var k = 0; k < chords.length; k++){ if (chords[k].pos > from + 1e-6){ changeAt = chords[k].pos; break; } }
          if (changeAt === beats && nextC && nextC.key === chord.key) changeAt = beats + (nextChords.length > 1 ? nextChords[1].pos : beats);
        }
        if (ctx.last) changeAt = Math.min(changeAt, beats);
        var room = Math.min(nextPos, changeAt) - h.pos;
        var dur = h.len === "S" ? Math.min(sLen, room - 0.05) : Math.min(2.5, room - 0.12);
        dur = Math.max(0.1, Math.min(Math.max(dur, 0.15), nextPos - h.pos - 0.02));

        pick(chord, su, ck);
        if (!st.prevV.length) return;
        var v = 0.57 + (rng() - 0.5) * 0.08 + (off ? 0.06 : h.len === "L" ? -0.03 : 0);      // pushes a little louder than pads
        ev.push({ pos: h.pos, dur: Math.round(dur * 1000) / 1000, midis: st.prevV.slice(),
                  vel: Math.round(clamp(v, 0.45, 0.7) * 1000) / 1000, inst: inst, of: ck });
      });
      st.antic = endsAntic;
      st.plan = { bar: ctx.bar + 1, sig: sigOf(nextChords), hits: nextHits };
      return ev;
    }

    // Freddie Green four-to-the-bar: one short chord on every beat, 2 and 4 leaning forward,
    // no anticipations. The voicing is only re-chosen when the chord changes.
    function fourToBar(ctx, su){
      var H = global.BandHarmony, ev = [], tempo = ctx.tempo || 120;
      var dur = Math.round(Math.max(0.5, 0.11 * tempo / 60) * 1000) / 1000;       // never under ~110 ms
      st.antic = false; st.plan = null; st.queue = [];
      for (var b = 0; b < ctx.beats; b++){
        var chord = H.chordAt(ctx.chords, b); if (!chord) continue;
        var ck = keyAt(ctx.index, ctx.chords, b);
        pick(chord, su, ck);
        if (!st.prevV.length) continue;
        var v = (b % 2 ? 0.62 : 0.52) + (rng() - 0.5) * 0.05;
        ev.push({ pos: b, dur: Math.min(dur, 0.9), midis: st.prevV.slice(), vel: Math.round(clamp(v, 0.45, 0.7) * 1000) / 1000, inst: su.inst, of: ck });
      }
      st.started = true;
      return ev;
    }

    // Straight-eighths (boogaloo / rock) comping, locked to the bass riff: a stab on 1, the
    // chord pushed on the "and" of 2, and now and then an answering stab late in the bar.
    // No anticipations across the barline: this feel sits on the changes.
    function straightBar(ctx, su){
      var H = global.BandHarmony, ev = [], tempo = ctx.tempo || 120;
      var stab = Math.max(0.35, 0.12 * tempo / 60);
      st.antic = false; st.plan = null; st.queue = [];
      var segs = [], b;
      for (b = 0; b < ctx.beats; b++){
        var c = H.chordAt(ctx.chords, b), last = segs[segs.length - 1];
        if (last && c && last.chord && c.key === last.chord.key) last.len++; else segs.push({ start: b, len: 1, chord: c });
      }
      segs.forEach(function (seg){
        var chord = seg.chord; if (!chord) return;
        var ck = keyAt(ctx.index, ctx.chords, seg.start);
        pick(chord, su, ck);
        if (!st.prevV.length) return;
        function hit(off, dur, v){
          if (off >= seg.len) return;
          ev.push({ pos: seg.start + off, dur: Math.round(Math.min(dur, seg.len - off - 0.05) * 1000) / 1000, midis: st.prevV.slice(),
                    vel: Math.round(clamp(v + (rng() - 0.5) * 0.06, 0.45, 0.72) * 1000) / 1000, inst: su.inst, of: ck });
        }
        hit(0, stab, 0.60);
        if (seg.len >= 2) hit(1.5, seg.len >= 4 ? 1.1 : stab, 0.66);
        if (seg.len >= 4){ var r = rng(); if (r < 0.35) hit(3, stab, 0.56); else if (r < 0.6) hit(3.5, stab, 0.58); }
      });
      st.started = true;
      return ev;
    }

    function ending(ctx){
      var H = global.BandHarmony, c = firstChord(ctx && ctx.chords);
      if (!c) return [];
      var su = setup(ctx.opts), ck = ctx.index + ":0";
      st.lastKey = null; var v = pick(c, su, ck);                       // (always re-voiced for the last hit)
      st.antic = false; st.plan = null;
      return v.length ? [{ pos: 0, dur: 4, midis: v.slice(), vel: 0.62, inst: su.inst, of: ck }] : [];
    }
    return { bar: bar, ending: ending, reset: reset };
  }

  global.BandComp = { create: create, FIGURES: FIG, PHRASES: PHRASES };
})(typeof window !== "undefined" ? window : globalThis);
