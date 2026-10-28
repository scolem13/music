// works-cited-fold.js (in the head of every page) — the Works Cited section (the one holding .works-cited, written by
// scripts/works-cited.py) is moved to the end of the page and its table-of-contents entry to the end of the TOC, and it
// starts folded: click its heading to open it. A TOC click or a link to #works-cited opens it. sections.js leaves it alone (.wc-sec).
(function () {
  if (window.WorksCitedFold) return; window.WorksCitedFold = true;
  function init() {
    var box = document.querySelector(".works-cited"); if (!box) return;
    var sec = box.closest("section[id]"), h = sec && sec.querySelector(":scope > h2, :scope > h3"); if (!sec || !h) return;
    var css = document.createElement("style");
    css.textContent = ".wc-sec>.wc-head{cursor:pointer;user-select:none;position:relative;padding-left:1.4rem}" +
      ".wc-sec>.wc-head::before{content:'\\25B8';position:absolute;left:0;top:.15em;font-size:.75em;color:var(--site-ink-2,#777);transition:transform .15s}" +
      ".wc-sec.wc-open>.wc-head::before{transform:rotate(90deg)}.wc-sec:not(.wc-open)>.wc-body{display:none}.wc-sec:not(.wc-open)>.wc-head{color:var(--site-ink-2,#777)}";
    document.head.appendChild(css);
    // last on the page: after the last section beside it
    var sibs = Array.prototype.filter.call(sec.parentNode.children, function (c) { return c.tagName === "SECTION"; });
    var last = sibs[sibs.length - 1]; if (last !== sec) last.parentNode.insertBefore(sec, last.nextSibling);
    var a = Array.prototype.find.call(document.querySelectorAll("#TOC a"), function (x) { return x.hash === "#" + sec.id; });
    if (a) { var li = a.closest("li"); if (li && li.parentNode) li.parentNode.appendChild(li); }
    var body = document.createElement("div"); body.className = "wc-body";
    while (h.nextSibling) body.appendChild(h.nextSibling);
    sec.appendChild(body); sec.classList.add("wc-sec"); h.classList.add("wc-head");
    h.setAttribute("role", "button"); h.setAttribute("tabindex", "0"); h.setAttribute("aria-expanded", "false"); h.title = "Click to show or hide the sources";
    function set(open) { sec.classList.toggle("wc-open", open); h.setAttribute("aria-expanded", String(open)); }
    h.addEventListener("click", function (e) { if (e.target.closest("a")) return; set(!sec.classList.contains("wc-open")); });
    h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(!sec.classList.contains("wc-open")); } });
    if (a) a.addEventListener("click", function () { set(true); });
    function fromHash() { var t = location.hash && document.getElementById(location.hash.slice(1)); if (t && sec.contains(t)) set(true); }
    window.addEventListener("hashchange", fromHash); fromHash();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
