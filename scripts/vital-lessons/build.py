#!/usr/bin/env python3
"""Writes the "Vital, step by step" lessons: lessons/vital-01-window.qmd ... vital-10-real-thing.qmd.

Ten pages that take a student from this site's beginner Vital panel to the real Vital plug-in. Each page: What you'll do, short
sections (one idea each), the panel (SynthCompare's Vital, compact, via apps/shared/lessons/intro-kit.js), 4-7 steps (each ▶ loads a
starting patch: data-ex = a "vital-*" example of synth-compare.js, data-set = state keys of SynthCompare.PROFILES.vital, data-page =
voice | fx | matrix), "In the real Vital" (every statement about the plug-in from research_notes/vital-ui-facts.md, cited in
parentheses by source file; anything on that file's Unconfirmed list says "(unverified)"), a task list for the real plug-in, a
self-check quiz, Previous / Next.

Edit the content here and rerun:
    python3 scripts/vital-lessons/build.py
It also writes scripts/sources/vital-lessons.py (one source per Vital file cited, with the pages citing it, found by the
"(Vital source, a.cpp; b.h)" pattern); then run python3 scripts/works-cited.py. Pages are overwritten; the Works Cited block is kept.
"""
import json, re, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
J = lambda o: html.escape(json.dumps(o, separators=(",", ":"), ensure_ascii=False), quote=True)

# where each cited Vital file lives in github.com/mtytel/vital (checked against the repo tree, 2026-11-27)
ES, EC = "src/interface/editor_sections/", "src/interface/editor_components/"
PATHS = {f: ES + f for f in """header_section.cpp full_interface.cpp save_section.cpp preset_browser.cpp volume_section.cpp
  oscillator_section.cpp oscillator_advanced_section.cpp wavetable_edit_section.cpp sample_section.cpp filter_section.cpp
  envelope_section.cpp lfo_section.cpp random_section.cpp modulation_manager.cpp modulation_matrix.cpp macro_knob_section.cpp
  voice_section.cpp portamento_section.cpp bend_section.cpp master_controls_interface.cpp effects_interface.cpp keyboard_interface.cpp
  chorus_section.cpp delay_section.cpp reverb_section.cpp distortion_section.cpp synthesis_interface.cpp modulation_interface.cpp""".split()}
PATHS.update({f: EC + f for f in "synth_preset_selector.cpp wavetable_3d.cpp envelope_editor.cpp line_editor.cpp modulation_button.cpp synth_slider.cpp".split()})
PATHS.update({"synth_constants.h": "src/common/synth_constants.h", "synth_parameters.cpp": "src/common/synth_parameters.cpp",
              "load_save.cpp": "src/common/load_save.cpp", "midi_manager.cpp": "src/common/midi_manager.cpp",
              "synth_voice_handler.cpp": "src/synthesis/modules/synth_voice_handler.cpp",
              "synth_strings.h": "src/interface/look_and_feel/synth_strings.h"})
NOTES = {   # what each file was read for (vital-ui-facts.md)
  "header_section.cpp": "The four tabs VOICE, EFFECTS, MATRIX, ADVANCED; logo, preset selector, volume, oscilloscope / spectrogram.",
  "full_interface.cpp": "Which tab shows which part of the synth; the modulation area, keyboard and voice strip kept under every tab.",
  "synth_preset_selector.cpp": "\"Init Preset\" and the * for a changed preset; the menu (Browse Presets, Save Preset, Initialize Preset ...).",
  "save_section.cpp": "The save box: NAME, AUTHOR, STYLE, COMMENTS; Save, Overwrite, Cancel.",
  "preset_browser.cpp": "Preset browser columns, search, style buttons, keys.",
  "volume_section.cpp": "VOLUME slider and peak meters.",
  "oscillator_section.cpp": "OSC 1-3: wavetable name and browser, pencil (editor), 3D / 2D / SP view, PITCH / UNISON / PHASE groups, LEVEL, PAN, spectral morph, distortion, destination.",
  "wavetable_3d.cpp": "Dragging the wavetable display moves the frame; dropping an audio file: WAVETABLE / VOCODE / PITCH SPLICE; right-click menu.",
  "oscillator_advanced_section.cpp": "Advanced tab per oscillator: STACK (unison stack styles) and other options.",
  "wavetable_edit_section.cpp": "The wavetable editor and its menu.",
  "sample_section.cpp": "The SMP section: on, level, pan, transpose, tune, destination, keytrack, loop.",
  "filter_section.cpp": "FILTER 1 / 2: on switch, OSC1 / OSC2 / OSC3 / SMP / FIL inputs, MODE (model : style), cutoff, resonance, drive, blend, key track, mix.",
  "envelope_section.cpp": "ENVELOPE n: DELAY, ATTACK, HOLD, DECAY, SUSTAIN, RELEASE and the curve controls.",
  "envelope_editor.cpp": "Dragging the envelope graph's points and curves; zoom.",
  "lfo_section.cpp": "LFO n: line editor, LFO browser, MODE, FREQUENCY and sync, DELAY, STEREO, smooth / fade, paint.",
  "line_editor.cpp": "Adding, moving and removing LFO points; paint mode.",
  "random_section.cpp": "RANDOM n: STYLE, FREQUENCY, STEREO, SYNC.",
  "modulation_button.cpp": "Dragging a modulation source out of its button starts a connection; click selects it; right-click Disconnect.",
  "modulation_manager.cpp": "Targets light up; hover connects at once (preview); release keeps it; starting amount; a modifier key makes it bipolar; 64 limit; amount knob menu.",
  "modulation_matrix.cpp": "MODULATION MATRIX columns # SOURCE BIPOLAR STEREO MORPH AMOUNT DESTINATION; 12 rows shown; destination sub-menus.",
  "modulation_interface.cpp": "ENVELOPE / LFO / RANDOM tabs; keyboard modulation buttons NOTE, VELOCITY, LIFT, OCT NOTE, PRESSURE, SLIDE, STEREO, RANDOM.",
  "synthesis_interface.cpp": "VOICE tab: OSC 1-3, SMP, FILTER 1, FILTER 2.",
  "macro_knob_section.cpp": "MACRO 1-4 knobs, each also a modulation source.",
  "voice_section.cpp": "VOICES (polyphony), VEL TRK, BEND.",
  "portamento_section.cpp": "GLIDE, SLOPE, OCTAVE SCALE, ALWAYS GLIDE, LEGATO.",
  "bend_section.cpp": "Pitch wheel and mod wheel next to the keyboard.",
  "master_controls_interface.cpp": "Advanced tab: MPE ENABLED, NOTE PRIORITY, VOICE OVERRIDE, TUNING; OVERSAMPLING.",
  "effects_interface.cpp": "The nine effects, each with an on switch; the drag-to-reorder effect list.",
  "keyboard_interface.cpp": "The on-screen keyboard.",
  "chorus_section.cpp": "CHORUS labels: VOICES, FREQUENCY, DEPTH, FEEDBACK, MIX, DELAY 1, DELAY 2, CUTOFF, SPREAD.",
  "delay_section.cpp": "DELAY labels: MODE, FREQUENCY, FEEDBACK, MIX, CUTOFF, SPREAD.",
  "reverb_section.cpp": "REVERB labels: TIME, PRE LOW CUT, PRE HIGH CUT, CUTOFF, GAIN, CHORUS AMT, CHORUS FRQ, DELAY, SIZE, MIX.",
  "distortion_section.cpp": "DISTORTION labels: TYPE, FILTER, DRIVE, MIX, CUTOFF, RESONANCE, BLEND.",
  "synth_slider.cpp": "Knob gestures: double-click = default, fine drag, Alt-click to type a value; right-click menu incl. Learn MIDI Assignment.",
  "midi_manager.cpp": "MIDI learn: the next control-change message is bound to the armed control and saved.",
  "synth_voice_handler.cpp": "The modulation sources: note, velocity, aftertouch, mod wheel, pitch wheel, lfo, env, random, macro ...",
  "load_save.cpp": "Preset file folders (Presets, Wavetables, User ...).",
  "synth_constants.h": "kNumOscillators 3, kNumFilters 2, kNumEnvelopes 6, kNumLfos 8, kNumRandomLfos 4, kNumMacros 4, kMaxModulationConnections 64, kMaxPolyphony 33 (32 playing), effects chorus / compressor / delay / distortion / EQ / filter / flanger / phaser / reverb, filter models Analog, Dirty, Ladder, Digital, Diode, Formant, Comb, Phase.",
  "synth_parameters.cpp": "Oscillator on, transpose, tune, level, wave frame, unison; filter cutoff 8-136 semitones, resonance, drive 0-20 dB, blend 0-2, key track; envelope times 0-2.378; LFO frequency -7..9; polyphony; portamento.",
  "synth_strings.h": "Filter styles (12dB, 24dB, Notch Blend, Notch Spread, B/P/N) and models (Analog, Dirty, Ladder, Digital, Diode, Formant, Comb, Phaser).",
}
# entries already in scripts/sources (same MLA text, so works-cited.py merges them into one)
SAME_MLA = {"synth_constants.h", "synth_parameters.cpp", "synth_strings.h"}
COMBINED = {"full_interface.cpp", "synthesis_interface.cpp", "modulation_interface.cpp"}   # cited as one entry in synth-views.py

PANEL_NOTE = ("This site's beginner Vital panel: the real plug-in's names and ranges for a few controls, played by this site's own sound "
              "engine (not Vital's code), so it is close but not the same. Play it from the keys under it, the computer keys "
              "(a w s e d f t g y h u j k) or a MIDI keyboard (**Use MIDI**).")

def S(ex, t, set=None, page=None): return dict(ex=ex, t=t, set=set or {}, page=page)

L = []   # the ten lessons, in order

