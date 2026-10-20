// Chunk Practice (tools/chunk-practice.qmd): break a fast passage into small chunks and practise them at changing tempos.
//
//   ChunkPractice.chunks(notes, bounds, end)  -> [{ s, e }] time windows (whole notes) cut at the boundaries
//   ChunkPractice.plan(n, order)              -> [[a, b], ...] the chunk spans to practise, in order
//                                                order: "forward" (1, 2, 1-2, 3, 2-3, 1-3 ...), "backward" (same from the end), "each"
//   ChunkPractice.Ladder(opts)                -> the tempo for each try, and what a clean / missed try does to it
//                                                opts: { start, target, step, need, mode: "steady" | "varied" }
//
// "varied" mixes the tempo from try to try: base, slow, base, stretch (a step above). Clean at base `need` times in a row raises
// the base a step; a miss at base drops it a step; a clean stretch makes the stretch the new base; a missed stretch costs nothing.
// The span is done when the base is at the target and played clean `need` times in a row.
(function (global) {
  "use strict";

  function chunks(notes, bounds, end) {
    const b = [...new Set(bounds)].filter(t => t > 0 && t < end).sort((x, y) => x - y);
    const cuts = [0, ...b, end], out = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const s = cuts[i], e = cuts[i + 1];
      if (notes.some(n => n.start >= s - 1e-9 && n.start < e - 1e-9)) out.push({ s, e });
      else if (out.length) out[out.length - 1].e = e; // a chunk of only rests joins the one before
    }
    return out;
  }

  function plan(n, order) {
    if (n <= 0) return [];
    if (n === 1) return [[0, 0]];
    const out = [], add = (a, b) => { if (!out.some(p => p[0] === a && p[1] === b)) out.push([a, b]); };
    if (order === "each") { for (let i = 0; i < n; i++) add(i, i); add(0, n - 1); return out; }
    for (let k = 0; k < n; k++) {
      if (order === "backward") { const i = n - 1 - k; add(i, i); if (k >= 1) add(i, i + 1); if (k >= 2) add(i, n - 1); }
      else { add(k, k); if (k >= 1) add(k - 1, k); if (k >= 2) add(0, k); }
    }
    return out;
  }

  const PATTERN = ["base", "slow", "base", "stretch"];
  function Ladder(o) {
    const L = { start: o.start, target: o.target, step: Math.max(1, o.step), need: Math.max(1, o.need), mode: o.mode || "steady",
      base: Math.min(o.target, Math.max(o.start, o.from || o.start)), run: 0, turn: 0, done: false, tries: 0, best: 0 };
    L.kind = () => L.mode === "varied" ? PATTERN[L.turn % PATTERN.length] : "base";
    L.tempo = () => {
      const k = L.kind();
      if (k === "slow") return Math.max(L.start, Math.round(L.base - 2 * L.step));
      if (k === "stretch") return Math.round(L.base + L.step);
      return Math.round(L.base);
    };
    const FIELDS = ["base", "run", "turn", "done", "tries", "best"];
    L.snap = () => { const o = {}; FIELDS.forEach(f => o[f] = L[f]); return o; };
    L.restore = o => { FIELDS.forEach(f => L[f] = o[f]); return L; };
    L.result = clean => {
      const k = L.kind(), t = L.tempo();
      L.tries++;
      if (clean) L.best = Math.max(L.best, t);
      if (k === "base") {
        if (clean) {
          L.run++;
          if (L.run >= L.need) { if (L.base >= L.target) L.done = true; else { L.base = Math.min(L.target, L.base + L.step); L.run = 0; } }
        } else { L.base = Math.max(L.start, L.base - L.step); L.run = 0; }
      } else if (k === "stretch") { if (clean) { L.base = Math.min(L.target, t); L.run = 0; } }
      else if (!clean) { L.base = Math.max(L.start, L.base - L.step); L.run = 0; }
      if (!L.done) {
        L.turn++;
        // a stretch past the target is pointless once the base is there: go straight to base tries
        if (L.mode === "varied" && L.kind() === "stretch" && L.base >= L.target) L.turn++;
      }
      return L;
    };
    return L;
  }

  const api = { chunks, plan, Ladder };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ChunkPractice = api;


  // ---------- grading a pass from a MIDI keyboard ----------
  // expected: [{ t (ms), midi }], played: [{ t (ms), midi }] on the same clock. Each written note takes the nearest unused played note of
  // its pitch within `tol` ms; anything left over is extra. Clean = every note found in time, nothing extra.
  function grade(expected, played, tol) {
    const used = new Set(), late = [], misses = [];
    expected.forEach((e, i) => {
      let best = -1, bd = Infinity;
      played.forEach((p, j) => { if (!used.has(j) && p.midi === e.midi) { const d = Math.abs(p.t - e.t); if (d < bd) { bd = d; best = j; } } });
      if (best >= 0 && bd <= tol) { used.add(best); return; }
      if (best >= 0 && bd <= tol * 2.5) { used.add(best); late.push({ i, ms: Math.round(played[best].t - e.t) }); return; }
      misses.push(i);
    });
    const extra = played.length - used.size;
    const clean = !misses.length && !late.length && !extra;
    let text = "Clean, by the keys.";
    if (!clean) {
      const bits = [];
      if (misses.length) bits.push(misses.length + (misses.length === 1 ? " note wrong or missed" : " notes wrong or missed") + " (first: note " + (misses[0] + 1) + ")");
      if (extra) bits.push(extra + " extra");
      if (late.length) bits.push("note " + (late[0].i + 1) + " " + (late[0].ms > 0 ? "late" : "early") + " by " + Math.abs(late[0].ms) + " ms" + (late.length > 1 ? " (+" + (late.length - 1) + " more)" : ""));
      text = "Not yet: " + bits.join(", ") + ".";
    }
    return { clean, misses: misses.length, extra, late: late.length, text };
  }
  api.grade = grade;
  if (typeof document === "undefined" || !document.querySelector) return;

  // ---------- the page ----------
  const KEY = "chunk-practice-v1";
  const DEFAULT_ABC = "X:1\nT:Example run\nM:4/4\nL:1/16\nQ:1/4=132\nK:G\nGABc dBGB dcBA GFED | EFGA BcdB cBAG FGAF | G4 z4 z8 |]";
  const $ = s => document.querySelector(s);
  let S = { abc: DEFAULT_ABC, bounds: null, per: 2, order: "forward", startPct: 60, target: 0, step: 4, need: 3, mode: "varied",
            land: true, log: {}, stepIx: 0, rhythm: "as", view: "quick", loop: true, silent: "again", keys: false };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  // Quick: the click keeps going, every clean pass is a step faster, a slip (or a press of Not yet) a step slower; saying nothing counts as
  // clean, so one pedal is enough. About five clean passes from the start tempo to the target.
  function cfg() {
    if (S.view !== "quick") return S;
    const start = Math.round(S.target * 0.7);
    return { ...S, order: "forward", mode: "steady", need: 1, startPct: 70, step: Math.max(2, Math.round((S.target - start) / 5)), land: true,
             loop: true, silent: "clean", rhythm: "as" };
  }

  let notes = [], beat = 0.25, perBar = 4, end = 1, els = [], list = [], steps = [], ladder = null, qbpm = 120, svg = null;

  function hashAbc(a) { let h = 0; for (const c of a.replace(/\s+/g, "")) h = (h * 31 + c.charCodeAt(0)) | 0; return String(h); }
  function logFor() { const h = hashAbc(S.abc); return (S.log[h] = S.log[h] || {}); }

  function parse() {
    const box = $("#cp-score"), w = Math.max(280, box.clientWidth - 16), narrow = w < 560;
    let vis;
    try {
      vis = ABCJS.renderAbc(box, S.abc, { add_classes: true, clickListener: onClick, selectionColor: "currentColor", paddingleft: 0, paddingright: 0,
        staffwidth: w, scale: narrow ? 0.9 : 1, wrap: { minSpacing: 1.6, maxSpacing: 2.6, preferredMeasuresPerLine: narrow ? 1 : 3 } })[0];
    } catch (e) { vis = null; }
    if (!vis || !vis.lines || !vis.lines.length) { $("#cp-msg").textContent = "That ABC didn't draw. Check it has an X:, a K: and some notes."; return false; }
    svg = box.querySelector("svg");
    const m = vis.getMeterFraction ? vis.getMeterFraction() : { num: 4, den: 4 };
    const compound = m.den === 8 && m.num % 3 === 0 && m.num > 3;
    beat = (compound ? 3 : 1) / m.den; perBar = Math.round((m.num / m.den) / beat) || 4;
    const tempo = vis.metaText && vis.metaText.tempo;
    qbpm = tempo && tempo.bpm ? tempo.bpm * ((tempo.duration && tempo.duration[0]) || 0.25) / beat : 100;
    const seq = vis.setUpAudio();
    notes = (seq.tracks[0] || []).filter(e => e.cmd === "note").map(e => ({ start: e.start, d: e.duration, pitch: e.pitch, sc: e.startChar }));
    end = Math.max(...notes.map(n => n.start + n.d), beat);
    els = [];
    vis.lines.forEach((l, li) => (l.staff || []).forEach(st => (st.voices || []).forEach(v => v.forEach(e => {
      if (e.el_type === "note" && e.abselem && e.abselem.elemset) els.push({ sc: e.startChar, set: e.abselem.elemset, rest: !e.pitches, line: li });
    }))));
    if (!S.target) S.target = Math.round(qbpm);
    $("#cp-target").value = S.target;
    $("#cp-msg").textContent = notes.length ? "" : "No notes found in that ABC.";
    return notes.length > 0;
  }

  function defaultBounds() { const len = beat * S.per, b = []; for (let t = len; t < end - 1e-9; t += len) b.push(+t.toFixed(6)); return b; }

  function rebuild(keepStep) {
    const c = cfg();
    if (!S.bounds) S.bounds = defaultBounds();
    list = chunks(notes, S.bounds, end);
    steps = plan(list.length, c.order);
    if (!keepStep || S.stepIx >= steps.length) S.stepIx = 0;
    startStep();
    save();
  }

  function startTempo() { const c = cfg(); return Math.max(20, Math.round(c.target * c.startPct / 100)); }
  function spanKey(p) { return p[0] + "-" + p[1]; }
  function spanName(p) { return p[0] === p[1] ? "Chunk " + (p[0] + 1) : "Chunks " + (p[0] + 1) + "–" + (p[1] + 1); }

  function startStep() {
    const p = steps[S.stepIx]; if (!p) return;
    const c = cfg(), lg = logFor(), start = startTempo();
    // a linked span starts a little under the slowest of its chunks' best, so it doesn't start from scratch every time
    let from = start;
    const parts = []; for (let i = p[0]; i <= p[1]; i++) parts.push(lg[i + "-" + i] || 0);
    if (p[0] !== p[1] && parts.every(x => x > 0)) from = Math.min(...parts) - 2 * c.step;
    if (lg[spanKey(p)]) from = Math.max(from, lg[spanKey(p)] - 2 * c.step);
    ladder = Ladder({ start, target: c.target, step: c.step, need: c.need, mode: c.mode, from });
    paint();
  }

  function span(p) {
    const s = list[p[0]].s, e = list[p[1]].e;
    const ns = notes.filter(n => n.start >= s - 1e-9 && n.start < e - 1e-9).map(n => ({ ...n }));
    if (cfg().land) { const nx = notes.find(n => n.start >= e - 1e-9); if (nx) ns.push({ ...nx, landing: true }); }
    return { s, e, notes: ns };
  }

  function chunkOf(t) { return list.findIndex(c => t >= c.s - 1e-9 && t < c.e - 1e-9); }

  // Chunks as tinted bands behind the notes (alternating), the span being practised darker, a line where each chunk starts.
  const NS = "http://www.w3.org/2000/svg";
  function bands() {
    if (!svg) return;
    svg.querySelectorAll(".cp-band").forEach(r => r.remove());
    const p = steps[S.stepIx], inv = svg.getScreenCTM() && svg.getScreenCTM().inverse(); if (!inv) return;
    const scStart = new Map(notes.map(n => [n.sc, n.start])), groups = new Map();
    els.forEach(x => {
      const t = scStart.has(x.sc) ? scStart.get(x.sc) : null;
      const ci = t === null ? (x.rest ? -2 : -1) : chunkOf(t); if (ci === -1) return;
      let r = null;
      x.set.forEach(el => { const b = el.getBoundingClientRect(); if (!b.width && !b.height) return;
        r = r ? { l: Math.min(r.l, b.left), r: Math.max(r.r, b.right), t: Math.min(r.t, b.top), b: Math.max(r.b, b.bottom) } : { l: b.left, r: b.right, t: b.top, b: b.bottom }; });
      if (!r) return;
      const key = x.line + ":" + (ci === -2 ? "rest" : ci), g = groups.get(key);
      groups.set(key, g ? { ...g, l: Math.min(g.l, r.l), r: Math.max(g.r, r.r), t: Math.min(g.t, r.t), b: Math.max(g.b, r.b) } : { ...r, ci, line: x.line });
    });
    // one height per line, so the bands line up
    const lines = new Map();
    groups.forEach(g => { const L = lines.get(g.line); lines.set(g.line, L ? { t: Math.min(L.t, g.t), b: Math.max(L.b, g.b) } : { t: g.t, b: g.b }); });
    const pt = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(inv); };
    groups.forEach(g => {
      if (g.ci < 0) return;
      const L = lines.get(g.line), a = pt(g.l - 3, L.t - 6), b = pt(g.r + 3, L.b + 6), on = p && g.ci >= p[0] && g.ci <= p[1];
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("class", "cp-band " + (g.ci % 2 ? "cp-band-b" : "cp-band-a") + (on ? " cp-band-on" : ""));
      r.setAttribute("x", a.x); r.setAttribute("y", a.y); r.setAttribute("width", Math.max(2, b.x - a.x)); r.setAttribute("height", b.y - a.y);
      r.setAttribute("rx", 5); r.dataset.chunk = g.ci + 1;
      svg.insertBefore(r, svg.firstChild);
      const label = document.createElementNS(NS, "text");
      label.setAttribute("class", "cp-band cp-band-n" + (on ? " cp-band-on" : "")); label.setAttribute("x", a.x + 4); label.setAttribute("y", b.y - 3);
      label.textContent = g.ci + 1; svg.appendChild(label);
    });
  }

  function paint() {
    const p = steps[S.stepIx], lg = logFor(), c = cfg();
    $("#cp-root").classList.toggle("is-quick", S.view === "quick");
    document.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === S.view));
    bands();
    $("#cp-count").textContent = list.length + (list.length === 1 ? " chunk" : " chunks") + " · " + steps.length + " steps · click a note to cut or join";
    if (!p) return;
    const whole = p[0] === 0 && p[1] === list.length - 1 && list.length > 1;
    $("#cp-step-name").textContent = whole ? "The whole passage" : spanName(p);
    $("#cp-step-of").textContent = "Step " + (S.stepIx + 1) + " of " + steps.length;
    const k = ladder.kind(), t = ladder.tempo();
    $("#cp-tempo").textContent = t;
    $("#cp-kind").textContent = S.view === "quick" ? "" : { base: "Working tempo", slow: "Slow and easy", stretch: "Stretch: a step faster (a miss is fine)" }[k];
    $("#cp-kind").className = "cp-kind cp-k-" + k;
    $("#cp-run").innerHTML = ladder.done ? "<b>Done.</b> Clean at the target tempo." : S.view === "quick" ?
      "Target " + c.target + " · each clean pass +" + c.step :
      "Clean in a row at " + Math.round(ladder.base) + ": " + "●".repeat(ladder.run) + "○".repeat(Math.max(0, c.need - ladder.run)) + " · target " + c.target;
    const pct = Math.max(0, Math.min(100, (ladder.base - ladder.start) / Math.max(1, c.target - ladder.start) * 100));
    $("#cp-bar").style.width = (ladder.done ? 100 : pct) + "%";
    $("#cp-yes").disabled = $("#cp-no").disabled = ladder.done && !run;
    $("#cp-next").textContent = S.stepIx < steps.length - 1 ? "Next step →" : "Finish";
    $("#cp-next").classList.toggle("cp-primary", ladder.done);
    $("#cp-prev").disabled = S.stepIx === 0;
    const rows = steps.map((q, i) => {
      const b = lg[spanKey(q)], nm = q[0] === q[1] ? String(q[0] + 1) : (q[0] + 1) + "–" + (q[1] + 1);
      return `<button type="button" class="cp-chip${i === S.stepIx ? " is-now" : ""}${b >= c.target ? " is-done" : ""}" data-i="${i}" data-midi="off">${nm}<small>${b ? b : "–"}</small></button>`;
    });
    $("#cp-log").innerHTML = rows.join("");
  }

  function onClick(abcelem) {
    if (!abcelem || abcelem.el_type !== "note") return;
    const n = notes.find(x => x.sc === abcelem.startChar); if (!n || n.start <= 0) return;
    const t = +n.start.toFixed(6), i = S.bounds.findIndex(b => Math.abs(b - t) < 1e-6);
    if (i >= 0) S.bounds.splice(i, 1); else S.bounds.push(t);
    stop(); rebuild(false);
  }

  // ---------- sound ----------
  let ctx = null, master = null;
  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      if (window.AudioTap) window.AudioTap.register(ctx, master, "Chunk Practice");
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function click(t, strong, keep) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = strong ? 1600 : 1100; o.type = "square";
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(strong ? 0.35 : 0.2, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.06); keep.push({ o, t });
  }
  function tone(t, pitch, dur, keep) {
    const f = 440 * Math.pow(2, (pitch - 69) / 12), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = Math.min(8000, f * 6);
    [["triangle", 1], ["sine", 0.5]].forEach(([type, mul], i) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * (i ? 2 : 1);
      const og = ctx.createGain(); og.gain.value = mul * 0.5; o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.3); keep.push({ o, t });
    });
    const d = Math.max(0.05, dur * 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.15, t + Math.min(d, 0.25)); g.gain.setValueAtTime(0.15, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12);
    lp.connect(g).connect(master);
  }

  // rhythm variants: equal notes in pairs become long-short or short-long
  function vary(ns) {
    const rh = cfg().rhythm;
    if (rh === "as") return ns;
    const out = ns.map(n => ({ ...n })), body = out.filter(n => !n.landing);
    for (let i = 0; i + 1 < body.length; i += 2) {
      const a = body[i], b = body[i + 1];
      if (Math.abs(a.d - b.d) > 1e-9 || Math.abs(b.start - (a.start + a.d)) > 1e-9) continue;
      a.d = a.d * (rh === "ls" ? 1.5 : 0.5); b.start = a.start + a.d; b.d = 2 * b.d - a.d;
    }
    return out;
  }

  // ---------- playing: one pass, or passes round and round with the click never stopping ----------
  // run: { model, loop, nodes, timers, pass, prev }. A pass is a gap of clicks (the count-in; between passes, the time to answer) and then
  // the span. Its verdict is taken just before it ends: a Clean / Not yet pressed during it, else the keyboard's grade, else (going round)
  // the "say nothing" setting. A Clean / Not yet pressed in the next gap replaces that verdict and the gap is played again at the new tempo.
  let run = null;
  function unlight() { $("#cp-score").classList.remove("is-live"); }

  function stop() {
    if (run) { run.timers.forEach(clearTimeout); run.nodes.forEach(n => { try { n.o.stop(); } catch (e) {} }); }
    run = null; unlight();
    $("#cp-listen").textContent = "Listen"; $("#cp-go").textContent = "▶ Play";
    $("#cp-root").classList.remove("is-playing");
  }
  function cancelFrom(t) {
    run.nodes = run.nodes.filter(n => { if (n.t >= t) { try { n.o.stop(); } catch (e) {} return false; } return true; });
    run.timers.forEach(clearTimeout); run.timers = []; unlight();
  }

  function playPass(T, gap) {
    const p = steps[S.stepIx]; if (!p) { stop(); return; }
    const bpm = ladder.tempo(), spb = 60 / bpm, secW = spb / beat, sp = span(p), ns = vary(sp.notes);
    const g0 = Math.floor(sp.s / beat + 1e-9) * beat, t0 = T + gap * spb, at = w => t0 + (w - g0) * secW;
    const beatNo = w => Math.round(w / beat);
    for (let i = 0; i < gap; i++) click(T + i * spb, ((beatNo(g0) - gap + i) % perBar + perBar) % perBar === 0, run.nodes);
    const last = ns.length ? Math.max(...ns.map(n => n.start + (n.landing ? beat / 2 : n.d))) : sp.e;
    const L = Math.max(1, Math.ceil((last - g0) / beat - 1e-6));
    for (let k = 0; k < L; k++) click(at(g0 + k * beat), beatNo(g0 + k * beat) % perBar === 0, run.nodes);
    const lat = (ctx.outputLatency || ctx.baseLatency || 0), off = performance.now() - ctx.currentTime * 1000 + lat * 1000;
    if (run.model) ns.forEach(n => tone(at(n.start), n.pitch, (n.landing ? beat / 2 : n.d) * secW, run.nodes));
    // the chunk being played lights up for the pass, not each note (at speed that is more distracting than useful)
    const on = (t0 - ctx.currentTime) * 1000, offMs = (at(last) - ctx.currentTime) * 1000;
    run.timers.push(setTimeout(() => $("#cp-score").classList.add("is-live"), on));
    run.timers.push(setTimeout(() => $("#cp-score").classList.remove("is-live"), offMs));
    const E = at(g0 + L * beat);
    run.pass = { T, t0, E, spb, bpm, answer: null, played: [], from: off + T * 1000,
      expect: ns.map(n => ({ t: off + at(n.start) * 1000, midi: n.pitch })), minGap: Math.min(...ns.map(n => n.d)) * secW * 1000 };
    let g = 2; while ((L + g) % perBar) g++;
    run.nextGap = g;
    run.timers.push(setTimeout(decide, Math.max(0, (E - ctx.currentTime) * 1000 - 120)));
    $("#cp-root").classList.add("is-playing");
    paint();
  }

  function keyGrade(pass) {
    if (!S.keys || run.model || !pass.played.length || !pass.expect.length) return null;
    const tol = Math.max(60, Math.min(140, pass.minGap * 0.4)), from = pass.expect[0].t - pass.spb * 500;   // from half a beat early
    return grade(pass.expect, pass.played.filter(x => x.t >= from), tol);
  }

  function decide() {
    if (!run) return;
    const pass = run.pass, c = cfg();
    if (run.model) { if (run.loop) playPass(pass.E, run.nextGap); else run.timers.push(setTimeout(stop, 300)); return; }
    const g = keyGrade(pass);
    if (g) say(g.text, g.clean ? "ok" : "no");
    let ans = pass.answer != null ? pass.answer : g ? g.clean : null;
    if (!run.loop) { const r = run; r.timers.push(setTimeout(() => { if (run === r) stop(); }, 300)); if (ans != null) apply(ans, pass); return; }
    if (ans == null) ans = c.silent === "clean" ? true : null;
    pass.undo = { L: ladder.snap(), stepIx: S.stepIx, log: { ...logFor() } };
    pass.verdict = ans;
    if (ans != null) apply(ans, pass);
    if (!run) return;
    run.prev = pass;
    playPass(pass.E, run.nextGap);
  }

  // a verdict: the log, the ladder, and in a running loop the next step once this one is done
  function apply(clean, pass) {
    const p = steps[S.stepIx], lg = logFor(), k = spanKey(p), t = pass ? pass.bpm : ladder.tempo();
    if (clean) lg[k] = Math.max(lg[k] || 0, t);
    ladder.result(clean); flash(clean);
    if (ladder.done && run && run.loop && !run.model) {
      if (S.stepIx < steps.length - 1) { S.stepIx++; startStep(); say(spanName(steps[S.stepIx]) + " next.", "ok"); }
      else { save(); stop(); say("The whole passage is clean at the target. Well done.", "ok"); }
    }
    save(); paint();
  }
  function flash(clean) { const b = clean ? $("#cp-yes") : $("#cp-no"); b.classList.add("cp-flash"); setTimeout(() => b.classList.remove("cp-flash"), 300); }
  function say(t, kind) { const m = $("#cp-say"); m.textContent = t; m.className = "cp-say" + (kind ? " cp-say-" + kind : ""); }

  function result(clean) {
    if (run && !run.model && run.loop) {
      const now = ctx.currentTime, pass = run.pass;
      if (now < pass.E - 0.12 && now >= pass.t0 - pass.spb) { pass.answer = clean; flash(clean); say(clean ? "Clean: noted." : "Not yet: noted.", clean ? "ok" : "no"); return; }
      const prev = run.prev;
      if (prev && now < pass.t0 && prev.verdict !== clean) {
        // answered in the gap: undo what the last pass's verdict did, apply this one, and play the gap again at the new tempo
        if (prev.undo.stepIx !== S.stepIx) { S.stepIx = prev.undo.stepIx; startStep(); }
        ladder.restore(prev.undo.L); S.log[hashAbc(S.abc)] = prev.undo.log;
        prev.verdict = clean; apply(clean, prev);
        if (!run) return;
        const beatsLeft = Math.ceil((pass.t0 - now) / pass.spb - 1e-6), T = pass.t0 - beatsLeft * pass.spb;
        cancelFrom(T - 0.01);
        playPass(T, Math.max(2, beatsLeft));
        return;
      }
      flash(clean); return;
    }
    if (!ladder || ladder.done) return;
    if (run && !run.model) { run.pass.answer = clean; flash(clean); return; }
    stop(); apply(clean, null);
  }

  function play(model) {
    if (run) { const was = run.model; stop(); if (was === model) return; }
    const p = steps[S.stepIx]; if (!p || (!model && ladder.done && S.stepIx >= steps.length - 1)) return;
    if (!model && ladder.done) go(S.stepIx + 1);
    audio();
    run = { model, loop: !model && cfg().loop, nodes: [], timers: [] };
    (model ? $("#cp-listen") : $("#cp-go")).textContent = "■ Stop";
    say(model ? "" : run.loop ? "The click keeps going: play each time it comes round." + (S.view === "quick" ? " Slip? Press Not yet." : "") : "");
    playPass(ctx.currentTime + 0.15, perBar);
  }
  function go(i) { const was = run && !run.model && run.loop; stop(); S.stepIx = Math.max(0, Math.min(steps.length - 1, i)); startStep(); save(); if (was) play(false); }

  // the keyboard: every note-on goes to the pass that is playing (a bound pedal or key is a button, not a note)
  function listenKeys() {
    if (!window.MidiLearn) return;
    MidiLearn.subscribe(m => {
      if (m.kind !== "note" || !(m.value > 0) || !run || run.model || !S.keys) return;
      if (MidiLearn.isBound(m)) return;
      run.pass.played.push({ t: m.time, midi: m.id });
    });
  }
  function keysStatus() {
    const box = $("#cp-keys-msg");
    if (!S.keys) { box.textContent = ""; return; }
    if (!window.MidiLearn) { box.textContent = "MIDI isn't available on this page."; return; }
    box.textContent = "Connecting…";
    MidiLearn.connect().then(a => { let n = 0; a.inputs.forEach(() => n++);
      box.textContent = n ? "Listening. Each pass is graded by the notes you play." : "No MIDI keyboard found yet; plug one in."; },
      e => { box.textContent = e.message || "MIDI was refused."; });
  }

  function fromNotation() {
    try {
      const raw = localStorage.getItem("ntDoc"); if (!raw) { $("#cp-msg").textContent = "Nothing saved on the Notation page yet."; return; }
      let doc = JSON.parse(raw); if (NotationDoc.upgrade) doc = NotationDoc.upgrade(doc) || doc;
      const abc = NotationDoc.toAbc(doc).abc;
      $("#cp-abc").value = abc; useAbc();
    } catch (e) { $("#cp-msg").textContent = "Couldn't read the Notation page's piece."; }
  }

  function useAbc() {
    stop();
    const a = $("#cp-abc").value.trim(); if (!a) return;
    if (a !== S.abc) { S.abc = a; S.bounds = null; S.target = 0; S.stepIx = 0; }
    if (parse()) rebuild(true);
  }

  function readSettings() {
    S.per = +$("#cp-per").value; S.order = $("#cp-order").value; S.startPct = +$("#cp-startpct").value;
    S.target = Math.max(20, +$("#cp-target").value || S.target); S.step = Math.max(1, +$("#cp-stepsize").value || 4);
    S.need = Math.max(1, +$("#cp-need").value || 3); S.mode = $("#cp-mode").value; S.land = $("#cp-land").checked;
    S.loop = $("#cp-loop").checked; S.silent = $("#cp-silent").value;
  }

  function init() {
    $("#cp-abc").value = S.abc;
    $("#cp-per").value = S.per; $("#cp-order").value = S.order; $("#cp-startpct").value = S.startPct; $("#cp-stepsize").value = S.step;
    $("#cp-need").value = S.need; $("#cp-mode").value = S.mode; $("#cp-land").checked = S.land; $("#cp-rhythm").value = S.rhythm;
    $("#cp-loop").checked = S.loop; $("#cp-silent").value = S.silent; $("#cp-keys").checked = S.keys;
    if (!parse()) return;
    rebuild(true);
    $("#cp-use").onclick = useAbc;
    $("#cp-from-nt").onclick = fromNotation;
    $("#cp-reset").onclick = () => { stop(); S.abc = DEFAULT_ABC; $("#cp-abc").value = DEFAULT_ABC; S.bounds = null; S.target = 0; if (parse()) rebuild(false); };
    $("#cp-per").onchange = () => { readSettings(); S.bounds = null; stop(); rebuild(false); };
    $("#cp-order").onchange = () => { readSettings(); stop(); rebuild(false); };
    ["#cp-startpct", "#cp-target", "#cp-stepsize", "#cp-need", "#cp-mode", "#cp-land", "#cp-loop", "#cp-silent"].forEach(s => $(s).onchange = () => { readSettings(); stop(); rebuild(true); });
    $("#cp-rhythm").onchange = () => { S.rhythm = $("#cp-rhythm").value; save(); };
    $("#cp-keys").onchange = () => { S.keys = $("#cp-keys").checked; save(); keysStatus(); };
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { if (S.view === b.dataset.view) return; stop(); S.view = b.dataset.view; rebuild(false); });
    $("#cp-listen").onclick = () => play(true);
    $("#cp-go").onclick = () => play(false);
    $("#cp-yes").onclick = () => result(true);
    $("#cp-no").onclick = () => result(false);
    $("#cp-prev").onclick = () => go(S.stepIx - 1);
    $("#cp-next").onclick = () => go(S.stepIx + 1);
    $("#cp-log").onclick = e => { const b = e.target.closest("[data-i]"); if (b) go(+b.dataset.i); };
    $("#cp-clearlog").onclick = () => { if (confirm("Clear the best tempos for this passage?")) { delete S.log[hashAbc(S.abc)]; startStep(); save(); } };
    let rt = 0, lastW = $("#cp-score").clientWidth;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => {
      const w = $("#cp-score").clientWidth; if (Math.abs(w - lastW) < 20 || run) return; lastW = w; if (parse()) paint(); }, 200); });
    document.addEventListener("keydown", e => {
      if (e.target.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains("ml-learning")) return;
      const k = e.key;
      if (k === " ") { e.preventDefault(); play(false); }
      else if (k === "m") play(true);
      else if (k === "y") result(true);
      else if (k === "n") result(false);
      else if (k === "ArrowRight") go(S.stepIx + 1);
      else if (k === "ArrowLeft") go(S.stepIx - 1);
    });
    listenKeys(); if (S.keys) keysStatus();
    window.ChunkPractice._test = { get run() { return run; }, get ladder() { return ladder; }, S };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
