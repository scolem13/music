# Exercise Builder

- Page: `theory/exercise-builder.qmd` (Theory sidebar, after Theory Drills). App: `builder.js` (`ExerciseBuilder`). Settings live in the
  address (`?ch=7,16,17&types=rn,cad,period,fill,melodic,drills&n=10&seed=4821&input=inline`); each item is made under a seeded
  `Math.random` (seed × 1000 + index), so one link = one set for everyone. Print: `@media print` hides the controls; the answer key
  (`.ex-key`) prints only with `body.ex-with-key`.
- `chorale.js` (`Chorale.make`): four-bar 4/4 phrases from chapter-tagged motifs (`BEGIN`, `PD`, `END`; a motif is used up to the highest
  chapter asked for, 3× as likely when its chapter was asked for), voiced by `satb.js`, spelled from the chord, and thrown away if
  `VLCheck` finds an error (also across the join of two phrases). Cadence (`cadenceOf`) and period are read from the voiced result.
  `normRN` / `rnMatches` grade typed numerals (Cad64 / V64 accepted for a cadential I64). `abc({ labels, numbers, blank, fill })`.
- `vl-check.js` (`VLCheck.check`): ranges, crossing, spacing, chord tones, completeness, doubled leading tone / 7th, parallel 5ths /
  8ves / unisons (errors); unresolved leading tone or 7th, direct 5ths / 8ves (warnings). The start of the voice-leading checker for
  ch. 26–29.
- `answer-input.js` (`AnswerInput`): how notes are written as an answer. Kinds are registered (`AnswerInput.register(kind, { label,
  create })`); only `inline` (typed note names with octaves) exists. A Notation-page kind (like Dictation's remote window) plugs in
  there and appears in the page's "Notation answers" menu and `input=`.
- `satb.js` change (v2): an inverted chord's upper voices are the other chord tones plus one doubling (it used to double as if the
  bass were the root, so V6 / V65 / V43 found no voicing and held the chord before).
- Tests: `node tests/lessons/exercises.test.js` (checker on planted errors; 3000 chorales re-checked, notes vs numerals by hand,
  cadences and periods re-derived, ABC voices), `node tests/lessons/exercise-builder.cdp.js` (after rendering the page).
- Not yet: real Bach chorales (phase 2: "When in Rome" analyses), augmented sixths and NCTs inside chorales, double periods / phrase
  groups / elisions, the Notation-page answer kind.
