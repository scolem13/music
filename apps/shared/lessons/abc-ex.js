// abc-ex.js — sung exercises on lesson pages (AbcExercise). Every <div class="abc-ex"> holds ABC in a
// <script type="text/plain"> child (or a data-abc attribute) and becomes a staff with a ▶ button.
// A page-wide "Your voice" menu (#ax-voice, made here if the page has none) moves every exercise into the
// singer's range: the exercises are written for a middle voice and shift down or up by the semitones chosen.
// With data-loop="up" an exercise also gets a "Step up" button that plays it again a half step higher each
// time, the way a warm-up climbs through the range.
// With data-check an exercise also gets "Check my singing" (needs audio-check.js, pitch-detect.js, abc-core.js, abc-events.js and
// sing-check.js loaded first, else the button is left out): sound check (reused per tab), an optional four-click count-in at the
// tempo (data-bpm, else the Q: line, else 80), the microphone through PitchDetect (window.TEST_MIC_SOURCE replaces it in tests),
// then SingCheck.grade against the ABC moved into the chosen voice (and the Step up): each note right / flat / sharp / not heard.
// AbcExercise.last = { t0, bpm, notes } once a check is listening (for tests).
// A second child <script type="text/plain" data-play> is what ▶ plays instead of the drawn ABC: an ornament sign drawn, its
// realisation heard (abcjs's own reading of signs and grace notes is not the period one).
// A child <script type="text/plain" data-bend> holding JSON { bpm, sound (a BandSounds name, default "clguitar"), notes: [{ t, d
// (beats), midi, vel?, bend?: [[beat within the note, semitones], ...] }] } is played instead, through the band's samples
// (apps/shared/band/sounds.js, loaded on first use), so slides and bends are heard as slides, not steps. Your voice moves it too.
// A page that sets window.AX_NO_VOICE = true (before this script) gets no Your voice menu and draws everything as written.
// With window.AX_CAPTIONS = true the T: line is taken out of the staff and shown as a small caption above it.
// Put two examples in a <div class="ax-pair"> to set them side by side (stacked on a phone).
// Needs abcjs and soundfont.js (getSoundfontUrl). ▶ plays the band's samples (abc-play.js); data-sound picks one (default piano),
// data-bpm the tempo (else Q:, else abcjs's default). With chord symbols the band plays them with the melody (data-style, a
// BandCatalog style, default pop), and a "▶ Chords" button plays only the chords, held on the piano.
// With window.AX_PARTS = true (the Backing Track's chart habits): clicking a note or rest plays from the start of its measure
// (or jumps there while playing), and an example with more than one V: voice gets "Show" checkboxes, one per part: a hidden
// part is still heard (the full tune plays, the shown parts light up).
// A single-voice exercise (no V:, no data-play / data-bend) also gets "▶ Sing": the melody sung on solfège (solfege-sing.js, movable do,
// la-based minor), moved by Your voice and Step up. data-sing="off" on the exercise, or window.AX_NO_SING = true, leaves it out. body.ax-hide-notes hides every staff (pages add the switch).
(function (global) {
  var VOICES = [["-12", "Bass (an octave lower)"], ["-7", "Baritone / low alto"], ["-3", "Alto / tenor"], ["0", "Middle voice, as written"], ["3", "Mezzo"], ["5", "Soprano"]];
  var KEY = "abc-ex-voice";
  var shift = 0; try { if (!global.AX_NO_VOICE) shift = +(localStorage.getItem(KEY) || 0); } catch (e) {}
  var exes = [], playing = null;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ▶ plays through the band's samples (apps/shared/abc-play.js, AbcPlay, loaded on first use), lighting the notes as they sound
  var playJs = null;
  function abcPlay() {
    if (global.AbcPlay) return Promise.resolve(global.AbcPlay);
    return playJs || (playJs = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = "/apps/shared/abc-play.js?v=5"; sc.onload = function () { res(global.AbcPlay); };
      sc.onerror = function () { playJs = null; rej(); }; document.head.appendChild(sc);
    }));
  }
  function stop() { if (playing) { var p = playing; playing = null; try { p.synth.stop(); } catch (e) {} p.btn.textContent = p.label; } }
  function play(ex, extra, btn, label, fromBar) {
    var was = playing && playing.btn === btn; stop(); if (was && fromBar == null) return;
    if (ex.bend) return playBend(ex, extra, btn, label, fromBar);
    var hid = ex.fullTune && !ex.playTune;
    var me = { btn: btn, label: label, synth: { stop: function () {} } }; playing = me;
    btn.textContent = "■ Stop";
    abcPlay().then(function (AP) {
      if (playing !== me) return;
      var h = AP.play(ex.playTune || (hid ? ex.fullTune : ex.tune), { transpose: extra || 0, light: !ex.playTune, fromBar: fromBar || 0, lightTune: hid ? ex.tune : null, sound: ex.host.getAttribute("data-sound") || "piano",
        abc: ex.playTune ? ex.playAbc : ex.abc, style: ex.host.getAttribute("data-style") || "pop",
        qpm: +ex.host.getAttribute("data-bpm") || 0, onEnd: function () { if (playing === me) stop(); } });
      me.synth.stop = function () { h.stop(); };
    }).catch(function () { if (playing === me) stop(); });
  }

  // ▶ Sing: the melody on solfège syllables (apps/shared/solfege-sing.js, loaded on first use), at the pitch the staff shows
  var singJs = null;
  function singer() {
    if (global.SolfegeSing && global.AbcEvents) return Promise.resolve(global.SolfegeSing);
    return singJs || (singJs = new Promise(function (res, rej) {
      var need = [global.AbcCore ? null : "/apps/shared/abc-core.js?v=3", global.AbcEvents ? null : "/apps/shared/abc-events.js?v=4", global.SolfegeSing ? null : "/apps/shared/solfege-sing.js?v=3"].filter(Boolean);
      (function next() { if (!need.length) return res(global.SolfegeSing);
        var sc = document.createElement("script"); sc.src = need.shift(); sc.onload = next; sc.onerror = function () { singJs = null; rej(); }; document.head.appendChild(sc); })();
    }));
  }
  function sing(ex, extra, btn, label) {
    var was = playing && playing.btn === btn; stop(); if (was) return;
    var me = { btn: btn, label: label, synth: { stop: function () {} } }; playing = me;
    btn.textContent = "■ Stop";
    singer().then(function (S) {
      if (playing !== me) return;
      var bpm = +ex.host.getAttribute("data-bpm"), h = S.play(ex.abc, { transpose: shift + (extra || 0), voice: "auto", qpm: bpm || undefined,
        onEnd: function () { if (playing === me) stop(); } });
      me.synth.stop = function () { h.stop(); };
    }).catch(function () { if (playing === me) stop(); });
  }

  // Chords: only the chord symbols, held on the piano (no bass, drums or melody)
  function playChords(ex, extra, btn, label) {
    var was = playing && playing.btn === btn; stop(); if (was) return;
    var me = { btn: btn, label: label, synth: { stop: function () {} } }; playing = me;
    btn.textContent = "■ Stop";
    abcPlay().then(function (AP) {
      if (playing !== me) return;
      var h = AP.chords(ex.tune, { abc: ex.abc, transpose: extra || 0, qpm: +ex.host.getAttribute("data-bpm") || 0, onEnd: function () { if (playing === me) stop(); } });
      me.synth.stop = function () { h.stop(); };
    }).catch(function () { if (playing === me) stop(); });
  }

  function playBend(ex, extra, btn, label, fromBar) {
    var mf = ex.tune && ex.tune.getMeterFraction ? ex.tune.getMeterFraction() : { num: 4, den: 4 }, skip = (fromBar || 0) * mf.num * 4 / mf.den;
    var spec = ex.bend, sound = spec.sound || "clguitar", spb = 60 / (spec.bpm || 96), me = { btn: btn, label: label, synth: { stop: function () {} } };
    playing = me; btn.textContent = "■ Stop";
    abcPlay().then(function (AP) { return AP.ctx(); }).then(function (b) {
      me.synth.stop = function () { b.bank.stopAll(); };
      return b.ac.resume().then(function () { return b.bank.load([sound]); }).then(function () {
        if (playing !== me) return;
        var t0 = b.ac.currentTime + 0.1, end = 0, shift2 = shift + (extra || 0);
        spec.notes.forEach(function (n) {
          if (n.t < skip - 1e-3) return;
          b.bank.play(sound, { midi: n.midi + shift2, vel: n.vel == null ? 0.75 : n.vel, dur: n.d * spb,
            bend: n.bend ? n.bend.map(function (p) { return [p[0] * spb, p[1]]; }) : null }, t0 + (n.t - skip) * spb, b.out);
          end = Math.max(end, n.t - skip + n.d);
        });
        setTimeout(function () { if (playing === me) stop(); }, end * spb * 1000 + 400);
      });
    }).catch(function () { if (playing === me) stop(); });
  }

  var checking = null;
  function stopCheck() { if (checking) { var c = checking; checking = null; c.cancel(); } }
  function status(ex, msg) { ex.res.textContent = ""; ex.res.appendChild(el("p", "ax-sum", msg)); }
  function checkSing(ex, btn) {
    if (checking && checking.ex === ex) { stopCheck(); status(ex, "Stopped."); return; }
    stopCheck(); stop();
    var AC = global.AudioCheck, PD = global.PitchDetect, SC = global.SingCheck;
    status(ex, "Starting the sound check...");
    Promise.resolve(AC.ensure({ levelCheck: true })).then(function (r) {
      if (!r) { status(ex, "Sound check cancelled. Press Check my singing to try again."); return; }
      var exp = SC.expected(ex.abc, shift + (ex.step || 0)), bpm = +ex.host.getAttribute("data-bpm") || exp.bpm;
      if (!exp.notes.length) { status(ex, "Nothing to sing here."); return; }
      var A = global.AudioContext || global.webkitAudioContext, ac = new A(), frames = [], lat = AC.latencySec(r), done = false, timer = null;
      var speakers = r.output === "speakers", floor = speakers ? AC.bleedFloorDb(r, -20) : null;
      var mic = PD.mic({ ctx: ac, source: global.TEST_MIC_SOURCE, check: false, floorDb: isFinite(floor) ? floor : null,
        onFrame: function (f) { frames.push({ t: f.t - lat, hz: f.hz }); } });
      function end() { checking = null; clearTimeout(timer); btn.textContent = "🎤 Check my singing"; try { mic.stop(); } catch (e) {} try { ac.close(); } catch (e) {} }
      var me = { ex: ex, cancel: function () { done = true; end(); } };
      checking = me; btn.textContent = "■ Stop";
      mic.start().then(function () {
        if (done) return;
        var beat = 60 / bpm, count = ex.count.checked, t0 = ac.currentTime + (count ? 0.4 + 4 * beat : 1.2);
        if (count) for (var k = 0; k < 4; k++) {
          var o = ac.createOscillator(), g = ac.createGain(), t = t0 - (4 - k) * beat;
          o.frequency.value = k === 0 ? 1500 : 1000; g.gain.setValueAtTime(speakers ? 0.08 : 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
          o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.08);
        }
        global.AbcExercise.last = { t0: t0, bpm: bpm, notes: exp.notes };
        status(ex, (speakers ? "You are on speakers, so the microphone can hear the click: headphones work better. " : "") + (count ? "Count-in, then sing." : "Get ready, then sing.") + " (" + Math.round(bpm) + " beats a minute)");
        var last = exp.notes[exp.notes.length - 1].t_off * beat;
        timer = setTimeout(function () {
          if (done) return; done = true; var fr = frames.slice(); end();
          var g = SC.grade(exp.notes, fr, { bpm: bpm, t0: t0 });
          ex.res.textContent = ""; ex.res.appendChild(el("p", "ax-sum", g.summary));
          var ul = el("ul", "ax-notes");
          g.notes.forEach(function (n) {
            var name = PD.noteName(n.midi).replace(/-?\d+$/, ""), word = n.status === "missed" ? "not heard" : n.status === "right" ? "in tune" : n.status + " " + Math.abs(n.cents) + "¢";
            var li = el("li", "ax-n ax-" + n.status, (n.i + 1) + " " + name + ": " + word); li.title = "Note " + (n.i + 1) + ", written " + PD.noteName(n.midi);
            ul.appendChild(li);
          });
          ex.res.appendChild(ul);
        }, Math.max(0, (t0 + last + 0.6 - ac.currentTime) * 1000));
      }).catch(function (e) { if (checking === me) end(); status(ex, "I could not open the microphone: " + (e && e.message || e)); });
    }).catch(function (e) { status(ex, "Sound check failed: " + (e && e.message || e)); });
  }

  function draw(ex) {
    if (ex.res) { stopCheck(); ex.res.textContent = ""; }
    // Captioned pages draw every example at one fixed size (not stretched to the column), on a staff as long as it needs:
    // data-width on the host, else 260 in a pair, else 380. Examples side by side are then lined up (align).
    var o = { responsive: "resize", visualTranspose: shift, add_classes: true, paddingleft: 0, paddingright: 0 };
    if (global.AX_CAPTIONS) {
      o = { scale: 0.9, visualTranspose: shift, add_classes: true, paddingleft: 0, paddingright: 26, paddingtop: 0, paddingbottom: 0,
        staffwidth: +ex.host.getAttribute("data-width") || (ex.host.closest(".ax-pair") ? 260 : 380) };
    }
    if (global.AX_PARTS) o.clickListener = function (abcElem) {
      var s = abcElem && abcElem.abselem && abcElem.abselem.elemset && abcElem.abselem.elemset[0]; if (!s) return;
      var k = barIndex(ex.tune.setTiming(), s); if (k >= 0) play(ex, ex.step || 0, ex.playBtn, "▶ Play", k);
    };
    var hidden = (ex.parts || []).filter(function (p) { return !p.on; }).map(function (p) { return p.id; });
    ex.tune = ABCJS.renderAbc(ex.staff, hidden.length ? withoutVoices(ex.abc, hidden) : ex.abc, o)[0];
    ex.fullTune = hidden.length ? ABCJS.renderAbc(el("div"), ex.abc, { visualTranspose: shift })[0] : null;   // still heard whole
    if (global.AX_CAPTIONS) align(ex.host);
    if (ex.playAbc) ex.playTune = ABCJS.renderAbc(el("div"), ex.playAbc, { visualTranspose: shift })[0];   // drawn off-page, only heard
    ex.step = 0; if (ex.stepBtn) ex.stepBtn.textContent = "Step up ▲";
  }
  // Examples side by side (an .ax-pair, or the cells of one table row) get their top staff lines at the same height:
  // the staff of each is pushed down to the lowest one (a caption that wraps, or a sign above the staff, moves it).
  function align(host) {
    var group = host.closest(".ax-pair, tr"); if (!group) return;
    var hosts = [].slice.call(group.querySelectorAll(".abc-ex"));
    var tops = hosts.map(function (h) {
      var st = h.querySelector(".ax-staff"); if (!st) return null; st.style.marginTop = "0px";
      var line = st.querySelector(".abcjs-top-line") || st.querySelector(".abcjs-staff");
      return line ? line.getBoundingClientRect().top : null;
    });
    var max = Math.max.apply(null, tops.filter(function (t) { return t != null; }));
    hosts.forEach(function (h, i) { if (tops[i] != null) h.querySelector(".ax-staff").style.marginTop = (max - tops[i]) + "px"; });
    // and the same height, so the ▶ buttons under them line up too
    var sts = hosts.map(function (h) { var st = h.querySelector(".ax-staff"); if (st) st.style.marginBottom = "0px"; return st; });
    var bots = sts.map(function (st) { return st ? st.getBoundingClientRect().bottom : 0; }), lo = Math.max.apply(null, bots);
    sts.forEach(function (st, i) { if (st) st.style.marginBottom = (lo - bots[i]) + "px"; });
  }
  function alignAll() { document.querySelectorAll(".ax-pair, tr").forEach(function (g) { var h = g.querySelector(".abc-ex"); if (h) align(h); }); }

  // the measure a drawn note is in (repeats counted as played: abcjs marks each measure's first event), as AbcPlay.barIndex
  function barIndex(timing, svgEl) {
    var idx = -1;
    for (var i = 0; i < timing.length; i++) {
      var e = timing[i]; if (e.type !== "event") continue;
      if (e.measureStart || idx < 0) idx++;
      if ((e.elements || []).some(function (g) { return (g || []).indexOf(svgEl) >= 0; })) return idx;
    }
    return -1;
  }
  // the V: voices of a tune, in order, with a name for the Show checkboxes (from name=, else the clef and the order)
  function voicesOf(abc) {
    var out = [], seen = {};
    abc.split("\n").forEach(function (l) {
      var m = l.match(/^V:\s*(\S+)(.*)$/); if (!m || seen[m[1]]) return; seen[m[1]] = 1;
      var nm = m[2].match(/(?:name|nm)="([^"]*)"/), bass = /clef=bass/.test(m[2]), perc = /clef=perc/.test(m[2]);
      out.push({ id: m[1], name: nm ? nm[1] : null, bass: bass, perc: perc, on: true });
    });
    var trebles = out.filter(function (v) { return !v.bass && !v.perc && !v.name; });
    trebles.forEach(function (v, i) { v.name = trebles.length === 1 ? "Top" : i === 0 ? "Top" : i === trebles.length - 1 ? "Lower" : "Middle"; });
    var basses = out.filter(function (v) { return v.bass && !v.name; });
    basses.forEach(function (v, i) { v.name = basses.length > 1 ? "Bass " + (i + 1) : "Bass"; });
    out.forEach(function (v) { if (!v.name) v.name = v.perc ? "Drums" : "Part " + v.id; });
    return out;
  }
  function withoutVoices(abc, ids) {
    var cur = null;
    return abc.split("\n").filter(function (l) {
      var m = l.match(/^V:\s*(\S+)/); if (m) cur = m[1];
      return !(cur && ids.indexOf(cur) >= 0);
    }).join("\n");
  }

  function build(host) {
    var src = host.querySelector('script[type="text/plain"]:not([data-play]):not([data-bend])'), abc = (src ? src.textContent : host.getAttribute("data-abc") || "").trim();
    var pl = host.querySelector('script[type="text/plain"][data-play]');
    var bd = host.querySelector('script[type="text/plain"][data-bend]'), bend = null;
    if (bd) try { bend = JSON.parse(bd.textContent); } catch (e) {}
    var cap = "";
    if (global.AX_CAPTIONS) abc = abc.replace(/^T:(.*)\n?/m, function (m, t) { cap = t.trim(); return ""; });
    var ex = { host: host, abc: abc, playAbc: pl ? pl.textContent.trim() : "", bend: bend, staff: el("div", "ax-staff") };
    var bar = el("div", "ax-bar");
    var b = el("button", "btn btn-sm btn-outline-secondary", "▶ Play"); b.type = "button";
    b.addEventListener("click", function () { play(ex, 0, b, "▶ Play"); });
    bar.appendChild(b); ex.playBtn = b;
    if ((abc.replace(/^[A-Za-z]:.*$/mg, "").replace(/%.*$/mg, "").match(/"[^"]*"/g) || []).some(function (q) { return /^"[A-G]/.test(q); })) {   // chord symbols: a Chords button
      var cb = el("button", "btn btn-sm btn-outline-secondary ax-chords", "▶ Chords"); cb.type = "button";
      cb.title = "Just the chords, held on the piano: no bass, drums or melody";
      cb.addEventListener("click", function () { playChords(ex, ex.step || 0, cb, "▶ Chords"); });
      bar.appendChild(cb);
    }
    if (!global.AX_NO_SING && host.getAttribute("data-sing") !== "off" && !bend && !pl && !/^V:/m.test(abc) && /\n\s*[^A-Za-z%\s]*[A-Ga-g]/.test(abc)) {
      var sg = el("button", "btn btn-sm btn-outline-secondary ax-sing", "▶ Sing"); sg.type = "button";
      sg.title = "Sung on solfège syllables (movable do) by a synthesized voice, in your voice's range";
      sg.addEventListener("click", function () { sing(ex, ex.step || 0, sg, "▶ Sing"); });
      bar.appendChild(sg);
    }
    if (host.getAttribute("data-loop") === "up") {
      var up = el("button", "btn btn-sm btn-outline-secondary", "Step up ▲"); up.type = "button"; ex.stepBtn = up;
      up.addEventListener("click", function () { ex.step = (ex.step || 0) + 1; up.textContent = "Step up ▲ (+" + ex.step + ")"; stop(); play(ex, ex.step, b, "▶ Play"); });
      var down = el("button", "btn btn-sm btn-outline-secondary", "Reset"); down.type = "button";
      down.addEventListener("click", function () { ex.step = 0; up.textContent = "Step up ▲"; });
      bar.appendChild(up); bar.appendChild(down);
    }
    var canCheck = host.hasAttribute("data-check") && global.AudioCheck && global.PitchDetect && global.SingCheck && !/^V:/m.test(abc);
    if (canCheck) {
      ex.res = el("div", "ax-res"); ex.res.setAttribute("aria-live", "polite");
      var cb = el("button", "btn btn-sm btn-outline-secondary", "🎤 Check my singing"); cb.type = "button";
      cb.addEventListener("click", function () { checkSing(ex, cb); });
      var lab = el("label", "ax-count"); ex.count = document.createElement("input"); ex.count.type = "checkbox"; ex.count.checked = true;
      lab.appendChild(ex.count); lab.appendChild(document.createTextNode(" count-in click"));
      bar.appendChild(cb); bar.appendChild(lab);
    }
    if (global.AX_PARTS && !bend) {
      var vs = voicesOf(abc);
      if (vs.length > 1) {
        ex.parts = vs; var box = el("span", "ax-parts"); box.appendChild(el("span", "ax-parts-l", "Show"));
        vs.forEach(function (v) {
          var lab = el("label"), cb2 = document.createElement("input"); cb2.type = "checkbox"; cb2.checked = true;
          cb2.addEventListener("change", function () {
            v.on = cb2.checked;
            if (!vs.some(function (x) { return x.on; })) { v.on = cb2.checked = true; return; }   // one part always shows
            stop(); draw(ex); global.dispatchEvent(new Event("resize"));
          });
          lab.appendChild(cb2); lab.appendChild(document.createTextNode(" " + v.name)); box.appendChild(lab);
        });
        bar.appendChild(box);
      }
    }
    host.textContent = "";
    if (cap) host.appendChild(el("div", "ax-cap", cap));
    host.appendChild(ex.staff); host.appendChild(bar); if (ex.res) host.appendChild(ex.res);
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
    css.textContent = ".ax-count{font-size:.8rem;color:var(--site-ink-2);display:flex;align-items:center;gap:.25rem}.ax-res{margin-top:.4rem}.ax-sum{margin:.2rem 0;font-size:.9rem}" +
      ".ax-notes{list-style:none;padding:0;margin:.3rem 0;display:flex;flex-wrap:wrap;gap:.3rem}.ax-n{font-family:var(--font-mono);font-size:.75rem;padding:.1rem .45rem;border:2px solid var(--site-border);border-radius:4px}" +
      ".ax-right{border-color:#2f9e5b}.ax-flat{border-color:#3b7dd8}.ax-sharp{border-color:#d9822b}.ax-missed{border-style:dashed;color:var(--site-ink-2)}" +
      ".abc-ex{margin:.6rem 0 1.2rem;max-width:44rem}.ax-bar{display:flex;gap:.4rem;flex-wrap:wrap}.ax-bar .btn{font-family:var(--font-mono);font-size:.78rem}" +
      ".ax-voice{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:1rem 0;padding:.5rem .8rem;border:1px solid var(--site-border);border-radius:6px;background:var(--site-surface)}" +
      ".ax-voice label{font-family:var(--font-mono);font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--site-ink-2);display:flex;align-items:center;gap:.5rem}" +
      ".ax-voice select{width:auto}.ax-note{font-size:.85rem;color:var(--site-ink-2)}" +
      ".ax-cap{font-size:.85rem;color:var(--site-ink-2);margin-bottom:.1rem}" +
      ".ax-pair{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;max-width:44rem}.ax-pair .abc-ex{margin:.6rem 0 1rem;min-width:0}.abc-ex svg{max-width:100%;height:auto}" +
      ".ax-table{border-collapse:collapse;width:100%;margin:.8rem 0 1.4rem;font-size:.9rem}.ax-table th,.ax-table td{border-bottom:1px solid var(--site-border);padding:.3rem .6rem;vertical-align:top;text-align:left}" +
      ".ax-table .abc-ex{margin:0}.ax-table td.ax-n,.ax-table th.ax-n{width:1%;white-space:nowrap;padding-right:.3rem}.ax-table td:nth-child(2){min-width:8.5rem}.ax-table th{font-weight:600}" +
      ".ax-parts{display:inline-flex;flex-wrap:wrap;align-items:center;gap:.15rem .5rem;font-size:.75rem;color:var(--site-ink-2)}.ax-parts label{display:inline-flex;align-items:center;gap:.2rem;cursor:pointer}" +
      ".ax-parts-l{font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;font-size:.68rem}" +
      "body.ax-parts-on .abc-ex .abcjs-note,body.ax-parts-on .abc-ex .abcjs-rest{cursor:pointer}" +
      "body.ax-hide-notes .ax-staff,body.ax-hide-notes .ax-parts{display:none}" +
      "@media (max-width:600px){.ax-pair{grid-template-columns:1fr;gap:0}}";
    document.head.appendChild(css);
    if (!global.AX_NO_VOICE) voiceMenu();
    if (global.AX_PARTS) document.body.classList.add("ax-parts-on");
    if (global.AX_CAPTIONS) { var rt; global.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(alignAll, 150); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignAll); }
    document.querySelectorAll(".abc-ex").forEach(build);
  }
  global.AbcExercise = { init: init, list: exes };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
