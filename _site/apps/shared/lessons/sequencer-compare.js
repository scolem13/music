// sequencer-compare.js — "Classic Sequencers Compared" (lessons/sequencer-compare.qmd): five step sequencers rebuilt in the
// browser, each with its own way of entering notes, one shared mono voice, and a translator that turns a line on one machine
// into the nearest line on another and reports, setting by setting, what is the same (exact), close (approx) or impossible (lost).
//
// Machines (ids): a960 = analog step sequencer after the Moog 960 (3 rows x 8 stages); tb303 = Roland TB-303 pattern write;
// mc202 = Roland MC-202 (two channels, step time / gate time); mc4 = Roland MC-4 MicroComposer (numeric entry, time base, 4 CV
// channels); elektron = an Elektron-style trig sequencer after the Digitakt II (note / lock trigs, parameter locks, trig conditions).
//
// Facts, by manual page (copies and text in ~/Documents/Manuals/sequencers; the scans are cited by the PDF's page number):
//   Q960 = Synthesizers.com Q960 data sheet (2014), which says the Q960 is "functionally equivalent to the Moog 960 and any Moog
//     documentation will apply" (p. 5). No Moog 960 manual was found, so the 960 here is built from the Q960 sheet.
//     8 stages x 3 rows (1), X1/X2/X4 = 0-2 / 0-4 / 0-8 V (4), stage modes Normal / Skip / Stop (3), the oscillator's 90 % pulse
//     starts the envelopes (3, 5), 3rd-row timing: each volt doubles the clock (4), 1 V / octave (3), stage 9 stop (4), Q962 = 24 stages (2).
//   TB303 = Roland TB-303 owner's manual (scan): a pattern stores pitch, length of note and accent / slide (4-5), the sixteenth
//     note is the basic unit (5), one octave of keys plus transpose up / down, "four octaves" (5), 64 patterns (11), 7 tracks (23),
//     time mode makes no sound, 16 presses (15), accent / slide written while tapping back through the notes (41-43).
//   TB03 = Roland TB-03 owner's manual (one sheet, p. 1): its Original mode reproduces the TB-303's pattern write; note / tie /
//     rest keys, 16 steps of a 16th, pattern length 1-16, a triplet grid.
//   MC202 = Roland MC-202 owner's manual (scan): 2 channels, accent and portamento in the data, 2600 steps, tape, DIN sync, CV/gate
//     (5), step time apart from gate time (10), quarter = 24, default step 24 gate 12 (15-16), rest = gate 0 (19), rest key (17),
//     portamento entered on the second of two notes, accent only on the built-in synth (29), accent on VCA or VCF+VCA (31).
//   MC4 = Roland MC-4 owner's manual (scan): keys numbered by counting up the keyboard (9), time base 120 a beat, 16th = 30,
//     default step 30 gate 15 (10), CV-1 pitch, CV-2 for "the VCF, the VCA, or any other" module, four channels (11), first pitch
//     typed 24 (15), MEASURE END only in CV-1 (16), memory lost at power off, cassette save (19, 22), time base 48 (30, 37).
//   DT = Elektron Digitakt II user manual: MIDI tracks can send chords of four notes (17), swing 51-80 % (23), note and lock trigs
//     (41), micro timing (45), 128 steps on 8 pages (45), SPEED 1/8X..2X, 3/4X for triplets, 2X for 32nds (46), parameter locks,
//     up to 80 a pattern (47), trig conditions PRE NEI 1ST LST A:B and negations (48), FILL (49, 54), NOTE VEL LEN PROB (53),
//     portamento on TRIG PAGE 2 (54).
// The page's own choices (not in the manuals, marked on the page): the 303's key range (C2-C5 here), the MC-202 gate keys' lengths,
// the MC-4 CV-2 scale (0-100) and "gate 0 = rest" on the MC-4, micro timing in 1/24 of a step, the Elektron swing formula, slide
// and portamento times, the shared voice (one saw / square through a 4-pole low-pass: it is not a model of any of these machines).
//
// API (works under node for tests/lessons/sequencer-compare.test.js):
//   SequencerCompare.MACHINES[id] = { name, long, res (ticks a quarter it can place notes on), lines, ctls: [control ids] }
//   SequencerCompare.toCanon(id, data) -> { bpm, len, lines: [[{t, len, note, vel, accent, slide, cut}]], cutPts, notes, loopless }
//     (t and len in ticks, TPQ = 480 a quarter note)
//   SequencerCompare.fromCanon(id, canon) -> { data, notes }
//   SequencerCompare.translate(from, to, data) -> { data, notes, canon }; each note {cls: exact|approx|lost, what, why, cite:[{book,title,page}], ctl:{from,to}}
//   SequencerCompare.toEvents(id, data) -> [{t, note, vel, len, accent, slide, ch}] with t and len in quarter-note beats (for a DAW)
//   SequencerCompare.exportJSON(id, data, meta) / importJSON(obj) -> {kind:"sequence", version:1, machine, steps, song, artist, source}
//   SequencerCompare.EXAMPLES, .workletSource, .mount(host), .widgets
(function (global) {
  "use strict";
  var SQ = {}, TPQ = 480, STEP16 = 120;

  // ---------- sources ----------
  var BOOKS = {
    Q960: "Synthesizers.com, Q960 Sequential Controller data sheet (2014; \"functionally equivalent to the Moog 960\")",
    TB303: "Roland, TB-303 Bass Line owner's manual (scan, PDF pages)",
    TB03: "Roland, TB-03 owner's manual (2016; Original mode = the TB-303's pattern write)",
    MC202: "Roland, MC-202 MicroComposer owner's manual (scan, PDF pages)",
    MC4: "Roland, MC-4 MicroComposer owner's manual (scan, PDF pages)",
    DT: "Elektron, Digitakt II user manual",
    PAGE: "This page's own choice (not in a manual; unverified)"
  };
  function cite(book, page) { return { book: book, title: BOOKS[book], page: page == null ? null : page }; }
  SQ.BOOKS = BOOKS;

  // ---------- helpers ----------
  var NN = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function nname(m) { m = Math.round(m); return NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r2(x) { return Math.round(x * 100) / 100; }
  SQ.nname = nname;

  // ---------- the machines ----------
  var MACHINES = {
    a960: { name: "960-style", long: "Analog step sequencer after the Moog 960: 3 rows × 8 stages", res: null, lines: 1, color: "#d9822b",
      ctls: ["A", "B", "C", "xA", "xB", "xC", "mode", "rate", "rowC", "rowB", "base"] },
    tb303: { name: "TB-303", long: "Roland TB-303 pattern write: pitch mode, then time mode", res: 4, lines: 1, color: "#b9b9b0",
      ctls: ["pitch", "oct", "acc", "sl", "time", "last", "trip"] },
    mc202: { name: "MC-202", long: "Roland MC-202: two channels of step time, gate time, accent, portamento", res: 24, lines: 2, color: "#5aa0d8",
      ctls: ["n", "st", "gt", "acc", "po", "ch"] },
    mc4: { name: "MC-4", long: "Roland MC-4 MicroComposer: typed numbers, time base, four CV channels", res: 120, lines: 4, color: "#8fbf6a",
      ctls: ["cv1", "cv2", "st", "gt", "tb", "ch"] },
    elektron: { name: "Elektron-style", long: "Trig sequencer after the Digitakt II: note and lock trigs, parameter locks, conditions", res: 4, lines: 1, color: "#e05a7a",
      ctls: ["trig", "note", "vel", "len", "micro", "cond", "prob", "cut", "porta", "steps", "swing", "speed", "loop", "fill"] }
  };
  SQ.MACHINES = MACHINES; SQ.TPQ = TPQ;
  var ORDER = ["a960", "tb303", "mc202", "mc4", "elektron"];
  SQ.ORDER = ORDER;

  // ---------- defaults ----------
  function blank(id) {
    if (id === "a960") return { bpm: 120, base: 36, A: [0, 0, 0, 0, 0, 0, 0, 0], B: [0, 0, 0, 0, 0, 0, 0, 0], C: [0, 0, 0, 0, 0, 0, 0, 0],
      xA: 1, xB: 1, xC: 1, mode: ["n", "n", "n", "n", "n", "n", "n", "n"], rate: 8, rowC: false, rowB: "cut" };
    if (id === "tb303") { var p = [], t = []; for (var i = 0; i < 16; i++) { p.push({ k: 0, oct: 0, acc: false, sl: false }); t.push("n"); }
      return { bpm: 120, pitch: p, time: t, last: 16, trip: false }; }
    if (id === "mc202") return { bpm: 120, ch: [[{ n: 48, st: 24, gt: 12, acc: false, po: false }], []] };
    if (id === "mc4") return { bpm: 120, tb: 120, cv2: "cut", ch: [[{ cv1: 12, cv2: 50, st: 30, gt: 15 }], [], [], []] };
    var tr = []; for (var j = 0; j < 16; j++) tr.push(null);
    return { bpm: 120, steps: 16, speed: 1, swing: 50, loop: 1, fill: false, def: { note: 48, vel: 100, len: 1 }, trigs: tr };
  }
  SQ.blank = blank;

  // ---------- machine -> canonical description ----------
  // canon.lines: monophonic lines of notes {t, len, note, vel 0..1, accent, slide (glide into the next note), cut 0..1 | null}
  function toCanon(id, d) {
    var c = { bpm: d.bpm || 120, len: 0, lines: [[]], cutPts: [], notes: [], loopless: false, from: id, feat: {} };
    if (id === "a960") {
      var stepSec = 1 / Math.max(0.05, d.rate), t = 0, seq = [];
      for (var i = 0; i < 8; i++) { if (d.mode[i] === "s") continue; seq.push(i); if (d.mode[i] === "t") { c.loopless = true; break; } }
      seq.forEach(function (i) {
        var dur = d.rowC ? stepSec / Math.pow(2, clamp(d.C[i], 0, 2 * d.xC)) : stepSec;
        var tk = dur * c.bpm / 60 * TPQ, note = d.base + d.A[i] * 12;
        c.lines[0].push({ t: t, len: tk * 0.9, note: note, vel: 0.8, accent: false, slide: false, cut: d.rowB === "cut" ? clamp(d.B[i] / (2 * d.xB), 0, 1) : null, stage: i });
        t += tk;
      });
      c.len = t; c.feat.continuous = c.lines[0].some(function (n) { return Math.abs(n.note - Math.round(n.note)) > 0.05; });
    } else if (id === "tb303") {
      var st = d.trip ? 160 : STEP16, pi = 0, cur = null, L = c.lines[0];
      for (var s = 0; s < d.last; s++) {
        var tm = d.time[s];
        if (tm === "n") { var p = d.pitch[pi++ % 16]; cur = { t: s * st, len: st, note: 48 + p.k + 12 * p.oct, vel: p.acc ? 1 : 0.7, accent: !!p.acc, slide: !!p.sl, cut: null }; L.push(cur); }
        else if (tm === "t" && cur) cur.len += st;
        else cur = null;
      }
      c.len = d.last * st;
    } else if (id === "mc202") {
      c.lines = d.ch.map(function (line, li) {
        var t = 0, out = [], prev = null;
        line.forEach(function (e) {
          var tk = e.st * 20;
          if (e.n != null && e.gt > 0) {
            var n = { t: t, len: e.gt * 20, note: e.n, vel: e.acc && li === 0 ? 1 : 0.7, accent: !!e.acc && li === 0, slide: false, cut: null };
            if (e.po && prev) prev.slide = true;       // portamento is entered on the second note (MC202 p. 29)
            out.push(n); prev = n;
          } else prev = null;
          t += tk;
        });
        c.len = Math.max(c.len, t); return out;
      });
    } else if (id === "mc4") {
      var k = TPQ / d.tb;
      c.lines = d.ch.map(function (line) {
        var t = 0, out = [];
        line.forEach(function (e) {
          if (e.gt > 0) {
            var n = { t: t, len: e.gt * k, note: e.cv1 + 36, vel: 0.7, accent: false, slide: false, cut: d.cv2 === "cut" ? clamp(e.cv2 / 100, 0, 1) : null };
            if (d.cv2 === "vel") { n.vel = clamp(e.cv2 / 100, 0, 1); n.accent = n.vel > 0.85; }
            out.push(n);
          }
          t += e.st * k;
        });
        c.len = Math.max(c.len, t); return out;
      });
    } else if (id === "elektron") {
      var stp = STEP16 / (d.speed || 1), L2 = c.lines[0], lastCond = null, loop = d.loop || 1;
      var sw = clamp(d.swing || 50, 50, 80), swOff = (2 * sw / 100 - 1) * stp;   // page's own reading of the swing ratio
      for (var q = 0; q < d.steps; q++) {
        var tg = d.trigs[q]; if (!tg) continue;
        var tq = q * stp + (q % 2 ? swOff : 0) + (tg.micro || 0) / 24 * stp;
        var plays = condTrue(tg.cond, loop, lastCond, d.fill);
        if (tg.cond && !/^!?PRE$/.test(tg.cond) && !/^!?NEI$/.test(tg.cond)) lastCond = plays;
        if (tg.prob != null && tg.prob < 100) { var r = hash(q * 7919 + loop * 104729) * 100; if (r >= tg.prob) plays = false; }
        if (tg.fill != null && tg.fill !== !!d.fill) plays = false;
        if (tg.cut != null) c.cutPts.push({ t: tq, v: tg.cut });
        if (tg.type !== "n" || !plays) continue;
        var nt = { t: tq, len: (tg.len != null ? tg.len : d.def.len) * stp, note: tg.note != null ? tg.note : d.def.note,
          vel: (tg.vel != null ? tg.vel : d.def.vel) / 127, accent: false, slide: false, cut: tg.cut != null ? tg.cut : null };
        nt.accent = nt.vel > 0.94;
        if (tg.porta && L2.length) L2[L2.length - 1].slide = true;
        L2.push(nt);
      }
      c.len = d.steps * stp;
      c.feat.cond = d.trigs.some(function (x) { return x && (x.cond || (x.prob != null && x.prob < 100) || x.fill != null); });
      c.feat.locks = d.trigs.some(function (x) { return x && x.type === "l"; });
    }
    c.lines = c.lines.map(function (L) { return L.sort(function (a, b) { return a.t - b.t; }); });
    while (c.lines.length > 1 && !c.lines[c.lines.length - 1].length) c.lines.pop();
    return c;
  }
  // trig conditions (DT p. 48): PRE / !PRE follow the last evaluated condition on the track; NEI is false with no neighbour track
  function condTrue(cond, loop, last, fill) {
    if (!cond) return true;
    var neg = cond[0] === "!", c = neg ? cond.slice(1) : cond, v;
    if (c === "PRE") v = last === null ? false : last;
    else if (c === "NEI") v = false;
    else if (c === "1ST") v = loop === 1;
    else if (c === "LST") v = false;          // never the last loop here: the page does not chain patterns
    else if (c === "FILL") v = !!fill;
    else { var m = /^(\d+):(\d+)$/.exec(c); v = m ? ((loop - 1) % +m[2]) === (+m[1] - 1) : true; }
    return neg ? !v : v;
  }
  function hash(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  SQ.toCanon = toCanon; SQ.condTrue = condTrue;

  // ---------- canonical -> machine ----------
  function N(list, cls, what, why, cites, from, to) { list.push({ cls: cls, what: what, why: why, cite: cites, ctl: { from: from || [], to: to || [] } }); }
  function feats(c) {
    var all = [].concat.apply([], c.lines);
    return { all: all, accent: all.some(function (n) { return n.accent; }), slide: all.some(function (n) { return n.slide; }),
      cut: all.some(function (n) { return n.cut != null; }) || c.cutPts.length > 0, lines: c.lines.length,
      velVar: all.some(function (n) { return Math.abs(n.vel - all[0].vel) > 0.05; }) };
  }
  function fromCanon(id, c, src) {
    var notes = [], f = feats(c), d = blank(id), L0 = c.lines[0] || [], SRC = src || c.from, sc = srcCtl(SRC);
    d.bpm = c.bpm;
    N(notes, "exact", "Tempo " + Math.round(c.bpm) + " BPM", id === "a960" ? "The 960 has no tempo in BPM: its own oscillator sets the speed (Q960 p. 3). The clock here is set to the same speed in stages a second." : "The tempo carries over.", [id === "a960" ? cite("Q960", 3) : cite("PAGE")], [], id === "a960" ? ["rate"] : []);
    if (id === "tb303") {
      var grid = STEP16, trip = false;
      var offG = function (g) { return L0.filter(function (n) { return Math.abs(n.t / g - Math.round(n.t / g)) > 0.02; }).length; };
      if (offG(STEP16) > 0 && offG(160) < offG(STEP16)) { grid = 160; trip = true; }
      d.trip = trip; var steps = Math.min(16, Math.max(1, Math.round(c.len / grid))), pitches = [], time = [];
      for (var s = 0; s < 16; s++) time.push("r");
      var moved = 0, dropped = 0, folded = 0, cut16 = 0, byStep = {};
      L0.forEach(function (n) { var s = Math.round(n.t / grid); if (Math.abs(n.t - s * grid) > 2) moved++; if (s >= steps) { cut16++; return; } if (byStep[s]) { dropped++; return; } byStep[s] = n; });
      Object.keys(byStep).map(Number).sort(function (a, b) { return a - b; }).forEach(function (s) {
        var n = byStep[s], m = Math.round(n.note), oct = 0, k = m - 48;
        while (k < -12) { k += 12; folded++; } while (k > 24) { k -= 12; folded++; }
        if (k < 0) { oct = -1; k += 12; } else if (k > 12) { oct = 1; k -= 12; }
        pitches.push({ k: k, oct: oct, acc: !!n.accent || n.vel > 0.9, sl: !!n.slide });
        time[s] = "n"; var nl = Math.max(1, Math.round((n.slide ? Math.max(n.len, grid) : n.len) / grid));
        for (var j = 1; j < nl && s + j < steps && !byStep[s + j]; j++) time[s + j] = "t";
      });
      while (pitches.length < 16) pitches.push({ k: 0, oct: 0, acc: false, sl: false });
      d.pitch = pitches; d.time = time; d.last = steps;
      N(notes, moved ? "approx" : "exact", moved ? moved + " note(s) moved onto the 16th-note grid" : "Every note on a 16th-note step", "The TB-303 writes rhythm in sixteenth notes and builds longer notes from them (TB303 p. 5); the TB-03's triplet grid is the only other step (TB03 p. 1)." + (trip ? " This line fits the triplet grid better, so it is used." : ""), [cite("TB303", 5), cite("TB03", 1)], sc.time, ["time", "trip"]);
      if (cut16) N(notes, "lost", cut16 + " note(s) after step 16", "A pattern is one bar of up to 16 steps (TB03 p. 1); longer lines are several patterns joined in a track (TB303 p. 23), not shown here.", [cite("TB03", 1), cite("TB303", 23)], sc.len, ["last"]);
      if (dropped) N(notes, "lost", dropped + " note(s) on a step already used", "One note a step: the 303 plays one line.", [cite("TB303", 4)], sc.time, ["time"]);
      if (folded) N(notes, "approx", folded + " octave move(s) to fit the keys", "The panel has one octave of keys and transpose DOWN / UP (TB303 p. 5). The range used here, C2 to C5, is this page's own reading.", [cite("TB303", 5), cite("PAGE")], [], ["oct"]);
      noteLen(notes, f, "approx", "Note lengths become whole steps (note + ties)", "A note lasts its step and any ties after it (TB03 p. 1); a note shorter than a step, or a set gate length, cannot be written.", [cite("TB03", 1)], sc.gate, ["time"]);
      if (f.accent || f.velVar) N(notes, f.accent ? "exact" : "approx", f.accent ? "Accents" : "Loudness becomes accent on or off", "Each step has accent on or off, nothing between (TB303 pp. 4-5, 41).", [cite("TB303", 5), cite("TB303", 41)], sc.acc, ["acc"]);
      if (f.slide) N(notes, "exact", "Slides", "Slide is written on the note it slides from to the next one (TB303 p. 42).", [cite("TB303", 42)], sc.sl, ["sl"]);
      lines1(notes, f, sc);
      cutLost(notes, f, "A pattern stores pitch, note length, accent and slide (TB303 pp. 4-5); the filter is a knob, not stored per step.", [cite("TB303", 4)], sc);
    } else if (id === "mc202") {
      d.ch = [[], []];
      c.lines.slice(0, 2).forEach(function (L, li) { d.ch[li] = lineToSteps(L, c.len, 20, function (n, prevSlide) { return { n: Math.round(n.note), acc: li === 0 && (!!n.accent || n.vel > 0.9), po: prevSlide }; }, function () { return { n: null, acc: false, po: false }; }); });
      var off202 = f.all.filter(function (n) { return Math.abs(n.t / 20 - Math.round(n.t / 20)) > 0.01 || Math.abs(n.len / 20 - Math.round(n.len / 20)) > 0.01; }).length;
      N(notes, off202 ? "approx" : "exact", off202 ? off202 + " time(s) rounded to 1/24 of a quarter" : "Every time fits the MC-202's 24 a quarter", "Step and gate times count 24 to a quarter note (MC202 pp. 15-16).", [cite("MC202", 16)], sc.time, ["st", "gt"]);
      N(notes, "exact", "Gate length apart from step length", "The MC-202 keeps the sounded length (gate time) apart from the time to the next note (step time) (MC202 p. 10).", [cite("MC202", 10)], sc.gate, ["gt"]);
      if (f.slide) N(notes, "exact", "Slides become portamento on the next note", "Portamento is entered on the second of the two notes it joins (MC202 p. 29), where the 303 marks the first.", [cite("MC202", 29)], sc.sl, ["po"]);
      if (f.accent || f.velVar) N(notes, f.accent ? "exact" : "approx", f.accent ? "Accents (channel 1)" : "Loudness becomes accent on or off", "Accent is on or off a note and works only on the built-in synth (MC202 p. 29).", [cite("MC202", 29)], sc.acc, ["acc"]);
      if (c.lines.length > 2) N(notes, "lost", (c.lines.length - 2) + " line(s) beyond two", "The MC-202 has two channels (MC202 p. 5).", [cite("MC202", 5)], sc.ch, ["ch"]);
      else if (c.lines.length === 2) N(notes, "exact", "Two lines on two channels", "Channel 2 drives a second synth from its CV / gate out (MC202 pp. 5, 10).", [cite("MC202", 5)], sc.ch, ["ch"]);
      cutLost(notes, f, "A note has pitch, step time, gate time, accent and portamento (MC202 pp. 5, 10); no filter value per note.", [cite("MC202", 10)], sc);
    } else if (id === "mc4") {
      d.ch = [[], [], [], []]; d.cv2 = f.cut ? "cut" : (f.accent || f.velVar) ? "vel" : "cut";
      c.lines.slice(0, 4).forEach(function (L, li) { d.ch[li] = lineToSteps(L, c.len, 4, function (n) { return { cv1: Math.round(n.note) - 36, cv2: d.cv2 === "cut" ? Math.round((n.cut != null ? n.cut : 0.5) * 100) : Math.round(n.vel * 100) }; }, function (prev) { return { cv1: prev ? prev.cv1 : 24, cv2: prev ? prev.cv2 : 0 }; }, "mc4"); });
      var off4 = f.all.filter(function (n) { return Math.abs(n.t / 4 - Math.round(n.t / 4)) > 0.01; }).length;
      N(notes, off4 ? "approx" : "exact", off4 ? off4 + " time(s) rounded to 1/120 of a beat" : "Every time fits time base 120", "With time base 120 a quarter is 120 and a 16th 30 (MC4 p. 10). That is finer than any other machine here except micro timing.", [cite("MC4", 10)], sc.time, ["st", "gt", "tb"]);
      N(notes, "exact", "Gate time apart from step time", "STEP TIME is the time to the next note, GATE TIME the sounded length (MC4 p. 10).", [cite("MC4", 10)], sc.gate, ["gt"]);
      var rounded = f.all.filter(function (n) { return Math.abs(n.note - Math.round(n.note)) > 0.05; }).length;
      if (rounded) N(notes, "approx", rounded + " pitch(es) between keys rounded", "CV-1 numbers count the keys in semitones (MC4 p. 9).", [cite("MC4", 9)], sc.pitch, ["cv1"]);
      else N(notes, "exact", "Pitches as key numbers", "Pitches are typed as numbers counting up the keyboard (MC4 p. 9); 24 here is middle C (Wikipedia, \"Roland MC-4\").", [cite("MC4", 9)], sc.pitch, ["cv1"]);
      if (c.lines.length > 4) N(notes, "lost", (c.lines.length - 4) + " line(s) beyond four", "Four channels, each CV-1, CV-2 and gate (MC4 p. 11).", [cite("MC4", 11)], sc.ch, ["ch"]);
      if (f.cut) N(notes, "approx", "Filter values onto CV-2", "CV-2 can control \"the VCF, the VCA, or any other\" module (MC4 p. 11); its 0-100 scale here is this page's own.", [cite("MC4", 11), cite("PAGE")], sc.cut, ["cv2"]);
      if ((f.accent || f.velVar) && d.cv2 === "vel") N(notes, "approx", "Accents and loudness onto CV-2 (to the VCA)", "The MC-4 has no accent; CV-2 sent to the amplifier can play one (MC4 p. 11).", [cite("MC4", 11)], sc.acc, ["cv2"]);
      else if (f.accent) N(notes, "lost", "Accents", "CV-2 is busy with the filter; the MC-4 has no accent of its own (MC4 p. 11).", [cite("MC4", 11)], sc.acc, ["cv2"]);
      if (f.slide) N(notes, "lost", "Slides", "No portamento in the MC-4's data: CV-1, CV-2, step and gate (MC4 pp. 10-11). Overlapping gates give legato on some synths, not a glide.", [cite("MC4", 11)], sc.sl, ["gt"]);
    } else if (id === "a960") {
      var notesL = L0.slice(), over = 0; if (notesL.length > 8) { over = notesL.length - 8; notesL = notesL.slice(0, 8); }
      var ioi = notesL.map(function (n, i) { return (i + 1 < notesL.length ? notesL[i + 1].t : c.len) - n.t; });
      var mx = Math.max.apply(null, ioi.concat([1])), even = ioi.every(function (x) { return Math.abs(x - ioi[0]) < 2; });
      var secMax = mx / TPQ * 60 / c.bpm; d.rate = r2(1 / secMax); d.rowC = !even;
      var lo = Math.min.apply(null, notesL.map(function (n) { return n.note; }).concat([127]));
      d.base = notesL.length ? Math.floor(lo / 12) * 12 : 36;
      var maxV = 0, cv = 0, tooFast = 0;
      notesL.forEach(function (n, i) { d.A[i] = r2((n.note - d.base) / 12); maxV = Math.max(maxV, d.A[i]);
        if (!even) { var v = Math.log(mx / ioi[i]) / Math.LN2; cv = Math.max(cv, v); d.C[i] = r2(v); }
        d.B[i] = r2(((n.cut != null ? n.cut : (n.accent ? 1 : n.vel)) || 0) * 2); });
      d.xA = maxV <= 2 ? 1 : maxV <= 4 ? 2 : 4; d.xC = cv <= 2 ? 1 : cv <= 4 ? 2 : 4; d.xB = 1;
      if (maxV > 8) { tooFast++; }
      for (var st = notesL.length; st < 8; st++) d.mode[st] = "s";
      d.rowB = "cut";
      N(notes, "exact", "Pitches set on row A", "Each stage's row-A knob sets a voltage; at 1 V an octave any pitch can be tuned (Q960 pp. 1, 3). Range switch X" + d.xA + " gives 0-" + 2 * d.xA + " V (p. 4).", [cite("Q960", 1), cite("Q960", 4)], sc.pitch, ["A", "xA", "base"]);
      if (over) N(notes, "lost", over + " note(s) after the eighth", "The 960 has 8 stages (Q960 p. 1). A Q962 switch can chain three rows into 24 stages (p. 2), with no other row left over.", [cite("Q960", 1), cite("Q960", 2)], sc.len, ["mode"]);
      if (!even) N(notes, "approx", "Uneven rhythm through row C timing", "Switching 3rd-row timing on sends row C to the clock: each volt doubles its speed, halving the stage (Q960 p. 4). Lengths are set by turning knobs, not counted.", [cite("Q960", 4)], sc.time, ["C", "rowC", "xC"]);
      else N(notes, "exact", "Even steps", "Every stage lasts one cycle of the 960's oscillator (Q960 p. 3).", [cite("Q960", 3)], sc.time, ["rate"]);
      var rests = notesL.some(function (n, i) { return ioi[i] - n.len > 30; });
      if (rests) N(notes, "lost", "Rests and gate lengths", "The oscillator's pulse starts the envelope on every stage at 90 % on (Q960 pp. 3, 5); a rest becomes a longer stage, and each note sounds for 90 % of its stage.", [cite("Q960", 3), cite("Q960", 5)], sc.gate, ["rate"]);
      else noteLen(notes, f, "approx", "Gate lengths become 90 % of a stage", "The oscillator output is a 90 % pulse (Q960 p. 3).", [cite("Q960", 3)], sc.gate, ["rate"]);
      if (f.cut) N(notes, "approx", "Filter values on row B", "Row B is a second voltage per stage, patched here to the filter (Q960 p. 1).", [cite("Q960", 1)], sc.cut, ["B", "rowB"]);
      else if (f.accent || f.velVar) N(notes, "approx", "Accents as row-B filter voltage", "No accent on the 960; row B patched to the filter can brighten the accented stages (Q960 p. 1).", [cite("Q960", 1)], sc.acc, ["B", "rowB"]);
      if (f.slide) N(notes, "lost", "Slides", "No slide per stage: a glide on the synth would glide between every stage. The 960's rows are voltages only (Q960 p. 1).", [cite("Q960", 1)], sc.sl, []);
      lines1(notes, f, sc);
    } else if (id === "elektron") {
      var stepsE = Math.min(64, Math.max(2, Math.round(c.len / STEP16))), tr = [], microN = 0, outE = 0, dup = 0;
      for (var e = 0; e < stepsE; e++) tr.push(null);
      var prevSl = false;
      L0.forEach(function (n) {
        var s = Math.round(n.t / STEP16), mic = Math.round((n.t - s * STEP16) / 5);
        if (s >= stepsE) { outE++; return; } if (tr[s]) { dup++; return; }
        if (Math.abs((n.t - s * STEP16) - mic * 5) > 0.5) microN++;
        tr[s] = { type: "n", note: Math.round(n.note), vel: Math.round(clamp(n.accent ? 127 : n.vel * 127, 1, 127)), len: r2(n.len / STEP16), micro: clamp(mic, -23, 23), cut: n.cut != null ? r2(n.cut) : null, porta: prevSl };
        prevSl = !!n.slide;
      });
      c.cutPts.forEach(function (p) { var s = Math.round(p.t / STEP16); if (s < stepsE && !tr[s]) tr[s] = { type: "l", cut: r2(p.v) }; });
      d.trigs = tr; d.steps = stepsE;
      var offs = f.all.filter(function (n) { return Math.abs(n.t / STEP16 - Math.round(n.t / STEP16)) > 0.02; }).length;
      N(notes, offs ? "approx" : "exact", offs ? offs + " off-grid note(s) kept as micro timing" : "Every note on a step", "Micro timing moves a trig ahead of or behind its step (DT p. 45). Its steps are 1/24 of a 16th here, the page's own figure.", [cite("DT", 45), cite("PAGE")], sc.time, ["micro"]);
      if (outE) N(notes, "lost", outE + " note(s) past 64 steps", "The real sequencer has 128 steps on 8 pages (DT p. 45); this rebuild stops at 64.", [cite("DT", 45), cite("PAGE")], sc.len, ["steps"]);
      if (dup) N(notes, "lost", dup + " note(s) on a step already used", "One trig a step on an audio track (DT p. 41). MIDI tracks can send a chord of four notes (p. 17).", [cite("DT", 41), cite("DT", 17)], sc.time, ["trig"]);
      N(notes, "exact", "Note length per trig (LEN)", "Trig Length is set for each trig (DT p. 53).", [cite("DT", 53)], sc.gate, ["len"]);
      if (f.accent || f.velVar) N(notes, "approx", "Accents become velocity locks", "VEL is a trig parameter that can be locked on any trig (DT pp. 47, 53); there is no accent switch, so an accent is velocity 127.", [cite("DT", 53), cite("DT", 47)], sc.acc, ["vel"]);
      if (f.slide) N(notes, "approx", "Slides become portamento locks", "Portamento is on TRIG PAGE 2 (DT p. 54) and can be locked per trig; its curve is not the 303's.", [cite("DT", 54), cite("DT", 47)], sc.sl, ["porta"]);
      if (f.cut) N(notes, "exact", "Filter values as parameter locks", "Any parameter can be locked on a note trig, or on a lock trig that plays no note (DT pp. 41, 47).", [cite("DT", 47), cite("DT", 41)], sc.cut, ["cut", "trig"]);
      if (c.lines.length > 1) N(notes, "lost", (c.lines.length - 1) + " other line(s)", "Each line would need its own track (DT p. 16); this rebuild has one.", [cite("DT", 16), cite("PAGE")], sc.ch, ["trig"]);
    }
    srcNotes(notes, c, SRC, id);
    return { data: d, notes: notes };
  }
  // what is lost leaving the source, whatever the target
  function srcNotes(notes, c, src, to) {
    if (src === to) return;
    var sc = srcCtl(src);
    if (src === "elektron" && c.feat.cond) N(notes, "lost", "Trig conditions and probability", "Conditions such as 1:2, 1ST or FILL, and PROB, decide each loop whether a trig plays (DT pp. 48, 53). Only the loop shown (Loop " + "n" + " on the panel) is translated.", [cite("DT", 48), cite("DT", 53)], ["cond", "prob", "loop"], []);
    if (src === "elektron" && c.feat.locks && to !== "a960" && to !== "mc4") N(notes, "lost", "Lock trigs (a value change with no note)", "A lock trig changes parameters without playing (DT p. 41); this machine has no step without a note to put it on.", [cite("DT", 41)], ["trig"], []);
    if (src === "a960" && c.feat.continuous) N(notes, to === "a960" ? "exact" : "approx", "Pitches between the keys rounded", "The 960's knobs turn smoothly, so a stage can sit between two semitones (Q960 p. 4: 0-2 V over the knob's turn).", [cite("Q960", 4)], ["A"], to === "mc4" ? ["cv1"] : to === "tb303" ? ["pitch"] : to === "mc202" ? ["n"] : ["note"]);
    if (src === "a960" && c.loopless) N(notes, "approx", "A Stop stage", "Stop keeps the sequence on that stage (Q960 p. 3); the others loop the bar instead.", [cite("Q960", 3)], ["mode"], []);
  }
  function srcCtl(src) {
    return { a960: { time: ["rate", "C", "rowC"], len: ["mode"], gate: ["rate"], acc: ["B"], sl: [], cut: ["B", "rowB"], ch: [], pitch: ["A", "base"] },
      tb303: { time: ["time", "trip"], len: ["last"], gate: ["time"], acc: ["acc"], sl: ["sl"], cut: [], ch: [], pitch: ["pitch", "oct"] },
      mc202: { time: ["st"], len: ["st"], gate: ["gt"], acc: ["acc"], sl: ["po"], cut: [], ch: ["ch"], pitch: ["n"] },
      mc4: { time: ["st", "tb"], len: ["st"], gate: ["gt"], acc: ["cv2"], sl: [], cut: ["cv2"], ch: ["ch"], pitch: ["cv1"] },
      elektron: { time: ["micro", "swing", "speed"], len: ["steps"], gate: ["len"], acc: ["vel"], sl: ["porta"], cut: ["cut"], ch: [], pitch: ["note"] } }[src];
  }
  function noteLen(notes, f, cls, what, why, cites, from, to) {
    var varied = f.all.some(function (n, i) { var next = f.all[i + 1]; return next && Math.abs((next.t - n.t) - n.len) > 30; });
    if (varied) N(notes, cls, what, why, cites, from, to);
  }
  function lines1(notes, f, sc) { if (f.lines > 1) N(notes, "lost", (f.lines - 1) + " other line(s)", "One line only: this machine drives one voice.", [cite("PAGE")], sc.ch, []); }
  function cutLost(notes, f, why, cites, sc) { if (f.cut) N(notes, "lost", "Filter values per step", why, cites, sc.cut, []); }
  // a monophonic line -> list of {step time, gate time} entries with rests, at `div` canonical ticks a unit
  function lineToSteps(L, total, div, mk, mkRest, kind) {
    var out = [], t = 0, prevSlide = false, prev = null;
    L.forEach(function (n, i) {
      var st = Math.round(n.t / div);
      if (st > t) { var r = mkRest(prev); if (kind === "mc4") { r.st = st - t; r.gt = 0; } else { r.st = st - t; r.gt = 0; } out.push(r); t = st; }
      var nextT = i + 1 < L.length ? Math.round(L[i + 1].t / div) : Math.max(Math.round(total / div), t + 1);
      var e = mk(n, prevSlide); e.st = Math.max(1, nextT - t); e.gt = Math.max(1, Math.round((n.slide ? Math.max(n.len, (nextT - t) * div) : n.len) / div));
      out.push(e); t += e.st; prevSlide = !!n.slide; prev = e;
    });
    var end = Math.round(total / div); if (end > t && out.length) { var r2_ = mkRest(prev); r2_.st = end - t; r2_.gt = 0; out.push(r2_); }
    return out;
  }
  SQ.fromCanon = fromCanon;

  SQ.translate = function (from, to, data) {
    var c = toCanon(from, data), r = fromCanon(to, c, from);
    var order = { lost: 0, approx: 1, exact: 2 };
    r.notes.sort(function (a, b) { return order[a.cls] - order[b.cls]; });
    return { data: r.data, notes: r.notes, canon: c };
  };
  SQ.toEvents = function (id, data) {
    var c = toCanon(id, data), out = [];
    c.lines.forEach(function (L, ch) { L.forEach(function (n) { out.push({ t: n.t / TPQ, note: n.note, vel: n.vel, len: n.len / TPQ, accent: n.accent, slide: n.slide, ch: ch, cut: n.cut }); }); });
    return out.sort(function (a, b) { return a.t - b.t || a.ch - b.ch; });
  };
  SQ.exportJSON = function (id, data, meta) {
    meta = meta || {};
    return { kind: "sequence", version: 1, machine: id, bpm: data.bpm, steps: clone(data), song: meta.song || "", artist: meta.artist || "",
      source: { url: (meta.source && meta.source.url) || "", channel: (meta.source && meta.source.channel) || "", title: (meta.source && meta.source.title) || "", at: (meta.source && meta.source.at) || "" } };
  };
  SQ.importJSON = function (o) {
    if (typeof o === "string") o = JSON.parse(o);
    if (!o || o.kind !== "sequence" || o.version !== 1 || !MACHINES[o.machine] || !o.steps) throw new Error("Not a version-1 sequence file");
    var d = Object.assign(blank(o.machine), o.steps);
    return { machine: o.machine, data: d, song: o.song || "", artist: o.artist || "", source: o.source || {} };
  };

  // ---------- worked examples (lines written for this page, not copies of records) ----------
  function t303(str, timeStr, bpm) {   // "C3a C3s ..." tokens: note + octave, flags a = accent, s = slide; time "n t r ..."
    var d = blank("tb303"), toks = str.split(/\s+/), tms = timeStr.split(/\s+/);
    toks.forEach(function (tk, i) { var m = /^([A-G])(#?)(\d)([as]*)$/.exec(tk); var pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
      var midi = (+m[3] + 1) * 12 + pc, k = midi - 48, oct = 0; if (k < 0) { oct = -1; k += 12; } else if (k > 12) { oct = 1; k -= 12; }
      d.pitch[i] = { k: k, oct: oct, acc: m[4].indexOf("a") >= 0, sl: m[4].indexOf("s") >= 0 }; });
    d.time = tms; d.last = tms.length; d.bpm = bpm || 124; return d;
  }
  var EX = [
    { id: "acid", from: "tb303", to: "a960", name: "Acid line with accents and slides (TB-303 → 960)",
      say: "Sixteen steps with accents, slides and ties. The 960 keeps the first eight notes and their pitches; the slides and the accents' bite go.",
      d: t303("C2 C3a C2 D#2s F2 C2a G2 A#2s C3 G2 D#2a C2", "n n t n n n n r n n n t n n r n", 124) },
    { id: "berlin", from: "a960", to: "tb303", name: "Eight-stage Berlin School loop (960 → TB-303)",
      say: "Eight stages of even sixteenths at 1 V an octave. Every stage lands on a 303 step; the 960's 90 % gate becomes whole steps.",
      d: { bpm: 120, base: 36, A: [0, 1, 0.58, 0.25, 0, 1.25, 0.83, 0.58], B: [1.6, 0.4, 0.8, 0.4, 1.6, 0.4, 1.0, 0.4], C: [0, 0, 0, 0, 0, 0, 0, 0], xA: 1, xB: 1, xC: 1, mode: ["n", "n", "n", "n", "n", "n", "n", "n"], rate: 8, rowC: false, rowB: "cut" } },
    { id: "rowc", from: "a960", to: "mc4", name: "Row C timing: long and short stages (960 → MC-4)",
      say: "Row C speeds the clock up stage by stage. The MC-4 writes each length as a number at 120 a beat, so the rhythm is kept exactly.",
      d: { bpm: 100, base: 36, A: [0, 0.58, 1, 0.83, 0.58, 0.42, 0.25, 0.17], B: [1, 1, 1, 1, 1, 1, 1, 1], C: [0, 1, 1, 0, 1, 1, 2, 2], xA: 1, xB: 1, xC: 1, mode: ["n", "n", "n", "n", "n", "n", "n", "n"], rate: 100 / 30, rowC: true, rowB: "none" } },
    { id: "duet", from: "mc202", to: "tb303", name: "Two-channel MC-202 duet with portamento (MC-202 → TB-303)",
      say: "Channel 1 is a bass with staccato and legato gates and a portamento; channel 2 a held line above. The 303 keeps channel 1 only.",
      d: { bpm: 112, ch: [
        [{ n: 36, st: 12, gt: 4, acc: true, po: false }, { n: 36, st: 6, gt: 3, acc: false, po: false }, { n: 48, st: 6, gt: 6, acc: false, po: false }, { n: 46, st: 12, gt: 11, acc: false, po: true }, { n: 43, st: 12, gt: 4, acc: true, po: false },
         { n: 39, st: 6, gt: 3, acc: false, po: false }, { n: 41, st: 6, gt: 5, acc: false, po: false }, { n: 43, st: 12, gt: 11, acc: false, po: true }, { n: 36, st: 24, gt: 6, acc: true, po: false }],
        [{ n: 67, st: 48, gt: 44, acc: false, po: false }, { n: 70, st: 24, gt: 22, acc: false, po: false }, { n: 72, st: 24, gt: 22, acc: false, po: true }]] } },
    { id: "trip", from: "mc4", to: "tb303", name: "MC-4 triplets and a swung figure (MC-4 → TB-303)",
      say: "Eighth-note triplets (step 40) against straight sixteenths (30), and a 45 / 15 swing. Neither the 303's 16ths nor its triplet grid hold all of it.",
      d: { bpm: 96, tb: 120, cv2: "cut", ch: [[{ cv1: 0, cv2: 30, st: 40, gt: 20 }, { cv1: 7, cv2: 40, st: 40, gt: 20 }, { cv1: 12, cv2: 50, st: 40, gt: 20 }, { cv1: 10, cv2: 60, st: 45, gt: 30 }, { cv1: 7, cv2: 70, st: 15, gt: 10 },
        { cv1: 5, cv2: 80, st: 45, gt: 30 }, { cv1: 3, cv2: 70, st: 15, gt: 10 }, { cv1: 0, cv2: 50, st: 30, gt: 15 }, { cv1: 3, cv2: 40, st: 30, gt: 15 }, { cv1: 5, cv2: 30, st: 60, gt: 50 }, { cv1: 7, cv2: 20, st: 120, gt: 90 }], [], [], []] } },
    { id: "mc4-four", from: "mc4", to: "mc202", name: "Four MC-4 channels into two (MC-4 → MC-202)",
      say: "Bass, two inner lines and a top line. The MC-202 keeps two channels and rounds 1/120 of a beat to 1/24.",
      d: { bpm: 104, tb: 120, cv2: "cut", ch: [
        [{ cv1: 0, cv2: 40, st: 60, gt: 50 }, { cv1: 0, cv2: 60, st: 60, gt: 20 }, { cv1: 7, cv2: 40, st: 60, gt: 50 }, { cv1: 10, cv2: 60, st: 60, gt: 20 }, { cv1: 5, cv2: 40, st: 60, gt: 50 }, { cv1: 5, cv2: 60, st: 60, gt: 20 }, { cv1: 3, cv2: 40, st: 60, gt: 50 }, { cv1: 7, cv2: 80, st: 60, gt: 30 }],
        [{ cv1: 27, cv2: 50, st: 240, gt: 230 }, { cv1: 29, cv2: 50, st: 240, gt: 230 }],
        [{ cv1: 31, cv2: 50, st: 240, gt: 230 }, { cv1: 33, cv2: 50, st: 240, gt: 230 }],
        [{ cv1: 36, cv2: 50, st: 90, gt: 80 }, { cv1: 38, cv2: 50, st: 30, gt: 25 }, { cv1: 39, cv2: 50, st: 120, gt: 110 }, { cv1: 41, cv2: 50, st: 120, gt: 110 }, { cv1: 43, cv2: 50, st: 120, gt: 110 }]] } },
    { id: "plocks", from: "elektron", to: "mc202", name: "Parameter locks, a 1:2 condition and micro timing (Elektron → MC-202)",
      say: "Filter locks on every trig, a lock trig with no note, a trig that plays only on loops 1, 3, 5 …, and two trigs pushed late. Change Loop on the panel to hear loop 2.",
      d: { bpm: 122, steps: 16, speed: 1, swing: 54, loop: 1, fill: false, def: { note: 36, vel: 100, len: 0.5 }, trigs: [
        { type: "n", note: 36, vel: 120, len: 0.5, micro: 0, cut: 0.2 }, null, { type: "n", note: 48, vel: 90, len: 0.4, micro: 6, cut: 0.6 }, { type: "l", cut: 0.9 },
        { type: "n", note: 36, vel: 110, len: 0.5, micro: 0, cut: 0.3 }, null, { type: "n", note: 46, vel: 90, len: 1.5, micro: 0, cut: 0.5, cond: "1:2" }, null,
        { type: "n", note: 39, vel: 127, len: 0.5, micro: 0, cut: 0.8 }, null, { type: "n", note: 41, vel: 80, len: 0.3, micro: 9, cut: 0.4, prob: 50 }, { type: "n", note: 43, vel: 100, len: 1, micro: 0, cut: 0.6, porta: true },
        null, { type: "l", cut: 0.1 }, { type: "n", note: 36, vel: 100, len: 0.5, micro: 0, cut: 0.35, cond: "!1ST" }, null] } },
    { id: "twelve", from: "elektron", to: "a960", name: "A 12-step loop over 16 (Elektron → 960)",
      say: "Ten trigs on a 12-step track. The 960 has eight stages, so two notes are lost, and the lengths go into row C.",
      d: { bpm: 126, steps: 12, speed: 1, swing: 50, loop: 1, fill: false, def: { note: 36, vel: 100, len: 0.7 }, trigs: [
        { type: "n", note: 36 }, { type: "n", note: 48 }, { type: "n", note: 36 }, { type: "n", note: 43 }, { type: "n", note: 46 }, null, { type: "n", note: 36 }, { type: "n", note: 51 }, { type: "n", note: 48 }, null, { type: "n", note: 39 }, { type: "n", note: 41 }] } }
  ];
  SQ.EXAMPLES = EX;

  // ---------- the shared voice: an AudioWorklet (one per channel) ----------
  SQ.workletSource = [
    "class SeqCompareVoice extends AudioWorkletProcessor {",
    "  constructor() { super(); this.q = []; this.f = 110; this.ft = 110; this.gate = 0; this.env = 0; this.fenv = 0; this.ph = 0; this.s = [0, 0, 0, 0];",
    "    this.P = { wave: 0, cut: 0.35, res: 0.55, env: 0.6, dec: 0.25, acc: 0.6, glide: 0.06, vol: 0.5 }; this.accOn = 0; this.lane = -1;",
    "    this.port.onmessage = (e) => { const m = e.data; if (m.type === 'p') Object.assign(this.P, m.P); else if (m.type === 'clear') this.q = [], this.gate = 0; else { this.q.push(m); this.q.sort((a, b) => a.at - b.at); } }; }",
    "  process(ins, outs) {",
    "    const o = outs[0][0], sr = sampleRate, P = this.P; let t = currentTime;",
    "    for (let i = 0; i < o.length; i++, t += 1 / sr) {",
    "      while (this.q.length && this.q[0].at <= t) { const m = this.q.shift();",
    "        if (m.type === 'on') { this.ft = 440 * Math.pow(2, (m.note - 69) / 12); if (!(m.legato && this.gate)) { this.f = this.ft; this.fenv = 1; this.env = Math.max(this.env, 0.001); } this.gate = 1; this.accOn = m.accent ? 1 : 0; this.vel = m.vel; this.glideOn = !!m.legato; }",
    "        else if (m.type === 'off') this.gate = 0; else if (m.type === 'cut') this.lane = m.v; }",
    "      if (this.glideOn) this.f += (this.ft - this.f) * (1 - Math.exp(-1 / (P.glide * sr))); else this.f = this.ft;",
    "      this.env += ((this.gate ? 1 : 0) - this.env) * (this.gate ? 0.02 : 0.004);",
    "      this.fenv *= Math.exp(-1 / (Math.max(0.02, P.dec * (this.accOn ? 0.6 : 1)) * sr));",
    "      this.ph += this.f / sr; if (this.ph >= 1) this.ph -= 1;",
    "      const x = P.wave ? (this.ph < 0.5 ? 0.7 : -0.7) : (2 * this.ph - 1);",
    "      const base = this.lane >= 0 ? this.lane : P.cut, em = P.env * (1 + (this.accOn ? P.acc : 0));",
    "      const fc = Math.min(0.45, 40 * Math.pow(2, base * 8 + em * this.fenv * 4) / sr), g = 1 - Math.exp(-2 * Math.PI * fc), k = P.res * 3.6;",
    "      let u = Math.tanh(x - k * this.s[3]); for (let j = 0; j < 4; j++) { this.s[j] += g * (u - this.s[j]); u = this.s[j]; }",
    "      o[i] = this.s[3] * this.env * P.vol * (0.6 + 0.4 * (this.vel || 0.7)) * (1 + (this.accOn ? P.acc * 0.6 : 0));",
    "    }",
    "    return true;",
    "  }",
    "}",
    "registerProcessor('seq-compare-voice', SeqCompareVoice);"
  ].join("\n");

  // ---------- drawings (SVG strings; testable without a DOM) ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // piano roll of two machines' canon lines (a: outline, b: filled)
  SQ.rollSVG = function (ca, cb, ma, mb, playT) {
    var all = [].concat.apply([], ca.lines.concat(cb.lines)), len = Math.max(ca.len, cb.len, TPQ);
    var lo = Math.floor(Math.min.apply(null, all.map(function (n) { return n.note; }).concat([48])) - 1), hi = Math.ceil(Math.max.apply(null, all.map(function (n) { return n.note; }).concat([60])) + 1);
    var W = 640, H = Math.max(120, Math.min(260, (hi - lo) * 7)), x = function (t) { return 34 + t / len * (W - 40); }, y = function (n) { return 6 + (hi - n) / (hi - lo) * (H - 20); };
    var s = '<svg class="sqc-roll" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Piano roll: what each machine plays"><title>Piano roll: ' + esc(MACHINES[ma].name) + " (outline) and " + esc(MACHINES[mb].name) + " (filled)</title>";
    for (var n = lo; n <= hi; n++) if (n % 12 === 0) s += '<line class="sqc-gl" x1="34" x2="' + W + '" y1="' + y(n) + '" y2="' + y(n) + '"/><text class="sqc-ax" x="2" y="' + (y(n) + 3) + '">' + nname(n) + "</text>";
    for (var b = 0; b <= len; b += TPQ) s += '<line class="sqc-gb" x1="' + x(b) + '" x2="' + x(b) + '" y1="0" y2="' + (H - 12) + '"/>';
    function draw(c, cls) { c.lines.forEach(function (L, li) { L.forEach(function (nt, i) {
      var w = Math.max(2, x(nt.t + nt.len) - x(nt.t)), h = Math.max(3, (H - 20) / (hi - lo) - 1);
      s += '<rect class="' + cls + " sqc-l" + li + (nt.accent ? " sqc-acc" : "") + '" x="' + x(nt.t).toFixed(1) + '" y="' + (y(nt.note) - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"><title>' + nname(nt.note) + (nt.accent ? " accent" : "") + (nt.slide ? " slide" : "") + "</title></rect>";
      if (nt.slide && L[i + 1]) s += '<line class="' + cls + '-sl" x1="' + x(nt.t + nt.len).toFixed(1) + '" y1="' + y(nt.note).toFixed(1) + '" x2="' + x(L[i + 1].t).toFixed(1) + '" y2="' + y(L[i + 1].note).toFixed(1) + '"/>';
    }); }); }
    draw(cb, "sqc-b"); draw(ca, "sqc-a");
    if (playT != null) s += '<line class="sqc-head" x1="' + x(playT % len) + '" x2="' + x(playT % len) + '" y1="0" y2="' + (H - 12) + '"/>';
    return s + "</svg>";
  };
  // timing grid: each machine's resolution over one beat, with the notes' start times marked
  SQ.gridSVG = function (canons) {
    var W = 640, row = 30, H = 18 + row * ORDER.length, x = function (t) { return 120 + t / TPQ * (W - 130); };
    var s = '<svg class="sqc-grid" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Timing grid of each machine over one beat"><title>Where each machine can place a note within one quarter-note beat</title>';
    ORDER.forEach(function (id, r) {
      var y0 = 12 + r * row, res = MACHINES[id].res;
      s += '<text class="sqc-ax" x="2" y="' + (y0 + 14) + '">' + esc(MACHINES[id].name) + "</text>";
      if (res) for (var k = 0; k <= res; k++) { var tx = x(k * TPQ / res); s += '<line class="sqc-tick" x1="' + tx.toFixed(1) + '" x2="' + tx.toFixed(1) + '" y1="' + y0 + '" y2="' + (y0 + (res > 30 && k % (res / 4) ? 10 : 20)) + '"/>'; }
      else s += '<rect class="sqc-cont" x="' + x(0) + '" y="' + (y0 + 4) + '" width="' + (x(TPQ) - x(0)) + '" height="12"><title>Any length: set by the clock and row C, not counted</title></rect>';
      if (id === "elektron") for (var m = 0; m <= 96; m++) { var mx = x(m * TPQ / 96); s += '<line class="sqc-micro" x1="' + mx.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y1="' + (y0 + 14) + '" y2="' + (y0 + 20) + '"/>'; }
      var c = canons && canons[id];
      if (c) [].concat.apply([], c.lines).forEach(function (n) { var ph = n.t % TPQ; s += '<circle class="sqc-dot sqc-' + id + '" cx="' + x(ph).toFixed(1) + '" cy="' + (y0 + 10) + '" r="3.2"/>'; });
    });
    return s + "</svg>";
  };
  // per-step lanes: velocity, accent, slide, gate %, filter value
  SQ.lanesSVG = function (c, id) {
    var L = c.lines[0] || [], len = Math.max(c.len, TPQ), W = 640, lanes = [["Velocity", "vel"], ["Accent", "accent"], ["Slide", "slide"], ["Gate %", "gate"], ["Filter", "cut"]], row = 26, H = lanes.length * row + 6;
    var x = function (t) { return 70 + t / len * (W - 76); };
    var s = '<svg class="sqc-lanes" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Parameter lanes for ' + esc(MACHINES[id].name) + '"><title>Per-note values: ' + esc(MACHINES[id].name) + "</title>";
    lanes.forEach(function (ln, r) {
      var y0 = 4 + r * row; s += '<text class="sqc-ax" x="2" y="' + (y0 + 15) + '">' + ln[0] + '</text><line class="sqc-gl" x1="70" x2="' + W + '" y1="' + (y0 + row - 4) + '" y2="' + (y0 + row - 4) + '"/>';
      L.forEach(function (n, i) {
        var next = L[i + 1] ? L[i + 1].t : c.len, v = ln[1] === "vel" ? n.vel : ln[1] === "accent" ? (n.accent ? 1 : 0) : ln[1] === "slide" ? (n.slide ? 1 : 0) : ln[1] === "gate" ? clamp(n.len / Math.max(1, next - n.t), 0, 1) : n.cut;
        if (v == null) return; var h = v * (row - 8);
        s += '<rect class="sqc-lv sqc-lv-' + ln[1] + '" x="' + x(n.t).toFixed(1) + '" y="' + (y0 + row - 4 - h).toFixed(1) + '" width="' + Math.max(2, Math.min(14, x(next) - x(n.t) - 1)).toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
      });
      if (ln[1] === "cut") c.cutPts.forEach(function (p) { s += '<circle class="sqc-lockpt" cx="' + x(p.t).toFixed(1) + '" cy="' + (y0 + row - 4 - p.v * (row - 8)).toFixed(1) + '" r="2.5"><title>lock</title></circle>'; });
    });
    return s + "</svg>";
  };

  // ---------- the page widget ----------
  var ctx = null, master = null, voices = [], ana = null;
  function audio() {
    if (ctx) return Promise.resolve();
    ctx = new (global.AudioContext || global.webkitAudioContext)();
    var url = URL.createObjectURL(new Blob([SQ.workletSource], { type: "text/javascript" }));
    return ctx.audioWorklet.addModule(url).then(function () {
      master = ctx.createGain(); master.gain.value = 0.8; ana = ctx.createAnalyser(); ana.fftSize = 2048;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -8; lim.ratio.value = 10;
      master.connect(lim); lim.connect(ctx.destination); master.connect(ana);
      for (var i = 0; i < 4; i++) { var n = new AudioWorkletNode(ctx, "seq-compare-voice", { numberOfInputs: 0, outputChannelCount: [1] }), g = ctx.createGain(); g.gain.value = i ? 0.55 : 1; n.connect(g); g.connect(master); voices.push(n); }
      if (global.AudioTap) try { AudioTap.register(ctx, master, "Sequencer Compare"); } catch (e) {}
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, cls) { var b = el("button", "btn btn-sm " + (cls || "btn-outline-secondary"), text); b.type = "button"; return b; }
  function ctlWrap(ctl, label, inner) { var w = el("div", "sqc-c"); w.dataset.ctl = ctl; if (label) w.appendChild(el("span", "sqc-cl", label)); if (inner) w.appendChild(inner); return w; }
  // a knob: drag up / down, arrow keys, double-click resets
  function knob(val, min, max, step, onch, title) {
    var k = el("div", "sqc-knob"); k.tabIndex = 0; k.setAttribute("role", "slider"); k.setAttribute("aria-valuemin", min); k.setAttribute("aria-valuemax", max); if (title) k.setAttribute("aria-label", title);
    var out = el("output"), v = val, d0 = val;
    function draw() { var a = -135 + 270 * (v - min) / (max - min || 1), r = a * Math.PI / 180;
      k.innerHTML = '<svg viewBox="0 0 40 40"><circle class="sqc-kb" cx="20" cy="20" r="15"/><line class="sqc-kt" x1="20" y1="20" x2="' + (20 + 12 * Math.sin(r)).toFixed(2) + '" y2="' + (20 - 12 * Math.cos(r)).toFixed(2) + '"/></svg>';
      k.setAttribute("aria-valuenow", v); out.textContent = (Math.round(v * 100) / 100).toString(); }
    function set(x, quiet) { v = clamp(Math.round(x / step) * step, min, max); v = Math.round(v * 1000) / 1000; draw(); if (!quiet) onch(v); }
    var y0 = null, v0 = 0;
    k.addEventListener("pointerdown", function (e) { y0 = e.clientY; v0 = v; k.setPointerCapture(e.pointerId); });
    k.addEventListener("pointermove", function (e) { if (y0 == null) return; set(v0 + (y0 - e.clientY) / 120 * (max - min)); });
    k.addEventListener("pointerup", function () { y0 = null; });
    k.addEventListener("keydown", function (e) { if (e.key === "ArrowUp" || e.key === "ArrowRight") { set(v + step); e.preventDefault(); } if (e.key === "ArrowDown" || e.key === "ArrowLeft") { set(v - step); e.preventDefault(); } });
    k.addEventListener("dblclick", function () { set(d0); });
    draw(); var box = el("div", "sqc-kw"); box.appendChild(k); box.appendChild(out); box.setValue = function (x) { set(x, true); }; return box;
  }

  SQ.widgets = [];
  SQ.mount = function (host) {
    var W = { host: host, src: "tb303", dst: "a960", data: {}, timers: [], playing: null, meta: { song: "", artist: "", source: {} } };
    ORDER.forEach(function (id) { W.data[id] = blank(id); });
    host.innerHTML = ""; host.classList.add("sqc-w");
    var top = el("div", "sqc-top");
    var exSel = el("select"); exSel.setAttribute("aria-label", "Worked example"); EX.forEach(function (x) { var o = el("option", null, x.name); o.value = x.id; exSel.appendChild(o); });
    var exL = el("label", "sqc-lab", "Example "); exL.appendChild(exSel); top.appendChild(exL);
    function mSel(lbl, key) { var s = el("select"); s.setAttribute("aria-label", lbl); ORDER.forEach(function (id) { var o = el("option", null, MACHINES[id].name); o.value = id; s.appendChild(o); }); var l = el("label", "sqc-lab", lbl + " "); l.appendChild(s); top.appendChild(l); s.addEventListener("change", function () { W[key] = s.value; if (W.src === W.dst) { W.dst = ORDER[(ORDER.indexOf(W.src) + 1) % 5]; dstSel.value = W.dst; } retranslate(); render(); }); return s; }
    var srcSel = mSel("From", "src"), dstSel = mSel("To", "dst");
    var swap = btn("⇅ Swap"); top.appendChild(swap);
    var bA = btn("▶ From"), bB = btn("▶ To"), bAB = btn("▶ A then B"), bStop = btn("■ Stop");
    [bA, bB, bAB, bStop].forEach(function (b) { top.appendChild(b); });
    host.appendChild(top);
    var say = el("p", "sqc-say"); host.appendChild(say);
    var panels = el("div", "sqc-panels"), pSrc = el("div", "sqc-panel sqc-src"), pDst = el("div", "sqc-panel sqc-dst"); panels.appendChild(pSrc); panels.appendChild(pDst); host.appendChild(panels);
    var rep = el("div", "sqc-report"); host.appendChild(rep);
    var pics = el("div", "sqc-pics");
    var fRoll = el("figure", "sqc-fig"), fGrid = el("figure", "sqc-fig"), fLanes = el("figure", "sqc-fig");
    [[fRoll, "Piano roll: what each machine actually plays (outline = From, filled = To)"], [fGrid, "Timing grid: where each machine can put a note in one beat; dots = this line's notes"], [fLanes, "Per-note lanes (From, then To)"]].forEach(function (p) { p[0].appendChild(el("div", "sqc-svg")); p[0].appendChild(el("figcaption", null, p[1])); pics.appendChild(p[0]); });
    host.appendChild(pics);
    // voice
    var vbox = el("fieldset", "sqc-voice"); vbox.appendChild(el("legend", null, "The shared voice (this page's own, the same for every machine)"));
    var VP = { wave: 0, cut: 0.35, res: 0.55, env: 0.6, dec: 0.25, acc: 0.6, glide: 0.06, vol: 0.5 };
    [["cut", "Cutoff", 0, 1, 0.01], ["res", "Resonance", 0, 0.95, 0.01], ["env", "Env mod", 0, 1, 0.01], ["dec", "Decay", 0.03, 1.5, 0.01], ["acc", "Accent", 0, 1, 0.01], ["glide", "Slide time", 0.01, 0.2, 0.005]].forEach(function (p) {
      vbox.appendChild(ctlWrap("v-" + p[0], p[1], knob(VP[p[0]], p[2], p[3], p[4], function (v) { VP[p[0]] = v; sendP(); }, p[1])));
    });
    var wv = el("select"); [["0", "Saw"], ["1", "Square"]].forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; wv.appendChild(e); }); wv.addEventListener("change", function () { VP.wave = +wv.value; sendP(); });
    vbox.appendChild(ctlWrap("v-wave", "Wave", wv)); host.appendChild(vbox);
    function sendP() { voices.forEach(function (v) { v.port.postMessage({ type: "p", P: VP }); }); }
    // file: export / import + assignments
    var fbox = el("fieldset", "sqc-file"); fbox.appendChild(el("legend", null, "Save or load a line (JSON)"));
    var song = el("input"), artist = el("input"), surl = el("input"), sat = el("input");
    [[song, "Song"], [artist, "Artist"], [surl, "Video URL"], [sat, "At (m:ss)"]].forEach(function (p) { p[0].type = "text"; p[0].setAttribute("aria-label", p[1]); var l = el("label", "sqc-lab", p[1] + " "); l.appendChild(p[0]); fbox.appendChild(l); });
    var bExp = btn("⤓ Export From"), bImp = btn("⤒ Import"), fin = el("input"); fin.type = "file"; fin.accept = ".json,application/json"; fin.hidden = true;
    fbox.appendChild(bExp); fbox.appendChild(bImp); fbox.appendChild(fin); host.appendChild(fbox);
    var asg = el("div", "sqc-assign"); host.appendChild(asg);

    // ----- the five panel builders (draw W.data[id] into box; edits call changed(id)) -----
    function head(box, id, role) {
      box.className = "sqc-panel sqc-" + role + " sqc-m-" + id; box.innerHTML = "";
      var h = el("div", "sqc-ph"); h.appendChild(el("span", "sqc-name", MACHINES[id].name)); h.appendChild(el("span", "sqc-long", MACHINES[id].long + (role === "src" ? " · starting point" : " · translated")));
      var bpm = el("input"); bpm.type = "number"; bpm.min = 30; bpm.max = 300; bpm.value = Math.round(W.data[id].bpm); bpm.className = "sqc-num"; bpm.setAttribute("aria-label", "Tempo");
      bpm.addEventListener("change", function () { W.data[id].bpm = +bpm.value || 120; changed(id); });
      var l = el("label", "sqc-lab", "BPM "); l.appendChild(bpm); h.appendChild(l); box.appendChild(h);
    }
    var B = {};
    B.a960 = function (box, d) {
      var g = el("div", "sqc-960");
      ["A", "B", "C"].forEach(function (row) {
        var r = el("div", "sqc-row"); r.appendChild(el("span", "sqc-rl", "Row " + row + (row === "A" ? " · pitch" : row === "B" ? (d.rowB === "cut" ? " · filter" : " · unused") : (d.rowC ? " · timing" : " · unused"))));
        for (var i = 0; i < 8; i++) (function (i) { r.appendChild(ctlWrap(row, null, knob(d[row][i], 0, 2 * d["x" + row], 0.01, function (v) { d[row][i] = v; changed("a960"); }, "Row " + row + " stage " + (i + 1)))); })(i);
        var xs = el("select"); [1, 2, 4].forEach(function (x) { var o = el("option", null, "X" + x); o.value = x; xs.appendChild(o); }); xs.value = d["x" + row];
        xs.addEventListener("change", function () { d["x" + row] = +xs.value; changed("a960", true); }); r.appendChild(ctlWrap("x" + row, "Range", xs)); g.appendChild(r);
      });
      var mr = el("div", "sqc-row"); mr.appendChild(el("span", "sqc-rl", "Stage"));
      for (var i = 0; i < 8; i++) (function (i) { var s = el("select"); [["n", "Normal"], ["s", "Skip"], ["t", "Stop"]].forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; s.appendChild(e); }); s.value = d.mode[i];
        s.addEventListener("change", function () { d.mode[i] = s.value; changed("a960"); }); var w = ctlWrap("mode", String(i + 1), s); w.classList.add("sqc-stage"); w.dataset.stage = i; mr.appendChild(w); })(i);
      g.appendChild(mr);
      var orow = el("div", "sqc-row");
      orow.appendChild(ctlWrap("rate", "Clock (stages/s)", knob(d.rate, 0.5, 30, 0.01, function (v) { d.rate = v; changed("a960"); }, "Clock")));
      var rc = el("input"); rc.type = "checkbox"; rc.checked = d.rowC; rc.addEventListener("change", function () { d.rowC = rc.checked; changed("a960", true); }); orow.appendChild(ctlWrap("rowC", "3rd row timing", rc));
      var rb = el("select"); [["cut", "Filter"], ["none", "Unused"]].forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; rb.appendChild(e); }); rb.value = d.rowB; rb.addEventListener("change", function () { d.rowB = rb.value; changed("a960", true); });
      orow.appendChild(ctlWrap("rowB", "Row B to", rb));
      var bs = el("input"); bs.type = "number"; bs.className = "sqc-num"; bs.value = d.base; bs.min = 12; bs.max = 96; bs.addEventListener("change", function () { d.base = +bs.value; changed("a960"); });
      orow.appendChild(ctlWrap("base", "0 V = " + nname(d.base), bs)); g.appendChild(orow); box.appendChild(g);
    };
    B.tb303 = function (box, d) {
      var g = el("div", "sqc-303"), st = W.t303 || (W.t303 = { mode: "pitch", cur: 0, oct: 0, acc: false, sl: false });
      var modes = el("div", "sqc-row"); [["pitch", "PITCH MODE"], ["time", "TIME MODE"]].forEach(function (m) { var b = btn(m[1], st.mode === m[0] ? "sqc-on" : "btn-outline-light"); b.addEventListener("click", function () { st.mode = m[0]; st.cur = 0; build(); }); modes.appendChild(b); });
      modes.appendChild(el("span", "sqc-hint", st.mode === "pitch" ? "Press keys in order: each fills the next note. Hold DOWN / UP / ACCENT / SLIDE (toggle) first." : "Press NOTE, TIE or REST sixteen times (no sound in time mode)."));
      g.appendChild(modes);
      var kb = el("div", "sqc-keys"); kb.dataset.ctl = "pitch";
      var names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B", "C"];
      names.forEach(function (n, k) { var b = btn(n, /♯/.test(n) ? "sqc-bk" : "sqc-wk"); b.addEventListener("click", function () { if (st.mode !== "pitch") return; d.pitch[st.cur % 16] = { k: k, oct: st.oct, acc: st.acc, sl: st.sl }; st.cur = (st.cur + 1) % 16; changed("tb303"); preview(48 + k + 12 * st.oct); }); kb.appendChild(b); });
      g.appendChild(kb);
      var fl = el("div", "sqc-row");
      [["oct", "DOWN", -1], ["oct", "UP", 1], ["acc", "ACCENT"], ["sl", "SLIDE"]].forEach(function (f) { var on = f[0] === "oct" ? st.oct === f[2] : st[f[0]]; var b = btn(f[1], on ? "sqc-on" : "btn-outline-light"); b.dataset.ctl = f[0];
        b.addEventListener("click", function () { if (f[0] === "oct") st.oct = st.oct === f[2] ? 0 : f[2]; else st[f[0]] = !st[f[0]]; build(); }); fl.appendChild(b); });
      [["n", "NOTE ♪"], ["t", "TIE ⌒"], ["r", "REST –"]].forEach(function (f) { var b = btn(f[1], "btn-outline-light"); b.dataset.ctl = "time"; b.addEventListener("click", function () { if (st.mode !== "time") return; d.time[st.cur % d.last] = f[0]; st.cur = (st.cur + 1) % d.last; changed("tb303"); }); fl.appendChild(b); });
      var last = el("input"); last.type = "number"; last.min = 1; last.max = 16; last.value = d.last; last.className = "sqc-num"; last.addEventListener("change", function () { d.last = clamp(+last.value || 16, 1, 16); changed("tb303"); });
      fl.appendChild(ctlWrap("last", "Last step", last));
      var tr = el("input"); tr.type = "checkbox"; tr.checked = !!d.trip; tr.addEventListener("change", function () { d.trip = tr.checked; changed("tb303"); }); fl.appendChild(ctlWrap("trip", "Triplet grid (TB-03)", tr));
      g.appendChild(fl);
      // the two memories, side by side
      var tbl = el("table", "sqc-tbl"), np = d.time.slice(0, d.last).filter(function (x) { return x === "n"; }).length;
      var r1 = el("tr"), r2 = el("tr"), r3 = el("tr"); r1.appendChild(el("th", null, "Pitch #")); r2.appendChild(el("th", null, "Pitch")); r3.appendChild(el("th", null, "Time"));
      for (var i = 0; i < 16; i++) (function (i) {
        var p = d.pitch[i], c1 = el("td", null, String(i + 1)), c2 = el("td", (i >= np ? "sqc-dim" : "") + (st.mode === "pitch" && st.cur === i ? " sqc-cur" : ""), names[p.k] + (p.oct ? (p.oct > 0 ? "↑" : "↓") : "") + (p.acc ? " A" : "") + (p.sl ? " S" : ""));
        var c3 = el("td", (i >= d.last ? "sqc-dim" : "") + (st.mode === "time" && st.cur === i ? " sqc-cur" : ""), { n: "♪", t: "⌒", r: "–" }[d.time[i]]);
        c2.dataset.ctl = "pitch"; c3.dataset.ctl = "time"; c2.addEventListener("click", function () { st.mode = "pitch"; st.cur = i; build(); }); c3.addEventListener("click", function () { st.mode = "time"; st.cur = i; build(); });
        r1.appendChild(c1); r2.appendChild(c2); r3.appendChild(c3); })(i);
      tbl.appendChild(r1); tbl.appendChild(r2); tbl.appendChild(r3); g.appendChild(tbl);
      g.appendChild(el("p", "sqc-hint", np + " notes in time mode use the first " + np + " pitches: change the rhythm and the pitches move with it, as on the 303."));
      box.appendChild(g);
    };
    function stepTable(box, id, d, cols, chN) {
      var st = W["t" + id] || (W["t" + id] = { ch: 0, row: 0, col: 0, typed: "" }), g = el("div", "sqc-" + id);
      var chs = el("div", "sqc-row"); chs.dataset.ctl = "ch";
      for (var c = 0; c < chN; c++) (function (c) { var b = btn("CH-" + (c + 1) + (d.ch[c].length ? "" : " ·"), st.ch === c ? "sqc-on" : "btn-outline-light"); b.dataset.ctl = "ch"; b.addEventListener("click", function () { st.ch = c; st.row = 0; build(); }); chs.appendChild(b); })(c);
      g.appendChild(chs);
      var line = d.ch[st.ch], tbl = el("table", "sqc-tbl sqc-steps"), hr = el("tr"); hr.appendChild(el("th", null, "Step"));
      cols.forEach(function (c) { hr.appendChild(el("th", null, c[1])); }); tbl.appendChild(hr);
      line.forEach(function (e, ri) {
        var tr = el("tr", st.row === ri ? "sqc-cur" : ""); tr.appendChild(el("td", null, String(ri + 1)));
        cols.forEach(function (c, ci) {
          var td = el("td"); td.dataset.ctl = c[0];
          if (c[2] === "bool") { var cb = el("input"); cb.type = "checkbox"; cb.checked = !!e[c[0]]; cb.addEventListener("change", function () { e[c[0]] = cb.checked; changed(id); }); td.appendChild(cb); }
          else { var inp = el("input"); inp.type = "number"; inp.className = "sqc-num"; inp.value = e[c[0]] == null ? "" : e[c[0]]; inp.placeholder = "rest";
            inp.addEventListener("focus", function () { st.row = ri; st.col = ci; });
            inp.addEventListener("change", function () { e[c[0]] = inp.value === "" ? null : +inp.value; changed(id); }); td.appendChild(inp);
            if (c[0] === "n" || c[0] === "cv1") td.appendChild(el("span", "sqc-nn", e[c[0]] == null ? "" : nname(c[0] === "cv1" ? e.cv1 + 36 : e.n))); }
          tr.appendChild(td);
        });
        var del = btn("✕", "btn-outline-light sqc-del"); del.setAttribute("aria-label", "Delete step " + (ri + 1)); del.addEventListener("click", function () { line.splice(ri, 1); changed(id); }); var tdd = el("td"); tdd.appendChild(del); tr.appendChild(tdd);
        tbl.appendChild(tr);
      });
      g.appendChild(tbl);
      var add = btn("+ Step", "btn-outline-light"); add.addEventListener("click", function () { var prev = line[line.length - 1]; line.push(prev ? clone(prev) : (id === "mc4" ? { cv1: 24, cv2: 50, st: d.tb / 4, gt: d.tb / 8 } : { n: 48, st: 24, gt: 12, acc: false, po: false })); st.row = line.length - 1; changed(id); });
      g.appendChild(add);
      return { g: g, st: st, line: line };
    }
    B.mc202 = function (box, d) {
      var T = stepTable(box, "mc202", d, [["n", "Pitch (MIDI)"], ["st", "Step time"], ["gt", "Gate time"], ["acc", "Acc", "bool"], ["po", "Porta", "bool"]], 2), g = T.g;
      var keys = el("div", "sqc-row"); keys.appendChild(el("span", "sqc-rl", "STEP keys"));
      [["𝅝", 96], ["𝅗𝅥", 48], ["♩", 24], ["♪", 12], ["𝅘𝅥𝅯", 6], ["♩3", 16], ["♪3", 8]].forEach(function (k) { var b = btn(k[0] + " " + k[1], "btn-outline-light"); b.dataset.ctl = "st"; b.addEventListener("click", function () { var e = T.line[T.st.row]; if (e) { e.st = k[1]; e.gt = Math.max(1, Math.round(k[1] * (W.gate202 || 0.5))); changed("mc202"); } }); keys.appendChild(b); });
      g.appendChild(keys);
      var gk = el("div", "sqc-row"); gk.appendChild(el("span", "sqc-rl", "GATE keys"));
      [["0 REST", 0], ["1 STACC", 0.25], ["2 NONLEG", 0.5], ["3 LEGATO", 0.9], ["4 TIE", 1]].forEach(function (k) { var b = btn(k[0], "btn-outline-light"); b.dataset.ctl = "gt"; b.addEventListener("click", function () { var e = T.line[T.st.row]; if (e) { W.gate202 = k[1]; e.gt = Math.round(e.st * k[1]); if (!k[1]) e.n = null; changed("mc202"); } }); gk.appendChild(b); });
      g.appendChild(gk); g.appendChild(el("p", "sqc-hint", "Quarter = 24 (MC-202 manual p. 16). The gate keys' lengths here (¼, ½, 0.9, whole) are this page's own; the manual's table did not scan cleanly. Accent works on channel 1 only."));
      box.appendChild(g);
    };
    B.mc4 = function (box, d) {
      var T = stepTable(box, "mc4", d, [["cv1", "CV-1"], ["cv2", "CV-2"], ["st", "Step"], ["gt", "Gate"]], 4), g = T.g, st = T.st;
      var disp = el("div", "sqc-lcd"); disp.textContent = "TB " + d.tb + "  " + (T.line[st.row] ? T.line[st.row].st + " " + T.line[st.row].gt : "--") + "   CH" + (st.ch + 1) + " ST" + (st.row + 1) + " " + ["CV1", "CV2", "STEP", "GATE"][st.col || 0] + " " + (st.typed || "");
      g.insertBefore(disp, g.firstChild);
      var pad = el("div", "sqc-pad");
      "7 8 9 4 5 6 1 2 3 0 ← ENTER".split(" ").forEach(function (k) { var b = btn(k, "btn-outline-light"); b.dataset.ctl = "cv1"; b.addEventListener("click", function () {
        if (k === "←") st.typed = st.typed.slice(0, -1);
        else if (k === "ENTER") { var e = T.line[st.row]; if (e && st.typed !== "") { e[["cv1", "cv2", "st", "gt"][st.col || 0]] = +st.typed; } st.typed = ""; st.row = Math.min(T.line.length - 1, st.row + 1); changed("mc4"); return; }
        else st.typed = (st.typed + k).slice(-4);
        build(); }); pad.appendChild(b); });
      var colSel = el("select"); ["CV-1", "CV-2", "STEP TIME", "GATE TIME"].forEach(function (n, i) { var o = el("option", null, n); o.value = i; colSel.appendChild(o); }); colSel.value = st.col || 0; colSel.addEventListener("change", function () { st.col = +colSel.value; st.row = 0; build(); });
      var row = el("div", "sqc-row"); row.appendChild(ctlWrap("cv1", "Memory (SHIFT 1-4)", colSel)); row.appendChild(pad);
      var tb = el("select"); [120, 96, 48, 24].forEach(function (x) { var o = el("option", null, "TB " + x); o.value = x; tb.appendChild(o); }); tb.value = d.tb;
      tb.addEventListener("change", function () { var f = +tb.value / d.tb; d.ch.forEach(function (L) { L.forEach(function (e) { e.st = Math.round(e.st * f); e.gt = Math.round(e.gt * f); }); }); d.tb = +tb.value; changed("mc4"); }); row.appendChild(ctlWrap("tb", "Time base", tb));
      var c2 = el("select"); [["cut", "CV-2 → filter"], ["vel", "CV-2 → VCA"]].forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; c2.appendChild(e); }); c2.value = d.cv2; c2.addEventListener("change", function () { d.cv2 = c2.value; changed("mc4"); }); row.appendChild(ctlWrap("cv2", "Patch", c2));
      g.insertBefore(row, g.children[1]);
      g.appendChild(el("p", "sqc-hint", "Type the numbers as on the MC-4: a whole memory at a time (all CV-1, then all step times …), ENTER after each. Middle C is 24; at TB 120 a 16th is 30 (MC-4 manual pp. 9-10). Gate 0 = rest is this page's reading."));
      box.appendChild(g);
    };
    B.elektron = function (box, d) {
      var st = W.tel || (W.tel = { sel: null, page: 0 }), g = el("div", "sqc-el");
      var top2 = el("div", "sqc-row");
      var steps = el("input"); steps.type = "number"; steps.min = 2; steps.max = 64; steps.value = d.steps; steps.className = "sqc-num"; steps.addEventListener("change", function () { var n = clamp(+steps.value || 16, 2, 64); while (d.trigs.length < n) d.trigs.push(null); d.trigs.length = n; d.steps = n; changed("elektron"); });
      top2.appendChild(ctlWrap("steps", "Length", steps));
      var sp = el("select"); [[0.125, "1/8X"], [0.25, "1/4X"], [0.5, "1/2X"], [0.75, "3/4X"], [1, "1X"], [1.5, "3/2X"], [2, "2X"]].forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; sp.appendChild(e); }); sp.value = d.speed; sp.addEventListener("change", function () { d.speed = +sp.value; changed("elektron"); });
      top2.appendChild(ctlWrap("speed", "Speed", sp));
      top2.appendChild(ctlWrap("swing", "Swing %", knob(d.swing, 50, 80, 1, function (v) { d.swing = v; changed("elektron"); }, "Swing")));
      var lp = el("input"); lp.type = "number"; lp.min = 1; lp.max = 16; lp.value = d.loop; lp.className = "sqc-num"; lp.addEventListener("change", function () { d.loop = clamp(+lp.value || 1, 1, 16); changed("elektron"); }); top2.appendChild(ctlWrap("loop", "Loop shown", lp));
      var fi = el("input"); fi.type = "checkbox"; fi.checked = !!d.fill; fi.addEventListener("change", function () { d.fill = fi.checked; changed("elektron"); }); top2.appendChild(ctlWrap("fill", "FILL", fi));
      g.appendChild(top2);
      var pages = Math.ceil(d.steps / 16); if (st.page >= pages) st.page = 0;
      if (pages > 1) { var pr = el("div", "sqc-row"); for (var p = 0; p < pages; p++) (function (p) { var b = btn("Page " + (p + 1), st.page === p ? "sqc-on" : "btn-outline-light"); b.addEventListener("click", function () { st.page = p; build(); }); pr.appendChild(b); })(p); g.appendChild(pr); }
      var grid = el("div", "sqc-trigs");
      for (var i = st.page * 16; i < Math.min(d.steps, st.page * 16 + 16); i++) (function (i) {
        var t = d.trigs[i], b = el("button", "sqc-trig" + (t ? (t.type === "n" ? " sqc-note" : " sqc-lock") : "") + (t && hasLock(t) ? " sqc-locked" : "") + (st.sel === i ? " sqc-sel" : ""), String(i + 1));
        b.type = "button"; b.dataset.ctl = "trig"; b.dataset.step = i; b.title = "Click: note trig on / off. Shift-click: lock trig. Alt-click or right-click: select it to lock parameters.";
        b.addEventListener("click", function (e) {
          if (e.altKey) { st.sel = i; build(); return; }
          if (e.shiftKey) d.trigs[i] = d.trigs[i] && d.trigs[i].type === "l" ? null : { type: "l", cut: 0.5 };
          else d.trigs[i] = d.trigs[i] ? null : { type: "n" };
          st.sel = d.trigs[i] ? i : null; changed("elektron");
        });
        b.addEventListener("contextmenu", function (e) { e.preventDefault(); st.sel = i; build(); });
        grid.appendChild(b); })(i);
      g.appendChild(grid);
      var tp = el("div", "sqc-row sqc-trigpage"), t = st.sel != null ? d.trigs[st.sel] : null;
      tp.appendChild(el("span", "sqc-rl", t ? "Trig " + (st.sel + 1) + (t.type === "l" ? " (lock trig)" : "") + ": locks" : "TRIG page (defaults)"));
      function lockKnob(key, label, min, max, step, dflt) {
        var tgt = t || d.def, has = t ? t[key] != null : true, v = has ? tgt[key] : (d.def[key] != null ? d.def[key] : dflt);
        var w = ctlWrap(key, label, knob(v == null ? dflt : v, min, max, step, function (x) { if (t) t[key] = x; else d.def[key] = x; changed("elektron"); }, label));
        if (t && has) w.classList.add("sqc-lk"); tp.appendChild(w);
      }
      if (!t || t.type === "n") { lockKnob("note", "NOTE", 24, 96, 1, 48); lockKnob("vel", "VEL", 1, 127, 1, 100); lockKnob("len", "LEN (steps)", 0.1, 8, 0.05, 1); }
      if (t) {
        lockKnob("cut", "Filter (p-lock)", 0, 1, 0.01, 0.5);
        if (t.type === "n") {
          lockKnob("micro", "Micro (1/24)", -23, 23, 1, 0); lockKnob("prob", "PROB %", 0, 100, 1, 100);
          var cs = el("select"); ["", "1:2", "2:2", "1:4", "2:4", "3:4", "4:4", "!1:2", "1ST", "!1ST", "PRE", "!PRE", "NEI", "!NEI", "LST", "!LST", "FILL", "!FILL"].forEach(function (c) { var o = el("option", null, c || "(none)"); o.value = c; cs.appendChild(o); });
          cs.value = t.cond || ""; cs.addEventListener("change", function () { t.cond = cs.value || null; if (t.cond === "FILL") { t.cond = null; t.fill = true; } else if (t.cond === "!FILL") { t.cond = null; t.fill = false; } changed("elektron"); });
          var cw = ctlWrap("cond", "COND", cs); if (t.cond || t.fill != null) cw.classList.add("sqc-lk"); tp.appendChild(cw);
          var pc = el("input"); pc.type = "checkbox"; pc.checked = !!t.porta; pc.addEventListener("change", function () { t.porta = pc.checked; changed("elektron"); }); var pw = ctlWrap("porta", "Portamento", pc); if (t.porta) pw.classList.add("sqc-lk"); tp.appendChild(pw);
        }
        var cl = btn("Clear locks", "btn-outline-light"); cl.addEventListener("click", function () { d.trigs[st.sel] = { type: t.type }; changed("elektron"); }); tp.appendChild(cl);
      }
      g.appendChild(tp);
      g.appendChild(el("p", "sqc-hint", "Red = note trig, yellow = lock trig, ringed = holds parameter locks (Digitakt II manual pp. 41, 47). Alt-click (or right-click) a trig to select it and turn knobs to lock them on that trig only."));
      box.appendChild(g);
    };
    function hasLock(t) { return ["note", "vel", "len", "cut", "micro", "cond", "prob", "fill", "porta"].some(function (k) { return t[k] != null && t[k] !== false; }); }

    // ----- state, translation, drawing -----
    var lastT = null, handTo = false;
    function retranslate() { lastT = SQ.translate(W.src, W.dst, W.data[W.src]); W.data[W.dst] = lastT.data; W.notes = lastT.notes; handTo = false; }
    function changed(id, rebuild) {
      if (id === W.src) retranslate(); else handTo = true;
      render();
    }
    W.changed = changed;
    function build() { render(); }
    function render() {
      srcSel.value = W.src; dstSel.value = W.dst;
      bA.textContent = "▶ " + MACHINES[W.src].name; bB.textContent = "▶ " + MACHINES[W.dst].name; bAB.textContent = "▶ " + MACHINES[W.src].name + ", then " + MACHINES[W.dst].name;
      bExp.textContent = "⤓ Export " + MACHINES[W.src].name;
      head(pSrc, W.src, "src"); B[W.src](pSrc, W.data[W.src]);
      head(pDst, W.dst, "dst"); B[W.dst](pDst, W.data[W.dst]); if (handTo) pDst.classList.add("sqc-hand");
      // report
      rep.innerHTML = ""; var h = el("h3", "sqc-rh", MACHINES[W.src].name + " → " + MACHINES[W.dst].name + (handTo ? " (the translated panel was changed by hand)" : "")); rep.appendChild(h);
      var ul = el("ul", "sqc-items");
      (W.notes || []).forEach(function (n) {
        var li = el("li", "sqc-item sqc-" + n.cls); li.appendChild(el("span", "sqc-tag sqc-t-" + n.cls, { exact: "the same", approx: "close", lost: "lost" }[n.cls]));
        li.appendChild(el("b", null, " " + n.what + ". ")); li.appendChild(document.createTextNode(n.why + " "));
        li.appendChild(el("span", "sqc-cite", "(" + n.cite.map(function (c) { return c.book === "PAGE" ? "page's own" : c.book + (c.page != null ? " p. " + c.page : ""); }).join("; ") + ")"));
        li.addEventListener("mouseenter", function () { light(n, true); }); li.addEventListener("mouseleave", function () { light(n, false); });
        li.addEventListener("focus", function () { light(n, true); }); li.tabIndex = 0; ul.appendChild(li);
      });
      rep.appendChild(ul);
      // outlines on controls
      [[pSrc, "from"], [pDst, "to"]].forEach(function (p) { (W.notes || []).forEach(function (n) { n.ctl[p[1]].forEach(function (k) { p[0].querySelectorAll('[data-ctl="' + k + '"]').forEach(function (e) {
        var rank = { exact: 1, approx: 2, lost: 3 }, cur = e.dataset.cls; if (!cur || rank[n.cls] > rank[cur]) { e.dataset.cls = n.cls; e.classList.remove("sqc-exact", "sqc-approx", "sqc-lost"); e.classList.add("sqc-" + n.cls); } }); }); }); });
      draw();
    }
    function light(n, on) { [[pSrc, "from"], [pDst, "to"]].forEach(function (p) { n.ctl[p[1]].forEach(function (k) { p[0].querySelectorAll('[data-ctl="' + k + '"]').forEach(function (e) { e.classList.toggle("sqc-hl", on); }); }); }); }
    function draw(playT) {
      var cs = toCanon(W.src, W.data[W.src]), cd = toCanon(W.dst, W.data[W.dst]), all = {};
      all[W.src] = cs; all[W.dst] = cd;
      fRoll.firstChild.innerHTML = SQ.rollSVG(cs, cd, W.src, W.dst, playT);
      fGrid.firstChild.innerHTML = SQ.gridSVG(all);
      fLanes.firstChild.innerHTML = '<div class="sqc-lt">' + MACHINES[W.src].name + "</div>" + SQ.lanesSVG(cs, W.src) + '<div class="sqc-lt">' + MACHINES[W.dst].name + "</div>" + SQ.lanesSVG(cd, W.dst);
    }
    // ----- playback: each machine's own events (already at its own resolution), two loops -----
    function stop() { W.timers.forEach(clearTimeout); W.timers = []; voices.forEach(function (v) { v.port.postMessage({ type: "clear" }); v.port.postMessage({ type: "off", at: 0 }); }); W.playing = null; [bA, bB, bAB].forEach(function (b) { b.classList.remove("sqc-on"); }); }
    function schedule(id, t0, loops) {
      var d = W.data[id], spb = 60 / d.bpm, end = t0;
      for (var lp = 0; lp < loops; lp++) {
        var dd = d; if (id === "elektron") { dd = clone(d); dd.loop = (d.loop || 1) + lp; }
        var c = toCanon(id, dd), base = t0 + lp * c.len / TPQ * spb;
        c.lines.slice(0, 4).forEach(function (L, ch) {
          L.forEach(function (n, i) {
            var on = base + n.t / TPQ * spb, off = on + n.len / TPQ * spb, prev = L[i - 1];
            if (n.cut != null) voices[ch].port.postMessage({ type: "cut", at: on - 0.001, v: n.cut });
            voices[ch].port.postMessage({ type: "on", at: on, note: n.note, vel: n.vel, accent: n.accent, legato: !!(prev && prev.slide) });
            if (!n.slide || i === L.length - 1) voices[ch].port.postMessage({ type: "off", at: off });
          });
        });
        if (id !== "elektron" || !c.cutPts.length) {} else c.cutPts.forEach(function (p) { voices[0].port.postMessage({ type: "cut", at: base + p.t / TPQ * spb, v: p.v }); });
        end = base + c.len / TPQ * spb;
        if (c.loopless) break;
      }
      return end;
    }
    function play(ids) {
      stop();
      return audio().then(function () {
        if (ctx.state === "suspended") ctx.resume(); sendP();
        var t = ctx.currentTime + 0.08, t0 = t; W.playing = ids.slice();
        ids.forEach(function (id) { var e = schedule(id, t, 2); t = e + 0.4; });
        var total = (t - t0) * 1000, start = performance.now();
        (function tick() { if (!W.playing) return; var el_ = (performance.now() - start) / 1000; draw(el_ * W.data[ids[0]].bpm / 60 * TPQ); if (el_ * 1000 < total) W.timers.push(setTimeout(tick, 120)); else stop(); })();
      });
    }
    W.play = function (which) { var ids = which === "src" ? [W.src] : which === "dst" ? [W.dst] : [W.src, W.dst]; return play(ids); };
    W.stop = stop;
    W.analyser = function () { return ana; };
    W.load = function (exId) {
      var ex = EX.filter(function (x) { return x.id === exId; })[0]; if (!ex) return; exSel.value = ex.id;
      W.src = ex.from; W.dst = ex.to; W.data[ex.from] = Object.assign(blank(ex.from), clone(ex.d)); W.t303 = W.tmc202 = W.tmc4 = W.tel = null;
      say.textContent = ex.say; retranslate(); render();
    };
    W.set = function (machine, data) { W.data[machine] = Object.assign(blank(machine), data); if (machine === W.src) retranslate(); render(); };
    W.exportJSON = function () { return SQ.exportJSON(W.src, W.data[W.src], { song: song.value, artist: artist.value, source: { url: surl.value, title: W.meta.source.title || "", channel: W.meta.source.channel || "", at: sat.value } }); };
    W.importJSON = function (o) { var r = SQ.importJSON(o); W.src = r.machine; if (W.dst === W.src) W.dst = ORDER[(ORDER.indexOf(W.src) + 1) % 5]; W.data[r.machine] = r.data; song.value = r.song; artist.value = r.artist; surl.value = r.source.url || ""; sat.value = r.source.at || ""; W.meta.source = r.source; say.textContent = "Loaded " + (r.song || "a line") + (r.artist ? " (" + r.artist + ")" : "") + "."; retranslate(); render(); return r; };
    W.swap = function () { var s = W.src; W.src = W.dst; W.dst = s; retranslate(); render(); };
    function preview(note) { audio().then(function () { if (ctx.state === "suspended") ctx.resume(); sendP(); var t = ctx.currentTime + 0.02; voices[0].port.postMessage({ type: "on", at: t, note: note, vel: 0.7 }); voices[0].port.postMessage({ type: "off", at: t + 0.18 }); }); }

    exSel.addEventListener("change", function () { W.load(exSel.value); });
    swap.addEventListener("click", W.swap);
    bA.addEventListener("click", function () { W.play("src"); bA.classList.add("sqc-on"); });
    bB.addEventListener("click", function () { W.play("dst"); bB.classList.add("sqc-on"); });
    bAB.addEventListener("click", function () { W.play("ab"); bAB.classList.add("sqc-on"); });
    bStop.addEventListener("click", stop);
    bExp.addEventListener("click", function () {
      var o = W.exportJSON(), blob = new Blob([JSON.stringify(o, null, 1)], { type: "application/json" }), a = el("a");
      a.href = URL.createObjectURL(blob); a.download = (o.song || "sequence").replace(/[^\w-]+/g, "-").toLowerCase() + "-" + o.machine + ".json"; document.body.appendChild(a); a.click(); a.remove();
    });
    bImp.addEventListener("click", function () { fin.click(); });
    fin.addEventListener("change", function () { var f = fin.files[0]; if (!f) return; f.text().then(function (s) { try { W.importJSON(JSON.parse(s)); } catch (e) { say.textContent = "Could not read that file: " + e.message; } }); fin.value = ""; });
    // assignments
    var aurl = host.getAttribute("data-assignments") || "/apps/shared/data/sequences/assignments.json";
    if (global.fetch) fetch(aurl).then(function (r) { return r.json(); }).then(function (A) {
      asg.innerHTML = ""; asg.appendChild(el("h3", "sqc-rh", "Rebuild a line from a video"));
      asg.appendChild(el("p", "sqc-hint", "Pick a video, choose that machine under From, rebuild the line by ear, fill in Song / Artist / Video URL / At, and Export. Videos checked to exist on " + A.checked + "; whether each matches the record is not checked."));
      ORDER.forEach(function (id) {
        var list = A.machines[id] || []; if (!list.length) return;
        var dl = el("div", "sqc-alist"); dl.appendChild(el("b", null, MACHINES[id].name + ": "));
        var ul = el("ul"); list.forEach(function (v) { var li = el("li"), a = el("a", null, v.song + " (" + v.artist + ")"); a.href = v.url; a.target = "_blank"; a.rel = "noopener";
          li.appendChild(a); li.appendChild(document.createTextNode(" · " + v.channel + " ↗ "));
          var use = btn("Use", "btn-outline-secondary sqc-use"); use.addEventListener("click", function () { W.src = id; if (W.dst === id) W.dst = ORDER[(ORDER.indexOf(id) + 1) % 5]; W.data[id] = blank(id); song.value = v.song; artist.value = v.artist; surl.value = v.url; W.meta.source = { url: v.url, title: v.title, channel: v.channel }; say.textContent = "Blank " + MACHINES[id].name + ": rebuild " + v.song + " from the video, then Export."; retranslate(); render(); });
          li.appendChild(use); ul.appendChild(li); });
        dl.appendChild(ul); asg.appendChild(dl);
      });
    }).catch(function () {});
    W.load(EX[0].id);
    SQ.widgets.push(W);
    return W;
  };

  if (typeof document !== "undefined") {
    var go = function () { Array.prototype.forEach.call(document.querySelectorAll(".sqc"), function (h) { if (!h.dataset.built) { h.dataset.built = "1"; SQ.mount(h); } }); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
  global.SequencerCompare = SQ;
  if (typeof module !== "undefined" && module.exports) module.exports = SQ;
})(typeof window !== "undefined" ? window : globalThis);
