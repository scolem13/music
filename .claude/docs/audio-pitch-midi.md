# Audio, pitch, mixer, MIDI

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
- The navbar Mixer (`apps/shared/mixer-panel.js`, loaded by `practice-widgets.js` on first open): a strip per `AudioTap` source and per
  <audio>/<video> (meter, fader, Mute, Solo; sessionStorage `mixer-v1`). It scales `register(ctx, node, label, { gain })`'s param, else the
  node's own gain when it is a GainNode, else shows the level only; routing is never changed. `register` options `group` / `mixLabel`
  (strips together), `active` (shown only while true; `AudioTap.changed()` when it flips), `get` / `set` (the fader is the source's own
  setting). The band registers each part as it first sounds (`bus.tap`, a Mixer gain after the part's fader) plus Melody (bar.melody,
  its own bus `ins.melody`, `volumes.melody`; in stems it stays with comp) and Master (drawn after the group's box); the navbar metronome and
  drone have a strip each while they play. Strip names are menus where the source gives `voices` / `voice` / `setVoice` (band: Bass, Chords,
  Melody = `opts.melodySound`), or open faders of their own with `sub` (Drums: `BandPlayer.KIT_GROUPS` -> `c.kit`; Ride and Crash start at 0.53 everywhere, `KIT_DEFAULT`); the player's
  `mixHooks(part)` makes them, and a page with its own menus takes the change through `cfg.onMixer(part, change)` (the Backing Track does).
- Audio pre-flight (`apps/shared/audio-check.js`, `window.AudioCheck.run()`): Chrome note, a soft test sound (capped at
  -24 dBFS, steps up from -48) that tells speakers from headphones and measures latency, then a mic level meter; returns
  getUserMedia constraints; `ensure()` reuses it for the tab (sessionStorage `audio-check-v1`). Used by pitch-detect, synth-kit, the
  assessments, the Backing Track and `tools/webcam-demo.html`. Page tests that open the mic seed that key so the dialog stays shut.
  Tests: `node tests/lessons/audiocheck.cdp.js` (after rendering `practice/assessment-tune`).
- Keyboard feel check (`apps/shared/midi-feel.js`, `window.MidiFeel`): play written ABC on a MIDI keyboard against a click and
  get graded on notes, swing ratio (range per tempo), accents, ghosts (`"^ghost"` / `!pp!`), lengths (staccato, tenuto, ties),
  laid back / pushing, and notes moved by an eighth. On a page: `MidiFeel.attach(el, { abc, bpm | getBpm })` (loads abc-core /
  abc-events itself); `MidiFeel.connect` / `subscribe` are one shared Web MIDI input for the page. Used in `lessons/reading-swing.qmd`.
  Tests: `node tests/abc/midi-feel.test.js`, `node tests/lessons/midi-feel.cdp.js` (after rendering reading-swing).
- MIDI learn (`apps/shared/midi-learn.js`, `window.MidiLearn`, in `_includes/head.html`): on any page with buttons in its content a
  "MIDI buttons" icon joins the navbar tools; Learn, click a button, press a key / pedal / controller. Per-page bindings in localStorage
  `midi-learn-v1`; page defaults on the button (`data-midi="note:108"`, `data-midi="off"` excludes one). API at its top (`isBound` lets a
  page that grades notes skip pedal keys).
- Chunk Practice (`tools/chunk-practice.qmd`, `apps/shared/chunk-practice.js`): Quick (click never stops, silence = clean, +1/5 of the
  way per clean pass) and Full control (ladder, rhythm variants, "keep the click going", "if I don't answer"). Clean / Not yet default to
  notes 108 / 21. "Grade me from my MIDI keyboard": `ChunkPractice.grade` note by note. Test: `node tests/lessons/chunk-practice.cdp.js`.
- The Vocal Warm-up (`tools/vocal-warmup.qmd`, `apps/shared/vocal-warmup.js`): a routine built from the Set up form (stretches,
  breathing, piano-led patterns, two band grooves). Tests: `node tests/lessons/warmup.cdp.js` (after
  `sh scripts/render-test-page.sh tools/vocal-warmup.qmd`; the band check skips when no samples can load).
- Guitar Tuning (`tools/guitar-tuning.qmd`, `apps/shared/guitar-tuning.js`): ear-first tuning, six methods (reference, drone,
  fifth-fret, harmonics, octaves, tuner with guess-before-you-see), any tuning incl. Custom (`GuitarTuning.parseTuning`), a fretboard
  to click, the mic via PitchDetect. Setup Check (`tools/guitar-setup-check.qmd`, `apps/shared/setup-check.js`): guitar/bass relief,
  buzz map, action, nut, 12th-fret intonation (mic) -> what to adjust and who (you / teacher / tech). Lessons
  `lessons/guitar-tuning-{ear,methods,tuners}.qmd`, `lessons/guitar-harmonics.qmd`. Pages' `window.TEST_MIC_SOURCE` replaces the mic.
  Test: `node tests/lessons/guitar-tuning.cdp.js` (after rendering both tools).
- Guitar Input Check (`tools/guitar-in.qmd`, `apps/shared/guitar-in.js` `window.GuitarIn`, page script `guitar-in-page.js`): a guitar through mic/DI graded against an expected note or chord (plan and limits: `scripts/guitar-di/GUITAR-IN.md`). Tests: `node tests/guitar-in/guitar-in.test.js`, `tests/guitar-in/guitar-in.cdp.js`.
