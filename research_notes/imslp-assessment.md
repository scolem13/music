# What could we add to the library from IMSLP? (assessment, 2026-11-10)

Scope: usefulness to this site, ease of getting machine-readable notation, OMR tools that run on this Mac, IMSLP's rules, a ranked
shortlist, a pipeline, and a small pilot. Every claim about tools or rules has a URL; guesses are marked **(guess)**.
Nothing on the site was changed. Pilot files are in `~/Projects/corpora/imslp-pilot/` (untrusted folder).

## 0. The short answer

1. **Most of what the Hutchinson gaps list wants is already on this machine as machine-readable scores and is not in the library only
   because the library keeps pieces whose When in Rome analysis fits.** Pathetique III, Moonlight III, Waldstein and the other
   Beethoven sonata movements are in `~/Projects/corpora/craigsapp_beethoven-piano-sonatas/kern/` (`sonata08-3.krn`, `sonata14-3.krn`,
   `sonata21-1.krn`, ... all 32 sonatas are there); the library has only 48 Beethoven movements (`apps/shared/data/scores/index.json`).
   Haydn Op. 33 No. 2 finale is `musedata_humdrum-haydn-quartets/kern/op33n2-04.krn`. Mozart's sonatas K. 279-576 are in the kern
   folder. Do these first; no IMSLP, no OMR.
2. **IMSLP cannot be fetched by script**, and its robots.txt disallows the file paths to bots. The only polite route is for the teacher
   to download chosen PDFs by hand in a browser (about 20-60 files, one afternoon). Scripts then work on local files only (section 3).
3. **OMR now works well enough for short, clean, engraved piano and single-line wind music, not for orchestral scores.** In the pilot
   (one Bach Invention page, rendered by LilyPond so it is optimistic) homr 0.7.0 got 313 of 315 notes exactly right on a degraded
   copy and Audiveris 5.11.0 got 290 of 315 (it missed a clef change). The site's `score-check.cjs` passed all three outputs, so it
   **cannot** find OMR mistakes (it checks the ABC against the MusicXML, not the MusicXML against the page). Every OMR piece needs a
   second check (section 2.4).
4. **What IMSLP is actually needed for:** pieces in no corpus we hold: Haydn piano sonatas, Kuhlau / Clementi sonatinas, Schumann's
   Album for the Young, Bach French / English Suite dances, and public-domain etudes for the band instruments (Clarke, Arban, Klose,
   Kohler, Kreutzer ...). Plus the "find the theme" lesson, which needs **no** transcription (students find the score themselves).

## 1. Usefulness: what the site is missing

Sources read: `research_notes/hutchinson-gaps.md`, `research_notes/pdmx-conversion.org` (header), `~/Projects/corpora/README.md`,
`TODO.md`, `research_notes/recordings-to-scores-plan.md`, `research_notes/hutchinson-notation-plan.md` (tier 3 already says
"IMSLP scans: Audiveris, then the tier 2 pipeline"), the book source `~/.cache/mt21c/src/*.xml`, `apps/themes/CLAUDE.md`,
`scripts/print-books/cutler/cutler-index.json`.

### 1.1 Already have: do not propose
- Library (608 scores): 360 Bach chorales, 138 OpenScore Lieder, 48 Beethoven sonata movements, 40 Mozart sonata movements, 22 WTC I preludes.
- PDMX: 892 picked, 454 converted (piano 291, ensembles 318, choir 251, quartet 25).
- Local corpora not yet fully used: all 32 Beethoven sonatas (kern), Mozart sonatas (kern), Haydn quartets (kern), OpenScore Lieder
  (about 1,300 songs) and String Quartets, DCMLab sets, Mutopia (323 composer folders, LilyPond source only, no PDF/MusicXML in this copy).
