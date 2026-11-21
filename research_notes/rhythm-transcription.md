# Rhythm-only transcription from the Real/Fake Books into ABC

Transcribe everything except the pitches; Sean adds pitches later (e.g. in the site's ABC editor).
Reference drafts: `/Users/sean.coleman/Downloads/realpop2-rhythm/` (e.g. `103-easy.abc`).

## File
- One tune per file, named `<pdf page>-<title-slug>.abc` (e.g. `103-easy.abc`).

## Headers
- `X:1`, `T:` title, `C:` composer, `M:` meter, `L:1/8`, `K:` the real key as written. No `Q:`.
- Comment lines after `C:`:
  - `%source <Book> p<printed page> (pdf <pdf page>)`
  - `%style (<tempo/style marking as printed>)`
  - `%note Rhythms, chords and lyrics only. Pitches NOT transcribed: every note is written as B.`

## Body
- Every note is `B`; keep the real durations, rests, ties, tuplets, repeats and endings.
- Chord symbols in quotes on the beat where they fall.
- Lyrics on `w:` lines (ABC rules: `-` between syllables, `_` to hold, `*` to skip).
- Section comments: `%intro`, `%verse`, `%chorus`, etc.
- Anything uncertain: an `%unsure [bars N-M] <what and why>` line just after it (e.g. a guessed grouping, a second verse not given).
  The tag says which bars, so the review page and Notation can shade them: `[bar 9]`, `[bars 12-13]`, `[bars 3, 7-8]`; `[form]` for a
  note about the form, `[general]` for one about the whole tune. Bar numbers are the ones
  `python3 -I ~/Projects/everything-music-site/scripts/realbooks/abcbars.py FILE.abc` prints (bars in the order written, repeats
  not unrolled; a short first bar is the pickup, bar 0). It also says whether each tag points at real bars.

## Check
- `python3 -I /Users/sean.coleman/Downloads/realpop2-rhythm/_tools/check.py file.abc`
  must report 0 bars that aren't a full measure (pickup and first bar excluded);
  otherwise fix the rhythm or mark the bar `%unsure`. It also prints the ABC beamed by beat, 4 bars a line (`abcfmt.py`).

## Source preference
- Sher Music books are the most reliable; use a Sher version when a tune is in several books.

## Form (searchable)
- When the book prints section letters (boxed A, B, C...), put the form in the header as standard ABC `P:`, the order the sections are played, e.g. `P:AABA` (after `C:`). If the book states the form in text (e.g. "AABA form"), use that.
- In the body, start each section with `P:A`, `P:B`, ... on its own line (instead of, or as well as, `%verse` comments). Keep `%intro`, `%verse`, `%coda` comments for unlettered parts.
- Also add `%form <form> <bars per section>`, e.g. `%form AABA 8+8+8+8`, and mark it `%unsure` if inferred rather than printed.

## Chords
- Normalize spelling: `maj7` (for MA7, △), `m7` (for mi7, -7), `m7b5` (for ø, 0, mi7(b5)), `o7` (diminished, °), `7b9` (no parentheses). Alternate chords printed in parentheses go in quotes with parentheses: `"(Eb9)"`.
- Where a chord changes over a held note, split the note with a tie so the chord sits on its beat.

## What to transcribe
- Tunes only. Skip teaching pages ("Supplemental Material": voicings, useful scales, sample bass lines, guitar voicings), photos, "For your use" blank staves, and text pages.
- Melody staff only: skip bass-line staves, synth/cue lines and piano parts. Rhythm slashes become rests with the chord on them, marked %unsure.
- When a page holds two tunes, transcribe only the one named in the job.

## Model and effort (benchmark 2026-11-20)
- Use Opus at low effort, one agent per batch of tunes. Benchmarked on 4 Sher tunes against Sonnet low/medium/high and Opus medium: Opus low used the fewest tokens (~20k per tune) with the most complete chords and lyrics; Opus medium was no better; Sonnet dropped chords (low/medium) or used twice the tokens (high).

## Book order (easiest first)
Real Easy Book (tune page only) > Colorado Cookbook > New Real Book 2 > Just Standards > Standards Real Book > New Real Book 3 > New Real Book 1 (some multi-staff) > Latin Real Book (bass staves, cues) > All Jazz Real Book (150 dpi).