# ------------------------------------------------------------------ 1
L.append(dict(slug="vital-01-window", title="Vital 1: The Vital window",
  desc="Find your way round Vital's window: the four tabs, the preset name, Init Preset and Save, the volume and the oscilloscope, and where the oscillators, filters, envelopes and LFOs live.",
  todo=["Learn the four tabs at the top of Vital.", "Find the preset name, Init Preset and Save.", "Find where each part of the synth lives.",
        "Press each **▶ Hear step** on this site's panel and open each tab.", "Check yourself with a short quiz."],
  ideas=[
    ("A synth in a window", [
      "- **Vital** is a *software synth*: a program that makes sounds. It runs inside a music program (a *DAW*, a digital audio workstation) as a *plug-in*.",
      "- Everything is in one window. Some parts are always there; others change when you pick a *tab* (a button that switches what the middle of the window shows).",
      "- This lesson is a map. The next nine lessons fill it in, one part at a time."]),
    ("The four tabs", [
      "- At the top are four tabs, in this order: **VOICE**, **EFFECTS**, **MATRIX**, **ADVANCED** (Vital source, header_section.cpp).",
      "- **VOICE** shows the oscillators, the sample and the filters. **EFFECTS** shows the effects. **MATRIX** shows the list of modulations. **ADVANCED** shows the \"master controls\" (Vital source, full_interface.cpp).",
      "- An *oscillator* makes the raw sound. A *filter* takes some of it away. *Effects* (echo, reverb ...) are added at the end. *Modulation* means one part moving a knob for you."]),
    ("The top strip", [
      "- The **preset name** sits in the middle of the top strip, with arrows to step to the previous or next preset. A *preset* is a saved sound. Click the name to open the **preset browser**, a list of all your presets (Vital source, synth_preset_selector.cpp).",
      "- An empty sound shows the name **Init Preset**. A `*` in front of the name means you have changed it since it was loaded (Vital source, synth_preset_selector.cpp).",
      "- Next to the name are a **Save** button and a **Menu** button (three lines) (Vital source, header_section.cpp).",
      "- To the right: **VOLUME**, with meters that show how loud the sound is, and an **oscilloscope**, a little screen that draws the wave you hear (Vital source, volume_section.cpp; header_section.cpp)."]),
    ("What stays on screen", [
      "- Under every tab you keep the **envelopes**, **LFOs**, **random** sources and **keyboard** sources on the right, the **voice** and **portamento** strip, and the keyboard along the bottom (Vital source, full_interface.cpp). That they never hide under any tab is read from the code, not checked in the plug-in (unverified).",
      "- The envelopes, LFOs and randoms each have numbered tab buttons down their left side, and one is shown at a time: **ENVELOPE 1**, **LFO 1**, **RANDOM 1** (Vital source, modulation_interface.cpp).",
      "- Down the far left are four **MACRO** knobs (Vital source, macro_knob_section.cpp). Lesson 7 uses them."]),
    ("This site's panel and the real one", [
      "- The panel below is drawn after the real window, at its default size of 1400 × 820, from Vital's layout code. The knobs inside each box are placed by this site, not measured.",
      "- **Dimmed** controls are drawn but do nothing here: they are *not modelled*. Choose **Show ▾ → Only working controls** in the panel's bar to hide them, and the panel gets much simpler. Choose it again to bring them back.",
      "- **Size −  +** in the bar makes the panel bigger or smaller. **Presets ▾** saves and loads your own sounds on this page (in this browser only).",
      "- The VOICE, EFFECTS and MATRIX tabs work on this panel. ADVANCED and the preset browser do not."]),
  ],
  steps=[
    S("vital-first", "**The VOICE tab.** One oscillator, the filter open. Look at **OSC 1** on the left: its wave screen shows a saw. Play a few keys, then click **EFFECTS** at the top of the panel and back to **VOICE**.", page="voice"),
    S("vital-first", "**The EFFECTS tab.** The same sound with **Reverb mix** at 35 %. The step opened the EFFECTS tab: find the REVERB box and its **MIX** knob. Listen for the room around each note, then turn MIX to 0 and back.", {"fxRev": 35}, page="fx"),
    S("vital-first", "**The MATRIX tab.** LFO 1 is moving the filter's cutoff (slot 1: **LFO 1 → Cutoff**, 40 %). Listen for the slow \"wah\". The step opened the MATRIX tab: find slot 1, its source, its destination and its amount.", {"m1s": "LFO 1", "m1d": "Cutoff", "m1a": 40, "cut": 72, "lfoRate": 1}, page="matrix"),
    S("vital-first", "**The volume.** The same first sound with **VOLUME** at 35 %. Find the VOLUME knob at the top right of the panel and turn it back up to 70. The sound gets louder but does not change colour.", {"vol": 35}, page="voice"),
    S("vital-pad", "**Only working controls.** A pad. Open **Show ▾** in the panel's bar and tick **Only working controls**. The dimmed knobs disappear. What is left is everything this page can play. Untick it to see the full window again.", page="voice"),
  ],
  real=[
    "- **Tabs.** The same four tabs: VOICE, EFFECTS, MATRIX, ADVANCED (Vital source, header_section.cpp). ADVANCED holds voice settings, oversampling and display options (Vital source, master_controls_interface.cpp).",
    "- **Preset browser.** Click the preset name. The tabs are replaced by **PRESET BROWSER** with an **X** to close it (Vital source, full_interface.cpp). It has columns Name, Style, Author and Date, a star for favourites, a **Search** box and style buttons; **Escape** closes it (Vital source, preset_browser.cpp).",
    "- **Menu.** The three-line button: Browse Presets, Save Preset, Open External Preset, Export Preset, Import Bank, Export Bank, **Initialize Preset**, Load Tuning File ... (Vital source, synth_preset_selector.cpp). Right-clicking the preset name opens the same menu.",
    "- **Init Preset.** *Initialize Preset* puts every control back to its starting value (Vital source, synth_preset_selector.cpp). In that starting sound only oscillator 1 is on and the filters and effects are off (Vital source, synth_parameters.cpp).",
    "- **Save.** The Save button opens a box with **NAME**, **AUTHOR**, **STYLE** and **COMMENTS** and the buttons Save, Overwrite and Cancel (Vital source, save_section.cpp). Styles: Bass, Lead, Keys, Pad, Percussion, Sequence, Experiment, SFX, Template (Vital source, synth_strings.h). Presets are `.vital` files (Vital source, synth_constants.h).",
    "- **Oscilloscope.** A button on it switches it to a *spectrogram*, a picture of the sound's harmonics (Vital source, header_section.cpp).",
    "- **Counts.** 3 oscillators, 1 sample, 2 filters, 6 envelopes, 8 LFOs, 4 randoms, 4 macros, up to 64 modulations (Vital source, synth_constants.h). This page has 3, 1 (noise), 1, 3, 2, 1, 0 and 8.",
    "- **Names.** The free source code builds a synth called \"Vial\", and the code can be newer or older than the plug-in you download, so a few names on screen may differ (Vital README).",
  ],
  tryit=["Open Vital in your DAW. Read the preset name at the top.", "Click **VOICE**, **EFFECTS**, **MATRIX** and **ADVANCED** in turn. Say what each one shows.",
         "Click the preset name to open the browser. Find the Search box. Press Escape to close it.", "Open the Menu (three lines) and choose **Initialize Preset**. The name should read *Init Preset*.",
         "Play a key and watch the oscilloscope. Click the button on it to see the spectrogram.", "Find ENVELOPE 1, LFO 1 and RANDOM 1 on the right."],
  quiz=[
    ("Which tab shows the oscillators and filters?", ["VOICE", "EFFECTS", "MATRIX", "ADVANCED"], 0, "VOICE shows the oscillators, sample and filters (full_interface.cpp)."),
    ("What does a * in front of the preset name mean?", ["You have changed the sound since loading it", "The preset is a favourite", "The preset is broken", "It is a factory preset"], 0, "synth_preset_selector.cpp adds * when the preset is modified."),
    ("How do you get a clean, empty sound to start from?", ["Menu → Initialize Preset", "Turn the volume to 0", "Open the MATRIX tab", "Double-click the oscilloscope"], 0, "Initialize Preset loads the starting values (synth_preset_selector.cpp); the name shows Init Preset."),
    ("On this site's panel, what does a dimmed knob mean?", ["This page does not play it", "It is turned off", "It is broken in Vital", "It is a modulation"], 0, "Dimmed = drawn but not modelled. Show ▾ → Only working controls hides them."),
    ("Which part stays on screen under every tab?", ["The envelopes and LFOs", "The oscillators", "The effects", "The modulation matrix"], 0, "The modulation area stays (full_interface.cpp; read from the code)."),
  ]))

# ------------------------------------------------------------------ 2
L.append(dict(slug="vital-02-oscillators", title="Vital 2: Oscillators and wavetables",
  desc="How Vital's three oscillators make sound: the wavetable and its wave frame, transpose and tune, level, and unison, on this site's panel and then in the real plug-in.",
  todo=["Learn what a wavetable and a wave frame are.", "Move the wave frame and hear the tone change.", "Stack two and three oscillators, in tune and a little out of tune.",
        "Hear unison.", "Find the same controls, and more, in the real Vital."],
  ideas=[
    ("Oscillators", [
      "- An **oscillator** makes the raw sound: a wave that repeats very fast. How fast it repeats is the *pitch*; the wave's *shape* is the *tone* (bright, soft, hollow ...).",
      "- Vital has three: **OSC 1**, **OSC 2**, **OSC 3** (Vital source, oscillator_section.cpp; synth_constants.h). Each has an on switch at its top left."]),
    ("Wavetables and the wave frame", [
      "- A *wavetable* is a row of single waves, one after another, called *frames*. Vital's tables have 257 frames, numbered 0 to 256 (Vital source, synth_constants.h).",
      "- **Wave frame** picks which frame plays. Turn it and the wave morphs from one shape to the next (Vital source, synth_parameters.cpp).",
      "- On this page each oscillator has one table: sine at frame 0, triangle near 85, square near 171, saw at 256. It is modelled on Vital's *Basic Shapes* table; that name and the frame order are this site's guess (unverified).",
      "- A *sine* is the softest wave, a single pure tone. A *saw* is the brightest and buzziest. *Triangle* and *square* sit between them; the square sounds hollow."]),
    ("Pitch and level", [
      "- **Transpose** moves the oscillator in semitones (a semitone = one piano key), -48 to +48; 12 is one octave (Vital source, synth_parameters.cpp).",
      "- **Tune** moves it in *cents*, hundredths of a semitone. Two oscillators a few cents apart *beat*: you hear a slow wobble, which makes the sound thick.",
      "- **Level** is how loud each oscillator is. A new oscillator starts at about 71 % (Vital source, synth_parameters.cpp)."]),
    ("Unison", [
      "- **Unison** plays several copies of the oscillator at once, each slightly out of tune, for a big, wide sound. Vital allows 1 to 16 voices per oscillator (Vital source, synth_parameters.cpp).",
      "- On this page one **Unison** knob is shared by all three oscillators, up to 8, and while it is above 1 the panel plays one note at a time (this page's engine). The real Vital keeps playing chords with unison on (unverified)."]),
  ],
  steps=[
    S("vital-first", "**A sine.** Oscillator 1 on **Wave frame 0**. Listen: a soft, pure tone like a whistle. Now drag **FRAME** slowly up to 256 while a note plays.", {"o1Frame": 0}, page="voice"),
    S("vital-first", "**Triangle and square.** Frame 171: the square, hollow like a clarinet. Turn **FRAME** to 85 for the triangle (softer) and then to 256 for the saw (brightest).", {"o1Frame": 171}, page="voice"),
    S("vital-first", "**Two oscillators, an octave apart.** OSC 2 is on: a sine, **TRANSPOSE** +12, **LEVEL** 50 %. Listen for a sweet whistle on top of the saw. Switch OSC 2 off and on with its switch to hear what it adds.", {"o2On": True, "o2Frame": 0, "o2Tr": 12, "o2Lvl": 50}, page="voice"),
    S("vital-first", "**A little out of tune.** OSC 1 and OSC 2 are both saws, **TUNE** -10 and +10 cents. Listen for the slow wobble (beating). Set both TUNE knobs to 0: the wobble stops and the sound gets thinner.", {"o2On": True, "o2Frame": 256, "o1Tune": -10, "o2Tune": 10}, page="voice"),
    S("vital-first", "**All three.** OSC 3 adds a square an octave down (**TRANSPOSE** -12, frame 171). Listen for the weight underneath. Turn OSC 3's **LEVEL** down to 0 and up again.", {"o2On": True, "o2Frame": 256, "o2Tune": 7, "o3On": True, "o3Tr": -12, "o3Frame": 171, "o3Lvl": 60}, page="voice"),
    S("vital-lead", "**Unison.** A lead with **UNISON** at 4: four copies of each oscillator, spread in pitch. Listen to the width. Turn UNISON to 1 (thin) and to 8 (huge).", page="voice"),
  ],
  real=[
    "- **The wavetable's name** is at the top of each oscillator's display. Click it to open a wavetable browser; the arrows beside it step through the wavetables (Vital source, oscillator_section.cpp). After *Initialize* the name reads **Init** (Vital source, oscillator_section.cpp); what that starting wave looks like is not in the notes (unverified).",
    "- **The pencil** at the display's bottom-right opens the **wavetable editor**, where you can draw and build your own tables (Vital source, oscillator_section.cpp; wavetable_edit_section.cpp).",
    "- **3D / 2D / SP.** A small button at the display's bottom-left switches the picture between 3D, 2D and SP (the spectrum) (Vital source, oscillator_section.cpp; synth_strings.h).",
    "- **Moving the frame.** Drag up and down on the display, or use the mouse wheel over it, or the vertical WAVE FRAME slider beside it (Vital source, wavetable_3d.cpp).",
    "- **Your own sounds.** Drag one audio file onto the display. Where you drop it chooses how it is turned into a wavetable: top part **WAVETABLE**, middle **VOCODE**, bottom **PITCH SPLICE** (Vital source, wavetable_3d.cpp).",
    "- **Spectral morph** (the left menu under the display) changes the wave's harmonics: Vocode, Formant Scale, Harmonic Stretch, Inharmonic Stretch, Smear, Random Amplitudes, Low Pass, High Pass, Phase Disperse, Shepard Tone, Spectral Time Skew (Vital source, synth_strings.h).",
    "- **Distortion** (the right menu) bends the wave: Sync, Formant, Quantize, Bend, Squeeze, Pulse, and FM or RM from another oscillator or the sample (Vital source, synth_strings.h). Each has an amount knob. This page does neither.",
    "- **PITCH, UNISON, PHASE, LEVEL, PAN.** Transpose and tune are in the PITCH group; hold **Shift** while dragging transpose to move in octaves. UNISON has voices (1-16), detune and detune power (Vital source, oscillator_section.cpp).",
    "- **Stacks.** On the ADVANCED tab each oscillator's **STACK** menu turns unison into chords: Unison, Center Drop 12, Center Drop 24, Octave, 2x Octave, Power Chord, 2x Power Chord, Major Chord, Minor Chord, Harmonics, Odd Harmonics (Vital source, synth_strings.h; oscillator_advanced_section.cpp).",
    "- **Where it goes.** Each oscillator has a DESTINATION: Filter 1, Filter 2, Filter 1+2, Effects or Direct Out. At the start OSC 1 goes to Filter 1, OSC 2 to Filter 2 and OSC 3 to Effects (Vital source, oscillator_section.cpp; synth_parameters.cpp). Lesson 3 explains why that matters.",
  ],
  tryit=["Initialize the preset. Play a key: only OSC 1 is on.", "Drag up and down on OSC 1's display. Watch the frame number and listen.",
         "Click the wavetable name and load a different wavetable. Step through a few with the arrows.", "Switch the view button between 3D, 2D and SP.",
         "Turn OSC 2 on and set its TRANSPOSE to +12 (hold Shift while dragging).", "Set UNISON voices to 4 on OSC 1 and listen.",
         "Click the pencil, look at the editor, and close it with its X."],
  quiz=[
    ("What does the Wave frame control pick?", ["Which wave in the wavetable plays", "The volume", "The filter model", "How many voices play"], 0, "A wavetable is a row of frames; Wave Frame picks one (synth_parameters.cpp)."),
    ("Two oscillators a few cents apart make…", ["A slow wobble (beating) and a thicker sound", "An echo", "Silence", "A higher octave"], 0, "Step 4."),
    ("How far is Transpose +12?", ["One octave", "One semitone", "Twelve cents", "Half a step"], 0, "12 semitones = an octave."),
    ("In the real Vital, how do you open the wavetable editor?", ["Click the pencil on the oscillator's display", "Double-click the volume", "Open the MATRIX tab", "Right-click the keyboard"], 0, "oscillator_section.cpp: the pencil opens the editor."),
    ("Where does OSC 3 go in a fresh Init Preset?", ["To the Effects, not to a filter", "To Filter 1", "To Filter 2", "Nowhere: it is broken"], 0, "Defaults: osc 1 → Filter 1, osc 2 → Filter 2, osc 3 → Effects (synth_parameters.cpp)."),
  ]))

