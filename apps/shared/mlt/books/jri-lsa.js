// books/jri-lsa.js: Gordon, Jump Right In: The Music Curriculum, Reference Handbook for Using Learning Sequence Activities
// (2001 revision, GIA), as steps for mlt-walk.js. Format in mlt-walk.js's header.
// Pages are the PRINTED page numbers (PDF page - 5 from p. 1 on; front matter is roman: "vi" = Why use LSAs, then How to Jump Right In).
// Entered so far: front matter, Introduction, Part 1 (organization), Part 2 (using the materials), start of Part 3 (to the tonal sequence).
// NOT entered yet: rest of Part 3 (class patterns, dialogue patterns, individual patterns, Specific Instructions for Tonal Units 1-42,
// A Quick Course on Rhythm, rhythm class/individual patterns, Specific Instructions for Rhythm Units 1-42, Glossary). Page numbers
// of those sections are not given here because the contents page's numbers were not read reliably from the OCR (unverified).
(function (global) {
  "use strict";
  var B = global.MLTBooks = global.MLTBooks || {};
  B["jri-lsa"] = {
    id: "jri-lsa", title: "Jump Right In: Reference Handbook for LSAs", author: "Edwin E. Gordon", year: 2001,
    note: "Gordon's handbook for Learning Sequence Activities: ten minutes at the start of class, tonal and rhythm patterns taken from four register books (42 tonal and 42 rhythm units). Part 1 is how the register books are organized, Part 2 how to use them, Part 3 how to teach the patterns unit by unit.",
    parts: [
      { id: "p0", title: "Front matter: how to jump right in", page: "vi", units: [
        { id: "start", title: "Why use LSAs, and a quick start", page: "vi",
          steps: [
            { id: "start-why", title: "Why use Learning Sequence Activities?", page: "vi", phase: "plan",
              teacher: "LSAs give a structured, systematic way to teach music, need no more than 10 minutes of a class or rehearsal, order learning so students build on past audiation, build tonal and rhythm pattern vocabularies, let you teach to individual differences in a group, allow valid measurement and evaluation, and provide accountability.",
              book: ["Bulleted list of what LSAs do (ordered learning, pattern vocabularies, individual differences, research base, assessment, accountability)"] },
            { id: "start-tonal", title: "A Quick Guide to Teaching Tonal Patterns", page: "1–2", phase: "lsa",
              teacher: "Spend no more than 10 minutes. Say little. Sing the tonal sequence (neutral syllable BUM, in D major in the example) while students only audiate it, two or three times, to establish keyality and tonality. Then teach two class patterns on BUM and echo them as a group after a pause and a breath gesture; then individual patterns from the first page of Tonal Register Book 1 (E, M, D), alternating class and individual. Do not put students on the spot; stop if they get tense. Do not teach tonal and rhythm patterns on the same day (ideally alternate weeks).",
              book: ["Tonal sequence in D major (notated)", "Two class patterns (major)", "Three individual patterns E / M / D from Tonal Register Book 1, p. 1", "14 numbered steps"],
              activities: ["class-individual-gestures", "the-pause", "separate-pitches"],
              student: { type: "tonal-echo", set: "major", modes: ["echo", "first", "rest"], say: "Listen to the pattern. Wait. Breathe. Sing it back on BUM." } },
            { id: "start-rhythm", title: "A Quick Guide to Teaching Rhythm Patterns", page: "3", phase: "lsa",
              teacher: "Same general guidelines with one exception: still take a deep breath, but do not pause between your performance and the students'. Keep a steady tempo. Use BAH (not BUM). Chant the rhythm sequence in usual duple a few times, pausing two macrobeats between renditions. Class patterns: the breath gesture is on the fourth macrobeat, then the next pattern begins on the next macrobeat. Then individual patterns from Rhythm Register Book 1.",
              book: ["Rhythm sequence in usual duple (notated)", "A class pattern (usual duple)", "Individual patterns from the first page of Rhythm Register Book 1", "Arrow marks the fourth macrobeat for the breath"],
              activities: ["rhythm-breath-gesture"],
              student: { type: "rhythm-echo", set: "duple", say: "Keep the beat. Breathe on the fourth macrobeat. Chant it back on BAH, no pause." } }
          ] } ] },
      { id: "p-intro", title: "Introduction", page: "4", units: [
        { id: "intro", title: "Introduction", page: "4",
          steps: [
            { id: "intro-what", title: "Two components, three readinesses, three purposes", page: "4", phase: "plan",
              teacher: "Jump Right In has learning sequence activities (audiation of patterns together with music skills) and classroom activities (performing literature). LSAs take no more than 10 minutes at the start of class; classroom activities fill the rest. Three readinesses are needed: a singing voice, free-flowing continuous movement, and legs/feet for macrobeats with arms/hands for microbeats; otherwise use the Early Childhood curriculum first. The handbook (1) describes how the material is organized, (2) explains how to use it, (3) explains how to teach tonal and rhythm patterns.",
              book: ["Definition of audiation", "Three readinesses", "Three purposes of the handbook"],
              activities: ["starting-lsas"] },
            { id: "intro-theory", title: "Why no music theory early", page: "4–5", phase: "plan",
              teacher: "Students learn to read and write patterns through audiating tonal and rhythm syllables before they learn line and space names, accidentals, note values, scales or key signatures: the sounds before the symbols. Theory can be taught when needed, but premature symbols delay audiation. Adapt the suggested techniques to your own personality and teaching style." }
          ] } ] },
      { id: "p1", title: "Part 1: Organization of the Materials", page: "7", units: [
        { id: "p1-registers", title: "The register books", page: "7",
          steps: [
            { id: "p1-books", title: "Four register books; units, sections, criteria", page: "7", phase: "plan",
              teacher: "Tonal Register Books 1 and 2 (Units 1–21, 22–42) and Rhythm Register Books 1 and 2 (Units 1–19, 20–42). Each unit has one to three sections, each section one to three criteria. The books hold the patterns and the permanent record of each student; one tonal and one rhythm register book per class or group. Units are in sequential order by skill learning and content/context theory: neutral syllable before tonal/rhythm syllables, audiation before notation, imitation before creativity; major and minor before other tonalities; usual duple and triple before other meters. Teach units, sections and criteria in the order printed.",
              book: ["The four register books and their unit ranges", "Skill / content / context defined briefly", "Each page: directions on top, a Seating/Evaluation Chart below"],
              activities: ["objective-pacing"] },
            { id: "p1-tonal-page", title: "Reading a tonal criterion page (Illustrations 1–3)", page: "8–11", phase: "plan",
              teacher: "Top of page: unit, section, criterion; directions for the tonal sequence and class (or dialogue) patterns; how you and the students perform the individual patterns. The individual patterns sit on a staff with key signature; DO, LA, RE or SO written after the key signature marks the resting tone and so the tonality (major, minor, Dorian, Mixolydian). Vertical lines and note-head style say nothing about rhythm. E, M, D = easy, moderately difficult, difficult. Exceptions: two or more patterns per level (Unit 7), or two numbered sets in different tonalities with no E/M/D (Unit 6: D major and D minor).",
              book: ["Illustration 1: Tonal Unit 1, Section A, Criterion 1 (sing tonal sequence and class patterns in D major on BUM; teacher sings pattern, students sing only the first pitch)", "Illustration 2: Tonal Unit 7, Section A, Criterion 1 (C major, two patterns per level)", "Illustration 3: Tonal Unit 6, Section A, Criterion 1 (students name the tonality of each series; no sequence or class patterns)", "Illustration 4: blank Seating/Evaluation Chart, 48 boxes"],
              student: { type: "tonal-echo", set: "major", modes: ["echo", "first", "name"], say: "Easy, moderate, difficult: echo each pattern in turn." } },
            { id: "p1-chart", title: "Using the Seating/Evaluation Chart (Illustrations 5–6)", page: "12–14", phase: "plan",
              teacher: "Chart boxes follow the seating plan; each shows the student's name and percentile rank on the aptitude test (test acronym such as PMMA, IMMA, AMMA, MAP written at the top). Mark high and low scorers by a line above or below the name, or colour code; in a class of 30 expect about 20 average, 5 high, 5 low. Do not seat students grouped by aptitude: place high-aptitude students among others as models. For 49–96 members tape two charts together. A single vertical line = success in the teaching mode; crossed lines = success in the evaluation mode; one set of crossed lines for the easy pattern, two for moderate, three for difficult.",
              book: ["Illustration 5: partly completed chart, first-grade class of 30", "Illustration 6: completed chart with marks"],
              activities: ["marking-records"] },
            { id: "p1-modes", title: "Teaching mode and evaluation mode", page: "12, 15", phase: "plan",
              teacher: "Teaching mode: you perform the pattern in duet with the student, listening closely, which builds trust and spares embarrassment. A successful teaching-mode performance earns a single line, so next time that student performs that pattern solo (evaluation mode, no help) and the line is crossed; then the next-level pattern in teaching mode, and so on. A pattern that has passed the evaluation mode becomes part of the student's audiation vocabulary, used later for reading, writing, creating and improvising. Several sessions are usually needed per criterion.",
              activities: ["teaching-evaluation-mode"] },
            { id: "p1-aptitude", title: "Music aptitudes and expectations", page: "15–16", phase: "plan",
              teacher: "Each student is expected to meet his or her potential: low aptitude, the easy pattern; average, easy and moderate; high, all three, in both modes. All learn the easy pattern solo, so the easy pattern is taught before the moderate and the moderate before the difficult. A student ahead of the test prediction may try the next level, without force; a high scorer who achieves low is not excused (low scores may be unreliable, high scores almost never come by chance). Use results only to improve instruction, treat them confidentially." },
            { id: "p1-moving", title: "Moving ahead; marking the chart discreetly", page: "16", phase: "plan",
              teacher: "Move to the next criterion when at least 4 of every 5 students (about 80 percent) achieve their potential on the criterion. Do not worry about the other 20 percent; the group who miss differs from criterion to criterion. Make a master chart of names and percentile ranks only, and copy it onto the register page. Mark the chart when the whole class is performing class patterns, not directly after an individual's turn; several students can be marked at once.",
              activities: ["objective-pacing", "marking-records"] },
            { id: "p1-rhythm-page", title: "Rhythm Patterns: reading a rhythm criterion page (Illustrations 7–9)", page: "17–20", phase: "plan",
              teacher: "Rhythm register books are organized the same way. The page gives information for chanting the rhythm sequence and class/dialogue patterns, then directions and the expected student responses; the meter is shown. A difficulty level usually has two or more patterns, at least two measures combined, separated by measure lines. Exceptions: Unit 6 has two numbered sets, usual duple (2/4) and usual triple (6/8), with no E/M/D; Unit 19 has only one criterion, four measures long, read with rhythm syllables. Two seating charts are needed (tonal and rhythm) because a student's percentile usually differs between the two tests; marking is the same as for tonal patterns.",
              book: ["Illustration 7: Rhythm Unit 1, Section A, Criterion 1 (chant sequence and class patterns in usual duple on BAH; students chant patterns)", "Illustration 8: Rhythm Unit 6, Section A, Criterion 1 (students name the meter of each series)", "Illustration 9: Rhythm Unit 19, Section A, Criterion 1 (teacher assigns patterns to read with rhythm syllables)"],
              student: { type: "rhythm-echo", set: "duple", say: "Echo each pattern on BAH without a pause." } },
            { id: "p1-tonal-seq", title: "Tonal units 1–42: skill and content/context", page: "21–23", phase: "plan",
              teacher: "A table lists each tonal unit's skill and content/context. Book 1: units 1–2 aural/oral then verbal association (tonic and dominant, major and minor); 3 creativity/improvisation-verbal; 4 aural/oral; 5 verbal association; 6 partial synthesis; 7–8 aural/oral and verbal association with tonic and subdominant; 9–14 tonic, dominant and subdominant (aural/oral, verbal association, symbolic association-reading and writing, creativity); 15–16 subtonic functions in Mixolydian and Dorian; 17–19 back in major/minor (partial synthesis, generalization-symbolic, composite synthesis-reading); 20–21 Mixolydian/Dorian (partial synthesis, symbolic association-reading). Book 2: 22–24 Mixolydian/Dorian (generalization, writing, creativity); 25 multitonal/multikeyal aural/oral; 27–29, 32–39 all functions, major and minor; 30–31, 40, 42 multitonal/multikeyal; 26 and 41 composite synthesis-writing. Check exact row order against p. 21–22 before relying on it (unverified: some rows' content cells in the OCR run together).",
              book: ["Table: Tonal Register Book 1, units 1–21", "Table: Tonal Register Book 2, units 22–42"] },
            { id: "p1-rhythm-seq", title: "Rhythm units 1–42: skill and content/context", page: "22–24", phase: "plan",
              teacher: "A table lists each rhythm unit's skill and content/context. Book 1 (units 1–19): macro/microbeats then divisions/elongations in usual duple and triple, through aural/oral, verbal association, generalization, partial synthesis, creativity, symbolic association (reading, writing), composite synthesis-reading; units 16–18 are usual combined. Book 2 (20–42): unusual paired and unpaired meters (20, 22, 31, 35, 37), all functions in usual duple/triple or usual combined, multimetric/multitemporal (25, 39, 41) and the closing generalization-symbolic. Exact row-by-row pairing is unverified from the OCR; check p. 22–24.",
              book: ["Table: Rhythm Register Book 1, units 1–19", "Table: Rhythm Register Book 2, units 20–42"] }
          ] } ] },
      { id: "p2", title: "Part 2: Using the Materials", page: "25", units: [
        { id: "p2-use", title: "Scheduling, aptitude testing, instruction", page: "25",
          steps: [
            { id: "p2-schedule", title: "Scheduling", page: "25", phase: "plan",
              teacher: "LSAs have two purposes: teach students to audiate, and give a basis for achievement in classroom and performance activities. At most 10 minutes at the start of a class or rehearsal, at most three days a week (every other day if the class meets daily). Not the same as vocalises and warm-ups, though they can be combined. Tonal and rhythm LSAs are not taught in the same 10 minutes, on the same day or in the same week: tonal one week, rhythm the alternate week. Tonal and rhythm aspects of songs may be taught together in classroom activities.",
              activities: ["starting-lsas"] },
            { id: "p2-aptitude", title: "Music aptitude testing", page: "25–27", phase: "plan",
              teacher: "Students share one skill but apply it to different content (patterns) within one context depending on aptitude, so every student succeeds. Aptitude is developmental until about age nine, then stabilized. Developmental tests (yearly, ages 5–8): PMMA (K–3), IMMA (grades 1–6), Audie (ages 3–4). Stabilized tests (once, age 9 and up): MAP (grades 4–12) and AMMA (grades 7–12 and college). Tests need separate tonal and rhythm subtests; percentile ranks go on the matching charts. High = 80th–99th, average = 21st–79th, low = 1st–20th percentile, approximate; adjust in groups of under 20, keeping about two-thirds average and one-sixth each high and low. Test scores, not teacher judgement, determine aptitude level.",
              book: ["Chart of high / average / low percentile ranges", "The five recommended tests and their grade ranges"],
              activities: ["aptitude"] },
            { id: "p2-instruction", title: "Instruction: where to start; new students; combined grades", page: "27–29", phase: "plan",
              teacher: "Every new group starts at Tonal Unit 1, Section A, Criterion 1 and Rhythm Unit 1, Section A, Criterion 1; age alone never justifies skipping, and a skip must be verified by evaluation-mode performance of the skipped patterns. Groups without readiness need informal singing and chanting in major, harmonic minor, duple and triple first. A student in both general music and a performance group takes LSAs only in the general music class. New students perform only class patterns until the next aural/oral unit; experienced students can mentor them. In combined grades split the 10 minutes between levels; everyone performs class patterns, individual patterns only in their own group's turn.",
              activities: ["starting-lsas"] },
            { id: "p2-coordinate", title: "Coordinating LSAs with classroom and performance activities", page: "29–30", phase: "plan",
              teacher: "LSAs are taught separately but must be used in classroom and performance activities: the goal is musical understanding of the repertoire. Whole-part-whole: first whole = informal exposure to tonalities and meters in literature; part = LSAs teach tonal and rhythm patterns with a skill; second whole = students use what they learned to understand the literature. Do not pick literature for the patterns, nor patterns for the literature. A tonality and meter must be introduced in literature before patterns in it are taught, and a skill taught on patterns before it is used with literature.",
              activities: ["label-context-functions"] },
            { id: "p2-mlt", title: "Music Learning Theory outline", page: "31", phase: "plan",
              teacher: "The levels of learning behind the unit sequence. Discrimination learning: aural/oral, verbal association, partial synthesis, symbolic association (reading, writing), composite synthesis (reading, writing). Inference learning: generalization (aural/oral, verbal, symbolic; reading, writing), creativity/improvisation (aural/oral, symbolic; reading, writing), theoretical understanding. Not all of music learning theory could be included; all 42 tonal and 42 rhythm units take about nine academic years with an experienced teacher and a realistic schedule.",
              book: ["Outline of the discrimination and inference levels"] }
          ] } ] },
      { id: "p3", title: "Part 3: Teaching Patterns in LSAs", page: "32", units: [
        { id: "p3-defs", title: "Definitions, preparing, tonal sequence", page: "32",
          steps: [
            { id: "p3-defs-step", title: "Brief definitions: sequence, class / dialogue patterns, individual patterns", page: "32", phase: "plan",
              teacher: "Three components. A tonal sequence (BUM or syllables) establishes tonality and keyality at the start of a criterion and again whenever the class loses it; a rhythm sequence (BAH or syllables) establishes tempo and meter. Class patterns are ones you improvise and the whole class repeats; dialogue patterns you perform back and forth to yourself, not repeated. Learn at least two class patterns by heart (tonic and dominant) in major and harmonic minor, and two (macro/microbeat and division) in usual duple and triple. Individual patterns are the heart of the process: one-to-one, with records kept. Class and dialogue patterns stay in the tonality or meter and the functions of the unit's individual patterns.",
              activities: ["class-individual-gestures"] },
            { id: "p3-prep", title: "Preparing for class; range and key of tonal patterns", page: "33", phase: "plan",
              teacher: "Read the register page; have sequence and class/dialogue patterns in memory; audiate every individual pattern before class with little aid from the notation. Tonal pattern range is typically under an octave (D above middle C to the D above), tessitura a major sixth (D to B). You may transpose, but not lower than D above middle C for unchanged voices, and if one pattern in a criterion is transposed all must be; the octave may change for some students, the tonality never.",
              book: ["Range D to D, tessitura D to B above middle C"] },
            { id: "p3-tonal-seq", title: "The tonal sequence", page: "33–34", phase: "plan",
              teacher: "Establish tonality and keyality before the patterns, once or several times. Sung at double the tempo of the patterns; students only audiate it (never sing along or after). Gesture clearly that you are performing the sequence. When the page gives no tonal sequence, use none. (Page 34 continues past this point; not entered.)",
              student: { type: "tonal-echo", set: "major", modes: ["first", "rest"], say: "Audiate the sequence; do not sing. Then name the home tone." } }
          ] } ] }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
