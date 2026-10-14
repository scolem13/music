// abc-events.js — the event model for the notation system: what was written or played, with timing and a confidence.
// Plain script, one global (AbcEvents); loads in Node for tests. Needs abc-core.js loaded first. Not wired into pages yet.
//
// An event:  { id, kind: "note" | "rest", t_on, t_off, pitches: [{ midi, p }], confidence, source, ... }
//   t_on, t_off  quarter notes from the start (beats of a quarter, not seconds; a tempo turns them into seconds)
//   pitches      candidates, best first, each with a probability-like weight p (0..1). From ABC there is exactly one,
//                { midi, p: 1 }. A decoder (MIDI, taps, microphone) may give several; a rest has none.
//   confidence   0..1 that an event happened at all, as timed. 1 from ABC; noisy MIDI or the microphone give less.
//   source       "abc" | "midi" | "tap" | "mic" | ...   (where it came from)
// ABC events also carry bar (0-based), i (character offset in the music text, for colouring noteheads), and for notes
// tieNext (the written note is tied on to the next one), and decos when "!...!" decorations stand before it (["style=rhythm"]).
//
// Two lists, kept apart on purpose:
//   written   one event per notehead or rest as the page draws it (the rhythm assessment colours noteheads by this)
//   sounding  notes as they are heard: a chain of tied noteheads of one pitch is ONE event from the first t_on to the
//             last t_off, with from: [ids of the written events]. Rests are not in this list.
//
//   AbcEvents.fromAbc(abc, { voice })  -> { written, sounding, chords, key, meter, barQuarters, quarters }
//        chords: [{ t, name, bar, i }] the quoted chord symbols ("G7", "Am/C"), each at the time of the note it sits on.
//        marks: [{ t, text, bar, i }] "^text" annotations; fields: [{ t, name, value, bar, i }] inline [K:..] [M:..] (a [K:] changes the
//        key signature for the notes after it).
//        voice: "V1" by default; if the ABC has no [V:] lines every music line is read.
//   AbcEvents.soundingFrom(written)    -> the sounding list for any written list (ties merged)
//   AbcEvents.makeEvent(o)             -> an event with the defaults filled in
// Reads what AbcCore.tokens reads: single notes, rests (z x Z), ties, broken rhythm (> <), bars, written accidentals that
// last to the barline. Not read yet (as in the assessment parsers): chords [CEG], tuplets "(3", grace notes, repeats, voltas.