# ------------------------------------------------------------------ 3
L.append(dict(slug="vital-03-filter", title="Vital 3: The filter",
  desc="What Vital's filter does: model and style, cutoff, resonance, drive, blend and key track, by ear on this site's panel, then the real plug-in's two filters and how oscillators reach them.",
  todo=["Learn what a filter does and what cutoff and resonance mean.", "Hear 12 dB and 24 dB, low-pass, band-pass and high-pass.", "Add drive and key tracking.",
        "Learn the real Vital's two filters and how the oscillators get into them.", "Check yourself."],
  ideas=[
    ("What a filter does", [
      "- A **filter** takes away part of the sound. Most often it takes away the high, bright part, like putting your hand over your mouth while you sing.",
      "- **Cutoff** is where it starts cutting. Low cutoff = dark and muffled; high cutoff = bright. In Vital it runs from 8 to 136, in semitones (piano keys) (Vital source, synth_parameters.cpp).",
      "- **Resonance** boosts the sound right at the cutoff. A little sounds sharper; a lot makes a whistling ring."]),
    ("Model and style", [
      "- The **model** is the kind of filter circuit it copies; the **style** is how steep it cuts. The real Vital shows them together as *Model : Style*, for example **Analog : 12dB** (Vital source, filter_section.cpp).",
      "- **12dB** cuts gently, **24dB** cuts more steeply (darker, more \"synth\").",
      "- This page plays three models (Analog, Ladder, Digital) and three styles (12dB, 24dB, Notch) with its own filter code, not Vital's."]),
    ("Blend, drive, key track", [
      "- **Blend** (0 to 2) moves the filter between keeping the lows, the middle and the highs. On this page 0 = low-pass (keeps lows), 1 = band-pass (keeps a middle band), 2 = high-pass (keeps highs): this site's reading of Vital's code (unverified).",
      "- **Drive** (0 to 20 dB) pushes the sound harder into the filter, for grit (Vital source, synth_parameters.cpp).",
      "- **Key track** (KEY TRK) moves the cutoff with the note you play, so high notes stay as bright as low ones."]),
  ],
  steps=[
    S("vital-first", "**Cutoff down.** The saw with **CUTOFF** at 60. Listen: muffled. Drag CUTOFF slowly up to 120 while you play: the sound opens up.", {"cut": 60, "res": 10}, page="voice"),
    S("vital-first", "**Resonance up.** **CUTOFF** 70, **RESONANCE** 70 %. Listen for the whistle on top of each note. Now move CUTOFF: the whistle moves with it.", {"cut": 70, "res": 70}, page="voice"),
    S("vital-first", "**24 dB Ladder.** The style is **24dB**, the model **Ladder**, cutoff 75. Listen: darker and rounder than 12 dB. Switch the style back to 12dB to compare.", {"cut": 75, "res": 30, "fModel": "Ladder", "fStyle": "24dB"}, page="voice"),
    S("vital-first", "**Blend.** **BLEND** at 1 (band-pass), cutoff 80: the lows and highs are gone, a nasal middle is left. Turn BLEND to 2: now only the highs, thin and fizzy.", {"fBlend": 1, "cut": 80, "res": 30}, page="voice"),
    S("vital-first", "**Drive.** **DRIVE** 12 dB with some resonance. Listen for grit and a louder, rougher tone. Turn DRIVE to 0 to compare.", {"drive": 12, "cut": 85, "res": 40}, page="voice"),
    S("vital-first", "**Key track.** **KEY TRK** 100 %, cutoff 66. The melody's high notes stay bright. Set KEY TRK to 0 and play high and low keys: now the high notes go dull.", {"key": 100, "cut": 66, "res": 20}, page="voice"),
  ],
  real=[
    "- **Two filters.** FILTER 1 and FILTER 2 on the VOICE tab, plus a FILTER effect on the EFFECTS tab (Vital source, synthesis_interface.cpp; effects_interface.cpp).",
    "- **Off at the start.** Each filter has an **on** switch, and in a new Init Preset both are off (Vital source, synth_parameters.cpp). Switch FILTER 1 on before turning its knobs, or you will hear no change.",
    "- **What goes in.** Under each filter are buttons **OSC1**, **OSC2**, **OSC3** and **SMP** (the sample) that choose what it filters, and **FIL2** on filter 1 (FIL1 on filter 2) to run one filter into the other (Vital source, filter_section.cpp).",
    "- **The trap.** At the start filter 1 takes OSC 1 and filter 2 takes OSC 2 (Vital source, synth_parameters.cpp), and OSC 3 goes straight to the effects (Vital source, oscillator_section.cpp). To filter all three with Filter 1, set each oscillator's DESTINATION to *Filter 1* (Vital source, oscillator_section.cpp).",
    "- **All the models.** Analog, Dirty, Ladder, Digital, Diode, Formant, Comb, Phaser. Analog, Dirty, Ladder and Digital have styles 12dB, 24dB, Notch Blend, Notch Spread and B/P/N; Diode has Low Shelf and Low Cut; Comb has six styles; Phaser has Positive and Negative (Vital source, synth_strings.h; filter_section.cpp). Click the MODE box: each model opens a list of its styles; the arrows step through them all (Vital source, filter_section.cpp).",
    "- **Knobs that change.** With Comb, DRIVE becomes CUT; with Formant you get PEAK, SPREAD and an X / Y pad instead of cutoff and resonance (Vital source, filter_section.cpp). Formant's style list is not settled in the notes (unverified).",
    "- **Starting values.** Cutoff 60, resonance 50 %, mix 100 %, Analog : 12dB (Vital source, synth_parameters.cpp). There is also a **MIX** knob (filtered against dry) and the cutoff can be shown in Hz (Vital source, filter_section.cpp).",
  ],
  tryit=["Initialize the preset. Switch **FILTER 1** on.", "Drag CUTOFF down and up while playing. Then raise RESONANCE.",
         "Click the MODE box and choose **Ladder**, then **24dB**.", "Turn OSC 2 on. Is it filtered? Check the **OSC2** button under FILTER 1, or set OSC 2's DESTINATION to Filter 1.",
         "Try the Comb model and listen to how different it is.", "Turn DRIVE up and listen for grit."],
  quiz=[
    ("Turning Cutoff down makes the sound…", ["Darker and more muffled", "Louder", "Higher in pitch", "Echo"], 0, "The filter takes away the highs above the cutoff."),
    ("What does Resonance do?", ["Boosts the sound at the cutoff, up to a whistle", "Adds voices", "Changes the wavetable", "Makes notes longer"], 0, "Step 2."),
    ("You turn Filter 1's cutoff in a new Init Preset and nothing changes. Why?", ["The filter starts switched off", "The cutoff knob is broken", "You need the MATRIX tab", "Filters only work on chords"], 0, "Filter on defaults to 0 (synth_parameters.cpp)."),
    ("In the real Vital, how does OSC 2 get into Filter 1?", ["The OSC2 button under Filter 1, or OSC 2's destination set to Filter 1", "It always does", "Through the reverb", "It cannot"], 0, "filter_section.cpp input buttons; oscillator_section.cpp destination."),
    ("Which is steeper?", ["24dB", "12dB", "They are the same", "Neither cuts anything"], 0, "24 dB per octave cuts more than 12."),
  ]))

