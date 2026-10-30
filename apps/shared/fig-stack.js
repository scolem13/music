// fig-stack.js — figured-bass figures written as superscript + subscript characters (I⁶₄, V⁶₅, Cad⁶₄, vii°⁴₂/V) are drawn
// stacked, the upper figure over the lower, wherever they appear as page text. Loaded on every page from _includes/head.html.
// Unicode puts ⁶ and ₄ side by side; this wraps each pair in <span class="fig-stack"><span>6</span><span>4</span></span>
// (the digits as plain numbers, stacked by CSS), with the original in aria-label so a screen reader still reads "6 4".
// Only text nodes change, so handlers on the surrounding element (a drill's answer button) keep working. Left alone: SVG
// (analysed-scores.js stacks the score's own labels), form fields, code, and anything inside [data-fig-stack="off"].
// Text added later (drills, the score library's notes) is caught by a MutationObserver.
(function () {
  "use strict";
  var SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉", RE = /([⁰¹²³⁴⁵⁶⁷⁸⁹]+)([₀₁₂₃₄₅₆₇₈₉]+)/;
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE|svg|text|tspan)$/i;
  var css = document.createElement("style");
  css.textContent = ".fig-stack{display:inline-flex;flex-direction:column;vertical-align:middle;line-height:.95;font-size:.68em;" +
    "text-align:left;margin-left:.04em;position:relative;top:-.08em}.fig-stack>span{display:block}";
  (document.head || document.documentElement).appendChild(css);
  var plain = function (s, set) { return s.split("").map(function (c) { var i = set.indexOf(c); return i >= 0 ? String(i) : c; }).join(""); };
  function skip(node) {
    for (var e = node.parentNode; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP.test(e.nodeName) || e.namespaceURI === "http://www.w3.org/2000/svg" || e.isContentEditable) return true;
      if (e.classList && e.classList.contains("fig-stack")) return true;
      if (e.getAttribute && e.getAttribute("data-fig-stack") === "off") return true;
    }
    return false;
  }
  function fixText(t) {
    var s = t.nodeValue, m = RE.exec(s); if (!m || skip(t)) return;
    var frag = document.createDocumentFragment(), rest = s;
    while ((m = RE.exec(rest))) {
      if (m.index) frag.appendChild(document.createTextNode(rest.slice(0, m.index)));
      var box = document.createElement("span"), up = document.createElement("span"), down = document.createElement("span");
      box.className = "fig-stack"; box.setAttribute("aria-label", plain(m[1], SUP) + " " + plain(m[2], SUB)); box.setAttribute("role", "text");
      up.textContent = plain(m[1], SUP); down.textContent = plain(m[2], SUB); box.appendChild(up); box.appendChild(down); frag.appendChild(box);
      rest = rest.slice(m.index + m[0].length);
    }
    if (rest) frag.appendChild(document.createTextNode(rest));
    t.parentNode.replaceChild(frag, t);
  }
  function walk(root) {
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || SKIP.test(root.nodeName) || root.namespaceURI === "http://www.w3.org/2000/svg") return;
    if (!RE.test(root.textContent)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) if (RE.test(n.nodeValue)) list.push(n);
    list.forEach(fixText);
  }
  function start() {
    walk(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === "characterData") fixText(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  // FigStack.figs("G: IM65, then Cad64, V6/5/V") -> "G: IM⁶₅, then Cad⁶₄, V⁶₅/V": a Roman numeral's figures written as digits (or with
  // a slash, 6/5) become the superscript / subscript characters, which the observer above then stacks. Only digits straight after a
  // numeral (I-VII, i-vii, N, It, Fr, Ger, Cad, with ° ø + M) change; note names (C4) and plain numbers are left alone.
  var FIG = { "65": "⁶₅", "43": "⁴₃", "42": "⁴₂", "64": "⁶₄", "53": "⁵₃", "6": "⁶", "7": "⁷", "2": "⁴₂", "9": "⁹", "11": "¹¹", "13": "¹³" };
  function figs(text) {
    return String(text).replace(/(^|[^A-Za-z])((?:[♭♯#b]?)(?:Cad|Ger|It|Fr|N|VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?:[°øo+]|M(?=\d))?)(6\/5|4\/3|4\/2|6\/4|5\/3|65|43|42|64|53|13|11|9|7|6|2)(?![\d])/g,
      function (m, pre, rn, f) { return pre + rn + FIG[f.replace("/", "")]; });
  }
  window.FigStack = { walk: walk, figs: figs };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
