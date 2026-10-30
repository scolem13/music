// harmony-stats.js — draws theory/analysed-scores/harmony-stats.qmd from apps/shared/data/rn-stats.json (scripts/when-in-rome/stats.mjs).
// Every chart is one hue (blue, the site palette's sequential ramp) with its numbers written on it, so nothing is read from colour
// alone; each bar and cell also has a hover / focus tooltip. One repertoire picker (#hs-group) drives the per-style sections.
(function () {
  "use strict";
  var V = "1", $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var KINDS = [["applied-V", "Applied V (V/x)", "ch. 17"], ["applied-viio", "Applied vii° (vii°/x)", "ch. 18"], ["mixture", "Mode mixture (in major)", "ch. 19"],
    ["neapolitan", "Neapolitan (N⁶, ♭II)", "ch. 20"], ["aug6", "Augmented sixth (It, Fr, Ger)", "ch. 21"], ["cad64", "Cad. ⁶₄", "ch. 16"]];
  var CH = { "applied-V": "../secondary-dominants.html", "applied-viio": "../secondary-diminished.html", mixture: "../mode-mixture.html",
    neapolitan: "../neapolitan.html", aug6: "../augmented-sixths.html", cad64: "../figured-bass.html#the-cadential-six-four-chord" };
  var FIG = { "65": "⁶₅", "43": "⁴₃", "42": "⁴₂", "64": "⁶₄", "6": "⁶", "7": "⁷", "2": "⁴₂" };
  function pretty(c) { return c.replace(/^Cad(64)?$/, "Cad⁶₄").replace(/o(?=7|$|\/)/, "°").replace(/^(#|b)/, function (a) { return a === "#" ? "♯" : "♭"; }).replace(/(\d+)(?=\/|$)/, function (f) { return FIG[f] || f; }); }

  // ---- tooltip: one for the page, shown on hover and on keyboard focus of any [data-tip]
  var tip = el("div", "hs-tip"); tip.setAttribute("role", "tooltip"); tip.hidden = true;
  function showTip(t, e) { var s = t.getAttribute("data-tip").split("|"); tip.textContent = ""; tip.appendChild(el("strong", null, s[0])); if (s[1]) tip.appendChild(el("div", null, s[1]));
    var r = t.getBoundingClientRect(); tip.hidden = false; tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + window.scrollX) + "px"; tip.style.top = (r.top + window.scrollY - tip.offsetHeight - 6) + "px"; }
  function wireTips(root) { root.querySelectorAll("[data-tip]").forEach(function (t) { t.tabIndex = 0;
    t.addEventListener("pointerenter", function () { showTip(t); }); t.addEventListener("focus", function () { showTip(t); });
    t.addEventListener("pointerleave", function () { tip.hidden = true; }); t.addEventListener("blur", function () { tip.hidden = true; }); }); }

  // horizontal bars: rows [[label, value]], max for the scale, unit text
  function bars(rows, max, unit, tipOf) {
    var box = el("div", "hs-bars");
    rows.forEach(function (r) {
      var row = el("div", "hs-row"), lab = el("span", "hs-lab", r[0]), track = el("span", "hs-track"), bar = el("span", "hs-bar"), val = el("span", "hs-val", r[1] + unit);
      bar.style.width = Math.max(0.5, 100 * r[1] / max) + "%"; track.appendChild(bar);
      row.setAttribute("data-tip", r[1] + unit + "|" + (tipOf ? tipOf(r) : r[0]));
      row.appendChild(lab); row.appendChild(track); row.appendChild(val); box.appendChild(row);
    });
    return box;
  }
  // a cell's shade on the sequential ramp (100 -> 650), by value / max
  var RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];
  function shade(v, max) { var i = Math.min(RAMP.length - 1, Math.round((RAMP.length - 1) * Math.sqrt(v / max))); return { bg: RAMP[i], ink: i >= 6 ? "#fff" : "#1a1a1a" }; }

  function heat(S) {
    var t = el("table", "hs-heat table table-sm"), hr = el("tr"); hr.appendChild(el("th", null, "Repertoire"));
    KINDS.forEach(function (k) { var th = el("th"), a = el("a", null, k[1]); a.href = CH[k[0]]; th.appendChild(a); th.appendChild(el("div", "hs-ch", k[2])); hr.appendChild(th); });
    var th = el("thead"); th.appendChild(hr); t.appendChild(th); var tb = el("tbody");
    var names = Object.keys(S.groups), max = {};
    KINDS.forEach(function (k) { max[k[0]] = Math.max.apply(null, names.map(function (n) { return S.groups[n].kinds[k[0]]; })); });
    names.forEach(function (n) {
      var g = S.groups[n], tr = el("tr"), h = el("th", null, n); h.appendChild(el("div", "hs-ch", g.pieces + " pieces")); tr.appendChild(h);
      KINDS.forEach(function (k) { var v = g.kinds[k[0]], td = el("td", "hs-cell", v.toFixed(v < 1 ? 2 : 1)), c = shade(v, max[k[0]]);
        td.style.background = c.bg; td.style.color = c.ink; td.setAttribute("data-tip", v + " per 100 chords|" + k[1] + " · " + n); tr.appendChild(td); });
      tb.appendChild(tr);
    });
    t.appendChild(tb); return t;
  }

  function drawGroup(S, n) {
    var g = S.groups[n];
    $("hs-group-facts").textContent = g.pieces + " pieces, " + g.chords.toLocaleString() + " chord labels, " + g.bars.toLocaleString() + " bars. Seventh chords: "
      + g.sevenths + "% of chords. Key changes: " + g.modsPer100Bars + " per 100 bars.";
    ["major", "minor"].forEach(function (m) {
      var box = $("hs-" + m); box.textContent = "";
      var rows = g[m].slice(0, 12).map(function (r) { return [pretty(r[0]), r[1]]; });
      box.appendChild(bars(rows, g.major[0][1], "%", function (r) { return r[0] + " in a " + m + " key, as a share of all chords"; }));
    });
    var nx = $("hs-next"); nx.textContent = "";
    [["maj:ii", "ii"], ["maj:IV", "IV"], ["maj:vi", "vi"], ["maj:V", "V"], ["maj:V7", "V⁷"], ["min:iv", "iv (minor)"], ["min:VI", "VI (minor)"]].forEach(function (p) {
      var d = g.nextOf[p[0]]; if (!d) return;
      var card = el("div", "hs-card"); card.appendChild(el("div", "hs-card-h", "After " + p[1])); card.appendChild(el("div", "hs-ch", d.n.toLocaleString() + " times"));
      card.appendChild(bars(d.to.map(function (r) { return [r[0] === "applied" ? "an applied chord" : pretty(r[0]), r[1]]; }), 100, "%", function (r) { return p[1] + " → " + r[0]; }));
      nx.appendChild(card);
    });
    var ds = $("hs-dest"); ds.textContent = "";
    var tot = g.dest.reduce(function (a, r) { return a + r[1]; }, 0);
    ds.appendChild(bars(g.dest.map(function (r) { return [r[0].replace("from major: ", "major → ").replace("from minor: ", "minor → "), +(100 * r[1] / tot).toFixed(1)]; }), 100, "%",
      function (r) { return "of the key changes shown: " + r[0]; }));
    wireTips(document);
  }

  function examples(S) {
    var sel = $("hs-kind"), out = $("hs-examples");
    KINDS.forEach(function (k) { var o = el("option", null, (k[0] === "cad64" ? "Cadential ⁶₄" : k[1]) + " (" + k[2] + ")"); o.value = k[0]; sel.appendChild(o); });
    function draw() {
      out.textContent = ""; var ul = el("ul", "hs-ex");
      S.examples[sel.value].forEach(function (x) {
        var li = el("li"), a = el("a", null, x.title);
        a.href = x.lib ? "view.html?id=" + encodeURIComponent(x.lib) : "https://github.com/MarkGotham/When-in-Rome/tree/master/Corpus/" + x.rel.split("/").map(encodeURIComponent).join("/");
        if (!x.lib) a.target = "_blank";
        li.appendChild(el("span", "hs-who", x.composer.replace(/,.*$/, "") + ": ")); li.appendChild(a);
        li.appendChild(el("span", null, " · first at bar " + x.m + " (" + x.chord + "), " + x.n + " in the piece"));
        li.appendChild(el("span", x.lib ? "hs-tag hs-on" : "hs-tag", x.lib ? "score on this site" : "analysis only (GitHub)"));
        ul.appendChild(li);
      });
      out.appendChild(ul);
    }
    sel.addEventListener("change", draw); draw();
  }

  function init() {
    document.body.appendChild(tip);
    fetch("/apps/shared/data/rn-stats.json?v=" + V).then(function (r) { return r.json(); }).then(function (S) {
      $("hs-total").textContent = S.pieces.toLocaleString() + " analysed pieces and " + S.chords.toLocaleString() + " chord labels";
      $("hs-heat").appendChild(heat(S));
      var sel = $("hs-group"); Object.keys(S.groups).forEach(function (n) { var o = el("option", null, n); o.value = n; sel.appendChild(o); });
      sel.addEventListener("change", function () { drawGroup(S, sel.value); }); drawGroup(S, "All");
      examples(S); wireTips(document);
    }).catch(function (e) { $("hs-total").textContent = "(could not load the numbers: " + e.message + ")"; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
