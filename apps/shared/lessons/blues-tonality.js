// blues-tonality.js — widgets for the Blues Tonality lessons (lessons/blues-tonality-*.qmd), global BluesTonality.
// Sources: Ethan Hein, "Blues tonality" (ethanhein.com, 2014, revised 2026) and Panos Charalampidis's video series
// "Microtonal Blues Scales" (nine parts, YouTube). Cents for the "pitch areas" are THIS SITE'S SKETCH of what those sources
// describe in words ("a little higher than the standard 4th", "the upper area of the 3rd pitch complex"); nobody measured them.
//
// One bar at the foot of the page (built here, PlayBar): Key, Lead sound, Backing (a drone, one-chord vamps, 12-bar forms), ▶ Backing,
// Tempo, Stop. Everything a widget plays sounds over the backing if it is running. All sound is the band's samples (BandSounds,
// bends by spec.bend, pitches between the keys by fractional midi); the drag-to-play strips use a small synth voice (a continuous
// pitch that follows the pointer, which a sample cannot do).
//
// Widgets: <div class="bz" data-w="KIND" ...>
//   zone    data-deg="3" | "45" | "7"   one scale degree's pitch area: a strip in cents to press and drag (with the piano keys and the
//           named areas marked), and buttons that play the ways of reaching the area (bends, slides, trills ... from the videos)
//   scale   data-set="hein" | "panos" (which scales the menu lists), data-start=<scale id>   a scale drawn on a line of cents: fixed notes
//           as dots, pitch areas as bands; ▶ on the piano keys, ▶ shaded (bent into the areas), click a note
//   chorus  data-form="major" | "minor", data-plan="47,47,47,47,26,26,..." (12 entries: 47 26 minorish neutral root rest)   a 12-bar
//           chorus over the band, a phrase made up in each bar from the scale chosen for that bar (seeded; New phrases changes it)
//   chords  data-set="bluesscale" | "dim" | "bvi" | "hendrix" | "ending"   chords and short progressions in the key, on the piano
//   onions  the Green Onions riff on a 12-bar, every chord marked with the modes of the key note that hold all its notes
//   harp    a ten-hole diatonic harmonica (Richter layout), harp key, position 1st / 2nd (cross harp) / 3rd, bends; click to play
//   quiz    data-kind="third" | "scale" | "chord"   ear questions; recorded in SiteRecord (tool "blues-tonality") when it is loaded
// BluesTonality.widgets = the built widgets (tests); BluesTonality.band = the backing ({ start(form), stop(), playing }).
// Test: node tests/lessons/blues-tonality.cdp.js (after rendering the lessons).
(function (global) {
  "use strict";
  var doc = global.document;
  var KEYS = [["0", "C"], ["2", "D"], ["4", "E"], ["5", "F"], ["7", "G"], ["9", "A"], ["10", "B♭"]];
  var LEADS = [["clguitar", "Electric guitar (clean)"], ["odguitar", "Electric guitar (distorted)"], ["harmonica", "Harmonica"], ["asax", "Alto sax"],
               ["trombone", "Trombone"], ["violin", "Violin"]];
  var S = { key: 4, lead: "clguitar", backing: "I7", tempo: 84 };
  try { var sv = JSON.parse(localStorage.getItem("bz-bar") || "{}"); ["key", "lead", "backing", "tempo"].forEach(function (k) { if (sv[k] != null) S[k] = sv[k]; }); } catch (e) {}
  function keep() { try { localStorage.setItem("bz-bar", JSON.stringify(S)); } catch (e) {} }

  // ---------- names ----------
  var LET = "CDEFGAB", LPC = [0, 2, 4, 5, 7, 9, 11];
  var DEG = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"], DSTEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  function keyLetter(pc) { return { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 10: 6, 1: 1, 3: 2, 6: 4, 8: 5, 11: 6 }[pc]; }   // flats for black keys
  function noteName(semis, tonic) {   // a degree of the key spelled as a letter (blues spelling: ♭3, ♯4, ♭7)
    var d = ((semis % 12) + 12) % 12, li = (keyLetter(tonic) + DSTEP[d]) % 7, want = (tonic + d) % 12, acc = ((want - LPC[li] + 18) % 12) - 6;
    return LET[li] + (acc === -1 ? "♭" : acc === 1 ? "♯" : acc === -2 ? "𝄫" : acc === 2 ? "𝄪" : "");
  }
  function degOf(c) { return DEG[((Math.round(c / 100) % 12) + 12) % 12]; }
  function tonicMidi() { return 60 + S.key; }               // the lead's key note: C4..B♭4

  // ---------- audio ----------
  var ctx = null, master = null, bank = null, loaded = {}, liveVoice = null;
  function ensure() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext; ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "Blues Tonality");
      if (global.BandSounds && !global.BandSounds.__bzHarp) {
        global.BandSounds.__bzHarp = 1;
        global.BandSounds.define("harmonica", function (sf) { return { family: "melody", label: "Harmonica", gain: 1.5, release: 0.08, zones: global.BandSounds.soundfontZones(sf, "harmonica", 55, 96, 3) }; });
      }
      bank = global.BandSounds.create(ctx);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function need(names) {
    ensure(); var miss = names.filter(function (n) { return !loaded[n]; });
    if (!miss.length) return Promise.resolve();
    status("Loading sounds…");
    return bank.load(miss).then(function () { miss.forEach(function (n) { loaded[n] = 1; }); status(""); });
  }
  // c = cents above the key note where the note starts; path = [[seconds, cents], ...] its pitch over time (optional)
  function lead(c, dur, when, path, vel, sound) {
    var spec = { midi: tonicMidi() + c / 100, dur: dur, vel: vel == null ? 0.8 : vel };
    if (path && path.length) spec.bend = path.map(function (p) { return [p[0], (p[1] - c) / 100]; });
    bank.play(sound || S.lead, spec, when, master);
  }
  function chord(semis, when, dur, inst, vel) { semis.forEach(function (s) { bank.play(inst || "piano", { midi: tonicMidi() - 12 + s, dur: dur, vel: vel || 0.55 }, when, master); }); }
  // a sequence of notes [{c, d (seconds), p?}] one after another
  function seq(notes, sound) {
    var t = ensure().currentTime + 0.06;
    notes.forEach(function (n) { lead(n.c, n.d, t, n.p, n.v, sound); t += n.d; });
    return t;
  }
  // the strips' voice: a continuous pitch (two saws through a low-pass, like a reed)
  function liveStart(c) {
    ensure(); liveStop();
    var g = ctx.createGain(), f = ctx.createBiquadFilter(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    f.type = "lowpass"; f.frequency.value = 2200; o1.type = "sawtooth"; o2.type = "square"; o2.detune.value = 4;
    var g2 = ctx.createGain(); g2.gain.value = 0.35; o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(master);
    g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.03);
    o1.start(); o2.start(); liveVoice = { g: g, o: [o1, o2] }; liveMove(c);
  }
  function liveMove(c) { if (!liveVoice) return; var hz = 440 * Math.pow(2, (tonicMidi() + c / 100 - 69) / 12); liveVoice.o.forEach(function (o) { o.frequency.setTargetAtTime(hz, ctx.currentTime, 0.012); }); }
  function liveStop() { if (!liveVoice) return; var v = liveVoice; liveVoice = null; var t = ctx.currentTime; v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.03); v.o.forEach(function (o) { o.stop(t + 0.3); }); }

  // ---------- the backing band ----------
  // a form is a list of bars; a bar a list of chords { b: start beat, d: beats, r: root in semitones above the key note, q: quality }
  var Q = { "7": [0, 4, 7, 10], m7: [0, 3, 7, 10], maj: [0, 4, 7], m: [0, 3, 7], "5": [0, 7, 12], "7#9": [0, 4, 10, 15], dim7: [0, 3, 6, 9], maj7: [0, 4, 7, 11], "9": [0, 4, 7, 10, 14] };
  function C(r, q, b, d) { return { r: r, q: q, b: b || 0, d: d || 4 }; }
  function bars(spec) { return spec.split(" ").map(function (t) { var m = /^(b?)(I|II|III|IV|V|VI|VII|i|ii|iii|iv|v|vi|vii)(.*)$/.exec(t), R = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 }; var r = R[m[2].toUpperCase()] - (m[1] ? 1 : 0); return [C((r + 12) % 12, m[3] || (m[2] === m[2].toLowerCase() ? "m7" : "7"))]; }); }
  var FORMS = {
    drone:  { label: "Drone (key note and 5th)", bars: [[C(0, "5")]], drone: true },
    I5:     { label: "Power chord vamp (no 3rd)", bars: [[C(0, "5")]], comp: "odguitar" },
    I7:     { label: "One chord: I7 (Spoonful-style)", bars: [[C(0, "7")]] },
    I7s9:   { label: "One chord: I7♯9 / I7♭10", bars: [[C(0, "7#9")]], comp: "odguitar" },
    Im7:    { label: "One chord: Im7", bars: [[C(0, "m7")]] },
    major:  { label: "12-bar blues", bars: bars("I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7") },
    minor:  { label: "Minor 12-bar blues", bars: bars("im7 im7 im7 im7 ivm7 ivm7 im7 im7 bVI7 V7 im7 V7") },
  };
  var ONION = { I: [C(0, "m7", 0, 2), C(3, "maj", 2, 1), C(5, "maj", 3, 1)], IV: [C(5, "7", 0, 2), C(8, "maj", 2, 1), C(10, "maj", 3, 1)], V: [C(7, "7", 0, 2), C(10, "maj", 2, 1), C(0, "maj", 3, 1)] };
  FORMS.onions = { label: "Green Onions riff on a 12-bar", bars: "I I I I IV IV I I V IV I I".split(" ").map(function (k) { return ONION[k]; }), comp: "hammond" };
  var band = { playing: false, form: null, listeners: [] };
  var timer = null, nextT = 0, beat = 0;
  function spb() { return 60 / S.tempo; }
  function chordAt(bar, b) { var cs = bar.filter(function (c) { return b >= c.b && b < c.b + c.d; }); return cs[0] || bar[0]; }
  function playBeat(form, bi, b, t) {
    var bar = form.bars[bi % form.bars.length], ch = chordAt(bar, b), s = spb(), sw = s * 2 / 3, bassMidi = 28 + ((S.key - 4 + 12) % 12);
    if (form.drone) {
      if (b === 0) { bank.play("bass", { midi: bassMidi, dur: s * 4, vel: 0.6 }, t, master); chord([0, 7, 12], t, s * 4 + 0.1, "hammond", 0.5); }
      return;
    }
    // drums: kick 1 3, snare 2 4, hi-hat on each beat and the swung "and"
    bank.play("kit", { piece: b % 2 ? "snare" : "kick", vel: b % 2 ? 0.55 : 0.7 }, t, master);
    bank.play("kit", { piece: "hatClosed", vel: 0.4 }, t, master); bank.play("kit", { piece: "hatClosed", vel: 0.28 }, t + sw, master);
    // bass: up and down the chord, a beat each
    var minor = /^m/.test(ch.q) || ch.q === "dim7", walk = (bi % 2 ? [12, 10, 7, minor ? 3 : 4] : [0, minor ? 3 : 4, 7, 9]);
    if (ch.q === "5" || ch.q === "7#9") walk = [0, 0, 7, 10 - (b % 2) * 3]; if (ch.d < 4) walk = [0, 0, 0, 0];
    var bn = ch.d < 4 ? 0 : walk[b]; if (ch.q === "maj" && ch.d < 4) bn = 0;
    bank.play("bass", { midi: bassMidi + ch.r + bn - (ch.r + bn > 14 ? 12 : 0), dur: s * 0.9, vel: 0.7 }, t, master);
    // comping
    var inst = form.comp || "piano", notes = Q[ch.q].map(function (x) { return ((ch.r + x) % 12) + (x >= 12 ? 12 : 0); });
    if (inst === "hammond") { if (b === ch.b) chord(notes.map(function (n) { return n + 12; }), t, s * ch.d * 0.95, "hammond", 0.45); }
    else if (inst === "odguitar") { if (b === 0 || b === 2) chord(notes.slice(0, 3).map(function (n) { return n + 12 - 12 * (n > 9); }), t, s * 1.6, "odguitar", 0.5); }
    else if (b % 2 === 1) { chord(notes.map(function (n) { return n + 12; }), t, s * 0.5, "piano", 0.45); chord(notes.map(function (n) { return n + 12; }), t + sw, s * 0.3, "piano", 0.3); }
  }
  function tick() {
    while (nextT < ctx.currentTime + 0.18) {
      var bi = Math.floor(beat / 4), b = beat % 4;
      playBeat(band.form, bi, b, nextT);
      band.listeners.forEach(function (f) { try { f(bi, b, nextT, spb()); } catch (e) { console.error(e); } });
      nextT += spb(); beat++;
    }
  }
  band.start = function (form, opts) {
    band.stop(); opts = opts || {};
    var f = typeof form === "string" ? FORMS[form] : form, needs = ["bass", "piano", "kit"].concat(f.comp && f.comp !== "hammond" ? [f.comp] : []);
    return need(needs).then(function () {
      band.form = f; band.playing = true; band.owner = opts.owner || null; band.listeners = opts.onBeat ? [opts.onBeat] : [];
      beat = 0; nextT = ctx.currentTime + 0.1; tick(); timer = setInterval(tick, 40);
      if (global.PlayBar) global.PlayBar.sounding("blues-tonality", band.stop);
      refreshBar();
    });
  };
  band.stop = function () {
    if (timer) clearInterval(timer); timer = null;
    var was = band.playing; band.playing = false; band.listeners = []; var ow = band.owner; band.owner = null;
    if (bank && was) bank.stopAll();
    liveStop();
    if (ow && ow.stopped) ow.stopped();
    if (global.PlayBar && was) global.PlayBar.sounding("blues-tonality", null);
    refreshBar();
  };

  // ---------- the bar at the foot ----------
  var bar = null, statusEl = null, backBtn = null;
  function status(t) { if (statusEl) statusEl.textContent = t; }
  function opt(sel, list, val) { list.forEach(function (o) { var e = doc.createElement("option"); e.value = o[0]; e.textContent = o[1]; sel.appendChild(e); }); sel.value = String(val); }
  function el(tag, cls, txt) { var e = doc.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(txt, fn, cls) { var b = el("button", "btn btn-sm btn-outline-secondary" + (cls ? " " + cls : ""), txt); b.type = "button"; b.addEventListener("click", fn); return b; }
  function labelled(lbl, ctl, pri) { var s = el("span"); if (pri != null) s.setAttribute("data-pri", pri); var l = el("label", null, lbl); l.htmlFor = ctl.id; s.appendChild(l); s.appendChild(ctl); return s; }
  function refreshBar() { if (backBtn) { backBtn.textContent = band.playing && !band.owner ? "■ Backing" : "▶ Backing"; backBtn.classList.toggle("bz-on", band.playing && !band.owner); } }
  function buildBar() {
    bar = doc.getElementById("bz-bar"); if (bar) return;
    bar = el("div"); bar.id = "bz-bar"; doc.body.appendChild(bar);
    var k = el("select"); k.id = "bz-key"; opt(k, KEYS, S.key);
    k.onchange = function () { S.key = +k.value; keep(); BT.widgets.forEach(function (w) { if (w.redraw) w.redraw(); }); };
    var ld = el("select"); ld.id = "bz-lead"; opt(ld, LEADS, S.lead); ld.onchange = function () { S.lead = ld.value; keep(); need([S.lead]); };
    var bk = el("select"); bk.id = "bz-backing"; opt(bk, Object.keys(FORMS).map(function (f) { return [f, FORMS[f].label]; }), S.backing);
    bk.onchange = function () { S.backing = bk.value; keep(); if (band.playing && !band.owner) band.start(S.backing); };
    backBtn = btn("▶ Backing", function () { if (band.playing && !band.owner) band.stop(); else band.start(S.backing); });
    var tr = el("input"); tr.type = "range"; tr.id = "bz-tempo"; tr.min = 50; tr.max = 160; tr.step = 2; tr.value = S.tempo;
    var tn = el("input"); tn.type = "number"; tn.min = 50; tn.max = 160; tn.value = S.tempo; tn.setAttribute("aria-label", "Tempo in beats per minute");
    function setT(v) { S.tempo = Math.max(50, Math.min(160, +v || 84)); tr.value = tn.value = S.tempo; keep(); }
    tr.oninput = function () { setT(tr.value); }; tn.onchange = function () { setT(tn.value); };
    var ts = el("span"); ts.setAttribute("data-pri", "2"); var tl = el("label", null, "Tempo"); tl.htmlFor = "bz-tempo"; ts.appendChild(tl); ts.appendChild(tr); ts.appendChild(tn);
    var stop = btn("■ Stop", function () { band.stop(); if (bank) bank.stopAll(); liveStop(); }); stop.id = "bz-stop";
    statusEl = el("span"); statusEl.id = "bz-status"; statusEl.setAttribute("aria-live", "polite"); statusEl.setAttribute("data-pri", "6");
    bar.appendChild(labelled("Key", k, 3)); bar.appendChild(labelled("Lead", ld, 4)); bar.appendChild(labelled("Backing", bk, 1));
    bar.appendChild(backBtn); bar.appendChild(ts); bar.appendChild(stop); bar.appendChild(statusEl);
    if (global.PlayBar) global.PlayBar.attach(bar, { stop: stop, live: function () { return band.playing; } });
  }

  // ---------- zone: one degree's pitch area ----------
  var ZONES = {
    "3": { lo: 170, hi: 530, keys: [200, 300, 400, 500],
      areas: [["minorish", 296, 330], ["neutral", 336, 364], ["majorish", 370, 398]],
      presets: [
        ["♭3 (piano key)", [{ c: 300, d: 1.3 }]], ["3 (piano key)", [{ c: 400, d: 1.3 }]], ["Neutral 3rd, held", [{ c: 350, d: 1.5 }]],
        ["Majorish: bend ♭3 up", [{ c: 300, d: 1.7, p: [[0, 300], [0.12, 300], [0.34, 385]] }]],
        ["Neutral: bend ♭3 halfway", [{ c: 300, d: 1.7, p: [[0, 300], [0.12, 300], [0.32, 350]] }]],
        ["Minorish: a small bend", [{ c: 300, d: 1.6, p: [[0, 300], [0.15, 300], [0.3, 322], [0.9, 322], [1.1, 306]] }]],
        ["Slide ♭3 → 3", [{ c: 300, d: 1.5, p: [[0, 300], [0.2, 300], [0.26, 400]] }]],
        ["Hammer-on ♭3 → 3", [{ c: 300, d: 0.2 }, { c: 400, d: 1.2 }]],
        ["Trill ♭3 / 3", [{ c: 300, d: 1.4, p: (function () { var p = []; for (var i = 0; i < 14; i++) { p.push([i * 0.08, i % 2 ? 400 : 300], [i * 0.08 + 0.075, i % 2 ? 400 : 300]); } return p; })() }]],
        ["Bend, release, bend", [{ c: 300, d: 1.6, p: [[0, 300], [0.1, 385], [0.2, 300], [0.36, 300], [0.55, 386]] }]],
        ["Vibrato on a raised ♭3", [{ c: 300, d: 1.8, p: (function () { var p = [[0, 300], [0.15, 330]]; for (var i = 0; i < 10; i++) p.push([0.27 + i * 0.13, i % 2 ? 322 : 378]); return p; })() }]],
        ["Slide to nowhere", [{ c: 300, d: 0.7, p: [[0, 300], [0.3, 300], [0.65, 440]], v: 0.7 }]],
        ["From the 2nd up to majorish 3", [{ c: 200, d: 1.6, p: [[0, 200], [0.12, 200], [0.34, 385]] }]],
        ["Low shade: under ♭3, 2, 1", [{ c: 200, d: 0.45, p: [[0, 200], [0.1, 200], [0.24, 288]] }, { c: 200, d: 0.35 }, { c: 0, d: 1.2 }]],
      ] },
    "45": { lo: 440, hi: 760, keys: [500, 600, 700],
      areas: [["high 4th", 503, 520], ["blue ♯4", 565, 598], ["low 5th", 668, 698]],
      presets: [
        ["4 (piano key)", [{ c: 500, d: 1.2 }]], ["4, a little high", [{ c: 512, d: 1.3 }]],
        ["Bend 4 → just under ♯4", [{ c: 500, d: 1.6, p: [[0, 500], [0.12, 500], [0.32, 588]] }]],
        ["Bend 4 → low 5th", [{ c: 500, d: 1.6, p: [[0, 500], [0.12, 500], [0.38, 688]] }]],
        ["Bend ♭5 → 5", [{ c: 600, d: 1.5, p: [[0, 600], [0.1, 600], [0.26, 690]] }]],
        ["5 (piano key)", [{ c: 700, d: 1.2 }]], ["Low 5th, then the piano's 5th", [{ c: 688, d: 1 }, { c: 700, d: 1 }]],
      ] },
    "7": { lo: 840, hi: 1160, keys: [900, 1000, 1100],
      areas: [["low 7th", 965, 995], ["high 7th → neutral 7th", 1006, 1052]],
      presets: [
        ["♭7 (piano key)", [{ c: 1000, d: 1.2 }]], ["Bend ♭7 a little up", [{ c: 1000, d: 1.5, p: [[0, 1000], [0.12, 1000], [0.3, 1030]] }]],
        ["Neutral 7th, held", [{ c: 1050, d: 1.4 }]],
        ["Low 7th: bend the 5th up, then 6", [{ c: 700, d: 0.9, p: [[0, 700], [0.1, 700], [0.42, 982]] }, { c: 900, d: 1.1 }]],
        ["Low 7th: bend the 6th up, then 6", [{ c: 900, d: 0.8, p: [[0, 900], [0.1, 900], [0.3, 982]] }, { c: 900, d: 1.1 }]],
        ["♭7 and 7 (piano keys)", [{ c: 1000, d: 0.8 }, { c: 1100, d: 0.8 }]],
      ] },
  };
  function zoneWidget(host) {
    var Z = ZONES[host.getAttribute("data-deg") || "3"], W = 640, H = 96, x = function (c) { return 16 + (c - Z.lo) / (Z.hi - Z.lo) * (W - 32); };
    var w = { kind: "zone", host: host, Z: Z };
    var svgBox = el("div", "bz-strip"), read = el("div", "bz-read", "Press and drag along the strip to play any pitch in this range."), pres = el("div", "bz-presets");
    host.appendChild(svgBox); host.appendChild(read); host.appendChild(pres);
    function name(c) {
      var near = Math.round(c / 100) * 100, off = Math.round(c - near), a = Z.areas.filter(function (z) { return c >= z[1] && c <= z[2]; })[0];
      return Math.round(c) + "¢ above the key note: " + (off === 0 ? "the piano's " + degOf(near) : (off > 0 ? "+" : "") + off + "¢ from the piano's " + degOf(near) + " (" + noteName(near / 100, S.key) + ")") + (a ? " · in the " + a[0] + " area" : "");
    }
    w.redraw = function () {
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="pitch strip" style="touch-action:none;cursor:pointer">';
      s += '<rect x="16" y="22" width="' + (W - 32) + '" height="34" rx="5" class="bz-bed"/>';
      Z.areas.forEach(function (a, i) { s += '<rect x="' + x(a[1]) + '" y="22" width="' + (x(a[2]) - x(a[1])) + '" height="34" class="bz-area bz-a' + i + '"/><text x="' + (x(a[1]) + x(a[2])) / 2 + '" y="16" class="bz-at">' + a[0] + '</text>'; });
      Z.keys.forEach(function (k) { s += '<line x1="' + x(k) + '" x2="' + x(k) + '" y1="22" y2="62" class="bz-key"/><text x="' + x(k) + '" y="76" class="bz-kt">' + degOf(k) + ' ' + noteName(k / 100, S.key) + '</text><text x="' + x(k) + '" y="90" class="bz-kc">piano key</text>'; });
      s += '<line class="bz-cur" x1="-10" x2="-10" y1="18" y2="60"/></svg>';
      svgBox.innerHTML = s;
      var svg = svgBox.firstChild, cur = svg.querySelector(".bz-cur");
      function cAt(ev) { var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W; return Math.max(Z.lo, Math.min(Z.hi, Z.lo + (px - 16) / (W - 32) * (Z.hi - Z.lo))); }
      function show(c) { cur.setAttribute("x1", x(c)); cur.setAttribute("x2", x(c)); read.textContent = name(c); }
      var down = false;
      svg.addEventListener("pointerdown", function (ev) { down = true; svg.setPointerCapture(ev.pointerId); var c = cAt(ev); liveStart(c); show(c); });
      svg.addEventListener("pointermove", function (ev) { if (!down) return; var c = cAt(ev); liveMove(c); show(c); });
      function up() { if (down) { down = false; liveStop(); } }
      svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
      w.show = show;
    };
    Z.presets.forEach(function (p) {
      var b = btn("▶ " + p[0], function () {
        need([S.lead]).then(function () {
          var t0 = ensure().currentTime; seq(p[1]);
          var path = []; var tt = 0; p[1].forEach(function (n) { (n.p || [[0, n.c]]).forEach(function (q) { path.push([tt + q[0], q[1]]); }); tt += n.d; });
          path.forEach(function (q) { setTimeout(function () { if (w.show) w.show(q[1]); }, (q[0] + 0.06) * 1000); });
        });
      });
      pres.appendChild(b);
    });
    w.play = function (i) { pres.querySelectorAll("button")[i].click(); };
    w.redraw(); return w;
  }

  // ---------- scale ----------
  function N(c, o) { var n = { c: c }; if (o) for (var k in o) n[k] = o[k]; return n; }
  function fixed(list) { return list.map(function (c) { return N(c); }); }
  var M3 = N(385, { lo: 300, hi: 398, t: 385, from: 300 }), m3 = N(320, { lo: 296, hi: 332, t: 320, from: 300 }), n3 = N(350, { lo: 336, hi: 364, t: 350, from: 300 });
  var P4 = N(510, { lo: 503, hi: 520 }), S4 = N(588, { lo: 565, hi: 598, t: 588, from: 500 }), P5 = N(690, { lo: 668, hi: 700, t: 690, from: 500 });
  var H7 = N(1030, { lo: 1006, hi: 1052, t: 1030, from: 1000 }), P2 = N(205, { lo: 200, hi: 215 }), P6 = N(900, { lo: 885, hi: 915 }), M2 = N(200), Mj6 = N(900), m6 = N(800);
  var SCALES = {
    aebersold: { set: "hein", name: "The blues scale (Aebersold)", src: "1 ♭3 4 ♯4 5 ♭7: Aebersold, How to Play Jazz and Improvise (1967), per Hein", notes: fixed([0, 300, 500, 600, 700, 1000]) },
    majorblues: { set: "hein", name: "Major blues scale", src: "1 2 ♭3 3 5 6, the second mode of the blues scale (Jaffe; Greenblatt), per Hein", notes: fixed([0, 200, 300, 400, 700, 900]) },
    minorpent: { set: "hein", name: "Minor pentatonic", src: "1 ♭3 4 5 ♭7. Sutcliffe's 'blues pentatonic' is this over a dominant 7th, per Hein", notes: fixed([0, 300, 500, 700, 1000]) },
    dorian: { set: "hein", name: "Dorian (Benward and Saker's 'blues scale')", src: "the major scale with ♭3 and ♭7, per Hein", notes: fixed([0, 200, 300, 500, 700, 900, 1000]) },
    mixolydian: { set: "hein", name: "Mixolydian", src: "one of Fahey's two blues modes (on Charley Patton), per Hein", notes: fixed([0, 200, 400, 500, 700, 900, 1000]) },
    dormix: { set: "hein", name: "Dorian and Mixolydian together", src: "Fahey's other mode; Kubik's nearest twelve-note version, per Hein", notes: fixed([0, 200, 300, 400, 500, 700, 900, 1000]) },
    sargeant: { set: "hein", name: "Two tetrachords (Sargeant, in Schuller)", src: "A-C-D-E♭ and E-G-A-B♭ in C: 1 2 ♭3 3 5 6 ♭7, per Hein", notes: fixed([-300, 0, 200, 300, 400, 700, 900, 1000]) },
    russell: { set: "hein", name: "Auxiliary diminished blues (Russell)", src: "the half-whole diminished scale, per Hein", notes: fixed([0, 100, 300, 400, 600, 700, 900, 1000]) },
    titon: { set: "hein", name: "Titon's downhome blues scale", src: "1926-30 recordings; complexes on 3, 5 and 7, a tenth wide (Titon 1977), per Hein", span: 1600,
      notes: [N(0), N(200), N(350, { lo: 300, hi: 400, t: 350, from: 300, pts: [300, 333, 367, 400] }), N(500), N(650, { lo: 600, hi: 700, t: 690, from: 600, pts: [600, 650, 700] }), N(900),
              N(1050, { lo: 1000, hi: 1100, t: 1030, from: 1000, pts: [1000, 1050, 1100] }), N(1200), N(1400), N(1550, { lo: 1500, hi: 1600, t: 1585, from: 1500, pts: [1500, 1600] })] },
    p47tet: { set: "panos", name: "“Majorish 4-7”, four notes", src: "1, majorish 3, high 4, high 7 (Charalampidis, part 2)", notes: [N(0), M3, P4, H7] },
    p47: { set: "panos", name: "“Majorish 4-7”, with the 5th", src: "part 2: the 5th a little low, reached by a bend from the 4th", notes: [N(0), M3, P4, P5, H7] },
    p47s4: { set: "panos", name: "“Majorish 4-7”, with ♯4 and 5", src: "part 2: the ♯4 just below the piano's, bent up from the 4th", notes: [N(0), M3, P4, S4, P5, H7] },
    p26: { set: "panos", name: "“Majorish 2-6”", src: "1 2 3 5 6, the 3rd bent up from the 2nd (part 4)", notes: [N(0), P2, N(385, { lo: 285, hi: 398, t: 385, from: 200 }), P5, P6] },
    p47x: { set: "panos", name: "“Majorish 4-7” with 2 and 6 (seven notes)", src: "part 5", notes: [N(0), P2, M3, P4, P5, P6, H7] },
    p26x: { set: "panos", name: "“Majorish 2-6” with 4 and 7 (seven notes)", src: "part 5", notes: [N(0), P2, N(385, { lo: 285, hi: 398, t: 385, from: 200 }), P4, P5, P6, H7] },
    minorish: { set: "panos", name: "“Minorish”", src: "the 4-7 scale with only a small bend on the 3rd (part 7)", notes: [N(0), m3, P4, P5, H7] },
    minorish26: { set: "panos", name: "“Minorish” with 2 and 6 (Dorian colour)", src: "part 8: these two less bent than in the majorish scales", notes: [N(0), M2, m3, P4, P5, Mj6, H7] },
    minorishb6: { set: "panos", name: "“Minorish” with 2 and ♭6 (Aeolian colour)", src: "part 8: ♭6 mostly over the iv chord", notes: [N(0), M2, m3, P4, P5, m6, H7] },
    neutral: { set: "panos", name: "“Neutral”", src: "the 4-7 scale with a neutral 3rd, for I7♭10 songs (part 9)", notes: [N(0), n3, P4, P5, H7] },
  };
  function scaleWidget(host) {
    var setName = host.getAttribute("data-set") || "hein", w = { kind: "scale", host: host };
    var ids = Object.keys(SCALES).filter(function (k) { return setName === "all" || SCALES[k].set === setName; });
    var sel = el("select", "form-select form-select-sm bz-sel"); opt(sel, ids.map(function (k) { return [k, SCALES[k].name]; }), host.getAttribute("data-start") || ids[0]);
    var tools = el("div", "bz-tools"), src = el("div", "bz-src"), box = el("div", "bz-strip"), names = el("div", "bz-names");
    tools.appendChild(sel); host.appendChild(tools); host.appendChild(box); host.appendChild(names); host.appendChild(src);
    var bPiano = btn("▶ On the piano keys", function () { w.play(false); }), bShade = btn("▶ Shaded", function () { w.play(true); });
    tools.appendChild(bPiano); tools.appendChild(bShade);
    function cur() { return SCALES[sel.value]; }
    function noteSpec(n, shaded, d) {
      if (!shaded || n.lo == null) return { c: Math.round(n.c / 100) * 100, d: d };
      if (n.from != null) return { c: n.from, d: d * 1.5, p: [[0, n.from], [0.1, n.from], [0.3, n.t]] };
      return { c: n.c, d: d };
    }
    w.play = function (shaded) {
      need([S.lead]).then(function () {
        var ns = cur().notes, up = ns.concat([N(cur().span ? ns[ns.length - 1].c + 0 : 1200)]).filter(function (n, i, a) { return i < a.length - 1 || !cur().span; });
        var list = up.concat(up.slice(0, -1).reverse()).map(function (n, i, a) { return noteSpec(n, shaded, i === a.length - 1 ? 1.1 : 0.42); });
        seq(list);
      });
    };
    w.redraw = function () {
      var sc = cur(), span = sc.span || 1200, lo = Math.min(0, sc.notes[0].c), W = 660, H = 92, x = function (c) { return 18 + (c - lo) / (span - lo) * (W - 36); };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + sc.name + ' on a line of cents">';
      s += '<line x1="18" x2="' + (W - 18) + '" y1="40" y2="40" class="bz-line"/>';
      for (var c = Math.ceil(lo / 100) * 100; c <= span; c += 100) s += '<line x1="' + x(c) + '" x2="' + x(c) + '" y1="34" y2="46" class="bz-tick"/><text x="' + x(c) + '" y="62" class="bz-kt">' + degOf(c) + '</text><text x="' + x(c) + '" y="76" class="bz-kc">' + noteName(Math.round(c / 100), S.key) + '</text>';
      sc.notes.forEach(function (n, i) {
        if (n.lo != null) s += '<rect x="' + x(n.lo) + '" y="28" width="' + Math.max(3, x(n.hi) - x(n.lo)) + '" height="24" rx="4" class="bz-area bz-a1"/>';
        (n.pts || []).forEach(function (p) { s += '<circle cx="' + x(p) + '" cy="40" r="3" class="bz-pt"/>'; });
        s += '<circle cx="' + x(n.c) + '" cy="40" r="8" class="bz-dot" data-i="' + i + '"/>';
      });
      s += '<text x="18" y="16" class="bz-at" style="text-anchor:start">dots: notes · bands: pitch areas · ticks: piano keys</text></svg>';
      box.innerHTML = s;
      box.querySelectorAll(".bz-dot").forEach(function (d) { d.style.cursor = "pointer"; d.addEventListener("click", function () { var n = sc.notes[+d.getAttribute("data-i")]; need([S.lead]).then(function () { seq([noteSpec(n, true, 0.9)]); }); }); });
      names.textContent = sc.notes.map(function (n) { var near = Math.round(n.c / 100) * 100, off = Math.round(n.c - near); return degOf(n.c) + (n.lo != null && off ? (off > 0 ? "↑" : "↓") : "") + " " + noteName(near / 100, S.key); }).join("   ");
      src.textContent = sc.src;
      bShade.disabled = !sc.notes.some(function (n) { return n.lo != null; });
    };
    sel.onchange = w.redraw; w.sel = sel; w.redraw(); return w;
  }

  // ---------- chorus: a 12-bar, a scale chosen for each bar ----------
  var CHOICE = [["47", "Majorish 4-7"], ["26", "Majorish 2-6"], ["minorish", "Minorish"], ["neutral", "Neutral"], ["root", "Key note only"], ["rest", "Rest"]];
  var POOL = { "47": SCALES.p47.notes, "26": SCALES.p26.notes, minorish: SCALES.minorish.notes, neutral: SCALES.neutral.notes };
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var RHY = [[[0, 1], [1, 0.67], [1.67, 1.33]], [[0.67, 0.33], [1, 1], [2, 2]], [[0, 0.67], [0.67, 0.33], [1, 0.67], [1.67, 0.33], [2, 2]], [[0, 2.5]], [[1, 0.67], [1.67, 2]]];
  function phraseFor(choice, barIdx, r, root) {
    if (choice === "rest") return [];
    if (choice === "root") return [0, 1, 2, 3].map(function (b) { return { at: b, len: 0.9, n: N(barIdx % 2 ? 1200 : 0) }; });
    var pool = POOL[choice].concat(POOL[choice].filter(function (n) { return n.c >= 680; }).map(function (n) { return shift(n, -1200); }), [N(1200)]).sort(function (a, b) { return a.c - b.c; });
    var rh = RHY[Math.floor(r() * RHY.length)]; if (barIdx % 2) rh = RHY[3 + Math.floor(r() * 2)];
    var i = pool.findIndex(function (n) { return n.c === 0; }) + Math.floor(r() * 3);
    var out = rh.map(function (x, k) { i = Math.max(0, Math.min(pool.length - 1, i + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 1.4)))); return { at: x[0], len: x[1], n: pool[i] }; });
    var target = ((root % 12) * 100), best = pool.reduce(function (a, n) { return Math.abs(n.c - target) < Math.abs(a.c - target) ? n : a; }, pool[0]);
    if (out.length) out[out.length - 1].n = (barIdx % 2) ? best : out[out.length - 1].n;
    return out;
  }
  function shift(n, by) { var m = {}; for (var k in n) m[k] = n[k]; ["c", "lo", "hi", "t", "from"].forEach(function (k) { if (m[k] != null) m[k] += by; }); return m; }
  function chorusWidget(host) {
    var formId = host.getAttribute("data-form") || "major", form = FORMS[formId], plan = (host.getAttribute("data-plan") || "47,47,47,47,26,26,47,47,26,26,47,47").split(",");
    var w = { kind: "chorus", host: host, plan: plan, seed: 1 }, grid = el("div", "bz-grid"), tools = el("div", "bz-tools");
    host.appendChild(tools); host.appendChild(grid);
    var cells = form.bars.map(function (b, i) {
      var cell = el("div", "bz-cell"), lab = el("div", "bz-chord"), s = el("select", "form-select form-select-sm");
      opt(s, CHOICE, plan[i] || "47"); s.onchange = function () { plan[i] = s.value; }; s.setAttribute("aria-label", "Scale in bar " + (i + 1));
      cell.appendChild(el("div", "bz-barno", String(i + 1))); cell.appendChild(lab); cell.appendChild(s); grid.appendChild(cell); return { cell: cell, lab: lab, sel: s };
    });
    w.redraw = function () { cells.forEach(function (c, i) { var ch = form.bars[i][0]; c.lab.textContent = noteName(ch.r, S.key) + (ch.q === "7" ? "7" : ch.q === "m7" ? "m7" : ch.q); }); };
    var play = btn("▶ Play the chorus with the band", function () {
      if (band.owner === w) { band.stop(); return; }
      var r = rng(w.seed);
      var phrases = form.bars.map(function (b, i) { return phraseFor(plan[i], i, r, b[0].r); });
      band.start(form, { owner: w, onBeat: function (bi, b, t, s) {
        var i = bi % 12; cells.forEach(function (c, k) { c.cell.classList.toggle("bz-live", k === i); });
        phrases[i].forEach(function (p) {
          if (Math.floor(p.at) !== b) return;
          var at = t + (p.at - b) * s, d = p.len * s, n = p.n;
          if (n.from != null) lead(n.from, d + 0.1, at, [[0, n.from], [Math.min(0.08, d * 0.2), n.from], [Math.min(0.3, d * 0.6), n.t]]);
          else lead(n.c, d + 0.05, at);
        });
      } }).then(function () { need([S.lead]); play.textContent = "■ Stop the chorus"; });
    });
    w.stopped = function () { play.textContent = "▶ Play the chorus with the band"; cells.forEach(function (c) { c.cell.classList.remove("bz-live"); }); };
    tools.appendChild(play);
    tools.appendChild(btn("New phrases", function () { w.seed++; if (band.owner === w) { band.stop(); play.click(); } }));
    tools.appendChild(btn("All one scale", function () { var v = cells[0].sel.value; cells.forEach(function (c, i) { c.sel.value = v; plan[i] = v; }); }));
    w.play = function () { play.click(); };
    w.redraw(); return w;
  }

  // ---------- chords ----------
  var CHSETS = {
    bluesscale: [["I7♯9", [0, 4, 10, 15]], ["♭IIImaj7", [3, 7, 10, 14]], ["IV7", [5, 9, 12, 15]], ["♯IV°7", [6, 9, 12, 15]], ["V7♯9", [-5, -1, 5, 10]], ["♭VII7", [-2, 2, 5, 8]],
                 ["All six in turn", "seq:0,1,2,3,4,5"]],
    dim: [["I7", [0, 4, 7, 10]], ["I°7", [0, 3, 6, 9]], ["IV7", [5, 9, 12, 15]], ["I7 ↔ I°7, back and forth", "seq:0,1,0,1,0,1,0"],
          ["ii7", [2, 5, 9, 12]], ["♯ii°7", [3, 6, 9, 12]], ["I7 – ii7 – ♯ii°7 – I7", "seq:0,4,5,0"]],
    bvi: [["I7", [0, 4, 7, 10]], ["IV7", [5, 9, 12, 15]], ["♭VI7", [-4, 0, 3, 6]], ["V7", [-5, -1, 2, 5]], ["IV7 → I7", "seq:1,0"], ["♭VI7 → I7", "seq:2,0"], ["♭VI7 → V7 → I7", "seq:2,3,0"]],
    hendrix: [["I7", [0, 4, 7, 10]], ["Im7", [0, 3, 7, 10]], ["I7♯9 (both 3rds)", [0, 4, 10, 15]], ["Split: I7 low, Im7 an octave up", [0, 4, 7, 10, 12, 15, 19, 22]],
              ["V7♯9 → I (the other job)", "seq:5,6"], ["V7♯9", [-5, -1, 5, 10]], ["I", [0, 4, 7, 12]]],
    ending: [["I7", [0, 4, 7, 10]], ["IV7", [5, 9, 12, 15]], ["V7", [-5, -1, 2, 5]], ["I", [0, 4, 7, 12]], ["IV7 → I7 (a blues ending)", "seq:1,0"], ["V7 → I (a hymn ending)", "seq:2,3"]],
  };
  function chordsWidget(host) {
    var set = CHSETS[host.getAttribute("data-set") || "bluesscale"], w = { kind: "chords", host: host }, row = el("div", "bz-presets"), info = el("div", "bz-names");
    host.appendChild(row); host.appendChild(info);
    var inst = host.getAttribute("data-sound") || "piano";
    function play1(v, t, d) { chord(v, t, d, inst, 0.5); bank.play("bass", { midi: 28 + ((S.key - 4 + 12) % 12) + ((v[0] % 12) + 12) % 12, dur: d, vel: 0.6 }, t, master); }
    set.forEach(function (it, i) {
      var b = btn("▶ " + it[0], function () {
        need([inst, "bass"]).then(function () {
          var t = ensure().currentTime + 0.05;
          if (typeof it[1] === "string") { it[1].slice(4).split(",").forEach(function (k, j, a) { var v = set[+k][1]; play1(v, t, j === a.length - 1 ? 2.4 : 1.4); t += 1.5; }); }
          else play1(it[1], t, 2.4);
          if (typeof it[1] !== "string") info.textContent = it[0] + " in " + noteName(0, S.key) + ": " + it[1].map(function (s) { return noteName(s, S.key); }).filter(function (n, j, a) { return a.indexOf(n) === j; }).join(" ");
        });
      });
      row.appendChild(b);
    });
    w.play = function (i) { row.querySelectorAll("button")[i].click(); };
    w.redraw = function () { info.textContent = ""; };
    return w;
  }

  // ---------- Green Onions: which modes hold each chord ----------
  var MODES = [["Dorian", [0, 2, 3, 5, 7, 9, 10]], ["Aeolian (natural minor)", [0, 2, 3, 5, 7, 8, 10]], ["Mixolydian", [0, 2, 4, 5, 7, 9, 10]], ["Ionian (major)", [0, 2, 4, 5, 7, 9, 11]]];
  function onionsWidget(host) {
    var form = FORMS.onions, w = { kind: "onions", host: host }, tools = el("div", "bz-tools"), grid = el("div", "bz-grid bz-onion"), key = el("div", "bz-legend");
    host.appendChild(tools); host.appendChild(grid); host.appendChild(key);
    key.innerHTML = MODES.map(function (m, i) { return '<span class="bz-chip bz-m' + i + '">' + m[0] + "</span>"; }).join(" ") + ' <span class="bz-chip bz-none">none of these</span>';
    w.modesOf = function (ch) { var pcs = Q[ch.q].map(function (x) { return (ch.r + x) % 12; }); return MODES.map(function (m, i) { return pcs.every(function (p) { return m[1].indexOf(p) >= 0; }) ? i : -1; }).filter(function (i) { return i >= 0; }); };
    var cells = [];
    w.redraw = function () {
      grid.innerHTML = ""; cells = form.bars.map(function (b, i) {
        var cell = el("div", "bz-cell"); cell.appendChild(el("div", "bz-barno", String(i + 1)));
        b.forEach(function (ch) { var ms = w.modesOf(ch), d = el("div", "bz-och"); d.textContent = noteName(ch.r, S.key) + ({ m7: "m7", maj: "", "7": "7" }[ch.q]);
          var chips = el("div"); (ms.length ? ms : [-1]).forEach(function (m) { chips.appendChild(el("span", "bz-dotm " + (m < 0 ? "bz-none" : "bz-m" + m))); }); d.appendChild(chips); cell.appendChild(d); });
        grid.appendChild(cell); return cell;
      });
    };
    var play = btn("▶ Play the riff on a 12-bar", function () {
      if (band.owner === w) { band.stop(); return; }
      band.start(form, { owner: w, onBeat: function (bi) { cells.forEach(function (c, k) { c.classList.toggle("bz-live", k === bi % 12); }); } }).then(function () { play.textContent = "■ Stop"; });
    });
    w.stopped = function () { play.textContent = "▶ Play the riff on a 12-bar"; cells.forEach(function (c) { c.classList.remove("bz-live"); }); };
    tools.appendChild(play); w.play = function () { play.click(); }; w.redraw(); return w;
  }

  // ---------- harmonica ----------
  var BLOW = [0, 4, 7, 12, 16, 19, 24, 28, 31, 36], DRAW = [2, 7, 11, 14, 17, 21, 23, 26, 29, 33], DBEND = [1, 2, 3, 1, 0, 1, 0, 0, 0, 0], BBEND = [0, 0, 0, 0, 0, 0, 0, 1, 1, 2];
  var POS = [["0", "1st position (straight harp: key of the harp)"], ["7", "2nd position (cross harp: a 5th up)"], ["2", "3rd position (a whole step up)"]];
  function harpWidget(host) {
    var w = { kind: "harp", host: host, harpKey: 0, pos: 7 }, tools = el("div", "bz-tools"), box = el("div", "bz-harp"), info = el("div", "bz-names");
    var hk = el("select", "form-select form-select-sm bz-sel"); opt(hk, KEYS.concat([["1", "D♭"], ["3", "E♭"], ["8", "A♭"]]), 0); hk.setAttribute("aria-label", "Key of the harmonica");
    var ps = el("select", "form-select form-select-sm bz-sel"); opt(ps, POS, 7); ps.setAttribute("aria-label", "Position");
    tools.appendChild(el("span", "bz-lbl", "Harp in")); tools.appendChild(hk); tools.appendChild(ps);
    host.appendChild(tools); host.appendChild(box); host.appendChild(info);
    var acts = el("div", "bz-presets"); host.appendChild(acts);
    function base() { return 60 + (((w.harpKey + 6) % 12) - 6); }
    function playIt(semis, bendTo, d) {
      need(["harmonica"]).then(function () { var t = ensure().currentTime + 0.04, spec = { midi: base() + semis, dur: d || 1, vel: 0.75 };
        if (bendTo != null) spec.bend = [[0, 0], [0.08, 0], [0.32, bendTo - semis]];
        bank.play("harmonica", spec, t, master); });
    }
    function tonicPc() { return (w.harpKey + w.pos) % 12; }
    function lab(semis) { var d = ((semis - w.pos) % 12 + 12) % 12; return noteName(semis + w.harpKey - tonicPc(), tonicPc()) + '<tspan class="bz-hd"> ' + DEG[d] + "</tspan>"; }
    w.redraw = function () {
      var W = 640, cw = 60, s = '<svg viewBox="0 0 ' + W + ' 280" width="100%" role="img" aria-label="ten-hole harmonica"><g transform="translate(0,30)">';
      s += '<text x="6" y="58" class="bz-at" style="text-anchor:start">blow</text><text x="6" y="132" class="bz-at" style="text-anchor:start">draw</text><text x="6" y="176" class="bz-at" style="text-anchor:start">bends</text>';
      for (var h = 0; h < 10; h++) {
        var x = 34 + h * cw;
        for (var k = BBEND[h]; k >= 1; k--) s += '<g class="bz-hole bz-bend" data-n="' + BLOW[h] + '" data-to="' + (BLOW[h] - k) + '"><rect x="' + (x + 4) + '" y="' + (30 - k * 22) + '" width="' + (cw - 8) + '" height="20" rx="4"/><text x="' + (x + cw / 2) + '" y="' + (44 - k * 22) + '">' + lab(BLOW[h] - k) + '</text></g>';
        s += '<g class="bz-hole" data-n="' + BLOW[h] + '"><rect x="' + (x + 2) + '" y="38" width="' + (cw - 4) + '" height="30" rx="4"/><text x="' + (x + cw / 2) + '" y="58">' + lab(BLOW[h]) + '</text></g>';
        s += '<rect x="' + (x + 8) + '" y="74" width="' + (cw - 16) + '" height="30" rx="3" class="bz-slot"/><text x="' + (x + cw / 2) + '" y="94" class="bz-kt">' + (h + 1) + '</text>';
        s += '<g class="bz-hole" data-n="' + DRAW[h] + '"><rect x="' + (x + 2) + '" y="112" width="' + (cw - 4) + '" height="30" rx="4"/><text x="' + (x + cw / 2) + '" y="132">' + lab(DRAW[h]) + '</text></g>';
        for (var j = 1; j <= DBEND[h]; j++) s += '<g class="bz-hole bz-bend" data-n="' + DRAW[h] + '" data-to="' + (DRAW[h] - j) + '"><rect x="' + (x + 4) + '" y="' + (126 + j * 22 + 4) + '" width="' + (cw - 8) + '" height="20" rx="4"/><text x="' + (x + cw / 2) + '" y="' + (126 + j * 22 + 18) + '">' + lab(DRAW[h] - j) + '</text></g>';
      }
      s += '</g></svg>'; box.innerHTML = s;
      box.querySelectorAll(".bz-hole").forEach(function (g) {
        if ((((+g.getAttribute("data-to") || +g.getAttribute("data-n")) - w.pos) % 12 + 12) % 12 === 0) g.classList.add("bz-tonic");
        g.addEventListener("click", function () { var n = +g.getAttribute("data-n"), to = g.getAttribute("data-to"); playIt(n, to == null ? null : +to); });
      });
      info.textContent = "Key of the music: " + noteName(0, tonicPc()) + ". Labels: the note, then its degree in that key. Shaded holes are the key note. A bend (lower rows) is played by sliding down from the unbent note.";
    };
    hk.onchange = function () { w.harpKey = +hk.value; w.redraw(); }; ps.onchange = function () { w.pos = +ps.value; w.redraw(); };
    function chordOf(list, d) { need(["harmonica"]).then(function () { var t = ensure().currentTime + 0.04; list.forEach(function (n) { bank.play("harmonica", { midi: base() + n, dur: d || 1.6, vel: 0.5 }, t, master); }); }); }
    acts.appendChild(btn("▶ Blow holes 1-4", function () { chordOf(BLOW.slice(0, 4)); }));
    acts.appendChild(btn("▶ Draw holes 1-4", function () { chordOf(DRAW.slice(0, 4)); }));
    acts.appendChild(btn("▶ Draw holes 1-6", function () { chordOf(DRAW.slice(0, 6)); }));
    acts.appendChild(btn("▶ Cross-harp blues scale", function () {
      need(["harmonica"]).then(function () { var t = ensure().currentTime + 0.05, b = base();
        [[7, null], [11, 10], [12, null], [14, 13], [14, null], [17, null], [19, null]].forEach(function (n, i, a) { var spec = { midi: b + n[0], dur: i === a.length - 1 ? 1 : 0.5, vel: 0.75 }; if (n[1] != null) spec.bend = [[0, 0], [0.06, n[1] - n[0]]]; bank.play("harmonica", spec, t, master); t += 0.5; }); });
    }));
    acts.appendChild(btn("▶ Hole 3 draw, bent partway (a neutral 3rd in 2nd position)", function () { playIt(11, 10.5, 1.6); }));
    w.redraw(); return w;
  }

  // ---------- quiz ----------
  var QUIZ = {
    third: { q: "Over a power chord (no 3rd in it), a bend on the 3rd. Where does it land?", a: [["minorish", "Minorish", 320], ["neutral", "Neutral", 350], ["majorish", "Majorish", 386]],
      play: function (ans) { var t = ensure().currentTime + 0.05; chord([0, 7, 12], t, 2.6, "piano", 0.45); lead(300, 2.2, t + 0.5, [[0, 300], [0.12, 300], [0.34, ans[2]]]); }, needs: ["piano"] },
    scale: { q: "Which scale is this, up and down on the piano keys?", a: [["aebersold", "The blues scale"], ["majorblues", "Major blues"], ["minorpent", "Minor pentatonic"], ["dorian", "Dorian"], ["mixolydian", "Mixolydian"]],
      play: function (ans) { var ns = SCALES[ans[0]].notes.map(function (n) { return n.c; }).concat([1200]); var l = ns.concat(ns.slice(0, -1).reverse()).map(function (c, i, a) { return { c: c, d: i === a.length - 1 ? 1 : 0.36 }; }); seq(l); }, needs: [] },
    chord: { q: "Which chord is this, over the key note?", a: [["I7", "I7", [0, 4, 7, 10]], ["Im7", "Im7", [0, 3, 7, 10]], ["I7#9", "I7♯9 (both 3rds)", [0, 4, 10, 15]], ["Idim7", "I°7", [0, 3, 6, 9]], ["bVI7", "♭VI7", [-4, 0, 3, 6]]],
      play: function (ans) { var t = ensure().currentTime + 0.05; chord(ans[2], t, 2.2, "piano", 0.5); bank.play("bass", { midi: 28 + ((S.key - 4 + 12) % 12), dur: 2.2, vel: 0.6 }, t, master); }, needs: ["piano", "bass"] },
  };
  function quizWidget(host) {
    var kind = host.getAttribute("data-kind") || "third", Qz = QUIZ[kind], w = { kind: "quiz", host: host, right: 0, asked: 0 }, r = Math.random;
    var q = el("div", "bz-q", Qz.q), row = el("div", "bz-presets"), fb = el("div", "bz-fb"), tools = el("div", "bz-tools"), score = el("span", "bz-score");
    host.appendChild(q); host.appendChild(tools); host.appendChild(row); host.appendChild(fb);
    var item = null, cur = null, t0 = 0, done = false;
    function ask() {
      cur = Qz.a[Math.floor(r() * Qz.a.length)]; done = false; fb.textContent = ""; t0 = Date.now();
      row.querySelectorAll("button").forEach(function (b) { b.classList.remove("bz-right", "bz-wrong"); });
      item = global.SiteRecord ? global.SiteRecord.add("blues-tonality", { ex: "Blues tonality: " + kind, q: { text: Qz.q }, want: cur[1] }) : null;
      again();
    }
    function again() { need(Qz.needs.concat([S.lead])).then(function () { Qz.play(cur); }); }
    w.answer = function (id) {
      if (!cur || done) return; var ok = id === cur[0];
      if (item) { item.at.push([id, ok ? 1 : 0, Math.round((Date.now() - t0) / 1000)]); global.SiteRecord.save(); }
      var b = row.querySelector('[data-a="' + id + '"]'); if (b) b.classList.add(ok ? "bz-right" : "bz-wrong");
      if (ok) { done = true; w.right++; } if (ok || !item || item.at.length === 1) w.asked += item && item.at.length > 1 ? 0 : 1;
      fb.textContent = ok ? "Right: " + cur[1] + "." : "Not that one. Listen again (▶ Again) or show the answer.";
      score.textContent = w.right + " right of " + w.asked;
    };
    Qz.a.forEach(function (a) { var b = btn(a[1], function () { w.answer(a[0]); }); b.setAttribute("data-a", a[0]); row.appendChild(b); });
    tools.appendChild(btn("▶ New question", ask)); tools.appendChild(btn("▶ Again", function () { if (cur) again(); }));
    tools.appendChild(btn("Show the answer", function () { if (!cur) return; if (item) { item.rv = 1; global.SiteRecord.save(); } done = true; fb.textContent = "It was: " + cur[1] + "."; }));
    tools.appendChild(score);
    w.current = function () { return cur && cur[0]; }; w.ask = ask; w.redraw = function () {};
    return w;
  }

  var KINDS = { zone: zoneWidget, scale: scaleWidget, chorus: chorusWidget, chords: chordsWidget, onions: onionsWidget, harp: harpWidget, quiz: quizWidget };
  var BT = { widgets: [], band: band, FORMS: FORMS, SCALES: SCALES, ZONES: ZONES, state: S, noteName: noteName, modes: MODES };
  function init() {
    buildBar();
    doc.querySelectorAll("div.bz[data-w]").forEach(function (host) {
      var k = KINDS[host.getAttribute("data-w")];
      if (!k) { host.textContent = "Unknown widget " + host.getAttribute("data-w"); return; }
      try { var t = host.getAttribute("data-title"); if (t) host.appendChild(el("div", "bz-title", t)); BT.widgets.push(k(host)); }
      catch (e) { console.error(e); host.textContent = "This widget failed to build: " + e.message; }
    });
  }
  global.BluesTonality = BT;
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})(window);
