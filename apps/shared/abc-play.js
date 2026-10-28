// abc-play.js — play an abcjs tune through the band's samples (AbcPlay), with the sounding notes lit on the drawn score.
// abcjs draws and times the tune; the band's sample bank (apps/shared/band/sounds.js, loaded here on first use) makes the
// sound, scheduled on the audio clock from abcjs's own timing, and the lit notes come from that same schedule, so sound and
// cursor can't drift apart (the Classical Themes way). Use it in place of ABCJS.synth on any page.
//
//   var h = AbcPlay.play(visualObj, opts) -> { stop(), done: Promise }      (one tune at a time: a new play stops the last)
//   opts.sound      a BandSounds name (default "piano"; "clguitar", "epiano", "organ", ...: BandSounds.sounds(family))
//   opts.qpm        quarter notes a minute; omitted: the tune's Q:, else opts.defaultQpm, else abcjs's default
//   opts.transpose  semitones added to every note (heard only; draw with visualTranspose for the eye)
//   opts.light      true (default) lights each note as it sounds with the class opts.litClass ("abc-on"; styled here);
//                   only for a tune drawn on the page (an off-page tune has nothing to light)
//   opts.onEnd      called once when it ends or is stopped
//   opts.fromBar    start at this measure (0 = the first full measure or the pickup; counted in played order, repeats included)
//   opts.lightTune  another drawn visualObj with the same bars (the score with some parts hidden): its notes are lit instead
//   AbcPlay.barStartMs(timing, k) -> ms where measure k starts in a setTiming() list (AbcPlay.barIndex(timing, svgEl) the reverse)
//   AbcPlay.stop()  stops whatever is playing;  AbcPlay.playing() -> the handle or null
//   AbcPlay.ctx()   -> Promise of { ac, bank } (the shared AudioContext, registered with AudioTap, and its bank)
//
// Grace notes are played ON the beat, taking their time from the main note (C.P.E. Bach; Türk), a little softer.
// Note volumes (dynamics) come from abcjs. Ornament signs (trill, prall, mordent, turn) are played out by ornament-play.js
// (OrnamentPlay, loaded here): the composer (opts.composer, else the C: line) or opts.era ("old" / "new") picks the period reading;
// opts.ornaments = false plays the notes plain.
// CHORD SYMBOLS: with opts.abc (the tune's text) holding chord symbols, the band plays (BandPlayer, its scripts loaded on first use):
// the chords in opts.style (a BandCatalog style id, default "pop", piano comping) AND the melody (bar.melody on the parsed chart,
// as the Notation page does), one clock, the cursor from its onBar / onBeat. A pickup is sounded in one bar of count-in.
//   AbcPlay.chords(visualObj, { abc, qpm, transpose, onEnd }) -> handle: only the chords, held on the piano (rhythm "pad"),
//       no bass, no drums, no melody.   AbcPlay.hasChords(abc) -> true when the text has chord symbols.
//   opts.drums = false   the band without drums;  opts.bandOpts  extra BandPlayer options merged over the style's (e.g. { voicing });
//   opts.melody = false  the chords alone (the tune's notes are drawn but not played).
// If the samples can't load within 12 s, abcjs's own synth plays instead (same tune, same cursor).
(function (global) {
  var SOUNDS = "/apps/shared/band/sounds.js?v=17", shared = null, cur = null, styled = false;

  function ctx() {
    if (shared) return shared;
    shared = new Promise(function (res, rej) {
      if (global.BandSounds) return res();
      var sc = document.createElement("script"); sc.src = SOUNDS; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
    }).then(loadOrn).then(function () {
      var ac = new (global.AudioContext || global.webkitAudioContext)(), out = ac.createGain();
      out.connect(ac.destination);
      if (global.AudioTap) try { global.AudioTap.register(ac, out, "Score playback"); } catch (e) {}
      return { ac: ac, out: out, bank: global.BandSounds.create(ac) };
    });
    shared.catch(function () { shared = null; });
    return shared;
  }

  // ornament signs played out (apps/shared/ornament-play.js); without it the notes play plain
  var ORN = "/apps/shared/ornament-play.js?v=1", ornP = null;
  function loadOrn() {
    if (global.OrnamentPlay) return Promise.resolve();
    return ornP || (ornP = new Promise(function (res) {
      var sc = document.createElement("script"); sc.src = ORN; sc.onload = res; sc.onerror = function () { res(); }; document.head.appendChild(sc);
    }));
  }
  function ornOf(v, opts, secPerWhole) {
    if (!global.OrnamentPlay || opts.ornaments === false) return null;
    var c = opts.composer;
    if (c == null) try { c = (v.metaText && v.metaText.composer) || ""; } catch (e) { c = ""; }
    try { return global.OrnamentPlay.prepare(v, { era: opts.era, composer: c, year: opts.year, secPer32: secPerWhole ? secPerWhole / 32 : null }); } catch (e) { return null; }
  }

  function style() {
    if (styled) return; styled = true;
    var s = document.createElement("style");
    s.textContent = "svg .abc-on, svg .abc-on path { fill: var(--abc-on, #d0342c); stroke: none; }";
    document.head.appendChild(s);
  }

  function qpmOf(v, opts) {
    if (opts.qpm) return opts.qpm;
    var t = v.metaText && v.metaText.tempo;
    if (t && t.bpm) return t.bpm * (t.duration && t.duration[0] ? t.duration[0] * 4 : 1);
    return opts.defaultQpm || null;
  }

  function stop() { if (cur) cur.stop(); }

  // ---- the band (chord symbols) ----
  var BAND_JS = ["/apps/shared/abc-transpose.js?v=4", "/apps/shared/tune-chart.js?v=31", "/apps/tune-assessment/abc-tune.js?v=3", "/apps/shared/voicings.js?v=5",
    "/apps/shared/band/harmony.js?v=34", "/apps/shared/band/bass.js?v=16", "/apps/shared/band/comp.js?v=32", "/apps/shared/band/catalog.js?v=37",
    "/apps/shared/band/drums.js?v=17", "/apps/shared/band/congas.js?v=3", SOUNDS, "/apps/shared/band/player.js?v=125"], bandJs = null;
  function loadBand() {
    if (global.BandPlayer && global.BandCatalog && global.TuneChart && global.BandHarmony) return Promise.resolve();
    return bandJs || (bandJs = BAND_JS.reduce(function (pr, src) {
      return pr.then(function () { return new Promise(function (ok, no) { var e = document.createElement("script"); e.src = src; e.onload = ok; e.onerror = no; document.head.appendChild(e); }); });
    }, Promise.resolve()).catch(function (e) { bandJs = null; throw e; }));
  }
  function hasChords(abc) {                                   // a quoted string that is not an annotation (^ _ < > @)
    var m = String(abc || "").replace(/^[A-Za-z]:.*$/mg, "").replace(/%.*$/mg, "").match(/"[^"]*"/g) || [];
    return m.some(function (q) { return /^"[A-G]/.test(q); });
  }

  // abcjs's played bars (repeats expanded), each { ms, len, events } with the events' times inside it
  function playedBars(v, q) {
    try { v.setUpAudio({}); } catch (e) {}
    var all = q ? v.setTiming(q / (v.getBeatLength() * 4)) : v.setTiming(), msBar = v.millisecondsPerMeasure ? v.millisecondsPerMeasure() : 2000;
    var bars = [], b = { ms: 0, events: [] };
    all.forEach(function (e) {
      if (e.type === "bar") { if (b.events.length || bars.length) { bars.push(b); } b = { ms: e.milliseconds, events: [] }; }
      else if (e.type === "event" && (e.midiPitches || e.midiGraceNotePitches)) b.events.push(e);
    });
    if (b.events.length) bars.push(b);
    bars.forEach(function (x, i) { x.len = i + 1 < bars.length ? bars[i + 1].ms - x.ms : msBar; });
    return { bars: bars, msBar: msBar };
  }

  function band(v, opts, me, chordsOnly) {
    var tr = opts.transpose || 0;
    return loadBand().then(loadOrn).then(function () {
      var parsed = TuneChart.parse(opts.abc), H = global.BandHarmony, form = H.buildForm(parsed, 0).filter(function (b) { return b && b.beats > 0; });
      if (!form.length) throw new Error("no bars");
      var pb = playedBars(v, qpmOf(v, opts)), bars = pb.bars, pick = parsed.bars[0] && parsed.bars[0].anacrusis && bars[0] && bars[0].len < pb.msBar * 0.98;
      var beats0 = form[0].beats, bpm = beats0 * 60000 / pb.msBar, lists = [];   // the player's beat, from abcjs's bar
      // melody: the k-th played bar is the k-th form bar (the pickup, if any, comes first and goes in the count-in)
      // an event's notes in beats of its bar; abcjs lengths are in whole notes (a whole note = D/N of a bar); graces on the beat
      var orn = ornOf(v, opts, pb.msBar / 1000 * (parsed.meterD || 4) / (parsed.meterN || 4));
      var wn = function (beats) { return beats * (parsed.meterD || 4) / (parsed.meterN || 4); };
      var evPos = function (e, x, beats, off) {
        var out = [], at = (e.milliseconds - x.ms) / pb.msBar * beats + off, took = 0;
        (e.midiGraceNotePitches || []).forEach(function (g) { var d = (g.durationInMeasures || 0) * wn(beats); if (d > 0) { out.push({ pos: at + took, dur: d, midi: g.pitch }); took += d; } });
        (e.midiPitches || []).forEach(function (m) {   // (the band transposes the melody); ornaments worked out in seconds
          var d = m.duration * wn(beats), spb = pb.msBar / 1000 / beats;
          (orn ? orn.notes(m, (at + took) * spb, d * spb, e) : [{ at: (at + took) * spb, dur: d * spb, midi: m.pitch }])
            .forEach(function (n) { out.push({ pos: n.at / spb, dur: n.dur / spb, midi: n.midi }); });
        });
        return out;
      };
      var k0 = pick ? 1 : 0;
      if (!chordsOnly) {
        if (pick) {
          var off = beats0 - bars[0].len / pb.msBar * beats0, mel0 = [];
          bars[0].events.forEach(function (e) { mel0 = mel0.concat(evPos(e, bars[0], beats0, off)); });
          parsed.bars[0].melody = mel0;
        }
        for (var k = k0; k < bars.length && k - k0 < form.length; k++) {
          var f = form[k - k0], tgt = parsed.bars[f.src], mel = [];
          bars[k].events.forEach(function (e) { mel = mel.concat(evPos(e, bars[k], f.beats, 0)); });
          if (tgt && !tgt.melody) tgt.melody = mel;
        }
      }
      // the cursor: each played bar's events with their beat positions, by form index (-1 = the pickup in the count-in)
      bars.forEach(function (x, k) {
        var fi = k - k0, beats = fi >= 0 && form[fi] ? form[fi].beats : beats0, off = fi < 0 ? beats0 - x.len / pb.msBar * beats0 : 0;
        lists[fi + 1] = x.events.map(function (e) { return { pos: (e.milliseconds - x.ms) / pb.msBar * beats + off, end: (e.milliseconds - x.ms) / pb.msBar * beats + off + 0.001, el: e.elements }; });
        lists[fi + 1].forEach(function (n, i, a) { n.end = i + 1 < a.length ? a[i + 1].pos : beats; });
      });
      var so = BandCatalog.styleOpts(opts.style || "pop", "piano"), o = Object.assign({}, so.opts, { melodyLevel: 0.85 }), vol = { bass: 0.8, comp: 0.85, drums: 0.6 };
      if (opts.bandOpts) o = Object.assign(o, opts.bandOpts);
      if (opts.drums === false) { o = Object.assign(o, { groove: "none", fills: "none" }); vol.drums = 0; }
      if (opts.melody === false) o.melody = false;
      if (chordsOnly) { o = Object.assign(o, { compRhythm: "pad", groove: "none", melody: false, fills: "none" }); vol = { bass: 0, comp: 1, drums: 0 }; }
      var at = null, done = false;
      var fb = Math.max(0, (opts.fromBar | 0) - k0);
      var p = BandPlayer.create({ parsed: parsed, tempo: bpm, transpose: tr, countIn: (pick && !chordsOnly && !fb) ? 1 : 0, choruses: 1, opts: o,
        instruments: chordsOnly ? [so.opts.compSound || "piano"] : so.instruments, volumes: vol, humanize: chordsOnly ? 0 : 0.5,
        onBar: function (info) { at = { idx: info.countIn ? -1 : info.index, beat: 0, t: performance.now() }; },
        onBeat: function (info) { if (at) { at.beat = info.beat; at.t = performance.now(); } },
        onEnd: function () { done = true; } });
      me._band = p; if (fb) p.setStartBar(fb);
      return p.play().then(function () { return { p: p, lists: lists, bpm: bpm, at: function () { return at; }, done: function () { return done; } }; });
    });
  }

  function bandCursor(me, b, light, lit, unlight, on, end) {
    (function tick() {
      if (me._ended) return;
      if (b.done()) { end(); return; }
      var a = b.at();
      if (light && a) {
        var beat = a.beat + (performance.now() - a.t) / 1000 * b.bpm / 60, list = b.lists[a.idx + 1] || [], hit = null;
        list.forEach(function (n) { if (beat >= n.pos - 1e-3 && beat < n.end) hit = n; });
        if (hit !== me._hit) {
          me._hit = hit; unlight();
          if (hit) (hit.el || []).forEach(function (g) { (g || []).forEach(function (n) { if (n && n.classList) { n.classList.add(lit); on.push(n); } }); });
        }
      }
      me._raf = requestAnimationFrame(tick);
    })();
  }
  function playBand(v, opts, chordsOnly) {
    opts = opts || {}; stop();
    var lit = opts.litClass || "abc-on", light = opts.light !== false && !chordsOnly && !opts.lightTune, on = [], resolveDone;
    var me = { done: new Promise(function (r) { resolveDone = r; }), _ended: false };
    function unlight() { on.forEach(function (n) { n.classList.remove(lit); }); on.length = 0; }
    function end() {
      if (me._ended) return; me._ended = true; cancelAnimationFrame(me._raf); unlight();
      if (me._band) try { me._band.stop(); } catch (e) {}
      if (cur === me) cur = null;
      if (opts.onEnd) try { opts.onEnd(); } catch (e) {}
      resolveDone();
    }
    me.stop = end; cur = me;
    if (light) style();
    band(v, opts, me, chordsOnly).then(function (b) { if (me._ended) { b.p.stop(); return; } bandCursor(me, b, light, lit, unlight, on, end); })
      .catch(function (err) {
        if (global.console) console.warn("AbcPlay: the band could not play this tune:", err && err.message || err);
        if (me._ended) return;
        if (chordsOnly || opts.melody === false) { end(); return; }   // nothing of the tune itself to fall back on
        cur = null; var h = play(v, Object.assign({}, opts, { abc: null })); me.stop = function () { h.stop(); end(); };   // no band: the melody alone
      });
    return me;
  }

  function play(v, opts) {
    opts = opts || {};
    if (opts.abc && opts.band !== false && hasChords(opts.abc)) return playBand(v, opts, false);
    stop();
    var sound = opts.sound || "piano", lit = opts.litClass || "abc-on", light = opts.light !== false, raf = 0, ended = false, fallback = null;
    var resolveDone, me = { done: new Promise(function (r) { resolveDone = r; }) };
    var on = [];
    function unlight() { on.forEach(function (n) { n.classList.remove(lit); }); on = []; }
    function end() {
      if (ended) return; ended = true; cancelAnimationFrame(raf); unlight();
      if (cur === me) cur = null;
      if (opts.onEnd) try { opts.onEnd(); } catch (e) {}
      resolveDone();
    }
    me.stop = function () {
      if (ended) return;
      if (fallback) try { fallback.stop(); } catch (e) {}
      if (shared) shared.then(function (s) { s.bank.stopAll(); }, function () {});
      end();
    };
    cur = me;
    if (light) style();

    try { v.setUpAudio({}); } catch (e) {}                    // fills each event's midiPitches (no sound)
    var q = qpmOf(v, opts), timing = q ? v.setTiming(q / (v.getBeatLength() * 4)) : v.setTiming();
    var from = opts.fromBar > 0 ? barStartMs(timing, opts.fromBar) : 0;
    var events = timing.filter(function (e) { return e.type === "event" && (e.midiPitches || e.midiGraceNotePitches) && e.milliseconds >= from - 1; })
      .map(function (e) { return Object.assign({}, e, { milliseconds: e.milliseconds - from }); });
    var lights = events;
    if (opts.lightTune && light) {
      var lq = qpmOf(opts.lightTune, opts), lt = lq ? opts.lightTune.setTiming(lq / (opts.lightTune.getBeatLength() * 4)) : opts.lightTune.setTiming();
      var lf = opts.fromBar > 0 ? barStartMs(lt, opts.fromBar) : 0;
      lights = lt.filter(function (e) { return e.type === "event" && e.milliseconds >= lf - 1; })
        .map(function (e) { return Object.assign({}, e, { milliseconds: e.milliseconds - lf }); });
    }
    if (!events.length) { end(); return me; }
    var mf = v.getMeterFraction ? v.getMeterFraction() : { num: 4, den: 4 }, msBar = v.millisecondsPerMeasure ? v.millisecondsPerMeasure() : 2000;
    var secPerWhole = msBar / 1000 / ((mf.num || 4) / (mf.den || 4)), tr = opts.transpose || 0;

    function cursor(ac, t0, endMs) {
      var i = -1;
      (function tick() {
        if (ended) return;
        var now = (ac.currentTime - t0) * 1000;
        if (light && i + 1 < lights.length && lights[i + 1].milliseconds <= now) {
          while (i + 1 < lights.length && lights[i + 1].milliseconds <= now) i++;
          unlight();
          (lights[i].elements || []).forEach(function (g) { (g || []).forEach(function (n) { if (n && n.classList) { n.classList.add(lit); on.push(n); } }); });
        }
        if (now > endMs + 150) { end(); return; }
        raf = requestAnimationFrame(tick);
      })();
    }

    var timer = new Promise(function (res, rej) { setTimeout(function () { rej(new Error("samples timed out")); }, 12000); });
    Promise.race([ctx().then(function (s) { return s.ac.resume().then(function () { return s.bank.load([sound]); }).then(function () { return s; }); }), timer])
      .then(function (s) {
        if (ended) return;
        var ac = s.ac, t0 = ac.currentTime + 0.12, endMs = 0;
        var orn = ornOf(v, opts, secPerWhole);
        events.forEach(function (e) {
          var at = t0 + e.milliseconds / 1000, took = 0;
          (e.midiGraceNotePitches || []).forEach(function (g) {
            var d = (g.durationInMeasures || 0) * secPerWhole; if (!(d > 0)) return;
            s.bank.play(sound, { midi: g.pitch + tr, vel: 0.55, dur: d * 0.95 }, at + took, s.out); took += d;
          });
          (e.midiPitches || []).forEach(function (m) {
            var dur = m.duration * secPerWhole, vel = m.volume ? Math.min(1, m.volume / 127 * 0.9) : 0.7;
            (orn ? orn.notes(m, at + took, dur, e) : [{ at: at + took, dur: dur, midi: m.pitch, vel: 1 }]).forEach(function (n) {
              s.bank.play(sound, { midi: n.midi + tr, vel: vel * n.vel, dur: n.dur * 0.95 }, n.at, s.out);
            });
            endMs = Math.max(endMs, e.milliseconds + (took + dur) * 1000);
          });
        });
        endMs = Math.max(endMs, events[events.length - 1].milliseconds);
        cursor(ac, t0, endMs);
      })
      .catch(function () {                                    // no samples: abcjs's own synth, same cursor
        if (ended || !global.ABCJS || !ABCJS.synth || !ABCJS.synth.supportsAudio()) { end(); return; }
        var ac = new (global.AudioContext || global.webkitAudioContext)(), sy = new ABCJS.synth.CreateSynth(); fallback = sy;
        var o = { audioContext: ac, visualObj: v, options: { midiTranspose: tr, program: 0, chordsOff: true } };
        Promise.resolve(global.getSoundfontUrl ? global.getSoundfontUrl() : null).then(function (u) { if (u) o.options.soundFontUrl = u; return sy.init(o); })
          .then(function () { return sy.prime(); })
          .then(function (r) { if (ended) return; sy.start(); cursor(ac, ac.currentTime, r.duration * 1000); })
          .catch(end);
      });
    return me;
  }

  // measures in a setTiming() list: abcjs marks the first event of each measure (measureStart), repeats included
  function barStartMs(timing, k) {
    var idx = -1;
    for (var i = 0; i < timing.length; i++) {
      var e = timing[i]; if (e.type !== "event") continue;
      if (e.measureStart || idx < 0) { idx++; if (idx === k) return e.milliseconds; }
    }
    return 0;
  }
  function barIndex(timing, svgEl) {
    var idx = -1;
    for (var i = 0; i < timing.length; i++) {
      var e = timing[i]; if (e.type !== "event") continue;
      if (e.measureStart || idx < 0) idx++;
      if ((e.elements || []).some(function (g) { return (g || []).indexOf(svgEl) >= 0; })) return idx;
    }
    return -1;
  }

  // the Stop in a page's bottom strip (PlayBar) is lit while a tune plays and stops it
  function tracked(h) {
    var P = global.PlayBar; if (!P || !h) return h;
    P.sounding("abc-play", stop);
    if (h.done) h.done.then(function () { if (!cur) P.sounding("abc-play", null); });
    return h;
  }
  global.AbcPlay = { barStartMs: barStartMs, barIndex: barIndex, play: function (v, o) { return tracked(play(v, o)); }, chords: function (v, o) { return tracked(playBand(v, o, true)); }, hasChords: hasChords, stop: stop, ctx: ctx, playing: function () { return cur; } };
})(window);
