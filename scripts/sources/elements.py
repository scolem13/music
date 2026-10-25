# Sources for the Elements of Music lessons (lessons/elements-*.qmd), adapted from a school handout ("Elements of Music").
# Checked 23 Oct 2026: each Wikipedia article was fetched and the facts used were found in it. What is still unchecked is
# listed in lessons/ELEMENTS-NOTES.md.
EL = ["lessons/elements-%s.qmd" % n for n in "articulation dynamics harmony instruments melody metre rhythm structure style articulation-sheet dynamics-sheet harmony-sheet instruments-sheet melody-sheet metre-sheet rhythm-sheet structure-sheet style-sheet texture texture-sheet quiz".split()]
E = lambda n: "lessons/elements-%s.qmd" % n
SOURCES = [
    wiki("Cadence", "Cadence", [E("harmony"), E("harmony-sheet")], who="student",
         note="Authentic V–I, plagal IV–I ('Amen'), half cadence on V, deceptive V to any chord but I, most often vi; Picardy third."),
    wiki("Dynamics (music)", "Dynamics_(music)", [E("dynamics"), E("dynamics-sheet")], who="student",
         note="Sforzando / sforzato (sf, sfz): suddenly loud on one note; terraced dynamics from contrasting small and large groups; hairpins below the staff, between piano staves, above in vocal music."),
    wiki("Tempo", "Tempo", [E("rhythm"), E("rhythm-sheet")], who="student",
         note="Rough BPM ranges, slowest to fastest: lento/adagio, andante (walking pace, below moderato), moderato, allegretto, allegro, vivace; 'very rough approximations'."),
    wiki("Classical period (music)", "Classical_period_(music)", [E("style"), E("style-sheet"), E("dynamics"), E("dynamics-sheet"), E("texture")], who="student",
         note="Classical roughly 1750–1820; Baroque c. 1600–1750; Romantic c. 1800–1910; melody over a subordinate accompaniment such as an Alberti bass."),
    wiki("Alberti bass", "Alberti_bass", [E("texture"), E("texture-sheet"), E("style"), E("style-sheet")], who="student", note="Lowest, highest, middle, highest; Classical era; Mozart K. 545."),
    wiki("Basso continuo", "Basso_continuo", [E("texture"), E("texture-sheet"), E("style"), E("style-sheet")], who="student",
         note="Chord instruments (harpsichord, organ, lute, theorbo…) and bass instruments (cello, double bass, bass viol, bassoon); figured bass."),
    wiki("Minuet", "Minuet", [E("structure"), E("structure-sheet")], who="student",
         note="Usually 3/4; French social dance, into opera via Lully; binary sections; 'trio' named from a middle section scored for three instruments; A–B–A overall."),
    wiki("Minimal music", "Minimal_music", [E("style"), E("style-sheet")], who="student",
         note="US West Coast, late 1950s–early 1960s; Young, Riley, Reich, Glass, Adams; repetition, phase shifting, additive process, consonant harmony."),
    wiki("Blue note", "Blue_note", [E("style"), E("style-sheet")], who="student", note="Lowered 3rd, 5th and 7th; between a quarter tone and a semitone."),
    book("Elements of Music. School handout, 10 pp., n.d.", EL, who="teacher",
         note="The source handout these lessons were built from; its order is kept. Corrections are listed in lessons/ELEMENTS-NOTES.md."),
]
