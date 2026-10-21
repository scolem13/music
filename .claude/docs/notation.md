# Notation page

- The Notation page (`tools/_notation.qmd`, model `apps/shared/notation-doc.js`): chunks, sections, voices, chords, words, takes.
  At its top, Play it in: takes from a MIDI keyboard (Space / sustain pedal; Shift+R redo, Shift+Backspace drop), each a chunk of its own;
  Split at (`Q.split`, default C4) and Left hand (`Q.lh`): "chords" (symbols only), "notate" (the left hand written out in the voice after the recorded one, bass clef, made when missing: `lhVoice` / `lhTake`, chords kept as chords: a slot's `also: [midi]`, written `[CEG]`, read back from AbcEvents' `notes`), "both" (notated + symbols). With "chords" the left hand plays chords that are named and written over the bars (`takeChords`; a take is split only when the left hand struck two notes or more together, else it is all melody: `kindOf`); a phrase take that runs past its stop point writes the bars played on into the rest of the chunk and the chunks after it (`spillOn`, `chunk.draft`, shown "draft"; nt-back's `skip` passes them); the computer keys play only when Computer keys is the chosen input (never just because a take is recording); notes in the count-in of the first take make a `Pickup` chunk (`chunk.pickup`, a short first bar, up to a bar less one eighth). The
  other ways in (letters, rhythm bank, chords, words, the older Play it in time) are in the right sidebar.
  Keys act on the active note (red: the selection, else the first note without a pitch): letters, z rest, T tie to the note
  before (t: to the next), U unpitch, u undo, Space play from the active note to the chunk's end (Play through ticked: to the piece's end, from that bar's start), j/k or a click on a chunk make its first note active, r record a take (new chunk below), I insert at the start, yy / DD copy / cut the chunk (the first DD asks y/n:
  Caps Lock), p / P put it after / before, Backspace delete, h/l notes, H/L bars (inside the chunk), i Insert mode (a caret), s split the chunk at the caret / before the active note (a cut inside a bar gives the second part a lead), o/O new chunk,
  v Visual mode as in vim (h/l select notes, counts v8l, H/L whole bars, y copy, d/x cut, then p/P put the notes after/before the active note; p/P put whichever was copied last, notes or a chunk), = respells the active note, same pitch (`slot.spell` "E@5" on the rhythm slot, read and written by toAbc / fromAbc; first = the likeliest other spelling, again cycles ## .. bb; + raises a half step), Tab the active note's ABC selected in the ABC box (Tab there: back to the note at the caret; `toAbcText` / `fromAbcText`), Alt+v/V show/hide this chunk / the others (`chunk.off`), J Join (`D.merge`), M Merge (`D.combine`: rhythm-only + pitch-only chunk, or two
  the same length as two voices); J/M ask y/n to show hidden chunks first. Only a chunk with no rhythm collects pitches (stemless, `|` =
  `part.breaks`); in a chunk with rhythm `|` sets `chunk.lead` (a pickup). Every chunk starts on beat 1, or its lead before a barline,
  whatever ends the chunk before (`D.offsets`; invisible rest in the ABC, Join writes it in as rest). Tempo: written Q: (90 when unset; abcjs
  would play 180), and `[Q:]` in every voice where it changes. Keys are an ABC key with a mode (`Ddor`), or `hm` for harmonic minor (`Dhm`: written K:Dm, letters raise the 7th;
  `D.keyName`, `D.majorOf`); the menus are tonic + tonality + an enharmonic switch. Tempo: `doc.tempo` / `chunk.tempo` (`D.at`, Q:).
  Meter menus have Other... (two number boxes). Words follow ABC's w: rules (`-` syllables, `_` hold over the next note, `*` skip). The ChordPro ends with the notes as a
  `{start_of_abc}` block: with it, editing the ChordPro edits the piece (`D.fromChordPro` takes notes from the ABC, words from the
  ChordPro, keeping each word's syllables). Line breaks: `doc.lineEvery` (bars a line, a pickup bar not counted) and RET's own
  breaks `chunk.nl` (barline times from the chunk's start, drawn ↴; click or RET removes); with either, `toAbc` breaks lines there
  and at every chunk (`lines` in its result) and the score draws each line on its own. S starts a section at the active chunk
  (a heading row in Chunks, its name input focused, TsLabels names as a datalist; repeated words numbered); J / M refuse to cross a
  section start. Words: Paragraphs to sections (each paragraph a chunk heading Verse n). Play: the sounding note lit (`nt-playing`,
  abcjs TimingCallbacks mapped through the play map to the drawn lines); with chords the band plays the chords AND the notes (bar.melody on the
  parsed chart, so nothing drifts; band scripts loaded on first use, `makeBand`: `D.bandChart`, `doc.band.style` else "pop", tempo per
  bar, a Pickup chunk = the chart's short first bar after one bar of count-in; playhead from onBar/onBeat; 12 s without samples: the
  abcjs piano). Rhythm bank keys: 2 3 4 8 are always half, dotted half, quarter, eighth (shown when the ticked boxes give that note);
  patterns take 1 5 6 7 9. Play it in's Tempo shows the piece's tempo at the chunk; one typed there is the
  take's and goes on its chunk (`Q.bpmOwn`). The score draws each shown chunk on its own line (`drawChunks`: bars a fixed width, a mid-bar start padded so barlines line up). Test: `node tests/abc/notation-quick.cdp.js`.
  A click on one piece of a note drawn as tied pieces splits it there (`D.splitSlot`, map entries' `offQ` / `lenQ`) so that piece is selected alone; a note tied on from the one before takes no syllable.
  Chord symbols are typed on the score: a click on one, or `"` on a note, opens a box there (`chordEd`, map entries' `atQ` / `down`); h / l / arrows go note by note,
  Tab / Shift+Tab / L / H to the next / last chord or beat 1, Enter keeps, Esc leaves; the Chords part shows the chunk's chords by bar with that one lit
  (`#nt-chords-bars`). The Chords text holds places with `.` (`C . . G`: G on beat 4), so a chord off the even split keeps its time.
  The navbar Mixer's drum strips have M / S of their own, among the drums only (each kit group's node in the bus, `bus.kitNode`).
  The Chords widget writes from the first full bar: a chunk's `lead` is skipped (`D.parseChords(text, barQ, lead)`, `chordsText(ch, barQ, lead)`), a Pickup chunk's chords go to the chunk after it; a chord in the pickup is written in the ABC and kept.
  The ABC box has vim keys (`apps/shared/vim-textarea.js`, `VimTextarea.attach`, keys listed at its top; the Vim keys box, localStorage `ntAbcVim`), `=` there respells the note under the cursor.
  DWIM there (re-reading a take, kept with the chunk) is documented in `apps/shared/NOTATION-DWIM.md`, as are phrase seams
  (the bar shared by a phrase's end and the next one's pickup; `apps/shared/phrase-seam.js`, `NotationDoc.writeLeadIn`; after
  Timestamp Notes' `nt-goto` a Play it in take goes into that phrase, count-in notes into the bar before; `node tests/abc/phrase-seam.test.js`). It opens the Backing Track
  as a remote window (`bt-load`, `bt-focus`, and `bt-setup` reports back). Tests: `node tests/abc/notation-doc.test.js`,
  `node tests/abc/notation.cdp.js`.
- Loop chunks (`#nt-loop`, `apps/shared/chunk-loop.js`, `ChunkLoop`): with a song file open in the Recording part, each chunk is found in the
  map through its section (section start + the chunk's bar offset in it, so a split / join / bar added elsewhere moves nothing; ≈ no such
  section in the map, ⚠ the section's bar count differs). Lead-in / stop: `chunk.loop` set here, else the song file's (`model.prefs`, Timestamp
  Notes' leadIns / tails by key), else guessed (lead-in from the chunk's own pickup, stop = minus the next chunk's lead-in). Loop mode
  (`Q.lmode`), each pass you play a take (`passStart`, as from Timestamp Notes), done / draft / empty per chunk. Keys `\` then p , . - = { } m Space a
  (local when no Timestamp Notes opened the page, else sent there). Tests: `node tests/abc/chunk-loop.test.js`, `node tests/abc/chunk-loop.cdp.js`.
- Dictation (`practice/dictation.qmd`, grader `apps/shared/dictation.js`): plays a Reading Benchmarks line, opens the Notation
  page as a remote window (`?dictation=1`: a scratch doc kept apart from the user's own; `dict-load`, `dict-replay`, `dict-submit`),
  grades the handed-in ABC note by note (pitch, rhythm, extra notes). Tests: `node tests/abc/dictation.test.js`,
  `node tests/lessons/dictation.cdp.js` (after rendering both pages).
- The large tools' page design (Timestamp Notes, the Notation page): two columns of folding parts plus a sidebar column of its own
  (jump links, staying put as the page scrolls). Every part moves between the columns (its header's ⇄, or drag its grip), kept in
  localStorage (`ts-columns`, `ntColumns`; Reset columns in the sidebar): `apps/shared/panel-columns.js` / `.css`. A part moved out
  of a group goes into a `.pc-shell` with the group's classes; scripts look inside their group with `PanelColumns.q(root, sel)` and
  find the group itself as `.group:not(.pc-shell)`.
