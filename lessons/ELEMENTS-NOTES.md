# Elements of Music: running notes

Lessons `lessons/elements-{articulation,dynamics,harmony,instruments,melody,metre,rhythm,structure,style,texture,quiz}.qmd`,
built 23 Oct 2026 from the school handout *Elements of Music* (10 pages, `~/Downloads/Elements of Music copy.pdf`), in the
handout's order. Widgets: `apps/shared/lessons/elements.js` (note-name switch, quizzes, orchestral sounds), kit
`lessons/_elements-kit.qmd`. Sources `scripts/sources/elements.py`. Test `node tests/lessons/elements.cdp.js` (after rendering).

Add to this file whenever something is found to be limited, wrong or unchecked.

## Handout errors corrected on the pages

| Handout says | Pages say | Checked against |
|---|---|---|
| "Szorzando" | sforzando (*sf*, *sfz*) | Wikipedia, Dynamics |
| Interrupted cadence = V → "minor chord" | V → vi usually (V → anything but I) | Wikipedia, Cadence |
| Moderato / Andante both "moderate / a walking pace" | separate rows; andante is slower | Wikipedia, Tempo |
| Classical period 1750–1810, Romantic 1810–1910 | about 1750–1820, about 1800–1910, overlapping | Wikipedia, Classical period |
| "2/4 is also known as cut-common time" | cut time is 2/2 | standard notation (not cited yet) |
| "Blue notes: bending some notes by a semitone" | the 3rd, 5th and 7th, lowered a quarter tone to a semitone | Wikipedia, Blue note |
| "seperated", "bmp", "Romanitc" | spelling fixed | |

Garbled text in the PDF (curly quotes lost in the font) was read around; the pictures (about 120 notation examples and the
orchestra chart) were not copied but replaced by playable ABC.

## Not yet checked (from the handout or from memory)

- The metres of the handout's YouTube listening list (Slaidburn 2/4, Shostakovich Waltz No. 2, All That Jazz, Take Five
  5/4, Money 7/4, We Are the Champions 6/8, The Way You Make Me Feel 12/8). The Metre page says they are unchecked.
- Minuet and trio: "the minuet comes back without its repeats" (common practice, not in the source fetched).
- Composers named on the Style page beyond the handout (Zimmer, Shore, Miranda) and the musical-theatre kinds.
- Voice table: baritone added; treble/countertenor wording from the handout.
- Tempo BPM column: rounded from Wikipedia's "very rough" ranges; the page says they are a guide.
- Instruments page: where tenors are written (treble clef, an octave up) is from the Score Reading sources, not re-read.

## Limitations

- **Staccato is not heard through the normal player** (checked 23 Oct 2026: abcjs hands `abc-play.js` the same length,
  ¼, for `C` and `.C`). This is a site-wide gap worth fixing in `abc-play.js` itself. Until then the staccato
  and legato examples on Articulation use hand-written `data-bend` note lists instead. Any new staccato example needs one.
- **Glissando** is drawn with the `!slide!` sign (a scoop), not a proper gliss line; abcjs has no better sign here. It is
  heard correctly (a bend on the violin).
- **Orchestral sounds** are added by `elements.js` from the MusyngKite soundfont: one sample every 3 semitones, plain
  quality, no vibrato control. No choir sample exists (`choir_aahs` 404s), so voice types can't be heard. Pizzicato is the
  soundfont's pizzicato strings patch.
- **Not demonstrated in sound:** tremolo, con sordino, double stopping, vibrato, falsetto, antiphonal space, rubato,
  basso continuo (no figured bass example), terraced dynamics by changing the number of players (shown by volume only).
- **No real recordings.** Film, musical theatre and most style features have no audio example; copyright rules out clips.
  The Timestamp Player could hold cited YouTube links with timestamps.
- **The British-names switch** changes text in `[...]{.nn}` spans, example captions and quiz text. Plain text not wrapped
  in a span stays American. Section headings are not switched.
