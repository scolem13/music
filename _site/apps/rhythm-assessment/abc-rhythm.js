// abc-rhythm.js
// Parse one rhythm pattern's ABC into a timing model for grading.
// Reads the notes with AbcCore (apps/shared/abc-core.js, which a page loads first), in its looser rhythm dialect:
// no accidentals or octave marks, and quoted text is not skipped.
//
// Scope: the constrained ABC in rhythm-pattern-object.js — every note is "B"
// (pitch is irrelevant), with:
//   - default note length  L:  (e.g. 1/8); a bare note = 1 "L unit"
//   - durations: B2 (=2), B3 (=3), B/ or B/2 (=0.5), B/4 (=0.25), B3/2 (=1.5)
//   - broken rhythm:  A>B  (first x1.5, second x0.5),  A<B  (first x0.5, second x1.5)
//   - rests:  z  (advance time, no onset)
//   - ties:   B-  (next note is a continuation: no new onset, duration adds)
//   - bar lines "|" and spaces are timing-irrelevant separators
//
// Output of parse(abc):
//   events: [{ dur, isRest, isOnset }]   (in L units; one per notated event,
//                                          INCLUDING tied continuations so it
//                                          aligns 1:1 with abcjs noteheads/rests)
//   onsets: [t, ...]                      (start time in L units of each attack)
//   total:  total duration in L units

(function (global) {
  const Core = global.AbcCore || (typeof require === "function" ? require("../shared/abc-core.js") : null);
  if (!Core) throw new Error("abc-rhythm.js needs /apps/shared/abc-core.js loaded before it");

  const SKIP = /^(X:|T:|M:|L:|K:|w:|%)/;                    // headers/lyrics/directives
  const musicLines = abc => Core.musicText(abc, SKIP);
  // default note length L: as quarter-notes per L-unit (e.g. L:1/8 -> 0.5); 1/8 when absent
  const lUnitQuarters = abc => Core.lUnitQuarters(abc, 0.5);
  const meter = Core.meter;

  // Duration of one macrobeat in L-units, given whether this is a triple meter
  // (Gordon usage; caller knows from the collection name). Triple macrobeat =
  // 3 microbeats (whole-note value 3/d); duple = 1/d. Divide by L-unit size.
  function macrobeatLUnits(abc, isTriple) {
    const M = meter(abc), Lq = lUnitQuarters(abc);
    const macroQuarters = (isTriple ? 3 : 1) * (4 / M.d); // (whole 3/d or 1/d) * 4
    return macroQuarters / Lq;
  }

  function parse(abc) {
    const events = [];
    let brokenNext = 1;     // multiplier to apply to the next note (broken rhythm)
    let tiePending = false; // previous note tied into the next

    for (const tok of Core.tokens(musicLines(abc), { pitched: false, quotes: false })) {
      if (tok.t === "broken") {
        // modify the most recent note, and stage the next one
        for (let k = events.length - 1; k >= 0; k--) {
          if (!events[k].isRest) { events[k].dur *= (tok.ch === ">" ? 1.5 : 0.5); break; }
        }
        brokenNext = (tok.ch === ">" ? 0.5 : 1.5);
      } else if (tok.t === "tie") {
        tiePending = true;  // tie the previous note to the next
      } else if (tok.t === "note") {
        const dur = tok.mult * brokenNext;
        brokenNext = 1;
        events.push({ dur, isRest: false, isOnset: !tiePending });
        tiePending = false;
      } else if (tok.t === "rest") {
        events.push({ dur: tok.mult, isRest: true, isOnset: false });
        tiePending = false;   // a rest can't be a tie target
      }
    }

    const onsets = [];
    let t = 0;
    for (const e of events) {
      if (e.isOnset) onsets.push(t);
      t += e.dur;
    }
    return { events, onsets, total: t, lQuarters: lUnitQuarters(abc) };
  }

  const api = { parse, musicLines, meter, macrobeatLUnits };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcRhythm = api;
})(typeof window !== "undefined" ? window : globalThis);
