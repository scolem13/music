// score-reading.js — ScoreReading: the transposing-instrument table and the arithmetic behind the Score Reading lessons
// (lessons/score-*.qmd) and the Part Reader tool (tools/part-reader.qmd).
// Every variant's `semis` is SOUNDING minus WRITTEN, in semitones (B♭ clarinet -2: written D sounds C).
// Facts are cited in scripts/sources/score-reading.py.
(function (global) {
  var T = "treble", B = "bass", A = "alto", TN = "tenor", T8 = "treble-8";
  function v(key, semis, clefs, note) { return { key: key, semis: semis, clefs: clefs, note: note || "" }; }

  var INSTRUMENTS = [
    { id: "flute", name: "Flute", family: "Woodwinds", variants: [v("C", 0, [T])] },
    { id: "piccolo", name: "Piccolo", family: "Woodwinds", variants: [v("C", 12, [T], "Written an octave below where it sounds, to save ledger lines.")] },
    { id: "altofl", name: "Alto flute", family: "Woodwinds", variants: [v("G", -5, [T])] },
    { id: "oboe", name: "Oboe", family: "Woodwinds", variants: [v("C", 0, [T])] },
    { id: "cora", name: "Cor anglais (English horn)", family: "Woodwinds", variants: [v("F", -7, [T], "Neither English nor a horn: an alto oboe.")] },
    { id: "clar", name: "Clarinet", family: "Woodwinds", variants: [v("B♭", -2, [T]), v("A", -3, [T]), v("C", 0, [T]), v("E♭", 3, [T], "The small E♭ clarinet sounds higher than written."), v("D", 2, [T])] },
    { id: "bcl", name: "Bass clarinet", family: "Woodwinds", variants: [
      v("B♭ (treble clef, 'French')", -14, [T], "The usual modern way: read like any clarinet; sounds a major 9th lower."),
      v("B♭ (bass clef, 'German')", -2, [B], "Older German scores: bass clef, sounds only a major 2nd lower. Often mixed with treble clef in the same part."),
      v("A (treble clef)", -15, [T], "Rare (Wagner, Mahler).")] },
    { id: "sopsax", name: "Soprano saxophone", family: "Saxophones", variants: [v("B♭", -2, [T])] },
    { id: "altosax", name: "Alto saxophone", family: "Saxophones", variants: [v("E♭", -9, [T])] },
    { id: "tensax", name: "Tenor saxophone", family: "Saxophones", variants: [v("B♭", -14, [T])] },
    { id: "barisax", name: "Baritone saxophone", family: "Saxophones", variants: [v("E♭", -21, [T])] },
    { id: "bsn", name: "Bassoon", family: "Woodwinds", variants: [v("C", 0, [B, TN, T])] },
    { id: "cbsn", name: "Contrabassoon", family: "Woodwinds", variants: [v("C", -12, [B])] },
    { id: "horn", name: "Horn", family: "Brass", variants: [
      v("F", -7, [T, B], "The modern standard. In bass clef, check the edition: 'old notation' writes it an octave lower (sounds a 4th higher)."),
      v("E", -8, [T, B]), v("E♭", -9, [T, B]), v("D", -10, [T, B]), v("D♭", -11, [T, B]),
      v("C basso", -12, [T, B]), v("B basso (H)", -13, [T, B]), v("B♭ basso", -14, [T, B]),
      v("C alto", 0, [T]), v("B♭ alto", -2, [T]), v("A", -3, [T]), v("A♭", -4, [T]), v("G", -5, [T]), v("G♭", -6, [T])] },
    { id: "tpt", name: "Trumpet", family: "Brass", variants: [
      v("B♭", -2, [T]), v("C", 0, [T]), v("D", 2, [T]), v("E♭", 3, [T]), v("E", 4, [T]), v("F", 5, [T], "A Classical/Romantic part 'in F' sounds a 4th up; played today on B♭, C or a small E♭/F trumpet."),
      v("A", -3, [T]), v("Piccolo in B♭", 10, [T]), v("Piccolo in A", 9, [T])] },
    { id: "cornet", name: "Cornet", family: "Brass", variants: [v("B♭", -2, [T]), v("E♭ (soprano cornet)", 3, [T]), v("A", -3, [T])] },
    { id: "flugel", name: "Flugelhorn", family: "Brass", variants: [v("B♭", -2, [T])] },
    { id: "tenhorn", name: "Tenor horn (UK) / alto horn (US)", family: "Brass", variants: [v("E♭", -9, [T])] },
    { id: "tbn", name: "Trombone", family: "Brass", variants: [
      v("C (concert pitch)", 0, [B, TN, A], "Orchestra, wind band and jazz: not transposing."),
      v("B♭ (treble clef, brass band)", -14, [T], "British brass band tenor trombone: read like a tenor sax.")] },
    { id: "btbn", name: "Bass trombone", family: "Brass", variants: [v("C (concert pitch)", 0, [B], "Even in brass band, the bass trombone stays in bass clef at concert pitch.")] },
    { id: "euph", name: "Euphonium / baritone", family: "Brass", variants: [
      v("C (bass clef, concert pitch)", 0, [B, TN]),
      v("B♭ (treble clef)", -14, [T], "Brass band and many school bands: fingers like a trumpet, sounds a 9th lower.")] },
    { id: "tuba", name: "Tuba", family: "Brass", variants: [
      v("C (bass clef, concert pitch)", 0, [B], "Orchestra and wind band: whatever the tuba is built in (F, E♭, CC, BB♭), the part is at concert pitch."),
      v("E♭ bass (treble clef, brass band)", -21, [T]),
      v("BB♭ bass (treble clef, brass band)", -26, [T], "Two octaves and a major 2nd lower than written.")] },
    { id: "vln", name: "Violin", family: "Strings", variants: [v("C", 0, [T])] },
    { id: "vla", name: "Viola", family: "Strings", variants: [v("C", 0, [A, T])] },
    { id: "vc", name: "Cello", family: "Strings", variants: [v("C", 0, [B, TN, T])] },
    { id: "db", name: "Double bass", family: "Strings", variants: [v("C", -12, [B, TN, T], "Sounds an octave lower than written, in every clef.")] },
    { id: "gtr", name: "Guitar", family: "Strings", variants: [v("C", -12, [T, T8], "Written in treble clef, sounds an octave lower (the clef with an 8 under it says so).")] },
    { id: "bgtr", name: "Bass guitar", family: "Strings", variants: [v("C", -12, [B])] },
    { id: "harp", name: "Harp", family: "Keyboards & percussion", variants: [v("C", 0, [T, B])] },
    { id: "pno", name: "Piano", family: "Keyboards & percussion", variants: [v("C", 0, [T, B])] },
    { id: "cel", name: "Celesta", family: "Keyboards & percussion", variants: [v("C", 12, [T, B])] },
    { id: "glock", name: "Glockenspiel", family: "Keyboards & percussion", variants: [v("C", 24, [T])] },
    { id: "xyl", name: "Xylophone", family: "Keyboards & percussion", variants: [v("C", 12, [T])] },
    { id: "mar", name: "Marimba", family: "Keyboards & percussion", variants: [v("C", 0, [T, B])] },
    { id: "vib", name: "Vibraphone", family: "Keyboards & percussion", variants: [v("C", 0, [T])] },
    { id: "timp", name: "Timpani", family: "Keyboards & percussion", variants: [v("C", 0, [B])] },
    { id: "tenv", name: "Tenor voice", family: "Voices", variants: [v("C", -12, [T8], "Treble clef with an 8 below: sounds an octave lower.")] },
  ];

  // key signatures by number of fifths (-7 = seven flats .. +7 = seven sharps)
  var MAJ = ["C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯"];
  var MIN = ["A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯", "G♯", "D♯", "A♯"];
  function sigName(f) { return f === 0 ? "no sharps or flats" : Math.abs(f) + (f > 0 ? " sharp" : " flat") + (Math.abs(f) > 1 ? "s" : ""); }
  function keyName(f, minor) { return (minor ? MIN : MAJ)[f + 7] + (minor ? " minor" : " major"); }
  // moving a key by `semis` semitones: each semitone is 7 fifths; keep the spelling with the fewest accidentals
  function moveKey(f, semis) {
    var n = f + 7 * semis; n = ((n % 12) + 12) % 12; if (n > 6) n -= 12;
    if (n === 6 && f < 0) n = -6;   // G♭ rather than F♯ when we came from the flat side
    return n;
  }

  var IV = ["unison", "minor 2nd", "major 2nd", "minor 3rd", "major 3rd", "perfect 4th", "tritone", "perfect 5th", "minor 6th", "major 6th", "minor 7th", "major 7th"];
  var COMPOUND = { 13: "minor 9th", 14: "major 9th", 15: "minor 10th", 16: "major 10th", 17: "perfect 11th", 19: "perfect 12th" };
  function intervalName(semis) {
    var a = Math.abs(semis); if (!a) return "exactly as written";
    var o = Math.floor(a / 12), r = a % 12, s;
    if (!r) s = o === 1 ? "an octave" : o === 2 ? "two octaves" : o + " octaves";
    else if (!o) s = "a " + IV[r];
    else s = (COMPOUND[a] ? "a " + COMPOUND[a] + " (" : "") + (o === 1 ? "an octave" : o === 2 ? "two octaves" : o + " octaves") + " and a " + IV[r] + (COMPOUND[a] ? ")" : "");
    return s + (semis < 0 ? " lower" : " higher");
  }

  // how to read each clef, said against treble clef (or bass)
  var CLEF_TIPS = {
    treble: "Treble clef: G clef, the curl wraps the 2nd line (G above middle C).",
    bass: "Bass clef: F clef, the dots surround the 4th line (F below middle C).",
    alto: "Alto clef: C clef on the middle line, which is middle C. Trick: read it as treble clef, then one letter up and an octave down.",
    tenor: "Tenor clef: C clef on the 4th line, which is middle C. Trick: read it as bass clef, then a 5th up (or as treble clef, one letter down and an octave lower).",
    "treble-8": "Treble clef with an 8 below: read as treble, sound an octave lower."
  };

  // pitch helpers for drawing scales in ABC
  var LET = "CDEFGAB", PC = [0, 2, 4, 5, 7, 9, 11];
  function accOf(name) { return name.indexOf("♯") >= 0 ? 1 : name.indexOf("♭") >= 0 ? -1 : 0; }
  function abcNote(letterIdx, oct) {   // letter index 0-6 (C..B), octave (4 = middle-C octave)
    var L = LET[letterIdx];
    if (oct >= 5) return L.toLowerCase() + "'".repeat(oct - 5);
    return L + ",".repeat(4 - oct);
  }
  function abcKey(f) { return MAJ[f + 7].replace("♭", "b").replace("♯", "#"); }
  // a one-octave major scale on the tonic of key f starting in octave `oct`
  function scale(f, oct) {
    var t = LET.indexOf(MAJ[f + 7][0]), out = [];
    for (var i = 0; i < 8; i++) out.push(abcNote((t + i) % 7, oct + Math.floor((t + i) / 7)));
    return out.join(" ");
  }
  function tonicMidi(f, oct) { var n = MAJ[f + 7]; return 12 * (oct + 1) + PC[LET.indexOf(n[0])] + accOf(n); }
  // the octave the written scale starts in, so it sits on the staff of `clef`
  function startOct(f, clef) {
    var t = LET.indexOf(MAJ[f + 7][0]), hi = t >= 3;   // F or above
    return { treble: 4, "treble-8": 4, alto: hi ? 3 : 4, tenor: 3, bass: hi ? 2 : 3 }[clef] || 4;
  }
  // ABC for the written scale of key f in `clef`, and the scale as it sounds (concert key, octave moved by semis)
  function writtenAndSounding(f, semis, clef) {
    var o = startOct(f, clef), w = tonicMidi(f, o) + semis, cf = moveKey(f, semis);
    var co = 0; while (tonicMidi(cf, co) < w - 6) co++;   // concert tonic nearest the sounding pitch
    if (tonicMidi(cf, co) !== w) { if (Math.abs(tonicMidi(cf, co - 1) - w) < Math.abs(tonicMidi(cf, co) - w)) co--; }
    var sClef = !semis ? clef : w < 57 ? "bass" : "treble";
    return {
      written: "X:1\nL:1/4\nK:" + abcKey(f) + " clef=" + (clef === "treble-8" ? "treble-8" : clef) + "\n" + scale(f, o) + " |]",
      sounding: "X:1\nL:1/4\nK:" + abcKey(cf) + " clef=" + sClef + "\n" + scale(cf, co) + " |]",
      concert: cf
    };
  }

  function find(id) { for (var i = 0; i < INSTRUMENTS.length; i++) if (INSTRUMENTS[i].id === id) return INSTRUMENTS[i]; return null; }

  global.ScoreReading = { INSTRUMENTS: INSTRUMENTS, MAJ: MAJ, MIN: MIN, CLEF_TIPS: CLEF_TIPS, find: find, sigName: sigName, keyName: keyName,
    moveKey: moveKey, intervalName: intervalName, writtenAndSounding: writtenAndSounding, abcKey: abcKey };
})(window);
