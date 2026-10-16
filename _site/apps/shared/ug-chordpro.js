// ug-chordpro.js — Ultimate Guitar (chords over words) into ChordPro, for Timestamp Notes and the Notation page.
// Plain script, one global (UgChordPro); loads in Node for tests (tests/abc/ug-chordpro.test.js).
//
// Reads what a UG page gives when copied: "[Verse 1]" headings, a line of chords above the words they fall on, chord-only
// lines (intros, turnarounds), "[ch]G[/ch]" / "[tab]" tags from the page source, "Capo 3", "Tuning:", tab staves (dropped).
// Like ultimateguitartochordpro.com it puts each chord inline before the syllable under it; unlike it, it keeps what the
// rest of this site needs: section headings as {start_of_verse: Verse 1} (the Notation page makes them sections, Timestamp
// Notes stamps them), chord-only lines as bars ("[G] | [C] | [D]"); a heading's "x2" is kept as the section's times.
//
//   UgChordPro.convert(text, { title, key, meter }) -> { chordpro, sections: [{ name, chords: [names], lines }], capo }
//   UgChordPro.isChord(token)  UgChordPro.isChordLine(line)
//   UgChordPro.fitBars(chordpro, barsPerSection: { "Verse 1": 8, Chorus: [8, 0, 9] ... }) -> { chordpro, notes: [text] }
//     (a list gives the count for each time the section comes; a 0 there borrows the first count given)
//     spreads each section's chords over the bars tapped for it: one a bar when the counts match, n bars each when the bars
//     are a multiple of the chords; otherwise left alone, with a note saying so.
(function (global) {
  "use strict";
  const CHORD = /^\(?[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add|°|ø|\+|-)?[0-9]*(?:(?:maj|add|sus|b|#|\+|-|no)[0-9]+)*(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?\)?$/;
  const NOISE = /^(N\.?C\.?|x\d+|\d+x|\||-+|\/|%|\.\.\.?)$/i;
  const KIND = name => /chorus|refrain|hook/i.test(name) ? "chorus" : /bridge|middle/i.test(name) ? "bridge" : /verse/i.test(name) ? "verse" : null;

  function isChord(tok) { return CHORD.test(tok); }
  function isChordLine(line) {
    const toks = line.trim().split(/\s+/).filter(Boolean);
    if (!toks.length) return false;
    let chords = 0;
    for (const t of toks) { if (isChord(t)) chords++; else if (!NOISE.test(t)) return false; }
    return chords > 0;
  }
  const isTab = l => /^[eBGDAE]?\|?[-0-9hpb\/\\~x|]{6,}\|?\s*$/.test(l.trim()) || /^[eBGDAEbgda]\|[-0-9hpbr\/\\~x|() ]+$/.test(l.trim());
  const clean = c => c.replace(/^\(|\)$/g, "");

  // a chord line over a word line: each chord before the syllable under it (or at the end, padded, when it runs past)
  function merge(chordLine, words) {
    const at = []; let m; const re = /\S+/g;
    while ((m = re.exec(chordLine))) if (isChord(m[0])) at.push({ col: m.index, name: clean(m[0]) });
    let out = "", pos = 0;
    at.forEach(c => {
      let col = Math.min(c.col, words.length);
      // not in the middle of a word's letters unless the chord sits there: UG is lined up by hand, keep its choice
      out += words.slice(pos, col); pos = col;
      if (col >= words.length && out.length && !/\s$/.test(out)) out += " ";
      out += "[" + c.name + "]";
    });
    return (out + words.slice(pos)).replace(/\s+$/, "");
  }
  const barsOf = line => line.trim().split(/\s+/).filter(t => isChord(t)).map(t => "[" + clean(t) + "]").join(" | ");

  function convert(text, opts) {
    opts = opts || {};
    let lines = String(text || "").replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
    lines = lines.map(l => l.replace(/\[\/?(ch|tab)\]/g, "").replace(/\s+$/, ""));
    const out = [], sections = [];
    let capo = null, title = opts.title || "", key = opts.key || "", open = null, sec = null, i = 0;
    const head = [];
    const close = () => { if (open) out.push("{end_of_" + open + "}"); open = null; };
    const startSec = (name, times) => {
      close();
      const kind = KIND(name);
      out.push("");
      out.push(kind ? "{start_of_" + kind + ": " + name + "}" : "{comment: " + name + "}");
      open = kind;
      sec = { name, chords: [], lines: 0, times: times || 1 };
      sections.push(sec);
    };
    const note = (chordNames) => { if (!sec) { sec = { name: "", chords: [], lines: 0, times: 1 }; sections.push(sec); } sec.chords.push(...chordNames); sec.lines++; };
    for (; i < lines.length; i++) {
      const raw = lines[i], l = raw.trim();
      if (!l) continue;
      let m;
      if ((m = /^capo\s*:?\s*(\d+)/i.exec(l)) || (m = /^capo\s+(?:on\s+)?(\d+)(?:st|nd|rd|th)?\s*fret/i.exec(l))) { capo = +m[1]; continue; }
      if (/^(tuning|key|difficulty|author|tabbed by|chords?)\s*:/i.test(l)) { if ((m = /^key\s*:\s*([A-G][#b]?m?)/i.exec(l)) && !key) key = m[1]; continue; }
      if (isTab(l)) continue;
      if ((m = /^\[([^\]]+)\]\s*(?:\(?\s*[x×]\s*(\d+)\s*\)?)?$/i.exec(l)) && !isChord(m[1])) {
        startSec(m[1].trim().replace(/\s*[x×]\s*(\d+)$/i, ""), +(m[2] || (/[x×]\s*(\d+)$/i.exec(m[1]) || [])[1] || 1)); continue;
      }
      if (isChordLine(raw)) {
        const next = lines[i + 1];
        const names = raw.trim().split(/\s+/).filter(isChord).map(clean);
        if (next != null && next.trim() && !isChordLine(next) && !/^\[[^\]]+\]/.test(next.trim()) && !isTab(next)) {
          out.push(merge(raw, next)); note(names); i++;
        } else { out.push(barsOf(raw)); note(names); }
        continue;
      }
      if (!sec && !out.length && !title && i < 3 && !/[.,!?]$/.test(l)) { title = l.replace(/\s+chords?$/i, ""); continue; }
      out.push(l); if (sec) sec.lines++;
    }
    close();
    if (title) head.push("{title: " + title + "}");
    if (key) head.push("{key: " + key + "}");
    if (opts.meter) head.push("{time: " + opts.meter + "}");
    if (capo) head.push("{capo: " + capo + "}");
    const chordpro = (head.join("\n") + "\n" + out.join("\n")).replace(/\n{3,}/g, "\n\n").trim() + "\n";
    return { chordpro, sections: sections.filter(s => s.name).map(s => ({ name: s.name, chords: s.chords, lines: s.lines, times: s.times })), capo, title, key };
  }

  // ---- bars from Timestamp Notes ---------------------------------------------------------------------------------------
  function fitBars(chordpro, bars) {
    const notes = [], lines = chordpro.split("\n"), out = [], seen = {};
    Object.keys(bars).forEach(k => {
      const v = bars[k];
      if (Array.isArray(v) && v.filter(x => x > 0).some(x => x !== v.find(y => y > 0)))
        notes.push(k + " has " + v.filter(x => x > 0).join(", ") + " bars on its different times: check the bar taps, or it really changes.");
    });
    let name = null, body = [];
    const flush = () => {
      if (name == null) { out.push(...body); body = []; return; }
      // bars[name]: a count, or one per time the section comes (a Chorus with none tapped borrows another Chorus's count)
      const v = bars[name], nth = seen[name] = (seen[name] | 0) + 1;
      const n = Array.isArray(v) ? v[nth - 1] || v.find(x => x > 0) : v, chords = [];
      body.forEach(l => { if (!/^\{/.test(l)) (l.match(/\[([^\]]+)\]/g) || []).forEach(c => chords.push(c.slice(1, -1))); });
      const k = chords.length;
      const hasWords = body.some(l => !/^\{/.test(l) && l.replace(/\[[^\]]*\]|\|/g, "").trim());
      // a later time n bars long, a whole number of times the first time's f (a doubled last chorus): the progression
      // again, spread as the first time was, rather than each chord held longer
      const first = Array.isArray(v) ? v.find(x => x > 0) : null;
      if (n && k && nth > 1 && first && n > first && n % first === 0 && first % k === 0 && !hasWords) {
        const each = first / k, row = [];
        for (let r = 0; r < n / first; r++) chords.forEach(c => { for (let j = 0; j < each; j++) row.push("[" + c + "]"); });
        out.push(...body.filter(l => /^\{/.test(l)), row.join(" | "));
        body = []; return;
      }
      if (!n || !k) { out.push(...body); }
      else if (k === n && !hasWords) out.push(...body);
      else if (n % k === 0 && !hasWords) {
        const each = n / k, row = [];
        chords.forEach(c => { for (let j = 0; j < each; j++) row.push("[" + c + "]"); });
        out.push(...body.filter(l => /^\{/.test(l)), row.join(" | "));
      } else {
        out.push(...body);
        if (k !== n && !(notes.some(x => x.indexOf(name + ": ") === 0))) notes.push(name + ": " + n + " bars tapped, " + k + " chords" + (hasWords ? " under the words" : "") + ": the Notation page gives each chord a bar; fix the rest there.");
      }
      body = [];
    };
    lines.forEach(l => {
      const m = /^\{\s*(?:start_of_\w+|comment|c)\s*:\s*([^}]*)\}$/i.exec(l.trim());
      if (m) { flush(); name = m[1].trim(); out.push(l); return; }
      if (/^\{\s*end_of_/i.test(l.trim())) { flush(); name = null; out.push(l); return; }
      body.push(l);
    });
    flush();
    return { chordpro: out.join("\n"), notes };
  }

  // ---- ChordPro grids: a section's chords bar by bar, a cell a beat ---------------------------------------------------
  //   {start_of_grid: Verse 1}
  //   | G . . . | . . D . | Em . . . | . C . . |
  //   {end_of_grid}
  // "." (or "/") holds the chord on; "%" repeats the bar before. Timestamp Notes writes one per timed section (in the order
  // the sections are stamped; the nth "Chorus" grid is the nth Chorus) and reads them back as that section's timing.
  const GRID_START = /^\{\s*(?:start_of_grid|sog)\s*(?::\s*([^}]*))?\}\s*$/i, GRID_END = /^\{\s*(?:end_of_grid|eog)\s*\}\s*$/i;
  function grids(text) {
    const out = []; let cur = null;
    String(text || "").split("\n").forEach(l => {
      const t = l.trim(), m = GRID_START.exec(t);
      if (m) { cur = { name: (m[1] || "").trim().replace(/^label\s*=\s*"?|"$/g, ""), bars: [], raw: [l] }; return; }
      if (!cur) return;
      cur.raw.push(l);
      if (GRID_END.test(t)) { cur.raw = cur.raw.join("\n"); out.push(cur); cur = null; return; }
      if (!/\|/.test(t)) return;
      t.replace(/\|\||\|\.|\.\||:\|\||\|\|:/g, "|").split("|").slice(1, -1).forEach(b => {
        const cells = b.trim().split(/\s+/).filter(Boolean);
        if (cells.length === 1 && cells[0] === "%" && cur.bars.length) cur.bars.push(cur.bars[cur.bars.length - 1].slice());
        else if (cells.length) cur.bars.push(cells);
      });
    });
    return out;
  }
  function stripGrids(text) {
    const out = []; let inGrid = false;
    String(text || "").split("\n").forEach(l => {
      const t = l.trim();
      if (GRID_START.test(t)) { inGrid = true; return; }
      if (inGrid) { if (GRID_END.test(t)) inGrid = false; return; }
      out.push(l);
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n");
  }
  // bars of cells -> { chords: [{ at, name }] (at in beats), beats: [per bar], len }
  function gridChords(bars) {
    const chords = []; let at = 0;
    const beats = bars.map(cells => {
      cells.forEach((c, i) => { if (!/^[.\/~%]$/.test(c)) chords.push({ at: at + i, name: c }); });
      at += cells.length;
      return cells.length;
    });
    return { chords, beats, len: at };
  }
  // chords ({ at } in beats from the section's start) and the beats of each bar -> the grid's bars of cells
  function gridCells(chords, beats) {
    let start = 0;
    return beats.map(n => {
      const cells = new Array(n).fill(".");
      chords.filter(c => c.at >= start - 1e-6 && c.at < start + n - 1e-6).forEach(c => {
        let k = Math.floor(c.at - start + 1e-6);
        while (k < n && cells[k] !== ".") k++;
        if (k < n) cells[k] = c.name;
      });
      start += n;
      return cells;
    });
  }
  function gridBlock(name, cells, perLine) {
    perLine = perLine || 4;
    const lines = [];
    for (let i = 0; i < cells.length; i += perLine)
      lines.push("| " + cells.slice(i, i + perLine).map(c => c.join(" ")).join(" | ") + " |");
    return "{start_of_grid: " + name + "}\n" + lines.join("\n") + "\n{end_of_grid}";
  }

  const api = { convert, fitBars, isChord, isChordLine, merge, grids, stripGrids, gridChords, gridCells, gridBlock };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.UgChordPro = api;
})(typeof window !== "undefined" ? window : globalThis);
