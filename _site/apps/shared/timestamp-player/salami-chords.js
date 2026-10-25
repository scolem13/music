/* SALAMI chords (McGill Billboard salami_chords.txt) -> a Timestamp Notes song file, and the hooks that open one with
   Open file, Paste… or a drop on the Timestamps part.

   A salami file: "# title:", "# artist:", "# metre:", "# tonic:" lines, then "<seconds>\t<content>", the content a comma list:
   a letter (A, B', Z), a label (verse, chorus ...), the bars "| E:maj | C#:min . A:maj . | x2", instruments "(voice" "voice)",
   "silence", "end", "fadeout", "->". A line's bars run from its time to the next line's, evenly by beat; a bar's cells are its beats
   ("." holds a chord on), "(2/4)" opens a bar in another meter.

   Out: a stamp per section (each labelled line), the bar map (every bar's start and beats), and the ChordPro: a {comment:} heading
   and chord line per section, and a {start_of_grid} per section (its timing), each one confirmed. */
(function () {
  "use strict";

  var DEG = { '1': 0, 'b2': 1, '2': 2, '#2': 3, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9,
    'bb7': 9, 'b7': 10, '7': 11, 'b9': 1, '9': 2, '#9': 3, '11': 5, '#11': 6, 'b13': 8, '13': 9 };
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var QUAL = { maj: '', min: 'm', '7': '7', min7: 'm7', maj7: 'maj7', '5': '5', '1': '', sus4: 'sus4', sus2: 'sus2', maj6: '6',
    min6: 'm6', '9': '9', '11': '11', '13': '13', min9: 'm9', min11: 'm11', min13: 'm13', maj9: 'maj9', maj13: 'maj13', dim: 'dim',
    dim7: 'dim7', hdim7: 'm7b5', aug: 'aug', minmaj7: 'm(maj7)' };

  function pcOf(root) {
    var p = PC[root.charAt(0)];
    for (var i = 1; i < root.length; i++) p += root.charAt(i) === '#' ? 1 : -1;
    return ((p % 12) + 12) % 12;
  }
  // "C#:min7/b7" -> "C#m7/B"; N and &pause -> N.C.
  function chord(c) {
    if (c === 'N' || c === '&pause' || c === 'X') return 'N.C.';
    var m = /^([A-G][b#]*)(?::([^/(]*)(\(([^)]*)\))?)?(?:\/(.+))?$/.exec(c);
    if (!m) return c;
    var root = m[1], q = m[2] == null ? 'maj' : m[2], ext = m[4] ? m[4].split(',') : [], name;
    // the common shapes with added notes
    if (q === 'sus4' && ext.join() === 'b7') { name = '7sus4'; ext = []; }
    else if (q === 'sus4' && ext.join() === 'b7,9') { name = '9sus4'; ext = []; }
    else if (q === '5' && ext.join() === 'b7') { name = '7(no3)'; ext = []; }
    else if (q === 'aug' && ext.join() === 'b7') { name = 'aug7'; ext = []; }
    else if ((q === 'maj' || q === 'min') && ext.join() === '9') { name = (q === 'min' ? 'm' : '') + 'add9'; ext = []; }
    else if (q === 'maj6' && ext.join() === '9') { name = '6/9'; ext = []; }
    else name = QUAL.hasOwnProperty(q) ? QUAL[q] : q;
    if (ext.length) name += ext.every(function (e) { return /^[b#]/.test(e); }) ? ext.join('') : '(' + ext.join(',') + ')';
    var out = root + name;
    if (m[5] && DEG.hasOwnProperty(m[5])) {
      var names = /b/.test(root.slice(1)) || root === 'F' ? FLAT : SHARP;
      out += '/' + names[(pcOf(root) + DEG[m[5]]) % 12];
    }
    return out;
  }

  function isSalami(text) {
    var t = String(text);
    return /^\s*#\s*(?:title|metre|tonic)\s*:/m.test(t) || /^\s*[-\d.e]+\t.*\|/m.test(t);
  }
  function fmt(s) {
    var m = Math.floor(s / 60), r = s - m * 60;
    return String(m).padStart(2, '0') + ':' + r.toFixed(1).padStart(4, '0');
  }
  function title(label) { return label.charAt(0).toUpperCase() + label.slice(1); }

  function convert(text) {
    var meta = {}, lines = [];
    String(text).split(/\r?\n/).forEach(function (l) {
      var h = /^\s*#\s*(\w+)\s*:\s*(.*)$/.exec(l);
      if (h) { meta[h[1].toLowerCase()] = h[2].trim(); return; }
      var m = /^\s*([-\d.eE+]+)\s+(.*)$/.exec(l);
      if (m && isFinite(parseFloat(m[1]))) lines.push({ t: parseFloat(m[1]), c: m[2] });
    });
    var bpb = parseInt((meta.metre || '4/4').split('/')[0], 10) || 4;

    var bars = [], beats = [], stamps = [], secs = [];    // secs: [{ name, at, chordLines: [[names]], cells: [[cells]] }]
    var cur = null;
    lines.forEach(function (ln, i) {
      var next = lines[i + 1], c = ln.c;
      // the bars, and a repeat after them
      var bm = /\|.*\|(?:\s*x(\d+))?/.exec(c), rest = bm ? c.replace(bm[0], '') : c;
      var tokens = rest.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var label = null, letter = null;
      tokens.forEach(function (tk) {
        if (/^[A-Z]'*$/.test(tk)) letter = tk;
        else if (/^[a-z][a-z \-]*$/i.test(tk) && !/^(silence|end|fadeout|fade out|->)$/i.test(tk)) label = tk.toLowerCase();
      });
      var name = label ? title(label) : letter ? letter : null;
      if (name) {
        cur = { name: name, at: ln.t, chordLines: [], cells: [] };
        secs.push(cur);
        stamps.push({ t: fmt(ln.t), s: Math.round(ln.t * 1000) / 1000, n: name, k: 's', b: name });
      }
      if (/(^|,)\s*(silence|end)\s*(,|$)/i.test(c) && !bm) cur = null;
      if (!bm) return;
      if (!cur) {                                          // bars before any label: a section of their own
        cur = { name: 'Intro', at: ln.t, chordLines: [], cells: [] };
        secs.push(cur);
        stamps.push({ t: fmt(ln.t), s: Math.round(ln.t * 1000) / 1000, n: 'Intro', k: 's', b: 'Intro' });
      }
      var body = bm[0].replace(/\s*x\d+\s*$/, ''), times = bm[1] ? parseInt(bm[1], 10) : 1;
      var one = body.replace(/\|\||\|:|:\|/g, '|').split('|').slice(1, -1).map(function (b) {
        var cells = b.trim().split(/\s+/).filter(Boolean), n = bpb;
        if (cells.length && /^\(\d+\/\d+\)$/.test(cells[0])) { n = parseInt(cells.shift().slice(1), 10) || bpb; }
        return { cells: cells, n: n };
      }).filter(function (b) { return b.cells.length; });
      var lineBars = [];
      for (var r = 0; r < times; r++) lineBars = lineBars.concat(one);
      if (!lineBars.length) return;
      var total = lineBars.reduce(function (a, b) { return a + b.n; }, 0);
      var end = next ? next.t : ln.t + total * 0.5, beatLen = (end - ln.t) / total, at = ln.t, names = [];
      lineBars.forEach(function (b) {
        bars.push(Math.round(at * 1000) / 1000); beats.push(b.n);
        // the bar's cells as its beats: as many cells as beats, or each chord spread evenly
        var grid = new Array(b.n).fill('.');
        if (b.cells.length === b.n) grid = b.cells.map(function (x) { return x === '.' ? '.' : chord(x); });
        else {
          var ch = b.cells.filter(function (x) { return x !== '.'; });
          ch.forEach(function (x, k) { var at = Math.floor(k * b.n / ch.length); while (at < b.n && grid[at] !== '.') at++; if (at < b.n) grid[at] = chord(x); });
        }
        // a bar starting on a hold carries the chord before it on
        if (grid[0] === '.') {
          var prev = names.length ? names[names.length - 1] : (cur.cells.length ? lastChord(cur.cells) : null);
          if (prev) grid[0] = prev;
        }
        grid.forEach(function (x) { if (x !== '.') names.push(x); });
        cur.cells.push(grid);
        at += b.n * beatLen;
      });
      cur.chordLines.push(names);
    });
    function lastChord(cells) {
      for (var i = cells.length - 1; i >= 0; i--) for (var j = cells[i].length - 1; j >= 0; j--) if (cells[i][j] !== '.') return cells[i][j];
      return null;
    }
    // the end of the last bar
    if (bars.length && lines.length) {
      var last = lines[lines.length - 1].t;
      if (last > bars[bars.length - 1]) { bars.push(Math.round(last * 1000) / 1000); beats.push(bpb); }
    }

    var U = window.UgChordPro, cho = [], count = {}, confirmed = {}, byName = {}, order = [];
    if (meta.title) cho.push('{title: ' + meta.title + '}');
    if (meta.artist) cho.push('{artist: ' + meta.artist + '}');
    if (meta.tonic) cho.push('{key: ' + meta.tonic + '}');
    cho.push('{time: ' + (meta.metre || bpb + '/4') + '}', '');
    secs.forEach(function (s) {
      var k = s.name.toLowerCase(), nth = count[k] | 0;
      count[k] = nth + 1;
      if (s.cells.length) confirmed[k + '#' + nth] = true;
      if (!byName[k]) { byName[k] = { name: s.name, chords: [], lines: 0, times: 0 }; order.push(byName[k]); }
      var o = byName[k]; o.times++;
      if (nth === 0) s.chordLines.forEach(function (l) { o.chords = o.chords.concat(l); o.lines++; });
      cho.push('{comment: ' + s.name + '}');
      s.chordLines.forEach(function (l) { cho.push(l.map(function (n) { return '[' + n + ']'; }).join(' ')); });
      cho.push('');
    });
    secs.forEach(function (s) {
      if (!s.cells.length) return;
      cho.push(U && U.gridBlock ? U.gridBlock(s.name, s.cells) : '{start_of_grid: ' + s.name + '}\n' +
        s.cells.map(function (c) { return '| ' + c.join(' ') + ' |'; }).join('\n') + '\n{end_of_grid}', '');
    });

    var name = meta.title || '';
    return {
      app: 'timestamp-notes', version: 1, saved: new Date().toISOString(), title: name, source: null,
      stamps: stamps,
      barMap: { bars: bars, beatsPerBar: bpb, beats: beats },
      words: { ug: '', chordpro: cho.join('\n'), title: name, sections: order, hits: [], confirmed: confirmed, gridSigs: {} },
      phrases: null
    };
  }

  window.SalamiChords = { isSalami: isSalami, convert: convert, chord: chord };

  // ---- the hooks: Open file, Paste… and a drop on the Timestamps part read a salami file, or a ChordPro (timed or not:
  // chordpro-timing.js), as a song file; anything else goes on as before ----
  function songFrom(text, fname) {
    var T = window.TsChordProTiming;
    if (T && (T.isTimed(text) || /\.(cho|chopro|chordpro|crd)$/i.test(fname || '') || T.isChordPro(text))) return T.toSong(text);
    if (isSalami(text)) return convert(text);
    return null;
  }
  function boot() {
    var log = document.querySelector('.btp-log'); if (!log) return;
    var area = log.querySelector('.btp-paste textarea'), go = log.querySelector('.btp-paste-go'), file = log.querySelector('.btp-import-file');
    function open(text, fname) {
      var song = songFrom(text, fname);
      area.value = song ? JSON.stringify(song) : text;
      go.click();                                        // player-log.js opens it
    }
    if (go) go.addEventListener('click', function () {
      if (area.value.trim().charAt(0) === '{' && /"app"\s*:/.test(area.value)) return;   // already a song file
      var song = songFrom(area.value);
      if (song) area.value = JSON.stringify(song);
    }, true);
    if (file) file.addEventListener('change', function (e) {
      var f = file.files[0]; if (!f) return;
      e.stopImmediatePropagation();
      f.text().then(function (t) { file.value = ''; open(t, f.name); });
    }, true);
    log.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files[0];
      if (!f || !/\.(txt|cho|chopro|chordpro|crd)$/i.test(f.name)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      f.text().then(function (t) { open(t, f.name); });
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