- **Quizzes** are 45 fixed multiple-choice questions, shuffled; no score is saved and they repeat after a cycle.
- Mid-tune tempo changes (the accelerando example) depend on abcjs honouring inline `[Q:]`; the timing was not measured.
- The new sidebar part only appears on other pages after a full site render. `scripts/tool-catalog.cjs` was not rerun
  (the `eq` quiz class isn't in its `CLS` map).
- Example tunes are simple and written for the page; none is a real piece of repertoire except *Twinkle* and *Frère Jacques*.

## One-page sheets

`lessons/elements-texture-sheet.qmd` is the first: every term of handout page 10 as a card (`.el-sheet` > `.el-grid` >
`.el-card`), each with a two-measure example, and the quiz as the last card. "Full screen" puts only the sheet on screen;
`elements.js` then zooms the grid (60% at the least) to the largest size that fits without scrolling, and scales any staff
wider than its card. Checked at 1920×1080 and 1366×768.

- Below 60% zoom (a small laptop window, a phone) the sheet scrolls instead of shrinking further.
- `zoom` is CSS that Firefox only supports from version 126; older Firefox scrolls.
- Antiphonal is two treble staves, not two places: the player has no stereo panning.
- All ten sheets are built (`elements-<element>-sheet.qmd`, made 24 Oct 2026 from the lesson pages; each card's example is
  one or two measures of the lesson's). The sheet text is condensed from the lessons, so it carries the same unchecked items.
- Backing Track habits (on every Elements page, `window.AX_PARTS` in the kit): click a note or rest to play from its measure
  (or jump there while playing); "Show" checkboxes per part on examples with more than one V: voice (a hidden part is still
  heard); "Show notation" (by the names switch and in each sheet's bar, localStorage `el-notation`) hides every staff.
  Limits: clicking empty staff does nothing (abcjs only reports notes and rests); if the samples fail and abcjs's own synth
  plays, it starts from the beginning; abcjs marks the clicked note in its selection colour.
- Rendering a new page while `quarto preview` runs can render it outside the project (no site libs, `AnchorJS is not a
  constructor`). Fix: delete `.quarto/project-cache` and render again.

## Proposal: grades 6–10 (MYP Years 1–5)

A spiral: every element appears every year, each year adding vocabulary and asking for more precise description. Grade 10
is the whole handout. MYP links: the vocabulary is what students use for Criterion A (investigating styles), B (stating
and justifying choices), C (performing/creating with it) and D (evaluating with it).

| Element | Grade 6 (MYP 1) | Grade 7 (MYP 2) | Grade 8 (MYP 3) | Grade 9 (MYP 4) | Grade 10 (MYP 5) |
|---|---|---|---|---|---|
| **Articulation** | staccato, legato | accent, slur vs tie | tenuto, glissando; pizz./arco | con sordino, tremolo, vibrato, double stopping | all techniques; choosing them for a purpose |
| **Dynamics** | loud/quiet; *p* *f* | *pp*–*ff*, crescendo, diminuendo | *sfz*; describing changes in order | terraced vs gradual; dynamics by period | full range; dynamics as evidence of period |
| **Harmony & tonality** | major / minor by ear | key signatures to 1–2 sharps/flats; triads I IV V | relative minor (raised 7th); authentic and plagal cadences | all four cadences; modulation; modal, pentatonic, atonal | Picardy third; 7ths and extended chords; analysis |
| **Instruments** | the four families; band instruments | voice types, SATB; ensemble sizes | orchestra high to low; roles (melody, bass line…) | rock/jazz line-ups; rhythm section and front line | orchestration described precisely |
| **Melody** | up/down, step/leap, high/low | repetition, contrast, range | sequence, ostinato, intervals to the 5th | imitation, triadic, chromatic, all intervals | scale-degree names; ornaments |
| **Metre** | the beat; 2, 3 or 4 beats | 2/4, 3/4, 4/4; common time | 6/8; simple vs compound | 9/8, 12/8; cut time; irregular (5/4, 7/8) | changing metres; describing by ear |
| **Rhythm & tempo** | long/short; fast/slow | whole to eighth notes and rests; Italian tempo words | dotted notes, ties, sixteenths; BPM | triplets, syncopation, accel./rit., fermata | swing, rubato; dictation |
| **Structure** | beginning / middle / end; verse and chorus | AB (binary), ABA (ternary) | rondo, strophic; intro/outro/bridge | theme and variations; AABA; 12-bar blues | minuet and trio; through-composed; analysis |
| **Style** | pop vs classical | rock, blues; film music moods | jazz and blues features; musical theatre | Baroque, Classical; minimalism | Romantic; comparing any two styles with evidence |
| **Texture** | one sound vs many; thin/thick | monophonic, melody + accompaniment | homophonic; call and response | polyphonic, imitation, pedal/drone | Alberti bass, basso continuo, antiphonal |

How it could work on the site: tag each section (or row) with the grade it is first taught (`data-grade="8"`), and add a
"Show up to grade…" menu beside the British-names switch that folds away later material and limits the quizzes to it.
Not built yet.
