// abc-nht.js — names the non-harmonic tones of a melody against its chord symbols.
// Plain script, one global (AbcNHT); loads in Node for tests. Needs abc-core.js and abc-events.js loaded first.
// Not wired into pages yet.
//
//   AbcNHT.analyzeAbc(abc, { voice, extensions })  -> { tones, chords, key, meter }
//   AbcNHT.analyze(sounding, chords, { barQuarters, beatQuarters, ksig, extensions }) -> tones
//        sounding: AbcEvents sounding notes; chords: [{ t, name }] in time order (as AbcEvents.fromAbc gives them)
//   AbcNHT.chordPcs(name, { extensions }) -> { root, bass, pcs: [pitch classes] } or null ("N.C.", "^text")
//   AbcNHT.TYPES                      -> type -> { abbr, name }
//   AbcNHT.cost(sounding, chords, profile)   -> { total, tones } how harmonically unlikely a melody is (see below)
//   AbcNHT.choose(sounding, chords, profile) -> { events, changed, total } picks among pitch candidates (for MelodyDwim)
//
// A tone is one sounding note under one chord. A note held across a chord change is split into pieces there, so a
// tied-over suspension is the second piece of its note (attacked: false). Each tone:
//   { id, piece, t_on, t_off, midi, chord, chordTone, type, abbr, label, accented, attacked, chromatic,
//     direction ("up" | "down" for neighbours, appoggiaturas, escapes, passing tones), figure ("4-3" for suspensions) }
//   type: "chord-tone" | "passing" | "neighbor" | "double-neighbor" | "appoggiatura" | "escape" | "suspension" |
//         "retardation" | "anticipation" | "pedal" | "free" | "no-chord" (before the first chord symbol, or under N.C.)
//
// How each is told, in the order they are tried (a step is 1 or 2 semitones, a leap 3 or more; a rest breaks the line,
// so a tone beside a rest has no neighbour on that side):
//   pedal          the same pitch held or repeated through 3+ chords, a chord tone where it began
//   suspension     the same pitch as the tone before, which was a chord tone of an earlier chord; resolves down by step
//   retardation    as a suspension, resolving up by step
//   anticipation   unaccented; the next tone is the same pitch and a chord tone of the next chord
//   passing        step in, step on in the same direction (a run of passing tones counts; chromatic if by semitones)
//   neighbor       step away from a pitch and step back to it
//   double-neighbor  two non-chord tones: a step to one side of a chord tone, the other side, back to it
//   appoggiatura   leap in, step out the other way
//   escape         step in, leap out the other way
//   free           anything else (leap in and out, or a line broken by a rest)
// Accented means on a beat (a quarter in simple time, a dotted quarter in compound); the accented passing tones and
// neighbours get "accented" in their label.
// Limits: melody only (one voice, the chord symbols are the harmony); steps are by semitones, so an augmented second
// reads as a leap; spelling is not known, so suspension figures come from semitones above the bass.

