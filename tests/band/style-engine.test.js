// node tests/band/style-engine.test.js: StyleEngine (apps/shared/band/style-engine.js). The manuals' own examples first
// (Genos RM p. 28 NTR, PSR-I610 RM p. 45 Single Finger), then chord recognition and the conversion tables.
const path = require("path"), ROOT = path.resolve(__dirname, "../..");
const S = require(ROOT + "/apps/shared/band/style-engine.js");
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log("FAIL", m); } };
const C3 = 48, F = { root: 5, type: "M", bass: 5 }, src = { root: 0, type: "M7" };
const conv = (ms, ch, chord) => ms.map(m => S.convert(m, ch, src, chord, ms));
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ": got " + JSON.stringify(a) + " want " + JSON.stringify(b));

// Genos RM p. 28: C3 E3 G3 over F
eq(conv([48, 52, 55], { ntr: "trans", ntt: "chord" }, F), [53, 57, 60], "Root Trans: F3 A3 C4");
eq(conv([48, 52, 55], { ntr: "fixed", ntt: "chord" }, F), [53, 57, 48], "Root Fixed: C3 F3 A3 (as a set)");
eq(conv([48, 52, 55], { ntr: "fixed", ntt: "bypass" }, F), [48, 52, 55], "Root Fixed + Bypass: no conversion (rhythm)");
eq(conv([48, 52, 55], { ntr: "trans", ntt: "bypass" }, { root: 5, type: "m7", bass: 5 }), [53, 57, 60], "Root Trans + Bypass: transposition only");
// High Key (F default): roots above F drop an octave
eq(conv([48], { ntr: "trans", ntt: "melody" }, { root: 7, type: "M", bass: 7 }), [43], "High Key F: G root goes down");
eq(conv([48], { ntr: "trans", ntt: "melody", highKey: 11 }, { root: 7, type: "M", bass: 7 }), [55], "High Key B: G root goes up");
// Chord table: CM7 tones to each type
const chordOf = t => conv([60, 64, 67, 71], { ntr: "trans", ntt: "chord" }, { root: 0, type: t, bass: 0 });
eq(chordOf("m7"), [60, 63, 67, 70], "chord: Cm7"); eq(chordOf("M"), [60, 64, 67, 72], "chord: C (7th slot doubles the root)");
eq(chordOf("7"), [60, 64, 67, 70], "chord: C7"); eq(chordOf("dim7"), [60, 63, 66, 69], "chord: Cdim7"); eq(chordOf("sus4"), [60, 65, 67, 72], "chord: Csus4");
// Melody table: CM7 scale tones C D E G A B
const mel = t => conv([60, 62, 64, 67, 69, 71], { ntr: "trans", ntt: "melody" }, { root: 0, type: t, bass: 0 });
eq(mel("m7"), [60, 62, 63, 67, 69, 70], "melody: Cm7 (Dorian)"); eq(mel("7"), [60, 62, 64, 67, 69, 70], "melody: C7 (Mixolydian)");
eq(conv([60, 62, 64, 67, 69, 71], { ntr: "trans", ntt: "melody" }, { root: 9, type: "m7", bass: 9 }), [57, 59, 60, 64, 66, 67], "melody over Am7, root down from A");
// minor tables (Genos RM p. 29)
const mm = (ntt, t) => conv([60, 64, 67, 69, 71], { ntr: "trans", ntt }, { root: 0, type: t, bass: 0 });
eq(mm("melodicMinor", "m"), [60, 63, 67, 69, 71], "Melodic Minor lowers the 3rd");
eq(mm("harmonicMinor", "m"), [60, 63, 67, 68, 71], "Harmonic Minor lowers 3rd and 6th");
eq(mm("naturalMinor", "m"), [60, 63, 67, 68, 70], "Natural Minor lowers 3rd, 6th, 7th");
eq(mm("dorian", "m"), [60, 63, 67, 69, 70], "Dorian lowers 3rd and 7th");
eq(mm("harmonicMinor", "M"), [60, 64, 67, 69, 71], "major chord: unchanged");
eq(mm("harmonicMinor5", "aug"), [60, 64, 68, 69, 71], "the 5th version moves the 5th for aug");
eq(mm("harmonicMinor", "aug"), [60, 64, 67, 69, 71], "the plain version does not");
// note limit and NTT bass
eq(conv([40], { ntr: "trans", ntt: "melody", lo: 41, hi: 60 }, { root: 0, type: "M", bass: 0 }), [52], "note limit folds up");
eq(conv([36], { ntr: "trans", ntt: "melody", nttBass: true }, { root: 0, type: "M", bass: 4 }), [40], "NTT Bass: C/E plays E");
ok(S.convert(60, { ntr: "trans", ntt: "melody" }, src, null) === null, "no chord: silent");

// Single Finger (PSR-I610 RM p. 45), root C4
const sf = ms => { const c = S.recognize(ms, "single"); return c && c.name; };
eq(sf([60]), "C", "one key: major"); eq(sf([58, 60]), "Cm", "with the black key to its left: minor");
eq(sf([59, 60]), "C7", "with the white key to its left: 7th"); eq(sf([58, 59, 60]), "Cm7", "both: minor 7th");
eq(sf([64]), "E", "E"); eq(sf([63, 64]), "Em", "E with E♭: Em"); eq(sf([62, 64]), "E7", "E with D: E7");
eq(sf([64, 65]), "F7", "F with E: F7 (E is its nearest white key)"); eq(sf([55, 60]), null, "far keys: nothing");
// Fingered
const fi = (ms, mode) => { const c = S.recognize(ms, mode || "fingered"); return c && c.name; };
eq(fi([48, 52, 55]), "C", "C"); eq(fi([52, 55, 60]), "C", "first inversion still C"); eq(fi([57, 60, 64, 67]), "Am7", "Am7 (lowest key is the root)");
eq(fi([48, 52, 58]), "C7", "C7 without its 5th"); eq(fi([47, 50, 53, 57]), "Bm7♭5", "Bm7b5"); eq(fi([48, 51, 54, 57]), "Cdim7", "dim7");
eq(fi([48, 53, 55]), "Csus4", "sus4"); eq(fi([48, 52, 56]), "Caug", "aug"); eq(fi([48, 52]), null, "two keys: nothing in Fingered");
eq(fi([52, 55, 60], "onbass"), "C/E", "On Bass: lowest key is the bass");
eq(fi([60], "multi"), "C", "Multi: one key = Single Finger"); eq(fi([58, 59, 60], "multi"), "Cm7", "Multi: Single Finger m7");
eq(fi([48, 52, 55], "multi"), "C", "Multi: a whole chord = Fingered");
// every written note of every type converts to something in range
for (const t of Object.keys(S.TYPES)) for (let r = 0; r < 12; r++) for (const ntt of ["melody", "chord", "bypass", "dorian5"]) for (const ntr of ["trans", "fixed"]) for (let m = 36; m < 84; m++) {
  const o = S.convert(m, { ntr, ntt, lo: 28, hi: 96 }, src, { root: r, type: t, bass: r }, [m]);
  if (o == null || o < 28 || o > 96 || Math.abs(o - m) > 14) { ok(false, `${t} root ${r} ${ntr}/${ntt} ${m} -> ${o}`); }
}
ok(true, "sweep");
console.log(bad ? bad + " of " + n + " FAILED" : "all " + n + " passed"); process.exit(bad ? 1 : 0);
