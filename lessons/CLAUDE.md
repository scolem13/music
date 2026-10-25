# Lesson pages

- The Lessons read like a book: the `lessons` sidebar in `_quarto.yml` groups them by topic (parts), with Previous / Next.
  The Lessons index (`lessons/index.qmd`) is a Quarto listing (its `contents:` list, in order; template
  `lessons/_lessons-listing.ejs`), filtered by text, instrument, topic and Has. Each lesson's front matter carries `description`,
  `instruments`, `topics` and `has` (band, notation, fingering, interactive, svg, images; not `categories:`, which would print chips).
  A new lesson: add those fields, add it to the listing's `contents:` and to a sidebar section. `has:` is written by
  `node scripts/lesson-features.cjs` (headless Chrome over the rendered `_site` lessons; `--dry` only prints): rerun it after adding
  a lesson or changing what one shows, then render `lessons/index.qmd`.
- Write an Ending (`lessons/write-an-ending.qmd`): every tune in the library with `%%id unfinished-song-*` (chords as real chord
  symbols, the last two bars `x` rests over V and I/i), with the Notation page framed in it (`?ending=1`: pared down, no site chrome,
  its own store `ntEndingDoc`; `end-ready`, `end-load {abc,title}`, `end-change {abc}`). Each song's ending is kept in
  localStorage `ending:<id>`. Tests: `node tests/lessons/ending.cdp.js` (after rendering it and `tools/notation.qmd`).
  In `?ending=1` the Notation page shows only Rhythm and Notes: rhythm fills the open bars in order and stops when they're full
  (no bar is added); letters fill the first empty note.
- Sing and Notate (`lessons/sing-and-notate.qmd`, matcher `apps/shared/sing-notate.js`; not in the sidebar yet): plays Unfinished
  Song #1 (read from the tune library; it sets key, tonality, meter) three times in a row, records its empty last two bars each
  time, matches the takes to the familiar rhythm / tonal pattern banks (lenient; warns when nothing fits), then grades what is
  written into those bars in the framed Notation page. Tests: `node tests/lessons/sing-notate.test.js`,
  `node tests/lessons/sing-notate.cdp.js` (after rendering it and `tools/notation.qmd`).
- Notation lessons (`lessons/notation-steps.qmd`, not in the sidebar yet): steps that frame the Notation page as `?stage=1`
  (`st-ready`, `st-load {show, doc, rhythm}`, `st-change {doc, abc}`; store `ntStageDoc`): only the panels a step lists are shown,
  keys for hidden parts do nothing, and the step's target (rhythm slots, `want`) unlocks the next. Add steps to its `STEPS` list.
  The page also has Save to file / Open file (`.notation.json`: `{ kind: "notation-doc", version: 1, doc }`, or ABC).
- Score Reading (`lessons/score-{clefs,multi-clef,transposition,history,names,practice}.qmd`, sidebar part Score Reading) and the
  Part Reader tool (`tools/part-reader.qmd`): the instrument/transposition table and key maths are `apps/shared/score-reading.js`
  (`semis` = sounding minus written); drills are `<div class="sq" data-quiz>` from `apps/shared/lessons/score-quiz.js` (kinds at its
  top), included via `lessons/_score-kit.qmd`. Sources `scripts/sources/score-reading.py`. Test: `node tests/lessons/score-reading.cdp.js`.
- Elements of Music (`lessons/elements-{articulation,dynamics,harmony,instruments,melody,metre,rhythm,structure,style,texture,quiz}.qmd`,
  sidebar part Elements of Music, topic `elements`), from a school handout in its order. `apps/shared/lessons/elements.js`: the
  British-names switch (US default; `[quarter note]{.nn}` spans and `.ax-cap` captions; localStorage `el-names`), quizzes
  `<div class="eq" data-set="texture|…|all">` (bank `Q` at its top), and orchestral sounds added to BandSounds (`violin`, `flute`,
  `timpani`, …; the kit loads `sounds.js` first). Staccato must be heard through a `data-bend` list (the player ignores it).
  Running notes, handout corrections, what's unchecked and the grade 6–10 plan: `lessons/ELEMENTS-NOTES.md`.
  One-page sheets (`elements-<element>-sheet.qmd`, all ten): `::: {.el-sheet data-title}` > `.el-grid` > `.el-card` boxes; elements.js adds
  Full screen, zooms the grid to fit the screen, shrinks staves to their card. `AX_PARTS` (abc-ex.js): click a note to play
  from its measure, Show checkboxes per voice, and a Show notation switch.
  Sources `scripts/sources/elements.py`. Test: `node tests/lessons/elements.cdp.js` (after rendering the twelve pages).
