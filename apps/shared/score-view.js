// score-view.js — the one page for every bundled analysed score (theory/analysed-scores/view.qmd).
//   view.html            the list of pieces: search, collection filter, key / meter / bars / analyst columns, sortable
//   view.html?id=<id>    that piece's score with its Roman numerals, drawn and played by analysed-scores.js (AnalysedScores.add)
// Data: apps/shared/data/scores/index.json (every piece, small) and one file per collection (<set>.json), fetched only when a piece
// from it is opened, then cached by the browser. Both written by scripts/when-in-rome/bundle.mjs. Bump V after rebuilding them.
(function () {
  "use strict";
  var V = "4", BASE = "/apps/shared/data/scores/", PAGE = location.pathname;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function get(f) { return fetch(BASE + f + ".json?v=" + V).then(function (r) { if (!r.ok) throw new Error(f + ": " + r.status); return r.json(); }); }
  var FIG = { "65": "⁶₅", "43": "⁴₃", "42": "⁴₂", "64": "⁶₄", "6": "⁶", "7": "⁷" };
  function pretty(t) {
    t = t.replace(/(\d)\/(\d)/g, "$1$2");   // V6/5 -> V65 (some analyses write figures with a slash)   // a RomanText token as the score writes it (V65 -> V⁶₅, viio -> vii°, F#: -> F♯:)
    if (/:$/.test(t)) return t.replace(/^([A-Ga-g])#/, "$1♯").replace(/^([A-Ga-g])-/, "$1♭").replace(/^([A-Ga-g])b/, "$1♭");
    return t.replace(/\/o/g, "ø").replace(/o(?=\d|\/|$)/g, "°").replace(/^([^/]*?)(65|43|42|64|6|7)(?=\/|$)/, function (m, a, f) { return a + FIG[f]; });
  }

  function navName(x) { return x.set === "lieder" ? x.title.replace(/^[^,]+, /, "") : x.sub; }   // songs: the title (their subs repeat the collection)
  function list(index) {
    var q = $("sv-q"), set = $("sv-set"), body = $("sv-rows"), count = $("sv-count"), sortBy = "order", dir = 1;
    var sets = []; index.forEach(function (p) { if (sets.indexOf(p.setName) < 0) sets.push(p.setName); });
    sets.forEach(function (s) { var o = el("option", null, s); o.value = s; set.appendChild(o); });
    index.forEach(function (p, i) { p.order = i; });
    var cols = { title: "title", key: "key", meter: "meter", bars: "bars", who: "who" };
    [].forEach.call(document.querySelectorAll("#sv-table th[data-sort]"), function (th) {
      th.addEventListener("click", function () { var k = th.getAttribute("data-sort"); dir = sortBy === k ? -dir : 1; sortBy = k; draw(); });
    });
    function draw() {
      var words = q.value.toLowerCase().split(/\s+/).filter(Boolean), s = set.value;
      var rows = index.filter(function (p) {
        if (s && p.setName !== s) return false;
        var hay = (p.title + " " + p.sub + " " + p.key + " " + p.who).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) >= 0; });
      });
      var k = cols[sortBy] || "order";
      rows.sort(function (a, b) { var x = a[k], y = b[k]; return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true })) * dir || a.order - b.order; });
      body.textContent = "";
      rows.forEach(function (p) {
        var tr = el("tr"), a = el("a", null, p.title); a.href = PAGE + "?id=" + encodeURIComponent(p.id);
        var t = el("td"); t.appendChild(a); t.appendChild(el("div", "sv-sub", p.sub)); tr.appendChild(t);
        [p.key, p.meter, p.bars, p.who].forEach(function (v) { tr.appendChild(el("td", null, v)); });
        body.appendChild(tr);
      });
      count.textContent = rows.length + " of " + index.length + " pieces";
      try { sessionStorage.setItem("sv-filter", JSON.stringify({ q: q.value, s: s })); } catch (e) {}
    }
    try { var f = JSON.parse(sessionStorage.getItem("sv-filter") || "null"); if (f) { q.value = f.q || ""; set.value = f.s || ""; } } catch (e) {}
    q.addEventListener("input", draw); set.addEventListener("change", draw); draw();
  }

  function piece(index, id) {
    var i = index.findIndex(function (p) { return p.id === id; }), p = index[i];
    if (!p) { $("sv-title").textContent = "No piece called “" + id + "”"; return list(index); }
    document.title = p.title + " – " + p.sub;
    $("sv-title").textContent = p.title; $("sv-sub").textContent = p.sub + " · " + p.key + " · " + p.meter;
    var nav = $("sv-nav"), sib = function (j) { var x = index[j]; return x && x.set === p.set ? x : null; };
    [[sib(i - 1), "← "], [sib(i + 1), ""]].forEach(function (s, k) {
      if (!s[0]) return; var a = el("a", "btn btn-sm btn-outline-secondary", k ? navName(s[0]) + " →" : "← " + navName(s[0])); a.href = PAGE + "?id=" + s[0].id; nav.appendChild(a);
    });
    var all = el("a", "btn btn-sm btn-outline-secondary", "All pieces"); all.href = "#all-the-pieces"; nav.appendChild(all);
    $("sv-status").textContent = "Loading the " + p.setName.toLowerCase() + "…";
    get(p.file).then(function (B) {
      var d = B[id]; $("sv-status").textContent = "";
      $("sv-who").textContent = "Analysis: " + d.who + ".";
      var host = el("div", "as-score"), src = el("script");
      host.setAttribute("data-piece", id); host.setAttribute("data-bpm", d.bpm); host.setAttribute("data-pickup", d.pickup);
      host.setAttribute("data-keys", JSON.stringify(d.keys)); host.setAttribute("data-chords", JSON.stringify(d.chords));
      src.type = "text/plain"; src.textContent = d.abc; host.appendChild(src); $("sv-score").appendChild(host);
      window.AnalysedScores.add(host);
      var extra = $("sv-extra");
      if (d.misses.length) extra.appendChild(el("p", null, "Not shown on the score (no note starts there): " +
        d.misses.map(function (m) { return "bar " + m[0] + " beat " + m[1] + ": " + m[2]; }).join("; ") + "."));
      if (d.notes.length) { extra.appendChild(el("p", "sv-h", "The analyst's notes:")); var ul = el("ul"); d.notes.forEach(function (n) { ul.appendChild(el("li", null, n)); }); extra.appendChild(ul); }
      if (d.vars.length) { extra.appendChild(el("p", "sv-h", "Other readings the analyst gives:")); var ul2 = el("ul");
        d.vars.forEach(function (v) { ul2.appendChild(el("li", null, "Bar " + v.m + ": " + v.text.split(/\s+/).map(pretty).join(" "))); }); extra.appendChild(ul2); }
      if (!extra.childNodes.length) extra.appendChild(el("p", null, "The analyst left no notes on this piece."));
    }).catch(function (e) { $("sv-status").textContent = "Could not load the score (" + e.message + ")."; });
    list(index);
  }

  function init() {
    var id = new URLSearchParams(location.search).get("id");
    // without ?id= only the list shows: the score's two sections are hidden (and left out of the "On this page" sidebar)
    if (!id) ["the-score", "notes-and-other-readings"].forEach(function (s) { var sec = $(s), toc = document.querySelector('#TOC a[href="#' + s + '"]');
      if (sec) sec.hidden = true; if (toc) toc.parentNode.hidden = true; });
    get("index").then(function (index) { if (id) piece(index, id.replace(/[^\w-]/g, "")); else list(index); })
      .catch(function (e) { $("sv-count").textContent = "Could not load the list of pieces (" + e.message + ")."; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
