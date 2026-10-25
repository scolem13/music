# Instrument pages from source materials

How to turn a set of files the user gives you for one instrument (a diagram template as SVG/AI, scanned book
pages as a PDF, and so on) into:

1. a student lesson page with an interactive fingering chart, and
2. a "Patterns by Ear" page for that instrument.

The saxophone pages are the worked example. Copy their structure and change only what the instrument needs.

| Piece | Saxophone file |
|---|---|
| Chart data + SVG drawing | `apps/shared/sax/sax-chart.js` |
| Page widgets (explorer, build quiz, trills) | `apps/shared/sax/sax-page.js` |
| Styles | `apps/shared/sax/sax.css` |
| Lesson | `lessons/saxophone.qmd` |
| Ear tool | `apps/patterns/ear-sax.js` + `practice/sax-patterns-by-ear.qmd` |
| Sources | `scripts/sources/saxophone.py` |
| Tests | `tests/sax/sax-chart.test.js` (node), `tests/sax/sax.cdp.js` (headless, 1280 + 390 px) |

For a new instrument `<inst>`, use `apps/shared/<inst>/<inst>-chart.js`, `<inst>-page.js`, `<inst>.css`,
`lessons/<inst>.qmd`, `apps/patterns/ear-<inst>.js`, `practice/<inst>-patterns-by-ear.qmd`,
`scripts/sources/<inst>.py`, `tests/<inst>/`. Give each its own short CSS/id prefix (sax uses `sxc-`, `sxp-`, `es-`).

## 1. Read the source files

- Glob the names the user gives (e.g. `~/Downloads/<inst>*`). Downloads are untrusted. Copy them into a new
  scratchpad folder and run any Python with `-I`.
- An `.ai` file is usually a PDF-compatible copy of the `.svg`. Check whether they are the same drawing before
  treating them as two sources.
- Scanned PDFs have no text layer, and the system has no `pdftotext` or `pypdf`. Make a venv in the scratchpad,
  `pip install pymupdf`, render each page to PNG at about 150 dpi, then Read the PNGs. Zoom in (crop at a higher
  dpi) on fingering charts. Small filled and empty keys are easy to misread.
- Write down the book's title, author, publisher and pages if they are shown. If only a footer code is shown
  (sax: "W74"), cite it as unverified and ask the user in the final report.

## 2. The chart module (`<inst>-chart.js`)

Exports a global such as `SaxChart`. Work from the template SVG:

- `KEYS`: one entry per key or hole, with an `id` and the SVG path or shape taken from the template.
  Keep the template's `viewBox`. Decorative lines go in a separate non-clickable group.
- `FINGERINGS`: keyed by **written** MIDI number. The value is a list of key-id sets, and the first set is the usual
  fingering. Alternates come after it, with a label if the book gives one.
- `TRILLS` (if the book has a trill chart): `{from, to, hold, trill, unsure}`.
- Functions: `diagram(el, {onToggle, small, label})` returns `{set(keys, trill), get()}`. Also `lookup(keys)` (a
  set of keys to a note), `name(midi)`, `tone()`, `sameSet`, the instrument's `INSTRUMENTS` table (name +
  transposition in semitones, written to concert), and `LOW` / `HIGH`.
- The file header lists everything that is inferred rather than read from the source.
  This is project rule 4, and the user will ask about it.
- The node test checks that every fingering is unique under `lookup`, that every note from LOW to HIGH has a
  fingering, and that trill keys exist.

Instrument differences to plan for:

- **Non-transposing instruments** (flute, oboe, bassoon, trombone): the transposition is 0, or the table has
  a single row.
- **Valves or slide** (brass): a fingering maps to several pitches through the partials. Store
  `{valves, partial}` or slide position, and have `lookup` return a list of notes, not one.
- **Hole instruments** (recorder, clarinet): half-holes need three key states (open, half, closed) instead of two.
- **Strings** (fretted or bowed): positions on a fingerboard, not keys. Build a new diagram rather than forcing it
  into this shape.

