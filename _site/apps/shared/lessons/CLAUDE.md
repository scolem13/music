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
  `FaithfulPanel.AVAILABLE` (every SynthCompare synth: 17; PPG layout is the page's own (no panel drawing in its manuals), OB-Xa / DX7 positions guessed inside measured sections; layout files load on first use). Loaded on synth-compare.qmd and every synth intro page
  (build.py). Vital boxes from its layout code at 1400 x 820, knobs inside approximate; Surge XT positions from SkinModel.cpp (sources
  `scripts/sources/synth-views.py`). The Model D keeps its own Real panel (MoogSheet). Test `node tests/lessons/faithful-panel.cdp.js` (`NEG=1` must fail).
  Drum machines and sequencers (2026-11-26): the same drawing bound to another host through an adapter `{get, set, range, onChange}`
  (`FaithfulPanel.attachFace(box, layoutId, adapter, {readonly, at})`: one cached panel per box across the host's redraws, Panel /
  Simple switch in localStorage `machine-face-view`, Panel default, class `fp-panelview` hides the plain controls; items `step`
  (LED + playing ring via `me.cur(i)`), `key`, `lcd`). Adapters `DrumCompare.faceAdapter` and the sequencer widget's `W.faceAdapter`
  (keys listed above each); layouts `panels/dm-{tr808,tr909,linn,mpc60}.js`, `panels/sq-{a960,tb303,mc202,mc4,elektron}.js`.
  Measured: 909 (manual p. 3 drawing), 808 (intro sheet photo pp. 2-3; left block and key colours approximate), 960 (Behringer QSG p. 1),
  TB-303 (as tb303.js), MC-202 (manual PDF p. 11), Digitakt II (manual p. 12; lower row approximate). Guessed: LinnDrum, MPC60 (no
  drawings in their manuals; step strips are the page's own) and MC-4 (drawings too small). The B / To panel is read-only. Test
  `node tests/lessons/machine-panels.cdp.js` (`NEG=1` must fail; `SHOT=<dir>` saves light + dark screenshots).
- Electric pianos (2026-11-26): `apps/shared/lessons/epiano.js` (global EPiano; header = models, controls, API): one physical / modal
  engine, profiles rhodes (Mark I Stage 73), suitcase, wurli (200A), clav (D6), cp70, pianet (N). NOTES START FROM SAMPLES by default (2026-11-27,
  `EP.SAMPLED`, "Sound: samples / model" button): the band's MusyngKite soundfont (electric_piano_1 for rhodes / suitcase / wurli / pianet,
  electric_grand_piano for cp70), shaped by each instrument's inside controls in `EP.renderSampled` (header "SAMPLED"; pianet = shaped tine
  samples). wurli and clav play their OWN multisamples (`epiano-samples/<set>/manifest.json` + m4a, built by `python3 scripts/epiano-samples.py`):
  Greg Sullivan's Wurlitzer EP200 (CC-BY 3.0, 4 layers) and Stevie Clavinet (licence UNKNOWN, owner's risk, 3 layers); the model is the fallback; notes rendered once per
  key / velocity / settings into AudioBuffers (`EPiano.render`, pure, runs in node), then drive / EQ / speaker / tremolo (Suitcase:
  stereo pan) live; `EPiano.translate(st, from, to)` exact / approx / lost. `<div class="epc" data-model data-to data-compact>`; faithful
  panels `panels/ep-<id>.js` through `FaithfulPanel.attachFace` (positions guessed, legends beyond Wikipedia unverified, no logos).
  Pages `lessons/epiano-compare.qmd` + `intro-{rhodes,wurlitzer,clavinet,cp70,pianet}.qmd` written by
  `python3 scripts/intro-instruments/epianos.py` (tour steps via intro-kit kind "epiano": `data-set` (defaults + these, may hold
  `model`), `data-riff`); tracks `apps/shared/data/epianos/assignments.json` (oEmbed-checked 2026-11-26). Sources
  `scripts/sources/epianos.py` (Wikipedia only; service manuals not read). Tests `node tests/lessons/epiano.test.js` (`NEG=1` must
  fail), `tests/lessons/epiano.cdp.js` (after rendering; `SITE=<dir>`). Not listened against real instruments.
