# everything-music-site

- Adding or changing a Backing Track style, bass line, comping rhythm or drum groove: read
  `apps/shared/band/ADDING-STYLES.md` first.
- The band's history, open questions and what nobody has listened to yet: `apps/shared/band/NOTES.org`.
- Tests and headless page drivers: `tests/band/README.md`.
- The tonewheel organ (tonebars, swell pedal, Leslie, and the rules the band's organist follows, with sources):
  `apps/shared/band/ORGAN.md`.
- The tune collection (`apps/tunes/tunes-object.js`): after importing or editing tunes run
  `node scripts/clean-tunes.mjs --write`. It normalises the ABC, bakes `%%id`, and tags tunes that still
  fail a parse/bar-length check `needs-repair`; the Tune Library hides those unless the Tags filter asks for them.
