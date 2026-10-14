// abc-ex.js — sung exercises on lesson pages (AbcExercise). Every <div class="abc-ex"> holds ABC in a
// <script type="text/plain"> child (or a data-abc attribute) and becomes a staff with a ▶ button.
// A page-wide "Your voice" menu (#ax-voice, made here if the page has none) moves every exercise into the
// singer's range: the exercises are written for a middle voice and shift down or up by the semitones chosen.
// With data-loop="up" an exercise also gets a "Step up" button that plays it again a half step higher each
// time, the way a warm-up climbs through the range.
// Needs abcjs and soundfont.js (getSoundfontUrl).
(function (global) {
  var VOICES = [["-12", "Bass (an octave lower)"], ["-7", "Baritone / low alto"], ["-3", "Alto / tenor"], ["0", "Middle voice, as written"], ["3", "Mezzo"], ["5", "Soprano"]];
  var KEY = "abc-ex-voice";
  var shift = 0; try { shift = +(localStorage.getItem(KEY) || 0); } catch (e) {}
  var exes = [], playing = null;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function stop() { if (playing) { try { playing.synth.stop(); } catch (e) {} playing.btn.textContent = playing.label; playing = null; } }
  function play(ex, extra, btn, label) {
    var was = playing && playing.btn === btn; stop(); if (was) return;
    if (!global.ABCJS || !ABCJS.synth.supportsAudio() || !global.getSoundfontUrl) return;
    var s = new ABCJS.synth.CreateSynth(), me = { synth: s, btn: btn, label: label }; playing = me;
    btn.textContent = "■ Stop";
    getSoundfontUrl().then(function (u) {
      return s.init({ audioContext: new (global.AudioContext || global.webkitAudioContext)(), visualObj: ex.tune,
        options: { soundFontUrl: u, midiTranspose: extra || 0, program: 0 } });
    }).then(function () { return s.prime(); }).then(function (r) {
      if (playing !== me) return;
      s.start(); setTimeout(function () { if (playing === me) stop(); }, r.duration * 1000 + 200);
    }).catch(function () { if (playing === me) stop(); });
  }

  function draw(ex) {
    ex.tune = ABCJS.renderAbc(ex.staff, ex.abc, { responsive: "resize", visualTranspose: shift, add_classes: true, paddingleft: 0, paddingright: 0 })[0];
    ex.step = 0; if (ex.stepBtn) ex.stepBtn.textContent = "Step up ▲";
  }
  function build(host) {
    var src = host.querySelector('script[type="text/plain"]'), abc = (src ? src.textContent : host.getAttribute("data-abc") || "").trim();
    var ex = { host: host, abc: abc, staff: el("div", "ax-staff") };
    var bar = el("div", "ax-bar");
    var b = el("button", "btn btn-sm btn-outline-secondary", "▶ Play"); b.type = "button";
    b.addEventListener("click", function () { play(ex, 0, b, "▶ Play"); });
    bar.appendChild(b);
    if (host.getAttribute("data-loop") === "up") {
      var up = el("button", "btn btn-sm btn-outline-secondary", "Step up ▲"); up.type = "button"; ex.stepBtn = up;
      up.addEventListener("click", function () { ex.step = (ex.step || 0) + 1; up.textContent = "Step up ▲ (+" + ex.step + ")"; stop(); play(ex, ex.step, b, "▶ Play"); });
      var down = el("button", "btn btn-sm btn-outline-secondary", "Reset"); down.type = "button";
      down.addEventListener("click", function () { ex.step = 0; up.textContent = "Step up ▲"; });
      bar.appendChild(up); bar.appendChild(down);
    }
    host.textContent = "";
    host.appendChild(ex.staff); host.appendChild(bar);
    exes.push(ex); draw(ex);
  }

  function voiceMenu() {
    var sel = document.getElementById("ax-voice");
    if (!sel) {
      var first = document.querySelector(".abc-ex"); if (!first) return;
      var wrap = el("div", "ax-voice"), lab = el("label", null, "Your voice ");
      sel = el("select", "form-select form-select-sm"); sel.id = "ax-voice"; lab.appendChild(sel); wrap.appendChild(lab);
      wrap.appendChild(el("span", "ax-note", " Every exercise moves into this range."));
      var sec = first.closest("section"), anchor = sec ? sec.parentNode.querySelector("section") : first;
      anchor.parentNode.insertBefore(wrap, anchor);
    }
    VOICES.forEach(function (v) { sel.appendChild(new Option(v[1], v[0])); });
    sel.value = String(shift);
    sel.addEventListener("change", function () { shift = +sel.value; try { localStorage.setItem(KEY, shift); } catch (e) {} stop(); exes.forEach(draw); });
  }

  function init() {
    if (!global.ABCJS) return;
    var css = document.createElement("style");
    css.textContent = ".abc-ex{margin:.6rem 0 1.2rem;max-width:44rem}.ax-bar{display:flex;gap:.4rem;flex-wrap:wrap}.ax-bar .btn{font-family:var(--font-mono);font-size:.78rem}" +
      ".ax-voice{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:1rem 0;padding:.5rem .8rem;border:1px solid var(--site-border);border-radius:6px;background:var(--site-surface)}" +
      ".ax-voice label{font-family:var(--font-mono);font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--site-ink-2);display:flex;align-items:center;gap:.5rem}" +
      ".ax-voice select{width:auto}.ax-note{font-size:.85rem;color:var(--site-ink-2)}";
    document.head.appendChild(css);
    voiceMenu();
    document.querySelectorAll(".abc-ex").forEach(build);
  }
  global.AbcExercise = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
