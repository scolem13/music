// DegreeCaret: scale-degree numbers (1̂ 2̂ … written with the combining caret U+0302) drawn cleanly in HTML.
// Many fonts put the combining caret off-centre or too low, so every "digit + U+0302" in the page's text becomes
// <span class="sd-caret">digit</span>, and CSS draws a plain ^ centred over the digit (circle-of-fifths.js does the same on canvas).
// Runs on load and watches for text added later (drills, the Drone's tanpura buttons). Leaves <svg>, <canvas>, form controls,
// scripts and editable text alone; in an <option> (which can't hold a span) the caret is moved in front: "^5".
// Loaded on every page by _includes/practice-widgets.html.
(function () {
  "use strict";
  if (window.DegreeCaret) return;
  var RE = /(\d)̂/g, SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SVG|CANVAS|CODE|PRE|NOSCRIPT)$/i;

  var css = document.createElement("style");
  css.textContent =
    ".sd-caret{position:relative;display:inline-block;line-height:inherit}" +
    ".sd-caret::before{content:'^';position:absolute;left:50%;top:-.3em;transform:translateX(-50%);font-size:.72em;line-height:1;pointer-events:none}";
  document.head.appendChild(css);

  function skip(n) {
    for (var e = n.parentNode; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP.test(e.nodeName) || e.isContentEditable || e.namespaceURI === "http://www.w3.org/2000/svg") return true;
    }
    return false;
  }
  function fixText(t) {
    var s = t.nodeValue;
    if (s.indexOf("̂") < 0 || !t.parentNode || skip(t)) return;
    if (t.parentNode.nodeName === "OPTION") { t.nodeValue = s.replace(RE, "^$1"); return; }
    var frag = document.createDocumentFragment(), last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      var sp = document.createElement("span"); sp.className = "sd-caret"; sp.textContent = m[1];
      frag.appendChild(sp); last = RE.lastIndex;
    }
    if (!last) return;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    t.parentNode.replaceChild(frag, t);
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) if (n.nodeValue.indexOf("̂") >= 0) list.push(n);
    list.forEach(fixText);
  }
  function start() {
    scan(document.body);
    new MutationObserver(function (recs) {
      recs.forEach(function (r) {
        if (r.type === "characterData") fixText(r.target);
        else Array.prototype.forEach.call(r.addedNodes, scan);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.DegreeCaret = { scan: scan };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
