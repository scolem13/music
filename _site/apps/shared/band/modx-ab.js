// modx-ab.js — whole-band A/B between the site's samples and the MODX (gear/modx-ab.qmd, global ModxAB).
// The page's band examples are the lessons' .ar-demo (arrange-kit.js); this only decides where their notes sound. BandModx asks
// routed(inst) before every note, so BandModx.force flips a playing band between the two at once:
//   "site": every instrument forced to the site's samples.
//   "modx": every instrument ticked under Routing on the MODX page forced to the MODX (on its channel; drums on the kit their groove
//           belongs to, modx.js KIT_FOR); the rest stay on the site.
// "Switch every N bars" flips on a timer from the tempo in the bottom strip (not locked to the band's barline: close, not exact).
// Verdicts (Site / MODX / Same) are kept in localStorage "modx-ab", one per example (its heading).
(function (global) {
  var M = null, src = "site", timer = null, LS = "modx-ab";
  function $(id){ return document.getElementById(id); }
  function load(){ try { return JSON.parse(global.localStorage.getItem(LS) || "{}") || {}; } catch (e) { return {}; } }
  function save(v){ try { global.localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }
  function setSource(which){
    M = global.BandModx; if (!M) return;
    if (which === "modx" && !M.connected()){ $("ab-status").textContent = "Connect the MODX first."; return; }
    if (src === "modx" && which === "site") M.stop();          // let go of anything the MODX is holding
    src = which;
    Object.keys(M.cfg.routes).forEach(function (k){ M.force(k, which === "modx" && M.cfg.routes[k].on ? "modx" : "site"); });
    ["site", "modx"].forEach(function (w){ var b = $("ab-" + w); if (b) b.classList.toggle("ab-on", w === which); });
    $("ab-now").textContent = which === "modx" ? "Now: the MODX" : "Now: the site";
  }
  function barMs(){
    var t = $("ar-tempo") || $("ar-tempo-n"), bpm = t && +t.value || 100, playing = document.querySelector(".ar-demo .ar-on");
    var demo = playing && playing.closest(".ar-demo"), meter = (demo && demo.dataset.meter) || "4/4", p = meter.split("/");
    var beats = +p[1] === 8 && +p[0] % 3 === 0 ? +p[0] / 3 : +p[0];
    return beats * 60000 / bpm;
  }
  function auto(on){
    if (timer){ clearTimeout(timer); timer = null; }
    if (!on) return;
    (function next(){ timer = setTimeout(function (){ setSource(src === "site" ? "modx" : "site"); next(); }, barMs() * (+$("ab-bars").value || 2)); })();
  }
  function verdicts(){
    var v = load();
    document.querySelectorAll(".ar-demo").forEach(function (d){
      if (d.nextElementSibling && d.nextElementSibling.classList.contains("ab-verdict")) return;
      var h = d.previousElementSibling; while (h && !/^H[23]$/.test(h.tagName)) h = h.previousElementSibling;
      var id = (h && h.textContent.trim()) || "example", row = document.createElement("div"); row.className = "ab-verdict";
      row.innerHTML = "<span>Better here:</span> " + ["Site", "MODX", "Same"].map(function (x){ return '<button type="button" class="btn btn-sm btn-outline-secondary" data-v="' + x + '">' + x + "</button>"; }).join(" ");
      function mark(){ row.querySelectorAll("button").forEach(function (b){ b.classList.toggle("ab-on", load()[id] === b.dataset.v); }); summary(); }
      row.onclick = function (e){ var x = e.target.dataset && e.target.dataset.v; if (!x) return; var all = load(); all[id] = all[id] === x ? undefined : x; save(all); mark(); };
      d.parentNode.insertBefore(row, d.nextSibling); mark();
    });
  }
  function summary(){
    var v = load(), keys = Object.keys(v).filter(function (k){ return v[k]; }), el = $("ab-summary"); if (!el) return;
    if (!keys.length){ el.textContent = "No choices yet: the buttons under each example keep them."; return; }
    var n = { Site: 0, MODX: 0, Same: 0 }; keys.forEach(function (k){ n[v[k]]++; });
    el.innerHTML = "MODX " + n.MODX + " · Site " + n.Site + " · Same " + n.Same + "<br>" + keys.map(function (k){ return k + ": <b>" + v[k] + "</b>"; }).join(" · ");
  }
  function init(){
    M = global.BandModx;
    var st = $("ab-status");
    function show(){ st.textContent = M && M.connected() ? "Connected: " + M.portName() : "Not connected"; }
    if (M){ M.onChange(show); show(); }
    $("ab-connect").onclick = function (){ M.connect().then(show, function (e){ st.textContent = e.message; }); };
    $("ab-site").onclick = function (){ setSource("site"); };
    $("ab-modx").onclick = function (){ setSource("modx"); };
    $("ab-auto").onchange = function (){ auto(this.checked); };
    document.addEventListener("keydown", function (e){ if (e.key === "m" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) setSource(src === "site" ? "modx" : "site"); });
    setSource("site"); verdicts();
    global.addEventListener("pagehide", function (){ auto(false); if (M) Object.keys(M.cfg.routes).forEach(function (k){ M.force(k, null); }); });
  }
  global.ModxAB = { init: init, setSource: setSource, source: function (){ return src; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
