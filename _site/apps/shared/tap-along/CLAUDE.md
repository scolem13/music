# Tap Along

- Tap Along (`tools/tap-along.qmd`, `apps/shared/tap-along/`): Timestamp Notes cut down for a phone, against a song playing in any
  other app. Its own clock; Mark taps 1 Bar / 2 Chord / 3 Section (the n-th chord tap is the sheet's n-th chord), Play's Sync puts the
  clock on the first tapped bar. Each tap has its button's lag taken off (localStorage `tap-latency-v1`), measured on Tap Latency
  (`tools/tap-latency.qmd`: metronome, four to count in, twelve taps per button). Song file `.tap-along.json`, not Timestamp Notes'.
  Test: `node tests/lessons/tap-along.cdp.js` (after rendering both pages).