# ------------------------------------------------------------------ 4
L.append(dict(slug="vital-04-envelopes", title="Vital 4: Envelopes",
  desc="Envelopes shape a sound over time: attack, decay, sustain and release by ear, Envelope 1 on the loudness, Envelope 2 on the cutoff and the wave frame, Envelope 3 through the matrix, and the real Vital's six envelopes.",
  todo=["Learn what attack, decay, sustain and release mean.", "Shape the loudness with Envelope 1: a swell and a pluck.", "Move the filter and the wave frame with Envelope 2.",
        "Use Envelope 3 through the matrix.", "Find the real Vital's six envelopes."],
  ideas=[
    ("What an envelope is", [
      "- An **envelope** is a shape over time that starts when you press a key and ends after you let go. It moves something for you: the loudness, the cutoff, the wave frame.",
      "- It has four parts, written **ADSR**:",
      "  - **Attack**: how long it takes to rise when you press the key.",
      "  - **Decay**: how long it takes to fall to the sustain level.",
      "  - **Sustain**: the level it holds while the key stays down (a level, not a time).",
      "  - **Release**: how long it takes to fade after you let go."]),
    ("Times in Vital", [
      "- Vital's attack, decay and release knobs run from 0 to about 2.378 (Vital source, synth_parameters.cpp). They are not seconds: this page reads the knob value to the power 4 as seconds (1.0 = 1 s, 2.378 = 32 s), a reading of the code (unverified).",
      "- So small moves near 0 are tiny times, and the same move near the top is many seconds."]),
    ("Which envelope does what", [
      "- On this page **Envelope 1** always shapes the loudness. In the real Vital, Envelope 1 controls the loudness at the start too, but that is not stated in the files read (unverified).",
      "- **Envelope 2** has two fixed routes here: **→ cutoff** and **→ frame** (the small knobs under it).",
      "- **Envelope 3** is on the MATRIX tab and does nothing until a matrix slot uses it."]),
  ],
  steps=[
    S("vital-first", "**A slow swell.** Envelope 1 **ATTACK** 0.9 (about 0.7 s) and **RELEASE** 1.0. Listen: each note fades in and rings on after it ends. Turn ATTACK down to 0 for a sharp start.", {"e1A": 0.9, "e1R": 1.0}, page="voice"),
    S("vital-first", "**A pluck.** **SUSTAIN** 0 %, **DECAY** 0.5, **ATTACK** 0. Each note starts loud and dies away even while the key is held, like a plucked string. Raise DECAY to 0.9 for a longer ring.", {"e1A": 0, "e1D": 0.5, "e1S": 0, "e1R": 0.3}, page="voice"),
    S("vital-first", "**Decay to a sustain.** **DECAY** 0.7, **SUSTAIN** 40 %. Hold a key: it starts loud, then settles to a quieter level and stays. Move SUSTAIN up and down while holding a key.", {"e1D": 0.7, "e1S": 40}, page="voice"),
    S("vital-first", "**Envelope 2 on the cutoff.** The filter is nearly closed (cutoff 50), and **Env 2 → cutoff** at +36 opens it at the start of each note: a \"blip\". Make Envelope 2's DECAY longer (0.9) for a slower \"wow\".", {"cut": 50, "res": 35, "e2Cut": 36, "e2A": 0, "e2D": 0.6, "e2S": 0, "e2R": 0.3}, page="voice"),
    S("vital-morph", "**Envelope 2 on the wave frame.** **Env 2 → frame** at 256 moves OSC 1 from sine to saw on every note: brighter as the note goes on, with no filter at all. Make Envelope 2's ATTACK shorter and listen again.", page="voice"),
    S("vital-first", "**Envelope 3 through the matrix.** Slot 1: **Env 3 → Osc 1 pitch**, 6 %. Envelope 3 has no sustain and a short decay, so each note starts a little high and drops: a \"zap\". Turn Envelope 3's DECAY up on the MATRIX tab for a slower drop.", {"m1s": "Env 3", "m1d": "Osc 1 pitch", "m1a": 6, "e3A": 0, "e3D": 0.45, "e3S": 0, "e3R": 0.3}, page="matrix"),
  ],
  real=[
    "- **Six envelopes:** ENVELOPE 1 to 6, one shown at a time; click the numbered buttons on the left of the envelope area to switch (Vital source, synth_constants.h; modulation_interface.cpp).",
    "- **Six knobs, not four:** **DELAY**, ATTACK, **HOLD**, DECAY, SUSTAIN, RELEASE (Vital source, envelope_section.cpp). DELAY waits before the attack starts; HOLD keeps the top level for a while before the decay.",
    "- **Curves:** attack, decay and release can each be bent into a curve, not only a straight line (Vital source, envelope_section.cpp).",
    "- **Drag the picture:** drag the points of the envelope graph left and right for times and the sustain point up and down for the level; drag a curve handle up or down to bend it, double-click it to straighten it; the mouse wheel zooms (Vital source, envelope_editor.cpp).",
    "- **Starting values:** attack 0.1495, decay 1.0, sustain 100 %, release 0.5476 on the knob's own scale (Vital source, synth_parameters.cpp). The seconds those mean are not in the notes (unverified).",
    "- **Any envelope, anywhere:** in the real Vital you drag the **ENV 2** button (or any ENV button) onto any knob (lesson 5). This page's fixed *→ cutoff* and *→ frame* knobs stand in for that.",
  ],
  tryit=["Initialize the preset. Click ENVELOPE 1 and drag its ATTACK point to the right. Play: the sound fades in.", "Drag the sustain point down to the bottom for a pluck.",
         "Bend the decay curve by dragging its handle; double-click the handle to straighten it.", "Click ENV 2 and look at its knobs: DELAY, ATTACK, HOLD, DECAY, SUSTAIN, RELEASE.",
         "Lesson 5 shows how to drag ENV 2 onto the cutoff."],
  quiz=[
    ("Which part of an envelope is a level, not a time?", ["Sustain", "Attack", "Decay", "Release"], 0, "Sustain is the level held while the key is down."),
    ("A plucked sound has…", ["Short attack, no sustain", "Long attack, full sustain", "No release at all", "Only release"], 0, "Step 2."),
    ("Envelope 2 → cutoff makes each note…", ["Open the filter and close it again", "Louder for ever", "Change wavetable", "Play an octave up"], 0, "Step 4."),
    ("How many envelopes does the real Vital have?", ["6", "2", "3", "64"], 0, "kNumEnvelopes = 6 (synth_constants.h)."),
    ("Which two knobs does the real Vital's envelope have that this page's does not?", ["Delay and Hold", "Cutoff and Resonance", "Rate and Shape", "Mix and Drive"], 0, "envelope_section.cpp: DELAY, ATTACK, HOLD, DECAY, SUSTAIN, RELEASE."),
  ]))

# ------------------------------------------------------------------ 5
L.append(dict(slug="vital-05-modulation", title="Vital 5: Modulation, drag and drop",
  desc="Vital's big idea: drag a source (an envelope, LFO or the keyboard) onto any knob to make it move. Try it on this site's panel, read the slots on the MATRIX tab, use negative amounts, then learn the real plug-in's exact steps.",
  todo=["Learn what a modulation source, destination and amount are.", "Drag a source onto a knob on this site's panel.", "Read and change the slot on the MATRIX tab, including negative amounts.",
        "Learn exactly how dragging works in the real Vital.", "Check yourself."],
  ideas=[
    ("Source, destination, amount", [
      "- **Modulation** means one part of the synth turning a knob for you, over and over or on every note.",
      "- The part that does the moving is the **source** (an envelope, an LFO, the keyboard). The knob it moves is the **destination**. How far it moves it is the **amount**.",
      "- One source → one destination at one amount is one **connection**."]),
    ("Drag and drop on this page", [
      "- The source buttons are on the right of the panel: **ENV 1-3**, **LFO 1-2**, **RAND 1**, and **NOTE** and **VELOCITY** in KEYBOARD MODS.",
      "- Press on one, drag it onto a knob that can take it (wave frame, transpose / tune, level, cutoff or volume), and let go. The panel fills the next free **slot** at 50 % and puts a ring on the knob. A message says which slot it used.",
      "- This page has 8 slots. A control that cannot take modulation here says so (the real Vital can modulate it)."]),
    ("The MATRIX tab and negative amounts", [
      "- The **MATRIX** tab lists the 8 slots: source → destination, and **AMT** (amount) from -100 % to +100 %. Click a box to step through its choices; Shift-click goes back.",
      "- A **negative** amount moves the knob the other way: Env 2 at -40 % on the cutoff closes the filter on each note instead of opening it.",
      "- 100 % here means the destination's whole range on this page (this site's reading of how Vital counts amounts, unverified)."]),
  ],
  steps=[
    S("vital-first", "**A dropped connection.** This is what you get after dragging **LFO 1** onto **CUTOFF**, at 40 %: the cutoff sweeps up and down. Listen for the slow wah. Now try it yourself: drag **LFO 2** onto OSC 1's **LEVEL** and listen.", {"m1s": "LFO 1", "m1d": "Cutoff", "m1a": 40, "cut": 72, "lfoRate": 1}, page="voice"),
    S("vital-first", "**Read it on the MATRIX tab.** The same connection, shown in slot 1. Click its **AMT** knob and drag it up to 80 %: a deeper sweep. Drag it to 10 %: barely moving.", {"m1s": "LFO 1", "m1d": "Cutoff", "m1a": 40, "cut": 72, "lfoRate": 1}, page="matrix"),
    S("vital-first", "**Envelope 2 through a slot.** Slot 1: **Env 2 → Cutoff**, +30 %, the cutoff low. Each note opens the filter. This is the same as Env 2's fixed → cutoff knob, made with a slot instead.", {"m1s": "Env 2", "m1d": "Cutoff", "m1a": 30, "cut": 50, "res": 30, "e2A": 0, "e2D": 0.6, "e2S": 0}, page="matrix"),
    S("vital-first", "**Negative.** The same slot at **-30 %** with the cutoff high (110). Now each note starts dark and gets brighter as the envelope falls back. Drag AMT between -30 and +30 and compare.", {"m1s": "Env 2", "m1d": "Cutoff", "m1a": -30, "cut": 110, "res": 30, "e2A": 0, "e2D": 0.6, "e2S": 0}, page="matrix"),
    S("vital-first", "**A moving wave.** Slot 1: **LFO 1 → Osc 1 frame**, 60 %, the frame in the middle. The tone morphs back and forth on its own. Drag **ENV 1** onto **TUNE** of OSC 1 next, then look at slot 2.", {"m1s": "LFO 1", "m1d": "Osc 1 frame", "m1a": 60, "o1Frame": 128, "lfoRate": 0}, page="matrix"),
    S("vital-first", "**Two at once.** Slot 1 gives vibrato (**LFO 1 → All pitch**, 1 %), slot 2 opens the filter on each note (**Env 2 → Cutoff**, 25 %). One sound, two connections. Set slot 1's source to **—** to switch it off.", {"m1s": "LFO 1", "m1d": "All pitch", "m1a": 1, "lfoRate": 2.4, "m2s": "Env 2", "m2d": "Cutoff", "m2a": 25, "cut": 60, "res": 25, "e2A": 0, "e2D": 0.7, "e2S": 10}, page="matrix"),
  ],
  real=[
    "- **The sources** are small buttons: ENV 1-6, LFO 1-8, RANDOM 1-4, a button under each MACRO knob, and the keyboard sources NOTE, VELOCITY, LIFT, OCT NOTE, PRESSURE, SLIDE, STEREO, RANDOM (Vital source, modulation_interface.cpp; macro_knob_section.cpp). An unused one shows drag arrows when you point at it (Vital source, modulation_button.cpp).",
    "- **The exact drag:** (1) press on a source button and drag out of it: a line follows the pointer and every knob that can take it lights up (Vital source, modulation_button.cpp; modulation_manager.cpp). (2) Move over a knob: the connection is made at once so you can *hear it before you commit*; move off and it goes away again (Vital source, modulation_manager.cpp; vital.audio). (3) Let go over the knob to keep it (Vital source, modulation_manager.cpp).",
    "- **Starting amount:** the room left above the knob's setting, but at least 25 % (Vital source, modulation_manager.cpp). Turn the mouse wheel while dragging to change it (Vital source, modulation_manager.cpp).",
    "- **Both ways (bipolar):** hold any modifier key (Shift, Ctrl, Alt or Cmd) while you drag and the connection moves the knob both up and down around its setting (Vital source, modulation_manager.cpp). A normal (unipolar) one moves it up only.",
    "- **Changing the amount later:** click the source button. Small amount knobs appear beside every knob it moves; drag one (Vital source, modulation_button.cpp; modulation_manager.cpp). Clicking a modulated knob selects its source too (Vital source, modulation_manager.cpp). What the ring round a modulated knob looks like is not in the notes (unverified).",
    "- **Right-click an amount knob:** Remove, Bypass, Make Bipolar, Make Stereo, Learn MIDI Assignment, Enter Value. Double-click it to remove the connection (Vital source, modulation_manager.cpp). Right-click a source button: *Disconnect from ...* for each connection (Vital source, modulation_button.cpp).",
    "- **64 connections** at most; when all are used, dragging does not start (Vital source, modulation_manager.cpp; synth_constants.h).",
    "- **The MATRIX tab** is titled MODULATION MATRIX, with columns **#**, **SOURCE**, **BIPOLAR**, **STEREO**, **MORPH**, **AMOUNT**, **DESTINATION**; 12 rows show at once and it scrolls (Vital source, modulation_matrix.cpp). The # button switches a row off (bypass); STEREO reads L/R; MORPH bends the connection's curve, edited in a MOD REMAP box below (Vital source, modulation_matrix.cpp). Click a heading to sort by it (Vital source, modulation_matrix.cpp).",
  ],
  tryit=["Initialize the preset and switch FILTER 1 on (lesson 3).", "Drag **LFO 1** out of its button. Watch the knobs light up. Hover over CUTOFF and listen, move off, then come back and let go.",
         "Click LFO 1's button. Find the small amount knob near CUTOFF and drag it.", "Drag **ENV 2** onto CUTOFF while holding Shift. Is it bipolar now?",
         "Open the **MATRIX** tab and find your two rows. Read SOURCE, AMOUNT and DESTINATION.", "Right-click an amount knob and choose **Remove**."],
  quiz=[
    ("In \"LFO 1 → Cutoff\", which is the source?", ["LFO 1", "Cutoff", "The amount", "The matrix"], 0, "The source moves the destination."),
    ("In the real Vital, what happens while you hover a dragged source over a knob, before letting go?", ["The connection is made for now, so you can hear it", "Nothing", "The knob resets", "The preset is saved"], 0, "modulation_manager.cpp; vital.audio: a preview before committing."),
    ("How do you make a bipolar connection while dragging?", ["Hold a modifier key such as Shift", "Drag twice", "Use the right mouse button", "You cannot"], 0, "Any modifier down makes it bipolar (modulation_manager.cpp)."),
    ("A negative amount on cutoff does what?", ["Moves the cutoff down instead of up", "Silences the sound", "Changes the LFO shape", "Doubles the volume"], 0, "Step 4."),
    ("How many connections can the real Vital have?", ["64", "8", "4", "Unlimited"], 0, "kMaxModulationConnections = 64 (synth_constants.h). This page has 8."),
    ("Where can you see every connection as a list?", ["The MATRIX tab", "The EFFECTS tab", "The preset browser", "The oscilloscope"], 0, "modulation_matrix.cpp."),
  ]))