- music21's bundled corpus (here `~/.local/lib/python3.15/site-packages/music21/corpus/`): Bach chorales and `bwv846.mxl`, Beethoven
  Op. 18 / 59 / 74 / 132 / 133, Mozart K. 80 / 155 / 156 / 458 / 545, Haydn Op. 1 No. 1 and Op. 74 No. 1, Schumann, Chopin (one mazurka). Not
  inventions, French / English Suites, symphonies.
- Mutopia has the Inventions (BWV 772-786) and Sinfonias (787-801), most of Chopin Op. 9, 28, 33, 35, and only a few French / English
  Suites (BWV 806, 807, 814, 816, 817). Python-ly drops notes (hutchinson-gaps third pass), so Mutopia needs the MIDI route or a better
  LilyPond-to-MusicXML step; that is cheaper than OMR but is its own task.

### 1.2 Ranked by teaching value (what the site's own notes ask for)

| Rank | Need | Where the site says so | Machine-readable already? | IMSLP/OMR needed? |
|---|---|---|---|---|
| 1 | Sonata / rondo examples: Pathetique III, Moonlight III, Waldstein I, Op. 2 No. 1 IV, Op. 2 No. 3 I, Op. 10 No. 1 II, Op. 53 I | hutchinson-gaps ch. 25, third pass | **Yes, kern, local** | No |
| 2 | Phrase-level examples: asymmetrical periods, phrase groups, elisions (ch. 13) | hutchinson-gaps ch. 13 | Partly: Mozart K. 331 / 333 / 545 in kern; Haydn Hob. XVI:35 / 49 / 50 / 9, Kuhlau Op. 55/1, Schumann Op. 68 not held | Yes for Haydn sonatas, Kuhlau, Schumann Op. 68 |
| 3 | Invention / fugue expositions (ch. 30) | hutchinson-gaps ch. 30 | Inventions 1, 7, 8: Mutopia LilyPond (local), PDMX has Inv. 8; WTC fugues: Mutopia has some (BWV 846-878 subset), `bwv846.mxl` in music21 | Only for missing fugues; check Mutopia first |
| 4 | Binary / ternary dance examples (ch. 24: "Bach dances not in the library") | hutchinson-gaps ch. 24 | PDMX covers some (Inv. 8, Anh. 131 etc.) | French Suite 1 Sarabande BWV 812, English Suites 3 and 4 (BWV 808, 809): yes |
| 5 | Band-instrument etude / solo repertoire per instrument | CLAUDE.md "Band instruments" lessons | Almost none held | Yes: the easiest OMR case (one staff, one voice) |
| 6 | Cutler anthology pieces with no notation (803 works, 846 figures) | `scripts/print-books/` | Many are Schubert Lieder (59), Beethoven (86), Mozart (60), Haydn (51), Bach (44): match against OpenScore Lieder, kern, Mutopia first | Only the remainder (Schumann 49, Brahms 50, Chopin 32 ...) |
| 7 | Symphonic examples cited by the book (Beethoven 5 / 7 / 1, Mozart 36 / 39 / 40 / 41, Haydn 94 / 104, Brandenburg 2) | hutchinson-notation-plan, ch. 13 / 15 / 25 | Not held | Yes, but orchestral OMR is the worst case; do **excerpts** (8-32 bars), hand-fixed |
| 8 | Classical Themes: "find the theme" lesson (569 themes start after bar 1) | TODO.md line 41, recordings-to-scores-plan.md | n/a | **No transcription**: the lesson sends students to IMSLP. Add an IMSLP work-page link per theme (done by hand or by the metadata API, section 3) |
| 9 | Schoenberg Op. 25 row (typed from memory, unchecked) | hutchinson-gaps ch. 34 | n/a | One page of scan, read by eye; no OMR |
| 10 | MLT songs | | Tune collection already has them | Not an IMSLP job |

## 2. Ease of transcription

