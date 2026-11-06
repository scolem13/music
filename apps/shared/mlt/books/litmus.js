// books/litmus.js: Mullen, The Literate Musician: How to Hear, Speak, Think, Read & Write the Language of Music, Student Book 1, revised 2nd ed. (2020),
// as steps for mlt-walk.js. Format in mlt-walk.js's header. STARTED: the outline is the book's table of contents; steps are entered for the
// Introduction and Part II Lessons 2.1, 2.5, 2.6, 3.1 and 3.4 only. No step has activities / student yet (MLTActivities ids to be chosen).
// Pages are the printed page numbers. The text cache (research_notes/mlt-sources/text/The Literate Musician eBook.txt) is NOT one page per
// form feed (its first "page" holds the front matter through Lesson 1.6) and many lines are in a shifted font encoding, so Part I's
// sections are outline only until read from the page images (research_notes/mlt-sources/pages/litmus/).
(function (global) {
  "use strict";
  var B = global.MLTBooks = global.MLTBooks || {};
  B.litmus = {
    id: "litmus", title: "The Literate Musician (Student Book 1)", author: "Andy Mullen", year: 2020,
    note: "Student book, revised 2nd edition. Part I builds audiation (rhythm, harmony, melody) by ear; Part II teaches reading in ten Reading Sequences, each with lessons and Reading Benchmarks. Companion course: The Improving Musician.",
    parts: [
      { id: "intro", title: "Introduction", page: "9", units: [
        { id: "intro-ch", title: "Introduction: music as a language", page: "9–16",
          steps: [
            { id: "intro-language", title: "Music as a language, audiation, breaking the music code", page: "9–10", phase: "plan",
              teacher: "Music can be used to communicate: patterns are the words, given meaning in a tonal or rhythmic context (a tonality or a meter). Thinking in music is called audiation (thought : language :: audiation : music). Tonality splits into melody (horizontal) and harmony (vertical). Learning music is compared with a second language: parts of speech, then sentences, then reading and writing.",
              book: ["Analogy thought:language::audiation:music", "Questions to ask yourself if you are audiating (tonality or meter, aural labels, harmonic progression, chords to play, modulation, transcribing the rhythm)", "Table of nouns, adjectives, verbs, adverbs with a dog example"],
              activities: [],
              student: { type: "activities" } },
            { id: "intro-wpw", title: "Whole-Part-Whole, in language and in music; the musically literate citizen", page: "11–13", phase: "plan",
              teacher: "Good learning is Whole-Part-Whole: the context is presented, the parts are learned one by one, the parts return to the whole. The book's example is a parent teaching a child to mow the lawn; in language we hear whole conversations before speaking words. In music, the first Whole is exposure to many tonalities and meters; the Part is specific patterns; the next Whole puts them in context. Part I outcomes are listed for rhythm (duple and triple) and tonal (major and minor). The book aims at the basic concepts a musical citizen should know.",
              book: ["Whole / Part / Whole diagram", "Lawn-mowing example", "Part I learning outcomes for rhythm and tonal"],
              activities: [],
              student: { type: "activities" } },
            { id: "intro-mlt-use", title: "Music Learning Theory, the Skill Learning Sequence, how to use the book", page: "14–16", phase: "plan",
              teacher: "Gordon's Music Learning Theory is the basis of the book. Discrimination learning (everything given: listen and repeat, aural labels, tonality and meter, read and write familiar patterns) comes before inference learning (same or different, labels for unfamiliar patterns, reading unfamiliar music, composing, theory). The levels weave in and out; they are not followed in a line. The book is not read from beginning to end: learn new content at the Aural/Oral level first, reach moderate success at Partial Synthesis before reading, and spiral to Part II or bridge to inference; navigation symbols mark these. Page numbers of the end-of-intro notes to teachers not yet entered. Unverified: the exact page of the list of symbols.",
              book: ["Skill Learning Sequence chart (discrimination and inference levels)", "Whole-Part-Whole for Student Book 1", "How to use this book (three principles), navigation symbols", "Note to teachers"],
              activities: [],
              student: { type: "activities" } }
          ] } ] },
      { id: "p1", title: "Part I: Foundations of Musical Thought", page: "17", units: [
        { id: "s1", title: "Section 1: The Whole of Music (twelve tonalities and meters, one page each)", page: "19–31" },
        { id: "s2", title: "Section 2: Rhythm (Lessons 1–13 and Assessment)", page: "33–50" },
        { id: "s3", title: "Section 3: Harmony (Lessons 1–10 and Assessment)", page: "51–67" },
        { id: "s4", title: "Section 4: Melody (Lessons 1–8 and Assessment)", page: "69–79" } ] },
      { id: "p2", title: "Part II: Reading Musical Thought", page: "81", units: [
        { id: "rs1", title: "Reading Sequence 1 (Lessons 1.1–1.6, Benchmark 1)", page: "83–101" },
        { id: "rs2", title: "Reading Sequence 2", page: "102–120",
          steps: [
            { id: "l2-1", title: "Lesson 2.1 Introduction to reading stepwise patterns, major tonality", page: "103", phase: "lsa",
              teacher: "Having audiated and performed harmonic patterns and stepwise acculturation patterns, students now read the stepwise patterns the same way: familiar patterns in their familiar order (FPIFO). A stairs-versus-elevator analogy: stepwise patterns climb the pitches one step at a time, reading harmony skips steps. Students point to the notation while echoing the Patterns Only video and while singing along with the Tonal Pattern Recital video from Part I.",
              book: ["Sequence 2 at a glance (tDRM; keys G, F, Eb; 2/4, 4/4, 6/8, 3/4)", "Stairs vs. elevator analogy", "Stepwise FPIFO in F-DO and Eb-DO"],
              activities: [],
              student: { type: "activities" } },
            { id: "l2-5", title: "Lesson 2.5 Enrhythmic patterns in duple meter (4/4)", page: "113–114", phase: "lsa",
              teacher: "Enrhythmic patterns sound the same but are notated differently (like one name spelled several ways). The first way to see this is by how many macrobeats are in a measure: the same eight rhythm patterns read in 2/4 in Lesson 1.1 are now read in 4/4, with the bar line removed and four macrobeats in a measure. Pairs of microbeats may be beamed together. Students then try writing the patterns.",
              book: ["Enrhythmic defined, with the spelling-of-Cameron example", "The eight patterns of Lesson 1.1 in 2/4 and in 4/4", "Writing exercise"],
              activities: [],
              student: { type: "activities" } },
            { id: "l2-6", title: "Lesson 2.6 Enrhythmic patterns in triple meter (3/4)", page: "115", phase: "lsa",
              teacher: "As in Lesson 2.5, the same patterns can be notated with more macrobeats in a measure; here the triple patterns are read in 3/4. Rest of the page not yet read: unverified.",
              book: ["Triple patterns in 3/4 (details not yet entered)"],
              activities: [],
              student: { type: "activities" } }
          ] },
        { id: "rs3", title: "Reading Sequence 3", page: "121–145",
          steps: [
            { id: "l3-1", title: "Lesson 3.1 How to find DO and two new DO-signatures (D-DO and C-DO)", page: "122–124", phase: "lsa",
              teacher: "Finding DO from a key signature, regardless of key: with flats, the second-to-last flat is DO (the last flat is FA); with sharps, the last sharp is TI and DO is a half step above. Count stepwise patterns up or down to DO. Knowledge and skill from F-DO, Eb-DO and G-DO transfer to the new signatures once students see the visual patterns repeat. Sequence 3 covers tDRMFSL and the tonic chord, keys C, D, Eb, F, G.",
              book: ["Sequence 3 at a glance", "Rules for finding DO (flats, sharps) with FA / MI / TI examples", "Transferring knowledge to new DO-signatures"],
              activities: [],
              student: { type: "activities" } },
            { id: "l3-4", title: "Lesson 3.4 New stepwise patterns in major tonality (MFM, RMFS, SLS)", page: "132–135", phase: "lsa",
              teacher: "Two new pitches, FA and LA, learned in three familiar patterns: MI FA MI, RE MI FA SO, SO LA SO, starting in Eb-DO. None contains DO, so students ground the tonality first (Tonal Sequence, then the tonic harmonic patterns) and use the tonic chord as a visual problem-solving tool (DO, MI, SO on lines or spaces). Read them in familiar order and in unfamiliar orders (3 2 1; 1 3 2; 2 3 1; 2 1 3; 3 1 2). Then the new patterns are combined with DRM, MRD, DTD sets and read in other keys. Details after the first two pages unverified.",
              book: ["MFM, RMFS, SLS in Eb-DO", "Pattern sets combining DRM, MRD, DTD with the new patterns", "Same patterns in other keys"],
              activities: [],
              student: { type: "activities" } }
          ] },
        { id: "rs4", title: "Reading Sequence 4", page: "146–175" },
        { id: "rs5", title: "Reading Sequence 5", page: "176–198" },
        { id: "rs6", title: "Reading Sequence 6", page: "199–216" },
        { id: "rs7", title: "Reading Sequence 7", page: "217–234" },
        { id: "rs8", title: "Reading Sequence 8", page: "235–261" },
        { id: "rs9", title: "Reading Sequence 9", page: "262–282" },
        { id: "rs10", title: "Reading Sequence 10", page: "283–298" } ] }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