# ------------------------------------------------------------------ 6
L.append(dict(slug="vital-06-lfos", title="Vital 6: LFOs and Random",
  desc="LFOs move a knob over and over; Random moves it unpredictably. Shape and rate on this site's LFO 1, LFO 2 and Random, then the real Vital's eight drawable LFOs, modes, sync and four random styles.",
  todo=["Learn what an LFO is, and its shape and rate.", "Hear vibrato, a trill-like jump, a sweep and a slow morph.", "Use LFO 2 and Random through the matrix.",
        "Find the real Vital's LFO modes, tempo sync and random styles.", "Check yourself."],
  ideas=[
    ("What an LFO is", [
      "- An **LFO** (*low-frequency oscillator*) is an oscillator too slow to hear as a note. You do not listen to it; it moves a knob up and down for you, again and again.",
      "- Its **shape** is how it moves: a *sine* or *triangle* glides smoothly, a *saw* ramps and jumps back, a *square* flips between two places.",
      "- Its **rate** (FREQUENCY) is how fast. On this page, as in Vital, it runs from -7 to 9 (Vital source, synth_parameters.cpp); this page reads that as 2 to the power of the number in hertz (times a second): 0 = once a second, 1 = twice, 3 = 8 times (unverified)."]),
    ("LFO 1, LFO 2 and Random here", [
      "- **LFO 1** has three fixed routes under it: **→ PITCH** (vibrato), **→ CUTOFF** and **→ FRAME**. Or drag its button onto a knob.",
      "- **LFO 2** and **RANDOM 1** are on the MATRIX tab and work through slots only.",
      "- **Random** here jumps to a new random level at each tick of its rate (*sample and hold*). It is this page's own random; Vital's has four styles (below)."]),
  ],
  steps=[
    S("vital-first", "**Vibrato.** LFO 1: sine, rate 2.5 (about 6 times a second), **→ PITCH** 0.4 semitones. Listen for the singer-like wobble. Raise → PITCH to 2 for a seasick wobble, then back.", {"lfoShape": "sine", "lfoRate": 2.5, "lfoPitch": 0.4}, page="voice"),
    S("vital-first", "**A square jumps.** LFO 1: **square**, rate 2, → PITCH 5 semitones: the pitch flips between two notes, like a trill. Change SHAPE to triangle: it slides between them instead.", {"lfoShape": "square", "lfoRate": 2, "lfoPitch": 5}, page="voice"),
    S("vital-first", "**A saw on the cutoff.** LFO 1: **saw**, rate 1.5, **→ CUTOFF** 30, cutoff 70. Each cycle the filter sweeps one way and snaps back. Listen for the repeating \"yow\".", {"lfoShape": "saw", "lfoRate": 1.5, "lfoCut": 30, "cut": 70, "res": 40}, page="voice"),
    S("vital-first", "**A slow morph.** LFO 1: triangle, rate -1 (once every two seconds), **→ FRAME** 200, the frame in the middle. Hold a note and hear it morph between soft and bright.", {"lfoShape": "tri", "lfoRate": -1, "lfoFrame": 200, "o1Frame": 128}, page="voice"),
    S("vital-first", "**LFO 2 as well.** LFO 1 gives vibrato; slot 1 sends **LFO 2** (square, rate 2) to the cutoff at 30 %. Two LFOs at two speeds. Change LFO 2's FREQUENCY on the MATRIX tab.", {"lfoShape": "sine", "lfoRate": 2.4, "lfoPitch": 0.3, "m1s": "LFO 2", "m1d": "Cutoff", "m1a": 30, "lfo2Shape": "square", "lfo2Rate": 2, "cut": 70, "res": 30}, page="matrix"),
    S("vital-first", "**Random.** Slot 1: **Random → Cutoff**, 35 %, rate 3. The cutoff jumps to a new place 8 times a second, never in a pattern. Turn RATE down to 0 for one jump a second.", {"m1s": "Random", "m1d": "Cutoff", "m1a": 35, "rndRate": 3, "cut": 72, "res": 30}, page="matrix"),
  ],
  real=[
    "- **Eight LFOs**, LFO 1 to 8, one shown at a time (Vital source, synth_constants.h; modulation_interface.cpp).",
    "- **You draw the shape.** Each LFO is a line editor: double-click empty space to add a point, double-click a point to remove it, drag points to move them, drag a curve handle to bend a line (Vital source, line_editor.cpp). Right-click for Copy, Paste, Flip, Import LFO, Export LFO, Save to LFOs (Vital source, line_editor.cpp). Shapes are saved as `.vitallfo` files and loaded from the name box above the editor (Vital source, synth_constants.h; lfo_section.cpp). The shape a new LFO starts with is not in the notes (unverified).",
    "- **MODE** (how it starts and repeats): Trigger, Sync, Envelope, Sustain Envelope, Loop Point, Loop Hold; it starts on Trigger (Vital source, synth_strings.h; synth_parameters.cpp).",
    "- **FREQUENCY and sync:** next to FREQUENCY you choose Seconds, Tempo, Tempo Dotted, Tempo Triplets or Keytrack. A new LFO starts on **Tempo**, so its speed is a note length such as 1/4 that follows the song's tempo (Vital source, synth_strings.h; synth_parameters.cpp). This page's LFO is free-running in hertz; choose Seconds in Vital to match it.",
    "- **More:** DELAY (wait before it starts), STEREO, and a FADE IN / SMOOTH control (Vital source, lfo_section.cpp).",
    "- **Four randoms:** RANDOM 1 to 4, each with a STYLE: **Perlin**, **Sample & Hold**, **Sine Interpolate**, **Lorenz Attractor**; it starts on Perlin (Vital source, synth_constants.h; synth_strings.h; synth_parameters.cpp). This page's Random is closest to Sample & Hold. Each also has FREQUENCY, STEREO and SYNC (Vital source, random_section.cpp).",
    "- **Using them:** drag the LFO or RANDOM button onto a knob, exactly as in lesson 5.",
  ],
  tryit=["Initialize the preset. Drag **LFO 1** onto OSC 1's WAVE FRAME. Listen.", "In LFO 1's editor, double-click to add a point and drag it. Hear the movement change.",
         "Set LFO 1's sync to **Seconds** and turn FREQUENCY. Then try **Tempo** and pick 1/8.", "Change MODE to **Envelope** and play: it runs once per note.",
         "Click RANDOM 1, set STYLE to **Sample & Hold** and drag it onto CUTOFF (with FILTER 1 on)."],
  quiz=[
    ("What does an LFO do?", ["Moves a knob up and down over and over", "Plays the melody", "Saves the preset", "Adds echo"], 0, "It is a slow oscillator used to move other controls."),
    ("Vibrato is an LFO on…", ["Pitch", "Volume only", "Reverb", "Polyphony"], 0, "Step 1."),
    ("A square-shaped LFO on pitch sounds like…", ["Jumps between two notes", "A smooth glide", "Silence", "A chord"], 0, "Step 2."),
    ("A new LFO in the real Vital is synced to…", ["Tempo (note lengths)", "Seconds", "Keytrack", "Nothing"], 0, "LFO \"sync\" defaults to Tempo (synth_parameters.cpp)."),
    ("Which is one of the real Vital's random styles?", ["Perlin", "Sawtooth", "Reverb", "Ladder"], 0, "Perlin, Sample & Hold, Sine Interpolate, Lorenz Attractor (synth_strings.h)."),
  ]))

