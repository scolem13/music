# DWIM on the Notation page

"Do what I mean": select some music, press **DWIM**, and the page shows the other ways that music could
have been written, best first, each with a small score and a **Use this** button. The Notation page
(`tools/notation.qmd`) offers it; the engine is Chord Entry's (`ChordEntry.alternatives`) and the panel is
`MelodyDwim` (`apps/shared/melody-dwim.js`), shared with the Chord Entry page.

This file is the plan and the record: what works now, how it stays working long after a take, and what is
still to build. Keep it up to date when DWIM changes.

## Two kinds of DWIM

| Kind | Needs | Examples | Status |
|---|---|---|---|
| **Re-reading a take** | the take's log (every key down/up with its time, and the settings) | staccato vs note + rest, triplets or not, swing or straight, eighth vs sixteenth grid, plainest vs as-released note ends, grace notes, pickup | **built** |
| **Re-writing what is written** | only the notes on the page | enharmonic spelling (F♯ / G♭), a chord's other names (C6 / Am7), tie vs dotted note, octave of a passage, meter (6/8 vs 3/4), key | planned, below |

Re-reading is the stronger kind: it goes back to how the music was *played* and reads it again, so it can
recover things the first reading threw away (a note too short to keep, a triplet read as eighths). It can
only work where the page still has the playing.

## Re-reading a take, long after the take

On the Chord Entry page a take's log lives only until the next take. Here it is kept **with the chunk**:

```
chunk.takes = [{ voice, log, bars, sig: [per-bar signature] }]
```

- `log` is `ChordEntry.take(...).log()`: `{ v, cfg, events }`. It is small (a few kilobytes for a page of
  music) and is saved with the piece (localStorage), so DWIM works after a reload, tomorrow, next month.
- `voice` is the voice the take was written into (a take for voice 2 does not answer for voice 1).
- `bars` is how many bars the take wrote, from the chunk's first bar.
- `sig[b]` is a signature of what the take wrote in bar `b` (its rhythm and pitches, `NotationDoc.barSig`).

**When it still applies.** DWIM compares each selected bar's signature now with the one recorded. A bar
that is unchanged is fully "the take's". A bar that was edited (a note moved, a rhythm pattern added) is
reported: *"Bar 3 was changed after the take: using a reading replaces your changes in that bar."* Using
a reading is still allowed: it is your call. Bars outside the take (added later) cannot be re-read.

**What survives what.**

| Operation | What happens to the take |
|---|---|
| editing notes elsewhere in the chunk | nothing; only the edited bars report a change |
| splitting the chunk **on a bar line** | each half keeps the take, with its bars counted from where the half starts (`from`) |
| splitting **inside a bar** | the take is kept by the first half only for its whole bars; the bar that was cut is reported as changed |
| merging two chunks | both takes are kept, the second one's bars shifted by the first chunk's length |
| duplicating a chunk or a section | the copy keeps the take: DWIM works on the copy too |
| a new take into the same bars and voice | replaces the old one there |
| reading ABC or ChordPro in | takes are not in ABC: they are dropped (the page says so) |

**Using a reading** replaces only the selected bars of that voice (`NotationDoc.replaceBars`), puts the
new signatures in the take, and keeps the take's settings as they were: the next DWIM on those bars starts
from the reading you chose (it is shown as "As written now").

## How the button works

1. Select on the staff: click a note (that bar), or shift-click a second note (all the bars between).
2. **DWIM** is enabled when the selection lies in one chunk and that chunk has a take for that voice.
3. The DWIM panel opens with those bars; its own From / To boxes can widen or narrow the range.
4. Each card: what the reading changes, why someone would mean it, its cost (lower is plainer; notes left
   out cost most), and **Use this**.

Takes come from **Play it in time**. Chords from a take have their own DWIM (below) and are not touched by
melody readings.

## Planned: DWIM without a take

These work on any music on the page, typed, pasted or played. Each is a list of candidates with a cost, in
the same panel, so the user sees one DWIM, not several tools.

1. **Chords.** Every chord played in (one a bar, or in a take) keeps the notes that were played
   (`chord.midis`). `ChordEntry.analyse(midis, { all: true })` already returns every reading that fits
   (C6 / Am7, slash or not); DWIM on a chord lists them. Typed chords have no notes; for those, offer
   enharmonic names only (C♯m / D♭m).
2. **Spelling.** A selected note or span: the other spelling of each note out of the key (F♯ / G♭), using
   `ChordEntry.spellNotes` with the chord of the bar, which is what Chord Entry does for takes. Needs a
   spelling override on the note (`pitches` hold MIDI numbers; add `spell: { k: "Gb" }` beside them).
3. **Rhythm, plainer.** Without the playing, the written durations can still be re-read: a note and rest
   pair as one staccato note, a dotted note vs a tie, sixteenth pairs as eighths when the meter allows.
4. **Meter.** A chunk's rhythm read in another meter with the same length of bar (6/8 vs 3/4, 2/2 vs 4/4),
   scored by how many notes cross beats; useful after a take recorded in the wrong meter.
5. **Octave.** A passage that sits far from the voice's clef: one octave up or down.
6. **Key.** The key guess (`NotationDoc.guessKey`) with its runners-up and their scores, so a doubtful key
   can be compared and chosen; still confirmed by the user.

Order of work: 1 (data is already there), 2, then 3–6 as they are wanted.

## Tests

- `node tests/abc/notation-doc.test.js`: takes kept through split, merge, duplicate; bar signatures;
  `replaceBars`.
- `node tests/abc/notation.cdp.js`: a take recorded (synthetic events), saved, the page reloaded, DWIM run
  on a bar, a reading used.
