// abc-pitch.js
// Extract the V1 (melody) voice of one pattern's ABC as MIDI note numbers.
// These are the grading targets for the assessment app.
//
// Scope: the constrained ABC dialect used in pattern-object.js —
//   - keys C major / C minor (written "C", "Cm", and the stray "C)"/"Cm)")
//   - single notes (no chords beyond "..." chord-symbol annotations, which are ignored)
//   - octave marks: ',' down an octave, "'" up an octave
//   - explicit accidentals: ^ sharp, _ flat, = natural (override the key signature)
//   - trailing duration digits / fractions (ignored — pitch only)
//   - "w:" lyric (solfège) lines (ignored here; surfaced separately by the UI)
// Convention: middle C (ABC uppercase "C") = MIDI 60.
//
// Note: accidentals are applied per-note. ABC's "accidental persists to the end
// of the measure" rule is NOT modelled — the patterns are 1–5 notes and re-state
// accidentals where needed, so this is exact for the current data.

(function (global) {
  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // Key signature -> per-letter semitone offset. Only C major / C natural minor
  // appear in the data; C natural minor flattens E, A, B.
  function keySignature(keyField) {
    const m = /^([A-Ga-g])([#b]?)\s*(m|min|minor)?/.exec((keyField || "").trim());
    const isMinor = !!(m && m[3]);
    return isMinor ? { E: -1, A: -1, B: -1 } : {};
  }

  // Pull the key + concatenated V1 note text out of a single tune's ABC.
  function extractVoice1(abc) {
    let key = "C";
    const parts = [];
    for (const raw of abc.split("\n")) {
      const line = raw.trim();
      if (/^K:/.test(line)) { key = line.slice(2).trim(); continue; }
      if (/^w:/.test(line)) continue;                       // lyrics
      const v = /^\[V:\s*([^\]]+)\]/.exec(line);
      if (v) {
        if (v[1].trim() === "V1") parts.push(line.slice(v[0].length));
        continue;                                           // V2/V3 etc. skipped
      }
      // X:, T:, M:, %% ... and blank lines: ignored
    }
    return { key, content: parts.join(" ") };
  }

  // Tokenize note content into MIDI numbers.
  function contentToMidi(content, keyField) {
    const ksig = keySignature(keyField);
    const out = [];
    let i = 0;
    while (i < content.length) {
      const ch = content[i];
      if (ch === '"') {                                     // skip "chord"/annotation
        i++;
        while (i < content.length && content[i] !== '"') i++;
        i++;
        continue;
      }
      if (ch === "^" || ch === "_" || ch === "=" || /[A-Ga-g]/.test(ch)) {
        // accidental(s)
        let acc; // undefined => fall back to key signature
        while (content[i] === "^" || content[i] === "_" || content[i] === "=") {
          if (content[i] === "=") acc = 0;
          else acc = (acc === undefined ? 0 : acc) + (content[i] === "^" ? 1 : -1);
          i++;
        }
        const letter = content[i];
        if (!/[A-Ga-g]/.test(letter || "")) { i++; continue; } // stray accidental
        i++;
        let midi = 60 + LETTER_SEMITONE[letter.toUpperCase()];
        if (letter >= "a" && letter <= "g") midi += 12;     // lowercase = octave up
        while (content[i] === "," || content[i] === "'") {   // octave marks
          midi += content[i] === "'" ? 12 : -12;
          i++;
        }
        while (i < content.length && /[0-9/]/.test(content[i])) i++; // duration
        const L = letter.toUpperCase();
        if (acc !== undefined) midi += acc;
        else if (ksig[L] !== undefined) midi += ksig[L];
        out.push(midi);
      } else {
        i++;                                                // spaces, bars, etc.
      }
    }
    return out;
  }

  // Public: ABC for one tune -> array of MIDI numbers for its V1 melody.
  function melodyMidi(abc) {
    const { key, content } = extractVoice1(abc);
    return contentToMidi(content, key);
  }

  const api = { melodyMidi, extractVoice1, contentToMidi };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcPitch = api;
})(typeof window !== "undefined" ? window : globalThis);
