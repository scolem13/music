// MIDI learn: bind a key, a pedal or a controller to any button on a page, so a footswitch (or the top / bottom key of a keyboard) can
// press it. Loaded on every page from _includes/head.html. A "MIDI" icon joins the navbar's tools (Metronome, Drone, ...) on any page with
// buttons in its content; its panel connects MIDI, turns Learn on (click a button, then press the key or pedal), lists the bindings.
//
// Bindings are kept per page in localStorage `midi-learn-v1`: { [pathname]: { [buttonKey]: { kind, id, ch } | null } }
//   kind "note" | "cc" | "pc"; ch 0-15, or absent = any channel; null = a page default the user removed.
//   buttonKey: "#id", else the button's data-midi-id, else "text:<its text>:<n>" (the n-th button with that text).
// A page gives defaults on the buttons themselves: data-midi="note:108" (or "cc:64", "pc:3"; ":ch" appended for one channel).
// A note press is a note-on; a controller press is crossing 64 upwards; a program change is a press on its own.
// Remembered: once MIDI was allowed (`midi-learn-on`), later pages connect without asking.
//
//   MidiLearn.connect()          -> Promise (asks for Web MIDI once)
//   MidiLearn.isBound(msg)       true when a { kind, id, ch } press would press a button here (a page grading notes skips those)
//   MidiLearn.subscribe(fn)      fn(msg) for every message that arrives: { kind, id, ch, value, time }
//   MidiLearn.inject(kind, id, value, ch)   a fake message (tests)
//   MidiLearn.refresh()          look for buttons again (a page that draws its buttons late)
(function (global) {
  "use strict";
  if (global.MidiLearn) return;
  var KEY = "midi-learn-v1", ON = "midi-learn-on";
  var access = null, connecting = null, learning = false, armed = null, last = {}, seen = null, subs = [], ui = null;

  function store() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function mine() { return store()[location.pathname] || {}; }
  function saveMine(m) { var s = store(); s[location.pathname] = m; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function parseSpec(s) {
    var m = /^(note|cc|pc):(\d+)(?::(\d+))?$/.exec(String(s || "").trim()); if (!m) return null;
    var o = { kind: m[1], id: +m[2] }; if (m[3]) o.ch = +m[3] - 1; return o;
  }
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function describe(b) {
    if (!b) return "–";
    var s = b.kind === "note" ? "Note " + NAMES[b.id % 12] + (Math.floor(b.id / 12) - 1) + " (" + b.id + ")" : b.kind === "cc" ? "Controller " + b.id : "Program " + (b.id + 1);
    return s + (b.ch != null ? ", ch " + (b.ch + 1) : "");
  }

  // ---------- the buttons of the page ----------
  var SKIP = "header, nav, #quarto-header, .sidebar, #TOC, .ml-panel, .pw-panel, .code-copy-button, .works-cited, [data-midi='off']";
  function candidates() {
    var main = document.querySelector("main") || document.body;
    return Array.prototype.filter.call(main.querySelectorAll("button, [role=button], input[type=button], input[type=submit]"),
      function (b) { return !b.closest(SKIP); });
  }
  function keyOf(b) {
    if (b.id) return "#" + b.id;
    if (b.dataset.midiId) return "id:" + b.dataset.midiId;
    var t = label(b), n = 0;
    candidates().some(function (c) { if (c === b) return true; if (!c.id && label(c) === t) n++; return false; });
    return "text:" + t + ":" + n;
  }
  function label(b) {
    var t = b.getAttribute("aria-label");
    if (!t) { t = ""; b.childNodes.forEach(function (n) { if (!(n.classList && n.classList.contains("ml-badge")) && n.nodeName !== "KBD") t += n.textContent; }); }
    return (t || b.value || "").replace(/\s+/g, " ").trim().slice(0, 60);
  }
  function byKey(k) {
    if (k[0] === "#") return document.getElementById(k.slice(1));
    if (k.indexOf("id:") === 0) return document.querySelector('[data-midi-id="' + k.slice(3).replace(/"/g, '\\"') + '"]');
    var m = /^text:(.*):(\d+)$/.exec(k); if (!m) return null;
    var hits = candidates().filter(function (c) { return !c.id && label(c) === m[1]; });
    return hits[+m[2]] || null;
  }
  // the bindings in force: page defaults (data-midi), then the user's own over them
  function bindings() {
    var out = {}, own = mine();
    Array.prototype.forEach.call(document.querySelectorAll("[data-midi]"), function (b) {
      var spec = parseSpec(b.dataset.midi); if (spec) out[keyOf(b)] = spec;
    });
    Object.keys(own).forEach(function (k) { if (own[k]) out[k] = own[k]; else delete out[k]; });
    return out;
  }
  function same(a, b) { return a.kind === b.kind && a.id === b.id && (a.ch == null || b.ch == null || a.ch === b.ch); }
  function isBound(msg) { var bs = bindings(); return Object.keys(bs).some(function (k) { return same(bs[k], msg); }); }

  function press(b) {
    if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") return false;
    b.classList.add("ml-hit"); setTimeout(function () { b.classList.remove("ml-hit"); }, 250);
    b.click(); return true;
  }

  // ---------- messages ----------
  function read(d) {
    if (!d || d.length < 2) return null;
    var k = d[0] & 0xf0, ch = d[0] & 0x0f;
    if (k === 0x90) return { kind: "note", ch: ch, id: d[1], value: d[2] || 0 };
    if (k === 0x80) return { kind: "note", ch: ch, id: d[1], value: 0 };
    if (k === 0xb0) return { kind: "cc", ch: ch, id: d[1], value: d.length > 2 ? d[2] : 0 };
    if (k === 0xc0) return { kind: "pc", ch: ch, id: d[1], value: 127, momentary: true };
    return null;
  }
  function onEvent(ev) {
    var msg = read(ev.data); if (!msg) return;
    var mark = ev.timeStamp + ":" + ev.data.join(",");          // the same press down two listener paths counts once
    if (mark === seen) return; seen = mark;
    msg.time = ev.timeStamp || performance.now();
    handle(msg);
  }
  function handle(msg) {
    subs.slice().forEach(function (f) { try { f(msg); } catch (e) { console.error(e); } });
    var slot = msg.kind + ":" + msg.ch + ":" + msg.id, was = last[slot] || 0;
    last[slot] = msg.momentary ? 0 : msg.value;
    var isPress = msg.kind === "note" ? msg.value > 0 : msg.kind === "pc" ? true : (msg.value >= 64 && was < 64);
    if (!isPress) return;
    if (ui) ui.monitor.textContent = "Last: " + describe(msg);
    if (learning) {
      if (!armed) { say("Click a button first, then press the key or pedal."); return; }
      var own = mine(), k = keyOf(armed), spec = { kind: msg.kind, id: msg.id, ch: msg.ch };
      var bs = bindings();
      Object.keys(bs).forEach(function (o) { if (o !== k && same(bs[o], spec)) own[o] = null; });   // one press, one button
      own[k] = spec; saveMine(own);
      say("“" + label(armed) + "” ← " + describe(spec) + ". Click another button, or Done.");
      armed.classList.remove("ml-armed"); armed = null; list(); badges();
      return;
    }
    var bs2 = bindings();
    Object.keys(bs2).forEach(function (k) { if (same(bs2[k], msg)) press(byKey(k)); });
  }

  function hook() {
    access.inputs.forEach(function (inp) {
      if (inp._mlBound) return; inp._mlBound = true;
      inp.addEventListener("midimessage", onEvent);
      if (inp.open) try { inp.open(); } catch (e) {}
    });
    status();
  }
  function connect() {
    if (access) return Promise.resolve(access);
    if (connecting) return connecting;
    if (!navigator.requestMIDIAccess) return Promise.reject(new Error("This browser has no Web MIDI. Use Chrome or Edge."));
    connecting = navigator.requestMIDIAccess({ sysex: false }).then(function (a) {
      access = a; try { localStorage.setItem(ON, "yes"); } catch (e) {}
      a.addEventListener("statechange", hook); hook(); return a;
    });
    connecting.catch(function () { connecting = null; });
    return connecting;
  }
  function inputNames() { var n = []; if (access) access.inputs.forEach(function (i) { n.push(i.name); }); return n; }

  // ---------- the panel ----------
  var CSS = ".ml-panel{position:fixed;z-index:1060;right:.75rem;top:4rem;width:min(22rem,calc(100vw - 1.5rem));max-height:calc(100vh - 5rem);overflow:auto;" +
    "background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#222);border:1px solid var(--bs-border-color,#ccc);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:.8rem 1rem;font-size:.9rem}" +
    ".ml-panel[hidden]{display:none}.ml-panel h4{font-size:1rem;margin:0 0 .4rem;display:flex;justify-content:space-between;align-items:center}" +
    ".ml-panel .ml-x{border:0;background:none;font-size:1.2rem;line-height:1;color:inherit}" +
    ".ml-panel .ml-row{display:flex;gap:.4rem;flex-wrap:wrap;margin:.5rem 0}.ml-panel .ml-say{color:var(--bs-secondary-color,#666);margin:.3rem 0}" +
    ".ml-panel table{width:100%;border-collapse:collapse;margin:.3rem 0}.ml-panel td{padding:.2rem .25rem;border-top:1px solid var(--bs-border-color,#ddd);vertical-align:top}" +
    ".ml-panel td:last-child{text-align:right;white-space:nowrap}.ml-panel .ml-mon{font-family:ui-monospace,monospace;font-size:.8rem;color:var(--bs-secondary-color,#777)}" +
    "body.ml-learning main button:not(.ml-panel button),body.ml-learning main [role=button]{outline:2px dashed #7c3aed!important;outline-offset:2px;cursor:crosshair!important}" +
    ".ml-armed{outline:3px solid #7c3aed!important;box-shadow:0 0 0 6px rgba(124,58,237,.25)!important}" +
    ".ml-hit{box-shadow:0 0 0 4px rgba(124,58,237,.45)!important;transition:box-shadow .1s}" +
    ".ml-badge{display:inline-block;margin-left:.35em;padding:0 .3em;border-radius:4px;font-size:.7em;line-height:1.5;vertical-align:middle;background:rgba(124,58,237,.18);color:inherit;font-weight:600}" +
    ".ml-fixed{position:fixed;left:.75rem;bottom:.75rem;z-index:1045}";
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function say(t) { if (ui) ui.say.textContent = t; }
  function status() {
    if (!ui) return;
    var names = inputNames();
    ui.connect.hidden = !!access;
    ui.state.textContent = !navigator.requestMIDIAccess ? "This browser has no Web MIDI. Use Chrome or Edge." :
      !access ? "Not connected." : names.length ? "Listening: " + names.join(", ") : "Connected, but no MIDI device is plugged in.";
  }
  function list() {
    if (!ui) return;
    var bs = bindings(), keys = Object.keys(bs);
    ui.table.innerHTML = keys.length ? "" : '<tr><td class="ml-say">Nothing bound on this page yet.</td></tr>';
    keys.forEach(function (k) {
      var b = byKey(k), tr = el("tr");
      tr.appendChild(el("td", "", "")).textContent = b ? label(b) : k.replace(/^text:|:\d+$|^#|^id:/g, "");
      tr.appendChild(el("td", "", "")).textContent = describe(bs[k]);
      var x = el("button", "btn btn-sm btn-link p-0", "Remove"); x.type = "button";
      x.onclick = function () { var own = mine(); own[k] = null; saveMine(own); list(); badges(); };
      tr.appendChild(el("td")).appendChild(x);
      ui.table.appendChild(tr);
    });
  }
  function badges() {
    document.querySelectorAll(".ml-badge").forEach(function (b) { b.remove(); });
    var bs = bindings();
    Object.keys(bs).forEach(function (k) {
      var b = byKey(k); if (!b || b.tagName === "INPUT") return;
      var s = el("span", "ml-badge"); s.textContent = "🎹 " + describe(bs[k]).replace(/ \(\d+\)|, ch \d+/g, "");
      s.title = "Pressed by MIDI " + describe(bs[k]); b.appendChild(s);
    });
  }
  function setLearning(on) {
    learning = on; document.body.classList.toggle("ml-learning", on);
    if (armed) { armed.classList.remove("ml-armed"); armed = null; }
    ui.learn.textContent = on ? "Done" : "Learn";
    ui.learn.classList.toggle("btn-primary", on); ui.learn.classList.toggle("btn-outline-primary", !on);
    say(on ? "Click a button on the page, then press the key or pedal for it." : "");
    if (on && !access) connect().then(status, function (e) { say(e.message); });
  }
  // while learning, a click on a page button picks it instead of pressing it
  document.addEventListener("click", function (e) {
    if (!learning) return;
    var b = e.target.closest && e.target.closest("button, [role=button], input[type=button], input[type=submit]");
    if (!b || b.closest(".ml-panel") || b.closest(".ml-nav") || candidates().indexOf(b) < 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (armed) armed.classList.remove("ml-armed");
    armed = b; b.classList.add("ml-armed");
    say("“" + label(b) + "”: now press the key or pedal.");
  }, true);
  document.addEventListener("keydown", function (e) { if (learning && e.key === "Escape") setLearning(false); }, true);

  function build() {
    if (ui || !candidates().length) return;
    var st = el("style"); st.textContent = CSS; document.head.appendChild(st);
    var p = el("div", "ml-panel"); p.hidden = true; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "MIDI buttons");
    p.innerHTML = '<h4>MIDI buttons <button type="button" class="ml-x" aria-label="Close">×</button></h4>' +
      '<p class="ml-say" style="margin-top:0">Press a page button with a pedal or a key. Learn, click a button, then press the pedal or key.</p>' +
      '<div class="ml-state ml-say"></div><div class="ml-row"><button type="button" class="btn btn-sm btn-primary ml-connect">Connect MIDI</button>' +
      '<button type="button" class="btn btn-sm btn-outline-primary ml-learn">Learn</button>' +
      '<button type="button" class="btn btn-sm btn-outline-secondary ml-reset">Page defaults</button></div>' +
      '<div class="ml-say ml-msg" aria-live="polite"></div><table class="ml-table"></table><div class="ml-mon"></div>';
    document.body.appendChild(p);
    var q = function (s) { return p.querySelector(s); };
    ui = { panel: p, state: q(".ml-state"), connect: q(".ml-connect"), learn: q(".ml-learn"), say: q(".ml-msg"), table: q(".ml-table"), monitor: q(".ml-mon") };
    ui.connect.onclick = function () { connect().then(status, function (e) { say(e.message); }); };
    ui.learn.onclick = function () { setLearning(!learning); };
    q(".ml-reset").onclick = function () { saveMine({}); list(); badges(); say("Back to this page's own bindings."); };
    q(".ml-x").onclick = function () { open(false); };
    // the opener: in the navbar's tools when they are there, else a small fixed button
    var nav = document.getElementById("pw-nav"), a;
    if (nav) {
      var li = el("li", "nav-item ml-nav"); a = el("a", "nav-link", '<svg class="pw-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9"/><circle cx="7.2" cy="12.0" r=".75" fill="currentColor"/><circle cx="8.6" cy="8.6" r=".75" fill="currentColor"/><circle cx="12.0" cy="7.2" r=".75" fill="currentColor"/><circle cx="15.4" cy="8.6" r=".75" fill="currentColor"/><circle cx="16.8" cy="12.0" r=".75" fill="currentColor"/><path d="M10 17.8h4"/></svg><span class="pw-label">MIDI buttons</span>');
      a.href = "#"; a.title = "MIDI buttons: press this page's buttons with a pedal or key"; a.setAttribute("role", "button");
      li.appendChild(a); nav.appendChild(li);
    } else { a = el("button", "btn btn-sm btn-outline-secondary ml-fixed ml-nav", "MIDI"); a.type = "button"; document.body.appendChild(a); }
    a.addEventListener("click", function (e) { e.preventDefault(); open(p.hidden); });
    status(); list(); badges();
  }
  function open(on) { if (!ui) return; ui.panel.hidden = !on; if (on) { status(); list(); } else if (learning) setLearning(false); }

  function start() {
    build();
    var wanted = false; try { wanted = localStorage.getItem(ON) === "yes"; } catch (e) {}
    if (wanted && navigator.requestMIDIAccess && global.isSecureContext) connect().then(status, function () {});
  }
  if (document.readyState === "complete") setTimeout(start, 300);
  else global.addEventListener("load", function () { setTimeout(start, 300); });   // after the navbar tools and the page's own buttons

  global.MidiLearn = {
    connect: connect, isBound: isBound,
    subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (g) { return g !== f; }); }; },
    inject: function (kind, id, value, ch) { handle({ kind: kind, id: id, value: value == null ? 127 : value, ch: ch || 0, time: performance.now() }); },
    refresh: function () { build(); list(); badges(); },
    describe: describe
  };
})(window);
