# Sources for the "Hear the principle" sections of the orchestration lessons and the Rimsky-Korsakov full-score examples.
# The book was read from Project Gutenberg's HTML (Chapter II melody, Chapter III harmony); the lessons retell its advice in the site's
# own words. The examples are the book's Vol. II numbered examples (Finale MusicXML exported by the Gutenberg volunteers), converted by
# scripts/rimsky/ and checked against the MusicXML; the book's captions give no bar numbers.
RK = ["lessons/compose-orchestra.qmd", "lessons/compose-instruments.qmd"]
SOURCES = [
    web('Rimsky-Korsakov, Nikolay. *Principles of Orchestration, with Musical Examples Drawn from His Own Works*. Edited by Maximilian Steinberg, translated by Edward Agate, Édition Russe de Musique, 1922. *Project Gutenberg*, ebook no. 33900, URL.',
        "https://www.gutenberg.org/ebooks/33900", RK + ["theory/analysed-scores/full-scores.qmd"], who="student",
        note="Public domain in the USA. Read: Chapter II (melody in strings, woodwind, brass and combined groups) and Chapter III (number of parts, "
             "distribution, string / woodwind / brass harmony). Retold in the page's own words; at most short phrases quoted. Which numbered examples "
             "illustrate which passage is taken from the book's own links (scripts/rimsky/index.py). Imprint read from the book's title page."),
]
