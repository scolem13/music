// The pitch-detection module (apps/shared/pitch-detect.js) and the bend shapes (diagrams.js) without a browser:
//   node tests/lessons/tuner.test.js
// 1. YIN gives exactly what the Tune Assessment's own copy gave (a frozen copy of that code is below).
// 2. The strobe bank: a partial at k * fref stands still, a sharp one turns the stripes right at the right speed, a flat one
//    left, the attack is ignored, a stiff string's upper partials read sharp by 600 * log2(1 + B k^2) cents.
// 3. refFreq: 12-ET, just intonation over a tonic, 31-ET, explicit cents.
// 4. The target shapes of a bend.
const path = require("path"), ROOT = path.resolve(__dirname, "../..");
const PD = require(ROOT + "/apps/shared/pitch-detect.js");
require(ROOT + "/apps/shared/lessons/diagrams.js");
const LD = globalThis.LessonDiagrams;
let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };

// ---- 1. the original, as it was in apps/tune-assessment/app.js before the move ----
const RMS_GATE = 0.012, YIN_THRESHOLD = 0.15, FMIN = 70, FMAX = 1500;
function oldDetectPitch(buf, sr) {
  const SIZE = buf.length, W = Math.floor(SIZE / 2); let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / SIZE); if (rms < RMS_GATE) return -1;
  const d = new Float32Array(W);
  for (let tau = 1; tau < W; tau++) { let s = 0; for (let j = 0; j < W; j++) { const df = buf[j] - buf[j + tau]; s += df * df; } d[tau] = s; }
  const c = new Float32Array(W); c[0] = 1; let run = 0;
  for (let tau = 1; tau < W; tau++) { run += d[tau]; c[tau] = run > 0 ? d[tau] * tau / run : 1; }
  let tau = -1; for (let t = 2; t < W; t++) { if (c[t] < YIN_THRESHOLD) { while (t + 1 < W && c[t + 1] < c[t]) t++; tau = t; break; } }
  if (tau === -1) return -1;
  let bt = tau; if (tau > 0 && tau < W - 1) { const s0 = c[tau - 1], s1 = c[tau], s2 = c[tau + 1], dn = 2 * (2 * s1 - s2 - s0); if (dn) bt = tau + (s2 - s0) / dn; }
  const f0 = sr / bt; return (f0 < FMIN || f0 > FMAX) ? -1 : f0;
}
const SR = 44100;
function synth(n, partials, n0 = 0, sr = SR) { // partials [[freq, amp], ...]
  const x = new Float32Array(n); for (let i = 0; i < n; i++) { let v = 0; for (const [f, a] of partials) v += a * Math.sin(2 * Math.PI * f * (n0 + i) / sr); x[i] = v; } return x;
}
let same = 0, total = 0, seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const f of [65, 82.4, 110, 196, 261.6, 330, 440, 880, 1200, 1400, 1700]) for (const amp of [0.004, 0.02, 0.3]) for (const noise of [0, 0.02]) {
  const x = synth(2048, [[f, amp], [2 * f, amp / 2], [3 * f, amp / 3]]); for (let i = 0; i < x.length; i++) x[i] += (rnd() - 0.5) * noise;
  total++; if (oldDetectPitch(x, SR) === PD.detect(x, SR)) same++;
}
check("YIN: identical to the Tune Assessment's own on " + total + " signals (pitches, silence, noise, out of range)", same === total, same + "/" + total);
check("YIN: constants", PD.RMS_GATE === 0.012 && PD.YIN_THRESHOLD === 0.15 && PD.FMIN === 70 && PD.FMAX === 1500);
{ const f = PD.detect(synth(2048, [[440, 0.3], [880, 0.15]]), SR); check("YIN: 440 Hz", Math.abs(f - 440) < 0.5, f.toFixed(2)); }
check("analyse: 466.16 Hz is B♭4 +0", (a => a.name === "B♭4" && Math.abs(a.cents) < 0.1)(PD.analyse(466.1638)));
check("analyse: 435 Hz is A4 about -19.8 cents", (a => a.name === "A4" && Math.abs(a.cents + 19.77) < 0.1)(PD.analyse(435)));

