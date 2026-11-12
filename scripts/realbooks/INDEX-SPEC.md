# Book index spec (shared by every indexing agent)

Books: `~/Projects/corpora/realBooks/*.pdf`. Book facts (tier, layout, resolution): `apps/realbooks/books.json`.
Write one file per book: `apps/realbooks/index/<pdf name without .pdf>.json`:

```json
{
  "file": "Real_Book_Bb2.pdf",
  "method": "outline | text-index | ocr-index | ocr-page-titles | mixed",
  "offset": 7,
  "notes": "short notes: what was hard, what is uncertain",
  "entries": [
    { "title": "Happy Little Sunbeam", "pdfPage": 141, "page": 133, "composer": "R. Freeman", "conf": "high" }
  ]
}
```

- `pdfPage` is the 1-based page in the PDF (what `pdftoppm -f N` opens). **Required.** `page` is the number printed in the
  book, where known. `offset` is pdfPage minus page when it is constant (else null).
- One entry per tune. A tune running over several pages: its first page. Several tunes on one page: one entry each.
- Titles as printed, in title case, with "The" kept where the book has it ("The Days Of Wine And Roses" stays). Fix obvious OCR errors.
  Leave out non-tune pages (covers, teaching pages, solos sections) unless the book is a collection of solos (then each solo is an entry).
- `composer` when the index or page gives it cheaply; otherwise leave it out.
- `conf`: "high" (from bookmarks or a clean text index, with the page checked), "med" (OCR, page not checked), "low" (guessed).

**Method, cheapest first:**
1. Bookmarks: `mutool show <pdf> outline`. Only useful when there is one entry per tune.
2. A text layer: `pdftotext -layout -f A -l B`. The index is usually in the first ~15 or last ~15 pages.
3. OCR of the index pages: `pdftoppm -r 300 -gray -png -f A -l B` into your scratch dir, then `tesseract page.png - --psm 4` (try `--psm 6` for columns).
   You can look at a page image yourself with the Read tool to find which pages are the index and to settle unclear OCR.
4. No index in the book: OCR the top fifth of every page for its title (crop with `pdftoppm -x -y -W -H` at 150 dpi). For handwritten
   titles OCR is poor: look at the page images yourself (several at a time, small) and read the titles.

**Check the page numbers:** for at least 5 entries spread through the book, render that pdfPage and confirm the title is on it.
Work out `offset` from that. Report the check in `notes`.

Use your own scratch dir under `$TMPDIR` for images. Don't edit any other repo files. Don't commit.
At the end, report per book: method, entry count, how many checked, and problems.