# ------------------------------------------------------------------ 7
L.append(dict(slug="vital-07-playing", title="Vital 7: Playing it: velocity, mod wheel, note",
  desc="Make Vital answer your playing: how hard you press (velocity), the mod wheel, and which note you play, on this site's panel; then MIDI learn, the wheels, macros and MPE in the real plug-in.",
  todo=["Learn the keyboard sources: velocity, mod wheel, note.", "Make high notes brighter with Note.", "Make soft playing quieter or darker with Velocity (needs a MIDI keyboard).",
        "Put the mod wheel on the wave frame.", "Learn MIDI learn and the macros in the real Vital."],
  ideas=[
    ("The keyboard as a source", [
      "- **Velocity** is how hard (fast) you press a key, from soft to hard. A MIDI keyboard sends it with every note.",
      "- The **mod wheel** is a wheel or lever beside the keys of most MIDI keyboards. You push it up while you play.",
      "- **Note** is which key you play: low keys give a low value, high keys a high one. Use it to make high notes brighter or quieter.",
      "- Each is a **modulation source**, just like an LFO: drag it onto a knob (lesson 5)."]),
    ("On this page", [
      "- **NOTE** and **VELOCITY** are buttons in KEYBOARD MODS: drag them onto a knob. The **Mod wheel** is a source in the MATRIX tab's source boxes.",
      "- The on-screen keys and the computer keys always play at the same strength, and the steps do too. To hear velocity, press **Use MIDI** and play a MIDI keyboard.",
      "- This page has no on-screen mod wheel: use your MIDI keyboard's wheel (it sends controller 1), or the **Mod wheel** slider on [Classic Synths Compared](synth-compare.html?synth=vital)."]),
  ],
  steps=[
    S("vital-first", "**Note → cutoff.** Slot 1: **Note → Cutoff**, 10 %, the cutoff at 60. The melody's high notes come out brighter than the low ones. Play the lowest and highest keys to hear the difference; set the amount to -10 % to turn it round.", {"m1s": "Note", "m1d": "Cutoff", "m1a": 10, "cut": 60, "res": 20}, page="matrix"),
    S("vital-first", "**Velocity → volume.** Slot 1: **Velocity → Volume**, 60 %, the volume low. The step plays every note at the same strength, so you hear one level. Press **Use MIDI** and play softly, then hard: hard notes are much louder.", {"m1s": "Velocity", "m1d": "Volume", "m1a": 60, "vol": 40}, page="matrix"),
    S("vital-first", "**Velocity → cutoff.** Slot 1: **Velocity → Cutoff**, 30 %, the cutoff low. On a MIDI keyboard, hard notes are brighter, like a real instrument. Try 60 % for a bigger difference.", {"m1s": "Velocity", "m1d": "Cutoff", "m1a": 30, "cut": 55, "res": 25}, page="matrix"),
    S("vital-first", "**Mod wheel → wave frame.** Slot 1: **Mod wheel → Osc 1 frame**, 100 %, the frame at 0 (a sine). With the wheel down you hear the soft sine. Push your MIDI keyboard's mod wheel up while holding a note: the wave turns into a saw.", {"m1s": "Mod wheel", "m1d": "Osc 1 frame", "m1a": 100, "o1Frame": 0}, page="matrix"),
    S("vital-first", "**Note → frame.** Slot 1: **Note → Osc 1 frame**, -30 %, the frame at 200. Low notes are bright and buzzy, high notes softer, so the top of the keyboard does not get harsh.", {"m1s": "Note", "m1d": "Osc 1 frame", "m1a": -30, "o1Frame": 200}, page="matrix"),
  ],
  real=[
    "- **Keyboard sources:** NOTE, VELOCITY, LIFT (the speed you let go of a key, unverified), OCT NOTE (the note within its octave) in one row, PRESSURE (aftertouch: pressing down on a held key), SLIDE, STEREO and RANDOM in the other (Vital source, modulation_interface.cpp). Drag them like any source.",
    "- **The wheels:** a pitch wheel and a mod wheel are drawn beside the on-screen keyboard (Vital source, bend_section.cpp), and both are modulation sources, *Mod Wheel* and *Pitch Wheel* in the matrix's source menu (Vital source, synth_voice_handler.cpp; modulation_matrix.cpp). Drag the mod wheel's source onto a knob, or pick *Mod Wheel* in a matrix row.",
    "- **VEL TRK** in the VOICE strip (velocity tracking, -1 to 1, starting at 0) and **BEND** (pitch-bend range, 0 to 48 semitones, starting at 2) (Vital source, voice_section.cpp; synth_parameters.cpp).",
    "- **MIDI learn:** right-click a knob → **Learn MIDI Assignment**, then move a knob or slider on your MIDI controller: the very next control-change message is tied to it and saved at once (Vital source, synth_slider.cpp; midi_manager.cpp). Right-click again → **Clear MIDI Assignment** to undo. Only control-change messages work this way, not notes or pitch bend (Vital source, midi_manager.cpp). Modulation amount knobs can be learned too (Vital source, modulation_manager.cpp).",
    "- **Macros:** four MACRO knobs on the left. Each is a knob you turn and a source you drag onto other knobs, so one macro can move several things at once; the pencil renames it (Vital source, macro_knob_section.cpp). MIDI-learn a macro to play it from your controller.",
    "- **MPE:** the ADVANCED tab has **MPE ENABLED** for MPE keyboards that send per-note pressure and slide (Vital source, master_controls_interface.cpp; vital.audio).",
    "- **Computer keys:** the source sets the keys `awsedftgyhujkolp;'`, with `z` and `x` for octave down and up (Vital source, synth_constants.h). Whether they play in your DAW depends on the DAW (unverified).",
  ],
  tryit=["Connect a MIDI keyboard in your DAW. Play softly and hard.", "Drag **VELOCITY** onto FILTER 1's CUTOFF (filter on). Play softly and hard again.",
         "Drag **NOTE** onto CUTOFF. Play low and high.", "Open the MATRIX tab and set a row's source to **Mod Wheel**, destination OSC 1 wave frame. Push the wheel.",
         "Right-click a knob → **Learn MIDI Assignment**, then turn a knob on your controller.", "Drag MACRO 1's button onto two different knobs. Turn MACRO 1."],
  quiz=[
    ("What does velocity measure?", ["How hard you press a key", "Which key you press", "How long you hold it", "The tempo"], 0, "Velocity = how hard (fast) the key goes down."),
    ("Why does the step for Velocity → Volume sound at one level?", ["The steps and on-screen keys always play at the same strength", "Velocity is broken", "Volume cannot be modulated", "The filter is off"], 0, "Use a MIDI keyboard to hear velocity."),
    ("Note → cutoff at a positive amount makes…", ["High notes brighter", "Low notes brighter", "Every note the same", "Only chords brighter"], 0, "Step 1."),
    ("How do you MIDI-learn a knob in the real Vital?", ["Right-click it → Learn MIDI Assignment, then move a controller knob", "Double-click it", "Drag it to the matrix", "Hold Shift and play a note"], 0, "synth_slider.cpp; midi_manager.cpp."),
    ("What is a macro in Vital?", ["A knob that is also a source you can drag onto other knobs", "A kind of filter", "A saved preset", "An effect"], 0, "macro_knob_section.cpp."),
  ]))

# ------------------------------------------------------------------ 8
L.append(dict(slug="vital-08-effects", title="Vital 8: Effects",
  desc="Chorus, delay and reverb on this site's Vital panel, by ear, then the real Vital's nine effects, how to switch them on, reorder them, and the distortion types.",
  todo=["Learn what chorus, delay and reverb do.", "Hear each one alone, then all three.", "Learn the real Vital's nine effects and their order.", "Check yourself."],
  ideas=[
    ("What effects do", [
      "- **Effects** change the finished sound, after the oscillators, filter and envelopes.",
      "- **Chorus** plays slightly delayed, slightly wobbling copies of the sound with it: wider and shimmering.",
      "- **Delay** repeats the sound a moment later: echoes.",
      "- **Reverb** adds the sound of a room or hall around it.",
      "- **Mix** is how much effect you hear against the plain (dry) sound: 0 % = none."]),
    ("On this page", [
      "- The EFFECTS tab has Vital's nine boxes, but only **CHORUS**, **DELAY** and **REVERB** work, and only their **MIX** knob. The order is fixed: chorus, then delay, then reverb.",
      "- The effects are this site's own, not Vital's."]),
  ],
  steps=[
    S("vital-first", "**Chorus.** **CHORUS MIX** 50 %. Listen: the saw gets wider and shimmers. Turn MIX to 0 and back.", {"fxCho": 50}, page="fx"),
    S("vital-lead", "**Delay.** The lead with **DELAY MIX** 45 %. Listen to the repeats after each note, most after the last one. Turn MIX to 0: the notes stop dead.", {"fxDly": 45}, page="fx"),
    S("vital-pad", "**Reverb.** The pad with **REVERB MIX** 60 % and no chorus. Listen to the hall round the chord, and the tail after it ends.", {"fxRev": 60, "fxCho": 0}, page="fx"),
    S("vital-pad", "**Dry.** The same pad with every effect at 0. Compare it with step 3: flat and close.", {"fxRev": 0, "fxCho": 0, "fxDly": 0}, page="fx"),
    S("vital-first", "**All three.** Chorus 40 %, delay 30 %, reverb 30 %. Turn each MIX down in turn and say which one you miss most.", {"fxCho": 40, "fxDly": 30, "fxRev": 30}, page="fx"),
  ],
  real=[
    "- **Nine effects:** CHORUS, COMPRESSOR, DELAY, DISTORTION, EQ, FILTER, FLANGER, PHASER, REVERB (Vital source, effects_interface.cpp; synth_constants.h).",
    "- **All off at the start:** each has an **on** switch and every one is off in a new preset (Vital source, synth_parameters.cpp). The EFFECTS tab shows only the ones you switch on (Vital source, effects_interface.cpp).",
    "- **The order:** a list on the left of the EFFECTS tab; drag items up and down to change the order the sound goes through them, and switch each on or off there (Vital source, effects_interface.cpp). Which order a new preset starts with is not settled in the notes (unverified).",
    "- **Many knobs each:** CHORUS has VOICES, FREQUENCY, DEPTH, FEEDBACK, MIX, DELAY 1, DELAY 2, CUTOFF, SPREAD (Vital source, chorus_section.cpp). DELAY has MODE, FREQUENCY, FEEDBACK, MIX, CUTOFF, SPREAD (Vital source, delay_section.cpp). REVERB has TIME, PRE LOW CUT, PRE HIGH CUT, CUTOFF, GAIN, CHORUS AMT, CHORUS FRQ, DELAY, SIZE, MIX (Vital source, reverb_section.cpp).",
    "- **Delay styles:** Mono, Stereo, Ping Pong, Mid Ping Pong; its time can follow the song's tempo (Vital source, synth_strings.h). A new delay's mix is about 33 % and its feedback 50 % (Vital source, synth_parameters.cpp).",
    "- **Distortion types:** Soft Clip, Hard Clip, Linear Fold, Sine Fold, Bit Crush, Down Sample, with its own filter before or after (None, Pre, Post) (Vital source, synth_strings.h; distortion_section.cpp).",
    "- **The rest:** the COMPRESSOR has Multiband, Low Band, High Band and Single Band modes; the EQ has LOW, BAND and HIGH bands (Vital source, synth_strings.h). FLANGER and PHASER sweep the sound; the FILTER effect is a third filter (Vital source, effects_interface.cpp).",
  ],
  tryit=["Initialize the preset and open the **EFFECTS** tab.", "Switch **REVERB** on in the list on the left and turn its MIX.",
         "Switch **DELAY** on. Try MODE **Ping Pong** and listen in headphones.", "Switch **DISTORTION** on and step through its TYPE.",
         "Drag REVERB above DELAY in the list. Does it sound different?", "Switch **CHORUS** on and turn VOICES."],
  quiz=[
    ("Which effect makes echoes?", ["Delay", "Chorus", "Reverb", "EQ"], 0, "Delay repeats the sound a moment later."),
    ("Which effect adds the sound of a room?", ["Reverb", "Delay", "Compressor", "Distortion"], 0, "Step 3."),
    ("What does Mix 0 % mean?", ["No effect is heard", "Full effect", "The effect is louder", "The effect is reversed"], 0, "Mix = effect against the dry sound."),
    ("How many effects does the real Vital have?", ["9", "3", "6", "64"], 0, "effects_interface.cpp; synth_constants.h."),
    ("How do you change the order of effects in the real Vital?", ["Drag them in the list on the left of the EFFECTS tab", "You cannot", "In the preset browser", "Right-click the volume"], 0, "effects_interface.cpp: the drag-and-drop effect order."),
  ]))

