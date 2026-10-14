// abc-pitch.js
// Extract the V1 (melody) voice of one pattern's ABC as MIDI note numbers.
// These are the grading targets for the assessment app.
// Reads the notes with AbcCore (apps/shared/abc-core.js, which a page loads first).
//
// Scope: the constrained ABC dialect used in pattern-object.js —
//   - any key or mode in K: (a stray ")" after it is ignored)
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
// Key signature: any key or mode AbcCore.keyAccidentals knows (G, Bb, Dm, Ddor, Gmix ...), as the staff shows it.
// (Before 2026-10-14 only C major / C minor were known; the old grades for other keys expected the wrong pitches.)

(function (global) {
  const Core = global.AbcCore || (typeof require === "function" ? require("../shared/abc-core.js") : null);
  if (!Core) throw new Error("abc-pitch.js needs /apps/shared/abc-core.js loaded before it");

  // Key field -> per-letter semitone offset ({ F: 1, C: 1 } for D major).
  function keySignature(keyField) { return Core.keyAccidentals((keyField || "").trim()); }

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
    return Core.tokens(content).filter(t => t.t === "note").map(t => Core.noteMidi(t, ksig, null));
  }

  // Pitch class (0-11) of the key's tonic, from the K: field ("D" -> 2, "Bbm" -> 10, "F#" -> 6).
  function tonicPc(keyField) {
    const m = /^([A-Ga-g])([#b]?)/.exec((keyField || "").trim());
    if (!m) return 0;
    return (((Core.LETTER_SEMI[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)) % 12) + 12) % 12;
  }

  // Public: ABC for one tune -> array of MIDI numbers for its V1 melody.
  function melodyMidi(abc) {
    const { key, content } = extractVoice1(abc);
    return contentToMidi(content, key);
  }

  const api = { melodyMidi, keySignature, tonicPc, extractVoice1, contentToMidi };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcPitch = api;
})(typeof window !== "undefined" ? window : globalThis);
