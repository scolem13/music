# everything-music-site

- Adding or changing a Backing Track style, bass line, comping rhythm or drum groove: read
  `apps/shared/band/ADDING-STYLES.md` first.
- The band's history, open questions and what nobody has listened to yet: `apps/shared/band/NOTES.org`.
- Tests and headless page drivers: `tests/band/README.md`.
- The tonewheel organ (tonebars, swell pedal, Leslie, and the rules the band's organist follows, with sources):
  `apps/shared/band/ORGAN.md`.
- The Notation page (`tools/_notation.qmd`, model `apps/shared/notation-doc.js`): chunks, sections, voices, chords, words, takes.
  DWIM there (re-reading a take, kept with the chunk) is documented in `apps/shared/NOTATION-DWIM.md`. It opens the Backing Track
  as a remote window (`bt-load`, `bt-focus`, and `bt-setup` reports back). Tests: `node tests/abc/notation-doc.test.js`,
  `node tests/abc/notation.cdp.js`.
- Non-harmonic tones (passing, neighbour, suspension 4-3, ...) of a melody against its chord symbols:
  `apps/shared/abc-nht.js`, over `abc-events.js`; not on any page yet. Tests: `node tests/abc/nht.test.js`.
- ABC reading for the assessments (`apps/shared/abc-core.js`, and `abc-pitch.js`, `abc-rhythm.js`, `abc-tune.js` over it):
  a page loads `abc-core.js` before any of them. After changing them run `node tests/abc/compare.js` (old vs new on
  every tune and pattern; how to run the browser check is at the top of `tests/abc/pages.cdp.js`).
- The tune collection (`apps/tunes/tunes-object.js`): after importing or editing tunes run
  `node scripts/clean-tunes.mjs --write`. It normalises the ABC, bakes `%%id`, and tags tunes that still
  fail a parse/bar-length check `needs-repair`; the Tune Library hides those unless the Tags filter asks for them.
- The sound-design lessons (`lessons/sound-*.qmd`: harmonic series, waveforms, noise, filter, LFO, subtractive, FM, wavetable,
  distortion, compressor, reverb, chorus, phaser, vocoder) are widgets from `apps/shared/lessons/synth-kit.js` (kinds and
  attributes documented at its top), included via `lessons/_synth-kit.qmd`. Plain Web Audio, nothing shared with the band.
  Tests: `node tests/lessons/sound.cdp.js` (after rendering).
