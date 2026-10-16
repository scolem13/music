// phrase-seam.js — the seam bar between two phrases: the bar where phrase A ends and phrase B's pickup (lead-in) starts.
// Plain script, one global (PhraseSeam); loads in Node for tests. Uses AbcNHT.chordPcs for the chord hints when it is loaded
// (abc-core.js, abc-events.js, abc-nht.js before it); without it the chord hints are skipped. Not wired into pages yet.
// The plan and the rules: apps/shared/NOTATION-DWIM.md, "Phrase seams".
//
// Notes are one voice in one bar: [{ t, d, midi }], t and d in quarters from the bar's start, midi null for a rest
// (gaps between notes are rests too).
//
//   PhraseSeam.suggest(notes, opts) -> [{ t, score, reasons }] best first: where B starts in the bar (t = barQ: no pickup,
//        t = 0: all of the bar is B's). opts: { barQ, beatQ, prevChord, nextChord, nextMidi, loopStart, snap }
//          prevChord / nextChord  the chord under A's end / at B's first downbeat (names, "G7")
//          nextMidi   B's first downbeat note, when known (a pickup leans toward it)
//          loopStart  where the user's loop for B started, in this bar's quarters
//          snap       grid for the line, default 0.5 (an eighth)
//   PhraseSeam.stitch(a, b, seam, opts) -> { notes, conflicts } the bar as one: A owns [0, seam), B owns [seam, barQ).
//        a, b: each side's notes for the bar (each may stray over the line when loops overlapped). opts: { barQ, prefer: "a" | "b" }
//          (default "b", the later transcription). conflicts: [{ t, a, b, kept }] where both sides had notes at once.
//          A note both sides have at the same t and pitch is one note with elided: true (end of A and start of B).
//   PhraseSeam.toSlots(notes, barQ) -> { rhythm, pitches } NotationDoc slots for the bar, gaps filled with rests.
//   PhraseSeam.PICKUPS            the pickup shapes known, as onsets counted back from the barline (in quarters)
//
// How suggest scores a line at t (the onset of a note, or the barline):
//   gap      the rest before t, and how long the note before t is held (a breath or a long final note ends A)
//   shape    B's onsets from t to the barline match a known pickup shape
//   chords   A's last note is a tone of prevChord; B's first note is not, but is a tone of nextChord or a step from nextMidi
//   loop     loopStart is within half the snap of t
//   run      in a run of even notes with no rest the line costs a little, so the other hints decide

