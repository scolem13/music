# kern -> full scores (piano sonatas, 2026-11-10)

Route used for Beethoven Pathetique III (`beethoven-op13-3`) and Moonlight III (`beethoven-op27-2-3`) in `apps/shared/data/full-scores/`.
Source: Craig Sapp's Humdrum encodings, `~/Projects/corpora/craigsapp_beethoven-piano-sonatas/kern/sonataNN-M.krn` (also
`craigsapp_mozart-piano-sonatas`, `musedata_humdrum-haydn-quartets`: only the piano reader is written so far).

Licence: the Beethoven repository has no LICENSE file and GitHub reports none (checked 2026-11-10); the 1915 Durand edition is public domain;
the Mozart / chorale repositories by the same encoder say CC BY-NC-SA 4.0. Cited in `scripts/sources/hutchinson-form.py`.

## Steps
1. `python3 -I scripts/kern/kern2xml.py in.krn out.musicxml --title "..." --movement "..." [--endings 65:1,66:2] [--drop-ties 88,160]`
   Own reader, not music21: music21's kern import re-spelled keys, merged voices and lost bars in Moonlight III. It prints measures and notes
   written, ties it had to drop (`TIEDROP`), and any measure whose voices differ in length (`LEN`; a legitimately short second voice is fine).
   `--endings` gives volta numbers by measure (kern labels `*>A1`/`*>A2` are also read); `--drop-ties` leaves out ties xml2abc cannot follow.
2. `XML2ABC=~/Projects/corpora/_tools/xml2abc_177/xml2abc.py node scripts/full-score/convert.mjs out.musicxml out.abc`
   (the default xml2abc path in convert.mjs does not exist on every machine). Read the score-check report: bars, lengths, every attack.
   Typical remaining faults: a tie out of a chord where only some notes are tied (xml2abc ties the whole chord; fix with `--drop-ties N`),
   overlapping ties of one pitch in two voices (arpeggio-with-pedal bars), tuplets of mixed lengths with ties. Waldstein I (sonata21-1)
   still has 13 such faults (bars 116-141) and is not added.
3. Copy the ABC to `apps/shared/data/full-scores/<id>.abc`, append a row to `index.json` (re-read it first; others write there too),
   bump `V` in `theory/analysed-scores/full-scores.qmd`.
4. Bar numbers are the kern's (`=N`): the pickup is bar 0, as the player counts. Link with `analysed-scores/full-scores.qmd?id=<id>&bar=N`.

## What kern2xml.py does and does not read
See its header. Done: staves, spine splits (voices), chords, ties, slurs, beams, grace notes, tuplets (septuplets too), dots, dynamics letters,
fermata, staccato / accent / tenuto, trill / mordent, clef / key / meter / tempo changes, repeats and endings.
Not done: wedges, arpeggio signs, ottava, stem directions, cue notes, tremolo, **dynam** other than letters.

## Other checks to run
`python3 -I` your own bar-by-bar comparison for any claim about repeated bars (the sonata-rondo page's tables were made by comparing pitch
sequences of the right hand between bars in the MusicXML, with a transposition search); key names there are a key-profile count (unverified).
