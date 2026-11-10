# Sources for the post-tonal chapters of Hutchinson's open textbook: theory/impressionism.qmd (ch. 32), theory/set-theory.qmd (33),
# theory/serialism.qmd (34), theory/minimalism.qmd (35). Chapter pages fetched 2026-11-09 (source files in ~/.cache/mt21c).
# The pages' text is the site's own. Pieces are named and described, never transcribed; links go to IMSLP / YouTube searches.
IM = "theory/impressionism.qmd"
ST = "theory/set-theory.qmd"
SE = "theory/serialism.qmd"
MN = "theory/minimalism.qmd"
MT = "Hutchinson, Robert. "
SOURCES = [
    web(MT + '"Impressionism and Extended Tonality." *Music Theory for the 21st-Century Classroom*, ch. 32, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/ImpressionismAndExtendedTonality.html", [IM], who="student",
        note="Composers and pieces named on the page (Debussy, Ravel, Stravinsky, Copland, Schoenberg, Bartok) are the chapter's. The whole-tone, octatonic and pentatonic material is NOT in the chapter: those facts are marked unverified on the page."),
    web(MT + '"Set Theory." *Music Theory for the 21st-Century Classroom*, ch. 33, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/SetTheory.html", [ST], who="student",
        note="Prime forms and Forte numbers of the 208 classes of 3-9 notes read from its tables; three vectors in them are misprints (see apps/shared/post-tonal/forte-data.js)."),
    web(MT + '"Serialism." *Music Theory for the 21st-Century Classroom*, ch. 34, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/Serialism.html", [SE], who="student"),
    web(MT + '"Minimalism." *Music Theory for the 21st-Century Classroom*, ch. 35, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/Minimalism.html", [MN], who="student"),
    book("Forte, Allen. *The Structure of Atonal Music*. Yale UP, 1973.", [ST], who="teacher", note="Not re-read; the source of the Forte numbers the book prints."),
    book("Rahn, John. *Basic Atonal Theory*. Longman, 1980.", [ST], who="teacher", note="Not re-read; the prime-form rule used here (compare from the right) is Rahn's, as the book says."),
]
