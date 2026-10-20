// analysed-scores.js — the scores on practice/analysed-scores.qmd.
//   <div class="as-score" data-bpm="66" data-pickup="1"><script type="text/plain">ABC</script></div>
// Drawn as wide as their box, abcjs wrapping the bars to fit; a grip on the right edge resizes every box (double-click resets; kept in
// localStorage). The first bar of each system is numbered (Classical Themes style). Figures written as superscript + subscript
// (I⁶₄) are redrawn stacked. Sound: the band's piano from AbcPlay.ctx(), scheduled here from abcjs's timing, so playback can start
// anywhere: ▶ / Space play from the lit position and pause; a click on a note or a Roman numeral moves the position there and sounds
// the chord at that moment (held while the button is held; with Shift held until the next click; a quick click rings briefly).
(function (global) {
  var KEY = "as-score-width", SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉", NS = "http://www.w3.org/2000/svg";
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function store(v) { try { if (v === undefined) return +localStorage.getItem(KEY) || 0; if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { return 0; } }
  var scores = [], active = null, held = null;   // held: a sounding chord { stop }

  function setup(host) {
    var src = host.querySelector('script[type="text/plain"]'); if (!src) return;
    var S = { host: host, abc: src.textContent, pos: 0, playing: null, tune: null, events: [], notes: [], lastW: 0 };
    var box = el("div", "as-box"), paper = el("div", "as-paper"), grip = el("div", "as-grip"), bar = el("div", "as-bar");
    grip.title = "Drag to resize · double-click to reset"; grip.setAttribute("role", "separator"); grip.setAttribute("aria-orientation", "vertical");
    var play = el("button", "btn btn-sm btn-outline-secondary", "▶ Play"); play.type = "button"; S.btn = play;
    bar.appendChild(play); bar.appendChild(el("span", "as-help", "Space plays and pauses. Click a note or numeral to hear the chord there (hold, or Shift-click, to sustain)."));
    host.innerHTML = ""; host.appendChild(bar); box.appendChild(paper); box.appendChild(grip); host.appendChild(box);
    var w0 = store(); if (w0) box.style.width = w0 + "px";
    S.paper = paper;
    new ResizeObserver(function () { draw(S); }).observe(paper);
    play.addEventListener("click", function () { active = S; toggle(S); });
    paper.addEventListener("pointerdown", function (e) { active = S; clickAt(S, e); });
    grip.addEventListener("pointerdown", function (e) {
      e.preventDefault(); grip.setPointerCapture(e.pointerId); document.body.classList.add("as-resizing");
      var x0 = e.clientX, start = box.getBoundingClientRect().width;
      function move(ev) { var w = Math.max(320, start + ev.clientX - x0); scores.forEach(function (s) { s.host.querySelector(".as-box").style.width = w + "px"; }); }
      function up() { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); document.body.classList.remove("as-resizing"); store(Math.round(box.getBoundingClientRect().width)); }
      grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up);
    });
    grip.addEventListener("dblclick", function () { store(null); scores.forEach(function (s) { s.host.querySelector(".as-box").style.width = ""; }); });
    scores.push(S);
  }

  function draw(S) {
    var w = Math.floor(S.paper.clientWidth); if (!w || Math.abs(w - S.lastW) < 8) return; S.lastW = w;
    if (S.playing) pause(S);
    S.tune = global.ABCJS.renderAbc(S.paper, S.abc, { staffwidth: Math.max(300, w - 30), add_classes: true, paddingleft: 0, paddingright: 0,
      wrap: { minSpacing: 2.2, maxSpacing: 3, preferredMeasuresPerLine: 3 } })[0];
    numberSystems(S.paper, +S.host.getAttribute("data-pickup") || 0);
    stackFigures(S.paper);
    timing(S);
    light(S, S.pos);
  }
  // abcjs's timing: events (with their drawn elements) and every note's start, end and pitch, in ms
  function timing(S) {
    var t = S.tune; try { t.setUpAudio({}); } catch (e) {}
    var bpm = +S.host.getAttribute("data-bpm") || 0, mf = t.getMeterFraction(), q = bpm ? bpm * (4 / mf.den) : 0;   // Q is in the meter's beat
    S.events = (q ? t.setTiming(q / (t.getBeatLength() * 4)) : t.setTiming()).filter(function (e) { return e.type === "event"; });
    var msWhole = t.millisecondsPerMeasure() / (mf.num / mf.den);
    S.notes = []; S.events.forEach(function (e) { (e.midiPitches || []).forEach(function (m) { S.notes.push({ ms: e.milliseconds, end: e.milliseconds + m.duration * msWhole, midi: m.pitch }); }); });
    S.endMs = S.notes.reduce(function (a, n) { return Math.max(a, n.end); }, 0);
  }
  function light(S, ms) {
    S.paper.querySelectorAll(".abc-on").forEach(function (n) { n.classList.remove("abc-on"); });
    var at = null; S.events.forEach(function (e) { if (e.milliseconds <= ms + 1) at = e.milliseconds; });
    if (at == null) return;
    S.events.forEach(function (e) { if (e.milliseconds === at) (e.elements || []).forEach(function (g) { (g || []).forEach(function (n) { if (n && n.classList) n.classList.add("abc-on"); }); }); });
  }

  // ---- sound
  function bank() { return global.AbcPlay.ctx().then(function (s) { return s.ac.resume().then(function () { return s.bank.load(["piano"]); }).then(function () { return s; }); }); }
  function toggle(S) { if (S.playing) pause(S); else start(S); }
  function start(S) {
    stopHeld(); scores.forEach(function (o) { if (o !== S && o.playing) pause(o); });
    if (S.pos >= S.endMs - 1) S.pos = 0;
    var from = S.pos, me = { raf: 0 }; S.playing = me; S.btn.textContent = "❚❚ Pause";
    bank().then(function (s) {
      if (S.playing !== me) return;
      var ac = s.ac, t0 = ac.currentTime + 0.1 - from / 1000; me.s = s; me.t0 = t0; me.ac = ac;
      S.notes.forEach(function (n) {
        if (n.end <= from + 1) return;
        var st = Math.max(n.ms, from);
        s.bank.play("piano", { midi: n.midi, vel: n.ms < from ? 0.4 : 0.7, dur: (n.end - st) / 1000 * 0.95 }, t0 + st / 1000, s.out);
      });
      (function tick() {
        if (S.playing !== me) return;
        var now = (ac.currentTime - t0) * 1000;
        if (now >= from) { S.pos = now; light(S, now); }
        if (now > S.endMs + 200) { S.playing = null; S.pos = 0; S.btn.textContent = "▶ Play"; light(S, -1); return; }
        me.raf = requestAnimationFrame(tick);
      })();
    }).catch(function () { S.playing = null; S.btn.textContent = "▶ Play"; });
  }
  function pause(S) {
    var me = S.playing; S.playing = null; S.btn.textContent = "▶ Play";
    if (me) { cancelAnimationFrame(me.raf); if (me.s) me.s.bank.stopAll(); }
    var at = 0; S.events.forEach(function (e) { if (e.milliseconds <= S.pos + 1) at = e.milliseconds; }); S.pos = at; light(S, at);   // back to the lit chord
  }
  // the chord sounding at a moment (every note started at or before it and still going)
  function chordAt(S, ms) { return S.notes.filter(function (n) { return n.ms <= ms + 1 && n.end > ms + 1; }).map(function (n) { return n.midi; }); }
  function stopHeld() { if (held) { held.stop(); held = null; } }
  function clickAt(S, e) {
    var shiftHeld = held && held.shift;
    stopHeld();
    if (shiftHeld && !e.shiftKey) return;   // a click anywhere ends a Shift-sustained chord
    var g = e.target.closest && e.target.closest(".abcjs-note, .abcjs-rest"); if (!g) return;
    var ev = S.events.find(function (x) { return (x.elements || []).some(function (grp) { return (grp || []).indexOf(g) >= 0; }); }); if (!ev) return;
    var ms = ev.milliseconds;
    if (S.playing) { pause(S); S.pos = ms; start(S); return; }
    S.pos = ms; light(S, ms);
    var mids = chordAt(S, ms), t0 = Date.now(), me = { shift: e.shiftKey, stopped: false };
    me.stop = function () { if (me.stopped) return; me.stopped = true; if (me.s) me.s.bank.stopAll(); };
    held = me;
    bank().then(function (s) { if (me.stopped) return; me.s = s; mids.forEach(function (m) { s.bank.play("piano", { midi: m, vel: 0.65, dur: 30 }, s.ac.currentTime + 0.02, s.out); }); });
    if (!e.shiftKey) {
      var up = function () { document.removeEventListener("pointerup", up); var heldFor = Date.now() - t0;
        if (heldFor < 350) setTimeout(function () { if (held === me) { me.stop(); held = null; } }, 1400); else if (held === me) { me.stop(); held = null; } };
      document.addEventListener("pointerup", up);
    }
  }
  document.addEventListener("pointerdown", function (e) { if (held && held.shift && !e.target.closest(".as-paper")) stopHeld(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select|button/i.test(e.target.tagName) || e.target.isContentEditable) return;
    var S = active || visible(); if (!S) return;
    e.preventDefault(); active = S; toggle(S);
  });
  function visible() { return scores.find(function (s) { var r = s.paper.getBoundingClientRect(); return r.height && r.bottom > 0 && r.top < innerHeight; }) || null; }

  // ---- drawing extras
  function numberSystems(paper, pickup) {
    var svg = paper.querySelector("svg"); if (!svg) return;
    var firstOf = {};
    svg.querySelectorAll(".abcjs-note, .abcjs-rest").forEach(function (n) {
      var c = n.getAttribute("class"), mm = /abcjs-mm(\d+)/.exec(c), ln = /abcjs-l(\d+)/.exec(c); if (!mm || !ln) return;
      var l = +ln[1], m = +mm[1]; if (firstOf[l] === undefined || m < firstOf[l]) firstOf[l] = m;
    });
    var tops = {};
    svg.querySelectorAll(".abcjs-staff").forEach(function (s) { var ln = /abcjs-l(\d+)/.exec(s.getAttribute("class")); if (!ln) return; var b = s.getBBox(); if (tops[+ln[1]] === undefined || b.y < tops[+ln[1]].y) tops[+ln[1]] = b; });
    Object.keys(firstOf).forEach(function (l) {
      var n = firstOf[l] + (pickup ? 0 : 1), st = tops[l]; if (n < 1 || !st) return;
      var t = document.createElementNS(NS, "text"); t.setAttribute("class", "ct-barno");
      t.style.setProperty("font-family", '"Bar Numbers Mono", ui-monospace, monospace', "important");
      t.style.setProperty("font-weight", "400", "important");
      t.setAttribute("x", (st.x + 1).toFixed(1)); t.setAttribute("y", (st.y - 6).toFixed(1)); t.textContent = String(n);
      svg.appendChild(t);
    });
  }
  // "I⁶₄/V" -> I, then 6 over 4 (the 4 straight under the 6), then /V
  function stackFigures(paper) {
    paper.querySelectorAll("text.abcjs-annotation").forEach(function (t) {
      var s = t.textContent, m = /^(.*?)([⁰-⁹¹²³]+)([₀-₉]+)(.*)$/.exec(s); if (!m) return;
      var ts = t.querySelector("tspan"), x = ts ? ts.getAttribute("x") : t.getAttribute("x");
      while (t.firstChild) t.removeChild(t.firstChild);
      var digits = function (str, set) { return str.split("").map(function (c) { var i = set.indexOf(c); return i >= 0 ? String(i) : c; }).join(""); };
      var base = document.createElementNS(NS, "tspan"); base.setAttribute("x", x); base.textContent = m[1]; t.appendChild(base);
      var up = document.createElementNS(NS, "tspan"); up.setAttribute("font-size", "70%"); up.setAttribute("dy", "-0.42em"); up.textContent = digits(m[2], SUP); t.appendChild(up);
      var down = document.createElementNS(NS, "tspan"); down.setAttribute("font-size", "70%"); down.setAttribute("dy", "0.9em"); down.textContent = digits(m[3], SUB); t.appendChild(down);
      var w = up.getComputedTextLength(); down.setAttribute("dx", (-w).toFixed(2));
      if (m[4]) { var rest = document.createElementNS(NS, "tspan"); rest.setAttribute("dy", "-0.336em"); /* back to the baseline: +0.9em − 0.42em at 70% size */ rest.setAttribute("dx", Math.max(0, w - down.getComputedTextLength()).toFixed(2)); rest.textContent = m[4]; t.appendChild(rest); }
    });
  }
  function init() { [].forEach.call(document.querySelectorAll(".as-score"), setup); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  global.AnalysedScores = { scores: function () { return scores; }, chordAt: chordAt };
})(window);
