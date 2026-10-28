// score.js — staff notation for lesson pages (LessonScore): abcjs draws it, and the note that is sounding is lit,
// whether abcjs is playing the notation itself or a page is following the band.
//
//   var score = LessonScore.engrave(host, abc, { width, fluid })     -> a score, or null without abcjs
//        width = staff width in px; fluid = drawn to the width of its box and never wider (a narrow screen shrinks it)
//        wordGap = least space between notes when there are words under them (w:): default 7, 0 = abcjs's own (none)
//   score.visual                 the abcjs tune object
//   score.mark(beat)             light what sounds at that beat, counted in quarter notes from the first note written
//                                (a pickup included); the timing is abcjs's own, so ties, rests and two voices are right
//   score.markMeasure(k)         light every note of written measure k (0 = the first; for notation that is not in time)
//   score.clear()
//   LessonScore.play(button, score, { transpose, onStart })   abcjs plays the notation (piano) and lights each note as it
//        sounds; the button becomes Stop. One score plays at a time. transpose = semitones added to the sound.
//        swing = how late the off-beat eighth is played, as abcjs counts it: 50 or unset = even, 66 = a triplet's last note
//        (the lit note keeps even time, so in a swung pair it changes a little before the second note sounds).
//   LessonScore.setSwing(ratio | null)   the listener's swing for every score (null = Auto: the o.swing a page passes to play, which
//        pages work out from BandPlayer.swingAt so that the notation swings as the band does)
//   LessonScore.stop()
// A lit note carries class "ls-on" (the page colours it).

