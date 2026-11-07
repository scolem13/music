# Cutler, *Anthology of Music for Analysis*: the two indices

The book's Index of Composers and Works (pp. 537–547) and Index of Concepts (pp. 549–555), read from a scan with no text layer.

1. `swift render.swift book.pdf <dir>` draws each page as a PNG; `swift ocr.swift <dir>/p*.png > ocr.txt` reads them with macOS
   Vision (one line per printed line, with its left edge, by column). `ocr.txt` is kept, so the steps below need no PDF.
2. `python3 -I parse.py ocr.txt parsed.json`: works by text rules (a line continues the one before when that one does not end in
   figure numbers; a short "Surname, Given" line is a composer), concepts by indent relative to the line above (the scan is
   askew) and figure ranges ("17-1 through 17-7") written out. `fixes.py`: the chord and time-signature labels (V6/5, 3/8 …) the
   OCR garbles, read off the page images, each found by its page and the figures that follow it.
3. `python3 -I combine.py parsed.json cutler-index.json`: OCR slips in titles, "(continued)" headings merged, and checks: every
   figure the concepts index cites should belong to a work (4-1 and 17-13 do not: missing from the book's works index), and a
   figure given to two works is reported (only the counterpoint / cantus firmus examples in ch. 3, as printed).
   The works index prints the Bach Cello Suite Menuets as 28-18; the concepts index and Chopin op. 28 no. 15 (28-18) make it 28-19.
4. `python3 -I ../work-years.py cutler` adds years (Wikidata); `python3 -I ../build.py` writes the Works block; `node ../../course-glossary.mjs` the glossary examples.

## Measures (the caption beside each example label)

`measures.py body-ocr.txt measures.json`: the measure range printed in each caption ("mm. 1-6", "all", or movement-by-movement
as printed), read from an OCR of the whole body (`swift ocr.swift pages/p*.png`, not kept: 9,000 lines). `measures.json` is
`{fig: {mm, note?}}`; `build.py` puts `mm` on each `in.print` entry and `Works.printLabel` shows it. The scan only reaches
chapter 28 (to 28-16), so 28-17 on (and the ch. 29-33 figures) have none. Chapter 3 (cantus firmus / counterpoint) has no
measures. Hand-read from the page images: 19-20, 3-23, 26-15 (`FIXES`). 4-1 and 17-13 are captioned but missing from the book's works index.