- Electric guitars (2026-11-26): `apps/shared/lessons/guitar-pickups.js` + `.css` (global GuitarPickups; header = model, API, markup):
  modal plucked string -> pickups (Tillman's comb + aperture per coil; humbucker = two coils; hum per coil, RWRP Strat middle) ->
  complex nodal solve of coil L/R/C, tone and volume pots (audio taper), cable C, 1 Mohm amp, per mode frequency (pure, runs in node),
  rendered to a buffer (or the band's "guitar" samples through an FIR of the circuit alone) into `SynthKit.fx("amp")`; AudioTap
  registered. Guitars strat (5-way, vol, 2 tone), tele (3-way 1967 wiring), lespaul and sg (2 vol + 2 tone, toggle, "phase" = what-if
  mod). `GuitarPickups.translate(from, st, to)` exact / approx / lost by third-octave band fingerprints. Panels `panels/gt-<id>.js`
  through `FaithfulPanel.mount(el, {adapter: GuitarPickups.adapter(W)})`, new decoration item `shape` (in faithful-panel.js header).
  Pages `lessons/guitar-compare.qmd` (`<div class="gtc">`, `?a=&b=`) + `intro-{strat,tele,les-paul,sg}.qmd` written by
  `python3 scripts/intro-instruments/guitars.py`; tracks `apps/shared/data/guitars/tracks.json` (oEmbed-checked 2026-11-26; no
  source for any pickup setting: all marked guesses). Sources `scripts/sources/guitars.py`; every L/R/C/pot value and every pickup
  distance but the Strat's is the site's (unverified). Tests `node tests/lessons/guitar-pickups.test.js` (`NEG=1` must fail),
  `tests/lessons/guitar-compare.cdp.js` (after rendering). Not listened against real guitars.
- Organs (2026-11-26): `apps/shared/lessons/organ-compare.js` + `.css` (global OrganCompare; header = state keys, canonical, API): one
  plain Web Audio engine (AudioTap-registered), profiles b3 (B-3/C-3 + Leslie 122: 2 drawbar sets a manual + pedal 16′/8′, preset keys
  C cancel / C♯-A presets / A♯ B sets, percussion 2nd/3rd soft/normal fast/slow single-trigger and 1′ cut, V1-3/C1-3 per manual, Leslie
  stop/slow/fast, drive, click; tonewheel ratios + foldback COPIED from the band's model, the band's `hammond` untouched), vox
  (Continental: 16′ 8′ 4′ IV + flute/reed, one vibrato), farfisa (Combo Compact tabs, 4 vibratos, reverb) and pipe (GENERIC made-up
  2 manuals + pedal, couplers, tremulant, swell box, room). `OrganCompare.translate(st, from, to)` through ranks (footage, dB, colour)
  -> exact / approx / lost. Panels `panels/organ-<id>.js` via `FaithfulPanel.attachFace` (adapter keys `inv:` = drawbars drawn pulling
  down, `pre:` = preset keys; positions guessed, no logos). Pages `lessons/organ-compare.qmd` + `intro-{b3,vox-continental,farfisa,
  pipe-organ}.qmd` by `python3 scripts/intro-instruments/organs.py` (intro-kit kind "organ", `data-ex` + `data-set`); tracks
  `apps/shared/data/organs/assignments.json` (oEmbed-checked 2026-11-26, "build" = guessed starting registrations). Sources
  `scripts/sources/organs.py` (Wikipedia + XK-5 manual percussion + Blue3 preset table; no manual downloaded). Tests
  `node tests/lessons/organ-compare.test.js` (`NEG=1` must fail), `tests/lessons/organ-compare.cdp.js` (after rendering). Not listened against real organs.
- Electric basses (2026-11-26): `apps/shared/lessons/bass-pickups.js` adds P (split coil), Jazz 60s / 70s, StingRay 2- / 3-band
  (active preamp), Rickenbacker 4003 to `GuitarPickups` (`GP.add`, `GP.BASS_IDS`; "BASSES" block in guitar-pickups.js header),
  panels `panels/bs-*.js`, page `lessons/bass-compare.qmd`, intro pages by `scripts/intro-instruments/basses.py`, tracks
  `apps/shared/data/basses/tracks.json`, sources `scripts/sources/basses.py`. Component values, pickup distances (but the J spacing),
  preamp numbers and track settings unverified. Tests `node tests/lessons/bass-pickups.test.js` (`NEG=1` must fail), `tests/lessons/bass-compare.cdp.js`.
- Guitar pedals (2026-11-26): `apps/shared/lessons/pedals.js` + `.css` (global Pedals; header = each model, what is sourced, API, markup):
  pure per-sample models in node (fuzzface: biased asymmetric clip, low input impedance loading the guitar's volume pot = clean-up,
  `Pedals.loading`; bigmuff: booster + 2 diode stages + LP/HP blend scoop; ts808: gain 1 + (51k+Drive)/4.7k above a 720 Hz high-pass,
  diodes in feedback added to the dry; crybaby: swept band-pass, foot / rocking / envelope; phase90: 4 all-pass + dry, feedback
  switch; ce2: BBD few-ms delay, triangle LFO; dm2: 20-300 ms, BBD bandwidth N/4T darkening each repeat, Intensity 0 = one repeat,
  self-oscillates; echoplex: tape loop, wow / flutter, saturation). Not SynthKit.fx (its distortion / chorus / phaser / delay untouched);
  input = `GuitarPickups.render` at full volume, the guitar volume slider applied by `Pedals.run(chain, x, sr, {gvol})`, out through
  `SynthKit.fx("amp")`. `Pedals.translate(from, st, to)` exact / approx / lost (drives by band fingerprints of a test chord, others by
  rate / depth / time / repeats; different kinds = lost; hand notes per pair). Faces `panels/pd-<id>.js` via `FaithfulPanel.mount`
  with `Pedals.adapter`; new item `led` in faithful-panel.js. Pedalboard `<div class="pdb" data-chain>` (drag / ← → reorder, bypass,
  Translate to, + Add). Pages `lessons/pedal-compare.qmd` (`.pdc` `?a=&b=`, `.pdb`) + `intro-{fuzz-face,big-muff,tube-screamer,
  cry-baby,phase-90,ce-2,dm-2,echoplex}.qmd` by `python3 scripts/intro-instruments/pedals.py`; tracks `apps/shared/data/pedals/tracks.json`
  (oEmbed-checked 2026-11-26; `useSrc` null = unverified; settings guesses). Sources `scripts/sources/pedals.py` (Wikipedia + Guitar
  World + Boss; ElectroSmash unreachable, used only via search summaries). Tests `node tests/lessons/pedals.test.js` (`NEG=1` must
  fail), `tests/lessons/pedal-compare.cdp.js` (after rendering; `SITE=<dir>`). Not listened against real pedals.
- Amps (2026-11-26): `apps/shared/lessons/amps.js` + `.css` (global Amps; header = signal path, what is sourced, API, markup): pure
  per-sample models in node of the Twin Reverb (AB763 Vibrato channel: bright, stack before the volume, spring reverb, opto tremolo),
  AC30 Top Boost (stack without Middle, hot-biased EL84s, no NFB, Cut, vib / trem), Marshall 1959 Plexi and Bassman 5F6-A (jumpered
  channels, cathode follower, Presence), Mesa Dual Rectifier (2 cascaded stages, master, Raw / Vintage / Modern, silicon / tube
  rectifier) and Ampeg SVT (shelves + 5-position mid + Ultra Lo / Hi). Tone stack = Yeh & Smith 2006 closed form (`Amps.stackCoef`,
  `stackH`) + their bilinear transform; the test checks it against its own nodal solve of the components (1e-14). Push-pull power
  stage with bias and sag (`Amps.power`), cabinet filters `Amps.CABS` (site's curves). Input = GuitarPickups (guitars + basses) through
  `Pedals.run` ("Pedals in front": a pedal, or the page's `.pdb`). `Amps.translate` = drive (compression of a 12 dB step) then tone
  (`Amps.curve` 80 Hz-8 kHz) -> exact / approx / lost + lost features. Panels `panels/amp-<id>.js` (FaithfulPanel adapter; panel
  colour as a top band, unbound `n_` / `vib_` / `normal_` knobs dimmed). Pages `lessons/amp-compare.qmd` (`.ampc` `?a=&b=`, `.pdb`) +
  `intro-{twin-reverb,ac30,plexi,bassman,dual-rectifier,svt}.qmd` by `python3 scripts/intro-instruments/amps.py`; tracks
  `apps/shared/data/amps/tracks.json` (oEmbed-checked 2026-11-26; useSrc ties the player, not the record; settings guesses). Sources
  `scripts/sources/amps.py`; only the formula and the Bassman values are from a source read in full; other stack values from memory
  (unverified). Tests `node tests/lessons/amps.test.js` (`NEG=1` must fail), `tests/lessons/amp-compare.cdp.js` (after rendering;
  `SITE=<dir>`). Not listened against real amps.
- Microphones (2026-11-26): `apps/shared/lessons/mics.js` + `.css` (global Mics; header = model, what is sourced, API, markup): pure
  model in node of the SM57, SM58, U 87 Ai (omni / cardioid / figure-8, pad, low cut), Royer R-121, MD 421 (5-step bass roll-off) and
  Beta 52A: on-axis curve (makers' charts digitised APPROXIMATELY from their shapes: unverified), first-order pattern a + (1-a)cos
  widening in the bass and beaming in the treble, proximity by the spherical-wave term 1 + 1/(jkr) (source size 1.5 cm, site's),
  figure-8 rear lobe as a sign (A + B cancels), sensitivity / self-noise / max SPL from spec sheets (dynamics' noise estimated), room
  by random-energy efficiency. `Mics.H / db / level / render / translate` (pattern lost on a fixed mic, switches carried or mapped,
  placement searched by curve). Placement widget (drag the mic, Distance / Angle, Source voice (generated) / guitar (Amps.render) /
  snare / kick (the band's kit via BandSounds offline, generated fallback), Room), polar plot at 125 Hz / 1 kHz / 8 kHz. Drawings
  `panels/mic-<id>.js` (FaithfulPanel adapter; U 87 front + back, seg pattern switch, pad / low-cut keys; no logos). Pages
  `lessons/mic-compare.qmd` (`.micc` `?a=&b=`, A then B, A + B) + `intro-{sm57,sm58,u87,r121,md421,beta52}.qmd` by
  `python3 scripts/intro-instruments/mics.py`; famous uses `apps/shared/data/mics/tracks.json` (2 oEmbed-checked videos, the rest
  YouTube searches; placements guesses). Not rec-kit-mic.js (untouched; ideas only). Sources `scripts/sources/mics.py`. Tests
  `node tests/lessons/mics.test.js` (`NEG=1` must fail), `node tests/lessons/mics.cdp.js` (harness page, no render; `RENDERED=1` for
  the rendered pages). Not listened against real mics.
- Drum kits and cymbals (2026-11-26): `apps/shared/lessons/drumkits.js` + `.css` (global DrumKits; header = model, what is sourced,
  API, markup): pure modal model in node. Drums: Bessel-zero head modes (air loading ratio^0.92, site's), pitch ∝ 1/diameter ×
  tension, strike radius weights |J_m| (centre / edge / rimshot / cross-stick), resonant head, heads, shell partials by material,
  snare wires as band-passed noise with strainer tension + throw-off, muffling, kick port. Cymbals: ~70 inharmonic partials, tilt /
  scatter by series (A, K dark, 2002 bright, china), size / weight decay, bow / bell / edge with bloom, wash, hi-hat pedal closed /
  half / open / foot, choke. Items: snares supraphonic, blackbeauty, maple, piccolo; kits jazz (18/12/14), rock (22/12/16 acrylic),
  funk (dead); cymbals aride, kride, p2002, acrash, hats, china, splash. Cymbals SOUND from recordings by default (2026-11-27): SM Drums (public-domain-style terms; manual: Zildjian A, Wuhan china), 10 groups x 3
  strengths in `cymbal-samples/*.m4a` (1.8 MB), mapped and shaped per item by `cymSampleFor` (speed = size / weight, treble shelf = series:
  K / 2002 / splash / 18" are shaped A recordings, not those cymbals); "Cymbals: recorded / model" button; model = fallback. `DrumKits.translate` (pitch matched by the (0,1) mode;
  out of reach > 4 semitones = lost; snare <-> kit snare slot; hats -> others = pedal lost; cymbal brightness by centroid). Drawings
  `panels/dk-<id>.js` (snare top + side view with throw-off key and strainer knob; kit from above) and `panels/cy-<id>.js`, built
  with `DrumKits.draw`; clicks hit-tested against the layout's `zones` (`DrumKits.zoneAt`). Pages `lessons/drum-kit-compare.qmd`
  (`.dkc data-cat="snare"`, snares + kits, `?a=&b=`), `lessons/cymbal-compare.qmd` (`.dkc data-cat="cymbal"`), and
  `intro-{supraphonic,black-beauty,maple-snare,piccolo-snare,jazz-kit,rock-kit,funk-kit,a-ride,k-ride,2002-crash,crash,hi-hats,china,splash}.qmd`
  by `python3 scripts/intro-instruments/drumkits.py`; tracks `apps/shared/data/drumkits/tracks.json` (YouTube searches only, none
  oEmbed-checked; useSrc from Wikipedia where one ties player and gear). Sources `scripts/sources/drumkits.py` (Wikipedia only; model
  numbers, snare specs, kit shells unverified). Tests `node tests/lessons/drumkits.test.js` (`NEG=1` must fail),
  `node tests/lessons/drumkits.cdp.js` (harness, no render; `RENDERED=1 [SITE=]` for the rendered pages; errors read from CDP). Not listened against real drums.
- World and acoustic instruments (2026-11-26): `apps/shared/lessons/world-instruments.js` + `.css` (global WorldInst; header = models,
  what is sourced, API, markup): pure models in node. Sitar / tanpura: plucked-string partials with a jawari sketch (a band of upper
  partials fed as the fundamental decays, so brightness grows; the tanpura's cotton thread moves the band; not a contact simulation),
  sitar 19 movable frets on the raga's just notes (the six ragas of lessons/ragas.qmd, `WorldInst.RAGAS`, same notes as tuning-kit.js),
  13 taraf strings tuned to the raga driven by partial matches (`sympathy`), meend glide, chikari / jod / kharaj; tanpura Pa / Ma / Ni /
  Dha tunings, pluck cycle, and `WorldInst.drone({sa, tuning, jawari, thread, tempo, gain}) -> {stop, set}` for any page. Tenor pan:
  29 note areas in fourths and fifths, tuned partials 1:2:3 (`oct` / `twelfth` cents), strike place, stick, octave neighbour. Kalimba
  (17, alternating from a low centre) and mbira dzavadzimu (22, three registers): cantilever modes 1 / 6.27 / 17.55, neighbours, buzzers
  (amplitude-gated rattle), deze resonance, tunings Nyamaropa / Katsanzaira / Mavembe / major. `WorldInst.translate`: sitar <-> tanpura,
  kalimba <-> mbira (exact / approx / lost); other pairs `skipped: true` with a note. Drawings `panels/wi-<id>.js` (layout `build(st)`
  redrawn on raga / tuning change, `controls`; clicks hit-tested on `zones` by `WorldInst.zoneAt`). Pages
  `lessons/world-instruments-compare.qmd` (two `.wic`, `?a=&b=` for the first) + `intro-{sitar,tanpura,steel-pan,kalimba,mbira}.qmd`
  by `python3 scripts/intro-instruments/world.py`; tracks `apps/shared/data/world-instruments/tracks.json` (YouTube searches only, none
  oEmbed-checked; useSrc from Wikipedia where one ties the instrument to the record). Sources `scripts/sources/world-instruments.py`
  (Wikipedia only; acoustics papers not read). Tests `node tests/lessons/world-instruments.test.js` (`NEG=1` must fail),
  `node tests/lessons/world-instruments.cdp.js` (harness, no render; `RENDERED=1 [SITE=]` for the rendered pages). Not listened against real instruments.
- Panel keys (2026-11-27): `apps/shared/lessons/panel-keys.js` (global PanelKeys; keys and layout format in its header) drives any
  FaithfulPanel whose layout has `keys` from ONE hand of the computer keyboard while the other plays MIDI: modes Piano (default, the
  page's QWERTY piano) / Panel · left hand (`) / right hand (\), site-wide in localStorage `panel-keys-hand`, event `panel-keys-mode`
  for the band / DAW / notation to opt in later; section leaders by name, positions on the free hand around the nudge keys, j k (left mirrored f d)
  nudge, digits set (drawbars 0-8), Shift+digit snapshots, Backspace undo, hold keys. First layout: organ-b3. Test
  `node tests/lessons/panel-keys.cdp.js` (`NEG=1` must fail).

## Tunings, Blues Tonality, Everyday Tonality, Grooves (moved from root CLAUDE.md 2026-11-27)

- Tunings beyond twelve notes (`lessons/tuning-systems.qmd`, sections "24 notes", "Chinese pentatonic tunings", "Playing other tunings"): `apps/shared/lessons/tuning-kit.js` adds synth-kit kinds `scale` (a tuning written in notation with quarter-tone accidentals, cents from the piano, play tuned / piano / both together for beats; tunings 24-TET, 12-TET, sanfen sunyi pentatonic / seven-note / twelve lü, pure-ratio pentatonic), `pitchgrid` (isomorphic pads: LinnStrument-style, Janko, quarter-tone Janko, Wicki–Hayden, harmonic table, strip, custom; 12/24/19/31 per octave) and `microfret` (a fret per step); presses are entered on a staff. The `series` widget got "Both together". Chinese names and layout histories unverified (marked on the page). Test `node tests/lessons/tuning-kit.cdp.js`. Also in `TUN`: 19 / 31 / 53-TET, maqam Rast / Bayati / Hijaz, gamelan slendro / pelog (all marked unverified). Kinds `raga` (`lessons/ragas.qmd`: six ragas, ascent vs descent, vadi / samvadi grid, drone, plain-scale contrast, meend / andolan), `unevenfret` (`lessons/uneven-frets.qmd`: draggable frets, equal / rule of 18 / just / meantone / Pythagorean / Werckmeister, cents and mm from equal) and `splitkeys` (ordinary, historical split sharps, and a 31-piece model of white-in-3 / black-in-2 (cut across, or wide keys cut lengthwise) that is NOT a documented instrument; history from Wikipedia "Enharmonic keyboard"). `tunesong` (a tune from the collection, only those with chord symbols, melody and chords moved into 12 / 19 / 22 / 31 / 53-TET, just, Pythagorean, meantone, neutral; tuned / piano / both). On `pitchgrid`, `microfret` and `splitkeys`: "Cents compared with" the piano key or the nearest 5- / 7-limit just ratio above the root (`justNear`, `against`), and for 19 / 31-TET pad / piece labels as note names with quarter-tone signs U+1D132 / U+1D133 (`stepName`). Facts about ragas, fret history and the Chinese names are unverified: add sources to `scripts/works-cited.py` when checked.
- Blues Tonality lessons (`lessons/blues-tonality-{intro,scales,blue-notes,microtonal,harmony,beyond}.qmd`, sidebar part Blues Tonality): Ethan Hein's essay "Blues tonality" + Panos Charalampidis's *Microtonal Blues Scales* videos (subtitles in ~/Projects/blues). Widgets `<div class="bz" data-w>` (zone, scale, chorus, chords, onions, harp, quiz) from `apps/shared/lessons/blues-tonality.js` (kinds in its header; pitch-area cents are the site's sketch, not measurements; own foot bar with a small backing band on BandSounds; quiz records as SiteRecord tool `blues-tonality`), kit `lessons/_blues-tonality-kit.qmd`. Sources `scripts/sources/blues-tonality.py` (every claim checked 2026-11-10 against Hein's full text, read through the WordPress API since the page refuses scripts, and Wikipedia for Green Onions, the Richter layout and bends, and the diddley bow). Test `node tests/lessons/blues-tonality.cdp.js` (`NEG=1` must fail).
- Everyday Tonality lessons (`lessons/tagg-{sound,modes,melody,harmony,shuttles,loops,glossary}.qmd`, sidebar part Everyday Tonality): Philip Tagg's *Everyday Tonality II* (2014) chapter by chapter for students, written by `scripts/print-books/tagg/lessons.py` from `summaries/part*.md` (AI-drafted from the book's text, page numbers kept; not all checked) and the book's progression / shuttle / loop tables read from the PDF (`tables.py`); each recording in a table has a ▶ that plays its chords on the band (`apps/shared/lessons/tagg-tables.js`, global TaggTables, via AbcPlay). Its index's titles are in Works as print book "tagg" (by page; README in `scripts/print-books/tagg/`). Sources `scripts/sources/tagg.py`. Test `node tests/lessons/tagg.cdp.js` (`NEG=1` must fail).
- Grooves vs Songs lessons (`lessons/grooves-{songs,learning}.qmd`, sidebar part Grooves vs Songs): Ethan Hein's pieces / songs / grooves (Substack 2021; podcast 2026, track list only; his 2020 blog post unread: connection refused). Sorting quiz `<div class="gq">` from `apps/shared/lessons/grooves.js` (Hein's categories, records as SiteRecord tool `grooves`); chord buttons reuse `tagg-tables.js`. His examples, and the songs of his "Blues tonality" essay with the YouTube videos he links, are Works entries written by `scripts/works/hein/hein-works.py` (block `hein:begin/end` in works-data.js, above print-books) and Concepts items `apps/shared/works/uses/hein.js`. Sources `scripts/sources/hein-grooves.py`. Test `node tests/lessons/grooves.cdp.js` (`NEG=1` must fail).
- Presets, B3 one-set panel, MIDI split (2026-11-27): every writable FaithfulPanel has a Presets menu (save / load / overwrite / delete /
  default settings, localStorage `fp-presets:<layout id>`, buttons only, no form controls: host widgets claim any input in their box);
  panel-key digits load / save slots 1-9 of it. Layout field `init` sets keys at mount and after a load: the B3 panel now draws ONE
  drawbar set per manual (B) + pedal and no preset octave (`init` holds upre / lpre on B). `apps/shared/lessons/midi-split.js` (global
  MidiSplit): one MIDI keyboard split into zones with handles / Learn / octave per zone (localStorage `midi-split:<id>`), on the organ
  widget under the panel (pedal / lower / upper by the organ's manuals). Test `node tests/lessons/organ-split.cdp.js` (`NEG=1` must fail).
- Instrument Presets page (`tools/instrument-presets.qmd`, `apps/shared/lessons/preset-book.js`, global PresetBook): every preset saved from
  any panel's Presets menu, grouped by family (id prefix -> page, `FAMILIES`), each with its settings, Download / Delete, Export all /
  Import (`kind: "instrument-presets"`, merge by name). Save also writes `fp-presets-meta:<id>` = { name, page }. Test
  `node tests/tools/instrument-presets.cdp.js` (`NEG=1` must fail).
- Show ▾ and sound while turning (2026-11-27): every faithful panel's bar has Show ▾ = "Only working controls" (hides controls the
  model does not play (fp-off), decoration buttons / jacks and sections left with nothing working; gaps close by merged spans, page-aware)
  + each top-level section on / off (label, or the section item's `name`; Vital's oscillator rows etc. named in panels/vital.js).
  synth-compare.js: turning a knob makes the keys play that synth, and the translation follows every 80 ms (it waited for 250 ms of
  stillness, so the other synth only changed on release). Meet Vital has "What the real Vital can do that this page can't" (a table
  from synth_constants.h / synth_parameters.cpp, sources in scripts/sources/synth-views.py; written by scripts/intro-instruments/build.py).
  Test `node tests/lessons/panel-show.cdp.js` (`NEG=1` must fail).
- Vital's assignable modulation (2026-11-27): 8 matrix slots in PROFILES.vital (m1s/m1d/m1a..m8s/m8d/m8a; VT_MSRC sources Env 1-3,
  LFO 1-2, Random, Velocity, Mod wheel, Note; VT_MDST destinations osc pitch / frame / level, all, cutoff, volume; amounts -100..100 %
  of this page's range, unverified as Vital's law) -> engine routes (vtMatrix); new engine sources vel / modw / lfo2 and destinations
  wt0-2 / lv0-2 (other synths unaffected). Panel: MATRIX tab + Env 3 / LFO 2 / Random; drag ENV 1-3, LFO 1-2, RAND 1, NOTE, VELOCITY
  onto a knob (FaithfulPanel `modsrc` + layout dropMod / modDest / modded, knobs ringed). intro-kit steps take `data-page`. Real Vital's
  interface, read from its source: research_notes/vital-ui-facts.md. Test `node tests/lessons/vital-matrix.cdp.js` (`NEG=1` must fail).
- Shepard tones (2026-11-28): `lessons/sound-shepard.qmd` (Sound 28) + `apps/shared/lessons/shepard-kit.js` (load after synth-kit):
  kinds `shepard` (octave-spaced sines under a fixed raised-cosine bell on log frequency, steps or Risset glide, up/down/hold,
  envelope Flat gives the trick away, partials plotted) and `tritone` (Deutsch's paradox: random pair, Up/Down, answers on the
  pitch-class circle; `play(pc)`, `answers()`). Facts from Wikipedia only (`scripts/sources/shepard.py`). Test
  `node tests/lessons/shepard.cdp.js` (`NEG=1` must fail). Not listened to by a person yet.
- Ambient Generator takes (2026-11-28): "Record take" / "Open in DAW" (`takeUI` in ambient-kit.js; header comment there):
  one AudioWorklet with 8 inputs (master `lim`, `notesB`, `chimeB`, `cymB`, droneG, noiseG, reverb and echo returns), mono at half
  rate, 5 min cap; notes / gusts / swells / setting changes logged (`w.take`). `w.takeProject()` builds a 60 bpm project (1 beat
  = 1 s): note track per loop (piano / rhodes, else syn-fm; flute syn-sub), stems as audio tracks (all but Master muted), a muted
  "⚙ setting" track per changed setting whose vol automation draws it (-40..0 dB). Stems go straight into IndexedDB "mini-daw" /
  "takes"; the project via localStorage "mdaw:handoff-project", opened by `takeProjectHandoff` in mini-daw.js. Test in ambient.cdp.js.
- Ambient Generator cues and menus (2026-11-28): Changes = Cued: `w.apply` stores a moved control in `cued` and puts `w.P[k]` back
  to `live[k]` (the slider keeps the new value; the scheduler, which reads `w.P`, keeps the old); `w.go()` glides numbers over
  Transition (smoothstep, 100 ms steps, brightness in octaves), STEP keys (scale, inst, loops...) change at once. Chime / cymbal
  menus: `chimeSet` / `cymSet` checkboxes, Level / Speed / Varies / Width (`ch*`, `cy*`; cymbals also Backwards %).
- Ambient Generator Energy (2026-11-28): one "Energy" knob after the MODX Super Knob, `ENERGY` in ambient-kit.js = [key, To];
  the table shows On / From / To / Now per setting, and the knob sets the real controls (they move). From = the control's value
  when Energy was last 0 (hand moves at 0 update it; presets reset Energy and From). Brightness sweeps in octaves, the rest linearly.
  New settings it drives: Loop speed, Echo feedback (to .97), Drive (tanh, 4x oversampled, noise bed goes through it), Brightness
  (master low-pass), Cymbal swells (Drum Kits' recordings, 70% reversed). A limiter (-4 dB, 20:1) after the compressor.
- Ambient Generator voices (2026-11-28, revised the same day): NO bell or chime recordings on the site (the owner's decision: the
  only samples kept are the Drum Kits' cymbals, used by Cymbal swells). Loop notes can play modelled bass bars (metal / wood) and
  chime tubes, and the wind-chime gusts are modelled tubes tuned to the key (`MODAL` / `VOICES` in ambient-kit.js; numbers and
  sources in its comment, `scripts/sources/ambient-models.py`, research in `research_notes/bell-chime-samples/MODELS.md`).
  The bell model needs more work and is not in the generator. The collected recordings (bells, chimes, marimba) stay local in
  `research_notes/bell-chime-samples/` (audio git-ignored) for listening and for setting the models; the listening page is a
  private artifact. Drum Kits' cymbals remain. Drone = saws or a wavetable pad (four of `SK.wtFrames()` cross-faded). The shared
  tape delay's `satCurve` has unity small-signal gain and its tone low-pass Q -3 (before, the echoes at 2-2.5 kHz never died);
  test checks a 2.2 kHz burst is 40 dB down by 10 s. Ambient echo: 1.5 s / 2.3 s ping-pong, fb .4, tone 1800, 150 Hz HP send.
- Noise and ambient (2026-11-27): `apps/shared/noise.js` (global `SiteNoise`; NOT `Noise`, a name another script takes) is the site's
  noise model: `source(ctx, kind)` = a looped 23 s buffer, filters warmed, end cross-faded into the start, random start;
  `stream(ctx, kind)` = an AudioWorklet that never repeats (buffer until it loads); `eq(ctx, gains)` = 10 octave peaking bands
  31 Hz-16 kHz ±18 dB; `response(freqs, dBs)`. Noise used to PULSE because it was a 1-3 s buffer on a loop (synth-kit 3 s,
  rec-kit-mic 2 s pink starting from zeroed filters, ipa-synth 1 s): the ear hears the repeat. synth-kit, rec-kit-mic and ipa-synth
  now use it (they load it if missing); one-shot hits (turntables, polyrhythm, ride-synth, rec-kit-level) were left alone.
  `apps/shared/lessons/ambient-kit.js` adds synth-kit kinds `noiseeq` (noise + 10-band EQ + swell, presets) and `ambient` (Ambient
  Generator: drone, tape loops of unequal length drawn as rings, noise bed, SK.fx reverb + delay, BandSounds piano / rhodes / flute or a
  synth bell). Pages `lessons/sound-ambient.qmd` (Sound 27, history from Wikipedia: `scripts/sources/ambient.py`), `tools/ambient.qmd`,
  and the EQ on `sound-noise.qmd`. Test `node tests/lessons/ambient.cdp.js` (`NEG=1` must fail). Not listened to.
