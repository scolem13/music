/* A timed ChordPro: the whole song in one .cho -- words, chords, and where everything falls in the recording.
   Save as ChordPro writes the ChordPro box with x_ directives (ChordPro's own custom directives: other ChordPro apps skip them);
   Open file / Paste… read one back (a .cho without them opens as the words and chords alone).

     {x_timestamp_notes: 1}
     {x_source: https://youtu.be/...}        (or {x_source_file: song.mp3}; {x_follow: tab} when played in a tab)
     {x_beats_per_bar: 4}
     {x_note: 1:02.300 key change}          a C stamp
     {x_section: 2:10.000 Sax solo}         a section stamp with no heading in the words
     {x_bars: 0.232 2.590}                  bars before the first section (or of a section with no heading)
     {comment: Verse}
     {x_at: 0:09.669}                       this heading's section stamp
     {x_bars: 9.669 11.847 14.026/2 ...}    its bars' starts in seconds; /n a bar of n beats (a meter change)

   The nth heading called Verse is the nth Verse stamp. The {start_of_grid} blocks stay as they are: each section's chords, beat by beat. */
(function () {
  "use strict";
  var X = /^\{\s*x_([a-z_]+)\s*:\s*(.*?)\s*\}\s*$/i;
  var HEAD = /^\{\s*(?:start_of_(?!grid)\w+|so[cvb]|comment|c)\s*:\s*([^}]*)\}/i;
  var GRID_START = /^\{\s*(?:start_of_grid|sog)\b/i, GRID_END = /^\{\s*(?:end_of_grid|eog)\s*\}/i;

  function hms(s) {                                   // 69.6694 -> "1:09.669"
    var m = Math.floor(s / 60), r = s - m * 60;
    return m + ':' + r.toFixed(3).padStart(6, '0');
  }
  function stampT(s) {                                // the log's own form, "01:09.7"
    var m = Math.floor(s / 60), r = s - m * 60;
    return String(m).padStart(2, '0') + ':' + r.toFixed(1).padStart(4, '0');
  }
  function secs(t) {
    var p = String(t).trim().split(':').map(parseFloat);
    return p.reduce(function (a, v) { return a * 60 + v; }, 0);
  }
  function isTimed(text) { return /\{\s*x_timestamp_notes\s*:/i.test(text); }
  function isChordPro(text) { return /^\s*\{\s*(?:title|t|start_of_\w+|comment|c)\s*:/im.test(text) && !/^\s*[-\d.e]+\t/m.test(text); }

  // the headings of a ChordPro text, outside its grids: [{ i (line), name }]
  function headings(lines) {
    var out = [], grid = false;
    lines.forEach(function (l, i) {
      var t = l.trim();
      if (GRID_START.test(t)) { grid = true; return; }
      if (grid) { if (GRID_END.test(t)) grid = false; return; }
      var m = HEAD.exec(t);
      if (m) out.push({ i: i, name: m[1].trim() });
    });
    return out;
  }
  function q(sel) { return document.querySelector(sel); }

  // ---- the page -> a timed ChordPro ----
  function build() {
    var log = q('.btp-log'), mapEl = q('.btp-barmap:not(.pc-shell)'), wordsEl = q('.btp-words:not(.pc-shell)'), player = q('.btp');
    var rows = log && log._btpStamps ? log._btpStamps() : [];
    var map = mapEl && mapEl._btpMap ? mapEl._btpMap.state() : { bars: [], beatsPerBar: 4, meters: {} };
    var words = wordsEl && wordsEl._btpWords ? wordsEl._btpWords.state() : { chordpro: '' };
    var src = player && player._btp && player._btp.source ? player._btp.source() : null;
    var bpb = map.beatsPerBar || 4, meters = map.meters || {};

    var lines = String(words.chordpro || '').split('\n').filter(function (l) { return !X.test(l.trim()); });
    var heads = headings(lines);
    var secRows = rows.filter(function (r) { return r.k === 's'; }).sort(function (a, b) { return a.s - b.s; });
    var notes = rows.filter(function (r) { return r.k !== 's'; });

    // which bars are each section's: from its start (a little before: it sits on the nearest bar) to the next one's
    var bars = (map.bars || []).slice().sort(function (a, b) { return a - b; });
    function barText(t) { var n = meters[String(Math.round(t * 1000))]; return (+t.toFixed(3)) + (n && n !== bpb ? '/' + n : ''); }
    var owned = secRows.map(function () { return []; }), loose = [];
    bars.forEach(function (t) {
      var k = -1;
      secRows.forEach(function (r, i) { if (r.s <= t + 0.3) k = i; });
      (k < 0 ? loose : owned[k]).push(barText(t));
    });

    // the nth heading called X takes the nth X stamp
    var used = {}, after = {}, unmatched = [];
    secRows.forEach(function (r, i) {
      var name = (r.b || r.n || '').toLowerCase(), nth = used[name] | 0;
      used[name] = nth + 1;
      var same = heads.filter(function (h) { return h.name.toLowerCase() === name; }), h = same[nth];
      var add = ['{x_at: ' + hms(r.s) + '}'].concat(owned[i].length ? ['{x_bars: ' + owned[i].join(' ') + '}'] : []);
      if (h) after[h.i] = add;
      else { unmatched.push('{x_section: ' + hms(r.s) + ' ' + (r.b || r.n) + '}'); loose = loose.concat(owned[i]); }
    });
    loose.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });

    var head = ['{x_timestamp_notes: 1}'];
    if (src && src.url) { head.push('{x_source: ' + src.url + '}'); if (src.follow) head.push('{x_follow: tab}'); }
    else if (src && src.file) head.push('{x_source_file: ' + src.file + '}');
    head.push('{x_beats_per_bar: ' + bpb + '}');
    notes.forEach(function (r) { head.push('{x_note: ' + hms(r.s) + ' ' + (r.n || '') + '}'); });
    head = head.concat(unmatched);
    if (loose.length) head.push('{x_bars: ' + loose.join(' ') + '}');

    // the timing goes after the opening meta directives (title, artist, key ...), the rest after their headings
    var top = 0;
    while (top < lines.length && /^\s*\{/.test(lines[top]) && !HEAD.test(lines[top].trim()) && !GRID_START.test(lines[top].trim())) top++;
    var out = [];
    lines.forEach(function (l, i) {
      if (i === top) out.push.apply(out, head.concat(top ? [] : ['']));
      out.push(l);
      if (after[i]) out.push.apply(out, after[i]);
    });
    if (top >= lines.length) out.push.apply(out, head);
    return out.join('\n').replace(/\s+$/, '') + '\n';
  }

  // ---- a timed ChordPro -> a song file (player-log.js opens it) ----
  function toSong(text) {
    var all = String(text).replace(/\r\n?/g, '\n').split('\n'), lines = [], x = [];
    all.forEach(function (l) { var m = X.exec(l.trim()); if (m) x.push({ key: m[1].toLowerCase(), val: m[2], at: lines.length }); else lines.push(l); });
    var heads = headings(lines);
    var bpb = 4, src = null, stamps = [], bars = [], beats = [];
    x.forEach(function (d) {
      if (d.key === 'beats_per_bar') bpb = parseInt(d.val, 10) || 4;
      else if (d.key === 'source') src = { url: d.val };
      else if (d.key === 'source_file') src = { file: d.val };
      else if (d.key === 'follow' && src) src.follow = true;
    });
    function first(val) { var m = /^(\S+)\s*(.*)$/.exec(val); return m ? { s: secs(m[1]), rest: m[2] } : null; }
    x.forEach(function (d) {
      if (d.key === 'note') { var n = first(d.val); if (n && isFinite(n.s)) stamps.push({ t: stampT(n.s), s: n.s, n: n.rest }); }
      else if (d.key === 'section') { var p = first(d.val); if (p && isFinite(p.s)) stamps.push({ t: stampT(p.s), s: p.s, n: p.rest, k: 's', b: p.rest }); }
      else if (d.key === 'at') {
        var s = secs(d.val), h = heads.filter(function (h) { return h.i < d.at; }).pop();
        if (isFinite(s) && h) stamps.push({ t: stampT(s), s: s, n: h.name, k: 's', b: h.name });
      } else if (d.key === 'bars') d.val.split(/\s+/).forEach(function (b) {
        var m = /^([\d.]+|\d+:[\d.]+)(?:\/(\d+))?$/.exec(b);
        if (m) { bars.push(secs(m[1])); beats.push(m[2] ? +m[2] : 0); }
      });
    });
    stamps.sort(function (a, b) { return a.s - b.s; });
    var order = bars.map(function (t, i) { return i; }).sort(function (a, b) { return bars[a] - bars[b]; });
    bars = order.map(function (i) { return bars[i]; });
    beats = order.map(function (i) { return beats[i] || bpb; });

    // the words' sections, and every section with a grid shown as confirmed
    var chordpro = lines.join('\n'), byName = {}, list = [], count = {}, confirmed = {}, gcount = {};
    heads.forEach(function (h, k) {
      var key = h.name.toLowerCase(), next = heads[k + 1], body = lines.slice(h.i + 1, next ? next.i : lines.length);
      if (!byName[key]) { byName[key] = { name: h.name, chords: [], lines: 0, times: 0 }; list.push(byName[key]); }
      var o = byName[key]; o.times++;
      if ((count[key] | 0) === 0) body.forEach(function (l) {
        if (/^\s*\{/.test(l)) return;
        var cs = (l.match(/\[([^\]]+)\]/g) || []).map(function (c) { return c.slice(1, -1); });
        if (cs.length) { o.chords = o.chords.concat(cs); o.lines++; }
      });
      count[key] = (count[key] | 0) + 1;
    });
    var U = window.UgChordPro;
    if (U && U.grids) U.grids(chordpro).forEach(function (g) {
      var k = g.name.toLowerCase(), nth = gcount[k] | 0; gcount[k] = nth + 1;
      confirmed[k + '#' + nth] = true;
    });
    var tm = /^\s*\{\s*(?:title|t)\s*:\s*([^}]*)\}/im.exec(chordpro), title = tm ? tm[1].trim() : '';
    return {
      app: 'timestamp-notes', version: 1, saved: new Date().toISOString(), title: title, source: src,
      stamps: stamps,
      barMap: bars.length ? { bars: bars, beatsPerBar: bpb, beats: beats } : null,
      words: { ug: '', chordpro: chordpro, title: title, sections: list, hits: [], confirmed: confirmed, gridSigs: {} },
      phrases: null
    };
  }

  window.TsChordProTiming = { build: build, toSong: toSong, isTimed: isTimed, isChordPro: isChordPro };

  function boot() {
    var log = q('.btp-log'), btn = log && log.querySelector('.btp-save-cho');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var text = build();
      var name = (log._btpFileName ? log._btpFileName('timestamp-notes') : 'timestamp-notes') + '.cho';
      var url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      btn.blur();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