# ------------------------------------------------------------------ 9
L.append(dict(slug="vital-09-voices", title="Vital 9: Voices: polyphony, unison, glide",
  desc="How many notes Vital plays at once and how notes join: polyphony for chords, one voice for a bass, glide (portamento) and unison, then the real plug-in's legato, note priority and unison stacks.",
  todo=["Learn what polyphony, mono, glide and unison mean.", "Hear a pad with 8 voices and with 1.", "Make a mono bass glide.", "Learn where the real Vital keeps these settings.", "Check yourself."],
  ideas=[
    ("Voices", [
      "- A **voice** is one note the synth can play. **Polyphony** is how many at once. Pads and chords need many; a bass line or a solo needs one.",
      "- With **polyphony 1** the synth is *mono*: a new note cuts off the old one. That is often what you want for a bass.",
      "- This page plays up to 16 voices. The real Vital's VOICES runs from 1 to 32 and starts at 8 (Vital source, voice_section.cpp; synth_parameters.cpp)."]),
    ("Glide", [
      "- **Glide** (also called *portamento*) slides the pitch from one note to the next instead of jumping.",
      "- On this page and in Vital the knob runs from -10 to 4; -10 is off (Vital source, synth_parameters.cpp). This page reads it as 2 to the power of the number in seconds: -5 = 0.03 s, -2 = 0.25 s (unverified)."]),
    ("Unison", [
      "- **Unison** (lesson 2) stacks copies of each note. On this page, unison above 1 also makes the panel mono (its engine); the real Vital's unison is per oscillator and still plays chords (unverified)."]),
  ],
  steps=[
    S("vital-pad", "**Eight voices.** The pad with **VOICES** 8: a five-note chord. Listen to all the notes together.", {"poly": 8}, page="voice"),
    S("vital-pad", "**One voice.** The same pad with **VOICES** 1. Only one note of the chord is left. Mono is wrong for a pad; set VOICES back to 8.", {"poly": 1}, page="voice"),
    S("vital-bass", "**A mono bass.** **VOICES** 1, **GLIDE** -5 (a short slide). Listen to how the notes join, with a tiny slide into each one.", page="voice"),
    S("vital-bass", "**A longer glide.** **GLIDE** -2 (about a quarter of a second). Now you clearly hear the slide between notes, like a fretless bass. Try -1, then -10 (off).", {"glide": -2}, page="voice"),
    S("vital-lead", "**Unison.** The lead with **UNISON** 4. Turn it to 8 for a huge stack, then to 1. Notice the panel plays one note at a time while unison is on (this page only).", page="voice"),
    S("vital-first", "**Glide on a polyphonic sound.** The first sound with **GLIDE** -3 and 8 voices. Each new note slides from the last one played. Compare with GLIDE -10.", {"glide": -3, "poly": 8}, page="voice"),
  ],
  real=[
    "- **VOICE strip** (bottom, under every tab): **VOICES** (polyphony 1-32, starts at 8), VEL TRK and BEND (Vital source, voice_section.cpp; synth_parameters.cpp; synth_constants.h).",
    "- **PORTAMENTO strip:** **GLIDE** (the time; starts at its lowest = off), **SLOPE** (the shape of the slide), and buttons **OCTAVE SCALE**, **ALWAYS GLIDE** and **LEGATO** (Vital source, portamento_section.cpp; synth_parameters.cpp). In most synths *legato* means notes played joined do not restart the envelopes, and *always glide* slides even between separate notes; what Vital's buttons do exactly is not in the notes (unverified).",
    "- **ADVANCED tab, VOICE box:** **NOTE PRIORITY** (which note wins when voices run out: Newest, Oldest, Highest, Lowest, Round Robin; starts on Round Robin) and **VOICE OVERRIDE** (Kill or Steal; starts on Kill) (Vital source, master_controls_interface.cpp; synth_strings.h; synth_parameters.cpp).",
    "- **Unison per oscillator:** each OSC has its own UNISON voices (1-16), detune and detune power (Vital source, oscillator_section.cpp; synth_parameters.cpp).",
    "- **Stacks:** the ADVANCED tab's **STACK** per oscillator: Unison, Center Drop 12, Center Drop 24, Octave, 2x Octave, Power Chord, 2x Power Chord, Major Chord, Minor Chord, Harmonics, Odd Harmonics (Vital source, synth_strings.h; oscillator_advanced_section.cpp). A *Power Chord* stack plays a root and fifth from one key.",
  ],
  tryit=["Initialize the preset. Play a chord: you hear all its notes (VOICES 8).", "Set **VOICES** to 1 and play the chord again.",
         "With VOICES 1, raise **GLIDE** and play a bass line.", "Switch **LEGATO** on and play joined notes, then separate notes. Listen for what changes.",
         "On OSC 1 set UNISON voices to 5. Open ADVANCED and set OSC 1's **STACK** to *Power Chord*.", "On ADVANCED, set NOTE PRIORITY to *Highest* with VOICES 1 and hold two keys."],
  quiz=[
    ("What is polyphony?", ["How many notes can play at once", "How loud the synth is", "How fast the LFO is", "The filter's slope"], 0, "One voice = one note."),
    ("A bass line often uses…", ["Voices 1 (mono) with a little glide", "32 voices and long reverb", "No oscillators", "Only the sample"], 0, "Step 3."),
    ("What does glide do?", ["Slides the pitch from one note to the next", "Makes notes louder", "Adds echoes", "Changes the wavetable"], 0, "Portamento = glide."),
    ("Where is NOTE PRIORITY in the real Vital?", ["The ADVANCED tab", "The EFFECTS tab", "Under the filter", "In the preset browser"], 0, "master_controls_interface.cpp."),
    ("Which is a real Vital unison stack?", ["Power Chord", "Ping Pong", "Ladder", "Perlin"], 0, "kUnisonStackNames (synth_strings.h)."),
  ]))

