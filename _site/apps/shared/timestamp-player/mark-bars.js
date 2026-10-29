// mark-bars.js: Mark Bars (tools/mark-bars.qmd), a phone page for tapping a recording's bars and sections. Global MarkBars.
//
// Big buttons: back 5 s, play / pause, on 5 s, BAR (a downbeat), SECTION (a section starts: a label from a short list), undo.
// The Bars sheet (pulled up from the bottom) shows every bar and section already marked: a tap on one plays from there, × takes it out.
// Nothing is downloaded: each recording's marks are kept in this browser (localStorage "mark-bars:<key>") as you go, as a
// Timestamp Notes song file ({ app: "timestamp-notes", source, stamps (sections, k: "s"), barMap: { bars, beats, sections } }),
// so Timestamp Notes opens it as it is. "Send" shares the files (the phone's share sheet: Mail, AirDrop, Files) or, where a
// browser can't share files, opens an email with them in the body. Received files go in apps/shared/mlt/timings/<rec id>.json
// (MLT) or apps/shared/works/timings/ (Works), then `node scripts/mlt-recordings.mjs`.
//
// Recording: ?rec=<MLT recording id>, or ?media=<audio url>&title=…&at=<s>, or picked on the page (MLT recordings and Works
// recordings with an audio file). Taps can be moved earlier by a set number of ms ("taps late by"), for touch-screen delay.
(function (global) {
  "use strict";
  var PFX = "mark-bars:", PREF = "mark-bars-prefs";
  var LABELS = ["Intro", "A", "B", "C", "Verse", "Chorus", "Bridge", "Head", "Solo", "Interlude", "Coda", "Ending"];

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clock(s) { s = Math.max(0, s || 0); var m = Math.floor(s / 60), x = s - m * 60; return String(m).padStart(2, "0") + ":" + (x < 10 ? "0" : "") + x.toFixed(1); }
  function mmss(s) { s = Math.floor(Math.max(0, s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // every recording that can be marked here: { key, title, url, rec?, tune?, at? }
  function sources() {
    var out = [], R = global.MLTRecordings, W = global.Works;
    if (W) Object.keys(W.all()).forEach(function (wid) {
      var w = W.get(wid);
      (w.recordings || []).forEach(function (r, i) {
        if (r.draft && !(global.RecSync && RecSync.teacher())) return;
        var s = W.source(r); if (s.kind !== "audio") return;
        out.push({ key: "works:" + wid + ":" + i, title: w.title + (r.performer ? " (" + r.performer + ")" : ""), url: s.url, at: s.start || 0, work: wid, file: wid + (r.performer ? "-" + r.performer.toLowerCase().replace(/[^a-z]+/g, "-") : "") });
      });
    });
    if (R) R.list.forEach(function (r) { out.push({ key: "rec:" + r.id, title: r.title, url: R.url(r), rec: r.id, file: r.id, timed: !!r.timing }); });
    return out;
  }
  function fromUrl(list) {
    var q = new URLSearchParams(location.search), id = q.get("rec"), media = q.get("media");
    if (id) return list.filter(function (s) { return s.rec === id; })[0] || null;
    if (media) return list.filter(function (s) { return s.url === media; })[0] || { key: "media:" + media, title: q.get("title") || "Recording", url: media, at: +q.get("at") || 0, file: (q.get("title") || "recording").toLowerCase().replace(/[^a-z0-9]+/g, "-") };
    return null;
  }

  function mount(host) {
    var list = sources(), prefs = get(PREF, { late: 0, email: "" });
    var src = null, data = null, au = new Audio(), raf = 0, undo = [];
    au.preload = "auto";
    if (global.AudioTap && AudioTap.registerMedia) try { AudioTap.registerMedia(au); } catch (e) {}

    host.innerHTML =
      '<div class="mb-top"><input class="mb-q" type="search" list="mb-list" placeholder="Choose a recording…" autocomplete="off"><datalist id="mb-list"></datalist></div>' +
      '<div class="mb-title">No recording yet</div>' +
      '<div class="mb-clock">00:00.0</div>' +
      '<div class="mb-info"><span class="mb-count">0 bars · 0 sections</span> <span class="mb-bpm"></span></div>' +
      '<div class="mb-msg" aria-live="polite"></div>' +
      '<div class="mb-transport"><button type="button" class="mb-back" aria-label="Back 5 seconds">⟲ 5</button>' +
      '<button type="button" class="mb-play" aria-label="Play">▶</button><button type="button" class="mb-fwd" aria-label="On 5 seconds">5 ⟳</button></div>' +
      '<div class="mb-marks"><button type="button" class="mb-bar">BAR</button><button type="button" class="mb-sec">SECTION</button></div>' +
      '<div class="mb-row"><button type="button" class="mb-undo">↶ Undo</button><button type="button" class="mb-open">☰ Bars</button><button type="button" class="mb-send">✉ Send</button></div>' +
      '<div class="mb-labels" hidden><div class="mb-labels-h">Which section starts here?</div><div class="mb-labels-l"></div>' +
      '<div class="mb-row"><input class="mb-other" placeholder="Other…"><button type="button" class="mb-other-ok">OK</button><button type="button" class="mb-labels-x">Cancel</button></div></div>' +
      '<div class="mb-sheet" hidden><div class="mb-sheet-h"><b>Marked so far</b><button type="button" class="mb-close" aria-label="Close">×</button></div>' +
      '<div class="mb-strip"></div><ol class="mb-l"></ol></div>' +
      '<details class="mb-more"><summary>Settings and saved recordings</summary>' +
      '<label>Taps land late by <input class="mb-late" type="number" min="0" max="400" step="10" value="' + (+prefs.late || 0) + '"> ms (moved earlier)</label>' +
      '<label>Send to <input class="mb-email" type="email" placeholder="your email" value="' + esc(prefs.email || "") + '"></label>' +
      '<div class="mb-saved"></div></details>';
    var $ = function (c) { return host.querySelector("." + c); };
    host.querySelector("#mb-list").innerHTML = list.map(function (s) { return '<option value="' + esc(s.title + " — " + s.key) + '">'; }).join("");

    function say(t) { $("mb-msg").textContent = t || ""; }
    function key() { return src ? PFX + src.key : null; }
    function blank() {
      return { app: "timestamp-notes", version: 1, title: src.title, source: src.rec ? { rec: src.rec, title: src.title } : { media: src.url, title: src.title },
        stamps: [], barMap: { beatsPerBar: 4, bars: [], beats: [], sections: [] }, markedOn: "phone" };
    }
    function save() {
      if (!src) return;
      data.saved = new Date().toISOString();
      var b = data.barMap; b.bars.sort(function (x, y) { return x - y; }); b.beats = b.bars.map(function () { return b.beatsPerBar; });
      data.stamps.sort(function (x, y) { return x.s - y.s; });
      b.sections = data.stamps.map(function (s) { var i = barAt(s.s); return { name: s.n, bar: i + 1, time: s.s }; }).filter(function (x) { return x.bar > 0; });
      if (!put(key(), data)) say("Could not save in this browser (private mode?). Send it before closing.");
      var idx = get(PFX + "index", {}); idx[src.key] = { title: src.title, saved: data.saved, file: src.file, bars: b.bars.length, sent: (idx[src.key] || {}).sent };
      put(PFX + "index", idx);
      draw();
    }
    function barAt(t) { var b = data.barMap.bars, i = -1; for (var k = 0; k < b.length; k++) if (b[k] <= t + 0.05) i = k; return i; }
    function now() { return Math.max(0, au.currentTime - (+prefs.late || 0) / 1000); }

    function open(s) {
      au.pause(); src = s; undo = [];
      data = get(key(), null) || blank();
      $("mb-title").textContent = s.title;
      if (!s.url) { say("The recordings are not online yet."); return; }
      au.src = s.url;
      au.addEventListener("loadedmetadata", function once() { au.removeEventListener("loadedmetadata", once); var st = data.barMap.bars.length ? 0 : s.at || 0; if (st) au.currentTime = st; });
      $("mb-q").value = "";
      say(data.barMap.bars.length ? "Carrying on: " + data.barMap.bars.length + " bars already marked." : s.timed ? "This one already has a timing map on the site; marks here make a new one." : "Press ▶, then BAR on every downbeat.");
      var u = new URL(location.href); u.search = s.rec ? "?rec=" + encodeURIComponent(s.rec) : "?media=" + encodeURIComponent(s.url) + "&title=" + encodeURIComponent(s.title) + (s.at ? "&at=" + s.at : "");
      history.replaceState(null, "", u);
      draw();
    }
    function snapshot() { undo.push(JSON.stringify(data)); if (undo.length > 200) undo.shift(); }

    function draw() {
      if (!data) return;
      var b = data.barMap.bars;
      $("mb-count").textContent = b.length + " bar" + (b.length === 1 ? "" : "s") + " · " + data.stamps.length + " section" + (data.stamps.length === 1 ? "" : "s");
      var n = Math.min(b.length, 8); $("mb-bpm").textContent = n >= 3 ? "≈ " + Math.round(60 * (n - 1) * data.barMap.beatsPerBar / (b[b.length - 1] - b[b.length - n])) + " bpm (in 4)" : "";
      if (!$("mb-sheet").hidden) drawSheet();
      drawSaved();
    }
    function drawSheet() {
      var b = data.barMap.bars, items = b.map(function (t, i) { return { t: t, kind: "bar", i: i }; })
        .concat(data.stamps.map(function (s, i) { return { t: s.s, kind: "sec", i: i, n: s.n }; })).sort(function (x, y) { return x.t - y.t || (x.kind === "sec" ? -1 : 1); });
      var d = au.duration > 0 && isFinite(au.duration) ? au.duration : (b[b.length - 1] || 1) + 5;
      $("mb-strip").innerHTML = '<div class="mb-strip-in">' + b.map(function (t) { return '<i style="left:' + (t / d * 100) + '%"></i>'; }).join("") +
        data.stamps.map(function (s) { return '<b style="left:' + (s.s / d * 100) + '%" title="' + esc(s.n) + '"></b>'; }).join("") + '<u style="left:' + (au.currentTime / d * 100) + '%"></u></div>';
      var cur = barAt(au.currentTime);
      $("mb-l").innerHTML = items.length ? items.map(function (x) {
        var len = x.kind === "bar" && x.i + 1 < b.length ? (b[x.i + 1] - x.t).toFixed(2) + " s" : "";
        return '<li class="' + (x.kind === "sec" ? "mb-li-sec" : "") + (x.kind === "bar" && x.i === cur ? " mb-li-now" : "") + '" data-k="' + x.kind + '" data-i="' + x.i + '">' +
          '<button type="button" class="mb-go">' + (x.kind === "sec" ? "§ " + esc(x.n) : "Bar " + (x.i + 1)) + ' <span>' + clock(x.t) + "</span> <em>" + len + "</em></button>" +
          '<button type="button" class="mb-del" aria-label="Take it out">×</button></li>';
      }).join("") : '<li class="mb-empty">Nothing marked yet.</li>';
      var nowLi = $("mb-l").querySelector(".mb-li-now"); if (nowLi && !$("mb-l").__touched) nowLi.scrollIntoView({ block: "nearest" });
    }
    function drawSaved() {
      var idx = get(PFX + "index", {}), ks = Object.keys(idx).sort(function (a, b) { return String(idx[b].saved).localeCompare(String(idx[a].saved)); });
      $("mb-saved").innerHTML = ks.length ? "<p><b>Kept in this browser</b> (tap to open):</p><ul>" + ks.map(function (k) {
        var x = idx[k]; return '<li><button type="button" class="mb-saved-o" data-k="' + esc(k) + '">' + esc(x.title) + "</button> " + x.bars + " bars · " + esc(String(x.saved || "").slice(0, 16).replace("T", " ")) +
          (x.sent ? " · sent" : "") + ' <button type="button" class="mb-saved-x" data-k="' + esc(k) + '" aria-label="Forget">×</button></li>';
      }).join("") + '</ul><button type="button" class="mb-send-all">✉ Send all of them</button>' : "<p>Nothing kept yet.</p>";
    }

    // ---- buttons ----
    function playPause() { if (!src) { say("Choose a recording first."); return; } if (au.paused) au.play().catch(function () { say("It could not play (log in on music.seancoleman.org)."); }); else au.pause(); }
    au.addEventListener("play", function () { $("mb-play").textContent = "❚❚"; $("mb-play").setAttribute("aria-label", "Pause"); tick(); });
    au.addEventListener("pause", function () { $("mb-play").textContent = "▶"; $("mb-play").setAttribute("aria-label", "Play"); cancelAnimationFrame(raf); showClock(); });
    function showClock() { $("mb-clock").textContent = clock(au.currentTime); }
    var lastSheet = 0;
    function tick() { showClock(); if (!$("mb-sheet").hidden && performance.now() - lastSheet > 500) { lastSheet = performance.now(); drawSheet(); } raf = requestAnimationFrame(tick); }
    function jump(d) { if (!src) return; au.currentTime = Math.max(0, au.currentTime + d); showClock(); if (!$("mb-sheet").hidden) drawSheet(); }
    function markBar() {
      if (!src) { say("Choose a recording first."); return; }
      var t = Math.round(now() * 1000) / 1000, b = data.barMap.bars;
      snapshot();
      var near = b.findIndex(function (x) { return Math.abs(x - t) < 0.25; });
      if (near >= 0) b[near] = t; else b.push(t);          // the same downbeat tapped again (after going back) replaces it
      save(); flash("mb-bar"); say("Bar " + (barAt(t) + 1) + " at " + clock(t));
      if (navigator.vibrate) navigator.vibrate(15);
    }
    var pendingT = null;
    function markSection() {
      if (!src) { say("Choose a recording first."); return; }
      pendingT = Math.round(now() * 1000) / 1000;
      var used = data.stamps.map(function (s) { return s.n.replace(/\s+\d+$/, ""); });
      var labels = LABELS.slice(); used.forEach(function (u) { if (labels.indexOf(u) < 0) labels.unshift(u); });
      $("mb-labels-l").innerHTML = labels.map(function (l) { return '<button type="button" data-l="' + esc(l) + '">' + esc(l) + "</button>"; }).join("");
      $("mb-labels").hidden = false; flash("mb-sec");
    }
    function addSection(label) {
      if (pendingT == null) return;
      label = String(label || "").trim(); if (!label) return;
      var same = data.stamps.filter(function (s) { return s.n.replace(/\s+\d+$/, "") === label; }).length;
      var name = same ? label + " " + (same + 1) : label;
      snapshot();
      data.stamps.push({ t: mmss(pendingT), s: pendingT, n: name, k: "s", b: name });
      pendingT = null; $("mb-labels").hidden = true; $("mb-other").value = "";
      save(); say("§ " + name + " at " + clock(data.stamps[data.stamps.length - 1].s));
    }
    function doUndo() { var u = undo.pop(); if (!u) { say("Nothing to undo."); return; } data = JSON.parse(u); save(); say("Undone."); }
    function flash(c) { var b = $(c); b.classList.add("mb-hit"); setTimeout(function () { b.classList.remove("mb-hit"); }, 120); }

    // ---- sending: the share sheet with files, else an email ----
    function fileFor(k) { var idx = get(PFX + "index", {}), x = idx[k] || {}; return { name: (x.file || "marks") + ".json", text: JSON.stringify(get(PFX + k, null), null, 1) + "\n", title: x.title }; }
    function send(keys) {
      keys = keys.filter(function (k) { return get(PFX + k, null); });
      if (!keys.length) { say("Nothing to send yet."); return; }
      var files = keys.map(fileFor), done = function () { var idx = get(PFX + "index", {}); keys.forEach(function (k) { if (idx[k]) idx[k].sent = new Date().toISOString(); }); put(PFX + "index", idx); drawSaved(); };
      var subject = "Bar marks: " + (files.length === 1 ? files[0].title : files.length + " recordings");
      var asFiles = files.map(function (f) { try { return new File([f.text], f.name, { type: "application/json" }); } catch (e) { return null; } }).filter(Boolean);
      if (navigator.canShare && asFiles.length === files.length && navigator.canShare({ files: asFiles })) {
        navigator.share({ files: asFiles, title: subject, text: subject + ". Save each file as apps/shared/mlt/timings/<name> (or works/timings) and open it in Timestamp Notes." })
          .then(function () { done(); say("Sent."); }, function (e) { if (e && e.name !== "AbortError") mail(); });
        return;
      }
      mail();
      function mail() {
        var body = files.map(function (f) { return "=== " + f.name + " ===\n" + f.text; }).join("\n");
        var to = ($("mb-email").value || "").trim();
        var href = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        if (href.length > 60000) say("That is a lot for one email: send fewer at a time.");
        location.href = href; done();
      }
    }

    // ---- wiring ----
    $("mb-play").onclick = playPause; $("mb-back").onclick = function () { jump(-5); }; $("mb-fwd").onclick = function () { jump(5); };
    $("mb-bar").addEventListener("pointerdown", function (e) { e.preventDefault(); markBar(); });   // on touch, not on release: tighter timing
    $("mb-sec").onclick = markSection; $("mb-undo").onclick = doUndo;
    $("mb-labels-l").onclick = function (e) { var b = e.target.closest("button"); if (b) addSection(b.dataset.l); };
    $("mb-other-ok").onclick = function () { addSection($("mb-other").value); };
    $("mb-labels-x").onclick = function () { pendingT = null; $("mb-labels").hidden = true; };
    $("mb-open").onclick = function () { $("mb-sheet").hidden = !$("mb-sheet").hidden; if (!$("mb-sheet").hidden && data) { $("mb-l").__touched = false; drawSheet(); } };
    $("mb-close").onclick = function () { $("mb-sheet").hidden = true; };
    $("mb-l").addEventListener("touchstart", function () { $("mb-l").__touched = true; }, { passive: true });
    $("mb-l").onclick = function (e) {
      var li = e.target.closest("li[data-k]"); if (!li) return;
      var i = +li.dataset.i, sec = li.dataset.k === "sec";
      if (e.target.closest(".mb-del")) { snapshot(); if (sec) data.stamps.splice(i, 1); else data.barMap.bars.splice(i, 1); save(); say("Taken out (Undo brings it back)."); return; }
      au.currentTime = sec ? data.stamps[i].s : data.barMap.bars[i]; showClock(); drawSheet();
      if (au.paused) au.play().catch(function () {});
    };
    $("mb-send").onclick = function () { if (src) send([src.key]); else say("Choose a recording first."); };
    host.addEventListener("click", function (e) {
      var o = e.target.closest(".mb-saved-o"), x = e.target.closest(".mb-saved-x"), all = e.target.closest(".mb-send-all");
      if (o) { var s = list.filter(function (z) { return z.key === o.dataset.k; })[0]; if (s) open(s); }
      if (x && confirm("Forget these marks? (Send them first if you want them.)")) { try { localStorage.removeItem(PFX + x.dataset.k); } catch (e2) {} var idx = get(PFX + "index", {}); delete idx[x.dataset.k]; put(PFX + "index", idx); drawSaved(); }
      if (all) send(Object.keys(get(PFX + "index", {})));
    });
    $("mb-late").onchange = function () { prefs.late = +this.value || 0; put(PREF, prefs); };
    $("mb-email").onchange = function () { prefs.email = this.value.trim(); put(PREF, prefs); };
    $("mb-q").onchange = function () { var m = / — (\S+)$/.exec(this.value), s = m && list.filter(function (z) { return z.key === m[1]; })[0]; if (s) open(s); };
    // a Bluetooth / keyboard: Space play, B bar, S section, arrows 5 s, u undo
    document.addEventListener("keydown", function (e) {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
      var k = e.key;
      if (k === " ") { e.preventDefault(); playPause(); } else if (k === "b" || k === "B") markBar(); else if (k === "s" || k === "S") markSection();
      else if (k === "ArrowLeft") jump(-5); else if (k === "ArrowRight") jump(5); else if (k === "u") doUndo();
    });
    window.addEventListener("pagehide", function () { if (src) save(); });

    var first = fromUrl(list); if (first) open(first); else drawSaved();
    return { open: open, data: function () { return data; }, audio: au };
  }

  global.MarkBars = { mount: mount };
  function init() { [].forEach.call(document.querySelectorAll(".mark-bars"), function (h) { h.__mb = mount(h); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
