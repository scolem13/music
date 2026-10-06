// On a static chord the bass may start a bar off the root, but never two bars running.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
for (const f of ["tune-chart.js", "band/harmony.js", "band/bass.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"));
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const abc = 'X:1\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "F7"z4 | "F7"z4 | "F7"z4 | "Bb7"z4 | "Bb7"z4 | "F7"z4 | "F7"z4 | "C7"z4 | "Bb7"z4 | "F7"z4 | "C7"z4 |]';
let bars = 0, off = 0, runs = 0;
for (let tr = 0; tr < 12; tr++) for (let seed = 1; seed <= 40; seed++){
  const form = BandHarmony.buildForm(TuneChart.parse(abc), tr), bass = BandBass.create({ rng: mulberry32(seed * 31 + tr) });
  let prevOff = false;
  for (let c = 0; c < 20; c++) form.forEach((fb, i) => {
    const ev = bass.bar({ bar: c*12+i, index: i, length: 12, chorus: c, beats: 4, chords: fb.chords, nextChords: form[(i+1)%12].chords, tempo: 120, last: false, opts: {} });
    const isOff = ((ev[0].midi % 12) + 12) % 12 !== fb.chords[0].chord.bass;
    bars++; if (isOff) off++; if (isOff && prevOff) runs++;
    assert.strictEqual(ev.length, 4); prevOff = isOff;
  });
}
console.log(`bars ${bars}, off-root downbeats ${(100*off/bars).toFixed(1)}%, consecutive off-root bars ${runs}`);
assert.strictEqual(runs, 0);
