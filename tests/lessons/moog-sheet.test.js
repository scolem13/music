// The Model D patch sheets (apps/shared/data/moog-sheets.json, apps/shared/lessons/moog-sheet.js), headless.
// node tests/lessons/moog-sheet.test.js   (NEG=1 must fail)
const MS = require("../../apps/shared/lessons/moog-sheet.js"), SC = require("../../apps/shared/lessons/synth-compare.js");
const DATA = require("../../apps/shared/data/moog-sheets.json");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const real = DATA.filter(e => !e.blank), blank = DATA.filter(e => e.blank);
check("44 printed sheets on pp. 55-76, 6 blank on pp. 77-79", real.length === 44 && blank.length === 6 && real.every(e => e.page >= 55 && e.page <= 76) && blank.every(e => e.page >= 77 && e.page <= 79), real.length + "/" + blank.length);
check("ids unique", new Set(DATA.map(e => e.id)).size === DATA.length);
// every control present on every sheet (null = left empty on the sheet; anything unreadable is in unsure)
let bad = [];
real.forEach(e => MS.CONTROLS.forEach(k => { if (!(k in e.sheet) && !e.unsure.includes(k)) bad.push(e.id + ":" + k); }));
check("every sheet has every control or lists it unsure", bad.length === 0, bad.slice(0, 5).join(" "));
bad = []; real.forEach(e => e.unsure.forEach(k => { if (!MS.CONTROLS.includes(k)) bad.push(e.id + ":" + k); }));
check("unsure names real controls", bad.length === 0, bad.join(" "));
bad = []; real.forEach(e => { for (const k in MS.OPTIONS) { const v = e.sheet[k]; if (v !== null && !MS.OPTIONS[k].includes(v)) bad.push(e.id + ":" + k + "=" + v); } });
check("switch / range / wave values are the printed choices", bad.length === 0, bad.slice(0, 5).join(" "));
bad = []; real.forEach(e => { for (const k of MS.KNOBS) { const v = e.sheet[k]; if (v !== null && typeof v === "number" && MS.snap(k, v) !== v) bad.push(e.id + ":" + k + "=" + v); } });
check("knob readings sit on a half division of their scale", bad.length === 0, bad.slice(0, 5).join(" "));
check("notes are the manual's words (Kraft Bass)", real.find(e => e.id === "kraft-bass").notes === "Set the LFO Rate knob to triangle wave (down position).\nAdjust External Input Volume to taste.\nUse Mod Wheel to introduce vibrato.");
check("LFO shape agrees with every note that names it", real.every(e => !/LFO Rate knob/.test(e.notes) || (/square/.test(e.notes) ? e.sheet.lfoShape === "square" : e.sheet.lfoShape === "triangle")));
// toState gives valid SynthCompare state
const P = SC.PROFILES.moog, ctl = {}; P.groups.forEach(g => g[2].forEach(c => ctl[c[0]] = c));
bad = [];
real.forEach(e => { const st = MS.toState(e.sheet);
  for (const k in st) { const c = ctl[k]; if (!c) { bad.push(e.id + ": no key " + k); continue; }
    const v = st[k]; if (c[2] === "k" && !(typeof v === "number" && v >= c[3] && v <= c[4])) bad.push(e.id + ":" + k + "=" + v);
    if (c[2] === "sel" && !c[3].includes(v)) bad.push(e.id + ":" + k + "=" + v); if (c[2] === "s" && typeof v !== "boolean") bad.push(e.id + ":" + k + "=" + v); }
  for (const k in P.def) if (!(k in st)) bad.push(e.id + ": missing " + k); });
check("toState: only PROFILES.moog keys, values in range", bad.length === 0, bad.slice(0, 5).join(" "));
check("toState makes an engine patch", real.every(e => { const E = SC.engine("moog", MS.toState(e.sheet)); return E && E.cut > 0 && E.aenv; }));
// round trip sheet -> state -> sheet within half a division
const HALF = { tune: 0.25, o2Freq: 0.5, o3Freq: 0.5 };
bad = [];
real.forEach(e => { const back = MS.fromState(MS.toState(e.sheet));
  for (const k of MS.KNOBS) { const v = e.sheet[k]; if (v === null || k === "tune" || k === "phones") continue;
    if (/^[fl][AD]$/.test(k)) { const dec = k[1] === "D", s1 = MS.secs(v, dec), s2 = MS.secs(back[k], dec);
      if (Math.abs(Math.log(s2 / s1)) > 0.1 && !(!dec && s1 >= 10 && s2 >= 9.9)) bad.push(e.id + ":" + k + " " + s1.toFixed(3) + "->" + s2.toFixed(3)); continue; }
    const lim = ["o2Freq", "o3Freq"].includes(k) && Math.abs(v) > 7 ? Math.abs(v) - 7 + 0.01 : (HALF[k] || 0.5);
    if (typeof v === "number" ? Math.abs(back[k] - v) > lim : back[k] !== v) bad.push(e.id + ":" + k + " " + v + "->" + back[k]); }
  for (const k of ["oscMod", "filtMod", "kb1", "kb2", "m1On", "m2On", "m3On", "extOn", "noiseOn", "glideOn", "decaySw", "src1", "src2", "lfoShape", "osc3Ctl", "noiseColor"])
    if (e.sheet[k] !== null && back[k] !== e.sheet[k]) bad.push(e.id + ":" + k + " " + e.sheet[k] + "->" + back[k]); });
check("round trip sheet -> state -> sheet within half a division", bad.length === 0, bad.slice(0, 5).join(" "));
// the printed time scale
const at = a => (a + 150) / 30, near = (x, y) => Math.abs(Math.log(x / y)) < 0.01;
check("time labels: 10 ms, 200 ms, 600 ms, 1 s, 5 s, 10 s", near(MS.secs(at(-114), false), 0.01) && near(MS.secs(at(-88), true), 0.2) && near(MS.secs(at(-29), false), 0.6)
  && near(MS.secs(at(30), true), 1) && near(MS.secs(at(64), false), 5) && near(MS.secs(at(104), true), 10));
check("time stops: attack 1 ms - 10 s, decay 4 ms - 35 s (manual p. 80)", near(MS.secs(0, false), 0.001) && near(MS.secs(10, false), 10) && near(MS.secs(0, true), 0.004) && near(MS.secs(10, true), 35));
check("posOfSecs inverts secs", [0.01, 0.2, 0.6, 1, 5].every(s => near(MS.secs(MS.posOfSecs(s, true), true), s)));
check("cutoff -5..5 maps onto 0..10", MS.toState({ cutoff: -5 }).cutoff === 0 && MS.toState({ cutoff: 0 }).cutoff === 5 && MS.toState({ cutoff: 5 }).cutoff === 10);
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
