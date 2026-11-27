// PanelKeys: drive a FaithfulPanel from the QWERTY keyboard with ONE hand, so the other stays on the MIDI keyboard.
// (Ideas from Surfingkeys / Vimium / vim: modes, mnemonic leader keys, counts left out, labels always on the panel, undo.)
//
// MODES (one site-wide choice, the strip under the panel): Piano = the computer keys play the page's QWERTY piano (default; nothing
//   here listens) | Panel · left hand | Panel · right hand = the keys shape the voice while the MIDI keyboard plays it. PanelKeys.mode()
//   -> "piano" | "L" | "R"; window event "panel-keys-mode" on change, so the band / DAW / notation pages can opt in the same way later.
// MODE: Piano until you pick the hand that is on the QWERTY keys:  `  (top left) = left hand,  \  (right of ]) = right hand.
//   The same key again turns it off. Kept in localStorage `panel-keys-hand`. While it is on, letters, digits, Space etc. go to
//   the panel and not to the page's computer-key piano (this listens in the capture phase and stops the event).
// KEYS (L = left hand, R = right hand):
//   section leader  one letter, the same for both hands, named for what it is (B3: u upper drawbars, l lower, b bass pedal,
//                   p percussion, v vibrato, s speaker / Leslie). Shown on the panel beside the section.
//   position        the controls of the section in panel order on the free hand's keys:  L a s g q w e r t c v   R h l ; y u i o p n m
//                   (the home row around the nudge keys first). Pressing one grabs that control (ringed). Inside a section its positions win; a letter that is
//                   not a position starts that section, otherwise Esc first.
//   nudge           R j / k = down / up as in vim; L mirrored: f = j (down), d = k (up); with Shift a coarse step. "Up" = more sound (drawbars: pulled out further).
//   digits          set the grabbed control: drawbars 0-8 exactly; other small whole-number ranges = that number; knobs 0-9 = tenths,
//                   switches 0 / 1, choices 1..n. With nothing grabbed a digit loads snapshot n; Shift + digit saves one
//                   (localStorage `panel-keys-snap:<layout id>`).
//   Esc             let go of the control, then leave the section.   Backspace = undo (each change).   ? = the key list.
//   hold keys       from the layout (B3: Space held = Leslie fast, let go = back; Shift + Space = latch slow / fast).
// LAYOUT: FaithfulPanel layout field  keys: { groups: [{ k: "u", name, ctl: [keys] | function (get) -> [keys] }],
//   hold: [{ code: "Space", key, on: value, name }] }. Keys are the panel's own bound keys (`inv:` keys are flipped: up = more).
// API: PanelKeys.attach(me, { id, get, set, range, layout }) -> handle (FaithfulPanel.mount calls it for layouts with `keys`,
//   not for read-only panels). PanelKeys.hand() -> "L" | "R" | null, .setHand(h), .state() (for tests), .HANDS.
(function () {
  if (window.PanelKeys) return;
  var PK = window.PanelKeys = {}, NS = "http://www.w3.org/2000/svg", HKEY = "panel-keys-hand";
  PK.HANDS = { L: { pos: "asgqwertcv", down: "KeyF", up: "KeyD", dn: "f", upn: "d", on: "Backquote", onn: "`" },
               R: { pos: "hl;yuiopnm", down: "KeyJ", up: "KeyK", dn: "j", upn: "k", on: "Backslash", onn: "\\" } };
  var hand = null; try { hand = localStorage.getItem(HKEY); } catch (e) {} if (hand !== "L" && hand !== "R") hand = null;
  var list = [], cur = null, sec = null, grab = null, undo = [], help = false, held = {};
  PK.hand = function () { return hand; };
  PK.mode = function () { return hand || "piano"; };
  PK.setHand = function (h) { hand = h === "L" || h === "R" ? h : null; try { if (hand) localStorage.setItem(HKEY, hand); else localStorage.removeItem(HKEY); } catch (e) {} sec = grab = null; help = false; draw();
    try { window.dispatchEvent(new CustomEvent("panel-keys-mode", { detail: PK.mode() })); } catch (e) {} };
  PK.state = function () { var p = target(); return { hand: hand, sec: sec, grab: grab, id: p && p.id, help: help, n: list.length }; };

  function S(tag, at) { var e = document.createElementNS(NS, tag); for (var a in at) if (at[a] != null) e.setAttribute(a, at[a]); return e; }
  function live() { list = list.filter(function (p) { return document.contains(p.me.el); }); return list; }
  function shown(p) { return p.me.el.offsetParent !== null; }
  function target() { live(); if (cur && list.indexOf(cur) >= 0 && shown(cur)) return cur; return list.filter(shown)[0] || null; }
  function groups(p) { return p.layout.keys.groups; }
  function gOf(p, k) { return groups(p).filter(function (g) { return g.k === k; })[0]; }
  function ctls(p, g) { var c = typeof g.ctl === "function" ? g.ctl(p.get) : g.ctl; return c.filter(function (k) { return p.range(k) && !(p.me.layoutEdits && p.me.layoutEdits.hidden(k)); }).slice(0, 10); }
  function charOf(code, key) { var m = /^Key([A-Z])$/.exec(code); if (m) return m[1].toLowerCase(); if (code === "Semicolon") return ";"; return key; }

  // ---- values ----
  function setv(p, k, v) { var old = p.get(k); if (old === v) return; var top = undo[undo.length - 1];
    if (!(top && top.p === p && top.k === k && Date.now() - top.t < 700)) undo.push({ p: p, k: k, v: old, t: Date.now() }); else top.t = Date.now();
    if (undo.length > 200) undo.shift(); p.set(k, v); p.me.refresh(); }
  function nudge(p, k, d, coarse) { var r = p.range(k), v = p.get(k), flip = /^inv:/.test(k) ? -1 : 1;
    if (r[2] === "s") return setv(p, k, d > 0);
    if (r[2] === "c") { var ch = r[3], i = ch.indexOf(v); return setv(p, k, ch[Math.max(0, Math.min(ch.length - 1, (i < 0 ? 0 : i) + d))]); }
    var span = r[4] - r[3], st = r[5] || span / 100, n = coarse ? Math.max(1, Math.round(span / 10 / st)) : Math.max(1, Math.round(span / 50 / st));
    setv(p, k, clampStep(+v + d * flip * n * st, r)); }
  function clampStep(v, r) { var st = r[5] || (r[4] - r[3]) / 100; v = Math.round((v - r[3]) / st) * st + r[3]; v = Math.max(r[3], Math.min(r[4], v)); return +v.toFixed(6); }
  function digit(p, k, d) { var r = p.range(k);
    if (r[2] === "s") return setv(p, k, d > 0);
    if (r[2] === "c") return setv(p, k, r[3][Math.max(0, Math.min(r[3].length - 1, d - 1))]);
    var span = r[4] - r[3], st = r[5] || 0, flip = /^inv:/.test(k);
    if (st >= 1 && span <= 9) return setv(p, k, clampStep(flip ? -d : r[3] + d, r));
    setv(p, k, clampStep(flip ? r[4] - span * d / 10 : r[3] + span * d / 10, r)); }
  function snapKey(p) { return "panel-keys-snap:" + p.id; }
  function snap(p, n, save) { var all = {}; try { all = JSON.parse(localStorage.getItem(snapKey(p)) || "{}"); } catch (e) {}
    if (save) { var d = {}; window.FaithfulPanel.bound(p.layout).forEach(function (k) { if (p.range(k)) d[k] = p.get(k); }); all[n] = d; try { localStorage.setItem(snapKey(p), JSON.stringify(all)); } catch (e) {} flash(p, "Saved snapshot " + n); return; }
    var s = all[n]; if (!s) return flash(p, "No snapshot " + n + " (Shift + " + n + " saves one)");
    Object.keys(s).sort(function (a, b) { return /^pre:/.test(b) - /^pre:/.test(a); }).forEach(function (k) { if (p.range(k)) setv(p, k, s[k]); }); flash(p, "Loaded snapshot " + n); }
  function label(p, k) { var it = p.layout.items.filter(function (x) { return x.k === k; })[0], r = p.range(k); return (it && it.label) || (r && r[1]) || k; }
  function shownVal(p, k) { var v = p.get(k), it = p.layout.items.filter(function (x) { return x.k === k; })[0]; if (it && it.fmt) return it.fmt(v); if (typeof v === "number") return String(+v.toFixed(2)); return String(v); }

  // ---- keys ----
  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target || {}; if (/INPUT|SELECT|TEXTAREA/.test(t.tagName || "") || t.isContentEditable) return;
    var p = target(); if (!p || p.me.editing) return;
    var H = PK.HANDS, code = e.code;
    if (code === H.L.on || code === H.R.on) { var nh = code === H.L.on ? "L" : "R"; PK.setHand(hand === nh ? null : nh); return stop(e); }
    if (!hand) return;
    var h = H[hand], hk = p.layout.keys.hold || [];
    for (var i = 0; i < hk.length; i++) if (hk[i].code === code) { var hd = hk[i];
      if (e.shiftKey) { if (!e.repeat) setv(p, hd.key, p.get(hd.key) === hd.on ? hd.off : hd.on); }
      else if (!held[code]) { held[code] = { p: p, k: hd.key, v: p.get(hd.key) }; setv(p, hd.key, hd.on); }
      draw(); return stop(e); }
    if (e.key === "?") { help = !help; draw(); return stop(e); }
    if (code === "Escape") { if (help) help = false; else if (grab) grab = null; else if (sec) sec = null; else return; draw(); return stop(e); }
    if (code === "Backspace") { var u = undo.pop(); if (u && document.contains(u.p.me.el)) { u.p.set(u.k, u.v); u.p.me.refresh(); } draw(); return stop(e); }
    var dm = /^Digit(\d)$/.exec(code);
    if (dm) { var d = +dm[1]; if (e.shiftKey) snap(p, d, true); else if (grab) digit(p, grab, d); else snap(p, d, false); draw(); return stop(e); }
    if (code === h.down || code === h.up) { if (grab) nudge(p, grab, code === h.up ? 1 : -1, e.shiftKey); draw(); return stop(e); }
    var ch = charOf(code, e.key);
    if (sec) { var cs = ctls(p, gOf(p, sec)), j = h.pos.indexOf(ch); if (j >= 0) { if (cs[j]) grab = cs[j]; draw(); return stop(e); } }
    var g = gOf(p, ch); if (g) { sec = g.k; var c0 = ctls(p, g); grab = c0[0] || null; draw(); return stop(e); }
    if (/^Key|Semicolon/.test(code)) return stop(e);   // a letter that means nothing here: swallow it, so the page's piano stays quiet while keys are on
  }, true);
  window.addEventListener("keyup", function (e) { var h = held[e.code]; if (!h) return; delete held[e.code]; if (document.contains(h.p.me.el)) setv(h.p, h.k, h.v); draw(); e.stopPropagation(); }, true);
  function stop(e) { e.preventDefault(); e.stopPropagation(); }

  // ---- drawing: letters on the panel and a strip under it ----
  function box(p, k) { return boxOf(p, p.me.svg.querySelectorAll('[data-ctl="' + k.replace(/"/g, '\\"') + '"]')); }
  function secBox(p, k) {   // the section a control sits in (FaithfulPanel's PanelLayout knows), else null
    var LE = p.me.layoutEdits, part = LE && LE.parts.filter(function (q) { return q.it.k === k; })[0];
    return part && part.sec ? boxOf(p, [part.sec.g]) : null; }
  function boxOf(p, els) { var b = null;
    var root = p.me.svg.getScreenCTM(); if (!root) return null; root = root.inverse();
    [].forEach.call(els, function (el) { var r, m; try { r = el.getBBox(); m = el.getScreenCTM(); } catch (e) { return; } if (!r.width || !m || el.closest("[data-pl-hide]")) return;
      m = root.multiply(m);   // the part's own box in panel units, after any move / resize from panel-layout.js
      [[r.x, r.y], [r.x + r.width, r.y + r.height]].forEach(function (c) { var x = m.a * c[0] + m.c * c[1] + m.e, y = m.b * c[0] + m.d * c[1] + m.f;
        b = b ? { x: Math.min(b.x, x), y: Math.min(b.y, y), x2: Math.max(b.x2, x), y2: Math.max(b.y2, y) } : { x: x, y: y, x2: x, y2: y }; }); });
    return b; }
  var BH = 11;   // badge height in panel units: small, so it sits in the gap above a control and not on its legend
  function badge(gr, x, y, text, cls) { var w = 4 + text.length * 6.2, g = S("g", { class: "pk-b " + cls });
    g.appendChild(S("rect", { x: x, y: y, width: w, height: BH, rx: 2.5 })); var t = S("text", { x: x + w / 2, y: y + 8.5, "text-anchor": "middle" }); t.textContent = text; g.appendChild(t); gr.appendChild(g); return w; }
  function drawOne(p) {
    var svg = p.me.svg, old = svg.querySelector(".pk-layer"); if (old) old.remove();
    p.me.el.classList.toggle("pk-on", !!hand && p === target());
    renderStrip(p);
    if (!hand || p !== target() || !shown(p)) return;
    var gr = S("g", { class: "pk-layer" }), h = PK.HANDS[hand];
    groups(p).forEach(function (g) { var cs = ctls(p, g), on = sec === g.k, first = null;
      cs.forEach(function (k, j) { var b = box(p, k); if (!b) return; if (!first) first = { k: k, b: b };
        var wide = b.x2 - b.x > 2.5 * (b.y2 - b.y);   // a wide control (a row of choices): on its top-left corner, clear of the legend above it
        badge(gr, wide ? b.x - 4 : (b.x + b.x2) / 2 - 5.1, wide ? b.y - BH + 4 : b.y - BH - 1, h.pos[j], on ? "pk-pos pk-act" : "pk-pos");   // else centred just above
        if (grab === k && on) gr.appendChild(S("rect", { class: "pk-ring", x: b.x - 3, y: b.y - 3, width: b.x2 - b.x + 6, height: b.y2 - b.y + 6, rx: 4 })); });
      if (!first) return;
      var sb = secBox(p, first.k);   // the leader on its section's top-left corner (across the border, clear of a centred title), else left of the first control
      if (sb) badge(gr, sb.x - 4, sb.y - BH / 2, g.k, on ? "pk-lead pk-act" : "pk-lead"); else badge(gr, first.b.x - 14, first.b.y - BH - 1, g.k, on ? "pk-lead pk-act" : "pk-lead"); });
    svg.appendChild(gr);
  }
  function renderStrip(p) {
    var s = p.strip; if (!s) { s = p.strip = document.createElement("div"); s.className = "pk-strip"; var sc = p.me.el.querySelector(".fp-scroll"); p.me.el.insertBefore(s, sc ? sc.nextSibling : null); }
    var H = PK.HANDS, txt;
    if (!s._seg) { var seg = s._seg = document.createElement("span"); seg.className = "pk-seg"; seg.setAttribute("aria-label", "Computer keys");
      seg.appendChild(document.createTextNode("Computer keys: "));
      [["piano", "Piano"], ["L", "Panel · left hand"], ["R", "Panel · right hand"]].forEach(function (m) { var b = document.createElement("button"); b.type = "button"; b.dataset.m = m[0]; b.textContent = m[1];
        b.onclick = function () { PK.setHand(m[0] === "piano" ? null : m[0]); }; seg.appendChild(b); });
      s._txt = document.createElement("span"); s.appendChild(seg); s.appendChild(s._txt); }
    [].forEach.call(s._seg.querySelectorAll("button"), function (b) { b.classList.toggle("pk-sel", b.dataset.m === PK.mode()); b.setAttribute("aria-pressed", b.dataset.m === PK.mode()); });
    if (!hand) txt = "the keys play the piano. With a MIDI keyboard, pick a Panel hand (or press <kbd>`</kbd> / <kbd>\\</kbd>) to shape the sound with the other.";
    else { var h = H[hand], g = sec && gOf(p, sec);
      txt = "<b>Keys: " + (hand === "L" ? "left" : "right") + " hand</b> · " +
        (g ? esc(g.name) + (grab ? " › <b>" + esc(label(p, grab)) + "</b> = " + esc(shownVal(p, grab)) : "") + " · <kbd>" + h.dn + "</kbd><kbd>" + h.upn + "</kbd> down / up (Shift coarse), <kbd>0</kbd>–<kbd>9</kbd> set, <kbd>Esc</kbd> back"
           : "sections: " + groups(p).map(function (x) { return "<kbd>" + x.k + "</kbd> " + esc(x.name); }).join(", ")) +
        " · <kbd>⌫</kbd> undo · <kbd>?</kbd> all keys · <kbd>" + h.onn + "</kbd> back to piano"; }
    if (s._flash && Date.now() < s._flash.t) txt += " · <i>" + esc(s._flash.m) + "</i>";
    s._txt.innerHTML = " " + txt + (help && hand ? helpHtml(p) : "");
  }
  function helpHtml(p) { var h = PK.HANDS[hand], rows = [];
    groups(p).forEach(function (g) { rows.push("<tr><th><kbd>" + g.k + "</kbd></th><td>" + esc(g.name) + "</td><td>" + ctls(p, g).map(function (k, j) { return "<kbd>" + esc(h.pos[j]) + "</kbd> " + esc(label(p, k)); }).join(" ") + "</td></tr>"); });
    (p.layout.keys.hold || []).forEach(function (x) { rows.push("<tr><th><kbd>" + esc(x.code.replace(/^Key/, "")) + "</kbd></th><td colspan=2>" + esc(x.name) + "</td></tr>"); });
    rows.push("<tr><th><kbd>0</kbd>–<kbd>9</kbd></th><td colspan=2>nothing grabbed: load snapshot · Shift: save snapshot</td></tr>");
    return "<table class='pk-help'>" + rows.join("") + "</table>"; }
  function flash(p, m) { if (p.strip) { p.strip._flash = { m: m, t: Date.now() + 2500 }; setTimeout(function () { renderStrip(p); }, 2600); } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function draw() { live().forEach(drawOne); }

  function css() { if (document.getElementById("pk-css")) return; var st = document.createElement("style"); st.id = "pk-css";
    st.textContent = ".pk-layer{pointer-events:none}.pk-b rect{fill:var(--fp-bg);stroke:var(--fp-ink2);opacity:.85}.pk-b text{font:700 8.5px ui-monospace,Menlo,monospace;fill:var(--fp-ink2)}" +
      ".pk-lead rect{stroke:var(--fp-ink)}.pk-lead text{fill:var(--fp-ink)}.pk-act rect{fill:#e0a030;stroke:#e0a030;opacity:1}.pk-act text{fill:#000}" +
      ".pk-ring{fill:none;stroke:#e0a030;stroke-width:2.5}.pk-strip{font-size:.85rem;padding:.3rem .5rem;margin:.2rem 0;border:1px solid var(--fp-line,#ccc);border-radius:4px;line-height:1.7}" +
      ".pk-strip kbd{font-size:.75rem;padding:0 .3rem;margin:0 .1rem;border:1px solid #999;border-radius:3px;background:rgba(127,127,127,.12)}.fp-w.pk-on .pk-strip{border-color:#e0a030}" +
      ".pk-seg button{font-size:.78rem;margin:0 .15rem;padding:0 .4rem;border:1px solid #999;border-radius:3px;background:none;color:inherit;cursor:pointer}.pk-seg button.pk-sel{background:#e0a030;border-color:#e0a030;color:#000}" +
      ".pk-help{margin:.4rem 0 .1rem;font-size:.8rem;border-collapse:collapse}.pk-help th,.pk-help td{padding:.1rem .5rem;text-align:left;vertical-align:top}";
    document.head.appendChild(st); }

  PK.attach = function (me, o) {
    css(); var p = { me: me, id: o.id, get: o.get, set: o.set, range: o.range, layout: o.layout || me.layout };
    list.push(p);
    var pick = function () { if (cur !== p) { cur = p; sec = grab = null; draw(); } };
    me.el.addEventListener("pointerdown", pick, true); me.el.addEventListener("focusin", pick);
    // the panel may be hidden at mount (Simple view): draw once it has a size
    if (window.ResizeObserver) new ResizeObserver(function () { drawOne(p); }).observe(me.svg); else setTimeout(function () { drawOne(p); }, 0);
    me.onLayout = me.onLayout || []; me.onLayout.push(function () { drawOne(p); });
    var r0 = me.refresh; me.refresh = function () { r0.apply(me, arguments); if (p.strip && grab) renderStrip(p); };
    drawOne(p); return p;
  };
})();
