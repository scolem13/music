// glossary.js: the course glossary page (course/glossary.qmd).
// Data: apps/shared/course/glossary.json (built by scripts/course-glossary.mjs from course/glossary.org).
// Class use: glossary-usage.json, written by Learning-Experiences/glossary-usage.py when the class site builds,
// read from the class site (CORS header in its _headers) or, failing that, the copy next to this file.
// Filters live in the URL (?q=&lv=&g=&cat=&imp=&tok=&sort=&view=), so a copied link shows the same view; #slug opens a term.
(function () {
  "use strict";
  var K = window.CourseKit, esc = K.esc, md = K.md;
  var USAGE_URLS = ["https://classes.seancoleman.org/glossary-usage.json", "/apps/shared/course/glossary-usage.json?v=1"];
  var LEVELS = [["myp1", "MYP1"], ["myp2", "MYP2"], ["myp3", "MYP3"], ["myp4", "MYP4"], ["myp5", "MYP5"], ["dp", "DP"]];
  var IMP = ["core", "enriching", "expert"];
  var COURSE_NAMES = { myp1a: "MYP1A", myp1b: "MYP1B", myp2a: "MYP2A", myp2b: "MYP2B", myp3a: "MYP3A", myp3b: "MYP3B", myp4: "MYP4", myp5: "MYP5", dp1: "DP1", dp2tok: "DP2 TOK" };
  var D, bySlug = {}, usage = {}, st;

  function fmtDate(d) { var x = new Date(d + "T12:00:00"); return isNaN(x) ? d : x.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  function levelText(lv) {
    var m = lv.filter(function (l) { return l !== "dp"; }).map(function (l) { return +l.slice(3); });
    var s = m.length === 5 ? "MYP1–5" : m.length > 1 && m[m.length - 1] - m[0] === m.length - 1 ? "MYP" + m[0] + "–" + m[m.length - 1] : m.map(function (n) { return "MYP" + n; }).join(", ");
    return [s, lv.indexOf("dp") >= 0 ? "DP" : ""].filter(Boolean).join(" · ");
  }
  function srcHtml(s) {
    if (/^https?:/.test(s)) return '<a href="' + esc(s) + '" target="_blank" rel="noopener">' + esc(s.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]) + "</a>";
    var k = D.sources[s]; if (!k) return esc(s);
    return k.url ? '<a href="' + esc(k.url) + '" target="_blank" rel="noopener">' + md(k.label) + "</a>" : md(k.label);
  }

  // ── state <-> URL ───────────────────────────────────────────────────────
  function readState() {
    var p = new URLSearchParams(location.search), saved = K.load("glossary-view", "full");
    return { q: p.get("q") || "", lv: p.get("lv") ? p.get("lv").split(",") : [], g: p.get("g") ? p.get("g").split("|") : [],
      cat: p.get("cat") || "", imp: p.get("imp") ? p.get("imp").split(",") : IMP.slice(), tok: p.get("tok") === "1",
      used: p.get("used") === "1", sort: p.get("sort") || "group", view: p.get("view") || saved };
  }
  function writeState() {
    var p = new URLSearchParams();
    if (st.q) p.set("q", st.q);
    if (st.lv.length) p.set("lv", st.lv.join(","));
    if (st.g.length) p.set("g", st.g.join("|"));
    if (st.cat) p.set("cat", st.cat);
    if (st.imp.length !== 3) p.set("imp", st.imp.join(","));
    if (st.tok) p.set("tok", "1");
    if (st.used) p.set("used", "1");
    if (st.sort !== "group") p.set("sort", st.sort);
    if (st.view !== "full") p.set("view", st.view);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    K.save("glossary-view", st.view);
  }

  // ── filtering and sorting ───────────────────────────────────────────────
  function uses(t) { return usage[t.slug] || []; }
  function matches(t) {
    if (st.lv.length && !st.lv.some(function (l) { return t.levels.indexOf(l) >= 0; })) return false;
    if (st.g.length && st.g.indexOf(t.group) < 0) return false;
    if (st.cat && t.cats.indexOf(st.cat) < 0) return false;
    if (st.imp.indexOf(t.importance) < 0) return false;
    if (st.tok && !(t.tok && t.tok.length) && !(t.usedBy && t.usedBy.length)) return false;
    if (st.used && !uses(t).length) return false;
    if (st.q) {
      var q = st.q.toLowerCase(), hay = (t.title + " " + t.short + " " + t.cats.join(" ")).toLowerCase();
      if (hay.indexOf(q) < 0 && (t.long || "").toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
  }
  function sorted(list) {
    var gi = function (t) { return D.groups.indexOf(t.group); }, ii = function (t) { return IMP.indexOf(t.importance); };
    var first = function (t) { var u = uses(t); return u.length ? u[0].date : "9999"; }, last = function (t) { var u = uses(t); return u.length ? u[u.length - 1].date : "0000"; };
    var alpha = function (a, b) { return a.title.localeCompare(b.title, undefined, { numeric: true }); };
    var by = {
      alpha: alpha,
      group: function (a, b) { return gi(a) - gi(b) || alpha(a, b); },
      importance: function (a, b) { return ii(a) - ii(b) || alpha(a, b); },
      first: function (a, b) { return first(a) < first(b) ? -1 : first(a) > first(b) ? 1 : alpha(a, b); },
      last: function (a, b) { return last(a) > last(b) ? -1 : last(a) < last(b) ? 1 : alpha(a, b); },
    }[st.sort] || alpha;
    return list.slice().sort(by);
  }

  // ── rendering ───────────────────────────────────────────────────────────
  function link(slug, text) { var t = bySlug[slug]; return '<a href="#' + esc(slug) + '" data-gl="' + esc(slug) + '">' + esc(text || (t ? t.title : slug)) + "</a>"; }
  function tokBlock(t) {
    var h = "";
    if (t.tok && t.tok.length) {
      h += '<div class="gl-tok"><strong>TOK connections</strong>' + t.tok.map(function (x) {
        return '<p class="gl-q">' + esc(x.q) + "<br><small>TOK concept: " + link(x.concept) + " · " + srcHtml(x.src) + "</small></p>";
      }).join("") + "</div>";
    }
    if (t.usedBy && t.usedBy.length) h += '<div class="gl-tok"><strong>Music terms with a TOK question about ' + esc(t.title.toLowerCase()) + ":</strong> " + t.usedBy.map(function (s) { return link(s); }).join(", ") + "</div>";
    return h;
  }
  function usesBlock(t) {
    var u = uses(t); if (!u.length) return "";
    var opts = u.slice().reverse().map(function (x) {
      return '<option value="' + esc(x.url) + '">' + esc(fmtDate(x.date) + " — " + (COURSE_NAMES[x.course] || x.course) + (x.title ? ": " + x.title : "")) + "</option>";
    }).join("");
    return '<div class="gl-meta gl-uses">In class: first ' + esc(fmtDate(u[0].date)) + " (" + esc(COURSE_NAMES[u[0].course] || u[0].course) + ') · <select aria-label="Class pages that used this term"><option value="">' +
      u.length + (u.length === 1 ? " lesson" : " lessons") + " ▾</option>" + opts + "</select></div>";
  }
  function termHtml(t, open) {
    var badges = '<span class="crs-badge ' + t.importance + '">' + t.importance + "</span> " + '<span class="crs-badge">' + esc(t.group) + "</span> " +
      '<span class="crs-badge">' + esc(levelText(t.levels)) + "</span>" + ((t.tok && t.tok.length) ? ' <span class="crs-badge tok">TOK</span>' : "");
    var meta = [];
    if (t.see.length) meta.push("See also: " + t.see.map(function (s) { return link(s); }).join(", "));
    if (t.link) meta.push('On this site: <a href="' + esc(t.link) + '">' + esc(t.link.replace(/^\/|\.html$/g, "").replace(/^.*\//, "").replace(/-/g, " ")) + "</a>");
    if (t.sources.length) meta.push("Source: " + t.sources.map(srcHtml).join("; "));
    return '<div class="gl-term' + (open ? " open" : "") + '" id="' + esc(t.slug) + '">' +
      '<div class="gl-head" role="button" tabindex="0" aria-expanded="' + !!open + '"><span class="gl-tw">▸</span><h3>' + esc(t.title) + "</h3>" + badges + "</div>" +
      '<p class="gl-short">' + md(t.short) + "</p>" +
      '<div class="gl-body">' + (t.long || "") + tokBlock(t) + (meta.length ? '<div class="gl-meta">' + meta.join(" · ") + "</div>" : "") + usesBlock(t) + "</div></div>";
  }
  function render() {
    var list = sorted(D.terms.filter(matches)), out = document.getElementById("gl-results");
    document.getElementById("gl-count").textContent = list.length + " of " + D.terms.length + " terms";
    if (!list.length) { out.innerHTML = "<p>No terms match. Clear a filter or two.</p>"; return; }
    if (st.view === "compact") {
      out.innerHTML = '<table class="gl-compact"><tbody>' + list.map(function (t) {
        return '<tr data-gl="' + esc(t.slug) + '"><td>' + esc(t.title) + "</td><td>" + md(t.short) + "</td></tr>";
      }).join("") + "</tbody></table>";
      return;
    }
    var open = st.view === "full", h = "", lastGroup = null;
    list.forEach(function (t) {
      if (st.sort === "group" && t.group !== lastGroup) { h += '<h3 class="gl-group" style="margin-top:1.2rem">' + esc(t.group) + "</h3>"; lastGroup = t.group; }
      h += termHtml(t, open);
    });
    out.innerHTML = h;
  }
  function chips(id, items, selected, multi) {
    var el = document.getElementById(id);
    el.innerHTML = items.map(function (it) { return '<button type="button" class="crs-chip" data-v="' + esc(it[0]) + '" aria-pressed="' + (selected.indexOf(it[0]) >= 0) + '">' + esc(it[1]) + "</button>"; }).join("");
    el.onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var v = b.dataset.v, arr = st[el.dataset.key], i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      b.setAttribute("aria-pressed", String(i < 0));
      writeState(); render();
    };
    el.dataset.key = id.replace("gl-", "");
  }
  function controls() {
    var c = document.getElementById("gl-controls");
    var cats = {}; D.terms.forEach(function (t) { t.cats.forEach(function (x) { cats[x] = (cats[x] || 0) + 1; }); });
    var catOpts = Object.keys(cats).sort().map(function (x) { return '<option value="' + esc(x) + '"' + (x === st.cat ? " selected" : "") + ">" + esc(x.replace(/-/g, " ")) + " (" + cats[x] + ")</option>"; }).join("");
    c.innerHTML =
      '<label>Search <input type="search" id="gl-q" placeholder="term, definition, tag" value="' + esc(st.q) + '"></label>' +
      '<label>Year <span class="crs-chips" id="gl-lv"></span></label>' +
      '<label>Importance <span class="crs-chips" id="gl-imp"></span></label>' +
      '<label>Group <span class="crs-chips" id="gl-g"></span></label>' +
      '<label>Tag <select id="gl-cat"><option value="">any</option>' + catOpts + "</select></label>" +
      '<label><input type="checkbox" id="gl-tok"' + (st.tok ? " checked" : "") + "> Has a TOK connection</label>" +
      '<label id="gl-used-wrap" hidden><input type="checkbox" id="gl-used"' + (st.used ? " checked" : "") + "> Used in class</label>" +
      '<label>Sort <select id="gl-sort">' + [["group", "By group"], ["alpha", "A–Z"], ["importance", "Importance"], ["first", "First used in class"], ["last", "Last used in class"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === st.sort ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
      '<label>View <select id="gl-view">' + [["full", "Expanded"], ["condensed", "Condensed"], ["compact", "Compact table"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === st.view ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
      '<button type="button" class="crs-btn" id="gl-copy">Copy link to this view</button> <button type="button" class="crs-btn" id="gl-clear">Clear filters</button>';
    chips("gl-lv", LEVELS, st.lv); chips("gl-imp", IMP.map(function (x) { return [x, x]; }), st.imp); chips("gl-g", D.groups.map(function (g) { return [g, g]; }), st.g);
    var q = document.getElementById("gl-q"), tmr;
    q.oninput = function () { clearTimeout(tmr); tmr = setTimeout(function () { st.q = q.value.trim(); writeState(); render(); }, 150); };
    document.getElementById("gl-cat").onchange = function (e) { st.cat = e.target.value; writeState(); render(); };
    document.getElementById("gl-tok").onchange = function (e) { st.tok = e.target.checked; writeState(); render(); };
    document.getElementById("gl-used").onchange = function (e) { st.used = e.target.checked; writeState(); render(); };
    document.getElementById("gl-sort").onchange = function (e) { st.sort = e.target.value; writeState(); render(); };
    document.getElementById("gl-view").onchange = function (e) { st.view = e.target.value; writeState(); render(); };
    document.getElementById("gl-copy").onclick = function (e) { K.copy(location.href.replace(/#.*$/, ""), e.target); };
    document.getElementById("gl-clear").onclick = function () { st = readState(); st.q = ""; st.lv = []; st.g = []; st.cat = ""; st.imp = IMP.slice(); st.tok = false; st.used = false; writeState(); controls(); render(); };
  }

  // open a term from #slug or a click on a term link, clearing filters that hide it
  function show(slug, scroll) {
    var t = bySlug[slug]; if (!t) return;
    if (!matches(t)) { st.q = ""; st.lv = []; st.g = []; st.cat = ""; st.imp = IMP.slice(); st.tok = false; st.used = false; writeState(); controls(); render(); }
    if (st.view === "compact") { st.view = "condensed"; writeState(); controls(); render(); }
    var sec = document.getElementById("find-a-term"); if (sec && sec._sfSet && sec.classList.contains("sf-shut")) sec._sfSet(false);
    var el = document.getElementById(slug); if (!el) return;
    el.classList.add("open"); el.querySelector(".gl-head").setAttribute("aria-expanded", "true");
    el.classList.add("gl-hit"); setTimeout(function () { el.classList.remove("gl-hit"); }, 1600);
    if (scroll) el.scrollIntoView({ block: "start" });
  }
  function wire() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-gl]");
      if (a && a.tagName !== "TR") { e.preventDefault(); history.replaceState(null, "", "#" + a.dataset.gl); show(a.dataset.gl, true); return; }
      if (a && a.tagName === "TR") { history.replaceState(null, "", "#" + a.dataset.gl); show(a.dataset.gl, true); return; }
      var h = e.target.closest(".gl-head");
      if (h && !e.target.closest("a")) { var term = h.parentNode, o = term.classList.toggle("open"); h.setAttribute("aria-expanded", String(o)); }
    });
    document.addEventListener("keydown", function (e) {
      var h = e.target.closest && e.target.closest(".gl-head");
      if (h && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); h.click(); }
    });
    document.addEventListener("change", function (e) { if (e.target.closest(".gl-uses") && e.target.value) window.open(e.target.value, "_blank", "noopener"); });
    window.addEventListener("hashchange", function () { show(location.hash.slice(1), true); });
  }

  // ── the other sections ─────────────────────────────────────────────────
  function tokSection() {
    var el = document.getElementById("gl-tokgrid"); if (!el) return;
    el.innerHTML = D.tokConcepts.map(function (c) {
      var qs = []; D.terms.forEach(function (t) { (t.tok || []).forEach(function (x) { if (x.concept === c) qs.push([t, x]); }); });
      if (!qs.length) return "";
      return '<div class="gl-tokcard"><h3>' + link(c, c) + "</h3><ul>" + qs.map(function (p) {
        return "<li>" + esc(p[1].q) + " <small>(" + link(p[0].slug) + (p[1].src === "dp-guide-9" ? ", DP guide" : "") + ")</small></li>";
      }).join("") + "</ul></div>";
    }).join("");
  }
  function ladders() {
    var el = document.getElementById("gl-ladders"); if (!el) return;
    var row = function (slug) { var t = bySlug[slug]; return t ? "<td>" + link(slug) + "<br><small>" + md(t.short) + "</small></td>" : "<td></td>"; };
    var dp = [1, 2, 3, 4].map(function (n) { return D.terms.filter(function (t) { return t.cats.indexOf("dp-level-" + n) >= 0; }); });
    var dpNames = ["uninformed-imitation", "precise-imitation", "informed-proficiency", "mastery-and-resourcefulness"];
    el.innerHTML =
      "<h3>MYP: responding to music (Aii, Di, Dii), lowest to highest</h3>" +
      '<div class="pw-scroll"><table class="gl-ladder"><tr>' + ["identify", "outline", "describe", "analyse", "evaluate", "critique", "discuss"].map(row).join("") + "</tr></table></div>" +
      "<h3>MYP: artistic choices (Bii), lowest to highest</h3>" +
      '<div class="pw-scroll"><table class="gl-ladder"><tr>' + ["state", "describe", "explain", "justify"].map(row).join("") + "</tr></table></div>" +
      "<h3>DP Music: the four achievement levels</h3>" +
      '<div class="pw-scroll"><table class="gl-ladder"><tr><th>Level</th><th>What it is</th><th>Terms</th></tr>' + dp.map(function (ts, i) {
        var lv = bySlug[dpNames[i]];
        return "<tr><td>" + (i + 1) + "</td><td>" + (lv ? link(lv.slug) + "<br><small>" + md(lv.short) + "</small>" : "") + "</td><td>" +
          ts.map(function (t) { return link(t.slug); }).join(", ") + "</td></tr>";
      }).join("") + "</table></div>" +
      '<p class="crs-count">MYP rungs from the MYP Arts guide; DP levels from the DP Music guide, pp. 71–73.</p>';
  }

  function init() {
    if (!document.getElementById("gl-results")) return;
    K.json("/apps/shared/course/glossary.json?v=1").then(function (data) {
      if (!data) { document.getElementById("gl-results").textContent = "The glossary could not be loaded."; return; }
      D = data; D.terms.forEach(function (t) { bySlug[t.slug] = t; });
      st = readState(); controls(); render(); tokSection(); ladders(); wire();
      if (location.hash.length > 1) setTimeout(function () { show(decodeURIComponent(location.hash.slice(1)), true); }, 50);
      (function tryUsage(i) {
        if (i >= USAGE_URLS.length) return;
        K.json(USAGE_URLS[i]).then(function (u) {
          if (!u || !u.terms) return tryUsage(i + 1);
          usage = u.terms;
          document.getElementById("gl-used-wrap").hidden = false;
          var note = document.getElementById("gl-usage-note"); if (note) note.textContent = "Class use read from the class site (built " + fmtDate(String(u.generated).slice(0, 10)) + ").";
          render();
        });
      })(0);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
