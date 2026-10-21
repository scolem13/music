// section-fold.js: every ## section of a Quarto page folds from a ▾ in its heading. A link to a section (the page's
// "On this page" sidebar, or any #anchor) opens it first. Folded sections are kept per page in localStorage.
//   <script src="/apps/shared/section-fold.js?v=1"></script>   (the page has toc: true, so the sidebar lists the sections)
(function () {
  "use strict";
  var KEY = "section-fold:" + location.pathname;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  var css = document.createElement("style");
  css.textContent = "section.sf>h2{cursor:pointer;user-select:none}" +
    ".sf-tog{border:0;background:none;padding:0 .4rem 0 0;font:inherit;color:inherit;opacity:.55;display:inline-block;transition:transform .15s}" +
    "section.sf-shut>.sf-tog-h .sf-tog{transform:rotate(-90deg)}" +
    "section.sf-shut>:not(h2){display:none!important}" +
    "section.sf-shut>h2{opacity:.8}";
  document.head.appendChild(css);
  function init() {
    var state = load(), secs = [].slice.call(document.querySelectorAll("main section.level2[id]"));
    secs.forEach(function (sec) {
      var h = sec.querySelector(":scope>h2"); if (!h) return;
      sec.classList.add("sf"); h.classList.add("sf-tog-h");
      var b = document.createElement("button"); b.type = "button"; b.className = "sf-tog"; b.textContent = "▾"; b.setAttribute("aria-label", "Fold or open this section");
      h.insertBefore(b, h.firstChild);
      function set(shut, keep) {
        sec.classList.toggle("sf-shut", shut); b.setAttribute("aria-expanded", String(!shut));
        if (keep) { state[sec.id] = shut ? 1 : 0; if (!shut) delete state[sec.id]; save(state); }
        if (!shut) window.dispatchEvent(new Event("resize"));   // scores inside lay themselves out again
      }
      sec._sfSet = set;
      if (state[sec.id]) set(true);
      h.addEventListener("click", function (e) { if (e.target.closest("a.anchorjs-link")) return; set(!sec.classList.contains("sf-shut"), true); });
    });
    function openFor(hash) {
      if (!hash || hash.length < 2) return;
      var t = document.getElementById(decodeURIComponent(hash.slice(1))); if (!t) return;
      var sec = t.closest("section.sf"); if (sec && sec.classList.contains("sf-shut")) sec._sfSet(false, true);
    }
    document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) openFor(a.getAttribute("href")); }, true);
    window.addEventListener("hashchange", function () { openFor(location.hash); });
    openFor(location.hash);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
