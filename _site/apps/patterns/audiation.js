// audiation.js — Partial Synthesis, Generalization-aural/oral (same or different) and Generalization-verbal (translate to
// solfège) by ear, for practice/audiation.qmd. No notation is shown: these levels come before reading.
//
// Data: tonal patterns from pattern-set.js (patternObject), rhythm patterns from rhythm-pattern-object.js (rhythmPatternObject).
// "Familiar" = Mullen's familiar sets (FPIFO, The Literate Musician pp. 57, 59) and the site's duple / triple macro-micro sets;
// "unfamiliar" = the Register-style sets (322a, 322b, 322b-major) cut to tonic and dominant patterns.
// Sound goes through AbcPlay (the band's samples); each pattern is its own short tune, so there is a real pause between patterns.
//
// Pure helpers (loads in Node for tests/patterns/audiation.test.js; needs abc-core.js + abc-events.js):
//   Audiation.tonalSet(id)          -> { id, mode, rest (midi of the resting tone as written), patterns: [{ midis, sol, chord, fn }] }
//   Audiation.solfege(midi, rest, mode) -> "do" | "la" | ...   (movable DO, LA-based minor, RE Dorian, SO Mixolydian)
//   Audiation.rhythmSet(id)         -> { id, meter: "duple" | "triple", patterns: [{ abc, syl }] }
//   Audiation.rhythmSyllables(abc)  -> "Du De Du | ..."  (Gordon/Froseth syllables: duple Du De Ta, triple Du Da Di Ta)
//   Audiation.toAbc(midis, qpm)     -> ABC of equal-length notes (one per beat) for playing a tonal pattern
//   Audiation.tonalSequence(mode, rest) -> midis of the tonality-establishing sequence (Gordon / Mullen: 5 6 5 4 3 2 7 1)
(function (global) {
  "use strict";
  var Events = global.AbcEvents || (typeof require === "function" ? require("../shared/abc-events.js") : null);

  // ---------- tonal ----------
  var DO_FROM_REST = { major: 0, minor: 3, dorian: -2, mixolydian: -7 };     // semitones from the resting tone to DO
  var SYL = ["do", "di", "re", "me", "mi", "fa", "fi", "so", "si", "la", "te", "ti"];
  function solfege(midi, rest, mode) {
    var d = DO_FROM_REST[mode] || 0;
    return SYL[(((midi - rest - d) % 12) + 24) % 12];
  }
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function keyOf(abc) {
    var m = /^K:\s*([A-G])([#b]?)\s*([A-Za-z]*)/m.exec(abc); if (!m) return null;
    var pc = PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0), md = m[3].toLowerCase();
    var mode = /^mix/.test(md) ? "mixolydian" : /^dor/.test(md) ? "dorian" : /^m(in)?$/.test(md) ? "minor" : "major";
    return { pc: (pc + 12) % 12, mode: mode };
  }
  function tunes(src) { return String(src || "").split(/\n(?=X:)/).filter(function (t) { return /X:/.test(t); }); }
  function fnOf(chord, rest, mode) {
    var r = /^([A-G])([#b]?)/.exec(chord || ""); if (!r) return "";
    var d = ((PC[r[1]] + (r[2] === "#" ? 1 : r[2] === "b" ? -1 : 0) - rest) % 12 + 12) % 12;
    var names = { major: { 0: "tonic", 7: "dominant", 5: "subdominant" }, minor: { 0: "tonic", 7: "dominant", 5: "subdominant" },
                  dorian: { 0: "tonic", 10: "subtonic", 5: "subdominant" }, mixolydian: { 0: "tonic", 10: "subtonic", 5: "subdominant", 2: "dominant" } };
    return (names[mode] || {})[d] || "";
  }
  // which sets, and which chords to keep from them (null = all)
  var TONAL = {
    "major": { src: "mullen-fpifo-major" }, "minor": { src: "mullen-fpifo-minor" },
    "major-u": { src: "322b-major", keep: ["D", "A7"] }, "minor-u": { src: ["322a", "322b"], keep: ["Dm", "A7"] },
    "dorian": { src: "323a" }, "mixolydian": { src: "324a" },
    "major-step": { src: "major-stepwise" }, "minor-step": { src: "minor-stepwise" }     // Mullen's stepwise FPIFO (MLT Books, Unit 9)
  };
  function tonalSet(id, obj) {
    obj = obj || global.patternObject || (typeof patternObject !== "undefined" ? patternObject : {});
    var def = TONAL[id]; if (!def) throw new Error("no tonal set " + id);
    var srcs = [].concat(def.src), out = [], mode = null, rest = null;
    srcs.forEach(function (s) {
      tunes(obj[s]).forEach(function (t) {
        var k = keyOf(t); mode = k.mode;
        var chord = (/"([^"]+)"/.exec(t) || [])[1] || "";
        if (def.keep && def.keep.indexOf(chord) < 0) return;
        var midis = Events.fromAbc(t).sounding.map(function (e) { return e.pitches[0].midi; });
        out.push({ midis: midis, chord: chord, fn: fnOf(chord, k.pc, k.mode), abc: t });
      });
    });
    // the resting tone in the patterns' own octave: the highest pitch of the key's tonic class at or below their middle
    var all = [].concat.apply([], out.map(function (p) { return p.midis; })).sort(function (a, b) { return a - b; });
    var mid = all[Math.floor(all.length / 2)], pc = keyOf(tunes(obj[srcs[0]])[0]).pc;
    rest = mid - ((((mid - pc) % 12) + 12) % 12);
    out.forEach(function (p) { p.sol = p.midis.map(function (m) { return solfege(m, rest, mode); }).join(" "); });
    // dedupe (322a and 322b share some patterns)
    var seen = {}; out = out.filter(function (p) { var k = p.midis.join(","); if (seen[k]) return false; seen[k] = 1; return true; });
    return { id: id, mode: mode, rest: rest, patterns: out };
  }
  // 5 6 5 4 3 2 7 1 of the tonality, ending on the resting tone (Gordon's tonal sequence; Mullen's "565-4327, extension 1")
  function tonalSequence(mode, rest) {
    var seq = { major: [7, 9, 7, 5, 4, 2, -1, 0], minor: [7, 8, 7, 5, 3, 2, -1, 0],
                dorian: [7, 9, 7, 5, 3, 2, -2, 0], mixolydian: [7, 9, 7, 5, 4, 2, -2, 0] }[mode];
    return seq.map(function (d) { return rest + d; });
  }
  var NAMES = ["=C", "^C", "=D", "_E", "=E", "=F", "^F", "=G", "_A", "=A", "_B", "=B"];
  function abcNote(m) {
    var n = NAMES[((m % 12) + 12) % 12], oct = Math.floor(m / 12) - 5, s = n;
    if (oct >= 1) { s = n.slice(0, -1) + n.slice(-1).toLowerCase(); for (var i = 1; i < oct; i++) s += "'"; }
    else for (var j = 0; j < -oct; j++) s += ",";
    return s;
  }
  function toAbc(midis, qpm) {
    return "X:1\nM:none\nL:1/4\nQ:1/4=" + (qpm || 90) + "\nK:C\n" + midis.map(abcNote).join(" ") + " |]";
  }

  // ---------- rhythm ----------
  var RHYTHM = { "duple": "Duple-M-m-2-4", "triple": "Triple-M-m-6/8", "duple-d": "Duple-M-m-D-2/4", "triple-d": "Triple-M-m-D-6/8" };
  function rhythmSyllables(abc) {
    var RC0 = global.RhythmChant || (typeof require === "function" ? (function () { try { return require("../shared/rhythm-chant.js"); } catch (x) { return null; } })() : null);
    if (RC0 && RC0.syllables) return RC0.syllables(abc).replace(/ \| /g, " | ");
    abc = abc.replace(/([A-Ga-gz][,']*)\/\/(?![0-9])/g, "$1/4");          // "B//" (a sixteenth) is read as B/4
    var r = Events.fromAbc(abc), triple = /M:\s*6\/8/.test(abc), mac = triple ? 1.5 : 1, out = [], bar = -1, eps = 1e-6;
    // macrobeats from RhythmChant.beats (rhythm-chant.js), so the "Du"s are the notes the chant stresses; without it, quarters / dotted quarters
    var RC = global.RhythmChant || (typeof require === "function" ? (function () { try { return require("../shared/rhythm-chant.js"); } catch (x) { return null; } })() : null);
    var B = RC && RC.beats ? RC.beats(abc) : null;
    var barOf = {}; r.written.forEach(function (w) { barOf[w.id] = w.bar; });
    r.sounding.forEach(function (e) {
      var b = e.bar !== undefined ? e.bar : barOf[(e.from || [e.id])[0]];
      if (b !== undefined && b !== bar && bar >= 0) out.push("|");
      if (b !== undefined) bar = b;
      var f = ((e.t_on % mac) + mac) % mac / mac, syl = "?", tr = triple;
      if (B) { var k = B.length - 1; while (k > 0 && e.t_on < B[k].t - eps) k--; f = (e.t_on - B[k].t) / B[k].len; tr = B[k].triple; if (f > 1 - eps) f = 0; }
      var triple_ = tr;
      function at(x) { return Math.abs(f - x) < eps; }
      if (at(0)) syl = "Du";
      else if (!triple_) syl = at(0.5) ? "De" : (at(0.25) || at(0.75)) ? "Ta" : "?";
      else syl = at(1 / 3) ? "Da" : at(2 / 3) ? "Di" : (at(1 / 6) || at(0.5) || at(5 / 6)) ? "Ta" : "?";
      out.push(syl);
    });
    return out.join(" ").replace(/ \| /g, " | ");
  }
  function rhythmSet(id, obj) {
    obj = obj || global.rhythmPatternObject || (typeof rhythmPatternObject !== "undefined" ? rhythmPatternObject : {});
    var src = RHYTHM[id]; if (!src) throw new Error("no rhythm set " + id);
    return { id: id, meter: /^triple/.test(id) ? "triple" : "duple",
             patterns: tunes(obj[src]).map(function (t) { return { abc: t, syl: rhythmSyllables(t) }; }) };
  }
  // a rhythm pattern's music with a fixed pitch and its own meter, for playing
  function rhythmAbc(abc, pitch) {
    var head = abc.split("\n").filter(function (l) { return /^(M|L):/.test(l); }).join("\n");
    var body = abc.split("\n").filter(function (l) { return l.trim() && !/^[A-Za-z]:/.test(l) && !/^%/.test(l); }).join(" ");
    return "X:1\n" + head + "\nK:C clef=none\n" + body.replace(/B/g, function () { return pitch || "B"; });
  }
  // establish meter: two bars of microbeats, then two of macrobeats (the site's own chant on "bah")
  function rhythmSequence(meter, pitch) {
    var abc = meter === "triple" ? "X:1\nM:6/8\nL:1/8\nK:C clef=none\nBBB BBB | BBB BBB | B3 B3 | B3 z3 |]"
                                 : "X:1\nM:2/4\nL:1/8\nK:C clef=none\nBB BB | BB BB | B2 B2 | B2 z2 |]";
    return pitch ? abc.replace(/B/g, function () { return pitch; }) : abc;
  }

  // ---------- small helpers ----------
  function pick(a, rnd) { return a[Math.floor((rnd || Math.random)() * a.length)]; }
  function shuffle(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor((rnd || Math.random)() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // a series of n distinct patterns that has more than one function in it when the set allows
  function series(set, n, rnd) {
    for (var tries = 0; tries < 40; tries++) {
      var s = shuffle(set.patterns, rnd).slice(0, n), fns = {};
      s.forEach(function (p) { fns[p.fn || p.syl] = 1; });
      if (Object.keys(fns).length > 1 || tries > 30) return s;
    }
    return s;
  }
  // a different pattern for "same or different": same number of notes when one exists
  function differentFrom(set, p, rnd) {
    var key = function (x) { return x.midis ? x.midis.join(",") : x.syl; };
    var others = set.patterns.filter(function (q) { return key(q) !== key(p); });
    var close = others.filter(function (q) { return q.midis ? q.midis.length === p.midis.length : true; });
    return pick(close.length ? close : others, rnd);
  }

  // ---------- pitch range (the singer's own) ----------
  // Resting tones are chosen so that a whole set, and the tonal sequence, sit between low and high (MIDI).
  var KEY_PCS = [2, 3, 4, 5, 7];                                 // D Eb E F G: the resting tones the page offers
  var RANGE_PRESETS = { treble: { low: 57, high: 76, label: "Treble voice (A3\u2013E5)" },
                        baritone: { low: 45, high: 64, label: "Changed voice / baritone (A2\u2013E4)" },
                        alto: { low: 53, high: 74, label: "Alto (F3\u2013D5)" } };
  var NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  function noteName(m) { return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  // semitones the set spans below and above its resting tone, with the tonality-establishing sequence included
  function spanOf(set) {
    var all = [];
    if (set && set.patterns) set.patterns.forEach(function (p) { if (p.midis) all = all.concat(p.midis); });
    if (!all.length) return { lo: 0, hi: 0 };
    if (set.mode) all = all.concat(tonalSequence(set.mode, set.rest));
    return { lo: Math.min.apply(null, all) - set.rest, hi: Math.max.apply(null, all) - set.rest };
  }
  // every resting tone (MIDI) whose pitch class is in pcs and that keeps the whole set between low and high
  function restsFor(set, low, high, pcs) {
    pcs = pcs || KEY_PCS; var sp = spanOf(set), out = [];
    for (var r = low - 12; r <= high + 12; r++) {
      if (pcs.indexOf(((r % 12) + 12) % 12) < 0) continue;
      if (r + sp.lo >= low && r + sp.hi <= high) out.push(r);
    }
    return out;
  }
  // { rest, fits }: a fitting resting tone (nearest `target` when given, else random), or when none fits the nearest fit
  function nearestRest(set, low, high, pcs, target, rnd) {
    pcs = pcs || KEY_PCS;
    var ok = restsFor(set, low, high, pcs);
    if (ok.length) {
      if (target != null) { ok.sort(function (a, b) { return Math.abs(a - target) - Math.abs(b - target); }); return { rest: ok[0], fits: true }; }
      return { rest: ok[Math.floor((rnd || Math.random)() * ok.length)], fits: true };
    }
    var sp = spanOf(set), mid = (low + high) / 2, best = null, bestCost = 1e9;
    for (var r = low - 12; r <= high + 12; r++) {
      if (pcs.indexOf(((r % 12) + 12) % 12) < 0) continue;
      var cost = Math.max(0, low - (r + sp.lo)) + Math.max(0, (r + sp.hi) - high) + Math.abs(r + (sp.lo + sp.hi) / 2 - mid) / 100;
      if (cost < bestCost) { bestCost = cost; best = r; }
    }
    return { rest: best, fits: false };
  }
  // the one pitch rhythm patterns are chanted on: the natural note nearest the middle of the range, as an ABC note
  function rhythmPitch(low, high) {
    var mid = Math.round((low + high) / 2), nat = [0, 2, 4, 5, 7, 9, 11], m = mid;
    for (var d = 0; d < 12; d++) {
      if (nat.indexOf(((mid - d) % 12 + 12) % 12) >= 0) { m = mid - d; break; }
      if (nat.indexOf(((mid + d) % 12 + 12) % 12) >= 0) { m = mid + d; break; }
    }
    return abcNote(m);
  }

  var api = { tonalSet: tonalSet, solfege: solfege, tonalSequence: tonalSequence, toAbc: toAbc, abcNote: abcNote,
              fits: fits, displayAbc: displayAbc, rhythmSet: rhythmSet, rhythmSyllables: rhythmSyllables, rhythmAbc: rhythmAbc, rhythmSequence: rhythmSequence,
              series: series, differentFrom: differentFrom, shuffle: shuffle, TONAL: TONAL, RHYTHM: RHYTHM };
  api.restsFor = restsFor; api.nearestRest = nearestRest; api.rhythmPitch = rhythmPitch; api.noteName = noteName; api.RANGE_PRESETS = RANGE_PRESETS;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.Audiation = api;
  if (typeof document === "undefined") return;

  // =====================================================================================================================
  // Page
  // =====================================================================================================================
  var KEYS = { D: 62, Eb: 63, E: 64, F: 65, G: 67 };     // resting tones in the singing range (Gordon: D above middle C upward)
  var SOUNDS = [["piano", "Piano"], ["flute", "Flute"], ["clarinet", "Clarinet"], ["trumpet", "Trumpet"], ["violin", "Violin"]];
  var LABEL = { major: "Major", minor: "Minor", dorian: "Dorian", mixolydian: "Mixolydian", duple: "Duple", triple: "Triple" };
  var REST_SYL = { major: "DO", minor: "LA", dorian: "RE", mixolydian: "SO" };
  var TONIC_SYL = { major: "DO MI SO", minor: "LA DO MI", dorian: "RE FA LA", mixolydian: "SO TI RE" };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var offDiv = null;
  function visual(abc) {
    if (!offDiv) { offDiv = el("div"); offDiv.style.cssText = "position:absolute;left:-9999px;width:600px"; document.body.appendChild(offDiv); }
    return ABCJS.renderAbc(offDiv, abc)[0];
  }
  // Play a list of { abc, qpm } one after another with gaps (ms). Returns { stop }. onEnd when all done (not when stopped).
  var running = 0;
  function playList(items, o) {
    var me = ++running, h = null, i = 0, PB = global.PlayBar;
    if (global.AbcPlay) AbcPlay.stop();
    function sd(on) { if (PB) PB.sounding("audiation-list", on ? function () { if (me === running) running++; if (h) try { h.stop(); } catch (e) {} } : null); }   // the bottom strip's Stop covers the gaps too
    sd(true);
    function next() {
      if (me !== running) return;
      if (i >= items.length) { sd(false); if (o.onEnd) o.onEnd(); return; }
      var it = items[i++];
      if (it.wait != null) { setTimeout(next, it.wait); return; }
      if (o.onItem) o.onItem(it);
      var after = function () { if (me !== running) return; setTimeout(next, it.gap != null ? it.gap : (o.gap || 700)); };
      var chantIt = it.rhythm && global.RhythmChant && (RhythmChant.enabled() || (it.syl && RhythmChant.syllablesOn()));
      if (chantIt) h = RhythmChant.play(it.abc, { qpm: it.qpm, onEnd: after, syllables: it.syl && RhythmChant.syllablesOn() ? "rhythm" : null });   // "Conversational" / "Syllables": rhythm-chant.js
      else h = AbcPlay.play(visual(it.abc), { sound: it.sound || o.sound, qpm: it.qpm, light: false, onEnd: after });
    }
    next();
    return { stop: function () { if (me === running) { running++; sd(false); } if (h) try { h.stop(); } catch (e) {} } };
  }
  function stopAll() { running++; if (global.AbcPlay) AbcPlay.stop(); if (global.RhythmChant) RhythmChant.stop(); }

  function controls(root, opts) {
    var bar = el("div", "au-grid");
    opts.forEach(function (o) {
      var lab = el("label", null, o.label + " ");
      var sel = el("select"); sel.className = "au-" + o.id;
      o.choices.forEach(function (c) { var op = el("option"); op.value = c[0]; op.textContent = c[1]; if (c[0] === o.value) op.selected = true; sel.appendChild(op); });
      lab.appendChild(sel); bar.appendChild(lab);
    });
    rangeControls(bar);
    if (global.RhythmChant && opts.some(function (o) { return o.choices.some(function (c) { return /^(duple|triple)/.test(c[0]); }); })) {   // a panel that plays rhythm patterns
      RhythmChant.scope("audiation", false); RhythmChant.checkbox(bar, { onchange: function () { if (global.RhythmChant) stopAll(); } });
    }
    root.appendChild(bar);
    var warn = el("div", "au-hint au-rangewarn"); root.appendChild(warn);
    return function (id) { return root.querySelector(".au-" + id).value; };
  }
  // one pitch range for the whole page, kept in localStorage; every panel's selects follow it
  var RANGE = { low: 57, high: 76, preset: "treble" };
  try {
    var saved = JSON.parse(localStorage.getItem("au-range") || "null");
    if (saved && isFinite(saved.low) && isFinite(saved.high) && saved.low >= 40 && saved.low <= 79 && saved.high >= 45 && saved.high <= 84 && saved.low + 5 <= saved.high) { RANGE.low = +saved.low; RANGE.high = +saved.high; RANGE.preset = presetOf(RANGE.low, RANGE.high); }
  } catch (e) {}
  function presetOf(lo, hi) { var k = "custom"; Object.keys(RANGE_PRESETS).forEach(function (n) { if (RANGE_PRESETS[n].low === lo && RANGE_PRESETS[n].high === hi) k = n; }); return k; }
  function syncRange() {
    [].forEach.call(document.querySelectorAll(".au-rpreset"), function (x) { x.value = RANGE.preset; });
    [].forEach.call(document.querySelectorAll(".au-rlow"), function (x) { x.value = RANGE.low; });
    [].forEach.call(document.querySelectorAll(".au-rhigh"), function (x) { x.value = RANGE.high; });
    try { localStorage.setItem("au-range", JSON.stringify({ low: RANGE.low, high: RANGE.high })); } catch (e) {}
  }
  function rangeControls(bar) {
    function sel(cls, label, from, to, onchange) {
      var lab = el("label", null, label + " "), s = el("select"); s.className = cls;
      for (var m = from; m <= to; m++) { var o = el("option"); o.value = m; o.textContent = noteName(m); s.appendChild(o); }
      s.onchange = function () { onchange(+s.value); syncRange(); };
      lab.appendChild(s); return { lab: lab, sel: s };
    }
    var plab = el("label", null, "Range "), ps = el("select"); ps.className = "au-rpreset";
    Object.keys(RANGE_PRESETS).concat("custom").forEach(function (k) { var o = el("option"); o.value = k; o.textContent = k === "custom" ? "Custom" : RANGE_PRESETS[k].label; ps.appendChild(o); });
    ps.onchange = function () { var r = RANGE_PRESETS[ps.value]; if (r) { RANGE.low = r.low; RANGE.high = r.high; } RANGE.preset = ps.value; syncRange(); };
    plab.appendChild(ps); bar.appendChild(plab);
    var lo = sel("au-rlow", "Lowest note", 40, 79, function (m) { RANGE.low = m; if (RANGE.high < m + 5) RANGE.high = m + 5; RANGE.preset = presetOf(RANGE.low, RANGE.high); });
    var hi = sel("au-rhigh", "Highest note", 45, 84, function (m) { RANGE.high = m; if (RANGE.low > m - 5) RANGE.low = m - 5; RANGE.preset = presetOf(RANGE.low, RANGE.high); });
    bar.appendChild(lo.lab); bar.appendChild(hi.lab);
    syncRange();
  }
  // a note about a range that is too narrow, shown in the panel
  function rangeNote(root, fits) {
    var w = root.querySelector(".au-rangewarn"); if (!w) return;
    w.textContent = fits ? "" : "This range (" + noteName(RANGE.low) + "\u2013" + noteName(RANGE.high) + ") is narrower than these patterns need, so I used the nearest fit; some notes fall outside it.";
  }
  function soundOpt() { return { id: "sound", label: "Sound", choices: SOUNDS, value: "piano" }; }
  function keyOpt() { return { id: "key", label: "Key", choices: [["random", "Any (changes)"], ["D", "D"], ["Eb", "E♭"], ["E", "E"], ["F", "F"], ["G", "G"]], value: "random" }; }
  // the resting tone for a key choice; "random" only picks keys that keep the set between A below and E above the treble staff's D-octave
  // The chosen key keeps its pitch class but moves by octaves into the page's range; restFor.fit says whether the set fits.
  function restFor(v, set) {
    var r = KEYS[v] ? nearestRest(set, RANGE.low, RANGE.high, [KEYS[v] % 12], KEYS[v]) : nearestRest(set, RANGE.low, RANGE.high);
    restFor.fit = r.fits; return r.rest;
  }
  restFor.fit = true;
  function tempoOpt(v) { return { id: "tempo", label: "Tempo", choices: [["70", "Slow"], ["90", "Medium"], ["110", "Quick"]], value: v || "90" }; }

  // tonal items, moved so the set's resting tone sounds on `rest`
  function tonalItems(set, pats, rest, qpm) {
    var sh = rest - set.rest;
    return pats.map(function (p) { return { abc: toAbc(p.midis.map(function (m) { return m + sh; }), qpm), qpm: qpm }; });
  }
  function tonalSeqItem(mode, rest, qpm) { return { abc: toAbc(tonalSequence(mode, rest), qpm * 2), qpm: qpm * 2, gap: 900 }; }
  function rhythmItems(set, pats, macro) {
    var qpm = set.meter === "triple" ? Math.round(macro * 1.5) : Math.round(macro);
    return pats.map(function (p) { return { abc: rhythmAbc(p.abc, rhythmPitch(RANGE.low, RANGE.high)), qpm: qpm, gap: 250, rhythm: true }; });
  }
  function rhythmSeqItem(meter, macro) { return { abc: rhythmSequence(meter, rhythmPitch(RANGE.low, RANGE.high)), qpm: meter === "triple" ? Math.round(macro * 1.5) : Math.round(macro), gap: 600, rhythm: true }; }

  function scoreLine(root) {
    var s = el("div", "au-score"), right = 0, all = 0; root.appendChild(s);
    function show() { s.textContent = all ? right + " of " + all + " right this time" : ""; }
    show();
    return { add: function (ok) { all++; if (ok) right++; show(); } };
  }

  // ---------- Partial Synthesis ----------
  function partialSynthesis(root) {
    var get = controls(root, [
      { id: "content", label: "Compare", choices: [["mm", "Major and minor"], ["dt", "Duple and triple"], ["dm", "Dorian and Mixolydian"]], value: "mm" },
      { id: "count", label: "Patterns in a series", choices: [["2", "2"], ["3", "3"], ["4", "4"]], value: "3" },
      keyOpt(), tempoOpt(), soundOpt()]);
    var bar = el("div", "au-bar"), play = el("button", "au-go", "▶ Play two series"), again = el("button", null, "Hear them again"),
        tell = el("button", null, "Tell me"), next = el("button", null, "Next");
    [play, again, tell, next].forEach(function (b) { b.type = "button"; bar.appendChild(b); });
    root.appendChild(bar);
    var status = el("div", "au-status"); root.appendChild(status);
    var answers = el("div", "au-answers"); root.appendChild(answers);
    var explain = el("div", "au-explain"); root.appendChild(explain);
    var score = scoreLine(root);
    var round = null;

    function build() {
      var c = get("content"), n = +get("count");
      if (c === "dt") {
        var sets = { duple: rhythmSet("duple"), triple: rhythmSet("triple") }, macro = +get("tempo") * 0.75;
        rangeNote(root, true);
        var picks = [pick(["duple", "triple"]), pick(["duple", "triple"])];
        round = { kind: "rhythm", choices: ["duple", "triple"], truth: picks, items: [], sets: sets, macro: macro, n: Math.min(n, 3) };
        round.series = picks.map(function (m) { return series(sets[m], round.n); });
      } else {
        var modes = c === "dm" ? ["dorian", "mixolydian"] : ["major", "minor"];
        var ts = {}; modes.forEach(function (m) { ts[m] = tonalSet(m); });
        var rest = restFor(get("key"), ts[modes[0]]);
        rangeNote(root, restFor.fit);
        var p2 = [pick(modes), pick(modes)];
        round = { kind: "tonal", choices: modes, truth: p2, sets: ts, rest: rest, qpm: +get("tempo"), n: n };
        round.series = p2.map(function (m) { return series(ts[m], n); });
      }
      round.answered = [null, null]; round.done = false;
      answers.innerHTML = ""; explain.innerHTML = "";
      [0, 1].forEach(function (k) {
        var row = el("div", "au-row", "<span class='au-n'>Series " + (k + 1) + "</span>");
        round.choices.forEach(function (ch) {
          var b = el("button", "au-choice", LABEL[ch]); b.type = "button";
          b.onclick = function () { answer(k, ch, b); };
          row.appendChild(b);
        });
        answers.appendChild(row);
      });
    }
    function items() {
      var out = [];
      round.series.forEach(function (s, k) {
        out.push({ wait: k ? 1400 : 0, label: k });
        if (round.kind === "tonal") out = out.concat(tonalItems(round.sets[round.truth[k]], s, round.rest, round.qpm));
        else out = out.concat(rhythmItems(round.sets[round.truth[k]], s, round.macro));
      });
      return out;
    }
    function playRound() {
      status.textContent = "Listen: series 1, then series 2. Don't sing along; audiate.";
      playList(items(), { sound: get("sound"), gap: round.kind === "tonal" ? 650 : 250,
        onEnd: function () { status.textContent = "Which tonality or meter was each series?"; } });
    }
    function why(k) {
      var m = round.truth[k];
      if (round.kind === "rhythm") return "Series " + (k + 1) + ": I was audiating " + (m === "duple" ? "two microbeats in each macrobeat, DU DE, so the meter is <b>duple</b>." : "three microbeats in each macrobeat, DU DA DI, so the meter is <b>triple</b>.");
      return "Series " + (k + 1) + ": I was audiating the resting tone " + REST_SYL[m] + " and the tonic pattern " + TONIC_SYL[m] + ", so the tonality is <b>" + LABEL[m].toLowerCase() + "</b>.";
    }
    function reveal() {
      explain.innerHTML = [0, 1].map(function (k) { return "<p>" + why(k) + "</p>"; }).join("") +
        (round.kind === "tonal" ? "<p class='au-hint'>Both series share one tonic pitch; only the resting tone changes. Partial synthesis is still taught: the answer is yours to keep, not to guess.</p>" : "");
      round.done = true;
    }
    function answer(k, ch, b) {
      if (round.answered[k] != null) return;
      round.answered[k] = ch; var ok = ch === round.truth[k];
      b.classList.add(ok ? "au-good" : "au-bad"); score.add(ok);
      if (!ok) [].forEach.call(b.parentNode.querySelectorAll(".au-choice"), function (x) { if (x.textContent === LABEL[round.truth[k]]) x.classList.add("au-good"); });
      if (round.answered[0] != null && round.answered[1] != null) reveal();
    }
    play.onclick = function () { build(); playRound(); };
    again.onclick = function () { if (!round) build(); playRound(); };
    tell.onclick = function () { if (!round) return; reveal(); };
    next.onclick = function () { stopAll(); build(); playRound(); };
  }

  // ---------- Generalization-aural/oral: same or different ----------
  function sameDifferent(root) {
    var get = controls(root, [
      { id: "content", label: "Content", choices: [["major", "Major tonic and dominant"], ["minor", "Minor tonic and dominant"], ["duple", "Duple macro/microbeats"], ["triple", "Triple macro/microbeats"], ["duple-d", "Duple divisions"], ["triple-d", "Triple divisions"]], value: "major" },
      { id: "fam", label: "Patterns", choices: [["f", "Familiar (Mullen: start here)"], ["fu", "Familiar and unfamiliar (Gordon)"]], value: "f" },
      keyOpt(), tempoOpt(), soundOpt()]);
    var bar = el("div", "au-bar"), play = el("button", "au-go", "▶ Play a pair"), ctx = el("button", null, "Tonality or meter again");
    [play, ctx].forEach(function (b) { b.type = "button"; bar.appendChild(b); });
    root.appendChild(bar);
    var status = el("div", "au-status"); root.appendChild(status);
    var row = el("div", "au-row"), same = el("button", "au-choice", "Same"), diff = el("button", "au-choice", "Different");
    [same, diff].forEach(function (b) { b.type = "button"; b.disabled = true; row.appendChild(b); });
    root.appendChild(row);
    var explain = el("div", "au-explain"); root.appendChild(explain);
    var score = scoreLine(root), round = null;

    function setFor(c) {
      if (/^(duple|triple)/.test(c)) return rhythmSet(c);
      var s = tonalSet(c);
      if (get("fam") === "fu") { var u = tonalSet(c + "-u"), sh = s.rest - u.rest;
        s = { id: s.id, mode: s.mode, rest: s.rest, patterns: s.patterns.concat(u.patterns.map(function (p) { return { midis: p.midis.map(function (m) { return m + sh; }), sol: p.sol, fn: p.fn }; })) }; }
      return s;
    }
    function context() {
      var r = round; if (!r) return [];
      return r.rhythm ? [rhythmSeqItem(r.set.meter, r.macro)] : [tonalSeqItem(r.set.mode, r.rest, r.qpm)];
    }
    function start() {
      var c = get("content"), set = setFor(c), a = pick(set.patterns), isSame = Math.random() < 0.5, b = isSame ? a : differentFrom(set, a);
      round = { set: set, a: a, b: b, same: isSame, rhythm: !set.mode, rest: restFor(get("key"), set), fit: restFor.fit, qpm: +get("tempo"), macro: +get("tempo") * 0.75, answered: false };
      rangeNote(root, round.rhythm || round.fit);
      explain.innerHTML = ""; [same, diff].forEach(function (x) { x.disabled = true; x.className = "au-choice"; });
      status.textContent = round.rhythm ? "First the meter (audiate it), then two patterns, once each." : "First the tonality (audiate it), then two patterns, once each.";
      var pats = round.rhythm ? rhythmItems(set, [a, b], round.macro) : tonalItems(set, [a, b], round.rest, round.qpm);
      if (round.rhythm) pats[0].gap = 900;
      playList(context().concat(pats), { sound: get("sound"), gap: round.rhythm ? 900 : 1100,
        onEnd: function () { status.textContent = "Same or different?"; same.disabled = diff.disabled = false; } });
    }
    function answer(saidSame, btn) {
      if (!round || round.answered) return; round.answered = true;
      var ok = saidSame === round.same; btn.classList.add(ok ? "au-good" : "au-bad"); score.add(ok);
      explain.innerHTML = "<p>" + (round.same ? "They were the <b>same</b>." : "They were <b>different</b>.") +
        (round.rhythm ? "" : " (" + round.a.sol + (round.same ? "" : " · " + round.b.sol) + ")") + "</p>" +
        (ok ? "" : "<p class='au-hint'>Not yet. Heard once is the rule here (Gordon, p. 132); if this keeps happening, go back to echoing these patterns on a neutral syllable.</p>");
    }
    same.onclick = function () { answer(true, same); }; diff.onclick = function () { answer(false, diff); };
    play.onclick = start;
    ctx.onclick = function () { if (round) playList(context(), { sound: get("sound") }); };
  }

  // ---------- Generalization-verbal: translate to solfège ----------
  function translate(root) {
    var get = controls(root, [
      { id: "content", label: "Content", choices: [["major", "Major tonic and dominant"], ["minor", "Minor tonic and dominant"], ["duple", "Duple macro/microbeats"], ["triple", "Triple macro/microbeats"], ["duple-d", "Duple divisions"], ["triple-d", "Triple divisions"]], value: "major" },
      { id: "fam", label: "Patterns", choices: [["f", "Familiar (Mullen: start here)"], ["u", "Unfamiliar (Gordon)"]], value: "f" },
      keyOpt(), tempoOpt(), soundOpt()]);
    var gate = el("label", "au-gate", "<input type='checkbox' class='au-ready'> I can already echo these patterns <b>in solfège</b> (the Verbal Association objective for this content is done).");
    root.appendChild(gate);
    var bar = el("div", "au-bar"), play = el("button", "au-go", "▶ Play a pattern"), show = el("button", null, "Show the answer");
    [play, show].forEach(function (b) { b.type = "button"; bar.appendChild(b); });
    root.appendChild(bar);
    var status = el("div", "au-status"); root.appendChild(status);
    var ans = el("div", "au-solf"); root.appendChild(ans);
    var row = el("div", "au-row"), yes = el("button", "au-choice", "I sang it right"), no = el("button", "au-choice", "Not yet");
    [yes, no].forEach(function (b) { b.type = "button"; b.disabled = true; row.appendChild(b); });
    root.appendChild(row);
    var explain = el("div", "au-explain"); root.appendChild(explain);
    var score = scoreLine(root), round = null, misses = 0;
    var ready = gate.querySelector("input");
    if (global.SyllableCheck) SyllableCheck.mount(bar, { getRound: function () { return round && round.rhythm && round.item ? { abc: round.item.abc, qpm: round.item.qpm, syl: round.p.syl } : null; } });   // experimental: syllable-check.js
    function gateMsg() {
      play.disabled = !ready.checked;
      if (!ready.checked) status.innerHTML = "Translation comes after Verbal Association with the same patterns, never before it (Gordon, p. 108). " +
        "Echo them in solfège first: <a href='/practice/patterns.html'>Tonal Patterns</a> (sets <i>mullen-fpifo-major</i> and <i>-minor</i>) or the rhythm sets on <a href='/practice/rhythms.html'>Rhythms</a>.";
      else status.textContent = "";
    }
    ready.onchange = gateMsg; gateMsg();
    root.querySelector(".au-fam").onchange = function () {
      if (/^(duple|triple)/.test(get("content")) && get("fam") === "u") { status.textContent = "There are no unfamiliar rhythm sets yet; using the familiar ones."; }
    };
    function start() {
      var c = get("content"), rhythm = /^(duple|triple)/.test(c);
      var set = rhythm ? rhythmSet(c) : tonalSet(get("fam") === "u" ? c + "-u" : c);
      var p = pick(set.patterns), rest = restFor(get("key"), set);
      rangeNote(root, rhythm || restFor.fit);
      round = { set: set, p: p, rhythm: rhythm, answered: false };
      ans.textContent = ""; explain.innerHTML = ""; [yes, no].forEach(function (x) { x.disabled = true; x.className = "au-choice"; });
      status.textContent = rhythm ? "Audiate the meter, then chant the pattern back in rhythm syllables." : "Audiate the tonality, then sing the pattern back in solfège.";
      var macro = +get("tempo") * 0.75;
      round.item = rhythm ? rhythmItems(set, [p], macro)[0] : null;
      var list = rhythm ? [rhythmSeqItem(set.meter, macro)].concat(rhythmItems(set, [p], macro))
                        : [tonalSeqItem(set.mode, rest, +get("tempo"))].concat(tonalItems(set, [p], rest, +get("tempo")));
      playList(list, { sound: get("sound"), gap: 1000, onEnd: function () { status.textContent = "Breathe, sing it in syllables, then show the answer."; } });
    }
    function reveal() {
      if (!round) return;
      var p = round.p;
      ans.textContent = round.rhythm ? p.syl : p.sol.toUpperCase();
      explain.innerHTML = round.rhythm ? "<p>" + LABEL[round.set.meter] + " meter.</p>"
        : "<p>" + LABEL[round.set.mode] + (p.fn ? ", " + p.fn : "") + ".</p>";
      yes.disabled = no.disabled = false;
    }
    function mark(ok, b) {
      if (!round || round.answered) return; round.answered = true; b.classList.add(ok ? "au-good" : "au-bad"); score.add(ok);
      misses = ok ? 0 : misses + 1;
      if (misses >= 2) explain.innerHTML += "<p class='au-warn'>Two in a row not yet. Go back to Verbal Association: echo these patterns in solfège with them sung to you first, then come back (Gordon, p. 132).</p>";
    }
    play.onclick = start; show.onclick = reveal;
    yes.onclick = function () { mark(true, yes); }; no.onclick = function () { mark(false, no); };
  }


  // ---------- reading: symbolic association (familiar) and generalization-symbolic (unfamiliar) ----------
  // Tonal patterns are drawn as the sets write them: stemless, no rhythm, no syllables, no chord symbols (Gordon p. 123).
  function displayAbc(t) {
    return t.split("\n").filter(function (l) { return !/^(w:|%)/.test(l); }).map(function (l) { return l.replace(/"[^"]*"\s*/g, ""); }).join("\n");
  }
  function reading(root) {
    var get = controls(root, [
      { id: "content", label: "Content", choices: [["major", "Major tonic and dominant"], ["minor", "Minor tonic and dominant"], ["mm", "Major or minor: name it"],
        ["duple", "Duple macro/microbeats"], ["triple", "Triple macro/microbeats"], ["dt", "Duple or triple: name it"], ["duple-d", "Duple divisions"], ["triple-d", "Triple divisions"]], value: "major" },
      { id: "fam", label: "Patterns", choices: [["f", "Familiar, new order (symbolic association)"], ["u", "Unfamiliar (generalization-symbolic)"]], value: "f" },
      keyOpt(), tempoOpt(), soundOpt()]);
    var gate = el("label", "au-gate", "<input type='checkbox' class='au-ready'> I can already read the <b>familiar</b> patterns on my own (symbolic association). Needed for unfamiliar ones.");
    root.appendChild(gate);
    var bar = el("div", "au-bar"), show = el("button", "au-go", "Show a pattern"), hear = el("button", null, "Hear it"), syl = el("button", null, "Show the syllables"), hint = el("button", null, "Where is DO?");
    [show, hear, syl, hint].forEach(function (b) { b.type = "button"; bar.appendChild(b); });
    root.appendChild(bar);
    var status = el("div", "au-status"); root.appendChild(status);
    var paper = el("div", "au-paper"); root.appendChild(paper);
    var name = el("div", "au-row"); root.appendChild(name);
    var ans = el("div", "au-solf"); root.appendChild(ans);
    var row = el("div", "au-row"), yes = el("button", "au-choice", "I read it right"), no = el("button", "au-choice", "Not yet");
    [yes, no].forEach(function (b) { b.type = "button"; b.disabled = true; row.appendChild(b); });
    root.appendChild(row);
    var explain = el("div", "au-explain"); root.appendChild(explain);
    var score = scoreLine(root), round = null, misses = 0, ready = gate.querySelector("input");

    function start() {
      var c = get("content"), fam = get("fam"), mixed = c === "mm" || c === "dt";
      var choices = c === "mm" ? ["major", "minor"] : c === "dt" ? ["duple", "triple"] : [c];
      var which = pick(choices), rhythm = /^(duple|triple)/.test(which);
      if (fam === "u" && !ready.checked) { status.innerHTML = "Unfamiliar patterns come after you can read the familiar ones yourself; tick the box when that's true (Gordon, p. 133; Mullen, <i>MLT Any Music Teacher Can Du…De</i>, p. 39)."; return; }
      if (fam === "u" && rhythm) status.textContent = "There are no unfamiliar rhythm sets yet; showing familiar ones.";
      else status.textContent = "";
      var set = rhythm ? rhythmSet(which) : tonalSet(fam === "u" ? which + "-u" : which);
      var p = pick(set.patterns), rest = restFor(get("key"), set), macro = +get("tempo") * 0.75;
      round = { set: set, p: p, rhythm: rhythm, mixed: mixed, which: which, choices: choices, rest: rest, macro: macro, answered: false, named: !mixed };
      ans.textContent = ""; explain.innerHTML = ""; name.innerHTML = ""; [yes, no].forEach(function (x) { x.disabled = true; x.className = "au-choice"; });
      var src = rhythm ? p.abc.replace(/^K:.*$/m, "K:C clef=none") : displayAbc(p.abc);
      paper.innerHTML = "";
      ABCJS.renderAbc(paper, src, { scale: 2, staffwidth: rhythm ? 300 : 190, visualTranspose: rhythm ? 0 : rest - set.rest, paddingtop: 4, paddingbottom: 14 });
      if (mixed) {
        status.textContent = rhythm ? "No meter set up: read it, audiate it, name the meter, then chant it." : "No tonality set up: read it, audiate it, name the tonality, then sing it.";
        name.innerHTML = "<span class='au-n'>It's</span>";
        choices.forEach(function (ch) { var b = el("button", "au-choice", LABEL[ch]); b.type = "button"; b.onclick = function () { nameIt(ch, b); }; name.appendChild(b); });
      } else {
        status.textContent = rhythm ? "Audiate the meter, then chant the pattern in rhythm syllables." : "Audiate the tonality, then sing the pattern in solfège.";
        playList([rhythm ? rhythmSeqItem(set.meter, macro) : tonalSeqItem(set.mode, rest, +get("tempo"))], { sound: get("sound") });
      }
    }
    function nameIt(ch, b) {
      if (!round || round.named) return; round.named = true;
      var ok = ch === round.which; b.classList.add(ok ? "au-good" : "au-bad");
      explain.innerHTML = "<p>" + LABEL[round.which] + (round.rhythm ? " meter." : " tonality.") + (ok ? "" : " Look at where the patterns sit around " + (round.rhythm ? "the macrobeats." : "DO and the resting tone.")) + "</p>";
    }
    function hearIt() {
      if (!round) return;
      var r = round, items = r.rhythm ? rhythmItems(r.set, [r.p], r.macro) : tonalItems(r.set, [r.p], r.rest, +get("tempo"));
      items.forEach(function (x) { x.syl = true; });   // Read it: the check after reading may be chanted in syllables (the Syllables option)
      playList(items, { sound: get("sound") });
      yes.disabled = no.disabled = false;
    }
    function showSyl() {
      if (!round) return;
      ans.textContent = round.rhythm ? round.p.syl : round.p.sol.toUpperCase();
      yes.disabled = no.disabled = false;
    }
    function mark(ok, b) {
      if (!round || round.answered) return; round.answered = true; b.classList.add(ok ? "au-good" : "au-bad"); score.add(ok);
      misses = ok ? 0 : misses + 1;
      if (misses >= 2) explain.innerHTML += round.p && get("fam") === "u"
        ? "<p class='au-warn'>Two in a row not yet. Go back to reading familiar patterns (symbolic association), then try unfamiliar ones again (Gordon, pp. 133–134).</p>"
        : "<p class='au-warn'>Two in a row not yet. Go back to verbal association: echo these patterns in syllables by ear first (Gordon, p. 133).</p>";
    }
    hint.onclick = function () {
      explain.innerHTML = "<p>Find DO from the DO signature: with sharps, the last sharp is TI, so DO is the next line or space up. With flats, the last flat is FA, so count down to DO. With none, DO is on the C line or space. If the tonality is minor, the resting tone LA is a line or space below DO (Mullen, <i>The Literate Musician</i>, Reading Lesson 3.1).</p>";
    };
    show.onclick = start; hear.onclick = hearIt; syl.onclick = showSyl;
    yes.onclick = function () { mark(true, yes); }; no.onclick = function () { mark(false, no); };
  }

  // ---------- composite synthesis: read or write a series, and name its tonality or meter ----------
  function composite(root) {
    var get = controls(root, [
      { id: "content", label: "Content", choices: [["mm", "Major or minor: name it"], ["major", "Major tonic and dominant"], ["minor", "Minor tonic and dominant"],
        ["dt", "Duple or triple: name it"], ["duple", "Duple macro/microbeats"], ["triple", "Triple macro/microbeats"], ["duple-d", "Duple divisions"], ["triple-d", "Triple divisions"]], value: "mm" },
      { id: "way", label: "Task", choices: [["r", "Read a series (CS-reading)"], ["d", "Write from dictation (CS-writing)"], ["m", "Write from memory after seeing it"]], value: "r" },
      { id: "count", label: "Patterns in a series", choices: [["3", "3"], ["4", "4"]], value: "3" },
      keyOpt(), tempoOpt(), soundOpt()]);
    var gate = el("label", "au-gate", "<input type='checkbox' class='au-ready'> I can read <b>single</b> familiar patterns on my own (symbolic association, in <i>Read it</i> above).");
    root.appendChild(gate);
    var bar = el("div", "au-bar"), go = el("button", "au-go", "Start a series"), hear = el("button", null, "Hear it"), syl = el("button", null, "Show the syllables");
    [go, hear, syl].forEach(function (b) { b.type = "button"; bar.appendChild(b); });
    root.appendChild(bar);
    var status = el("div", "au-status"); root.appendChild(status);
    var name = el("div", "au-row"); root.appendChild(name);
    var paper = el("div", "au-series"); root.appendChild(paper);
    var slots = el("div", "au-slots"); root.appendChild(slots);
    var palette = el("div", "au-cards"); root.appendChild(palette);
    var ans = el("div", "au-solf"); root.appendChild(ans);
    var row = el("div", "au-row"), yes = el("button", "au-choice", "I read it right"), no = el("button", "au-choice", "Not yet");
    [yes, no].forEach(function (b) { b.type = "button"; b.disabled = true; row.appendChild(b); });
    root.appendChild(row);
    var explain = el("div", "au-explain"); root.appendChild(explain);
    var score = scoreLine(root), round = null, misses = 0, ready = gate.querySelector("input"), timer = null;

    function draw(box, p, r, scale) {
      var src = r.rhythm ? p.abc.replace(/^K:.*$/m, "K:C clef=none") : displayAbc(p.abc);
      ABCJS.renderAbc(box, src, { scale: scale, staffwidth: r.rhythm ? 220 : 130, visualTranspose: r.rhythm ? 0 : r.rest - r.set.rest, paddingtop: 2, paddingbottom: 10, paddingleft: 2, paddingright: 2 });
    }
    function drawSeries(list, r) {
      paper.innerHTML = "";
      list.forEach(function (p) { var b = el("div", "au-paper au-mini"); paper.appendChild(b); draw(b, p, r, 1.5); });
    }
    function items(r, list, withSyl) {
      var it = r.rhythm ? rhythmItems(r.set, list, r.macro) : tonalItems(r.set, list, r.rest, +get("tempo"));
      if (withSyl) it.forEach(function (x) { x.syl = true; });
      return it;
    }
    function setup(r) { return r.rhythm ? rhythmSeqItem(r.set.meter, r.macro) : tonalSeqItem(r.set.mode, r.rest, +get("tempo")); }
    function askName(r, then) {
      name.innerHTML = "<span class='au-n'>It's</span>";
      r.choices.forEach(function (ch) {
        var b = el("button", "au-choice", LABEL[ch]); b.type = "button";
        b.onclick = function () {
          if (r.named) return; r.named = true; var ok = ch === r.which; r.namedOk = ok; b.classList.add(ok ? "au-good" : "au-bad");
          explain.innerHTML = "<p>" + LABEL[r.which] + (r.rhythm ? " meter." : " tonality.") + (ok ? "" : r.rhythm ? " Listen for how the macrobeats divide: in twos (duple) or threes (triple)." : " Listen for where the series comes to rest: DO (major) or LA (minor).") + "</p>";
          if (then) then();
        };
        name.appendChild(b);
      });
    }
    function start() {
      if (!ready.checked) { status.innerHTML = "Composite synthesis comes after you can read single familiar patterns; tick the box when that's true (Gordon, <i>Learning Sequences in Music</i>, pp. 126–127)."; return; }
      clearTimeout(timer);
      var c = get("content"), mixed = c === "mm" || c === "dt", way = get("way");
      var choices = c === "mm" ? ["major", "minor"] : c === "dt" ? ["duple", "triple"] : [c];
      var which = pick(choices), rhythm = /^(duple|triple)/.test(which);
      var set = rhythm ? rhythmSet(which) : tonalSet(which);
      var r = round = { set: set, which: which, choices: choices, mixed: mixed, rhythm: rhythm, way: way, rest: restFor(get("key"), set), macro: +get("tempo") * 0.75,
                        list: series(set, +get("count")), named: !mixed, answered: false, written: [] };
      [name, paper, slots, palette, explain].forEach(function (x) { x.innerHTML = ""; }); ans.textContent = "";
      [yes, no].forEach(function (x) { x.disabled = true; x.className = "au-choice"; });
      yes.textContent = way === "r" ? "I read it right" : "Check"; no.textContent = way === "r" ? "Not yet" : "Give up";
      var what = rhythm ? "meter" : "tonality", sing = rhythm ? "chant it in rhythm syllables" : "sing it in solfège";
      if (way === "r") {
        drawSeries(r.list, r);
        if (mixed) { status.textContent = "Nothing is set up. Read the whole series silently, audiate it, name the " + what + ", then " + sing + "."; askName(r); }
        else { status.textContent = "Audiate the " + what + ", then " + sing + " straight through, without stopping between patterns."; playList([setup(r)], { sound: get("sound") }); }
        hear.textContent = "Hear it";
      } else if (way === "d") {
        status.textContent = "Listen to the whole series" + (mixed ? " (nothing set up first)" : "") + ", then write it: choose each pattern in order.";
        playList((mixed ? [] : [setup(r)]).concat(items(r, r.list)), { sound: get("sound"), gap: 700, onEnd: afterHearing });
        hear.textContent = "Hear it again";
      } else {
        status.textContent = "Read the series and remember it. It disappears in " + (r.list.length * 3) + " seconds.";
        drawSeries(r.list, r);
        timer = setTimeout(function () { paper.innerHTML = ""; afterHearing(); }, r.list.length * 3000);
        hear.textContent = "Hear it";
      }
    }
    function afterHearing() {
      var r = round; if (!r || r.way === "r" || r.shown) return; r.shown = true;
      if (r.mixed && !r.named) { status.textContent = "First name the " + (r.rhythm ? "meter" : "tonality") + ", then write the series."; askName(r, buildWrite); }
      else buildWrite();
    }
    function buildWrite() {
      var r = round; status.textContent = "Choose the patterns in the order you " + (r.way === "d" ? "heard" : "saw") + " them. Click a filled box to clear it.";
      drawSlots();
      palette.innerHTML = "";
      r.set.patterns.forEach(function (p) {
        var b = el("button", "au-card"); b.type = "button"; palette.appendChild(b); draw(b, p, r, 1);
        b.onclick = function () { if (r.answered || r.written.length >= r.list.length) return; r.written.push(p); drawSlots(); };
      });
      yes.disabled = no.disabled = false;
    }
    function drawSlots() {
      var r = round; slots.innerHTML = "";
      for (var i = 0; i < r.list.length; i++) (function (i) {
        var p = r.written[i], b = el("button", "au-card au-slot" + (p ? "" : " au-empty"), p ? "" : String(i + 1)); b.type = "button"; slots.appendChild(b);
        if (p) { draw(b, p, r, 1); b.onclick = function () { if (!r.answered) { r.written.splice(i, 1); drawSlots(); } }; }
      })(i);
    }
    function key(p) { return p.midis ? p.midis.join() : p.abc; }
    function check() {
      var r = round; if (r.answered) return;
      if (r.written.length < r.list.length) { status.textContent = "Fill every box first (" + r.written.length + " of " + r.list.length + ")."; return; }
      r.answered = true;
      var right = r.list.filter(function (p, i) { return key(p) === key(r.written[i]); }).length, ok = right === r.list.length;
      Array.prototype.forEach.call(slots.children, function (b, i) { b.classList.add(key(r.list[i]) === key(r.written[i]) ? "au-good" : "au-bad"); });
      yes.classList.add(ok ? "au-good" : "au-bad"); score.add(ok && (!r.mixed || r.namedOk !== false));
      drawSeries(r.list, r);
      explain.innerHTML += "<p>" + right + " of " + r.list.length + " in the right place. The series was <b>" + r.list.map(sylOf).join(" · ") + "</b>.</p>";
      warn(ok);
    }
    function sylOf(p) { return round.rhythm ? p.syl : p.sol.toUpperCase(); }
    function warn(ok) {
      misses = ok ? 0 : misses + 1;
      if (misses >= 2) explain.innerHTML += "<p class='au-warn'>Two in a row not yet. Go back a step: single patterns in <i>Read it</i> (symbolic association), or series by ear in <i>Partial synthesis</i> (Gordon, p. 126).</p>";
    }
    hear.onclick = function () {
      var r = round; if (!r) return;
      playList(items(r, r.list, r.way === "r"), { sound: get("sound"), gap: 700 });
      if (r.way === "r") yes.disabled = no.disabled = false;
    };
    syl.onclick = function () { var r = round; if (!r) return; ans.textContent = r.list.map(sylOf).join("  ·  "); if (r.way === "r") yes.disabled = no.disabled = false; };
    go.onclick = start;
    yes.onclick = function () {
      var r = round; if (!r) return;
      if (r.way !== "r") return check();
      if (r.answered) return; r.answered = true; yes.classList.add("au-good"); score.add(r.namedOk !== false); warn(r.namedOk !== false);
    };
    no.onclick = function () {
      var r = round; if (!r || r.answered) return;
      if (r.way !== "r") { r.written = r.list.slice(0, 0); r.answered = true; no.classList.add("au-bad"); score.add(false); drawSeries(r.list, r); explain.innerHTML += "<p>The series was <b>" + r.list.map(sylOf).join(" · ") + "</b>.</p>"; warn(false); return; }
      r.answered = true; no.classList.add("au-bad"); score.add(false); warn(false);
    };
  }

  // ---------- creativity / improvisation, by ear ----------
  function fits(task, given, q) {
    if (q === given) return false;
    if (q.midis && given.midis && q.midis.join() === given.midis.join()) return false;
    if (task === "same") return q.fn === given.fn;
    if (task === "swap") return q.fn && q.fn !== given.fn;
    if (task === "division") return /Ta/.test(q.syl);
    return true;
  }
  function improvise(root) {
    var get = controls(root, [
      { id: "content", label: "Content", choices: [["major", "Major tonic and dominant"], ["minor", "Minor tonic and dominant"], ["duple", "Duple macro/microbeats"], ["triple", "Triple macro/microbeats"], ["duple-d", "Duple with divisions"], ["triple-d", "Triple with divisions"]], value: "major" },
      { id: "task", label: "Your answer", choices: [["any", "Create: any different pattern"], ["same", "Improvise: same function, different pattern"], ["swap", "Improvise: tonic ↔ dominant"], ["division", "Improvise (rhythm): use a division"]], value: "any" },
      { id: "syl", label: "Answer on", choices: [["n", "A neutral syllable (after aural/oral)"], ["s", "Syllables (after verbal association)"]], value: "n" },
      keyOpt(), tempoOpt(), soundOpt()]);
    var bar = el("div", "au-bar"), play = el("button", "au-go", "▶ Play a pattern"), again = el("button", null, "Hear it again"),
        example = el("button", null, "Hear an answer that fits"), list = el("button", null, "Show what fits");
    [play, again, example, list].forEach(function (b) { b.type = "button"; bar.appendChild(b); });
    root.appendChild(bar);
    var status = el("div", "au-status"); root.appendChild(status);
    var row = el("div", "au-row"), yes = el("button", "au-choice", "My answer fit"), no = el("button", "au-choice", "I copied it or lost the tonality");
    [yes, no].forEach(function (b) { b.type = "button"; b.disabled = true; row.appendChild(b); });
    root.appendChild(row);
    var explain = el("div", "au-explain"); root.appendChild(explain);
    var score = scoreLine(root), round = null;

    function rule(task, rhythm) {
      if (rhythm) return task === "division" ? "a different pattern, four macrobeats long, with at least one division" : "a different pattern, four macrobeats long, in the same meter";
      return task === "same" ? "a different pattern with the same function" : task === "swap" ? "a pattern of the other function (tonic answers dominant, dominant answers tonic)" : "any different pattern in the same tonality";
    }
    function start() {
      var c = get("content"), task = get("task"), rhythm = /^(duple|triple)/.test(c);
      if (rhythm && (task === "same" || task === "swap")) task = "any";
      if (!rhythm && task === "division") task = "any";
      var set = rhythm ? rhythmSet(c) : tonalSet(c), given = pick(set.patterns);
      if (task === "division" && !/-d$/.test(c)) { set = rhythmSet(c + "-d"); }
      var ok = set.patterns.filter(function (q) { return fits(task, given, q); });
      round = { set: set, given: given, task: task, rhythm: rhythm, fit: ok, rest: restFor(get("key"), set), macro: +get("tempo") * 0.75, answered: false };
      explain.innerHTML = ""; [yes, no].forEach(function (x) { x.disabled = true; x.className = "au-choice"; });
      status.innerHTML = "Listen, breathe, then answer out loud with " + rule(task, rhythm) + (get("syl") === "s" ? ", in syllables." : ", on a neutral syllable.");
      var gset = rhythm ? rhythmSet(c) : set;
      var items = (rhythm ? [rhythmSeqItem(gset.meter, round.macro)].concat(rhythmItems(gset, [given], round.macro))
                          : [tonalSeqItem(set.mode, round.rest, +get("tempo"))].concat(tonalItems(set, [given], round.rest, +get("tempo"))));
      playList(items, { sound: get("sound"), gap: 900, onEnd: function () { yes.disabled = no.disabled = false; } });
    }
    function playGiven() {
      if (!round) return; var r = round;
      var gset = r.rhythm ? rhythmSet(get("content")) : r.set;
      playList(r.rhythm ? rhythmItems(gset, [r.given], r.macro) : tonalItems(r.set, [r.given], r.rest, +get("tempo")), { sound: get("sound") });
    }
    function playExample() {
      if (!round || !round.fit.length) return; var r = round, q = pick(r.fit);
      var exItems = r.rhythm ? rhythmItems(r.set, [q], r.macro) : tonalItems(r.set, [q], r.rest, +get("tempo"));
      exItems.forEach(function (x) { x.syl = true; });   // the example answer may be chanted in syllables (the Syllables option); the given pattern never is
      playList(exItems, { sound: get("sound") });
      explain.innerHTML = "<p class='au-hint'>One answer that fits: " + (r.rhythm ? q.syl : q.sol.toUpperCase()) + ". Yours can be different; there is no one right answer.</p>";
    }
    function showFits() {
      if (!round) return; var r = round;
      explain.innerHTML = "<p>The pattern was <b>" + (r.rhythm ? r.given.syl : r.given.sol.toUpperCase() + (r.given.fn ? "</b> (" + r.given.fn + ")<b>" : "")) + "</b>. Answers from the set that fit:</p><p>" +
        r.fit.map(function (q) { return r.rhythm ? q.syl : q.sol.toUpperCase(); }).join(" · ") + "</p>" +
        "<p class='au-hint'>Any answer of your own that keeps the rule fits too. If you sang a new pattern in the wrong syllables, sing it again with the right ones (Gordon, <i>Reference Handbook</i>, p. 44).</p>";
    }
    function mark(ok, b) {
      if (!round || round.answered) return; round.answered = true; b.classList.add(ok ? "au-good" : "au-bad"); score.add(ok);
      if (!ok) explain.innerHTML += "<p class='au-hint'>Copying is a natural first step. Take a longer breath before answering, and keep the resting tone in mind (sing it quietly first if it helps).</p>";
    }
    play.onclick = start; again.onclick = playGiven; example.onclick = playExample; list.onclick = showFits;
    yes.onclick = function () { mark(true, yes); }; no.onclick = function () { mark(false, no); };
  }

  function init() {
    var map = { "au-ps": partialSynthesis, "au-sd": sameDifferent, "au-tr": translate, "au-gs": reading, "au-cs": composite, "au-ci": improvise };
    Object.keys(map).forEach(function (id) { var r = document.getElementById(id); if (r) map[id](r); });
    // "Syllables" only where hearing them gives nothing away: Read it (after reading) and the example answers. Never in partial synthesis, same or different, translate.
    if (global.RhythmChant) ["au-gs", "au-ci"].forEach(function (id) { var r = document.getElementById(id), g = r && r.querySelector(".au-grid"); if (g) { RhythmChant.scope("audiation", false); RhythmChant.syllablesBox(g, { label: "Syllables (Du De Da Di Ta)" }); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
