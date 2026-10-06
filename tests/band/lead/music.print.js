const fs = require("fs"), vm = require("vm");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
for (const f of ["tune-chart.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"));
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const H = BandHarmony, nn = H.noteName;
const head = "X:1\nT:t\nM:4/4\nL:1/4\nK:F\n";
const CH = { basic: '"F7"z4 | "F7"z4 | "F7"z4 | "F7"z4 | "Bb7"z4 | "Bb7"z4 | "F7"z4 | "F7"z4 | "C7"z4 | "Bb7"z4 | "F7"z4 | "C7"z4 |]',
  jazz: '"F7"z4 | "Bb7"z4 | "F7"z4 | "Cm7"z2 "F7"z2 | "Bb7"z4 | "Bdim7"z4 | "F7"z4 | "Am7"z2 "D7"z2 | "Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]' };
const [which, feel, voicing, seed, transpose, choruses] = [process.argv[2] || "jazz", process.argv[3] || "walk", process.argv[4] || "rootless", +(process.argv[5] || 11), +(process.argv[6] || 0), +(process.argv[7] || 1)];
const form = H.buildForm(TuneChart.parse(head + CH[which]), transpose);
const bass = BandBass.create({ rng: mulberry32(seed + 101) }), comp = BandComp.create({ rng: mulberry32(seed + 211) }), drums = BandDrums.create({ rng: mulberry32(seed + 307) });
const opts = { bassFeel: feel, voicing };
for (let c = 0; c < choruses; c++) form.forEach((fb, i) => {
  const ctx = { bar: c * form.length + i, index: i, length: form.length, chorus: c, beats: fb.beats, chords: fb.chords, nextChords: form[(i + 1) % form.length].chords, tempo: 120, last: false, opts };
  const b = bass.bar(ctx), k = comp.bar(ctx), d = drums.bar(ctx);
  const chords = fb.chords.map(x => x.chord.label || x.chord.sym).join(" ");
  console.log(String(i + 1).padStart(2), chords.padEnd(9),
    "| bass", b.map(e => `${e.pos}:${nn(e.midi)}`).join(" ").padEnd(34),
    "| comp", k.map(e => `${e.pos}${e.dur >= 1 ? "L" : "s"}[${e.midis.map(nn).join(" ")}]`).join("  ").padEnd(58),
    "| dr", d.filter(e => !/ride|hatFoot/.test(e.piece) && !(e.piece === "kick" && e.vel < 0.3)).map(e => `${Math.round(e.pos * 100) / 100}:${e.piece}`).join(" "));
});
