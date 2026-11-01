# How to — the things I keep asking

Words & Chords (`songs/index.qmd`), moved here from the carols site. Run commands from the site folder.

## Rebuild

Run from the site folder. Every song is rebuilt each time (a few seconds):

    python3 scripts/songs/build.py
    node scripts/check-pages.mjs --bump apps/shared/data/songs.js
    quarto render songs/index.qmd

Bump `apps/shared/works/works-data.js` too when a song was added, renamed or dropped (the Tune Directory's list), and
`apps/shared/songs/song-page.js` or `songs.css` after changing them. Read the build's list: every section should say
`band: N bars`. `NO BARS` means the band cannot play that section. Test: `node tests/songs/songs.cdp.js`.

A programme (concert) is an entry in `scripts/songs/src/programmes.json`: its songs in order, each `slug` or
`slug@Version` (students then hear and see that version of the changes; the teacher view can still choose any).

## Where things are edited

- Chords and words: `scripts/songs/src/<song>.cho`. Never `apps/shared/data/songs.js` — it is built.
- A chord goes in brackets where it is played: `I used to [Db]rule the [Eb]world`.
- A line of chords only is one bar per chord: `[Db][Fm][Db][Fm]`; `[x2]` at the end repeats it.
- What the band plays is the `{start_of_grid}` block under a section heading:
  `| D | % | Bm . A . | 2/4 A | 4/4 Em A |`. `.` holds the chord, `%` repeats the
  bar, a meter holds until the next one. A section with no grid borrows the
  last one with the same name (Verse 2 plays Verse 1's bars).
- Full format: the top of `scripts/songs/chordpro.py`.

## Repeats and jumps

- `{comment: D.C. al Coda}` — back to the top, once.
- `{comment: D.S. al Coda}` — back to the section under `{comment: Segno}`.
- `{comment: Fine}` — where the second pass ends.
- A section called `Interlude` is skipped on the second pass.

## Twelve Days

Source: `scripts/songs/src/twelve-days-of-christmas-seed.cho` (the page around it: `twelve-days-of-christmas.template.md`). The verse is written once,
as it goes from day 5. A section `{comment: Until day N}` below it holds the
gifts from day N down as they go on the days up to N (words, chords and a grid
row each). Days 2-4 and day 1 are done that way.

## Band settings from the Backing Track page

1. On the Backing Track page: save the setup, then "Download all".
2. Copy `~/Downloads/backing-track-setups.json` to `scripts/songs/src/backing-track-setups.json`.
3. `python3 scripts/songs/build.py`.

- A song takes the setup with the same name as its title.
- `scripts/songs/src/<song>.band.json` beats the big file. Winter Wonderland and Santa
  Claus have one; delete it for the downloaded setup to apply.
- End of Beginning has a setting added by hand in the big file: the guitar's
  "muted eighths, open in the chorus" strum in the choruses only (its
  `sections` list). A fresh download wipes it unless the song was opened in
  the Backing Track window from its page (`w`) before saving there.

## Practising with the Backing Track window (`w`)

Set these in that window; they survive a reload of the song page.

- Loop some bars: tick "Loop bars" and give the bars (or `L`, then click the
  last bar). Choruses goes to Repeat by itself while a loop or a tempo change
  is on, so the song no longer ends after one pass.
- Faster each time: "Tempo change", tick "Each repeat", bpm to add (`8`, or
  `8 then -3`). Without a loop it is the whole song that repeats.
- "Between repeats": nothing, a metronome click, a vamp on the first chord,
  the last bars of the loop, or "These bars of the form" (`1-4`). The tempo
  change comes first, so a click counts you in at the new tempo.
- "Intro" has "These bars of the form" too, for a tune whose intro is not its
  last bars.

## On a song page

What is downloaded to make the sound: `~/Projects/carols/AUDIO-DOWNLOADS.md`.


- `p` or the space bar play/stop, `h` hold sections, `d` drum fill, `w` band in the Backing Track
  window (click once in that window so it may make sound), `c` chords, `j`/`k`
  next/previous section.
- The highlight on the sung words (chords hidden): sidebar, Display style,
  "Sung words". Its look is `--sung-now`, `--sung-line`, `--sung-stroke` at the
  top of `apps/shared/songs/songs.css`, and the same three in the fonts block of `apps/shared/songs/song-page.js`.

## Lyrics under a melody (`scripts/songs/lyrics_align.py`)

Enter a section's melody as `{start_of_abc: melody}` ... `{end_of_abc}`, directly before its lyric
lines. Then:

    .venv/bin/python scripts/songs/lyrics_align.py align --write scripts/songs/src/SONG.cho   # draft the w: lines
    .venv/bin/python scripts/songs/lyrics_align.py lint  scripts/songs/src/SONG.cho           # words + bars still agree?
    .venv/bin/python scripts/songs/lyrics_align.py override holy ho-ly                 # fix a split once, for every song

`align` writes `% lyrics: draft` above the lines it makes and will redraft them; delete that marker
once you have corrected them and they are yours. Ties get `*` for their second half, rests get nothing,
a `|` starts the next bar. Add `_` by hand for held notes (or `--slur-melisma` to treat slurred notes as one syllable).
Setup: `python3 -m venv .venv && .venv/bin/pip install -r scripts/songs/requirements.txt`.

## Playing a melody in (the music site's Chord Entry page)

"Enter the melody" in a song's Band panel opens Chord Entry with the song's chords, sections, words and any melody it has.
Record a section at a time, put the words under the notes there, then **Download .cho**: it is this song's own file with a
`{start_of_abc: melody}` block written into each section you worked on. Put it back in `scripts/songs/src/` and run `python3 scripts/songs/build.py`.
Sections left as they came are not rewritten. `scripts/songs/lyrics_align.py lint` checks the result.

The page can also open a song without the lyrics site: **Load a ChordPro file…** (or drop the `.cho` on the page) reads the file
there. It reads each section's grid, a tune with chord symbols, the `band` block cut at its `P:` lines, and gives a section with
neither the bars of the one before of its kind. The band there plays a grid's marks (`half`, `ballad`, `normal`, `fill`, `stop`, `rit`,
`plain`) as this site's band does. It does not read other versions, D.C./D.S., or a `band` block with no `P:` lines; the file itself
keeps all of those. **The song file (ChordPro)** at the foot of the page shows the
file as it would be saved; change it there and press "Use this text" to have the page read it again.
