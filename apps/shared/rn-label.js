// rn-label.js (global RNLabel): Roman-numeral labels drawn by abcjs (text.abcjs-annotation), made readable.
//   RNLabel.tidy(root)   labels with DCML additions ("V2[no3][add4]/IV") show the chord alone ("V⁴₂/IV"); the
//                        additions move to a tooltip on hover ("no 3rd, add 4th"). Then figures are stacked (I⁶₄: 6 over 4).
//   RNLabel.watch(root)  tidy now and again whenever more is drawn (pages that draw a system at a time)
(function (global) {
  var NS = "http://www.w3.org/2000/svg", SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉";
  var FIG = { "65": "⁶₅", "43": "⁴₃", "42": "⁴₂", "64": "⁶₄", "2": "⁴₂", "6": "⁶", "7": "⁷", "9": "⁹" };
  function nth(n) { n = +n; var s = n % 100 > 10 && n % 100 < 14 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"; return n + s; }
  function acc(a) { return a.replace(/#/g, "♯").replace(/b/g, "♭"); }
  // one label: { text, tip } (tip "" when there is nothing in brackets)
  function clean(s) {
    var tips = [];
    var text = s.replace(/\[([^\]]*)\]/g, function (m, inner) {
      inner.replace(/(no|add)([#b]*)(\d+)/g, function (x, kind, a, n) { tips.push((kind === "no" ? "no " : "add ") + acc(a) + (+n === 1 ? "root" : nth(n))); return x; });
      return "";
    });
    if (!tips.length) return { text: s, tip: "" };
    text = text.replace(/^(.*?:\s*)?([^/]*?)(65|43|42|64|6|7|9|2)(?=\/|$)/, function (m, key, a, f) { return (key || "") + a + FIG[f]; });
    return { text: text, tip: tips.join(", ") };
  }
  // the label as drawn, without its hover title
  function label(t) { return [].filter.call(t.childNodes, function (n) { return n.nodeName !== "title"; }).map(function (n) { return n.textContent; }).join(""); }
  function stack(t) {
    var title = t.querySelector("title"), s = label(t), m = /^(.*?)([⁰-⁹¹²³]+)([₀-₉]+)(.*)$/.exec(s); if (!m) return;
    var ts = t.querySelector("tspan"), x = ts ? ts.getAttribute("x") : t.getAttribute("x");
    while (t.firstChild) t.removeChild(t.firstChild);
    if (title) t.appendChild(title);
    var digits = function (str, set) { return str.split("").map(function (c) { var i = set.indexOf(c); return i >= 0 ? String(i) : c; }).join(""); };
    var base = document.createElementNS(NS, "tspan"); if (x) base.setAttribute("x", x); base.textContent = m[1]; t.appendChild(base);
    var up = document.createElementNS(NS, "tspan"); up.setAttribute("font-size", "70%"); up.setAttribute("dy", "-0.42em"); up.textContent = digits(m[2], SUP); t.appendChild(up);
    var down = document.createElementNS(NS, "tspan"); down.setAttribute("font-size", "70%"); down.setAttribute("dy", "0.9em"); down.textContent = digits(m[3], SUB); t.appendChild(down);
    var w = up.getComputedTextLength(); down.setAttribute("dx", (-w).toFixed(2));
    if (m[4]) { var rest = document.createElementNS(NS, "tspan"); rest.setAttribute("dy", "-0.336em"); rest.setAttribute("dx", Math.max(0, w - down.getComputedTextLength()).toFixed(2)); rest.textContent = m[4]; t.appendChild(rest); }
  }
  function tidy(root) {
    (root || document).querySelectorAll("text.abcjs-annotation:not([data-rn])").forEach(function (t) {
      t.setAttribute("data-rn", "");
      var c = clean(t.textContent);
      if (c.tip) {
        var ts = t.querySelector("tspan"); (ts || t).textContent = c.text;
        var title = document.createElementNS(NS, "title"); title.textContent = c.tip; t.insertBefore(title, t.firstChild);
        t.style.cursor = "help";
      }
      stack(t);
    });
  }
  function watch(root) {
    root = typeof root === "string" ? document.querySelector(root) : root; if (!root) return;
    tidy(root); var busy = false;
    new MutationObserver(function () { if (busy) return; busy = true; requestAnimationFrame(function () { busy = false; tidy(root); }); }).observe(root, { childList: true, subtree: true });
  }
  global.RNLabel = { clean: clean, tidy: tidy, watch: watch };
})(window);
