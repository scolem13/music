// ARP 2600 patches from its 1971 owner's manual, as starting patches (global ArpSheets), after prophet-sheets.js / model-d.js.
// Load after synth-compare.js; each sheet is added to SynthCompare.EXAMPLES (from: "arp2600", id "a26-<id>", flag arpSheet), so it
// is offered in the "Example" picker wherever the ARP 2600 panel is (lessons/intro-arp-2600.qmd, lessons/synth-compare.qmd), with
// its fit report under the example's text.
//
// SOURCES. ARP Instruments, *ARP 2600 Owner's Manual* (1971; ~/Documents/Manuals/synths/new/arp2600-original.pdf / .txt), chapter 5
// ("the classic patch and its extensions", sections 5.1-5.15). Its patch pages are block diagrams and a few face-panel drawings; the
// drawings are too small in the scan to read slider positions, so every setting here comes from the TEXT, which says what to open
// and often how far ("fully", "about half-way", "500Hz"). `pdf` = PDF page (the scan's printed numbers drift: inserted pages
// such as 50a). Every `quote` is a line copied from the manual's text and tests/lessons/arp-sheets.test.js finds it there.
// Korg's *ARP 2600 M Owner's Manual* (2021) prints no patches (only the "Basic settings" drawing, p. 20), so none come from it.
//
// START. Every sheet starts from the manual's "start from the beginning" settings (5.1, PDF p. 54: every input attenuator down,
// VCO sliders and pulse widths centred, VCF wide open with no resonance, envelope sliders at minimum, VCA initial gain at
// maximum, noise controls centred), BASE below; controls the manual calls irrelevant ("doesn't matter") keep this site's default.
//
// FIT (the report the Model D sheets give):
//   exact  the manual prints a position (fully open / closed, minimum / maximum, centred) on a control this panel has;
//   approx the manual's amount is in words ("about half-way", "fairly high", "a small amount") or in hertz, or it does not give one,
//          so the value is this page's reading: UNVERIFIED (the reason is in `read`);
//   lost   the manual asks for something this panel cannot do (`lost`): the manual start button, the envelope gate switch,
//          the voltage processors (inverter, lag), VCO range switches.
// The sound is this site's model, not compared with an instrument.
(function () {
  var G = "ARP 2600 Owner's Manual (1971)";
  var BASE = { f1: 0, f2: 0, f3: 0, fine1: 0, fine2: 0, fine3: 0, pw2: 50, pw3: 50, kb1: true, kb2: true, kb3: true,
    v1sh: 0, v1adsr: 0, v1sin2: 0, v2sh: 0, v2adsr: 0, v2sq1: 0, v2pwm: 0, v3noise: 0, v3adsr: 0, v3sin2: 0,
    cut: 10, res: 0, inRing: 0, inV1: 0, inV2: 0, inV3: 0, inN: 0, fAdsr: 0, fSin2: 0, nCol: "pink",
    aA: 0, aD: 0, aS: 0, aR: 0, arA: 0, arR: 0, gain: 10, vAr: 0, vAdsr: 0, cords: [] };
  var BASE_READ = "start settings (5.1, PDF p. 54): \"All VCO control sliders ... centered\" is read as 0 semitones (where the centre sounds is not printed), " +
    "and \"noise generator controls centered\" as pink noise (the colour slider is continuous; the manual's 5.112 drawing labels centred noise \"Pink Noise\")";
  var SHEETS = [
    { id: "saw", name: "VCO-3 sawtooth, the basic patch", sec: "5.101", pdf: [54, 55], phrase: "lead",
      quote: ["Open fully the Mixer input from the VCF and the VCF input", "This sound is the VCO3 sawtooth waveform, essentially unmod-"],
      say: "Everything closed except VCO-3's sawtooth into the wide-open filter, VCA gain at maximum: the manual's first sound. The keyboard plays VCO-3.",
      s: { inV3: 10 }, read: {}, lost: [] },
    { id: "square", name: "VCO-1 square wave", sec: "5.102", pdf: [56], phrase: "lead",
      quote: ["5.102 Open the VCO1-Filter input. The prewired input from VCO1 is", "a square wave and sounds considerably different from the sawtooth."],
      say: "VCO-3 closed, VCO-1's square wave into the filter instead: compare it with the sawtooth.",
      s: { inV1: 10 }, read: { inV1: "\"Open\" with no amount; fully (10), as in 5.101, is this page's" }, lost: [] },
    { id: "unison", name: "Two oscillators in unison", sec: "5.1021", pdf: [59], phrase: "hold",
      quote: ["By opening both the VCO1 and VCO3 Filter inputs about half-", "TUNING TWO OSCILLATORS TO UNISON."],
      say: "VCO-1 square and VCO-3 sawtooth, both about half-way. Move VCO-3's Fine slider to hear the beating, then slow it to zero, as the manual says.",
      s: { inV1: 5, inV3: 5 }, read: { inV1: "\"about half-way\" read as 5", inV3: "\"about half-way\" read as 5" }, lost: [] },
    { id: "tremolo", name: "Tremolo: VCO-2 sine on the VCA (patch cord)", sec: "5.111", pdf: [70, 71], phrase: "hold",
      quote: ["VCO2 sine output to the linear control input of the VCA. Set VCO2", "Set the VCA initial gain about one-third up.", "Now open the VCA linear control input attenuator about half-"],
      say: "Noise through the open filter; a patch cord from VCO-2's sine to the VCA's linear input, VCA initial gain about a third: the volume undulates.",
      s: { inN: 10, kb2: false, f2: -84, gain: 3, cords: [{ src: "vco2sine", dst: "vca", amt: 0.5 }] },
      read: { inN: "\"open the NG-Filter input\" with no amount; 10 is this page's",
        kb2: "VCO-2 \"to its low-frequency range\": this panel has no range switch, so VCO-2 is taken off the keyboard to stay at a steady low rate (this page's)",
        f2: "\"initial frequency slider to anywhere near center\" of the LF range: the rate is not printed; this panel's lowest setting (about 2 Hz) is this page's",
        gain: "\"about one-third up\" read as 3", cords: "the cord's attenuator \"about half-way\" read as 0.5" }, lost: [] },
    { id: "ar-perc", name: "AR envelope on the VCA", sec: "5.1112", pdf: [73, 74], phrase: "slow",
      quote: ["gain to minimum and open the linear control input to maximum. The", "Raise the Release control slider to maximum and press the", "particularly interesting with very short button-taps. The effect is of"],
      say: "VCA initial gain at minimum, the AR envelope on its linear input at maximum, attack minimum, release maximum: each note starts at once and dies away slowly.",
      s: { inV3: 10, gain: 0, vAr: 10, arA: 0, arR: 10 },
      read: { inV3: "\"Use any signal input to the VCA\": VCO-3's sawtooth through the open filter is this page's choice" },
      lost: [{ what: "manual start button", why: "this panel has none; a key gates the AR envelope instead (the manual moves to the keyboard gate itself, PDF p. 75)" }] },
    { id: "noise-wobble", name: "Pink noise, the filter swept by VCO-2's sine", sec: "5.112", pdf: [76, 77], phrase: "hold",
      quote: ["tered, output level ¾ open; VCF", "initial frequency 500Hz, resonance", "6 Hz to a depth of"],
      say: "Pink noise into the filter at about 500 Hz, no resonance; VCO-2's sine (normalled to the filter) moves the cutoff a little, about 6 times a second.",
      s: { inN: 7.5, cut: 5.7, res: 0, kb2: false, f2: -65, fSin2: 0.2 },
      read: { inN: "NG output level \"¾ open\" with the filter input open; this panel has one level, so 7.5",
        cut: "500 Hz is printed; on this panel's slider curve (10 Hz - 10 kHz, ARP 2600 M manual p. 10) that is 5.7, and the filter follows the keyboard, so 500 Hz holds at middle C only",
        kb2: "VCO-2 \"in its low-frequency range\": no range switch here, so it is taken off the keyboard (this page's)",
        f2: "the manual's short description says \"a sine wave at 6 Hz\"; 65 semitones below middle C is about 6 Hz",
        fSin2: "\"opening partially\"; the short description's depth reads \"1/12 octave\" in the scan's text (the OCR is garbled there), 0.2 on this panel's 4-octave scale: unverified" }, lost: [] },
    { id: "noise-snap", name: "Noise burst: the ADSR opens a closed filter", sec: "5.1121", pdf: [80], phrase: "perc",
      quote: ["frequency slider all the way to the left. Open the NG-Filter input", "all the way and open the VCF-Mixer input. Open the ADSR-Filter", "for a percussive short-duration envelope-say minimum attack, the", "initial decay about halfway up, minimum sustain level and final"],
      say: "Filter closed, noise fully in, ADSR into the filter at maximum; attack minimum, decay about half, sustain and release minimum. The filter alone makes the event: no VCA envelope.",
      s: { cut: 0, inN: 10, fAdsr: 10, aA: 0, aD: 5, aS: 0, aR: 0 }, read: { aD: "\"about halfway up\" read as 5" },
      lost: [{ what: "manual start button", why: "a key gates the ADSR instead (the manual allows either: \"or use the keyboard gate by pressing a key\")" }] },
    { id: "pizz", name: "Duller pluck: ADSR-Filter at nine-tenths", sec: "5.1121", pdf: [80, 81], phrase: "perc",
      quote: ["Now lower the ADSR-Filter control input attenuator to about", "nine-tenths of maximum and listen to the result when the ADSR", "percussion effects such as string pizzicatos from violins, cellos, and"],
      say: "The noise-burst settings with VCO-3's sawtooth as the source and the ADSR-Filter input lowered to about nine-tenths: the filter opens less, the pluck is duller. The manual names string pizzicatos.",
      s: { cut: 0, inV3: 10, fAdsr: 9, aA: 0, aD: 5, aS: 0, aR: 0 },
      read: { inV3: "the manual repeats the exercise \"using first a pink-noise source and then one of the VCO's\"; VCO-3 is this page's choice",
        fAdsr: "\"about nine-tenths\" read as 9", aD: "carried over from 5.1121: \"about halfway up\" read as 5" }, lost: [] },
    { id: "wah-vibrato", name: "Resonant envelope sweep with vibrato", sec: "5.1121", pdf: [82, 83], phrase: "lead",
      quote: ["When the resonance control is set fairly high, so that the", "small amount of control from the VCO2 sine at about 6-8Hz. Now", "very slightly the ADSR-VCO2 control slider, you will have a vibrato"],
      say: "VCO-3 at about 200 Hz into a closed, resonant filter swept by the ADSR; VCO-2's sine at about 6 Hz adds a vibrato to the filter, and a little ADSR on VCO-2 speeds the vibrato up as the envelope rises.",
      s: { inV3: 10, f3: -5, cut: 0, fAdsr: 10, aA: 0, aD: 5, aS: 0, aR: 0, res: 7, kb2: false, f2: -65, fSin2: 0.5, v2adsr: 0.5 },
      read: { f3: "200 Hz from the block diagram (PDF p. 83); VCO-3 follows the keyboard, so -5 semitones gives about 196 Hz at middle C only",
        aD: "carried over from 5.1121: \"about halfway up\" read as 5", res: "\"fairly high\" read as 7",
        kb2: "VCO-2 as a low-rate source: taken off the keyboard (this page's)", f2: "\"about 6-8Hz\": 6 Hz",
        fSin2: "\"a small amount\": 0.5 is this page's", v2adsr: "\"very slightly\": 0.5 is this page's" },
      lost: [{ what: "voltage inverter between the ADSR and VCO-2", why: "the manual's next step (two patch cords through the inverter) makes the vibrato slow down as the filter opens; this panel's cords have no voltage processors" }] },
    { id: "ring", name: "Ring modulator through the filter", sec: "5.13", pdf: [85, 86], phrase: "bells",
      quote: ["with AC coupling and is fed with two oscillators at audio frequen-", "VCO1 sawtooth and the VCO2 sine, and let the signal from the mod-", "ulator pass unfiltered directly through the VCF to the Mixer. (Note"],
      say: "The ring modulator's prewired inputs (VCO-1 sawtooth, VCO-2 sine) straight through the open filter. Both oscillators follow the keys, so the timbre stays the same on every note; move VCO-2's Initial freq to change it.",
      s: { inRing: 10 }, read: { inRing: "the RM-Filter input's amount is not given; 10 is this page's" }, lost: [] },
    { id: "sh-random", name: "Random notes from sample and hold", sec: "5.1401", pdf: [89], phrase: "hold",
      quote: ["1) VCF and VCA initial frequency and gain at minimum,", "proper control imputs at maximum.", "3) VCO's in audio range, about 500Hz; S/H-oscillator inputs", "about two-thirds open.", "4) Internal Clock rate about medium; S/H input level all the"],
      say: "VCF and VCA closed and opened by the ADSR; VCO-1 and VCO-2 at about 500 Hz, the S/H output (prewired to both) about two-thirds open, clock about medium: random pitches, one per clock tick. Hold a key.",
      s: { cut: 0, gain: 0, fAdsr: 10, vAdsr: 10, f1: 11, f2: 11, v1sh: 6.7, v2sh: 6.7, shRate: 5, inV1: 7, inV2: 7, aS: 10 },
      read: { vAdsr: "\"proper control inputs at maximum\": the VCA's ADSR (exponential) input is this page's reading; the AR (linear) one would fit too",
        f1: "\"about 500Hz\": 11 semitones above middle C (about 494 Hz) at the middle key", f2: "\"about 500Hz\": as VCO-1",
        v1sh: "\"about two-thirds open\" read as 6.7", v2sh: "\"about two-thirds open\" read as 6.7", shRate: "\"about medium\" read as 5",
        inV1: "the signal inputs are not given; VCO-1 and VCO-2 (the block diagram's) at 7 are this page's", inV2: "as VCO-1",
        aS: "envelope settings are not given; sustain 10 is this page's so a held key keeps sounding" },
      lost: [{ what: "envelope gate switch to the lower position (the Internal Clock gates the envelopes)", why: "this panel's envelopes follow the keyboard only, so the notes change on each tick but are not re-struck" },
        { what: "S/H input level and NG output level (\"about three-quarters\")", why: "this panel's S/H always samples the noise at full level" }] }
  ];
  var PHRASE = { // this page's
    lead: [[48, 0, 1], [52, 1, 1], [55, 2, 1], [60, 3, 1.5]],
    hold: [[60, 0, 4]],
    slow: [[48, 0, 0.3], [55, 2, 0.3], [60, 4, 0.3]],
    perc: [[48, 0, 0.25], [48, 1, 0.25], [55, 2, 0.25], [60, 3, 0.25]],
    bells: [[72, 0, 1.5], [79, 1, 1.5], [76, 2, 1.5], [84, 3, 2]] };
  var BPM = { lead: 90, hold: 60, slow: 60, perc: 100, bells: 80 };

  function state(sh) { var o = JSON.parse(JSON.stringify(BASE)), k; for (k in sh.s) o[k] = JSON.parse(JSON.stringify(sh.s[k])); return o; }
  function fit(sh) {
    var rep = [{ ctl: "start settings", how: "approx", why: BASE_READ }], k;
    for (k in sh.s) rep.push({ ctl: k, how: sh.read[k] ? "approx" : "exact", why: sh.read[k] || "printed in the manual, " + sh.sec + ", PDF p. " + sh.pdf.join(", ") });
    (sh.lost || []).forEach(function (l) { rep.push({ ctl: l.what, how: "lost", why: l.why }); });
    return rep;
  }
  function summary(rep) { return ["exact", "approx", "lost"].map(function (h) { return rep.filter(function (r) { return r.how === h; }).length + " " + h; }).join(", "); }
  function fitText(sh) {
    var rep = fit(sh), ap = rep.filter(function (r) { return r.how !== "exact" && r.ctl !== "start settings"; });
    return " Fit on this panel: " + summary(rep) + "." + (ap.length ? " " + ap.map(function (r) { return r.ctl + " (" + r.how + "): " + r.why; }).join("; ") + "." : "") +
      " Everything else is the manual's start settings (5.1); centred VCO sliders and noise colour are this page's reading (unverified).";
  }
  var AS = { SHEETS: SHEETS, BASE: BASE, state: state, fit: fit, summary: summary, fitText: fitText, MANUAL: G };
  function addTo(SC) {
    if (!SC || !SC.EXAMPLES || SC.EXAMPLES.some(function (x) { return x.id === "a26-saw"; })) return;
    SHEETS.forEach(function (sh) {
      SC.EXAMPLES.push({ id: "a26-" + sh.id, from: "arp2600", arpSheet: true, name: "Manual " + sh.sec + ": " + sh.name, src: G + " " + sh.sec + ", PDF p. " + sh.pdf.join(", "),
        phrase: PHRASE[sh.phrase], bpm: BPM[sh.phrase], wheel: 0, s: state(sh), fit: fit(sh), say: sh.say + fitText(sh) });
    });
  }
  AS.addTo = addTo;
  if (typeof window !== "undefined") { window.ArpSheets = AS; addTo(window.SynthCompare); }
  if (typeof module !== "undefined") module.exports = AS;
})();
