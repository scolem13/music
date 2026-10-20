# DAW lessons

- The DAW lessons (`lessons/daw-*.qmd`, eight, in `_quarto.yml` after the Recording lessons; include `lessons/_daw-kit.qmd`):
  a small DAW, `apps/shared/daw/mini-daw.js` (`MiniDaw`; `<div class="mdaw" data-id data-preset data-show>`, documented at its top),
  playing the band's sounds (`BandSounds`) with its parts written by `BandMidi.generate` ("Session players"). Timeline, loop, click,
  step sequencer, piano roll, record from computer keys / MIDI, audio tracks from the mic (DAW 6: bleed, headphones, latency), quantize, clips, mixer, MIDI export, bounce to WAV, undo.
  Each lesson ends with an "In other DAWs" table (BandLab, Ableton Live, Logic Pro); DAW 8 (`daw-real.qmd`, no DAW on it) is a tabbed
  first-session checklist for each, every step linked to its manual page. Checked Oct 2026 against BandLab Help Center, Live 12 manual, Logic 12.3 guide. Test: `node tests/lessons/daw.cdp.js` (after rendering them).
