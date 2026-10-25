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
// THE RULES. Source = a book; JUDGEMENT = Sean's / the builder's musical decision, not in the books. Cited in works-cited.py (Gordon 2012, Mullen).
//  Which notes: position in the macrobeat (crusis = on a macrobeat; weak = anywhere else), length in microbeats, what comes next.
//  R0  Inflect, don't pitch. Patterns are chanted on no particular pitch, with inflection and expression "as if used in conversation";
//      all durations in a rhythm pattern without pitch.  [Gordon 2012 p.100; Gordon, Reference Handbook for LSAs, "Techniques for
//      Teaching Class Patterns" and "A Quick Course on Rhythm"; Mullen, Any Music Teacher Can Do MLT p.84]
//  R1  Macrobeats are stressed, not accented: a note on a macrobeat gets a light, level onset (no first-beat bump).  [Gordon 2012 p.188
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
  var Core = global.AbcCore || (typeof require === "function" ? safeRequire("./abc-core.js") : null);
  var Events = global.AbcEvents || (typeof require === "function" ? safeRequire("./abc-events.js") : null);
  function safeRequire(p) { try { return require(p); } catch (e) { return null; } }

  var RULES = {
    // levels 0..1 (peak gain before the master)
    peakCrusis: 0.60, peakFirst: 0.64, peakWeak: 0.66, peakAfterSwell: 0.52,
    peakAnacrusisLo: 0.68, peakAnacrusisHi: 0.84,          // R3: first note of a run .. the anacrusis itself
    swellPeak: 0.88, swellPeakGentle: 0.74,                 // R5a, R5b: the level the swell reaches at the next onset
    swellStart: 0.55, swellDip: 0.42,                       // swell: onset at swellStart*peak, dips to swellDip*peak, then rises
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
    contourRise: 150, contourFall: -200, anacrusisLift: 40, crusisDip: -20, decayDrift: -40, swellDrift: 60
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
  function macroOf(meter, o) {
    var triple = o && o.triple != null ? !!o.triple : (meter.d === 8 && meter.n % 3 === 0);
    var q = o && o.macroQuarters ? o.macroQuarters : (triple ? 3 : 1) * 4 / meter.d;
    return { triple: triple, macroQ: q, microQ: q / (triple ? 3 : 2) };
  }

  // The syllable of each sounding note: opts.syllables "rhythm" -> Gordon/Froseth Du De Da Di Ta from Audiation.rhythmSyllables (apps/patterns/audiation.js,
  // or opts.syllableFn); an array of syllables; anything else -> the neutral "Bah". null when they cannot be had or do not match the notes.
  function syllablesFor(abc, notes, opts) {
    var want = opts.syllables, list = null;
    if (Array.isArray(want)) list = want;
    else if (want === "rhythm") {
      var fn = opts.syllableFn || (global.Audiation && global.Audiation.rhythmSyllables);
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
    function posOf(tq) { var f = (((tq % macroQ) + macroQ) % macroQ) / macroQ; return (f < 1e-6 || f > 1 - 1e-6) ? 0 : f; }
    var notes = S.map(function (e, i) {
      var tq = e.t_on, dq = e.t_off - e.t_on, nx = S[i + 1];
      var crusis = posOf(tq) === 0;
      var gapAfter = nx ? nx.t_on - e.t_off : Infinity;       // quarters of rest after this note (Infinity = end)
      var next = !nx || gapAfter > eps ? "rest" : (posOf(nx.t_on) === 0 ? "crusis" : "weak");
      if (!nx) next = "end";
      return { tQ: tq, durQ: dq, t: tq * spq, dur: dq * spq, role: crusis ? "crusis" : "weak", next: next,
               held: dq > microQ * R.microTol, longer: dq > macroQ * R.macroTol };
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
    function contour(tq) {
      if (tq <= anchor) { var x = anchor > 0 ? tq / anchor : 1; return riseAmp * Math.sin(x * Math.PI / 2); }
      var y = Math.min(1, (tq - anchor) / Math.max(total - anchor, 0.001));
      return riseAmp + (fallEnd - riseAmp) * (1 - Math.cos(y * Math.PI / 2));
    }
    // VARIETY (JUDGEMENT; the user: "a little different every time"). Everything below stays inside bounds that cannot undo a rule: a swell is still
    // a swell, a short note still decays, an anacrusis is still louder than the macrobeat it leads to, onsets move a few ms at most.
    var sylList = syllablesFor(abc0, notes, opts);
    var riseAmp = R.contourRise * (1 + vary * rnd(-0.4, 0.4));
    var question = vary && rng() < 0.25;                                                  // sometimes the phrase ends up, as a question does
    var fallEnd = question ? rnd(40, 140) : R.contourFall * (1 + vary * rnd(-0.35, 0.3));
    var cands = notes.filter(function (n) { return n.anacrusis; });
    if (vary && cands.length > 1 && rng() < 0.3) { var pick = cands[Math.floor(rng() * (cands.length - 1))]; anchor = pick.tQ; }
    else if (vary && !cands.length) anchor = anchor * (1 + rnd(-0.12, 0.12));
    var voiceName = opts.voice || "low", VOICES = { low: { f0: 118, scale: 1 }, high: { f0: 205, scale: 1.16 } };
    var vc = VOICES[voiceName] || VOICES.low;
    var voice = { name: voiceName, f0: opts.f0 || vc.f0, scale: opts.formantScale || vc.scale, vowels: opts.vowels || null, cents: Math.round(vary * Math.max(-150, Math.min(150, gauss(rng) * 60))) };
    var vowelScale = 1 + vary * rnd(-0.025, 0.025), humanize = opts.jitterMs != null ? opts.jitterMs : 3;
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
      if (n.role === "weak" && n.run && n.run.leads) {
        var f = n.run.length > 1 ? n.run.index / (n.run.length - 1) : 1;
        peak = R.peakAnacrusisLo + (R.peakAnacrusisHi - R.peakAnacrusisLo) * f; n.rule += "+R3";
      } else if (n.role === "weak") peak = R.peakWeak;
      else peak = idx === 0 ? R.peakFirst : R.peakCrusis;
      if (n.role === "crusis" && prev && prev.shape === "swell") { peak = R.peakAfterSwell; n.rule += "+R2"; }
      n.peak = peak * (1 + vary * rnd(-0.03, 0.03));
      // envelope
      var dur = n.dur;
      n.attack = Math.min(R.attack, dur * 0.25);
      n.startLevel = n.peak; n.endLevel = 0.0001; n.hold = 0; n.release = 0.02;
      if (n.shape === "decay") {
        var tailKind = n.tail || "short";
        n.decay = tailKind === "short" ? Math.min(Math.max(R.shortDecay, dur * 0.3), R.shortDecayMax, dur * 0.95)
                : tailKind === "medium" ? Math.min(dur * R.mediumDecayShare, R.mediumDecayMax)
                : Math.min(dur * R.spaceDecayShare, R.spaceDecayMax);
        n.decay = Math.max(0.03, Math.min(n.decay * (1 + vary * rnd(-0.15, 0.2)), dur));
      } else if (n.shape === "sustain") {
        n.decay = Math.min(0.12, dur * 0.3); n.hold = n.peak * R.sustainLevel; n.release = 0.06;
      } else { // swell: onset, small dip, then the crescendo to the next onset
        var top = n.drive === "gentle" ? R.swellPeakGentle : R.swellPeak;
        n.startLevel = n.peak * R.swellStart; n.dip = n.peak * R.swellDip; n.endLevel = top;
        n.decay = Math.min(dur * 0.25, 0.15); n.release = Math.min(R.swellRelease, dur * 0.1);
      }
      // pitch (cents) and brightness (formant scale) across the note
      var role = n.anacrusis ? R.anacrusisLift : (n.role === "crusis" ? R.crusisDip : 0);
      n.cents0 = Math.round(contour(n.tQ) + role);
      n.cents1 = Math.round(contour(n.tQ + n.durQ) + role + (n.shape === "decay" ? R.decayDrift : n.shape === "swell" ? R.swellDrift : 0));
      n.bright0 = n.shape === "swell" ? 0.85 : 1; n.bright1 = n.shape === "swell" ? 1.25 : n.shape === "decay" ? 0.8 : 1;
      n.syl = sylList ? sylList[idx] : "Bah";
      n.vow = vowelScale * (1 + vary * rnd(-0.02, 0.02));
      n.drift = vary * rnd(-25, 25);
      n.jit = humanize && !(idx === 0 && n.tQ === 0) ? rnd(-humanize, humanize) / 1000 : (humanize ? rnd(0, humanize) / 1000 : 0);
      prev = n;
    });
    return { seed: seed, voice: voice, syllables: !!sylList, notes: notes, total: total * spq, totalQ: total, macroQ: macroQ, microQ: microQ, triple: mm.triple,
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
  var VOWELS = { u: [300, 750, 2250], e: [400, 2100, 2700], a: [760, 1080, 2500], i: [280, 2250, 2950] };
  var LOCUS = { b: [220, 800, 2100], d: [250, 1800, 2900], t: [250, 1800, 2900] };
  var CONS = { b: { burst: 0.006, vot: 0.004, bf: 900, bw: 1400, bg: 0.22, asp: 0 },
               d: { burst: 0.008, vot: 0.010, bf: 3800, bw: 2200, bg: 0.55, asp: 0 },
               t: { burst: 0.012, vot: 0.045, bf: 4200, bw: 2600, bg: 0.7, asp: 0.8 } };
  var SYL = { Du: { c: "d", v: "u" }, De: { c: "d", v: "e" }, Da: { c: "d", v: "a" }, Di: { c: "d", v: "i" }, Ta: { c: "t", v: "a" }, Bah: { c: "b", v: "a" } };
  var BW = [65, 90, 125, 180, 300];
  // loudness equalisation: multiplier that gives each vowel the same RMS (0.2 at a sustained peak of 0.8), measured by rendering it (see tests/rhythm/rhythm-chant.test.js)
  var VG = { low: { u: 0.290, e: 0.366, a: 0.190, i: 0.369 }, high: { u: 0.163, e: 0.238, a: 0.100, i: 0.290 } };
  function mulberry(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function res(f, bw, sr) { var r = Math.exp(-Math.PI * bw / sr), C = -r * r, B = 2 * r * Math.cos(2 * Math.PI * f / sr); return [1 - B - C, B, C]; }

  // gain (0..1.2) of note n at t seconds after its onset, from its plan fields
  function gainAt(n, t) {
    var dur = n.dur, a = n.attack, p = n.peak;
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
    p.notes.forEach(function (n) { renderNote(out, sr, n, v, scale, rng); });
    return out;
  }
  function renderNote(out, sr, n, v, scale, rng) {
    var sy = SYL[n.syl] || SYL.Bah, cs = CONS[sy.c], tg = (v.vowels || VOWELS)[sy.v], lc = LOCUS[sy.c];
    var i0 = Math.max(0, Math.round((n.t + (n.jit || 0)) * sr)), nd = n.dur - (n.jit || 0);
    var N = Math.min(out.length - i0, Math.round((nd + 0.06) * sr));
    var vs = n.vow || 1, f0c = v.f0 * Math.pow(2, (v.cents + (n.drift || 0)) / 1200);
    var z = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], co = [], F = [0, 0, 0, 0, 0], k;
    var phase = rng(), f0 = f0c, amp = 1, per = 1 / f0c, gprev = 0, jit = 0;
    var bz = [0, 0], bco = res(cs.bf, cs.bw, sr), aspz = 0;
    var vot = cs.vot, burstN = Math.round(cs.burst * sr), tau = 0.018, hump = sy.v === "e" ? 1 : 0;
    var seg = 16;
    for (var s = 0; s < N; s++) {
      var t = s / sr;
      if (s % seg === 0) {                                     // formant targets for this stretch
        var m = Math.exp(-Math.max(0, t - 0.0) / tau), gl = hump ? Math.min(1, t / 0.14) : 0;
        for (k = 0; k < 4; k++) {
          var tv = k < 3 ? tg[k] : 3500;
          if (hump) { if (k === 0) tv = tg[0] * (1 - 0.12 * gl); else if (k === 1) tv = tg[1] * (1 + 0.08 * gl); }
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
        var u = Math.min(1, t / Math.max(n.dur, 0.05)), cents = n.cents0 + (n.cents1 - n.cents0) * u;
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
        asp += (rng() * 2 - 1) * 0.35 * ae * Math.min(1, g * 2 + 0.3);
      }
      // the breathy tail: the last 40 ms of a decaying/ending note
      var tailT = nd - t; if (tailT < 0.04 && tailT > 0 && n.shape !== "swell") asp += (rng() * 2 - 1) * 0.05 * (tailT / 0.04) * Math.min(1, n.peak * 2);
      var x = (voiced + asp) * Math.max(g, t < vot + 0.03 ? 0.25 * n.peak : 0) * VG[v.name === 'high' ? 'high' : 'low'][sy.v];
      for (k = 0; k < 5; k++) { var c = co[k], y = c[0] * x + c[1] * z[k][0] + c[2] * z[k][1]; z[k][1] = z[k][0]; z[k][0] = y; x = y; }
      var o = x;
      if (s < burstN * 4) {                                     // the burst
        var be = Math.exp(-s / (burstN * 0.8)), nz = (rng() * 2 - 1) * be * cs.bg * Math.pow(n.peak, 0.6) * 1.1;
        var yb = bco[0] * nz + bco[1] * bz[0] + bco[2] * bz[1]; bz[1] = bz[0]; bz[0] = yb; o += yb * 0.5;
      }
      out[i0 + s] += o;
    }
  }

  function schedule(ctx, p, when, opts) {
    opts = opts || {};
    var data = render(p, ctx.sampleRate), buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
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
  function enabled() { return on; }
  function setEnabled(v) {
    on = !!v; try { global.localStorage.setItem("rc-conv:" + scopeName, on ? "1" : "0"); } catch (e) {}
    boxes.forEach(function (b) { b.checked = on; });
  }
  load();
  // a "Conversational" checkbox. opts: onchange(bool), after (an element to put it after) else appended to parent, label, title. Returns the label.
  function checkbox(parent, opts) {
    opts = opts || {};
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
  function syllablesOn() { return sylOn; }
  function syllablesBox(parent, opts) {
    opts = opts || {};
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
    bar.appendChild(live); parent.appendChild(bar);
    function sync() {
      live.style.display = on ? "inline-flex" : "none"; live.style.gap = ".5rem"; live.style.alignItems = "center";
      (opts.hide || []).forEach(function (e) { if (e) e.style.display = on ? "none" : ""; });
      if (!on && h) { h.stop(); h = null; }
    }
    play.addEventListener("click", function () {
      if (h) h.stop();
      h = play_(opts.getAbc(), { macroBpm: +tempo.value || 90, onEnd: function () { h = null; } });
    });
    stop.addEventListener("click", function () { if (h) h.stop(); h = null; });
    sync();
    return { label: cbLab, sync: sync, play: play, stop: stop, tempo: tempo };
  }
  var play_ = function (abc, o) { return api.play(abc, o); };   // through the api object, so a page or test can wrap RhythmChant.play

  function stop() { if (current) { try { current.stop(); } catch (e) {} current = null; } }
  var api = { plan: plan, play: play, stop: stop, schedule: schedule, enabled: enabled, setEnabled: setEnabled, scope: scope, checkbox: checkbox, syllablesBox: syllablesBox, syllablesOn: syllablesOn, mountBar: mountBar, RULES: RULES, fixAbc: fixAbc, render: render, SYL: SYL, VOWELS: VOWELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.RhythmChant = api;
})(typeof window !== "undefined" ? window : globalThis);
