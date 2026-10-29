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
  function go() { wrap("RhythmChant"); wrap("SolfegeSing"); init(); }
  go();
  if (document.readyState !== "complete") global.addEventListener("load", go);
})(window);
