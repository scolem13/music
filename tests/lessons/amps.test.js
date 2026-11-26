// The amp models (apps/shared/lessons/amps.js) in node: the tone stack's closed form (Yeh & Smith 2006) equals an independent nodal
// solve of the FMV network from its component values; its bilinear digital filter follows the analog curve; Fender knobs do what
// they say; the Vox Cut lowers the treble; sag compresses (and a valve rectifier more than silicon); push-pull cancels even
// harmonics; the preamp clip makes them; reverb and tremolo; every amp bounded; translation; panels bind only known keys; tracks.
// Run: node tests/lessons/amps.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../.."), A = require(ROOT + "/apps/shared/lessons/amps.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const sr = 44100, sine = (f, a, sec) => { const x = new Float32Array(Math.round(sr * (sec || 0.4))); for (let i = 0; i < x.length; i++) x[i] = a * Math.sin(2 * Math.PI * f * i / sr); return x; };
const harm = (y, f, h, from) => { let re = 0, im = 0; for (let i = from || 6000; i < y.length; i++) { re += y[i] * Math.cos(2 * Math.PI * f * h * i / sr); im += y[i] * Math.sin(2 * Math.PI * f * h * i / sr); } return Math.hypot(re, im); };
const rms = (y, from) => { let s = 0; for (let i = from || 6000; i < y.length; i++) s += y[i] * y[i]; return Math.sqrt(s / (y.length - (from || 6000))); };
// --- an independent complex nodal solve of the FMV stack: C1 to the treble pot, R4 slope resistor, C2 to the treble pot's foot, C3 to
// the mid pot's wiper, bass pot from the treble pot's foot to the mid pot's top (the network of Yeh & Smith's Fig. 1)
function nodal(c, t, m, l, f) { const w = 2 * Math.PI * f, N = 6, G = [...Array(N)].map(() => [...Array(N)].map(() => [0, 0])), I = [...Array(N)].map(() => [0, 0]);
  const els = [["in", 0, "C", c.C1], [0, 1, "R", (1 - t) * c.R1], [1, 2, "R", t * c.R1], ["in", 3, "R", c.R4], [3, 2, "C", c.C2], [3, 4, "C", c.C3], [2, 5, "R", l * c.R2], [5, 4, "R", (1 - m) * c.R3], [4, -1, "R", m * c.R3]];
  for (const [a, b, k, v] of els) { const y = k === "R" ? [1 / Math.max(v, 1e-3), 0] : [0, w * v], st = (i, j, s) => { G[i][j][0] += s * y[0]; G[i][j][1] += s * y[1]; };
    if (a === "in") { st(b, b, 1); I[b][0] += y[0]; I[b][1] += y[1]; continue; } if (a >= 0) st(a, a, 1); if (b >= 0) st(b, b, 1); if (a >= 0 && b >= 0) { st(a, b, -1); st(b, a, -1); } }
  const M = G.map((r, i) => r.concat([I[i]])), mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const fc = div(M[j][i], M[i][i]); for (let k = i; k <= N; k++) { const p = mul(fc, M[i][k]); M[j][k][0] -= p[0]; M[j][k][1] -= p[1]; } }
  const x = Array(N); for (let i = N - 1; i >= 0; i--) { let s = [...M[i][N]]; for (let k = i + 1; k < N; k++) { const p = mul(M[i][k], x[k]); s[0] -= p[0]; s[1] -= p[1]; } x[i] = div(s, M[i][i]); } return Math.hypot(...x[1]); }
for (const id of ["bassman", "twin", "plexi", "ac30", "rect"]) { const c = A.STACKS[id]; let e = 0;
  for (const [t, m, l] of [[.5, .5, .5], [.2, .8, .3], [.9, .1, .7], [.05, .95, .95]]) for (const f of [20, 60, 250, 1000, 4000, 15000]) e = Math.max(e, Math.abs(nodal(c, t, m, l, f) / A.stackH(c, t, m, l, f) - 1));
  check(`${id} stack: closed form = nodal solve of the components (max error < 1e-9)`, e < 1e-9, e.toExponential(1)); }
