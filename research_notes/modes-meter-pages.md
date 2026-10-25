# Notes for theory/modes-three-ways.qmd and theory/meter-taxonomy.qmd (2026-10-25)

Map of what was read, so the work can be picked up without re-reading the cache.

## Pages being written
- `theory/modes-three-ways.qmd`: "mode" in MLT (tonality), classical theory, jazz (chord-scale)
- `theory/meter-taxonomy.qmd`: simple/compound × duple/triple/quadruple vs Gordon's usual/unusual, paired/unpaired
- Sidebar: `_quarto.yml`, Theory sidebar, new section "Concepts" (after Drills and Exercises)
- Sources: `scripts/sources/theory-concepts.py`; then `python3 scripts/works-cited.py`
- Collapsible sections: `<script src="/apps/shared/section-fold.js?v=1"></script>` + `toc: true`

## Gordon, Learning Sequences in Music (2012), cache `research_notes/mlt-sources/text/gordon-lsm-2012.txt`
Line numbers are in that text file; pages are print pages (`[p.N]` markers).
- l.98, p.xiii: "keyality" coined; key signature seen, keyality audiated; one sharp = G major, E minor, A Dorian.
- l.785, p.149: tonality "best refers to what is usually called a mode"; "major and minor are also modes";
  at least eight tonalities: major, harmonic minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian.
- l.787-789, p.150: tonality defined by resting tone (do...); keyality by tonic (C); key signature = symbol, keyality = sign;
  "A tonality may be in any keyality and a keyality may be in any tonality."
- l.791ff, p.151: objective/subjective tonality; unitonal/multitonal (p.152).
- l.821, p.157: unitonal/unikeyal; multitonal example harmonic minor -> Mixolydian in Eb keyality.
- l.285 (p.~?): m7 chord heard as Dorian lower tetrachord + Mixolydian upper (improviser example). Page not checked.
- l.549, p.115-116: raised 4 / lowered 7 in major might be chromatic, modulation of keyality, or to Lydian/Mixolydian tonality.
- l.940, p.175-176: usual duple = macrobeat into 2 microbeats; usual triple = into 3; usual combined = some 2 some 3,
  macrobeats equal; usual only when macrobeats paired and equal.
- l.941, p.176: "there is no direct relation between ... measure signatures and meter"; 6/8 called "duple compound" is "inaccurate"
  (two macrobeats each divided in three = usual triple).
- l.943-947, p.176-177: tempo of macrobeats doesn't change meter; accents don't produce meter (waltz); divisions of microbeats don't change meter.
- l.956-958, p.179-180: unusual meter = macrobeats unequal; four types: unusual paired, unpaired, paired intact, unpaired intact;
  paired = two macrobeats per grouping (5/8), unpaired = three (7/8); listener decides which pair.
  "In usual meter, microbeats establish meter... In unusual meter, macrobeats establish meter"; divisive vs additive rhythm.
- l.1513, p.271-272: "aud-i-aud-i-ate" 5/8 unusual paired preparation.
- l.418, p.~76: unusual meters "typically notated in 5/8 or 5/4 and 7/8 or 7/4".
- l.576, p.123-124: 2/4 = usual duple, 6/8 = usual triple taught as whole signatures, no fractions.

## Classical / jazz facts
Cited to Hutchinson, *Music Theory for the 21st-Century Classroom* (open, musictheory.pugetsound.edu/mt21c),
already a site source. URLs to confirm before citing; anything not confirmed is marked unverified on the page.

## Status (2026-10-25): both pages written, rendered, in sidebar "Concepts"
- Gordon page notes live in the Gordon entry of `scripts/sources/mlt.py` (duplicate entries merge and keep only the first note);
  Hutchinson + Wikipedia in `scripts/sources/theory-concepts.py`.
- Marked unverified on the page: classical names for 5/8, 7/8 ("asymmetrical / irregular / complex").
- Not used yet: Gordon l.285 (m7 as Dorian + Mixolydian tetrachords), l.549 (raised 4 / lowered 7 ambiguity); no ABC examples yet.
