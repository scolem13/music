# Sources for the saxophone lesson and Sax Patterns by Ear (and the fingering / trill tables in apps/shared/sax/sax-chart.js).
# The teacher book: a scan of pp. 140-159 (the "Saxophone" chapter, footer "W74"). Its title and authors are not on the scanned
# pages: W74 is read as Kjos's catalogue number, NOT YET CHECKED. Fix the entry once the cover is seen.
SX = ["lessons/saxophone.qmd", "practice/sax-patterns-by-ear.qmd"]
SOURCES = [
    book('"Saxophone." Teacher resource book, Neil A. Kjos Music Company (item W74; title and authors unverified), pp. 140-59.',
         SX, who="teacher",
         note="History, family, parts, assembly, posture, embouchure, care, checklist, tone problems, tuning, vibrato, listening list, "
              "fingering chart (p. 158) and trill chart (p. 159). Retold in the page's own words; charts redrawn from the book's key template."),
    wiki("Saxophone", "Saxophone", SX, who="student",
         note="Unverified: the transpositions (alto M6, tenor M9, bari octave + M6 below written). Not yet re-read."),
    book("Sinta, Donald J., and Denise C. Dabney. <em>Voicing: An Approach to the Saxophone's Third Register</em>. Sintafest Music, 1992.",
         ["lessons/saxophone.qmd"], who="teacher",
         note="Not read directly. Year, publisher (Laurel, MD) and co-author from the East Carolina University catalogue record (one listing names Blaris Publications); "
              "the definition of voicing as quoted in Jones's summary below."),
    web('Jones, Emma. "Short Summary of the Books." <em>Learning the Altissimo Register of the Saxophone</em>, Research Catalogue, 2017, URL.',
        "https://www.researchcatalogue.net/view/216638/340512", ["lessons/saxophone.qmd"], who="teacher",
        note="Summary of Sinta's Voicing: voicing as control of the oral cavity and vocal tract; aural anticipation."),
    web('Thorpe, Jack. "How to Play Your First Saxophone Altissimo Note: Part Three." <em>DANSR</em>, 14 Dec. 2023, URL.',
        "https://www.dansr.com/resources/how-to-play-your-first-saxophone-altissimo-note-part-three", ["lessons/saxophone.qmd"], who="student",
        note="Crunch G fingering and the name; tongue/air advice."),
    web('"Saxophone Fingerings to Help You Break into Altissimo." <em>DANSR</em>, 28 Feb. 2024, URL.',
        "https://www.dansr.com/resources/saxophone-fingerings-to-help-you-break-into-altissimo", ["lessons/saxophone.qmd"], who="student",
        note="Front-F E, F and altissimo F♯, G, G♯ for soprano/alto (redrawn)."),
    web('"Lower Altissimo: Alternate Fingering Chart for Saxophone." <em>The Woodwind Fingering Guide</em>, URL.',
        "https://www.wfg.woodwind.org/sax/sax_alt_4.html", ["lessons/saxophone.qmd"], who="teacher",
        note="Cross-check of the altissimo fingerings; key names from its Fingering Scheme page."),
    web('Pimentel, Bret. "Saxophone Altissimo Books: Raschèr vs. Rousseau." 19 Nov. 2013, URL.',
        "https://bretpimentel.com/saxophone-altissimo-books-rascher-vs-rousseau", ["lessons/saxophone.qmd"], who="teacher",
        note="Further reading: Raschèr's Top-Tones and Rousseau's Saxophone High Tones compared. Their own dates not verified."),
]
