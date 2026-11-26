// synth-compare.js — seventeen synths on one page that turn into each other (lessons/synth-compare.qmd): the nine below, plus the
// Prophet-6 (two digital effect slots, continuous oscillator shape, HP + LP) and five Moogs (Taurus, Voyager, Sub 37, Grandmother,
// Memorymoog) sharing one ladder model (their filter differences are not measured); sources for those in the "SIX MORE" block;
// and two free software synths as beginner panels, Vital (wavetable oscillators on the engine's fifth, basic-shapes table) and
// Surge XT (Classic oscillators with sub, ring 1x2): sources and what is unverified in the "TWO FREE SOFTWARE SYNTHS" block.
// cap.panel (Vital, Surge XT) is added to every "lost" note on that target: the real plug-in may have what the beginner panel lacks.
// PROFILES[id].hint(key, value) (Vital, Surge XT) gives the real plug-in's reading of a value, for copying a patch across.
// "What if…" (PROFILES[id].whatif: {id, label, why, cite, eng(E)}): features an instrument lacks, applied by SC.engine(id, state,
// mods) to the SOUND only; translate() and its report never see them, and the panel gets a dashed outline and a badge.
// Widget: W.mods[id], W.setMod(id, mid, on), W.setMods(id, [ids]), W.whatif(id) -> [ids] (synth-library.js saves them as `whatif`).
// <div class="scmp"></div> becomes: a "From" and a "To" picker over nine panels drawn after (not copied from) the Minimoog Model D,
// Prophet-5, TB-303, Juno-60 (Juno-106 switch), ARP 2600, OB-Xa (+ SEM filter modes), MS-20, DX7 and PPG Wave; each editable, each
// with its own sound (one AudioWorklet engine, one engine patch per synth), a translator that turns a patch on one into the nearest
// patch on the other and says, setting by setting, what is the same ("exact"), close ("approx") or impossible ("lost") and why, with
// the manual pages of both. Under each panel: a signal-flow diagram (routes lit, lost ones red; the DX7 draws its algorithm), the
// filter curves of both (12 / 24 dB, low / band / high-pass / notch, high-pass stages), the mixer's drive curve, both envelopes, a
// scope and a spectrum.
//
// SOURCES (copies in ~/Documents/Manuals/synths and .../synths/new, text beside each PDF, OCR'd where the PDF is a scan; page numbers
// are the manuals' printed pages unless "PDF"):
//   M  = Moog Music, *Minimoog Model D* owner's manual (the 2016 reissue). PDF page = printed page.
//   P  = Sequential, *Prophet-5 User's Guide* v1.0, Oct 2020 (Rev 4). PDF page = printed page + 11.
//   T  = Sequential Circuits, *Prophet-5 Technical Manual* TM1000D.2, 1981 (Rev 3.0-3.2).
//   R3 = Roland, *TB-303 Owner's Manual* (Dec. 1981): tone controls p. 34, specifications p. 89 (two waveforms, accent and slide stored
//        per step, tuning). It gives no filter slope and no knob ranges: the 24 dB, not self-oscillating, low-pass is Wikipedia's.
//   J6 = Roland, *Juno-60 Owner's Manual* (Apr. 1983; printed = PDF - 2): 6 voices, 56 patches p. 2; DCO without portamento, PWM,
//        sub, noise pp. 12-13; HPF, VCF, polarity, key follow p. 14; VCA, ENV p. 16; LFO with delay p. 17; chorus I / II p. 22;
//        specifications p. 32 (A 1 ms-3 s, D and R 2 ms-12 s, LFO 0.3-20 Hz, delay 0-2 s).
//   J1 = Roland, *Juno-106 Owner's Manual*: 128 patches, portamento, MIDI p. 1; HPF 0 boosts the bass p. 18; portamento p. 23;
//        chorus I and II "not possible ... at the same time" p. 29.
//   A2 = Korg, *ARP 2600 M Owner's Manual* (2021): every normalled connection, VCO / VCF / ADSR / AR / VCA / mixer / noise / S&H
//        pp. 5-15 (S&H clock 0.2-24 Hz, VCF 10 Hz-10 kHz, VCF type I early / II late models).
//   A0 = ARP Instruments, *ARP 2600 Owner's Manual* (1971): the VCF "falls off at 24Db per octave", section 4.12.
//   OX = Oberheim, *OB-Xa Operation Manual* (printed = PDF - 5): unison low-note rule p. 8, LFO 0.1-20 Hz sine / square / S&H and its
//        routing p. 9, oscillators (1 in octaves over 4, 2 in half steps over 5), sync, F-ENV to osc 2 (one octave at most) p. 10,
//        filter 2-pole 12 dB / 4-pole 24 dB, osc 2 HALF ~5 dB down, track p. 11, envelopes p. 12, 8 voices, split / double p. 13.
//   K2 = Korg, *MS-20 Owner's Manual* (1978; printed = PDF - 6): VCOs, waveforms, ring modulator, HPF and LPF with peak to
//        self-oscillation p. 5; EG 1 (delay, attack, release), EG 2 (hold, ADSR), MG with variable shape, patch panel pp. 6-7.
//        Slopes not printed (12 dB here: unverified).
//   DX = Yamaha, *DX7 Operation Manual* (printed = PDF - 5): 16-note polyphony, 32 memories (PDF p. 4); operators, carriers and
//        modulators p. 23; 32 algorithms and the carrier counts of 1, 5, 16, 32 p. 24; feedback in every algorithm p. 25; envelopes
//        of 4 rates and 4 levels p. 26 (L3 = sustain p. 62); the first exercise (algorithm 1, op 2 at 99 on op 1, "no filters
//        involved") pp. 34-35; ratios 0.50-31.00 p. 35; LFO waves p. 62. The algorithm table itself: Raph Levien's Music Synthesizer
//        for Android (Apache 2.0), checked against p. 24's counts by the test, not diagram by diagram.
//   PG = PPG, *Wave 2.3 Service Manual* (PDF p. 5): 8 voices, SSM 2044 filters, panel pots read 0-63. No owner's manual found:
//        30 wavetables of 64 waves from Sound On Sound's Wave 2.3 review; 2 oscillators a voice, 24 dB from Wikipedia. The panel
//        layout here is this page's and the four wavetables are this page's own (not the PPG's ROM).
//   WP = Wikipedia ("Roland TB-303", "Roland Juno-60", "Korg MS-20", "Oberheim Polyphonic Synthesizer" for the SEM's LP / BP / HP /
//        notch, "PPG Wave"); SOS = Sound On Sound, "PPG Wave 2.3 & Waveterm B" review.
// Model D / Prophet-5 facts as before: Model D three oscillators, six waves each (M 17-19), RANGE LO + five octaves (M 17), mixer of 3
// oscs + noise + external input, the output normalled back into the external input so the mixer overloads (M 27, 36), ladder 24 dB
// (M 29, 80), key tracking 1/3 + 2/3 (M 30), contours ADS with the DECAY switch (M 23, 30-31), LFO 0.05-200 Hz (M 80), glide, wheel
// +-7 (M 24, 80), low-note priority (M 47); Prophet-5 two oscillators a voice (P 17-18), sync (P 18), filters Rev 1/2 SSI 2140 and
// Rev 3 CEM 3320 (P 22-24), ADSR with velocity (P 26-30), LFO 0.022-500 Hz (P 31-32), Poly Mod (P 34-35), unison, chord memory (P 40-41).
// NOT IN THE MANUALS (this page's choices, marked so on the page): every knob-to-Hz / seconds / octaves curve, modulation depths,
// unison detune, filter voicings (one nonlinear 4-pole model with several voicings, a state-variable 2-pole, a "hot" MS-20 variant:
// none are circuit models), the Juno's chorus rates and depths and HPF frequencies, the DX7's rate-to-time and level-to-amplitude
// curves, the PPG's tables. Nobody has compared the sounds with the real instruments.
//
// API: SynthCompare.mount(host) -> widget (load(exampleId), set(id, key, v), translate(fromId), pick(fromId, toId), st, phrase(ids),
// stop(), analyser(id)); SynthCompare.translate(state, from, to) -> { state, notes: [{cls, what, why, cite: [{book, title, page}],
// ctl: {from: [ids], to: [ids]}}] } (Model D <-> Prophet-5 by their hand-written translator, every other pair through
// SynthCompare.toCanon(id, state) and the target's cap / apply); SynthCompare.engine(id, state) -> the flat engine patch (= the
// canonical description); SynthCompare.voice(ctx, id, state) -> Promise of { node, noteOn(n, vel, when), noteOff(n, when), set(state) }
// on any AudioContext; SynthCompare.EXAMPLES ({id, from, name, src, phrase, bpm, wheel, say, s}); SynthCompare.PROFILES; SynthCompare.IDS;
// SynthCompare.DX_ALG. Works under node (no DOM at load) for tests/lessons/synth-compare.test.js.
(function (global) {
  "use strict";
  var SC = {};

  // ---------- curves (end points from the manuals where they give them; shapes between are this page's) ----------
  function expMap(k, lo, hi) { return lo * Math.pow(hi / lo, Math.max(0, Math.min(10, k)) / 10); }
  function expInv(v, lo, hi) { return 10 * Math.log(Math.max(lo, Math.min(hi, v)) / lo) / Math.log(hi / lo); }
  var CUT = [10, 20000];                 // M 80 (Model D); the Prophet's range is not printed, the same is used
  var M_ATT = [0.001, 10], M_DEC = [0.004, 35];  // M 80
  var P_ATT = [0.001, 10], P_DEC = [0.004, 30];  // not printed: this page's
  var M_LFO = [0.05, 200], P_LFO = [0.022, 500]; // M 80, P 32
  var GLIDE = [0.001, 10];               // M 80 per octave; the Prophet's is not printed
  var M_AMT_OCT = 4, P_AMT_OCT = 6;      // M 80 (0-4 octaves); the Prophet's is not printed
  var FEET = ["LO", "32'", "16'", "8'", "4'", "2'"], FOOT_OCT = { "LO": -7, "32'": -2, "16'": -1, "8'": 0, "4'": 1, "2'": 2 };
  var M_WAVES12 = ["tri", "trisaw", "saw", "square", "wide", "narrow"], M_WAVES3 = ["tri", "rsaw", "saw", "square", "wide", "narrow"];
  var M_WAVE_NAME = { tri: "Triangle", trisaw: "Triangle-sawtooth", rsaw: "Reverse sawtooth", saw: "Sawtooth", square: "Square", wide: "Wide rectangle", narrow: "Narrow rectangle" };
  var M_PW = { square: 0.5, wide: 0.32, narrow: 0.12 };   // the duty of "wide" and "narrow" is not printed: this page's
  function pPw(k) { return 0.5 - Math.abs(k - 5) / 5 * 0.46; }  // P 18: square at the centre, very narrow at either end
  function pPwInv(d) { return 5 - (0.5 - d) / 0.46 * 5; }

  // ---------- the two panels ----------
  // control: [id, label, kind, a, b, c]  kind: k = knob (min max step), s = switch, sel = select (options)
  var PROFILES = {
    moog: {
      id: "moog", name: "Model D", long: "after the Minimoog Model D (1970; reissue 2016)", voices: 1,
      groups: [
        ["Controllers", "ctl", [["glide", "Glide", "k", 0, 10, .1], ["modMix", "Modulation mix", "k", 0, 10, .1],
          ["src1", "Osc 3 / Filter EG", "sel", ["osc3", "fenv"]], ["src2", "Noise / LFO", "sel", ["noise", "lfo"]],
          ["lfoRate", "LFO rate", "k", 0, 10, .1], ["lfoSq", "LFO square", "s"]]],
        ["Oscillator bank", "osc", [["oscMod", "Osc. modulation", "s", "orange"],
          ["o1Range", "Osc 1 range", "sel", FEET], ["o1Wave", "Osc 1 wave", "sel", M_WAVES12],
          ["o2Range", "Osc 2 range", "sel", FEET], ["o2Freq", "Osc 2 frequency", "k", -7, 7, .01], ["o2Wave", "Osc 2 wave", "sel", M_WAVES12],
          ["o3Range", "Osc 3 range", "sel", FEET], ["o3Freq", "Osc 3 frequency", "k", -7, 7, .01], ["o3Wave", "Osc 3 wave", "sel", M_WAVES3],
          ["o3Kbd", "Osc 3 control", "s", "orange"]]],
        ["Mixer", "mix", [["m1On", "Osc 1", "s", "blue"], ["m1", "Osc 1 vol", "k", 0, 10, .1],
          ["m2On", "Osc 2", "s", "blue"], ["m2", "Osc 2 vol", "k", 0, 10, .1],
          ["m3On", "Osc 3", "s", "blue"], ["m3", "Osc 3 vol", "k", 0, 10, .1],
          ["extOn", "External input", "s", "blue"], ["ext", "Ext. input vol", "k", 0, 10, .1],
          ["nOn", "Noise", "s", "blue"], ["n", "Noise vol", "k", 0, 10, .1], ["nCol", "Noise colour", "sel", ["white", "pink"]]]],
        ["Modifiers", "mod", [["filtMod", "Filter modulation", "s", "orange"], ["kb1", "Keyboard control 1", "s", "orange"], ["kb2", "Keyboard control 2", "s", "orange"],
          ["cutoff", "Cutoff", "k", 0, 10, .1], ["emph", "Emphasis", "k", 0, 10, .1], ["amount", "Amount of contour", "k", 0, 10, .1],
          ["fA", "Filter attack", "k", 0, 10, .1], ["fD", "Filter decay", "k", 0, 10, .1], ["fS", "Filter sustain", "k", 0, 10, .1],
          ["lA", "Loudness attack", "k", 0, 10, .1], ["lD", "Loudness decay", "k", 0, 10, .1], ["lS", "Loudness sustain", "k", 0, 10, .1]]],
        ["Output and left hand", "out", [["vol", "Main volume", "k", 0, 10, .1], ["glideOn", "Glide", "s", "white"], ["decaySw", "Decay", "s", "white"]]]
      ],
      def: { glide: 3, modMix: 0, src1: "osc3", src2: "noise", lfoRate: 5, lfoSq: false, oscMod: false,
        o1Range: "8'", o1Wave: "saw", o2Range: "8'", o2Freq: 0, o2Wave: "saw", o3Range: "8'", o3Freq: 0, o3Wave: "saw", o3Kbd: true,
        m1On: true, m1: 8, m2On: false, m2: 0, m3On: false, m3: 0, extOn: false, ext: 0, nOn: false, n: 0, nCol: "white",
        filtMod: false, kb1: false, kb2: false, cutoff: 5, emph: 0, amount: 5, fA: 0, fD: 4, fS: 5, lA: 0, lD: 4, lS: 10,
        vol: 6, glideOn: false, decaySw: false }
    },
    prophet: {
      id: "prophet", name: "Prophet-5", long: "after the Sequential Prophet-5 (1978; Rev 4 2020)", voices: 5,
      groups: [
        ["Poly Mod", "pm", [["pmFenv", "Filter env amount", "k", 0, 10, .1], ["pmOscB", "Osc B amount", "k", 0, 10, .1],
          ["pmFA", "→ Freq A", "s"], ["pmPA", "→ PW A", "s"], ["pmF", "→ Filter", "s"]]],
        ["LFO and wheel-mod", "lfo", [["lfoFreq", "LFO frequency", "k", 0, 10, .1], ["lfoInit", "Initial amount", "k", 0, 10, .1],
          ["lfoSaw", "Saw", "s"], ["lfoTri", "Triangle", "s"], ["lfoSq", "Square", "s"], ["wmMix", "Source mix LFO ↔ noise", "k", 0, 10, .1],
          ["wmFA", "→ Freq A", "s"], ["wmFB", "→ Freq B", "s"], ["wmPA", "→ PW A", "s"], ["wmPB", "→ PW B", "s"], ["wmF", "→ Filter", "s"]]],
        ["Oscillator A", "oa", [["aFreq", "Frequency", "k", 0, 48, 1], ["aSaw", "Saw", "s"], ["aPulse", "Pulse", "s"], ["aPw", "Pulse width", "k", 0, 10, .1], ["aSync", "Sync", "s"]]],
        ["Oscillator B", "ob", [["bFreq", "Frequency", "k", 0, 48, 1], ["bFine", "Fine", "k", 0, 10, .1], ["bSaw", "Saw", "s"], ["bTri", "Triangle", "s"],
          ["bPulse", "Pulse", "s"], ["bPw", "Pulse width", "k", 0, 10, .1], ["bLo", "Lo freq", "s"], ["bKbd", "Keyboard", "s"]]],
        ["Mixer", "mix", [["mA", "Osc A", "k", 0, 10, .1], ["mB", "Osc B", "k", 0, 10, .1], ["mN", "Noise", "k", 0, 10, .1]]],
        ["Filter", "flt", [["rev", "Rev", "sel", ["1/2", "3"]], ["cutoff", "Cutoff", "k", 0, 10, .1], ["res", "Resonance", "k", 0, 10, .1],
          ["envAmt", "Env amount", "k", 0, 10, .1], ["kbd", "Keyboard", "sel", ["off", "half", "full"]]]],
        ["Envelopes", "env", [["fA", "Filter attack", "k", 0, 10, .1], ["fD", "Filter decay", "k", 0, 10, .1], ["fS", "Filter sustain", "k", 0, 10, .1], ["fR", "Filter release", "k", 0, 10, .1],
          ["velF", "Velocity → filter", "s"], ["aA", "Amp attack", "k", 0, 10, .1], ["aD", "Amp decay", "k", 0, 10, .1], ["aS", "Amp sustain", "k", 0, 10, .1], ["aR", "Amp release", "k", 0, 10, .1], ["velA", "Velocity → amp", "s"]]],
        ["Performance", "perf", [["glide", "Glide rate", "k", 0, 10, .1], ["uni", "Unison", "s"], ["uniN", "Unison voices", "k", 1, 5, 1], ["uniDet", "Unison detune", "k", 0, 8, 1],
          ["rel", "Release", "s"], ["vintage", "Vintage", "k", 1, 4, 1], ["bend", "Pitch wheel range", "k", 1, 12, 1], ["vol", "Volume", "k", 0, 10, .1]]]
      ],
      // the Basic Program as the guide describes it (A saw at 10, B at 0 with no shape, rev 3: P 19, 23, 47); the rest this page's
      def: { pmFenv: 0, pmOscB: 0, pmFA: false, pmPA: false, pmF: false, lfoFreq: 5, lfoInit: 0, lfoSaw: false, lfoTri: true, lfoSq: false, wmMix: 0,
        wmFA: false, wmFB: false, wmPA: false, wmPB: false, wmF: false, aFreq: 24, aSaw: true, aPulse: false, aPw: 5, aSync: false,
        bFreq: 24, bFine: 0, bSaw: false, bTri: false, bPulse: false, bPw: 5, bLo: false, bKbd: true, mA: 10, mB: 0, mN: 0,
        rev: "3", cutoff: 10, res: 0, envAmt: 0, kbd: "off", fA: 0, fD: 5, fS: 10, fR: 3, velF: false, aA: 0, aD: 5, aS: 10, aR: 3, velA: false,
        glide: 0, uni: false, uniN: 1, uniDet: 0, rel: true, vintage: 4, bend: 1, vol: 6 }
    }
  };
  function cl(x) { return Array.isArray(x) || (x && typeof x === "object") ? JSON.parse(JSON.stringify(x)) : x; }
  function full(id, s) { var o = {}, d = PROFILES[id].def, k; for (k in d) o[k] = cl(d[k]); for (k in s || {}) o[k] = cl(s[k]); return o; }

  // ---------- panel state -> flat engine patch ----------
  function oscEmpty() { return { on: false, lvl: 0, waves: {}, pw: 0.5, oct: 0, semis: 0, kbd: true }; }
  function engMoog(s) {
    s = full("moog", s);
    var o = [oscEmpty(), oscEmpty(), oscEmpty()];
    [[s.o1Range, 0, s.o1Wave, s.m1On, s.m1, true], [s.o2Range, s.o2Freq, s.o2Wave, s.m2On, s.m2, true], [s.o3Range, s.o3Freq, s.o3Wave, s.m3On, s.m3, s.o3Kbd]].forEach(function (a, i) {
      var w = {}; w[a[2] === "square" || a[2] === "wide" || a[2] === "narrow" ? "pulse" : a[2]] = 1;
      o[i] = { on: !!a[3], lvl: a[3] ? a[4] / 10 : 0, waves: w, pw: M_PW[a[2]] || 0.5, oct: FOOT_OCT[a[0]], semis: a[1], kbd: !!a[5] };
    });
    var w = s.modMix / 10, src = [[s.src1, 1 - w], [s.src2 === "noise" ? "noiseMod" : "lfo", w]], routes = [];
    if (s.oscMod) routes.push({ id: "oscMod", src: src, dst: ["p0", "p1"], amt: 7, gain: "wheel" });       // depth: this page's
    if (s.filtMod) routes.push({ id: "filtMod", src: src, dst: ["cut"], amt: 3, gain: "wheel" });
    return { synth: "moog", voices: 1, unison: 1, uniDet: 0, prio: "low", legato: true, osc: o, sync: false,
      noise: { lvl: s.nOn ? s.n / 10 : 0, pink: s.nCol === "pink" }, modNoise: s.nCol === "pink" ? "red" : "pink",
      fb: s.extOn ? s.ext / 10 * s.vol / 10 : 0, model: "ladder",
      cut: expMap(s.cutoff, CUT[0], CUT[1]), res: s.emph / 10, env: s.amount / 10 * M_AMT_OCT, kbd: (s.kb1 ? 1 / 3 : 0) + (s.kb2 ? 2 / 3 : 0), velF: 0,
      fenv: { a: expMap(s.fA, M_ATT[0], M_ATT[1]), d: expMap(s.fD, M_DEC[0], M_DEC[1]), s: s.fS / 10, r: s.decaySw ? expMap(s.fD, M_DEC[0], M_DEC[1]) : 0.008, lin: false },
      aenv: { a: expMap(s.lA, M_ATT[0], M_ATT[1]), d: expMap(s.lD, M_DEC[0], M_DEC[1]), s: s.lS / 10, r: s.decaySw ? expMap(s.lD, M_DEC[0], M_DEC[1]) : 0.008, lin: false, vel: 0 },
      lfo: { hz: expMap(s.lfoRate, M_LFO[0], M_LFO[1]), tri: s.lfoSq ? 0 : 1, sq: s.lfoSq ? 1 : 0, saw: 0, uni: false },
      routes: routes, glide: s.glideOn ? expMap(s.glide, GLIDE[0], GLIDE[1]) : 0, bend: 7, drift: 4.3, vol: s.vol / 10 };
  }
  function engProphet(s) {
    s = full("prophet", s);
    var a = { on: s.mA > 0, lvl: s.mA / 10, waves: {}, pw: pPw(s.aPw), oct: (s.aFreq - 24) / 12, semis: 0, kbd: true };
    if (s.aSaw) a.waves.saw = 1; if (s.aPulse) a.waves.pulse = 1;
    var b = { on: s.mB > 0, lvl: s.mB / 10, waves: {}, pw: pPw(s.bPw), oct: (s.bFreq - 24) / 12 + (s.bLo ? -7 : 0), semis: s.bFine / 10 * 0.95, kbd: !!s.bKbd };
    if (s.bSaw) b.waves.saw = 1; if (s.bTri) b.waves.tri = 1; if (s.bPulse) b.waves.pulse = 1;
    var routes = [], dst = [], wm = s.wmMix / 10;
    if (s.wmFA) dst.push("p0"); if (s.wmFB) dst.push("p1");
    if (dst.length) routes.push({ id: "wmPitch", src: [["lfo", 1 - wm], ["noise", wm]], dst: dst, amt: 12, gain: "init", init: s.lfoInit / 10, curve: "sq" });
    dst = []; if (s.wmPA) dst.push("pw0"); if (s.wmPB) dst.push("pw1");
    if (dst.length) routes.push({ id: "wmPw", src: [["lfo", 1 - wm], ["noise", wm]], dst: dst, amt: 0.44, gain: "init", init: s.lfoInit / 10 });
    if (s.wmF) routes.push({ id: "wmF", src: [["lfo", 1 - wm], ["noise", wm]], dst: ["cut"], amt: 5, gain: "init", init: s.lfoInit / 10, curve: "sq" });
    [["fenv", s.pmFenv], ["osc1", s.pmOscB]].forEach(function (p) {
      if (!p[1]) return;
      if (s.pmFA) routes.push({ id: "pm-" + p[0] + "-fa", src: [[p[0], 1]], dst: ["p0"], amt: p[1] / 10 * 48, gain: "fixed" });
      if (s.pmPA) routes.push({ id: "pm-" + p[0] + "-pa", src: [[p[0], 1]], dst: ["pw0"], amt: p[1] / 10 * 0.45, gain: "fixed" });
      if (s.pmF) routes.push({ id: "pm-" + p[0] + "-f", src: [[p[0], 1]], dst: ["cut"], amt: p[1] / 10 * 6, gain: "fixed" });
    });
    var lin = s.rev === "1/2", fast = 0.008;
    return { synth: "prophet", voices: s.uni ? 1 : 5, unison: s.uni ? s.uniN : 1, uniDet: s.uniDet * 3, prio: s.uni ? "low" : "last", legato: !!s.uni,
      osc: [a, b, oscEmpty()], sync: !!s.aSync, noise: { lvl: s.mN / 10, pink: false }, modNoise: "white", fb: 0,
      model: lin ? "ssi" : "cem", cut: expMap(s.cutoff, CUT[0], CUT[1]), res: s.res / 10, env: s.envAmt / 10 * P_AMT_OCT,
      kbd: { off: 0, half: 0.5, full: 1 }[s.kbd], velF: s.velF ? 2 : 0,
      fenv: { a: expMap(s.fA, P_ATT[0], P_ATT[1]), d: expMap(s.fD, P_DEC[0], P_DEC[1]), s: s.fS / 10, r: s.rel ? expMap(s.fR, P_DEC[0], P_DEC[1]) : fast, lin: lin },
      aenv: { a: expMap(s.aA, P_ATT[0], P_ATT[1]), d: expMap(s.aD, P_DEC[0], P_DEC[1]), s: s.aS / 10, r: s.rel ? expMap(s.aR, P_DEC[0], P_DEC[1]) : fast, lin: lin, vel: s.velA ? 1 : 0 },
      lfo: { hz: expMap(s.lfoFreq, P_LFO[0], P_LFO[1]), tri: s.lfoTri ? 1 : 0, sq: s.lfoSq ? 1 : 0, saw: s.lfoSaw ? 1 : 0, uni: true },
      routes: routes, glide: s.glide > 0 ? expMap(s.glide, GLIDE[0], GLIDE[1]) : 0, bend: s.bend, drift: (4 - s.vintage) * 3 + 0.3, vol: s.vol / 10 };
  }

  // ---------- the translator ----------
  var C = { M: "Model D manual", P: "Prophet-5 User's Guide", T: "Prophet-5 Technical Manual" };
  function cite(b, p) { return { book: b, title: C[b], page: p }; }
  function note(list, cls, what, why, cites, from, to) { list.push({ cls: cls, what: what, why: why, cite: cites || [], ctl: { from: from || [], to: to || [] } }); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function audible(s, i) { return s["m" + i + "On"] && s["m" + i] > 0; }

  function moog2prophet(m) {
    m = full("moog", m);
    var p = full("prophet", {}), N = [], E = engMoog(m);
    p.mA = 0; p.mB = 0; p.aSaw = false;
    // voices
    p.uni = true; p.uniN = 1;
    note(N, "exact", "One voice", "The Model D plays one note at a time (M 15). The Prophet-5's Unison with one voice stacked does the same (P 40); turn Unison off and it plays five-note chords.", [cite("M", 15), cite("P", 40)], [], ["uni", "uniN"]);
    // oscillators 1 and 2 -> A and B
    function semisOf(range, freq) { return FOOT_OCT[range] * 12 + (freq || 0); }
    function waveTo(side, wave, lvlKey, isA) {
      var pre = isA ? "a" : "b";
      if (wave === "saw") { p[pre + "Saw"] = true; return ["exact", "Sawtooth on both."]; }
      if (wave === "rsaw") { p[pre + "Saw"] = true; return ["approx", "A reverse sawtooth sounds like a sawtooth (M 18); the Prophet has only the rising one."]; }
      if (wave === "square") { p[pre + "Pulse"] = true; p[pre + "Pw"] = 5; return ["exact", "A square is the pulse wave with its width at the centre (P 18)."]; }
      if (wave === "wide" || wave === "narrow") { p[pre + "Pulse"] = true; p[pre + "Pw"] = r1(pPwInv(M_PW[wave])); return ["approx", "The Model D has two fixed rectangle widths (M 18-19); the Prophet's pulse width knob can be set near either, but the manual does not give the Model D's exact widths."]; }
      if (wave === "tri") {
        if (isA) { p.aSaw = true; return ["approx", "Oscillator A has no triangle (P 47: \"Oscillator B only\"), so a sawtooth stands in; move this sound to oscillator B, or close the filter, for the soft tone."]; }
        p.bTri = true; return ["exact", "Triangle on both."];
      }
      if (wave === "trisaw") {
        if (isA) { p.aSaw = true; return ["approx", "The triangle-sawtooth hybrid (M 18) has no match on oscillator A, which has no triangle; sawtooth is the nearest."]; }
        p.bTri = true; p.bSaw = true; return ["approx", "Oscillator B can sound its triangle and sawtooth together (P 18), close to the Model D's hybrid of the two (M 18); the exact mixture is not documented."];
      }
    }
    var used = [];
    [[1, "a", "o1"], [2, "b", "o2"]].forEach(function (x) {
      var i = x[0], pre = x[1], o = x[2];
      if (!audible(m, i) && !(i === 2 && m.oscMod && m.src1 === "osc3")) return;
      var st = semisOf(m[o + "Range"], i === 1 ? 0 : m[o + "Freq"]), whole = Math.floor(st + 1e-6), frac = st - whole;
      if (m[o + "Range"] === "LO") { note(N, "approx", "Oscillator " + i + " in LO range", "Its LO range turns it into a slow sweep (M 17). Only oscillator B has a lo freq switch (P 19).", [cite("M", 17), cite("P", 19)], [o + "Range"], [pre + "Freq"]); }
      var v = 24 + whole;
      if (frac > 0.02 && pre === "a") { note(N, "approx", "Oscillator 1's tuning", "Oscillator A has no fine knob (only B does, P 18); it keeps the nearest semitone.", [cite("P", 18)], [o + "Range"], ["aFreq"]); }
      p[pre + "Freq"] = clamp(v, 0, 48);
      if (pre === "b") {
        var fineSemis = frac; p.bFine = r1(clamp(fineSemis / 0.95 * 10, 0, 10));
        note(N, frac > 0.02 && frac < 0.98 ? "approx" : "exact", "Oscillator 2's tuning: " + (st >= 0 ? "+" : "") + r1(st) + " semitones",
          "Frequency in semitones over 4 octaves, then Fine, which only tunes sharp by nearly a semitone (P 18). A flat detune becomes a semitone down and then sharp again" + (frac > 0.02 && frac < 0.98 ? "; the Fine knob's curve is not printed, so the cents are this page's." : "."), [cite("P", 18), cite("M", 17)], ["o2Range", "o2Freq"], ["bFreq", "bFine"]);
      }
      if (v < 0 || v > 48) note(N, "approx", "Oscillator " + i + " out of range", "The Prophet's frequency knob covers 4 octaves (P 18); the Model D's ranges cover five plus LO (M 17). It stops at the end of the range.", [cite("P", 18), cite("M", 17)], [o + "Range"], [pre + "Freq"]);
      var w = waveTo(pre, m[o + "Wave"], null, pre === "a");
      note(N, w[0], "Oscillator " + i + " wave: " + M_WAVE_NAME[m[o + "Wave"]], w[1], [cite("M", 17), cite("P", 18)], [o + "Wave"], pre === "a" ? ["aSaw", "aPulse", "aPw"] : ["bSaw", "bTri", "bPulse", "bPw"]);
      if (audible(m, i)) { p[pre === "a" ? "mA" : "mB"] = m["m" + i]; note(N, "exact", "Oscillator " + i + " level " + m["m" + i], "The mixer levels match one for one (M 26, P 21).", [cite("M", 26), cite("P", 21)], ["m" + i + "On", "m" + i], [pre === "a" ? "mA" : "mB"]); }
      used.push(i);
    });
    // oscillator 3
    var o3audio = audible(m, 3), o3mod = (m.oscMod || m.filtMod) && m.src1 === "osc3" && m.modMix < 10;
    if (o3audio) {
      var same = m.o3Range === m.o2Range && Math.abs(m.o3Freq - m.o2Freq) < 1 && m.o3Wave === m.o2Wave && m.o3Kbd;
      if (same || (m.o3Range === m.o1Range && Math.abs(m.o3Freq) < 1 && m.o3Kbd)) {
        p.uniN = 2; p.uniDet = 3;
        note(N, "approx", "Third oscillator", "Each Prophet voice has two oscillators (P 17); the Model D sounds three on every key (M 16). Unison with two voices and a little detune (P 40) gives four oscillators, near the three-oscillator thickness.", [cite("M", 16), cite("P", 17), cite("P", 40)], ["m3On", "m3", "o3Range", "o3Freq", "o3Wave"], ["uniN", "uniDet"]);
      } else {
        note(N, "lost", "Third oscillator (" + r1(semisOf(m.o3Range, m.o3Freq)) + " semitones)", "Each Prophet voice has two oscillators (P 17); the Model D sounds three on every key (M 16). A third pitch, like this interval, is only reachable by Chord memory (P 41): hold the chord of all three pitches, press Unison, and each key then plays that chord.", [cite("M", 16), cite("P", 17), cite("P", 41)], ["m3On", "m3", "o3Range", "o3Freq", "o3Wave"], []);
      }
    }
    // noise and the external input
    if (m.nOn && m.n > 0) {
      p.mN = m.n;
      note(N, m.nCol === "pink" ? "approx" : "exact", "Noise " + m.nCol, m.nCol === "pink" ? "The Prophet's noise is white only (P 21); the Model D also has pink (M 27). Close the filter a little for the darker colour." : "White noise on both (M 27, P 21).", [cite("M", 27), cite("P", 21)], ["nOn", "n", "nCol"], ["mN"]);
    }
    if (m.extOn && m.ext > 0) {
      note(N, "lost", "Feedback through the external input", "With no cable in EXT. INPUT the Model D's output is fed back into its own mixer, which overloads and growls (M 27, 36). The Prophet-5 has no such path; the nearest is running the mixer levels high so they overload (P 21), which drives the mixer but does not feed the output back.", [cite("M", 27), cite("M", 36), cite("P", 21)], ["extOn", "ext"], ["mA", "mB"]);
      p.mA = clamp(p.mA + 0, 0, 10);
    }
    // filter
    p.cutoff = m.cutoff; p.res = m.emph; p.rev = "3";
    note(N, "approx", "The filter", "Both are 4-pole, 24 dB-per-octave resonant low-pass filters that self-oscillate (M 29, P 24): the Moog ladder against Rev 3's Curtis CEM 3320 or Rev 1/2's SSI 2140. The slope and the knobs match; the character, especially with resonance up, does not. Try both Rev settings.", [cite("M", 29), cite("P", 22), cite("P", 24)], ["cutoff", "emph"], ["rev", "cutoff", "res"]);
    p.envAmt = r1(clamp(m.amount / 10 * M_AMT_OCT / P_AMT_OCT * 10, 0, 10));
    note(N, "approx", "Amount of contour " + m.amount, "The Model D's contour sweeps the cutoff up to 4 octaves (M 80). The Prophet's env amount range is not printed; this page takes 10 as 6 octaves, so " + m.amount + " becomes " + p.envAmt + ".", [cite("M", 80), cite("P", 24)], ["amount"], ["envAmt"]);
    var kt = (m.kb1 ? 1 : 0) + (m.kb2 ? 2 : 0);
    p.kbd = kt === 0 ? "off" : kt === 3 ? "full" : "half";
    note(N, kt === 0 || kt === 3 ? "exact" : "approx", "Keyboard tracking " + ["off", "1/3", "2/3", "full"][kt], kt === 0 || kt === 3 ? "Off and full match (M 30, P 24)." : "The Model D's two switches give 1/3, 2/3 or all of it (M 30); the Prophet has off, half and full (P 24), so " + ["", "1/3", "2/3"][kt] + " becomes half.", [cite("M", 30), cite("P", 24)], ["kb1", "kb2"], ["kbd"]);
    // envelopes
    function tAtt(k) { return r1(clamp(expInv(expMap(k, M_ATT[0], M_ATT[1]), P_ATT[0], P_ATT[1]), 0, 10)); }
    function tDec(k) { return r1(clamp(expInv(expMap(k, M_DEC[0], M_DEC[1]), P_DEC[0], P_DEC[1]), 0, 10)); }
    p.fA = tAtt(m.fA); p.fD = tDec(m.fD); p.fS = m.fS; p.aA = tAtt(m.lA); p.aD = tDec(m.lD); p.aS = m.lS;
    p.rel = m.decaySw; p.fR = m.decaySw ? p.fD : 0; p.aR = m.decaySw ? p.aD : 0;
    note(N, "exact", "Envelopes: attack, decay, sustain", "The Model D's contours have attack, decay and sustain (M 30-31), the Prophet's add release (P 26, 29). The times are matched on this page's curves; the Prophet's time ranges are not printed.", [cite("M", 30), cite("P", 26)], ["fA", "fD", "fS", "lA", "lD", "lS"], ["fA", "fD", "fS", "aA", "aD", "aS"]);
    note(N, "exact", "Release: the Decay switch " + (m.decaySw ? "on" : "off"), m.decaySw ? "With DECAY on, the Model D's release uses the decay time (M 23, 30); the Prophet's release knobs are set to the same time." : "With DECAY off, the Model D's note stops at once when the key lifts (M 23); the Prophet's release switch off does the same (P 43).", [cite("M", 23), cite("P", 43)], ["decaySw"], ["rel", "fR", "aR"]);
    note(N, "approx", "Envelope shape", "The Prophet's rev switch also changes the envelope's curve: almost linear (SSM, Rev 1/2) or more curved (Curtis, Rev 3) (P 25). The Model D's curve is not described in its manual; this page draws it curved.", [cite("P", 25)], [], ["rev"]);
    // modulation
    function srcName(x) { return { osc3: "oscillator 3", fenv: "the filter contour", noise: "noise", lfo: "the LFO" }[x]; }
    if (m.oscMod || m.filtMod) {
      var a = m.src1, b = m.src2, w = m.modMix / 10, useA = w < 1, useB = w > 0;
      if (useA && useB) note(N, "approx", "Modulation mix " + m.modMix, "The Model D blends " + srcName(a) + " with " + srcName(b) + " on one knob (M 21). On the Prophet the two halves go to two different sections, Poly Mod and the wheel-mod, each with its own amount.", [cite("M", 21), cite("P", 32), cite("P", 34)], ["modMix"], ["wmMix", "pmOscB", "pmFenv"]);
      if (useB) {
        p.wmMix = b === "noise" ? 10 : 0;
        if (b === "lfo") { p.lfoFreq = r1(clamp(expInv(expMap(m.lfoRate, M_LFO[0], M_LFO[1]), P_LFO[0], P_LFO[1]), 0, 10)); p.lfoTri = !m.lfoSq; p.lfoSq = m.lfoSq; }
        if (m.oscMod) { p.wmFA = true; p.wmFB = true; }
        if (m.filtMod) p.wmF = true;
        note(N, b === "lfo" ? "exact" : "approx", (b === "lfo" ? "LFO" : "Noise") + " on the mod wheel → " + [m.oscMod ? "pitch" : "", m.filtMod ? "filter" : ""].filter(Boolean).join(" and "),
          b === "lfo" ? "Both send an LFO through the mod wheel to pitch and filter (M 21, 24; P 32, 38). The rates overlap: 0.05-200 Hz on the Model D (M 80), 0.022-500 Hz on the Prophet (P 32)."
            : "Both put noise on the mod wheel (M 21; P 32). The Model D's modulation noise is one colour darker than its audio noise (pink for white, red for pink, M 21); the Prophet's is white.",
          [cite("M", 21), cite("P", 32)], ["src2", "lfoRate", "lfoSq", "oscMod", "filtMod"], ["wmMix", "lfoFreq", "lfoTri", "lfoSq", "wmFA", "wmFB", "wmF"]);
        if (b === "lfo" && m.oscMod) note(N, "approx", "Vibrato reaches all oscillators", "The Model D's oscillator modulation moves the oscillators together (M 19); on the Prophet, freq A and freq B are switched on one by one (P 32), so both are on.", [cite("M", 19), cite("P", 32)], ["oscMod"], ["wmFA", "wmFB"]);
      }
      if (useA && a === "osc3") {
        var o3lfo = m.o3Range === "LO" || !m.o3Kbd;
        if (used.indexOf(2) >= 0 && audible(m, 2)) {
          note(N, "lost", "Oscillator 3 as a modulator while oscillator 2 sounds", "On the Prophet only oscillator B can be a Poly Mod source (P 34), and here it is busy sounding oscillator 2's part. The Model D has a third oscillator free for this (M 19).", [cite("M", 19), cite("P", 34)], ["src1", "o3Range", "o3Wave"], ["pmOscB"]);
        } else {
          var st3 = FOOT_OCT[m.o3Range] * 12 + m.o3Freq;
          p.bFreq = clamp(24 + Math.round(m.o3Range === "LO" ? m.o3Freq : st3), 0, 48); p.bLo = m.o3Range === "LO"; p.bKbd = m.o3Kbd;
          p.bSaw = /saw/.test(m.o3Wave); p.bTri = m.o3Wave === "tri"; p.bPulse = /square|wide|narrow/.test(m.o3Wave); p.bPw = M_PW[m.o3Wave] ? r1(pPwInv(M_PW[m.o3Wave])) : 5;
          p.pmOscB = r1(clamp((1 - w) * 7 / 48 * 10 * 1.0 * (SC.wheel == null ? 1 : 1), 0, 10));
          if (m.oscMod) p.pmFA = true; if (m.filtMod) p.pmF = true;
          note(N, "approx", "Oscillator 3 " + (o3lfo ? "as a slow LFO" : "at audio rate (FM)") + " → " + [m.oscMod ? "pitch" : "", m.filtMod ? "filter" : ""].filter(Boolean).join(" and "),
            "Becomes Poly Mod from oscillator B (P 34-35): B takes oscillator 3's range, wave and keyboard switch (lo freq and keyboard off, P 19). Two things change: Poly Mod reaches only oscillator A, not both (P 34), and its amount is a knob, not the mod wheel (the Prophet's wheel moves only the LFO and noise, P 38). The knob is set to the wheel at full.",
            [cite("M", 19), cite("M", 41), cite("P", 34), cite("P", 38)], ["src1", "o3Range", "o3Freq", "o3Wave", "o3Kbd", "oscMod"], ["pmOscB", "pmFA", "pmF", "bFreq", "bLo", "bKbd", "bSaw", "bTri", "bPulse"]);
        }
      }
      if (useA && a === "fenv") {
        if (m.oscMod) { p.pmFenv = r1(clamp((1 - w) * 7 / 48 * 10, 0, 10)); p.pmFA = true; }
        if (m.filtMod) { p.envAmt = r1(clamp(p.envAmt + (1 - w) * 3 / P_AMT_OCT * 10, 0, 10)); }
        note(N, "approx", "Filter EG on the mod wheel", "The 2016 Model D can send the filter contour to the oscillators or filter through the mod wheel (M 21). On the Prophet, Poly Mod sends the filter envelope to oscillator A only (P 34), with a knob for its amount instead of the wheel." + (m.filtMod ? " To the filter it is the same envelope again, so it adds to env amount." : ""), [cite("M", 21), cite("P", 34)], ["src1", "oscMod", "filtMod"], ["pmFenv", "pmFA", "envAmt"]);
      }
    }
    // glide, bend, drift
    p.glide = m.glideOn ? r1(m.glide) : 0;
    note(N, "exact", "Glide " + (m.glideOn ? m.glide : "off"), "Both glide from note to note (M 23, P 39); the Prophet's has no on/off switch, so off is a rate of 0. The Prophet's glide times are not printed: matched on this page's curve.", [cite("M", 23), cite("P", 39)], ["glide", "glideOn"], ["glide"]);
    p.bend = 7;
    note(N, "exact", "Pitch wheel: a fifth", "The Model D bends a fifth up and down (M 24, 80); the Prophet's range is set per program from 1 to 12 semitones (P 37), here 7.", [cite("M", 24), cite("P", 37)], [], ["bend"]);
    p.vintage = 2;
    note(N, "approx", "Drift", "The Model D's oscillators hold within 0.25 % over the short term (M 80), about 4 cents. The Prophet's vintage knob adds randomness from 4 (steady) to 1 (P 36); how much per step is not printed, so this page sets 2.", [cite("M", 80), cite("P", 36)], [], ["vintage"]);
    p.vol = m.vol;
    return { state: p, notes: N };
  }

  function prophet2moog(p) {
    p = full("prophet", p);
    var m = full("moog", {}), N = [];
    m.m1On = false; m.m1 = 0;
    if (!p.uni) note(N, "lost", "Chords (five voices)", "The Prophet-5 plays five notes at once (P 34: \"there are five voices\"); the Model D is monophonic (M 15). A held chord plays only its lowest note, the Model D's default priority (M 47).", [cite("P", 34), cite("M", 15), cite("M", 47)], [], []);
    else if (p.uniN > 1) note(N, "approx", "Unison: " + p.uniN + " voices", "Unison stacks up to " + p.uniN * 2 + " oscillators on one note (P 40). The Model D has three (M 16): oscillator 3 is added as a detuned copy below.", [cite("P", 40), cite("M", 16)], ["uni", "uniN", "uniDet"], ["m3On", "m3", "o3Freq"]);
    else note(N, "exact", "One voice", "Unison with one voice plays one note at a time, like the Model D (P 40, M 15).", [cite("P", 40), cite("M", 15)], ["uni", "uniN"], []);
    function rangeFor(v) {   // semitones from 8' -> [range, remainder]
      var oct = Math.round(v / 12), r; oct = clamp(oct, -2, 2); r = v - oct * 12;
      return [FEET[oct + 3], r];
    }
    function pickWave(saw, tri, pulse, pw, isO3) {
      var on = [saw && "saw", tri && "tri", pulse && "pulse"].filter(Boolean);
      if (!on.length) return ["saw", "approx", "No shape is switched on (silent on the Prophet); sawtooth stands in."];
      if (on.length === 2 && saw && tri && !isO3) return ["trisaw", "approx", "Triangle and sawtooth together become the Model D's triangle-sawtooth hybrid (M 18), the nearest match; the exact mixture is not documented."];
      var w = on.indexOf("saw") >= 0 ? "saw" : on[0], cls = on.length > 1 ? "approx" : "exact", why = on.length > 1 ? "The Prophet sounds several shapes at once (P 18); a Model D oscillator plays one (M 17). " : "";
      if (w === "pulse" || (on.length === 1 && pulse)) {
        var d = pPw(pw), best = "square"; ["square", "wide", "narrow"].forEach(function (k) { if (Math.abs(M_PW[k] - d) < Math.abs(M_PW[best] - d)) best = k; });
        var exactSq = best === "square" && Math.abs(pw - 5) < 0.3;
        return [best, exactSq ? cls : "approx", why + (exactSq ? "A square on both." : "The pulse width knob is free on the Prophet (P 18); the Model D has three fixed widths (M 18-19), so the nearest is used.")];
      }
      return [w, cls, why + (cls === "exact" ? (w === "tri" ? "Triangle on both." : "Sawtooth on both.") : "Sawtooth is kept.")];
    }
    // oscillator A -> 1
    var aSemis = p.aFreq - 24, ra = rangeFor(aSemis), wa = pickWave(p.aSaw, false, p.aPulse, p.aPw);
    if (p.mA > 0) {
      m.o1Range = ra[0]; m.o1Wave = wa[0]; m.m1On = true; m.m1 = p.mA;
      note(N, wa[1], "Oscillator A → oscillator 1: " + wa[0], wa[2], [cite("P", 18), cite("M", 17)], ["aSaw", "aPulse", "aPw"], ["o1Wave"]);
      note(N, ra[1] === 0 ? "exact" : "approx", "Oscillator A's pitch " + (aSemis >= 0 ? "+" : "") + aSemis, ra[1] === 0 ? "Whole octaves become RANGE footages (M 17)." : "Oscillator 1 has only RANGE in octaves (its tuning is the master TUNE knob, M 17), so the " + ra[1] + " semitones are lost unless oscillators 2 and 3 move instead.", [cite("M", 17)], ["aFreq"], ["o1Range"]);
      note(N, "exact", "Level A " + p.mA, "Mixer levels match (P 21, M 26).", [cite("P", 21), cite("M", 26)], ["mA"], ["m1On", "m1"]);
    }
    if (p.aSync) note(N, "lost", "Hard sync", "Oscillator A restarts its cycle with oscillator B (P 18), the sound of a sync sweep. The Model D's manual has no sync control: its oscillators run free (M 16-19). The nearest is oscillator 3 modulating oscillator 1 (FM, M 41), which is a different sound.", [cite("P", 18), cite("M", 16), cite("M", 41)], ["aSync"], []);
    // oscillator B -> 2 (or 3 when it is a modulator)
    var bMod = (p.pmOscB > 0 && (p.pmFA || p.pmF || p.pmPA)), bSemis = p.bFreq - 24, rb = rangeFor(bSemis), wb = pickWave(p.bSaw, p.bTri, p.bPulse, p.bPw), fineSemis = p.bFine / 10 * 0.95;
    if (p.mB > 0) {
      m.o2Range = rb[0]; m.o2Freq = r1(clamp(rb[1] + fineSemis, -7, 7) * 100) / 100; m.o2Wave = wb[0]; m.m2On = true; m.m2 = p.mB;
      note(N, wb[1], "Oscillator B → oscillator 2: " + wb[0], wb[2], [cite("P", 18), cite("M", 17)], ["bSaw", "bTri", "bPulse", "bPw"], ["o2Wave"]);
      note(N, "exact", "Oscillator B's pitch and fine", "Oscillator 2 has RANGE and a FREQUENCY knob for detuning and intervals (M 17), so B's semitones and fine both carry over.", [cite("M", 17), cite("P", 18)], ["bFreq", "bFine"], ["o2Range", "o2Freq"]);
      if (!p.bKbd) note(N, "lost", "Oscillator B with the keyboard off", "Only oscillator 3 can leave keyboard control on the Model D (M 19); oscillator 2 always follows the keys.", [cite("M", 19), cite("P", 19)], ["bKbd"], []);
    }
    if (bMod || p.bLo) {
      m.o3Range = p.bLo ? "LO" : rb[0]; m.o3Freq = clamp(rb[1] + fineSemis, -7, 7); m.o3Kbd = p.bKbd;
      var w3 = pickWave(p.bSaw, p.bTri, p.bPulse, p.bPw, true); m.o3Wave = w3[0] === "trisaw" ? "tri" : w3[0];
      m.src1 = "osc3"; m.modMix = 0;
      if (p.pmFA) m.oscMod = true; if (p.pmF) m.filtMod = true;
      note(N, "approx", "Poly Mod from oscillator B → " + [p.pmFA && "freq A", p.pmF && "filter", p.pmPA && "PW A"].filter(Boolean).join(", "),
        "Oscillator 3 is the Model D's modulating oscillator (M 19, 41). Differences: the amount is the mod wheel, not a knob (M 24), so push the wheel to about " + Math.round(p.pmOscB * 10) + " %; and oscillator modulation moves every oscillator, not only A (M 19). " + (p.mB > 0 ? "B also sounds in the Prophet patch, so oscillator 2 plays that part and oscillator 3 the modulator." : ""),
        [cite("P", 34), cite("M", 19), cite("M", 24), cite("M", 41)], ["pmOscB", "pmFA", "pmF", "bLo", "bKbd"], ["o3Range", "o3Freq", "o3Wave", "o3Kbd", "src1", "oscMod", "filtMod"]);
    }
    if ((p.pmPA && (p.pmFenv > 0 || p.pmOscB > 0)) || p.wmPA || p.wmPB) note(N, "lost", "Pulse-width modulation", "The Prophet sweeps the pulse width from Poly Mod or the LFO (P 18, 32, 35), the moving, chorused tone of its string sounds. The Model D's pulse widths are fixed positions of the wave switch (M 18-19); nothing can move them.", [cite("P", 18), cite("P", 35), cite("M", 18)], ["pmPA", "wmPA", "wmPB", "aPw", "bPw"], ["o1Wave", "o2Wave"]);
    if (p.pmFenv > 0 && p.pmFA) {
      m.oscMod = true; if (!bMod) { m.src1 = "fenv"; m.modMix = 0; }
      note(N, "approx", "Poly Mod: filter envelope → freq A", "The 2016 Model D can put its filter contour on the oscillators through the mod wheel (FILTER EG, M 21). It moves all oscillators, not only A, and its depth is the wheel's position, not a knob (M 24). Good for the brass \"blip\" (P 50) with the wheel just up.", [cite("P", 34), cite("P", 50), cite("M", 21)], ["pmFenv", "pmFA"], ["src1", "oscMod"]);
    }
    if (p.pmFenv > 0 && p.pmF) note(N, "approx", "Poly Mod: filter envelope → filter", "It is the same envelope as env amount, so on the Model D it adds to the amount of contour.", [cite("P", 35), cite("M", 31)], ["pmFenv", "pmF"], ["amount"]);
    // noise
    if (p.mN > 0) { m.nOn = true; m.n = p.mN; m.nCol = "white"; note(N, "exact", "Noise " + p.mN, "White noise on both (P 21, M 27).", [cite("P", 21), cite("M", 27)], ["mN"], ["nOn", "n", "nCol"]); }
    // unison -> osc 3
    if (p.uni && p.uniN > 1 && !bMod && !p.bLo) { m.o3Range = m.o1Range; m.o3Freq = clamp(0.05 + p.uniDet * 0.03, -7, 7); m.o3Wave = m.o1Wave === "trisaw" ? "tri" : m.o1Wave; m.o3Kbd = true; m.m3On = true; m.m3 = Math.max(p.mA, p.mB); }
    // filter
    m.cutoff = p.cutoff; m.emph = p.res;
    note(N, "approx", "The filter (Rev " + p.rev + ")", "Both 4-pole, 24 dB, self-oscillating (P 24, M 29): the " + (p.rev === "3" ? "CEM 3320" : "SSI 2140") + " becomes the Moog ladder. The slope matches, the character does not, most of all with resonance up.", [cite("P", 24), cite("M", 29)], ["rev", "cutoff", "res"], ["cutoff", "emph"]);
    var amt = p.envAmt / 10 * P_AMT_OCT;
    m.amount = r1(clamp(amt / M_AMT_OCT * 10, 0, 10));
    note(N, amt > M_AMT_OCT + 0.01 ? "approx" : "exact", "Env amount " + p.envAmt, amt > M_AMT_OCT + 0.01 ? "The Model D's contour reaches 4 octaves at most (M 80); this page takes the Prophet's 10 as 6, so it stops at 10." : "Within the Model D's 4 octaves (M 80); the Prophet's range is this page's guess.", [cite("M", 80)], ["envAmt"], ["amount"]);
    m.kb1 = p.kbd === "full"; m.kb2 = p.kbd !== "off";
    note(N, p.kbd === "half" ? "approx" : "exact", "Keyboard tracking " + p.kbd, p.kbd === "half" ? "Half becomes Keyboard Control 2 (2/3), the nearest (M 30)." : "Off and full match (P 24, M 30).", [cite("P", 24), cite("M", 30)], ["kbd"], ["kb1", "kb2"]);
    // envelopes
    function tA(k) { return r1(clamp(expInv(expMap(k, P_ATT[0], P_ATT[1]), M_ATT[0], M_ATT[1]), 0, 10)); }
    function tD(k) { return r1(clamp(expInv(expMap(k, P_DEC[0], P_DEC[1]), M_DEC[0], M_DEC[1]), 0, 10)); }
    m.fA = tA(p.fA); m.fD = tD(p.fD); m.fS = p.fS; m.lA = tA(p.aA); m.lD = tD(p.aD); m.lS = p.aS;
    var relOn = p.rel && (p.aR > 0.5 || p.fR > 0.5);
    m.decaySw = relOn;
    var relSame = !relOn || (Math.abs(p.aR - p.aD) <= 1 && Math.abs(p.fR - p.fD) <= 1);
    note(N, "exact", "Attack, decay, sustain", "The Model D's contours are attack, decay, sustain (M 30-31). Times on this page's curves.", [cite("M", 30), cite("P", 26)], ["fA", "fD", "fS", "aA", "aD", "aS"], ["fA", "fD", "fS", "lA", "lD", "lS"]);
    note(N, relSame ? "exact" : "approx", "Release " + (relOn ? "amp " + p.aR + ", filter " + p.fR : "fast"),
      relOn ? (relSame ? "The Model D's DECAY switch makes the release equal the decay time (M 23, 30), and here they are about the same." : "The Model D has no release knob: with its DECAY switch on, release takes the decay time (M 23, 30). The Prophet's release (" + p.aR + ") and decay (" + p.aD + ") differ, so one of them changes.")
        : "Release switch off, or release at 0: a fast release (P 43), the Model D's DECAY switch off (M 23).", [cite("M", 23), cite("P", 43)], ["rel", "aR", "fR"], ["decaySw"]);
    if (p.velF || p.velA) note(N, "approx", "Velocity → " + [p.velF && "filter", p.velA && "amp"].filter(Boolean).join(" and "), "The 2016 Model D's keyboard senses velocity, but only as a VELOCITY output jack (M 25, 36); a patch cable into LOUDNESS or FILTER input does it (M 40). Not set here.", [cite("P", 26), cite("M", 40)], ["velF", "velA"], []);
    // LFO
    var wmOn = p.wmFA || p.wmFB || p.wmF;
    if (wmOn) {
      var noiseOnly = p.wmMix >= 10, lfoOnly = p.wmMix <= 0;
      m.src2 = noiseOnly ? "noise" : "lfo"; m.modMix = bMod || (p.pmFenv > 0 && p.pmFA) ? 5 : 10;
      m.lfoRate = r1(clamp(expInv(expMap(p.lfoFreq, P_LFO[0], P_LFO[1]), M_LFO[0], M_LFO[1]), 0, 10)); m.lfoSq = p.lfoSq && !p.lfoTri;
      if (p.wmFA || p.wmFB) m.oscMod = true; if (p.wmF) m.filtMod = true;
      if (!lfoOnly && !noiseOnly) note(N, "approx", "Source mix of LFO and noise", "The Prophet blends LFO and noise on one knob (P 32); on the Model D one switch picks noise or LFO (M 21).", [cite("P", 32), cite("M", 21)], ["wmMix"], ["src2"]);
      var hz = expMap(p.lfoFreq, P_LFO[0], P_LFO[1]);
      if (hz < M_LFO[0] || hz > M_LFO[1]) note(N, "approx", "LFO rate " + r1(hz) + " Hz", "The Prophet's LFO runs from 0.022 to 500 Hz (P 32), the Model D's from 0.05 to 200 Hz (M 80); it stops at the end.", [cite("P", 32), cite("M", 80)], ["lfoFreq"], ["lfoRate"]);
      if (p.lfoSaw || (p.lfoTri && p.lfoSq)) note(N, "approx", "LFO shape", "The Prophet's LFO has saw, triangle and square, any together (P 32); the Model D's is triangle or square, one at a time (M 23).", [cite("P", 32), cite("M", 23)], ["lfoSaw", "lfoTri", "lfoSq"], ["lfoSq"]);
      if (p.wmFA !== p.wmFB) note(N, "approx", "LFO to one oscillator only", "The Prophet routes it to freq A and freq B separately (P 32), the Model D's oscillator modulation moves them together (M 19); the chorus trick of P 33 (LFO on B only) becomes vibrato.", [cite("P", 32), cite("P", 33), cite("M", 19)], ["wmFA", "wmFB"], ["oscMod"]);
      if (p.lfoInit > 0) note(N, "approx", "LFO initial amount " + p.lfoInit, "The Prophet applies the LFO continuously by its initial amount, with the wheel adding more (P 32). On the Model D modulation is the mod wheel only (M 24): push it up to about " + Math.round(p.lfoInit * 10) + " % and hold it there.", [cite("P", 32), cite("M", 24)], ["lfoInit"], []);
      else note(N, "exact", "LFO on the mod wheel", "Both put the LFO on the mod wheel (P 38, M 24).", [cite("P", 38), cite("M", 24)], ["wmFA", "wmFB", "wmF"], ["src2", "oscMod", "filtMod"]);
    }
    // performance
    m.glide = p.glide; m.glideOn = p.glide > 0;
    if (p.glide > 0) note(N, "exact", "Glide " + p.glide, "Both glide (P 39, M 23); times on this page's curve.", [cite("P", 39), cite("M", 23)], ["glide"], ["glide", "glideOn"]);
    if (p.bend !== 7) note(N, "approx", "Pitch wheel range " + p.bend, "The Model D's wheel always bends a fifth (M 24); the Prophet's is set per program, 1 to 12 semitones (P 37).", [cite("M", 24), cite("P", 37)], ["bend"], []);
    note(N, "lost", "Stored programs", "The Prophet stores its sounds as programs (P 9; the original Rev 3 held 40, T, NV RAM); every Model D sound is set by hand on its knobs and switches (M 15).", [cite("P", 9), cite("T", "5-1"), cite("M", 15)], [], []);
    m.vol = p.vol;
    return { state: m, notes: N };
  }

  // =====================================================================================================================
  // SEVEN MORE SYNTHS, and translation through one canonical description
  // =====================================================================================================================
  // The canonical description of a patch is the flat engine patch itself (SC.engine(id, state), plus `src`): oscillators with
  // their waves / levels / tuning, sub-oscillator, noise, ring modulator, feedback, sync, the filter (model, mode, slope 12/24,
  // cutoff Hz, resonance, env octaves, key tracking), a high-pass filter, envelopes in seconds, the LFO, modulation routes
  // (src -> dst with an amount in semitones / octaves / pulse width / wavetable steps), voices, unison, glide, FM operators and
  // algorithm, wavetable positions, chorus, accent. Every profile has toCanon (= engine) and fromCanon (translateCanon below,
  // with the profile's `cap` saying what it can do and `apply` setting its knobs). The Model D <-> Prophet-5 pair keeps its
  // hand-written translator above (moog2prophet / prophet2moog), which says more than the generic one can.
  Object.assign(C, {
    R3: "TB-303 Owner's Manual", J6: "Juno-60 Owner's Manual", J1: "Juno-106 Owner's Manual", A2: "ARP 2600 M Owner's Manual",
    A0: "ARP 2600 Owner's Manual (1971)", OX: "OB-Xa Operation Manual", K2: "MS-20 Owner's Manual", DX: "DX7 Operation Manual",
    PG: "PPG Wave 2.3 Service Manual", WP: "Wikipedia", SOS: "Sound On Sound"
  });
  // Which control ids and which manual page each feature belongs to, per synth: notes light these and cite these.
  PROFILES.moog.book = "M"; PROFILES.prophet.book = "P";
  PROFILES.moog.pg = { _: 15, voices: 15, osc: 17, sub: 17, noise: 27, ring: 16, fb: 27, sync: 16, pw: 18, filter: 29, hpf: 29, env: 30, lfo: 23, mods: 21, glide: 23, bend: 24, fm: 41, wt: 17, chorus: 15, accent: 15, memory: 15, kbd: 30, vel: 25 };
  PROFILES.prophet.pg = { _: 17, voices: 40, osc: 18, sub: 18, noise: 21, ring: 17, fb: 21, sync: 18, pw: 18, filter: 24, hpf: 24, env: 26, lfo: 32, mods: 34, glide: 39, bend: 37, fm: 34, wt: 17, chorus: 17, accent: 26, memory: 9, kbd: 24, vel: 26 };
  PROFILES.moog.fc = { voices: [], osc0: ["o1Range", "o1Wave", "m1On", "m1"], osc1: ["o2Range", "o2Freq", "o2Wave", "m2On", "m2"], osc2: ["o3Range", "o3Freq", "o3Wave", "o3Kbd", "m3On", "m3"],
    noise: ["nOn", "n", "nCol"], fb: ["extOn", "ext"], filter: ["cutoff", "emph", "amount"], kbd: ["kb1", "kb2"], env: ["fA", "fD", "fS", "lA", "lD", "lS", "decaySw"],
    lfo: ["lfoRate", "lfoSq"], mods: ["modMix", "src1", "src2", "oscMod", "filtMod"], glide: ["glide", "glideOn"], vol: ["vol"] };
  PROFILES.prophet.fc = { voices: ["uni", "uniN", "uniDet"], osc0: ["aFreq", "aSaw", "aPulse", "aPw", "mA"], osc1: ["bFreq", "bFine", "bSaw", "bTri", "bPulse", "bPw", "bLo", "bKbd", "mB"], noise: ["mN"],
    sync: ["aSync"], pw: ["aPw", "bPw"], filter: ["rev", "cutoff", "res", "envAmt"], kbd: ["kbd"], env: ["fA", "fD", "fS", "fR", "aA", "aD", "aS", "aR", "rel"],
    lfo: ["lfoFreq", "lfoSaw", "lfoTri", "lfoSq"], mods: ["pmFenv", "pmOscB", "pmFA", "pmPA", "pmF", "lfoInit", "wmMix", "wmFA", "wmFB", "wmPA", "wmPB", "wmF"], glide: ["glide"], bend: ["bend"], vel: ["velF", "velA"], memory: [], vol: ["vol"] };
  PROFILES.moog.cap = { voices: 1, unison: false, oscN: 3, waves: [["saw", "tri", "trisaw", "pulse"], ["saw", "tri", "trisaw", "pulse"], ["saw", "tri", "rsaw", "pulse"]], multi: false, pw: "three",
    tune: ["oct", "free", "free"], kbdOff: [2], noise: ["white", "pink"], sub: false, ring: false, fb: true, sync: false, filters: [["lp", 24]], hpf: false, selfOsc: true, kbd: [0, 1 / 3, 2 / 3, 1],
    envs: "ads", lfo: ["tri", "sq"], lfoHz: [0.05, 200], lfoDelay: false, mods: ["lfo>pitch", "lfo>cut", "noise>pitch", "noise>cut", "osc>pitch", "osc>cut", "env>pitch", "env>cut"], wheelOnly: true,
    glide: true, bend: [7, 7], chorus: false, fm: false, wt: false, memory: 0, vel: false, accent: false };
  PROFILES.prophet.cap = { voices: 5, unison: true, oscN: 2, waves: [["saw", "pulse"], ["saw", "tri", "pulse"]], multi: true, pw: "knob", tune: ["semi", "semi+"], kbdOff: [1],
    noise: ["white"], sub: false, ring: false, fb: false, sync: [0, 1], filters: [["lp", 24]], hpf: false, selfOsc: true, kbd: [0, 0.5, 1], envs: "adsr2", lfo: ["saw", "tri", "sq"], lfoHz: [0.022, 500],
    lfoDelay: false, mods: ["lfo>pitch", "lfo>pw", "lfo>cut", "noise>pitch", "noise>pw", "noise>cut", "env>pitch", "env>pw", "osc>pitch", "osc>pw", "osc>cut", "env>cut"],
    glide: true, bend: [1, 12], chorus: false, fm: false, wt: false, memory: 40, vel: true, accent: false };

  var TB = { cut: [60, 5000], dec: [0.2, 2.5] };                 // knob curves: this page's (the manual prints no ranges)
  var JU = { cut: [12, 18000], a: [0.001, 3], d: [0.002, 12], r: [0.002, 12], lfo: [0.3, 20] };   // J6 32 (specifications)
  var AR = { cut: [10, 10000], env: [0.002, 10], sh: [0.2, 24] };   // A2 10, 15; envelope times this page's
  var OB = { cut: [15, 18000], lfo: [0.1, 20], env: [0.001, 10] };  // OX 9 (LFO); the rest this page's
  var MS = { lcut: [20, 20000], hcut: [8, 8000], mg: [0.1, 50], env: [0.001, 10] };   // this page's
  var PP = { cut: [20, 18000], env: [0.002, 20], lfo: [0.05, 30] };                     // this page's
  function k63(v) { return v / 6.3; }                             // a 0-63 PPG value on this page's 0-10 curves
  var CORD_SRC = { arp2600: ["adsr", "ar", "sh", "noise", "vco1saw", "vco1sq", "vco2sine", "vco3saw", "kbd"], ms20: ["mgTri", "mgRect", "eg1", "eg1rev", "eg2rev", "sh", "noise", "kbd"] };
  var CORD_DST = { arp2600: ["vco1", "vco2", "vco3", "vcf", "vca", "pw2", "pw3"], ms20: ["freq", "vco2", "hcut", "lcut", "vca"] };
  function knob(id, label, a, b, st) { return [id, label, "k", a, b, st == null ? 0.1 : st]; }

  // ---- TB-303 (synth part only) ----
  PROFILES.tb303 = { id: "tb303", name: "TB-303", long: "after the Roland TB-303 Bass Line (1981): the synth part only", voices: 1, book: "R3",
    groups: [["Tone control", "tone", [["wave", "Waveform", "sel", ["saw", "square"]], knob("tune", "Tuning", -5, 5), knob("cutoff", "Cut off freq", 0, 10), knob("res", "Resonance", 0, 10),
      knob("envMod", "Env mod", 0, 10), knob("decay", "Decay", 0, 10), knob("accent", "Accent", 0, 10)]], ["Output", "out", [knob("vol", "Volume", 0, 10)]]],
    def: { wave: "saw", tune: 0, cutoff: 4, res: 5, envMod: 5, decay: 4, accent: 5, vol: 7 },
    pg: { _: 34, voices: 89, osc: 34, filter: 34, env: 34, accent: 34, glide: 89, memory: 89, mods: 34, lfo: 34, bend: 89, tune: 89, slope: ["WP", "TB-303"] },
    fc: { osc0: ["wave", "tune"], filter: ["cutoff", "res", "envMod"], env: ["decay"], accent: ["accent"], mods: ["envMod"], vol: ["vol"], glide: [] },
    cap: { voices: 1, unison: false, oscN: 1, waves: [["saw", "pulse"]], multi: false, pw: "square", tune: ["master"], kbdOff: [], noise: false, sub: false, ring: false, fb: false, sync: false,
      filters: [["lp", 24]], hpf: false, selfOsc: false, kbd: [0.5], envs: "303", lfo: [], lfoHz: [0, 0], mods: ["env>cut"], glide: "slide", bend: false, chorus: false, fm: false, wt: false,
      memory: 0, vel: false, accent: true },
    flow: { osc: [["VCO", ["wave", "tune"]]], filter: ["cutoff", "res"], fenv: ["envMod", "decay"], aenv: ["decay", "accent"] } };
  function eng303(s) {
    s = full("tb303", s);
    var o = { on: true, lvl: 0.9, waves: s.wave === "saw" ? { saw: 1 } : { pulse: 1 }, pw: 0.5, oct: -1, semis: s.tune, kbd: true }, d = expMap(s.decay, TB.dec[0], TB.dec[1]);
    return base("tb303", { voices: 1, prio: "last", legato: true, osc: [o, oscEmpty(), oscEmpty()], model: "diode", slope: 24,
      cut: expMap(s.cutoff, TB.cut[0], TB.cut[1]), res: s.res / 10 * 0.86, env: s.envMod / 10 * 4, kbd: 0.5,
      fenv: { a: 0.003, d: d, s: 0, r: 0.01, lin: false }, aenv: { a: 0.002, d: d * 2.5, s: 0, r: 0.012, lin: false, vel: 0 },
      glide: 0.06, glideLegato: true, accent: s.accent / 10, bend: 0, drift: 1, vol: s.vol / 10 });
  }

  // ---- Juno-60 (Juno-106 differences as a switch) ----
  PROFILES.juno = { id: "juno", name: "Juno-60", long: "after the Roland Juno-60 (1982); the Juno-106's differences on the Model switch", voices: 6, book: "J6",
    groups: [["LFO", "lfo", [knob("lfoRate", "Rate", 0, 10), knob("lfoDelay", "Delay time", 0, 10)]],
      ["DCO", "dco", [["range", "Range", "sel", ["16'", "8'", "4'"]], knob("dLfo", "LFO", 0, 10), knob("pwm", "PWM", 0, 10), ["pwmMode", "PWM mode", "sel", ["lfo", "man", "env"]],
        ["pulse", "Pulse", "s"], ["saw", "Saw", "s"], ["sub", "Sub osc", "s"], knob("subLvl", "Sub level", 0, 10), knob("noise", "Noise", 0, 10)]],
      ["HPF", "hpf", [knob("hpf", "HPF freq", 0, 3, 1)]],
      ["VCF", "vcf", [knob("cutoff", "Freq", 0, 10), knob("res", "Res", 0, 10), ["envPol", "Env polarity", "sel", ["+", "-"]], knob("env", "Env", 0, 10), knob("fLfo", "LFO", 0, 10), knob("kybd", "Kybd", 0, 10)]],
      ["VCA", "vca", [["vcaMode", "Env / gate", "sel", ["env", "gate"]], knob("vcaLvl", "Level", 0, 10)]],
      ["ENV", "env", [knob("a", "A", 0, 10), knob("d", "D", 0, 10), knob("s", "S", 0, 10), knob("r", "R", 0, 10)]],
      ["Chorus and model", "cho", [["chorus", "Chorus", "sel", ["off", "I", "II"]], ["model", "Model", "sel", ["60", "106"]], knob("porta", "Portamento (106)", 0, 10)]]],
    def: { lfoRate: 5, lfoDelay: 0, range: "8'", dLfo: 0, pwm: 0, pwmMode: "man", pulse: false, saw: true, sub: false, subLvl: 0, noise: 0, hpf: 0,
      cutoff: 7, res: 0, envPol: "+", env: 3, fLfo: 0, kybd: 5, vcaMode: "env", vcaLvl: 6, a: 0, d: 5, s: 7, r: 3, chorus: "off", model: "60", porta: 0 },
    pg: { _: 12, voices: 2, osc: 12, sub: 13, noise: 12, pw: 13, hpf: 14, filter: 14, kbd: 14, env: 16, lfo: 17, mods: 12, chorus: 22, memory: 2, glide: 12, bend: 32, slope: ["WP", "Roland Juno-60"] },
    fc: { osc0: ["range", "saw", "pulse"], sub: ["sub", "subLvl"], noise: ["noise"], pw: ["pwm", "pwmMode"], hpf: ["hpf"], filter: ["cutoff", "res", "env", "envPol"], kbd: ["kybd"],
      env: ["a", "d", "s", "r", "vcaMode"], lfo: ["lfoRate", "lfoDelay"], mods: ["dLfo", "fLfo", "pwm", "pwmMode"], chorus: ["chorus"], glide: ["model", "porta"], vol: ["vcaLvl"], memory: [], voices: [] },
    cap: { voices: 6, unison: false, oscN: 1, waves: [["saw", "pulse"]], multi: true, pw: "knob", tune: ["oct"], kbdOff: [], noise: ["white"], sub: true, ring: false, fb: false, sync: false,
      filters: [["lp", 24]], hpf: "fixed", selfOsc: true, kbd: "free", envs: "adsr1", lfo: ["tri"], lfoHz: [0.3, 20], lfoDelay: true, mods: ["lfo>pitch", "lfo>pw", "env>pw", "lfo>cut"],
      glide: "106", bend: [0, 12], chorus: true, fm: false, wt: false, memory: 56, vel: false, accent: false },
    flow: { osc: [["DCO", ["range", "saw", "pulse", "pwm"]], ["Sub", ["sub", "subLvl"]]], noise: ["noise"], hpf: ["hpf"], filter: ["cutoff", "res"], fenv: ["a", "d", "s", "r", "env"], aenv: ["a", "d", "s", "r", "vcaMode"], lfo: ["lfoRate", "lfoDelay"], fx: ["chorus"] } };
  function engJuno(s) {
    s = full("juno", s);
    var oct = { "16'": -1, "8'": 0, "4'": 1 }[s.range], w = {}; if (s.saw) w.saw = 1; if (s.pulse) w.pulse = 1;
    var pwAmt = s.pwm / 10 * 0.45, dco = { on: !!(s.saw || s.pulse), lvl: 0.8, waves: w, pw: s.pwmMode === "man" ? 0.5 - pwAmt : 0.5, oct: oct, semis: 0, kbd: true },
      sub = { on: !!s.sub && s.subLvl > 0, lvl: s.subLvl / 10 * 0.8, waves: { pulse: 1 }, pw: 0.5, oct: oct - 1, semis: 0, kbd: true, sub: true }, routes = [];
    if (s.dLfo > 0) routes.push({ id: "dlfo", src: [["lfo", 1]], dst: ["p0", "p1"], amt: s.dLfo / 10 * 3, gain: "fixed" });
    if (s.pwmMode !== "man" && pwAmt > 0) routes.push({ id: "pwm", src: [[s.pwmMode === "lfo" ? "lfo" : "fenv", 1]], dst: ["pw0"], amt: s.pwmMode === "lfo" ? pwAmt * 0.95 : -pwAmt, gain: "fixed" });
    if (s.fLfo > 0) routes.push({ id: "flfo", src: [["lfo", 1]], dst: ["cut"], amt: s.fLfo / 10 * 2, gain: "fixed" });
    var e = { a: expMap(s.a, JU.a[0], JU.a[1]), d: expMap(s.d, JU.d[0], JU.d[1]), s: s.s / 10, r: expMap(s.r, JU.r[0], JU.r[1]), lin: false }, h = s.hpf;
    var hpf = s.model === "106" ? (h < 1 ? { cut: 0, boost: 1 - h } : { cut: h < 1.05 ? 0 : 70 * Math.pow(2, (h - 1) * 2.2) }) : { cut: h < 0.05 ? 0 : 70 * Math.pow(2, h * 1.6) };
    hpf.kind = "1p";
    return base("juno", { voices: 6, prio: "last", osc: [dco, sub, oscEmpty()], noise: { lvl: s.noise / 10, pink: false }, hpf: hpf, model: "ir3109", slope: 24,
      cut: expMap(s.cutoff, JU.cut[0], JU.cut[1]), res: s.res / 10, env: (s.envPol === "+" ? 1 : -1) * s.env / 10 * 6, kbd: s.kybd / 10,
      fenv: e, aenv: s.vcaMode === "gate" ? { a: 0.002, d: 0.01, s: 1, r: 0.006, lin: false, vel: 0 } : Object.assign({ vel: 0 }, e),
      lfo: { hz: expMap(s.lfoRate, JU.lfo[0], JU.lfo[1]), tri: 1, sq: 0, saw: 0, uni: false, delay: s.lfoDelay / 10 * 2 }, routes: routes,
      glide: s.model === "106" && s.porta > 0 ? expMap(s.porta, 0.005, 3) : 0, chorus: { off: 0, I: 1, II: 2 }[s.chorus], bend: 2, drift: 0.3, vol: s.vcaLvl / 10 });
  }

  // ---- ARP 2600 (semi-modular: normalled routes and cords) ----
  var A_SEMIS = [-84, 36];
  PROFILES.arp2600 = { id: "arp2600", name: "ARP 2600", long: "after the ARP 2600 (1971) and Korg's 2600 M: normalled routes, plus cords", voices: 1, book: "A2",
    groups: [["VCO-1", "v1", [knob("f1", "Initial freq (st)", A_SEMIS[0], A_SEMIS[1], 1), knob("fine1", "Fine", -1, 1, 0.01), ["kb1", "KBD on", "s"], knob("v1sh", "CV2 S/H", 0, 10), knob("v1adsr", "CV3 ADSR", 0, 10), knob("v1sin2", "CV4 VCO-2 sine", 0, 10)]],
      ["VCO-2", "v2", [knob("f2", "Initial freq (st)", A_SEMIS[0], A_SEMIS[1], 1), knob("fine2", "Fine", -1, 1, 0.01), knob("pw2", "Pulse width %", 10, 90, 1), ["kb2", "KBD on", "s"],
        knob("v2sh", "CV2 S/H", 0, 10), knob("v2adsr", "CV3 ADSR", 0, 10), knob("v2sq1", "CV4 VCO-1 square", 0, 10), knob("v2pwm", "PWM (noise)", 0, 10)]],
      ["VCO-3", "v3", [knob("f3", "Initial freq (st)", A_SEMIS[0], A_SEMIS[1], 1), knob("fine3", "Fine", -1, 1, 0.01), knob("pw3", "Pulse width %", 10, 90, 1), ["kb3", "KBD on", "s"],
        knob("v3noise", "CV2 noise", 0, 10), knob("v3adsr", "CV3 ADSR", 0, 10), knob("v3sin2", "CV4 VCO-2 sine", 0, 10)]],
      ["VCF", "vcf", [knob("cut", "Initial freq", 0, 10), knob("res", "Resonance", 0, 10), ["type", "Type", "sel", ["I", "II"]], knob("inRing", "In: ring mod", 0, 10), knob("inV1", "In: VCO-1 square", 0, 10),
        knob("inV2", "In: VCO-2 pulse", 0, 10), knob("inV3", "In: VCO-3 saw", 0, 10), knob("inN", "In: noise", 0, 10), knob("fAdsr", "CV2 ADSR", 0, 10), knob("fSin2", "CV3 VCO-2 sine", 0, 10)]],
      ["Noise and S/H", "ns", [["nCol", "Noise colour", "sel", ["white", "pink", "low"]], knob("shRate", "S/H clock", 0, 10)]],
      ["Envelopes", "env", [knob("aA", "ADSR attack", 0, 10), knob("aD", "ADSR decay", 0, 10), knob("aS", "ADSR sustain", 0, 10), knob("aR", "ADSR release", 0, 10), knob("arA", "AR attack", 0, 10), knob("arR", "AR release", 0, 10)]],
      ["VCA", "vca", [knob("gain", "Initial gain", 0, 10), knob("vAr", "CV1 AR (linear)", 0, 10), knob("vAdsr", "CV2 ADSR (exp.)", 0, 10), knob("vol", "Volume", 0, 10)]],
      ["Patch cords", "cords", [["cords", "Cords", "cords"]]]],
    def: { f1: 0, fine1: 0, kb1: true, v1sh: 0, v1adsr: 0, v1sin2: 0, f2: 0, fine2: 0, pw2: 50, kb2: true, v2sh: 0, v2adsr: 0, v2sq1: 0, v2pwm: 0,
      f3: 0, fine3: 0, pw3: 50, kb3: true, v3noise: 0, v3adsr: 0, v3sin2: 0, cut: 6, res: 0, type: "I", inRing: 0, inV1: 0, inV2: 0, inV3: 8, inN: 0, fAdsr: 4, fSin2: 0,
      nCol: "white", shRate: 5, aA: 0, aD: 4, aS: 5, aR: 3, arA: 0, arR: 3, gain: 0, vAr: 10, vAdsr: 0, vol: 6, cords: [] },
    pg: { _: 5, voices: ["A0", "4.12"], osc: 7, noise: 14, ring: 6, pw: 8, filter: 10, slope: ["A0", "4.12"], kbd: 10, env: 11, lfo: 7, mods: 7, sh: 15, cords: 5, amp: 12, memory: 4, fm: 7 },
    fc: { osc0: ["f1", "fine1", "kb1", "inV1"], osc1: ["f2", "fine2", "pw2", "kb2", "inV2"], osc2: ["f3", "fine3", "pw3", "kb3", "inV3"], noise: ["nCol", "inN"], ring: ["inRing"], pw: ["pw2", "pw3", "v2pwm"],
      filter: ["cut", "res", "type", "fAdsr"], env: ["aA", "aD", "aS", "aR", "arA", "arR", "vAr", "vAdsr", "gain"], lfo: ["kb2", "f2"], sh: ["shRate"],
      mods: ["v1sh", "v1adsr", "v1sin2", "v2sh", "v2adsr", "v2sq1", "v2pwm", "v3noise", "v3adsr", "v3sin2", "fSin2", "cords"], cords: ["cords"], vol: ["vol"] },
    cap: { voices: 1, unison: false, oscN: 3, waves: [["pulse"], ["pulse"], ["saw"]], multi: false, pw: "knob23", tune: ["free", "free", "free"], kbdOff: [0, 1, 2], noise: ["white", "pink", "red"],
      sub: false, ring: true, fb: false, sync: false, filters: [["lp", 24]], hpf: false, selfOsc: true, kbd: [1], envs: "ar+adsr", lfo: ["sine", "tri", "saw", "sq"], lfoHz: [0.03, 30], lfoDelay: false,
      mods: ["env>pitch", "env>cut", "osc>pitch", "osc>cut", "sh>pitch", "sh>cut", "noise>pitch", "noise>pw", "noise>cut", "lfo>pitch", "lfo>cut", "env>amp"], glide: false, bend: false,
      chorus: false, fm: false, wt: false, memory: 0, vel: false, accent: false, cords: true },
    flow: { osc: [["VCO-1", ["f1", "inV1", "kb1"]], ["VCO-2", ["f2", "pw2", "inV2", "kb2"]], ["VCO-3", ["f3", "pw3", "inV3", "kb3"]]], noise: ["inN", "nCol"], ring: ["inRing"], filter: ["cut", "res", "type"],
      fenv: ["aA", "aD", "aS", "aR", "fAdsr"], aenv: ["arA", "arR", "vAr", "vAdsr"], lfo: ["shRate"] } };
  function cordRoutes(id, cords) {
    var R = [], SRC = { adsr: "fenv", ar: "aenv", sh: "sh", noise: "noise", vco1saw: "osc0", vco1sq: "sq0", vco2sine: "sine1", vco3saw: "osc2", kbd: "kbd",
      mgTri: "lfo", mgRect: "lfoSq", eg1: "env3", eg1rev: "env3rev", eg2rev: "fenvrev" },
      DST = { vco1: ["p0"], vco2: ["p1"], vco3: ["p2"], vcf: ["cut"], vca: ["amp"], pw2: ["pw1"], pw3: ["pw2"], freq: ["p0", "p1"], hcut: ["hcut"], lcut: ["cut"] };
    (cords || []).forEach(function (c, i) {
      var d = DST[c.dst] || [], amt = d[0] === "cut" || d[0] === "hcut" ? 5 : d[0] === "amp" ? 1 : /^pw/.test(d[0]) ? 0.4 : 24;
      if (SRC[c.src] && d.length && c.amt) R.push({ id: "cord" + i, src: [[SRC[c.src], 1]], dst: d, amt: amt * c.amt, gain: "fixed", cord: true });
    });
    return R;
  }
  function engArp(s) {
    s = full("arp2600", s);
    function vco(i, f, fine, kb, wave, pw, lvl) { var w = {}; w[wave] = 1; return { on: lvl > 0, run: true, lvl: lvl, waves: w, pw: pw, oct: 0, semis: f + fine, kbd: kb }; }
    var o = [vco(0, s.f1, s.fine1, s.kb1, "pulse", 0.5, s.inV1 / 10), vco(1, s.f2, s.fine2, s.kb2, "pulse", s.pw2 / 100, s.inV2 / 10), vco(2, s.f3, s.fine3, s.kb3, "saw", s.pw3 / 100, s.inV3 / 10)];
    var R = [];
    function rt(id, src, dst, v, amt) { if (v > 0) R.push({ id: id, src: [[src, 1]], dst: [dst], amt: v / 10 * amt, gain: "fixed", normal: true }); }
    rt("v1sh", "sh", "p0", s.v1sh, 24); rt("v1adsr", "fenv", "p0", s.v1adsr, 24); rt("v1sin2", "sine1", "p0", s.v1sin2, 24);
    rt("v2sh", "sh", "p1", s.v2sh, 24); rt("v2adsr", "fenv", "p1", s.v2adsr, 24); rt("v2sq1", "sq0", "p1", s.v2sq1, 24); rt("v2pwm", "noise", "pw1", s.v2pwm, 0.4);
    rt("v3noise", "noise", "p2", s.v3noise, 24); rt("v3adsr", "fenv", "p2", s.v3adsr, 24); rt("v3sin2", "sine1", "p2", s.v3sin2, 24);
    rt("fSin2", "sine1", "cut", s.fSin2, 4);
    var nlvl = s.inN / 10;
    return base("arp2600", { voices: 1, prio: "low", osc: o, noise: { lvl: nlvl, pink: s.nCol === "pink", red: s.nCol === "low" }, modNoise: s.nCol === "low" ? "red" : s.nCol === "pink" ? "pink" : "white",
      ring: s.inRing > 0 ? { lvl: s.inRing / 10, kind: "arp" } : null, model: s.type === "I" ? "ladder" : "ssi", slope: 24,
      cut: expMap(s.cut, AR.cut[0], AR.cut[1]), res: s.res / 10, env: s.fAdsr / 10 * 5, kbd: 1,
      fenv: { a: expMap(s.aA, AR.env[0], AR.env[1]), d: expMap(s.aD, AR.env[0], AR.env[1]), s: s.aS / 10, r: expMap(s.aR, AR.env[0], AR.env[1]), lin: false },
      aenv: { a: expMap(s.arA, AR.env[0], AR.env[1]), d: 0.001, s: 1, r: expMap(s.arR, AR.env[0], AR.env[1]), lin: true, vel: 0 },
      amp: { a: s.vAr / 10, f: s.vAdsr / 10, init: s.gain / 10 }, shHz: expMap(s.shRate, AR.sh[0], AR.sh[1]),
      lfo: { hz: 1, tri: 0, sq: 0, saw: 0, uni: false }, routes: R.concat(cordRoutes("arp2600", s.cords)), bend: 0, drift: 3, vol: s.vol / 10 });
  }

  // ---- Oberheim OB-Xa (+ the SEM's filter modes) ----
  PROFILES.obxa = { id: "obxa", name: "OB-Xa", long: "after the Oberheim OB-Xa (1981); the SEM's state-variable filter modes on one extra switch", voices: 8, book: "OX",
    groups: [["Modulation", "mod", [knob("lfoRate", "LFO rate", 0, 10), ["lSine", "Sine", "s"], ["lSq", "Square", "s"], ["lSH", "S/H", "s"], knob("fmDepth", "Freq depth", 0, 10),
      ["fmO1", "→ Osc 1", "s"], ["fmO2", "→ Osc 2", "s"], ["fmF", "→ Filter", "s"], knob("pwDepth", "PW depth", 0, 10), ["pwO1", "→ PW 1", "s"], ["pwO2", "→ PW 2", "s"]]],
      ["Oscillators", "osc", [knob("o1Freq", "Osc 1 freq (oct)", -2, 2, 1), ["o1Saw", "Saw 1", "s"], ["o1Pulse", "Pulse 1", "s"], knob("pw", "Pulse width", 0, 10), ["sync", "Sync", "s"], ["fEnvO2", "F-Env → Osc 2", "s"],
        knob("o2Freq", "Osc 2 freq (st)", -30, 30, 1), knob("o2Det", "Osc 2 detune", -1, 1, 0.01), ["o2Saw", "Saw 2", "s"], ["o2Pulse", "Pulse 2", "s"]]],
      ["Filter", "flt", [knob("cutoff", "Frequency", 0, 10), knob("res", "Resonance", 0, 10), knob("fMod", "Modulation", 0, 10), ["fO1", "Osc 1", "s"], ["fO2", "Osc 2", "sel", ["off", "half", "full"]],
        ["fNoise", "Noise", "s"], ["pole4", "4-pole", "s"], ["track", "Track", "s"], ["sem", "SEM mode (not on the OB-Xa)", "sel", ["off", "lp", "bp", "hp", "notch"]]]],
      ["Filter envelope", "fenv", [knob("fA", "Attack", 0, 10), knob("fD", "Decay", 0, 10), knob("fS", "Sustain", 0, 10), knob("fR", "Release", 0, 10)]],
      ["Loudness envelope", "lenv", [knob("lA", "Attack", 0, 10), knob("lD", "Decay", 0, 10), knob("lS", "Sustain", 0, 10), knob("lR", "Release", 0, 10)]],
      ["Performance", "perf", [["uni", "Unison", "s"], knob("porta", "Portamento", 0, 10), knob("vol", "Volume", 0, 10)]]],
    def: { lfoRate: 5, lSine: true, lSq: false, lSH: false, fmDepth: 0, fmO1: false, fmO2: false, fmF: false, pwDepth: 0, pwO1: false, pwO2: false,
      o1Freq: 0, o1Saw: true, o1Pulse: false, pw: 0, sync: false, fEnvO2: false, o2Freq: 0, o2Det: 0, o2Saw: true, o2Pulse: false,
      cutoff: 6, res: 0, fMod: 3, fO1: true, fO2: "full", fNoise: false, pole4: true, track: true, sem: "off",
      fA: 0, fD: 5, fS: 6, fR: 3, lA: 0, lD: 5, lS: 10, lR: 3, uni: false, porta: 0, vol: 6 },
    pg: { _: 10, voices: 13, osc: 10, sync: 10, pw: 10, noise: 11, filter: 11, slope: 11, kbd: 11, env: 12, lfo: 9, mods: 9, glide: 8, memory: ["OX", "PDF 4"], sem: ["WP", "Oberheim Polyphonic Synthesizer"], bend: 8 },
    fc: { voices: ["uni"], osc0: ["o1Freq", "o1Saw", "o1Pulse", "fO1"], osc1: ["o2Freq", "o2Det", "o2Saw", "o2Pulse", "fO2"], noise: ["fNoise"], sync: ["sync"], pw: ["pw"],
      filter: ["cutoff", "res", "fMod", "pole4", "sem"], kbd: ["track"], env: ["fA", "fD", "fS", "fR", "lA", "lD", "lS", "lR"], lfo: ["lfoRate", "lSine", "lSq", "lSH"],
      mods: ["fmDepth", "fmO1", "fmO2", "fmF", "pwDepth", "pwO1", "pwO2", "fEnvO2"], glide: ["porta"], vol: ["vol"], memory: [] },
    cap: { voices: 8, unison: true, oscN: 2, waves: [["saw", "pulse"], ["saw", "pulse"]], multi: true, pw: "knob", tune: ["oct", "semi"], kbdOff: [], noise: ["white"], sub: false, ring: false, fb: false,
      sync: [1, 0], filters: [["lp", 24], ["lp", 12], ["bp", 12], ["hp", 12], ["notch", 12]], hpf: false, selfOsc: true, kbd: [0, 1], envs: "adsr2", lfo: ["sine", "sq", "sh"], lfoHz: [0.1, 20],
      lfoDelay: false, mods: ["lfo>pitch", "lfo>cut", "lfo>pw", "sh>pitch", "sh>cut", "sh>pw", "env>pitch", "env>cut"], glide: true, bend: [2, 12], chorus: false, fm: false, wt: false, memory: 120, vel: false, accent: false },
    flow: { osc: [["Osc 1", ["o1Freq", "o1Saw", "o1Pulse", "fO1"]], ["Osc 2", ["o2Freq", "o2Saw", "o2Pulse", "fO2"]]], noise: ["fNoise"], filter: ["cutoff", "res", "pole4", "sem"],
      fenv: ["fA", "fD", "fS", "fR", "fMod"], aenv: ["lA", "lD", "lS", "lR"], lfo: ["lfoRate", "lSine", "lSq", "lSH"] } };
  function engOb(s) {
    s = full("obxa", s);
    function w(saw, pl) { var x = {}; if (saw) x.saw = 1; if (pl) x.pulse = 1; return x; }
    var pw = 0.5 - s.pw / 10 * 0.45, l2 = { off: 0, half: 0.56, full: 1 }[s.fO2];   // HALF about 5 dB below full (OX 11)
    var o1 = { on: s.fO1, lvl: s.fO1 ? 0.8 : 0, waves: w(s.o1Saw, s.o1Pulse), pw: pw, oct: s.o1Freq, semis: 0, kbd: true },
      o2 = { on: l2 > 0, run: s.sync, lvl: l2 * 0.8, waves: w(s.o2Saw, s.o2Pulse), pw: pw, oct: 0, semis: s.o2Freq + s.o2Det * 0.5, kbd: true };
    var R = [], L = [["lfo", s.lSine || s.lSq ? 1 : 0], ["shL", s.lSH ? 1 : 0]], dst = [];
    if (s.fmDepth > 0) { if (s.fmO1) dst.push("p0"); if (s.fmO2) dst.push("p1"); if (dst.length) R.push({ id: "fm", src: L, dst: dst, amt: s.fmDepth / 10 * 12, gain: "fixed", curve: "sq" }); if (s.fmF) R.push({ id: "fmF", src: L, dst: ["cut"], amt: s.fmDepth / 10 * 4, gain: "fixed" }); }
    dst = []; if (s.pwO1) dst.push("pw0"); if (s.pwO2) dst.push("pw1"); if (s.pwDepth > 0 && dst.length) R.push({ id: "pwm", src: L, dst: dst, amt: s.pwDepth / 10 * 0.4, gain: "fixed" });
    if (s.fEnvO2 && s.fMod > 0) R.push({ id: "fenvO2", src: [["fenv", 1]], dst: ["p1"], amt: s.fMod / 10 * 12, gain: "fixed" });   // one octave at most (OX 10)
    var sem = s.sem !== "off";
    return base("obxa", { voices: s.uni ? 1 : 8, unison: s.uni ? 8 : 1, uniDet: s.uni ? 6 : 0, prio: s.uni ? "low" : "last", legato: !!s.uni, osc: [o1, o2, oscEmpty()],
      sync: s.sync ? { slave: 1, master: 0 } : null, noise: { lvl: s.fNoise ? 0.5 : 0, pink: false },
      model: !sem && s.pole4 ? "cem" : "svf", mode: sem ? s.sem : "lp", slope: !sem && s.pole4 ? 24 : 12,
      cut: expMap(s.cutoff, OB.cut[0], OB.cut[1]), res: s.res / 10, env: s.fMod / 10 * 6, kbd: s.track ? 1 : 0,
      fenv: { a: expMap(s.fA, OB.env[0], OB.env[1]), d: expMap(s.fD, OB.env[0], OB.env[1]), s: s.fS / 10, r: expMap(s.fR, OB.env[0], OB.env[1]), lin: false },
      aenv: { a: expMap(s.lA, OB.env[0], OB.env[1]), d: expMap(s.lD, OB.env[0], OB.env[1]), s: s.lS / 10, r: expMap(s.lR, OB.env[0], OB.env[1]), lin: false, vel: 0 },
      lfo: { hz: expMap(s.lfoRate, OB.lfo[0], OB.lfo[1]), tri: 0, sine: s.lSine ? 1 : 0, sq: s.lSq ? 1 : 0, saw: 0, uni: false }, routes: R,
      glide: s.porta > 0 ? expMap(s.porta, 0.005, 5) : 0, bend: 2, drift: 2, vol: s.vol / 10 });
  }

  // ---- Korg MS-20 ----
  PROFILES.ms20 = { id: "ms20", name: "MS-20", long: "after the Korg MS-20 (1978; the MS-20 Kit reissue 2014)", voices: 1, book: "K2",
    groups: [["VCO-1", "v1", [["s1", "Scale", "sel", ["32'", "16'", "8'", "4'"]], ["w1", "Waveform", "sel", ["tri", "saw", "pulse", "noise"]], knob("pw1", "PW", 0, 10)]],
      ["VCO-2", "v2", [["s2", "Scale", "sel", ["16'", "8'", "4'", "2'"]], ["w2", "Waveform", "sel", ["saw", "square", "pulse", "ring"]], knob("pitch2", "Pitch (st)", -12, 12)]],
      ["VCO mixer and modulation", "vm", [knob("l1", "VCO-1 level", 0, 10), knob("l2", "VCO-2 level", 0, 10), knob("porta", "Portamento", 0, 10), knob("fmMg", "Freq MG/T.EXT", 0, 10), knob("fmEg1", "Freq EG1/EXT", 0, 10)]],
      ["High-pass filter", "hp", [knob("hCut", "Cutoff", 0, 10), knob("hPeak", "Peak", 0, 10), knob("hMg", "MG/T.EXT", 0, 10), knob("hEg2", "EG2/EXT", 0, 10)]],
      ["Low-pass filter", "lp", [knob("lCut", "Cutoff", 0, 10), knob("lPeak", "Peak", 0, 10), knob("lMg", "MG/T.EXT", 0, 10), knob("lEg2", "EG2/EXT", 0, 10)]],
      ["MG", "mg", [knob("mgWave", "Waveform", 0, 10), knob("mgFreq", "Frequency", 0, 10)]],
      ["EG 1", "eg1", [knob("e1D", "Delay", 0, 10), knob("e1A", "Attack", 0, 10), knob("e1R", "Release", 0, 10)]],
      ["EG 2", "eg2", [knob("e2H", "Hold", 0, 10), knob("e2A", "Attack", 0, 10), knob("e2D", "Decay", 0, 10), knob("e2S", "Sustain", 0, 10), knob("e2R", "Release", 0, 10)]],
      ["Patch panel", "pp", [["cords", "Cords", "cords"], knob("vol", "Volume", 0, 10)]]],
    def: { s1: "8'", w1: "saw", pw1: 0, s2: "8'", w2: "saw", pitch2: 0, l1: 8, l2: 0, porta: 0, fmMg: 0, fmEg1: 0, hCut: 0, hPeak: 0, hMg: 0, hEg2: 0,
      lCut: 6, lPeak: 2, lMg: 0, lEg2: 4, mgWave: 5, mgFreq: 5, e1D: 0, e1A: 0, e1R: 3, e2H: 0, e2A: 0, e2D: 4, e2S: 6, e2R: 3, cords: [], vol: 6 },
    pg: { _: 5, voices: 1, osc: 5, pw: 5, ring: 5, noise: 5, hpf: 5, filter: 5, slope: ["WP", "Korg MS-20"], env: 6, lfo: 6, mods: 5, cords: 6, sh: ["K2", "PDF 4"], glide: 5, memory: 1, kbd: 5 },
    fc: { osc0: ["s1", "w1", "l1"], osc1: ["s2", "w2", "pitch2", "l2"], pw: ["pw1"], ring: ["w2"], noise: ["w1"], hpf: ["hCut", "hPeak"], filter: ["lCut", "lPeak", "lEg2"],
      env: ["e1D", "e1A", "e1R", "e2H", "e2A", "e2D", "e2S", "e2R"], lfo: ["mgWave", "mgFreq"], mods: ["fmMg", "fmEg1", "hMg", "hEg2", "lMg", "lEg2", "cords"], cords: ["cords"], glide: ["porta"], vol: ["vol"] },
    cap: { voices: 1, unison: false, oscN: 2, waves: [["tri", "saw", "pulse"], ["saw", "pulse"]], multi: false, pw: "knob1", tune: ["oct", "free"], kbdOff: [], noise: ["white"], sub: false, ring: true,
      fb: false, sync: false, filters: [["lp", 12]], hpf: "vc", selfOsc: true, kbd: [1], envs: "ms20", lfo: ["tri", "sq", "saw"], lfoHz: [0.1, 50], lfoDelay: false,
      mods: ["lfo>pitch", "lfo>cut", "lfo>hcut", "env>pitch", "env>cut", "env>hcut", "sh>pitch", "sh>cut", "noise>cut", "env>amp"], glide: true, bend: [0, 12], chorus: false, fm: false,
      wt: false, memory: 0, vel: false, accent: false, cords: true },
    flow: { osc: [["VCO-1", ["s1", "w1", "pw1", "l1"]], ["VCO-2", ["s2", "w2", "pitch2", "l2"]]], ring: ["w2"], hpf: ["hCut", "hPeak"], filter: ["lCut", "lPeak"], fenv: ["e2H", "e2A", "e2D", "e2S", "e2R"],
      aenv: ["e2A", "e2D", "e2S", "e2R"], lfo: ["mgWave", "mgFreq"] } };
  var MS_FEET = { "32'": -2, "16'": -1, "8'": 0, "4'": 1, "2'": 2 };
  function engMs20(s) {
    s = full("ms20", s);
    var w1 = {}; if (s.w1 !== "noise") w1[s.w1] = 1;
    var o1 = { on: s.w1 !== "noise" && s.l1 > 0, run: s.w2 === "ring", lvl: s.l1 / 10, waves: w1, pw: 0.5 - s.pw1 / 10 * 0.49, oct: MS_FEET[s.s1], semis: 0, kbd: true },
      w2 = s.w2 === "saw" ? { saw: 1 } : s.w2 === "ring" ? {} : { pulse: 1 },
      o2 = { on: s.w2 !== "ring" && s.l2 > 0, run: s.w2 === "ring", lvl: s.l2 / 10, waves: w2, pw: s.w2 === "pulse" ? 0.12 : 0.5, oct: MS_FEET[s.s2], semis: s.pitch2, kbd: true };
    var R = [];
    function rt(id, src, dst, v, amt) { if (v > 0) R.push({ id: id, src: [[src, 1]], dst: dst, amt: v / 10 * amt, gain: "fixed", normal: true }); }
    rt("fmMg", "lfo", ["p0", "p1"], s.fmMg, 12); rt("fmEg1", "env3", ["p0", "p1"], s.fmEg1, 24);
    rt("hMg", "lfo", ["hcut"], s.hMg, 4); rt("hEg2", "fenv", ["hcut"], s.hEg2, 6); rt("lMg", "lfo", ["cut"], s.lMg, 4);
    var eg2 = { a: expMap(s.e2A, MS.env[0], MS.env[1]), d: expMap(s.e2D, MS.env[0], MS.env[1]), s: s.e2S / 10, r: expMap(s.e2R, MS.env[0], MS.env[1]), lin: false };
    return base("ms20", { voices: 1, prio: "low", osc: [o1, o2, oscEmpty()], noise: { lvl: s.w1 === "noise" ? s.l1 / 10 : 0, pink: false },
      ring: s.w2 === "ring" && s.l2 > 0 ? { lvl: s.l2 / 10, kind: "ms20" } : null,
      hpf: { cut: s.hCut < 0.05 ? 0 : expMap(s.hCut, MS.hcut[0], MS.hcut[1]), res: s.hPeak / 10, kind: "svf", hot: true },
      model: "ms20", mode: "lp", slope: 12, cut: expMap(s.lCut, MS.lcut[0], MS.lcut[1]), res: s.lPeak / 10, env: s.lEg2 / 10 * 6, kbd: 1,
      fenv: eg2, aenv: Object.assign({ vel: 0 }, eg2), hold: s.e2H / 10 * 3,
      env3: { delay: s.e1D / 10 * 2, a: expMap(s.e1A, MS.env[0], MS.env[1]), d: 0.001, s: 1, r: expMap(s.e1R, MS.env[0], MS.env[1]), lin: false },
      lfo: { hz: expMap(s.mgFreq, MS.mg[0], MS.mg[1]), tri: 1, sq: 0, saw: 0, uni: false, skew: 0.02 + s.mgWave / 10 * 0.96 }, shHz: expMap(s.mgFreq, MS.mg[0], MS.mg[1]),
      routes: R.concat(cordRoutes("ms20", s.cords)), glide: s.porta > 0 ? expMap(s.porta, 0.005, 5) : 0, bend: 0, drift: 3, vol: s.vol / 10 });
  }

  // ---- Yamaha DX7 (FM: 6 operators, 32 algorithms) ----
  // The algorithm table: Raph Levien's Music Synthesizer for Android (Apache 2.0), operators listed 6 down to 1; per operator the
  // bus it reads (bits 4-5), the bus it writes (bits 0-1, 0 = the output), add instead of replace (bit 2), feedback in / out (bits
  // 6, 7). The DX7 manual (DX 24) gives the count (32) and checks the test makes: algorithm 1 has 2 carriers, 5 has 3 carriers and
  // 3 modulators, 16 has 1 carrier, 32 has 6 carriers and no modulators. The other diagrams were not checked against the panel's.
  var DX_ALG = [[0xc1, 0x11, 0x11, 0x14, 0x01, 0x14], [0x01, 0x11, 0x11, 0x14, 0xc1, 0x14], [0xc1, 0x11, 0x14, 0x01, 0x11, 0x14], [0x41, 0x11, 0x94, 0x01, 0x11, 0x14],
    [0xc1, 0x14, 0x01, 0x14, 0x01, 0x14], [0x41, 0x94, 0x01, 0x14, 0x01, 0x14], [0xc1, 0x11, 0x05, 0x14, 0x01, 0x14], [0x01, 0x11, 0xc5, 0x14, 0x01, 0x14],
    [0x01, 0x11, 0x05, 0x14, 0xc1, 0x14], [0x01, 0x05, 0x14, 0xc1, 0x11, 0x14], [0xc1, 0x05, 0x14, 0x01, 0x11, 0x14], [0x01, 0x05, 0x05, 0x14, 0xc1, 0x14],
    [0xc1, 0x05, 0x05, 0x14, 0x01, 0x14], [0xc1, 0x05, 0x11, 0x14, 0x01, 0x14], [0x01, 0x05, 0x11, 0x14, 0xc1, 0x14], [0xc1, 0x11, 0x02, 0x25, 0x05, 0x14],
    [0x01, 0x11, 0x02, 0x25, 0xc5, 0x14], [0x01, 0x11, 0x11, 0xc5, 0x05, 0x14], [0xc1, 0x14, 0x14, 0x01, 0x11, 0x14], [0x01, 0x05, 0x14, 0xc1, 0x14, 0x14],
    [0x01, 0x14, 0x14, 0xc1, 0x14, 0x14], [0xc1, 0x14, 0x14, 0x14, 0x01, 0x14], [0xc1, 0x14, 0x14, 0x01, 0x14, 0x04], [0xc1, 0x14, 0x14, 0x14, 0x04, 0x04],
    [0xc1, 0x14, 0x14, 0x04, 0x04, 0x04], [0xc1, 0x05, 0x14, 0x01, 0x14, 0x04], [0x01, 0x05, 0x14, 0xc1, 0x14, 0x04], [0x04, 0xc1, 0x11, 0x14, 0x01, 0x14],
    [0xc1, 0x14, 0x01, 0x14, 0x04, 0x04], [0x04, 0xc1, 0x11, 0x14, 0x04, 0x04], [0xc1, 0x14, 0x04, 0x04, 0x04, 0x04], [0xc4, 0x04, 0x04, 0x04, 0x04, 0x04]];
  SC.DX_ALG = DX_ALG;
  SC.dxCarriers = function (alg) { var r = []; DX_ALG[alg - 1].forEach(function (f, j) { if ((f & 3) === 0) r.push(6 - j); }); return r.sort(); };
  function dxT(R) { return 0.003 + 38 * Math.pow(2, -R / 7); }                // rate 0-99 -> seconds for a full sweep: this page's
  function dxR(t) { return Math.round(clamp(-7 * Math.log(Math.max(1e-4, t - 0.003) / 38) / Math.LN2, 0, 99)); }
  function dxAmp(L) { return L <= 0 ? 0 : Math.pow(2, (L - 99) / 8); }          // level 0-99 -> amplitude: this page's
  function dxL(a) { return a <= 0 ? 0 : Math.round(clamp(99 + 8 * Math.log(a) / Math.LN2, 0, 99)); }
  var dxGroups = [["Voice", "v", [knob("alg", "Algorithm", 1, 32, 1), knob("fb", "Feedback", 0, 7, 1), knob("lfoSpeed", "LFO speed", 0, 99, 1),
    ["lfoWave", "LFO wave", "sel", ["tri", "sawdown", "sawup", "square", "sine", "sh"]], knob("pmd", "Pitch mod depth", 0, 99, 1), knob("vol", "Volume", 0, 10)]]];
  var dxDef = { alg: 1, fb: 0, lfoSpeed: 35, lfoWave: "tri", pmd: 0, vol: 6 };
  for (var oi = 1; oi <= 6; oi++) {
    dxGroups.push(["Operator " + oi, "op" + oi, [knob("o" + oi + "c", "Coarse", 0, 31, 1), knob("o" + oi + "f", "Fine", 0, 99, 1), knob("o" + oi + "d", "Detune", -7, 7, 1), knob("o" + oi + "l", "Output level", 0, 99, 1),
      knob("o" + oi + "r1", "R1", 0, 99, 1), knob("o" + oi + "r2", "R2", 0, 99, 1), knob("o" + oi + "r3", "R3", 0, 99, 1), knob("o" + oi + "r4", "R4", 0, 99, 1),
      knob("o" + oi + "l1", "L1", 0, 99, 1), knob("o" + oi + "l2", "L2", 0, 99, 1), knob("o" + oi + "l3", "L3", 0, 99, 1), knob("o" + oi + "l4", "L4", 0, 99, 1)]]);
    // the initialised voice: every ratio 1.00, "square" envelopes, output levels 0 except operator 1 at 99 (DX 34)
    dxDef["o" + oi + "c"] = 1; dxDef["o" + oi + "f"] = 0; dxDef["o" + oi + "d"] = 0; dxDef["o" + oi + "l"] = oi === 1 ? 99 : 0;
    dxDef["o" + oi + "r1"] = 99; dxDef["o" + oi + "r2"] = 99; dxDef["o" + oi + "r3"] = 99; dxDef["o" + oi + "r4"] = 99;
    dxDef["o" + oi + "l1"] = 99; dxDef["o" + oi + "l2"] = 99; dxDef["o" + oi + "l3"] = 99; dxDef["o" + oi + "l4"] = 0;
  }
  var dxOps = [1, 2, 3, 4, 5, 6].map(function (i) { return "o" + i; });
  PROFILES.dx7 = { id: "dx7", name: "DX7", long: "after the Yamaha DX7 (1983): six operators, 32 algorithms", voices: 16, book: "DX", groups: dxGroups, def: dxDef,
    pg: { _: 23, voices: ["DX", "PDF 4"], osc: 23, fm: 24, fb: 25, filter: 35, env: 26, lfo: 62, mods: 21, memory: ["DX", "PDF 4"], pw: 62, noise: 62, wt: 23, sub: 23, chorus: 23 },
    fc: { fm: ["alg", "fb"].concat(dxOps.map(function (o) { return o + "l"; })), osc0: ["o1c", "o1f", "o1l"], osc1: ["o3c", "o3f", "o3l"], osc2: ["o5c", "o5f", "o5l"],
      filter: ["o2l", "o4l", "o6l"], env: [].concat.apply([], dxOps.map(function (o) { return [o + "r1", o + "r2", o + "r3", o + "r4", o + "l1", o + "l2", o + "l3", o + "l4"]; })),
      lfo: ["lfoSpeed", "lfoWave"], mods: ["pmd"], vol: ["vol"], memory: [] },
    cap: { voices: 16, unison: false, oscN: 3, waves: [["sine"], ["sine"], ["sine"]], multi: false, pw: "none", tune: ["ratio", "ratio", "ratio"], kbdOff: [], noise: false, sub: false, ring: false,
      fb: false, sync: false, filters: [], hpf: false, selfOsc: false, kbd: [0], envs: "dx", lfo: ["tri", "saw", "sq", "sine", "sh"], lfoHz: [0.06, 50], lfoDelay: true, mods: ["lfo>pitch", "lfo>amp"],
      glide: true, bend: [0, 12], chorus: false, fm: true, wt: false, memory: 32, vel: true, accent: false },
    flow: { fm: true } };
  function engDx7(s) {
    s = full("dx7", s);
    var ops = [], relMax = 0.05, car = SC.dxCarriers(s.alg);
    for (var j = 0; j < 6; j++) {
      var i = 6 - j, p = "o" + i, c = s[p + "c"];
      var op = { n: i, ratio: (c === 0 ? 0.5 : c) * (1 + s[p + "f"] / 100), det: s[p + "d"], lvl: s[p + "l"], r: [s[p + "r1"], s[p + "r2"], s[p + "r3"], s[p + "r4"]].map(dxT), l: [s[p + "l1"], s[p + "l2"], s[p + "l3"], s[p + "l4"]] };
      if (car.indexOf(i) >= 0 && op.lvl > 0) relMax = Math.max(relMax, op.r[3]);
      ops.push(op);
    }
    var lw = s.lfoWave, R = [];
    if (s.pmd > 0) R.push({ id: "pmd", src: [[lw === "sh" ? "shL" : lw === "square" ? "lfo" : "lfo", 1]], dst: ["p0"], amt: s.pmd / 99 * 2, gain: "fixed" });
    return base("dx7", { voices: 16, prio: "last", osc: [oscEmpty(), oscEmpty(), oscEmpty()], model: "none", slope: 0, cut: 20000, res: 0, env: 0, kbd: 0,
      fm: { alg: s.alg, fb: s.fb, ops: ops }, fenv: { a: 0.001, d: 0.1, s: 1, r: 0.05, lin: false }, aenv: { a: 0.001, d: 0.001, s: 1, r: relMax * 1.2, lin: false, vel: 0 },
      lfo: { hz: expMap(s.lfoSpeed / 9.9, 0.06, 50), tri: lw === "tri" ? 1 : 0, sine: lw === "sine" ? 1 : 0, sq: lw === "square" ? 1 : 0, saw: lw === "sawup" ? 1 : lw === "sawdown" ? -1 : 0, uni: false },
      routes: R, bend: 2, drift: 0, vol: s.vol / 10 });
  }

  // ---- PPG Wave 2.2 / 2.3 (wavetables) ----
  var PPG_TABLES = ["sweep", "pulse", "formant", "organ"];   // this page's own four tables, not the PPG's ROM
  PROFILES.ppg = { id: "ppg", name: "PPG Wave", long: "after the PPG Wave 2.2 / 2.3 (1982-84): wavetable oscillators into analog filters", voices: 8, book: "PG",
    groups: [["Waves", "wv", [["table", "Wavetable", "sel", PPG_TABLES], knob("waveA", "Osc A wave", 0, 63, 1), knob("waveB", "Osc B wave", 0, 63, 1), knob("semiB", "Osc B semitones", -24, 24, 1),
      knob("detB", "Osc B detune", 0, 63, 1), knob("mixB", "Osc B level", 0, 63, 1), knob("envWave", "Env 1 → wave", 0, 63, 1), knob("lfoWave", "LFO → wave", 0, 63, 1)]],
      ["Filter", "vcf", [knob("cutoff", "Cutoff", 0, 63, 1), knob("emph", "Emphasis", 0, 63, 1), knob("envF", "Env 1 → filter", 0, 63, 1), knob("kbdF", "Keyboard → filter", 0, 63, 1)]],
      ["Envelopes", "env", [knob("e1A", "Env 1 attack", 0, 63, 1), knob("e1D", "Env 1 decay", 0, 63, 1), knob("e1S", "Env 1 sustain", 0, 63, 1), knob("e1R", "Env 1 release", 0, 63, 1),
        knob("e2A", "VCA attack", 0, 63, 1), knob("e2D", "VCA decay", 0, 63, 1), knob("e2S", "VCA sustain", 0, 63, 1), knob("e2R", "VCA release", 0, 63, 1)]],
      ["LFO and output", "lfo", [knob("lfoRate", "LFO rate", 0, 63, 1), knob("lfoDelay", "LFO delay", 0, 63, 1), ["lfoShape", "LFO shape", "sel", ["tri", "saw", "square", "random"]], knob("lfoPitch", "LFO → pitch", 0, 63, 1), knob("vol", "Volume", 0, 63, 1)]]],
    def: { table: "sweep", waveA: 20, waveB: 20, semiB: 0, detB: 0, mixB: 0, envWave: 0, lfoWave: 0, cutoff: 45, emph: 0, envF: 15, kbdF: 32,
      e1A: 0, e1D: 30, e1S: 30, e1R: 20, e2A: 0, e2D: 30, e2S: 63, e2R: 20, lfoRate: 30, lfoDelay: 0, lfoShape: "tri", lfoPitch: 0, vol: 40 },
    pg: { _: 5, voices: 5, osc: ["WP", "PPG Wave"], wt: ["SOS", "PPG Wave 2.3"], filter: 5, slope: ["WP", "PPG Wave"], env: 5, lfo: 5, mods: ["WP", "PPG Wave"], memory: 5, sub: 5, noise: 5 },
    fc: { osc0: ["table", "waveA"], osc1: ["table", "waveB", "semiB", "detB", "mixB"], wt: ["table", "waveA", "waveB", "envWave", "lfoWave"], filter: ["cutoff", "emph", "envF"], kbd: ["kbdF"],
      env: ["e1A", "e1D", "e1S", "e1R", "e2A", "e2D", "e2S", "e2R"], lfo: ["lfoRate", "lfoDelay", "lfoShape"], mods: ["envWave", "lfoWave", "lfoPitch", "envF"], vol: ["vol"], memory: [] },
    cap: { voices: 8, unison: false, oscN: 2, waves: [["wt"], ["wt"]], multi: false, pw: "table", tune: ["fixed", "semi+"], kbdOff: [], noise: false, sub: false, ring: false, fb: false, sync: false,
      filters: [["lp", 24]], hpf: false, selfOsc: true, kbd: "free", envs: "adsr2", lfo: ["tri", "saw", "sq", "sh"], lfoHz: [0.05, 30], lfoDelay: true, mods: ["lfo>pitch", "lfo>wt", "env>wt", "env>cut", "lfo>cut"],
      glide: false, bend: [2, 2], chorus: false, fm: false, wt: true, memory: 100, vel: false, accent: false },
    flow: { osc: [["Osc A", ["table", "waveA"]], ["Osc B", ["table", "waveB", "semiB", "mixB"]]], filter: ["cutoff", "emph"], fenv: ["e1A", "e1D", "e1S", "e1R", "envF", "envWave"], aenv: ["e2A", "e2D", "e2S", "e2R"], lfo: ["lfoRate", "lfoShape"] } };
  function engPpg(s) {
    s = full("ppg", s);
    var t = PPG_TABLES.indexOf(s.table), R = [], ls = s.lfoShape;
    var oA = { on: true, lvl: 0.75, waves: {}, wt: { t: t, pos: s.waveA }, pw: 0.5, oct: 0, semis: 0, kbd: true },
      oB = { on: s.mixB > 0, lvl: s.mixB / 63 * 0.75, waves: {}, wt: { t: t, pos: s.waveB }, pw: 0.5, oct: 0, semis: s.semiB + s.detB / 63 * 0.5, kbd: true };
    var L = [[ls === "random" ? "shL" : "lfo", 1]];
    if (s.envWave > 0) R.push({ id: "envWave", src: [["fenv", 1]], dst: ["wt"], amt: s.envWave, gain: "fixed" });
    if (s.lfoWave > 0) R.push({ id: "lfoWave", src: L, dst: ["wt"], amt: s.lfoWave / 2, gain: "fixed" });
    if (s.lfoPitch > 0) R.push({ id: "lfoPitch", src: L, dst: ["p0", "p1"], amt: s.lfoPitch / 63 * 3, gain: "fixed", curve: "sq" });
    function e(a, d, ss, r) { return { a: expMap(k63(a), PP.env[0], PP.env[1]), d: expMap(k63(d), PP.env[0], PP.env[1]), s: ss / 63, r: expMap(k63(r), PP.env[0], PP.env[1]), lin: false }; }
    return base("ppg", { voices: 8, prio: "last", osc: [oA, oB, oscEmpty()], model: "ssm", slope: 24, cut: expMap(k63(s.cutoff), PP.cut[0], PP.cut[1]), res: s.emph / 63, env: s.envF / 63 * 6, kbd: s.kbdF / 63,
      fenv: e(s.e1A, s.e1D, s.e1S, s.e1R), aenv: Object.assign({ vel: 0 }, e(s.e2A, s.e2D, s.e2S, s.e2R)),
      lfo: { hz: expMap(k63(s.lfoRate), PP.lfo[0], PP.lfo[1]), tri: ls === "tri" ? 1 : 0, saw: ls === "saw" ? 1 : 0, sq: ls === "square" ? 1 : 0, uni: false, delay: s.lfoDelay / 63 * 3 },
      routes: R, bend: 2, drift: 0, vol: s.vol / 63 });
  }

  // =====================================================================================================================
  // SIX MORE: the Prophet-6 and five Moogs (Taurus, Voyager, Sub 37, Grandmother, Memorymoog)
  // =====================================================================================================================
  // P6 = Sequential, *Prophet-6 Operation Manual* (v1.0, 2015; printed = PDF - 10): six voices (p. 1), oscillators with continuously
  //      variable shape tri -> saw -> pulse, sync 1 to 2, osc 2 low freq / keyboard off (pp. 15-17), slop (p. 18), mixer with a
  //      triangle sub octave one octave below osc 1 (p. 19), 4-pole 24 dB LP + 2-pole 12 dB HP, both resonant, sharing one filter
  //      envelope with bipolar amounts, velocity and key tracking off / half / full (pp. 20-23), amp envelope with env amount (pp.
  //      24-26), two effect slots in series, A: bbd ddl CHO PH1 PH2, B: those + HAL rOO PLA SPr, a mix knob (pp. 26-28), LFO tri / saw /
  //      reverse saw / square / random to freq 1, freq 2, PW 1+2, amp, LP, HP (pp. 31-33), Poly Mod filter env / osc 2 to freq 1,
  //      shape 1, PW 1, LP, HP (pp. 33-34), analog distortion (p. 41), unison (p. 43). Effect parameter ranges, delay times below 1 s
  //      (p. 27 gives the 1 s maximum), reverb sizes and the phaser's sweep are not printed: this page's.
  // TA = Moog, *Taurus Model 205A Owner's & Service Manual* (scan, OCR; PDF pages): two oscillators, BEAT detunes B, three fixed
  //      presets + VARIABLE, octave foot switch, glide, filter contour attack / decay / amount, loudness attack / sustain / decay
  //      switch (PDF 3-5); specifications: sawtooth only, 24 dB VCF flat to oscillation, glide 0-0.5 s (PDF 6).
  // VO = Moog, *Minimoog Voyager Old School User's Manual* (PDF pages): three variable-waveform oscillators, noise, external input
  //      (PDF 6), sync and linear FM, Dual LP (two LPs in parallel) or HP/LP (in series = band-pass) with SPACING (PDF 8), two
  //      envelopes, mod busses, LFO triangle / square / S&H (PDF 9), the external input overdriving the mixer (PDF 11-12).
  // S25 = Moog, *Subsequent 25 Owner's Manual* (PDF pages). The Sub 37 / Subsequent 37 manual could not be downloaded (Moog's site
  //      serves its manuals through scripts; the mirrors refuse); the Subsequent 25 is the same family and its manual is cited for
  //      what they share: two oscillators with continuously variable waves tri -> saw -> square -> narrow pulse, hard sync osc 2,
  //      a square sub oscillator one octave below osc 1, noise, two ADSRs, a 20 Hz-20 kHz ladder LP, MultiDrive, Duo Mode: two
  //      notes through the one filter (PDF 9, 13-16). The Sub 37's own extras (more presets, a second mod bus, the arpeggiator and
  //      sequencer) are not on this panel.
  // GM = Moog, *Grandmother User's Manual* (PDF pages): spring reverb, ladder filter, 1-pole high-pass utility (PDF 7), glide
  //      (PDF 10), oscillators tri / saw / square / narrow, osc 2 +-7 semitones, sync osc 2 to osc 1 (PDF 11-12), ladder LP
  //      10 Hz-20 kHz 24 dB, key tracking off / half / 1:1, bipolar env amount (PDF 16-17), one ADSR (PDF 18-19), VCA ENV / KB RLS /
  //      DRONE and the reverb MIX (PDF 21), LFO sine / saw / ramp / square 0.07 Hz-1.3 kHz, its amounts through the MOD wheel (PDF 23).
  // MM = Moog, *Memorymoog Owner's Manual* (Model 345; scan, OCR; PDF pages): 100 programs, six voices of three oscillators, 24 dB
  //      LP, two ADSRs (PDF 5), mono mode and glide (PDF 9), LFO 0.1-100 Hz, triangle / saw up / saw down / square / S&H to osc
  //      1-3, PW 1-3 and filter (PDF 14), Voice Modulation from the filter contour or osc 3 to osc 1, osc 2, PW 1, PW 2, filter
  //      (PDF 15), octaves 16'-2', sync 2 to 1, waves pulse / saw / triangle combinable, osc 3 low and keyboard off (PDF 16),
  //      mixer clipping past 4-5, KB track 1/3 + 2/3, emphasis oscillating past 7 (PDF 17).
  // The five Moogs share this page's one ladder model: the filter differences between them are NOT measured, and the page says so.
  Object.assign(C, { P6: "Prophet-6 Operation Manual", TA: "Taurus 205A Owner's Manual", VO: "Voyager Old School User's Manual", S25: "Subsequent 25 Owner's Manual",
    GM: "Grandmother User's Manual", MM: "Memorymoog Owner's Manual" });
  function shapeW(sh) {   // a continuous shape 0 tri .. 1 saw .. 2 pulse as wave weights (the Prophet-6 and Subsequent's "in-between" waves)
    sh = clamp(sh, 0, 2); return sh <= 1 ? { tri: 1 - sh, saw: sh } : { saw: 2 - sh, pulse: sh - 1 };
  }
  function shapeOf(o) {   // canonical waves -> a shape position
    var w = o.waves, t = hasW(o, "tri") || hasW(o, "sine"), s = hasW(o, "saw") || hasW(o, "rsaw") || hasW(o, "trisaw") || hasW(o, "wt"), p = hasW(o, "pulse");
    return p && s ? 1.5 : p ? 2 : t && s ? 0.5 : t ? 0 : 1; }
  function voyW(w) { return w <= 2 ? [w, 0.5] : [2, 0.5 - (w - 2) * 0.4]; }   // Voyager / Subsequent wave 0 tri, 1 saw, 2 square, 3 narrow
  var P6X = { cut: [20, 20000], env: [0.001, 10], lfo: [0.05, 300] };   // this page's
  var FXA = ["off", "bbd", "ddl", "cho", "ph1", "ph2"], FXB = FXA.concat(["hal", "roo", "pla", "spr"]);
  var FXN = { bbd: "bucket-brigade delay", ddl: "digital delay", cho: "chorus", ph1: "phaser (high resonance)", ph2: "phaser (lower resonance)", hal: "hall reverb",
    roo: "room reverb", pla: "plate reverb", spr: "spring reverb", dist: "distortion" };

  // ---- Prophet-6 ----
  PROFILES.p6 = { id: "p6", name: "Prophet-6", long: "after the Sequential Prophet-6 (2015): six analog voices and two digital effects", voices: 6, book: "P6",
    groups: [["Oscillator 1", "o1", [knob("o1Freq", "Frequency", 0, 48, 1), knob("o1Shape", "Shape", 0, 2, 0.05), knob("o1Pw", "Pulse width", 0, 10), ["sync", "Sync", "s"]]],
      ["Oscillator 2", "o2", [knob("o2Freq", "Frequency", 0, 48, 1), knob("o2Fine", "Fine (cents)", -50, 50, 1), knob("o2Shape", "Shape", 0, 2, 0.05), knob("o2Pw", "Pulse width", 0, 10),
        ["o2Lo", "Low freq", "s"], ["o2Kbd", "Keyboard", "s"], knob("slop", "Slop", 0, 10)]],
      ["Mixer", "mix", [knob("m1", "Osc 1", 0, 10), knob("m2", "Osc 2", 0, 10), knob("mSub", "Sub octave", 0, 10), knob("mN", "Noise", 0, 10)]],
      ["High-pass filter", "hpf", [knob("hCut", "Cutoff", 0, 10), knob("hRes", "Resonance", 0, 10), knob("hEnv", "Env amount", -10, 10), ["hVel", "Velocity", "s"], ["hKbd", "Keyboard", "sel", ["off", "half", "full"]]]],
      ["Low-pass filter", "lpf", [knob("lCut", "Cutoff", 0, 10), knob("lRes", "Resonance", 0, 10), knob("lEnv", "Env amount", -10, 10), ["lVel", "Velocity", "s"], ["lKbd", "Keyboard", "sel", ["off", "half", "full"]]]],
      ["Envelopes", "env", [knob("fA", "Filter attack", 0, 10), knob("fD", "Filter decay", 0, 10), knob("fS", "Filter sustain", 0, 10), knob("fR", "Filter release", 0, 10),
        knob("aAmt", "Amp env amount", 0, 10), knob("aA", "Amp attack", 0, 10), knob("aD", "Amp decay", 0, 10), knob("aS", "Amp sustain", 0, 10), knob("aR", "Amp release", 0, 10), ["aVel", "Amp velocity", "s"]]],
      ["LFO", "lfo", [knob("lfoFreq", "Frequency", 0, 10), knob("lfoInit", "Initial amount", 0, 10), ["lfoShape", "Shape", "sel", ["tri", "saw", "rsaw", "square", "random"]],
        ["lfF1", "→ Freq 1", "s"], ["lfF2", "→ Freq 2", "s"], ["lfPw", "→ PW 1+2", "s"], ["lfAmp", "→ Amp", "s"], ["lfLp", "→ LP filter", "s"], ["lfHp", "→ HP filter", "s"]]],
      ["Poly Mod", "pm", [knob("pmFenv", "Filter env", -10, 10), knob("pmOsc2", "Osc 2", -10, 10), ["pmF1", "→ Freq 1", "s"], ["pmSh1", "→ Shape 1", "s"], ["pmPw1", "→ PW 1", "s"], ["pmLp", "→ LP filter", "s"], ["pmHp", "→ HP filter", "s"]]],
      ["Effects", "fx", [["fxOn", "On / off", "s"], ["fxA", "Effect A", "sel", FXA], knob("aP1", "A param 1", 0, 10), knob("aP2", "A param 2", 0, 10), knob("aMix", "A mix", 0, 10),
        ["fxB", "Effect B", "sel", FXB], knob("bP1", "B param 1", 0, 10), knob("bP2", "B param 2", 0, 10), knob("bMix", "B mix", 0, 10), knob("dist", "Distortion", 0, 10)]],
      ["Performance", "perf", [knob("glide", "Glide rate", 0, 10), ["uni", "Unison", "s"], knob("uniN", "Unison voices", 1, 6, 1), knob("vol", "Program volume", 0, 10)]]],
    def: { o1Freq: 24, o1Shape: 1, o1Pw: 5, sync: false, o2Freq: 24, o2Fine: 0, o2Shape: 1, o2Pw: 5, o2Lo: false, o2Kbd: true, slop: 1, m1: 8, m2: 0, mSub: 0, mN: 0,
      hCut: 0, hRes: 0, hEnv: 0, hVel: false, hKbd: "off", lCut: 7, lRes: 0, lEnv: 3, lVel: false, lKbd: "half", fA: 0, fD: 5, fS: 5, fR: 3, aAmt: 10, aA: 0, aD: 5, aS: 10, aR: 3, aVel: false,
      lfoFreq: 5, lfoInit: 0, lfoShape: "tri", lfF1: false, lfF2: false, lfPw: false, lfAmp: false, lfLp: false, lfHp: false, pmFenv: 0, pmOsc2: 0, pmF1: false, pmSh1: false, pmPw1: false, pmLp: false, pmHp: false,
      fxOn: false, fxA: "off", aP1: 4, aP2: 4, aMix: 4, fxB: "off", bP1: 5, bP2: 4, bMix: 3, dist: 0, glide: 0, uni: false, uniN: 2, vol: 6 },
    pg: { _: 15, voices: 1, osc: 15, sub: 19, noise: 19, pw: 16, sync: 17, filter: 20, hpf: 20, slope: 20, kbd: 21, vel: 21, env: 22, lfo: 31, mods: 33, fx: 26, chorus: 27, drive: 41, glide: 42, memory: 4, fb: 19, ring: 15, fm: 34 },
    fc: { osc0: ["o1Freq", "o1Shape", "o1Pw", "m1"], osc1: ["o2Freq", "o2Fine", "o2Shape", "o2Pw", "o2Lo", "o2Kbd", "m2"], sub: ["mSub"], noise: ["mN"], sync: ["sync"], pw: ["o1Pw", "o2Pw"],
      hpf: ["hCut", "hRes", "hEnv"], filter: ["lCut", "lRes", "lEnv"], kbd: ["lKbd", "hKbd"], vel: ["lVel", "hVel", "aVel"], env: ["fA", "fD", "fS", "fR", "aA", "aD", "aS", "aR", "aAmt"],
      lfo: ["lfoFreq", "lfoShape", "lfoInit"], mods: ["lfoInit", "lfF1", "lfF2", "lfPw", "lfAmp", "lfLp", "lfHp", "pmFenv", "pmOsc2", "pmF1", "pmSh1", "pmPw1", "pmLp", "pmHp"],
      fx: ["fxOn", "fxA", "aP1", "aP2", "aMix", "fxB", "bP1", "bP2", "bMix"], chorus: ["fxOn", "fxA"], drive: ["dist"], glide: ["glide"], voices: ["uni", "uniN"], vol: ["vol"], memory: [] },
    cap: { voices: 6, unison: true, oscN: 2, waves: [["tri", "saw", "pulse"], ["tri", "saw", "pulse"]], multi: true, pw: "knob", tune: ["semi", "semi+"], kbdOff: [1], noise: ["white"], sub: true,
      ring: false, fb: false, sync: [0, 1], filters: [["lp", 24]], hpf: "vc", selfOsc: true, kbd: [0, 0.5, 1], envs: "adsr2", lfo: ["tri", "saw", "sq", "sh"], lfoHz: [0.05, 300], lfoDelay: false,
      mods: ["lfo>pitch", "lfo>pw", "lfo>amp", "lfo>cut", "lfo>hcut", "sh>pitch", "sh>pw", "sh>cut", "env>pitch", "env>pw", "env>cut", "env>hcut", "osc>pitch", "osc>pw", "osc>cut"],
      glide: true, bend: [1, 24], chorus: false, fx: ["bbd", "ddl", "cho", "ph1", "ph2", "hal", "roo", "pla", "spr", "dist"], drive: false, fm: false, wt: false, memory: 500, vel: true, accent: false },
    flow: { osc: [["Osc 1", ["o1Shape", "o1Freq", "m1"]], ["Osc 2", ["o2Shape", "o2Freq", "m2"]], ["Sub", ["mSub"]]], noise: ["mN"], hpf: ["hCut", "hRes"], filter: ["lCut", "lRes"],
      fenv: ["fA", "fD", "fS", "fR", "lEnv"], aenv: ["aA", "aD", "aS", "aR", "aAmt"], lfo: ["lfoFreq", "lfoShape"], fx: ["fxOn", "fxA", "fxB"], fxName: "Effects" } };
  function p6Fx(s) {
    var L = [];
    if (s.dist > 0) L.push({ k: "dist", a: s.dist / 10, b: 0, mix: 1 });
    if (s.fxOn) [[s.fxA, s.aP1, s.aP2, s.aMix], [s.fxB, s.bP1, s.bP2, s.bMix]].forEach(function (x) { if (x[0] !== "off") L.push({ k: x[0], a: x[1] / 10, b: x[2] / 10, mix: x[3] / 10 }); });
    return L;
  }
  function engP6(s) {
    s = full("p6", s);
    var o1 = { on: s.m1 > 0, lvl: s.m1 / 10, waves: shapeW(s.o1Shape), shape: s.o1Shape, pw: pPw(s.o1Pw), oct: 0, semis: s.o1Freq - 24, kbd: true },
      o2 = { on: s.m2 > 0, run: true, lvl: s.m2 / 10, waves: shapeW(s.o2Shape), shape: s.o2Shape, pw: pPw(s.o2Pw), oct: s.o2Lo ? -7 : 0, semis: s.o2Freq - 24 + s.o2Fine / 100, kbd: s.o2Kbd },
      sub = { on: s.mSub > 0, lvl: s.mSub / 10, waves: { tri: 1 }, pw: 0.5, oct: -1, semis: s.o1Freq - 24, kbd: true, sub: true };
    var R = [], sh = s.lfoShape, L = { hz: expMap(s.lfoFreq, P6X.lfo[0], P6X.lfo[1]), tri: sh === "tri" ? 1 : 0, saw: sh === "saw" ? 1 : sh === "rsaw" ? -1 : 0, sq: sh === "square" ? 1 : 0, uni: sh !== "tri" && sh !== "random" };
    var ls = [[sh === "random" ? "shL" : "lfo", 1]];
    function lr(id, on, dst, amt) { if (on) R.push({ id: id, src: ls, dst: dst, amt: amt, gain: "init", init: s.lfoInit / 10 }); }
    lr("lfF1", s.lfF1, ["p0"], 3); lr("lfF2", s.lfF2, ["p1"], 3); lr("lfPw", s.lfPw, ["pw0", "pw1"], 0.4); lr("lfAmp", s.lfAmp, ["amp"], -1); lr("lfLp", s.lfLp, ["cut"], 3); lr("lfHp", s.lfHp, ["hcut"], 3);
    [["fenv", s.pmFenv], ["osc1", s.pmOsc2]].forEach(function (x) {
      if (!x[1]) return; var a = x[1] / 10;
      [["pmF1", ["p0"], x[0] === "osc1" ? 24 : 36], ["pmSh1", ["sh0"], 1], ["pmPw1", ["pw0"], 0.45], ["pmLp", ["cut"], 5], ["pmHp", ["hcut"], 5]].forEach(function (d) {
        if (s[d[0]]) R.push({ id: "pm-" + x[0] + "-" + d[0], src: [[x[0], 1]], dst: d[1], amt: a * d[2], gain: "fixed" }); });
    });
    if (s.hEnv) R.push({ id: "hEnv", src: [["fenv", 1]], dst: ["hcut"], amt: s.hEnv / 10 * 6, gain: "fixed" });
    var kb = { off: 0, half: 0.5, full: 1 };
    function e(a, d, ss, r) { return { a: expMap(a, P6X.env[0], P6X.env[1]), d: expMap(d, P6X.env[0], P6X.env[1]), s: ss / 10, r: expMap(r, P6X.env[0], P6X.env[1]), lin: false }; }
    return base("p6", { voices: s.uni ? 1 : 6, unison: s.uni ? s.uniN : 1, uniDet: 6, prio: "last", osc: [o1, o2, sub], sync: s.sync ? { slave: 0, master: 1 } : null,
      noise: { lvl: s.mN / 10, pink: false }, hpf: s.hCut > 0 || s.hEnv ? { kind: "svf", cut: s.hCut > 0 ? expMap(s.hCut, 20, 8000) : 10, res: s.hRes / 10 * 0.9 } : null,
      model: "cem", slope: 24, cut: expMap(s.lCut, P6X.cut[0], P6X.cut[1]), res: s.lRes / 10, env: s.lEnv / 10 * 6, kbd: kb[s.lKbd], velF: s.lVel ? 2 : 0,
      fenv: e(s.fA, s.fD, s.fS, s.fR), aenv: Object.assign({ vel: s.aVel ? 1 : 0 }, e(s.aA, s.aD, s.aS, s.aR)), lfo: L, routes: R,
      glide: s.glide > 0 ? expMap(s.glide, 0.005, 5) : 0, bend: 2, drift: s.slop * 1.5, fx: p6Fx(s), vol: s.vol / 10 * (0.3 + 0.7 * s.aAmt / 10) });
  }
  PROFILES.p6.apply = function (c, s, I) {
    s.m1 = 0; s.m2 = 0;
    I.osc.forEach(function (o, i) {
      var p = "o" + (i + 1); s[p + "Shape"] = shapeOf(o); if (hasW(o, "pulse")) s[p + "Pw"] = r1(clamp(pPwInv(o.pw), 0, 10));
      s[p + "Freq"] = clamp(Math.round(o.semis) + 24, 0, 48); if (i === 1) { s.o2Fine = clamp(Math.round((o.semis - Math.round(o.semis)) * 100), -50, 50); s.o2Kbd = o.kbd; if (!o.kbd && o.semis < -30) { s.o2Lo = true; s.o2Freq = clamp(Math.round(o.semis + 84) + 24, 0, 48); } }
      s["m" + (i + 1)] = r1(o.lvl * 10);
    });
    if (I.sub) s.mSub = r1(clamp(I.sub * 10, 0, 10)); if (I.noise) s.mN = r1(I.noise.lvl * 10); s.sync = !!I.sync;
    var f = I.filter; s.lCut = r1(clamp(expInv(f.cut, P6X.cut[0], P6X.cut[1]), 0, 10)); s.lRes = r1(f.res * 10); s.lEnv = r1(clamp(f.env / 6 * 10, -10, 10));
    s.lKbd = f.kbd > 0.75 ? "full" : f.kbd > 0.25 ? "half" : "off";
    if (I.hpf && I.hpf.cut > 0) { s.hCut = r1(clamp(expInv(Math.max(20, I.hpf.cut), 20, 8000), 0, 10)); s.hRes = r1(clamp((I.hpf.res || 0) / 0.9 * 10, 0, 10)); }
    s.fA = eIn(I.fenv.a, P6X.env); s.fD = eIn(I.fenv.d, P6X.env); s.fS = r1(I.fenv.s * 10); s.fR = eIn(I.fenv.r, P6X.env);
    s.aA = eIn(I.aenv.a, P6X.env); s.aD = eIn(I.aenv.d, P6X.env); s.aS = r1(I.aenv.s * 10); s.aR = eIn(I.aenv.r, P6X.env); s.aVel = !!(c.aenv && c.aenv.vel); s.lVel = !!c.velF;
    if (I.lfo) { s.lfoFreq = eIn(I.lfo.hz, P6X.lfo); s.lfoShape = { tri: "tri", sine: "tri", saw: "saw", sq: "square", sh: "random" }[I.lfo.shape] || "tri"; }
    var lp = mk(I, "lfo>pitch") || mk(I, "sh>pitch"), lw = mk(I, "lfo>pw") || mk(I, "sh>pw"), lc = mk(I, "lfo>cut") || mk(I, "sh>cut"), la = mk(I, "lfo>amp"), lh = mk(I, "lfo>hcut");
    if (lp) { s.lfF1 = s.lfF2 = true; s.lfoInit = Math.max(s.lfoInit, r1(clamp(lp.amt / 3 * 10, 0, 10))); } if (lw) { s.lfPw = true; s.lfoInit = Math.max(s.lfoInit, r1(clamp(lw.amt / 0.4 * 10, 0, 10))); }
    if (lc) { s.lfLp = true; s.lfoInit = Math.max(s.lfoInit, r1(clamp(lc.amt / 3 * 10, 0, 10))); } if (la) s.lfAmp = true; if (lh) s.lfHp = true;
    var ep = mk(I, "env>pitch"), ew = mk(I, "env>pw"), op = mk(I, "osc>pitch"), eh = mk(I, "env>hcut");
    if (ep) { s.pmF1 = true; s.pmFenv = r1(clamp(ep.amt / 36 * 10, -10, 10)); } if (ew) { s.pmPw1 = true; s.pmFenv = s.pmFenv || r1(clamp(ew.amt / 0.45 * 10, -10, 10)); }
    if (op) { s.pmF1 = true; s.pmOsc2 = r1(clamp(op.amt / 24 * 10, -10, 10)); } if (eh) s.hEnv = r1(clamp(eh.amt / 6 * 10, -10, 10));
    var fx = I.fx || []; s.fxOn = fx.some(function (f) { return f.k !== "dist"; });
    var a = fx.filter(function (f) { return FXA.indexOf(f.k) > 0; })[0], b = fx.filter(function (f) { return f !== a && FXB.indexOf(f.k) > 0; })[0], d = fx.filter(function (f) { return f.k === "dist"; })[0];
    if (a) { s.fxA = a.k; s.aP1 = r1(a.a * 10); s.aP2 = r1(a.b * 10); s.aMix = r1(a.mix * 10); } if (b) { s.fxB = b.k; s.bP1 = r1(b.a * 10); s.bP2 = r1(b.b * 10); s.bMix = r1(b.mix * 10); }
    if (d) s.dist = r1(d.a * 10);
    s.uni = I.voices === 1; s.uniN = clamp(I.unison || 1, 1, 6); s.glide = I.glide > 0 ? r1(clamp(expInv(I.glide, 0.005, 5), 0, 10)) : 0; s.vol = r1(c.vol * 10);
  };

  // ---- the five Moogs: one ladder model, each with its own panel ----
  var MG = { cut: [10, 20000], env: [0.001, 10], lfo: [0.07, 1300] };   // GM 16, 23 (cutoff, LFO range); envelope times this page's
  function moogEnv(a, d, ss, r) { return { a: expMap(a, MG.env[0], MG.env[1]), d: expMap(d, 0.004, 15), s: ss / 10, r: expMap(r, 0.004, 15), lin: false }; }
  function moogEnvIn(e, s, p) { s[p + "A"] = eIn(e.a, MG.env); s[p + "D"] = eIn(e.d, [0.004, 15]); s[p + "S"] = r1(e.s * 10); if (p + "R" in s) s[p + "R"] = eIn(e.r, [0.004, 15]); }
  var FEET5 = ["32'", "16'", "8'", "4'", "2'"], F5 = { "32'": -2, "16'": -1, "8'": 0, "4'": 1, "2'": 2, "1'": 3 };

  // Taurus 205A (the Taurus III follows it, Wikipedia)
  PROFILES.taurus = { id: "taurus", name: "Taurus", long: "after the Moog Taurus 205A bass pedals (1975; the Taurus III of 2010 follows it)", voices: 1, book: "TA",
    groups: [["Tone sources", "src", [["range", "Octave", "sel", ["LO", "MED", "HI"]], knob("beat", "Beat (osc B detune)", -1, 1, 0.01), knob("bFreq", "Osc B freq (semis)", -12, 12, 1), knob("mixB", "Osc B level", 0, 10)]],
      ["Filter", "flt", [knob("cutoff", "Cutoff", 0, 10), knob("emph", "Emphasis", 0, 10), knob("cAmt", "Contour amount", 0, 10), knob("cA", "Contour attack", 0, 10), knob("cD", "Contour decay", 0, 10)]],
      ["Loudness", "amp", [knob("lA", "Attack", 0, 10), knob("lS", "Sustain level", 0, 10), ["decaySw", "Decay", "s"], knob("lD", "Decay", 0, 10)]],
      ["Glide and output", "out", [["glideOn", "Glide", "s"], knob("glide", "Glide amount", 0, 10), knob("vol", "Loudness", 0, 10)]]],
    def: { range: "LO", beat: 0.1, bFreq: 0, mixB: 7, cutoff: 3.5, emph: 2, cAmt: 5, cA: 0, cD: 4, lA: 0, lS: 8, decaySw: true, lD: 4, glideOn: false, glide: 3, vol: 7 },
    pg: { _: ["TA", "PDF 3"], voices: ["WP", "Moog Taurus"], osc: ["TA", "PDF 3"], filter: ["TA", "PDF 6"], slope: ["TA", "PDF 6"], env: ["TA", "PDF 5"], glide: ["TA", "PDF 5"], memory: ["TA", "PDF 3"], lfo: ["WP", "Moog Taurus"], mods: ["WP", "Moog Taurus"] },
    fc: { osc0: ["range"], osc1: ["beat", "bFreq", "mixB"], filter: ["cutoff", "emph", "cAmt"], env: ["cA", "cD", "lA", "lS", "lD", "decaySw"], glide: ["glideOn", "glide"], vol: ["vol"], memory: [], voices: [] },
    cap: { voices: 1, unison: false, oscN: 2, waves: [["saw"], ["saw"]], multi: false, pw: "none", tune: ["oct", "free"], kbdOff: [], noise: false, sub: false, ring: false, fb: false, sync: false,
      filters: [["lp", 24]], hpf: false, selfOsc: true, kbd: [0.5], envs: "ads", lfo: [], lfoHz: [0, 0], lfoDelay: false, mods: ["env>cut"], glide: true, bend: false, chorus: false, fm: false, wt: false, memory: 4, vel: false, accent: false },
    flow: { osc: [["Osc A", ["range"]], ["Osc B", ["beat", "bFreq", "mixB"]]], filter: ["cutoff", "emph"], fenv: ["cA", "cD", "cAmt"], aenv: ["lA", "lS", "lD", "decaySw"] } };
  function engTaurus(s) {
    s = full("taurus", s);
    var oc = { LO: -1, MED: 0, HI: 1 }[s.range];
    var a = { on: true, lvl: 0.8, waves: { saw: 1 }, pw: 0.5, oct: oc, semis: 0, kbd: true }, b = { on: s.mixB > 0, lvl: s.mixB / 10 * 0.8, waves: { saw: 1 }, pw: 0.5, oct: oc, semis: s.bFreq + s.beat * 0.3, kbd: true };
    var r = s.decaySw ? expMap(s.lD, 0.004, 15) : 0.008;
    return base("taurus", { voices: 1, prio: "low", legato: true, osc: [a, b, oscEmpty()], model: "ladder", slope: 24, cut: expMap(s.cutoff, 20, 12000), res: s.emph / 10, env: s.cAmt / 10 * 4, kbd: 0.5,
      fenv: { a: expMap(s.cA, MG.env[0], MG.env[1]), d: expMap(s.cD, 0.004, 15), s: 0, r: expMap(s.cD, 0.004, 15), lin: false },
      aenv: { a: expMap(s.lA, MG.env[0], MG.env[1]), d: 0.3, s: s.lS / 10, r: r, lin: false, vel: 0 }, glide: s.glideOn ? expMap(s.glide, 0.005, 0.5) : 0, drift: 2, bend: 0, vol: s.vol / 10 });
  }
  PROFILES.taurus.apply = function (c, s, I) {
    var a = I.osc[0], b = I.osc[1];
    if (a) s.range = a.semis < -6 ? "LO" : a.semis < 6 ? "MED" : "HI";
    if (b) { var d = b.semis - (a ? a.semis : 0); s.bFreq = clamp(Math.round(d), -12, 12); s.beat = r1(clamp((d - Math.round(d)) / 0.3, -1, 1) * 100) / 100; s.mixB = r1(b.lvl * 10); } else s.mixB = 0;
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, 20, 12000), 0, 10)); s.emph = r1(f.res * 10); s.cAmt = r1(clamp(Math.abs(f.env) / 4 * 10, 0, 10));
    s.cA = eIn(I.fenv.a, MG.env); s.cD = eIn(I.fenv.d, [0.004, 15]); s.lA = eIn(I.aenv.a, MG.env); s.lS = r1(I.aenv.s * 10); s.decaySw = I.aenv.r > 0.05; s.lD = eIn(I.aenv.r, [0.004, 15]);
    s.glideOn = I.glide > 0; if (I.glide > 0) s.glide = r1(clamp(expInv(I.glide, 0.005, 0.5), 0, 10)); s.vol = r1(c.vol * 10);
  };

  // Minimoog Voyager (Old School)
  var VO_SRC = ["tri", "square", "sh", "osc3", "noise", "fenv"], VO_DST = ["pitch", "osc2", "filter", "wave"];
  PROFILES.voyager = { id: "voyager", name: "Voyager", long: "after the Minimoog Voyager (2002; the Old School panel, 2008)", voices: 1, book: "VO",
    groups: [["Oscillators", "osc", [["o1Oct", "Osc 1 octave", "sel", FEET5], knob("o1Wave", "Osc 1 wave", 0, 3, 0.05), ["o2Oct", "Osc 2 octave", "sel", FEET5], knob("o2Freq", "Osc 2 freq", -7, 7, 0.01), knob("o2Wave", "Osc 2 wave", 0, 3, 0.05),
        ["o3Oct", "Osc 3 octave", "sel", FEET5], knob("o3Freq", "Osc 3 freq", -7, 7, 0.01), knob("o3Wave", "Osc 3 wave", 0, 3, 0.05), ["sync", "1-2 sync", "s"], ["linFm", "3-1 FM", "s"], ["o3Kbd", "Osc 3 keyboard", "s"]]],
      ["Mixer", "mix", [knob("m1", "Osc 1", 0, 10), knob("m2", "Osc 2", 0, 10), knob("m3", "Osc 3", 0, 10), knob("mN", "Noise", 0, 10), knob("ext", "External (fed back)", 0, 10)]],
      ["Filters", "flt", [["mode", "Mode", "sel", ["dual", "hplp"]], knob("cutoff", "Cutoff", 0, 10), knob("space", "Spacing (oct)", -3, 3, 0.1), knob("res", "Resonance", 0, 10), knob("kbd", "Keyboard control", 0, 10), knob("fAmt", "Envelope amount", -5, 5, 0.1)]],
      ["Envelopes", "env", [knob("fA", "Filter attack", 0, 10), knob("fD", "Filter decay", 0, 10), knob("fS", "Filter sustain", 0, 10), knob("fR", "Filter release", 0, 10),
        knob("aA", "Amp attack", 0, 10), knob("aD", "Amp decay", 0, 10), knob("aS", "Amp sustain", 0, 10), knob("aR", "Amp release", 0, 10)]],
      ["Modulation bus", "mod", [knob("lfoRate", "LFO rate", 0, 10), ["modSrc", "Source", "sel", VO_SRC], ["modDst", "Destination", "sel", VO_DST], knob("modAmt", "Amount (wheel)", 0, 10)]],
      ["Output", "out", [["glideOn", "Glide", "s"], knob("glide", "Glide rate", 0, 10), knob("vol", "Volume", 0, 10)]]],
    def: { o1Oct: "8'", o1Wave: 1, o2Oct: "8'", o2Freq: 0, o2Wave: 1, o3Oct: "8'", o3Freq: 0, o3Wave: 1, sync: false, linFm: false, o3Kbd: true, m1: 8, m2: 0, m3: 0, mN: 0, ext: 0,
      mode: "dual", cutoff: 5, space: 0, res: 0, kbd: 5, fAmt: 2, fA: 0, fD: 4, fS: 5, fR: 3, aA: 0, aD: 4, aS: 10, aR: 3, lfoRate: 5, modSrc: "tri", modDst: "pitch", modAmt: 0, glideOn: false, glide: 3, vol: 6 },
    pg: { _: ["VO", "PDF 8"], voices: ["VO", "PDF 6"], osc: ["VO", "PDF 6"], sync: ["VO", "PDF 8"], fm: ["VO", "PDF 8"], noise: ["VO", "PDF 6"], fb: ["VO", "PDF 12"], filter: ["VO", "PDF 8"], hpf: ["VO", "PDF 8"],
      slope: ["VO", "PDF 8"], env: ["VO", "PDF 8"], lfo: ["VO", "PDF 9"], mods: ["VO", "PDF 9"], glide: ["VO", "PDF 8"], memory: ["WP", "Minimoog Voyager"], kbd: ["VO", "PDF 8"], pw: ["VO", "PDF 8"] },
    fc: { osc0: ["o1Oct", "o1Wave", "m1"], osc1: ["o2Oct", "o2Freq", "o2Wave", "m2"], osc2: ["o3Oct", "o3Freq", "o3Wave", "o3Kbd", "m3"], noise: ["mN"], fb: ["ext"], sync: ["sync"], pw: ["o1Wave", "o2Wave", "o3Wave"],
      filter: ["mode", "cutoff", "space", "res", "fAmt"], hpf: ["mode", "space"], kbd: ["kbd"], env: ["fA", "fD", "fS", "fR", "aA", "aD", "aS", "aR"], lfo: ["lfoRate"], mods: ["modSrc", "modDst", "modAmt", "linFm"],
      glide: ["glideOn", "glide"], vol: ["vol"], memory: [], voices: [] },
    cap: { voices: 1, unison: false, oscN: 3, waves: [["tri", "saw", "pulse"], ["tri", "saw", "pulse"], ["tri", "saw", "pulse"]], multi: true, pw: "knob", tune: ["oct", "free", "free"], kbdOff: [2],
      noise: ["white"], sub: false, ring: false, fb: true, sync: [1, 0], filters: [["lp", 24], ["bp", 24]], hpf: "vc", selfOsc: true, kbd: "free", envs: "adsr2", lfo: ["tri", "sq", "sh"], lfoHz: [0.2, 50],
      lfoDelay: false, mods: ["lfo>pitch", "lfo>cut", "lfo>pw", "sh>pitch", "sh>cut", "osc>pitch", "osc>cut", "noise>pitch", "noise>cut", "env>pitch", "env>cut", "env>pw"], wheelOnly: true,
      glide: true, bend: [2, 12], chorus: false, fm: false, wt: false, memory: 0, vel: false, accent: false },
    flow: { osc: [["Osc 1", ["o1Wave", "m1"]], ["Osc 2", ["o2Wave", "o2Freq", "m2"]], ["Osc 3", ["o3Wave", "o3Freq", "m3"]]], noise: ["mN"], filter: ["mode", "cutoff", "space", "res"],
      fenv: ["fA", "fD", "fS", "fR", "fAmt"], aenv: ["aA", "aD", "aS", "aR"], lfo: ["lfoRate", "modSrc"] } };
  function vOsc(oct, freq, wave, lvl, kbd) { var w = voyW(wave); return { on: lvl > 0, lvl: lvl / 10, waves: shapeW(w[0]), shape: w[0], pw: w[1], oct: F5[oct], semis: freq, kbd: kbd !== false }; }
  function engVoyager(s) {
    s = full("voyager", s);
    var o = [vOsc(s.o1Oct, 0, s.o1Wave, s.m1), vOsc(s.o2Oct, s.o2Freq, s.o2Wave, s.m2), vOsc(s.o3Oct, s.o3Freq, s.o3Wave, s.m3, s.o3Kbd)], R = [];
    if (s.linFm || s.modSrc === "osc3") o[2].run = true;
    if (s.linFm) R.push({ id: "linFm", src: [["osc2", 1]], dst: ["p0"], amt: 6, gain: "fixed" });
    if (s.modAmt > 0) {
      var src = { tri: "lfo", square: "lfoSq", sh: "sh", osc3: "osc2", noise: "noise", fenv: "fenv" }[s.modSrc], dst = { pitch: ["p0", "p1", "p2"], osc2: ["p1"], filter: ["cut"], wave: ["sh0", "sh1", "sh2"] }[s.modDst];
      var amt = s.modDst === "filter" ? 3 : s.modDst === "wave" ? 1 : 7;
      R.push({ id: "bus", src: [[src, 1]], dst: dst, amt: amt * s.modAmt / 10, gain: "wheel" });
    }
    return base("voyager", { voices: 1, prio: "low", legato: true, osc: o, sync: s.sync ? { slave: 1, master: 0 } : null, noise: { lvl: s.mN / 10, pink: false },
      fb: s.ext / 10 * s.vol / 10, model: "ladder", slope: 24, mode: "lp", dual: { mode: s.mode, sp: s.space }, cut: expMap(s.cutoff, 20, 20000), res: s.res / 10, env: s.fAmt / 5 * 4, kbd: s.kbd / 10,
      fenv: moogEnv(s.fA, s.fD, s.fS, s.fR), aenv: Object.assign({ vel: 0 }, moogEnv(s.aA, s.aD, s.aS, s.aR)), lfo: { hz: expMap(s.lfoRate, 0.2, 50), tri: 1, sq: 0, saw: 0, uni: false },
      shHz: s.modSrc === "sh" ? expMap(s.lfoRate, 0.2, 50) : 0, routes: R, glide: s.glideOn ? expMap(s.glide, 0.001, 10) : 0, drift: 1.5, vol: s.vol / 10 });
  }
  function moogOscIn(I, s, n, keys) {   // keys: [[octKey, freqKey|null, waveKey, lvlKey, kbdKey|null], ...]; continuous 0-3 waves
    keys.forEach(function (k) { s[k[3]] = 0; });
    I.osc.slice(0, n).forEach(function (o, i) {
      var k = keys[i], sh = shapeOf(o), oc = clamp(Math.round(o.semis / 12), -2, 2);
      s[k[0]] = FEET5[oc + 2]; if (k[1]) s[k[1]] = r1(clamp(o.semis - oc * 12, -7, 7)); if (k[4]) s[k[4]] = o.kbd;
      s[k[2]] = hasW(o, "pulse") && !hasW(o, "saw") ? r1(2 + clamp((0.5 - o.pw) / 0.4, 0, 1)) : sh; s[k[3]] = r1(o.lvl * 10);
    });
  }
  PROFILES.voyager.apply = function (c, s, I) {
    moogOscIn(I, s, 3, [["o1Oct", null, "o1Wave", "m1"], ["o2Oct", "o2Freq", "o2Wave", "m2"], ["o3Oct", "o3Freq", "o3Wave", "m3", "o3Kbd"]]);
    if (I.noise) s.mN = r1(I.noise.lvl * 10); s.sync = !!I.sync; if (c.fb > 0) s.ext = r1(clamp(c.fb / Math.max(c.vol, 0.1) * 10, 0, 10));
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, 20, 20000), 0, 10)); s.res = r1(f.res * 10); s.fAmt = r1(clamp(f.env / 4 * 5, -5, 5)); s.kbd = r1(clamp(f.kbd * 10, 0, 10));
    if (f.mode === "bp" || (I.hpf && I.hpf.cut > 0)) { s.mode = "hplp"; s.space = I.hpf && I.hpf.cut > 0 ? r1(clamp(Math.log(f.cut / I.hpf.cut) / Math.LN2, -3, 3)) : 1; }
    moogEnvIn(I.fenv, s, "f"); moogEnvIn(I.aenv, s, "a");
    var pick = [["lfo>pitch", "tri", "pitch"], ["lfo>cut", "tri", "filter"], ["sh>pitch", "sh", "pitch"], ["sh>cut", "sh", "filter"], ["osc>pitch", "osc3", "pitch"], ["osc>cut", "osc3", "filter"],
      ["env>pitch", "fenv", "pitch"], ["noise>cut", "noise", "filter"], ["noise>pitch", "noise", "pitch"]].filter(function (x) { return mk(I, x[0]); })[0];
    if (pick) { var m = mk(I, pick[0]); s.modSrc = pick[1]; s.modDst = pick[2]; s.modAmt = r1(clamp(m.amt / (pick[2] === "filter" ? 3 : 7) * 10, 0, 10)); if (I.lfo) s.lfoRate = eIn(clamp(I.lfo.hz, 0.2, 50), [0.2, 50]); if (I.lfo && I.lfo.shape === "sq" && pick[1] === "tri") s.modSrc = "square"; }
    s.glideOn = I.glide > 0; if (I.glide > 0) s.glide = r1(clamp(expInv(I.glide, 0.001, 10), 0, 10)); s.vol = r1(c.vol * 10);
  };

  // Sub 37 (the Subsequent 25 manual for what the family shares)
  PROFILES.sub37 = { id: "sub37", name: "Sub 37", long: "after the Moog Sub 37 (2014) and Subsequent 37: paraphonic Duo mode, MultiDrive", voices: 1, book: "S25",
    groups: [["Oscillators", "osc", [["o1Oct", "Osc 1 octave", "sel", FEET5], knob("o1Wave", "Osc 1 wave", 0, 3, 0.05), ["o2Oct", "Osc 2 octave", "sel", FEET5], knob("o2Freq", "Osc 2 freq", -7, 7, 0.01),
        knob("o2Wave", "Osc 2 wave", 0, 3, 0.05), ["sync", "Hard sync osc 2", "s"], ["duo", "Duo mode", "s"]]],
      ["Mixer", "mix", [knob("m1", "Osc 1", 0, 10), knob("m2", "Osc 2", 0, 10), knob("mSub", "Sub osc", 0, 10), knob("mN", "Noise", 0, 10)]],
      ["Filter", "flt", [knob("cutoff", "Cutoff", 0, 10), knob("res", "Resonance", 0, 10), knob("drive", "MultiDrive", 0, 10), knob("fAmt", "EG amount", -5, 5, 0.1), knob("kbd", "KB amount", 0, 10)]],
      ["Envelopes", "env", [knob("fA", "Filter attack", 0, 10), knob("fD", "Filter decay", 0, 10), knob("fS", "Filter sustain", 0, 10), knob("fR", "Filter release", 0, 10),
        knob("aA", "Amp attack", 0, 10), knob("aD", "Amp decay", 0, 10), knob("aS", "Amp sustain", 0, 10), knob("aR", "Amp release", 0, 10)]],
      ["Modulation", "mod", [knob("lfoRate", "LFO rate", 0, 10), ["lfoWave", "LFO wave", "sel", ["tri", "square", "saw", "ramp", "sh"]], knob("pAmt", "Pitch amount", 0, 10), knob("cAmt", "Filter amount", 0, 10), knob("wAmt", "Wave amount", 0, 10)]],
      ["Output", "out", [knob("glide", "Glide rate", 0, 10), knob("vol", "Master volume", 0, 10)]]],
    def: { o1Oct: "16'", o1Wave: 1, o2Oct: "16'", o2Freq: 0, o2Wave: 1, sync: false, duo: false, m1: 8, m2: 0, mSub: 0, mN: 0, cutoff: 5, res: 0, drive: 2, fAmt: 2, kbd: 5,
      fA: 0, fD: 4, fS: 5, fR: 3, aA: 0, aD: 4, aS: 10, aR: 3, lfoRate: 5, lfoWave: "tri", pAmt: 0, cAmt: 0, wAmt: 0, glide: 0, vol: 6 },
    pg: { _: ["S25", "PDF 9"], voices: ["S25", "PDF 9"], osc: ["S25", "PDF 13"], sync: ["S25", "PDF 14"], sub: ["S25", "PDF 15"], noise: ["S25", "PDF 15"], filter: ["S25", "PDF 16"], drive: ["S25", "PDF 16"],
      slope: ["S25", "PDF 9"], env: ["S25", "PDF 9"], lfo: ["S25", "PDF 20"], mods: ["S25", "PDF 20"], glide: ["S25", "PDF 9"], memory: ["S25", "PDF 9"], kbd: ["S25", "PDF 16"], pw: ["S25", "PDF 13"] },
    fc: { osc0: ["o1Oct", "o1Wave", "m1"], osc1: ["o2Oct", "o2Freq", "o2Wave", "m2"], sub: ["mSub"], noise: ["mN"], sync: ["sync"], pw: ["o1Wave", "o2Wave"], filter: ["cutoff", "res", "fAmt"], drive: ["drive"], kbd: ["kbd"],
      env: ["fA", "fD", "fS", "fR", "aA", "aD", "aS", "aR"], lfo: ["lfoRate", "lfoWave"], mods: ["pAmt", "cAmt", "wAmt"], glide: ["glide"], vol: ["vol"], voices: ["duo"], memory: [] },
    cap: { voices: 1, para: true, unison: false, oscN: 2, waves: [["tri", "saw", "pulse"], ["tri", "saw", "pulse"]], multi: true, pw: "knob", tune: ["oct", "free"], kbdOff: [], noise: ["white"], sub: true,
      ring: false, fb: false, sync: [1, 0], filters: [["lp", 24]], hpf: false, selfOsc: true, kbd: "free", envs: "adsr2", lfo: ["tri", "sq", "saw", "sh"], lfoHz: [0.05, 100], lfoDelay: false,
      mods: ["lfo>pitch", "lfo>cut", "lfo>pw", "sh>pitch", "sh>cut", "sh>pw"], glide: true, bend: [2, 12], chorus: false, drive: true, fm: false, wt: false, memory: 16, vel: true, accent: false },
    flow: { osc: [["Osc 1", ["o1Wave", "m1"]], ["Osc 2", ["o2Wave", "o2Freq", "m2"]], ["Sub", ["mSub"]]], noise: ["mN"], filter: ["cutoff", "res", "drive"], fenv: ["fA", "fD", "fS", "fR", "fAmt"],
      aenv: ["aA", "aD", "aS", "aR"], lfo: ["lfoRate", "lfoWave"] } };
  function engSub37(s) {
    s = full("sub37", s);
    var o = [vOsc(s.o1Oct, 0, s.o1Wave, s.m1), vOsc(s.o2Oct, s.o2Freq, s.o2Wave, s.m2), { on: s.mSub > 0, lvl: s.mSub / 10, waves: { pulse: 1 }, pw: 0.5, oct: F5[s.o1Oct] - 1, semis: 0, kbd: true, sub: true }], R = [];
    var lw = s.lfoWave, L = { hz: expMap(s.lfoRate, 0.05, 100), tri: lw === "tri" ? 1 : 0, sq: lw === "square" ? 1 : 0, saw: lw === "saw" ? 1 : lw === "ramp" ? -1 : 0, uni: false }, ls = [[lw === "sh" ? "shL" : "lfo", 1]];
    if (s.pAmt > 0) R.push({ id: "pAmt", src: ls, dst: ["p0", "p1"], amt: s.pAmt / 10 * 6, gain: "fixed", curve: "sq" });
    if (s.cAmt > 0) R.push({ id: "cAmt", src: ls, dst: ["cut"], amt: s.cAmt / 10 * 4, gain: "fixed" });
    if (s.wAmt > 0) R.push({ id: "wAmt", src: ls, dst: ["sh0", "sh1"], amt: s.wAmt / 10, gain: "fixed" });
    return base("sub37", { voices: s.duo ? 2 : 1, para: !!s.duo, prio: "last", legato: true, osc: o, sync: s.sync ? { slave: 1, master: 0 } : null, noise: { lvl: s.mN / 10, pink: false },
      model: "ladder", slope: 24, drive: s.drive / 10, cut: expMap(s.cutoff, 20, 20000), res: s.res / 10, env: s.fAmt / 5 * 4, kbd: s.kbd / 10, velF: 0,
      fenv: moogEnv(s.fA, s.fD, s.fS, s.fR), aenv: Object.assign({ vel: 0 }, moogEnv(s.aA, s.aD, s.aS, s.aR)), lfo: L, routes: R, glide: s.glide > 0 ? expMap(s.glide, 0.005, 5) : 0, drift: 0.5, vol: s.vol / 10 });
  }
  PROFILES.sub37.apply = function (c, s, I) {
    moogOscIn(I, s, 2, [["o1Oct", null, "o1Wave", "m1"], ["o2Oct", "o2Freq", "o2Wave", "m2"]]);
    if (I.sub) s.mSub = r1(clamp(I.sub * 10, 0, 10)); if (I.noise) s.mN = r1(I.noise.lvl * 10); s.sync = !!I.sync; s.duo = I.voices > 1;
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, 20, 20000), 0, 10)); s.res = r1(f.res * 10); s.fAmt = r1(clamp(f.env / 4 * 5, -5, 5)); s.kbd = r1(clamp(f.kbd * 10, 0, 10)); s.drive = c.drive ? r1(c.drive * 10) : 0;
    moogEnvIn(I.fenv, s, "f"); moogEnvIn(I.aenv, s, "a");
    if (I.lfo) { s.lfoRate = eIn(clamp(I.lfo.hz, 0.05, 100), [0.05, 100]); s.lfoWave = { tri: "tri", sine: "tri", sq: "square", saw: "saw", sh: "sh" }[I.lfo.shape] || "tri"; }
    var lp = mk(I, "lfo>pitch") || mk(I, "sh>pitch"), lc = mk(I, "lfo>cut") || mk(I, "sh>cut"); if (lp) s.pAmt = r1(clamp(Math.sqrt(lp.amt / 6) * 10, 0, 10)); if (lc) s.cAmt = r1(clamp(lc.amt / 4 * 10, 0, 10));
    s.glide = I.glide > 0 ? r1(clamp(expInv(I.glide, 0.005, 5), 0, 10)) : 0; s.vol = r1(c.vol * 10);
  };

  // Grandmother (semi-modular; one cord here: the high-pass utility between the mixer and the filter, as the manual's tip patches it)
  var GM_W = ["tri", "saw", "square", "narrow"];
  PROFILES.grandmother = { id: "grandmother", name: "Grandmother", long: "after the Moog Grandmother (manual ©2018): semi-modular, with a spring reverb", voices: 1, book: "GM",
    groups: [["Oscillators", "osc", [["o1Oct", "Osc 1 octave", "sel", ["32'", "16'", "8'", "4'"]], ["o1Wave", "Osc 1 wave", "sel", GM_W], ["o2Oct", "Osc 2 octave", "sel", ["16'", "8'", "4'", "2'"]],
        knob("o2Freq", "Osc 2 frequency", -7, 7, 0.01), ["o2Wave", "Osc 2 wave", "sel", GM_W], ["sync", "Sync", "s"]]],
      ["Mixer", "mix", [knob("m1", "Oscillator 1", 0, 10), knob("m2", "Oscillator 2", 0, 10), knob("mN", "Noise", 0, 10)]],
      ["Filter", "flt", [knob("cutoff", "Cutoff", 0, 10), knob("res", "Resonance", 0, 10), knob("envAmt", "Envelope amt", -5, 5, 0.1), ["kbd", "KBD track", "sel", ["off", "half", "1:1"]],
        ["hpOn", "Cord: mixer → high pass → filter", "s"], knob("hpCut", "High pass cutoff", 0, 10)]],
      ["Envelope and output", "env", [knob("a", "Attack", 0, 10), knob("d", "Decay", 0, 10), knob("s", "Sustain", 0, 10), knob("r", "Release", 0, 10), ["vca", "VCA mode", "sel", ["env", "kbrls", "drone"]],
        knob("rev", "Spring reverb mix", 0, 10), knob("vol", "Volume", 0, 10)]],
      ["Modulation", "mod", [knob("rate", "Rate", 0, 10), ["lfoWave", "Wave", "sel", ["sine", "saw", "ramp", "square"]], knob("pAmt", "Pitch amt", 0, 10), knob("cAmt", "Cutoff amt", 0, 10), knob("pwAmt", "Pulse width amt", 0, 10)]],
      ["Glide", "gl", [knob("glide", "Glide", 0, 10)]]],
    def: { o1Oct: "16'", o1Wave: "saw", o2Oct: "8'", o2Freq: 0, o2Wave: "saw", sync: false, m1: 8, m2: 0, mN: 0, cutoff: 5, res: 0, envAmt: 2, kbd: "half", hpOn: false, hpCut: 2,
      a: 0, d: 4, s: 6, r: 3, vca: "env", rev: 0, vol: 6, rate: 5, lfoWave: "sine", pAmt: 0, cAmt: 0, pwAmt: 0, glide: 0 },
    pg: { _: ["GM", "PDF 7"], voices: ["WP", "Moog Grandmother"], osc: ["GM", "PDF 11"], sync: ["GM", "PDF 11"], pw: ["GM", "PDF 12"], noise: ["GM", "PDF 15"], filter: ["GM", "PDF 16"], slope: ["GM", "PDF 16"],
      kbd: ["GM", "PDF 16"], hpf: ["GM", "PDF 7"], env: ["GM", "PDF 19"], lfo: ["GM", "PDF 23"], mods: ["GM", "PDF 23"], fx: ["GM", "PDF 21"], glide: ["GM", "PDF 10"], memory: ["GM", "PDF 7"], cords: ["GM", "PDF 7"] },
    fc: { osc0: ["o1Oct", "o1Wave", "m1"], osc1: ["o2Oct", "o2Freq", "o2Wave", "m2"], noise: ["mN"], sync: ["sync"], filter: ["cutoff", "res", "envAmt"], kbd: ["kbd"], hpf: ["hpOn", "hpCut"],
      env: ["a", "d", "s", "r", "vca"], fx: ["rev"], lfo: ["rate", "lfoWave"], mods: ["pAmt", "cAmt", "pwAmt"], glide: ["glide"], vol: ["vol"], memory: [], voices: [], pw: ["o1Wave", "o2Wave", "pwAmt"] },
    cap: { voices: 1, unison: false, oscN: 2, waves: [["tri", "saw", "pulse"], ["tri", "saw", "pulse"]], multi: false, pw: "three", tune: ["oct", "free"], kbdOff: [], noise: ["white"], sub: false,
      ring: false, fb: false, sync: [1, 0], filters: [["lp", 24]], hpf: "patch", selfOsc: true, kbd: [0, 0.5, 1], envs: "adsr1", lfo: ["sine", "saw", "sq"], lfoHz: [0.07, 1300], lfoDelay: false,
      mods: ["lfo>pitch", "lfo>cut", "lfo>pw"], wheelOnly: true, glide: true, bend: [2, 2], chorus: false, fx: ["spr"], fm: false, wt: false, memory: 0, vel: false, accent: false, cords: true },
    flow: { osc: [["Osc 1", ["o1Wave", "o1Oct", "m1"]], ["Osc 2", ["o2Wave", "o2Freq", "m2"]]], noise: ["mN"], hpf: ["hpOn", "hpCut"], filter: ["cutoff", "res"], fenv: ["a", "d", "s", "r", "envAmt"],
      aenv: ["a", "d", "s", "r", "vca"], lfo: ["rate", "lfoWave"], fx: ["rev"], fxName: "Spring" } };
  function engGrand(s) {
    s = full("grandmother", s);
    function go(oct, freq, w, lvl) { var p = w === "square" ? 0.5 : w === "narrow" ? 0.15 : 0.5, ww = {}; ww[w === "square" || w === "narrow" ? "pulse" : w] = 1; return { on: lvl > 0, lvl: lvl / 10, waves: ww, pw: p, oct: F5[oct], semis: freq, kbd: true }; }
    var o = [go(s.o1Oct, 0, s.o1Wave, s.m1), go(s.o2Oct, s.o2Freq, s.o2Wave, s.m2), oscEmpty()], R = [], lw = s.lfoWave;
    var L = { hz: expMap(s.rate, MG.lfo[0], MG.lfo[1]), sine: lw === "sine" ? 1 : 0, tri: 0, saw: lw === "saw" ? -1 : lw === "ramp" ? 1 : 0, sq: lw === "square" ? 1 : 0, uni: false };
    if (s.pAmt > 0) R.push({ id: "pAmt", src: [["lfo", 1]], dst: ["p0", "p1"], amt: s.pAmt / 10 * 12, gain: "wheel", curve: "sq" });
    if (s.cAmt > 0) R.push({ id: "cAmt", src: [["lfo", 1]], dst: ["cut"], amt: s.cAmt / 10 * 4, gain: "wheel" });
    if (s.pwAmt > 0) R.push({ id: "pwAmt", src: [["lfo", 1]], dst: ["pw0", "pw1"], amt: s.pwAmt / 10 * 0.4, gain: "wheel" });
    var e = moogEnv(s.a, s.d, s.s, s.r), kb = { off: 0, half: 0.5, "1:1": 1 };
    return base("grandmother", { voices: 1, prio: "low", legato: true, osc: o, sync: s.sync ? { slave: 1, master: 0 } : null, noise: { lvl: s.mN / 10, pink: false },
      hpf: s.hpOn ? { kind: "1p", cut: expMap(s.hpCut, 20, 2000) } : null, model: "ladder", slope: 24, cut: expMap(s.cutoff, MG.cut[0], MG.cut[1]), res: s.res / 10, env: s.envAmt / 5 * 5, kbd: kb[s.kbd],
      fenv: e, aenv: s.vca === "drone" ? { a: 0.001, d: 0.01, s: 1, r: 30, lin: false, vel: 0, drone: true } : s.vca === "kbrls" ? { a: 0.001, d: 0.01, s: 1, r: e.r, lin: false, vel: 0 } : Object.assign({ vel: 0 }, e),
      lfo: L, routes: R, glide: s.glide > 0 ? expMap(s.glide, 0.005, 5) : 0, drift: 1, fx: s.rev > 0 ? [{ k: "spr", a: 0.5, b: 0.5, mix: s.rev / 10 }] : [], vol: s.vol / 10 });
  }
  PROFILES.grandmother.apply = function (c, s, I) {
    s.m1 = 0; s.m2 = 0;
    I.osc.slice(0, 2).forEach(function (o, i) {
      var p = "o" + (i + 1), w = hasW(o, "pulse") ? (o.pw < 0.3 ? "narrow" : "square") : hasW(o, "tri") || hasW(o, "sine") ? "tri" : "saw";
      var oc = Math.round(o.semis / 12), feet = i ? ["16'", "8'", "4'", "2'"] : ["32'", "16'", "8'", "4'"]; s[p + "Wave"] = w; s[p + "Oct"] = semisToFeet(oc * 12, feet, F5);
      if (i) s.o2Freq = r1(clamp(o.semis - F5[s.o2Oct] * 12, -7, 7)); s["m" + (i + 1)] = r1(o.lvl * 10);
    });
    if (I.noise) s.mN = r1(I.noise.lvl * 10); s.sync = !!I.sync;
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, MG.cut[0], MG.cut[1]), 0, 10)); s.res = r1(f.res * 10); s.envAmt = r1(clamp(f.env, -5, 5)); s.kbd = f.kbd > 0.75 ? "1:1" : f.kbd > 0.25 ? "half" : "off";
    if (I.hpf && I.hpf.cut > 0) { s.hpOn = true; s.hpCut = r1(clamp(expInv(Math.max(20, I.hpf.cut), 20, 2000), 0, 10)); }
    var e = I.aenv; s.a = eIn(e.a, MG.env); s.d = eIn(e.d, [0.004, 15]); s.s = r1(e.s * 10); s.r = eIn(e.r, [0.004, 15]);
    if (I.lfo) { s.rate = eIn(clamp(I.lfo.hz, 0.07, 1300), MG.lfo); s.lfoWave = { sine: "sine", tri: "sine", saw: "ramp", sq: "square" }[I.lfo.shape] || "sine"; }
    var lp = mk(I, "lfo>pitch"), lc = mk(I, "lfo>cut"), lw = mk(I, "lfo>pw");
    if (lp) s.pAmt = r1(clamp(Math.sqrt(lp.amt / 12) * 10, 0, 10)); if (lc) s.cAmt = r1(clamp(lc.amt / 4 * 10, 0, 10)); if (lw) s.pwAmt = r1(clamp(lw.amt / 0.4 * 10, 0, 10));
    var rv = (I.fx || []).filter(function (x) { return /^(spr|hal|roo|pla)$/.test(x.k); })[0]; s.rev = rv ? r1(rv.mix * 10) : 0;
    s.glide = I.glide > 0 ? r1(clamp(expInv(I.glide, 0.005, 5), 0, 10)) : 0; s.vol = r1(c.vol * 10);
  };

  // Memorymoog (Model 345)
  PROFILES.memorymoog = { id: "memorymoog", name: "Memorymoog", long: "after the Moog Memorymoog (1982): six voices of three oscillators, 100 programs", voices: 6, book: "MM",
    groups: [["Oscillators", "osc", [["o1Oct", "Osc 1 octave", "sel", ["16'", "8'", "4'", "2'"]], ["o1Saw", "Saw 1", "s"], ["o1Tri", "Tri 1", "s"], ["o1Pulse", "Pulse 1", "s"], knob("pw1", "PW 1 (%)", 5, 95, 1), ["sync", "Sync 2 to 1", "s"],
        ["o2Oct", "Osc 2 octave", "sel", ["16'", "8'", "4'", "2'"]], knob("o2Freq", "Osc 2 freq", -8, 8, 0.01), ["o2Saw", "Saw 2", "s"], ["o2Tri", "Tri 2", "s"], ["o2Pulse", "Pulse 2", "s"], knob("pw2", "PW 2 (%)", 5, 95, 1),
        ["o3Oct", "Osc 3 octave", "sel", ["16'", "8'", "4'", "2'"]], knob("o3Freq", "Osc 3 freq", -8, 8, 0.01), ["o3Saw", "Saw 3", "s"], ["o3Tri", "Tri 3", "s"], ["o3Pulse", "Pulse 3", "s"], ["o3Low", "Osc 3 low", "s"], ["o3Kbd", "Osc 3 keyboard", "s"]]],
      ["Mixer", "mix", [knob("m1", "Osc 1", 0, 10), knob("m2", "Osc 2", 0, 10), knob("m3", "Osc 3", 0, 10), knob("mN", "Noise (pink)", 0, 10)]],
      ["Filter", "flt", [["kb1", "KB track 1/3", "s"], ["kb2", "KB track 2/3", "s"], knob("cutoff", "Cutoff", 0, 10), knob("emph", "Emphasis", 0, 10), knob("cAmt", "Contour amount", 0, 10)]],
      ["Contours", "env", [knob("fA", "Filter attack", 0, 10), knob("fD", "Filter decay", 0, 10), knob("fS", "Filter sustain", 0, 10), knob("fR", "Filter release", 0, 10),
        knob("lA", "Loudness attack", 0, 10), knob("lD", "Loudness decay", 0, 10), knob("lS", "Loudness sustain", 0, 10), knob("lR", "Loudness release", 0, 10)]],
      ["LFO modulation", "lfo", [knob("lfoRate", "Rate", 0, 10), ["lfoWave", "Waveshape", "sel", ["tri", "sawup", "sawdown", "square", "sh"]], knob("modAmt", "Modulation amount", 0, 10),
        ["lO1", "→ Osc 1", "s"], ["lO2", "→ Osc 2", "s"], ["lO3", "→ Osc 3", "s"], ["lPw", "→ PW 1-3", "s"], ["lF", "→ Filter", "s"]]],
      ["Voice modulation", "vm", [knob("vmO3", "Osc 3 amount", 0, 10), knob("vmF", "Filter contour amount", 0, 10), ["vO1", "→ Osc 1 freq", "s"], ["vO2", "→ Osc 2 freq", "s"], ["vPw", "→ PW 1+2", "s"], ["vF", "→ Filter", "s"]]],
      ["Performance", "perf", [["mono", "Mono", "s"], ["glideOn", "Glide", "s"], knob("glide", "Glide amount", 0, 10), knob("vol", "Volume", 0, 10)]]],
    def: { o1Oct: "8'", o1Saw: true, o1Tri: false, o1Pulse: false, pw1: 50, sync: false, o2Oct: "8'", o2Freq: 0, o2Saw: true, o2Tri: false, o2Pulse: false, pw2: 50,
      o3Oct: "8'", o3Freq: 0, o3Saw: false, o3Tri: true, o3Pulse: false, o3Low: false, o3Kbd: true, m1: 4, m2: 0, m3: 0, mN: 0, kb1: true, kb2: false, cutoff: 5, emph: 0, cAmt: 4,
      fA: 0, fD: 4, fS: 5, fR: 3, lA: 0, lD: 4, lS: 10, lR: 3, lfoRate: 5, lfoWave: "tri", modAmt: 0, lO1: false, lO2: false, lO3: false, lPw: false, lF: false,
      vmO3: 0, vmF: 0, vO1: false, vO2: false, vPw: false, vF: false, mono: false, glideOn: false, glide: 3, vol: 6 },
    pg: { _: ["MM", "PDF 5"], voices: ["MM", "PDF 5"], osc: ["MM", "PDF 16"], sync: ["MM", "PDF 16"], pw: ["MM", "PDF 16"], noise: ["MM", "PDF 17"], filter: ["MM", "PDF 17"], slope: ["MM", "PDF 17"],
      kbd: ["MM", "PDF 17"], env: ["MM", "PDF 5"], lfo: ["MM", "PDF 14"], mods: ["MM", "PDF 15"], glide: ["MM", "PDF 9"], memory: ["MM", "PDF 5"], fm: ["MM", "PDF 15"] },
    fc: { osc0: ["o1Oct", "o1Saw", "o1Tri", "o1Pulse", "pw1", "m1"], osc1: ["o2Oct", "o2Freq", "o2Saw", "o2Tri", "o2Pulse", "pw2", "m2"], osc2: ["o3Oct", "o3Freq", "o3Saw", "o3Tri", "o3Pulse", "o3Low", "o3Kbd", "m3"],
      noise: ["mN"], sync: ["sync"], pw: ["pw1", "pw2"], filter: ["cutoff", "emph", "cAmt"], kbd: ["kb1", "kb2"], env: ["fA", "fD", "fS", "fR", "lA", "lD", "lS", "lR"], lfo: ["lfoRate", "lfoWave"],
      mods: ["modAmt", "lO1", "lO2", "lO3", "lPw", "lF", "vmO3", "vmF", "vO1", "vO2", "vPw", "vF"], glide: ["glideOn", "glide"], vol: ["vol"], voices: ["mono"], memory: [] },
    cap: { voices: 6, unison: true, oscN: 3, waves: [["saw", "tri", "pulse"], ["saw", "tri", "pulse"], ["saw", "tri", "pulse"]], multi: true, pw: "knob", tune: ["oct", "free", "free"], kbdOff: [2],
      noise: ["pink"], sub: false, ring: false, fb: false, sync: [1, 0], filters: [["lp", 24]], hpf: false, selfOsc: true, kbd: [0, 1 / 3, 2 / 3, 1], envs: "adsr2", lfo: ["tri", "saw", "sq", "sh"], lfoHz: [0.1, 100],
      lfoDelay: false, mods: ["lfo>pitch", "lfo>pw", "lfo>cut", "sh>pitch", "sh>pw", "sh>cut", "osc>pitch", "osc>pw", "osc>cut", "env>pitch", "env>pw", "env>cut"], glide: true, bend: [2, 12],
      chorus: false, fm: false, wt: false, memory: 100, vel: false, accent: false },
    flow: { osc: [["Osc 1", ["o1Saw", "o1Tri", "o1Pulse", "m1"]], ["Osc 2", ["o2Saw", "o2Tri", "o2Pulse", "o2Freq", "m2"]], ["Osc 3", ["o3Saw", "o3Tri", "o3Pulse", "o3Freq", "m3"]]], noise: ["mN"],
      filter: ["cutoff", "emph"], fenv: ["fA", "fD", "fS", "fR", "cAmt"], aenv: ["lA", "lD", "lS", "lR"], lfo: ["lfoRate", "lfoWave"] } };
  var MM_F = { "16'": -1, "8'": 0, "4'": 1, "2'": 2 };
  function engMemory(s) {
    s = full("memorymoog", s);
    function mo(n, freq, kbd, low) { var w = {}, p = "o" + n; if (s[p + "Saw"]) w.saw = 1; if (s[p + "Tri"]) w.tri = 1; if (s[p + "Pulse"]) w.pulse = 1; var lvl = s["m" + n];
      return { on: lvl > 0 && (w.saw || w.tri || w.pulse), lvl: lvl / 10, waves: w, pw: n === 3 ? 0.5 : s["pw" + n] / 100, oct: MM_F[s[p + "Oct"]] + (low ? -5 : 0), semis: freq, kbd: kbd }; }
    var o = [mo(1, 0, true), mo(2, s.o2Freq, true), mo(3, s.o3Freq, s.o3Kbd && !s.o3Low, s.o3Low)], R = [];
    var lw = s.lfoWave, L = { hz: expMap(s.lfoRate, 0.1, 100), tri: lw === "tri" ? 1 : 0, saw: lw === "sawup" ? 1 : lw === "sawdown" ? -1 : 0, sq: lw === "square" ? 1 : 0, uni: false }, ls = [[lw === "sh" ? "shL" : "lfo", 1]];
    function lr(on, dst, amt) { if (on) R.push({ id: "lfo-" + dst[0], src: ls, dst: dst, amt: amt, gain: "init", init: s.modAmt / 10 }); }
    lr(s.lO1, ["p0"], 2); lr(s.lO2, ["p1"], 2); lr(s.lO3, ["p2"], 2); lr(s.lPw, ["pw0", "pw1", "pw2"], 0.4); lr(s.lF, ["cut"], 3);
    if (s.vmO3 > 0 || s.vmF > 0) { o[2].run = true;
      [["vO1", ["p0"], 24], ["vO2", ["p1"], 24], ["vPw", ["pw0", "pw1"], 0.45], ["vF", ["cut"], 5]].forEach(function (d) {
        if (!s[d[0]]) return; if (s.vmO3 > 0) R.push({ id: "vm3-" + d[0], src: [["osc2", 1]], dst: d[1], amt: s.vmO3 / 10 * d[2], gain: "fixed" });
        if (s.vmF > 0) R.push({ id: "vmF-" + d[0], src: [["fenv", 1]], dst: d[1], amt: s.vmF / 10 * d[2], gain: "fixed" }); }); }
    return base("memorymoog", { voices: s.mono ? 1 : 6, unison: s.mono ? 6 : 1, uniDet: 4, prio: s.mono ? "low" : "last", osc: o, sync: s.sync ? { slave: 1, master: 0 } : null, noise: { lvl: s.mN / 10, pink: true },
      model: "ladder", slope: 24, cut: expMap(s.cutoff, 20, 18000), res: s.emph / 10 * 1.05, env: s.cAmt / 10 * 5, kbd: (s.kb1 ? 1 / 3 : 0) + (s.kb2 ? 2 / 3 : 0),
      fenv: moogEnv(s.fA, s.fD, s.fS, s.fR), aenv: Object.assign({ vel: 0 }, moogEnv(s.lA, s.lD, s.lS, s.lR)), lfo: L, routes: R, glide: s.glideOn ? expMap(s.glide, 0.005, 5) : 0, drift: 2, vol: s.vol / 10 });
  }
  PROFILES.memorymoog.apply = function (c, s, I) {
    [1, 2, 3].forEach(function (n) { s["m" + n] = 0; s["o" + n + "Saw"] = s["o" + n + "Tri"] = s["o" + n + "Pulse"] = false; });
    I.osc.slice(0, 3).forEach(function (o, i) {
      var n = i + 1, p = "o" + n, oc = clamp(Math.round(o.semis / 12), -1, 2);
      s[p + "Saw"] = hasW(o, "saw") || hasW(o, "rsaw") || hasW(o, "trisaw") || hasW(o, "wt"); s[p + "Tri"] = hasW(o, "tri") || hasW(o, "sine"); s[p + "Pulse"] = hasW(o, "pulse");
      if (!s[p + "Saw"] && !s[p + "Tri"] && !s[p + "Pulse"]) s[p + "Saw"] = true;
      s[p + "Oct"] = ["16'", "8'", "4'", "2'"][oc + 1]; if (i) s[p + "Freq"] = r1(clamp(o.semis - oc * 12, -8, 8)); if (i < 2 && s[p + "Pulse"]) s["pw" + n] = clamp(Math.round(o.pw * 100), 5, 95);
      if (i === 2) { s.o3Kbd = o.kbd; if (!o.kbd && o.semis < -40) s.o3Low = true; }
      s["m" + n] = r1(clamp(o.lvl * 5, 0, 10));
    });
    if (I.noise) s.mN = r1(I.noise.lvl * 10); s.sync = !!I.sync;
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, 20, 18000), 0, 10)); s.emph = r1(clamp(f.res / 1.05 * 10, 0, 10)); s.cAmt = r1(clamp(Math.abs(f.env) / 5 * 10, 0, 10)); s.kb1 = f.kbd > 0.8 || (f.kbd > 0.2 && f.kbd < 0.5); s.kb2 = f.kbd > 0.5;
    moogEnvIn(I.fenv, s, "f"); var A = I.aenv; s.lA = eIn(A.a, MG.env); s.lD = eIn(A.d, [0.004, 15]); s.lS = r1(A.s * 10); s.lR = eIn(A.r, [0.004, 15]);
    if (I.lfo) { s.lfoRate = eIn(clamp(I.lfo.hz, 0.1, 100), [0.1, 100]); s.lfoWave = { tri: "tri", sine: "tri", saw: "sawup", sq: "square", sh: "sh" }[I.lfo.shape] || "tri"; }
    var lp = mk(I, "lfo>pitch") || mk(I, "sh>pitch"), lw = mk(I, "lfo>pw") || mk(I, "sh>pw"), lc = mk(I, "lfo>cut") || mk(I, "sh>cut");
    if (lp) { s.lO1 = s.lO2 = true; s.modAmt = Math.max(s.modAmt, r1(clamp(lp.amt / 2 * 10, 0, 10))); } if (lw) { s.lPw = true; s.modAmt = Math.max(s.modAmt, r1(clamp(lw.amt / 0.4 * 10, 0, 10))); }
    if (lc) { s.lF = true; s.modAmt = Math.max(s.modAmt, r1(clamp(lc.amt / 3 * 10, 0, 10))); }
    var ep = mk(I, "env>pitch"), ew = mk(I, "env>pw"), ec = mk(I, "env>cut"), op = mk(I, "osc>pitch");
    if (ep || ew) { s.vmF = r1(clamp(((ep || ew).amt) / (ep ? 24 : 0.45) * 10, 0, 10)); if (ep) s.vO1 = true; if (ew) s.vPw = true; }
    if (op) { s.vmO3 = r1(clamp(op.amt / 24 * 10, 0, 10)); s.vO1 = true; }
    s.mono = I.voices === 1; s.glideOn = I.glide > 0; if (I.glide > 0) s.glide = r1(clamp(expInv(I.glide, 0.005, 5), 0, 10)); s.vol = r1(c.vol * 10);
  };


  // =====================================================================================================================
  // TWO FREE SOFTWARE SYNTHS: Vital and Surge XT, each as a beginner-sized panel (the real plug-ins have far more on them)
  // =====================================================================================================================
  // VT = Vital source code (github.com/mtytel/vital, read 2026-11-26): src/common/synth_parameters.cpp: oscillator on, transpose
  //      -48..48, tune -1..1 (x100 = cents), level 0-1 (quadratic), wave frame 0..(frames - 1), unison voices 1-16; filter cutoff
  //      8-136 semitones (default 60), resonance 0-1, drive 0-20 dB, blend 0-2, key track -1..1; envelope attack / decay / release
  //      0-2.37842 (quartic; defaults 0.1495 / 1.0 / 0.5476), sustain 0-1; LFO frequency -7..9 (exponential, default 1);
  //      polyphony from 1 (default 8); portamento time -10..4 (exponential); reverb, delay, chorus and the other effects' parameters.
  //      src/interface/look_and_feel/synth_strings.h: filter styles 12dB, 24dB, Notch Blend, Notch Spread, B/P/N; models Analog,
  //      Dirty, Ladder, Digital, Diode, Formant, Comb, Phaser. README: GPLv3 source; "the free version of Vital"; "Create an account
  //      and download Vital at vital.audio". VW = vital.audio (read 2026-11-26): a wavetable synth, drag-and-drop modulation, the
  //      free tier "Basic" with 75 presets and 25 wavetables, Windows 10+, macOS 10.15+, Ubuntu 18.04+.
  //      OUR READINGS, UNVERIFIED: seconds = value^4 (2.37842^4 = 32 s); LFO Hz = 2^value; portamento seconds = 2^value; blend
  //      0 low-pass, 1 band-pass, 2 high-pass; amplitude = level^2; 257 wave frames (0-256); the "Notch" style here stands for Notch
  //      Blend. This page's wavetable (sine -> triangle -> square -> saw over the frames, after Vital's "Basic Shapes" table: name and
  //      frame order unverified) is the engine's fifth table. The Sample slot carries noise (Vital has no noise oscillator; that the
  //      sample is noise is a guess). Vital's filter models are not modelled: Ladder plays this page's ladder, the others its CEM-style
  //      4-pole or state-variable 2-pole. Unison here stacks voices on ONE note (this page's engine); the real Vital's unison stays
  //      polyphonic, one stack per note.
  // SX = Surge XT User Manual (surge-synthesizer.github.io/manual-xt, for Surge XT 1.3, read 2026-11-26): released as "Surge" as open
  //      source by Claes Johanson in September 2018, kept by the Surge Synth Team; Classic oscillator Shape -100 % pulse, 0 % saw,
  //      100 % dual saw, Width 1 duty cycle, Sub Mix "0% = only main, 100% = only sub", Sync 0-60 semitones, Unison Voices; Pitch &
  //      Octave, Keytrack; mixer Osc 1-3, Ring Modulation 1x2 and 2x3 ("multiplying the raw output of two oscillators"), Noise; filters
  //      12 dB and 24 dB low / high / band-pass / notch, Legacy and Vintage Ladder; FEG > F1, Keytrack > F1 ("At 100% keytrack, the
  //      filter frequency follows the pitch"); Filter EG and Amp EG ADSR; LFO shapes Sine, Triangle, Square, Sawtooth, Noise, S&H;
  //      LFO rate "Ranges from -7 to 9"; Play Mode Poly / Mono (latest note by default); Portamento; Bend Depth 0-24 semitones.
  //      SW = surge-synthesizer.github.io (download page). UNVERIFIED (not printed): cutoff as semitones from A 440 (-65..+67), EG
  //      times as log2 seconds (-10..5), LFO Hz = 2^rate, portamento seconds = 2^value, the sub one octave down with the main
  //      oscillator's shape, the polyphony limit of 16 here. The dual saw (Shape above 0) is drawn as one saw: this page's engine has
  //      no dual saw. This panel shows two of Surge's three oscillators, one Classic each, and the sub only on Osc 1.
  Object.assign(C, { VT: "Vital source code", VW: "Vital website", SX: "Surge XT User Manual", SW: "Surge XT website" });
  var VT_TAB = 4;   // the engine's fifth wavetable: this page's basic shapes
  var VT_FR = { sine: 0, tri: 85, pulse: 171, saw: 256 };   // the frames of the four shapes (0, 1/3, 2/3 and all of 256)
  var VT_PANEL = "on this page's beginner Vital panel; the real Vital routes almost any source to any knob by dragging (Vital website) and has more oscillator, filter and effect settings";
  var SX_PANEL = "on this page's beginner Surge XT panel; the real Surge XT has three oscillators of several types (wavetable, FM, sine …), oscillator sync, a scene high-pass, filter feedback and a modulation matrix, so it may well do this (Surge XT User Manual)";
  function v4(t) { return Math.round(clamp(Math.pow(Math.max(t, 0), 0.25), 0, 2.37842) * 1000) / 1000; }   // seconds -> Vital's 0-2.378 (value^4 = s)
  function vEnv(a, d, ss, r) { return { a: Math.max(0.0005, Math.pow(a, 4)), d: Math.max(0.002, Math.pow(d, 4)), s: ss / 100, r: Math.max(0.003, Math.pow(r, 4)), lin: false }; }
  function lg2(x) { return Math.log(x) / Math.LN2; }
  function nearShape(o) {   // a canonical oscillator -> the nearest of sine / tri / pulse / saw
    if (o.wt) { var t = o.wt.t, p = o.wt.pos; if (t === VT_TAB) return ["sine", "tri", "pulse", "saw"][clamp(Math.round(p / 63 * 3), 0, 3)];
      return t === 1 ? "pulse" : t === 3 ? (p < 32 ? "pulse" : "saw") : t === 0 && p < 4 ? "sine" : "saw"; }
    return hasW(o, "pulse") ? "pulse" : hasW(o, "sine") ? "sine" : hasW(o, "tri") ? "tri" : "saw";
  }
  function softFx(cho, dly, rev) {   // three effect mixes (0-100) as the engine's effect list
    var L = []; if (cho > 0) L.push({ k: "cho", a: 0.35, b: 0.5, mix: cho / 100 }); if (dly > 0) L.push({ k: "ddl", a: 0.35, b: 0.35, mix: dly / 100 }); if (rev > 0) L.push({ k: "hal", a: 0.6, b: 0.4, mix: rev / 100 });
    return L;
  }
  function softFxIn(I, s) {
    (I.fx || []).forEach(function (f) { var m = Math.round(clamp(f.mix * 100, 0, 100));
      if (f.k === "cho") s.fxCho = m; else if (f.k === "ddl" || f.k === "bbd") s.fxDly = m; else if (/^(hal|roo|pla|spr)$/.test(f.k)) s.fxRev = m; });
  }
  var SOFT_FX = ["Effects", "fx", [knob("fxCho", "Chorus mix", 0, 100, 1), knob("fxDly", "Delay mix", 0, 100, 1), knob("fxRev", "Reverb mix", 0, 100, 1)]];

  // ---- Vital ----
  function vtGroup(n) { var p = "o" + n; return ["Oscillator " + n, p, [[p + "On", "On", "s"], knob(p + "Frame", "Wave frame", 0, 256, 1), knob(p + "Tr", "Transpose", -48, 48, 1),
    knob(p + "Tune", "Tune (cents)", -100, 100, 1), knob(p + "Lvl", "Level (%)", 0, 100, 1)]]; }
  function vtEnv(e, name) { return [name, e, [knob(e + "A", "Attack", 0, 2.37842, 0.001), knob(e + "D", "Decay", 0, 2.37842, 0.001), knob(e + "S", "Sustain (%)", 0, 100, 1), knob(e + "R", "Release", 0, 2.37842, 0.001)]]; }
  PROFILES.vital = { id: "vital", name: "Vital", long: "after Vital (Matt Tytel's free wavetable synth plug-in): a beginner's panel of three wavetable oscillators, one filter, two envelopes, one LFO", voices: 8, book: "VT",
    groups: [vtGroup(1), vtGroup(2), vtGroup(3), ["Sample (noise)", "smp", [["smpOn", "On", "s"], knob("smp", "Level (%)", 0, 100, 1)]],
      ["Filter 1", "flt", [["fModel", "Model", "sel", ["Analog", "Ladder", "Digital"]], ["fStyle", "Style", "sel", ["12dB", "24dB", "Notch"]], knob("fBlend", "Blend (low · band · high)", 0, 2, 0.01),
        knob("cut", "Cutoff (semitones)", 8, 136, 0.1), knob("res", "Resonance (%)", 0, 100, 1), knob("drive", "Drive (dB)", 0, 20, 0.1), knob("key", "Key track (%)", 0, 100, 1)]],
      vtEnv("e1", "Envelope 1 (amp)"), vtEnv("e2", "Envelope 2"), ["Env 2 routes", "e2m", [knob("e2Cut", "Env 2 → cutoff (semitones)", -48, 48, 0.5), knob("e2Frame", "Env 2 → wave frame", -256, 256, 1)]],
      ["LFO 1", "lfo", [["lfoShape", "Shape", "sel", ["tri", "sine", "saw", "square"]], knob("lfoRate", "Frequency (2^x Hz)", -7, 9, 0.01), knob("lfoPitch", "LFO 1 → pitch (semitones)", 0, 12, 0.1),
        knob("lfoCut", "LFO 1 → cutoff (semitones)", 0, 48, 0.5), knob("lfoFrame", "LFO 1 → wave frame", 0, 256, 1)]],
      SOFT_FX, ["Voice", "voice", [knob("poly", "Polyphony", 1, 16, 1), knob("uni", "Unison voices", 1, 8, 1), knob("glide", "Portamento time (2^x s)", -10, 4, 0.1), knob("vol", "Volume (%)", 0, 100, 1)]]],
    def: { o1On: true, o1Frame: 256, o1Tr: 0, o1Tune: 0, o1Lvl: 71, o2On: false, o2Frame: 256, o2Tr: 0, o2Tune: 0, o2Lvl: 71, o3On: false, o3Frame: 256, o3Tr: 0, o3Tune: 0, o3Lvl: 71,
      smpOn: false, smp: 50, fModel: "Analog", fStyle: "12dB", fBlend: 0, cut: 100, res: 20, drive: 0, key: 0,
      e1A: 0.1495, e1D: 1, e1S: 100, e1R: 0.5476, e2A: 0.1495, e2D: 1, e2S: 100, e2R: 0.5476, e2Cut: 0, e2Frame: 0,
      lfoShape: "tri", lfoRate: 1, lfoPitch: 0, lfoCut: 0, lfoFrame: 0, fxCho: 0, fxDly: 0, fxRev: 0, poly: 8, uni: 1, glide: -10, vol: 70 },
    pg: { _: ["VT", "synth_parameters.cpp"], slope: ["VT", "synth_strings.h"], mods: ["VW", "vital.audio"], memory: ["VW", "vital.audio"], wt: ["VW", "vital.audio"], noise: ["VT", "synth_parameters.cpp"] },
    fc: { osc0: ["o1On", "o1Frame", "o1Tr", "o1Tune", "o1Lvl"], osc1: ["o2On", "o2Frame", "o2Tr", "o2Tune", "o2Lvl"], osc2: ["o3On", "o3Frame", "o3Tr", "o3Tune", "o3Lvl"],
      wt: ["o1Frame", "o2Frame", "o3Frame", "e2Frame", "lfoFrame"], noise: ["smpOn", "smp"], filter: ["fModel", "fStyle", "fBlend", "cut", "res", "e2Cut"], drive: ["drive"], kbd: ["key"],
      env: ["e1A", "e1D", "e1S", "e1R", "e2A", "e2D", "e2S", "e2R"], lfo: ["lfoShape", "lfoRate"], mods: ["lfoPitch", "lfoCut", "lfoFrame", "e2Cut", "e2Frame"],
      fx: ["fxCho", "fxDly", "fxRev"], chorus: ["fxCho"], glide: ["glide"], vol: ["vol"], voices: ["poly", "uni"], memory: [] },
    cap: { voices: 16, unison: true, oscN: 3, waves: [["wt", "sine", "tri", "pulse", "saw"], ["wt", "sine", "tri", "pulse", "saw"], ["wt", "sine", "tri", "pulse", "saw"]], multi: false, pw: "square",
      tune: ["free", "free", "free"], kbdOff: [], noise: ["white"], sub: false, ring: false, fb: false, sync: false, filters: [["lp", 12], ["lp", 24], ["bp", 12], ["hp", 12], ["notch", 12]], hpf: false,
      selfOsc: true, kbd: "free", envs: "adsr2", lfo: ["tri", "sine", "saw", "sq"], lfoHz: [1 / 128, 512], lfoDelay: false, mods: ["lfo>pitch", "lfo>cut", "lfo>wt", "env>cut", "env>wt"],
      glide: true, bend: [2, 2], chorus: false, fx: ["cho", "ddl", "hal"], drive: true, fm: false, wt: true, memory: "any number of", vel: false, accent: false, mono: "Polyphony set to 1", panel: VT_PANEL },
    flow: { osc: [["Osc 1", ["o1On", "o1Frame", "o1Lvl"]], ["Osc 2", ["o2On", "o2Frame", "o2Lvl"]], ["Osc 3", ["o3On", "o3Frame", "o3Lvl"]]], noise: ["smpOn", "smp"], filter: ["cut", "res", "fStyle"],
      fenv: ["e2A", "e2D", "e2S", "e2R", "e2Cut"], aenv: ["e1A", "e1D", "e1S", "e1R"], lfo: ["lfoRate", "lfoShape"], fx: ["fxCho", "fxDly", "fxRev"], fxName: "Effects" },
    hint: function (k, v) {   // the real plug-in's own reading of a value, for copying the patch across (laws unverified, see VT above)
      if (/^e[12][ADR]$/.test(k)) { var t = Math.pow(v, 4); return t < 1 ? Math.round(t * 1000) + " ms" : t.toFixed(2) + " s"; }
      if (k === "cut") { var f = 440 * Math.pow(2, (v - 69) / 12); return f < 1000 ? Math.round(f) + " Hz" : (f / 1000).toFixed(2) + " kHz"; }
      if (k === "lfoRate") return Math.pow(2, v).toFixed(2) + " Hz"; if (k === "glide") return v <= -9.95 ? "off" : Math.pow(2, v).toFixed(3) + " s";
      if (/Frame$/.test(k) && /^o\d/.test(k)) return ["sine", "triangle", "square", "saw"][clamp(Math.round(v / 256 * 3), 0, 3)] + "-ish";
      return ""; } };
  function engVital(s) {
    s = full("vital", s);
    var o = [1, 2, 3].map(function (n) { var p = "o" + n, L = s[p + "Lvl"] / 100;
      return { on: !!s[p + "On"] && L > 0, lvl: L * L * 1.4, waves: {}, wt: { t: VT_TAB, pos: clamp(s[p + "Frame"], 0, 256) / 256 * 63 }, pw: 0.5, oct: 0, semis: s[p + "Tr"] + s[p + "Tune"] / 100, kbd: true }; });
    var b = s.fBlend, mode = s.fStyle === "Notch" ? "notch" : b < 0.5 ? "lp" : b < 1.5 ? "bp" : "hp", f24 = s.fStyle === "24dB" && mode === "lp";
    var sh = s.lfoShape, L = { hz: Math.pow(2, s.lfoRate), tri: sh === "tri" ? 1 : 0, sine: sh === "sine" ? 1 : 0, saw: sh === "saw" ? 1 : 0, sq: sh === "square" ? 1 : 0, uni: false }, R = [], ls = [["lfo", 1]];
    if (s.lfoPitch > 0) R.push({ id: "lfoPitch", src: ls, dst: ["p0", "p1", "p2"], amt: s.lfoPitch, gain: "fixed" });
    if (s.lfoCut > 0) R.push({ id: "lfoCut", src: ls, dst: ["cut"], amt: s.lfoCut / 12, gain: "fixed" });
    if (s.lfoFrame > 0) R.push({ id: "lfoFrame", src: ls, dst: ["wt"], amt: s.lfoFrame / 256 * 63 / 2, gain: "fixed" });
    if (s.e2Frame) R.push({ id: "e2Frame", src: [["fenv", 1]], dst: ["wt"], amt: s.e2Frame / 256 * 63, gain: "fixed" });
    return base("vital", { voices: s.uni > 1 ? 1 : s.poly, unison: s.uni > 1 ? s.uni : 1, uniDet: 10, prio: "last", legato: s.poly === 1 && s.uni <= 1, osc: o,
      noise: { lvl: s.smpOn ? s.smp / 100 : 0, pink: false }, model: f24 ? (s.fModel === "Ladder" ? "ladder" : "cem") : "svf", mode: mode, slope: f24 ? 24 : 12,
      cut: 440 * Math.pow(2, (s.cut - 69) / 12), res: s.res / 100, drive: s.drive > 0 ? (Math.pow(10, s.drive / 20) - 1) / 6 : 0, env: s.e2Cut / 12, kbd: s.key / 100,
      fenv: vEnv(s.e2A, s.e2D, s.e2S, s.e2R), aenv: Object.assign({ vel: 0 }, vEnv(s.e1A, s.e1D, s.e1S, s.e1R)), lfo: L, routes: R,
      glide: s.glide > -9.95 ? Math.pow(2, s.glide) : 0, bend: 2, drift: 0, fx: softFx(s.fxCho, s.fxDly, s.fxRev), vol: s.vol / 100 });
  }
  PROFILES.vital.apply = function (c, s, I) {
    [1, 2, 3].forEach(function (n) { s["o" + n + "On"] = false; });
    I.osc.slice(0, 3).forEach(function (o, i) { var p = "o" + (i + 1), w = o.wt;
      s[p + "On"] = true; s[p + "Frame"] = w && w.t === VT_TAB ? Math.round(w.pos / 63 * 256) : VT_FR[nearShape(o)];
      var tr = clamp(Math.round(o.semis), -48, 48); s[p + "Tr"] = tr; s[p + "Tune"] = clamp(Math.round((o.semis - tr) * 100), -100, 100);
      s[p + "Lvl"] = Math.round(clamp(Math.sqrt(o.lvl / 1.4) * 100, 0, 100)); });
    if (I.noise) { s.smpOn = true; s.smp = Math.round(clamp(I.noise.lvl * 100, 0, 100)); }
    var f = I.filter; s.fStyle = f.mode === "notch" ? "Notch" : f.mode === "lp" && f.slope === 24 ? "24dB" : "12dB"; s.fBlend = { lp: 0, bp: 1, hp: 2, notch: 0 }[f.mode] || 0;
    s.fModel = /^(ladder|diode)$/.test(c.model) ? "Ladder" : "Analog"; s.cut = r1(clamp(69 + 12 * lg2(Math.max(f.cut, 1) / 440), 8, 136)); s.res = Math.round(clamp(f.res, 0, 1) * 100);
    s.e2Cut = Math.round(clamp(f.env * 12, -48, 48) * 2) / 2; s.key = Math.round(clamp(f.kbd, 0, 1) * 100);
    var dr = I.drive || c.drive; s.drive = dr ? r1(clamp(20 * Math.log(1 + 6 * dr) / Math.LN10, 0, 20)) : 0;
    s.e1A = v4(I.aenv.a); s.e1D = v4(I.aenv.d); s.e1S = Math.round(I.aenv.s * 100); s.e1R = v4(I.aenv.r);
    s.e2A = v4(I.fenv.a); s.e2D = v4(I.fenv.d); s.e2S = Math.round(I.fenv.s * 100); s.e2R = v4(I.fenv.r);
    if (I.lfo) { s.lfoRate = Math.round(clamp(lg2(I.lfo.hz), -7, 9) * 100) / 100; s.lfoShape = { tri: "tri", sine: "sine", saw: "saw", sq: "square", sh: "tri" }[I.lfo.shape] || "tri"; }
    var lp = mk(I, "lfo>pitch"), lc = mk(I, "lfo>cut"), lw = mk(I, "lfo>wt"), ew = mk(I, "env>wt");
    if (lp) s.lfoPitch = r1(clamp(lp.amt, 0, 12)); if (lc) s.lfoCut = Math.round(clamp(lc.amt * 12, 0, 48) * 2) / 2;
    if (lw) s.lfoFrame = Math.round(clamp(lw.amt * 2 / 63 * 256, 0, 256)); if (ew) s.e2Frame = Math.round(clamp(ew.amt / 63 * 256, -256, 256));
    softFxIn(I, s);
    s.uni = I.unison > 1 ? clamp(I.unison, 1, 8) : 1; s.poly = clamp(I.voices || 1, 1, 16);
    s.glide = I.glide > 0 ? r1(clamp(lg2(I.glide), -10, 4)) : -10; s.vol = Math.round(clamp(c.vol * 100, 0, 100));
  };

  // ---- Surge XT ----
  function sxWaves(sh) { var x = clamp(sh, -100, 100) / 100; return x < 0 ? { saw: 1 + x, pulse: -x } : { saw: 1 }; }
  function sxEnv(a, d, ss, r) { return { a: Math.pow(2, a), d: Math.pow(2, d), s: ss / 100, r: Math.pow(2, r), lin: false }; }
  function sxT(t) { return r1(clamp(lg2(Math.max(t, 0.001)), -10, 5)); }
  var SX_F = ["Vintage Ladder", "LP 24 dB", "LP 12 dB", "BP 12 dB", "HP 12 dB", "Notch 12 dB"];
  function sxEg(e, name) { return [name, e, [knob(e + "A", "Attack (2^x s)", -10, 5, 0.1), knob(e + "D", "Decay (2^x s)", -10, 5, 0.1), knob(e + "S", "Sustain (%)", 0, 100, 1), knob(e + "R", "Release (2^x s)", -10, 5, 0.1)]]; }
  PROFILES.surge = { id: "surge", name: "Surge XT", long: "after Surge XT (the Surge Synth Team's free, open-source synth plug-in): a beginner's panel of two Classic oscillators, the mixer, one filter, two envelopes, one LFO", voices: 16, book: "SX",
    groups: [["Oscillator 1 (Classic)", "o1", [knob("o1Shape", "Shape (pulse · saw · dual saw)", -100, 100, 1), knob("o1W", "Width 1 (%)", 0, 100, 1), knob("o1Sub", "Sub Mix (%)", 0, 100, 1), knob("o1Oct", "Octave", -3, 3, 1), knob("o1Pitch", "Pitch (semitones)", -7, 7, 0.01)]],
      ["Oscillator 2 (Classic)", "o2", [knob("o2Shape", "Shape (pulse · saw · dual saw)", -100, 100, 1), knob("o2W", "Width 1 (%)", 0, 100, 1), knob("o2Oct", "Octave", -3, 3, 1), knob("o2Pitch", "Pitch (semitones)", -7, 7, 0.01), ["o2Kbd", "Keytrack", "s"]]],
      ["Mixer", "mix", [knob("m1", "Osc 1 (%)", 0, 100, 1), knob("m2", "Osc 2 (%)", 0, 100, 1), knob("r12", "Ring 1×2 (%)", 0, 100, 1), knob("n", "Noise (%)", 0, 100, 1)]],
      ["Filter 1", "flt", [["fType", "Type", "sel", SX_F], knob("cut", "Cutoff (semitones from A 440)", -65, 67, 0.1), knob("res", "Resonance (%)", 0, 100, 1), knob("feg", "FEG > F1 (semitones)", -48, 48, 0.5), knob("key", "Keytrack > F1 (%)", 0, 100, 1)]],
      sxEg("f", "Filter EG"), sxEg("a", "Amp EG"),
      ["LFO 1", "lfo", [["lfoShape", "Shape", "sel", ["sine", "tri", "square", "saw", "sh"]], knob("lfoRate", "Rate (2^x Hz)", -7, 9, 0.01), knob("lfoPitch", "LFO 1 → pitch (semitones)", 0, 12, 0.1),
        knob("lfoCut", "LFO 1 → cutoff (semitones)", 0, 48, 0.5), knob("lfoW", "LFO 1 → Width 1 (%)", 0, 45, 1)]],
      SOFT_FX, ["Scene", "scene", [["play", "Play mode", "sel", ["Poly", "Mono"]], knob("uni", "Unison voices", 1, 8, 1), knob("glide", "Portamento (2^x s)", -10, 3, 0.1), knob("bend", "Bend depth", 0, 24, 1), knob("vol", "Volume (%)", 0, 100, 1)]]],
    def: { o1Shape: 0, o1W: 50, o1Sub: 0, o1Oct: 0, o1Pitch: 0, o2Shape: 0, o2W: 50, o2Oct: 0, o2Pitch: 0, o2Kbd: true, m1: 100, m2: 0, r12: 0, n: 0,
      fType: "Vintage Ladder", cut: 30, res: 20, feg: 0, key: 0, fA: -8, fD: -1, fS: 100, fR: -3, aA: -8, aD: -1, aS: 100, aR: -3,
      lfoShape: "sine", lfoRate: 0, lfoPitch: 0, lfoCut: 0, lfoW: 0, fxCho: 0, fxDly: 0, fxRev: 0, play: "Poly", uni: 1, glide: -10, bend: 2, vol: 70 },
    pg: { _: ["SX", "Getting Started"], voices: ["SX", "Play Mode"], osc: ["SX", "Classic"], sub: ["SX", "Classic"], pw: ["SX", "Classic"], noise: ["SX", "Mixer"], ring: ["SX", "Mixer"],
      filter: ["SX", "Filter Types"], slope: ["SX", "Filter Types"], kbd: ["SX", "Keytrack"], env: ["SX", "Envelope Generators"], lfo: ["SX", "Shapes"], mods: ["SX", "Modulation"],
      glide: ["SX", "Portamento"], bend: ["SX", "Bend Depth"], memory: ["SX", "Managing Patches"], fx: ["SX", "Effects"], chorus: ["SX", "Effects"] },
    fc: { osc0: ["o1Shape", "o1W", "o1Oct", "o1Pitch", "m1"], osc1: ["o2Shape", "o2W", "o2Oct", "o2Pitch", "o2Kbd", "m2"], sub: ["o1Sub"], noise: ["n"], ring: ["r12"], pw: ["o1W", "o2W"],
      filter: ["fType", "cut", "res", "feg"], kbd: ["key"], env: ["fA", "fD", "fS", "fR", "aA", "aD", "aS", "aR"], lfo: ["lfoShape", "lfoRate"], mods: ["lfoPitch", "lfoCut", "lfoW"],
      fx: ["fxCho", "fxDly", "fxRev"], chorus: ["fxCho"], glide: ["glide"], bend: ["bend"], vol: ["vol"], voices: ["play", "uni"], memory: [] },
    cap: { voices: 16, unison: true, oscN: 2, waves: [["saw", "pulse"], ["saw", "pulse"]], multi: true, pw: "knob", tune: ["free", "free"], kbdOff: [1], noise: ["white"], sub: true, ring: true,
      fb: false, sync: false, filters: [["lp", 24], ["lp", 12], ["bp", 12], ["hp", 12], ["notch", 12]], hpf: false, selfOsc: true, kbd: "free", envs: "adsr2", lfo: ["sine", "tri", "sq", "saw", "sh"],
      lfoHz: [1 / 128, 512], lfoDelay: false, mods: ["lfo>pitch", "lfo>cut", "lfo>pw", "sh>pitch", "sh>cut", "sh>pw"], glide: true, bend: [0, 24], chorus: false, fx: ["cho", "ddl", "hal"],
      drive: false, fm: false, wt: false, memory: "any number of", vel: false, accent: false, mono: "Mono play mode", panel: SX_PANEL },
    flow: { osc: [["Osc 1", ["o1Shape", "o1W", "m1"]], ["Osc 2", ["o2Shape", "o2W", "m2"]], ["Sub", ["o1Sub"]]], noise: ["n"], ring: ["r12"], filter: ["fType", "cut", "res"],
      fenv: ["fA", "fD", "fS", "fR", "feg"], aenv: ["aA", "aD", "aS", "aR"], lfo: ["lfoRate", "lfoShape"], fx: ["fxCho", "fxDly", "fxRev"], fxName: "Effects" },
    hint: function (k, v) {   // the real plug-in's display of a value (laws unverified, see SX above)
      if (/^[fa][ADR]$/.test(k)) { var t = Math.pow(2, v); return t < 1 ? Math.round(t * 1000) + " ms" : t.toFixed(2) + " s"; }
      if (k === "cut") { var f = 440 * Math.pow(2, v / 12); return f < 1000 ? Math.round(f) + " Hz" : (f / 1000).toFixed(2) + " kHz"; }
      if (k === "lfoRate") return Math.pow(2, v).toFixed(2) + " Hz"; if (k === "glide") return v <= -9.95 ? "off" : Math.pow(2, v).toFixed(3) + " s";
      if (/^o\dShape$/.test(k)) return v <= -50 ? "pulse" : v < 50 ? "saw" : "dual saw";
      return ""; } };
  function engSurge(s) {
    s = full("surge", s);
    var sub = s.o1Sub / 100, l1 = s.m1 / 100, l2 = s.m2 / 100, ring = s.r12 > 0;
    var o1 = { on: l1 > 0 && sub < 1, run: ring, lvl: l1 * (1 - sub), waves: sxWaves(s.o1Shape), pw: clamp(s.o1W / 100, 0.03, 0.97), oct: s.o1Oct, semis: s.o1Pitch, kbd: true },
      o2 = { on: l2 > 0, run: ring, lvl: l2, waves: sxWaves(s.o2Shape), pw: clamp(s.o2W / 100, 0.03, 0.97), oct: s.o2Oct, semis: s.o2Pitch, kbd: !!s.o2Kbd },
      os = { on: l1 > 0 && sub > 0, lvl: l1 * sub, waves: sxWaves(s.o1Shape), pw: o1.pw, oct: s.o1Oct - 1, semis: s.o1Pitch, kbd: true, sub: true };
    var ft = s.fType, mode = /^BP/.test(ft) ? "bp" : /^HP/.test(ft) ? "hp" : /^Notch/.test(ft) ? "notch" : "lp", f24 = ft === "Vintage Ladder" || ft === "LP 24 dB";
    var sh = s.lfoShape, L = { hz: Math.pow(2, s.lfoRate), sine: sh === "sine" ? 1 : 0, tri: sh === "tri" ? 1 : 0, saw: sh === "saw" ? 1 : 0, sq: sh === "square" ? 1 : 0, uni: false }, R = [], ls = [[sh === "sh" ? "shL" : "lfo", 1]];
    if (s.lfoPitch > 0) R.push({ id: "lfoPitch", src: ls, dst: ["p0", "p1", "p2"], amt: s.lfoPitch, gain: "fixed" });
    if (s.lfoCut > 0) R.push({ id: "lfoCut", src: ls, dst: ["cut"], amt: s.lfoCut / 12, gain: "fixed" });
    if (s.lfoW > 0) R.push({ id: "lfoW", src: ls, dst: ["pw0", "pw1", "pw2"], amt: s.lfoW / 100, gain: "fixed" });
    var mono = s.play === "Mono";
    return base("surge", { voices: mono || s.uni > 1 ? 1 : 16, unison: s.uni > 1 ? s.uni : 1, uniDet: 10, prio: "last", legato: mono, osc: [o1, o2, os],
      noise: { lvl: s.n / 100, pink: false }, ring: ring ? { lvl: s.r12 / 100, kind: "mul" } : null,
      model: ft === "Vintage Ladder" ? "ladder" : f24 ? "cem" : "svf", mode: mode, slope: f24 ? 24 : 12, cut: 440 * Math.pow(2, s.cut / 12), res: s.res / 100, env: s.feg / 12, kbd: s.key / 100,
      fenv: sxEnv(s.fA, s.fD, s.fS, s.fR), aenv: Object.assign({ vel: 0 }, sxEnv(s.aA, s.aD, s.aS, s.aR)), lfo: L, routes: R,
      glide: s.glide > -9.95 ? Math.pow(2, s.glide) : 0, bend: s.bend, drift: 0, fx: softFx(s.fxCho, s.fxDly, s.fxRev), vol: s.vol / 100 });
  }
  PROFILES.surge.apply = function (c, s, I) {
    s.m1 = 0; s.m2 = 0;
    I.osc.slice(0, 2).forEach(function (o, i) { var p = "o" + (i + 1), sp = hasW(o, "pulse"), sw = hasW(o, "saw") || hasW(o, "wt");
      s[p + "Shape"] = sp && sw ? -50 : sp ? -100 : 0; if (sp) s[p + "W"] = Math.round(clamp(o.pw * 100, 3, 97));
      var oc = clamp(Math.round(o.semis / 12), -3, 3); s[p + "Oct"] = oc; s[p + "Pitch"] = Math.round(clamp(o.semis - oc * 12, -7, 7) * 100) / 100;
      if (i === 1) s.o2Kbd = o.kbd !== false; s["m" + (i + 1)] = Math.round(clamp(o.lvl * 100, 0, 100)); });
    if (I.sub && s.m1 + I.sub * 100 > 0) { var tot = s.m1 / 100 + I.sub; s.o1Sub = Math.round(clamp(I.sub / tot * 100, 0, 100)); s.m1 = Math.round(clamp(tot * 100, 0, 100)); }
    if (I.noise) s.n = Math.round(clamp(I.noise.lvl * 100, 0, 100)); if (I.ring) s.r12 = Math.round(clamp(I.ring * 100, 0, 100));
    var f = I.filter; s.fType = f.mode === "bp" ? "BP 12 dB" : f.mode === "hp" ? "HP 12 dB" : f.mode === "notch" ? "Notch 12 dB" : f.slope === 24 ? (/^(ladder|diode)$/.test(c.model) ? "Vintage Ladder" : "LP 24 dB") : "LP 12 dB";
    s.cut = r1(clamp(12 * lg2(Math.max(f.cut, 1) / 440), -65, 67)); s.res = Math.round(clamp(f.res, 0, 1) * 100); s.feg = Math.round(clamp(f.env * 12, -48, 48) * 2) / 2; s.key = Math.round(clamp(f.kbd, 0, 1) * 100);
    s.fA = sxT(I.fenv.a); s.fD = sxT(I.fenv.d); s.fS = Math.round(I.fenv.s * 100); s.fR = sxT(I.fenv.r);
    s.aA = sxT(I.aenv.a); s.aD = sxT(I.aenv.d); s.aS = Math.round(I.aenv.s * 100); s.aR = sxT(I.aenv.r);
    if (I.lfo) { s.lfoRate = Math.round(clamp(lg2(I.lfo.hz), -7, 9) * 100) / 100; s.lfoShape = { tri: "tri", sine: "sine", saw: "saw", sq: "square", sh: "sh" }[I.lfo.shape] || "tri"; }
    var lp = mk(I, "lfo>pitch") || mk(I, "sh>pitch"), lc = mk(I, "lfo>cut") || mk(I, "sh>cut"), lw = mk(I, "lfo>pw") || mk(I, "sh>pw");
    if (lp) s.lfoPitch = r1(clamp(lp.amt, 0, 12)); if (lc) s.lfoCut = Math.round(clamp(lc.amt * 12, 0, 48) * 2) / 2; if (lw) s.lfoW = Math.round(clamp(lw.amt * 100, 0, 45));
    softFxIn(I, s);
    s.play = I.voices === 1 && !(I.unison > 1) ? "Mono" : "Poly"; s.uni = I.unison > 1 ? clamp(I.unison, 1, 8) : 1;
    s.glide = I.glide > 0 ? r1(clamp(lg2(I.glide), -10, 3)) : -10; if (I.bend) s.bend = clamp(Math.round(I.bend), 0, 24); s.vol = Math.round(clamp(c.vol * 100, 0, 100));
  };

  // =====================================================================================================================
  // WHAT IF … : features an instrument lacks, kept apart from the real thing. They change only the SOUND (SynthCompare.engine's third
  // argument); the panel state, the translation and its report keep describing the real instrument. Each says where the lack is
  // documented (a manual page, Wikipedia) or that the wish is "commonly said, unverified".
  // =====================================================================================================================
  var WI = {
    moog: [
      { id: "poly", label: "Six voices (polyphony)", why: "The Model D plays one note: the lowest one held (M 47). Moog's own polyphonic answer came in 1982 as the Memorymoog's six voices (MM PDF 5). That players wanted chords from it is commonly said, unverified.",
        cite: [cite("M", 47), cite("MM", "PDF 5")], eng: function (E) { E.voices = 6; E.prio = "last"; E.legato = false; } },
      { id: "sync", label: "Oscillator sync", why: "There is no sync switch on the Model D's oscillator bank (M 16-19); the Voyager added 1-2 sync (VO PDF 8).", cite: [cite("M", 17), cite("VO", "PDF 8")],
        eng: function (E) { E.sync = { slave: 1, master: 0 }; } },
      { id: "pwm", label: "Pulse-width modulation", why: "The Model D's pulse widths are three fixed switch positions (M 18); here the LFO sweeps them, through the mod wheel. Commonly wished for, unverified.", cite: [cite("M", 18)],
        eng: function (E) { E.osc.forEach(function (o) { if (o.waves.pulse && o.pw < 0.45) o.pw = 0.3; }); E.routes = E.routes.concat([{ id: "wi-pwm", src: [["lfo", 1]], dst: ["pw0", "pw1", "pw2"], amt: 0.25, gain: "wheel" }]); } },
      { id: "release", label: "A release stage", why: "The contours have attack, decay and sustain; the release is either the decay time (DECAY switch on) or none (M 23, 30). Here a release of 1.2 s whatever the decay. Commonly wished for, unverified.",
        cite: [cite("M", 23), cite("M", 30)], eng: function (E) { E.aenv.r = 1.2; E.fenv.r = 1.2; } }],
    prophet: [
      { id: "fx", label: "Delay and reverb, as on the Prophet-6", why: "The Prophet-6 manual lists dual digital effects and a high-pass filter among the touches \"that the original never had\" (P6 PDF 9).",
        cite: [cite("P6", "PDF 9")], eng: function (E) { E.fx = [{ k: "ddl", a: 0.35, b: 0.35, mix: 0.3 }, { k: "hal", a: 0.6, b: 0.4, mix: 0.25 }]; } }],
    juno: [
      { id: "osc2", label: "A second oscillator", why: "The Juno-60 has one DCO a voice; Wikipedia says its chorus was designed to make up for the weaker sound of the single oscillator (\"Roland Juno-60\").",
        cite: [cite("J6", 12), cite("WP", "Roland Juno-60")], eng: function (E) { var d = JSON.parse(JSON.stringify(E.osc[0])); d.semis += 0.12; d.lvl *= 0.8; E.osc[2] = d; } }],
    dx7: [
      { id: "filter", label: "A resonant low-pass filter", why: "The DX7 has no filter: \"There are no filters involved\" (DX 35). Here the operators' output goes through a 24 dB ladder with some resonance, opened by the first operator's envelope. Commonly wished for, unverified.",
        cite: [cite("DX", 35)], eng: function (E) { E.fmFilt = { cut: 1800, res: 0.45 }; } }],
    ms20: [
      { id: "poly", label: "Four voices", why: "The MS-20 is monophonic (Wikipedia, \"Korg MS-20\"). Commonly wished for, unverified.", cite: [cite("WP", "Korg MS-20")], eng: function (E) { E.voices = 4; E.prio = "last"; } }],
    taurus: [
      { id: "lfo", label: "An LFO on the pitch (as on the Taurus III)", why: "The early Taurus models had no LFO; the Taurus III added one that reaches oscillator pitch or the filter (Wikipedia, \"Moog Taurus\").",
        cite: [cite("WP", "Moog Taurus")], eng: function (E) { E.lfo = { hz: 5, tri: 1, sq: 0, saw: 0, uni: false }; E.routes = E.routes.concat([{ id: "wi-lfo", src: [["lfo", 1]], dst: ["p0", "p1"], amt: 0.3, gain: "fixed" }]); } }]
  };
  for (var wid in WI) PROFILES[wid].whatif = WI[wid];

  // the defaults every engine patch has (also what the Model D and Prophet-5 patches leave out)
  function base(id, E) {
    var d = { synth: id, voices: 1, unison: 1, uniDet: 0, prio: "last", legato: false, osc: [oscEmpty(), oscEmpty(), oscEmpty()], sync: null, noise: { lvl: 0, pink: false }, modNoise: "white",
      fb: 0, ring: null, model: "ladder", mode: "lp", slope: 24, cut: 1000, res: 0, env: 0, kbd: 0, velF: 0, hpf: null, fenv: { a: 0.001, d: 0.3, s: 1, r: 0.1, lin: false },
      aenv: { a: 0.001, d: 0.3, s: 1, r: 0.1, lin: false, vel: 0 }, amp: null, lfo: { hz: 5, tri: 1, sq: 0, saw: 0, uni: false }, routes: [], glide: 0, glideLegato: false,
      bend: 2, drift: 0, vol: 0.6, chorus: 0, accent: 0, fm: null, env3: null, hold: 0, shHz: 0 };
    for (var k in E) d[k] = E[k];
    return d;
  }
  var ENG = { moog: engMoog, prophet: engProphet, tb303: eng303, juno: engJuno, arp2600: engArp, obxa: engOb, ms20: engMs20, dx7: engDx7, ppg: engPpg,
    p6: engP6, taurus: engTaurus, voyager: engVoyager, sub37: engSub37, grandmother: engGrand, memorymoog: engMemory, vital: engVital, surge: engSurge };
  // SC.engine(id, state, mods): mods = { whatifId: true } (or a list of ids) changes the SOUND only; translate() never passes it.
  SC.engine = function (id, s, mods) {
    var E = base(id, ENG[id](s)), W = PROFILES[id].whatif || [], on = Array.isArray(mods) ? mods : Object.keys(mods || {}).filter(function (k) { return mods[k]; });
    if (on.length) { E = JSON.parse(JSON.stringify(E)); W.forEach(function (w) { if (on.indexOf(w.id) >= 0) w.eng(E); }); E.whatif = on.slice(); }
    return E;
  };
  SC.toCanon = function (id, s) { var c = SC.engine(id, s); c.src = id; return c; };
  SC.IDS = Object.keys(ENG);

  // ---------- translation through the canonical description ----------
  function pc(id, feat) {   // the manual page that a synth's feature is on
    var P = PROFILES[id], p = P.pg[feat]; if (p == null) p = P.pg._;
    return Array.isArray(p) ? cite(p[0], p[1]) : cite(P.book, p);
  }
  var WNAME = { saw: "sawtooth", rsaw: "reverse sawtooth", tri: "triangle", trisaw: "triangle-sawtooth", pulse: "pulse", sine: "sine", wt: "wavetable" };
  var NEAR = { saw: ["saw", "rsaw", "trisaw", "wt", "pulse"], rsaw: ["rsaw", "saw", "pulse"], tri: ["tri", "sine", "trisaw", "wt", "pulse", "saw"], sine: ["sine", "tri", "wt", "pulse", "saw"],
    trisaw: ["trisaw", "saw", "tri", "wt"], pulse: ["pulse", "wt", "saw"], wt: ["saw", "pulse", "sine"] };
  function wavesOf(o) { if (o.wt) return ["wt"]; return Object.keys(o.waves).filter(function (k) { return o.waves[k]; }); }
  function kindOf(name) { return /^(lfo|lfoSq)$/.test(name) ? "lfo" : /^(noise|noiseMod)$/.test(name) ? "noise" : /^(fenv|aenv|env3|env3rev|fenvrev)$/.test(name) ? "env" : /^(sh|shL)$/.test(name) ? "sh" : /^(osc|sine|sq)/.test(name) ? "osc" : name; }
  function dstKind(d) { return /^p\d/.test(d) ? "pitch" : /^pw/.test(d) ? "pw" : d; }
  var KIND_NAME = { "lfo>pitch": "LFO → pitch (vibrato)", "lfo>cut": "LFO → filter", "lfo>pw": "LFO → pulse width", "lfo>hcut": "LFO → high-pass filter", "lfo>wt": "LFO → wavetable position",
    "lfo>amp": "LFO → loudness (tremolo)", "noise>pitch": "Noise → pitch", "noise>cut": "Noise → filter", "noise>pw": "Noise → pulse width", "env>pitch": "Envelope → pitch", "env>cut": "Envelope → filter",
    "env>pw": "Envelope → pulse width", "env>hcut": "Envelope → high-pass filter", "env>wt": "Envelope → wavetable position", "env>amp": "Envelope → loudness", "osc>pitch": "Oscillator → pitch (FM)",
    "osc>cut": "Oscillator → filter (audio-rate)", "osc>pw": "Oscillator → pulse width", "sh>pitch": "Sample and hold → pitch", "sh>cut": "Sample and hold → filter", "sh>pw": "Sample and hold → pulse width",
    "kbd>pitch": "Keyboard voltage → pitch", "kbd>cut": "Keyboard voltage → filter" };
  function modKinds(c) {   // the canonical routes grouped by kind, with the largest amount and whether the wheel sets it
    var K = {};
    (c.routes || []).forEach(function (r) {
      r.src.forEach(function (sw) {
        if (!sw[1]) return;
        r.dst.forEach(function (d) {
          var k = kindOf(sw[0]) + ">" + dstKind(d), a = Math.abs(r.amt * sw[1]) * (r.gain === "init" ? Math.max(r.init || 0, 0.01) : 1);
          if (!K[k]) K[k] = { amt: 0, dsts: [], wheel: r.gain === "wheel" || r.gain === "init", srcs: [] };
          K[k].amt = Math.max(K[k].amt, a); if (K[k].dsts.indexOf(d) < 0) K[k].dsts.push(d); if (K[k].srcs.indexOf(sw[0]) < 0) K[k].srcs.push(sw[0]);
        });
      });
    });
    return K;
  }
  function ratioOf(op) { return op.ratio * Math.pow(2, op.det * 0.7 / 1200); }
  function fmToSub(c) {   // the carriers of an FM patch as oscillators: the lesson's "nearest subtractive patch"
    var ops = c.fm.ops, alg = DX_ALG[c.fm.alg - 1], out = [], j;
    for (j = 0; j < 6; j++) {
      if ((alg[j] & 3) !== 0 || ops[j].lvl <= 0) continue;
      var inb = (alg[j] >> 4) & 3, mod = 0, modOp = null;
      for (var q = 0; q < 6; q++) if (q !== j && (alg[q] & 3) === inb && inb && ops[q].lvl > mod) { mod = ops[q].lvl; modOp = ops[q]; }
      if ((alg[j] & 0x40) && c.fm.fb > 4) mod = Math.max(mod, 60 + c.fm.fb * 5);
      out.push({ op: ops[j], mod: mod, modOp: modOp, semis: 12 * Math.log(ratioOf(ops[j])) / Math.LN2 });
    }
    return out;
  }
  function dxEnvToAdsr(op) {   // a DX7 4-rate / 4-level envelope as the nearest ADSR in seconds
    var l = op.l.map(dxAmp);
    return { a: op.r[0] * Math.abs(l[0] - 0), d: op.r[1] * Math.abs(l[0] - l[1]) + op.r[2] * Math.abs(l[1] - l[2]), s: l[2] / Math.max(l[0], 1e-3), r: op.r[3] * Math.max(0.05, l[2]), lin: false };
  }

  function translateCanon(c, T) {
    var S = PROFILES[c.src], P = PROFILES[T], cap = P.cap, sc = S.cap, N = [], I = {}, SN = "the " + S.name, TN = "the " + P.name, st = full(T, {});
    function nt(cls, what, why, feat, extra, from, to) {
      if (cls === "lost" && cap.panel) why += " (" + cap.panel + ")";
      note(N, cls, what, why, [pc(c.src, feat), pc(T, feat)].concat(extra || []), from || S.fc[feat] || [], to || P.fc[feat] || []);
    }
    function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    // --- voices ---
    I.voices = 1; I.unison = 1;
    if (c.voices > 1) {
      I.voices = Math.min(c.voices, cap.voices);
      if (cap.voices === 1 && cap.para) { I.voices = 2; nt("approx", "Chords (" + c.voices + " voices) → Duo mode", cap1(TN) + "'s Duo mode plays two notes at once, one on each oscillator, through the one filter and envelopes (S25 PDF 9): two notes of a chord, the rest lost.", "voices", [cite("S25", "PDF 9")]); }
      else if (cap.voices === 1) nt("lost", "Chords (" + c.voices + " voices)", cap1(SN) + " plays up to " + c.voices + " notes at once; " + TN + " plays one at a time, so a held chord sounds as one note.", "voices");
      else if (cap.voices < c.voices) nt("approx", "Voices: " + c.voices + " → " + cap.voices, "Both play chords, but " + TN + " has " + cap.voices + " voices to " + SN + "'s " + c.voices + ": a big chord or a long release loses notes.", "voices");
      else nt("exact", "Chords", "Both play chords: " + c.voices + " voices on " + SN + ", " + cap.voices + " on " + TN + ".", "voices");
    } else if (c.para) {
      I.voices = cap.para ? 2 : Math.min(2, cap.voices); nt(cap.para ? "exact" : cap.voices > 1 ? "approx" : "lost", "Duo mode: two notes, one filter", cap.para ? "Both play two notes through one filter." : cap.voices > 1 ? cap1(SN) + "'s two notes share one filter and envelope (S25 PDF 9); " + TN + " gives each note its own voice, so the two notes no longer move together." : cap1(TN) + " plays one note at a time.", "voices", [cite("S25", "PDF 9")]);
    } else if (c.unison > 1) {
      I.unison = cap.unison ? Math.min(c.unison, cap.voices) : 1;
      nt("approx", "Unison: " + c.unison + " voices on one note", cap.unison ? "Both can stack voices on one key; the detune between them is this page's guess on both." : cap1(TN) + " has no unison mode: one voice plays, and the stacked thickness is gone." , "voices");
    } else if (cap.voices === 1) nt("exact", "One voice", "Both play one note at a time.", "voices");
    else if (cap.mono) nt("exact", "One voice", "Both can play one note at a time: " + TN + " in its " + cap.mono + ".", "voices");
    else nt("approx", "One voice", cap1(SN) + " plays one note at a time; " + TN + " is polyphonic" + (cap.unison ? " (its unison mode is off here)" : " and has no mono mode") + ", so play one note at a time, and glides and legato behave differently.", "voices");
    // --- the sound sources ---
    I.osc = []; I.noise = null; I.ring = 0; I.sub = 0;
    var src = [];
    if (c.fm && !cap.fm) {
      var car = fmToSub(c);
      nt("lost", "FM: six operators in algorithm " + c.fm.alg, cap1(SN) + " makes every sound by frequency modulation: sine-wave operators, modulators bending the pitch of carriers so fast that new harmonics appear (DX 23-24). " +
        cap1(TN) + " has no operators. Its oscillators make fixed waves and a filter takes harmonics away. This page builds the nearest subtractive patch: each sounding carrier becomes an oscillator, the modulators' levels become how bright the wave and filter are, and their envelopes become the filter envelope. Bells, metallic and electric-piano attacks do not survive.", "fm", [], S.fc.fm, P.fc.filter);
      car.forEach(function (x) { src.push({ on: true, lvl: dxAmp(x.op.lvl), waves: x.mod > 70 ? { saw: 1 } : x.mod > 40 ? { pulse: 1 } : { tri: 1 }, pw: 0.5, oct: 0, semis: x.semis, kbd: true, fmNote: x }); });
      if (car.length) { var m = car[0]; I.fmBright = Math.max.apply(null, car.map(function (x) { return x.mod; })); I.fmEnv = m.modOp ? dxEnvToAdsr(m.modOp) : null; I.fmAmp = dxEnvToAdsr(m.op); }
    } else c.osc.forEach(function (o) { if (o.on && o.lvl > 0 && !o.sub) src.push(o); });
    var subO = c.osc.filter(function (o) { return o.sub && o.on && o.lvl > 0; })[0];
    if (cap.fm && !c.fm) {
      nt("approx", "Oscillators become operator pairs", "Each sounding oscillator becomes a carrier with a modulator above it (algorithm 5: three stacks of two, DX 24). A modulator at the same frequency gives the sawtooth-like tone the manual describes (DX 35); at twice the frequency, a hollower, square-like one. The modulator's level and envelope stand in for the filter.", "osc", [cite("DX", 35)], [], P.fc.fm);
      nt("lost", "The filter", "The DX7 has no filter: \"There are no filters involved\" (DX 35). Cutoff, resonance and the filter envelope become modulator levels and envelopes, which brighten and darken a tone in a different way; resonance has no match.", "filter", [cite("DX", 35)]);
    }
    var nOsc = cap.fm && !c.fm ? 3 : cap.oscN;
    src.forEach(function (o, i) {
      var lbl = o.fmNote ? "carrier operator " + o.fmNote.op.n : "oscillator " + (c.osc.indexOf(o) + 1), from = o.fmNote ? S.fc.fm : S.fc["osc" + c.osc.indexOf(o)];
      if (i >= nOsc) { nt("lost", cap1(lbl) + " (one more than " + TN + " has)", cap1(SN) + " sounds " + src.length + " sources on each note; " + TN + " has " + cap.oscN + (cap.oscN === 1 ? " oscillator" : " oscillators") + " a voice, so this one is left out.", "osc", [], from, []); return; }
      var basic = o.wt && o.wt.t === VT_TAB && T !== "vital", to = P.fc["osc" + i] || [], have = basic ? [nearShape(o)] : wavesOf(o), allowed = cap.fm && !c.fm ? ["saw", "pulse", "tri", "sine"] : cap.waves[i] || [], pick = [];
      have.forEach(function (w) { if (allowed.indexOf(w) >= 0) pick.push(w); });
      var cls = pick.length === have.length && (have.length < 2 || cap.multi) ? "exact" : "approx";
      if (!cap.multi && pick.length > 1) pick = [pick.indexOf("saw") >= 0 ? "saw" : pick[0]];
      if (!pick.length) { var near = null; have.forEach(function (w) { (NEAR[w] || []).forEach(function (x) { if (!near && allowed.indexOf(x) >= 0) near = x; }); }); pick = [near || allowed[0]]; cls = "approx"; }
      if (o.fmNote || (cap.fm && !c.fm) || basic || (o.wt && T === "vital" && o.wt.t !== VT_TAB)) cls = "approx";
      var info = { src: o, waves: pick, pw: basic ? 0.5 : o.pw, semis: o.oct * 12 + o.semis, kbd: o.kbd, lvl: Math.min(1, o.lvl), wt: basic ? null : o.wt };
      I.osc[i] = info;
      var why = basic ? "Vital's oscillator reads a wavetable; on this page its table runs sine, triangle, square, saw (after Vital's Basic Shapes, unverified), so wave frame " + Math.round(o.wt.pos / 63 * 256) + " is nearest a " + WNAME[have[0]] + (pick[0] === have[0] ? ", which " + TN + " has." : "; " + TN + " offers " + allowed.map(function (w) { return WNAME[w]; }).join(", ") + ", so a " + WNAME[pick[0]] + " stands in.")
        : o.wt && T === "vital" && o.wt.t !== VT_TAB ? "Vital can load any wavetable, but this page's Vital has only its basic-shapes table, so the " + WNAME[nearShape(o)] + " nearest this wave stands in (the PPG's own tables are not copied either)."
        : o.fmNote ? "Ratio " + (Math.round(ratioOf(o.fmNote.op) * 100) / 100) + " becomes the pitch; its modulator at level " + o.fmNote.mod + " becomes a " + WNAME[pick[0]] + " (the brighter the modulation, the brighter the wave: DX 35)."
        : have[0] === "wt" ? "A wavetable oscillator steps through a table of 64 waves (SOS); " + TN + " has fixed waves, so the nearest, a " + WNAME[pick[0]] + ", stands in for wave " + Math.round(o.wt.pos) + "."
        : pick[0] === "wt" ? "The " + have.map(function (w) { return WNAME[w]; }).join(" + ") + " becomes the nearest wave in this page's wavetables (the PPG's own tables are not copied)."
        : cap.fm && !c.fm ? "There are no waveforms to pick on the DX7, only sine-wave operators: a carrier and its modulator imitate the " + WNAME[have[0]] + " (DX 35, 62)."
        : cls === "exact" ? "The same wave" + (have.length > 1 ? "s at once" : "") + " on both: " + have.map(function (w) { return WNAME[w]; }).join(" + ") + "."
        : "Has " + have.map(function (w) { return WNAME[w]; }).join(" + ") + "; " + TN + "'s " + (i + 1) + (i ? "nd" : "st") + " oscillator offers " + allowed.map(function (w) { return WNAME[w]; }).join(", ") + (cap.multi ? "" : ", one at a time") + ", so " + pick.map(function (w) { return WNAME[w]; }).join(" + ") + " stands in.";
      nt(cls, cap1(lbl) + ": " + have.map(function (w) { return WNAME[w]; }).join(" + ") + " → " + pick.map(function (w) { return WNAME[w]; }).join(" + "), why, "osc", [], from, to);
      // pulse width
      if (have.indexOf("pulse") >= 0 && pick.indexOf("pulse") >= 0 && Math.abs(o.pw - 0.5) > 0.03) {
        var pwOk = cap.pw === "knob" || (cap.pw === "knob1" && i === 0) || (cap.pw === "knob23" && i > 0);
        nt(pwOk ? "exact" : "approx", "Pulse width " + Math.round(o.pw * 100) + " %", pwOk ? "A pulse-width control on both; the knob curves are this page's." : cap1(TN) + (cap.pw === "three" ? " has three fixed pulse widths" : cap.pw === "square" ? "'s pulse is a square" : " cannot set this oscillator's width") + ", so the nearest is used.", "pw", [], from, P.fc.pw);
      }
      // tuning
      var semis = info.semis, tune = cap.tune[i] || "free", frac = Math.abs(semis - Math.round(semis)), octOff = Math.abs(semis / 12 - Math.round(semis / 12)) > 0.01;
      if (Math.abs(semis) > 0.02 || tune === "master" || tune === "fixed") {
        var tcls = tune === "free" || tune === "ratio" ? "exact" : tune === "semi+" ? "exact" : tune === "semi" ? (frac > 0.03 ? "approx" : "exact") : tune === "oct" ? (octOff ? "approx" : "exact") : tune === "master" ? (src.length > 1 || Math.abs(semis) > 5 ? "approx" : "exact") : "approx";
        if (tune === "fixed" && Math.abs(semis) < 0.02) tcls = "exact";
        nt(tcls, cap1(lbl) + " tuned " + (semis >= 0 ? "+" : "") + r1(semis) + " semitones", tcls === "exact" ? "Both can set this interval." :
          tune === "oct" ? cap1(TN) + "'s " + (i + 1) + (i ? "nd" : "st") + " oscillator moves in octaves only, so the nearest octave is used." : tune === "semi" ? "Only whole semitones on " + TN + "; the fine detune is lost." :
          tune === "master" ? cap1(TN) + " has one oscillator and one tuning knob for the whole instrument." : "This oscillator's pitch is fixed against the others on " + TN + ".", "osc", [], from, to);
      }
      if (!o.kbd) nt((cap.kbdOff || []).indexOf(i) >= 0 ? "approx" : "lost", cap1(lbl) + " off the keyboard", "It holds one pitch whatever key is played (a drone or a slow modulator). " + cap1(TN) + ((cap.kbdOff || []).indexOf(i) >= 0 ? " can do this too; its range differs." : " cannot take this oscillator off the keyboard."), "osc", [], from, to);
    });
    if (subO) {
      if (cap.sub) { I.sub = subO.lvl; nt("exact", "Sub-oscillator", "A square one octave below on both.", "sub"); }
      else if (I.osc.length < nOsc && !cap.fm) { I.osc.push({ src: subO, waves: [cap.waves[I.osc.length].indexOf("pulse") >= 0 ? "pulse" : cap.waves[I.osc.length][0]], pw: 0.5, semis: subO.oct * 12, kbd: true, lvl: subO.lvl }); nt("approx", "Sub-oscillator → oscillator " + I.osc.length, cap1(TN) + " has no sub-oscillator; a spare oscillator an octave down plays its part.", "sub"); }
      else nt("lost", "Sub-oscillator", cap1(TN) + " has no sub-oscillator and no spare oscillator for it.", "sub");
    }
    if (c.noise && c.noise.lvl > 0) {
      var col = c.noise.red ? "red" : c.noise.pink ? "pink" : "white";
      if (!cap.noise) nt("lost", "Noise", cap1(TN) + " has no noise source.", "noise");
      else { I.noise = { lvl: c.noise.lvl, col: cap.noise.indexOf(col) >= 0 ? col : "white" }; nt(cap.noise.indexOf(col) >= 0 ? "exact" : "approx", "Noise (" + col + ")", cap.noise.indexOf(col) >= 0 ? "Both have " + col + " noise." : cap1(TN) + "'s noise is " + cap.noise.join(" / ") + " only; filter it for a darker colour.", "noise"); }
    }
    if (c.ring && c.ring.lvl > 0) {
      if (cap.ring) { I.ring = c.ring.lvl; nt("approx", "Ring modulator", "Both have one. Its inputs differ: " + (c.ring.kind === "arp" ? "VCO-1 saw and VCO-2 sine on the ARP (A2 6)" : c.ring.kind === "mul" ? "oscillators 1 and 2 multiplied on Surge XT (SX, Mixer)" : "VCO-1 and VCO-2 on the MS-20 (K2 5)") + "; " + (cap.cords ? "the nearest normalled inputs are used." : "the nearest is used."), "ring"); }
      else nt("lost", "Ring modulator", "It multiplies two oscillators, giving sums and differences of their frequencies: the clangorous, metallic sound (K2 5). " + cap1(TN) + " has no ring modulator.", "ring");
      if (!cap.ring && !I.osc.length) {   // nothing else sounds: let the ring modulator's two inputs play as oscillators
        [0, 1].forEach(function (i) { var o = c.osc[i]; if (i >= cap.oscN) return; var w = c.ring.kind === "arp" ? (i ? "sine" : "saw") : wavesOf(o)[0] || "pulse", al = cap.waves[i] || [];
          var pk = al.indexOf(w) >= 0 ? w : (NEAR[w] || []).filter(function (x) { return al.indexOf(x) >= 0; })[0] || al[0];
          I.osc[i] = { src: o, waves: [pk], pw: 0.5, semis: o.oct * 12 + o.semis, kbd: o.kbd, lvl: c.ring.lvl * 0.7 }; });
        nt("approx", "The ring modulator's inputs as plain oscillators", "With the ring modulator gone nothing would sound, so its two inputs play side by side: the same two pitches, without the sum and difference tones.", "ring");
      }
    }
    if (c.fb > 0) nt(cap.fb ? "exact" : "lost", "Output fed back into the mixer", cap.fb ? "Both." : "The Model D's output runs back into its own mixer and overloads it (M 27, 36). " + cap1(TN) + " has no such path.", "fb");
    if (c.sync) {
      var sy = c.sync === true ? { slave: 0, master: 1 } : c.sync;
      if (cap.sync) { I.sync = true; nt(cap.sync[0] === sy.slave ? "exact" : "approx", "Hard sync", cap.sync[0] === sy.slave ? "Both restart one oscillator from the other." : "Both have sync, but " + TN + " syncs oscillator " + (cap.sync[0] + 1) + " to " + (cap.sync[1] + 1) + ", so the oscillators swap roles.", "sync"); }
      else nt("lost", "Hard sync", "One oscillator restarts its cycle with the other's, the tearing sync-sweep sound. " + cap1(TN) + " has no sync.", "sync");
    }
    // --- the filter ---
    I.filter = { mode: c.mode || "lp", slope: c.slope, cut: c.cut, res: c.res, env: c.env, kbd: c.kbd };
    if (c.fm && !cap.fm) {
      var b = I.fmBright || 0; I.filter = { mode: "lp", slope: 24, cut: 300 * Math.pow(2, b / 99 * 5), res: 0.1, env: I.fmEnv ? b / 99 * 4 : 0, kbd: 1 };
      nt("approx", "Filter set from the modulators", "Modulator level " + b + " of 99 becomes the cutoff, and the modulator's envelope the filter envelope (this page's rule of thumb).", "filter", [], S.fc.fm, P.fc.filter);
    } else if (!cap.fm && c.model !== "none") {
      var F = cap.filters, want = I.filter.mode, ws = c.slope, best = null;
      F.forEach(function (f) { if (!best && f[0] === want && f[1] === ws) best = f; }); F.forEach(function (f) { if (!best && f[0] === want) best = f; });
      var lpOnly = !best; if (!best) best = F[0];
      I.filter.mode = best[0]; I.filter.slope = best[1];
      var semN = T === "obxa" && best[0] !== "lp" ? [pc("obxa", "sem")] : [];
      if (lpOnly) nt("lost", "Filter mode: " + want, cap1(SN) + "'s filter is set to " + { bp: "band-pass", hp: "high-pass", notch: "notch" }[want] + "; " + TN + " has only a low-pass, so the sound changes completely.", "filter", semN);
      else if (best[1] !== ws) nt("approx", "Filter slope " + ws + " → " + best[1] + " dB per octave", (ws === 12 ? "A 2-pole, 12 dB-per-octave filter lets more of the harmonics above the cutoff through: brighter, less rounded. " : "A 4-pole, 24 dB-per-octave filter cuts harder above the cutoff. ") + cap1(TN) + "'s " + best[0].toUpperCase() + " filter is " + best[1] + " dB. The plot shows both slopes.", "filter", [pc(c.src, "slope"), pc(T, "slope")].concat(semN));
      else nt("approx", "Filter: " + best[1] + " dB " + { lp: "low-pass", bp: "band-pass", hp: "high-pass", notch: "notch" }[best[0]], "The same type and slope on both, but different circuits: the cutoff and resonance carry over, the character (above all with resonance up) does not. Knob curves are this page's.", "filter", [pc(c.src, "slope"), pc(T, "slope")].concat(semN));
      if (c.res > 0.9 && !cap.selfOsc) nt("approx", "Resonance at self-oscillation", cap1(TN) + "'s filter does not whistle on its own; it stops just short.", "filter", [pc(T, "slope")]);
      if (c.res > 0.9 && cap.selfOsc && !sc.selfOsc) nt("approx", "Resonance", cap1(TN) + "'s filter can self-oscillate where " + SN + "'s cannot: the top of the knob is held back.", "filter");
      var kt = c.kbd, ks = cap.kbd;
      if (ks !== "free" && kt > 0.01) { var nk = ks.reduce(function (a, x) { return Math.abs(x - kt) < Math.abs(a - kt) ? x : a; }, ks[0]); I.filter.kbd = nk; if (Math.abs(nk - kt) > 0.05) nt("approx", "Key tracking " + Math.round(kt * 100) + " %", cap1(TN) + "'s filter tracking is " + ks.map(function (x) { return Math.round(x * 100) + " %"; }).join(" / ") + "; " + Math.round(nk * 100) + " % is the nearest.", "kbd"); }
    }
    if (c.hpf && (c.hpf.cut > 0 || c.hpf.boost)) {
      I.hpf = c.hpf;
      if (cap.hpf) nt("approx", "High-pass filter", "Both have one: " + (cap.hpf === "vc" ? "on " + TN + " it is a resonant, voltage-controlled filter in series with the low-pass" : cap.hpf === "patch" ? "on " + TN + " it is a 1-pole high-pass in the utilities, patched between the mixer and the filter by a cord" : "on " + TN + " it has a few fixed settings and is not voltage-controlled") + "; the nearest setting is used.", "hpf");
      else nt(c.hpf.boost ? "approx" : "lost", c.hpf.boost ? "Bass boost (HPF at 0)" : "High-pass filter", c.hpf.boost ? "The Juno-106's HPF at 0 boosts the lows (J1 18); " + TN + " has nothing for it, raise the sub or the lowest oscillator instead." : "It thins the low end before the low-pass filter. " + cap1(TN) + " has no high-pass filter.", "hpf", c.hpf.boost ? [cite("J1", 18)] : []);
    }
    // --- envelopes ---
    I.fenv = I.fmEnv || c.fenv; I.aenv = I.fmAmp || c.aenv; I.env3 = c.env3;
    var same = Math.abs(c.fenv.a - c.aenv.a) < 0.02 && Math.abs(c.fenv.d - c.aenv.d) / Math.max(c.aenv.d, 0.01) < 0.3 && Math.abs(c.fenv.s - c.aenv.s) < 0.15;
    if (cap.envs === "adsr1") nt(same || c.fm ? "approx" : "approx", "One envelope for filter and loudness", cap1(TN) + " has one ADSR envelope for both" + (same ? "; here they are about the same, so the loudness shape is kept." : "; " + SN + "'s two envelopes differ, so the loudness shape is kept and the filter follows it."), "env");
    else if (cap.envs === "303") nt("approx", "Envelopes → one Decay knob", "The TB-303's envelope has only DECAY, which sets how long both the volume and the tone take to fade (R3 34); attack, sustain and release are lost, and a held note fades.", "env");
    else if (cap.envs === "ms20") nt("approx", "Envelopes → EG 2 (and EG 1)", "On the MS-20, EG 2 (hold, attack, decay, sustain, release) drives both the VCA and the filters, and EG 1 (delay, attack, release) the pitch (K2 6). " + (same ? "The two shapes here are close." : "One shape is kept for both."), "env");
    else if (cap.envs === "dx") nt("approx", "Envelopes → operator envelopes", "Each DX7 operator has its own envelope of four rates and four levels; L3 is the sustain (DX 26, 62). The amplitude envelope goes to the carriers, the filter envelope to the modulators. Rate-to-time is this page's curve.", "env");
    else if (cap.envs === "ads") nt("approx", "Envelopes → contours", T === "taurus" ? "The Taurus's filter contour has attack and decay, its loudness attack and sustain; with DECAY on the note dies away at the decay rate, with it off it stops at once (TA PDF 5)." : "The Model D's contours have attack, decay and sustain, and the DECAY switch makes the release equal the decay (M 23, 30).", "env");
    else if (cap.envs === "ar+adsr") nt("approx", "Envelopes → ADSR and AR", "The ARP has an ADSR and an AR envelope; normalled, the ADSR goes to the filter and the AR to the VCA (A2 11-12). Sustain on the AR is always full.", "env");
    else if (sc.envs === "303" || sc.envs === "adsr1" || sc.envs === "dx" || sc.envs === "ms20") nt("approx", "Envelopes", cap1(TN) + " has separate ADSR envelopes for filter and loudness; they are set from " + SN + "'s.", "env");
    else nt("exact", "Envelopes", "Both have separate envelopes for the filter and the loudness; times are matched on this page's curves.", "env");
    if (c.hold > 0) nt(cap.envs === "ms20" ? "exact" : "approx", "Hold time", "MS-20's EG 2 holds the note on for a while after the key lifts (K2 6). " + (cap.envs === "ms20" ? "Same." : "Longer release stands in."), "env");
    if (c.accent > 0) nt(cap.accent ? "exact" : cap.vel ? "approx" : "lost", "Accent", "Accented steps on the TB-303 are louder and brighter, the ACCENT knob setting how much (R3 34; accent is stored per step, R3 89). " + (cap.accent ? "Same here." : cap.vel ? cap1(TN) + "'s velocity stands in: play accented notes harder." : cap1(TN) + " has nothing per note to do it."), "accent");
    // --- LFO and modulation ---
    var K = modKinds(c), lfoUsed = false; I.mods = {};
    Object.keys(K).forEach(function (k) {
      var x = K[k], ok = (cap.mods || []).indexOf(k) >= 0 || (cap.cords && /^(env|sh|noise|osc|lfo|kbd)>(pitch|cut|amp|pw)$/.test(k)), name = KIND_NAME[k] || k;
      if (/^lfo|^sh/.test(k)) lfoUsed = true;
      if (k === "kbd>pitch") return;
      if (cap.fm && k !== "lfo>pitch" && k !== "lfo>amp") { nt("lost", name, "The DX7's LFO reaches pitch and loudness (DX 21); nothing else can be modulated.", "mods"); return; }
      if (!ok) { nt("lost", name, cap1(TN) + " has no route for this" + (k === "lfo>pw" || k === "env>pw" ? ": its pulse width cannot move." : k === "lfo>pitch" && !(cap.lfo || []).length ? ": it has no LFO." : "."), "mods"); return; }
      I.mods[k] = x;
      var wheelSrc = x.wheel, wheelDst = !!cap.wheelOnly;
      nt(wheelSrc === wheelDst ? "exact" : "approx", name, (wheelSrc !== wheelDst ? (wheelDst ? "On " + TN + " modulation goes through the mod wheel only: push it up to hear this. " : "On " + SN + " the mod wheel sets this; on " + TN + " it is a fixed amount. ") : "Both can do it. ") + "Depths are this page's.", "mods");
    });
    if (lfoUsed && (cap.lfo || []).length && !cap.fm) {
      var L = c.lfo, shp = L.sine ? "sine" : L.saw ? "saw" : L.sq && !L.tri ? "sq" : "tri", hz = clamp(L.hz, cap.lfoHz[0], cap.lfoHz[1]);
      if (K["sh>pitch"] || K["sh>cut"] || K["sh>pw"]) shp = "sh";
      var shpOk = cap.lfo.indexOf(shp) >= 0 || (shp === "sine" && cap.lfo.indexOf("tri") >= 0);
      I.lfo = { hz: hz, shape: cap.lfo.indexOf(shp) >= 0 ? shp : cap.lfo[0], delay: L.delay || 0 };
      nt(shpOk && Math.abs(hz - L.hz) < 0.01 ? "exact" : "approx", "LFO " + r1(L.hz) + " Hz, " + shp, (shpOk ? "" : cap1(TN) + "'s LFO shapes are " + cap.lfo.join(", ") + "; " + I.lfo.shape + " stands in. ") + (Math.abs(hz - L.hz) > 0.01 ? "Its rate runs " + cap.lfoHz[0] + "-" + cap.lfoHz[1] + " Hz, so it stops at " + r1(hz) + " Hz. " : "") + "Rates matched on this page's curves.", "lfo");
      if (L.delay > 0) nt(cap.lfoDelay ? "exact" : "approx", "LFO delay", cap.lfoDelay ? "Both fade the LFO in after the key goes down." : cap1(TN) + " has no LFO delay; the modulation starts at once.", "lfo");
    }
    // --- the rest ---
    I.glide = c.glide; I.bend = c.bend;
    if (c.glide > 0) {
      if (c.glideLegato) nt(cap.glide === "slide" ? "exact" : cap.glide ? "approx" : "lost", "Slide", "TB-303 slide glides between overlapping steps, stored per step (R3 89, 40). " + (cap.glide === "slide" ? "Same." : cap.glide ? cap1(TN) + "'s glide acts on every note, not only tied ones." : cap1(TN) + " has no glide."), "glide");
      else nt(cap.glide === true || cap.glide === "106" ? (cap.glide === "106" ? "approx" : "exact") : cap.glide === "slide" ? "approx" : "lost", "Glide", cap.glide === true ? "Both glide; times on this page's curve." : cap.glide === "106" ? "The Juno-60's DCO has no portamento (J6 12); the Juno-106 adds it (J1 23), so the Model switch goes to 106." : cap.glide === "slide" ? "The TB-303 glides only on slide steps, with a fixed time (R3 89)." : cap1(TN) + " has no glide.", "glide", cap.glide === "106" ? [cite("J1", 23)] : []);
    }
    I.fx = [];
    if (c.chorus && !cap.chorus && (cap.fx || []).indexOf("cho") >= 0) { I.fx.push({ k: "cho", a: c.chorus === 2 ? 0.45 : 0.3, b: c.chorus === 2 ? 0.7 : 0.45, mix: 0.5 }); nt("approx", "Chorus " + ["", "I", "II"][c.chorus] + " → the chorus effect", "The Juno's chorus is part of its analog circuit (J6 22); " + TN + "'s chorus is one of its digital effects. Rates and depths are this page's.", "chorus", [pc(T, "fx")]); }
    else if (c.chorus) nt(cap.chorus ? "exact" : "lost", "Chorus " + ["", "I", "II"][c.chorus], cap.chorus ? "Both." : "The Juno's built-in chorus (I, or the stronger II, J6 22) widens and thickens every note. " + cap1(TN) + " has none; an external chorus pedal does it.", "chorus");
    (c.fx || []).forEach(function (f) {
      var nm = FXN[f.k] || f.k, have = (cap.fx || []).indexOf(f.k) >= 0, rev = /^(hal|roo|pla|spr)$/.test(f.k), dly = /^(bbd|ddl)$/.test(f.k), near = !have && (rev || dly) && (cap.fx || []).filter(function (k) { return rev ? /^(hal|roo|pla|spr)$/.test(k) : /^(bbd|ddl)$/.test(k); })[0];
      if (f.k === "dist" && cap.drive) { I.drive = f.a; nt("approx", "Distortion → MultiDrive", "The Prophet-6's distortion comes after the filter (P6 41); " + TN + "'s drive is inside the filter stage, so it grows with resonance and cutoff. Amounts are this page's.", "drive", [cite("P6", 41)]); return; }
      if (f.k === "cho" && cap.chorus && !have) { I.chorus = f.b > 0.6 ? 2 : 1; nt("approx", "Chorus effect → the Juno's chorus", "The nearest of the Juno's two chorus settings (J6 22).", "chorus"); return; }
      if (have || near) { I.fx.push(have ? f : { k: near, a: f.a, b: f.b, mix: f.mix }); nt(have ? "exact" : "approx", "Effect: " + nm, have ? "Both have it built in; times and depths are this page's." : cap1(TN) + "'s only " + (rev ? "reverb" : "delay") + " is its " + FXN[near] + ".", "fx", [pc(c.src, "fx"), pc(T, "fx")]); return; }
      nt("lost", "Effect: " + nm, cap1(SN) + " has a built-in " + nm + (f.k === "dist" ? " (P6 41)" : " (P6 26-28)") + "; " + TN + " has none: a pedal or the mixing desk does it.", "fx", [pc(c.src, f.k === "dist" ? "drive" : "fx")]);
    });
    if (c.drive > 0) { if (cap.drive) I.drive = c.drive; else if ((cap.fx || []).indexOf("dist") >= 0) I.fx.push({ k: "dist", a: c.drive, b: 0, mix: 1 });
      var dn = c.src === "sub37" ? "MultiDrive" : "Filter drive", dw = c.src === "sub37" ? "MultiDrive overdrives the filter stage (S25 PDF 16)" : cap1(SN) + "'s Drive pushes the sound harder into its filter";
      nt(cap.drive ? "exact" : (cap.fx || []).indexOf("dist") >= 0 ? "approx" : "lost", dn, cap.drive ? "Both drive the filter stage; amounts are this page's." : (cap.fx || []).indexOf("dist") >= 0 ? cap1(TN) + "'s distortion stands in; it comes after the filter (P6 41), not inside it." : dw + "; " + TN + " has nothing for it but running its mixer hot.", "drive", c.src === "sub37" ? [cite("S25", "PDF 16")] : []); }
    if (c.velF || (c.aenv && c.aenv.vel)) nt(cap.vel ? "exact" : "lost", "Velocity", cap.vel ? "Both respond to how hard the key is played." : cap1(TN) + "'s keyboard does not sense velocity here.", "vel");
    if (sc.memory && !cap.memory) nt("lost", "Stored programs", cap1(SN) + " stores its sounds (" + sc.memory + " memories); " + TN + "'s sound is set by hand on the panel and is gone when the knobs move.", "memory");
    else if (!sc.memory && cap.memory) nt("exact", "Stored programs", cap1(TN) + " can store this sound (" + cap.memory + " memories); " + SN + " cannot.", "memory");
    if (c.osc.some(function (o) { return o.wt; }) && Object.keys(K).some(function (k) { return />wt$/.test(k); }) && !cap.wt) { /* noted above as lost route */ }
    nt("exact", "Volume", "Output level carried over.", "vol");
    // set the knobs
    P.apply(c, st, I);
    return { state: st, notes: N };
  }

  // ---------- apply: each synth's knobs from the decisions above ----------
  function semisToFeet(v, feet, offs) { var o = Math.round(v / 12), best = feet[0]; feet.forEach(function (f) { if (Math.abs(offs[f] - o) < Math.abs(offs[best] - o)) best = f; }); return best; }
  function eIn(t, r) { return r1(clamp(expInv(Math.max(t, r[0]), r[0], r[1]), 0, 10)); }
  function hasW(o, w) { return o && o.waves.indexOf(w) >= 0; }
  function mk(I, k) { return I.mods && I.mods[k]; }
  PROFILES.moog.apply = function (c, s, I) {
    s.m1On = false; s.m1 = 0;
    I.osc.forEach(function (o, i) {
      var p = "o" + (i + 1), w = o.waves[0]; w = w === "pulse" ? (o.pw > 0.4 ? "square" : o.pw > 0.2 ? "wide" : "narrow") : w === "sine" ? "tri" : w === "rsaw" && i < 2 ? "saw" : w === "trisaw" && i === 2 ? "tri" : w;
      var oct = clamp(Math.round(o.semis / 12), -2, 2), rest = o.semis - oct * 12;
      s[p + "Range"] = o.kbd || i < 2 ? FEET[oct + 3] : "LO"; if (i > 0) s[p + "Freq"] = r1(clamp(rest, -7, 7)); s[p + "Wave"] = w; if (i === 2) s.o3Kbd = o.kbd;
      s["m" + (i + 1) + "On"] = true; s["m" + (i + 1)] = r1(o.lvl * 10);
    });
    if (I.noise) { s.nOn = true; s.n = r1(I.noise.lvl * 10); s.nCol = I.noise.col === "pink" ? "pink" : "white"; }
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, CUT[0], CUT[1]), 0, 10)); s.emph = r1(f.res * 10); s.amount = r1(clamp(Math.abs(f.env) / M_AMT_OCT * 10, 0, 10));
    s.kb1 = f.kbd > 0.8; s.kb2 = f.kbd > 0.5;
    s.fA = eIn(I.fenv.a, M_ATT); s.fD = eIn(I.fenv.d, M_DEC); s.fS = r1(I.fenv.s * 10); s.lA = eIn(I.aenv.a, M_ATT); s.lD = eIn(I.aenv.d, M_DEC); s.lS = r1(I.aenv.s * 10); s.decaySw = I.aenv.r > 0.05;
    var lp = mk(I, "lfo>pitch"), lc = mk(I, "lfo>cut");
    if (lp || lc) { s.src2 = "lfo"; s.modMix = 10; s.oscMod = !!lp; s.filtMod = !!lc; if (I.lfo) { s.lfoRate = r1(clamp(expInv(I.lfo.hz, M_LFO[0], M_LFO[1]), 0, 10)); s.lfoSq = I.lfo.shape === "sq"; } }
    var ep = mk(I, "env>pitch"); if (ep) { s.src1 = "fenv"; s.modMix = lp || lc ? 5 : 0; s.oscMod = true; }
    s.glideOn = I.glide > 0; s.glide = I.glide > 0 ? r1(clamp(expInv(I.glide, GLIDE[0], GLIDE[1]), 0, 10)) : 3; s.vol = r1(c.vol * 10);
  };
  PROFILES.prophet.apply = function (c, s, I) {
    s.mA = 0; s.mB = 0; s.aSaw = false;
    I.osc.forEach(function (o, i) {
      var pre = i ? "b" : "a"; s[pre + "Freq"] = clamp(24 + Math.round(o.semis), 0, 48);
      if (i) { s.bFine = r1(clamp((o.semis - Math.floor(o.semis)) / 0.95 * 10, 0, 10)); s.bFreq = clamp(24 + Math.floor(o.semis), 0, 48); s.bKbd = o.kbd; s.bTri = hasW(o, "tri") || hasW(o, "sine"); }
      s[pre + "Saw"] = hasW(o, "saw"); s[pre + "Pulse"] = hasW(o, "pulse"); if (s[pre + "Pulse"]) s[pre + "Pw"] = r1(clamp(pPwInv(o.pw), 0, 10));
      s["m" + pre.toUpperCase()] = r1(o.lvl * 10);
    });
    if (I.noise) s.mN = r1(I.noise.lvl * 10);
    s.aSync = !!I.sync;
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, CUT[0], CUT[1]), 0, 10)); s.res = r1(f.res * 10); s.envAmt = r1(clamp(Math.abs(f.env) / P_AMT_OCT * 10, 0, 10));
    s.kbd = f.kbd > 0.75 ? "full" : f.kbd > 0.25 ? "half" : "off";
    s.fA = eIn(I.fenv.a, P_ATT); s.fD = eIn(I.fenv.d, P_DEC); s.fS = r1(I.fenv.s * 10); s.fR = eIn(I.fenv.r, P_DEC);
    s.aA = eIn(I.aenv.a, P_ATT); s.aD = eIn(I.aenv.d, P_DEC); s.aS = r1(I.aenv.s * 10); s.aR = eIn(I.aenv.r, P_DEC); s.rel = true;
    if (I.lfo) { s.lfoFreq = r1(clamp(expInv(I.lfo.hz, P_LFO[0], P_LFO[1]), 0, 10)); s.lfoSaw = I.lfo.shape === "saw"; s.lfoSq = I.lfo.shape === "sq"; s.lfoTri = !s.lfoSaw && !s.lfoSq; }
    var lp = mk(I, "lfo>pitch") || mk(I, "noise>pitch"), lw = mk(I, "lfo>pw"), lc = mk(I, "lfo>cut") || mk(I, "noise>cut");
    if (lp) { s.wmFA = true; s.wmFB = true; s.lfoInit = r1(clamp(Math.sqrt(lp.amt / 12) * 10, 0, 10)); }
    if (lw) { s.wmPA = true; s.wmPB = true; s.lfoInit = Math.max(s.lfoInit, r1(clamp(lw.amt / 0.44 * 10, 0, 10))); }
    if (lc) { s.wmF = true; s.lfoInit = Math.max(s.lfoInit, r1(clamp(Math.sqrt(lc.amt / 5) * 10, 0, 10))); }
    if (mk(I, "noise>pitch") || mk(I, "noise>cut")) s.wmMix = 10;
    var ep = mk(I, "env>pitch"); if (ep) { s.pmFA = true; s.pmFenv = r1(clamp(ep.amt / 48 * 10, 0, 10)); }
    var ew = mk(I, "env>pw"); if (ew) { s.pmPA = true; s.pmFenv = Math.max(s.pmFenv, r1(clamp(ew.amt / 0.45 * 10, 0, 10))); }
    s.uni = I.voices === 1; s.uniN = clamp(I.unison, 1, 5); s.uniDet = I.unison > 1 ? 3 : 0;
    s.glide = I.glide > 0 ? r1(clamp(expInv(I.glide, GLIDE[0], GLIDE[1]), 0, 10)) : 0; s.bend = clamp(Math.round(I.bend || 2), 1, 12); s.vol = r1(c.vol * 10);
  };
  PROFILES.tb303.apply = function (c, s, I) {
    var o = I.osc[0]; if (o) { s.wave = hasW(o, "pulse") && !hasW(o, "saw") ? "square" : "saw"; s.tune = r1(clamp(o.semis + 12 - Math.round((o.semis + 12) / 12) * 12, -5, 5)); }
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, TB.cut[0], TB.cut[1]), 0, 10)); s.res = r1(clamp(f.res / 0.86 * 10, 0, 10)); s.envMod = r1(clamp(Math.abs(f.env) / 4 * 10, 0, 10));
    s.decay = r1(clamp(expInv(Math.max(I.fenv.d, I.aenv.d / 2.5), TB.dec[0], TB.dec[1]), 0, 10)); s.accent = c.accent ? r1(c.accent * 10) : 0; s.vol = r1(c.vol * 10);
  };
  PROFILES.juno.apply = function (c, s, I) {
    var o = I.osc[0];
    if (o) { s.saw = hasW(o, "saw") || hasW(o, "tri") || hasW(o, "sine"); s.pulse = hasW(o, "pulse"); s.range = semisToFeet(o.semis, ["16'", "8'", "4'"], { "16'": -1, "8'": 0, "4'": 1 }); if (s.pulse) { s.pwmMode = "man"; s.pwm = r1(clamp((0.5 - o.pw) / 0.45 * 10, 0, 10)); } s.vcaLvl = r1(clamp(o.lvl * 10, 0, 10)); }
    if (I.sub) { s.sub = true; s.subLvl = r1(I.sub / 0.8 * 10); }
    if (I.noise) s.noise = r1(I.noise.lvl * 10);
    if (I.hpf) { if (I.hpf.boost) { s.model = "106"; s.hpf = 0; } else s.hpf = clamp(Math.round(Math.log(Math.max(I.hpf.cut, 70) / 70) / Math.LN2 / 1.6), 0, 3); }
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, JU.cut[0], JU.cut[1]), 0, 10)); s.res = r1(f.res * 10); s.env = r1(clamp(Math.abs(f.env) / 6 * 10, 0, 10)); s.envPol = f.env < 0 ? "-" : "+"; s.kybd = r1(clamp(f.kbd * 10, 0, 10));
    var e = I.aenv; s.a = eIn(e.a, JU.a); s.d = eIn(e.d, JU.d); s.s = r1(e.s * 10); s.r = eIn(e.r, JU.r);
    if (I.lfo) { s.lfoRate = eIn(I.lfo.hz, JU.lfo); s.lfoDelay = r1(clamp(I.lfo.delay / 2 * 10, 0, 10)); }
    var lp = mk(I, "lfo>pitch"), lw = mk(I, "lfo>pw"), ew = mk(I, "env>pw"), lc = mk(I, "lfo>cut");
    if (lp) s.dLfo = r1(clamp(lp.amt / 3 * 10, 0, 10)); if (lw || ew) { s.pulse = true; s.pwmMode = lw ? "lfo" : "env"; s.pwm = r1(clamp((lw || ew).amt / 0.43 * 10, 0, 10)); } if (lc) s.fLfo = r1(clamp(lc.amt / 2 * 10, 0, 10));
    if (c.chorus) s.chorus = ["off", "I", "II"][c.chorus];
    if (I.glide > 0 && !c.glideLegato) { s.model = "106"; s.porta = r1(clamp(expInv(I.glide, 0.005, 3), 0, 10)); }
  };
  PROFILES.arp2600.apply = function (c, s, I) {
    s.inV3 = 0;
    var slots = [["inV1", "f1", "fine1", "kb1"], ["inV2", "f2", "fine2", "kb2", "pw2"], ["inV3", "f3", "fine3", "kb3", "pw3"]], used = [false, false, false];
    I.osc.forEach(function (o) {   // saw wants VCO-3 (its saw is normalled to the VCF), pulse VCO-2, square VCO-1
      var want = hasW(o, "saw") || hasW(o, "tri") || hasW(o, "sine") ? [2, 1, 0] : Math.abs(o.pw - 0.5) > 0.05 ? [1, 2, 0] : [0, 1, 2], i = want.filter(function (x) { return !used[x]; })[0];
      if (i == null) return; used[i] = true; var k = slots[i];
      s[k[0]] = r1(o.lvl * 10); s[k[1]] = clamp(Math.round(o.semis), A_SEMIS[0], A_SEMIS[1]); s[k[2]] = r1(clamp(o.semis - Math.round(o.semis), -1, 1) * 100) / 100; s[k[3]] = o.kbd;
      if (k[4]) s[k[4]] = clamp(Math.round(o.pw * 100), 10, 90);
    });
    if (I.noise) { s.inN = r1(I.noise.lvl * 10); s.nCol = I.noise.col === "red" ? "low" : I.noise.col; }
    if (I.ring) s.inRing = r1(I.ring * 10);
    var f = I.filter; s.cut = r1(clamp(expInv(f.cut, AR.cut[0], AR.cut[1]), 0, 10)); s.res = r1(f.res * 10); s.fAdsr = r1(clamp(Math.abs(f.env) / 5 * 10, 0, 10));
    s.aA = eIn(I.fenv.a, AR.env); s.aD = eIn(I.fenv.d, AR.env); s.aS = r1(I.fenv.s * 10); s.aR = eIn(I.fenv.r, AR.env);
    var a = I.aenv; if (a.s < 0.6) { s.vAr = 0; s.vAdsr = 10; s.aA = eIn(a.a, AR.env); s.aD = eIn(a.d, AR.env); s.aS = r1(a.s * 10); s.aR = eIn(a.r, AR.env); } else { s.arA = eIn(a.a, AR.env); s.arR = eIn(a.r, AR.env); }
    var cords = [];
    var ep = mk(I, "env>pitch"); if (ep) { s.v1adsr = s.v2adsr = s.v3adsr = r1(clamp(ep.amt / 24 * 10, 0, 10)); }
    var sp = mk(I, "sh>pitch"); if (sp) { s.v1sh = s.v2sh = r1(clamp(sp.amt / 24 * 10, 0, 10)); if (I.lfo) s.shRate = eIn(I.lfo.hz, AR.sh); }
    var np = mk(I, "noise>pitch"); if (np) s.v3noise = r1(clamp(np.amt / 24 * 10, 0, 10));
    var nw = mk(I, "noise>pw"); if (nw) s.v2pwm = r1(clamp(nw.amt / 0.4 * 10, 0, 10));
    var lp = mk(I, "lfo>pitch"), lc = mk(I, "lfo>cut");
    if ((lp || lc) && !used[1] && I.lfo) {   // no LFO: VCO-2 off the keyboard, its sine normalled to VCO-1, VCO-3 and the VCF
      s.kb2 = false; s.inV2 = 0; s.f2 = clamp(Math.round(12 * Math.log(I.lfo.hz / 440) / Math.LN2) + 9, A_SEMIS[0], A_SEMIS[1]);
      if (lp) { s.v1sin2 = s.v3sin2 = r1(clamp(lp.amt / 24 * 10, 0, 10)); } if (lc) s.fSin2 = r1(clamp(lc.amt / 4 * 10, 0, 10));
    }
    var scut = mk(I, "sh>cut"); if (scut) cords.push({ src: "sh", dst: "vcf", amt: r1(clamp(scut.amt / 5, -1, 1) * 100) / 100 });
    var ncut = mk(I, "noise>cut"); if (ncut) cords.push({ src: "noise", dst: "vcf", amt: r1(clamp(ncut.amt / 5, -1, 1) * 100) / 100 });
    s.cords = cords; s.vol = r1(c.vol * 10);
  };
  PROFILES.obxa.apply = function (c, s, I) {
    s.fO1 = false; s.fO2 = "off";
    I.osc.forEach(function (o, i) {
      if (i === 0) { s.fO1 = true; s.o1Saw = hasW(o, "saw") || hasW(o, "tri") || hasW(o, "sine"); s.o1Pulse = hasW(o, "pulse"); s.o1Freq = clamp(Math.round(o.semis / 12), -2, 2); }
      else { s.fO2 = o.lvl < 0.7 ? "half" : "full"; s.o2Saw = hasW(o, "saw") || hasW(o, "tri") || hasW(o, "sine"); s.o2Pulse = hasW(o, "pulse"); s.o2Freq = clamp(Math.round(o.semis), -30, 30); s.o2Det = r1(clamp((o.semis - Math.round(o.semis)) * 2, -1, 1) * 10) / 10; }
      if (hasW(o, "pulse")) s.pw = r1(clamp((0.5 - o.pw) / 0.45 * 10, 0, 10));
    });
    if (I.noise) s.fNoise = true;
    s.sync = !!I.sync;
    var f = I.filter; s.cutoff = r1(clamp(expInv(f.cut, OB.cut[0], OB.cut[1]), 0, 10)); s.res = r1(f.res * 10); s.fMod = r1(clamp(Math.abs(f.env) / 6 * 10, 0, 10)); s.track = f.kbd > 0.5;
    s.pole4 = f.slope !== 12; s.sem = f.mode === "lp" ? "off" : f.mode;
    function env(e, p) { s[p + "A"] = eIn(e.a, OB.env); s[p + "D"] = eIn(e.d, OB.env); s[p + "S"] = r1(e.s * 10); s[p + "R"] = eIn(e.r, OB.env); }
    env(I.fenv, "f"); env(I.aenv, "l");
    if (I.lfo) { s.lfoRate = eIn(I.lfo.hz, OB.lfo); s.lSine = I.lfo.shape === "sine" || I.lfo.shape === "tri"; s.lSq = I.lfo.shape === "sq"; s.lSH = I.lfo.shape === "sh"; }
    var lp = mk(I, "lfo>pitch") || mk(I, "sh>pitch"), lc = mk(I, "lfo>cut") || mk(I, "sh>cut"), lw = mk(I, "lfo>pw") || mk(I, "sh>pw");
    if (lp) { s.fmO1 = true; s.fmO2 = true; s.fmDepth = r1(clamp(Math.sqrt(lp.amt / 12) * 10, 0, 10)); }
    if (lc) { s.fmF = true; s.fmDepth = Math.max(s.fmDepth, r1(clamp(lc.amt / 4 * 10, 0, 10))); }
    if (lw) { s.pwO1 = true; s.pwO2 = true; s.pwDepth = r1(clamp(lw.amt / 0.4 * 10, 0, 10)); }
    if (mk(I, "env>pitch")) s.fEnvO2 = true;
    s.uni = I.voices === 1 && I.unison > 1; s.porta = I.glide > 0 ? r1(clamp(expInv(I.glide, 0.005, 5), 0, 10)) : 0; s.vol = r1(c.vol * 10);
  };
  PROFILES.ms20.apply = function (c, s, I) {
    s.l1 = 0; s.l2 = 0;
    I.osc.forEach(function (o, i) {
      if (i === 0) { s.w1 = hasW(o, "pulse") ? "pulse" : hasW(o, "tri") || hasW(o, "sine") ? "tri" : "saw"; s.s1 = semisToFeet(o.semis, ["32'", "16'", "8'", "4'"], MS_FEET); s.l1 = r1(o.lvl * 10); if (s.w1 === "pulse") s.pw1 = r1(clamp((0.5 - o.pw) / 0.49 * 10, 0, 10)); }
      else { s.w2 = hasW(o, "pulse") ? (o.pw < 0.25 ? "pulse" : "square") : "saw"; var oc = clamp(Math.round(o.semis / 12), -1, 2); s.s2 = ["16'", "8'", "4'", "2'"][oc + 1]; s.pitch2 = r1(clamp(o.semis - oc * 12, -12, 12)); s.l2 = r1(o.lvl * 10); }
    });
    if (I.noise && !I.osc.length) { s.w1 = "noise"; s.l1 = r1(I.noise.lvl * 10); }
    if (I.ring) { s.w2 = "ring"; s.l2 = r1(I.ring * 10); }
    if (I.hpf && I.hpf.cut > 0) { s.hCut = r1(clamp(expInv(I.hpf.cut, MS.hcut[0], MS.hcut[1]), 0, 10)); s.hPeak = r1((I.hpf.res || 0) * 10); }
    var f = I.filter; s.lCut = r1(clamp(expInv(f.cut, MS.lcut[0], MS.lcut[1]), 0, 10)); s.lPeak = r1(f.res * 10); s.lEg2 = r1(clamp(Math.abs(f.env) / 6 * 10, 0, 10));
    var e = I.aenv; s.e2A = eIn(e.a, MS.env); s.e2D = eIn(e.d, MS.env); s.e2S = r1(e.s * 10); s.e2R = eIn(e.r, MS.env); s.e2H = c.hold ? r1(clamp(c.hold / 3 * 10, 0, 10)) : 0;
    if (I.env3) { s.e1D = r1(clamp(I.env3.delay / 2 * 10, 0, 10)); s.e1A = eIn(I.env3.a, MS.env); s.e1R = eIn(I.env3.r, MS.env); }
    if (I.lfo) { s.mgFreq = eIn(I.lfo.hz, MS.mg); s.mgWave = I.lfo.shape === "saw" ? 10 : 5; }
    var lp = mk(I, "lfo>pitch"), lc = mk(I, "lfo>cut"), lh = mk(I, "lfo>hcut"), ep = mk(I, "env>pitch"), eh = mk(I, "env>hcut"), cords = [];
    if (lp) s.fmMg = r1(clamp(lp.amt / 12 * 10, 0, 10)); if (lc) s.lMg = r1(clamp(lc.amt / 4 * 10, 0, 10)); if (lh) s.hMg = r1(clamp(lh.amt / 4 * 10, 0, 10));
    if (ep) { s.fmEg1 = r1(clamp(ep.amt / 24 * 10, 0, 10)); if (!I.env3) { s.e1A = eIn(I.fenv.a, MS.env); s.e1R = eIn(I.fenv.r, MS.env); } }
    if (eh) s.hEg2 = r1(clamp(eh.amt / 6 * 10, 0, 10));
    var sp = mk(I, "sh>pitch"), sc2 = mk(I, "sh>cut"); if (sp) cords.push({ src: "sh", dst: "freq", amt: r1(clamp(sp.amt / 24, -1, 1) * 100) / 100 }); if (sc2) cords.push({ src: "sh", dst: "lcut", amt: r1(clamp(sc2.amt / 5, -1, 1) * 100) / 100 });
    s.cords = cords; s.porta = I.glide > 0 && !c.glideLegato ? r1(clamp(expInv(I.glide, 0.005, 5), 0, 10)) : 0; s.vol = r1(c.vol * 10);
  };
  PROFILES.dx7.apply = function (c, s, I) {
    s.alg = 5; s.fb = 0;   // three stacks of two (DX 24): carriers 1, 3, 5; modulators 2, 4, 6
    var f = I.filter || { cut: 2000, env: 0 };
    for (var i = 1; i <= 6; i++) s["o" + i + "l"] = 0;
    I.osc.slice(0, 3).forEach(function (o, k) {
      var ca = "o" + (2 * k + 1), mo = "o" + (2 * k + 2), r = Math.pow(2, o.semis / 12), co = r < 0.75 ? 0 : Math.floor(r);
      s[ca + "c"] = clamp(co, 0, 31); s[ca + "f"] = clamp(Math.round((r / (co || 0.5) - 1) * 100), 0, 99); s[ca + "l"] = dxL(o.lvl * 0.9);
      var w = o.waves[0], bright = Math.log(Math.max(f.cut, 20) / 262) / Math.LN2 + Math.abs(f.env) * 0.5;
      s[mo + "c"] = w === "pulse" ? 2 : 1; s[mo + "f"] = 0; s[mo + "l"] = w === "tri" || w === "sine" ? 0 : Math.round(clamp(66 + bright * 6, 0, 99));
      var A = I.aenv, F = I.fenv;
      [[ca, A, 1], [mo, F, f.env > 0 ? 1 : 0]].forEach(function (x) {
        var p = x[0], e = x[1];
        s[p + "r1"] = dxR(e.a); s[p + "r2"] = dxR(e.d); s[p + "r3"] = 99; s[p + "r4"] = dxR(e.r);
        s[p + "l1"] = 99; s[p + "l2"] = x[2] ? dxL(e.s) : 99; s[p + "l3"] = x[2] ? dxL(e.s) : 99; s[p + "l4"] = 0;
      });
    });
    if (I.noise) { s.fb = 7; s.o6l = Math.max(s.o6l, 70); }
    if (I.lfo) { s.lfoSpeed = Math.round(clamp(expInv(I.lfo.hz, 0.06, 50) * 9.9, 0, 99)); s.lfoWave = { tri: "tri", sine: "sine", sq: "square", saw: "sawup", sh: "sh" }[I.lfo.shape] || "tri"; }
    var lp = mk(I, "lfo>pitch"); if (lp) s.pmd = Math.round(clamp(lp.amt / 2 * 99, 0, 99));
    s.vol = r1(c.vol * 10);
  };
  PROFILES.ppg.apply = function (c, s, I) {
    function place(o) {   // the nearest wave in this page's tables: [table, position]
      if (o.wt) return [PPG_TABLES[o.wt.t] || "sweep", Math.round(o.wt.pos)];
      if (hasW(o, "pulse")) return ["pulse", Math.round(clamp((0.5 - o.pw) / 0.45 * 63, 0, 63))];
      if (hasW(o, "tri") || hasW(o, "sine")) return ["sweep", 0];
      return ["sweep", 63];
    }
    var a = I.osc[0], b = I.osc[1];
    if (a) { var pa = place(a); s.table = pa[0]; s.waveA = pa[1]; }
    if (b) { var pb = place(b); s.waveB = pb[0] === s.table ? pb[1] : s.waveA; s.semiB = clamp(Math.round(b.semis - (a ? a.semis : 0)), -24, 24); s.detB = Math.round(clamp((b.semis - (a ? a.semis : 0) - s.semiB) / 0.5 * 63, 0, 63)); s.mixB = Math.round(b.lvl * 63); }
    var f = I.filter; s.cutoff = Math.round(clamp(expInv(f.cut, PP.cut[0], PP.cut[1]) * 6.3, 0, 63)); s.emph = Math.round(f.res * 63); s.envF = Math.round(clamp(Math.abs(f.env) / 6 * 63, 0, 63)); s.kbdF = Math.round(clamp(f.kbd * 63, 0, 63));
    function e(x, p) { s[p + "A"] = Math.round(eIn(x.a, PP.env) * 6.3); s[p + "D"] = Math.round(eIn(x.d, PP.env) * 6.3); s[p + "S"] = Math.round(x.s * 63); s[p + "R"] = Math.round(eIn(x.r, PP.env) * 6.3); }
    e(I.fenv, "e1"); e(I.aenv, "e2");
    if (I.lfo) { s.lfoRate = Math.round(eIn(I.lfo.hz, PP.lfo) * 6.3); s.lfoShape = { tri: "tri", sine: "tri", saw: "saw", sq: "square", sh: "random" }[I.lfo.shape] || "tri"; s.lfoDelay = Math.round(clamp((I.lfo.delay || 0) / 3 * 63, 0, 63)); }
    var lp = mk(I, "lfo>pitch"), lw = mk(I, "lfo>wt"), ew = mk(I, "env>wt");
    if (lp) s.lfoPitch = Math.round(clamp(Math.sqrt(lp.amt / 3) * 63, 0, 63)); if (lw) s.lfoWave = Math.round(clamp(lw.amt * 2, 0, 63)); if (ew) s.envWave = Math.round(clamp(ew.amt, 0, 63));
    s.vol = Math.round(c.vol * 63);
  };

  SC.translate = function (state, from, to) {
    if (from === to) return { state: full(from, state), notes: [] };
    if (from === "moog" && to === "prophet") return moog2prophet(state);
    if (from === "prophet" && to === "moog") return prophet2moog(state);
    return translateCanon(SC.toCanon(from, state), to);
  };
  SC.PROFILES = PROFILES; SC.full = full;
  // ---------- worked examples (settings from the manuals where cited; the rest this page's) ----------
  var BASS = [[36, 0, .5], [36, .75, .25], [48, 1, .5], [36, 1.5, .5], [39, 2, .5], [41, 2.5, .5], [43, 3, .75]];
  var LEAD = [[60, 0, .5], [63, .5, .5], [65, 1, .5], [67, 1.5, 1], [70, 2.5, .5], [67, 3, 1]];
  var CHORDS = [[48, 0, 1.8], [55, 0, 1.8], [60, 0, 1.8], [64, 0, 1.8], [53, 2, 1.8], [57, 2, 1.8], [60, 2, 1.8], [65, 2, 1.8]];
  SC.EXAMPLES = [
    { id: "fat-bass", from: "moog", name: "Fat bass (two sawtooths, detuned)", phrase: BASS, bpm: 110, wheel: 0,
      say: "Translates almost one to one: both synths are two oscillators into a 24 dB low-pass with an envelope. Listen for the filter.",
      s: { o1Range: "16'", o1Wave: "saw", o2Range: "16'", o2Freq: 0.12, o2Wave: "saw", m1: 9, m2On: true, m2: 8, cutoff: 3.2, emph: 3, amount: 6, fA: 0, fD: 4.2, fS: 2, lA: 0, lD: 4, lS: 8 } },
    { id: "fifths-lead", from: "moog", name: "Lead in fifths and fourths (all three oscillators)", src: "Model D manual p. 42", phrase: LEAD, bpm: 96, wheel: 0,
      say: "The Model D manual's \"creative switching\": oscillator 2 a fifth up, oscillator 3 a fourth down. The Prophet has two oscillators a voice, so the third pitch is lost.",
      s: { o1Wave: "saw", o2Freq: 7, o2Wave: "saw", o3Freq: -5, o3Wave: "saw", m1: 8, m2On: true, m2: 6, m3On: true, m3: 6, cutoff: 5.5, emph: 2, amount: 4, fD: 5, fS: 5 } },
    { id: "feedback", from: "moog", name: "Overdriven bass (output fed back into the mixer)", src: "Model D manual pp. 27, 33", phrase: BASS, bpm: 110, wheel: 0,
      say: "No cable in EXT. INPUT: the Model D hears its own output and overloads. Main volume at 6, as the manual advises. Nothing on the Prophet does this.",
      s: { o1Range: "16'", o1Wave: "saw", o2Range: "16'", o2Freq: -0.08, o2Wave: "square", m1: 9, m2On: true, m2: 7, extOn: true, ext: 8, vol: 6, cutoff: 3.5, emph: 4, amount: 5, fD: 4, fS: 3, lD: 4, lS: 8 } },
    { id: "osc3-fm", from: "moog", name: "Oscillator 3 frequency-modulating oscillator 1", src: "Model D manual p. 41", phrase: LEAD, bpm: 80, wheel: 0.6,
      say: "The manual's FM recipe: oscillator 3 off the keyboard, on the mod wheel, into the oscillators; only oscillator 1 sounds. The Prophet does FM with Poly Mod from oscillator B, but on a knob, not the wheel.",
      s: { o1Range: "8'", o1Wave: "tri", o3Range: "8'", o3Freq: 3.2, o3Wave: "tri", o3Kbd: false, src1: "osc3", modMix: 0, oscMod: true, m1: 8, cutoff: 7, amount: 2, fD: 5, fS: 8 } },
    { id: "lfo-wah", from: "moog", name: "LFO square on the filter (pulsed)", src: "Model D manual pp. 39-40", phrase: LEAD, bpm: 90, wheel: 0.8,
      say: "From the manual's external-audio recipe, played on oscillator 1 here: LFO square through the mod wheel into the filter. Both synths can.",
      s: { o1Wave: "saw", m1: 8, src2: "lfo", modMix: 10, filtMod: true, lfoRate: 5.5, lfoSq: true, cutoff: 4, emph: 5, amount: 2, fS: 6 } },
    { id: "p5-bass", from: "prophet", name: "Synth bass (the guide's short version)", src: "Prophet-5 User's Guide p. 46", phrase: BASS, bpm: 110, wheel: 0,
      say: "Cutoff 3, resonance 3, filter decay 6, sustain 2, env amount 10. Env amount 10 is more than the Model D's 4 octaves on this page's scale.",
      s: { uni: true, cutoff: 3, res: 3, fD: 6, fS: 2, envAmt: 10, aD: 5, aS: 8 } },
    { id: "p5-brass", from: "prophet", name: "Synth brass with a pitch blip, as chords", src: "Prophet-5 User's Guide p. 50", phrase: CHORDS, bpm: 80, wheel: 0.08,
      say: "Two sawtooths, B fine 2, cutoff 1, resonance 3, amount 8, keyboard full, filter envelope 4-6-4-0, velocity on, Poly Mod filter env → freq A just above 0. The Model D loses the chord and moves all its oscillators for the blip.",
      s: { bSaw: true, mB: 9, bFine: 2, cutoff: 1, res: 3, envAmt: 8, kbd: "full", fA: 4, fD: 6, fS: 4, fR: 0, velF: true, pmFA: true, pmFenv: 0.6, aA: 1, aS: 9, aR: 3 } },
    { id: "p5-strings", from: "prophet", name: "String pad", src: "Prophet-5 User's Guide p. 51", phrase: CHORDS, bpm: 70, wheel: 0,
      say: "The brass turned into strings: keyboard half, cutoff 7, resonance 2, amount 0, envelopes slow. A Model D can play its tone but not its chords.",
      s: { bSaw: true, mB: 9, bFine: 2, kbd: "half", cutoff: 7, res: 2, envAmt: 0, fA: 5, fD: 6, fS: 7, fR: 7, aA: 5, aD: 5, aS: 10, aR: 6 } },
    { id: "p5-sync", from: "prophet", name: "Hard-sync lead", src: "Prophet-5 User's Guide pp. 51-52", phrase: LEAD, bpm: 100, wheel: 0,
      say: "Sync on, Poly Mod filter env 7 → freq A, cutoff 8, resonance 2, amount 3, filter envelope 4-7-4-5. The guide sets A's frequency to \"4\"; where that falls in semitones is not printed, so A is set 16 above B here. The Model D has no sync.",
      s: { uni: true, aSync: true, aFreq: 40, pmFA: true, pmFenv: 7, cutoff: 8, res: 2, envAmt: 3, fA: 4, fD: 7, fS: 4, fR: 5, aS: 10, aR: 4 } },
    { id: "p5-pwm", from: "prophet", name: "Pulse-width-modulated strings", src: "Prophet-5 User's Guide pp. 18, 32", phrase: CHORDS, bpm: 70, wheel: 0,
      say: "Both oscillators on pulse, the LFO's triangle into PW A and PW B by its initial amount. The Model D's pulse widths are fixed, so the movement is lost.",
      s: { aSaw: false, aPulse: true, aPw: 4, bPulse: true, bPw: 6, mB: 9, bFine: 1.5, lfoTri: true, lfoFreq: 3.2, lfoInit: 4, wmPA: true, wmPB: true, cutoff: 6.5, res: 1, envAmt: 1, fS: 8, aA: 4, aD: 5, aS: 10, aR: 6 } },
    { id: "p5-unison", from: "prophet", name: "Unison bass: five voices stacked", src: "Prophet-5 User's Guide p. 49", phrase: BASS, bpm: 110, wheel: 0,
      say: "The synth bass made fatter: A saw and square, B saw detuned, Unison with five voices and detune 4. Ten oscillators become the Model D's three.",
      s: { aPulse: true, bSaw: true, mB: 9, bFine: 1.5, uni: true, uniN: 5, uniDet: 4, cutoff: 3, res: 3, fD: 6, fS: 2, envAmt: 9, aD: 5, aS: 8 } }
  ];

  // ---------- worked examples for the seven new synths (cited where a manual gives the recipe; settings otherwise this page's) ----------
  // A phrase step is [note, beat, beats, flags]: "a" = accent (played at full velocity), "s" = slide into the next step (held over it).
  var ACID = [[36, 0, .5, "a"], [36, .5, .5], [48, 1, .5, "s"], [46, 1.5, .5], [36, 2, .5, "a"], [39, 2.5, .5, "s"], [41, 3, .5], [43, 3.5, .5, "a"]];
  var PAD = [[48, 0, 3.6], [55, 0, 3.6], [60, 0, 3.6], [64, 0, 3.6], [67, 0, 3.6]];
  var BELLS = [[72, 0, 1.5], [79, 1, 1.5], [76, 2, 1.5], [84, 3, 2]];
  var EP = [[52, 0, 1.6], [59, 0, 1.6], [64, 0, 1.6], [67, 0, 1.6], [50, 2, 1.6], [57, 2, 1.6], [62, 2, 1.6], [65, 2, 1.6]];
  SC.EXAMPLES = SC.EXAMPLES.concat([
    { id: "303-acid", from: "tb303", name: "Acid line: accents and slides", src: "TB-303 Owner's Manual pp. 34, 40", phrase: ACID, bpm: 124, wheel: 0,
      say: "Saw wave, resonance high, env mod and accent up, a short decay. Accent and slide are stored with each step (p. 89) and played here from the phrase. Few synths have either.",
      s: { wave: "saw", cutoff: 3, res: 8, envMod: 7, decay: 3, accent: 8 } },
    { id: "303-square", from: "tb303", name: "Square-wave bass, softer", src: "TB-303 Owner's Manual p. 34", phrase: BASS, bpm: 110, wheel: 0,
      say: "The WAVEFORM switch on square: the tone changes even with every other knob where it was (p. 34). Settings this page's.",
      s: { wave: "square", cutoff: 4.5, res: 3, envMod: 4, decay: 5, accent: 3 } },
    { id: "juno-strings", from: "juno", name: "PWM strings with chorus II", src: "Juno-60 Owner's Manual pp. 13, 22", phrase: CHORDS, bpm: 70, wheel: 0,
      say: "Pulse wave, its width swept by the LFO (PWM by LFO, p. 13), slow envelope, chorus II, the stronger one (p. 22). The chorus is part of the instrument: most others here have none.",
      s: { pulse: true, saw: false, pwmMode: "lfo", pwm: 6, lfoRate: 3.5, cutoff: 6.5, res: 1, env: 1, a: 5, d: 6, s: 8, r: 6, chorus: "II" } },
    { id: "juno-bass", from: "juno", name: "Saw + sub bass", src: "Juno-60 Owner's Manual p. 13", phrase: BASS, bpm: 110, wheel: 0,
      say: "Sawtooth with the sub-oscillator (a square an octave below, p. 13), filter closed and opened by the envelope.",
      s: { range: "16'", saw: true, sub: true, subLvl: 8, cutoff: 3, res: 3, env: 6, kybd: 6, a: 0, d: 4, s: 3, r: 2, chorus: "off" } },
    { id: "arp-ring", from: "arp2600", name: "Ring-modulator bells", src: "ARP 2600 M Owner's Manual pp. 6, 10", phrase: BELLS, bpm: 80, wheel: 0,
      say: "The ring modulator's normalled inputs are VCO-1's saw and VCO-2's sine (p. 6); its output is normalled into the VCF (p. 10). VCO-2 tuned off a whole number of semitones gives the clang.",
      s: { inV3: 0, inRing: 9, f2: 7, fine2: 0.4, cut: 8, res: 2, fAdsr: 2, aA: 0, aD: 5, aS: 0, aR: 5, arA: 0, arR: 6, vAr: 0, vAdsr: 10 } },
    { id: "arp-sh", from: "arp2600", name: "Sample-and-hold bleeps", src: "ARP 2600 M Owner's Manual pp. 7, 15", phrase: [[60, 0, 4]], bpm: 60, wheel: 0,
      say: "S/H OUT is normalled to every VCO's CV input 2 (p. 7) and samples the noise generator on its own clock (p. 15): one held key plays random notes.",
      s: { inV3: 8, v3noise: 0, v1sh: 0, v2sh: 0, cords: [{ src: "sh", dst: "vco3", amt: 0.5 }], shRate: 6, cut: 6, res: 6, fAdsr: 0, gain: 0, vAr: 10, arA: 0, arR: 3 } },
    { id: "ob-sync", from: "obxa", name: "Sync lead with the filter envelope on oscillator 2", src: "OB-Xa Operation Manual p. 10", phrase: LEAD, bpm: 100, wheel: 0,
      say: "Sync on: oscillator 2 locks to oscillator 1, so changing its pitch changes the tone (p. 10). F-ENV sweeps oscillator 2 up to an octave at full MODULATION (p. 10).",
      s: { sync: true, fEnvO2: true, o2Freq: 7, fO1: false, fO2: "full", cutoff: 7, res: 2, fMod: 8, fA: 0, fD: 5, fS: 2, fR: 3, uni: true } },
    { id: "ob-2pole", from: "obxa", name: "2-pole brass pad", src: "OB-Xa Operation Manual p. 11", phrase: CHORDS, bpm: 80, wheel: 0,
      say: "4-POLE off: the 12 dB-per-octave filter, \"brighter\" (p. 11). Translate it to a 24 dB synth and the filter plot shows the difference.",
      s: { pole4: false, o2Det: 0.2, cutoff: 4.5, res: 2, fMod: 6, fA: 3, fD: 5, fS: 5, fR: 4, lA: 2, lD: 5, lS: 9, lR: 4 } },
    { id: "ob-sem-bp", from: "obxa", name: "SEM band-pass (not an OB-Xa setting)", src: "Wikipedia, Oberheim Polyphonic Synthesizer", phrase: LEAD, bpm: 90, wheel: 0,
      say: "The SEM's filter could be low-, band-, high-pass or notch (Wikipedia; unverified). Band-pass is lost on every low-pass-only synth here.",
      s: { sem: "bp", cutoff: 5.5, res: 6, fMod: 3, lS: 10 } },
    { id: "ms20-hot", from: "ms20", name: "Screaming HP + LP", src: "MS-20 Owner's Manual p. 5", phrase: LEAD, bpm: 100, wheel: 0,
      say: "The high-pass and low-pass filters in series, both peaks high (\"near its highest position, the filter itself begins to oscillate\", p. 5).",
      s: { w1: "saw", hCut: 4, hPeak: 7, lCut: 5, lPeak: 8, lEg2: 4, e2A: 0, e2D: 5, e2S: 6, e2R: 3 } },
    { id: "ms20-ring", from: "ms20", name: "Ring modulator with an EG 1 pitch sweep", src: "MS-20 Owner's Manual pp. 5-6", phrase: BELLS, bpm: 80, wheel: 0,
      say: "VCO-2 on RING: sums and differences of the two VCOs, \"clangorous, metallic\" (p. 5); EG 1 bends the pitch after its delay (p. 6).",
      s: { w1: "saw", l1: 0, w2: "ring", l2: 8, s2: "4'", pitch2: 3.5, fmEg1: 3, e1D: 2, e1A: 3, e1R: 4, lCut: 7, lPeak: 3, e2D: 6, e2S: 3 } },
    { id: "dx7-saw", from: "dx7", name: "FM sawtooth: operator 2 modulating operator 1", src: "DX7 Operation Manual pp. 34-35", phrase: LEAD, bpm: 96, wheel: 0,
      say: "The manual's first exercise: algorithm 1, operator 2 at ratio 1.00 and level 99 on operator 1, you may see \"a parallel between this sound and that of a saw-tooth wave which is going through a filter that has a lot of resonance\" (p. 35). On a subtractive synth it is simply a sawtooth.",
      s: { alg: 1, o2l: 99 } },
    { id: "dx7-bell", from: "dx7", name: "Bell: modulator at 3.5 times the carrier", src: "DX7 Operation Manual pp. 24, 35", phrase: BELLS, bpm: 80, wheel: 0,
      say: "Algorithm 5's three stacks (p. 24); a modulator ratio that is not a whole number gives inharmonic partials. Settings this page's. Nothing else here can make it.",
      s: { alg: 5, o1l: 99, o2c: 3, o2f: 50, o2l: 80, o1r2: 30, o1r3: 25, o1l2: 70, o1l3: 0, o2r2: 35, o2r3: 30, o2l2: 60, o2l3: 0, o3l: 80, o3c: 2, o4c: 7, o4l: 55, o3r2: 28, o3l3: 0, o3r3: 25, o4r2: 40, o4l3: 0 } },
    { id: "dx7-ep", from: "dx7", name: "Electric-piano-like tine (two stacks)", src: "DX7 Operation Manual pp. 24-26", phrase: EP, bpm: 72, wheel: 0,
      say: "A soft carrier and a short, bright high modulator for the tine's knock. This page's settings, not the factory voice.",
      s: { alg: 5, o1l: 95, o2c: 1, o2l: 60, o2r2: 45, o2l2: 40, o2l3: 30, o3l: 85, o3c: 1, o4c: 14, o4l: 62, o4r2: 70, o4l2: 0, o4l3: 0, o1r2: 30, o1l2: 80, o1l3: 70, o1r4: 45, o3r2: 45, o3l3: 0, o3r3: 40 } },
    { id: "ppg-sweep", from: "ppg", name: "Wavetable sweep by envelope", src: "Sound On Sound, PPG Wave 2.3 review", phrase: LEAD, bpm: 96, wheel: 0,
      say: "Envelope 1 moves the oscillators through the 64 waves of a table (SOS): the timbre changes along the note without a filter sweep. This page's tables, not the PPG's.",
      s: { table: "formant", waveA: 5, waveB: 5, envWave: 50, e1A: 10, e1D: 40, e1S: 10, cutoff: 55, envF: 0, mixB: 30, semiB: 12 } },
    { id: "ppg-pad", from: "ppg", name: "Glassy pad with the LFO on the wave", src: "Wikipedia, PPG Wave", phrase: PAD, bpm: 60, wheel: 0,
      say: "Two oscillators per voice and the LFO moving the wave position, into the 24 dB SSM 2044 filter (Wikipedia; PPG Wave 2.3 Service Manual p. 5).",
      s: { table: "organ", waveA: 30, waveB: 34, detB: 10, mixB: 50, lfoWave: 20, lfoRate: 15, cutoff: 40, emph: 10, e2A: 30, e2D: 40, e2S: 55, e2R: 40 } }
  ]);

  // ---------- the Prophet-6 and the Moogs (recipes from their manuals where cited; numbers this page's) ----------
  SC.EXAMPLES = SC.EXAMPLES.concat([
    { id: "p6-pad-fx", from: "p6", name: "PWM pad through chorus and hall", src: "Prophet-6 Operation Manual pp. 16, 26-28", phrase: CHORDS, bpm: 70, wheel: 0,
      say: "Pulse waves whose width the LFO sweeps (\"a great way to add movement and thickness ... especially when creating pad or string-like sounds\", p. 16), then Effect A chorus and Effect B hall in series (p. 27). Only the Prophet-6 has the effects built in: every other synth here loses them.",
      s: { o1Shape: 2, o1Pw: 4, o2Shape: 2, o2Pw: 6, m1: 7, m2: 7, o2Fine: 8, lfoFreq: 3, lfoInit: 4, lfoShape: "tri", lfPw: true, lCut: 6.5, lRes: 1, lEnv: 1, aA: 5, aD: 6, aS: 10, aR: 6, fxOn: true, fxA: "cho", aP1: 3, aP2: 5, aMix: 5, fxB: "hal", bP1: 7, bP2: 4, bMix: 4 } },
    { id: "p6-sync", from: "p6", name: "Sync sweep through Poly Mod", src: "Prophet-6 Operation Manual pp. 17, 33-34", phrase: LEAD, bpm: 100, wheel: 0,
      say: "\"Use Poly Mod to sweep the pitch of Oscillator 1 when it is synced to generate the classic, hard-edged sync sound\" (p. 17): sync on, Poly Mod filter env → freq 1.",
      s: { sync: true, o1Freq: 36, o1Shape: 1, m1: 9, pmFenv: 6, pmF1: true, lCut: 8, lRes: 2, lEnv: 2, fA: 0, fD: 6, fS: 2, fR: 4, uni: true, uniN: 1 } },
    { id: "p6-gated", from: "p6", name: "Gated organ (LFO square on the amp)", src: "Prophet-6 Operation Manual p. 26", phrase: CHORDS, bpm: 90, wheel: 0,
      say: "The manual's \"gated VCA\" tip: an organ-like sound, the VCA's env amount at zero, the LFO square to amp with the initial amount at 100% (p. 26).",
      s: { o1Shape: 0.4, o2Shape: 1, o2Freq: 36, m1: 8, m2: 5, mSub: 4, lCut: 7, lEnv: 0, aAmt: 0, aS: 10, lfoShape: "square", lfoFreq: 5.5, lfoInit: 10, lfAmp: true } },
    { id: "p6-unison", from: "p6", name: "Unison bass with distortion", src: "Prophet-6 Operation Manual pp. 41, 43", phrase: BASS, bpm: 110, wheel: 0,
      say: "\"If you want to create an ultra heavy synth bass, try using Unison!\" (p. 43), with the analog distortion (p. 41) a little up and some slop (p. 18).",
      s: { uni: true, uniN: 6, o1Freq: 12, o2Freq: 12, o2Fine: 10, m1: 8, m2: 8, mSub: 6, slop: 3, lCut: 3, lRes: 3, lEnv: 6, fD: 4, fS: 2, aD: 5, aS: 8, dist: 3 } },
    { id: "taurus-bass", from: "taurus", name: "Pedal bass on the VARIABLE preset", src: "Taurus 205A Owner's Manual PDF pp. 3-6", phrase: BASS, bpm: 100, wheel: 0,
      say: "Two sawtooth oscillators (PDF 6), BEAT detuning B (PDF 3), the filter contour opening and closing on each note, DECAY on (PDF 5). The three fixed presets' settings are not printed, so only VARIABLE is on this panel.",
      s: { range: "LO", beat: 0.25, mixB: 8, cutoff: 3, emph: 3, cAmt: 6, cA: 0.5, cD: 4, lA: 0, lS: 8, decaySw: true, lD: 5 } },
    { id: "voyager-hplp", from: "voyager", name: "HP/LP band-pass with spacing", src: "Voyager Old School User's Manual PDF p. 8", phrase: LEAD, bpm: 96, wheel: 0,
      say: "HP/LP mode puts a high-pass and a low-pass in series, a band-pass; SPACING sets how far apart they are (PDF 8). Synths with one low-pass lose the band.",
      s: { o1Wave: 1.4, o2Wave: 1, o2Freq: 0.08, m1: 8, m2: 7, mode: "hplp", cutoff: 6, space: 1.5, res: 4, fAmt: 2, fD: 5, fS: 4 } },
    { id: "voyager-fm", from: "voyager", name: "Three oscillators, osc 3 on linear FM", src: "Voyager Old School User's Manual PDF p. 8", phrase: LEAD, bpm: 80, wheel: 0,
      say: "The 3-1 FM switch lets oscillator 3 frequency-modulate oscillator 1 (PDF 8), like the Model D's osc 3 trick but without the mod wheel.",
      s: { o1Wave: 0, m1: 9, o3Freq: 7, o3Wave: 0, m3: 0, linFm: true, cutoff: 7, fAmt: 1, fS: 8 } },
    { id: "sub37-duo", from: "sub37", name: "Duo mode: two notes through one filter", src: "Subsequent 25 Owner's Manual PDF p. 9", phrase: [[48, 0, 1.8], [55, 0, 1.8], [50, 2, 1.8], [57, 2, 1.8]], bpm: 80, wheel: 0,
      say: "Duo mode lets each oscillator play one of two keys, both through the one ladder filter (Subsequent 25 manual PDF 9; the same mode on the Sub 37). Here each note gets its own copy of the filter: the shared filter is not modelled (unverified approximation).",
      s: { duo: true, o1Wave: 1, o2Wave: 1, m1: 8, m2: 8, cutoff: 5, res: 3, fAmt: 2, drive: 2, fD: 5, fS: 5 } },
    { id: "sub37-drive", from: "sub37", name: "MultiDrive bass with the sub oscillator", src: "Subsequent 25 Owner's Manual PDF pp. 15-16, 19", phrase: BASS, bpm: 110, wheel: 0,
      say: "The square sub oscillator an octave under osc 1 (PDF 15), the cutoff low and MultiDrive up (the manual's tutorial: cutoff to 320 Hz, MultiDrive to 9 o'clock, PDF 19).",
      s: { o1Oct: "16'", o1Wave: 1, m1: 8, mSub: 7, cutoff: 4.2, res: 2, drive: 4, fAmt: 2.5, fD: 4, fS: 2, aD: 4, aS: 8 } },
    { id: "gm-spring", from: "grandmother", name: "Pluck into the spring reverb", src: "Grandmother User's Manual PDF p. 21", phrase: BELLS, bpm: 80, wheel: 0,
      say: "A short envelope in ENV mode, and the spring reverb MIX up (PDF 21). Only the Grandmother and the Prophet-6 have a reverb inside.",
      s: { o1Wave: "saw", o2Wave: "tri", o2Oct: "8'", m1: 9, m2: 6, cutoff: 6, res: 3, envAmt: 3, a: 0, d: 4, s: 2, r: 4, rev: 6, vol: 8 } },
    { id: "gm-hp", from: "grandmother", name: "The high-pass utility patched before the filter", src: "Grandmother User's Manual PDF p. 15", phrase: LEAD, bpm: 96, wheel: 0,
      say: "The manual's tip: patch the MIXER OUTPUT into the High Pass Filter's INPUT and its OUTPUT into the filter (PDF 15). One cord: the switch on this panel.",
      s: { o1Wave: "saw", m1: 8, hpOn: true, hpCut: 6, cutoff: 6, res: 4, envAmt: 2, d: 4, s: 6 } },
    { id: "mm-brass", from: "memorymoog", name: "Three-oscillator poly brass with Voice Modulation", src: "Memorymoog Owner's Manual PDF pp. 15-17", phrase: CHORDS, bpm: 80, wheel: 0,
      say: "Three saws a voice (PDF 16), the filter contour also bending oscillator 2 through Voice Modulation (PDF 15), six voices. Synths with two oscillators lose the third.",
      s: { o1Saw: true, o2Saw: true, o2Freq: 0.1, o3Saw: true, o3Tri: false, o3Freq: -0.08, m1: 4, m2: 4, m3: 4, kb1: true, cutoff: 3.5, emph: 2, cAmt: 6, fA: 2, fD: 5, fS: 5, fR: 3, lA: 1, lS: 9, lR: 3, vmF: 1, vO2: true } }
  ]);

  // ---------- Vital and Surge XT: beginner patches (this page's settings; parameter names from Vital's source and the Surge XT manual) ----------
  var MELODY = [[60, 0, .5], [62, .5, .5], [64, 1, .5], [67, 1.5, .5], [64, 2, 1], [60, 3, 1]];
  SC.EXAMPLES = SC.EXAMPLES.concat([
    { id: "vital-first", from: "vital", name: "First sound: one saw, filter open", src: "Vital synth_parameters.cpp", phrase: MELODY, bpm: 100, wheel: 0,
      say: "Oscillator 1 on its last wave frame (a saw in this page's table), the filter high, the envelopes near Vital's own defaults. Every other synth can play this.",
      s: { o1On: true, o1Frame: 256, o1Lvl: 71, cut: 110, res: 10, e1A: 0.15, e1D: 1, e1S: 100, e1R: 0.55 } },
    { id: "vital-morph", from: "vital", name: "Shape it: envelope 2 sweeps the wave frame", src: "Vital synth_parameters.cpp", phrase: LEAD, bpm: 96, wheel: 0,
      say: "Envelope 2 moves the wave frame from sine towards saw on every note, so the tone brightens without the filter. Only the wavetable synths (Vital, PPG) can do this.",
      s: { o1On: true, o1Frame: 0, o1Lvl: 75, e2Frame: 256, e2A: 0.55, e2D: 0.9, e2S: 30, e2R: 0.5, cut: 120, res: 0, e1S: 90 } },
    { id: "vital-bass", from: "vital", name: "Bass: sine under a saw, 24 dB ladder", src: "Vital synth_parameters.cpp", phrase: BASS, bpm: 110, wheel: 0,
      say: "Oscillator 1 a saw, oscillator 2 a sine an octave down for weight, a 24 dB Ladder filter closed and opened by envelope 2, one voice with a little portamento.",
      s: { o1On: true, o1Frame: 256, o1Tr: -12, o1Lvl: 75, o2On: true, o2Frame: 0, o2Tr: -24, o2Lvl: 70, fModel: "Ladder", fStyle: "24dB", cut: 52, res: 35, e2Cut: 30, e2A: 0, e2D: 0.6, e2S: 10, e2R: 0.3,
        e1A: 0, e1D: 0.8, e1S: 80, e1R: 0.3, poly: 1, glide: -5, drive: 4 } },
    { id: "vital-pad", from: "vital", name: "Pad: two detuned waves, slow envelope, LFO on the frame", src: "Vital synth_parameters.cpp", phrase: PAD, bpm: 60, wheel: 0,
      say: "Two oscillators a few cents apart, between triangle and square, the LFO slowly moving the wave frame, a slow attack and release, chorus and reverb.",
      s: { o1On: true, o1Frame: 110, o1Tune: -8, o1Lvl: 65, o2On: true, o2Frame: 140, o2Tune: 8, o2Lvl: 65, cut: 92, res: 15, e1A: 1.05, e1D: 1.2, e1S: 85, e1R: 1.2,
        lfoShape: "sine", lfoRate: -2, lfoFrame: 60, fxCho: 40, fxRev: 35, poly: 8 } },
    { id: "vital-lead", from: "vital", name: "Lead: unison saws, vibrato, delay", src: "Vital synth_parameters.cpp", phrase: LEAD, bpm: 100, wheel: 0,
      say: "Unison stacks voices on each note (here they stack on one note: this page's engine); the LFO adds vibrato, portamento slides between notes, the delay repeats them.",
      s: { o1On: true, o1Frame: 256, o1Lvl: 72, o2On: true, o2Frame: 200, o2Tr: 12, o2Lvl: 45, uni: 4, glide: -4, cut: 98, res: 25, e2Cut: 12, e2D: 0.8, e2S: 40,
        lfoShape: "sine", lfoRate: 2.4, lfoPitch: 0.3, fxDly: 30 } },
    { id: "surge-first", from: "surge", name: "First sound: one Classic saw", src: "Surge XT User Manual, Classic oscillator", phrase: MELODY, bpm: 100, wheel: 0,
      say: "The Classic oscillator at Shape 0 % (a saw, SX), Osc 1 full in the mixer, the Vintage Ladder open. Every other synth can play this.",
      s: { o1Shape: 0, m1: 100, cut: 36, res: 10, fType: "Vintage Ladder", aA: -8, aD: -1, aS: 100, aR: -3 } },
    { id: "surge-pwm", from: "surge", name: "Shape it: a pulse whose width the LFO moves", src: "Surge XT User Manual, Classic oscillator", phrase: CHORDS, bpm: 80, wheel: 0,
      say: "Shape at -100 % makes the Classic oscillator a pulse and Width 1 sets its duty cycle (SX); LFO 1 sweeps the width for a moving, chorus-like tone.",
      s: { o1Shape: -100, o1W: 35, m1: 90, lfoShape: "tri", lfoRate: -0.5, lfoW: 25, cut: 30, res: 10, aA: -4, aR: -1.5 } },
    { id: "surge-bass", from: "surge", name: "Bass: pulse with the sub, ladder and Filter EG", src: "Surge XT User Manual, Classic oscillator and Filter EG", phrase: BASS, bpm: 110, wheel: 0,
      say: "Sub Mix brings in the sub-oscillator (SX; one octave down here, unverified), the Vintage Ladder opens with the Filter EG on each note, Mono play mode.",
      s: { o1Shape: -60, o1W: 45, o1Sub: 40, o1Oct: -1, m1: 95, fType: "Vintage Ladder", cut: -12, res: 35, feg: 36, fA: -10, fD: -2.2, fS: 15, fR: -3, aA: -10, aD: -1, aS: 85, aR: -4, play: "Mono", glide: -6 } },
    { id: "surge-pad", from: "surge", name: "Pad: two saws, LP 12 dB, slow Amp EG", src: "Surge XT User Manual, Mixer and Envelope Generators", phrase: PAD, bpm: 60, wheel: 0,
      say: "Two Classic saws a few cents apart through a gentle 12 dB low-pass, a slow attack and release, chorus and reverb.",
      s: { o1Shape: 0, m1: 75, o2Shape: 0, o2Pitch: 0.08, m2: 75, fType: "LP 12 dB", cut: 18, res: 15, aA: 0, aD: 0.5, aS: 85, aR: 0.8, fxCho: 45, fxRev: 40 } },
    { id: "surge-lead", from: "surge", name: "Lead: a fifth on Osc 2, vibrato, delay", src: "Surge XT User Manual, Classic oscillator and Portamento", phrase: LEAD, bpm: 100, wheel: 0,
      say: "Osc 2 seven semitones up (Pitch, SX), Mono with portamento, the LFO on pitch for vibrato and the delay effect.",
      s: { o1Shape: 0, m1: 85, o2Shape: -100, o2W: 30, o2Pitch: 7, m2: 50, fType: "LP 24 dB", cut: 26, res: 30, feg: 12, fD: -1, fS: 40, play: "Mono", glide: -4.5,
        lfoShape: "sine", lfoRate: 2.4, lfoPitch: 0.3, fxDly: 30 } }
  ]);

  // ---------- the engine (AudioWorklet), as source text ----------
  function workletSource() {
    /* global sampleRate, registerProcessor, AudioWorkletProcessor, currentTime, ALG */
    var NV = 16, TS = 256;
    function ft(x) { if (x > 3) return 1; if (x < -3) return -1; var x2 = x * x; return x * (27 + x2) / (27 + 9 * x2); }
    function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
    var SIN = new Float32Array(4097); for (var si = 0; si <= 4096; si++) SIN[si] = Math.sin(2 * Math.PI * si / 4096);
    function sinT(ph) { ph -= Math.floor(ph); var x = ph * 4096, i = x | 0, f = x - i; return SIN[i] + (SIN[i + 1] - SIN[i]) * f; }
    // wavetables: this page's own four tables of 64 waves (not the PPG's) and a fifth of basic shapes for Vital, additive, 40 harmonics at most
    var WT = null;
    function makeTables() {
      var T = [], t, w, h, i;
      for (t = 0; t < 5; t++) {
        var tab = [];
        for (w = 0; w < 64; w++) {
          var a = new Float32Array(TS + 1), x = w / 63;
          for (h = 1; h <= 40; h++) {
            var amp = 0;
            if (t === 0) amp = h <= 1 + x * 39 ? 1 / h : 0;
            else if (t === 1) { var d = 0.5 - 0.45 * x; amp = 2 * Math.sin(Math.PI * h * d) / (Math.PI * h); }
            else if (t === 2) { var c = 2 + x * 26; amp = Math.exp(-Math.pow((h - c) / 2.5, 2)) + (h === 1 ? 0.5 : 0); }
            else if (t === 3) amp = h <= 12 ? (h % 2 ? 1 / h : x / h) : 0;
            else {   // Vital-style basic shapes (this page's): sine -> triangle -> square -> saw across the 64 waves
              var seg = Math.min(2, Math.floor(x * 3)), u = x * 3 - seg, sh4 = [h === 1 ? 1 : 0, h % 2 ? (((h - 1) / 2) % 2 ? -1 : 1) * 8 / (Math.PI * Math.PI * h * h) : 0, h % 2 ? 4 / (Math.PI * h) : 0, 2 / (Math.PI * h)];
              amp = sh4[seg] + (sh4[seg + 1] - sh4[seg]) * u;
            }
            if (amp) for (i = 0; i <= TS; i++) a[i] += amp * SIN[(h * i * 16) & 4095];
          }
          var mx = 0; for (i = 0; i <= TS; i++) mx = Math.max(mx, Math.abs(a[i])); if (mx) for (i = 0; i <= TS; i++) a[i] /= mx;
          tab.push(a);
        }
        T.push(tab);
      }
      return T;
    }
    function wtVal(t, pos, ph) {
      if (!WT) WT = makeTables();
      var tab = WT[t] || WT[0]; pos = pos < 0 ? 0 : pos > 63 ? 63 : pos;
      var i = pos | 0, f = pos - i, j = i < 63 ? i + 1 : 63, x = ph * TS, k = x | 0, g = x - k, a = tab[i], b = tab[j];
      var va = a[k] + (a[k + 1] - a[k]) * g, vb = b[k] + (b[k + 1] - b[k]) * g; return va + (vb - va) * f;
    }
    function Voice() {
      this.note = -1; this.gate = 0; this.vel = 1; this.p = 60; this.tp = 60; this.ph = [0, 0, 0]; this.out = [0, 0, 0]; this.y = [0, 0, 0, 0];
      this.fe = 0; this.fs = 4; this.ae = 0; this.as = 4; this.e3 = 0; this.s3 = 4; this.d3 = 0; this.holdT = 0; this.last = 0; this.dr = [0, 0, 0]; this.drT = [0, 0, 0]; this.det = 0; this.age = 0;
      this.t = 0; this.slide = false; this.s1 = 0; this.s2 = 0; this.h1 = 0; this.h2 = 0; this.hp = 0; this.bst = 0; this.w = [false, false, false]; this.inc = [0, 0, 0];
      this.d1 = 0; this.d2 = 0; this.fy = [0, 0, 0, 0]; this.oph = [0, 0, 0, 0, 0, 0]; this.oe = [0, 0, 0, 0, 0, 0]; this.ost = [4, 4, 4, 4, 4, 4]; this.fb = [0, 0];
    }
    // a real class: the browser's AudioWorkletProcessor cannot be called as a function
    var Proc = class extends AudioWorkletProcessor { constructor() { super(); init.call(this); } };
    function init() {
      var self = this; this.E = null; this.V = []; for (var i = 0; i < NV; i++) this.V.push(new Voice());
      this.held = []; this.wheel = 0; this.bendV = 0; this.bendS = 0; this.bendSm = 0; this.lfoPh = 0; this.pk = [0, 0, 0, 0, 0, 0, 0]; this.rk = 0; this.rn = 0; this.seed = 22222; this.clock = 0;
      this.shV = 0; this.shPh = 0; this.shL = 0; this.lastLfoPh = 0; this.q = [];
      this.dl = new Float32Array(4096); this.dw = 0; this.cph = 0; this.fxS = [];
      this.port.onmessage = function (e) { self.msg(e.data); };
    }
    Proc.prototype.rand = function () { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x3fffffff - 1; };
    Proc.prototype.msg = function (d) {
      if (d.at != null && typeof currentTime !== "undefined" && d.at > currentTime) { this.q.push(d); return; }   // scheduled (SynthCompare.voice)
      var E = this.E, i;
      if (d.type === "patch") { this.E = d.E; return; }
      if (d.type === "wheel") { this.wheel = d.v; return; }
      if (d.type === "bend") { this.bendV = d.v; return; }
      if (d.type === "bendSemi") { this.bendS = d.v; return; }   // SynthCompare.voice bend(semitones): any synth, whatever its E.bend
      if (d.type === "panic") { this.held = []; this.fxS = []; for (i = 0; i < NV; i++) { this.V[i].gate = 0; this.V[i].as = 3; this.V[i].fs = 3; this.V[i].s3 = 3; this.V[i].holdT = 0; for (var j = 0; j < 6; j++) this.V[i].ost[j] = 3; } return; }
      if (!E) return;
      var nv = Math.max(1, Math.min(NV, E.voices));
      if (d.type === "on") {
        this.held = this.held.filter(function (n) { return n !== d.note; }); this.held.push(d.note);
        if (E.voices === 1) this.mono(d.vel, true);
        else {
          var best = null;
          for (i = 0; i < nv; i++) if (this.V[i].note === d.note) best = this.V[i];   // the same key retriggers its own voice
          if (!best) for (i = 0; i < nv; i++) if (!this.V[i].gate && (!best || this.V[i].age < best.age)) best = this.V[i];
          if (!best) for (i = 0; i < nv; i++) if (!best || this.V[i].age < best.age) best = this.V[i];
          this.start(best, d.note, d.vel, true, 0, false);
        }
      } else if (d.type === "off") {
        this.held = this.held.filter(function (n) { return n !== d.note; });
        if (E.voices === 1) { if (this.held.length) this.mono(null, false); else for (i = 0; i < Math.max(1, E.unison); i++) this.release(this.V[i]); }
        else for (i = 0; i < NV; i++) if (this.V[i].note === d.note && this.V[i].gate) this.release(this.V[i]);
      }
    };
    Proc.prototype.mono = function (vel, isNew) {
      var E = this.E, h = this.held, n = E.prio === "low" ? Math.min.apply(null, h) : h[h.length - 1], wasOn = this.V[0].gate, u = Math.max(1, E.unison);
      for (var i = 0; i < NV; i++) {
        if (i >= u) { if (this.V[i].gate) this.release(this.V[i]); continue; }
        var det = u > 1 ? (i / (u - 1) - 0.5) * 2 * E.uniDet : 0;
        this.start(this.V[i], n, vel == null ? this.V[i].vel : vel, !(E.legato && wasOn), det, !!wasOn);
      }
    };
    Proc.prototype.start = function (v, note, vel, trig, det, legato) {
      var E = this.E; this.clock++;
      if (!E.glide || v.note < 0 || (E.glideLegato && !legato)) v.p = note;
      v.slide = !!legato; v.tp = note; v.note = note; v.vel = vel; v.det = det || 0; v.age = this.clock;
      if (trig || !v.gate) { v.fs = 0; v.as = 0; v.t = 0; v.holdT = 0; v.s3 = E.env3 && E.env3.delay > 0 ? -1 : 0; v.d3 = E.env3 ? E.env3.delay : 0; for (var j = 0; j < 6; j++) v.ost[j] = 0; }
      v.gate = 1;
    };
    Proc.prototype.release = function (v) {
      v.gate = 0;
      if (this.E && this.E.hold > 0) { v.holdT = this.E.hold; return; }   // MS-20 EG 2 HOLD keeps the note on
      v.fs = 3; v.as = 3; v.s3 = 3; for (var j = 0; j < 6; j++) v.ost[j] = 3;
    };
    function env(v, key, st, P, lin, dt) {   // stages 0 attack 1 decay 2 sustain 3 release 4 idle
      var e = v[key], s = v[st];
      if (s === 0) { if (lin) e += dt / Math.max(P.a, 1e-4); else e += (1.25 - e) * (1 - Math.exp(-dt * 1.4 / Math.max(P.a, 1e-4))); if (e >= 1) { e = 1; s = 1; } }
      else if (s === 1 || s === 2) { if (lin) { e -= dt / Math.max(P.d, 1e-4) * (1 - P.s + 0.02); if (e <= P.s) { e = P.s; } } else e += (P.s - e) * (1 - Math.exp(-dt * 4 / Math.max(P.d, 1e-4))); }
      else if (s === 3) { if (lin) { e -= dt / Math.max(P.r, 1e-4); if (e <= 0) { e = 0; s = 4; } } else { e += (0 - e) * (1 - Math.exp(-dt * 4 / Math.max(P.r, 1e-4))); if (e < 1e-5) { e = 0; s = 4; } } }
      v[key] = e; v[st] = s; return e;
    }
    function oscVal(o, ph, dt, pw) {
      var w = o.waves, y = 0;
      if (o.wt) return 0;
      if (w.saw) y += w.saw * (2 * ph - 1 - blep(ph, dt));
      if (w.rsaw) y -= w.rsaw * (2 * ph - 1 - blep(ph, dt));
      if (w.tri) y += w.tri * (1 - 4 * Math.abs(ph - 0.5));
      if (w.sine) y += w.sine * sinT(ph);
      if (w.trisaw) y += w.trisaw * (0.5 * (1 - 4 * Math.abs(ph - 0.5)) + 0.5 * (2 * ph - 1 - blep(ph, dt)));   // shape: this page's
      if (w.pulse) { var p2 = ph - pw; if (p2 < 0) p2 += 1; y += w.pulse * ((ph < pw ? 1 : -1) + blep(ph, dt) - blep(p2, dt)); }
      return y;
    }
    function shapeVal(sh, ph, dt, pw) {   // continuous tri .. saw .. pulse (Prophet-6, Voyager, Subsequent)
      sh = sh < 0 ? 0 : sh > 2 ? 2 : sh; var tri = 1 - 4 * Math.abs(ph - 0.5), saw = 2 * ph - 1 - blep(ph, dt);
      if (sh <= 1) return tri * (1 - sh) + saw * sh;
      var p2 = ph - pw; if (p2 < 0) p2 += 1; var pu = (ph < pw ? 1 : -1) + blep(ph, dt) - blep(p2, dt); return saw * (2 - sh) + pu * (sh - 1);
    }
    // the effects (Prophet-6 slots, Grandmother spring, what-if): this page's own simple designs, not the instruments' algorithms
    var RV = { hal: [[1557, 1617, 1491, 1422], 0.9], roo: [[743, 811, 691, 857], 0.7], pla: [[523, 587, 631, 467], 0.5], spr: [[331, 389, 437, 293], 0.6] };
    function fxRun(st, f, x, sr) {
      var k = f.k;
      if (st.k !== k) { for (var z in st) delete st[z]; st.k = k; }
      if (k === "dist") { var g = 1 + f.a * 8; return ft(x * g) / (1 + f.a * 1.5); }
      if (!st.buf) { st.buf = new Float32Array(Math.ceil(sr * 1.05) + 8); st.w = 0; st.ph = 0; st.lp = 0; st.ap = new Float32Array(12); st.fb = 0; }
      var B = st.buf, L = B.length, y = 0, rp, i0, fr, v;
      function tap(d) { rp = st.w - d; while (rp < 0) rp += L; i0 = rp | 0; fr = rp - i0; return B[i0 % L] + (B[(i0 + 1) % L] - B[i0 % L]) * fr; }
      if (k === "bbd" || k === "ddl") {
        var d = (0.02 + f.a * 0.98) * sr; if (k === "bbd") { st.ph += 0.4 / sr; if (st.ph > 1) st.ph -= 1; d *= 1 + 0.004 * Math.sin(6.2832 * st.ph); }
        v = tap(d); if (k === "bbd") { st.lp += (v - st.lp) * 0.18; v = st.lp; }
        var wv = x + v * f.b * 0.92; B[st.w] = k === "bbd" ? ft(wv) : wv; st.w = (st.w + 1) % L; y = v;
      } else if (k === "cho") {
        st.ph += (0.1 + f.a * 4) / sr; if (st.ph > 1) st.ph -= 1; B[st.w] = x;
        y = tap((0.006 + (0.0005 + f.b * 0.004) * (1 - 4 * Math.abs(st.ph - 0.5))) * sr); st.w = (st.w + 1) % L;
      } else if (k === "ph1" || k === "ph2") {
        st.ph += (0.05 + f.a * 4) / sr; if (st.ph > 1) st.ph -= 1;
        var fc = 200 * Math.pow(2, (0.5 + 0.5 * Math.sin(6.2832 * st.ph)) * (1 + f.b * 4.5)), t = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr), c = (t - 1) / (t + 1), u = x + st.fb * (k === "ph1" ? 0.7 : 0.35);
        for (var j = 0; j < 6; j++) { var o = c * u + st.ap[j]; st.ap[j] = u - c * o; u = o; }
        st.fb = u; y = u;
        return x * (1 - f.mix * 0.5) + y * f.mix * 0.5;   // dry + all-passed: the notches
      } else {   // reverbs: four combs and two all-passes; "a" = time, "b" = early reflections (spring: tone)
        var P = RV[k] || RV.hal, sc = sr / 48000; if (!st.c) { st.c = P[0].map(function (n) { return { b: new Float32Array(Math.round(n * sc * (1 + P[1]))), i: 0, l: 0 }; }); st.a = [new Float32Array(Math.round(225 * sc)), new Float32Array(Math.round(556 * sc))]; st.ai = [0, 0]; }
        var gfb = 0.72 + f.a * 0.26, damp = k === "spr" ? 0.55 - f.b * 0.4 : k === "pla" ? 0.15 : 0.3, sum = 0;
        for (var q = 0; q < 4; q++) { var C = st.c[q], out = C.b[C.i]; C.l = out * (1 - damp) + C.l * damp; C.b[C.i] = x + C.l * gfb; C.i = (C.i + 1) % C.b.length; sum += out; }
        y = sum * 0.25;
        for (q = 0; q < 2; q++) { var A = st.a[q], bo = A[st.ai[q]], ii = y + bo * 0.5; A[st.ai[q]] = ii; st.ai[q] = (st.ai[q] + 1) % A.length; y = bo - ii * 0.5; }
        if (k !== "spr") { B[st.w] = x; y += tap(0.013 * sr) * f.b * 0.5 + tap(0.029 * sr) * f.b * 0.35; st.w = (st.w + 1) % L; }
        y *= 1.4;
      }
      return x * (1 - f.mix * 0.5) + y * f.mix;
    }
    function dxAmp(L) { return L <= 0 ? 0 : Math.pow(2, (L - 99) / 8); }
    Proc.prototype.fmVoice = function (v, E, pitch, dt) {   // six operators through the algorithm's buses
      var F = E.fm, alg = ALG[F.alg - 1], bus = [0, 0, 0], has = [true, false, false], out = 0, hz = 440 * Math.pow(2, (pitch - 69) / 12), fbA = F.fb ? Math.pow(2, F.fb - 7) * 2.2 : 0, mx = 0;
      for (var j = 0; j < 6; j++) {
        var op = F.ops[j], st = v.ost[j], e = v.oe[j];
        if (st < 3) { var tgt = op.l[Math.min(st, 2)], sp = 99 / op.r[Math.min(st, 2)] * dt; if (e < tgt) { e = Math.min(tgt, e + sp); } else { e = Math.max(tgt, e - sp); } if (e === tgt && st < 2) st++; }
        else if (st === 3) { var t4 = op.l[3], s4 = 99 / op.r[3] * dt; e = e > t4 ? Math.max(t4, e - s4) : Math.min(t4, e + s4); if (e === t4) st = 4; }
        v.ost[j] = st; v.oe[j] = e;
        var amp = op.lvl > 0 && e > 0 ? dxAmp(e + op.lvl - 99) : 0, f = alg[j], inb = (f >> 4) & 3, ob = f & 3, add = (f & 4) !== 0;
        var ph = v.oph[j] + hz * op.ratio * Math.pow(2, op.det * 0.7 / 1200) * dt; ph -= Math.floor(ph); v.oph[j] = ph;
        var inp = inb ? (has[inb] ? bus[inb] : 0) : 0;
        if (f & 0x40) inp += (v.fb[0] + v.fb[1]) * 0.5 * fbA;
        var val = amp ? sinT(ph + inp / (2 * Math.PI)) * amp : 0;
        if (f & 0x80) { v.fb[1] = v.fb[0]; v.fb[0] = val; }
        if (ob === 0) { out += val; if (amp > mx) mx = amp; }
        else { var mv = val * 8; bus[ob] = add && has[ob] ? bus[ob] + mv : mv; has[ob] = true; }
      }
      v.fmLive = mx;
      return out * 0.35;
    };
    function svf(v, a, b, x, cut, res, mode, hot, sr) {   // 2-pole state-variable filter (topology-preserving), 12 dB per octave
      var g = Math.tan(Math.PI * Math.min(cut, sr * 0.45) / sr), k = 2 - 1.97 * Math.min(res, 1.02);
      if (hot) k = Math.max(0.02, k);
      var s1 = v[a], s2 = v[b], hp = (x - (k + g) * s1 - s2) / (1 + k * g + g * g), bp = g * hp + s1, lp = g * bp + s2;
      s1 = g * hp + bp; s2 = g * bp + lp; if (hot) { s1 = ft(s1); } else if (Math.abs(s1) > 50) { s1 = 0; s2 = 0; }
      v[a] = s1; v[b] = s2;
      return mode === "hp" ? hp : mode === "bp" ? bp * k : mode === "notch" ? lp + hp : lp;
    }
    Proc.prototype.process = function (ins, outs) {
      var out = outs[0][0], E = this.E, N = out.length, sr = sampleRate, dt = 1 / sr, i, j, k;
      if (this.q.length && typeof currentTime !== "undefined") { var due = this.q.filter(function (d) { return d.at <= currentTime + N / sr; }); this.q = this.q.filter(function (d) { return d.at > currentTime + N / sr; }); for (i = 0; i < due.length; i++) { due[i].at = null; this.msg(due[i]); } }
      if (!E) { for (i = 0; i < N; i++) out[i] = 0; return true; }
      var wheel = this.wheel, routes = E.routes, L = E.lfo, model = E.model, k4 = 4.15 * Math.min(E.res, model === "diode" ? 0.86 : 1.08), nv = Math.max(1, Math.min(NV, Math.max(E.voices, E.unison || 1)));
      var sync = E.sync === true ? { slave: 0, master: 1 } : E.sync, hasHp = E.hpf && (E.hpf.cut > 0 || E.hpf.boost), ring = E.ring;
      var bendK = 1 - Math.exp(-dt / 0.004);   // pitch bend glides to its target in ~4 ms: no steps, no clicks
      for (i = 0; i < N; i++) {
        this.bendSm += (this.bendV * (E.bend || 0) + this.bendS - this.bendSm) * bendK;
        this.lfoPh += L.hz * dt; var wrapL = false; if (this.lfoPh >= 1) { this.lfoPh -= 1; wrapL = true; }
        var ph = this.lfoPh, sk = L.skew || 0.5, tri = L.skew ? (ph < sk ? 2 * ph / sk - 1 : 1 - 2 * (ph - sk) / (1 - sk)) : 1 - 4 * Math.abs(ph - 0.5), lv = 0;
        if (L.tri) lv += tri; if (L.sine) lv += sinT(ph); if (L.sq) lv += L.uni ? (ph < 0.5 ? 1 : 0) : (ph < 0.5 ? 1 : -1); if (L.saw) lv += L.saw > 0 ? (L.uni ? ph : 2 * ph - 1) : 1 - 2 * ph;   // saw / square positive only on the Prophet (P 31)
        var wn = this.rand(), b0 = this.pk;
        if (wrapL) this.shL = wn;
        if (E.shHz) { this.shPh += E.shHz * dt; if (this.shPh >= 1) { this.shPh -= 1; this.shV = wn; } }
        b0[0] = 0.99886 * b0[0] + wn * 0.0555179; b0[1] = 0.99332 * b0[1] + wn * 0.0750759; b0[2] = 0.96900 * b0[2] + wn * 0.1538520; b0[3] = 0.86650 * b0[3] + wn * 0.3104856;
        b0[4] = 0.55000 * b0[4] + wn * 0.5329522; b0[5] = -0.7616 * b0[5] - wn * 0.0168980;
        var pink = (b0[0] + b0[1] + b0[2] + b0[3] + b0[4] + b0[5] + b0[6] + wn * 0.5362) * 0.11; b0[6] = wn * 0.115926;
        this.rk += (pink - this.rk) * 0.02; var red = this.rk * 4;
        var mnoise = E.modNoise === "red" ? red : E.modNoise === "pink" ? pink * 1.5 : wn;
        var sum = 0;
        for (j = 0; j < nv; j++) {
          var v = this.V[j]; if (v.as === 4 && !v.gate) continue;
          v.t += dt;
          if (v.holdT > 0) { v.holdT -= dt; if (v.holdT <= 0) { v.holdT = 0; v.fs = 3; v.as = 3; v.s3 = 3; } }
          if (E.glide && (!E.glideLegato || v.slide)) { var g = dt / E.glide * 12; v.p += Math.max(-g, Math.min(g, v.tp - v.p)); } else v.p = v.tp;
          var fe = env(v, "fe", "fs", E.fenv, E.fenv.lin, dt), ae = env(v, "ae", "as", E.aenv, E.aenv.lin, dt), e3 = 0;
          if (E.env3) { if (v.s3 === -1) { v.d3 -= dt; if (v.d3 <= 0) v.s3 = 0; } else e3 = env(v, "e3", "s3", E.env3, false, dt); }
          var ld = L.delay ? Math.min(1, v.t / L.delay) : 1, lvv = lv * ld;
          var mod = { p0: 0, p1: 0, p2: 0, pw0: 0, pw1: 0, pw2: 0, sh0: 0, sh1: 0, sh2: 0, cut: 0, hcut: 0, amp: 0, wt: 0 };
          for (k = 0; k < routes.length; k++) {
            var r = routes[k], sv = 0;
            for (var q = 0; q < r.src.length; q++) {
              var nm = r.src[q][0], wgt = r.src[q][1]; if (!wgt) continue;
              sv += wgt * (nm === "lfo" ? lvv : nm === "lfoSq" ? (ph < 0.5 ? 1 : -1) * ld : nm === "noise" ? wn : nm === "noiseMod" ? mnoise : nm === "fenv" ? fe : nm === "fenvrev" ? -fe : nm === "aenv" ? ae
                : nm === "env3" ? e3 : nm === "env3rev" ? -e3 : nm === "sh" ? this.shV : nm === "shL" ? this.shL * ld : nm === "kbd" ? (v.p - 60) / 12
                : nm === "osc3" || nm === "osc2" ? v.out[2] : nm === "osc1" ? v.out[1] : nm === "osc0" ? v.out[0] : nm === "sine1" ? sinT(v.ph[1]) : nm === "sq0" ? (v.ph[0] < 0.5 ? 1 : -1) : 0);
            }
            var gn = r.gain === "wheel" ? wheel : r.gain === "init" ? Math.min(1, r.init + wheel) : 1;
            if (r.curve === "sq") gn *= gn;
            for (q = 0; q < r.dst.length; q++) mod[r.dst[q]] += sv * gn * r.amt;
          }
          var bend = this.bendSm, o2;
          var velA = E.aenv.vel ? 0.35 + 0.65 * v.vel : 1, acc = E.accent && v.vel >= 0.95 ? E.accent : 0;
          if (E.fm) {
            o2 = this.fmVoice(v, E, v.p + bend + mod.p0, dt) * ae * velA;
            if (E.fmFilt) {   // the what-if filter: a ladder after the operators, opened by the amplitude envelope
              var fq = v.fy, fcut = Math.min(sr * 0.42, E.fmFilt.cut * Math.pow(2, 2.5 * ae + (v.p - 60) / 24)), gf = 1 - Math.exp(-2 * Math.PI * fcut / sr), kf = 4.15 * E.fmFilt.res;
              var fin = ft(o2 * 2 - kf * fq[3]); fq[0] += gf * (fin - ft(fq[0])); fq[1] += gf * (ft(fq[0]) - ft(fq[1])); fq[2] += gf * (ft(fq[1]) - ft(fq[2])); fq[3] += gf * (ft(fq[2]) - ft(fq[3])); o2 = fq[3] * 0.6;
            }
            if (!v.gate && v.as === 3 && v.fmLive < 1e-4) v.as = 4;
          } else {
            var mix = 0, k2;
            for (k = 0; k < 3; k++) {   // advance the phases
              var o = E.osc[k];
              if (!o.on && !o.run && !(k === 2 && routes.length) && !(k === 1 && routes.length)) { v.w[k] = false; v.inc[k] = 0; continue; }
              if (Math.random() < 0.0005) v.drT[k] = (Math.random() * 2 - 1) * E.drift;
              v.dr[k] += (v.drT[k] - v.dr[k]) * 0.00005;
              var semi = (o.kbd ? v.p - 69 : -9) + o.oct * 12 + o.semis + bend + (v.dr[k] + v.det) / 100 + (k === 0 ? mod.p0 : k === 1 ? mod.p1 : mod.p2);
              var hz = 440 * Math.pow(2, semi / 12); if (hz > sr * 0.45) hz = sr * 0.45;
              var inc = hz * dt, phs = v.ph[k] + inc; v.w[k] = false;
              if (phs >= 1) { phs -= Math.floor(phs); v.w[k] = true; }
              v.ph[k] = phs; v.inc[k] = inc;
            }
            if (sync && v.w[sync.master] && v.inc[sync.master]) v.ph[sync.slave] = v.ph[sync.master] * v.inc[sync.slave] / v.inc[sync.master];
            for (k = 0; k < 3; k++) {
              var oo = E.osc[k]; if (!v.inc[k]) { v.out[k] = 0; continue; }
              var pw = Math.max(0.03, Math.min(0.97, oo.pw + (k === 0 ? mod.pw0 : k === 1 ? mod.pw1 : mod.pw2)));
              v.out[k] = oo.wt ? wtVal(oo.wt.t, oo.wt.pos + mod.wt, v.ph[k]) : oo.shape != null ? shapeVal(oo.shape + (k === 0 ? mod.sh0 : k === 1 ? mod.sh1 : mod.sh2), v.ph[k], v.inc[k], pw) : oscVal(oo, v.ph[k], v.inc[k], pw);
              if (oo.on) mix += v.out[k] * oo.lvl;
            }
            if (ring && ring.lvl) mix += ring.lvl * (ring.kind === "arp" ? (2 * v.ph[0] - 1) * sinT(v.ph[1]) : ring.kind === "mul" ? v.out[0] * v.out[1] : v.out[0] * (v.ph[1] < 0.5 ? 1 : -1));
            mix = mix * 0.45 + (E.noise.lvl ? (E.noise.red ? red * 1.5 : E.noise.pink ? pink * 2.2 : wn * 0.7) * E.noise.lvl * 0.6 : 0) + v.last * E.fb * 3.2;
            mix = ft(mix * 1.1) * 0.9;   // the mixer can overload (M 27, P 21): one soft curve for every synth
            if (E.drive) mix = ft(mix * (1 + E.drive * 6)) * (0.9 - E.drive * 0.3);   // MultiDrive (S25 PDF 16): this page's curve
            if (hasHp) {
              var hc = E.hpf.cut * Math.pow(2, mod.hcut);
              if (E.hpf.kind === "svf") { if (hc > 0) mix = svf(v, "h1", "h2", mix, Math.max(8, hc), E.hpf.res || 0, "hp", E.hpf.hot, sr); }
              else { if (hc > 0) { var gh = 1 - Math.exp(-2 * Math.PI * hc / sr); v.hp += gh * (mix - v.hp); mix -= v.hp; } if (E.hpf.boost) { v.bst += 0.02 * (mix - v.bst); mix += E.hpf.boost * v.bst * 1.5; } }
            }
            var cut = E.cut * Math.pow(2, E.env * fe * (1 + acc) + E.kbd * (v.p - 60) / 12 + mod.cut + (E.velF ? E.velF * (v.vel - 0.7) : 0));
            if (cut > sr * 0.42) cut = sr * 0.42; if (cut < 8) cut = 8;
            var y = v.y, inp, comp = 1, yo;
            if (model === "none") yo = mix;
            else if (model === "svf" || model === "ms20") { yo = svf(v, "s1", "s2", mix, cut, E.res, E.mode, model === "ms20", sr); yo = ft(yo * 0.8) / 0.8; }
            else {
              var gco = 1 - Math.exp(-2 * Math.PI * cut / sr);
              if (model === "ladder" || model === "diode") { inp = ft(mix - k4 * y[3] + 1e-6 * this.rand()); y[0] += gco * (inp - ft(y[0])); y[1] += gco * (ft(y[0]) - ft(y[1])); y[2] += gco * (ft(y[1]) - ft(y[2])); y[3] += gco * (ft(y[2]) - ft(y[3])); comp = model === "diode" ? 1 + 0.3 * k4 / 4 : 1; }
              else if (model === "ssi") { inp = ft(1.2 * (mix - k4 * 1.02 * y[3]) + 1e-6 * this.rand()) / 1.2; y[0] += gco * (inp - y[0]); y[1] += gco * (y[0] - y[1]); y[2] += gco * (y[1] - y[2]); y[3] += gco * (y[2] - y[3]); comp = 1 + 0.45 * k4 / 4; }
              else { inp = mix - ft(k4 * 1.05 * y[3]) + 1e-6 * this.rand(); y[0] += gco * (ft(inp) - y[0]); y[1] += gco * (y[0] - y[1]); y[2] += gco * (y[1] - y[2]); y[3] += gco * (y[2] - y[3]); comp = 1 + 0.25 * k4 / 4; }
              yo = y[3] * comp;
              if (E.dual && E.dual.sp) {   // Voyager: Dual LP (a second LP in parallel) or HP/LP (an HP in series), SPACING apart (VO PDF 8); the second filter is a 2-pole here
                var c2 = Math.max(8, Math.min(sr * 0.42, cut * Math.pow(2, E.dual.mode === "hplp" ? -Math.abs(E.dual.sp) : E.dual.sp)));
                yo = E.dual.mode === "hplp" ? svf(v, "d1", "d2", yo, c2, E.res * 0.5, "hp", false, sr) : 0.5 * (yo + svf(v, "d1", "d2", mix, c2, E.res * 0.7, "lp", false, sr));
              } else if (E.dual && E.dual.mode === "hplp") yo = svf(v, "d1", "d2", yo, Math.max(8, cut * 0.5), 0, "hp", false, sr);
            }
            var gain = E.amp ? Math.max(0, Math.min(1.2, E.amp.init + E.amp.a * ae + E.amp.f * fe * fe + mod.amp)) : ae + mod.amp * ae;
            if (E.amp && !v.gate && v.as === 4 && v.fs !== 4 && E.amp.f > 0) v.as = 3;   // keep the voice while the ADSR still opens the VCA
            o2 = yo * gain * velA * (1 + 0.8 * acc);
          }
          v.last = o2; sum += o2;
          if (!v.gate && v.as === 4) { v.note = -1; }
        }
        var s0 = sum * E.vol * 1.6;
        if (E.chorus) {   // the Juno's chorus, mono: a delay swept by a slow triangle at 0.4 / 0.6 Hz (Wikipedia, "Roland Juno-60"); depths this page's
          var cr = E.chorus === 2 ? 0.6 : 0.4, cd = E.chorus === 2 ? 0.0028 : 0.0017; this.cph += cr * dt; if (this.cph >= 1) this.cph -= 1;
          var dly = (0.0042 + cd * (1 - 4 * Math.abs(this.cph - 0.5))) * sr, rp = this.dw - dly; if (rp < 0) rp += 4096;
          var ri = rp | 0, rf = rp - ri, dv = this.dl[ri & 4095] + (this.dl[(ri + 1) & 4095] - this.dl[ri & 4095]) * rf;
          this.dl[this.dw] = s0; this.dw = (this.dw + 1) & 4095; s0 = 0.62 * s0 + 0.62 * dv;
        }
        if (E.fx) for (q = 0; q < E.fx.length; q++) { if (!this.fxS[q]) this.fxS[q] = {}; s0 = fxRun(this.fxS[q], E.fx[q], s0, sr); }
        out[i] = s0;
      }
      return true;
    };
    registerProcessor("synth-compare", Proc);
  }
  SC.workletSource = "(function(){var ALG=" + JSON.stringify(DX_ALG) + ";(" + workletSource.toString() + ")();})();";

  // ---------- drawing helpers (filter curve from the engine's own models, linearised) ----------
  function filterResponse(E, f, note) {
    if (E.model === "none" || E.fm) return 0;
    var sr = 48000, cut = Math.min(sr * 0.42, E.cut * Math.pow(2, E.kbd * ((note || 60) - 60) / 12)), db;
    if (E.model === "svf" || E.model === "ms20") {
      var k = 2 - 1.97 * Math.min(E.res, 1.02), w = f / cut, re = 1 - w * w, im = k * w, den = Math.sqrt(re * re + im * im), m = E.mode;
      var num = m === "hp" ? w * w : m === "bp" ? k * w : m === "notch" ? Math.abs(1 - w * w) : 1;
      db = 20 * Math.log10(Math.max(1e-6, num / den));
    } else {
      var g = 1 - Math.exp(-2 * Math.PI * cut / sr), kk = 4.15 * Math.min(E.res, E.model === "diode" ? 0.86 : 1.08);
      if (E.model === "ssi") kk *= 1.02; if (E.model === "cem" || E.model === "ir3109" || E.model === "ssm") kk *= 1.05;
      var wz = 2 * Math.PI * f / sr, rez = Math.cos(wz), imz = -Math.sin(wz);
      var dr = 1 - (1 - g) * rez, di = -(1 - g) * imz, m2 = dr * dr + di * di, hr = g * dr / m2, hi = -g * di / m2;
      var h2r = hr * hr - hi * hi, h2i = 2 * hr * hi, h4r = h2r * h2r - h2i * h2i, h4i = 2 * h2r * h2i;
      var fr = 1 + kk * (rez * h4r - imz * h4i), fi = kk * (rez * h4i + imz * h4r), fm = fr * fr + fi * fi;
      var Hr = (h4r * fr + h4i * fi) / fm, Hi = (h4i * fr - h4r * fi) / fm, comp = E.model === "ssi" ? 1 + 0.45 * kk / 4 : E.model === "ladder" ? 1 : E.model === "diode" ? 1 + 0.3 * kk / 4 : 1 + 0.25 * kk / 4;
      db = 20 * Math.log10(Math.max(1e-6, Math.sqrt(Hr * Hr + Hi * Hi) * comp));
    }
    if (E.hpf && E.hpf.cut > 0) {
      var wh = f / E.hpf.cut;
      if (E.hpf.kind === "svf") { var kh = 2 - 1.97 * Math.min(E.hpf.res || 0, 1.02), rh = 1 - wh * wh, ih = kh * wh; db += 20 * Math.log10(Math.max(1e-6, wh * wh / Math.sqrt(rh * rh + ih * ih))); }
      else db += 20 * Math.log10(Math.max(1e-6, wh / Math.sqrt(1 + wh * wh)));
    }
    if (E.dual && E.dual.mode === "hplp") { var wd = f / Math.max(8, cut * Math.pow(2, -Math.abs(E.dual.sp || 1))), kd = 2 - 1.97 * Math.min(E.res * 0.5, 1.02), rd = 1 - wd * wd; db += 20 * Math.log10(Math.max(1e-6, wd * wd / Math.sqrt(rd * rd + kd * kd * wd * wd))); }
    return db;
  }
  SC.filterResponse = filterResponse;
  function envPoints(P, hold) {   // [t, level] for a note held `hold` seconds
    var pts = [], dt = 0.002, v = { e: 0, s: 0 }, t = 0;
    function step() {
      var e = v.e;
      if (v.s === 0) { if (P.lin) e += dt / Math.max(P.a, 1e-4); else e += (1.25 - e) * (1 - Math.exp(-dt * 1.4 / Math.max(P.a, 1e-4))); if (e >= 1) { e = 1; v.s = 1; } }
      else if (v.s === 1) { if (P.lin) { e -= dt / Math.max(P.d, 1e-4) * (1 - P.s + 0.02); if (e <= P.s) e = P.s; } else e += (P.s - e) * (1 - Math.exp(-dt * 4 / Math.max(P.d, 1e-4))); }
      else if (v.s === 3) { if (P.lin) { e -= dt / Math.max(P.r, 1e-4); if (e < 0) e = 0; } else e += -e * (1 - Math.exp(-dt * 4 / Math.max(P.r, 1e-4))); }
      v.e = e;
    }
    for (; t < hold + 3; t += dt) { if (t >= hold && v.s < 3) v.s = 3; step(); if (pts.length === 0 || t - pts[pts.length - 1][0] > 0.01) pts.push([t, v.e]); }
    return pts;
  }
  SC.envPoints = envPoints;

  // ---------- the engine on any AudioContext (for the DAW, later) ----------
  var modP = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function loadModule(ac) {
    var p = modP && modP.get(ac);
    if (!p) { var url = URL.createObjectURL(new Blob([SC.workletSource], { type: "text/javascript" })); p = ac.audioWorklet.addModule(url); if (modP) modP.set(ac, p); }
    return p;
  }
  // SynthCompare.voice(ctx, synthId, state) -> Promise of { node, noteOn(n, vel, when), noteOff(n, when), set(state), wheel(v), bend(semis),
  // bendWheel(v), bendRange, panic() }. bend(semis) moves every sounding and later note by that many semitones (smoothed ~4 ms);
  // bendWheel(v) = pitch wheel position -1..1 times bendRange (the synth's engine `bend`: Model D 7 = a fifth, M 24, 80;
  // 2 for a synth whose engine has none, this page's).
  // `node` is an AudioWorkletNode (mono out) to connect anywhere; `when` is in the context's time (omit for now).
  SC.voice = function (ac, id, state) {
    return loadModule(ac).then(function () {
      var n = new AudioWorkletNode(ac, "synth-compare", { numberOfInputs: 0, outputChannelCount: [1] });
      function post(m, when) { if (when != null) m.at = when; n.port.postMessage(m); }
      var o = { node: n, synth: id,
        set: function (s) { state = s; post({ type: "patch", E: SC.engine(id, s) }); },
        noteOn: function (note, vel, when) { post({ type: "on", note: note, vel: vel == null ? 0.8 : vel }, when); },
        noteOff: function (note, when) { post({ type: "off", note: note }, when); },
        wheel: function (v) { post({ type: "wheel", v: v }); },
        bend: function (semis) { post({ type: "bendSemi", v: +semis || 0 }); },
        bendWheel: function (v) { o.bend((Math.max(-1, Math.min(1, +v || 0))) * o.bendRange); },
        get bendRange() { return SC.engine(id, state || {}).bend || 2; }, panic: function () { post({ type: "panic" }); } };
      o.set(state || {});
      if (typeof AudioTap !== "undefined" && AudioTap.register) AudioTap.register(ac, n, "Synth Compare voice");
      return o;
    });
  };

  // ---------- the page widget ----------
  var ctx = null, nodes = {}, ana = {}, master = null, ready = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function audio() {
    if (ready) return ready;
    ctx = new (global.AudioContext || global.webkitAudioContext)();
    ready = loadModule(ctx).then(function () {
      master = ctx.createGain(); master.gain.value = 0.8;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.12;
      master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) AudioTap.register(ctx, master, "Synth Compare");
    });
    return ready;
  }
  function node(id) {
    if (!nodes[id] && ctx && master) {
      var n = new AudioWorkletNode(ctx, "synth-compare", { numberOfInputs: 0, outputChannelCount: [1] }), g = ctx.createGain(), a = ctx.createAnalyser();
      a.fftSize = 4096; n.connect(g); g.connect(master); g.connect(a); nodes[id] = n; ana[id] = a;
    }
    return nodes[id];
  }
  function send(id, m) { if (nodes[id]) nodes[id].port.postMessage(m); }
  function citeText(x) { return /^(WP|SOS|VT|VW|SX|SW)$/.test(x.book) ? x.title + ", \"" + x.page + "\"" : /^PDF /.test(String(x.page)) ? x.title + ", PDF p. " + String(x.page).slice(4) : /^\d+\.\d+$/.test(String(x.page)) ? x.title + " section " + x.page : x.title + " p. " + x.page; }
  SC.citeText = citeText;

  SC.mount = function (host) {
    var W = { host: host, st: {}, mods: {}, a: "moog", b: "prophet", from: "moog", notes: [], ex: SC.EXAMPLES[0], hear: "moog", wheel: 0, timers: [] };
    SC.IDS.forEach(function (id) { W.st[id] = full(id, {}); });
    W.st.moog = full("moog", SC.EXAMPLES[0].s);
    host.innerHTML = "";
    host.classList.add("scmp-w");
    // top bar: example, the two pickers, play buttons, wheel
    var top = el("div", "scmp-top");
    var exSel = el("select", "scmp-ex"); exSel.setAttribute("aria-label", "Worked example");
    SC.IDS.forEach(function (id) {
      var og = el("optgroup"); og.label = "Start on the " + PROFILES[id].name;
      SC.EXAMPLES.forEach(function (x) { if (x.from === id) { var o = el("option", null, x.name); o.value = x.id; og.appendChild(o); } });
      if (og.children.length) exSel.appendChild(og);
    });
    var exL = el("label", "scmp-lab", "Example "); exL.appendChild(exSel); top.appendChild(exL);
    function picker(lab) { var s = el("select", "scmp-pick"); s.setAttribute("aria-label", lab + " synth"); SC.IDS.forEach(function (id) { var o = el("option", null, PROFILES[id].name); o.value = id; s.appendChild(o); }); var l = el("label", "scmp-lab", lab + " "); l.appendChild(s); top.appendChild(l); return s; }
    var pickA = picker("From"), pickB = picker("To");
    var bA = el("button", "btn btn-sm btn-outline-secondary"), bB = el("button", "btn btn-sm btn-outline-secondary"),
      bAB = el("button", "btn btn-sm btn-outline-secondary", "▶ One, then the other"), bStop = el("button", "btn btn-sm btn-outline-secondary", "■ Stop");
    [bA, bB, bAB, bStop].forEach(function (b) { top.appendChild(b); });
    var wheelL = el("label", "scmp-lab", "Mod wheel "), wheelR = el("input"); wheelR.type = "range"; wheelR.min = 0; wheelR.max = 1; wheelR.step = 0.01; wheelR.value = 0; wheelL.appendChild(wheelR); top.appendChild(wheelL);
    // example octave: "auto" lifts phrases that start below G2 (bass lines) an octave, for small speakers; kept site-wide
    var octL = el("label", "scmp-lab", "Example octave "), octSel = el("select", "scmp-oct"); octSel.setAttribute("aria-label", "Example octave");
    [["auto", "Auto (bass up for small speakers)"], ["-1", "−1"], ["0", "As written"], ["1", "+1"], ["2", "+2"]].forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; octSel.appendChild(e); });
    try { octSel.value = localStorage.getItem("scmp-ex-oct") || "auto"; } catch (e) { octSel.value = "auto"; }
    octSel.onchange = function () { try { localStorage.setItem("scmp-ex-oct", octSel.value); } catch (e) {} };
    octL.appendChild(octSel); top.appendChild(octL);
    W.exShift = function (phrase) {
      if (octSel.value !== "auto") return 12 * +octSel.value;
      var lo = Math.min.apply(null, phrase.map(function (p) { return p[0]; })); return lo < 43 ? 12 : 0;
    };
    host.appendChild(top);
    var say = el("p", "scmp-say"); host.appendChild(say);
    var row = el("div", "scmp-panels"); host.appendChild(row);
    var pan = {}, ctlEl = {};
    var plots = el("div", "scmp-plots");
    function plot(title, cls) { var f = el("figure", "scmp-plot " + (cls || "")); f.appendChild(el("figcaption", null, title)); var c = el("canvas"); c.width = 640; c.height = 220; f.appendChild(c); plots.appendChild(f); return c; }
    var cvF = plot("Filter: what each lets through (dB against frequency, at middle C)"), cvE = plot("Envelopes: filter (thin) and loudness (thick), key held 1 s"),
      cvD = plot("Mixer drive: input against output (the Model D's line moves with its feedback)"), cvS = plot("Scope and spectrum, live", "scmp-live");
    var legend = el("p", "scmp-legend"); host.appendChild(legend); host.appendChild(plots);
    var rep = el("div", "scmp-report"); host.appendChild(rep);
    var kb = el("div", "scmp-kbd"), keyEls = {}, base0 = 48;
    for (var n = base0; n < base0 + 25; n++) { var bk = [1, 3, 6, 8, 10].indexOf(n % 12) >= 0, k = el("div", "scmp-key" + (bk ? " scmp-blk" : "")); k.dataset.n = n; kb.appendChild(k); keyEls[n] = k; }
    var kbHelp = el("p", "scmp-hint", "Play from these keys, the computer keys (a w s e d f t g y h u j k; z and x move the octave) or a MIDI keyboard. ");
    var midiB = el("button", "btn btn-sm btn-outline-secondary", "Use MIDI"); kbHelp.appendChild(midiB);
    host.appendChild(kbHelp); host.appendChild(kb);
    function other(id) { return id === W.a ? W.b : W.a; }

    function buildPanels() {
      row.innerHTML = ""; pan = {}; ctlEl = {}; W.ctlEl = ctlEl;
      [W.a, W.b].forEach(function (id) {
        var P = PROFILES[id], box = el("div", "scmp-panel scmp-" + id);
        var head = el("div", "scmp-ph"); head.appendChild(el("span", "scmp-name", P.name)); head.appendChild(el("span", "scmp-long", P.long));
        var turn = el("button", "btn btn-sm scmp-turn", "Turn into the " + PROFILES[other(id)].name + " ↓"); turn.dataset.from = id; head.appendChild(turn);
        var hear = el("button", "btn btn-sm btn-outline-secondary scmp-hear", "Keys play this"); hear.dataset.id = id; head.appendChild(hear);
        box.appendChild(head);
        if (P.whatif) {   // "What if…": features the instrument lacks; sound only, the report keeps describing the real one
          var wi = el("details", "scmp-wi"); wi.appendChild(el("summary", null, "What if…"));
          wi.appendChild(el("p", "scmp-hint", "Add something the real " + P.name + " does not have. Only the sound changes: the translation report still describes the real instrument."));
          P.whatif.forEach(function (m) {
            var lab = el("label", "scmp-wim"), cb = el("input"); cb.type = "checkbox"; cb.checked = !!(W.mods[id] && W.mods[id][m.id]); cb.dataset.wi = m.id;
            cb.onchange = function () { W.setMod(id, m.id, cb.checked); };
            lab.appendChild(cb); lab.appendChild(el("strong", null, " " + m.label + ". ")); lab.appendChild(el("span", null, m.why + " "));
            lab.appendChild(el("span", "scmp-cite", m.cite.map(citeText).join("; "))); wi.appendChild(lab);
          });
          box.appendChild(wi);
          var badge = el("span", "scmp-wibadge", "What if — not the real instrument"); head.appendChild(badge);
        }
        var grid = el("div", "scmp-groups"); ctlEl[id] = {};
        P.groups.forEach(function (g) {
          var fs = el("fieldset", "scmp-g scmp-g-" + g[1]); fs.appendChild(el("legend", null, g[0]));
          g[2].forEach(function (c) { var ce = control(id, c); fs.appendChild(ce); ctlEl[id][c[0]] = ce; });
          grid.appendChild(fs);
        });
        box.appendChild(grid);
        var FPn = window.FaithfulPanel, fpo = null;
        if (FPn && FPn.has(id)) {   // the drawing of the real panel (faithful-panel.js), "Simple" = the grouped knobs above
          var face = el("div", "scmp-face"), seg = el("div", "sp-seg scmp-vw"); seg.setAttribute("aria-label", "Panel view"); box.insertBefore(face, grid);
          var showV = function () { var v = FPn.view(); face.hidden = v !== "panel"; grid.hidden = v === "panel"; [].forEach.call(seg.children, function (b) { b.classList.toggle("sp-on", b.dataset.v === v); }); };
          [["panel", "Panel"], ["simple", "Simple"]].forEach(function (v) { var b = el("button", "sp-opt", v[1]); b.type = "button"; b.dataset.v = v[0];
            b.onclick = function () { FPn.setView(v[0]); document.querySelectorAll(".scmp-face").forEach(function (f) { var p = f.parentNode; f.hidden = v[0] !== "panel"; var g = p.querySelector(".scmp-groups"); if (g) g.hidden = v[0] === "panel"; var sg = p.querySelector(".scmp-vw"); if (sg) [].forEach.call(sg.children, function (x) { x.classList.toggle("sp-on", x.dataset.v === v[0]); }); }); }; seg.appendChild(b); });
          head.appendChild(seg); showV();
          FPn.load(id).then(function () { if (!pan[id] || pan[id].box !== box) return;
            pan[id].fp = FPn.mount(face, { id: id, profile: P, get: function (k) { return W.st[id][k]; }, set: function (k, v) { set(id, k, v); } }); }).catch(function () { face.hidden = true; grid.hidden = false; });
        }
        var views = el("div", "scmp-views"), flow = el("div", "scmp-flow"); views.appendChild(flow); box.appendChild(views);
        pan[id] = { box: box, flow: flow, turn: turn, hear: hear };
        turn.onclick = function () { translate(id, true); var o = pan[other(id)]; if (o && o.box.scrollIntoView) o.box.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
        hear.onclick = function () { setHear(id); };
        row.appendChild(box);
        showAll(id); markWi(id);
      });
      pickA.value = W.a; pickB.value = W.b;
      bA.textContent = "▶ " + PROFILES[W.a].name; bB.textContent = "▶ " + PROFILES[W.b].name;
      legend.innerHTML = ""; [W.a, W.b].forEach(function (id, i) { var s = el("span", "scmp-k scmp-k-" + (i ? "b" : "a")); legend.appendChild(s); legend.appendChild(document.createTextNode(" " + PROFILES[id].name + "   ")); });
      setHear(W.hear === W.a || W.hear === W.b ? W.hear : W.a);
    }
    function control(id, c) {
      var wrap = el("div", "scmp-c scmp-c-" + c[2]); wrap.dataset.ctl = c[0]; wrap.title = c[1];
      var lab = el("span", "scmp-cl", c[1]);
      if (c[2] === "k") {
        var kn = el("div", "scmp-knob"); kn.tabIndex = 0; kn.setAttribute("role", "slider"); kn.setAttribute("aria-label", c[1]);
        kn.innerHTML = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" class="scmp-kb"/><path class="scmp-kt" d=""/><g class="scmp-kpg"><line x1="20" y1="20" x2="20" y2="7" class="scmp-kp"/></g></svg>';
        var out = el("output");
        wrap.appendChild(kn); wrap.appendChild(lab); wrap.appendChild(out);
        var drag = null, step = c[5] >= 1 ? 1 : (c[4] - c[3]) / 50;
        kn.addEventListener("pointerdown", function (e) { drag = { y: e.clientY, v: W.st[id][c[0]] }; kn.setPointerCapture(e.pointerId); wrap.classList.add("scmp-drag"); });
        kn.addEventListener("pointermove", function (e) { if (!drag) return; var span = c[4] - c[3]; set(id, c[0], drag.v + (drag.y - e.clientY) / (e.shiftKey ? 600 : 150) * span); });
        kn.addEventListener("pointerup", function () { drag = null; wrap.classList.remove("scmp-drag"); });
        kn.addEventListener("dblclick", function () { set(id, c[0], PROFILES[id].def[c[0]]); });
        kn.addEventListener("keydown", function (e) { var d = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0; if (d) { e.preventDefault(); set(id, c[0], W.st[id][c[0]] + d * step); } });
        kn.addEventListener("wheel", function (e) { e.preventDefault(); set(id, c[0], W.st[id][c[0]] - Math.sign(e.deltaY) * step); }, { passive: false });
      } else if (c[2] === "s") {
        var sw = el("button", "scmp-sw" + (c[3] ? " scmp-sw-" + c[3] : "")); sw.setAttribute("aria-pressed", "false"); sw.setAttribute("aria-label", c[1]);
        sw.addEventListener("click", function () { set(id, c[0], !W.st[id][c[0]]); });
        wrap.appendChild(sw); wrap.appendChild(lab);
      } else if (c[2] === "cords") {
        wrap.className = "scmp-c scmp-c-cords"; wrap.appendChild(lab);
        var list = el("div", "scmp-cords"); wrap.appendChild(list);
        var add = el("button", "btn btn-sm scmp-turn", "+ cord"); wrap.appendChild(add);
        add.onclick = function () { var a = (W.st[id].cords || []).slice(); a.push({ src: CORD_SRC[id][0], dst: CORD_DST[id][0], amt: 0.5 }); set(id, "cords", a); };
      } else {
        var se = el("select"); se.setAttribute("aria-label", c[1]);
        c[3].forEach(function (o) { var op = el("option", null, M_WAVE_NAME[o] || o); op.value = o; se.appendChild(op); });
        se.addEventListener("change", function () { set(id, c[0], se.value); });
        wrap.appendChild(lab); wrap.appendChild(se);
      }
      return wrap;
    }
    function drawCords(id, w) {
      var list = w.querySelector(".scmp-cords"); if (!list) return; list.innerHTML = "";
      (W.st[id].cords || []).forEach(function (cd, i) {
        var r = el("div", "scmp-cord");
        function sel(opts, v, key) { var s = el("select"); s.setAttribute("aria-label", "Cord " + (i + 1) + " " + key); opts.forEach(function (o) { var op = el("option", null, o); op.value = o; s.appendChild(op); }); s.value = v; s.onchange = function () { var a = JSON.parse(JSON.stringify(W.st[id].cords)); a[i][key] = s.value; set(id, "cords", a); }; return s; }
        r.appendChild(sel(CORD_SRC[id], cd.src, "src")); r.appendChild(el("span", null, "→")); r.appendChild(sel(CORD_DST[id], cd.dst, "dst"));
        var amt = el("input"); amt.type = "range"; amt.min = -1; amt.max = 1; amt.step = 0.05; amt.value = cd.amt; amt.setAttribute("aria-label", "Cord " + (i + 1) + " amount");
        amt.onchange = function () { var a = JSON.parse(JSON.stringify(W.st[id].cords)); a[i].amt = +amt.value; set(id, "cords", a); }; r.appendChild(amt);
        var x = el("button", "scmp-x", "×"); x.setAttribute("aria-label", "Remove cord " + (i + 1)); x.onclick = function () { var a = W.st[id].cords.slice(); a.splice(i, 1); set(id, "cords", a); }; r.appendChild(x);
        list.appendChild(r);
      });
    }
    function ctlDef(id, key) { var r = null; PROFILES[id].groups.forEach(function (g) { g[2].forEach(function (c) { if (c[0] === key) r = c; }); }); return r; }
    function show(id, key) {
      var c = ctlDef(id, key), w = ctlEl[id] && ctlEl[id][key], v = W.st[id][key]; if (!c || !w) return;
      if (c[2] === "k") {
        var f = (v - c[3]) / (c[4] - c[3]), ang = -135 + 270 * f, a0 = -135 * Math.PI / 180 - Math.PI / 2, a1 = ang * Math.PI / 180 - Math.PI / 2;
        w.querySelector(".scmp-kpg").style.transform = "rotate(" + ang + "deg)";
        var x0 = 20 + 17 * Math.cos(a0), y0 = 20 + 17 * Math.sin(a0), x1 = 20 + 17 * Math.cos(a1), y1 = 20 + 17 * Math.sin(a1);
        w.querySelector(".scmp-kt").setAttribute("d", "M" + x0 + " " + y0 + " A17 17 0 " + (f > 2 / 3 ? 1 : 0) + " 1 " + x1 + " " + y1);
        var txt = c[5] >= 1 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(Math.abs(c[3]) > 0 && key.indexOf("Freq") > 0 ? 2 : 1);
        if (id === "prophet" && (key === "aFreq" || key === "bFreq")) txt = (v - 24 >= 0 ? "+" : "") + (v - 24) + " st";
        w.querySelector("output").textContent = txt; w.querySelector(".scmp-knob").setAttribute("aria-valuenow", v);
      } else if (c[2] === "s") { var b = w.querySelector("button"); b.setAttribute("aria-pressed", v ? "true" : "false"); b.classList.toggle("scmp-on", !!v); }
      else if (c[2] === "cords") drawCords(id, w);
      else w.querySelector("select").value = v;
    }
    function showAll(id) { for (var k in W.st[id]) show(id, k); if (pan[id] && pan[id].fp) pan[id].fp.refresh(); }
    function set(id, key, v, quiet) {
      var c = ctlDef(id, key); if (!c) return;
      if (c[2] === "k") { v = Math.max(c[3], Math.min(c[4], Math.round(v / c[5]) * c[5])); v = Math.round(v * 100) / 100; }
      W.st[id][key] = v; show(id, key); push(id); if (pan[id] && pan[id].fp) pan[id].fp.refresh();
      if (!quiet && pan[id]) { if (id === W.from) retranslate(); else pan[id].box.classList.add("scmp-hand"); }
      draw();
    }
    function eng(id) { return SC.engine(id, W.st[id], W.mods[id]); }
    function push(id) { send(id, { type: "patch", E: eng(id) }); }
    function wiOn(id) { var m = W.mods[id] || {}; return Object.keys(m).filter(function (k) { return m[k]; }); }
    function markWi(id) { if (pan[id]) pan[id].box.classList.toggle("scmp-whatif", wiOn(id).length > 0); }
    W.whatif = wiOn;
    W.setMod = function (id, mid, on) { if (!W.mods[id]) W.mods[id] = {}; W.mods[id][mid] = !!on; markWi(id); push(id); draw();
      if (pan[id]) pan[id].box.querySelectorAll(".scmp-wi input").forEach(function (c) { c.checked = !!W.mods[id][c.dataset.wi]; }); };
    W.setMods = function (id, list) { W.mods[id] = {}; (list || []).forEach(function (m) { W.mods[id][m] = true; }); markWi(id); push(id); draw();
      if (pan[id]) pan[id].box.querySelectorAll(".scmp-wi input").forEach(function (c) { c.checked = !!W.mods[id][c.dataset.wi]; }); };
    var rtT = 0;
    function retranslate() { clearTimeout(rtT); rtT = setTimeout(function () { translate(W.from, false); }, 250); }
    // make `from` the starting point; if it is not on the page, it replaces the "From" synth
    function translate(from, animate) {
      if (from !== W.a && from !== W.b) { W.a = from; buildPanels(); }
      else if (from === W.b) { W.b = W.a; W.a = from; buildPanels(); }
      var to = W.b, r = SC.translate(W.st[from], from, to);
      W.from = from; W.to = to; W.notes = r.notes; W.st[to] = r.state;
      pan[to].box.classList.remove("scmp-hand");
      [pan[W.a].box, pan[W.b].box].forEach(function (b) { b.classList.remove("scmp-src", "scmp-dst"); });
      pan[from].box.classList.add("scmp-src"); pan[to].box.classList.add("scmp-dst");
      if (animate) { pan[to].box.classList.add("scmp-morph"); setTimeout(function () { if (pan[to]) pan[to].box.classList.remove("scmp-morph"); }, 1300); }
      showAll(to); push(to); push(from); mark(); report(); draw();
    }
    W.pick = function (a, b) { if (a === b) b = a === "moog" ? "prophet" : "moog"; W.a = a; W.b = b; buildPanels(); translate(a, true); };
    pickA.onchange = function () { W.pick(pickA.value, pickA.value === W.b ? W.a : W.b); };
    pickB.onchange = function () { W.pick(W.a === pickB.value ? W.b : W.a, pickB.value); };
    function mark() {
      [W.a, W.b].forEach(function (id) { for (var k in ctlEl[id]) ctlEl[id][k].classList.remove("scmp-exact", "scmp-approx", "scmp-lost"); });
      var to = W.to, rank = { exact: 1, approx: 2, lost: 3 };
      W.notes.forEach(function (n) {
        n.ctl.from.forEach(function (k) { var e = ctlEl[W.from][k]; if (!e) return; var cur = ["exact", "approx", "lost"].filter(function (c) { return e.classList.contains("scmp-" + c); })[0]; if (!cur || rank[n.cls] > rank[cur]) { if (cur) e.classList.remove("scmp-" + cur); e.classList.add("scmp-" + n.cls); } });
        n.ctl.to.forEach(function (k) { var e = ctlEl[to][k]; if (!e) return; if (n.cls !== "lost") { var cur = ["exact", "approx"].filter(function (c) { return e.classList.contains("scmp-" + c); })[0]; if (!cur || rank[n.cls] > rank[cur]) { if (cur) e.classList.remove("scmp-" + cur); e.classList.add("scmp-" + n.cls); } } });
      });
    }
    function report() {
      var to = W.to, F = PROFILES[W.from].name, T = PROFILES[to].name;
      rep.innerHTML = "";
      rep.appendChild(el("h3", "scmp-rh", F + " → " + T + ": setting by setting"));
      var cnt = { exact: 0, approx: 0, lost: 0 }; W.notes.forEach(function (n) { cnt[n.cls]++; });
      rep.appendChild(el("p", "scmp-count", cnt.exact + " the same · " + cnt.approx + " close · " + cnt.lost + " the " + T + " cannot do"));
      [["lost", "The " + T + " cannot do"], ["approx", "Close, not the same"], ["exact", "The same on both"]].forEach(function (g) {
        var list = W.notes.filter(function (n) { return n.cls === g[0]; }); if (!list.length) return;
        var sec = el("div", "scmp-rg scmp-rg-" + g[0]); sec.appendChild(el("h4", null, g[1]));
        list.forEach(function (n) {
          var it = el("div", "scmp-item"); it.tabIndex = 0;
          it.appendChild(el("strong", null, n.what)); it.appendChild(el("span", null, " " + n.why + " "));
          it.appendChild(el("span", "scmp-cite", n.cite.map(citeText).filter(function (x, i, a) { return a.indexOf(x) === i; }).join("; ")));
          function hl(on) { n.ctl.from.forEach(function (k) { var e = ctlEl[W.from][k]; if (e) e.classList.toggle("scmp-hl", on); }); n.ctl.to.forEach(function (k) { var e = ctlEl[to][k]; if (e) e.classList.toggle("scmp-hl", on); }); flowHl = on ? n : null; drawFlows(); }
          it.addEventListener("mouseenter", function () { hl(true); }); it.addEventListener("mouseleave", function () { hl(false); });
          it.addEventListener("focus", function () { hl(true); }); it.addEventListener("blur", function () { hl(false); });
          sec.appendChild(it);
        });
        rep.appendChild(sec);
      });
    }
    // ---- the signal-flow diagram (generic: every synth's boxes from its profile's `flow`, or the Model D / Prophet ones) ----
    var flowHl = null;
    function flowSvg(id) {
      var E = eng(id), s = W.st[id], P = PROFILES[id], lostSet = {}, isSrc = id === W.from;
      if (isSrc) W.notes.forEach(function (n) { if (n.cls === "lost") n.ctl.from.forEach(function (k) { lostSet[k] = 1; }); });
      var hlSet = {}; if (flowHl) (id === W.from ? flowHl.ctl.from : flowHl.ctl.to).forEach(function (k) { hlSet[k] = 1; });
      function box(x, y, w, h, label, keys, on) {
        var lost = keys.some(function (k) { return lostSet[k]; }), hl = keys.some(function (k) { return hlSet[k]; });
        return '<g class="scf-b' + (on ? " scf-on" : "") + (lost ? " scf-lost" : "") + (hl ? " scf-hl" : "") + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5"/><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '">' + label + "</text></g>";
      }
      function wire(d, on, lost, cls) { return '<path class="scf-w' + (on ? " scf-on" : "") + (lost ? " scf-lost" : "") + (cls ? " " + cls : "") + '" d="' + d + '"/>'; }
      function anyLost(keys) { return (keys || []).some(function (k) { return lostSet[k]; }); }
      var svg = '<svg viewBox="0 0 560 170" role="img" aria-label="Signal flow of the ' + P.name + '"><title>Signal flow: ' + P.name + "</title>";
      if (E.fm) {   // the algorithm: operators by bus, carriers on the bottom row
        var alg = DX_ALG[E.fm.alg - 1], car = SC.dxCarriers(E.fm.alg), mods = [1, 2, 3, 4, 5, 6].filter(function (n) { return car.indexOf(n) < 0; });
        car.forEach(function (n, i) { svg += box(20 + i * 62, 120, 50, 26, "OP " + n, ["o" + n + "l", "alg"], s["o" + n + "l"] > 0) + wire("M" + (45 + i * 62) + " 146 L" + (45 + i * 62) + " 160 L420 160", s["o" + n + "l"] > 0, anyLost(["alg"])); });
        mods.forEach(function (n, i) { svg += box(20 + i * 62, 40 + (i % 2) * 34, 50, 26, "OP " + n, ["o" + n + "l", "alg"], s["o" + n + "l"] > 0); });
        svg += '<text class="scf-t" x="20" y="22">algorithm ' + E.fm.alg + ": " + car.length + " carrier" + (car.length > 1 ? "s" : "") + " (bottom), " + mods.length + " modulator" + (mods.length === 1 ? "" : "s") + (E.fm.fb ? ", feedback " + E.fm.fb : "") + "</text>";
        svg += box(420, 140, 60, 26, "out", ["vol"], true) + '<text class="scf-t" x="400" y="40">no filter</text><text class="scf-t" x="400" y="56">× 16 voices</text>';
        return svg + "</svg>";
      }
      var oscs = id === "moog" ? [["Osc 1", ["m1On", "m1", "o1Wave", "o1Range"]], ["Osc 2", ["m2On", "m2", "o2Wave", "o2Range", "o2Freq"]], ["Osc 3", ["m3On", "m3", "o3Wave", "o3Range", "o3Freq", "o3Kbd"]]]
        : id === "prophet" ? [["Osc A", ["mA", "aSaw", "aPulse", "aPw", "aFreq"]], ["Osc B", ["mB", "bSaw", "bTri", "bPulse", "bPw", "bFreq", "bFine"]]] : P.flow.osc;
      oscs.forEach(function (o, i) { var on = E.osc[i] && E.osc[i].on; svg += box(10, 10 + i * 38, 70, 28, o[0], o[1], on) + wire("M80 " + (24 + i * 38) + " L170 80", on, anyLost(o[1])); });
      var ny = oscs.length > 2 ? 124 : 86, nk = id === "moog" ? ["nOn", "n", "nCol"] : id === "prophet" ? ["mN"] : P.flow.noise;
      if (nk) svg += box(10, ny, 70, 24, "Noise", nk, E.noise.lvl > 0) + wire("M80 " + (ny + 12) + " L170 84", E.noise.lvl > 0, anyLost(nk));
      if (P.flow && P.flow.ring) svg += box(90, 130, 70, 24, "Ring mod", P.flow.ring, !!(E.ring && E.ring.lvl)) + wire("M160 142 L180 102", !!(E.ring && E.ring.lvl), anyLost(P.flow.ring));
      svg += box(170, 62, 70, 40, "Mixer", id === "moog" ? ["m1", "m2", "m3"] : id === "prophet" ? ["mA", "mB", "mN"] : [], true);
      var fx = 280, hk = P.flow && P.flow.hpf;
      if (hk) { svg += wire("M240 82 L250 82", true, false) + box(250, 62, 44, 40, "HPF", hk, !!(E.hpf && (E.hpf.cut > 0 || E.hpf.boost)));  fx = 304; }
      var fname = { ladder: "Ladder 24 dB", ssi: "SSI 2140", cem: id === "obxa" ? "4-pole 24 dB" : "CEM 3320", diode: "24 dB (diode)", ir3109: "VCF 24 dB", ssm: "SSM 2044", svf: (E.mode || "lp").toUpperCase() + " 12 dB", ms20: "LPF 12 dB" }[E.model] || E.model;
      var fk = id === "moog" || id === "prophet" ? ["cutoff", "emph", "res", "rev"] : P.flow.filter;
      svg += wire("M" + (hk ? 294 : 240) + " 82 L" + fx + " 82", true, false) + box(fx, 62, 76, 40, fname, fk, true);
      var ak = id === "moog" ? ["lA", "lD", "lS"] : id === "prophet" ? ["aA", "aD", "aS", "aR"] : P.flow.aenv;
      svg += wire("M" + (fx + 76) + " 82 L400 82", true, false) + box(400, 62, 60, 40, "Amp", ak, true);
      var outX = 460;
      if (P.flow && P.flow.fx) { svg += wire("M460 82 L470 82", true, false) + box(470, 62, 60, 40, P.flow.fxName || "Chorus", P.flow.fx, !!E.chorus || !!(E.fx && E.fx.length)); outX = 530; }
      svg += wire("M" + outX + " 82 L545 82", true, false) + '<text class="scf-t" x="545" y="96">out</text>';
      var fe = id === "moog" ? ["fA", "fD", "fS", "amount"] : id === "prophet" ? ["fA", "fD", "fS", "fR", "envAmt"] : P.flow.fenv;
      svg += box(fx, 130, 76, 26, id === "ms20" ? "EG 2" : id === "arp2600" ? "ADSR" : "Filter env", fe, true) + wire("M" + (fx + 38) + " 130 L" + (fx + 38) + " 102", E.env !== 0, anyLost(fe));
      svg += box(400, 130, 60, 26, id === "arp2600" ? "AR" : id === "juno" ? "(same)" : "Amp env", ak, true) + wire("M430 130 L430 102", true, false);
      if (id === "moog") {
        svg += box(170, 130, 70, 26, "LFO", ["lfoRate", "lfoSq", "src2"], s.src2 === "lfo");
        var fbOn = E.fb > 0, fbLost = lostSet.extOn || lostSet.ext;
        svg += wire("M500 82 L500 8 L205 8 L205 62", fbOn, fbLost, "scf-fb") + '<text class="scf-t" x="350" y="20">' + (fbOn ? "output fed back to the mixer (" + Math.round(E.fb * 100) + "%)" : "external input (off)") + "</text>";
        E.routes.forEach(function (r) {
          var on = r.src.some(function (x) { return x[1] > 0; }) && (W.wheel > 0), lost = lostSet.oscMod || lostSet.filtMod || lostSet.src1;
          if (r.dst.indexOf("cut") >= 0) svg += wire("M240 143 C260 143 300 120 300 102", on, lost, "scf-mod");
          if (r.dst.indexOf("p0") >= 0) svg += wire("M170 143 C110 143 120 100 80 30", on, lost, "scf-mod") + wire("M170 143 C120 143 120 100 80 62", on, lost, "scf-mod");
        });
        if (E.routes.some(function (r) { return r.src[0][0] === "osc3" && r.src[0][1] > 0; })) svg += wire("M45 94 L45 118 L170 140", true, lostSet.src1, "scf-mod");
      } else {
        var lk = id === "prophet" ? ["lfoFreq", "lfoInit", "lfoSaw", "lfoTri", "lfoSq", "wmMix"] : P.flow.lfo || [];
        if (lk.length) svg += box(170, 130, 70, 26, id === "arp2600" ? "S/H" : id === "ms20" ? "MG" : "LFO", lk, true);
        E.routes.forEach(function (r) {
          var lost = r.id.indexOf("wmPw") === 0 ? lostSet.wmPA || lostSet.wmPB : r.id.indexOf("pm-") === 0 ? (lostSet.pmPA && /-pa$/.test(r.id)) : (P.fc.mods || []).some(function (k) { return lostSet[k]; });
          var s0 = r.src[0][0], from = s0 === "fenv" ? "M" + (fx + 38) + " 156 C" + (fx + 38) + " 168 120 168 " : /^osc|sine|sq/.test(s0) ? "M45 62 C30 62 " : "M170 143 C120 143 ";
          r.dst.forEach(function (d) {
            if (d === "cut") svg += wire((/^osc|sine|sq/.test(s0) ? "M80 62 C200 120 " : s0 === "fenv" ? "M" + (fx + 38) + " 130 C" : "M240 143 C") + (fx + 20) + " 120 " + (fx + 20) + " 102", true, lost, "scf-mod");
            if (d === "p0" || d === "pw0") svg += wire(from + "100 60 80 24", true, lost && d === "pw0", "scf-mod" + (d === "pw0" ? " scf-pw" : ""));
            if (d === "p1" || d === "pw1") svg += wire("M170 143 C120 143 100 90 80 62", true, lost && d === "pw1", "scf-mod" + (d === "pw1" ? " scf-pw" : ""));
            if (d === "p2" || d === "pw2") svg += wire("M170 143 C120 143 100 110 80 100", true, lost, "scf-mod");
            if (d === "hcut" && hk) svg += wire("M240 143 C250 130 272 120 272 102", true, lost, "scf-mod");
            if (d === "wt") svg += wire(from + "60 40 45 38", true, lost, "scf-mod");
          });
        });
        if (E.sync) { var sl = E.sync === true ? 0 : E.sync.slave; svg += wire("M20 " + (sl ? 38 : 52) + " L20 " + (sl ? 52 : 38), true, lostSet.aSync || lostSet.sync, "scf-sync") + '<text class="scf-t" x="24" y="49">sync</text>'; }
        svg += '<text class="scf-t" x="470" y="30">' + (E.voices === 1 ? (E.unison > 1 ? "unison ×" + E.unison : "one voice") : "× " + E.voices + " voices") + "</text>";
      }
      return svg + "</svg>";
    }
    function drawFlows() { [W.a, W.b].forEach(function (id) { if (pan[id]) pan[id].flow.innerHTML = flowSvg(id); }); }
    // ---- the plots ----
    function css(v) { return getComputedStyle(host).getPropertyValue(v).trim() || "#888"; }
    function axes(c, g, xl, yl) {
      var w = c.width, h = c.height; g.clearRect(0, 0, w, h); g.strokeStyle = css("--site-border"); g.lineWidth = 1; g.strokeRect(36, 8, w - 46, h - 32);
      g.fillStyle = css("--site-ink-2"); g.font = "11px sans-serif"; g.fillText(xl, w - 10 - g.measureText(xl).width, h - 6); g.save(); g.translate(11, h / 2 + 20); g.rotate(-Math.PI / 2); g.fillText(yl, 0, 0); g.restore();
    }
    function col(id) { return id === W.a ? css("--scmp-a") : css("--scmp-b"); }
    function draw() {
      drawFlows();
      var g = cvF.getContext("2d"), w = cvF.width, h = cvF.height; axes(cvF, g, "Hz", "dB");
      [100, 1000, 10000].forEach(function (f) { var x = 36 + (Math.log(f / 20) / Math.log(1000)) * (w - 46); g.fillText(f >= 1000 ? f / 1000 + "k" : f, x - 8, h - 12); });
      [W.a, W.b].forEach(function (id) {
        var E = eng(id); g.strokeStyle = col(id); g.lineWidth = 2; g.beginPath();
        for (var x = 0; x <= w - 46; x += 2) { var f = 20 * Math.pow(1000, x / (w - 46)), db = filterResponse(E, f, 60), y = 8 + (12 - Math.max(-60, Math.min(12, db))) / 72 * (h - 32); x ? g.lineTo(36 + x, y) : g.moveTo(36 + x, y); }
        g.stroke();
        g.fillStyle = col(id); g.fillText(PROFILES[id].name + ": " + (E.fm ? "no filter" : (E.slope || 24) + " dB/oct " + (E.mode || "lp").toUpperCase() + (E.hpf && E.hpf.cut > 0 ? " + HPF" : "")), 44, id === W.a ? 22 : 36);
      });
      g = cvE.getContext("2d"); w = cvE.width; h = cvE.height; axes(cvE, g, "seconds (key up at 1)", "level");
      [W.a, W.b].forEach(function (id) {
        var E = eng(id);
        [[E.fenv, 1], [E.aenv, 2.6]].forEach(function (pr) {
          var pts = envPoints(pr[0], 1), T = 3; g.strokeStyle = col(id); g.lineWidth = pr[1]; g.beginPath();
          pts.forEach(function (p, i) { var x = 36 + p[0] / T * (w - 46), y = 8 + (1 - Math.min(1.05, p[1]) / 1.05) * (h - 32); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
        });
      });
      g = cvD.getContext("2d"); w = cvD.width; h = cvD.height; axes(cvD, g, "level into the mixer", "out");
      [W.a, W.b].forEach(function (id) {
        var E = eng(id), lv = E.osc.reduce(function (a, o) { return a + (o.on ? o.lvl : 0); }, 0) * 0.45 + E.noise.lvl * 0.4, fb = E.fb * 3.2;
        g.strokeStyle = col(id); g.lineWidth = 2; g.beginPath();
        for (var x = 0; x <= w - 46; x += 2) {
          var u = (x / (w - 46) * 2 - 1) * Math.max(lv, 0.1) * 1.6, y0 = 0;
          for (var it = 0; it < 12; it++) y0 = Math.tanh((u + fb * y0 * 0.5) * 1.1) * 0.9;
          var y = 8 + (1 - (y0 + 1) / 2) * (h - 32); x ? g.lineTo(36 + x, y) : g.moveTo(36 + x, y);
        }
        g.stroke();
      });
      g.fillStyle = css("--site-ink-2"); g.fillText("straight = clean; bent flat at the top = overloaded", 44, 22);
    }
    var raf = 0;
    function live() {
      raf = requestAnimationFrame(live);
      var g = cvS.getContext("2d"), w = cvS.width, h = cvS.height; g.clearRect(0, 0, w, h);
      g.strokeStyle = css("--site-border"); g.strokeRect(0.5, 0.5, w / 2 - 6, h - 1); g.strokeRect(w / 2 + 0.5, 0.5, w / 2 - 1, h - 1);
      [W.a, W.b].forEach(function (id) {
        var a = ana[id]; if (!a) return; var d = new Float32Array(1024); a.getFloatTimeDomainData(d);
        var st = 0; for (var i = 1; i < 512; i++) if (d[i - 1] < 0 && d[i] >= 0) { st = i; break; }
        g.strokeStyle = col(id); g.lineWidth = 1.5; g.beginPath();
        for (i = 0; i < 400; i++) { var x = i / 400 * (w / 2 - 8), y = h / 2 - d[st + i] * h * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        var f = new Float32Array(a.frequencyBinCount); a.getFloatFrequencyData(f); g.beginPath();
        for (i = 0; i <= 300; i++) { var fr = 30 * Math.pow(16000 / 30, i / 300), bin = Math.round(fr / (ctx.sampleRate / 2) * f.length), db = f[bin] || -140; x = w / 2 + 2 + i / 300 * (w / 2 - 6); y = h - 4 - (Math.max(-110, db) + 110) / 110 * (h - 8); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      });
    }
    // ---- sound ----
    function begin(ids) {
      return audio().then(function () {
        (ids || [W.a, W.b]).concat([W.a, W.b]).forEach(function (id) { node(id); push(id); send(id, { type: "wheel", v: W.wheel }); });
        if (ctx.state !== "running") ctx.resume(); if (!raf) live();
      });
    }
    W.noteOn = function (n, vel) { begin().then(function () { send(W.hear, { type: "on", note: n, vel: vel == null ? 0.8 : vel }); if (keyEls[n]) keyEls[n].classList.add("scmp-down"); }); };
    W.noteOff = function (n) { Object.keys(nodes).forEach(function (id) { send(id, { type: "off", note: n }); }); if (keyEls[n]) keyEls[n].classList.remove("scmp-down"); };
    W.stop = function () { W.timers.forEach(clearTimeout); W.timers = []; Object.keys(nodes).forEach(function (id) { send(id, { type: "panic" }); }); for (var k in keyEls) keyEls[k].classList.remove("scmp-down"); [bA, bB, bAB].forEach(function (b) { b.classList.remove("scmp-playing"); }); };
    W.phrase = function (ids) {
      W.stop();
      return begin(ids).then(function () {
        var ex = W.ex, beat = 60 / (ex.bpm || 100) * 1000, len = 0, t0 = 0;
        ex.phrase.forEach(function (p) { len = Math.max(len, p[1] + p[2]); });
        var sh = W.exShift(ex.phrase), phr = ex.phrase.map(function (p) { return [p[0] + sh].concat(p.slice(1)); });
        ids.forEach(function (id) {
          var btn = ids.length > 1 ? bAB : id === W.a ? bA : bB;
          W.timers.push(setTimeout(function () { btn.classList.add("scmp-playing"); [W.a, W.b].forEach(function (x) { if (pan[x]) pan[x].box.classList.toggle("scmp-live", x === id); }); }, t0));
          phr.forEach(function (p) {
            var fl = p[3] || "", vel = /a/.test(fl) ? 1 : 0.8, off = (p[1] + p[2] + (/s/.test(fl) ? 0.08 : 0)) * beat - (/s/.test(fl) ? 0 : 15);
            W.timers.push(setTimeout(function () { send(id, { type: "on", note: p[0], vel: vel }); if (keyEls[p[0]]) keyEls[p[0]].classList.add("scmp-down"); }, t0 + p[1] * beat));
            W.timers.push(setTimeout(function () { send(id, { type: "off", note: p[0] }); if (keyEls[p[0]]) keyEls[p[0]].classList.remove("scmp-down"); }, t0 + off));
          });
          t0 += (len + 0.8) * beat;
          W.timers.push(setTimeout(function () { btn.classList.remove("scmp-playing"); if (pan[id]) pan[id].box.classList.remove("scmp-live"); }, t0 - 0.4 * beat));
        });
        return t0;
      });
    };
    bA.onclick = function () { W.phrase([W.a]); }; bB.onclick = function () { W.phrase([W.b]); };
    bAB.onclick = function () { W.phrase([W.from, other(W.from)]); }; bStop.onclick = W.stop;
    wheelR.oninput = function () { W.wheel = +wheelR.value; Object.keys(nodes).forEach(function (id) { send(id, { type: "wheel", v: W.wheel }); }); drawFlows(); };
    function setHear(id) { W.hear = id; [W.a, W.b].forEach(function (x) { if (!pan[x]) return; pan[x].hear.classList.toggle("scmp-on", x === id); pan[x].hear.textContent = x === id ? "Keys play this ✓" : "Keys play this"; }); }
    W.load = function (exId) {
      var ex = SC.EXAMPLES.filter(function (x) { return x.id === exId; })[0] || SC.EXAMPLES[0]; W.ex = ex; exSel.value = ex.id;
      W.st[ex.from] = full(ex.from, ex.s);
      // the partner: the example's own `to`, else the Model D / Prophet-5 pair for their examples, else whatever "To" was
      var to = ex.to || (ex.from === "moog" ? "prophet" : ex.from === "prophet" ? "moog" : W.b !== ex.from ? W.b : W.a);
      if (to === ex.from) to = ex.from === "moog" ? "prophet" : "moog";
      W.a = ex.from; W.b = to;
      buildPanels(); push(ex.from);
      W.wheel = ex.wheel || 0; wheelR.value = W.wheel; Object.keys(nodes).forEach(function (id) { send(id, { type: "wheel", v: W.wheel }); });
      say.textContent = ex.say + (ex.src ? " (" + ex.src + ".)" : "");
      translate(ex.from, true); setHear(ex.from);
    };
    exSel.onchange = function () { W.stop(); W.load(exSel.value); };
    // keys
    var KEYS = "awsedftgyhujk", oct = 0;
    function typing(e) { var t = e.target; return t && (t.tagName === "INPUT" && t.type !== "range" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable); }
    document.addEventListener("keydown", function (e) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      if (e.key === "z") { oct = Math.max(-3, oct - 1); return; } if (e.key === "x") { oct = Math.min(3, oct + 1); return; }
      var i = KEYS.indexOf(e.key); if (i < 0) return; if (!host.getBoundingClientRect().height) return; e.preventDefault(); W.noteOn(60 + i + oct * 12);
    });
    document.addEventListener("keyup", function (e) { var i = KEYS.indexOf(e.key); if (i >= 0) W.noteOff(60 + i + oct * 12); });
    var downKey = null;
    kb.addEventListener("pointerdown", function (e) { var k = e.target.closest(".scmp-key"); if (!k) return; downKey = +k.dataset.n; W.noteOn(downKey); kb.setPointerCapture(e.pointerId); });
    kb.addEventListener("pointerup", function () { if (downKey != null) W.noteOff(downKey); downKey = null; });
    midiB.onclick = function () {
      if (!navigator.requestMIDIAccess) { midiB.textContent = "No MIDI in this browser"; return; }
      navigator.requestMIDIAccess().then(function (a) {
        var n = 0; a.inputs.forEach(function (inp) { n++; inp.onmidimessage = function (m) { var d = m.data, t = d[0] & 0xf0;
          if (t === 0x90 && d[2]) W.noteOn(d[1], d[2] / 127); else if (t === 0x80 || (t === 0x90 && !d[2])) W.noteOff(d[1]);
          else if (t === 0xb0 && d[1] === 1) { wheelR.value = d[2] / 127; wheelR.oninput(); } }; });
        midiB.textContent = n ? "MIDI: " + n + " input" + (n > 1 ? "s" : "") : "No MIDI inputs";
      }, function () { midiB.textContent = "MIDI refused"; });
    };
    W.load(SC.EXAMPLES[0].id);
    W.translate = translate; W.set = set; W.begin = begin; W.analyser = function (id) { return ana[id]; };
    return W;
  };

  SC.widgets = [];
  function init() { if (typeof document === "undefined") return; document.querySelectorAll("div.scmp:not(.scmp-w)").forEach(function (d) { SC.widgets.push(SC.mount(d)); }); }
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
  global.SynthCompare = SC;
  if (typeof module !== "undefined" && module.exports) module.exports = SC;
})(typeof window !== "undefined" ? window : globalThis);
