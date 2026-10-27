# Sources for the Theory "Concepts" pages: theory/modes-three-ways.qmd and theory/meter-taxonomy.qmd.
# Gordon read from the text cache (research_notes/mlt-sources/text/gordon-lsm-2012.txt, print-page markers); notes in research_notes/modes-meter-pages.md.
MO = "theory/modes-three-ways.qmd"
ME = "theory/meter-taxonomy.qmd"
SOURCES = [
    web('Hutchinson, Robert. "Basic Concepts." *Music Theory for the 21st-Century Classroom*, University of Puget Sound, URL.', "https://musictheory.pugetsound.edu/mt21c/BasicConcepts.html", ["theory/pitch-basics.qmd"],
        note="Chapter 1: pitch, notation and clefs, octave registers, accidentals, enharmonic notes."),
    web('Hutchinson, Robert. "Minor Scales and Key Signatures." *Music Theory for the 21st-Century Classroom*, University of Puget Sound, URL.', "https://musictheory.pugetsound.edu/mt21c/MinorScalesAndKeySignatures.html", ["theory/minor-scales.qmd"],
        note="Chapter 3: natural, harmonic and melodic minor, minor key signatures, scale degree names."),
    web('Hutchinson, Robert. "Intervals." *Music Theory for the 21st-Century Classroom*, University of Puget Sound, URL.', "https://musictheory.pugetsound.edu/mt21c/Intervals.html", ["theory/intervals.qmd"],
        note="Chapter 5: interval number and quality, identifying and writing, inversion, augmented and diminished."),
    web('Hutchinson, Robert. "Major Scales and Key Signatures." *Music Theory for the 21st-Century Classroom*, University of Puget Sound, URL.', "https://musictheory.pugetsound.edu/mt21c/MajorScalesAndKeySignatures.html", ["theory/major-scales.qmd"],
        note="Chapter 2: half and whole steps, the major scale, major key signatures."),
    web('Hutchinson, Robert. "Basics of Rhythm." *Music Theory for the 21st-Century Classroom*, University of Puget Sound, URL.', "https://musictheory.pugetsound.edu/mt21c/BasicsOfRhythm.html", ["theory/rhythm-basics.qmd"],
        note="Chapter 4: time signature, durational symbols, dots and ties, meter, tuplets, common notation errors."),
    web('Hutchinson, Robert. "Meter." *Music Theory for the 21st-Century Classroom*, University of Puget Sound, URL.', "https://musictheory.pugetsound.edu/mt21c/meter.html", [ME, "theory/rhythm-basics.qmd"],
        note="Simple and compound, duple, triple and quadruple, with example signatures."),
    web('Hutchinson, Robert. "How to Determine Chord-Scale Relationships." *Music Theory for the 21st-Century Classroom*, University of Puget Sound, URL.', "https://musictheory.pugetsound.edu/mt21c/HowToDetermineChord-ScaleRelationships.html", [MO],
        note="The method (chord tones, then fill the gaps avoiding augmented seconds and consecutive half steps) and the table of chord-scale pairs."),
    wiki("Mode (music)", "Mode_(music)", [MO], note="Eight church modes in authentic and plagal pairs sharing a final; Glarean's *Dodecachordon* (1547) adding Aeolian and Ionian; modern modes as rotations of the major scale."),
]
