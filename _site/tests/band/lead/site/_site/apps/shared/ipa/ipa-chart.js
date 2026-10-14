// ipa-chart.js — builds the interactive IPA chart on tools/ipa-chart.qmd from ipa-data.js (window.IPA_DATA).
// Containers it fills: #ipa-filter, #ipa-vowels, #ipa-consonants, #ipa-affricates, #ipa-modified, #ipa-series, #ipa-marks.
// Text only: no audio is played or synthesised.
(function () {
  var D = window.IPA_DATA, LANGS = D.LANGS, BY = {};
  D.SYMBOLS.forEach(function (s) { BY[s.id] = s; });
  var state = { langs: {}, q: "", sel: null, all: false };
  var panels = [];

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hl(t) { return esc(t).replace(/\{([^}]*)\}/g, "<mark>$1</mark>"); }
  function parse(e) { var p = e.split("|"); return { w: p[0] || "", r: p[1] || "", g: p[2] || "", n: p[3] || "" }; }
  function plain(e) { return e.replace(/[{}]/g, ""); }
  function cps(id) { return Array.from(id).map(function (ch) { return "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"); }).join(" "); }
  function langsOf(s) { return LANGS.filter(function (l) { return s.ex[l.id] && s.ex[l.id].length; }); }
  function chosen() { return LANGS.filter(function (l) { return state.langs[l.id]; }); }
  function fold(t) { return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  var CAT = { v: "vowel", c: "consonant", a: "affricate other consonant", m: "modified sound", d: "diacritic mark" };
  var hay = {};
  D.SYMBOLS.forEach(function (s) {
    var parts = [s.id, s.name, s.desc, s.tip, CAT[s.cat] || ""];
    LANGS.forEach(function (l) { if (s.ex[l.id] && s.ex[l.id].length) { parts.push(l.name); s.ex[l.id].forEach(function (e) { parts.push(plain(e).replace(/\|/g, " ")); }); } });
    var raw = parts.join(" ").toLowerCase(); hay[s.id] = { raw: raw, folded: fold(raw) };
  });

  function matches(s) {
    var ch = chosen();
    if (ch.length && !ch.some(function (l) { return s.ex[l.id] && s.ex[l.id].length; })) return false;
    var q = state.q.trim().toLowerCase();
    if (q) {
      var qf = fold(q), h = hay[s.id];
      return q.split(/\s+/).every(function (w) { var wf = fold(w); return h.raw.indexOf(w) >= 0 || h.folded.indexOf(wf) >= 0; });
    }
    return true;
  }

  function symBtn(s, cls) {
    var b = document.createElement("button"); b.type = "button"; b.className = "ipa-sym" + (cls ? " " + cls : "");
    b.textContent = s.id; b.dataset.id = s.id; b.setAttribute("aria-pressed", "false");
    var lg = langsOf(s).map(function (l) { return l.short; }).join(" ");
    b.title = s.name + (lg ? "  [" + lg + "]" : "  [no reference in these languages]");
    b.setAttribute("aria-label", s.name + " " + s.id);
    if (!lg) b.classList.add("nox");
    return b;
  }
  function card(s) {
    var b = document.createElement("button"); b.type = "button"; b.className = "ipa-card"; b.dataset.id = s.id; b.setAttribute("aria-pressed", "false");
    var lg = langsOf(s).map(function (l) { return l.short; }).join(" ");
    if (!lg) b.classList.add("nox");
    b.innerHTML = '<span class="sym">' + esc(s.id) + '</span><span class="nm">' + esc(s.name) + '</span><span class="lg">' + (lg || "no reference here") + "</span>";
    return b;
  }

  /* ---------- builders ---------- */
  function mount(id, build) {
    var host = document.getElementById(id); if (!host) return;
    var panel = document.createElement("div"); panel.className = "ipa-detail";
    panel.innerHTML = '<p class="ipa-empty">Click a symbol to see how it is made and where it occurs in each language.</p>';
    panels.push({ host: host, panel: panel });
    build(host, panel);
  }

  function buildVowels(host, panel) {
    var wrap = document.createElement("div"); wrap.className = "ipa-vwrap";
    var front = function (y) { return 6 + 34 * y / 100; }, back = 94;
    var X = function (c, y) { return front(y) + (back - front(y)) * c / 2; };
    var Y = function (row) { return row * 100 / 6; };
    var plot = document.createElement("div"); plot.className = "plot";
    var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">';
    for (var r = 1; r < 6; r++) svg += '<line x1="' + front(Y(r)) + '" y1="' + Y(r) + '" x2="' + back + '" y2="' + Y(r) + '"/>';
    svg += '<line x1="' + X(1, 0) + '" y1="0" x2="' + X(1, 100) + '" y2="100" stroke-dasharray="3 3"/>';
    svg += '<polygon class="out" points="' + front(0) + ",0 " + back + ",0 " + back + ",100 " + front(100) + ',100"/></svg>';
    plot.innerHTML = svg;
    D.VROWS.forEach(function (n, i) {
      var l = document.createElement("div"); l.className = "rl"; l.textContent = n; l.style.top = "calc(1.8rem + (100% - 2.4rem) * " + (i / 6) + ")";
      wrap.appendChild(l);
    });
    ["Front", "Central", "Back"].forEach(function (n, i) {
      var l = document.createElement("div"); l.className = "cl"; l.textContent = n;
      l.style.left = "calc(6.2rem + (100% - 8.8rem) * " + (X(i, 0) / 100) + ")"; wrap.appendChild(l);
    });
    var groups = {};
    D.SYMBOLS.filter(function (s) { return s.cat === "v"; }).forEach(function (s) { (groups[s.y + "/" + s.c] = groups[s.y + "/" + s.c] || []).push(s); });
    D.SYMBOLS.filter(function (s) { return s.cat === "v"; }).forEach(function (s) {
      var b = symBtn(s, groups[s.y + "/" + s.c].length > 1 ? (s.r ? "r" : "l") : "");
      var y = Y(s.y); b.style.left = X(s.c, y) + "%"; b.style.setProperty("--dx", ((1 - s.c) * 1.05).toFixed(2) + "rem"); b.style.top = y + "%"; plot.appendChild(b);
    });
    wrap.appendChild(plot);
    var legend = document.createElement("p"); legend.className = "ipa-vleg";
    legend.textContent = "Where symbols come in pairs, the one on the left is unrounded and the one on the right is rounded. Dashed outline: no reference word in these languages.";
    var left = document.createElement("div"); left.appendChild(wrap); left.appendChild(legend);
    var two = document.createElement("div"); two.className = "ipa-two"; two.appendChild(left); two.appendChild(panel);
    host.appendChild(two);
  }

  function buildConsonants(host, panel) {
    var cell = {};
    D.SYMBOLS.filter(function (s) { return s.cat === "c"; }).forEach(function (s) { (cell[s.mn + "/" + s.pl] = cell[s.mn + "/" + s.pl] || []).push(s); });
    var t = '<div class="ipa-ctwrap"><table class="ipa-ct"><thead><tr><th class="m"></th>';
    D.PLACES.forEach(function (p) { t += "<th>" + esc(p) + "</th>"; });
    t += "</tr></thead><tbody>";
    D.MANNERS.forEach(function (m, mi) {
      t += '<tr><th class="m">' + esc(m) + "</th>";
      D.PLACES.forEach(function (p, pi) { t += '<td data-k="' + mi + "/" + pi + '"></td>'; });
      t += "</tr>";
    });
    t += "</tbody></table></div>";
    var holder = document.createElement("div"); holder.innerHTML = t;
    holder.querySelectorAll("td").forEach(function (td) {
      (cell[td.dataset.k] || []).slice().sort(function (a, b) { return a.vd - b.vd; }).forEach(function (s) { td.appendChild(symBtn(s)); });
    });
    var note = document.createElement("p"); note.className = "ipa-vleg";
    note.textContent = "Where symbols come in pairs, the voiceless one is on the left and the voiced one on the right. Dashed outline: no reference word in these languages. Swipe sideways on a small screen.";
    host.appendChild(holder.firstChild); host.appendChild(note); host.appendChild(panel);
  }

  function buildList(cat) {
    return function (host, panel) {
      var list = document.createElement("div"); list.className = "ipa-list";
      D.SYMBOLS.filter(function (s) { return s.cat === cat; }).forEach(function (s) { list.appendChild(card(s)); });
      var two = document.createElement("div"); two.className = "ipa-two"; two.appendChild(list); two.appendChild(panel);
      host.appendChild(two);
    };
  }

  function buildSeries(host, panel) {
    var box = document.createElement("div"); box.className = "ipa-series";
    D.SERIES.forEach(function (sr) {
      var d = document.createElement("div");
      var h = "<h3>" + esc(sr.title) + "</h3><p>" + esc(sr.note) + "</p><table><thead><tr><th></th>";
      sr.cols.forEach(function (c) { h += "<th>" + esc(c) + "</th>"; });
      h += "</tr></thead><tbody>";
      sr.rows.forEach(function (row) { h += "<tr><th>" + esc(row[0]) + "</th>"; for (var i = 1; i < row.length; i++) h += '<td class="s" data-sym="' + esc(row[i]) + '"></td>'; h += "</tr>"; });
      h += "</tbody></table>"; d.innerHTML = h; box.appendChild(d);
    });
    box.querySelectorAll("td[data-sym]").forEach(function (td) { var s = BY[td.dataset.sym]; if (s) td.appendChild(symBtn(s)); });
    host.appendChild(box); host.appendChild(panel);
  }

  /* ---------- detail ---------- */
  function showDetail(s, entry) {
    var ch = chosen(), have = langsOf(s), p = entry.panel;
    var shown = (ch.length && !state.all) ? have.filter(function (l) { return state.langs[l.id]; }) : have;
    var hidden = have.length - shown.length;
    var h = '<div class="ipa-dh"><div class="ipa-big">' + esc(s.id) + '</div><div><h3>' + esc(s.name) + '</h3><div class="ipa-cp">[' + esc(s.id) + "] " + cps(s.id) + "</div></div></div>";
    h += "<p>" + esc(s.desc) + "</p>";
    if (s.tip) h += '<div class="ipa-tip"><strong>For singers.</strong> ' + esc(s.tip) + "</div>";
    if (shown.length) {
      h += '<table class="ipa-ex"><tbody>';
      shown.forEach(function (l) {
        h += "<tr><th>" + esc(l.name) + "</th><td>";
        s.ex[l.id].forEach(function (e) {
          var x = parse(e);
          h += '<span class="w"><span lang="' + l.id + '">' + hl(x.w) + "</span>" + (x.r ? '<span class="r">' + esc(x.r) + "</span>" : "") + (x.g ? '<span class="g">' + esc(x.g) + "</span>" : "") +
               (x.n ? '<span class="n">' + esc(x.n) + "</span>" : "") + "</span>";
        });
        h += "</td></tr>";
      });
      h += "</tbody></table>";
    } else if (!have.length) {
      h += '<p class="ipa-none">No reference words: this sound is not a phoneme in English, Hindi, Marathi, German, French, Korean or Japanese.</p>';
    } else {
      h += '<p class="ipa-none">None of the chosen languages has this sound.</p>';
    }
    if (hidden > 0) h += '<p class="ipa-none">' + hidden + " more language" + (hidden > 1 ? "s" : "") + ' with this sound hidden by the filter. <button type="button" class="btn btn-sm btn-outline-secondary" data-act="all">Show all</button></p>';
    else if (have.length && have.length < LANGS.length && !ch.length) {
      var lack = LANGS.filter(function (l) { return have.indexOf(l) < 0; }).map(function (l) { return l.name; });
      h += '<p class="ipa-none">Not used in: ' + esc(lack.join(", ")) + ".</p>";
    }
    p.innerHTML = h;
  }

  function select(id, scroll, from) {
    var s = BY[id]; if (!s) return;
    var sec = null;
    if (from) panels.forEach(function (e) { if (e.host.contains(from)) sec = e; }); else sec = state.entry;
    if (!sec) return;
    state.sel = id; state.entry = sec;
    document.querySelectorAll(".ipa-root [data-id]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.id === id && sec.host.contains(b) ? "true" : "false"); });
    panels.forEach(function (e) { if (e !== sec && e.panel.querySelector(".ipa-big")) e.panel.innerHTML = '<p class="ipa-empty">Click a symbol to see how it is made and where it occurs in each language.</p>'; });
    showDetail(s, sec);
    if (scroll) { var r = sec.panel.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight) sec.panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }

  /* ---------- filtering ---------- */
  function apply() {
    var n = 0, tot = 0;
    document.querySelectorAll(".ipa-root .ipa-sym, .ipa-root .ipa-card").forEach(function (b) {
      var s = BY[b.dataset.id]; if (!s) return;
      var ok = matches(s); b.classList.toggle("ipa-dim", !ok);
    });
    D.SYMBOLS.forEach(function (s) { tot++; if (matches(s)) n++; });
    var c = document.getElementById("ipa-count");
    if (c) c.textContent = (state.q.trim() || chosen().length) ? n + " of " + tot + " symbols match" : tot + " symbols";
    if (state.sel) select(state.sel, false);
  }

  function buildFilter() {
    var host = document.getElementById("ipa-filter"); if (!host) return;
    var h = '<div class="ipa-bar"><div><label for="ipa-q" class="ipa-small">Search symbols, names, example words, glosses</label>' +
      '<input id="ipa-q" type="search" placeholder="e.g. ʃ, retroflex, rice, भ, nasal" autocomplete="off"></div>' +
      '<div><div class="ipa-small">Show only sounds found in</div><div class="ipa-langs" role="group" aria-label="Languages">';
    LANGS.forEach(function (l) { h += '<label><input type="checkbox" value="' + l.id + '">' + esc(l.name) + "</label>"; });
    h += '</div></div><div class="ipa-meta"><span id="ipa-count"></span><button type="button" class="btn btn-sm btn-outline-secondary" id="ipa-clear">Clear filters</button></div></div>';
    host.innerHTML = h;
    host.querySelector("#ipa-q").addEventListener("input", function (e) { state.q = e.target.value; apply(); });
    host.querySelectorAll("input[type=checkbox]").forEach(function (cb) { cb.addEventListener("change", function () { state.langs[cb.value] = cb.checked; state.all = false; apply(); }); });
    host.querySelector("#ipa-clear").addEventListener("click", function () {
      state.q = ""; state.langs = {}; state.all = false; host.querySelector("#ipa-q").value = "";
      host.querySelectorAll("input[type=checkbox]").forEach(function (cb) { cb.checked = false; }); apply();
    });
  }

  function init() {
    if (!document.getElementById("ipa-vowels")) return;
    var page = document.querySelector("main") || document.body; page.classList.add("ipa-root", "ipa-page");
    buildFilter();
    mount("ipa-vowels", buildVowels); mount("ipa-consonants", buildConsonants);
    mount("ipa-affricates", buildList("a")); mount("ipa-modified", buildList("m")); mount("ipa-series", buildSeries); mount("ipa-marks", buildList("d"));
    document.querySelector(".ipa-root").addEventListener("click", function (e) {
      var all = e.target.closest("[data-act=all]"); if (all) { state.all = true; if (state.sel) select(state.sel, false); return; }
      var b = e.target.closest("[data-id]"); if (b) select(b.dataset.id, true, b);
    });
    apply();
    window.IPA_UI = { select: select, state: state, apply: apply };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
