// under-notes.js — type one thing per note, the way words are typed on the Notation page (global UnderNotes).
// Reusable for anything that goes under or over notes: words, finger numbers, solfège, counting, scale degrees.
//
// Text rules (ABC's w: rules, as the Notation page's Words box):
//   spaces separate notes; "-" splits a word into syllables, one a note ("twin-kle" = 2 notes);
//   "_" holds the one before over the next note (that note gets null); "*" skips a note (null);
//   "|" jumps to the start of the next bar when bar lengths are given (opts.bars = notes in each bar), else is ignored.
//   opts.single: true = a run of digits is one token a digit ("11445" = 1 1 4 4 5), for finger numbers.
// UnderNotes.parse(text, opts) -> [token | null, ...] one per note, as far as the text goes.
// UnderNotes.attach(textarea, { notes: n | () => n, bars, single, unit: "fingers", hint: element, onChange(tokens) })
//   wires a textarea: on input it parses, writes "5 fingers for 14 notes" (and "N left over") into the hint,
//   and calls onChange. Returns { tokens(), refresh(), set(text) }.
// UnderNotes.format(tokens, opts) -> text (nulls as "*"), the reverse of parse.
(function (global) {
  "use strict";
  function parse(text, opts) {
    opts = opts || {};
    var out = [], bars = opts.bars, barStarts = null;
    if (bars) { barStarts = []; var s = 0; bars.forEach(function (n) { barStarts.push(s); s += n; }); }
    var src = String(text || "").replace(/\r/g, "");
    var re = /\||\S+/g, m;
    while ((m = re.exec(src))) {
      var w = m[0];
      if (w === "|") {
        if (barStarts) { var next = barStarts.filter(function (b) { return b >= out.length; })[0];   // a filled bar is already at the next start
          if (next != null) while (out.length < next) out.push(null); }
        continue;
      }
      // syllables: split after each "-" (kept off the token); "_" and "*" are notes of their own
      var parts = w.split(/(?<=-)|(?=_)|(?<=_)|(?=\*)|(?<=\*)/).filter(Boolean);
      parts.forEach(function (p) {
        if (p === "_" ) { out.push(null); return; }
        if (p === "*") { out.push(null); return; }
        p = p.replace(/-$/, "").replace(/_+$/, "");
        if (!p) return;
        if (opts.single && /^\d+$/.test(p)) { p.split("").forEach(function (d) { out.push(d); }); return; }
        out.push(p);
      });
    }
    return out;
  }
  function format(tokens) { return (tokens || []).map(function (t) { return t == null || t === "" ? "*" : String(t); }).join(" "); }
  function attach(ta, opts) {
    opts = opts || {};
    var unit = opts.unit || "syllables", hint = opts.hint || null, last = [];
    function count() { return typeof opts.notes === "function" ? opts.notes() : (opts.notes || 0); }
    function refresh() {
      last = parse(ta.value, { bars: typeof opts.bars === "function" ? opts.bars() : opts.bars, single: opts.single });
      var n = count(), k = last.length;
      if (hint) hint.textContent = k ? k + " " + unit + " for " + n + " notes" + (k > n && n ? ": " + (k - n) + " left over" : "") : "";
      return last;
    }
    ta.addEventListener("input", function () { refresh(); if (opts.onChange) opts.onChange(last.slice()); });
    refresh();
    return { tokens: function () { return last.slice(); }, refresh: refresh, set: function (t) { ta.value = t; refresh(); } };
  }
  global.UnderNotes = { parse: parse, format: format, attach: attach };
  if (typeof module !== "undefined") module.exports = global.UnderNotes;
})(typeof window !== "undefined" ? window : globalThis);
