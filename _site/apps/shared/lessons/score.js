// score.js — staff notation for lesson pages (LessonScore): abcjs draws it, and the note that is sounding is lit,
// whether abcjs is playing the notation itself or a page is following the band.
//
//   var score = LessonScore.engrave(host, abc, { width, fluid })     -> a score, or null without abcjs
//        width = staff width in px; fluid = drawn to the width of its box and never wider (a narrow screen shrinks it)
//   score.visual                 the abcjs tune object
//   score.mark(beat)             light what sounds at that beat, counted in quarter notes from the first note written
//                                (a pickup included); the timing is abcjs's own, so ties, rests and two voices are right
//   score.markMeasure(k)         light every note of written measure k (0 = the first; for notation that is not in time)
//   score.clear()
//   LessonScore.play(button, score, { transpose, onStart })   abcjs plays the notation (piano) and lights each note as it
//        sounds; the button becomes Stop. One score plays at a time. transpose = semitones added to the sound.
//        swing = how late the off-beat eighth is played, as abcjs counts it: 50 or unset = even, 66 = a triplet's last note
//        (the lit note keeps even time, so in a swung pair it changes a little before the second note sounds).
//   LessonScore.stop()
// A lit note carries class "ls-on" (the page colours it).

(function (global) {
  function flat(els){ var out = []; (els || []).forEach(function (g){ (g && g.length != null && !g.tagName ? Array.prototype.slice.call(g) : [g]).forEach(function (e){ if (e && e.classList) out.push(e); }); }); return out; }

  function engrave(host, abc, o){
    o = o || {}; host.textContent = ""; var A = global.ABCJS; if (!A) return null;
    var opt = { staffwidth: o.width || 600, scale: 0.95, paddingtop: 4, paddingbottom: 4, paddingleft: 4, paddingright: 4, add_classes: true };
    if (o.fluid){ opt.responsive = "resize"; host.style.display = "block"; host.style.maxWidth = ((o.width || 600) + 90) + "px"; host.style.flex = "1 1 0"; host.style.minWidth = "0"; }
    var out = A.renderAbc(host, abc, opt), visual = out && out[0]; if (!visual) return null;
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

  var cur = null;                                           // { synth, timer, score, button, label }
  function stop(){
    var c = cur; cur = null; if (!c) return;
    try { c.synth.stop(); } catch (e){} try { if (c.timer) c.timer.stop(); } catch (e){}
    c.score.clear(); c.button.textContent = c.label; c.button.classList.remove("bl-on");
  }
  function play(button, score, o){
    o = o || {}; var same = cur && cur.button === button; stop(); if (same || !score || !global.ABCJS || !global.ABCJS.synth) return;
    if (o.onStart) o.onStart();
    var A = global.ABCJS, synth = new A.synth.CreateSynth(), c = cur = { synth: synth, timer: null, score: score, button: button, label: button.textContent };
    button.textContent = "\u25a0 Stop"; button.classList.add("bl-on");
    var done = function (){ if (cur === c) stop(); };
    (global.getSoundfontUrl ? global.getSoundfontUrl() : Promise.resolve(undefined)).then(function (url){
      return synth.init({ visualObj: score.visual, options: { soundFontUrl: url, chordsOff: true, midiTranspose: o.transpose || 0, swing: score.free ? 0 : (o.swing || 0), onEnded: done } }); })
      .then(function (){ return synth.prime(); })
      .then(function (){ if (cur !== c) return;
        c.timer = new A.TimingCallbacks(score.visual, { eventCallback: function (ev){ if (cur !== c) return; if (!ev) return; score.light(flat(ev.elements)); } });
        synth.start(); c.timer.start(); })
      .catch(done);
  }

  global.LessonScore = { engrave: engrave, play: play, stop: stop };
})(typeof window !== "undefined" ? window : globalThis);
