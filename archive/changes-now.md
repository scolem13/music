# Changes in progress (2026-10-14): swing as one shared setting

Another agent is working on this now. Read this before editing the files listed below.

## Where the work is
- **Worktree:** `/Users/sean.coleman/Projects/everything-music-site-swing`, branch `swing-model`.
- **Baseline commit `14974c1`** on that branch is a copy of the uncommitted work that was in this main folder at about the start
  of the session (player.js, audio.js, tests, tools/*.qmd and so on). Main itself has **not** been touched or committed.
- Edits made later in main, to files the swing work also changes, will have to be merged by hand. Note them here.

## What is changing
Swing becomes one setting that every part of the site reads, instead of four separate ones:
1. Each style in `catalog.js` gets a `swing` setting: `{ div: 8|16, amount }` or `{ div, curve: "jazz" }`, or `0.5` for straight.
   `feel: swing|straight|any` stays, derived from it.
2. `BandPlayer.swingAt(style, bpm, override)` in `player.js` replaces the direct `swingFor` call in `Session.pump`. `warp` learns sixteenths.
   `player.setSwing(x)` sets an override from the listener (null = the style's own).
3. A Swing slot in the PlayBar (Auto / 50–75%). `LessonScore` (`score.js`, `blues-kit.js:291`) follows the band's swing
   instead of abcjs's fixed 66.
4. Written grooves (`drums.js` / `congas.js` `writtenSwing`) use the style's swing when they have none of their own.
5. Then a "swing amount" lesson, and `lessons/reading-swing.qmd` rebuilt on the band player.

## Files to avoid editing in main without coordinating
`apps/shared/band/player.js`, `catalog.js`, `drums.js`, `congas.js`, `apps/shared/lessons/score.js`, `blues-kit.js`,
`apps/shared/playbar.js`, `apps/shared/band/ADDING-STYLES.md`, `NOTES.org` (swing entries), `lessons/reading-swing.qmd`.

## Safety net
- `tests/band/swing/golden.js` (in the worktree) records the time of every note for every style at 80/140/220/300 bpm in 4/4
  and 12/8. **Rule: styles that don't ask for new swing must play exactly as before** (`node golden.js` → "GOLDEN OK").
- In the worktree, the test files' absolute paths were rewritten to point to `...-swing` so they test the worktree's code.
  **That rewrite is not to be committed or merged.** Revert it with `git checkout -- tests` (keeping `tests/band/swing/`) before merging.

## Also in progress in main (another session): one shared ABC parser
Work happens in main, not a worktree. It does **not** touch any file in the swing list above.
- New: `apps/shared/abc-core.js`, `tests/abc/` (frozen copies of the old parsers + a test that compares them).
- Changed to thin wrappers over the core, with exactly the same output: `apps/assessment/abc-pitch.js`,
  `apps/rhythm-assessment/abc-rhythm.js`, `apps/tune-assessment/abc-tune.js`.
- A `<script src="/apps/shared/abc-core.js">` line goes in before each of those three in the `.qmd` pages that load them
  (`practice/_assessment-embed`, `_rhythm-embed`, `_lsa-*-embed`, `_tune-embed`, `_reading-benchmarks-embed`,
  `tools/_backing-track.qmd`, `tools/_chord-entry.qmd`, `lessons/_blues-kit.qmd`, `blues-changes`, `four-chord-loops`, `pop-changes`). If the swing work edits `tools/_backing-track.qmd`, that one line
  will need merging.
- Status: done, not committed. `node tests/abc/compare.js` → ABC SAME; `tests/abc/pages.cdp.js` → PAGES SAME (13 pages); band tune tests pass
  (`tests/band/tune/t_score.js` and `t_oracle.js` now load abc-core.js first).

## Status
- [x] Worktree, baseline commit, test paths pointed at the worktree
- [x] Golden snapshot recorded (192 cases)
- [x] Step 1: swingAt, style settings, warp at 16ths, setSwing (+ tests). Commits `0f10c91`, then the tests README.
      GOLDEN OK, SWING OK, every Node test in tests/band passes except `pat/t_tunes.js:50` (12 !== 10), which failed before too.
      Browser (CDP) tests not run yet.
- [ ] Steps 2–5

## Paused (2026-10-14)
Resumption notes are in `2026-10-14-in-progress.md`, section "Swing as one shared setting". First job on return: main has changed
`drums.js`, `blues-kit.js`, `_blues-kit.qmd`, `NOTES.org`, `tests/band/README.md` since the baseline, and added `abc-core.js`;
bring those into the worktree before step 2.

## Also done in main (2026-10-14, evening): stride and boogie-woogie styles
Edited in main, to files on the swing list: `catalog.js` (bass `boogie`, comp `stride` and `boogie`, styles `stride` and `boogie`, FITS,
PLAIN), `ADDING-STYLES.md` (new step 7: the pages a style needs), `NOTES.org` (a new entry at the end, not a swing one). Also `bass.js`
(LINES.boogie), `comp.js` (GRID.stride with a left hand, GRID.boogie), `presets.js` (two sections at the end of the jazz tour),
`tests/band/pat/t_patterns.js`. When merging: both new styles are swung (`feel:"swing"`) and need a `swing` setting in the new model;
their eighths are the swing model's to place (the boogie bass is all off-beat eighths, so it will show any change).
- (2026-10-15) Also in main: catalog.js bass boogieOct, yancey; comp strideTenths (bass.js LINES, comp.js GRID).
- (2026-10-15) Also in main: drums.js GROOVES.jump; catalog.js drums jump, styles ragtime and jump; presets.js two more tour sections.
