# Timestamp Notes, recording bar maps

- Timestamp Notes (`tools/timestamp-notes.qmd`, was the Big Timestamp Player; `apps/shared/timestamp-player/`): audio (YouTube
  link or file), S a section stamp with a label menu (`section-labels.js`, `TsLabels`: words, solos, letters A A′ B …, Other; repeats
  numbered, choruses per soloist; lesson `lessons/section-labels.qmd`; test `node tests/lessons/section-labels.test.js`,
  `node tests/lessons/section-stamps.cdp.js`) in the same list as C notes; the MIDI keyboard connects in the right sidebar; words and chords pasted from Ultimate Guitar and turned into ChordPro (`apps/shared/ug-chordpro.js`), S stamps
  the next section from the words, B taps each downbeat, then Send on: the Notation page (`?remote=1`, `nt-ready` / `nt-chordpro`)
  or the Backing Track (`bt-load`), each section's chords spread over its tapped bars at the tapped tempo. C stamps, Shift+L loops,
  Space plays, arrows / h l go 5 s; a bar's own Beats (meter change) goes out as a `{time:}` that `fromChordPro` reads mid-song.
  Fill from the tempo (`bar-map.js` `extrapolate`): bars after / between the taps from the tapped tempo, spread evenly between
  section stamps, heads and solos snapped to whole choruses; guessed bars kept apart (`guessed`), a B tap among them re-anchors.
  Halve / Double bars rescale the taps (warning first about irregular bars; Undo). Chord timing (`live.js`): N, or MIDI all at
  once (left hand one note = bar, two = section; right hand = chord hits, matched to the ChordPro's chords in order), placed per
  bar and rounded; sent as `nt-doc` (a whole doc). The stage shows the current section's words large (drag its grip taller) and the next section's first line; the chord grid
  (tune-chart.js, as on the Backing Track) shows each chord as it is hit (the rest once confirmed). At
  each pause timed sections are written into the ChordPro as `{start_of_grid}` blocks (`UgChordPro.grids/gridBlock`); a grid edited
  there is the section's timing until its hits change. Now playing sits in the right column (Float / Pin, A− A+).
  Correct chords (MIDI): a bar played in is rewritten with the chord named from its notes (`ChordEntry.analyse`); bars played
  through keep theirs. A meter change inside a section splits it (`_cont` pieces) so charts show it. The Backing Track's Melody tab
  opens the Notation page (`nt-abc`); its Show bar has Side by side (notation beside the grid).
  Sent to the Notation page every named part is a section, chunks labelled by `NotationDoc.chunkLabels` (I1a, V1a, PC2b, A3a).
  The Notation page's score has a Show menu (whole piece or one section). Every part folds, with a jump
  sidebar (`page-nav.js`). One song file (.json:
  stamps, bar map, words, chord hits, the link) saves everything; older .txt / bar-map .json still open.
  Chunks (the panel was "Phrases": the code keeps `phrases.js`, `TsPhrases`, `.btp-phrases` and the song file's `phrases` key): each section cut into 2/4/8-bar phrases, each looped from its lead-in (pickup, up to 2 bars,
  the phrase before keeps a beat; P, `,` `.`, `-` `=`), to its stop point (tail: up to 2 bars past its last bar, or negative: before it, the phrase keeping a beat; `{` `}`, `TsPhrases.maxTail` / `minTail` / `forwardFrom`, sent as nt-goto's `tail`). nt-goto also carries the phrase's tapped `bpm` (`TsPhrases.bpmOf`) and the player's `rate`: Play it in counts in at bpm × rate. The Notation page drives the loop by keys: `\` then p , . - = { } m Space a (`nt-loop` { action }; answered `nt-loop-state`, a phrase change sent back as nt-goto without switching windows). Loop mode (`.btp-ph-mode`, kept in btp-phrases): Listen / Play along / Play alone (recording muted by `_btp.setMuted`, a click on the tapped beats) / Listen, then play; every pass you play posts `nt-pass` { ...nt-goto, downAt, endAt (epoch ms), beatSec } and the Notation page records it as a take timed by the recording (`passStart`; every pass kept, `#nt-passes` picks one). Passes are counted by the bar map's `onWrap`. Test: `node tests/abc/transcribe-flow.cdp.js`; Phrases as chunks (on by default): every doc sent cuts each section at its phrases (`TsPhrases.chunkDoc`; words stay on the section's first chunk). Sent docs carry the tapped tempo (`TsPhrases.tempos`: doc.tempo the first section's, a section's own `chunk.tempo` where it moves 3+ bpm). The player (`player.js`) has a Speed row on every page: 25–150 %, pitch kept (a file: `preservesPitch`; YouTube: its own rate steps, the nearest taken), and = N bpm when the page sets `root._btpBpm(t)` (Timestamp Notes from the taps, RecordingFollow from the map); `_btp.rate()` / `setRate(r)`. Shift+Space on the Notation page plays the recording from the active note (its own Recording panel, `rf.seekHostAt`, else `nt-listen` to Timestamp Notes; again on the same note pauses). T / Notate sends `nt-goto` (the Notation page answers `nt-need-doc` when it
  lacks the section, then gets `nt-doc`), its Back button `nt-back` loops the next phrase. Test: `node tests/lessons/phrases.test.js`.
  `?rec=<id>` opens a recording from the MLT collection (`MLTRecordings`, player `_btp.openMedia(url, { rec })`) with its timing map from `apps/shared/mlt/timings/<id>.json`; Save then names the file `<id>.json`.
  "Follow in a tab" when YouTube refuses. The site's search has no keyboard shortcut (`_quarto.yml`), so letters stay free. Tests: `node tests/abc/ug-chordpro.test.js`, `node tests/lessons/timestamp.cdp.js`
  (after `quarto render tools/timestamp-notes.qmd` and `tools/notation.qmd` into `_site`).
- A recording's bar map on the Backing Track and the Notation page (`apps/shared/timestamp-player/recording-follow.js`, `RecordingFollow`,
  documented at its top): a Recording panel on each (the Timestamp Notes player, `player.js`'s `TimestampPlayer.init`, so a file or a YouTube
  link) and Open song file or bar map (Timestamp Notes' .json; older bar-map .json too; opens the song's YouTube link, else asks for the file).
  Backing Track: a click on a chart bar, or Go to section, seeks the recording (the chart's bar 1 = the recording's bar given in the panel);
  "band follows the recording's tempo" sets `player.setTempo` from `onBar` per bar (bar by bar / smoothed / steady) and gives the page's tempo
  back on stop; "Start the recording with the band's first bar". Notation: choosing a chunk or a section seeks (pickup chunk not a bar), and
  with follow on `makeBand` takes the map's tempo per bar. Tests: `node tests/lessons/recording-follow.cdp.js` (after rendering both pages).
- Timed ChordPro (`chordpro-timing.js`, `TsChordProTiming`): Save as ChordPro writes the ChordPro box with `x_` directives
  (`x_at` after each heading = its section stamp, `x_bars` bar starts in s with `/n` for a meter change, `x_note`, `x_section`,
  `x_source`, `x_beats_per_bar`); Open file / Paste read it back (an untimed .cho opens as words only). SALAMI chords files
  (McGill Billboard `salami_chords.txt`, `salami-chords.js`, `SalamiChords`) open the same way; its hooks route both. The whole Billboard set (CC0; 739 songs, the 151 second annotations of a song left out; each with its chords as Roman numerals for the Tune Directory's Functions / Progression) is copied to `apps/shared/data/billboard/<id>.txt` + `index.json` by `node scripts/billboard-import.mjs` (from ~/Projects/corpora/billboard): "Billboard…" beside Paste… searches and opens one, `?salami=<id>` opens one from a link (the Tune Directory lists them all); no audio comes with them.
  The big clock is its own part (`clock-panel.js`, #ts-clock, Float), `data-num-edit="off"` so num-edit.js leaves it alone.
