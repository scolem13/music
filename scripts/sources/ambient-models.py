# Sources for the modelled chime tubes and bass bars in the Ambient Generator (apps/shared/lessons/ambient-kit.js, MODAL), 2026-11-28.
# Research notes, with what is still an estimate: research_notes/bell-chime-samples/MODELS.md.
_L = ["tools/ambient.qmd"]
SOURCES = [
    web("Hite, Lee. <i>Tubular Bell Chimes: Do-It-Yourself Compendium</i>. 2022.", "https://leehite.org/documents/Tubular%20Bell%20Chimes%20Design%20Handbook.pdf", _L, who="teacher", note="Free-free tube ratios x2.76, 5.40, 8.93, 13.34, 18.64 (p. 56); sustain mainly the fundamental, 1st overtone about 2 s for a 2-inch aluminium chime at 272.5 Hz (p. 57); a C2 chime sounds about like C5 (pp. 15-16); hang point 22.42% (pp. 26, 56)."),
    web("Hite, Lee. \"Design Decisions.\" leehite.org.", "https://leehite.org/Chimes.htm", _L, who="teacher", note="Strike the end for most overtones; dead centre misses the first overtone; metal strikers give more overtones, softer ones a cleaner tone."),
    web("Rossing, Thomas D., Junehee Yoo, and Andrew Morrison. \"Acoustics of Percussion Instruments: An Update.\" <i>Acoustical Science and Technology</i>, vol. 25, no. 6, 2004, pp. 406-412.", "https://www.jstage.jst.go.jp/article/ast/25/6/25_6_406/_pdf", _L, who="teacher", note="Marimba bars tuned 1:4:10 (the 4th harmonic held for the first 3-3.5 octaves, the 10th for 2)."),
    web("\"Composite Marimba Bars.\" US Patent 4,411,187.", "https://patents.google.com/patent/US4411187", _L, who="teacher", note="Marimba decay about 2 s at C3 to 1/50 s at C7; vibraphone 30 s at the low end to about 6 s at the high end."),
    web("McCarthy, Jim. \"Marimbas: Exploring the Depths.\" Percussion Clinic Adelaide, 1994.", "https://www.percussionclinic.com/art_mbasa.htm", _L, who="teacher", note="Overtones 1 and 2 decay in about 1/2 and 1/7 of the fundamental's time (Bork and Meyer); a low resonator takes about 0.7 s to build up."),
    web("Kirkby, David. \"Physics of Music, Lecture 14.\" University of California, Irvine.", "https://logosfoundation.org/instrum_gwr/rodo/Lecture14.pdf", _L, who="teacher", note="Mallet contact time T damps frequencies above about 2/T; vibraphone 1:4; resonators reinforce odd harmonics."),
]
