#!/usr/bin/env node
// tidy-tune-layout.mjs — beaming and line layout for some sets of apps/tunes/tunes-object.js.
//
//   node scripts/tidy-tune-layout.mjs            # dry run: report only
//   node scripts/tidy-tune-layout.mjs --write    # rewrite the file
//   node scripts/tidy-tune-layout.mjs --show <id>  # print one tune before / after
//
// For the sets in SETS:
//   - beaming: notes inside one beat are written together (beamed), a space at each beat
//     (quarter in simple meters, dotted quarter in 6/8 9/8 12/8, half in 2/2, whole bar in 3/8);
//     rests and notes of a quarter or longer stand apart; tuplets and broken rhythm stay joined.
//   - lines: 4 bars a line (a pickup bar doesn't count), 2 when the bars are busy (BUSY below);
//     a new line after || :| |] and before |:. Lyrics (w:) are cut at the same bars, so they
//     must mark every bar with |; a tune whose lyrics don't line up keeps its lines.
//   - Mullen only: the "^Em" chord annotations become chord symbols ("Em"), the roman
//     numeral annotations and roman-numeral-only w: lines go, titles in title case.
// Checks: the notes, barlines and lyrics are the same before and after (spaces aside), and
// abcjs reads the same number of notes with no new warnings. A tune failing a check is left alone.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(root, "apps/tunes/tunes-object.js");
const SETS = ["jri-recorder", "ExperimentalSongsChants", "dmti", "Mullen"];
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const SHOW = args.includes("--show") ? args[args.indexOf("--show") + 1] : null;
const BUSY = { lyrics: 18, plain: 26 };   // notes in a 4-bar line above this → 2 bars a line

const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "apps/shared/abcjs-basic.js"), "utf8"), ctx);
const ABC = ctx.ABCJS;

// ---------- Mullen: annotations ----------
const RN = "(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)";
const ROMAN = new RegExp(`^\\(?[#b♭♮]?${RN}[º°˚ø+]?(?:b?\\d+)*(?:\\/[#b]?${RN})?[º°˚ø+]?\\)?$`);
const CHORD = /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|º|°|˚|ø|\+|\d|b|#|\(|\)|\/[A-G][#b]?)*$/;
function mullenAnnotations(line) {
  return line.replace(/"([\^_])([^"]*)"/g, (m, pos, t) => {
    if (ROMAN.test(t)) return "";
    if (pos === "^" && CHORD.test(t)) return `"${t.replace(/[º°˚]/, "dim")}"`;
    return m;
  });
}
const romanOnlyLyrics = l => {
  const words = l.replace(/^w:/, "").split(/[\s|*]+/).filter(Boolean);
  return words.length > 0 && words.every(w => ROMAN.test(w));
};
const SMALL = new Set("a an and as at but by for from in into nor of on or the to with".split(" "));
function titleCase(t) {
  if (t !== t.toUpperCase()) return t;              // already mixed case: leave it
  return t.toLowerCase().replace(/[a-z][a-z'’]*/g, (w, i) => {
    if (i > 0 && SMALL.has(w) && !/[:—–-]\s*$/.test(t.slice(0, i))) return w;
    if (/^(?:i|ii|iii|iv|v|vi|vii)$/.test(w) && w !== "a") return w.toUpperCase() === "I" && i > 0 ? "I" : w.toUpperCase();
    return w[0].toUpperCase() + w.slice(1);
  });
}

