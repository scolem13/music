// abc-rhythm.js
// Parse one rhythm pattern's ABC into a timing model for grading.
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
  function musicLines(abc) {
    const out = [];
    for (const raw of abc.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (/^(X:|T:|M:|L:|K:|w:|%)/.test(line)) continue;   // headers/lyrics/directives
      out.push(line);
    }
    return out.join(" ");
  }

  // read a duration suffix starting at index i; returns [mult, nextIndex]
  function readDur(s, i) {
    let num = "";
    while (i < s.length && /[0-9]/.test(s[i])) { num += s[i]; i++; }
    let mult = num ? parseInt(num, 10) : 1;
    if (s[i] === "/") {
      i++;
      let den = "";
      while (i < s.length && /[0-9]/.test(s[i])) { den += s[i]; i++; }
      mult = mult / (den ? parseInt(den, 10) : 2);
    }
    return [mult, i];
  }

  // default note length L: as quarter-notes per L-unit (e.g. L:1/8 -> 0.5)
  function lUnitQuarters(abc) {
    const m = /^L:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc);
    if (!m) return 0.5; // default to 1/8
    return (parseInt(m[1],10) / parseInt(m[2],10)) * 4; // whole-notes * 4 = quarters
  }

  // meter M:n/d -> {n, d}
  function meter(abc) {
    const m = /^M:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc);
    return m ? { n: parseInt(m[1],10), d: parseInt(m[2],10) } : { n: 4, d: 4 };
  }

  // Duration of one macrobeat in L-units, given whether this is a triple meter
  // (Gordon usage; caller knows from the collection name). Triple macrobeat =
  // 3 microbeats (whole-note value 3/d); duple = 1/d. Divide by L-unit size.
  function macrobeatLUnits(abc, isTriple) {
    const M = meter(abc), Lq = lUnitQuarters(abc);
    const macroQuarters = (isTriple ? 3 : 1) * (4 / M.d); // (whole 3/d or 1/d) * 4
    return macroQuarters / Lq;
  }

  function parse(abc) {
    const s = musicLines(abc);
    const events = [];
    let i = 0;
    let brokenNext = 1;     // multiplier to apply to the next note (broken rhythm)
    let tiePending = false; // previous note tied into the next

    while (i < s.length) {
      const ch = s[i];
      if (ch === ">" || ch === "<") {
        // modify the most recent note, and stage the next one
        for (let k = events.length - 1; k >= 0; k--) {
          if (!events[k].isRest) { events[k].dur *= (ch === ">" ? 1.5 : 0.5); break; }
        }
        brokenNext = (ch === ">" ? 0.5 : 1.5);
        i++;
      } else if (ch === "-") {
        tiePending = true;  // tie the previous note to the next
        i++;
      } else if (/[A-Ga-g]/.test(ch)) {
        i++;
        let [mult, ni] = readDur(s, i); i = ni;
        const dur = mult * brokenNext;
        brokenNext = 1;
        events.push({ dur, isRest: false, isOnset: !tiePending });
        tiePending = false;
      } else if (ch === "z" || ch === "x" || ch === "Z") {
        i++;
        let [mult, ni] = readDur(s, i); i = ni;
        events.push({ dur: mult, isRest: true, isOnset: false });
        tiePending = false;   // a rest can't be a tie target
      } else {
        i++; // "|", spaces, etc.
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
