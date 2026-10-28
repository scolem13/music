// playbar.js — the bar of playing controls fixed to the bottom of the window (PlayBar): the lesson pages and the Backing Track.
// One row, always the same height. When the window is too narrow for everything, the least important controls leave the bar
// and an "Options" button appears; it opens a small panel over the bar holding the controls that left. Nothing is copied: the
// page's own elements are moved, so their ids and listeners go with them.
//
//   PlayBar.attach(bar, { live: function(){ return true while something is playing } }) -> { refit }
//     Each child of `bar` that may leave carries data-pri (0-9: the higher the number, the sooner it leaves), and optionally
//     data-pri-live, its importance while playing (the tempo matters before, Fill now during). A child with neither never leaves:
//     Play and Stop. A child that is hidden takes no room and is left where it is.
//     o.stop = the bar's Stop button: enabled while o.live() or anything reports sound (below); a click stops all of it.
//   PlayBar.sounding(id, stopFn)   a player that has started making sound (score.js, abc-play.js); PlayBar.sounding(id, null) when it ends.
//   PlayBar.stopAll()              stops everything that reported itself
//   PlayBar.swingSlot(opts)   the Swing menu (Auto / 50-75 %) to put in a bar; see below
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
  // what is making sound now, and the Stop buttons of the bars on the page
  var sounds = {}, stops = [];
  function anySound(){ for (var k in sounds) return true; return false; }
  function update(){ stops.forEach(function (f){ f(); }); }
  function sounding(id, fn){ if (fn) sounds[id] = fn; else delete sounds[id]; update(); }
  function stopAll(){ var fs = sounds; sounds = {}; Object.keys(fs).forEach(function (k){ try { fs[k](); } catch (e){} }); update(); }
  function attach(bar, o){
    o = o || {}; css(); bar.classList.add("playbar");
    if (o.stop){ var sb = o.stop;
      stops.push(function (){ sb.disabled = !(anySound() || (o.live && o.live())); });
      sb.addEventListener("click", stopAll); }
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
  // The Swing slot: one menu, Auto (the style's own by tempo, BandPlayer.swingAt) or 50-75 % (50 = even eighths, 67 = triplets).
  //   PlayBar.swingSlot({ value: null | ratio, pri: 4, priLive: 6, onChange: function(ratio | null){} }) -> the element (put it in the bar before attach);
  //   el.set(ratio | null) shows a value without calling onChange. A ratio is 0.5..0.75; null is Auto.
  var SWING_STEPS = [50, 54, 58, 62, 67, 71, 75];
  function swingSlot(o){
    o = o || {};
    var span = document.createElement("span"), lab = document.createElement("label"), sel = document.createElement("select");
    sel.id = o.id || "pb-swing"; lab.htmlFor = sel.id; lab.textContent = "Swing"; sel.title = "How late the off-beat eighth is played: Auto follows the style and slows down the swing as the tempo rises; 50 % is even, 67 % is a triplet";
    var a = document.createElement("option"); a.value = "auto"; a.textContent = "Auto"; sel.appendChild(a);
    SWING_STEPS.forEach(function (p){ var op = document.createElement("option"); op.value = String(p); op.textContent = p + " %"; sel.appendChild(op); });
    span.setAttribute("data-pri", o.pri == null ? 4 : o.pri); span.setAttribute("data-pri-live", o.priLive == null ? 6 : o.priLive);
    span.appendChild(lab); span.appendChild(sel);
    span.set = function (r){ if (r == null) { sel.value = "auto"; return; } var p = Math.round(r * 100), best = SWING_STEPS.reduce(function (m, x){ return Math.abs(x - p) < Math.abs(m - p) ? x : m; }, 50); sel.value = String(best); };
    span.set(o.value == null ? null : o.value);
    sel.addEventListener("change", function (){ if (o.onChange) o.onChange(sel.value === "auto" ? null : +sel.value / 100); });
    return span;
  }
  global.PlayBar = { attach: attach, sounding: sounding, stopAll: stopAll, swingSlot: swingSlot, HEIGHT: HEIGHT };
})(typeof window !== "undefined" ? window : globalThis);