(function (global) {
  const Core = global.AbcCore || (typeof require === "function" ? require("./abc-core.js") : null);
  if (!Core) throw new Error("abc-events.js needs /apps/shared/abc-core.js loaded before it");

  function makeEvent(o) {
    const e = Object.assign({ kind: "note", pitches: [], confidence: 1, source: "abc" }, o);
    e.pitches = (e.pitches || []).map(p => ({ midi: p.midi, p: p.p === undefined ? 1 : p.p }));
    return e;
  }

  // the text of the music lines for one voice
  function voiceText(abc, voice) {
    const lines = abc.split("\n").map(l => l.trim());
    const hasV = lines.some(l => /^\[V:/.test(l));
    const out = [];
    for (const l of lines) {
      if (!l || /^%/.test(l)) continue;
      if (hasV) {
        const m = /^\[V:\s*([^\]]+)\]/.exec(l);
        if (m && m[1].trim() === voice) out.push(l.slice(m[0].length));
      } else if (!/^[A-Za-z]:/.test(l)) out.push(l);
    }
    return out.join(" ");
  }

  function samePitches(a, b) {
    return a.pitches.length > 0 && a.pitches.length === b.pitches.length &&
           a.pitches.every((p, k) => p.midi === b.pitches[k].midi);
  }

  // Merge tied written notes into sounding notes. A tie that does not meet the same pitch next (or leaves a gap) is dropped.
  function soundingFrom(written) {
    const out = [];
    let open = null;                                   // the sounding event a tie is waiting to extend
    for (const w of written) {
      if (w.kind !== "note") { open = null; continue; }
      if (open && open.tieWaiting && samePitches(open._last, w) && Math.abs(open.t_off - w.t_on) < 1e-9) {
        open.t_off = w.t_off; open.from.push(w.id); open._last = w;
        open.tieWaiting = !!w.tieNext;
        continue;
      }
      open = makeEvent({ id: "s" + out.length, kind: "note", t_on: w.t_on, t_off: w.t_off, pitches: w.pitches,
                         confidence: w.confidence, source: w.source, from: [w.id], tieWaiting: !!w.tieNext });
      Object.defineProperty(open, "_last", { value: w, writable: true, enumerable: false });
      out.push(open);
    }
    out.forEach(e => delete e.tieWaiting);
    return out;
  }

  function fromAbc(abc, opts) {
    const voice = (opts && opts.voice) || "V1";
    const key = Core.keyField(abc).trim();
    let ksig = Core.keyAccidentals(key);
    const meter = Core.meter(abc);
    const L = Core.lUnitQuarters(abc, 0.5);            // quarters per L: unit (1/8 default)
    let barQuarters = meter.n * 4 / meter.d;
    const toks = Core.tokens(voiceText(abc, voice), { decorations: true, fields: true });

    const written = [], chords = [], marks = [], fields = [];
    let t = 0, bar = 0, measureAcc = {}, broken = null;   // broken: { first: event, ch } waiting for its partner
    let pendingBroken = null;                             // ">" or "<" read, applies to the next note/rest
    let decos = [];                                       // "!...!" decorations read, for the next note/rest
    for (const tok of toks) {
      if (tok.t === "bar") {
        if (tok.ch === "|") { bar++; measureAcc = {}; }
        continue;
      }
      if (tok.t === "quote") {
        if (/^[A-G]/.test(tok.text)) chords.push({ t, name: tok.text.trim(), bar, i: tok.i });   // not "^text" annotations
        else if (tok.text[0] === "^") marks.push({ t, text: tok.text.slice(1), bar, i: tok.i });
        continue;
      }
      if (tok.t === "field") {
        fields.push({ t, name: tok.name, value: tok.value, bar, i: tok.i });
        if (tok.name === "K") { ksig = Core.keyAccidentals(tok.value); measureAcc = {}; }
        if (tok.name === "M") { const m = /^(\d+)\/(\d+)/.exec(tok.value); if (m) barQuarters = +m[1] * 4 / +m[2]; }
        continue;
      }
      if (tok.t === "deco") { decos.push(tok.text); continue; }
      if (tok.t === "broken") { pendingBroken = tok.ch; continue; }
      if (tok.t === "tie") { const last = written[written.length - 1]; if (last && last.kind === "note") last.tieNext = true; continue; }
      if (tok.t !== "note" && tok.t !== "rest") continue;
      let dur = tok.mult * (tok.t === "rest" && tok.ch === "Z" ? barQuarters / L : 1) * L;
      const ev = tok.t === "note"
        ? makeEvent({ kind: "note", pitches: [{ midi: Core.noteMidi(tok, ksig, measureAcc), p: 1 }] })
        : makeEvent({ kind: "rest", visible: tok.ch !== "x" });
      ev.id = "w" + written.length; ev.bar = bar; ev.i = tok.i;
      if (tok.t === "note") ev.tieNext = false;
      if (decos.length) { ev.decos = decos; decos = []; }
      // broken rhythm: "A>B" dots the first and halves the second ("<" the other way); the pair's total is unchanged
      if (pendingBroken && written.length) {
        const prev = written[written.length - 1];
        const f = pendingBroken === ">" ? 0.5 : -0.5;
        const pd = prev.t_off - prev.t_on;
        prev.t_off = prev.t_on + pd * (1 + f);
        t = prev.t_off;
        dur = dur * (1 - f);
      }
      pendingBroken = null;
      ev.t_on = t; ev.t_off = t + dur; t = ev.t_off;
      written.push(ev);
    }
    return { written, sounding: soundingFrom(written), chords, marks, fields, key, meter, barQuarters, quarters: t };
  }

  const api = { fromAbc, soundingFrom, makeEvent };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcEvents = api;
})(typeof window !== "undefined" ? window : globalThis);