// ---- 2. the strobe ----
function run(fref, partials, secs, opts, lead = 0) { // partials [[k, ratio-to-k*fref, amp]]; lead = seconds of silence first
  const bank = PD.strobe(SR, fref, opts || { bands: 6 }), N = 1024, total = Math.round((secs + lead) * SR), reads = [];
  for (let n0 = 0; n0 < total; n0 += N) {
    const x = new Float32Array(N); if (n0 / SR >= lead) for (let i = 0; i < N; i++) { let v = 0; for (const [f, a] of partials) v += a * Math.sin(2 * Math.PI * f * (n0 + i - lead * SR) / SR); x[i] = v; }
    bank.process(x); reads.push({ t: (n0 + N) / SR, bands: bank.read().map(b => ({ ...b })) });
  }
  return { bank, reads };
}
const F = 220, cent = c => Math.pow(2, c / 1200);
{ // in tune, perfectly harmonic: every band still
  const { reads } = run(F, [1, 2, 3, 4, 5, 6].map(k => [k * F, 0.2 / k]), 1.5);
  const end = reads[reads.length - 1].bands, ph = reads.slice(-8).map(r => r.bands[0].phase);
  check("strobe: harmonic string in tune, every band within 0.3 cent", end.every(b => b.alive && Math.abs(b.cents) < 0.3), end.map(b => b.cents.toFixed(2)).join(" "));
  check("strobe: ...and the stripes stand still (phase wander < 0.02 rad)", Math.max(...ph) - Math.min(...ph) < 0.02, (Math.max(...ph) - Math.min(...ph)).toFixed(4));
  check("strobe: magnitudes are the partial amplitudes (0.2/k)", end.every(b => Math.abs(b.mag - 0.2 / b.k) < 0.2 / b.k * 0.05), end.map(b => b.mag.toFixed(3)).join(" "));
}
for (const dc of [+7, -7, +15, -15]) { // sharp and flat: the right sign and speed, the phase turning the right way
  const { reads } = run(F, [1, 2, 3, 4, 5, 6].map(k => [k * F * cent(dc), 0.2 / k]), 1.5);
  const end = reads[reads.length - 1].bands, want = dc, ok = end.every(b => Math.abs(b.cents - want) < 0.6);
  check(`strobe: ${dc > 0 ? "+" : ""}${dc} cents reads ${dc} on every band`, ok, end.map(b => b.cents.toFixed(2)).join(" "));
  const hz = F * (cent(dc) - 1); check(`strobe: band 1 drifts ${hz.toFixed(3)} Hz`, Math.abs(end[0].driftHz - hz) < 0.05, end[0].driftHz.toFixed(3));
  // the unwrapped phase over the last 0.4 s should advance by 2 pi * hz * 0.4 (counter-clockwise = to the right when sharp)
  const r = reads.slice(-16); let turn = 0; for (let i = 1; i < r.length; i++) { let d = r[i].bands[0].phase - r[i - 1].bands[0].phase; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); turn += d; }
  check(`strobe: phase turns ${hz > 0 ? "forward (stripes move right)" : "backward (stripes move left)"}`, Math.sign(turn) === Math.sign(hz) && Math.abs(turn / (2 * Math.PI * (r[r.length - 1].t - r[0].t)) - hz) < 0.1, "turn " + turn.toFixed(2) + " rad");
}
{ // a stiff string: partial k at k f sqrt(1 + B k^2)
  const B = 0.0004, { reads } = run(F, [1, 2, 3, 4, 5, 6].map(k => [k * F * Math.sqrt(1 + B * k * k), 0.2 / k]), 2);
  const end = reads[reads.length - 1].bands, bad = end.filter(b => Math.abs(b.cents - 600 * Math.log2(1 + B * b.k * b.k)) > 0.8);
  check("strobe: stiff string, band k sharp by 600 log2(1 + B k^2) cents", !bad.length, end.map(b => b.cents.toFixed(2)).join(" "));
  check("strobe: ...so the upper bands drift right and the first hardly moves", end[5].cents > 10 && Math.abs(end[0].cents) < 0.5);
}
{ // a very stiff string: the upper bands are tens of Hz off and still read (the phase is followed every 128 samples)
  const B = 0.0008, { reads } = run(F, [1, 2, 3, 4, 5, 6, 7, 8].map(k => [k * F * Math.sqrt(1 + B * k * k), 0.2 / k]), 2.5, { bands: 8 });
  const end = reads[reads.length - 1].bands, bad = end.filter(b => Math.abs(b.cents - 600 * Math.log2(1 + B * b.k * b.k)) > 2);
  check("strobe: B=0.0008, all eight bands read 600 log2(1 + B k^2) within 2 cents (band 8 is 44 Hz off)", !bad.length, end.map(b => b.cents.toFixed(1) + (b.alive ? "" : "x")).join(" "));
}
{ // the attack is ignored: nothing shown for the first 100 ms after the note starts, and the silence before it shows nothing
  const { reads } = run(F, [1, 2, 3].map(k => [k * F, 0.2 / k]), 1.0, { bands: 3 }, 0.3);
  const before = reads.filter(r => r.t < 0.3), during = reads.filter(r => r.t > 0.3 && r.t < 0.3 + 0.09), after = reads.filter(r => r.t > 0.3 + 0.2 + 0.4);
  check("strobe: silent before the note", before.every(r => r.bands.every(b => !b.alive)));
  check("strobe: nothing shown during the first 100 ms of the attack", during.length > 0 && during.every(r => r.bands.every(b => !b.alive && b.mag === 0)), during.length + " blocks");
  check("strobe: then it comes up", after.length > 0 && after.every(r => r.bands.every(b => b.alive)));
  const e = run(F, [[F, 0.2]], 0.6, { bands: 1, attackMs: 0 }, 0.05);
  check("strobe: attackMs:0 turns the ignoring off", e.reads.some(r => r.t < 0.12 && r.bands[0].mag > 0));
}
{ // a weak partial is faint (so the page can dim it) and a missing one is not alive
  const { reads } = run(F, [[F, 0.2], [2 * F, 0.0005]], 1.5, { bands: 3 }), end = reads[reads.length - 1].bands;
  check("strobe: a weak partial has a tiny magnitude and an absent one is not alive", end[1].mag > 0.0004 && end[1].mag < 0.0006 && end[0].mag > 0.19 && !end[2].alive, end.map(b => b.mag.toExponential(1)).join(" "));
}
{ const { bank } = run(F, [[F, 0.2]], 0.8, { bands: 2 }); bank.setRef(F * 1.01); check("strobe: setRef starts over", bank.read().every(b => !b.alive)); }

