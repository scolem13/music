// Voice-led guitar triads (styles "triadvl" and "uppervl"): tones, one string set, small motion.
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
require(R + "voicings.js"); require(R + "band/harmony.js");
const V = ChordVoicings, H = BandHarmony;
const pcs = m => m.map(x => x % 12).sort((a, b) => a - b).join(",");
const want = (sym, style, expect) => {
  const c = H.parseChord(sym, 0), got = pcs(H.voicing(c, style, null, "guitar"));
  assert.strictEqual(got, expect.slice().sort((a, b) => a - b).join(","), sym + " " + style + " -> " + got);
};
want("C", "triadvl", [0, 4, 7]); want("C7", "triadvl", [0, 4, 7]); want("Dm7", "triadvl", [2, 5, 9]); want("Csus4", "triadvl", [0, 5, 7]);
want("Cmaj7", "uppervl", [4, 7, 11]); want("C7", "uppervl", [4, 7, 10]); want("Dm7", "uppervl", [5, 9, 0]);
want("Bm7b5", "uppervl", [2, 5, 9]); want("C6", "uppervl", [9, 0, 4]); want("Cm6", "uppervl", [9, 0, 3]);
want("G7sus4", "uppervl", [5, 9, 0]); want("C", "uppervl", [0, 4, 7]); want("Bdim7", "uppervl", [2, 5, 8]);

// every candidate the library offers sits on the asked string set, three different strings, within four frets
let n = 0;
const QUAL = ["", "m", "7", "m7", "maj7", "m7b5", "dim7", "6", "m6", "aug", "sus4", "7sus4", "9", "13", "7b9", "7alt"];
for (const style of ["triadvl", "uppervl"]) for (const q of QUAL) for (let r = 0; r < 12; r++){
  const c = H.parseChord(H.pcName(r) + q, 0);
  for (const set of [[0,1,2],[1,2,3],[2,3,4],[3,4,5]]){
    const cands = V.guitar({ root: c.root, intervals: c.tones }, style, { stringSets: [set], allPositions: true, maxFret: 14 });
    assert(cands.length >= 2, style + " " + c.sym + " on " + set + ": " + cands.length);
    cands.forEach(k => { assert.deepStrictEqual(k.strings.map(s => s.string), set); assert(k.span <= 5, "span " + k.span); assert(k.midis[2] - k.midis[0] < 12); n++; });
  }
}
// a long random progression stays on strings 4-3-2 between the nut and fret 12 and moves little
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const style of ["triadvl", "uppervl"]){
  let prev = null, total = 0, worst = 0, steps = 0;
  for (let i = 0; i < 4000; i++){
    const c = H.parseChord(H.pcName(Math.floor(rnd() * 12)) + QUAL[Math.floor(rnd() * 9)], 0);
    const m = H.voicing(c, style, prev, "guitar");
    assert.strictEqual(m.length, 3);
    [50, 55, 59].forEach((open, k) => { const f = m[k] - open; assert(f >= 0 && f <= 12, c.sym + " fret " + f); });
    if (prev){ const d = m.reduce((a, x, k) => a + Math.abs(x - prev[k]), 0); total += d; worst = Math.max(worst, d); steps++; }
    prev = m;
  }
  console.log(style, "random changes: average motion", (total / steps).toFixed(2), "semitones over three voices, worst", worst);
  assert(total / steps < 6.5);
}
assert(H.hasStyle("guitar", "triadvl") && H.hasStyle("guitar", "uppervl") && !H.hasStyle("piano", "triadvl"));
console.log("TRIADVL OK,", n, "shapes checked");
