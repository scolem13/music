// GuitarIn on synthetic plucked strings (the model from scripts/guitar-di/proto.js). Synthetic sound only: a real guitar is not checked here.
//   node tests/guitar-in/guitar-in.test.js
const G = require("../../apps/shared/guitar-in.js");
const SR = 48000, OPEN = G.OPEN;
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function synth(frets, detune = 0) {
  const N = Math.floor(SR * 0.6), out = new Float32Array(N);
  frets.forEach((f, s) => {
    if (f == null) return; const m = OPEN[s] + f, f0 = 440 * Math.pow(2, (m - 69 + detune / 100) / 12);
    const t0 = Math.floor(SR * s * 0.015), amp = 0.6 + 0.8 * rnd(), tau = 1.2 * Math.pow(f0 / 110, -0.35), bridge = 0.35 + 0.3 * rnd();
    for (let h = 1; h <= 24; h++) {
      const fh = f0 * h * Math.sqrt(1 + 1.5e-4 * h * h); if (fh > SR / 2.2) break;
      const a = amp * Math.abs(Math.sin(Math.PI * h * bridge)) / Math.pow(h, 1.1), th = tau / (1 + 0.15 * h), ph = rnd() * 6.283, w = 2 * Math.PI * fh / SR;
      for (let n = t0; n < N; n++) out[n] += 0.1 * a * Math.exp(-(n - t0) / SR / th) * Math.sin(w * (n - t0) + ph);
    }
  });
  return out.subarray(Math.floor(SR * 0.08));
}
const shapes = { C: [null,3,2,0,1,0], G: [3,2,0,0,0,3], D: [null,null,0,2,3,2], Am: [null,0,2,2,1,0], Em: [0,2,2,0,0,0], E: [0,2,2,1,0,0],
  A: [null,0,2,2,2,0], Dm: [null,null,0,2,3,1], F: [1,3,3,2,1,1], Bm: [null,2,4,4,3,2], G7: [3,2,0,0,0,1], A7: [null,0,2,0,2,0] };
const notesOf = fr => fr.map((f, s) => f == null ? null : OPEN[s] + f).filter(x => x != null);
let fail = 0; const ok = (c, msg) => { if (!c) { fail++; console.log("FAIL", msg); } };
// single notes: every string, frets 0..12, graded on the exact note
let right = 0, tot = 0;
for (let s = 0; s < 6; s++) for (let f = 0; f <= 12; f++) { const fr = [null,null,null,null,null,null]; fr[s] = f; const r = G.analyse(synth(fr), SR, { expect: [OPEN[s] + f] }); tot++; if (r.check.ok) right++; else console.log("  note miss", s, f, "heard", r.check.heard); }
console.log("single notes", right + "/" + tot); ok(right / tot >= 0.95, "single notes under 95%");
// a wrong note is not accepted
ok(!G.analyse(synth([null,null,null,null,null,5]), SR, { expect: [OPEN[5] + 7] }).check.ok, "wrong note accepted");
// chords: the right chord passes, a different chord fails
let cr = 0, ct = 0, wrongOk = 0, names = Object.keys(shapes);
for (let t = 0; t < 3; t++) names.forEach((n, i) => {
  const r = G.analyse(synth(shapes[n]), SR, { expect: notesOf(shapes[n]) }); ct++; if (r.check.ok) cr++; else console.log("  chord miss", n, "pcs", r.pcs, "extra", r.check.extra);
  const other = shapes[names[(i + 3) % names.length]];
  if (G.analyse(synth(shapes[n]), SR, { expect: notesOf(other) }).check.ok) wrongOk++;
});
console.log("chords", cr + "/" + ct, "wrong chord accepted", wrongOk + "/" + ct);
ok(cr / ct >= 0.75, "chords under 75%"); ok(wrongOk === 0, "a wrong chord was accepted");
console.log(fail ? fail + " failed" : "ok"); process.exit(fail ? 1 : 0);
