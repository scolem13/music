# Backing Track band tests

Moved here from the build session's scratchpad (2026-10-06). Plain Node scripts, no packages.
Folders keep the names of the worker that wrote them.

## Node tests (run from each folder: `node <file>`)

| Folder | Files | Covers |
|---|---|---|
| `lead/` | `drums.test.js`, `straight.test.js`, `offroot.test.js`, `page.test.js` | drums, straight feel and cymbals, bass root rule, presets and transposition |
| `agent-a/` | `t_harmony.js`, `t_comp.js`, `t_bass.js`, `t_library.js` | chord parser, voicings, comping, bass, every tune in the library |
| `w3/` | `t_new.js` | drop voicings and guitar comping |
| `bt/` | `t_pins.js` | pinned voicings, as-played extraction |
| `agent-e/` | `t.js` | MIDI export and notation ABC |
| `agent-b/` | `zones.test.cjs` | sample zones, swing |
| `vl/` | `t_triadvl.js` | guitar voice-led triads (`triadvl`, `uppervl`) |
| `meter/` | `t_meter.js` | 3/4, 6/8, 9/8 and 12/8 in every band option, notation bar lengths, MIDI time signature |
| `agent-c/`, `sheet/` | `voicings.test.js`, `piano-styles.test.js` | shared voicing library (`sheet/` has the current style lists) |

`lead/music.print.js` prints a chorus of bass, voicings and drum figures as note names.

## Browser tests (headless Chrome, real pages)

1. From the repo root, render the pages to the test site folder (not `_site`), then undo Quarto's `.gitignore` edit (it appends `**/*.quarto_ipynb`; delete that line by hand, since `.gitignore` has other uncommitted lines):
   `quarto render tools/backing-track.qmd --output-dir tests/band/lead/site` (same for `tools/chord-sheet.qmd`, `tools/accomp-styles.qmd`).
2. `cd tests/band/lead && PORT=8500 node serve.js` (serves `/apps` live from the repo, everything else from `lead/site`).
3. In another shell: `node page.cdp.js`, `node practice.cdp.js`, `node opts.cdp.js`, `node roundtrip.cdp.js` in `lead/`; `node page2.cdp.js` in `bt/`; `node meter.cdp.js` in `meter/` (Meter menu, 12/8 notation, voice-led triads on both pages).

`lead/cdp.js` is the Chrome driver. Do not navigate away inside an `eval` (it hangs), and note that a page `alert()` blocks every later call.
`agent-b/run.mjs` renders audio offline and measures loudness (`node run.mjs all`); it needs ffmpeg.

Paths: the scripts load engine files by absolute path under `/Users/sean.coleman/Projects/everything-music-site`.

`agent-c/voicings.test.js` is the older copy of `sheet/voicings.test.js` and fails on the current style list; use `sheet/`.
A server left running from an earlier session keeps serving its old render: check `lsof -iTCP:8500` before starting a new one.
