# Sources for the Everyday Tonality lessons (lessons/tagg-*.qmd): Philip Tagg's book, read from the e-book PDF (version 2.5.2,
# 2014-09-25). The chapter summaries were drafted with AI help from the book's text (scripts/print-books/tagg/summaries/) and keep
# its page numbers; the tables were read from the PDF cell by cell (scripts/print-books/tagg/tables.py). Not yet checked line by line.
TG = ["lessons/tagg-sound.qmd", "lessons/tagg-modes.qmd", "lessons/tagg-melody.qmd", "lessons/tagg-harmony.qmd",
      "lessons/tagg-shuttles.qmd", "lessons/tagg-loops.qmd", "lessons/tagg-glossary.qmd"]
SOURCES = [
    book("Tagg, Philip. *Everyday Tonality II: Towards a Tonal Theory of What Most People Hear*. The Mass Media Music Scholars' Press, 2014.",
         TG + ["practice/tune-directory.qmd"], who="teacher",
         note="E-book version 2.5.2. The pieces in its index, with pages, are in the Tune Directory."),
]
