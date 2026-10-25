// ear-piano.js — Patterns by Ear (practice/patterns-by-ear.qmd): learn the first patterns of a tonal pattern set from an on-screen
// keyboard with finger numbers, then play the rest back by ear on a MIDI keyboard (or the computer keyboard). No notation.
//
//   EarPiano.parseSet(abcBook)            -> { tonicMidi, minor, key, patterns: [{ chord, midi: [..], solfege }] }
//   EarPiano.finger(midis, "R" | "L")     -> [finger numbers 1-5]: one hand position, no crossings (see FINGERING below)
//   EarPiano.compare(want, got, anyOct)   -> { ok, wrongAt }   (got may be shorter: ok:null while still on track)
//   EarPiano.keyboard(el, low, high)      -> { mark(midi, finger), lit(midi, cls), clear(), clearLit() }
//   EarPiano.mount(root)                  the page (ids below); EarPiano.session is its state, for tests.
// Needs AbcCore (abc-core.js), MidiFeel (midi-feel.js, the page's one Web MIDI input), MusicalTyping, AbcPlay (sound).
(function (global) {
  "use strict";
  var BLACK = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function isBlack(m) { return !!BLACK[((m % 12) + 12) % 12]; }

  // ---------- reading a set ----------
  function parseSet(book) {
    var C = global.AbcCore, out = [], tonicMidi = 60, minor = false, key = "C";
    book.trim().split(/\n\s*\n/).forEach(function (t) {
      var k = /^K:\s*(.+)$/m.exec(t), v = /\[V:\s*V1\](.*)/.exec(t); if (!k || !v) return;
      key = k[1].trim().replace(/\)$/, "");
      var km = /^([A-G])([#b]?)\s*([A-Za-z]*)/.exec(key);
      tonicMidi = 60 + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[km[1]] + (km[2] === "#" ? 1 : km[2] === "b" ? -1 : 0);
      minor = /^(m|min|minor|aeo|aeolian|dor|dorian|phr|phrygian|loc|locrian)$/i.test(km[3] || "");
      var ksig = C.keyAccidentals(key), state = {}, chord = (/"([^"]*)"/.exec(v[1]) || [])[1] || "";
      var body = v[1].replace(/"[^"]*"/g, ""), midi = [];
      body.replace(/(\^\^|\^|__|_|=)?([A-Ga-g])([,']*)(\d*)/g, function (_, a, l, o) {
        var acc = a === undefined ? undefined : { "^^": 2, "^": 1, "__": -2, "_": -1, "=": 0 }[a];
        var oct = 12 * ((o.match(/'/g) || []).length - (o.match(/,/g) || []).length);
        midi.push(C.noteMidi({ letter: l, oct: oct, acc: acc }, ksig, state));
      });
      var w = /^w:\s?(.*)$/m.exec(t);
      if (midi.length) out.push({ chord: chord, midi: midi, solfege: w ? w[1].trim() : "" });
    });
    return { tonicMidi: tonicMidi, minor: minor, key: key, patterns: out };
  }

  // ---------- FINGERING ----------
  // A rule of thumb, not taken from a method book: the whole pattern is played from one hand position (patterns are 2-5 notes
  // within an octave), so every pair of notes is checked, not only neighbours. Higher note, higher finger in the right hand
  // (lower in the left); the same note keeps its finger; each finger pair has a comfortable stretch for a young hand (SPAN,
  // in semitones); fingers follow the letter steps (C E G -> 1 3 5); thumb off the black keys where it can.
  var SPAN = { "12": 5, "13": 7, "14": 9, "15": 12, "23": 4, "24": 5, "25": 7, "34": 3, "35": 5, "45": 3 };
  function finger(midis, hand) {
    var n = midis.length, best = null, bestCost = 1e9, f = [];
    var p = midis.map(function (m) { return hand === "L" ? -m : m; });
    (function rec(i) {
      if (i === n) {
        var c = 0;
        for (var a = 0; a < n; a++) {
          if (f[a] === 1 && isBlack(midis[a])) c += 2.5;
          if (f[a] === 5 && isBlack(midis[a])) c += 0.7;
          for (var b = a + 1; b < n; b++) {
            var d = p[b] - p[a], fd = f[b] - f[a];
            if (d === 0) { if (fd) c += 6; continue; }
            if (fd === 0) { c += 40; continue; }                    // one finger for two different notes: never in one position
            if ((d > 0) !== (fd > 0)) { c += 40; continue; }      // a crossing: not for these short patterns (a wide stretch is cheaper)
            var lo = Math.min(f[a], f[b]), hi = Math.max(f[a], f[b]), max = SPAN["" + lo + hi], ad = Math.abs(d);
            if (ad > max) c += (ad - max) * 3;
            var steps = Math.min(4, Math.round(ad * 7 / 12));
            c += 0.5 * Math.abs(Math.abs(fd) - steps);
          }
        }
        if (c < bestCost) { bestCost = c; best = f.slice(); }
        return;
      }
      for (var k = 1; k <= 5; k++) { f[i] = k; rec(i + 1); }
    })(0);
    return best;
  }

  // ---------- checking a try ----------
  function compare(want, got, anyOct) {
    var shift = 0;
    if (got.length && anyOct) { var d = got[0] - want[0]; if (d % 12 === 0) shift = d; }
    for (var i = 0; i < got.length; i++) if (got[i] - shift !== want[i]) return { ok: false, wrongAt: i };
    return { ok: got.length >= want.length ? true : null, wrongAt: -1 };
  }

  // ---------- on-screen keyboard ----------
  var SVGNS = "http://www.w3.org/2000/svg";
  function keyboard(el, low, high) {
    if (isBlack(low)) low--;                          // start and end on white keys
    if (isBlack(high)) high++;
    var W = 30, H = 120, BW = 18, BH = 76, whites = [], x = 0, pos = {};
    for (var m = low; m <= high; m++) if (!isBlack(m)) { pos[m] = { x: x, b: false }; whites.push(m); x += W; }
    for (m = low; m <= high; m++) if (isBlack(m)) pos[m] = { x: pos[m - 1].x + W - BW / 2, b: true };
    var svg = '<svg viewBox="0 0 ' + (x + 1) + ' ' + (H + 2) + '" role="img" aria-label="Piano keyboard" xmlns="' + SVGNS + '">';
    whites.forEach(function (m) { svg += '<rect class="ep-k ep-w" data-m="' + m + '" x="' + pos[m].x + '" y="1" width="' + W + '" height="' + H + '" rx="3"/>'; });
    Object.keys(pos).forEach(function (k) { var q = pos[k]; if (q.b) svg += '<rect class="ep-k ep-b" data-m="' + k + '" x="' + q.x + '" y="1" width="' + BW + '" height="' + BH + '" rx="2"/>'; });
    whites.forEach(function (m) { if (m % 12 === 0) svg += '<text class="ep-c" x="' + (pos[m].x + W / 2) + '" y="' + (H - 6) + '" text-anchor="middle">C' + (m / 12 - 1) + '</text>'; });
    svg += '<g class="ep-marks"></g></svg>';
    el.innerHTML = svg;
    var g = el.querySelector(".ep-marks");
    function key(m) { return el.querySelector('.ep-k[data-m="' + m + '"]'); }
    return {
      low: low, high: high,
      mark: function (m, fing, order) {
        var q = pos[m]; if (!q) return;
        var cx = q.x + (q.b ? BW : W) / 2, cy = q.b ? BH - 16 : H - 30;
        var c = document.createElementNS(SVGNS, "g"); c.setAttribute("class", "ep-mark");
        c.innerHTML = '<circle cx="' + cx + '" cy="' + cy + '" r="11"/><text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle">' + fing + '</text>' +
          (order ? '<text class="ep-ord" x="' + cx + '" y="' + (cy - 15) + '" text-anchor="middle">' + order + '</text>' : "");
        g.appendChild(c); var k = key(m); if (k) k.classList.add("ep-target");
      },
      clear: function () { g.innerHTML = ""; el.querySelectorAll(".ep-target").forEach(function (k) { k.classList.remove("ep-target"); }); },
      lit: function (m, cls) { var k = key(m); if (!k) return; k.classList.add(cls); setTimeout(function () { k.classList.remove(cls); }, 450); },
      has: function (m) { return !!pos[m]; }
    };
  }

  // ---------- the page ----------
  function mount(root) {
    var $ = function (id) { return document.getElementById(id); };
    var S = global.EarPiano.session = { phase: "setup", results: [] };
    var snd = null, listening = false, got = [], lastAt = 0, timers = [], typing = null;

    // sound: the band's piano through AbcPlay's shared context
    function sound() {
      if (!snd) snd = AbcPlay.ctx().then(function (s) { return s.ac.resume().then(function () { return s.bank.load(["piano"]); }).then(function () { return s; }); });
      return snd;
    }
    function playNotes(list) {   // list: [{ midi | chord: [..], at (beats), dur (beats) }] -> Promise when done
      var beat = 60 / (+$("ep-tempo").value || 80), end = 0;
      list.forEach(function (n) { end = Math.max(end, n.at + n.dur); });
      return sound().then(function (s) {
        var t0 = s.ac.currentTime + 0.08;
        list.forEach(function (n) {
          (n.chord || [n.midi]).forEach(function (m) { s.bank.play("piano", { midi: m, vel: n.chord ? 0.4 : 0.6, dur: n.dur * beat * 0.92 }, t0 + n.at * beat, s.out); });
        });
        return new Promise(function (r) { timers.push(setTimeout(r, (end * beat + 0.15) * 1000)); });
      }, function () { return new Promise(function (r) { timers.push(setTimeout(r, end * beat * 1000)); }); });
    }
    function stopAll() { timers.forEach(clearTimeout); timers = []; listening = false; }

    // the set, moved to the chosen key and hand
    function shift() {
      var want = +$("ep-key").value, d = ((want - S.set.tonicMidi) % 12 + 12) % 12; if (d > 6) d -= 12;
      return d + ($("ep-hand").value === "L" ? -12 : 0);
    }
    function pat(i) { var p = S.set.patterns[S.order[i]], sh = shift(); return { chord: p.chord, solfege: p.solfege, midi: p.midi.map(function (m) { return m + sh; }), n: S.order[i] + 1 }; }
    function keyContext() {
      var t = S.set.tonicMidi + shift() - 12, third = S.set.minor ? 3 : 4;
      var I = [t, t + 12, t + 12 + third, t + 19], V7 = [t - 5, t + 11, t + 14, t + 17];   // C3 C4 E4 G4 / G2 B3 D4 F4
      return playNotes([{ chord: I, at: 0, dur: 1.4 }, { chord: V7, at: 1.5, dur: 1.4 }, { chord: I, at: 3, dur: 1.8 }]);
    }
    function playPat(p) { return playNotes(p.midi.map(function (m, i) { return { midi: m, at: i, dur: 1 }; })); }
    function markAll(kb, midi, fing) {
      kb.clear(); var at = {};
      midi.forEach(function (m, i) { (at[m] = at[m] || { f: fing[i], o: [] }).o.push(i + 1); });
      Object.keys(at).forEach(function (m) { kb.mark(+m, at[m].f, at[m].o.join("·")); });
    }
    function nm(m) { return NAMES[((m % 12) + 12) % 12]; }

    function makeKeyboards() {
      var lo = 1e9, hi = -1e9, sh = shift();
      S.set.patterns.forEach(function (p) { p.midi.forEach(function (m) { lo = Math.min(lo, m + sh); hi = Math.max(hi, m + sh); }); });
      if (hi - lo < 14) { var mid = Math.round((lo + hi) / 2); lo = Math.min(lo, mid - 7); hi = Math.max(hi, mid + 7); }
      S.kbLearn = keyboard($("ep-kb-learn"), lo - 2, hi + 2);
      S.kbEar = keyboard($("ep-kb-ear"), lo - 2, hi + 2);
    }

    // ---------- input ----------
    function noteOn(m) {
      if ($("ep-echo").checked) sound().then(function (s) { s.bank.play("piano", { midi: m, vel: 0.55, dur: 0.6 }, s.ac.currentTime, s.out); });
      var kb = S.phase === "learn" ? S.kbLearn : S.kbEar;
      if (!listening || !S.cur) { if (kb) kb.lit(m, "ep-on"); return; }
      var now = performance.now();
      if (got.length && now - lastAt > 4000) got = [];   // a long stop: start the try again
      lastAt = now; got.push(m);
      var r = compare(S.cur.midi, got, $("ep-anyoct").checked);
      if (kb) kb.lit(m, r.ok === false ? "ep-bad" : "ep-good");
      if (r.ok === null) return;
      listening = false; var heard = got.slice(); got = [];
      (S.phase === "learn" ? learnResult : earResult)(r.ok, heard, r.wrongAt);
    }

    // ---------- Learn ----------
    function startLearn() {
      stopAll(); S.phase = "learn"; S.i = 0; makeKeyboards(); showLearn();
      openSection("learn"); keyContext().then(function () { listenAfter(playPat(S.cur)); });
    }
    function showLearn() {
      var p = S.cur = pat(S.i), fing = finger(p.midi, $("ep-hand").value);
      S.right = 0;
      $("ep-learn-head").textContent = "Pattern " + (S.i + 1) + " of " + S.teach;
      $("ep-learn-solf").textContent = $("ep-solf-learn").checked ? (p.solfege || "") : "";
      $("ep-learn-chord").textContent = p.chord ? "over " + p.chord : "";
      S.kbLearn.clear();
      markAll(S.kbLearn, p.midi, fing);
      $("ep-learn-fing").textContent = "Fingers: " + fing.join(" – ") + "  (" + ($("ep-hand").value === "L" ? "left" : "right") + " hand)";
      say("ep-learn-msg", "Listen, then play it back.", "");
      dots();
    }
    function listenAfter(pr) { listening = false; got = []; pr.then(function () { listening = true; if (S.phase !== "done") say(S.phase === "learn" ? "ep-learn-msg" : "ep-ear-msg", "Your turn.", ""); }); }
    function learnResult(ok, heard, at) {
      var need = +$("ep-need").value || 2;
      if (ok) {
        S.right++;
        if (S.right >= need) {
          say("ep-learn-msg", "✓ Got it.", "good");
          timers.push(setTimeout(function () {
            if (S.i + 1 < S.teach) { S.i++; showLearn(); listenAfter(playPat(S.cur)); }
            else { say("ep-learn-msg", "✓ All " + S.teach + " learned. Now the rest, by ear.", "good"); $("ep-to-ear").hidden = false; }
          }, 900));
        } else { say("ep-learn-msg", "✓ Right. Once more (" + S.right + " of " + need + ").", "good"); timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 700)); }
      } else {
        S.right = 0;
        say("ep-learn-msg", "Not quite: note " + (at + 1) + " is " + nm(S.cur.midi[at]) + ", you played " + nm(heard[at]) + ". Listen again.", "bad");
        timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 1100));
      }
    }

    // ---------- By ear ----------
    function startEar(only) {
      stopAll(); S.phase = "ear"; $("ep-to-ear").hidden = true;
      if (!S.kbEar) makeKeyboards();
      var rest = only || S.order.slice(S.teach).map(function (_, k) { return S.teach + k; });
      if ($("ep-shuffle").checked) rest = rest.map(function (v) { return [Math.random(), v]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
      S.earList = rest; S.j = 0; S.results = only ? S.results : [];
      $("ep-kb-ear").hidden = !$("ep-show-kb").checked;
      openSection("by-ear");
      if (!rest.length) { say("ep-ear-msg", "Nothing left: teach fewer patterns or pick a bigger set.", "bad"); return; }
      keyContext().then(nextEar);
    }
    function nextEar() {
      if (S.j >= S.earList.length) return finish();
      S.i = S.earList[S.j]; S.cur = pat(S.i); S.tries = 0; S.replays = 0; S.shown = false;
      $("ep-ear-head").textContent = "Pattern " + (S.j + 1) + " of " + S.earList.length;
      $("ep-ear-solf").textContent = $("ep-solf-ear").checked ? (S.cur.solfege || "") : "";
      S.kbEar.clear(); $("ep-ear-next").hidden = true;
      say("ep-ear-msg", "Listen…", ""); listenAfter(playPat(S.cur)); dots();
    }
    function record(result) {
      S.results = S.results.filter(function (r) { return r.i !== S.i; });
      S.results.push({ i: S.i, n: S.cur.n, chord: S.cur.chord, solfege: S.cur.solfege, result: result, tries: S.tries, replays: S.replays });
      dots();
    }
    function earResult(ok, heard, at) {
      if (S.shown) {   // played it after being shown: on to the next
        if (ok) { say("ep-ear-msg", "✓ That's it. On to the next.", "good"); S.j++; timers.push(setTimeout(nextEar, 900)); }
        else { say("ep-ear-msg", "Follow the numbers on the keys. Listen again.", "bad"); timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 900)); }
        return;
      }
      S.tries++;
      if (ok) {
        record(S.tries === 1 ? "first" : "later");
        say("ep-ear-msg", S.tries === 1 ? "✓ First try!" : "✓ Got it on try " + S.tries + ".", "good");
        S.j++; timers.push(setTimeout(nextEar, 1000)); return;
      }
      var max = +$("ep-tries").value || 3;
      if (S.tries >= max) { record("shown"); show("Here's how it goes. Play it once from the keys, then on to the next."); return; }
      say("ep-ear-msg", "Not quite (note " + (at + 1) + "). Try " + (S.tries + 1) + " of " + max + ": listen again.", "bad");
      timers.push(setTimeout(function () { listenAfter(playPat(S.cur)); }, 1000));
    }
    function show(msg) {
      S.shown = true; $("ep-kb-ear").hidden = false;
      var fing = finger(S.cur.midi, $("ep-hand").value);
      markAll(S.kbEar, S.cur.midi, fing);
      say("ep-ear-msg", msg, "bad"); $("ep-ear-next").hidden = false;
      listenAfter(playPat(S.cur));
    }
    function finish() {
      stopAll(); S.phase = "done"; S.cur = null;
      var r = S.results.slice().sort(function (a, b) { return a.i - b.i; });
      var first = r.filter(function (x) { return x.result === "first"; }).length, later = r.filter(function (x) { return x.result === "later"; }).length;
      var LABEL = { first: "✓ first try", later: "✓ after tries", shown: "✗ shown", skipped: "– skipped" };
      $("ep-res-sum").innerHTML = r.length ? "<strong>" + first + " of " + r.length + "</strong> on the first try, " + later + " more after another try." : "No results yet.";
      $("ep-res-table").innerHTML = r.length ? '<table class="table table-sm ep-table"><thead><tr><th>#</th><th>Chord</th><th>Solfège</th><th>Result</th><th>Tries</th><th>Heard again</th></tr></thead><tbody>' +
        r.map(function (x) { return '<tr class="ep-r-' + x.result + '"><td>' + x.n + "</td><td>" + (x.chord || "") + "</td><td>" + (x.solfege || "") + "</td><td>" + LABEL[x.result] + "</td><td>" + x.tries + "</td><td>" + x.replays + "</td></tr>"; }).join("") + "</tbody></table>" : "";
      $("ep-again").hidden = !r.some(function (x) { return x.result !== "first"; });
      say("ep-ear-msg", "Done. See the results below.", "good");
      openSection("results");
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
      $("ep-dots").innerHTML = h; $("ep-dots2").innerHTML = h;
    }
    function openSection(id) {
      var sec = document.getElementById(id); if (!sec) return;
      if (sec._sfSet && sec.classList.contains("sf-shut")) sec._sfSet(false, true);
      if (sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function loadSet() {
      stopAll(); S.phase = "setup";
      var book = patternObject[$("ep-set").value]; S.set = parseSet(book);
      S.order = S.set.patterns.map(function (_, i) { return i; });
      S.teach = Math.max(1, Math.min(S.set.patterns.length - 1, +$("ep-teach").value || 3));
      $("ep-key").value = String(((S.set.tonicMidi % 12) + 12) % 12);
      $("ep-set-info").textContent = S.set.patterns.length + " patterns in " + S.set.key.replace(/m$/, " minor").replace(/dor$/, " dorian").replace(/mix$/, " mixolydian") +
        ". The first " + S.teach + " are taught; the other " + (S.set.patterns.length - S.teach) + " are by ear.";
      S.kbEar = null; makeKeyboards(); dots();
    }

    // menus
    var sel = $("ep-set"); if (global.TonalPatternGen) TonalPatternGen.loadSaved(patternObject);
    Object.keys(patternObject).forEach(function (k) { var o = document.createElement("option"); o.value = o.textContent = k; sel.appendChild(o); });
    if (patternObject["322a"]) sel.value = "322a";
    NAMES.forEach(function (n, i) { var o = document.createElement("option"); o.value = i; o.textContent = n; $("ep-key").appendChild(o); });
    sel.onchange = loadSet; $("ep-teach").onchange = loadSet;
    $("ep-key").onchange = function () { S.kbEar = null; makeKeyboards(); };
    $("ep-hand").onchange = $("ep-key").onchange;
    $("ep-start").onclick = startLearn;
    $("ep-skip-learn").onclick = function () { startEar(); };
    $("ep-to-ear").onclick = function () { startEar(); };
    $("ep-learn-hear").onclick = function () { if (S.phase === "learn") listenAfter(playPat(S.cur)); };
    $("ep-ear-hear").onclick = function () { if (S.phase === "ear") { S.replays++; listenAfter(playPat(S.cur)); } };
    $("ep-ear-key").onclick = function () { if (S.cur) keyContext().then(function () { listenAfter(playPat(S.cur)); }); };
    $("ep-ear-show").onclick = function () { if (S.phase === "ear" && !S.shown) { record("shown"); show("Here it is. Play it once from the keys."); } };
    $("ep-ear-next").onclick = function () { stopAll(); S.j++; nextEar(); };
    $("ep-ear-skip").onclick = function () { if (S.phase !== "ear") return; stopAll(); if (!S.shown) record("skipped"); S.j++; nextEar(); };
    $("ep-again").onclick = function () { startEar(S.results.filter(function (x) { return x.result !== "first"; }).map(function (x) { return x.i; })); };
    $("ep-restart").onclick = startLearn;
    $("ep-show-kb").onchange = function () { if (S.phase === "ear" && !S.shown) $("ep-kb-ear").hidden = !this.checked; };

    // MIDI and the computer keyboard
    function midiStatus(txt, on) { $("ep-midi-status").textContent = txt; $("ep-midi-dot").classList.toggle("on", !!on); }
    MidiFeel.subscribe(function (e) { if (e.type === "on") { midiStatus("Keys coming in", true); noteOn(e.midi); } });
    $("ep-connect").onclick = function () {
      MidiFeel.connect().then(function (a) {
        var names = []; a.inputs.forEach(function (i) { names.push(i.name); });
        midiStatus(names.length ? "Connected: " + names.join(", ") : "MIDI is on, but no keyboard is plugged in.", names.length);
      }, function (e) { midiStatus(e.message || "MIDI was not allowed.", false); });
    };
    if (global.MusicalTyping) typing = MusicalTyping.attach({ octave: 4, onOn: function (m) { noteOn(m); }, onOff: function () {},
      enabled: function () { return $("ep-typing").checked; } });

    loadSet();
    global.EarPiano.noteOn = noteOn;   // tests
  }

  var api = { parseSet: parseSet, finger: finger, compare: compare, keyboard: keyboard, mount: mount, isBlack: isBlack };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.EarPiano = api;
})(typeof window !== "undefined" ? window : globalThis);
