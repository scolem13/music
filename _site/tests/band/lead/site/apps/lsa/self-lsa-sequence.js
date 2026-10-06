// apps/lsa/self-lsa-sequence.js — shared engine for the LSA Practice pages
// (plain-cue and notated variants both use this).
//
// RA_SEQUENCE (built by buildSelfLsaSequence) holds only the individual (graded)
// patterns, in order -- one per level (Easy/Moderate/Difficult) per configured
// unit -- and is walked by apps/rhythm-assessment/app.js's normal
// patternSel/tuneBook/Continuous-mode machinery exactly like any other
// collection. Class patterns are NOT part of that collection: after every
// individual attempt (pass or fail), runLsaOutcome() plays 1-3 fresh random
// class patterns from the just-attempted item's paired collection (or, on a
// fail, just repeats the single most-recently-played class pattern), via
// app.js's playLsaInterlude(), then either advances to the next individual
// pattern (pass) or retries the same one (fail).
//
// Test scope: only these two criteria have a class-pattern collection wired up.
//
// Requires rhythms/rhythm-pattern-object.js, lsa/curriculum.js, and
// lsa/notation.js to already be loaded. runLsaOutcome() references
// apps/rhythm-assessment/app.js's top-level bindings (patternSel,
// isLastInCollection, advanceNext, endSession, runContinuousCycle) by bare
// identifier -- safe because it's only ever called later, from app.js's own
// RA_ON_GRADED callback, by which point app.js has already run.

(function (global) {
  'use strict';

  const UNITS = [
    { criterionId: 'r1-1A1', classCollection: 'Duple-M-m-2-4', isTriple: false },
    { criterionId: 'r1-1B1', classCollection: 'Triple-M-m-6/8', isTriple: true },
  ];
  const LEVELS = ['E', 'M', 'D'];

  function buildSelfLsaSequence() {
    const CRITERIA_BY_ID = global.LSA_CRITERIA_BY_ID || {};
    const NOTATION = global.LSA_NOTATION;
    const sequence = [];
    UNITS.forEach(function (unit) {
      const criterion = CRITERIA_BY_ID[unit.criterionId];
      if (!criterion) return;
      LEVELS.forEach(function (level) {
        const abc = NOTATION && NOTATION.tuneAbcForLevel(criterion, level);
        if (abc) sequence.push({ abc: abc, isTriple: unit.isTriple, classCollection: unit.classCollection });
      });
    });
    return sequence;
  }
  global.buildSelfLsaSequence = buildSelfLsaSequence;

  const classTuneCache = {}; // collectionKey -> array of tune ABC strings
  function classTunes(key) {
    if (classTuneCache[key]) return classTuneCache[key];
    const rhythmObj = typeof rhythmPatternObject !== 'undefined' ? rhythmPatternObject : global.rhythmPatternObject;
    const raw = rhythmObj && rhythmObj[key];
    const tunes = raw && typeof ABCJS !== 'undefined' ? new ABCJS.TuneBook(raw).tunes : [];
    classTuneCache[key] = tunes.map(function (t) { return t.abc; });
    return classTuneCache[key];
  }

  // Picks 1-3 tune ABCs at random, without repeats, from a class-pattern collection.
  function pickLsaClassAbcs(key) {
    const pool = classTunes(key).slice();
    const n = Math.min(pool.length, Math.floor(Math.random() * 3) + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, n);
  }
  global.pickLsaClassAbcs = pickLsaClassAbcs;

  let lastClassAbc = null; // {abc, isTriple} of the most recently played class pattern

  // Called from a page's RA_ON_GRADED(passed) hook. onClassStart is invoked right
  // as the interlude begins (for the page's own status-text update); onDone
  // fires once the whole outcome (interlude + advance/retry) is complete -- pages
  // don't need it today but it's there for symmetry/future use.
  function runLsaOutcome(seq, passed, onClassStart) {
    const idx = parseInt(patternSel.value, 10) || 0;
    const item = seq[idx];
    let items;
    if (passed) {
      items = pickLsaClassAbcs(item.classCollection).map(function (abc) {
        return { abc: abc, isTriple: item.isTriple };
      });
    } else {
      items = [lastClassAbc || { abc: pickLsaClassAbcs(item.classCollection)[0], isTriple: item.isTriple }];
    }
    lastClassAbc = items[items.length - 1];
    if (onClassStart) onClassStart();
    // Exactly LSA_SILENCE_MACROBEATS of silence between the end of the response
    // and whatever plays next, anchored to the precise (audio-clock) end of the
    // response window rather than to whenever this callback happened to fire.
    const startCtx = (window.RA_RESPONSE_END_CTX !== undefined ? window.RA_RESPONSE_END_CTX : audioCtx.currentTime)
      + (window.LSA_SILENCE_MACROBEATS || 2) * secPerMacrobeat();
    playLsaInterlude(items, function () {
      if (passed) {
        if (isLastInCollection()) { endSession('complete'); return; }
        advanceNext();
      }
      runContinuousCycle();
    }, startCtx);
  }
  global.runLsaOutcome = runLsaOutcome;
})(window);
