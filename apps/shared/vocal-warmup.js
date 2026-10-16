// vocal-warmup.js — the Vocal Warm-up page (tools/vocal-warmup.qmd). The Set up form builds a routine (stretches, breathing,
// piano-led patterns that climb a half step at a time, two band grooves) and the Warm up panel walks through it.
// Piano notes and chords: BandPlayer.chord on the band's sampled piano. Breathing pulses: BandPlayer.clickLoad / clickAt (the
// band's stick click). Band steps: a four-bar vamp in C (BandCatalog.styleOpts) transposed into each key as it goes round.
// Every step is { kind, title, how, est (seconds), run(tok) -> Promise }; tok.dead cancels it and every wait() inside it.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var DEG = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12, 9: 14 };
  // lo = the first root a pattern starts on, hi = the top note a warm-up reaches (comfortable, not the singer's highest)
  var VOICES = { bass: { lo: 43, hi: 62 }, baritone: { lo: 45, hi: 65 }, tenor: { lo: 48, hi: 67 },
                 alto: { lo: 53, hi: 72 }, mezzo: { lo: 55, hi: 74 }, soprano: { lo: 57, hi: 77 } };
  var BEAT = { slow: 0.62, medium: 0.5, brisk: 0.42 };
  var KEY = "vocal-warmup:settings";

  function noteName(m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- audio -------------------------------------------------------------------------------------------------
  function piano(midis, beats, vel) {
    if (!window.BandPlayer) return Promise.resolve();
    return BandPlayer.chord(midis, { inst: "piano", dur: beats * S.beat, vel: vel == null ? 0.6 : vel, roll: 0.01 }).catch(function () {});
  }
  function triad(r) { return r < 52 ? [r - 12, r + 12, r + 16, r + 19] : [r - 12, r, r + 4, r + 7]; }
  var clickCtx = null;
  function click(accent) {
    if (!window.BandPlayer) return;
    if (!clickCtx) { BandPlayer.clickLoad().then(function (c) { clickCtx = c; }).catch(function () {}); return; }
    BandPlayer.clickAt(clickCtx.currentTime + 0.02, accent);
  }

  // ---- timing: a wait that holds while paused and throws when the step is cancelled -------------------------
  var paused = false;
  function wait(tok, sec) {
    return new Promise(function (ok, no) {
      var left = sec * 1000, last = performance.now();
      (function tick() {
        if (tok.dead) return no("dead");
        var now = performance.now(); if (!paused) left -= now - last; last = now;
        if (left <= 0) return ok();
        setTimeout(tick, Math.min(40, left));
      })();
    });
  }

  // ---- what the panel shows -----------------------------------------------------------------------------------
  function live(html) { $("vw-live").innerHTML = html; }
  function cue(t) { $("vw-cue").textContent = t || ""; }
  function progress(f) { $("vw-fill").style.width = (clamp(f, 0, 1) * 100).toFixed(1) + "%"; }

  // ---- step kinds -------------------------------------------------------------------------------------------
  // A timed step with cues: [[seconds, "what to do"], ...]
  function timed(o) {
    o.est = o.cues.reduce(function (s, c) { return s + c[0]; }, 0);
    o.run = async function (tok) {
      var total = o.est, gone = 0;
      if (o.ref) await o.ref(tok);
      for (var i = 0; i < o.cues.length; i++) {
        cue(o.cues[i][1]);
        for (var s = o.cues[i][0]; s > 0; s--) {
          live('<div class="vw-big">' + s + "</div>"); progress(gone / total);
          await wait(tok, 1); gone++;
        }
      }
      progress(1);
    };
    return o;
  }
  // Paced breathing: in / hold / out counts (seconds), a ball that fills and empties
  function breath(o) {
    o.est = o.cycles * (o.in + (o.hold || 0) + o.out) + 3;
    o.run = async function (tok) {
      live('<div class="vw-ball" id="vw-ball"></div>');
      var ball = $("vw-ball"), done = 0;
      cue("Breathe out first, all the way."); await wait(tok, 3);
      for (var c = 0; c < o.cycles; c++) {
        var phases = [["in", o.in, "Breathe in (" + (o.inHow || "low and wide, through the nose") + ")", 1]];
        if (o.hold) phases.push(["hold", o.hold, "Hold, without closing the throat", 1]);
        phases.push(["out", o.out, o.outHow || "Out slowly on a hiss: sss", 0.45]);
        for (var p = 0; p < phases.length; p++) {
          var ph = phases[p];
          cue(ph[2] + "  ·  " + (c + 1) + " of " + o.cycles);
          ball.style.transitionDuration = ph[1] + "s"; ball.style.transform = "scale(" + ph[3] + ")";
          for (var s = ph[1]; s > 0; s--) { ball.textContent = s; await wait(tok, 1); done++; progress(done / (o.est - 3)); }
        }
      }
      ball.textContent = "";
    };
    return o;
  }
  // Breath pulses on the band's stick click: sets of `beats` short bursts, `rest` beats between
  function pulse(o) {
    var bs = 60 / o.bpm;
    o.est = Math.round(o.sets * (o.beats + o.rest) * bs);
    o.run = async function (tok) {
      click(); await wait(tok, 0.4);
      live(Array.from({ length: o.beats }, function () { return '<span class="vw-dot"></span>'; }).join(""));
      var dots = $("vw-live").children, n = 0, all = o.sets * (o.beats + o.rest);
      for (var s = 0; s < o.sets; s++) {
        for (var r = 0; r < o.rest; r++) { cue(r === 0 && s === 0 ? "Get ready… breathe in" : "Breathe in, let the belly go"); click(r === 0); [].forEach.call(dots, function (d) { d.classList.remove("on"); }); await wait(tok, bs); progress(++n / all); }
        for (var b = 0; b < o.beats; b++) { cue(o.say); click(b === 0); dots[b].classList.add("on"); await wait(tok, bs); progress(++n / all); }
      }
    };
    return o;
  }
  // The piano leads a pattern (degrees of the major scale) through a list of roots
  function sing(o) {
    o.d = o.d || 1; o.end = o.end || 2;
    var beats = 3 + o.degs.length * o.d - o.d + o.end + 1;
    o.keysFor = function () {
      var span = DEG[Math.max.apply(null, o.degs)], lo = S.lo + (o.lo || 0), hi = S.hi + (o.hi || 0) - span;
      var up = [], down = [];
      for (var r = lo; r <= hi && up.length < Math.ceil(o.keys * 0.7); r++) up.push(r);
      for (var t = up[up.length - 1] - 1; down.length < o.keys - up.length && t >= lo; t--) down.push(t);
      return up.concat(down);
    };
    o.est = Math.round(o.keys * beats * S.beat);
    o.run = async function (tok) {
      var keys = o.keysFor();
      for (var k = 0; k < keys.length; k++) {
        var r = keys[k], notes = o.degs.map(function (g) { return r + DEG[g]; });
        live('<div class="vw-key">Key of ' + NAMES[r % 12] + " · " + (k < keys.length - 1 && keys[k + 1] < r ? "on the way down" : "going up") + "</div>" +
          notes.map(function (m, i) { return '<span class="vw-note">' + syl(o, i) + "<small>" + noteName(m) + "</small></span>"; }).join(""));
        var cells = $("vw-live").querySelectorAll(".vw-note");
        cue(k === 0 ? "Listen to the chord, then sing with the piano" : "Breathe…");
        piano(triad(r), 2.5, 0.5);
        await wait(tok, 2 * S.beat); cue("");
        await wait(tok, S.beat);
        for (var i = 0; i < notes.length; i++) {
          var last = i === notes.length - 1, len = last ? o.end : o.d;
          [].forEach.call(cells, function (c, j) { c.classList.toggle("on", j === i); });
          piano([notes[i]], len * (o.legato ? 1.05 : 0.9), 0.65);
          await wait(tok, len * S.beat);
        }
        [].forEach.call(cells, function (c) { c.classList.remove("on"); });
        progress((k + 1) / keys.length);
        await wait(tok, S.beat);
      }
    };
    return o;
  }
  function syl(o, i) { return Array.isArray(o.syl) ? o.syl[i % o.syl.length] : (o.degs.length > 1 && o.sylNums ? o.degs[i] : o.syl); }

  // The band plays a four-bar vamp in C (style from the Backing Track catalogue); each time round it moves into the next key.
  // sungBars: what to sing in each bar, as [degree or null, beats] cells
  var player = null;
  function band(o) {
    o.est = Math.round((o.keys * 4 + 1) * 4 * (60 / o.bpm));
    o.pauseRestarts = true;
    o.run = function (tok) {
      return new Promise(function (ok, no) {
        if (!window.BandPlayer || !window.BandCatalog || !window.TuneChart) { cue("The band is not available on this page."); return ok(); }
        var start = o.from === "top" ? S.hi - 7 - 2 : S.lo + 2, step = o.from === "top" ? -1 : 1;
        var roots = Array.from({ length: o.keys }, function (_, i) { return start + i * step; });
        var tr = function (r) { return ((r % 12) + 6) % 12 - 6; };
        var so = BandCatalog.styleOpts(o.style, "piano"), parsed = TuneChart.parse("X:1\nM:4/4\nL:1/4\nK:C\n" + o.chart + " |]");
        var cells = [], barIdx = -1;
        o.sung.forEach(function (bar, b) { var beat = 0; bar.forEach(function (c) { cells.push({ deg: c[0], bar: b, beat: beat, len: c[1] }); beat += c[1]; }); });
        function draw(r) {
          live('<div class="vw-key">Key of ' + NAMES[r % 12] + "</div>" + cells.map(function (c) {
            return c.deg == null ? '<span class="vw-gap"></span>' : '<span class="vw-note">' + (o.syl || c.deg) + "<small>" + noteName(r + DEG[c.deg]) + "</small></span>";
          }).join(""));
        }
        var finished = false;
        function end() { if (finished) return; finished = true; clearInterval(watch); tok.stopBand = null; progress(1); ok(); }
        tok.stopBand = function () { if (player) player.stop(); };
        var watch = setInterval(function () { if (tok.dead) { finished = true; clearInterval(watch); if (player) player.stop(); no("dead"); } }, 60);
        if (player) player.stop();
        player = BandPlayer.create({
          parsed: parsed, tempo: o.bpm, transpose: tr(roots[0]), countIn: 1, choruses: o.keys, opts: so.opts, instruments: so.instruments,
          volumes: { bass: 0.8, comp: 0.9, drums: o.drums == null ? 0.7 : o.drums },
          onState: function (s) { if (s === "loading") cue("Loading the band…"); },
          onBar: function (info) {
            if (info.countIn) { cue("Count-in…"); draw(roots[0]); barIdx = -1; return; }
            if (info.ending || info.index < 0) { cue(""); barIdx = -1; return; }
            if (info.index === 0) { draw(roots[info.chorus] || roots[roots.length - 1]); cue(o.say); }
            barIdx = info.index;
            if (info.index === 3) { cue("Breathe"); if (roots[info.chorus + 1] != null) player.setTranspose(tr(roots[info.chorus + 1])); }
            progress((info.chorus * 4 + info.index + 1) / (o.keys * 4));
          },
          onBeat: function (info) {
            if (info.countIn) return;
            var els = $("vw-live").querySelectorAll(".vw-note, .vw-gap");
            cells.forEach(function (c, i) { if (els[i]) els[i].classList.toggle("on", c.deg != null && c.bar === barIdx && info.beat >= c.beat && info.beat < c.beat + c.len); });
          },
          onEnd: end
        });
        player.play().catch(function () { cue("The band's sounds could not be loaded."); end(); });
      });
    };
    return o;
  }

  // ---- the routine ------------------------------------------------------------------------------------------
  var S = {};
  function settings() {
    var v = function (id) { return $(id).value; }, c = function (id) { return $(id).checked; };
    var s = { voice: v("vw-voice"), length: +v("vw-length"), focus: v("vw-focus"), energy: v("vw-energy"), pace: v("vw-pace"), shift: +v("vw-shift"),
              stretch: c("vw-stretch"), breath: c("vw-breath"), band: c("vw-band"), auto: c("vw-auto") };
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function restore() {
    var s; try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!s) return;
    ["voice", "length", "focus", "energy", "pace", "shift"].forEach(function (k) { if (s[k] != null) $("vw-" + k).value = s[k]; });
    ["stretch", "breath", "band", "auto"].forEach(function (k) { if (s[k] != null) $("vw-" + k).checked = s[k]; });
  }

  function build(s) {
    var rng = VOICES[s.voice] || VOICES.mezzo, L = s.length, gentle = s.energy === "gentle", perform = s.energy === "perform";
    S = { lo: rng.lo + s.shift, hi: rng.hi + s.shift + (gentle ? -3 : perform ? 2 : 0), beat: BEAT[s.pace] * (gentle ? 1.1 : 1), auto: s.auto };
    var tier = L <= 5 ? 0 : L <= 10 ? 1 : L <= 15 ? 2 : L <= 20 ? 3 : 4;
    var keys = [4, 6, 9, 12, 16][tier], steps = [];
    var add = function (cond, st, kind) { if (cond) { st.kind = kind; steps.push(st); } };
    var pop = s.focus === "pop", classical = s.focus === "classical", choir = s.focus === "choir";

    // body
    if (s.stretch) {
      add(true, timed({ title: "Shoulders and neck", how: "Stand tall, feet under your hips, knees soft. Nothing forced: move only as far as feels easy.",
        cues: [[10, "Roll the shoulders back, slowly, five times"], [8, "Lift the shoulders to your ears… and drop them"], [10, "Ear towards the right shoulder, breathe"], [10, "Ear towards the left shoulder, breathe"], [8, "Chin down to the chest, let the head hang"]] }), "stretch");
      add(tier >= 1, timed({ title: "Side stretch and ribs", how: "Wakes up the muscles between the ribs that you breathe with.",
        cues: [[10, "Right arm up and over to the left: breathe into the right ribs"], [10, "Left arm up and over to the right: breathe into the left ribs"], [12, "Hands on your lower ribs: breathe in and feel them widen"]] }), "stretch");
      add(true, timed({ title: "Jaw and face", how: "A loose jaw and face let the sound out. Gentle pressure only.",
        cues: [[12, "Massage the jaw hinge (in front of the ears) in small circles"], [8, "Let the jaw hang open, loose, and wobble it with your hand"], [8, "Big surprised face… then scrunch everything small"], [6, "Blow the lips out like a horse"]] }), "stretch");
      add(tier >= 2, timed({ title: "Tongue", how: "The root of the tongue sits on the larynx, so a tight tongue makes a tight voice.",
        cues: [[8, "Tongue out and down towards the chin, then relax"], [8, "Tongue tip behind the bottom teeth, roll the middle forward"], [10, "Trace circles around the outside of your teeth with the tongue"]] }), "stretch");
      add(tier >= 3, timed({ title: "Shake it out", how: "Loosens everything before you sing.",
        cues: [[8, "Shake the hands, then the arms"], [8, "Shake each leg"], [8, "Bounce gently on the knees and sigh out on 'haaa'"]] }), "stretch");
    }
    // breath
    if (s.breath) {
      add(true, breath({ title: "Low breath", how: "Breathe in through the nose, low and wide (belly, sides and back move, shoulders stay down), then let it out slowly on a steady hiss.",
        cycles: tier === 0 ? 3 : 4, in: 4, hold: tier >= 2 ? 2 : 0, out: gentle ? 6 : 8 }), "breath");
      add(tier >= 1 && !gentle, pulse({ title: "Breath pulses", how: "Short pulses of air from the belly in time with the click: the belly kicks in, the throat stays open. Breathe in on the rests.",
        bpm: 92, beats: 8, rest: 4, sets: tier >= 3 ? 4 : 3, say: "'Ha' — 'tss' — 'ha' — 'tss'" }), "breath");
      add(tier >= 2, breath({ title: "Long hiss", how: "One long, even 'sss' to build steady air. Keep the ribs wide as long as you can before they fall.",
        cycles: 2, in: 4, hold: 0, out: perform ? 16 : 12, outHow: "Out on a steady 'sss', as even as you can" }), "breath");
    }
    // voice: easy, semi-occluded sounds first
    add(true, timed({ title: "Sigh and yawn", how: "Start the voice without effort. A yawn lifts the soft palate and lowers the larynx.",
      cues: [[8, "Yawn with your mouth closed"], [10, "Sigh on 'haaa' from high to low, like a relieved yawn"], [8, "And again, a little higher"]] }), "voice");
    add(true, sing({ title: "Hum", how: "Lips gently closed, teeth apart, tongue resting. Feel the buzz in your lips and nose. Easy and quiet.",
      degs: [1, 2, 3, 2, 1], syl: "mm", d: 1, end: 2, keys: keys, hi: -3, legato: true }), "voice");
    add(true, sing({ title: "Lip trill", how: "Loose lips, blow so they flutter (a horse's 'brrr'). If they won't trill, press a finger into each cheek. Can't? Hum instead.",
      degs: [1, 2, 3, 4, 5, 4, 3, 2, 1], syl: "brr", d: 0.5, end: 2, keys: keys, hi: -1, legato: true }), "voice");
    add(tier >= 1, timed({ title: "Sirens", how: "Slide on 'ng' (as in sing) or an 'oo' from the bottom of your voice to the top and back, like a siren. Smooth through the breaks; let it flip if it wants to.",
      ref: async function (tok) { cue("Your range for today: " + noteName(S.lo) + " to " + noteName(S.hi)); piano([S.lo], 1.5, 0.5); await wait(tok, 1.2); piano([S.hi], 1.5, 0.5); await wait(tok, 1.6); },
      cues: [[8, "Slide up on 'ng'… and down"], [8, "Again, a little higher"], [8, "Now on 'oo'"], [8, "Little loops in the middle"]] }), "voice");
    // open vowels
    if (classical || choir) add(true, sing({ title: "Five vowels on one note", how: "Keep the same tall space for every vowel; only the tongue and lips change. The sound should stay one line.",
      degs: [1, 1, 1, 1, 1], syl: ["mee", "meh", "mah", "moh", "moo"], d: 1, end: 2, keys: keys - 1, hi: -6, legato: true }), "voice");
    else add(true, sing({ title: "Bratty 'nay'", how: "A bright, slightly bratty 'nay' (like a whiny kid). It finds the forward, speech-like mix without pushing.",
      degs: [1, 3, 5, 3, 1], syl: "nay", d: 1, end: 2, keys: keys }), "voice");
    add(true, sing({ title: "Octave slide", how: "'Whee' up the octave, 'oo' back down. Slide between the notes; let the top be light.",
      degs: [1, 8, 1], syl: ["whee", "ee-oo", "oo"], d: 1.5, end: 2, keys: keys - 1, legato: true }), "voice");
    add(tier >= 1, sing({ title: "Arpeggio on 'ah'", how: "Keep the jaw loose and the 'ah' tall. Lighten as you go up, don't reach.",
      degs: [1, 3, 5, 8, 5, 3, 1], syl: classical ? "ah" : "yah", d: 1, end: 2, keys: keys }), "voice");
    add(tier >= 2 && (perform || pop || tier >= 3), sing({ title: "Staccato 'ha'", how: "Short, light notes, each one a little kick from the belly like the breath pulses. No pushing from the throat.",
      degs: [1, 3, 5, 8, 5, 3, 1], syl: "ha", d: 0.5, end: 1, keys: keys - 1 }), "voice");
    add(tier >= 3, sing({ title: "Nine-note scale", how: "Up the scale and down in one breath. Smooth and connected; no bumps where the voice shifts.",
      degs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1], syl: classical ? "ah" : "noo", sylNums: false, d: 0.5, end: 2, keys: keys - 2, hi: 0, legato: true }), "voice");
    add(tier >= 2 && (classical || choir || tier >= 4), sing({ title: "Swell (messa di voce)", how: "One long note: start soft, grow to full, and fade to soft again, with no change in the quality of the sound.",
      degs: [1], syl: "ah", d: 1, end: 8, keys: Math.max(3, keys - 4), lo: 3, hi: -4, legato: true }), "voice");
    add(choir && tier >= 1, sing({ title: "Tune to the chord", how: "Sing each note of the chord and hold it, listening to lock in with the piano.",
      degs: [1, 3, 5, 3, 1], syl: "noo", d: 2, end: 3, keys: Math.max(3, keys - 3), hi: -4, legato: true }), "voice");
    // band
    if (s.band && tier >= 1) add(true, band({ title: "Scale with the band", how: "The band plays a groove; sing the first five notes of the scale up and back on 'nay' each time round. It moves up a half step every four bars.",
      style: classical || choir ? "folk" : "motown", bpm: gentle ? 92 : 104, keys: Math.min(keys, 6), from: "bottom", syl: classical ? "lah" : "nay", say: "Sing!",
      chart: '"C"z4 | "G7"z4 | "C"z4 | "C"z4', sung: [[[1, 1], [2, 1], [3, 1], [4, 1]], [[5, 1], [4, 1], [3, 1], [2, 1]], [[1, 2], [null, 2]], []] }), "band");
    // finish
    if (perform) add(true, timed({ title: "Speak it, then sing it", how: "Go straight to your first song: speak its opening lines on a lively voice, then sing the first phrase lightly.",
      cues: [[15, "Speak the first lines out loud, with energy"], [15, "Sing the first phrase, lightly"], [8, "Sip of water. You're ready."]] }), "finish");
    else if (s.band) add(true, band({ title: "Cool-down hum", how: "A slow ballad: hum down five notes each time round as the key falls. Easy and quiet; feel the buzz settle.",
      style: "pop", bpm: 72, keys: tier === 0 ? 3 : 4, from: "top", syl: "mm", say: "Hum…", drums: 0.4,
      chart: '"C"z4 | "G"z4 | "C"z4 | "C"z4', sung: [[[5, 2], [4, 2]], [[3, 2], [2, 2]], [[1, 4]], []] }), "finish");
    else add(true, sing({ title: "Cool-down hum", how: "Hum down five notes, quietly, as the key falls.", degs: [5, 4, 3, 2, 1], syl: "mm", d: 1.5, end: 3, keys: 4, lo: 4, hi: -2, legato: true }), "finish");
    return steps;
  }

  // ---- the player -------------------------------------------------------------------------------------------
  var steps = [], cur = 0, tok = null, running = false;
  var KIND = { stretch: "Stretch", breath: "Breathing", voice: "Voice", band: "With the band", finish: "Finish" };
  function mins(sec) { return sec < 60 ? Math.round(sec) + " s" : (sec / 60).toFixed(sec < 600 ? 1 : 0).replace(/\.0$/, "") + " min"; }

  function show(i) {
    cur = clamp(i, 0, steps.length - 1);
    var st = steps[cur];
    $("vw-count").textContent = "Step " + (cur + 1) + " of " + steps.length;
    $("vw-kind").textContent = KIND[st.kind] || "";
    $("vw-title").textContent = st.title;
    $("vw-how").textContent = st.how;
    $("vw-upnext").textContent = steps[cur + 1] ? "Next: " + steps[cur + 1].title : "Last step";
    live(""); cue(""); progress(0);
    [].forEach.call($("vw-list").children, function (li, j) { li.classList.toggle("now", j === cur); li.classList.toggle("done", j < cur); });
    $("vw-back").disabled = cur === 0; $("vw-next").disabled = false; $("vw-again").disabled = false; $("vw-play").disabled = false;
  }
  function buttons() { $("vw-play").textContent = !running ? "▶ Start" : paused ? "▶ Resume" : "⏸ Pause"; }
  function cancel() { if (tok) { tok.dead = true; if (tok.stopBand) tok.stopBand(); } tok = null; running = false; paused = false; buttons(); }

  async function start(i) {
    cancel(); show(i);
    var t = tok = { dead: false }; running = true; buttons();
    try {
      await steps[cur].run(t);
      if (t.dead) return;
      if (cur >= steps.length - 1) { running = false; buttons(); cue("All done. Nice work — go sing!"); $("vw-play").textContent = "▶ Start again"; $("vw-play").onclickRestart = true; return; }
      if (!S.auto) { running = false; buttons(); cue("Done. Press ▶ for the next step."); show(cur + 1); return; }
      for (var s = 4; s > 0; s--) { $("vw-upnext").textContent = "Next: " + steps[cur + 1].title + " in " + s + "…"; await wait(t, 1); }
      if (!t.dead) start(cur + 1);
    } catch (e) { if (e !== "dead") { console.error(e); cue("Something went wrong in this step."); running = false; buttons(); } }
  }

  function list() {
    var ol = $("vw-list"); ol.innerHTML = "";
    steps.forEach(function (st, i) {
      var li = document.createElement("li");
      li.innerHTML = st.title + '<span class="vw-tag">' + (KIND[st.kind] || "") + '</span><span class="vw-min">' + mins(st.est) + "</span>";
      li.onclick = function () { var was = running; cancel(); if (was) start(i); else show(i); document.querySelector("#warm-up").scrollIntoView({ behavior: "smooth" }); openSection("warm-up"); };
      ol.appendChild(li);
    });
  }
  function openSection(id) { var s = document.getElementById(id); if (s && s.classList.contains("ls-shut")) { var h = s.querySelector("h2"); if (h) h.click(); } }

  function doBuild(jump) {
    cancel();
    var s = settings(); steps = build(s); list(); show(0); buttons();
    var tot = steps.reduce(function (a, st) { return a + st.est; }, 0);
    $("vw-summary").textContent = steps.length + " steps, about " + Math.round(tot / 60) + " minutes · range " + noteName(S.lo) + "–" + noteName(S.hi);
    if (jump) { openSection("warm-up"); document.querySelector("#warm-up").scrollIntoView({ behavior: "smooth" }); }
  }

  function init() {
    restore();
    $("vw-build").onclick = function () { doBuild(true); };
    $("vw-play").onclick = function () {
      if (!steps.length) doBuild(false);
      if (!running) { start($("vw-play").onclickRestart ? 0 : cur); $("vw-play").onclickRestart = false; return; }
      if (steps[cur].pauseRestarts && !paused) { cancel(); cue("Stopped. Press ▶ to play this step again."); return; }
      paused = !paused; buttons();
    };
    $("vw-next").onclick = function () { if (cur < steps.length - 1) { var was = running; cancel(); was ? start(cur + 1) : show(cur + 1); } };
    $("vw-back").onclick = function () { var was = running; cancel(); was ? start(cur - 1) : show(cur - 1); };
    $("vw-again").onclick = function () { start(cur); };
    document.addEventListener("keydown", function (e) {
      if (e.target.closest && e.target.closest("input,select,textarea")) return;
      if (e.code === "Space" && steps.length) { e.preventDefault(); $("vw-play").click(); }
      else if (e.key === "ArrowRight") $("vw-next").click();
      else if (e.key === "ArrowLeft" && !$("vw-back").disabled) $("vw-back").click();
    });
    doBuild(false);
    window.VocalWarmup = { steps: function () { return steps; }, start: start, cancel: cancel, settings: function () { return S; } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
