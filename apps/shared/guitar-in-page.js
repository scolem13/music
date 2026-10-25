// guitar-in-page.js: the Guitar Input Check page (tools/guitar-in.qmd). "Play this note" / "Play this chord" against GuitarIn.
// window.TEST_MIC_SOURCE (a function (ctx) -> AudioNode) replaces the microphone in tests. window.GIPage exposes the state for tests.
(function () {
  "use strict";
  var GI = window.GuitarIn, OPEN = GI.OPEN, NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  var CHORDS = { // frets low string first, null = muted
    "C": [null, 3, 2, 0, 1, 0], "G": [3, 2, 0, 0, 0, 3], "D": [null, null, 0, 2, 3, 2], "A": [null, 0, 2, 2, 2, 0], "E": [0, 2, 2, 1, 0, 0],
    "Am": [null, 0, 2, 2, 1, 0], "Em": [0, 2, 2, 0, 0, 0], "Dm": [null, null, 0, 2, 3, 1],
    "G7": [3, 2, 0, 0, 0, 1], "D7": [null, null, 0, 2, 1, 2], "A7": [null, 0, 2, 0, 2, 0], "E7": [0, 2, 0, 1, 0, 0], "C7": [null, 3, 2, 3, 1, 0],
    "Am7": [null, 0, 2, 0, 1, 0], "Cmaj7": [null, 3, 2, 0, 0, 0], "Dsus4": [null, null, 0, 2, 3, 3],
    "F (barre)": [1, 3, 3, 2, 1, 1], "Bm (barre)": [null, 2, 4, 4, 3, 2], "Bb (barre)": [null, 1, 3, 3, 3, 1],
    "E5": [0, 2, 2, null, null, null], "A5": [null, 0, 2, 2, null, null], "G5": [3, 5, 5, null, null, null]
  };
  var $ = function (id) { return document.getElementById(id); };
  var nm = function (m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); };
  var S = { mode: "note", frets: null, label: "", expect: [], result: null, right: 0, tries: 0 };
  var ctx = null, master = null, listener = null, holdUntil = 0;

  function audio() {
    if (ctx) return ctx;
    var A = window.AudioContext || window.webkitAudioContext; ctx = new A();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    if (window.AudioTap) window.AudioTap.register(ctx, master, "Guitar input check");
    return ctx;
  }
  function pluck(m, t, g) {
    var o = ctx.createOscillator(), v = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); f.type = "lowpass"; f.frequency.value = 2200;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.005); v.gain.exponentialRampToValueAtTime(0.0008, t + 1.6);
    o.connect(f); f.connect(v); v.connect(master); o.start(t); o.stop(t + 1.7);
  }
  function play() {
    audio(); if (ctx.state === "suspended") ctx.resume();
    var t = ctx.currentTime + 0.05;
    S.expect.forEach(function (m, i) { pluck(m, t + i * 0.03, 0.25 / Math.sqrt(S.expect.length)); });
    holdUntil = performance.now() + 2100;
  }

  // a new target
  function pick() {
    S.result = null;
    if (S.mode === "note") {
      var maxF = +$("gi-frets").value, sv = $("gi-strs").value, s = sv === "all" ? Math.floor(Math.random() * 6) : 6 - (+sv), f, tries = 0;
      do { f = Math.floor(Math.random() * (maxF + 1)); tries++; } while (S.frets && S.frets[s] === f && tries < 10);
      S.frets = [null, null, null, null, null, null]; S.frets[s] = f;
      S.label = nm(OPEN[s] + f); S.sub = "string " + (6 - s) + ", " + (f ? "fret " + f : "open");
    } else {
      var sel = $("gi-chord").value, keys = Object.keys(CHORDS), name = sel;
      if (sel === "*") { do { name = keys[Math.floor(Math.random() * keys.length)]; } while (name === S.label && keys.length > 1); }
      S.frets = CHORDS[name].slice(); S.label = name;
      S.sub = S.frets.map(function (f) { return f == null ? "x" : f; }).join(" ") + "  (low E to high E)";
    }
    S.expect = S.frets.map(function (f, s) { return f == null ? null : OPEN[s] + f; }).filter(function (m) { return m != null; }).sort(function (a, b) { return a - b; });
    $("gi-ask").innerHTML = (S.mode === "note" ? "Play this note: <b>" : "Play this chord: <b>") + S.label + "</b><small>" + S.sub + "</small>";
    $("gi-say").textContent = listener && listener.running ? "Listening…" : "Turn listening on, then play it.";
    draw();
  }

  // the fretboard: string 1 (high E) on top, as in tab
  function draw() {
    var FR = 12, W = 760, H = 170, x0 = 46, x1 = W - 14, y0 = 22, gap = 24, fw = (x1 - x0) / FR, svg = [];
    var y = function (s) { return y0 + (5 - s) * gap; }, xm = function (f) { return f === 0 ? x0 - 20 : x0 + (f - 0.5) * fw; };
    svg.push('<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Fretboard showing ' + S.label + '">');
    svg.push('<rect class="gi-wood" x="' + x0 + '" y="' + (y0 - 8) + '" width="' + (x1 - x0) + '" height="' + (5 * gap + 16) + '"/>');
    [3, 5, 7, 9].forEach(function (f) { svg.push('<circle class="gi-inlay" cx="' + xm(f) + '" cy="' + (y0 + 2.5 * gap) + '" r="5"/>'); });
    svg.push('<circle class="gi-inlay" cx="' + xm(12) + '" cy="' + (y0 + 1.5 * gap) + '" r="5"/><circle class="gi-inlay" cx="' + xm(12) + '" cy="' + (y0 + 3.5 * gap) + '" r="5"/>');
    for (var f = 0; f <= FR; f++) svg.push('<line class="' + (f ? "gi-fret" : "gi-nut") + '" x1="' + (x0 + f * fw) + '" x2="' + (x0 + f * fw) + '" y1="' + (y0 - 8) + '" y2="' + (y0 + 5 * gap + 8) + '"/>');
    for (f = 1; f <= FR; f++) svg.push('<text class="gi-t" text-anchor="middle" x="' + xm(f) + '" y="' + (H - 4) + '">' + f + '</text>');
    for (var s = 0; s < 6; s++) {
      svg.push('<line class="gi-str" x1="' + x0 + '" x2="' + x1 + '" y1="' + y(s) + '" y2="' + y(s) + '" stroke-width="' + (2.6 - s * 0.35) + '"/>');
      svg.push('<text class="gi-t" x="2" y="' + (y(s) + 4) + '">' + (6 - s) + ' ' + NAMES[OPEN[s] % 12] + '</text>');
    }
    var ch = S.result && S.result.check, idx = 0;
    S.frets.forEach(function (fr, s) {
      if (fr == null) { if (S.mode === "chord") svg.push('<text class="gi-x" x="' + (x0 - 20) + '" y="' + y(s) + '">×</text>'); return; }
      var m = OPEN[s] + fr, k = S.expect.indexOf(m), cls = "";
      if (ch) cls = ch.found[k] ? "gi-hit" : "gi-miss";
      svg.push('<g class="' + cls + '"><circle class="' + (fr ? "gi-dot" : "gi-open") + '" cx="' + xm(fr) + '" cy="' + y(s) + '" r="10"/>' +
        '<text class="gi-dt" x="' + xm(fr) + '" y="' + y(s) + '">' + NAMES[m % 12] + '</text></g>'); idx++;
    });
    // a wrong single note, or a chord's extra notes: where they most likely were
    var extras = [];
    if (ch && S.mode === "note" && !ch.ok && ch.heard != null) extras.push(ch.heard);
    if (ch && S.mode === "chord") ch.extra.forEach(function (p) { var m = S.result.notes.filter(function (n) { return n % 12 === p; })[0]; if (m != null) extras.push(m); });
    extras.forEach(function (m) {
      var at = place(m); if (!at) return;
      svg.push('<circle class="gi-heard" cx="' + xm(at[1]) + '" cy="' + y(at[0]) + '" r="13"/>');
    });
    svg.push("</svg>");
    $("gi-board").innerHTML = svg.join("");
  }
  // the lowest fret where MIDI note m sits, preferring the string asked for
  function place(m) {
    var best = null;
    for (var s = 0; s < 6; s++) { var f = m - OPEN[s]; if (f < 0 || f > 12) continue; var sc = f + (S.frets[s] != null ? -20 : 0); if (!best || sc < best[2]) best = [s, f, sc]; }
    return best;
  }

  function onStrum(ev) {
    if (!ev.check) return;
    S.result = ev; S.tries++; if (ev.check.ok) S.right++;
    var say;
    if (S.mode === "note") {
      var heard = ev.check.heard;
      if (heard == null) say = '<span class="gi-bad">No clear note.</span> Pick it again and let it ring.';
      else if (ev.check.ok) say = '<span class="gi-good">Yes: ' + nm(heard) + '.</span> ' + (Math.abs(ev.cents) > 12 ? (ev.cents > 0 ? "+" : "") + Math.round(ev.cents) + " cents (" + (ev.cents > 0 ? "sharp" : "flat") + ")." : "In tune.");
      else if (heard % 12 === S.expect[0] % 12) say = '<span class="gi-bad">Heard ' + nm(heard) + ':</span> the right note, wrong octave. Check the string.';
      else say = '<span class="gi-bad">Heard ' + nm(heard) + '</span> (dashed ring), not ' + S.label + '.';
    } else {
      var heardNames = ev.pcs.map(function (p) { return NAMES[p]; }).join(" ");
      if (ev.check.ok) say = '<span class="gi-good">Yes: ' + S.label + '.</span> Heard ' + heardNames + '.';
      else {
        var why = [];
        var miss = S.expect.filter(function (m, i) { return !ev.check.found[i]; }).map(nm);
        if (miss.length) why.push("missing " + miss.join(", "));
        if (ev.check.extra.length) why.push("also heard " + ev.check.extra.map(function (p) { return NAMES[p]; }).join(", "));
        if (!ev.check.bassOk) why.push("bass heard as " + (ev.bass != null ? nm(ev.bass) : "nothing") + ", wanted " + nm(S.expect[0]));
        say = '<span class="gi-bad">Not quite:</span> ' + why.join("; ") + '. Heard ' + (heardNames || "nothing clear") + '.';
      }
    }
    $("gi-say").innerHTML = say;
    $("gi-score").textContent = S.right + " of " + S.tries + " right";
    draw();
  }

  function toggle() {
    var b = $("gi-listen");
    if (listener && listener.running) { listener.stop(); b.textContent = "Listening: off"; b.classList.remove("gi-on"); $("gi-say").textContent = "Stopped."; return; }
    audio();
    listener = GI.listen({ ctx: ctx, source: window.TEST_MIC_SOURCE, onStrum: onStrum,
      expect: function () { return S.expect; },
      hold: function () { return performance.now() < holdUntil; },
      onLevel: function (r) { $("gi-level").style.width = Math.min(100, Math.round(Math.sqrt(r) * 250)) + "%"; } });
    listener.start().then(function () { b.textContent = "Listening: on"; b.classList.add("gi-on"); $("gi-say").textContent = "Listening… play " + S.label + "."; },
      function (e) { $("gi-say").textContent = "Couldn't open the microphone: " + (e && e.message || e); });
  }
  function setMode(m) {
    S.mode = m; S.frets = null;
    [].forEach.call(document.querySelectorAll(".gi-mode"), function (b) { var on = b.dataset.mode === m; b.classList.toggle("gi-on", on); b.textContent = on ? "In use" : "Use this one"; });
    pick();
  }

  var sel = $("gi-chord"); sel.innerHTML = '<option value="*">Any (random)</option>' + Object.keys(CHORDS).map(function (k) { return "<option>" + k + "</option>"; }).join("");
  [].forEach.call(document.querySelectorAll(".gi-mode"), function (b) { b.addEventListener("click", function () { setMode(b.dataset.mode); }); });
  $("gi-frets").addEventListener("change", function () { if (S.mode === "note") pick(); });
  $("gi-strs").addEventListener("change", function () { if (S.mode === "note") pick(); });
  $("gi-chord").addEventListener("change", function () { if (S.mode !== "chord") setMode("chord"); else pick(); });
  $("gi-new").addEventListener("click", pick);
  $("gi-play").addEventListener("click", play);
  $("gi-listen").addEventListener("click", toggle);
  setMode("note");
  window.GIPage = { S: S, CHORDS: CHORDS, setMode: setMode, pick: pick, onStrum: onStrum };
})();
