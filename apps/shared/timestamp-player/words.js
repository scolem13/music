/* Timestamp Notes: the words and chords, and where they go next.
   Ultimate Guitar text (chords over words) is pasted in and turned into ChordPro (ug-chordpro.js); its section headings
   become the list stamped with S (the next section not yet stamped starts here). As the recording plays, the section under
   the playhead is named above the two boxes and both scroll to its heading. A stamp at 0:00 that is not the first section
   (a bare C as the recording starts) becomes an Intro, added to the list and the ChordPro.

   With the bars tapped, Send to the Notation page reads the ChordPro in with each section's chords spread over its bars
   (a section stamped but not tapped borrows the bar count of another of the same name: choruses are usually alike), and a
   section whose bars are in another meter gets a {time:} of its own. Send to the Backing Track plays the same chart at the
   tapped tempo. Both open as remote windows: the Notation page answers nt-ready and takes nt-chordpro; the Backing Track
   takes bt-load as it does from the Notation page.

     s   stamp the next section from the words

   Kept in localStorage (btp-words: { ug, chordpro, title, sections }). */
(function () {
  "use strict";

  var STORE = 'btp-words';
  var SECTION = /^(intro|verse|pre-?chorus|chorus|refrain|bridge|middle\s*8|solo|instrumental|interlude|break(down)?|outro|coda|tag|vamp|head|ending|turnaround)\b/i;

  function boot() {
    var root = document.querySelector('.btp-words:not(.pc-shell)');
    var player = document.querySelector('.btp');
    var log = document.querySelector('.btp-log');
    var map = document.querySelector('.btp-barmap:not(.pc-shell)');
    if (!root || !player || !window.UgChordPro) return;
    var U = window.UgChordPro;
    var q = function (sel) { return PanelColumns.q(root, sel); };
    var ugIn = q('.btp-ug'), choIn = q('.btp-cho'), titleIn = q('.btp-title'), secList = q('.btp-word-secs');
    var note = q('.btp-send-note'), nowLabel = q('.btp-word-now');
    var sections = [];          // [{ name, chords, times }] from the last conversion (and an Intro added at 0:00)

    function save() {
      try { localStorage.setItem(STORE, JSON.stringify({ ug: ugIn.value, chordpro: choIn.value, title: titleIn.value, sections: sections })); }
      catch (e) {}
    }
    function say(text) { note.textContent = text || ''; }
    function api() { return player._btp || null; }
    function fmt(t) { var m = Math.floor(t / 60), s = Math.floor(t - m * 60); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
    function bare(n) { return String(n || '').trim().replace(/^§\s*/, '').toLowerCase(); }
    function logRows() { return log && log._btpStamps ? log._btpStamps() : []; }

    // Which stamp (if any) each listed section has: the k-th "Chorus" on the list takes the k-th Chorus stamp in time order.
    // A stamp numbered by the section menu (Chorus 2) where the words have only "Chorus": the words' name, so the 2nd
    // Chorus stamp is the 2nd time the words' Chorus comes. A name the words have as it is (Verse 1) is left alone.
    var aliasKey = null, aliasHeads = {};
    function wordsName(name) {
      var n = String(name || '').trim();
      if (aliasKey !== choIn.value) {
        aliasKey = choIn.value; aliasHeads = {};
        heads().list.forEach(function (h) { aliasHeads[h.name.toLowerCase()] = h.name; });
      }
      if (aliasHeads[n.toLowerCase()]) return n;
      var m = /^(.*\S)\s+\d+$/.exec(n);
      return m && aliasHeads[m[1].toLowerCase()] ? aliasHeads[m[1].toLowerCase()] : n;
    }
    function stampsFor() {
      var rows = logRows().map(function (r, i) { return { n: bare(wordsName(String(r.n || '').replace(/^\u00a7\s*/, ''))), s: r.s, i: i }; })
                          .sort(function (a, b) { return a.s - b.s; });
      var used = {};
      return sections.map(function (sec) {
        var n = sec.name.toLowerCase(), k = used[n] | 0;
        used[n] = k + 1;
        return rows.filter(function (r) { return r.n === n; })[k] || null;
      });
    }
    function nextUnstamped() {
      var got = stampsFor();
      for (var i = 0; i < got.length; i++) if (!got[i]) return i;
      return -1;
    }
    function stampName(name) {
      return name;           // (a section stamp is one by its kind, whatever its name)
    }
    // S, or two notes together in the left hand: the next section of the words, when there are words still to stamp;
    // else a section labelled from the menu (as the one before it)
    function stampSection(at, quiet) {
      if (choIn.value.trim() && sections.length && nextUnstamped() >= 0) return stampNext(at);
      return !!(log && log._btpSection && log._btpSection(at, quiet));
    }
    function stampNext(at) {
      var i = nextUnstamped();
      if (i < 0) { say(sections.length ? 'Every section is stamped.' : 'Convert some words and chords first.'); return false; }
      if (log && log._btpAdd && log._btpAdd(stampName(sections[i].name), at)) { renderSecs(); show(sections[i].name, 0, true); return true; }
      return false;
    }

    // The ChordPro lines of the nth time a section comes (empty: a repeat written as a bare heading borrows the lines of
    // the first time with some). Its chords: its own, or -- a Verse 2 with words but no chords, UG's habit -- the chords
    // of the first time that has them.
    function heads() {
      var lines = U.stripGrids(choIn.value).split('\n'), out = [];
      lines.forEach(function (l, i) {
        var m = /^\{\s*(?:start_of_\w+|so[cvb]|comment|c)\s*:\s*([^}]*)\}/i.exec(l.trim());
        if (m) out.push({ i: i, name: m[1].trim() });
      });
      return { lines: lines, list: out };
    }
    function linesOf(h, all) {
      var out = [], next = all.list.filter(function (x) { return x.i > h.i; })[0], end = next ? next.i : all.lines.length;
      for (var i = h.i + 1; i < end; i++) { var l = all.lines[i].trim(); if (l && !/^\{/.test(l)) out.push(l); }
      return out;
    }
    function own(name) {
      var all = heads(), low = name.toLowerCase();
      return all.list.filter(function (h) { return h.name.toLowerCase() === low; }).map(function (h) { return linesOf(h, all); });
    }
    var hasChord = function (ls) { return ls.some(function (l) { return /\[[^\]]+\]/.test(l); }); };
    function body(name, nth) {
      var times = own(name), mine = times[nth] || [];
      if (mine.length) return mine;
      return times.filter(function (ls) { return ls.length; })[0] || [];
    }
    function chordNames(name, nth) {
      var times = own(name), src = times[nth] && hasChord(times[nth]) ? times[nth] : times.filter(hasChord)[0] || [];
      var out = [];
      src.forEach(function (l) { (l.match(/\[([^\]]+)\]/g) || []).forEach(function (c) { out.push(c.slice(1, -1)); }); });
      return out;
    }

    // A stamp at 0:00 for something other than the first section: what plays before it is an Intro.
    function introAtZero() {
      if (!sections.length) return;
      var rows = logRows(), first = sections[0].name.toLowerCase();
      rows.forEach(function (r, i) {
        if (!(r.s < 1) || bare(r.n) === first || bare(r.n) === 'intro') return;
        // a note being typed is left alone until it is left
        var input = log.querySelectorAll('.btp-note')[i];
        if (input && document.activeElement === input && r.n) return;
        // a listed section named on purpose is kept; a bare stamp, or a name not on the list, is the Intro
        if (sections.some(function (s) { return s.name.toLowerCase() === bare(r.n); })) return;
        if (!/^intro$/i.test(sections[0].name)) {
          sections.unshift({ name: 'Intro', chords: [], lines: 0, times: 1 });
          choIn.value = addIntro(choIn.value);
        }
        log._btpRename(i, 'Intro');
        say('A stamp at 0:00: that part is the Intro, added to the sections.');
        save();
      });
    }
    function addIntro(cho) {
      var lines = cho.split('\n'), at = 0;
      while (at < lines.length && /^\{\s*(title|t|key|time|capo|artist|subtitle|st)\s*:/i.test(lines[at].trim())) at++;
      lines.splice(at, 0, '', '{comment: Intro}');
      return lines.join('\n').replace(/\n{3,}/g, '\n\n');
    }

    function renderSecs() {
      secList.innerHTML = '';
      var got = stampsFor(), next = got.indexOf(null);
      sections.forEach(function (s, i) {
        var li = document.createElement('li');
        li.className = i === next ? 'next' : got[i] ? 'done' : '';
        if (got[i]) li.dataset.nowStamp = Math.round(got[i].s * 1000);
        var when = document.createElement('button');
        when.type = 'button'; when.className = 'btp-stamp';
        if (got[i]) {
          when.textContent = fmt(got[i].s);
          when.title = 'Jump to ' + s.name;
          when.addEventListener('click', function () { var a = api(); if (a) a.seek(got[i].s); when.blur(); });
        } else { when.textContent = '--:--'; when.disabled = true; when.title = i === next ? 'S stamps this one' : 'Not stamped yet'; }
        var name = document.createElement('span');
        name.className = 'btp-sec-name';
        name.textContent = s.name + (s.times > 1 ? ' ×' + s.times : '');
        var info = document.createElement('span');
        info.className = 'btp-sec-bars';
        info.textContent = s.chords.length ? s.chords.length + (s.chords.length === 1 ? ' chord' : ' chords') : '';
        // how many of its chords have been timed (N, or the right hand)
        var live = document.querySelector('.btp-live:not(.pc-shell)'), L = live && live._btpLive, m = map && map._btpMap;
        var sec = got[i] && m && m.sections().filter(function (x) { return Math.abs(x.stamp - got[i].s) < 0.01; })[0];
        var n = sec && L ? L.count(sec) : 0;
        if (n) info.textContent = n + ' of ' + chordNames(s.name, sections.slice(0, i).filter(function (x) { return x.name === s.name; }).length).length + ' chords timed';
        li.appendChild(when); li.appendChild(name); li.appendChild(info);
        secList.appendChild(li);
      });
      q('.btp-stamp-next').disabled = next < 0;
    }

    // ---- the section under the playhead, at the top of both boxes ----
    // The line of the n-th heading named `name` in each box: "[Verse 1]" in the UG text, "{start_of_verse: Verse 1}" or
    // "{comment: Verse 1}" in the ChordPro.
    function headingLine(text, name, nth, ug) {
      var lines = text.split('\n'), low = name.toLowerCase(), k = 0;
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim(), m = ug ? /^\[([^\]]+)\]/.exec(l) : /^\{\s*(?:start_of_(?!grid)\w+|so[cvb]|comment|c)\s*:\s*([^}]*)\}/i.exec(l);
        if (m && m[1].replace(/\s*[x×]\s*\d+$/i, '').trim().toLowerCase() === low && k++ === nth) return i;
      }
      return -1;
    }
    function scrollTo(box, line) {
      if (line < 0 || document.activeElement === box) return;
      var lh = parseFloat(getComputedStyle(box).lineHeight) || 18;
      box.scrollTop = line * lh;
    }
    var shown = null;
    function show(name, nth, force) {
      var key = name == null ? '' : name + '#' + nth;
      if (key === shown && !force) return;
      shown = key;
      nowLabel.textContent = name == null ? '' : name;
      nowLabel.hidden = name == null;
      if (name == null) return;
      scrollTo(ugIn, headingLine(ugIn.value, name, nth, true));
      scrollTo(choIn, headingLine(choIn.value, name, nth, false));
    }
    (function watch() {
      var a = api(), t = a && a.time(), m = map && map._btpMap;
      if (typeof t === 'number' && m) {
        var here = null, count = {}, nth = 0;
        m.sections().forEach(function (s) {
          var n = s.name.toLowerCase();
          if (s.start <= t + 0.05) { here = s; nth = count[n] | 0; }
          count[n] = (count[n] | 0) + 1;
        });
        show(here ? here.name : null, nth);
      }
      requestAnimationFrame(watch);
    })();

    function convert() {
      var r = U.convert(ugIn.value, { title: titleIn.value, meter: meter() });
      choIn.value = r.chordpro;
      if (!titleIn.value && r.title) titleIn.value = r.title;
      sections = r.sections;
      introAtZero();
      save(); renderSecs();
      say(sections.length ? sections.length + ' sections. Play the recording and press S as each one starts, then tap the bars with B.'
                          : 'No [Verse] / [Chorus] headings found: stamp sections yourself with C and a name.');
    }
    // A ChordPro of just the stamped section names, in time order, each once: {comment: Guitar Solo}
    function stampedNames() {
      var m = map && map._btpMap, seen = {}, out = [];
      (m ? m.sections() : []).forEach(function (s) { var k = s.name.toLowerCase(); if (!seen[k]) { seen[k] = true; out.push(s.name); } });
      return out;
    }
    function skeleton(names) {
      return (names || stampedNames()).map(function (n) { return '{comment: ' + n + '}\n'; }).join('\n');
    }
    // Sections from stamps: the stamp labels become the ChordPro's sections (added after what is there, if any)
    function fromStamps() {
      var names = stampedNames();
      if (!names.length) { say('No section stamps yet: stamp with C and a name (Intro, Verse 1, Guitar Solo ...).'); return; }
      var have = {};
      sections.forEach(function (s) { have[s.name.toLowerCase()] = true; });
      var own = choIn.value.trim() ? sections.slice() : [];
      if (!choIn.value.trim()) have = {};
      var add = names.filter(function (n) { return !have[n.toLowerCase()] && !new RegExp('\\{\\s*(?:comment|c|start_of_\\w+)\\s*:\\s*' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\}', 'i').test(choIn.value); });
      if (!add.length) { say('Every stamped section is already in the ChordPro.'); return; }
      choIn.value = (choIn.value.trim() ? choIn.value.replace(/\s+$/, '') + '\n\n' : '') + skeleton(add);
      sections = own.concat(add.map(function (n) { return { name: n, chords: [], lines: 0, times: 1 }; }));
      save(); renderSecs();
      var mm = map && map._btpMap; if (mm && mm.refresh) mm.refresh();
      say(add.length + (add.length === 1 ? ' section' : ' sections') + ' from the stamps: ' + add.join(', ') + '. Add chords when you have them.');
    }
    function meter(b) { var m = map && map._btpMap; return (b || (m ? m.beats() : 4)) + '/4'; }

    // The ChordPro to send: meter and tempo from the taps, each section's chords over its bars, and a {time:} for a
    // section in another meter.
    function chart() {
      var m = map && map._btpMap, cho = U.stripGrids(choIn.value), notes = [];   // (the grids are timing, read in buildDoc)
      if (!cho.trim()) cho = skeleton();     // no words yet: the stamped sections, empty (N.C. for their bars)
      if (!cho.trim()) return null;
      if (!/\{\s*time\s*:/i.test(cho)) cho = '{time: ' + meter() + '}\n' + cho;
      else cho = cho.replace(/\{\s*time\s*:[^}]*\}/i, '{time: ' + meter() + '}');
      if (titleIn.value && !/\{\s*(title|t)\s*:/i.test(cho)) cho = '{title: ' + titleIn.value + '}\n' + cho;
      var bars = {}, meters = {};
      (m ? m.sections() : []).forEach(function (s) {
        (bars[s.name] = bars[s.name] || []).push(s.bars);
        var bs = s.beats || [], one = bs.length && bs.every(function (x) { return x === bs[0]; }) ? bs[0] : null;
        (meters[s.name] = meters[s.name] || []).push(one);
        if (bs.length && one == null) notes.push(s.name + ' changes meter inside: set those bars on the Notation page.');
      });
      // a {time:} where a section's meter differs from the one before it
      var main = m ? m.beats() : 4, cur = main, seen = {}, out = [];
      cho.split('\n').forEach(function (l) {
        out.push(l);
        var h = /^\{\s*(?:start_of_\w+|comment|c)\s*:\s*([^}]*)\}$/i.exec(l.trim());
        if (!h) return;
        var name = h[1].trim(), k = seen[name] = (seen[name] | 0) + 1, list = meters[name];
        if (!list) return;
        var b = list[k - 1] != null ? list[k - 1] : list.find(function (x) { return x != null; }) || main;
        if (b !== cur) { out.push('{time: ' + meter(b) + '}'); cur = b; }
      });
      var fit = U.fitBars(out.join('\n'), bars);
      return { chordpro: fit.chordpro, notes: notes.concat(fit.notes), bpm: m ? m.bpm() : null, title: titleIn.value || 'Untitled' };
    }

    // The piece as the Notation page and the Backing Track take it: the ChordPro read in, then each section given its
    // tapped length, and its chords where they were played (live.js) when they were. A section with bars but no chords
    // (an Intro added at 0:00) is N.C. for its length.
    // keepMarks: leave each timed chunk's _timed on (for the grid); ignoreGrid: time from the hits even where the ChordPro
    // has a grid for the section (when the grids are being rewritten from the hits)
    function buildDoc(keepMarks, ignoreGrid) {
      var c = chart();
      if (!c) return null;
      var D = window.NotationDoc, doc = D.fromChordPro(c.chordpro, meter()), m = map && map._btpMap;
      var live = document.querySelector('.btp-live:not(.pc-shell)'), L = live && live._btpLive;
      doc.title = c.title;
      var secs = m ? m.sections() : [], notes = c.notes.slice();
      // The chunks in the order they were stamped. UG writes a chorus out once and only names it (or not even that) when it
      // comes back: a section stamped more times than the words have it repeats the first one written.
      var occ = {}, low = function (ch) { return (ch.heading || ch.name || '').trim().toLowerCase(); };
      doc.chunks.forEach(function (ch, ci) { (occ[low(ch)] = occ[low(ch)] || []).push(ci); });
      var plan = [], used = {}, count = {};
      secs.forEach(function (sec) {
        var n = sec.name.toLowerCase(), k = count[n] = (count[n] | 0) + 1, list = occ[n];
        if (!list) return;
        var ci = list[k - 1], ch;
        if (ci != null) { ch = doc.chunks[ci]; used[ci] = true; }
        else { ci = list[0]; ch = JSON.parse(JSON.stringify(doc.chunks[ci])); ch.takes = []; ch.band = null; ch.sectionBand = null; }
        plan.push({ ch: ch, sec: sec, nth: k - 1, src: ci });
      });
      if (plan.length) {
        var meterOf = doc.chunks.map(function (ch, ci) { return D.at(doc, ci).meter; });
        var firstUsed = Math.min.apply(null, plan.map(function (p) { return p.src; }));
        var front = [], back = [];
        doc.chunks.forEach(function (ch, ci) { if (!used[ci] && !plan.some(function (p) { return p.ch === ch; })) (ci < firstUsed ? front : back).push({ ch: ch, src: ci }); });
        var order = front.concat(plan, back);
        order.forEach(function (p) { p.ch.meter = meterOf[p.src] === doc.meter ? null : meterOf[p.src]; });
        doc.chunks = order.map(function (p) { return p.ch; });
      }
      // a grid in the ChordPro is the section's timing, as written (or as left there at the last pause)
      var written = ignoreGrid ? [] : U.grids(choIn.value), gseen = {};
      plan.forEach(function (p) {
        var ch = p.ch, sec = p.sec, ci = doc.chunks.indexOf(ch), name = (ch.heading || ch.name).trim();
        var g = written.filter(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })[p.nth];
        // the grid stands until the section's hits change (then the hits are newer; the next pause writes them)
        var hitSig = L ? L.sigOf(sec) : '', wroteSig = gridSigs[name.toLowerCase() + '#' + p.nth];
        if (g && g.bars.length && (!hitSig || wroteSig == null || wroteSig === hitSig)) {
          var gc = U.gridChords(g.bars);
          ch.chords = gc.chords; ch.chordLen = gc.len; ch._timed = true; p.grid = true;
          return;
        }
        if (!sec.bars) return;
        var barQ = (D.meterInfo(D.at(doc, ci).meter) || D.meterInfo('4/4')).barQ;
        var lenQ = (sec.beats && sec.beats.length ? sec.beats.reduce(function (a, b) { return a + b; }, 0) : sec.bars * barQ);
        var timed = L && L.place(sec, chordNames(name, p.nth));
        if (timed && timed.chords.length) {
          ch.chords = timed.chords; ch.chordLen = lenQ; ch._timed = true;
          notes = notes.concat(timed.notes);
        } else if (!ch.chords.length) {
          ch.chordLen = lenQ;
          ch.chords = [{ at: 0, name: 'N.C.' }];      // nothing is written for it: the band waits (an Intro before the Verse's first chord)
        } else if (ch.chordLen > 0 && lenQ > ch.chordLen && Math.abs(lenQ / ch.chordLen - Math.round(lenQ / ch.chordLen)) < 1e-6) {
          // a section tapped a whole number of times its written length (a doubled last chorus): the progression again
          var reps = Math.round(lenQ / ch.chordLen), one = ch.chords, len = ch.chordLen, all = [];
          for (var r = 0; r < reps; r++) one.forEach(function (c) { all.push({ at: c.at + r * len, name: c.name }); });
          ch.chords = all; ch.chordLen = lenQ;
          notes.push(name + (p.nth ? ' (time ' + (p.nth + 1) + ')' : '') + ': ' + sec.bars + ' bars, its progression ' + reps + ' times through.');
        } else if (ch.chordLen < lenQ) ch.chordLen = lenQ;
      });
      plan.forEach(function (p) { p.chords = p.ch.chords.slice(); });       // (the whole section's, for its grid, before any split)
      splitMeters(doc, plan, D);
      // every named part is a section on the Notation page (an Intro added at 0:00 too), its chunks labelled I1a, V1a, PC2b ...
      doc.chunks.forEach(function (ch) { if (!ch.heading && !ch._cont && ch.name && !/^Chunk \d+$/.test(ch.name)) ch.heading = ch.name; });
      D.chunkLabels(doc);
      doc.chunks.forEach(function (ch) { if (!keepMarks) { delete ch._timed; delete ch._cont; } });
      return { doc: doc, plan: plan, notes: notes, bpm: c.bpm, title: c.title, chordpro: c.chordpro };
    }

    // A section whose tapped bars change meter partway (4/4 with a bar of 2/4) is split there into chunks of one meter each,
    // so the chart, the Backing Track and the Notation page show the 2/4 bar and then the 4/4 again. The pieces after the
    // first are marked _cont (the same section going on). Then every chunk's meter is written only where it changes.
    function splitMeters(doc, plan, D) {
      var want = doc.chunks.map(function (ch, ci) { return D.at(doc, ci).meter || '4/4'; }), out = [], wants = [];
      doc.chunks.forEach(function (ch, ci) {
        var p = plan.filter(function (x) { return x.ch === ch; })[0], bs = p && p.sec.beats;
        var unit = (/\/(\d+)$/.exec(want[ci]) || [0, '4'])[1];
        if (!bs || bs.length < 2 || bs.every(function (b) { return b === bs[0]; })) { out.push(ch); wants.push(want[ci]); return; }
        var groups = [], at = 0;
        bs.forEach(function (b) {
          var g = groups[groups.length - 1];
          if (g && g.beats === b) { g.n++; } else groups.push({ beats: b, n: 1, from: at });
          at += b;
        });
        var all = ch.chords, len = ch.chordLen;
        groups.forEach(function (g, gi) {
          var piece = gi ? window.NotationDoc.newChunk(ch.name) : ch, from = g.from, to = gi + 1 < groups.length ? groups[gi + 1].from : Math.max(len, at);
          piece.chords = all.filter(function (c) { return c.at >= from - 1e-6 && c.at < to - 1e-6; }).map(function (c) { return { at: Math.round((c.at - from) * 1000) / 1000, name: c.name }; });
          // a piece starting mid-chord carries the chord on
          var before = all.filter(function (c) { return c.at < from - 1e-6; }).pop();
          if (gi && before && !(piece.chords[0] && piece.chords[0].at === 0)) piece.chords.unshift({ at: 0, name: before.name });
          piece.chordLen = to - from;
          if (gi) { piece._cont = true; piece._timed = ch._timed; }
          out.push(piece); wants.push(g.beats + '/' + unit);
        });
      });
      var cur = doc.meter || '4/4';
      out.forEach(function (ch, i) { ch.meter = wants[i] === cur ? null : wants[i]; cur = wants[i]; });
      doc.chunks = out;
    }

    // One section (the nth time `name` comes) as a chart: the ABC of just its bars, for tune-chart.js. Not confirmed yet,
    // it shows only the chords that have been timed (N or the right hand), as they are hit.
    function sectionAbc(name, nth, withChords) {
      var b = buildDoc(true);
      if (!b) return null;
      var D = window.NotationDoc, doc = b.doc, seen = {}, pick = -1, low = name.toLowerCase();
      doc.chunks.forEach(function (ch, ci) {
        var n = (ch.heading || ch.name || '').trim().toLowerCase();
        if (!n || ch._cont) return;
        var k = seen[n] = (seen[n] | 0) + 1;
        if (n === low && k === nth + 1) pick = ci;
      });
      if (pick < 0) return null;
      // the section's chunk and the pieces it was split into at a meter change
      var parts = [pick];
      for (var j = pick + 1; j < doc.chunks.length && doc.chunks[j]._cont; j++) parts.push(j);
      var one = D.create(), timed = !!doc.chunks[pick]._timed;
      one.title = name;
      one.chunks = parts.map(function (ci, i) {
        var ch = JSON.parse(JSON.stringify(doc.chunks[ci]));
        // unconfirmed: only the chords already played in (each shows as soon as it is hit)
        if (!withChords && !timed) ch.chords = [];
        delete ch._timed; delete ch._cont;
        ch.meter = D.at(doc, ci).meter; ch.heading = null; ch.name = name;   // (the chart labels its first bar with the section, not V1a)
        if (i === 0) one.meter = ch.meter;
        return ch;
      });
      return reflow(D.bandChart(one).abc, 4);
    }

    // ABC with each section's bars n to a line (the Backing Track's chart and the grid here lay out the lines as written).
    function reflow(abc, n) {
      var out = [], bars = [];
      var flush = function () { for (var i = 0; i < bars.length; i += n) out.push(bars.slice(i, i + n).join(' | ') + ' |'); bars = []; };
      abc.split('\n').forEach(function (l) {
        if (/^[A-Za-z]:/.test(l) || !/\|/.test(l)) { flush(); out.push(l); return; }
        l.split('|').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) { bars.push(x); });
      });
      flush();
      return out.join('\n');
    }

    // ---- the grids in the ChordPro: written at each pause, for every section timed (hits) or confirmed ----
    // A section whose hits haven't changed since its grid was written keeps the grid as it stands in the text (so a grid
    // edited by hand stays); new hits in it write it again.
    var gridSigs = {};
    try { gridSigs = JSON.parse(localStorage.getItem('btp-grid-sigs') || '{}') || {}; } catch (e) {}
    function L() { var el = document.querySelector('.btp-live:not(.pc-shell)'); return el && el._btpLive; }
    function cellsOf(p) {
      var bs = p.sec.beats && p.sec.beats.length ? p.sec.beats.slice() : [];
      if (!bs.length) { var n = Math.ceil(p.ch.chordLen / 4 - 1e-6); for (var i = 0; i < n; i++) bs.push(4); }
      return U.gridCells(p.chords || p.ch.chords, bs);
    }
    function writeGrids() {
      if (document.activeElement === choIn || !choIn.value.trim()) return false;
      var live = L(), b = buildDoc(true, true);
      if (!b || !live) return false;
      var have = U.grids(choIn.value), blocks = [], seen = {};
      b.plan.forEach(function (p) {
        var name = (p.ch.heading || p.ch.name).trim(), key = name.toLowerCase() + '#' + p.nth;
        var ex = have.filter(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })[p.nth];
        if (ex) seen[have.indexOf(ex)] = true;
        var sig = live.sigOf(p.sec);
        var want = live.count(p.sec) > 0 || live.isConfirmed(name, p.nth);
        if (!want || gridSigs[key] === sig) { if (ex) blocks.push(ex.raw); return; }
        if (!p.sec.bars) { if (ex) blocks.push(ex.raw); return; }
        blocks.push(U.gridBlock(name, cellsOf(p)));
        gridSigs[key] = sig;
      });
      have.forEach(function (g, i) { if (!seen[i]) blocks.push(g.raw); });     // grids for sections not stamped (yet)
      var text = U.stripGrids(choIn.value).replace(/\s+$/, '') + (blocks.length ? '\n\n' + blocks.join('\n\n') : '') + '\n';
      try { localStorage.setItem('btp-grid-sigs', JSON.stringify(gridSigs)); } catch (e) {}
      if (text === choIn.value) return false;
      choIn.value = text; save(); renderSecs();
      return true;
    }
    // The chords of each bar of the confirmed (or grid-written) sections, for the Bars table: { barIndex: 'G . D .' }
    function barChords() {
      var b = buildDoc(true), live = L(), out = {};
      if (!b || !live) return out;
      b.plan.forEach(function (p) {
        var name = (p.ch.heading || p.ch.name).trim();
        if (!(live.isConfirmed(name, p.nth) || p.grid) || p.sec.bar == null || p.sec.bar < 0) return;
        cellsOf(p).forEach(function (cells, i) { if (i < p.sec.bars) out[p.sec.bar + i] = cells.join(' '); });
      });
      return out;
    }
    function copyGrids(btn) {
      writeGrids();
      var text = U.grids(choIn.value).map(function (g) { return g.raw; }).join('\n\n');
      if (!text) { say('Nothing timed yet: no grid to copy.'); return; }
      navigator.clipboard.writeText(text + '\n').then(function () { say('Copied the chord grid (ChordPro).'); }, function () { say('The clipboard refused that.'); });
    }
    choIn.addEventListener('input', function () {
      clearTimeout(choIn._t);
      choIn._t = setTimeout(function () { var m = map && map._btpMap; if (m && m.refresh) m.refresh(); }, 400);
    });

    // ---- remote windows ----
    function remote(url, name, readyType, msgs) {
      var w = remote[name];
      if (w && !w.closed && w._ready) { msgs.forEach(function (x) { w.postMessage(x, location.origin); }); try { w.focus(); } catch (e) {} return true; }
      w = window.open(url, name);
      if (!w) { say('The browser blocked the window: allow pop-ups for this site.'); return false; }
      remote[name] = w; w._pending = msgs; w._readyType = readyType;
      return true;
    }
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      ['ts-notation', 'ts-band'].forEach(function (name) {
        var w = remote[name];
        if (!w || e.source !== w || e.data.type !== w._readyType) return;
        w._ready = true;
        (w._pending || []).forEach(function (x) { w.postMessage(x, location.origin); });
        w._pending = null;
      });
    });

    q('.btp-send-notation').addEventListener('click', function () {
      var c = buildDoc();
      if (!c) { say('Nothing to send yet: paste the words and chords, then Convert.'); return; }
      if (remote('/tools/notation.html?remote=1', 'ts-notation', 'nt-ready',
                 [{ type: 'nt-doc', doc: c.doc, title: c.title, tempo: c.bpm, host: 'Timestamp Notes' }]))
        say('Sent to the Notation page' + (c.notes.length ? '. ' + c.notes.join(' ') : ': add the melody there.'));
    });
    q('.btp-send-band').addEventListener('click', function () {
      var c = buildDoc();
      if (!c) { say('Nothing to send yet: paste the words and chords, then Convert.'); return; }
      var ch = window.NotationDoc.bandChart(c.doc);
      ch.abc = reflow(ch.abc, 4);              // four bars a line on the Backing Track's chart
      if (!ch.parts.length) { say('No chords to play yet.'); return; }
      if (remote('/tools/backing-track.html?remote=1', 'ts-band', 'bt-ready',
                 [{ type: 'bt-load', abc: ch.abc, title: c.title, tempo: c.bpm || undefined, host: 'Timestamp Notes' }]))
        say('Sent to the Backing Track' + (c.bpm ? ' at ' + c.bpm + ' bpm' : '') + ': choose a style there.' + (c.notes.length ? ' ' + c.notes.join(' ') : ''));
    });

    // Ultimate Guitar, ChordPro, or both side by side
    var cols = q('.btp-word-cols');
    function view(v) {
      cols.dataset.view = v;
      PanelColumns.qa(root, 'button[data-view]').forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
      try { localStorage.setItem('btp-word-view', v); } catch (e) {}
    }
    PanelColumns.qa(root, 'button[data-view]').forEach(function (b) { b.addEventListener('click', function () { view(b.dataset.view); b.blur(); }); });
    var v0 = 'both';
    try { v0 = localStorage.getItem('btp-word-view') || 'both'; } catch (e) {}
    view(v0);

    q('.btp-convert').addEventListener('click', function (e) { convert(); e.target.blur(); });
    var fs = q('.btp-from-stamps');
    if (fs) fs.addEventListener('click', function (e) { fromStamps(); e.target.blur(); });
    q('.btp-stamp-next').addEventListener('click', function (e) { stampNext(); e.target.blur(); });
    [ugIn, choIn, titleIn].forEach(function (el) {
      el.addEventListener('input', save);
      el.addEventListener('keydown', function (e) { if (e.key === 'Escape') el.blur(); e.stopPropagation(); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && t.matches && t.matches('input, textarea, select, [contenteditable]')) return;
      // S: the next section of the words, when there are words still to stamp; else a section chosen from the menu
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        stampSection();
      }
    });
    if (log) {
      log.addEventListener('btp-stamps', function () { introAtZero(); renderSecs(); });
      log.addEventListener('focusout', function () { setTimeout(function () { introAtZero(); renderSecs(); }, 0); });
    }

    // for live.js and the song file
    root._btpWords = {
      sections: function () { return sections; },
      known: function (name) { return own(name).length > 0; },
      wordsName: wordsName, stampSection: stampSection,
      writeGrids: writeGrids, barChords: barChords, copyGrids: copyGrids,
      remote: remote, remoteWin: function (name) { var w = remote[name]; return w && !w.closed ? w : null; },
      body: body, chordNames: chordNames, stampNext: stampNext, buildDoc: buildDoc, sectionAbc: sectionAbc,
      refresh: function () { renderSecs(); },
      state: function () {
        var live = document.querySelector('.btp-live:not(.pc-shell)'), L = live && live._btpLive;
        return { ug: ugIn.value, chordpro: choIn.value, title: titleIn.value, sections: sections, hits: L ? L.hits() : [], confirmed: L ? L.confirmed() : {}, gridSigs: gridSigs };
      },
      load: function (d) {
        ugIn.value = d.ug || ''; choIn.value = d.chordpro || ''; titleIn.value = d.title || ''; sections = d.sections || [];
        var live = document.querySelector('.btp-live:not(.pc-shell)'), L = live && live._btpLive;
        gridSigs = d.gridSigs || {};
        try { localStorage.setItem('btp-grid-sigs', JSON.stringify(gridSigs)); } catch (e) {}
        if (L) { L.load(d.hits || []); L.setConfirmed(d.confirmed || {}); }
        save(); renderSecs(); shown = null;
      },
      say: say
    };

    try {
      var kept = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (kept) { ugIn.value = kept.ug || ''; choIn.value = kept.chordpro || ''; titleIn.value = kept.title || ''; sections = kept.sections || []; }
    } catch (e) {}
    nowLabel.hidden = true;
    renderSecs();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
