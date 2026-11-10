# Sources for the form chapters of Hutchinson's open textbook: theory/phrases-in-combination.qmd (ch. 13), theory/creating-contrast.qmd (15),
# theory/binary-ternary.qmd (24), theory/sonata-rondo.qmd (25). Chapter pages fetched 2026-11-09 (source files in ~/.cache/mt21c).
# The pages' text is the site's own; the tunes are the site's tune collection, the key plans are read from the Analysed Scores Library.
PH = "theory/phrases-in-combination.qmd"
CC = "theory/creating-contrast.qmd"
BT = "theory/binary-ternary.qmd"
SR = "theory/sonata-rondo.qmd"
MT = "Hutchinson, Robert. "
SOURCES = [
    web(MT + '"Phrases in Combination." *Music Theory for the 21st-Century Classroom*, ch. 13, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/PhrasesInCombination.html", [PH], who="student"),
    web(MT + '"Creating Contrast Between Sections." *Music Theory for the 21st-Century Classroom*, ch. 15, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/CreatingContrast.html", [CC], who="student"),
    web(MT + '"Binary and Ternary Forms." *Music Theory for the 21st-Century Classroom*, ch. 24, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/BinaryAndTernaryForm.html", [BT], who="student"),
    web(MT + '"Sonata and Rondo Forms." *Music Theory for the 21st-Century Classroom*, ch. 25, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/SonataAndRondoForms.html", [SR], who="student"),
]
SOURCES += [
    web('Mutopia Project. "Beethoven, Sonata No. 8 \\"Pathétique\\", Op. 13, 3rd movement (Rondo)," typeset by Chris Sawer after the Berners edition (1908), ed. A. Winterberger. Public Domain. URL.', "https://www.mutopiaproject.org/ftp/BeethovenLv/O13/pathetique-3/", [SR], who="teacher",
        note="Plan read from the .ly file's MIDI export with scripts/mutopia/midi-structure.py (local mirror ~/Projects/corpora/mutopia); the URL is the mirror's path, not fetched."),
    web('Mutopia Project. "Beethoven, Sonata No. 14 \\"Moonlight\\", Op. 27 No. 2, 3rd movement (Presto agitato)," typeset by Chris Sawer and Stewart Holmes after the Berners edition (1908). Creative Commons Attribution-ShareAlike 2.5. URL.', "https://www.mutopiaproject.org/ftp/BeethovenLv/O27/moonlight/", [SR], who="teacher",
        note="Plan read from the .ly file's MIDI export (lilypond reported 'Going back in MIDI time'); the URL is the mirror's path, not fetched."),
]
