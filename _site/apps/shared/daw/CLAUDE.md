# DAW lessons

- The DAW lessons (`lessons/daw-*.qmd`, eight, in `_quarto.yml` after the Recording lessons; include `lessons/_daw-kit.qmd`):
  a small DAW, `apps/shared/daw/mini-daw.js` (`MiniDaw`; `<div class="mdaw" data-id data-preset data-show>`, documented at its top),
  playing the band's sounds (`BandSounds`) with its parts written by `BandMidi.generate` ("Session players"). Timeline, loop, click,
  step sequencer, piano roll, record from computer keys / MIDI, audio tracks from the mic (DAW 6: bleed, headphones, latency), quantize, clips, mixer, MIDI export, bounce to WAV, undo.
  Each lesson ends with an "In other DAWs" table (BandLab, Ableton Live, Logic Pro); DAW 8 (`daw-real.qmd`, no DAW on it) is a tabbed
  first-session checklist for each, every step linked to its manual page. Checked Oct 2026 against BandLab Help Center, Live 12 manual, Logic 12.3 guide. Test: `node tests/lessons/daw.cdp.js` (after rendering them).
- MIDI in: **Open MIDI** reads any .mid (`MiniDaw.fromMidi`: a track per file track + channel, channel 10 to kit pieces or congas, GM program to the nearest instrument; quarter-note time, so other meters come in as 4/4; first tempo only; at most 64 bars, 12 tracks; what was changed is said in the status). The Backing Track's Export MIDI → **Open in the DAW** leaves the file in localStorage `mdaw:handoff` and opens `lessons/daw-export.html`, where the first DAW with Files takes it (within 10 min; replaces the song, Undo brings it back). Test `node tests/lessons/daw-midi.test.js` (`NEG=1` must fail); the hand-off is in daw.cdp.js (render `tools/backing-track.qmd` too).
