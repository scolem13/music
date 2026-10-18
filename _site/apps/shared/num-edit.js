// Click the number shown beside a slider to type a value (Enter sets it, Esc cancels, ↑/↓ step, Shift ×10).
// Works on any page: the number is an <output>, or a short text that starts with a digit, sitting near exactly
// one <input type="range"> (same element, or up to three levels up). A slider whose shown number is not its raw
// value (a log scale) can set `range.numEdit = { get: () => shownValue, set: v => {...} }`.
// `data-num-edit="off"` on the number or an ancestor turns it off.
(function () {
  if (window.NumEdit) return;
  var NUM = /^\s*[+\-−–]?\s*(\d|\.\d|∞)/;
  function rangeFor(t) {
    if (!t || t.nodeType !== 1 || t.closest("[data-num-edit=off]")) return null;
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON|A|svg|CANVAS)$/i.test(t.tagName) || t.isContentEditable || t.querySelector("input,select,button,textarea")) return null;
    var txt = t.textContent || "";
    if (t.tagName !== "OUTPUT" && !(txt.length < 18 && NUM.test(txt))) return null;
    for (var p = t.parentElement, i = 0; p && i < 3; p = p.parentElement, i++) {
      var rs = p.querySelectorAll('input[type=range]');
      if (rs.length === 1) return rs[0].disabled ? null : rs[0];
      if (rs.length > 1) return null;
    }
    return null;
  }
  function parse(s) { s = String(s).replace(/−|–/g, "-").replace(/,/g, "").trim(); var m = s.match(/^([+\-]?\d*\.?\d+(?:e[+\-]?\d+)?)\s*(k)?/i); return m ? +m[1] * (m[2] ? 1000 : 1) : NaN; }
  function set(r, v) {
    if (r.numEdit && r.numEdit.set) { r.numEdit.set(v); return; }
    var lo = r.min === "" ? 0 : +r.min, hi = r.max === "" ? 100 : +r.max; r.value = Math.max(lo, Math.min(hi, v));
    r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function get(r) { return r.numEdit && r.numEdit.get ? r.numEdit.get() : +r.value; }
  function tidy(v) { return String(Math.round(v * 1e4) / 1e4); }
  function edit(t, r) {
    var box = document.createElement("input"), cs = getComputedStyle(t);
    box.type = "text"; box.inputMode = "decimal"; box.className = "num-edit-box"; box.value = tidy(get(r));
    box.style.width = Math.max(3.5, box.value.length + 1.5) + "ch"; box.style.font = cs.font;
    box.setAttribute("aria-label", "Type a value");
    var done = false, oldDisp = t.style.display;
    function close(ok) {
      if (done) return; done = true;
      if (ok) { var v = parse(box.value); if (isFinite(v)) set(r, v); }
      box.remove(); t.style.display = oldDisp;
    }
    box.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); close(true); }
      else if (e.key === "Escape") { e.preventDefault(); close(false); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); var st = r.step && r.step !== "any" ? +r.step : (+r.max - +r.min) / 100 || 1;
        if (r.numEdit) st = Math.abs(get(r)) / 50 || st;
        var v = parse(box.value); if (!isFinite(v)) v = get(r);
        set(r, v + (e.key === "ArrowUp" ? 1 : -1) * st * (e.shiftKey ? 10 : 1)); box.value = tidy(get(r));
      }
    });
    box.addEventListener("keyup", function (e) { e.stopPropagation(); });
    box.addEventListener("keypress", function (e) { e.stopPropagation(); });
    box.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); });
    box.addEventListener("blur", function () { close(true); });
    t.style.display = "none"; t.parentNode.insertBefore(box, t.nextSibling); box.focus(); box.select();
  }
  document.addEventListener("click", function (e) {
    var t = e.target; if (t && t.nodeType === 3) t = t.parentElement;
    var r = rangeFor(t); if (!r) return;
    e.preventDefault(); e.stopPropagation(); edit(t, r);
  }, true);
  document.addEventListener("mouseover", function (e) {
    var t = e.target; if (!t || t.nodeType !== 1 || t.classList.contains("num-edit-ok")) return;
    if (rangeFor(t)) { t.classList.add("num-edit-ok"); if (!t.title) t.title = "Click to type a value"; }
  });
  var css = document.createElement("style");
  css.textContent = ".num-edit-ok{cursor:text;text-decoration:underline dotted;text-underline-offset:2px}" +
    ".num-edit-box{display:inline-block;padding:0 .2rem;border:1px solid var(--site-accent,#36c);border-radius:3px;background:var(--site-surface,#fff);color:inherit;text-align:right;min-width:0}";
  (document.head || document.documentElement).appendChild(css);
  window.NumEdit = { rangeFor: rangeFor, edit: edit };
})();