// ---- 3. what a tuner aims at ----
const near = (a, b, e = 0.01) => Math.abs(a - b) < e;
check("refFreq 12-ET: A4 440, C4 261.63, A4 at 432", near(PD.refFreq({ note: "A", oct: 4 }), 440) && near(PD.refFreq({ note: "C", oct: 4 }), 261.6256) && near(PD.refFreq({ note: "A", oct: 4, a4: 432 }), 432));
check("refFreq 12-ET: enharmonics agree (C# = Db)", near(PD.refFreq({ note: "C#", oct: 4 }), PD.refFreq({ note: "Db", oct: 4 })));
check("refFreq JI: E over A is 3:2 over A3 = 330 Hz", near(PD.refFreq({ note: "E", oct: 4, system: "ji", tonic: "A" }), 330));
check("refFreq JI: E over C is 5:4 over C4 = 327.03 Hz (13.7 cents under the piano's E)", near(PD.refFreq({ note: "E", oct: 4, system: "ji", tonic: "C" }), 261.6256 * 1.25, 0.01) && near(1200 * Math.log2(327.032 / 329.628), -13.69, 0.05));
check("refFreq JI: the tonic is itself, and the octave follows the note", near(PD.refFreq({ note: "C", oct: 5, system: "ji", tonic: "C" }), 523.2511) && near(PD.refFreq({ note: "G", oct: 3, system: "ji", tonic: "C" }), 130.8128 * 1.5, 0.01));
check("refFreq JI: a note below the tonic takes the tonic below it (A3 over C4 is 5:3 over C3)", near(PD.refFreq({ note: "A", oct: 3, system: "ji", tonic: "C" }), 130.8128 * 5 / 3, 0.01));
check("refFreq 31-ET: A4 is 440 and a step is 38.7 cents", near(PD.refFreq({ note: "A", oct: 4, system: "31et" }), 440) && near(1200 * Math.log2(PD.refFreq({ note: "Db", oct: 4, system: "31et" }) / PD.refFreq({ note: "C#", oct: 4, system: "31et" })), 38.71, 0.01));
check("refFreq 31-ET: the fifth is 18 steps (696.8 cents) and E5 is 440 * 2^(18/31)", near(PD.refFreq({ note: "E", oct: 5, system: "31et" }), 440 * Math.pow(2, 18 / 31), 0.01));
check("refFreq cents: 350 above A3 is the neutral third", near(PD.refFreq({ note: "A", oct: 3, system: "cents", cents: 350 }), 220 * Math.pow(2, 350 / 1200)));
check("noteMidi", PD.noteMidi("A", 4) === 69 && PD.noteMidi("C#", 4) === 61 && PD.noteMidi("Bb", 3) === 58);

