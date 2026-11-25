// drum-compare.js — four classic drum machines on one page that turn into each other (lessons/drum-compare.qmd).
// <div class="dcmp"></div> becomes: a source panel (A) and a translated panel (B), each a TR-808-style, TR-909-style,
// LinnDrum-style or MPC60-style machine with its own step / timing rules, one AudioWorklet engine for all four, a translator
// that turns a kit + pattern on one machine into the nearest on another and says, line by line, what is the same ("exact"),
// close ("approx") or impossible ("lost") and why, with the manual page; a step grid lit while playing, a timing plot of
// where each machine puts the notes, and waveform / spectrum / envelope plots of any voice on both machines.
//
// SOURCES (copies and extracted text in ~/Documents/Manuals/drums; page numbers are the printed pages):
//   SN  = Roland, *TR-808 Service Notes*, 1st ed. 15 June 1981 (2nd printing 1983). Specs p. 1 (1-32 steps a measure,
//         64 measures x 12 tracks, tempo 40-300, accent 0-10 dB); voice circuits pp. 5-6 (bass drum: a bridged T-network that
//         rings, accent halves its time constant for 4 ms so it starts at twice the frequency; snare: two bridged-T networks +
//         snappy noise; toms / congas: one circuit each, switched by SW8, pitch falling as the ring dies; pink noise on the low
//         tom; clap: band-passed white noise, a sawtooth-shaped envelope + a longer "reverb" envelope; cowbell: two square
//         oscillators; cymbal and hi-hats: six square oscillators, filtered; closed hat cuts the open hat); knobs p. 16 parts list.
//   O8  = Roland, *TR-808 Owner's Manual* (8-page introduction): a measure is 16 steps at the default pre-scale; tap write.
//   O9  = Roland, *TR-909 Owner's Manual*. Features p. 5 (48 patterns x 2 banks, 4 tracks, 896 measures; accent per voice for
//         BD SD toms CH + total accent; flam and shuffle; MIDI), keys p. 7, sound controls p. 8, scale and last step p. 24,
//         accent p. 25, shuffle (7 settings) and flam (8 intervals; first hit on the step) p. 26.
//   LD  = Linn Electronics, *LinnDrum Owner's Manual*. Drums, levels (snare 3; bass, hi-hat, cabasa, tambourine, ride 2),
//         open hat closed by the closed hat, mixer level + pan, tuning (snare, sidestick, toms, congas ~ an octave), hi-hat decay,
//         "all other drums are not tunable" p. 1; 49 pattern numbers, those starting 1-5 preset p. 2; error correct 1/8, 1/8T,
//         1/16, 1/16T, 1/32, 1/32T, HI p. 7; timing A (straight) - F (shuffle) on 1/8 or 1/16 p. 8; E = perfect triplet shuffle,
//         many prefer C or D (8ths), B or C (16ths) p. 9.
//   MP  = Roger Linn and David Battino, *MPC60 Software Version 3.1 Operator's Manual* (2002). Envelope / tuning / velocity per
//         pad p. 5; 12-bit non-linear samples at 40 kHz p. 15; pads p. 18; 16 Levels p. 21-22; 96 ppq p. 26; timing correct
//         p. 43; swing 50-75 %, 66 % = triplet, 54 % / 62 % suggested p. 44; 16 voices, specs p. 218.
//   Wikipedia "Roland TR-808", "Roland TR-909", "LinnDrum", "Akai MPC" (history, sample bit depths, prices).
// NOT IN THE SOURCES (this page's own, said so on the page): every knob-to-Hz / seconds curve; oscillator frequencies of the
// 808 cymbal and cowbell; how far each of the 909's seven shuffle settings delays a note; the 909's eight flam intervals in
// ms; LinnDrum timing B, C, D, F as percentages (only A = straight and E = triplet are printed); the threshold that turns an
// MPC velocity into an accent; every sound of the LinnDrum and MPC (synthesised stand-ins, with the sample rate and bit depth
// imitated); the 909's sampled hats and cymbals (synthesised, then cut to 6 bits).
//
// API: DrumCompare.mount(host) -> widget; DrumCompare.translate(state, to) -> { state, notes:[{cls, what, why, cite:[{book,
// title, page}], ctl:{from:[ids], to:[ids]}}] }; DrumCompare.canonical(state); DrumCompare.MACHINES; DrumCompare.EXAMPLES;
// DrumCompare.render(machine, voice, params, vel, seconds, sr) -> Float32Array (offline, the same engine);
// DrumCompare.onsets(state) -> [{c, s, t (beats)}]; DrumCompare.exportJSON(state, meta) / importJSON(text);
// DrumCompare.voice(ctx, machine, kit) -> Promise<{ output, hit(voice, when, vel, accent), stop() }> for a later DAW hookup.
// Works under node (no DOM at load) for tests/lessons/drum-compare.test.js.
(function (global) {
  "use strict";
  var DC = {};
  var BOOKS = {
    SN: "Roland TR-808 Service Notes (1981)", O8: "Roland TR-808 Owner's Manual", O9: "Roland TR-909 Owner's Manual",
    LD: "LinnDrum Owner's Manual", MP: "MPC60 Operator's Manual v3.1",
    W808: "Wikipedia: Roland TR-808", W909: "Wikipedia: Roland TR-909", WLD: "Wikipedia: LinnDrum", WMPC: "Wikipedia: Akai MPC"
  };
  function cite(b, p) { return { book: b, title: BOOKS[b], page: p }; }
  var PAGE = { book: "page", title: "This page's own choice (not in the manuals)", page: "-" };

  // ---------- the instruments every machine maps onto (the canonical description) ----------
  var CANON = { kick: "Bass drum", snare: "Snare drum", rim: "Rim shot / sidestick", clap: "Hand clap", chh: "Closed hi-hat",
    ohh: "Open hi-hat", cymbal: "Cymbal", crash: "Crash cymbal", ride: "Ride cymbal", ltom: "Low tom", mtom: "Mid tom",
    htom: "High tom", lconga: "Low conga", mconga: "Mid conga", hconga: "High conga", cowbell: "Cowbell", clave: "Claves",
    maracas: "Maracas", cabasa: "Cabasa", tamb: "Tambourine" };
  var SUBST = { cymbal: ["crash", "ride"], crash: ["cymbal", "ride"], ride: ["cymbal", "crash"], mconga: ["hconga", "lconga"],
    lconga: ["ltom"], hconga: ["htom"], clave: ["rim"], maracas: ["cabasa", "tamb"], cabasa: ["maracas", "tamb"], tamb: ["cabasa", "maracas"] };
  var PNAME = { level: "Level", tune: "Tune", decay: "Decay", tone: "Tone", snappy: "Snappy", attack: "Attack", pan: "Pan" };

  // voice: [canon, label, params, alt (808 switch partner)]
  var MACHINES = {
    tr808: { id: "tr808", name: "TR-808-style", long: "after the Roland TR-808 Rhythm Composer (1980)", sound: "analog",
      voices: [["kick", "Bass Drum", ["level", "tone", "decay"]], ["snare", "Snare Drum", ["level", "tone", "snappy"]],
        ["ltom", "Low Tom", ["level", "tune"], "lconga"], ["mtom", "Mid Tom", ["level", "tune"], "mconga"], ["htom", "Hi Tom", ["level", "tune"], "hconga"],
        ["rim", "Rim Shot", ["level"], "clave"], ["clap", "Hand Clap", ["level"], "maracas"], ["cowbell", "Cow Bell", ["level"]],
        ["cymbal", "Cymbal", ["level", "tone", "decay"]], ["ohh", "Open Hihat", ["level", "decay"]], ["chh", "Closed Hihat", ["level"]]],
      altLabel: { lconga: "Low Conga", mconga: "Mid Conga", hconga: "Hi Conga", clave: "Claves", maracas: "Maracas" },
      scales: [16, 12], accent: "total", voiceAccent: [], swing: null, flam: [], quant: null, tempo: [40, 300],
      cites: { voices: cite("SN", "6, 16"), steps: cite("SN", 1), accent: cite("SN", 1), tempo: cite("SN", 1) } },
    tr909: { id: "tr909", name: "TR-909-style", long: "after the Roland TR-909 Rhythm Composer (1983)", sound: "analog + 6-bit",
      voices: [["kick", "Bass Drum", ["level", "tune", "attack", "decay"]], ["snare", "Snare Drum", ["level", "tune", "tone", "snappy"]],
        ["ltom", "Low Tom", ["level", "tune", "decay"]], ["mtom", "Mid Tom", ["level", "tune", "decay"]], ["htom", "Hi Tom", ["level", "tune", "decay"]],
        ["rim", "Rim Shot", ["level"]], ["clap", "Hand Clap", ["level"]], ["chh", "Closed Hihat", ["level", "decay"]], ["ohh", "Open Hihat", ["level", "decay"]],
        ["crash", "Crash", ["level", "tune"]], ["ride", "Ride", ["level", "tune"]]],
      scales: [16, 12], accent: "total", voiceAccent: ["kick", "snare", "ltom", "mtom", "htom", "chh"], swing: "shuffle",
      flam: ["kick", "snare", "ltom", "mtom", "htom"], quant: null, tempo: null,
      cites: { voices: cite("O9", "7-8"), steps: cite("O9", 24), accent: cite("O9", 25), swing: cite("O9", 26), flam: cite("O9", 26) } },
    linn: { id: "linn", name: "LinnDrum-style", long: "after the Linn Electronics LinnDrum (1982)", sound: "8-bit samples",
      voices: [["kick", "Bass", ["level", "pan"]], ["snare", "Snare", ["level", "pan", "tune"]], ["rim", "Sidestick", ["level", "pan", "tune"]],
        ["chh", "Hihat", ["level", "pan", "decay"]], ["ohh", "Open Hihat", ["level", "pan"]], ["ltom", "Tom Low", ["level", "pan", "tune"]],
        ["mtom", "Tom Mid", ["level", "pan", "tune"]], ["htom", "Tom Hi", ["level", "pan", "tune"]], ["lconga", "Conga Lo", ["level", "pan", "tune"]],
        ["hconga", "Conga Hi", ["level", "pan", "tune"]], ["cowbell", "Cowbell", ["level", "pan"]], ["clap", "Claps", ["level", "pan"]],
        ["cabasa", "Cabasa", ["level", "pan"]], ["tamb", "Tambourine", ["level", "pan"]], ["ride", "Ride", ["level", "pan"]], ["crash", "Crash", ["level", "pan"]]],
      levels: { snare: 3, kick: 2, chh: 2, cabasa: 2, tamb: 2, ride: 2 },
      scales: [16, 12], accent: "levels", swing: "timing", flam: [], quant: ["1/8", "1/8T", "1/16", "1/16T", "1/32", "1/32T", "HI"], tempo: null,
      cites: { voices: cite("LD", 1), steps: cite("LD", 7), accent: cite("LD", 1), swing: cite("LD", "8-9"), quant: cite("LD", 7) } },
    mpc60: { id: "mpc60", name: "MPC60-style", long: "after the Akai MPC60 MIDI Production Center (1988)", sound: "12-bit samples",
      voices: [["kick", "Kick", ["level", "tune", "decay"]], ["snare", "Snare", ["level", "tune", "decay"]], ["rim", "Rim", ["level", "tune", "decay"]],
        ["clap", "Clap", ["level", "tune", "decay"]], ["chh", "Closed Hat", ["level", "tune", "decay"]], ["ohh", "Open Hat", ["level", "tune", "decay"]],
        ["ltom", "Low Tom", ["level", "tune", "decay"]], ["mtom", "Mid Tom", ["level", "tune", "decay"]], ["htom", "High Tom", ["level", "tune", "decay"]],
        ["crash", "Crash", ["level", "tune", "decay"]], ["ride", "Ride", ["level", "tune", "decay"]], ["cowbell", "Cowbell", ["level", "tune", "decay"]],
        ["tamb", "Tambourine", ["level", "tune", "decay"]], ["lconga", "Low Conga", ["level", "tune", "decay"]], ["hconga", "High Conga", ["level", "tune", "decay"]],
        ["cabasa", "Shaker", ["level", "tune", "decay"]]],
      scales: [16, 12], accent: "velocity", swing: "percent", flam: [], quant: ["1/8", "1/8T", "1/16", "1/16T", "1/32", "1/32T", "OFF"], tempo: null,
      cites: { voices: cite("MP", "5, 18"), steps: cite("MP", 43), accent: cite("MP", "21-22"), swing: cite("MP", 44), quant: cite("MP", 43), ppq: cite("MP", 26) } }
  };
  var ORDER = ["tr808", "tr909", "linn", "mpc60"];
  function voiceOf(M, c) { for (var i = 0; i < M.voices.length; i++) { var v = M.voices[i]; if (v[0] === c || v[3] === c) return v; } return null; }
  function hasVoice(M, c) { return !!voiceOf(M, c); }
  function machineVoices(M) { var a = []; M.voices.forEach(function (v) { a.push(v[0]); if (v[3]) a.push(v[3]); }); return a; }
  function vLabel(M, c) { var v = voiceOf(M, c); if (!v) return CANON[c]; return v[0] === c ? v[1] : M.altLabel[c]; }

  // ---------- timing: swing as a fraction of the pair given to the first note ----------
  var PPQ = 96;                       // MP 26 (the page uses it for every machine's internal timing)
  var SHUF909 = [0.5, 0.5 + 1 / 24, 0.5 + 2 / 24, 0.625, 0.5 + 4 / 24, 0.5 + 5 / 24, 0.75];  // settings 1-7: this page's spacing
  var LINN = { A: 0.5, B: 0.5 + 1 / 24, C: 0.5 + 2 / 24, D: 0.625, E: 2 / 3, F: 0.5 + 5 / 24 };  // A, E printed (LD 8-9); B-D, F this page's
  var FLAM_MS = [0, 6, 10, 14, 18, 23, 28, 34, 40];   // 909 flam settings 1-8 (keys 9-16): spacing this page's
  function swingOf(st) {
    var M = MACHINES[st.machine];
    if (M.swing === "shuffle") return { grid: 16, ratio: SHUF909[(st.shuffle || 1) - 1] };
    if (M.swing === "timing") return { grid: st.swingGrid || 8, ratio: LINN[st.timing || "A"] };
    if (M.swing === "percent") return { grid: st.swingGrid || 16, ratio: (st.swing || 50) / 100 };
    return { grid: 16, ratio: 0.5 };
  }
  function stepTicks(st) { return st.scale === 12 ? 32 : 24; }
  function cellsOf(st, c) { return (st.rows && st.rows[c]) || []; }

  // ---------- defaults / full states ----------
  function blankKit(M) { var k = {}; M.voices.forEach(function (v) { var p = {}; v[2].forEach(function (n) { p[n] = n === "level" ? 8 : 5; }); k[v[0]] = p; if (v[3]) k[v[3]] = JSON.parse(JSON.stringify(p)); }); return k; }
  function full(st) {
    var M = MACHINES[st.machine], s = { machine: M.id, bpm: st.bpm || 120, scale: st.scale || 16, len: st.len || st.scale || 16,
      shuffle: st.shuffle || 1, timing: st.timing || "A", swing: st.swing || 50, swingGrid: st.swingGrid || (M.swing === "timing" ? 8 : 16),
      quant: st.quant || (M.quant ? (st.scale === 12 ? "1/8T" : "1/16") : null), accLevel: st.accLevel == null ? 6 : st.accLevel,
      sw: Object.assign({}, st.sw || {}), kit: blankKit(M), rows: {}, acc: (st.acc || []).slice() };
    for (var c in (st.kit || {})) if (s.kit[c]) Object.assign(s.kit[c], st.kit[c]);
    for (c in (st.rows || {})) s.rows[c] = st.rows[c].map(function (x) { return x ? Object.assign({}, x) : 0; });
    return s;
  }

  // ---------- the canonical description: every machine's pattern as hits in ticks ----------
  function canonical(st0) {
    var st = full(st0), M = MACHINES[st.machine], T = stepTicks(st), sw = swingOf(st), hits = [];
    for (var c in st.rows) {
      var row = st.rows[c];
      for (var s = 0; s < st.len; s++) {
        var x = row[s]; if (!x) continue;
        var acc = !!x.a || !!st.acc[s];
        var v = x.v == null ? 0.75 : x.v;
        if (M.accent === "levels") { var n = (M.levels[c] || 1); v = n > 1 ? 0.45 + 0.55 * ((x.l || 1) - 1) / (n - 1) : 0.8; acc = n > 1 && (x.l || 1) === n; }
        hits.push({ c: c, s: s, o: x.o || 0, v: v, a: acc, f: x.f ? FLAM_MS[x.f] : 0 });
        if (x.x2) hits.push({ c: c, s: s, o: x.x2.o || 0, v: M.accent === "levels" ? 0.45 : x.x2.v, a: false, f: 0, second: true });
      }
    }
    return { bpm: st.bpm, steps: st.len, stepTicks: T, swing: sw, hits: hits, kit: st.kit, sw: st.sw, quant: st.quant,
      accLevel: st.accLevel, machine: st.machine };
  }
  // where each hit sounds, in beats from the bar's start (swing and offsets applied); flams give two onsets
  function onsets(st0) {
    var C = canonical(st0), out = [];
    C.hits.forEach(function (h) {
      var tk = h.s * C.stepTicks + h.o;
      if (C.stepTicks === 24 && C.swing.ratio !== 0.5) {
        var g = C.swing.grid === 8 ? 48 : 24, pos = h.s * 24;
        if (pos % (2 * g) === g) tk += (C.swing.ratio - 0.5) * 2 * g;
      }
      out.push({ c: h.c, s: h.s, t: tk / PPQ, v: h.v, a: h.a });
      if (h.f) out.push({ c: h.c, s: h.s, t: tk / PPQ + h.f / 1000 * C.bpm / 60, v: h.v * 0.8, a: false, flam: true });
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }

  // ---------- the translator ----------
  function note(N, cls, what, why, cites, from, to) { N.push({ cls: cls, what: what, why: why, cite: cites, ctl: { from: from || [], to: to || [] } }); }
  function translate(st0, toId) {
    var src = full(st0), A = MACHINES[src.machine], B = MACHINES[toId], C = canonical(src), N = [];
    var out = { machine: B.id, bpm: src.bpm, scale: src.scale, len: src.len, rows: {}, kit: {}, acc: [], sw: {} };
    var used = {}; C.hits.forEach(function (h) { used[h.c] = true; });
    var map = {};
    // 1. instruments
    Object.keys(used).forEach(function (c) {
      var la = vLabel(A, c);
      if (hasVoice(B, c)) { map[c] = c; note(N, "exact", la + " → " + vLabel(B, c), "Both machines have it (" + B.cites.voices.title + " p. " + B.cites.voices.page + ").", [A.cites.voices, B.cites.voices], ["v:" + c], ["v:" + c]); return; }
      var alt = (SUBST[c] || []).filter(function (d) { return hasVoice(B, d) && !used[d]; })[0] || (SUBST[c] || []).filter(function (d) { return hasVoice(B, d); })[0];
      if (alt) { map[c] = alt; note(N, "approx", la + " → " + vLabel(B, alt), "The " + B.name + " machine has no " + CANON[c].toLowerCase() + "; the nearest sound it has is its " + vLabel(B, alt) + ". It is a different instrument, so the part keeps its rhythm but changes colour.", [A.cites.voices, B.cites.voices], ["v:" + c], ["v:" + alt]); }
      else note(N, "lost", la + " is lost", "The " + B.name + " machine has no " + CANON[c].toLowerCase() + " and nothing close to it (" + B.cites.voices.title + " p. " + B.cites.voices.page + "). Its hits are dropped." + (B.id === "mpc60" ? " On a real MPC you would sample one onto a spare pad (MP p. 5); this page's stand-in kit has none." : ""), [A.cites.voices, B.cites.voices], ["v:" + c], []);
    });
    // the 808's switches: a tom or a conga on one circuit, never both (SN p. 6)
    if (B.id === "tr808") B.voices.forEach(function (v) {
      if (!v[3]) return;
      var usesA = Object.keys(map).filter(function (c) { return map[c] === v[0]; }), usesB = Object.keys(map).filter(function (c) { return map[c] === v[3]; });
      if (usesA.length && usesB.length) {
        usesB.forEach(function (c) { delete map[c]; });
        note(N, "lost", vLabel(B, v[3]) + " and " + v[1] + " together", "On the 808 these two share one sound circuit, chosen by a switch (SN p. 6), so one pattern can use only one of them. The " + v[1].toLowerCase() + " is kept.", [cite("SN", 6)], usesB.map(function (c) { return "v:" + c; }), ["v:" + v[0]]);
      } else if (usesB.length) out.sw[v[0]] = true;
    });
    // 2. per-voice knobs
    Object.keys(map).forEach(function (c) {
      var d = map[c], ap = (voiceOf(A, c) || [])[2] || [], bp = (voiceOf(B, d) || [])[2] || [], kp = src.kit[c] || {}, o = {};
      ap.forEach(function (p) {
        var val = kp[p], def = p === "level" ? 8 : 5;
        if (bp.indexOf(p) >= 0) { o[p] = val; if (val !== def) note(N, "approx", vLabel(A, c) + " " + PNAME[p].toLowerCase() + " " + val, "Both have a " + PNAME[p].toLowerCase() + " control, but different circuits and ranges; the page keeps the knob position (" + val + ").", [A.cites.voices, B.cites.voices, PAGE], ["p:" + c + "." + p], ["p:" + d + "." + p]); }
        else if (val !== def) note(N, "lost", vLabel(A, c) + " " + PNAME[p].toLowerCase() + " " + val, "The " + B.name + " " + vLabel(B, d).toLowerCase() + " has no " + PNAME[p].toLowerCase() + " control" + (B.id === "linn" && p === "tune" ? " (on the LinnDrum only the snare, sidestick, toms and congas tune, LD p. 1)" : B.id === "linn" && p === "decay" ? " (the LinnDrum's only decay knob is the closed hi-hat's, LD p. 1)" : "") + ".", [A.cites.voices, B.cites.voices], ["p:" + c + "." + p], ["v:" + d]);
      });
      out.kit[d] = Object.assign(out.kit[d] || {}, o);
    });
    // 3. pattern length and scale
    if (src.scale === 12) note(N, B.id === "tr808" ? "approx" : "exact", "Triplet scale (12 steps)", B.id === "tr909" ? "The 909's Scale button gives triplet steps (O9 p. 24)." : B.id === "tr808" ? "The 808's pre-scale selector changes the step length (O8, SN p. 1); which position gives triplets is this page's reading." : "Error correct 1/8T (" + B.cites.quant.title + " p. " + B.cites.quant.page + ").", [B.cites.steps], ["s:scale"], ["s:scale"]);
    if (src.len !== (src.scale || 16)) note(N, B.id === "tr909" || B.id === "tr808" ? "exact" : "approx", "Pattern of " + src.len + " steps", B.id === "tr909" ? "The 909's Last Step sets any length 1-16 (O9 p. 24)." : B.id === "tr808" ? "The 808 takes 1-32 steps a measure (SN p. 1)." : "Set the pattern length in beats; an odd number of steps becomes a bar of 7/8 or the like (LD p. 6).", [B.cites.steps], ["s:len"], ["s:len"]);
    // 4. timing: offsets off the grid
    var offs = C.hits.filter(function (h) { return h.o; });
    var fine = (B.id === "mpc60") || (B.id === "linn");
    var msPerTick = 60000 / src.bpm / PPQ;
    if (offs.length) {
      var maxE = Math.max.apply(null, offs.map(function (h) { return Math.abs(h.o); })) * msPerTick;
      if (fine) note(N, "exact", offs.length + " notes off the grid", B.id === "mpc60" ? "Timing correct OFF keeps every note where it was played, at 96 parts per quarter note (MP pp. 26, 43)." : "Error correct HI plays notes back as recorded (LD p. 7).", [B.cites.quant], ["s:quant"], ["s:quant"]);
      else note(N, "approx", offs.length + " notes off the grid", "The " + B.name + " machine writes only on its steps, so each note moves to the nearest one: up to " + Math.round(maxE) + " ms of the feel is gone (" + B.cites.steps.title + " p. " + B.cites.steps.page + ").", [A.cites.quant || A.cites.steps, B.cites.steps], ["s:quant"], ["s:scale"]);
    }
    out.quant = B.quant ? (offs.length ? B.quant[B.quant.length - 1] : (src.scale === 12 ? "1/8T" : "1/16")) : null;
    // 5. swing
    var sw = C.swing;
    if (sw.ratio > 0.5 && src.scale === 16) {
      var pct = Math.round(sw.ratio * 1000) / 10;
      if (B.swing === "percent") { out.swing = Math.round(sw.ratio * 100); out.swingGrid = sw.grid; note(N, A.swing === "percent" ? "exact" : "approx", "Swing " + pct + " % on " + sw.grid + "ths", "Swing% " + out.swing + " on 1/" + sw.grid + " notes (MP p. 44: 50 % straight, 66 % a perfect triplet, 75 % the most)." + (A.swing !== "percent" ? " The " + A.name + " setting is not printed as a percentage; " + pct + " % is this page's reading." : ""), [cite("MP", 44), A.cites.swing || PAGE].concat(A.swing === "percent" ? [] : [PAGE]), ["s:swing"], ["s:swing"]); }
      else if (B.swing === "timing") { var best = "A"; for (var k in LINN) if (Math.abs(LINN[k] - sw.ratio) < Math.abs(LINN[best] - sw.ratio)) best = k; out.timing = best; out.swingGrid = sw.grid;
        note(N, Math.abs(LINN[best] - sw.ratio) < 0.005 ? "exact" : "approx", "Swing " + pct + " % → timing " + best, "The LinnDrum has six timing settings, A straight to F shuffle, on 1/8 or 1/16 notes; E is a perfect triplet shuffle (LD pp. 8-9). Only A and E are pinned down by the manual; the page spaces B-D and F evenly.", [cite("LD", "8-9"), PAGE], ["s:swing"], ["s:swing"]); }
      else if (B.swing === "shuffle") {
        var bi = 0; SHUF909.forEach(function (r, i) { if (Math.abs(r - sw.ratio) < Math.abs(SHUF909[bi] - sw.ratio)) bi = i; }); out.shuffle = bi + 1;
        if (sw.grid === 8) note(N, "approx", "Swung 8ths → shuffle on 16ths", "The 909's shuffle moves the off-beat 16th notes (O9 p. 26); swinging 8ths cannot be set. Shuffle " + (bi + 1) + " is the nearest bounce, applied to the 16ths instead.", [cite("O9", 26)], ["s:swing"], ["s:swing"]);
        else note(N, "approx", "Swing " + pct + " % → shuffle " + (bi + 1), "The 909 has seven shuffle settings on its 16th scale, 1 = none, more bounce towards 7 (O9 p. 26). How far each setting moves a note is not printed; the page spreads them from 50 % to 75 %.", [cite("O9", 26), PAGE], ["s:swing"], ["s:swing"]);
      } else note(N, "lost", "Swing " + pct + " %", "The 808's manual and service notes describe no shuffle or swing control (SN p. 1 lists the sequencer's features). Every step plays straight.", [cite("SN", 1), cite("O8", "intro")], ["s:swing"], []);
    } else if (sw.ratio > 0.5) note(N, "lost", "Swing on a triplet scale", "Triplet steps are already swung; the setting is dropped.", [PAGE], ["s:swing"], []);
    // 6. dynamics and accents
    var accHits = C.hits.filter(function (h) { return h.a; }), velHits = C.hits.filter(function (h) { return !h.a && Math.abs(h.v - 0.75) > 0.1; });
    if (A.accent === "velocity" && velHits.length && B.accent !== "velocity") note(N, "approx", "Velocities → " + (B.accent === "levels" ? "levels" : "accents"), B.accent === "levels" ? "The LinnDrum's dynamics are two or three fixed levels on a few drums only (LD p. 1); each MPC velocity goes to the nearest." : "The " + B.name + " machine knows only normal and accented. Notes louder than 85 % of full become accents (a threshold of this page's).", [cite("MP", "21-22"), B.cites.accent, PAGE], ["s:accent"], ["s:accent"]);
    C.hits.forEach(function (h) {
      var d = map[h.c]; if (!d) return;
      var row = out.rows[d] = out.rows[d] || []; var s = h.s, o = h.o;
      if (!fine && o) { s = Math.round((h.s * C.stepTicks + o) / C.stepTicks); o = 0; if (s >= src.len) s -= src.len; }
      var cell = { v: Math.round(h.v * 100) / 100 };
      if (o && B.id === "mpc60") cell.o = o;
      if (o && B.id === "linn") cell.o = o;
      var loud = h.a || h.v > 0.85;
      if (B.accent === "levels") { var n = B.levels[d] || 1; cell = { l: n > 1 ? (loud ? n : Math.max(1, Math.min(n, 1 + Math.round((h.v - 0.45) / 0.55 * (n - 1))))) : 1 }; if (o) cell.o = o; }
      else if (B.accent === "velocity") { cell.v = loud && h.a ? 1 : cell.v; }
      else if (loud) { if (B.voiceAccent.indexOf(d) >= 0) cell.a = true; else out.acc[s] = true; }
      if (h.f) { if (B.flam.indexOf(d) >= 0) { var fi = 1; FLAM_MS.forEach(function (m, i) { if (i && Math.abs(m - h.f) < Math.abs(FLAM_MS[fi] - h.f)) fi = i; }); cell.f = fi; } }
      row[s] = cell;
      if (h.f && B.flam.indexOf(d) < 0 && fine) cell.x2 = { o: (cell.o || 0) + Math.round(h.f / msPerTick), v: Math.round(h.v * 70) / 100, l: 1 };   // the flam's second hit as its own note
    });
    for (var rk in out.rows) for (var i = 0; i < src.len; i++) if (!out.rows[rk][i]) out.rows[rk][i] = 0;
    if (accHits.length) {
      var perVoice = A.voiceAccent && A.voiceAccent.length || A.accent !== "total";
      if (B.accent === "total" && B.voiceAccent.length === 0 && perVoice) note(N, "approx", "Accents on single drums", "The 808's accent is one row for the whole step: every sound on that step gets louder (SN p. 1, accent 0-10 dB). An accented snare also accents the hi-hat beside it.", [cite("SN", 1)], ["s:accent"], ["s:accent"]);
      else if (B.accent === "total") note(N, "approx", "Accents", "The 909 has an accent for each of bass drum, snare, toms and closed hat, and a total accent for every voice on a step (O9 p. 25). Accents on other sounds become total accents.", [cite("O9", 25)], ["s:accent"], ["s:accent"]);
      else if (B.accent === "levels") note(N, "approx", "Accents → the loudest level", "The LinnDrum has no accent: its snare has three levels and bass, hi-hat, cabasa, tambourine and ride two (LD p. 1). Accents go to the top level; on drums with one level they are lost.", [cite("LD", 1)], ["s:accent"], ["s:accent"]);
      else note(N, "exact", "Accents → velocity", "An accent becomes a louder velocity; the MPC's 16 Levels key plays a sound at 16 fixed velocities (MP pp. 21-22).", [cite("MP", "21-22")], ["s:accent"], ["s:accent"]);
    }
    if (src.machine === "tr808" || src.machine === "tr909") { out.accLevel = src.accLevel; }
    // 7. flams
    var flams = C.hits.filter(function (h) { return h.f; });
    if (flams.length) {
      if (B.flam.length) note(N, "exact", "Flams", "Flam on bass drum, snare and toms, eight intervals (O9 p. 26).", [cite("O9", 26)], ["s:flam"], ["s:flam"]);
      else if (fine) note(N, "approx", "Flams → two notes", "The " + B.name + " machine has no flam, but its fine timing can hold the second hit a few ticks later as its own note, which is what the 909 does: the first hit on the step, the second after it (O9 p. 26). The interval in ms is this page's.", [cite("O9", 26), B.cites.quant, PAGE], ["s:flam"], ["s:quant"]);
      else note(N, "lost", "Flams", "The 808 has no flam and no timing finer than its steps (SN p. 1); each flam is one hit.", [cite("SN", 1), cite("O9", 26)], ["s:flam"], []);
    }
    // 8. tempo
    if (B.tempo && (src.bpm < B.tempo[0] || src.bpm > B.tempo[1])) { out.bpm = Math.max(B.tempo[0], Math.min(B.tempo[1], src.bpm)); note(N, "approx", "Tempo " + src.bpm, "The 808's tempo runs from 40 to 300 (SN p. 1).", [cite("SN", 1)], ["s:tempo"], ["s:tempo"]); }
    else note(N, "exact", "Tempo " + src.bpm, "Tempo carries over.", [B.cites.steps], ["s:tempo"], ["s:tempo"]);
    // 9. the sound itself
    note(N, "approx", "The sound", soundWhy(A) + " " + soundWhy(B), [A.id === "tr808" || B.id === "tr808" ? cite("SN", "5-6") : null, (A.id === "tr909" || B.id === "tr909") ? cite("W909", "Hardware") : null, (A.id === "linn" || B.id === "linn") ? cite("WLD", "infobox") : null, (A.id === "mpc60" || B.id === "mpc60") ? cite("MP", 15) : null].filter(Boolean), [], []);
    return { state: full(out), notes: N };
  }
  function soundWhy(M) {
    return M.id === "tr808" ? "808: every voice is synthesised here after the service notes' circuit descriptions (SN pp. 5-6); levels and curves are this page's." :
      M.id === "tr909" ? "909: drums synthesised; the real hats and cymbals are 6-bit samples (Wikipedia), so here a synthesised stand-in is cut to 6 bits." :
      M.id === "linn" ? "LinnDrum: the real one plays 8-bit recordings of drums at 28-35 kHz (Wikipedia); here synthesised stand-ins are cut to 8 bits at 30 kHz." :
      "MPC60: the real one plays whatever was sampled into it, 12-bit at 40 kHz (MP p. 15); here synthesised stand-ins at that rate and depth.";
  }

  // ---------- worked examples (made for this page; not transcriptions of records) ----------
  function R(str, mk) { return str.split("").map(function (ch) { return ch === "." ? 0 : mk(ch); }); }
  var on = function () { return { v: 0.75 }; }, acc = function (ch) { return ch === "X" ? { v: 0.75, a: true } : { v: 0.75 }; };
  var EXAMPLES = [
    { id: "electro808", name: "Electro on the 808: cowbell and congas", from: "tr808", say: "Bass drum, clap on 2 and 4, 16th hats, cowbell and a conga. Turn it into the 909: the cowbell and conga have nowhere to go.",
      s: { machine: "tr808", bpm: 112, sw: { mtom: true }, rows: { kick: R("x.....x...x.....", on), clap: R("....x.......x...", on), chh: R("xxxxxxxxxxxxxxxx", on),
        cowbell: R("..x.....x.....x.", on), mconga: R(".......x.....x..", on) }, acc: R("x...x...x...x...", function () { return true; }).map(Boolean),
        kit: { kick: { decay: 8, tone: 4 } } } },
    { id: "house909", name: "House on the 909: four on the floor, shuffle", from: "tr909", say: "Bass drum on every beat, open hat on the off-beats, clap on 2 and 4, shuffle 3. Turn it into the 808: the shuffle is lost.",
      s: { machine: "tr909", bpm: 124, shuffle: 3, rows: { kick: R("X...x...X...x...", acc), ohh: R("..x...x...x...x.", on), clap: R("....x.......x...", on),
        chh: R(".x.x.x.x.x.x.x.x", on), ride: R("x.x.x.x.x.x.x.x.", on) }, kit: { kick: { attack: 7, decay: 6 } } } },
    { id: "flam909", name: "909 snare with flams and accents", from: "tr909", say: "A snare fill with flams and per-drum accents. On the MPC each flam becomes two notes; on the 808 the flams are lost and the accents spread to the whole step.",
      s: { machine: "tr909", bpm: 128, rows: { kick: R("x...x...x...x...", on), snare: [0, 0, 0, 0, { v: .75, a: true }, 0, 0, 0, 0, 0, { v: .75, f: 4 }, { v: .75 }, { v: .75, a: true, f: 6 }, { v: .75, f: 2 }, { v: .75, a: true }, { v: .75, a: true }],
        chh: R("x.x.x.x.x.x.x.x.", on) } } },
    { id: "linnpop", name: "LinnDrum pop beat, timing D", from: "linn", say: "Bass, snare at two levels, hi-hat 8ths with a shuffle of D, tambourine and claps. The 909 cannot swing 8ths; the 808 cannot swing at all.",
      s: { machine: "linn", bpm: 104, timing: "D", swingGrid: 8, rows: { kick: R("x.....x.x.......", function () { return { l: 2 }; }), snare: [0, 0, 0, 0, { l: 3 }, 0, 0, { l: 1 }, 0, 0, 0, 0, { l: 3 }, 0, 0, 0],
        chh: R("x.x.x.x.x.x.x.x.", function () { return { l: 1 }; }).map(function (x, i) { return x && i % 4 === 0 ? { l: 2 } : x; }), tamb: R("....x.......x...", function () { return { l: 2 }; }), clap: R("....x.......x...", function () { return { l: 1 }; }) },
        kit: { snare: { tune: 4 }, chh: { decay: 3 } } } },
    { id: "mpcloose", name: "MPC beat, swing 62 %, timing correct off", from: "mpc60", say: "A loose hip-hop beat: swing 62 % (the manual's own suggestion, MP p. 44) and a late snare and kick played by hand. On a step machine every late note jumps to the grid.",
      s: { machine: "mpc60", bpm: 92, swing: 62, swingGrid: 16, quant: "OFF", rows: { kick: [{ v: 1 }, 0, 0, 0, 0, 0, 0, { v: .7, o: 5 }, 0, 0, { v: .9, o: -3 }, 0, 0, 0, 0, 0],
        snare: [0, 0, 0, 0, { v: .95, o: 7 }, 0, 0, 0, 0, 0, 0, 0, { v: 1, o: 9 }, 0, 0, { v: .45, o: 4 }], chh: R("x.x.x.x.x.x.x.x.", function () { return { v: .6 }; }).map(function (x, i) { return x && i % 4 === 2 ? { v: .4, o: 2 } : x; }),
        rim: R("..........x.....", function () { return { v: .5 }; }) }, kit: { kick: { tune: 4, decay: 6 } } } },
    { id: "trip808", name: "808 triplet hats (12 steps)", from: "tr808", say: "The pre-scale set to triplets: 12 steps a bar. A triplet grid maps straight onto the 909's triplet scale and the MPC's 1/8T.",
      s: { machine: "tr808", bpm: 70, scale: 12, len: 12, rows: { kick: R("x.....x..x..", on), snare: R("...x.....x..", on), chh: R("xxxxxxxxxxxx", on), ohh: R(".....x......", on) } } }
  ];

  // ---------- JSON exchange ----------
  function exportJSON(st, meta) {
    meta = meta || {}; var s = full(st);
    return JSON.stringify({ kind: "drum-pattern", version: 1, machine: s.machine, kit: s.kit,
      pattern: { bpm: s.bpm, scale: s.scale, len: s.len, shuffle: s.shuffle, timing: s.timing, swing: s.swing, swingGrid: s.swingGrid, quant: s.quant, accLevel: s.accLevel, sw: s.sw, acc: s.acc, rows: s.rows },
      song: meta.song || "", artist: meta.artist || "", source: { url: (meta.source || {}).url || "", channel: (meta.source || {}).channel || "", title: (meta.source || {}).title || "", at: (meta.source || {}).at || "" } }, null, 1);
  }
  function importJSON(text) {
    var d = typeof text === "string" ? JSON.parse(text) : text;
    if (!d || d.kind !== "drum-pattern") throw new Error("not a drum-pattern file (kind must be \"drum-pattern\")");
    if (d.version !== 1) throw new Error("unknown version " + d.version);
    if (!MACHINES[d.machine]) throw new Error("unknown machine " + d.machine + " (one of " + ORDER.join(", ") + ")");
    var p = d.pattern || {}, M = MACHINES[d.machine];
    for (var c in (p.rows || {})) if (!hasVoice(M, c)) throw new Error("the " + M.name + " has no voice \"" + c + "\"");
    var st = full(Object.assign({ machine: d.machine, kit: d.kit }, p));
    return { state: st, meta: { song: d.song || "", artist: d.artist || "", source: d.source || {} } };
  }

  // ---------- the engine (AudioWorklet), as source text ----------
  function workletSource() {
    /* global sampleRate, registerProcessor, AudioWorkletProcessor, currentTime */
    var MET = [205.3, 304.4, 369.6, 522.7, 540, 800];   // the six square waves: this page's frequencies (SN p. 6 gives only "six")
    var BASE = { ltom: 98, mtom: 140, htom: 196, lconga: 190, mconga: 280, hconga: 400 };   // this page's
    function Noise(seed) { this.s = seed || 12345; }
    Noise.prototype.n = function () { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s / 0x3fffffff - 1; };
    function k(x) { return x == null ? 0.5 : x / 10; }        // knob 0-10 -> 0-1
    // one hit of one voice. Every constant below is this page's, shaped by the circuit descriptions where they exist.
    function Hit(m, c, p, vel, acc, accLevel, sr) {
      this.m = m; this.c = c; this.sr = sr; this.t = 0; this.done = false; this.nz = new Noise(1 + ((c.length * 7919 + vel * 1000) | 0));
      var lv = k(p.level == null ? 8 : p.level);
      var g = vel * lv; if (acc) g *= Math.pow(10, (accLevel == null ? 6 : accLevel) / 20 * 0.8) / 1.6 + 0.4;   // SN p. 1: accent 0-10 dB
      this.g = g; this.acc = acc; this.tune = Math.pow(2, (k(p.tune) - 0.5) * (m === "linn" ? 1 : 1.2));       // LD p. 1: about an octave
      this.dec = k(p.decay); this.tone = k(p.tone); this.snap = k(p.snappy); this.att = k(p.attack);
      this.ph = [0, 0, 0, 0, 0, 0]; this.lp = 0; this.lp2 = 0; this.hp = 0; this.hpx = 0; this.bp = [0, 0]; this.hold = 0; this.hc = 0; this.y = 0;
      this.bits = m === "linn" ? 8 : m === "mpc60" ? 12 : (m === "tr909" && /hh|crash|ride/.test(c)) ? 6 : 0;
      this.rate = m === "linn" ? 30000 : m === "mpc60" ? 40000 : (this.bits ? 32000 : 0);
    }
    function svf(st, x, f, q, sr) { var F = 2 * Math.sin(Math.PI * Math.min(f, sr * 0.45) / sr); var lo = st[1] + F * st[0]; var hi = x - lo - q * st[0]; var bd = F * hi + st[0]; st[0] = bd; st[1] = lo; return bd; }
    Hit.prototype.next = function () {
      var t = this.t, sr = this.sr, dt = 1 / sr, c = this.c, m = this.m, y = 0, e, f, i, n;
      this.t += dt;
      if (c === "kick") {
        var f0 = (m === "tr808" ? 49 : m === "tr909" ? 52 : 58) * this.tune;
        if (m === "tr808") { f = (this.acc && t < 0.004) ? f0 * 2 : f0; e = Math.exp(-t / (0.08 + this.dec * 0.9)); }       // SN p. 5: accent starts it at twice the frequency for 4 ms
        else { f = f0 * (1 + 2.2 * Math.exp(-t / 0.028)); e = Math.exp(-t / (m === "tr909" ? 0.07 + this.dec * 0.45 : 0.08 + this.dec * 0.3)); }
        this.ph[0] += f * dt; y = Math.sin(2 * Math.PI * this.ph[0]) * e;
        if (m !== "tr808") y += this.nz.n() * Math.exp(-t / 0.0025) * (m === "tr909" ? 0.15 + this.att * 0.9 : 0.35);
        if (m === "tr808") { var fc = 150 + this.tone * 3000; this.lp += (y - this.lp) * (1 - Math.exp(-2 * Math.PI * fc * dt)); y = this.lp * 1.3; }
        if (t > 3) this.done = true;
      } else if (c === "snare") {
        f = 180 * this.tune; e = Math.exp(-t / 0.09);
        this.ph[0] += f * dt; this.ph[1] += f * 1.86 * dt;
        var body = (Math.sin(2 * Math.PI * this.ph[0]) * (1 - this.tone * 0.5) + Math.sin(2 * Math.PI * this.ph[1]) * (0.3 + this.tone * 0.6)) * e;   // SN p. 6: two networks, the tone knob sets the ratio
        n = this.nz.n(); this.hpx = n; var hn = n - this.hp; this.hp = n * 0.1 + this.hp * 0.9; hn = n - this.hp;
        var sn = hn * Math.exp(-t / (0.04 + (m === "tr909" ? this.snap : this.snap) * 0.22)) * (0.2 + this.snap * 0.9);
        y = body * 0.8 + sn * 0.7; if (t > 1.2) this.done = true;
      } else if (BASE[c]) {
        var conga = /conga/.test(c);
        f = BASE[c] * this.tune * (1 + (conga ? 0.12 : 0.3) * Math.exp(-t / 0.03));          // SN p. 6: pitch falls as the ring dies
        e = Math.exp(-t / (conga ? 0.16 : (m === "tr808" ? 0.32 : 0.12 + this.dec * 0.5)));
        this.ph[0] += f * dt; y = Math.sin(2 * Math.PI * this.ph[0]) * e;
        if (m === "tr808" && c === "ltom") { this.lp += (this.nz.n() - this.lp) * 0.05; y += this.lp * Math.exp(-t / 0.35) * 0.6; }   // SN p. 6: pink noise on the low tom
        if (m !== "tr808") y += this.nz.n() * Math.exp(-t / 0.004) * 0.2;
        if (t > 2) this.done = true;
      } else if (c === "rim" || c === "clave") {
        f = c === "clave" ? 2500 : 1700; this.ph[0] += f * this.tune * dt; this.ph[1] += 480 * this.tune * dt;
        y = (Math.sin(2 * Math.PI * this.ph[0]) * 0.8 + (c === "rim" ? Math.sin(2 * Math.PI * this.ph[1]) * 0.6 : 0)) * Math.exp(-t / (c === "clave" ? 0.025 : 0.012));
        if (m !== "tr808" && c === "rim") y += this.nz.n() * Math.exp(-t / 0.006) * 0.5;
        if (t > 0.5) this.done = true;
      } else if (c === "clap") {
        n = svf(this.bp, this.nz.n(), 1100, 0.6, sr);
        var ph = t % 0.011, burst = t < 0.033 ? (1 - ph / 0.011) : 0;                       // SN p. 6: a sawtooth envelope, three times
        e = Math.max(burst, Math.exp(-(Math.max(0, t - 0.03)) / 0.12) * 0.55 * (t >= 0.03 ? 1 : 0));   // and a longer "reverb"
        y = n * e * 2.2; if (t > 1) this.done = true;
      } else if (c === "maracas" || c === "cabasa" || c === "tamb") {
        n = this.nz.n(); this.hp = this.hp * 0.6 + n * 0.4; n = n - this.hp;
        e = Math.exp(-t / (c === "maracas" ? 0.02 : c === "cabasa" ? 0.045 : 0.13));
        y = n * e * 1.3;
        if (c === "tamb") { for (i = 0; i < 3; i++) this.ph[i] += [5800, 7300, 9100][i] * dt; y += (Math.sin(2 * Math.PI * this.ph[0]) + Math.sin(2 * Math.PI * this.ph[1]) + Math.sin(2 * Math.PI * this.ph[2])) * 0.15 * e; }
        if (t > 1) this.done = true;
      } else if (c === "cowbell") {
        this.ph[0] += 540 * this.tune * dt; this.ph[1] += 800 * this.tune * dt;            // SN p. 6: two square oscillators (frequencies this page's)
        var sq = ((this.ph[0] % 1) < 0.5 ? 1 : -1) + ((this.ph[1] % 1) < 0.5 ? 1 : -1);
        e = t < 0.015 ? 1 - (t / 0.015) * 0.65 : 0.35 * Math.exp(-(t - 0.015) / 0.22);    // SN p. 6: an abrupt early drop "to emphasize attack"
        y = svf(this.bp, sq, 1100, 0.9, sr) * e * 1.1; if (t > 1.5) this.done = true;
      } else {   // chh ohh cymbal crash ride: six squares (SN p. 6), or noise for the stand-in samples
        var s6 = 0;
        for (i = 0; i < 6; i++) { this.ph[i] += MET[i] * (c === "ride" ? 0.82 : 1) * this.tune * dt; s6 += (this.ph[i] % 1) < 0.5 ? 1 : -1; }
        if (m !== "tr808") s6 = s6 * 0.5 + this.nz.n() * (c === "ride" ? 1.0 : 2.0);
        this.hp = this.hp * 0.7 + s6 * 0.3; var hi = s6 - this.hp;
        var bright = c === "cymbal" ? 3000 + this.tone * 5000 : c === "ride" ? 5200 : 8200;
        hi = svf(this.bp, hi, bright, 0.8, sr) * 0.6 + hi * 0.25;
        var dd = c === "chh" ? 0.035 + this.dec * 0.08 : c === "ohh" ? 0.18 + this.dec * 0.5 : c === "cymbal" ? 0.5 + this.dec * 1.4 : c === "crash" ? 1.1 : 0.9;
        e = Math.exp(-t / dd); y = hi * e * 0.35; if (t > dd * 7) this.done = true;
      }
      y *= this.g;
      if (this.bits) {                                                                      // sample-and-hold at the machine's rate, then cut to its bits
        this.hc += this.rate / sr; if (this.hc >= 1) { this.hc -= 1; var q = Math.pow(2, this.bits - 1); this.hold = Math.round(Math.max(-1, Math.min(1, y)) * q) / q; }
        y = this.hold;
      }
      return y;
    };
    var Proc = class extends AudioWorkletProcessor { constructor() { super(); init.call(this); } };
    function init() {
      var self = this; this.q = []; this.v = []; this.frame = 0; this.gain = 0.6;
      this.port.onmessage = function (e) { self.msg(e.data); };
    }
    Proc.prototype.msg = function (d) {
      if (d.type === "hit") { this.q.push(d); this.q.sort(function (a, b) { return a.at - b.at; }); }
      else if (d.type === "stop") { this.q = []; this.v = []; }
      else if (d.type === "gain") this.gain = d.v;
    };
    Proc.prototype.now = function () { return typeof currentTime !== "undefined" ? currentTime : this.frame / sampleRate; };
    Proc.prototype.start = function (d) {
      if (d.c === "chh" || (d.c === "ohh" && d.m === "linn")) this.v.forEach(function (h) { if (h.c === "ohh" && h.m === d.m && d.c === "chh") h.done = true; });   // SN p. 6, LD p. 1: closed cuts open
      if (this.v.length > 24) this.v.shift();
      this.v.push(new Hit(d.m, d.c, d.p || {}, d.vel == null ? 0.75 : d.vel, !!d.acc, d.accLevel, sampleRate));
    };
    Proc.prototype.process = function (ins, outs) {
      var out = outs[0], N = out[0].length, t0 = this.now(), sr = sampleRate, i, j;
      for (i = 0; i < N; i++) {
        var t = t0 + i / sr;
        while (this.q.length && this.q[0].at <= t) this.start(this.q.shift());
        var s = 0;
        for (j = 0; j < this.v.length; j++) s += this.v[j].next();
        s *= this.gain; s = s > 1.5 ? 1 : s < -1.5 ? -1 : s - s * s * s * 0.148;
        for (var ch = 0; ch < out.length; ch++) out[ch][i] = s;
      }
      this.v = this.v.filter(function (h) { return !h.done; });
      this.frame += N; return true;
    };
    registerProcessor("drum-compare", Proc);
  }
  var SRC = "(" + workletSource.toString() + ")();";
  DC.workletSource = SRC;
  // the same engine, run here for plots and tests
  var Offline = null;
  function offlineProc() {
    if (!Offline) { function AWP() { this.port = {}; } new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", SRC)(AWP, function (n, c) { Offline = c; }, 48000); }
    return new Offline();
  }
  function render(machine, c, params, vel, secs, acc) {
    var p = offlineProc(), N = Math.round((secs || 0.6) * 48000), out = new Float32Array(N), buf = [[new Float32Array(128)]];
    p.port.onmessage({ data: { type: "gain", v: 1 } });
    p.port.onmessage({ data: { type: "hit", at: 0, m: machine, c: c, p: params || {}, vel: vel == null ? 0.8 : vel, acc: !!acc } });
    for (var i = 0; i < N; i += 128) { p.process([], buf); out.set(buf[0][0].subarray(0, Math.min(128, N - i)), i); }
    return out;
  }
  function renderPattern(st, bars) {
    var p = offlineProc(), on = onsets(st), s = full(st), spb = 60 / s.bpm, barB = s.len * stepTicks(s) / PPQ, N = Math.round(barB * spb * (bars || 1) * 48000), out = new Float32Array(N), buf = [[new Float32Array(128)]];
    for (var b = 0; b < (bars || 1); b++) on.forEach(function (h) { var x = s.rows[h.c][h.s] || {}; p.port.onmessage({ data: { type: "hit", at: (b * barB + h.t) * spb, m: s.machine, c: h.c, p: s.kit[h.c], vel: h.v, acc: h.a, accLevel: s.accLevel } }); });
    for (var i = 0; i < N; i += 128) { p.process([], buf); out.set(buf[0][0].subarray(0, Math.min(128, N - i)), i); }
    return out;
  }

  // ---------- live audio ----------
  var ctxP = null;
  function audio() {
    if (ctxP) return ctxP;
    var AC = global.AudioContext || global.webkitAudioContext, ctx = new AC();
    var url = URL.createObjectURL(new Blob([SRC], { type: "text/javascript" }));
    ctxP = ctx.audioWorklet.addModule(url).then(function () { return engineNode(ctx); });
    return ctxP;
  }
  function engineNode(ctx, dest) {
    var node = new AudioWorkletNode(ctx, "drum-compare", { numberOfInputs: 0, outputChannelCount: [2] });
    var an = ctx.createAnalyser(); an.fftSize = 2048; node.connect(an);
    var out = ctx.createGain(); node.connect(out); if (dest !== false) out.connect(ctx.destination);
    if (global.AudioTap) AudioTap.register(ctx, out, "Drum Compare");
    return { ctx: ctx, node: node, out: out, analyser: an };
  }
  // for a later DAW hookup: one machine's kit as a playable sound on any AudioContext
  DC.voice = function (ctx, machine, kit) {
    var M = MACHINES[machine]; if (!M) return Promise.reject(new Error("unknown machine " + machine));
    var k = full({ machine: machine, kit: kit || {} }).kit;
    var url = URL.createObjectURL(new Blob([SRC], { type: "text/javascript" }));
    var ready = ctx.__dcLoaded || (ctx.__dcLoaded = ctx.audioWorklet.addModule(url));
    return ready.then(function () {
      var E = engineNode(ctx, false);
      return { output: E.out, voices: machineVoices(M),
        hit: function (c, when, vel, accent) { E.node.port.postMessage({ type: "hit", at: when == null ? ctx.currentTime : when, m: machine, c: c, p: k[c] || {}, vel: vel == null ? 0.8 : vel, acc: !!accent }); },
        set: function (c, p) { k[c] = Object.assign(k[c] || {}, p); }, stop: function () { E.node.port.postMessage({ type: "stop" }); } };
    });
  };

  // ---------- the widget ----------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var widgets = [];
  function mount(host) {
    var W = { host: host, a: full(EXAMPLES[0].s), toId: "tr909", meta: {}, playing: null };
    host.innerHTML = ""; host.classList.add("dcmp-w");
    var top = el("div", "dcmp-top");
    var exSel = el("select"); EXAMPLES.forEach(function (x) { var o = el("option", null, esc(x.name)); o.value = x.id; exSel.appendChild(o); });
    var lab = el("label", "dcmp-lab", "Example "); lab.appendChild(exSel); top.appendChild(lab);
    var bA = el("button", "btn btn-sm btn-outline-secondary", "▶ A"), bB = el("button", "btn btn-sm btn-outline-secondary", "▶ B"), bAB = el("button", "btn btn-sm btn-outline-secondary", "▶ A, then B"), bS = el("button", "btn btn-sm btn-outline-secondary", "■ Stop");
    [bA, bB, bAB, bS].forEach(function (b) { top.appendChild(b); });
    var bEx = el("button", "btn btn-sm btn-outline-secondary", "⤓ Export JSON"), bIm = el("button", "btn btn-sm btn-outline-secondary", "⤒ Import JSON");
    top.appendChild(bEx); top.appendChild(bIm);
    host.appendChild(top);
    var say = el("div", "dcmp-say"); host.appendChild(say);
    var panels = el("div", "dcmp-panels"); host.appendChild(panels);
    var pA = el("div", "dcmp-panel dcmp-src"), pB = el("div", "dcmp-panel dcmp-dst"); panels.appendChild(pA); panels.appendChild(pB);
    var rep = el("div", "dcmp-report"); host.appendChild(rep);
    var plots = el("div", "dcmp-plots"); host.appendChild(plots);
    var io = el("div", "dcmp-io"); io.style.display = "none"; host.appendChild(io);
    W.load = function (id) { var x = EXAMPLES.filter(function (e) { return e.id === id; })[0]; if (!x) return; exSel.value = id; W.a = full(x.s); W.toId = x.from === "tr909" ? (id === "flam909" ? "mpc60" : "tr808") : x.from === "tr808" ? "tr909" : x.from === "linn" ? "tr909" : "tr909"; say.textContent = x.say; W.redraw(); };
    W.setA = function (st) { W.a = full(st); W.redraw(); };
    W.set = function (which, key, val) { if (which === "a") { W.a[key] = val; W.redraw(); } };
    W.turn = function () { var b = W.tr.state, old = W.a.machine; W.a = b; W.toId = old; W.redraw(); };
    W.redraw = function () {
      W.tr = translate(W.a, W.toId);
      drawPanel(W, pA, W.a, true); drawPanel(W, pB, W.tr.state, false);
      drawReport(W, rep); drawPlots(W, plots);
    };
    exSel.onchange = function () { W.load(exSel.value); };
    bA.onclick = function () { W.play(["a"]); }; bB.onclick = function () { W.play(["b"]); }; bAB.onclick = function () { W.play(["a", "b"]); }; bS.onclick = function () { W.stop(); };
    bEx.onclick = function () {
      io.style.display = ""; io.innerHTML = "";
      var meta = W.meta || {};
      var f = el("div", "dcmp-meta", '<label>Song <input data-k="song"></label> <label>Artist <input data-k="artist"></label> <label>Video URL <input data-k="url"></label> <label>Channel <input data-k="channel"></label> <label>Video title <input data-k="title"></label> <label>At (m:ss) <input data-k="at" size="5"></label>');
      io.appendChild(f); var ta = el("textarea", "dcmp-json"); ta.rows = 8; io.appendChild(ta);
      var upd = function () { var m = {}; f.querySelectorAll("input").forEach(function (i) { m[i.dataset.k] = i.value; }); W.meta = { song: m.song, artist: m.artist, source: { url: m.url, channel: m.channel, title: m.title, at: m.at } }; ta.value = exportJSON(W.a, W.meta); };
      f.querySelectorAll("input").forEach(function (i) { var k2 = i.dataset.k; i.value = k2 === "song" || k2 === "artist" ? (meta[k2] || "") : ((meta.source || {})[k2] || ""); i.oninput = upd; });
      upd();
      var dl = el("button", "btn btn-sm btn-outline-secondary", "Save file"); dl.onclick = function () { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ta.value], { type: "application/json" })); a.download = (W.meta.song || "drum-pattern").replace(/\W+/g, "-") + ".json"; a.click(); };
      io.appendChild(dl);
    };
    bIm.onclick = function () {
      io.style.display = ""; io.innerHTML = "";
      var ta = el("textarea", "dcmp-json"); ta.rows = 8; ta.placeholder = "Paste a drum-pattern JSON here, or choose a file"; io.appendChild(ta);
      var file = el("input"); file.type = "file"; file.accept = ".json,application/json"; io.appendChild(file);
      var go = el("button", "btn btn-sm btn-outline-secondary", "Load"), msg = el("span", "dcmp-msg"); io.appendChild(go); io.appendChild(msg);
      file.onchange = function () { var r = new FileReader(); r.onload = function () { ta.value = r.result; }; r.readAsText(file.files[0]); };
      go.onclick = function () { try { var r = importJSON(ta.value); W.meta = r.meta; W.a = r.state; W.toId = W.a.machine === "tr909" ? "tr808" : "tr909"; say.textContent = "Loaded" + (r.meta.song ? ": " + r.meta.song + (r.meta.artist ? " (" + r.meta.artist + ")" : "") : ""); W.redraw(); msg.textContent = "loaded"; } catch (e) { msg.textContent = e.message; } };
    };
    // playback: a look-ahead scheduler sending hits to the worklet
    W.play = function (which) {
      W.stop();
      return audio().then(function (E) {
        W.E = E; if (E.ctx.state !== "running") E.ctx.resume();
        var t = E.ctx.currentTime + 0.08, plan = [];
        which.forEach(function (w) { var st = w === "a" ? W.a : W.tr.state, barS = st.len * stepTicks(st) / PPQ * 60 / st.bpm; for (var b = 0; b < 2; b++) { plan.push({ w: w, st: st, at: t }); t += barS; } });
        var tok = W.playing = { plan: plan, end: t };
        var sent = 0;
        function pump() {
          if (W.playing !== tok) return;
          var now = E.ctx.currentTime;
          while (sent < plan.length && plan[sent].at < now + 0.25) {
            var P = plan[sent++], s = P.st, spb = 60 / s.bpm;
            onsets(s).forEach(function (h) { E.node.port.postMessage({ type: "hit", at: P.at + h.t * spb, m: s.machine, c: h.c, p: s.kit[h.c], vel: h.v, acc: h.a, accLevel: s.accLevel }); });
          }
          light(W, now);
          if (now < tok.end + 0.3) W.raf = setTimeout(pump, 20); else W.stop();
        }
        pump();
        if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("drum-compare", function () { W.stop(); });
      });
    };
    W.stop = function () {
      W.playing = null; if (W.E) W.E.node.port.postMessage({ type: "stop" });
      host.querySelectorAll(".dcmp-now").forEach(function (x) { x.classList.remove("dcmp-now"); });
      host.querySelectorAll(".dcmp-panel").forEach(function (x) { x.classList.remove("dcmp-live"); });
      if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("drum-compare", null);
    };
    W.analyser = function () { return W.E && W.E.analyser; };
    widgets.push(W);
    W.load(EXAMPLES[0].id);
    return W;
  }
  function light(W, now) {
    var tok = W.playing; if (!tok) return;
    var cur = null; tok.plan.forEach(function (P) { if (now >= P.at) cur = P; });
    var pa = W.host.querySelector(".dcmp-src"), pb = W.host.querySelector(".dcmp-dst");
    [pa, pb].forEach(function (p) { p.classList.remove("dcmp-live"); });
    W.host.querySelectorAll(".dcmp-now").forEach(function (x) { x.classList.remove("dcmp-now"); });
    if (!cur) return;
    var st = cur.st, step = Math.floor((now - cur.at) / (stepTicks(st) / PPQ * 60 / st.bpm));
    var p = cur.w === "a" ? pa : pb; p.classList.add("dcmp-live");
    p.querySelectorAll('[data-step="' + step + '"]').forEach(function (x) { x.classList.add("dcmp-now"); });
  }

  function drawPanel(W, box, st, editable) {
    var M = MACHINES[st.machine]; box.innerHTML = ""; box.className = "dcmp-panel dcmp-" + M.id + " " + (editable ? "dcmp-src" : "dcmp-dst");
    var head = el("div", "dcmp-ph");
    var sel = el("select", "dcmp-msel"); ORDER.forEach(function (id) { var o = el("option", null, MACHINES[id].name); o.value = id; if (id === M.id) o.selected = true; sel.appendChild(o); });
    sel.onchange = function () { if (editable) { var t = translate(W.a, sel.value).state; W.a = t; if (W.toId === sel.value) W.toId = ORDER.filter(function (x) { return x !== sel.value; })[0]; } else W.toId = sel.value; W.redraw(); };
    head.appendChild(el("span", "dcmp-tag", editable ? "A" : "B")); head.appendChild(sel);
    head.appendChild(el("span", "dcmp-long", esc(M.long) + " · " + M.sound + (editable ? " · starting point" : " · translated")));
    if (!editable) { var turn = el("button", "btn btn-sm dcmp-turn", "Make this the starting point"); turn.onclick = function () { W.turn(); }; head.appendChild(turn); }
    box.appendChild(head);
    // settings
    var set = el("div", "dcmp-set");
    function ctl(id, label, input) { var d = el("label", "dcmp-s"); d.dataset.ctl = id; d.appendChild(el("span", null, label)); d.appendChild(input); set.appendChild(d); return input; }
    function num(v, lo, hi, on) { var i = el("input"); i.type = "number"; i.min = lo; i.max = hi; i.value = v; i.disabled = !editable; i.onchange = function () { on(+i.value); }; return i; }
    function pick(opts, v, on) { var s = el("select"); opts.forEach(function (o) { var x = el("option", null, esc(o[1])); x.value = o[0]; if (String(o[0]) === String(v)) x.selected = true; s.appendChild(x); }); s.disabled = !editable; s.onchange = function () { on(s.value); }; return s; }
    ctl("s:tempo", "Tempo", num(st.bpm, M.tempo ? M.tempo[0] : 30, M.tempo ? M.tempo[1] : 300, function (v) { W.a.bpm = v; W.redraw(); }));
    ctl("s:scale", M.id === "tr808" ? "Pre-scale" : M.id === "tr909" ? "Scale" : "Steps", pick([[16, "16ths (16 steps)"], [12, "8th triplets (12)"]], st.scale, function (v) { W.a.scale = +v; W.a.len = +v; W.redraw(); }));
    ctl("s:len", M.id === "tr909" ? "Last step" : "Length", num(st.len, 1, st.scale === 12 ? 12 : (M.id === "tr808" ? 32 : 16), function (v) { W.a.len = Math.max(1, Math.min(v, 16)); W.redraw(); }));
    if (M.accent === "total") ctl("s:accent", "Accent level", num(st.accLevel, 0, 10, function (v) { W.a.accLevel = v; W.redraw(); }));
    else ctl("s:accent", M.accent === "levels" ? "Dynamics" : "Velocity", el("span", "dcmp-note", M.accent === "levels" ? "levels per drum" : "per note, 16 Levels"));
    if (M.swing === "shuffle") ctl("s:swing", "Shuffle", pick([1, 2, 3, 4, 5, 6, 7].map(function (n) { return [n, n === 1 ? "1 (none)" : String(n)]; }), st.shuffle, function (v) { W.a.shuffle = +v; W.redraw(); }));
    if (M.swing === "timing") { ctl("s:swing", "Timing", pick("ABCDEF".split("").map(function (n) { return [n, n + (n === "A" ? " straight" : n === "E" ? " triplet" : "")]; }), st.timing, function (v) { W.a.timing = v; W.redraw(); })); ctl("s:swingGrid", "on", pick([[8, "1/8"], [16, "1/16"]], st.swingGrid, function (v) { W.a.swingGrid = +v; W.redraw(); })); }
    if (M.swing === "percent") { ctl("s:swing", "Swing %", num(st.swing, 50, 75, function (v) { W.a.swing = Math.max(50, Math.min(75, v)); W.redraw(); })); ctl("s:swingGrid", "on", pick([[8, "1/8"], [16, "1/16"]], st.swingGrid, function (v) { W.a.swingGrid = +v; W.redraw(); })); }
    if (M.swing === null) ctl("s:swing", "Shuffle", el("span", "dcmp-note", "none"));
    if (M.flam.length) ctl("s:flam", "Flam", el("span", "dcmp-note", "click a step until it shows ≀"));
    if (M.quant) ctl("s:quant", M.id === "linn" ? "Error correct" : "Timing correct", pick(M.quant.map(function (q) { return [q, q]; }), st.quant, function (v) { W.a.quant = v; if (v === "HI" || v === "OFF") {} else for (var c in W.a.rows) W.a.rows[c] = W.a.rows[c].map(function (x) { return x ? Object.assign({}, x, { o: 0 }) : 0; }); W.redraw(); }));
    if (M.quant && editable) { var lo = el("button", "btn btn-sm dcmp-loose", "Loosen the timing"); lo.onclick = function () { W.a.quant = M.quant[M.quant.length - 1]; var sd = 7; for (var c in W.a.rows) W.a.rows[c] = W.a.rows[c].map(function (x) { sd = (sd * 31 + 11) % 97; return x ? Object.assign({}, x, { o: Math.round((sd / 97 - 0.4) * 12) }) : 0; }); W.redraw(); }; set.appendChild(lo); }
    box.appendChild(set);
    // grid
    var grid = el("table", "dcmp-grid"), used = Object.keys(st.rows).filter(function (c) { return st.rows[c].some(Boolean); });
    var rows = machineVoices(M).filter(function (c) { return used.indexOf(c) >= 0 || (voiceOf(M, c)[0] === c && !(voiceOf(M, c)[3] && used.indexOf(voiceOf(M, c)[3]) >= 0)); });
    var hr = el("tr"); hr.appendChild(el("th", "dcmp-rl", "")); for (var s = 0; s < st.len; s++) { var th = el("th", "dcmp-sn" + (s % (st.scale === 12 ? 3 : 4) === 0 ? " dcmp-beat" : ""), String(s + 1)); th.dataset.step = s; hr.appendChild(th); } grid.appendChild(hr);
    rows.forEach(function (c) {
      var tr = el("tr"); tr.dataset.ctl = "v:" + c; var th = el("th", "dcmp-rl", esc(vLabel(M, c))); tr.appendChild(th);
      var row = st.rows[c] || [];
      for (var s2 = 0; s2 < st.len; s2++) (function (s2) {
        var x = row[s2], td = el("td", "dcmp-cell" + (s2 % (st.scale === 12 ? 3 : 4) === 0 ? " dcmp-beat" : "")); td.dataset.step = s2;
        if (x) {
          td.classList.add("dcmp-on");
          var txt = "";
          if (M.accent === "levels") { txt = String(x.l || 1); td.style.opacity = 0.45 + 0.55 * (x.l || 1) / (M.levels[c] || 1); }
          else if (M.accent === "velocity") { td.style.opacity = 0.3 + 0.7 * (x.v == null ? 0.75 : x.v); }
          if (x.a) { td.classList.add("dcmp-acc"); txt = ">"; }
          if (x.f) txt += "≀";
          if (x.o) { var mk = el("i", "dcmp-off"); mk.style.left = (50 + x.o / stepTicks(st) * 100) + "%"; td.appendChild(mk); td.title = (x.o > 0 ? "+" : "") + x.o + " ticks"; }
          if (x.x2) txt += "²";
          td.appendChild(document.createTextNode(txt));
        }
        if (editable) td.onclick = function () { W.a.rows[c] = W.a.rows[c] || []; for (var i = 0; i < W.a.len; i++) if (!W.a.rows[c][i]) W.a.rows[c][i] = 0; W.a.rows[c][s2] = cycle(M, c, W.a.rows[c][s2]); W.redraw(); };
        tr.appendChild(td);
      })(s2);
      grid.appendChild(tr);
    });
    if (M.accent === "total") {
      var ar = el("tr"); ar.dataset.ctl = "s:accent"; ar.appendChild(el("th", "dcmp-rl", M.id === "tr909" ? "Total Accent" : "Accent"));
      for (var s3 = 0; s3 < st.len; s3++) (function (s3) { var td = el("td", "dcmp-cell dcmp-accrow" + (st.acc[s3] ? " dcmp-on" : "")); td.dataset.step = s3; if (editable) td.onclick = function () { W.a.acc[s3] = !W.a.acc[s3]; W.redraw(); }; ar.appendChild(td); })(s3);
      grid.appendChild(ar);
    }
    var gw = el("div", "dcmp-gw"); gw.appendChild(grid); box.appendChild(gw);
    // voice controls
    var vs = el("div", "dcmp-voices");
    rows.filter(function (c) { return used.indexOf(c) >= 0; }).forEach(function (c) {
      var v = voiceOf(M, c), fs = el("fieldset", "dcmp-v"); fs.dataset.ctl = "v:" + c; fs.appendChild(el("legend", null, esc(vLabel(M, c))));
      v[2].forEach(function (p) {
        var lab = el("label", "dcmp-k"); lab.dataset.ctl = "p:" + c + "." + p; var r = el("input"); r.type = "range"; r.min = 0; r.max = 10; r.step = 0.5; r.value = (st.kit[c] || {})[p];
        r.disabled = !editable; var o = el("output", null, String(r.value));
        r.oninput = function () { o.textContent = r.value; W.a.kit[c][p] = +r.value; W.redraw(); };
        lab.appendChild(el("span", null, PNAME[p])); lab.appendChild(r); lab.appendChild(o); fs.appendChild(lab);
      });
      vs.appendChild(fs);
    });
    box.appendChild(vs);
    // mark controls named in the report
    W.tr.notes.forEach(function (n) { (editable ? n.ctl.from : n.ctl.to).forEach(function (id) { box.querySelectorAll('[data-ctl="' + id + '"]').forEach(function (e) { e.classList.add("dcmp-" + n.cls); }); }); });
  }
  function cycle(M, c, x) {
    if (M.accent === "levels") { var n = M.levels[c] || 1; if (!x) return { l: 1 }; return (x.l || 1) < n ? { l: (x.l || 1) + 1, o: x.o || 0 } : 0; }
    if (M.accent === "velocity") { if (!x) return { v: 0.5 }; return x.v < 0.7 ? { v: 0.75, o: x.o || 0 } : x.v < 0.95 ? { v: 1, o: x.o || 0 } : 0; }
    var va = M.voiceAccent.indexOf(c) >= 0, fl = M.flam.indexOf(c) >= 0;
    if (!x) return { v: 0.75 };
    if (va && !x.a && !x.f) return { v: 0.75, a: true };
    if (fl && !x.f) return { v: 0.75, a: !!x.a, f: 3 };
    return 0;
  }
  function drawReport(W, rep) {
    var A = MACHINES[W.a.machine], B = MACHINES[W.toId]; rep.innerHTML = "";
    rep.appendChild(el("div", "dcmp-rh", "From " + A.name + " to " + B.name + ": " + ["exact", "approx", "lost"].map(function (k) { return W.tr.notes.filter(function (n) { return n.cls === k; }).length + ' <span class="dcmp-tag2 dcmp-' + k + '">' + { exact: "the same", approx: "close", lost: "cannot be done" }[k] + "</span>"; }).join(" · ")));
    var ul = el("ul", "dcmp-list");
    W.tr.notes.forEach(function (n) {
      var li = el("li", "dcmp-item dcmp-" + n.cls, '<b>' + esc(n.what) + '</b> ' + esc(n.why) + ' <span class="dcmp-cite">' + n.cite.map(function (c) { return esc(c.book === "page" ? "page's own" : c.title + (c.page !== "-" ? ", p. " + c.page : "")); }).join("; ") + "</span>");
      li.addEventListener("mouseenter", function () { hl(W, n, true); }); li.addEventListener("mouseleave", function () { hl(W, n, false); });
      ul.appendChild(li);
    });
    rep.appendChild(ul);
  }
  function hl(W, n, on) {
    var pa = W.host.querySelector(".dcmp-src"), pb = W.host.querySelector(".dcmp-dst");
    n.ctl.from.forEach(function (id) { pa.querySelectorAll('[data-ctl="' + id + '"]').forEach(function (e) { e.classList.toggle("dcmp-hl", on); }); });
    n.ctl.to.forEach(function (id) { pb.querySelectorAll('[data-ctl="' + id + '"]').forEach(function (e) { e.classList.toggle("dcmp-hl", on); }); });
  }

  // ---------- plots ----------
  function css(v, d) { try { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d; } catch (e) { return d; } }
  function canvas(box, title, h) { var f = el("figure", "dcmp-plot"); f.appendChild(el("figcaption", null, title)); var c = el("canvas"); c.width = 640; c.height = h || 160; f.appendChild(c); box.appendChild(f); return c.getContext("2d"); }
  function drawPlots(W, box) {
    var keep = box.querySelector(".dcmp-vsel"), cur = keep ? keep.value : null;
    box.innerHTML = "";
    var ink = css("--site-ink", "#222"), ink2 = css("--site-ink-2", "#777"), cA = "#d9822b", cB = "#3f7fc2";
    // timing plot
    var g = canvas(box, "Timing: where each hit lands in the bar (A above the line, B below; thin lines = the straight 16th / triplet grid)", 170), Wd = 640, H = 170;
    var sa = W.a, sb = W.tr.state, oa = onsets(sa), ob = onsets(sb), beats = sa.len * stepTicks(sa) / PPQ;
    g.clearRect(0, 0, Wd, H); g.font = "11px sans-serif";
    var x0 = 70, x1 = Wd - 10, X = function (b) { return x0 + (x1 - x0) * b / beats; };
    for (var s = 0; s <= sa.len; s++) { var bx = X(s * stepTicks(sa) / PPQ); g.strokeStyle = ink2; g.globalAlpha = s % (sa.scale === 12 ? 3 : 4) === 0 ? 0.6 : 0.2; g.beginPath(); g.moveTo(bx, 10); g.lineTo(bx, H - 10); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = ink; g.fillText("A " + MACHINES[sa.machine].name, 2, 45); g.fillText("B " + MACHINES[sb.machine].name, 2, 125);
    g.strokeStyle = ink2; g.beginPath(); g.moveTo(x0, H / 2); g.lineTo(x1, H / 2); g.stroke();
    function dots(on, y0, col) { var lanes = {}; on.forEach(function (h) { if (!(h.c in lanes)) lanes[h.c] = Object.keys(lanes).length; }); on.forEach(function (h) { var y = y0 + (lanes[h.c] % 6) * 11; g.fillStyle = col; g.globalAlpha = 0.35 + 0.65 * Math.min(1, h.v); g.beginPath(); g.arc(X(h.t), y, h.a ? 4.5 : 3, 0, 7); g.fill(); var grid = Math.round(h.t * PPQ / stepTicks(sa)) * stepTicks(sa) / PPQ; if (Math.abs(grid - h.t) > 0.004) { g.strokeStyle = col; g.beginPath(); g.moveTo(X(grid), y); g.lineTo(X(h.t), y); g.stroke(); } }); g.globalAlpha = 1; }
    dots(oa, 18, cA); dots(ob, 98, cB);
    // voice plots
    var sel = el("select", "dcmp-vsel"), used = {}; oa.forEach(function (h) { used[h.c] = 1; });
    Object.keys(used).forEach(function (c) { var o = el("option", null, esc(CANON[c])); o.value = c; sel.appendChild(o); });
    if (cur && used[cur]) sel.value = cur;
    var lab = el("label", "dcmp-lab", "Voice for the plots below "); lab.appendChild(sel); box.appendChild(lab);
    sel.onchange = function () { drawVoice(W, box, sel.value); };
    var vb = el("div", "dcmp-vplots"); box.appendChild(vb);
    drawVoice(W, box, sel.value);
  }
  function mapVoice(W, c) { var st = W.tr.state, M = MACHINES[st.machine]; if (hasVoice(M, c)) return c; var alt = (SUBST[c] || []).filter(function (d) { return hasVoice(M, d); })[0]; return alt || null; }
  function drawVoice(W, box, c) {
    var vb = box.querySelector(".dcmp-vplots"); vb.innerHTML = ""; if (!c) return;
    var sa = W.a, sb = W.tr.state, cb = mapVoice(W, c), cA = "#d9822b", cB = "#3f7fc2", ink2 = css("--site-ink-2", "#777");
    var ya = render(sa.machine, c, sa.kit[c], 0.8, 0.6), yb = cb ? render(sb.machine, cb, sb.kit[cb], 0.8, 0.6) : null;
    var g = canvas(vb, "Waveform, first 60 ms: A " + MACHINES[sa.machine].name + " " + CANON[c] + (yb ? ", B " + MACHINES[sb.machine].name + " " + CANON[cb] : ", B has none"), 150);
    [[ya, cA, 40], [yb, cB, 110]].forEach(function (z) { if (!z[0]) return; g.strokeStyle = z[1]; g.beginPath(); var n = 2880; for (var i = 0; i < n; i++) { var x = 640 * i / n, y = z[2] - z[0][i] * 30; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); });
    var e = canvas(vb, "Envelope: loudness over 600 ms (dB)", 150);
    [[ya, cA], [yb, cB]].forEach(function (z) { if (!z[0]) return; e.strokeStyle = z[1]; e.beginPath(); var w = 240; for (var i = 0; i < z[0].length / w; i++) { var s = 0; for (var j = 0; j < w; j++) { var v = z[0][i * w + j] || 0; s += v * v; } var db = 10 * Math.log10(s / w + 1e-9), y = 10 + (-db) * 2.2; var x = 640 * i * w / z[0].length; if (i) e.lineTo(x, Math.min(145, y)); else e.moveTo(x, Math.min(145, y)); } e.stroke(); });
    var sp = canvas(vb, "Spectrum of the first 85 ms (20 Hz - 20 kHz, log)", 150);
    [[ya, cA], [yb, cB]].forEach(function (z) { if (!z[0]) return; var S = spectrum(z[0].subarray(0, 4096)); sp.strokeStyle = z[1]; sp.beginPath(); var first = true; for (var k = 2; k < S.length; k++) { var f = k * 48000 / 4096; if (f < 20 || f > 20000) continue; var x = 640 * Math.log(f / 20) / Math.log(1000), y = 10 + (-(S[k])) * 1.6; if (first) { sp.moveTo(x, Math.min(145, y)); first = false; } else sp.lineTo(x, Math.min(145, y)); } sp.stroke(); });
    [100, 1000, 10000].forEach(function (f) { var x = 640 * Math.log(f / 20) / Math.log(1000); sp.fillStyle = ink2; sp.fillText(f >= 1000 ? f / 1000 + "k" : String(f), x + 2, 146); });
  }
  function spectrum(x) {   // plain radix-2 FFT magnitude in dB, Hann window
    var n = x.length, re = new Float64Array(n), im = new Float64Array(n), i, j, k;
    for (i = 0; i < n; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; } }
    for (var len = 2; len <= n; len <<= 1) { var a = -2 * Math.PI / len; for (i = 0; i < n; i += len) for (k = 0; k < len / 2; k++) { var c = Math.cos(a * k), s = Math.sin(a * k), ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * c - im[i + k + len / 2] * s, vi = re[i + k + len / 2] * s + im[i + k + len / 2] * c; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; } }
    var out = new Float32Array(n / 2); for (i = 0; i < n / 2; i++) out[i] = 20 * Math.log10(Math.hypot(re[i], im[i]) / n * 4 + 1e-7); return out;
  }

  // ---------- assignments list (videos that rebuild a song's beat) ----------
  function assignments(host) {
    var url = host.dataset.src || "/apps/shared/data/drum-patterns/assignments.json";
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      host.innerHTML = "";
      ORDER.forEach(function (id) {
        var list = d.videos.filter(function (v) { return v.machine === id; }); if (!list.length) return;
        host.appendChild(el("h4", null, esc(MACHINES[id].name.replace("-style", ""))));
        var ul = el("ul"); list.forEach(function (v) { ul.appendChild(el("li", null, '<a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.title) + "</a> (" + esc(v.channel) + "). <i>" + esc(v.song) + "</i>" + (v.artist ? ", " + esc(v.artist) : "") + (v.note ? ". " + esc(v.note) : ""))); });
        host.appendChild(ul);
      });
    }).catch(function () { host.textContent = "The video list did not load."; });
  }

  function init() {
    document.querySelectorAll("div.dcmp").forEach(function (h) { if (!h.__dc) { h.__dc = mount(h); } });
    document.querySelectorAll("div.dcmp-assign").forEach(assignments);
  }

  DC.MACHINES = MACHINES; DC.CANON = CANON; DC.EXAMPLES = EXAMPLES; DC.ORDER = ORDER; DC.BOOKS = BOOKS; DC.PPQ = PPQ;
  DC.SHUF909 = SHUF909; DC.LINN = LINN; DC.full = full; DC.canonical = canonical; DC.onsets = onsets; DC.translate = translate;
  DC.render = render; DC.renderPattern = renderPattern; DC.exportJSON = exportJSON; DC.importJSON = importJSON; DC.mount = mount;
  DC.widgets = widgets; DC.machineVoices = machineVoices; DC.spectrum = spectrum;
  global.DrumCompare = DC;
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
  if (typeof module !== "undefined" && module.exports) module.exports = DC;
})(typeof window !== "undefined" ? window : globalThis);
