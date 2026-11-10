# Tagg, *Everyday Tonality II* (2014): index, tables, Works and lessons

The e-book PDF (version 2.5.2) has a text layer. Not kept here: the PDF, and `body.txt`, its whole text
(made by `swift pdf2txt.swift book.pdf body.txt`). PyMuPDF is needed for fonts (PDFKit calls every font Helvetica, losing the italics that mark titles):
`python3 -m venv v && v/bin/pip install pymupdf`.

1. `v/bin/python -I indexes.py book.pdf tunes.json body.txt`: italic headwords of the Alphabetical Index (pp. 562-595) = titles;
   their pages, underlined pages (= music examples); the Scale-degree, Chord shorthand and Chord sequence indexes (pp. 595-600,
   glyph map in the header); concepts that cite a title's pages ("strong" on its music-example page); artist and year from how the
   text cites it on those pages, checked against the Reference Appendix (pp. 507-560), else found by title in the appendix.
2. `v/bin/python -I tables.py book.pdf tables.json`: Tables 19, 20, 23, 27-31, 34-38 (chord progressions, shuttles, loops) cell by
   cell (find_tables), and one row per recording (`songs`). Table 37 has no column rules: copied by hand (`T37`).
3. `python3 -I combine.py` -> `tagg-index.json` (one piece per title, refs by page, concept = strong index concepts + table rows).
4. `python3 -I ../build.py` adds them to Works (`in.print` with book "tagg", fig = page, whole = music example, chords).
5. `python3 -I lessons.py` writes `lessons/tagg-*.qmd` from `summaries/part*.md` (chapter summaries drafted by AI agents from the
   book's text, with its page numbers; read two of the 16 closely, the rest not checked line by line) and `tables.json`.

Known gaps: about 370 titles have no artist (films, books, traditional songs, passing mentions); a year may be an album's or a
reissue's; a few table cells keep extraction slips; "same page" concepts are left out of Works (too often about another piece).
