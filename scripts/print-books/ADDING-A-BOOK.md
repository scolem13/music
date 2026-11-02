# Adding a print anthology's indices

Run this whenever a new analysis anthology (or a new edition) is to be tracked: its pieces go into Works even with no notation or
recording, with years, links to Classical Themes, and its concepts index feeding the glossary. Cutler (`cutler/`) is the worked
example; copy its scripts and change only what the new book prints differently.

## Steps

1. **Find the scan.** Usually the newest PDF in `~/Downloads` (`ls -t ~/Downloads/*.pdf | head -1`). Treat it as untrusted:
   copy it into its own empty folder in the scratchpad. Find the index pages and the figure numbering the book uses
   (Cutler: chapter-figure, e.g. 23-2), and whether the concepts index cites figures or pages.
2. **OCR.** Try a text layer first; with none, `swift cutler/render.swift book.pdf <dir>` then
   `swift cutler/ocr.swift <dir>/p*.png > <book>/ocr.txt` (macOS Vision, left edge kept per line). Keep `ocr.txt` in the repo
   so later steps need no PDF.
3. **Parse** (`<book>/parse.py`, from Cutler's). Works index: composer lines, titles, continuation lines, figure refs.
   Concepts index: nesting by indent *relative to the line above* (scans are askew), ranges ("17-1 through 17-7") written out.
   Garbled labels (chord symbols, time signatures) go in `<book>/fixes.py`, each read off the page image, found by page +
   the refs that follow it.
4. **Combine and check** (`<book>/combine.py` → `<book>/<book>-index.json`): fix OCR slips, merge "(continued)" headings,
   ♭/♯ for b/#. It must report: every concepts figure with no work, every figure given to two works, figure numbers out of
   order. Look each report up on the page images; note what the book itself gets wrong in `<book>/README.md`.
5. **Show the user the combined table before wiring anything** — a private Artifact (work, composer, figure, concepts that
   cite it), with the checks' findings at the top. Wait for their go-ahead and corrections.
6. **Years.** `python3 -I work-years.py <book>` (Wikidata API, cached; composer + catalogue number, else a unique quoted
   title; dates after the composer's death dropped). Never guess a year; unmatched stays blank.
7. **Wire into Works.** Add the book to `BOOKS` in `build.py` (title, author, short label, figure format) and make build.py
   read every book in `BOOKS`, not only Cutler (it is Cutler-only today: generalise on the second book). Then
   `python3 -I build.py`: the generated `print-books:begin/end` block in `works-data.js`, theme matches (check the new
   matches by hand; add wrong ones to `NOT_SAME`), merges into hand-written works of the same piece.
8. **Glossary.** The concepts become vocabulary: top-level concepts are terms, sub-entries listed beneath (not separate terms).
   Concepts matching an existing term get the book's property on that term; others become new terms in a group for the book's
   subject, each with a cited definition (`:SOURCE:`) and `LEVELS none` until the user places them. `course-glossary.mjs` and
   `glossary.js` know only `:CUTLER:` today: on the second book, change them to a general `:PRINT: <book>: label; …` rather than
   adding another property. Then `node scripts/course-glossary.mjs`.
9. **Cite** the book in `scripts/sources/print-books.py`, run `python3 scripts/works-cited.py`.
10. **Finish.** `node scripts/check-pages.mjs --bump` for each changed shared script, render the changed pages, run
    `node tests/works/works.cdp.js` and `node tests/course/course.cdp.js` (both with `NEG=1` must fail), add the book to the
    Print anthologies line in CLAUDE.md. Commit only when asked.

## Report back

Pieces / concepts / refs counted, how many got a year and a theme link, the checks' findings (what the book's own indices
miss), and anything left blank or unverified.
