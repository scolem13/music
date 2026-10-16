/* The bar map in Timestamp Notes.
   B is pressed on the first beat of every bar while the recording plays; the
   taps are the bars, and from them come each bar's length and tempo. Stamps in
   the log whose note names a section ("Verse 1", "Chorus", "§ horns in") are
   placed on the bar nearest the stamp, so a section can be jumped to or looped.

     b          a bar starts here
     backspace  take the last tap back
     shift+l    loop the section under the playhead (again: stop looping)
   (phrases.js loops a phrase through setLoop.)

   A bar can have its own number of beats (a 2/4 bar in a 4/4 song, a 3/4 bridge): the Beats column of the
   bar table. Bar lengths are judged against the typical beat, so a short bar that fits a whole number of beats
   is offered as that meter, and a gap of two or three bars' length (a missed tap) can be filled in.

   It talks to the player through the _btp handle player.js hangs on .btp, and
   to the log through its 'btp-stamps' event. Kept in localStorage as tapped. */
(function () {
  "use strict";

  var STORE = 'btp-bars';
  // A note naming a section: one of these words first, a lone letter (A, B2),
  // or anything after a section sign.
  var SECTION = /^(intro|verse|pre-?chorus|chorus|refrain|bridge|middle\s*8|solo|instrumental|interlude|break(down)?|outro|coda|tag|vamp|head|ending|turnaround|shout)\b/i;
  // ... or one of them after a word or two (Guitar Solo, Final Chorus, Verse 2)
  var SECTION_IN = /^[\w'-]+\s+(intro|verse|pre-?chorus|chorus|refrain|bridge|solo|instrumental|interlude|break(down)?|outro|coda|tag|vamp|head|ending|turnaround|shout)\b/i;
  var LETTER = /^[A-H]'*\d?$/;
  var SIGN = /^§\s*(.+)$/;

  function sectionName(note) {
    var n = String(note || '').trim(), m = n.match(SIGN);
    if (m) return m[1];
    return SECTION.test(n) || SECTION_IN.test(n) || LETTER.test(n) ? n : null;
  }

  function median(list) {
    if (!list.length) return NaN;
    var s = list.slice().sort(function (a, b) { return a - b; }), h = s.length >> 1;
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  }

  function boot() {
    var player = document.querySelector('.btp');
    var log = document.querySelector('.btp-log');
    var root = document.querySelector('.btp-barmap');
    if (!player || !root) return;

    var q = function (sel) { return root.querySelector(sel); };
    var err = player.querySelector('.btp-err');
    var beatsIn = q('.btp-beats'), now = q('.btp-bars-now'), summary = q('.btp-bars-summary');
    var secRows = q('.btp-sec-rows'), secEmpty = q('.btp-sec-empty');
    var barBody = q('.btp-bar-rows');

    var bars = [];          // bar start times, seconds, in order
    var taps = [];          // the same times in the order tapped, for taking back
    var stamps = [];        // the log's entries
    var loop = null;        // { name, start, end }
    var meters = {};        // a bar's own beats, keyed by its start time (ms): a meter change
    var guessed = {};       // bars put in from the tempo (Fill from the tempo), keyed as meters; not tapped

    function api() { return player._btp || null; }
    function fmt(t) {
      var m = Math.floor(t / 60), s = t - m * 60;
      return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0');
    }
    function say(text) {
      if (!err) return;
      err.textContent = text;
      setTimeout(function () { if (err.textContent === text) err.textContent = ''; }, 2500);
    }
    function beats() {
      var b = parseInt(beatsIn.value, 10);
      return b > 0 && b < 33 ? b : 4;
    }

    function tkey(t) { return String(Math.round(t * 1000)); }
    function beatsOf(i) { return meters[tkey(bars[i])] || beats(); }
    function save() {
      var keep = {};
      bars.forEach(function (t) { if (meters[tkey(t)]) keep[tkey(t)] = meters[tkey(t)]; });
      meters = keep;
      var g = {};
      bars.forEach(function (t) { if (guessed[tkey(t)]) g[tkey(t)] = true; });
      guessed = g;
      try { localStorage.setItem(STORE, JSON.stringify({ beatsPerBar: beats(), bars: bars, meters: meters, guessed: Object.keys(guessed) })); }
      catch (e) {}
    }
    function load(data) {
      if (!data || !Array.isArray(data.bars)) return false;
      bars = data.bars.filter(function (t) { return typeof t === 'number' && isFinite(t); })
                      .sort(function (a, b) { return a - b; });
      taps = bars.slice();
      if (data.beatsPerBar) beatsIn.value = data.beatsPerBar;
      meters = {};
      if (data.meters && typeof data.meters === 'object') meters = data.meters;
      guessed = {};
      if (Array.isArray(data.guessed)) data.guessed.forEach(function (k) { guessed[k] = true; });
      // a downloaded map: a beats count per bar
      if (Array.isArray(data.beats)) data.beats.forEach(function (b, i) {
        if (bars[i] != null && b > 0 && b !== beats()) meters[tkey(bars[i])] = b;
      });
      return true;
    }

    // ---- what the taps say ----
    function lengths() {
      var out = [];
      for (var i = 0; i + 1 < bars.length; i++) out.push(bars[i + 1] - bars[i]);
      return out;
    }
    // The typical beat: each bar's length over its beats.
    function beatLen() {
      return median(lengths().map(function (l, i) { return l / beatsOf(i); }));
    }
    // The end of the last bar: its beats at the typical beat after its start.
    function lastEnd() {
      if (!bars.length) return null;
      var m = beatLen();
      return bars[bars.length - 1] + (isFinite(m) ? m * beatsOf(bars.length - 1) : 0);
    }
    // What a bar's length says: 'ok', a whole number of beats other than its own (a meter change), or a gap
    // of k bars (missed taps).
    function judge(i) {
      var len = lengths()[i], mb = beatLen(), b = beatsOf(i);
      if (!isFinite(len) || !isFinite(mb)) return { kind: 'ok' };
      if (Math.abs(len - b * mb) / (b * mb) <= 0.15) return { kind: 'ok' };
      var k = Math.round(len / (b * mb));
      if (k >= 2 && Math.abs(len - k * b * mb) / (k * b * mb) <= 0.12) return { kind: 'gap', bars: k };
      var n = Math.round(len / mb);
      if (n >= 1 && n < 2 * b && Math.abs(len - n * mb) / (n * mb) <= 0.12) return { kind: 'meter', beats: n };
      return { kind: 'odd' };
    }
    // ---- thinking in a different bar: 4/4 tapped, 2/4 meant (halve), or the other way (double) ----
    var undoState = null;
    function irregular() {
      var list = [];
      for (var i = 0; i + 1 < bars.length; i++) if (judge(i).kind !== 'ok') list.push(i + 1);
      return list;
    }
    function warnFirst(what) {
      var odd = irregular();
      if (!odd.length) return true;
      return confirm(odd.length + (odd.length === 1 ? ' bar is' : ' bars are') + ' irregular (bar ' + odd.slice(0, 8).join(', ') +
        (odd.length > 8 ? ', ...' : '') + '): a missed or extra tap, or another meter. ' + what +
        ' goes by the taps as they are, so those bars will still be wrong after. Go ahead anyway?');
    }
    function keepUndo(label) {
      undoState = { bars: bars.slice(), meters: JSON.parse(JSON.stringify(meters)), beats: beats() };
      var u = q('.btp-bars-undo');
      u.textContent = 'Undo ' + label; u.hidden = false;
    }
    // Each bar split in two at its middle; beats a bar halved. A bar with an odd number of beats can't be: it is left whole.
    function halve() {
      var b = beats();
      if (b % 2) { say(b + ' beats a bar does not halve.'); return; }
      if (bars.length < 2) { say('Tap some bars first.'); return; }
      if (!warnFirst('Halving')) return;
      keepUndo('halving');
      var mb = beatLen(), add = [], own = {}, whole = 0;
      bars.forEach(function (t, i) {
        var bi = beatsOf(i), len = i + 1 < bars.length ? bars[i + 1] - t : mb * bi;
        if (bi % 2) { whole++; if (bi !== b / 2) own[tkey(t)] = bi; return; }
        var mid = t + len / 2;
        if (i + 1 < bars.length || bi) add.push(mid);
        if (bi / 2 !== b / 2) { own[tkey(t)] = bi / 2; own[tkey(mid)] = bi / 2; }
      });
      bars = bars.concat(add).sort(function (x, y) { return x - y; });
      taps = bars.slice(); meters = own; loop = null;
      beatsIn.value = b / 2;
      save(); render();
      say('Halved: ' + bars.length + ' bars of ' + b / 2 + (whole ? '; ' + whole + ' with an odd number of beats left whole' : '') + '.');
    }
    // Bars joined in pairs; beats a bar doubled. Pairs start where the most section stamps land on the first bar of a pair:
    // a song with a one-bar pickup pairs from bar 2, the pickup keeping its own beats.
    function double() {
      var b = beats();
      if (b * 2 > 32) { say('That would be more than 32 beats a bar.'); return; }
      if (bars.length < 2) { say('Tap some bars first.'); return; }
      var secs = sections().filter(function (x) { return x.bar >= 0; });
      var off = [0, 1].map(function (o) { return secs.filter(function (x) { return (x.bar - o) % 2 !== 0; }).length; });
      var from = off[1] < off[0] ? 1 : 0, split = off[from];
      if (split && !confirm(split + (split === 1 ? ' section starts' : ' sections start') + ' on the second bar of a pair (' +
          secs.filter(function (x) { return (x.bar - from) % 2 !== 0; }).map(function (x) { return x.name; }).join(', ') +
          '): ' + (split === 1 ? 'it moves' : 'they move') + ' to the nearest bar. Double anyway?')) return;
      if (!warnFirst('Doubling')) return;
      keepUndo('doubling');
      var keep = [], own = {};
      bars.forEach(function (t, i) {
        if (i < from) { keep.push(t); if (beatsOf(i) !== 2 * b) own[tkey(t)] = beatsOf(i); return; }
        if ((i - from) % 2) return;
        var n = beatsOf(i) + (i + 1 < bars.length ? beatsOf(i + 1) : 0);
        keep.push(t);
        if (n !== 2 * b) own[tkey(t)] = n;
      });
      bars = keep; taps = bars.slice(); meters = own; loop = null;
      beatsIn.value = 2 * b;
      save(); render();
      say('Doubled: ' + bars.length + ' bars of ' + 2 * b + (from ? ', pairs from bar 2 (bar 1 a pickup)' : '') + '.');
    }
    function undoScale() {
      if (!undoState) return;
      bars = undoState.bars; taps = bars.slice(); meters = undoState.meters; beatsIn.value = undoState.beats;
      undoState = null; q('.btp-bars-undo').hidden = true;
      save(); render(); say('Undone.');
    }

    // Missed taps: a gap two or more bars long gets the bars it is missing, evenly spaced.
    function fillGaps() {
      var add = [];
      for (var i = 0; i + 1 < bars.length; i++) {
        var j = judge(i);
        if (j.kind !== 'gap') continue;
        for (var k = 1; k < j.bars; k++) add.push(bars[i] + (bars[i + 1] - bars[i]) * k / j.bars);
      }
      if (!add.length) { say('No gaps a whole number of bars long.'); return; }
      bars = bars.concat(add).sort(function (x, y) { return x - y; });
      taps = taps.concat(add);
      save(); render();
      say('Filled in ' + add.length + (add.length === 1 ? ' bar.' : ' bars.'));
    }
    // ---- Fill from the tempo: the bars after the taps (or between them) put in from the tapped tempo, a section stamp
    // being where its section starts. Between two stamps the bars are spread evenly, so the band speeding up or slowing
    // down is taken up at each stamp; a head, a solo or a shout comes out a whole number of choruses (a chorus: the first
    // Head's bars, or the box under the Timestamps) when it is that close. A tap (B) among the guessed bars is kept and the
    // guesses around it are worked out again. ----
    var guessNote = q('.btp-guess-note');
    function realBars() { return bars.filter(function (t) { return !guessed[tkey(t)]; }); }
    function secStarts() {
      return stamps.filter(function (r) { return isFinite(r.s) && (r.k === 's' || sectionName(r.n)); })
        .map(function (r) { return { s: r.s, name: r.k === 's' ? String(r.n) : sectionName(r.n), b: r.b || sectionName(r.n) }; })
        .sort(function (x, y) { return x.s - y.s; });
    }
    function extrapolate(quiet) {
      var real = realBars();
      var lens = [];
      for (var i = 0; i + 1 < real.length; i++) lens.push(real[i + 1] - real[i]);
      var m0 = median(lens), ok = lens.filter(function (l) { return l < m0 * 1.3 && l > m0 * 0.7; }), barLen = median(ok);
      if (ok.length < 3 || !isFinite(barLen)) { if (!quiet) say('Tap at least four bars in a row first.'); return false; }
      var a = api(), dur = a && a.duration ? a.duration() : NaN, secs = secStarts(), L = window.TsLabels;
      if (!secs.length) { if (!quiet) say('Stamp the sections (S) first: each one is where its bars are counted from.'); return false; }
      var reach = 0.35 * barLen;
      var nearReal = function (t) { var best = null; real.forEach(function (r) { if (Math.abs(r - t) <= reach && (best == null || Math.abs(r - t) < Math.abs(best - t))) best = r; }); return best; };
      // where each section starts: on a tap when one is close, else the stamp itself
      var starts = secs.map(function (s) { var r = nearReal(s.s); return r != null ? r : s.s; });
      // a tapped run with no gap in it: [first, last] of the real taps
      var tappedTo = function (t0, t1) {     // every gap between taps in [t0, t1) is about a bar
        var inside = real.filter(function (r) { return r >= t0 - reach && r < t1 - reach; });
        if (!inside.length || Math.abs(inside[0] - t0) > reach) return false;
        for (var j = 0; j + 1 < inside.length; j++) if (inside[j + 1] - inside[j] > 1.5 * barLen) return false;
        return t1 - inside[inside.length - 1] < 1.5 * barLen;
      };
      // the chorus: the box, else the first Head (or letters) among the sections tapped all through
      var formIn = document.querySelector('.btp-form-bars'), want = formIn ? parseInt(formIn.value, 10) : NaN;
      var list = secs.map(function (s, i) {
        var end = i + 1 < secs.length ? starts[i + 1] : NaN;
        return { b: s.b, bars: isFinite(end) && tappedTo(starts[i], end) ? Math.round((end - starts[i]) / barLen) : 0 };
      });
      var form = want > 0 ? want : (L ? L.formBars(list) : null);
      var add = [], notes = [];
      secs.forEach(function (s, i) {
        var A = starts[i], open = i + 1 >= secs.length, B = open ? dur : starts[i + 1];
        if (!isFinite(B) || B - A < barLen * 0.75) { if (open && !isFinite(dur) && !quiet) notes.push(s.name + ': the recording\'s length isn\'t known yet, so its bars stop at the stamp.'); return; }
        if (!open && tappedTo(A, B)) return;
        // the anchors: the section's start and every tap inside it
        var an = [A].concat(real.filter(function (r) { return r > A + reach && r < B - reach; }));
        var segs = [];
        for (var j = 0; j < an.length; j++) {
          var to = j + 1 < an.length ? an[j + 1] : B, raw = (to - an[j]) / barLen;
          segs.push({ from: an[j], to: to, raw: raw, open: open && j + 1 === an.length });
        }
        var rawTotal = segs.reduce(function (x, g) { return x + g.raw; }, 0), total = Math.round(rawTotal);
        var kind = L ? L.kind(s.b) : 'other';
        if (!open && form && (kind === 'head' || kind === 'solo' || kind === 'shout')) {
          var k = Math.round(rawTotal / form);
          if (k >= 1 && Math.abs(rawTotal - k * form) <= 0.12 * form) total = k * form;
          else { var h = Math.round(rawTotal / (form / 2)); if (h >= 1 && Math.abs(rawTotal - h * form / 2) <= 0.08 * form) total = h * form / 2; }
        }
        if (open) total = Math.floor(rawTotal + 0.25);        // to the end: whole bars only
        // whole bars to each piece between anchors, in proportion (largest remainder), at least one each
        var share = segs.map(function (g) { return Math.max(1, Math.floor(g.raw * total / rawTotal)); });
        var left = total - share.reduce(function (x, y) { return x + y; }, 0);
        segs.map(function (g, gi) { return { gi: gi, r: g.raw * total / rawTotal - Math.floor(g.raw * total / rawTotal) }; })
            .sort(function (x, y) { return y.r - x.r; }).forEach(function (o) { if (left > 0) { share[o.gi]++; left--; } });
        segs.forEach(function (g, gi) {
          var n = share[gi], step = g.open ? barLen : (g.to - g.from) / n;
          if (!nearReal(g.from)) add.push(g.from);
          for (var k2 = 1; k2 < n; k2++) { var t = g.from + k2 * step; if (!nearReal(t)) add.push(t); }
        });
        var each = (B - A) / total;
        var bpmHere = 60 * beats() / each, bpmHead = 60 * beats() / barLen;
        notes.push(s.name + ': ' + total + ' bars' + (form && kind !== 'word' && kind !== 'other' && !open ? ' (' + (total / form) + (total / form === 1 ? ' chorus' : ' choruses') + ')' : '') +
          (open ? ', to the end' : ', ' + rawTotal.toFixed(1) + ' at the tapped tempo; ' + Math.round(bpmHere) + ' bpm here' +
          (Math.abs(bpmHere - bpmHead) >= 1 ? ' (' + (bpmHere > bpmHead ? '+' : '') + Math.round(bpmHere - bpmHead) + ')' : '')));
      });
      // out with the old guesses, in with the new
      bars = bars.filter(function (t) { return !guessed[tkey(t)]; });
      guessed = {};
      add.forEach(function (t) { t = Math.round(t * 1000) / 1000; if (!bars.some(function (b) { return Math.abs(b - t) < 0.05; })) { bars.push(t); guessed[tkey(t)] = true; } });
      bars.sort(function (x, y) { return x - y; });
      taps = realBars();
      if (guessNote) guessNote.innerHTML = notes.length ? '<b>From the tempo</b> (' + Math.round(60 * beats() / barLen) + ' bpm tapped' + (form ? ', a chorus ' + form + ' bars' : '') + '):<br>' + notes.map(function (x) { return x.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }).join('<br>') +
        '<br><span>Tap <kbd>B</kbd> on a downbeat where the guesses drift: it is kept, and the bars around it are worked out again.</span>' : '';
      save(); render();
      if (!quiet) say(add.length ? 'Put in ' + add.length + ' bars from the tempo.' : 'Nothing to fill: every section is tapped.');
      return true;
    }
    function clearGuesses() {
      bars = realBars(); guessed = {}; taps = bars.slice();
      if (guessNote) guessNote.innerHTML = '';
      save(); render(); say('Took out the bars guessed from the tempo.');
    }
    function anyGuess() { return Object.keys(guessed).length > 0; }

    function nearestBar(t) {
      var best = -1;
      bars.forEach(function (b, i) {
        if (best < 0 || Math.abs(b - t) < Math.abs(bars[best] - t)) best = i;
      });
      return best;
    }
    function barAt(t) {
      var i = -1;
      while (i + 1 < bars.length && bars[i + 1] <= t + 0.02) i++;
      return i;
    }
    function sections() {
      var list = [];
      stamps.forEach(function (row) {
        var name = row.k === 's' ? String(row.n || '').trim() : sectionName(row.n);   // (a section stamp, S, is one by its kind)
        if (!name || !isFinite(row.s)) return;
        // the nearest tapped bar, when it is within most of a bar of the stamp: a section stamped where no bars have
        // been tapped yet keeps its own time (and does not pile onto the last bar)
        var bar = bars.length ? nearestBar(row.s) : -1, reach = 0.6 * (beatLen() * beats() || Infinity);
        if (bar >= 0 && bars.length > 1 && Math.abs(bars[bar] - row.s) > reach) bar = -1;
        list.push({ name: name, b: row.k === 's' && row.b ? row.b : name, bar: bar, start: bar >= 0 ? bars[bar] : row.s, stamp: row.s });
      });
      list.sort(function (a, b) { return a.start - b.start; });
      // a numbered stamp (Chorus 2) goes by the words' name (Chorus) when the words have only that (words.js)
      var w = document.querySelector('.btp-words'), W = w && w._btpWords;
      if (W && W.wordsName) list.forEach(function (sec) { sec.label = sec.name; sec.name = W.wordsName(sec.name); });
      list.forEach(function (sec, i) {
        var next = list[i + 1];
        sec.end = next ? next.start : lastEnd();
        sec.lastBar = next ? next.bar - 1 : bars.length - 1;
        sec.beats = [];
        for (var b = sec.bar; b >= 0 && b <= sec.lastBar; b++) sec.beats.push(beatsOf(b));
      });
      return list;
    }

    // ---- the Sections panel: each section folds open to its choruses (a head, a solo, a shout longer than a chorus),
    // and those to their bars; folded to start with, and kept as they were when the list is drawn again. Every time has
    // its pencil (time-edit.js). ----
    var unfolded = {};
    function moveBar(old, t) {
      var i = bars.indexOf(old);
      if (i < 0) return;
      if (meters[tkey(old)]) { meters[tkey(t)] = meters[tkey(old)]; delete meters[tkey(old)]; }
      delete guessed[tkey(old)];                  // corrected by hand: a bar of its own now, not a guess
      bars.splice(i, 1);
      bars = bars.filter(function (x) { return Math.abs(x - t) > 0.05; });
      bars.push(t); bars.sort(function (x, y) { return x - y; });
      taps = taps.filter(function (x) { return x !== old; }); taps.push(t);
      save();
      if (anyGuess()) extrapolate(true); else render();
    }
    function timeCell(t, label, set) {
      var wrap = document.createElement('span');
      wrap.className = 'btp-time';
      var go = document.createElement('button');
      go.type = 'button'; go.className = 'btp-stamp'; go.textContent = fmt(t);
      go.title = 'Jump to ' + fmt(t);
      go.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); seek(t); go.blur(); });
      wrap.appendChild(go);
      if (window.TsTimeEdit) wrap.appendChild(TsTimeEdit.pencil({ label: label, get: function () { return t; }, set: set }));
      return wrap;
    }
    function loopButton(part) {
      var lp = document.createElement('button');
      lp.type = 'button'; lp.className = 'btp-loop';
      var on = loop && loop.name === part.name && loop.start === part.start;
      lp.textContent = on ? 'Looping' : 'Loop';
      lp.classList.toggle('on', !!on);
      lp.disabled = part.end == null;
      if (part.end == null) lp.title = 'Tap the bars, or stamp the next section, to give this one an end';
      lp.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggleLoop(part); lp.blur(); });
      return lp;
    }
    function fold(key, summaryKids, fill) {
      var d = document.createElement('details');
      d.className = 'btp-fold-row';
      d.open = !!unfolded[key];
      var sm = document.createElement('summary');
      summaryKids.forEach(function (el) { if (el) sm.appendChild(el); });
      d.appendChild(sm);
      var body = document.createElement('div');
      body.className = 'btp-fold-kids';
      d.appendChild(body);
      var filled = false;
      var doFill = function () { if (!filled) { filled = true; fill(body); } };
      if (d.open) doFill();
      d.addEventListener('toggle', function () { unfolded[key] = d.open; if (d.open) doFill(); });
      return d;
    }
    function span(cls, text, title) { var x = document.createElement('span'); x.className = cls; x.textContent = text; if (title) x.title = title; return x; }
    function barRows(body, from, to, lens) {
      for (var i = from; i <= to && i < bars.length; i++) (function (i) {
        var t = bars[i], row = document.createElement('div');
        row.className = 'btp-bar-item' + (guessed[tkey(t)] ? ' guess' : '') + (judge(i).kind !== 'ok' ? ' odd' : '');
        row.dataset.nowBar = i;
        row.appendChild(span('btp-bar-n', 'Bar ' + (i + 1)));
        row.appendChild(timeCell(t, 'bar ' + (i + 1), function (nt) { moveBar(t, nt); }));
        row.appendChild(span('btp-sec-bars', isFinite(lens[i]) ? lens[i].toFixed(2) + ' s' : '', guessed[tkey(t)] ? 'From the tempo' : ''));
        body.appendChild(row);
      })(i);
    }
    function drawSections(secs, lens) {
      if (window.TsTimeEdit && TsTimeEdit.busy() && secRows.querySelector('.btp-time-edit')) return;   // (a time is being typed there)
      secRows.innerHTML = '';
      secEmpty.hidden = secs.length > 0;
      var L = window.TsLabels, formIn = document.querySelector('.btp-form-bars'), want = formIn ? parseInt(formIn.value, 10) : NaN;
      var nb = function (x) { return x.bar >= 0 && x.lastBar >= x.bar ? x.lastBar - x.bar + 1 : 0; };
      var form = want > 0 ? want : (L ? L.formBars(secs.map(function (x) { return { b: x.b, bars: nb(x) }; })) : null);
      secs.forEach(function (sec) {
        var li = document.createElement('li'), n = nb(sec), kind = L ? L.kind(sec.b) : 'other';
        var where = span('btp-sec-bars', sec.bar < 0 ? '' : sec.lastBar > sec.bar ? 'bars ' + (sec.bar + 1) + '–' + (sec.lastBar + 1) : 'bar ' + (sec.bar + 1));
        if (sec.hint || sec.hint2) { where.textContent += ' \u26a0'; where.title = sec.hint || sec.hint2; li.classList.add('btp-sec-off'); }
        // the section's start: its stamp, and the bar it starts on (when it is on one) moved with it
        var setStart = function (t) {
          if (log && log._btpMove) log._btpMove(sec.stamp, t);
          if (sec.bar >= 0) moveBar(bars[sec.bar], t); else render();
        };
        var choruses = form && n > form && (kind === 'head' || kind === 'solo' || kind === 'shout') ? Math.ceil(n / form) : 0;
        var head = [timeCell(sec.start, (sec.label || sec.name), setStart), span('btp-sec-name', sec.label || sec.name),
                    choruses ? span('btp-sec-chs', (Math.round(n / form * 2) / 2) + ' choruses', n + ' bars; a chorus is ' + form) : null, where, loopButton(sec)];
        var key = 's' + Math.round(sec.stamp * 1000);
        var secFold = fold(key, head, function (body) {
          if (sec.bar < 0) { body.appendChild(span('btp-log-empty', 'Tap its bars (or Fill from the tempo) to see them here.')); return; }
          if (!choruses) { barRows(body, sec.bar, sec.lastBar, lens); return; }
          for (var c = 0; c < choruses; c++) (function (c) {
            var from = sec.bar + c * form, to = Math.min(sec.lastBar, from + form - 1);
            var part = { name: (sec.label || sec.name) + ' · chorus ' + (c + 1), start: bars[from], end: to + 1 < bars.length ? bars[to + 1] : sec.end };
            var t0 = bars[from];
            var cf = fold(key + 'c' + c, [timeCell(t0, part.name, function (nt) { moveBar(t0, nt); }), span('btp-sec-name', 'Chorus ' + (c + 1)),
              span('btp-sec-bars', 'bars ' + (from + 1) + '–' + (to + 1)), loopButton(part)], function (b2) { barRows(b2, from, to, lens); });
            var cs = cf.querySelector('summary'); cs.dataset.nowFrom = from; cs.dataset.nowTo = to;
            body.appendChild(cf);
          })(c);
        });
        secFold.querySelector('summary').dataset.nowStamp = Math.round(sec.stamp * 1000);
        li.appendChild(secFold);
        secRows.appendChild(li);
      });
    }

    // ---- drawing ----
    function render() {
      var lens = lengths(), mb = beatLen(), b = beats();
      var gaps = 0;
      if (!bars.length) {
        summary.textContent = 'No bars tapped yet.';
      } else {
        var bpms = [];
        lens.forEach(function (l, i) { if (judge(i).kind === 'ok') bpms.push(60 * beatsOf(i) / l); });
        var changes = bars.filter(function (t, i) { return beatsOf(i) !== b; }).length;
        summary.textContent = bars.length + (bars.length === 1 ? ' bar' : ' bars')
          + (bpms.length ? ' · about ' + Math.round(60 / mb) + ' bpm (' +
             Math.round(Math.min.apply(null, bpms)) + '–' +
             Math.round(Math.max.apply(null, bpms)) + ')' : '')
          + ' · ' + b + ' beats a bar'
          + (anyGuess() ? ' · ' + Object.keys(guessed).length + ' from the tempo' : '')
          + (changes ? ' (' + changes + (changes === 1 ? ' bar' : ' bars') + ' in another meter)' : '');
      }

      barBody.innerHTML = '';
      // the chords of the confirmed (or grid-written) sections, bar by bar (words.js)
      var wordsEl = document.querySelector('.btp-words'), chords = {};
      try { chords = wordsEl && wordsEl._btpWords ? wordsEl._btpWords.barChords() : {}; } catch (e) { chords = {}; }
      bars.forEach(function (t, i) {
        var tr = document.createElement('tr');
        tr.dataset.nowBar = i;
        var len = lens[i], j = judge(i);
        // A bar far from the usual length: a missed or extra tap, or a bar in another meter.
        var odd = j.kind !== 'ok';
        if (odd) tr.className = 'odd';
        if (guessed[tkey(t)]) { tr.classList.add('guess'); tr.title = 'Put in from the tempo: tap B on this downbeat if it is off'; }
        if (j.kind === 'gap') gaps++;
        [String(i + 1), fmt(t), isFinite(len) ? len.toFixed(2) + ' s' : '',
         isFinite(len) ? String(Math.round(60 * beatsOf(i) / len)) : '', '', chords[i] || ''].forEach(function (text, c) {
          var td = document.createElement('td');
          if (c === 1) {
            td.appendChild(timeCell(t, 'bar ' + (i + 1), function (nt) { moveBar(t, nt); }));
          } else if (c === 4) {
            var inp = document.createElement('input');
            inp.type = 'number'; inp.min = 1; inp.max = 32; inp.className = 'btp-bar-beats';
            inp.value = beatsOf(i); inp.title = 'Beats in bar ' + (i + 1) + ': change it for a bar in another meter';
            if (meters[tkey(t)]) inp.classList.add('own');
            inp.addEventListener('keydown', function (e) { e.stopPropagation(); });
            inp.addEventListener('change', function () {
              var v = parseInt(inp.value, 10);
              if (v > 0 && v < 33 && v !== beats()) meters[tkey(t)] = v; else delete meters[tkey(t)];
              save(); render();
            });
            td.appendChild(inp);
            if (j.kind === 'meter') {
              var sug = document.createElement('button');
              sug.type = 'button'; sug.className = 'btp-suggest';
              sug.textContent = j.beats + '?';
              sug.title = 'This bar is about ' + j.beats + ' beats long: make it a ' + j.beats + '-beat bar';
              sug.addEventListener('click', function () { meters[tkey(t)] = j.beats; save(); render(); });
              td.appendChild(sug);
            }
          } else td.textContent = text;
          tr.appendChild(td);
        });
        // far left: take this bar marking out (one punched in twice)
        var xd = document.createElement('td'), xb = document.createElement('button');
        xb.type = 'button'; xb.className = 'btp-del'; xb.textContent = '\u00d7';
        xb.title = 'Delete this bar marking'; xb.setAttribute('aria-label', 'Delete bar ' + (i + 1) + ' at ' + fmt(t));
        xb.addEventListener('click', function () { removeBar(t); });
        xd.appendChild(xb); tr.insertBefore(xd, tr.firstChild);
        if (odd) tr.title = j.kind === 'gap' ? 'About ' + j.bars + ' bars long: missed taps? Fill gaps puts them in.'
          : j.kind === 'meter' ? 'About ' + j.beats + ' beats long: a bar in another meter?'
          : 'Much longer or shorter than the others: a missed or extra tap?';
        barBody.appendChild(tr);
      });

      var secs = sections();
      secRows.innerHTML = '';
      secEmpty.hidden = secs.length > 0;
      // a stamp a bar off: a section a bar over a multiple of 4 next to one a bar under (9 then 7), and the last section's
      // last tapped bar not counted -- the stamp between them is probably on the wrong downbeat
      var nb = function (x) { return x.bar >= 0 && x.lastBar >= x.bar ? x.lastBar - x.bar + 1 : 0; };
      secs.forEach(function (sec, i) {
        var nx = secs[i + 1], a = nb(sec), b = nx ? nb(nx) : 0;
        if (!nx || !a || !b || !nx.lastBar || i + 1 === secs.length - 1) return;
        if (a % 4 === 1 && b % 4 === 3) sec.hint = nx.hint2 = 'a bar off? ' + (sec.label || sec.name) + ' ' + a + ' and ' + (nx.label || nx.name) + ' ' + b + ' bars: the ' + (nx.label || nx.name) + ' stamp is probably a bar late';
        else if (a % 4 === 3 && b % 4 === 1) sec.hint = nx.hint2 = 'a bar off? ' + (sec.label || sec.name) + ' ' + a + ' and ' + (nx.label || nx.name) + ' ' + b + ' bars: the ' + (nx.label || nx.name) + ' stamp is probably a bar early';
      });
      drawSections(secs, lens);
      q('.btp-bars-fill').disabled = !gaps;
      var bb = beats();
      q('.btp-bars-halve').textContent = 'Halve bars (' + bb + ' \u2192 ' + (bb / 2) + ')';
      q('.btp-bars-double').textContent = 'Double bars (' + bb + ' \u2192 ' + (bb * 2) + ')';
      q('.btp-bars-halve').disabled = bars.length < 2 || bb % 2 === 1;
      q('.btp-bars-double').disabled = bars.length < 2 || bb * 2 > 32;
      var odd = irregular().length;
      q('.btp-bars-warn').hidden = !odd;
      q('.btp-bars-warn').textContent = odd ? odd + (odd === 1 ? ' bar looks' : ' bars look') + ' irregular (highlighted in the Bars table): check them before halving or doubling.' : '';
      q('.btp-bars-clear').disabled = !bars.length;
    }

    // ---- doing ----
    function seek(t) {
      var a = api();
      if (!a || !a.seek(t)) say('Nothing is loaded yet.');
    }
    function tap(at) {
      var a = api(), t = typeof at === 'number' ? at : a && a.time();
      if (typeof t !== 'number') { say('Nothing is playing yet.'); return; }
      // Tapping the same bar again (after going back) replaces it; among guessed bars, the guess nearest it (it drifted)
      var g = anyGuess(), half = g ? 0.5 * beatLen() * beats() : 0;
      if (g && isFinite(half)) bars = bars.filter(function (b) { return !(guessed[tkey(b)] && Math.abs(b - t) < half); });
      bars = bars.filter(function (b) { return Math.abs(b - t) > 0.15; });
      taps = taps.filter(function (b) { return Math.abs(b - t) > 0.15; });
      bars.push(t); bars.sort(function (x, y) { return x - y; });
      taps.push(t);
      flash();
      save();
      if (g) extrapolate(true); else render();
    }
    function removeBar(t) {
      bars = bars.filter(function (b) { return b !== t; });
      taps = taps.filter(function (b) { return b !== t; });
      delete meters[tkey(t)];
      save(); render();
      say('Deleted the bar marking at ' + fmt(t));
    }
    function untap() {
      var t = taps.pop();
      if (t == null) return;
      bars = bars.filter(function (b) { return b !== t; });
      save();
      if (anyGuess()) extrapolate(true); else render();
      say('Took back the bar at ' + fmt(t));
    }
    function flash() {
      now.classList.remove('tap');
      void now.offsetWidth;          // restart the animation
      now.classList.add('tap');
    }
    function toggleLoop(sec) {
      var a = api();
      if (a && a.following()) { say('Looping needs the video on this page; loop it in the YouTube tab.'); return; }
      if (loop && loop.name === sec.name && loop.start === sec.start) loop = null;
      else { loop = { name: sec.name, start: sec.start, end: sec.end }; seek(sec.start); }
      render();
    }
    function loopHere() {
      if (loop) { loop = null; render(); say('Stopped looping.'); return; }
      var a = api(), t = a && a.time();
      if (typeof t !== 'number') return;
      var secs = sections(), here = null;
      secs.forEach(function (s) { if (s.start <= t + 0.05) here = s; });
      if (!here || here.end == null) { say('No section with an end here.'); return; }
      toggleLoop(here);
    }

    // The playhead: the bar and section it is in, and the loop.
    (function watch() {
      var a = api(), t = a && a.time();
      if (typeof t === 'number') {
        if (loop && a.playing() && t >= loop.end - 0.03) a.seek(loop.start);
        var i = barAt(t), here = null;
        sections().forEach(function (s) { if (s.start <= t + 0.02) here = s; });
        var text = i >= 0 ? 'Bar ' + (i + 1) : bars.length ? 'Before bar 1' : '';
        if (here) text += (text ? ' · ' : '') + here.name;
        if (loop) text += ' · looping ' + loop.name;
        if (now.textContent !== text) now.textContent = text;
        markNow(t, i, here);
      }
      requestAnimationFrame(watch);
    })();

    // ---- where the playhead is, across the page: the clock and bar at the foot of the sidebar, and a highlight on the
    // line of the section, chorus, bar and phrase it is in. A line says what it is with data-now-bar (a bar index),
    // data-now-stamp (a section stamp, ms) or data-now-from / data-now-to (a run of bars: a chorus, a phrase). ----
    var clockT = document.querySelector('.ts-clock-t'), clockB = document.querySelector('.ts-clock-b'), nowKey = '', nowAt = 0;
    function markNow(t, i, here) {
      if (clockT) { var ct = fmt(t); if (clockT.textContent !== ct) clockT.textContent = ct; }
      if (clockB) {
        var cb = i >= 0 ? 'Bar ' + (i + 1) + (guessed[tkey(bars[i])] ? ' (guessed)' : '') : bars.length ? 'Before bar 1' : 'No bars tapped';
        var cs = here ? (here.label || here.name) : '';
        if (clockB.textContent !== cb + (cs ? ' · ' + cs : '')) clockB.textContent = cb + (cs ? ' · ' + cs : '');
      }
      var stamp = here ? String(Math.round(here.stamp * 1000)) : '', key = i + '|' + stamp, ms = Date.now();
      // (again every so often: lists are drawn afresh)
      if (key === nowKey && ms - nowAt < 400) return;
      nowKey = key; nowAt = ms;
      Array.prototype.forEach.call(document.querySelectorAll('[data-now-bar], [data-now-stamp], [data-now-from]'), function (el) {
        var d = el.dataset, on = false;
        if (d.nowBar != null) on = +d.nowBar === i;
        else if (d.nowStamp != null) on = !!stamp && d.nowStamp === stamp;
        else on = i >= 0 && i >= +d.nowFrom && i <= +d.nowTo;
        if (el.classList.contains('is-now') !== on) el.classList.toggle('is-now', on);
      });
    }

    // ---- out and back in: the bar map's part of the song file (beats per bar, a section list for anyone reading it) ----
    function asJson() {
      return JSON.stringify({
        beatsPerBar: beats(),
        bars: bars.map(function (t) { return Math.round(t * 1000) / 1000; }),
        beats: bars.map(function (t, i) { return beatsOf(i); }),
        sections: sections().map(function (s) {
          return { name: s.name, bar: s.bar + 1, time: Math.round(s.start * 1000) / 1000 };
        })
      }, null, 1);
    }
    q('.btp-bars-halve').addEventListener('click', function (e) { halve(); e.target.blur(); });
    q('.btp-bars-double').addEventListener('click', function (e) { double(); e.target.blur(); });
    q('.btp-bars-undo').addEventListener('click', function (e) { undoScale(); e.target.blur(); });
    var gcopy = q('.btp-bars-grid-copy');
    if (gcopy) gcopy.addEventListener('click', function () {
      var w = document.querySelector('.btp-words');
      if (w && w._btpWords) w._btpWords.copyGrids();
      gcopy.blur();
    });
    q('.btp-bars-fill').addEventListener('click', function (e) { fillGaps(); e.target.blur(); });
    var ex = q('.btp-bars-extrapolate'), exClear = q('.btp-bars-guess-clear');
    if (ex) ex.addEventListener('click', function (e) { extrapolate(false); e.target.blur(); });
    if (exClear) exClear.addEventListener('click', function (e) { clearGuesses(); e.target.blur(); });
    q('.btp-bars-tap').addEventListener('click', function (e) { tap(); e.target.blur(); });

    var clear = q('.btp-bars-clear'), armed = null;
    clear.addEventListener('click', function () {
      if (!armed) {
        clear.textContent = 'Clear bars — sure?';
        armed = setTimeout(function () { armed = null; clear.textContent = 'Clear bars'; }, 4000);
        return;
      }
      clearTimeout(armed); armed = null; clear.textContent = 'Clear bars';
      bars = []; taps = []; loop = null; meters = {}; guessed = {}; if (guessNote) guessNote.innerHTML = ''; undoState = null; q('.btp-bars-undo').hidden = true;
      save(); render(); clear.blur();
    });
    beatsIn.addEventListener('change', function () { save(); render(); });
    beatsIn.addEventListener('keydown', function (e) { e.stopPropagation(); });

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && t.matches && t.matches('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'b' || e.key === 'B') { tap(); e.preventDefault(); }
      else if (e.key === 'Backspace') { untap(); e.preventDefault(); }
      else if (e.key === 'L' && e.shiftKey) { loopHere(); e.preventDefault(); }
    });

    // for words.js: the sections with their bar counts, the tempo, the beats
    root._btpMap = {
      sections: function () {
        return sections().map(function (s) {
          return { name: s.name, label: s.label || s.name, bars: s.bar >= 0 && s.lastBar >= s.bar ? s.lastBar - s.bar + 1 : 0, start: s.start, stamp: s.stamp, end: s.end, beats: s.beats, bar: s.bar };
        });
      },
      bpm: function () { var m = beatLen(); return isFinite(m) ? Math.round(60 / m) : null; },
      barLen: function () { return beatLen() * beats(); },
      beats: beats,
      bars: function () { return bars.length; },
      // for live.js: tap a bar at a time (a MIDI note's), and the grid the chords are placed on
      tap: function (t) { tap(t); },
      refresh: function () { render(); },
      grid: function () { return { bars: bars.slice(), beats: bars.map(function (t, i) { return beatsOf(i); }), beatLen: beatLen() }; },
      // for phrases.js: a loop of its own (a phrase, its lead-in first); null stops looping
      setLoop: function (l) {
        var a = api();
        if (l && a && a.following()) { say('Looping needs the video on this page; loop it in the YouTube tab.'); return false; }
        loop = l ? { name: l.name, start: l.start, end: l.end } : null;
        if (loop) seek(loop.start);
        render(); return true;
      },
      loop: function () { return loop ? { name: loop.name, start: loop.start, end: loop.end } : null; },
      // the combined song file (player-log.js saves and opens it)
      state: function () { return JSON.parse(asJson()); },
      load: function (data) { if (!load(data)) return false; save(); render(); return true; }
    };

    if (log) {
      // a section stamp moved, added or taken away: the guesses follow it
      log.addEventListener('btp-stamps', function (e) {
        stamps = e.detail || [];
        clearTimeout(log._btpGuessT);
        if (anyGuess()) log._btpGuessT = setTimeout(function () { extrapolate(true); }, 300);
        render();
      });
      if (log._btpStamps) stamps = log._btpStamps();
    }
    try { load(JSON.parse(localStorage.getItem(STORE) || 'null')); } catch (e) {}
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
