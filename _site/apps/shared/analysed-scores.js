// analysed-scores.js — the scores on theory/analysed-scores/ (one page per piece).
//   <div class="as-score" data-bpm="66" data-pickup="1"><script type="text/plain">ABC</script></div>
// Drawn as wide as their box, abcjs wrapping the bars to fit; a grip on the right edge resizes every box (double-click resets; kept in
// localStorage). The first bar of each system is numbered (Classical Themes style). Figures written as superscript + subscript
// (I⁶₄) are redrawn stacked. Sound: the band's piano from AbcPlay.ctx(), scheduled here from abcjs's timing, so playback can start
// anywhere: ▶ / Space play from the lit position and pause; a click on a note or a Roman numeral moves the position there and sounds
// the chord at that moment (held while the button is held; with Shift held until the next click; a quick click rings briefly).
// Keys and form: data-keys (from the build script: [start in whole notes, key] at each change of key in the analysis) draws a strip
// of coloured key areas above the score (click one: it is lit in the score and played). A table .as-form in the same section, rows
// whose first cell gives the bars ("12–14", "Upbeat to 5–14"; or <tr data-bars="5-14" data-upbeat>), gets a ▶ in each row that lights and plays those bars in whichever tab's score is showing.
// AnalysedScores.playBars(score, from, to, upbeat) does the same from other pages' links (?bars=7-9 on the address, too).
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
    bar.appendChild(play);
    // two settings for every score on the page, kept in localStorage: beams (the build writes beam groups as ABC backticks; off, they
    // become spaces) and, on four-part scores (soprano and alto above, tenor and bass below), the tenor on the treble staff (keyboard style)
    S.base = S.abc; S.four = /^%%score \(s1v1 s1v2\) \(s2v1 s2v2\)$/m.test(S.abc);
    if (/`/.test(S.abc)) { S.beamBtn = el("button", "btn btn-sm btn-outline-secondary as-beam"); S.beamBtn.type = "button"; bar.appendChild(S.beamBtn);
      S.beamBtn.addEventListener("click", function () { setting("as-beams", !setting("as-beams")); }); }
    if (S.four) { S.tenorBtn = el("button", "btn btn-sm btn-outline-secondary as-tenor"); S.tenorBtn.type = "button"; bar.appendChild(S.tenorBtn);
      S.tenorBtn.addEventListener("click", function () { setting("as-tenor-up", !setting("as-tenor-up")); }); }
    view(S);
    bar.appendChild(el("span", "as-help", "Space plays and pauses. Click a note or numeral to hear the chord there (hold, or Shift-click, to sustain)."));
    host.innerHTML = ""; host.appendChild(bar); S.strip = el("div", "as-keys"); host.appendChild(S.strip); box.appendChild(paper); box.appendChild(grip); host.appendChild(box);
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

  // keyboard style: soprano, alto and tenor share the treble staff (stems: soprano up, alto and tenor down), the bass alone below
  function keyboardStyle(abc) {
    return abc.replace("%%score (s1v1 s1v2) (s2v1 s2v2)", "%%score (s1v1 s1v2 s2v1) s2v2")
      .replace(/^V:s1v1 clef=treble(.*)$/m, "V:s1v1 clef=treble$1 stem=up").replace(/^V:s1v2 clef=treble(.*)$/m, "V:s1v2 clef=treble$1 stem=down")
      .replace(/^V:s2v1 clef=bass(.*)$/m, "V:s2v1 clef=treble$1 stem=down").replace(/^V:s2v2 clef=bass(.*)$/m, "V:s2v2 clef=bass$1 stem=auto");
  }
  // a setting: read (one argument) or set and redraw every score
  function setting(key, v) {
    if (v === undefined) { try { return localStorage.getItem(key) === "1"; } catch (e) { return false; } }
    try { localStorage.setItem(key, v ? "1" : "0"); } catch (e) {}
    settings[key] = v; scores.forEach(function (S) { if (view(S)) { S.lastW = 0; draw(S); } });
  }
  var settings = {};
  function on(key) { return key in settings ? settings[key] : setting(key); }
  // the ABC a score shows under the current settings, and its buttons' labels; true if it changed
  function view(S) {
    var a = S.base, tenor = S.four && on("as-tenor-up"), beams = on("as-beams");
    if (tenor) a = keyboardStyle(a);
    if (!beams) a = a.replace(/`/g, " ");
    if (S.tenorBtn) { S.tenorBtn.textContent = tenor ? "Tenor: treble staff" : "Tenor: bass staff"; S.tenorBtn.setAttribute("aria-pressed", tenor ? "true" : "false");
      S.tenorBtn.title = tenor ? "Move the tenor back to the bass staff (chorale style)" : "Move the tenor to the treble staff (keyboard style)"; }
    if (S.beamBtn) { S.beamBtn.textContent = beams ? "Beams: on" : "Beams: off"; S.beamBtn.setAttribute("aria-pressed", beams ? "true" : "false");
      S.beamBtn.title = beams ? "Show every note with its own flag" : "Beam short notes by the beat"; }
    var changed = a !== S.abc; S.abc = a; return changed;
  }

  function draw(S) {
    var w = Math.floor(S.paper.clientWidth); if (!w || Math.abs(w - S.lastW) < 8) return; S.lastW = w;
    if (S.playing) pause(S);
    S.tune = global.ABCJS.renderAbc(S.paper, S.abc, { staffwidth: Math.max(300, w - 50), add_classes: true, paddingleft: 22, paddingright: 0,
      wrap: { minSpacing: 2.2, maxSpacing: 3, preferredMeasuresPerLine: 3 } })[0];
    numberSystems(S.paper, +S.host.getAttribute("data-pickup") || 0);
    spaceSystems(S.paper, space());
    stackFigures(S.paper);
    timing(S);
    light(S, S.pos);
    if (S.hi) hiBars(S, S.hi[0], S.hi[1]);
  }
  // abcjs's timing: events (with their drawn elements) and every note's start, end and pitch, in ms
  function timing(S) {
    var t = S.tune; try { t.setUpAudio({}); } catch (e) {}
    var bpm = +S.host.getAttribute("data-bpm") || 0, mf = t.getMeterFraction(), q = bpm ? bpm * (4 / mf.den) : 0;   // Q is in the meter's beat
    S.events = (q ? t.setTiming(q / (t.getBeatLength() * 4)) : t.setTiming()).filter(function (e) { return e.type === "event"; });
    var msWhole = t.millisecondsPerMeasure() / (mf.num / mf.den);
    S.notes = []; S.events.forEach(function (e) { (e.midiPitches || []).forEach(function (m) { S.notes.push({ ms: e.milliseconds, end: e.milliseconds + m.duration * msWhole, midi: m.pitch }); }); });
    S.endMs = S.notes.reduce(function (a, n) { return Math.max(a, n.end); }, 0);
    // the analysis's chords: [start (whole notes), pitch classes] from data-chords (the build script, AbcNHT.chordPcs)
    var cs = []; try { cs = JSON.parse(S.host.getAttribute("data-chords") || "[]"); } catch (e) {}
    S.msBar = msWhole * mf.num / mf.den; S.pickMs = 0;
    if (+S.host.getAttribute("data-pickup")) { var first = S.events.find(function (e) { return e.measureStart && e.milliseconds > 0; }); if (first) S.pickMs = first.milliseconds; }
    var ks = []; try { ks = JSON.parse(S.host.getAttribute("data-keys") || "[]"); } catch (e) {}
    S.keys = ks.map(function (k, i) { return { ms: k[0] * msWhole, end: i + 1 < ks.length ? ks[i + 1][0] * msWhole : S.endMs, key: k[1] }; });
    keyStrip(S);
    S.spans = cs.filter(function (c) { return c[1]; }).map(function (c) { return { ms: c[0] * msWhole, pcs: c[1] }; }).sort(function (a, b) { return a.ms - b.ms; });
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
    if (!S.ranged) { S.stopAt = null; hiBars(S, 0, -1); } S.ranged = false;
    var from = S.pos, me = { raf: 0 }; S.playing = me; S.btn.textContent = "❚❚ Pause";
    bank().then(function (s) {
      if (S.playing !== me) return;
      var ac = s.ac, t0 = ac.currentTime + 0.1 - from / 1000; me.s = s; me.t0 = t0; me.ac = ac;
      S.notes.forEach(function (n) {
        if (n.end <= from + 1 || (S.stopAt != null && n.ms > S.stopAt)) return;
        var st = Math.max(n.ms, from);
        s.bank.play("piano", { midi: n.midi, vel: n.ms < from ? 0.4 : 0.7, dur: (n.end - st) / 1000 * 0.95 }, t0 + st / 1000, s.out);
      });
      (function tick() {
        if (S.playing !== me) return;
        var now = (ac.currentTime - t0) * 1000;
        if (now >= from) { S.pos = now; light(S, now); follow(S); keyNow(S, now); }
        if (S.stopAt != null && now > S.stopAt) { pause(S); S.stopAt = null; return; }
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
  // the chord the analysis names there: every note written from its label to the next one (or held into it) whose pitch class is
  // one of the chord's, so a chord spread through arpeggios or reached after non-chord tones is heard whole
  function chordTones(S, ms) {
    var i = -1; (S.spans || []).forEach(function (s, k) { if (s.ms <= ms + 1) i = k; });
    if (i < 0) return chordAt(S, ms);
    var a = S.spans[i].ms, b = i + 1 < S.spans.length ? S.spans[i + 1].ms : Infinity, pcs = S.spans[i].pcs, seen = {};
    S.notes.forEach(function (n) { if (n.ms < b - 1 && n.end > a + 1 && pcs.indexOf(((n.midi % 12) + 12) % 12) >= 0) seen[n.midi] = 1; });
    var out = Object.keys(seen).map(Number).sort(function (x, y) { return x - y; });
    return out.length ? out : chordAt(S, ms);
  }
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
    var mids = chordTones(S, ms), t0 = Date.now(), me = { shift: e.shiftKey, stopped: false };
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
      var t = document.createElementNS(NS, "text"); t.setAttribute("class", "ct-barno abcjs-l" + l);   // moves with its system
      t.style.setProperty("font-family", '"Bar Numbers Mono", ui-monospace, monospace', "important");
      t.style.setProperty("font-weight", "400", "important");
      t.setAttribute("text-anchor", "end"); t.setAttribute("x", (st.x - 3).toFixed(1)); t.setAttribute("y", (st.y + 1).toFixed(1)); t.textContent = String(n);   // left of the staff, clear of the clef
      svg.appendChild(t);
    });
  }
  // extra space between systems: abcjs's wrap ignores %%staffsep, so each system's elements (tagged abcjs-lN) move down by N × extra
  function spaceSystems(paper, extra) {
    var svg = paper.querySelector("svg"); if (!svg || !extra) return;
    var maxL = 0;
    svg.querySelectorAll("[class*='abcjs-l']").forEach(function (e) {
      var m = /(?:^|\s)abcjs-l(\d+)(?:\s|$)/.exec(e.getAttribute("class") || ""); if (!m || +m[1] === 0) return;
      var p = e.parentNode; while (p && p !== svg) { if (/(?:^|\s)abcjs-l\d+(?:\s|$)/.test(p.getAttribute && p.getAttribute("class") || "")) return; p = p.parentNode; }   // moved with its group
      var l = +m[1]; maxL = Math.max(maxL, l);
      e.setAttribute("transform", "translate(0," + (l * extra) + ")" + (e.getAttribute("transform") ? " " + e.getAttribute("transform") : ""));
    });
    paper.style.height = ""; paper.style.overflow = "visible";   // abcjs fixed the box's height to the drawing before the move
    var vb = svg.viewBox && svg.viewBox.baseVal, add = maxL * extra;
    if (vb && vb.height) svg.setAttribute("viewBox", [vb.x, vb.y, vb.width, vb.height + add].join(" "));
    var h = parseFloat(svg.getAttribute("height")); if (h) svg.setAttribute("height", h + add);
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
  // Follow (sidebar box, on unless turned off): a lit note below the bottom of the window brings its line to the top
  var FOLLOW_KEY = "as-follow";
  function following() { try { return localStorage.getItem(FOLLOW_KEY) !== "0"; } catch (e) { return true; } }
  function follow(S) {
    if (!following()) return;
    var g = S.paper.querySelector(".abc-on"); if (!g) return;
    var r = g.getBoundingClientRect(); if (r.bottom > window.innerHeight - 8 || r.bottom < 0) window.scrollBy(0, r.top - 90);
  }
  // the space between systems: a slider at the top of the page's right sidebar, kept in localStorage
  var SPACE_KEY = "as-staffsep";
  function space() { try { var v = localStorage.getItem(SPACE_KEY); return v == null ? 60 : +v; } catch (e) { return 60; } }
  function spaceControl() {
    var side = document.getElementById("as-space-slot") || document.getElementById("quarto-margin-sidebar") || document.querySelector(".as-score"); if (!side) return;   // a page can give it a place: #as-space-slot
    var box = el("div"), lab = el("label", null, "Space between systems"), r = el("input"), out = el("span", null, " " + space());
    box.id = "as-space"; r.type = "range"; r.min = 0; r.max = 200; r.step = 10; r.value = space();
    lab.appendChild(out); box.appendChild(lab); box.appendChild(r);
    var fl = el("label"), fb = el("input"); fb.type = "checkbox"; fb.checked = following(); fl.appendChild(fb); fl.appendChild(document.createTextNode(" Follow playback"));
    fl.title = "While playing: when the lit notes go below the bottom of the window, the page jumps so they are at the top";
    fb.addEventListener("change", function () { try { localStorage.setItem(FOLLOW_KEY, fb.checked ? "1" : "0"); } catch (e) {} });
    box.appendChild(fl); side.insertBefore(box, side.firstChild);
    r.addEventListener("input", function () { out.textContent = " " + r.value; try { localStorage.setItem(SPACE_KEY, r.value); } catch (e) {}
      scores.forEach(function (s) { s.lastW = 0; draw(s); }); });
  }
  // ---- bars, keys and form
  // the start of bar n (as numbered on the score) in ms; with a pickup, bar 1 is the first full bar
  function barMs(S, n) { return S.pickMs ? S.pickMs + (n - 1) * S.msBar : (n - 1) * S.msBar; }
  function barOf(S, ms) { return Math.floor((ms - S.pickMs) / S.msBar + 1e-6) + 1; }
  // light bars a..b (the notes of those bars take the class as-hi); b < a clears
  function hiBars(S, a, b) {
    S.hi = b >= a ? [a, b] : null;
    S.paper.querySelectorAll(".as-hi").forEach(function (n) { n.classList.remove("as-hi"); });
    if (!S.hi) return;
    var off = S.pickMs ? 0 : 1;
    S.paper.querySelectorAll(".abcjs-note, .abcjs-rest").forEach(function (n) { var m = /abcjs-mm(\d+)/.exec(n.getAttribute("class")); if (m && +m[1] + off >= a && +m[1] + off <= b) n.classList.add("as-hi"); });
  }
  // play bars a..b (upbeat: from the last beat of bar a-1), lit; the score scrolled into view
  function playBars(S, a, b, upbeat) {
    if (!S || !S.msBar) return;
    var from = barMs(S, a) - (upbeat ? S.msBar / (global.ABCJS ? S.tune.getMeterFraction().num : 4) : 0), to = barMs(S, b + 1) - 1;
    from = Math.max(0, from);
    if (S.playing) pause(S);
    hiBars(S, a, b); active = S; S.pos = from; S.stopAt = to; S.ranged = true; light(S, from);
    var r = S.host.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.6) S.host.scrollIntoView({ behavior: "smooth", block: "start" });
    start(S);
  }
  // key names: "c#" -> c♯ (minor), "E" -> E; hue from the key's place on the circle of fifths (relative keys share it)
  var FIFTHS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, "G#": 8, "D#": 9, "A#": 10, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7, Fb: -8 };
  function keyName(k) { return k.replace("#", "♯").replace(/(.)b$/, "$1♭") + (k[0] === k[0].toLowerCase() ? " minor" : " major"); }
  function keyHue(k) { var minor = k[0] === k[0].toLowerCase(), t = k[0].toUpperCase() + k.slice(1), f = FIFTHS[t]; if (f == null) f = 0; if (minor) f -= 3; return ((f * 47) % 360 + 360 + 200) % 360; }
  function keyStrip(S) {
    var st = S.strip; if (!st) return; st.innerHTML = "";
    if (!S.keys || !S.keys.length) { st.style.display = "none"; return; }
    st.style.display = "";
    var lab = el("div", "as-keys-h", "Keys in this analysis (click one to hear it)"), row = el("div", "as-keys-row"), total = S.endMs || 1;
    st.appendChild(lab); st.appendChild(row);
    S.keys.forEach(function (k) {
      var a = barOf(S, k.ms), b = Math.max(a, barOf(S, k.end - 1)), seg = el("button", "as-key");
      seg.type = "button"; seg.style.flexGrow = Math.max(0.0001, (k.end - k.ms) / total); seg.style.setProperty("--h", keyHue(k.key));
      seg.textContent = k.key.replace("#", "♯").replace(/(.)b$/, "$1♭");
      seg.title = keyName(k.key) + ": bar" + (a === b ? " " + a : "s " + a + "–" + b);
      seg.addEventListener("click", function () { if (S.playing) pause(S); hiBars(S, a, b); active = S; S.pos = k.ms; S.stopAt = k.end - 1; S.ranged = true; light(S, k.ms); start(S); });
      k.el = seg; row.appendChild(seg);
    });
  }
  function keyNow(S, ms) { (S.keys || []).forEach(function (k) { if (k.el) k.el.classList.toggle("as-key-on", ms >= k.ms && ms < k.end); }); }
  // the score showing in a section (the open tab)
  // (a section with no score of its own, such as a form table under its own heading on a one-piece page, uses the page's)
  function shownIn(root) { var list = scores.filter(function (s) { return root.contains(s.host); }); if (!list.length && root !== document.body) return shownIn(document.body);
    return list.find(function (s) { return s.host.offsetParent; }) || list[0] || null; }
  function forms() {
    [].forEach.call(document.querySelectorAll(".as-form"), function (f) {
      var root = f.closest("section.level2") || document.body;
      f.querySelectorAll("tbody tr").forEach(function (tr) {   // bars from data-bars / data-upbeat, or the first cell ("Upbeat to 5–14")
        var c0 = tr.querySelector("td"), txt = tr.getAttribute("data-bars") || (c0 ? c0.textContent : ""), m = /(\d+)(?:\s*[–-]\s*(\d+))?/.exec(txt);
        if (!m) { if (c0 && c0.querySelector("strong")) tr.classList.add("as-sec"); return; }
        var a = +m[1], b = +(m[2] || m[1]), up = tr.hasAttribute("data-upbeat") || /upbeat/i.test(txt);
        var bt = el("button", "btn btn-sm btn-outline-primary as-form-play", "▶"); bt.type = "button"; bt.title = "Play bars " + a + (b > a ? "–" + b : "") + " in the score";
        var cell = tr.querySelector("td"); if (cell) cell.insertBefore(bt, cell.firstChild);
        bt.addEventListener("click", function () { f.querySelectorAll("tr.as-form-on").forEach(function (r) { r.classList.remove("as-form-on"); }); tr.classList.add("as-form-on"); playBars(shownIn(root), a, b, up); });
      });
    });
    // bar links: <a class="as-bars" data-bars="7-9" data-piece="beethoven-moonlight-1">
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.as-bars"); if (!a) return; e.preventDefault();
      var m = /(\d+)(?:\D+(\d+))?/.exec(a.getAttribute("data-bars")), piece = a.getAttribute("data-piece");
      var host = piece ? document.querySelector('.as-score[data-piece="' + piece + '"]') : null, root = host ? host.closest("section.level2") || document.body : document.body;
      playBars(shownIn(root), +m[1], +(m[2] || m[1]), a.hasAttribute("data-upbeat"));
    });
    // ?piece=…&bars=7-9 from another page: light those bars (playing needs a click, so the ▶ is left to the reader)
    var q = new URLSearchParams(location.search), bars = q.get("bars"), pc = q.get("piece");
    if (bars && pc) setTimeout(function () {
      var host = document.querySelector('.as-score[data-piece="' + pc + '"]'); if (!host) return;
      var S = shownIn(host.closest("section.level2") || document.body), m = /(\d+)(?:\D+(\d+))?/.exec(bars); if (!S || !m) return;
      var a = +m[1], b = +(m[2] || m[1]); hiBars(S, a, b); S.pos = barMs(S, a); light(S, S.pos); active = S;
      var g = S.paper.querySelector(".as-hi"); (g || S.host).scrollIntoView({ block: "center" });
    }, 600);
  }
  function init() { [].forEach.call(document.querySelectorAll(".as-score"), setup); spaceControl(); forms(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  // add / remove: scores made after the page loaded (the Modulation Finder's results)
  global.AnalysedScores = { add: function (host) { setup(host); }, remove: function (host) { if (active && active.host === host) { if (active.playing) pause(active); active = null; } scores = scores.filter(function (S) { if (S.host !== host) return true; if (S.playing) pause(S); return false; }); },
    scores: function () { return scores; }, chordAt: chordAt, chordTones: chordTones, playBars: playBars, hiBars: hiBars, barMs: barMs };
})(window);
