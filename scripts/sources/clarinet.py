# Sources for the clarinet lesson and Clarinet Patterns by Ear (and the fingering / trill tables in apps/shared/clarinet/clarinet-chart.js).
# The teacher book: the same scan as the saxophone's (footer code "W74"; scan of pp. 118-39 for the clarinet chapter: the scan skips some
# pages, e.g. the opening of the reed section and the book's tuning chart). Title and authors are not on the scanned pages.
# W74 is read as Kjos's catalogue number, NOT YET CHECKED (same unresolved question as scripts/sources/saxophone.py). Fix both entries
# once the cover is seen.
CL = ["lessons/clarinet.qmd", "practice/clarinet-patterns-by-ear.qmd"]
SOURCES = [
    book('"Clarinet." Teacher resource book, Neil A. Kjos Music Company (item W74; title and authors unverified), pp. 118-39.',
         CL, who="teacher",
         note="History (Denner, Müller, Klosé and Buffet), family, selecting players, reeds and reed adjustment, ligatures, parts, assembly, "
              "posture, embouchure, care, checklist, tone problems, vibrato, listening list, B♭ clarinet fingering chart (p. 136), trill chart "
              "(p. 137), alto / bass / contralto / contrabass chart (p. 138) and its trill chart (p. 139). Retold in the page's own words; "
              "charts redrawn from the book's key template. Not in the scanned pages: the tuning chart."),
    wiki("Clarinet", "Clarinet", CL, who="student",
         note="Unverified: the transpositions of the family in the lesson's table (B♭ M2, A m3, E♭ soprano m3 up, alto M6, bass M9, "
              "contra-alto octave + M6, contrabass two octaves + M2, basset horn P5), the register names (chalumeau, throat tones, clarion, "
              "altissimo) and the tuning advice. Not yet re-read."),
]
