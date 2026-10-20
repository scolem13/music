// notation-doc.js — the piece behind the Notation page: chunks of chords, rhythm, pitches and words, entered in any order,
// in one or more voices, written as ABC (and ChordPro). Plain script, one global (NotationDoc); loads in Node for tests.
// Needs abc-core.js and abc-events.js loaded first.
//
// A doc:   { title, meter, key, keyConfirmed, voices: [{ name, clef }], together, chunks: [chunk] }
//   meter, key  the piece's opening meter and key (a chunk can change them from its start on).
//   voices      one or more; voice 0 carries the chords and the words. together: all voices on one staff (stems up / down),
//               else a staff each.
// A chunk: { name, rhythm, pitches, parts, chords, chordLen, words, meter, key }
//   rhythm   voice 0's slots in quarter notes: [{ type: "note" | "rest" | "space", durQ, tie? }] ("space" is an invisible rest;
//            tie: tied to the next note, which carries the same pitch).
//   breaks   (a chunk of pitches only) pitch indices a double barline is drawn before: a way to group them, not real bars.
//   pitches  voice 0's MIDI numbers in order, no durations. Pitch k goes in note slot k. null keeps a slot empty. Note slots with
//            no pitch are written with a slash notehead (!style=rhythm!); pitches past the last slot wait for a rhythm and are
//            written on their own staff (pendingAbc).
//   parts    voices 1.. : [{ rhythm, pitches }] the same way (part(chunk, v) gives any voice, voice 0 being the chunk itself).
//   chords   [{ at, name }], at = quarters from the chunk's start. chordLen: the chunk's length as the chords were entered
//            (typed bars, or a take), so a chunk can be chords only.
//   words    the words as typed. Hyphens split syllables ("Twin-kle twin-kle"); one syllable per note of voice 0.
//   meter, key  a change at the start of this chunk; null = as the chunk before. Written as [M:] / [K:] inline fields.
//   heading, folded  a section (Verse, Chorus) starts at this chunk and runs to the next heading; folded is the sheet's view.
//   hidden           (on a heading) the section's eye is off: the score leaves it out.
//   takes    [{ voice, log, from, bars, sig, lb }]: takes played in (ChordEntry take logs), kept for DWIM; `from` is the chunk bar where
//            the take's bar 1 sits, sig[b] what the take wrote in its bar b (barSig), lb the bar of the log that is the take's bar 1 (0;
//            1 in the chunk after a pickup: the log's bar 0 is the pickup, kept by the Pickup chunk with lb 0 and bars 1). See apps/shared/NOTATION-DWIM.md.
//   lead     quarters before the chunk's first barline (its pickup). Every chunk starts on beat 1 of a bar, or (with a lead) that far
//            before a barline, whatever the chunk before ends on; the gap is filled with rest (offsets(doc); Join writes the rest in).
//   pickup   (first chunk only) the chunk is a pickup bar (anacrusis): it is as long as it is, and the bar after it starts the first
//            full bar. Written as a short first bar; read back from ABC when the first chunk is labelled "Pickup" and is shorter than a bar.
//   band, sectionBand  Backing Track settings for this chunk, and (on a heading chunk) for its section. See tools/_notation.qmd.
// A chunk lasts as long as its longest voice or its chords; shorter voices are padded with invisible rests. A chunk that changes
// meter starts a new bar.
//
//   NotationDoc.create() / newChunk(name) / part(chunk, v) / chunkLen(doc, ci) / at(doc, ci) -> { meter, key }
//   NotationDoc.toAbc(doc)       -> { abc, map: [{ start, end, chunk, voice, slot, filled }] } (one entry per written note or rest)
//   NotationDoc.pendingAbc(doc, { noNames })  -> { abc, map: [{ start, end, chunk, voice, pitch }] } or null when nothing waits
//   NotationDoc.fromAbc(abc)     -> a doc read back: chunks start at "^Name" labels and at inline [M:] / [K:] fields; voices from
//                                   [V:x] lines and %%score; chords from "G7" symbols, words from w: lines under the first voice
//   NotationDoc.toChordPro(doc) / fromChordPro(text, meter) -> ChordPro out (words with [chords]) / in (a chord per bar, or the bars
//                                   between | marks; {comment:} / {start_of_x:} lines start a chunk; a {time:} past the
//                                   first chunk changes the meter from there)
//   NotationDoc.chunkLabels(doc)  -> each chunk in a section named for it: I1a, V1a, PC1a PC1b, C1a, V2a ... (sectionAbbr(name))
//   NotationDoc.info(doc, ci)    -> { bars, chords, rhythm, pitches, words, meter, key, meterChange, keyChange }
//   NotationDoc.hasChanges(doc)
//   NotationDoc.split(doc, ci, bar) / merge(doc, ci) (joins the next chunk on; rests fill out a shorter voice) -> an error message
//                                   or null; duplicate / move / remove
//   NotationDoc.combine(doc, ci, v) -> error or null: voice v of the next chunk folded into this one: rhythm only + pitches only
//                                   become one; two of the same length with both become two voices on one staff
//   NotationDoc.barNotes(doc, ci, v, bar) / prevBar(doc, ci, bar) / writeLeadIn(doc, ci, v, bar, lead, { prefer }) -> a phrase's
//                                   lead-in (pickup) written into the bar(s) before it, stitched with what is there (phrase-seam.js)
//   NotationDoc.parseChords(text, barQ) -> { chords, chordLen } from "G | C D | Em" ("C . . D": "." holds a place); chordsText(chunk, barQ) the other way
//   NotationDoc.syllables(text)  -> [{ s, join }]; setSyllabify(fn) replaces the splitter
//   NotationDoc.addPitch(part, midi), nudge(midi, key, how, dir), letterMidi(letter, prev, key), guessKey(doc), meterInfo(meter),
//   spell(midi, key, barAcc)
(function (global) {
  const Core = global.AbcCore || (typeof require === "function" ? require("./abc-core.js") : null);
  const Events = global.AbcEvents || (typeof require === "function" ? require("./abc-events.js") : null);
  if (!Core || !Events) throw new Error("notation-doc.js needs abc-core.js and abc-events.js loaded before it");

  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const EPS = 1e-6;
  const r3 = x => Math.round(x * 1000) / 1000;

  function newChunk(name) { return { name: name || "", rhythm: [], pitches: [], parts: [], chords: [], chordLen: 0, words: "", meter: null, key: null, heading: null, folded: false, hidden: false, takes: [], pickup: false, lead: 0 }; }
  function create() {
    return { title: "", meter: null, key: null, keyConfirmed: false, voices: [{ name: "1", clef: "treble" }], together: true, chunks: [newChunk("Chunk 1")] };
  }
  // fill in what an older saved doc lacks
  function upgrade(doc) {
    if (!doc.voices) doc.voices = [{ name: "1", clef: "treble" }];
    if (doc.together === undefined) doc.together = true;
    doc.chunks.forEach((c, i) => { const n = newChunk("Chunk " + (i + 1)); Object.keys(n).forEach(k => { if (c[k] === undefined) c[k] = n[k]; }); });
    return doc;
  }

  function meterInfo(meter) {
    const m = /^(\d+)\/(\d+)$/.exec(meter || "");
    if (!m) return null;
    const n = +m[1], d = +m[2];
    const family = d === 8 && n % 3 === 0 && n > 3 ? "triple" : (n === 5 || n === 7 || n === 11 ? "other" : "duple");
    return { n, d, barQ: n * 4 / d, family };
  }

  // keys: an ABC key (tonic + mode: "", m, dor, phr, lyd, mix, loc), or "hm" for harmonic minor (written as the minor key)
  const keyName = k => (k || "C").replace(/hm$/, "m");
  // the major key with the same signature (for chord spelling that only knows major and minor)
  function majorOf(key) {
    const acc = Core.keyAccidentals(keyName(key)), n = Object.values(acc).reduce((s, v) => s + v, 0);
    return n >= 0 ? ["C", "G", "D", "A", "E", "B", "F#", "C#"][n] : ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"][-n];
  }
  function sig(key) { return Core.keyAccidentals(keyName(key)); }
  function sharpish(key) { const s = sig(key); return !Object.values(s).some(v => v < 0); }
  function scalePcs(key) { const s = sig(key); return LETTERS.map(l => (SEMI[l] + (s[l] || 0) + 12) % 12); }

  // ---- chunks and voices ---------------------------------------------------------------------------------------------
  function part(ch, v) {
    if (!v) return ch;
    if (!ch.parts) ch.parts = [];
    while (ch.parts.length < v) ch.parts.push({ rhythm: [], pitches: [] });
    return ch.parts[v - 1];
  }
  const voiceCount = doc => (doc.voices || [1]).length;
  function at(doc, ci) {
    let meter = doc.meter, key = doc.key, tempo = doc.tempo || null;
    for (let i = 0; i <= ci && i < doc.chunks.length; i++) {
      if (doc.chunks[i].meter) meter = doc.chunks[i].meter;
      if (doc.chunks[i].key) key = doc.chunks[i].key;
      if (doc.chunks[i].tempo) tempo = doc.chunks[i].tempo;
    }
    return { meter, key, tempo };
  }
  // where each chunk starts inside its bar, in quarters: where the one before ended, or (a chunk with a lead) a lead before a barline
  function offsets(doc) {
    const out = [];
    let pos = 0, meter;
    doc.chunks.forEach((c, ci) => {
      const a = at(doc, ci), mi = meterInfo(a.meter), len = chunkLen(doc, ci);
      if (a.meter !== meter) pos = 0;
      meter = a.meter;
      if (!mi) { out.push(0); return; }
      let start = 0;
      if (ci === 0 && c.pickup && len < mi.barQ - EPS) start = r3(mi.barQ - len);
      if (c.lead > EPS && c.lead < mi.barQ - EPS) start = r3(mi.barQ - c.lead);
      out.push(start);
      pos = r3((start + len) % mi.barQ);
    });
    return out;
  }
  const DEFAULT_TEMPO = 90;   // when no tempo is set (abcjs's own default is 180)
  const noteSlots = p => p.rhythm.filter(r => r.type === "note").length;
  const lengthQ = p => p.rhythm.reduce((s, r) => s + r.durQ, 0);
  function chunkLen(doc, ci) {
    const ch = doc.chunks[ci];
    let len = ch.chordLen || 0;
    for (let v = 0; v < voiceCount(doc); v++) len = Math.max(len, lengthQ(part(ch, v)));
    if (ch.chords && ch.chords.length) {                       // a chord past the end: to the end of its bar
      const last = ch.chords[ch.chords.length - 1].at, mi = meterInfo(at(doc, ci).meter);
      if (last >= len - EPS) len = mi ? (Math.floor(last / mi.barQ + EPS) + 1) * mi.barQ : last + 1;
    }
    return r3(len);
  }
  const hasRhythm = (doc, ch) => { for (let v = 0; v < voiceCount(doc); v++) if (part(ch, v).rhythm.length) return true; return false; };
  const hasPitches = (doc, ch) => { for (let v = 0; v < voiceCount(doc); v++) if (part(ch, v).pitches.some(p => p != null)) return true; return false; };

  function info(doc, ci) {
    const ch = doc.chunks[ci], here = at(doc, ci), before = ci > 0 ? at(doc, ci - 1) : { meter: null, key: null };
    const mi = meterInfo(here.meter), len = chunkLen(doc, ci);
    return {
      bars: mi && len ? Math.round(len / mi.barQ * 100) / 100 : 0,
      rhythm: hasRhythm(doc, ch), pitches: hasPitches(doc, ch),
      chords: !!(ch.chords && ch.chords.length), words: !!(ch.words && ch.words.trim()),
      meter: here.meter, key: here.key,
      meterChange: ci > 0 && !!here.meter && here.meter !== before.meter,
      keyChange: ci > 0 && !!here.key && here.key !== before.key
    };
  }
  function hasChanges(doc) { return doc.chunks.some((_, i) => { const f = info(doc, i); return f.meterChange || f.keyChange; }); }

  function trim(p) { while (p.pitches.length && p.pitches[p.pitches.length - 1] == null) p.pitches.pop(); }
  const copy = o => JSON.parse(JSON.stringify(o));

  // ---- words ---------------------------------------------------------------------------------------------------------
  let splitter = null;
  function setSyllabify(fn) { splitter = fn; }
  function syllables(text) {
    if (!text || !text.trim()) return [];
    if (splitter) return splitter(text);
    // as in ABC's w: lines: "-" between syllables, "_" holds the syllable before over one more note, "*" skips a note
    const out = [];
    text.trim().split(/\s+/).forEach(w => {
      (w.match(/_|\*|-|[^_*-]+/g) || []).forEach(t => {
        const last = out[out.length - 1];
        if (t === "-") { if (last && !last.hold && !last.skip) last.join = true; }
        else if (t === "_") out.push({ s: "_", join: false, hold: true });
        else if (t === "*") out.push({ s: "*", join: false, skip: true });
        else out.push({ s: t, join: false });
      });
    });
    return out;
  }
  const sylText = list => list.map(x => x.s + (x.join ? "-" : " ")).join("").trim();

  // ---- chords --------------------------------------------------------------------------------------------------------
  // lead: a chunk's pickup (quarters); the first bar typed is the first full bar after it
  function parseChords(text, barQ, lead) {
    lead = lead || 0;
    const bars = (text || "").split("|").map(b => b.trim());
    while (bars.length && !bars[bars.length - 1]) bars.pop();
    const chords = [];
    bars.forEach((b, i) => {
      const names = b.split(/\s+/).filter(Boolean);
      names.forEach((n, j) => { if (n !== ".") chords.push({ at: r3(lead + i * barQ + j * barQ / names.length), name: n }); });   // "." holds a place
    });
    return { chords, chordLen: bars.length ? r3(lead + bars.length * barQ) : 0 };
  }
  function chordsText(ch, barQ, lead) {   // lead given: the bars after it only (chords in the pickup are left out)
    lead = lead || 0;
    const cs = (ch.chords || []).filter(c => c.at >= lead - EPS);
    if (!cs.length || !barQ) return "";
    const n = Math.max(Math.ceil(((ch.chordLen || 0) - lead) / barQ - EPS), Math.floor((cs[cs.length - 1].at - lead) / barQ + EPS) + 1);
    const bars = Array.from({ length: n }, () => []);
    cs.forEach(c => bars[Math.min(n - 1, Math.floor((c.at - lead) / barQ + EPS))].push(c));
    // the fewest equal places in the bar that put every chord on one ("C D": halves; "C . . D": beats 1 and 4)
    return bars.map((b, i) => {
      if (!b.length) return "";
      const off = b.map(c => (c.at - lead - i * barQ) / barQ);
      for (let k = b.length; k <= 48; k++) {
        const pl = off.map(o => o * k);
        if (pl.every(x => Math.abs(x - Math.round(x)) < 1e-3) && new Set(pl.map(Math.round)).size === pl.length) {
          const out = Array(k).fill("."); pl.forEach((x, j) => { out[Math.round(x)] = b[j].name; });
          return out.join(" ");
        }
      }
      return b.map(c => c.name).join(" ");
    }).join(" | ");
  }

  // ---- split, merge, duplicate, move, remove -------------------------------------------------------------------------
  function cutPart(p, cut) {                 // -> [a, b] by time; a note across the cut becomes two of the same pitch
    const a = { rhythm: [], pitches: [] }, b = { rhythm: [], pitches: [] };
    let t = 0, k = 0;
    for (const r of p.rhythm) {
      const end = t + r.durQ, pi = r.type === "note" ? (k < p.pitches.length ? p.pitches[k] : null) : undefined;
      if (end <= cut + EPS) { a.rhythm.push(r); if (pi !== undefined) a.pitches.push(pi); }
      else if (t >= cut - EPS) { b.rhythm.push(r); if (pi !== undefined) b.pitches.push(pi); }
      else {
        a.rhythm.push({ type: r.type, durQ: r3(cut - t) }); b.rhythm.push({ type: r.type, durQ: r3(end - cut) });
        if (pi !== undefined) { a.pitches.push(pi); b.pitches.push(pi); }
      }
      if (r.type === "note") k++;
      t = end;
    }
    b.pitches = b.pitches.concat(p.pitches.slice(k));
    trim(a); trim(b);
    return [a, b];
  }
  function split(doc, ci, bar) {
    const ch = doc.chunks[ci];
    const a = Object.assign(newChunk(ch.name), { meter: ch.meter, key: ch.key, heading: ch.heading || null, folded: !!ch.folded, hidden: !!ch.hidden });
    const b = newChunk((ch.name || "Chunk") + " (2)");
    const len = chunkLen(doc, ci);
    if (!len) {
      const p = ch.pitches;
      if (bar <= 0 || bar >= p.length) return "Pick a note between the first and the last.";
      a.pitches = p.slice(0, bar); b.pitches = p.slice(bar);
      a.words = ch.words; b.words = "";
    } else return splitAt(doc, ci, bar * meterInfo(at(doc, ci).meter).barQ, "Pick a bar between the first and the last.");
    doc.chunks.splice(ci, 1, a, b);
    return null;
  }
  // split chunk ci at `cut` quarters from its start (every voice, its chords and words)
  function splitAt(doc, ci, cut, why) {
    const ch = doc.chunks[ci], len = chunkLen(doc, ci);
    const a = Object.assign(newChunk(ch.name), { meter: ch.meter, key: ch.key, heading: ch.heading || null, folded: !!ch.folded, hidden: !!ch.hidden });
    const b = newChunk((ch.name || "Chunk") + " (2)");
    {
      if (cut <= EPS || cut >= len - EPS) return why || "Pick a note after the first one.";
      for (let v = 0; v < voiceCount(doc); v++) {
        const [pa, pb] = cutPart(part(ch, v), cut);
        Object.assign(part(a, v), pa); Object.assign(part(b, v), pb);
      }
      a.chords = ch.chords.filter(c => c.at < cut - EPS);
      b.chords = ch.chords.filter(c => c.at >= cut - EPS).map(c => ({ at: r3(c.at - cut), name: c.name }));
      if (ch.chordLen) { a.chordLen = Math.min(ch.chordLen, cut); b.chordLen = Math.max(0, r3(ch.chordLen - cut)); }
      const syl = syllables(ch.words), nA = noteSlots(a);
      a.words = sylText(syl.slice(0, nA)); b.words = sylText(syl.slice(nA));
      a.band = ch.band ? copy(ch.band) : null; a.sectionBand = ch.sectionBand ? copy(ch.sectionBand) : null;
      b.band = ch.band ? copy(ch.band) : null;
      const mi = meterInfo(at(doc, ci).meter), cb = mi ? cut / mi.barQ : 0, whole = Math.abs(cb - Math.round(cb)) < EPS;
      a.takes = copy(ch.takes || []);
      b.takes = whole ? copy(ch.takes || []).map(t => Object.assign(t, { from: t.from - Math.round(cb) })).filter(t => t.from + t.bars > 0) : [];
      // the first part keeps where it starts (pickup, lead), tempo and line breaks; a cut inside a bar makes the second part
      // start with a lead up to the next barline, so the barlines stay where they were
      a.pickup = !!ch.pickup; a.lead = ch.lead || 0; if (ch.tempo) a.tempo = ch.tempo; if (ch.off) { a.off = true; b.off = true; }
      if (mi) {
        const off = offsets(doc)[ci] || 0;
        let bl = null; for (let k = 1; k < 100000; k++) { const q = k * mi.barQ - off; if (q > cut - EPS) { bl = q; break; } }
        b.lead = bl != null && bl - cut > EPS ? r3(bl - cut) : 0;
      }
      if (ch.nl) { a.nl = ch.nl.filter(q => q < cut - EPS); b.nl = ch.nl.filter(q => q > cut + EPS).map(q => r3(q - cut)); if (!a.nl.length) delete a.nl; if (!b.nl.length) delete b.nl; }
    }
    doc.chunks.splice(ci, 1, a, b);
    return null;
  }

  function merge(doc, ci) {
    const a = doc.chunks[ci], b = doc.chunks[ci + 1];
    if (!b) return "There is no chunk after this one.";
    if (b.meter && b.meter !== at(doc, ci).meter) return "The next chunk changes the meter, so they can't be one chunk.";
    if (b.key && b.key !== at(doc, ci).key) return "The next chunk changes the key, so they can't be one chunk.";
    if (b.heading) return "The next chunk starts the section " + b.heading + ". Take its heading away first to merge them.";
    const lenA0 = chunkLen(doc, ci), mi0 = meterInfo(at(doc, ci).meter), offs = offsets(doc);
    // meter-aware: rest from where this chunk ends to where the next one starts in its bar (its lead)
    const restQ = mi0 ? r3(((offs[ci + 1] - (offs[ci] + lenA0)) % mi0.barQ + mi0.barQ) % mi0.barQ) : 0;
    const lenA = r3(lenA0 + restQ);
    for (let v = 0; v < voiceCount(doc); v++) {
      const pa = part(a, v);
      if (pa.rhythm.length && pa.pitches.length > noteSlots(pa)) return "This chunk has notes waiting for a rhythm. Give them one, or take them away, first.";
    }
    for (let v = 0; v < voiceCount(doc); v++) {
      const pa = part(a, v), pb = part(b, v), slots = noteSlots(pa);
      const gap = r3(lenA - lengthQ(pa));
      if (gap > EPS && (pb.rhythm.length || pb.pitches.length)) {
        if (restQ > EPS && gap - restQ > EPS) pa.rhythm.push({ type: "rest", durQ: r3(gap - restQ) });   // this voice to the chunk's end, then the rest
        pa.rhythm.push({ type: "rest", durQ: gap - restQ > EPS && restQ > EPS ? restQ : gap });
      }
      if (pb.pitches.length) while (pa.pitches.length < slots) pa.pitches.push(null);
      pa.rhythm = pa.rhythm.concat(pb.rhythm);
      pa.pitches = pa.pitches.concat(pb.pitches);
      trim(pa);
    }
    a.chords = a.chords.concat(b.chords.map(c => ({ at: r3(c.at + lenA), name: c.name })));
    if (a.chordLen || b.chordLen) a.chordLen = r3(lenA + (b.chordLen || 0));
    a.words = [a.words, b.words].filter(w => w && w.trim()).join(" ");
    const mi = meterInfo(at(doc, ci).meter), lb = mi ? lenA / mi.barQ : 0;
    if (mi && Math.abs(lb - Math.round(lb)) < EPS) a.takes = (a.takes || []).concat(copy(b.takes || []).map(t => Object.assign(t, { from: t.from + Math.round(lb) })));
    doc.chunks.splice(ci + 1, 1);
    return null;
  }

  function combine(doc, ci, v) {
    v = v || 0;
    const a = doc.chunks[ci], b = doc.chunks[ci + 1];
    if (!b) return "There is no chunk after this one.";
    if (b.heading) return "The next chunk starts the section " + b.heading + ". Take its heading away first to merge them.";
    const pa = part(a, v), pb = part(b, v), pitched = p => p.pitches.some(x => x != null);
    const kind = p => p.rhythm.length ? (pitched(p) ? "both" : "rhythm") : pitched(p) ? "pitches" : "empty";
    const ka = kind(pa), kb = kind(pb);
    if ((ka === "rhythm" && kb === "pitches") || (ka === "pitches" && kb === "rhythm")) {
      const r = ka === "rhythm" ? pa : pb, q = ka === "rhythm" ? pb : pa;
      pa.rhythm = copy(r.rhythm); pa.pitches = q.pitches.slice(); delete pa.breaks;
    } else if (ka === "both" && kb === "both") {
      if (Math.abs(lengthQ(pa) - lengthQ(pb)) > EPS) return "The two chunks aren't the same length, so they can't be two voices.";
      let w = 1;
      while (w < voiceCount(doc) && (part(a, w).rhythm.length || part(a, w).pitches.length)) w++;
      if (w >= voiceCount(doc)) { doc.voices.push({ name: String(w + 1), clef: doc.voices[v].clef || "treble" }); doc.together = true; }
      const t = part(a, w); t.rhythm = copy(pb.rhythm); t.pitches = pb.pitches.slice();
    } else return "Merge needs a chunk of rhythm only and one of pitches only, or two chunks with both, of the same length (they become two voices). Join puts them one after the other.";
    if (!a.chords.length && b.chords.length) { a.chords = b.chords; a.chordLen = b.chordLen; }
    if (!(a.words || "").trim()) a.words = b.words;
    doc.chunks.splice(ci + 1, 1);
    return null;
  }

  // ---- sections: a chunk with a heading starts one; it runs to the next heading (like an org file) -----------------------
  function sections(doc) {
    const out = [];
    doc.chunks.forEach((c, i) => {
      if (c.heading) { if (out.length) out[out.length - 1].end = i; out.push({ start: i, end: doc.chunks.length, name: c.heading, folded: !!c.folded, hidden: !!c.hidden }); }
    });
    return out;
  }
  function sectionOf(doc, ci) { return sections(doc).find(s => ci >= s.start && ci < s.end) || null; }
  function moveSection(doc, start, dir) {               // -> the section's new start
    const all = sections(doc), k = all.findIndex(s => s.start === start);
    if (k < 0) return start;
    const me = all[k], other = all[k + dir];
    if (!other) return start;
    const block = doc.chunks.splice(me.start, me.end - me.start);
    const ins = dir < 0 ? other.start : me.start + (other.end - other.start);
    doc.chunks.splice(ins, 0, ...block);
    return ins;
  }
  function duplicateSection(doc, start) {
    const s = sections(doc).find(x => x.start === start);
    if (!s) return start;
    const block = copy(doc.chunks.slice(s.start, s.end));
    block[0].heading = s.name + " (copy)";
    doc.chunks.splice(s.end, 0, ...block);
    return s.end;
  }

  // ---- spans of one voice: copy, remove, paste -----------------------------------------------------------------------
  // a span: from { chunk, slot } to { chunk, slot } (inclusive, either order). A clip: [{ type, durQ, pitch }].
  function order(a, b) { return a.chunk < b.chunk || (a.chunk === b.chunk && a.slot <= b.slot) ? [a, b] : [b, a]; }
  function noteIndex(p, slot) { let k = 0; for (let i = 0; i < slot; i++) if (p.rhythm[i].type === "note") k++; return k; }
  function eachInSpan(doc, v, a, b, f) {
    [a, b] = order(a, b);
    for (let ci = a.chunk; ci <= b.chunk; ci++) {
      const p = part(doc.chunks[ci], v), from = ci === a.chunk ? a.slot : 0, to = ci === b.chunk ? b.slot : p.rhythm.length - 1;
      if (to >= from) f(ci, p, from, to);
    }
  }
  function extract(doc, v, a, b) {
    const clip = [];
    eachInSpan(doc, v, a, b, (ci, p, from, to) => {
      let k = noteIndex(p, from);
      for (let s = from; s <= to; s++) {
        const r = p.rhythm[s];
        clip.push({ type: r.type, durQ: r.durQ, pitch: r.type === "note" ? (k < p.pitches.length ? p.pitches[k] : null) : null }); if (r.spell) clip[clip.length - 1].spell = r.spell;
        if (r.type === "note") k++;
      }
    });
    return clip;
  }
  function removeSpan(doc, v, a, b) {
    const spans = [];
    eachInSpan(doc, v, a, b, (ci, p, from, to) => spans.push([p, from, to]));
    spans.forEach(([p, from, to]) => {
      const k0 = noteIndex(p, from), kn = p.rhythm.slice(from, to + 1).filter(r => r.type === "note").length;
      p.rhythm.splice(from, to - from + 1);
      if (k0 < p.pitches.length) p.pitches.splice(k0, kn);
      trim(p);
    });
  }
  // paste after slot `after` of chunk ci (-1: at the start; undefined: at the end)
  function insert(doc, v, ci, after, clip) {
    const p = part(doc.chunks[ci], v);
    const s = after === undefined ? p.rhythm.length : after + 1, k = noteIndex(p, s);
    const notes = clip.filter(c => c.type === "note").map(c => c.pitch);
    if (notes.length) { while (p.pitches.length < k) p.pitches.push(null); p.pitches.splice(k, 0, ...notes); }
    p.rhythm.splice(s, 0, ...clip.map(c => c.spell ? { type: c.type, durQ: c.durQ, spell: c.spell } : { type: c.type, durQ: c.durQ }));
    trim(p);
    return s + clip.length - 1;
  }
  // cut slot si of part p at offQ (quarters into it): two slots of the same kind, a note's tied, its pitch and spelling on both
  function splitSlot(p, si, offQ) {
    const r = p.rhythm[si]; if (!r || offQ <= EPS || offQ >= r.durQ - EPS) return false;
    const a = Object.assign({}, r, { durQ: r3(offQ) }), b = Object.assign({}, r, { durQ: r3(r.durQ - offQ) });
    if (r.type === "note") {
      a.tie = true;
      const k = noteIndex(p, si); if (k < p.pitches.length) p.pitches.splice(k + 1, 0, p.pitches[k]);
    }
    p.rhythm.splice(si, 1, a, b);
    return true;
  }
  function slotTime(p, slot) { let t = 0; for (let i = 0; i < slot; i++) t += p.rhythm[i].durQ; return r3(t); }

  // ---- takes and bars, for DWIM --------------------------------------------------------------------------------------
  // what bar b (0-based, of the chunk) of voice v holds now: its slots (start, length, kind, pitch) as a string
  function barSig(doc, ci, v, b) {
    const mi = meterInfo(at(doc, ci).meter); if (!mi) return "";
    const p = part(doc.chunks[ci], v), t0 = b * mi.barQ, t1 = t0 + mi.barQ, out = [];
    let t = 0, k = 0;
    p.rhythm.forEach(r => {
      const e = t + r.durQ, pi = r.type === "note" ? p.pitches[k++] : null;
      if (e > t0 + EPS && t < t1 - EPS) out.push(r3(Math.max(t, t0) - t0) + ":" + r3(Math.min(e, t1) - Math.max(t, t0)) + ":" + r.type[0] + (pi == null ? "" : pi));
      t = e;
    });
    return out.join(",");
  }
  // remember a take written into chunk ci, voice v, from chunk bar `from` for `bars` bars (a newer take over the same bars wins)
  function keepTake(doc, ci, v, log, from, bars, lb) {
    const ch = doc.chunks[ci];
    ch.takes = (ch.takes || []).filter(t => t.voice !== v || t.from + t.bars <= from || t.from >= from + bars);
    const sig = []; for (let b = 0; b < bars; b++) sig.push(barSig(doc, ci, v, from + b));
    ch.takes.push({ voice: v, log, from, bars, sig, lb: lb || 0 });
  }
  function takeAt(doc, ci, v, bar) { return (doc.chunks[ci].takes || []).find(t => t.voice === v && bar >= t.from && bar < t.from + t.bars) || null; }
  // bars of the take that no longer hold what the take wrote (chunk bar numbers)
  function changedBars(doc, ci, take, a, b) {
    const out = [];
    for (let x = a; x <= b; x++) { const i = x - take.from; if (i < 0 || i >= take.bars || take.sig[i] !== barSig(doc, ci, take.voice, x)) out.push(x); }
    return out;
  }
  // replace chunk bars a..b (inclusive) of voice v with these slots and pitches (they fill exactly those bars)
  function replaceBars(doc, ci, v, a, b, rhythm, pitches) {
    const mi = meterInfo(at(doc, ci).meter), p = part(doc.chunks[ci], v);
    const t0 = a * mi.barQ, t1 = (b + 1) * mi.barQ;
    const [pre, rest] = cutPart(p, t0), [, post] = cutPart(rest, t1 - t0);
    const preGap = r3(t0 - lengthQ(pre));
    const nr = pre.rhythm.concat(preGap > EPS ? [{ type: "rest", durQ: preGap }] : [], rhythm, post.rhythm);
    const np = pre.pitches.slice(); while (np.length < noteSlots(pre)) np.push(null);
    p.rhythm = nr; p.pitches = np.concat(pitches, post.pitches); trim(p);
  }
  // ChordEntry melody bars ([[{ pos, dur, midi, tie }]], positions in units of unitQ quarters, `per` units a bar) -> slots and pitches
  function fromTakeBars(bars, per, unitQ, nb) {
    const rhythm = [], pitches = [];
    let tpos = 0, last = null;
    for (let b = 0; b < nb; b++) {
      (bars[b] || []).slice().sort((x, y) => x.pos - y.pos).forEach(n => {
        const on = b * per + n.pos;
        if (last && last.tie && last.midi === n.midi && Math.abs(last.end - on) < 1e-6) { last.slot.durQ += n.dur * unitQ; last.end = on + n.dur; last.tie = n.tie; tpos = on + n.dur; return; }
        if (on > tpos + 1e-6) rhythm.push({ type: "rest", durQ: (on - tpos) * unitQ });
        const slot = { type: "note", durQ: n.dur * unitQ };
        rhythm.push(slot); pitches.push(n.midi);
        last = { slot, midi: n.midi, end: on + n.dur, tie: n.tie };
        tpos = on + n.dur;
      });
    }
    if (nb * per > tpos + 1e-6) rhythm.push({ type: "rest", durQ: (nb * per - tpos) * unitQ });
    rhythm.forEach(r => { r.durQ = r3(r.durQ); });
    return { rhythm, pitches };
  }

  function duplicate(doc, ci) { const c = copy(doc.chunks[ci]); c.name = (c.name || "Chunk") + " (copy)"; c.heading = null; c.sectionBand = null; doc.chunks.splice(ci + 1, 0, c); }
  function move(doc, ci, dir) {
    const to = ci + dir;
    if (to < 0 || to >= doc.chunks.length) return ci;
    const [c] = doc.chunks.splice(ci, 1); doc.chunks.splice(to, 0, c);   // the piece's opening meter/key stay with the top
    return to;
  }
  function remove(doc, ci) { doc.chunks.splice(ci, 1); if (!doc.chunks.length) doc.chunks.push(newChunk("Chunk 1")); }
  function addPitch(p, midi) { const gap = p.pitches.indexOf(null); if (gap >= 0) p.pitches[gap] = midi; else p.pitches.push(midi); }

  // ---- spelling ----------------------------------------------------------------------------------------------------
  // every way to write a pitch class: [{ l: letter, a: accidental -2..2 }], double sharp first, double flat last
  function enharmonics(midi) {
    const pc = ((midi % 12) + 12) % 12, out = [];
    for (const l of LETTERS) { let a = pc - SEMI[l]; if (a > 6) a -= 12; if (a < -6) a += 12; if (Math.abs(a) <= 2) out.push({ l, a }); }
    return out.sort((x, y) => y.a - x.a);
  }
  // a slot's own spelling ("E@5": write pitch class 5 with the letter E, so E#); it only counts while the pitch class matches
  function wanted(midi, want) {
    const m = want && /^([A-G])@(\d+)$/.exec(want), pc = ((midi % 12) + 12) % 12;
    return m && +m[2] === pc ? enharmonics(midi).find(c => c.l === m[1]) || null : null;
  }
  const ACC = { 2: "^^", 1: "^", 0: "=", "-1": "_", "-2": "__" };
  function spell(midi, key, barAcc, want) {
    const s = sig(key), sharps = sharpish(key);
    const cands = enharmonics(midi).filter(c => Math.abs(c.a) <= 1);
    const effective = l => (barAcc[l] !== undefined ? barAcc[l] : (s[l] || 0));
    let pick = wanted(midi, want);
    if (!pick) pick = cands.find(c => c.a === effective(c.l));          // needs no accidental written
    if (!pick) pick = cands.find(c => c.a === 0) || cands.find(c => c.a === (sharps ? 1 : -1)) || cands[0];
    let acc = "";
    if (pick.a !== effective(pick.l)) { acc = ACC[pick.a]; barAcc[pick.l] = pick.a; }
    const oct = Math.round((midi - pick.a - SEMI[pick.l]) / 12) - 1;    // C4 = 60 is octave 4
    let name = oct >= 5 ? pick.l.toLowerCase() : pick.l;
    if (oct >= 5) name += "'".repeat(oct - 5); else name += ",".repeat(4 - oct);
    return acc + name;
  }

  // a length in sixteenths -> pieces ABC can write in L:1/8 (plain or dotted), largest first
  const WRITABLE = [32, 24, 16, 12, 8, 6, 4, 3, 2, 1];
  const LEN = { 1: "/2", 2: "", 3: "3/2", 4: "2", 6: "3", 8: "4", 12: "6", 16: "8", 24: "12", 32: "16" };
  function pieces(n16) { const out = []; while (n16 > 0) { const w = WRITABLE.find(x => x <= n16); out.push(w); n16 -= w; } return out; }

  // ---- writing ABC ---------------------------------------------------------------------------------------------------
  const vid = (doc, v) => String((doc.voices[v] && doc.voices[v].name) || v + 1).replace(/\s+/g, "_");
  function header(doc, meter) {
    let h = "X:1\n" + (doc.title ? "T:" + doc.title + "\n" : "") + "M:" + (meter || "none") + "\nL:1/8\n";
    const n = voiceCount(doc);
    if (n > 1) {
      const ids = doc.voices.map((_, v) => vid(doc, v));
      h += "%%score " + (doc.together ? "(" + ids.join(" ") + ")" : ids.join(" ")) + "\n";
      doc.voices.forEach((vc, v) => {
        h += "V:" + ids[v] + (vc.clef && vc.clef !== "treble" ? " clef=" + vc.clef : "");
        if (doc.together) h += v === 0 ? " stem=up" : v === n - 1 ? " stem=down" : "";
        h += "\n";
      });
    } else if (doc.voices[0].clef && doc.voices[0].clef !== "treble") h += "V:" + vid(doc, 0) + " clef=" + doc.voices[0].clef + "\n";
    const t0 = at(doc, 0).tempo || DEFAULT_TEMPO;
    return h + "Q:1/4=" + t0 + "\n" + "K:" + keyName(doc.key) + "\n";
  }

  // one voice as bars: [{ items: [{ text, mark? }], syl: [string] }]; every voice gets the same bar lines
  function voiceBars(doc, v) {
    const bars = [];
    let bar = { items: [], syl: [] }, pos16 = 0, prevBar16 = 0, barAcc = {}, any = false;
    let meter = at(doc, 0).meter, key = at(doc, 0).key, tempo = at(doc, 0).tempo || DEFAULT_TEMPO;
    let tempoSet = v === 0 || !doc.chunks.some((c, i) => at(doc, i).tempo && at(doc, i).tempo !== tempo);   // later voices restate it only when it changes
    let barMi = null;
    const chunkBarSeen = {};
    const close = () => { beam(bar, barMi); bars.push(bar); bar = { items: [], syl: [] }; barAcc = {}; };
    doc.chunks.forEach((ch, ci) => {
      const here = at(doc, ci), mi = meterInfo(here.meter);
      if (!mi) return;
      const len = chunkLen(doc, ci);
      if (!len) return;
      const bar16 = Math.round(mi.barQ * 4);
      let fields = "";
      if (here.meter !== meter) { fields += "[M:" + here.meter + "]"; if (any && pos16 % prevBar16 !== 0) close(); pos16 = 0; }
      if (here.key !== key) { fields += "[K:" + keyName(here.key) + "]"; barAcc = {}; }
      // every voice says its tempo changes (abcjs scales each voice from the tempo it last met; a later voice starts from the first one's end)
      const tHere = here.tempo || tempo;
      if (!tempoSet || tHere !== tempo) fields += "[Q:1/4=" + tHere + "]";
      tempo = tHere; tempoSet = true;
      meter = here.meter; key = here.key; prevBar16 = bar16; barMi = mi;
      if (ch.pickup && ci === 0 && !any) { const p16 = Math.round(len * 4); if (p16 < bar16) pos16 = bar16 - p16; }   // a short first bar
      let padIn = 0;                                // every chunk starts on beat 1, or a lead (its pickup) before a barline
      const hasLead = ch.lead > EPS && ch.lead < mi.barQ - EPS, want = hasLead ? bar16 - Math.round(ch.lead * 4) : 0;
      if (hasLead && !any && ci === 0 && pos16 % bar16 === 0) pos16 = want;                 // the piece's first chunk: a short first bar
      else if (!(ch.pickup && ci === 0)) padIn = ((want - pos16 % bar16) + bar16) % bar16;   // else rest up to there
      const p = part(ch, v);
      const slots = p.rhythm.slice();
      if (padIn) slots.unshift({ type: "space", durQ: padIn / 4, padding: true });
      const pad = r3(len - lengthQ(p));
      if (pad > EPS) slots.push({ type: "space", durQ: pad, padding: true });
      const chords = v === 0 ? ch.chords.slice() : [];
      const syl = v === 0 ? syllables(ch.words) : [];
      let t = -padIn / 4, noteK = 0, sylK = 0, firstPiece = true;
      slots.forEach((slot, si) => {
        const pi = slot.type === "note" ? p.pitches[noteK] : undefined;
        const filled = slot.type === "note" && pi != null;
        const midi = slot.type === "note" ? (filled ? pi : 71 + (sig(here.key).B || 0)) : null;   // an empty slot: the key's own B, no accidental
        if (slot.type === "note") noteK++;
        const len16 = Math.round(slot.durQ * 4), tiedOn = si > 0 && slots[si - 1].type === "note" && slots[si - 1].tie && slot.type === "note";
        let left = len16, firstOfSlot = !tiedOn;                                         // a note tied on from the one before takes no syllable
        while (left > 0) {
          const room = bar16 - (pos16 % bar16);
          const nextChord = chords.find(c => c.at > t + EPS);
          const toChord = nextChord ? Math.round((nextChord.at - t) * 4) : Infinity;
          const inBar = pos16 % bar16, beatCut = clearCut(mi, inBar);
          const take = Math.min(left, room, toChord > 0 ? toChord : Infinity, beatCut);
          let piecePos = inBar;
          pieces(take).forEach((pc, k, all) => {
            let pre = "";
            if (firstPiece) {
              pre += fields;
              if (v === 0 && ch.heading) pre += "[P:" + ch.heading.replace(/[\]\n]/g, "") + "]";
              if (v === 0 && doc.chunks.length > 1 && ch.name !== ch.heading) pre += '"^' + (ch.name || "Chunk " + (ci + 1)).replace(/"/g, "'") + '"';
              firstPiece = false;
            }
            while (chords.length && chords[0].at <= t + EPS) pre += '"' + chords.shift().name.replace(/"/g, "") + '"';
            let tok;
            if (slot.type === "rest") tok = "z" + LEN[pc];
            else if (slot.type === "space") tok = "x" + LEN[pc];
            else tok = filled ? spell(midi, here.key, barAcc, slot.spell) + LEN[pc] : "!style=rhythm!B" + LEN[pc];   // an empty slot: never an accidental
            const lastOfSlot = k === all.length - 1 && take === left;
            const item = { pre, tok, tail: slot.type === "note" && (!lastOfSlot || slot.tie) ? "-" : "", pos: piecePos, len: pc, note: slot.type === "note" };
            piecePos += pc;
            if (!slot.padding) item.mark = { chunk: ci, voice: v, slot: si, filled: slot.type === "note" ? filled : null,
              offQ: ((len16 - left) + (item.pos - inBar)) / 4, lenQ: pc / 4, atQ: r3(t), down: item.pos === 0 };   // atQ: from the chunk's start; down: on beat 1          // which piece of the slot this is (a note drawn as tied pieces)
            if (!bar.items.length) { bar.ci = ci; bar.from = r3(t); bar.lead = !chunkBarSeen[ci] && (item.pos > 0 || slot.type === "space"); chunkBarSeen[ci] = true; }
            bar.items.push(item);
            if (slot.type === "note" && v === 0 && syl.length) {
              if (firstOfSlot && sylK < syl.length) { const x = syl[sylK++]; bar.syl.push(x.hold ? "_" : x.skip ? "*" : x.s.replace(/[|*~_-]/g, "") + (x.join ? "-" : "")); }
              else bar.syl.push("*");
            }
            firstOfSlot = false;
            t += pc / 4;
          });
          left -= take; pos16 += take; any = true;
          if (pos16 % bar16 === 0) { bar.endCi = ci; bar.endT = r3(t); close(); }
        }
      });
    });
    if (bar.items.length) { beam(bar, barMi); bars.push(Object.assign(bar, { open: true })); }
    return bars;
  }

  // ---- making it readable: where a note is cut, and which notes are beamed --------------------------------------------
  // In sixteenths from the bar line. 4/4: a note that starts off the beat is cut at the middle of the bar. Compound meters:
  // a note that starts inside a beat is cut at the end of that beat. Irregular meters (5/8, 7/8): at the end of its group.
  function groupStarts(mi) {
    const bar16 = Math.round(mi.barQ * 4);
    if (mi.family === "triple") return range(0, bar16, 6);
    if (mi.family === "other") return mi.n === 5 ? [0, 6] : mi.n === 7 ? [0, 4, 8] : range(0, bar16, 4);
    return range(0, bar16, Math.round(16 / mi.d));
  }
  function range(a, b, step) { const out = []; for (let x = a; x < b; x += step) out.push(x); return out; }
  function clearCut(mi, pos) {
    if (mi.n === 4 && mi.d === 4) return pos % 4 !== 0 && pos < 8 ? 8 - pos : Infinity;
    if (mi.family === "triple" || mi.family === "other") {
      const g = groupStarts(mi), next = g.find(x => x > pos);
      return g.includes(pos) || next === undefined ? Infinity : next - pos;
    }
    return Infinity;
  }
  // notes shorter than a quarter are beamed within a beat (a dotted quarter in compound meters, the 3+2 / 2+2+3 groups in
  // 5/8 and 7/8). Eighths fill a half bar of 4/4, or a whole bar of 2/4 or 3/4, as one beam when nothing else is in it.
  // A rest, a longer note or an inline field breaks the beam.
  function beam(bar, mi) {
    if (!mi) return;
    const bar16 = Math.round(mi.barQ * 4), g = groupStarts(mi);
    const beamable = it => it.note && it.len < 4 && !/\[/.test(it.pre);
    const groupOf = pos => { let k = 0; g.forEach((x, i) => { if (pos >= x) k = i; }); return k; };
    const eighthsOnly = (a, b) => { const its = bar.items.filter(it => it.pos >= a && it.pos < b); return its.length > 1 && its.every(it => it.note && it.len === 2 && !/\[/.test(it.pre)) && its.reduce((s, it) => s + it.len, 0) === b - a; };
    let wide = null;
    if (mi.family === "duple" && mi.d === 4) {
      if ((mi.n === 2 || mi.n === 3) && eighthsOnly(0, bar16)) wide = () => 0;
      else if (mi.n === 4) { const h1 = eighthsOnly(0, 8), h2 = eighthsOnly(8, 16); if (h1 || h2) wide = pos => pos < 8 ? (h1 ? "a" : groupOf(pos)) : (h2 ? "b" : groupOf(pos)); }
    }
    const key = pos => (wide ? wide(pos) : groupOf(pos));
    bar.items.forEach((it, i) => {
      const prev = bar.items[i - 1];
      it.join = !!prev && beamable(prev) && beamable(it) && key(prev.pos) === key(it.pos);
    });
  }

  // where the lines end: after every 4 bars; or, with doc.lineEvery (bars a line, a chunk's pickup bar not counted) or any
  // chunk's own breaks (chunk.nl: barline times from the chunk's start, as RET leaves them), a new line at every chunk too, the
  // count starting again after each break of a chunk's own. -> [{ from, to, manual }] bar indices
  function lineRuns(doc, bars) {
    const every = doc.lineEvery > 0 ? Math.round(doc.lineEvery) : 0, own = doc.chunks.some(c => c.nl && c.nl.length);
    const runs = [];
    if (!every && !own) { for (let l = 0; l < bars.length; l += 4) runs.push({ from: l, to: Math.min(l + 4, bars.length) - 1 }); return runs; }
    let from = 0, count = 0;
    bars.forEach((bar, b) => {
      if (!bar.lead) count++;
      const nx = bars[b + 1], nl = bar.endCi != null && (doc.chunks[bar.endCi].nl || []).some(q => Math.abs(q - bar.endT) < EPS);
      if (!nx || nl || nx.ci !== bar.ci || (every && count >= every)) { runs.push({ from, to: b, manual: !!nl }); from = b + 1; count = 0; }
    });
    return runs;
  }

  function toAbc(doc) {
    doc = upgrade(doc);
    let abc = header(doc, at(doc, 0).meter);
    const map = [], n = voiceCount(doc), lines = [];
    const all = doc.voices.map((_, v) => voiceBars(doc, v));
    const nb = Math.max(0, ...all.map(b => b.length));
    const bars0 = Array.from({ length: nb }, (_, b) => all[0][b] || {});
    lineRuns(doc, bars0).forEach(run => {
      const l = run.from, lEnd = run.to + 1, lineStart = abc.length;
      for (let v = 0; v < n; v++) {
        if (n > 1) abc += "[V:" + vid(doc, v) + "] ";
        const line = [];
        for (let b = l; b < lEnd; b++) {
          const bar = all[v][b];
          if (bar) bar.items.forEach((it, i) => {
            abc += it.pre;
            const start = abc.length;
            abc += it.tok;
            if (it.mark) map.push(Object.assign({ start, end: abc.length }, it.mark));
            const nx = bar.items[i + 1];
            abc += it.tail + (nx && nx.join ? "" : " ");
          });
          const last = b === nb - 1;
          abc += last ? "|]" : "|";
          if (!last && b < lEnd - 1) abc += " ";
          if (bar) line.push(bar.syl.join(" "));
        }
        abc += "\n";
        if (v === 0 && line.some(s => s)) abc += "w: " + line.join(" | ") + "\n";
      }
      const b1 = bars0[run.to];
      lines.push({ start: lineStart, end: abc.length, bars: lEnd - l, manual: run.manual, ci: b1.endCi != null ? b1.endCi : b1.ci, at: b1.endT });
    });
    return { abc, map, lines };
  }

  function pendingAbc(doc, opts) {
    const noNames = opts && opts.noNames;
    doc = upgrade(doc);
    let abc = "X:1\nM:none\nL:1/8\nK:" + keyName(doc.key) + "\n", any = false;
    const map = [];
    doc.chunks.forEach((ch, ci) => {
      const key = at(doc, ci).key;
      for (let v = 0; v < voiceCount(doc); v++) {
        const p = part(ch, v), slots = p.rhythm.length ? noteSlots(p) : 0;
        let named = false;
        for (let k = slots; k < p.pitches.length; k++) {
          if (!slots && k && (p.breaks || []).indexOf(k) >= 0) abc += "|| ";
          if (p.pitches[k] == null) continue;
          const start = abc.length;
          if (!named && !noNames) { named = true; if (any) abc += "|] "; abc += '"^' + (ch.name || "Chunk " + (ci + 1)).replace(/"/g, "'") + (v ? " (" + (doc.voices[v].name || v + 1) + ")" : "") + '"'; }
          abc += spell(p.pitches[k], key, {}) + "2";
          map.push({ start, end: abc.length, chunk: ci, voice: v, pitch: k });
          abc += " "; any = true;
        }
      }
    });
    return any ? { abc: abc + "\n", map } : null;
  }

  // ---- reading ABC back ----------------------------------------------------------------------------------------------
  function wSyllables(abc, firstVoice) {
    // the w: lines under the first voice's music lines -> one entry per written note: a syllable { s, join }, or null ("*" / none)
    const lines = abc.split("\n"), out = [];
    let inFirst = false;
    lines.forEach(l => {
      const t = l.trim();
      const v = /^\[V:\s*([^\]]+)\]/.exec(t);
      if (v) { inFirst = v[1].trim() === firstVoice; return; }
      if (/^w:/.test(t) && (inFirst || firstVoice == null)) {
        t.slice(2).replace(/\|/g, " ").replace(/-/g, "- ").replace(/_/g, " _ ").split(/\s+/).filter(Boolean).forEach(x => {
          if (x === "*") out.push(null);
          else if (x === "_") out.push({ s: "_", join: false, hold: true });
          else out.push({ s: x.replace(/-$/, ""), join: /-$/.test(x) });
        });
      }
    });
    return out;
  }

  function fromAbc(abc) {
    const doc = create();
    const m = /^M:\s*(\d+\/\d+)/m.exec(abc);
    doc.meter = m ? m[1] : null;
    const k = Core.keyField(abc).trim();
    doc.key = k || null; doc.keyConfirmed = !!k;
    const t = /^T:\s*(.*)$/m.exec(abc); if (t) doc.title = t[1].trim();
    // voices: [V:x] music lines, in the order of %%score (or of first use)
    const used = [];
    abc.split("\n").forEach(l => { const v = /^\s*\[V:\s*([^\]]+)\]/.exec(l); if (v && !used.includes(v[1].trim())) used.push(v[1].trim()); });
    const sc = /^%%(?:score|staves)\s+(.*)$/m.exec(abc);
    let ids = used;
    if (sc) { const order = sc[1].match(/[^\s(){}[\]|]+/g) || []; ids = order.filter(x => used.includes(x)).concat(used.filter(x => !order.includes(x))); }
    doc.together = !sc || /\(/.test(sc[1]);
    if (ids.length) doc.voices = ids.map(id => {
      const hl = new RegExp("^V:\\s*" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b(.*)$", "m").exec(abc);
      const cl = hl && /clef=(\w+)/.exec(hl[1]);
      return { name: id, clef: cl ? cl[1] : "treble" };
    });
    const reads = (ids.length ? ids : [null]).map(id => Events.fromAbc(abc, id ? { voice: id } : {}));
    const r0 = reads[0];
    // chunk starts (in quarters), from voice 0's labels and fields
    const starts = [{ t: 0, name: null, meter: null, key: null, heading: null }];
    const startAt = tt => { let s = starts.find(x => Math.abs(x.t - tt) < EPS); if (!s) { s = { t: tt, name: null, meter: null, key: null, heading: null }; starts.push(s); } return s; };
    r0.marks.forEach(x => { startAt(x.t).name = x.text; });
    r0.fields.forEach(f => { const s = startAt(f.t); if (f.name === "M" && /^\d+\/\d+$/.test(f.value)) s.meter = f.value; if (f.name === "K") s.key = f.value; if (f.name === "P") s.heading = f.value; if (f.name === "Q") { const q = /=\s*(\d+)/.exec(f.value); if (q) s.tempo = +q[1]; } });
    starts.sort((a, b) => a.t - b.t);
    starts.forEach((s, i) => { const d = starts[i + 1]; if (d && Math.abs(d.t - s.t) < EPS) { Object.keys(d).forEach(k => { if (d[k] != null) s[k] = d[k]; }); starts.splice(i + 1, 1); } });
    const total = Math.max(...reads.map(r => r.quarters));
    doc.chunks = starts.map((s, i) => Object.assign(newChunk(s.name || s.heading || "Chunk " + (i + 1)), { meter: i ? s.meter : null, key: i ? s.key : null, heading: s.heading || null }));
    const q0 = /^Q:\s*(?:1\/4\s*=\s*)?(\d+)/m.exec(abc); if (q0 && +q0[1] !== DEFAULT_TEMPO) doc.tempo = +q0[1];
    starts.forEach((s, i) => { if (s.tempo && (i || s.tempo !== doc.tempo)) doc.chunks[i].tempo = i ? s.tempo : null; if (!i && s.tempo) doc.tempo = s.tempo; });
    // a chunk that starts inside a bar: its notes up to the barline are its lead (a pickup)
    starts.forEach((s, i) => {
      if (!i) return;
      const ev = r0.written.find(e => Math.abs(e.t_on - s.t) < EPS); if (!ev) return;
      const inBar = r0.written.filter(e => e.bar === ev.bar), nextBar = r0.written.find(e => e.bar > ev.bar);
      const b0 = Math.min(...inBar.map(e => e.t_on)), b1 = nextBar ? nextBar.t_on : null;
      s.atBar = Math.abs(s.t - b0) < EPS;
      if (b1 != null && s.t - b0 > EPS && b1 - s.t > EPS) doc.chunks[i].lead = r3(b1 - s.t);
    });
    if (starts[0].meter) doc.meter = starts[0].meter;
    if (starts[0].key) doc.key = starts[0].key;
    const chunkAt = tt => { let i = 0; while (i + 1 < starts.length && tt >= starts[i + 1].t - EPS) i++; return i; };
    const syl = wSyllables(abc, ids.length ? ids[0] : null);
    reads.forEach((r, v) => {
      let held = null, sylK = 0;
      r.written.forEach(ev => {
        const durQ = ev.t_off - ev.t_on, ci = chunkAt(ev.t_on), p = part(doc.chunks[ci], v);
        if (ev.kind === "note" && v === 0) { const x = syl[sylK++]; if (x) doc.chunks[ci].words += (x.s + (x.join ? "-" : " ")); else if (!held && sylK <= syl.length && syl.slice(sylK).some(Boolean)) doc.chunks[ci].words += "* "; }
        if (held) { held.durQ += durQ; if (!ev.tieNext) held = null; return; }
        if (ev.kind === "rest") { p.rhythm.push({ type: ev.visible === false ? "space" : "rest", durQ }); return; }
        const slot = { type: "note", durQ }, rhy = (ev.decos || []).includes("style=rhythm"), mid = ev.pitches[0].midi;
        // a letter other than the plain spelling's (Fb, E#, B##) is kept on the slot
        if (!rhy && ev.letter) { const kk = at(doc, ci).key || doc.key, plain = spell(mid, kk, {}).replace(/[\^_=,']/g, "").toUpperCase(); if (plain !== ev.letter) slot.spell = ev.letter + "@" + (((mid % 12) + 12) % 12); }
        p.rhythm.push(slot);
        p.pitches.push(rhy ? null : mid);
        if (ev.tieNext) held = slot;
      });
    });
    r0.chords.forEach(c => { const ci = chunkAt(c.t); doc.chunks[ci].chords.push({ at: r3(c.t - starts[ci].t), name: c.name }); });
    doc.chunks.forEach((ch, ci) => {
      ch.words = ch.words.trim();
      for (let v = 0; v < voiceCount(doc); v++) {
        const p = part(ch, v);
        p.rhythm.forEach(s => { s.durQ = r3(s.durQ); });
        while (p.rhythm.length && p.rhythm[p.rhythm.length - 1].type === "space") p.rhythm.pop();   // padding
        trim(p);
      }
      // written by toAbc: a chunk with a lead starts with invisible rest up to it ("^B"x6 D2 |)
      const mL = meterInfo(at(doc, ci).meter), p0 = part(ch, 0), sp = p0.rhythm[0];
      if (ci && starts[ci].atBar && mL && sp && sp.type === "space" && sp.durQ < mL.barQ - EPS && p0.rhythm.length > 1 && !ch.lead) {
        ch.lead = r3(mL.barQ - sp.durQ);
        for (let v = 0; v < voiceCount(doc); v++) { const pv = part(ch, v); if (pv.rhythm[0] && pv.rhythm[0].type === "space") { pv.rhythm.shift(); } }
        ch.chords.forEach(c => { c.at = r3(c.at - sp.durQ); });
      }
      const end = ci + 1 < starts.length ? starts[ci + 1].t : total;
      if (ch.chords.length && !hasRhythm(doc, ch)) ch.chordLen = r3(end - starts[ci].t);
    });
    const mi0 = meterInfo(doc.meter), c0 = doc.chunks[0];
    if (mi0 && doc.chunks.length > 1 && /^pickup$/i.test(c0.name)) { const l0 = starts[1].t; if (l0 > EPS && l0 < mi0.barQ - EPS) c0.pickup = true; }
    return doc;
  }

  // ---- the Backing Track ----------------------------------------------------------------------------------------------
  // The band plays a chord chart: the chords of every chunk, bar by bar, with a P: line wherever the band's settings may change.
  // Settings are kept at three levels and the most particular one wins (like CSS):
  //   doc.band           the whole piece (a Backing Track setup without its chart)
  //   heading chunk .sectionBand   a section (Verse, Chorus): every chunk under the heading
  //   chunk .band        one chunk, which then has settings of its own whatever its section says
  // A chunk with its own settings is a P: section of its own in the chart ("Verse · Line 2"); the chunks after it in the same section get
  // the section's P: again. `focus` ({ chunk } or { section: start }) makes that portion a P: section even with no settings yet, so the
  // Backing Track can show it. Returns { abc, parts: [{ name, nth, key, label }], setup } where key is "piece", "s:<start>" or "c:<ci>"
  // and setup.sections is what the Backing Track's setups carry ({ name, nth, opts, state, sounds }).
  function bandChart(doc, focus) {
    doc = upgrade(doc);
    const first = at(doc, 0), mi0 = meterInfo(first.meter) || meterInfo("4/4");
    let abc = "X:1\nT:" + (doc.title || "Untitled") + "\nM:" + (first.meter || "4/4") + "\nL:1/8\nK:" + keyName(first.key) + "\n";
    const parts = [], seen = {}, sections = [];
    let lastKey = null, meter = first.meter || "4/4", key = first.key, carry = null;
    doc.chunks.forEach((ch, ci) => {
      const here = at(doc, ci), mi = meterInfo(here.meter) || mi0, sec = sectionOf(doc, ci);
      const own = ch.band || (focus && focus.chunk === ci);
      const k = own ? "c:" + ci : sec ? "s:" + sec.start : "piece";
      const len = chunkLen(doc, ci) || 0, nb = Math.max(len ? Math.ceil(len / mi.barQ - EPS) : 0, 0);
      if (!nb) return;
      let pre = "";
      if (k !== lastKey || ch.heading) {
        const label = own ? (sec ? sec.name + " \u00b7 " : "") + (ch.name || "Chunk " + (ci + 1)) : sec ? sec.name : (ch.name || "Chunk " + (ci + 1));
        const name = label.replace(/[\n%]/g, " ").trim(), low = name.toLowerCase(), nth = seen[low] | 0; seen[low] = nth + 1;
        parts.push({ name, nth, key: k, label });
        const st = own ? ch.band : sec ? doc.chunks[sec.start].sectionBand : null;
        if (st && st.opts && st.state) sections.push({ name, nth, opts: st.opts, state: st.state, sounds: st.sounds || [] });
        abc += "P:" + name + "\n"; lastKey = k;
      }
      if (here.meter && here.meter !== meter) { pre += "[M:" + here.meter + "]"; meter = here.meter; }
      if (here.key !== key) { pre += "[K:" + keyName(here.key) + "]"; key = here.key; }
      const bar8 = Math.round(mi.barQ * 2), bars = [];
      for (let b = 0; b < nb; b++) {
        const t0 = b * mi.barQ, cs = ch.chords.filter(c => c.at >= t0 - EPS && c.at < t0 + mi.barQ - EPS);
        let txt = "", pos = 0;
        if (!cs.length || cs[0].at > t0 + EPS) { if (carry && !cs.length) txt += '"' + carry + '"'; }
        cs.forEach((c, j) => {
          const p8 = Math.round((c.at - t0) * 2);
          if (p8 > pos) { txt += "z" + (p8 - pos) + " "; pos = p8; }
          txt += '"' + c.name.replace(/"/g, "") + '"'; carry = c.name;
        });
        txt += "z" + Math.max(1, bar8 - pos);
        bars.push(txt);
      }
      abc += pre + bars.join(" | ") + " |\n";
    });
    const setup = Object.assign({}, doc.band || {}, { sections });
    delete setup.abc; delete setup.pins; delete setup.pinsAuto;
    return { abc, parts, setup };
  }
  // what the Backing Track reported (its setup) -> stored at the levels the chart's P: sections stand for
  function takeBand(doc, parts, setup) {
    const piece = Object.assign({}, setup); delete piece.abc; delete piece.sections; delete piece.pins; delete piece.pinsAuto; delete piece.name;
    doc.band = piece;
    const got = {};
    (setup.sections || []).forEach(e => { const p = parts.find(x => x.name.toLowerCase() === String(e.name).trim().toLowerCase() && x.nth === (e.nth | 0)); if (p) got[p.key] = { opts: e.opts, state: e.state, sounds: e.sounds || [] }; });
    parts.forEach(p => {
      const v = got[p.key] || null;
      if (p.key[0] === "c") doc.chunks[+p.key.slice(2)].band = v;
      else if (p.key[0] === "s") doc.chunks[+p.key.slice(2)].sectionBand = v;
    });
  }
  // what a portion is played with, for the sheet: { level: "chunk" | "section" | "piece" | null, state }
  function bandOf(doc, ci, sectionOnly) {
    const ch = doc.chunks[ci], sec = sectionOf(doc, ci);
    if (!sectionOnly && ch.band) return { level: "chunk", state: ch.band.state };
    if (sec && doc.chunks[sec.start].sectionBand) return { level: "section", state: doc.chunks[sec.start].sectionBand.state };
    if (doc.band && doc.band.style) return { level: "piece", state: doc.band };
    return { level: null, state: null };
  }

  // ---- chunk labels: each chunk named for its section -------------------------------------------------------------
  // The section's short form, the how-manyth time that kind of section comes, and a letter for the chunk within it:
  // Intro I1a, Verse V1a, Pre-Chorus PC1a PC1b, Chorus C1a, the second Verse V2a, Bridge B1a; in an AABA tune A1a A2a B1a
  // B1b A3a. Section headings keep their names; chunks before the first section keep theirs.
  const ABBR = [[/^intro/i, "I"], [/^pre-?\s*chorus/i, "PC"], [/^chorus/i, "C"], [/^refrain/i, "R"], [/^verse/i, "V"], [/^bridge/i, "B"],
    [/^middle\s*8/i, "M"], [/^solo/i, "S"], [/^instrumental/i, "Inst"], [/^interlude/i, "Int"], [/^breakdown/i, "Bd"], [/^break/i, "Br"],
    [/^outro/i, "O"], [/^coda/i, "Co"], [/^tag/i, "T"], [/^vamp/i, "Va"], [/^head/i, "H"], [/^ending/i, "E"], [/^turnaround/i, "TA"]];
  function sectionAbbr(name) {
    const n = String(name || "").trim();
    for (const [re, a] of ABBR) if (re.test(n)) return a;
    const m = /^([A-H])\d*$/.exec(n);
    if (m) return m[1];
    const init = n.split(/[\s\-_]+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0].toUpperCase()).join("");
    return init || "X";
  }
  function chunkLabels(doc) {
    const count = {};
    sections(doc).forEach(sec => {
      const a = sectionAbbr(sec.name), k = count[a] = (count[a] || 0) + 1;
      for (let i = sec.start; i < sec.end; i++) doc.chunks[i].name = a + k + String.fromCharCode(97 + Math.min(25, i - sec.start));
    });
    return doc;
  }

  // ---- ChordPro --------------------------------------------------------------------------------------------------------
  function toChordPro(doc) {
    doc = upgrade(doc);
    const out = [];
    if (doc.title) out.push("{title: " + doc.title + "}");
    if (doc.key && doc.keyConfirmed) out.push("{key: " + doc.key + "}");
    if (doc.meter) out.push("{time: " + doc.meter + "}");
    const kind = name => (/chorus|refrain/i.test(name) ? "chorus" : /bridge/i.test(name) ? "bridge" : /verse/i.test(name) ? "verse" : null);
    let open = null;
    const secs = sections(doc);
    doc.chunks.forEach((ch, ci) => {
      if (ch.heading) {
        if (open) out.push("{end_of_" + open + "}");
        open = kind(ch.heading);
        out.push("", open ? "{start_of_" + open + ": " + ch.heading + "}" : "{comment: " + ch.heading + "}");
      } else if (!secs.length || ci < secs[0].start) open = (open && out.push("{end_of_" + open + "}"), null);
      const sec = sectionOf(doc, ci);
      if (!sec || (sec.end - sec.start > 1 && ch.name !== ch.heading)) out.push((sec ? "" : "\n") + "{comment: " + (ch.name || "Chunk " + (ci + 1)) + "}");
      const syl = syllables(ch.words), chords = ch.chords.slice();
      if (!syl.length) {
        const mi = meterInfo(at(doc, ci).meter);
        const txt = mi ? chordsText(ch, mi.barQ) : chords.map(c => c.name).join(" ");
        if (txt) out.push(txt.split(" | ").map(b => b.split(" ").map(n => "[" + n + "]").join(" ")).join(" | "));
        return;
      }
      // each syllable's time: the onset of its note in voice 0
      const times = []; let tt = 0;
      ch.rhythm.forEach(r => { if (r.type === "note") times.push(tt); tt += r.durQ; });
      let line = "";
      syl.forEach((x, i) => {                              // a chord goes before the syllable it starts under (or during)
        const next = i + 1 < times.length && i + 1 < syl.length ? times[i + 1] : Infinity;
        while (chords.length && chords[0].at < next - EPS) line += "[" + chords.shift().name + "]";
        if (!x.hold && !x.skip) line += x.s + (x.join ? "" : " ");
      });
      chords.forEach(c => { line += "[" + c.name + "]"; });
      out.push(line.trim());
    });
    if (open) out.push("{end_of_" + open + "}");
    // the notes as well, so the file is the whole song: ChordPro's own ABC block (fromChordPro reads it back)
    if (doc.chunks.some(ch => hasRhythm(doc, ch))) out.push("", "{start_of_abc}", toAbc(doc).abc.trim(), "{end_of_abc}");
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }
  // a {start_of_abc} block -> { abc, rest } (the ChordPro without it)
  function abcBlock(text) {
    const m = /^[ \t]*\{\s*start_of_abc[^}]*\}[ \t]*\n([\s\S]*?)^[ \t]*\{\s*end_of_abc\s*\}[ \t]*$/m.exec(text || "");
    return m ? { abc: m[1], rest: text.slice(0, m.index) + text.slice(m.index + m[0].length) } : null;
  }

  // With an ABC block the notes come from it, and the words of each chunk from the ChordPro above it (matched by chunk name,
  // else in order), so words edited in the ChordPro win.
  function fromChordPro(text, meter) {
    const blk = abcBlock(text);
    if (blk && /^\s*K:/m.test(blk.abc)) {
      const doc = upgrade(fromAbc(blk.abc)), words = chordProOnly(blk.rest, doc.meter || meter);
      const t = /\{\s*(?:title|t)\s*:\s*([^}]*)\}/i.exec(blk.rest); if (t) doc.title = t[1].trim();
      const named = {}; words.chunks.forEach((c, i) => { if (c.name && !(c.name in named)) named[c.name] = i; });
      const withWords = words.chunks.filter(c => (c.words || "").trim());
      doc.chunks.forEach((ch, i) => {
        const j = ch.name in named ? named[ch.name] : (words.chunks.length === doc.chunks.length ? i : -1);
        if (j >= 0 && plainWords(words.chunks[j].words) !== plainWords(ch.words)) ch.words = respell(words.chunks[j].words || "", ch.words);
        else if (doc.chunks.length === 1 && withWords.length) ch.words = withWords.map(c => c.words).join(" ");
      });
      return doc;
    }
    return chordProOnly(blk ? blk.rest : text, meter);
  }
  // words edited in the ChordPro (written there whole: "zoodle,") keep the syllables, holds and skips the ABC gave each
  // word that is still there ("zoo-dle,_"), so they stay under the same notes
  function respell(text, abcWords) {
    const key = w => w.replace(/[-_*]/g, "");
    const old = (abcWords || "").trim().split(/\s+/).filter(Boolean), used = [];
    let from = 0;
    return text.trim().split(/\s+/).filter(Boolean).map(w => {
      for (let k = from; k < old.length; k++) if (!used[k] && key(old[k]) === w) { used[k] = true; from = k + 1; return old[k] + (old[k + 1] && !key(old[k + 1]) ? " " + old[k + 1] : ""); }
      return w;
    }).join(" ");
  }
  const plainWords = w => syllables(w).filter(x => !x.hold && !x.skip).map(x => x.s + (x.join ? "" : " ")).join("").replace(/\s+/g, " ").trim();
  function chordProOnly(text, meter) {
    const doc = create();
    doc.meter = meter || null;
    const tm = /\{\s*(?:time)\s*:\s*(\d+\/\d+)\s*\}/i.exec(text); if (tm) doc.meter = tm[1];
    const km = /\{\s*key\s*:\s*([A-G][#b]?m?)\s*\}/i.exec(text); if (km) { doc.key = km[1]; doc.keyConfirmed = true; }
    const ti = /\{\s*(?:title|t)\s*:\s*([^}]*)\}/i.exec(text); if (ti) doc.title = ti[1].trim();
    const mi = meterInfo(doc.meter) || meterInfo("4/4");
    doc.chunks = [];
    let cur = null;
    const start = (name, heading) => { cur = newChunk(name || "Chunk " + (doc.chunks.length + 1)); cur.heading = heading || null; cur._bars = []; cur._words = []; doc.chunks.push(cur); };
    text.split("\n").forEach(raw => {
      const l = raw.trim();
      const d = /^\{\s*([a-z_]+)\s*(?::\s*([^}]*))?\}$/i.exec(l);
      if (d) {
        const name = d[1].toLowerCase(), val = (d[2] || "").trim();
        // a {time:} after the first chunk: a meter change from the chunk it is in (or the next one) on
        if (name === "time" && doc.chunks.length && /^\d+\/\d+$/.test(val)) { if (cur._bars.length || cur._words.length) start(); cur.meter = val === (at(doc, doc.chunks.length - 1).meter) && !cur.meter ? null : val; return; }
        if (/^(c|comment|ci|comment_italic)$/.test(name)) start(val);
        else if (/^(soc|sov|sob|start_of_\w+)$/.test(name)) { const h = val || name.replace(/^start_of_|^so/, "").replace(/^c$/, "Chorus").replace(/^v$/, "Verse").replace(/^b$/, "Bridge"); start(h, h); }
        return;
      }
      if (!l) return;
      if (!cur) start();
      const hasBars = /\|/.test(l);
      if (hasBars) l.split("|").map(b => b.trim()).filter(Boolean).forEach(b => cur._bars.push((b.match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1))));
      else (l.match(/\[([^\]]+)\]/g) || []).forEach(x => cur._bars.push([x.slice(1, -1)]));
      const words = l.replace(/\[[^\]]*\]/g, "").replace(/\|/g, " ").trim();
      if (words) cur._words.push(words);
    });
    if (!doc.chunks.length) start();
    doc.chunks.forEach(ch => {
      const p = parseChords(ch._bars.map(b => b.join(" ")).join(" | "), (meterInfo(at(doc, doc.chunks.indexOf(ch)).meter) || mi).barQ);
      ch.chords = p.chords; ch.chordLen = ch._bars.length ? p.chordLen : 0;
      ch.words = ch._words.join(" ").replace(/\s+/g, " ");
      delete ch._bars; delete ch._words;
    });
    return doc;
  }

  // ---- entering and moving notes -------------------------------------------------------------------------------------
  function nudge(midi, key, how, dir) {
    if (how === "semi") return midi + dir;
    if (how === "octave") return midi + 12 * dir;
    const pcs = scalePcs(key);
    let m = midi;
    for (let i = 0; i < 12; i++) { m += dir; if (pcs.includes(((m % 12) + 12) % 12)) return m; }
    return midi + dir;
  }
  function letterMidi(letter, prev, key) {
    const l = letter.toUpperCase();
    let pc = (SEMI[l] + (sig(key)[l] || 0) + 12) % 12;
    if (/hm$/.test(key || "")) {                    // harmonic minor: the seventh degree raised
      const t = /^([A-G])([#b]?)/.exec(key), tpc = (SEMI[t[1]] + (t[2] === "#" ? 1 : t[2] === "b" ? -1 : 0) + 12) % 12;
      if (pc === (tpc + 10) % 12) pc = (pc + 1) % 12;
    }
    const near = prev == null ? 64 : prev;
    let best = null;
    for (let m = near - 6; m <= near + 6; m++) if (((m % 12) + 12) % 12 === pc && (best === null || Math.abs(m - near) < Math.abs(best - near))) best = m;
    return best;
  }

  // Krumhansl–Kessler key profiles, each note weighted by its length (1 when it has no rhythm yet)
  const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const MAJ_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const MIN_NAMES = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
  function corr(a, b) {
    const ma = a.reduce((s, x) => s + x, 0) / 12, mb = b.reduce((s, x) => s + x, 0) / 12;
    let n = 0, da = 0, db = 0;
    for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return da && db ? n / Math.sqrt(da * db) : 0;
  }
  function guessKey(doc) {
    doc = upgrade(doc);
    const w = new Array(12).fill(0);
    let count = 0;
    doc.chunks.forEach(ch => {
      for (let v = 0; v < voiceCount(doc); v++) {
        const p = part(ch, v), lens = p.rhythm.filter(r => r.type === "note").map(r => r.durQ);
        p.pitches.forEach((m, k) => { if (m == null) return; w[((m % 12) + 12) % 12] += lens[k] || 1; count++; });
      }
    });
    if (count < 4) return null;
    let best = null;
    for (let t = 0; t < 12; t++) {
      const rot = p => p.map((_, i) => p[(i - t + 12) % 12]);
      const a = corr(w, rot(MAJ)), b = corr(w, rot(MIN));
      if (!best || a > best.score) best = { key: MAJ_NAMES[t], score: a };
      if (b > best.score) best = { key: MIN_NAMES[t], score: b };
    }
    return best;
  }

  // ---- phrase lead-ins (a phrase transcribed on its own; apps/shared/NOTATION-DWIM.md, "Phrase seams") ------------------
  // one voice's notes in chunk bar `bar`: [{ t, d, midi }] in quarters from the bar's start (slash notes have midi null)
  function barNotes(doc, ci, v, bar) {
    const mi = meterInfo(at(doc, ci).meter) || meterInfo("4/4"), ch = doc.chunks[ci];
    const len = ch.pickup && ci === 0 ? chunkLen(doc, ci) : mi.barQ;
    const [, rest] = cutPart(part(ch, v), bar * mi.barQ), [inBar] = cutPart(rest, len);
    const out = []; let t = 0, k = 0;
    for (const r of inBar.rhythm) {
      if (r.type === "note") { out.push({ t: r3(t), d: r.durQ, midi: k < inBar.pitches.length ? inBar.pitches[k] : null }); k++; }
      t += r.durQ;
    }
    return out;
  }
  // notes -> slots filling `len` quarters, gaps as rests; then written over chunk bar `bar`
  function slotsOf(notes, len) {
    const rhythm = [], pitches = []; let t = 0;
    notes.slice().sort((x, y) => x.t - y.t).forEach(n => {
      if (n.t > t + EPS) rhythm.push({ type: "rest", durQ: r3(n.t - t) });
      const d = Math.min(n.d, len - n.t); if (d <= EPS) return;
      rhythm.push({ type: "note", durQ: r3(d) }); pitches.push(n.midi); t = n.t + d;
    });
    if (len > t + EPS) rhythm.push({ type: "rest", durQ: r3(len - t) });
    return { rhythm, pitches };
  }
  function writeBar(doc, ci, v, bar, notes) { const mi = meterInfo(at(doc, ci).meter) || meterInfo("4/4"), s = slotsOf(notes, mi.barQ); replaceBars(doc, ci, v, bar, bar, s.rhythm, s.pitches); }
  // the bar before chunk bar `bar` of chunk ci: { ci, bar } (the last bar of the chunk before), or null at the top of the piece
  function prevBar(doc, ci, bar) {
    if (bar > 0) return { ci, bar: bar - 1 };
    if (ci === 0) return null;
    const mi = meterInfo(at(doc, ci - 1).meter) || meterInfo("4/4"), len = chunkLen(doc, ci - 1);
    return { ci: ci - 1, bar: doc.chunks[ci - 1].pickup && ci - 1 === 0 ? 0 : Math.max(0, Math.ceil(len / mi.barQ - EPS) - 1) };
  }
  // A phrase's lead-in, written before chunk bar `bar` of chunk ci in voice v. lead: [{ t, d, midi }], t < 0 in quarters before
  // that downbeat. The bar just before is the seam bar: what is there already (the end of the phrase before) is stitched with the
  // lead-in (PhraseSeam.stitch, the line at the lead-in's first note; opts.prefer "a" keeps the old notes where both sound, default
  // "b" the lead-in). A bar further back is the lead-in's own. At the top of the piece the lead-in becomes a Pickup chunk (a short
  // first bar), or a Pickup chunk and a whole bar when it is longer than a bar.
  //   -> { conflicts, line: { ci, bar, t } | null, inserted: chunks added before ci (ci moves by that many) }
  function writeLeadIn(doc, ci, v, bar, lead, opts) {
    opts = opts || {};
    const Seam = global.PhraseSeam || (typeof require === "function" ? require("./phrase-seam.js") : null);
    const notes = (lead || []).filter(n => n.t < -EPS).map(n => ({ t: n.t, d: Math.min(n.d, -n.t), midi: n.midi }));
    const res = { conflicts: [], line: null, inserted: 0 };
    if (!notes.length) return res;
    const mi = meterInfo(at(doc, ci).meter) || meterInfo("4/4"), barQ = mi.barQ, t0 = Math.min(...notes.map(n => n.t));
    const seam = prevBar(doc, ci, bar);
    // the top of the piece: a Pickup chunk (and a whole bar before the downbeat when the lead-in is longer than a bar)
    if (!seam || (seam.ci === 0 && doc.chunks[0].pickup && ci > 0 && bar === 0)) {
      let have = [], oldLen = 0;
      if (seam) { oldLen = chunkLen(doc, 0); have = barNotes(doc, 0, v, 0).map(n => ({ t: n.t - oldLen, d: n.d, midi: n.midi })); doc.chunks.splice(0, 1); ci--; res.inserted--; }
      const whole = -t0 > barQ - EPS, made = [];
      const inLast = notes.filter(n => n.t >= -barQ - EPS);
      const merged = Seam ? Seam.stitch(have.map(n => ({ t: n.t + barQ, d: n.d, midi: n.midi })), inLast.map(n => ({ t: n.t + barQ, d: n.d, midi: n.midi })), Math.min(...inLast.map(n => n.t)) + barQ, { barQ, prefer: opts.prefer }) : { notes: inLast.map(n => ({ t: n.t + barQ, d: n.d, midi: n.midi })), conflicts: [] };
      res.conflicts = merged.conflicts;
      if (whole) {
        const early = notes.filter(n => n.t < -barQ - EPS), len = r3(Math.min(barQ - 0.25, -t0 - barQ));
        const pc = newChunk("Pickup"), s = slotsOf(early.map(n => ({ t: r3(n.t + barQ + len), d: n.d, midi: n.midi })), len);
        pc.pickup = true; Object.assign(part(pc, v), s); made.push(pc);
        const lc = newChunk("Lead-in"), s2 = slotsOf(merged.notes, barQ); Object.assign(part(lc, v), s2); made.push(lc);
      } else {
        const len = r3(barQ - Math.min(...merged.notes.map(n => n.t)));
        const pc = newChunk("Pickup"), s = slotsOf(merged.notes.map(n => ({ t: r3(n.t - (barQ - len)), d: n.d, midi: n.midi })), len);
        pc.pickup = true; Object.assign(part(pc, v), s); made.push(pc);
      }
      doc.chunks.splice(0, 0, ...made); res.inserted += made.length;
      res.line = { ci: made.length - 1, bar: 0, t: null };
      return res;
    }
    // the seam bar: the end of the phrase before (A) and the lead-in's last bar (B)
    const sb = notes.filter(n => n.t >= -barQ - EPS).map(n => ({ t: r3(n.t + barQ), d: n.d, midi: n.midi }));
    if (sb.length) {
      const line = Math.min(...sb.map(n => n.t)), a = barNotes(doc, seam.ci, v, seam.bar);
      const st = Seam ? Seam.stitch(a, sb, line, { barQ, prefer: opts.prefer }) : { notes: a.filter(n => n.t < line).concat(sb), conflicts: [] };
      writeBar(doc, seam.ci, v, seam.bar, st.notes);
      res.conflicts = st.conflicts; res.line = { ci: seam.ci, bar: seam.bar, t: line };
    }
    // a bar further back: all the lead-in's
    const early = notes.filter(n => n.t < -barQ - EPS);
    const back = early.length && prevBar(doc, seam.ci, seam.bar);
    if (back) writeBar(doc, back.ci, v, back.bar, early.map(n => ({ t: r3(n.t + 2 * barQ), d: Math.min(n.d, -barQ - n.t), midi: n.midi })));
    return res;
  }

  const api = { splitSlot, enharmonics, wanted, sharpish, chunkLabels, sectionAbbr, bandChart, takeBand, bandOf, barSig, keepTake, takeAt, changedBars, replaceBars, fromTakeBars, splitAt, sections, sectionOf, moveSection, duplicateSection, extract, removeSpan, insert, slotTime, create, upgrade, newChunk, part, chunkLen, meterInfo, spell, toAbc, pendingAbc, fromAbc, toChordPro, fromChordPro, at, info,
                hasChanges, split, merge, combine, offsets, majorOf, keyName, duplicate, move, remove, addPitch, nudge, letterMidi, guessKey, scalePcs, parseChords, chordsText,
                syllables, setSyllabify, barNotes, prevBar, writeLeadIn };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.NotationDoc = api;
})(typeof window !== "undefined" ? window : globalThis);
