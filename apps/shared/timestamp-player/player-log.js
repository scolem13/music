/* The timestamp log in Timestamp Notes.
   C stamps the current time, Enter plays and pauses, and each stamp gets a
   note field beside it. Everything here talks to the player through the
   _btp handle player.js hangs on the .btp block.

   The log is kept in localStorage as it is typed, so a reload -- or a closed
   tab -- does not lose an afternoon's notes. Clear is the only thing that
   throws them away, and it asks first. */
(function () {
  "use strict";

  var STORE = 'btp-stamps';
  var AUTONOTE = 'btp-autonote';
  var LOG_W = 'btp-log-width';

  function boot() {
    var player = document.querySelector('.btp');
    var log = document.querySelector('.btp-log');
    if (!player || !log) return;

    var rows = log.querySelector('.btp-log-rows');
    var empty = log.querySelector('.btp-log-empty');
    var autoNote = log.querySelector('.btp-autonote');
    var err = player.querySelector('.btp-err');

    function api() { return player._btp || null; }

    function say(text) {
      if (!err) return;
      err.textContent = text;
      if (text) setTimeout(function () {
        if (err.textContent === text) err.textContent = '';
      }, 2500);
    }

    // navigator.clipboard needs a secure context; localhost counts, a file://
    // page does not, so there is a fallback for when it is missing.
    function copy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function (resolve, reject) {
        var box = document.createElement('textarea');
        box.value = text;
        box.setAttribute('readonly', '');
        box.style.position = 'fixed';
        box.style.left = '-9999px';
        document.body.appendChild(box);
        box.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(box);
        ok ? resolve() : reject(new Error('copy'));
      });
    }

    function stamps() {
      return Array.prototype.slice.call(rows.querySelectorAll('li'));
    }

    function entries() {
      return stamps().map(function (li) {
        var t = li.querySelector('.btp-stamp').textContent;
        var s = parseFloat(li.dataset.s);
        var row = { t: t, s: isFinite(s) ? s : seconds(t) };
        if (li.classList.contains('is-sec')) { row.n = li.dataset.n || li.dataset.b; row.k = 's'; row.b = li.dataset.b; if (li.dataset.o) row.o = true; }
        else row.n = li.querySelector('.btp-note').value;
        return row;
      });
    }

    // The bar map (bar-map.js) reads the stamps as they change: a note that
    // names a section ("Verse 1", "Chorus") marks where that section starts.
    function changed() {
      log.dispatchEvent(new CustomEvent('btp-stamps', { detail: entries() }));
    }
    log._btpStamps = entries;
    // words.js renames a stamp (the one at 0:00 becomes Intro)
    log._btpRename = function (i, note) {
      var input = stamps()[i] && stamps()[i].querySelector('.btp-note');
      if (!input) return;
      input.value = note;
      if (document.activeElement === input) input.blur();
      save();
    };
    // A section stamp with its label already written (Timestamp Notes' "stamp the next section", from the words).
    log._btpAdd = function (note, at) {
      var a = api(), t = typeof at === 'number' ? at : a && a.time();
      if (typeof t !== 'number') { say('Nothing is playing yet.'); return false; }
      addRow(a.format(t), note, t, asSection(note) || { b: note, o: true });
      save();
      say('Stamped ' + note + ' at ' + a.format(t));
      return true;
    };

    function save() {
      relabel();
      changed();
      try { localStorage.setItem(STORE, JSON.stringify(entries())); }
      catch (e) { /* private window, or the quota is full: keep going */ }
    }

    function saved() {
      try {
        var list = JSON.parse(localStorage.getItem(STORE) || '[]');
        return Array.isArray(list) ? list : [];
      } catch (e) { return []; }
    }

    // The recording heads the export: "# url: <YouTube link>" (with "(in a tab)" when it was followed there), or
    // "# file: <name>" -- a file can't come back by itself, so that line only says which one.
    function asText() {
      var a = api(), src = a && a.source && a.source(), head = [];
      if (src && src.url) head.push('# url: ' + src.url + (src.follow ? ' (in a tab)' : ''));
      else if (src && src.file) head.push('# file: ' + src.file);
      return head.concat(entries().map(function (row) {
        var text = String(row.n).trim();
        return text ? row.t + '\t' + text : row.t;
      })).join('\n');
    }

    function showEmpty() {
      var any = stamps().length > 0;
      if (empty) empty.hidden = any;
      // Stamping is always available; the rest need something to act on.
      ['.btp-copy-all', '.btp-sort'].forEach(function (sel) {
        var b = log.querySelector(sel);
        if (b) b.disabled = !any;
      });
    }

    // A note field is left with Escape, or with jk / kj typed in quick
    // succession -- the second key arrives before the first has settled, so
    // the letter already in the box is taken back out.
    var GRACE = 400;

    function escapable(input) {
      var lastKey = '', lastAt = 0;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.blur(); e.preventDefault(); return; }
        var now = Date.now();
        var pair = (e.key === 'k' && lastKey === 'j')
                || (e.key === 'j' && lastKey === 'k');
        if (pair && now - lastAt < GRACE) {
          e.preventDefault();
          var at = input.selectionStart;
          var before = input.value.charAt(at - 1);
          if (at > 0 && (before === 'j' || before === 'k')) {
            input.value = input.value.slice(0, at - 1) + input.value.slice(at);
            input.setSelectionRange(at - 1, at - 1);
          }
          lastKey = '';
          save();
          input.blur();
          return;
        }
        lastKey = e.key;
        lastAt = now;
      });
    }

    // The row shows MM:SS; the exact time (s) rides along, for jumping and for
    // placing a section on the bar it starts.
    function addRow(time, text, exact, sec) {
      var li = document.createElement('li');
      li.dataset.s = isFinite(exact) ? exact : seconds(time);
      if (sec) return sectionRow(li, time, sec);

      li.appendChild(timeButton(li, time));

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'btp-note';
      input.placeholder = 'Note';
      input.spellcheck = false;
      input.value = text || '';
      input.addEventListener('input', save);
      escapable(input);
      li.appendChild(input);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'btp-del';
      del.textContent = '\u00d7';
      del.title = 'Delete this stamp';
      del.setAttribute('aria-label', 'Delete the stamp at ' + time);
      del.addEventListener('click', function () {
        li.remove();
        save();
        showEmpty();
        say('Deleted the stamp at ' + time);
      });
      li.appendChild(del);

      rows.appendChild(li);
      showEmpty();
      return input;
    }

    // ---- section stamps (S): a label from a menu (section-labels.js), or one typed under Other ----
    // Each word label that comes more than once is numbered in time order (Head 1, Head 2), and renumbered whenever one is
    // added, moved or taken away; the letters offered grow as they are used (A; then A', B; ...).
    var L = window.TsLabels;
    // the time (a click jumps there) and its pencil (time-edit.js: type a new one, or take the playhead's); Shift+click
    // on the time opens the pencil too
    function timeButton(li, time) {
      var wrap = document.createElement('span');
      wrap.className = 'btp-time';
      var stamp = document.createElement('button');
      stamp.type = 'button';
      stamp.className = 'btp-stamp';
      stamp.textContent = time;
      stamp.title = 'Jump to ' + time + ' (\u270E or Shift+click: correct the time)';
      var pen = window.TsTimeEdit ? TsTimeEdit.pencil({
        label: 'the stamp at ' + time,
        get: function () { return parseFloat(li.dataset.s); },
        set: function (t) {
          var a = api(), text = a && a.format ? a.format(t) : fmtExact(t);
          li.dataset.s = t;
          stamp.textContent = text;
          stamp.title = 'Jump to ' + text + ' (\u270E or Shift+click: correct the time)';
          save();
        }
      }) : null;
      stamp.addEventListener('click', function (e) {
        if (e.shiftKey) { if (pen) pen.click(); else editTime(li, stamp); return; }
        jump(parseFloat(li.dataset.s));
        stamp.blur();
      });
      wrap.appendChild(stamp);
      if (pen) wrap.appendChild(pen);
      return wrap;
    }
    function delButton(li, time) {
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'btp-del';
      del.textContent = '\u00d7';
      del.title = 'Delete this stamp';
      del.setAttribute('aria-label', 'Delete the stamp at ' + time);
      del.addEventListener('click', function () {
        li.remove();
        save();
        showEmpty();
        say('Deleted the stamp at ' + time);
      });
      return del;
    }
    function usedLetters() {
      return stamps().filter(function (li) { return li.classList.contains('is-sec') && !li.dataset.o; }).map(function (li) { return li.dataset.b; });
    }
    function fillMenu(sel, value) {
      var groups = L ? L.menu(usedLetters()) : [{ group: 'Sections', items: ['Intro', 'Verse', 'Chorus', 'Bridge'] }];
      var key = JSON.stringify(groups) + '|' + value;
      if (sel._key === key) return;
      sel._key = key;
      sel.innerHTML = '';
      var found = false;
      groups.forEach(function (g) {
        var og = document.createElement('optgroup'); og.label = g.group;
        g.items.forEach(function (it) { var o = document.createElement('option'); o.value = o.textContent = it; if (it === value) found = true; og.appendChild(o); });
        sel.appendChild(og);
      });
      if (!found && value) { var keep = document.createElement('option'); keep.value = keep.textContent = value; sel.insertBefore(keep, sel.firstChild); }
      var other = document.createElement('option'); other.value = '\u0000other'; other.textContent = 'Other\u2026';
      sel.appendChild(other);
      sel.value = value;
    }
    function sectionRow(li, time, sec) {
      li.classList.add('is-sec');
      li.dataset.b = sec.b || 'Intro';
      if (sec.o) li.dataset.o = '1';
      li.appendChild(timeButton(li, time));
      var box = document.createElement('span');
      box.className = 'btp-sec-label';
      li.appendChild(box);
      var info = document.createElement('span');
      info.className = 'btp-sec-info';
      li.appendChild(info);
      li.appendChild(delButton(li, time));
      var focusIt = function () { var f = box.querySelector('select, input'); if (f) f.focus(); };
      li._focus = focusIt;
      var draw = function () {
        box.innerHTML = '';
        if (li.dataset.o) {
          var input = document.createElement('input');
          input.type = 'text'; input.className = 'btp-note btp-sec-other'; input.spellcheck = false;
          input.placeholder = 'Section name'; input.value = li.dataset.b;
          input.title = 'A label of your own; empty it to choose from the list again';
          input.addEventListener('input', function () { li.dataset.b = input.value.trim() || ''; save(); });
          input.addEventListener('blur', function () { if (!input.value.trim()) { delete li.dataset.o; li.dataset.b = 'Intro'; draw(); save(); } });
          escapable(input);
          box.appendChild(input);
          var back = document.createElement('button');
          back.type = 'button'; back.className = 'btp-sec-back'; back.textContent = '\u25BE';
          back.title = 'Choose from the list';
          back.addEventListener('click', function () { delete li.dataset.o; draw(); save(); focusIt(); });
          box.appendChild(back);
          return;
        }
        var sel = document.createElement('select');
        sel.className = 'btp-sec-pick';
        sel.setAttribute('aria-label', 'Section at ' + time);
        fillMenu(sel, li.dataset.b);
        sel.addEventListener('change', function () {
          if (sel.value === '\u0000other') { li.dataset.o = '1'; li.dataset.b = ''; draw(); focusIt(); return; }
          li.dataset.b = sel.value; save();
        });
        sel.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { sel.blur(); e.preventDefault(); }
          if (e.key === 'Enter') { sel.blur(); e.preventDefault(); e.stopPropagation(); }
        });
        box.appendChild(sel);
      };
      li._draw = draw;
      draw();
      rows.appendChild(li);
      showEmpty();
      return li;
    }
    // the names the bar map sees, numbered in time order; the menus' letters brought up to date
    function relabel() {
      var secs = stamps().filter(function (li) { return li.classList.contains('is-sec'); })
        .sort(function (a, b) { return parseFloat(a.dataset.s) - parseFloat(b.dataset.s); });
      var list = secs.map(function (li) { return { b: li.dataset.b, o: !!li.dataset.o }; });
      var named = L ? L.names(list) : list.map(function (r) { return r.b; });
      secs.forEach(function (li, i) {
        li.dataset.n = named[i];
        li.dataset.nowStamp = Math.round(parseFloat(li.dataset.s) * 1000);   // (highlighted while it plays: bar-map.js)
        var sel = li.querySelector('.btp-sec-pick');
        if (sel) fillMenu(sel, li.dataset.b);
        var num = li.querySelector('.btp-sec-num');
        if (!num) { num = document.createElement('span'); num.className = 'btp-sec-num'; li.querySelector('.btp-sec-label').after(num); }
        var extra = named[i] !== li.dataset.b ? named[i].slice(li.dataset.b.length).trim() : '';
        num.textContent = extra;
      });
    }
    // An older note that names a section (Verse 1, Chorus, Sax Solo, A) as a section stamp: the menu's label when it is
    // one exactly, else the note as typed (as under Other).
    var SECTION_NOTE = /^(intro|verse|pre-?chorus|chorus|refrain|bridge|middle\s*8|solo|instrumental|interlude|break(down)?|outro|coda|tag|vamp|head|ending|turnaround|shout)\b|^[\w'-]+\s+(intro|verse|pre-?chorus|chorus|bridge|solo|interlude|outro|shout|head)\b|^[A-H]'*\d?$|^\u00a7/i;
    function asSection(note) {
      var n = String(note || '').trim().replace(/^\u00a7\s*/, '');
      if (!n || !SECTION_NOTE.test(String(note).trim())) return null;
      var base = n, hit = null;      // ("Verse 1" stays as written: the words may name it so)
      if (L) L.menu([base]).forEach(function (g) { g.items.forEach(function (it) { if (it.toLowerCase() === base.toLowerCase()) hit = it; }); });
      return hit ? { b: hit } : { b: n, o: true };
    }
    function rowBack(row) {
      if (!row || typeof row.t !== 'string') return;
      var sec = row.k === 's' ? { b: row.b || row.n, o: !!row.o } : asSection(row.n);
      addRow(row.t, row.n, row.s, sec);
    }
    // S with nothing from the words to stamp: a section, labelled as the one before it (or Intro / Head), its menu open
    // (at: a time of its own, a MIDI section's; quiet: leave the focus where it is, as while playing in from MIDI)
    function stampSection(at, quiet) {
      var a = api(), t = typeof at === 'number' ? at : a && a.time();
      if (typeof t !== 'number') { say('Nothing is playing yet.'); return false; }
      var before = stamps().filter(function (li) { return li.classList.contains('is-sec') && parseFloat(li.dataset.s) < t; })
        .sort(function (x, y) { return parseFloat(x.dataset.s) - parseFloat(y.dataset.s); }).pop();
      var sec = before ? { b: before.dataset.b, o: !!before.dataset.o } : { b: t < 3 ? 'Head' : 'Intro' };
      var li = addRow(a.format(t), '', t, sec);
      save();
      say('Section at ' + a.format(t) + ': choose its label');
      li.scrollIntoView({ block: 'nearest' });
      if (!quiet && autoNote && autoNote.checked) li._focus();
      return true;
    }
    log._btpSection = stampSection;
    // the Sections panel corrects a section's start: the stamp at `from` moves to `to`
    log._btpMove = function (from, to) {
      var li = stamps().filter(function (x) { return Math.abs(parseFloat(x.dataset.s) - from) < 0.001; })[0];
      if (!li) return false;
      li.dataset.s = to;
      var a = api(), btn = li.querySelector('.btp-stamp'), text = a && a.format ? a.format(to) : fmtExact(to);
      if (btn) { btn.textContent = text; btn.title = 'Jump to ' + text + ' (\u270E or Shift+click: correct the time)'; }
      save();
      return true;
    };

    // ---- how many choruses each part takes (a chorus: the first Head's bars, or the box) ----
    var chorusBox = log.querySelector('.btp-choruses'), formIn = log.querySelector('.btp-form-bars'), chorusKey = '';
    function chorusInfo() {
      if (!chorusBox || !L) return;
      var mapEl = document.querySelector('.btp-barmap:not(.pc-shell)'), m = mapEl && mapEl._btpMap, a = api();
      var secs = stamps().filter(function (li) { return li.classList.contains('is-sec'); })
        .sort(function (x, y) { return parseFloat(x.dataset.s) - parseFloat(y.dataset.s); });
      var ms = m ? m.sections() : [], barLen = m && m.barLen ? m.barLen() : NaN, dur = a && a.duration ? a.duration() : NaN;
      var list = secs.map(function (li, i) {
        var s = parseFloat(li.dataset.s), hit = ms.filter(function (x) { return Math.abs(x.stamp - s) < 0.01; })[0];
        var next = secs[i + 1] ? parseFloat(secs[i + 1].dataset.s) : dur;
        var bars = hit && hit.bars ? hit.bars : 0;
        // bars not tapped (yet): from the tempo of the taps, the stamps being steady enough for that
        // (and the last section runs on to the end of the recording, past the last tap)
        if (isFinite(barLen) && barLen > 0 && isFinite(next) && (!bars || !secs[i + 1])) bars = Math.max(bars, Math.round((next - (hit ? hit.start : s)) / barLen));
        return { b: li.dataset.b, bars: bars, li: li };
      });
      var auto = L.formBars(list), want = parseInt(formIn && formIn.value, 10), form = want > 0 ? want : auto;
      if (formIn) formIn.placeholder = auto ? String(auto) : '?';
      var runs = L.runs(list, form);
      // a song rather than a tune with a form: no Head and no letters (verses, choruses ...), where a solo is counted in bars
      var popish = !list.some(function (x) { var k = L.kind(x.b); return k === 'head' || k === 'letter'; }) && !(want > 0);
      var key = JSON.stringify(runs) + form;
      if (key === chorusKey) return;
      chorusKey = key;
      list.forEach(function (x) { var el = x.li.querySelector('.btp-sec-info'); if (el) { el.textContent = ''; el.title = ''; } });
      var parts = [];
      runs.forEach(function (r) {
        if (!(r.kind === 'head' || r.kind === 'solo' || r.kind === 'shout')) return;
        var n = r.choruses, txt;
        if (n != null && !popish) txt = n + (n === 1 ? ' chorus' : ' choruses');
        else if (r.bars > 0) {
          // a song (no Head, or sections of their own lengths): the solo in bars, and which section it is as long as
          var like = runs.filter(function (o) { return o !== r && o.bars === r.bars && (o.kind === 'word' || o.kind === 'letter'); })[0];
          txt = r.bars + ' bars' + (like ? ' (as long as the ' + like.label.replace(/\s+\d+$/, '') + ')' : '');
        } else return;
        var el = list[r.from].li.querySelector('.btp-sec-info');
        if (el) { el.textContent = txt; el.title = r.bars + ' bars from here' + (r.to > r.from ? ' (' + (r.to - r.from + 1) + ' stamps)' : ''); }
        parts.push('<li><b>' + (r.player || r.label) + '</b> ' + txt + (n != null && !popish ? ' <span>(' + r.bars + ' bars)</span>' : '') + '</li>');
      });
      chorusBox.innerHTML = parts.length ? '<ul>' + parts.join('') + '</ul>'
        : '<p class="btp-log-empty">' + (form ? 'Stamp the Head and the solos (S) to count their choruses.' : 'A tune: stamp a Head (S) and tap its bars, or type the bars of a chorus. A song: its solos are counted in bars.') + '</p>';
    }
    if (formIn) {
      formIn.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape' || e.key === 'Enter') formIn.blur(); });
      formIn.addEventListener('input', function () { chorusKey = ''; chorusInfo(); try { localStorage.setItem('btp-form-bars', formIn.value); } catch (e) {} });
      try { formIn.value = localStorage.getItem('btp-form-bars') || ''; } catch (e) {}
    }
    log.addEventListener('btp-stamps', function () { setTimeout(chorusInfo, 0); });
    setInterval(chorusInfo, 1500);         // (the bars change as they are tapped)

    // Shift+click on a time: it becomes a box to type the time in ("1:23", "01:23.4"). Return keeps it, Escape doesn't.
    function editTime(li, btn) {
      var box = document.createElement('input');
      box.type = 'text'; box.className = 'btp-time-edit'; box.spellcheck = false;
      var s0 = parseFloat(li.dataset.s);
      box.value = isFinite(s0) ? fmtExact(s0) : btn.textContent;
      btn.replaceWith(box);
      box.focus(); box.select();
      var done = false;
      var finish = function (keep) {
        if (done) return; done = true;
        var t = seconds(box.value.trim());
        if (keep && isFinite(t) && t >= 0) {
          var a = api(), text = a && a.format ? a.format(t) : box.value.trim();
          li.dataset.s = t;
          btn.textContent = text;
          btn.title = 'Jump to ' + text + ' (Shift+click: change the time)';
          box.replaceWith(btn);
          save();
          say('Moved to ' + fmtExact(t));
        } else {
          box.replaceWith(btn);
          if (keep) say('That is not a time: try 1:23 or 01:23.4');
        }
      };
      box.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      box.addEventListener('blur', function () { finish(true); });
    }
    function fmtExact(t) {
      var m = Math.floor(t / 60), x = t - m * 60;
      return String(m).padStart(2, '0') + ':' + x.toFixed(1).padStart(4, '0');
    }

    function stamp() {
      var a = api();
      var t = a && a.time();
      if (typeof t !== 'number') { say('Nothing is playing yet.'); return; }
      var text = a.format(t);
      var input = addRow(text, '', t);
      save();
      say('Stamped ' + text);
      input.scrollIntoView({ block: 'nearest' });
      if (autoNote && autoNote.checked) input.focus();
    }

    // "MM:SS" (minutes may run past 59) or "H:MM:SS" back into seconds.
    function seconds(text) {
      var parts = String(text).split(':').map(Number);
      if (!parts.length || parts.some(isNaN)) return NaN;
      return parts.reduce(function (acc, n) { return acc * 60 + n; }, 0);
    }

    function jump(at) {
      var a = api();
      if (!a || !a.seek || !a.seek(at)) say('Nothing is loaded yet.');
    }

    function toggle() {
      var a = api();
      if (!a || !a.toggle()) say('Nothing is loaded yet.');
    }

    // Stamps are kept in the order made; this puts them in time order.
    function sortByTime() {
      var list = stamps();
      var sorted = list.slice().sort(function (a, b) {
        return parseFloat(a.dataset.s) - parseFloat(b.dataset.s);
      });
      if (sorted.every(function (li, i) { return li === list[i]; })) { say('Already in time order.'); return; }
      sorted.forEach(function (li) { rows.appendChild(li); });
      save();
      say('Sorted by time.');
    }
    var sortButton = log.querySelector('.btp-sort');
    if (sortButton) sortButton.addEventListener('click', function () { sortByTime(); sortButton.blur(); });

    function copyAll() {
      var text = asText();
      if (!text) return;
      copy(text).then(function () { say('Copied ' + stamps().length + ' stamps'); },
                      function () { say('The clipboard refused that.'); });
    }

    // "Best Day of My Life" -> best-day-of-my-life-2026-10-15, when the tune has a title (words.js's
    // Title box); otherwise the plain name given.
    function fileName(plain) {
      var src = api() && api().source && api().source();
      if (src && src.rec) return src.rec;                 // a collection recording: save as apps/shared/mlt/timings/<id>.json
      var box = document.querySelector('.btp-title');
      var slug = box ? box.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
      if (!slug) return plain;
      var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
      return slug + '-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
    log._btpFileName = fileName;

    // ---- the song file: everything on the page in one .json ----
    // { app: 'timestamp-notes', version: 1, title, source: { url, follow } | { file }, stamps: [{ t, s, n }],
    //   barMap: (bar-map.js state), words: (words.js state: the UG text, the ChordPro, sections, chord timing),
    //   phrases: (phrases.js state: bars a phrase, lead-ins) }
    // Opening one replaces the page's work. Older files still open: a timestamps .txt (added to the stamps, with its
    // "# url:" line), and a bar-map .json (the bars only).
    function parts() {
      var map = document.querySelector('.btp-barmap:not(.pc-shell)'), words = document.querySelector('.btp-words:not(.pc-shell)'), ph = document.querySelector('.btp-phrases:not(.pc-shell)');
      return { map: map && map._btpMap, words: words && words._btpWords, phrases: ph && ph._btpPhrases };
    }
    function songFile() {
      var a = api(), p = parts(), box = document.querySelector('.btp-title');
      return JSON.stringify({
        app: 'timestamp-notes', version: 1, saved: new Date().toISOString(),
        title: box ? box.value : '',
        source: (a && a.source && a.source()) || null,
        stamps: entries(),
        barMap: p.map ? p.map.state() : null,
        words: p.words ? p.words.state() : null,
        phrases: p.phrases ? p.phrases.state() : null
      }, null, 1);
    }
    function openSong(data, quiet, sameSong) {
      var any = stamps().length || (parts().map && parts().map.bars());
      if (any && !quiet && !confirm('Open ' + (data.title ? '\u201C' + data.title + '\u201D' : 'this song file') + '? It replaces what is on the page.')) return;
      // a song file opened (not undo, not the library): the work on the page is kept under its recording first, and the
      // opened file belongs to the recording it names
      if (!sameSong && curKey) libPut(curKey, JSON.parse(songFile()));
      var p = parts(), a = api(), loaded = '';
      if (data.words && p.words) p.words.load(data.words);
      rows.innerHTML = '';
      (data.stamps || []).forEach(rowBack);
      save(); showEmpty();
      if (data.barMap && p.map) p.map.load(data.barMap);
      if (data.phrases && p.phrases) p.phrases.load(data.phrases);
      var src = data.source, cur = a && a.source && a.source();
      if (src && src.media && !(cur && cur.media === src.media)) loaded = a.openMedia(src.media, src) ? ' Loaded the recording.' : '';
      else if (src && src.rec && !(cur && cur.rec === src.rec)) loaded = openRec(src.rec) ? ' Loaded the recording.' : '';
      else if (src && src.url && !(cur && cur.url === src.url) && a.open && a.open(src.url, src.follow)) loaded = ' Loaded the video.';
      else if (src && src.file && !(cur && cur.file === src.file)) loaded = ' Load ' + src.file + ' to play along.';
      if (!quiet) say('Opened ' + (data.title || 'the song file') + '.' + loaded);
      if (!sameSong) { var nk = libKey(data.source || (a && a.source && a.source())); if (nk) { setCur(nk); libSaved = null; } }
    }

    // ---- undo (u): the whole song (stamps, bars, words, chord timing, chunks) as it was before the last change ----
    // Snapshots of the song file, taken whenever it has changed (checked twice a second); u puts the one before back.
    var undoStack = [], lastState = null;
    function stateNow() { var d = JSON.parse(songFile()); delete d.saved; return JSON.stringify(d); }
    setInterval(function () {
      var st; try { st = stateNow(); } catch (e) { return; }
      if (lastState === null) { lastState = st; return; }
      if (st !== lastState) { undoStack.push(lastState); if (undoStack.length > 100) undoStack.shift(); lastState = st; }
    }, 500);
    function undo() {
      var st = stateNow(), back;
      if (lastState !== null && st !== lastState) back = lastState;      // a change not yet kept: back to before it
      else back = undoStack.pop();
      if (!back) { say('Nothing to undo.'); return; }
      openSong(JSON.parse(back), true, true);
      lastState = stateNow();
      say('Undone (u again goes further back).');
    }
    log._btpUndo = undo;

    // ---- the song library: every recording's notes kept in the browser (localStorage "tsn-lib:<key>", index "tsn-lib-index") ----
    // The key is the recording loaded (rec:<id>, media:<url>, yt:<video id>, file:<name>). The page's work is saved under it as it
    // changes; loading a different recording saves the one before and brings back the new one's notes (stamps, bars, words and
    // chords, chord timing, chunks, title), or blanks the page when it has none. "tsn-current" is the key the work belongs to.
    // The Saved songs part (#ts-library) lists them: open, download, delete; download all (one .json, opened again by Open file) and clear all.
    var LIB = 'tsn-lib:', LIB_INDEX = 'tsn-lib-index', LIB_CUR = 'tsn-current';
    function libKey(src) {
      if (!src) return null;
      if (src.rec) return 'rec:' + src.rec;
      if (src.media) return 'media:' + src.media;
      if (src.url) { var m = /[?&]v=([\w-]{6,})|youtu\.be\/([\w-]{6,})/.exec(src.url); return 'yt:' + (m ? (m[1] || m[2]) : src.url); }
      if (src.file) return 'file:' + src.file;
      return null;
    }
    function libIndex() { try { return JSON.parse(localStorage.getItem(LIB_INDEX) || '{}') || {}; } catch (e) { return {}; } }
    function libGet(k) { try { return JSON.parse(localStorage.getItem(LIB + k) || 'null'); } catch (e) { return null; } }
    function hasWork(d) {
      return !!(d && ((d.stamps && d.stamps.length) || (d.barMap && d.barMap.bars && d.barMap.bars.length) ||
        (d.words && (d.words.ug || d.words.chordpro || (d.words.hits && d.words.hits.length)))));
    }
    function libPut(k, d) {
      if (!k || !d) return;
      var idx = libIndex();
      if (!hasWork(d) && !idx[k]) return;                 // nothing to keep for a recording only listened to
      if (libKey(d.source) !== k) {                        // saved just after the next recording loaded: keep its own link
        var before = libGet(k); d.source = before && before.source || null;
      }
      try {
        localStorage.setItem(LIB + k, JSON.stringify(d));
        idx[k] = { title: d.title || '', saved: d.saved || new Date().toISOString(), stamps: (d.stamps || []).length,
          bars: (d.barMap && d.barMap.bars || []).length, words: !!(d.words && (d.words.ug || d.words.chordpro)) };
        localStorage.setItem(LIB_INDEX, JSON.stringify(idx));
      } catch (e) { say('The browser’s storage is full: download the saved songs and clear some.'); }
      renderLib();
    }
    function libDel(k) {
      var idx = libIndex(); delete idx[k];
      try { localStorage.removeItem(LIB + k); localStorage.setItem(LIB_INDEX, JSON.stringify(idx)); } catch (e) {}
      renderLib();
    }
    var curKey = null; try { curKey = localStorage.getItem(LIB_CUR); } catch (e) {}
    function setCur(k) { curKey = k; try { if (k) localStorage.setItem(LIB_CUR, k); else localStorage.removeItem(LIB_CUR); } catch (e) {} renderLib(); }
    var BLANK = { app: 'timestamp-notes', version: 1, title: '', stamps: [], barMap: { bars: [] }, words: {}, phrases: { size: 4 } };
    function loadInto(d) {                               // the notes only (the recording is already there)
      var copy = JSON.parse(JSON.stringify(d)); delete copy.source;
      openSong(copy, true, true);
      undoStack = []; lastState = stateNow();
    }
    var libSaved = null;
    function libTick() {                                 // twice a second: follow the recording, keep the work
      var a = api(), k = libKey(a && a.source && a.source());
      if (k && k !== curKey) {
        var now = JSON.parse(songFile());
        if (curKey) libPut(curKey, now);
        var kept = libGet(k);
        if (kept) { loadInto(kept); say('Brought back your notes for ' + (kept.title || k.replace(/^\w+:/, '')) + '.'); }
        else if (curKey || !hasWork(now)) loadInto(BLANK);
        var t = a.source().title, box = document.querySelector('.btp-title');
        if (t && box && !box.value) { box.value = t; box.dispatchEvent(new Event('input', { bubbles: true })); }
        // (no key yet but work on the page: work done before the library existed, now this recording's)
        setCur(k); libSaved = null;
      }
      if (!curKey) return;
      var st; try { st = stateNow(); } catch (e) { return; }
      if (st !== libSaved) { libSaved = st; libPut(curKey, JSON.parse(songFile())); }
    }
    setInterval(libTick, 500);
    function downloadJson(obj, name) {
      var url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1) + '\n'], { type: 'application/json' }));
      var el = document.createElement('a'); el.href = url; el.download = name;
      document.body.appendChild(el); el.click(); document.body.removeChild(el);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    function slug(t) { return String(t || 'song').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'song'; }
    function importLibrary(data) {
      var n = 0;
      Object.keys(data.songs || {}).forEach(function (k) {
        if (k === curKey) return;                        // the one on the page stays as it is
        var d = data.songs[k]; if (d && d.app === 'timestamp-notes') { libPut(k, d); n++; }
      });
      say('Added ' + n + (n === 1 ? ' song' : ' songs') + ' to the saved songs' + (data.songs && data.songs[curKey] ? ' (not the one on the page)' : '') + '.');
    }
    var libBox = document.querySelector('#ts-library');
    function renderLib() {
      if (!libBox) return;
      var ul = libBox.querySelector('.tsn-lib-rows'), idx = libIndex(), keys = Object.keys(idx);
      keys.sort(function (a, b) { return String(idx[b].saved).localeCompare(String(idx[a].saved)); });
      ul.innerHTML = '';
      keys.forEach(function (k) {
        var e = idx[k], li = document.createElement('li');
        li.className = 'tsn-lib-row' + (k === curKey ? ' is-cur' : '');
        var what = [e.stamps ? e.stamps + ' stamps' : '', e.bars ? e.bars + ' bars' : '', e.words ? 'words' : ''].filter(Boolean).join(', ') || 'empty';
        li.innerHTML = '<label><input type="checkbox" class="tsn-lib-pick"></label><span class="tsn-lib-name"></span>' +
          '<span class="tsn-lib-what"></span><button type="button" class="tsn-lib-open">Open</button>' +
          '<button type="button" class="tsn-lib-dl" title="Download its song file">↓</button><button type="button" class="tsn-lib-del" title="Delete it from this browser">×</button>';
        li.querySelector('.tsn-lib-pick').dataset.key = k;
        li.querySelector('.tsn-lib-name').textContent = (e.title || k.replace(/^\w+:/, '').split('/').pop()) + (k === curKey ? ' (on the page)' : '');
        li.querySelector('.tsn-lib-name').title = k;
        li.querySelector('.tsn-lib-what').textContent = what + ' · ' + String(e.saved).slice(0, 10);
        li.querySelector('.tsn-lib-open').addEventListener('click', function () {
          var d = libGet(k); if (!d) return;
          if (curKey && k !== curKey) libPut(curKey, JSON.parse(songFile()));
          setCur(k); libSaved = null;
          openSong(d, true, true); undoStack = []; lastState = stateNow();
          var src = d.source || {};
          say('Opened ' + (d.title || k) + '.' + (src.file ? ' Load ' + src.file + ' to play along.' : ''));
        });
        li.querySelector('.tsn-lib-dl').addEventListener('click', function () { var d = libGet(k); if (d) downloadJson(d, slug(d.title || k) + '.json'); });
        li.querySelector('.tsn-lib-del').addEventListener('click', function () {
          if (k === curKey) { say('That one is on the page: Clear all data in Timestamps clears it.'); return; }
          if (!confirm('Delete the notes for ' + (e.title || k) + ' from this browser?')) return;
          libDel(k);
        });
        ul.appendChild(li);
      });
      libBox.querySelector('.tsn-lib-empty').hidden = keys.length > 0;
    }
    if (libBox) {
      var picked = function () { return Array.prototype.map.call(libBox.querySelectorAll('.tsn-lib-pick:checked'), function (c) { return c.dataset.key; }); };
      libBox.querySelector('.tsn-lib-dl-all').addEventListener('click', function () {
        if (curKey) libPut(curKey, JSON.parse(songFile()));
        var keys = picked(); if (!keys.length) keys = Object.keys(libIndex());
        var songs = {}; keys.forEach(function (k) { var d = libGet(k); if (d) songs[k] = d; });
        downloadJson({ app: 'timestamp-notes-library', version: 1, saved: new Date().toISOString(), songs: songs },
          'timestamp-notes-library-' + new Date().toISOString().slice(0, 10) + '.json');
      });
      libBox.querySelector('.tsn-lib-del-picked').addEventListener('click', function () {
        var keys = picked(); if (!keys.length) { say('Tick the songs to delete first.'); return; }
        if (!confirm('Delete ' + keys.length + (keys.length === 1 ? ' song' : ' songs') + ' from this browser?')) return;
        keys.forEach(function (k) { if (k !== curKey) libDel(k); });
        if (keys.indexOf(curKey) >= 0) say('The song on the page is kept: Clear all data in Timestamps clears it.');
      });
      libBox.querySelector('.tsn-lib-clear').addEventListener('click', function () {
        if (!confirm('Delete every saved song from this browser except the one on the page? Download them first to keep them.')) return;
        Object.keys(libIndex()).forEach(function (k) { if (k !== curKey) libDel(k); });   // (Clear all data clears the page's own)
      });
      renderLib();
    }
    // ---- a recording in the MLT / JRI collection (apps/shared/mlt/recordings.js): ?rec=<id> opens it with its timing map ----
    function openRec(id) {
      var R = window.MLTRecordings, r = R && R.byId(id), a = api();
      if (!r || !a || !a.openMedia) return false;
      if (!R.url(r)) { say('The recordings are not online yet.'); return false; }
      a.openMedia(R.url(r), { rec: r.id, title: r.title });
      var box = document.querySelector('.btp-title'); if (box && !box.value) box.value = r.title;
      return true;
    }
    // ?media=<audio url>&at=<s>&title=…&marks=[["m:ss","note"]…]&timing=<song file>&tune=<id>: a recording from a Works entry
    // (works.js): its timing map when it has one, else its marks as stamps; ?tune= shows the notation (tsn-notation.js)
    setTimeout(function mediaFromUrl() {                 // after the page has put back its saved stamps
      var q = new URLSearchParams(location.search), url = q.get('media');
      if (!url) return;
      var marks = []; try { marks = JSON.parse(q.get('marks') || '[]'); } catch (e) {}
      var a = api(), at = parseFloat(q.get('at')) || 0;
      var secs = function (t) { return String(t).split(':').reduce(function (x, y) { return x * 60 + (parseFloat(y) || 0); }, 0); };
      var src = { media: url, title: q.get('title') || '' };
      var cur = a && a.source && a.source();
      if (cur && cur.media === url && stamps().length) { if (at) a.seek(at); return; }   // came back to the same recording: keep the work
      var mine = libGet(libKey(src));                    // notes of your own for it (the song library) come before its map
      if (mine && libKey(src) !== curKey) { mine.source = src; openSong(mine, true); if (at && a) setTimeout(function () { a.seek(at); }, 300); say('Brought back your notes for ' + (mine.title || src.title || 'it') + '.'); return; }
      var timing = q.get('timing');                       // its timing map (a song file): opened instead of the marks
      if (timing) {
        fetch(timing, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
          if (!d) { say('Its timing map could not be loaded.'); return; }
          d.source = src; if (!d.title) d.title = src.title;
          openSong(d, true);
          var box2 = document.querySelector('.btp-title'); if (box2 && !box2.value) box2.value = src.title;
          if (at && a) setTimeout(function () { a.seek(at); }, 300);
          say('Opened ' + (src.title || 'the recording') + ' with its bars.');
        });
        return;
      }
      openSong({ app: 'timestamp-notes', version: 1, title: src.title, source: src,
        stamps: marks.map(function (m) { var s = secs(m[0]); return { t: a && a.format ? a.format(s) : m[0], s: s, n: m[1] }; }) });
      var box = document.querySelector('.btp-title'); if (box && src.title) box.value = src.title;
      if (at && a) setTimeout(function () { a.seek(at); }, 300);
    }, 0);
    (function recFromUrl() {
      var id = new URLSearchParams(location.search).get('rec'), R = window.MLTRecordings;
      if (!id) return;
      if (!R) { say('This page needs recordings.js to open ' + id + '.'); return; }
      var r = R.byId(id); if (!r) { say('No recording ' + id + ' in the collection.'); return; }
      var mine = libGet('rec:' + id);
      if (mine && curKey !== 'rec:' + id) { openSong(mine, true); if (!(api().source() || {}).rec) openRec(id); say('Brought back your notes for ' + r.title + '.'); return; }
      if (mine) { if (!(api().source() || {}).rec) openRec(id); return; }   // already on the page: just the recording
      fetch(R.timingUrl(r), { cache: 'no-cache' }).then(function (res) { return res.ok ? res.text() : null; }).catch(function () { return null; })
        .then(function (text) {
          if (text) { openText(text); if (!(api().source() || {}).rec) openRec(id); say('Opened ' + r.title + ' with its timing map.'); }
          else { openRec(id); var box = document.querySelector('.btp-title'); if (box) box.value = r.title;
            say('No timing map yet for ' + r.title + '. Stamp and tap, then Save: keep the file as apps/shared/mlt/timings/' + r.id + '.json.'); }
        });
    })();

    function openText(text) {
      var t = String(text).trim();
      if (t.charAt(0) === '{') {
        var data = null;
        try { data = JSON.parse(t); } catch (e) {}
        if (data && data.app === 'timestamp-notes') { openSong(data); return; }
        if (data && data.app === 'timestamp-notes-library') { importLibrary(data); return; }
        if (data && Array.isArray(data.bars) && parts().map) {
          if (parts().map.load(data)) say('Read ' + data.bars.length + ' bars. Section names come from the stamps.');
          return;
        }
        say('That is not a song file.');
        return;
      }
      importText(text);
    }

    function download() {
      if (!stamps().length && !(parts().map && parts().map.bars()) && !(parts().words && parts().words.state().chordpro)) return;
      var blob = new Blob([songFile() + '\n'], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName('timestamp-notes') + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    var stampButton = log.querySelector('.btp-stamp-now');
    if (stampButton) stampButton.addEventListener('click', function () {
      stamp();
      stampButton.blur();
    });
    log.querySelector('.btp-copy-all').addEventListener('click', copyAll);
    log.querySelector('.btp-download').addEventListener('click', download);

    // Bring back earlier work: a .txt from Download, or the same text pasted.
    // Each line is a time, then optionally a tab (or spaces, or a dash) and the
    // note -- "01:23\tChorus", "1:02:03 - bridge", "[04:10] key change".
    // Lines without a time at the front are skipped. Imported stamps are
    // added to what is already there, in time order, leaving out exact repeats.
    var LINE = /^\s*\[?(\d+(?::\d{1,2}){1,2})\]?(?:\s*[-\u2013\u2014|]\s*|\s+|$)(.*)$/;

    function importText(text) {
      var have = {};
      entries().forEach(function (row) { have[row.t + '\t' + row.n] = true; });
      var found = [], skipped = 0, src = null;
      String(text).split(/\r?\n/).forEach(function (line) {
        if (!line.trim()) return;
        var h = /^\s*#\s*(url|file)\s*:\s*(\S+)(\s*\(in a tab\))?/i.exec(line);
        if (h) { src = { kind: h[1].toLowerCase(), value: h[2], tab: !!h[3] }; return; }
        var m = line.match(LINE);
        if (!m) { skipped++; return; }
        var t = m[1], n = m[2].trim();
        if (have[t + '\t' + n]) return;
        have[t + '\t' + n] = true;
        found.push({ t: t, s: seconds(t), n: n });
      });
      // the recording the stamps were made on: a link is loaded (unless it already is); a file is named
      var loaded = '';
      if (src) {
        var a = api(), cur = a && a.source && a.source();
        if (src.kind === 'url' && !(cur && cur.url === src.value) && a && a.open && a.open(src.value, src.tab)) loaded = ' Loaded ' + src.value + '.';
        else if (src.kind === 'file' && !(cur && cur.file === src.value)) loaded = ' These were made on ' + src.value + ': load it to play along.';
        var nk = libKey(a && a.source && a.source());     // the stamps belong to the recording they name (not blanked by the switch)
        if (nk && nk !== curKey) { setCur(nk); libSaved = null; }
      }
      if (!found.length) {
        say((skipped ? 'No timestamps found in that text.' : 'Nothing new to import.') + loaded);
        return;
      }
      var all = entries().concat(found);
      all.sort(function (a, b) { return a.s - b.s; });
      rows.innerHTML = '';
      all.forEach(rowBack);
      save();
      showEmpty();
      say('Imported ' + found.length + (found.length === 1 ? ' stamp' : ' stamps')
          + (skipped ? ' (' + skipped + ' lines skipped)' : '') + '.' + loaded);
    }

    var importFile = log.querySelector('.btp-import-file');
    if (importFile) importFile.addEventListener('change', function () {
      var f = importFile.files[0];
      importFile.value = '';            // so choosing the same file again still fires
      if (!f) return;
      f.text().then(openText, function () { say('Could not read that file.'); });
    });

    var pasteBox = log.querySelector('.btp-paste');
    var pasteButton = log.querySelector('.btp-paste-go');
    function togglePaste(open) {
      pasteBox.hidden = !open;
      if (open) pasteBox.querySelector('textarea').focus();
    }
    log.querySelector('.btp-paste-open').addEventListener('click', function () {
      togglePaste(pasteBox.hidden);
    });
    pasteButton.addEventListener('click', function () {
      var area = pasteBox.querySelector('textarea');
      openText(area.value);
      area.value = '';
      togglePaste(false);
    });
    pasteBox.querySelector('.btp-paste-cancel').addEventListener('click', function () {
      pasteBox.querySelector('textarea').value = '';
      togglePaste(false);
    });
    pasteBox.querySelector('textarea').addEventListener('keydown', function (e) {
      e.stopPropagation();              // Enter is a newline here, not play/pause
      if (e.key === 'Escape') togglePaste(false);
    });

    // A .txt dropped on the log imports too (a video dropped there is left alone).
    log.addEventListener('dragover', function (e) { e.preventDefault(); });
    log.addEventListener('drop', function (e) {
      e.preventDefault();
      var f = e.dataTransfer && e.dataTransfer.files[0];
      if (f && (/^text\/|json/.test(f.type) || /\.(txt|json)$/i.test(f.name))) {
        f.text().then(openText);
      }
    });

    // Clear throws the lot away, so it asks first: the button becomes its own
    // confirmation for a few seconds rather than interrupting with a dialog.
    var clear = log.querySelector('.btp-clear');
    var armed = null;
    function disarm() {
      if (armed) { clearTimeout(armed); armed = null; }
      clear.textContent = 'Clear all data';
      clear.classList.remove('armed');
    }
    if (clear) clear.addEventListener('click', function () {
      if (!armed) {
        clear.textContent = 'Clear all data — sure?';
        clear.classList.add('armed');
        armed = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      // everything kept for the song: stamps, bars, words and ChordPro, chord timing, grids, phrases, the chorus length
      // (the page's own settings -- widths, folds, MIDI -- stay). Then the page starts afresh, with nothing loaded.
      if (curKey) libDel(curKey);
      ['tsn-current', 'btp-stamps', 'btp-bars', 'btp-words', 'btp-chord-hits', 'btp-confirmed', 'btp-grid-sigs', 'btp-phrases', 'btp-form-bars']
        .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      location.replace(location.pathname);
    });

    // Remember whether the jump into the note field is wanted.
    if (autoNote) {
      try {
        var choice = localStorage.getItem(AUTONOTE);
        if (choice !== null) autoNote.checked = choice === 'on';
      } catch (e) {}
      autoNote.addEventListener('change', function () {
        try {
          localStorage.setItem(AUTONOTE, autoNote.checked ? 'on' : 'off');
        } catch (e) {}
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var target = e.target;
      var typing = target && target.matches
                 && target.matches('input, textarea, select, [contenteditable]');
      // The URL box keeps Enter for loading a video; everywhere else -- the
      // page, a note field -- Enter plays and pauses.
      var inUrl = target && target.classList
                && target.classList.contains('btp-url');

      if (e.key === 'Enter' && !inUrl) {
        toggle();
        e.preventDefault();
        return;
      }
      if (typing) return;
      if (e.key === 'u') { undo(); e.preventDefault(); return; }
      // C is a letter while a note is being typed, and a stamp otherwise.
      if (e.key === 'c' || e.key === 'C') {
        stamp();
        e.preventDefault();
        return;
      }
      var a = api();
      // Space plays and pauses -- but not the page's own clock while a
      // YouTube video plays in another tab (Return still runs that).
      if (e.key === ' ') {
        e.preventDefault();
        if (a && a.following()) { say('The video is in its own tab: play it there (Return runs the clock here).'); return; }
        toggle();
        return;
      }
      // Five seconds back or on: the arrows, or h and l.
      var step = e.key === 'ArrowLeft' || e.key === 'h' ? -5
               : e.key === 'ArrowRight' || e.key === 'l' ? 5 : 0;
      if (step) {
        e.preventDefault();
        var t = a && a.time();
        if (typeof t !== 'number') { say('Nothing is loaded yet.'); return; }
        a.seek(Math.max(0, t + step));
      }
    });

    // The sticky log sits just under the fixed navbar, whatever its height.
    var layout = log.closest('.btp-layout');
    var header = document.getElementById('quarto-header');
    function measureTop() {
      if (!layout) return;
      var h = header ? header.getBoundingClientRect().height : 0;
      layout.style.setProperty('--btp-top', (h + 8) + 'px');
    }
    measureTop();
    window.addEventListener('resize', measureTop);

    // Dragging the splitter sets the notes column's width, in pixels, kept
    // between a usable minimum and most of the layout.
    var splitter = layout && layout.querySelector('.btp-splitter');
    if (splitter) {
      var MIN_LOG = 224, MIN_PLAYER = 320;
      var clampWidth = function (w) {
        var max = layout.getBoundingClientRect().width - MIN_PLAYER;
        return Math.round(Math.max(MIN_LOG, Math.min(w, max)));
      };
      var setWidth = function (w, keep) {
        if (w == null) layout.style.removeProperty('--btp-log-w');
        else layout.style.setProperty('--btp-log-w', clampWidth(w) + 'px');
        if (!keep) return;
        try {
          if (w == null) localStorage.removeItem(LOG_W);
          else localStorage.setItem(LOG_W, String(clampWidth(w)));
        } catch (e) {}
      };
      try {
        var stored = parseFloat(localStorage.getItem(LOG_W));
        if (isFinite(stored)) setWidth(stored, false);
      } catch (e) {}

      splitter.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        splitter.setPointerCapture(e.pointerId);
        splitter.classList.add('dragging');
        document.body.classList.add('btp-resizing');
        var right = log.getBoundingClientRect().right;   // (the sidebar sits beyond it)
        var move = function (ev) { setWidth(right - ev.clientX, false); };
        var up = function (ev) {
          splitter.removeEventListener('pointermove', move);
          splitter.removeEventListener('pointerup', up);
          splitter.removeEventListener('pointercancel', up);
          splitter.classList.remove('dragging');
          document.body.classList.remove('btp-resizing');
          setWidth(right - ev.clientX, true);
        };
        splitter.addEventListener('pointermove', move);
        splitter.addEventListener('pointerup', up);
        splitter.addEventListener('pointercancel', up);
      });
      splitter.addEventListener('dblclick', function () { setWidth(null, true); });
      // Arrow keys nudge it, for anyone not using a pointer.
      splitter.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        e.stopPropagation();
        var w = log.getBoundingClientRect().width;
        setWidth(w + (e.key === 'ArrowLeft' ? 32 : -32), true);
      });
    }

    // Whatever was on the page last time.
    saved().forEach(rowBack);
    relabel();
    changed();
    showEmpty();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
