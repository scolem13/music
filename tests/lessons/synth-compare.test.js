// The nine-synth page's translator and engine (apps/shared/lessons/synth-compare.js), headless.
// node tests/lessons/synth-compare.test.js   (NEG=1 must fail)
const SC = require("../../apps/shared/lessons/synth-compare.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const tr = id => { const ex = SC.EXAMPLES.find(x => x.id === id); return SC.translate(ex.s, ex.from, ex.from === "moog" ? "prophet" : "moog"); };
const lost = r => r.notes.filter(n => n.cls === "lost").map(n => n.what).join(" | ");
// the cases the page's text promises
check("fat bass: nothing lost", lost(tr("fat-bass")) === "", lost(tr("fat-bass")));
check("fifths lead: the third oscillator is lost", /Third oscillator/.test(lost(tr("fifths-lead"))));
check("feedback: lost on the Prophet", /Feedback/.test(lost(tr("feedback"))));
check("osc 3 FM: becomes Poly Mod from B to freq A", (s => s.pmOscB > 0 && s.pmFA && !s.bKbd)(tr("osc3-fm").state));
check("LFO wah: wheel-mod LFO square to the filter", (s => s.wmF && s.lfoSq && s.wmMix === 0)(tr("lfo-wah").state));
check("strings: chords lost on the Model D", /Chords/.test(lost(tr("p5-strings"))));
check("sync: lost on the Model D", /sync/i.test(lost(tr("p5-sync"))));
check("PWM: lost on the Model D", /Pulse-width/.test(lost(tr("p5-pwm"))));
check("unison: becomes a third oscillator", (s => s.m3On && s.m3 > 0)(tr("p5-unison").state));
// every note cites a manual page; every control it names exists on its panel
const ids = p => new Set(SC.PROFILES[p].groups.flatMap(g => g[2].map(c => c[0])));
let bad = [];
for (const ex of SC.EXAMPLES) {
  const to = ex.from === "moog" ? "prophet" : "moog", r = SC.translate(ex.s, ex.from, to);
  r.notes.forEach(n => { if (!n.cite.length) bad.push(ex.id + ": no cite: " + n.what);
    n.ctl.from.forEach(k => { if (!ids(ex.from).has(k)) bad.push(ex.id + ": no control " + k); });
    n.ctl.to.forEach(k => { if (!ids(to).has(k)) bad.push(ex.id + ": no control " + k); }); });
  for (const k in r.state) if (!(k in SC.PROFILES[to].def)) bad.push(ex.id + ": unknown key " + k);
}
check("every note cited, every control real", bad.length === 0, bad.slice(0, 4).join("; "));
// round trip keeps a plain patch
const back = SC.translate(tr("fat-bass").state, "prophet", "moog").state, orig = SC.full("moog", SC.EXAMPLES[0].s);
const diff = ["cutoff", "emph", "fS", "lS", "m1", "m2", "o1Range", "o2Range", "o1Wave", "o2Wave"].filter(k => (typeof orig[k] === "number" ? Math.abs(orig[k] - back[k]) > 0.15 : orig[k] !== back[k]));
check("fat bass survives Model D → Prophet → Model D", diff.length === 0, diff.join(","));
// the engine: sound, no NaN, both directions of every example
let P; function AWP() { this.port = {}; }
new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", SC.workletSource)(AWP, (n, c) => P = c, 48000);
function render(id, st, notes, wheel) {
  const p = new P(); p.port.onmessage({ data: { type: "patch", E: SC.engine(id, st) } }); p.port.onmessage({ data: { type: "wheel", v: wheel || 0 } });
  notes.forEach(n => p.port.onmessage({ data: { type: "on", note: n, vel: .8 } }));
  const out = [[new Float32Array(128)]]; let s = 0, nan = false, n = 0;
  for (let b = 0; b < 300; b++) { p.process([], out); for (const x of out[0][0]) { if (!isFinite(x)) nan = true; s += x * x; n++; } }
  return { rms: Math.sqrt(s / n), nan };
}
bad = [];
for (const ex of SC.EXAMPLES) for (const id of ["moog", "prophet"]) {
  const st = id === ex.from ? ex.s : SC.translate(ex.s, ex.from, id).state, r = render(id, st, ex.phrase.slice(0, 3).map(x => x[0]), ex.wheel);
  if (r.nan || r.rms < 0.005) bad.push(ex.id + "/" + id + " rms " + r.rms.toFixed(4));
}
check("every example sounds on both synths, no NaN", bad.length === 0, bad.join("; "));
// the Model D is monophonic: a chord sounds one voice; the Prophet five
const one = render("moog", {}, [48, 55, 60]), five = render("prophet", {}, [48, 55, 60]);
check("Model D chord: one voice; Prophet: more", five.rms > one.rms * 1.3, one.rms.toFixed(3) + " vs " + five.rms.toFixed(3));
// feedback raises the drive (more energy with the external input up)
const fbOff = render("moog", Object.assign({}, SC.EXAMPLES[2].s, { extOn: false }), [36]), fbOn = render("moog", SC.EXAMPLES[2].s, [36]);
check("feedback changes the sound", Math.abs(fbOn.rms - fbOff.rms) > 0.002, fbOff.rms.toFixed(4) + " -> " + fbOn.rms.toFixed(4));
// filter plot: 24 dB per octave well above the cutoff
const E = SC.engine("moog", { cutoff: 3, emph: 0 }), f0 = 200;
const slope = SC.filterResponse(E, f0 * 2, 60) - SC.filterResponse(E, f0 * 4, 60);
check("filter curve falls about 24 dB an octave", slope > 18 && slope < 27, slope.toFixed(1));
// ---- nine synths: every pair translates, every note cites, every control named is real ----
const IDS = SC.IDS;
check("seventeen synths", IDS.length === 17 && IDS.every(id => SC.PROFILES[id]), IDS.join(","));
bad = []; let pairs = 0, notes = 0;
for (const ex of SC.EXAMPLES) for (const to of IDS) {
  if (to === ex.from) continue; pairs++;
  let r; try { r = SC.translate(ex.s, ex.from, to); } catch (e) { bad.push(ex.id + "→" + to + ": " + e.message); continue; }
  if (!r.notes.length) bad.push(ex.id + "→" + to + ": no notes");
  r.notes.forEach(n => { notes++;
    if (!["exact", "approx", "lost"].includes(n.cls)) bad.push(ex.id + "→" + to + ": class " + n.cls);
    if (!n.cite.length || n.cite.some(c => !c.title || c.page == null)) bad.push(ex.id + "→" + to + ": uncited " + n.what);
    n.ctl.from.forEach(k => { if (!ids(ex.from).has(k)) bad.push(ex.id + "→" + to + ": no control " + ex.from + "." + k); });
    n.ctl.to.forEach(k => { if (!ids(to).has(k)) bad.push(ex.id + "→" + to + ": no control " + to + "." + k); }); });
  for (const k in r.state) if (!(k in SC.PROFILES[to].def)) bad.push(ex.id + "→" + to + ": unknown key " + k);
  for (const k in r.state) if (typeof r.state[k] === "number" && !isFinite(r.state[k])) bad.push(ex.id + "→" + to + ": NaN " + k);
}
check("every example → every other synth: notes, citations, real controls", bad.length === 0, pairs + " pairs, " + notes + " notes; " + bad.slice(0, 4).join("; "));
// every synth's default and every translation sounds, no NaN
bad = [];
for (const ex of SC.EXAMPLES) for (const id of IDS) {
  const st = id === ex.from ? ex.s : SC.translate(ex.s, ex.from, id).state, r = render(id, st, ex.phrase.slice(0, 3).map(x => x[0]), ex.wheel);
  if (r.nan || r.rms < 0.004) bad.push(ex.id + "/" + id + " rms " + r.rms.toFixed(4));
}
check("every example sounds on all nine synths, no NaN", bad.length === 0, bad.slice(0, 6).join("; "));
bad = IDS.filter(id => { const r = render(id, {}, [60]); return r.nan || r.rms < 0.004; });
check("every synth's own default sounds", bad.length === 0, bad.join(","));
// ---- Vital and Surge XT ----
const SR = 48000;
function wave(id, st, note, blocks) {   // the raw output of one held note
  const p = new P(); p.port.onmessage({ data: { type: "patch", E: SC.engine(id, st) } }); p.port.onmessage({ data: { type: "on", note, vel: .8 } });
  const out = [[new Float32Array(128)]], all = []; for (let b = 0; b < (blocks || 200); b++) { p.process([], out); all.push(...out[0][0]); } return all.slice(all.length / 2);
}
const bright = a => { let d = 0, e = 0; for (let i = 1; i < a.length; i++) { d += (a[i] - a[i - 1]) ** 2; e += a[i] ** 2; } return Math.sqrt(d / e); };
const xings = a => { let n = 0; for (let i = 1; i < a.length; i++) if (a[i - 1] < 0 && a[i] >= 0) n++; return n; };
const open = { cut: 136, res: 0, e1A: 0, e1S: 100, e2S: 100 };
const vSine = bright(wave("vital", Object.assign({}, open, { o1Frame: 0 }), 48)), vSaw = bright(wave("vital", Object.assign({}, open, { o1Frame: 256 }), 48));
check("Vital: wave frame 256 (saw) brighter than frame 0 (sine)", vSaw > vSine * 2, vSine.toFixed(4) + " vs " + vSaw.toFixed(4));
const sxOpen = { cut: 67, res: 0, aA: -10, aS: 100, fType: "LP 12 dB" };
const xMain = xings(wave("surge", Object.assign({}, sxOpen, { o1Shape: -100, o1W: 50 }), 60)), xSub = xings(wave("surge", Object.assign({}, sxOpen, { o1Shape: -100, o1W: 50, o1Sub: 100 }), 60));
check("Surge XT: Sub Mix 100 % sounds an octave down", Math.abs(xMain / xSub - 2) < 0.15, xMain + " / " + xSub);
const ring = render("surge", Object.assign({}, sxOpen, { m1: 0, m2: 0, r12: 100, o2Pitch: 7 }), [60]);
check("Surge XT: ring 1×2 alone sounds", !ring.nan && ring.rms > 0.004, ring.rms.toFixed(4));
const exS = id => SC.EXAMPLES.find(e => e.id === id);
const v2p = SC.translate(exS("vital-morph").s, "vital", "ppg"), p2v = SC.translate(exS("ppg-sweep").s, "ppg", "vital"), v2m = SC.translate(exS("vital-morph").s, "vital", "moog");
check("Vital → PPG keeps the envelope on the wave; → Model D loses it", v2p.state.envWave > 0 && !v2p.notes.some(n => n.cls === "lost" && /wavetable/.test(n.what)) && v2m.notes.some(n => n.cls === "lost" && /wavetable/.test(n.what)));
check("PPG → Vital keeps the envelope on the wave frame", p2v.state.e2Frame > 0, p2v.state.e2Frame);
const m2s = SC.translate(exS("fifths-lead").s, "moog", "surge");
check("Model D's third oscillator lost on the Surge XT panel, and the note says the real plug-in has more", m2s.notes.some(n => n.cls === "lost" && /beginner Surge XT panel/.test(n.why)));
check("Surge XT ring lost on the Prophet-5", SC.translate(Object.assign({}, exS("surge-first").s, { r12: 60 }), "surge", "prophet").notes.some(n => n.cls === "lost" && /Ring/.test(n.what)));
check("Model D → Surge XT / Vital: one voice is exact (Mono / polyphony 1)", ["surge", "vital"].every(t => SC.translate(exS("fat-bass").s, "moog", t).notes.some(n => n.what === "One voice" && n.cls === "exact")));
const vb = SC.translate(SC.translate(exS("vital-bass").s, "vital", "surge").state, "surge", "vital").state, vo = SC.full("vital", exS("vital-bass").s);
const vd = ["cut", "res", "e1S", "e2Cut", "o1Tr", "o2Tr", "poly"].filter(k => Math.abs(vo[k] - vb[k]) > (k === "cut" ? 0.6 : 1.5));
check("Vital bass survives Vital → Surge XT → Vital (cutoff, resonance, envelopes, tuning, voices)", vd.length === 0, vd.map(k => k + " " + vo[k] + "→" + vb[k]).join(", "));
check("Vital and Surge XT hints read the real plug-ins' units", SC.PROFILES.vital.hint("e1A", 1) === "1.00 s" && /Hz/.test(SC.PROFILES.surge.hint("cut", 0)) && SC.PROFILES.surge.hint("o1Shape", -100) === "pulse");
// the DX7: 32 algorithms; the manual's carrier counts (DX7 manual p. 24)
check("DX7: 32 algorithms of 6 operators", SC.DX_ALG.length === 32 && SC.DX_ALG.every(a => a.length === 6));
const cc = n => SC.dxCarriers(n).length;
check("DX7 carriers: alg 1 = 2, 5 = 3, 16 = 1, 32 = 6 (manual p. 24)", cc(1) === 2 && cc(5) === 3 && cc(16) === 1 && cc(32) === 6, [1, 5, 16, 32].map(cc).join(","));
check("DX7: every algorithm has feedback (manual p. 25)", SC.DX_ALG.every(a => a.some(f => f & 0x40) && a.some(f => f & 0x80)));
const alg = n => render("dx7", Object.assign({}, SC.EXAMPLES.find(e => e.id === "dx7-saw").s, { alg: n }), [60]);
bad = []; for (let n = 1; n <= 32; n++) { const r = alg(n); if (r.nan || r.rms < 0.004) bad.push(n); }
check("DX7: all 32 algorithms sound", bad.length === 0, bad.join(","));
// FM is what does not translate
const dxOut = SC.translate(SC.EXAMPLES.find(e => e.id === "dx7-bell").s, "dx7", "moog");
check("DX7 → Model D: FM lost", dxOut.notes.some(n => n.cls === "lost" && /FM/.test(n.what)));
check("Prophet → DX7: the filter is lost", SC.translate(SC.EXAMPLES[5].s, "prophet", "dx7").notes.some(n => n.cls === "lost" && /filter/i.test(n.what)));
// filter slopes: OB-Xa 2-pole 12 dB, 4-pole 24 dB; MS-20 12 dB; a high-pass rises at 12 dB below its cutoff
function slopeOf(id, st) { const E = SC.engine(id, st), f0 = E.cut; return SC.filterResponse(E, f0 * 4, 60) - SC.filterResponse(E, f0 * 8, 60); }
const ob12 = slopeOf("obxa", { pole4: false, res: 0, track: false }), ob24 = slopeOf("obxa", { pole4: true, res: 0, track: false }), ms = slopeOf("ms20", { lPeak: 0, hCut: 0 });
check("filter slopes: OB-Xa 2-pole ~12 dB, 4-pole ~24 dB an octave", ob12 > 10 && ob12 < 14 && ob24 > 20 && ob24 < 27, ob12.toFixed(1) + " / " + ob24.toFixed(1));
check("filter slopes: MS-20 low-pass ~12 dB", ms > 10 && ms < 14, ms.toFixed(1));
const Eh = SC.engine("ms20", { hCut: 6, hPeak: 0, lCut: 10, lPeak: 0 }), hc = Eh.hpf.cut, hs = SC.filterResponse(Eh, hc / 4, 60) - SC.filterResponse(Eh, hc / 8, 60);
check("MS-20 high-pass rises ~12 dB an octave below its cutoff", hs > 10 && hs < 14, hs.toFixed(1));
const tSlope = SC.translate({ pole4: false }, "obxa", "prophet").notes.find(n => /slope/i.test(n.what));
check("OB-Xa 2-pole → Prophet: the slope change is noted", !!tSlope && tSlope.cls === "approx");
// features that only one synth has
const lostTo = (exId, to, re) => SC.translate(SC.EXAMPLES.find(e => e.id === exId).s, SC.EXAMPLES.find(e => e.id === exId).from, to).notes.some(n => n.cls === "lost" && re.test(n.what));
check("Juno chorus lost on the Prophet", lostTo("juno-strings", "prophet", /Chorus/));
check("ARP ring modulator lost on the Juno", lostTo("arp-ring", "juno", /Ring/));
check("SEM band-pass lost on the Model D", lostTo("ob-sem-bp", "moog", /mode/));
check("MS-20 high-pass lost on the Prophet", lostTo("ms20-hot", "prophet", /High-pass/));
check("303 accent kept on nothing but the 303 (approx with velocity on the Prophet)", SC.translate(SC.EXAMPLES.find(e => e.id === "303-acid").s, "tb303", "prophet").notes.some(n => /Accent/.test(n.what) && n.cls === "approx"));
check("chords lost on the TB-303", lostTo("juno-strings", "tb303", /Chords/));
// accent and slide sound different in the engine
let P2; new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", SC.workletSource)(AWP, (n, c) => P2 = c, 48000);
const acc = v => { const p = new P2(); p.port.onmessage({ data: { type: "patch", E: SC.engine("tb303", { accent: 10 }) } }); p.port.onmessage({ data: { type: "on", note: 36, vel: v } }); const o = [[new Float32Array(128)]]; let s = 0; for (let b = 0; b < 100; b++) { p.process([], o); for (const x of o[0][0]) s += x * x; } return s; };
check("TB-303 accent is louder", acc(1) > acc(0.8) * 1.3, (acc(1) / acc(0.8)).toFixed(2));
// the Juno-106 HPF at 0 boosts the bass; chorus changes the sound
const j0 = render("juno", { model: "106", hpf: 0 }, [36]).rms, j1 = render("juno", { model: "106", hpf: 1 }, [36]).rms;
check("Juno-106 HPF 0 boosts", j0 > j1 * 1.05, j1.toFixed(3) + " → " + j0.toFixed(3));
// an ARP patch cord makes a route
check("ARP cords become routes", SC.engine("arp2600", { cords: [{ src: "sh", dst: "vcf", amt: 0.5 }] }).routes.some(r => r.cord && r.dst[0] === "cut"));
// the DAW entry point exists
check("SynthCompare.voice is a function", typeof SC.voice === "function");
// round trips through the canon keep the basics: Juno → OB-Xa → Juno
const jb = SC.EXAMPLES.find(e => e.id === "juno-bass"), back2 = SC.translate(SC.translate(jb.s, "juno", "obxa").state, "obxa", "juno").state, jo = SC.full("juno", jb.s);
const d2 = ["cutoff", "res", "range", "saw"].filter(k => typeof jo[k] === "number" ? Math.abs(jo[k] - back2[k]) > 0.3 : jo[k] !== back2[k]);
check("Juno → OB-Xa → Juno keeps cutoff, resonance, range, saw", d2.length === 0, d2.map(k => k + " " + jo[k] + "→" + back2[k]).join(", "));
// ---- the Prophet-6 and the Moog family ----
for (const id of ["p6", "taurus", "voyager", "sub37", "grandmother", "memorymoog"]) {
  const P = SC.PROFILES[id], keys = ids(id), miss = Object.keys(P.def).filter(k => !keys.has(k)), noDef = [...keys].filter(k => !(k in P.def));
  check(id + ": profile complete (cap, apply, pg, fc, flow; every control has a default)", P.cap && P.apply && P.pg && P.fc && P.flow && P.book && !miss.length && !noDef.length, miss.concat(noDef).join(","));
  check(id + ": has a worked example", SC.EXAMPLES.some(e => e.from === id));
}
// every pair of synths translates (each synth's default patch to every other), cited, no unknown keys
bad = [];
for (const a of IDS) for (const b of IDS) { if (a === b) continue; const r = SC.translate({}, a, b);
  r.notes.forEach(n => { if (!n.cite.length || n.cite.some(c => !c.title)) bad.push(a + "→" + b + " " + n.what); });
  for (const k in r.state) if (!(k in SC.PROFILES[b].def)) bad.push(a + "→" + b + " key " + k); }
check("every pair of the fifteen translates with cited notes", bad.length === 0, bad.slice(0, 4).join("; "));
// Prophet-6 effects are audible: a delay keeps sounding after the note
function tail(id, st, mods) { const p = new P(); p.port.onmessage({ data: { type: "patch", E: SC.engine(id, st, mods) } }); p.port.onmessage({ data: { type: "on", note: 60, vel: .8 } });
  const o = [[new Float32Array(128)]]; let a = 0, t = 0, nan = false;
  for (let b = 0; b < 600; b++) { if (b === 80) p.port.onmessage({ data: { type: "off", note: 60 } }); p.process([], o); for (const x of o[0][0]) { if (!isFinite(x)) nan = true; if (b > 150) t += x * x; else a += x * x; } }
  return { a, t, nan }; }
const dry = tail("p6", { aR: 0, fR: 0 }), wet = tail("p6", { aR: 0, fR: 0, fxOn: true, fxA: "ddl", aP1: 3, aP2: 5, aMix: 8 }), rev = tail("p6", { aR: 0, fR: 0, fxOn: true, fxB: "hal", bP1: 8, bMix: 8 });
check("Prophet-6: delay and reverb are heard after the note ends", !wet.nan && !rev.nan && wet.t > dry.t * 20 + 1e-6 && rev.t > dry.t * 20 + 1e-6, dry.t.toExponential(1) + " / " + wet.t.toExponential(1) + " / " + rev.t.toExponential(1));
bad = []; for (const k of ["bbd", "ddl", "cho", "ph1", "ph2", "hal", "roo", "pla", "spr"]) { const r = tail("p6", { fxOn: true, fxB: k, bMix: 7 }); if (r.nan || r.a < 1e-4) bad.push(k); }
check("Prophet-6: every effect type sounds without NaN", bad.length === 0, bad.join(","));
check("Prophet-6 → Model D: effects are lost", SC.translate(SC.EXAMPLES.find(e => e.id === "p6-pad-fx").s, "p6", "moog").notes.some(n => n.cls === "lost" && /Effect/.test(n.what)));
check("Juno chorus → Prophet-6: the chorus effect (approx)", SC.translate(SC.EXAMPLES.find(e => e.id === "juno-strings").s, "juno", "p6").notes.some(n => n.cls === "approx" && /chorus effect/i.test(n.what)));
check("Sub 37 MultiDrive lost on the Juno", SC.translate(SC.EXAMPLES.find(e => e.id === "sub37-drive").s, "sub37", "juno").notes.some(n => n.cls === "lost" && /MultiDrive/.test(n.what)));
check("Memorymoog → Prophet-5: the third oscillator is lost", SC.translate(SC.EXAMPLES.find(e => e.id === "mm-brass").s, "memorymoog", "prophet").notes.some(n => n.cls === "lost" && /one more/.test(n.what)));
// ---- What if…: changes the sound, never the report ----
bad = [];
for (const id of IDS) for (const w of SC.PROFILES[id].whatif || []) {
  if (!w.cite.length || !w.why) bad.push(id + "." + w.id + " uncited");
  const ex = SC.EXAMPLES.find(e => e.from === id), notes = ex.phrase.slice(0, 3).map(x => x[0]);
  const plain = SC.engine(id, ex.s), mod = SC.engine(id, ex.s, [w.id]);
  if (JSON.stringify(plain) === JSON.stringify(mod)) bad.push(id + "." + w.id + " no engine change");
  // both renders with the same random seed (drift, noise), notes held then released, compared sample by sample
  const wave = E => { let seed = 7; const keep = Math.random; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const p = new P(); p.port.onmessage({ data: { type: "patch", E } }); notes.forEach(n => p.port.onmessage({ data: { type: "on", note: n, vel: .8 } }));
    const o = [[new Float32Array(128)]], out = [];
    for (let b = 0; b < 500; b++) { if (b === 200) notes.forEach(n => p.port.onmessage({ data: { type: "off", note: n } })); p.process([], o); out.push(...o[0][0]); }
    Math.random = keep; return out; };
  const w0 = wave(plain), w1 = wave(mod); let dmax = 0, nan = false;
  for (let i = 0; i < w0.length; i++) { if (!isFinite(w1[i])) nan = true; dmax = Math.max(dmax, Math.abs(w0[i] - w1[i])); }
  if (nan || dmax < 1e-4) bad.push(id + "." + w.id + " sound differs by " + dmax.toExponential(1));
  for (const to of IDS) if (to !== id) { const a1 = SC.translate(ex.s, id, to).notes.map(n => n.cls + n.what).join("|"); if (a1 !== SC.translate(ex.s, id, to).notes.map(n => n.cls + n.what).join("|")) bad.push(id + " unstable"); }
}
check("every what-if is cited and changes the sound (no NaN)", bad.length === 0, bad.slice(0, 4).join("; "));
check("what-if ids exist for the Model D, Prophet-5, Juno, DX7, MS-20, Taurus", ["moog", "prophet", "juno", "dx7", "ms20", "taurus"].every(id => (SC.PROFILES[id].whatif || []).length));
check("the engine without mods is the real instrument (no whatif field)", !("whatif" in SC.engine("moog", {})) && SC.engine("moog", {}, ["poly"]).voices === 6);
const SL = require("../../apps/shared/lessons/synth-library.js");
const pf = { kind: "synth-patch", version: 1, synth: "moog", state: { cutoff: 4 }, song: "x", source: { url: "https://www.youtube.com/watch?v=abc" } };
check("patch files: whatif ids validated", SL.validate(Object.assign({ whatif: ["poly"] }, pf), SC.PROFILES).length === 0 && SL.validate(Object.assign({ whatif: ["nope"] }, pf), SC.PROFILES).length === 1);
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
