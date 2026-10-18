// help-eye.js (the i button) — long instruction paragraphs, folded away behind a small lower-case i in a circle button (in the head of every page).
// A paragraph counts when its class is a hint / note (bt-hint, nt-hint, ce-hint, field-hint, pw-note, sn-note ...) and its text
// is long (MIN characters). Warnings (*-warn), live status lines (aria-live) and anything marked data-help-eye="off" stay as they are.
// The button sits just before the paragraph; clicking it shows or hides that paragraph. Text a page writes in later is
// picked up too (a MutationObserver). Folded with a class, so a page's own `hidden` on the paragraph still works (the eye follows it).
(function () {
  if (window.HelpEye) return;
  var MIN = 160, SEL = '[class*="hint"], [class*="-note"], .note';
  var css = ".he-btn{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:1.35rem;height:1.35rem;padding:0;margin:.55rem 0 .45rem;" +
    "border:1.5px solid currentColor;border-radius:50%;background:none;color:var(--site-ink-2,#6c757d);cursor:pointer;opacity:.6;" +
    "font:italic 700 .85rem/1 Georgia,'Times New Roman',serif;transition:opacity .15s,color .15s}" +
    ".he-btn:hover,.he-btn:focus-visible,.he-btn[aria-expanded=true]{opacity:1;color:var(--site-accent,#1f8a7a)}" +
    ".he-btn:first-child{margin-top:0}.he-btn[aria-expanded=true]{margin-bottom:.2rem}.he-shut{display:none!important}";
  var EYE = '<span aria-hidden="true" style="margin-top:1px">i</span>';
  var items = [];

  function eligible(el) {
    if (el.dataset.helpEye === "off" || el.closest("[data-help-eye=off]") || el.hasAttribute("aria-live") || el.getAttribute("role") === "status") return false;
    if (/(^|\s)\S*warn\S*/.test(el.className) || /^(BUTTON|LABEL|SPAN|SMALL|INPUT|SELECT|OPTION|TEXTAREA|SVG)$/i.test(el.tagName)) return false;
    if (el.closest(".he-btn")) return false;
    return (el.textContent || "").replace(/\s+/g, " ").trim().length >= MIN;
  }
  function attach(el) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "he-btn"; b.innerHTML = EYE;
    b.title = "Show the instructions"; b.setAttribute("aria-label", "Show the instructions"); b.setAttribute("aria-expanded", "false");
    b.onclick = function (e) {
      e.stopPropagation(); e.preventDefault();
      var open = el.classList.toggle("he-shut") === false;
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.title = open ? "Hide the instructions" : "Show the instructions"; b.setAttribute("aria-label", b.title);
      b.blur();
    };
    el.classList.add("he-shut"); el.dataset.helpEye = "on";
    el.parentNode.insertBefore(b, el);
    items.push({ el: el, b: b });
  }
  function scan() {
    document.querySelectorAll(SEL).forEach(function (el) { if (!el.dataset.helpEye && el.parentNode && eligible(el)) attach(el); });
    items = items.filter(function (it) {
      if (!it.el.isConnected) { it.b.remove(); return false; }
      if (!it.b.isConnected && it.el.parentNode) it.el.parentNode.insertBefore(it.b, it.el);   // a page re-drew around it
      if (it.b.hidden !== it.el.hidden) it.b.hidden = it.el.hidden;                           // the page's own hiding wins
      return true;
    });
  }
  var t = null;
  function soon() { if (!t) t = setTimeout(function () { t = null; scan(); }, 50); }
  function start() {
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    scan();
    new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
  }
  window.HelpEye = { scan: scan };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
