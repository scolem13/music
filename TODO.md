# TODO

A map of what is open, gathered from the notes below on 2026-11-06. It does not copy them: each section names the file that
holds the detail, so fix the item there and tick it here. Items marked (waiting) need something from the teacher.

## Band (`apps/shared/band/NOTES.org`, `#+TODO: TODO DECIDE | DONE`)
Search the file for `TODO` / `DECIDE`; about 90 open items. The groups:
- **Listen and judge** (nobody has heard these yet): swing trio at 120 and 200 bpm; straight eighths + boogaloo riff + stabs;
  guitar comping; 3/4, 6/8, 12/8 and the two voice-led triad styles on guitar; Variation Strict / Some / Loose; the fits table;
  the from-memory patterns marked VERIFY BY EAR.
- **Not built**: embellishments on top of a pattern (step 3); parts reacting to each other (step 4);
  alterations (b9 / alt on dominants); recorded samples (replace the zone lists in `sounds.js`); old-page patterns not ported
  (jazz waltz, hand drums, drum fills). (Done 2026-11-09: count-in and final hit in notation / export; drums follow the bass.)
- **Known faults**: iOS Safari untested; meters other than 4/4, 3/4, 6/8, 9/8, 12/8 untested. (Fixed by 2026-11-09: the
  ii-V-I-VI key, greyed notes in pins, "Start at bar", `romanNumeral` twice, the chord parsers, Unlock and Style remembered.)
- **Voicing entry (MIDI)**: rootless voicings misnamed; played notes thrown away once the chord is named; no overdub / punch-in;
  editing the changes clears every voicing; Chord Sheet keeps its own "Enter voicings (MIDI)" button.
- **Rock / pop style**: pushes in one fixed place; chorus bars typed by hand; piano still close triads; Motown bass is root /
  fifth / octave only; 3/4 falls back to jazz time.
- **Also**: DAW playback over MIDI for full scores (planned, in the same file).

