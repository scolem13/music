// node tests/rhythm/syllable-detect.test.js [--report]
// Feasibility test for syllable-detect.js: patterns from the site's rhythm bank are CHANTED by rhythm-chant.js's own synthesiser (Du De Da Di Ta) with
// voices whose vowel formants are NOT the detector's centroids (Peterson & Barney 1952 style averages for men, women, children, written from memory:
// UNVERIFIED), at several tempos, with noise and a small room, then analysed. Prints accuracy per syllable. A synthetic test says nothing about real
// mouths, rooms, mics, children's pitch, or fast speech; see the report in the session notes.
const RC = require("../../apps/shared/rhythm-chant.js"), SD = require("../../apps/shared/syllable-detect.js"), Aud = require("../../apps/patterns/audiation.js");
const fs = require("fs");
const report = process.argv.includes("--report");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL " + m); } else console.log("ok   " + m); };
// [F1, F2, F3] in Hz for the voices (absolute), divided by the voice's scale because the renderer multiplies by it
const VOICES = {
  man:   { f0: 110, s: 1.0,  v: { u: [300, 870, 2240], e: [400, 2050, 2650], a: [730, 1090, 2440], i: [270, 2290, 3010] } },
  man2:  { f0: 135, s: 1.0,  v: { u: [330, 800, 2300], e: [430, 1950, 2600], a: [700, 1150, 2500], i: [290, 2200, 2900] } },
  woman: { f0: 210, s: 1.16, v: { u: [370, 950, 2670], e: [470, 2400, 3000], a: [850, 1220, 2810], i: [310, 2790, 3310] } },
  child: { f0: 270, s: 1.3,  v: { u: [430, 1150, 3000], e: [560, 2800, 3500], a: [1030, 1370, 3170], i: [370, 3200, 3730] } }
};
const tab = (V) => { const o = {}; Object.keys(V.v).forEach(k => o[k] = V.v[k].map(f => f / V.s)); return o; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const src = fs.readFileSync(__dirname + "/../../apps/rhythms/rhythm-pattern-object.js", "utf8");
const bank = new Function(src + "; return rhythmPatternObject;")();
const pats = [];
["Duple-M-m-2-4", "Triple-M-m-6/8", "Duple-M-m-D-2/4", "Triple-M-m-D-6/8"].forEach(k => bank[k].split(/\n\s*\n/).filter(s => /^X:/m.test(s)).forEach(s => pats.push(s.trim() + "\n")));
const sr = 22050;
function room(x, k) { k = k || 1; const y = Float32Array.from(x), taps = [[0.011, 0.35], [0.023, 0.22], [0.041, 0.15], [0.067, 0.09]]; taps.forEach(([d, g]) => { const q = Math.round(d * sr); for (let i = q; i < y.length; i++) y[i] += k * g * x[i - q]; }); return y; }
function run(opts) {
  const R = rng(opts.seed), conf = {}, pos = { right: 0, n: 0 }, misses = { n: 0, all: 0 };
  let n = 0, hit = 0;
  for (let k = 0; k < opts.reps; k++) {
    const abc = pats[Math.floor(R() * pats.length)], V = VOICES[opts.voice], macro = opts.macro;
    const p = RC.plan(abc, { macroBpm: macro, syllables: "rhythm", seed: 100 + k, voice: V.s > 1 ? "high" : "low", f0: V.f0, formantScale: V.s, vowels: tab(V), jitterMs: 3, consonant: 1, taLevel: 1, tLength: 0.045, question: 0 });   // a student chanting: plain consonants and Ta, not the teacher model's quieter ones
    if (!p.syllables) continue;
    let x = RC.render(p, sr);
    if (opts.room) x = room(x, opts.room === true ? 1 : opts.room);
    if (opts.snr) { let e = 0; for (const v of x) e += v * v; const sd = Math.sqrt(e / x.length) / Math.pow(10, opts.snr / 20); for (let i = 0; i < x.length; i++) x[i] += (R() + R() + R() - 1.5) * 2 * sd; }
    const exp = p.notes.map(n => ({ t: n.t + (n.jit || 0), syl: n.syl }));
    const r = SD.analyze(x, sr, exp, { scale: opts.fixScale || null });
    r.onsets.forEach(o => { const key = o.expected.syl; conf[key] = conf[key] || { n: 0, ok: 0, as: {} }; conf[key].n++; n++; if (o.ok) { conf[key].ok++; hit++; } const h = o.heard || (o.found ? "?" : "missed"); conf[key].as[h] = (conf[key].as[h] || 0) + 1; });
  }
  return { n, hit, conf };
}
const pr = (name, r) => { console.log(`${name}: ${(100 * r.hit / r.n).toFixed(1)}% of ${r.n}` + (report ? "  " + Object.keys(r.conf).sort().map(k => `${k} ${(100 * r.conf[k].ok / r.conf[k].n).toFixed(0)}% (${JSON.stringify(r.conf[k].as)})`).join("  ") : "")); return r; };
const acc = r => r.hit / r.n;

const clean = {}; Object.keys(VOICES).forEach(v => { clean[v] = pr(`clean, ${v}, 60 macrobeats/min`, run({ voice: v, macro: 60, reps: 25, seed: 1 })); });
const tempos = {}; [60, 80, 100, 120].forEach(m => { tempos[m] = pr(`clean, man+woman, ${m}/min`, (() => { const a = run({ voice: "man", macro: m, reps: 20, seed: 2 }), b = run({ voice: "woman", macro: m, reps: 20, seed: 3 }); return { n: a.n + b.n, hit: a.hit + b.hit, conf: mergeConf(a.conf, b.conf) }; })()); });
function mergeConf(a, b) { const o = JSON.parse(JSON.stringify(a)); Object.keys(b).forEach(k => { o[k] = o[k] || { n: 0, ok: 0, as: {} }; o[k].n += b[k].n; o[k].ok += b[k].ok; Object.keys(b[k].as).forEach(h => o[k].as[h] = (o[k].as[h] || 0) + b[k].as[h]); }); return o; }
const both = (o) => { const a = run(Object.assign({ voice: "man", reps: 20, seed: 4 }, o)), b = run(Object.assign({ voice: "woman", reps: 20, seed: 5 }, o)); return { n: a.n + b.n, hit: a.hit + b.hit, conf: mergeConf(a.conf, b.conf) }; };
const n40 = pr("40 dB noise + room, man+woman, 80/min", both({ macro: 80, snr: 40, room: true }));
const n30 = pr("30 dB noise + room, man+woman, 80/min", both({ macro: 80, snr: 30, room: true }));
const n20 = pr("20 dB noise + room, man+woman, 80/min", both({ macro: 80, snr: 20, room: true }));
const mildRoom = pr("mild room (half the reflections), man+woman, 80/min", both({ macro: 80, room: 0.4 })); if (report) console.log(JSON.stringify(mildRoom.conf));
const roomOnly = pr("room only, man+woman, 80/min", both({ macro: 80, room: true })); if (report) console.log(JSON.stringify(roomOnly.conf));
const taDa = c => ({ da: c.Da.ok / c.Da.n, ta: c.Ta.ok / c.Ta.n });
const mw60 = (() => { const a = run({ voice: "man", macro: 60, reps: 25, seed: 11 }), b = run({ voice: "woman", macro: 60, reps: 25, seed: 12 }); return { n: a.n + b.n, hit: a.hit + b.hit, conf: mergeConf(a.conf, b.conf) }; })();
if (!report) {
  ok(acc(clean.man) > 0.9 && acc(clean.man2) > 0.9 && acc(clean.woman) > 0.9, "clean adult voices at 60 macrobeats/min: > 90% of syllables right (" + [clean.man, clean.man2, clean.woman].map(r => (100 * acc(r)).toFixed(0)).join(", ") + ")");
  ok(taDa(mw60.conf).da > 0.9 && taDa(mw60.conf).ta > 0.9, "Ta vs Da (aspiration + position-free): both > 90% at 60/min " + JSON.stringify(taDa(mw60.conf)));
  ok(acc(tempos[100]) > 0.85, "100 macrobeats/min: > 85% (" + (100 * acc(tempos[100])).toFixed(0) + ")");
  console.log("info a mild room (0.4 x the test room's reflections): " + (100 * acc(mildRoom)).toFixed(0) + "%, almost all of it /u/ read as something brighter");
  console.log("info a small, reflective room alone: " + (100 * acc(roomOnly)).toFixed(0) + "%; with 30 dB noise: " + (100 * acc(n30)).toFixed(0) + "%  (not asserted: the weak spot)");
  ok(acc(clean.child) > 0.75, "a child-like voice (f0 270, formants x1.3) is worse but usable on this synthetic test (" + (100 * acc(clean.child)).toFixed(0) + "%)");
}
console.log(fails ? fails + " FAILED" : "done"); process.exit(fails ? 1 : 0);
