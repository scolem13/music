/* Timestamp Notes: the notation of the recording being mapped, when it has some (the Notation part, #ts-notation).
   Which tune: ?tune=<tune collection id>, else the MLT recording's first linked tune (?rec=<id>, rec.tune).
   Drawn with abcjs. Once bars are tapped (the Bar map), the bar the recording is in is lit (rec-sync.js) and a click on a note
   moves the recording to that note's bar; score bar 1 = the first tapped bar (a pickup is not tapped). Without taps it is just
   the score to read along. Needs abcjs, rec-sync.js; loads the tune collection (1.2 MB) only when there is a tune. */
(function () {
  "use strict";
  var TUNES = "/apps/tunes/tunes-object.js?v=2";

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
  function tuneText(id) {
    var o = window.tunesObject || (typeof tunesObject !== "undefined" ? tunesObject : {}), out = null;   // eslint-disable-line no-undef
    var re = new RegExp("^%%id\\s+" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "m");
    Object.keys(o).forEach(function (k) { if (!out) String(o[k]).split(/\n(?=X:)/).forEach(function (t) { if (!out && re.test(t)) out = t; }); });
    return out;
  }

  function boot() {
    var panel = document.getElementById("ts-notation"), id = tuneId();
    if (!panel) return;
    if (!id || !window.ABCJS) { panel.hidden = true; panel.classList.add("ts-none"); return; }
    var paper = panel.querySelector(".ts-nt-paper"), note = panel.querySelector(".ts-nt-note");
    loadTunes().then(function () {
      var abc = tuneText(id);
      if (!abc) { note.textContent = "The tune " + id + " is not in the tune collection."; return; }
      var vo = ABCJS.renderAbc(paper, abc, { responsive: "resize", add_classes: true })[0];
      var events = []; try { events = vo.setTiming(); } catch (e) {}
      var pickup = !!(vo.getPickupLength && vo.getPickupLength() > 0);
      var title = (/^T:(.*)$/m.exec(abc) || [])[1] || id;
      note.innerHTML = 'From the tune collection: <a href="/practice/tunes.html?tune=' + encodeURIComponent(id) + '">' + title.replace(/</g, "&lt;") + '</a>. <span class="ts-nt-how"></span>';
      var how = note.querySelector(".ts-nt-how");
      var player = document.querySelector(".btp"), map = function () { var m = document.querySelector(".btp-barmap:not(.pc-shell)"); return m && m._btpMap; };
      var sync = null, sig = "", lit = -1;
      function bars() { var m = map(); if (!m || !m.state) return []; try { return m.state().bars || []; } catch (e) { return []; } }
      function refresh() {
        var b = bars(), s = b.join(",");
        if (s === sig) return; sig = s;
        sync = b.length && window.RecSync ? RecSync.sync(events, b, { pickup: pickup }) : null;
        how.textContent = (sync ? "The lit bar follows the recording; click a note to go to its bar." : "Tap the bars (B) and the bar the recording is in lights up here.");
      }
      function light(k) {
        if (k === lit) return; lit = k;
        paper.querySelectorAll(".rs-bar").forEach(function (n) { n.classList.remove("rs-bar"); });
        var bar = sync && sync.scoreBars[k]; if (!bar) return;
        bar.els.forEach(function (n) { if (n.classList) n.classList.add("rs-bar"); });
        var g = bar.els[0], r = g && g.getBoundingClientRect && g.getBoundingClientRect(), pr = paper.getBoundingClientRect();
        if (r && (r.bottom > pr.bottom || r.top < pr.top)) paper.scrollTop += r.top - pr.top - 40;   // keep it in view inside the part
      }
      refresh();
      setInterval(function () {
        refresh();
        var api = player && player._btp; if (!sync || !api) return;
        light(sync.barAt(sync.toScore(api.time())));
      }, 150);
      paper.addEventListener("click", function (e) {
        var g = e.target.closest && e.target.closest(".abcjs-note,.abcjs-rest"); if (!g || !sync) return;
        var k = -1; sync.scoreBars.forEach(function (b, i) { if (k < 0 && b.els.indexOf(g) >= 0) k = i; });
        var api = player && player._btp; if (k >= 0 && api) api.seek(sync.toRec(sync.scoreBars[k].ms));
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
