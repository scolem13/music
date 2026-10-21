// scale-patterns.js — ScalePatterns: scale exercises (scales, thirds, Hanon, jazz digital patterns, enclosures, arpeggios)
// written out as ABC for any key, scale, meter, style and instrument. Pure: no DOM, so node can test it.
//
//   ScalePatterns.make(opts) -> { abc, playAbc, notes, tips:[...], instTips:[...], range:{lo,hi}, warnings:[...] }
//     opts.tonic "C".."B" pitch class 0..11 (spelled to suit the scale), opts.scale (SCALES id), opts.pattern (PATTERNS id),
//     opts.meter "4/4", opts.style (STYLES id), opts.unit "auto"|"q"|"e"|"t"|"s", opts.octaves 1..3, opts.dir "updown"|"downup"|"up"|"down",
//     opts.mirror null (the pattern's own) | true | false, opts.alternate bool, opts.rhythm "even"|"longshort"|"shortlong",
//     opts.artic null (the style's) | "none"|"slurgroup"|"jazz"|"stacc"|"accent", opts.inst (INSTRUMENTS id), opts.hand "rh"|"lh",
//     opts.octaveShift int, opts.chords bool, opts.labels bool, opts.qpm.
//   abc     what is drawn (written pitch for a transposing instrument, straight eighths)
//   playAbc what is heard without the band (swung eighths written as triplets when the style swings); play it with
//           transpose = -inst.semi so a transposing instrument's part sounds at concert pitch.
// Spelling: every note has a letter from the scale's own degree letters, so G# harmonic minor has its F##, and the key signature
// is the one of the scale's "sig" mode on the tonic (harmonic / melodic minor take the natural minor's, as printed books do).
(function (global) {
  "use strict";

  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  function mod(a, n) { return ((a % n) + n) % n; }

  // offs: semitones above the tonic; lets: letters above the tonic's letter; sig: the mode whose key signature is printed;
  // chord: the band's chord for the bar (on the tonic); seven: a seven-note scale (piano fingering from scale-fingering.js)
  var SCALES = [
    { id: "major", label: "Major (Ionian)", group: "Major and minor", offs: [0, 2, 4, 5, 7, 9, 11], sig: "ionian", chord: "maj7" },
    { id: "natmin", label: "Natural minor (Aeolian)", group: "Major and minor", offs: [0, 2, 3, 5, 7, 8, 10], sig: "aeolian", chord: "m7" },
    { id: "harmin", label: "Harmonic minor", group: "Major and minor", offs: [0, 2, 3, 5, 7, 8, 11], sig: "aeolian", chord: "m" },
    { id: "melmin", label: "Melodic minor (jazz: same both ways)", group: "Major and minor", offs: [0, 2, 3, 5, 7, 9, 11], sig: "aeolian", chord: "m6" },
    { id: "melminc", label: "Melodic minor (classical: natural going down)", group: "Major and minor", offs: [0, 2, 3, 5, 7, 9, 11], down: [0, 2, 3, 5, 7, 8, 10], sig: "aeolian", chord: "m" },
    { id: "dorian", label: "Dorian", group: "Modes", offs: [0, 2, 3, 5, 7, 9, 10], sig: "dorian", chord: "m7" },
    { id: "phrygian", label: "Phrygian", group: "Modes", offs: [0, 1, 3, 5, 7, 8, 10], sig: "phrygian", chord: "m7" },
    { id: "lydian", label: "Lydian", group: "Modes", offs: [0, 2, 4, 6, 7, 9, 11], sig: "lydian", chord: "maj7" },
    { id: "mixo", label: "Mixolydian", group: "Modes", offs: [0, 2, 4, 5, 7, 9, 10], sig: "mixolydian", chord: "7" },
    { id: "locrian", label: "Locrian", group: "Modes", offs: [0, 1, 3, 5, 6, 8, 10], sig: "locrian", chord: "m7b5" },
    { id: "lyddom", label: "Lydian dominant (melodic minor IV)", group: "Jazz", offs: [0, 2, 4, 6, 7, 9, 10], sig: "mixolydian", chord: "7" },
    { id: "altered", label: "Altered (super-Locrian, melodic minor VII)", group: "Jazz", offs: [0, 1, 3, 4, 6, 8, 10], sig: "mixolydian", chord: "7" },
    { id: "locnat2", label: "Locrian ♮2 (melodic minor VI)", group: "Jazz", offs: [0, 2, 3, 5, 6, 8, 10], sig: "locrian", chord: "m7b5" },
    { id: "bebopdom", label: "Bebop dominant", group: "Jazz", offs: [0, 2, 4, 5, 7, 9, 10, 11], lets: [0, 1, 2, 3, 4, 5, 6, 6], sig: "mixolydian", chord: "7" },
    { id: "bebopmaj", label: "Bebop major", group: "Jazz", offs: [0, 2, 4, 5, 7, 8, 9, 11], lets: [0, 1, 2, 3, 4, 5, 5, 6], sig: "ionian", chord: "6" },
    { id: "bebopdor", label: "Bebop Dorian", group: "Jazz", offs: [0, 2, 3, 4, 5, 7, 9, 10], lets: [0, 1, 2, 2, 3, 4, 5, 6], sig: "dorian", chord: "m7" },
    { id: "dimhw", label: "Diminished, half-whole (on a 7♭9)", group: "Jazz", offs: [0, 1, 3, 4, 6, 7, 9, 10], lets: [0, 1, 1, 2, 3, 4, 5, 6], sig: "mixolydian", chord: "7" },
    { id: "dimwh", label: "Diminished, whole-half (on a dim7)", group: "Jazz", offs: [0, 2, 3, 5, 6, 8, 9, 11], lets: [0, 1, 2, 3, 4, 5, 5, 6], sig: "locrian", chord: "dim7" },
    { id: "whole", label: "Whole tone", group: "Jazz", offs: [0, 2, 4, 6, 8, 10], lets: [0, 1, 2, 3, 4, 6], sig: "mixolydian", chord: "7" },
    { id: "majpent", label: "Major pentatonic", group: "Pentatonic and blues", offs: [0, 2, 4, 7, 9], lets: [0, 1, 2, 4, 5], sig: "ionian", chord: "6" },
    { id: "minpent", label: "Minor pentatonic", group: "Pentatonic and blues", offs: [0, 3, 5, 7, 10], lets: [0, 2, 3, 4, 6], sig: "dorian", chord: "m7" },
    { id: "blues", label: "Blues (minor pentatonic + ♭5)", group: "Pentatonic and blues", offs: [0, 3, 5, 6, 7, 10], lets: [0, 2, 3, 4, 4, 6], sig: "mixolydian", chord: "7" },
    { id: "majblues", label: "Major blues", group: "Pentatonic and blues", offs: [0, 2, 3, 4, 7, 9], lets: [0, 1, 2, 2, 4, 5], sig: "mixolydian", chord: "7" },
    { id: "chrom", label: "Chromatic", group: "Other", offs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], lets: [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6], downLets: [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6], sig: "ionian", chord: "maj7" }
  ];
  var SIG = { ionian: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10] };

  // P: the figure, in scale steps from where it starts ({ d, c:-1 } = a half step below that scale note). mirror: the way down is
  // the figure upside down (Hanon) rather than the same shape moved down. chord: chord tones only (arpeggio over the octaves).
  var PATTERNS = [
    { id: "scale", label: "Scale", group: "Scales and intervals", P: [0], mirror: true,
      tip: "Even tone and even time first: record yourself and listen for notes that bulge or rush where the hand or the air changes." },
    { id: "thirds", label: "Broken thirds (1-3, 2-4…)", group: "Scales and intervals", P: [0, 2], mirror: true,
      tip: "The skip and the step alternate; keep the skipped note as loud as the step. Try 'Alternate' for 3-1, 2-4." },
    { id: "fourths", label: "Broken fourths", group: "Scales and intervals", P: [0, 3], mirror: true,
      tip: "Wider leaps: on wind and brass the air has to carry through; on strings watch the crossings." },
    { id: "sixths", label: "Broken sixths", group: "Scales and intervals", P: [0, 5], mirror: true,
      tip: "Hear the top note before you play it; sixths are where intonation slips." },
    { id: "octaves", label: "Broken octaves", group: "Scales and intervals", P: "oct", mirror: true,
      tip: "Piano: a still hand, the wrist doing the work. Winds: the octave key or overblowing without a bump." },
    { id: "g3", label: "Groups of 3 (1-2-3, 2-3-4…)", group: "Scales and intervals", P: [0, 1, 2], mirror: true,
      tip: "Three against a duple meter moves the accent: say the beat out loud, or set the unit to triplets to line them up." },
    { id: "g4", label: "Groups of 4 (1-2-3-4, 2-3-4-5…)", group: "Scales and intervals", P: [0, 1, 2, 3], mirror: true,
      tip: "The classic finger and tongue builder. Accent the first of each group, then move the accent to the 2nd, 3rd and 4th." },
    { id: "turn", label: "Turns (1-2-1-7…)", group: "Scales and intervals", P: [0, 1, 0, -1], mirror: true,
      tip: "Neighbour notes on both sides: small, even, relaxed motion." },
    { id: "triads", label: "Diatonic triads (1-3-5, 2-4-6…)", group: "Arpeggios", P: [0, 2, 4], mirror: true,
      tip: "Every chord of the key in turn. Name each chord as you play it." },
    { id: "sevenths", label: "Diatonic 7th chords (1-3-5-7…)", group: "Arpeggios", P: [0, 2, 4, 6], mirror: false, alternate: true,
      tip: "The jazz staple: every chord in the key. Up one, down the next (Alternate) is how lines move in real solos." },
    { id: "arp", label: "Tonic arpeggio over the range", group: "Arpeggios", P: "arp", mirror: true,
      tip: "The tonic chord over every octave: the shape every exam asks for. Piano: thumb under without the elbow jumping." },
    { id: "d1235", label: "Digital 1-2-3-5", group: "Jazz", P: [0, 1, 2, 4], mirror: false,
      tip: "Coltrane's favourite cell. Swing it: tongue the off-beats, slur into the beat, and let the 5 lead your ear to the next group." },
    { id: "d1357", label: "1-3-5-7 up, scale down", group: "Jazz", P: [0, 2, 4, 6, 5, 4, 3, 2], mirror: false,
      tip: "Arpeggio up, scale down: one of the shapes bebop lines are built from." },
    { id: "d5321", label: "Digital 5-3-2-1", group: "Jazz", P: [4, 2, 1, 0], mirror: false,
      tip: "The descending cell. Land the 1 on the beat." },
    { id: "encl", label: "Enclosures (above, below, target)", group: "Jazz", P: [1, { d: 0, c: -1 }, 0], mirror: false,
      tip: "Surround each scale note with the scale note above and a half step below, so the target lands on the beat. Triplets in 4/4 fit it." },
    { id: "chromapp", label: "Chromatic approach from below", group: "Jazz", P: [{ d: 0, c: -1 }, 0], mirror: false,
      tip: "A half step below each scale note: the approach note on the off-beat, the scale note on the beat." },
    { id: "dblencl", label: "Double enclosure (2 above, 1 below)", group: "Jazz", P: [2, 1, { d: 0, c: -1 }, 0], mirror: false,
      tip: "A longer approach: four notes that resolve onto the beat. Hear the target before you start." }
  ];

  // Hanon, The Virtuoso Pianist Part I, Nos. 1-20 (hanon-part1.js, HanonPart1): played note for note, in Hanon's two octaves
  var HANON = [];
  for (var hn = 1; hn <= 20; hn++) HANON.push({ id: "hanon" + hn, label: "Hanon No. " + hn, group: "Hanon (The Virtuoso Pianist, Part I)", P: "hanon", num: hn, mirror: true, unit: "s",
    tip: "Hanon's directions: lift the fingers high and play each note distinctly; begin at 60 and only speed up when every note is even. His fingering stays the same in every key. The exercise is exactly as he wrote it: two octaves up and back, whatever the octave and direction settings say." });
  PATTERNS.splice.apply(PATTERNS, [PATTERNS.findIndex(function (p) { return p.id === "d1235"; }), 0].concat(HANON));
  // feel: swing | straight; unit: the default note value; artic: the default articulation; band: a BandCatalog style id
  var STYLES = [
    { id: "classical", label: "Classical", feel: "straight", artic: "slurgroup", band: null, qpm: 72 },
    { id: "baroque", label: "Baroque (detached)", feel: "straight", artic: "stacc", band: null, qpm: 72 },
    { id: "swing", label: "Jazz swing", feel: "swing", artic: "jazz", band: "swing", qpm: 120 },
    { id: "ballad", label: "Jazz ballad", feel: "swing", artic: "jazz", band: "ballad", qpm: 66 },
    { id: "bossa", label: "Bossa nova (straight 8ths)", feel: "straight", artic: "none", band: "bossa", qpm: 120 },
    { id: "rock", label: "Rock / pop (straight 8ths)", feel: "straight", artic: "accent", band: "rock", qpm: 100 }
  ];

  // NOTE: instrument facts here are general teaching knowledge, unverified against a source (CLAUDE.md rule 4); the band's
  // instrument notes will replace them. semi / lets: written = concert + semi (letters + lets). range: written MIDI, a working range.
  var INSTRUMENTS = [
    { id: "piano", label: "Piano", clef: "treble", semi: 0, lets: 0, range: [53, 89], lhClef: "bass", lhRange: [33, 69], kind: "piano" },
    { id: "guitar", label: "Guitar (sounds an octave lower)", clef: "treble-8", semi: 12, lets: 7, range: [52, 88], kind: "guitar" },
    { id: "bass", label: "Electric bass (sounds an octave lower)", clef: "bass-8", semi: 12, lets: 7, range: [40, 72], kind: "bass" },
    { id: "flute", label: "Flute", clef: "treble", semi: 0, lets: 0, range: [60, 93], kind: "flute" },
    { id: "clarinet", label: "B♭ clarinet", clef: "treble", semi: 2, lets: 1, range: [52, 88], kind: "clarinet" },
    { id: "altosax", label: "E♭ alto sax", clef: "treble", semi: 9, lets: 5, range: [58, 89], kind: "sax" },
    { id: "tenorsax", label: "B♭ tenor sax", clef: "treble", semi: 14, lets: 8, range: [58, 89], kind: "sax" },
    { id: "trumpet", label: "B♭ trumpet", clef: "treble", semi: 2, lets: 1, range: [54, 81], kind: "trumpet" },
    { id: "horn", label: "Horn in F", clef: "treble", semi: 7, lets: 4, range: [55, 79], kind: "horn" },
    { id: "trombone", label: "Trombone", clef: "bass", semi: 0, lets: 0, range: [40, 70], kind: "trombone" },
    { id: "violin", label: "Violin", clef: "treble", semi: 0, lets: 0, range: [55, 88], kind: "strings", open: [55, 62, 69, 76], names: "GDAE" },
    { id: "viola", label: "Viola", clef: "alto", semi: 0, lets: 0, range: [48, 81], kind: "strings", open: [48, 55, 62, 69], names: "CGDA" },
    { id: "cello", label: "Cello", clef: "bass", semi: 0, lets: 0, range: [36, 69], kind: "strings", open: [36, 43, 50, 57], names: "CGDA" }
  ];

  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }

  // ── spelling ────────────────────────────────────────────────────────────────
  // a note: { L: letters above C0 (C4 = 28), m: MIDI }; its accidental is m minus the natural of its letter
  function natOf(L) { return 12 * (Math.floor(L / 7) + 1) + NAT[mod(L, 7)]; }
  function accOf(n) { return n.m - natOf(n.L); }
  function nameOf(L, acc) { return LET[mod(L, 7)] + (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc)); }
  var TONIC_SPELL = { 0: ["C"], 1: ["Db", "C#"], 2: ["D"], 3: ["Eb", "D#"], 4: ["E"], 5: ["F"], 6: ["F#", "Gb"], 7: ["G"],
    8: ["Ab", "G#"], 9: ["A"], 10: ["Bb", "A#"], 11: ["B", "Cb"] };
  function parseName(s) { var L = LET.indexOf(s[0]), acc = 0; for (var i = 1; i < s.length; i++) acc += s[i] === "#" ? 1 : -1; return { L: L, acc: acc }; }
  // the accidental each letter carries in the key signature of mode `sig` on tonic (letter tL, accidental tA)
  function sigOf(tL, tA, sig) {
    var offs = SIG[sig], out = [0, 0, 0, 0, 0, 0, 0], tonM = NAT[tL] + tA;
    for (var i = 0; i < 7; i++) { var L = tL + i, m = tonM + offs[i]; out[mod(L, 7)] = m - (NAT[mod(L, 7)] + 12 * Math.floor(L / 7)); }
    return out;
  }
  function sigCount(acc) { var s = 0; acc.forEach(function (a) { s += Math.abs(a); }); return s; }
  function sigClean(acc) { var sh = acc.some(function (a) { return a > 0; }), fl = acc.some(function (a) { return a < 0; }); return !(sh && fl) && acc.every(function (a) { return Math.abs(a) < 2; }); }
  // ABC K: for a signature: the major key with those accidentals
  var MAJ_BY_COUNT = { "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb", "-2": "Bb", "-1": "F", "0": "C", "1": "G", "2": "D", "3": "A", "4": "E", "5": "B", "6": "F#", "7": "C#" };
  function kOf(acc) { var n = 0; acc.forEach(function (a) { n += a; }); return MAJ_BY_COUNT[String(n)] || "C"; }
  // the tonic's spelling for this scale: the one with the fewest accidentals in its signature (sharps win a tie)
  function spellTonic(pc, scale, inst) {
    var best = null;
    TONIC_SPELL[mod(pc, 12)].forEach(function (s) {
      var t = parseName(s), acc = sigOf(t.L, t.acc, scale.sig), c = sigClean(acc) ? sigCount(acc) : 99;
      if (inst && inst.semi) {   // a transposing instrument: what matters is the key it reads in
        var wL = t.L + inst.lets, wm = NAT[t.L] + t.acc + inst.semi, wa = wm - (NAT[mod(wL, 7)] + 12 * Math.floor(wL / 7));
        var wacc = sigOf(mod(wL, 7), wa, scale.sig); c = (sigClean(wacc) && Math.abs(wa) < 2 ? sigCount(wacc) : 99) * 10 + c;
      }
      if (!best || c < best.c) best = { name: s, L: t.L, acc: t.acc, c: c };
    });
    return best;
  }

  // ── the degree stream ───────────────────────────────────────────────────────
  function elem(e) { return typeof e === "number" ? { d: e, c: 0 } : { d: e.d, c: e.c || 0 }; }
  function stream(pat, n, oct, dir, mirror, alternate) {
    var top = n * oct, out = [];
    if (pat.P === "hanon") {
      var H = global.HanonPart1 && global.HanonPart1[pat.num];
      if (!H) return [];
      var hs = H.d.map(function (d, i) { return { d: d, c: 0, g: i % 8 === 0, dn: i >= H.d.length / 2 }; });
      hs.push({ d: H.final[0], c: 0, g: true, dn: true, chord: H.final.slice(1) });
      return hs;
    }
    if (pat.P === "arp") {
      var tones = n >= 7 ? [0, 2, 4] : n === 5 ? [0, 2, 3] : n === 6 ? [0, 2, 4] : [0, Math.round(n / 3), Math.round(2 * n / 3)];
      if (n === 12) tones = [0, 4, 7]; if (n === 8) tones = [0, 2, 4];
      var up = []; for (var o = 0; o < oct; o++) tones.forEach(function (t) { up.push(o * n + t); }); up.push(top);
      var down = up.slice().reverse();
      var seq = dir === "up" ? up : dir === "down" ? down : dir === "downup" ? down.concat(up.slice(1)) : up.concat(down.slice(1));
      return seq.map(function (d) { return { d: d, c: 0, dirDown: false }; });
    }
    var P = (pat.P === "oct" ? [0, n] : pat.P).map(elem);
    var maxP = Math.max.apply(null, P.map(function (e) { return e.d; })), minP = Math.min.apply(null, P.map(function (e) { return e.d; }));
    function ascend(single) {
      var r = [], k = 0, last = single ? top - 1 : top - maxP;
      for (var s = -minP; s <= last; s++, k++) { var g = alternate && k % 2 ? P.slice().reverse() : P; g.forEach(function (e, i) { r.push({ d: s + e.d, c: e.c, g: i === 0 }); }); }
      return r;
    }
    function descend(single) {
      var r = [], k = 0;
      if (mirror) {
        var Q = P.map(function (e) { return { d: -e.d, c: e.c }; }), qmin = -maxP, first = single ? top : top + minP;
        for (var s = first; s + qmin >= 0 && (!single || s > 0); s--, k++) { var g = alternate && k % 2 ? Q.slice().reverse() : Q; g.forEach(function (e, i) { r.push({ d: s + e.d, c: e.c, g: i === 0, dn: true }); }); }
      } else {
        for (var s2 = top - maxP; s2 >= -minP && (!single || s2 > 0); s2--, k++) { var g2 = alternate && k % 2 ? P.slice().reverse() : P; g2.forEach(function (e, i) { r.push({ d: s2 + e.d, c: e.c, g: i === 0, dn: true }); }); }
      }
      return r;
    }
    var single = P.length === 1;
    if (dir === "up") { out = ascend(false); if (single) out.push({ d: top, c: 0, g: true }); }
    else if (dir === "down") { out = descend(single); out.push({ d: 0, c: 0, g: true, dn: true }); }
    else if (dir === "downup") { out = descend(single).concat(ascend(single)); out.push({ d: top, c: 0, g: true }); }
    else { out = ascend(single).concat(descend(single)); out.push({ d: 0, c: 0, g: true, dn: true }); }
    if (!single && dir !== "up" && dir !== "down") {
      // a figure ends where the sequence stopped; finish on the tonic (or the top) unless it already did
      var lastN = out[out.length - 2], want = out[out.length - 1].d;
      if (lastN && lastN.d === want && !lastN.c) out.pop();
    }
    if (single && dir === "up") {} // the top was pushed above
    return out;
  }

  // a degree (and chromatic shift) as a spelled note, on tonic { L, m }
  function noteAt(e, scale, tonic, lets, offs) {
    var n = offs.length, o = Math.floor(e.d / n), i = mod(e.d, n);
    var L = tonic.L + lets[i] + 7 * o, m = tonic.m + offs[i] + 12 * o;
    if (e.c) { m += e.c; if (e.c < 0) { var prev = mod(e.d - 1, n), po = Math.floor((e.d - 1) / n), pm = tonic.m + offs[prev] + 12 * po; L = pm === m ? tonic.L + lets[prev] + 7 * po : L - 1; } }
    if (Math.abs(m - natOf(L)) > 2) L = L + (m > natOf(L) ? 1 : -1);   // nothing worse than a double accidental
    return { L: L, m: m };
  }

  // ── rhythm ──────────────────────────────────────────────────────────────────
  // ABC with L:1/32. groups: the beat groups of a bar, in 32nds (beams break between them)
  function meterInfo(meter) {
    var p = meter.split("/"), num = +p[0], den = +p[1], u = 32 / den, groups = [];
    if (den === 8 && num % 3 === 0) for (var i = 0; i < num / 3; i++) groups.push(3 * u);
    else if (den === 8) { for (var r = num; r > 0;) { var g = r === 3 ? 3 : 2; groups.push(g * u); r -= g; } }
    else for (var j = 0; j < num; j++) groups.push(u);
    var bar = groups.reduce(function (a, b) { return a + b; }, 0);
    return { num: num, den: den, groups: groups, bar: bar, compound: den === 8 && num % 3 === 0 };
  }
  var LENS = [48, 32, 24, 16, 12, 8, 6, 4, 3, 2, 1];
  function splitLen(len) { var r = []; while (len > 0) { for (var i = 0; i < LENS.length; i++) if (LENS[i] <= len) { r.push(LENS[i]); len -= LENS[i]; break; } } return r; }
  function lenStr(n) { return n === 1 ? "" : String(n); }

  function abcPitch(n, acc) {
    var l = LET[mod(n.L, 7)], o = Math.floor(n.L / 7), s = acc === null ? "" : acc === 0 ? "=" : acc > 0 ? "^".repeat(acc) : "_".repeat(-acc);
    if (o >= 5) s += l.toLowerCase() + "'".repeat(o - 5); else s += l + ",".repeat(4 - o);
    return s;
  }

  // ── instrument help ─────────────────────────────────────────────────────────
  function tbPositions(m) {   // trombone: the lowest slide position (partials of B♭, skipping the flat 7th)
    var best = null;
    [2, 3, 4, 5, 6, 8].forEach(function (p) { var base = 34 + Math.round(12 * Math.log2(p)); var pos = base - m + 1; if (pos >= 1 && pos <= 7 && (!best || pos < best)) best = pos; });
    return best;
  }
  var VALVES = ["0", "2", "1", "12", "23", "13", "123"];
  function tpValves(w) {      // trumpet (written): fewest valves over the open partials of written C
    var opens = [48, 60, 67, 72, 76, 79, 84, 88], best = null;
    opens.forEach(function (o) { var dr = o - w; if (dr >= 0 && dr <= 6 && (best === null || dr < best)) best = dr; });
    return best === null ? "" : VALVES[best];
  }
  function stringOf(inst, m) { var o = inst.open, s = 0; for (var i = 0; i < o.length; i++) if (m >= o[i]) s = i; return s; }

  function instTips(inst, written, concert, hand) {
    var t = [], lo = Math.min.apply(null, written), hi = Math.max.apply(null, written), k = inst.kind;
    function cross(a, b) { var c = 0; for (var i = 1; i < written.length; i++) if ((written[i - 1] <= a) !== (written[i] <= a)) c++; return c; }
    if (k === "piano") {
      t.push("Hands separately first, then together an octave apart. Watch for the thumb crossing: the hand moves sideways, the elbow stays level.");
      if (hand === "lh") t.push("Left hand: the thumb passes under on the way up, the 3rd or 4th finger crosses over on the way down.");
    }
    if (k === "clarinet") {
      var c = cross(70, 71);
      if (c) t.push("Crosses the break (written B♭4 to B4) " + c + " time" + (c > 1 ? "s" : "") + ": keep the right hand down where you can and the air fast through the change.");
      if (hi > 84) t.push("Altissimo above written C6: voicing high, a firm corner.");
    }
    if (k === "sax") {
      var palm = written.filter(function (w) { return w >= 86; }).length, low = written.filter(function (w) { return w <= 61; }).length;
      if (palm) t.push(palm + " palm-key note" + (palm > 1 ? "s" : "") + " (written D6 and up): keep the hand relaxed and the air steady, they go sharp and thin.");
      if (low) t.push(low + " note" + (low > 1 ? "s" : "") + " at the bottom (written C♯4 and below): little-finger table keys, slide between them; open the throat and keep the low notes from cracking.");
    }
    if (k === "flute") {
      if (lo < 64) t.push("Low register (below E4): the lips relaxed, aim the air lower; it speaks slowly.");
      if (hi > 88) t.push("Third octave (above E6): faster, narrower air, not more pressure.");
    }
    if (k === "trumpet") {
      var hiN = written.filter(function (w) { return w > 79; }).length;
      if (hiN) t.push(hiN + " note" + (hiN > 1 ? "s" : "") + " above written G5: rest between repetitions, endurance builds slowly.");
      if (written.some(function (w) { return w === 61 || w === 62; })) t.push("Written low C♯4 and D4 (1-2-3, 1-3) are sharp: kick the 3rd valve slide out.");
      t.push("Valve numbers are under the notes. Slur the scale on one breath once it is clean tongued.");
    }
    if (k === "horn") t.push("The horn's partials sit close together in the middle register: sing the note first so you land on the right one.");
    if (k === "trombone") {
      var far = concert.filter(function (m) { var p = tbPositions(m); return p >= 5; }).length;
      t.push("Slide positions are under the notes (the lowest one; F3 can also be 6th, and D4 4th). " + (far ? far + " notes in 5th position or further: move the slide quickly and late, the arm from the elbow." : ""));
      t.push("Legato on trombone means a soft 'doo' tongue on every slide change, or the slide makes a gliss.");
    }
    if (k === "strings") {
      var cr = 0; for (var i = 1; i < concert.length; i++) if (stringOf(inst, concert[i]) !== stringOf(inst, concert[i - 1])) cr++;
      var top = inst.open[inst.open.length - 1] + 7, shift = concert.filter(function (m) { return m > top; }).length;
      t.push("First position: " + cr + " string crossing" + (cr === 1 ? "" : "s") + " (the string names are under the notes). Bow arm level changes early, before the note.");
      if (shift) t.push(shift + " note" + (shift > 1 ? "s" : "") + " above first position: plan the shift on a half step, and practise it slowly with a guide note.");
    }
    if (k === "guitar") {
      t.push("Pick a position and stay in it: one finger per fret, the scale in one or two positions. Then play it again as three notes per string for speed.");
      t.push("Alternate picking (down-up) strictly; on string changes the pick stays inside the strings.");
    }
    if (k === "bass") t.push("One finger per fret, alternate index and middle (fingerstyle). Mute the string you just left.");
    if (lo < inst.range[0] || hi > (hand === "lh" && inst.lhRange ? inst.lhRange[1] : inst.range[1])) t.push("Some notes are outside the usual range for this instrument; try fewer octaves or move the octave.");
    return t;
  }

  // ── make ────────────────────────────────────────────────────────────────────
  function make(o) {
    o = o || {};
    var scale = byId(SCALES, o.scale), pat = byId(PATTERNS, o.pattern), style = byId(STYLES, o.style), inst = byId(INSTRUMENTS, o.inst);
    var lh = inst.kind === "piano" && o.hand === "lh";
    var oct = Math.max(1, Math.min(3, +o.octaves || 1)), dir = o.dir || "updown";
    var mirror = o.mirror == null ? pat.mirror : !!o.mirror, alternate = o.alternate == null ? !!pat.alternate : !!o.alternate;
    var meter = meterInfo(o.meter || "4/4"), warnings = [];

    // concert tonic, then the written one
    var ct = spellTonic(o.tonic == null ? 0 : +o.tonic, scale, inst);
    var wL = ct.L + inst.lets, wM0 = NAT[ct.L] + ct.acc + inst.semi;            // written tonic, in the C0 octave numbering below
    var wTon = { L: mod(wL, 7), acc: wM0 - (NAT[mod(wL, 7)] + 12 * Math.floor(wL / 7)) };
    var sigAcc = sigOf(wTon.L, wTon.acc, scale.sig);
    if (!sigClean(sigAcc)) warnings.push("This key's signature needs double accidentals; it is printed with accidentals instead.");
    var K = sigClean(sigAcc) ? kOf(sigAcc) : "C";
    var keyAcc = sigClean(sigAcc) ? sigAcc : [0, 0, 0, 0, 0, 0, 0];

    // where it sits: the octave that keeps the whole span inside the range, near its middle
    var n = scale.offs.length, lets = scale.lets || [0, 1, 2, 3, 4, 5, 6];
    var degs = stream(pat, n, oct, dir, mirror, alternate);
    while (degs.length < 4 && oct < 3) { oct++; degs = stream(pat, n, oct, dir, mirror, alternate); warnings.push("This figure needs more room: " + oct + " octaves."); }
    var range = lh && inst.lhRange ? inst.lhRange : inst.range;
    function build(octNo) {
      var ton = { L: wTon.L + 7 * octNo, m: 12 * (octNo + 1) + NAT[wTon.L] + wTon.acc };
      return degs.map(function (e) {
        var useOffs = scale.down && e.dn ? scale.down : scale.offs, useLets = scale.downLets && e.dn ? scale.downLets : lets;
        var nt = noteAt(e, scale, ton, useLets, useOffs); nt.g = e.g;
        if (e.chord && e.chord.length) nt.chord = e.chord.map(function (d) { return noteAt({ d: d, c: 0 }, scale, ton, useLets, useOffs); });
        return nt;
      });
    }
    var bestOct = 4, bestScore = 1e9;
    for (var on = 1; on <= 6; on++) {
      var ns = build(on), lo = Math.min.apply(null, ns.map(function (x) { return x.m; })), hi = Math.max.apply(null, ns.map(function (x) { return x.m; }));
      var out = Math.max(0, range[0] - lo) + Math.max(0, hi - range[1]), mid = Math.abs((lo + hi) / 2 - (range[0] + range[1]) / 2);
      var score = out * 100 + mid; if (score < bestScore) { bestScore = score; bestOct = on; }
    }
    bestOct += (+o.octaveShift || 0);
    var notes = build(bestOct);

    // the note value
    var unit = o.unit && o.unit !== "auto" ? o.unit : pat.unit || (pat.P !== "arp" && pat.P !== "oct" && pat.P.length === 3 && !meter.compound && meter.den === 4 ? "t" : (style.id === "ballad" ? "e" : "e"));
    if (unit === "t" && (meter.den !== 4)) unit = "e";
    var dur = { q: 8, e: 4, t: 4, s: 2 }[unit] || 4;
    var rhythm = unit === "t" ? "even" : (o.rhythm || "even");
    var artic = o.artic || style.artic;
    var swing = style.feel === "swing" && unit === "e" && meter.den === 4;

    // fingerings / positions / valves / strings under the notes
    var labels = null;
    if (o.labels !== false) {
      if (inst.kind === "piano" && pat.P === "hanon" && global.HanonPart1) {
        var hf = global.HanonPart1[pat.num][lh ? "lh" : "rh"];
        labels = notes.map(function (nt, i) { return hf[i] ? String(hf[i]) : ""; });
      } else if (inst.kind === "piano" && pat.fing) {
        var f = pat.fing[lh ? "lh" : "rh"], k = 0, len = pat.P.length;
        labels = notes.map(function (nt, i) { return i === notes.length - 1 ? String(lh ? 1 : f[0]) : String(f[i % len]); });
        if (!lh) labels[notes.length - 1] = "1";
      } else if (inst.kind === "piano" && pat.id === "scale" && n === 7 && global.ScaleFingering) {
        var fg = null; try { fg = global.ScaleFingering.get(mod(ct.L >= 0 ? NAT[ct.L] + ct.acc : 0, 12), scale.offs); } catch (e) { fg = null; }
        if (fg) {
          var f8 = fg[lh ? "lh" : "rh"].fingers, topD = n * oct, midF = f8[0] === 1 ? f8[0] : f8[7];
          labels = degs.map(function (e) { var d = e.d; if (d === 0) return String(f8[0]); if (d === topD) return String(f8[7]); return String(d % 7 === 0 ? midF : f8[d % 7]); });
        }
      } else if (inst.kind === "trombone") labels = notes.map(function (nt) { var p = tbPositions(nt.m); return p ? String(p) : "*"; });
      else if (inst.kind === "trumpet") labels = notes.map(function (nt) { return tpValves(nt.m) || "*"; });
      else if (inst.kind === "strings") labels = notes.map(function (nt) { return inst.names[stringOf(inst, nt.m)]; });
    }

    // durations: even, or long-short / short-long pairs
    var durs = notes.map(function (_, i) {
      if (rhythm === "even" || i === notes.length - 1) return dur;
      var first = i % 2 === 0; return rhythm === "longshort" ? (first ? dur * 1.5 : dur * 0.5) : (first ? dur * 0.5 : dur * 1.5);
    });
    if (rhythm !== "even" && (notes.length - 1) % 2 === 1) durs[notes.length - 2] = dur;   // an odd one out at the end stays even

    // write it out
    var chordSym = nameOf(wTon.L, wTon.acc) + scale.chord, concertChord = nameOf(ct.L, ct.acc) + scale.chord;
    var body = "", play = "", pos = 0, barNo = 0, barAcc = {}, lineLyr = [], lyrLines = [], tupLeft = 0, inSlur = false;
    var swPend = false, groupStarts = []; for (var g = 0, gs = 0; g < meter.groups.length; g++) { groupStarts.push(gs); gs += meter.groups[g]; }
    function accFor(nt) {
      var a = accOf(nt), key = nt.L, cur = key in barAcc ? barAcc[key] : keyAcc[mod(nt.L, 7)];
      if (a === cur) return null; barAcc[key] = a; return a;
    }
    function barline(last) {
      barNo++; barAcc = {};
      var s = last ? "|]" : (barNo % 4 === 0 ? "|\n" : "| ");
      body += s; play += s;
      if (barNo % 4 === 0 || last) { lyrLines.push(lineLyr); lineLyr = []; if (!last) { body += "%LYR%\n"; play += "\n"; } }
    }
    function emit(nt, len, opts) {
      opts = opts || {};
      var room = meter.bar - (pos % meter.bar);
      if (room < 1e-6) room = meter.bar;
      if (!opts.trip && unit !== "t" && len > room + 1e-6) {
        var a = splitLen(room), b = splitLen(len - room), pieces = a.concat(b), keep = opts;
        pieces.forEach(function (pl, j) {
          var o2 = j === 0 ? { i: keep.i, slurOpen: keep.slurOpen, accent: keep.accent, stacc: keep.stacc, rest: keep.rest, last: keep.last, tail: keep.tail }
            : { i: keep.i, rest: keep.rest, tail: true, last: keep.last };
          if (j === pieces.length - 1) { o2.slurClose = keep.slurClose; o2.tie = keep.tie; } else o2.tie = !keep.rest;
          emit1(nt, pl, o2);
        });
        return;
      }
      if (!opts.rest && !opts.trip && unit !== "t" && LENS.indexOf(len) < 0) {
        var ps = splitLen(len), k2 = opts;
        ps.forEach(function (pl, j) { emit1(nt, pl, j === 0 ? Object.assign({}, k2, { tie: true, slurClose: false }) : (j === ps.length - 1 ? { i: k2.i, tail: true, tie: k2.tie, slurClose: k2.slurClose, last: k2.last } : { i: k2.i, tail: true, tie: true })); });
        return;
      }
      emit1(nt, len, opts);
    }
    function emit1(nt, len, opts) {
      var inBar = pos % meter.bar;
      if (inBar < 1e-6 && pos > 0) barline(false);
      inBar = pos % meter.bar;
      if (groupStarts.indexOf(inBar) >= 0 && inBar > 0 && tupLeft === 0) { body += " "; play += " "; }
      var tup = "", slur = opts.slurOpen ? "(" : "", chord = "", deco = "";
      if (unit === "t" && tupLeft === 0 && !opts.last) { tup = "(3"; tupLeft = 3; }
      opts.trip = tupLeft > 0;
      if (inBar === 0 && o.chords) chord = '"' + chordSym + '"';
      if (opts.accent) deco += "!>!";
      if (opts.stacc) deco += ".";
      var p = opts.rest ? "z" : nt.chord && nt.chord.length ? "[" + [nt].concat(nt.chord).map(function (x) { return abcPitch(x, accFor(x)); }).join("") + "]" : abcPitch(nt, accFor(nt));
      var tail = (opts.tie ? "-" : "") + (opts.slurClose ? ")" : "");
      body += tup + slur + chord + deco + p + lenStr(len) + tail;
      // swung playback: an even pair of eighths on the beat becomes a triplet quarter + eighth
      if (opts.swingPair === 1) play += "(3:2:2" + slur + deco + p + "8" + tail;
      else if (opts.swingPair === 2) play += slur + deco + p + "4" + tail;
      else play += tup + slur + deco + p + lenStr(len) + tail;
      if (tupLeft > 0) tupLeft--;
      if (!opts.tail && !opts.rest) lineLyr.push(labels ? labels[opts.i] : "");
      pos += (opts.trip ? len * 2 / 3 : len); pos = Math.round(pos * 3) / 3;
    }

    for (var i = 0; i < notes.length - 1; i++) {
      var nt = notes[i], inBeat = pos % meter.groups[0], slot = Math.round(inBeat / dur);
      var op = { i: i };
      if (artic === "slurgroup" && pat.P.length > 1) { if (nt.g && !inSlur) { op.slurOpen = true; inSlur = true; } var nx = notes[i + 1]; if (inSlur && (nx.g || i === notes.length - 2)) { op.slurClose = true; inSlur = false; } }
      if (artic === "slurgroup" && pat.P.length === 1) { if (pos % meter.bar === 0) { op.slurOpen = true; inSlur = true; } if (inSlur && ((pos + durs[i]) % meter.bar === 0 || i === notes.length - 2)) { op.slurClose = true; inSlur = false; } }
      if (artic === "jazz" && unit === "e" && meter.den === 4) { var off = (pos % 8) === 4; if (off && i < notes.length - 2) { op.slurOpen = true; op.accent = true; } if (!off && i > 0 && (pos % 8) === 0 && inSlur) op.slurClose = true; inSlur = off && i < notes.length - 2; }
      if (artic === "stacc") op.stacc = true;
      if (artic === "accent" && nt.g && pat.P.length > 1) op.accent = true;
      if (artic === "accent" && pat.P.length === 1 && pos % meter.groups[0] === 0) op.accent = true;
      if (swing && rhythm === "even") { if (pos % 8 === 0 && i + 1 < notes.length - 1) { op.swingPair = 1; swPend = true; } else if (pos % 8 === 4 && swPend) { op.swingPair = 2; swPend = false; } }
      emit(nt, durs[i], op);
    }
    if (inSlur) { body += ")"; play += ")"; inSlur = false; }
    // the triplet's empty places, then the last note held to the end of the bar (and a bar more if that is under a beat)
    var lastN = notes[notes.length - 1], restEnd = false;
    if (tupLeft > 0) { emit(lastN, dur, { i: notes.length - 1 }); while (tupLeft > 0) emit(null, dur, { rest: true }); restEnd = true; }
    var rem = meter.bar - pos % meter.bar;
    if (rem === meter.bar && pos > 0) rem = 0;
    var parts = [];
    if (rem > 0) { var spl = splitLen(rem); if (rem < meter.groups[0]) { splitLen(rem).forEach(function (x) { parts.push(x); }); splitLen(meter.bar).forEach(function (x) { parts.push(x); }); } else parts = spl; }
    else parts = splitLen(meter.bar);
    if (restEnd) { if (rem > 0 && rem < meter.bar) splitLen(rem).forEach(function (len) { emit(null, len, { rest: true, last: true }); }); }
    else parts.forEach(function (len, j) { emit(lastN, len, { i: notes.length - 1, tie: j < parts.length - 1, tail: j > 0, last: true }); });
    barline(true);

    // lyric lines for fingerings
    var lines = body.split("%LYR%\n"), outBody = "";
    lines.forEach(function (ln, j) {
      outBody += ln.replace(/\n$/, "") + "\n";
      if (labels && lyrLines[j] && lyrLines[j].some(function (x) { return x; })) outBody += "w: " + lyrLines[j].map(function (x) { return x || "*"; }).join(" ") + "\n";
    });

    var title = nameOf(ct.L, ct.acc) + " " + scale.label.replace(/ \(.*\)$/, "").toLowerCase() + ": " + pat.label;
    var clef = lh && inst.lhClef ? inst.lhClef : inst.clef;
    var qpm = +o.qpm || style.qpm;
    var qUnit = meter.compound ? "3/8" : "1/" + meter.den;
    var qVal = meter.compound ? Math.round(qpm * 2 / 3) : (meter.den === 8 ? qpm * 2 : qpm);
    var head = "X:1\nT:" + title + "\n" + (inst.semi ? "C:" + inst.label + " (written pitch)\n" : "") + "M:" + o.meter + "\nL:1/32\nQ:" + (swing ? '"Swing" ' : "") + qUnit + "=" + qVal + "\nK:" + K + " clef=" + clef + "\n";
    var playHead = "X:1\nM:" + o.meter + "\nL:1/32\nQ:" + qUnit + "=" + qVal + "\nK:" + K + " clef=" + clef + "\n";

    var written = notes.map(function (x) { return x.m; }), concert = written.map(function (w) { return w - inst.semi; });
    var tips = [pat.tip];
    if (pat.P === "hanon" && n !== 7) tips.push("Hanon wrote these for a seven-note scale; on this scale the figure shifts shape as it climbs.");
    if (swing) tips.push("Swing: the eighths are written straight and played long-short, close to a triplet at medium tempos and evening out as it gets faster. The jazz articulation (on) tongues each off-beat and slurs into the next beat.");
    if (rhythm !== "even") tips.push("Practise rhythms (long-short, then short-long) make every finger arrive on time; go back to even and the passage is cleaner.");
    tips.push("Tempo: start where it is perfect, then raise the metronome a few clicks at a time. Two clean runs in a row before each step up.");
    if (scale.id === "melminc") tips.push("Classical melodic minor: raised 6th and 7th going up, natural minor coming down.");

    return { abc: head + outBody, playAbc: playHead + play.replace(/%LYR%\n?/g, "") + "\n", title: title, notes: notes,
      tips: tips, instTips: instTips(inst, written, concert, lh ? "lh" : "rh"), warnings: warnings, semi: inst.semi,
      band: style.band, concertChord: concertChord, swing: swing, qpm: qpm, range: { lo: Math.min.apply(null, concert), hi: Math.max.apply(null, concert) } };
  }

  var api = { make: make, SCALES: SCALES, PATTERNS: PATTERNS, STYLES: STYLES, INSTRUMENTS: INSTRUMENTS, meterInfo: meterInfo, spellTonic: spellTonic, _stream: stream };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ScalePatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
