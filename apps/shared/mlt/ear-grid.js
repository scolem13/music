// ear-grid.js: Chord Grid by Ear (practice/ear-grid.qmd). Global EarGrid.
//
// A recording from the collection (recordings.js) under a blank chord grid, for learning a tune's chords and melody by ear:
// a click on a bar plays from there, Shift+click a second bar loops the bars between, and each bar takes a guess (a chord
// name, C G7 Am, or a Roman numeral, I V7 vi). Check compares the guesses with the chords of the tune the recording is
// linked to (rec.tune), by function, so a recording in another key than the notation is fine.
//
// Where the bars come from:
//   - the recording's timing map (Timestamp Notes song file, apps/shared/mlt/timings/<id>.json): its tapped bars and sections;
//   - else a steady grid: first downbeat, tempo and beats a bar, set on the page (Tap tempo, "First bar = now").
// Which tune bar a recording bar is: (bar - "tune starts at bar") mod the tune's bars, so every verse is checked; a pickup bar
// in the tune is not counted. Repeats |: :| and first / second endings are played out (simply: one repeat, [1 / [2).
// Guesses are kept per recording in localStorage ("ear-grid:<id>").
//
// URL: ?rec=<recording id>, or ?tune=<tune id> (its recordings to choose from). Needs recordings.js; abcjs for the notation.
// Pure helpers for tests: EarGrid.tuneBars(abc) -> { key, bars: [[chord…]], pickup }, EarGrid.fn(chord, key) -> { deg, q } | null,
// EarGrid.same(a, b) -> 2 (same chord) | 1 (same root) | 0.
(function (global) {
  "use strict";
  var TUNES = "/apps/tunes/tunes-object.js?v=2";
  var LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
  var ROM = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mmss(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  // ---------- keys and chords ----------
  // "C", "Am", "Ddor", "F#m", "Bbmix" -> { tonic: 0-11, minor: bool, name }
  function parseKey(k) {
    var m = /^\s*([A-G])([#b]?)\s*([a-zA-Z]*)/.exec(String(k || "")); if (!m) return null;
    var mode = m[3].toLowerCase().slice(0, 3);
    return { tonic: (LET[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12, minor: mode === "m" || mode === "min" || mode === "aeo" || mode === "dor" || mode === "phr", name: m[1] + m[2] + m[3] };
  }
  function quality(rest) {
    var r = rest.replace(/\/.*$/, "");
    var q = /^(dim|°|o(?!\w))/.test(r) ? "dim" : /^(ø|m7b5|m7\(b5\)|min7b5)/.test(r) ? "hdim" : /^(aug|\+)/.test(r) ? "aug" : /^(m(?!aj)|min|-)/.test(r) ? "min" : /^sus/.test(r) ? "sus" : "maj";
    return q;
  }
  // a chord name or Roman numeral -> { deg: semitones above the key's tonic, q: maj|min|dim|hdim|aug|sus }
  function fn(ch, key) {
    ch = String(ch || "").trim(); if (!ch || !key) return null;
    var m = /^([A-G])([#b♯♭]?)(.*)$/.exec(ch);
    if (m) {
      var pc = LET[m[1]] + (/[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0);
      return { deg: ((pc - key.tonic) % 12 + 12) % 12, q: quality(m[3]) };
    }
    m = /^([b#♭♯]?)(vii|vi|iv|v|iii|ii|i)(.*)$/i.exec(ch);
    if (m) {
      var n = ROM.indexOf(m[2].toLowerCase()), scale = key.minor ? MIN : MAJ;
      var deg = scale[n] + (/[#♯]/.test(m[1]) ? 1 : /[b♭]/.test(m[1]) ? -1 : 0);
      var up = m[2] === m[2].toUpperCase(), rest = m[3];
      var q = /^(°|o|dim)/.test(rest) ? "dim" : /^(ø)/.test(rest) ? "hdim" : /^(\+|aug)/.test(rest) ? "aug" : /^sus/.test(rest) ? "sus" : up ? "maj" : "min";
      return { deg: (deg + 12) % 12, q: q };
    }
    return null;
  }
  function same(a, b) {
    if (!a || !b) return 0;
    if (a.deg !== b.deg) return 0;
    return a.q === b.q || (a.q === "hdim" && b.q === "dim") || (a.q === "dim" && b.q === "hdim") ? 2 : 1;
  }
  // the guess written the other way: a Roman numeral for a chord name, in the recording's key
  function roman(f, key) {
    if (!f) return "";
    var scale = key.minor ? MIN : MAJ, i = scale.indexOf(f.deg), acc = "";
    if (i < 0) { i = scale.indexOf((f.deg + 1) % 12); acc = "♭"; if (i < 0) { i = scale.indexOf((f.deg + 11) % 12); acc = "♯"; } }
    var r = ROM[i] || "?"; if (f.q === "maj" || f.q === "aug" || f.q === "sus") r = r.toUpperCase();
    return acc + r + (f.q === "dim" ? "°" : f.q === "hdim" ? "ø" : f.q === "aug" ? "+" : f.q === "sus" ? "sus" : "");
  }

  // ---------- the tune's chords, bar by bar ----------
  function tuneBars(abc) {
    var head = {}, body = [], inHead = true;
    String(abc).split(/\r?\n/).forEach(function (l) {
      var h = /^([A-Za-z]):\s*(.*)$/.exec(l);
      if (inHead) { if (h) { head[h[1]] = h[2].trim(); if (h[1] === "K") inHead = false; } return; }
      if (h || /^%/.test(l) || /^\s*w:/i.test(l)) return;
      body.push(l.replace(/%.*$/, ""));
    });
    var meter = /^(\d+)\/(\d+)/.exec(head.M || "4/4") || [0, 4, 4], unit = /^(\d+)\/(\d+)/.exec(head.L || "") || [0, 1, 8];
    var barLen = (+meter[1] / +meter[2]) / (+unit[1] / +unit[2]);
    var text = body.join(" ").replace(/![^!]*!/g, "").replace(/\{[^}]*\}/g, "");
    // cut into bars, keeping repeat signs
    var parts = text.split(/(\|\]|\|\||\[\|:|:\|\]|::|:\|\|?|\|:|\[?\|)/), bars = [], cur = { s: "", start: false };
    function close(sign) { if (cur.s.trim()) bars.push({ s: cur.s, start: cur.start, end: /:\|/.test(sign) || sign === "::" }); else if (/:\|/.test(sign) || sign === "::") { if (bars.length) bars[bars.length - 1].end = true; } cur = { s: "", start: /\|:|::/.test(sign) }; }
    parts.forEach(function (p, i) { if (i % 2) close(p); else cur.s += p; });
    close("");
    bars.forEach(function (b) {
      var e = /^\s*\[?([12])[\s"A-Ga-gz^_=]/.exec(b.s); b.ending = e ? +e[1] : 0; b.s = b.s.replace(/^\s*\[?[12](?=[\s"A-Ga-gz^_=])/, "");
      b.chords = []; b.s.replace(/"([^"]*)"/g, function (_, c) {
        c = c.trim().replace(/^\^/, "");                                    // this collection writes MLT chords above the staff: "^C" "^G7" (and "^I" "^V")
        if (/^[A-G]/.test(c) && !/^(coda|fine|d\.?c|d\.?s|da capo|al )/i.test(c)) b.chords.push(c); return ""; });
      // length, to find a pickup: notes and rests with their multipliers
      var notes = b.s.replace(/"[^"]*"/g, "").replace(/\[[A-Za-z]:[^\]]*\]/g, "");
      var len = 0; notes.replace(/(\[[^\]]*\]|[_^=]*[A-Ga-gzx][,']*)(\d*)(\/*)(\d*)/g, function (_, n, num, sl, den) {
        var v = num ? +num : 1; if (sl) v /= den ? +den : Math.pow(2, sl.length); len += v; return ""; });
      b.len = len;
    });
    var pickup = bars.length > 1 && bars[0].len > 0 && bars[0].len < barLen * 0.99;
    // play out the repeats: back to the last |: (or the start) at each :|, leaving out first-ending bars the second time
    var out = [], from = 0;
    bars.forEach(function (b, i) {
      if (b.start) from = i;
      out.push(b);
      if (b.end) { for (var j = from; j <= i; j++) if (bars[j].ending !== 1) out.push(bars[j]); from = i + 1; }
    });
    var list = out.map(function (b) { return b.chords; });
    // a bar with no chord keeps the chord before it
    var last = null; list = list.map(function (c) { if (c.length) { last = c[c.length - 1]; return c; } return last ? [last] : []; });
    if (pickup) list.shift();
    return { key: head.K || "C", meter: head.M || "4/4", title: head.T || "", bars: list, pickup: pickup, hasChords: out.some(function (b) { return b.chords.length; }) };
  }

  // ---------- tune collection ----------
  var loading = null;
  function loadTunes() {
    if (global.tunesObject || typeof tunesObject !== "undefined") return Promise.resolve();   // eslint-disable-line no-undef
    return loading || (loading = new Promise(function (res) { var s = document.createElement("script"); s.src = TUNES; s.onload = res; s.onerror = res; document.head.appendChild(s); }));
  }
  function tuneText(id) {
    var o = global.tunesObject || (typeof tunesObject !== "undefined" ? tunesObject : {}), out = null;   // eslint-disable-line no-undef
    var re = new RegExp("^%%id\\s+" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "m");
    Object.keys(o).forEach(function (k) { if (!out) String(o[k]).split(/\n(?=X:)/).forEach(function (t) { if (!out && re.test(t)) out = t; }); });
    return out;
  }

  // ---------- the page ----------
  function mount(host) {
    var R = global.MLTRecordings; if (!R) { host.textContent = "recordings.js is missing on this page."; return; }
    var q = new URLSearchParams(location.search), rec = R.byId(q.get("rec") || ""), tuneQ = q.get("tune");
    host.innerHTML = '<div class="eg-pick"><label>Recording <input type="search" class="eg-q" list="eg-recs" placeholder="type a title…" size="40"></label>' +
      '<datalist id="eg-recs"></datalist> <span class="eg-dim">Recordings linked to a tune (so they can be checked) come first.</span></div><div class="eg-main"></div>';
    var dl = host.querySelector("#eg-recs"), qi = host.querySelector(".eg-q");
    var pool = R.list.slice().sort(function (a, b) { return (b.tune ? 2 : 0) + (b.timing ? 1 : 0) - (a.tune ? 2 : 0) - (a.timing ? 1 : 0); });
    if (tuneQ) pool = R.forTune(tuneQ).concat(pool.filter(function (r) { return !(r.tune || []).includes(tuneQ); }));
    dl.innerHTML = pool.map(function (r) { return '<option value="' + esc(r.title + " — " + r.id) + '">'; }).join("");
    qi.onchange = function () { var m = / — (\S+)$/.exec(qi.value), r = m && R.byId(m[1]); if (r) { var u = new URL(location.href); u.searchParams.set("rec", r.id); u.searchParams.delete("tune"); history.replaceState(null, "", u); open(r); } };
    var main = host.querySelector(".eg-main");
    if (!rec && tuneQ && R.forTune(tuneQ).length) rec = R.forTune(tuneQ).filter(function (r) { return r.kind === "song"; })[0] || R.forTune(tuneQ)[0];
    if (rec) { qi.value = rec.title + " — " + rec.id; open(rec); }
    else main.innerHTML = '<p class="eg-dim">Choose a recording above' + (tuneQ ? " (no recordings are linked to " + esc(tuneQ) + " yet)" : "") + ".</p>";

    var cleanup = null;
    function open(r) {
      if (cleanup) cleanup();
      main.innerHTML = "";
      var STORE = "ear-grid:" + r.id, saved = {};
      try { saved = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) {}
      var st = Object.assign({ guesses: {}, bpm: 100, beats: 4, first: 0, start: 1, perRow: 4, key: r.key || "" }, saved);
      function keep() { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) {} }

      var url = R.url(r);
      var top = el("div", "eg-top");
      top.innerHTML = "<h3>" + esc(r.title) + "</h3><div class=\"eg-dim\">" + [r.kind && R.KINDS[r.kind], r.tonality, r.meter, r.key && "key " + r.key].filter(Boolean).map(esc).join(" · ") +
        ((r.tune || []).length ? ' · tune: ' + r.tune.map(function (t) { return '<a href="/practice/tunes.html?tune=' + encodeURIComponent(t) + '">' + esc(t) + "</a>"; }).join(", ") : "") +
        ' · <a href="/tools/timestamp-notes.html?rec=' + encodeURIComponent(r.id) + '">⏱ ' + (r.timing ? "timing map" : "make a timing map") + "</a></div>";
      main.appendChild(top);
      var au = el("audio", "eg-audio"); au.controls = true; au.preload = "metadata"; if (url) au.src = url; main.appendChild(au);
      if (!url) main.appendChild(el("p", "eg-dim", "The recordings are not online yet (the bucket address is not set)."));
      if (global.AudioTap && AudioTap.registerMedia) try { AudioTap.registerMedia(au); } catch (e) {}

      var ctl = el("div", "eg-ctl"); main.appendChild(ctl);
      var gridBox = el("div", "eg-grid"); main.appendChild(gridBox);
      var msg = el("p", "eg-msg"); main.appendChild(msg);
      var tuneBox = el("details", "eg-tune"); main.appendChild(tuneBox);

      var map = null, tune = null, tuneAbc = null, loop = null, anchor = null, checked = false, reveal = false;

      // bar start times: the timing map's, else the steady grid
      function bars() {
        if (map) return map.bars;
        var d = au.duration > 0 && isFinite(au.duration) ? au.duration : (r.dur || 120), len = st.beats * 60 / st.bpm, out = [];
        for (var t = +st.first; t < d - len * 0.25 && out.length < 1000; t += len) out.push(t);
        return out;
      }
      function sections() { return map ? map.sections : []; }
      function barEnd(i) { var b = bars(); return i + 1 < b.length ? b[i + 1] : (au.duration || b[i] + 2); }
      function barAt(t) { var b = bars(), i = -1; for (var k = 0; k < b.length; k++) if (b[k] <= t + 0.03) i = k; return i; }

      function recKey() { return parseKey(st.key || (tune && tune.key) || "C"); }
      function answerFor(i) {
        if (!tune || !tune.bars.length) return null;
        var n = i - (st.start - 1); if (n < 0) return null;
        return tune.bars[n % tune.bars.length];
      }

      function drawCtl() {
        ctl.innerHTML =
          (map ? '<span class="eg-dim">Bars from the timing map (' + map.bars.length + ").</span>" :
            '<label>First bar at <input class="eg-first" type="number" step="0.01" min="0" value="' + st.first + '" style="width:5.5em"> s</label> <button type="button" class="eg-now">= now</button> ' +
            '<label>Tempo <input class="eg-bpm" type="number" min="30" max="300" step="0.5" value="' + st.bpm + '" style="width:4.5em"></label> <button type="button" class="eg-tap" title="Tap on the beat, 4 times or more">Tap</button> ' +
            '<label>Beats a bar <input class="eg-beats" type="number" min="1" max="12" value="' + st.beats + '" style="width:3.5em"></label>') +
          ' <label>Bars a row <select class="eg-row">' + [2, 3, 4, 6, 8].map(function (n) { return "<option" + (n === st.perRow ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></label>" +
          ' <label title="the key the recording is in (for checking chord names)">Key <input class="eg-key" size="4" value="' + esc(st.key) + '" placeholder="' + esc(tune ? tune.key : "C") + '"></label>' +
          (tune ? ' <label title="the recording bar where the tune\'s first full bar is">Tune starts at bar <input class="eg-start" type="number" min="1" value="' + st.start + '" style="width:4em"></label>' : "") +
          ' <button type="button" class="eg-check">Check</button> <button type="button" class="eg-reveal">' + (reveal ? "Hide" : "Show") + ' answers</button> <button type="button" class="eg-clear">Clear guesses</button>' +
          ' <span class="eg-dim">Click a bar to play from it · Shift+click another to loop · Space play/pause · Esc stop looping</span>';
        function num(cls, k) { var x = ctl.querySelector("." + cls); if (x) x.onchange = function () { var v = parseFloat(x.value); if (isFinite(v)) { st[k] = v; keep(); drawGrid(); } }; }
        num("eg-first", "first"); num("eg-bpm", "bpm"); num("eg-beats", "beats"); num("eg-start", "start");
        var now = ctl.querySelector(".eg-now"); if (now) now.onclick = function () { st.first = Math.round(au.currentTime * 100) / 100; keep(); drawCtl(); drawGrid(); };
        var taps = [], tap = ctl.querySelector(".eg-tap");
        if (tap) tap.onclick = function () {
          var t = au.paused ? performance.now() / 1000 : au.currentTime;
          if (taps.length && t - taps[taps.length - 1] > 2.5) taps = [];
          taps.push(t);
          if (taps.length >= 4) { var d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); st.bpm = Math.round(600 / d) / 10; keep(); ctl.querySelector(".eg-bpm").value = st.bpm; drawGrid(); }
        };
        ctl.querySelector(".eg-row").onchange = function () { st.perRow = +this.value; keep(); drawGrid(); };
        ctl.querySelector(".eg-key").onchange = function () { st.key = this.value.trim(); keep(); drawGrid(); };
        ctl.querySelector(".eg-check").onclick = check;
        ctl.querySelector(".eg-reveal").onclick = function () { reveal = !reveal; this.textContent = (reveal ? "Hide" : "Show") + " answers"; drawGrid(); };
        ctl.querySelector(".eg-clear").onclick = function () { if (confirm("Clear every guess for this recording?")) { st.guesses = {}; keep(); checked = false; drawGrid(); } };
      }

      function drawGrid() {
        gridBox.innerHTML = "";
        var b = bars(), secs = sections(), key = recKey(), rowEl = null, inRow = 0, secIdx = 0;
        gridBox.style.setProperty("--eg-cols", st.perRow);
        for (var i = 0; i < b.length; i++) {
          if (secs[secIdx] && secs[secIdx].bar === i) { gridBox.appendChild(el("div", "eg-sec", esc(secs[secIdx].name) + ' <span class="eg-dim">' + mmss(secs[secIdx].time) + "</span>")); secIdx++; inRow = 0; rowEl = null; }
          while (secs[secIdx] && secs[secIdx].bar < i) secIdx++;
          if (!rowEl || inRow === st.perRow) { rowEl = el("div", "eg-row"); gridBox.appendChild(rowEl); inRow = 0; }
          var cell = el("div", "eg-bar"); cell.dataset.i = i;
          var ans = answerFor(i), g = st.guesses[i] || "";
          var cls = "";
          if ((checked || reveal) && ans && ans.length) {
            var parts = g.split(/\s+/).filter(Boolean);
            if (checked && parts.length) {
              var score = ans.map(function (a, k) { return same(fn(parts[Math.min(k, parts.length - 1)], key), fn(a, parseKey(tune.key))); });
              cls = score.every(function (s) { return s === 2; }) ? " eg-ok" : score.some(function (s) { return s > 0; }) ? " eg-half" : " eg-no";
            }
          }
          if (loop && i >= loop[0] && i <= loop[1]) cls += " eg-inloop";
          cell.className += cls;
          cell.innerHTML = '<span class="eg-n">' + (i + 1) + '</span><input class="eg-g" value="' + esc(g) + '" spellcheck="false" autocomplete="off" aria-label="bar ' + (i + 1) + '">' +
            (reveal && ans && ans.length ? '<span class="eg-a">' + ans.map(function (a) { var f = fn(a, parseKey(tune.key)); var ext = (/^[A-G][#b]?(?:maj|min|m(?!aj)|dim|aug|sus\d?|[°ø+-])?(.*)$/.exec(a) || [])[1] || ""; return esc(transposeName(f, key) + ext + " (" + roman(f, key) + ext.replace(/\/.*/, "") + ")"); }).join(" ") + "</span>" : "");
          rowEl.appendChild(cell); inRow++;
        }
        if (!b.length) gridBox.appendChild(el("p", "eg-dim", "No bars yet: set the first downbeat and the tempo, or make a timing map."));
      }
      function transposeName(f, key) {
        if (!f) return "?";
        var pc = (key.tonic + f.deg) % 12, flat = /b/.test(st.key || (tune && tune.key) || "") || [5, 10, 3, 8, 1].indexOf(key.tonic) >= 0;
        var names = flat ? ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] : ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
        return names[pc] + (f.q === "min" ? "m" : f.q === "dim" ? "°" : f.q === "hdim" ? "ø" : f.q === "aug" ? "+" : f.q === "sus" ? "sus" : "");
      }
      function check() {
        if (!tune || !tune.hasChords) { msg.textContent = tune ? "The linked tune has no chord symbols to check against." : "This recording is not linked to a tune with chords, so there is nothing to check against (link one on the Recordings Catalogue)."; return; }
        checked = true; drawGrid();
        var n = 0, ok = 0, half = 0;
        [].forEach.call(gridBox.querySelectorAll(".eg-bar"), function (c) { if (c.querySelector(".eg-g").value.trim()) { n++; if (c.classList.contains("eg-ok")) ok++; else if (c.classList.contains("eg-half")) half++; } });
        msg.textContent = n ? ok + " of " + n + " bars right" + (half ? ", " + half + " with the right root but not the right chord (orange)" : "") + "." : "Type a chord in some bars first.";
      }

      gridBox.addEventListener("input", function (e) {
        if (!e.target.classList.contains("eg-g")) return;
        var i = +e.target.parentNode.dataset.i, v = e.target.value.trim();
        if (v) st.guesses[i] = v; else delete st.guesses[i];
        keep(); e.target.parentNode.classList.remove("eg-ok", "eg-half", "eg-no");
      });
      gridBox.addEventListener("keydown", function (e) {
        if (!e.target.classList.contains("eg-g")) return;
        if (e.key === "Enter" || e.key === "Tab" && !e.shiftKey) {
          var nx = gridBox.querySelector('.eg-bar[data-i="' + (+e.target.parentNode.dataset.i + 1) + '"] .eg-g');
          if (nx) { e.preventDefault(); nx.focus(); }
        }
      });
      gridBox.addEventListener("click", function (e) {
        var cell = e.target.closest(".eg-bar"); if (!cell || e.target.classList.contains("eg-g") && !e.shiftKey) return;
        var i = +cell.dataset.i;
        if (e.shiftKey && anchor != null) { loop = [Math.min(anchor, i), Math.max(anchor, i)]; }
        else { anchor = i; loop = null; }
        drawGrid();
        au.currentTime = bars()[loop ? loop[0] : i]; au.play().catch(function () {});
      });
      function onKey(e) {
        if (/INPUT|SELECT|TEXTAREA/.test((e.target.tagName || "")) && e.key !== "Escape") return;
        if (e.key === " ") { e.preventDefault(); if (au.paused) au.play().catch(function () {}); else au.pause(); }
        if (e.key === "Escape") { loop = null; drawGrid(); }
      }
      document.addEventListener("keydown", onKey);
      var lastBar = -2, raf = 0;
      function tick() {
        raf = requestAnimationFrame(tick);
        var t = au.currentTime;
        if (loop && !au.paused && t >= barEnd(loop[1]) - 0.02) { au.currentTime = bars()[loop[0]]; return; }
        var i = barAt(t); if (i === lastBar) return;
        var old = gridBox.querySelector(".eg-now"); if (old) old.classList.remove("eg-now");
        var c = gridBox.querySelector('.eg-bar[data-i="' + i + '"]'); if (c) c.classList.add("eg-now");
        lastBar = i;
      }
      raf = requestAnimationFrame(tick);
      au.addEventListener("loadedmetadata", function () { if (!map) drawGrid(); });
      cleanup = function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); au.pause(); au.removeAttribute("src"); };

      // the timing map, then the tune
      var gotMap = fetch(R.timingUrl(r), { cache: "no-cache" }).then(function (x) { return x.ok ? x.json() : null; }).catch(function () { return null; }).then(function (d) {
        var bm = d && (d.barMap || (Array.isArray(d.bars) ? d : null));
        if (bm && bm.bars && bm.bars.length) {
          var secs = (bm.sections || []).map(function (s) { return { name: s.name, bar: s.bar - 1, time: s.time }; }).filter(function (s) { return s.bar >= 0; });
          map = { bars: bm.bars.map(Number), sections: secs };
        }
      });
      var tid = (r.tune || [])[0];
      var gotTune = tid ? loadTunes().then(function () { tuneAbc = tuneText(tid); if (tuneAbc) tune = tuneBars(tuneAbc); }) : Promise.resolve();
      Promise.all([gotMap, gotTune]).then(function () {
        drawCtl(); drawGrid();
        if (tune && !tune.hasChords) msg.textContent = "The linked tune has no chord symbols, so guesses can't be checked here.";
        drawTune();
      });

      function drawTune() {
        tuneBox.innerHTML = "";
        if (!tuneAbc) return;
        tuneBox.appendChild(el("summary", null, "The tune's notation (check the melody)"));
        var holder = el("div", "eg-abc"); tuneBox.appendChild(holder);
        tuneBox.addEventListener("toggle", function () {
          if (!tuneBox.open || holder.firstChild || !global.ABCJS) return;
          var tk = parseKey(tune.key), rk = recKey(), shift = ((rk.tonic - tk.tonic) % 12 + 12) % 12; if (shift > 6) shift -= 12;
          holder.appendChild(el("p", "eg-dim", shift ? "Shown in the recording's key (" + esc(st.key || r.key) + "), " + (shift > 0 ? "up " : "down ") + Math.abs(shift) + " semitone" + (Math.abs(shift) > 1 ? "s" : "") + " from the collection's." : "In the collection's key."));
          var d = el("div"); holder.appendChild(d);
          ABCJS.renderAbc(d, tuneAbc, { responsive: "resize", visualTranspose: shift, add_classes: true });
        });
      }
    }
  }

  function init() {
    var css = el("style");
    css.textContent = ".eg-pick{margin:.4rem 0 .8rem}.eg-dim{opacity:.7;font-size:.85em}.eg-audio{width:100%;max-width:40rem;margin:.3rem 0}" +
      ".eg-ctl{display:flex;flex-wrap:wrap;gap:.35rem .8rem;align-items:center;margin:.4rem 0;font-size:.9em}" +
      ".eg-sec{font-weight:700;margin:.8rem 0 .2rem}.eg-row{display:grid;grid-template-columns:repeat(var(--eg-cols,4),minmax(0,1fr));border-left:2px solid var(--bs-body-color,#333)}" +
      ".eg-bar{position:relative;border-right:2px solid var(--bs-body-color,#333);border-bottom:1px solid var(--bs-border-color,#ccc);min-height:3.2rem;padding:1rem .3rem .2rem;cursor:pointer}" +
      ".eg-bar:hover{background:var(--bs-tertiary-bg,#f3f5f8)}.eg-n{position:absolute;top:.1rem;left:.3rem;font-size:.7em;opacity:.6}" +
      ".eg-g{width:100%;border:0;background:transparent;color:inherit;font-size:1.1em;font-weight:600;padding:0;outline:none}.eg-g:focus{background:var(--bs-body-bg,#fff);box-shadow:0 0 0 2px #3a7bd5}" +
      ".eg-a{display:block;font-size:.75em;opacity:.8}.eg-now{background:#fff3c4!important}.eg-inloop{box-shadow:inset 0 -4px 0 #3a7bd5}" +
      ".eg-ok{background:#d7efd9}.eg-half{background:#f8e3c4}.eg-no{background:#f6d4d4}.eg-msg{font-weight:600;min-height:1.4em}.eg-tune{margin:1rem 0}.eg-tune summary{cursor:pointer;font-weight:600}" +
      "@media (prefers-color-scheme:dark){.eg-now{background:#5a4d10!important}.eg-ok{background:#1f4a26}.eg-half{background:#5a3d10}.eg-no{background:#5a1f1f}}" +
      "@media (max-width:600px){.eg-row{grid-template-columns:repeat(2,minmax(0,1fr))}}";
    document.head.appendChild(css);
    [].forEach.call(document.querySelectorAll(".ear-grid"), mount);
  }
  global.EarGrid = { mount: mount, tuneBars: tuneBars, fn: fn, same: same, parseKey: parseKey, roman: roman };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : globalThis);
if (typeof module !== "undefined") module.exports = (typeof window !== "undefined" ? window : globalThis).EarGrid;
