// playbar.js — the bar of playing controls fixed to the bottom of the window (PlayBar): the lesson pages and the Backing Track.
// One row, always the same height. When the window is too narrow for everything, the least important controls leave the bar
// and an "Options" button appears; it opens a small panel over the bar holding the controls that left. Nothing is copied: the
// page's own elements are moved, so their ids and listeners go with them.
//
//   PlayBar.attach(bar, { live: function(){ return true while something is playing } }) -> { refit }
//     Each child of `bar` that may leave carries data-pri (0-9: the higher the number, the sooner it leaves), and optionally
//     data-pri-live, its importance while playing (the tempo matters before, Fill now during). A child with neither never leaves:
//     Play and Stop. A child that is hidden takes no room and is left where it is.
//   PlayBar.HEIGHT   the bar's height as a CSS length (pages pad their foot by it)
(function (global) {
  var HEIGHT = "3.4rem";
  function css(){
    if (document.getElementById("playbar-css")) return;
    var st = document.createElement("style"); st.id = "playbar-css"; st.textContent =
      "body{padding-bottom:calc(" + HEIGHT + " + 1.5rem)}"
      + ".playbar{position:fixed;left:0;right:0;bottom:0;z-index:1020;box-sizing:border-box;height:" + HEIGHT + ";margin:0;display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:1rem;"
      +   "padding:0 .8rem;overflow:hidden;background:var(--parch,#f5efe2);border:0;border-top:1px solid var(--parch-edge,#e0d8ce);border-radius:0;box-shadow:0 -6px 18px -12px rgba(0,0,0,.35);font-size:.85rem}"
      + ".playbar>*{flex:0 0 auto;white-space:nowrap}"
      + ".playbar-more{height:1.9rem;padding:0 .6rem;border:1px solid var(--parch-edge,#c9c0b2);border-radius:4px;background:#fff;color:inherit;font:inherit;font-size:.78rem;cursor:pointer}"
      + ".playbar-more[aria-expanded=true]{background:var(--site-accent-dk,#2b9c90);border-color:var(--site-accent-dk,#2b9c90);color:#fff}"
      + ".playbar-pop{position:fixed;right:.6rem;bottom:calc(" + HEIGHT + " + .5rem);z-index:1021;box-sizing:border-box;max-width:min(26rem,calc(100vw - 1.2rem));max-height:calc(100vh - " + HEIGHT + " - 5rem);overflow:auto;"
      +   "display:flex;flex-direction:column;align-items:flex-start;gap:.7rem;padding:.8rem .9rem;background:var(--site-surface,#fff);border:1px solid var(--parch-edge,#c9c0b2);border-radius:8px;box-shadow:0 8px 28px -10px rgba(0,0,0,.45);font-size:.85rem}"
      + ".playbar-pop[hidden],.playbar-more[hidden]{display:none}";
    document.head.appendChild(st);
  }
  function attach(bar, o){
    o = o || {}; css(); bar.classList.add("playbar");
    var items = Array.prototype.map.call(bar.children, function (el, i){ return { el: el, at: i }; });
    var more = document.createElement("button"), pop = document.createElement("div"), busy = false;
    more.type = "button"; more.className = "playbar-more"; more.textContent = "Options"; more.hidden = true; more.setAttribute("aria-expanded", "false"); more.title = "The controls there is no room for in the bar";
    pop.className = "playbar-pop"; pop.hidden = true; pop.setAttribute("role", "group"); pop.setAttribute("aria-label", "More playing controls");
    bar.appendChild(more); bar.parentNode.insertBefore(pop, bar.nextSibling);
    function open(on){ pop.hidden = !on; more.setAttribute("aria-expanded", String(!!on)); }
    more.addEventListener("click", function (){ open(pop.hidden); });
    document.addEventListener("keydown", function (e){ if (e.key === "Escape" && !pop.hidden){ open(false); more.focus(); } });
    document.addEventListener("pointerdown", function (e){ if (!pop.hidden && !pop.contains(e.target) && e.target !== more) open(false); });
    function pri(it){ var live = o.live && o.live(), a = it.el.getAttribute("data-pri"), b = it.el.getAttribute("data-pri-live"), v = live && b != null ? b : a; return v == null ? -1 : +v; }
    function need(){ var cs = getComputedStyle(bar), gap = parseFloat(cs.columnGap) || 0, w = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), n = 0;
      Array.prototype.forEach.call(bar.children, function (c){ if (c.offsetWidth > 0){ w += c.offsetWidth; n++; } }); return w + gap * Math.max(0, n - 1); }
    function refit(){
      if (busy) return; busy = true;
      try {
        items.forEach(function (it){ if (it.el.parentNode !== bar) bar.insertBefore(it.el, more); });       // everything back, in the page's order
        more.hidden = true;
        if (need() > bar.clientWidth + 1){
          more.hidden = false;
          var out = items.filter(function (it){ return pri(it) >= 0; }).sort(function (a, b){ return pri(b) - pri(a) || b.at - a.at; }), moved = [];
          for (var i = 0; i < out.length && need() > bar.clientWidth + 1; i++){ if (out[i].el.offsetWidth === 0) continue; bar.removeChild(out[i].el); moved.push(out[i]); }
          moved.sort(function (a, b){ return a.at - b.at; }).forEach(function (it){ pop.appendChild(it.el); });
        }
        if (more.hidden) open(false);
      } finally { busy = false; }
    }
    if (global.ResizeObserver) new ResizeObserver(refit).observe(bar); else global.addEventListener("resize", refit);
    // a control that appears or goes, or playing that starts or stops, changes what fits and what matters
    if (global.MutationObserver){ var mo = new MutationObserver(function (recs){ if (recs.some(function (r){ return r.target !== more && r.target !== pop; })) refit(); }), cfg = { subtree: true, attributes: true, attributeFilter: ["hidden", "disabled", "data-state"] }; mo.observe(bar, cfg); mo.observe(pop, cfg); }
    refit();
    return { refit: refit, more: more, pop: pop };
  }
  global.PlayBar = { attach: attach, HEIGHT: HEIGHT };
})(typeof window !== "undefined" ? window : globalThis);
