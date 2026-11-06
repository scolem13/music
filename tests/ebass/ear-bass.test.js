// Node test for apps/patterns/ear-bass.js (placeSet, choosePositions, Segmenter, BlockDetector). Run: node tests/ebass/ear-bass.test.js (NEG=1 must fail)
const assert = require("assert"), path = require("path"), ROOT = path.resolve(__dirname, "../..");
global.window = global;
global.EBassChart = require(path.join(ROOT, "apps/shared/ebass/ebass-chart.js"));
global.PitchDetect = require(path.join(ROOT, "apps/shared/pitch-detect.js"));
const E = require(path.join(ROOT, "apps/patterns/ear-bass.js"));
const C = EBassChart, NEG = !!process.env.NEG;
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok  ", name); };
t("placeSet keeps a set inside written E2..C4 when it fits", () => {
  for (const tonic of [0, 3, 7, 9, 11]) {
    const pats = [{ midi: [60, 62, 64, 62, 60] }, { midi: [60, 64, 67, 64, 60] }].map(p => ({ midi: p.midi.map(m => m + tonic) }));
    const sh = E.placeSet(pats, 0); let lo = 1e9, hi = -1e9;
    pats.forEach(p => p.midi.forEach(m => { lo = Math.min(lo, m + sh); hi = Math.max(hi, m + sh); }));
    assert(lo >= (NEG ? 100 : E.LO) && hi <= E.HI, `tonic ${tonic}: ${lo}..${hi}`);
  }
});
t("choosePositions: every note found, in frets 0-5, and the pitch is right", () => {
  const list = [28, 30, 32, 33, 35, 38, 40, 43, 45, 48], pos = E.choosePositions(list, 5);
  pos.forEach((p, i) => { assert(p && p.f >= 0 && p.f <= 5, "pos " + i); assert.strictEqual(C.midi(p.s, p.f), list[i]); });
});
t("choosePositions: stays near the previous note", () => {
  const pos = E.choosePositions([33, 35, 37, 38], 5); // A B C# D: all on the A string 0,2,4,5 (not jumping to E string)
  assert.deepStrictEqual(pos.map(p => p.s), [3, 3, 3, 3]);
});
t("choosePositions falls back above fret 5 when it must", () => { const p = E.choosePositions([50], 5)[0]; assert(p && C.midi(p.s, p.f) === 50 && p.f > 5); });
t("Segmenter: a note after 3 steady frames, a repeat only after a break", () => {
  const got = []; const s = E.Segmenter(m => got.push(m));
  [40, 40, 40, 40, 40].forEach(m => s.frame({ hz: 82, midi: m })); assert.deepStrictEqual(got, [40]);
  [0, 0].forEach(() => s.frame({ hz: 0 })); [40, 40, 40].forEach(m => s.frame({ hz: 82, midi: m })); assert.deepStrictEqual(got, [40, 40]);
});
t("BlockDetector hears low sines: E1 41.2 Hz, A1 55 Hz, D2, G2 (sounding) from 1024-sample blocks", () => {
  for (const m of [28, 33, 38, 43, 45]) {
    const sr = 44100, hz = C.freq(m), heard = []; const bd = E.BlockDetector(sr, f => heard.push(f));
    let ph = 0; for (let b = 0; b < 30; b++) { const d = new Float32Array(1024); for (let i = 0; i < 1024; i++) d[i] = 0.4 * Math.sin(2 * Math.PI * hz * (b * 1024 + i) / sr) + 0.15 * Math.sin(4 * Math.PI * hz * (b * 1024 + i) / sr); bd.push(d); }
    const ok = heard.filter(f => f.midi === (NEG ? m + 1 : m)).length; assert(heard.length >= 5 && ok >= heard.length - 1, `midi ${m}: ${ok}/${heard.length}`);
  }
});
console.log(n + " passed");
