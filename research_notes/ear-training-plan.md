# Ear training plan: MLT + the theory text

Plan only, nothing built yet (2026-10-27). Joins two things the site already has:

- **MLT** (Gordon, Mullen, DMTI, JRI), already on `practice/audiation.qmd`, the LSA apps, Tonal Patterns / Sequences, Patterns by Ear.
- **The theory text**: Hutchinson, *Music Theory for the 21st-Century Classroom*, one `theory/` page per chapter, with ear drills already
  in some chapters (`prog`, `cadence`, `mixdc`, `neapear`, `aug6ear`, `jzear`).

The flagship is a **Harmonic Progressions trainer** (tool 1). Tools 2-6 are smaller and mostly reuse its engine.

## 1. Sources and the order they give

Page numbers were read from the text cache (`research_notes/mlt-sources/text/`) and still need to be checked against the book before
they ship (CLAUDE.md rule 4). Cite in `scripts/sources/mlt.py`.

| Source | What it gives the plan |
|---|---|
| Gordon, *LSM* 2012, pp. 167-168 | Harmonic patterns are series of chords. Chords made of the key's own notes are heard as primary, chords with altered notes as subordinate. |
| Gordon, *LSM* p. 313 | Harmonic patterns: I V7 I, I IV I, I II V7 I, I II7 V7 I. A progression joins two or more patterns. |
| Gordon, *LSM* ~p. 313 (line 1631) | Four stages of readiness: (1) doesn't notice a chord change, (2) notices a change but not what kind, (3) notices it and knows what kind, (4) also predicts what comes next. **This is the trainer's question ladder.** |
| Gordon, *LSM* pp. 318-319 | Teach I V7 I, then I IV I, then I IV V7 I and I V7 IV I, in three sung parts (top so la so so / middle mi fa fa mi / bottom do do ti do). Then I IV V7 I in harmonic minor (mi fa mi mi / do re re do / la la si la) before any more major. |
| Gordon, *LSM* p. 320 | **Easy:** IV and V7 to tonic in major and harmonic minor; IV to tonic in Dorian; vi in major or minor (relative keys). Combine them (I IV V7 I, I V7 IV I, I IV I V7 I, V7 I IV I). **Moderately difficult:** vi7, vii7 and VII7 in major, the diminished chords, Phrygian / Lydian / Mixolydian / Aeolian / Locrian, parallel major-minor (in harmonic minor). **Supertonic (ii) is kept back until after all of these.** |
| Mullen, *The Literate Musician*, Part I Section 3 "Harmony" | Lesson 2 aural/oral sub-skills: first pitch, resting tone, whole pattern on "bum". Lesson 7 comparing major and minor, Lesson 8 **Singing Bass Lines**, Lesson 9 **Harmonic Translation** (three kinds), Lesson 10 I/V Conversations, Lesson 10.5 **Crash Course in Chord Roots**. Harmonic Loops videos per tonality (major, minor, Dorian, Mixolydian, Phrygian), roots boxed. |
| Azzara and Grunow, *DMTI 3* | Bass line, then harmonic progressions on a neutral syllable, then in solfège, then improvise. After each series, sing the roots in solfège. |
| Hutchinson ch. 7, 9, 17-22, 31 | Theory names and later chromatic material. Already drilled on `theory/`. |

**Where they disagree.** Hutchinson's ch. 9 brings in ii early, as the usual predominant. Gordon holds ii back until after the modes and
the diminished chords. The trainer follows Gordon/Mullen through MLT Stage F (same decision as the MLT planner: Mullen first, Gordon noted),
then hands off to Hutchinson's order. Each level shows a note when the two orders differ.

## 2. What already exists and gets reused

