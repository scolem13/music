# Lesson kits and widgets

- The sound-design lessons (`lessons/sound-*.qmd`, 25 of them: harmonics to chiptune,
  in the order of `_quarto.yml`) are widgets from `apps/shared/lessons/synth-kit.js` (kinds and
  attributes documented at its top), included via `lessons/_synth-kit.qmd`. Plain Web Audio, nothing shared with the band.
  Tests: `node tests/lessons/sound.cdp.js` (after rendering).
- Check my singing (`apps/shared/lessons/abc-ex.js`, `data-check` on an `abc-ex`; all sing prompts of `voice-pop/jazz/classical` have it, a
  two-voice one gets none): sound check (`AudioCheck.ensure`), optional count-in click at the tempo (`data-bpm`, else `Q:`, else 80), `PitchDetect.mic`
  (`TEST_MIC_SOURCE` in tests), then `apps/shared/sing-check.js` (`SingCheck.expected/grade`: note by note, octave-agnostic, 50 cents, timing loose,
  the whole line may start 0.4 s early / 1 s late) shows each note right / flat / sharp / not heard; on speakers it warns and gates bleed. Follows the
  Your voice menu and Step up. Tests: `node tests/abc/sing-check.test.js`, `node tests/lessons/sing-check.cdp.js` (after rendering `lessons/voice-pop`).
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
- Interactive tools catalogue: `node scripts/tool-catalog.cjs` scans `lessons/*.qmd` for widgets (synth-kit / recording-kit `data-w`
  kinds, kit classes in its `CLS` map, the Mini DAW, the framed Notation page) into `apps/shared/lessons/tool-catalog-data.js`.
  `lessons/tools.qmd` draws it (filterable, by family); `apps/shared/lessons/tool-links.js` (loaded on /lessons/ pages from
  `_includes/head.html`) adds a "Same tools in" box to each lesson's foot. Rerun after adding a lesson or widget; a new kit class goes in `CLS`.
- Hand drums and mic figures: `gear-diagrams.js` also draws `congas`, `bongos`, `djembe`, `tabla` (Gear 9, congas-basics) and
  `polar-patterns`, `mic-response`, `proximity`, `off-axis`, `cupping` (Recording 2 and 3). `rec-kit-mic.js` kinds `proximity`
  (distance -> bass), `offaxis` (drag round the mic, Cup the grille), `ampmic` (Recording 4, a guitar speaker: cap to edge,
  distance, angle, mic, room) and `vocalmic` (Recording 5, singer from the side: the plosive jet, sibilance, pop filter, room); figures
  `speaker-zones`, `amp-miking`, `vocal-setup`. Recording 4 and 5 (`rec-guitar-amp`, `rec-voice`) moved Monitoring..Stereo to 6..9. Every drum / conga step of blues-kit draws the kit or
  congas from above, lit as the band plays (`apps/shared/lessons/groove-anim.js`, `LessonGrooveAnim`). Test:
  `node tests/lessons/perc-mics.cdp.js` (after rendering gear-drums, rec-mics, rec-placement, rec-guitar-amp, rec-voice, hihat-grooves, congas-basics).
- The Recording lessons (`lessons/rec-gain-staging`, `rec-mics`, `rec-placement`, `rec-monitoring`, `rec-mixing`, `rec-mastering`, plus `rec-guitar-amp`, `rec-voice`, `rec-stereo`):
  `<div class="rk" data-w>` widgets from `apps/shared/lessons/rec-kit-level.js` (gainstage, loudness), `rec-kit-mic.js` (polar, phase, phantom, proximity,
  offaxis, ampmic, vocalmic) and `rec-kit-mix.js` (latency, headmix, multitrack), documented at their tops; plain Web Audio, one sounds at a time. Test:
  `node tests/lessons/rec-kit.cdp.js` (after rendering the six pages; fake mic flags, drives each widget's controls and reads its readouts).
- The Composing lessons (`lessons/compose-{melody,motif,song,instruments,orchestra}.qmd`) and the Process lessons
  (`lessons/process-journal.qmd`, `process-crit-b.qmd`: process journal, MYP Arts Criterion B *Developing* as in the Arts guide for use
  from Sept 2022, Year 5 wording quoted): sidebar part Composing, topic `composing`. Widgets from `apps/shared/lessons/compose-kit.js`
  (`CpKit`; `cp-motif` motif lab, `cp-transpose` transposer with range check, `cp-journal` entry builder, `cp-intent` intention builder,
  `cp-sort` command terms; documented at its top), included via `lessons/_compose-kit.qmd` (with `abc-ex.js`). Ranges: HyperPhysics.
  Sources `scripts/sources/composing.py`. Test: `node tests/lessons/compose.cdp.js` (after rendering the seven pages).
