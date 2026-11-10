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
    web('Sapp, Craig Stuart, encoder. *Beethoven Piano Sonatas in the Humdrum File Format* (after the Durand 1915 edition, ed. Paul Dukas). GitHub. URL.',
        "https://github.com/craigsapp/beethoven-piano-sonatas", [SR], who="teacher",
        note="Pathetique III and Moonlight III in the score player (apps/shared/data/full-scores/beethoven-op13-3.abc, beethoven-op27-2-3.abc), read by scripts/kern/kern2xml.py. "
             "Licence: the repository has no LICENSE file and GitHub reports none (checked 2026-11-10; the Mozart and chorale repositories by the same encoder say CC BY-NC-SA 4.0): "
             "used here on a password-protected teaching site on the strength of the open publication; ask Sapp if the site is ever opened. The 1915 edition itself is public domain."),
]
