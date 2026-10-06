// apps/lsa/response-types.js
//
// For Verbal Association / Partial Synthesis criteria whose instruction asks the
// student to NAME something (tonality or meter) rather than just echo/chant a
// pattern, derive the multiple-choice answer set + correct answer directly from
// the criterion's own ABC data (K: for tonal mode, M: for rhythm meter) instead
// of hand-authoring a table. Criteria this can't confidently answer (see below)
// return null so the caller falls back to the existing free-response Success /
// Not-yet flow, unchanged.
//
// Deliberately NOT covered here (falls back to free response):
//   - "...and the functions of the patterns" -- naming tonic/dominant/subdominant
//     (tonal) or macrobeat/microbeat/division/elongation (rhythm) isn't derivable
//     from the stored data (no per-pattern function tagging exists), so this module
//     only answers the tonality/meter half of those instructions. The teacher's
//     own Success/Not-yet click still covers the whole task.
//   - "multitonal, multikeyal, or both" (PS) -- the actual answer was never kept
//     as structured data (only descriptive text in the Book 2 transcription notes).
//   - "...of each series" (PS naming two sub-patterns per criterion) -- these
//     criteria need two independent answers, which the current single-tune-per-
//     criterion data model can't distinguish.
//   - Rhythm "Multimetric" criteria -- every tune in these families was transcribed
//     with a single, unchanging M: header (the mid-pattern meter change itself was
//     never captured), so deriving "Multimetric" from M: would be actively wrong.

(function (global) {
  'use strict';

  const TONAL_CHOICES = ['Major', 'Minor', 'Dorian', 'Mixolydian'];
  const RHYTHM_CHOICES = ['Usual Duple', 'Usual Triple', 'Usual Combined', 'Unusual Paired', 'Unusual Unpaired', 'Multimetric'];

  function modeFromKey(keyStr) {
    if (!keyStr) return null;
    const s = keyStr.trim();
    if (/mix\b/i.test(s)) return 'Mixolydian';
    if (/dor\b/i.test(s)) return 'Dorian';
    if (/m$/.test(s)) return 'Minor';
    return 'Major';
  }

  // Usual meters group macrobeats only in 2s or 3s; unusual meters mix group
  // sizes within one measure. "Combined" (usual meter with cross-grouped
  // triplet divisions) is only detected when a tuplet marker is present.
  const USUAL_DUPLE = { '2/4': 1, '4/4': 1, '2/2': 1 };
  const USUAL_TRIPLE = { '3/4': 1, '6/8': 1, '9/8': 1, '12/8': 1 };
  const UNUSUAL_PAIRED = { '5/8': 1 };
  const UNUSUAL_UNPAIRED = { '7/8': 1 };

  function meterFromAbc(abcSource) {
    if (!abcSource) return null;
    const sigs = {};
    const re = /(^|\n)\s*M:\s*([\d/]+)/g;
    let m;
    while ((m = re.exec(abcSource))) sigs[m[2]] = true;
    const uniq = Object.keys(sigs);
    if (uniq.length !== 1) return null; // no meter, or genuinely mixed -- not confidently classifiable
    const sig = uniq[0];
    const hasTuplet = /\(\d/.test(abcSource);
    if (USUAL_DUPLE[sig] || USUAL_TRIPLE[sig]) {
      return hasTuplet ? 'Usual Combined' : (USUAL_DUPLE[sig] ? 'Usual Duple' : 'Usual Triple');
    }
    if (UNUSUAL_PAIRED[sig]) return 'Unusual Paired';
    if (UNUSUAL_UNPAIRED[sig]) return 'Unusual Unpaired';
    return null; // unrecognized time signature -- don't guess
  }

  function firstKey(abcSource) {
    const m = /(^|\n)\s*K:\s*([^\n]+)/.exec(abcSource || '');
    return m ? m[2].trim() : null;
  }

  // instruction: the LSA_INSTRUCTIONS[criterion.familyKey] text, passed in by the
  // caller (this module doesn't assume instructions.js is loaded).
  function getResponseChoice(criterion, instruction) {
    if (!criterion || !instruction) return null;
    const text = instruction.toLowerCase();
    if (text.indexOf('of each series') !== -1) return null;
    if (text.indexOf('multitonal') !== -1 || text.indexOf('multikeyal') !== -1) return null;

    if (criterion.register === 'tonal' && text.indexOf('name the tonality') !== -1) {
      const src = typeof patternObject !== 'undefined' ? patternObject : global.patternObject;
      const abc = src && src[criterion.familyKey];
      const mode = modeFromKey(firstKey(abc));
      if (!mode) return null;
      return { label: 'Tonality', choices: TONAL_CHOICES, correct: mode };
    }

    if (criterion.register === 'rhythm' && text.indexOf('name the meter') !== -1) {
      const src = typeof rhythmPatternObject !== 'undefined' ? rhythmPatternObject : global.rhythmPatternObject;
      const abc = src && src[criterion.familyKey];
      const meter = meterFromAbc(abc);
      if (!meter || meter === 'Multimetric') return null; // never a confident derivation, see header note
      return { label: 'Meter', choices: RHYTHM_CHOICES, correct: meter };
    }

    return null;
  }

  global.LSA_RESPONSE_TYPES = {
    modeFromKey: modeFromKey,
    meterFromAbc: meterFromAbc,
    getResponseChoice: getResponseChoice,
  };
})(window);
