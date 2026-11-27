// MidiSplit: one MIDI keyboard split into zones (organ: pedal / lower / upper), for any instrument page.
// Web MIDI is asked for only when "Connect MIDI keyboard" is pressed (the browser may ask permission); every input is listened to.
// UI (buttons and one SVG, no form controls): an 88-key strip (A0-C8) with the zones coloured and named, the split points as handles
//   (drag one, or "Learn" then press the key on the MIDI keyboard that should START the zone to its right), an octave − / + per zone,
//   the keys held lit. One zone = the whole keyboard, no split.
// Kept per instrument in localStorage `midi-split:<id>` = { splits: [midi, ...] (ascending, zones-1 of them), oct: { zone: n } }.
//   Defaults for a 61-key board (C2-C7): 3 zones -> [48, 72] (pedal C2-B2, lower C3-B4, upper C5-C7), 2 zones -> [60].
// A note-off goes to the zone its note-on went to (a split moved while a key is down does not strand it).
// API: MidiSplit.mount(host, { id: () => string, zones: () => [{ k, name }] (lowest first), onNote(k, midi, vel, on) })
//   -> { refresh() (zones / id changed), splits(), setSplits([..]), zoneOf(midi), feed(status, d1, d2) (tests: a MIDI message), el }
(function () {
  if (window.MidiSplit) return;
  var MS = window.MidiSplit = {}, NS = "http://www.w3.org/2000/svg", LO = 21, HI = 108, mounted = [], access = null;
  var COLS = ["#c98a2b", "#4f86c6", "#5aa469", "#b0559a"];
  function S(tag, at) { var e = document.createElementNS(NS, tag); for (var a in at) if (at[a] != null) e.setAttribute(a, at[a]); return e; }
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  MS.name = function (m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); };
  function black(m) { return [1, 3, 6, 8, 10].indexOf(m % 12) >= 0; }
  function css() { if (document.getElementById("ms-css")) return; var st = document.createElement("style"); st.id = "ms-css";
    st.textContent = ".ms{border:1px solid #bbb;border-radius:6px;padding:.4rem .5rem;margin:.5rem 0;font-size:.82rem}.ms-top{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}" +
      ".ms button{font:inherit;font-size:.78rem;padding:0 .45rem;border:1px solid #999;border-radius:4px;background:none;color:inherit;cursor:pointer}.ms button.ms-on{background:#e0a030;border-color:#e0a030;color:#000}" +
      ".ms-svg{display:block;width:100%;height:auto;margin:.35rem 0;touch-action:none;user-select:none}.ms-zones{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}" +
      ".ms-z{display:inline-flex;gap:.25rem;align-items:center}.ms-sw{display:inline-block;width:.8rem;height:.8rem;border-radius:2px}.ms-dim{opacity:.7}";
    document.head.appendChild(st); }

  function connect() {
    if (access) return Promise.resolve(access);
    if (!navigator.requestMIDIAccess) return Promise.reject(new Error("This browser has no Web MIDI (try Chrome or Edge)."));
    return navigator.requestMIDIAccess().then(function (a) { access = a;
      function hook() { a.inputs.forEach(function (inp) { inp.onmidimessage = function (ev) { var d = ev.data; mounted.forEach(function (m) { m.feed(d[0], d[1], d[2]); }); }; }); mounted.forEach(function (m) { m.status(); }); }
      a.onstatechange = hook; hook(); return a; });
  }

  MS.mount = function (host, o) {
    css();
    var me = {}, box = h("div", "ms"), top = h("div", "ms-top"), cb = h("button", null, "Connect MIDI keyboard"), st = h("span", "ms-dim");
    cb.type = "button"; top.appendChild(h("b", null, "MIDI keyboard")); top.appendChild(cb); top.appendChild(st); box.appendChild(top);
    var svg = S("svg", { class: "ms-svg", viewBox: "0 0 " + ((HI - LO + 1) * 10) + " 64", role: "img" }), zl = h("div", "ms-zones");
    box.appendChild(svg); box.appendChild(zl); host.appendChild(box);
    var cfg, learn = -1, held = {}, lit = {};
    function key() { return "midi-split:" + o.id(); }
    function zones() { return o.zones(); }
    function defaults(n) { return n >= 3 ? [48, 72].concat([84, 96]).slice(0, n - 1) : n === 2 ? [60] : []; }
    function load() { var c = null; try { c = JSON.parse(localStorage.getItem(key()) || "null"); } catch (e) {}
      var n = zones().length; if (!c || !c.splits || c.splits.length !== n - 1) c = { splits: defaults(n), oct: {} }; c.oct = c.oct || {}; cfg = c; }
    function save() { try { localStorage.setItem(key(), JSON.stringify(cfg)); } catch (e) {} }
    function zoneIx(m) { var i = 0; while (i < cfg.splits.length && m >= cfg.splits[i]) i++; return i; }
    me.zoneOf = function (m) { var z = zones()[zoneIx(m)]; return z && z.k; };
    me.splits = function () { return cfg.splits.slice(); };
    me.setSplits = function (a) { cfg.splits = a.slice().sort(function (x, y) { return x - y; }); save(); draw(); };
    me.feed = function (s, d1, d2) { var cmd = s & 0xf0, on = cmd === 0x90 && d2 > 0, off = cmd === 0x80 || cmd === 0x90 && d2 === 0;
      if (!on && !off) return;
      if (on && learn >= 0) { var sp = cfg.splits.slice(); sp[learn] = d1; learn = -1; me.setSplits(sp); return; }
      var zs = zones(), z, n;
      if (on) { z = zs[zoneIx(d1)]; n = d1 + 12 * (cfg.oct[z.k] || 0); held[d1] = { k: z.k, n: n }; lit[d1] = 1; o.onNote(z.k, n, d2, true); }
      else { var hd = held[d1]; if (!hd) return; delete held[d1]; delete lit[d1]; o.onNote(hd.k, hd.n, 0, false); }
      drawKeys(); };
    me.status = function () { if (!access) { st.textContent = "not connected"; return; } var n = []; access.inputs.forEach(function (i) { n.push(i.name); });
      st.textContent = n.length ? "listening to " + n.join(", ") : "connected, but no MIDI input found (plug one in)"; cb.textContent = "MIDI connected"; cb.classList.add("ms-on"); };
    cb.onclick = function () { connect().then(function () { me.status(); }, function (e) { st.textContent = e.message || "MIDI was refused"; }); };
    var keyEls = {};
    function draw() {
      svg.innerHTML = ""; keyEls = {}; var zs = zones(), W = 10, x0 = function (m) { return (m - LO) * W; };
      // zone bands
      var edges = [LO].concat(cfg.splits).concat([HI + 1]);
      zs.forEach(function (z, i) { var a = Math.max(LO, edges[i]), b = Math.min(HI + 1, edges[i + 1]); if (b <= a) return;
        svg.appendChild(S("rect", { x: x0(a), y: 0, width: (b - a) * W, height: 14, fill: COLS[i % COLS.length], opacity: .85 }));
        var t = S("text", { x: x0(a) + (b - a) * W / 2, y: 10.5, "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: "#000" }); t.textContent = z.name + "  " + MS.name(a) + "–" + MS.name(b - 1); svg.appendChild(t); });
      for (var m = LO; m <= HI; m++) { var r = S("rect", { x: x0(m) + .5, y: 16, width: W - 1, height: 40, rx: 1.5, fill: black(m) ? "#222" : "#f4f4f4", stroke: "#888", "stroke-width": .5 });
        r.dataset.m = m; svg.appendChild(r); keyEls[m] = r; if (m % 12 === 0) { var c = S("text", { x: x0(m) + 1, y: 63, "font-size": 7, fill: "currentColor" }); c.textContent = MS.name(m); svg.appendChild(c); } }
      cfg.splits.forEach(function (sp, i) { var hx = x0(sp), g = S("g", { style: "cursor:ew-resize" });
        g.appendChild(S("rect", { x: hx - 3, y: 0, width: 6, height: 58, fill: learn === i ? "#e0a030" : "#000", opacity: .8 })); svg.appendChild(g);
        g.addEventListener("pointerdown", function (e) { e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch (er) {}
          function mv(ev) { var p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; p = p.matrixTransform(svg.getScreenCTM().inverse());
            var m2 = Math.round(p.x / W) + LO, lo = i ? cfg.splits[i - 1] + 1 : LO + 1, hi = i < cfg.splits.length - 1 ? cfg.splits[i + 1] - 1 : HI;
            cfg.splits[i] = Math.max(lo, Math.min(hi, m2)); draw(); }
          function up() { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); save(); }
          g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); }); });
      drawKeys();
      zl.innerHTML = "";
      zs.forEach(function (z, i) { var w = h("span", "ms-z"), sw = h("span", "ms-sw"); sw.style.background = COLS[i % COLS.length]; w.appendChild(sw); w.appendChild(h("b", null, z.name));
        var oc = cfg.oct[z.k] || 0, dn = h("button", null, "−"), up = h("button", null, "+"); dn.type = up.type = "button";
        dn.setAttribute("aria-label", z.name + " octave down"); up.setAttribute("aria-label", z.name + " octave up");
        dn.onclick = function () { cfg.oct[z.k] = Math.max(-3, oc - 1); save(); draw(); }; up.onclick = function () { cfg.oct[z.k] = Math.min(3, oc + 1); save(); draw(); };
        w.appendChild(h("span", "ms-dim", "octave")); w.appendChild(dn); w.appendChild(h("span", null, (oc > 0 ? "+" : "") + oc)); w.appendChild(up); zl.appendChild(w); });
      cfg.splits.forEach(function (sp, i) { var b = h("button", learn === i ? "ms-on" : null, learn === i ? "Press a key on the MIDI keyboard…" : "Learn split " + (i + 1) + " (" + zs[i + 1].name + " starts at " + MS.name(sp) + ")");
        b.type = "button"; b.onclick = function () { learn = learn === i ? -1 : i; draw(); }; zl.appendChild(b); });
      if (cfg.splits.length) { var rs = h("button", null, "Default splits"); rs.type = "button"; rs.onclick = function () { cfg.splits = defaults(zs.length); save(); draw(); }; zl.appendChild(rs); }
      if (zs.length === 1) zl.appendChild(h("span", "ms-dim", "One manual: the whole keyboard plays it."));
    }
    function drawKeys() { Object.keys(keyEls).forEach(function (m) { var r = keyEls[m]; r.setAttribute("fill", lit[m] ? "#e0a030" : black(+m) ? "#222" : "#f4f4f4"); }); }
    me.refresh = function () { Object.keys(held).forEach(function (m) { var hd = held[m]; o.onNote(hd.k, hd.n, 0, false); }); held = {}; lit = {}; learn = -1; load(); draw(); };
    me.el = box; me.refresh(); me.status(); mounted.push(me);
    return me;
  };
})();
