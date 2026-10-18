/* Timestamp Notes: playing it in. Chord timing, from N or a MIDI keyboard, and the words to read while doing it.

   A chord hit is a time: "the next chord starts here". Which chord it is comes from the ChordPro -- the k-th hit inside a
   section is that section's k-th chord -- so only the timing has to be right. When sent on, each hit is placed in its bar
   (by that bar's own length and beats, so a slowing tempo or a 2/4 bar is fine) and rounded to the beat or half beat.

     n          the next chord starts now
     shift+n    take back the last chord hit

   From a MIDI keyboard, all at once (Play in from MIDI):
     left hand  (below the split) one note: a barline (B); two notes together: the next section starts (S) on that bar
     right hand (from the split up) notes struck together: one chord hit, at the first of them. Releases are ignored.
                Pitches are only checked: a hit whose notes don't fit its chord is flagged (a doubled or skipped chord
                shifts every chord after it in that section).
   Every time is moved back by the Latency setting, for hearing the recording late.

   The stage above the words shows the section under the playhead: its name small, its words with the chords over them
   large, the chord just played filled and the one to play next outlined.

   Kept in localStorage (btp-chord-hits: [{ t, pcs }], btp-live: { split, latency, grid }). */
(function () {
  "use strict";

  var STORE = 'btp-chord-hits', PREFS = 'btp-live';
  var TOGETHER = 0.06, CHORD_SPREAD = 0.08, SAME = 0.12;
  var NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  var ROOT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function noteName(m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); }
  // The pitch classes a chord symbol names, roughly: root, third, fifth, seventh. Enough to say "that wasn't it".
  function chordPcs(name) {
    var m = /^([A-G])([#b]?)(.*?)(?:\/([A-G][#b]?))?$/.exec(String(name).replace(/[()]/g, ''));
    if (!m) return null;
    var r = (ROOT[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, q = m[3], pcs = [r];
    var minor = /^(m(?!aj)|min|-)/.test(q), dim = /dim|°|m7b5|ø/.test(q), aug = /aug|\+/.test(q);
    pcs.push((r + (/sus2/.test(q) ? 2 : /sus/.test(q) ? 5 : minor || dim ? 3 : 4)) % 12);
    pcs.push((r + (dim ? 6 : aug ? 8 : 7)) % 12);
    if (/maj7|M7|Δ/.test(q)) pcs.push((r + 11) % 12);
    else if (/dim7|°7/.test(q)) pcs.push((r + 9) % 12);
    else if (/7|9|11|13/.test(q)) pcs.push((r + 10) % 12);
    if (/6/.test(q) && !/b6/.test(q)) pcs.push((r + 9) % 12);
    if (/9/.test(q)) pcs.push((r + 2) % 12);
    if (m[4]) pcs.push((ROOT[m[4][0]] + (m[4][1] === '#' ? 1 : m[4][1] === 'b' ? -1 : 0) + 12) % 12);
    return pcs;
  }
  function fits(pcs, name) {
    var want = chordPcs(name);
    if (!want || !pcs || !pcs.length) return true;
    var inside = pcs.filter(function (p) { return want.indexOf(p) >= 0; }).length;
    return inside * 2 > pcs.length;
  }

  function boot() {
    var root = document.querySelector('.btp-live:not(.pc-shell)');
    var player = document.querySelector('.btp');
    var map = document.querySelector('.btp-barmap:not(.pc-shell)');
    var wordsEl = document.querySelector('.btp-words:not(.pc-shell)');
    if (!root || !player) return;
    var q = function (sel) { return PanelColumns.q(root, sel); };
    var stage = document.querySelector('.btp-live-stage');      // (in the right column, above the timestamps)
    var sq = function (sel) { return stage.querySelector(sel); };
    var stageName = sq('.btp-live-sec'), stageNext = sq('.btp-live-next'), stageWords = sq('.btp-live-words');
    var splitIn = q('.btp-split'), latIn = q('.btp-latency'), gridIn = q('.btp-grid'), midiBtn = document.querySelector('.btp-midi'), status = q('.btp-live-status');

    var hits = [];              // [{ t, pcs }] in time order
    function api() { return player._btp || null; }
    function M() { return map && map._btpMap; }
    function W() { return wordsEl && wordsEl._btpWords; }
    function say(text) {
      status.textContent = text || '';
      if (text) setTimeout(function () { if (status.textContent === text) status.textContent = ''; }, 3000);
    }
    function save() {
      try { localStorage.setItem(STORE, JSON.stringify(hits)); } catch (e) {}
      if (W()) W().refresh();
      if (M() && M().refresh) M().refresh();
      try { localStorage.setItem(PREFS, JSON.stringify({ split: +splitIn.value, latency: +latIn.value, grid: gridIn.value })); } catch (e) {}
    }
    function lat() { var v = parseFloat(latIn.value); return isFinite(v) ? v / 1000 : 0; }
    function split() { var v = parseInt(splitIn.value, 10); return v >= 21 && v <= 108 ? v : 60; }
    function now() { var a = api(), t = a && a.time(); return typeof t === 'number' ? t : null; }

    // ---- chord hits ----
    function hit(t, pcs, extra) {
      if (t == null) { say('Nothing is playing yet.'); return; }
      t = Math.max(0, t);
      hits = hits.filter(function (h) { return Math.abs(h.t - t) > SAME; });   // hitting again where one is replaces it
      var h = { t: Math.round(t * 1000) / 1000, pcs: pcs || null };
      if (extra && extra.fixed) { h.fixed = true; if (extra.name) h.name = extra.name; }
      hits.push(h);
      hits.sort(function (a, b) { return a.t - b.t; });
      save(); render(true);
    }
    function unhit() {
      var t = now(), last = null;
      hits.forEach(function (h) { if (t == null || h.t <= t + 0.05) last = h; });
      if (!last) return;
      hits.splice(hits.indexOf(last), 1);
      save(); render(true);
      say('Took back the chord hit at ' + last.t.toFixed(1) + ' s');
    }
    function sectionAt(t) {
      var m = M(); if (!m || t == null) return null;
      var here = null, count = {}, nth = 0;
      m.sections().forEach(function (s) {
        var n = s.name.toLowerCase();
        if (s.start <= t + 0.05) { here = s; nth = count[n] | 0; }
        count[n] = (count[n] | 0) + 1;
      });
      return here ? { sec: here, nth: nth } : null;
    }
    function inSection(sec) {
      var end = sec.end == null ? Infinity : sec.end;
      // a hit just before the section's first bar (pushed, or played early) still belongs to it
      return hits.filter(function (h) { return h.t >= sec.start - 0.15 && h.t < end - 0.15; });
    }
    function clearSection() {
      var here = sectionAt(now());
      if (!here) { say('No section here.'); return; }
      var gone = inSection(here.sec);
      hits = hits.filter(function (h) { return gone.indexOf(h) < 0; });
      delete confirmed[ckey(here.sec.name, here.nth)]; saveConfirmed();
      save(); render(true);
      say('Cleared the chord timing of ' + here.sec.name + ' (' + gone.length + ').');
    }

    // Each hit in a section, placed in its bar and rounded to the grid: { chords: [{ at, name }], notes }.
    function place(sec, names) {
      var m = M(), out = { chords: [], notes: [] };
      if (!m || !sec || sec.bar == null || sec.bar < 0) return out;
      var g = m.grid(), mine = inSection(sec), step = gridIn.value === 'half' ? 0.5 : 1;
      if (!mine.length) return out;
      var first = sec.bar, last = first + sec.bars - 1, before = 0, starts = [];
      for (var b = first; b <= last; b++) { starts.push(before); before += g.beats[b]; }
      var total = before, wrong = 0;
      mine.forEach(function (h, k) {
        if (k >= names.length && !h.name) return;
        var b = first;
        while (b < last && g.bars[b + 1] <= h.t + 0.02) b++;
        var len = b + 1 < g.bars.length ? g.bars[b + 1] - g.bars[b] : g.beatLen * g.beats[b];
        var beat = Math.max(0, (h.t - g.bars[b]) / len * g.beats[b]);
        var at = Math.min(total - step, starts[b - first] + Math.round(beat / step) * step);
        at = Math.max(0, Math.round(at * 1000) / 1000);
        if (out.chords.length && at <= out.chords[out.chords.length - 1].at) at = out.chords[out.chords.length - 1].at + step;
        out.chords.push({ at: at, name: h.name || names[k] });
        if (!h.name && !fits(h.pcs, names[k])) wrong++;
      });
      if (mine.length < names.length) out.notes.push(sec.name + ': ' + mine.length + ' of ' + names.length + ' chords timed; the rest are left out.');
      if (mine.length > names.length) out.notes.push(sec.name + ': ' + (mine.length - names.length) + ' more chord hits than chords; the extra are left out.');
      if (wrong) out.notes.push(sec.name + ': ' + wrong + (wrong === 1 ? ' hit doesn’t' : ' hits don’t') + ' fit its chord (a doubled or skipped chord?).');
      return out;
    }

    // ---- the stage: the words of the section under the playhead ----
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function lineHtml(line, k0, played, nextK, wrong) {
      var parts = line.replace(/\s*\|\s*/g, ' │ ').split(/(\[[^\]]+\])/), html = '', k = k0, pend = null;
      var cell = function (chord, text) {
        var cls = 'btp-ch' + (chord == null ? ' none' : '') + (chord != null && chord.k < played ? ' done' : '') +
          (chord != null && chord.k === played - 1 ? ' now' : '') + (chord != null && chord.k === nextK ? ' next' : '') +
          (chord != null && wrong[chord.k] ? ' wrong' : '');
        return '<span class="btp-seg"><span class="' + cls + '">' + (chord ? esc(chord.name) : '&nbsp;') + '</span><span class="btp-wd">' +
               (text ? esc(text) : '&nbsp;') + '</span></span>';
      };
      parts.forEach(function (p) {
        var m = /^\[([^\]]+)\]$/.exec(p);
        if (m) { if (pend) html += cell(pend, ''); pend = { name: m[1], k: k++ }; return; }
        if (!p) return;
        // one piece per word, so a narrow box wraps between words: the chord stays over the word it starts on
        var words = p.match(/\S+\s*|\s+/g) || [p];
        words.forEach(function (wd, j) { html += cell(j === 0 ? pend : null, wd); });
        pend = null;
      });
      if (pend) html += cell(pend, '');
      return { html: '<div class="btp-line">' + html + '</div>', k: k };
    }
    // The section after the nth `name`, by the order of the words (the list Convert made): { name, nth } or null.
    function nextOf(name, nth) {
      var list = W().sections(), low = name.toLowerCase(), k = -1, i;
      for (i = 0; i < list.length; i++) if (list[i].name.toLowerCase() === low && ++k === nth) break;
      var nx = i < list.length ? list[i + 1] : null;
      if (!nx) return null;
      return { name: nx.name, nth: list.slice(0, i + 1).filter(function (x) { return x.name.toLowerCase() === nx.name.toLowerCase(); }).length };
    }
    // the next section's name and first line, always in view under the words
    var upnext = document.createElement('div');
    upnext.className = 'btp-live-upnext';
    stageWords.parentNode.insertBefore(upnext, stageWords.nextSibling);
    function showUpnext(nx) {
      if (!nx) { upnext.innerHTML = '<span class="btp-live-upname">End</span>'; return; }
      var first = W().body(nx.name, nx.nth)[0] || '';
      upnext.innerHTML = '<span class="btp-live-upname">Next · ' + esc(nx.name) + '</span>' + (first ? lineHtml(first, 0, -1, -1, {}).html : '');
    }

    // ---- going to a section: the menu in Now playing and the tabs over the chord grid (as on the Backing Track) ----
    var pick = stage.querySelector('.btp-live-pick'), tabs = document.querySelector('.btp-grid-tabs'), navKey = '';
    function goTo(i) {
      var list = M() ? M().sections() : [], s = list[i], a = api();
      if (!s || !a) return;
      a.seek(s.start + 0.01);
      render(true);
    }
    function sectionNav(here) {
      var list = M() ? M().sections() : [], count = {}, labels = list.map(function (s) {
        var n = s.name.toLowerCase(), k = count[n] = (count[n] | 0) + 1;
        return s.name + (k > 1 ? ' ' + k : '');
      });
      var at = here ? list.map(function (x) { return x.stamp; }).indexOf(here.sec.stamp) : -1, key = labels.join('|');
      if (key !== navKey) {
        navKey = key;
        pick.innerHTML = '';
        labels.forEach(function (l, i) { var o = document.createElement('option'); o.value = i; o.textContent = (i + 1) + '. ' + l; pick.appendChild(o); });
        pick.hidden = !labels.length;
        tabs.innerHTML = '';
        labels.forEach(function (l, i) {
          var li = document.createElement('li'), a = document.createElement('a');
          li.className = 'nav-item'; li.setAttribute('role', 'presentation');
          a.className = 'nav-link'; a.href = '#'; a.setAttribute('role', 'tab'); a.textContent = l;
          a.addEventListener('click', function (e) { e.preventDefault(); goTo(i); });
          li.appendChild(a); tabs.appendChild(li);
        });
      }
      if (at >= 0) pick.value = String(at);
      Array.prototype.forEach.call(tabs.querySelectorAll('.nav-link'), function (a, i) {
        a.classList.toggle('active', i === at); a.setAttribute('aria-selected', String(i === at));
      });
    }
    pick.addEventListener('change', function () { goTo(+pick.value); pick.blur(); });
    pick.addEventListener('click', function (e) { e.stopPropagation(); });
    pick.addEventListener('keydown', function (e) { e.stopPropagation(); });

    var shownKey = '';
    function render(force) {
      var w = W(), t = now(), here = sectionAt(t);
      if (!w) return;
      var key = here ? here.sec.name + '#' + here.nth : '';
      var mine = here ? inSection(here.sec) : [], played = here ? mine.filter(function (h) { return h.t <= t + 0.02; }).length : 0;
      key += '|' + played + '|' + mine.length;
      // (and what comes next: a section added to the words, or stamped, changes the line under the words)
      key += '|' + w.sections().map(function (x) { return x.name; }).join(',');
      liveBar(here, t);
      sectionNav(here);
      if (key === shownKey && !force) return;
      shownKey = key;
      if (!here) {
        var list = w.sections();
        stageName.textContent = list.length ? 'Before ' + list[0].name : '';
        stageNext.textContent = '';
        stageWords.innerHTML = list.length ? '' : '<p class="btp-live-empty">Convert some words and chords, then stamp the sections: the words of each appear here as it plays.</p>';
        showUpnext(list.length ? { name: list[0].name, nth: 0 } : null);
        upnext.hidden = !list.length;
        grid(null, list.length ? { name: list[0].name, nth: 0 } : null);
        return;
      }
      upnext.hidden = false;
      var names = w.chordNames(here.sec.name, here.nth), lines = w.body(here.sec.name, here.nth);
      var wrong = {};
      mine.forEach(function (h, k) { if (k < names.length && !fits(h.pcs, names[k])) wrong[k] = true; });
      var nx = nextOf(here.sec.name, here.nth);
      stageName.textContent = here.sec.name;
      stageNext.textContent = names.length ? played + ' / ' + names.length + ' chords' : '';
      var html = '', k = 0;
      // words with chords placed over them when the lines carry chords; a repeat with words but no chords shows its own
      // words and the borrowed chords in a row above
      if (!lines.some(function (l) { return /\[/.test(l); }) && names.length) {
        html += lineHtml(names.map(function (n) { return '[' + n + ']'; }).join(' '), 0, played, played, wrong).html;
        lines.forEach(function (l) { html += '<div class="btp-line"><span class="btp-wd">' + esc(l) + '</span></div>'; });
      } else lines.forEach(function (l) { var r = lineHtml(l, k, played, played, wrong); html += r.html; k = r.k; });
      stageWords.innerHTML = html || '<p class="btp-live-empty">No words for ' + esc(here.sec.name) + '.</p>';
      showUpnext(nx);
      var cur = stageWords.querySelector('.btp-ch.next') || stageWords.querySelector('.btp-ch.now');
      if (cur) {
        var line = cur.closest('.btp-line'), box = stageWords;
        if (line.offsetTop < box.scrollTop || line.offsetTop + line.offsetHeight > box.scrollTop + box.clientHeight)
          box.scrollTop = Math.max(0, line.offsetTop - box.clientHeight / 3);
      }
      grid(here, nx);
    }

    // ---- the chord grid: the section under the playhead as the Backing Track shows it (four bars a line), and a line of
    // the next one. Its chords stay hidden until the timing is confirmed ("Timing is right"), section by section. ----
    var confirmed = {};          // 'name#nth' -> true
    try { confirmed = JSON.parse(localStorage.getItem('btp-confirmed') || '{}') || {}; } catch (e) {}
    function saveConfirmed() {
      try { localStorage.setItem('btp-confirmed', JSON.stringify(confirmed)); } catch (e) {}
      if (M() && M().refresh) M().refresh();
    }
    var gridEl = document.querySelector('.btp-grid-now'), nextEl = document.querySelector('.btp-grid-next');
    var gridNote = document.querySelector('.btp-grid-note'), confirmBtn = document.querySelector('.btp-confirm');
    var chart = null, gridKey = '', gridSec = null;
    function ckey(name, nth) { return name.toLowerCase() + '#' + nth; }
    function grid(here, nx) {
      if (!gridEl || !window.TuneChart) return;
      var w = W(), on = here && confirmed[ckey(here.sec.name, here.nth)];
      var abc = here ? w.sectionAbc(here.sec.name, here.nth, !!on) : null;
      var nabc = nx ? w.sectionAbc(nx.name, nx.nth, !!confirmed[ckey(nx.name, nx.nth)]) : null;
      var key = (abc || '') + '\u0000' + (nabc || '');
      gridSec = here;
      var names = here ? w.chordNames(here.sec.name, here.nth) : [];
      confirmBtn.hidden = !here || !names.length;
      if (here) confirmBtn.textContent = on ? 'Hide the chords of ' + here.sec.name + ' again' : 'Timing is right for ' + here.sec.name;
      gridNote.textContent = !here ? 'The grid follows the section under the playhead.'
        : !abc && !w.known(here.sec.name) ? here.sec.name + ' is stamped but not in the words: add a {comment: ' + here.sec.name + '} (or a [' + here.sec.name + '] heading) and Convert.'
        : !abc ? 'Tap the bars of ' + here.sec.name + ' to see its grid.'
        : on ? '' : 'Chords appear as you time them (N, or the right hand). Timing is right shows the rest.';
      if (key === gridKey) return;
      gridKey = key;
      gridEl.textContent = '';
      chart = abc ? TuneChart.render(gridEl, abc, { header: false, barsPerRow: 4 }) : null;
      litBar = -2;
      // the next line: that section's first bars, at most four
      var box = nextEl.querySelector('.btp-grid-next-bars');
      box.textContent = '';
      nextEl.hidden = !nx;
      if (!nx) return;
      nextEl.querySelector('b').textContent = 'Next: ' + nx.name;
      if (!nabc) return;
      var tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;left:-9999px;width:800px';
      document.body.appendChild(tmp);
      TuneChart.render(tmp, nabc, { header: false, barsPerRow: 4 });
      Array.prototype.slice.call(tmp.querySelectorAll('.tc-bar[data-bar]'), 0, 4).forEach(function (src) {
        var c = src.cloneNode(true);
        c.removeAttribute('data-bar'); c.removeAttribute('title');
        Array.prototype.forEach.call(c.querySelectorAll('.tc-section, .tc-courtesy, .tc-meter'), function (x) { x.remove(); });
        box.appendChild(c);
      });
      tmp.remove();
    }
    var litBar = -2;
    function liveBar(here, t) {
      if (!chart || !here || !gridSec || here.sec.stamp !== gridSec.sec.stamp) { if (litBar !== -1 && chart) { chart.setLive(-1); litBar = -1; } return; }
      var g = M().grid(), b = -1;
      for (var i = 0; i < g.bars.length; i++) if (g.bars[i] <= t + 0.02) b = i;
      var k = b - here.sec.bar;
      if (k >= here.sec.bars) k = -1;
      if (k !== litBar) { chart.setLive(k); litBar = k; }
    }
    var copyBtn = document.querySelector('.btp-grid-copy');
    if (copyBtn) copyBtn.addEventListener('click', function () { if (W()) W().copyGrids(); copyBtn.blur(); });
    if (confirmBtn) confirmBtn.addEventListener('click', function () {
      if (!gridSec) return;
      var k = ckey(gridSec.sec.name, gridSec.nth);
      if (confirmed[k]) delete confirmed[k]; else confirmed[k] = true;
      saveConfirmed(); gridKey = ''; render(true); confirmBtn.blur();
    });

    // ---- the words box: dragged taller (to show a whole section) or shorter ----
    var grip = sq('.btp-live-grip');
    function setH(h, keep) {
      if (h == null) stageWords.style.removeProperty('max-height');
      else stageWords.style.maxHeight = Math.max(80, Math.min(h, window.innerHeight * 0.85)) + 'px';
      if (keep) try { if (h == null) localStorage.removeItem('btp-live-h'); else localStorage.setItem('btp-live-h', String(Math.round(h))); } catch (e) {}
    }
    try { var hh = parseFloat(localStorage.getItem('btp-live-h')); if (isFinite(hh)) setH(hh, false); } catch (e) {}
    if (grip) {
      grip.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault(); grip.setPointerCapture(e.pointerId);
        var y0 = e.clientY, h0 = stageWords.getBoundingClientRect().height;
        var move = function (ev) { setH(h0 + ev.clientY - y0, false); };
        var up = function (ev) { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); setH(h0 + ev.clientY - y0, true); };
        grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
      });
      grip.addEventListener('dblclick', function () { setH(null, true); });
      grip.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault(); e.stopPropagation();
        setH(stageWords.getBoundingClientRect().height + (e.key === 'ArrowDown' ? 40 : -40), true);
      });
    }
    // At each pause the timed sections are written into the ChordPro as grids (words.js writeGrids).
    var wasPlaying = false;
    (function watch() {
      render(false);
      var a = api(), on = !!(a && a.playing && a.playing());
      if (wasPlaying && !on) { if (W()) W().writeGrids(); touched = {}; }
      wasPlaying = on;
      requestAnimationFrame(watch);
    })();

    // ---- where it sits: pinned in the right column, or floating over the page (dragged by its handle, kept on screen) ----
    var VIEW = 'btp-live-view', view = { float: false, x: null, y: null, w: null, scale: 1 };
    try { Object.assign(view, JSON.parse(localStorage.getItem(VIEW) || '{}')); } catch (e) {}
    var modeBtn = sq('.btp-live-mode');
    function keepView() { try { localStorage.setItem(VIEW, JSON.stringify(view)); } catch (e) {} }
    function place2() {
      stage.classList.toggle('is-float', !!view.float);
      modeBtn.textContent = view.float ? 'Pin' : 'Float';
      modeBtn.title = view.float ? 'Put it back in the right column' : 'Float it over the page, to drag anywhere';
      stage.style.setProperty('--live-scale', view.scale);
      if (!view.float) { ['left', 'top', 'width'].forEach(function (k) { stage.style.removeProperty(k); }); return; }
      var w = Math.min(view.w || 440, window.innerWidth - 16);
      var x = view.x == null ? window.innerWidth - w - 16 : Math.max(0, Math.min(view.x, window.innerWidth - 80));
      var y = view.y == null ? 90 : Math.max(0, Math.min(view.y, window.innerHeight - 40));
      stage.style.left = x + 'px'; stage.style.top = y + 'px'; stage.style.width = w + 'px';
    }
    modeBtn.addEventListener('click', function (e) { e.stopPropagation(); view.float = !view.float; keepView(); place2(); modeBtn.blur(); });
    [['.btp-live-smaller', -0.1], ['.btp-live-bigger', 0.1]].forEach(function (b) {
      sq(b[0]).addEventListener('click', function (e) {
        e.stopPropagation();
        view.scale = Math.round(Math.max(0.6, Math.min(2.5, view.scale + b[1])) * 10) / 10;
        keepView(); place2(); e.target.blur();
      });
    });
    var handle = sq('.btp-live-drag');
    handle.addEventListener('click', function (e) { e.stopPropagation(); });
    handle.addEventListener('pointerdown', function (e) {
      if (!view.float || e.button !== 0) return;
      e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
      var r = stage.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      var move = function (ev) { view.x = ev.clientX - dx; view.y = ev.clientY - dy; place2(); };
      var up = function () { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); keepView(); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
    });
    // a floating one's width is dragged at its right edge (CSS resize); kept when let go
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (!view.float) return;
      var w = Math.round(stage.getBoundingClientRect().width);
      if (w && w !== view.w) { view.w = w; keepView(); }
    }).observe(stage);
    window.addEventListener('resize', function () { if (view.float) place2(); });
    place2();

    // ---- MIDI ----
    var lh = null, rh = null, access = null;
    function midiTime(stamp) {
      var t = now();
      if (t == null) return null;
      var ago = stamp ? Math.max(0, (performance.now() - stamp) / 1000) : 0;
      return t - ago - lat();
    }
    function noteOn(note, stamp) {
      var t = midiTime(stamp);
      if (t == null) { say('Load the recording and play it first.'); return; }
      // a time being corrected (the pencil): any key on the keyboard sets it
      if (window.TsTimeEdit && TsTimeEdit.busy()) { TsTimeEdit.grab(t); return; }
      if (note < split()) {
        // left hand: a second note close behind makes the first a section start
        if (lh && Math.abs(t - lh.t) < TOGETHER) {
          clearTimeout(lh.timer);
          var at = lh.t; lh = null;
          var w = W();
          if (w && (w.stampSection ? w.stampSection(at, true) : w.stampNext(at))) say('Section');
          if (M()) M().tap(at);
          return;
        }
        var me = { t: t };
        me.timer = setTimeout(function () { if (lh === me) { lh = null; if (M()) M().tap(me.t); } }, TOGETHER * 1000 + 10);
        lh = me;
        return;
      }
      // right hand: notes struck together are one chord hit
      if (rh && Math.abs(t - rh.t) < CHORD_SPREAD) {      // (abs: the playhead may have jumped back)
        rh.pcs.push(note % 12); rh.midis.push(note);
        var h = hits.filter(function (x) { return Math.abs(x.t - Math.max(0, rh.t)) < 0.01; })[0];
        if (h) { h.pcs = rh.pcs.slice(); if (h.fixed) h.name = named(rh.midis) || h.name; save(); render(true); }
        return;
      }
      rh = { t: t, pcs: [note % 12], midis: [note] };
      if (correcting) correctAt(t);
      hit(t, rh.pcs.slice(), correcting ? { name: named(rh.midis), fixed: true } : null);
    }

    // ---- correcting: while it plays, a bar the right hand plays in is rewritten with what is played there (the chord
    // named from its notes); a bar played through without a note keeps what it had. A pass ends at the pause. ----
    var correcting = false, touched = {};
    function named(midis) {
      var CE = window.ChordEntry;
      if (!CE || !midis || midis.length < 2) return null;
      var r = CE.analyse(midis);
      return r ? CE.symbol(r, { slash: true }) : null;
    }
    // Before a section's hits are changed, each is given the chord it stands for now (by its place), so taking hits out of
    // one bar doesn't move every later chord along.
    function freeze(here) {
      var names = W().chordNames(here.sec.name, here.nth);
      inSection(here.sec).forEach(function (h, k) { if (!h.name && k < names.length) h.name = names[k]; });
    }
    function correctAt(t) {
      var g = M() && M().grid(), here = sectionAt(t);
      if (!g || !g.bars.length || !here) return;
      var b = -1;
      for (var i = 0; i < g.bars.length; i++) if (g.bars[i] <= t + 0.02) b = i;
      if (b < 0 || touched[b]) return;
      touched[b] = true;
      freeze(here);
      var end = b + 1 < g.bars.length ? g.bars[b + 1] : g.bars[b] + g.beatLen * g.beats[b];
      hits = hits.filter(function (h) { return h.t < g.bars[b] - 0.02 || h.t >= end - 0.02; });
    }
    function setCorrecting(on) {
      correcting = on; touched = {};
      document.querySelectorAll('.btp-correct').forEach(function (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Correcting: play over the bars to change' : 'Correct chords'; });
      say(on ? 'Correcting: each bar you play chords in is rewritten; bars you play through without a note stay as they were. Pause to finish a pass.' : 'Correcting is off.');
    }
    document.querySelectorAll('.btp-correct').forEach(function (b) { b.addEventListener('click', function () { setCorrecting(!correcting); b.blur(); }); });
    function connect() {
      if (!navigator.requestMIDIAccess) { say('This browser has no Web MIDI: use Chrome or Edge.'); return; }
      navigator.requestMIDIAccess().then(function (a) {
        access = a;
        var bind = function () {
          var names = [];
          a.inputs.forEach(function (i) {
            i.onmidimessage = function (e) {
              var d = e.data, cmd = d[0] & 0xf0;
              if (cmd === 0x90 && d[2] > 0) noteOn(d[1], e.timeStamp);
            };
            names.push(i.name || 'MIDI input');
          });
          midiBtn.textContent = names.length ? names.join(', ') : 'No MIDI keyboard found: plug one in';
          midiBtn.classList.toggle('on', names.length > 0);
          var dot = document.querySelector('.ts-midi-state');
          if (dot) dot.textContent = names.length ? 'Connected' : 'Not connected';
          try { localStorage.setItem('btp-midi-on', '1'); } catch (e) {}
        };
        a.onstatechange = bind; bind();
      }, function () { say('MIDI was refused.'); });
    }

    midiBtn.addEventListener('click', function () { connect(); midiBtn.blur(); });
    // connected before, and the browser still allows it: connect again by itself
    try {
      if (localStorage.getItem('btp-midi-on') && navigator.permissions && navigator.requestMIDIAccess)
        navigator.permissions.query({ name: 'midi' }).then(function (p) { if (p.state === 'granted') connect(); }, function () {});
    } catch (e) {}
    q('.btp-live-clear').addEventListener('click', function (e) { clearSection(); e.target.blur(); });
    [splitIn, latIn, gridIn].forEach(function (el) {
      el.addEventListener('change', function () { save(); render(true); });
      el.addEventListener('keydown', function (e) { e.stopPropagation(); });
    });
    splitIn.addEventListener('input', function () { q('.btp-split-name').textContent = noteName(split()); });
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && t.matches && t.matches('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'n' && !e.shiftKey) { hit(now() == null ? null : now() - lat()); e.preventDefault(); }
      else if (e.key === 'N' && e.shiftKey) { unhit(); e.preventDefault(); }
    });

    root._btpLive = {
      hits: function () { return hits.slice(); },
      confirmed: function () { return JSON.parse(JSON.stringify(confirmed)); },
      setConfirmed: function (c) { confirmed = c || {}; saveConfirmed(); gridKey = ''; render(true); },
      load: function (list) { hits = (list || []).filter(function (h) { return h && isFinite(h.t); }).sort(function (a, b) { return a.t - b.t; }); save(); render(true); },
      place: place,
      count: function (sec) { return inSection(sec).length; },
      sigOf: function (sec) { return inSection(sec).map(function (h) { return h.t; }).join(','); },
      isConfirmed: function (name, nth) { return !!confirmed[ckey(name, nth)]; },
      noteOn: noteOn,            // for tests: noteOn(midi, performance.now() stamp)
      correct: setCorrecting
    };

    try { hits = JSON.parse(localStorage.getItem(STORE) || '[]') || []; } catch (e) { hits = []; }
    try {
      var p = JSON.parse(localStorage.getItem(PREFS) || 'null');
      if (p) { if (p.split) splitIn.value = p.split; if (p.latency != null) latIn.value = p.latency; if (p.grid) gridIn.value = p.grid; }
    } catch (e) {}
    q('.btp-split-name').textContent = noteName(split());
    render(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
