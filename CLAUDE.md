# everything-music-site

Open work: `TODO.md` (a map; each item names the file holding the detail).

## Where things are documented
A CLAUDE.md inside a folder loads by itself when you work there; the `.claude/docs/` ones you read before touching that feature. If a task names a feature below, open its doc first.

- Adding or changing a Backing Track style, bass line, comping rhythm or drum groove: read
  `apps/shared/band/ADDING-STYLES.md` first.
- The band's history, open questions and what nobody has listened to yet: `apps/shared/band/NOTES.org`.
- Tests and headless page drivers: `tests/band/README.md`.
- The tonewheel organ (tonebars, swell pedal, Leslie, and the rules the band's organist follows, with sources):
  `apps/shared/band/ORGAN.md`.
- MODX band / percussion auditions, Walking Bass Generator, outputs to a mixing desk, phrases, workstation arpeggiator, Style Arranger: `apps/shared/band/CLAUDE.md`
- Tunings beyond twelve notes (tuning-kit: scale, pitchgrid, microfret, raga, unevenfret, splitkeys, tunesong), Blues Tonality, Everyday Tonality (Tagg), Grooves vs Songs lessons: `apps/shared/lessons/CLAUDE.md`
- Notation page, Dictation, the two-column tool layout (`tools/_notation.qmd`, `apps/shared/notation-doc.js`, `panel-columns.js`): `.claude/docs/notation.md`
- Timestamp Notes, phrases, recording bar maps (RecordingFollow): `apps/shared/timestamp-player/CLAUDE.md`
- Tap Along: `apps/shared/tap-along/CLAUDE.md`
- ABC reading (abc-core, pitch/rhythm/tune), non-harmonic tones, the tune collection: `.claude/docs/abc.md`
- Full scores (MusicXML → ABC, FullScore player, Rimsky examples), RecSync (score played by its recording), Analysed Scores Library, Harmony by the Numbers: `scripts/full-score/CLAUDE.md`
- Works data, Tune Directory sheet, Hooktheory / Real Book rows, suspect tunes, print anthologies (Cutler, Tagg), Hutchinson clips / figures, PDMX scores: `apps/shared/works/CLAUDE.md`
- Words & Chords (songs site, ChordPro build, SongKey, lead-in): `apps/shared/songs/CLAUDE.md`
- Tonal Patterns / Sequences, Patterns by Ear, Hearing Harmony, Bass Lines by Ear, Odd Progression Out, Blues Changes by Ear: `apps/patterns/CLAUDE.md`
- MLT Books (mlt-walk, DMTI, JRI sax, sax home, Establish, lesson builder, Rote Song), MLT / JRI recordings (R2, catalogue, ear grid), MLT blogs as books: `apps/shared/mlt/CLAUDE.md`
- Rhythm Library, Mode & Raga Library, Sargam / Swara / Jianpu, Polyrhythm, rhythm chant, sung solfège: `.claude/docs/libraries.md`
- Scale Patterns, Piano chord songs + PianoFingering / UnderNotes, Chord Analysis, Student reports (SiteRecord), ABC editor + Tunes page, JustinGuitar links: `.claude/docs/tools-misc.md`
- Saxophone, trumpet / tuba, Kjos W74 band instruments: `.claude/docs/instruments.md`
- Guitar Input Check, pitch detection, tuner, Mixer, AudioTap, audio pre-flight, MIDI feel / learn, Chunk Practice, Vocal Warm-up, Guitar Tuning: `.claude/docs/audio-pitch-midi.md`
- New instrument pages from user-supplied files (diagram SVG/AI + scanned book PDF → lesson, interactive fingering chart, Patterns by Ear): `.claude/docs/instrument-pages.md`
- Course pages (pathway through the MYP/DP rubric, enrichment with MLT levels, the MYP/DP/TOK glossary; `course/`, data from `course/glossary.org` and the Task Sheets org file, linked to Learning-Experiences): `course/CLAUDE.md`
- Help-eye folding, click-to-type slider numbers, the folding sidebars, stacked figures in text (fig-stack.js): `.claude/docs/page-ui.md`
- Live Sound lessons (X32 channel strip, problem audio): `apps/shared/lessons/live-kit.js`, see `apps/shared/lessons/CLAUDE.md`
- Lesson widgets (synth-kit, rec-kit, compose-kit, gear diagrams, sing check, chord-taught, tool catalogue): `apps/shared/lessons/CLAUDE.md`
- Elements of Music lessons (school handout, US/UK note names, grade 6–10 plan): `lessons/ELEMENTS-NOTES.md`
- Lesson pages (sidebar/listing/`has:`, Write an Ending, Sing and Notate, notation steps): `lessons/CLAUDE.md`
- DAW lessons: `apps/shared/daw/CLAUDE.md` · DJ / Sampling: `apps/shared/dj/CLAUDE.md` · Theory Drills: `apps/shared/drills/CLAUDE.md`
- Classical Themes, ornaments: `apps/themes/CLAUDE.md` · IPA chart and vowel formants: `apps/shared/ipa/CLAUDE.md`

## Site-wide
- **The "bah" / solfège singing voice is HIDDEN site-wide** (uncanny valley): switch `window.VOICE_HIDDEN` in `_includes/head.html` (true = hidden; code untouched; details in rhythm-chant.js header "VOICE HIDDEN"). Notes below about hearing it describe what returns when it is false.
- Site password and hosting: the Worker `music` (`wrangler.jsonc`, `worker/index.js`) serves `_site` at music.seancoleman.org behind one password (secret `SITE_PASSWORD`; change with `npx wrangler secret put SITE_PASSWORD`) and the recordings at media.seancoleman.org to logged-in browsers; Workers Builds deploys each push to main. A book step plays tracks with `recordings: [ids]` (mlt-walk.js). Test `node tests/mlt/recordings.test.js` (`NEG=1` must fail)
- Notation size, site-wide: `--abc-zoom` / `ABC_ZOOM` (1 = every page's own size), set by `ABCJS.setZoom(z)`, slider `ABCJS.zoomControl()`, kept in localStorage `abc-zoom` (code at the end of `apps/shared/abcjs-basic.js`). Fixed-width renders multiply `scale` by it; `responsive:"resize"` renders fill their box, so cap the box with `max-width:calc(<width> * var(--abc-zoom,1))` (MLT pages do, 40rem). Slider so far only in the MLT view bar.
- Numbers under notes from the chord (R 3 5 ♭7) or the key (1 2 ♭3): `apps/shared/degree-frame.js` (global DegreeFrame: one site-wide choice, `toggle()` control, `keyName(semis)`); used by the blues melody lessons. Words under notes in `LessonScore.engrave` get `minPadding` so labels don't touch (`wordGap`).
- Bottom strip Stop: `PlayBar.attach(bar, { stop: btn, live })` enables Stop while anything reports sound via `PlayBar.sounding(id, stopFn | null)` (LessonScore and AbcPlay do) and stops all of it.
- Sources: every cited source is in `scripts/works-cited.py` (MLA 9, with the pages that use it). `python3 scripts/works-cited.py`
  rewrites each page's Works Cited block (between `<!-- works-cited` markers) and writes `bibliography.qmd` (every source, with
  links to the lessons using it). Add a source there, not on the page; sources for a group of pages go in `scripts/sources/*.py` (one file each, `SOURCES = [...]`, `who="student"` / `"teacher"` splits a page's list under For students / For teachers; duplicates across files merge). `bibliography.qmd` is the last entry of the lessons sidebar.
- Rules for any new tool or lesson (learned the hard way):
  1. New ABC is checked by a script for bar lengths (`AbcTune` / the check in `scripts/clean-tunes.mjs`), never only counted by eye.
  2. Changing a shared script needs no `?v=` bump and no re-render (since 2026-11-04): the Worker serves every file with
     `Cache-Control: private, no-cache` and an ETag, so each browser re-checks scripts on every load (worker/index.js; header of
     `scripts/check-pages.mjs`). The `?v=` numbers already in pages are harmless leftovers; new pages may leave them off. Run
     `node scripts/check-pages.mjs` before committing a new page (warnings for rule 3 and pages with no `## ` headings). When pages
     themselves change, render a folder at a time (`quarto render lessons`), not page by page: one Quarto start-up per folder.
  3. Sound: ABC plays through `AbcPlay.play(visualObj, { sound, qpm, transpose, onEnd })` (`apps/shared/abc-play.js`: the band's
     samples timed by abcjs, ornament signs played out by `ornament-play.js`, the sounding notes lit `abc-on`; abcjs's synth only as its fallback), not `ABCJS.synth`; other notes
     through `BandSounds` (`spec.bend` slides pitch). With chord symbols (`opts.abc`) the band plays them with the melody (`opts.style`), and `AbcPlay.chords` plays only held piano
     chords. Lesson examples (`abc-ex.js`: `data-sound`, `data-style`, a "▶ Chords" button when there are chords; test
     `node tests/lessons/abc-play-band.cdp.js`) use it; every tune player is on it (Tunes, Songs,
     Dictation, Write an Ending, Reading Swing (`opts.swing`), Notation, LessonScore, AbcTab; tune melodies on wind/string sounds: family
     "melody" in `band/sounds.js`, test `tests/tunes/tunes-play.cdp.js`). Still on `ABCJS.synth` on purpose: the rhythm and pattern pages,
     and one-note click previews (the Tune Assessment moved to `AbcPlay` `tracks` on 2026-11-09: its own Arranger's parts on the band samples; test `tests/tune-assessment/tune-assessment-play.cdp.js`). Every new AudioContext registers with `AudioTap.register`.
  4. A fact or quotation from memory is checked and cited in `scripts/works-cited.py` before it ships, or marked unverified.
  5. abcjs timing at a chosen tempo: whatever is passed to `setTiming(bpm)` must also go to `millisecondsPerMeasure(bpm)`; called bare it
     uses the tune's Q:, and the melody drifts against the band (fixed 2026-10-28 in `abc-play.js`, `analysed-scores.js`;
     the 2026-10-13 pickup fix in NOTES.org was the same symptom, other cause). Test `node tests/lessons/abc-play-align.cdp.js`.
  6. Page tests serve their own samples: see "Samples in page tests" in `tests/band/README.md`.
