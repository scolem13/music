// ear-horn.js — Horn Patterns by Ear (practice/horn-patterns-by-ear.qmd): the piano Patterns by Ear (ear-piano.js) for French horn.
// Learn the first patterns of a tonal pattern set from lever diagrams (horn-chart.js), then play the rest back by ear.
// Notes come in from the microphone (PitchDetect: the horn's concert pitch, a perfect fifth below the written note, turned back into
// written notes), a MIDI keyboard or wind controller, or the computer keys (those two count as written notes).
//
//   EarHorn.placeSet(patterns, writtenTonic) -> octave shift (semitones) that keeps the whole set inside the easy range
//   EarHorn.Segmenter(onNote)                -> { frame({midi, hz, rms}), reset() }  mic frames -> one note each time the pitch
//                                               settles (3 frames, ~120 ms) on a new note or after a break
//   EarHorn.mount(root)                      the page; EarHorn.session is its state, EarHorn.noteOn(writtenMidi) for tests.
// Needs EarPiano (parseSet, compare), HornChart, HornPage (sound, note, abcNote), AbcCore, MidiFeel, MusicalTyping, PitchDetect, patternObject.
// Unverified: the "easy range" (written C4 to G5, about where a first-year player sits) is a rule of thumb, not from the book; the book's chart
// is F3-C6. Fingering shown: the book's usual one (F side below written G♯4/A♭4, B♭ side from there up on a double horn).
(function (global) {
  "use strict";
  var LO = 60, HI = 79;   // written C4 .. G5: a first-year player's comfortable range (rule of thumb, unverified)

  function placeSet(patterns, shift) {
    var lo = 1e9, hi = -1e9;
    patterns.forEach(function (p) { p.midi.forEach(function (m) { lo = Math.min(lo, m + shift); hi = Math.max(hi, m + shift); }); });
    var best = 0, bestCost = 1e9;
    for (var o = -24; o <= 24; o += 12) {
      var l = lo + o, h = hi + o, c = Math.max(0, LO - l) + Math.max(0, h - HI);
      c = c * 10 + Math.abs((l + h) / 2 - 67) / 12;
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
    var EP = global.EarPiano, C = global.HornChart;
    var S = global.EarHorn.session = { phase: "setup", results: [] };
    var listening = false, got = [], lastAt = 0, timers = [], mic = null, quietUntil = 0;
    var seg = Segmenter(function (concert) { if (performance.now() < quietUntil) return; noteOn(concert + 7, true); });

    function htype() { return $("eh-type").value; }
    function stopAll() { timers.forEach(clearTimeout); timers = []; listening = false; }
    function playNotes(list) {   // [{ written | chordConcert: [..], at, dur }] in beats -> Promise when done
      var beat = 60 / (+$("eh-tempo").value || 72), end = 0, tr = -7;
      list.forEach(function (n) { end = Math.max(end, n.at + n.dur); });
      quietUntil = performance.now() + (end * beat + 0.1) * 1000;   // the mic must not hear the page
      return HornPage.sound().then(function (s) {
        var t0 = s.ac.currentTime + 0.08;
        list.forEach(function (n) {
          if (n.chord) n.chord.forEach(function (m) { HornPage.note(s, m, t0 + n.at * beat, n.dur * beat * 0.95, 0.35); });
          else HornPage.note(s, n.written + tr, t0 + n.at * beat, n.dur * beat * 0.92, 0.7);
        });
        return new Promise(function (r) { timers.push(setTimeout(r, (end * beat + 0.15) * 1000)); });
      });
    }
    // the set moved to the chosen written key and placed in the horn's easy range
    function shift() {
      var want = +$("eh-key").value, d = ((want - S.set.tonicMidi) % 12 + 12) % 12; if (d > 6) d -= 12;
      return placeSet(S.set.patterns, d);
    }
    function pat(i) { var p = S.set.patterns[S.order[i]], sh = shift(); return { chord: p.chord, solfege: p.solfege, midi: p.midi.map(function (m) { return m + sh; }), n: S.order[i] + 1 }; }
    function keyContext() {   // I - V7 - I at concert pitch, low
      var t = S.set.tonicMidi + shift() - 7, third = S.set.minor ? 3 : 4;
      while (t > 60) t -= 12; while (t < 48) t += 12;
      var I = [t, t + third, t + 7, t + 12], V7 = [t - 1, t + 2, t + 5, t + 7];
      return playNotes([{ chord: I, at: 0, dur: 1.4 }, { chord: V7, at: 1.5, dur: 1.4 }, { chord: I, at: 3, dur: 1.8 }]);
    }
    function playPat(p) { return playNotes(p.midi.map(function (m, i) { return { written: m, at: i, dur: 1 }; })); }
    function nm(m) { return C.name(m); }

    function showFingerings(box, midi) {
      box.innerHTML = "";
      midi.forEach(function (m, i) {
        var fig = document.createElement("figure"); fig.className = "hnp-fig eh-fig";
        var st = document.createElement("div"); st.className = "hnp-staff eh-staff";
        var d = document.createElement("div"); d.className = "hnp-d eh-d";
        fig.appendChild(st); fig.appendChild(d);
        var fs = C.fingerings(m, htype()), f = fs.filter(function (x) { return !x.alt; });
        f = (f.length > 1 ? f.filter(function (x) { return (x.side === "Bb") === (m >= C.SWITCH); }) : f)[0];
        var cap = document.createElement("figcaption"); cap.innerHTML = "<b>" + (i + 1) + "</b> · " + nm(m) + (f && htype() === "double" ? (f.side === "Bb" ? " · thumb" : "") : ""); fig.appendChild(cap);
        box.appendChild(fig);
        if (f) C.diagram(d, { small: true, thumb: htype() === "double", label: nm(m) }).set(f.valves, f.side === "Bb" && htype() === "double"); else d.textContent = "out of range";
        if (global.ABCJS) ABCJS.renderAbc(st, "X:1\nL:1/1\nK:C clef=treble\n" + HornPage.abcNote(m, S.flats ? "flat" : "sharp") + "|]", { staffwidth: 60, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, scale: 0.9 });
      });
    }

    // ---------- input ----------
    function noteOn(m, fromMic) {
      if (!fromMic && $("eh-echo").checked) HornPage.sound().then(function (s) { HornPage.note(s, m - 7, s.ac.currentTime, 0.5, 0.6); });
      $("eh-heard").textContent = "Heard: " + nm(m) + (fromMic ? " (written)" : "");
      if (!listening || !S.cur) return;
      var now = performance.now();
      if (got.length && now - lastAt > 4000) got = [];
      lastAt = now; got.push(m);
      var r = EP.compare(S.cur.midi, got, $("eh-anyoct").checked);
      if (r.ok === null) return;
      listening = false; var heard = got.slice(); got = [];
      (S.phase === "learn" ? learnResult : earResult)(r.ok, heard, r.wrongAt);
    }
    function listenAfter(pr) { listening = false; got = []; pr.then(function () { seg.reset(); listening = true; if (S.phase !== "done") say(S.phase === "learn" ? "eh-learn-msg" : "eh-ear-msg", "Your turn.", ""); }); }

    // ---------- Learn ----------
    function startLearn() { stopAll(); S.phase = "learn"; S.i = 0; showLearn(); openSection("learn"); keyContext().then(function () { listenAfter(playPat(S.cur)); }); }
    function showLearn() {
      var p = S.cur = pat(S.i); S.right = 0;
      $("eh-learn-head").textContent = "Pattern " + (S.i + 1) + " of " + S.teach;
      $("eh-learn-solf").textContent = $("eh-solf-learn").checked ? (p.solfege || "") : "";
      $("eh-learn-chord").textContent = "";
      showFingerings($("eh-learn-fing"), p.midi);
      say("eh-learn-msg", "Listen, then play it back.", ""); dots();
    }
    function learnResult(ok, heard, at) {
      var need = +$("eh-need").value || 2;
      if (ok) {
        S.right++;
        if (S.right >= need) {
          say("eh-learn-msg", "✓ Got it.", "good");
          timers.push(setTimeout(function () {
            if (S.i + 1 < S.teach) { S.i++; showLearn(); listenAfter(playPat(S.cur)); }
            else { say("eh-learn-msg", "✓ All " + S.teach + " learned. Now the rest, by ear.", "good"); $("eh-to-ear").hidden = false; }
          }, 900));
        } else { say("eh-learn-msg", "✓ Right. Once more (" + S.right + " of " + need + ").", "good"); timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 700)); }
      } else {
        S.right = 0;
        say("eh-learn-msg", "Not quite: note " + (at + 1) + " is " + nm(S.cur.midi[at]) + ", you played " + nm(heard[at]) + ". Listen again.", "bad");
        timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 1100));
      }
    }


    // ---------- the student's report (SiteRecord, record.js loaded on first use): one item a pattern, tool "ear-horn"; each try is
    // an attempt [notes played, 1 right / 0 wrong, seconds since the pattern was played]; rv = 1 when the pattern had to be shown
    var SR_SRC = "/apps/shared/report/record.js?v=8", srWait = [];
    function withRecord(f) {
      if (global.SiteRecord) return f(global.SiteRecord);
      srWait.push(f); if (srWait.length > 1) return;
      var sc = document.createElement("script"); sc.src = SR_SRC; sc.onload = function () { var w = srWait; srWait = []; w.forEach(function (g) { if (global.SiteRecord) g(global.SiteRecord); }); }; document.head.appendChild(sc);
    }
    function srTry(ok, heard, shown) {
      withRecord(function (SR) {
        if (!S.item) { var sv = $("eh-set"); S.item = SR.add("ear-horn", { ex: "Horn Patterns by Ear", q: { text: (sv ? sv.value + ", pattern " : "Pattern ") + (S.j + 1) + " of " + S.earList.length + ": play what you heard" }, want: S.cur.midi.map(nm).join(" ") }); }
        if (heard) S.item.at.push([heard.map(nm).join(" ") || "(nothing)", ok ? 1 : 0, Math.round((Date.now() - S.t0) / 1000)]);
        if (shown) S.item.rv = 1;
        SR.save();
      });
    }
    // ---------- By ear ----------
    function startEar(only) {
      stopAll(); S.phase = "ear"; $("eh-to-ear").hidden = true;
      var rest = only || S.order.slice(S.teach).map(function (_, k) { return S.teach + k; });
      if ($("eh-shuffle").checked) rest = rest.map(function (v) { return [Math.random(), v]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
      S.earList = rest; S.j = 0; S.results = only ? S.results : [];
      openSection("by-ear");
      if (!rest.length) { say("eh-ear-msg", "Nothing left: teach fewer patterns or pick a bigger set.", "bad"); return; }
      keyContext().then(nextEar);
    }
    function nextEar() {
      if (S.j >= S.earList.length) return finish();
      S.i = S.earList[S.j]; S.cur = pat(S.i); S.tries = 0; S.replays = 0; S.shown = false; S.item = null; S.t0 = Date.now();
      $("eh-ear-head").textContent = "Pattern " + (S.j + 1) + " of " + S.earList.length;
      $("eh-ear-solf").textContent = $("eh-solf-ear").checked ? (S.cur.solfege || "") : "";
      $("eh-ear-fing").innerHTML = ""; $("eh-ear-next").hidden = true;
      say("eh-ear-msg", "Listen…", ""); listenAfter(playPat(S.cur)); dots();
    }
    function record(result) {
      S.results = S.results.filter(function (r) { return r.i !== S.i; });
      S.results.push({ i: S.i, n: S.cur.n, chord: S.cur.chord, solfege: S.cur.solfege, notes: S.cur.midi.map(nm).join(" "), result: result, tries: S.tries, replays: S.replays });
      dots();
    }
    function earResult(ok, heard, at) {
      if (S.shown) {
        if (ok) { say("eh-ear-msg", "✓ That's it. On to the next.", "good"); S.j++; timers.push(setTimeout(nextEar, 900)); }
        else { say("eh-ear-msg", "Follow the fingerings. Listen again.", "bad"); timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 900)); }
        return;
      }
      S.tries++;
      srTry(ok, heard, false);
      if (ok) { record(S.tries === 1 ? "first" : "later"); say("eh-ear-msg", S.tries === 1 ? "✓ First try!" : "✓ Got it on try " + S.tries + ".", "good"); S.j++; timers.push(setTimeout(nextEar, 1000)); return; }
      var max = +$("eh-tries").value || 3;
      if (S.tries >= max) { srTry(false, null, true); record("shown"); show("Here's how it goes. Play it once from the fingerings, then on to the next."); return; }
      say("eh-ear-msg", "Not quite (note " + (at + 1) + "). Try " + (S.tries + 1) + " of " + max + ": listen again.", "bad");
      timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 1000));
    }
    function show(msg) { S.shown = true; showFingerings($("eh-ear-fing"), S.cur.midi); say("eh-ear-msg", msg, "bad"); $("eh-ear-next").hidden = false; listenAfter(playPat(S.cur)); }
    function finish() {
      stopAll(); S.phase = "done"; S.cur = null;
      var r = S.results.slice().sort(function (a, b) { return a.i - b.i; });
      var first = r.filter(function (x) { return x.result === "first"; }).length, later = r.filter(function (x) { return x.result === "later"; }).length;
      var LABEL = { first: "✓ first try", later: "✓ after tries", shown: "✗ shown", skipped: "– skipped" };
      $("eh-res-sum").innerHTML = r.length ? "<strong>" + first + " of " + r.length + "</strong> on the first try, " + later + " more after another try." : "No results yet.";
      $("eh-res-table").innerHTML = r.length ? '<table class="table table-sm ep-table"><thead><tr><th>#</th><th>Written notes</th><th>Solfège</th><th>Result</th><th>Tries</th><th>Heard again</th></tr></thead><tbody>' +
        r.map(function (x) { return '<tr class="ep-r-' + x.result + '"><td>' + x.n + "</td><td>" + x.notes + "</td><td>" + (x.solfege || "") + "</td><td>" + LABEL[x.result] + "</td><td>" + x.tries + "</td><td>" + x.replays + "</td></tr>"; }).join("") + "</tbody></table>" : "";
      $("eh-again").hidden = !r.some(function (x) { return x.result !== "first"; });
      say("eh-ear-msg", "Done. See the results below.", "good"); openSection("results");
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
      $("eh-dots").innerHTML = h; $("eh-dots2").innerHTML = h;
    }
    function openSection(id) { var sec = document.getElementById(id); if (!sec) return; if (sec._sfSet && sec.classList.contains("sf-shut")) sec._sfSet(false, true); if (sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" }); }
    function loadSet() {
      stopAll(); S.phase = "setup"; S.earList = null;
      S.set = EP.parseSet(patternObject[$("eh-set").value]);
      S.order = S.set.patterns.map(function (_, i) { return i; });
      S.teach = Math.max(1, Math.min(S.set.patterns.length - 1, +$("eh-teach").value || 3));
      info();
      dots();
    }
    function info() {
      var k = +$("eh-key").value; S.flats = [5, 10, 3, 8, 1, 6].indexOf((k + (S.set.minor ? 3 : 0)) % 12) >= 0;
      var p0 = pat(0), lo = 1e9, hi = -1e9, sh = shift();
      S.set.patterns.forEach(function (p) { p.midi.forEach(function (m) { lo = Math.min(lo, m + sh); hi = Math.max(hi, m + sh); }); });
      $("eh-set-info").textContent = S.set.patterns.length + " patterns, written range " + nm(lo) + " to " + nm(hi) +
        " (sounds in concert " + C.name(k - 7 + 120).replace(/-?\d+$/, "") + "). The first " + S.teach + " are taught; the other " +
        (S.set.patterns.length - S.teach) + " are by ear." + (p0 ? "" : "");
    }

    var sel = $("eh-set"); if (global.TonalPatternGen) TonalPatternGen.loadSaved(patternObject);
    Object.keys(patternObject).forEach(function (k) { var o = document.createElement("option"); o.value = o.textContent = k; sel.appendChild(o); });
    if (patternObject["322a"]) sel.value = "322a";
    ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"].forEach(function (n, i) { var o = document.createElement("option"); o.value = i; o.textContent = n; $("eh-key").appendChild(o); });
    $("eh-key").value = "0";   // written C (concert F)
    sel.onchange = loadSet; $("eh-teach").onchange = loadSet;
    $("eh-key").onchange = function () { info(); }; $("eh-type").onchange = function () { info(); };
    $("eh-start").onclick = startLearn;
    $("eh-skip-learn").onclick = function () { startEar(); };
    $("eh-to-ear").onclick = function () { startEar(); };
    $("eh-learn-hear").onclick = function () { if (S.phase === "learn") listenAfter(playPat(S.cur)); };
    $("eh-ear-hear").onclick = function () { if (S.phase === "ear") { S.replays++; listenAfter(playPat(S.cur)); } };
    $("eh-ear-key").onclick = function () { if (S.cur) keyContext().then(function () { listenAfter(playPat(S.cur)); }); };
    $("eh-ear-show").onclick = function () { if (S.phase === "ear" && !S.shown) { record("shown"); show("Here it is. Play it once from the fingerings."); } };
    $("eh-ear-next").onclick = function () { stopAll(); S.j++; nextEar(); };
    withRecord(function (SR) { var nb = $("eh-ear-next"); if (nb && nb.parentNode && !nb.parentNode.querySelector(".sr-mybtn")) nb.parentNode.appendChild(SR.button(nb.parentNode)); });
    $("eh-ear-skip").onclick = function () { if (S.phase !== "ear") return; stopAll(); if (!S.shown) record("skipped"); S.j++; nextEar(); };
    $("eh-again").onclick = function () { startEar(S.results.filter(function (x) { return x.result !== "first"; }).map(function (x) { return x.i; })); };
    $("eh-restart").onclick = startLearn;

    // inputs
    function status(txt, on) { $("eh-in-status").textContent = txt; $("eh-in-dot").classList.toggle("on", !!on); }
    $("eh-mic").onclick = function () {
      if (mic && mic.running) { mic.stop(); $("eh-mic").textContent = "🎤 Listen to my horn"; status("Microphone off.", false); return; }
      mic = PitchDetect.mic({ onFrame: function (f) { seg.frame(f); }, onError: function (e) { status(e.message || "Microphone not allowed.", false); } });
      mic.start().then(function () { $("eh-mic").textContent = "■ Stop listening"; status("Listening to the microphone.", true); }, function (e) { status((e && e.message) || "Microphone not allowed.", false); });
    };
    MidiFeel.subscribe(function (e) { if (e.type === "on") { status("MIDI notes coming in", true); noteOn(e.midi, false); } });
    $("eh-midi").onclick = function () {
      MidiFeel.connect().then(function (a) { var n = []; a.inputs.forEach(function (i) { n.push(i.name); }); status(n.length ? "MIDI: " + n.join(", ") : "MIDI is on, but nothing is plugged in.", n.length); },
        function (e) { status(e.message || "MIDI was not allowed.", false); });
    };
    if (global.MusicalTyping) MusicalTyping.attach({ octave: 4, onOn: function (m) { noteOn(m, false); }, onOff: function () {}, enabled: function () { return $("eh-typing").checked; } });
    global.EarHorn.seg = seg;   // tests feed mic frames here

    loadSet();
    global.EarHorn.noteOn = noteOn;
  }

  var api = { placeSet: placeSet, Segmenter: Segmenter, mount: mount, LO: LO, HI: HI };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.EarHorn = api;
})(typeof window !== "undefined" ? window : globalThis);
