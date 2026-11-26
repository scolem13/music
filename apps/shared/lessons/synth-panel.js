// SynthPanel: one simple control panel for every synth on the site (teaching view). Modules always run in signal order
// (controls, oscillators, mixer, filter, envelopes, output); each folds to a small picture of what it is doing, nothing is
// in a menu. Waves are SVG icons, never words. One control type: a vertical slider (drag; Shift = fine; double-click =
// reset; click the number to type one; arrow keys when focused). Beginner / All hides the `adv` items. Pictures (filter
// curve, envelope shape) are drawn from the knob numbers by this page's formulas: schematic, not measured.
// A synth is described by a SPEC (see SynthPanel.SPECS.moog): { modules: [{ id, name, adv, pic, items }] }, item kinds:
//   { k, label, kind: "slider", min, max, step, adv, fmt(v,s), band(s) -> [lo,hi] | null }  (band = how far modulation moves it)
//   { k, label, kind: "toggle", adv }      { k, label, kind: "waves", opts: [[value, icon]], adv }
//   { k, label, kind: "choice", opts: [[value, text]], adv }     { group: "Osc 2", adv, items: [...] }  (a column)
//   toggle may have `icon` (a WAVES name) + `iconName`: drawn as the picture, no text.
//   pic: "osc" (waves of the oscillators that are on) | "filter" | "env:<A>,<D>,<S>[,<R>|decaySw]" | null
// API: SynthPanel.mount(host, { spec, state, def, onChange(state), analyser() -> AnalyserNode|null, store })
//   -> { set(state), state(), gate(on), level(beginner) }.  Fold and level are kept in localStorage `synth-panel`.
(function () {
  var NS = "http://www.w3.org/2000/svg";
  function S(tag, at, kids) { var e = document.createElementNS(NS, tag); for (var a in at || {}) e.setAttribute(a, at[a]); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function expMap(k, lo, hi) { return lo * Math.pow(hi / lo, Math.max(0, Math.min(10, k)) / 10); }

  // ---------- wave icons (two cycles in a 28 x 16 box) ----------
  function pulse(d) { var a = 3 + 11 * d, b = 14 + 11 * d; return "M3 13V3H" + a + "V13H14V3H" + b + "V13H25"; }
  var WAVES = {
    sine: "M3 8C5 1 7 1 8.5 8S12 15 14 8 17 1 19.5 8 23 15 25 8",
    tri: "M3 13L8.5 3L14 13L19.5 3L25 13", saw: "M3 13L14 3V13L25 3V13", rsaw: "M3 3L14 13V3L25 13V3",
    trisaw: "M3 13L10 3L14 13L21 3L25 13", square: pulse(0.5), wide: pulse(0.32), narrow: pulse(0.12),
    noise: "M3 8L5 3L6 12L8 5L9 13L11 4L12 10L14 2L15 12L17 6L18 13L20 3L21 11L23 5L25 9"
  };
  function icon(name, w) { return S("svg", { viewBox: "0 0 28 16", width: w || 28, height: (w || 28) * 16 / 28, class: "sp-ico", "aria-hidden": "true" },
    [S("path", { d: WAVES[name] || WAVES.sine, fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linejoin": "round", "stroke-linecap": "round" })]); }

  // ---------- pictures ----------
  function filterPic(s, w, ht) {   // 24 dB low-pass with a resonance bump, log frequency 20 Hz - 20 kHz; schematic
    var fc = expMap(s.cutoff, 10, 20000), q = 0.5 + Math.pow((s.emph != null ? s.emph : s.res || 0) / 10, 2) * 12, d = "", top = 6, bot = ht - 4;
    for (var i = 0; i <= 60; i++) { var f = 20 * Math.pow(1000, i / 60), x = f / fc, m2 = 1 / Math.sqrt(Math.pow(1 - x * x, 2) + Math.pow(x / q, 2));
      var db = 20 * Math.log10(m2 * m2 * (q > .7 ? 1 / q : 1)); db = Math.max(-48, Math.min(18, db));
      d += (i ? "L" : "M") + (4 + i / 60 * (w - 8)).toFixed(1) + " " + (top + (18 - db) / 66 * (bot - top)).toFixed(1); }
    var cx = 4 + Math.log(Math.max(20, Math.min(20000, fc)) / 20) / Math.log(1000) * (w - 8);
    return S("svg", { viewBox: "0 0 " + w + " " + ht, class: "sp-pic", role: "img", "aria-label": "Filter curve" }, [
      S("line", { x1: 4, x2: w - 4, y1: top + 18 / 66 * (bot - top), y2: top + 18 / 66 * (bot - top), class: "sp-guide" }),
      S("path", { d: d, class: "sp-curve" }), S("circle", { cx: cx, cy: top + 18 / 66 * (bot - top), r: 3, class: "sp-dot" })]);
  }
  function envTimes(s, keys) {   // knob 0-10 -> seconds, Model D ranges (M 80); the Model D has no R knob: decay switch
    var A = expMap(s[keys[0]], 0.001, 10), D = expMap(s[keys[1]], 0.004, 35), Sl = s[keys[2]] / 10, R;
    if (keys[3] === "decaySw") R = s.decaySw ? D : 0.008; else R = keys[3] ? expMap(s[keys[3]], 0.004, 35) : 0.008;
    return { a: A, d: D, s: Sl, r: R };
  }
  function envX(t) { return Math.log(1 + t * 8) / Math.log(1 + 35 * 8); }   // time axis squashed so short and long both show
  function envPic(s, keys, w, ht, phase) {
    var e = envTimes(s, keys), u = (w - 8) / 3.2, top = 5, bot = ht - 4, y = function (v) { return bot - v * (bot - top); };
    var xa = 4 + envX(e.a) * u, xd = xa + envX(e.d) * u, xs = xd + u * 0.6, xr = xs + envX(e.r) * u;
    var d = "M4 " + y(0) + "L" + xa + " " + y(1) + "Q" + xa + " " + y(e.s) + " " + xd + " " + y(e.s) + "L" + xs + " " + y(e.s) + "Q" + xs + " " + y(0) + " " + xr + " " + y(0);
    var kids = [S("line", { x1: 4, x2: w - 4, y1: bot, y2: bot, class: "sp-guide" }), S("path", { d: d, class: "sp-curve" })];
    if (phase) { var p = phase(e), px, py;
      if (p.on) { var t = p.t; if (t < e.a) { px = 4 + envX(t) * u; py = y(t / e.a); } else if (t < e.a + e.d * 2) { var f = Math.min(1, (t - e.a) / (e.d * 2)); px = xa + f * (xd - xa); py = y(1 - (1 - e.s) * (1 - Math.exp(-4 * f))); } else { px = xd + Math.min(1, (t - e.a - e.d * 2) / 2) * (xs - xd); py = y(e.s); } }
      else if (p.t < e.r * 2) { var g = p.t / (e.r * 2); px = xs + g * (xr - xs); py = y(p.lvl * Math.exp(-4 * g)); }
      if (px != null) kids.push(S("circle", { cx: px, cy: py, r: 3.5, class: "sp-dot" })); }
    return S("svg", { viewBox: "0 0 " + w + " " + ht, class: "sp-pic", role: "img", "aria-label": "Envelope shape" }, kids);
  }

  // ---------- the slider ----------
  function slider(it, get, set, def) {
    var box = h("div", "sp-sl"), lab = h("div", "sp-lab", it.label), trk = h("div", "sp-trk"), fill = h("div", "sp-fill"), band = h("div", "sp-band"), thumb = h("div", "sp-thumb"), num = h("button", "sp-num");
    num.type = "button"; trk.appendChild(band); trk.appendChild(fill); trk.appendChild(thumb);
    trk.tabIndex = 0; trk.setAttribute("role", "slider"); trk.setAttribute("aria-label", it.label); trk.setAttribute("aria-valuemin", it.min); trk.setAttribute("aria-valuemax", it.max);
    box.appendChild(lab); box.appendChild(trk); box.appendChild(num);
    var span = it.max - it.min, st = it.step || span / 100;
    function q(v) { v = Math.max(it.min, Math.min(it.max, v)); return Math.round(v / st) * st; }
    function show() { var v = get(it.k), f = (v - it.min) / span; fill.style.height = thumb.style.bottom = (f * 100) + "%";
      if (it.min < 0) { var z = -it.min / span; fill.style.bottom = Math.min(f, z) * 100 + "%"; fill.style.height = Math.abs(f - z) * 100 + "%"; }
      num.textContent = it.fmt ? it.fmt(v, get()) : (+v).toFixed(st < 1 ? (st < .1 ? 2 : 1) : 0);
      trk.setAttribute("aria-valuenow", v); trk.setAttribute("aria-valuetext", num.textContent);
      var b = it.band && it.band(get()); if (b) { var lo = (Math.max(it.min, b[0]) - it.min) / span, hi = (Math.min(it.max, b[1]) - it.min) / span; band.style.display = ""; band.style.bottom = lo * 100 + "%"; band.style.height = Math.max(0, hi - lo) * 100 + "%"; } else band.style.display = "none"; }
    var drag = null;
    trk.addEventListener("pointerdown", function (e) { e.preventDefault(); trk.focus(); drag = { y: e.clientY, v: get(it.k) };
      if (!e.shiftKey && e.target !== thumb) { var r = trk.getBoundingClientRect(); set(it.k, q(it.min + (1 - (e.clientY - r.top) / r.height) * span)); drag.v = get(it.k); }
      try { trk.setPointerCapture(e.pointerId); } catch (er) {} });
    trk.addEventListener("pointermove", function (e) { if (!drag) return; var r = trk.getBoundingClientRect(), k = e.shiftKey ? 0.1 : 1; set(it.k, q(drag.v + (drag.y - e.clientY) / r.height * span * k)); if (e.shiftKey) { drag.y = e.clientY; drag.v = get(it.k); } });
    trk.addEventListener("pointerup", function () { drag = null; }); trk.addEventListener("pointercancel", function () { drag = null; });
    trk.addEventListener("dblclick", function () { set(it.k, def(it.k)); });
    trk.addEventListener("keydown", function (e) { var d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key]; if (!d) return; e.preventDefault(); e.stopPropagation(); set(it.k, q(get(it.k) + d * st * (e.shiftKey ? 1 : (span / st > 40 ? 5 : 1)))); });
    num.addEventListener("click", function () { var inp = h("input", "sp-in"); inp.type = "number"; inp.step = st; inp.min = it.min; inp.max = it.max; inp.value = get(it.k);
      num.replaceWith(inp); inp.focus(); inp.select(); var done = false;
      function fin(ok) { if (done) return; done = true; if (ok && inp.value !== "" && isFinite(+inp.value)) set(it.k, q(+inp.value)); inp.replaceWith(num); show(); }
      inp.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") fin(true); if (e.key === "Escape") fin(false); });
      inp.addEventListener("blur", function () { fin(true); }); });
    box.refresh = show; return box;
  }
  function toggle(it, get, set) { var b = h("button", "sp-tog", it.icon ? null : it.label); b.type = "button";
    if (it.icon) { b.appendChild(icon(it.icon, 24)); b.classList.add("sp-wv"); b.title = it.iconName || it.icon; b.setAttribute("aria-label", it.iconName || it.icon); }
    b.addEventListener("click", function () { set(it.k, !get(it.k)); });
    b.refresh = function () { var on = !!get(it.k); b.classList.toggle("sp-on", on); b.setAttribute("aria-pressed", on); }; return b; }
  function choice(it, get, set, icons) { var box = h("div", "sp-ch"), lab = h("div", "sp-lab", it.label), row = h("div", "sp-seg"); box.appendChild(lab); box.appendChild(row);
    row.setAttribute("role", "radiogroup"); row.setAttribute("aria-label", it.label);
    var bs = it.opts.map(function (o) { var b = h("button", "sp-opt" + (icons ? " sp-wv" : "")); b.type = "button"; b.setAttribute("role", "radio");
      if (icons) { b.appendChild(icon(o[1])); b.title = b.ariaLabel = o[2] || o[1]; b.setAttribute("aria-label", o[2] || o[1]); } else b.textContent = o[1];
      b.addEventListener("click", function () { set(it.k, o[0]); }); row.appendChild(b); return b; });
    box.refresh = function () { var v = get(it.k); bs.forEach(function (b, i) { var on = it.opts[i][0] === v; b.classList.toggle("sp-on", on); b.setAttribute("aria-checked", on); }); }; return box; }

  // ---------- mount ----------
  var SP = window.SynthPanel = { SPECS: {}, WAVES: WAVES, icon: icon };
  function load() { try { return JSON.parse(localStorage.getItem("synth-panel")) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem("synth-panel", JSON.stringify(o)); } catch (e) {} }

  SP.mount = function (host, o) {
    var spec = o.spec, st = JSON.parse(JSON.stringify(o.state)), mem = load(), key = o.store || "x", folds = (mem.f && mem.f[key]) || {};
    var beginner = mem.b == null ? true : !!mem.b, gate = { on: false, t0: 0, off: 0, lvl: 0 }, ctrls = [], pics = [];
    host.classList.add("sp"); host.innerHTML = "";
    var top = h("div", "sp-top"), lvl = h("div", "sp-seg sp-level"), scope = h("canvas", "sp-scope");
    ["Beginner", "All"].forEach(function (t, i) { var b = h("button", "sp-opt", t); b.type = "button"; b.addEventListener("click", function () { setLevel(i === 0); }); lvl.appendChild(b); });
    top.appendChild(h("span", "sp-lab", "Show")); top.appendChild(lvl); scope.width = 240; scope.height = 44; scope.setAttribute("aria-label", "Scope: the sound's wave"); top.appendChild(scope);
    host.appendChild(top);
    var row = h("div", "sp-row"); host.appendChild(row);
    function get(k) { return k == null ? st : st[k]; }
    function set(k, v) { if (st[k] === v) return; st[k] = v; refresh(); if (o.onChange) o.onChange(JSON.parse(JSON.stringify(st))); }
    function def(k) { return o.def ? o.def[k] : st[k]; }
    function build(it, parent) {
      var el;
      if (it.items) { el = h("div", "sp-grp"); if (it.group) el.appendChild(h("div", "sp-gname", it.group)); var inner = h("div", "sp-items"); el.appendChild(inner); it.items.forEach(function (c) { build(c, inner); }); }
      else if (it.kind === "slider") el = slider(it, get, set, def);
      else if (it.kind === "toggle") el = toggle(it, get, set);
      else el = choice(it, get, set, it.kind === "waves");
      if (it.adv) el.classList.add("sp-adv"); if (it.show) el._show = it.show;
      if (el.refresh || el._show) ctrls.push(el); parent.appendChild(el);
    }
    spec.modules.forEach(function (m) {
      var mod = h("section", "sp-mod sp-m-" + m.id); if (m.adv) mod.classList.add("sp-adv");
      var hd = h("button", "sp-hd"); hd.type = "button"; hd.appendChild(h("span", "sp-car", "▾")); hd.appendChild(h("span", "sp-name", m.name));
      var mini = h("div", "sp-mini"), body = h("div", "sp-body"), pic = m.pic ? h("div", "sp-picbox") : null;
      mod.appendChild(hd); mod.appendChild(mini); if (pic) body.appendChild(pic); var items = h("div", "sp-items"); body.appendChild(items); mod.appendChild(body);
      m.items.forEach(function (it) { build(it, items); });
      function fold(f) { folds[m.id] = f; mod.classList.toggle("sp-fold", !!f); hd.setAttribute("aria-expanded", !f); hd.firstChild.textContent = f ? "▸" : "▾"; }
      hd.addEventListener("click", function () { fold(!folds[m.id]); mem.f = mem.f || {}; mem.f[key] = folds; save(mem); drawPics(); });
      fold(!!folds[m.id]);
      if (m.pic) pics.push({ m: m, big: pic, mini: mini, live: /^env/.test(m.pic) });
      else pics.push({ m: m, mini: mini, sum: m.sum });
      row.appendChild(mod);
    });
    function picFor(m, w, ht) {
      if (m.pic === "filter") return filterPic(st, w, ht);
      if (m.pic === "osc") { var g = S("svg", { viewBox: "0 0 " + w + " " + ht, class: "sp-pic" }); var on = (m.oscs || []).filter(function (x) { return st[x.on] !== false && (!x.lvl || st[x.lvl] > 0); });
        on.forEach(function (x, i) { var ic = icon(st[x.wave], Math.min(42, w / Math.max(1, on.length) - 6)); ic.setAttribute("x", 4 + i * (w - 8) / Math.max(1, on.length)); ic.setAttribute("y", ht / 2 - 10); g.appendChild(ic); });
        if (!on.length) g.appendChild(S("text", { x: w / 2, y: ht / 2 + 4, "text-anchor": "middle", class: "sp-none" }, [document.createTextNode("–")])); return g; }
      var keys = m.pic.slice(4).split(",");
      return envPic(st, keys, w, ht, function () { var now = performance.now() / 1000; return gate.on ? { on: true, t: now - gate.t0 } : { on: false, t: now - gate.off, lvl: gate.lvl }; });
    }
    function drawPics() { pics.forEach(function (p) {
      if (p.big) { p.big.innerHTML = ""; p.big.appendChild(picFor(p.m, 160, 64)); }
      p.mini.innerHTML = ""; if (p.big) p.mini.appendChild(picFor(p.m, 90, 36)); else if (p.sum) p.mini.textContent = p.sum(st); }); }
    function refresh() {
      ctrls.forEach(function (c) { if (c._show) c.classList.toggle("sp-off", !c._show(st)); if (c.refresh) c.refresh(); }); drawPics(); }
    function setLevel(b) { beginner = b; mem.b = b; save(mem); host.classList.toggle("sp-beg", b); lvl.children[0].classList.toggle("sp-on", b); lvl.children[1].classList.toggle("sp-on", !b); }
    setLevel(beginner); refresh();
    // live: the envelope dots and the scope
    var raf = null, buf = null;
    function tick() { raf = null; var busy = gate.on || performance.now() / 1000 - gate.off < 8;
      if (busy) pics.forEach(function (p) { if (p.live && !p.m.adv) { if (p.big) { p.big.innerHTML = ""; p.big.appendChild(picFor(p.m, 160, 64)); } p.mini.innerHTML = ""; p.mini.appendChild(picFor(p.m, 90, 36)); } });
      var an = o.analyser && o.analyser(), c = scope.getContext("2d"); c.clearRect(0, 0, scope.width, scope.height);
      if (an) { if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf);
        var z = 0; for (var i = 1; i < buf.length / 2; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { z = i; break; }
        c.beginPath(); for (var j = 0; j < scope.width; j++) { var v = buf[z + j * 2] || 0; c.lineTo(j, scope.height / 2 - v * scope.height * 0.9); }
        c.strokeStyle = getComputedStyle(scope).color; c.lineWidth = 1.5; c.stroke(); }
      if (busy || an) raf = requestAnimationFrame(tick); }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    return {
      set: function (s) { st = JSON.parse(JSON.stringify(s)); refresh(); }, state: function () { return JSON.parse(JSON.stringify(st)); },
      gate: function (on) { var now = performance.now() / 1000; if (on) { gate.on = true; gate.t0 = now; } else if (gate.on) { gate.on = false; gate.off = now; gate.lvl = 1; } kick(); },
      level: setLevel, start: kick, host: host
    };
  };

  // ---------- Minimoog Model D (state = SynthCompare.PROFILES.moog keys) ----------
  var FEET = [["LO", "Lo"], ["32'", "32'"], ["16'", "16'"], ["8'", "8'"], ["4'", "4'"], ["2'", "2'"]];
  function W(list, names) { return list.map(function (w) { return [w, w, (names || {})[w] || w]; }); }
  var WN = { tri: "triangle", trisaw: "triangle-saw", saw: "sawtooth", rsaw: "reverse sawtooth", square: "square", wide: "wide pulse", narrow: "narrow pulse" };
  var W12 = W(["tri", "trisaw", "saw", "square", "wide", "narrow"], WN), W3 = W(["tri", "rsaw", "saw", "square", "wide", "narrow"], WN);
  function k10(k, label, adv, extra) { var o = { k: k, label: label, kind: "slider", min: 0, max: 10, step: 0.1, adv: adv }; for (var x in extra || {}) o[x] = extra[x]; return o; }
  function secs(lo, hi) { return function (v) { var t = expMap(v, lo, hi); return t < 1 ? Math.round(t * 1000) + " ms" : t.toFixed(t < 10 ? 1 : 0) + " s"; }; }
  function hz(v) { var f = expMap(v, 10, 20000); return f < 1000 ? Math.round(f) + " Hz" : (f / 1000).toFixed(1) + " kHz"; }
  SP.SPECS.moog = { modules: [
    { id: "ctl", name: "Glide & wheel", adv: true, sum: function (s) { return (s.glideOn ? "glide on" : "glide off") + (s.oscMod || s.filtMod ? " · wheel mod" : ""); }, items: [
      { k: "glideOn", label: "Glide", kind: "toggle" }, k10("glide", "Glide time"),
      { group: "Wheel modulation", items: [
        { k: "src1", label: "Source 1", kind: "choice", opts: [["osc3", "Osc 3"], ["fenv", "Filter env"]] },
        { k: "src2", label: "Source 2", kind: "choice", opts: [["noise", "Noise"], ["lfo", "LFO"]] },
        k10("modMix", "Mix 1 ↔ 2"), k10("lfoRate", "LFO rate"),
        { k: "lfoSq", label: "LFO shape", kind: "waves", opts: [[false, "tri", "triangle"], [true, "square", "square"]] },
        { k: "oscMod", label: "→ Pitch", kind: "toggle" }, { k: "filtMod", label: "→ Filter", kind: "toggle" }]}]},
    { id: "osc", name: "Oscillators", pic: "osc", oscs: [{ on: "m1On", lvl: "m1", wave: "o1Wave" }, { on: "m2On", lvl: "m2", wave: "o2Wave" }, { on: "m3On", lvl: "m3", wave: "o3Wave" }], items: [
      { group: "Osc 1", items: [{ k: "o1Wave", label: "Wave", kind: "waves", opts: W12 }, { k: "o1Range", label: "Range (octave)", kind: "choice", opts: FEET }] },
      { group: "Osc 2", adv: true, items: [{ k: "o2Wave", label: "Wave", kind: "waves", opts: W12 }, { k: "o2Range", label: "Range", kind: "choice", opts: FEET },
        { k: "o2Freq", label: "Tune (semitones)", kind: "slider", min: -7, max: 7, step: 0.01 }] },
      { group: "Osc 3", adv: true, items: [{ k: "o3Wave", label: "Wave", kind: "waves", opts: W3 }, { k: "o3Range", label: "Range", kind: "choice", opts: FEET },
        { k: "o3Freq", label: "Tune (semitones)", kind: "slider", min: -7, max: 7, step: 0.01 }, { k: "o3Kbd", label: "Follows keys", kind: "toggle" }] }]},
    { id: "mix", name: "Mixer", sum: function (s) { return ["m1", "m2", "m3"].filter(function (k) { return s[k + "On"]; }).length + " osc" + (s.nOn ? " + noise" : ""); }, items: [
      { group: "Osc 1", items: [{ k: "m1On", label: "On", kind: "toggle" }, k10("m1", "Level")] },
      { group: "Osc 2", adv: true, items: [{ k: "m2On", label: "On", kind: "toggle" }, k10("m2", "Level")] },
      { group: "Osc 3", adv: true, items: [{ k: "m3On", label: "On", kind: "toggle" }, k10("m3", "Level")] },
      { group: "Noise", adv: true, items: [{ k: "nOn", label: "On", kind: "toggle" }, k10("n", "Level"), { k: "nCol", label: "Colour", kind: "choice", opts: [["white", "White"], ["pink", "Pink"]] }] },
      { group: "Feedback", adv: true, items: [{ k: "extOn", label: "On", kind: "toggle" }, k10("ext", "Level")] }]},
    { id: "flt", name: "Filter", pic: "filter", items: [
      k10("cutoff", "Cutoff", false, { fmt: hz, band: function (s) { return s.amount > 0 ? [s.cutoff, s.cutoff + s.amount * 0.9] : null; } }),
      k10("emph", "Emphasis"), k10("amount", "Envelope amount"),
      { group: "Keys move cutoff", adv: true, items: [{ k: "kb1", label: "⅓", kind: "toggle" }, { k: "kb2", label: "⅔", kind: "toggle" }] }]},
    { id: "fenv", name: "Filter envelope", pic: "env:fA,fD,fS,decaySw", items: [
      k10("fA", "Attack", false, { fmt: secs(0.001, 10) }), k10("fD", "Decay", false, { fmt: secs(0.004, 35) }), k10("fS", "Sustain")]},
    { id: "aenv", name: "Loudness envelope", pic: "env:lA,lD,lS,decaySw", items: [
      k10("lA", "Attack", false, { fmt: secs(0.001, 10) }), k10("lD", "Decay", false, { fmt: secs(0.004, 35) }), k10("lS", "Sustain"),
      { k: "decaySw", label: "Release = decay", kind: "toggle", adv: true }]},
    { id: "out", name: "Output", sum: function (s) { return "volume " + s.vol; }, items: [k10("vol", "Volume")] }
  ]};
})();
