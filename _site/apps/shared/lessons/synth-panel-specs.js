// SynthPanel specs for every SynthCompare profile besides the Model D (whose spec is in synth-panel.js). Load after
// synth-compare.js and synth-panel.js. Each spec is written in a short layout (L below) and filled from the profile's own
// groups, so keys, ranges and steps are always the profile's: a layout item is "key" | "key*" (adv: hidden in Beginner) |
// "key:Label" | "key@icon" (a toggle drawn as a wave picture, label empty) | { group, adv, items: [...] }.
// A select whose options are all wave names becomes wave pictures (extra icons added to SynthPanel.WAVES here).
// Pictures: "env:A,D,S[,R]" reads the keys as 0-10 knobs on Model D time ranges (schematic); synths on other scales
// (PPG 0-63, DX7 rates/levels 0-99) get a text summary instead. "filter" reads `cutoff` + `emph` 0-10: profiles that call
// resonance `res` get the curve without its bump (follow-up: a key map in the renderer); other cutoff names get a summary.
// Toggle-wave icons: SynthPanel.mount is wrapped here to swap the text of toggles that carry `icon` for the wave picture
// (the renderer builds toggles in spec order, so the n-th .sp-tog is the n-th toggle item).
(function () {
  var SP = window.SynthPanel; if (!SP) return;
  function pulse(d) { var a = 3 + 11 * d, b = 14 + 11 * d; return "M3 13V3H" + a + "V13H14V3H" + b + "V13H25"; }
  var X = { pulse: pulse(0.25), ramp: SP.WAVES.saw, sawup: SP.WAVES.saw, sawdown: SP.WAVES.rsaw,
    sh: "M3 10H7V4H11V12H15V6H19V11H23V5H25", random: "M3 10H7V4H11V12H15V6H19V11H23V5H25",
    ring: "M3 8C4 3 5 3 6 8S8 13 9 8 11 2 14 8 17 14 19 8 21 3 22 8 24 12 25 8" };
  for (var x in X) if (!SP.WAVES[x]) SP.WAVES[x] = X[x];
  var NAMES = { tri: "triangle", saw: "sawtooth", rsaw: "reverse sawtooth", square: "square", pulse: "pulse", narrow: "narrow pulse",
    sine: "sine", noise: "noise", ramp: "ramp", sawup: "saw up", sawdown: "saw down", sh: "sample and hold", random: "random", ring: "ring mod", trisaw: "triangle-saw", wide: "wide pulse" };


  function build() {
    var SC = window.SynthCompare; if (!SC || !SC.PROFILES) return false;
    function expMap(k, lo, hi) { return lo * Math.pow(hi / lo, Math.max(0, Math.min(10, k)) / 10); }
    function hz(v) { var f = expMap(v, 10, 20000); return f < 1000 ? Math.round(f) + " Hz" : (f / 1000).toFixed(1) + " kHz"; }
    function make(id, L) {
      var P = SC.PROFILES[id]; if (!P) return; var C = {};
      P.groups.forEach(function (g) { g[2].forEach(function (c) { C[c[0]] = c; }); });
      function item(t) {
        if (typeof t !== "string") { var g = {}; for (var q in t) g[q] = t[q]; g.items = t.items.map(item); return g; }
        var adv = /\*$/.test(t); t = t.replace(/\*$/, ""); var ic = t.split("@"), lab = ic[0].split(":"), k = lab[0], c = C[k];
        if (!c) throw new Error("SynthPanel spec " + id + ": no control " + k);
        var o = { k: k, label: lab[1] || c[1], adv: adv };
        if (c[2] === "k") { o.kind = "slider"; o.min = c[3]; o.max = c[4]; o.step = c[5]; if (k === "cutoff" && c[4] === 10) o.fmt = hz;
          if (P.hint && P.hint(k, c[3]) !== "") o.fmt = function (v) { return P.hint(k, v); }; }   // Vital / Surge XT: the plug-in's own reading
        else if (c[2] === "s") { o.kind = "toggle"; if (ic[1]) { o.icon = ic[1]; o.iconName = NAMES[ic[1]] || ic[1]; o.label = ""; } }
        else if (c[2] === "sel") { var wv = c[3].every(function (v) { return SP.WAVES[v]; });
          o.kind = wv ? "waves" : "choice"; o.opts = c[3].map(function (v) { return wv ? [v, v, NAMES[v] || v] : [v, v]; }); }
        return o;
      }
      SP.SPECS[id] = { modules: L.map(function (m) { var o = {}; for (var q in m) o[q] = m[q]; o.items = m.items.map(item); return o; }) };
    }
    function on(list) { return function (s) { var w = list.filter(function (p) { return s[p[0]]; }).map(function (p) { return p[1]; }); return w.length ? w.join(" + ") : "off"; }; }
    function adsr(a, d, s_, r) { return function (s) { return "A " + s[a] + " · D " + s[d] + " · S " + s[s_] + (r ? " · R " + s[r] : ""); }; }

    make("prophet", [
      { id: "ctl", name: "Poly Mod & LFO", adv: true, sum: function (s) { return "LFO " + s.lfoFreq + " · amount " + s.lfoInit; }, items: [
        { group: "LFO", items: ["lfoFreq", "lfoInit", "lfoSaw@saw", "lfoTri@tri", "lfoSq@square", "wmMix", "wmFA", "wmFB", "wmPA", "wmPB", "wmF"] },
        { group: "Poly Mod", items: ["pmFenv", "pmOscB", "pmFA", "pmPA", "pmF"] }] },
      { id: "osc", name: "Oscillators", sum: on([["aSaw", "A saw"], ["aPulse", "A pulse"], ["bSaw", "B saw"], ["bTri", "B tri"], ["bPulse", "B pulse"]]), items: [
        { group: "Osc A", items: ["aSaw@saw", "aPulse@square", "aFreq*", "aPw*", "aSync*"] },
        { group: "Osc B", adv: true, items: ["bSaw@saw", "bTri@tri", "bPulse@square", "bFreq", "bFine", "bPw", "bLo", "bKbd"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "A " + s.mA + " · B " + s.mB + " · noise " + s.mN; }, items: ["mA", "mB*", "mN*"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["cutoff", "res", "envAmt", "kbd*", "rev*"] },
      { id: "fenv", name: "Filter envelope", pic: "env:fA,fD,fS,fR", items: ["fA:Attack", "fD:Decay", "fS:Sustain", "fR:Release", "velF*"] },
      { id: "aenv", name: "Amp envelope", pic: "env:aA,aD,aS,aR", items: ["aA:Attack", "aD:Decay", "aS:Sustain", "aR:Release", "velA*"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol", "glide*", "uni*", "uniN*", "uniDet*", "rel*", "vintage*", "bend*"] }]);

    make("juno", [
      { id: "lfo", name: "LFO", adv: true, sum: function (s) { return "rate " + s.lfoRate; }, items: ["lfoRate", "lfoDelay"] },
      { id: "osc", name: "DCO", sum: on([["saw", "saw"], ["pulse", "pulse"], ["sub", "sub"]]), items: ["saw@saw", "pulse@square", "range*", "pwm*", "pwmMode*", "dLfo*"] },
      { id: "mix", name: "Mixer", sum: function (s) { return "sub " + s.subLvl + " · noise " + s.noise; }, items: ["sub@square", "subLvl", "noise*"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["hpf*", "cutoff", "res", "env:Envelope amount", "envPol*", "fLfo*", "kybd*"] },
      { id: "aenv", name: "Envelope (filter and amp)", pic: "env:a,d,s,r", items: ["a:Attack", "d:Decay", "s:Sustain", "r:Release", "vcaMode*"] },
      { id: "fx", name: "Chorus", adv: true, sum: function (s) { return "chorus " + s.chorus; }, items: ["chorus", "model", "porta"] },
      { id: "out", name: "Output", sum: function (s) { return "level " + s.vcaLvl; }, items: ["vcaLvl"] }]);

    make("tb303", [
      { id: "osc", name: "Oscillator", pic: "osc", oscs: [{ wave: "wave" }], items: ["wave", "tune*"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["cutoff", "res", "envMod"] },
      { id: "fenv", name: "Envelope", sum: function (s) { return "decay " + s.decay + " · accent " + s.accent; }, items: ["decay", "accent*"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol"] }]);

    make("obxa", [
      { id: "ctl", name: "Modulation", adv: true, sum: function (s) { return "LFO " + s.lfoRate; }, items: ["lfoRate", "lSine@sine", "lSq@square", "lSH@sh", "fmDepth", "fmO1", "fmO2", "fmF", "pwDepth", "pwO1", "pwO2"] },
      { id: "osc", name: "Oscillators", sum: on([["o1Saw", "1 saw"], ["o1Pulse", "1 pulse"], ["o2Saw", "2 saw"], ["o2Pulse", "2 pulse"]]), items: [
        { group: "Osc 1", items: ["o1Saw@saw", "o1Pulse@square", "o1Freq*", "pw*", "sync*"] },
        { group: "Osc 2", adv: true, items: ["o2Saw@saw", "o2Pulse@square", "o2Freq", "o2Det", "fEnvO2"] }] },
      { id: "mix", name: "Mixer (into the filter)", adv: true, sum: on([["fO1", "osc 1"], ["fNoise", "noise"]]), items: ["fO1", "fO2", "fNoise"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["cutoff", "res", "fMod:Envelope amount", "pole4*", "track*", "sem*"] },
      { id: "fenv", name: "Filter envelope", pic: "env:fA,fD,fS,fR", items: ["fA", "fD", "fS", "fR"] },
      { id: "aenv", name: "Loudness envelope", pic: "env:lA,lD,lS,lR", items: ["lA", "lD", "lS", "lR"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol", "uni*", "porta*"] }]);

    make("ms20", [
      { id: "ctl", name: "MG (LFO)", adv: true, sum: function (s) { return "rate " + s.mgFreq; }, items: ["mgWave", "mgFreq", "porta", "fmMg", "fmEg1"] },
      { id: "osc", name: "Oscillators", pic: "osc", oscs: [{ lvl: "l1", wave: "w1" }, { lvl: "l2", wave: "w2" }], items: [
        { group: "VCO-1", items: ["w1", "s1*", "pw1*"] }, { group: "VCO-2", adv: true, items: ["w2", "s2", "pitch2"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "1: " + s.l1 + " · 2: " + s.l2; }, items: ["l1", "l2*"] },
      { id: "hp", name: "High-pass filter", adv: true, sum: function (s) { return "cutoff " + s.hCut + " · peak " + s.hPeak; }, items: ["hCut", "hPeak", "hMg", "hEg2"] },
      { id: "flt", name: "Low-pass filter", sum: function (s) { return "cutoff " + s.lCut + " · peak " + s.lPeak; }, items: ["lCut", "lPeak", "lEg2:Envelope amount", "lMg*"] },
      { id: "fenv", name: "EG 1", adv: true, sum: function (s) { return "D " + s.e1D + " · A " + s.e1A + " · R " + s.e1R; }, items: ["e1D", "e1A", "e1R"] },
      { id: "aenv", name: "EG 2 (filter and amp)", pic: "env:e2A,e2D,e2S,e2R", items: ["e2A", "e2D", "e2S", "e2R", "e2H*"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol"] }]);

    make("arp2600", [
      { id: "osc", name: "Oscillators", sum: function (s) { return "VCO-1 " + s.f1 + " st"; }, items: [
        { group: "VCO-1", items: ["f1", "fine1*", "kb1*", "v1sh*", "v1adsr*", "v1sin2*"] },
        { group: "VCO-2", adv: true, items: ["f2", "fine2", "pw2", "kb2", "v2sh", "v2adsr", "v2sq1", "v2pwm"] },
        { group: "VCO-3", adv: true, items: ["f3", "fine3", "pw3", "kb3", "v3noise", "v3adsr", "v3sin2"] }] },
      { id: "mix", name: "Into the filter", sum: function (s) { return "VCO-1 " + s.inV1 + " · VCO-2 " + s.inV2 + " · VCO-3 " + s.inV3; }, items: ["inV1", "inV2*", "inV3*", "inN*", "inRing*", "nCol*", "shRate*"] },
      { id: "flt", name: "Filter", sum: function (s) { return "freq " + s.cut + " · res " + s.res; }, items: ["cut", "res", "fAdsr:Envelope amount", "fSin2*", "type*"] },
      { id: "aenv", name: "ADSR", pic: "env:aA,aD,aS,aR", items: ["aA", "aD", "aS", "aR"] },
      { id: "ar", name: "AR", adv: true, sum: function (s) { return "A " + s.arA + " · R " + s.arR; }, items: ["arA", "arR"] },
      { id: "out", name: "VCA and output", sum: function (s) { return "volume " + s.vol; }, items: ["vAdsr", "vol", "gain*", "vAr*"] }]);

    var dxops = []; for (var n = 1; n <= 6; n++) { var p = "o" + n;
      dxops.push({ id: "op" + n, name: "Operator " + n, adv: n > 1, sum: (function (p) { return function (s) { return "×" + s[p + "c"] + " · level " + s[p + "l"]; }; })(p),
        items: [p + "l", p + "c", p + "f*", p + "d*", { group: "Envelope", adv: true, items: [p + "r1", p + "r2", p + "r3", p + "r4", p + "l1", p + "l2", p + "l3", p + "l4"] }] }); }
    make("dx7", [{ id: "ctl", name: "Voice", sum: function (s) { return "algorithm " + s.alg; }, items: ["alg", "fb*", "lfoSpeed*", "lfoWave*", "pmd*"] }]
      .concat(dxops, [{ id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol"] }]));

    make("ppg", [
      { id: "lfo", name: "LFO", adv: true, sum: function (s) { return "rate " + s.lfoRate; }, items: ["lfoRate", "lfoDelay", "lfoShape", "lfoPitch", "lfoWave"] },
      { id: "osc", name: "Wavetable oscillators", sum: function (s) { return s.table + " · wave " + s.waveA; }, items: ["table", "waveA", "envWave", { group: "Osc B", adv: true, items: ["waveB", "semiB", "detB", "mixB"] }] },
      { id: "flt", name: "Filter", sum: function (s) { return "cutoff " + s.cutoff + "/63 · emphasis " + s.emph; }, items: ["cutoff", "emph", "envF", "kbdF*"] },
      { id: "fenv", name: "Envelope 1", sum: adsr("e1A", "e1D", "e1S", "e1R"), items: ["e1A", "e1D", "e1S", "e1R"] },
      { id: "aenv", name: "VCA envelope", sum: adsr("e2A", "e2D", "e2S", "e2R"), items: ["e2A", "e2D", "e2S", "e2R"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol"] }]);

    make("p6", [
      { id: "ctl", name: "LFO & Poly Mod", adv: true, sum: function (s) { return "LFO " + s.lfoFreq + " · " + s.lfoShape; }, items: [
        { group: "LFO", items: ["lfoFreq", "lfoInit", "lfoShape", "lfF1", "lfF2", "lfPw", "lfAmp", "lfLp", "lfHp"] },
        { group: "Poly Mod", items: ["pmFenv", "pmOsc2", "pmF1", "pmSh1", "pmPw1", "pmLp", "pmHp"] }] },
      { id: "osc", name: "Oscillators", sum: function (s) { return "shape " + s.o1Shape + (s.m2 > 0 ? " + " + s.o2Shape : ""); }, items: [
        { group: "Osc 1", items: ["o1Shape:Shape (tri ↔ saw ↔ pulse)", "o1Freq*", "o1Pw*", "sync*"] },
        { group: "Osc 2", adv: true, items: ["o2Shape", "o2Freq", "o2Fine", "o2Pw", "o2Lo", "o2Kbd", "slop"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "1: " + s.m1 + " · 2: " + s.m2; }, items: ["m1", "m2*", "mSub*", "mN*"] },
      { id: "hp", name: "High-pass filter", adv: true, sum: function (s) { return "cutoff " + s.hCut; }, items: ["hCut", "hRes", "hEnv", "hVel", "hKbd"] },
      { id: "flt", name: "Low-pass filter", sum: function (s) { return "cutoff " + s.lCut + " · res " + s.lRes; }, items: ["lCut", "lRes", "lEnv:Envelope amount", "lVel*", "lKbd*"] },
      { id: "fenv", name: "Filter envelope", pic: "env:fA,fD,fS,fR", items: ["fA:Attack", "fD:Decay", "fS:Sustain", "fR:Release"] },
      { id: "aenv", name: "Amp envelope", pic: "env:aA,aD,aS,aR", items: ["aA:Attack", "aD:Decay", "aS:Sustain", "aR:Release", "aAmt*", "aVel*"] },
      { id: "fx", name: "Effects", adv: true, sum: function (s) { return s.fxOn ? s.fxA + " + " + s.fxB : "off"; }, items: ["fxOn", "fxA", "aP1", "aP2", "aMix", "fxB", "bP1", "bP2", "bMix", "dist"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol", "glide*", "uni*", "uniN*"] }]);

    make("taurus", [
      { id: "osc", name: "Tone sources", sum: function (s) { return s.range; }, items: ["range", "mixB*", "bFreq*", "beat*"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["cutoff", "emph", "cAmt"] },
      { id: "fenv", name: "Filter contour", sum: function (s) { return "A " + s.cA + " · D " + s.cD; }, items: ["cA", "cD"] },
      { id: "aenv", name: "Loudness", sum: function (s) { return "A " + s.lA + " · D " + s.lD + " · S " + s.lS; }, items: ["lA", "lD", "lS", "decaySw*"] },
      { id: "out", name: "Output", sum: function (s) { return "loudness " + s.vol; }, items: ["vol", "glideOn*", "glide*"] }]);

    var moogLike = function (id, extra) { var o = extra; make(id, o); };
    moogLike("voyager", [
      { id: "ctl", name: "Modulation", adv: true, sum: function (s) { return s.modSrc + " → " + s.modDst; }, items: ["lfoRate", "modSrc", "modDst", "modAmt", "glideOn", "glide"] },
      { id: "osc", name: "Oscillators", sum: function (s) { return "wave " + s.o1Wave; }, items: [
        { group: "Osc 1", items: ["o1Wave:Wave (tri ↔ saw ↔ square ↔ pulse)", "o1Oct*"] },
        { group: "Osc 2", adv: true, items: ["o2Wave", "o2Oct", "o2Freq", "sync"] },
        { group: "Osc 3", adv: true, items: ["o3Wave", "o3Oct", "o3Freq", "o3Kbd", "linFm"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "1: " + s.m1 + " · 2: " + s.m2 + " · 3: " + s.m3; }, items: ["m1", "m2*", "m3*", "mN*", "ext*"] },
      { id: "flt", name: "Filters", pic: "filter", items: ["cutoff", "res", "fAmt", "mode*", "space*", "kbd*"] },
      { id: "fenv", name: "Filter envelope", pic: "env:fA,fD,fS,fR", items: ["fA:Attack", "fD:Decay", "fS:Sustain", "fR:Release"] },
      { id: "aenv", name: "Amp envelope", pic: "env:aA,aD,aS,aR", items: ["aA:Attack", "aD:Decay", "aS:Sustain", "aR:Release"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol"] }]);

    make("sub37", [
      { id: "ctl", name: "Modulation", adv: true, sum: function (s) { return "LFO " + s.lfoRate + " · " + s.lfoWave; }, items: ["lfoRate", "lfoWave", "pAmt", "cAmt", "wAmt", "glide"] },
      { id: "osc", name: "Oscillators", sum: function (s) { return "wave " + s.o1Wave; }, items: [
        { group: "Osc 1", items: ["o1Wave:Wave (tri ↔ saw ↔ square ↔ pulse)", "o1Oct*"] },
        { group: "Osc 2", adv: true, items: ["o2Wave", "o2Oct", "o2Freq", "sync", "duo"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "1: " + s.m1 + " · 2: " + s.m2; }, items: ["m1", "m2*", "mSub*", "mN*"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["cutoff", "res", "fAmt", "drive*", "kbd*"] },
      { id: "fenv", name: "Filter envelope", pic: "env:fA,fD,fS,fR", items: ["fA:Attack", "fD:Decay", "fS:Sustain", "fR:Release"] },
      { id: "aenv", name: "Amp envelope", pic: "env:aA,aD,aS,aR", items: ["aA:Attack", "aD:Decay", "aS:Sustain", "aR:Release"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol"] }]);

    make("grandmother", [
      { id: "ctl", name: "Modulation", adv: true, sum: function (s) { return "rate " + s.rate + " · " + s.lfoWave; }, items: ["rate", "lfoWave", "pAmt", "cAmt", "pwAmt", "glide"] },
      { id: "osc", name: "Oscillators", pic: "osc", oscs: [{ lvl: "m1", wave: "o1Wave" }, { lvl: "m2", wave: "o2Wave" }], items: [
        { group: "Osc 1", items: ["o1Wave", "o1Oct*"] }, { group: "Osc 2", adv: true, items: ["o2Wave", "o2Oct", "o2Freq", "sync"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "1: " + s.m1 + " · 2: " + s.m2 + " · noise " + s.mN; }, items: ["m1", "m2*", "mN*"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["cutoff", "res", "envAmt", "kbd*", "hpOn*", "hpCut*"] },
      { id: "aenv", name: "Envelope", pic: "env:a,d,s,r", items: ["a:Attack", "d:Decay", "s:Sustain", "r:Release", "vca*"] },
      { id: "fx", name: "Spring reverb", adv: true, sum: function (s) { return "mix " + s.rev; }, items: ["rev"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol"] }]);

    make("memorymoog", [
      { id: "ctl", name: "Modulation", adv: true, sum: function (s) { return "LFO " + s.lfoRate + " · " + s.lfoWave; }, items: [
        { group: "LFO", items: ["lfoRate", "lfoWave", "modAmt", "lO1", "lO2", "lO3", "lPw", "lF"] },
        { group: "Voice mod", items: ["vmO3", "vmF", "vO1", "vO2", "vPw", "vF"] }] },
      { id: "osc", name: "Oscillators", sum: on([["o1Saw", "1 saw"], ["o1Tri", "1 tri"], ["o1Pulse", "1 pulse"], ["o2Saw", "2 saw"], ["o3Saw", "3 saw"]]), items: [
        { group: "Osc 1", items: ["o1Saw@saw", "o1Tri@tri", "o1Pulse@square", "o1Oct*", "pw1*"] },
        { group: "Osc 2", adv: true, items: ["o2Saw@saw", "o2Tri@tri", "o2Pulse@square", "o2Oct", "o2Freq", "pw2", "sync"] },
        { group: "Osc 3", adv: true, items: ["o3Saw@saw", "o3Tri@tri", "o3Pulse@square", "o3Oct", "o3Freq", "o3Low", "o3Kbd"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "1: " + s.m1 + " · 2: " + s.m2 + " · 3: " + s.m3; }, items: ["m1", "m2*", "m3*", "mN*"] },
      { id: "flt", name: "Filter", pic: "filter", items: ["cutoff", "emph", "cAmt", "kb1*", "kb2*"] },
      { id: "fenv", name: "Filter contour", pic: "env:fA,fD,fS,fR", items: ["fA:Attack", "fD:Decay", "fS:Sustain", "fR:Release"] },
      { id: "aenv", name: "Loudness contour", pic: "env:lA,lD,lS,lR", items: ["lA:Attack", "lD:Decay", "lS:Sustain", "lR:Release"] },
      { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: ["vol", "mono*", "glideOn*", "glide*"] }]);
    // Vital and Surge XT: beginner panels; the readings shown are the real plug-ins' (laws unverified: synth-compare.js "TWO FREE SOFTWARE SYNTHS")
    function hzOf(s) { return SC.PROFILES[s].hint; }
    make("vital", [
      { id: "osc", name: "Oscillators", sum: function (s) { var h = hzOf("vital"); return [1, 2, 3].filter(function (n) { return s["o" + n + "On"]; }).map(function (n) { return n + ": " + h("o" + n + "Frame", s["o" + n + "Frame"]); }).join(" · ") || "off"; }, items: [
        { group: "Osc 1", items: ["o1On", "o1Frame", "o1Lvl", "o1Tr*", "o1Tune*"] },
        { group: "Osc 2", adv: true, items: ["o2On", "o2Frame", "o2Lvl", "o2Tr", "o2Tune"] },
        { group: "Osc 3", adv: true, items: ["o3On", "o3Frame", "o3Lvl", "o3Tr", "o3Tune"] },
        { group: "Sample (noise)", adv: true, items: ["smpOn", "smp"] }] },
      { id: "flt", name: "Filter 1", sum: function (s) { return s.fStyle + " · " + hzOf("vital")("cut", s.cut) + " · res " + s.res + "%"; }, items: ["cut", "res", "fStyle", "fBlend*", "fModel*", "drive*", "key*"] },
      { id: "aenv", name: "Envelope 1 (amp)", sum: function (s) { var h = hzOf("vital"); return "A " + h("e1A", s.e1A) + " · D " + h("e1D", s.e1D) + " · S " + s.e1S + "% · R " + h("e1R", s.e1R); }, items: ["e1A", "e1D", "e1S", "e1R"] },
      { id: "fenv", name: "Envelope 2", sum: function (s) { return "→ cutoff " + s.e2Cut + " st · → frame " + s.e2Frame; }, items: ["e2Cut", "e2Frame*", "e2A", "e2D", "e2S", "e2R"] },
      { id: "lfo", name: "LFO 1", adv: true, sum: function (s) { return s.lfoShape + " · " + hzOf("vital")("lfoRate", s.lfoRate); }, items: ["lfoShape", "lfoRate", "lfoPitch", "lfoCut", "lfoFrame"] },
      { id: "fx", name: "Effects", adv: true, sum: function (s) { return "chorus " + s.fxCho + " · delay " + s.fxDly + " · reverb " + s.fxRev; }, items: ["fxCho", "fxDly", "fxRev"] },
      { id: "out", name: "Voice", sum: function (s) { return s.poly + " voices · volume " + s.vol + "%"; }, items: ["vol", "poly*", "uni*", "glide*"] }]);
    make("surge", [
      { id: "osc", name: "Oscillators (Classic)", sum: function (s) { var h = hzOf("surge"); return "1: " + h("o1Shape", s.o1Shape) + (s.m2 > 0 ? " · 2: " + h("o2Shape", s.o2Shape) : ""); }, items: [
        { group: "Osc 1", items: ["o1Shape", "o1W", "o1Sub", "o1Oct*", "o1Pitch*"] },
        { group: "Osc 2", adv: true, items: ["o2Shape", "o2W", "o2Oct", "o2Pitch", "o2Kbd"] }] },
      { id: "mix", name: "Mixer", sum: function (s) { return "1: " + s.m1 + "% · 2: " + s.m2 + "% · noise " + s.n + "%"; }, items: ["m1", "m2*", "r12*", "n*"] },
      { id: "flt", name: "Filter 1", sum: function (s) { return s.fType + " · " + hzOf("surge")("cut", s.cut) + " · res " + s.res + "%"; }, items: ["fType", "cut", "res", "feg", "key*"] },
      { id: "fenv", name: "Filter EG", sum: function (s) { var h = hzOf("surge"); return "A " + h("fA", s.fA) + " · D " + h("fD", s.fD) + " · S " + s.fS + "%"; }, items: ["fA", "fD", "fS", "fR"] },
      { id: "aenv", name: "Amp EG", sum: function (s) { var h = hzOf("surge"); return "A " + h("aA", s.aA) + " · D " + h("aD", s.aD) + " · S " + s.aS + "%"; }, items: ["aA", "aD", "aS", "aR"] },
      { id: "lfo", name: "LFO 1", adv: true, sum: function (s) { return s.lfoShape + " · " + hzOf("surge")("lfoRate", s.lfoRate); }, items: ["lfoShape", "lfoRate", "lfoPitch", "lfoCut", "lfoW"] },
      { id: "fx", name: "Effects", adv: true, sum: function (s) { return "chorus " + s.fxCho + " · delay " + s.fxDly + " · reverb " + s.fxRev; }, items: ["fxCho", "fxDly", "fxRev"] },
      { id: "out", name: "Scene", sum: function (s) { return s.play + " · volume " + s.vol + "%"; }, items: ["vol", "play", "uni*", "glide*", "bend*"] }]);
    return true;
  }
  if (!build()) window.addEventListener("load", build);
})();
