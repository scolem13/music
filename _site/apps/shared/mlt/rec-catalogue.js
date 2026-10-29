// rec-catalogue.js: the recordings catalogue page (mlt/recordings.qmd). Global RecCatalogue.
//
// Every MLT / JRI recording (recordings.js) in one filterable list: collection, kind (song, accompaniment, patterns,
// instructions ...), tonality, meter, key, the tunes in the tune collection it goes with, and whether it has a timing map.
// Values read off titles or off the linked tune are marked "?" (rec.guess) until checked.
//
// Editing (teacher): change a field, or ✓ to confirm a row as it stands. Edits are kept in this browser (localStorage
// "mlt-rec-meta-edits") on top of apps/shared/mlt/recordings-meta.json; "Download recordings-meta.json" writes the merged file.
// Put it in apps/shared/mlt/ and run `node scripts/mlt-recordings.mjs`: the facts go into recordings.js and the edits here
// can be cleared.
//
// Each row links to Timestamp Notes (?rec=<id>: make or open its timing map, saved as apps/shared/mlt/timings/<id>.json)
// and the Chord Grid by Ear (practice/ear-grid.html?rec=<id>).
//
// Page: <div class="rec-cat"></div>, after recordings.js.
(function (global) {
  "use strict";
  var EDITS = "mlt-rec-meta-edits", META_URL = "/apps/shared/mlt/recordings-meta.json", TUNES = "/apps/tunes/tunes-object.js?v=1";
  var TONAL = ["major", "minor", "harmonic minor", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian", "multitonal"];
  var METER = ["duple", "triple", "unusual", "combined", "multimetric"];
  var FIELDS = ["kind", "tonality", "meter", "key", "tune", "note"];
  var PAGE = 150;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mmss(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function loadEdits() { try { return JSON.parse(localStorage.getItem(EDITS) || "{}") || {}; } catch (e) { return {}; } }
  function saveEdits(e) { try { localStorage.setItem(EDITS, JSON.stringify(e)); } catch (x) {} }

  var tuneIds = null;
  function loadTunes() {
    if (tuneIds) return Promise.resolve(tuneIds);
    return new Promise(function (res) {
      function read() {
        var o = global.tunesObject || (typeof tunesObject !== "undefined" ? tunesObject : null), out = {};   // eslint-disable-line no-undef
        if (o) Object.keys(o).forEach(function (k) { String(o[k]).split(/\n(?=X:)/).forEach(function (t) { var id = /^%%id\s+(\S+)/m.exec(t), T = /^T:(.*)$/m.exec(t); if (id) out[id[1]] = T ? T[1].trim() : id[1]; }); });
        tuneIds = out; res(out);
      }
      if (global.tunesObject || typeof tunesObject !== "undefined") return read();   // eslint-disable-line no-undef
      var s = document.createElement("script"); s.src = TUNES; s.onload = read; s.onerror = function () { tuneIds = {}; res(tuneIds); }; document.head.appendChild(s);
    });
  }

  function mount(host) {
    var R = global.MLTRecordings; if (!R) { host.textContent = "recordings.js is missing on this page."; return; }
    var base = {}, edits = loadEdits(), shown = PAGE;
    // what a row shows: recordings.js, then the edits made here
    function cur(r) {
      var e = edits[r.id] || {}, o = {};
      FIELDS.forEach(function (f) { o[f] = e[f] !== undefined ? e[f] : r[f]; });
      o.guess = (r.guess || []).filter(function (f) { return !(r.id in edits) && !(base[r.id] && base[r.id][f]); });
      o.edited = r.id in edits;
      return o;
    }
    var colOpts = R.collections.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.title.replace(/^Jump Right In: /, "JRI ")) + " (" + c.count + ")</option>"; }).join("");
    function opts(list, labels) { return list.map(function (k) { return '<option value="' + esc(k) + '">' + esc(labels ? labels[k] : k) + "</option>"; }).join(""); }
    host.innerHTML =
      '<div class="rc-ctl">' +
      '<label>Collection <select class="rc-f-col"><option value="">All</option>' + colOpts + "</select></label>" +
      '<label>Kind <select class="rc-f-kind"><option value="">All</option><option value="-">(not set)</option>' + opts(Object.keys(R.KINDS), R.KINDS) + "</select></label>" +
      '<label>Tonality <select class="rc-f-ton"><option value="">All</option><option value="-">(not set)</option>' + opts(TONAL) + "</select></label>" +
      '<label>Meter <select class="rc-f-met"><option value="">All</option><option value="-">(not set)</option>' + opts(METER) + "</select></label>" +
      '<label>Show <select class="rc-f-show"><option value="">everything</option><option value="check">needs checking</option><option value="tune">linked to a tune</option><option value="notune">no tune linked</option><option value="timing">has a timing map</option><option value="edited">edited here</option></select></label>' +
      '<label>Search <input type="search" class="rc-f-q" placeholder="title, tune, key…"></label>' +
      "</div>" +
      '<div class="rc-ctl rc-t"><span class="rc-count"></span> <button type="button" class="rc-dl">Download recordings-meta.json</button> <button type="button" class="rc-copy">Copy it</button> <button type="button" class="rc-clear">Clear edits</button> <span class="rc-msg"></span></div>' +
      '<datalist id="rc-tunes"></datalist><div class="rc-list"></div><button type="button" class="rc-more" hidden>Show more</button>';
    var $ = function (c) { return host.querySelector("." + c); };

    function matches(r) {
      var c = cur(r), q = $("rc-f-q").value.toLowerCase().trim(), show = $("rc-f-show").value;
      function f(sel, v) { var x = $(sel).value; return !x || (x === "-" ? !v : v === x); }
      if ($("rc-f-col").value && r.col !== $("rc-f-col").value) return false;
      if (!f("rc-f-kind", c.kind) || !f("rc-f-ton", c.tonality) || !f("rc-f-met", c.meter)) return false;
      if (show === "check" && c.kind && c.tonality && c.meter && !c.guess.length && !(c.kind === "song" && !(c.tune || []).length)) return false;
      if (show === "tune" && !(c.tune || []).length) return false;
      if (show === "notune" && (c.tune || []).length) return false;
      if (show === "timing" && !r.timing) return false;
      if (show === "edited" && !c.edited) return false;
      if (q && (r.title + " " + r.id + " " + (c.tune || []).join(" ") + " " + (c.key || "") + " " + (c.note || "")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }
    function sel(cls, list, v, labels, guess) {
      return '<select class="' + cls + (guess ? " rc-guess" : "") + '" title="' + (guess ? "read off the linked tune: not checked" : "") + '"><option value=""></option>' +
        list.map(function (k) { return '<option value="' + esc(k) + '"' + (k === v ? " selected" : "") + ">" + esc(labels ? labels[k] : k) + (guess && k === v ? " ?" : "") + "</option>"; }).join("") + "</select>";
    }
    function row(r) {
      var c = cur(r), col = R.collections.filter(function (x) { return x.id === r.col; })[0] || {};
      var tr = el("div", "rc-row" + (c.edited ? " rc-edited" : ""));
      var tunes = (c.tune || []).map(function (t) { return '<a href="/practice/tunes.html?tune=' + encodeURIComponent(t) + '">' + esc(t) + "</a>"; }).join(", ");
      tr.innerHTML =
        '<div class="rc-h"><button type="button" class="rc-play" title="Play">▶</button> <b>' + esc(r.title) + '</b> <span class="rc-dim">' +
        esc(col.title ? col.title.replace(/^Jump Right In: /, "JRI ") : r.col) + " · " + (r.disc > 1 ? "disc " + r.disc + ", " : "") + "track " + r.track + (r.dur ? " · " + mmss(r.dur) : "") + "</span>" +
        ' <span class="rc-bars' + (r.timing ? " on" : "") + '">' + (r.timing ? "bars marked" : "bars not marked") + "</span>" +
        ' <a class="rc-lnk" href="/tools/timestamp-notes.html?rec=' + encodeURIComponent(r.id) + ((c.tune || []).length ? "&tune=" + encodeURIComponent(c.tune[0]) : "") + '" title="Open it in Timestamp Notes (with its bars when marked, and the notation when linked to a tune)">⏱ Timestamp Notes</a>' +
        ' <a class="rc-lnk" href="/tools/mark-bars.html?rec=' + encodeURIComponent(r.id) + '" title="Mark its bars on a phone">📱 mark bars</a>' +
        ' <a class="rc-lnk" href="/practice/ear-grid.html?rec=' + encodeURIComponent(r.id) + '" title="A blank chord grid over the recording">▦ grid</a></div>' +
        '<div class="rc-fields rc-t">' + sel("rc-kind", Object.keys(R.KINDS), c.kind, R.KINDS, c.guess.indexOf("kind") >= 0) +
        sel("rc-ton", TONAL, c.tonality, null, c.guess.indexOf("tonality") >= 0) + sel("rc-met", METER, c.meter, null, c.guess.indexOf("meter") >= 0) +
        '<input class="rc-key" size="3" placeholder="key" value="' + esc(c.key || "") + '">' +
        '<input class="rc-tune" list="rc-tunes" placeholder="tune ids, comma between" value="' + esc((c.tune || []).join(", ")) + '">' +
        '<input class="rc-note" placeholder="note" value="' + esc(c.note || "") + '">' +
        '<button type="button" class="rc-ok" title="Confirm this row as it stands">✓</button></div>' +
        (tunes ? '<div class="rc-dim">Tune: ' + tunes + (r.tuneChecked || c.edited ? "" : " <i>(matched by title)</i>") + "</div>" : "");
      tr.querySelector(".rc-play").onclick = function () {
        var old = tr.querySelector("audio"); if (old) { old.remove(); return; }
        var url = R.url(r); if (!url) { this.title = "The recordings are not online yet"; return; }
        [].forEach.call(host.querySelectorAll("audio"), function (a) { a.remove(); });
        var a = el("audio"); a.controls = true; a.autoplay = true; a.src = url; tr.appendChild(a);
      };
      function commit() {
        var e = {};
        e.kind = tr.querySelector(".rc-kind").value || undefined;
        e.tonality = tr.querySelector(".rc-ton").value || undefined;
        e.meter = tr.querySelector(".rc-met").value || undefined;
        e.key = tr.querySelector(".rc-key").value.trim() || undefined;
        var t = tr.querySelector(".rc-tune").value.split(/[\s,]+/).filter(Boolean);
        e.tune = t;                                                          // [] = no tune (unlinks a wrong title match)
        e.note = tr.querySelector(".rc-note").value.trim() || undefined;
        edits[r.id] = e; saveEdits(edits);
        tr.classList.add("rc-edited");
        [].forEach.call(tr.querySelectorAll(".rc-guess"), function (s) { s.classList.remove("rc-guess"); });
        count();
      }
      [].forEach.call(tr.querySelectorAll("select,input"), function (x) { x.onchange = commit; });
      tr.querySelector(".rc-tune").onfocus = function () { fillTunes(); };
      tr.querySelector(".rc-ok").onclick = commit;
      return tr;
    }
    var filled = false;
    function fillTunes() {
      if (filled) return; filled = true;
      loadTunes().then(function (ids) { $("rc-tunes").innerHTML = Object.keys(ids).map(function (id) { return '<option value="' + esc(id) + '">' + esc(ids[id]) + "</option>"; }).join(""); });
    }
    var list = [];
    function count() { $("rc-count").textContent = list.length.toLocaleString() + " of " + R.list.length.toLocaleString() + " recordings · " + Object.keys(edits).length + " edited here (not saved to the site until downloaded)"; }
    function draw(keep) {
      if (!keep) shown = PAGE;
      list = R.list.filter(matches);
      var box = $("rc-list"); box.innerHTML = "";
      list.slice(0, shown).forEach(function (r) { box.appendChild(row(r)); });
      $("rc-more").hidden = list.length <= shown;
      count();
    }
    $("rc-more").onclick = function () { shown += PAGE; draw(true); };
    [].forEach.call(host.querySelectorAll(".rc-ctl select,.rc-ctl input"), function (x) { x.oninput = x.onchange = function () { draw(); }; });

    function merged() {
      var out = JSON.parse(JSON.stringify(base));
      Object.keys(edits).forEach(function (id) {
        var e = edits[id], o = out[id] = Object.assign({}, out[id] || {});
        FIELDS.forEach(function (f) { if (e[f] === undefined) delete o[f]; else o[f] = e[f]; });
      });
      var sorted = {}; Object.keys(out).sort().forEach(function (k) { sorted[k] = out[k]; });
      return JSON.stringify(sorted, null, 1) + "\n";
    }
    function say(t) { $("rc-msg").textContent = t; }
    $("rc-dl").onclick = function () {
      var a = el("a"); a.href = URL.createObjectURL(new Blob([merged()], { type: "application/json" })); a.download = "recordings-meta.json";
      document.body.appendChild(a); a.click(); a.remove();
      say("Put it in apps/shared/mlt/ and run node scripts/mlt-recordings.mjs.");
    };
    $("rc-copy").onclick = function () { navigator.clipboard.writeText(merged()).then(function () { say("Copied."); }, function () { say("Could not copy."); }); };
    $("rc-clear").onclick = function () { if (confirm("Forget the edits kept in this browser?")) { edits = {}; saveEdits(edits); draw(); } };

    fetch(META_URL, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
      .then(function (m) { base = m || {}; draw(); });
    var want = new URLSearchParams(location.search).get("find"); if (want) $("rc-f-q").value = want;
  }

  var CSS = ".rc-ctl{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;margin:.4rem 0}.rc-ctl label{font-size:.9em}" +
    ".rc-row{border-bottom:1px solid var(--bs-border-color,#ddd);padding:.4rem 0}.rc-edited{border-left:3px solid #3a7bd5;padding-left:.5rem}" +
    ".rc-dim{opacity:.7;font-size:.85em}.rc-lnk{font-size:.85em;margin-left:.4em;white-space:nowrap}" +
    ".rc-play{border:1px solid var(--bs-border-color,#ccc);background:none;color:inherit;border-radius:4px;width:1.9rem;padding:0}" +
    ".rc-fields{display:flex;flex-wrap:wrap;gap:.3rem;margin:.25rem 0}.rc-fields select,.rc-fields input{font-size:.85em}.rc-tune{min-width:14rem}.rc-note{min-width:10rem;flex:1}" +
    ".rc-bars{font-size:.75em;padding:0 .4em;border-radius:3px;background:var(--bs-secondary-bg,#eee);opacity:.8;margin-left:.3em}.rc-bars.on{background:#d7efd9;color:#1d5426;opacity:1}" +
    ".rc-guess{font-style:italic;border-style:dashed}.rc-msg{font-weight:600}.rc-row audio{display:block;width:100%;max-width:28rem;height:2rem;margin-top:.2rem}" +
    "body.mlt-student .rc-t{display:none}";
  function init() {
    var st = el("style"); st.textContent = CSS; document.head.appendChild(st);
    [].forEach.call(document.querySelectorAll(".rec-cat"), mount);
  }
  global.RecCatalogue = { mount: mount };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
