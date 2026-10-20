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
