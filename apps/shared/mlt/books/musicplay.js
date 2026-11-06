// books/musicplay.js: Reynolds, Valerio, Bolton, Taggart and Gordon, Jump Right In: The Early Childhood Music Curriculum, Music Play (GIA, 1998),
// as steps for mlt-walk.js. Format in mlt-walk.js's header.
// Pages are the PRINTED page numbers: printed = PDF page - 4 (checked against the page footers at PDF 14 = p. 10, 15 = p. 11, 19 = p. 15 and the
// contents list: Part 6 begins p. 22 = PDF 26). The text cache is OCR and noisy; only what reads clearly is entered. UNVERIFIED: anything marked so.
// Entered so far: Foreword, Parts 1-3 (pp. 1-15). Not entered: Part 4 (pp. 16-21, movement), Part 5 (songs and chants), Part 6 (pp. 22-35, tonal and
// rhythm pattern tables), Part 7 (monitoring chart), Part 8 (starting classes), Part 9 (the 56 selections, pp. 43+), glossary.
(function (global) {
  "use strict";
  var B = global.MLTBooks = global.MLTBooks || {};
  B.musicplay = {
    id: "musicplay", title: "Jump Right In: Music Play", author: "Reynolds, Valerio, Bolton, Taggart and Gordon", year: 1998,
    note: "The Early Childhood Music Curriculum, Guide for Parents, Teachers and Caregivers (GIA). Birth to age nine, after Gordon's A Music Learning Theory for Newborn and Young Children (1997). 56 short songs and chants, most without words, each with movement content and activities for the three types of preparatory audiation (acculturation, imitation, assimilation). Page numbers are the book's printed numbers; entered so far: the Foreword and Parts 1-3.",
    parts: [
      { id: "p1", title: "Foreword and Parts 1-3: The ideas", page: "1", units: [
        { id: "intro", title: "Foreword and Part 1: Introduction to Music Development", page: "1",
          steps: [
            { id: "intro-foreword", title: "Foreword (Gordon): why early music matters", page: "1–2", phase: "plan",
              teacher: "Gordon argues that early childhood is a critical period for the brain's connections, and that a child with no chance to build a music listening vocabulary loses that hearing sense to other senses, which later teaching cannot fully offset. The aim is not professional musicians but adults at ease with music who may guide their own children.",
              book: ["Foreword by Edwin E. Gordon", "Claim: critical periods, prenatal and early childhood (research outlined in Part 1)"] },
            { id: "intro-part1", title: "Introduction to Music Development", page: "3–5", phase: "plan",
              teacher: "The authors cite neurological research on critical periods (the book names Wiesel and Hubel's 1960 kitten experiment), say the home is a child's first school and parents the first teachers, and set the purpose of the curriculum: to help preschool and music teachers see why early music matters and how to guide it informally, the way parents already guide speech. Language is the model: listening, speaking, reading, writing vocabularies in that order. Informal guidance must not be delayed into formal instruction too long, and young children are not taught as small adults. School music, once or twice a week, is called too little to make up for what was missed.",
              book: ["Wiesel and Hubel kitten example", "Four vocabularies in order: listening, speaking, reading, writing", "Statement of purpose of Jump Right In"] }
          ] },
        { id: "part2", title: "Part 2: Music Development and Music Play", page: "6",
          steps: [
            { id: "part2-aptitude", title: "Each child has it: music aptitude", page: "6–7", phase: "plan",
              teacher: "Every child is born with some music aptitude, normally distributed (the book gives about 68 percent average, 16 percent high, 16 percent low). It cannot be predicted by genetic study. It is developmental from birth to about age 9, shaped by the music exposure the child gets, and stabilizes at 9. Before 9 it can be kept or raised by a rich music environment.",
              book: ["Normal distribution of aptitude: 68 / 16 / 16 percent", "Developmental aptitude birth to age 9, stabilizing at 9 (Gordon, 1997)"] },
            { id: "part2-language", title: "Language development as an analogy; similar process, different content", page: "7–8", phase: "plan",
              teacher: "A child builds a listening vocabulary, then babbles and plays toward a speaking vocabulary, is guided through imitation, repetition, exploration and improvisation, later learns to read and write. Music follows the same order, but the thought is audiation, not language: hearing and comprehending music when the sound is not, or never was, physically present (Gordon, 1997, p. 11 as quoted).",
              book: ["Audiation quotation from Gordon (1997, p. 11)", "Play games: you-make-this-noise, I-make-that-noise"],
              student: { type: "tonal-echo", set: "major", modes: ["echo"], say: "A babbling game: listen to the pattern, then make your own answer. Copy it or play with it." } },
            { id: "part2-babble", title: "Music babble; unstructured and structured guidance", page: "8–9", phase: "plan",
              teacher: "Two kinds of music babble: tonal babble (experimenting with pitch until the child's songs duplicate the keyality and tonality of songs heard) and rhythm babble (experimenting with durations until meter and tempo match). A child exits babble when objectively duplicating them, not on a fixed timetable; the two exits may come at different times. Lessons on an instrument come after both exits. Adults help with unstructured guidance (singing and chanting to the child, moving freely, in many tonalities and meters, repeatedly) and structured guidance.",
              book: ["Tonal babble and rhythm babble (Gordon, 1997)", "Exiting babble: duplicating keyality / tonality, meter / tempo"] },
            { id: "part2-prep", title: "Preparatory audiation: types and stages (summary chart)", page: "9", phase: "plan",
              teacher: "Three types and seven stages. Acculturation, birth to age 2-4: Stage 1 Absorption, Stage 2 Random Response, Stage 3 Purposeful Response. Imitation, age 2-4 to 3-5: Stage 4 Shedding Egocentricity, Stage 5 Breaking the Code. Assimilation, age 3-5 to 4-6: Stage 6 Introspection, Stage 7 Coordination. Ages are the chart's, and as the book says they depend on the music support a child gets.",
              book: ["Chart: Acculturation (Absorption, Random Response, Purposeful Response)", "Imitation (Shedding Egocentricity, Breaking the Code)", "Assimilation (Introspection, Coordination)", "Footnote: full description in Gordon's A Music Learning Theory for Newborn and Young Children (GIA, 1997)"] },
            { id: "part2-reenter", title: "Re-entering the world of music play; imitation as a readiness", page: "10–11", phase: "plan",
              teacher: "Adults are asked to treat music and movement as a never-ending game played alone or with others (the book quotes Pond, 1992, p. 40). Imitation is the tool children use to master music syntax, so they need models who themselves play with music and movement; but mere imitation is not enough, and the aim is to move toward child-initiated music and movement play and true understanding.",
              book: ["Pond (1992) quotation on awareness of sound", "Play: children understand the world, develop self-worth and learn to audiate through play"] }
          ] },
        { id: "part3", title: "Part 3: Guiding Music Development Using Music Play Materials", page: "12",
          steps: [
            { id: "part3-materials", title: "What the materials are", page: "12", phase: "plan",
              teacher: "The Guide holds notation for 56 selections, suggested pattern guidance and at least three activities each, for children from birth to age nine, with a matching audio-cassette or CD. Plans are organised three ways: activities for acculturation, imitation and assimilation; suggested tonal or rhythm patterns; and movement activities that let children coordinate breathing with their tonal, rhythm and movement responses. Songs are grouped by tonality (Major, Harmonic Minor, Aeolian, Dorian, Mixolydian, Phrygian, Lydian, Locrian); chants by meter (Usual Duple, Usual Triple, Unusual Paired, Unusual Unpaired, Multimetric).",
              book: ["56 music selections", "Tonality list: Major, Harmonic Minor, Aeolian, Dorian, Mixolydian, Phrygian, Lydian, Locrian", "Meter list: Usual Duple, Usual Triple, Unusual Paired, Unusual Unpaired, Multimetric", "Unusual paired / unpaired described (Gordon, 1997, p. 122)"] },
            { id: "part3-without-words", title: "Songs and chants without words; with words", page: "12–14", phase: "plan",
              teacher: "Selections without words let adult and child interact with the music itself (tonality, meter) rather than with the text, and give young children many tonalities and meters to absorb, much as they hear many words around them; music-only presentation also removes language cues so responses are musical. Selections with words add variety and a more traditional way to respond; their activities have the same aim.",
              book: ["Purpose of songs and chants without words", "Purpose of songs and chants with words"] },
            { id: "part3-page-plan", title: "How each selection is laid out; the three goals", page: "14–15", phase: "plan",
              teacher: "Each selection gives: title, notation and words, the music content (tonality, meter, other elements), the movement content (the four movement types of Part 4), materials, and activities for each of the three types of preparatory audiation, with transitions to pattern guidance. Major and Harmonic Minor songs and Usual Duple / Triple chants have a second page of suggested tonal or rhythm patterns (acculturation, imitation, imitation and assimilation). The authors recommend three goals for a leader: build a repertoire of movement, of songs and chants, and of tonal and rhythm patterns. The book points to Ring the Bells (p. 50), Winter Day (p. 58), Follow Me (p. 78) and Rolling (p. 86) as examples of these plans; page numbers read off the OCR, unverified.",
              book: ["Numbered list of what each selection includes (1-9)", "Examples named: Ring the Bells, Winter Day, Follow Me, Rolling", "Three goals: movement, songs and chants, tonal and rhythm patterns"],
              student: { type: "tonal-echo", set: "major", modes: ["echo", "rest"], say: "Sing the pattern, then finish on the resting tone." } }
          ] }
      ] },
      { id: "p2", title: "Parts 4-9: Repertoire, patterns and the 56 selections (not entered yet)", page: "16", units: [
        { id: "part4", title: "Part 4: Developing a Repertoire of Movements", page: "16" },
        { id: "part5", title: "Part 5: Developing a Repertoire of Songs and Chants", page: "21" },
        { id: "part6", title: "Part 6: Developing a Repertoire of Tonal and Rhythm Patterns (Tables 1.1-6.2)", page: "22" },
        { id: "part7", title: "Part 7: Monitoring Tonal and Rhythm Music Development (Table 7)", page: "36" },
        { id: "part8", title: "Part 8: How to Begin Early Childhood Music Classes", page: "39" },
        { id: "part9", title: "Part 9: Songs, Chants, Tonal Patterns, Rhythm Patterns and Activities", page: "43" }
      ] }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
