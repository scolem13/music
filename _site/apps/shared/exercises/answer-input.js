// answer-input.js — how a student writes notes as an answer. One interface, several kinds, so an exercise doesn't care which is used:
//   AnswerInput.create(kind, host, { count, voice, hint, onChange(midis) }) -> { value() -> [midi | null], set(text), focus(), destroy() }
//   AnswerInput.kinds() -> the names registered ("inline"; a page can register more, e.g. "notation" for the Notation page window)
//   AnswerInput.register(kind, { label, create(host, opts) })
// "inline": a text box of note names with octaves (F#4 G4 A4, middle C = C4), read as you type; the exercise draws them in its score.
(function (global) {
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], KINDS = {};
  function parseNote(t) {   // "F#4", "Bb3", "c5" -> midi, or null
    var m = /^([A-Ga-g])(##|bb|x|#|b|♯|♭|𝄪|𝄫)?(-?\d)$/.exec(t); if (!m) return null;
    var a = { "": 0, "#": 1, "♯": 1, "b": -1, "♭": -1, "##": 2, "x": 2, "𝄪": 2, "bb": -2, "𝄫": -2 }[m[2] || ""];
    return 12 * (+m[3] + 1) + NAT[LET.indexOf(m[1].toUpperCase())] + a;
  }
  function parseList(t) { return String(t || "").trim().split(/[\s,]+/).filter(Boolean).map(parseNote); }
  KINDS.inline = { label: "Type the notes here", create: function (host, o) {
    var wrap = document.createElement("div"); wrap.className = "ai-inline";
    var lab = document.createElement("label"); lab.textContent = o.hint || ("Notes (" + o.count + "), with octaves: ");
    var inp = document.createElement("input"); inp.type = "text"; inp.className = "form-control ai-notes"; inp.spellcheck = false; inp.autocomplete = "off";
    inp.placeholder = "e.g. " + ["E4", "D4", "C#4", "D4"].slice(0, Math.max(1, Math.min(4, o.count))).join(" ");
    var msg = document.createElement("div"); msg.className = "ai-msg";
    lab.appendChild(inp); wrap.appendChild(lab); wrap.appendChild(msg); host.appendChild(wrap);
    function value() { var v = parseList(inp.value); while (v.length < o.count) v.push(null); return v.slice(0, o.count); }
    inp.addEventListener("input", function () {
      var raw = parseList(inp.value), bad = raw.filter(function (x) { return x == null; }).length;
      msg.textContent = bad ? "Write each note as a letter, an optional # or b, and an octave number (middle C is C4)." : raw.length > o.count ? "Only " + o.count + " notes are needed." : "";
      if (o.onChange) o.onChange(value());
    });
    return { value: value, set: function (t) { inp.value = t; inp.dispatchEvent(new Event("input")); }, focus: function () { inp.focus(); }, destroy: function () { wrap.remove(); }, el: wrap };
  } };
  global.AnswerInput = {
    create: function (kind, host, o) { return (KINDS[kind] || KINDS.inline).create(host, o || {}); },
    kinds: function () { return Object.keys(KINDS); },
    label: function (k) { return KINDS[k] ? KINDS[k].label : k; },
    register: function (kind, def) { KINDS[kind] = def; },
    parseNote: parseNote, parseList: parseList
  };
})(typeof window !== "undefined" ? window : globalThis);
