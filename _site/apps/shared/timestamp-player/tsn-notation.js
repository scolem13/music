/* Timestamp Notes: the notation of the tune being mapped (the Notation part, #ts-notation), drawn by the full-score view
   (full-score.js, FullScore.mount with mark:true: a score to follow, not to play; the recording is the sound).
   The lit bar moves by itself: with the bars tapped (B), the bar the playhead is in is the tune's bar (the Bar map's bars; the tune's
   playing order, so repeats are taken and a recording that goes round again starts the tune over). While marking, the bar just
   tapped is lit, so the next bar to tap is the one after it. "Score bar 1 = recording bar [n]" lines them up when the tune starts
   after an intro (n counted in tapped bars; a pickup in the tune is shown before bar 1).
   Which tune: ?tune=<tune collection id>, else the MLT recording's first linked tune (?rec=<id>), else "Find a tune" (search the
   collection by title; the recording's title is tried first). The collection (1.2 MB) loads only when a tune is wanted.
   Needs abcjs, full-score.js. */
(function () {
  "use strict";
  var TUNES = "/apps/tunes/tunes-object.js?v=3";

  function tuneId() {
    var q = new URLSearchParams(location.search), t = q.get("tune");
    if (t) return t;
    var R = window.MLTRecordings, r = R && R.byId(q.get("rec") || "");
    return r && r.tune && r.tune[0] || null;
  }
  function loadTunes() {
    if (window.tunesObject || typeof tunesObject !== "undefined") return Promise.resolve();   // eslint-disable-line no-undef
    return new Promise(function (res) { var s = document.createElement("script"); s.src = TUNES; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  }
  var index = null;
  function all() {            // [{ id, title, abc }], built once
    if (index) return index;
    var o = window.tunesObject || (typeof tunesObject !== "undefined" ? tunesObject : {}); index = [];   // eslint-disable-line no-undef
    Object.keys(o).forEach(function (k) {
      String(o[k]).split(/\n(?=X:)/).forEach(function (t) {
        var id = /^%%id\s+(\S+)/m.exec(t), ti = /^T:\s*(.*)$/m.exec(t);
        if (id && ti) index.push({ id: id[1], title: ti[1].trim(), abc: t });
      });
    });
    return index;
  }
  function find(q, n) {
    var w = String(q).toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
    if (!w.length) return [];
    return all().filter(function (t) { var s = t.title.toLowerCase(); return w.every(function (x) { return s.indexOf(x) >= 0; }); }).slice(0, n || 12);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function boot() {
    var panel = document.getElementById("ts-notation");
    if (!panel) return;
    var paper = panel.querySelector(".ts-nt-paper"), note = panel.querySelector(".ts-nt-note");
    var player = document.querySelector(".btp");
    var map = function () { var m = document.querySelector(".btp-barmap:not(.pc-shell)"); return m && m._btpMap; };
    var score = null, offset = 1, timer = 0, lastJ = null;
    paper.style.maxHeight = "none"; paper.style.overflow = "visible";

    var ui = document.createElement("div"); ui.className = "ts-nt-ui";
    ui.innerHTML = '<div class="ts-nt-find"><input type="search" class="ts-nt-q" placeholder="Find a tune by title…" spellcheck="false" aria-label="Find a tune by title">' +
      '<button type="button" class="ts-nt-go">Find</button> <span class="ts-nt-hint">Tunes in the collection have notation that follows your bars.</span></div>' +
      '<ul class="ts-nt-res"></ul>' +
      '<div class="ts-nt-on" hidden><label>Score bar 1 = recording bar <input type="number" class="ts-nt-off" min="1" value="1" inputmode="numeric"></label> ' +
      '<button type="button" class="ts-nt-other">Another tune</button> <span class="ts-nt-st" aria-live="off"></span></div>';
    panel.insertBefore(ui, paper);
    var q = ui.querySelector(".ts-nt-q"), res = ui.querySelector(".ts-nt-res"), on = ui.querySelector(".ts-nt-on"), st = ui.querySelector(".ts-nt-st"), offIn = ui.querySelector(".ts-nt-off");
    var cur = ui.querySelector(".ts-nt-find");

    function bars() { var m = map(); if (!m || !m.state) return []; try { return m.state().bars || []; } catch (e) { return []; } }
    function tick() {
      var api = player && player._btp; if (!score || !api) return;
      var b = bars(), t = api.time(), i = -1;
      for (var k = 0; k < b.length && b[k] <= t + 0.02; k++) i = k;
      var j = (i + 1) - offset + (score.pickup ? 1 : 0);
      if (!b.length) { st.textContent = "Tap the bars (B) and the bar lights up here."; if (lastJ !== null) { score.clearMark(); lastJ = null; } return; }
      if (j === lastJ) return; lastJ = j;
      var n = score.nPlayed() - (score.pickup ? 1 : 0);
      if (j < 0) { score.clearMark(); st.textContent = "Before the tune (recording bar " + (i + 1) + ")."; return; }
      var jb = j - (score.pickup ? 1 : 0);
      score.showPlayed(j);
      st.textContent = jb < 0 ? "Pickup" : "Tune bar " + (jb % n + 1) + (jb >= n ? " · time round " + (Math.floor(jb / n) + 1) : "") + " · recording bar " + (i + 1);
    }
    function show(t) {
      res.innerHTML = ""; cur.hidden = true; on.hidden = false; lastJ = null;
      note.innerHTML = 'Notation from the tune collection: <a href="/practice/tunes.html?tune=' + encodeURIComponent(t.id) + '">' + esc(t.title) + "</a>. The lit bar follows your taps and the recording.";
      paper.innerHTML = "";
      score = FullScore.mount(paper, { abc: FullScore.fromTune(t.abc), id: "tsn-" + t.id, mark: true });
      clearInterval(timer); timer = setInterval(tick, 150); tick();
    }
    function search() {
      var r = find(q.value, 14);
      res.innerHTML = r.length ? r.map(function (t, i) { return '<li><button type="button" data-i="' + i + '">' + esc(t.title) + "</button></li>"; }).join("") : "<li class=\"ts-nt-none\">No tune with that title.</li>";
      res._r = r;
    }
    res.addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (b && res._r) show(res._r[+b.dataset.i]); });
    ui.querySelector(".ts-nt-go").addEventListener("click", function () { loadTunes().then(search); });
    q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); loadTunes().then(search); } e.stopPropagation(); });
    q.addEventListener("keyup", function (e) { e.stopPropagation(); });
    offIn.addEventListener("input", function () { offset = Math.max(1, +offIn.value || 1); lastJ = null; tick(); });
    offIn.addEventListener("keydown", function (e) { e.stopPropagation(); });
    ui.querySelector(".ts-nt-other").addEventListener("click", function () {
      clearInterval(timer); score = null; paper.innerHTML = ""; on.hidden = true; cur.hidden = false; note.textContent = ""; q.focus();
    });

    var id = tuneId();
    if (id) {
      panel.classList.add("has-tune");
      loadTunes().then(function () {
        var t = all().filter(function (x) { return x.id === id; })[0];
        if (t) show(t); else note.textContent = "The tune " + id + " is not in the tune collection.";
      });
    } else {
      // no tune named: the recording's own title is tried when the box is first used
      q.addEventListener("focus", function () {
        if (q.value) return;
        var a = player && player._btp, src = a && a.source && a.source(), ti = src && src.title || (document.querySelector(".btp-title") || {}).value || "";
        if (ti) q.value = String(ti).replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[_-]+/g, " ");
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
