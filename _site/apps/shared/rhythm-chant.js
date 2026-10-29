// rhythm-chant.js — plays a rhythm pattern "conversationally", the way a teacher chants it in Music Learning Theory
// learning sequence activities: one unpitched voice, inflected, with each note's loudness and tail decided by where it
// falls in the meter and what follows it. One global (RhythmChant); loads in Node for tests (plan() needs abc-core.js and
// abc-events.js; nothing touches Web Audio until play()).
//
//   RhythmChant.plan(abc, { qpm | macroBpm | secPerQuarter, triple, macroQuarters, rules })
//        -> { notes: [...], total, macroQ, microQ, triple, meter, secPerQuarter }          (pure; the Node test checks this)
//        note: { t, dur (seconds), tQ, durQ (quarters), role, next, held, shape: "decay"|"sustain"|"swell", rule,
//                peak (0..1), attack, decay, hold, startLevel, endLevel, release, cents0, cents1, bright0, bright1 }
//   RhythmChant.play(abc, { qpm, ctx, when, onEnd, triple, ... }) -> { stop, plan, endsAt }
//        Own AudioContext (registered with AudioTap) unless opts.ctx is given: a page that already schedules a metronome on its
//        own context passes it plus opts.when (that context's clock) so the model stays on the metronome's grid.
//   RhythmChant.schedule(ctx, plan, when, opts) -> { stop, endsAt }
//   RhythmChant.scope(name, defaultOn); RhythmChant.enabled(); RhythmChant.setEnabled(bool)   the "Conversational" setting (localStorage "rc-conv:<scope>")
//   RhythmChant.mountBar(parent, { getAbc, hide:[els] })   checkbox + Chant/Stop + tempo, for pages on abcjs's own player
//   RhythmChant.checkbox(parent, { label, onchange }) -> <label> with the checkbox; every checkbox on the page follows the setting
//   RhythmChant.RULES                the thresholds and levels (tune by ear; plan(abc, { rules: {...} }) overrides some)
//
// VOICE HIDDEN (2026-10-28): the "bah" voice is in the uncanny valley, so every way of hearing it is switched off. The code is all still here.
//   THE SWITCH: `window.VOICE_HIDDEN = true;` in _includes/head.html (one line, on every page; unset also means hidden). RhythmChant.HIDDEN,
//   SolfegeSing.HIDDEN, abc-ex.js's "▶ Sing" and pattern-play.js's "Voice (solfège)" all read it. Set it to false to bring the voice back. While hidden: enabled() / syllablesOn() are
//   false, checkbox / syllablesBox / mountBar's chant controls are not drawn (mountBar keeps only "Show syllables"), and play() strikes the
//   same plan on the woodblock (no voice, no spoken syllables) so features that call it (Sax Home echoes, MLT rhythm echoes) still sound.
//   The Node tests call plan() / render() directly and are unaffected.
//
// THE RULES. Source = a book; JUDGEMENT = Sean's / the builder's musical decision, not in the books. Cited in works-cited.py (Gordon 2012, Mullen).
//  Which notes: position in the macrobeat (crusis = on a macrobeat; weak = anywhere else), length in microbeats, what comes next.
//  R0  Inflect, don't pitch. Patterns are chanted on no particular pitch, with inflection and expression "as if used in conversation";
//      all durations in a rhythm pattern without pitch.  [Gordon 2012 p.100; Gordon, Reference Handbook for LSAs, "Techniques for
//      Teaching Class Patterns" and "A Quick Course on Rhythm"; Mullen, Any Music Teacher Can Do MLT p.84]
//  P   The first and the penultimate macrobeat carry the greatest emphasis (loudest, lowest); other macrobeats are still above weak notes. (the user)
//  G   A short note after a longer one is preceded by a short silence (n.cut) so it speaks. (the user)
//  A   A pattern that opens on a weak note: its first macrobeat is louder and lower still, the pickup lighter. (the user)
//  E   The last note lifts a little in pitch. opts.emphasis 0..3 scales the macrobeats' loudness and pitch drop (the page's slider). (the user)
//  V   "Bah" is near ɑ on macrobeats and near ə elsewhere; decaying macrobeats ring longer (opts.vowelMacro, vowelWeak, lengthRatio). (the user)
//  L   The last note rings on longer (opts.endLength). Sliders also set pitchVar, arcHeight, arcPeak, arcEnd (see the contour). (the user)
//  D   Dynamics: runs between rests crescendo into a sounded macrobeat or die away into a rest; a phrase shape over the top (see DYNAMICS). (the user)
//  S   Du rounder (F2 610), De glides as "day", Ta quieter, t shorter. (the user)
//  Q   A question: the last note slides up (opts.question = its chance). Playback is normalised to one loudness. (the user)
//  W   opts.sound "woodblock": the same plan struck on a woodblock (renderBlock). (the user)
//  R1  (OVERRIDDEN by the user, 2026-10-25: macrobeats are now clearly louder, lower in pitch and brighter than everything else, so the meter
//      is heard; weak notes and anacruses sit well below them.) Originally: macrobeats are stressed, not accented: a note on a macrobeat gets a light, level onset (no first-beat bump).  [Gordon 2012 p.188
//      "first macrobeat ... not routinely accented"; p.189 "stressed, not accented"]. The number (peak.crusis) is JUDGEMENT.
//  R2  Macrobeats are approached with a decrescendo, and expression lives between macrobeats: a note that ARRIVES on a macrobeat after a
//      driven note (swell) lands lighter still.  [Gordon p.188-189]; how much lighter is JUDGEMENT.
//  R3  Anacruses get special attention: weak-position onsets that lead to a macrobeat lean forward: each in the run is louder than the last
//      (a crescendo ACROSS the run) and the last (the anacrusis) is the loudest note of its beat; its pitch rises a little.  [Gordon p.188
//      "durations between macrobeats, particularly shorter ones that serve as anacruses, are given special attention"; p.189 weight shifted
//      in preparation for a crusis.] The shape of the lean is JUDGEMENT.
//  R4  Short notes (one microbeat or less) decay quickly, the "cool" default; the decay is a fixed small time, not a share of the note,
//      so a fast pattern is crisp and a slow one is not mush.  JUDGEMENT (Sean's description of how he chants).
//  R5  A note longer than a microbeat is an elongation (Gordon's term: a duration longer than a microbeat). Its tail depends on what follows:
//      R5a followed by an onset on a WEAK position (a syncopation, a dotted figure into an anacrusis): SWELL. Decaying would sound like a
//          rest and leave the next onset unprepared; the crescendo is the weight shifted toward the next onset.  Gordon p.188-190 ("displaced
//          energy": rests and long durations lose the flow unless weight keeps shifting); the swell itself is JUDGEMENT.
//      R5b longer than one macrobeat and followed by a macrobeat onset (a half note in 2/4, a note tied across the beat, a dotted quarter
//          that starts off the beat and lands on the next macrobeat): SWELL, gently (it would otherwise function as a rest).  JUDGEMENT.
//      R5c one macrobeat or less and followed by a macrobeat onset (the ordinary quarter on a beat): DECAY with a longer tail. The next beat is
//          already in the listener's body, so the note may sound "in time" without driving.  JUDGEMENT.
//      R5d followed by a rest or the end: this is "space", the silence is meant. DECAY with a long tail; if the note is longer than two
//          macrobeats, SUSTAIN (hold at a lower level, release at its end) so it does not die before its time.  JUDGEMENT.
//  R6  Phrase contour: pitch (here the voice's formants and buzz, no pitch centre) rises across the pattern toward the last anacrusis and
//      falls after it, ending lower than it began; a decaying note drifts down a little and a swelling one drifts up.  [Mullen p.84:
//      "we inflect the pitch of our voices in daily conversation with rises and falls"] The size of the contour is JUDGEMENT.
//  Sound: a whispered "bah": noise and a faint, slightly detuned buzz through vowel formants, a short consonant pop at the onset. See voice().
(function (global) {
  "use strict";
  var HIDDEN = global.VOICE_HIDDEN !== false;   // THE SWITCH: window.VOICE_HIDDEN, set in _includes/head.html (true = the voice cannot be heard anywhere; false = as before). Unset counts as hidden.
  var Core = global.AbcCore || (typeof require === "function" ? safeRequire("./abc-core.js") : null);
  var Events = global.AbcEvents || (typeof require === "function" ? safeRequire("./abc-events.js") : null);
  function safeRequire(p) { try { return require(p); } catch (e) { return null; } }

  var RULES = {
    // levels 0..1 (peak gain before the master)
    peakCrusis: 0.74, peakFirst: 1.0, peakPrime: 1.0,       // peakPrime: the first and the penultimate macrobeat (the user, 2026-10-25)
    pickupBoost: 1.12, pickupDrop: 0.8, pickupLift: -80,    // pattern opens with an anacrusis: its first downbeat louder still, the pickup quieter, lower (cents)
    endLift: 90,
    consonant: 0.3,
    taLevel: 0.55,                                          // Ta against the other syllables (the user: "dutadeta", ta a fair bit quieter)                                         // burst and aspiration level against the vowel (the user: consonants much too loud)
    dynStep: 2,                                             // dB per step of the 1-10 dynamics scale
    phraseDepth: 0.35,                                      // a phrase crescendo starts this much quieter than it ends
    questionChance: 0.25, questionGlide: [350, 550],        // a question: the last note glides up this many cents, held so it is heard
    endLength: 1.4,                                         // the last note rings this much longer (may run past its written end)
    lengthRatio: 1.3,                                       // a decaying macrobeat rings this much longer than these rules give (the user: macrobeats a bit longer)
    vowelMacro: 0.15, vowelWeak: 0.8,                       // "Bah" between ɑ (0) and ə (1): macrobeats near ɑ, the rest near ə (the user)                                            // the last note rises this many cents across its length: a little lift at the end
    primeLift: -60,                                         // extra cents on those two (lower still)
    gapBeforeShort: 0.045, gapShare: 0.35,                  // silence before a short note that follows a longer one (B>B), seconds / share of the short note
    peakWeak: 0.40, peakAfterSwell: 0.66,
    peakAnacrusisLo: 0.42, peakAnacrusisHi: 0.58,          // R3: first note of a run .. the anacrusis itself
    swellPeak: 0.70, swellPeakGentle: 0.62,                 // R5a, R5b: the level the swell reaches at the next onset
    swellStart: 0.40, swellDip: 0.32,                       // swell: onset at swellStart*peak, dips to swellDip*peak, then rises
    sustainLevel: 0.45,                                     // R5d long note before a rest
    // times in seconds
    shortDecay: 0.075, shortDecayMax: 0.15,                 // R4
    mediumDecayShare: 0.55, mediumDecayMax: 0.42,           // R5c: tail as a share of the note, capped
    spaceDecayShare: 0.7, spaceDecayMax: 0.6,               // R5d
    attack: 0.010, swellRelease: 0.03,
    // thresholds
    microTol: 1.02,                                          // longer than a microbeat by more than 2% = an elongation
    macroTol: 1.02,                                          // longer than a macrobeat by more than 2% = long
    longSpaceMacros: 2.0,                                    // R5d: longer than this many macrobeats before a rest sustains
    // contour (cents) R6
    contourRise: 260, contourFall: -320, anacrusisLift: 70, crusisDip: -140, decayDrift: -90, swellDrift: 90, noteSpread: 70
  };

  // ------------------------------------------------------------------------------------------------ plan (pure)
  function fixAbc(abc) {
    // the parser does not read "B//"; it means B/4 (rhythmSyllables in apps/patterns/audiation.js does the same)
    return abc.replace(/([A-Ga-gz][,']*)\/\/(?![0-9])/g, "$1/4");
  }
  function meterOf(abc) {
    var m = /^M:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc);
    if (m) return { n: +m[1], d: +m[2] };
    if (/^M:\s*C\|/m.test(abc)) return { n: 2, d: 2 };
    return { n: 4, d: 4 };
  }
  // Gordon's usual meters: macrobeat = the beat (a quarter in 2/4 3/4 4/4, a half in 2/2); compound meters 3/8 6/8 9/8 12/8 = a dotted quarter
  // Unusual meters (5/8, 7/8, ... in eighths, n not a multiple of 3): macrobeats of unequal length, 2 or 3 eighths, a duple macrobeat being a quarter
  // for the tempo.  [Gordon: unusual meter = macrobeats of unequal length]
  function macroOf(meter, o) {
    var triple = o && o.triple != null ? !!o.triple : (meter.d === 8 && meter.n % 3 === 0);
    var unusual = !(o && o.triple != null) && meter.d === 8 && meter.n % 3 !== 0;
    var q = o && o.macroQuarters ? o.macroQuarters : unusual ? 1 : (triple ? 3 : 1) * 4 / meter.d;
    return { triple: triple, macroQ: q, microQ: q / (triple ? 3 : 2) };
  }

  // Where the macrobeats are: [{ t, len, triple }] in quarters, covering the pattern. The one place this is decided: the chant stresses these notes
  // and Audiation.rhythmSyllables says "Du" on them.
  //   2/4 3/4 4/4: every quarter; 2/2: every half; 3/8 6/8 9/8 12/8: every dotted quarter (triple: Du Da Di);
  //   5/8 7/8 ...: groups of 2 and 3 eighths read off the beaming (the spaces between notes in the ABC: "BBB BB" = 3+2), and where the beaming
  //   does not say, 3+2 for 5, 2+2+3 for 7, otherwise 2s with a 3 at the end (JUDGEMENT).
  function beats(abc, o) {
    abc = fixAbc(abc);
    var meter = meterOf(abc), mm = macroOf(meter, o), ev = Events.fromAbc(abc), total = ev.quarters, out = [], t = 0, eps = 1e-6;
    // a pickup (a first bar shorter than the meter, "B/ | B/B/ ..."): the beats line up with the first full barline, so the pickup is off the beat
    var fullBar = meter.n * 4 / meter.d, firstOfBar2 = ev.written.filter(function (w) { return w.bar >= 1; })[0];
    var pk = firstOfBar2 && firstOfBar2.t_on > eps && firstOfBar2.t_on < fullBar - eps ? firstOfBar2.t_on : 0;
    var unusual = !(o && (o.triple != null || o.macroQuarters)) && meter.d === 8 && meter.n % 3 !== 0;
    if (!unusual) {
      for (t = pk - Math.ceil(pk / mm.macroQ - eps) * mm.macroQ; t < total - eps; t += mm.macroQ) out.push({ t: t, len: mm.macroQ, triple: mm.triple });
      return out;
    }
    var barQ = meter.n / 2, bars = groupsFromBeams(abc, meter.n);
    var deflt = meter.n === 5 ? [3, 2] : meter.n === 7 ? [2, 2, 3] : (function () { var g = []; for (var k = meter.n; k > 3; k -= 2) g.push(2); g.push(meter.n - 2 * g.length); return g; })();
    for (var pt = pk; pt > eps; ) { var l = pt >= 1.5 - eps && pt < 2 - eps ? 1.5 : 1; pt -= l; out.unshift({ t: pt, len: l, triple: l === 1.5 }); }   // the pickup's beats, back from the barline
    if (pk) bars = bars.slice(1);
    t = pk;
    for (var b = 0; t < total - eps; b++) {
      var g = bars[b] || deflt, u = t;
      g.forEach(function (e) { out.push({ t: u, len: e / 2, triple: e === 3 }); u += e / 2; });
      t += barQ;
    }
    return out;
  }
  // per bar, the beam groups in eighths if every group is 2 or 3 eighths and they fill the bar; else null for that bar
  function groupsFromBeams(abc, n) {
    var L = /^L:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc), unit = L ? 8 * (+L[1]) / (+L[2]) : 1;     // one written unit in eighths
    var body = abc.split(/\n/).filter(function (l) { return !/^[A-Za-z]:/.test(l) && !/^%/.test(l); }).join(" ");
    return body.split(/\|+\]?/).filter(function (x) { return /[A-Ga-gz]/.test(x); }).map(function (bar) {
      if (/[<>(\[{]/.test(bar)) return null;
      var gs = bar.trim().split(/\s+/).map(function (grp) {
        var sum = 0, re = /[A-Ga-gz][,']*(\d*)(\/*)(\d*)-?/g, m;
        while ((m = re.exec(grp))) { var num = m[1] ? +m[1] : 1, den = m[2] ? (m[3] ? +m[3] : Math.pow(2, m[2].length)) : 1; sum += unit * num / den; }
        return sum;
      });
      var tot = gs.reduce(function (a, b) { return a + b; }, 0);
      return Math.abs(tot - n) < 1e-6 && gs.every(function (x) { return Math.abs(x - 2) < 1e-6 || Math.abs(x - 3) < 1e-6; }) ? gs.map(Math.round) : null;
    });
  }

  // Gordon/Froseth rhythm syllables of each sounding note, bars split by "|": "Du De Du | ...". Du on every macrobeat from beats(); duple
  // De (half) Ta (quarters); triple Da Di (thirds) Ta (sixths); "?" where nothing fits. Audiation.rhythmSyllables uses this.
  function syllables(abc, o) {
    abc = fixAbc(abc);
    var r = Events.fromAbc(abc), B = beats(abc, o), out = [], bar = -1, eps = 1e-6, barOf = {};
    r.written.forEach(function (w) { barOf[w.id] = w.bar; });
    r.sounding.forEach(function (e) {
      if (e.kind && e.kind !== "note") return;
      var b = e.bar !== undefined ? e.bar : barOf[(e.from || [e.id])[0]];
      if (b !== undefined && b !== bar && bar >= 0) out.push("|");
      if (b !== undefined) bar = b;
      var k = B.length - 1; while (k > 0 && e.t_on < B[k].t - eps) k--;
      var f = B.length ? (e.t_on - B[k].t) / B[k].len : 0, tr = B.length ? B[k].triple : false, syl = "?";
      if (f > 1 - eps) f = 0;
      function at(x) { return Math.abs(f - x) < eps; }
      if (at(0)) syl = "Du";
      else if (!tr) syl = at(0.5) ? "De" : (at(0.25) || at(0.75)) ? "Ta" : "?";
      else syl = at(1 / 3) ? "Da" : at(2 / 3) ? "Di" : (at(1 / 6) || at(0.5) || at(5 / 6)) ? "Ta" : "?";
      out.push(syl);
    });
    return out.join(" ");
  }
  // The ABC with its syllables written under the notes (a w: line after each music line), for showing them. Tied-on notes hold the syllable ("_").
  function withSyllables(abc) {
    var list = syllables(abc).split(/\s+/).filter(function (x) { return x && x !== "|"; }), i = 0;
    return abc.split("\n").map(function (line) {
      if (/^\s*$/.test(line) || /^[A-Za-z]:/.test(line) || /^%/.test(line)) return line;
      var clean = line.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, "").replace(/\(\d(:\d*)*/g, ""), re = /[A-Ga-g][,']*[\d\/]*(-?)/g, m, w = [], tied = false;
      while ((m = re.exec(clean))) { w.push(tied ? "_" : (list[i++] || "*")); tied = !!m[1]; }
      return w.length ? line + "\nw: " + w.join(" ") : line;
    }).join("\n");
  }

  // The syllable of each sounding note: opts.syllables "rhythm" -> Gordon/Froseth Du De Da Di Ta from syllables() above (opts.syllableFn overrides it,
  // or opts.syllableFn); an array of syllables; anything else -> the neutral "Bah". null when they cannot be had or do not match the notes.
  function syllablesFor(abc, notes, opts) {
    var want = opts.syllables, list = null;
    if (Array.isArray(want)) list = want;
    else if (want === "rhythm") {
      var fn = opts.syllableFn || syllables;
      if (fn) list = String(fn(abc)).split(/\s+/).filter(function (x) { return x && x !== "|"; });
    }
    if (!list || list.length !== notes.length) return null;
    return list.map(function (x) { return SYL[x] ? x : "Da"; });
  }
  function plan(abc, opts) {
    if (!Events) throw new Error("rhythm-chant.js plan() needs abc-core.js and abc-events.js");
    opts = opts || {};
    var R = Object.assign({}, RULES, opts.rules || {});
    var abc0 = abc; abc = fixAbc(abc);
    var ev = Events.fromAbc(abc), meter = meterOf(abc), mm = macroOf(meter, opts);
    var macroQ = mm.macroQ, microQ = mm.microQ, eps = 1e-6;
    var seed = opts.seed != null ? opts.seed >>> 0 : Math.floor(Math.random() * 4294967296), rng = mulberry(seed);
    var rnd = function (a, b) { return a + (b - a) * rng(); };                              // seedable variety (JUDGEMENT: see VARIETY below)
    var vary = opts.vary === false ? 0 : (opts.vary != null ? opts.vary : 1);
    var spq = opts.secPerQuarter || (opts.macroBpm ? 60 / opts.macroBpm / macroQ : opts.qpm ? 60 / opts.qpm : 0.5);
    var S = ev.sounding.filter(function (e) { return e.kind === "note"; });
    var total = ev.quarters;
    var B = beats(abc0, opts);
    function beatOf(tq) { for (var b = B.length - 1; b >= 0; b--) if (tq >= B[b].t - eps) return B[b]; return B[0] || { t: 0, len: macroQ, triple: mm.triple }; }
    function posOf(tq) { var b = beatOf(tq), f = (tq - b.t) / b.len; return (f < 1e-6 || f > 1 - 1e-6) ? 0 : f; }
    var notes = S.map(function (e, i) {
      var tq = e.t_on, dq = e.t_off - e.t_on, nx = S[i + 1];
      var crusis = posOf(tq) === 0;
      var gapAfter = nx ? nx.t_on - e.t_off : Infinity;       // quarters of rest after this note (Infinity = end)
      var next = !nx || gapAfter > eps ? "rest" : (posOf(nx.t_on) === 0 ? "crusis" : "weak");
      if (!nx) next = "end";
      return { tQ: tq, durQ: dq, t: tq * spq, dur: dq * spq, role: crusis ? "crusis" : "weak", next: next,
               held: dq > beatOf(tq).len / (beatOf(tq).triple ? 3 : 2) * R.microTol, longer: dq > beatOf(tq).len * R.macroTol };
    });
    // R3: runs of weak onsets that end on a crusis lean forward
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].role !== "weak") continue;
      var j = i; while (j + 1 < notes.length && notes[j + 1].role === "weak" && notes[j].next === "weak") j++;
      var leads = notes[j].next === "crusis";                  // the run ends on a macrobeat
      var len = j - i + 1;
      for (var k = i; k <= j; k++) {
        notes[k].run = { index: k - i, length: len, leads: leads };
        if (leads) notes[k].anacrusis = k === j;
      }
      i = j;
    }
    // contour anchor: the last anacrusis (or the last weak onset; or 3/4 of the way)
    var anchor = null;
    notes.forEach(function (n) { if (n.anacrusis) anchor = n.tQ; });
    if (anchor == null) notes.forEach(function (n) { if (n.role === "weak") anchor = n.tQ; });
    if (anchor == null) anchor = total * 0.75;
    var arcEndT = notes.length ? Math.max(notes[notes.length - 1].tQ, 0.001) : total;
    function contour(tq) {
      if (tq <= anchor) { var x = anchor > 0 ? tq / anchor : 1; return riseAmp * Math.sin(x * Math.PI / 2); }
      var y = Math.min(1, (tq - anchor) / Math.max(arcEndT - anchor, 0.001));   // the arc lands on the last onset, so the ending is heard
      return riseAmp + (fallEnd - riseAmp) * (1 - Math.cos(y * Math.PI / 2));
    }
    // VARIETY (JUDGEMENT; the user: "a little different every time"). Everything below stays inside bounds that cannot undo a rule: a swell is still
    // a swell, a short note still decays, an anacrusis is still louder than the macrobeat it leads to, onsets move a few ms at most.
    var sylList = syllablesFor(abc0, notes, opts);
    // the page's sliders: pitchVar scales every random pitch choice (0 = the same each time); arcHeight scales the rise; arcEnd (cents) fixes
    // where the phrase ends instead of the usual fall (and its occasional question rise); arcPeak (0..1 of the pattern) moves the top of the arc
    var pv = vary * (opts.pitchVar != null ? Math.max(0, Math.min(4, +opts.pitchVar)) : 1);
    var riseAmp = R.contourRise * (opts.arcHeight != null ? +opts.arcHeight : 1) * (1 + Math.min(pv, 2) * rnd(-0.4, 0.4));
    var qc = opts.question != null ? Math.max(0, Math.min(1, +opts.question)) : R.questionChance;
    var question = qc > 0 && (qc >= 1 || rng() < qc);                                    // a question: the last note glides up (below)
    var fallEnd = opts.arcEnd != null ? +opts.arcEnd + pv * rnd(-40, 40) : R.contourFall * (1 + Math.min(pv, 2) * rnd(-0.35, 0.3));
    var cands = notes.filter(function (n) { return n.anacrusis; });
    if (pv > 0 && cands.length > 1 && rng() < 0.3) { var pick = cands[Math.floor(rng() * (cands.length - 1))]; anchor = pick.tQ; }
    else if (pv > 0 && !cands.length) anchor = anchor * (1 + Math.min(pv, 2) * rnd(-0.06, 0.06));
    if (opts.arcPeak != null && opts.arcPeak >= 0) anchor = Math.max(0, Math.min(1, +opts.arcPeak)) * total * (1 + pv * rnd(-0.05, 0.05));
    var voiceName = opts.voice || "low", VOICES = { low: { f0: 118, scale: 1 }, high: { f0: 205, scale: 1.16 } };
    var vc = VOICES[voiceName] || VOICES.low;
    var voice = { name: voiceName, f0: opts.f0 || vc.f0, scale: opts.formantScale || vc.scale, vowels: opts.vowels || null, cents: Math.round(Math.min(pv, 2) * Math.max(-150, Math.min(150, gauss(rng) * 60))) };
    var vowelScale = 1 + vary * rnd(-0.025, 0.025), humanize = opts.jitterMs != null ? opts.jitterMs : 3;
    // the penultimate macrobeat of the pattern (counting every macrobeat, sounded or not)
    var primeT = B.length >= 2 ? B[B.length - 2].t : -1;
    var endLen = opts.endLength != null ? Math.max(0.5, Math.min(3, +opts.endLength)) : R.endLength;
    var lenRatio = opts.lengthRatio != null ? Math.max(0.5, Math.min(3, +opts.lengthRatio)) : R.lengthRatio;
    var mixMacro = opts.vowelMacro != null ? +opts.vowelMacro : R.vowelMacro, mixWeak = opts.vowelWeak != null ? +opts.vowelWeak : R.vowelWeak;
    var emph = opts.emphasis != null ? Math.max(0, Math.min(3, +opts.emphasis)) : 1;
    var firstCrusis = notes.filter(function (n) { return n.role === "crusis"; })[0], firstT = firstCrusis ? firstCrusis.tQ : 0;
    var pickup = !!(firstCrusis && notes[0] !== firstCrusis);    // the pattern opens on a weak note (or after a rest that leaves one)
    // DYNAMICS (the user's example, levels 1-10: "B//B//B// | z//B//B//B// z//B//B//B// | z//B//B//B// B" = 8 5 3 | 8 5 3 8 5 3 | 7 5 8 10).
    // Level v -> gain 10^((v-10)*dB/20), dB per step R.dynStep. A run of weak notes that leads into a sounded macrobeat crescendos into it
    // (now and then dipping first: 7 5 8); one that ends on a rest or the end of the pattern starts strong and dies away (8 5 3).
    // Over that, each playing picks a phrase shape (crescendo, decrescendo, swell, level) that runs the whole pattern or starts again after each rest.
    var dyn = opts.dynamics != null ? Math.max(0, Math.min(2, +opts.dynamics)) : 1;
    function lv(v) { return Math.pow(10, (v - 10) * R.dynStep / 20); }
    var runShape = {};
    notes.forEach(function (n) { if (n.run && n.run.index === 0) {
      var k = n.tQ, L = n.run.length, j = function () { return vary * rnd(-0.7, 0.7); };
      runShape[k] = n.run.leads ? (L >= 3 && rng() < 0.35 ? { a: 7 + j(), m: 5 + j(), b: 8 + j() } : { a: 4 + j(), b: 7.6 + j() })
                                : { a: 8 + j(), b: 3 + j() };
    } });
    var runStart = null;
    function runLevel(n) {
      if (n.run.index === 0) runStart = n.tQ;
      var sh = runShape[runStart] || { a: 6, b: 6 }, L = n.run.length, x = L > 1 ? n.run.index / (L - 1) : 1, v;
      if (L === 1) v = n.run.leads ? sh.b : (sh.a + sh.b) / 2;
      else if (sh.m != null) v = x < 0.5 ? sh.a + (sh.m - sh.a) * x * 2 : sh.m + (sh.b - sh.m) * (x - 0.5) * 2;
      else v = sh.a + (sh.b - sh.a) * x;
      var mid = 10 + 20 * Math.log10(R.peakWeak) / R.dynStep;                     // the old flat weak level, in steps
      return lv(mid + (v - mid) * dyn);
    }
    var shapes = ["cresc", "decresc", "swell", "level"], phraseShape = opts.phraseShape || shapes[Math.floor(rng() * shapes.length)];
    var resetOnRests = opts.resetOnRests != null ? !!opts.resetOnRests : rng() < 0.5;
    var segs = [], segStart = 0;
    notes.forEach(function (n, i) { if (i > 0 && resetOnRests && notes[i - 1].next === "rest") segStart = n.tQ; segs.push(segStart); });
    function phraseDyn(n) {
      var i = notes.indexOf(n), a = segs[i], b = total; for (var q = i + 1; q < notes.length; q++) if (segs[q] !== a) { b = notes[q].tQ; break; }
      var x = (n.tQ - a) / Math.max(b - a, 1e-6), g = phraseShape === "cresc" ? x : phraseShape === "decresc" ? 1 - x : phraseShape === "swell" ? Math.sin(Math.PI * x) : 1;
      return 1 - R.phraseDepth * Math.min(1, dyn) * (1 - g);
    }
    var prev = null;
    notes.forEach(function (n, idx) {
      // shape (R4/R5)
      var peak, rule;
      if (!n.held) { n.shape = "decay"; rule = "R4"; }
      else if (n.next === "weak") { n.shape = "swell"; n.drive = "full"; rule = "R5a"; }
      else if (n.next === "crusis" && n.longer) { n.shape = "swell"; n.drive = "gentle"; rule = "R5b"; }
      else if (n.next === "crusis") { n.shape = "decay"; n.tail = "medium"; rule = "R5c"; }
      else { // rest or end
        if (n.durQ > macroQ * R.longSpaceMacros) { n.shape = "sustain"; rule = "R5d"; }
        else { n.shape = "decay"; n.tail = "space"; rule = "R5d"; }
      }
      n.rule = rule;
      // onset level (R1-R3)
      if (n.role === "weak" && n.run) { peak = runLevel(n); n.rule += n.run.leads ? "+R3" : "+D"; }
      else peak = idx === 0 ? R.peakFirst : R.peakCrusis;
      if (n.role === "crusis" && prev && prev.shape === "swell") { peak = R.peakAfterSwell; n.rule += "+R2"; }
      if (n.role === "crusis" && (Math.abs(n.tQ - firstT) < eps || Math.abs(n.tQ - primeT) < eps)) { peak = R.peakPrime; n.prime = true; n.rule += "+P"; }
      // emphasis (0..3, the page's slider; 1 = these rules): macrobeats move away from the weak level, weak notes drop as it rises above 1
      if (n.role === "crusis") peak = R.peakWeak + (peak - R.peakWeak) * emph;
      else if (emph > 1) peak = peak / (1 + 0.6 * (emph - 1));
      // a pattern that opens with an anacrusis: the downbeat it leads to lands hard, the pickup is kept light
      if (pickup && n.role === "crusis" && Math.abs(n.tQ - firstT) < eps) { peak *= R.pickupBoost; n.rule += "+A"; }
      peak *= phraseDyn(n);                                                              // the phrase's own crescendo / decrescendo
      if (sylList && sylList[idx] === "Ta") { peak *= opts.taLevel != null ? +opts.taLevel : R.taLevel; n.rule += "+T"; }   // Ta (the in-between divisions) a fair bit quieter
      n.peak = Math.max(0.06, peak * (1 + vary * rnd(-0.03, 0.03)));
      // envelope
      if (idx === notes.length - 1) { n.dur *= endLen; n.rule += "+L"; }                 // the last note is held longer (Last-note length); nothing follows it
      var dur = n.dur;
      n.attack = Math.min(R.attack, dur * 0.25);
      n.startLevel = n.peak; n.endLevel = 0.0001; n.hold = 0; n.release = 0.02;
      if (n.shape === "decay") {
        var tailKind = n.tail || "short";
        n.decay = tailKind === "short" ? Math.min(Math.max(R.shortDecay, dur * 0.3), R.shortDecayMax, dur * 0.95)
                : tailKind === "medium" ? Math.min(dur * R.mediumDecayShare, R.mediumDecayMax)
                : Math.min(dur * R.spaceDecayShare, R.spaceDecayMax);
        n.decay = Math.max(0.03, Math.min(n.decay * (1 + vary * rnd(-0.15, 0.2)), dur));
        if (n.role === "crusis") n.decay = Math.min(n.decay * lenRatio, dur * 0.97);     // macrobeats ring on longer (the Length ratio slider)
      } else if (n.shape === "sustain") {
        n.decay = Math.min(0.12, dur * 0.3); n.hold = n.peak * R.sustainLevel; n.release = 0.06;
      } else { // swell: onset, small dip, then the crescendo to the next onset
        var top = n.drive === "gentle" ? R.swellPeakGentle : R.swellPeak;
        n.startLevel = n.peak * R.swellStart; n.dip = n.peak * R.swellDip; n.endLevel = top;
        n.decay = Math.min(dur * 0.25, 0.15); n.release = Math.min(R.swellRelease, dur * 0.1);
      }
      // pitch (cents) and brightness (formant scale) across the note
      // macrobeats sit lower than the notes between them (the user, 2026-10-25); every note gets its own small offset so the line moves
      var role = ((n.prime ? R.primeLift : 0) + (n.role === "crusis" ? R.crusisDip : 0)) * emph + (n.anacrusis ? R.anacrusisLift : 0) + rnd(-1, 1) * R.noteSpread * (vary ? pv : 0.5)
               + (pickup && n.role === "crusis" && Math.abs(n.tQ - firstT) < eps ? R.pickupLift : 0);
      n.cents0 = Math.round(contour(n.tQ) + role);
      n.cents1 = Math.round(contour(n.tQ + n.durQ) + role + (n.shape === "decay" ? R.decayDrift : n.shape === "swell" ? R.swellDrift : 0));
      n.bright0 = n.shape === "swell" ? 0.85 : n.role === "crusis" ? 1 + 0.2 * emph : 0.9;
      if (idx === notes.length - 1) {
        if (question) {   // a question, as speech asks one: the last syllable starts low and slides up, held so the slide is heard
          n.cents0 -= 60; n.cents1 = n.cents0 + rnd(R.questionGlide[0], R.questionGlide[1]); n.question = true; n.qw = rng(); n.rule += "+Q";
          if (n.shape === "decay") n.decay = Math.max(n.decay, n.dur * 0.9);
          n.bright1 = 1.15;
        } else { n.cents1 = n.cents0 + R.endLift; n.rule += "+E"; }   // a little lift at the end
      } n.bright1 = n.shape === "swell" ? 1.25 : n.shape === "decay" ? 0.8 : 1;
      n.syl = sylList ? sylList[idx] : "Bah";
      if (opts.tLength != null) n.tvot = Math.max(0.01, +opts.tLength);                // seconds from the t's release to voicing (default CONS.t.vot)
      n.cons = opts.consonant != null ? Math.max(0, Math.min(2, +opts.consonant)) : R.consonant;
      n.mix = n.role === "crusis" ? mixMacro : mixWeak;                                  // 0 = ɑ, 1 = ə (only "Bah" uses it)
      n.vow = vowelScale * (1 + vary * rnd(-0.02, 0.02));
      n.drift = pv * rnd(-25, 25);
      n.jit = humanize && !(idx === 0 && n.tQ === 0) ? rnd(-humanize, humanize) / 1000 : (humanize ? rnd(0, humanize) / 1000 : 0);
      prev = n;
    });
    // a run that leads into a macrobeat crescendos INTO it: the macrobeat stays above the note before it, whatever the phrase shape did
    // (a swell already builds into it; with no emphasis there is no floor)
    var floorK = 1 + 0.15 * Math.min(emph, 1);
    notes.forEach(function (n, i) { var nx = notes[i + 1]; if (n.anacrusis && n.shape !== "swell" && nx && nx.role === "crusis" && nx.peak < n.peak * floorK) nx.peak = n.peak * floorK; });
    // strong emphasis can push the loudest note past 1: scale the whole pattern down so the contrasts survive (a cap would flatten them)
    var top = Math.max.apply(null, notes.map(function (n) { return n.peak; }));
    if (top > 1) notes.forEach(function (n) { n.peak /= top; n.startLevel /= top; if (n.dip) n.dip /= top; if (n.hold) n.hold /= top; if (n.shape === "swell") n.endLevel /= top; });
    // a short note right after a longer one (B>B, B3/2 B/) gets a moment of silence before it so it is not swallowed
    notes.forEach(function (n, i) {
      var nx = notes[i + 1];
      if (nx && (n.next === "weak" || n.next === "crusis") && nx.durQ < n.durQ * 0.75 && !nx.held) {
        var gap = Math.min(n.dur * 0.3, Math.max(R.gapBeforeShort, nx.dur * R.gapShare));
        n.cut = n.dur - gap;
      }
    });
    return { seed: seed, voice: voice, syllables: !!sylList, notes: notes, total: Math.max(total * spq, notes.length ? notes[notes.length - 1].t + notes[notes.length - 1].dur : 0), totalQ: total, macroQ: macroQ, microQ: microQ, triple: mm.triple, beats: B, sound: opts.sound === "woodblock" ? "woodblock" : "voice", phraseShape: phraseShape, resetOnRests: resetOnRests,
             meter: meter, secPerQuarter: spq };
  }

  // ------------------------------------------------------------------------------------------------ voice (sample-level synthesis)
  // The voice is rendered sample by sample in plain JS (render(plan, sampleRate) -> Float32Array), then played as one AudioBuffer. That keeps it
  // exact, lets the Node tests render and listen-by-measurement to it, and lets syllable-detect.js be tested on it. (Web Audio's own filters cannot
  // move formants note by note this cleanly, and their noise is not seedable.)
  //  Source   a Rosenberg glottal pulse (open phase, closing phase, closed), differentiated (lip radiation), at f0 that follows the plan's
  //           contour; per-period jitter (~0.6%) and shimmer (~3%); aspiration noise mixed in, more when the note is soft, and a breathy tail.
  //           Effort (the note's current level) shortens the open quotient and lifts F1: loud notes are brighter, soft ones breathier.
  //  Tract    five Klatt resonators in cascade (F1-F4 per vowel, F5 fixed), formant targets moving from the consonant's locus to the vowel.
  //  Onsets   b ("bah"): closure, quiet burst (~800 Hz), voicing at once, locus F2 800.  d (Du De Da Di): burst high-passed ~3.8 kHz, 10 ms before
  //           voicing, locus F2 1800.  t (Ta): the same burst, then ~45 ms of aspiration (breath noise through the vowel's formants) before voicing.
  //  Vowels   u e a i, formants from the IPA chart's table (apps/shared/ipa/ipa-synth.js, adult male, Hz); the high voice is scaled x1.16 as there.
  //  Release  the voice fades by the note's own envelope (decay, sustain or swell) and ends in a short breath, not a click.
  var SCHWA_LOW = 0.309, SCHWA_HIGH = 0.235;                    // measured below in tests/rhythm/rhythm-chant.test.js (equal RMS with ɑ)
  var VOWELS = { u: [280, 610, 2200], e: [400, 2100, 2700], a: [760, 1080, 2500], i: [280, 2250, 2950], schwa: [510, 1525, 2500] };   // schwa: ə, same table (mid central)
  var EY = [300, 2300, 2950];                                    // where "De"'s e glides to (ɪ of "day", the IPA table's close-mid front, raised)
  var LOCUS = { b: [220, 800, 2100], d: [250, 1800, 2900], t: [250, 1800, 2900] };
  var CONS = { b: { burst: 0.006, vot: 0.004, bf: 900, bw: 1400, bg: 0.22, asp: 0 },
               d: { burst: 0.008, vot: 0.010, bf: 3800, bw: 2200, bg: 0.55, asp: 0 },
               t: { burst: 0.008, vot: 0.026, bf: 4200, bw: 2600, bg: 0.7, asp: 0.8 } };   // shorter than it was (0.012 / 0.045): the user
  var SYL = { Du: { c: "d", v: "u" }, De: { c: "d", v: "e" }, Da: { c: "d", v: "a" }, Di: { c: "d", v: "i" }, Ta: { c: "t", v: "a" }, Bah: { c: "b", v: "a" } };
  var BW = [65, 90, 125, 180, 300];
  // loudness equalisation: multiplier that gives each vowel the same RMS (0.2 at a sustained peak of 0.8), measured by rendering it (see tests/rhythm/rhythm-chant.test.js)
  var VG = { low: { u: 0.286, e: 0.340, a: 0.190, i: 0.369, schwa: SCHWA_LOW }, high: { u: 0.194, e: 0.291, a: 0.100, i: 0.290, schwa: SCHWA_HIGH } };
  function mulberry(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function res(f, bw, sr) { var r = Math.exp(-Math.PI * bw / sr), C = -r * r, B = 2 * r * Math.cos(2 * Math.PI * f / sr); return [1 - B - C, B, C]; }

  // a question's slide, as speech does it: a small dip, a slow start, most of the rise in the second half, easing off with a little overshoot,
  // and a slight wobble (w: the note's own phase). Returns 0..~1.03 of the glide.  JUDGEMENT, by ear.
  function qCurve(u, w) {
    var v = Math.max(0, Math.min(1, (u - 0.18) / 0.82)), e = Math.pow(v, 1.5), rise = e * e * (3 - 2 * e);
    var dip = -0.06 * Math.sin(Math.PI * Math.min(1, u / 0.22)), over = 0.04 * Math.sin(Math.PI * Math.max(0, Math.min(1, (u - 0.78) / 0.22)));
    return rise + dip + over + 0.02 * Math.sin(2 * Math.PI * (2.3 * u + w)) * v;
  }

  // gain (0..1.2) of note n at t seconds after its onset, from its plan fields
  function gainAt(n, t) {
    if (n.cut != null) { if (t >= n.cut) return 0; var fade = 0.012; var k = n.cut - t < fade ? (n.cut - t) / fade : 1; return k * gainAt_(n, t, n.cut); }
    return gainAt_(n, t, n.dur);
  }
  function gainAt_(n, t, dur) {
    var a = n.attack, p = n.peak;
    if (t < 0) return 0;
    if (n.shape === "decay") {
      if (t < a) return p * t / a;
      var u = (t - a) / n.decay; return u >= 1 ? 0 : p * Math.pow(0.02, u) * (1 - Math.pow(u, 4));
    }
    if (n.shape === "sustain") {
      var d = n.decay, h = n.hold;
      var g = t < a ? p * t / a : t < a + d ? h + (p - h) * Math.pow(1 - (t - a) / d, 2) : h;
      return t > dur - n.release ? g * Math.max(0, (dur - t) / n.release) : g;
    }
    var g2;                                                        // swell: onset, dip, then up to the next onset
    if (t < a) g2 = n.startLevel * t / a;
    else if (t < a + n.decay) g2 = n.startLevel + (n.dip - n.startLevel) * ((t - a) / n.decay);
    else { var tt = (t - a - n.decay) / Math.max(dur - n.release - a - n.decay, 0.01); g2 = n.dip + (n.endLevel - n.dip) * Math.min(1, Math.max(0, tt)); }
    return t > dur - n.release ? g2 * Math.max(0, (dur - t) / n.release) : g2;
  }

  // Render a plan. opts: voice "low"|"high" (default plan.voice.name), tail seconds. Returns Float32Array (mono, peak <= ~0.8).
  function render(p, sr, opts) {
    opts = opts || {};
    var rng = mulberry(p.seed != null ? p.seed : 1), v = p.voice, scale = v.scale;
    var len = Math.ceil((p.total + 0.35) * sr), out = new Float32Array(len);
    if (p.sound === "woodblock") { p.notes.forEach(function (n) { renderBlock(out, sr, n, rng); }); return out; }
    p.notes.forEach(function (n) { renderNote(out, sr, n, v, scale, rng); });
    return out;
  }
  // WOODBLOCK (opts.sound "woodblock"): the same plan struck on a woodblock, so the dynamics and the macrobeat emphasis still come through.
  // A 50 ms noise burst through a 1.5 kHz band-pass (Q 6), the recipe of the LSA pages' woodblock (apps/rhythm-assessment/app.js).
  function renderBlock(out, sr, n, rng) {
    var i0 = Math.max(0, Math.round((n.t + (n.jit || 0)) * sr)), N = Math.min(out.length - i0, Math.round(0.05 * sr)), c = res(1500, 250, sr), z1 = 0, z2 = 0;
    for (var i = 0; i < N; i++) { var x = (rng() * 2 - 1) * Math.pow(1 - i / N, 6) * n.peak, y = c[0] * x + c[1] * z1 + c[2] * z2; z2 = z1; z1 = y; out[i0 + i] += y * 1.6; }
  }
  function renderNote(out, sr, n, v, scale, rng) {
    var sy = SYL[n.syl] || SYL.Bah, cs = CONS[sy.c], tg = (v.vowels || VOWELS)[sy.v], lc = LOCUS[sy.c];
    // "Bah": the vowel slides from ɑ (mix 0) toward ə (mix 1), set per note by the plan (macrobeats / the rest); loudness kept equal
    var vg = VG[v.name === 'high' ? 'high' : 'low'][sy.v];
    if ((n.syl || "Bah") === "Bah" && n.mix) {
      var A = (v.vowels || VOWELS).a, S = VOWELS.schwa, mx = Math.max(0, Math.min(1, n.mix));
      tg = [0, 1, 2].map(function (q) { return A[q] + (S[q] - A[q]) * mx; });
      var VGv = VG[v.name === 'high' ? 'high' : 'low']; vg = VGv.a + (VGv.schwa - VGv.a) * mx;
    }
    var i0 = Math.max(0, Math.round((n.t + (n.jit || 0)) * sr)), nd = n.dur - (n.jit || 0);
    var N = Math.min(out.length - i0, Math.round((nd + 0.06) * sr));
    var vs = n.vow || 1, f0c = v.f0 * Math.pow(2, (v.cents + (n.drift || 0)) / 1200);
    var z = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], co = [], F = [0, 0, 0, 0, 0], k;
    var phase = rng(), f0 = f0c, amp = 1, per = 1 / f0c, gprev = 0, jit = 0;
    var bz = [0, 0], bco = res(cs.bf, cs.bw, sr), aspz = 0;
    var cl = n.cons != null ? n.cons : RULES.consonant;          // consonant level (the Consonants slider)
    var vot = sy.c === "t" && n.tvot ? n.tvot : cs.vot, burstN = Math.round((sy.c === "t" && n.tvot ? cs.burst * n.tvot / cs.vot : cs.burst) * sr), tau = 0.018, hump = sy.v === "e" ? 1 : 0;
    var seg = 16;
    for (var s = 0; s < N; s++) {
      var t = s / sr;
      if (s % seg === 0) {                                     // formant targets for this stretch
        var m = Math.exp(-Math.max(0, t - 0.0) / tau), gl = hump ? Math.min(1, t / Math.max(0.1, 0.55 * n.dur)) : 0;
        gl = gl * gl * (3 - 2 * gl);                            // "De" as "day": e glides to ɪ over about half the note
        for (k = 0; k < 4; k++) {
          var tv = k < 3 ? tg[k] : 3500;
          if (hump && k < 3) tv = tg[k] + (EY[k] - tg[k]) * gl;
          var loc = k < 3 ? lc[k] : tv;
          var eff = Math.max(0, Math.min(1, gainAt(n, t) / 0.9));
          F[k] = (tv + (loc - tv) * m) * scale * vs * (k === 0 ? 1 + 0.07 * eff : 1);
        }
        F[4] = 4700 * scale;
        co = F.map(function (f, q) { return res(f, BW[q] * (q === 0 ? 1 + (1 - Math.min(1, gainAt(n, t) / 0.9)) * 0.5 : 1), sr); });
      }
      var g = gainAt(n, t), eff2 = Math.min(1, g / 0.9);
      var voiced = 0, asp = 0;
      // source: glottal pulse from VOT on
      if (t >= vot && g > 1e-4) {
        var ramp = Math.min(1, (t - vot) / 0.006);
        // f0 contour: the plan's cents across the note, a little higher just after a voiceless release, plus slow wander
        var u = Math.min(1, t / Math.max(n.dur, 0.05)), cents = n.cents0 + (n.cents1 - n.cents0) * (n.question ? qCurve(u, n.qw || 0) : u);
        var micro = sy.c === "t" ? 60 * Math.exp(-(t - vot) / 0.05) : 0;
        f0 = f0c * Math.pow(2, (cents + micro) / 1200) * (1 + jit);
        phase += f0 / sr;
        if (phase >= 1) { phase -= 1; jit = gauss(rng) * 0.006; amp = 1 + gauss(rng) * 0.03; }
        var oq = 0.72 - 0.26 * eff2, Tp = oq * 0.68, Tn = oq * 0.32, gl2;
        if (phase < Tp) gl2 = 0.5 * (1 - Math.cos(Math.PI * phase / Tp));
        else if (phase < Tp + Tn) gl2 = Math.cos(Math.PI * (phase - Tp) / (2 * Tn));
        else gl2 = 0;
        voiced = (gl2 - gprev) * (sr / f0) * 0.11 * amp * ramp; gprev = gl2;
        asp = (rng() * 2 - 1) * (0.02 + 0.10 * (1 - eff2) + 0.06 * gl2) * ramp;
      }
      if (t < vot + 0.03 && cs.asp) {                          // aspiration of a "t": noise through the vowel's formants
        var ae = t < vot ? cs.asp * (0.4 + 0.6 * t / vot) : cs.asp * Math.exp(-(t - vot) / 0.008);
        asp += (rng() * 2 - 1) * 0.35 * ae * Math.min(1, g * 2 + 0.3) * cl;
      }
      // the breathy tail: the last 40 ms of a decaying/ending note
      var tailT = nd - t; if (tailT < 0.04 && tailT > 0 && n.shape !== "swell") asp += (rng() * 2 - 1) * 0.05 * (tailT / 0.04) * Math.min(1, n.peak * 2);
      var x = (voiced + asp) * Math.max(g, t < vot + 0.03 ? 0.25 * n.peak : 0) * vg;
      for (k = 0; k < 5; k++) { var c = co[k], y = c[0] * x + c[1] * z[k][0] + c[2] * z[k][1]; z[k][1] = z[k][0]; z[k][0] = y; x = y; }
      var o = x;
      if (s < burstN * 4) {                                     // the burst
        var be = Math.exp(-s / (burstN * 0.8)), nz = (rng() * 2 - 1) * be * cs.bg * n.peak * 1.1 * cl;   // in step with the note (it was ^0.6, loud on quiet notes)
        var yb = bco[0] * nz + bco[1] * bz[0] + bco[2] * bz[1]; bz[1] = bz[0]; bz[0] = yb; o += yb * 0.5;
      }
      out[i0 + s] += o;
    }
  }

  function schedule(ctx, p, when, opts) {
    opts = opts || {};
    var data = render(p, ctx.sampleRate), buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
    if (opts.normalize !== false) {   // every pattern's loudest moment at the same level (the voice was very quiet); the plan's levels stay relative
      var pk = 0; for (var i = 0; i < data.length; i++) { var av = Math.abs(data[i]); if (av > pk) pk = av; }
      if (pk > 1e-4) { var gn = 0.92 / pk; for (i = 0; i < data.length; i++) data[i] *= gn; }
    }
    buf.getChannelData(0).set(data);
    var src = ctx.createBufferSource(), master = ctx.createGain();
    src.buffer = buf; master.gain.value = opts.gain != null ? opts.gain : 0.8;
    src.connect(master); master.connect(opts.dest || (own && ctx === own.ctx ? own.out : ctx.destination));
    src.start(when);
    return { endsAt: when + p.total, buffer: buf, stop: function () {
      var t = ctx.currentTime;
      try { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 0.03); src.stop(t + 0.05); } catch (e) {}
    } };
  }

  var own = null;   // { ctx, out }
  function ownContext() {
    if (own) return own;
    var AC = global.AudioContext || global.webkitAudioContext;
    var ctx = new AC(), out = ctx.createGain();
    out.gain.value = 0.9; out.connect(ctx.destination);
    if (global.AudioTap) try { global.AudioTap.register(ctx, out, "Rhythm chant"); } catch (e) {}
    own = { ctx: ctx, out: out };
    return own;
  }

  var current = null;
  function play(abc, opts) {
    opts = opts || {};
    if (api.HIDDEN) opts = Object.assign({}, opts, { sound: "woodblock", syllables: null });   // voice hidden: the woodblock, never the voice
    if (current && !opts.ctx) { try { current.stop(); } catch (e) {} }
    var p = plan(abc, opts), ctx, h;
    if (opts.ctx) ctx = opts.ctx; else ctx = ownContext().ctx;
    var timer = null, done = false, stopped = false;
    var when = opts.when != null ? opts.when : ctx.currentTime + 0.08;
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    h = schedule(ctx, p, when, opts);
    var handle = { plan: p, endsAt: h.endsAt, stop: function () { stopped = true; clearTimeout(timer); h.stop(); if (current === handle) current = null; } };
    timer = setTimeout(function () { if (stopped) return; if (current === handle) current = null; if (opts.onEnd) opts.onEnd(); },
      Math.max(0, (h.endsAt - ctx.currentTime) * 1000) + 60);
    if (!opts.ctx) current = handle;
    return handle;
  }

  // ------------------------------------------------------------------------------------------------ the setting
  // One on/off setting per scope (a page or family of pages), kept in localStorage "rc-conv:<scope>"; scope(name, defaultOn) picks it and
  // says what it is until the person has chosen. Pages that grade the person's own playing or are plain banks default off, the
  // LSA Practice pages (a simulated learning sequence activity) default on.
  var scopeName = "default", scopeDefault = false, on = false, boxes = [];
  function load() {
    on = scopeDefault;
    try { var v = global.localStorage && global.localStorage.getItem("rc-conv:" + scopeName); if (v === "1") on = true; else if (v === "0") on = false; } catch (e) {}
  }
  function scope(name, defaultOn) { scopeName = name || "default"; scopeDefault = !!defaultOn; load(); loadSyl(); boxes.forEach(function (b) { b.checked = on; }); }
  function enabled() { return api.HIDDEN ? false : on; }
  function setEnabled(v) {
    on = !!v; try { global.localStorage.setItem("rc-conv:" + scopeName, on ? "1" : "0"); } catch (e) {}
    boxes.forEach(function (b) { b.checked = on; });
  }
  load();
  // a "Conversational" checkbox. opts: onchange(bool), after (an element to put it after) else appended to parent, label, title. Returns the label.
  function hiddenLabel() { var l = global.document.createElement("label"); l.style.display = "none"; l.hidden = true; return l; }
  function checkbox(parent, opts) {
    opts = opts || {};
    if (api.HIDDEN) return hiddenLabel();   // voice hidden: nothing to switch
    var lab = global.document.createElement("label"), cb = global.document.createElement("input");
    lab.className = "rc-conv"; lab.style.cssText = "display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap";
    cb.type = "checkbox"; cb.className = "rc-conv-box"; cb.checked = on;
    lab.title = opts.title || "Chant the rhythm patterns the way a teacher does in a learning sequence activity: one unpitched, inflected voice, short notes clipped, long notes leaning on to the next beat.";
    lab.appendChild(cb); lab.appendChild(global.document.createTextNode(opts.label || "Conversational"));
    cb.addEventListener("change", function () { setEnabled(cb.checked); if (opts.onchange) opts.onchange(cb.checked); });
    boxes.push(cb);
    if (opts.after && opts.after.parentNode) opts.after.parentNode.insertBefore(lab, opts.after.nextSibling);
    else if (parent) parent.appendChild(lab);
    return lab;
  }
  // "Syllables": chant Du De Da Di Ta (Gordon/Froseth, from Audiation.rhythmSyllables) instead of the neutral "bah". Its own setting, per scope, default off.
  // A page offers it only where hearing the syllables gives nothing away (see apps/patterns/audiation.js).
  var sylOn = false, sylBoxes = [];
  function loadSyl() { sylOn = false; try { sylOn = !!global.localStorage && global.localStorage.getItem("rc-syl:" + scopeName) === "1"; } catch (e) {} }
  function syllablesOn() { return api.HIDDEN ? false : sylOn; }
  // "Show syllables" (written under the notes; the page re-draws on change) and the emphasis slider's value, both remembered per scope
  function showSyllablesOn() { try { return global.localStorage.getItem("rc-showsyl:" + scopeName) === "1"; } catch (e) { return false; } }
  // the chant bar's sliders: stored value (what plan() takes) <-> slider position
  var SLIDERS = [
    { key: "emph", label: "Macrobeat emphasis", cls: "rc-emph", min: 0, max: 300, step: 5, def: 1, lo: 0, hi: 3,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u + "%"; },
      title: "How much louder and lower the macrobeats (Du) are than the notes between them. 100% = the default." },
    { key: "len", label: "Length ratio", cls: "rc-len", min: 50, max: 300, step: 5, def: RULES.lengthRatio, lo: 0.5, hi: 3,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return "\u00d7" + (u / 100).toFixed(2); },
      title: "How much longer a macrobeat rings than the rules alone give it (x1 = no difference)." },
    { key: "vmac", label: "Macrobeat vowel \u0251\u2013\u0259", cls: "rc-vmac", min: 0, max: 100, step: 5, def: RULES.vowelMacro, lo: 0, hi: 1,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: vowelShow,
      title: "The vowel of \"bah\" on macrobeats: left = \u0251 (father), right = \u0259 (about). Not used with Hear syllables." },
    { key: "vweak", label: "Other notes' vowel \u0251\u2013\u0259", cls: "rc-vweak", min: 0, max: 100, step: 5, def: RULES.vowelWeak, lo: 0, hi: 1,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: vowelShow,
      title: "The vowel of \"bah\" between macrobeats: left = \u0251 (father), right = \u0259 (about). Not used with Hear syllables." }];
  SLIDERS.push(
    { key: "endlen", label: "Last-note length", cls: "rc-endlen", min: 50, max: 300, step: 5, def: RULES.endLength, lo: 0.5, hi: 3,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return "\u00d7" + (u / 100).toFixed(2); },
      title: "How much longer the last note rings (x1 = like any other note)." },
    { key: "pvar", label: "Pitch variance", cls: "rc-pvar", min: 0, max: 400, step: 10, def: 1, lo: 0, hi: 4,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u + "%"; },
      title: "How far the pitch wanders at random, note to note and from one playing to the next. 0 = the same every time." },
    { key: "arch", label: "Arc height", cls: "rc-arch", min: 0, max: 300, step: 10, def: 1, lo: 0, hi: 3,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u + "%"; },
      title: "How high the phrase rises toward the top of its arc. 100% = about a whole tone." },
    { key: "arcpk", label: "Arc peak", cls: "rc-arcpk", min: -5, max: 100, step: 5, def: -0.05, lo: -0.05, hi: 1,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u < 0 ? "auto" : u + "%"; },
      title: "Where the top of the arc falls, as a share of the pattern. Auto = on the last anacrusis." },
    { key: "arcend", label: "Arc ending", cls: "rc-arcend", min: -605, max: 400, step: 5, def: -605, lo: -605, hi: 400,
      toUi: function (v) { return v; }, fromUi: function (u) { return u; }, show: function (u) { return u < -600 ? "auto" : (u > 0 ? "+" : "") + u + "\u00a2"; },
      title: "Where the phrase ends, in cents from where it began: below 0 falls, above 0 ends high. Auto = a fall." });
  SLIDERS.push(
    { key: "dyn", label: "Dynamics", cls: "rc-dyn", min: 0, max: 200, step: 10, def: 1, lo: 0, hi: 2,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u + "%"; },
      title: "How much the runs between beats crescendo and die away, and how much each playing swells or fades over the phrase. 0 = level." },
    { key: "quest", label: "Question ending", cls: "rc-quest", min: 0, max: 100, step: 5, def: RULES.questionChance, lo: 0, hi: 1,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u + "%"; },
      title: "How often the last note slides up like a question. 100% = every time." });
  SLIDERS.push(
    { key: "cons", label: "Consonants", cls: "rc-cons", min: 0, max: 200, step: 5, def: RULES.consonant, lo: 0, hi: 2,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u + "%"; },
      title: "How loud the consonants (the b, d, t at the start of each syllable) are against the vowel. 100% = the old level." });
  SLIDERS.push(
    { key: "ta", label: "Ta level", cls: "rc-ta", min: 10, max: 100, step: 5, def: RULES.taLevel, lo: 0.1, hi: 1,
      toUi: function (v) { return Math.round(v * 100); }, fromUi: function (u) { return u / 100; }, show: function (u) { return u + "%"; },
      title: "How loud \"Ta\" (the smallest divisions) is against the other syllables, with Hear syllables on. 100% = no quieter." });
  function vowelShow(u) { return u === 0 ? "\u0251" : u === 100 ? "\u0259" : u + "% \u0259"; }
  function setting(key) {
    var sl = SLIDERS.filter(function (x) { return x.key === key; })[0];
    try { var v = parseFloat(global.localStorage.getItem("rc-" + key + ":" + scopeName)); return isFinite(v) ? Math.max(sl.lo, Math.min(sl.hi, v)) : sl.def; } catch (e) { return sl.def; }
  }
  function emphasisValue() { return setting("emph"); }
  function soundValue() { try { return global.localStorage.getItem("rc-sound:" + scopeName) === "woodblock" ? "woodblock" : "voice"; } catch (e) { return "voice"; } }
  function showSylBox(parent, opts) {
    var lab = global.document.createElement("label"), cb = global.document.createElement("input");
    lab.className = "rc-showsyl"; lab.style.cssText = "display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap";
    lab.title = "Write the rhythm syllables (Du De Da Di Ta) under the notes.";
    cb.type = "checkbox"; cb.className = "rc-showsyl-box"; cb.checked = showSyllablesOn();
    lab.appendChild(cb); lab.appendChild(global.document.createTextNode("Show syllables"));
    cb.addEventListener("change", function () { try { global.localStorage.setItem("rc-showsyl:" + scopeName, cb.checked ? "1" : "0"); } catch (e) {} if (opts.onchange) opts.onchange(cb.checked); });
    parent.appendChild(lab); return lab;
  }
  function syllablesBox(parent, opts) {
    opts = opts || {};
    if (api.HIDDEN) return hiddenLabel();   // voice hidden
    var lab = global.document.createElement("label"), cb = global.document.createElement("input");
    lab.className = "rc-syl"; lab.style.cssText = "display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap";
    cb.type = "checkbox"; cb.className = "rc-syl-box"; loadSyl(); cb.checked = sylOn;
    lab.title = opts.title || "Chant the rhythm syllables (Du De Da Di Ta) instead of the neutral \"bah\".";
    lab.appendChild(cb); lab.appendChild(global.document.createTextNode(opts.label || "Syllables"));
    cb.addEventListener("change", function () {
      sylOn = cb.checked; try { global.localStorage.setItem("rc-syl:" + scopeName, sylOn ? "1" : "0"); } catch (e) {}
      sylBoxes.forEach(function (b) { b.checked = sylOn; }); if (opts.onchange) opts.onchange(sylOn);
    });
    sylBoxes.push(cb); if (parent) parent.appendChild(lab); return lab;
  }
  // For pages whose own player is abcjs's SynthController (Rhythm Patterns, Rhythm Sequences): a checkbox, and, while it is ticked, a
  // Chant / Stop pair and a tempo box in place of the abcjs control (opts.hide: elements to hide meanwhile). opts.getAbc() -> the ABC now shown.
  function mountBar(parent, opts) {
    if (api.HIDDEN) {   // voice hidden: no chant controls, only "Show syllables" (notation, not sound) where the page asks for it
      var hb = global.document.createElement("span"); hb.className = "rc-bar";
      if (opts.syllables) { hb.style.cssText = "display:inline-flex;align-items:center;gap:.5rem;flex-wrap:wrap"; showSylBox(hb, { onchange: opts.onShowSyllables }); parent.appendChild(hb); }
      var nb = global.document.createElement("button");
      return { label: hiddenLabel(), sync: function () {}, play: nb, stop: nb, tempo: global.document.createElement("input") };
    }
    var d = global.document, bar = d.createElement("span");
    bar.className = "rc-bar"; bar.style.cssText = "display:inline-flex;align-items:center;gap:.5rem;flex-wrap:wrap";
    var h = null;
    var cbLab = checkbox(bar, { onchange: sync });
    var play = d.createElement("button"), stop = d.createElement("button"), tempo = d.createElement("input"), tl = d.createElement("label");
    play.type = stop.type = "button"; play.className = "rc-play" + (opts.btnClass ? " " + opts.btnClass : ""); stop.className = "rc-stop" + (opts.btnClass ? " " + opts.btnClass : "");
    play.textContent = "▶ Chant"; stop.textContent = "■ Stop";
    tempo.type = "number"; tempo.min = 40; tempo.max = 200; tempo.value = opts.tempo || 90; tempo.style.width = "4.2rem"; tempo.className = "rc-tempo";
    tl.style.cssText = "display:inline-flex;align-items:center;gap:.3rem"; tl.appendChild(d.createTextNode("Macrobeats/min")); tl.appendChild(tempo);
    var live = d.createElement("span"); live.className = "rc-live"; live.style.display = "none";
    [play, stop, tl].forEach(function (x) { live.appendChild(x); });
    if (opts.syllables) {          // Show syllables (always), Hear syllables and Macrobeat emphasis (with the chant)
      showSylBox(bar, { onchange: opts.onShowSyllables });
      syllablesBox(live, { label: "Hear syllables" });
      // Sound: the voice or a woodblock (remembered per scope)
      var sl0 = d.createElement("label"), sel = d.createElement("select");
      sl0.style.cssText = "display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap"; sel.className = "rc-sound";
      [["voice", "Voice"], ["woodblock", "Woodblock"]].forEach(function (o) { var op = d.createElement("option"); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
      sel.value = soundValue();
      sel.addEventListener("change", function () { try { global.localStorage.setItem("rc-sound:" + scopeName, sel.value); } catch (e) {} });
      sl0.appendChild(d.createTextNode("Sound")); sl0.appendChild(sel); live.appendChild(sl0);
      // the sliders, folded away behind "Settings" (open or shut remembered per scope)
      var more = d.createElement("button"), panel = d.createElement("span");
      more.type = "button"; more.className = "rc-more" + (opts.btnClass ? " " + opts.btnClass : ""); more.setAttribute("aria-expanded", "false");
      panel.className = "rc-sliders"; panel.style.cssText = "display:none;flex-wrap:wrap;align-items:center;gap:.5rem;flex-basis:100%";
      function showPanel(open) { panel.style.display = open ? "flex" : "none"; more.textContent = open ? "Settings \u25be" : "Settings \u25b8"; more.setAttribute("aria-expanded", open ? "true" : "false"); }
      var openNow = false; try { openNow = global.localStorage.getItem("rc-sliders-open:" + scopeName) === "1"; } catch (e) {}
      showPanel(openNow);
      more.addEventListener("click", function () { openNow = !openNow; showPanel(openNow); try { global.localStorage.setItem("rc-sliders-open:" + scopeName, openNow ? "1" : "0"); } catch (e) {} });
      live.appendChild(more); live.appendChild(panel);
      SLIDERS.forEach(function (sl) {
        var el = d.createElement("label"), rg = d.createElement("input"), out = d.createElement("span");
        el.style.cssText = "display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap"; el.title = sl.title;
        rg.type = "range"; rg.min = sl.min; rg.max = sl.max; rg.step = sl.step; rg.className = sl.cls; rg.value = sl.toUi(setting(sl.key)); rg.style.width = "7rem";
        out.textContent = sl.show(+rg.value); out.style.minWidth = "3.2rem";
        rg.addEventListener("input", function () { out.textContent = sl.show(+rg.value); try { global.localStorage.setItem("rc-" + sl.key + ":" + scopeName, String(sl.fromUi(+rg.value))); } catch (e) {} });
        el.appendChild(d.createTextNode(sl.label)); el.appendChild(rg); el.appendChild(out); panel.appendChild(el);
        sl.el = rg; sl.out = out;
      });
      var rs = d.createElement("button"); rs.type = "button"; rs.className = "rc-reset" + (opts.btnClass ? " " + opts.btnClass : ""); rs.textContent = "Reset sliders";
      rs.title = "Put every slider back to its default.";
      rs.addEventListener("click", function () { SLIDERS.forEach(function (sl) { try { global.localStorage.removeItem("rc-" + sl.key + ":" + scopeName); } catch (e) {} if (sl.el) { sl.el.value = sl.toUi(sl.def); sl.out.textContent = sl.show(+sl.el.value); } }); });
      panel.appendChild(rs);
    }
    bar.appendChild(live); parent.appendChild(bar);
    function sync() {
      live.style.display = on ? "inline-flex" : "none"; live.style.gap = ".5rem"; live.style.alignItems = "center";
      (opts.hide || []).forEach(function (e) { if (e) e.style.display = on ? "none" : ""; });
      if (!on && h) { h.stop(); h = null; }
    }
    play.addEventListener("click", function () {
      if (h) h.stop();
      h = play_(opts.getAbc(), { macroBpm: +tempo.value || 90, emphasis: emphasisValue(), sound: opts.syllables ? soundValue() : "voice", lengthRatio: setting("len"), vowelMacro: setting("vmac"), vowelWeak: setting("vweak"), endLength: setting("endlen"), pitchVar: setting("pvar"),
        arcHeight: setting("arch"), arcPeak: setting("arcpk") < 0 ? null : setting("arcpk"), arcEnd: setting("arcend") < -600 ? null : setting("arcend"), dynamics: setting("dyn"), question: setting("quest"), consonant: setting("cons"), taLevel: setting("ta"), syllables: opts.syllables && sylOn ? "rhythm" : null, onEnd: function () { h = null; } });
    });
    stop.addEventListener("click", function () { if (h) h.stop(); h = null; });
    sync();
    return { label: cbLab, sync: sync, play: play, stop: stop, tempo: tempo };
  }
  var play_ = function (abc, o) { return api.play(abc, o); };   // through the api object, so a page or test can wrap RhythmChant.play

  function stop() { if (current) { try { current.stop(); } catch (e) {} current = null; } }
  var api = { HIDDEN: HIDDEN, plan: plan, beats: beats, syllables: syllables, withSyllables: withSyllables, showSyllablesOn: showSyllablesOn, emphasis: emphasisValue, play: play, stop: stop, schedule: schedule, enabled: enabled, setEnabled: setEnabled, scope: scope, checkbox: checkbox, syllablesBox: syllablesBox, syllablesOn: syllablesOn, mountBar: mountBar, RULES: RULES, fixAbc: fixAbc, render: render, SYL: SYL, VOWELS: VOWELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.RhythmChant = api;
})(typeof window !== "undefined" ? window : globalThis);
