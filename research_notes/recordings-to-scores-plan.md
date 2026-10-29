# Recordings matched to scores: plans (noted 2026-10-29)

What is built: `apps/shared/rec-sync.js` (RecSync) plays a score by its recording, lighting the current bar, from a
Timestamp Notes timing map (bars only, no note timing). Analysed scores and the Tune Library use it; Works recordings can be
`draft: true` (teacher's browser only, `?teacher=1`). See CLAUDE.md "A score played by its recording".

## 1. Moonlight Sonata (waiting on the teacher)

- Recording uploaded: R2 `works/beethoven-moonlight/schoenhals.mp3` (Joel Schoenhals), Works entry `beethoven-moonlight-sonata-1`,
  `draft: true`, plays 0:30–7:34, ⏱ button opens Timestamp Notes with the marks 0:00 / 0:30 / 7:34.
- Next: the teacher marks sections and bars in Timestamp Notes and sends the song file. Then: save it as
  `apps/shared/works/timings/beethoven-moonlight-schoenhals.json`, add `timing` (and `bar1` if the first tapped bar is not
  measure 1) to the Works recording; keep `draft` until told otherwise.
- Then: an interactive quiz built on those timestamps (sections, bars; not designed yet).

## 2. Classical Themes: theme-snippet recordings (the teacher will add them)

- A separate set of recordings, each just the theme. To come from the teacher; not yet on disk.
- When they arrive: catalogue them like the MLT recordings (a script, R2 under `themes/`), link each to its theme id (EDM number),
  and play them on the theme cards. A snippet is short, so it can be timed in Timestamp Notes (or the bars spread from the
  theme's `Q:` tempo) and played through RecSync like the other scores.

## 3. Classical Themes: the original recordings, and a "find the theme" lesson

- The original recordings are already listed: MTD's metadata gives each theme's MusicBrainz release (MusicBrainzID, a box set
  such as Bach's complete edition) and its CD / track (NameCD, NameTrack); `scripts/mtd-movements.py` already reads these for the
  movement titles (cache in $TMPDIR/mtd-musicbrainz; MTD itself was in ~/Downloads/MTD_1.0.0, not there now). MTD's note
  alignment is to those recordings (it is where `Q:` comes from, `scripts/mtd-tempo.py`), so the theme's start time in that
  recording may be recoverable from MTD's alignment data too.
- Task: find as many of those particular recordings (performer + release) on YouTube as possible, store them as Works
  recordings (`yt` + `start` / `end` at the theme) on each theme's work.
- Where the theme starts: `scripts/theme-sources/pdmx-matches.json` has the bar of the complete movement for 813 of the 2,062
  themes; 569 of them start somewhere other than bar 1 (the interesting ones for the lesson).
- Lesson idea (students): pick a theme that does not start at bar 1; find a good edition of the full movement on IMSLP (judging
  an edition: publisher, editor, urtext or not, scan quality, the right movement and version); find the right recording; locate
  the theme in the audio (time) and in the score (bar), and check both against the theme card. Could reuse Timestamp Notes for
  the timing and the theme card's `%%bar` numbers as the answer key. Sources for "judging an IMSLP edition" to be found and cited.

## 4. Hutchinson listening examples: times known, bars missing

- The `theory/` pages (Hutchinson, *Music Theory for the 21st-Century Classroom*, one page per chapter) embed about 244 YouTube
  examples with start / end times (`youtube-nocookie.com/embed/<id>?start=..&end=..`), in 14 pages (accompaniment-textures,
  progressions, melodic-analysis, non-chord-tones, augmented-sixths, mode-mixture, roman-numerals, neapolitan, figured-bass, …).
- Missing: the measure numbers each excerpt covers (and the piece's score). Adding bars would let each example show its score
  excerpt (IMSLP or the analysed-score engine) and, with a timing map, play the excerpt bar-lit through RecSync (a YouTube player
  instead of an <audio>: RecSync's player would need a YouTube variant, as player.js already has for Timestamp Notes).
