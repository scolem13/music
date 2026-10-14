// abc-tune.js
// Parse one tune's melody into note events with pitch + timing, for combined
// pitch+rhythm assessment. Handles real ABC tunes: key signatures (any major/
// minor/mode), accidentals with per-measure persistence, octave marks, durations
// (incl. /2, 2, 3, broken rhythm > <), rests (z), ties (-), and "chord" symbols
// (ignored). Single-voice melodies (the tunes-object.js format).
// Reads the notes with AbcCore (apps/shared/abc-core.js, which a page loads first).
//
// melodyNotes(abc) -> {
//   notes:  [{ midi, onset, dur }]   // onset/dur in L-units (quarter-note = lq L-units)
//   total:  total length in L-units
//   lq:     quarter-notes per L-unit (e.g. L:1/4 -> 1, L:1/8 -> 0.5)
//   meter:  { n, d }
//   tempoQ: display BPM (from Q:), default 100
//   tempoNote: Q: note value in quarters (e.g. Q:3/8=… → 1.5); multiply display BPM by this to get quarter-BPM
// }
// Convention: ABC "C" = middle C = MIDI 60.

(function (global) {
  const Core = global.AbcCore || (typeof require === "function" ? require("../shared/abc-core.js") : null);
  if (!Core) throw new Error("abc-tune.js needs /apps/shared/abc-core.js loaded before it");

  const SKIP = /^([A-Za-z]:|%)/;                           // headers/directives

  function melodyNotes(abc){
    const lq = Core.lUnitQuarters(abc, 1), M = Core.meter(abc), Q = Core.tempoQ(abc);
    const ksig = Core.keyAccidentals(Core.keyField(abc));

    // pass 1: tokens into events with durations (broken rhythm + ties applied)
    const ev = [];               // {type:'note'|'rest'|'chord', midi?, dur, tie}
    let brokenNext = 1, measureAcc = {};
    const lastNote = () => { for (let k=ev.length-1;k>=0;k--) if (ev[k].type==="note") return ev[k]; return null; };
    for (const tok of Core.tokens(Core.musicText(abc, SKIP))){
      if (tok.t === "quote"){ ev.push({type:"chord", name: tok.text}); continue; }
      if (tok.t === "bar"){ measureAcc = {}; continue; }                                   // barline → reset accidentals
      if (tok.t === "broken"){ const ln = lastNote(); if (ln) ln.dur *= (tok.ch===">"?1.5:0.5); brokenNext = (tok.ch===">"?0.5:1.5); continue; }
      if (tok.t === "tie"){ const ln = lastNote(); if (ln) ln.tie = true; continue; }
      if (tok.t === "note"){
        ev.push({ type:"note", midi: Core.noteMidi(tok, ksig, measureAcc), dur: tok.mult * brokenNext, tie:false });
        brokenNext = 1;
      } else if (tok.t === "rest"){
        ev.push({ type:"rest", dur: tok.mult }); brokenNext = 1;
      }
    }

    // pass 2: cumulative time → onsets (ties merge into previous note)
    // events mirrors notes but also keeps rests as explicit tokens (type:'note'|'rest'),
    // for tools that need the full note/rest sequence (e.g. rhythm-pattern matching).
    const notes = [], chords = [], events = []; let t = 0, prevTie = false;
    for (const e of ev){
      if (e.type === "chord"){ const mm = Core.chordMidis(e.name); if (mm) chords.push({ onset: t, midis: mm, name: e.name }); continue; }
      if (e.type === "rest"){ events.push({ type:"rest", dur: e.dur }); t += e.dur; prevTie = false; continue; }
      if (prevTie && notes.length){ notes[notes.length-1].dur += e.dur; events[events.length-1].dur += e.dur; t += e.dur; prevTie = e.tie; continue; }
      notes.push({ midi: e.midi, onset: t, dur: e.dur }); events.push({ type:"note", midi: e.midi, dur: e.dur }); t += e.dur; prevTie = e.tie;
    }
    return { notes, chords, events, total: t, lq, meter: M, tempoQ: Q, tempoNote: Core.tempoNoteQ(abc) };
  }

  const api = { melodyNotes, keyAccidentals: Core.keyAccidentals, chordMidis: Core.chordMidis };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcTune = api;
})(typeof window !== "undefined" ? window : globalThis);
