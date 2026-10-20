# ABC reading and analysis

- ABC reading for the assessments (`apps/shared/abc-core.js`, and `abc-pitch.js`, `abc-rhythm.js`, `abc-tune.js` over it):
  a page loads `abc-core.js` before any of them. After changing them run `node tests/abc/compare.js` (old vs new on
  every tune and pattern; how to run the browser check is at the top of `tests/abc/pages.cdp.js`).
- Non-harmonic tones (passing, neighbour, suspension 4-3, ...) of a melody against its chord symbols:
  `apps/shared/abc-nht.js`, over `abc-events.js`; not on any page yet. Tests: `node tests/abc/nht.test.js`.
- The tune collection (`apps/tunes/tunes-object.js`): after importing or editing tunes run
  `node scripts/clean-tunes.mjs --write`. It normalises the ABC, bakes `%%id`, and tags tunes that still
  fail a parse/bar-length check `needs-repair`; the Tune Library hides those unless the Tags filter asks for them.
