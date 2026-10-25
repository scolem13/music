// sing-notate.js — the matching and grading behind lessons/sing-and-notate.qmd. Plain script, one global (SingNotate);
// loads in Node for tests. Needs abc-core.js and abc-events.js loaded first.
//
// The idea: the student sings one two-bar idea three times. We assume it is built from the site's FAMILIAR RHYTHM PATTERNS
// (apps/rhythms/rhythm-pattern-object.js, the Rhythm Sequences / rhythm assessment bank) and FAMILIAR TONAL PATTERNS
// (apps/patterns/pattern-object.js, the Tonal Patterns assessment bank). Neither bank is copied here: every function takes the
// loaded object (the page's `rhythmPatternObject` / `patternObject`; a test evals the file's text), so edits there are inherited.
//
//   Candidates are filtered BEFORE scoring, by what the student chose:
//     SingNotate.tonalPatterns(patternObject, modeName) -> [{ id, key, degrees:[semitones above the tonic], label }]   only that tonality
//     SingNotate.modesIn(patternObject)                 -> the tonalities the bank covers: ["major","minor","dorian","mixolydian",...]
//     SingNotate.rhythmBars(rhythmObject, "4/4")        -> [{ id, events:[{on,dur,rest}], onsets }]   only bars of that meter
//                                                          (4/4 may also be built from two 2/4 bars)
//     SingNotate.rhythmCandidates(bars, barQ)           -> every two-bar rhythm (bar x bar), duplicates removed
//   The singing:
//     SingNotate.segmentNotes(frames) -> notes   frames [{t sec, hz, rms}] (PitchDetect.mic's onFrame) -> [{ t, dur, midi }]
//     SingNotate.takeFromNotes(notes, { secPerQuarter, t0 }) -> a take { notes:[{ q, midi }] }, q = quarters after bar 1's downbeat
//     SingNotate.combine(takes, key) -> { notes:[{ q, semis, support }], agreement }   quantised to 1/4 quarter, merged across takes
//     SingNotate.match(combined, rhythmCands, tonalPats, o) -> { ok, reason, best, runnersUp, ... }
//   The notating:
//     SingNotate.blankAbc({ meter, key, title }) -> a two-bar doc of x rests, no notes
//     SingNotate.compare(best, abc, key) -> { rhythm: bool, pitch: bool }       (the written ABC against the detected answer)
//     SingNotate.checker(best, key, from).update(abc)  (from: the quarter where the sung bars start in abc, default 0) -> { rhythm, pitch, newly:[], message }   "Rhythm correct" once, "Pitches correct"
//        once, and ONE combined message when both come right on the same change.
(function (global) {
  "use strict";
  const Core = global.AbcCore || (typeof require === "function" ? require("./abc-core.js") : null);
  const Events = global.AbcEvents || (typeof require === "function" ? require("./abc-events.js") : null);
  if (!Core || !Events) throw new Error("sing-notate.js needs abc-core.js and abc-events.js loaded before it");

  const GRID = 0.25;          // quarters: onsets are quantised to a sixteenth
  const ONSET_TOL = 0.3;      // a sung onset and a pattern onset are "the same" when this close, in quarters (lenient: singers drag and rush)
  const PITCH_TOL = 0.6;       // semitones, after the singer's own tuning drift is removed
  const THRESHOLD = { rhythm: 0.66, tonal: 0.66, combined: 0.7, agreement: 0.5 };
  const SEG_COST = 0.15;      // each extra tonal pattern costs this many notes: prefer a few long familiar patterns

  const norm = (x, m) => ((x % m) + m) % m;
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };

  // ---------- keys ----------
  const MODE_NAMES = { "": "major", maj: "major", major: "major", ion: "major", ionian: "major", m: "minor", min: "minor", minor: "minor", aeo: "minor", aeolian: "minor",
    dor: "dorian", dorian: "dorian", mix: "mixolydian", mixolydian: "mixolydian", lyd: "lydian", lydian: "lydian", phr: "phrygian", phrygian: "phrygian", loc: "locrian", locrian: "locrian" };
  const MODE_SUFFIX = { major: "", minor: "m", dorian: "dor", mixolydian: "mix", lydian: "lyd", phrygian: "phr", locrian: "loc" };
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // "D", "Dm", "Ddor", "Bb", "C)" -> { tonic:"D", pc, mode, key:"Dm", ksig }
  function parseKey(k) {
    const m = /^\s*([A-Ga-g])([#b♯♭]?)\s*([A-Za-z]*)/.exec(String(k || "")); if (!m) return null;
    const tonic = m[1].toUpperCase() + m[2].replace("♯", "#").replace("♭", "b");
    const mode = MODE_NAMES[m[3].toLowerCase()]; if (!mode) return null;
    const pc = norm(LETTER_PC[m[1].toUpperCase()] + (/[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0), 12);
    const key = tonic + MODE_SUFFIX[mode];
    return { tonic, pc, mode, key, ksig: Core.keyAccidentals(key) };
  }
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10] };
  const keyName = (tonic, mode) => tonic + (MODE_SUFFIX[mode] || "");

  // ---------- the familiar tonal patterns ----------
  const tunes = obj => Object.keys(obj).reduce((all, k) => all.concat(String(obj[k]).split(/\n(?=X:)/).filter(t => /^X:/.test(t.trim())).map(t => ({ coll: k, abc: t }))), []);
  function tonalAll(patternObject) {
    const out = [], seen = {};
    tunes(patternObject).forEach((t, n) => {
      const km = /^K:\s*(.+)$/m.exec(t.abc); const key = km && parseKey(km[1]); if (!key) return;
      const body = Core.musicText(t.abc.replace(/\[V:[^\]]*\]/g, ""), /^[A-Za-z]:|^%|^w:/);
      const toks = Core.tokens(body).filter(x => x.t === "note"), acc = {};
      const midis = toks.map(tok => Core.noteMidi(tok, key.ksig, acc));
      if (midis.length < 2) return;
      const degrees = midis.map(x => x - key.pc - 60);
      const wm = /^w:\s*(.*)$/m.exec(t.abc), sig = key.mode + ":" + degrees.join(",");
      if (seen[sig]) return; seen[sig] = 1;
      out.push({ id: t.coll + "#" + (n), coll: t.coll, key: key.key, mode: key.mode, degrees, label: wm ? wm[1].trim() : degrees.join(" ") });
    });
    return out;
  }
  const tonalPatterns = (patternObject, mode) => tonalAll(patternObject).filter(p => p.mode === (MODE_NAMES[String(mode).toLowerCase()] || mode));
  const modesIn = patternObject => { const o = {}; tonalAll(patternObject).forEach(p => { o[p.mode] = 1; }); return Object.keys(o); };

  // ---------- the familiar rhythm patterns ----------
  const meterKey = s => String(s || "").replace(/\s+/g, "");
  const beatOf = m => { const p = meterKey(m).split("/"); return +p[1] === 8 && +p[0] % 3 === 0 ? 1.5 : 4 / +p[1]; };   // the macrobeat, in quarters
  const meterQuarters = m => { const p = meterKey(m).split("/"); return (+p[0] / +p[1]) * 4; };
  function rhythmBarsAll(rhythmObject) {
    const out = [], seen = {};
    // the sets copied from the MLT books (DMTI, JRI, Mullen; apps/rhythms/rhythm-pattern-object.js) are practice sets, not part of this familiar bank:
    // their sixteenths, swing and ties would multiply the two-bar candidates
    tunes(rhythmObject).filter(t => !/^(dmti[123]-|jri-recorder-|musicplay-|mullen-)/.test(t.coll)).forEach(t => {
      const mm = /^M:\s*(\d+\s*\/\s*\d+)/m.exec(t.abc); if (!mm) return;
      const meter = meterKey(mm[1]); let ev;
      try { ev = Events.fromAbc(t.abc); } catch (e) { return; }
      const barQ = meterQuarters(meter), byBar = {};
      ev.written.forEach(e => { const b = Math.floor(e.t_on / barQ + 1e-6); (byBar[b] = byBar[b] || []).push(e); });
      Object.keys(byBar).forEach(b => {
        const es = byBar[b].map(e => ({ on: Math.round((e.t_on - b * barQ) * 1000) / 1000, dur: Math.round((e.t_off - e.t_on) * 1000) / 1000, rest: e.kind === "rest" }));
        const end = es.reduce((s, e) => Math.max(s, e.on + e.dur), 0);
        if (Math.abs(end - barQ) > 0.01 || es[0].on > 0.001) return;      // only whole bars
        const sig = meter + ":" + es.map(e => (e.rest ? "r" : "n") + e.on + "/" + e.dur).join(",");
        if (seen[sig]) return; seen[sig] = 1;
        out.push({ id: t.coll + "#" + b, coll: t.coll, meter, barQ, events: es, onsets: es.filter(e => !e.rest).map(e => e.on) });
      });
    });
    return out;
  }
  const HALVES = { "4/4": "2/4", "2/2": "2/4" };       // a 4-quarter bar can also be two familiar 2/4 bars
  // macrobeats and their elongations: a bar split into notes of whole beats (B2 B2 in 2/4 halves, B4 in 4/4, B6 in 6/8 ...),
  // which the bank's bars only hold beat by beat
  function beatBars(meter) {
    const barQ = meterQuarters(meter), beat = beatOf(meter);
    const n = Math.round(barQ / beat), out = [];
    if (Math.abs(n * beat - barQ) > 1e-6 || n > 6) return out;
    (function parts(left, acc) {
      if (!left) { let on = 0; const events = acc.map(k => { const e = { on: on, dur: k * beat, rest: false }; on += k * beat; return e; });
        out.push({ id: "beats:" + acc.join("+"), coll: "macrobeat elongation", meter: meterKey(meter), barQ, events, onsets: events.map(e => e.on) }); return; }
      for (let k = 1; k <= left; k++) parts(left - k, acc.concat([k]));
    })(n, []);
    return out;
  }
  function rhythmBars(rhythmObject, meter) {
    meter = meterKey(meter);
    const all = rhythmBarsAll(rhythmObject), bars = all.filter(b => b.meter === meter);
    { const seen0 = {}; bars.forEach(b => { seen0[b.events.map(e => e.on + "/" + e.dur + e.rest).join()] = 1; });
      beatBars(meter).forEach(b => { const sg = b.events.map(e => e.on + "/" + e.dur + e.rest).join(); if (!seen0[sg]) { seen0[sg] = 1; bars.push(b); } }); }
    if (HALVES[meter]) {
      const halves = all.filter(b => b.meter === HALVES[meter]), barQ = meterQuarters(meter), seen = {};
      bars.forEach(b => { seen[b.events.map(e => e.on + "/" + e.dur + e.rest).join()] = 1; });
      halves.forEach((a, i) => halves.forEach((c, j) => {
        const events = a.events.concat(c.events.map(e => ({ on: e.on + a.barQ, dur: e.dur, rest: e.rest })));
        const sig = events.map(e => e.on + "/" + e.dur + e.rest).join(); if (seen[sig]) return; seen[sig] = 1;
        bars.push({ id: a.id + "+" + c.id, coll: a.coll, meter, barQ, events, onsets: events.filter(e => !e.rest).map(e => e.on) });
      }));
    }
    return bars;
  }
  function rhythmCandidates(bars, barQ) {
    const out = [], seen = {};
    bars.forEach(a => bars.forEach(b => {
      const events = a.events.concat(b.events.map(e => ({ on: e.on + barQ, dur: e.dur, rest: e.rest })));
      const sig = events.map(e => e.on + "/" + e.dur + (e.rest ? "r" : "")).join(); if (seen[sig]) return; seen[sig] = 1;
      out.push({ id: a.id + " | " + b.id, events, onsets: events.filter(e => !e.rest).map(e => e.on), rests: events.filter(e => e.rest).length });
    }));
    // same onsets, different rests: the one with fewest rests first (a sung line is usually joined up)
    return out.sort((x, y) => x.rests - y.rests);
  }

  // ---------- from the microphone ----------
  // frames: [{ t (sec), hz (-1/0 = none), rms }] -> notes. A note starts after silence, on a pitch that moves away and stays away,
  // or when the level jumps again (the same pitch sung twice: "da da").
  function segmentNotes(frames, o) {
    o = o || {}; const gap = o.gap || 0.08, minDur = o.minDur || 0.09, jump = o.jump || 0.8, rise = o.rise || 2.2;
    const notes = []; let cur = null, lastVoiced = -1e9, away = [], recent = [];
    const close = end => { if (!cur) return; cur.dur = Math.max(0.01, (end != null ? end : cur.last) - cur.t + 0.04); cur.midi = median(cur.m); notes.push(cur); cur = null; };
    frames.forEach(f => {
      const voiced = f.hz > 0, midi = voiced ? 69 + 12 * Math.log2(f.hz / 440) : null;
      if (!voiced) { if (cur && f.t - lastVoiced >= gap) close(lastVoiced); recent = []; away = []; return; }
      const reA = recent.length >= 2 && f.rms > rise * Math.min.apply(null, recent) && recent[recent.length - 1] < f.rms * 0.7;
      recent.push(f.rms); if (recent.length > 3) recent.shift();
      if (!cur || f.t - lastVoiced >= gap) { close(lastVoiced); cur = { t: f.t, m: [midi], last: f.t }; away = []; lastVoiced = f.t; return; }
      lastVoiced = f.t;
      const ref = median(cur.m.slice(-5));
      if (Math.abs(midi - ref) > jump) { away.push(midi); } else away = [];
      if (away.length >= 3 && Math.max.apply(null, away) - Math.min.apply(null, away) < jump * 1.5) {
        const t0 = f.t - 0.04 * (away.length - 1), end = t0 - 0.04; cur.last = Math.max(cur.t, end); close(cur.last);
        cur = { t: t0, m: away.slice(), last: f.t }; away = []; return;
      }
      if (reA && cur.m.length >= 3) { close(f.t - 0.04); cur = { t: f.t, m: [midi], last: f.t }; away = []; return; }
      cur.m.push(midi); cur.last = f.t;
    });
    close(); return notes.filter(n => n.dur >= minDur);
  }
  // seconds -> quarters after bar 1's downbeat. t0 = the clock time of that downbeat, secPerQuarter from the tempo.
  const takeFromNotes = (notes, o) => ({ notes: notes.map(n => ({ q: (n.t - o.t0) / o.secPerQuarter, midi: n.midi })).filter(n => n.q > -0.4) });

  // ---------- three takes -> one ----------
  // Each take's notes are put on the 1/4-quarter grid and the singer's own tuning drift (median cents off the nearest semitone) is removed.
  // A note counts when it appears in at least 2 of the takes (all of them when only 2 were sung), merged within one grid step.
  function combine(takes, key, o) {
    o = o || {}; const k = typeof key === "object" ? key : parseKey(key), pc = k.pc, span = o.span || 1e9;
    const scale = SCALES[k.mode] || SCALES.major;
    // drift: how far off the chosen tonality's scale the take sits, as a median (a singer 60 cents sharp throughout is still in key)
    const offScale = m => { const x = m - pc; let best = 9; for (let o2 = -1; o2 <= 1; o2++) scale.forEach(d => { const e = x - (Math.floor(x / 12) + o2) * 12 - d; if (Math.abs(e) < Math.abs(best)) best = e; }); return best; };
    const prepared = takes.map(tk => {
      const drift = Math.max(-0.35, Math.min(0.35, median(tk.notes.map(n => offScale(n.midi)))));   // drift + PITCH_TOL stay under a semitone: a note a half step off the key never counts
      const seen = {};
      return tk.notes.map(n => ({ q: Math.max(0, Math.round(n.q / GRID) * GRID), semis: n.midi - drift - pc - 60 })).filter(n => n.q < span)
        .filter(n => !seen[n.q] && (seen[n.q] = 1));
    });
    const all = []; prepared.forEach((tk, ti) => tk.forEach(n => all.push({ q: n.q, semis: n.semis, take: ti })));
    all.sort((a, b) => a.q - b.q || a.take - b.take);
    const clusters = []; let c = null;
    all.forEach(n => {
      if (c && n.q - c.lastQ <= GRID + 1e-9 && !c.takes[n.take]) { c.items.push(n); c.takes[n.take] = 1; c.lastQ = n.q; }
      else { c = { items: [n], takes: { [n.take]: 1 }, lastQ: n.q }; clusters.push(c); }
    });
    const need = Math.min(2, takes.length);
    const kept = clusters.filter(k => Object.keys(k.takes).length >= need).map(k => {
      // each member voted for the semitone nearest to the cluster's median (octave slips between takes are folded in)
      const ref = median(k.items.map(i => i.semis));
      const vals = k.items.map(i => i.semis + 12 * Math.round((ref - i.semis) / 12));
      return { q: Math.round(median(k.items.map(i => i.q)) / GRID) * GRID, semis: median(vals), support: Object.keys(k.takes).length, takes: k.takes };
    });
    // agreement: how much each take's notes were taken up by the consensus (F measure), averaged over the takes
    let agree = 0;
    prepared.forEach((tk, ti) => {
      const hit = kept.filter(k => k.takes[ti]).length;
      agree += (tk.length + kept.length) ? 2 * hit / (tk.length + kept.length) : 0;
    });
    return { heard: prepared.reduce((n, t) => n + t.length, 0), notes: kept.map(k => ({ q: k.q, semis: k.semis, support: k.support })), agreement: takes.length ? agree / takes.length : 0 };
  }

  // ---------- scoring ----------
  const fscore = (cand, sung) => {
    let hit = 0; const used = {};
    // the nearest unused sung onset; a hit counts less the further off it is (a full hit at 0, half at the edge of the window)
    cand.forEach(c => { let j = -1, e = 1e9; sung.forEach((s, i) => { const d = Math.abs(s - c); if (!used[i] && d <= ONSET_TOL && d < e) { e = d; j = i; } });
      if (j >= 0) { used[j] = 1; hit += 1 - 0.5 * e / ONSET_TOL; } });
    return (cand.length + sung.length) ? 2 * hit / (cand.length + sung.length) : 0;
  };
  // a sung pitch x against a pattern degree d: the same pitch class, in any octave (lenient: a 5 down to 1 is "5 1" too)
  const pcHit = (x, d) => x != null && Math.abs(norm(x - d + 6, 12) - 6) <= PITCH_TOL;
  // cover the notes by familiar patterns end to end. A note repeated (A A D) is one pitch of a pattern: the pitches are first
  // folded into runs, the runs are covered, and every note of a run that is hit counts. seq: semitones above the tonic, or null.
  // -> { score, segs, degs: the pattern's degree for each note, in the singer's octave (null: not covered) }
  function tonalCover(seq, pats) {
    const runs = [];
    seq.forEach((x, i) => { const r = runs[runs.length - 1];
      if (x != null && r && r.val != null && Math.abs(x - r.val) <= PITCH_TOL) r.idx.push(i); else runs.push({ val: x, idx: [i] }); });
    const N = runs.length, f = new Array(N + 1).fill(null); f[0] = { obj: 0, hits: 0, segs: [] };
    for (let i = 0; i < N; i++) {
      if (!f[i]) continue;
      pats.forEach(p => {
        const j = i + p.degrees.length; if (j > N) return;
        let h = 0, w = 0; p.degrees.forEach((d, k) => { if (pcHit(runs[i + k].val, d)) { h++; w += runs[i + k].idx.length; } });
        if (h < p.degrees.length * 0.5) return;
        const obj = f[i].obj + w - SEG_COST;
        if (!f[j] || obj > f[j].obj + 1e-9) f[j] = { obj, hits: f[i].hits + w, segs: f[i].segs.concat([{ pattern: p, from: i, hits: h }]) };
      });
    }
    if (!f[N]) return { score: 0, segs: [], degs: seq.map(() => null) };
    const degs = seq.map(() => null);
    f[N].segs.forEach(sg => sg.pattern.degrees.forEach((d, k) => {
      const r = runs[sg.from + k], ref = r.val != null ? r.val : d;
      r.idx.forEach(i => { degs[i] = d + 12 * Math.round((ref - d) / 12); });
    }));
    return { score: f[N].hits / Math.max(1, seq.length), segs: f[N].segs, degs };
  }

  function match(comb, rhythmCands, tonalPats, o) {
    o = Object.assign({ beat: 1 }, o || {}); const th = Object.assign({}, THRESHOLD, o.threshold || {});
    const fail = (reason, extra) => Object.assign({ ok: false, reason, agreement: comb.agreement, best: null, runnersUp: [] }, extra || {});
    if (comb.heard < 2) return fail("too-few", { message: "Almost no notes came through. Sing louder and sing each note clearly, then try again." });
    if (comb.agreement < th.agreement)
      return fail("takes-disagree", { message: "Your three takes don't agree with each other, so I can't tell which rhythm you meant. Sing the same idea each time, with the same count-in." });
    if (comb.notes.length < 2) return fail("takes-disagree", { message: "Your takes have almost no notes in common, so I can't tell what you meant. Sing the same idea each time, with the same count-in." });
    if (!rhythmCands.length || !tonalPats.length) return fail("no-patterns", { message: "There are no familiar patterns for this key and meter." });
    const sungQ = comb.notes.map(n => n.q), results = [], cache = {};
    rhythmCands.forEach(rc => {
      const r = fscore(rc.onsets, sungQ); if (r < 0.5) return;
      const seq = rc.onsets.map(q => { let k = null; comb.notes.forEach(n => { if (Math.abs(n.q - q) <= ONSET_TOL && (!k || Math.abs(n.q - q) < Math.abs(k.q - q))) k = n; }); return k ? k.semis : null; });
      const sig = seq.map(x => x == null ? "_" : x.toFixed(1)).join(",");
      const cov = cache[sig] || (cache[sig] = tonalCover(seq, tonalPats));
      const off = rc.onsets.filter(q => Math.abs(q / o.beat - Math.round(q / o.beat)) > 1e-6).length;   // notes off the beat
      results.push({ rhythm: r, tonal: cov.score, score: (r + cov.score) / 2, rank: (r + cov.score) / 2 - 0.03 * off, cand: rc, cover: cov });
    });
    results.sort((a, b) => b.rank - a.rank || a.cover.segs.length - b.cover.segs.length || a.cand.rests - b.cand.rests);
    if (!results.length) return fail("no-rhythm", { message: "That rhythm isn't one of the familiar rhythm patterns for this meter. Try again, or sing something simpler." });
    const top = results[0];
    const ok = top.rhythm >= th.rhythm && top.tonal >= th.tonal && top.score >= th.combined;
    const best = { rhythm: top.rhythm, tonal: top.tonal, score: top.score, events: top.cand.events, rhythmId: top.cand.id,
      patterns: top.cover.segs.map(s => ({ id: s.pattern.id, label: s.pattern.label, key: s.pattern.key, from: s.from, n: s.pattern.degrees.length })),
      notes: [], onsets: top.cand.onsets };
    // the answer: each pattern note placed on the rhythm, in the octave the singer used
    best.notes = top.cover.degs.map(d => ({ semis: d }));
    const evs = top.cand.events.filter(e => !e.rest);
    best.notes = best.notes.map((n, i) => Object.assign(n, { q: evs[i].on, dur: evs[i].dur }));
    const runnersUp = results.slice(1, 4).map(r => ({ rhythm: r.rhythm, tonal: r.tonal, score: r.score, rhythmId: r.cand.id }));
    if (!ok) return { ok: false, reason: "no-fit", agreement: comb.agreement, best, runnersUp, message:
      "I couldn't match what you sang to the familiar rhythm and tonal patterns (rhythm " + Math.round(top.rhythm * 100) + "%, pitches " + Math.round(top.tonal * 100) + "%). It may be off the beat, out of the chosen tonality, or a new idea. Sing it again." };
    return { ok: true, reason: "ok", agreement: comb.agreement, best, runnersUp };
  }

  // ---------- ABC ----------
  const SHARP_N = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], FLAT_N = ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"];
  function spell(midi, key) {
    const flats = Object.keys(key.ksig || {}).some(l => key.ksig[l] < 0);
    let n = (flats ? FLAT_N : SHARP_N)[norm(midi, 12)]; const oct = Math.floor(midi / 12) - 5;      // C4 (60) = oct 0
    let acc = "", letter = n[n.length - 1];
    if (n.length > 1) acc = n[0]; else if (key.ksig && key.ksig[letter]) acc = "=";
    if (acc && acc !== "=" && key.ksig && key.ksig[letter] === (acc === "^" ? 1 : -1)) acc = "";
    let L = letter; if (oct >= 1) { L = letter.toLowerCase(); L += "'".repeat(oct - 1); } else L += ",".repeat(-oct);
    return acc + L;
  }
  function durStr(units) {
    if (Math.abs(units - Math.round(units)) < 1e-9) return units === 1 ? "" : String(Math.round(units));
    const d = 4; return Math.round(units * d) + "/" + d;
  }
  const bar8 = meter => { const p = meterKey(meter).split("/"); return +p[0] * 8 / +p[1]; };
  function blankAbc(o) {
    const u = bar8(o.meter), b = "x" + durStr(u);
    return "X:1\nT:" + (o.title || "Sing and notate") + "\nM:" + meterKey(o.meter) + "\nL:1/8\nK:" + o.key + "\n" + b + " | " + b + " |]";
  }
  // the detected answer as ABC (also what the page shows when asked)
  function answerAbc(best, o) {
    const key = parseKey(o.key), barQ = meterQuarters(o.meter); let out = [], t = 0;
    const evs = best.events, tonic = key.pc + 60; let ni = 0;
    evs.forEach(e => {
      const u = e.dur * 2;
      if (e.rest) out.push("z" + durStr(u)); else { out.push(spell(tonic + best.notes[ni].semis, key) + durStr(u)); ni++; }
      t += e.dur; if (Math.abs(t - barQ) < 1e-6) out.push("|"); if (Math.abs(t - 2 * barQ) < 1e-6) out.push("|]");
    });
    return "X:1\nT:Answer\nM:" + meterKey(o.meter) + "\nL:1/8\nK:" + key.key + "\n" + out.join(" ");
  }

  // ---------- grading what they wrote ----------
  const near = (a, b) => Math.abs(a - b) < 0.01;
  function written(abc) {
    let ev; try { ev = Events.fromAbc(abc); } catch (e) { return []; }
    return ev.sounding.filter(e => e.kind === "note" && e.pitches.length).map(e => ({ q: e.t_on, dur: e.t_off - e.t_on, midi: e.pitches[0].midi }));
  }
  // rhythm: the same notes start at the same times and last as long (ties merged, so tied eighths = a quarter); pitch: the same
  // scale degrees in order, whatever the octave. Each is judged on its own.
  // from: where the sung bars start in the written piece, in quarters (the ending of a song); notes before it are not judged
  function compare(best, abc, key, from) {
    from = from || 0;
    const k = typeof key === "object" ? key : parseKey(key), a = best.notes;
    const w = written(abc).filter(n => n.q >= from - 1e-6).map(n => Object.assign(n, { q: n.q - from }));
    const rhythm = w.length === a.length && a.length > 0 && a.every((n, i) => near(n.q, w[i].q) && near(n.dur, w[i].dur));
    const pitch = w.length === a.length && a.length > 0 && a.every((n, i) => norm(w[i].midi - 60 - k.pc, 12) === norm(Math.round(n.semis), 12));
    return { rhythm, pitch };
  }
  function checker(best, key, from) {
    const state = { rhythm: false, pitch: false };
    return {
      state,
      update(abc) {
        const c = compare(best, abc, key, from), newly = [];
        if (c.rhythm && !state.rhythm) newly.push("rhythm");
        if (c.pitch && !state.pitch) newly.push("pitch");
        if (c.rhythm) state.rhythm = true; if (c.pitch) state.pitch = true;
        const message = newly.length === 2 ? "Rhythm and pitches correct" : newly[0] === "rhythm" ? "Rhythm correct" : newly[0] === "pitch" ? "Pitches correct" : "";
        return { rhythm: c.rhythm, pitch: c.pitch, newly, message, done: state.rhythm && state.pitch };
      }
    };
  }

  const api = { THRESHOLD, GRID, parseKey, keyName, tonalPatterns, modesIn, rhythmBars, rhythmCandidates, segmentNotes, takeFromNotes, combine, match,
    blankAbc, answerAbc, compare, checker, meterQuarters, beatOf, spell };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else global.SingNotate = api;
})(typeof window !== "undefined" ? window : globalThis);
