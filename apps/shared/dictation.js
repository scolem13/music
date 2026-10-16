// dictation.js — grade a written answer (ABC from the Notation page) against the line that was played.
// Plain script, one global (Dictation); loads in Node for tests. Needs abc-core.js and abc-events.js loaded first.
//
//   Dictation.grade(targetAbc, answerAbc) -> { notes, extras, pitchScore, rhythmScore, score, summary }
//     notes   one per sounding target note or chord ("[CEG]": midis, and pitch "part" with part 0..1 = share of its notes written): { t, dur, midi, midis, got: null | { t_on, dur, midi }, rhythm: bool, pitch: "ok"|"octave"|"wrong"|"missing" }
//     extras  answer notes that start where no target note starts
//     pitchScore, rhythmScore, score  0..1 (an octave slip is half credit; each extra note takes one note's worth off rhythm)
// Notes are matched by onset (in quarters from the start), ties merged, so 2 tied quavers = 1 crotchet is right.
// Rhythm is right when the onset matches and the length matches; pitch is checked on any note with a matching onset.
(function (global) {
  const Events = global.AbcEvents || (typeof require === "function" ? require("./abc-events.js") : null);
  if (!Events) throw new Error("dictation.js needs abc-core.js and abc-events.js loaded before it");
  const near = (a, b) => Math.abs(a - b) < 0.01;

  function notesOf(abc) {
    return Events.fromAbc(abc).sounding.filter(e => e.kind === "note" && e.pitches.length)
      .map(e => ({ t_on: e.t_on, dur: e.t_off - e.t_on, midi: e.pitches[0].midi, midis: e.notes || [e.pitches[0].midi] }));
  }

  function grade(targetAbc, answerAbc) {
    const target = notesOf(targetAbc), answer = notesOf(answerAbc || "X:1\nK:C\n");
    const used = new Set();
    const notes = target.map(n => {
      const k = answer.findIndex((a, i) => !used.has(i) && near(a.t_on, n.t_on));
      const out = { t: n.t_on, dur: n.dur, midi: n.midi, midis: n.midis, got: null, rhythm: false, pitch: "missing" };
      if (k < 0) return out;
      used.add(k); const a = answer[k]; out.got = a;
      out.rhythm = near(a.dur, n.dur);
      if (n.midis.length > 1 || a.midis.length > 1) {      // a chord: the share of its notes written (and nothing else)
        const hit = n.midis.filter(m => a.midis.includes(m)).length, part = hit / Math.max(n.midis.length, a.midis.length);
        out.pitch = part === 1 ? "ok" : part > 0 ? "part" : "wrong"; out.part = part;
      } else out.pitch = a.midi === n.midi ? "ok" : (a.midi - n.midi) % 12 === 0 ? "octave" : "wrong";
      return out;
    });
    const extras = answer.filter((_, i) => !used.has(i));
    const n = Math.max(1, notes.length);
    const pitchScore = notes.reduce((s, x) => s + (x.pitch === "ok" ? 1 : x.pitch === "octave" ? 0.5 : x.pitch === "part" ? x.part : 0), 0) / n;
    const rhythmScore = Math.max(0, notes.filter(x => x.rhythm).length - extras.length) / n;
    const score = (pitchScore + rhythmScore) / 2;
    const summary = Math.round(score * 100) + "% (pitch " + Math.round(pitchScore * 100) + "%, rhythm " + Math.round(rhythmScore * 100) + "%)";
    return { notes, extras, pitchScore, rhythmScore, score, summary };
  }

  // the header lines a student is given: meter, unit, key (and the title)
  function givens(abc) {
    const f = k => { const m = new RegExp("^" + k + ":\\s*(.*)$", "m").exec(abc); return m ? m[1].trim() : null; };
    return { meter: f("M"), key: f("K"), title: f("T") };
  }

  const api = { grade, givens, notesOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.Dictation = api;
})(typeof window !== "undefined" ? window : globalThis);