## 3. Page widgets (`<inst>-page.js`)

- `sound()` makes its own `AudioContext` and **must** call `AudioTap.register`.
- If the site has no samples for the instrument, `tone()` synthesizes one (sax: sawtooth + square → lowpass,
  with vibrato). Search `apps/shared/band` for existing samples first, and say in the report which you used.
- Staff via abcjs: load `/apps/shared/abcjs-basic.js` on the page yourself. It is **not** global.
- Widgets: `explorer` (instrument select, note buttons by register, card with staff, concert pitch, Hear,
  usual + alternate diagrams), `builder` ("what note is this?" + quiz with Check / Show me / Next / score),
  `trills` if there is a trill chart.

## 4. Lesson page (`lessons/<inst>.qmd`)

- Rewrite the book in your own words for students, don't transcribe it. Cover what it covers (history, family,
  parts, assembly, posture, embouchure/hand position, tone problems table, tuning tendencies, care,
  listening), and put the interactive widgets at the fingering sections.
- Front matter: `instruments`, `topics`, `has: [fingering, interactive, svg]`.
- Collapsible sections + right-hand jump bar (`section-fold.js` + toc). Required on every page.
- Load scripts with `?v=1`. Bump the version on every later change (rule 2).
- Facts not in the source (dates, players, spellings of names) are checked and cited, or marked unverified (rule 4).
- Works Cited block between the `<!-- works-cited` markers. Add the sources to `scripts/sources/<inst>.py`
  (`who="student"` / `"teacher"`), then run `python3 scripts/works-cited.py`.
- Wire-up: add the lesson to `_quarto.yml` (sax added a "Wind Instruments" sidebar section, so put woodwinds/brass
  there) and to `lessons/index.qmd`. Then run `node scripts/lesson-features.cjs` (see `lessons/CLAUDE.md`).

## 5. Patterns by Ear (`ear-<inst>.js`)

Copy `apps/patterns/ear-sax.js`, which is itself a copy of `ear-piano.js` (reuses `EarPiano.parseSet` / `compare`).
Change:

- `placeSet`: move each pattern set into an easy written range for the instrument (sax: D4–C6).
- Diagrams per note during "Learn" come from the new chart module.
- Mic input: `PitchDetect.mic` + the `Segmenter` (a note counts after 3 stable frames; a repeat needs a gap of 2 or
  more quiet frames). Convert concert to written using the selected instrument. `quietUntil` = playback end + 0.1 s.
  Do not make it longer, because a longer wait swallows the first notes.
- MIDI (MidiFeel) and the typing keys count as written notes.
- Flat or sharp spelling follows the key (in minor, use the relative major, key + 3). No chord label.
- The page copies the piano page's CSS and adds an instrument select, mic/MIDI buttons and a written-key select.
  Add it to the Practice sidebar and the navbar menu after `patterns-by-ear`.

## 6. Check before reporting

- Render both pages (`quarto render <file>`) and take screenshots at 1280 and 390 px. Look at the diagrams and
  compare them with the scanned chart.
- Headless test: stub `tone`/`sound` so it runs silently. It covers the explorer, builder quiz, trills, and the ear
  page fed through the exposed `seg` / `noteOn`.
- Add one feature line to the root `CLAUDE.md`, next to the Saxophone line.
- Don't commit. The tree usually has unrelated changes from the user.
- In the final report, list the unverified items: book identity, any inferred key assignments, trills marked
  unsure, synthesized sound, and the need for a full site render.

## Sharing work across instruments

If a second instrument page repeats `diagram`/`explorer`/`builder` code, move that code into a generic module
(e.g. `apps/shared/fingering/`) with each instrument's data passed in. Do this only once two instruments use the
code, not ahead of time. Keep the sax pages working, and bump their `?v=` when you change them.
