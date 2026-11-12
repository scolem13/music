# OMR comparison on real/fake-book pages

Run 2026-11-12 on macOS (Apple Silicon). Inputs, per-tool outputs (MusicXML + ABC), and scripts are in `~/Projects/corpora/omr-test/` (`pages/`, `out/audiveris/`, `out/homr/`, `out/abc/`).

## Method
- 12 single-tune pages, 3 per tier (tier per `apps/realbooks/books.json`), rendered with `pdftoppm -r 300 -gray -png`. Exceptions: All Jazz Real Book rendered at 150 dpi (its native scan resolution; the page is 17 in wide). Jazz Fake Book p.70 holds two tunes, so it was cropped to "Born To Be Blue" (bottom ~55% of page).
- Tools: Audiveris 5.11.0 (release DMG, bundled JRE, `-batch -export`), homr 0.7.1 (pip, Python 3.12 venv), oemer 0.1.5 (pip). MusicXML converted to ABC with xml2abc 1.77 (wim.vree.org).
- Scoring is mine, by eye, page image vs. output. "Score" = share of bars with both pitches and rhythm right, over the bars I actually compared (8-32 per page, always at least 4 carefully; the "checked" column says how many). Where I could not compare the whole page I did not extrapolate beyond the rough figure shown. Scores are +/- ~10 points. Chord symbols are scored separately: none of the tools produced any (0 `<harmony>` elements in any output).

## Pages
| Tier | Page | Tune |
|---|---|---|
| 1 | Django_Fake_Book p.60 | Django's Tiger |
| 1 | The_New_Bob_Book p.230 | Honeysuckle Rose |
| 1 | TV_Guide_Fake_Book p.60 | His Eyes, Her Eyes |
| 2 | Real_Book_All_New_Vol3 p.122 | I Didn't Know What Time It Was |
| 2 | New_Real_Book_Volume2 p.121 | Honeysuckle Rose (lyrics) |
| 2 | The_Colorado_Cookbook p.97 | I Love You |
| 3 | Jazz_Fake_Book p.70 (cropped) | Born To Be Blue |
| 3 | All_Jazz_Real_Book p.45 | Azule Serape (3-staff arrangement, not a lead sheet) |
| 3 | Thelonious_Monk_Fake_Book p.25 | 52nd Street Theme (106 dpi scan) |
| 4 | Real_Book1_5thEdition p.170 | Footprints (melody + bass staves) |
| 4 | Real_Book_Bb2 p.60 | Can't We Be Friends |
| 4 | The_Book p.60 | All of Me |

## Results (bars right, pitch + rhythm)
| Page | Audiveris | homr | oemer |
|---|---|---|---|
| T1 Django | 0% | ~25% (8/32; see clef note) | failed |
| T1 Bob (Honeysuckle) | ~5% (pitches ok, all durations wrong) | ~90% (29/32) | failed |
| T1 TV Guide | ~35% (3/8 checked) | ~85% (14/16 checked) | failed |
| T2 Real Book III | ~80% (stray dynamics, one ghost tuplet, lost a tie; volta handled) | ~90% (volta not recognised, otherwise clean) | failed |
| T2 New Real Book 2 | ~50% (keeps treble clef on clef-less systems; loses 4 rest bars) | ~30% (clef-less systems read as bass/alto) | failed |
| T2 Colorado | ~5% | ~80% (pickup bar wrong) | failed |
| T3 Jazz Fake Book (crop) | ~55% (12 checked) | ~70% (12 checked) | failed |
| T3 All Jazz | ~35% | ~35% (bass-staff bars fine; staves merged into one "piano" part) | failed |
| T3 Monk | ~15% | ~45% (16 checked) | failed |
| T4 Real Book 1 (Footprints) | 0% | 0% (all rests) | failed |
| T4 Real Book Bb2 | ~5% | ~20% (first two bars right, key wrong) | failed |
| T4 The Book | 0% | ~10% | failed |

Per-tier average: homr T1 ~67, T2 ~67, T3 ~50, T4 ~10. Audiveris T1 ~13, T2 ~45, T3 ~35, T4 ~2.

