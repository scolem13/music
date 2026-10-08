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
| `vl/` | `t_triadvl.js`, `t_hand.js` | guitar voice-led triads (`triadvl`, `uppervl`); hand-based shape choice and two-note chords (`guide2`) |
| `meter/` | `t_meter.js` | 3/4, 6/8, 9/8 and 12/8 in every band option, notation bar lengths, MIDI time signature |
| `meter/` | `t_stop.js` | stop time: one hit, silence on beat 2, bass lead-in |
| `move/` | `t_move.js`, `t_combo.js` | moving voicings, sixth-diminished style, maj7 as 6, Auto, bass variation; combined voicing styles |
| `sheet/` | `fingerings.test.js` | Chord Sheet guitar and piano fingerings, hand split |
| `agent-c/`, `sheet/` | `voicings.test.js`, `piano-styles.test.js` | shared voicing library (`sheet/` has the current style lists) |

`lead/music.print.js` prints a chorus of bass, voicings and drum figures as note names.

## Browser tests (headless Chrome, real pages)

1. From the repo root, render the pages to the test site folder (not `_site`), then undo Quarto's `.gitignore` edit (it appends `**/*.quarto_ipynb`; delete that line by hand, since `.gitignore` has other uncommitted lines):
   `quarto render tools/backing-track.qmd --output-dir tests/band/lead/site` (same for `tools/chord-sheet.qmd`, `tools/accomp-styles.qmd`).
2. `cd tests/band/lead && PORT=8500 node serve.js` (serves `/apps` live from the repo, everything else from `lead/site`).
3. In another shell: `node page.cdp.js`, `node practice.cdp.js`, `node opts.cdp.js`, `node roundtrip.cdp.js` in `lead/`; `node page2.cdp.js` in `bt/`; `node meter.cdp.js` in `meter/` (Meter menu, 12/8 notation, voice-led triads on both pages) and `node super.cdp.js` and `node sections.cdp.js` in `sheet/` (superimposed view, and its sections); `node sheet.cdp.js` in `sheet/` (Chord Sheet options, typed root, hidden extras); `node layout.cdp.js` in `move/` (page layout, kit defaults, guitar hand-off, notation toggle); `node loop.cdp.js` in `move/` (L shortcut, over-the-end loop, fret markings); `node pairs.cdp.js` in `vl/` (two-note styles on the Chord Sheet); `node sounds.cdp.js` (Watermelon Man preset, stop time, electric sounds, kit faders, notation on the as-played hand-off).

`lead/cdp.js` is the Chrome driver. Do not navigate away inside an `eval` (it hangs), and note that a page `alert()` blocks every later call.
`agent-b/run.mjs` renders audio offline and measures loudness (`node run.mjs all`); it needs ffmpeg.

Paths: the scripts load engine files by absolute path under `/Users/sean.coleman/Projects/everything-music-site`.

`agent-c/voicings.test.js` is the older copy of `sheet/voicings.test.js` and fails on the current style list; use `sheet/`.
A server left running from an earlier session keeps serving its old render: check `lsof -iTCP:8500` before starting a new one.

The sample CDN is sometimes unreachable. `node meter/fetch-samples.js` mirrors the samples into `lead/site/sf/` (git-ignored, lost on a clean render folder); when that folder exists `lead/cdp.js` points every page at it.

## pat/ — ported patterns, ticked rhythms, Band section layout
- `node tests/band/pat/t_patterns.js` — set comping patterns and set bass lines in every meter, rhythm sets ("a+b"), catalog/styles consistency.
- `node tests/band/pat/band-ui.cdp.js` (needs the server) — controls in the Play panel, Style menu, rhythm tick list, a looped play-through, `?style=` links, catalog cards.
- After every test render run `rm -rf tests/band/lead/site/_site tests/band/lead/site/apps` (the server reads /apps from the repo; leaving them makes Quarto copy the two sites into each other).
- Both pat/ tests also cover the drum grooves, the style lock (menus list only what fits the Style) and Unlock.
- `pat/band-ui.cdp.js` also covers Save and load (round trip through a reload, import, delete) and `pat/t_patterns.js` the riff-with-walking bass, strums, open chords and extensions.

