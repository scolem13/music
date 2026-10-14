// LyricAlign: put the words of a song under its notes, as ABC `w:` lines.
// Plain script, one global; loads in Node for tests. The browser twin of carols/tools/lyrics_align.py: the same rules, checked
// against abcjs (which draws the pages):
//   * a rest takes no syllable; the second half of a tied note takes a `*`; draft writes no `|`, but a `|` you type in the w: line starts the next bar,
//     so a bar with too few syllables does not push the rest of the line out of place (too many still spill into the next bar);
//   * a word's syllables come from the dictionary (syllables-en.js, made from CMUdict and hyphenation patterns by
//     carols/tools/export_syllables.py), from your own corrections (setOverrides), or, for a word in neither, from its vowels.
//
//   LyricAlign.load(url)                 -> Promise: fetch the dictionary (a 1.2 MB script) once; everything works without it, less well
//   LyricAlign.setOverrides({ holy: "ho-ly" })
//   LyricAlign.splitWord("holy")         -> { pieces: ["ho","ly"], how: "override" | "dict" | "guess" }
//   LyricAlign.syllabify(text, guesses)  -> [[syllable, joinedToNext]]; punctuation rides on the ends of a word
//   LyricAlign.slots(musicLine, { slurMelisma }, carryTie) -> { bars: [["note"|"tie"|"melisma"]], tie }
//   LyricAlign.draft(musicLines, wordLines, { slurMelisma }) -> { lines: ["w: ..." or ""], notes: [what did not fit], guesses: { word: "split" } }
//   LyricAlign.check(musicLines, wLines) -> ["line 2, bar 3: 5 syllables for 4 notes", ...]
//   LyricAlign.sungText("w: ho-ly | night *") -> "holy night"
//   LyricAlign.differs(wLines, wordLines) -> null, or a sentence saying where the w: lines and the words part company
(function (global) {
  "use strict";
  var dict = null, loading = null, overrides = {};

  function load(url) {
    if (dict || typeof document === "undefined") return Promise.resolve(!!dict);
    if (loading) return loading;
    loading = new Promise(function (resolve) {
      var s = document.createElement("script"); s.src = url;
      s.onload = function () { adopt(global.SyllablesEN); resolve(!!dict); };
      s.onerror = function () { loading = null; resolve(false); };
      document.head.appendChild(s);
    });
    return loading;
  }
  // { multi: "a-ban-don ...", mono: "the and ..." }
  function adopt(data) {
    if (!data) return;
    var d = Object.create(null);
    String(data.multi || "").split(" ").forEach(function (w) { if (w) d[w.replace(/-/g, "")] = w; });
    String(data.mono || "").split(" ").forEach(function (w) { if (w) d[w] = w; });
    dict = d;
  }
  function setOverrides(map) { overrides = {}; Object.keys(map || {}).forEach(function (k) { overrides[k.toLowerCase()] = String(map[k]).toLowerCase(); }); }

  // the vowels, with the accented ones of the European languages the carols are sung in (ä ö ü é è à å ø œ ...)
  var VOW = "aeiouy\u00e0-\u00e6\u00e8-\u00ef\u00f2-\u00f6\u00f8-\u00fd\u00ff\u0153";
  // split points between vowel groups: VCV -> V-CV, VCCV -> VC-CV
  function vowelCuts(word) {
    var re = new RegExp("[" + VOW + "]+", "g"), groups = [], m, cuts = [], low = word.toLowerCase();
    while ((m = re.exec(low))) groups.push({ a: m.index, z: m.index + m[0].length });
    for (var i = 0; i + 1 < groups.length; i++) {
      var gap = groups[i + 1].a - groups[i].z;
      cuts.push(gap <= 0 ? groups[i].z : gap === 1 ? groups[i + 1].a - 1 : groups[i].z + 1);
    }
    return cuts;
  }
  // a word in no dictionary: its vowel groups, less a silent final e ("time", but not "little")
  function guessCount(low) {
    var n = (low.match(new RegExp("[" + VOW + "]+", "g")) || []).length;
    if (n > 1 && /[^aeiouy]e$/.test(low) && !/[^aeiouy]le$/.test(low)) n--;
    if (n > 1 && /[^aeiouytd]ed$/.test(low)) n--;                     // "walked", not "wanted"
    return Math.max(1, n);
  }
  function cut(word, cuts) { var out = [], at = 0; cuts.concat([word.length]).forEach(function (c) { if (c > at) out.push(word.slice(at, c)); at = c; }); return out; }
  function applySpec(word, spec) { var cuts = [], at = 0; spec.split("-").slice(0, -1).forEach(function (p) { at += p.length; cuts.push(at); }); return cut(word, cuts); }

  function splitWord(word) {
    var low = word.toLowerCase().replace(/\u2019/g, "'");
    var o = overrides[low];
    if (o && o.replace(/-/g, "") === low) return { pieces: applySpec(word, o), how: "override" };
    var d = dict && (dict[low] || dict[low.replace(/'s?$/, "")]);
    if (d) { var spec = d.replace(/-/g, "") === low ? d : d + low.slice(d.replace(/-/g, "").length); return { pieces: applySpec(word, spec), how: "dict" }; }
    var n = guessCount(low);
    if (n === 1) return { pieces: [word], how: "guess" };
    return { pieces: cut(word, vowelCuts(word).slice(0, n - 1)), how: "guess" };
  }

  var TOKEN = /^(\P{L}*)(\p{L}[\p{L}\p{M}'\u2019\-]*)(\P{L}*)$/u;      // (any alphabet's letters: "Blätter" is one word)
  function syllabify(text, guesses) {
    var out = [];
    String(text || "").split(/\s+/).forEach(function (tok) {
      var m = TOKEN.exec(tok.normalize ? tok.normalize("NFC") : tok); if (!m) return;                        // a dash, a number, stray marks
      var pieces = [];
      m[2].split("-").forEach(function (part) {
        part = part.replace(/^['\u2019]+|['\u2019]+$/g, ""); if (!part) return;
        var r = splitWord(part);
        if (r.how === "guess" && r.pieces.length > 1 && guesses) guesses[part.toLowerCase()] = r.pieces.join("-");
        pieces = pieces.concat(r.pieces);
      });
      if (!pieces.length) return;
      pieces[0] = m[1] + pieces[0]; pieces[pieces.length - 1] += m[3];
      pieces.forEach(function (p, i) { out.push([p.replace(/[|*_~\\]/g, ""), i < pieces.length - 1]); });
    });
    return out;
  }

  // ---- the melody: the places in each bar that want a syllable ----
  function afterNote(line, i) {
    while (i < line.length && ",'/0123456789<>".indexOf(line[i]) >= 0) i++;
    if (line[i] === "-") i++;
    return i;
  }
  function slots(line, o, carryTie) {
    o = o || {};
    var bars = [], cur = [], tie = !!carryTie, slur = 0, first = false, i = 0, n = line.length, j, c;
    function note() { if (tie) { cur.push("tie"); tie = false; } else if (o.slurMelisma && slur && !first) cur.push("melisma"); else cur.push("note"); first = false; }
    function endbar() { if (cur.length) bars.push(cur); cur = []; }
    while (i < n) {
      c = line[i];
      if (c === "%") break;
      if (c === '"') { j = line.indexOf('"', i + 1); i = (j > 0 ? j : n) + 1; continue; }
      if (c === "!" || c === "+") { j = line.indexOf(c, i + 1); i = (j > 0 ? j : i) + 1; continue; }
      if (c === "{") { j = line.indexOf("}", i + 1); i = (j > 0 ? j : n) + 1; continue; }
      if (c === "[") {
        if (i + 1 < n && (/\d/.test(line[i + 1]) || line[i + 1] === ":" || line[i + 1] === "|")) { i++; continue; }      // [1  [2  [|
        if (i + 2 < n && /[A-Za-z]/.test(line[i + 1]) && line[i + 2] === ":") { j = line.indexOf("]", i); i = (j > 0 ? j : n) + 1; continue; }   // [K:G]
        j = line.indexOf("]", i); j = j > 0 ? j : n - 1; note(); i = afterNote(line, j + 1); if (line[i - 1] === "-") tie = true; continue;
      }
      if (c === "|" || c === ":") { endbar(); i++; continue; }
      if (c === "(") {
        if (i + 1 < n && /\d/.test(line[i + 1])) { i += 2; while (i < n && "0123456789:".indexOf(line[i]) >= 0) i++; }
        else { slur++; first = true; i++; }
        continue;
      }
      if (c === ")") { slur = Math.max(0, slur - 1); i++; continue; }
      if ("^_=".indexOf(c) >= 0 || /[A-Ga-g]/.test(c)) {
        while (i < n && "^_=".indexOf(line[i]) >= 0) i++;
        if (i < n && /[A-Ga-g]/.test(line[i])) { note(); i = afterNote(line, i + 1); if (line[i - 1] === "-") tie = true; }
        continue;
      }
      i++;
    }
    endbar();
    return { bars: bars, tie: tie };
  }

  function joinTokens(toks) { var out = ""; toks.forEach(function (t) { out += (!out || /-$/.test(out)) ? t : " " + t; }); return out; }

  // o.head: the first syllables of these words are sung before this music starts (on pickup notes at the end of the section before), so they
  // are left out here. o.tail / o.tailWords: the last o.tail notes of this music are the pickup of the next section, and take its first syllables.
  function draft(musicLines, wordLines, o) {
    o = o || {};
    var notes = [], guesses = {}, tie = false;
    var per = musicLines.map(function (ln) { var r = slots(ln, o, tie); tie = r.tie; return r.bars; });
    var sung = per.map(function (bars) { var k = 0; bars.forEach(function (b) { b.forEach(function (s) { if (s === "note") k++; }); }); return k; });
    var words = (wordLines || []).filter(function (t) { return /[A-Za-z]/.test(t); });
    var syl = words.map(function (t) { return syllabify(t, guesses); }), head = Math.max(0, o.head | 0), tailN = Math.max(0, o.tail | 0), tailAt = -1, tailSyl = [];
    syl.forEach(function (line) { while (head > 0 && line.length) { line.shift(); head--; } });
    if (tailN) { for (var ti = sung.length - 1; ti >= 0; ti--) if (sung[ti]) { tailN = Math.min(tailN, sung[ti]); sung[ti] -= tailN; tailAt = ti; break; }
      if (tailAt < 0) tailN = 0;
      tailSyl = [].concat.apply([], (o.tailWords || []).filter(function (t) { return /[A-Za-z]/.test(t); }).map(function (t) { return syllabify(t, guesses); })).slice(0, tailN); }
    var flat = [].concat.apply([], syl);
    var singing = sung.filter(function (c) { return c; }).length, queues = [];
    if (words.length === singing && words.length > 1) {                 // as many lines of words as of music: line by line, so a miscount stays in its line
      var k = 0;
      sung.forEach(function (cnt) {
        if (!cnt) { queues.push([]); return; }
        if (syl[k].length !== cnt) notes.push('"' + words[k].slice(0, 36) + '": ' + syl[k].length + " syllables for " + cnt + " notes");
        queues.push(syl[k].slice()); k++;
      });
    } else {
      var pool = flat.slice(), total = 0;
      sung.forEach(function (cnt) { queues.push(pool.splice(0, cnt)); total += cnt; });
      if (pool.length) notes.push(pool.length + " syllable" + (pool.length === 1 ? "" : "s") + ' left over after the last note ("' + pool[0][0] + '\u2026")');
      if (total > flat.length && flat.length) notes.push((total - flat.length) + " note" + (total - flat.length === 1 ? " has" : "s have") + " no syllable");
    }
    if (tailAt >= 0 && tailN) { var tq = queues[tailAt]; tq.length = Math.min(tq.length, sung[tailAt]); while (tq.length < sung[tailAt]) tq.push(null);
      for (var tk = 0; tk < tailN; tk++) tq.push(tailSyl[tk] || null); }
    var lines = per.map(function (bars, idx) {
      var q = queues[idx], outBars = bars.map(function (bar) {
        return bar.map(function (s) { if (s === "tie") return "*"; if (s === "melisma") return "_"; var x = q.shift(); return x ? x[0] + (x[1] ? "-" : "") : "*"; });
      });
      // no barlines: a `|` makes every syllable moved across a bar a second edit; trailing `*`s (a tie or an unsung note at the
      // end of the phrase) are left off, so nothing after them can be pushed about
      var toks = [].concat.apply([], outBars);
      while (toks.length && toks[toks.length - 1] === "*") toks.pop();
      return toks.length ? "w: " + joinTokens(toks) : "";
    });
    if (!flat.length && !tailSyl.length) lines = lines.map(function () { return ""; });
    return { lines: lines, notes: notes, guesses: guesses };
  }

  // syllables in each bar of a w: line (a syllable, `*` and `_` each take a note)
  function wBars(w) { return String(w || "").replace(/^\s*w:/, "").split("|").map(function (seg) { var k = 0; seg.trim().split(/\s+/).forEach(function (tok) { if (!tok) return;
    if (/^_+$/.test(tok)) { k += tok.length; return; }
    k += tok.split(/-(?=.)/).length + (tok.match(/_/g) || []).length; }); return k; }); }      // ("now_" is a syllable and a note more)
  function check(musicLines, wLines, o) {
    var out = [], tie = false;
    musicLines.forEach(function (ln, i) {
      var r = slots(ln, o, tie); tie = r.tie;
      var w = (wLines || [])[i]; if (!w || !/\S/.test(String(w).replace(/^\s*w:/, ""))) return;
      var got = wBars(w);
      if (got.length === 1) {                         // a w: line without barlines: count the whole line
        var all = 0; r.bars.forEach(function (b) { all += b.length; });
        if (got[0] > all) out.push("line " + (i + 1) + ": " + got[0] + " syllables for " + all + " note" + (all === 1 ? "" : "s"));
        return;
      }
      got.forEach(function (have, b) {
        var want = r.bars[b] ? r.bars[b].length : 0;
        if (b >= r.bars.length) { if (have) out.push("line " + (i + 1) + ": the words have a bar " + (b + 1) + ", the music does not"); }
        else if (have > want) out.push("line " + (i + 1) + ", bar " + (b + 1) + ": " + have + " syllables for " + want + " note" + (want === 1 ? "" : "s"));
      });
    });
    return out;
  }
  function sungText(w) {
    var out = [], joined = false;
    String(w || "").replace(/^\s*w:/, "").replace(/\|/g, " ").split(/\s+/).forEach(function (tok) {
      if (!tok || tok === "*" || tok === "_" || tok === "-") return;
      tok.replace(/~/g, " ").split(/-(?=.)/).forEach(function (t, k, all) {
        var cont = /-$/.test(t) || k < all.length - 1; t = t.replace(/[-_*]+$/, "");
        if (joined && out.length) out[out.length - 1] += t; else out.push(t);
        joined = cont;
      });
    });
    return out.join(" ");
  }
  function letters(s) { return String(s).toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z']/g, ""); }
  function differs(wLines, wordLines) {
    var a = letters((wLines || []).map(sungText).join(" ")), b = letters((wordLines || []).join(" "));
    if (!a || !b || a === b) return null;
    var i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (i >= a.length) return 'The words under the notes stop before the words of the section do: "' + b.slice(i, i + 16) + '\u2026" is not under a note.';
    return 'The words under the notes and the words of the section differ after "\u2026' + a.slice(Math.max(0, i - 14), i) + '": "' + a.slice(i, i + 12) + '" under the notes, "' + b.slice(i, i + 12) + '" in the words.';
  }

  global.LyricAlign = { load: load, adopt: adopt, setOverrides: setOverrides, splitWord: splitWord, syllabify: syllabify, slots: slots, draft: draft, check: check, sungText: sungText, differs: differs };
})(typeof window !== "undefined" ? window : globalThis);
