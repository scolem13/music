// apps/lsa/curriculum.js
//
// Builds the LSA criterion catalog from the site's existing tonal and rhythm
// pattern libraries (apps/patterns/pattern-object.js, apps/rhythms/rhythm-pattern-object.js)
// instead of inventing placeholder content. Family keys of the form
// "<t|r><book>-<unit><section><criterion>" (e.g. "t1-3B2", "r2-24A1") already encode
// Register Book / Unit / Section / Criterion — that's exactly the structure Gordon's
// Learning Sequence Activities register books use (see LSA-Instructions.pdf, "Using
// the Seating/Evaluation Chart"). Other keys in those files (general practice
// collections like "major-stepwise" or "Duple-M-m-2-4") aren't tied to a specific
// criterion and are left out of this catalog.
//
// Each family's internal ABC tunes (X:1, X:2, ...) are split into thirds standing in
// for the Easy / Moderately Difficult / Difficult pattern tiers the register books
// describe. The source data doesn't expose the original authored tier boundaries, so
// this is a reasonable approximation, not a transcription. Families with exactly one
// pattern (no tiering) map straight onto the book's own "no difficulty levels" units
// (e.g. r1-6A1, r1-19A1 — see LSA-Instructions.pdf p.17, "Exceptions").

(function (global) {
  'use strict';

  const KEY_RE = /^([tr])(\d+)-(\d+)([A-Z])(\d+)$/;
  const LEVELS = ['E', 'M', 'D'];
  const LEVEL_NAMES = { E: 'Easy', M: 'Moderately difficult', D: 'Difficult' };

  function countPatterns(abcSource) {
    const m = typeof abcSource === 'string' ? abcSource.match(/(^|\n)\s*X:\s*\d+/g) : null;
    return m ? m.length : 0;
  }

  // Tonal key display, e.g. "D maj", "B♭ min" — derived from the family's own K:
  // field (already verified against the source register book — see the "in D major"
  // etc. phrasing baked into instructions.js). Only maj/min/mix/dor are ever used in
  // this curriculum; an unrecognized mode suffix returns null rather than guessing.
  const KEY_MODE_MAP = {
    '': 'maj', maj: 'maj', major: 'maj', ion: 'maj', ionian: 'maj',
    m: 'min', min: 'min', minor: 'min',
    mix: 'mix', mixolydian: 'mix',
    dor: 'dor', dorian: 'dor',
  };
  function firstKeyField(abcSource) {
    const m = /(^|\n)\s*K:\s*([^\n]+)/.exec(typeof abcSource === 'string' ? abcSource : '');
    return m ? m[2].trim() : null;
  }
  function displayKey(rawKey) {
    if (!rawKey) return null;
    const m = /^([A-Ga-g])([#b]?)\s*([A-Za-z]*)/.exec(rawKey);
    if (!m) return null;
    const letter = m[1].toUpperCase();
    const accSymbol = m[2] === '#' ? '♯' : m[2] === 'b' ? '♭' : '';
    const mode = KEY_MODE_MAP[m[3].toLowerCase()];
    if (!mode) return null;
    return letter + accSymbol + ' ' + mode;
  }

  function splitLevels(n) {
    if (n <= 0) return { E: 0, M: 0, D: 0 };
    if (n === 1) return { E: 1, M: 0, D: 0 };
    if (n === 2) return { E: 1, M: 1, D: 0 };
    const e = Math.ceil(n / 3);
    const rem = n - e;
    const m = Math.ceil(rem / 2);
    const d = rem - m;
    return { E: e, M: m, D: d };
  }

  function buildFromObject(obj, register) {
    const out = [];
    if (!obj) return out;
    for (const key in obj) {
      const m = KEY_RE.exec(key);
      if (!m) continue;
      const book = parseInt(m[2], 10);
      const unit = parseInt(m[3], 10);
      const section = m[4];
      const criterionNum = parseInt(m[5], 10);
      const total = countPatterns(obj[key]);
      if (total <= 0) continue;
      const levels = splitLevels(total);
      // Skill level (A/O, VA, PS, ...) applies to a whole unit, not per-criterion,
      // in Gordon's LSA design -- looked up from the shared TOC data (toc.js) if
      // it's loaded; left null if toc.js isn't on the page (e.g. an older page
      // that hasn't been updated yet), same undefined-global guard as patternObj below.
      const toc = typeof LSA_TOC_FOR === 'function' ? LSA_TOC_FOR(register, book, unit) : null;
      const tonalKey = register === 'tonal' ? displayKey(firstKeyField(obj[key])) : null;
      out.push({
        id: key,
        register: register,               // 'tonal' | 'rhythm'
        registerLabel: register === 'tonal' ? 'Tonal' : 'Rhythm',
        book: book,
        unit: unit,
        section: section,
        criterion: criterionNum,
        familyKey: key,
        patternCount: total,
        levels: levels,
        // 0-based index of the first tune (X:1, X:2, ...) belonging to each tier,
        // in tune-book order — lets notation.js pick a representative pattern to render.
        levelStart: { E: 0, M: levels.E, D: levels.E + levels.M },
        skill: toc ? toc.skill : null,             // short code, e.g. "VA"
        skillLabel: toc ? toc.skillLabel : null,    // full name, e.g. "Verbal Association"
        content: toc ? toc.content : null,          // content/context text from LSA-TOC.pdf
        key: tonalKey,                              // e.g. "D maj", "B♭ min" — null for rhythm
        label: (register === 'tonal' ? 'Tonal' : 'Rhythm') + ' Bk' + book +
               ' · Unit ' + unit + ' · §' + section + ' · Criterion ' + criterionNum,
        shortLabel: 'U' + unit + section + criterionNum,
      });
    }
    return out;
  }

  function compareCriteria(a, b) {
    return a.register.localeCompare(b.register) ||
      a.book - b.book ||
      a.unit - b.unit ||
      a.section.localeCompare(b.section) ||
      a.criterion - b.criterion;
  }

  // pattern-object.js / rhythm-pattern-object.js declare their objects with `const`,
  // which — loaded via a plain <script src> — never becomes a `window` property, even
  // though the bare identifier is visible to later same-document scripts. Read them
  // that way instead of via `global.patternObject` (which is always undefined).
  const patternObj = typeof patternObject !== 'undefined' ? patternObject : global.patternObject;
  const rhythmObj = typeof rhythmPatternObject !== 'undefined' ? rhythmPatternObject : global.rhythmPatternObject;
  const tonal = buildFromObject(patternObj, 'tonal');
  const rhythm = buildFromObject(rhythmObj, 'rhythm');
  const LSA_CRITERIA = tonal.concat(rhythm).sort(compareCriteria);
  const LSA_CRITERIA_BY_ID = {};
  LSA_CRITERIA.forEach(function (c) { LSA_CRITERIA_BY_ID[c.id] = c; });

  global.LSA_CRITERIA = LSA_CRITERIA;
  global.LSA_CRITERIA_BY_ID = LSA_CRITERIA_BY_ID;
  global.LSA_LEVELS = LEVELS;
  global.LSA_LEVEL_NAMES = LEVEL_NAMES;
})(window);
