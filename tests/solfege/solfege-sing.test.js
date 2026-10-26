// node tests/solfege/solfege-sing.test.js [--wav out.wav]   SolfegeSing: syllables, keys, timing, and the rendered voice (pitch and vowels measured)
const path = require("path"), fs = require("fs");
global.AbcCore = require("../../apps/shared/abc-core.js");
global.AbcEvents = require("../../apps/shared/abc-events.js");
const S = require("../../apps/shared/solfege-sing.js");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ": " + JSON.stringify(a) + " vs " + JSON.stringify(b));

// keys: movable do, la-based minor (the site's labels), do-based option, modes, fixed do
eq(S.doPc("C"), 0, "C"); eq(S.doPc("Eb"), 3, "Eb"); eq(S.doPc("Am"), 0, "Am la-based"); eq(S.doPc("Am", { minor: "do" }), 9, "Am do-based");
eq(S.doPc("D dor"), 0, "D dorian"); eq(S.doPc("Gmix"), 0, "G mixolydian"); eq(S.doPc("F#m"), 9, "F#m"); eq(S.doPc("Bb", { fixed: true }), 0, "fixed");
// chromatic: up raised, down lowered
eq(S.syllable(61, 0, { prev: 60, next: 62 }), "Di", "C# rising"); eq(S.syllable(61, 0, { prev: 62, next: 60 }), "Ra", "Db falling");
eq(S.syllable(66, 0, { prev: 65, next: 67 }), "Fi", "F# up"); eq(S.syllable(70, 0, { prev: 72, next: 69 }), "Te", "Bb down");

const abc = "X:1\nM:4/4\nL:1/4\nQ:1/4=100\nK:G\nGABc|dedB|G2z2|]\n";
let p = S.plan(abc, { voice: "low" });
eq(p.notes.map(n => n.syl), ["Do","Re","Mi","Fa","So","La","So","Mi","Do"], "G major scale names");
ok(Math.abs(p.notes[1].t - p.notes[0].t - 0.6) < 1e-9, "quarter at 100 = 0.6 s");
ok(p.notes.every(n => n.sung >= 40 && n.sung <= 67), "low voice range " + p.notes.map(n => n.sung));
eq(S.plan("X:1\nL:1/4\nK:Am\nABcd|e4|]", {}).notes.map(n => n.syl), ["La","Ti","Do","Re","Mi"], "A minor la-based");
eq(S.plan("X:1\nL:1/4\nK:Am\nABcd|e4|]", { minor: "do" }).notes.map(n => n.syl), ["Do","Re","Me","Fa","So"], "A minor do-based");
eq(S.plan("X:1\nL:1/4\nK:C\nC^CD2|]", {}).notes.map(n => n.syl), ["Do","Di","Re"], "chromatic in ABC");
eq(S.plan("X:1\nL:1/4\nK:C\nCD [K:G] GA|]", {}).notes.map(n => n.syl), ["Do","Re","Do","Re"], "inline key change");

// transpose moves the sound, not the names; auto voice keeps the written pitch
{ const a = S.plan("X:1\nL:1/4\nK:C\nCDEF|]", { voice: "low" }), b = S.plan("X:1\nL:1/4\nK:C\nCDEF|]", { voice: "low", transpose: 2 });
  eq(b.notes.map(n => n.syl), ["Do","Re","Mi","Fa"], "transpose keeps names"); ok(b.notes[0].sung - a.notes[0].sung === 2 || b.notes[0].sung - a.notes[0].sung === -10, "transpose by 2: " + a.notes[0].sung + " " + b.notes[0].sung);
  const c = S.plan("X:1\nL:1/4\nK:C\ncdef|]", { voice: "auto" }); eq([c.voice.name, c.notes[0].sung], ["high", 72], "auto voice high at pitch");
  const d = S.plan("X:1\nL:1/4\nK:C\nC,D,E,F,|]", { voice: "auto", transpose: -1 }); eq([d.voice.name, d.notes[0].sung], ["low", 47], "auto voice low"); }
