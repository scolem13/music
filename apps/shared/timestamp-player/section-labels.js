/* Section labels for Timestamp Notes: the menu a section stamp (S) chooses from, the numbering, and the choruses each
   soloist takes. No page here: player-log.js draws the menu, this decides what is on it. Node can load it too
   (tests/lessons/section-labels.test.js).

   window.TsLabels = {
     WORDS, SOLOISTS,
     menu(used)            -> [{ group, items: [label] }]   the words, the solos, the letters on offer (A; then A', B ...)
     names(rows)           -> [name]   rows [{ b, o }] in time order (b: the label chosen, o: typed under Other): each
                                       word label that comes more than once is numbered (Head 1, Head 2); a letter or a
                                       typed label is left as it is
     kind(label)           -> 'head' | 'solo' | 'shout' | 'letter' | 'word' | 'other'
     player(label)         -> 'Sax' for 'Sax solo' ('Solo' for a bare Solo), else null
     runs(secs, formBars)  -> [{ label, player, kind, from, to, bars, choruses }]  secs [{ b, bars }] in time order: the
                                       same label back to back is one run (a sax solo stamped every chorus, or once)
     formBars(secs)        -> the bars of a chorus, from the first Head stamp (else the first letter A up to the next A), or null
   } */
(function (root) {
  "use strict";

  var WORDS = ['Intro', 'Head', 'Verse', 'Pre-chorus', 'Chorus', 'Bridge', 'Interlude', 'Shout', 'Outro'];
  var SOLOISTS = ['Sax', 'Trumpet', 'Trombone', 'Piano', 'Guitar', 'Organ', 'Vibes', 'Bass', 'Drums', 'Vocal'];
  var LETTER = /^([A-H])('*)$/;

  function soloLabel(p) { return p + ' solo'; }

  // A, then for every letter used its next prime (A', A'') and the letter after the highest used.
  function letters(used) {
    var have = {}, top = -1;
    used.forEach(function (l) { var m = LETTER.exec(l); if (m) { have[l] = true; top = Math.max(top, m[1].charCodeAt(0) - 65); } });
    var out = [];
    for (var c = 0; c <= Math.min(top + 1, 7); c++) {
      var L = String.fromCharCode(65 + c), p = '';
      if (c > top) { out.push(L); break; }
      while (have[L + p]) { out.push(L + p); p += "'"; }
      out.push(L + p);         // the next prime of a letter used (or the letter itself, if only a prime of it was)
    }
    return out.length ? out : ['A'];
  }

  function menu(used) {
    used = used || [];
    return [
      { group: 'Sections', items: WORDS.slice(0, 7) },
      { group: 'Solos', items: ['Solo'].concat(SOLOISTS.map(soloLabel)) },
      { group: 'More', items: WORDS.slice(7) },
      { group: 'Form letters', items: letters(used) }
    ];
  }

  function kind(label) {
    var l = String(label || '').trim();
    if (LETTER.test(l)) return 'letter';
    if (/^head$/i.test(l)) return 'head';
    if (/^shout/i.test(l)) return 'shout';
    if (/\bsolo\b/i.test(l)) return 'solo';
    if (WORDS.some(function (w) { return w.toLowerCase() === l.toLowerCase(); })) return 'word';
    return 'other';
  }
  function player(label) {
    var m = /^(.*?)\s*\bsolo\b/i.exec(String(label || '').trim());
    if (!m) return null;
    var p = m[1].trim();
    return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Solo';
  }
  // numbered: a label from the menu other than a letter
  function numbered(r) {
    if (r.o) return false;
    var k = kind(r.b);
    return k !== 'letter' && k !== 'other';
  }

  function names(rows) {
    var total = {}, seen = {};
    rows.forEach(function (r) { if (numbered(r)) total[r.b] = (total[r.b] | 0) + 1; });
    return rows.map(function (r) {
      if (!numbered(r) || total[r.b] < 2) return r.b;
      seen[r.b] = (seen[r.b] | 0) + 1;
      return r.b + ' ' + seen[r.b];
    });
  }

  function formBars(secs) {
    for (var i = 0; i < secs.length; i++) if (kind(secs[i].b) === 'head' && secs[i].bars > 0) return secs[i].bars;
    // a lettered form: the shortest run of letters that repeats (A A B A | A A B A ...: 4 parts), the letters stamped
    // from the first A on, at least once through again
    var from = -1;
    for (var j = 0; j < secs.length; j++) if (secs[j].b === 'A') { from = j; break; }
    if (from < 0) return null;
    var seq = [], k;
    for (k = from; k < secs.length && LETTER.test(String(secs[k].b)); k++) seq.push(secs[k]);
    for (var p = 2; p * 2 <= seq.length; p++) {
      var same = true;
      for (k = p; k < seq.length; k++) if (seq[k].b !== seq[k - p].b) { same = false; break; }
      if (same) { var bars = 0; for (k = 0; k < p; k++) bars += seq[k].bars || 0; return bars || null; }
    }
    return null;
  }

  // round to a half chorus, when it is that close (a solo cut short, or a stamp a bar off)
  function count(bars, form) {
    if (!(form > 0) || !(bars > 0)) return null;
    return Math.round(bars / form * 2) / 2;
  }

  function runs(secs, form) {
    var out = [];
    secs.forEach(function (s, i) {
      var last = out[out.length - 1], label = String(s.b);
      if (last && last.label.toLowerCase() === label.toLowerCase()) { last.to = i; last.bars += s.bars || 0; return; }
      out.push({ label: label, player: player(label), kind: kind(label), from: i, to: i, bars: s.bars || 0 });
    });
    out.forEach(function (r) { r.choruses = count(r.bars, form); });
    return out;
  }

  var api = { WORDS: WORDS, SOLOISTS: SOLOISTS, menu: menu, names: names, kind: kind, player: player, runs: runs, formBars: formBars, letters: letters };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TsLabels = api;
})(typeof window !== 'undefined' ? window : globalThis);
