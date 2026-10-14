// key-tonality.js — on a lesson page, the tonality of the key chosen in the strip's Key menu (#bl-key), shown beside it and handed
// to the site's shared key (tonality.js), so the navbar's circle of fifths and the other tools follow the lesson.
//
// Needs tonality.js. The key is read from the selected option's text ("F", "B♭", "Dm": a trailing m is a minor key). A page that is
// a blues says so on its Key menu, on <body> or on <html>: data-tonality="blues" (the blues-*.qmd lessons set it on <html>). The label ("F Major (Blues)") goes in a span after the menu's
// own span, read-only. Works whichever lesson engine filled the menu (blues-kit.js, chord-lesson.js, or a page's own script).
(function (global) {
  "use strict";
  function run() {
    var sel = document.getElementById("bl-key"), T = global.Tonality;
    if (!sel || !T) return;
    var holder = sel.closest("span") || sel.parentNode, out = document.createElement("span");
    out.className = "bl-tonality"; out.setAttribute("aria-live", "polite"); out.title = "The tonality of the key chosen (it follows the Key menu).";
    if (holder.getAttribute("data-pri")) out.setAttribute("data-pri", holder.getAttribute("data-pri"));
    if (holder.getAttribute("data-pri-live")) out.setAttribute("data-pri-live", holder.getAttribute("data-pri-live"));
    out.style.cssText = "font-weight:600;white-space:nowrap;align-self:center";
    holder.parentNode.insertBefore(out, holder.nextSibling);
    var flavor = (sel.getAttribute("data-tonality") || document.body.getAttribute("data-tonality") || document.documentElement.getAttribute("data-tonality") || "") === "blues" ? "blues" : "";
    var last = "";
    function update() {
      var o = sel.options[sel.selectedIndex]; if (!o) return;
      var name = o.textContent.trim().replace(/♭/g, "b").replace(/♯/g, "#"), m = /^([A-G][#b]?)(m?)$/.exec(name);
      if (!m) return;
      var key = m[1] + (m[2] ? "m" : ""), t = T.keyToTonality(key); if (!t) return;
      out.textContent = T.label({ resting: t.resting, mode: t.mode, flavor: flavor, tonic: t.tonic });
      if (key + flavor !== last) { last = key + flavor; T.setFromKey(key, "lesson", flavor); }
    }
    sel.addEventListener("change", update);
    new MutationObserver(update).observe(sel, { childList: true });        // the engine fills the menu, and may set it without a change event
    update(); global.addEventListener("load", update); setTimeout(update, 500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})(typeof window !== "undefined" ? window : globalThis);