## Figures from tunes

- `node tests/band/pat/t_tunes.js` — the So What / Killer Joe / Song for My Father lines, the So What answer and fourths voicing, the head-only switch, and the figures on every root and chord kind ("TUNES OK").
- `node tests/band/pat/tunes-ui.cdp.js` — the three built-in setups load from the Changes menu; "Figure from the tune" appears only with a tune's line or rhythm ("TUNES UI OK"). Needs the test server on port 8500.
- `t_tunes.js` also prints "TEXTURES OK": Alberti bass, the 3-2 clave, Bo Diddley and dembow grooves, the tresillo bass and the Reggaeton style.
- `tests/band/pat/accomp.cdp.js` ("ACCOMP OK") and `tests/band/sheet/hear.cdp.js` ("HEAR OK"): the band audio on the Accompaniment Styles page and the Chord Sheet. Run from `tests/band/lead` with the server on 8500.
- `node tests/band/pat/t_timefeel.js` ("TIME FEEL OK") and `tests/band/pat/timefeel-ui.cdp.js` ("TIME FEEL UI OK"): half time / double time in the engine and on the page.
- `tests/band/pat/intro.cdp.js` ("INTRO OK"): intros (vamp / last bars, drums waiting, not when starting part-way, cleared by other changes).
- `node tests/band/entry/t_entry.js` ("ENTRY OK") and `tests/band/entry/entry.cdp.js` ("ENTRY UI OK", from `tests/band/lead` with the server): chord entry from a keyboard. Notes are fed through `window.__btEntry.on(midi, vel, ms)` / `.off(midi, ms)`; no MIDI device is involved.
- `tests/band/entry/voice.cdp.js` ("VOICE PASS OK") and `tests/band/sheet/voice.cdp.js` ("SHEET VOICE OK"): voicings played in chord by chord, on the Backing Track page (pins, copies, key change, saved setups) and on the Chord Sheet. `t_entry.js` also prints "VOICING NAMES OK" for `ChordVoicings.identify`.
- `tests/band/entry/side.cdp.js` ("SIDE OK"): the now / next chord diagram beside the chart (idle, count-in, playing, voicing pass, guitar fretboard, switched off and remembered).
- The MIDI entry tests now run against the Chord Entry page: `tests/band/entry/entry.cdp.js` ("ENTRY UI OK") covers entry, voicings, the style menu and the hand-off to the Backing Track and back (it replaces the old `entry/voice.cdp.js`). Render `tools/chord-entry.qmd` into the test site as well.
- `node tests/band/pat/t_pop.js` ("POP OK") and `tests/band/pat/pop.cdp.js` ("POP UI OK", from `tests/band/lead` with the server): the rock and pop styles. Bass lines on the kick, four-bar grooves, pushed chords, chorus bars, fills per style, the mid-bar root fix, each style's sounds, the Push chords and Chorus bars controls, and Chord Entry on a style's sounds. `meter/fetch-samples.js` now mirrors the steel and clean guitars, clap and tambourine too.
- `t_pop.js` and `pop.cdp.js` also cover the Hymn and Folk carol styles, the "No drums" groove, the Church organ instrument and the boom-chick strength slider (`opts.boom`).
- `t_pop.js` / `pop.cdp.js` also cover the piano ballad (left-hand octaves, first-inversion right hand, the three patterns, neighbour notes in the key, sixteenths when slow) and the blend sliders (`opts.rhythmMix`).
- `t_pop.js` also covers the widened piano voicing (left-hand shapes, right-hand register, the fifth left out) and the grand-staff notation by hand; `tests/band/pat/grandstaff.cdp.js` ("NOTATION GRAND STAFF OK", from `tests/band/lead` with the server) checks the score draws with a brace.
- `tests/band/pat/ahead.cdp.js` ("AHEAD OK"): the Notation panel shows the chorus about to be heard, rewrites after a setting changes, turns the page in the last bar. `t_pop.js` / `pop.cdp.js` also cover pattern transitions, the crash rules, voicing movement in the ballad, the ballad's hi-hat default and follow-my-playing (fed with numbers, not a microphone).
