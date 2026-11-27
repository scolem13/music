# Sources for the Vital and Surge XT views of a Model D patch (apps/shared/lessons/synth-views.js).
# Checked 2026-11-26: Vital's synth_parameters.cpp read for parameter names and ranges; the Surge XT manual read for the Classic
# oscillator, mixer, filter types, envelopes, LFO shapes and scene output. Not printed in either and marked unverified in the JS:
# Surge's numeric cutoff / envelope / LFO / portamento ranges, Vital's quartic and exponential display laws, filter model names, Basic Shapes.
P = ["lessons/model-d.qmd"]
SOURCES = [
    web('Tytel, Matt. "synth_parameters.cpp." *Vital*, GitHub repository mtytel/vital. URL.',
        "https://github.com/mtytel/vital/blob/main/src/common/synth_parameters.cpp", P,
        note="Oscillator level, transpose, tune, unison; filter cutoff in semitones 8-136, resonance, drive, key track; envelope times 0-2.378 quartic; LFO frequency."),
    web('Surge Synth Team. "Surge XT User Manual." *Surge XT*. URL.', "https://surge-synthesizer.github.io/manual-xt/", P,
        note="Classic oscillator Shape / Width 1 / Sub Mix / Sync / Unison; Mixer channels with M and S; Vintage and Legacy Ladder; Filter EG and Amp EG modes; LFO shapes; scene Volume / Pan / Width."),
]

# The faithful Vital and Surge XT panels (apps/shared/lessons/faithful-panel.js, panels/vital.js, panels/surge.js), read 2026-11-26.
PF = ["lessons/intro-vital.qmd", "lessons/intro-surge-xt.qmd", "lessons/synth-compare.qmd"]
SOURCES += [
    web('Tytel, Matt. "full_interface.cpp," "synthesis_interface.cpp" and "modulation_interface.cpp." *Vital*, GitHub repository mtytel/vital. URL.',
        "https://github.com/mtytel/vital/tree/main/src/interface/editor_sections", PF,
        note="Section bounds of the main window at the default 1400 x 820 (synth_constants.h): header 48, macro column, oscillators, sample, two filters, envelopes : LFOs : random = 3 : 4 : 2, voice and portamento strip, keyboard."),
    web('Tytel, Matt. "default.vitalskin." *Vital*, GitHub repository mtytel/vital. URL.', "https://github.com/mtytel/vital/blob/main/default.vitalskin", PF,
        note="Knob section height 71, padding 4 / 10, modulation button width 68; background, body and accent colours."),
    web('Surge Synth Team. "SkinModel.cpp." *Surge XT*, GitHub repository surge-synthesizer/surge. URL.',
        "https://github.com/surge-synthesizer/surge/blob/main/src/common/SkinModel.cpp", PF,
        note="Default-skin position of every control (oscillator, scene, mixer, filters, Filter EG, Amp EG, FX, LFO, header)."),
]

# "What the real Vital can do that this page can't" on lessons/intro-vital.qmd (scripts/intro-instruments/build.py), read 2026-11-27.
# synth_parameters.cpp was read to about line 470 of 621 (the tail of the oscillator list and the modulation-connection fields
# came through as a summary); counts below are from the constants file, which was read whole.
PL = ["lessons/intro-vital.qmd"]
SOURCES += [
    web('Tytel, Matt. "synth_constants.h." *Vital*, GitHub repository mtytel/vital. URL.',
        "https://github.com/mtytel/vital/blob/main/src/common/synth_constants.h", PL,
        note="kNumOscillators 3, kNumFilters 2, kNumEnvelopes 6, kNumLfos 8, kNumRandomLfos 4, kNumMacros 4, kMaxModulationConnections 64, kMaxPolyphony 33 (32 playing), effects chorus / compressor / delay / distortion / EQ / filter / flanger / phaser / reverb, filter models Analog, Dirty, Ladder, Digital, Diode, Formant, Comb, Phase."),
    web('Tytel, Matt. "synth_parameters.cpp." *Vital*, GitHub repository mtytel/vital. URL.',
        "https://github.com/mtytel/vital/blob/main/src/common/synth_parameters.cpp", PL,
        note="unison_voices 1-16; polyphony 1-32; envelope delay / hold and attack / decay / release power; LFO sync, fade, delay, smooth, stereo; sample_on and the sampler's loop / keytrack; effect_chain_order (any order); pitch_bend_range 0-48; mpe_enabled; oversampling 4 settings."),
]
