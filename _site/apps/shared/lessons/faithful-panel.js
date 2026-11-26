// FaithfulPanel: a drawing of an instrument's real control panel (its layout, section boxes, legends), every control placed
// where the real one is, each bound to a SynthCompare profile key so it drives the same engine and the same patch
// translations as the Simple panel (SynthCompare's grouped knobs). Drawn as one SVG on a plain white or black background
// (no photo textures); a Light / Dark toggle on every panel, default the OS theme, kept site-wide in localStorage `panel-theme`.
//
// ADDING A PANEL (for any instrument with a SynthCompare profile):
//   1. Write apps/shared/lessons/panels/<profile id>.js calling FaithfulPanel.register(LAYOUT) (format below).
//   2. Add the id to FaithfulPanel.AVAILABLE here. Pages that load synth-compare.js and this file then show it as the
//      default "Panel" view of that synth (with "Simple" one click away); the layout file is fetched on first use.
//   3. Run `node tests/lessons/faithful-panel.cdp.js`: it checks every bound key exists in the profile, for every layout.
//   Cite where the positions come from (manual page, skin file, photo) in the layout's `src` and in scripts/sources/.
//
// LAYOUT = { id: profile id, name, w, h (panel units; the SVG viewBox), src: ["where the positions come from", ...],
//   approx: "what is guessed" (shown under the panel),
//   colors: { dark: {...}, light: {...} }  (optional; keys below override the defaults in BASE),
//      bg (panel background: keep plain #000 / #fff family), body (section fill), head (section heading strip), ink (text),
//      ink2 (dim text), line (borders), track (unlit arc / slider track), screen (display background), wave (display line)
//   accents: { name: colour } (the layout's colour accents: knob arcs, caps; they must read on both backgrounds),
//   accent: default accent name,  knob: "arc" (software: value arc round a dark body) | "cap" (hardware: skirted knob with a
//   coloured cap and a pointer; item `cap` picks the cap colour) ,
//   items: [ ... ] drawn in order (later on top) }
// ITEMS (x, y, w, h in panel units; `a` = accent name; `k` = profile control key; `label` = the legend printed on the panel):
//   { t: "section", x, y, w, h, label, a, head: 18 (heading strip height, 0 = none), vertical: true (label up the left side) }
//      title: "top" | "border" (instead of a heading strip: the label centred inside the top edge, or centred ON the top border
//      line with a gap behind it, as hardware panels print them; `size` = its font size; implies head 0)
//   { t: "label", x, y, text, size, anchor: "start"|"middle"|"end", dim: true, rot: -90 }
//   { t: "jack", x, y, r, label, size }   a patch point / socket drawn as decoration (never live)
//   { t: "knob", k, x, y (centre), r, label, cap, a, fmt(v) -> text }          drag up / down, wheel, arrow keys, dbl-click = default
//   { t: "hslider" | "vslider", k, x, y, w, h, label, a, fmt }                   Surge-style: drag along the slider
//   { t: "switch", k, x, y, w, h, label, a }   a boolean key: click toggles (an LED-lit button)
//   { t: "select", k, x, y, w, h, label, names: { value: text } }   a choice key: click = next, Shift-click / wheel = back / on
//   { t: "seg", k, x, y, w, h, opts: [[value, text], ...] }          a choice key drawn as a row of cells, one lit
//   { t: "display", x, y, w, h, draw: "wave:<frameKey>" | "env:<A>,<D>,<S>,<R>" | "filter:<cutKey>,<resKey>" | "lfo:<shapeKey>"
//        | function (get, w, h) -> [path d, ...], label, a }   a screen drawn from the knob numbers (schematic, not measured)
//   { t: "button", x, y, w, h, label, on: true }   a printed button / tab with no key (always inert)
//   { t: "keys", x, y, w, h, n: white keys }       a keyboard drawing (decoration; play from the keys under the panel)
//   { t: "button", go: "<page>", ... }   a tab: shows the items with `page: "<page>"` and hides other pages (LAYOUT.page = the first one);
//   any item may carry `page`; items without one are always shown.
// Values print through the layout's `fmt`, else the profile's hint(key, v) (the real plug-in's reading), else the number.
// LAYOUT.envTime(key, v) -> seconds and LAYOUT.susMax read envelope knobs for "env:" displays.
// A control whose key is missing from the profile (or that has none) is drawn but inert: dimmed, tooltip "not modelled".
// Knob / slider ranges, steps and defaults are the profile's own ([key, label, "k", min, max, step] in PROFILES[id].groups).
//
// OTHER HOSTS (drum machines, sequencers: 2026-11-26): mount(host, { id, adapter: { get(k), set(k, v), range(k), onChange(cb)? },
//   readonly, commit() }) binds the same items to any host. range(k) -> [k, label, "k" (number) | "s" (boolean) | "c" (choice),
//   min | [choices], max, step, default] or null (= not modelled, drawn dimmed). While a drag is held the host should only
//   refresh; `commit` is called on pointer-up after a drag (FaithfulPanel.busy() is true during one). Extra items for them:
//   { t: "step", k: "step:<i>", i, x, y, w, h, label, cap }  a step key with its LED; get(k) -> { on, acc, text } ; click -> set(k, {shift, alt})
//      the playing step is lit by me.cur(i) (or get("cur") at refresh): an amber ring, the real machines' running light
//   { t: "key", k, v, x, y, w, h, label, below: true, cap, led: true }  a button: click -> set(k, v); lit (LED / fill) while get(k) === v
//      (or, for a boolean key with no v, while get(k) is true: click toggles)
//   { t: "lcd", k, x, y, w, h, size, seg: true }  a display showing the text get(k) (lines split at "\n"; seg = LED digits)
//   FaithfulPanel.checkAdapter(layout, adapter) -> [bound keys the adapter does not know]
// GUITARS (2026-11-26): layouts panels/gt-<id>.js bound to GuitarPickups.adapter (apps/shared/lessons/guitar-pickups.js); extra item
//   { t: "shape", d: SVG path, fill / stroke: a colour token (bg body head ink ink2 line track screen wave) or a colour, sw, op, title }  decoration only
// API: FaithfulPanel.mount(host, { id, profile, get(key), set(key, value) }) -> { refresh(key?), el, layout, ctl: {key: element} }
//   FaithfulPanel.load(id) -> Promise(layout)   .has(id)   .register(layout)   .check(layout, profile) -> [missing keys]
//   .theme() -> "light"|"dark"   .setTheme(t)   .view() / .setView("panel"|"simple") (localStorage `synth-face-view`)
(function () {
  var FP = window.FaithfulPanel = window.FaithfulPanel || {};
  FP.AVAILABLE = ["vital", "surge", "ppg", "p6", "taurus", "voyager", "sub37", "grandmother", "memorymoog", "moog", "prophet", "tb303", "juno", "arp2600", "obxa", "ms20", "dx7"];
  FP.LAYOUTS = FP.LAYOUTS || {};
  var NS = "http://www.w3.org/2000/svg", THEME_KEY = "panel-theme", VIEW_KEY = "synth-face-view";
  var BASE = {
    dark: { bg: "#000000", body: "#1b1d20", head: "#2a2d31", ink: "#e8e8e8", ink2: "#9aa0a6", line: "#3a3e43", track: "#3a3e43", screen: "#0b0c0e", wave: "#e8e8e8" },
    light: { bg: "#ffffff", body: "#f2f3f5", head: "#e2e4e8", ink: "#16181b", ink2: "#5b6168", line: "#c4c8ce", track: "#cdd1d6", screen: "#ffffff", wave: "#16181b" }
  };
  var scr = document.currentScript, BASEURL = scr && scr.src ? scr.src.replace(/[^\/]*$/, "") : "/apps/shared/lessons/";
  var mounted = [], loading = {};

  function S(tag, at, kids) { var e = document.createElementNS(NS, tag); for (var a in at || {}) if (at[a] != null) e.setAttribute(a, at[a]); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function T(x, y, text, at) { var e = S("text", Object.assign({ x: x, y: y }, at || {})); e.textContent = text; return e; }
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- theme and view, one choice each for the whole site ----------
  FP.theme = function () {
    var t = null; try { t = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  FP.setTheme = function (t) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} mounted.forEach(function (m) { m.paint(); }); };
  FP.view = function () { var v = null; try { v = localStorage.getItem(VIEW_KEY); } catch (e) {} return v === "simple" ? "simple" : "panel"; };
  FP.setView = function (v) { try { localStorage.setItem(VIEW_KEY, v); } catch (e) {} };
  if (window.matchMedia) try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { mounted.forEach(function (m) { m.paint(); }); }); } catch (e) {}

  // ---------- layouts ----------
  FP.has = function (id) { return FP.AVAILABLE.indexOf(id) >= 0 || !!FP.LAYOUTS[id]; };
  FP.register = function (L) { FP.LAYOUTS[L.id] = L; if (loading[L.id]) { loading[L.id].res(L); } };
  FP.load = function (id) {
    if (FP.LAYOUTS[id]) return Promise.resolve(FP.LAYOUTS[id]);
    if (!loading[id]) { var d = {}; d.p = new Promise(function (res, rej) { d.res = res; d.rej = rej; }); loading[id] = d;
      var s = document.createElement("script"); s.src = BASEURL + "panels/" + id + ".js"; s.onerror = function () { d.rej(new Error("no panel " + id)); }; document.head.appendChild(s); }
    return loading[id].p;
  };
  function ctlMap(P) { var C = {}; (P && P.groups || []).forEach(function (g) { g[2].forEach(function (c) { C[c[0]] = c; }); }); return C; }
  FP.check = function (L, P) { var C = ctlMap(P), miss = [];
    L.items.forEach(function (it) { if (it.k && !C[it.k]) miss.push(it.k); }); return miss; };
  FP.checkAdapter = function (L, A) { var miss = []; L.items.forEach(function (it) { if (it.k && !A.range(it.k)) miss.push(it.k); }); return miss; };
  var busy = 0; FP.busy = function () { return busy > 0; };
  FP.bound = function (L) { return L.items.filter(function (it) { return it.k; }).map(function (it) { return it.k; }); };

  // ---------- styles (once) ----------
  function css() {
    if (document.getElementById("fp-css")) return;
    var st = document.createElement("style"); st.id = "fp-css";
    st.textContent = ".fp-w{background:var(--fp-bg);color:var(--fp-ink);border:1px solid var(--fp-line);border-radius:6px;padding:6px;margin:.4rem 0}" +
      ".fp-bar{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;font-size:.8rem;margin:0 0 4px;color:var(--fp-ink2)}" +
      ".fp-bar button{font:inherit;background:var(--fp-body);color:var(--fp-ink);border:1px solid var(--fp-line);border-radius:4px;padding:1px 8px;cursor:pointer}" +
      ".fp-scroll{overflow-x:auto;max-width:100%}.fp-svg{display:block;width:100%;min-width:760px;height:auto;user-select:none;-webkit-user-select:none;touch-action:none}" +
      ".fp-svg text{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;fill:var(--fp-ink)}.fp-svg .fp-dim{fill:var(--fp-ink2)}" +
      ".fp-c{cursor:ns-resize;outline:none}.fp-c.fp-h{cursor:ew-resize}.fp-c.fp-click{cursor:pointer}.fp-c:focus-visible .fp-focus{stroke:var(--fp-ink);stroke-width:1.5;stroke-dasharray:3 2}" +
      ".fp-ro .fp-c{pointer-events:none}.fp-step.fp-now .fp-ring{stroke:#ffb000;stroke-width:3}" +
      ".fp-off{opacity:.38;cursor:help}.fp-c.fp-hl .fp-focus,.fp-c.fp-lit .fp-focus{stroke:#e8a400;stroke-width:2.5}.fp-note{font-size:.75rem;color:var(--fp-ink2);margin:4px 2px 0}" +
      ".scmp-vw{display:inline-flex;border:1px solid #999;border-radius:5px;overflow:hidden;margin-left:.4rem}.scmp-vw .sp-opt{all:unset;cursor:pointer;padding:.1rem .45rem;font-size:.78rem}.scmp-vw .sp-opt.sp-on{background:#333;color:#fff}.scmp-face[hidden],.scmp-groups[hidden]{display:none}" +
      ".fp-hostbar{display:flex;align-items:center;gap:.3rem;font-size:.78rem;margin:.3rem 0 0}.fp-face[hidden]{display:none}";
    document.head.appendChild(st);
  }

  // ---------- small pictures for displays ----------
  var VT_SHAPES = function (ph, f) {   // Vital's basic-shapes table read as sine -> triangle -> square -> saw across frames 0..256
    var s = clamp(f, 0, 256) / 256 * 3, i = Math.min(2, Math.floor(s)), u = s - i;
    function w(n, p) { p = p - Math.floor(p);
      if (n === 0) return Math.sin(2 * Math.PI * p); if (n === 1) return p < .25 ? 4 * p : p < .75 ? 2 - 4 * p : 4 * p - 4;
      if (n === 2) return p < .5 ? 1 : -1; return 1 - 2 * ((p + .5) % 1); }
    return w(i, ph) * (1 - u) + w(i + 1, ph) * u;
  };
  function drawDisplay(it, get, P) {
    var w = it.w, hh = it.h, pad = 6, out = [];
    if (typeof it.draw === "function") return it.draw(get, w, hh);
    var m = /^(\w+):?(.*)$/.exec(it.draw || ""), kind = m ? m[1] : "", ks = m && m[2] ? m[2].split(",") : [];
    var y = function (v) { return hh / 2 - v * (hh / 2 - pad); }, d = "", i;
    if (kind === "wave") { var f = +get(ks[0]) || 0;
      for (i = 0; i <= 120; i++) d += (i ? "L" : "M") + (pad + i / 120 * (w - 2 * pad)).toFixed(1) + " " + y(VT_SHAPES(i / 120 * 2, f) * .85).toFixed(1);
      out.push(d); }
    else if (kind === "lfo") { var sh = get(ks[0]) || "sine";
      for (i = 0; i <= 120; i++) { var p = i / 120 * 2 % 1, v = sh === "tri" ? (p < .25 ? 4 * p : p < .75 ? 2 - 4 * p : 4 * p - 4) : sh === "square" ? (p < .5 ? 1 : -1) : sh === "saw" ? 1 - 2 * p : sh === "sh" ? [.6, -.3, .9, -.7, .2, -.9, .4, -.1][Math.floor(i / 15) % 8] : Math.sin(2 * Math.PI * p);
        d += (i ? "L" : "M") + (pad + i / 120 * (w - 2 * pad)).toFixed(1) + " " + y(v * .8).toFixed(1); }
      out.push(d); }
    else if (kind === "env") {   // A D S R keys; time read through the layout's `envTime(key, v) -> seconds` (else v as seconds)
      var L = it._L, tm = function (k) { var v = +get(k) || 0; return L && L.envTime ? L.envTime(k, v) : v; }, sv = (+get(ks[2]) || 0) / (L && L.susMax || 100);
      var ax = function (t) { return Math.log(1 + t * 8) / Math.log(1 + 16 * 8); }, u = (w - 2 * pad) / 3.4, bot = hh - pad, top = pad;
      var Y = function (v) { return bot - v * (bot - top); };
      var x1 = pad + ax(tm(ks[0])) * u, x2 = x1 + ax(tm(ks[1])) * u, x3 = x2 + u * .7, x4 = x3 + ax(tm(ks[3])) * u;
      out.push("M" + pad + " " + Y(0) + "L" + x1 + " " + Y(1) + "Q" + x1 + " " + Y(sv) + " " + x2 + " " + Y(sv) + "L" + x3 + " " + Y(sv) + "Q" + x3 + " " + Y(0) + " " + Math.min(w - pad, x4) + " " + Y(0)); }
    else if (kind === "filter") {   // a schematic resonant low-pass: cutoff read as a fraction of its own knob range
      var C = ctlMap(P), ck = C[ks[0]], rk = C[ks[1]], fc = ck ? (get(ks[0]) - ck[3]) / (ck[4] - ck[3]) : .5, q = rk ? (get(ks[1]) - rk[3]) / (rk[4] - rk[3]) : .2;
      for (i = 0; i <= 80; i++) { var xx = i / 80, r = Math.pow(10, (xx - fc) * 3), g = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / (0.6 + q * 8), 2));
        var db = clamp(20 * Math.log10(g * g), -40, 18); d += (i ? "L" : "M") + (pad + xx * (w - 2 * pad)).toFixed(1) + " " + (pad + (18 - db) / 58 * (hh - 2 * pad)).toFixed(1); }
      out.push(d); }
    return out;
  }

  // ---------- a panel inside a host that redraws itself (drum-compare.js, sequencer-compare.js) ----------
  // FP.attachFace(box, layoutId, adapter, { readonly, at: element to insert before (else appended), label }) -> holder
  //   Keeps one mounted panel per box + layout across the host's redraws (the host may empty the box: the same element is put
  //   back, focus restored), adds a Panel / Simple switch (localStorage `machine-face-view`, Panel by default) and sets class
  //   `fp-panelview` on the box in Panel view so the host's CSS can hide its plain controls. holder.m = the mount (once loaded),
  //   holder.ready = Promise. The adapter may be replaced on every redraw (holder.A).
  FP.GUITARS = ["gt-strat", "gt-tele", "gt-lespaul", "gt-sg"];
  FP.MACHINES = ["dm-tr808", "dm-tr909", "dm-linn", "dm-mpc60", "sq-a960", "sq-tb303", "sq-mc202", "sq-mc4", "sq-elektron"];
  var MVIEW = "machine-face-view";
  FP.mview = function () { var v = null; try { v = localStorage.getItem(MVIEW); } catch (e) {} return v === "simple" ? "simple" : "panel"; };
  FP.setMview = function (v) { try { localStorage.setItem(MVIEW, v); } catch (e) {} [].forEach.call(document.querySelectorAll(".fp-hostbox"), function (b) { b._fpApply && b._fpApply(); }); };
  FP.attachFace = function (box, lid, A, opt) {
    opt = opt || {}; css();
    var cache = box._fpc || (box._fpc = {}), key = lid + (opt.readonly ? ":ro" : ""), H = cache[key];
    if (!H) { H = cache[key] = { div: h("div", "fp-face"), m: null, A: A };
      var ad = { get: function (k) { return H.A.get(k); }, set: function (k, v) { if (!opt.readonly) H.A.set(k, v); }, range: function (k) { return H.A.range(k); } };
      H.ready = FP.load(lid).then(function () { H.m = FP.mount(H.div, { id: lid, adapter: ad, readonly: opt.readonly, commit: function () { H.A.commit && H.A.commit(); } }); return H.m; }); }
    H.A = A;
    var act = document.activeElement, fk = act && H.div.contains(act) && act.dataset ? act.dataset.ctl : (!act || act === document.body) && FP._last && H.m && FP._last.el === H.m.el && Date.now() - FP._last.t < 1500 ? FP._last.k : null;
    var seg = h("span", "sp-seg scmp-vw fp-vw"); seg.setAttribute("aria-label", "Panel view");
    [["panel", "Panel"], ["simple", "Simple"]].forEach(function (v) { var b = h("button", "sp-opt", v[1]); b.type = "button"; b.dataset.v = v[0]; b.onclick = function () { FP.setMview(v[0]); }; seg.appendChild(b); });
    var bar = h("div", "fp-hostbar"); bar.appendChild(h("span", "fp-hostlab", opt.label || "View")); bar.appendChild(seg);
    if (opt.at && opt.at.parentNode === box) { box.insertBefore(bar, opt.at); box.insertBefore(H.div, opt.at); } else { box.appendChild(bar); box.appendChild(H.div); }
    box.classList.add("fp-hostbox");
    box._fpApply = function () { var pv = FP.mview() === "panel"; box.classList.toggle("fp-panelview", pv); H.div.hidden = !pv;
      [].forEach.call(seg.children, function (x) { x.classList.toggle("sp-on", x.dataset.v === (pv ? "panel" : "simple")); }); };
    box._fpApply(); box._fpH = H;
    if (H.m) { H.m.refresh(); if (fk) { var e = H.div.querySelector('[data-ctl="' + fk + '"]'); if (e) e.focus(); } }
    return H;
  };

  // ---------- mount ----------
  FP.mount = function (host, o) {
    css();
    var L = FP.LAYOUTS[o.id], A = o.adapter, P = A ? null : o.profile || (window.SynthCompare && SynthCompare.PROFILES[o.id]), C = ctlMap(P);
    if (A) { o = Object.assign({}, o, { get: A.get, set: A.set }); }
    function rng(k) { return A ? A.range(k) : C[k]; }
    var wrap = h("div", "fp-w"), bar = h("div", "fp-bar"), tb = h("button", "fp-theme"); tb.type = "button";
    bar.appendChild(h("span", null, L.name + " panel")); bar.appendChild(tb); wrap.appendChild(bar);
    var scroll = h("div", "fp-scroll"), svg = S("svg", { viewBox: "0 0 " + L.w + " " + L.h, class: "fp-svg", role: "group", "aria-label": L.name + " control panel" });
    scroll.appendChild(svg); wrap.appendChild(scroll);
    if (L.approx) wrap.appendChild(h("p", "fp-note", L.approx));
    host.innerHTML = ""; host.appendChild(wrap);
    var bg = S("rect", { x: 0, y: 0, width: L.w, height: L.h, fill: "var(--fp-bg)" }); svg.appendChild(bg);
    var upd = [], byKey = {}, me, tabs = [], page = L.page || null;
    function showPage() { [].forEach.call(svg.querySelectorAll("[data-page]"), function (e) { e.style.display = e.dataset.page === page ? "" : "none"; }); tabs.forEach(function (f) { f(); }); }
    function acc(it) { var n = it.a || L.accent; return (L.accents && L.accents[n]) || n || "#888"; }
    function def(k) { if (A) { var r = A.range(k); return r && r[6] != null ? r[6] : null; } return P && P.def && P.def[k] != null ? P.def[k] : null; }
    function fmt(it, c, v) { if (it.fmt) return it.fmt(v); var hn = P && P.hint && P.hint(it.k, v); if (hn) return hn; if (c[2] === "k") { var st = c[5]; return st >= 1 ? String(Math.round(v)) : (+v).toFixed(st >= 0.1 ? 1 : st >= 0.01 ? 2 : 3); } return String(v); }
    function inert(g, it) { g.setAttribute("class", "fp-off"); var t = S("title"); t.textContent = (it.label || it.t) + ": not modelled"; g.appendChild(t); }
    function bindSlider(g, it, c, horiz, lenPx) {   // drag / wheel / keys for knobs and sliders
      g.setAttribute("tabindex", 0); g.setAttribute("role", "slider"); g.setAttribute("aria-label", it.label || c[1]);
      g.setAttribute("aria-valuemin", c[3]); g.setAttribute("aria-valuemax", c[4]); g.setAttribute("class", "fp-c" + (horiz ? " fp-h" : ""));
      var span = c[4] - c[3], step = c[5] || span / 100, drag = null;
      function put(v) { o.set(it.k, clamp(Math.round(v / step) * step, c[3], c[4])); }
      function scale() { var r = svg.getBoundingClientRect(); return r.width ? L.w / r.width : 1; }
      g.addEventListener("pointerdown", function (e) { e.preventDefault(); g.focus(); busy++; drag = { x: e.clientX, y: e.clientY, v: +o.get(it.k) }; try { g.setPointerCapture(e.pointerId); } catch (er) {} });
      g.addEventListener("pointermove", function (e) { if (!drag) return; var px = horiz ? (e.clientX - drag.x) : (drag.y - e.clientY), len = (lenPx || 150) / scale();
        put(drag.v + px / len * span * (e.shiftKey ? 0.1 : 1)); });
      function up() { if (drag) { busy = Math.max(0, busy - 1); var ch = +o.get(it.k) !== drag.v; drag = null; if (ch && o.commit) o.commit(); } } g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
      g.addEventListener("dblclick", function () { if (def(it.k) != null) o.set(it.k, def(it.k)); });
      g.addEventListener("wheel", function (e) { e.preventDefault(); put(+o.get(it.k) - Math.sign(e.deltaY) * step * (span / step > 60 ? 2 : 1)); }, { passive: false });
      g.addEventListener("keydown", function (e) { var d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
        if (e.key === "Home") { e.preventDefault(); return o.set(it.k, c[3]); } if (e.key === "End") { e.preventDefault(); return o.set(it.k, c[4]); }
        if (!d) return; e.preventDefault(); e.stopPropagation(); put(+o.get(it.k) + d * step * (e.shiftKey || span / step <= 40 ? 1 : 5)); });
    }
    function aria(g, it, c, v) { var t = fmt(it, c, v); g.setAttribute("aria-valuenow", v); g.setAttribute("aria-valuetext", t); return t; }
    function arc(cx, cy, r, f0, f1) { var a0 = (-135 + 270 * f0 - 90) * Math.PI / 180, a1 = (-135 + 270 * f1 - 90) * Math.PI / 180;
      return "M" + (cx + r * Math.cos(a0)).toFixed(2) + " " + (cy + r * Math.sin(a0)).toFixed(2) + "A" + r + " " + r + " 0 " + (f1 - f0 > 2 / 3 ? 1 : 0) + " 1 " + (cx + r * Math.cos(a1)).toFixed(2) + " " + (cy + r * Math.sin(a1)).toFixed(2); }

    L.items.forEach(function (it) {
      var g = S("g"), c = it.k ? rng(it.k) : null, a = acc(it);
      if (it.k) g.dataset.ctl = it.k;
      if (it.page) g.dataset.page = it.page;
      svg.appendChild(g);
      if (it.t === "section") {
        g.appendChild(S("rect", { x: it.x, y: it.y, width: it.w, height: it.h, rx: L.round != null ? L.round : 4, fill: "var(--fp-body)", stroke: "var(--fp-line)" }));
        var hd = it.title ? 0 : it.head == null ? 18 : it.head;
        if (it.title) { var fs = it.size || 11, tw = String(it.label || "").length * fs * 0.66 + 10, ty = it.title === "border" ? it.y + fs * 0.36 : it.y + fs + 4;
          if (it.title === "border" && it.label) g.appendChild(S("rect", { x: it.x + it.w / 2 - tw / 2, y: it.y - fs / 2, width: tw, height: fs, fill: "var(--fp-bg)" }));
          if (it.label) g.appendChild(T(it.x + it.w / 2, ty, it.label, { "font-size": fs, "font-weight": 700, "text-anchor": "middle", "letter-spacing": ".04em" })); }
        if (it.title) { /* drawn above */ } else if (it.vertical) { g.appendChild(S("rect", { x: it.x, y: it.y, width: hd, height: it.h, rx: L.round != null ? L.round : 4, fill: "var(--fp-head)" }));
          if (it.label) g.appendChild(T(it.x + hd / 2 + 4, it.y + it.h / 2, it.label, { "font-size": 11, "font-weight": 700, "text-anchor": "middle", transform: "rotate(-90 " + (it.x + hd / 2 + 4) + " " + (it.y + it.h / 2) + ")" })); }
        else if (hd) { g.appendChild(S("rect", { x: it.x, y: it.y, width: it.w, height: hd, rx: L.round != null ? L.round : 4, fill: "var(--fp-head)" }));
          if (it.label) g.appendChild(T(it.x + 8, it.y + hd * 0.7, it.label, { "font-size": Math.min(12, hd * 0.62), "font-weight": 700, "letter-spacing": ".06em" })); }
        else if (it.label) g.appendChild(T(it.x + 6, it.y + 12, it.label, { "font-size": 10, "font-weight": 700 }));
        if (it.a) g.appendChild(S("rect", { x: it.x, y: it.y, width: it.vertical ? 3 : it.w, height: it.vertical ? it.h : 2, fill: a }));
        return;
      }
      if (it.t === "shape") { var tk = function (v) { return /^(bg|body|head|ink|ink2|line|track|screen|wave)$/.test(v) ? "var(--fp-" + v + ")" : v; };   // decoration (guitars: body, pickguard, pickups)
        g.appendChild(S("path", { d: it.d, fill: tk(it.fill || "body"), stroke: tk(it.stroke || "line"), "stroke-width": it.sw || 1.2, opacity: it.op })); if (it.title) { var st2 = S("title"); st2.textContent = it.title; g.appendChild(st2); } return; }
      if (it.t === "label") { g.appendChild(T(it.x, it.y, it.text, { "font-size": it.size || 9, "text-anchor": it.anchor || "middle", "font-weight": it.bold ? 700 : null, class: it.dim ? "fp-dim" : null,
        transform: it.rot ? "rotate(" + it.rot + " " + it.x + " " + it.y + ")" : null })); return; }
      if (it.t === "jack") { var jr = it.r || 7; g.appendChild(S("circle", { cx: it.x, cy: it.y, r: jr, fill: "var(--fp-body)", stroke: "var(--fp-ink)", "stroke-width": 1.2 }));
        g.appendChild(S("circle", { cx: it.x, cy: it.y, r: jr * 0.45, fill: "var(--fp-ink)" }));
        if (it.label) g.appendChild(T(it.x, it.y + jr + (it.size || 7) + 2, it.label, { "font-size": it.size || 7, "text-anchor": "middle", class: "fp-dim" })); return; }
      if (it.t === "keys") { var n = it.n || 14, kw = it.w / n;
        for (var i = 0; i < n; i++) g.appendChild(S("rect", { x: it.x + i * kw, y: it.y, width: kw - 1, height: it.h, fill: "#f7f7f7", stroke: "#888" }));
        for (i = 0; i < n - 1; i++) if ([0, 1, 3, 4, 5].indexOf(i % 7) >= 0) g.appendChild(S("rect", { x: it.x + (i + 0.68) * kw, y: it.y, width: kw * 0.62, height: it.h * 0.6, fill: "#111" }));
        return; }
      if (it.t === "button" && it.go) { var gb = S("rect", { x: it.x, y: it.y, width: it.w, height: it.h, rx: 3, stroke: "var(--fp-line)", class: "fp-focus" }), gt = T(it.x + it.w / 2, it.y + it.h / 2 + 3.5, it.label, { "font-size": it.size || 9.5, "text-anchor": "middle", "font-weight": 700 });
        g.appendChild(gb); g.appendChild(gt); g.setAttribute("class", "fp-c fp-click"); g.setAttribute("tabindex", 0); g.setAttribute("role", "tab"); g.setAttribute("aria-label", it.label + " page");
        var goF = function () { page = it.go; showPage(); }; g.addEventListener("click", goF); g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goF(); } });
        tabs.push(function () { var on = page === it.go; gb.setAttribute("fill", on ? a : "var(--fp-head)"); gt.setAttribute("fill", on ? "#000" : "var(--fp-ink)"); g.setAttribute("aria-selected", on ? "true" : "false"); });
        return; }
      if (it.t === "button") { g.appendChild(S("rect", { x: it.x, y: it.y, width: it.w, height: it.h, rx: 3, fill: it.on ? a : "var(--fp-head)", stroke: "var(--fp-line)" }));
        g.appendChild(T(it.x + it.w / 2, it.y + it.h / 2 + 3.5, it.label || "", { "font-size": it.size || 9.5, "text-anchor": "middle", fill: it.on ? "#000" : null })); return; }
      if (it.t === "display") { it._L = L;
        g.appendChild(S("rect", { x: it.x, y: it.y, width: it.w, height: it.h, rx: 3, fill: "var(--fp-screen)", stroke: "var(--fp-line)" }));
        var inner = S("g", { transform: "translate(" + it.x + " " + it.y + ")" }); g.appendChild(inner);
        if (it.label) g.appendChild(T(it.x + 5, it.y + 11, it.label, { "font-size": 9, class: "fp-dim" }));
        upd.push(function () { inner.innerHTML = ""; drawDisplay(it, o.get, P).forEach(function (d, j) { inner.appendChild(S("path", { d: d, fill: "none", stroke: j ? "var(--fp-ink2)" : a, "stroke-width": 1.8, "stroke-linejoin": "round" })); }); });
        return; }
      var ok = !!c, focus;
      if (it.t === "lcd") {
        g.appendChild(S("rect", { x: it.x, y: it.y, width: it.w, height: it.h, rx: 3, fill: it.seg ? "#140404" : "var(--fp-screen)", stroke: "var(--fp-line)" }));
        var lg = S("g"); g.appendChild(lg); var fs2 = it.size || 12;
        if (!ok) { inert(g, it); return; }
        upd.push(function () { lg.innerHTML = ""; String(o.get(it.k) == null ? "" : o.get(it.k)).split("\n").forEach(function (ln, j) {
          lg.appendChild(T(it.x + (it.seg ? it.w / 2 : 6), it.y + 4 + fs2 * (j + 1), ln, { "font-size": fs2, "text-anchor": it.seg ? "middle" : "start", "font-family": "ui-monospace,Menlo,monospace", style: it.seg ? "fill:#ff3b2f" : null, "xml:space": "preserve" })); }); });
        byKey[it.k] = byKey[it.k] || []; byKey[it.k].push(upd.length - 1); return;
      }
      if (it.t === "step" || it.t === "key") {
        var kr = S("rect", { x: it.x, y: it.y, width: it.w, height: it.h, rx: 3, fill: it.cap || "var(--fp-head)", stroke: "var(--fp-line)", class: "fp-focus fp-ring" }); g.appendChild(kr);
        var lw = Math.min(14, it.w * .4), ledR = S("rect", { x: it.x + it.w / 2 - lw / 2, y: it.y + 4, width: lw, height: 5, rx: 1.5, fill: "#3a1010" });
        if (it.t === "step" || it.led) g.appendChild(ledR);
        var kt = T(it.x + it.w / 2, it.below ? it.y + it.h + 11 : it.y + it.h / 2 + 5 + (it.t === "step" || it.led ? 3 : 0), it.label || "", { "font-size": it.size || 9, "text-anchor": "middle", "font-weight": 700, style: it.cap && !it.below ? "fill:" + (/^#[0-3]/.test(it.cap) ? "#eee" : "#111") : null }); g.appendChild(kt);
        var mk = it.t === "step" ? T(it.x + it.w / 2, it.y + it.h - 5, "", { "font-size": 10, "text-anchor": "middle", "font-weight": 700, style: it.cap ? "fill:#111" : null }) : null; if (mk) g.appendChild(mk);
        if (it.t === "step") { g.dataset.step = it.i; g.classList.add("fp-step"); }
        if (!ok) { inert(g, it); return; }
        g.setAttribute("tabindex", 0); g.setAttribute("class", "fp-c fp-click" + (it.t === "step" ? " fp-step" : "")); g.setAttribute("role", "button"); g.setAttribute("aria-label", it.aria || it.label || it.k);
        var boolKey = it.t === "key" && it.v === undefined;
        var press = function (e) { if (it.t === "step") o.set(it.k, { shift: !!(e && e.shiftKey), alt: !!(e && (e.altKey || e.button === 2)) }); else o.set(it.k, boolKey ? !o.get(it.k) : it.v); };
        g.addEventListener("click", press); g.addEventListener("contextmenu", function (e) { if (it.t === "step") { e.preventDefault(); o.set(it.k, { alt: true }); } });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(e); } });
        upd.push(function () { var v = o.get(it.k);
          if (it.t === "step") { var on = v && (v.on || v === true || v > 0); ledR.setAttribute("fill", on ? (v.acc ? "#ff2a1a" : "#e03a2f") : "#3a1010"); ledR.setAttribute("opacity", on && !v.acc && v.dim ? .6 : 1);
            mk.textContent = v && v.text || ""; g.setAttribute("aria-pressed", on ? "true" : "false"); }
          else { var lit = boolKey ? !!v : v === it.v; ledR.setAttribute("fill", lit ? "#e03a2f" : "#3a1010"); if (!it.led && !it.cap) kr.setAttribute("fill", lit ? a : "var(--fp-head)"); if (!it.led && !it.cap) kt.style.fill = lit ? "#000" : ""; if (it.cap) { kr.setAttribute("stroke", lit ? a : "var(--fp-line)"); kr.setAttribute("stroke-width", lit ? 4 : 1); } g.setAttribute("aria-pressed", lit ? "true" : "false"); } });
        byKey[it.k] = byKey[it.k] || []; byKey[it.k].push(upd.length - 1); return;
      }
      if (it.t === "knob") {
        var r = it.r || 14, cx = it.x, cy = it.y;
        g.appendChild(S("circle", { cx: cx, cy: cy, r: r + 7, fill: "transparent", class: "fp-focus", stroke: "none" }));
        var val = S("path", { fill: "none", stroke: a, "stroke-width": L.knob === "cap" ? 0 : 3, "stroke-linecap": "round" }), ptr = S("line", { x1: cx, y1: cy, x2: cx, y2: cy - r, stroke: L.knob === "cap" ? "#fff" : "var(--fp-ink)", "stroke-width": 2, "stroke-linecap": "round" });
        if (L.knob === "cap") { g.appendChild(S("circle", { cx: cx, cy: cy, r: r + 3, fill: "#1a1a1a", stroke: "#555" })); g.appendChild(S("circle", { cx: cx, cy: cy, r: r * 0.72, fill: it.cap || a })); }
        else { g.appendChild(S("path", { d: arc(cx, cy, r + 3, 0, 1), fill: "none", stroke: "var(--fp-track)", "stroke-width": 3, "stroke-linecap": "round" })); g.appendChild(S("circle", { cx: cx, cy: cy, r: r - 1, fill: "var(--fp-screen)", stroke: "var(--fp-line)" })); }
        g.appendChild(val); g.appendChild(ptr);
        if (it.label) g.appendChild(T(cx, cy + r + 14, it.label, { "font-size": it.size || 8.5, "text-anchor": "middle" }));
        var vt = T(cx, cy + r + 24, "", { "font-size": 8, "text-anchor": "middle", class: "fp-dim" }); if (it.label !== "" && !it.noValue) g.appendChild(vt);
        if (!ok) { inert(g, it); return; }
        bindSlider(g, it, c, false);
        upd.push(function () { var v = +o.get(it.k), f = (v - c[3]) / (c[4] - c[3]), ang = -135 + 270 * f;
          val.setAttribute("d", f > 0.004 ? arc(cx, cy, r + 3, c[3] < 0 && c[4] > 0 ? -c[3] / (c[4] - c[3]) : 0, f) : "");
          if (c[3] < 0 && c[4] > 0) { var z = -c[3] / (c[4] - c[3]); val.setAttribute("d", Math.abs(f - z) > 0.004 ? arc(cx, cy, r + 3, Math.min(f, z), Math.max(f, z)) : ""); }
          ptr.setAttribute("transform", "rotate(" + ang + " " + cx + " " + cy + ")"); vt.textContent = aria(g, it, c, v); });
      } else if (it.t === "hslider" || it.t === "vslider") {
        var hz = it.t === "hslider", X = it.x, Y = it.y, W = it.w, H = it.h;
        g.appendChild(S("rect", { x: X, y: Y, width: W, height: H, rx: 2, fill: "transparent", class: "fp-focus", stroke: "none" }));
        var tr = hz ? S("rect", { x: X + 4, y: Y + H - 7, width: W - 8, height: 3, rx: 1.5, fill: "var(--fp-track)" }) : S("rect", { x: X + W / 2 - 1.5, y: Y + 4, width: 3, height: H - 22, rx: 1.5, fill: "var(--fp-track)" });
        var fill = S("rect", { rx: 1.5, fill: a }), hd2 = S("rect", { rx: 2, fill: "var(--fp-ink)", stroke: "var(--fp-bg)" });
        g.appendChild(tr); g.appendChild(fill); g.appendChild(hd2);
        var lab = hz ? T(X + 4, Y + 10, it.label || "", { "font-size": 9 }) : T(X + W / 2, Y + H - 4, it.label || "", { "font-size": 8.5, "text-anchor": "middle" }); g.appendChild(lab);
        var vt2 = hz ? T(X + W - 4, Y + 10, "", { "font-size": 9, "text-anchor": "end", class: "fp-dim" }) : null; if (vt2) g.appendChild(vt2);
        if (!ok) { inert(g, it); return; }
        bindSlider(g, it, c, hz, hz ? W * 1.6 : H * 1.6);
        upd.push(function () { var v = +o.get(it.k), f = clamp((v - c[3]) / (c[4] - c[3]), 0, 1), z = c[3] < 0 && c[4] > 0 ? -c[3] / (c[4] - c[3]) : 0, t = aria(g, it, c, v);
          if (hz) { var L0 = X + 4, LL = W - 8, px = L0 + f * LL; fill.setAttribute("x", L0 + Math.min(f, z) * LL); fill.setAttribute("width", Math.abs(f - z) * LL); fill.setAttribute("y", Y + H - 7); fill.setAttribute("height", 3);
            hd2.setAttribute("x", px - 3); hd2.setAttribute("y", Y + H - 11); hd2.setAttribute("width", 6); hd2.setAttribute("height", 11); vt2.textContent = t; }
          else { var T0 = Y + 4, LH = H - 22, py = T0 + (1 - f) * LH; fill.setAttribute("x", X + W / 2 - 1.5); fill.setAttribute("width", 3); fill.setAttribute("y", T0 + (1 - Math.max(f, z)) * LH); fill.setAttribute("height", Math.abs(f - z) * LH);
            hd2.setAttribute("x", X + W / 2 - 6); hd2.setAttribute("y", py - 3); hd2.setAttribute("width", 12); hd2.setAttribute("height", 6); var tt = S("title"); tt.textContent = (it.label || c[1]) + ": " + t; var old = g.querySelector("title"); if (old) g.removeChild(old); g.appendChild(tt); } });
      } else if (it.t === "switch" || it.t === "select" || it.t === "seg") {
        var box = S("rect", { x: it.x, y: it.y, width: it.w, height: it.h, rx: 3, fill: "var(--fp-screen)", stroke: "var(--fp-line)", class: "fp-focus" }); g.appendChild(box);
        var txt = T(it.x + it.w / 2, it.y + it.h / 2 + 3.5, "", { "font-size": it.size || 9.5, "text-anchor": "middle" }), led = null, cells = [];
        if (it.t === "switch") { led = S("circle", { cx: it.x + 8, cy: it.y + it.h / 2, r: 3.2, fill: "var(--fp-track)" }); g.appendChild(led); txt.setAttribute("x", it.x + it.w / 2 + 4); txt.textContent = it.label || ""; g.appendChild(txt); }
        else if (it.t === "seg") { var opts = it.opts, cw = it.w / opts.length; opts.forEach(function (op, j) { var cr = S("rect", { x: it.x + j * cw + 1, y: it.y + 1, width: cw - 2, height: it.h - 2, rx: 2, fill: "transparent" }), ct = T(it.x + (j + .5) * cw, it.y + it.h / 2 + 3.5, op[1], { "font-size": it.size || 8.5, "text-anchor": "middle" }); g.appendChild(cr); g.appendChild(ct); cells.push([cr, ct, op[0]]); }); }
        else { g.appendChild(txt); if (it.label) g.appendChild(T(it.x, it.y - 3, it.label, { "font-size": 8, "text-anchor": "start", class: "fp-dim" })); }
        if (!ok) { if (it.t === "select") txt.textContent = it.text || ""; inert(g, it); return; }
        g.setAttribute("tabindex", 0); g.setAttribute("class", "fp-c fp-click"); g.setAttribute("aria-label", it.label || c[1]);
        var isBool = c[2] === "s", list = isBool ? [false, true] : it.opts ? it.opts.map(function (q) { return q[0]; }) : c[3];
        if (isBool) { g.setAttribute("role", "switch"); } else { g.setAttribute("role", "spinbutton"); }
        function step(d) { var v = o.get(it.k); if (isBool) return o.set(it.k, !v); var i2 = list.indexOf(v); o.set(it.k, list[(i2 + d + list.length) % list.length]); }
        g.addEventListener("click", function (e) { if (it.t === "seg" && !isBool) { var r2 = svg.getBoundingClientRect(), xx = (e.clientX - r2.left) * L.w / r2.width, j = clamp(Math.floor((xx - it.x) / (it.w / it.opts.length)), 0, it.opts.length - 1); return o.set(it.k, it.opts[j][0]); } step(e.shiftKey ? -1 : 1); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); step(1); } else if (!isBool && (e.key === "ArrowUp" || e.key === "ArrowRight")) { e.preventDefault(); step(1); } else if (!isBool && (e.key === "ArrowDown" || e.key === "ArrowLeft")) { e.preventDefault(); step(-1); } });
        if (!isBool) g.addEventListener("wheel", function (e) { e.preventDefault(); step(e.deltaY > 0 ? 1 : -1); }, { passive: false });
        upd.push(function () { var v = o.get(it.k);
          if (isBool) { led.setAttribute("fill", v ? a : "var(--fp-track)"); g.setAttribute("aria-checked", v ? "true" : "false"); }
          else if (it.t === "seg") { cells.forEach(function (cl) { var on = cl[2] === v; cl[0].setAttribute("fill", on ? a : "transparent"); cl[1].setAttribute("fill", on ? "#000" : "var(--fp-ink)"); }); g.setAttribute("aria-valuetext", v); }
          else { txt.textContent = (it.names && it.names[v]) || (window.SynthCompare && SynthCompare.WAVE_NAME && SynthCompare.WAVE_NAME[v]) || v; g.setAttribute("aria-valuetext", txt.textContent); } });
      }
      if (ok) { byKey[it.k] = byKey[it.k] || []; byKey[it.k].push(upd.length - 1); }
    });

    function paint() { var t = FP.theme(), col = Object.assign({}, BASE[t], L.colors && L.colors[t]); wrap.dataset.theme = t;
      for (var k in col) wrap.style.setProperty("--fp-" + k, col[k]);
      tb.textContent = t === "dark" ? "☀ Light" : "☾ Dark"; tb.setAttribute("aria-label", "Switch the panel to " + (t === "dark" ? "light" : "dark") + " mode"); }
    tb.addEventListener("click", function () { FP.setTheme(FP.theme() === "dark" ? "light" : "dark"); });
    var curStep = -1;
    function setCur(i) { curStep = i == null ? -1 : i; [].forEach.call(svg.querySelectorAll(".fp-step"), function (e) { e.classList.toggle("fp-now", +e.dataset.step === curStep); }); }
    function refresh() { upd.forEach(function (f) { f(); }); if (A && A.range("cur")) setCur(o.get("cur")); }
    if (o.readonly) wrap.classList.add("fp-ro");
    function rec(e) { var t = e.target && e.target.closest && e.target.closest("[data-ctl]"); if (t && e.type === "keydown") FP._last = { el: wrap, k: t.dataset.ctl, t: Date.now() }; }
    svg.addEventListener("keydown", rec, true);
    if (A && A.onChange) A.onChange(refresh);   // every picture depends on several keys, so redraw all (cheap)
    paint(); refresh(); showPage();
    var ctl = {}; [].forEach.call(svg.querySelectorAll("[data-ctl]"), function (e) { ctl[e.dataset.ctl] = e; });
    me = { el: wrap, layout: L, refresh: refresh, cur: setCur, paint: paint, ctl: ctl, svg: svg, page: function (p) { if (p) { page = p; showPage(); } return page; } };
    mounted = mounted.filter(function (m) { return document.contains(m.el); }); mounted.push(me);
    return me;
  };
})();
