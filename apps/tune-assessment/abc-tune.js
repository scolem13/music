// abc-tune.js
// Parse one tune's melody into note events with pitch + timing, for combined
// pitch+rhythm assessment. Handles real ABC tunes: key signatures (any major/
// minor/mode), accidentals with per-measure persistence, octave marks, durations
// (incl. /2, 2, 3, broken rhythm > <), rests (z), ties (-), and "chord" symbols
// (ignored). Single-voice melodies (the tunes-object.js format).
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
  const LETTER_SEMI = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const SHARP_ORDER = ["F","C","G","D","A","E","B"];
  const FLAT_ORDER  = ["B","E","A","D","G","C","F"];
  const MAJOR_FIFTHS = { C:0,G:1,D:2,A:3,E:4,B:5,"F#":6,"C#":7,
                         F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7 };
  const MODE_FIFTHS = { maj:0, major:0, ion:0, ionian:0,
                        m:-3, min:-3, minor:-3, aeo:-3, aeolian:-3,
                        dor:-2, dorian:-2, phr:-4, phrygian:-4,
                        lyd:1, lydian:1, mix:-1, mixolydian:-1, loc:-5, locrian:-5 };

  function keyAccidentals(keyStr){
    const m = /^([A-Ga-g])([#b]?)\s*([A-Za-z]*)/.exec((keyStr||"").trim());
    if (!m) return {};
    const tonic = m[1].toUpperCase() + (m[2] || "");
    const mode = (m[3] || "maj").toLowerCase();
    let fifths = MAJOR_FIFTHS[tonic];
    if (fifths === undefined) fifths = 0;
    fifths += (MODE_FIFTHS[mode] !== undefined ? MODE_FIFTHS[mode] : 0);
    const acc = {};
    if (fifths > 0) for (let i=0;i<fifths && i<7;i++) acc[SHARP_ORDER[i]] = 1;
    else if (fifths < 0) for (let i=0;i<-fifths && i<7;i++) acc[FLAT_ORDER[i]] = -1;
    return acc;
  }

  const field = (abc, re, dflt) => { const m = re.exec(abc); return m ? m : dflt; };
  function lUnitQuarters(abc){ const m = /^L:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc); return m ? (+m[1]/+m[2])*4 : 0.25*4; }
  function meter(abc){ const m = /^M:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc); return m ? {n:+m[1],d:+m[2]} : {n:4,d:4}; }
  // Raw BPM from Q: (e.g. "Q:3/8=100" → 100). Use with tempoNoteQ to convert to quarter-BPM.
  function tempoQ(abc){ const m = /^Q:\s*\d+\/\d+\s*=\s*(\d+)/m.exec(abc); return m ? +m[1] : 100; }
  // Note value of Q: expressed in quarter notes (e.g. "Q:3/8=…" → 1.5, "Q:1/4=…" → 1, default 1).
  function tempoNoteQ(abc){ const m = /^Q:\s*(\d+)\s*\/\s*(\d+)\s*=/m.exec(abc); return m ? (+m[1]/+m[2])*4 : 1; }
  function keyField(abc){ const m = /^K:\s*(.+)$/m.exec(abc); return m ? m[1] : "C"; }

  function musicText(abc){
    const out = [];
    for (const raw of abc.split("\n")){
      const line = raw.trim();
      if (!line) continue;
      if (/^[A-Za-z]:/.test(line) || line.startsWith("%")) continue;   // headers/directives
      out.push(line);
    }
    return out.join(" ");
  }

  // Chord symbol (e.g. "Bb", "F7", "Cm", "Gm7", "Cmaj7") -> MIDI notes in the C3
  // region. Returns null for non-chord annotations ("^text", fingerings, etc.).
  function chordMidis(name){
    const m = /^([A-G])([#b]?)(.*)$/.exec((name||"").trim());
    if (!m) return null;
    let root = LETTER_SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    root = ((root % 12) + 12) % 12;
    const q = m[3] || "";
    let iv;
    if (/^(maj7|M7|Δ)/.test(q))      iv = [0,4,7,11];
    else if (/^m7/.test(q))          iv = [0,3,7,10];
    else if (/^(min|m)(?!aj)/.test(q)) iv = [0,3,7];
    else if (/^(dim|°|o)/.test(q))   iv = [0,3,6];
    else if (/^(aug|\+)/.test(q))    iv = [0,4,8];
    else if (/7/.test(q))            iv = [0,4,7,10];
    else                             iv = [0,4,7];
    const base = 48 + root;          // C3 region, below the melody
    return iv.map(i => base + i);
  }

  function readDur(s, i){
    let num = "";
    while (i < s.length && /[0-9]/.test(s[i])) { num += s[i]; i++; }
    let mult = num ? parseInt(num,10) : 1;
    if (s[i] === "/"){ i++; let den=""; while(i<s.length && /[0-9]/.test(s[i])){den+=s[i];i++;} mult /= (den?parseInt(den,10):2); }
    return [mult, i];
  }

  function melodyNotes(abc){
    const lq = lUnitQuarters(abc), M = meter(abc), Q = tempoQ(abc);
    const ksig = keyAccidentals(keyField(abc));
    const s = musicText(abc);

    // pass 1: tokenize into events with durations (broken rhythm + ties applied)
    const ev = [];               // {type:'note'|'rest', midi?, dur, tie}
    let i = 0, brokenNext = 1, measureAcc = {};
    const lastNote = () => { for (let k=ev.length-1;k>=0;k--) if (ev[k].type==="note") return ev[k]; return null; };
    while (i < s.length){
      const ch = s[i];
      if (ch === '"'){ i++; let name=""; while (i<s.length && s[i] !== '"'){ name+=s[i]; i++; } i++; ev.push({type:"chord", name}); continue; }
      if (ch === '|' || ch === ']' || ch === '['){ measureAcc = {}; i++; continue; }       // barline → reset accidentals
      if (ch === '>' || ch === '<'){ const ln = lastNote(); if (ln) ln.dur *= (ch===">"?1.5:0.5); brokenNext = (ch===">"?0.5:1.5); i++; continue; }
      if (ch === '-'){ const ln = lastNote(); if (ln) ln.tie = true; i++; continue; }
      if (ch === '^' || ch === '_' || ch === '=' || /[A-Ga-g]/.test(ch)){
        let acc;
        while (s[i]==="^"||s[i]==="_"||s[i]==="="){ if (s[i]==="=") acc=0; else acc=(acc===undefined?0:acc)+(s[i]==="^"?1:-1); i++; }
        const letter = s[i];
        if (!/[A-Ga-g]/.test(letter||"")){ i++; continue; }
        i++;
        let midi = 60 + LETTER_SEMI[letter.toUpperCase()];
        if (letter >= "a" && letter <= "g") midi += 12;
        while (s[i]===","||s[i]==="'"){ midi += s[i]==="'"?12:-12; i++; }
        let [mult, ni] = readDur(s, i); i = ni;
        const U = letter.toUpperCase();
        if (acc !== undefined){ midi += acc; measureAcc[U] = acc; }
        else if (measureAcc[U] !== undefined) midi += measureAcc[U];
        else if (ksig[U] !== undefined) midi += ksig[U];
        ev.push({ type:"note", midi, dur: mult * brokenNext, tie:false });
        brokenNext = 1;
      } else if (ch === 'z' || ch === 'x' || ch === 'Z'){
        i++; let [mult, ni] = readDur(s, i); i = ni;
        ev.push({ type:"rest", dur: mult }); brokenNext = 1;
      } else i++;
    }

    // pass 2: cumulative time → onsets (ties merge into previous note)
    const notes = [], chords = []; let t = 0, prevTie = false;
    for (const e of ev){
      if (e.type === "chord"){ const mm = chordMidis(e.name); if (mm) chords.push({ onset: t, midis: mm, name: e.name }); continue; }
      if (e.type === "rest"){ t += e.dur; prevTie = false; continue; }
      if (prevTie && notes.length){ notes[notes.length-1].dur += e.dur; t += e.dur; prevTie = e.tie; continue; }
      notes.push({ midi: e.midi, onset: t, dur: e.dur }); t += e.dur; prevTie = e.tie;
    }
    return { notes, chords, total: t, lq, meter: M, tempoQ: Q, tempoNote: tempoNoteQ(abc) };
  }

  const api = { melodyNotes, keyAccidentals, chordMidis };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcTune = api;
})(typeof window !== "undefined" ? window : globalThis);
