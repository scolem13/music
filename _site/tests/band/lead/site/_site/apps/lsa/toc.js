// apps/lsa/toc.js
//
// Single source of truth for LSA unit metadata (skill level + content/context),
// transcribed from LSA-TOC.pdf. Keyed by register+book+unit (skill level applies
// to a whole unit, not per-criterion, in Gordon's LSA design). Consumed by
// curriculum.js (to attach skill/skillLabel to every criterion) and by
// teacher/lsa-directory.qmd (for its per-unit table rows) so the data only
// lives in one place.
//
// Skill-level short codes follow Gordon's Learning Sequence Activities taxonomy
// (see apps/lsa/LSA-Instructions.pdf): A/O Aural/Oral, VA Verbal Association,
// PS Partial Synthesis, SA-r/SA-w Symbolic Association-reading/writing,
// CS-r/CS-w Composite Synthesis-reading/writing, G-v/G-s
// Generalization-verbal/symbolic, C/I-v Creativity/Improvisation-verbal.

(function (global) {
  'use strict';

  const SKILL_CODES = {
    'Aural/Oral': 'A/O',
    'Verbal Association': 'VA',
    'Partial Synthesis': 'PS',
    'Symbolic Association-reading': 'SA-r',
    'Symbolic Association-writing': 'SA-w',
    'Composite Synthesis-reading': 'CS-r',
    'Composite Synthesis-writing': 'CS-w',
    'Generalization-verbal': 'G-v',
    'Generalization-symbolic': 'G-s',
    'Creativity/Improvisation-verbal': 'C/I-v',
  };

  const TONAL_1 = [
    [1,  'Aural/Oral', 'Tonic and Dominant/Major and Minor'],
    [2,  'Verbal Association', 'Tonic and Dominant/Major and Minor'],
    [3,  'Creativity/Improvisation-verbal', 'Tonic and Dominant/Major and Minor'],
    [4,  'Aural/Oral', 'Tonic and Dominant/Major and Minor'],
    [5,  'Verbal Association', 'Tonic and Dominant/Major and Minor'],
    [6,  'Partial Synthesis', 'Tonic and Dominant/Major and Minor'],
    [7,  'Aural/Oral', 'Tonic and Subdominant/Major and Minor'],
    [8,  'Verbal Association', 'Tonic and Subdominant/Major and Minor'],
    [9,  'Generalization-verbal', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [10, 'Aural/Oral', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [11, 'Verbal Association', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [12, 'Symbolic Association-reading', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [13, 'Symbolic Association-writing', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [14, 'Creativity/Improvisation-verbal', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [15, 'Aural/Oral', 'Tonic, Subtonic, Subdominant, and Dominant/Mixolydian and Dorian'],
    [16, 'Verbal Association', 'Tonic, Subtonic, Subdominant, and Dominant/Mixolydian and Dorian'],
    [17, 'Partial Synthesis', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [18, 'Generalization-symbolic', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [19, 'Composite Synthesis-reading', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [20, 'Partial Synthesis', 'Tonic, Subtonic, Subdominant, and Dominant/Mixolydian and Dorian'],
    [21, 'Symbolic Association-reading', 'Tonic, Subtonic, Subdominant, and Dominant/Mixolydian and Dorian'],
  ];
  const TONAL_2 = [
    [22, 'Generalization-verbal', 'Tonic, Subtonic, Subdominant, and Dominant/Mixolydian and Dorian'],
    [23, 'Symbolic Association-writing', 'Tonic, Subtonic, Subdominant, and Dominant/Mixolydian and Dorian'],
    [24, 'Creativity/Improvisation-verbal', 'Tonic, Subtonic, Subdominant, and Dominant/Mixolydian and Dorian'],
    [25, 'Aural/Oral', 'Multitonal/Multikeyal'],
    [26, 'Composite Synthesis-writing', 'Tonic, Dominant, and Subdominant/Major and Minor'],
    [27, 'Aural/Oral', 'All Functions/Major and Minor'],
    [28, 'Verbal Association', 'All Functions/Major and Minor'],
    [29, 'Creativity/Improvisation-verbal', 'All Functions/Major and Minor'],
    [30, 'Verbal Association', 'Multitonal/Multikeyal'],
    [31, 'Generalization-verbal', 'Multitonal/Multikeyal'],
    [32, 'Aural/Oral', 'All Functions/Major and Minor'],
    [33, 'Verbal Association', 'All Functions/Major and Minor'],
    [34, 'Partial Synthesis', 'All Functions/Major and Minor'],
    [35, 'Symbolic Association-reading', 'All Functions/Major and Minor'],
    [36, 'Generalization-verbal', 'All Functions/Major and Minor'],
    [37, 'Symbolic Association-writing', 'All Functions/Major and Minor'],
    [38, 'Composite Synthesis-reading', 'All Functions/Major and Minor'],
    [39, 'Generalization-symbolic', 'All Functions/Major and Minor'],
    [40, 'Partial Synthesis', 'Multitonal/Multikeyal'],
    [41, 'Composite Synthesis-writing', 'All Functions/Major and Minor'],
    [42, 'Creativity/Improvisation-verbal', 'Multitonal/Multikeyal'],
  ];
  const RHYTHM_1 = [
    [1,  'Aural/Oral', 'Macro/Microbeats/Usual Duple and Triple'],
    [2,  'Verbal Association', 'Macro/Microbeats/Usual Duple and Triple'],
    [3,  'Aural/Oral', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [4,  'Verbal Association', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [5,  'Generalization-verbal', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [6,  'Partial Synthesis', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [7,  'Creativity/Improvisation-verbal', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [8,  'Aural/Oral', 'All Functions/Usual Duple and Triple'],
    [9,  'Verbal Association', 'All Functions/Usual Duple and Triple'],
    [10, 'Symbolic Association-reading', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [11, 'Aural/Oral', 'All Functions/Usual Duple and Triple'],
    [12, 'Verbal Association', 'All Functions/Usual Duple and Triple'],
    [13, 'Symbolic Association-writing', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [14, 'Generalization-symbolic', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [15, 'Partial Synthesis', 'All Functions/Usual Duple and Triple'],
    [16, 'Aural/Oral', 'Macro/Microbeats and Divisions/Elongations/Usual Combined'],
    [17, 'Verbal Association', 'Macro/Microbeats and Divisions/Elongations/Usual Combined'],
    [18, 'Creativity/Improvisation-verbal', 'Macro/Microbeats and Divisions/Elongations/Usual Combined'],
    [19, 'Composite Synthesis-reading', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
  ];
  const RHYTHM_2 = [
    [20, 'Aural/Oral', 'Macro/Microbeats/Unusual Paired and Unpaired'],
    [21, 'Composite Synthesis-writing', 'Macro/Microbeats and Divisions/Elongations/Usual Duple and Triple'],
    [22, 'Verbal Association', 'Macro/Microbeats/Unusual Paired and Unpaired'],
    [23, 'Symbolic Association-reading', 'All Functions/Usual Duple and Triple'],
    [24, 'Creativity/Improvisation-verbal', 'All Functions/Usual Duple and Triple'],
    [25, 'Aural/Oral', 'Multimetric/Multitemporal'],
    [26, 'Aural/Oral', 'All Functions/Usual Combined'],
    [27, 'Verbal Association', 'All Functions/Usual Combined'],
    [28, 'Partial Synthesis', 'All Functions/Usual Combined'],
    [29, 'Generalization-verbal', 'All Functions/Usual Duple and Triple'],
    [30, 'Partial Synthesis', 'Macro/Microbeats/Unusual Paired and Unpaired'],
    [31, 'Symbolic Association-writing', 'All Functions/Usual Duple and Triple'],
    [32, 'Symbolic Association-reading', 'All Functions/Usual Combined'],
    [33, 'Symbolic Association-writing', 'All Functions/Usual Combined'],
    [34, 'Creativity/Improvisation-verbal', 'All Functions/Usual Combined'],
    [35, 'Symbolic Association-reading', 'Macro/Microbeats/Unusual Paired and Unpaired'],
    [36, 'Composite Synthesis-reading', 'All Functions/Usual Duple and Triple'],
    [37, 'Symbolic Association-writing', 'Macro/Microbeats/Unusual Paired and Unpaired'],
    [38, 'Composite Synthesis-writing', 'All Functions/Usual Duple and Triple'],
    [39, 'Verbal Association', 'Multimetric/Multitemporal'],
    [40, 'Generalization-verbal', 'All Functions/Usual Combined'],
    [41, 'Creativity/Improvisation-verbal', 'Multimetric/Multitemporal'],
    [42, 'Generalization-symbolic', 'All Functions/Usual Duple and Triple'],
  ];

  function buildIndex() {
    const out = {};
    function add(register, book, rows) {
      rows.forEach(function (row) {
        const unit = row[0], skillLabel = row[1], content = row[2];
        out[register + '|' + book + '|' + unit] = {
          skillLabel: skillLabel,
          skill: SKILL_CODES[skillLabel] || skillLabel,
          content: content,
        };
      });
    }
    add('tonal', 1, TONAL_1);
    add('tonal', 2, TONAL_2);
    add('rhythm', 1, RHYTHM_1);
    add('rhythm', 2, RHYTHM_2);
    return out;
  }

  const LSA_TOC_INDEX = buildIndex();

  function tocFor(register, book, unit) {
    return LSA_TOC_INDEX[register + '|' + book + '|' + unit] || null;
  }

  global.LSA_SKILL_CODES = SKILL_CODES;
  global.LSA_TOC = {
    TONAL_1: TONAL_1,
    TONAL_2: TONAL_2,
    RHYTHM_1: RHYTHM_1,
    RHYTHM_2: RHYTHM_2,
  };
  global.LSA_TOC_FOR = tocFor;
})(window);
