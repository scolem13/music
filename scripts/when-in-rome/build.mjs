// build.mjs — scores with Roman-numeral analyses from the When in Rome corpus (Gotham et al., CC BY-SA 4.0), for theory/analysed-scores/ (one page per piece).
// Each piece: a Humdrum **kern score (Craig Sapp's encodings of public-domain editions) converted to ABC here, and one or more
// RomanText analyses placed under the notes at their bar and beat. Writes theory/analysed-scores/_<id>.qmd for each piece (a tab per
// analysis when there is more than one; each score an .as-score the page plays through AbcPlay).
//   node scripts/when-in-rome/build.mjs            (sources in scripts/when-in-rome/src, fetched from the URLs in PIECES)
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, "../.."), SRC = HERE + "/src";

// ---- kern -> events. Time in ticks, a whole note = 384.
const W = 384, LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
function kernDur(tok) {
  const m = /(\d+)(\.*)/.exec(tok); if (!m) return 0;
  let d = m[1] === "0" ? W * 2 : W / +m[1], add = d; for (let i = 0; i < m[2].length; i++) { add /= 2; d += add; }
  return d;
}
function kernPitch(s) {   // "cc#" -> { l, a, o }
  const m = /([a-gA-G])\1*/.exec(s), letters = m[0], up = letters[0] === letters[0].toUpperCase(), l = LET.indexOf(letters[0].toUpperCase());
  const o = up ? 4 - letters.length : 3 + letters.length;
  const acc = /(#+|-+|n)/.exec(s.slice(m.index + letters.length)), a = !acc ? 0 : acc[1] === "n" ? 0 : acc[1][0] === "#" ? acc[1].length : -acc[1].length;
  return { l, a, o, nat: !!acc && acc[1] === "n" };
}
export function parseKern(text) {
  const lines = text.split("\n").filter(l => l && !l.startsWith("!"));
  let cols = null, kinds = [], key = null, meter = null, mm = null, met = null, clefs = {}, keysig = null;
  const meters = [], clefChanges = {};   // later changes of meter: { t, meter }; of clef, by staff: { t, clef }
  const voices = new Map(), bars = [];   // voice id "staff.layer" -> events; bars: { t, n, style }
  let cursor = [], T = 0, measure = 0;
  const vid = c => c.staff + "." + c.layer;
  for (const line of lines) {
    const tok = line.split("\t");
    if (!cols) { kinds = tok; let n = tok.filter(k => k === "**kern").length + 1; cols = tok.map(k => ({ kern: k === "**kern", staff: k === "**kern" ? --n : 0, layer: 1 })); cursor = tok.map(() => 0); continue; }   // no *staff: each kern column its own staff, numbered from the top as *staffN does
    if (tok[0].startsWith("*")) {
      // spine changes
      const ncols = [], ncur = [];
      for (let i = 0; i < tok.length; i++) {
        const t = tok[i], c = cols[i];
        const st = /^\*staff(\d+)$/.exec(t); if (st) c.staff = +st[1];
        if (/^\*clef/.test(t) && c.kern) {   // the first clef is the staff's; later ones are changes, at this column's time
          const cl = t.slice(5);
          if (!(c.staff in clefs)) clefs[c.staff] = cl;
          else { const ch = clefChanges[c.staff] = clefChanges[c.staff] || [], last = ch.length ? ch[ch.length - 1].clef : clefs[c.staff];
            if (cl !== last && !ch.some(x => x.t === cursor[i] && x.clef === cl)) ch.push({ t: cursor[i], clef: cl }); } }
        if (/^\*k\[/.test(t)) keysig = t;
        const km = /^\*([a-gA-G][#-]?):(\w*)$/.exec(t); if (km) key = km[1];   // *a: or with a mode, *a:dor (the signature still comes from *k[])
        if (/^\*M\d+\/\d+$/.test(t)) { const nm = t.slice(2), at = Math.max(0, ...cursor.filter((x, j) => cols[j] && cols[j].kern));
          if (!meter) meter = nm; else { const last = meters.length ? meters[meters.length - 1].meter : meter; if (nm !== last) { if (meters.length && meters[meters.length - 1].t === at) meters.pop(); meters.push({ t: at, meter: nm }); } } }
        if (/^\*met\(/.test(t)) met = t;
        if (/^\*MM\d+/.test(t) && !mm) mm = +t.slice(3);
        if (t === "*^") {
          const used = cols.filter(x => x.kern && x.staff === c.staff).map(x => x.layer).concat(ncols.filter(x => x.kern && x.staff === c.staff).map(x => x.layer));
          ncols.push(c); ncur.push(cursor[i]);
          ncols.push({ kern: c.kern, staff: c.staff, layer: Math.max(...used) + 1 }); ncur.push(Math.min(...cursor.filter((x, j) => cols[j].kern)));
        } else if (t === "*v") {
          if (i > 0 && tok[i - 1] === "*v" && ncols[ncols.length - 1] && ncols[ncols.length - 1].staff === c.staff) { ncur[ncur.length - 1] = Math.max(ncur[ncur.length - 1], cursor[i]); continue; }
          ncols.push(c); ncur.push(cursor[i]);
        } else if (t === "*-") { /* end */ } else { ncols.push(c); ncur.push(cursor[i]); }
      }
      // after a merge the surviving column takes the lowest layer number of the ones merged
      cols = ncols; cursor = ncur;
      const seen = {}; cols.forEach(c => { if (!c.kern) return; seen[c.staff] = seen[c.staff] || []; });
      continue;
    }
    if (tok[0].startsWith("=")) {
      T = Math.max(...cursor.filter((x, i) => cols[i] && cols[i].kern));
      const b = tok[0], m = /^=+(\d+)/.exec(b);
      if (m) measure = +m[1];
      bars.push({ t: T, n: m ? +m[1] : null, style: b, final: /^==/.test(b) });
      continue;
    }
    // data: the line's time is the earliest cursor among columns with a token
    const live = tok.map((t, i) => cols[i] && cols[i].kern && t !== "." ? i : -1).filter(i => i >= 0);
    if (!live.length) continue;
    const t0 = Math.min(...live.map(i => cursor[i]));
    for (const i of live) {
      const t = tok[i], c = cols[i];
      if (cursor[i] < t0) cursor[i] = t0;
      const parts = t.split(" "), dur = kernDur(parts[0]);
      if (/q/.test(t)) continue;   // grace notes
      const ev = { t: t0, d: dur, rest: /r/.test(parts[0]), invisible: /ryy/.test(parts[0]), fermata: /;/.test(t), measure, notes: [] };
      if (!ev.rest) for (const p of parts) { const n = kernPitch(p); n.tieStart = /\[/.test(p); n.tieMid = /_/.test(p); n.tieEnd = /\]/.test(p); ev.notes.push(n); }
      const id = vid(c); if (!voices.has(id)) voices.set(id, []);
      voices.get(id).push(ev);
      cursor[i] = t0 + dur;
    }
  }
  return { voices, bars, key, meter, mm, met, clefs, keysig, meters, clefChanges };
}

// ---- MusicXML -> the same shape parseKern returns. Each staff of each part is a staff here, and each voice on it a layer
// (numbered in voice order). merge: a four-part chorale (four one-voice parts, no chords, treble and bass clefs) goes on two
// staves, parts 1-2 above and 3-4 below, as Reger, Rimsky-Korsakov and Tchaikovsky print them. A staff whose clef changes gets
// the clef that suits most of its notes.
export const r6 = x => Math.round(x * 1e6) / 1e6;   // tuplets other than triplets give fractional ticks
export const SHARPS = "fcgdaeb", FLATS = "beadgcf", MAJ_FIFTHS = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
export function parseMusicXml(xml, opt = {}) {
  // ksAt: key signatures, from the bar they start; clefAt: staff -> [{ t, clef }] in score order
  const voices = new Map(), clefs = {}, clefSeen = {}, clefAt = {}, clefChanges = {}, ksAt = []; let meter = null, ends = [];
  const parts = [...xml.matchAll(/<part id="[^"]*">([\s\S]*?)<\/part>/g)].map(m => m[1]);
  const fifths = +((/<fifths>(-?\d+)/.exec(xml) || [0, 0])[1]), minor = /<mode>minor/.test(xml);
  const merge = opt.merge !== false && parts.length === 4 && !/<chord\/>|<staves>[2-9]/.test(xml) && !/<voice>[2-9]/.test(xml) && !/<sign>C/.test(xml);
  const raw = new Map();   // "staff|voice" -> events
  let staffBase = 0;
  parts.forEach((ptext, pi) => {
    const nst = +((/<staves>(\d+)/.exec(ptext) || [0, 1])[1]);
    let div = 1, t = 0, mi = 0; const last = {};   // last event per voice, for <chord/>
    for (const mm of ptext.matchAll(/<measure number="([^"]*)"[^>]*>([\s\S]*?)<\/measure>/g)) {
      const mnum = parseInt(mm[1]), measure = isNaN(mnum) ? mi + 1 : mnum, body = mm[2], ms = t; let far = t;   // 0: a pickup bar
      if (pi === 0) { const kf = /<key\b[^>]*>\s*<fifths>(-?\d+)<\/fifths>(?:\s*<mode>(\w+))?/.exec(body); if (kf) ksAt.push({ measure, fifths: +kf[1], minor: kf[2] === "minor" }); }
      const dv = /<divisions>(\d+)/.exec(body); if (dv) div = +dv[1];
      const ts = /<beats>(\d+)<\/beats>\s*<beat-type>(\d+)/.exec(body); if (ts && !meter) meter = ts[1] + "/" + ts[2];
      const pend = [];
      for (const c of body.matchAll(/<clef(?: number="(\d)")?[^>]*>([\s\S]*?)<\/clef>/g)) {
        const sign = /<sign>([GFC])/.exec(c[2]), line = /<line>(\d)/.exec(c[2]), oct = /<clef-octave-change>-1/.test(c[2]); if (!sign) continue;
        const st = merge ? (pi < 2 ? 1 : 2) : staffBase + (+c[1] || 1);
        const cl = sign[1] === "G" && oct ? "Gv2" : sign[1] + (line ? line[1] : "");
        (clefSeen[st] = clefSeen[st] || []).push(cl); pend.push({ st, cl, at: c.index });   // its time: when the notes before it in the measure end
      }
      const placeClefs = (idx, time) => { while (pend.length && pend[0].at < idx) { const c = pend.shift(); (clefAt[c.st] = clefAt[c.st] || []).push({ t: time, clef: c.cl }); } };
      for (const el of body.matchAll(/<(note|backup|forward)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
        placeClefs(el.index, t);
        const d = +(/<duration>(\d+)/.exec(el[2]) || [0, 0])[1] * (W / 4) / div;
        if (el[1] === "backup") { t -= d; continue; } if (el[1] === "forward") { t += d; far = Math.max(far, t); continue; }
        const n = el[2]; if (/<grace|<cue\/>/.test(n)) continue;
        const v = +((/<voice>(\d+)/.exec(n) || [0, 1])[1]), stn = +((/<staff>(\d)/.exec(n) || [0, 1])[1]);
        const chord = /<chord\/>/.test(n) && last[v], rest = /<rest/.test(n);
        const tm = /<actual-notes>(\d+)<\/actual-notes>\s*<normal-notes>(\d+)/.exec(n);
        let ev = chord ? last[v] : { t: r6(t), d: r6(d), rest, invisible: /print-object="no"/.test(el[0]), fermata: /<fermata/.test(n), measure, notes: [],
          tup: tm ? [+tm[1], +tm[2]] : null, tupStart: /<tuplet type="start"/.test(n), tupStop: /<tuplet type="stop"/.test(n) };
        if (!rest) {
          const st = /<step>([A-G])/.exec(n)[1], al = +((/<alter>(-?\d+)/.exec(n) || [0, 0])[1]), oc = +/<octave>(\d)/.exec(n)[1];
          const tStart = /<tie type="start"/.test(n), tStop = /<tie type="stop"/.test(n);
          ev.notes.push({ l: LET.indexOf(st), a: al, o: oc, nat: /<accidental>natural/.test(n), tieStart: tStart && !tStop, tieMid: tStart && tStop, tieEnd: tStop && !tStart });
        }
        if (!chord) {
          const key = merge ? (pi < 2 ? 1 : 2) + "|" + (pi % 2 + 1) : (staffBase + Math.min(stn, nst)) + "|" + (nst > 1 ? v : v);
          if (!raw.has(key)) raw.set(key, []); raw.get(key).push(ev); last[v] = ev; t = r6(t + d); far = Math.max(far, t);
        }
      }
      placeClefs(Infinity, far);   // a clef after the last note: at the bar's end
      t = far;
      if (pi === 0) ends.push({ t, n: measure, back: /<repeat direction="backward"/.test(body), fwd: /<repeat direction="forward"/.test(body) });
      mi++;
    }
    staffBase += merge ? 0 : nst;
  });
  // voices on a staff -> layers 1, 2, ... in voice order; each voice's events in time order
  const staffs = [...new Set([...raw.keys()].map(k => +k.split("|")[0]))];
  for (const st of staffs) {
    const vs = [...raw.keys()].filter(k => +k.split("|")[0] === st).sort((a, b) => a.split("|")[1] - b.split("|")[1]);
    vs.forEach((k, i) => voices.set(st + "." + (i + 1), raw.get(k).sort((a, b) => a.t - b.t)));
    const seen = [...new Set(clefSeen[st] || ["G2"])];
    if (!merge && clefAt[st] && clefAt[st].length) {   // the first clef is the staff's; later ones are written where they change (as in parseKern)
      const at = clefAt[st].slice().sort((x, y) => x.t - y.t); clefs[st] = at[0].clef;
      at.slice(1).forEach(c => { const ch = clefChanges[st] = clefChanges[st] || [], prev = ch.length ? ch[ch.length - 1].clef : clefs[st]; if (c.clef !== prev) ch.push(c); });
    }
    else if (seen.length === 1) clefs[st] = seen[0];
    else {   // a clef change: the clef nearer the staff's middle note
      const ps = vs.flatMap(k => raw.get(k)).flatMap(e => e.notes.map(n => n.o * 7 + n.l)).sort((a, b) => a - b), mid = ps[ps.length >> 1];
      clefs[st] = mid >= 4 * 7 + 6 ? seen.find(c => c[0] === "G") || seen[0] : seen.find(c => c[0] === "F") || seen[0];
    }
  }
  const bars = [{ t: 0, n: ends.length ? ends[0].n : 1, style: "=", final: false }];
  ends.forEach((e, i) => { const last = i === ends.length - 1, nx = ends[i + 1];
    bars.push({ t: e.t, n: last ? null : nx.n, style: last ? (e.back ? "=:|!" : "==") : "=" + (e.back ? ":|" : "") + (nx.fwd ? "|:" : ""), final: last && !e.back }); });
  const sig = fifths > 0 ? SHARPS.slice(0, fifths).split("").map(c => c + "#").join("") : FLATS.slice(0, -fifths).split("").map(c => c + "-").join("");
  let key = MAJ_FIFTHS[fifths + 7];
  if (minor) key = ["ab", "eb", "bb", "f", "c", "g", "d", "a", "e", "b", "f#", "c#", "g#", "d#", "a#"][fifths + 7];
  return { voices, bars, key: key.replace(/b$/, "-").replace(/^(.)b/, "$1-"), meter: meter || "4/4", mm: null, met: null, clefs, clefChanges, keysig: "*k[" + sig + "]", fifths, ksAt };
}

// abcjs plays a tie from inside a chord wrongly (it joins it to the next chord with that pitch, skipping lone notes), so a held note
// tied out of a chord whose other notes are not held moves, with the notes it is tied to, into a voice of its own on the same staff.
// Same notes, same sound; the chord's place in its own voice keeps its other notes. Returns the new voice ids.
export function separateTies(k) {
  const added = [], pk = n => n.l + "," + n.o + "," + n.a;
  for (const id of [...k.voices.keys()]) {
    const evs = k.voices.get(id), chains = [];
    evs.forEach((e, i) => {
      const tied = e.notes.filter(n => n.tieStart);
      if (!tied.length || (e.notes.length > 1 && tied.length === e.notes.length)) return;   // a whole chord held: abcjs plays that
      for (const n of tied) {   // follow the tie: the same pitch, tied on, in the events that follow
        const chain = [{ ev: e, n }]; let j = i + 1, cur = n;
        while ((cur.tieStart || cur.tieMid) && j < evs.length) { const nx = evs[j].notes.find(m => pk(m) === pk(n) && (m.tieMid || m.tieEnd)); if (!nx) break; chain.push({ ev: evs[j], n: nx }); cur = nx; j++; }
        if (chain.length > 1 && chain.some(c => c.ev.notes.length > 1)) chains.push(chain);   // through a chord somewhere
      }
    });
    if (!chains.length) continue;
    const layers = [];   // each: list of [start, end] spans, events
    for (const ch of chains) {
      for (const { ev, n } of ch) { ev.notes = ev.notes.filter(m => m !== n); if (!ev.notes.length) { ev.rest = true; ev.invisible = true; } }
      const out = ch.map(({ ev, n }) => ({ ...ev, notes: [n], rest: false, invisible: false })), s0 = out[0].t, s1 = out[out.length - 1].t + out[out.length - 1].d;
      // chains that start together with the same rhythm share a layer as one chord
      let L = layers.find(l => l.evs.length && l.evs.some(x => x.t === s0) && l.rhythm.has(s0 + ":" + out.map(x => x.d).join(",")));
      if (L) { out.forEach(o => L.evs.find(x => x.t === o.t).notes.push(o.notes[0])); continue; }
      L = layers.find(l => l.spans.every(([a, b]) => s1 <= a || s0 >= b));
      if (!L) { L = { spans: [], evs: [], rhythm: new Set() }; layers.push(L); }
      L.spans.push([s0, s1]); L.rhythm.add(s0 + ":" + out.map(x => x.d).join(",")); L.evs.push(...out);
    }
    const st = id.split(".")[0]; let top = Math.max(...[...k.voices.keys()].filter(x => x.split(".")[0] === st).map(x => +x.split(".")[1]));
    for (const L of layers) { const nid = st + "." + (++top); k.voices.set(nid, L.evs.sort((a, b) => a.t - b.t)); added.push(nid); }
  }
  return added;
}

// ---- events -> ABC (L:1/32), one voice per staff layer; gaps filled with invisible rests; triplets grouped
const ACC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
function keySigMap(ks) { const m = [0, 0, 0, 0, 0, 0, 0]; (/\[(.*)\]/.exec(ks)[1].match(/[a-g][#-]+/g) || []).forEach(x => { m[LET.indexOf(x[0].toUpperCase())] = x[1] === "#" ? 1 : -1; }); return m; }
function abcPitch(n) { let s = n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]; for (let k = 5; k < n.o; k++) s += "'"; for (let k = 4; k > n.o; k--) s += ","; return s; }
const U = W / 32;   // ticks per ABC unit (1/32)
function lenStr(ticks) { const u = r6(ticks / U); if (u === 1) return ""; if (Number.isInteger(u)) return String(u); for (const q of [2, 4, 8]) if (Number.isInteger(r6(u * q))) return r6(u * q) + "/" + q; throw new Error("length " + ticks); }
function normal(x) { for (let p = W * 2; p >= U / 2; p /= 2) if (x === p || x === p * 1.5 || x === p * 1.75) return true; return false; }
function isTriplet(d) { return !normal(d) && normal(d * 3 / 2); }
// Other tuplets, unmarked in kern (a "20" is a quintuplet sixteenth): [p, q] when d is p notes in the time of q, q the power of 2 below p.
function oddTup(d) { if (normal(d) || isTriplet(d)) return null; for (const p of [5, 6, 7, 9, 10, 11, 12, 13, 14, 15]) { const q = 2 ** Math.floor(Math.log2(p)); if (normal(r6(d * p / q))) return [p, q]; } return null; }
const ABCCLEF = c => /F4/.test(c) ? "bass" : /Gv2/.test(c) ? "treble-8" : /C3/.test(c) ? "alto" : /C4/.test(c) ? "tenor" : "treble";
const meterAt = (k, t) => { let m = k.meter; for (const x of k.meters || []) if (x.t <= t + 1e-6) m = x.meter; return m; };
export function toAbc(k, opt) {
  const sig = keySigMap(k.keysig), ids = [...k.voices.keys()].sort((a, b) => { const [sa, la] = a.split(".").map(Number), [sb, lb] = b.split(".").map(Number); return sa - sb || la - lb; });
  // bar spans: from each barline to the next; the music before the first barline is a pickup (measure 0)
  const ends = k.bars.map(b => b.t), first = Math.min(...[...k.voices.values()].map(v => v[0].t));
  const spans = []; let s = first, measure = 0;
  k.bars.forEach(b => { if (b.t > s) spans.push({ s, e: b.t, measure, bar: b }); else if (spans.length) spans[spans.length - 1].bar = b; s = b.t; if (b.n != null) measure = b.n; });
  const out = {}, ann = opt.annotations || {};   // ann: voiceId -> Map(t -> text[])
  for (const id of ids) {
    const evs = k.voices.get(id), parts = [], up8 = /Gv2/.test(k.clefs[id.split(".")[0]] || "") ? 1 : 0;   // treble-8: written an octave above the sound
    // a clef change inside the staff: written [K:clef=...] before the first note or rest at or after it (abcjs keeps the key)
    const changes = ((k.clefChanges || {})[id.split(".")[0]] || []).slice().sort((a, b) => a.t - b.t); let ci = 0;
    const clefTo = at => { let out = ""; while (ci < changes.length && changes[ci].t <= at + 1e-6) { out = `[K:clef=${ABCCLEF(changes[ci].clef)}] `; ci++; } return out; };
    for (const sp of spans) {
      const inBar = evs.filter(e => e.t >= sp.s && e.t < sp.e), state = {};
      let t = sp.s, s2 = "", tup = null, last = null;   // last: the note before, if it may take a beam to the next ({ key, at: index of its trailing space })
      const flushTup = () => { if (!tup) return; s2 += (tup.lead || "") + `(${tup.a || 3}:${tup.nn || 2}:${tup.n}` + tup.str + " "; tup = null; last = null; };
      // Beams, by the site's rule (apps/shared/notation-doc.js, beam()): notes shorter than a quarter are beamed within a beat (a dotted
      // quarter in compound meters); eighths filling half a bar of 4/4, or a whole bar of 2/4 or 3/4, take one beam. A rest, a longer
      // note or a tuplet breaks the beam. Written as ABC's backtick (beam, no space), so a page can show the score without beams by
      // turning backticks into spaces.
      const mAt = meterAt(k, sp.s), [mn, md] = mAt.split("/").map(Number), barT = W * mn / md, beatT = mn % 3 === 0 && md >= 8 ? W * 3 / md : W / md;
      const zero = sp.e - sp.s < barT - 1e-6 && sp.measure === 0 ? sp.e - barT : sp.s;   // a pickup counts from where its bar would start
      const beamable = e => !e.rest && e.d < W / 4 - 1e-6 && !e.tup && !isTriplet(e.d);
      const eighthsOnly = (a, b) => { const its = inBar.filter(e => e.t - zero >= a - 1e-6 && e.t - zero < b - 1e-6);
        return its.length > 1 && its.every(e => !e.rest && Math.abs(e.d - W / 8) < 1e-6 && !e.tup) && Math.abs(its.reduce((x, e) => x + e.d, 0) - (b - a)) < 1e-6; };
      let wide = null;
      if (md === 4 && (mn === 2 || mn === 3) && eighthsOnly(0, barT)) wide = () => "bar";
      else if (md === 4 && mn === 4) { const h1 = eighthsOnly(0, barT / 2), h2 = eighthsOnly(barT / 2, barT); if (h1 || h2) wide = pos => pos < barT / 2 ? (h1 ? "a" : null) : (h2 ? "b" : null); }
      const beamKey = e => { const pos = e.t - zero, w = wide && wide(pos); return w || "g" + Math.floor((pos + 1e-6) / beatT); };
      const emit = (e) => {
        let pre = "", cl = clefTo(e.t);   // a clef change goes before a tuplet's (3:2:3, never inside it
        const texts = ann[id] && ann[id].get(e.t); if (texts) pre += texts.map(x => `"${x}"`).join("");
        if (e.fermata) pre += "H";
        const odd = !e.tup && oddTup(e.d);
        if (odd) e = { ...e, tup: odd, oddTup: true };
        const trip = e.tup ? true : isTriplet(e.d), wd = r6(e.tup ? e.d * e.tup[0] / e.tup[1] : trip ? e.d * 3 / 2 : e.d), L = lenStr(wd);
        let body;
        if (e.rest) body = (e.invisible && !trip ? "x" : "z") + L;   // abcjs can't draw an invisible rest inside a triplet
        else {
          const ns = e.notes.map(n => {
            const kk = n.l + "," + n.o, cur = kk in state ? state[kk] : sig[n.l];
            const acc = cur === n.a && !(n.nat && cur !== 0) ? "" : ACC[n.a]; state[kk] = n.a;
            return acc + abcPitch({ l: n.l, o: n.o + up8 }) + (n.tieStart || n.tieMid ? "-" : "");
          });
          body = ns.length > 1 ? "[" + ns.join("") + "]" + L : ns[0].replace(/-$/, "") + L + (/-$/.test(ns[0]) ? "-" : "");   // a lone note: the tie after its length
          if (ns.length > 1 && body.includes("-]")) body = body;   // ties inside the chord stay on their notes
        }
        if (e.tup) { if (!tup || e.tupStart || tup.a !== e.tup[0]) { flushTup(); tup = { n: 0, str: "", sum: 0, a: e.tup[0], nn: e.tup[1], goal: e.oddTup ? r6(e.tup[1] * wd) : 0 }; } if (cl) tup.lead = (tup.lead || "") + cl; tup.n++; tup.str += pre + body; tup.sum = r6(tup.sum + e.d);
          if (e.tupStop || (tup.goal && tup.sum >= tup.goal - 1e-6)) flushTup(); }
        else if (trip) { if (tup && tup.a) flushTup(); if (!tup) tup = { n: 0, str: "", sum: 0 }; if (cl) tup.lead = (tup.lead || "") + cl; tup.n++; tup.str += pre + body; tup.sum += e.d; if (tup.sum * 3 / 2 % (wd * 3) === 0 || tup.n === 3) flushTup(); else tup.str += ""; }
        else {
          flushTup(); if (cl) { s2 += cl; last = null; }
          const kk = beamable(e) ? beamKey(e) : null;
          if (kk && last && last.key === kk) s2 = s2.slice(0, last.at) + "`" + s2.slice(last.at + 1);
          s2 += pre + body + " "; last = kk ? { key: kk, at: s2.length - 1 } : null;
        }
      };
      for (const e of inBar) {
        if (e.t > t + 1e-6) { const c = clefTo(t); if (c) s2 += c; }
        if (e.t > t + 1e-6) { flushTup(); const gap = r6(e.t - t); s2 += fill(gap, ann[id], t); last = null; }
        emit(e); t = r6(e.t + e.d);
      }
      flushTup();
      if (t < sp.e - 1e-6) s2 += fill(r6(sp.e - t), ann[id], t);
      const b = sp.bar.style, bar = /:\|/.test(b) ? ":|" : /\|:/.test(b) ? "|:" : sp.bar.final ? "|]" : "|";
      const mChange = (k.meters || []).some(x => Math.abs(x.t - sp.s) < 1e-6) ? `[M:${mAt}] ` : "";   // a change of meter starts this bar
      parts.push(mChange + s2.trim() + " " + bar);
    }
    out[id] = parts;
  }
  return { ids, bars: out, spans };
}
function fill(gap, ann, t) {   // invisible rests, in note values ABC can write
  let s = "", left = gap;
  const pieces = []; for (let p = W; left > 0 && p >= U; p /= 2) while (left >= p) { pieces.push(p); left -= p; }
  if (left > 0) pieces.push(left);
  let at = t; for (const p of pieces) { const txt = ann && ann.get(at), o = !isTriplet(p) && oddTup(p);
    s += (txt ? txt.map(x => `"${x}"`).join("") : "") + (o ? `(${o[0]}:${o[1]}:1x${lenStr(r6(p * o[0] / o[1]))} ` : "x" + lenStr(isTriplet(p) ? p * 3 / 2 : p) + " "); at += p; }
  return s;
}

// ---- RomanText -> [{ m, beat, text }]
const FIG = { "65": "⁶₅", "43": "⁴₃", "42": "⁴₂", "64": "⁶₄", "2": "⁴₂", "6": "⁶", "7": "⁷", "9": "⁹" };
const stack = s => s.replace(/^([^/]*?)(65|43|42|64|6|7|9|2)(?=\/|$)/, (m, a, f) => a + FIG[f]);   // V65/V -> V⁶₅/V
const PRETTY = s => stack(s.replace(/\/o/g, "ø").replace(/o(?=\d|\/|$)/g, "°").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64")
  .replace(/^b(?=[IViv])/, "♭").replace(/^#(?=[IViv])/, "♯").replace(/maj7/, "M7"));
export const PKEY = k => k.replace(/^([A-Ga-g])bb/, "$1𝄫").replace(/^([A-Ga-g])b/, "$1♭").replace(/^([A-Ga-g])##/, "$1𝄪").replace(/^([A-Ga-g])#/, "$1♯").replace(/:$/, "") + ":";
export function parseRomanText(text) {
  const byM = new Map(), notes = [], vars = []; let cur = null;   // cur: the key in force (it carries across bars)
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/^Note:/.test(line)) { notes.push(line.slice(5).trim()); continue; }
    let m;
    if ((m = /^m(\d+)(?:-(\d+))?\s*=\s*m(\d+)(?:-(\d+))?$/.exec(line))) {   // a repeat of earlier bars
      const a = +m[1], b = +(m[2] || m[1]), c = +m[3];
      for (let i = 0; i <= b - a; i++) byM.set(a + i, (byM.get(c + i) || []).map(x => ({ ...x })));
      continue;
    }
    if ((m = /^m(\d+)var\d+\s+(.*)$/.exec(line))) { vars.push({ m: +m[1], text: m[2] }); continue; }
    if (!(m = /^m(\d+)\s*(.*)$/.exec(line))) continue;
    const meas = +m[1], list = []; let beat = 1, key = null;
    for (const t of m[2].split(/\s+/).filter(Boolean)) {
      if (/^b\d+(\.\d+)?$/.test(t)) { beat = +t.slice(1); continue; }
      if (/^[A-Ga-g](bb|##|b|#)?:$/.test(t)) { key = PKEY(t); cur = t.slice(0, -1); continue; }
      if (/^:?\|\|:?$/.test(t)) continue;
      list.push({ beat, text: (key ? key + " " : "") + PRETTY(t), raw: t, key: cur }); key = null;
    }
    byM.set(meas, list);
  }
  const ev = []; [...byM.keys()].sort((a, b) => a - b).forEach(mm => byM.get(mm).forEach(x => ev.push({ m: mm, beat: x.beat, text: x.text, raw: x.raw, key: x.key })));
  return { events: ev, notes, vars };
}
// ---- a Roman numeral in a key -> a lead-sheet chord name, whose notes the site's non-harmonic-tone engine (AbcNHT.chordPcs) gives.
// RomanText's conventions: case is the quality (o diminished, ø or /o half-diminished, + augmented); 7 65 43 42 2 a seventh chord;
// in minor, an uppercase VI / VII is on the lowered degree and a lowercase vi / vii on the raised one; X/Y is X in the key of Y;
// N = ♭II, Cad64 = I64; It / Fr / Ger = the augmented sixths on ♭6.
const NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"], MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const DEGN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
function keyPc(k) { const m = /^([A-Ga-g])([#♯]+|[b♭]+)?/.exec(k), a = m[2] ? (/[#♯]/.test(m[2]) ? 1 : -1) * m[2].length : 0; return (NAT[LET.indexOf(m[1].toUpperCase())] + a + 24) % 12; }
export function rnChord(rn, key) {   // key like "c#" (minor) or "E"
  const minor = key[0] === key[0].toLowerCase(), ton = keyPc(key);
  let t = rn.replace(/^Cad64\/(.+)$/, (x, sub) => (/^[b#♭♯]?[iv]/.test(sub) ? "i64/" : "I64/") + sub).replace(/^Cad64$/, minor ? "i64" : "I64").replace(/^([b#♭♯]?[iv]+)m7/, "$17").replace(/\[.*?\]/g, "").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64");
  const majSev = /maj|M(?=\d)/.test(t); t = t.replace(/maj(?=\d)|M(?=\d)/, "");
  const aug6 = /^(It|Fr|Ger)/.exec(t);
  if (aug6) { const r = (ton + 8) % 12; return NAMES[r] + (aug6[1] === "Fr" ? "7b5" : "7"); }
  if (/^N/.test(t)) return NAMES[(ton + 1) % 12];
  const m = /^(b|#|♭|♯)?(vii|vi|v|iv|iii|ii|i|VII|VI|V|IV|III|II|I)(\/o|ø|o|°|\+)?(maj7|M7|7|65|43|42|2|64|6|9|11|13)?(?:\/(.+))?$/.exec(t); if (!m) return null;
  let base = ton, tMinor = minor;
  if (m[5]) { const sub = m[5]; const tc = rnChord(sub, key); if (!tc) return null; base = keyPc(tc); tMinor = sub[0] === sub[0].toLowerCase() || /^[b#♭♯]?[ivx]/.test(sub) && sub.replace(/^[b#♭♯]/, "")[0] === sub.replace(/^[b#♭♯]/, "")[0].toLowerCase(); }
  const up = m[2] === m[2].toUpperCase(), d = DEGN[m[2].toLowerCase()], scale = tMinor ? MIN : MAJ;
  let root = base + scale[d - 1];
  if (tMinor && !m[5] && (d === 6 || d === 7) && !up) root += 1;   // raised 6 / 7 in minor
  if (m[5] && d === 5) root = base + 7; if (m[5] && d === 7) root = base + 11;   // V/x, vii/x of the chord x
  if (m[1] === "b" || m[1] === "♭") root -= 1; if (m[1] === "#" || m[1] === "♯") root += 1;
  root = ((root % 12) + 12) % 12;
  const sev = /^(7|65|43|42|2|9|11|13)$/.test(m[4] || "") || /maj7|M7/.test(m[4] || ""), q = m[3];
  let suf;
  if (q === "ø" || q === "/o") suf = "m7b5"; else if (q === "o" || q === "°") suf = sev ? "dim7" : "dim"; else if (q === "+") suf = sev ? "aug7" : "aug";
  else if (up) suf = sev ? (majSev || /maj7|M7/.test(m[4]) ? "maj7" : "7") : ""; else suf = sev ? (majSev ? "mmaj7" : "m7") : "m";
  return NAMES[root] + suf;
}
// place the analysis: bar and beat -> a tick; on the first voice (in `prefer` order) with a note starting there
function timesOf(k, conv, rt, beatTicks, barTicks) {
  const startOf = new Map(); conv.spans.forEach(sp => { if (!startOf.has(sp.measure)) startOf.set(sp.measure, sp); });
  return rt.events.map(e => { const sp = startOf.get(e.m); if (!sp) return null; return Math.round(e.m === 0 ? sp.e - barTicks + (e.beat - 1) * beatTicks : sp.s + (e.beat - 1) * beatTicks); });   // beats like 2.667 (a third of a beat)
}
function pieces(d) { const out = []; let left = d; for (let p = W; left > 0 && p >= U / 2; p /= 2) { while (left >= p * 1.5 && left - p * 1.5 >= 0 && out.length === 0 && normal(p * 1.5)) { out.push(p * 1.5); left -= p * 1.5; } while (left >= p) { out.push(p); left -= p; } } return left ? null : out; }
// split the voice's notes and rests at the given times (tied notes, same sound), so a label can sit under it there
function splitAt(evs, times) {
  const out = [];
  for (const e of evs) {
    const cuts = times.filter(t => t > e.t && t < e.t + e.d).sort((a, b) => a - b);
    if (!cuts.length || e.tup || isTriplet(e.d)) { out.push(e); continue; }
    const bounds = [e.t, ...cuts, e.t + e.d], segs = [];
    for (let i = 0; i < bounds.length - 1; i++) { const ps = pieces(bounds[i + 1] - bounds[i]); if (!ps) { segs.length = 0; break; } let t = bounds[i]; for (const d of ps) { segs.push({ t, d }); t += d; } }
    if (!segs.length) { out.push(e); continue; }
    segs.forEach((s, i) => {
      const last = i === segs.length - 1;
      out.push({ ...e, t: s.t, d: s.d, fermata: e.fermata && i === 0, notes: e.notes.map(n => {
        const cont = i > 0 || n.tieMid || n.tieEnd, goesOn = !last || n.tieStart || n.tieMid;   // tied from before / tied on
        return { ...n, tieStart: goesOn && !cont, tieMid: goesOn && cont, tieEnd: !goesOn && cont };
      }) });
    });
  }
  return out;
}
function place(k, conv, rt, prefer, beatTicks, barTicks) {
  const ann = {}, misses = [];
  const startOf = new Map(); conv.spans.forEach(sp => { if (!startOf.has(sp.measure)) startOf.set(sp.measure, sp); });
  for (const e of rt.events) {
    const sp = startOf.get(e.m); if (!sp) { misses.push(e); continue; }
    let t = Math.round(sp.s + (e.beat - 1) * beatTicks);
    if (e.m === 0) t = Math.round(sp.e - barTicks + (e.beat - 1) * beatTicks);   // a pickup: beats count from the bar's start
    let ok = false;
    for (const id of prefer) {
      const evs = k.voices.get(id) || []; if (!evs.some(x => x.t === t && !x.rest)) continue;
      (ann[id] = ann[id] || new Map()); const l = ann[id].get(t) || []; l.push((id === prefer[0] ? "_" : "_") + e.text); ann[id].set(t, l); ok = true; break;
    }
    if (!ok) misses.push(e);
  }
  return { ann, misses };
}

let NHTlib = null;
function nht() { if (!NHTlib) { require(ROOT + "/apps/shared/abc-core.js"); require(ROOT + "/apps/shared/abc-events.js"); require(ROOT + "/apps/shared/abc-nht.js"); NHTlib = globalThis.AbcNHT; } return NHTlib; }
const PIECES = [
  { id: "bach-o-haupt", kern: "chor074.krn", title: "J. S. Bach, “O Haupt voll Blut und Wunden” (“O Sacred Head, Now Wounded”), BWV 244.54",
    analyses: [["chor074-analysis.txt", "Dmitri Tymoczko"]],   // a second, chor074-analysis-BCMH.txt (BCMH), was dropped from the page
    names: { "4.1": "Bass", "3.1": "Tenor", "2.1": "Alto", "1.1": "Soprano" }, prefer: ["4.1", "3.1", "2.1", "1.1"], bpm: 66, pickup: true },
  { id: "beethoven-moonlight-1", kern: "sonata14-1.krn", title: "Beethoven, Piano Sonata No. 14 in C♯ minor, Op. 27 No. 2 (“Moonlight”), I. Adagio sostenuto",
    analyses: [["moon-analysis.txt", "Tsung-Ping Chen and Li Su (BPS dataset), proof-read by Mark Gotham"]],   // moon-analysis-DT.txt (Tymoczko) dropped
    names: {}, prefer: ["2.1", "2.2", "1.2", "1.1"], bpm: 54 }
];
export function buildPiece(p) {
  const k = p.score || parseKern(fs.readFileSync(SRC + "/" + p.kern, "utf8"));
  const [num, den] = k.meter.split("/").map(Number), barTicks = W * num / den, beatTicks = num % 3 === 0 && den >= 8 ? W * 3 / den : W / den;   // compound meters: RomanText (music21) counts dotted beats
  const versions = p.analyses.map(([f, who]) => {
    const rt = p.rt || parseRomanText(p.rtext || fs.readFileSync(SRC + "/" + f, "utf8"));
    if (p.empty) return { rt, who, file: f, empty: true };
    const pre = toAbc(k, {}), times0 = timesOf(k, pre, rt, beatTicks, barTicks), times = times0.filter(x => x != null);
    const kk = { ...k, voices: new Map([...k.voices].map(([id, evs]) => [id, id === p.prefer[0] ? splitAt(evs, times) : evs])) };
    const pl = place(kk, pre, rt, p.prefer, beatTicks, barTicks), conv = toAbc(kk, { annotations: pl.ann });
    const staffs = [...new Set(conv.ids.map(i => i.split(".")[0]))].sort((a, b) => a - b);   // staff 1 is the top one
    const order = staffs.flatMap(st => conv.ids.filter(i => i.startsWith(st + ".")).sort().reverse().reverse());
    const vname = id => "s" + id.replace(".", "v");
    const score = "%%score " + staffs.map(st => { const vs = order.filter(i => i.startsWith(st + ".")).map(vname); return vs.length > 1 ? "(" + vs.join(" ") + ")" : vs[0]; }).join(" ");
    const clef = st => /F4/.test(k.clefs[st] || "") ? "bass" : /Gv2/.test(k.clefs[st] || "") ? "treble-8" : "treble";
    let keyAbc = k.key.replace("-", "b").replace(/^([a-g])/, c => c.toUpperCase()) + (k.key[0] === k.key[0].toLowerCase() ? "m" : "");
    // the signature the notes were spelled against (*k[]) decides: a modal key (a Dorian, *k[f#]) is written as the major key with that signature
    const sigN = (/\[(.*)\]/.exec(k.keysig)[1].match(/[a-g][#-]/g) || []), fifths = sigN.length ? (sigN[0][1] === "#" ? 1 : -1) * sigN.length : 0;
    const keyFifths = (MAJ_FIFTHS.indexOf(keyAbc.replace(/m$/, "")) - 7) - (/m$/.test(keyAbc) ? 3 : 0);
    if (keyFifths !== fifths) keyAbc = MAJ_FIFTHS[fifths + 7];
    const head = ["X:1", "M:" + (k.met && /c\|/.test(k.met) ? "C|" : k.met && /c\)/.test(k.met) ? "C" : k.meter), "L:1/32", "Q:1/" + den + "=" + p.bpm, score,
      ...order.map(id => `V:${vname(id)} clef=${clef(id.split(".")[0])}${p.names[id] ? ` name="${p.names[id]}"` : ""}`), "K:" + keyAbc];
    const perLine = 1000, nb = conv.bars[order[0]].length, body = [];
    for (let b = 0; b < nb; b += perLine) for (const id of order) body.push(`[V:${vname(id)}] ` + conv.bars[id].slice(b, b + perLine).join(" "));
    const NHT = nht(), chords = [];
    rt.events.forEach((e, i) => { const t = times0[i]; if (t == null) return; const name = rnChord(e.raw, e.key), c = name && NHT.chordPcs(name);
      chords.push([+(t / W).toFixed(6), c ? c.pcs : null, e.raw, name, e.key]); });
    const keys = []; chords.forEach(c => { if (c[4] && (!keys.length || keys[keys.length - 1][1] !== c[4])) keys.push([c[0], c[4]]); });   // [start (whole notes), key] at each key change
    return { chords, keys, k: kk, who, file: f, abc: head.join("\n") + "\n" + body.join("\n") + "\n", misses: pl.misses, notes: rt.notes, vars: rt.vars, count: rt.events.length };
  });
  return { k, versions };
}

// ---- Reger, Supplement to the Theory of Modulation: every example, from the When in Rome copy of the DDMAL key-modulation
// dataset (MusicXML + RomanText, in src/reger). One page, a section per starting key, the examples in the book's order.
const KEYNAME = k => k[0].toUpperCase() + k.slice(1).replace(/^bb/, "𝄫").replace(/^b/, "♭").replace(/^##/, "𝄪").replace(/^#/, "♯") + (k[0] === k[0].toLowerCase() ? " minor" : " major");
// Corrections to the corpus analyses, each shown on the page. 38: the last three chords are labelled in d♭ but the notes are a♭ minor's
// iv⁶ (raised 6th), V⁶₅, i, as the book's title says. 45b: the last key is written Gb: (major) and then labelled i.
const REGER_FIX = { "38": [/db: IV6/, "ab: IV6", "the analysis names D♭ minor for the last three chords; the notes and the book's title are A♭ minor"],
  "45b": [/Gb: V7/, "gb: V7", "the analysis writes the last key as G♭ major (Gb:), then labels its chord i; it is G♭ minor, as in the book's title"] };
// ---- The textbooks in When in Rome (all from the DDMAL key-modulation dataset: MusicXML + RomanText, in src/<dir>), one page
// per book, the examples in the book's order. group: the h2 an example goes under; head: its h3.
const fixMojibake = s => /Ã/.test(s) ? Buffer.from(s, "latin1").toString("utf8") : s;
const prettyKeys = s => s.replace(/\b([A-Ga-g])--(?=\s)/g, "$1𝄫").replace(/\b([A-Ga-g])-(?=\s)/g, "$1♭").replace(/\b([A-Ga-g])b(?=\s+(major|minor))/gi, "$1♭")
  .replace(/\b([A-Ga-g])#/g, "$1♯").replace(/\b([A-Ga-g]) flat\b/gi, "$1♭").replace(/\b([A-Ga-g]) sharp\b/gi, "$1♯").replace(/\bMajor\b/g, "major")
  .replace(/\b([a-g])([♭♯]?) (minor|major)/g, (m, l, a, q) => l.toUpperCase() + a + " " + q);
function titleOf(rtext) { return fixMojibake((/^Title:\s*(.*)$/m.exec(rtext) || ["", ""])[1]).replace(/\s*- None: None\s*$/, "").replace(/^I /, "").replace(/&quot;/g, '"').replace(/Dvorak/, "Dvořák").trim(); }
const sortIds = ids => ids.sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
export const BOOKS = [
  { key: "reger", page: "reger-modulation", dir: "reger", fix: REGER_FIX, bpm: 69, name: "Reger, On the Theory of Modulation",
    group: ex => "From " + KEYNAME(ex.from), head: ex => `${ex.label}. ${KEYNAME(ex.from)} to ${KEYNAME(ex.to)}` },
  { key: "rimsky", page: "rimsky-korsakov-harmony", dir: "rimsky", name: "Rimsky-Korsakov, Practical Manual of Harmony",
    group: ex => "Example " + parseInt(ex.title.split("-")[1]), head: ex => prettyKeys(ex.title.replace(/^3-/, "")) },
  { key: "tchaikovsky", page: "tchaikovsky-harmony", dir: "tchaikovsky", name: "Tchaikovsky, Guide to the Practical Study of Harmony",
    group: ex => "Example " + parseInt(ex.title.replace(/^Example /, "")), head: ex => prettyKeys(ex.title.replace(/^Example (\d+)-?([a-k]?) : /, "$1$2. ")) },
  { key: "aldwell", page: "aldwell-schachter", dir: "aldwell", name: "Aldwell and Schachter, Harmony and Voice Leading", group: () => "Chapter 27", head: ex => prettyKeys(ex.title) },
  { key: "kostka", page: "kostka-payne", dir: "kostka", name: "Kostka and Payne, Tonal Harmony", group: ex => "Chapter " + ex.title.split("-")[0], head: ex => prettyKeys(ex.title) },
];
export function bookExamples(book) {
  const dir = SRC + "/" + book.dir, ids = sortIds([...new Set(fs.readdirSync(dir).map(f => f.replace(/\.\w+$/, "")))]);
  return ids.map(id => {
    const xml = fs.readFileSync(dir + "/" + id + ".xml", "utf8"), empty = !/<pitch>/.test(xml);
    let rtext = fs.readFileSync(dir + "/" + id + ".rntxt", "utf8");
    const fix = book.fix && book.fix[id]; if (fix) rtext = rtext.replace(fix[0], fix[1]);
    if (/^m0 /m.test(rtext) && !/<measure number="0"/.test(xml)) rtext = rtext.replace(/^m(\d+)/gm, (x, n) => "m" + (+n + 1));   // Reger 46a/b count their first full bar as 0
    const rt = parseRomanText(rtext), keys = rt.events.map(e => e.key).filter(Boolean), title = titleOf(rtext);
    const label = book.key === "reger" ? String(parseInt(id)) + id.replace(/^\d+/, "").toUpperCase() : id;
    // the keys from the title ("C- Major" = C♭ major, "B--" = B𝄫, "E flat minor"); the analysis's first and last keys if it has none
    const tk = (/^\S+\s+(.+?)\s+to\s+(.+?)$/.exec(title) || []).slice(1).map(x => {
      const m = /^([A-Ga-g])\s*(--|-|#|b(?!\w)|\s*flat)?\s*(major|minor)/i.exec(x); if (!m) return null;
      const acc = !m[2] ? "" : m[2] === "--" ? "bb" : m[2] === "#" ? "#" : "b";
      return (/minor/i.test(m[3]) ? m[1].toLowerCase() : m[1].toUpperCase()) + acc; });
    const score = empty ? null : parseMusicXml(xml), pid = book.key + "-" + label.toLowerCase();
    const ids2 = score ? [...score.voices.keys()].sort((a, b) => { const [sa, la] = a.split(".").map(Number), [sb, lb] = b.split(".").map(Number); return sb - sa || lb - la; }) : [];
    if (score) ids2.push(...separateTies(score));   // the held notes' voices take a label only where no other voice can
    const den = score ? +score.meter.split("/")[1] : 4, num = score ? +score.meter.split("/")[0] : 4;
    const bpm = book.bpm || (den === 8 && num % 3 === 0 ? 132 : den === 2 ? 60 : 72);
    return { file: id, id: pid, label, title, from: tk[0] || keys[0], to: tk[1] || keys[keys.length - 1], first: keys[0], last: keys[keys.length - 1], empty, rt,
      p: { id: pid, score, analyses: [[book.dir + "/" + id + ".rntxt", ""]], names: {}, prefer: ids2, bpm, empty, rtext } };
  });
}
export const regerExamples = () => bookExamples(BOOKS[0]);
const FINDER = [];   // every textbook example with a score, for the Modulation Finder
function writeFinder() {
  const json = JSON.stringify(FINDER).replace(/</g, "\\u003c");
  fs.writeFileSync(ROOT + "/theory/analysed-scores/_modulation-finder-data.qmd",
    "<!-- Generated by scripts/when-in-rome/build.mjs. Do not edit. -->\n\n```{=html}\n<script type=\"application/json\" id=\"mf-data\">" + json + "</script>\n```\n");
  console.log("finder:", FINDER.length, "examples,", Math.round(json.length / 1024), "KB");
}
function writeBook(book) {
  let md = "<!-- Generated by scripts/when-in-rome/build.mjs. Do not edit. -->\n\n", group = null, missesAll = 0, n = 0;
  for (const ex of bookExamples(book)) {
    const g = book.group(ex); if (g !== group) { group = g; md += `## ${g}\n\n`; }
    md += `### ${book.head(ex)} {#ex-${ex.label.toLowerCase()}}\n\n`; n++;
    if (ex.empty) { md += `*The corpus has no notes for this example, only its analysis:* ` + ex.rt.events.map(e => e.text).join(" ") + "\n\n"; continue; }
    const v = buildPiece(ex.p).versions[0];
    missesAll += v.misses.length;
    const bad = v.chords.filter(c => !c[1]).map(c => c[2]);
    if (bad.length || v.misses.length) console.log(" ", book.key, ex.label, "unread", bad.join(" ") || "-", "not placed", v.misses.map(x => "m" + x.m + " b" + x.beat + " " + x.text).join(", ") || "-");
    if (book.fix && book.fix[ex.file]) md += `*Corrected here:* ${book.fix[ex.file][2]}.\n\n`;
    md += `<div class="as-score" data-piece="${ex.id}" data-keys='${JSON.stringify(v.keys)}' data-bpm="${ex.p.bpm}" data-pickup="0" data-chords='${JSON.stringify(v.chords.map(c => [c[0], c[1]]))}'><script type="text/plain">\n${v.abc}</script></div>\n\n`;
    if (v.misses.length) md += `*Not shown on the score (no note starts there):* ${v.misses.map(x => "bar " + x.m + " beat " + x.beat + ": " + x.text).join("; ")}.\n\n`;
    const path = v.keys.map(k => k[1]).filter((k, i, a) => i === 0 || k !== a[i - 1]);
    FINDER.push({ id: ex.id, book: book.key, name: book.name, page: book.page, anchor: "ex-" + ex.label.toLowerCase(), head: book.head(ex),
      from: ex.from, to: ex.to, path, bpm: ex.p.bpm, keys: v.keys, chords: v.chords.map(c => [c[0], c[1]]), abc: v.abc });
  }
  fs.writeFileSync(ROOT + `/theory/analysed-scores/_${book.page}.qmd`, md);
  console.log(`${book.key}: ${n} examples, labels not placed ${missesAll}`);
}

export { PIECES, W };
if (process.argv[1] && process.argv[1].endsWith("build.mjs")) {
  let md = "<!-- Generated by scripts/when-in-rome/build.mjs. Do not edit. -->\n\n";
  for (const p of PIECES) {
    const { versions } = buildPiece(p);
    for (const v of versions) console.log(p.id, v.who.slice(0, 30), "unread numerals", v.chords.filter(c => !c[1]).map(c => c[2]).join(" ") || "none", "chords", v.count, "not placed", v.misses.length, v.misses.slice(0, 6).map(x => "m" + x.m + " b" + x.beat + " " + x.text).join(", "));
    const tabs = versions.length > 1;
    if (tabs) md += `::: {.panel-tabset}\n\n`;
    for (const v of versions) {
      md += (tabs ? `## ${v.who.split(" (")[0].split(",")[0]}\n\n` : "") + `Analysis: ${v.who}.\n\n<div class="as-score" data-piece="${p.id}" data-keys='${JSON.stringify(v.keys)}' data-bpm="${p.bpm}" data-pickup="${p.pickup ? 1 : 0}" data-chords='${JSON.stringify(v.chords.map(c => [c[0], c[1]]))}'><script type="text/plain">\n${v.abc}</script></div>\n\n`;
      if (v.misses.length) md += `*Not shown on the score (no note starts there):* ${v.misses.map(x => "bar " + x.m + " beat " + x.beat + ": " + x.text).join("; ")}.\n\n`;
      if (v.notes.length) md += "**The analyst's notes:**\n\n" + v.notes.map(n => "- " + n).join("\n") + "\n\n";
      if (v.vars.length) md += "**Other readings the analyst gives:**\n\n" + v.vars.map(x => `- Bar ${x.m}: ${x.text.split(/\s+/).filter(t => !/^b[\d.]+$/.test(t)).map(t => /:$/.test(t) ? PKEY(t) : PRETTY(t)).join(" ")}`).join("\n") + "\n\n";
    }
    if (tabs) md += `:::\n\n`;
    fs.writeFileSync(ROOT + `/theory/analysed-scores/_${p.id}.qmd`, md); md = "<!-- Generated by scripts/when-in-rome/build.mjs. Do not edit. -->\n\n";
  }
  BOOKS.forEach(writeBook); writeFinder();
}
