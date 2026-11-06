// Known faults (a) and (c) from NOTES.org.
//  (a) Chord Sheet key Auto-detect: Dm7 G7 Cmaj7 A7 (ii-V-I-VI) is C major, not G. The page asks PitchSpelling.keyFromChords.
//  (c) pitch-spelling.js had two romanNumeral functions (the second won): the mode-aware one must be the one exported.
// `node tests/band/faults/key-and-roman.test.js`   NEG=1 must fail.
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "../../..");
const src = fs.readFileSync(ROOT + "/apps/shared/pitch-spelling.js", "utf8");
vm.runInThisContext(src, { filename: "pitch-spelling.js" });
let fail = 0; const ok = (c, m) => { if (!c){ fail++; console.log("FAIL", m); } };

// (c) one definition, and it knows minor keys
ok((src.match(/function romanNumeral\s*\(/g) || []).length === 1, "romanNumeral is defined once");
const R = PitchSpelling.romanNumeral;
ok(R(9, "min7", { tonicPc: 0, mode: "major" }) === "vi7", "vi7 in C major, got " + R(9, "min7", { tonicPc: 0, mode: "major" }));
ok(R(7, "7", { tonicPc: 0 }) === "V7", "V7");
ok(R(8, "maj", { tonicPc: 0, mode: "minor" }) === "VI", "Ab in C minor is VI, got " + R(8, "maj", { tonicPc: 0, mode: "minor" }));
ok(R(10, "maj", { tonicPc: 0, mode: "major" }) === "bVII", "Bb in C major is bVII, got " + R(10, "maj", { tonicPc: 0, mode: "major" }));
ok(R(11, "dim", { tonicPc: 0 }) === "vii°", "vii-dim uses the degree sign, got " + R(11, "dim", { tonicPc: 0 }));
ok(R(0, "maj7", { tonicPc: 0 }) === "Imaj7", "Imaj7, got " + R(0, "maj7", { tonicPc: 0 }));
ok(R(5, "bogus", { tonicPc: 0 }) === "IV", "an unknown quality gives the plain numeral, got " + R(5, "bogus", { tonicPc: 0 }));

// (a) key from chords
const M7 = [0, 3, 7, 10], D7 = [0, 4, 7, 10], MA7 = [0, 4, 7, 11], MJ = [0, 4, 7], MN = [0, 3, 7];
const K = (...cs) => PitchSpelling.keyFromChords(cs.map(([r, iv]) => ({ rootPc: r, intervals: iv })));
ok(typeof PitchSpelling.keyFromChords === "function", "keyFromChords exists");
if (PitchSpelling.keyFromChords){
  ok(K([2, M7], [7, D7], [0, MA7], [9, D7]) === 0, "ii-V-I-VI (Dm7 G7 Cmaj7 A7) is C, got " + K([2, M7], [7, D7], [0, MA7], [9, D7]));
  ok(K([0, MJ], [9, MN], [5, MJ], [7, MJ]) === 0, "C Am F G is C");
  ok(K([7, MJ], [0, MJ], [2, D7], [7, MJ]) === 7, "G C D7 G is G");
  const D = (...cs) => PitchSpelling.detectKey(cs.map(([r, iv]) => ({ rootPc: r, intervals: iv })));
  const am = D([9, MN], [2, MN], [4, D7], [9, MN]);
  ok(am.tonicPc === 9 && am.mode === "minor" && am.doPc === 0, "Am Dm E7 Am is A minor (do = C), got " + JSON.stringify(am));
  ok(D([9, MN], [5, MJ], [0, MJ], [7, MJ]).mode === "minor", "opening on Am: A minor");
  ok(D([2, MN], [4, D7], [5, MJ]).mode === "minor", "E7 in a C-family tune is the V7 of A minor");
  const ii = D([2, M7], [7, D7], [0, MA7], [9, D7]); ok(ii.tonicPc === 0 && ii.mode === "major", "ii-V-I-VI is C major, got " + JSON.stringify(ii));
  const pop = D([0, MJ], [9, MN], [5, MJ], [7, MJ]); ok(pop.tonicPc === 0 && pop.mode === "major", "C Am F G is C major, got " + JSON.stringify(pop));
  ok(K([9, MN], [2, MN], [4, D7], [9, MN]) === 0, "keyFromChords still gives the major key for do (C)");
  ok(K([0, D7], [5, D7], [0, D7], [7, D7]) === 0, "C7 F7 C7 G7 blues is C");
  ok(K([0, MJ]) === 0, "too little to go on is C");
}
if (process.env.NEG) ok(false, "NEG: deliberate");
console.log(fail ? "FAULTS KEY/ROMAN FAILED" : "FAULTS KEY/ROMAN OK"); process.exit(fail ? 1 : 0);