(function (global) {
  function flat(els){ var out = []; (els || []).forEach(function (g){ (g && g.length != null && !g.tagName ? Array.prototype.slice.call(g) : [g]).forEach(function (e){ if (e && e.classList) out.push(e); }); }); return out; }

  function engrave(host, abc, o){
    o = o || {}; host.textContent = ""; var A = global.ABCJS; if (!A) return null;
    // abcjs reserves room at the left of the first system for a voice's full name ("Bass", "Dr.") and less for the
    // abbreviation on later systems, so the first line starts further in. A lesson's staves are labelled by the text
    // around them: drop the names and every line starts at the same left edge.
    abc = abc.replace(/\s(?:name|nm|subname|sname|snm)=(?:"[^"]*"|\S+)/g, "");
    // every score is fluid: drawn to its natural width, never wider than the box it is in (a narrow screen scales it down whole,
    // so nothing is cut off); padding on the left is none so the staff starts at the text's edge
    var opt = { staffwidth: o.width || 600, scale: 0.95, paddingtop: 4, paddingbottom: 4, paddingleft: 0, paddingright: 4, add_classes: true,
      responsive: "resize" };
    // abcjs makes a note under a word only as wide as the word, with no space between neighbouring words, so short labels under
    // eighth notes ("♭7" "5") touch. minPadding is abcjs's least space between notes (in its units, about px): given only to scores with words.
    if (/^w:/m.test(abc) && o.wordGap !== 0) opt.minPadding = o.wordGap || 7;
    host.style.display = "block"; host.style.maxWidth = ((o.width || 600) + 90) + "px"; host.style.flex = "1 1 0"; host.style.minWidth = "0"; host.style.overflow = "visible";
    var out = A.renderAbc(host, abc, opt), visual = out && out[0]; if (!visual) return null;
    // abcjs holds the height open with padding worked out from the width of the box AROUND the staff, which leaves a gap under
    // a staff narrower than that box. Let the drawing set its own height instead, and never grow past the size it was drawn at.
    var svg = host.querySelector("svg"), vb = svg && svg.viewBox && svg.viewBox.baseVal;
    if (vb && vb.width){ svg.style.position = "static"; svg.style.display = "block"; svg.style.width = "100%"; svg.style.height = "auto";
      host.style.paddingBottom = "0"; host.style.display = "block"; host.style.overflow = "visible"; host.style.maxWidth = Math.ceil(vb.width) + "px"; }
    var s = { host: host, visual: visual, lit: [], events: null, free: /^M:\s*none/m.test(abc) };           // free = no meter (a scale): never swung
    s.light = function (els){ if (els.length === s.lit.length && els.every(function (e, i){ return e === s.lit[i]; })) return;
      s.lit.forEach(function (e){ e.classList.remove("ls-on"); }); s.lit = els; els.forEach(function (e){ e.classList.add("ls-on"); }); };
    s.clear = function (){ s.light([]); };
    // when each note or rest starts, in quarter notes: abcjs's timing of the tune at any tempo, divided by its beat
    s.timings = function (){
      if (s.events) return s.events; s.events = [];
      try { var tc = new A.TimingCallbacks(visual, {}), per = tc.millisecondsPerBeat || 1;
        (tc.noteTimings || []).forEach(function (ev){ if (ev.type === "event" && ev.elements) s.events.push({ beat: ev.milliseconds / per, els: flat(ev.elements) }); });
      } catch (e){}
      return s.events;
    };
    s.mark = function (beat){ var evs = s.timings(), hit = null; for (var i = 0; i < evs.length; i++){ if (evs[i].beat <= beat + 0.02) hit = evs[i]; else break; } s.light(hit ? hit.els : []); };
    s.markMeasure = function (k){ s.light(k < 0 ? [] : Array.prototype.slice.call(host.querySelectorAll(".abcjs-note.abcjs-mm" + k + ", .abcjs-rest.abcjs-mm" + k))); };
    return s;
  }

  // The listener's swing (the PlayBar's Swing slot, same as BandPlayer.setSwing): a ratio 0.5..0.75, or null = Auto, which is the
  // page's own o.swing (the band's amount for the style and tempo, as a percentage). Even eighths are 0 to abcjs.
  var userSwing = null;
  function setSwing(x){ userSwing = x == null || !isFinite(+x) ? null : Math.max(0.5, Math.min(0.75, +x)); }
  function swingPercent(auto){ if (userSwing == null) return auto || 0; return userSwing <= 0.5 ? 0 : Math.round(userSwing * 100); }
  var cur = null;                                           // { synth, timer, score, button, label }
  function stop(){
    var c = cur; cur = null; if (!c) return;
    try { c.synth.stop(); } catch (e){} try { if (c.timer) c.timer.stop(); } catch (e){}
    if (global.PlayBar) global.PlayBar.sounding("lesson-score", null);
    c.score.clear(); c.button.textContent = c.label; c.button.classList.remove("bl-on");
  }
  function play(button, score, o){
    o = o || {}; var same = cur && cur.button === button; stop(); if (same || !score || !global.ABCJS || !global.ABCJS.synth) return;
    if (o.onStart) o.onStart();
    var A = global.ABCJS, synth = new A.synth.CreateSynth(), c = cur = { synth: synth, timer: null, score: score, button: button, label: button.textContent };
    button.textContent = "\u25a0 Stop"; button.classList.add("bl-on");
    if (global.PlayBar) global.PlayBar.sounding("lesson-score", stop);          // the Stop in the bottom strip stops it too
    var done = function (){ if (cur === c) stop(); };
    (global.getSoundfontUrl ? global.getSoundfontUrl() : Promise.resolve(undefined)).then(function (url){
      return synth.init({ visualObj: score.visual, options: { soundFontUrl: url, chordsOff: true, midiTranspose: o.transpose || 0, swing: score.free ? 0 : swingPercent(o.swing), onEnded: done } }); })
      .then(function (){ return synth.prime(); })
      .then(function (){ if (cur !== c) return;
        c.timer = new A.TimingCallbacks(score.visual, { eventCallback: function (ev){ if (cur !== c) return; if (!ev) return; score.light(flat(ev.elements)); } });
        synth.start(); c.timer.start(); })
      .catch(done);
  }

  global.LessonScore = { engrave: engrave, play: play, stop: stop, setSwing: setSwing, swing: function (){ return userSwing; } };
})(typeof window !== "undefined" ? window : globalThis);
