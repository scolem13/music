// Prophet-5 patches from its manual, as starting patches (global ProphetSheets), after the Model D patch sheets (model-d.js).
// Load after synth-compare.js; each sheet is added to SynthCompare.EXAMPLES (from: "prophet", id "p5s-<id>"), so it is offered in
// the "Example" picker wherever the Prophet-5 panel is (lessons/intro-prophet-5.qmd, lessons/synth-compare.qmd), with its fit
// report under the example's text.
//
// SOURCES. Prophet-5 Rev4 User's Guide (Sequential, ~/Documents/Manuals/synths/Prophet-5-Rev4-Users-Guide.pdf / .txt). The guide
// prints no patch charts and no factory program list: its programs are only in the instrument ("Listen to programs 511-558", p. 2).
// What it does print are tutorial recipes that start from the Basic Program (record + preset) and set knobs to numbers; those are
// the sheets here. The Service Manual (Prophet-5-Service-Manual.txt) was searched too: it has no patches or program charts.
// Pages are the guide's printed page numbers; `pdf` is the PDF page. Every `quote` is a line copied from the guide's text and
// tests/lessons/prophet-sheets.test.js finds it there.
//
// FIT (the report the Model D sheets give, here for the guide's settings on this site's Prophet-5 panel):
//   exact  the guide prints a number or a switch, and the site's panel has that control on the same 0-10 (or on/off) scale;
//   approx the guide's value is vague ("turn up", "slightly", "between 0 and 1") or in units this panel does not use, so the value
//          here is this page's reading: UNVERIFIED (the reason is in `read`);
//   lost   the guide asks for something the site's panel cannot do (`lost`).
// Every control the guide does not name keeps the Basic Program value of SynthCompare.PROFILES.prophet.def. The guide prints only
// part of the Basic Program (Osc A saw at 10, Osc B at 0 with no wave, rev 3 filter: pp. 19, 23, 26, 47); the rest of that default is
// this site's, so it is unverified as well. The sound is this site's model, not compared with an instrument.
(function () {
  var G = "Prophet-5 User's Guide";
  var SHEETS = [
    { id: "basic", name: "The Basic Program", pages: "pp. 8, 47", pdf: [20, 59], phrase: "lead",
      quote: ["In the Basic Program, only Oscillator A is audible. Its waveshape is set", "Mixer and no wave shape is selected.)"],
      say: "Record + preset: Osc A sawtooth at 10 in the mixer, Osc B at 0 with no wave, rev 3 filter. The guide's own starting point for every recipe.",
      s: {}, read: {}, lost: [] },
    { id: "filter-rev12", name: "Hearing the rev 1/2 filter", pages: "p. 23", pdf: [34], phrase: "lead",
      quote: ["sawtooth and detune it slightly by turning its fine knob to 2.", "then turn the resonance knob about halfway up."],
      say: "Rev 1/2 filter, Osc B sawtooth turned up and fine at 2, cutoff and resonance about halfway. Turn the cutoff for the guide's resonant sweep, then switch rev.",
      s: { rev: "1/2", bSaw: true, mB: 8, bFine: 2, cutoff: 5, res: 5 },
      read: { mB: "\"turn up Oscillator B in the Mixer\": no number; 8 is this page's", cutoff: "\"its halfway position\" read as 5", res: "\"about halfway up\" read as 5" }, lost: [] },
    { id: "filter-env", name: "Hearing the filter envelope", pages: "p. 26", pdf: [38], phrase: "bass",
      quote: ["2. Hold down a note and rotate the filter’s cutoff knob to set it to 3.", "4. Turn the envelope amount knob to 2. Play a note. Notice how the sound", "5. Set the Filter Envelope’s sustain to 0."],
      say: "Cutoff 3, envelope amount 2, filter sustain 0, amp release 6: each note opens the filter and closes it again. Turn the filter decay as the guide says.",
      s: { cutoff: 3, envAmt: 2, fS: 0, aR: 6 }, read: {}, lost: [] },
    { id: "amp-env", name: "Hearing the amplifier envelope", pages: "p. 30", pdf: [41], phrase: "lead",
      quote: ["Reset the decay parameter to 10", "Finally, with decay set to 10 and sustain still set to zero, repeatedly"],
      say: "Amp sustain 0 and amp decay 10: the sound is only the decay. Turn the amp release up as the guide says.",
      s: { aS: 0, aD: 10 }, read: {}, lost: [] },
    { id: "bass", name: "Synth bass (short version)", pages: "p. 46", pdf: [57], phrase: "bass",
      quote: ["Set filter cutoff to 3.", "Set filter resonance to 3.", "In the envelopes section, set the Filter Envelope’s decay to 6.", "In the envelopes section, set the Filter Envelope’s sustain to 2.", "In the envelopes section, set the Filter Envelope’s env amount to 10."],
      say: "Cutoff 3, resonance 3, filter decay 6, filter sustain 2, envelope amount 10, nothing else changed from the Basic Program.",
      s: { cutoff: 3, res: 3, fD: 6, fS: 2, envAmt: 10 },
      read: { envAmt: "printed 10 (exact on the panel), but how many octaves the real amount knob spans is not printed; this site's model uses 6" }, lost: [] },
    { id: "bass-long", name: "Synth bass (long version, with amp release)", pages: "pp. 47-49", pdf: [59, 60, 61], phrase: "bass",
      quote: ["7. Set the filter cutoff to a value of 3.", "8. Set the filter resonance to a value of 3. This is going to give the synth", "knob to a value of 10.", "release value to 7."],
      say: "The long version ends on the same bass (cutoff 3, resonance 3, decay 6, sustain 2, amount 10) and sets the amp release to 7 so the filter release can be heard.",
      s: { cutoff: 3, res: 3, fD: 6, fS: 2, envAmt: 10, aR: 7 }, read: {}, lost: [] },
    { id: "bass-fat", name: "Synth bass made fatter (unison)", pages: "p. 49", pdf: [61], phrase: "bass",
      quote: ["• Turn on the square wave in Oscillator A.", "use the fine control to slightly detune oscillator B.", "says 5.", "and press one of the program select buttons (maximum detuning is 8)."],
      say: "The long-version bass with Osc A's square on, Osc B sawtooth turned up and detuned slightly, and Unison stacking 5 voices, detuned.",
      s: { cutoff: 3, res: 3, fD: 6, fS: 2, envAmt: 10, aR: 7, aPulse: true, bSaw: true, mB: 8, bFine: 1, uni: true, uniN: 5, uniDet: 4 },
      read: { mB: "\"Turn up Oscillator B in the mixer\": no number; 8 is this page's", bFine: "\"slightly detune\": no number; 1 is this page's",
        uniDet: "the guide gives only the maximum (8), not a setting; 4 is this page's" }, lost: [] },
    { id: "brass", name: "Synth brass with the pitch blip", pages: "p. 50", pdf: [62], phrase: "chords",
      quote: ["set the fine control to 2 to detune it slightly.", "3. In the filter section, set cutoff to 1, resonance to 3, and filter amount", "4. Press the keyboard switch twice to set keyboard filter tracking to full.", "5. In the filter envelope section, set the attack to 4, decay to 6, sustain to", "3. Set the filt env to somewhere between 0 and 1."],
      say: "Osc B sawtooth turned up, fine 2; cutoff 1, resonance 3, amount 8; keyboard tracking full; filter envelope 4-6-4-0; velocity on; Poly Mod filter env just above 0 to freq A for the blip.",
      s: { bSaw: true, mB: 8, bFine: 2, cutoff: 1, res: 3, envAmt: 8, kbd: "full", fA: 4, fD: 6, fS: 4, fR: 0, velF: true, pmFA: true, pmFenv: 0.5 },
      read: { mB: "\"Turn up Oscillator B in the mixer\": no number; 8 is this page's",
        velF: "\"pressing and enabling the velocity button once\": the guide does not say whether one press means filter or amp; filter is this page's reading",
        pmFenv: "\"somewhere between 0 and 1\" read as 0.5" }, lost: [] },
    { id: "strings", name: "Synth brass turned into a string pad", pages: "p. 51", pdf: [63], phrase: "chords",
      quote: ["Use the keyboard switch to set keyboard filter tracking to half.", "In the filter section, set the cutoff to 7 and resonance to 2.", "Set Filter Envelope attack to 5, decay to 6, sustain to 7, and release to", "Set Amplifier Envelope attack to 5, decay to 5, sustain to 10, and"],
      say: "From the brass: Poly Mod freq A off, keyboard half, cutoff 7, resonance 2, amount 0, filter envelope 5-6-7-7, amp envelope 5-5-10-6.",
      s: { bSaw: true, mB: 8, bFine: 2, velF: true, kbd: "half", cutoff: 7, res: 2, envAmt: 0, fA: 5, fD: 6, fS: 7, fR: 7, aA: 5, aD: 5, aS: 10, aR: 6 },
      read: { mB: "carried over from the brass: \"turn up\", 8 is this page's", velF: "carried over from the brass (filter is this page's reading)" }, lost: [] },
    { id: "sync", name: "Hard-sync lead", pages: "pp. 51-52", pdf: [63, 64], phrase: "lead",
      quote: ["Set Oscillator A frequency to 4. This will allow for a wide range of", "5. In the poly mod section, set filt env to 7. This sets the amount of modu-", "6. In the filter section, set the cutoff to 8 and resonance to 2.", "7. Set the env amount to 3.", "8. In the filter envelope section, set attack to 4, decay to 7, sustain to 4,"],
      say: "Osc A sync on, frequency \"4\"; Poly Mod filter env 7 to freq A; cutoff 8, resonance 2, amount 3; filter envelope 4-7-4-5. The guide names it as the sound of \"Let's Go\" by the Cars.",
      s: { aSync: true, aFreq: 40, pmFA: true, pmFenv: 7, cutoff: 8, res: 2, envAmt: 3, fA: 4, fD: 7, fS: 4, fR: 5 },
      read: { aFreq: "the guide's \"4\" is a knob reading; this panel's Frequency is in semitones and the guide prints no conversion, so 16 semitones above B is this page's" }, lost: [] }
  ];
  var PHRASE = { // the same shapes as synth-compare.js's examples (beats); this page's
    bass: [[36, 0, .5], [36, .75, .5], [43, 1.5, .5], [46, 2, .5], [48, 2.5, .75], [43, 3.5, .5]],
    lead: [[60, 0, 1], [64, 1, 1], [67, 2, 1], [72, 3, 1.5]],
    chords: [[48, 0, 3.6], [55, 0, 3.6], [60, 0, 3.6], [64, 0, 3.6], [53, 4, 3.6], [57, 4, 3.6], [60, 4, 3.6], [65, 4, 3.6]] };
  var BPM = { bass: 110, lead: 100, chords: 70 };

  function fit(sh) {
    var rep = [], k;
    for (k in sh.s) rep.push({ ctl: k, how: sh.read[k] ? "approx" : "exact", why: sh.read[k] || "printed in the guide, " + sh.pages });
    (sh.lost || []).forEach(function (l) { rep.push({ ctl: l.what, how: "lost", why: l.why }); });
    return rep;
  }
  function summary(rep) { return ["exact", "approx", "lost"].map(function (h) { return rep.filter(function (r) { return r.how === h; }).length + " " + h; }).join(", "); }
  function fitText(sh) {
    var rep = fit(sh), ap = rep.filter(function (r) { return r.how !== "exact"; });
    return " Fit on this panel: " + summary(rep) + "." + (ap.length ? " " + ap.map(function (r) { return r.ctl + " (" + r.how + "): " + r.why; }).join("; ") + "." : "") +
      " Controls the guide does not name keep the Basic Program; most of it is this site's (unverified).";
  }
  var PS = { SHEETS: SHEETS, fit: fit, summary: summary, fitText: fitText, GUIDE: G };
  function addTo(SC) {
    if (!SC || !SC.EXAMPLES || SC.EXAMPLES.some(function (x) { return x.id === "p5s-basic"; })) return;
    SHEETS.forEach(function (sh) {
      SC.EXAMPLES.push({ id: "p5s-" + sh.id, from: "prophet", sheet: true, name: "Guide " + sh.pages + ": " + sh.name, src: G + " " + sh.pages,
        phrase: PHRASE[sh.phrase], bpm: BPM[sh.phrase], wheel: 0, s: JSON.parse(JSON.stringify(sh.s)), fit: fit(sh), say: sh.say + fitText(sh) });
    });
  }
  PS.addTo = addTo;
  if (typeof window !== "undefined") { window.ProphetSheets = PS; addTo(window.SynthCompare); }
  if (typeof module !== "undefined") module.exports = PS;
})();