// render and measure: pitch (autocorrelation) in the middle of each vowel, and F2 high (i, e) vs low (o, a)
const sr = 22050;
function pitchAt(x, t0, t1) {
  const a = Math.round(t0 * sr), b = Math.round(t1 * sr); let best = 0, bl = 0;
  for (let L = Math.round(sr / 500); L < Math.round(sr / 60); L++) { let s = 0, e = 0; for (let i = a; i < b - L; i++) { s += x[i] * x[i + L]; e += x[i] * x[i]; } const r = s / (e || 1); if (r > best) { best = r; bl = L; } }
  return sr / bl;
}
function bandRatio(x, t0, t1, lo, hi, lo2, hi2) {   // energy lo..hi over lo2..hi2 by DFT bins
  const a = Math.round(t0 * sr), N = 2048; let e1 = 0, e2 = 0;
  for (let f = 100; f < 3000; f += 25) { let re = 0, im = 0; for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); re += x[a + i] * w * Math.cos(2 * Math.PI * f * i / sr); im += x[a + i] * w * Math.sin(2 * Math.PI * f * i / sr); } const m = re * re + im * im; if (f >= lo && f < hi) e1 += m; if (f >= lo2 && f < hi2) e2 += m; }
  return e1 / (e2 || 1e-12);
}
for (const voice of ["low", "high"]) {
  p = S.plan("X:1\nM:4/4\nL:1/2\nQ:1/4=60\nK:C\nCE|GB|]", { voice });
  const x = S.render(p, sr); let pk = 0; x.forEach(v => pk = Math.max(pk, Math.abs(v)));
  ok(pk > 0.01 && pk < 4 && x.every(Number.isFinite), voice + " renders, peak " + pk.toFixed(3));
  p.notes.forEach(n => { const f = pitchAt(x, n.t + 0.4, n.t + 0.6); const cents = 1200 * Math.log2(f / n.hz); ok(Math.abs(cents) < 40, `${voice} ${n.syl} pitch ${f.toFixed(1)} vs ${n.hz.toFixed(1)} (${cents.toFixed(0)} c)`); });
  const rI = bandRatio(x, p.notes[1].t + 0.4, 0, 1900, 2600, 500, 1100), rO = bandRatio(x, p.notes[0].t + 0.4, 0, 1900, 2600, 500, 1100);
  ok(rI > rO * 3, `${voice} Mi (i) brighter than Do (o): ${rI.toFixed(3)} vs ${rO.toFixed(3)}`);
  // loudness of the vowels within 4 dB of each other
  const rms = p.notes.map(n => { let s = 0, c = 0; for (let i = Math.round((n.t + 0.3) * sr); i < Math.round((n.t + 0.8) * sr); i++) { s += x[i] * x[i]; c++; } return Math.sqrt(s / c); });
  const db = rms.map(r => 20 * Math.log10(r / rms[0]));
  ok(db.every(d => Math.abs(d) < 4), voice + " vowel levels dB " + db.map(d => d.toFixed(1)));
  // the consonant of So (s) is voiceless noise before the beat: high-band energy there
  const so = p.notes[2], a = Math.round((so.t - 0.06) * sr); let hf = 0; for (let i = a; i < a + 400; i++) hf += Math.abs(x[i] - x[i - 1]);
  ok(hf / 400 > 0.002, voice + " So has its s, " + (hf / 400).toFixed(4));
}
const wi = process.argv.indexOf("--wav");
if (wi > 0) {
  const tune = "X:1\nM:4/4\nL:1/4\nQ:1/4=96\nK:D\nDEFG|ABcd|dcBA|GFE2|D^CDE|F2z2|]\n";
  const x = S.render(S.plan(tune, { voice: process.argv[wi + 2] || "low" }), 44100); let pk = 0; x.forEach(v => pk = Math.max(pk, Math.abs(v)));
  const b = Buffer.alloc(44 + x.length * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(x.length * 2, 40);
  x.forEach((v, i) => b.writeInt16LE(Math.round(v / pk * 0.9 * 32767), 44 + i * 2)); fs.writeFileSync(process.argv[wi + 1], b); console.log("wrote", process.argv[wi + 1]);
}
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
