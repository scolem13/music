// syllable-check.js — EXPERIMENTAL "Check my syllables": the microphone + syllable-detect.js + rhythm-chant.js's plan, behind one button.
//   SyllableCheck.mount(bar, { getRound: () -> { abc, qpm, syl } | null, status: <element> })
//        abc: the pattern as played (rhythm-pattern ABC on a pitch); qpm: quarter notes per minute it was played at; syl: "Du De Du | ..." (Audiation.rhythmSyllables)
//   Press "Check my syllables (experimental)", chant the pattern at the tempo you heard, press "Stop and check" (or wait 20 s). The take is aligned to
//   the expected onsets (it does not matter when you start), then each onset is classified Du / De / Da / Di / Ta.
//   Needs PitchDetect (the microphone), RhythmChant (the expected timing), SyllableDetect. Nothing leaves the page: the take is analysed in memory.
(function (global) {
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function expected(round) {
    var p = global.RhythmChant.plan(round.abc, { qpm: round.qpm, vary: false, jitterMs: 0, seed: 1 });
    var syls = round.syl.split(/\s+/).filter(function (x) { return x && x !== "|"; });
    if (syls.length !== p.notes.length) return null;
    var t0 = p.notes[0].t;
    return p.notes.map(function (n, i) { return { t: n.t - t0, syl: syls[i] }; });
  }
  function mount(bar, o) {
    if (!global.PitchDetect || !global.RhythmChant || !global.SyllableDetect) return null;
    var btn = el("button", null, "Check my syllables (experimental)"), out = el("div", "au-explain"), mic = null, chunks = [], sr = 44100, timer = 0;
    btn.type = "button"; bar.appendChild(btn); bar.parentNode.appendChild(out);
    function say(h) { out.innerHTML = h; }
    function finish() {
      clearTimeout(timer); if (mic) { mic.stop(); mic = null; } btn.textContent = "Check my syllables (experimental)";
      var n = 0; chunks.forEach(function (c) { n += c.length; }); var x = new Float32Array(n), k = 0; chunks.forEach(function (c) { x.set(c, k); k += c.length; }); chunks = [];
      var round = o.getRound(), exp = round && expected(round);
      if (!exp) return say("<p class='au-hint'>Play a rhythm pattern first.</p>");
      var a = global.SyllableDetect.align(x, sr, exp.map(function (e) { return e.t; }));
      if (a.hits < Math.ceil(exp.length / 2)) return say("<p class='au-hint'>I could not find the pattern in that take (" + a.hits + " of " + exp.length + " onsets lined up). Chant it at the tempo you heard, in a quiet room, close to the microphone.</p>");
      var r = global.SyllableDetect.analyze(x, sr, exp.map(function (e) { return { t: e.t + a.off, syl: e.syl }; }));
      say("<p>" + r.onsets.map(function (q) { return q.ok ? "<b>" + q.expected.syl + "</b> ✓" : q.expected.syl + " ✗ <span class='au-hint'>(" + (q.heard ? "heard " + q.heard : "no onset") + ")</span>"; }).join(" &nbsp; ") + "</p>" +
        "<p class='au-hint'>Experimental: it tells vowels apart (u e a i) and a breathy Ta from a voiced Da. It was tested on a synthetic voice only; a noisy or echoing room, a child's voice or fast tempos make it unreliable. " + Math.round(100 * r.accuracy) + "% matched.</p>");
    }
    btn.onclick = function () {
      if (mic) return finish();
      if (!o.getRound()) return say("<p class='au-hint'>Play a rhythm pattern first.</p>");
      mic = global.PitchDetect.mic({ onBlock: function (d, n0, rate) { sr = rate; chunks.push(Float32Array.from(d)); } });
      mic.start().then(function () { btn.textContent = "Stop and check"; say("<p class='au-hint'>Listening. Chant the pattern in syllables.</p>"); timer = setTimeout(finish, 20000); })
        .catch(function (e) { mic = null; say("<p class='au-warn'>" + (e && e.message || e) + "</p>"); });
    };
    return { button: btn, finish: finish };
  }
  global.SyllableCheck = { mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
