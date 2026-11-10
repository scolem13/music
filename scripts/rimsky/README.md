# Rimsky-Korsakov, Principles of Orchestration: examples in the full-score player

Source: Project Gutenberg #33900 (public domain in the USA), kept in `~/Projects/corpora/gutenberg-rimsky/` (its README says how it was
fetched; untrusted data, only read by these scripts, run with `python3 -I`).

1. `python3 -I scripts/rimsky/index.py` -> `<corpus>/index.json`: per example number, caption (work; the book gives a score page, never bars),
   the chapter / section / subsection Vol. I cites it under (the book's own links), which files exist.
2. `node scripts/rimsky/convert-all.mjs [--jobs 6] [--only 001,002] [--no-repair]` -> ABC in `<corpus>/abc/`, `scripts/rimsky/convert-report.json`.
   Each MusicXML first goes through `repair.py` (a part's bar shorter than the longest part's bar gets an invisible rest at its end, every
   voice; the Finale files have parts missing a beat, which put the staves out of line), then `scripts/full-score/convert.mjs` + `score-check.cjs`
   on the repaired file. Passes: the checker's ok, or only notices left (tempo, hidden, grace, tacet, tie, repeated staff names), or a few stray
   tie notes (`fewNotes`, as in PDMX). `convert.mjs` itself is NOT changed for these, so no other score's output can differ.
3. `node scripts/rimsky/build.mjs` -> `apps/shared/data/full-scores/rimsky-NNN.abc` + `index.json` rows (other rows kept), and
   `research_notes/rimsky-conversion.org` (what failed and why). Bump `V` in `theory/analysed-scores/full-scores.qmd` after a rebuild.
   The page builds a short "Cited in Vol. I ..." note from a row's `cite` (no notes file per example).
4. Test: `node tests/rimsky/rimsky.test.js` (`NEG=1` must fail).

Still failing (see the org file): tuplets abcjs cannot read (ratios like 12:8, 15:16, 1:4), parts with their own time signature (overfull),
horn notes below the horn's range (old bass-clef horn notation), a few cadenzas and divisi with voice crossings.
