// stop-bar.js — the MLT pages' bottom strip with a Stop button (PlayBar), lit while anything makes sound, and a click stops all of it.
// AbcPlay and LessonScore already report to PlayBar.sounding; the chant, the sung solfège and Establish do not, so their play()
// is wrapped here (no change to rhythm-chant.js / solfege-sing.js). Needs playbar.js first; load this last.
(function (global) {
  var n = 0;
  function everything() {
    ["Establish", "RhythmChant", "SolfegeSing", "AbcPlay"].forEach(function (k) { var o = global[k]; if (o && o.stop) try { o.stop(); } catch (e) {} });
  }
  function wrap(name) {
    var o = global[name]; if (!o || !o.play || o.play.__pb) return;
    var orig = o.play;
    o.play = function (abc, opts) {
      var P = global.PlayBar, id = "mlt-" + name + "-" + (++n);
      if (!P) return orig.call(o, abc, opts);
      opts = Object.assign({}, opts || {});
      var oe = opts.onEnd; opts.onEnd = function () { P.sounding(id, null); if (oe) oe.apply(this, arguments); };
      var h = orig.call(o, abc, opts);
      if (h && h.stop) { var hs = h.stop; h.stop = function () { P.sounding(id, null); return hs.apply(this, arguments); }; P.sounding(id, everything); }
      return h;
    };
    o.play.__pb = true;
  }
  function init() {
    if (!global.PlayBar || document.getElementById("mlt-stopbar")) return;
    var bar = document.createElement("div"), b = document.createElement("button");
    bar.id = "mlt-stopbar"; b.type = "button"; b.id = "mlt-stop"; b.className = "mlt-stop"; b.textContent = "■ Stop"; b.disabled = true;
    b.title = "Stop whatever is playing";
    bar.appendChild(b); document.body.appendChild(bar);
    PlayBar.attach(bar, { stop: b });
    b.addEventListener("click", everything);
  }
  // A play button turns into a Stop button while its sound lasts: click a button that says ▶ / 🎧 / 👂 / Play / Hear / Listen, and once sound
  // starts (PlayBar.sounding) its label becomes "■ Stop"; a click on it stops everything, and the label returns when the sound ends (a
  // short wait bridges the gaps in a sequence such as Establish's). If no sound starts within 3 s the button is left as it was.
  var PLAYS = /^\s*(\u25b6|\u{1F3A7}|\u{1F442}|\u{1F50A}|Play\b|Hear\b|Listen\b)/u, held = [], timer = 0;
  function anySound() { var P = global.PlayBar; return !!(P && P.isSounding && P.isSounding()); }
  function release(h) { if (h.b.getAttribute("data-stopmode")) { h.b.removeAttribute("data-stopmode"); if (h.b.innerHTML === STOPPED) h.b.innerHTML = h.html; h.b.classList.remove("mlt-stopping"); } }
  var STOPPED = "\u25a0 Stop";
  function tick() {
    var now = Date.now(), live = anySound();
    held = held.filter(function (h) {
      if (!h.b.isConnected) return false;
      if (live) { h.seen = now; if (!h.b.getAttribute("data-stopmode")) { h.html = h.b.innerHTML; h.b.setAttribute("data-stopmode", "1"); h.b.classList.add("mlt-stopping"); h.b.innerHTML = STOPPED; } return true; }
      var started = !!h.b.getAttribute("data-stopmode");
      if (started ? now - h.seen > 800 : now - h.at > 3000) { release(h); return false; }
      return true;
    });
    if (!held.length) { clearInterval(timer); timer = 0; }
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("button"); if (!b || b.id === "mlt-stop" || b.disabled) return;
    var h = held.filter(function (x) { return x.b === b; })[0];
    if (h && b.getAttribute("data-stopmode")) { e.stopImmediatePropagation(); e.preventDefault(); everything(); if (global.PlayBar) PlayBar.stopAll(); release(h); held.splice(held.indexOf(h), 1); return; }
    if (!PLAYS.test(b.textContent || "")) return;
    held = held.filter(function (x) { if (x === h) return true; release(x); return false; });   // only the newest button is the Stop
    if (!h) held.push({ b: b, at: Date.now(), seen: 0, html: "" }); else h.at = Date.now();
    if (!timer) timer = setInterval(tick, 120);
  }, true);
  function go() { wrap("RhythmChant"); wrap("SolfegeSing"); init(); }
  go();
  if (document.readyState !== "complete") global.addEventListener("load", go);
})(window);
