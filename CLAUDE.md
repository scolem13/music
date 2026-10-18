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
  other ways in (letters, rhythm bank, chords, words, the older Play it in time) are in the right sidebar.
  Keys act on the active note (red: the selection, else the first note without a pitch): letters, z rest, T tie to the note
  before (t: to the next), U unpitch, u undo, Space play from the active note to the chunk's end (Play through ticked: to the piece's end, from that bar's start), j/k or a click on a chunk make its first note active, r record a take (new chunk below), I insert at the start, yy / DD copy / cut the chunk (the first DD asks y/n:
  Caps Lock), p / P put it after / before, Backspace delete, h/l notes, H/L bars (inside the chunk), i Insert mode (a caret), s split the chunk at the caret / before the active note (a cut inside a bar gives the second part a lead), o/O new chunk,
  v/V show/hide this chunk / the others (`chunk.off`), J Join (`D.merge`), M Merge (`D.combine`: rhythm-only + pitch-only chunk, or two
  the same length as two voices); J/M ask y/n to show hidden chunks first. Only a chunk with no rhythm collects pitches (stemless, `|` =
  `part.breaks`); in a chunk with rhythm `|` sets `chunk.lead` (a pickup). Every chunk starts on beat 1, or its lead before a barline,
  whatever ends the chunk before (`D.offsets`; invisible rest in the ABC, Join writes it in as rest). Tempo: written Q: (90 when unset; abcjs
  would play 180), and `[Q:]` in every voice where it changes. Keys are an ABC key with a mode (`Ddor`), or `hm` for harmonic minor (`Dhm`: written K:Dm, letters raise the 7th;
  `D.keyName`, `D.majorOf`); the menus are tonic + tonality + an enharmonic switch. Tempo: `doc.tempo` / `chunk.tempo` (`D.at`, Q:).
  Meter menus have Other... (two number boxes). Words follow ABC's w: rules (`-` syllables, `_` hold over the next note, `*` skip). The ChordPro ends with the notes as a
  `{start_of_abc}` block: with it, editing the ChordPro edits the piece (`D.fromChordPro` takes notes from the ABC, words from the
  ChordPro, keeping each word's syllables). Line breaks: `doc.lineEvery` (bars a line, a pickup bar not counted) and RET's own
  breaks `chunk.nl` (barline times from the chunk's start, drawn ↴; click or RET removes); with either, `toAbc` breaks lines there
  and at every chunk (`lines` in its result) and the score draws each line on its own. S starts a section at the active chunk
  (a heading row in Chunks, its name input focused, TsLabels names as a datalist; repeated words numbered); J / M refuse to cross a
  section start. Words: Paragraphs to sections (each paragraph a chunk heading Verse n). Play: the sounding note lit (`nt-playing`,
  abcjs TimingCallbacks mapped through the play map to the drawn lines); with chords the band plays the chords AND the notes (bar.melody on the
  parsed chart, so nothing drifts; band scripts loaded on first use, `makeBand`: `D.bandChart`, `doc.band.style` else "pop", tempo per
  bar, a Pickup chunk = the chart's short first bar after one bar of count-in; playhead from onBar/onBeat; 12 s without samples: the
  abcjs piano). Rhythm bank keys: 2 3 4 8 are always half, dotted half, quarter, eighth (shown when the ticked boxes give that note);
  patterns take 1 5 6 7 9. Play it in's Tempo shows the piece's tempo at the chunk; one typed there is the
  take's and goes on its chunk (`Q.bpmOwn`). The score draws each shown chunk on its own line (`drawChunks`: bars a fixed width, a mid-bar start padded so barlines line up). Test: `node tests/abc/notation-quick.cdp.js`.
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
- The sound-design lessons (`lessons/sound-*.qmd`, 25 of them: harmonics to chiptune,
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
- The Lessons read like a book: the `lessons` sidebar in `_quarto.yml` groups them by topic (parts), with Previous / Next.
  The Lessons index (`lessons/index.qmd`) is a Quarto listing (its `contents:` list, in order; template
  `lessons/_lessons-listing.ejs`), filtered by text, instrument, topic and Has. Each lesson's front matter carries `description`,
  `instruments`, `topics` and `has` (band, notation, fingering, interactive, svg, images; not `categories:`, which would print chips).
  A new lesson: add those fields, add it to the listing's `contents:` and to a sidebar section. `has:` is written by
  `node scripts/lesson-features.cjs` (headless Chrome over the rendered `_site` lessons; `--dry` only prints): rerun it after adding
  a lesson or changing what one shows, then render `lessons/index.qmd`.
- The large tools' page design (Timestamp Notes, the Notation page): two columns of folding parts plus a sidebar column of its own
  (jump links, staying put as the page scrolls). Every part moves between the columns (its header's ⇄, or drag its grip), kept in
  localStorage (`ts-columns`, `ntColumns`; Reset columns in the sidebar): `apps/shared/panel-columns.js` / `.css`. A part moved out
  of a group goes into a `.pc-shell` with the group's classes; scripts look inside their group with `PanelColumns.q(root, sel)` and
  find the group itself as `.group:not(.pc-shell)`.
- Tap Along (`tools/tap-along.qmd`, `apps/shared/tap-along/`): Timestamp Notes cut down for a phone, against a song playing in any
  other app. Its own clock; Mark taps 1 Bar / 2 Chord / 3 Section (the n-th chord tap is the sheet's n-th chord), Play's Sync puts the
  clock on the first tapped bar. Each tap has its button's lag taken off (localStorage `tap-latency-v1`), measured on Tap Latency
  (`tools/tap-latency.qmd`: metronome, four to count in, twelve taps per button). Song file `.tap-along.json`, not Timestamp Notes'.
  Test: `node tests/lessons/tap-along.cdp.js` (after rendering both pages).
- Long instruction paragraphs (class `*hint*` / `*-note`, 160+ characters, not `*warn*` / `aria-live`) start folded behind an
  lower-case i in a circle button: `apps/shared/help-eye.js`, in `_includes/head.html`. `data-help-eye="off"` keeps one open.
- Notation lessons (`lessons/notation-steps.qmd`, not in the sidebar yet): steps that frame the Notation page as `?stage=1`
  (`st-ready`, `st-load {show, doc, rhythm}`, `st-change {doc, abc}`; store `ntStageDoc`): only the panels a step lists are shown,
  keys for hidden parts do nothing, and the step's target (rhythm slots, `want`) unlocks the next. Add steps to its `STEPS` list.
  The page also has Save to file / Open file (`.notation.json`: `{ kind: "notation-doc", version: 1, doc }`, or ABC).
- The DAW lessons (`lessons/daw-*.qmd`, eight, in `_quarto.yml` after the Recording lessons; include `lessons/_daw-kit.qmd`):
  a small DAW, `apps/shared/daw/mini-daw.js` (`MiniDaw`; `<div class="mdaw" data-id data-preset data-show>`, documented at its top),
  playing the band's sounds (`BandSounds`) with its parts written by `BandMidi.generate` ("Session players"). Timeline, loop, click,
  step sequencer, piano roll, record from computer keys / MIDI, audio tracks from the mic (DAW 6: bleed, headphones, latency), quantize, clips, mixer, MIDI export, bounce to WAV, undo.
  Each lesson ends with an "In other DAWs" table (BandLab, Ableton Live, Logic Pro); DAW 8 (`daw-real.qmd`, no DAW on it) is a tabbed
  first-session checklist for each, every step linked to its manual page. Checked Oct 2026 against BandLab Help Center, Live 12 manual, Logic 12.3 guide. Test: `node tests/lessons/daw.cdp.js` (after rendering them).
- The Sampling and DJ lessons (`lessons/sampling-*.qmd`, six: what a sample is to the law; `lessons/dj-*.qmd`, seven: gear to a set;
  sidebar parts Sampling, DJing; include `lessons/_dj-kit.qmd`): `apps/shared/dj/turntables.js` (`Turntables`; `<div class="dj-tt" data-a data-b
  data-decks data-show>`, documented at its top): two decks (an AudioWorklet each: platter drag = scratch, rim = nudge, motor spin-up, pitch
  ±8/±16 % moving the key, cue, waveform, BPM / Tap, key + Camelot) and a mixer (gain, 3-band EQ with kill, filter, cue, faders, crossfader
  with curve, phones mix / split cue / Listen). `apps/shared/dj/sampler-pads.js` (`SamplerPads`; `<div class="sp-pads" data-loop data-slice>`):
  16 pads from a loop (equal / beats / at the hits, chops draggable), keys ZXCV…1234 and MIDI 36–51, repitch or OLA stretch per pad, a
  recorded, quantized pattern. Built-in loops are synthesised offline (`Turntables.DEMOS`, `demo:<id>`). Songs from elsewhere (the R2 hook):
  `Turntables.TRACK_SOURCES`; a manifest JSON named by `window.DJ_CONFIG.manifest`, `<meta name="dj-manifest">`, `data-manifest` or
  `Turntables.addManifest(url)` lists tracks (url relative to it), fetched CORS (the bucket needs a GET CORS rule); `Turntables.load(deck,
  src)` takes those, URLs, files, buffers. Both register with AudioTap. Test: `node tests/lessons/dj.cdp.js` (after rendering them).
- Sources: every cited source is in `scripts/works-cited.py` (MLA 9, with the pages that use it). `python3 scripts/works-cited.py`
  rewrites each page's Works Cited block (between `<!-- works-cited` markers) and writes `bibliography.qmd` (every source, with
  links to the lessons using it). Add a source there, not on the page. `bibliography.qmd` is not in `_quarto.yml` yet.
- Chord shapes taught in lessons: `node scripts/chord-taught.cjs` (after rendering the lessons into `_site`) records every chord diagram a
  lesson draws (LessonDiagrams) into `apps/shared/chord-taught-data.js`; the Chord Library shows "Taught in …" on matching cards, links to
  the lesson section in a card's details, and filters on it (Taught in a lesson, search word `taught`). Rerun it after adding or changing
  a lesson's diagrams. A lesson can draw library-checked shapes with `<div class="sc-shapes">` (`apps/shared/lessons/shape-cards.js`,
  documented at its top); each links to the library with `#…&shape=` (that card first, outlined). Test: `node tests/band/lessons/first-rock-song.cdp.js`.
- Lesson drawings (SVG): the house style is `apps/shared/lessons/DIAGRAMS.md` (schematic, site tokens, a colour = one role,
  labels and `<title>`s on the parts, placed by a tag, drawn by a script). Gear figures: `apps/shared/lessons/gear-diagrams.js`
  (`<div class="gear-fig" data-fig="connectors | jack-wiring | xlr-pins | balanced | signal-flow | keyboard-panel | midi-chain">`,
  documented at its top); used in `gear-cables` and `gear-keyboards`.
- Gear 3 (`lessons/gear-amps.qmd`) has two synth-kit kinds: `amp` (guitar or bass amp: Gain, tone stack with a Mid frequency, Master, power amp,
  Presence, Resonance, a Cabinet menu (`CABS`); sources guitar / bass are the band's samples via `BandSounds`, loaded on first use;
  "Vintage" = one Volume) and `pa` (one mixer channel: gain + peak, high-pass, EQ, monitor send into a wedge that can feed back,
  pan, mute, fader). Both have a View menu, Sliders / Knobs (`w.knobView()` in synth-kit; localStorage `sk-view`).
  Test: `node tests/lessons/amp.cdp.js` (after rendering it).
- Any slider's shown number can be clicked and typed into (`apps/shared/num-edit.js`, in `_includes/head.html`; a slider whose
  number is not its raw value sets `range.numEdit = {get, set}`, as synth-kit does; `data-num-edit="off"` opts out).
- Interactive tools catalogue: `node scripts/tool-catalog.cjs` scans `lessons/*.qmd` for widgets (synth-kit / recording-kit `data-w`
  kinds, kit classes in its `CLS` map, the Mini DAW, the framed Notation page) into `apps/shared/lessons/tool-catalog-data.js`.
  `lessons/tools.qmd` draws it (filterable, by family); `apps/shared/lessons/tool-links.js` (loaded on /lessons/ pages from
  `_includes/head.html`) adds a "Same tools in" box to each lesson's foot. Rerun after adding a lesson or widget; a new kit class goes in `CLS`.
- Guitar Tuning (`tools/guitar-tuning.qmd`, `apps/shared/guitar-tuning.js`): ear-first tuning, six methods (reference, drone,
  fifth-fret, harmonics, octaves, tuner with guess-before-you-see), any tuning incl. Custom (`GuitarTuning.parseTuning`), a fretboard
  to click, the mic via PitchDetect. Setup Check (`tools/guitar-setup-check.qmd`, `apps/shared/setup-check.js`): guitar/bass relief,
  buzz map, action, nut, 12th-fret intonation (mic) -> what to adjust and who (you / teacher / tech). Lessons
  `lessons/guitar-tuning-{ear,methods,tuners}.qmd`, `lessons/guitar-harmonics.qmd`. Pages' `window.TEST_MIC_SOURCE` replaces the mic.
  Test: `node tests/lessons/guitar-tuning.cdp.js` (after rendering both tools).
- Hand drums and mic figures: `gear-diagrams.js` also draws `congas`, `bongos`, `djembe`, `tabla` (Gear 9, congas-basics) and
  `polar-patterns`, `mic-response`, `proximity`, `off-axis`, `cupping` (Recording 2 and 3). `rec-kit-mic.js` kinds `proximity`
  (distance -> bass) and `offaxis` (drag round the mic, Cup the grille). Every drum / conga step of blues-kit draws the kit or
  congas from above, lit as the band plays (`apps/shared/lessons/groove-anim.js`, `LessonGrooveAnim`). Test:
  `node tests/lessons/perc-mics.cdp.js` (after rendering gear-drums, rec-mics, rec-placement, hihat-grooves, congas-basics).
