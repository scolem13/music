// enrichment.js: choose enrichment options and see growth through the MLT skill levels (course/enrichment.qmd).
// Options: window.COURSE_ENRICHMENT (enrichment-data.js). Saved in localStorage "course:enrichment" as
// { picks: { optionId: { s: "plan"|"work"|"done", note, d: "YYYY-MM-DD" } }, core: { tonal: n, rhythm: n } }
// (n = index into LEVELS, -1 not started). A share link carries the same object plus the name: ?p=<packed>.
(function () {
  "use strict";
  var K = window.CourseKit, esc = K.esc, md = K.md, E, st, shared = null, year;
  var YEARS = ["myp1", "myp2", "myp3", "myp4", "myp5", "dp"], YN = { myp1: "MYP1", myp2: "MYP2", myp3: "MYP3", myp4: "MYP4", myp5: "MYP5", dp: "DP" };
  var STATUS = [["", "—"], ["plan", "Planning"], ["work", "Working on it"], ["done", "Done"]];

  function years(r) { var m = r.split("-"); var a = YEARS.indexOf(m[0]), b = YEARS.indexOf(m[1] || m[0]); return YEARS.slice(a, b + 1); }
  function opts() { var a = []; E.STRANDS.forEach(function (s) { s.options.forEach(function (o) { a.push({ o: o, s: s }); }); }); return a; }
  function level(slug) { for (var i = 0; i < E.LEVELS.length; i++) if (E.LEVELS[i].slug === slug) return i; return -1; }
  function data() { return shared || st; }
  function saveSt() { if (!shared) K.save("enrichment", st); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function linksHtml(links) { return links.map(function (l) { return '<a href="' + esc(l[1]) + '">' + esc(l[0]) + "</a>"; }).join(" · "); }
  function lvLink(slug) { var i = level(slug); return i < 0 ? "" : '<a class="crs-badge core" href="glossary.html#' + esc(slug) + '" title="' + esc(E.LEVELS[i].what) + '">MLT: ' + esc(E.LEVELS[i].name) + "</a>"; }

  // ── the common core ─────────────────────────────────────────────────────
  function core() {
    var d = data(), sel = function (k) {
      var v = d.core && d.core[k] != null ? d.core[k] : -1;
      return '<select data-core="' + k + '"' + (shared ? " disabled" : "") + '><option value="-1">Not started</option>' + E.LEVELS.slice(0, 7).map(function (l, i) {
        return '<option value="' + i + '"' + (i === v ? " selected" : "") + ">" + esc(l.name) + "</option>"; }).join("") + "</select>";
    };
    var el = document.getElementById("en-core");
    el.innerHTML = '<div class="en-grid">' + E.CORE.map(function (c) {
      return '<div class="en-opt"><h4>' + esc(c.title) + "</h4><p>" + md(c.what) + '</p><div class="en-links">' + linksHtml(c.links) + "</div></div>";
    }).join("") + "</div>" +
      '<p style="margin-top:.8rem">Where are you with patterns? Pick the highest level you are secure at (your teacher can tell you after an LSA).</p>' +
      '<div class="crs-controls"><label>Tonal patterns ' + sel("tonal") + "</label><label>Rhythm patterns " + sel("rhythm") + "</label></div>";
    el.onchange = function (e) {
      var s = e.target.closest("select[data-core]"); if (!s) return;
      st.core = st.core || {}; st.core[s.dataset.core] = +s.value; saveSt(); ladder(); share();
    };
  }

  // ── choose ──────────────────────────────────────────────────────────────
  function card(x) {
    var o = x.o, p = (data().picks || {})[o.id] || {}, s = p.s || "";
    var tags = [lvLink(o.mlt), '<span class="crs-badge">' + esc(years(o.years).map(function (y) { return YN[y]; }).join(", ").replace(/MYP(\d), (MYP\d, )*MYP(\d)/, "MYP$1–$3")) + "</span>"]
      .concat(o.feeds.map(function (f) { return '<span class="crs-badge">feeds ' + esc(f) + "</span>"; })).join(" ");
    return '<div class="en-opt' + (s === "done" ? " done" : s ? " picked" : "") + '" data-opt="' + esc(o.id) + '"><h4>' + esc(o.title) + "</h4><p>" + md(o.what) + "</p>" +
      '<div class="en-links">' + linksHtml(o.links) + '</div><div class="en-tags">' + tags + "</div>" +
      '<label class="crs-count" style="margin:0">Status <select data-status' + (shared ? " disabled" : "") + ">" + STATUS.map(function (t) {
        return '<option value="' + t[0] + '"' + (t[0] === s ? " selected" : "") + ">" + t[1] + "</option>"; }).join("") + "</select></label>" +
      (s ? '<input type="text" data-note placeholder="What I did / what I made (for your evidence)" value="' + esc(p.note || "") + '"' + (shared ? " readonly" : "") + ' style="font-size:.82rem;padding:.2rem .4rem;border:1px solid var(--c-line);border-radius:.3rem;background:var(--c-surf);color:var(--c-ink)">' : "") +
      (p.d ? '<span class="crs-count" style="margin:0">Updated ' + esc(p.d) + "</span>" : "") + "</div>";
  }
  function choose() {
    var el = document.getElementById("en-choose");
    var chips = '<div class="crs-controls"><label>Show options for <span class="crs-chips" id="en-years">' +
      [["", "All years"]].concat(YEARS.map(function (y) { return [y, YN[y]]; })).map(function (y) {
        return '<button type="button" class="crs-chip" data-y="' + y[0] + '" aria-pressed="' + (y[0] === (year || "")) + '">' + y[1] + "</button>"; }).join("") +
      '</span></label><label><input type="checkbox" id="en-mine"> Only the ones I picked</label></div>';
    var mineOnly = el.querySelector("#en-mine") && el.querySelector("#en-mine").checked;
    var h = chips;
    E.STRANDS.forEach(function (s) {
      var list = s.options.filter(function (o) {
        var p = (data().picks || {})[o.id];
        return (!year || years(o.years).indexOf(year) >= 0) && (!mineOnly || (p && p.s));
      });
      if (!list.length) return;
      h += '<h3 style="margin-top:1rem">' + esc(s.title) + ' <small style="font-weight:400;color:var(--c-ink2)">' + esc(s.what) + "</small></h3>" +
        '<div class="en-grid">' + list.map(function (o) { return card({ o: o, s: s }); }).join("") + "</div>";
    });
    el.innerHTML = h;
    if (mineOnly) el.querySelector("#en-mine").checked = true;
    el.querySelector("#en-years").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; year = b.dataset.y || null; K.save("enrichment-year", year); choose(); };
    el.querySelector("#en-mine").onchange = function () { choose(); };
  }
  function wireChoose() {
    var el = document.getElementById("en-choose");
    el.addEventListener("change", function (e) {
      var c = e.target.closest("[data-opt]"); if (!c || shared) return;
      if (e.target.matches("select[data-status]")) {
        st.picks = st.picks || {};
        if (e.target.value) st.picks[c.dataset.opt] = Object.assign(st.picks[c.dataset.opt] || {}, { s: e.target.value, d: today() });
        else delete st.picks[c.dataset.opt];
        saveSt(); choose(); ladder(); share();
      }
    });
    el.addEventListener("input", function (e) {
      if (!e.target.matches("input[data-note]") || shared) return;
      var c = e.target.closest("[data-opt]"); var p = st.picks[c.dataset.opt]; if (!p) return;
      p.note = e.target.value; p.d = today(); saveSt(); share();
    });
  }

  // ── growth ladder ───────────────────────────────────────────────────────
  function ladder() {
    var d = data(), picks = d.picks || {}, coreTop = Math.max(d.core && d.core.tonal != null ? d.core.tonal : -1, d.core && d.core.rhythm != null ? d.core.rhythm : -1);
    var all = opts();
    var el = document.getElementById("en-ladder");
    el.innerHTML = '<ol class="en-ladder">' + E.LEVELS.map(function (l, i) {
      var here = all.filter(function (x) { return x.o.mlt === l.slug; });
      var done = here.filter(function (x) { return (picks[x.o.id] || {}).s === "done"; }), work = here.filter(function (x) { var s = (picks[x.o.id] || {}).s; return s === "work" || s === "plan"; });
      var reached = done.length || coreTop >= i, cls = reached ? "reached" : work.length ? "working" : "";
      var idea = here.filter(function (x) { return !picks[x.o.id] && (!year || years(x.o.years).indexOf(year) >= 0); }).slice(0, 3);
      var what = [esc(l.what)];
      if (coreTop >= i) what.push("<strong>Patterns:</strong> secure here.");
      if (done.length) what.push("<strong>Done:</strong> " + done.map(function (x) { return esc(x.o.title); }).join(", "));
      if (work.length) what.push("<strong>On the way:</strong> " + work.map(function (x) { return esc(x.o.title); }).join(", "));
      if (!reached && idea.length) what.push("<span style=\"color:var(--c-ink2)\">Try: " + idea.map(function (x) { return '<a href="#en-opt-' + esc(x.o.id) + '" data-jump="' + esc(x.o.id) + '">' + esc(x.o.title) + "</a>"; }).join(", ") + "</span>");
      return '<li class="' + cls + '"><span><a href="glossary.html#' + esc(l.slug) + '">' + esc(l.name) + '</a><span class="en-kind">' + esc(l.kind) + ' learning</span></span><span class="en-what">' + what.join("<br>") + "</span></li>";
    }).join("") + "</ol>";
    el.onclick = function (e) {
      var a = e.target.closest("a[data-jump]"); if (!a) return; e.preventDefault();
      var c = document.querySelector('[data-opt="' + a.dataset.jump + '"]');
      if (!c) { year = null; choose(); c = document.querySelector('[data-opt="' + a.dataset.jump + '"]'); }
      var sec = document.getElementById("choose-your-enrichment"); if (sec && sec._sfSet) sec._sfSet(false);
      if (c) { c.scrollIntoView({ block: "center" }); c.classList.add("picked"); setTimeout(function () { choose(); }, 1500); }
    };
  }

  // ── share ───────────────────────────────────────────────────────────────
  function share() {
    var el = document.getElementById("en-share");
    if (shared) { el.innerHTML = ""; return; }
    if (!el.querySelector("#en-link")) {
      el.innerHTML = "<p>Your choices are saved in this browser only. Copy the link to show your teacher or to open your plan on another device.</p>" +
        '<div class="en-share"><label>Name <input type="text" id="en-name" style="width:12rem"></label><input type="text" id="en-link" readonly aria-label="Share link">' +
        '<button type="button" class="crs-btn primary" id="en-copy">Copy link</button></div>';
      var n = el.querySelector("#en-name"); n.value = K.load("student-name", "");
      n.oninput = function () { K.save("student-name", n.value.trim()); share(); };
      el.querySelector("#en-copy").onclick = function (e) { share(); K.copy(el.querySelector("#en-link").value, e.target); };
    }
    el.querySelector("#en-link").value = K.shareLink("p", Object.assign({ name: K.load("student-name", "") }, st));
  }
  function banner() {
    var el = document.getElementById("en-viewing"); if (!el) return;
    if (!shared) { el.innerHTML = ""; return; }
    var n = Object.keys(shared.picks || {}).length;
    el.innerHTML = '<div class="crs-note en-viewing">You are looking at ' + (shared.name ? "<strong>" + esc(shared.name) + "</strong>'s" : "a shared") + " enrichment plan (" + n +
      " option" + (n === 1 ? "" : "s") + '). It is read-only. <button type="button" class="crs-btn" id="en-mine-btn">Make this plan mine</button> <a href="enrichment.html">Back to my own</a></div>';
    el.querySelector("#en-mine-btn").onclick = function () {
      if (Object.keys(st.picks || {}).length && !confirm("Replace your own saved plan with this one?")) return;
      st = { picks: shared.picks || {}, core: shared.core || {} }; shared = null; saveSt();
      history.replaceState(null, "", location.pathname); all();
    };
  }

  function all() { banner(); core(); choose(); ladder(); share(); }
  function init() {
    if (!document.getElementById("en-choose")) return;
    E = window.COURSE_ENRICHMENT;
    st = K.load("enrichment", { picks: {}, core: {} });
    var q = new URLSearchParams(location.search);
    if (q.get("p")) shared = K.unpack(q.get("p"));
    var at = K.load("pathway-at", null);
    year = K.load("enrichment-year", at ? (at.indexOf("dp") === 0 ? "dp" : at.replace(/\..*$/, "")) : null);
    wireChoose(); all();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
