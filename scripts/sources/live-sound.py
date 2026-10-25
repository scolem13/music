# Sources for the Live Sound lessons (lessons/live-*.qmd) and the X32 channel strip (apps/shared/lessons/live-kit.js).
# Checked 22 Oct 2026: the X32 facts were read in the two PDFs (copies with page notes in ~/Documents/Manuals, X32-notes.md):
# the user manual (sections and order, 72 dB gain range, +23 dBu, set-up steps, USB recorder, GEQ effects) and Maillot's OSC
# protocol (every parameter range, the fader law, Aux In channels with no gate or dynamics).
LV = ["lessons/live-%s.qmd" % s for s in "strip gain eq gate comp feedback soundcheck".split()]
SOURCES = [
    web('Behringer. *X32 Digital Mixer Preliminary User Manual*. Music Tribe, URL.', "https://media.vsl-uk.com/manuals/sound/Behringer_X32_User_Manual.pdf", LV, who="student",
        note="Channel strip sections and order, preamps (72 dB range, +23 dBu), set-up steps for a mic, USB 2-track recorder (Aux 7/8), scenes, GEQ effects."),
    web('Maillot, Patrick-Gilles. *Unofficial X32/M32 OSC Remote Protocol*. 2020, URL.', "https://tostibroeders.nl/wp-content/uploads/2020/02/X32-OSC.pdf", LV, who="teacher",
        note="Ranges of gain, low cut, gate, compressor, EQ and fader; the fader law; Aux In channels have no gate or dynamics."),
    wiki("Noise gate", "Noise_gate", ["lessons/live-gate.qmd"], who="student"),
    wiki("Dynamic range compression", "Dynamic_range_compression", ["lessons/live-comp.qmd"], who="student"),
    wiki("Equalization (audio)", "Equalization_(audio)", ["lessons/live-eq.qmd"], who="student"),
    wiki("Audio feedback", "Audio_feedback", ["lessons/live-feedback.qmd"], who="student"),
    wiki("Proximity effect (audio)", "Proximity_effect_(audio)", ["lessons/live-eq.qmd"], who="student"),
]
GEAR = ["gear/index.qmd", "gear/x32-drums-dca.qmd"]
SOURCES += [
    web('Behringer. *X32 Digital Mixer Preliminary User Manual*. Music Tribe, URL.', "https://media.vsl-uk.com/manuals/sound/Behringer_X32_User_Manual.pdf", ["gear/x32-drums-dca.qmd"], who="student",
        note="DCA and mute group assignment (pp. 8, 32, 59), Group/Bus layers and DCA mute/solo (p. 16), groups vs. DCAs (pp. 32-33), DCA settings stored with scenes (p. 28), DCA Group AFL (p. 31)."),
    web('Maillot, Patrick-Gilles. *Unofficial X32/M32 OSC Remote Protocol*. 2020, URL.', "https://tostibroeders.nl/wp-content/uploads/2020/02/X32-OSC.pdf", ["gear/x32-drums-dca.qmd"], who="teacher",
        note="Channel DCA and mute group bitmaps (p. 28), DCA parameters (p. 39), Mute System preferences (p. 56)."),
]
SOURCES += [
    web('La Cerra, Steve. "Sweet Sounds From the Stage." *Mix*, 1 Nov. 2007, URL.', "https://www.mixonline.com/live-sound/sweet-sounds-stage-368579", ["gear/x32-drums-dca.qmd"], who="student",
        note="Live drum overheads: about six feet up, directional patterns, hypercardioid hot spots, angling toward the audience to reject the drum monitors."),
    web('Maillot, Patrick-Gilles. *Unofficial X32/M32 OSC Remote Protocol*. 2020, URL.', "https://tostibroeders.nl/wp-content/uploads/2020/02/X32-OSC.pdf", ["gear/x32-drums-dca.qmd"], who="teacher", note="Low cut range 20-400 Hz (p. 26)."),
    wiki("Intelligibility (communication)", "Intelligibility_(communication)", ["gear/using-a-mic.qmd"], who="student",
         note="Clear speech: slower rate, more pauses, stronger consonants; reverberation masks stops and transitions."),
    wiki("Gain before feedback", "Gain_before_feedback", ["gear/using-a-mic.qmd"], who="student", note="Mic distance; halving it gives about 6 dB."),
    wiki("Proximity effect (audio)", "Proximity_effect_(audio)", ["gear/using-a-mic.qmd"], who="student"),
    wiki("Audio feedback", "Audio_feedback", ["gear/using-a-mic.qmd"], who="student"),
]
