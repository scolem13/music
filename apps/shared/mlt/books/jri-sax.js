// books/jri-sax.js: Grunow, Gordon and Azzara, Jump Right In: The Instrumental Series, Teacher's Guide for Recorder (rev. 1999,
// GIA), Book One, followed section by section but taught on saxophone. A skeleton: each section's three parts with what the
// book does there (rote song, executive skills and new notes, pattern instruction, home study), the page, and the activity.
//
// Keys: the recorder book works in G-DO, B♭-DO, G-LA and F-DO (Book Two adds C-DO, D-LA). On saxophone the class plays in
// the concert keys in KEYMAP; a recorder key with null has no saxophone key chosen yet (its fingerings are not shown).
// The fingering widget (mlt-walk.js, type "sax") turns "B♭-DO: DO, TI" into concert pitches, then written pitches for the
// chosen saxophone (alto, tenor, baritone: SaxChart.INSTRUMENTS), and draws the fingerings from SaxChart.
//
// Section: { id, unit, sec, page (printed: PDF page - 1), song: [title, tune id], context, parts: { 1, 2, 3 } } where a part is
//   { page, teacher, book: [what is printed], keys: [recorder keys of the new or practised notes], notes: { "G-DO": [syllables] },
//     student: an mlt-walk student activity }
(function (global) {
  "use strict";
  var KEYMAP = { "G-DO": "B♭-DO", "B♭-DO": "E♭-DO", "G-LA": "C-LA", "D-LA": "G-LA", "F-DO": null, "C-DO": null };
  function concert(k) { return KEYMAP[k] || null; }
  function S(id, unit, sec, page, song, context, p1, p2, p3) { return { id: id, unit: unit, sec: sec, page: page, song: song, context: context, parts: { 1: p1, 2: p2, 3: p3 } }; }
  function ks(text, notes) { return { notes: notes, text: text }; }
  // Tracks from the JRI Book 1 CD (MLTRecordings ids jri1-1-NN) per section part. The CD in the collection is the French horn
  // book's, so its songs are in the horn's key, not the class's concert key: for listening and singing, not for playing along.
  var REC = {
    "1A": { 1: ["jri1-1-01", "jri1-1-02"], 2: ["jri1-1-03", "jri1-1-04"], 3: ["jri1-1-01", "jri1-1-03", "jri1-1-04"] },
    "1B": { 1: ["jri1-1-05", "jri1-1-06"], 2: ["jri1-1-07"], 3: ["jri1-1-05", "jri1-1-07"] },
    "2A": { 1: ["jri1-1-09", "jri1-1-10"], 2: ["jri1-1-11", "jri1-1-12", "jri1-1-13"], 3: ["jri1-1-09", "jri1-1-13"] },
    "2B": { 1: ["jri1-1-14", "jri1-1-15"], 2: ["jri1-1-16", "jri1-1-17", "jri1-1-18", "jri1-1-19"], 3: ["jri1-1-14", "jri1-1-17"] },
    "3A": { 1: ["jri1-1-20", "jri1-1-21"], 2: ["jri1-1-22", "jri1-1-23", "jri1-1-24", "jri1-1-25"], 3: ["jri1-1-20", "jri1-1-25"] },
    "3B": { 1: ["jri1-1-26", "jri1-1-27"], 2: ["jri1-1-28", "jri1-1-29", "jri1-1-30", "jri1-1-31", "jri1-1-32", "jri1-1-33", "jri1-1-34", "jri1-1-35"], 3: ["jri1-1-26", "jri1-1-32", "jri1-1-35", "jri1-1-36"] }
  };
  var SECTIONS = [
    S("1A", 1, "A", "36–40", ["Major Duple", "major-duple"], "major, duple",
      { page: "36", teacher: "Establish tonality and meter; teach the rote song “Major Duple” (melody, then bass line). Begin coordination and rhythm readiness (movement to macro- and microbeats)." },
      { page: "37–39", teacher: "Begin executive skills: practice tips, forming the embouchure, the connected (“doo”) and separated (“too”) styles of articulation with the voice only; students tell connected from separated.", book: ["Articulation patterns, connected and separated (voice only)"] },
      { page: "40", teacher: "Issue Student Book One and the home-study CD; assignment: the note to parents, practice tips, the CD items for “Major Duple” and the two articulations." }),
    S("1B", 1, "B", "41–44", ["Major Triple", "major-triple"], "major, triple",
      { page: "41", teacher: "Review “Major Duple” (audiate it silently); teach “Major Triple”; songs from Musical Enrichment; coordination and rhythm readiness." },
      { page: "42–43", teacher: "Executive skills: practise the fingerings for DO and TI (not yet played); embouchure and articulation with the airstream only (“wind patterns”), audiating a familiar song so the air is proportioned.", fing: ks("Practise the fingerings (no sound yet)", { "G-DO": ["DO", "TI"] }) },
      { page: "44", teacher: "Home study: “Major Triple” melody and bass, wind patterns." }),
    S("2A", 2, "A", "45–49", ["Minor Duple", "minor-duple"], "minor, duple",
      { page: "45", teacher: "Review the major songs; teach “Minor Duple”; Musical Enrichment; coordination and rhythm readiness." },
      { page: "46–48", teacher: "Executive skills: fingerings for DO and TI; articulation with voice, airstream, instrument with no fingers. Tonal pattern echoes, aural/oral and verbal association (singing); connected and separated articulation on DO.", fing: ks("DO and TI", { "G-DO": ["DO", "TI"] }), lsa: "tonal-major" },
      { page: "49", teacher: "Home study: “Minor Duple”; articulation on DO; playing in tune with the CD." }),
    S("2B", 2, "B", "50–55", ["Minor Triple", "minor-triple"], "minor, triple",
      { page: "50", teacher: "Sing a familiar rote song; teach “Minor Triple”; Musical Enrichment." },
      { page: "51–54", teacher: "Fingerings for DO, TI, RE and MI; articulation on DO and TI; melodic patterns on DO and TI (students echo immediately); rhythm pattern echoes, aural/oral and verbal association.", fing: ks("DO, TI, RE, MI", { "G-DO": ["DO", "TI", "RE", "MI"] }), lsa: "rhythm-duple" },
      { page: "55", teacher: "Home study: “Minor Triple”; melodic patterns on DO and TI." }),
    S("3A", 3, "A", "56–63", ["Pierrot", "pierrot"], "major, duple",
      { page: "56", teacher: "Establish tonality and meter; teach “Pierrot”; Musical Enrichment." },
      { page: "57–62", teacher: "Fingerings DO, TI, RE; tonal and rhythm pattern echoes; verbal association: DO is the resting tone in major (proper names: tonality); articulation on DO and TI moving in duple and triple; melodic patterns on DO, TI and RE.", fing: ks("DO, TI, RE", { "G-DO": ["DO", "TI", "RE"] }), lsa: "tonal-major" },
      { page: "63", teacher: "Home study: “Pierrot”; melodic patterns on DO, TI, RE." }),
    S("3B", 3, "B", "64–70", ["Go Tell Aunt Rhody", "go-tell-aunt-rhody"], "major, duple",
      { page: "64", teacher: "Musical Enrichment; teach “Go Tell Aunt Rhody”." },
      { page: "64–70", teacher: "Review DO, TI, RE, add MI; begin the fingerings for the second DO and its TI (not played until Unit 4A). Rhythm: DU DE means duple, DU DA DI triple (proper names: meter). Melodic patterns on DO to MI. First performance of “Major Duple” (patterns from it, then the whole song, connected and separated), and SO for its bass line.", fing: ks("DO to MI; the second key's DO and TI", { "G-DO": ["DO", "TI", "RE", "MI", "SO,"], "B♭-DO": ["DO", "TI"] }), lsa: "rhythm-triple" },
      { page: "70", teacher: "Home study: “Go Tell Aunt Rhody”; melodic patterns; “Major Duple” connected, separated, with accompaniment." }),
    S("4A", 4, "A", "71–74", ["Twinkle, Twinkle, Little Star", "twinkle"], "major, duple",
      { page: "71", teacher: "Teach “Twinkle, Twinkle, Little Star”; Musical Enrichment." },
      { page: "71–74", teacher: "Review the first key; DO, TI, RE in the second key. Verbal association: tonic and dominant (proper names: patterns) in major and minor. Perform “Major Duple” and “Major Triple”. Melodic patterns on the second DO and TI; 3-note and 2-note tonal patterns in the first key on the instrument.", fing: ks("Second key: DO, TI, RE", { "B♭-DO": ["DO", "TI", "RE"] }), lsa: "tonal-name" },
      { page: "74", teacher: "Home study: “Twinkle”; “Major Triple” patterns and performance; melodic patterns in the second key." }),
    S("4B", 4, "B", "75–80", ["Hot Cross Buns", "hot-cross-buns"], "major, duple",
      { page: "75", teacher: "Teach “Hot Cross Buns”; Musical Enrichment." },
      { page: "76–79", teacher: "Fingerings DO to MI in the second key. Verbal association: DU is the macrobeat, DU DE (duple) and DU DA DI (triple) the microbeats. Melodic patterns in the second key; longer patterns from “Pierrot” and its performance. Play “Major Duple” and “Major Triple” on the old and the new DO; play songs by ear.", fing: ks("Second key: DO to MI", { "B♭-DO": ["DO", "TI", "RE", "MI"] }), lsa: "rhythm-duple" },
      { page: "80", teacher: "Home study: “Hot Cross Buns”; melodic patterns; “Pierrot”." }),
    S("5A", 5, "A", "81–84", ["Lightly Row", "lightly-row"], "major, duple",
      { page: "81", teacher: "Establish tonality and meter; teach “Lightly Row”; Musical Enrichment." },
      { page: "82–84", teacher: "Executive skills in both major keys; new fingerings for the minor key (LA, SI, TI, DO) and for a third major key. Tonal improvisation with tonic and dominant (singing). Perform “Minor Duple” and “Minor Triple”, and MI for their bass line.", fing: ks("The minor key: LA, SI, TI, DO, and MI for the bass", { "G-LA": ["LA", "SI", "TI", "DO", "MI,"] }), lsa: "tonal-minor" },
      { page: "84", teacher: "Home study: “Lightly Row”; “Minor Duple” and “Minor Triple” performance and accompaniment." }),
    S("5B", 5, "B", "85–90", ["Down by the Station", "down-by-the-station"], "major, duple",
      { page: "85", teacher: "Teach “Down by the Station”; Musical Enrichment." },
      { page: "85–90", teacher: "Fingerings in the third major key. Tonal and rhythm echoes; teach divisions in duple meter; melodic patterns on DO and SO, then DO to LA; perform “Twinkle”; sing and play “Go Tell Aunt Rhody” in the third key.", fing: ks("Third key: DO, RE, MI, FA, SO, LA", { "F-DO": ["DO", "RE", "MI", "FA", "SO", "LA"] }), lsa: "rhythm-duple-d" },
      { page: "90", teacher: "Home study: “Down by the Station”; melodic patterns; “Twinkle”; “Go Tell Aunt Rhody” accompaniment." }),
    S("6A", 6, "A", "91–96", ["Triple Twinkle", "triple-twinkle"], "major, triple",
      { page: "91", teacher: "Teach “Triple Twinkle”; Musical Enrichment." },
      { page: "92–96", teacher: "Third-key fingerings; tonal and rhythm echoes; verbal association: FA LA DO is the subdominant in major. Tonal improvisation on the instrument (first key); review patterns and play “Twinkle” with accompaniment; 3-note and 2-note tonal patterns in the second key.", lsa: "tonal-major" },
      { page: "96", teacher: "Home study: “Triple Twinkle”." }),
    S("6B", 6, "B", "97–103", ["Minor Aunt Rhody", "go-tell-aunt-rhody-minor"], "minor, duple",
      { page: "97", teacher: "Teach “Minor Aunt Rhody”; Musical Enrichment." },
      { page: "98–103", teacher: "Review fingerings; tonal and rhythm echoes; rhythm improvisation; sing and play “Lightly Row” in the third key with accompaniment; teach divisions in triple meter.", lsa: "rhythm-triple-d" },
      { page: "103", teacher: "Home study: “Minor Aunt Rhody”; “Lightly Row” accompaniment." }),
    S("7A", 7, "A", "104–110", ["Triple Pierrot", "triple-pierrot"], "major, triple",
      { page: "104", teacher: "Teach “Triple Pierrot”; Musical Enrichment." },
      { page: "104–110", teacher: "Third-key fingerings including SO; verbal association: RE FA LA is the subdominant in minor. Tonal improvisation with tonic and dominant, singing and on the instrument; “Down by the Station” in the third key; 3-note and 2-note patterns in all three major keys. Partial synthesis: tonal.", lsa: "ps" },
      { page: "110", teacher: "Home study: “Triple Pierrot”; “Down by the Station” accompaniment." }),
    S("7B", 7, "B", "111–115", ["Patsy, Ory, Ory, Aye", "patsy-ory-ory-aye"], "major, duple",
      { page: "111", teacher: "Teach “Patsy, Ory, Ory, Aye”; Musical Enrichment." },
      { page: "112–115", teacher: "Tonal and rhythm echoes; teach elongations in duple; rhythm improvisation (singing and on the instrument); partial synthesis: rhythm; begin improvising with tonal and rhythm patterns combined.", lsa: "ps" },
      { page: "115", teacher: "Home study: “Patsy, Ory, Ory, Aye”." }),
    S("8A", 8, "A", "116–119", ["Baa, Baa, Black Sheep", "baa-baa-black-sheep"], "major, duple",
      { page: "116", teacher: "Teach “Baa, Baa, Black Sheep”; Musical Enrichment." },
      { page: "116–119", teacher: "Executive skills in all four keys. Symbolic association and composite synthesis, tonal: tonic and dominant patterns in the first key (Student Book One p. 10). Tonal improvisation with tonic, dominant, subdominant (major), singing and on the instrument.", book: ["Student Book One p. 10: tonic and dominant in the first key"], lsa: "read-tonal-major" },
      { page: "119", teacher: "Home study: “Baa, Baa, Black Sheep”; reading p. 10." }),
    S("8B", 8, "B", "120–125", ["Oats, Peas, Beans", "oats-peas-beans"], "major, duple",
      { page: "120", teacher: "Teach “Oats, Peas, Beans”; Musical Enrichment." },
      { page: "122–125", teacher: "Symbolic association and composite synthesis, rhythm: macro/microbeats in duple (Student Book One p. 11). Echoes; elongations in triple; rhythm improvisation with all functions so far.", book: ["Student Book One p. 11: duple macro/microbeats"], lsa: "read-duple" },
      { page: "125", teacher: "Home study: “Oats, Peas, Beans”; reading p. 11." }),
    S("9A", 9, "A", "126–132", null, "reading",
      { page: "126", teacher: "Review rote songs." },
      { page: "126–132", teacher: "Read: tonic and dominant (first key), duple; play “Major Duple” from notation (p. 12); ensemble performance; triple macro/microbeats (p. 13); tonal writing; tonal improvisation in minor.", book: ["Student Book One pp. 12–14"], lsa: "read-triple" },
      { page: "132", teacher: "Home study: reading pp. 12–14." }),
    S("9B", 9, "B", "133–137", null, "reading",
      { page: "133", teacher: "Review rote songs." },
      { page: "133–137", teacher: "Enrhythmic reading (pp. 15, 17); “Major Duple” and “Major Triple” in other time signatures (pp. 16, 18); rhythm writing; rhythm improvisation on the instrument; creativity: melodic patterns.", book: ["Student Book One pp. 15–18"], lsa: "read-enrhythmic" },
      { page: "137", teacher: "Home study: reading pp. 15–18." }),
    S("10A", 10, "A", "138–147", null, "reading",
      { page: "138", teacher: "Review rote songs." },
      { page: "138–147", teacher: "Tonal reading in the second key: tonic and dominant (p. 19), with subdominant (p. 20); “Major Duple” and “Pierrot” in the second key (p. 21); partial synthesis: tonal; the minor key: tonic and dominant (p. 22); “Minor Duple” and “Minor Triple” (pp. 23–24).", book: ["Student Book One pp. 19–24"], lsa: "read-tonal-minor" },
      { page: "147", teacher: "Home study: reading pp. 19–24." }),
    S("10B", 10, "B", "148–150", null, "reading",
      { page: "148", teacher: "Review rote songs." },
      { page: "148–150", teacher: "Rhythm reading: macrobeats, microbeats and divisions in duple (p. 25); rhythm improvisation with elongations; rhythm writing; creativity: melodic patterns.", book: ["Student Book One p. 25"], lsa: "read-duple-d" },
      { page: "150", teacher: "Home study: reading p. 25." }),
    S("11A", 11, "A", "151–157", null, "reading",
      { page: "151", teacher: "Review rote songs." },
      { page: "151–157", teacher: "Tonal reading in the third key: tonic and dominant (p. 26), with subdominant (p. 27; some patterns beyond the recorder's range, read by singing); “Go Tell Aunt Rhody”, “Hot Cross Buns”, “Twinkle”, “Triple Twinkle” from notation (pp. 28–30).", book: ["Student Book One pp. 26–30"], lsa: "read-tonal-major" },
      { page: "157", teacher: "Home study: reading pp. 26–30." }),
    S("11B", 11, "B", "158–163", null, "reading",
      { page: "158", teacher: "Posture, instrument position." },
      { page: "158–163", teacher: "Enrhythmic reading with divisions (pp. 31, 33); triple macro/micro/divisions (p. 32); “Minor Aunt Rhody” and “Triple Pierrot” (p. 35); rhythm improvisation; writing; creativity.", book: ["Student Book One pp. 31–35"], lsa: "read-triple-d" },
      { page: "163", teacher: "Home study: reading pp. 31–35." }),
    S("12A", 12, "A", "164–168", null, "reading",
      { page: "164", teacher: "Hand position and tuning." },
      { page: "164–168", teacher: "Rhythm reading with elongations in duple (p. 36) and enrhythmic (p. 37); tonal writing; tonal improvisation with tonic, dominant, subdominant.", book: ["Student Book One pp. 36–39"], lsa: "read-duple" },
      { page: "168", teacher: "Home study: reading pp. 36–39." }),
    S("12B", 12, "B", "169–177", null, "reading",
      { page: "169", teacher: "Hand position and tuning." },
      { page: "169–177", teacher: "Elongations in triple (p. 40), enrhythmic (p. 41); “Patsy” and “Oats, Peas, Beans” in the third key (pp. 42–43); sight reading: tonal in all four keys (p. 44), rhythm in 2/4 and 6/8 (pp. 45–46), melodic (p. 47): generalization-symbolic.", book: ["Student Book One pp. 40–47"], lsa: "read-enrhythmic" },
      { page: "177", teacher: "Home study: reading pp. 40–47." })
  ];

  // the students' activity for a part
  var LSA = {
    "tonal-major": { type: "tonal-echo", set: "major", modes: ["echo", "first", "rest"], say: "Echo the tonal patterns (bum, then solfège), then play them." },
    "tonal-minor": { type: "tonal-echo", set: "minor", modes: ["echo", "first", "rest"], say: "Echo the minor patterns, then play them." },
    "tonal-name": { type: "tonal-echo", set: "major", modes: ["echo", "name"], syllables: true, say: "Echo in solfège and name the function: tonic or dominant." },
    "rhythm-duple": { type: "rhythm-echo", set: "duple", syllables: true, say: "Echo the rhythm patterns (bah, then syllables), then play them on one note." },
    "rhythm-triple": { type: "rhythm-echo", set: "triple", syllables: true, say: "Echo the triple patterns, then play them." },
    "rhythm-duple-d": { type: "rhythm-echo", set: "duple-d", syllables: true, say: "Echo patterns with divisions (DU TA DE TA)." },
    "rhythm-triple-d": { type: "rhythm-echo", set: "triple-d", syllables: true, say: "Echo triple patterns with divisions." },
    "ps": { type: "link", href: "/practice/audiation.html#partial-synthesis-name-the-tonality-or-meter", label: "Partial synthesis: name the tonality or meter", say: "Two sentences: which is major and which minor (duple, triple)?" },
    "read-tonal-major": { type: "read-tonal", set: "major", keys: ["Bb", "Eb"], say: "Read the patterns in solfège (concert pitch: the written notes for your saxophone are on the fingering card)." },
    "read-tonal-minor": { type: "read-tonal", set: "minor", keys: ["C", "G"], say: "Read the minor patterns in solfège (concert pitch)." },
    "read-duple": { type: "read", sets: ["mullen-rhythm-duple-macro-micro"], say: "Read each pattern with syllables, then play it." },
    "read-triple": { type: "read", sets: ["mullen-rhythm-triple-macro-micro"], say: "Read each pattern with syllables, then play it." },
    "read-duple-d": { type: "read", sets: ["mullen-rhythm-duple-divisions"], say: "Read the patterns with divisions." },
    "read-triple-d": { type: "read", sets: ["mullen-rhythm-triple-divisions"], say: "Read the triple patterns with divisions." },
    "read-enrhythmic": { type: "read", sets: ["mullen-rhythm-duple-macro-micro", "mullen-rhythm-triple-macro-micro"], sig: "enrhythmic", say: "Same sounds, other time signatures: read them." }
  };
  function steps(s) {
    var out = [], P = s.parts;
    out.push({ id: "jr" + s.id + "-1", recordings: REC[s.id] && REC[s.id][1], title: "Part I: " + (s.song ? "rote song “" + s.song[0] + "”" : "rote songs (review)"), page: P[1].page, phase: "first-whole",
      teacher: P[1].teacher + (s.song ? " Sung in the class's concert key; the song is in the tune collection." : ""), book: P[1].book,
      activities: ["rote-song"],
      student: s.song ? { type: "tunes", tunes: [{ name: s.song[0], id: s.song[1] }] } : null });
    var st2 = P[2].fing ? { type: "sax", notes: P[2].fing.notes, say: P[2].fing.text + ": the fingering for each note on your saxophone." } : null;
    out.push({ id: "jr" + s.id + "-2", recordings: REC[s.id] && REC[s.id][2], title: "Part II: executive skills and patterns", page: P[2].page, phase: "lsa", teacher: P[2].teacher, book: P[2].book,
      student: st2 || (P[2].lsa ? LSA[P[2].lsa] : null), extra: st2 && P[2].lsa ? LSA[P[2].lsa] : null });
    out.push({ id: "jr" + s.id + "-3", recordings: REC[s.id] && REC[s.id][3], title: "Part III: home study", page: P[3].page, phase: "second-whole", teacher: P[3].teacher });
    return out;
  }
  var units = [];
  for (var u = 1; u <= 12; u++) ["A", "B"].forEach(function (sec) {
    var s = SECTIONS.filter(function (x) { return x.unit === u && x.sec === sec; })[0];
    if (s) units.push({ id: "jr" + s.id, title: "Unit " + u + ", Section " + sec + (s.song ? ": “" + s.song[0] + "”" : ""), page: s.page, skill: "", tonality: s.context, steps: steps(s) });
  });
  var B = global.MLTBooks = global.MLTBooks || {};
  B["jri-sax"] = { id: "jri-sax", title: "Jump Right In: The Instrumental Series (Recorder), on saxophone", author: "Richard F. Grunow, Edwin E. Gordon and Christopher D. Azzara", year: 1999,
    note: "The recorder Teacher's Guide, Book One, section by section, taught on saxophone in concert B♭, E♭, C minor and G minor.",
    parts: [{ id: "book1", title: "Book One", page: "36", units: units }] };
  var api = { KEYMAP: KEYMAP, concert: concert, sections: SECTIONS };
  global.JRISax = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
