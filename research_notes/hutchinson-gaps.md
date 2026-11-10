# Hutchinson (mt21c) chapters vs. the site's theory pages

Book order from `~/.cache/mt21c/src/MusicTheory.xml` (fetched 2026-11-09). Checked 2026-11-09.

| Ch | Book chapter | Site page | Status |
|---|---|---|---|
| 1-12 | Basic Concepts .. Form in Popular Music | pitch-basics .. pop-forms | have pages |
| 13 | Phrases in Combination | `theory/phrases-in-combination.qmd` | **filled now**: PAC/IAC, sentence (made-up model + library links), parallel/contrasting periods, repeated phrase/period from six Tune Library tunes. Still missing: a clean asymmetrical period, phrase group, phrase chain, elision from the site's own collection (no phrase-marked classical pieces; the library's bars are not matched to the book's figures) |
| 14 | Accompanimental Texture | accompaniment-textures | have |
| 15 | Creating Contrast Between Sections | `theory/creating-contrast.qmd` | **filled now**: eight elements, O Susanna verse vs chorus, Nachtmusik II grid, pop contrast via Arranger / Backing Track. Missing: a listening drill; the book's examples are a copyrighted pop recording and a Mozart movement not in the library |
| 16-22 | Figured Bass .. Modulation | have pages | have |
| 23 | Enharmonic Modulation | none | **still waiting**: needs a library piece with a marked enharmonic pivot (the analysis data has no label for it), and the book's examples are Mozart / Beethoven excerpts not in the library |
| 24 | Binary and Ternary Forms | `theory/binary-ternary.qmd` | **filled now**: descriptors, balanced / rounded / simple, ternary, compound ternary, rounded-vs-ternary tests, with Yankee Doodle (sectional binary), Beethoven Op. 2 No. 1 III (rounded binary + trio), Mozart K. 545 II (ternary) from the library's key plans. Missing: a balanced binary and a simple binary from the collection (Bach dances are not in the library) |
| 25 | Sonata and Rondo Forms | `theory/sonata-rondo.qmd` | **filled now**: layout, K. 545 I key plan, sonata principle, four functions, Beethoven Op. 49/2 II rondo, K. 545 III. Missing: Pathetique III and Moonlight III (not in the library), a bar-marked recording for each function |
| 26-29 | Voice Leading (triads, sevenths, NCTs, chromatic) | `theory/voice-leading-triads.qmd`, `-sevenths`, `-ncts`, `-chromatic` | **filled now (2026-11-09)**: each chapter's rules in the site's words, checked right / wrong examples on a grand staff (played by AbcPlay), exercises (bass / soprano given, student types the rest, marked by the checker). Checker `apps/shared/analysis/voice-leading.js` (global VoiceLeading; header lists every rule, its chapter and which are the site's reading); page widgets `voice-leading-ui.js`. Not checked: consecutive 3rds / 6ths, the vii dim7 special resolution, the K. 331 exception, augmented sixth chords, double neighbor / pedal point. Voice ranges read off the book's figure by eye (S D4-F#5, A G3-C#5, T Eb3-F#4, B E2-C4): worth a second look. Tests `node tests/voice-leading/voice-leading.test.js` (`NEG=1` must fail), `vl-pages.test.js` (examples as claimed, ABC bar-checked, every exercise has a clean solution found by search), `vl-pages.cdp.js` |
| 30 | Introduction to Counterpoint | `theory/counterpoint.qmd` | **filled now**: first and second species checked (examples + exercises, cf below and above); third to fifth species, invention expositions and fugue analysis described but not checked (would need a species 3 / 4 checker and the Bach scores' bars marked) |
| 31 | Introduction to Jazz Theory | jazz-theory | have |
| 32 | Impressionism and Extended Tonality | `theory/impressionism.qmd` | **filled 2026-11-09**: tools only (collections player, planing, polychord builder); the book's own score examples are named, not transcribed. Whole-tone / octatonic remarks unverified |
| 33 | Set Theory | `theory/set-theory.qmd` | **filled**: clock-face calculator, quiz, 208-class browser; maths tested against the book's tables (`tests/post-tonal/pcset.test.js`) |
| 34 | Serialism | `theory/serialism.qmd` | **filled**: matrix builder that plays P/I/R/RI, form identifier. Op. 25 and Berg rows typed from memory, unchecked |
| 35 | Minimalism | `theory/minimalism.qmd` | **filled**: additive process, phasing (stepped / drift), ostinato layers; patterns made up. Clapping Music not modelled |

## Where the gaps were written down
- `theory/index.qmd` listed chapters 1-12, 14, 16-22, 31 only (no 13, 15, 23, 24, 25).
- `research_notes/hutchinson-notation-plan.md` and `hutchinson-clips.org` cover the book's *clips* of existing pages, not missing chapters.
- Form material was pointed at "the tune collection" in `theory/pop-forms.qmd` (ch. 12 teachers' note: "not here: the book's song timelines").

## What made the filled ones possible
- Tune Library folk tunes with chord symbols (Skip to My Lou, London Bridge, Little Brown Jug, O Susanna, Long Long Ago, Go Tell Aunt Rhody, Yankee Doodle): cadences read from chords and melody (not from a recording).
- Analysed Scores Library (`apps/shared/data/scores/*.json`, `keys` = key regions by bar offset, approximate): K. 545 I-III, K. 333 I, Beethoven Op. 2/1 I and III, Op. 13 II, Op. 49/2 II.

## Caveats
- Cadence labels and form readings are this site's, from chord symbols / key labels, not from a score or recording check.
- Bar numbers from the key data are approximate (offsets in beats, not bar lines).
- Sources: `scripts/sources/hutchinson-form.py`.
