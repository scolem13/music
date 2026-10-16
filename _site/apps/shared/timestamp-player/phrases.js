/* Timestamp Notes: phrases, for transcribing a phrase at a time.
   Each tapped section is cut into phrases of 2, 4 or 8 bars. A phrase loops from its lead-in (the pickup: how many
   beats before its first downbeat the melody starts, up to 2 bars, never back past the start of the phrase before it)
   to the downbeat after its last bar. Notate goes to the phrase on the Notation page (nt-goto; the piece is sent only when
   that page answers nt-need-doc); the Notation page's "Back to the recording" (nt-back) brings it here and loops the next phrase.
   The seam bar a lead-in shares with the phrase before is apps/shared/phrase-seam.js (see NOTATION-DWIM.md).

     p          loop the phrase under the playhead (again: stop)
     , .        loop the previous / next phrase
     - =        lead-in half a beat shorter / longer
     t          this phrase to the Notation page

   Kept in localStorage (btp-phrases: { size, leadIns: { "verse 1#0@4": beats } }) and in the song file (phrases).
   The plan (split, loop times, the lead-in limit) is TsPhrases, which loads in Node for tests. */
(function (global) {
  "use strict";

  // sections: [{ name, bar, bars }] (bar-map.js, in time order); -> [{ key, name, nth, sec, from, to, part, parts }]
  function split(sections, size) {
    size = size || 4;
    var out = [], count = {};
    sections.forEach(function (s, si) {
      var low = s.name.toLowerCase(), nth = count[low] = (count[low] == null ? 0 : count[low] + 1);
      if (!(s.bar >= 0) || !(s.bars > 0)) return;
      // whole phrases of `size` bars; a remainder of half a phrase or more is a phrase of its own, a shorter one joins the last
      var cuts = [0], n = Math.floor(s.bars / size), r = s.bars - n * size;
      for (var k = 1; k <= n; k++) cuts.push(k * size);
      if (!n) cuts.push(s.bars);
      else if (r && r >= size / 2) cuts.push(s.bars);
      else cuts[cuts.length - 1] = s.bars;
      n = cuts.length - 1;
      for (var p = 0; p < n; p++) {
        if (cuts[p + 1] <= cuts[p]) continue;
        out.push({ key: low + '#' + nth + '@' + cuts[p], name: s.name, nth: nth, sec: si, offset: cuts[p],
                   from: s.bar + cuts[p], to: s.bar + cuts[p + 1], part: p + 1, parts: n });
      }
    });
    return out;
  }
  // grid: { bars: [start s], beats: [per bar], beatLen }. The time `beats` beats before bar `from` (walking back through
  // the bars before it at their own tempo; before bar 1 at the typical beat, never before 0).
  function backFrom(grid, from, beats) {
    var t = grid.bars[from], left = beats, b = from - 1;
    while (left > 1e-6 && b >= 0) {
      var per = (grid.bars[b + 1] - grid.bars[b]) / grid.beats[b], take = Math.min(left, grid.beats[b]);
      t -= take * per; left -= take; b--;
    }
    if (left > 1e-6) t -= left * (grid.beatLen || 0.5);
    return Math.max(0, t);
  }
  function endOf(grid, to) {
    if (to < grid.bars.length) return grid.bars[to];
    var last = grid.bars.length - 1;
    return grid.bars[last] + grid.beats[last] * (grid.beatLen || 0.5);
  }
  // The longest lead-in phrase i may have, in beats: two bars before it, and less than the phrase before it (it keeps a beat).
  function maxLeadIn(grid, phrases, i) {
    var ph = phrases[i], two = 0;
    for (var b = ph.from - 1; b >= ph.from - 2; b--) two += b >= 0 ? grid.beats[b] : (grid.beats[0] || 4);
    var prev = phrases[i - 1];
    if (prev && prev.to === ph.from) {
      var room = 0;
      for (var c = prev.from; c < prev.to; c++) room += grid.beats[c];
      two = Math.min(two, room - 1);
    } else if (ph.from === 0 || !prev) {
      // the first phrase: back to the start of the recording
      var per = grid.beatLen || 0.5;
      two = Math.min(two, Math.floor(grid.bars[ph.from] / per * 2) / 2);
    }
    return Math.max(0, two);
  }
  // Where phrase i loops: { start, end, leadIn } in seconds (leadIn clamped).
  function loopOf(grid, phrases, i, leadIn) {
    var ph = phrases[i], li = Math.max(0, Math.min(leadIn || 0, maxLeadIn(grid, phrases, i)));
    return { start: backFrom(grid, ph.from, li), end: endOf(grid, ph.to), leadIn: li };
  }
  var api = { split: split, backFrom: backFrom, endOf: endOf, maxLeadIn: maxLeadIn, loopOf: loopOf };
  global.TsPhrases = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  var STORE = 'btp-phrases';

  function boot() {
    var root = document.querySelector('.btp-phrases');
    var mapEl = document.querySelector('.btp-barmap'), wordsEl = document.querySelector('.btp-words');
    var player = document.querySelector('.btp');
    if (!root || !mapEl) return;
    var q = function (sel) { return root.querySelector(sel); };
    var list = q('.btp-ph-rows'), empty = q('.btp-ph-empty'), sizeIn = q('.btp-ph-size'), note = q('.btp-ph-note');
    var state = { size: 4, leadIns: {} };
    try { var kept = JSON.parse(localStorage.getItem(STORE) || 'null'); if (kept) state = { size: kept.size || 4, leadIns: kept.leadIns || {} }; } catch (e) {}
    sizeIn.value = String(state.size);

    function M() { return mapEl._btpMap; }
    function W() { return wordsEl && wordsEl._btpWords; }
    function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
    function say(t) { note.textContent = t || ''; }
    function phrases() { var m = M(); return m ? split(m.sections(), state.size) : []; }
    function grid() { var m = M(); return m ? m.grid() : null; }
    function label(ph) { return ph.name + (ph.parts > 1 ? ' · ' + ph.part + '/' + ph.parts : ''); }
    function beatsText(b) { return b ? (b % 1 ? b.toFixed(1) : String(b)) + (b === 1 ? ' beat' : ' beats') : 'none'; }
    function loopName(ph) { return label(ph) + ' (phrase)'; }
    function current() {
      var m = M(), l = m && m.loop(), all = phrases();
      if (!l) return -1;
      for (var i = 0; i < all.length; i++) if (l.name === loopName(all[i])) return i;
      return -1;
    }
    function hereIndex() {
      var a = player && player._btp, t = a && a.time(), g = grid(), all = phrases();
      if (typeof t !== 'number' || !g) return -1;
      var k = -1;
      all.forEach(function (ph, i) { if (g.bars[ph.from] <= t + 0.05) k = i; });
      return k;
    }

    function loopAt(i) {
      var all = phrases(), g = grid(), m = M();
      if (!all[i] || !g) return;
      var l = loopOf(g, all, i, state.leadIns[all[i].key]);
      if (m.setLoop({ name: loopName(all[i]), start: l.start, end: l.end }))
        say('Looping ' + label(all[i]) + ', bars ' + (all[i].from + 1) + '–' + all[i].to + (l.leadIn ? ', from ' + beatsText(l.leadIn) + ' before' : '') + '.');
      render();
    }
    function toggle() {
      var c = current();
      if (c >= 0) { M().setLoop(null); say('Stopped looping.'); render(); return; }
      var h = hereIndex();
      if (h < 0) { say(phrases().length ? 'Before the first phrase.' : 'Tap the bars and stamp the sections first.'); return; }
      loopAt(h);
    }
    function step(d) {
      var c = current(); if (c < 0) c = hereIndex();
      var n = c + d, all = phrases();
      if (n < 0 || n >= all.length) { say(d > 0 ? 'That was the last phrase.' : 'That is the first phrase.'); return; }
      loopAt(n);
    }
    function nudge(i, d) {
      var all = phrases(), g = grid();
      if (!all[i] || !g) return;
      var k = all[i].key, max = maxLeadIn(g, all, i), v = Math.max(0, Math.min(max, (state.leadIns[k] || 0) + d));
      if (v) state.leadIns[k] = v; else delete state.leadIns[k];
      save();
      if (current() === i) loopAt(i); else render();
      if (d > 0 && v === max) say('As far back as it goes: ' + (max ? beatsText(max) + ' (two bars at most, and the phrase before keeps a beat).' : 'there is no room before it.'));
    }

    // ---- to the Notation page and back ----
    // The phrase is asked for by section name and bar; a Notation page without that section answers nt-need-doc, and only
    // then is the piece sent (so a transcription already there is never replaced unasked).
    var lastGoto = null;
    function toNotation(i) {
      var all = phrases(), w = W();
      if (i == null) { i = current(); if (i < 0) i = hereIndex(); }
      if (!all[i]) { say('No phrase here: tap the bars and stamp the sections first.'); return; }
      if (!w || !w.remote) { say('The words part is not loaded.'); return; }
      var ph = all[i], g = grid(), li = loopOf(g, all, i, state.leadIns[ph.key]).leadIn;
      lastGoto = { type: 'nt-goto', section: ph.name, nth: ph.nth, bar: ph.offset, bars: ph.to - ph.from, leadIn: li,
                   label: label(ph), host: 'Timestamp Notes' };
      if (w.remote('/tools/notation.html?remote=1', 'ts-notation', 'nt-ready', [lastGoto]))
        say('To the Notation page: ' + label(ph) + (li ? ', with a lead-in of ' + beatsText(li) : '') + '.');
    }
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'nt-need-doc' || !lastGoto) return;
      var w = W(), win = w && w.remoteWin('ts-notation');
      if (!win || e.source !== win) return;
      var c = w.buildDoc();
      if (!c) { say('Nothing to send yet: paste the words and chords, then Convert.'); return; }
      win.postMessage({ type: 'nt-doc', doc: c.doc, title: c.title, tempo: c.bpm, host: 'Timestamp Notes' }, location.origin);
      win.postMessage(lastGoto, location.origin);
    });
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'nt-back') return;
      var w = W();
      if (!w || e.source !== w.remoteWin('ts-notation')) return;
      try { window.focus(); } catch (err) {}
      var c = current(); if (c < 0) c = hereIndex();
      step(e.data.again ? 0 : 1);
      if (c < 0 && !e.data.again) loopAt(0);
    });

    // ---- drawing ----
    function render() {
      var all = phrases(), g = grid(), c = current();
      list.innerHTML = '';
      empty.hidden = all.length > 0;
      all.forEach(function (ph, i) {
        var li = document.createElement('li'); li.classList.toggle('on', i === c);
        li.dataset.nowFrom = ph.from; li.dataset.nowTo = ph.to - 1;     // (the playhead's phrase is highlighted: bar-map.js)
        var go = document.createElement('button');
        go.type = 'button'; go.className = 'btp-loop'; go.textContent = i === c ? 'Looping' : 'Loop';
        go.classList.toggle('on', i === c);
        go.addEventListener('click', function () { if (current() === i) { M().setLoop(null); render(); } else loopAt(i); go.blur(); });
        var name = document.createElement('span'); name.className = 'btp-sec-name'; name.textContent = label(ph);
        var where = document.createElement('span'); where.className = 'btp-sec-bars';
        where.textContent = ph.to - ph.from > 1 ? 'bars ' + (ph.from + 1) + '–' + ph.to : 'bar ' + (ph.from + 1);
        var lead = document.createElement('span'); lead.className = 'btp-ph-lead';
        var v = g ? loopOf(g, all, i, state.leadIns[ph.key]).leadIn : 0;
        var minus = document.createElement('button'), plus = document.createElement('button'), val = document.createElement('span');
        minus.type = plus.type = 'button'; minus.textContent = '−'; plus.textContent = '+';
        minus.title = 'Lead-in half a beat shorter'; plus.title = 'Lead-in half a beat longer (the pickup starts earlier)';
        minus.setAttribute('aria-label', 'Shorter lead-in for ' + label(ph)); plus.setAttribute('aria-label', 'Longer lead-in for ' + label(ph));
        val.textContent = 'lead-in ' + beatsText(v);
        minus.addEventListener('click', function () { nudge(i, -0.5); minus.blur(); });
        plus.addEventListener('click', function () { nudge(i, 0.5); plus.blur(); });
        lead.appendChild(minus); lead.appendChild(val); lead.appendChild(plus);
        var send = document.createElement('button');
        send.type = 'button'; send.className = 'btp-ph-send'; send.textContent = 'Notate';
        send.title = 'Go to this phrase on the Notation page (T)';
        send.addEventListener('click', function () { toNotation(i); send.blur(); });
        [go, name, where, lead, send].forEach(function (el) { li.appendChild(el); });
        list.appendChild(li);
      });
    }

    sizeIn.addEventListener('change', function () { state.size = +sizeIn.value || 4; save(); render(); sizeIn.blur(); });
    sizeIn.addEventListener('keydown', function (e) { e.stopPropagation(); });
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && t.matches && t.matches('input, textarea, select, [contenteditable]')) return;
      var c = current(); if (c < 0) c = hereIndex();
      if (e.key === 'p' || e.key === 'P') { toggle(); e.preventDefault(); }
      else if (e.key === ',') { step(-1); e.preventDefault(); }
      else if (e.key === '.') { step(1); e.preventDefault(); }
      else if (e.key === '-' && c >= 0) { nudge(c, -0.5); e.preventDefault(); }
      else if ((e.key === '=' || e.key === '+') && c >= 0) { nudge(c, 0.5); e.preventDefault(); }
      else if (e.key === 't' || e.key === 'T') { toNotation(); e.preventDefault(); }
    });
    // the bar map and stamps change under it: redraw now and then (cheap)
    var lastSig = '';
    var logEl = document.querySelector('.btp-log');
    if (logEl) logEl.addEventListener('btp-stamps', function () { setTimeout(tick, 0); });
    function tick() {
      var all = phrases(), sig = all.map(function (p) { return p.key + p.from + '-' + p.to; }).join('|') + '|' + current();
      if (sig !== lastSig) { lastSig = sig; render(); }
    }
    setInterval(tick, 700);

    root._btpPhrases = {
      state: function () { return JSON.parse(JSON.stringify(state)); },
      load: function (d) { if (!d) return; state = { size: d.size || 4, leadIns: d.leadIns || {} }; sizeIn.value = String(state.size); save(); render(); },
      phrases: phrases, loopAt: loopAt, toNotation: toNotation, nudge: nudge
    };
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