// ---- 4. bend shapes ----
{ const A = 200, b = LD.bendShape("bend", A), r = LD.bendShape("bendrelease", A), p = LD.bendShape("prebend", A), v = LD.bendShape("vibrato", A);
  check("shape bend: 0, then the target, held", b.f(0) === 0 && Math.abs(b.f(1.3) - A) < 1e-9 && Math.abs(b.f(3.5) - A) < 1e-9 && b.f(0.8) > 0 && b.f(0.8) < A);
  check("shape bend and release: back to 0", Math.abs(r.f(1.5) - A) < 1e-9 && Math.abs(r.f(3.0)) < 1e-9);
  check("shape pre-bend: already at the target when struck, then released; silent until onset", p.f(0) === A && p.onset > 0 && Math.abs(p.f(3.0)) < 1e-9);
  let hi = -1e9, lo = 1e9; for (let t = 1.7; t < 3.6; t += 0.005) { hi = Math.min(hi, 0); const y = v.f(t); if (y > A + 1e-9) hi = 1; lo = Math.min(lo, y); }
  check("shape vibrato: never above the target, never more than 30 cents under it", hi <= 0 && lo >= A - 30 - 1e-9 && lo < A - 25, "min " + lo.toFixed(1));
}
// ---- 5. the practice instruments of the tuner's made-up source (synth-kit.js SynthKit.INSTRUMENTS / partials; sources in its comments) ----
{
  const vm = require("vm"), fs = require("fs");
  const sandbox = { addEventListener() {}, window: null, document: { readyState: "loading", addEventListener() {} }, localStorage: { getItem() { return null; } }, console };
  sandbox.window = sandbox; vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(ROOT + "/apps/shared/lessons/synth-kit.js", "utf8"), sandbox);
  const SK = sandbox.SynthKit, ids = Object.keys(SK.INSTRUMENTS);
  check("practice: all eleven instruments, the stiff string first", ids.length === 11 && ids[0] === "string" && ["oldstring", "marimba", "rawbar", "xylophone", "chime", "bell", "timpani", "clarinet", "voice", "brass"].every(i => ids.includes(i)), ids.join(" "));
  { // the default is what the made-up string always was: 14 partials, k f sqrt(1+Bk^2), level 1/k^1.1, the fundamental scaled by fund
    const B = 0.0006, P = SK.partials("string", { stiff: B, fund: 0.5 });
    check("practice: the default is the old made-up string", P.length === 14 && P.every(([r, a], i) => Math.abs(r - (i + 1) * Math.sqrt(1 + B * (i + 1) ** 2)) < 1e-12 && Math.abs(a - Math.pow(i + 1, -1.1) * (i ? 1 : 0.5)) < 1e-12));
  }
  const FR = 220, want = {
    marimba: { 1: 0, 4: 0, 10: 0 }, xylophone: { 1: 0, 3: 0 }, clarinet: { 1: 0, 3: 0, 5: 0, 7: 0, 9: 0 }, brass: { 2: 0, 3: 0, 7: 0, 12: 0 },
    timpani: { 2: 0, 3: 0, 4: 0, 5: 0 }, chime: { 2: 0, 3: 1200 * Math.log2(2 * 121 / 81 / 3), 4: 1200 * Math.log2(2 * 169 / 81 / 4) },
    bell: { 1: 0, 2: 0, 3: 1200 * Math.log2(2 * 1.506 / 3), 4: 0, 6: 1200 * Math.log2(2 * 3.011 / 6) },
    string: { 1: 0, 4: 600 * Math.log2(1 + 0.0004 * 16) - 600 * Math.log2(1 + 0.0004) , 8: 600 * Math.log2(1 + 0.0004 * 64) - 600 * Math.log2(1 + 0.0004) },
    voice: { 1: 0, 3: 0, 5: 0 }, rawbar: { 1: 0, 9: 1200 * Math.log2(8.933 / 9) }
  };
  for (const id of Object.keys(want)) {
    const P = SK.partials(id, { stiff: 0.0004, fund: 1, fref: FR }), N = 12;
    const { reads } = run(FR, P.map(([r, a]) => [r * FR, 0.2 * a / (P.reduce((m, q) => Math.max(m, q[1]), 0))]), 2.5, { bands: N });
    const end = reads[reads.length - 1].bands, bad = [];
    for (const k of Object.keys(want[id]).map(Number)) {
      // the string's band 1 is its own fundamental; a stiff string's fundamental is sqrt(1+B) times f, the test's reference, so 600 log2(1+B) cents sharp
      const e = want[id][k] + (id === "string" ? 600 * Math.log2(1 + 0.0004) : 0), b = end[k - 1];
      if (!b.alive || Math.abs(b.cents - e) > 1.5) bad.push(`band ${k}: read ${b.alive ? b.cents.toFixed(2) : "dead"}, want ${e.toFixed(2)}`);
    }
    check(`practice ${id}: the strobe bands read the expected cents (${Object.keys(want[id]).join(",")})`, !bad.length, bad.join("; "));
  }
  { const P = SK.partials("timpani", {}), P1 = SK.partials("chime", {}), c = SK.partials("clarinet", {});
    check("practice: timpani and chime leave band 1 empty (virtual pitch); clarinet has odd harmonics only", !P.some(q => q[0] < 1.5) && !P1.some(q => q[0] < 1.5) && c.every(q => q[0] % 2 === 1)); }
  { const R = SK.partials("rawbar", {}).map(q => q[0]), x = [4.7300, 7.8532, 10.9956, 14.1372].map(v => (v / 4.73) ** 2);
    check("practice rawbar: 1 : 2.756 : 5.404 : 8.933 from the free-bar roots", R.every((r, i) => Math.abs(r - x[i]) < 0.002), x.map(v => v.toFixed(4)).join(" ")); }
  { const o = SK.partials("oldstring", { stiff: 0.0004 }); check("practice oldstring: every partial split in two, a few cents apart", o.length === 16 && o.every((q, i) => i % 2 || (c => c > 2 && c < 14)(1200 * Math.log2(o[i + 1][0] / q[0]))));
  }
}

console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