### 2.1 Machine-readable files on IMSLP (easy)
- IMSLP accepts PDF as the main score format and also MuseScore files; MusicXML is rendered officially with MuseScore ("IMSLP:File formats",
  https://imslp.org/wiki/MUS). A forum thread argues against allowing MusicXML at all (https://forums.imslp.eu/viewtopic.php?p=7877), so
  **I could not confirm how many works carry MusicXML / MIDI / LilyPond / MSCZ attachments and I could not count them** (no category page found).
  Expect a minority, and often only for popular pieces (guess).
- These attachments are typeset by volunteers: check each file page's licence (some are CC BY-SA / NC, which may not suit the site) and check
  the notes anyway, because volunteers also err.
- Better machine-readable sources for the same pieces are already named above (kern, OpenScore, Mutopia, music21). Look there first.

### 2.2 OMR tools that run locally (checked 2026-11-10)

| Tool | Version / date | Licence | Install on this Mac | Notes |
|---|---|---|---|---|
| Audiveris | 5.11.0, 2026-07-11 ([release API](https://api.github.com/repos/Audiveris/audiveris/releases/latest)) | AGPL-3.0 ([repo](https://github.com/Audiveris/audiveris)) | arm64 `.dmg` on the releases page, bundled Java runtime; output MusicXML 4.0 and `.omr` | Classic pipeline, multi-staff systems, full-score capable. System has **no Java**; the bundled runtime works (pilot). Page-by-page; multi-page needs book handling |
| homr | 0.7.0, 2026-06-26 ([PyPI](https://pypi.org/pypi/homr/json)) | AGPL-3.0, weights have separate licence notes ([repo](https://github.com/liebharc/homr)) | `pip install 'homr[cpu]'`; needs Python 3.11-3.15. **Failed on this Mac's default Python 3.15 (scikit-image build); worked in a Python 3.14.7 venv** | Neural (UNet from oemer + transformer from Polyphonic-TrOMR); README: grand staff merge supported; octave lines, octave clefs, beams, glissandi unsupported. About 7-55 s per page on CPU in the pilot |
| oemer | 0.1.8, 2024-11-16 ([PyPI](https://pypi.org/pypi/oemer/json)) | MIT ([repo](https://github.com/BreezeWhite/oemer)) | `pip install oemer` | README: Western notation only, not handwritten; names homr as its improved successor. Not run (superseded) |
| Others | | | | Not assessed: online services (PlayScore, SmartScore, MuseScore import) are not local / free. **(guess)** none beat these two for free local use |

Not installed before: `audiveris`, `oemer`, `homr`, `mscore` were all absent; `tesseract`, `lilypond`, `gs`, `magick`, Python with music21 exist.
MuseScore 4.app exists (can import MusicXML and PDF? **not tested**).

### 2.3 How well they do (published evidence, then my pilot)
- homr's own benchmark (https://raw.githubusercontent.com/liebharc/homr/main/Benchmark.md), metric OMR-NED, lower is better, 0 = perfect:
  polish-scores 15.3 (homr, 110 of 112 produced output) vs 23.8 (transcoda) and 20.8 (copisteria); SMB 12.8 (homr, 679 of 685); on a 10-sample SMB
  subset homr 24.2 vs oemer 38.0 (native parser); under musicdiff homr 74.3 on SMB and 30.7 on polish-scores. The page itself warns that the
  native-parser numbers may flatter homr and that musicdiff penalises homr for not writing beams. It has no Audiveris numbers.
  The SMB dataset (685 pages) was introduced in 2025: https://arxiv.org/abs/2506.10488.
- Audiveris: a 2023 evaluation framework paper (https://arxiv.org/pdf/2312.12908) ran it on the COMREF dataset; the search summary I saw says
  output covered about 45,800 of about 52,900 ground-truth measures (about 87%) and structural symbols (noteheads, stems, beams) were found
  with recall above 75%. I did not read the paper in full: treat as indicative. An older study (ISMIR 2015,
  https://www.ismir2015.uma.es/articles/187_Paper.pdf) found no single OMR program consistently best and Audiveris not robust at the time.
- For piano music the literature argues the measure that matters is effort to correct, not raw symbol error (https://arxiv.org/pdf/2403.13763).
- I found **no published error rates for oemer or homr on public-domain 19th-century Breitkopf-style scans, orchestral scores or
  handwritten scans**. Everything below on those is **guess**:
  - clean modern-looking engraving of piano or single-line music (Peters, Breitkopf Gesamtausgabe, Henle-era PD reprints): good, a few
    percent of notes wrong, clustering at clef changes, ornaments, grace notes, ties across systems, voices on one staff;
  - dense or old-engraved scans (worn plates, ink bleed, 19th-century fonts): noticeably worse; budget a per-note read-through;
  - orchestral full scores (many staves, transposing parts, divisi, cues): poor, errors compound; do excerpts only;
  - handwritten or manuscript scans: do not attempt.

### 2.4 Pilot (section 5 has the detail) and how to verify OMR output
`score-check.cjs` compares the ABC to the MusicXML it came from, so it catches **converter** faults, not OMR faults. What it does catch from
OMR output: bar lengths that disagree with the time signature, voices of unequal length, absurd ranges. Add:
1. **Two engines, diff them**: run Audiveris and homr on each page and compare notes by bar (music21, as in the pilot's `cmp.py`);
   bars where they disagree are the ones to read against the scan. **(guess: untested here; in the pilot the engines did disagree exactly where
   Audiveris was wrong, but I did not diff them directly)**
2. **Second source**: if the piece is also in kern / OpenScore / Mutopia / PDMX, compare note by note and use the OMR file only as a check.
3. **Overlay**: draw the transcription in abcjs beside the scan page at the same bar (hand check, as for the Hutchinson figures).
4. **Hear it**: playing a wrong note in a fugue subject is audible to a musician; use the bar-lit RecSync player with a recording where one exists.

## 3. IMSLP's rules (what I could establish)

- **robots.txt** (https://imslp.org/robots.txt): all bots except MyriadBot are `Disallow`ed from `/images/`, `/wiki/File:`, `/wiki/Image:`,
  `/index.php`, `/wiki/Special:`, `/work/`, `/works`, `/instrument/`, `/library/`, with `Crawl-delay: 2`. The actual score files are served
  from `/images/`, so a script fetching them is exactly what robots.txt forbids. The work pages (`/wiki/<Title>`) are not disallowed.
- **API** (https://imslp.org/wiki/IMSLP:API): two read-only list endpoints (people `type=1`, works `type=2`, paged with `start`, formats
  json / php / pretty / wddx). The page says nothing about rate limits, terms, or file links. A third-party scraper's documentation
  (https://apify.com/crawlerbros/imslp-scraper) says it uses the standard MediaWiki `api.php` for metadata and that scripted file requests are
  redirected (302 to `/friendlytest.html`, a captcha). That is secondary, not IMSLP's statement, but matches the robots rules.
- **Terms of Use**: I tried `IMSLP:Terms_of_Use`, `General_Disclaimer`, `Copyright_Policy`, `Copyright_Primer`: all 404. **I did not read IMSLP's
  actual Terms of Use or disclaimer, so I cannot say what they say on bots or redistribution. Read them (footer links on imslp.org) before any
  bulk work.**
- **Copyright flags and jurisdictions** (https://imslp.org/wiki/IMSLP:Copyright_Made_Simple): US, "any work first published before 1931 is in
  the public domain" (in 2026; 1931 works enter on 1 January 2027, from US law, not IMSLP). Canada, public domain if the last surviving author
  died before 1972, because Canada extended its term non-retroactively to life+70 in 2023. EU, life+70. IMSLP is hosted in Canada: works PD only in life+50 countries are kept on a separate Canada-only server (from search summaries of IMSLP pages, not read in full). Files not PD in the US are blocked for US visitors (copyright reviewers' forum post, https://forums.imslp.eu/viewtopic.php?p=1993; a forum, not policy).
  Editions: IMSLP says editors without original contribution get no protection in Canada; in the EU an edition may be protected up to 30 years
  after publication (IMSLP applies a 25-year courtesy rule); in the US "a public domain work remains in the public domain" and engraving alone
  gives no new copyright; new material (prefaces, editorial fingerings and dynamics) can be copyrighted. IMSLP says exceptions may apply and gives
  no guarantee.
- **What this means for the site** (not legal advice): choose works whose composer died before 1956 **and** that were published before 1931
  in an edition that is itself pre-1931 (so PD in the US, EU and Canada at once), and transcribe the **notes**, leaving out an editor's added
  fingerings, phrasing, dynamics and bowings (or check they are in the original). Avoid post-1930 editions (Henle Urtext, Barenreiter, Wiener
  Urtext) even if IMSLP hosts a scan, and avoid user-typeset files with a non-commercial / share-alike licence unless the site's terms fit.
  The site stays behind a password, which does not change any of this.
- **Recommended way to fetch**: **by hand only.** The teacher opens each work page in a browser, passes IMSLP's own download page, saves the PDF
  into `~/Projects/corpora/imslp-pilot/<work-id>/` and writes a manifest line (work page URL, file page URL, edition, publisher, plate number,
  year, editor, licence, date downloaded). Scripts read only that local folder. If metadata for many works is wanted (e.g. a link per Classical
  Theme), use `api.php` or the `type=2` list at no more than one request per 2 seconds with a descriptive User-Agent and a cached result;
  never touch `/images/`. (If IMSLP's real Terms permit more, relax this; I could not read them.)

## 4. Recommendation: what to add first

Order = value per hour. "MR" = machine-readable, no OMR. Effort is my **guess**.

| # | Piece or collection | Source type | Effort | Feeds |
|---|---|---|---|---|
| 1 | Beethoven sonata movements the book cites: Op. 13 III (Pathetique), Op. 27/2 III (Moonlight), Op. 53 I (Waldstein), Op. 2/1 IV, Op. 2/3 I, Op. 10/1 II | MR: kern, local | 1-2 hours (kern to ABC, then `score-check`, rather than the 48-movement WiR filter) | `sonata-rondo.qmd` 25.4 (replaces the MIDI-structure workaround), `phrases-in-combination.qmd`, library |
| 2 | Haydn Op. 33/2 IV; Mozart K. 279, 283, 284, 309, 310, 457, 576 | MR: kern, local | 1-2 hours | ch. 13 phrases, ch. 25, form examples |
| 3 | Bach Inventions 1, 7, 8 and some WTC I fugues | MR: Mutopia LilyPond / music21 / PDMX | half a day (needs the MIDI route or a LilyPond-to-MusicXML fix) | `counterpoint.qmd` invention / fugue expositions |
| 4 | Cutler cross-match: for each of the 803 works, find a local score (OpenScore Lieder, kern, Mutopia, music21) | MR | a script plus review, half a day | print-books, Tune Directory |
| 5 | **Band-instrument etudes**, 5-10 per instrument: Clarke *Technical Studies* (trumpet, 1912), Arban (1864), Klose clarinet method (1843), Kohler flute etudes, Kreutzer violin etudes (1796), Bordogni / Rochut vocalises (trombone), Rose / Klose for sax / clarinet | OMR, single staff (easiest case); check each edition is pre-1931 | 20-40 min per etude incl. verification **(guess)** | the instrument lessons, "Patterns by Ear" pages, a play-along list |
| 6 | Kuhlau Sonatina Op. 55/1 and 59 set, Clementi Op. 36 sonatinas | OMR, clean two-staff piano | 30-60 min per movement | ch. 13 / 25 (clean small sonata and rondo forms, students play them) |
| 7 | Schumann *Album for the Young* Op. 68 (selected), Burgmuller Op. 100 | OMR, short piano pieces | 20-40 min each | phrase and period examples (asymmetry, elision), accompaniment textures |
| 8 | Bach French Suite 1 Sarabande BWV 812; English Suites 3 and 4 (Gavotte I, Sarabande); more dances | OMR (Bach-Gesellschaft plates, two staves) | 45-90 min each | `binary-ternary.qmd` (balanced / simple binary) |
| 9 | Haydn piano sonatas Hob. XVI:35 I and III, 49 I, 50 I, 9 III | OMR, piano | 1-2 hours per movement | ch. 25, phrase groups |
| 10 | Chopin Op. 34/1 waltz, Op. 28/20 prelude, Op. 9/2 (check PDMX and Mutopia first) | MR if found, else OMR | 30-60 min | ch. 15 contrast, ch. 13 |
| 11 | "Find the theme": one IMSLP work-page link per Classical Theme, plus 5-10 worked answer keys (movement bars known from the MTD `%%bar` numbers) | no OMR; metadata only | 1 day for links; keys by hand | the lesson in `recordings-to-scores-plan.md` |
| 12 | Orchestral excerpts: Beethoven 5 I opening, Mozart 40 I, Haydn 94 II, Haydn 104 IV (8-32 bars each) | OMR on Breitkopf full-score pages, hand-corrected, or typed | 2-4 hours per excerpt **(guess)** | ch. 13 / 25 / 15 where a symphonic example is cited |
| 13 | Schoenberg Op. 25 row and Berg row check | scan only, by eye | 15 min | `serialism.qmd` (replaces "typed from memory") |
| 14 | Kuhlau / Clementi / Haydn items not found elsewhere | as above | | |

Not recommended: whole symphony or opera full scores by OMR; anything post-1930; handwritten scans; fugues that Mutopia / music21 already have.

### Pipeline sketch (reuses what exists)
1. `scripts/imslp/manifest.json`: id, IMSLP work URL, file URL, edition, plate, year, PD checks (composer death year, edition year), licence, who downloaded.
2. Teacher saves the PDF into `~/Projects/corpora/imslp-pilot/<id>/`; `magick -density 300` (or `gs`) to PNG per page.
3. Run **Audiveris** (`java -cp "<app>/app/*" Audiveris -batch -transcribe -export -output out in.png`, bundled JRE) and **homr** (in a Python 3.14
   venv) on each page; keep both MusicXML files.
4. `python3 -I scripts/imslp/diff-omr.py a.mxl b.mxl` (the pilot's `cmp.py` made bar-aware): list bars where the engines disagree; also compare
   with any other corpus copy.
5. Fix in MuseScore 4 (installed) on the disagreeing bars against the scan; save `.mxl`.
6. `XML2ABC=<path> node scripts/full-score/convert.mjs piece.mxl piece.abc` (runs xml2abc, tidy, `xml-notes.py`, `score-check.cjs`). Note: on this
   machine the default xml2abc path `~/Projects/pages-dev/tunes/xml2abc.py` does not exist; a copy is in `~/Projects/corpora/_tools/xml2abc_177/`.
7. Add bars-per-time-signature and pitch-range checks (score-check already does ranges) and the hearing / overlay check from 2.4.
8. Publish into `apps/shared/data/full-scores/` (or the Tune Library for single lines) with `%%` credit lines naming the edition and the IMSLP page.

## 5. Pilot (done)

Goal: one machine-readable file and one clean engraved PDF through local OMR, MusicXML, `convert.mjs`, `score-check`.

- **IMSLP download: not done.** Scripted file downloads are barred by robots.txt and sit behind a captcha, and there is no sanctioned bulk route
  (section 3), so I did not fetch anything from IMSLP. The pilot used a stand-in with ground truth: Mutopia's LilyPond source of Bach Invention 1
  (`BWV772`, in the local Mutopia copy), engraved to a 300 dpi PNG with the installed LilyPond, plus a "scan" copy (grey, blur, noise, 0.6 degree
  rotation, JPEG q70). **This is a clean modern engraving, not a 19th-century scan, so the numbers are optimistic**, and the degraded copy was
  mild (Audiveris gave the same notes for both).
- **Machine-readable half**: not exercised with IMSLP. Instead the kern route was confirmed to exist locally (section 1); I did not convert it.
- **Tools**: Audiveris 5.11.0 (arm64 dmg extracted with `7z`, run with its bundled JRE; no system Java), homr 0.7.0 (Python 3.14.7 venv; 3.15 failed
  at scikit-image). Files: `~/Projects/corpora/imslp-pilot/{audiveris,inv1,out-clean,out-scan,homr}/`; helper `cmp.py` in
  `/private/tmp/claude-503/-Users-sean-coleman-Projects-everything-music-site/2a0a25aa-f5a2-428a-8d7b-f099f273851d/scratchpad/imslp/`.
- **Results** (page 1, 315 ground-truth notes from the LilyPond MIDI, matched by onset, pitch and length with music21):

| Run | Notes matched exactly | What broke |
|---|---|---|
| Audiveris, clean PNG | 290 / 315 (92%) | A mid-line clef change was missed: about two bars of right-hand notes read as bass clef (G4 read as B2, 20 semitones low) and some ornament / grace-note timing (trills read as 0.12-beat notes). Also produced 3 voices for a 2-voice piece |
| Audiveris, degraded JPEG | 290 / 315 | same |
| homr, clean PNG | 261 / 333 by onset, but all 315 pitches correct | An extra bar of rest at the start shifted every later onset by 4 beats (pitches right, timing offset) |
| homr, degraded JPEG | **313 / 315 (99.4%)** | essentially trills only |

- **Through the site's pipeline**: `convert.mjs` ran on all three MusicXML files (after `XML2ABC=` was set) and `score-check.cjs` reported **"no problems
  found"** for each, including the Audiveris file with a missed clef change and the homr file with a shifted bar. Confirms the checker cannot catch OMR
  errors (section 2.4).
- **Other things that broke**: homr prints harmless "E5RT ... unbounded dimension" messages (CoreML fallback) and a very long debug dump to stdout;
  the first homr run loads models (55 s) and later runs take about 7 s a page. `convert.mjs` also left `.abc` files beside its input, here in the untrusted pilot folder.
- **What the pilot does not tell us**: anything about real 19th-century scans, orchestral pages, multi-page pieces, repeats / endings over page turns, or how long
  hand-correction takes. One piece, one page. Next step if the teacher agrees: download three real IMSLP PDFs by hand (a Kuhlau sonatina first movement,
  a Clarke study, a Bach-Gesellschaft dance) and repeat with both engines.

## Sources
- IMSLP robots: https://imslp.org/robots.txt · API: https://imslp.org/wiki/IMSLP:API · Copyright Made Simple: https://imslp.org/wiki/IMSLP:Copyright_Made_Simple ·
  File formats: https://imslp.org/wiki/MUS · scripted-download behaviour (third party): https://apify.com/crawlerbros/imslp-scraper · Canada-only server / US blocks (forum): https://forums.imslp.eu/viewtopic.php?p=1993
- Audiveris: https://github.com/Audiveris/audiveris · https://api.github.com/repos/Audiveris/audiveris/releases/latest
- homr: https://github.com/liebharc/homr · https://pypi.org/pypi/homr/json · https://raw.githubusercontent.com/liebharc/homr/main/Benchmark.md
- oemer: https://github.com/BreezeWhite/oemer · https://pypi.org/pypi/oemer/json
- OMR evaluation: https://arxiv.org/pdf/2312.12908 · https://arxiv.org/abs/2506.10488 · https://arxiv.org/pdf/2403.13763 · https://www.ismir2015.uma.es/articles/187_Paper.pdf
