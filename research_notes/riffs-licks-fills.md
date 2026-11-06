# Riffs, licks, montunos and fills for the band: preliminary research (2026-11-04)

What the Backing Track band is missing beyond the time-keeping patterns it has. Nothing here is heard yet.

## What there is
- Drum fills: jazz, rock and light sets in `drums.js` (FILLS, FILLS_ROCK, FILLS_LIGHT), asked for by `^fill` or sections.
  Latin and Caribbean grooves play none, on purpose (NOTES.org).
- Bass: the boogaloo riff and its relatives, tune figures (Chameleon, Footprints, ...).
- Montuno: block-chord rhythm only (NOTES.org TODO "Montuno is block chords, not broken octaves").

## Added this round
- `guajeo` comping rhythm (comp.js `guajeoBar`): the montuno rhythm in broken octaves, the top note rocking
  between neighbouring chord tones, chord tones between the octaves on F hits. Fits the Son montuno style
  (not its default yet). Sources: Wikipedia "Guajeo" (salsa piano guajeos are octaves, built on the onbeat/offbeat
  two-bar motif); Pianote, Kevin Castro lesson (octaves with 1 and 5, inner thirds with 2 and 4).

## By style: what each should get next (unverified, from general knowledge; check before building)
| Style | Riffs / licks / figures | Fills / breaks |
|---|---|---|
| Son montuno / salsa | guajeo (done); tres guajeo; mambo horn figures; bass tumbao pickups | timbales abanico / cascara roll into the section (not a tom fill) |
| Cha-cha | piano guajeo on the cha-cha bars; güiro | the "cha-cha-chá" break on 4 & 1 |
| Bossa | guitar "batida" variations; bass 1-5 pickup | rim-click break, no toms |
| Boogaloo / soul jazz | piano riffs (Cantaloupe Island), organ licks | snare pickups |
| Boogie / jump | right-hand boogie licks (tremolo, crushed 3rds, 6-5 rocks) | shuffle snare fills, stop-time breaks |
| Blues | turnaround licks (I-IV-I-V descending 6ths), bass 1-1-8-8-b7-b7-5-5 | shuffle fills |
| Rock / emo | minor-pentatonic guitar riffs on I, power-chord riffs | tom fills (have) |
| Funk | 16th riffs on Dorian / minor pentatonic, scratch guitar | snare ghost fills |
| Motown | bass pickups (Jamerson-style chromatic approaches), tambourine | snare 8th-note pickups (have, light) |
| Reggae / ska | bass riff lines (one-drop), organ bubble | "drop" (the band stops on 1) |
| Country / train | chicken-pickin' licks, bass walk-ups between chords | snare train roll |
| Stride / ragtime | right-hand breaks at section ends | none (piano breaks) |

## Format still to design (from NOTES.org "RIFFS")
A riff is a fixed figure, not a rule: scale degrees + rhythm in sixteenths, who plays it (bass / comp / both in octaves),
transposes with the chord or stays put, length in bars. A lick is a riff placed at a phrase end (like a fill).
A sensible next step: one `RIFFS` table shared by bass and comp, with `when: "every" | "phraseEnd" | "section"`.

## Sources
- Wikipedia, "Guajeo": https://en.wikipedia.org/wiki/Guajeo
- Pianote, "Piano montuno" (Kevin Castro): https://www.pianote.com/blog/?p=5772
- Piano With Jonny, "Piano Montunos: The Complete Guide": https://pianowithjonny.com/piano-lessons/piano-montunos-the-complete-guide/
- Premier Guitar, "Montunos Made Easy": https://www.premierguitar.com/montunos-made-easy
- "A Pedagogical Approach to Minor Pentatonic Riffs in Rock Music", Journal of Music Theory Pedagogy: https://journals.ou.edu/jmtp/article/download/658/1499/1489
- Hutchinson, Music Theory for the 21st-Century Classroom, ch. 14.7 (distinctive bass lines, guitar riffs)

## Round 2 (2026-11-04): rock and the pop ballad
Built: `FIGURES` in harmony.js (fills taken in turn, a rock riff, four song riffs); lesson `lessons/fills-riffs.qmd`.
Song riffs (short excerpts for teaching, behind the site password; from memory, unchecked): Seven Nation Army, Smoke on the
Water, Every Breath You Take, the Clocks piano figure. Candidates next, once checked against the records: Satisfaction,
Sunshine of Your Love, Day Tripper, Another One Bites the Dust (bass), Come As You Are, Back in Black, Layla, Sweet Child
O' Mine (intro), Let It Be and Someone Like You (piano figures), Stand By Me (bass).
