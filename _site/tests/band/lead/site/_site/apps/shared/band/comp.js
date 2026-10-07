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
// Movement (ctx.opts.voiceMove): "hold" (or unset) keeps one voicing per chord, led to the next by
// least motion. "move" leads by the TOP NOTE instead: over a held chord each new hit may step to the
// next inversion, and a chord change continues that line by step, turning round at the edge of the
// register. "passing" adds, in the "bh" style, the passing diminished chord on a short hit between
// two hits of one chord (events carry passing:true). ctx.opts.maj6 plays major 7th chords as 6ths.
// Style "auto" picks a style for each four-bar phrase from the tempo, the rhythm and ctx.intensity.
//
// Stop time (ctx.stop): one short chord on beat 1 and nothing else. The bar before it
// (ctx.nextStop) does not push into it and lets nothing ring over the barline.
//
// Set patterns (GRID): rhythms that sit on the changes with no anticipations and repeat exactly:
// boom-chick, driving eighths, every off-beat, bossa, tango, montuno, cha-cha and two arpeggios (single
// notes of the voicing; those events carry arp:true). A two-bar pattern follows the form bar's parity.
// Several rhythms ("a+b+c" in ctx.opts.compRhythm): the one-bar figures among them are mixed bar by bar;
// "four", "stabs" and the set patterns are textures, and one of them (or the figures) is chosen for
// each four-bar phrase.
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
  // Set patterns. bars: one list of [beat, L | S] per bar of the pattern, or a function of the bar's
  // beat count. arp: "wave" walks up and down the voicing, "pair" alternates its lowest and highest note.
  function everyEighth(beats){ var h = []; for (var b = 0; b < beats; b += 0.5) h.push([b, "S"]); return h; }
  var GRID = {
    oompah:  { bars: function (beats){ var h = []; for (var b = 1; b < beats; b++) if (beats % 2 || b % 2) h.push([b, "S"]); return h; } },
    eighths: { bars: everyEighth, quiet: true },
    upbeats: { bars: function (beats){ var h = []; for (var b = 0.5; b < beats; b++) h.push([b, "S"]); return h; } },
    bossa:   { bars: [ [[0, "S"], [1.5, "L"], [3, "S"]], [[1, "S"], [2.5, "L"]] ] },
    tango:   { bars: [ [[0, "L"], [1.5, "S"], [2, "S"], [3, "S"]] ] },
    montuno: { bars: [ [[0, "S"], [1, "S"], [1.5, "S"], [2.5, "S"], [3.5, "S"]], [[0.5, "S"], [1.5, "S"], [2.5, "S"], [3.5, "S"]] ] },
    chacha:  { bars: [ [[1, "S"], [2, "S"], [2.5, "S"], [3, "L"]] ] },
    arp:     { bars: everyEighth, arp: "wave" },
    arp2:    { bars: everyEighth, arp: "pair" }
  };
  function isFig(id){ return !!FIG[id] && id !== "space"; }
  function isTexture(id){ return id === "four" || id === "stabs" || !!GRID[id]; }
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
    // rhythm: "four" | "stabs" | a GRID pattern | one of the FIG names (that figure every bar) | several of
    // those joined by "+" | anything else = varied phrases
    var seen = {}, list = String((opts && opts.compRhythm) || "").split("+").filter(function (x){
      if (seen[x] || !(isFig(x) || isTexture(x))) return false; seen[x] = 1; return true; });
    var figs = list.filter(isFig), tex = list.filter(isTexture), r = list.length === 1 ? list[0] : list.length ? list.join("+") : (opts && opts.compRhythm);
    var mv = opts && opts.voiceMove;
    return { inst: inst, style: style, four: r === "four", stabs: r === "stabs", grid: GRID[r] ? r : null, figs: figs, tex: tex, pins: (opts && opts.pins) || null, rhythm: r,
             move: mv === "move" || mv === "passing", passing: mv === "passing", maj6: !!(opts && opts.maj6) };
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
    function reset(){ st = { prevV: null, lastKey: null, antic: false, queue: [], recent: [], plan: null, started: false, pool: "", mode: null, modeSet: "",
                             top: null, dir: 1, wasPassing: false, auto: null, autoInst: null }; }
    reset();

    // The notes for a chord: its pin when there is one, else a voicing led from the last one. The
    // previous voicing is reused while the chord (or pin) is unchanged.
    // `mv` describes the hit: { attack: a new strike of the chord, p: chance it moves, passing: a passing chord may go here }.
    function pick(chord, su, key, mv){
      var H = global.BandHarmony, pin = pinOf(su, key);
      if (su.maj6 && H.asSixth) chord = H.asSixth(chord);
      var id = pin ? "pin|" + pin.join(",") : chord.key + "|" + su.style + "|" + su.inst;
      st.wasPassing = false;
      if (pin){ st.prevV = pin.slice(); st.lastKey = id; track(su); return st.prevV; }
      var same = id === st.lastKey && st.prevV && st.prevV.length;
      if (!su.move || !H.toward){                                           // one voicing per chord, least motion
        if (!same){ st.prevV = H.voicing(chord, oneOf(su), st.prevV, su.inst); st.lastKey = id; track(su); }
        return st.prevV;
      }
      if (!st.prevV || !st.prevV.length || st.top == null){ st.prevV = H.voicing(chord, su.style, null, su.inst); st.lastKey = id; track(su); return st.prevV; }
      if (same){
        if (!mv || !mv.attack) return st.prevV;
        if (mv.passing && su.passing){                                      // the diminished chord between two inversions
          var pv = H.toward(chord, su.style, st.prevV, su.inst, { passing: true, top: st.top + st.dir * 1.5 });
          if (pv.length){ st.prevV = pv; st.lastKey = id + "|passing"; st.wasPassing = true; track(su); return st.prevV; }
        }
        if (rng() < (mv.p == null ? 0.6 : mv.p)){ st.prevV = H.toward(chord, su.style, st.prevV, su.inst, { top: st.top + st.dir * 3, differ: true }); track(su); }
        return st.prevV;
      }
      // a new chord (or the chord after its passing chord): the top line goes on by step
      st.prevV = H.toward(chord, su.style, st.prevV, su.inst, { top: st.top + st.dir * (/\|passing$/.test(st.lastKey || "") ? 1.5 : 1) });
      st.lastKey = id; track(su);
      return st.prevV;
    }
    // guitar events carry the fingering the voicing was chosen on: [{ string, fret, midi }]
    function grip(e){ var H = global.BandHarmony, g = e.inst === "guitar" && H.gripOf ? H.gripOf(e.midis) : null; if (g) e.strings = g; return e; }
    // follow the top note; turn the line round at the edge of the comping register, and now and then on a whim
    function track(su){
      if (!st.prevV || !st.prevV.length) return;
      var lo = su.inst === "guitar" ? 57 : 60, hi = su.inst === "guitar" ? 74 : 77;
      st.top = st.prevV[st.prevV.length - 1];
      if (st.top >= hi - 1) st.dir = -1; else if (st.top <= lo + 1) st.dir = 1; else if (su.move && rng() < 0.12) st.dir = -st.dir;
    }
    // "auto": a style for the moment, settled at the top of each four-bar phrase
    // Several styles ticked ("a+b"). Moving voicings draw on every shape of all of them. With "hold" the
    // shapes never change on a held chord, so each new chord takes one of the styles in turn instead,
    // which is how all of them get heard.
    function oneOf(su){
      var parts = String(su.style).split("+");
      if (parts.length < 2 || su.move) return su.style;
      return parts[Math.floor(rng() * parts.length)];
    }
    function autoStyle(ctx, su){
      var H = global.BandHarmony, I = ctx.intensity == null ? 0.5 : ctx.intensity, tempo = ctx.tempo || 120, g = su.inst === "guitar";
      if (st.auto && st.autoInst === su.inst && ctx.phrase && ctx.phrase.bar !== 0) return st.auto;
      var pickS = g ? (su.four ? "shell3" : (I < 0.36 || tempo > 230) ? "guide2" : I > 0.72 ? "drop2" : I > 0.56 ? "uppervl" : "shell3")
                    : ((I < 0.36) ? "guide" : tempo > 230 ? "shell" : su.rhythm === "pad" ? "drop3" : I > 0.72 ? (su.passing ? "bh" : "drop2") : "rootless");
      if (!H.hasStyle(su.inst, pickS)) pickS = H.defaultStyle(su.inst);
      st.auto = pickS; st.autoInst = su.inst;
      return pickS;
    }

    // keep at least this bar's and the next bar's figure queued
    function fill(tempo, busy, figs){
      while (st.queue.length < 2){
        if (figs && figs.length){                                                   // the chosen figure(s): one for each bar
          var last = st.queue.length ? st.queue[st.queue.length - 1] : st.lastFig;
          var opts = figs.filter(function (f){ return st.started || (FIG[f][0] && FIG[f][0][0] === 0); });   // state the first chord on beat 1 when one of them can
          if (!opts.length) opts = figs;
          if (opts.length > 1 && rng() < 0.6) opts = opts.filter(function (f){ return f !== last; });        // mostly a different one from the last bar
          var f = opts[Math.floor(rng() * opts.length)];
          st.queue.push(f); st.lastFig = f; st.started = true; continue;
        }
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
      var su = setup(ctx.opts), inst = su.inst;
      if (su.style === "auto") su.style = autoStyle(ctx, su);
      var tempo = ctx.tempo || 120;
      if (ctx.stop){
        st.antic = false; st.plan = null; st.queue = [];
        var c0 = H.chordAt(chords, 0), k0 = keyAt(ctx.index, chords, 0);
        if (!c0) return [];
        pick(c0, su, k0); st.started = true;
        return st.prevV.length ? [{ pos: 0, dur: Math.max(0.3, 0.13 * tempo / 60), midis: st.prevV.slice(), vel: 0.68, inst: inst, of: k0 }] : [];
      }
      // several rhythms: the figures (as a group) or one of the textures, settled for each four-bar phrase
      var figs = su.figs, phraseEnds = false;
      if (su.tex.length && su.figs.length + su.tex.length > 1){
        if (st.modeSet !== su.rhythm || !st.mode || ctx.index % 4 === 0){
          var ch = su.tex.slice(); if (su.figs.length) ch.push("figs");
          if (ch.length > 1 && st.modeSet === su.rhythm && rng() < 0.7) ch = ch.filter(function (m){ return m !== st.mode; });   // mostly move on
          st.mode = ch[Math.floor(rng() * ch.length)]; st.modeSet = su.rhythm;
        }
        su.four = st.mode === "four"; su.stabs = st.mode === "stabs"; su.grid = GRID[st.mode] ? st.mode : null;
        phraseEnds = ctx.length > 0 ? ((ctx.index + 1) % ctx.length) % 4 === 0 : ctx.index % 4 === 3;       // the next bar may be another texture
      }
      if (su.four) return fourToBar(ctx, su);
      if (su.grid) return gridBar(ctx, su);
      if (su.stabs || (!figs.length && !ctx.compound && ctx.opts && ctx.opts.feel === "straight")) return straightBar(ctx, su);
      if (st.pool !== figs.join("+")){ st.pool = figs.join("+"); st.queue = []; st.plan = null; }   // rhythm choice changed: replan
      fill(tempo, ctx.intensity, figs);
      var figName = st.queue.shift();
      if (!chords || !chords.length){ st.antic = false; st.plan = null; return []; }       // N.C.

      var plan = st.plan; st.plan = null;
      var hits = (plan && plan.bar === ctx.bar && plan.sig === sigOf(chords)) ? plan.hits : realise(figName, chords, beats, st.antic);
      hits = hits.filter(function (h){ return h.pos < beats - 1e-6; });                       // the plan assumed a bar as long as the last one
      var close = ctx.last || ctx.nextStop || phraseEnds;                                     // the next bar is the ending, a stop or maybe another texture: no push into it
      if (close) hits = hits.filter(function (h){ return h.pos < beats - 0.5 - 1e-6; });      // leave that hit to the next bar

      var nextC = firstChord(nextChords);
      var lastHit = hits[hits.length - 1];
      var endsAntic = !!(lastHit && nextC && Math.abs(lastHit.pos - (beats - 0.5)) < 1e-6);
      fill(tempo, ctx.intensity, figs);
      var nextHits = close ? [] : realise(st.queue[0], nextChords, beats, endsAntic);
      var nextFirst = close ? 0 : (nextHits.length ? nextHits[0].pos : Infinity);

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
        if (close) changeAt = Math.min(changeAt, beats);
        var room = Math.min(nextPos, changeAt) - h.pos;
        var dur = h.len === "S" ? Math.min(sLen, room - 0.05) : Math.min(2.5, room - 0.12);
        dur = Math.max(0.1, Math.min(Math.max(dur, 0.15), nextPos - h.pos - 0.02));

        // a short hit with another hit of the same chord after it may be a passing chord
        // (the next hit may be the next bar's first, when that bar starts on the same chord)
        var nh = hits[i + 1], nch = null;
        if (su.passing && h.len === "S" && !across && from === h.pos)
          nch = nh ? H.chordAt(chords, nh.pos) : (!close && nextHits.length && nextHits[0].pos < 1) ? nextC : null;
        pick(chord, su, ck, { attack: true, p: 0.75, passing: !!(nch && nch.key === chord.key && rng() < 0.7) });
        if (!st.prevV.length) return;
        var v = 0.57 + (rng() - 0.5) * 0.08 + (off ? 0.06 : h.len === "L" ? -0.03 : 0);      // pushes a little louder than pads
        var e = { pos: h.pos, dur: Math.round(dur * 1000) / 1000, midis: st.prevV.slice(),
                  vel: Math.round(clamp(v, 0.45, 0.7) * 1000) / 1000, inst: inst, of: ck };
        if (st.wasPassing) e.passing = true;
        ev.push(grip(e));
      });
      st.antic = endsAntic;
      st.plan = ctx.nextStop ? null : { bar: ctx.bar + 1, sig: sigOf(nextChords), hits: nextHits };
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
        var ck = keyAt(ctx.index, ctx.chords, b), nx = b + 1 < ctx.beats ? H.chordAt(ctx.chords, b + 1) : null;
        // moving voicings: mostly stay put, sometimes shift on beat 3; a passing chord may sit on 2 or 4
        pick(chord, su, ck, { attack: b > 0, p: b === 2 ? 0.4 : 0.08, passing: !!(su.passing && b % 2 === 1 && nx && nx.key === chord.key && rng() < 0.35) });
        if (!st.prevV.length) continue;
        var v = (b % 2 ? 0.62 : 0.52) + (rng() - 0.5) * 0.05;
        var e4 = { pos: b, dur: Math.min(dur, 0.9), midis: st.prevV.slice(), vel: Math.round(clamp(v, 0.45, 0.7) * 1000) / 1000, inst: su.inst, of: ck };
        if (st.wasPassing) e4.passing = true;
        ev.push(grip(e4));
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
          if (off > 0){ pick(chord, su, ck, { attack: true, p: 0.5 }); if (!st.prevV.length) return; }
          ev.push(grip({ pos: seg.start + off, dur: Math.round(Math.min(dur, seg.len - off - 0.05) * 1000) / 1000, midis: st.prevV.slice(),
                    vel: Math.round(clamp(v + (rng() - 0.5) * 0.06, 0.45, 0.72) * 1000) / 1000, inst: su.inst, of: ck }));
        }
        hit(0, stab, 0.60);
        if (seg.len >= 2) hit(1.5, seg.len >= 4 ? 1.1 : stab, 0.66);
        if (seg.len >= 4){ var r = rng(); if (r < 0.35) hit(3, stab, 0.56); else if (r < 0.6) hit(3.5, stab, 0.58); }
      });
      st.started = true;
      return ev;
    }

    // A set pattern (GRID): its hits exactly, each on the chord sounding there; every chord in the bar is heard.
    function gridBar(ctx, su){
      var H = global.BandHarmony, ev = [], tempo = ctx.tempo || 120, beats = ctx.beats, g = GRID[su.grid];
      st.antic = false; st.plan = null; st.queue = [];
      var pat = typeof g.bars === "function" ? g.bars(beats) : g.bars[ctx.index % g.bars.length];
      var hits = pat.filter(function (h){ return h[0] < beats - 1e-6; }).map(function (h){ return { pos: h[0], len: h[1] }; });
      (ctx.chords || []).forEach(function (c, k){
        if (!c.chord || c.chord.nc) return;
        var e = k + 1 < ctx.chords.length ? ctx.chords[k + 1].pos : beats;
        if (!hits.some(function (h){ return h.pos >= c.pos - 1e-6 && h.pos < e - 1e-6; })) hits.push({ pos: c.pos, len: "S" });
      });
      hits.sort(function (a, b){ return a.pos - b.pos; });
      var sLen = Math.max(0.3, 0.12 * tempo / 60), n = 0;
      hits.forEach(function (h, i){
        var chord = H.chordAt(ctx.chords, h.pos); if (!chord) return;
        var ck = keyAt(ctx.index, ctx.chords, h.pos), slot = Math.round(h.pos * 2);
        pick(chord, su, ck, (n++ && !g.arp) ? { attack: true, p: 0.15 } : null);
        var v = st.prevV; if (!v.length) return;
        var nextPos = i + 1 < hits.length ? hits[i + 1].pos : beats, changeAt = beats;
        for (var k = 0; k < ctx.chords.length; k++){ if (ctx.chords[k].pos > h.pos + 1e-6){ changeAt = ctx.chords[k].pos; break; } }
        var on = h.pos === Math.floor(h.pos), e;
        if (g.arp){                                                     // one note of the voicing, left to ring to the chord change
          var m = v.length, per = Math.max(1, 2 * m - 2), w = slot % per, idx = g.arp === "pair" ? (slot % 2 ? m - 1 : 0) : (w < m ? w : per - w);
          e = { pos: h.pos, dur: Math.round(Math.max(0.3, Math.min(1.5, changeAt - h.pos - 0.05)) * 1000) / 1000, midis: [v[idx]],
                vel: Math.round(clamp((on ? 0.58 : 0.52) + (rng() - 0.5) * 0.05, 0.42, 0.68) * 1000) / 1000, inst: su.inst, of: ck, arp: true };
          ev.push(e); return;
        }
        var room = Math.min(nextPos, changeAt) - h.pos, dur = h.len === "S" ? Math.min(sLen, room - 0.05) : Math.min(2.5, room - 0.1);
        var vel = (g.quiet ? (on ? 0.56 : 0.48) : h.len === "L" ? 0.60 : 0.58) + (rng() - 0.5) * 0.06;
        e = { pos: h.pos, dur: Math.round(Math.max(0.12, dur) * 1000) / 1000, midis: v.slice(), vel: Math.round(clamp(vel, 0.42, 0.7) * 1000) / 1000, inst: su.inst, of: ck };
        ev.push(grip(e));
      });
      st.started = true;
      return ev;
    }

    function ending(ctx){
      var H = global.BandHarmony, c = firstChord(ctx && ctx.chords);
      if (!c) return [];
      var su = setup(ctx.opts), ck = ctx.index + ":0";
      if (su.style === "auto") su.style = H.hasStyle(su.inst, "drop2") ? "drop2" : H.defaultStyle(su.inst);   // a full chord to finish on
      st.lastKey = null; var v = pick(c, su, ck);                       // (always re-voiced for the last hit)
      st.antic = false; st.plan = null;
      return v.length ? [{ pos: 0, dur: 4, midis: v.slice(), vel: 0.62, inst: su.inst, of: ck }] : [];
    }
    return { bar: bar, ending: ending, reset: reset };
  }

  global.BandComp = { create: create, FIGURES: FIG, PHRASES: PHRASES, GRID: GRID };
})(typeof window !== "undefined" ? window : globalThis);
