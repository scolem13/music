# GuitarIn: guitar chords through a DI, read like MIDI (plan, not built)

Goal: a student plays a chord on guitar (DI box or audio interface, not a mic) and a drill reads it the way it reads a
MIDI keyboard (`Drills` `midiMatch(q, notes)`).

## Findings (research and prototype, 2026-10-20)

- **Feasible for checking an expected chord and for the bass note.** Not reliable enough to name any chord with no expectation.
- Prototype: `proto.js` here (node, no dependencies). It synthesises plucked-string strums (inharmonicity, decay per partial,
  strum spread, pick position) over 30 common shapes and runs an iterative multi-f0 estimator on a 16384-point FFT.
  **Numbers are from synthetic sound, not a real guitar:**
  - in tune: exact set of pitch classes 81%, bass 98%, both 81%; about 0.8 ms per analysis;
  - 30 cents flat: 57%, so tuning first matters;
  - plain chroma (no multi-f0): 55%;
  - choosing the best of the 30 shapes (as when checking against an expected chord): 92%.
  - Misses are mostly an extra or missing upper note in seventh chords.
- Ready-made options:
  - Spotify Basic Pitch: Apache-2.0, made for offline transcription; model size and real-time behaviour **not verified**.
  - essentia.js: AGPL. Avoid for this site.
- MIDI-level certainty needs a hexaphonic MIDI pickup (Fishman TriplePlay, about $200–230; Roland GK).
  These would use the existing Web MIDI path unchanged. **Not verified** that browsers list them as Web MIDI inputs.

## Recommended design

- `apps/shared/guitar-in.js`, `window.GuitarIn`:
  - `GuitarIn.start({ tuning, refCents })`, `stop()`;
  - `subscribe(fn)` with one event per strum: `{ notes, pcs, bass, confidence }` (shaped like the drills' buffered MIDI chord);
  - `expect({ pcs, bass })`: verification mode, scoring the strum against the answer rather than transcribing blind.
- Pipeline:
  1. Onset detection.
  2. A window 80–100 ms after the onset (past the pick attack).
  3. Multi-f0 estimation with a separate bass estimator.
- Mic and level: `AudioCheck.ensure()` for the input, and `AudioTap.register` for the context, as CLAUDE.md requires.
- Setup:
  1. A tune-up step through `PitchDetect` (sets `refCents`).
  2. A "strum E major" calibration.
- Drills: `midiMatch` takes the GuitarIn notes; `midiNeed` is ignored for a strum (one event).
- Tell students: "usually right (about 8 in 10)". Ask for a clean DI, muted unused strings, and a chord left ringing; re-strum when it's unsure.
- Before any of that: record real DI strums (a few players, guitars, tunings) and rerun the numbers on them.
