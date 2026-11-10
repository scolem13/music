// ear-bass.js — Bass Patterns by Ear (practice/bass-patterns-by-ear.qmd): the piano Patterns by Ear (ear-piano.js) for electric bass.
// Learn the first patterns of a tonal pattern set from the fretboard (ebass-chart.js), then play the rest back by ear.
// Notes come in from the microphone (a low-note detector, see BlockDetector: PitchDetect's mic helper stops at 70 Hz and the
// bass goes down to 41 Hz), a MIDI bass or keyboard, or the computer keys. Everything on the page is WRITTEN pitch (an octave above
// what the bass sounds), so the set is placed in written E2..C4 = open E to fret 5 on the G string.
//
//   EarBass.placeSet(patterns, shift)  -> octave-adjusted shift that keeps the whole set inside the easy range
//   EarBass.choosePositions(midiList, maxFret) -> [{ s, f }] one fretboard place per SOUNDING note, near the previous one
//   EarBass.Segmenter(onNote)           mic frames -> one note each time the pitch settles (3 frames) on a new note or after a break
//   EarBass.BlockDetector(sr, onFrame)  { push(Float32Array block) }: a 4096-sample window, a frame every ~40 ms, YIN down to 35 Hz
//   EarBass.mount(root)                 the page; EarBass.session is its state, EarBass.noteOn(writtenMidi) for tests.
// Unverified: how well the microphone follows the lowest notes (E1 41 Hz, A1 55 Hz) on a real bass; tests use synthetic sines.
// Needs EarPiano (parseSet, compare), EBassChart, EBassPage (play, staff), AbcCore, MidiFeel, MusicalTyping, PitchDetect, patternObject.
(function (global) {
  "use strict";
  var LO = 40, HI = 60;   // written E2 .. C4 = sounding E1 .. C3: open E to fret 5 on the G string (frets 0-5, a first-position hand)
  var MAXF = 5;

  function placeSet(patterns, shift) {
    var lo = 1e9, hi = -1e9;
    patterns.forEach(function (p) { p.midi.forEach(function (m) { lo = Math.min(lo, m + shift); hi = Math.max(hi, m + shift); }); });
    var best = 0, bestCost = 1e9;
    for (var o = -24; o <= 24; o += 12) {
      var l = lo + o, h = hi + o, c = Math.max(0, LO - l) + Math.max(0, h - HI);
      c = c * 10 + Math.abs((l + h) / 2 - 50) / 12;
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

  // one fretboard place per sounding note, in frets 0..maxFret, near the previous note (smallest hand move; ties to the lower string)
  function choosePositions(list, maxFret) {
    var C = global.EBassChart, out = [], prev = null;
    list.forEach(function (m) {
      var ps = C.positions(m, maxFret == null ? MAXF : maxFret); if (!ps.length) ps = C.positions(m, C.FRETS);
      if (!ps.length) { out.push(null); return; }
      var best = null, bc = 1e9;
      ps.forEach(function (p) { var c = prev ? Math.abs(p.f - prev.f) * 10 + Math.abs(p.s - prev.s) : p.f * 10 + (4 - p.s); if (c < bc) { bc = c; best = p; } });
      out.push(best); prev = best;
    });
    return out;
  }

  // microphone blocks -> frames of { hz, midi, rms } (concert = sounding pitch). PitchDetect.mic's own frames reject anything under 70 Hz,
  // which drops open E and A, so the page takes the raw blocks and runs PitchDetect.detect with a lower floor on a longer window.
  function BlockDetector(sr, onFrame) {
    var SIZE = 4096, ring = new Float32Array(SIZE), wp = 0, filled = 0, since = 0, step = Math.round(0.04 * sr);
    return {
      push: function (d) {
        for (var i = 0; i < d.length; i++) { ring[wp] = d[i]; wp = (wp + 1) % SIZE; }
        filled = Math.min(SIZE, filled + d.length); since += d.length;
        if (filled < SIZE || since < step) return; since = 0;
        var win = new Float32Array(SIZE); for (i = 0; i < SIZE; i++) win[i] = ring[(wp + i) % SIZE];
        var hz = global.PitchDetect.detect(win, sr, { fmin: 35, fmax: 400 }), r = global.PitchDetect.rms(win);
        onFrame(hz > 0 ? { hz: hz, midi: Math.round(global.PitchDetect.hzToMidi(hz)), rms: r } : { hz: 0, midi: null, rms: r });
      }
    };
  }

  function mount(root) {
    var $ = function (id) { return document.getElementById(id); };
    var EP = global.EarPiano, C = global.EBassChart, P = global.EBassPage;
    var S = global.EarBass.session = { phase: "setup", results: [] };
    var listening = false, got = [], lastAt = 0, timers = [], mic = null, quietUntil = 0;
    var seg = Segmenter(function (concert) { if (performance.now() < quietUntil) return; noteOn(concert + 12, true); });

    function stopAll() { timers.forEach(clearTimeout); timers = []; listening = false; }
    function playNotes(list) {   // [{ written, at, dur }] in beats -> Promise when done (written pitch; the bass sounds an octave lower)
      var beat = 60 / (+$("es-tempo").value || 72), end = 0;
      list.forEach(function (n) { end = Math.max(end, n.at + n.dur); });
      quietUntil = performance.now() + (end * beat + 0.1) * 1000;   // the mic must not hear the page
      return P.sound().then(function () {
        list.forEach(function (n) { timers.push(setTimeout(function () { P.play(n.written - 12, n.dur * beat * 1.3); }, n.at * beat * 1000)); });
        return new Promise(function (r) { timers.push(setTimeout(r, (end * beat + 0.15) * 1000)); });
      });
    }
    // the set moved to the chosen written key and placed in the bass's easy range
    function shift() {
      var want = +$("es-key").value, d = ((want - S.set.tonicMidi) % 12 + 12) % 12; if (d > 6) d -= 12;
      return placeSet(S.set.patterns, d);
    }
    function pat(i) { var p = S.set.patterns[S.order[i]], sh = shift(); return { chord: p.chord, solfege: p.solfege, midi: p.midi.map(function (m) { return m + sh; }), n: S.order[i] + 1 }; }
    function keyContext() {   // the tonic chord broken upward, ending on the tonic an octave up and back to the root (written pitch)
      var t = S.set.tonicMidi + shift(), third = S.set.minor ? 3 : 4;
      while (t > 52) t -= 12; while (t < 40) t += 12;
      return playNotes([{ written: t, at: 0, dur: 1 }, { written: t + third, at: 1, dur: 1 }, { written: t + 7, at: 2, dur: 1 }, { written: t + 12, at: 3, dur: 1 }, { written: t, at: 4, dur: 1.8 }]);
    }
    function playPat(p) { return playNotes(p.midi.map(function (m, i) { return { written: m, at: i, dur: 1 }; })); }
    function nm(m) { return C.name(m, S.flats); }   // written pitch, spelled for the key

    function showFingerings(box, midi) {   // one fretboard, the notes numbered 1, 2, 3 ... in order; a staff line below
      box.innerHTML = "";
      var snd = midi.map(function (m) { return m - 12; }), pos = choosePositions(snd, MAXF), marks = [];
      var fbHost = document.createElement("div"); fbHost.className = "eb-fb"; box.appendChild(fbHost);
      var fb = C.diagram(fbHost, {});
      pos.forEach(function (p, i) { if (p) marks.push({ s: p.s, f: p.f, text: String(i + 1) }); });
      fb.mark(marks);
      var cap = document.createElement("div"); cap.className = "ep-fing";
      cap.textContent = midi.map(function (m, i) { var p = pos[i]; return (i + 1) + " · " + nm(m) + (p ? " (" + C.STRINGS.filter(function (x) { return x.id === p.s; })[0].name + (p.f ? " " + p.f : " open") + ")" : ""); }).join("   ");
      box.appendChild(cap);
      var st = document.createElement("div"); st.className = "ebp-staff eb-staff"; box.appendChild(st);
      if (global.ABCJS) global.ABCJS.renderAbc(st, "X:1\nL:1/4\nK:C clef=bass\n" + midi.map(function (m) { return C.abc(m); }).join(" ") + "|]", { staffwidth: 40 + 38 * midi.length, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0 });
    }

    // ---------- input ----------
    function noteOn(m, fromMic) {
      if (!fromMic && $("es-echo").checked) P.play(m - 12, 0.6);
      $("es-heard").textContent = "Heard: " + nm(m) + (fromMic ? " (written; sounds an octave lower)" : "");
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

    // ---------- the student's report (SiteRecord, record.js loaded on first use): one item a pattern, tool "ear-bass"; each try is
    // an attempt [notes played, 1 right / 0 wrong, seconds since the pattern was played]; rv = 1 when the pattern had to be shown
    var SR_SRC = "/apps/shared/report/record.js?v=8", srWait = [];
    function withRecord(f) {
      if (global.SiteRecord) return f(global.SiteRecord);
      srWait.push(f); if (srWait.length > 1) return;
      var sc = document.createElement("script"); sc.src = SR_SRC; sc.onload = function () { var w = srWait; srWait = []; w.forEach(function (g) { if (global.SiteRecord) g(global.SiteRecord); }); }; document.head.appendChild(sc);
    }
    function srTry(ok, heard, shown) {
      withRecord(function (SR) {
        if (!S.item) { var sv = $("es-set"); S.item = SR.add("ear-bass", { ex: "Bass Patterns by Ear", q: { text: (sv ? sv.value + ", pattern " : "Pattern ") + (S.j + 1) + " of " + S.earList.length + ": play what you heard" }, want: S.cur.midi.map(nm).join(" ") }); }
        if (heard) S.item.at.push([heard.map(nm).join(" ") || "(nothing)", ok ? 1 : 0, Math.round((Date.now() - S.t0) / 1000)]);
        if (shown) S.item.rv = 1;
        SR.save();
      });
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
      S.i = S.earList[S.j]; S.cur = pat(S.i); S.tries = 0; S.replays = 0; S.shown = false; S.item = null; S.t0 = Date.now();
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
      srTry(ok, heard, false);
      if (ok) { record(S.tries === 1 ? "first" : "later"); say("es-ear-msg", S.tries === 1 ? "✓ First try!" : "✓ Got it on try " + S.tries + ".", "good"); S.j++; timers.push(setTimeout(nextEar, 1000)); return; }
      var max = +$("es-tries").value || 3;
      if (S.tries >= max) { srTry(false, null, true); record("shown"); show("Here's how it goes. Play it once from the fingerings, then on to the next."); return; }
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
        " (sounds an octave lower: " + C.name(lo - 12, S.flats) + " to " + C.name(hi - 12, S.flats) + "). The first " + S.teach + " are taught; the other " +
        (S.set.patterns.length - S.teach) + " are by ear." + (lo < LO || hi > HI ? " This set is wider than frets 0-5, so some notes are higher up the neck." : "") + (p0 ? "" : "");
    }

    var sel = $("es-set"); if (global.TonalPatternGen) TonalPatternGen.loadSaved(patternObject);
    Object.keys(patternObject).forEach(function (k) { var o = document.createElement("option"); o.value = o.textContent = k; sel.appendChild(o); });
    if (patternObject["322a"]) sel.value = "322a";
    ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"].forEach(function (n, i) { var o = document.createElement("option"); o.value = i; o.textContent = n; $("es-key").appendChild(o); });
    $("es-key").value = "0";   // written C
    sel.onchange = loadSet; $("es-teach").onchange = loadSet;
    $("es-key").onchange = info;
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
    var bd = null;
    $("es-mic").onclick = function () {
      if (mic && mic.running) { mic.stop(); $("es-mic").textContent = "🎤 Listen to my bass"; status("Microphone off.", false); return; }
      mic = PitchDetect.mic({ onBlock: function (d, n0, sr) { if (!bd) bd = BlockDetector(sr, function (f) { seg.frame(f); }); bd.push(d); }, onError: function (e) { status(e.message || "Microphone not allowed.", false); } });
      mic.start().then(function () { $("es-mic").textContent = "■ Stop listening"; status("Listening to the microphone (or plug the bass into an audio interface).", true); }, function (e) { status((e && e.message) || "Microphone not allowed.", false); });
    };
    MidiFeel.subscribe(function (e) { if (e.type === "on") { status("MIDI notes coming in", true); noteOn(e.midi, false); } });
    $("es-midi").onclick = function () {
      MidiFeel.connect().then(function (a) { var n = []; a.inputs.forEach(function (i) { n.push(i.name); }); status(n.length ? "MIDI: " + n.join(", ") : "MIDI is on, but nothing is plugged in.", n.length); },
        function (e) { status(e.message || "MIDI was not allowed.", false); });
    };
    if (global.MusicalTyping) MusicalTyping.attach({ octave: 3, onOn: function (m) { noteOn(m, false); }, onOff: function () {}, enabled: function () { return $("es-typing").checked; } });
    global.EarBass.seg = seg;   // tests feed mic frames here

    loadSet();
    global.EarBass.noteOn = noteOn;
  }

  var api = { placeSet: placeSet, Segmenter: Segmenter, choosePositions: choosePositions, BlockDetector: BlockDetector, mount: mount, LO: LO, HI: HI };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.EarBass = api;
})(typeof window !== "undefined" ? window : globalThis);
