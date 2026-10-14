// abc-core.js — the pieces of ABC reading that the assessment parsers share.
// Plain script, one global (AbcCore); loads in Node for tests. No dependencies.
// abc-pitch.js, abc-rhythm.js and abc-tune.js are thin wrappers over this, and each still returns exactly
// what it did before (tests/abc/compare.js checks that against frozen copies of the old parsers).
//
//   AbcCore.musicText(abc, skip)          -> the music lines joined with spaces; `skip` is a regex for lines to drop
//   AbcCore.tokens(text, { pitched, quotes }) -> [{ t, i, ... }] one token per thing the parsers act on:
//       note  { letter, acc, oct, mult }  acc: undefined (none written) | semitones; oct: semitones from octave marks
//       rest  { ch, mult }   bar { ch }   broken { ch }   tie   quote { text }   stray (accidental with no note)
//     pitched:false reads letters without accidentals or octave marks (the rhythm patterns' looser dialect);
//     quotes:false leaves quoted text unread, so its letters count as notes (again the rhythm dialect).
//   AbcCore.readDur(s, i)                 -> [multiplier, nextIndex]   "3/2" -> 1.5, "/" -> 0.5, "" -> 1
//   AbcCore.lUnitQuarters(abc, dflt)      -> quarter notes per L: unit
//   AbcCore.meter(abc)                    -> { n, d }  (4/4 when absent)
//   AbcCore.tempoQ(abc), tempoNoteQ(abc), keyField(abc)
//   AbcCore.keyAccidentals(key)           -> { F: 1, C: 1 } for any major key or mode
//   AbcCore.noteMidi(tok, ksig, measureAcc) -> MIDI; measureAcc (or null) carries accidentals to the barline
//   AbcCore.chordMidis(name)              -> chord symbol as a close chord around C3, or null
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

  function musicText(abc, skip){
    const out = [];
    for (const raw of abc.split("\n")){
      const line = raw.trim();
      if (!line || skip.test(line)) continue;
      out.push(line);
    }
    return out.join(" ");
  }

  function readDur(s, i){
    let num = "";
    while (i < s.length && /[0-9]/.test(s[i])) { num += s[i]; i++; }
    let mult = num ? parseInt(num, 10) : 1;
    if (s[i] === "/"){
      i++;
      let den = "";
      while (i < s.length && /[0-9]/.test(s[i])) { den += s[i]; i++; }
      mult = mult / (den ? parseInt(den, 10) : 2);
    }
    return [mult, i];
  }

  function tokens(s, opts){
    const pitched = !opts || opts.pitched !== false, quotes = !opts || opts.quotes !== false;
    const decos = !!(opts && opts.decorations);   // opt-in: "!style=rhythm!" etc. become { t:"deco", text } (off: read as before)
    const fields = !!(opts && opts.fields);       // opt-in: inline "[K:D]" "[M:3/4]" become { t:"field", name, value } (off: read as before)
    const out = [];
    let i = 0;
    while (i < s.length){
      const ch = s[i], at = i;
      if (ch === '"' && quotes){
        i++; let text = "";
        while (i < s.length && s[i] !== '"'){ text += s[i]; i++; }
        i++;
        out.push({ t:"quote", i:at, text });
      } else if (ch === "!" && decos){
        const end = s.indexOf("!", i + 1);
        if (end < 0){ i++; continue; }
        out.push({ t:"deco", i:at, text: s.slice(i + 1, end) }); i = end + 1;
      } else if (fields && ch === "[" && /^\[[A-Za-z]:/.test(s.slice(i, i + 3))){
        const end = s.indexOf("]", i);
        if (end < 0){ i++; continue; }
        out.push({ t:"field", i:at, name: s[i + 1], value: s.slice(i + 3, end).trim() }); i = end + 1;
      } else if (ch === "|" || ch === "]" || ch === "["){
        out.push({ t:"bar", i:at, ch }); i++;
      } else if (ch === ">" || ch === "<"){
        out.push({ t:"broken", i:at, ch }); i++;
      } else if (ch === "-"){
        out.push({ t:"tie", i:at }); i++;
      } else if (pitched && (ch === "^" || ch === "_" || ch === "=" || /[A-Ga-g]/.test(ch))){
        let acc;
        while (s[i] === "^" || s[i] === "_" || s[i] === "="){
          if (s[i] === "=") acc = 0; else acc = (acc === undefined ? 0 : acc) + (s[i] === "^" ? 1 : -1);
          i++;
        }
        const letter = s[i];
        if (!/[A-Ga-g]/.test(letter || "")){ out.push({ t:"stray", i:at }); i++; continue; }   // the char after is skipped too
        i++;
        let oct = 0;
        while (s[i] === "," || s[i] === "'"){ oct += s[i] === "'" ? 12 : -12; i++; }
        const [mult, ni] = readDur(s, i); i = ni;
        out.push({ t:"note", i:at, letter, acc, oct, mult });
      } else if (!pitched && /[A-Ga-g]/.test(ch)){
        i++;
        const [mult, ni] = readDur(s, i); i = ni;
        out.push({ t:"note", i:at, letter:ch, acc:undefined, oct:0, mult });
      } else if (ch === "z" || ch === "x" || ch === "Z"){
        i++;
        const [mult, ni] = readDur(s, i); i = ni;
        out.push({ t:"rest", i:at, ch, mult });
      } else i++;
    }
    return out;
  }

  function lUnitQuarters(abc, dflt){
    const m = /^L:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc);
    return m ? (parseInt(m[1], 10) / parseInt(m[2], 10)) * 4 : dflt;
  }
  function meter(abc){
    const m = /^M:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc);
    return m ? { n: parseInt(m[1], 10), d: parseInt(m[2], 10) } : { n: 4, d: 4 };
  }
  // Raw BPM from Q: (e.g. "Q:3/8=100" → 100). Use with tempoNoteQ to convert to quarter-BPM.
  function tempoQ(abc){ const m = /^Q:\s*\d+\/\d+\s*=\s*(\d+)/m.exec(abc); return m ? +m[1] : 100; }
  // Note value of Q: in quarter notes (e.g. "Q:3/8=…" → 1.5, "Q:1/4=…" → 1, default 1).
  function tempoNoteQ(abc){ const m = /^Q:\s*(\d+)\s*\/\s*(\d+)\s*=/m.exec(abc); return m ? (+m[1]/+m[2])*4 : 1; }
  function keyField(abc){ const m = /^K:\s*(.+)$/m.exec(abc); return m ? m[1] : "C"; }

  function keyAccidentals(keyStr){
    const m = /^([A-Ga-g])([#b]?)\s*([A-Za-z]*)/.exec((keyStr || "").trim());
    if (!m) return {};
    const tonic = m[1].toUpperCase() + (m[2] || "");
    const mode = (m[3] || "maj").toLowerCase();
    let fifths = MAJOR_FIFTHS[tonic];
    if (fifths === undefined) fifths = 0;
    fifths += (MODE_FIFTHS[mode] !== undefined ? MODE_FIFTHS[mode] : 0);
    const acc = {};
    if (fifths > 0) for (let i = 0; i < fifths && i < 7; i++) acc[SHARP_ORDER[i]] = 1;
    else if (fifths < 0) for (let i = 0; i < -fifths && i < 7; i++) acc[FLAT_ORDER[i]] = -1;
    return acc;
  }

  // A note token's MIDI number. A written accidental wins, then one earlier in the bar (when measureAcc is given;
  // the written one is recorded there), then the key signature.
  function noteMidi(tok, ksig, measureAcc){
    const U = tok.letter.toUpperCase();
    let midi = 60 + LETTER_SEMI[U] + tok.oct;
    if (tok.letter >= "a" && tok.letter <= "g") midi += 12;
    if (tok.acc !== undefined){ midi += tok.acc; if (measureAcc) measureAcc[U] = tok.acc; }
    else if (measureAcc && measureAcc[U] !== undefined) midi += measureAcc[U];
    else if (ksig[U] !== undefined) midi += ksig[U];
    return midi;
  }

  // Chord symbol (e.g. "Bb", "F7", "Cm", "Gm7", "Cmaj7") -> MIDI notes in the C3
  // region. Returns null for non-chord annotations ("^text", fingerings, etc.).
  function chordMidis(name){
    const m = /^([A-G])([#b]?)(.*)$/.exec((name || "").trim());
    if (!m) return null;
    let root = LETTER_SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    root = ((root % 12) + 12) % 12;
    const q = m[3] || "";
    let iv;
    if (/^(maj7|M7|Δ)/.test(q))        iv = [0,4,7,11];
    else if (/^m7/.test(q))            iv = [0,3,7,10];
    else if (/^(min|m)(?!aj)/.test(q)) iv = [0,3,7];
    else if (/^(dim|°|o)/.test(q))     iv = [0,3,6];
    else if (/^(aug|\+)/.test(q))      iv = [0,4,8];
    else if (/7/.test(q))              iv = [0,4,7,10];
    else                               iv = [0,4,7];
    const base = 48 + root;            // C3 region, below the melody
    return iv.map(i => base + i);
  }

  const api = { musicText, tokens, readDur, lUnitQuarters, meter, tempoQ, tempoNoteQ, keyField,
                keyAccidentals, noteMidi, chordMidis, LETTER_SEMI };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcCore = api;
})(typeof window !== "undefined" ? window : globalThis);
