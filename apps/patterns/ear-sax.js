// ear-sax.js — Sax Patterns by Ear (practice/sax-patterns-by-ear.qmd): the piano Patterns by Ear (ear-piano.js) for saxophone.
// Learn the first patterns of a tonal pattern set from fingering diagrams (sax-chart.js), then play the rest back by ear.
// Notes come in from the microphone (PitchDetect: the sax's concert pitch, turned back into written notes), a MIDI keyboard or
// wind controller, or the computer keys (those two count as written notes).
//
//   EarSax.placeSet(patterns, writtenTonic) -> octave shift (semitones) that keeps the whole set inside the comfortable range
//   EarSax.Segmenter(onNote)                 -> { frame({midi, hz, rms}), reset() }  mic frames -> one note each time the pitch
//                                               settles (3 frames, ~120 ms) on a new note or after a break
//   EarSax.mount(root)                       the page; EarSax.session is its state, EarSax.noteOn(writtenMidi) for tests.
// Needs EarPiano (parseSet, compare), SaxChart, SaxPage (sound, staff), AbcCore, MidiFeel, MusicalTyping, PitchDetect, patternObject.
(function (global) {
  "use strict";
  var LO = 62, HI = 84;   // written D4 .. C6: the range a beginner plays without low-pinky or palm keys (rule of thumb)

  function placeSet(patterns, shift) {
    var lo = 1e9, hi = -1e9;
    patterns.forEach(function (p) { p.midi.forEach(function (m) { lo = Math.min(lo, m + shift); hi = Math.max(hi, m + shift); }); });
    var best = 0, bestCost = 1e9;
    for (var o = -24; o <= 24; o += 12) {
      var l = lo + o, h = hi + o, c = Math.max(0, LO - l) + Math.max(0, h - HI);
      c = c * 10 + Math.abs((l + h) / 2 - 72) / 12;
      if (c < bestCost) { bestCost = c; best = o; }
    }
    return shift + best;
  }

  function Segmenter(onNote) {
    var cand = null, n = 0, last = null, quiet = 0;
    return {
      reset: function () { cand = null; n = 0; last = null; quiet = 0; },
      frame: function (f) {
        if (!(f.hz > 0)) { if (++quiet >= 2) last = null; cand = null; n = 0; return; }
        quiet = 0;
        if (f.midi === cand) n++; else { cand = f.midi; n = 1; }
        if (n === 3 && cand !== last) { last = cand; onNote(cand); }
      }
    };
  }

  function mount(root) {
    var $ = function (id) { return document.getElementById(id); };
    var EP = global.EarPiano, C = global.SaxChart;
    var S = global.EarSax.session = { phase: "setup", results: [] };
    var listening = false, got = [], lastAt = 0, timers = [], mic = null, quietUntil = 0;
    var seg = Segmenter(function (concert) { if (performance.now() < quietUntil) return; noteOn(concert - C.INSTRUMENTS[inst()], true); });

    function inst() { return $("es-inst").value; }
    function stopAll() { timers.forEach(clearTimeout); timers = []; listening = false; }
    function playNotes(list) {   // [{ written | chordConcert: [..], at, dur }] in beats -> Promise when done
      var beat = 60 / (+$("es-tempo").value || 72), end = 0, tr = C.INSTRUMENTS[inst()];
      list.forEach(function (n) { end = Math.max(end, n.at + n.dur); });
      quietUntil = performance.now() + (end * beat + 0.1) * 1000;   // the mic must not hear the page
      return SaxPage.sound().then(function (s) {
        var t0 = s.ac.currentTime + 0.08;
        list.forEach(function (n) {
          if (n.chord) n.chord.forEach(function (m) { C.tone(s.ac, s.out, m, t0 + n.at * beat, n.dur * beat * 0.95, 0.25); });
          else C.tone(s.ac, s.out, n.written + tr, t0 + n.at * beat, n.dur * beat * 0.92, 0.6);
        });
        return new Promise(function (r) { timers.push(setTimeout(r, (end * beat + 0.15) * 1000)); });
      });
    }
    // the set moved to the chosen written key and placed in the sax's range
    function shift() {
      var want = +$("es-key").value, d = ((want - S.set.tonicMidi) % 12 + 12) % 12; if (d > 6) d -= 12;
      return placeSet(S.set.patterns, d);
    }
    function pat(i) { var p = S.set.patterns[S.order[i]], sh = shift(); return { chord: p.chord, solfege: p.solfege, midi: p.midi.map(function (m) { return m + sh; }), n: S.order[i] + 1 }; }
    function keyContext() {   // I - V7 - I at concert pitch, low
      var t = S.set.tonicMidi + shift() + C.INSTRUMENTS[inst()], third = S.set.minor ? 3 : 4;
      while (t > 60) t -= 12; while (t < 48) t += 12;
      var I = [t, t + third, t + 7, t + 12], V7 = [t - 1, t + 2, t + 5, t + 7];
      return playNotes([{ chord: I, at: 0, dur: 1.4 }, { chord: V7, at: 1.5, dur: 1.4 }, { chord: I, at: 3, dur: 1.8 }]);
    }
    function playPat(p) { return playNotes(p.midi.map(function (m, i) { return { written: m, at: i, dur: 1 }; })); }
    function nm(m) { return C.both(m); }

    function showFingerings(box, midi) {
      box.innerHTML = "";
      midi.forEach(function (m, i) {
        var fig = document.createElement("figure"); fig.className = "sxp-fig es-fig";
        var st = document.createElement("div"); st.className = "sxp-staff es-staff";
        var d = document.createElement("div"); d.className = "sxp-d es-d";
        fig.appendChild(st); fig.appendChild(d);
        var cap = document.createElement("figcaption"); cap.innerHTML = "<b>" + (i + 1) + "</b> · " + nm(m); fig.appendChild(cap);
        box.appendChild(fig);
        var f = C.FINGERINGS[m]; if (f) C.diagram(d, { small: true, label: nm(m) }).set(f[0]); else d.textContent = "out of range";
        SaxPage.staff(st, [SaxPage.abcNote(m, S.flats ? "flat" : "sharp")], 60);
      });
    }

    // ---------- input ----------
    function noteOn(m, fromMic) {
      if (!fromMic && $("es-echo").checked) SaxPage.sound().then(function (s) { C.tone(s.ac, s.out, m + C.INSTRUMENTS[inst()], s.ac.currentTime, 0.5, 0.5); });
      $("es-heard").textContent = "Heard: " + nm(m) + (fromMic ? " (written)" : "");
      if (!listening || !S.cur) return;
      var now = performance.now();
      if (got.length && now - lastAt > 4000) got = [];
      lastAt = now; got.push(m);
      var r = EP.compare(S.cur.midi, got, $("es-anyoct").checked);
      if (r.ok === null) return;
      listening = false; var heard = got.slice(); got = [];
      (S.phase === "learn" ? learnResult : earResult)(r.ok, heard, r.wrongAt);
    }
    function listenAfter(pr) { listening = false; got = []; pr.then(function () { seg.reset(); listening = true; if (S.phase !== "done") say(S.phase === "learn" ? "es-learn-msg" : "es-ear-msg", "Your turn.", ""); }); }

    // ---------- Learn ----------
    function startLearn() { stopAll(); S.phase = "learn"; S.i = 0; showLearn(); openSection("learn"); keyContext().then(function () { listenAfter(playPat(S.cur)); }); }
    function showLearn() {
      var p = S.cur = pat(S.i); S.right = 0;
      $("es-learn-head").textContent = "Pattern " + (S.i + 1) + " of " + S.teach;
      $("es-learn-solf").textContent = $("es-solf-learn").checked ? (p.solfege || "") : "";
      $("es-learn-chord").textContent = "";
      showFingerings($("es-learn-fing"), p.midi);
      say("es-learn-msg", "Listen, then play it back.", ""); dots();
    }
    function learnResult(ok, heard, at) {
      var need = +$("es-need").value || 2;
      if (ok) {
        S.right++;
        if (S.right >= need) {
          say("es-learn-msg", "✓ Got it.", "good");
          timers.push(setTimeout(function () {
            if (S.i + 1 < S.teach) { S.i++; showLearn(); listenAfter(playPat(S.cur)); }
            else { say("es-learn-msg", "✓ All " + S.teach + " learned. Now the rest, by ear.", "good"); $("es-to-ear").hidden = false; }
          }, 900));
        } else { say("es-learn-msg", "✓ Right. Once more (" + S.right + " of " + need + ").", "good"); timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 700)); }
      } else {
        S.right = 0;
        say("es-learn-msg", "Not quite: note " + (at + 1) + " is " + nm(S.cur.midi[at]) + ", you played " + nm(heard[at]) + ". Listen again.", "bad");
        timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 1100));
      }
    }

    // ---------- By ear ----------
    function startEar(only) {
      stopAll(); S.phase = "ear"; $("es-to-ear").hidden = true;
      var rest = only || S.order.slice(S.teach).map(function (_, k) { return S.teach + k; });
      if ($("es-shuffle").checked) rest = rest.map(function (v) { return [Math.random(), v]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
      S.earList = rest; S.j = 0; S.results = only ? S.results : [];
      openSection("by-ear");
      if (!rest.length) { say("es-ear-msg", "Nothing left: teach fewer patterns or pick a bigger set.", "bad"); return; }
      keyContext().then(nextEar);
    }
    function nextEar() {
      if (S.j >= S.earList.length) return finish();
      S.i = S.earList[S.j]; S.cur = pat(S.i); S.tries = 0; S.replays = 0; S.shown = false;
      $("es-ear-head").textContent = "Pattern " + (S.j + 1) + " of " + S.earList.length;
      $("es-ear-solf").textContent = $("es-solf-ear").checked ? (S.cur.solfege || "") : "";
      $("es-ear-fing").innerHTML = ""; $("es-ear-next").hidden = true;
      say("es-ear-msg", "Listen…", ""); listenAfter(playPat(S.cur)); dots();
    }
    function record(result) {
      S.results = S.results.filter(function (r) { return r.i !== S.i; });
      S.results.push({ i: S.i, n: S.cur.n, chord: S.cur.chord, solfege: S.cur.solfege, notes: S.cur.midi.map(nm).join(" "), result: result, tries: S.tries, replays: S.replays });
      dots();
    }
    function earResult(ok, heard, at) {
      if (S.shown) {
        if (ok) { say("es-ear-msg", "✓ That's it. On to the next.", "good"); S.j++; timers.push(setTimeout(nextEar, 900)); }
        else { say("es-ear-msg", "Follow the fingerings. Listen again.", "bad"); timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 900)); }
        return;
      }
      S.tries++;
      if (ok) { record(S.tries === 1 ? "first" : "later"); say("es-ear-msg", S.tries === 1 ? "✓ First try!" : "✓ Got it on try " + S.tries + ".", "good"); S.j++; timers.push(setTimeout(nextEar, 1000)); return; }
      var max = +$("es-tries").value || 3;
      if (S.tries >= max) { record("shown"); show("Here's how it goes. Play it once from the fingerings, then on to the next."); return; }
      say("es-ear-msg", "Not quite (note " + (at + 1) + "). Try " + (S.tries + 1) + " of " + max + ": listen again.", "bad");
      timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 1000));
    }
    function show(msg) { S.shown = true; showFingerings($("es-ear-fing"), S.cur.midi); say("es-ear-msg", msg, "bad"); $("es-ear-next").hidden = false; listenAfter(playPat(S.cur)); }
    function finish() {
      stopAll(); S.phase = "done"; S.cur = null;
      var r = S.results.slice().sort(function (a, b) { return a.i - b.i; });
      var first = r.filter(function (x) { return x.result === "first"; }).length, later = r.filter(function (x) { return x.result === "later"; }).length;
      var LABEL = { first: "✓ first try", later: "✓ after tries", shown: "✗ shown", skipped: "– skipped" };
      $("es-res-sum").innerHTML = r.length ? "<strong>" + first + " of " + r.length + "</strong> on the first try, " + later + " more after another try." : "No results yet.";
      $("es-res-table").innerHTML = r.length ? '<table class="table table-sm ep-table"><thead><tr><th>#</th><th>Written notes</th><th>Solfège</th><th>Result</th><th>Tries</th><th>Heard again</th></tr></thead><tbody>' +
        r.map(function (x) { return '<tr class="ep-r-' + x.result + '"><td>' + x.n + "</td><td>" + x.notes + "</td><td>" + (x.solfege || "") + "</td><td>" + LABEL[x.result] + "</td><td>" + x.tries + "</td><td>" + x.replays + "</td></tr>"; }).join("") + "</tbody></table>" : "";
      $("es-again").hidden = !r.some(function (x) { return x.result !== "first"; });
      say("es-ear-msg", "Done. See the results below.", "good"); openSection("results");
    }

    // ---------- page bits ----------
    function say(id, txt, cls) { var e = $(id); e.textContent = txt; e.className = "ep-msg" + (cls ? " ep-" + cls : ""); }
    function dots() {
      var h = "";
      for (var k = 0; k < S.teach; k++) h += '<span class="ep-dot ep-dot-learn' + (S.phase === "learn" && k === S.i ? " ep-dot-cur" : S.phase !== "learn" || k < S.i ? " ep-dot-done" : "") + '"></span>';
      (S.earList || S.order.slice(S.teach)).forEach(function (v, k) {
        var r = S.results.filter(function (x) { return x.i === v; })[0];
        h += '<span class="ep-dot' + (r ? " ep-dot-" + r.result : "") + (S.phase === "ear" && k === S.j ? " ep-dot-cur" : "") + '"></span>';
      });
      $("es-dots").innerHTML = h; $("es-dots2").innerHTML = h;
    }
    function openSection(id) { var sec = document.getElementById(id); if (!sec) return; if (sec._sfSet && sec.classList.contains("sf-shut")) sec._sfSet(false, true); if (sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" }); }
    function loadSet() {
      stopAll(); S.phase = "setup"; S.earList = null;
      S.set = EP.parseSet(patternObject[$("es-set").value]);
      S.order = S.set.patterns.map(function (_, i) { return i; });
      S.teach = Math.max(1, Math.min(S.set.patterns.length - 1, +$("es-teach").value || 3));
      info();
      dots();
    }
    function info() {
      var k = +$("es-key").value; S.flats = [5, 10, 3, 8, 1, 6].indexOf((k + (S.set.minor ? 3 : 0)) % 12) >= 0;
      var p0 = pat(0), lo = 1e9, hi = -1e9, sh = shift();
      S.set.patterns.forEach(function (p) { p.midi.forEach(function (m) { lo = Math.min(lo, m + sh); hi = Math.max(hi, m + sh); }); });
      $("es-set-info").textContent = S.set.patterns.length + " patterns, written range " + nm(lo) + " to " + nm(hi) +
        " (sounds in concert " + C.name(k + C.INSTRUMENTS[inst()] + 120).replace(/-?\d+$/, "") + "). The first " + S.teach + " are taught; the other " +
        (S.set.patterns.length - S.teach) + " are by ear." + (p0 ? "" : "");
    }

    var sel = $("es-set"); if (global.TonalPatternGen) TonalPatternGen.loadSaved(patternObject);
    Object.keys(patternObject).forEach(function (k) { var o = document.createElement("option"); o.value = o.textContent = k; sel.appendChild(o); });
    if (patternObject["322a"]) sel.value = "322a";
    ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"].forEach(function (n, i) { var o = document.createElement("option"); o.value = i; o.textContent = n; $("es-key").appendChild(o); });
    $("es-key").value = "7";   // written G (concert B♭ on alto)
    sel.onchange = loadSet; $("es-teach").onchange = loadSet;
    $("es-key").onchange = info; $("es-inst").onchange = info;
    $("es-start").onclick = startLearn;
    $("es-skip-learn").onclick = function () { startEar(); };
    $("es-to-ear").onclick = function () { startEar(); };
    $("es-learn-hear").onclick = function () { if (S.phase === "learn") listenAfter(playPat(S.cur)); };
    $("es-ear-hear").onclick = function () { if (S.phase === "ear") { S.replays++; listenAfter(playPat(S.cur)); } };
    $("es-ear-key").onclick = function () { if (S.cur) keyContext().then(function () { listenAfter(playPat(S.cur)); }); };
    $("es-ear-show").onclick = function () { if (S.phase === "ear" && !S.shown) { record("shown"); show("Here it is. Play it once from the fingerings."); } };
    $("es-ear-next").onclick = function () { stopAll(); S.j++; nextEar(); };
    $("es-ear-skip").onclick = function () { if (S.phase !== "ear") return; stopAll(); if (!S.shown) record("skipped"); S.j++; nextEar(); };
    $("es-again").onclick = function () { startEar(S.results.filter(function (x) { return x.result !== "first"; }).map(function (x) { return x.i; })); };
    $("es-restart").onclick = startLearn;

    // inputs
    function status(txt, on) { $("es-in-status").textContent = txt; $("es-in-dot").classList.toggle("on", !!on); }
    $("es-mic").onclick = function () {
      if (mic && mic.running) { mic.stop(); $("es-mic").textContent = "🎤 Listen to my sax"; status("Microphone off.", false); return; }
      mic = PitchDetect.mic({ onFrame: function (f) { seg.frame(f); }, onError: function (e) { status(e.message || "Microphone not allowed.", false); } });
      mic.start().then(function () { $("es-mic").textContent = "■ Stop listening"; status("Listening to the microphone.", true); }, function (e) { status((e && e.message) || "Microphone not allowed.", false); });
    };
    MidiFeel.subscribe(function (e) { if (e.type === "on") { status("MIDI notes coming in", true); noteOn(e.midi, false); } });
    $("es-midi").onclick = function () {
      MidiFeel.connect().then(function (a) { var n = []; a.inputs.forEach(function (i) { n.push(i.name); }); status(n.length ? "MIDI: " + n.join(", ") : "MIDI is on, but nothing is plugged in.", n.length); },
        function (e) { status(e.message || "MIDI was not allowed.", false); });
    };
    if (global.MusicalTyping) MusicalTyping.attach({ octave: 4, onOn: function (m) { noteOn(m, false); }, onOff: function () {}, enabled: function () { return $("es-typing").checked; } });
    global.EarSax.seg = seg;   // tests feed mic frames here

    loadSet();
    global.EarSax.noteOn = noteOn;
  }

  var api = { placeSet: placeSet, Segmenter: Segmenter, mount: mount, LO: LO, HI: HI };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.EarSax = api;
})(typeof window !== "undefined" ? window : globalThis);
