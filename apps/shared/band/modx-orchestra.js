// modx-orchestra.js — the orchestra on the MODX, set up for later (global ModxOrchestra): sixteen Parts of a second Performance,
// "Site Orchestra", one per section of a full score, for when the full-score player (apps/shared/full-score.js, which gives every
// staff a family and a General MIDI program from its name: INSTRUMENTS there) sends its staves to the board as the band does.
// Not wired yet: the page (gear/modx-orchestra.qmd) lists the Parts and their suggested voices and auditions each on its channel.
//
//   ModxOrchestra.PARTS = [{ ch, part, staves (the usual staff names, for people), names (RegExp: the staff names that go here), lo, hi (a comfortable sounding range, MIDI),
//                           kit (true: a drum Part), pick: [Performance names to try, best guess first], also: [doubling
//                           instruments it covers], note }]
//   ModxOrchestra.partFor(staffName) -> the PART a full-score staff goes to (first match; null = none)
//   ModxOrchestra.phrase(part) -> [{ at, midi, vel, dur }] beats: a short audition phrase inside its range (or kit hits)
//
// The Performance names are read from the MODX+ Data List's Performance List (~/Documents/Manuals/Yamaha-MODX-plus-Data-List.pdf)
// through its PDF text, where the table's columns run together: the spelling of each name is UNVERIFIED until found on the board
// (CATEGORY SEARCH, by its main and sub category: Strings / Woodwind / Brass / Chromatic Perc / Drum-Perc). The ranges are
// rule-of-thumb sounding ranges from memory, UNVERIFIED, only to keep the audition phrase where the instrument sounds well.
// Sixteen is one Part per section: a piccolo, cor anglais, bass clarinet or contrabassoon shares its family's Part (the "also"
// list), as do mallets and celesta with the harp; a score with more staves than this doubles some up.
(function (global) {
  var PARTS = [
    { ch: 1,  part: "Flutes",          staves: "Flauto, Flute, Flöte, Piccolo", names: /picc|flaut|flute|fl[uû]te|flöte/i,               lo: 72, hi: 93, pick: ["Concert Flute", "Flute AF1", "Flute Legato"], also: ["Piccolo: Piccolo 1 / Piccolo 2"] },
    { ch: 2,  part: "Oboes",           staves: "Oboe, Oboi, Hautbois, Corno inglese, English horn", names: /corno ingl|english horn|cor angl|obo|hautbois/i, lo: 62, hi: 86, pick: ["Oboe 1", "Sweet Oboe Legato", "Oboe 2"], also: ["Cor anglais: English Horn"] },
    { ch: 3,  part: "Clarinets",       staves: "Clarinetto, Clarinet, Klarinette", names: /clar/i,                                          lo: 55, hi: 84, pick: ["Clarinet 1 AF1", "Clarinet 2"], also: ["Bass clarinet: none found; the clarinet an octave down"] },
    { ch: 4,  part: "Bassoons",        staves: "Fagotto, Bassoon, Basson, Contrafagotto", names: /contrafag|contrabassoon|fag|bassoon|basson/i,    lo: 36, hi: 65, pick: ["Bassoon 1 AF1", "Bassoon 2", "Bassoon 3"], also: ["Contrabassoon: Contra Bassoon"] },
    { ch: 5,  part: "Horns",           staves: "Corno, Corni, Horn, Cor", names: /corn[oi]\b|corni|horn|cor\b|trompe/i,             lo: 41, hi: 72, pick: ["French Horn 1 AF1", "FrenchHornSection1", "Orchestral Horns"], note: "Two or four horns: a section sound when they play together, the solo horn for a solo line." },
    { ch: 6,  part: "Trumpets",        staves: "Tromba, Trombe, Trumpet, Trompete, Clarino", names: /tromb[ae]\b|trumpet|trompete|trompette|clarino/i, lo: 58, hi: 82, pick: ["Classical Trumpet", "Trumpet 1 AF1", "Trumpet Ensemble"] },
    { ch: 7,  part: "Trombones",       staves: "Trombone, Tromboni, Posaune", names: /trombon|posaune/i,                               lo: 40, hi: 70, pick: ["Trombone 1 AF1", "Trombone Ensemble", "Bass Trombone"] },
    { ch: 8,  part: "Tuba",            staves: "Tuba", names: /tuba/i,                                          lo: 29, hi: 58, pick: ["Tuba", "BassTuba(Bb)"] },
    { ch: 9,  part: "Timpani",         staves: "Timpani, Pauken", names: /timp|pauk/i,                                     lo: 40, hi: 55, pick: ["RealTimpani AF", "Timpani"], note: "Pitched: each note is a drum tuned to it." },
    { ch: 10, part: "Percussion",      staves: "Percussion, Triangolo, Piatti, Cymbals, Tamburo, Gran cassa", names: /perc|tri[aá]ng|piatti|cymbal|tamb|cassa|drum/i,  kit: true, pick: ["Orchestra Kit", "Nu Orchestra Kit"], note: "A drum kit Part: bass drum, cymbals, triangle, snare. Check its key map with the Kit walk on the MODX page before relying on General MIDI keys." },
    { ch: 11, part: "Harp, keyboards", staves: "Arpa, Harp, Glockenspiel, Celesta, Xylophone, Marimba, Piano, Cembalo", names: /harp|arpa|glock|celest|xylo|marimba|piano|pno|cembalo|harpsi/i, lo: 36, hi: 96, pick: ["Concert Harp", "Harp", "Mellow Harp"], also: ["Glockenspiel: Orch Glockenspiel", "Celesta: Celesta", "Xylophone: Orch Xylophone", "Tubular bells: Tubular Bell 1"] },
    { ch: 12, part: "Violins I",       staves: "Violino I, Violin 1, Violins I", names: /viol(ino|in)s?\s*(I|1)\b(?!I)|1st viol|violin(o)?\s*primo|^viol(ino|in)s?$/i, lo: 55, hi: 91, pick: ["Seattle Violins 1", "1stViolin AF1", "Section Strings 1"], note: "A section sound, not a solo violin: an orchestra's first violins are a dozen players." },
    { ch: 13, part: "Violins II",      staves: "Violino II, Violin 2, Violins II", names: /viol(ino|in)s?\s*(II|2)\b|2nd viol|secondo/i,    lo: 55, hi: 88, pick: ["Seattle Violins 2", "2ndViolin AF1", "Section Strings 2"] },
    { ch: 14, part: "Violas",          staves: "Viola, Viole, Bratsche, Alto", names: /viola\b|viole|bratsche|alto\b/i,                 lo: 48, hi: 81, pick: ["Seattle Violas", "Hybrid Violas", "Viola AF1"] },
    { ch: 15, part: "Cellos",          staves: "Violoncello, Cello, Violoncello e Basso", names: /violon?cell|cello/i,                             lo: 36, hi: 72, pick: ["Seattle Cellos", "Hybrid Cellos", "Cello AF1"], note: "\"Violoncello e Basso\" (one staff for both, as in Mozart) goes here; the basses double it an octave down only if the player splits it." },
    { ch: 16, part: "Basses",          staves: "Contrabbasso, Double bass, Kontrabass, Basso", names: /contrab|double bass|kontrab|basso\b|bass\b/i,     lo: 28, hi: 55, pick: ["Seattle Basses", "ContrabassSolo1"], note: "Double basses sound an octave below the written note: the full-score player sends the sounding pitch." }
  ];
  // the specific names first (as full-score.js does): cello-and-bass before bass, violin I/II before a plain violin
  var ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 13, 12, 14];
  function partFor(name){
    name = String(name || "");
    for (var i = 0; i < ORDER.length; i++){ var p = PARTS[ORDER[i] - 1]; if (p.names.test(name)) return p; }
    if (/viol/i.test(name)) return PARTS[11];
    return null;
  }
  // an audition: up a broken chord in the middle of the range and back (or a few kit hits), at 100 bpm
  function phrase(p){
    if (p.kit) return [[0, 36], [1, 49], [2, 38], [2.5, 81], [3, 57]].map(function (h){ return { at: h[0], midi: h[1], vel: 0.75, dur: 0.5 }; });
    var mid = Math.round((p.lo + p.hi) / 2) - 7, notes = [0, 4, 7, 12, 7, 4, 0].map(function (d){ return Math.max(p.lo, Math.min(p.hi, mid + d)); });
    return notes.map(function (m, i){ return { at: i * 0.5, midi: m, vel: 0.5 + 0.06 * Math.min(i, 6 - i), dur: i === 6 ? 1.5 : 0.48 }; });
  }
  global.ModxOrchestra = { PARTS: PARTS, partFor: partFor, phrase: phrase };
})(typeof window !== "undefined" ? window : globalThis);
