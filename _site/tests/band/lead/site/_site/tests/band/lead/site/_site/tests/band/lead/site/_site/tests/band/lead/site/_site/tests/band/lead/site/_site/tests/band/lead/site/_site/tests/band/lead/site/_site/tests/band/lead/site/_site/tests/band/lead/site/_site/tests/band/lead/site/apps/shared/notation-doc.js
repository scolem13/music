// notation-doc.js — the piece behind the Notation page: chunks of chords, rhythm, pitches and words, entered in any order,
// in one or more voices, written as ABC (and ChordPro). Plain script, one global (NotationDoc); loads in Node for tests.
// Needs abc-core.js and abc-events.js loaded first.
//
// A doc:   { title, meter, key, keyConfirmed, voices: [{ name, clef }], together, chunks: [chunk] }
//   meter, key  the piece's opening meter and key (a chunk can change them from its start on).
//   voices      one or more; voice 0 carries the chords and the words. together: all voices on one staff (stems up / down),
//               else a staff each.
// A chunk: { name, rhythm, pitches, parts, chords, chordLen, words, meter, key }
//   rhythm   voice 0's slots in quarter notes: [{ type: "note" | "rest" | "space", durQ }] ("space" is an invisible rest).
//   pitches  voice 0's MIDI numbers in order, no durations. Pitch k goes in note slot k. null keeps a slot empty. Note slots with
//            no pitch are written with a slash notehead (!style=rhythm!); pitches past the last slot wait for a rhythm and are
//            written on their own staff (pendingAbc).
//   parts    voices 1.. : [{ rhythm, pitches }] the same way (part(chunk, v) gives any voice, voice 0 being the chunk itself).
//   chords   [{ at, name }], at = quarters from the chunk's start. chordLen: the chunk's length as the chords were entered
//            (typed bars, or a take), so a chunk can be chords only.
//   words    the words as typed. Hyphens split syllables ("Twin-kle twin-kle"); one syllable per note of voice 0.
//   meter, key  a change at the start of this chunk; null = as the chunk before. Written as [M:] / [K:] inline fields.
// A chunk lasts as long as its longest voice or its chords; shorter voices are padded with invisible rests. A chunk that changes
// meter starts a new bar.
//
//   NotationDoc.create() / newChunk(name) / part(chunk, v) / chunkLen(doc, ci) / at(doc, ci) -> { meter, key }
//   NotationDoc.toAbc(doc)       -> { abc, map: [{ start, end, chunk, voice, slot, filled }] } (one entry per written note or rest)
//   NotationDoc.pendingAbc(doc)  -> { abc, map: [{ start, end, chunk, voice, pitch }] } or null when nothing waits
//   NotationDoc.fromAbc(abc)     -> a doc read back: chunks start at "^Name" labels and at inline [M:] / [K:] fields; voices from
//                                   [V:x] lines and %%score; chords from "G7" symbols, words from w: lines under the first voice
//   NotationDoc.toChordPro(doc) / fromChordPro(text, meter) -> ChordPro out (words with [chords]) / in (a chord per bar, or the bars
//                                   between | marks; {comment:} / {start_of_x:} lines start a chunk)
//   NotationDoc.info(doc, ci)    -> { bars, chords, rhythm, pitches, words, meter, key, meterChange, keyChange }
//   NotationDoc.hasChanges(doc)
//   NotationDoc.split(doc, ci, bar) / merge(doc, ci) -> an error message or null; duplicate / move / remove
//   NotationDoc.parseChords(text, barQ) -> { chords, chordLen } from "G | C D | Em"; chordsText(chunk, barQ) the other way
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

  function newChunk(name) { return { name: name || "", rhythm: [], pitches: [], parts: [], chords: [], chordLen: 0, words: "", meter: null, key: null }; }
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

  const keyName = k => k || "C";
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
    let meter = doc.meter, key = doc.key;
    for (let i = 0; i <= ci && i < doc.chunks.length; i++) {
      if (doc.chunks[i].meter) meter = doc.chunks[i].meter;
      if (doc.chunks[i].key) key = doc.chunks[i].key;
    }
    return { meter, key };
  }
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
    const out = [];
    text.trim().split(/\s+/).forEach(w => { const ps = w.split("-").filter(Boolean); ps.forEach((s, i) => out.push({ s, join: i < ps.length - 1 })); });
    return out;
  }
  const sylText = list => list.map(x => x.s + (x.join ? "-" : " ")).join("").trim();

  // ---- chords --------------------------------------------------------------------------------------------------------
  function parseChords(text, barQ) {
    const bars = (text || "").split("|").map(b => b.trim());
    while (bars.length && !bars[bars.length - 1]) bars.pop();
    const chords = [];
    bars.forEach((b, i) => {
      const names = b.split(/\s+/).filter(Boolean);
      names.forEach((n, j) => chords.push({ at: r3(i * barQ + j * barQ / names.length), name: n }));
    });
    return { chords, chordLen: r3(bars.length * barQ) };
  }
  function chordsText(ch, barQ) {
    if (!ch.chords || !ch.chords.length || !barQ) return "";
    const n = Math.max(Math.ceil((ch.chordLen || 0) / barQ - EPS), Math.floor(ch.chords[ch.chords.length - 1].at / barQ + EPS) + 1);
    const bars = Array.from({ length: n }, () => []);
    ch.chords.forEach(c => bars[Math.min(n - 1, Math.floor(c.at / barQ + EPS))].push(c.name));
    return bars.map(b => b.join(" ")).join(" | ");
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
    const a = Object.assign(newChunk(ch.name), { meter: ch.meter, key: ch.key });
    const b = newChunk((ch.name || "Chunk") + " (2)");
    const len = chunkLen(doc, ci);
    if (!len) {
      const p = ch.pitches;
      if (bar <= 0 || bar >= p.length) return "Pick a note between the first and the last.";
      a.pitches = p.slice(0, bar); b.pitches = p.slice(bar);
      a.words = ch.words; b.words = "";
    } else {
      const mi = meterInfo(at(doc, ci).meter), cut = bar * mi.barQ;
      if (cut <= EPS || cut >= len - EPS) return "Pick a bar between the first and the last.";
      for (let v = 0; v < voiceCount(doc); v++) {
        const [pa, pb] = cutPart(part(ch, v), cut);
        Object.assign(part(a, v), pa); Object.assign(part(b, v), pb);
      }
      a.chords = ch.chords.filter(c => c.at < cut - EPS);
      b.chords = ch.chords.filter(c => c.at >= cut - EPS).map(c => ({ at: r3(c.at - cut), name: c.name }));
      if (ch.chordLen) { a.chordLen = Math.min(ch.chordLen, cut); b.chordLen = Math.max(0, r3(ch.chordLen - cut)); }
      const syl = syllables(ch.words), nA = noteSlots(a);
      a.words = sylText(syl.slice(0, nA)); b.words = sylText(syl.slice(nA));
    }
    doc.chunks.splice(ci, 1, a, b);
    return null;
  }

  function merge(doc, ci) {
    const a = doc.chunks[ci], b = doc.chunks[ci + 1];
    if (!b) return "There is no chunk after this one.";
    if (b.meter && b.meter !== at(doc, ci).meter) return "The next chunk changes the meter, so they can't be one chunk.";
    if (b.key && b.key !== at(doc, ci).key) return "The next chunk changes the key, so they can't be one chunk.";
    const lenA = chunkLen(doc, ci);
    for (let v = 0; v < voiceCount(doc); v++) {
      const pa = part(a, v);
      if (pa.rhythm.length && pa.pitches.length > noteSlots(pa)) return "This chunk has notes waiting for a rhythm. Give them one, or take them away, first.";
    }
    for (let v = 0; v < voiceCount(doc); v++) {
      const pa = part(a, v), pb = part(b, v), slots = noteSlots(pa);
      const gap = r3(lenA - lengthQ(pa));
      if (gap > EPS && (pb.rhythm.length || pb.pitches.length)) pa.rhythm.push({ type: "space", durQ: gap });
      if (pb.pitches.length) while (pa.pitches.length < slots) pa.pitches.push(null);
      pa.rhythm = pa.rhythm.concat(pb.rhythm);
      pa.pitches = pa.pitches.concat(pb.pitches);
      trim(pa);
    }
    a.chords = a.chords.concat(b.chords.map(c => ({ at: r3(c.at + lenA), name: c.name })));
    if (a.chordLen || b.chordLen) a.chordLen = r3(lenA + (b.chordLen || 0));
    a.words = [a.words, b.words].filter(w => w && w.trim()).join(" ");
    doc.chunks.splice(ci + 1, 1);
    return null;
  }

  function duplicate(doc, ci) { const c = copy(doc.chunks[ci]); c.name = (c.name || "Chunk") + " (copy)"; doc.chunks.splice(ci + 1, 0, c); }
  function move(doc, ci, dir) {
    const to = ci + dir;
    if (to < 0 || to >= doc.chunks.length) return ci;
    const [c] = doc.chunks.splice(ci, 1); doc.chunks.splice(to, 0, c);   // the piece's opening meter/key stay with the top
    return to;
  }
  function remove(doc, ci) { doc.chunks.splice(ci, 1); if (!doc.chunks.length) doc.chunks.push(newChunk("Chunk 1")); }
  function addPitch(p, midi) { const gap = p.pitches.indexOf(null); if (gap >= 0) p.pitches[gap] = midi; else p.pitches.push(midi); }

  // ---- spelling ----------------------------------------------------------------------------------------------------
  function spell(midi, key, barAcc) {
    const s = sig(key), pc = ((midi % 12) + 12) % 12, sharps = sharpish(key);
    const cands = [];
    for (const l of LETTERS) {
      let a = pc - SEMI[l]; if (a > 6) a -= 12; if (a < -6) a += 12;
      if (Math.abs(a) <= 1) cands.push({ l, a });
    }
    const effective = l => (barAcc[l] !== undefined ? barAcc[l] : (s[l] || 0));
    let pick = cands.find(c => c.a === effective(c.l));                 // needs no accidental written
    if (!pick) pick = cands.find(c => c.a === 0) || cands.find(c => c.a === (sharps ? 1 : -1)) || cands[0];
    let acc = "";
    if (pick.a !== effective(pick.l)) { acc = pick.a === 1 ? "^" : pick.a === -1 ? "_" : "="; barAcc[pick.l] = pick.a; }
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
    return h + "K:" + keyName(doc.key) + "\n";
  }

  // one voice as bars: [{ items: [{ text, mark? }], syl: [string] }]; every voice gets the same bar lines
  function voiceBars(doc, v) {
    const bars = [];
    let bar = { items: [], syl: [] }, pos16 = 0, prevBar16 = 0, barAcc = {}, any = false;
    let meter = at(doc, 0).meter, key = at(doc, 0).key;
    const close = () => { bars.push(bar); bar = { items: [], syl: [] }; barAcc = {}; };
    doc.chunks.forEach((ch, ci) => {
      const here = at(doc, ci), mi = meterInfo(here.meter);
      if (!mi) return;
      const len = chunkLen(doc, ci);
      if (!len) return;
      const bar16 = Math.round(mi.barQ * 4);
      let fields = "";
      if (here.meter !== meter) { fields += "[M:" + here.meter + "]"; if (any && pos16 % prevBar16 !== 0) close(); pos16 = 0; }
      if (here.key !== key) { fields += "[K:" + keyName(here.key) + "]"; barAcc = {}; }
      meter = here.meter; key = here.key; prevBar16 = bar16;
      const p = part(ch, v);
      const slots = p.rhythm.slice();
      const pad = r3(len - lengthQ(p));
      if (pad > EPS) slots.push({ type: "space", durQ: pad, padding: true });
      const chords = v === 0 ? ch.chords.slice() : [];
      const syl = v === 0 ? syllables(ch.words) : [];
      let t = 0, noteK = 0, sylK = 0, firstPiece = true;
      slots.forEach((slot, si) => {
        const pi = slot.type === "note" ? p.pitches[noteK] : undefined;
        const filled = slot.type === "note" && pi != null;
        const midi = slot.type === "note" ? (filled ? pi : 71) : null;
        if (slot.type === "note") noteK++;
        let left = Math.round(slot.durQ * 4), firstOfSlot = true;
        while (left > 0) {
          const room = bar16 - (pos16 % bar16);
          const nextChord = chords.find(c => c.at > t + EPS);
          const toChord = nextChord ? Math.round((nextChord.at - t) * 4) : Infinity;
          const take = Math.min(left, room, toChord > 0 ? toChord : Infinity);
          pieces(take).forEach((pc, k, all) => {
            let pre = "";
            if (firstPiece) {
              pre += fields;
              if (v === 0 && doc.chunks.length > 1) pre += '"^' + (ch.name || "Chunk " + (ci + 1)).replace(/"/g, "'") + '"';
              firstPiece = false;
            }
            while (chords.length && chords[0].at <= t + EPS) pre += '"' + chords.shift().name.replace(/"/g, "") + '"';
            let tok;
            if (slot.type === "rest") tok = "z" + LEN[pc];
            else if (slot.type === "space") tok = "x" + LEN[pc];
            else tok = (filled ? "" : "!style=rhythm!") + spell(midi, here.key, barAcc) + LEN[pc];
            const lastOfSlot = k === all.length - 1 && take === left;
            const item = { pre, tok, tail: slot.type === "note" && !lastOfSlot ? "-" : "" };
            if (!slot.padding) item.mark = { chunk: ci, voice: v, slot: si, filled: slot.type === "note" ? filled : null };
            bar.items.push(item);
            if (slot.type === "note" && v === 0 && syl.length) {
              if (firstOfSlot && sylK < syl.length) { const x = syl[sylK++]; bar.syl.push(x.s.replace(/[|*~_-]/g, "") + (x.join ? "-" : "")); }
              else bar.syl.push("*");
            }
            firstOfSlot = false;
            t += pc / 4;
          });
          left -= take; pos16 += take; any = true;
          if (pos16 % bar16 === 0) close();
        }
      });
    });
    if (bar.items.length) bars.push(Object.assign(bar, { open: true }));
    return bars;
  }

  function toAbc(doc) {
    doc = upgrade(doc);
    let abc = header(doc, at(doc, 0).meter);
    const map = [], n = voiceCount(doc);
    const all = doc.voices.map((_, v) => voiceBars(doc, v));
    const nb = Math.max(0, ...all.map(b => b.length));
    for (let l = 0; l < nb; l += 4) {
      for (let v = 0; v < n; v++) {
        if (n > 1) abc += "[V:" + vid(doc, v) + "] ";
        const line = [];
        for (let b = l; b < Math.min(l + 4, nb); b++) {
          const bar = all[v][b];
          if (bar) bar.items.forEach(it => {
            abc += it.pre;
            const start = abc.length;
            abc += it.tok;
            if (it.mark) map.push(Object.assign({ start, end: abc.length }, it.mark));
            abc += it.tail + " ";
          });
          const last = b === nb - 1;
          abc += last ? "|]" : "|";
          if (!last && b < Math.min(l + 4, nb) - 1) abc += " ";
          if (bar) line.push(bar.syl.join(" "));
        }
        abc += "\n";
        if (v === 0 && line.some(s => s)) abc += "w: " + line.join(" | ") + "\n";
      }
    }
    return { abc, map };
  }

  function pendingAbc(doc) {
    doc = upgrade(doc);
    let abc = "X:1\nM:none\nL:1/8\nK:" + keyName(doc.key) + "\n", any = false;
    const map = [];
    doc.chunks.forEach((ch, ci) => {
      const key = at(doc, ci).key;
      for (let v = 0; v < voiceCount(doc); v++) {
        const p = part(ch, v), slots = p.rhythm.length ? noteSlots(p) : 0;
        for (let k = slots; k < p.pitches.length; k++) {
          if (p.pitches[k] == null) continue;
          const start = abc.length;
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
        t.slice(2).replace(/\|/g, " ").replace(/-/g, "- ").split(/\s+/).filter(Boolean).forEach(x => {
          if (x === "*") out.push(null);
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
    const starts = [{ t: 0, name: null, meter: null, key: null }];
    const startAt = tt => { let s = starts.find(x => Math.abs(x.t - tt) < EPS); if (!s) { s = { t: tt, name: null, meter: null, key: null }; starts.push(s); } return s; };
    r0.marks.forEach(x => { startAt(x.t).name = x.text; });
    r0.fields.forEach(f => { const s = startAt(f.t); if (f.name === "M" && /^\d+\/\d+$/.test(f.value)) s.meter = f.value; if (f.name === "K") s.key = f.value; });
    starts.sort((a, b) => a.t - b.t);
    if (starts.length > 1 && starts[1].t < EPS) starts.shift();          // a label on the first note names chunk 1
    const total = Math.max(...reads.map(r => r.quarters));
    doc.chunks = starts.map((s, i) => Object.assign(newChunk(s.name || "Chunk " + (i + 1)), { meter: i ? s.meter : null, key: i ? s.key : null }));
    if (starts[0].meter) doc.meter = starts[0].meter;
    if (starts[0].key) doc.key = starts[0].key;
    const chunkAt = tt => { let i = 0; while (i + 1 < starts.length && tt >= starts[i + 1].t - EPS) i++; return i; };
    const syl = wSyllables(abc, ids.length ? ids[0] : null);
    reads.forEach((r, v) => {
      let held = null, sylK = 0;
      r.written.forEach(ev => {
        const durQ = ev.t_off - ev.t_on, ci = chunkAt(ev.t_on), p = part(doc.chunks[ci], v);
        if (ev.kind === "note" && v === 0) { const x = syl[sylK++]; if (x) doc.chunks[ci].words += (x.s + (x.join ? "-" : " ")); }
        if (held) { held.durQ += durQ; if (!ev.tieNext) held = null; return; }
        if (ev.kind === "rest") { p.rhythm.push({ type: ev.visible === false ? "space" : "rest", durQ }); return; }
        const slot = { type: "note", durQ };
        p.rhythm.push(slot);
        p.pitches.push((ev.decos || []).includes("style=rhythm") ? null : ev.pitches[0].midi);
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
      const end = ci + 1 < starts.length ? starts[ci + 1].t : total;
      if (ch.chords.length && !hasRhythm(doc, ch)) ch.chordLen = r3(end - starts[ci].t);
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
    doc.chunks.forEach((ch, ci) => {
      out.push("", "{comment: " + (ch.name || "Chunk " + (ci + 1)) + "}");
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
        line += x.s + (x.join ? "" : " ");
      });
      chords.forEach(c => { line += "[" + c.name + "]"; });
      out.push(line.trim());
    });
    return out.join("\n").trim() + "\n";
  }

  function fromChordPro(text, meter) {
    const doc = create();
    doc.meter = meter || null;
    const tm = /\{\s*(?:time)\s*:\s*(\d+\/\d+)\s*\}/i.exec(text); if (tm) doc.meter = tm[1];
    const km = /\{\s*key\s*:\s*([A-G][#b]?m?)\s*\}/i.exec(text); if (km) { doc.key = km[1]; doc.keyConfirmed = true; }
    const ti = /\{\s*(?:title|t)\s*:\s*([^}]*)\}/i.exec(text); if (ti) doc.title = ti[1].trim();
    const mi = meterInfo(doc.meter) || meterInfo("4/4");
    doc.chunks = [];
    let cur = null;
    const start = name => { cur = newChunk(name || "Chunk " + (doc.chunks.length + 1)); cur._bars = []; cur._words = []; doc.chunks.push(cur); };
    text.split("\n").forEach(raw => {
      const l = raw.trim();
      const d = /^\{\s*([a-z_]+)\s*(?::\s*([^}]*))?\}$/i.exec(l);
      if (d) {
        const name = d[1].toLowerCase(), val = (d[2] || "").trim();
        if (/^(c|comment|ci|comment_italic)$/.test(name)) start(val);
        else if (/^(soc|sov|sob|start_of_\w+)$/.test(name)) start(val || name.replace(/^start_of_|^so/, "").replace(/^c$/, "chorus").replace(/^v$/, "verse").replace(/^b$/, "bridge"));
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
      const p = parseChords(ch._bars.map(b => b.join(" ")).join(" | "), mi.barQ);
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
    const pc = (SEMI[l] + (sig(key)[l] || 0) + 12) % 12;
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

  const api = { create, upgrade, newChunk, part, chunkLen, meterInfo, spell, toAbc, pendingAbc, fromAbc, toChordPro, fromChordPro, at, info,
                hasChanges, split, merge, duplicate, move, remove, addPitch, nudge, letterMidi, guessKey, scalePcs, parseChords, chordsText,
                syllables, setSyllabify };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.NotationDoc = api;
})(typeof window !== "undefined" ? window : globalThis);
