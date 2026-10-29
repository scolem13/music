// rec-sync.js: a score played by its recording instead of the synth. Global RecSync.
//
// A recording "has a timing map" when Timestamp Notes has its bars: a song file (.json, barMap.bars = each bar's start in s).
// The score's bars come from abcjs's own timing (setTiming: measure starts in the order they are played, so repeats count), and
// score bar k is recording bar k + (bar1 - 1). Between two bar starts time is stretched evenly, so the lit bar is right and the
// position inside it approximate (there is no note-by-note timing).
//
// Where synced recordings come from:
//   Works (works-data.js) recordings with  timing: "<song file URL>", bar1?: recording bar of the score's bar 1 (default 1),
//                                          draft?: true (hidden from students: shown only where RecSync.teacher() is true)
//   MLT recordings (recordings.js) linked to a tune (rec.tune) with rec.timing (apps/shared/mlt/timings/<id>.json)
//
//   RecSync.teacher()                      this browser is the teacher's: once opened with ?teacher=1 (?teacher=0 clears)
//   RecSync.visible(rec)                   !rec.draft || teacher()
//   RecSync.find(kind, id) -> [{ label, url, timing, bar1, draft }]      kind "tune" | "theme" | "analysed"
//   RecSync.load(found) -> Promise<number[] bar starts (s)>
//   RecSync.sync(events, bars, { bar1, pickup }) -> { scoreBars: [{ ms, els }], toRec(ms), toScore(s), barAt(ms) }
//        events: abcjs setTiming() events (type "event" or all); pickup: the score's first bar is a pickup (not tapped)
//   RecSync.player({ url, sync, paper, onTick(ms), onStop() }) -> { play(fromMs, toMs?), pause(), playing(), audio }
//        lights the current bar (class rs-bar on its drawn notes) and scrolls it into view.
//   RecSync.mountScore(host, visualObj, kind, id, { paper }) a [recording ▾] ▶ control for any abcjs score (the Tune Library)
(function (global) {
  "use strict";
  var TKEY = "site-teacher";
  function teacher() {
    try {
      var q = new URLSearchParams(location.search).get("teacher");
      if (q === "1") localStorage.setItem(TKEY, "1"); else if (q === "0") localStorage.removeItem(TKEY);
      return localStorage.getItem(TKEY) === "1";
    } catch (e) { return false; }
  }
  function visible(r) { return !r || !r.draft || teacher(); }

  function find(kind, id) {
    var out = [];
    var W = global.Works, w = W && id != null ? W.of(kind, id) : null;
    if (w) (w.recordings || []).forEach(function (r) {
      if (!r.timing || !visible(r)) return;
      var s = W.source(r); if (s.kind !== "audio") return;
      out.push({ label: [r.performer, r.year].filter(Boolean).join(", ") || r.title || "Recording", url: s.url, timing: r.timing, bar1: +r.bar1 || 1, draft: !!r.draft });
    });
    var R = global.MLTRecordings;
    if (kind === "tune" && R && id) R.forTune(id).forEach(function (r) {
      if (!r.timing || !R.url(r)) return;
      out.push({ label: r.title, url: R.url(r), timing: R.timingUrl(r), bar1: 1 });
    });
    return out;
  }
  function load(f) {
    return fetch(f.timing, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("timing map " + r.status); return r.json(); }).then(function (d) {
      var bm = d.barMap || d; return (bm.bars || []).map(Number).filter(isFinite);
    });
  }

  function sync(events, bars, o) {
    o = o || {};
    var ev = (events || []).filter(function (e) { return e.type === "event" || e.type == null; });
    var scoreBars = [];
    ev.forEach(function (e) {
      if (e.measureStart || !scoreBars.length) scoreBars.push({ ms: e.milliseconds, els: [] });
      var b = scoreBars[scoreBars.length - 1];
      (e.elements || []).forEach(function (g) { (g || []).forEach(function (n) { if (n && b.els.indexOf(n) < 0) b.els.push(n); }); });
    });
    var first = o.pickup && scoreBars.length > 1 ? 1 : 0, off = (o.bar1 || 1) - 1;
    // pairs [score ms, recording s] at every bar both have
    var pts = [];
    for (var k = first; k < scoreBars.length; k++) { var j = k - first + off; if (j >= 0 && j < bars.length) pts.push([scoreBars[k].ms, bars[j]]); }
    if (bars.length > pts.length + off && pts.length) {                      // the recording's bar after the score's last: the end of the last bar
      var j2 = pts.length + off; if (j2 < bars.length) pts.push([pts[pts.length - 1][0] + (pts.length > 1 ? pts[pts.length - 1][0] - pts[pts.length - 2][0] : 2000), bars[j2]]);
    }
    function interp(x, a, b) {
      if (!pts.length) return x;
      if (pts.length === 1) return pts[0][b] + (x - pts[0][a]) * (a === 0 ? 0.001 : 1000);
      var i = 0; while (i < pts.length - 2 && pts[i + 1][a] <= x) i++;
      var p = pts[i], q = pts[i + 1], f = (x - p[a]) / (q[a] - p[a] || 1);
      return p[b] + f * (q[b] - p[b]);
    }
    return {
      scoreBars: scoreBars, first: first, points: pts,
      toRec: function (ms) { return interp(ms, 0, 1); },
      toScore: function (s) { return interp(s, 1, 0); },
      barAt: function (ms) { var i = -1; scoreBars.forEach(function (b, k) { if (b.ms <= ms + 1) i = k; }); return i; },
      endMs: pts.length ? pts[pts.length - 1][0] : 0
    };
  }

  function player(o) {
    var au = new Audio(); au.preload = "auto"; au.src = o.url;
    if (global.AudioTap && AudioTap.registerMedia) try { AudioTap.registerMedia(au); } catch (e) {}
    var raf = 0, lit = -1, stopAt = null, on = false;
    function light(k) {
      if (k === lit) return;
      (o.paper || document).querySelectorAll(".rs-bar").forEach(function (n) { n.classList.remove("rs-bar"); });
      lit = k; var b = o.sync.scoreBars[k]; if (!b) return;
      b.els.forEach(function (n) { if (n.classList) n.classList.add("rs-bar"); });
      var g = b.els[0]; if (g && g.getBoundingClientRect && o.scroll !== false) {
        var r = g.getBoundingClientRect(); if (r.bottom > innerHeight - 8 || r.top < 0) scrollBy({ top: r.top - 120, behavior: "smooth" });
      }
    }
    function tick() {
      if (!on) return;
      var ms = o.sync.toScore(au.currentTime);
      light(o.sync.barAt(ms));
      if (o.onTick) o.onTick(ms);
      if (stopAt != null && ms >= stopAt || au.ended || o.sync.endMs && ms > o.sync.endMs + 50) { stop(); return; }
      raf = requestAnimationFrame(tick);
    }
    function stop() { on = false; cancelAnimationFrame(raf); au.pause(); if (o.onStop) o.onStop(); }
    return {
      audio: au,
      play: function (fromMs, toMs) {
        stopAt = toMs == null ? null : toMs;
        au.currentTime = Math.max(0, o.sync.toRec(fromMs || 0));
        on = true;
        return au.play().then(function () { raf = requestAnimationFrame(tick); }, function (e) { on = false; if (o.onStop) o.onStop(e); throw e; });
      },
      pause: function () { if (on) stop(); },
      clear: function () { light(-1); },
      playing: function () { return on; }
    };
  }

  // A control for any abcjs score: [recording ▾] ▶ / ❚❚, the bar lit as it plays, a click on a note (while paused) plays from its bar.
  // host is emptied and hidden when the piece has no synced recording. Returns { destroy } or null.
  var mounted = [];
  function mountScore(host, visualObj, kind, id, opts) {
    opts = opts || {};
    mounted = mounted.filter(function (m) { if (m.host === host) { m.destroy(); return false; } return true; });
    host.innerHTML = ""; host.hidden = true;
    var found = find(kind, id); if (!found.length || !visualObj) return null;
    var events = []; try { events = visualObj.setTiming(); } catch (e) {}
    var pickup = !!(visualObj.getPickupLength && visualObj.getPickupLength() > 0);
    host.hidden = false; host.classList.add("rs-ctl");
    host.innerHTML = '<span class="rs-h">Play the recording</span> <select class="rs-pick"></select> <button type="button" class="rs-play">▶</button> <span class="rs-msg"></span>';
    var sel = host.querySelector(".rs-pick"), btn = host.querySelector(".rs-play"), msg = host.querySelector(".rs-msg");
    sel.innerHTML = found.map(function (f, i) { return '<option value="' + i + '">' + f.label.replace(/</g, "&lt;") + (f.draft ? " (draft)" : "") + "</option>"; }).join("");
    var cur = null, pos = 0, alive = true;
    function pick() {
      if (cur) { cur.player.pause(); cur.player.clear(); }
      cur = null; btn.disabled = true; msg.textContent = "";
      var f = found[+sel.value];
      load(f).then(function (bars) {
        if (!alive) return;
        var o = { url: f.url, paper: opts.paper || document, sync: sync(events, bars, { bar1: f.bar1, pickup: pickup }),
          onTick: function (ms) { pos = ms; }, onStop: function () { btn.textContent = "▶"; } };
        cur = { player: player(o), o: o }; btn.disabled = false;
      }).catch(function () { msg.textContent = "Its timing map could not be loaded."; });
    }
    sel.onchange = pick;
    btn.onclick = function () {
      if (!cur) return;
      if (cur.player.playing()) { cur.player.pause(); return; }
      if (cur.o.sync.endMs && pos >= cur.o.sync.endMs) pos = 0;
      btn.textContent = "❚❚"; cur.player.play(pos).catch(function () { btn.textContent = "▶"; msg.textContent = "The recording could not be played (log in on music.seancoleman.org)."; });
    };
    // a click on a drawn note moves the start to its bar
    var paper = opts.paper;
    function onClick(e) {
      if (!cur) return;
      var g = e.target.closest && e.target.closest(".abcjs-note,.abcjs-rest"); if (!g) return;
      var k = -1; cur.o.sync.scoreBars.forEach(function (b, i) { if (k < 0 && b.els.indexOf(g) >= 0) k = i; });
      if (k < 0) return;
      pos = cur.o.sync.scoreBars[k].ms;
      if (cur.player.playing()) cur.player.play(pos);
    }
    if (paper) paper.addEventListener("click", onClick);
    pick();
    var m = { host: host, destroy: function () { alive = false; if (cur) { cur.player.pause(); cur.player.clear(); } if (paper) paper.removeEventListener("click", onClick); } };
    mounted.push(m);
    return m;
  }

  if (typeof document !== "undefined") { var css = document.createElement("style");
  css.textContent = ".rs-bar{fill:#c0392b;color:#c0392b}.abcjs-note.rs-bar path,.abcjs-rest.rs-bar path{fill:#c0392b}" +
    ".rs-ctl{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0}.rs-h{font-weight:600;font-size:.9em}.rs-msg{font-size:.85em;opacity:.8}" +
    ".rs-draft{font-size:.75em;padding:0 .4em;border-radius:3px;background:#f5e3c8;color:#6b3d00;margin-left:.3em}";
  (document.head || document.documentElement).appendChild(css); }

  global.RecSync = { teacher: teacher, visible: visible, find: find, load: load, sync: sync, player: player, mountScore: mountScore };
})(typeof window !== "undefined" ? window : globalThis);
if (typeof module !== "undefined") module.exports = (typeof window !== "undefined" ? window : globalThis).RecSync;