# ------------------------------------------------------------------ 10
L.append(dict(slug="vital-10-real-thing", title="Vital 10: From this page to the real Vital",
  desc="Build three full sounds (a bass, a pad, a lead) step by step on this site's panel, then rebuild each in the real Vital from Init Preset, setting by setting with the Copy the patch across table, and save them.",
  todo=["Build a bass, a pad and a lead on this site's panel.", "Rebuild each one in the real Vital, starting from Init Preset.", "Use **Copy the patch across** for the numbers.",
        "Save each as a preset.", "Tick off the \"I can find…\" checklist."],
  ideas=[
    ("The plan", [
      "- Build a sound here, press **Show the settings to copy**, and copy it into Vital one setting at a time. Then make the same sound in Vital by ear, because the two will not sound exactly the same.",
      "- Do it three times: a **bass**, a **pad** and a **lead**. Each one uses what you learned in lessons 2-9."]),
  ],
  steps=[
    S("vital-bass", "**Sound 1: the bass.** A saw an octave down and a sine two octaves down (lesson 2), a **24dB Ladder** filter nearly closed (lesson 3), **Env 2 → cutoff** opening it on each note (lesson 4), **VOICES 1** and a little **GLIDE** (lesson 9), some **DRIVE**. Listen for the weight and the \"wow\" at each note. Make one change of your own.", {"e1S": 60}, page="voice"),
    S("vital-pad", "**Sound 2: the pad.** Two oscillators 16 cents apart (lesson 2), a slow **ATTACK** and **RELEASE** (lesson 4), **LFO 1 → frame** (lesson 6), and a slow **LFO 2** on the cutoff through slot 1 (lesson 5), with chorus and reverb (lesson 8). Listen for the swell and the slow shimmer.", {"m1s": "LFO 2", "m1d": "Cutoff", "m1a": 10, "lfo2Shape": "sine", "lfo2Rate": -2, "e1A": 0.9}, page="voice"),
    S("vital-lead", "**Sound 3: the lead.** A saw and a brighter wave an octave up, **UNISON** 4 (lesson 2), vibrato from **LFO 1 → pitch** (lesson 6), **GLIDE** (lesson 9), **Velocity → cutoff** in slot 1 for a MIDI keyboard (lesson 7), delay and a little reverb (lesson 8).", {"m1s": "Velocity", "m1d": "Cutoff", "m1a": 20, "fxRev": 20}, page="voice"),
    S("vital-first", "**Your own.** Start again from the first sound and build a sound of your own. Then copy it across the same way.", page="voice"),
  ],
  extra=[
    ("Copy the patch across", [
      "After each step above (and your own changes), press the button below. Each row is one control of the panel as it is now. **This page** is the number on this site's panel; **In the plug-in** is what Vital should show, where this page can work it out (its laws are this site's reading of Vital's code and unverified, so trust your ears more than the numbers).", "",
      "```{=html}", '<div class="ik-copy" data-id="vital"></div>', "```"]),
    ("Rebuild it in Vital, setting by setting", [
      "1. **Start clean.** Menu (three lines) → **Initialize Preset**. The name reads *Init Preset* (Vital source, synth_preset_selector.cpp). Only OSC 1 is on; the filters and effects are off (Vital source, synth_parameters.cpp).",
      "2. **Oscillators.** For each oscillator the table lists: switch it on and set **WAVE FRAME**, **TRANSPOSE**, **TUNE** and **LEVEL** (Vital source, oscillator_section.cpp). This page's waves are sine, triangle, square and saw; load a wavetable that has those (Vital's *Basic Shapes*, name unverified) or pick the nearest wave by ear.",
      "3. **Send every oscillator to Filter 1.** Set OSC 2's and OSC 3's **DESTINATION** to *Filter 1*: at the start OSC 2 goes to Filter 2 and OSC 3 to the effects (Vital source, oscillator_section.cpp; synth_parameters.cpp). This page sends all three into its one filter.",
      "4. **Filter 1.** Switch it **on** (it starts off), then set MODE (model : style), CUTOFF, RESONANCE, DRIVE, BLEND and KEY TRK (Vital source, filter_section.cpp; synth_parameters.cpp).",
      "5. **Envelopes.** Set ENVELOPE 1's ATTACK, DECAY, SUSTAIN, RELEASE (on this page Envelope 1 is the loudness; that it is in Vital too is our reading, unverified). Set ENVELOPE 2 the same way.",
      "6. **Modulations.** For each fixed route and each matrix slot in the table, drag the source button onto the knob, then set the amount (Vital source, modulation_manager.cpp). For *Env 2 → cutoff*, drag **ENV 2** onto Filter 1's CUTOFF.",
      "7. **LFOs.** Set LFO 1's sync to **Seconds** (it starts on Tempo) before you set its FREQUENCY (Vital source, synth_strings.h; synth_parameters.cpp). Draw the shape or load one from the LFO name box (Vital source, lfo_section.cpp).",
      "8. **Effects.** On the EFFECTS tab, switch on CHORUS, DELAY or REVERB if the table has them, and set MIX (Vital source, effects_interface.cpp).",
      "9. **Voices.** VOICES, GLIDE in the bottom strip; UNISON voices on each oscillator (Vital source, voice_section.cpp; portamento_section.cpp; oscillator_section.cpp).",
      "10. **Listen and fix by ear.** Play the same notes on both. Change Vital until it sounds right to you.",
      "11. **Save.** Click **Save** by the preset name. Type a NAME, your name as AUTHOR, pick a STYLE (Bass, Pad or Lead), add COMMENTS such as \"made in lesson 10\", and press **Save** (Vital source, save_section.cpp; synth_strings.h). It is saved as a `.vital` file in your user presets folder (Vital source, synth_constants.h; load_save.cpp). Open the preset browser and find it by name."]),
    ("I can find…", [
      "Tick each one when you can find it in the real Vital without help. The boxes are only for you; nothing is saved.", "",
      "- [ ] The four tabs: VOICE, EFFECTS, MATRIX, ADVANCED (lesson 1)",
      "- [ ] The preset name, the preset browser, Initialize Preset and Save (lesson 1)",
      "- [ ] An oscillator's on switch, WAVE FRAME, TRANSPOSE, TUNE, LEVEL, UNISON and DESTINATION (lesson 2)",
      "- [ ] The wavetable name, the pencil (editor) and the 3D / 2D / SP button (lesson 2)",
      "- [ ] Filter 1's on switch, its OSC inputs, MODE, CUTOFF and RESONANCE (lesson 3)",
      "- [ ] ENVELOPE 1 and 2, and their DELAY and HOLD knobs (lesson 4)",
      "- [ ] How to drag a source onto a knob, and how to change its amount (lesson 5)",
      "- [ ] The MATRIX tab's SOURCE, AMOUNT and DESTINATION columns (lesson 5)",
      "- [ ] LFO 1's editor, MODE and sync (Seconds / Tempo), and RANDOM 1's STYLE (lesson 6)",
      "- [ ] VELOCITY, NOTE and the mod wheel as sources; Learn MIDI Assignment; the MACRO knobs (lesson 7)",
      "- [ ] The EFFECTS list: switching an effect on and dragging it to a new place (lesson 8)",
      "- [ ] VOICES, GLIDE, LEGATO, and NOTE PRIORITY on the ADVANCED tab (lesson 9)"]),
  ],
  real=[
    "- **What will differ.** The real Vital's oscillators, filters and effects are its own code; this page's are not (Vital README; this site's engine). Expect the same idea, not the same sound.",
    "- **What this page leaves out**, all in the real one: the sample slot's own sounds, a second filter, six envelopes with delay / hold / curves, eight drawn LFOs, four macros, 64 connections with bipolar / stereo / curve settings, nine effects in any order, 32 voices (Vital source, synth_constants.h; modulation_matrix.cpp; effects_interface.cpp).",
    "- **Help.** There is no manual on vital.audio; questions and bug reports go to the forum, forum.vital.audio (Vital README; vital.audio).",
  ],
  tryit=["Rebuild the bass in Vital from Init Preset with the table. Save it as *My bass*, style Bass.", "Rebuild the pad. Save it as *My pad*, style Pad.",
         "Rebuild the lead. Save it as *My lead*, style Lead.", "Open the preset browser, search for *My* and load each one.", "Play one of your sounds in a DAW project with a drum loop."],
  quiz=[
    ("What should you do first when rebuilding a sound in Vital?", ["Menu → Initialize Preset", "Turn on every effect", "Set VOICES to 32", "Open the wavetable editor"], 0, "A clean start: Init Preset (synth_preset_selector.cpp)."),
    ("You copied every number but OSC 2 is not filtered. Why?", ["At the start OSC 2 goes to Filter 2: set its destination to Filter 1", "The table is wrong", "Filters only take OSC 3", "You must save first"], 0, "Defaults: osc 2 → Filter 2 (synth_parameters.cpp)."),
    ("Your LFO's speed does not match the table's Hz. What do you check?", ["The LFO's sync: set it to Seconds, not Tempo", "The reverb", "The preset name", "Polyphony"], 0, "LFO sync starts on Tempo (synth_parameters.cpp)."),
    ("Which fields does Vital's save box have?", ["Name, Author, Style, Comments", "Only a name", "Tempo and key", "Email and password"], 0, "save_section.cpp."),
    ("Will the copied sound be exactly the same?", ["No: this page's engine is its own, so fix it by ear", "Yes, exactly", "Only on Windows", "Only with a MIDI keyboard"], 0, "This site's engine is not Vital's code."),
  ]))

# ------------------------------------------------------------------ writer
def md(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s); s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    return re.sub(r"\[(.+?)\]\((.+?)\)", lambda m: f'<a href="{m.group(2).replace(".qmd", ".html")}">{m.group(1)}</a>', s)

SCRIPTS = ["```{=html}", '<link rel="stylesheet" href="/apps/shared/lessons/synth-compare.css">', '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">',
           '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/lessons/faithful-panel.js"></script>',
           '<script src="/apps/shared/lessons/synth-compare.js"></script>', '<script src="/apps/shared/lessons/intro-kit.js"></script>', "```", ""]

def page(i, p):
    prev = ("intro-vital.qmd", "Meet Vital") if i == 0 else (L[i - 1]["slug"] + ".qmd", L[i - 1]["title"])
    nxt = ("synth-compare.qmd", "Classic Synths Compared") if i == len(L) - 1 else (L[i + 1]["slug"] + ".qmd", L[i + 1]["title"])
    o = ["---", f'title: "{p["title"]}"', "toc: true", "toc-depth: 2", f'description: "{p["desc"]}"', "instruments: [piano, other]", "topics: [sound]",
         "has: [interactive, svg]", "---", "",
         f"Lesson {i + 1} of 10 in *Vital, step by step*: everything you need to feel at home in the real Vital plug-in. Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", ""] + [f"{n + 1}. {t}" for n, t in enumerate(p["todo"])] + [":::", ""]
    for h, lines in p["ideas"]: o += ["## " + h, ""] + lines + [""]
    o += ["## The panel", "", PANEL_NOTE + " Dimmed controls are not modelled; **Show ▾ → Only working controls** hides them.", "",
          "```{=html}", '<div class="ik-box" data-kind="synth" data-id="vital"><div class="scmp"></div></div>', "```", "",
          "## Step by step", "", "Each step loads a starting patch made on this page (not one of Vital's presets) and plays it. Listen for the one thing it names, then turn the knob it names.", "", "```{=html}"]
    for s in p["steps"]:
        a = f' data-ex="{s["ex"]}"' + (f' data-set="{J(s["set"])}"' if s["set"] else "") + (f' data-page="{s["page"]}"' if s["page"] else "")
        o.append(f'<div class="ik-step"{a}><p>{md(s["t"])}</p></div>')
    o += ["```", ""]
    for h, lines in p.get("extra", []): o += ["## " + h, ""] + lines + [""]
    o += ["## In the real Vital", "", "What is different in the plug-in and exactly where to find it. Every line names the file of Vital's source code (github.com/mtytel/vital) it was read from; \"(unverified)\" means it was not confirmed.", ""] + p["real"] + [""]
    o += ["## Try it in the real Vital", "", "Open Vital in your DAW (see [Meet Vital](intro-vital.qmd) to install it) and do these in order.", ""] + [f"- [ ] {t}" for t in p["tryit"]] + [""]
    o += ["## Check yourself", "", "Click an answer. You will see at once if it is right. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="ik-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="ik-why">{md(why)}</p></div>')
    o += ["```", "", "## Previous and next", "", "::: {.vl-nav}", f"- Previous: [{prev[1]}]({prev[0]})",
          f"- Next: [{nxt[1]}]({nxt[0]})" + (": Vital side by side with the other synths." if i == len(L) - 1 else ""), ":::", ""]
    o += SCRIPTS
    return "\n".join(o)

def cites(txt):
    out = set()
    for m in re.finditer(r"\(Vital source, ([^)]+)\)", txt):
        for f in re.split(r";\s*", m.group(1)):
            if f.strip() != "vital.audio": out.add(f.strip())
    return out

def sources(used, readme, site):
    o = ['# Sources for the "Vital, step by step" lessons (lessons/vital-01-window.qmd ... vital-10-real-thing.qmd).',
         "# WRITTEN BY scripts/vital-lessons/build.py (one entry per Vital source file cited on the pages, with the pages citing it): edit there.",
         "# Facts from research_notes/vital-ui-facts.md (Vital source read 2026-11-27).", "SOURCES = ["]
    comb = sorted({pg for f in COMBINED & set(used) for pg in used[f]})
    if comb:
        o.append('    web(\'Tytel, Matt. "full_interface.cpp," "synthesis_interface.cpp" and "modulation_interface.cpp." *Vital*, GitHub repository mtytel/vital. URL.\', '
                 f'"https://github.com/mtytel/vital/tree/main/src/interface/editor_sections", {comb!r}),')
    for f in sorted(used):
        if f in COMBINED: continue
        if f not in PATHS: raise SystemExit("unknown Vital file cited: " + f)
        url = "https://github.com/mtytel/vital/blob/main/" + PATHS[f]
        note = "" if f in SAME_MLA else f", note={NOTES[f]!r}"
        o.append(f'    web(\'Tytel, Matt. "{f}." *Vital*, GitHub repository mtytel/vital. URL.\', "{url}", {sorted(used[f])!r}{note}),')
    if readme: o.append(f'    web(\'Tytel, Matt. "README." *Vital*, GitHub repository mtytel/vital. URL.\', "https://github.com/mtytel/vital#readme", {sorted(readme)!r}, who="student"),')
    if site: o.append(f'    web(\'Vital Audio. *Vital: Spectral Warping Wavetable Synth*. URL.\', "https://vital.audio/", {sorted(site)!r}, who="student"),')
    o.append("]")
    return "\n".join(o) + "\n"

if __name__ == "__main__":
    used, readme, site = {}, set(), set()
    for i, p in enumerate(L):
        f = ROOT / "lessons" / (p["slug"] + ".qmd"); old = f.read_text() if f.exists() else ""
        txt = page(i, p); m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(txt + ("\n" + m.group(0) if m else "\n<!-- works-cited: written by scripts/works-cited.py -->\n<!-- /works-cited -->\n"))
        rel = "lessons/" + p["slug"] + ".qmd"
        for c in cites(txt): used.setdefault(c, set()).add(rel)
        if "Vital README" in txt: readme.add(rel)
        if "vital.audio)" in txt or "; vital.audio" in txt: site.add(rel)
        assert 4 <= len(p["steps"]) <= 7 and 4 <= len(p["quiz"]) <= 6, p["slug"]
        print("wrote", rel)
    (ROOT / "scripts/sources/vital-lessons.py").write_text(sources(used, readme, site)); print("wrote scripts/sources/vital-lessons.py")