## Ear training (`research_notes/ear-training-plan.md`, section 6 build order)
1. `harmony-ladder.js` data + Node test. 2. Engine and page, Stages A-B, Q1-Q3, Q5. 3. Q2 sung bass with `PitchDetect`; tool 2.
4. Stages C-F, Q4, Q6. 5. Stage G hand-off links; Q7-Q8 via Dictation. 6. Timestamp Notes change-tapping; improvise tool.
7. Works cited for every page. Six open questions for the teacher at the end of section 7 (voicing, scored singing, ii order,
   one page or several, progress storage, Mullen's videos). Hearing Harmony, Bass Lines by Ear, Odd Progression Out and
   Blues Changes by Ear already exist, so check which steps are already covered before starting.

## MLT Books (`CLAUDE.md` MLT Books entry, `research_notes/mlt-lesson-builder-plan.md`)
- Books to enter next: JRI Recorder, DMTI 1-3, Music Play, later JRI Elementary (new files `jri-lsa.js`, `litmus.js`,
  `musicplay.js` just landed, uncommitted before the last push - check how far each is).
- Three DMTI units wait for DMTI's own tunes (`todo` in `apps/shared/mlt/books/dmti.js`) (waiting).
- JRI sax: F-DO and C-DO keys not chosen in `KEYMAP`.
- Lesson builder, not yet: plans and records shared between devices; next plan choosing its objective from the record sheet; a
  room layout for the seating chart; aptitude scores entered from a test.
- Recordings: edit hand-checked facts on `mlt/recordings.qmd`, download, rerun `scripts/mlt-recordings.mjs`.

## Recordings and scores (`research_notes/recordings-to-scores-plan.md`)
- Moonlight Sonata timing map, then a quiz on its sections and bars (waiting: teacher marks the bars in Timestamp Notes).
- Theme-snippet recordings for Classical Themes (waiting: files from the teacher).
- Find the original recordings of the themes on YouTube; "find the theme" IMSLP lesson (569 themes start after bar 1).
- Bar numbers for the ~244 Hutchinson YouTube examples in 14 `theory/` pages, then bar-lit playback through RecSync (needs a
  YouTube variant of its player).
- Full scores: further scores beyond Mozart 40 iv. Analysed library: 9 renumbered movements added 2026-11-09 (608 now); Beethoven
  3-1, 24-1, 26-1 now fit but fail the 2% wrong-length-bar limit (cadenzas): decide whether to loosen it (waiting).

## Notation page: limits of the model (`tools/_notation.qmd`, `apps/shared/notation-doc.js`, `.claude/docs/notation.md`)
Raw ABC (ABC panel checkbox, 2026-11-14) draws the code as written, but with it on the score keys are off; unticking re-reads the
code into the model, which drops what it can't hold. To clear, cheapest first (estimates from the 2026-11-14 assessment):
- (Done 2026-11-14: strict rhythm ("Write rhythms as entered", on by itself in 5/8, 7/8, 11/8: cut only at barlines, beamed in
  runs); beams by hand `/` `?` and Visual `/` (`slot.beam`, read back from the ABC's spaces); raw mode Tab, h / l, H / L, click;
  D harmonic minor's C# no longer spelled Db.)
- (Done 2026-11-14: free time `q` (`chunk.free`, no barlines inside the chunk) and Visual `(` + 3: the notes as written become a
  triplet (`D.tuplet`); `((` keeps the old three-equal-notes.)
- **Tuplets other than 3** (~1-2 days, with double dots, since both change the time grid): `(5`, `(7`, 3:4, 4:3 ... need the
  tuplet stored on its notes (p:q, which group) instead of guessed from off-grid lengths (`tupletGroups`), the writer and reader
  doing `(p:q:r`, a finer grid than 1/48 quarter, and ties / splits / cut and paste carrying it. q from ABC's defaults unless
  the selection only fits another.
- **Highlight the active note in the ABC box and the score at once** (~half day, both modes): a highlight layer behind the
  textarea (a textarea shows no selection unfocused); score moves mark the code, caret moves (click, typing, vim motions) light
  the note. Default mode through the page's map; when typing is re-read and the box rewritten, follow the note under the caret.
- **Beat grouping in the meter** (~1 day, less needed now that strict mode exists): `groupStarts` hard-codes 7/8 = 2+2+3 and 5/8 = 3+2; read `M:(3+2+2)/8` / `M:3+2+2/8`
  into `meterInfo`, a grouping box in the meter menu's Other..., per chunk like a meter change. Also 11/8, 9/8 as 2+2+2+3, 3+3+2.
- **Double dots and thirty-seconds** (~1-2 days): the model counts in sixteenths, plain or single-dotted only (`WRITABLE`, `LEN`,
  `pieces`); count in thirty-seconds, add 7/4, 7/8, 7/16 and 1/32; `beam` / `clearCut` / `snapQ` follow; takes still snap to 16ths.
- **Extras on single notes kept through the model** (~3-5 days, "option 2"): decorations (`!p!`, `.`, `~`), slurs, grace notes,
  annotations carried on the slot through pitch / length / respell / tie / split / cut and paste; `%%` and header lines kept
  verbatim. Lets the score keys and raw-style extras mix.
- **Hardest, maybe never**: slurs across chunks, voice overlays `&`, other `V:` options (keep within a chunk, warn on split / merge).
- **Beams by hand, open ends**: beams across chunks (Visual `/` refuses), beams over a barline (ABC can't), triplet notes left out.
- **Raw mode itself**: h / l / click / Tab move only, no editing from the score; no band (piano only) and no note lighting during Play, Play it in /
  Loop chunks / DWIM / Chords by bar / Words off; opening a file or a Backing Track hand-off while raw is on is refused (untick
  first).
- Known, not raw's: `tests/abc/notation.cdp.js` fails at "cells sized like the Song Builder's" (already failing before raw mode).

## Lessons and tools
- **Chord Analysis**: chapters 9-21 built (2026-11-09). Left: each chapter's leftovers on the page; no ch23 level (one key
  per passage).
- **Hutchinson** (`research_notes/hutchinson-gaps.md`): every chapter has a page (2026-11-10). Left: asymmetrical period, phrase
  group, elision (no example found); Pathétique III / Moonlight III playable (PDMX .mxl not on this machine; Mutopia via
  python-ly drops notes); invention / fugue analysis; voice ranges read off the book's figure by eye (check once).
- **Words & Chords**: not moved from `~/Projects/carols` yet: the Big Timestamp Player, the iReal charts, `carols.abc`.
- **Student reports**: done (clearing, date ranges, every ear tool records). Left: ear tools cannot be replayed In class.
- **Works**: set `WORKS_CONFIG.r2Base` (R2 bucket address, not set yet).
- **Sound**: Tune Assessment on AbcPlay since 2026-11-09 (its own Arranger kept; balance unheard; render `practice/` to ship it).
- **Notation size slider**: only in the MLT view bar so far.
- **MODX**: Orchestra page is set up "for later" (16 Parts, full scores). Its test fails on PDMX part abbreviations (`HRN`, ...):
  `modx-orchestra.js` names patterns need the abbreviations (found 2026-11-10; `pno` added).
- **Full scores**: Rimsky-Korsakov examples (262; 52 failures in `research_notes/rimsky-conversion.org`), Pathétique III and
  Moonlight III from Sapp's kern (`scripts/kern/`; the repo has no licence: ask Sapp if the site is ever opened). Waldstein I
  has tie / tuplet faults. The list page needs grouping. IMSLP plan: `research_notes/imslp-assessment.md` (download by hand).
- **`node scripts/check-pages.mjs`**: 15 warnings left on 2026-11-09, all on purpose (rhythm / pattern pages, one-note previews,
  `lessons/index.qmd`, version numbers).
- **Print anthologies**: more books via `scripts/print-books/ADDING-A-BOOK.md` when a scan arrives.
- **Unverified facts** (instrument charts, arpeggiator, polyrhythm, organ) are listed in the header of each data file; check and
  cite in `scripts/works-cited.py`.
