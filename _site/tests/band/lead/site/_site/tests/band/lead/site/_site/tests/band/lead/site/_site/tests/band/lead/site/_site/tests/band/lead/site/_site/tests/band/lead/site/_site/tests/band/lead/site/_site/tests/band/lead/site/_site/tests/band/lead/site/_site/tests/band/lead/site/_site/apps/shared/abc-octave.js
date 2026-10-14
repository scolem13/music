// abc-octave.js — move every note of an ABC tune up or down whole octaves by rewriting the
// note letters and octave marks. Chord symbols, "annotations", !decorations!, +decorations+,
// inline fields like [K:..] and whole field/comment lines (X:, w:, %%...) are left alone.
// Used by the Tune Assessment octave control and by scripts/clean-tunes.mjs.
//
//   AbcOctave.shift(abc, 1)    // up one octave
//   AbcOctave.shift(abc, -2)   // down two
(function (global) {
  const NOTE_TOKEN = /"(?:[^"\\]|\\.)*"|![^!\n]*!|\+[^+\n]*\+|\[[A-Za-z]:[^\]\n]*\]|(\^{1,2}|_{1,2}|=)?([A-Ga-g])([',]*)/g;
  function step(letter, marks, dir) {
    if (dir > 0) { if (letter < "a") { if (marks.includes(",")) marks = marks.slice(1); else letter = letter.toLowerCase(); } else marks += "'"; }
    else         { if (letter >= "a") { if (marks.includes("'")) marks = marks.slice(1); else letter = letter.toUpperCase(); } else marks += ","; }
    return [letter, marks];
  }
  function shift(abc, k) {
    k = Math.trunc(k) || 0;
    if (!k) return abc;
    return abc.split("\n").map(l => /^[A-Za-z]:|^%/.test(l) ? l : l.replace(NOTE_TOKEN, (m, acc, letter, marks) => {
      if (!letter) return m;                                      // chord symbol, decoration or inline field
      marks = marks || "";
      for (let i = 0; i < Math.abs(k); i++) [letter, marks] = step(letter, marks, k);
      return (acc || "") + letter + marks;
    })).join("\n");
  }
  const api = { shift };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.AbcOctave = api;
})(typeof window !== "undefined" ? window : this);
