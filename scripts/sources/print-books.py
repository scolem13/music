# Print anthologies whose indices list pieces in Works (scripts/print-books/) and examples in the glossary.
# Cutler: publisher and date from Norton's listing (checked 2 Nov 2026), indices read from the book itself.
# Years of composition for those pieces and for themes with no MusicBrainz date: Wikidata (scripts/print-books/work-years.py).
TD, GL = "practice/tune-directory.qmd", "course/glossary.qmd"
SOURCES = [
    book('Cutler, Timothy. *Anthology of Music for Analysis*. W. W. Norton, 2019.', [TD, GL], who="teacher",
         note="Its Index of Composers and Works and Index of Concepts: the figure numbers in the Tune Directory and the examples under glossary terms."),
    web('Wikidata. Wikimedia Foundation. URL.', "https://www.wikidata.org/", [TD], who="teacher",
        note="Years of composition (inception) or publication of the pieces, matched by composer and catalogue number; CC0."),
]
