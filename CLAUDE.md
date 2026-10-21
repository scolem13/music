# everything-music-site

- Adding or changing a Backing Track style, bass line, comping rhythm or drum groove: read
  `apps/shared/band/ADDING-STYLES.md` first.
- The band's history, open questions and what nobody has listened to yet: `apps/shared/band/NOTES.org`.
- Tests and headless page drivers: `tests/band/README.md`.
- The tonewheel organ (tonebars, swell pedal, Leslie, and the rules the band's organist follows, with sources):
  `apps/shared/band/ORGAN.md`.

Feature docs. A CLAUDE.md inside a folder loads by itself when you work there; the `.claude/docs/` ones you read before touching that feature.
- Notation page, Dictation, the two-column tool layout (`tools/_notation.qmd`, `apps/shared/notation-doc.js`, `panel-columns.js`): `.claude/docs/notation.md`
- Timestamp Notes, phrases, recording bar maps (RecordingFollow): `apps/shared/timestamp-player/CLAUDE.md`
- Tap Along: `apps/shared/tap-along/CLAUDE.md`
- ABC reading (abc-core, pitch/rhythm/tune), non-harmonic tones, the tune collection: `.claude/docs/abc.md`
- Pitch detection, tuner, Mixer, AudioTap, audio pre-flight, MIDI feel / learn, Chunk Practice, Vocal Warm-up, Guitar Tuning: `.claude/docs/audio-pitch-midi.md`
- Scale Patterns (`tools/scale-patterns.qmd`, `apps/shared/scale-patterns.js`: SCALES / PATTERNS / STYLES / INSTRUMENTS tables; Hanon 1-20 note for note in `hanon-part1.js`, read from Mutopia's LilyPond, CC BY-SA; instrument facts unverified until the band notes replace them): tests `node tests/scales/scale-patterns.test.js`, `tests/scales/scale-patterns.cdp.js`
- Help-eye folding, click-to-type slider numbers: `.claude/docs/page-ui.md`
- Lesson widgets (synth-kit, rec-kit, compose-kit, gear diagrams, sing check, chord-taught, tool catalogue): `apps/shared/lessons/CLAUDE.md`
- Lesson pages (sidebar/listing/`has:`, Write an Ending, Sing and Notate, notation steps): `lessons/CLAUDE.md`
- DAW lessons: `apps/shared/daw/CLAUDE.md` · DJ / Sampling: `apps/shared/dj/CLAUDE.md` · Theory Drills: `apps/shared/drills/CLAUDE.md`
- Classical Themes, ornaments: `apps/themes/CLAUDE.md` · IPA chart and vowel formants: `apps/shared/ipa/CLAUDE.md`

- Sources: every cited source is in `scripts/works-cited.py` (MLA 9, with the pages that use it). `python3 scripts/works-cited.py`
  rewrites each page's Works Cited block (between `<!-- works-cited` markers) and writes `bibliography.qmd` (every source, with
  links to the lessons using it). Add a source there, not on the page; sources for a group of pages go in `scripts/sources/*.py` (one file each, `SOURCES = [...]`, `who="student"` / `"teacher"` splits a page's list under For students / For teachers; duplicates across files merge). `bibliography.qmd` is the last entry of the lessons sidebar.
- Rules for any new tool or lesson (learned the hard way):
  1. New ABC is checked by a script for bar lengths (`AbcTune` / the check in `scripts/clean-tunes.mjs`), never only counted by eye.
  2. After changing a shared script, bump its `?v=` everywhere it is loaded (pages and scripts that load it lazily), or browsers keep the old copy.
  3. Sound: ABC plays through `AbcPlay.play(visualObj, { sound, qpm, transpose, onEnd })` (`apps/shared/abc-play.js`: the band's
     samples timed by abcjs, ornament signs played out by `ornament-play.js`, the sounding notes lit `abc-on`; abcjs's synth only as its fallback), not `ABCJS.synth`; other notes
     through `BandSounds` (`spec.bend` slides pitch). With chord symbols (`opts.abc`) the band plays them with the melody (`opts.style`), and `AbcPlay.chords` plays only held piano
     chords. Lesson examples (`abc-ex.js`: `data-sound`, `data-style`, a "▶ Chords" button when there are chords; test
     `node tests/lessons/abc-play-band.cdp.js`) use it; the older pages still on
     `ABCJS.synth` are switched one at a time. Every new AudioContext registers with `AudioTap.register`.
  4. A fact or quotation from memory is checked and cited in `scripts/works-cited.py` before it ships, or marked unverified.
  5. Page tests serve their own samples: see "Samples in page tests" in `tests/band/README.md`.
