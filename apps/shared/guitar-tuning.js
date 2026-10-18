// guitar-tuning.js — the Guitar Tuning page (tools/guitar-tuning.qmd). The ear does the tuning; the page gives it something to
// listen to and, when asked, a microphone reading to check it against.
//
// Methods (METHODS below), each a list of steps; a step names the string being tuned, what to play on the guitar (marks on the
// fretboard: fretted dots and harmonic diamonds) and what the page can sound as a model:
//   ear        the page plucks each open string's pitch; match it
//   drone      a held drone on the string's own note; tune until the beating stops
//   fifth      the 5th-fret (4th on G) relative method, from the low string up
//   harmonics  5th / 7th fret harmonics (pure fourths, ~2 cents narrow each), B and high E from low E's harmonics
//   octaves    octave shapes across the strings: a check that catches what the others let through
//   tuner      the microphone, ear first: guess flat / in tune / sharp before the reading shows
// The microphone ("Listening") works with every method; "Ear first" hides the reading until you guess.
// Sound: Karplus-Strong plucks, sine-ish harmonics, a drone from a PeriodicWave; registered with AudioTap.
(function (global) {
  var PD = global.PitchDetect;
  var TUNINGS = {
    standard: { label: "Standard (E A D G B E)", notes: [40, 45, 50, 55, 59, 64] },
    halfdown: { label: "Half step down (E♭ A♭ D♭ G♭ B♭ E♭)", notes: [39, 44, 49, 54, 58, 63] },
    dropd: { label: "Drop D (D A D G B E)", notes: [38, 45, 50, 55, 59, 64] },
    openg: { label: "Open G (D G D G B D)", notes: [38, 43, 50, 55, 59, 62] },
    opend: { label: "Open D (D A D F♯ A D)", notes: [38, 45, 50, 54, 57, 62] },
    dadgad: { label: "DADGAD", notes: [38, 45, 50, 55, 57, 62] },
    custom: { label: "Custom…", notes: [40, 45, 50, 55, 59, 64] }
  };
  // "D A D G A D", low string first: each name is placed at the nearest pitch to standard tuning's string (so a low string can go
  // down to C or up to F♯ and a high one stays high). Octaves can be forced with a number: "C2 G2 C3 G3 C4 E4".
  var PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, STD = [40, 45, 50, 55, 59, 64];
  function parseTuning(txt) {
    var w = String(txt || "").replace(/♯/g, "#").replace(/♭/g, "b").trim().split(/[\s,]+/).filter(Boolean);
    if (w.length !== 6) return null;
    var out = [];
    for (var i = 0; i < 6; i++) {
      var m = /^([A-Ga-g])([#b]?)(-?\d)?$/.exec(w[i]); if (!m) return null;
      var pc = PCS[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
      if (m[3] != null) out.push(12 * (+m[3] + 1) + pc);
      else { var best = null; for (var o = 1; o <= 5; o++) { var n = 12 * (o + 1) + pc; if (best == null || Math.abs(n - STD[i]) < Math.abs(best - STD[i])) best = n; } out.push(best); }
    }
    for (i = 0; i < 6; i++) if (Math.abs(out[i] - STD[i]) > 7) return { notes: out, warn: "String " + (6 - i) + " is more than a fifth from its usual pitch: it may be floppy or snap. Strings are made for a range; ask about a different gauge." };
    return { notes: out };
  }
  // strings are indexed 0 = low (6th string) .. 5 = high (1st string)
  var SNUM = function (i) { return 6 - i; };
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function nn(m) { return NAMES[((m % 12) + 12) % 12]; }
  function nno(m) { return nn(m) + (Math.floor(m / 12) - 1); }
  var S = { tuning: "standard", method: "ear", step: 0, a4: 440, earFirst: true, listening: false, drone: false, guess: null, score: [0, 0] };
  try { var sv = JSON.parse(localStorage.getItem("gtune-v1") || "{}"); ["tuning", "method", "a4", "earFirst", "custom"].forEach(function (k) { if (sv[k] != null) S[k] = sv[k]; }); } catch (e) {}
  if (!TUNINGS[S.tuning]) S.tuning = "standard";
  if (Array.isArray(S.custom) && S.custom.length === 6) TUNINGS.custom.notes = S.custom;
  function save() { try { localStorage.setItem("gtune-v1", JSON.stringify({ tuning: S.tuning, method: S.method, a4: S.a4, earFirst: S.earFirst, custom: TUNINGS.custom.notes })); } catch (e) {} }
  function T() { return TUNINGS[S.tuning].notes; }
  function hz(m) { return S.a4 * Math.pow(2, (m - 69) / 12); }

  // ---------- the methods ----------
  // A step: { s: string being tuned, say: html, marks: [{s, f, h}] (h = harmonic over fret f), model: [[s, f, h]...] notes the page
  // plays (together when "together", else one after another), target: midi the string should reach (the reading's goal) }
  function relFret(lo, hi) { return T()[hi] - T()[lo]; }  // the fret on the lower string that gives the upper open string
  var METHODS = {
    ear: { label: "Match a reference", short: "The page plays each string's note; you match it by ear.", steps: function () {
      return [5, 4, 3, 2, 1, 0].reverse().map(function (s) { return { s: s,
        say: "Press <b>Play reference</b>, hum it, then pick the open " + SNUM(s) + " string (" + nn(T()[s]) + ") and let both ring. Turn the peg <i>while the string sounds</i>: low first, then up to the pitch. Two notes that nearly agree <b>wobble</b> (beat); in tune, the wobble stops.",
        marks: [{ s: s, f: 0 }], model: [[s, 0]], target: T()[s] }; }); } },
    drone: { label: "Tune to a drone", short: "A held note on each string's pitch. Listen for the beating to slow and stop.", steps: function () {
      return [0, 1, 2, 3, 4, 5].map(function (s) { return { s: s, drone: T()[s] - 12,
        say: "Start the <b>drone</b> (" + nn(T()[s]) + "). Pick the open " + SNUM(s) + " string and let it ring into the drone. Out of tune you hear a slow <b>wah-wah-wah</b>; the faster it pulses, the further off you are. Turn slowly: if the pulse gets faster you're going the wrong way. In tune, the string <b>disappears into the drone</b>.",
        marks: [{ s: s, f: 0 }], model: [[s, 0]], target: T()[s] }; }); } },
    fifth: { label: "Fifth-fret (relative)", short: "Each string from the one below it. Tunes the guitar to itself, in equal temperament.", steps: function () {
      var out = [{ s: 0, say: "First tune the <b>lowest string</b> to something: the reference, a drone, a piano, a tuner. Everything else follows from it, so take care here.", marks: [{ s: 0, f: 0 }], model: [[0, 0]], target: T()[0] }];
      for (var s = 1; s < 6; s++) { var f = relFret(s - 1, s);
        out.push({ s: s, say: "Fret the " + SNUM(s - 1) + " string at fret <b>" + f + "</b> (" + nn(T()[s]) + ") and play it, then the open " + SNUM(s) + " string. They should be the <b>same note</b>. Play them together and tune the open string until the wobble stops." + (f === 4 ? " (Fret 4, not 5: the G-to-B gap is smaller than the others.)" : "") + " Press lightly: a hard press bends the fretted note sharp.",
          marks: [{ s: s - 1, f: f }, { s: s, f: 0 }], model: [[s - 1, f], [s, 0]], together: true, target: T()[s] }); }
      return out; } },
    harmonics: { label: "Harmonics", short: "Bell-like harmonics ring on while you turn. Quick, but each step is a pure fourth, ~2 cents off equal temperament.", steps: function () {
      var t = T(), out = [{ s: 0, say: "Tune the <b>lowest string</b> first (reference, drone or tuner). Then touch it <b>lightly over the 12th fret wire</b> (not pressing down), pick, lift: a chime an octave up. That's a harmonic.", marks: [{ s: 0, f: 12, h: 1 }], model: [[0, 12, 1]], target: t[0] }];
      // harmonic pairs: 5th-fret harmonic (x4) of the lower string = 7th-fret harmonic (x3) of the next, when they're a fourth apart
      for (var s = 1; s < 6; s++) {
        var gap = t[s] - t[s - 1];
        if (gap === 5) out.push({ s: s, say: "Harmonic at fret <b>5</b> on the " + SNUM(s - 1) + " string, harmonic at fret <b>7</b> on the " + SNUM(s) + ". Let both ring and tune the " + SNUM(s) + " string until the beating stops.",
          marks: [{ s: s - 1, f: 5, h: 1 }, { s: s, f: 7, h: 1 }], model: [[s - 1, 5, 1], [s, 7, 1]], together: true, target: t[s], pure: true });
        else {
          // not a fourth: find a harmonic on a string already tuned that is a unison (or octave) with the open string
          var found = null;
          for (var lo = 0; lo < s && !found; lo++) [[12, 2], [7, 3], [5, 4], [4, 5]].forEach(function (hf) {
            if (found) return; var d = 12 * Math.log2(hf[1]) + t[lo] - t[s];
            if (Math.abs(d - Math.round(d)) < 0.05 && (Math.round(d) % 12 === 0) && hf[1] !== 5) found = { lo: lo, f: hf[0], oct: Math.round(d) / 12, cents: (d - Math.round(d)) * 100 };
          });
          if (found) out.push({ s: s, say: "This gap isn't a fourth, so use another harmonic: fret <b>" + found.f + "</b> harmonic on the " + SNUM(found.lo) + " string against the <b>open " + SNUM(s) + " string</b>" + (found.oct ? " (an octave apart)" : " (the same note)") + ". " + (Math.abs(found.cents) > 1 ? "This one is a pure interval, " + Math.abs(found.cents).toFixed(0) + " cents from the equal-tempered note: after tuning it, check with a chord." : ""),
            marks: [{ s: found.lo, f: found.f, h: 1 }, { s: s, f: 0 }], model: [[found.lo, found.f, 1], [s, 0]], together: true, target: t[s], pure: Math.abs(found.cents) > 1 });
          else { var f = gap; out.push({ s: s, say: "No harmonic pair fits this gap cleanly. Use the fretted note: fret <b>" + f + "</b> on the " + SNUM(s - 1) + " string against the open " + SNUM(s) + ". (In standard tuning the old 'fret-4 harmonic' on G against B is a pure major third, 14 cents flat: don't use it.)",
            marks: [{ s: s - 1, f: f }, { s: s, f: 0 }], model: [[s - 1, f], [s, 0]], together: true, target: t[s] }); }
        }
      }
      return out; } },
    octaves: { label: "Octave check", short: "Octave shapes across the strings. Use it to check and fix the other methods.", steps: function () {
      var t = T(), out = [];
      // for each string above the 2nd lowest, find a fretted note 1-4 on a lower string that is the octave below it, or a unison
      for (var s = 1; s < 6; s++) { var best = null;
        for (var lo = s - 1; lo >= 0 && !best; lo--) for (var f = 0; f <= 7 && !best; f++) { var d = t[s] - (t[lo] + f); if (d === 12 && lo <= s - 2) best = { lo: lo, f: f, oct: true }; }
        for (lo = s - 1; lo >= 0 && !best; lo--) { f = t[s] - t[lo]; if (f >= 0 && f <= 9) best = { lo: lo, f: f }; }
        if (best) out.push({ s: s, say: "Fret the " + SNUM(best.lo) + " string at fret <b>" + best.f + "</b> (" + nno(t[best.lo] + best.f) + ") and play it with the open " + SNUM(s) + " string (" + nno(t[s]) + ")" + (best.oct ? ": an <b>octave</b>. An octave in tune sounds like one fat note; out of tune it shimmers or wobbles." : ": the same note.") + " Tune the open string.",
          marks: [{ s: best.lo, f: best.f }, { s: s, f: 0 }], model: [[best.lo, best.f], [s, 0]], together: true, target: t[s] }); }
      out.push({ s: 5, say: "The last check: the open <b>lowest and highest strings</b>, two octaves apart (in standard tuning both E). Then strum a chord you know (or all six open strings in an open tuning) and <b>trust what you hear</b>. If one string sounds sour, go back to it.", marks: [{ s: 0, f: 0 }, { s: 5, f: 0 }], model: [[0, 0], [5, 0]], together: true, target: t[5] });
      return out; } },
    tuner: { label: "Tuner, ear first", short: "The microphone tells you, but only after you have said what you hear.", steps: function () {
      return [0, 1, 2, 3, 4, 5].map(function (s) { return { s: s, earGame: true,
        say: "Turn on <b>Listening</b> and pick the open " + SNUM(s) + " string (" + nn(T()[s]) + "). Before you look: is it <b>flat</b> (low), <b>in tune</b> or <b>sharp</b> (high)? Press <b>Play reference</b> if you need to compare. Guess, then the reading shows. Tune by ear toward what you guessed, then check again.",
        marks: [{ s: s, f: 0 }], model: [[s, 0]], target: T()[s] }; }); } }
  };
  function steps() { return METHODS[S.method].steps(); }
  function step() { var st = steps(); if (S.step >= st.length) S.step = st.length - 1; return st[S.step]; }

  // ---------- sound ----------
  var ctx = null, master = null, droneV = null;
  function ac() {
    if (!ctx) {
      ctx = new (global.AudioContext || global.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = vol();
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 12;
      master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "Guitar tuning");
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function vol() { var v = document.getElementById("gt-vol"); return v ? Math.pow(+v.value / 100, 2) * 0.8 : 0.3; }
  // Karplus-Strong: a burst of noise in a delay line, averaged each pass (rendered into a buffer once per pitch).
  var ksCache = {};
  function pluckBuf(f) {
    var c = ac(), key = f.toFixed(2); if (ksCache[key]) return ksCache[key];
    var sr = c.sampleRate, n = Math.floor(sr * 4), b = c.createBuffer(1, n, sr), d = b.getChannelData(0), N = sr / f, L = Math.floor(N), frac = N - L;
    var line = new Float32Array(L + 2), p = 0, last = 0;
    for (var i = 0; i < L + 2; i++) line[i] = Math.random() * 2 - 1;
    for (i = 0; i < L + 2; i++) { var a = line[i]; line[i] = 0.6 * a + 0.4 * last; last = a; } // soften the attack
    var loss = 0.996 + Math.min(0.0035, f / 400000);
    for (i = 0; i < n; i++) {
      var x0 = line[p % (L + 1)], x1 = line[(p + 1) % (L + 1)];
      var y = loss * (x0 * (1 - frac) * 0.5 + x1 * 0.5 + x0 * frac * 0.5);
      d[i] = x0 * 0.5; line[p % (L + 1)] = y; p++;
    }
    return (ksCache[key] = b);
  }
  function pluck(f, t, g) {
    var c = ac(), s = c.createBufferSource(), gn = c.createGain(); s.buffer = pluckBuf(f); gn.gain.value = g || 0.7;
    s.connect(gn); gn.connect(master); s.start(t || c.currentTime); return s;
  }
  function harmonic(f, t, g) {
    var c = ac(), o = c.createOscillator(), o2 = c.createOscillator(), gn = c.createGain(), g2 = c.createGain(); t = t || c.currentTime;
    o.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = 0.08;
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime((g || 0.5) * 0.45, t + 0.006); gn.gain.exponentialRampToValueAtTime(0.001, t + 4);
    o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(master); o.start(t); o2.start(t); o.stop(t + 4.1); o2.stop(t + 4.1);
  }
  // the pitch of a place on the guitar: open + fret, or a harmonic over fret f (string length / n)
  var HARM = { 12: 2, 7: 3, 19: 3, 5: 4, 4: 5, 9: 5, 3: 6 };
  function placeHz(s, f, h) { var o = hz(T()[s]); return h ? o * HARM[f] : o * Math.pow(2, f / 12); }
  function playPlace(s, f, h, t) { var x = placeHz(s, f, h); if (h) harmonic(x, t); else pluck(x, t); flash(s, f, h); }
  function playModel(st, together) {
    var c = ac(), t = c.currentTime + 0.03;
    st.model.forEach(function (m, i) { var at = together ? t + i * 0.9 : t + i * 0.9; playPlace(m[0], m[1], m[2], at); });
  }
  function droneOn(m) {
    var c = ac(); droneOff();
    var real = new Float32Array(9), imag = new Float32Array(9); [0, 1, .6, .35, .25, .12, .08, .05, .03].forEach(function (v, i) { imag[i] = v; });
    var w = c.createPeriodicWave(real, imag), g = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
    var o = c.createOscillator(); o.setPeriodicWave(w); o.frequency.value = hz(m);
    var o5 = c.createOscillator(); o5.setPeriodicWave(w); o5.frequency.value = hz(m) * 1.5; var g5 = c.createGain(); g5.gain.value = document.getElementById("gt-fifth").checked ? 0.35 : 0;
    g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(0.22, c.currentTime + 0.6);
    o.connect(lp); o5.connect(g5); g5.connect(lp); lp.connect(g); g.connect(master); o.start(); o5.start();
    droneV = { o: o, o5: o5, g: g, g5: g5, m: m };
  }
  function droneOff() { if (!droneV) return; var c = ctx, v = droneV; v.g.gain.setTargetAtTime(0, c.currentTime, 0.15); setTimeout(function () { try { v.o.stop(); v.o5.stop(); } catch (e) {} }, 900); droneV = null; }
  function droneNote() { var st = step(); return st.drone != null ? st.drone : T()[st.s] - 12; }

  // ---------- the microphone ----------
  var mic = null, lastRead = null, readHold = 0;
  function listen(on) {
    var b = document.getElementById("gt-listen");
    if (!on) { if (mic) mic.stop(); S.listening = false; b.classList.remove("gt-on"); b.textContent = "Listening: off"; drawRead(); return; }
    if (!PD) return;
    mic = PD.mic({ a4: S.a4, ctx: ac(), source: global.TEST_MIC_SOURCE,  // tests: a function (ctx) -> node in place of the microphone
      onFrame: function (fr) { if (fr.hz > 0) { lastRead = fr; readHold = performance.now(); } drawRead(); }, onError: function (e) { setMsg("The microphone didn't open: " + (e && e.message || e)); listen(false); } });
    mic.start().then(function () { S.listening = true; b.classList.add("gt-on"); b.textContent = "Listening: on"; drawRead(); });
  }
  function readingFor(fr) {
    // cents from the step's target (the string's note), folded into ±600 so a harmonic an octave up reads against the same note
    var st = step(), want = hz(st.target), c = 1200 * Math.log2(fr.hz / want); var oct = Math.round(c / 1200); c -= oct * 1200;
    return { cents: c, oct: oct, name: fr.name };
  }
  function drawRead() {
    var box = document.getElementById("gt-read"), fresh = lastRead && performance.now() - readHold < 700;
    var st = step(), hid = S.earFirst && st && S.guess == null;
    box.classList.toggle("gt-hidden", !!hid);
    var note = document.getElementById("gt-r-note"), cents = document.getElementById("gt-r-cents"), bar = document.getElementById("gt-r-dot"), say = document.getElementById("gt-r-say");
    if (!S.listening) { note.textContent = "–"; cents.textContent = ""; say.textContent = "Not listening. Your ear is the tuner; turn Listening on to check it."; bar.style.left = "50%"; bar.className = "gt-dot"; return; }
    if (!fresh) { say.textContent = hid ? "Listening. Play the string, then guess below." : "Listening… play the open " + SNUM(st.s) + " string."; if (!hid) { note.textContent = "–"; cents.textContent = ""; } return; }
    var r = readingFor(lastRead);
    if (hid) { say.textContent = "I hear a note. What do you hear? Guess below."; return; }
    note.textContent = lastRead.name; cents.textContent = (r.cents >= 0 ? "+" : "−") + Math.abs(r.cents).toFixed(0) + " ¢";
    var x = Math.max(-50, Math.min(50, r.cents)); bar.style.left = (50 + x) + "%";
    var ok = Math.abs(r.cents) < 3; bar.className = "gt-dot" + (ok ? " gt-ok" : Math.abs(r.cents) < 12 ? " gt-near" : "");
    var far = Math.abs(r.cents) > 300 ? " That's far from " + nn(st.target) + ": are you on the right string?" : "";
    say.textContent = (ok ? "In tune with " + nn(st.target) + ". Now listen: does it sound right with the strings around it?" : r.cents < 0 ? "Flat (low): tighten, slowly." : "Sharp (high): loosen a little below the note, then come back up to it.") + far;
  }
  function guess(g) {
    var st = step(), fresh = lastRead && performance.now() - readHold < 1500;
    if (!S.listening || !fresh) { setMsg("Turn Listening on and play the string first, so the tuner has something to check your guess against."); return; }
    var r = readingFor(lastRead), truth = Math.abs(r.cents) <= 5 ? "in" : r.cents < 0 ? "flat" : "sharp";
    S.guess = g; S.score[1]++; if (g === truth) S.score[0]++;
    var words = { flat: "flat", sharp: "sharp", in: "in tune" };
    setMsg((g === truth ? "Your ear was right: " : "Not quite: you heard " + words[g] + ", the tuner says ") + words[truth] + " (" + (r.cents >= 0 ? "+" : "−") + Math.abs(r.cents).toFixed(0) + " cents). Ear score " + S.score[0] + " / " + S.score[1] + "." + (truth !== "in" && Math.abs(r.cents) < 10 ? " Within 10 cents is hard to hear alone: play it against a reference or drone and listen for beating." : ""));
    drawRead();
    setTimeout(function () { S.guess = null; drawRead(); }, 4000);
  }
  function setMsg(t) { document.getElementById("gt-msg").textContent = t || ""; }

  // ---------- the fretboard ----------
  var FB = { W: 820, H: 200, x0: 46, len: 1220, top: 26, gap: 28, frets: 12 };
  function fx(f) { return FB.x0 + FB.len * (1 - Math.pow(2, -f / 12)); }
  function sy(s) { return FB.top + (5 - s) * FB.gap; }   // high string on top, as in tab
  function svgEl(tag, at, kids) { var e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (var k in at) e.setAttribute(k, at[k]); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function drawBoard() {
    var host = document.getElementById("gt-board"); host.innerHTML = "";
    var st = step(), sv = svgEl("svg", { viewBox: "0 0 " + FB.W + " " + FB.H, role: "img", "aria-label": "Guitar fretboard, frets 0 to 12, high string on top" });
    sv.appendChild(svgEl("title", {})).textContent = "Fretboard: the marks show where to play for this step. Click any place to hear it.";
    sv.appendChild(svgEl("rect", { x: FB.x0, y: sy(5) - 8, width: fx(FB.frets) - FB.x0, height: sy(0) - sy(5) + 16, class: "gt-wood", rx: 3 }));
    [3, 5, 7, 9].forEach(function (f) { sv.appendChild(svgEl("circle", { cx: (fx(f) + fx(f - 1)) / 2, cy: (sy(2) + sy(3)) / 2, r: 6, class: "gt-inlay" })); });
    sv.appendChild(svgEl("circle", { cx: (fx(12) + fx(11)) / 2, cy: (sy(1) + sy(2)) / 2, r: 6, class: "gt-inlay" }));
    sv.appendChild(svgEl("circle", { cx: (fx(12) + fx(11)) / 2, cy: (sy(3) + sy(4)) / 2, r: 6, class: "gt-inlay" }));
    for (var f = 0; f <= FB.frets; f++) {
      sv.appendChild(svgEl("line", { x1: fx(f), x2: fx(f), y1: sy(5) - 8, y2: sy(0) + 8, class: f ? "gt-fret" : "gt-nut" }));
      var t = svgEl("text", { x: f ? (fx(f) + fx(f - 1)) / 2 : FB.x0 - 22, y: FB.H - 6, class: "gt-fnum", "text-anchor": "middle" }); t.textContent = f ? f : "open"; sv.appendChild(t);
    }
    for (var s = 0; s < 6; s++) {
      sv.appendChild(svgEl("line", { x1: FB.x0 - 4, x2: fx(FB.frets), y1: sy(s), y2: sy(s), class: "gt-str" + (s === st.s ? " gt-str-now" : ""), "stroke-width": 1 + (5 - s) * 0.35 }));
      var lb = svgEl("text", { x: 8, y: sy(s) + 4, class: "gt-slab" + (s === st.s ? " gt-slab-now" : "") }); lb.textContent = SNUM(s) + " " + nn(T()[s]); sv.appendChild(lb);
      for (f = 0; f <= FB.frets; f++) (function (s, f) {
        var x0 = f ? fx(f - 1) : FB.x0 - 40, x1 = f ? fx(f) : FB.x0;
        var r = svgEl("rect", { x: x0, y: sy(s) - FB.gap / 2, width: x1 - x0, height: FB.gap, class: "gt-hit" });
        var tt = svgEl("title", {}); tt.textContent = "String " + SNUM(s) + (f ? ", fret " + f : ", open") + ": " + nno(T()[s] + f); r.appendChild(tt);
        r.addEventListener("click", function () { playPlace(s, f, 0); }); sv.appendChild(r);
      })(s, f);
    }
    st.marks.forEach(function (m) {
      var g;
      if (m.h) {
        var x = fx(m.f), y = sy(m.s), d = 10;
        g = svgEl("polygon", { points: [x, y - d, x + d, y, x, y + d, x - d, y].join(" "), class: "gt-mk gt-mk-h", "data-k": m.s + ":" + m.f + ":1" });
        var tl = svgEl("text", { x: x, y: y - 13, class: "gt-mk-t", "text-anchor": "middle" }); tl.textContent = nn(Math.round(T()[m.s] + 12 * Math.log2(HARM[m.f]))); sv.appendChild(tl);
      } else {
        var cx = m.f ? (fx(m.f) + fx(m.f - 1)) / 2 : FB.x0 - 18;
        g = svgEl(m.f ? "circle" : "circle", { cx: cx, cy: sy(m.s), r: 9, class: "gt-mk" + (m.f ? "" : " gt-mk-open"), "data-k": m.s + ":" + m.f + ":0" });
      }
      var ti = svgEl("title", {}); ti.textContent = (m.h ? "Harmonic: touch lightly right over fret wire " + m.f : m.f ? "Press at fret " + m.f : "Open string") + " on string " + SNUM(m.s); g.appendChild(ti);
      g.addEventListener("click", function () { playPlace(m.s, m.f, m.h); });
      sv.appendChild(g);
    });
    host.appendChild(sv);
  }
  function flash(s, f, h) {
    var e = document.querySelector('#gt-board [data-k="' + s + ":" + f + ":" + (h ? 1 : 0) + '"]'); if (!e) return;
    e.classList.add("gt-flash"); setTimeout(function () { e.classList.remove("gt-flash"); }, 500);
  }

  // ---------- the page ----------
  function drawMethods() {
    var host = document.getElementById("gt-methods"); host.innerHTML = "";
    Object.keys(METHODS).forEach(function (k) {
      var b = document.createElement("button"); b.type = "button"; b.className = "gt-method" + (k === S.method ? " gt-on" : ""); b.setAttribute("aria-pressed", k === S.method);
      b.innerHTML = "<b>" + METHODS[k].label + "</b><span>" + METHODS[k].short + "</span>";
      b.addEventListener("click", function () { S.method = k; S.step = 0; save(); render(); });
      host.appendChild(b);
    });
  }
  function drawStrings() {
    var host = document.getElementById("gt-steps"); host.innerHTML = "";
    steps().forEach(function (st, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-sm gt-sbtn" + (i === S.step ? " gt-on" : "");
      b.textContent = SNUM(st.s) + " " + nn(T()[st.s]) + (i === steps().length - 1 && S.method === "octaves" ? " ✓" : "");
      b.title = "Step " + (i + 1); b.addEventListener("click", function () { S.step = i; render(); }); host.appendChild(b);
    });
  }
  function render() {
    var st = step();
    drawMethods(); drawStrings(); drawBoard();
    document.getElementById("gt-say").innerHTML = "<span class='gt-stepn'>Step " + (S.step + 1) + " of " + steps().length + " · string " + SNUM(st.s) + " (" + nno(T()[st.s]) + ")</span> " + st.say +
      (st.pure ? " <span class='gt-warn'>A pure interval: about 2 cents off equal temperament. Fine alone; it adds up over several strings.</span>" : "");
    document.getElementById("gt-guess").hidden = !(S.earFirst || st.earGame);
    document.getElementById("gt-drone-row").classList.toggle("gt-stress", S.method === "drone");
    document.getElementById("gt-dnote").textContent = nno(droneNote());
    if (S.drone) { if (!droneV || droneV.m !== droneNote()) droneOn(droneNote()); }
    S.guess = null; drawRead(); setMsg("");
  }
  function init() {
    var tsel = document.getElementById("gt-tuning");
    Object.keys(TUNINGS).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = TUNINGS[k].label; tsel.appendChild(o); });
    var cbox = document.getElementById("gt-custom"), cin = document.getElementById("gt-custom-in");
    cin.value = TUNINGS.custom.notes.map(nno).join(" ");
    function showCustom() { cbox.hidden = S.tuning !== "custom"; }
    tsel.value = S.tuning; showCustom();
    tsel.addEventListener("change", function () { S.tuning = tsel.value; S.step = 0; showCustom(); save(); render(); });
    function applyCustom() {
      var r = parseTuning(cin.value), out = document.getElementById("gt-custom-say");
      if (!r) { out.textContent = "Six note names, lowest string first, e.g. D A D G A D, or with octaves: C2 G2 C3 G3 C4 E4."; return; }
      TUNINGS.custom.notes = r.notes; cin.value = r.notes.map(nno).join(" ");
      out.textContent = r.warn || "Tuning: " + r.notes.map(nno).join(" ") + "."; S.step = 0; save(); render();
    }
    cin.addEventListener("change", applyCustom);
    document.getElementById("gt-custom-go").addEventListener("click", applyCustom);
    var a4 = document.getElementById("gt-a4"); a4.value = S.a4;
    a4.addEventListener("change", function () { var v = +a4.value; if (v >= 415 && v <= 466) { S.a4 = v; ksCache = {}; if (mic && mic.setA4) mic.setA4(v); save(); if (droneV) droneOn(droneNote()); render(); } });
    var ef = document.getElementById("gt-earfirst"); ef.checked = !!S.earFirst;
    ef.addEventListener("change", function () { S.earFirst = ef.checked; save(); render(); });
    document.getElementById("gt-play").addEventListener("click", function () { playModel(step(), false); });
    document.getElementById("gt-together").addEventListener("click", function () { var st = step(), c = ac(), t = c.currentTime + .03; st.model.forEach(function (m) { playPlace(m[0], m[1], m[2], t); }); });
    document.getElementById("gt-prev").addEventListener("click", function () { if (S.step > 0) { S.step--; render(); } });
    document.getElementById("gt-next").addEventListener("click", function () { if (S.step < steps().length - 1) { S.step++; render(); } });
    document.getElementById("gt-listen").addEventListener("click", function () { listen(!S.listening); });
    var db = document.getElementById("gt-drone");
    db.addEventListener("click", function () { S.drone = !S.drone; db.classList.toggle("gt-on", S.drone); db.textContent = S.drone ? "Drone: on" : "Drone: off"; if (S.drone) droneOn(droneNote()); else droneOff(); });
    document.getElementById("gt-fifth").addEventListener("change", function () { if (droneV) droneV.g5.gain.value = this.checked ? 0.35 : 0; });
    document.getElementById("gt-vol").addEventListener("input", function () { if (master) master.gain.value = vol(); });
    Array.prototype.forEach.call(document.querySelectorAll("#gt-guess [data-g]"), function (b) { b.addEventListener("click", function () { guess(b.getAttribute("data-g")); }); });
    document.addEventListener("keydown", function (e) {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === " ") { e.preventDefault(); playModel(step(), false); }
      else if (k === "ArrowRight" || k === "l") document.getElementById("gt-next").click();
      else if (k === "ArrowLeft" || k === "h") document.getElementById("gt-prev").click();
      else if (k === "d") db.click();
      else if (k === "m") document.getElementById("gt-listen").click();
    });
    render();
  }
  global.GuitarTuning = { TUNINGS: TUNINGS, parseTuning: parseTuning, METHODS: METHODS, state: S, steps: steps, placeHz: placeHz };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