(function (global) {
  const Core = global.AbcCore || (typeof require === "function" ? require("./abc-core.js") : null);
  const Events = global.AbcEvents || (typeof require === "function" ? require("./abc-events.js") : null);
  if (!Core || !Events) throw new Error("abc-nht.js needs abc-core.js and abc-events.js loaded before it");

  const TYPES = {
    "chord-tone":      { abbr: "CT",  name: "chord tone" },
    "passing":         { abbr: "PT",  name: "passing tone" },
    "neighbor":        { abbr: "NT",  name: "neighbor tone" },
    "double-neighbor": { abbr: "DN",  name: "double neighbor" },
    "appoggiatura":    { abbr: "APP", name: "appoggiatura" },
    "escape":          { abbr: "ET",  name: "escape tone" },
    "suspension":      { abbr: "SUS", name: "suspension" },
    "retardation":     { abbr: "RET", name: "retardation" },
    "anticipation":    { abbr: "ANT", name: "anticipation" },
    "pedal":           { abbr: "PED", name: "pedal tone" },
    "free":            { abbr: "FT",  name: "free tone" },
    "no-chord":        { abbr: "",    name: "no chord" },
  };
  const EPS = 1e-9;
  const pc = m => ((m % 12) + 12) % 12;

  function pcOf(letter, acc) {
    return pc(Core.LETTER_SEMI[letter] + (acc === "#" ? 1 : acc === "b" ? -1 : 0));
  }

  // Chord symbol -> pitch classes. extensions (default true) counts written 9ths, 11ths and 13ths as chord tones.
  function chordPcs(name, opts) {
    const ext = !opts || opts.extensions !== false;
    const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec((name || "").trim());
    if (!m) return null;
    const root = pcOf(m[1], m[2]);
    let q = m[3].replace(/[()]/g, "");
    let third = 4, fifth = 7, seventh = null;
    const adds = [];
    if (/^(ø|m7b5|min7b5|-7b5)/.test(q)) { third = 3; fifth = 6; seventh = 10; q = q.replace(/^(ø7?|m7b5|min7b5|-7b5)/, ""); }
    else if (/^(dim|°|o)/.test(q)) { third = 3; fifth = 6; q = q.replace(/^(dim|°|o)/, ""); if (/^7/.test(q)) { seventh = 9; q = q.slice(1); } }
    else if (/^(aug|\+)/.test(q)) { fifth = 8; q = q.replace(/^(aug|\+)/, ""); }
    else if (/^(min|m(?!aj)|-)/.test(q)) { third = 3; q = q.replace(/^(min|m(?!aj)|-)/, ""); }
    const maj = /^(maj|M|Δ)/.test(q);
    if (maj) q = q.replace(/^(maj|M|Δ)/, "");
    const num = /^(\d+)/.exec(q);
    if (num) {
      const n = +num[1];
      q = q.slice(num[1].length);
      if (n === 6 || n === 69) { adds.push(9); if (n === 69 && ext) adds.push(2); }
      else if (n === 2) adds.push(2);
      else if (n >= 7) {
        if (seventh === null) seventh = maj ? 11 : 10;
        if (ext && n >= 9) adds.push(2);
        if (ext && n >= 11) adds.push(5);
        if (ext && n >= 13) adds.push(9);
      }
    } else if (maj) seventh = 11;                      // "Cmaj", "CM", "CΔ" alone: read as a major seventh chord
    if (/sus2/.test(q)) third = 2;
    else if (/sus/.test(q)) third = 5;
    if (/b5|-5/.test(q)) fifth = 6;
    if (/#5|\+5/.test(q)) fifth = 8;
    const alt = { "b9": 1, "#9": 3, "#11": 6, "b13": 8, "add9": 2, "add2": 2, "add11": 5, "add4": 5 };
    for (const k of Object.keys(alt)) if (q.includes(k)) adds.push(alt[k]);
    const iv = [0, third, fifth].concat(seventh === null ? [] : [seventh], adds);
    const bass = m[4] ? pcOf(m[4], m[5]) : root;
    return { root, bass, pcs: [...new Set(iv.map(i => pc(root + i)))] };
  }

  // the chord sounding at time t (chords sorted by t), or null
  function chordAt(chords, t) {
    let c = null;
    for (const ch of chords) { if (ch.t <= t + EPS) c = ch; else break; }
    return c;
  }

  // a note's pieces, split where the chord changes inside it
  function pieces(sounding, chords) {
    const out = [];
    for (const e of sounding) {
      const cuts = [e.t_on].concat(chords.filter(c => c.t > e.t_on + EPS && c.t < e.t_off - EPS).map(c => c.t), [e.t_off]);
      for (let k = 0; k + 1 < cuts.length; k++)
        out.push({ id: e.id, piece: k, t_on: cuts[k], t_off: cuts[k + 1], midi: e.pitches[0].midi, attacked: k === 0,
                   chord: chordAt(chords, cuts[k]) });
    }
    return out;
  }

  const isStep = d => d !== null && Math.abs(d) >= 1 && Math.abs(d) <= 2;
  const isLeap = d => d !== null && Math.abs(d) >= 3;
  const sign = d => (d > 0 ? 1 : d < 0 ? -1 : 0);

  // generic interval number (1..7) from semitones above the bass; a 2nd that resolves to the octave is a 9th
  const GENERIC = [1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7];
  function figure(midi, resMidi, bass) {
    let a = GENERIC[pc(midi - bass)], b = GENERIC[pc(resMidi - bass)];
    if (b === 1) b = 8;
    if (a === 2 && b === 8) a = 9;
    return a + "-" + b;
  }

  function analyze(sounding, chords, opts) {
    opts = opts || {};
    const barQ = opts.barQuarters || 4;
    const beatQ = opts.beatQuarters || 1;
    const ksig = opts.ksig || null;
    chords = (chords || []).slice().sort((a, b) => a.t - b.t);
    const parsed = new Map();
    const harm = c => {
      if (!c) return null;
      if (!parsed.has(c)) parsed.set(c, chordPcs(c.name, opts));
      return parsed.get(c);
    };
    const ps = pieces(sounding, chords);
    for (const p of ps) {
      const h = harm(p.chord);
      p.h = h;
      p.chordTone = h ? h.pcs.includes(pc(p.midi)) : null;
      const inBar = ((p.t_on % barQ) + barQ) % barQ;
      p.accented = Math.abs(inBar / beatQ - Math.round(inBar / beatQ)) < EPS;
    }
    // outside the key signature (only when a key is given)
    const diatonic = m => {
      if (!ksig) return true;
      return Object.keys(Core.LETTER_SEMI).some(L => pc(Core.LETTER_SEMI[L] + (ksig[L] || 0)) === pc(m));
    };
    const touching = (a, b) => Math.abs(a.t_off - b.t_on) < EPS;   // a rest between them breaks the line

    // pedal: a run of one pitch through 3+ chords, starting as a chord tone
    const pedal = new Set();
    for (let k = 0; k < ps.length; ) {
      let j = k;
      while (j + 1 < ps.length && touching(ps[j], ps[j + 1]) && ps[j + 1].midi === ps[k].midi) j++;
      if (new Set(ps.slice(k, j + 1).map(p => p.chord)).size >= 3 && ps[k].chordTone)
        for (let r = k; r <= j; r++) pedal.add(ps[r]);
      k = j + 1;
    }

    // One pitch repeated or held under one chord is one tone: group those pieces and read each group as a unit.
    const gs = [];
    for (const p of ps) {
      const g = gs[gs.length - 1];
      if (g && touching(g.last, p) && g.midi === p.midi && g.chord === p.chord) { g.members.push(p); g.last = p; }
      else gs.push({ members: [p], last: p, midi: p.midi, chord: p.chord, h: p.h, chordTone: p.chordTone, accented: p.accented });
    }
    gs.forEach((g, k) => {
      g.prev = k > 0 && touching(gs[k - 1].last, g.members[0]) ? gs[k - 1] : null;
      g.next = k + 1 < gs.length && touching(g.last, gs[k + 1].members[0]) ? gs[k + 1] : null;
      g.r = { type: g.h ? (g.chordTone ? "chord-tone" : null) : "no-chord", accented: g.accented };
      if (g.r.type === null && g.members.every(p => pedal.has(p))) g.r.type = "pedal";
    });
    const diff = (a, b) => (a && b ? b.midi - a.midi : null);
    const dir = d => (d > 0 ? "up" : "down");

    for (const g of gs) {
      const r = g.r;
      if (r.type !== null) continue;
      const a = g.prev, b = g.next, dIn = diff(a, g), dOut = diff(g, b);
      // suspension / retardation: prepared by the same pitch as a chord tone under an earlier chord
      if (a && dIn === 0 && a.chordTone && isStep(dOut)) {
        r.type = dOut < 0 ? "suspension" : "retardation";
        r.resolution = b.midi;
        r.figure = figure(g.midi, b.midi, g.h.bass);
        continue;
      }
      if (!g.accented && b && dOut === 0 && b.chordTone) { r.type = "anticipation"; continue; }
      if (isStep(dIn) && isStep(dOut) && sign(dIn) === sign(dOut)) {
        r.type = "passing"; r.direction = dir(dIn);
        if (Math.abs(dIn) === 1 && Math.abs(dOut) === 1) r.chromatic = true;
        continue;
      }
      if (isStep(dIn) && dOut === -dIn) { r.type = "neighbor"; r.direction = dir(dIn); continue; }
      // double neighbor: chord tone, a step to one side, the other side, back
      const c = b && b.next;
      if (a && b && c && a.chordTone && b.r.type === null && c.midi === a.midi &&
          isStep(dIn) && isStep(diff(a, b)) && sign(dIn) === -sign(diff(a, b))) {
        r.type = b.r.type = "double-neighbor";
        r.direction = dir(dIn); b.r.direction = dir(-dIn);
        continue;
      }
      // leap (or silence) in, step out: appoggiatura. Step in, leap out: escape tone. Either way round; `contrary`
      // says whether the line turned (the stricter textbooks ask for that).
      if ((isLeap(dIn) || !a) && isStep(dOut)) {
        r.type = "appoggiatura"; r.direction = dir(-dOut);
        if (a) r.contrary = sign(dIn) === -sign(dOut);
        continue;
      }
      if (isStep(dIn) && isLeap(dOut)) { r.type = "escape"; r.direction = dir(dIn); r.contrary = sign(dIn) === -sign(dOut); continue; }
      r.type = "free";
    }
    const res = [];
    for (const g of gs) for (const p of g.members) res.push(g.r);


    return ps.map((p, k) => {
      const r = res[k], T = TYPES[r.type];
      const nct = r.type !== "chord-tone" && r.type !== "no-chord";
      let label = T.name;
      if (r.type === "neighbor") label = (r.direction === "up" ? "upper " : "lower ") + label;
      if (r.type === "suspension" || r.type === "retardation") label = (r.figure ? r.figure + " " : "") + label;
      if ((r.type === "passing" || r.type === "neighbor") && r.accented) label = "accented " + label;
      if (r.type === "passing" && r.chromatic) label = "chromatic " + label;
      const out = { id: p.id, piece: p.piece, t_on: p.t_on, t_off: p.t_off, midi: p.midi,
                    chord: p.chord ? p.chord.name : null, chordTone: p.chordTone, type: r.type, abbr: T.abbr, label,
                    accented: p.accented, attacked: p.attacked,
                    chromatic: nct ? !diatonic(p.midi) || !!r.chromatic : false };
      if (r.direction) out.direction = r.direction;
      if (r.contrary !== undefined) out.contrary = r.contrary;
      if (r.figure) out.figure = r.figure;
      if (r.resolution !== undefined) out.resolution = r.resolution;
      return out;
    });
  }

  function analyzeAbc(abc, opts) {
    opts = opts || {};
    const ev = Events.fromAbc(abc, { voice: opts.voice });
    const compound = ev.meter.n % 3 === 0 && ev.meter.n > 3 && ev.meter.d === 8;
    const beatQuarters = compound ? 1.5 : 4 / ev.meter.d;
    const tones = analyze(ev.sounding, ev.chords, { barQuarters: ev.barQuarters, beatQuarters,
                                                     ksig: Core.keyAccidentals(ev.key), extensions: opts.extensions });
    return { tones, chords: ev.chords, key: ev.key, meter: ev.meter };
  }

  // ---- Scoring, for a decoder choosing between pitch candidates ----
  // How unlikely each type is in a melody, as a cost (0 = expected). A profile can override any of these.
  const COSTS = {
    "chord-tone": 0, "no-chord": 0, "passing": 0.2, "neighbor": 0.3, "suspension": 0.3, "pedal": 0.3,
    "anticipation": 0.4, "double-neighbor": 0.5, "appoggiatura": 0.5, "retardation": 0.5, "escape": 0.6, "free": 1.5,
  };
  // profile: { nct: { allowed: [types], costs: { type: n }, accented: n, outsideKey: n }, extensions, barQuarters,
  //            beatQuarters, ksig }
  // A type not in `allowed` (when given) costs as much as a free tone. accented (default 0.2) is added to an accented
  // passing tone or neighbour; outsideKey (default 0.3) to a non-chord tone outside the key signature.
  function toneCost(tone, profile) {
    const nct = (profile && profile.nct) || {};
    const costs = Object.assign({}, COSTS, nct.costs);
    let c = costs[tone.type];
    if (nct.allowed && tone.type !== "chord-tone" && tone.type !== "no-chord" && !nct.allowed.includes(tone.type))
      c = Math.max(c, costs.free);
    if (tone.accented && (tone.type === "passing" || tone.type === "neighbor")) c += nct.accented === undefined ? 0.2 : nct.accented;
    if (tone.chromatic) c += nct.outsideKey === undefined ? 0.3 : nct.outsideKey;
    return c;
  }

  // AbcNHT.cost(sounding, chords, profile) -> { total, tones }: each tone gets .cost, weighted by its event's confidence
  // (an event that may not have happened costs less). A note split at a chord change counts once, on its first piece.
  function cost(sounding, chords, profile) {
    const conf = new Map(sounding.map(e => [e.id, e.confidence === undefined ? 1 : e.confidence]));
    const tones = analyze(sounding, chords, profile);
    let total = 0;
    for (const t of tones) {
      t.cost = toneCost(t, profile) * conf.get(t.id);
      total += t.cost;
    }
    return { total, tones };
  }

  // AbcNHT.choose(sounding, chords, profile) -> { events, changed, total }
  // For events with several pitch candidates, picks the pitches that together score best:
  //   score = harmonyWeight * harmony cost - log(candidate p)        (profile.harmonyWeight, default 1)
  // Starts from each event's best candidate and improves one event at a time, judging it on a window of three events each
  // side (what the analysis looks at), until nothing changes. The events come back with the chosen candidate first;
  // the input is not changed. changed: ids of events whose best candidate was replaced.
  function choose(sounding, chords, profile) {
    const w = (profile && profile.harmonyWeight !== undefined) ? profile.harmonyWeight : 1;
    const evs = sounding.map(e => Object.assign({}, e, { pitches: e.pitches.slice() }));
    const pick = evs.map(() => 0);
    const logp = p => Math.log(Math.max(p === undefined ? 1 : p, 1e-6));
    const local = k => {
      const lo = Math.max(0, k - 3), hi = Math.min(evs.length, k + 4);
      const win = evs.slice(lo, hi).map((e, j) => Object.assign({}, e, { pitches: [e.pitches[pick[lo + j]]] }));
      let s = w * cost(win, chords, profile).total;
      for (let j = lo; j < hi; j++) s -= logp(evs[j].pitches[pick[j]].p);
      return s;
    };
    for (let pass = 0, moved = true; moved && pass < 5; pass++) {
      moved = false;
      for (let k = 0; k < evs.length; k++) {
        if (evs[k].pitches.length < 2) continue;
        let best = pick[k], bestS = local(k);
        for (let c = 0; c < evs[k].pitches.length; c++) {
          if (c === best) continue;
          const was = pick[k]; pick[k] = c;
          const s = local(k);
          pick[k] = was;
          if (s < bestS - 1e-9) { best = c; bestS = s; }
        }
        if (best !== pick[k]) { pick[k] = best; moved = true; }
      }
    }
    const changed = [];
    evs.forEach((e, k) => {
      if (pick[k] === 0) return;
      changed.push(e.id);
      const [c] = e.pitches.splice(pick[k], 1);
      e.pitches.unshift(c);
    });
    return { events: evs, changed, total: cost(evs, chords, profile).total };
  }

  const api = { analyzeAbc, analyze, chordPcs, TYPES, COSTS, toneCost, cost, choose };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcNHT = api;
})(typeof window !== "undefined" ? window : globalThis);
