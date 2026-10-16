# Adding a style to the Backing Track band

For a Claude session asked to add a style ("add a samba", "a second-line groove", "a gospel 6/8").
Read this first, then the header comments of the files it names. `NOTES.org` beside this file is the
history of the band and its open questions.

## What a style is

A style is a row in `styles` in `catalog.js`: a name, a group (the genre heading in the Style menu),
and defaults that belong together.

    { id:"bossa", label:"Bossa nova", group:"Latin", genres:"Bossa nova, slow samba",
      feel:"straight", bass:"bossa", rhythm:"bossa", drums:"bossa", voicing:JAZZV,
      desc:"Root-and-fifth bass with pickups, a two-bar comping pattern and the bossa clave." }

- `bass`, `rhythm`, `drums` are ids of entries in the `bass`, `comp` and `drums` lists of the same file.
  `rhythm` may be several joined by `+` (a blend).
- `voicing` is `{ piano, guitar }`: a voicing style id for each (`PLAINV`, `STRUMV`, `JAZZV` are ready-made).
- Optional: `sound` (`{ bass:"upright"|"electric", cymbal:"ride"|"hat"|"bell", piano, guitar, lead, kit }`),
  where `piano` and `guitar` are sound ids from `sounds.js` (`BandSounds.sounds("guitar")` lists them: jazz, steel, nylon,
  clean and distorted electric),
  `push` (chords anticipate), `full` (the piano's triads keep all three notes),
  `bass` and `drums` may each name several patterns joined by `+` (a blend: one of them per bar, planned four bars at a time by `BandHarmony.blendOpts`; shares in `opts.bassMix` / `opts.grooveMix`),
  `calm` (strike and hold the chords around cadences and in bars with more chords than usual: `BandHarmony.calmAt`; a chart marks phrase ends with `"^phrase"` and single bars with `"^plain"`),
  `halfRhythm` (comping rhythm ids, `a+b`: what the comping plays in bars of half time instead of its own rhythm), `time` (`{ feel:"half", parts }`), `ext:true` (unmarked extensions on offer).
  A style with no `sound` gets upright bass, ride, piano, jazz guitar.

A style made only of parts that already exist is one line in `styles` plus the fit lists (step 3).
Most requests need at least one new part. Decide that first: listen in your head to what the bass,
the chord instrument and the drums each play in that music, and check each against the existing
entries before writing a new one.

## Steps

1. **Write the new parts**, each in its own engine file. Copy the nearest existing pattern and read the
   comment block above the table you are adding to.
   - Bass line: `LINES` in `bass.js` (a fixed figure over the chord's root, fifth, octave).
   - Comping rhythm: `GRID` in `comp.js` for a set pattern, `FIG` for a one-bar swing figure.
   - Drum groove: `GROOVES` in `drums.js` (`bars` for 4/4, `threeBars` for 3/4, `triplet` for 12/8 feels).
   - Congas: `PATTERNS` in `congas.js` (see Congas below).
   - Positions are beats from 0; `x.5` is the off-beat eighth (swung by the player unless the event says
     `straight:true`). Velocities are 0..1 and the player scales them by the band's intensity.
   - Use `ctx.phrase.bar` (0..3) to shape four-bar phrases and `ctx.intensity` for how hard the band is
     playing. `phraseDyn`, `leanDyn` and `spread` in `comp.js` are the shared dynamic shaping: use them
     rather than fixed velocities.
   - Every pattern must cope with 3/4 and with a bar holding two chords. The tests check both.
2. **Describe each new part** in `catalog.js`: an entry in `bass`, `comp` or `drums` with `id`, `label`,
   `feel` (`swing`, `straight` or `any`), `group`, `tags` and a `desc` that says what is played on which
   beats, in a musician's words. The `desc` is shown on the page and on the Accompaniment Styles page.
3. **Say where each part fits**: add its id to `FITS.bass`, `FITS.comp` or `FITS.drums` with the style ids
   it belongs in (your new one, and any existing style it also suits). Locked, a menu lists only what
   fits the chosen style, so a part missing from `FITS` cannot be chosen. Add the new style id to the
   voicing lists it should offer (`JAZZ`, `POP`, `PLAIN`, or a `VOICE` row).
4. **Add the style row** to `styles`, in its group. The `id` is permanent: saved setups, links and song
   files name it. Never rename one.
5. **Tests** (plain node, run from the test's own directory):
   - `tests/band/pat/t_patterns.js` runs every style and option against every meter. It has a `want`
     table of where chords must land for set patterns; add your rhythm there.
   - `tests/band/pat/t_pop.js` lists the style ids of some groups in order; update the list if you added to one.
   - `tests/band/styles/t_sections.js`, `tests/band/fills/t_fills.js`, `tests/band/meter/t_change.js`
     must still pass.
6. **Publish it to the pages.** In `tools/_backing-track.qmd` and `tools/_accomp-styles.qmd`, raise the
   `?v=` number on every script you changed (browsers cache them). Then
   `quarto render tools/backing-track.qmd` and check that `.gitignore` did not change (Quarto appends to it).
   The lyrics site copies the engine: `bash ~/Projects/carols/tools/build.sh`.
7. **Write its pages.** A style is taught as well as played:
   - **Style Notes** (history and listening): `styles/<style id>.qmd`, linked from the page by `BandCatalog.article(id)`. Copy
     `styles/swing.qmd`: What it is, A little history, The band's version (and what it leaves out), Listening, Sources. Add it to
     `styles/index.qmd` under its group, and end it with `<script src="/apps/shared/lessons/sections.js?v=1"></script>`.
   - **Pattern lessons**: every new bass line, comping rhythm, drum groove or conga part needs a `PLAN` entry (ladder, tips) in
     `scripts/pattern-lessons.mjs`, its style a `STYLE` chart, and any rhythm it shares a `SAME` group; then
     `node scripts/pattern-lessons.mjs` (it lists parts with no plan) and `quarto render lessons/patterns`.
   - **A lesson** when the style needs teaching beyond its patterns, or when two styles overlap (`lessons/stride-boogie.qmd`):
     `.ar-demo` examples from `lessons/_arrange-kit.qmd`, listed in `lessons/index.qmd` and the Lessons menu in `_quarto.yml`.
   - The pages that load a changed engine file include every lesson that has a band: bump `?v=` in all of them
     (`grep -rlE 'band/(bass|comp|catalog)\.js\?v=' --include='*.qmd' lessons tools`) and render them.
   - Check: `tests/band/lessons/patterns.cdp.js` with `PAGES=` the new lessons (copy `_site/lessons/patterns` into `tests/band/lead/site/lessons/`).
8. **Say what was not verified.** Nothing here can be listened to from a terminal. Report the pattern
   in beats, what the tests cover, and that it needs ears. Do not commit unless asked.

## Congas

The conga player (`congas.js`) is a part of its own beside bass, comping and drums: it has its own fader, staff and MIDI track, and any
style may have it. Adding a pattern:

1. `PATTERNS` in `congas.js`: `id: { bars: [...], three: [...], triplet: [...] }`. `bars` is one or two 4/4 bars (a two-bar pattern
   follows the bar number); `three` is one bar of 3/4 and `triplet` one bar of 12/8, both optional. A bar is a list of rows
   `[pos, drum, stroke, hand, vel]`: `drum` is `"c"` (conga, the higher drum) or `"t"` (tumba); `stroke` is `H` heel, `T` toe, `S` slap,
   `O` open, `M` muffled, `B` bass; `hand` is `"L"` or `"R"`. Positions are beats; 12/8 positions are thirds of a beat (x.333). A pattern
   with no bar for the meter plays the `steady` one, so it can stay short.
2. `congas` in `catalog.js`: `{ id, label, feel, group, tags, desc }`; the `desc` says which stroke falls on which beat, with which hand.
3. `FITS.congas`: the style ids it belongs in (`steady` and `none` fit every style).
4. A style that should have them says `congas:"id"` on its row in `styles`. Left out, the style has none.
5. `tests/band/congas/t_congas.js` checks every pattern in every meter, and that the other players play the same notes with or without them.

Sounds: the congas are one sample set (`congas` in `sounds.js`) built from the soundfont's three conga notes; a new stroke is a new piece name
there, a trim, and its place in `BandNotation.congaName` and the `GM` table in `midi.js`.

## Where a style can be asked for

- The Style menu of the Backing Track page; `?style=id` in its address.
- A tune's ABC: `%%style bossa nova` above the first `P:` line (the whole tune).
- One section: `%%style bossa nova` on the line under its `P:` line, or `"^style bossa nova"` in a bar
  (from that bar to the next section; `"^style none"` ends it early). The form bar carries `style`, and
  `BandCatalog.sectionOpts` turns it into the options for those bars. Single parts can follow the
  name: `%%style Swing; voicing drop2; rhythm charleston; bass two; drums funk; feel straight`.
  The comping moves to the instrument the style is built around (`sound.lead`), if it has one. The
  page's blend sliders and walk amount do not apply inside such a section.
  On the Backing Track page the Band menus change to a section's settings as it starts, and a change made there
  stays with that section (`opts.sectionOverrides`, which the player puts before the section's style).
- A crash grabbed with the hand: `"^choke"` in a bar (the crash on its beat 1, stopped before beat 2), beside `"^fill"` and `"^stop"`.
- Two built-in setups in `presets.js` ("Style demo: ...") tour the jazz and the pop, rock and country
  styles a section at a time. Add a new style to the one it belongs in.
- A lyrics-site song file (`~/Projects/carols/site/extra/*.cho`): `{style: carol}` above the first
  heading for the song, or under a heading for that section. See the top of `tools/chordpro.py` there.
- A name matches an id, a menu label, or part of a label, ignoring case.

## Rules of the house

- Plain JS globals, no build step, no dependencies. Match the comment density and voice of the file.
- A new option is opt-in: an existing style must sound exactly as it did, and an option left unset
  must not draw from the random number generator (the tests compare runs).
- Sample sets are named only in `sounds.js`. A new sound is one entry there (`family`, `label`, zones, and an
  optional amp `chain`); the Comping menu, the player and `styleOpts` pick it up from that entry. Add its
  General MIDI program to `PROGRAM` in `midi.js`, and its samples to `tests/band/meter/fetch-samples.js`.
- Write descriptions for a music teacher: beats and instruments, no code words.