// ---------- reading one bar ----------
function frac(s) {                                  // "3/2" "/" "//" "2" "" → number
  if (!s) return 1;
  const m = s.match(/^(\d*)(\/*)(\d*)$/);
  if (!m) return NaN;
  const num = m[1] ? +m[1] : 1;
  if (!m[2]) return num;
  const den = m[3] ? +m[3] * Math.pow(2, m[2].length - 1) : Math.pow(2, m[2].length);
  return num / den;
}
// items: { text, dur, kind: note | rest | field, join (glue to the previous item) }
function readBar(s) {
  const items = []; let pre = ""; let i = 0; let tup = 0, tupFactor = 1; let broken = null;
  const NOTE = /^(?:[_^=]*[A-Ga-g][,']*|[zx]|\[[^\]:]*\])([\d/]*)/;
  while (i < s.length) {
    const c = s[i], rest = s.slice(i);
    if (/\s/.test(c)) { i++; continue; }
    let m;
    if (c === '"') { const j = s.indexOf('"', i + 1); pre += s.slice(i, j + 1); i = j + 1; continue; }
    if (c === "!" || c === "+") { const j = s.indexOf(c, i + 1); pre += s.slice(i, j + 1); i = j + 1; continue; }
    if (c === "{") { const j = s.indexOf("}", i); pre += s.slice(i, j + 1); i = j + 1; continue; }
    if ((m = rest.match(/^\((\d)(?::(\d*))?(?::(\d*))?/))) {
      const p = +m[1], q = m[2] ? +m[2] : (p === 3 ? 2 : p === 2 ? 3 : p === 4 ? 3 : p === 6 ? 2 : 2);
      tup = m[3] ? +m[3] : p; tupFactor = q / p; pre += m[0]; i += m[0].length; continue;
    }
    if (c === "(") { pre += c; i++; continue; }
    if (/^[.~HLMOPSTuv]/.test(c) && !NOTE.test(rest)) { pre += c; i++; continue; }
    if ((m = rest.match(/^\[[A-Za-z]:[^\]]*\]/))) { items.push({ text: pre + m[0], dur: 0, kind: "field" }); pre = ""; i += m[0].length; continue; }
    if ((m = rest.match(NOTE))) {
      let dur = frac(m[1]);
      if (m[0][0] === "[") { const inner = m[0].match(/^\[([^\]]*)\]/)[1].match(/[\d/]+$/); if (inner && !m[1]) dur = frac(inner[0]); }
      if (tup > 0) { dur *= tupFactor; tup--; }
      const it = { text: pre + m[0], dur, kind: /^[zx]/.test(m[0]) ? "rest" : "note", inTup: tupFactor !== 1 };
      if (tup === 0) tupFactor = 1;
      if (broken) { it.dur *= broken; it.join = true; broken = null; }
      items.push(it); pre = ""; i += m[0].length; continue;
    }
    if (c === "-" || c === ")") { if (!items.length) return null; items[items.length - 1].text += c; i++; continue; }
    if ((m = rest.match(/^[<>]+/))) {
      const last = items[items.length - 1]; if (!last) return null;
      const k = m[0].length, big = 2 - Math.pow(2, -k), small = Math.pow(2, -k);
      if (m[0][0] === ">") { last.dur *= big; broken = small; } else { last.dur *= small; broken = big; }
      last.text += m[0]; i += k; continue;
    }
    if (c === "y") { i++; continue; }
    return null;                                    // something this script doesn't know
  }
  if (pre) items.push({ text: pre, dur: 0, kind: "field" });
  return items;
}
function meterOf(m) {
  m = (m || "4/4").trim();
  if (m === "C") m = "4/4"; if (m === "C|") m = "2/2";
  const [n, d] = m.split("/").map(Number);
  if (!n || !d) return null;
  let beat = 1 / d;
  if (d === 8 && n % 3 === 0) beat = n === 3 ? 3 / 8 : 3 / 8;
  if (d === 2) beat = 1 / 2;
  // odd eighths: groups 2+2+3 (7/8), 3+2 (5/8); beat starts listed as offsets
  const ADD = { "5/8": [3, 2], "7/8": [2, 2, 3] }[`${n}/${d}`];
  let starts = null;
  if (ADD) { starts = [0]; for (const g of ADD) starts.push(starts[starts.length - 1] + g / 8); }
  return { bar: n / d, beat, starts };
}
const EPS = 1e-6;
function beam(items, L, meter, startOffset) {
  let out = "", t = startOffset, prev = null;
  for (const it of items) {
    const len = it.dur * L;
    const onBeat = meter.starts ? meter.starts.some(x => Math.abs(x - t) < EPS)
      : Math.abs(t / meter.beat - Math.round(t / meter.beat)) < EPS;
    const long = x => x.kind !== "note" || x.dur * L >= 1 / 4 - EPS;
    let space = prev && !(it.join) && !(it.inTup && prev.inTup && !onBeat) &&
      (onBeat || long(it) || long(prev) || it.kind === "field" || prev.kind === "field");
    if (prev && (it.join || (it.inTup && prev.inTup && !onBeat))) space = false;
    out += (prev && space ? " " : "") + it.text;
    t += len; prev = it;
  }
  return out;
}

// ---------- reading a tune's body into bars ----------
// returns [{ open, body, close }] or null; '$' dropped
function splitBars(line) {
  const parts = []; let cur = ""; let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"' || c === "!") { const j = line.indexOf(c, i + 1); cur += line.slice(i, j + 1); i = j + 1; continue; }
    if (c === "[" && /^\[([A-Za-z]:|[_^=A-Ga-gzx])/.test(line.slice(i))) { const j = line.indexOf("]", i); cur += line.slice(i, j + 1); i = j + 1; continue; }
    const m = line.slice(i).match(/^(?::*\|[\]|:]*|::|\[\|)(?:\[?\d+(?:[,-]\d+)*)?|^\[\d+/);
    if (m && (m[0].includes("|") || m[0] === "::" || /^\[\d/.test(m[0]))) { parts.push(cur, m[0]); cur = ""; i += m[0].length; continue; }
    if (c === "$") { i++; continue; }
    cur += c; i++;
  }
  parts.push(cur);
  return parts;                                     // content, bar, content, bar, ..., content
}

function processTune(abc, set) {
  let lines = abc.split("\n");
  const kIdx = lines.findIndex(l => /^K:/.test(l));
  if (kIdx < 0) return { abc, note: "no K:" };
  let head = lines.slice(0, kIdx + 1), body = lines.slice(kIdx + 1);
  while (body.length && !body[body.length - 1].trim()) body.pop();
  const isMullen = set === "Mullen";
  if (isMullen) {
    head = head.map(l => /^T:/.test(l) ? "T:" + titleCase(l.slice(2)) : l);
    body = body.filter(l => !(/^w:/.test(l) && romanOnlyLyrics(l)));
    const words = body.some(l => /^w:/.test(l) && /[A-Za-z]/.test(l.slice(2)));
    body = body.filter(l => words || !/^w:/.test(l)).map(l => /^[A-Za-z]:/.test(l) || /^%/.test(l) ? l : mullenAnnotations(l));
  }
  const transformed = [...head, ...body].join("\n");
  if (/^(V:|%%score)/m.test(abc) || /&/.test(body.join(""))) return { abc: transformed, note: "voices: layout left" };

  const L = frac((abc.match(/^L:\s*(\S+)/m) || [, "1/8"])[1].replace(/^1\//, "/").replace(/^\//, "1/")) ;
  const Lval = (() => { const m = abc.match(/^L:\s*(\d+)\/(\d+)/m); return m ? +m[1] / +m[2] : 1 / 8; })();
  let meter = meterOf((head.join("\n").match(/^M:\s*(.*)$/m) || [, "4/4"])[1]);
  if (!meter) return { abc: transformed, note: "meter" };

  // walk the body: music lines with their w: lines; anything else is a fixed break
  const blocks = [];                                // {music:[parts], verses:[[segments]]} | {raw}
  for (const l of body) {
    if (/^w:/.test(l)) { const b = blocks[blocks.length - 1]; if (!b || !b.music) return { abc: transformed, note: "w: without music" }; b.w.push(l.slice(2)); continue; }
    if (/^[A-Za-z]:/.test(l) || /^%/.test(l) || !l.trim()) { blocks.push({ raw: l }); continue; }
    blocks.push({ music: l, w: [] });
  }
  // bars, in order, with their lyrics per verse. Lyrics (one w: line a verse) belong to every
  // bar since the previous lyrics, which may be several music lines.
  const bars = []; let reflow = true; let verses = 0; let pending = [];
  for (const b of blocks) {
    if (b.raw !== undefined) { bars.push({ raw: b.raw }); continue; }
    const p = splitBars(b.music);
    const lineBars = [];
    let open = "";
    for (let k = 0; k < p.length; k += 2) {
      const content = p[k], close = p[k + 1];
      const dollar = content.includes("$");
      const body = content.replace(/\$/g, "").trim();
      if (dollar && lineBars.length && !body) lineBars[lineBars.length - 1].dollar = true;
      if (close === undefined) {                     // end of line: a bar with no barline, or nothing
        if (body) lineBars.push({ open, body, close: "", dollar });
        else if (open) { reflow = false; lineBars.push({ open, body: "", close: "" }); }
        break;
      }
      if (!body) { if (lineBars.length) lineBars[lineBars.length - 1].close += close; else open += close; continue; }
      if (dollar && lineBars.length) lineBars[lineBars.length - 1].dollar = true;
      let c = close, nextOpen = "";
      const em = close.match(/^(.*?)(\[?)(\d+(?:[,-]\d+)*)$/);
      if (em && em[1]) { c = em[1]; nextOpen = "[" + em[3]; }
      lineBars.push({ open, body, close: c }); open = nextOpen;
    }
    pending.push(...lineBars);
    if (b.w.length) {
      if (verses && b.w.length !== verses) reflow = false;
      verses = Math.max(verses, b.w.length);
      b.w.forEach((w, vi) => {
        const seg = w.split("|");
        if (seg.length - 1 !== pending.length || seg[seg.length - 1].trim()) reflow = false;
        pending.forEach((lb, bi) => { (lb.w ||= [])[vi] = (seg[bi] || "").trim(); });
      });
      pending = [];
    }
    bars.push(...lineBars); bars.push({ eol: true, w: b.w });
  }

  // beam each bar
  let firstBar = true, meterNow = meter, okBeam = true;
  for (const b of bars) {
    if (b.raw !== undefined) { const mm = b.raw.match(/^M:\s*(.*)$/); if (mm) meterNow = meterOf(mm[1]) || meterNow; continue; }
    if (b.body === undefined || !b.body) continue;
    const items = readBar(b.body);
    if (!items) { okBeam = false; continue; }
    for (const it of items) { const mm = it.kind === "field" && it.text.match(/\[M:\s*([^\]]*)\]/); if (mm) meterNow = meterOf(mm[1]) || meterNow; }
    const total = items.reduce((s, it) => s + it.dur * Lval, 0);
    b.short = total < meterNow.bar - EPS;
    const start = firstBar && b.short ? meterNow.bar - total : 0;
    b.pickup = firstBar && b.short;
    b.notes = items.filter(x => x.kind === "note").length;
    b.body = beam(items, Lval, meterNow, start);
    firstBar = false;
  }

  // lines
  const real = bars.filter(b => b.body !== undefined && !b.pickup);
  const perBar = real.reduce((s, b) => s + (b.notes || 0), 0) / Math.max(1, real.length);
  const N = 4 * perBar > (verses ? BUSY.lyrics : BUSY.plain) ? 2 : 4;
  const out = [];
  const barText = (row, dollars) => row.map((b, i) => (b.open ? b.open + (i === 0 || b.body ? " " : "") : "") + b.body +
    (b.close ? " " + b.close : "") + (dollars && b.dollar ? " $" : "")).join(" ").replace(/\s+$/, "");
  const emit = (row) => {
    if (!row.length) return;
    out.push(barText(row, false));
    for (let v = 0; v < verses; v++) {
      if (!row.some(b => b.w && b.w[v])) continue;
      out.push("w: " + row.map(b => (b.w && b.w[v]) || "").join("|") + "|");
    }
  };
  if (reflow) {
    let row = [], count = 0;
    for (const b of bars) {
      if (b.eol) continue;
      if (b.raw !== undefined) { emit(row); row = []; count = 0; out.push(b.raw); continue; }
      if (/^\|:|^:/.test(b.open) && row.length) { emit(row); row = []; count = 0; }
      row.push(b); if (!b.pickup) count++;
      if (count >= N || !b.close || /\|\]|\|\||:/.test(b.close)) { emit(row); row = []; count = 0; }
    }
    emit(row);
  } else {                                          // same lines, only the beaming changes
    let row = [];
    for (const b of bars) {
      if (b.eol) { if (row.length) out.push(barText(row, true)); row = []; for (const w of b.w) out.push("w:" + w); continue; }
      if (b.raw !== undefined) { out.push(b.raw); continue; }
      row.push(b);
    }
  }
  if (reflow) out.splice(0, out.length, ...out.filter(l => !/^I:\s*linebreak\s*\$/.test(l)));
  let newHead = head;
  if (reflow) newHead = head.filter(l => !/^I:\s*linebreak\s*\$/.test(l) && !/^N:Contains lyrics -- line breaks NOT reflowed/.test(l));
  const result = [...newHead, ...out].join("\n");
  return { abc: result, transformed, reflow, N, okBeam, verses };
}

// ---------- checks ----------
const sigMusic = abc => abc.split("\n").filter(l => !/^[A-Za-z]:/.test(l) && !/^%/.test(l)).join("")
  .replace(/[\s$]/g, "").replace(/\|\[(\d)/g, "|$1");
const sigWords = abc => abc.split("\n").filter(l => /^w:/.test(l)).join("").replace(/w:|[\s|]/g, "");
function parse(abc) {
  const t = ABC.parseOnly(abc)[0];
  let notes = 0;
  for (const ln of t.lines || []) for (const st of ln.staff || []) for (const v of st.voices || []) for (const el of v) if (el.el_type === "note") notes++;
  return { notes, warn: (t.warnings || []).length };
}

const src = fs.readFileSync(DATA, "utf8");
let text = src; const report = [];
for (const set of SETS) {
  const re = new RegExp(`^"${set}":\\n\`([\\s\\S]*?)\``, "m");
  const m = text.match(re); if (!m) { console.log("no set", set); continue; }
  const tunes = m[1].split(/\n(?=X:)/);
  const done = tunes.map(t => {
    const trail = t.match(/\n*$/)[0]; const abc = t.slice(0, t.length - trail.length);
    const r = processTune(abc, set);
    const id = (abc.match(/^%%id\s+(\S+)/m) || [, "?"])[1];
    let ok = true, why = r.note || "";
    if (r.transformed !== undefined) {
      if (sigMusic(r.abc) !== sigMusic(r.transformed)) { ok = false; why = "music changed"; }
      else if (sigWords(r.abc) !== sigWords(r.transformed)) { ok = false; why = "lyrics changed"; }
      else { const a = parse(r.transformed), b = parse(r.abc); if (a.notes !== b.notes || b.warn > a.warn) { ok = false; why = `abcjs ${a.notes}/${a.warn} → ${b.notes}/${b.warn}`; } }
    }
    const final = ok ? r.abc : (r.transformed ?? abc);
    if (SHOW === id) console.log(`--- before\n${abc}\n--- after\n${final}\n`);
    report.push({ set, id, ok, why, reflow: r.reflow, N: r.N, beam: r.okBeam, changed: final !== abc });
    return final + trail;
  });
  text = text.replace(re, () => `"${set}":\n\`${done.join("\n")}\``);
}
for (const r of report) if (!r.ok || !r.reflow || r.beam === false || r.why)
  console.log(`${r.set.padEnd(24)} ${r.id.padEnd(34)} ${r.ok ? "" : "LEFT ALONE: " + r.why} ${r.reflow === false ? "lines kept (lyrics/bars don't line up)" : ""} ${r.beam === false ? "some bars not beamed" : ""} ${r.ok && r.why ? r.why : ""}`);
const two = report.filter(r => r.N === 2 && r.reflow).map(r => r.id);
console.log(`\n${report.length} tunes, ${report.filter(r => r.changed).length} changed; 2 bars a line: ${two.join(", ")}`);
if (WRITE && text !== src) { fs.writeFileSync(DATA, text); console.log("written", path.relative(root, DATA)); }
