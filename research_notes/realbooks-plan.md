# Real and fake books: catalogue, ABC versions, comparison

Sources: 46 book PDFs in `~/Projects/corpora/realBooks` (1.4 GB; never deployed) and Hal Leonard's Songfinder.
ABC copies of printed charts go on the site behind a password. The catalogue itself can be public.

## Done so far

- `apps/realbooks/songfinder.json`: 3,991 titles and 5,264 printings across 23 Hal Leonard volumes, from
  `scripts/realbooks/songfinder.js`. It gives titles and volumes only, with no page numbers.
- `apps/realbooks/books.json`: one entry per PDF, with page count, source kind, scan resolution, layout and a difficulty tier.

**Caveat:** few of the PDFs are the books in the Songfinder. Real Book 1 (5th edition), the Bb2, Eb2 and Bass2
volumes and the Real Vocal Book are the original handwritten Real Books. Hal Leonard's legal editions re-engraved
most of the same tunes, but in a different order and with different pages. Only *Real Book All New Vol. 3* and
*Real Book Bb3* are Hal Leonard (vol. III). So for most books, page numbers have to come from the PDFs themselves.

## How hard automatic transcription is, book by book

Each tier is judged from one sample page per book, plus its fonts and scan resolution. Single pages can mislead,
so a tier can change once more of a book has been seen.

| Tier | What it is | Books | Pages (approx.) | Likely route to ABC |
|---|---|---|---|---|
| 1 | Born-digital: the notation is vector music-font glyphs or the engraver's source | openbook, Public Domain Christmas, Brazilian, Django, New Bob Book, TV Guide | 1,700 | openbook: convert the LilyPond sources directly. The others: render at 600 dpi and run OMR, which should be near-clean. Reading the glyphs straight from the PDF is possible later |
| 2 | Clean 200–600 dpi scans of engraved lead sheets, one tune a page | Real Book III (C and Bb), Colorado Cookbook, Just Standards, Standards Real Book, New Real Book 1–3, Latin Real Book, 50s Jazz, Cuban, Dixieland C, Legit Professional, Real Easy Book | 5,100 | OMR, then a check pass: chord symbols by OCR, bar lengths, playback. Expect a few fixes per tune |
| 3 | Engraved but harder: dense pages with several tunes, small notes under lyrics, piano/vocal layouts where the melody must be picked out, multi-staff transcriptions, or 106–150 dpi | Jazz Fake Book, Legal Musician's, World's Greatest, All Jazz, Library, New Orleans Jam Book, All Time Best 3, Nat King Cole, Mancini, Keith Jarrett, Bill Evans, Monk Fake Book | 4,600 | Split pages into tunes first. OMR on the top staff, and more fixing per tune |
| 4 | Handwritten (the original Real Books and similar), or very poor scans | Real Book 1 (5th), Bb2, Eb2, Bass2, Bb5, Bass5, Real Vocal Book, The Book, Dixieland Jazz Standards, Jazz LTD, Jazz Solos, Monk Compositions (72 dpi), Latin Fake Book (112 dpi, faint) | 5,400 | Standard OMR does badly on handwriting. Options: a vision model reading the page into ABC, checked by playback against another version of the same tune; or entry by hand on the Notation page, with the page image beside it |

Tier 4 matters less than its size suggests. Most of the handwritten Real Book tunes are also in a tier 1–2 book
(Hal Leonard's re-engraving, New Real Book, Standards). That version can be transcribed first, and the handwritten
chart then becomes a comparison: its differences are often the interesting part (older chord changes, known errors).

**Tools:** no OMR is installed yet. Candidates are Audiveris (free, typeset only), homr or oemer (free, neural),
and PlayScore or SmartScore (paid, better results). MuseScore 3 and 4 are installed, which helps the Ultime
re-import (mscz to MusicXML). Run the same 20-page test set through each before choosing.

## The earlier imports (Tune Library "Standards", 1,009 tunes)

Matched to sources by title, so the counts are approximate (many tunes are in several sources):
- **jazzXML (~410):** about 90% flagged, half badly: OCR-garbage credit lines, wrong bar lengths, melody against the
  chords, some with no chords. These look like OMR output, so a better converter won't fix them. Mark them as
  drafts and replace them from better versions.
- **Ultime (~580):** about half flagged, mostly stray text breaking parsing. Re-import from the `.mscz` files.
- **openbook (~240):** mostly fine. Re-convert from the LilyPond sources.

## Steps

1. Catalogue: tunes (title, other titles, composer, year) ← printings (book, page, printed key, edition) ← versions
   (ABC, source, maker, status). Book page numbers come from PDF outlines, text indexes, or OCR of index pages,
   checked against the Songfinder. Start with the tier 1–2 books.
2. Link the 1,009 existing tunes to catalogue tunes, re-import openbook and Ultime, and mark jazzXML as drafts.
3. Pick an OMR tool on a test set: 5 pages each from tiers 1–4, scored against hand-checked ABC.
4. Transcribe gradually: tunes in the most books first. A work page shows the book page beside the Notation page,
   with status draft or checked.
5. Comparison view: versions in one key, lined up bar by bar, with differences in melody, rhythm, chords and form;
   recordings-based versions (RS200, CoCoPops, our own transcriptions) beside the printed ones.
6. Password protection: Cloudflare Access on the ABC paths (the site deploys with Wrangler: `wrangler.jsonc`).
