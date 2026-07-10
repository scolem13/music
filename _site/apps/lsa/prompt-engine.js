// apps/lsa/prompt-engine.js
//
// Pure functions over (db, students, criterion) — no DOM, no storage writes — so both
// the Evaluation Chart and the Data Analysis page compute progress the same way.
//
// Potential (LSA-Instructions.pdf, "Music Aptitudes and Expectations"):
//   low aptitude     -> Easy only
//   average aptitude -> Easy, Moderately difficult
//   high aptitude     -> Easy, Moderately difficult, Difficult
// A level only counts if the criterion actually has patterns at that tier.
//
// "Beyond potential": the one tier past a student's potential, offered occasionally
// once potential is met (never for high-aptitude students, who have no tier beyond
// Difficult). See LSA-Instructions.pdf p.15-16.

(function (global) {
  'use strict';

  const LEVELS = global.LSA_LEVELS || ['E', 'M', 'D'];
  const STORE = global.LSA_STORE;

  function potentialLevels(criterion, tier) {
    const maxIdx = tier === 'low' ? 1 : tier === 'average' ? 2 : 3;
    return LEVELS.slice(0, maxIdx).filter(function (l) { return criterion.levels[l] > 0; });
  }

  function beyondLevel(criterion, tier) {
    if (tier === 'high') return null;
    const potential = potentialLevels(criterion, tier);
    const next = LEVELS[potential.length];
    if (next && criterion.levels[next] > 0) return next;
    return null;
  }

  // Number of *failed* attempts recorded on a cell. Progression is strictly
  // sequential (teach until a success, then eval until a success), so once a cell
  // is `taught`/`achieved` no further teach/eval attempts get recorded against it —
  // meaning any attempts beyond the one that succeeded were failures.
  function failedAttempts(cell) {
    if (!cell) return 0;
    return (cell.teach - (cell.taught ? 1 : 0)) + (cell.evalN - (cell.achieved ? 1 : 0));
  }

  // Has this student had any "not yet" mark anywhere on this criterion? Used to gate
  // *starting* a beyond-potential pattern — see nextStep.
  function criterionHasAnyFailure(db, student, criterion) {
    return LEVELS.some(function (level) {
      if (criterion.levels[level] <= 0) return false;
      return failedAttempts(STORE.getCell(db, student.id, criterion.id, level)) > 0;
    });
  }

  // Next thing to give this student on this criterion, or null if nothing is due
  // (potential met, and either no level beyond it or that level is also achieved).
  function nextStep(db, student, criterion) {
    const tier = STORE.aptitudeTier(student.aptitude);
    const potential = potentialLevels(criterion, tier);
    for (let i = 0; i < potential.length; i++) {
      const level = potential[i];
      const c = STORE.getCell(db, student.id, criterion.id, level);
      if (!c || !c.achieved) {
        if (!c || !c.taught) return { level: level, mode: 'teach', beyond: false };
        return { level: level, mode: 'eval', beyond: false };
      }
    }
    const bLevel = beyondLevel(criterion, tier);
    if (bLevel) {
      const bc = STORE.getCell(db, student.id, criterion.id, bLevel);
      const started = !!(bc && bc.teach > 0);
      // Gate STARTING a beyond-potential pattern on a clean record so far on this
      // criterion — don't push a student who's already struggling. Once started
      // (a teach attempt exists), keep prompting it through to success regardless
      // of "not yet" marks, including on the beyond pattern itself.
      if (!started && criterionHasAnyFailure(db, student, criterion)) return null;
      if (!bc || !bc.achieved) {
        if (!bc || !bc.taught) return { level: bLevel, mode: 'teach', beyond: true };
        return { level: bLevel, mode: 'eval', beyond: true };
      }
    }
    return null;
  }

  function hasMetPotential(db, student, criterion) {
    const tier = STORE.aptitudeTier(student.aptitude);
    const potential = potentialLevels(criterion, tier);
    return potential.every(function (level) {
      const c = STORE.getCell(db, student.id, criterion.id, level);
      return !!(c && c.achieved);
    });
  }

  // % of students who have met their own potential on this criterion.
  function criterionStats(db, students, criterion) {
    let achieved = 0;
    let beyondAttempts = 0;
    students.forEach(function (student) {
      if (hasMetPotential(db, student, criterion)) achieved++;
      const rec = db.records[student.id] && db.records[student.id][criterion.id];
      if (rec) {
        LEVELS.forEach(function (level) {
          if (rec[level] && rec[level].beyond && rec[level].achieved) beyondAttempts++;
        });
      }
    });
    const total = students.length;
    return {
      achieved: achieved,
      total: total,
      pct: total ? Math.round((100 * achieved) / total) : 0,
      readyToAdvance: total ? achieved / total >= 0.8 : false, // PDF "Moving Ahead" rule
      beyondAttempts: beyondAttempts,
    };
  }

  // djb2 string hash, folded to a uint32 — the seed for everything below.
  function hash32(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  // Deterministic stand-in for Math.random(): a pure function of `key`, stable across
  // re-renders (so a "beyond" offer doesn't flicker in and out as the UI redraws), but
  // still varying per student/criterion pair.
  function stableChance(key, chance) {
    return (hash32(key) % 10000) / 10000 < chance;
  }

  // Seeded PRNG (mulberry32) — deterministic for a given seed, so the same (db, criterion)
  // state always reproduces the same draw (no flicker on an unrelated re-render), but a
  // real Math.random()-quality stream once seeded.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Weighted random draw without replacement: repeatedly pick from what's left,
  // probability proportional to weight, and remove the pick. Returns a full ordering.
  function weightedShuffle(items, rng) {
    const remaining = items.slice();
    const order = [];
    while (remaining.length) {
      const totalWeight = remaining.reduce(function (s, c) { return s + c.weight; }, 0);
      let r = rng() * totalWeight;
      let idx = remaining.length - 1;
      for (let i = 0; i < remaining.length; i++) {
        r -= remaining[i].weight;
        if (r <= 0) { idx = i; break; }
      }
      order.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
    return order;
  }

  // Ranked "who's next" queue for a criterion: a weighted-random draw, not a fixed
  // sort — calling on students in the same order every time is exactly what real
  // cold-calling must avoid (predictable = students tune out). Weight favors whoever
  // has had the least total time (the equal-time proxy) so the draw stays *approximately*
  // even while remaining genuinely unpredictable. The draw is seeded from the criterion
  // and everyone's current totals, so it's stable across re-renders of the same state
  // (no flicker from toggling a checkbox) but reshuffles the instant any attempt is
  // recorded anywhere. Beyond-potential steps are only surfaced for a fraction of
  // eligible (student, criterion) pairs — stably — so they read as occasional, not
  // constant, even though the step itself is always available on that student's own
  // card/seat once eligible.
  function rankCandidates(db, students, criterion, opts) {
    opts = opts || {};
    const beyondChance = opts.beyondChance == null ? 0.35 : opts.beyondChance;
    const weightPower = opts.weightPower == null ? 2 : opts.weightPower;
    const candidates = [];
    students.forEach(function (student) {
      const step = nextStep(db, student, criterion);
      if (!step) return;
      if (step.beyond && !stableChance(student.id + '|' + criterion.id, beyondChance)) return;
      const total = db.totals[student.id] || 0;
      candidates.push({
        student: student,
        step: step,
        total: total,
        last: db.lastGiven[student.id] || '',
        weight: 1 / Math.pow(total + 1, weightPower),
      });
    });
    const seed = hash32(criterion.id + '|' + JSON.stringify(db.totals));
    return weightedShuffle(candidates, mulberry32(seed));
  }

  // Top `count` candidates to cue at once (default 2 — see chart-app.js).
  function cueList(db, students, criterion, count, opts) {
    return rankCandidates(db, students, criterion, opts).slice(0, count == null ? 2 : count);
  }

  global.LSA_ENGINE = {
    potentialLevels: potentialLevels,
    beyondLevel: beyondLevel,
    nextStep: nextStep,
    hasMetPotential: hasMetPotential,
    criterionStats: criterionStats,
    rankCandidates: rankCandidates,
    cueList: cueList,
  };
})(window);