| Need | Already built |
|---|---|
| Establishing tonality and keyality | `Audiation.tonalSequence(mode, rest)`, `Tonality.establish`, `establish-button.js`, the navbar Drone |
| Moving-do solfège for any mode | `Audiation.solfege`, `DegreeNames`, `SolfegeSing` (sung solfège) |
| Voicing chords | `satb.js` (four-part voice leading), `voicings.js` (piano and guitar), `modulation.js` (bass + 3 upper parts) |
| Sound | `AbcPlay.play` (band samples, notes lit as they sound), `BandSounds`, `BandPlayer` + `BandHarmony` (band loops in a style), `AudioTap.register` |
| Questions, scoring, answer buttons, MIDI | `drills.js` (`prog`, `func`, `cadence`, settings from the address, `lock=1` for tests) |
| Singing checks | `pitch-detect.js`, `sing-check.js` |
| Ear-only levels before notation | `apps/patterns/audiation.js` (same/different, translate to solfège, Mullen's sequence) |
| Harmonic functions of patterns | `pattern-set.js` chord tags, `Audiation.tonalSet(...).patterns[].fn` |
| Notation and dictation | `dictation.js`, `notation-doc.js`, abcjs |
| Real recordings with chords | Timestamp Notes, `salami-chords.js` (Billboard), `chordpro-timing.js`, the Tune Library with chord symbols, Works |
| Class sets and makeup links | `session-log.js` |
| Page frame | `section-fold.js` (folded sections + right jump bar on every page) |

## 3. Tool 1: Harmonic Progressions trainer (flagship)

**Page:** `practice/harmony-ear.qmd` ("Hearing Harmony"). **Engine:** `apps/patterns/harmony-ear.js` (pure parts load in Node).
**Level data:** `apps/patterns/harmony-ladder.js`, used by this page, by the MLT planner, and by the `prog` drill.

### 3.1 One round

1. **Establish.** Play the tonality-establishing sequence (or a I-IV-V7-I cadence) in a random keyality. "Same key" is optional.
2. **Play the progression** (2-8 chords), one chord per macrobeat or per bar. Voicing is chosen per level (see 3.4).
3. **Ask one question**, at the learner's chosen stage (3.2).
4. **Feedback.** Play it again with the bass sung in solfège (`SolfegeSing`) and the chord names lit under a "roots" strip (Mullen's boxed roots).
   Below the level's notation gate, no notation is shown.

### 3.2 Question types (Gordon's readiness stages, then MLT skill levels)

| # | Question | Gordon stage / MLT level | Answer by |
|---|---|---|---|
| Q1 | **Did the chord change?** Tap on each change, or press "change / same" after two chords. | Stage 1-2 / aural-oral | Tap (Tap Along timing code) or two buttons |
| Q2 | **Sing the bass.** The roots, on "bum", then in solfège. | Aural-oral, then verbal (Mullen L8, DMTI) | Microphone (`PitchDetect`), or a self-check that plays the answer |
| Q3 | **Which function?** Tonic / dominant / subdominant (/ subtonic, submediant...) for each chord. | Stage 3 / verbal | Function buttons |
| Q4 | **Same or different?** Two progressions. | Partial synthesis / generalization | Two buttons |
| Q5 | **Translate.** Heard on "bum", give the roots in solfège (Mullen L9). | Generalization-verbal | Solfège buttons or typed |
| Q6 | **What comes next?** Hear the start, choose the next chord. | Stage 4 / inference | Function buttons |
| Q7 | **Name it in Roman numerals / chord symbols.** | Theoretical understanding (Hutchinson) | `prog`'s typed answer |
| Q8 | **Write it.** Bass line plus numerals on the staff. | Symbolic association / composite synthesis | Dictation panel (`dictation.js`) |
| Q9 | **Improvise over it.** The band loops the progression and you play or sing. | Creativity / improvisation | Optional pitch check that you landed on chord tones |

The default order is Q1 → Q2 → Q3 → Q5 → Q4 → Q6, with Q7-Q8 locked until "reading" is turned on. This is the same notation gate
`audiation.qmd` uses.

### 3.3 Level ladder (progressive difficulty)

Each level is a set of harmonic patterns (2-3 chords that start and end on tonic, Gordon) and the progressions made by joining them.
A level unlocks after N right out of the last M (setting; default 8/10). Progress is kept in localStorage. There is no account.

**Stage A: Tonic and dominant (Gordon "easy", Mullen Harmony L2-L10)**
- A1 Major: I V7 I. Q1-Q3.
- A2 Minor (harmonic): i V7 i.
- A3 Major vs minor: which tonality is this loop in? (Mullen L7)
- A4 I/V conversations: longer strings of I and V7 (I I V7 I, I V7 V7 I...), Q6 predict.

**Stage B: Subdominant**
- B1 Major I IV I; B2 minor i iv i.
- B3 Joined: I IV V7 I, I V7 IV I, I IV I V7 I, V7 I IV I (Gordon's list, p. 320), same again in minor.
- B4 Three-part singing mode: the class or learner sings one of Gordon's three lines (p. 318), the app plays the other two.

**Stage C: Modes with their own characteristic chords**
- C1 Dorian i IV i (Gordon "easy").
- C2 Mixolydian I ♭VII I (Mullen's Harmonic Loop). Matches the patterns in `324a`.
- C3 Aeolian i ♭VII ♭VI (Mullen, *Literate Musician* Section 1 tonality notes: Aeolian uses VII, not V7; page to find).
- C4 Phrygian, Lydian, Locrian (Gordon "moderately difficult").
- C5 Which mode is this loop in? (Gordon: modal harmonic patterns can be easier than some major-minor ones.)

**Stage D: Submediant and keyality changes**
- D1 vi in major / VI in minor.
- D2 Multitonal: major to relative minor and back (Gordon: taught in major).
- D3 Parallel major-minor (Gordon: taught in harmonic minor).

**Stage E: Moderately difficult in major**
- E1 vi7, vii7 (viiø7), VII7 relations to tonic.
- E2 The diminished chords.

**Stage F: Supertonic (Gordon keeps it last)**
- F1 I ii V7 I; F2 I ii7 V7 I (Gordon's p. 313 patterns); F3 the minor ii° iv V.

**Stage G: Hutchinson's progressions (hands off to `theory/`)**
- G1 Ch. 9 circle-of-fifths pieces and function flow (T, TP, PD, D).
- G2 Pop loops: I-V-vi-IV and its rotations, i-VII-VI-VII, ♭VII-I (ch. 9.6-9.8).
- G3 Cadences by ear: AC / HC / DC / PC (ch. 7 `cadence`).
- G4 Cadential 6/4, inversions heard as bass motion (ch. 16).
- G5 Secondary dominants (ch. 17), secondary diminished (ch. 18).
- G6 Mixture (ch. 19, `mixdc`), Neapolitan (ch. 20, `neapear`), augmented sixths (ch. 21, `aug6ear`).
- G7 Modulation by pivot chord (ch. 22, `modulation.js` EXAMPLES).
- G8 Jazz ii-V-I, tritone subs (ch. 31, `jzear`); blues (`lessons/blues-changes.qmd`).

Stages G5-G8 link to the existing chapter drills rather than repeating them. The ladder gives the order; the chapter page does the drilling.

### 3.4 Sound and voicing, by stage

- **A-B:** three plain voices close to Gordon's three sung parts, so what you hear is what you sing. Bass an octave below.
- **C-F:** `satb.js` four-part voicing on the band piano (organ as an option).
- **G:** the voicings each chapter drill already uses. "Band" mode (`BandPlayer`, a simple style) for loops and Q9.
- Keyality: random over a singable range (setting), with the drone as an option. Tempo by macrobeat. Duple or triple harmonic rhythm.
- Inversions off until G4. A "melody on top" option (a tune from the Library over the same chords) for Stage B onward.

### 3.5 Teacher features

- `?level=B3&q=func&count=10&lock=1` in the address, the same convention as `drills.js`.
- `session-log.js` class log and makeup links.
- A "for teachers" fold on each level: the source page, the sung parts, what to do in class (from Gordon / Mullen, cited).

## 4. The smaller tools

**2. Singing Bass Lines** (`practice/bass-lines.qmd`). Mullen L8 and L10.5, DMTI. Songs from the Tune Library with chord symbols (start
with Mullen's: "Down By The Station", "Are You Sleeping?", "Joshua", "Wade in the Water"). Play melody plus roots; then melody only while you
sing the roots; `PitchDetect` scores each root on time and in tune; then sing the roots in solfège. Uses `AbcPlay` (chords from `opts.abc`)
and `sing-check.js`. Could be a mode of tool 1 instead of its own page (open question).

**3. Harmonic Translation** (Mullen L9, three kinds). This is a question type in tool 1 (Q5). It only gets its own page if Mullen's three
kinds don't fit into one question. Read the lesson before deciding.

**4. Hear the Changes in Real Music** (Gordon stages 1-2 on recordings). In Timestamp Notes, a mode that hides the chord track and asks you
to tap each chord change. The SALAMI / ChordPro timings are the answer key, scored within a window. Then: name the function of each change.
Starts with songs whose loops are already on the site (`theory/progressions.qmd` YouTube clips, `four-chord-loops.qmd`).

**5. Tonality by Harmony** (Mullen's Harmonic Loops). The band plays a loop in major, minor, Dorian, Mixolydian, Phrygian... "Which
tonality? Sing the resting tone." This is Stage A3 / C5 of tool 1 with its own entry point, linked from `theory/modes-three-ways.qmd`.

**6. Improvise over Harmonic Patterns** (Gordon pp. 318-320, DMTI). The band loops one level's patterns. You improvise; a light check
counts how many held notes are chord tones of the chord sounding. No grade, just a picture afterwards. Links to Patterns by Ear for
the tonal vocabulary.

## 5. Links between pages

- `practice/audiation.qmd`: a "Harmony" fold pointing to tool 1 Stage A at the matching skill level.
- The MLT planner (when it is built): each unit names its harmony level from `harmony-ladder.js`.
- Each `theory/` chapter page: an "Ear" box linking to the matching Stage G level. `theory/progressions.qmd`'s `prog` drill gets a
  `level=` setting that reads the ladder.
- Exercise Builder: a "by ear" option that pulls ladder levels.
- Tune Library / Works: "Hear the harmony" from a tune's chords into tool 1 with that tune's progression.

## 6. Build order (when we build)

1. `harmony-ladder.js` data plus Node test: every level's progressions are valid in their mode, and voicings pass `satb.js`'s checks.
2. `harmony-ear.js` engine plus page, Stages A-B, questions Q1-Q3, Q5. CDP test with the page's own samples (rule 5).
3. Q2 sung bass with `PitchDetect`; tool 2 as a mode.
4. Stages C-F, Q4, Q6.
5. Stage G handoff links and the `prog level=` setting; Q7-Q8 via Dictation.
6. Tool 4 (Timestamp Notes change-tapping); tool 6 (improvise).
7. Works cited: `scripts/sources/mlt.py` entries for every page above, then `python3 scripts/works-cited.py`. Bump `?v=` on every
   shared script that changes.

## 7. Open questions for Sean

1. **Voicing in Stages A-B:** Gordon's three sung parts (closest to the books), or piano SATB from the start?
2. **Sung answers:** must Q2 / Q5 be scored by microphone, or is a self-check (hear the answer, mark yourself) enough at first?
3. **Supertonic:** keep Gordon's order (ii last), or bring ii in at Stage B for students who also follow Hutchinson ch. 9 in class?
4. **One page or several:** tool 1 with modes (bass lines, tonality by harmony, improvise), or separate pages in the sidebar?
5. **Progress:** localStorage only (like the drills), or log to Supabase via `session-log.js` for class use?
6. **Mullen's videos:** link the Harmonic Loops / Singing Bass Lines videos from The Improving Musician channel, or only play the site's own band?
