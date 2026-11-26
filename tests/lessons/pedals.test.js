// The pedal models (apps/shared/lessons/pedals.js) in node: Tube Screamer mid hump (lows cleaner than mids) and soft clipping, Fuzz
// Face asymmetry (2nd harmonic) and guitar-volume clean-up, Big Muff mid scoop, wah peak moves with the treadle, Phase 90 two notches,
// CE-2 moving comb, DM-2 times / single repeat / darker repeats / self-oscillation, Echoplex wow, bypass, chain order, translation,
// panels bind only known keys, tracks complete.   Run: node tests/lessons/pedals.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../.."), P = require(ROOT + "/apps/shared/lessons/pedals.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const sr = 22050, sine = (f, a, sec) => { const x = new Float32Array(Math.round(sr * (sec || 0.5))); for (let i = 0; i < x.length; i++) x[i] = a * Math.sin(2 * Math.PI * f * i / sr); return x; };
const harm = (y, f, h, from) => { let re = 0, im = 0; for (let i = from || 2000; i < y.length; i++) { re += y[i] * Math.cos(2 * Math.PI * f * h * i / sr); im += y[i] * Math.sin(2 * Math.PI * f * h * i / sr); } return Math.hypot(re, im); };
const thd = (y, f) => { const h1 = harm(y, f, 1); let s = 0; for (let h = 2; h <= 7; h++) s += harm(y, f, h) ** 2; return Math.sqrt(s) / h1; };
// Tube Screamer
const tsLo = thd(P.process("ts808", { drive: 8 }, sine(100, 0.05), sr), 100), tsMid = thd(P.process("ts808", { drive: 8 }, sine(1000, 0.05), sr), 1000);
check("TS808: lows clipped less than mids (gain above ~720 Hz only)", tsLo < tsMid * 0.6, tsLo.toFixed(3) + " < " + tsMid.toFixed(3));
check("TS808: gain 12 .. 118 from Drive 0 to 10", Math.abs(P.tsGain(0) - 11.85) < 0.1 && Math.abs(P.tsGain(10) - 118.2) < 0.2);
const tsS = P.process("ts808", { drive: 8 }, sine(1000, 0.3), sr); check("TS808: symmetric soft clip (small 2nd harmonic)", harm(tsS, 1000, 2) < 0.05 * harm(tsS, 1000, 3));
// Fuzz Face
const ff = P.process("fuzzface", { fuzz: 8 }, sine(220, 0.2), sr); check("Fuzz Face: asymmetric clipping adds a 2nd harmonic", harm(ff, 220, 2) > 0.1 * harm(ff, 220, 1));
const ffAt = gv => thd(P.run([{ id: "fuzzface", st: { fuzz: 8 } }], sine(220, 0.3), sr, { gvol: gv }), 220);
check("Fuzz Face cleans up with the guitar's volume (THD at 4 far below 10)", ffAt(4) < 0.4 * ffAt(10), ffAt(10).toFixed(2) + " -> " + ffAt(4).toFixed(2));
const L10 = P.loading(10, 8000), L6 = P.loading(6, 8000); check("loading: guitar at 10 loses treble into the Fuzz Face, turned down it is brighter", L10.fc < 2000 && L6.fc > L10.fc * 2, Math.round(L10.fc) + " -> " + Math.round(L6.fc) + " Hz");
const tsAt = gv => thd(P.run([{ id: "ts808", st: { drive: 8 } }], sine(1000, 0.3), sr, { gvol: gv }), 1000);
const ffBehind = gv => thd(P.run([{ id: "ts808", st: { on: false } }, { id: "phase90", st: { on: false } }, { id: "fuzzface", st: { fuzz: 8 } }], sine(220, 0.3), sr, { gvol: gv }), 220);
check("bypassed pedals in front still let the Fuzz Face see the guitar (true bypass)", Math.abs(ffBehind(4) - ffAt(4)) < 1e-6);
// Big Muff
check("Big Muff: tone at noon scoops ~1 kHz below 100 Hz and 6 kHz", P.muffTone(1000, 5) < 0.75 * Math.min(P.muffTone(100, 5), P.muffTone(6000, 5)), P.muffTone(1000, 5).toFixed(2));
check("Big Muff: tone left = dark, right = bright", P.muffTone(5000, 0) < 0.15 && P.muffTone(100, 10) < 0.1);
check("Big Muff sustains: output level of a quiet and a loud note within 6 dB", (() => { const r = a => { const y = P.process("bigmuff", { sustain: 7 }, sine(220, a), sr); let s = 0; for (let i = 2000; i < y.length; i++) s += y[i] * y[i]; return Math.sqrt(s); }; return 20 * Math.log10(r(0.3) / r(0.02)) < 6; })());
// wah
check("Cry Baby: heel 400 Hz, toe 2.2 kHz, rising", P.wahFreq(0) === 400 && Math.abs(P.wahFreq(1) - 2200) < 1 && P.wahFreq(0.5) > 800);
const wah = p => harm(P.process("crybaby", { mode: "foot", pos: p }, sine(2000, 0.2), sr), 2000, 1);
check("Cry Baby: toe passes 2 kHz far more than heel", wah(10) > 3 * wah(0));
// phaser
const fr = []; for (let f = 50; f < 15000; f *= 1.01) fr.push(P.phaserResponse(700, f, 4)); let notches = 0; for (let i = 1; i < fr.length - 1; i++) if (fr[i] < fr[i - 1] && fr[i] <= fr[i + 1] && fr[i] < 0.1) notches++;
check("Phase 90: four all-pass stages + dry = two notches", notches === 2, notches);
// chorus
const ce = P.process("ce2", { rate: 5, depth: 8 }, sine(500, 0.3, 1), sr); const env = []; for (let b = 0; b < 80; b++) { let s = 0; for (let i = 1000 + b * 200; i < 1200 + b * 200; i++) s += ce[i] * ce[i]; env.push(s); }
check("CE-2: the moving delay makes the level of a 500 Hz tone swell and dip", Math.max(...env) > 2 * Math.min(...env));
// delays
const imp = sec => { const x = new Float32Array(Math.round(sr * sec)); x[10] = 1; return x; };
const peaks = (y, thr) => { const p = []; for (let i = 20; i < y.length; i++) if (Math.abs(y[i]) > thr && (p.length === 0 || i - p[p.length - 1] > 200)) p.push(i); return p; };
check("DM-2: Repeat Rate 10 = 20 ms, 0 = 300 ms", Math.abs(P.dm2Time(10) - 0.02) < 1e-9 && Math.abs(P.dm2Time(0) - 0.3) < 1e-9);
const d1 = P.process("dm2", { rate: 5, intensity: 0, echo: 8 }, imp(1.5), sr), T5 = P.dm2Time(5) * sr;
let e1 = 0, e2 = 0; for (let i = 0; i < 400; i++) { e1 += Math.abs(d1[Math.round(10 + T5) - 50 + i]); e2 += Math.abs(d1[Math.round(10 + 2 * T5) - 50 + i]); }
check("DM-2: Intensity 0 = one repeat", e1 > 0.05 && e2 < 1e-4 * e1 + 1e-6, e1.toFixed(3) + " / " + e2.toExponential(1));
const d2 = P.process("dm2", { rate: 5, intensity: 6, echo: 8 }, imp(1.5), sr); const spread = c => { let s = 0, m = 0, w = 0; for (let i = c - 300; i < c + 600; i++) { const a = d2[i] * d2[i]; s += a * i; w += a; } m = s / w; let v = 0; for (let i = c - 300; i < c + 600; i++) v += d2[i] * d2[i] * (i - m) ** 2; return Math.sqrt(v / w); };
check("DM-2: each repeat darker (wider impulse) than the one before", spread(Math.round(10 + 2 * T5)) > spread(Math.round(10 + T5)) * 1.2);
check("DM-2: long delays have less bandwidth than short", P.dm2Band(0.3) < 0.5 * P.dm2Band(0.05), Math.round(P.dm2Band(0.3)) + " Hz");
const osc = P.process("dm2", { rate: 8, intensity: 10, echo: 8 }, imp(3), sr); let late = 0; for (let i = osc.length - 4000; i < osc.length; i++) late = Math.max(late, Math.abs(osc[i]));
check("DM-2: Intensity 10 keeps going (self-oscillation, bounded)", late > 0.02 && late < 3, late.toFixed(3));
const ep = P.process("echoplex", { delay: 3, repeats: 0, echo: 10 }, sine(1000, 0.2, 1.2), sr), T = P.PEDALS.echoplex.time({ delay: 3 }) * sr;
const ph = s => { let re = 0, im = 0; for (let i = s; i < s + 200; i++) { re += ep[i] * Math.cos(2 * Math.PI * 1000 * i / sr); im += ep[i] * Math.sin(2 * Math.PI * 1000 * i / sr); } return Math.atan2(im, re); };
check("Echoplex: wow and flutter move the echo's timing (phase drifts)", Math.abs(ph(Math.round(T) + 3000) - ph(Math.round(T) + 12000)) > 0.05);
// all
for (const id of P.IDS) { const y = P.process(id, {}, sine(220, 0.3), sr); check(`${id}: sound, finite, bounded`, y.every(Number.isFinite) && Math.max(...y.map(Math.abs)) < 3 && Math.max(...y.map(Math.abs)) > 0.01);
  const b = P.process(id, { on: false }, sine(220, 0.3), sr); check(`${id}: bypass = the input`, b.every((v, i) => v === Math.fround(0.3 * Math.sin(2 * Math.PI * 220 * i / sr)))); }
