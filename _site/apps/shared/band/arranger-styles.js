// arranger-styles.js: the styles for the Style Arranger (tools/arranger.qmd). This site's own patterns, written the way
// Yamaha's Style Creator asks for them (Genos Reference Manual p. 23): over CM7, the Bass and Phrase channels with only the
// CM7 scale tones (C D E G A B), the Chord and Pad channels with only its chord tones (C E G B). StyleEngine converts them
// to the chord you hold. Each section's channel is a BandPhrase (pitch or drum kind).
//
//   ArrangerStyles.list -> [style]   style: { id, name, bpm, meter, source: { root, type }, channels: { Rhythm1: ch, … }, sections: { "Main A": { bars, parts: { Rhythm1: phrase, … } }, … } }
//   ch: { sound, vol, ntr, ntt, highKey, lo, hi, rtr, nttBass }  (StyleEngine.convert's channel; sound is a BandSounds id)
//   ArrangerStyles.grid(text, step) and drums({ piece: text }, step): the pattern shorthand, below.
//   ArrangerStyles.CHANNELS: the eight channel names, in order.
//
// Shorthand. A bar is cells separated by spaces, bars by "|"; a cell is `step` quarter notes long (0.5 = eighths).
//   "." rest · "-" holds the note before · a note "C3", a chord "C3E3G3B3" (C4 = middle C = MIDI 60), sharps "C#3"
//   after a note: ">" accent (0.92) · "'" soft (0.5) · "~" ghost (0.32); otherwise 0.8 on the beat, 0.68 off it.
// Drums: one string per piece, one character per cell: X 0.95 · x 0.75 · o 0.55 · g 0.3 (ghost) · . rest.
(function (global) {
  "use strict";
  var CHANNELS = ["Rhythm1", "Rhythm2", "Bass", "Chord1", "Chord2", "Pad", "Phrase1", "Phrase2"];
  var LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteList(tok) {
    var out = [], re = /([A-G])(#|b)?(-?\d)/g, m;
    while ((m = re.exec(tok))) out.push(12 * (+m[3] + 1) + LET[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0));
    return out;
  }
  function grid(text, step) {
    step = step || 0.5;
    var notes = [], bars = text.split("|"), t0 = 0, perBar = 0;
    bars.forEach(function (bar) {
      var cells = bar.trim().split(/\s+/).filter(Boolean), open = [];
      cells.forEach(function (c, i) {
        var t = t0 + i * step;
        if (c === "-") { open.forEach(function (n) { n.dur += step; }); return; }
        open = [];
        if (c === ".") return;
        var v = /^[^>'~]*>/.test(c) ? 0.92 : /'/.test(c) ? 0.5 : /~/.test(c) ? 0.32 : (Math.abs(t - Math.round(t)) < 1e-9 ? 0.8 : 0.68);
        noteList(c).forEach(function (m) { var n = { t: t, dur: step, pitch: m, vel: v }; notes.push(n); open.push(n); });
      });
      perBar = Math.max(perBar, cells.length * step); t0 += cells.length * step;
    });
    notes.forEach(function (n) { n.dur = Math.min(n.dur, t0 - n.t); });
    return { kind: "pitch", meter: "4/4", bars: bars.length, notes: notes };
  }
  var DV = { X: 0.95, x: 0.75, o: 0.55, g: 0.3 };
  function drums(map, step) {
    step = step || 0.25;
    var notes = [], bars = 1;
    Object.keys(map).forEach(function (piece) {
      var s = map[piece].replace(/\s/g, ""), bs = s.split("|"); bars = Math.max(bars, bs.length);
      s.replace(/\|/g, "").split("").forEach(function (ch, i) { if (DV[ch]) notes.push({ t: i * step, dur: step, piece: piece, vel: DV[ch] }); });
    });
    return { kind: "drum", meter: "4/4", bars: bars, notes: notes.sort(function (a, b) { return a.t - b.t; }) };
  }
  function sec(bars, parts) { return { bars: bars, parts: parts }; }
  var LINE = { ntr: "trans", ntt: "melody" }, CHORD = { ntr: "fixed", ntt: "chord" }, RHY = { ntr: "fixed", ntt: "bypass" };
  function ch(sound, vol, rule, more) { return Object.assign({ sound: sound, vol: vol, rtr: "stop" }, rule, more || {}); }

  // ---------------- 8-Beat Pop ----------------
  var popHat8 = "x.o.x.o.x.o.x.o.", popHat16 = "xoxoXoxoxoxoXoxo";
  var pop = {
    id: "pop8", name: "8-Beat Pop", bpm: 100, meter: "4/4", source: { root: 0, type: "M7" },
    channels: {
      Rhythm1: ch("kit", 0.9, RHY), Rhythm2: ch("kit", 0.55, RHY),
      Bass: ch("bass", 0.9, LINE, { highKey: 5, lo: 28, hi: 55 }),
      Chord1: ch("piano", 0.6, CHORD, { lo: 52, hi: 79 }), Chord2: ch("aguitar", 0.5, CHORD, { lo: 45, hi: 76 }),
      Pad: ch("organ", 0.35, CHORD, { lo: 48, hi: 79, rtr: "retrigger" }),
      Phrase1: ch("rhodes", 0.55, LINE, { highKey: 5, lo: 60, hi: 88 }), Phrase2: ch("clguitar", 0.45, LINE, { highKey: 5, lo: 52, hi: 81 })
    },
    sections: {
      "Intro A": sec(2, {
        Rhythm1: drums({ kick: "X.......X.......|X.......X...x.x.", rim: "....x.......x...|....x.......x...", hatClosed: popHat8 + "|" + popHat8, crash: "X...............|................" }),
        Bass: grid("C2 - - - . . . .|G1 - - - . . G1 B1"),
        Chord1: grid("C4E4G4B4> - - . . . E4G4B4' -|C4E4G4B4 - - . . . E4G4B4' -"),
        Phrase1: grid("G5 . E5 . D5 . C5 .|B4 - - - . . . ."),
        Pad: grid("C4E4G4 - - - - - - -|B3E4G4 - - - - - - -") }),
      "Main A": sec(2, {
        Rhythm1: drums({ kick: "X.......x.x.....|X.......x.......", rim: "....x.......x...|....x.......x...", hatClosed: popHat8 + "|" + popHat8 }),
        Bass: grid("C2 - . C2 . . G1 .|C2 - . C2 . . A1 B1"),
        Chord1: grid("C4E4G4B4 - - - E4G4B4 - - -|C4E4G4B4 - - - E4G4B4 - - -") }),
      "Main B": sec(2, {
        Rhythm1: drums({ kick: "X.......x.x.....|X.......x...x...", snare: "....X.......X...|....X.......X...", hatClosed: popHat8 + "|" + popHat8 }),
        Rhythm2: drums({ tamb: "....o.......o...|....o.......o..." }),
        Bass: grid("C2 . C2 C2 . G1 C2 .|C2 . C2 C2 . G1 A1 B1"),
        Chord1: grid(". C4E4G4B4 - C4E4G4B4' . C4E4G4B4 - .|. C4E4G4B4 - C4E4G4B4' . C4E4G4B4 - ."),
        Chord2: grid("C3G3C4E4G4> - - - C3G3C4E4G4' - - -|C3G3C4E4G4> - - - C3G3C4E4G4' - - -"),
        Pad: grid("C4E4G4 - - - - - - -|C4E4B4 - - - - - - -") }),
      "Main C": sec(2, {
        Rhythm1: drums({ kick: "X.....x.x.x.....|X.....x.x.....x.", snare: "....X.......X...|....X.......X..g", hatClosed: popHat16 + "|" + popHat16 }),
        Rhythm2: drums({ tamb: "....x.......x...|....x.......x...", clap: "....o.......o...|....o.......o..." }),
        Bass: grid("C2 . C2 C2 . G1 C2 .|C2 . C2 C2 . G1 A1 B1"),
        Chord1: grid(". C4E4G4B4 - C4E4G4B4' . C4E4G4B4 - .|. C4E4G4B4 - C4E4G4B4' . C4E4G4B4 - ."),
        Chord2: grid("C3G3C4E4G4> . C3G3C4E4G4' C3G3C4E4G4' . C3G3C4E4G4' C3G3C4E4G4 .|C3G3C4E4G4> . C3G3C4E4G4' C3G3C4E4G4' . C3G3C4E4G4' C3G3C4E4G4 ."),
        Pad: grid("C4E4G4 - - - - - - -|C4E4B4 - - - - - - -"),
        Phrase1: grid(". . . . . . G5 A5|G5 - E5 - . . . .") }),
      "Main D": sec(2, {
        Rhythm1: drums({ kick: "X.....x.x.x...x.|X.....x.x.x.....", snare: "....X.......X...|....X.......X.gg", hatClosed: popHat16 + "|xoxoXoxoxoxoX...", hatOpen: "................|............o...", crash: "X...............|................" }),
        Rhythm2: drums({ tamb: "xoxoxoxoxoxoxoxo|xoxoxoxoxoxoxoxo", clap: "....x.......x...|....x.......x..." }),
        Bass: grid("C2 C2 . C2 G1 . C2 C3|C2 C2 . C2 G1 . A1 B1", 0.5),
        Chord1: grid(". C4E4G4B4 - C4E4G4B4' . C4E4G4B4 - .|. C4E4G4B4 - C4E4G4B4' . C4E4G4B4 - ."),
        Chord2: grid("C3G3C4E4G4> . C3G3C4E4G4' C3G3C4E4G4' . C3G3C4E4G4' C3G3C4E4G4 .|C3G3C4E4G4> . C3G3C4E4G4' C3G3C4E4G4' . C3G3C4E4G4' C3G3C4E4G4 ."),
        Pad: grid("C4E4G4B4 - - - - - - -|C4E4G4B4 - - - - - - -"),
        Phrase1: grid(". . . . . . G5 A5|G5 - E5 - D5 E5 C5 -"),
        Phrase2: grid("E4 . G4 . A4 G4 E4 .|D4 . E4 . . . . .") }),
      "Fill In A": sec(1, { Rhythm1: drums({ kick: "X.......x.......", rim: "....x...x.x.x.x.", hatClosed: "x.x.x.x........." }), Bass: grid("C2 - . . G1 . A1 B1") }),
      "Fill In B": sec(1, { Rhythm1: drums({ kick: "X.......x.......", snare: "....X...x.x.xxxx", hatClosed: "x.x.x.x........." }), Bass: grid("C2 - . . G1 . A1 B1"), Chord1: grid("C4E4G4B4 - - - . . . .") }),
      "Fill In C": sec(1, { Rhythm1: drums({ kick: "X.......X.......", snare: "....X...xx..xx..", tomHi: "..........xx....", tomLo: "..............xx" }), Bass: grid("C2 - . . G1 A1 B1 C2"), Chord1: grid("C4E4G4B4 - - - . . . .") }),
      "Fill In D": sec(1, { Rhythm1: drums({ kick: "X...X...X...X...", snare: "..x.x.xxxxxxXXXX", crash: "X..............." }), Rhythm2: drums({ clap: "....x...x...x..." }), Bass: grid("C2 C2 E2 E2 G2 G2 A2 B2"), Chord2: grid("C3G3C4E4G4> . . . . . . .") }),
      "Break": sec(1, { Rhythm1: drums({ kick: "X...............", crash: "X...............", snare: "............xxXX" }), Bass: grid("C2> . . . . . . ."), Chord1: grid("C4E4G4B4> . . . . . . ."), Chord2: grid("C3G3C4E4G4> . . . . . . .") }),
      "Ending A": sec(2, {
        Rhythm1: drums({ kick: "X.......x.x.....|X...............", snare: "....X.......X.xx|................", hatClosed: popHat8 + "|................", crash: "................|X..............." }),
        Bass: grid("C2 . C2 C2 . G1 A1 B1|C2> - - - - - - -"),
        Chord1: grid(". C4E4G4B4 - C4E4G4B4' . C4E4G4B4 - .|C4E4G4B4> - - - - - - -"),
        Phrase1: grid("G5 . E5 . D5 . B4 .|C5 - - - - - - -"),
        Pad: grid("C4E4G4 - - - - - - -|C4E4G4B4 - - - - - - -") })
    }
  };

  // ---------------- Bossa Nova ----------------
  var clave = "x..x..x...x..x..", bossaKick = "x..xx..xx..xx..x";
  var bossa = {
    id: "bossa", name: "Bossa Nova", bpm: 132, meter: "4/4", source: { root: 0, type: "M7" },
    channels: {
      Rhythm1: ch("kit", 0.75, RHY), Rhythm2: ch("kit", 0.4, RHY),
      Bass: ch("bass", 0.85, LINE, { highKey: 5, lo: 28, hi: 52 }),
      Chord1: ch("nguitar", 0.6, CHORD, { lo: 45, hi: 74 }), Chord2: ch("rhodes", 0.45, CHORD, { lo: 52, hi: 79 }),
      Pad: ch("organ", 0.25, CHORD, { lo: 52, hi: 79, rtr: "retrigger" }),
      Phrase1: ch("rhodes", 0.5, LINE, { highKey: 5, lo: 62, hi: 88 }), Phrase2: ch("nguitar", 0.4, LINE, { highKey: 5, lo: 55, hi: 79 })
    },
    sections: {
      "Intro A": sec(2, {
        Rhythm1: drums({ rim: clave + "|" + clave, hatClosed: "x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x." }),
        Chord1: grid("E3B3E4G4> - - E3B3E4G4' - - E3B3E4G4 -|E3B3E4G4 - - E3B3E4G4' - - . ."),
        Phrase1: grid("B4 - - - A4 - G4 -|E4 - - - - - - -") }),
      "Main A": sec(2, {
        Rhythm1: drums({ rim: clave + "|" + clave, hatClosed: "x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x." }),
        Bass: grid("C2 - - G1 C2 - - G1|C2 - - G1 C2 - - G1"),
        Chord1: grid("C3G3B3E4> . . C3G3B3E4' . . C3G3B3E4 .|. C3G3B3E4' . . C3G3B3E4 . . .") }),
      "Main B": sec(2, {
        Rhythm1: drums({ kick: bossaKick + "|" + bossaKick, rim: clave + "|" + clave, hatClosed: "x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x." }),
        Rhythm2: drums({ tamb: "goxogoxogoxogoxo|goxogoxogoxogoxo" }),
        Bass: grid("C2 - - G1 C2 - - G1|C2 - - G1 C2 - - G1"),
        Chord1: grid("C3G3B3E4> . . C3G3B3E4' . . C3G3B3E4 .|. C3G3B3E4' . . C3G3B3E4 . . ."),
        Pad: grid("E4G4B4 - - - - - - -|E4G4B4 - - - - - - -") }),
      "Main C": sec(2, {
        Rhythm1: drums({ kick: bossaKick + "|" + bossaKick, rim: clave + "|" + clave, hatClosed: "xoxoxoxoxoxoxoxo|xoxoxoxoxoxoxoxo" }),
        Rhythm2: drums({ tamb: "goxogoxogoxogoxo|goxogoxogoxogoxo" }),
        Bass: grid("C2 - - G1 C2 - - G1|C2 - - G1 C2 - - G1"),
        Chord1: grid("C3G3B3E4> . . C3G3B3E4' . . C3G3B3E4 .|. C3G3B3E4' . . C3G3B3E4 . . ."),
        Chord2: grid("E4G4B4 - - - . . E4G4B4' -|. . . . E4G4B4 - - -"),
        Phrase1: grid(". . . . . . E5 G5|A5 - G5 - E5 - . .") }),
      "Main D": sec(2, {
        Rhythm1: drums({ kick: bossaKick + "|" + bossaKick, rim: clave + "|" + clave, ride: "x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x." }),
        Rhythm2: drums({ tamb: "xoxoxoxoxoxoxoxo|xoxoxoxoxoxoxoxo", cowbell: "x.......x.......|x.......x......." }),
        Bass: grid("C2 - - G1 C2 - - G1|C2 - - G1 A1 - B1 -"),
        Chord1: grid("C3G3B3E4> . . C3G3B3E4' . . C3G3B3E4 .|. C3G3B3E4' . . C3G3B3E4 . . ."),
        Chord2: grid("E4G4B4 - - - . . E4G4B4' -|. . . . E4G4B4 - - -"),
        Pad: grid("E4G4B4 - - - - - - -|E4G4B4 - - - - - - -"),
        Phrase1: grid(". . . . . . E5 G5|A5 - G5 - E5 - D5 E5"),
        Phrase2: grid("G4 . . E4 . . D4 .|C4 - - - . . . .") }),
      "Fill In A": sec(1, { Rhythm1: drums({ rim: "x..x..x...x.x.x.", hatClosed: "x.x.x.x.x.x....." }), Bass: grid("C2 - - G1 A1 - B1 -") }),
      "Fill In B": sec(1, { Rhythm1: drums({ kick: "x..xx..x........", rim: "x..x..x...x.xxxx" }), Bass: grid("C2 - - G1 A1 - B1 -") }),
      "Fill In C": sec(1, { Rhythm1: drums({ kick: "x..xx..x........", snare: "........g.gox.xx", rim: "x..x..x........." }), Bass: grid("C2 - - G1 A1 - B1 -"), Chord1: grid("C3G3B3E4> . . . . . . .") }),
      "Fill In D": sec(1, { Rhythm1: drums({ kick: "x..xx..xx.......", tomHi: "........xx......", tomLo: "..........xx.xx.", crash: "X..............." }), Bass: grid("C2 - G1 - A1 - B1 -"), Chord2: grid("E4G4B4> . . . . . . .") }),
      "Break": sec(1, { Rhythm1: drums({ rim: "x..x..x.........", kick: "x..............." }), Chord1: grid("C3G3B3E4> . . . . . . .") }),
      "Ending A": sec(2, {
        Rhythm1: drums({ rim: clave + "|x...............", hatClosed: "x.x.x.x.x.x.x.x.|x..............." }),
        Bass: grid("C2 - - G1 C2 - - G1|C2> - - - - - - -"),
        Chord1: grid("C3G3B3E4> . . C3G3B3E4' . . C3G3B3E4 .|C3G3B3E4> - - - - - - -"),
        Phrase1: grid("A5 - G5 - E5 - D5 -|E5 - - - - - - -") })
    }
  };

  var api = { list: [pop, bossa], grid: grid, drums: drums, CHANNELS: CHANNELS, SECTIONS: ["Intro A", "Main A", "Main B", "Main C", "Main D", "Fill In A", "Fill In B", "Fill In C", "Fill In D", "Break", "Ending A"] };
  global.ArrangerStyles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