(function (global) {
  const NHT = global.AbcNHT || (typeof require === "function" ? (() => { try { return require("./abc-nht.js"); } catch (e) { return null; } })() : null);
  const EPS = 1e-6;

  // onsets back from the barline (beat 4 = -1, its "and" = -0.5), 4/4 counted, scaled for shorter bars by the caller's barQ
  const PICKUPS = [
    [-0.5], [-1], [-1, -0.5], [-1.5, -1, -0.5], [-1.5, -0.5], [-2, -1.5, -1, -0.5], [-2, -1], [-3, -2, -1],
    [-2.5, -2, -1.5, -1, -0.5], [-0.75, -0.5, -0.25], [-1, -0.75, -0.5, -0.25], [-2.5, -1.5, -0.5], [-0.667, -0.333]
  ];

  const sorted = ns => ns.filter(n => n && n.d > EPS).slice().sort((x, y) => x.t - y.t);
  const sounding = ns => sorted(ns).filter(n => n.midi != null);
  const pcsOf = name => { if (!NHT || !name) return null; const c = NHT.chordPcs(name); return c ? c.pcs : null; };
  const near = (x, y, tol) => Math.abs(x - y) <= (tol == null ? EPS : tol);

  function suggest(notes, opts) {
    opts = opts || {};
    const barQ = opts.barQ || 4, beatQ = opts.beatQ || 1, snap = opts.snap || 0.5;
    const ns = sounding(notes);
    const prevPcs = pcsOf(opts.prevChord), nextPcs = pcsOf(opts.nextChord);
    const spots = [barQ];
    ns.forEach(n => { if (n.t < barQ - EPS && !spots.some(s => near(s, n.t))) spots.push(n.t); });
    const durs = ns.map(n => n.d), even = durs.length > 2 && durs.every(d => near(d, durs[0], 0.01));
    const out = spots.map(t => {
      const a = ns.filter(n => n.t < t - EPS), b = ns.filter(n => n.t >= t - EPS);
      let score = 0; const reasons = [];
      const last = a[a.length - 1], first = b[0];
      // gap: the rest before t and the held note before it
      if (last) {
        const rest = t - (last.t + last.d);
        if (rest > EPS) { score += 2 * rest / beatQ; reasons.push("rest of " + fmt(rest) + " before"); }
        if (last.d >= beatQ - EPS) { score += 0.5 * last.d / beatQ; reasons.push("A ends on a held note"); }
      } else if (t > EPS) { score += 1; reasons.push("rest from the downbeat"); }
      if (!b.length) {
        // no pickup at all: good when the bar has no notes near its end
        const tail = last ? barQ - (last.t + last.d) : barQ;
        score += tail >= beatQ - EPS ? 1 : -1;
        reasons.push("no pickup");
      }
      // shape: B's onsets back from the barline
      if (b.length) {
        const back = b.map(n => n.t - barQ);
        if (PICKUPS.some(p => p.length === back.length && p.every((x, i) => near(x, back[i], 0.02)))) {
          score += 1.5; reasons.push("a familiar pickup shape");
        }
        if (t < EPS && a.length === 0) { score -= 1.5; reasons.push("the whole bar as pickup"); }
        else if (barQ - t > barQ * 0.75 + EPS) { score -= 0.5; reasons.push("a long pickup"); }
      }
      // chords
      if (last && prevPcs && prevPcs.includes(mod12(last.midi))) { score += 0.75; reasons.push("A ends on a tone of " + opts.prevChord); }
      if (first && prevPcs && !prevPcs.includes(mod12(first.midi))) {
        if (nextPcs && nextPcs.includes(mod12(first.midi))) { score += 0.75; reasons.push("B starts on a tone of " + opts.nextChord); }
        else if (opts.nextMidi != null && Math.abs(first.midi - opts.nextMidi) <= 2) { score += 0.5; reasons.push("B steps toward its downbeat"); }
      }
      // loop
      if (opts.loopStart != null && near(opts.loopStart, t, snap / 2)) { score += 1; reasons.push("your loop started here"); }
      if (even && last && first && near(last.t + last.d, first.t)) score -= 0.25;
      return { t: Math.round(t / snap) * snap, score: Math.round(score * 100) / 100, reasons };
    });
    // snapping can merge spots: keep the best of each
    const best = {};
    out.forEach(c => { const k = c.t.toFixed(4); if (!best[k] || best[k].score < c.score) best[k] = c; });
    return Object.values(best).sort((x, y) => y.score - x.score || y.t - x.t);
  }

  function stitch(a, b, seam, opts) {
    opts = opts || {};
    const barQ = opts.barQ || 4, prefer = opts.prefer === "a" ? "a" : "b";
    const A = sorted(a).map(n => Object.assign({ side: "a" }, n)), B = sorted(b).map(n => Object.assign({ side: "b" }, n));
    const conflicts = [], out = [];
    // elision: the same note on both sides
    B.forEach(nb => {
      const na = A.find(x => !x.gone && x.midi != null && near(x.t, nb.t, 0.02) && x.midi === nb.midi);
      if (na) { na.gone = nb.gone = true; out.push({ t: na.t, d: Math.max(na.d, nb.d), midi: na.midi, elided: true }); }
    });
    const live = A.concat(B).filter(n => !n.gone && n.midi != null);
    const owner = n => (n.t < seam - EPS ? "a" : "b");
    const overl = (x, y) => x.t < y.t + y.d - EPS && y.t < x.t + x.d - EPS;
    live.forEach(n => {
      if (n.gone) return;
      const foes = live.filter(m => m !== n && !m.gone && m.side !== n.side && overl(n, m));
      if (!foes.length) return;
      foes.forEach(m => {
        const na = n.side === "a" ? n : m, nb = n.side === "b" ? n : m;
        // an A note held over the line into B's first note: trim, not a conflict
        if (owner(na) === "a" && owner(nb) === "b" && na.t < nb.t - EPS) { na.d = nb.t - na.t; return; }
        // a B note reaching back into A's side over an A note on its own side, or both at once: a real conflict
        const keep = owner(n) === owner(m) ? prefer : owner(nb) === "b" && owner(na) === "b" ? "b" : owner(na) === "a" && owner(nb) === "a" ? "a" : prefer;
        conflicts.push({ t: Math.min(na.t, nb.t), a: strip(na), b: strip(nb), kept: keep });
        (keep === "a" ? nb : na).gone = true;
      });
    });
    live.filter(n => !n.gone).forEach(n => out.push(strip(n)));
    const notes = out.map(n => Object.assign({}, n, { d: Math.min(n.d, barQ - n.t) })).filter(n => n.t < barQ - EPS && n.d > EPS)
      .sort((x, y) => x.t - y.t);
    // a later note cuts the one before it short (one voice)
    for (let i = 0; i + 1 < notes.length; i++) if (notes[i].t + notes[i].d > notes[i + 1].t + EPS) notes[i].d = notes[i + 1].t - notes[i].t;
    return { notes, conflicts };
  }

  function toSlots(notes, barQ) {
    barQ = barQ || 4;
    const rhythm = [], pitches = [];
    let at = 0;
    sounding(notes).forEach(n => {
      if (n.t > at + EPS) rhythm.push({ type: "rest", durQ: round(n.t - at) });
      rhythm.push({ type: "note", durQ: round(n.d) }); pitches.push(n.midi);
      at = n.t + n.d;
    });
    if (barQ > at + EPS) rhythm.push({ type: "rest", durQ: round(barQ - at) });
    return { rhythm, pitches };
  }

  const strip = n => { const o = { t: n.t, d: n.d, midi: n.midi }; if (n.elided) o.elided = true; return o; };
  const mod12 = m => ((m % 12) + 12) % 12;
  const round = x => Math.round(x * 1000) / 1000;
  const fmt = q => (near(q, 0.5, 0.01) ? "an eighth" : near(q, 1, 0.01) ? "a beat" : round(q) + " beats");

  const api = { suggest, stitch, toSlots, PICKUPS };
  global.PhraseSeam = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
