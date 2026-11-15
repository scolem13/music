# Print anthologies whose indices list pieces in Works (scripts/print-books/) and examples in the glossary.
# Cutler: publisher and date from Norton's listing (checked 2 Nov 2026), indices read from the book itself.
# Years of composition for those pieces and for themes with no MusicBrainz date: Wikidata (scripts/print-books/work-years.py).
TD, GL = "practice/tune-directory.qmd", "course/glossary.qmd"
SOURCES = [
    book('Cutler, Timothy. *Anthology of Music for Analysis*. W. W. Norton, 2019.', [TD, GL], who="teacher",
         note="Its Index of Composers and Works and Index of Concepts: the figure numbers in the Tune Directory and the examples under glossary terms."),
    book('Nobile, Drew. *Form as Harmony in Rock Music*. Oxford UP, 2020.', [TD], who="teacher",
         note="Its Song Index by Title (page numbers; bold = an example): the page numbers in the Tune Directory. Publisher and year from library records (checked 14 Nov 2026)."),
    book('de Clercq, Trevor. *The Practice of Popular Music: Understanding Harmony, Rhythm, Melody, and Form in Commercial Songwriting*. Routledge, 2024.', [TD], who="teacher",
         note="Page numbers of the figures and tables whose captions name a song (read from the book's text; the book has no song index, so songs only discussed in the text are not listed)."),
    web('Wikidata. Wikimedia Foundation. URL.', "https://www.wikidata.org/", [TD], who="teacher",
        note="Years of composition (inception) or publication of the pieces, matched by composer and catalogue number; CC0."),
]
