// SynthViews: one Model D patch seen as a simplified Vital panel or a simplified Surge XT panel. The sound is always the site's
// Model D engine (SynthCompare.voice(ac, "moog", state)); a view only rewrites the patch in that synth's module order and names.
//   SynthViews.vital / SynthViews.surge = { name, toView(moogState) -> { viewState, report }, toMoog(viewState, moogState) -> moogState, spec }
//   spec is a SynthPanel spec (synth-panel.js header). report = [{ key, label, how: "exact"|"approx"|"lost", note }] as on the compare pages.
//   toMoog(toView(s).viewState, s) gives s back for every key reported "exact" (tests/lessons/synth-views.cdp.js).
// Only what a Model D patch can fill, or be filled from, is shown. No logos or artwork: layout and parameter names only.
// Model D knob laws are synth-compare.js's (M 80): cutoff 10 Hz-20 kHz, attack 1 ms-10 s, decay 4 ms-35 s, LFO 0.05-200 Hz,
// glide 1 ms-10 s, contour amount 0-4 octaves.
// SOURCES (fetched 2026-11-26; also scripts/sources/synth-views.py):
//   V  = Vital source, src/common/synth_parameters.cpp, https://raw.githubusercontent.com/mtytel/vital/main/src/common/synth_parameters.cpp
//        read: osc level 0-1 (quadratic), transpose -48..48 (whole steps), tune -1..1 (x100 = cents), unison voices 1-16,
//        filter cutoff 8-136 semitones (MIDI note), resonance 0-1 (%), drive 0-20 dB, keytrack -1..1 (%), env attack / decay /
//        release 0-2.37842 "secs" quartic, sustain 0-1, LFO frequency -7..9 exponential.
//        Our reading, unverified: quartic = seconds is value^4 (2.37842^4 = 32 s); LFO exponential = 2^value Hz; filter model
//        names ("Analog", "Ladder") and the "Basic Shapes" wavetable (synth_strings.h was not found at that path); no noise
//        oscillator, so the Sample slot (whose default sample we take to be noise) carries Model D noise; the env-2 -> cutoff
//        amount written in semitones of the cutoff's 128-semitone range.
//   S  = Surge XT user manual, https://surge-synthesizer.github.io/manual-xt/  read: Classic oscillator Shape -100..100 %
//        (-100 pulse, 0 saw, 100 dual saw), Width 1 0-100 % (duty), Width 2, Sub Mix 0-100 %, Sync 0-60 semitones, Unison Voices
//        1-16, Unison Detune 0-100 cents; oscillator Pitch & Octave, Keytrack toggle; Mixer Osc 1-3, Ring Modulation 1x2 and 2x3,
//        Noise, M (mute) / S (solo); filter types incl. Legacy Ladder (6/12/18/24 dB) and Vintage Ladder; cutoff tooltip in Hz;
//        FEG mod amount ">F1"; "Keytrack > F1" (100% follows pitch); Filter EG / Amp EG ADSR with Analog / Digital mode;
//        LFO shapes Sine, Triangle, Square, Sawtooth, Noise, S&H ...; scene output Volume, Pan, Width.
//        Not printed there, so unverified: the numeric ranges of cutoff (here semitones from A 440, -65..+67, shown as Hz),
//        envelope times (here log2 seconds, -10..5), LFO rate (log2 Hz), FEG amount (here semitones), portamento (log2 s).
(function () {
  var SP = window.SynthPanel;
  SP.WAVES.dualsaw = "M3 13L8.5 6V13L14 3V13L19.5 6V13L25 3V13";   // Surge Classic shape +100 (two saws), drawn by this page
  var CUT = [10, 20000], ATT = [0.001, 10], DEC = [0.004, 35], LFO = [0.05, 200], GLD = [0.001, 10], AMT = 48;
  var FEET = ["LO", "32'", "16'", "8'", "4'", "2'"], FOOT = { "LO": -7, "32'": -2, "16'": -1, "8'": 0, "4'": 1, "2'": 2 };
  var PW = { square: 50, wide: 32, narrow: 12 };
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function em(k, r) { return r[0] * Math.pow(r[1] / r[0], cl(k, 0, 10) / 10); }
  function ei(v, r) { return cl(10 * Math.log(v / r[0]) / Math.log(r[1] / r[0]), 0, 10); }
  function lg(x) { return Math.log(x) / Math.LN2; }
  function full(s) { var d = window.SynthCompare.PROFILES.moog.def, o = {}, k; for (k in d) o[k] = d[k]; for (k in s || {}) o[k] = s[k]; return o; }
  function footOf(oct) { var best = "8'"; FEET.forEach(function (f) { if (FOOT[f] === Math.round(oct)) best = f; }); return oct < -2 ? (oct <= -4 ? "LO" : "32'") : best; }
  function R(rep, key, label, how, note) { rep.push({ key: key, label: label, how: how, note: note || "" }); }
  function hz(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2) + " kHz" : v.toFixed(v < 100 ? 1 : 0) + " Hz"; }
  function sec(v) { return v < 1 ? (v * 1000).toFixed(v < .01 ? 1 : 0) + " ms" : v.toFixed(2) + " s"; }
  function sl(k, label, min, max, step, fmt, adv) { return { k: k, label: label, kind: "slider", min: min, max: max, step: step, fmt: fmt, adv: adv }; }
  function pct(v) { return Math.round(v) + "%"; }
  var OSC = ["1", "2", "3"];
  function oscOf(m, n) { return { range: m["o" + n + "Range"], freq: n === "1" ? 0 : m["o" + n + "Freq"], wave: m["o" + n + "Wave"], on: m["m" + n + "On"], lvl: m["m" + n] }; }
  // the parts both views share: glide, LFO, the wheel routes, levels, envelopes, keytrack
  function common(m, v, rep, P) {
    R(rep, "vol", "Volume", "exact", P.vol); v.vol = m.vol * 10;
    R(rep, "lA", "Amp attack", "exact"); R(rep, "lD", "Amp decay", "exact"); R(rep, "lS", "Amp sustain", "exact");
    R(rep, "fA", "Filter attack", "exact"); R(rep, "fD", "Filter decay", "exact"); R(rep, "fS", "Filter sustain", "exact");
    R(rep, "decaySw", "Release = decay switch", "approx", "the Model D has no release knob: its Decay switch makes release the decay time, or about 8 ms. Here it is a release time; back on the Model D, a release over 30 ms turns the switch on.");
    R(rep, "kb1", "Keyboard control ⅓", "exact", P.kbd); R(rep, "kb2", "Keyboard control ⅔", "exact", P.kbd);
    R(rep, "lfoRate", "LFO rate", "exact"); R(rep, "lfoSq", "LFO triangle / square", "exact");
    R(rep, "glide", "Glide time", "exact", P.glide); R(rep, "glideOn", "Glide on", "exact", "glide off is a glide time of 0 here; the Model D's knob keeps its place");
    var lfoOnly = m.src2 === "lfo" && m.modMix >= 10;
    R(rep, "oscMod", "Wheel → pitch", lfoOnly ? "exact" : "approx", "the Model D's wheel sends a mix of Osc 3 / filter EG and noise / LFO; this view has only the LFO to pitch, held by the mod wheel" + (lfoOnly ? "" : " (this patch mixes in another source)"));
    R(rep, "filtMod", "Wheel → filter", lfoOnly ? "exact" : "approx", "as above, LFO to cutoff");
    R(rep, "modMix", "Modulation mix", lfoOnly ? "exact" : "lost", "Osc 3 as a modulator, the filter EG as a wheel source and noise as a wheel source have no place in this view");
    if (m.extOn && m.ext > 0) R(rep, "ext", "External input (feedback)", "lost", "the output patched back into the mixer has no place here");
    if (m.nOn && m.nCol === "pink") R(rep, "nCol", "Pink noise", "approx", P.pink);
    v.lfoRate = lg(em(m.lfoRate, LFO)); v.lfoWave = m.lfoSq ? "square" : "tri"; v.lfoPitch = !!m.oscMod; v.lfoCut = !!m.filtMod;
    v.glide = m.glideOn ? lg(em(m.glide, GLD)) : -11;
    v.keytrack = (m.kb1 ? 100 / 3 : 0) + (m.kb2 ? 200 / 3 : 0);
  }
  function commonBack(v, m) {
    m.vol = cl(v.vol / 10, 0, 10);
    m.lfoRate = ei(Math.pow(2, v.lfoRate), LFO); m.lfoSq = v.lfoWave === "square"; m.oscMod = !!v.lfoPitch; m.filtMod = !!v.lfoCut;
    if ((v.lfoPitch || v.lfoCut) && !(m.src2 === "lfo" && m.modMix >= 10)) { m.src2 = "lfo"; m.modMix = 10; }
    if (v.glide <= -10.5) m.glideOn = false; else { m.glideOn = true; m.glide = ei(Math.pow(2, v.glide), GLD); }
    var kt = v.keytrack; m.kb1 = Math.abs(kt - 100 / 3) < 17 || kt > 83; m.kb2 = kt >= 50;
    return m;
  }

  // ======================= Surge XT =======================
  function surgeView(m0) {
    var m = full(m0), v = {}, rep = [];
    OSC.forEach(function (n) { var o = oscOf(m, n), w = o.wave;
      v["o" + n + "Type"] = w === "tri" ? "sine" : "classic";
      v["o" + n + "Shape"] = PW[w] ? -100 : 0; v["o" + n + "Width"] = PW[w] || 50; v["o" + n + "Sub"] = 0; v["o" + n + "Sync"] = 0; v["o" + n + "Uni"] = 1;
      var oct = FOOT[o.range]; v["o" + n + "Oct"] = cl(oct, -3, 3); v["o" + n + "Pitch"] = o.freq + (oct < -3 ? (oct + 3) * 12 : 0);
      v["o" + n + "Kbd"] = n === "3" ? !!m.o3Kbd : true;
      v["m" + n + "Mute"] = !o.on; v["m" + n] = o.lvl * 10;
      var wl = "Osc " + n + " wave";
      if (w === "saw" || PW[w]) R(rep, "o" + n + "Wave", wl, "exact", w === "saw" ? "Classic, Shape 0% = saw" : "Classic, Shape -100% = pulse, Width 1 " + PW[w] + "% (the Model D's wide / narrow duty is the site's guess)");
      else if (w === "tri") R(rep, "o" + n + "Wave", wl, "approx", "Classic has no triangle; the Sine oscillator stands in (both have few harmonics)");
      else R(rep, "o" + n + "Wave", wl, "approx", (w === "rsaw" ? "reverse saw" : "triangle-saw") + " has no Classic shape; saw is nearest");
      R(rep, "o" + n + "Range", "Osc " + n + " range", o.range === "LO" ? "approx" : "exact", o.range === "LO" ? "Octave stops at -3; the rest goes into Pitch, past its ±7 if needed" : "Octave");
      if (n !== "1") R(rep, "o" + n + "Freq", "Osc " + n + " frequency", "exact", "Pitch, in semitones");
      R(rep, "m" + n + "On", "Mixer Osc " + n + " on", "exact", "M (mute) off"); R(rep, "m" + n, "Mixer Osc " + n + " level", "exact");
    });
    R(rep, "o3Kbd", "Osc 3 control (follows keys)", "exact", "the oscillator's Keytrack toggle");
    v.r12 = 0; v.r23 = 0; v.nMute = !m.nOn; v.n = m.n * 10;
    R(rep, "nOn", "Noise on", "exact"); R(rep, "n", "Noise level", "exact");
    v.fType = "vintage"; R(rep, "model", "Filter", "approx", "Vintage Ladder (4-pole low-pass) is a different model of the same kind of filter");
    v.cut = 12 * lg(em(m.cutoff, CUT) / 440); R(rep, "cutoff", "Cutoff", "exact", "shown in Hz; Surge's cutoff range is not printed in the manual (unverified)");
    v.res = m.emph * 10; R(rep, "emph", "Emphasis → Resonance", "approx", "same number, 0-100%; the two filters do not self-oscillate at the same point");
    v.feg = m.amount / 10 * AMT; R(rep, "amount", "Amount of contour → FEG > F1", "exact", "0-4 octaves written as semitones (Surge's units for this unverified)");
    ["f", "a"].forEach(function (e) { var p = e === "f" ? "f" : "l";
      v[e + "A"] = lg(em(m[p + "A"], ATT)); v[e + "D"] = lg(em(m[p + "D"], DEC)); v[e + "S"] = m[p + "S"] * 10;
      v[e + "R"] = lg(m.decaySw ? em(m[p + "D"], DEC) : 0.008); v[e + "Mode"] = "analog"; });
    common(m, v, rep, { vol: "Scene Volume as 0-100% (Surge shows dB; unverified)", kbd: "Keytrack > F1: ⅓ = 33%, ⅔ = 67%, both = 100%",
      glide: "scene Portamento", pink: "Surge's noise colour control was not checked (unverified); white noise is used" });
    return { viewState: v, report: rep };
  }
  function surgeBack(v, m0) {
    var m = full(m0);
    OSC.forEach(function (n) { var t = v["o" + n + "Type"], sh = v["o" + n + "Shape"], wd = v["o" + n + "Width"], w;
      if (t === "sine") w = "tri"; else if (sh <= -50) w = wd > 41 ? "square" : wd > 22 ? "wide" : "narrow"; else w = "saw";
      var keep = m["o" + n + "Wave"]; if (w === "saw" && (keep === "rsaw" || keep === "trisaw")) w = keep;
      if (n === "3" || w !== "rsaw") m["o" + n + "Wave"] = w;
      var oct = v["o" + n + "Oct"], p = v["o" + n + "Pitch"];
      if (oct <= -3 && p <= -12) { m["o" + n + "Range"] = "LO"; p -= (FOOT.LO + 3) * 12; } else m["o" + n + "Range"] = footOf(cl(oct, -2, 2));
      if (n !== "1") m["o" + n + "Freq"] = cl(p, -7, 7);
      m["m" + n + "On"] = !v["m" + n + "Mute"]; m["m" + n] = cl(v["m" + n] / 10, 0, 10); });
    m.o3Kbd = !!v.o3Kbd; m.nOn = !v.nMute; m.n = cl(v.n / 10, 0, 10);
    m.cutoff = ei(440 * Math.pow(2, v.cut / 12), CUT); m.emph = cl(v.res / 10, 0, 10); m.amount = cl(v.feg / AMT * 10, 0, 10);
    ["f", "a"].forEach(function (e) { var p = e === "f" ? "f" : "l";
      m[p + "A"] = ei(Math.pow(2, v[e + "A"]), ATT); m[p + "D"] = ei(Math.pow(2, v[e + "D"]), DEC); m[p + "S"] = cl(v[e + "S"] / 10, 0, 10); });
    m.decaySw = Math.pow(2, v.aR) > 0.03;
    return commonBack(v, m);
  }
  function surgeSpec() {
    var lsec = function (v) { return sec(Math.pow(2, v)); };
    function osc(n, adv) { return { group: "Osc " + n, adv: adv, items: [
      { k: "o" + n + "Type", label: "Type", kind: "waves", opts: [["classic", "saw", "Classic"], ["sine", "sine", "Sine"]] },
      sl("o" + n + "Shape", "Shape", -100, 100, 1, pct), sl("o" + n + "Width", "Width 1", 0, 100, 1, pct),
      sl("o" + n + "Sub", "Sub Mix", 0, 100, 1, pct, true), sl("o" + n + "Sync", "Sync", 0, 60, 0.1, null, true),
      sl("o" + n + "Uni", "Unison Voices", 1, 16, 1, null, true),
      sl("o" + n + "Oct", "Octave", -3, 3, 1), sl("o" + n + "Pitch", "Pitch", -48, 48, 0.01, null, true),
      { k: "o" + n + "Kbd", label: "Keytrack", kind: "toggle", adv: true }] }; }
    function mix(k, label, adv) { return { group: label, adv: adv, items: [{ k: k + "Mute", label: "M", kind: "toggle" }, sl(k, "Level", 0, 100, 1, pct)] }; }
    function eg(e) { return [sl(e + "A", "Attack", -10, 5, 0.01, lsec), sl(e + "D", "Decay", -10, 5.2, 0.01, lsec), sl(e + "S", "Sustain", 0, 100, 1, pct),
      sl(e + "R", "Release", -10, 5.2, 0.01, lsec), { k: e + "Mode", label: "Mode", kind: "choice", opts: [["analog", "Analog"], ["digital", "Digital"]], adv: true }]; }
    return { modules: [
      { id: "osc", name: "Oscillators", pic: "osc", oscs: OSC.map(function (n) { return { on: null, lvl: "m" + n, wave: "o" + n + "Type" }; }), items: [osc("1"), osc("2", true), osc("3", true)] },
      { id: "mix", name: "Mixer", sum: function (s) { return OSC.filter(function (n) { return !s["m" + n + "Mute"] && s["m" + n] > 0; }).length + " osc" + (!s.nMute && s.n > 0 ? " + noise" : ""); }, items: [
        mix("m1", "Osc 1"), mix("m2", "Osc 2", true), mix("m3", "Osc 3", true),
        { group: "Ring 1×2", adv: true, items: [sl("r12", "Level", 0, 100, 1, pct)] }, { group: "Ring 2×3", adv: true, items: [sl("r23", "Level", 0, 100, 1, pct)] },
        mix("n", "Noise", true)] },
      { id: "flt", name: "Filter 1", sum: function (s) { return hz(440 * Math.pow(2, s.cut / 12)) + " · res " + Math.round(s.res) + "%"; }, items: [
        { k: "fType", label: "Type", kind: "choice", opts: [["vintage", "Vintage Ladder"], ["legacy", "Legacy Ladder"]], adv: true },
        sl("cut", "Cutoff", -65, 67, 0.1, function (v) { return hz(440 * Math.pow(2, v / 12)); }), sl("res", "Resonance", 0, 100, 1, pct),
        sl("feg", "FEG > F1", 0, 48, 0.1, function (v) { return v.toFixed(1) + " st"; }), sl("keytrack", "Keytrack > F1", 0, 100, 1, pct, true)] },
      { id: "feg", name: "Filter EG", sum: function (s) { return "A " + lsec(s.fA) + " · D " + lsec(s.fD); }, items: eg("f") },
      { id: "aeg", name: "Amp EG", sum: function (s) { return "A " + lsec(s.aA) + " · D " + lsec(s.aD); }, items: eg("a") },
      { id: "lfo", name: "LFO 1", adv: true, sum: function (s) { return Math.pow(2, s.lfoRate).toFixed(2) + " Hz"; }, items: [
        { k: "lfoWave", label: "Shape", kind: "waves", opts: [["tri", "tri", "Triangle"], ["square", "square", "Square"]] },
        sl("lfoRate", "Rate", -4.4, 7.7, 0.01, function (v) { return Math.pow(2, v).toFixed(2) + " Hz"; }),
        { k: "lfoPitch", label: "Mod wheel → Pitch", kind: "toggle" }, { k: "lfoCut", label: "Mod wheel → Cutoff", kind: "toggle" }] },
      { id: "out", name: "Scene Output", sum: function (s) { return "volume " + Math.round(s.vol) + "%"; }, items: [
        sl("vol", "Volume", 0, 100, 1, pct), sl("glide", "Portamento", -11, 3.4, 0.01, function (v) { return v <= -10.5 ? "off" : sec(Math.pow(2, v)); }, true)] }
    ]};
  }

  // ======================= Vital =======================
  var VW = { tri: "tri", saw: "saw", square: "square", wide: "square", narrow: "square", trisaw: "saw", rsaw: "saw" };
  function q4(sec) { return cl(Math.pow(sec, 0.25), 0, 2.37842); }
  function vitalView(m0) {
    var m = full(m0), v = {}, rep = [];
    OSC.forEach(function (n) { var o = oscOf(m, n), w = o.wave, semis = FOOT[o.range] * 12 + o.freq, tr = cl(Math.round(semis), -48, 48);
      v["o" + n + "Wave"] = VW[w]; v["o" + n + "On"] = !!o.on; v["o" + n + "Lvl"] = o.lvl * 10; v["o" + n + "Tr"] = tr; v["o" + n + "Tune"] = cl((semis - tr) * 100, -100, 100); v["o" + n + "Uni"] = 1;
      R(rep, "o" + n + "Wave", "Osc " + n + " wave", VW[w] === w ? "exact" : "approx", VW[w] === w ? "a frame of the Basic Shapes wavetable (name unverified)" : "Basic Shapes has one square, no pulse widths, reverse saw or triangle-saw; " + VW[w] + " is nearest");
      R(rep, "o" + n + "Range", "Osc " + n + " range", o.range === "LO" ? "approx" : "exact", o.range === "LO" ? "LO is 7 octaves down; Transpose stops at -48" : "Transpose in semitones");
      if (n !== "1") R(rep, "o" + n + "Freq", "Osc " + n + " frequency", o.range === "LO" ? "approx" : "exact", "whole semitones in Transpose, the rest in Tune (cents)");
      R(rep, "m" + n + "On", "Osc " + n + " on", "exact"); R(rep, "m" + n, "Osc " + n + " level", "exact", "Level 0-100%");
    });
    R(rep, "o3Kbd", "Osc 3 control (follows keys)", m.o3Kbd ? "exact" : "lost", "Vital's oscillators always follow the keys in this view; Osc 3 as a fixed-pitch drone or modulator is lost");
    v.smpOn = !!m.nOn; v.smp = m.n * 10; R(rep, "nOn", "Noise on", "approx", "Vital has no noise oscillator: the Sample slot holding a noise sample (unverified)"); R(rep, "n", "Noise level", "exact");
    v.model = "ladder"; R(rep, "model", "Filter", "approx", "the Ladder model is not Moog's circuit");
    var note = 69 + 12 * lg(em(m.cutoff, CUT) / 440); v.cut = cl(note, 8, 136);
    R(rep, "cutoff", "Cutoff", note === v.cut ? "exact" : "approx", "in semitones (MIDI note) as Vital shows it" + (note === v.cut ? "" : "; below Vital's lowest (note 8, about 13 Hz)"));
    v.res = m.emph * 10; R(rep, "emph", "Emphasis → Resonance", "approx", "same number, 0-100%; the filters differ");
    v.drive = 0; R(rep, "drive", "Drive", "approx", "the Model D has no drive knob; its overload came from the mixer levels and feedback");
    v.env2Cut = m.amount / 10 * AMT; R(rep, "amount", "Amount of contour → Env 2 → cutoff", "exact", "a modulation amount in semitones");
    [["e1", "l"], ["e2", "f"]].forEach(function (p) { var e = p[0], k = p[1];
      v[e + "A"] = q4(em(m[k + "A"], ATT)); v[e + "D"] = q4(em(m[k + "D"], DEC)); v[e + "S"] = m[k + "S"] * 10; v[e + "R"] = q4(m.decaySw ? em(m[k + "D"], DEC) : 0.008); });
    R(rep, "fD", "Filter decay", em(m.fD, DEC) > 32 ? "approx" : "exact", "Vital's envelope stops at 32 s"); R(rep, "lD", "Amp decay", em(m.lD, DEC) > 32 ? "approx" : "exact", "Vital's envelope stops at 32 s");
    common(m, v, rep, { vol: "Volume as 0-100%", kbd: "Filter Key Track 0-100%: ⅓, ⅔ or both", glide: "Glide (portamento) time", pink: "pink noise needs a pink-noise sample (unverified)" });
    rep = rep.filter(function (r, i) { return !rep.slice(i + 1).some(function (x) { return x.key === r.key; }); });   // later entries win
    return { viewState: v, report: rep };
  }
  function vitalBack(v, m0) {
    var m = full(m0);
    OSC.forEach(function (n) { var w = v["o" + n + "Wave"], keep = m["o" + n + "Wave"];
      if (VW[keep] !== w) m["o" + n + "Wave"] = (w === "sine" ? "tri" : w === "rsaw" && n !== "3" ? "saw" : w);
      var semis = v["o" + n + "Tr"] + v["o" + n + "Tune"] / 100, f = m["o" + n + "Range"], lim = n === "1" ? 0.001 : 7.001;
      if (f === "LO" && semis > -48) f = null; if (f !== "LO" && (f == null || Math.abs(semis - FOOT[f] * 12) > lim)) f = semis <= -48 ? "LO" : footOf(cl(Math.round(semis / 12), -2, 2));
      m["o" + n + "Range"] = f; if (n !== "1") m["o" + n + "Freq"] = f === "LO" ? m["o" + n + "Freq"] : cl(semis - FOOT[f] * 12, -7, 7);
      m["m" + n + "On"] = !!v["o" + n + "On"]; m["m" + n] = cl(v["o" + n + "Lvl"] / 10, 0, 10); });
    m.nOn = !!v.smpOn; m.n = cl(v.smp / 10, 0, 10);
    m.cutoff = ei(440 * Math.pow(2, (v.cut - 69) / 12), CUT); m.emph = cl(v.res / 10, 0, 10); m.amount = cl(v.env2Cut / AMT * 10, 0, 10);
    [["e1", "l"], ["e2", "f"]].forEach(function (p) { var e = p[0], k = p[1];
      m[k + "A"] = ei(Math.pow(v[e + "A"], 4), ATT); m[k + "D"] = ei(Math.pow(v[e + "D"], 4), DEC); m[k + "S"] = cl(v[e + "S"] / 10, 0, 10); });
    m.decaySw = Math.pow(v.e1R, 4) > 0.03;
    return commonBack(v, m);
  }
  function vitalSpec() {
    var s4 = function (v) { return sec(Math.pow(v, 4)); };
    function osc(n, adv) { return { group: "Osc " + n, adv: adv, items: [
      { k: "o" + n + "On", label: "On", kind: "toggle" },
      { k: "o" + n + "Wave", label: "Basic Shapes", kind: "waves", opts: [["sine", "sine", "Sine"], ["tri", "tri", "Triangle"], ["square", "square", "Square"], ["saw", "saw", "Saw"]] },
      sl("o" + n + "Lvl", "Level", 0, 100, 1, pct), sl("o" + n + "Tr", "Transpose", -48, 48, 1), sl("o" + n + "Tune", "Tune", -100, 100, 1, function (v) { return Math.round(v) + " c"; }, true),
      sl("o" + n + "Uni", "Unison", 1, 16, 1, function (v) { return v + "v"; }, true)] }; }
    function env(e) { return [sl(e + "A", "Attack", 0, 2.37842, 0.001, s4), sl(e + "D", "Decay", 0, 2.37842, 0.001, s4), sl(e + "S", "Sustain", 0, 100, 1, pct), sl(e + "R", "Release", 0, 2.37842, 0.001, s4)]; }
    return { modules: [
      { id: "osc", name: "Oscillators", pic: "osc", oscs: OSC.map(function (n) { return { on: "o" + n + "On", lvl: "o" + n + "Lvl", wave: "o" + n + "Wave" }; }), items: [
        osc("1"), osc("2", true), osc("3", true), { group: "Sample", adv: true, items: [{ k: "smpOn", label: "On", kind: "toggle" }, sl("smp", "Level", 0, 100, 1, pct)] }] },
      { id: "flt", name: "Filter 1", sum: function (s) { return "note " + s.cut.toFixed(1) + " · res " + Math.round(s.res) + "%"; }, items: [
        { k: "model", label: "Model", kind: "choice", opts: [["analog", "Analog"], ["ladder", "Ladder"]], adv: true },
        sl("cut", "Cutoff", 8, 136, 0.1, function (v) { return v.toFixed(1) + " st"; }), sl("res", "Resonance", 0, 100, 1, pct), sl("drive", "Drive", 0, 20, 0.1, function (v) { return v.toFixed(1) + " dB"; }, true),
        sl("keytrack", "Key Track", 0, 100, 1, pct, true)] },
      { id: "env1", name: "Env 1 (amp)", sum: function (s) { return "A " + s4(s.e1A) + " · D " + s4(s.e1D); }, items: env("e1") },
      { id: "env2", name: "Env 2 → cutoff", sum: function (s) { return "+" + s.env2Cut.toFixed(1) + " st"; }, items: env("e2").concat([sl("env2Cut", "Amount → Cutoff", 0, 48, 0.1, function (v) { return v.toFixed(1) + " st"; })]) },
      { id: "lfo", name: "LFO 1", adv: true, sum: function (s) { return Math.pow(2, s.lfoRate).toFixed(2) + " Hz"; }, items: [
        { k: "lfoWave", label: "Shape", kind: "waves", opts: [["tri", "tri", "Triangle"], ["square", "square", "Square"]] },
        sl("lfoRate", "Frequency", -4.4, 7.7, 0.01, function (v) { return Math.pow(2, v).toFixed(2) + " Hz"; }),
        { k: "lfoPitch", label: "Mod wheel → Pitch", kind: "toggle" }, { k: "lfoCut", label: "Mod wheel → Cutoff", kind: "toggle" }] },
      { id: "out", name: "Voice & Volume", sum: function (s) { return "volume " + Math.round(s.vol) + "%"; }, items: [
        sl("vol", "Volume", 0, 100, 1, pct), sl("glide", "Glide", -11, 3.4, 0.01, function (v) { return v <= -10.5 ? "off" : sec(Math.pow(2, v)); }, true)] }
    ]};
  }
  window.SynthViews = {
    surge: { name: "Surge XT", toView: surgeView, toMoog: surgeBack, spec: surgeSpec() },
    vital: { name: "Vital", toView: vitalView, toMoog: vitalBack, spec: vitalSpec() }
  };
})();
