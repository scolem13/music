# everything-music-site

- Adding or changing a Backing Track style, bass line, comping rhythm or drum groove: read
  `apps/shared/band/ADDING-STYLES.md` first.
- The band's history, open questions and what nobody has listened to yet: `apps/shared/band/NOTES.org`.
- Tests and headless page drivers: `tests/band/README.md`.
- The tonewheel organ (tonebars, swell pedal, Leslie, and the rules the band's organist follows, with sources):
  `apps/shared/band/ORGAN.md`.
- The Notation page (`tools/_notation.qmd`, model `apps/shared/notation-doc.js`): chunks, sections, voices, chords, words, takes.
  At its top, Play it in: takes from a MIDI keyboard (Space / sustain pedal; Shift+R redo, Shift+Backspace drop), each a chunk of its own;
  notes in the count-in of the first take make a `Pickup` chunk (`chunk.pickup`, a short first bar, up to a bar less one eighth). The
  other ways in (letters, rhythm bank, chords, words, the older Play it in time) are in the right sidebar. Test: `node tests/abc/notation-quick.cdp.js`.
  DWIM there (re-reading a take, kept with the chunk) is documented in `apps/shared/NOTATION-DWIM.md`, as are phrase seams
  (the bar shared by a phrase's end and the next one's pickup; `apps/shared/phrase-seam.js`, `NotationDoc.writeLeadIn`; after
  Timestamp Notes' `nt-goto` a Play it in take goes into that phrase, count-in notes into the bar before; `node tests/abc/phrase-seam.test.js`). It opens the Backing Track
  as a remote window (`bt-load`, `bt-focus`, and `bt-setup` reports back). Tests: `node tests/abc/notation-doc.test.js`,
  `node tests/abc/notation.cdp.js`.
- Non-harmonic tones (passing, neighbour, suspension 4-3, ...) of a melody against its chord symbols:
  `apps/shared/abc-nht.js`, over `abc-events.js`; not on any page yet. Tests: `node tests/abc/nht.test.js`.
- ABC reading for the assessments (`apps/shared/abc-core.js`, and `abc-pitch.js`, `abc-rhythm.js`, `abc-tune.js` over it):
  a page loads `abc-core.js` before any of them. After changing them run `node tests/abc/compare.js` (old vs new on
  every tune and pattern; how to run the browser check is at the top of `tests/abc/pages.cdp.js`).
- The tune collection (`apps/tunes/tunes-object.js`): after importing or editing tunes run
  `node scripts/clean-tunes.mjs --write`. It normalises the ABC, bakes `%%id`, and tags tunes that still
  fail a parse/bar-length check `needs-repair`; the Tune Library hides those unless the Tags filter asks for them.
- The sound-design lessons (`lessons/sound-*.qmd`, 24 of them: harmonics to signal chain,
  in the order of `_quarto.yml`) are widgets from `apps/shared/lessons/synth-kit.js` (kinds and
  attributes documented at its top), included via `lessons/_synth-kit.qmd`. Plain Web Audio, nothing shared with the band.
  Tests: `node tests/lessons/sound.cdp.js` (after rendering).
- The Vocal Warm-up (`tools/vocal-warmup.qmd`, `apps/shared/vocal-warmup.js`): a routine built from the Set up form (stretches,
  breathing, piano-led patterns, two band grooves). Tests: `node tests/lessons/warmup.cdp.js` (after
  `sh scripts/render-test-page.sh tools/vocal-warmup.qmd`; the band check skips when no samples can load).
- Timestamp Notes (`tools/timestamp-notes.qmd`, was the Big Timestamp Player; `apps/shared/timestamp-player/`): audio (YouTube
  link or file), S a section stamp with a label menu (`section-labels.js`, `TsLabels`: words, solos, letters A A′ B …, Other; repeats
  numbered, choruses per soloist; lesson `lessons/section-labels.qmd`; test `node tests/lessons/section-labels.test.js`,
  `node tests/lessons/section-stamps.cdp.js`) in the same list as C notes; the MIDI keyboard connects in the right sidebar; words and chords pasted from Ultimate Guitar and turned into ChordPro (`apps/shared/ug-chordpro.js`), S stamps
  the next section from the words, B taps each downbeat, then Send on: the Notation page (`?remote=1`, `nt-ready` / `nt-chordpro`)
  or the Backing Track (`bt-load`), each section's chords spread over its tapped bars at the tapped tempo. C stamps, Shift+L loops,
  Space plays, arrows / h l go 5 s; a bar's own Beats (meter change) goes out as a `{time:}` that `fromChordPro` reads mid-song.
  Fill from the tempo (`bar-map.js` `extrapolate`): bars after / between the taps from the tapped tempo, spread evenly between
  section stamps, heads and solos snapped to whole choruses; guessed bars kept apart (`guessed`), a B tap among them re-anchors.
  Halve / Double bars rescale the taps (warning first about irregular bars; Undo). Chord timing (`live.js`): N, or MIDI all at
  once (left hand one note = bar, two = section; right hand = chord hits, matched to the ChordPro's chords in order), placed per
  bar and rounded; sent as `nt-doc` (a whole doc). The stage shows the current section's words large (drag its grip taller) and the next section's first line; the chord grid
  (tune-chart.js, as on the Backing Track) shows each chord as it is hit (the rest once confirmed). At
  each pause timed sections are written into the ChordPro as `{start_of_grid}` blocks (`UgChordPro.grids/gridBlock`); a grid edited
  there is the section's timing until its hits change. Now playing sits in the right column (Float / Pin, A− A+).
  Correct chords (MIDI): a bar played in is rewritten with the chord named from its notes (`ChordEntry.analyse`); bars played
  through keep theirs. A meter change inside a section splits it (`_cont` pieces) so charts show it. The Backing Track's Melody tab
  opens the Notation page (`nt-abc`); its Show bar has Side by side (notation beside the grid).
  Sent to the Notation page every named part is a section, chunks labelled by `NotationDoc.chunkLabels` (I1a, V1a, PC2b, A3a).
  The Notation page's score has a Show menu (whole piece or one section). Every part folds, with a jump
  sidebar (`page-nav.js`). One song file (.json:
  stamps, bar map, words, chord hits, the link) saves everything; older .txt / bar-map .json still open.
  Phrases (`phrases.js`, `TsPhrases`): each section cut into 2/4/8-bar phrases, each looped from its lead-in (pickup, up to 2 bars,
  the phrase before keeps a beat; P, `,` `.`, `-` `=`); T / Notate sends `nt-goto` (the Notation page answers `nt-need-doc` when it
  lacks the section, then gets `nt-doc`), its Back button `nt-back` loops the next phrase. Test: `node tests/lessons/phrases.test.js`.
  "Follow in a tab" when YouTube refuses. The site's search has no keyboard shortcut (`_quarto.yml`), so letters stay free. Tests: `node tests/abc/ug-chordpro.test.js`, `node tests/lessons/timestamp.cdp.js`
  (after `quarto render tools/timestamp-notes.qmd` and `tools/notation.qmd` into `_site`).
- Pitch from the microphone (YIN, a mic helper, the strobe bank, target pitches in 12-ET / just / 31-ET / cents):
  `apps/shared/pitch-detect.js` (`window.PitchDetect`; the Tune Assessment uses it). The `tuner` (strobe) and `bendboard` widgets are
  synth-kit kinds (documented at the top of `synth-kit.js`); `LessonDiagrams.bendboard` is in `diagrams.js`. A page with its own fixed
  bottom bar sets `window.SK_NO_BAR = true` before `_synth-kit.qmd` (guitar-bends does). Tests: `node tests/lessons/tuner.test.js`
  (no browser), `node tests/lessons/tuner.cdp.js` (after rendering `lessons/tuning-systems`, `lessons/guitar-bends`, `practice/assessment-tune`).
  The strobe drawing and target text are `apps/shared/strobe-view.js` (shared by the `tuner` widget and the navbar panel). The **navbar Strobe tuner**
  (`apps/shared/tuner-panel.js`, loaded on first open by `practice-widgets.js`) listens to the microphone, to **this page's sound**, to a page
  video/audio, or to another tab (`getDisplayMedia`, Chrome). Sound sources hand their master to `window.AudioTap.register(ctx, node, label)`
  (`apps/shared/audio-tap.js`, in the head of every page; drone, synth-kit, `audio.js`, the band do); the tuner analyses inside the source's own AudioContext, so
  no bridge is needed. Lesson: `lessons/strobe-tuner.qmd`. Tests: `node tests/lessons/tuner-panel.cdp.js` (after rendering `index` and `lessons/strobe-tuner`).
- Audio pre-flight (`apps/shared/audio-check.js`, `window.AudioCheck.run()`): Chrome note, a soft test sound (capped at
  -24 dBFS, steps up from -48) that tells speakers from headphones and measures latency, then a mic level meter; returns
  getUserMedia constraints; `ensure()` reuses it for the tab (sessionStorage `audio-check-v1`). Used by pitch-detect, synth-kit, the
  assessments, the Backing Track and `tools/webcam-demo.html`. Page tests that open the mic seed that key so the dialog stays shut.
  Tests: `node tests/lessons/audiocheck.cdp.js` (after rendering `practice/assessment-tune`).
- Dictation (`practice/dictation.qmd`, grader `apps/shared/dictation.js`): plays a Reading Benchmarks line, opens the Notation
  page as a remote window (`?dictation=1`: a scratch doc kept apart from the user's own; `dict-load`, `dict-replay`, `dict-submit`),
  grades the handed-in ABC note by note (pitch, rhythm, extra notes). Tests: `node tests/abc/dictation.test.js`,
  `node tests/lessons/dictation.cdp.js` (after rendering both pages).
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
- The IPA chart (`tools/ipa-chart.qmd`, `apps/shared/ipa/`): its vowel trapezoid is draggable through `ipa-synth.js` (`window.IpaSynth`,
  a four-formant voice; API at its top). The lesson `lessons/vowel-formants.qmd` (F1, F2, F3, singer's formant, formant tuning) uses
  the same synth. Tests: `node tests/ipa/ipa-chart.cdp.js`, `node tests/lessons/formants.cdp.js` (after rendering both pages).
