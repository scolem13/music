// sections.js — makes every level-2 section of a Quarto lesson page collapsible, and makes the page's right-hand
// table of contents ("On this page") a jump bar: a click opens the section if it was folded, scrolls to it and
// flashes it; shift+click also folds every other section. Which sections are folded is remembered per page.
// A link to #some-section (from another page) opens that section too. Include it once, anywhere on the page.
(function () {
  var KEY = "lesson-folds:" + location.pathname;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function init() {
    var main = document.querySelector("main") || document.body;
    var secs = Array.prototype.slice.call(main.querySelectorAll("section.level2[id]:not(.wc-sec)"));
    // the Works Cited section folds by itself (works-cited-fold.js)
    secs = secs.filter(function (s) { return !s.querySelector(".works-cited"); });
    if (!secs.length) return;
    var shut = load();
    var css = document.createElement("style");
    css.textContent =
      "section.level2.ls-sec>h2{cursor:pointer;user-select:none;position:relative;padding-left:1.4rem}" +
      "section.level2.ls-sec>h2::before{content:'\\25B8';position:absolute;left:0;top:.15em;font-size:.75em;color:var(--site-ink-2,#777);transition:transform .15s}" +
      "section.level2.ls-sec:not(.ls-shut)>h2::before{transform:rotate(90deg)}" +
      "section.level2.ls-sec.ls-shut>.ls-body{display:none}" +
      "section.level2.ls-sec.ls-shut>h2{color:var(--site-ink-2,#777)}" +
      "section.level2.ls-lit{outline:3px solid var(--site-accent,#3fc2b4);outline-offset:6px;border-radius:4px}" +
      "#TOC a.ls-shut-link{opacity:.6}" +
      ".ls-all{display:flex;gap:.4rem;margin:.6rem 0 0}.ls-all button{font-size:.75rem}";
    document.head.appendChild(css);

    // Quarto rewrites the TOC's hrefs to full URLs, so match on the fragment
    function link(s) { return Array.prototype.find.call(document.querySelectorAll("#TOC a"), function (a) { return a.hash === "#" + s.id; }) || null; }
    function set(s, open) {
      s.classList.toggle("ls-shut", !open);
      var a = link(s); if (a) a.classList.toggle("ls-shut-link", !open);
      shut[s.id] = !open; save(shut);
      if (open) window.dispatchEvent(new Event("resize"));   // let diagrams and staves that render to width redraw
    }
    function jump(s) {
      set(s, true);
      s.scrollIntoView({ behavior: "smooth", block: "start" });
      s.classList.add("ls-lit"); setTimeout(function () { s.classList.remove("ls-lit"); }, 1400);
      try { history.replaceState(null, "", "#" + s.id); } catch (e) {}
    }

    secs.forEach(function (s) {
      var h = s.querySelector(":scope > h2"); if (!h) return;
      var body = document.createElement("div"); body.className = "ls-body";
      while (h.nextSibling) body.appendChild(h.nextSibling);
      s.appendChild(body); s.classList.add("ls-sec");
      h.setAttribute("role", "button"); h.setAttribute("tabindex", "0"); h.title = "Click to fold or open this section";
      h.addEventListener("click", function (e) { if (e.target.closest("a")) return; set(s, s.classList.contains("ls-shut")); });
      h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(s, s.classList.contains("ls-shut")); } });
      set(s, !shut[s.id]);
      var a = link(s);
      if (a) {
        a.title = "Shift+click: open this and fold every other section";
        a.addEventListener("click", function (e) {
          e.preventDefault();
          if (e.shiftKey) secs.forEach(function (o) { if (o !== s) set(o, false); });
          jump(s);
        });
      }
    });

    var toc = document.querySelector("#TOC");
    if (toc) {
      var bar = document.createElement("div"); bar.className = "ls-all";
      [["Open all", true], ["Fold all", false]].forEach(function (b) {
        var btn = document.createElement("button"); btn.type = "button"; btn.className = "btn btn-sm btn-outline-secondary"; btn.textContent = b[0];
        btn.addEventListener("click", function () { secs.forEach(function (s) { set(s, b[1]); }); });
        bar.appendChild(btn);
      });
      toc.appendChild(bar);
    }
    function fromHash() { var t = location.hash && document.getElementById(location.hash.slice(1)); if (t) { var s = t.closest("section.level2.ls-sec"); if (s) jump(s); } }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
