#!/usr/bin/env node
// check-redundant-accidentals.mjs — find explicit accidentals that change nothing (a _b in K:F, a = on a natural
// note, a ^f repeated in the same bar), in the tune collection (or other ABC files given), and with --fix write them out.
//   node scripts/check-redundant-accidentals.mjs [--fix] [--naturals] [--skip=Standards,...] [file.abc ...]
// Rule: a note's accidental lasts to the end of the bar for that exact pitch (letter + octave); the key signature
// gives the rest. An accidental equal to what is already in force is dropped. Keys with explicit accidentals
// (K:D exp ^f) and ties over the bar line are left alone (the accidental is kept when unsure).
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), FIX = args.includes("--fix"), files = args.filter(a => !a.startsWith("--"));
const NAT = args.includes("--naturals");   // courtesy naturals (=B after a flat in the last bar) are kept unless asked
const SKIP = (args.find(a => a.startsWith("--skip=")) || "--skip=").slice(7).split(",").filter(Boolean);   // sets left alone
const ORDER_S = "FCGDAEB", ORDER_F = "BEADGCF";
const TONICS = { C:0, G:1, D:2, A:3, E:4, B:5, "F#":6, "C#":7, F:-1, Bb:-2, Eb:-3, Ab:-4, Db:-5, Gb:-6, Cb:-7 };
const MODES = { "": 0, maj: 0, major: 0, ion: 0, m: -3, min: -3, minor: -3, aeo: -3, mix: -1, dor: -2, phr: -4, lyd: 1, loc: -5 };
function keySig(k) {
  const m = /^\s*([A-G][b#]?)\s*([A-Za-z]*)/.exec(k); if (!m) return null;
  if (m[1] === "HP" || /^none$/i.test(k.trim())) return {};
  const t = TONICS[m[1]]; if (t === undefined) return null;
  const mm = MODES[m[2].slice(0, 3).toLowerCase()] ?? MODES[m[2].toLowerCase()]; if (mm === undefined) return null;
  const n = t + mm, sig = {};
  if (n > 0) for (let i = 0; i < n; i++) sig[ORDER_S[i % 7]] = "^"; else for (let i = 0; i < -n; i++) sig[ORDER_F[i % 7]] = "_";
  return sig;
}
function scan(abc, report) {
  const lines = abc.split("\n"); let sig = {}, odd = false, bar = {}, out = [], inBody = false, found = 0;
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    if (/^K:/.test(line)) { const body = line.slice(2).replace(/%.*/, ""); odd = /\s(exp|\^|_|=)/.test(" " + body.trim().split(/\s+/).slice(1).join(" ")) || / (exp|[_^=][a-gA-G])/.test(body);
      sig = keySig(body) || {}; inBody = true; bar = {}; out.push(line); continue; }
    if (!inBody || /^[A-Za-z]:/.test(line) || /^%/.test(line)) { out.push(line); continue; }
    let res = "", i = 0;
    while (i < line.length) {
      const c = line[i];
      if (c === '"') { const j = line.indexOf('"', i + 1); const e = j < 0 ? line.length : j + 1; res += line.slice(i, e); i = e; continue; }
      if (c === "!" ) { const j = line.indexOf("!", i + 1); const e = j < 0 ? i + 1 : j + 1; res += line.slice(i, e); i = e; continue; }
      if (c === "%") { res += line.slice(i); break; }
      if (c === "[" && /^\[[A-Za-z]:/.test(line.slice(i, i + 3))) { const j = line.indexOf("]", i); const e = j < 0 ? line.length : j + 1;
        const inner = line.slice(i, e); const km = /^\[K:(.*)\]$/.exec(inner); if (km) { sig = keySig(km[1]) || {}; odd = / (exp|[_^=][a-gA-G])/.test(km[1]); bar = {}; }
        res += inner; i = e; continue; }
      if (c === "|" || c === ":") { if (c === "|") bar = {}; res += c; i++; continue; }
      const m = /^(\^\^|__|\^|_|=)?([A-Ga-g])([,']*)/.exec(line.slice(i));
      if (m && !(c >= "a" && c <= "z" && false)) {
        const acc = m[1] || "", L = m[2].toUpperCase(), key = m[2] + m[3];
        const inForce = key in bar ? bar[key] : (sig[L] || "=");
        if (acc) {
          const norm = acc === "=" ? "=" : acc;
          if (!odd && norm === inForce && (norm !== "=" || NAT)) { found++; report(li, i, line, acc + m[2] + m[3]); res += FIX ? m[2] + m[3] : m[0]; }
          else res += m[0];
          bar[key] = norm;
        } else res += m[0];
        i += m[0].length; continue;
      }
      res += c; i++;
    }
    out.push(res);
  }
  return { text: out.join("\n"), found };
}
let total = 0;
function doAbc(label, abc, setter) {
  const hits = []; const r = scan(abc, (li, i, line, note) => hits.push(note));
  if (r.found) { total += r.found; console.log(label + ": " + r.found + " redundant (" + [...new Set(hits)].slice(0, 6).join(" ") + ")"); }
  if (FIX && r.found && setter) setter(r.text);
}
if (files.length) for (const f of files) { const a = fs.readFileSync(f, "utf8"); doAbc(f, a, t => fs.writeFileSync(f, t)); }
else {
  const DATA = path.join(root, "apps/tunes/tunes-object.js");
  const ctx = { window: {}, console }; vm.createContext(ctx);
  const src = fs.readFileSync(DATA, "utf8"); vm.runInContext(src + ";this.T=tunesObject", ctx);
  let newSrc = src;
  for (const [set, abc] of Object.entries(ctx.T)) {
    if (SKIP.includes(set)) continue;
    const tunes = abc.split(/\n(?=\s*X:)/);
    const fixed = tunes.map(t => { const id = (/%%id\s+(\S+)/.exec(t) || [])[1] || (/T:(.*)/.exec(t) || [])[1]; let nt = t;
      doAbc(set + "/" + id, t, x => { nt = x; }); return nt; });
    if (FIX) { const joined = fixed.join("\n"); if (joined !== abc && newSrc.includes(abc)) newSrc = newSrc.replace(abc, () => joined); }
  }
  if (FIX && newSrc !== src) fs.writeFileSync(DATA, newSrc);
}
console.log("total redundant accidentals: " + total + (FIX ? " (fixed)" : ""));
