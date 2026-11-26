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
