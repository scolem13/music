/* Timestamp Notes: phrases, for transcribing a phrase at a time.
   Each tapped section is cut into phrases of 2, 4 or 8 bars. A phrase loops from its lead-in (the pickup: how many
   beats before its first downbeat the melody starts, up to 2 bars, never back past the start of the phrase before it)
   to the downbeat after its last bar. Notate goes to the phrase on the Notation page (nt-goto; the piece is sent only when
   that page answers nt-need-doc); the Notation page's "Back to the recording" (nt-back) brings it here and loops the next phrase.
   The seam bar a lead-in shares with the phrase before is apps/shared/phrase-seam.js (see NOTATION-DWIM.md).

     p          loop the phrase under the playhead (again: stop)
     , .        loop the previous / next phrase
     - =        lead-in half a beat shorter / longer
     { }        stop point half a beat earlier / later (the tail: how far past the phrase's last bar the loop runs, up to 2 bars)
     t          this phrase to the Notation page

   Kept in localStorage (btp-phrases: { size, leadIns: { "verse 1#0@4": beats }, tails: { key: beats } }) and in the song file (phrases).
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
  // The time `beats` beats after the start of bar `to` (walking forward through the bars at their own tempo; past the last
  // tapped bar at the typical beat).
  function forwardFrom(grid, to, beats) {
    var t = endOf(grid, to), left = beats, b = to;
    while (left > 1e-6 && b + 1 < grid.bars.length) {
      var per = (grid.bars[b + 1] - grid.bars[b]) / grid.beats[b], take = Math.min(left, grid.beats[b]);
      t += take * per; left -= take; b++;
    }
    if (left > 1e-6) t += left * (grid.beatLen || 0.5);
    return t;
  }
  // The longest tail (stop point past the phrase's last bar) phrase i may have, in beats: two bars.
  function maxTail(grid, phrases, i) {
    var ph = phrases[i], two = 0;
    for (var b = ph.to; b < ph.to + 2; b++) two += grid.beats[b] || grid.beats[grid.beats.length - 1] || 4;
    return two;
  }
  // The earliest stop (a negative tail: before the phrase's last downbeat-after), in beats: the phrase keeps a beat.
  function minTail(grid, phrases, i) {
    var ph = phrases[i], len = 0;
    for (var b = ph.from; b < ph.to; b++) len += grid.beats[b] || 4;
    return -Math.max(0, len - 1);
  }
  // The phrase's tapped tempo (bpm)
  function bpmOf(grid, ph) {
    var beats = 0; for (var b = ph.from; b < ph.to; b++) beats += grid.beats[b] || 4;
    var secs = endOf(grid, ph.to) - grid.bars[ph.from];
    return secs > 0 ? beats * 60 / secs : null;
  }
  // Where phrase i loops: { start, end, leadIn, tail } in seconds / beats (leadIn and tail clamped).
  function loopOf(grid, phrases, i, leadIn, tail) {
    var ph = phrases[i], li = Math.max(0, Math.min(leadIn || 0, maxLeadIn(grid, phrases, i)));
    var tl = Math.max(minTail(grid, phrases, i), Math.min(tail || 0, maxTail(grid, phrases, i)));
    return { start: backFrom(grid, ph.from, li), end: tl > 0 ? forwardFrom(grid, ph.to, tl) : tl < 0 ? backFrom(grid, ph.to, -tl) : endOf(grid, ph.to), leadIn: li, tail: tl };
  }
  // Cut each section of a Notation doc (NotationDoc D) into a chunk per phrase: phrases from split(), matched to the doc's
  // sections by name and occurrence. Chunks without notes keep their words on the section's first chunk. Relabels (I1a, V1b ...).
  function chunkDoc(doc, D, phrases) {
    var secs = D.sections(doc), count = {}, jobs = [];
    secs.forEach(function (sc) {
      var low = sc.name.trim().toLowerCase(), nth = count[low] = (count[low] == null ? 0 : count[low] + 1);
      var cuts = phrases.filter(function (ph) { return ph.name.trim().toLowerCase() === low && ph.nth === nth && ph.offset > 0; })
                        .map(function (ph) { return ph.offset; });
      if (cuts.length) jobs.push({ sc: sc, cuts: cuts });
    });
    for (var j = jobs.length - 1; j >= 0; j--) {                 // from the back, so earlier sections' indices stay put
      var sc = jobs[j].sc, end = sc.end, words = doc.chunks[sc.start].words;
      jobs[j].cuts.slice().reverse().forEach(function (cut) {
        var acc = 0;
        for (var ci = sc.start; ci < end; ci++) {
          var mi = D.meterInfo(D.at(doc, ci).meter) || D.meterInfo('4/4'), bars = D.info(doc, ci).bars;
          if (cut > acc + 1e-6 && cut < acc + bars - 1e-6) {
            if (!D.splitAt(doc, ci, (cut - acc) * mi.barQ)) end++;
            break;
          }
          acc += Math.ceil(bars - 1e-6);
        }
      });
      var noNotes = true;
      for (var k = sc.start; k < end; k++) if (D.info(doc, k).rhythm) noNotes = false;
      if (noNotes) for (var k2 = sc.start; k2 < end; k2++) doc.chunks[k2].words = k2 === sc.start ? words : '';
    }
    D.chunkLabels(doc);
    return doc;
  }
  // The tapped tempo onto a Notation doc: doc.tempo the first section's (else the song's) (sections: [{ name, bar, bars }], grid as above), and a
  // section's first chunk its own tempo where it differs by 3 bpm or more from the one before it.
  function tempos(doc, D, sections, grid) {
    function bpmOf(from, to) {
      var beats = 0, secs = 0;
      for (var b = from; b < to && b + 1 < grid.bars.length; b++) { beats += grid.beats[b]; secs += grid.bars[b + 1] - grid.bars[b]; }
      return secs > 0 ? beats * 60 / secs : null;
    }
    var all = bpmOf(0, grid.bars.length) || (grid.beatLen > 0 ? 60 / grid.beatLen : null);
    if (!all) return doc;
    doc.tempo = Math.round(all);
    var count = {}, now = doc.tempo, byKey = {};
    sections.forEach(function (s) {
      var low = s.name.trim().toLowerCase(), nth = count[low] = (count[low] == null ? 0 : count[low] + 1);
      byKey[low + '#' + nth] = s;
    });
    count = {};
    D.sections(doc).forEach(function (sc) {
      var low = sc.name.trim().toLowerCase(), nth = count[low] = (count[low] == null ? 0 : count[low] + 1), s = byKey[low + '#' + nth];
      var b = s && s.bars > 0 ? bpmOf(s.bar, s.bar + s.bars) : null;
      if (!b) return;
      b = Math.round(b);
      if (sc.start === 0) { doc.tempo = now = b; return; }
      if (Math.abs(b - now) >= 3) { doc.chunks[sc.start].tempo = b; now = b; }
      else if (doc.chunks[sc.start].tempo) delete doc.chunks[sc.start].tempo;
    });
    return doc;
  }
  var api = { tempos: tempos, chunkDoc: chunkDoc, split: split, backFrom: backFrom, endOf: endOf, maxLeadIn: maxLeadIn, maxTail: maxTail, minTail: minTail, bpmOf: bpmOf, forwardFrom: forwardFrom, loopOf: loopOf };
  global.TsPhrases = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  var STORE = 'btp-phrases';

  function boot() {
    var root = document.querySelector('.btp-phrases:not(.pc-shell)');
    var mapEl = document.querySelector('.btp-barmap:not(.pc-shell)'), wordsEl = document.querySelector('.btp-words:not(.pc-shell)');
    var player = document.querySelector('.btp');
    if (!root || !mapEl) return;
    var q = function (sel) { return PanelColumns.q(root, sel); };
    var modeIn = q('.btp-ph-mode');
    var list = q('.btp-ph-rows'), empty = q('.btp-ph-empty'), sizeIn = q('.btp-ph-size'), note = q('.btp-ph-note');
    var state = { size: 4, leadIns: {}, tails: {} };
    try { var kept = JSON.parse(localStorage.getItem(STORE) || 'null'); if (kept) state = { size: kept.size || 4, leadIns: kept.leadIns || {}, tails: kept.tails || {}, mode: kept.mode }; } catch (e) {}
    sizeIn.value = String(state.size);
    if (modeIn) modeIn.value = state.mode || 'listen';

    function M() { return mapEl._btpMap; }
    function W() { return wordsEl && wordsEl._btpWords; }
    function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
    function say(t) { note.textContent = t || ''; }
    function phrases() { var m = M(); return m ? split(m.sections(), state.size) : []; }
    function grid() { var m = M(); return m ? m.grid() : null; }
    function label(ph) { return ph.name + (ph.parts > 1 ? ' · ' + ph.part + '/' + ph.parts : ''); }
    function beatsText(b) { return b ? (b % 1 ? b.toFixed(1) : String(b)) + (b === 1 ? ' beat' : ' beats') : 'none'; }
    function loopName(ph) { return label(ph) + ' (chunk)'; }
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
      var l = loopOf(g, all, i, state.leadIns[all[i].key], state.tails[all[i].key]);
      pass = 0;
      if (player && player._btp && player._btp.playing()) setTimeout(startPass, 60);
      if (m.setLoop({ name: loopName(all[i]), start: l.start, end: l.end }))
        say('Looping ' + label(all[i]) + ', bars ' + (all[i].from + 1) + '–' + all[i].to + (l.leadIn ? ', from ' + beatsText(l.leadIn) + ' before' : '') + (l.tail > 0 ? ', to ' + beatsText(l.tail) + ' after' : l.tail < 0 ? ', stopping ' + beatsText(-l.tail) + ' early' : '') + '.');
      render();
    }
    function toggle() {
      var c = current();
      if (c >= 0) { M().setLoop(null); say('Stopped looping.'); render(); return; }
      var h = hereIndex();
      if (h < 0) { say(phrases().length ? 'Before the first chunk.' : 'Tap the bars and stamp the sections first.'); return; }
      loopAt(h);
    }
    function step(d) {
      var c = current(); if (c < 0) c = hereIndex();
      var n = c + d, all = phrases();
      if (n < 0 || n >= all.length) { say(d > 0 ? 'That was the last chunk.' : 'That is the first chunk.'); return; }
      loopAt(n);
    }
    function nudge(i, d) {
      var all = phrases(), g = grid();
      if (!all[i] || !g) return;
      var k = all[i].key, max = maxLeadIn(g, all, i), v = Math.max(0, Math.min(max, (state.leadIns[k] || 0) + d));
      if (v) state.leadIns[k] = v; else delete state.leadIns[k];
      save();
      if (current() === i) loopAt(i); else render();
      if (d > 0 && v === max) say('As far back as it goes: ' + (max ? beatsText(max) + ' (two bars at most, and the chunk before keeps a beat).' : 'there is no room before it.'));
    }

    function nudgeTail(i, d) {
      var all = phrases(), g = grid();
      if (!all[i] || !g) return;
      var k = all[i].key, max = maxTail(g, all, i), min = minTail(g, all, i), v = Math.max(min, Math.min(max, (state.tails[k] || 0) + d));
      if (v) state.tails[k] = v; else delete state.tails[k];
      save();
      if (current() === i) loopAt(i); else render();
      if (d > 0 && v === max) say('As far as it goes: ' + beatsText(max) + ' (two bars at most).');
      else if (d < 0 && v === min) say('As early as it goes: the chunk keeps a beat.');
    }

    // ---- loop modes: listen, play along, play alone (silent, a click), listen then play ----
    // A pass you play is a take on the Notation page: it is told when the phrase's first downbeat sounds (nt-pass, in
    // epoch ms, so the two windows share a clock) and records with no count-in of its own.
    var pass = 0, actx = null, clickT = null;
    function mode() { return (modeIn && modeIn.value) || 'listen'; }
    function playing(n) { var md = mode(); return md === 'along' || md === 'alone' || (md === 'cycle' && n % 2 === 1); }
    function silent(n) { var md = mode(); return md === 'alone' || (md === 'cycle' && n % 2 === 1); }
    function startPass() {
      var c = current(), a = player && player._btp; if (c < 0 || !a) return;
      var all = phrases(), g = grid(), ph = all[c], lp = loopOf(g, all, c, state.leadIns[ph.key], state.tails[ph.key]);
      a.setMuted && a.setMuted(silent(pass));
      clickOn(silent(pass));
      if (!playing(pass)) { say('Listening to ' + label(ph) + (mode() === 'cycle' ? '; you play the next pass.' : '.')); return; }
      var w = W(), win = w && w.remoteWin && w.remoteWin('ts-notation');
      if (!win) { say('Playing ' + label(ph) + '. Open it on the Notation page (T) to keep each pass as a take.'); return; }
      var rate = a.rate ? a.rate() : 1, beats = 0;
      for (var b = ph.from; b < ph.to; b++) beats += g.beats[b] || 4;
      var beatSec = (endOf(g, ph.to) - g.bars[ph.from]) / beats / rate, now = a.time();
      var downAt = Date.now() + (g.bars[ph.from] - now) / rate * 1000, endAt = Date.now() + (lp.end - now) / rate * 1000;
      win.postMessage({ type: 'nt-pass', section: ph.name, nth: ph.nth, bar: ph.offset, bars: ph.to - ph.from, leadIn: lp.leadIn, tail: lp.tail,
        label: label(ph), downAt: downAt, endAt: endAt, beatSec: beatSec, host: 'Timestamp Notes' }, location.origin);
      say('Your turn: ' + label(ph) + (silent(pass) ? ' (recording silent)' : '') + '. This pass is a take on the Notation page.');
    }
    // a click on each tapped beat while the recording is silent
    function clickOn(on) {
      clearInterval(clickT); clickT = null; if (!on) return;
      var last = -1;
      clickT = setInterval(function () {
        var a = player && player._btp, g = grid(); if (!a || !g || !a.playing()) return;
        var t = a.time(), b = -1; for (var i = 0; i < g.bars.length; i++) if (g.bars[i] <= t) b = i;
        if (b < 0) return;
        var len = endOf(g, b + 1) - g.bars[b], k = Math.floor((t - g.bars[b]) / len * g.beats[b]), id = b * 64 + k;
        if (id === last) return; last = id; tick1(k === 0);
      }, 10);
    }
    function tick1(down) {
      try {
        if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); if (window.AudioTap) AudioTap.register(actx); }
        var o = actx.createOscillator(), gn = actx.createGain(), t = actx.currentTime;
        o.frequency.value = down ? 1500 : 1000; gn.gain.setValueAtTime(0.25, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.connect(gn); gn.connect(actx.destination); o.start(t); o.stop(t + 0.06);
      } catch (e) {}
    }
    if (M() && M().onWrap) M().onWrap(function (l) { if (current() < 0) return; pass++; startPass(); });
    if (modeIn) modeIn.addEventListener('change', function () { state.mode = modeIn.value; save(); pass = 0; var a = player && player._btp; if (a && a.setMuted) a.setMuted(false); clickOn(false); modeIn.blur(); });
    // a loop started (or the player started on one): its first pass
    var wasOn = false;
    setInterval(function () {
      var a = player && player._btp, on = !!(a && a.playing() && current() >= 0);
      if (on && !wasOn) startPass();
      if (!on && wasOn) { clickOn(false); if (a && a.setMuted && current() < 0) a.setMuted(false); }
      wasOn = on;
    }, 100);

    // ---- to the Notation page and back ----
    // The phrase is asked for by section name and bar; a Notation page without that section answers nt-need-doc, and only
    // then is the piece sent (so a transcription already there is never replaced unasked).
    var lastGoto = null;
    function toNotation(i, quiet) {
      var all = phrases(), w = W();
      if (i == null) { i = current(); if (i < 0) i = hereIndex(); }
      if (!all[i]) { say('No chunk here: tap the bars and stamp the sections first.'); return; }
      if (!w || !w.remote) { say('The words part is not loaded.'); return; }
      var ph = all[i], g = grid(), lp = loopOf(g, all, i, state.leadIns[ph.key], state.tails[ph.key]), li = lp.leadIn;
      var a0 = player && player._btp;
      lastGoto = { type: 'nt-goto', section: ph.name, nth: ph.nth, bar: ph.offset, bars: ph.to - ph.from, leadIn: li, tail: lp.tail,
                   bpm: bpmOf(g, ph), rate: a0 && a0.rate ? a0.rate() : 1,
                   label: label(ph), host: 'Timestamp Notes' };
      var open = quiet && w.remoteWin && w.remoteWin('ts-notation');
      if (open) { open.postMessage(lastGoto, location.origin); return; }        // from the Notation page's keys: no window switching
      if (w.remote('/tools/notation.html?remote=1', 'ts-notation', 'nt-ready', [lastGoto]))
        say('To the Notation page: ' + label(ph) + (li ? ', with a lead-in of ' + beatsText(li) : '') + '.');
    }
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'nt-need-doc' || !lastGoto) return;
      var w = W(), win = w && w.remoteWin('ts-notation');
      if (!win || e.source !== win) return;
      var c = w.buildDoc();
      if (!c) { say('Nothing to send yet: paste the words and chords, then Convert.'); return; }
      win.postMessage({ type: 'nt-doc', doc: asChunks(c.doc), title: c.title, tempo: c.bpm, host: 'Timestamp Notes' }, location.origin);
      win.postMessage(lastGoto, location.origin);
    });
    // phrases as chunks (the Send to Notation button and the doc sent with Notate both use this)
    // the player's Speed row shows the tempo it plays at: the tapped bars' (3 averaged) where the recording is
    if (player) player._btpBpm = function (t) {
      var g = grid(); if (!g || g.bars.length < 2) return null;
      var b = -1; for (var i = 0; i < g.bars.length; i++) if (g.bars[i] <= t + 1e-6) b = i;
      if (b < 0) b = 0;
      var a = Math.max(0, b - 1), z = Math.min(g.bars.length - 2, b + 1), beats = 0, secs = 0;
      for (var k = a; k <= z; k++) { beats += g.beats[k]; secs += g.bars[k + 1] - g.bars[k]; }
      return secs > 0 ? beats * 60 / secs : null;
    };
    function asChunks(doc) {
      var box = q('.btp-ph-chunks'), m = M(), g = grid(), D = window.NotationDoc;
      if (m && g && g.bars.length > 1) tempos(doc, D, m.sections(), g);       // the tapped tempo, section by section
      return box && !box.checked ? doc : chunkDoc(doc, D, phrases());
    }
    // nt-listen { section, nth, bar (bars into the section, fractional; < 0 in its pickup), pause }: Shift+Space on the
    // Notation page plays the recording from the note being written
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'nt-listen') return;
      var w = W(), a = player && player._btp, m = M(), g = grid();
      if (!w || e.source !== w.remoteWin('ts-notation') || !a) return;
      if (e.data.pause) { if (a.playing()) a.toggle(); return; }
      var low = String(e.data.section || '').trim().toLowerCase(), n = 0, sec = null;
      (m ? m.sections() : []).forEach(function (s) { if (s.name.trim().toLowerCase() === low && n++ === (e.data.nth | 0)) sec = s; });
      if (!sec || !g) { say('Shift+Space on the Notation page: no section ' + (e.data.section || '') + ' here.'); return; }
      var x = sec.bar + (+e.data.bar || 0), b = Math.floor(x), t;
      if (b < 0) t = Math.max(0, g.bars[0] + x * (g.beats[0] || 4) * (g.beatLen || 0.5));
      else if (b >= g.bars.length) { say('That is past the last tapped bar.'); return; }
      else t = g.bars[b] + (x - b) * (endOf(g, b + 1) - g.bars[b]);
      var l = m.loop && m.loop();
      if (l && (t < l.start - 0.01 || t >= l.end)) { m.setLoop(null); render(); }
      a.seek(t);
      if (!a.playing()) a.toggle();
      say('From the Notation page: bar ' + (b + 1) + '.');
    });
    // nt-loop { action } from the Notation page (its \ keys): the loop driven from there; the answer (nt-loop-state) is what
    // this page said, and a phrase changed is sent there as nt-goto so the takes follow
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'nt-loop') return;
      var w = W(), win = w && w.remoteWin('ts-notation');
      if (!win || e.source !== win) return;
      var a = player && player._btp, c = current(), was = c, act = e.data.action;
      if (c < 0) c = hereIndex();
      if (act === 'toggle') toggle();
      else if (act === 'prev') step(-1);
      else if (act === 'next') step(1);
      else if (act === 'again') { if (c >= 0) loopAt(c); if (a && !a.playing()) a.toggle(); }
      else if (act === 'leadLess' && c >= 0) nudge(c, -0.5);
      else if (act === 'leadMore' && c >= 0) nudge(c, 0.5);
      else if (act === 'tailLess' && c >= 0) nudgeTail(c, -0.5);
      else if (act === 'tailMore' && c >= 0) nudgeTail(c, 0.5);
      else if (act === 'mode' && modeIn) { var o = modeIn.options, k = (modeIn.selectedIndex + 1) % o.length; modeIn.value = o[k].value; modeIn.dispatchEvent(new Event('change')); say('Loop mode: ' + o[k].textContent + '.'); }
      else if (act === 'play' && a) a.toggle();
      var now = current();
      if (now >= 0 && now !== was && (act === 'prev' || act === 'next' || act === 'toggle')) toNotation(now, true);
      try { win.postMessage({ type: 'nt-loop-state', text: note.textContent }, location.origin); } catch (err) {}
    });
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'nt-back') return;
      var w = W();
      if (!w || e.source !== w.remoteWin('ts-notation')) return;
      try { window.focus(); } catch (err) {}
      var c = current(); if (c < 0) c = hereIndex();
      step(e.data.again ? 0 : 1 + Math.max(0, e.data.skip | 0));     // skip: phrases a take already ran on into
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
        var tail = document.createElement('span'); tail.className = 'btp-ph-lead btp-ph-tail';
        var tv = g ? loopOf(g, all, i, 0, state.tails[ph.key]).tail : 0;
        var tm = document.createElement('button'), tp = document.createElement('button'), tval = document.createElement('span');
        tm.type = tp.type = 'button'; tm.textContent = '−'; tp.textContent = '+';
        tm.title = 'Stop half a beat earlier ({); before the bar line too, e.g. a beat early when the next chunk has a one-beat pickup'; tp.title = 'Stop half a beat later, past the last bar (})';
        tm.setAttribute('aria-label', 'Earlier stop for ' + label(ph)); tp.setAttribute('aria-label', 'Later stop for ' + label(ph));
        tval.textContent = 'stop ' + (tv > 0 ? '+' + beatsText(tv) : tv < 0 ? '−' + beatsText(-tv) : 'at the bar');
        tm.addEventListener('click', function () { nudgeTail(i, -0.5); tm.blur(); });
        tp.addEventListener('click', function () { nudgeTail(i, 0.5); tp.blur(); });
        tail.appendChild(tm); tail.appendChild(tval); tail.appendChild(tp);
        var send = document.createElement('button');
        send.type = 'button'; send.className = 'btp-ph-send'; send.textContent = 'Notate';
        send.title = 'Go to this chunk on the Notation page (T)';
        send.addEventListener('click', function () { toNotation(i); send.blur(); });
        [go, name, where, lead, tail, send].forEach(function (el) { li.appendChild(el); });
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
      else if (e.key === '{' && c >= 0) { nudgeTail(c, -0.5); e.preventDefault(); }
      else if (e.key === '}' && c >= 0) { nudgeTail(c, 0.5); e.preventDefault(); }
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
      load: function (d) { if (!d) return; state = { size: d.size || 4, leadIns: d.leadIns || {}, tails: d.tails || {}, mode: d.mode || state.mode }; sizeIn.value = String(state.size); save(); render(); },
      phrases: phrases, asChunks: asChunks, loopAt: loopAt, toNotation: toNotation, nudge: nudge, nudgeTail: nudgeTail
    };
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
