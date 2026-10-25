# Sources for the Score Reading lessons (lessons/score-*.qmd) and the Part Reader tool.
# Checked 21 Oct 2026: each Wikipedia article was fetched and the facts used were found in it.
# Gould and Adler are the standard references for clefs, transpositions and the octave conventions (horn old notation,
# bass clarinet French/German, cello treble clef); those three points are from them, not re-read for this page.
SR = ["lessons/score-clefs.qmd", "lessons/score-multi-clef.qmd", "lessons/score-transposition.qmd",
      "lessons/score-history.qmd", "lessons/score-names.qmd", "lessons/score-practice.qmd", "tools/part-reader.qmd"]
SOURCES = [
    wiki("Transposing instrument", "Transposing_instrument", SR, who="student",
         note="Concert-pitch scores (Prokofiev), horn bass clef ambiguity, crooks, brass-band trombone in B♭."),
    wiki("Clef", "Clef", ["lessons/score-clefs.qmd", "lessons/score-multi-clef.qmd"], who="student",
         note="Choir clefs (checked 22 Oct 2026): octave treble clef for tenors in SATB and TTBB, the 8 sometimes left out; double treble clef; tenor in bass clef on a shared staff; C clefs once used for choral parts."),
    wiki("Tuba", "Tuba", ["lessons/score-names.qmd", "lessons/score-transposition.qmd"], who="student",
         note="BB♭ and CC from an archaic English variant of Helmholtz notation; tube lengths; concert pitch vs brass-band treble clef."),
    wiki("Natural horn", "Natural_horn", ["lessons/score-history.qmd"], who="student", note="Crooks in common use by 1740; hand-stopping."),
    wiki("Brass instrument valve", "Brass_instrument_valve", ["lessons/score-history.qmd"], who="student", note="Stölzel's valves on the horn, 1814."),
    wiki("Clarinet", "Clarinet", ["lessons/score-history.qmd"], who="student", note="Why B♭ and A clarinets remain; C clarinet fell out of favour."),
    wiki("Saxophone", "Saxophone", ["lessons/score-history.qmd"], who="student", note="Patent of 28 June 1846; E♭/B♭ and C/F families; one fingering for all sizes."),
    book("Gould, Elaine. *Behind Bars: The Definitive Guide to Music Notation*. Faber Music, 2011.", SR, who="teacher",
         note="Clefs, transposing instruments, transposed and concert scores, octave conventions."),
    book("Adler, Samuel. *The Study of Orchestration*. 4th ed., W. W. Norton, 2016.", SR, who="teacher",
         note="Instrument ranges, clefs and transpositions."),
]
