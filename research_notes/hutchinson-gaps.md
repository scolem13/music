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
| 26-29 | Voice Leading (triads, sevenths, NCTs, chromatic) | none | waiting: part-writing needs a checker / four-part exercise tool (Chord Analysis covers analysis, not writing), not a tune-library matter |
| 30 | Introduction to Counterpoint | none | waiting: same (needs species-counterpoint checker) |
| 31 | Introduction to Jazz Theory | jazz-theory | have |
| 32-35 | Impressionism and Extended Tonality, Set Theory, Serialism, Minimalism | none | waiting: post-tonal chapters; need scores / recordings not in the collection (one minimalism phasing MP3 sits in the book repo, GPL, not imported) |

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
