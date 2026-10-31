// abc-tab.js — guitar exercises on lesson pages (AbcTab). Every <div class="abc-tab"> holds ABC in a
// <script type="text/plain"> child and becomes a staff with tablature under it and a ▶ button that plays it on a guitar.
// Write the music for a guitar: K:C clef=treble-8 (sounds an octave below where it is written, as guitarists read it).
// Slurs are hammer-ons and pull-offs.
//   data-program  24 (default) plays it on the band's nylon guitar, 25 on its steel-string guitar (General MIDI numbers)
//   data-pos      the hand's position, the fret the index finger is on (default 0, the open strings); the tab keeps to it
//   data-tempo    beats per minute (overrides Q:)
//   data-loop     "true": a Loop button repeats the exercise
// The tablature is worked out from the notes (the lowest fret that suits, and one string for both notes of a slur, so a
// hammer-on or pull-off lies on a single string); H or P is written over each slur. The tab is in the first voice only.
// Needs abcjs; plays through AbcPlay (abc-play.js, loaded on first use).
(function (global) {
  var playing = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function stop() { var p = playing; if (p) { playing = null; try { p.synth.stop(); } catch (e) {} p.btn.textContent = p.label; p.btn.classList.remove("at-on"); } }
  // played on the band's guitar samples (AbcPlay, loaded here on first use): program 25 = steel strings, else nylon
  var ABC_PLAY = "/apps/shared/abc-play.js?v=17", abcPlayP = null;
  function abcPlay() {
    if (global.AbcPlay) return Promise.resolve(global.AbcPlay);
    return abcPlayP || (abcPlayP = new Promise(function (ok, no) { var e = document.createElement("script"); e.src = ABC_PLAY; e.onload = function () { ok(global.AbcPlay); }; e.onerror = function () { abcPlayP = null; no(); }; document.head.appendChild(e); }));
  }
  function play(ex, btn, label, loop) {
    var was = playing && playing.btn === btn; stop(); if (was) return;
    var me = { synth: { stop: function () {} }, btn: btn, label: label }; playing = me;
    btn.textContent = "■ Stop"; btn.classList.add("at-on");
    var sound = +ex.program === 25 ? "aguitar" : "nguitar";
    abcPlay().then(function (P) {
      (function go() {
        if (playing !== me) return;
        me.synth = P.play(ex.tune, { sound: sound, onEnd: function () { if (playing !== me) return; if (loop) setTimeout(go, 150); else stop(); } });
      })();
    }, function () { if (playing === me) stop(); });
  }
  var TUN = [40, 45, 50, 55, 59, 64], NS = "http://www.w3.org/2000/svg";
  function fretsOf(m, max) { var r = []; TUN.forEach(function (o, i) { if (m >= o && m - o <= max) r.push({ string: i, fret: m - o }); }); return r; }
  function tabOf(tune) {
    var els = [], au = tune.setUpAudio({}), seq = {}, order = [];
    tune.lines.forEach(function (ln) { if (ln.staff) ln.staff[0].voices[0].forEach(function (e) { els.push(e); }); });
    au.tracks[0].filter(function (e) { return e.cmd === "note"; }).forEach(function (e) { var k = Math.round(e.start * 1000); if (!seq[k]) { seq[k] = []; order.push(k); } seq[k].push(e.pitch); });
    order.sort(function (a, b) { return a - b; });
    var evs = [], n = 0, depth = 0;
    els.forEach(function (e) {
      if (e.el_type === "bar") { if (evs.length) evs.push({ bar: true }); return; }
      if (e.el_type !== "note" || !e.pitches) return;
      var ps = e.pitches, starts = 0, ends = 0;
      ps.forEach(function (p) { if (p.startSlur) starts += p.startSlur.length; if (p.endSlur) ends += p.endSlur.length; });
      var ev = { legato: depth > 0, tieEnd: ps.some(function (p) { return p.endTie; }) };
      depth = Math.max(0, depth + starts - ends);
      if (ev.tieEnd) return;                                          // a tied note is not struck again
      ev.m = (seq[order[n]] || []).sort(function (a, b) { return a - b; }); n++; evs.push(ev);
    });
    var pos = +tune.__pos || 0, prev = 3, notes = evs.filter(function (e) { return !e.bar; }), before = null;
    function pen(f) { if (!pos) return f > 4 ? (f - 4) * 3 : 0; return f === 0 ? 4 : f < pos ? (pos - f) * 3 : f > pos + 3 ? (f - pos - 3) * 3 : 0; }
    notes.forEach(function (ev, i) {
      ev.t = [];
      if (ev.m.length > 1) {                                           // a chord: each note on its own string, lowest frets
        var used = {};
        ev.m.forEach(function (m) { var c = fretsOf(m, 9).filter(function (x) { return !used[x.string]; }).sort(function (a, b) { return pen(a.fret) + a.fret * (pos ? 0.1 : 1) - pen(b.fret) - b.fret * (pos ? 0.1 : 1); })[0]; if (c) { used[c.string] = 1; ev.t.push(c); } });
        if (ev.t.length) prev = ev.t[0].string; before = ev; return;
      }
      var nx = notes[i + 1], cands = fretsOf(ev.m[0], 12);
      if (ev.legato && before && before.t.length) { var ok = cands.filter(function (c) { return before.t.some(function (q) { return q.string === c.string; }); }); if (ok.length) cands = ok; }
      var best = null, bc = 1e9, look = nx && nx.legato && nx.m.length === 1;
      [look, false].some(function (lk) {
        cands.forEach(function (c) {
          var cost = pen(c.fret) + c.fret * (pos ? 0.1 : 1) + Math.abs(c.string - prev) * 0.3;
          if (lk) { var d = nx.m[0] - TUN[c.string]; if (d < 0 || d > 9) return; cost += pen(d) + d * (pos ? 0.1 : 1); }
          if (cost < bc) { bc = cost; best = c; }
        });
        return best;
      });
      if (best) { ev.t = [best]; prev = best.string; }
      before = ev;
    });
    // draw
    var GAP = 14, STEP = 30, left = 40, top = 22, W = left + 10, x = {}, cols = [];
    evs.forEach(function (e, i) { if (e.bar) { W += 12; e.x = W - 6; } else { e.x = W + STEP / 2; W += STEP; } });
    W += 8; var H = top + GAP * 5 + 16, svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "at-tab"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Tablature"); svg.style.width = Math.min(W, 700) + "px"; svg.style.maxWidth = "100%";
    function mk(tag, a, txt, par) { var e = document.createElementNS(NS, tag); for (var q in a) e.setAttribute(q, a[q]); if (txt != null) e.textContent = txt; (par || svg).appendChild(e); return e; }
    function y(st) { return top + GAP * (5 - st); }
    for (var st = 0; st < 6; st++) mk("line", { x1: left - 12, y1: y(st), x2: W - 4, y2: y(st), stroke: "#888" });
    mk("text", { x: 4, y: top + 40, "font-size": 15, "font-weight": 800, fill: "#555" }, "T"); mk("text", { x: 4, y: top + 54, "font-size": 15, "font-weight": 800, fill: "#555" }, "A"); mk("text", { x: 4, y: top + 68, "font-size": 15, "font-weight": 800, fill: "#555" }, "B");
    mk("line", { x1: left - 12, y1: y(5), x2: left - 12, y2: y(0), stroke: "#333", "stroke-width": 2 });
    var last = null;
    evs.forEach(function (e) {
      if (e.bar) { mk("line", { x1: e.x, y1: y(5), x2: e.x, y2: y(0), stroke: "#333", "stroke-width": e === evs[evs.length - 1] ? 2.5 : 1 }); return; }
      (e.t || []).forEach(function (c) { mk("rect", { x: e.x - 8, y: y(c.string) - 7, width: 16, height: 14, fill: "#fff" }); mk("text", { x: e.x, y: y(c.string) + 4.5, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: "#222" }, String(c.fret)); });
      if (e.legato && last && last.t && last.t.length && e.t && e.t.length) {
        var b = e.t[0], a = last.t.filter(function (q) { return q.string === b.string; })[0] || last.t[0], ys = y(Math.max(a.string, b.string)) - 11, mid = (last.x + e.x) / 2;
        mk("path", { d: "M" + (last.x + 3) + "," + ys + " Q" + mid + "," + (ys - 12) + " " + (e.x - 3) + "," + ys, fill: "none", stroke: "#444", "stroke-width": 1.2 });
        mk("text", { x: mid, y: ys - 8, "text-anchor": "middle", "font-size": 11, "font-style": "italic", fill: "#444" }, TUN[b.string] + b.fret > TUN[a.string] + a.fret ? "H" : "P");
      }
      last = e;
    });
    var wrap = el("div", "at-tabwrap"); wrap.appendChild(svg); return wrap;
  }
  function build(host) {
    var src = host.querySelector('script[type="text/plain"]'), abc = (src ? src.textContent : host.getAttribute("data-abc") || "").trim();
    var ex = { program: +host.getAttribute("data-program") || 24 };
    var tempo = host.getAttribute("data-tempo"); if (tempo) abc = abc.replace(/^Q:.*\n?/m, "").replace(/^(K:.*)$/m, "Q:1/4=" + tempo + "\n$1");
    var staff = el("div", "at-staff"), bar = el("div", "at-bar");
    host.textContent = ""; host.appendChild(staff);
    var opts = { add_classes: true, paddingleft: 0, paddingright: 0, paddingbottom: 20, staffwidth: 640 };
    try { ex.tune = ABCJS.renderAbc(staff, abc, opts)[0]; } catch (e) { if (global.console) console.warn("AbcTab:", e); }
    if (ex.tune && host.getAttribute("data-tab") !== "off") { try { ex.tune.__pos = host.getAttribute("data-pos"); var t = tabOf(ex.tune); if (t) host.appendChild(t); } catch (e) { if (global.console) console.warn("AbcTab: tab", e); } }
    var b = el("button", "btn btn-sm btn-outline-secondary", "▶ Play"); b.type = "button";
    b.addEventListener("click", function () { play(ex, b, "▶ Play", false); });
    bar.appendChild(b);
    if (host.getAttribute("data-loop") === "true") {
      var l = el("button", "btn btn-sm btn-outline-secondary", "↻ Loop"); l.type = "button";
      l.addEventListener("click", function () { play(ex, l, "↻ Loop", true); });
      bar.appendChild(l);
    }
    host.appendChild(bar);
  }
  function init() {
    if (!global.ABCJS) return;
    var css = document.createElement("style");
    css.textContent = ".abc-tab{margin:.6rem 0 1.2rem;max-width:46rem}.at-staff{overflow-x:auto}.at-tabwrap{overflow-x:auto;margin:.1rem 0 .3rem}.at-bar{display:flex;gap:.4rem;flex-wrap:wrap}.at-bar .btn{font-family:var(--font-mono);font-size:.78rem}" +
      ".at-bar .btn.at-on{background:var(--site-accent-dk);border-color:var(--site-accent-dk);color:#fff}.abc-tab text.abcjs-annotation{font-style:italic}";
    document.head.appendChild(css);
    document.querySelectorAll(".abc-tab").forEach(build);
  }
  global.AbcTab = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