Other fields (all pages): chord symbols 0/12 for every tool. Key signature: homr right on most T1/T2 pages, wrong on Bb2; Audiveris emits `K:none` on about half. Meter: homr writes `M:2/2` for 4/4 on several pages (durations are still in 4/4 units, so only the header is wrong); Audiveris often `M:none`. Lyrics: not captured by either. Repeats/voltas: Audiveris handles them better; homr flattens voltas.

## Runtime (this machine)
- Audiveris: 12-30 s/page (first page 26 s), CPU only, bundled JRE, nothing else to install.
- homr: 34-68 s/page after the first run (first run also downloads ~100 MB of models; one run took 3.5 min wall for that reason). CPU only.
- oemer: models are ~400 MB and downloaded for ~13 min over this connection; then the first page ran 37 min wall and crashed at the end with `AttributeError: module 'numpy' has no attribute 'int'` (oemer 0.1.5 uses `np.int`, removed in numpy >= 1.24; Python 3.12 requires a newer numpy). Not usable as installed. A one-line `np.int` patch might fix it, but at ~35 min/page it is not worth it. It was not run on the other pages.

## Install notes
- Audiveris is not in Homebrew; used the GitHub release DMG (copy `Audiveris.app` out; it ships its own JRE, no system Java needed). Run `Contents/MacOS/Audiveris -batch -export -output DIR page.png`.
- homr and oemer need Python < 3.13 (default python3 here is 3.15); used `python@3.12` from Homebrew. `xml2abc` is not on PyPI; the script was downloaded from wim.vree.org (`xml2abc.py-177.zip`).
- Not tested (paid): PlayScore 2, SmartScore, PhotoScore (Sibelius).

## Observations
- homr (transformer) is clearly better than Audiveris on engraved/born-digital single-staff lead sheets with a modern or jazz font, and tolerates lyrics and large chord text. Its typical errors: wrong rest/duration in a bar (bars come out overlong, which xml2abc flags), a spurious fermata/dynamic from nearby symbols, missed voltas, `2/2` header.
- homr's biggest failure is clef detection on systems with no clef printed (Django, New Real Book 2, some others): it reads them as tenor/alto/bass, so rhythm is often right but every pitch is wrong. This is repairable by forcing treble clef.
- Audiveris is rule-based and brittle: any unusual font or chord text confuses it (Bob, Colorado, Django about 0-5%), but on a clean Hal Leonard scan (Real Book III) it is competitive and keeps voltas. It loses whole bars rather than guessing.
- Handwritten pages (tier 4): neither is usable. homr gets odd bars right, but the title underline and chord text produce phantom staves. Footprints (two-staff) yields only rests.
- Multi-staff pages (All Jazz, Footprints, Monk original two-staff pages): both treat them badly; these need staff selection first.

## Recommendation
Use homr as the primary engine for tiers 1-2 (and tier 3 where the page is a single-staff lead sheet), with Audiveris as optional second opinion for repeats/voltas. Do not use OMR for tier 4 handwritten books; either skip or hand-correct. Skip oemer. Expect OMR to give a melody skeleton that needs review, not finished ABC: even the best page here had about 10% bad bars.

## What the post-pass needs
1. Chord symbol OCR (nobody outputs them). Detect text above the staff per bar (e.g. crop the band above each staff and run an OCR such as Tesseract/Apple Vision or a vision LLM with a chord-grammar constraint), normalise (mi7, MA7, triangle, -7, slash chords, boxed letters), and align to bars by x-position using homr/Audiveris staff and barline positions.
2. Bar-length repair: check every bar sums to the meter (xml2abc already reports "longer than metre"); fix by re-deriving tied/dotted notes, dropping spurious voice-2 fragments, and padding/trimming rests. Overlong bars were the main homr error.
3. Force clef/key/meter per system: take the clef and key from the first system and apply to clef-less systems; take meter from the first bar (homr's header `2/2` is unreliable); infer meter from the modal bar length.
4. Structure: detect volta brackets and repeat signs separately (homr drops voltas); use Audiveris output or image heuristics.
5. Strip artifacts: stray fermatas/dynamics/tenuto marks from chord and rehearsal-letter text, ghost tuplets, phantom staves from titles.
6. Page pre-processing: crop to a single tune and a single staff system type (Jazz Fake Book two-per-page, multi-staff arrangements); exclude title staff lines on handwritten scans.
7. Confidence: flag tunes with overlong bars, clef changes, or rest-only output for human review.
