// Guitar shapes follow each other by the smallest move of the fretting hand; two-note chords (guide2).
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
require(R + "voicings.js"); require(R + "band/harmony.js");
const V = ChordVoicings, H = BandHarmony;
const g = (...f) => f.map((fret, string) => fret == null ? null : { string, fret }).filter(Boolean);
assert.strictEqual(V.handMotion(g(null, null, 1, 2, 1, 1), g(null, null, 1, 2, 1, 1)), 0);
assert.strictEqual(V.handMotion(g(null, null, 1, 2), g(null, null, 3, 4)), 2 + 0.5 * 4);              // slide two frets
assert.strictEqual(V.handMotion(g(null, null, 1, 2), g(null, null, null, 2, 1)), 0 + 0.75 + 0.75);     // one finger stays, one string swapped
// two-note chords: the right tones, only on string pairs 4-5, 3-4, 2-3
const pcs = (sym) => { const c = H.parseChord(sym, 0); return V.guitar({ root: c.root, intervals: c.tones }, "guide2", { allPositions: true }); };
const tones = { "G7": [11, 5], "Dm7": [5, 0], "Cmaj7": [4, 11], "C6": [4, 9], "C": [0, 4], "Am": [9, 0], "G7sus4": [0, 5], "C5": [0, 7], "Bm7b5": [2, 9], "Bdim7": [2, 8] };
for (const sym in tones){ const cs = pcs(sym); assert(cs.length >= 6, sym + " shapes " + cs.length);
  cs.forEach(c => { assert.deepStrictEqual(c.midis.map(m => m % 12).sort((a, b) => a - b), tones[sym].slice().sort((a, b) => a - b), sym);
    assert(["1,2", "2,3", "3,4"].includes(c.stringSet.join()), sym + " on strings " + c.stringSet); assert(c.span <= 5 && c.midis[1] - c.midis[0] < 12); });
  assert(new Set(cs.map(c => c.stringSet.join())).size === 3, sym + " on all three pairs"); }
// through random changes the hand moves far less than when shapes are chosen by pitch alone
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const Q = ["7", "m7", "maj7", "m7b5", "6", "", "m", "9", "dim7"], prog = []; for (let i = 0; i < 1500; i++) prog.push(H.pcName(Math.floor(rnd() * 12)) + Q[Math.floor(rnd() * Q.length)]);
const SETS = { shell3: [[0,2,3],[1,2,3],[2,3,4]], drop2: [[1,2,3,4],[2,3,4,5]], drop3: [[0,2,3,4],[1,3,4,5]], guide2: [[1,2],[2,3],[3,4]], triad3: [[1,2,3],[2,3,4],[3,4,5]] };
for (const style of Object.keys(SETS)){
  let prev = null, hand = 0, ear = 0, pg = null, eg = null, pe = null, n = 0, maxShift = 0;
  prog.forEach(sym => { const c = H.parseChord(sym, 0), m = H.voicing(c, style, prev, "guitar");
    const cands = V.guitar({ root: c.root, intervals: c.tones }, style, { maxSpan: 4, stringSets: SETS[style] }).filter(x => x.midis[0] >= 40 && x.midis[x.midis.length - 1] <= 76);
    const mine = cands.filter(x => x.midis.join() === m.join()), byEar = V.nearest(cands, pe, 55);
    assert(mine.length, style + " " + sym + " is a library shape");
    const grip = pg ? mine.slice().sort((a, b) => V.handMotion(pg, a.strings) - V.handMotion(pg, b.strings))[0].strings : mine[0].strings;
    if (pg){ hand += V.handMotion(pg, grip); ear += V.handMotion(eg, byEar.strings); n++; }
    prev = m; pg = grip; pe = byEar.midis; eg = byEar.strings; });
  console.log(style.padEnd(7), "hand travel per change: by hand", (hand / n).toFixed(2), "| by pitch (before)", (ear / n).toFixed(2));
  assert(hand < ear * 0.9, style + " should move the hand less");
}
// the as-played hand-off carries the grip
const bars = [{ index: 0, chords: [{ pos: 0, chord: H.parseChord("F7", 0) }], parts: { comp: [] } }];
const ap = H.asPlayed(bars, { style: "shell3", inst: "guitar" })[0];
assert(ap.strings && ap.strings.length === ap.midis.length && ap.strings.every(s => [40,45,50,55,59,64][s.string] + s.fret === s.midi), "grip handed over");
console.log("HAND OK");
