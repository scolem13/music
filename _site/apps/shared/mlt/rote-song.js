// rote-song.js: the MLT Rote Song Procedure as steps a class (or one student) walks through, learning a song by ear. Global RoteSong.
// The notation is never shown: the song is only heard.
//
//   RoteSong.mount(host, abc, { title }) -> { stop() }     one song's procedure in host
//   RoteSong.load() -> Promise          loads the tune collection (apps/tunes/tunes-object.js, 1.2 MB) once
//   RoteSong.tuneText(id) -> abc | null the tune with %%id id (after load)
//   RoteSong.STEPS                      [{ id, title, phase, cue, say }] the steps, in order
//   RoteSong.info(abc) -> { tonic, mode, minor, triple, qpm, macro, micro }   (pure; the Node test reads it)
//   Page: <div class="rote-song" data-tune="id"></div> (or ?tune=id on the URL; a song picker when neither is given)
//
// Steps 1-5 and 9 are Mullen's Rote Song Procedure (MLT Any Music Teacher Can Du…De pp. 90–91): establish tonality, the whole song,
// macrobeats in the heels, microbeats with spider fingers, both, the resting tone on BUM when the teacher stops (the dropped ball),
// audiate and raise a hand, sing it alone on "Ready, sing". THIS SITE'S additions, not in the book: step 8 "Audiate the ending" (the
// song stops somewhere in its last quarter and the student keeps it going inside and presses Space on its last note; the press is
// timed against where that note would have sounded), the beat lights, and the timing of the audiate step.
// Macrobeat and microbeat lengths by meter are this site's reading (2/4: quarter / eighth; 4/4: half / quarter at 100 qpm and up,
// else quarter / eighth; 3/4: dotted half / quarter; 6/8, 9/8, 12/8, 3/8: dotted quarter / eighth; 2/2: half / quarter).
// Sound: AbcPlay (piano), cues by Establish ("move-like-me", "audiate" and the tonality ways the teacher weighted).
(function (global) {
  "use strict";
  var TUNES = "/apps/tunes/tunes-object.js?v=1", loading = null;
  var STEPS = [
    { id: "tonality", phase: "Whole", title: "Establish the tonality", say: "Listen. This sets the song's tonality. The last pitch is the resting tone, home." },
    { id: "whole", phase: "Whole", title: "Hear the whole song", say: "Just listen to the whole song." },
    { id: "macro", phase: "Part", title: "Macrobeats in your heels", cue: "Bum bum bum, move like me", say: "Stand up. Lift and drop your heels on the big beats (macrobeats) while the song plays. The big light shows them." },
    { id: "micro", phase: "Part", title: "Microbeats: spider fingers", cue: "Bum bum bum, move like me", say: "Tap the small beats (microbeats) in your lap with spider fingers. The small light shows them." },
    { id: "both", phase: "Part", title: "Macrobeats and microbeats together", cue: "Bum bum bum, move like me", say: "Heels on the macrobeats and spider fingers on the microbeats, both at once." },
    { id: "rest", phase: "Part", title: "Sing the resting tone", say: "First hear the resting tone. Then the song plays, and when it stops suddenly (the ball drops), sing the resting tone on BUM. Check, then go on." },
    { id: "audiate", phase: "Whole", title: "Audiate the whole song", cue: "Bum bum bum, audiate", say: "After the cue there is no sound. Hear the whole song in your head. Raise your hand (press Done) when it is over." },
    { id: "ending", phase: "Whole", title: "Audiate the ending", say: "The song plays and stops suddenly near the end. Keep hearing it in your head after the sound stops, and press Space (or Tap) exactly when the last note would sound." },
    { id: "sing", phase: "Whole", title: "Sing it by yourself", cue: "Bum bum bum, ready, sing!", say: "After the cue, sing the whole song by yourself. Nobody sings with you. Check with the recording afterwards." }
  ];

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- the tune ----------
  function load() {
    if (typeof tunesObject !== "undefined" || global.tunesObject) return Promise.resolve();
    return loading || (loading = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = TUNES; s.onload = res; s.onerror = function () { loading = null; rej(new Error("tune collection did not load")); }; document.head.appendChild(s);
    }));
  }
  function tuneText(id) {
    var o = (typeof tunesObject !== "undefined" ? tunesObject : global.tunesObject) || {}, out = null;
    Object.keys(o).forEach(function (k) { if (out) return; String(o[k]).split(/\n(?=X:)/).forEach(function (t) { if (!out && new RegExp("^%%id\\s+" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "m").test(t)) out = t; }); });
    return out;
  }
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var MODES = { dor: "dorian", phr: "phrygian", lyd: "lydian", mix: "mixolydian", aeo: "aeolian", loc: "locrian" };
  function field(abc, f) { var m = String(abc).match(new RegExp("^" + f + ":\\s*(.*)$", "m")); return m ? m[1].trim() : ""; }
  function info(abc) {
    var k = field(abc, "K"), km = k.match(/^([A-G])([#b]?)\s*([A-Za-z]*)/), tonic = 0, mode = "major";
    if (km) {
      tonic = (PC[km[1]] + (km[2] === "#" ? 1 : km[2] === "b" ? -1 : 0) + 12) % 12;
      var w = km[3].toLowerCase();
      if (w === "m" || w.indexOf("min") === 0) mode = "minor"; else if (MODES[w.slice(0, 3)]) mode = MODES[w.slice(0, 3)];
    }
    var M = field(abc, "M").replace(/\s/g, ""), num = 4, den = 4;
    if (M === "C") M = "4/4"; if (M === "C|") M = "2/2";
    var mm = M.match(/^(\d+)\/(\d+)/); if (mm) { num = +mm[1]; den = +mm[2]; }
    var Q = field(abc, "Q"), qpm = 100, qm = Q.match(/(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)/) || Q.match(/^()()(\d+)$/);
    if (qm) qpm = qm[1] ? +qm[3] * (+qm[1] / +qm[2]) / 0.25 : +qm[3];
    var compound = den === 8 && num % 3 === 0, triple = compound || num === 3, macro, micro;   // in whole notes
    if (compound) { macro = 3 / 8; micro = 1 / 8; }
    else if (num === 3) { macro = 3 / den; micro = 1 / den; }
    else if (den === 2) { macro = 1 / 2; micro = 1 / 4; }
    else if (num === 4 && den === 4 && qpm >= 100) { macro = 1 / 2; micro = 1 / 4; }
    else { macro = 1 / den; micro = 1 / (den * 2); }
    return { tonic: tonic, mode: mode, minor: mode === "minor" || mode === "aeolian", triple: triple, qpm: Math.round(qpm), macro: macro, micro: micro, title: field(abc, "T") };
  }

  // ---------- one song's procedure ----------
  var off = null;
  function visual(abc) {
    if (!off) { off = el("div"); off.style.cssText = "position:absolute;left:-9999px;width:600px"; off.setAttribute("aria-hidden", "true"); document.body.appendChild(off); }
    return ABCJS.renderAbc(off, abc)[0];
  }

  function mount(host, abc, opts) {
    opts = opts || {};
    abc = String(abc).split("\n").filter(function (l) { return !/^w:/.test(l); }).join("\n");   // the words are sung, not needed for the sound
    var I = info(abc), title = opts.title || I.title || "the song", cur = 0, gen = 0, play = null, raf = 0, tapState = null, auTimer = null;
    var v = visual(abc), timing = [], notes = [];
    function retime(q) {
      try { v.setUpAudio({}); } catch (e) {}
      timing = v.setTiming(q / (v.getBeatLength() * 4));
      notes = timing.filter(function (e) { return e.type === "event" && e.midiPitches && e.midiPitches.length; });
    }
    function qpm() { return Math.round(I.qpm * (+tempoSel.value || 1)); }
    function msWhole() { return 4 * 60000 / qpm(); }
    function firstMidi() { return notes.length ? notes[0].midiPitches[0].pitch : 60 + I.tonic; }
    function lastOnset() { return notes.length ? notes[notes.length - 1].milliseconds : 0; }
    function restMidi() {
      var last = notes.length ? notes[notes.length - 1].midiPitches[0].pitch : 60 + I.tonic;
      if (((last - I.tonic) % 12 + 12) % 12 === 0) return last;
      var f = firstMidi(), r = f - ((f - I.tonic) % 12 + 12) % 12; return f - r > 6 ? r + 12 : r;
    }
    function ctxFor() { return { tonic: I.tonic, minor: I.minor, mode: I.mode, triple: I.triple, qpm: qpm(), first: firstMidi(), chords: global.Establish && Establish.tuneChords ? Establish.tuneChords(abc, I.tonic) : null }; }

    host.innerHTML = "";
    host.classList.add("rs");
    var head = el("div", "rs-head", "<b>Rote Song: " + esc(title) + "</b> " +
      '<span class="rs-meta">' + esc(I.mode) + (I.triple ? ", triple" : ", duple") + "</span>");
    var tempoSel = el("select"); [["1", "Tempo as written"], ["0.85", "A little slower"], ["0.7", "Slower"]].forEach(function (o) { var x = el("option", null, o[1]); x.value = o[0]; tempoSel.appendChild(x); });
    var tl = el("label", "rs-tempo"); tl.appendChild(tempoSel); head.appendChild(tl);
    host.appendChild(head);
    var body = el("div", "rs-body"), list = el("ol", "rs-steps"), pane = el("div", "rs-pane");
    body.appendChild(list); body.appendChild(pane); host.appendChild(body);
    STEPS.forEach(function (s, i) {
      var li = el("li"), b = el("button", null, '<span class="rs-ph">' + s.phase + "</span> " + esc(s.title)); b.type = "button";
      b.onclick = function () { go(i); }; li.appendChild(b); list.appendChild(li);
    });
    var h = el("h4", "rs-title"), cue = el("div", "rs-cue"), say = el("p", "rs-say"), ctl = el("div", "rs-ctl"), lights = el("div", "rs-lights"), msg = el("div", "rs-msg", ""), nav = el("div", "rs-nav");
    lights.innerHTML = '<span class="rs-l rs-macro" title="macrobeats"></span><span class="rs-l rs-micro" title="microbeats"></span>';
    [h, cue, say, ctl, lights, msg, nav].forEach(function (x) { pane.appendChild(x); });
    var back = el("button", null, "← Back"), next = el("button", "rs-next", "Next →"), stopB = el("button", null, "■ Stop");
    [back, stopB, next].forEach(function (b) { b.type = "button"; nav.appendChild(b); });
    back.onclick = function () { go(cur - 1); }; next.onclick = function () { go(cur + 1); }; stopB.onclick = function () { stop(); msg.textContent = "Stopped."; };
    tempoSel.onchange = function () { stop(); retime(qpm()); };
    retime(qpm());

    function stop() {
      gen++; cancelAnimationFrame(raf); clearTimeout(auTimer); tapState = null;
      if (play && play.stop) try { play.stop(); } catch (e) {} play = null;
      if (global.Establish) Establish.stop();
      if (global.AbcPlay) AbcPlay.stop();
      lightOff(); host.classList.remove("rs-armed");
    }
    function lightOff() { [].forEach.call(lights.children, function (l) { l.classList.remove("on"); }); }
    function button(label, fn, cls) { var b = el("button", cls || null, label); b.type = "button"; b.onclick = fn; ctl.appendChild(b); return b; }

    // the song through the piano; o: { fromMs, untilMs, lights: "macro" | "micro" | "both", onStart(s), onEnd }
    function song(o) {
      o = o || {}; var me = gen;
      return new Promise(function (res) {
        play = AbcPlay.play(v, { sound: "piano", qpm: qpm(), light: false, fromMs: o.fromMs, untilMs: o.untilMs,
          onStart: function (s) { if (me !== gen) return; if (o.lights) beatLights(s, o.lights); if (o.onStart) o.onStart(s); },
          onEnd: function () { cancelAnimationFrame(raf); lightOff(); res(me === gen); } });
      });
    }
    function cueThen(method, then) {
      var me = gen;
      if (!global.Establish) return Promise.resolve(me === gen).then(function (ok) { return ok && then(); });
      return Establish.run("both", ctxFor(), { method: Establish.byId(method) }).then(function (m) { return me === gen && m ? then() : false; });
    }
    function beatLights(s, which) {
      var w = msWhole(), pick = 0, pu = 0;
      try { pu = (v.getPickupLength ? v.getPickupLength() : 0) * w; } catch (e) {}
      var big = lights.querySelector(".rs-macro"), small = lights.querySelector(".rs-micro"), M = I.macro * w, m = I.micro * w, end = s.endMs;
      (function tick() {
        var t = (s.ac.currentTime - s.t0) * 1000 - pu;
        if (t + pu > end + 100) { lightOff(); return; }
        var onM = t >= -1 && ((t % M) + M) % M < 110, onm = t >= -1 && ((t % m) + m) % m < 80;
        big.classList.toggle("on", onM && which !== "micro"); small.classList.toggle("on", onm && which !== "macro");
        raf = requestAnimationFrame(tick);
      })();
      return pick;
    }

    // ---------- the steps ----------
    var RUN = {
      tonality: function () {
        button("▶ Set the tonality", function () { stop(); var me = gen; msg.textContent = "Listen…";
          if (global.Establish) Establish.run("tonality", ctxFor(), { onPick: function (m) { msg.textContent = "Listen: " + m.name + "."; } }).then(function (m) { if (me === gen && m) msg.textContent = "That was the tonality. Ready for the song."; });
          else msg.textContent = "(Establish is not on this page.)"; });
      },
      whole: function () {
        button("▶ Play the song", function () { stop(); msg.textContent = "Listen…"; song().then(function (ok) { if (ok) msg.textContent = "That was the whole song. Again, or Next."; }); });
      },
      macro: function () { moveStep("macro"); }, micro: function () { moveStep("micro"); }, both: function () { moveStep("both"); },
      rest: function () {
        var at = 0;
        button("▶ Hear the resting tone", function () { stop(); var me = gen; msg.textContent = "Listen: the tonality, then the resting tone.";
          var c = ctxFor(); (global.Establish ? Establish.run("tonality", c, { method: Establish.byId("seq-bum") }) : Promise.resolve(1)).then(function (m) { if (me === gen && m != null) { restNote(); msg.textContent = "That is the resting tone. Sing it on BUM."; } }); });
        var go1 = button("▶ Sing until I stop", function () { stop(); at = 0; nextStop(); });
        var chk = button("Check: hear the resting tone", function () { restNote(); }); chk.disabled = true;
        var on = button("Go on ▶", function () { stop(); nextStop(); }); on.disabled = true;
        function nextStop() {
          var end = lastOnset(), cands = notes.filter(function (e) { return e.milliseconds > at + msWhole() * I.macro * 2 && e.milliseconds < end; });
          var until = cands.length ? cands[Math.floor(Math.random() * Math.min(cands.length, 6))].milliseconds : Infinity;
          msg.textContent = "Listen… when it stops, sing the resting tone on BUM.";
          var me = gen;
          song({ fromMs: at, untilMs: until }).then(function (ok) {
            if (!ok || me !== gen) return;
            chk.disabled = false;
            if (until === Infinity) { msg.textContent = "The song ended, on the resting tone. Sing it once more on BUM."; on.disabled = true; at = 0; return; }
            at = until; on.disabled = false;
            msg.innerHTML = '<span class="rs-big">● Stop! Sing the resting tone on BUM.</span>';
          });
        }
      },
      audiate: function () {
        var t0 = 0, done;
        button("▶ " + STEPS[6].cue, function () { stop(); done.disabled = true; msg.textContent = "Listen to the cue…";
          cueThen("audiate", function () { t0 = performance.now(); done.disabled = false; msg.innerHTML = '<span class="rs-big">Audiate the song now (no sound).</span>';
            auTimer = setTimeout(function () { if (t0) msg.textContent = "Still going? Press Done when the song is over in your head."; }, (lastOnset() + msWhole()) * 3); return true; }); });
        done = button("I'm done ✋", function () {
          if (!t0) return; var took = (performance.now() - t0) / 1000, len = (lastOnset() + msWhole() * I.macro) / 1000;
          clearTimeout(auTimer); done.disabled = true; t0 = 0;
          msg.textContent = "You took " + took.toFixed(1) + " s. The song lasts about " + len.toFixed(1) + " s" + (Math.abs(took - len) < len * 0.15 ? ": close, well done." : took < len ? ": a bit quick; hear every note." : ": a bit slow; keep the tempo.");
        }); done.disabled = true;
      },
      ending: function () {
        var tapB = el("button", "rs-tap", "Tap"), hearB, again;
        again = button("▶ Start", function () { start(); });
        tapB.type = "button"; tapB.disabled = true; ctl.appendChild(tapB);
        tapB.onpointerdown = function (e) { e.preventDefault(); tap(); };
        hearB = button("Hear the real ending", function () { var cut = tapState && tapState.cut; stop(); if (cut == null) return; song({ fromMs: Math.max(0, cut - msWhole() * I.macro * 2) }); }); hearB.disabled = true;
        var lastCut = null;
        function start() {
          stop(); var me = gen, end = lastOnset();
          var cands = notes.filter(function (e) { return e.milliseconds >= end * 0.75 && e.milliseconds < end - 1; });
          if (!cands.length) cands = notes.slice(-2, -1);
          var c = cands[Math.floor(Math.random() * cands.length)], cut = c ? c.milliseconds : end;
          lastCut = cut; hearB.disabled = true; tapB.disabled = false; again.textContent = "▶ Try again";
          tapState = { cut: cut, end: end, armed: false, s: null };
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          host.classList.add("rs-armed");
          msg.textContent = "Listen… and keep going in your head when the sound stops.";
          song({ untilMs: cut, onStart: function (s) { if (tapState) tapState.s = s; } }).then(function () {
            if (me !== gen || !tapState) return;
            tapState.armed = true;
            msg.innerHTML = '<span class="rs-big">Audiate! Press Space on the last note.</span>';
            auTimer = setTimeout(function () { if (tapState && tapState.armed) { result(null); } }, (end - cut) + 4000);
          });
        }
        function tap() {
          var t = tapState; if (!t || !t.s) return;
          var ms = (t.s.ac.currentTime - t.s.t0) * 1000;
          if (!t.armed) { msg.textContent = "Wait until the sound stops, then keep it going inside."; return; }
          result(ms - t.end);
        }
        function result(err) {
          var t = tapState; clearTimeout(auTimer); tapState = { cut: t ? t.cut : lastCut }; tapB.disabled = true; hearB.disabled = false; host.classList.remove("rs-armed");
          if (err == null) { msg.textContent = "No tap. The song has ended; try again and press Space on its last note."; return; }
          var beat = msWhole() * I.macro, b = err / beat, a = Math.abs(err);
          msg.innerHTML = (a < beat * 0.25 ? "🎯 Right on it" : a < beat * 0.6 ? "Close" : a < beat * 1.5 ? "About a beat " + (err < 0 ? "early" : "late") : "Off by " + Math.abs(b).toFixed(1) + " beats (" + (err < 0 ? "early" : "late") + ")") +
            ": " + (a / 1000).toFixed(2) + " s " + (err < 0 ? "early" : "late") + ' <span class="rs-meta">(' + (b >= 0 ? "+" : "") + b.toFixed(2) + " macrobeats)</span>. Hear the real ending to check.";
        }
        tapState = null;
        keyHandler = function (e) {
          if (e.code !== "Space" && e.key !== " ") return;
          if (!host.classList.contains("rs-armed")) return;
          var t = e.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
          e.preventDefault(); if (!e.repeat) tap();
        };
      },
      sing: function () {
        button("▶ " + STEPS[8].cue, function () { stop(); msg.textContent = "Listen to the cue…";
          cueThen("move-like-me", function () { msg.innerHTML = '<span class="rs-big">Sing! (by yourself)</span>'; return true; }); });
        button("Check: hear the song", function () { stop(); song(); });
      }
    };
    function moveStep(which) {
      button("▶ " + STEPS[cur].cue, function () { stop(); msg.textContent = "Listen to the cue, then move…";
        cueThen("move-like-me", function () { msg.textContent = "Move!"; return song({ lights: which }).then(function (ok) { if (ok) msg.textContent = "Again, or Next."; }); }); });
      button("▶ Song only", function () { stop(); song({ lights: which }); });
    }
    function restNote() {
      var r = restMidi(), n = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"][r % 12], o = Math.floor(r / 12) - 5;
      var name = o >= 1 ? n.toLowerCase() + Array(o).join("'") : n + Array(1 - o).join(",");
      AbcPlay.play(visual("X:1\nL:1/4\nQ:1/4=60\nK:C\n" + name + "2|]"), { sound: "piano", light: false });
      return true;
    }

    var keyHandler = null;
    function onKey(e) { if (keyHandler) keyHandler(e); }
    document.addEventListener("keydown", onKey, true);

    function go(i) {
      i = Math.max(0, Math.min(STEPS.length - 1, i)); stop(); cur = i; keyHandler = null;
      var s = STEPS[i];
      [].forEach.call(list.children, function (li, j) { li.classList.toggle("on", j === i); li.classList.toggle("done", j < i); });
      h.textContent = (i + 1) + ". " + s.title;
      cue.textContent = s.cue ? "Cue: \u201c" + s.cue + "\u201d" : ""; cue.style.display = s.cue ? "" : "none";
      say.textContent = s.say; ctl.innerHTML = ""; msg.textContent = "";
      lights.style.display = /macro|micro|both/.test(s.id) ? "" : "none";
      back.disabled = i === 0; next.disabled = i === STEPS.length - 1;
      RUN[s.id]();
    }
    go(0);
    return { stop: stop, go: go, lastOnset: lastOnset, destroy: function () { stop(); document.removeEventListener("keydown", onKey, true); host.innerHTML = ""; } };
  }

  var CSS = ".rs{border:1px solid var(--bs-border-color,#ccc);border-radius:10px;padding:.7rem .9rem;margin:.6rem 0;background:var(--bs-body-bg,#fff)}" +
    ".rs-head{display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem}.rs-meta{opacity:.7;font-size:.88em}.rs-tempo{margin-left:auto}" +
    ".rs-body{display:grid;grid-template-columns:minmax(12rem,16rem) 1fr;gap:1rem}@media (max-width:640px){.rs-body{grid-template-columns:1fr}}" +
    ".rs-steps{margin:0;padding-left:1.4rem}.rs-steps li{margin:.15rem 0}.rs-steps button{background:none;border:0;padding:.15rem .3rem;text-align:left;border-radius:5px;color:inherit;cursor:pointer;width:100%}" +
    ".rs-steps li.on button{background:var(--bs-primary-bg-subtle,#dde7f5);font-weight:600}.rs-steps li.done button{opacity:.7}" +
    ".rs-ph{display:inline-block;font-size:.7em;padding:0 .4em;border-radius:3px;background:var(--bs-secondary-bg,#eee);vertical-align:middle}" +
    ".rs-title{margin:.1rem 0 .3rem}.rs-cue{font-style:italic;margin:.2rem 0}.rs-say{margin:.3rem 0 .5rem}" +
    ".rs-ctl,.rs-nav{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.4rem 0}.rs-ctl button,.rs-nav button{padding:.3rem .8rem}.rs-nav{margin-top:.8rem;border-top:1px solid var(--bs-border-color,#ddd);padding-top:.6rem}.rs-next{margin-left:auto;font-weight:600}" +
    ".rs-msg{min-height:1.6em;font-weight:600;margin:.3rem 0}.rs-big{font-size:1.25em}" +
    ".rs-lights{display:flex;gap:1rem;align-items:center;margin:.5rem 0}.rs-l{display:inline-block;border-radius:50%;background:var(--bs-secondary-bg,#ddd);transition:background .05s}" +
    ".rs-macro{width:2.6rem;height:2.6rem}.rs-micro{width:1.3rem;height:1.3rem}.rs-l.on{background:#3a7bd5}" +
    ".rs-tap{font-size:1.2em;padding:.5rem 1.6rem!important}.rs-armed .rs-tap{outline:3px solid #3a7bd5}";
  var styled = false;
  function style() { if (styled || typeof document === "undefined") return; styled = true; var s = el("style"); s.textContent = CSS; document.head.appendChild(s); }

  function mountById(host, id, title) {
    style(); host.textContent = "Loading the song…";
    return load().then(function () {
      var t = tuneText(id); if (!t) { host.textContent = "Song not found: " + id; return null; }
      return mount(host, t, { title: title });
    }, function () { host.textContent = "The tune collection did not load."; return null; });
  }
  // the songs the MLT books name that are in the tune collection
  function bookSongs() {
    var out = [], seen = {};
    function walk(x) { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk);
      if (x.type === "tunes" && x.tunes) x.tunes.forEach(function (t) { if (t.id && !seen[t.id]) { seen[t.id] = 1; out.push(t); } });
      Object.keys(x).forEach(function (k) { if (typeof x[k] === "object") walk(x[k]); }); }
    walk(global.MLTBooks || {}); return out;
  }
  function init() {
    [].forEach.call(document.querySelectorAll(".rote-song"), function (h) {
      var id = h.dataset.tune || new URLSearchParams(location.search).get("tune");
      var box = el("div");
      if (!h.dataset.tune) {
        var songs = bookSongs(), sel = el("select"); sel.appendChild(el("option", null, "Choose a song…")).value = "";
        songs.forEach(function (t) { var o = el("option", null, esc(t.name)); o.value = t.id; sel.appendChild(o); });
        var lab = el("label", null, "Song "); lab.appendChild(sel); h.appendChild(lab); h.appendChild(box);
        var ctl = null;
        sel.onchange = function () { if (ctl) ctl.destroy(); ctl = null; if (!sel.value) return; history.replaceState(null, "", "?tune=" + encodeURIComponent(sel.value));
          mountById(box, sel.value, sel.options[sel.selectedIndex].text).then(function (c) { ctl = h.roteSong = c; }); };
        if (id) { sel.value = id; if (sel.value !== id) { var o = el("option", null, esc(id)); o.value = id; sel.appendChild(o); sel.value = id; } sel.onchange(); }
      } else { h.appendChild(box); mountById(box, id); }
    });
  }
  global.RoteSong = { mount: function (h, a, o) { style(); return mount(h, a, o); }, mountById: mountById, load: load, tuneText: tuneText, info: info, STEPS: STEPS, bookSongs: bookSongs };
  if (typeof module !== "undefined" && module.exports) module.exports = global.RoteSong;
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : globalThis);
