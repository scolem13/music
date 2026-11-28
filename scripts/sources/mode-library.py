# Sources for the Mode & Raga Library (tools/mode-library.qmd, apps/shared/mode-library.js).
# Read 2026-11-27: Garland vol. 5 (scan; Fig. 6 pp. 80-81 and Fig. 4 p. 76 read from page images at 260 dpi), Kassebaum pp. 97-98;
# MaqamWorld's prose (its notes are images, not read); Wikipedia articles (church-mode finals / reciting tones from a summary of
# the article, not verbatim: marked "derived" on the cards).
P = ["tools/mode-library.qmd"]
SOURCES = [
    book('Ruckert, George, and Richard Widdess. "Hindustani Raga." *The Garland Encyclopedia of World Music*, vol. 5, *South Asia: The Indian Subcontinent*, edited by Alison Arnold, Garland, 2000, pp. 64-88.', P,
        note="Pp. 67-69 (a raga neither tune nor scale; aroh / avaroh, vakra; vadi / samvadi and their limits; calan, pakad; a wrong raga's phrase a gross error; drone Ma or Ni when no Pa), p. 75 and Fig. 4 (Darbari's straight descent a violation; Jaunpuri), Fig. 6 pp. 80-81 (23 ragas' aroh and avaroh), pp. 81-82 (andolan)."),
    book('Kassebaum, Gayathri Rajapur. "Karnatak Raga." *The Garland Encyclopedia of World Music*, vol. 5, *South Asia: The Indian Subcontinent*, edited by Alison Arnold, Garland, 2000, pp. 89-109.', P,
        note="Pp. 97-98: Venkatamakhi's 72 melas and the three rules for a parent raga; janya ragas; Fig. 6 Madhyamavati."),
    web('Farraj, Johnny, and Sami Abu Shumays. *Maqam World*, URL. Accessed 27 Nov. 2026.', "https://www.maqamworld.com/en/", P,
        note="Maqam pages Rast, Bayati, Hijaz, Saba, Nahawand, Kurd (lower jins, ghammaz, upper ajnas); jins pages (sizes, Hijaz's second played smaller than notated)."),
    wiki("Arabic maqam", "Arabic_maqam", P, note="Quarter tones as notation, not precise intonation; modulation."),
    wiki("Pathet", "Pathet", P, note="Table of tonic, dominant and avoided tones; Hood's cadences 'largely disproven'."),
    wiki("Slendro", "Slendro", P, note="Roughly equal steps; no two gamelans alike (Lindsay)."),
    wiki("Pelog", "Pelog", P, note="9-TET subset as a rough approximation (Surjodiningrat); tones of each pathet."),
    wiki("In scale", "In_scale", P), wiki("Yo scale", "Yo_scale", P),
    wiki("Hirajōshi scale", "Hirajōshi_scale", P, note="Three versions in three sets of sources, one interval pattern."),
    wiki("Mode (music)", "Mode_(music)", P, note="Church modes: finals, reciting tones, authentic and plagal ranges."),
    wiki("Bebop scale", "Bebop_scale", P, note="Passing note placed so chord tones fall on the beats; David Baker's name."),
    wiki("Altered chord", "Altered_chord", P, note="7alt; alterations left to the comping musician."),
    wiki("Altered scale", "Altered_scale", P),
    wiki("Chord-scale system", "Chord-scale_system", P),
    wiki("Acoustic scale", "Acoustic_scale", P, note="Lydian dominant over 7#11."),
    wiki("Octatonic scale", "Octatonic_scale", P, note="Half-whole diminished in dominant harmony."),
]
