// apps/lsa/notation.js — renders a representative pattern for a criterion/level using
// the same ABCJS tunebook already loaded for practice/patterns.qmd and practice/rhythms.qmd.
// Requires abcjs-basic.js, curriculum.js, and the pattern-object / rhythm-pattern-object
// scripts to already be on the page.

(function (global) {
  'use strict';

  const tuneBookCache = {};

  function familySource(criterion) {
    if (criterion.register === 'tonal') return typeof patternObject !== 'undefined' ? patternObject : undefined;
    return typeof rhythmPatternObject !== 'undefined' ? rhythmPatternObject : undefined;
  }

  function getTuneBook(criterion) {
    if (tuneBookCache[criterion.familyKey]) return tuneBookCache[criterion.familyKey];
    const src = familySource(criterion);
    const raw = src && src[criterion.familyKey];
    if (!raw || typeof ABCJS === 'undefined') return null;
    const book = new ABCJS.TuneBook(raw);
    tuneBookCache[criterion.familyKey] = book;
    return book;
  }

  // The first tune in a tier's index range stands in for that difficulty level.
  function tuneAbcForLevel(criterion, level) {
    if (!criterion || criterion.levels[level] <= 0) return null;
    const book = getTuneBook(criterion);
    if (!book) return null;
    const tune = book.tunes[criterion.levelStart[level]];
    return tune ? tune.abc : null;
  }

  // Renders into #<elId>, clearing it if there's nothing to show. Returns true if
  // something was rendered.
  function renderLevel(elId, criterion, level) {
    const el = document.getElementById(elId);
    if (!el) return false;
    const abc = tuneAbcForLevel(criterion, level);
    if (!abc || typeof ABCJS === 'undefined') { el.innerHTML = ''; return false; }
    try {
      ABCJS.renderAbc(elId, abc, { responsive: 'resize', selectTypes: false, staffwidth: 260 });
      return true;
    } catch (e) {
      el.innerHTML = '';
      return false;
    }
  }

  // The ABC key (e.g. "D", "Cm") of the criterion's first available pattern — good
  // enough to drive Tonality.setFromKey for the shared "establish tonality" button.
  function keyForCriterion(criterion) {
    if (!criterion) return null;
    const order = ['E', 'M', 'D'];
    for (let i = 0; i < order.length; i++) {
      const abc = tuneAbcForLevel(criterion, order[i]);
      if (!abc) continue;
      const m = /(^|\n)K:\s*([^\n]+)/.exec(abc);
      if (m) return m[2].trim();
    }
    return null;
  }

  global.LSA_NOTATION = { renderLevel: renderLevel, tuneAbcForLevel: tuneAbcForLevel, keyForCriterion: keyForCriterion };
})(window);
