// build.mjs — scores with Roman-numeral analyses from the When in Rome corpus (Gotham et al., CC BY-SA 4.0), for practice/analysed-scores.qmd.
// Each piece: a Humdrum **kern score (Craig Sapp's encodings of public-domain editions) converted to ABC here, and one or more
// RomanText analyses placed under the notes at their bar and beat. Writes practice/_analysed-scores-body.qmd (one section per
// piece, a tab per analysis, each an .abc-ex the page plays through AbcPlay).
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
        if (/^\*clef/.test(t) && c.kern) clefs[c.staff] = t.slice(5);
        if (/^\*k\[/.test(t)) keysig = t;
        if (/^\*[a-gA-G][#-]?:$/.test(t)) key = t.slice(1, -1);
        if (/^\*M\d+\/\d+$/.test(t)) meter = t.slice(2);
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
  return { voices, bars, key, meter, mm, met, clefs, keysig };
}

// ---- events -> ABC (L:1/32), one voice per staff layer; gaps filled with invisible rests; triplets grouped
const ACC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
function keySigMap(ks) { const m = [0, 0, 0, 0, 0, 0, 0]; (/\[(.*)\]/.exec(ks)[1].match(/[a-g][#-]+/g) || []).forEach(x => { m[LET.indexOf(x[0].toUpperCase())] = x[1] === "#" ? 1 : -1; }); return m; }
function abcPitch(n) { let s = n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]; for (let k = 5; k < n.o; k++) s += "'"; for (let k = 4; k > n.o; k--) s += ","; return s; }
const U = W / 32;   // ticks per ABC unit (1/32)
function lenStr(ticks) { const u = ticks / U; if (u === 1) return ""; if (Number.isInteger(u)) return String(u); if (Number.isInteger(u * 2)) return (u * 2) + "/2"; throw new Error("length " + ticks); }
function normal(x) { for (let p = W * 2; p >= U / 2; p /= 2) if (x === p || x === p * 1.5 || x === p * 1.75) return true; return false; }
function isTriplet(d) { return !normal(d) && normal(d * 3 / 2); }
export function toAbc(k, opt) {
  const sig = keySigMap(k.keysig), ids = [...k.voices.keys()].sort((a, b) => { const [sa, la] = a.split(".").map(Number), [sb, lb] = b.split(".").map(Number); return sa - sb || la - lb; });
  // bar spans: from each barline to the next; the music before the first barline is a pickup (measure 0)
  const ends = k.bars.map(b => b.t), first = Math.min(...[...k.voices.values()].map(v => v[0].t));
  const spans = []; let s = first, measure = 0;
  k.bars.forEach(b => { if (b.t > s) spans.push({ s, e: b.t, measure, bar: b }); else if (spans.length) spans[spans.length - 1].bar = b; s = b.t; if (b.n != null) measure = b.n; });
  const out = {}, ann = opt.annotations || {};   // ann: voiceId -> Map(t -> text[])
  for (const id of ids) {
    const evs = k.voices.get(id), parts = [], up8 = /Gv2/.test(k.clefs[id.split(".")[0]] || "") ? 1 : 0;   // treble-8: written an octave above the sound
    for (const sp of spans) {
      const inBar = evs.filter(e => e.t >= sp.s && e.t < sp.e), state = {};
      let t = sp.s, s2 = "", tup = null;
      const flushTup = () => { if (!tup) return; s2 += `(3:2:${tup.n}` + tup.str + " "; tup = null; };
      const emit = (e) => {
        let pre = "";
        const texts = ann[id] && ann[id].get(e.t); if (texts) pre += texts.map(x => `"${x}"`).join("");
        if (e.fermata) pre += "H";
        const trip = isTriplet(e.d), wd = trip ? e.d * 3 / 2 : e.d, L = lenStr(wd);
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
        if (trip) { if (!tup) tup = { n: 0, str: "", sum: 0 }; tup.n++; tup.str += pre + body; tup.sum += e.d; if (tup.sum * 3 / 2 % (wd * 3) === 0 || tup.n === 3) flushTup(); else tup.str += ""; }
        else { flushTup(); s2 += pre + body + " "; }
      };
      for (const e of inBar) {
        if (e.t > t) { flushTup(); const gap = e.t - t; s2 += fill(gap, ann[id], t); }
        emit(e); t = e.t + e.d;
      }
      flushTup();
      if (t < sp.e) s2 += fill(sp.e - t, ann[id], t);
      const b = sp.bar.style, bar = /:\|/.test(b) ? ":|" : /\|:/.test(b) ? "|:" : sp.bar.final ? "|]" : "|";
      parts.push(s2.trim() + " " + bar);
    }
    out[id] = parts;
  }
  return { ids, bars: out, spans };
}
function fill(gap, ann, t) {   // invisible rests, in note values ABC can write
  let s = "", left = gap;
  const pieces = []; for (let p = W; left > 0 && p >= U; p /= 2) while (left >= p) { pieces.push(p); left -= p; }
  if (left > 0) pieces.push(left);
  let at = t; for (const p of pieces) { const txt = ann && ann.get(at); s += (txt ? txt.map(x => `"${x}"`).join("") : "") + "x" + lenStr(isTriplet(p) ? p * 3 / 2 : p) + " "; at += p; }
  return s;
}

// ---- RomanText -> [{ m, beat, text }]
const FIG = { "65": "⁶₅", "43": "⁴₃", "42": "⁴₂", "64": "⁶₄", "2": "⁴₂", "6": "⁶", "7": "⁷", "9": "⁹" };
const stack = s => s.replace(/^([^/]*?)(65|43|42|64|6|7|9|2)(?=\/|$)/, (m, a, f) => a + FIG[f]);   // V65/V -> V⁶₅/V
const PRETTY = s => stack(s.replace(/\/o/g, "ø").replace(/o(?=\d|\/|$)/g, "°").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64")
  .replace(/^b(?=[IViv])/, "♭").replace(/^#(?=[IViv])/, "♯").replace(/maj7/, "M7"));
const PKEY = k => k.replace(/^([A-Ga-g])b/, "$1♭").replace(/^([A-Ga-g])#/, "$1♯").replace(/:$/, "") + ":";
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
      if (/^[A-Ga-g][b#]?:$/.test(t)) { key = PKEY(t); cur = t.slice(0, -1); continue; }
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
function keyPc(k) { const m = /^([A-Ga-g])(#|b|♯|♭)?/.exec(k); return (NAT[LET.indexOf(m[1].toUpperCase())] + (m[2] === "#" || m[2] === "♯" ? 1 : m[2] ? -1 : 0) + 12) % 12; }
export function rnChord(rn, key) {   // key like "c#" (minor) or "E"
  const minor = key[0] === key[0].toLowerCase(), ton = keyPc(key);
  let t = rn.replace(/^Cad64$/, minor ? "i64" : "I64").replace(/\[.*?\]/g, "").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64");
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
  return rt.events.map(e => { const sp = startOf.get(e.m); if (!sp) return null; return e.m === 0 ? sp.e - barTicks + (e.beat - 1) * beatTicks : sp.s + (e.beat - 1) * beatTicks; });
}
function pieces(d) { const out = []; let left = d; for (let p = W; left > 0 && p >= U / 2; p /= 2) { while (left >= p * 1.5 && left - p * 1.5 >= 0 && out.length === 0 && normal(p * 1.5)) { out.push(p * 1.5); left -= p * 1.5; } while (left >= p) { out.push(p); left -= p; } } return left ? null : out; }
// split the voice's notes and rests at the given times (tied notes, same sound), so a label can sit under it there
function splitAt(evs, times) {
  const out = [];
  for (const e of evs) {
    const cuts = times.filter(t => t > e.t && t < e.t + e.d).sort((a, b) => a - b);
    if (!cuts.length || isTriplet(e.d)) { out.push(e); continue; }
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
    let t = sp.s + (e.beat - 1) * beatTicks;
    if (e.m === 0) t = sp.e - barTicks + (e.beat - 1) * beatTicks;   // a pickup: beats count from the bar's start
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
    analyses: [["chor074-analysis.txt", "Dmitri Tymoczko"], ["chor074-analysis-BCMH.txt", "Bach Chorales Melody-Harmony Corpus (BCMH)"]],
    names: { "4.1": "Bass", "3.1": "Tenor", "2.1": "Alto", "1.1": "Soprano" }, prefer: ["4.1", "3.1", "2.1", "1.1"], bpm: 66, pickup: true },
  { id: "beethoven-moonlight-1", kern: "sonata14-1.krn", title: "Beethoven, Piano Sonata No. 14 in C♯ minor, Op. 27 No. 2 (“Moonlight”), I. Adagio sostenuto",
    analyses: [["moon-analysis.txt", "Tsung-Ping Chen and Li Su (BPS dataset), proof-read by Mark Gotham"], ["moon-analysis-DT.txt", "Dmitri Tymoczko"]],
    names: {}, prefer: ["2.1", "2.2", "1.2", "1.1"], bpm: 54 }
];
export function buildPiece(p) {
  const k = parseKern(fs.readFileSync(SRC + "/" + p.kern, "utf8"));
  const [num, den] = k.meter.split("/").map(Number), barTicks = W * num / den, beatTicks = W / den;
  const versions = p.analyses.map(([f, who]) => {
    const rt = parseRomanText(fs.readFileSync(SRC + "/" + f, "utf8"));
    const pre = toAbc(k, {}), times0 = timesOf(k, pre, rt, beatTicks, barTicks), times = times0.filter(x => x != null);
    const kk = { ...k, voices: new Map([...k.voices].map(([id, evs]) => [id, id === p.prefer[0] ? splitAt(evs, times) : evs])) };
    const pl = place(kk, pre, rt, p.prefer, beatTicks, barTicks), conv = toAbc(kk, { annotations: pl.ann });
    const staffs = [...new Set(conv.ids.map(i => i.split(".")[0]))].sort((a, b) => a - b);   // staff 1 is the top one
    const order = staffs.flatMap(st => conv.ids.filter(i => i.startsWith(st + ".")).sort().reverse().reverse());
    const vname = id => "s" + id.replace(".", "v");
    const score = "%%score " + staffs.map(st => { const vs = order.filter(i => i.startsWith(st + ".")).map(vname); return vs.length > 1 ? "(" + vs.join(" ") + ")" : vs[0]; }).join(" ");
    const clef = st => /F4/.test(k.clefs[st] || "") ? "bass" : /Gv2/.test(k.clefs[st] || "") ? "treble-8" : "treble";
    const keyAbc = k.key.replace("-", "b").replace(/^([a-g])/, c => c.toUpperCase()) + (k.key[0] === k.key[0].toLowerCase() ? "m" : "");
    const head = ["X:1", "M:" + (k.met && /c\|/.test(k.met) ? "C|" : k.met && /c\)/.test(k.met) ? "C" : k.meter), "L:1/32", "Q:1/" + den + "=" + p.bpm, score,
      ...order.map(id => `V:${vname(id)} clef=${clef(id.split(".")[0])}${p.names[id] ? ` name="${p.names[id]}"` : ""}`), "K:" + keyAbc];
    const perLine = 1000, nb = conv.bars[order[0]].length, body = [];
    for (let b = 0; b < nb; b += perLine) for (const id of order) body.push(`[V:${vname(id)}] ` + conv.bars[id].slice(b, b + perLine).join(" "));
    const NHT = nht(), chords = [];
    rt.events.forEach((e, i) => { const t = times0[i]; if (t == null) return; const name = rnChord(e.raw, e.key), c = name && NHT.chordPcs(name);
      chords.push([+(t / W).toFixed(6), c ? c.pcs : null, e.raw, name]); });
    return { chords, k: kk, who, file: f, abc: head.join("\n") + "\n" + body.join("\n") + "\n", misses: pl.misses, notes: rt.notes, vars: rt.vars, count: rt.events.length };
  });
  return { k, versions };
}

export { PIECES, W };
if (process.argv[1] && process.argv[1].endsWith("build.mjs")) {
  let md = "<!-- Generated by scripts/when-in-rome/build.mjs. Do not edit. -->\n\n";
  for (const p of PIECES) {
    const { versions } = buildPiece(p);
    for (const v of versions) console.log(p.id, v.who.slice(0, 30), "unread numerals", v.chords.filter(c => !c[1]).map(c => c[2]).join(" ") || "none", "chords", v.count, "not placed", v.misses.length, v.misses.slice(0, 6).map(x => "m" + x.m + " b" + x.beat + " " + x.text).join(", "));
    md += `::: {.panel-tabset}\n\n`;
    for (const v of versions) {
      md += `## ${v.who.split(" (")[0].split(",")[0]}\n\nAnalysis: ${v.who}.\n\n<div class="as-score" data-bpm="${p.bpm}" data-pickup="${p.pickup ? 1 : 0}" data-chords='${JSON.stringify(v.chords.map(c => [c[0], c[1]]))}'><script type="text/plain">\n${v.abc}</script></div>\n\n`;
      if (v.misses.length) md += `*Not shown on the score (no note starts there):* ${v.misses.map(x => "bar " + x.m + " beat " + x.beat + ": " + x.text).join("; ")}.\n\n`;
      if (v.notes.length) md += "**The analyst's notes:**\n\n" + v.notes.map(n => "- " + n).join("\n") + "\n\n";
      if (v.vars.length) md += "**Other readings the analyst gives:**\n\n" + v.vars.map(x => `- Bar ${x.m}: ${x.text.split(/\s+/).filter(t => !/^b[\d.]+$/.test(t)).map(t => /:$/.test(t) ? PKEY(t) : PRETTY(t)).join(" ")}`).join("\n") + "\n\n";
    }
    md += `:::\n\n`;
    fs.writeFileSync(ROOT + `/practice/_analysed-${p.id}.qmd`, md); md = "<!-- Generated by scripts/when-in-rome/build.mjs. Do not edit. -->\n\n";
  }
}
