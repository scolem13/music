# Lesson kits and widgets

- The sound-design lessons (`lessons/sound-*.qmd`, 25 of them: harmonics to chiptune,
  in the order of `_quarto.yml`) are widgets from `apps/shared/lessons/synth-kit.js` (kinds and
  attributes documented at its top), included via `lessons/_synth-kit.qmd`. Plain Web Audio, nothing shared with the band.
  Tests: `node tests/lessons/sound.cdp.js` (after rendering).
- Headless engine in `synth-kit.js` (2026-11-11): `SynthKit.fx(kind, c, params, opts)` -> `{ input, output, set(params), stop(), P, n, t0 }` builds one effect on ANY AudioContext (kinds eq compressor distortion amp chorus phaser delay reverb tremolo rotary filter; parameter tables `SynthKit.FX[kind].params`, `fxDefaults`, `fxClean`; the room's impulse response is seeded, noise buffers are cached per context in a WeakMap), and `SynthKit.voice(kind, c, params, out, opts)` -> `make(midi, vel, when)` -> voice with `off(t)` (kinds subtractive fm wavetable chip; `SynthKit.SYN[kind]` = params + the lessons' presets, `synClean`). The lesson widgets (filter, distortion, compressor, chorus, phaser, delay, eq, reverb, tremolo, rotary, amp, subtractive, fm, wavetable) are built on them (`fxNum` / `fxPick` / `synNum` make their controls from the same tables), so a widget and a DAW slot with the same settings make the same sound. NOT in it: the mic / pitch effects (autotune, harmonizer, vocoder, tuner, octaver) and the lesson-only ones (glitch, gate, sidechain, transient, stereo, shimmer, chain, chip tune player, granular). Used by the DAW's track sound (`apps/shared/daw/CLAUDE.md`). Tests: `tests/lessons/sound.cdp.js`, `amp.cdp.js`, `daw-scratch.cdp.js` (every kind headless on an OfflineAudioContext). Behaviour changes: phaser rate / chorus voices / delay ping-pong / tremolo target rebuild inside the effect instead of restarting the widget; reverb rooms are the same every time. Not listened to.
- Check my singing (- Check my singing (`apps/shared/lessons/abc-ex.js`, `data-check` on an `abc-ex`; all sing prompts of `voice-pop/jazz/classical` have it, a
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
- The Live Sound lessons (`lessons/live-{strip,gain,eq,gate,comp,feedback,soundcheck}.qmd`, sidebar part Live Sound, topic `live-sound`):
  one Behringer X32 input channel, `<div class="lk" data-w="strip">` from `apps/shared/lessons/live-kit.js` (attributes and sources
  documented at its top; included via `lessons/_live-kit.qmd`). The DSP runs in an AudioWorklet that plays the generated "problem"
  source itself and measures the gate / compressor where the hits, bleed and loud/quiet parts are (`host.lk.stats`); `data-goal` adds
  "Check my channel", `data-quiz` is the mystery-channel game, ⤓ WAV saves the raw source for the real desk. Live Sound 6 reuses
  synth-kit's `pa`. X32 ranges from the X32 user manual and Maillot's OSC protocol (`scripts/sources/live-sound.py`; annotated copies
  in ~/Documents/Manuals). Test: `node tests/lessons/live-kit.cdp.js` (after rendering the seven pages; about 3 minutes).
- Sound 26, classic synths compared (`lessons/synth-compare.qmd`, sidebar after Sound 25): `<div class="scmp">` from
  `apps/shared/lessons/synth-compare.js` + `.css`. Nine panels drawn after (not copied from) the Model D, Prophet-5, TB-303 (synth
  part), Juno-60 (Juno-106 switch), ARP 2600 (normals + editable patch cords), OB-Xa (+ SEM LP/BP/HP/notch, unverified), MS-20 (HP +
  LP in series, hot peaks, cords), DX7 (6 operators, 32 algorithms from MSFA, checked against the manual's carrier counts) and PPG
  Wave (this page's own wavetables); "From" / "To" pickers for any pair. One AudioWorklet engine (worklet source in the file, loaded
  as a Blob; the processor must be a real `class extends AudioWorkletProcessor`; up to 16 voices, 4-pole models, 12 dB SVF, HPF,
  ring mod, S&H, chorus, accent / slide, FM, wavetables). `SynthCompare.translate(state, from, to)` -> settings + notes (exact /
  approx / lost, each citing both synths' manual pages): Model D <-> Prophet-5 by their hand-written translator, every other pair
  through the canonical description (`toCanon` = the engine patch) and each profile's `cap` + `apply`. `EXAMPLES` (cited recipes;
  phrase steps may carry "a" accent / "s" slide), `SynthCompare.voice(ctx, id, state)` -> Promise of {node, noteOn, noteOff, set}
  for the DAW later. Manuals (several OCR'd scans) in ~/Documents/Manuals/synths and `.../synths/new` (pages in the JS header;
  sources `scripts/sources/synth-compare.py`); knob curves, voicings and the PPG panel are the page's own, and nobody has compared
  the sound with the real instruments. Tests `node tests/lessons/synth-compare.test.js` (`NEG=1` must fail),
  `tests/lessons/synth-compare.cdp.js` (after rendering). Planned: the engines as DAW track sounds.
  2026-11-25, fifteen synths: + Prophet-6 (P6 manual, printed = PDF - 10: continuous shape, sub, Poly Mod incl. shape, 4-pole LP +
  2-pole HP, two effect slots in series bbd/ddl/CHO/PH1/PH2 + HAL/rOO/PLA/SPr and distortion, slop, 6 voices; effects are the
  worklet's own `fxRun` designs, not SynthKit's, so `voice()` carries them) and five Moogs on the one ladder model (filter
  differences NOT measured, said on the page): Taurus 205A (OCR'd scan), Voyager (Old School manual: Dual LP / HP-LP + spacing),
  Sub 37 (cited from the Subsequent 25 manual: the 37's could not be obtained; Duo mode = 2 voices, shared filter not modelled;
  MultiDrive `E.drive`), Grandmother (HP utility as one cord switch, VCA modes, spring `fx`), Memorymoog (OCR'd scan; Voice Mod).
  Manuals + text in `.../synths/new` (cited by PDF page). "What if…" mods: `PROFILES[id].whatif` ({id,label,why,cite,eng(E)}),
  applied only by `SynthCompare.engine(id, state, mods)` (sound), never by translate (the report stays the real instrument's);
  panel `.scmp-whatif` dashed outline + badge; widget `mods / setMod / setMods / whatif(id)`; synth-library saves `whatif: [ids]`.
  History sections for every synth from Wikipedia only; 29 more oEmbed-checked videos in `assignments.json` (2-4 a synth). The
  sequencer page keeps its own voice: it needs per-step cutoff locks, queue clearing and accent flags that `voice()` lacks.
- Sound 26 student patches (`apps/shared/lessons/synth-library.js` + `.css`, mounted under each `.scmp` widget through its public API
  only; new synth ids in `SynthCompare.PROFILES` appear by themselves): "Save this patch" downloads a `kind: "synth-patch", version: 1`
  JSON (format in the header), "Open a patch file" validates and loads it into its panel and translates, the Library lists
  `apps/shared/data/synth-patches/index.json` (badges: student / `checked: true` by the teacher / `origin: "manual"`, seeded only with
  the Prophet guide's "Let's Go" hard-sync recipe), and `<div class="slib-assign">` draws `assignments.json` ("Build it from a video":
  YouTube videos confirmed by oEmbed, song times from their descriptions; each Build button fills the form). Teacher:
  `node scripts/synth-patches/add.mjs <files...> [--check] [--checked]` validates, copies and rewrites the index (then re-render or copy
  to `_site`). History sections use only the Wikipedia articles (`scripts/sources/synth-compare.py`). Tests
  `node tests/lessons/synth-library.test.js` (`NEG=1` must fail), `tests/lessons/synth-library.cdp.js` (after rendering).
- Classic drum machines compared (`lessons/drum-compare.qmd`, sidebar after Sound 26): `<div class="dcmp">` from
  `apps/shared/lessons/drum-compare.js` + `.css`. TR-808 / TR-909 / LinnDrum / MPC60-style panels with each machine's own grid rules
  (808 total-accent row and tom/conga switches; 909 per-voice + total accent, shuffle 1-7, flams, last step; Linn levels, error
  correct incl. HI, timing A-F; MPC velocity, timing correct incl. OFF at 96 ppq, swing 50-75 %), one AudioWorklet engine (Blob, real
  `class extends AudioWorkletProcessor`; the same source run offline for plots and tests via `DrumCompare.render`),
  `DrumCompare.translate(state, to)` -> state + notes (exact / approx / lost with manual pages) through `canonical()` (hits in ticks),
  timing plot, waveform / envelope / spectrum per voice, A/B playback with the grid lit. JSON `kind: "drum-pattern", version: 1`
  export / import; videos to rebuild in `apps/shared/data/drum-patterns/assignments.json` (`<div class="dcmp-assign">`, oEmbed-checked).
  `DrumCompare.voice(ctx, machine, kit)` -> `{ output, hit(voice, when, vel, accent), set, stop }` for a later DAW hookup (DAW not
  wired). Manuals + extracted text in ~/Documents/Manuals/drums (808 service notes and intro sheet, 909 owner's manual, LinnDrum
  owner's manual, MPC60 v3.1 manual; page offsets in the JS header). All sounds are stand-ins (808/909 after the circuit notes, 909
  hats / Linn / MPC synthesised and bit-reduced), swing spacing between printed points and flam ms are the page's own; not listened
  against real machines. Sources `scripts/sources/drum-compare.py`. Tests `node tests/lessons/drum-compare.test.js` (`NEG=1` must
  fail), `tests/lessons/drum-compare.cdp.js` (after rendering).
- Classic sequencers compared (`lessons/sequencer-compare.qmd`, sidebar after Sound 26): `<div class="sqc">` from
  `apps/shared/lessons/sequencer-compare.js` + `.css`. Five machines, each with its own entry method: 960-style (3 rows × 8 knobs, X1/2/4,
  Normal/Skip/Stop, 3rd-row timing; built from the Synthesizers.com Q960 sheet, no Moog 960 manual found), TB-303 (pitch mode then time
  mode note/tie/rest, accent/slide, DOWN/UP, last step, TB-03 triplet grid), MC-202 (2 channels, step/gate at 24 a quarter, STEP/GATE
  keys, accent ch 1, portamento on the second note), MC-4 (keypad, TB 120/96/48/24, CV-1/CV-2/step/gate on 4 channels), Elektron-style
  after the Digitakt II (note/lock trigs, p-locks, COND/PROB/FILL, micro timing, speed, swing, loop shown). `SequencerCompare.translate(from,
  to, data)` via `toCanon`/`fromCanon` (ticks, 480 a quarter) -> data + notes (exact/approx/lost, manual pages); `toEvents(machine, data)`
  -> `[{t, note, vel, len, accent, slide, ch}]` in beats for a later DAW hookup (DAW not wired); piano roll / timing grid / lanes SVG;
  own AudioWorklet voice (Blob, real class; `SynthCompare.voice` did not exist when built), A/B playback. JSON `kind: "sequence",
  version: 1` export/import; videos in `apps/shared/data/sequences/assignments.json` (oEmbed-checked 2026-11-25, 4 a machine; the
  analog list is other step sequencers). Manuals + text in ~/Documents/Manuals/sequencers (Roland scans cited by PDF page; extractor
  is a Swift PDFKit script). Page's own: 303 range, MC-202 gate-key lengths, MC-4 CV-2 scale and gate 0 = rest, micro = 1/24 step,
  swing formula, the voice; not listened against real machines. Sources `scripts/sources/sequencer-compare.py`. Tests
  `node tests/lessons/sequencer-compare.test.js` (`NEG=1` must fail), `tests/lessons/sequencer-compare.cdp.js` (after rendering).
- The Model D patch sheets (section "The Model D patch sheets" of `lessons/synth-compare.qmd`, `<div class="moog-sheets">`):
  `apps/shared/lessons/moog-sheet.js` + `.css` (global MoogSheet) redraw the manual's sheets (pp. 55-76, 44 sounds; blanks pp. 77-79)
  as SVG line art in its layout and colours (orange pointers, light-blue range / wave circles, rocker fills), for students who need
  the page and the panel to look the same. Data `apps/shared/data/moog-sheets.json` (each control in the sheet's own units: cutoff
  -5..5 with labels -4..4, tune -2.5..2.5, freq -8..8, time knobs as 0-10 positions on the printed 10 ms-10 s scale with a reading;
  `unsure` lists hard readings, `null` = knob / switch left empty) was read from the PDF's pixels by a script (pointer angle of the
  orange pixels round each knob centre, switch half colours, wheel thumb rows) and checked by redrawing it beside the page.
  `MoogSheet.toState / fromState` convert to `SynthCompare.PROFILES.moog` state (cutoff + 5; times by the printed scale, log between
  labels, ends from p. 80); `draw(host, entry, {interactive, onChange, large, contrast, section})`; picker, ▶ Play / Show on the panel
  above (through `widgets[0].set / translate / phrase`), one part at a time, large print, high contrast, Save / Open, Print (sheet or
  blank). Switch conventions (coloured half = pressed; osc 3 control and power: top = on) and the LFO push-pull symbol are this
  page's reading. Tests `node tests/lessons/moog-sheet.test.js` (`NEG=1` must fail), `tests/lessons/moog-sheet.cdp.js` (after rendering).
- Prophet-5 guide patches (`apps/shared/lessons/prophet-sheets.js`, global ProphetSheets, loaded after synth-compare.js on
  `synth-compare.qmd` and `intro-prophet-5.qmd` via build.py `extra_js`): the Rev4 User's Guide has no patch charts or factory list,
  so its ten tutorial recipes (Basic Program pp. 8/47, filter p. 23, filter env p. 26, amp env p. 30, bass p. 46 / pp. 47-49 / p. 49,
  brass p. 50, strings p. 51, sync pp. 51-52; the Service Manual has none) are added to `EXAMPLES` as "Guide p. …" with a fit note
  (exact = printed number on this panel's scale; approx = "turn up" / "slightly" / Freq "4", this page's value, unverified).
  `quote` lines must be in the guide's text. Not the synth-patches format (that needs a song). Test
  `node tests/lessons/prophet-sheets.test.js` (`NEG=1` must fail).
- ARP 2600 manual patches (`apps/shared/lessons/arp-sheets.js`, global ArpSheets, loaded after synth-compare.js on `synth-compare.qmd`
  and `intro-arp-2600.qmd` via build.py `extra_js`): eleven patches from chapter 5 of the 1971 owner's manual (5.101-5.1401, PDF pp.
  54-89), read from its TEXT (the panel drawings are too small in the scan), each from the manual's 5.1 start settings (`BASE`), added
  to `EXAMPLES` as "Manual 5.…" (flag `arpSheet`) with a fit note (exact / approx = words or hertz, this page's value, unverified /
  lost = manual start button, clock-gated envelopes, inverter, LF range switch). `quote` lines must be in the manual's text. Test
  `node tests/lessons/arp-sheets.test.js` (`NEG=1` must fail).
- Faithful synth panels (2026-11-26): `apps/shared/lessons/faithful-panel.js` (global FaithfulPanel; layout format and how to add
  one in its header) draws an instrument's real panel as SVG from `apps/shared/lessons/panels/<profile id>.js`, every control bound to
  a SynthCompare profile key (unbound = dimmed, "not modelled"); plain white / black background, Light / Dark toggle kept site-wide in
  localStorage `panel-theme`; Panel / Simple view (`synth-face-view`) in the compare widget's panel head for every id in
  `FaithfulPanel.AVAILABLE` (now vital, surge; layout files load on first use). Loaded on synth-compare.qmd and every synth intro page
  (build.py). Vital boxes from its layout code at 1400 x 820, knobs inside approximate; Surge XT positions from SkinModel.cpp (sources
  `scripts/sources/synth-views.py`). The Model D keeps its own Real panel (MoogSheet). Test `node tests/lessons/faithful-panel.cdp.js` (`NEG=1` must fail).
