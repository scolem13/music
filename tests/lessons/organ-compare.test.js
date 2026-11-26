// The organ engine and translator (apps/shared/lessons/organ-compare.js), headless.
// node tests/lessons/organ-compare.test.js   (NEG=1 must fail)
const OC = require("../../apps/shared/lessons/organ-compare.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const near = (a, b, t) => Math.abs(a - b) <= t;
// B-3: tonewheel pitches (ORGAN.md): A4 with every drawbar out
const all = { upre: "B", perc: false }; for (let i = 0; i < 9; i++) all["uB." + i] = 8;
const a4 = OC.partials("b3", all, 69, "upper"), fs = a4.map(p => p.f);
check("B-3 A4: nine pitches, 1 3/5' at ~2218 Hz (tempered), not 2200", a4.length === 9 && fs.some(f => near(f, 2218, 1.5)) && !fs.some(f => near(f, 2200, 1)), fs.map(f => f.toFixed(0)).join(" "));
check("B-3 A4: 2 2/3' tempered (1318.9 Hz, not 1320)", fs.some(f => near(f, 1318.96, 0.3)));
const c7 = OC.partials("b3", all, 96, "upper").find(p => p.ratio === 8).f;
check("B-3 C7: the 1' folds back two octaves (4186 Hz)", near(c7, 4186, 2), c7.toFixed(1));
check("drawbar step = 3 dB", near(20 * Math.log10(OC.partials("b3", Object.assign({}, all, { "uB.2": 6 }), 69).find(p => near(p.f, 440, .01)).a), -6, 0.01));
// presets and percussion
check("preset C cancels the upper manual", OC.partials("b3", { upre: "C" }, 60, "upper").length === 0);
check("preset C# = Stopped Flute 00 5320 000", OC.b3bars(OC.full("b3", { upre: "C#" }), "upper").join("") === "005320000");
check("percussion silences the 1' drawbar", OC.partials("b3", Object.assign({}, all, { perc: true }), 69).length === 8);
check("percussion only with preset B", OC.toCanon("b3", Object.assign({}, all, { perc: true, upre: "A#" })).fx.perc === null && !!OC.toCanon("b3", Object.assign({}, all, { perc: true })).fx.perc);
// translate
const lost = r => r.notes.filter(n => n.cls === "lost").map(n => n.what).join(" | ");
const r1 = OC.translate(OC.full("b3", { upre: "B", perc: true }), "b3", "vox");
check("B-3 -> Vox: percussion lost, lower manual and pedals lost", /Percussion/.test(lost(r1)) && /lower manual/.test(lost(r1)), lost(r1));
const ex = id => OC.EXAMPLES.find(e => e.id === id);
const rv = OC.translate(ex("vox-bright").s, "vox", "b3");
check("Vox IV -> B-3 2 2/3' 2' 1 3/5' 1' drawbars", ["uB.4", "uB.5", "uB.6", "uB.8"].every(k => rv.state[k] > 0), JSON.stringify(rv.state).slice(0, 80));
const rp = OC.translate(ex("pipe-plenum").s, "pipe", "farfisa");
check("Pipe plenum -> Farfisa: the mixture and pedal are lost", /lower manual and pedals/.test(lost(rp)) || /pedals/.test(lost(rp)), lost(rp));
const rf = OC.translate(ex("far-flutes").s, "farfisa", "pipe");
check("Farfisa flutes 8' + 4' -> pipe: Gedackt 8' and Spitzflöte 4', exact", rf.state.s_ged8 && rf.state.s_fl4 && rf.notes.filter(n => /Gedackt|Spitz/.test(n.what)).every(n => n.cls === "exact"));
const rr = OC.translate(OC.translate(ex("b3-jazz").s, "b3", "b3").state, "b3", "b3");
check("B-3 -> B-3 keeps 888 and its percussion", ["uB.0", "uB.1", "uB.2"].every(k => rr.state[k] === 8) && rr.state.perc && rr.state.percH === "3rd");
// every pair: known keys only, every note classed, every example loads
let bad = [];
for (const a of OC.MODELS) for (const b of OC.MODELS) for (const e of OC.EXAMPLES.filter(x => x.from === a)) {
  const r = OC.translate(e.s, a, b);
  for (const k in r.state) if (!OC.range(b, k)) bad.push(`${e.id}->${b}: key ${k}`);
  r.notes.forEach(n => { if (!/^(exact|approx|lost)$/.test(n.cls) || !n.why) bad.push(`${e.id}->${b}: note ${n.what}`); });
}
OC.EXAMPLES.forEach(e => { for (const k in e.s) if (!OC.range(e.from, k)) bad.push(`${e.id}: unknown key ${k}`); });
check("every translation uses real keys and classes every note", bad.length === 0, bad.slice(0, 4).join("; "));
// tracks: each points at a real example of its organ, oEmbed-checked
const A = require("../../apps/shared/data/organs/assignments.json");
const tb = A.videos.filter(v => !/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url) || !v.checked || !ex(v.build) || ex(v.build).from !== v.organ);
check("tracks: YouTube urls, checked, each Build is that organ's example", tb.length === 0 && OC.MODELS.every(m => A.videos.filter(v => v.organ === m).length >= 2), tb.map(v => v.song).join(","));
// the engine builds and plays on a stub AudioContext (no NaN parameters)
function stubCtx() { const P = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime(v) { if (!isFinite(v)) throw new Error("NaN param"); }, cancelScheduledValues() {} });
  const node = x => Object.assign({ connect() {}, disconnect() {}, start() {}, stop() {} }, x || {});
  return { currentTime: 0, sampleRate: 48000, state: "running", createGain: () => node({ gain: P() }), createAnalyser: () => node({ fftSize: 0 }),
    createOscillator: () => node({ frequency: P(), type: "", setPeriodicWave() {} }), createDelay: () => node({ delayTime: P() }), createBiquadFilter: () => node({ frequency: P(), Q: P(), type: "" }),
    createStereoPanner: () => node({ pan: P() }), createWaveShaper: () => node({ curve: null }), createConvolver: () => node({ buffer: null }), createBufferSource: () => node({ buffer: null }),
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createPeriodicWave: (r, i) => { if ([...i].some(x => !isFinite(x))) throw new Error("NaN wave"); return {}; } }; }
let eng = [];
for (const m of OC.MODELS) try { const v = OC.voice(stubCtx(), m, OC.def(m)); OC.PHRASE(m).forEach(n => { v.noteOn(n[2], n[3], n[0]); v.noteOff(n[2], n[3], n[0] + n[1]); }); v.set(OC.def(m)); v.allOff(); } catch (e) { eng.push(m + ": " + e.message); }
check("engine builds and plays every organ's phrase", eng.length === 0, eng.join("; "));
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