const ab = P.run([{ id: "crybaby", st: {} }, { id: "fuzzface", st: {} }], sine(220, 0.2), sr), ba = P.run([{ id: "fuzzface", st: {} }, { id: "crybaby", st: {} }], sine(220, 0.2), sr);
check("chain order matters (wah→fuzz differs from fuzz→wah)", ab.some((v, i) => Math.abs(v - ba[i]) > 0.01));
// translation
const t1 = P.translate("fuzzface", {}, "bigmuff"); check("Fuzz Face → Big Muff: approx, notes name the clean-up and the scoop", t1.quality === "approx" && t1.notes.some(n => /volume/.test(n)) && t1.notes.some(n => /scoop/.test(n)), t1.quality);
check("same pedal → exact", P.translate("ts808", { drive: 3 }, "ts808").quality === "exact" && P.translate("ts808", { drive: 3 }, "ts808").state.drive === 3);
check("wah → overdrive: lost", P.translate("crybaby", {}, "ts808").quality === "lost");
const t2 = P.translate("dm2", { rate: 3 }, "echoplex"), want = P.dm2Time(3), got = P.PEDALS.echoplex.time(t2.state);
check("DM-2 → Echoplex: delay time within 10 %, notes add wow", Math.abs(got / want - 1) < 0.1 && t2.notes.some(n => /wow/.test(n)), Math.round(want * 1000) + " -> " + Math.round(got * 1000) + " ms");
check("Echoplex 750 ms → DM-2: clipped to 300 ms with a note", P.translate("echoplex", { delay: 10 }, "dm2").notes.some(n => /300 ms/.test(n)));
const t3 = P.translate("phase90", { speed: 5 }, "ce2"); check("Phase 90 → CE-2: rate matched within 25 %", Math.abs(P.PEDALS.ce2.rate(t3.state) / P.PEDALS.phase90.rate({ speed: 5 }) - 1) < 0.25);
check("Fuzz Face full up → Tube Screamer: not exact", P.translate("fuzzface", { fuzz: 10 }, "ts808").quality !== "exact");
// panels
const layouts = {}; global.FaithfulPanel = { register: L => { layouts[L.id] = L; } }; global.Pedals = P;
for (const id of P.IDS) { require(ROOT + `/apps/shared/lessons/panels/pd-${id}.js`); const L = layouts["pd-" + id];
  const keys = L.items.filter(i => i.k).map(i => i.k), miss = keys.filter(k => !P.ctl(id, k)), unbound = P.PEDALS[id].controls.map(c => c[0]).filter(k => keys.indexOf(k) < 0);
  check(`pd-${id}: panel binds only known keys and every control, has a footswitch and LED`, miss.length === 0 && unbound.length === 0 && L.items.some(i => i.t === "key" && i.k === "on") && L.items.some(i => i.t === "led"), miss.concat(unbound).join(","));
  check(`pd-${id}: no maker's logo words in legends beyond plain names`, !L.items.some(i => /®|™/.test(i.label || i.text || ""))); }
const T2 = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/pedals/tracks.json", "utf8")).tracks;
for (const id of P.IDS) { const l = T2.filter(t => t.pedal === id); check(`${id}: 3-4 tracks, YouTube url, title, channel, valid state`, l.length >= 3 && l.length <= 4 && l.every(t => /youtube\.com\/watch\?v=[\w-]{11}$/.test(t.url) && t.title && t.channel && (!t.state || Object.keys(t.state).every(k => P.ctl(id, k))))); }
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
