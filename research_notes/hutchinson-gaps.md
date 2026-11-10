# Hutchinson (mt21c) chapters vs. the site's theory pages

Book order from `~/.cache/mt21c/src/MusicTheory.xml` (fetched 2026-11-09). Checked 2026-11-09.

| Ch | Book chapter | Site page | Status |
|---|---|---|---|
| 1-12 | Basic Concepts .. Form in Popular Music | pitch-basics .. pop-forms | have pages |
| 13 | Phrases in Combination | `theory/phrases-in-combination.qmd` | **filled now**: PAC/IAC, sentence (made-up model + library links), parallel/contrasting periods, repeated phrase/period from six Tune Library tunes. Still missing: a clean asymmetrical period, phrase group, phrase chain, elision from the site's own collection (no phrase-marked classical pieces; the library's bars are not matched to the book's figures) |
| 14 | Accompanimental Texture | accompaniment-textures | have |
| 15 | Creating Contrast Between Sections | `theory/creating-contrast.qmd` | **filled now**: eight elements, O Susanna verse vs chorus, Nachtmusik II grid, pop contrast via Arranger / Backing Track. Missing: a listening drill; the book's examples are a copyrighted pop recording and a Mozart movement not in the library |
| 16-22 | Figured Bass .. Modulation | have pages | have |
| 23 | Enharmonic Modulation | `theory/enharmonic-modulation.qmd` | **filled 2026-11-10**: V7 <-> Ger+65 (top note respelled, keys a half step apart), the fully diminished seventh in four spellings resolved up (vii°7 of four minor keys) and down (one note falls to a dominant seventh's root), the enharmonic German (#2); every spelling drawn (bar-checked ABC, voiced bass + 3 uppers, not part-writing checked) and played, plus a which-key quiz. Real example: Pathetique I (`beethoven-sonata-8-1`, bar 137, linked with `view.html?id=beethoven-sonata-8-1&bar=137` (new `&bar=N[-M]` on the library viewer, test in `tests/works/score-view.cdp.js`): bass Eb with F# A C, then bass C with F# A D#; read from the library's score, the analysis data has no enharmonic label). Missing: Beethoven 5 II, Der Atlas as annotated examples (not in the library as scores with the pivot marked), a chord-analysis level (the engine has one key per passage, so no pivot named in both keys), the book's Day One / Day Two notate-and-resolve exercises. Common-tone modulation is not in this chapter (it is in ch. 22). Code `apps/shared/enharmonic-modulation.js` (global EnharMod), sources `scripts/sources/enharmonic-modulation.py`, tests `node tests/enharmonic/enharmonic.test.js` (`NEG=1` must fail), `tests/enharmonic/enharmonic.cdp.js` |
| 24 | Binary and Ternary Forms | `theory/binary-ternary.qmd` | **filled now**: descriptors, balanced / rounded / simple, ternary, compound ternary, rounded-vs-ternary tests, with Yankee Doodle (sectional binary), Beethoven Op. 2 No. 1 III (rounded binary + trio), Mozart K. 545 II (ternary) from the library's key plans. Missing: a balanced binary and a simple binary from the collection (Bach dances are not in the library) |
| 25 | Sonata and Rondo Forms | `theory/sonata-rondo.qmd` | **filled now**: layout, K. 545 I key plan, sonata principle, four functions, Beethoven Op. 49/2 II rondo, K. 545 III. Missing: Pathetique III and Moonlight III (not in the library), a bar-marked recording for each function |
| 26-29 | Voice Leading (triads, sevenths, NCTs, chromatic) | `theory/voice-leading-triads.qmd`, `-sevenths`, `-ncts`, `-chromatic` | **filled now (2026-11-09)**: each chapter's rules in the site's words, checked right / wrong examples on a grand staff (played by AbcPlay), exercises (bass / soprano given, student types the rest, marked by the checker). Checker `apps/shared/analysis/voice-leading.js` (global VoiceLeading; header lists every rule, its chapter and which are the site's reading); page widgets `voice-leading-ui.js`. **Second pass (2026-11-10)**: the K. 331 exception (I - V4/3 - I6, rising 7th), the vii dim7 / half-dim 7 special resolution (and the doubled third after it), augmented sixth voice leading (`Ger+65` etc.: #4 up to 5, b6 down to 5, no doubling, enharmonic German's #2 up, German straight to V = parallel fifths), pedal point and double neighbor are checked. Consecutive 3rds / 6ths: the book limits them only in species (checked there), not in SATB. The book gives the voice ranges **only as a figure** (no words anywhere in ch. 26; checked the XML), read off the staff by eye (S D4-F#5, A G3-C#5, T Eb3-F#4, B E2-C4): still worth a second look against the printed figure. b6 falling to 5 in aug6 chords is this site's addition (the book states only #4). Tests `node tests/voice-leading/voice-leading.test.js` (`NEG=1` must fail), `vl-pages.test.js` (examples as claimed, ABC bar-checked, every exercise has a clean solution found by search), `vl-pages.cdp.js` |
| 30 | Introduction to Counterpoint | `theory/counterpoint.qmd` | **filled now**: first and second species checked (examples + exercises, cf below and above); **second pass (2026-11-10)**: third, fourth (suspensions) and fifth (florid; `D4:2 E4:1` note:quarters typed) species checked, with worked examples and exercises (known solutions kept in tests/voice-leading/vl-pages.test.js). Invention expositions and fugue analysis are described, not checked (would need the Bach scores' bars marked). Fifth species' quarter-note limit on dissonance and neighbor tones are this site's reading of "a free mixture" |
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

## Second pass (2026-11-10): PDMX full scores
Read the notes of the PDMX scores with a small abcjs dump (bar by bar, melody and bass) before claiming any form. Added:
- Ch. 24 (`binary-ternary.qmd` 24.6): balanced binary = Bach Invention 8 (pdmx-84, bars 30-33 are 8-11 a fifth lower) and Mozart Minuet K. 5 (pdmx-465);
  simple binary = Gavotte Anh. 131 (pdmx-490) and Minuet Anh. 132 (pdmx-60, also written-out repeats); rounded binary = Haydn Minuet Hob. IX:8 (pdmx-238, bars 15-22 = 2-9, V pedal in B);
  Musette Anh. 126 (pdmx-23) as the rounded-vs-ternary weighing case (A returns note for note, B on a V pedal, 12 bars vs 8).
- Ch. 13 (`phrases-in-combination.qmd` 13.9): Fur Elise (pdmx-254) parallel period HC (bar 4) / PAC (bar 9); Anh. 115 Minuet (pdmx-5) as a two-phrase phrase chain (my reading, unverified); Sonatina Anh. 5/2 refrain (pdmx-429) = the book's phrase chain.
- Ch. 25 (`sonata-rondo.qmd`): Fur Elise as a five-part rondo A B A C A (bars 1-24 / 25-40 / 41-62 / 63-84 / 85-106, verified by comparing bars); Sonatina refrain.

Still waiting:
- Pathetique III, Moonlight III, Waldstein, English Suite 3 (the book's own examples): in the PDMX list (pdmx-489, 156/441, 474, 186) but `converted: false` (whole multi-movement scores, too long for the bar check); the converter would need to split movements first.
- Asymmetrical period, phrase group, elision: no example confirmed from the notes in the Bach notebook pieces (all short, two- or four-phrase). Phrase marking of a classical piano score would settle it.
- Sonata form with a bar-marked exposition / development / recapitulation in a full score: only the Analysed Scores Library (approximate bars) has K. 545 I; PDMX has Op. 27/2 I (pdmx-159, 69 bars, that is only the opening) and big sonatas not converted.

## Third pass (2026-11-10): Mutopia for Pathetique III and Moonlight III
Not openable as scores (PDMX .mxl not on this machine; python-ly MusicXML drops notes), but their bar plans are now on `sonata-rondo.qmd` (25.4), read
from the Mutopia LilyPond's MIDI export by `scripts/mutopia/midi-structure.py`: Pathetique III as A B A C A B A + coda (210 bars; B in E-flat at ~25-56 and in C major at ~137-158,
verified as the same tune 3 semitones lower), Moonlight III as sonata form (recap at bar 103; bars 115-126 = 19-30 a fifth lower). Key names are pitch-count guesses, unverified.
Still waiting for a playable score: a MIDI-to-ABC or hand-fixed MusicXML path, or the PDMX split on the machine with the .mxl files.
