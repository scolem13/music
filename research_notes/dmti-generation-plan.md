# DMTI 1–3 on the MLT Books section: what can be generated (investigation, 2026-10-28)

Azzara and Grunow, *Developing Musicianship through Improvisation* 1–3 (GIA): 11 units, one tune each, every unit the
same six parts with the same wording; only the parameters change.

| Book | Units |
|---|---|
| 1 | Long, Long Ago (E♭, duple, I V) · Mary Ann (C, duple Latin, I V) · Joshua (D minor, i V) · Simple Gifts (E♭, divisions, I IV V) · Down by the Riverside (F, swing) |
| 2 | When the Saints · Amazing Grace · Motherless Child |
| 3 | Saint Louis Blues · Transformation · Red Wings |

## The template (Book 1, Unit 1 read in full; Unit 2 identical apart from names, key, track numbers)

1. **Repertoire**: listen to melody, bass line; sing melody and bass by ear with the accompaniment; play by ear after clicks; play with articulation and expression.
2. **Patterns and progressions**: echo 8 rhythm patterns (bah, syllables, instrument on X-DO); improvise a different pattern; echo/improvise two-bar rhythm series. Echo tonal patterns (bum, solfège, instrument); sing the root and name the function; improvise a different pattern with the same function; echo series of patterns over a progression, sing/play the bass line, improvise a different series.
3. **Improvising melodic phrases**: hear the antecedent, improvise a consequent over the tune's harmony, aiming at chord tones; then both phrases.
4. **Seven skills**: (1) rhythm on the chord roots; (2) four parts of the harmony (root, and pathways like DO-TI-DO); (3) harmonic rhythm of the tune with those parts; (4) improvise rhythm on a part; (5) improvise tonal patterns in macrobeats; (6) tonal + rhythm patterns; (7) decorate and embellish the melody.
5. **Reading and writing**: write the patterns, the series; read the tune, compose to its progression.
6. **Solos**: learn a transcribed solo; transcribe; improvise with the accompaniment.

## Generated vs. entered

| Thing | How |
|---|---|
| All instruction text for parts 1–6 | One template with slots: tune, key (X-DO / X-LA), meter, style, functions, track numbers |
| Rhythm patterns (8 per unit) | Already on the site: `dmti1-unit1-rhythm` … `dmti3-unit3-rhythm` (rhythm-pattern-object.js) |
| Tonal patterns | Already on the site (major-I-V / minor-i-V; `dmti1-unit4-tonal` … `dmti3-unit3-tonal`, `dmti-blue-notes`). Units 1–3 share one set in two keys |
| Rhythm and tonal series | Generated: rhythm series = pairs of the unit's patterns; tonal series = patterns of each chord's function, in order, over the tune's progression |
| Bass line, four-part harmony, harmonic rhythm (skills 1–3) | Generated from the tune's chord symbols (already in the tune collection): roots, voice-led pathways (`apps/shared/voicings.js`), one part per voice in the tune's rhythm of chord changes |
| Accompaniment, backing for improvising | The band (`AbcPlay` with chord symbols, `opts.style`: Latin for Mary Ann, swing for Riverside, blues for St Louis) |
| Antecedent/consequent (part 3) | Generated: play the tune's first phrase, then the band continues the progression with the melody muted |
| Improvise-a-different-pattern checks | `Audiation.fits` already judges "different, same function" |
| Solos (part 6) | Not generated: the transcribed solos are the one thing per unit that would need transcription; leave as page citations, or transcribe a few later |
| Page numbers | DMTI text is OCR with `=== PDF PAGE nnn ===`; print page = number printed on the page (front matter roman) |

## Data per unit (all that is entered by hand)

```js
{ id: "d1-u1", book: "dmti1", tune: "long-long-ago", title: "Long, Long Ago", page: "1",
  key: "Eb", mode: "major", meter: "duple", style: null, functions: ["I", "V7"],
  rhythm: "dmti1-unit1-rhythm",               // a rhythmPatternObject id
  tonal: "major-I-V",                          // a pattern-set id
  parts: { 1: "1", 2: "2–4", 3: "5", 4: "6–11", 5: "12–13", 6: "14–16" } }   // print pages
```

## Checks needed

- Units 1–2 tune keys: the collection has Long, Long Ago in E♭ (matches); Simple Gifts and Long, Long Ago come from the JRI Recorder guide; compare with DMTI's versions. Amazing Grace in the collection is not DMTI's (no source); St Louis Blues is missing.
- Book 2 and 3 front matter: check they also list patterns in syllables.

## The Seven Skills, generated (checked against Book 1 Unit 1, pp. 9–13 page images)

Everything comes from the tune's parsed form, the same model `scripts/bass-ear-corpus.mjs` already builds
(`{ tonic, minor, n, d, bq, mel: [t, dur, midi…], ch: [[t, symbol, root, bass, tones, scale]] }`), but for the whole tune
rather than 8 bars, plus the unit's rhythm set and tonal set. Each skill = an Example (seeded, "New example" re-rolls it),
the band playing the progression to improvise over (`AbcPlay`, melody on or off), and notation on demand.

| Skill | Book (Unit 1) | Generator |
|---|---|---|
| Review | sing/play melody and bass line | the tune; bass = chord roots on each chord (bass-ear `line`, density "changes") |
| 1 Rhythm on the roots | an 8-phrase example: chord roots in rhythms of the unit's vocabulary | each bar's rhythm drawn from the unit's rhythm set (its cells), pitch = the root of the chord sounding at each note |
| 2 Four parts | bass DO-SO-DO, then DO-TI-DO, MI-FA-MI, SO-SO-SO (a short I V7 I in whole notes) | for the unit's functions in order (I V7 I; I IV I V7 I; minor; blues): root + three upper voices by least motion from close tonic (`ChordVoicings.nearest`, or per-voice nearest chord tone, common tones held); each part labelled in solfège |
| 3 Harmonic rhythm | each part in the tune's chord rhythm | the Skill 2 voices laid on the tune's chord timeline: one note per chord, held for its length (ties across bars) |
| 4 Rhythm on a part | improvise rhythms on any part, with the melody | Skill 3 part (chosen) + bar rhythms from the unit's set, as in Skill 1 |
| 5 Tonal patterns in macrobeats | two examples, ♩ = DU and 𝅗𝅥 = DU: chord tones one per macrobeat | per chord span, a pattern from the unit's tonal set with that chord's function (transposed to the key), one note per macrobeat, chained by nearest register; both macrobeat sizes |
| 6 Tonal + rhythm | chord tones in the melody's own rhythm and the unit's cells | Skill 5 pitches with bar rhythms from the unit's set (or the melody's rhythm), chord tone on each strong beat |
| 7 Decorate the melody | the melody with passing and neighbour tones, varied rhythm | the tune's melody with embellishments added: passing and neighbour tones between chord tones, rhythm subdivided with the unit's cells (prog-ear's melody levels m2–m4 and bass-ear's `fill` kinds already do the same moves) |

New code: one module (e.g. `apps/shared/mlt/dmti-skills.js`) with a pure function per skill, tested in Node:
bars come out at the right length (rule 1, through `AbcTune`), every note on a strong beat is a chord tone of the chord sounding,
Skill 2 parts move by step or stay, the same seed gives the same example. The Part 2 series (rhythm phrases, tonal series
over the progression) and Part 3 (antecedent, then the band continues without melody) use the same helpers.

Parsing: move the tune-parsing part of `scripts/bass-ear-corpus.mjs` into a shared, browser-safe function (whole tune,
no excerpting), so the page parses the tune collection entry at load time; no new generated data file.
