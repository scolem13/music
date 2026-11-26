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
- DP Classical Style (`lessons/dp-classical-style.qmd`, sidebar Composing): the self-paced page for the DP1 Classical unit
  (plan, Toddle texts and class summaries in `~/org/DP1-Music-Classical-Style-Unit.org`). Mozart K. 545 i as the anchor, a 32-bar
  rounded-binary composition built 8 bars at a time, self-check quizzes `<div class="dq">` (JSON inside, script at the page end),
  Words boxes linking glossary slugs. Sources `scripts/sources/dp-classical.py`. Test `node tests/lessons/dp-classical-style.cdp.js` (`NEG=1` must fail).
- Inversions for Smooth Chord Changes (`lessons/inversions-voice-leading.qmd`, sidebar Piano Technique after Inversions): root position vs voice-led
  (keep the shared note, move the others to the nearest), RH fingers 1-3-5 / 1-2-5 (rule of thumb), LH roots, when to jump. Diagrams are
  `sh-shapes` (`_shape-kit.qmd`); the Inversion Picker `<div class="ip" data-prog>` is `apps/shared/lessons/inversion-picker.js` (rules in
  its header: Smoothest = fewest half steps, the first chord kept). Test `node tests/lessons/inversions-voice-leading.cdp.js` (`NEG=1` must fail).
- Guitar Triads for Smooth Chord Changes (`lessons/guitar-voice-leading.qmd`, sidebar Guitar Technique after Chord Shapes by Hand): the guitar
  twin of the inversions lesson, top-string triads (strings 3-2-1, or 4-3-2), shared note kept, open-chord anchor fingers. Triad Picker
  `<div class="gvp" data-prog data-set="top|mid">` is `apps/shared/lessons/guitar-voice-picker.js` (rules in its header: every close triad up to
  fret 15, Smoothest = fewest frets moved, the first shape kept). Test `node tests/lessons/guitar-voice-leading.cdp.js` (`NEG=1` must fail).
- Meet the Instruments (`lessons/intro-<id>.qmd`, 24 pages, sidebar part "Meet the Instruments" inside Sound Design, just before the
  compare pages): a beginner's first stop per instrument (15 synths, 4 drum machines, 5 sequencers). Short sections, a "What you'll do"
  list, what it is, its sound one idea a line, the compare page's widget shown compact (only its own panel), a guided tour (4-8 steps,
  each ▶ sets a starting patch / pattern and plays it; the Model D tour uses the manual's patch sheets via MoogSheet), famous records
  (only ones the cited Wikipedia article names), videos from `apps/shared/data/*/assignments.json`, a self-check quiz (instant
  feedback, nothing recorded), Next = the compare page with `?synth=` / `?machine=` / `?seq=` pre-selecting it. All content lives in
  `scripts/intro-instruments/build.py` (rerun it, then `python3 scripts/works-cited.py`); the kit `apps/shared/lessons/intro-kit.js` + `.css`
  drives the widgets only through their public methods (formats in its header) and is also loaded on the three compare pages for the
  pre-selection. Sources `scripts/sources/intro-instruments.py` (reuses the compare pages' manuals + Wikipedia, read 2026-11-25).
  Rendering several files in one `quarto render` call fails here ("withBinaryFile: does not exist" on the 2nd file, also for old pages),
  so render them one by one or the folder. Test `node tests/lessons/intro-instruments.cdp.js [slug ...]` (`NEG=1` must fail).
- Play the Model D (`lessons/model-d.qmd`, not in the sidebar yet; `apps/shared/lessons/model-d.js`): Simple panel / Real panel switch
  (localStorage `md-view`). The Simple panel is `apps/shared/lessons/synth-panel.js` (global SynthPanel, one teaching layout meant for
  every synth: modules in signal order that fold to a picture, SVG wave icons, vertical sliders only, Beginner / All; spec format and
  `SPECS.moog` in its header). Filter / envelope pictures are drawn from the knob numbers, schematic. Other synths: add a spec.
  Pitch wheel (springs back, a fifth each way, M 24, 80) and mod wheel left of the keys, MIDI 0xE0 bend + CC1; engine `voice.bend(semis)` / `bendWheel(v)` for every synth.
  Test `node tests/lessons/model-d.cdp.js` (`NEG=1` must fail).