const B = A.STACKS.bassman, dB = v => 20 * Math.log10(v);
check("Bassman stack at 5/5/5 scoops the mids: 1 kHz below 100 Hz and 5 kHz", A.stackH(B, .5, .5, .5, 1000) < A.stackH(B, .5, .5, .5, 100) && A.stackH(B, .5, .5, .5, 1000) < A.stackH(B, .5, .5, .5, 5000), dB(A.stackH(B, .5, .5, .5, 1000)).toFixed(1) + " dB");
check("Treble up raises 5 kHz; Bass up raises 60 Hz; Middle up raises 600 Hz", A.stackH(B, 1, .5, .5, 5000) > 1.5 * A.stackH(B, .1, .5, .5, 5000) && A.stackH(B, .5, .5, 1, 60) > 1.5 * A.stackH(B, .5, .5, .1, 60) && A.stackH(B, .5, 1, .5, 600) > 1.3 * A.stackH(B, .5, .1, .5, 600));
check("the stack is passive (|H| <= 1 everywhere) and blocks DC", [10, 100, 1000, 1e4, 2e4].every(f => A.stackH(B, .7, .7, .7, f) <= 1.0001) && A.stackH(B, .5, .5, .5, 0.01) < 1e-3);
// bilinear digital filter vs the analog curve (process a sine through the Twin's stack only is not exposed; use a Bassman-only check via curve vs process at low gain)
const tw = A.defaults("twin"); tw.volume = 1;
const gainAt = f => harm(A.process("twin", tw, sine(f, 0.005, 0.5), sr, { noCab: true, noFx: true }), f, 1, 8000);
const r1 = dB(gainAt(1000) / gainAt(150)), r2 = dB(A.stackH(A.STACKS.twin, .6, .5, A.taper(4), 1000) / A.stackH(A.STACKS.twin, .6, .5, A.taper(4), 150));
check("Twin, quiet: the digital amp follows the analog stack's 1 kHz : 150 Hz ratio within 2.5 dB", Math.abs(r1 - r2) < 2.5, r1.toFixed(1) + " vs " + r2.toFixed(1));
// Vox Cut
check("Vox Cut lowers the treble: 5 kHz at Cut 10 >= 8 dB below Cut 0 (relative to 500 Hz)", (A.curve("ac30", { cut: 0 }, 5000) - A.curve("ac30", { cut: 0 }, 500)) - (A.curve("ac30", { cut: 10 }, 5000) - A.curve("ac30", { cut: 10 }, 500)) > 8);
check("the AC30 has no Middle knob (Top Boost)", !A.ctl("ac30", "middle") && A.STACKS.ac30.fixedMid === 1);
// power amp: sag and push-pull
const pw = (sag, a) => { const f = A.power({ bias: 0.25, drive: 2, sag }, sr), x = sine(110, a, 0.6), y = x.map(f); return rms(y, 12000); };
const span0 = dB(pw(0, 0.8) / pw(0, 0.2)), span1 = dB(pw(0.4, 0.8) / pw(0.4, 0.2));
check("sag compresses: loud vs quiet output spread smaller with sag", span1 < span0 - 0.5, span0.toFixed(2) + " -> " + span1.toFixed(2) + " dB");
const rs = st => A.drive("rect", Object.assign(A.defaults("rect"), st));
check("Rectifier switch: tube sags more than silicon (more compression)", rs({ rect: "tube", gain: 1, master: 6, mode: "vintage" }) < rs({ rect: "silicon", gain: 1, master: 6, mode: "vintage" }) - 0.3, rs({ rect: "silicon", gain: 1, master: 6, mode: "vintage" }).toFixed(2) + " vs " + rs({ rect: "tube", gain: 1, master: 6, mode: "vintage" }).toFixed(2));
const pp = A.power({ bias: 0.25, drive: 3, sag: 0 }, sr), py = sine(220, 0.8).map(pp);
check("push-pull cancels even harmonics (2nd << 3rd)", harm(py, 220, 2) < 0.01 * harm(py, 220, 3));
const pre = A.process("plexi", A.defaults("plexi"), sine(220, 0.3), sr, { noCab: true });
check("Plexi preamp clipping (asymmetric triodes) leaves a 2nd harmonic", harm(pre, 220, 2) > 0.02 * harm(pre, 220, 1));
const thd = (id, st) => { const y = A.process(id, Object.assign(A.defaults(id), st), sine(220, 0.3), sr, { noCab: true, noFx: true }); let s = 0; for (let h = 2; h <= 7; h++) s += harm(y, 220, h) ** 2; return Math.sqrt(s) / harm(y, 220, 1); };
check("Twin is clean at volume 3, dirtier at 10", thd("twin", { volume: 3 }) < 0.05 && thd("twin", { volume: 10 }) > 2 * thd("twin", { volume: 3 }), thd("twin", { volume: 3 }).toFixed(3) + " / " + thd("twin", { volume: 10 }).toFixed(3));
check("gain order at defaults: Twin < AC30 < Bassman < Plexi <= Rectifier (drive = level change for 12 dB in)", A.drive("twin", {}) > A.drive("ac30", {}) && A.drive("ac30", {}) > A.drive("bassman", {}) && A.drive("bassman", {}) > A.drive("plexi", {}) && A.drive("plexi", {}) >= A.drive("rect", {}) - 0.3);
// reverb, tremolo, vibrato
const imp = () => { const x = new Float32Array(sr); for (let i = 0; i < 200; i++) x[100 + i] = 0.05 * Math.sin(i / 3); return x; };
const tail = st => rms(A.process("twin", Object.assign(A.defaults("twin"), st), imp(), sr), sr * 0.3);
check("Twin reverb: a tail after the note with Reverb up, none with it at 0", tail({ reverb: 7 }) > 20 * tail({ reverb: 0 }) + 1e-9);
const env = y => { const e = []; for (let b = 0; b < 40; b++) { let s = 0; for (let i = 8000 + b * 400; i < 8400 + b * 400; i++) s += y[i] * y[i]; e.push(s); } return Math.max(...e) / Math.min(...e); };
check("Twin tremolo: Intensity 8 swings the level of a held note", env(A.process("twin", { intensity: 8, speed: 6 }, sine(330, 0.05, 1), sr)) > 3 && env(A.process("twin", { intensity: 0 }, sine(330, 0.05, 1), sr)) < 1.3);
check("AC30 tremolo swings the level; vibrato keeps it steady", env(A.process("ac30", { vt: "tremolo", volume: 2 }, sine(330, 0.05, 1), sr)) > 2 && env(A.process("ac30", { vt: "vibrato", volume: 2 }, sine(330, 0.05, 1), sr)) < 1.6);
// SVT
check("SVT Ultra Hi lifts 8 kHz, Ultra Lo lifts 45 Hz; midrange frequency moves the mid", A.curve("svt", { ultrahi: true }, 8000) > A.curve("svt", {}, 8000) + 3 && A.curve("svt", { ultralo: true }, 45) > A.curve("svt", {}, 45) + 3 && A.curve("svt", { middle: 10, midf: "220" }, 220) - A.curve("svt", { middle: 10, midf: "3000" }, 220) > 6);
for (const id of A.IDS) { const y = A.process(id, {}, sine(110, 0.3), sr); const pk = Math.max(...y.map(Math.abs)); check(`${id}: sound, finite, bounded`, y.every(Number.isFinite) && pk < 4 && pk > 1e-3, pk.toFixed(3)); }
// translation
check("same amp -> exact", A.translate("twin", { volume: 3 }, "twin").quality === "exact");
const t1 = A.translate("twin", { reverb: 6, volume: 3 }, "ac30"); check("Twin -> AC30: approx, notes say the reverb and the middle knob are lost", t1.quality === "approx" && t1.notes.some(n => /reverb/.test(n)) && t1.notes.some(n => /[Mm]iddle/.test(n)), t1.quality);
check("Twin -> AC30 clean stays clean (low volume)", t1.state.volume <= 4, t1.state.volume);
const t2 = A.translate("plexi", { vol1: 10, vol2: 10 }, "twin"); check("Plexi flat out -> Twin: volume driven high", t2.state.volume >= 8, t2.state.volume);
const t3 = A.translate("ac30", { cut: 9 }, "twin"); check("AC30 with Cut up -> Twin: treble turned down", t3.state.treble <= 5 && t3.notes.some(n => /Cut/.test(n)), t3.state.treble);
const t4 = A.translate("bassman", A.defaults("bassman"), "plexi"); check("Bassman -> Plexi: a close tone match (rms < 3 dB)", /within (\d\.\d)/.test(t4.notes.slice(-1)[0]) && +RegExp.$1 < 3, t4.notes.slice(-1)[0]);
check("guitar amp -> SVT notes the family change", A.translate("twin", {}, "svt").notes.some(n => /bass amp/.test(n)));
// panels
const layouts = {}; global.FaithfulPanel = { register: L => { layouts[L.id] = L; } };
for (const id of A.IDS) { require(ROOT + `/apps/shared/lessons/panels/amp-${id}.js`); const L = layouts["amp-" + id];
  const keys = L.items.filter(i => i.k).map(i => i.k), miss = keys.filter(k => !A.ctl(id, k) && !/^(n_|vib_|normal_)/.test(k)), unbound = A.AMPS[id].controls.map(c => c[0]).filter(k => keys.indexOf(k) < 0);
  check(`amp-${id}: panel binds only known keys (or marked dimmed decoys) and every control`, miss.length === 0 && unbound.length === 0, miss.concat(unbound).join(","));
  check(`amp-${id}: no logo marks`, !L.items.some(i => /®|™/.test(i.label || i.text || ""))); }
const T = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/amps/tracks.json", "utf8")).tracks;
for (const id of A.IDS) { const l = T.filter(t => t.amp === id); check(`${id}: 3 tracks, YouTube url, title, channel, valid state`, l.length === 3 && l.every(t => /youtube\.com\/watch\?v=[\w-]{11}$/.test(t.url) && t.title && t.channel && Object.keys(t.state || {}).every(k => A.ctl(id, k)))); }
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
