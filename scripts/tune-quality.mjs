#!/usr/bin/env node
// tune-quality.mjs — predict which tunes in apps/tunes/tunes-object.js have bad ABC, without a human listening.
//
//   node scripts/tune-quality.mjs                 # report: how many are flagged, per reason, per collection
//   node scripts/tune-quality.mjs --write         # writes apps/tunes/tune-quality.js (window.TUNE_QUALITY)
//   node scripts/tune-quality.mjs --show <id|n>   # the reasons for one tune, or n random flagged ones
//
// Output `TUNE_QUALITY = { <%%id>: { s: score, r: ["reason", ...] } }`, only for tunes at or above THRESHOLD ("suspect").
// The Tune Library, the Tune Directory and the Tunes page leave suspect tunes out until "Show suspect tunes" is ticked.
// No ground truth exists, so each check is a symptom of a known import fault; the weights are a judgment, edit them below:
//   key     the written key signature fits the melody much worse than another key (an import that dropped the key: K:C with
//           a tune in E, accidentals everywhere)
//   clash   the chord symbols' scales do not hold the melody (chords shifted a bar, wrong key, transposed chords)
//   bars    bars whose length is not the meter's (any bad bar above 5% of bars; clean-tunes.mjs hides at 25%)
//   parse   abcjs warnings / unreadable
//   junk    leftovers of a tab / fingering / MusicXML import: unreadable chord symbols ("Aother"), x rests, !1! fingerings, a stray Arr. line, mid-tune clef changes
//   range   median note below C3 or above C6, or leaps over two octaves (octave errors)
//   repeats |: and :| that do not balance
//   short   fewer than 8 bars (a fragment), or Standards with no chord symbols at all
//   ties    a tie joining two different pitches
// Rerun after the tune collection changes (and after scripts/clean-tunes.mjs).
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "apps/tunes/tune-quality.js");
const args = process.argv.slice(2), WRITE = args.includes("--write"), SHOW = args.includes("--show") ? args[args.indexOf("--show") + 1] : null;
const THRESHOLD = 4;

const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; ctx.global = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "apps/shared/abcjs-basic.js"), "utf8"), ctx);
for (const f of ["apps/shared/band/harmony.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/\}\)\(typeof window[^;]*;?\s*$/, "})(this);"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "apps/tunes/tunes-object.js"), "utf8") + ";this.T=tunesObject", ctx);
const ABC = ctx.ABCJS, T = ctx.T, H = ctx.BandHarmony || ctx.window.BandHarmony;
if (!H) throw new Error("harmony.js did not load");

const LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, ORDER = "FCGDAEB";
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MODES = { major: 0, ionian: 0, dorian: 2, phrygian: 4, lydian: 5, mixolydian: 7, minor: 9, aeolian: 9, locrian: 11 };
const modeOf = m => { m = String(m || "").toLowerCase().slice(0, 3); return m === "" || m === "maj" || m === "ion" ? "major" : m === "m" || m === "min" || m === "aeo" ? "minor" : m === "dor" ? "dorian" : m === "phr" ? "phrygian" : m === "lyd" ? "lydian" : m === "mix" ? "mixolydian" : m === "loc" ? "locrian" : "major"; };
const scalePcs = (tonic, mode) => { const off = MODES[mode] ?? 0; return MAJOR.map(x => (tonic - off + x + 24) % 12); };

function analyse(abc) {
  const why = [];
  let r;
  try { r = ABC.parseOnly(abc)[0]; } catch (e) { return { s: 9, r: ["unreadable"] }; }
  const warns = (r.warnings || []).map(w => w.replace(/<[^>]*>/g, "")).filter(w => !/Unknown directive|Unknown decoration/i.test(w));
  const mt = r.getMeterFraction ? r.getMeterFraction() : { num: 4, den: 4 }, barLen = mt.num / mt.den;
  const ks = r.getKeySignature ? r.getKeySignature() : { accidentals: [], root: "C", mode: "major" };
  const keyAcc = {}; (ks.accidentals || []).forEach(a => { keyAcc[a.note.toUpperCase()] = a.acc === "sharp" ? 1 : a.acc === "flat" ? -1 : 0; });
  // notes: duration-weighted sounding pitch class, bar by bar; chords in force; bar lengths
  const notes = [], lens = []; let cur = 0, tup = 1, bars = 0, chord = null, barAcc = {}, prevN = null, badTies = 0, leaps = 0, nn = 0;
  const midis = [];
  for (const line of r.lines || []) for (const st of line.staff || []) for (const v of st.voices || []) for (const e of v) {
    if (e.el_type === "bar") { if (cur > 0) lens.push(cur); cur = 0; barAcc = {}; bars++; continue; }
    if (e.el_type !== "note") continue;
    if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier;
    const dur = (e.duration || 0) * tup; cur += dur; if (e.endTriplet) tup = 1;
    if (e.chord && e.chord.length) { const nm = e.chord.find(c => c.position === "default" || !c.position) ; if (nm && !/^[\^_<>@]/.test(nm.name)) chord = H.parseChord(nm.name, 0); }
    if (e.rest || !e.pitches) { continue; }
    const p = e.pitches[0], L = String(p.name || "").replace(/[\^_=]/g, "").toUpperCase();
    if (!(L in LET)) continue;
    const key = L + Math.floor(p.pitch / 7);
    if (p.accidental) barAcc[key] = p.accidental === "sharp" ? 1 : p.accidental === "flat" ? -1 : p.accidental === "natural" ? 0 : p.accidental === "dblsharp" ? 2 : -2;
    const acc = key in barAcc ? barAcc[key] : (keyAcc[L] || 0);
    const pc = ((LET[L] + acc) % 12 + 12) % 12;
    const midi = 60 + 12 * Math.floor(p.pitch / 7) + MAJOR[((p.pitch % 7) + 7) % 7] + acc; midis.push(midi);
    if (prevN != null) { nn++; if (Math.abs(midi - prevN) > 24) leaps++; } prevN = midi;
    notes.push({ pc, dur, chord });
    if (prevN != null && e.pitches[0].startTie) { /* tie check below */ }
  }
  if (cur > 0) lens.push(cur);
  const inner = lens.slice(1, -1), badBars = inner.filter(l => Math.abs(l - barLen) > 1e-6).length;
  // ties
  let pt = null;
  for (const line of r.lines || []) for (const st of line.staff || []) for (const v of st.voices || []) for (const e of v) {
    if (e.el_type !== "note" || e.rest || !e.pitches) continue;
    if (pt && pt.tie && e.pitches[0].pitch !== pt.p) badTies++;
    pt = { p: e.pitches[0].pitch, tie: !!e.pitches[0].startTie };
  }
  const total = notes.reduce((a, n) => a + n.dur, 0) || 1;
  let score = 0;
  const add = (w, t) => { score += w; why.push(t); };

  // key
  if (notes.length >= 12) {
    const tonic = ((LET[(ks.root || "C")[0].toUpperCase()] || 0) + (ks.acc === "#" ? 1 : ks.acc === "b" ? -1 : 0) + 12) % 12;
    const frac = set => notes.reduce((a, n) => a + (set.has(n.pc) ? 0 : n.dur), 0) / total;
    const f0 = frac(new Set(scalePcs(tonic, modeOf(ks.mode))));
    let best = 1, bk = 0; for (let k = 0; k < 12; k++) { const f = frac(new Set(scalePcs(k, "major"))); if (f < best) { best = f; bk = k; } }
    // minor / modal keys share a major scale, so compare against the major scale of the same notes
    if (f0 - best > 0.12 && f0 > 0.22) add(f0 - best > 0.3 ? 4 : 3, `key: ${Math.round(f0 * 100)}% of the melody is outside the written key, ${Math.round(best * 100)}% outside ${"C D♭ D E♭ E F G♭ G A♭ A B♭ B".split(" ")[bk]} major`);
    else if (f0 > 0.35) add(1, `key: ${Math.round(f0 * 100)}% of the melody outside the key`);
  }
  // chords vs melody
  const withChord = notes.filter(n => n.chord && !n.chord.nc && !n.chord.unknown && n.chord.scale);
  if (withChord.length >= 12) {
    let clash = 0, wt = 0;
    for (const n of withChord) { const c = n.chord, ok = new Set([...(c.scale || []), ...(c.tones || [])].map(x => (c.root + x) % 12)); wt += n.dur; if (!ok.has(n.pc)) clash += n.dur; }
    const cf = clash / wt;
    if (cf > 0.4) add(3, `clash: ${Math.round(cf * 100)}% of the melody is outside its chord's scale`);
    else if (cf > 0.3) add(1.5, `clash: ${Math.round(cf * 100)}% outside the chord scale`);
  }
  const body = abc.split("\n").filter(l => !/^[A-Za-z]:/.test(l) && !/^%/.test(l)).join("\n");
  const nChordSyms = (body.match(/"[A-G][^"]*"/g) || []).length;
  if (/^\s*N:\s*Source:.*(Real Book|jazz)/mi.test(abc) || /Standards/.test("")) { /* source note only */ }
  // bars
  if (inner.length >= 4 && badBars / inner.length > 0.05) add(badBars / inner.length > 0.25 ? 4 : 3, `bars: ${badBars} of ${inner.length} bars are not ${mt.num}/${mt.den}`);
  else if (badBars > 0) add(1, `bars: ${badBars} bar${badBars > 1 ? "s" : ""} off length`);
  // parse
  const hard = warns.filter(w => !/ignored:\s*\$\s*$/.test(w));        // a bare $ line break is harmless
  if (hard.length) add(hard.length > 8 ? 3 : hard.length > 3 ? 2 : 1, `parse: ${hard.length} warning${hard.length > 1 ? "s" : ""} (${hard[0].slice(0, 70)})`);
  // junk
  const junk = [];
  const syms = (body.match(/"[A-G][^"]*"/g) || []).map(x => x.slice(1, -1)), unk = syms.filter(x => { const c = H.parseChord(x, 0); return c && c.unknown && !c.nc; });
  if (syms.length >= 4 && unk.length / syms.length > 0.05) junk.push(`${unk.length} chord symbols unreadable (${unk[0]})`);
  if (/(^|[\s|:\]])x\d*(?=[\s|:\]\d]|$)/.test(body.replace(/"[^"]*"/g, ""))) junk.push("x rests");
  if (/![1-5]!/.test(body)) junk.push("fingerings");
  if (/^Arr\./m.test(abc.split(/^K:/m)[0])) junk.push("stray Arr. line");
  if (/\[K:(treble|bass|alto)\]/.test(body)) junk.push("clef change");
  if (junk.length) add(junk.length > 1 ? 3 : 2, "junk: " + junk.join(", "));
  // range
  if (midis.length >= 8) {
    const s = [...midis].sort((a, b) => a - b), med = s[s.length >> 1];
    if (!/clef=(bass|alto|tenor)/.test(abc) && (med < 48 || med > 88)) add(2, `range: median note is MIDI ${med}`);
    if (nn >= 20 && leaps / nn > 0.05) add(2, `range: ${leaps} leaps of over two octaves`);
  }
  // repeats
  const open = (body.match(/\|:|\[\|:|::/g) || []).length, close = (body.match(/:\||:\]|::/g) || []).length;
  if (Math.abs(open - close) > 1 || (open === 0 && close > 1)) add(1.5, `repeats: ${open} starts, ${close} ends`);
  // short / chordless standard
  if (inner.length + 2 < 8) add(2, `short: ${inner.length + 2} bars`);
  if (badTies > 0) add(badTies > 3 ? 2 : 1, `ties: ${badTies} tie${badTies > 1 ? "s" : ""} between different notes`);
  return { s: Math.round(score * 10) / 10, r: why, chords: nChordSyms };
}

const out = {}, all = [], by = {}, reasons = {};
const slug = abc => (/^%%id\s+(\S+)/m.exec(abc) || [])[1];
for (const set of Object.keys(T)) for (const t of String(T[set]).split(/\n(?=\s*X:)/)) {
  const id = slug(t); if (!id) continue;
  const a = analyse(t);
  if (set === "Standards" && a.chords === 0 && !/^K:.*clef/m.test(t)) { a.s += 2; a.r.push("short: a standard with no chord symbols"); }
  all.push({ id, set, title: (/^T:\s*(.*)$/m.exec(t) || [])[1] || id, ...a });
  by[set] = by[set] || { n: 0, bad: 0 }; by[set].n++;
  if (a.s >= THRESHOLD) { out[id] = { s: a.s, r: a.r }; by[set].bad++; a.r.forEach(x => { const k = x.split(":")[0]; reasons[k] = (reasons[k] || 0) + 1; }); }
}
const bad = all.filter(x => x.s >= THRESHOLD);
if (SHOW) {
  const pick = /^\d+$/.test(SHOW) ? bad.sort(() => Math.random() - 0.5).slice(0, +SHOW) : all.filter(x => x.id === SHOW);
  pick.forEach(x => console.log(`${x.set} / ${x.title} [${x.id}] score ${x.s}\n   ${x.r.join("\n   ")}`));
} else {
  console.log(`${all.length} tunes, ${bad.length} flagged (score >= ${THRESHOLD})`);
  console.log("by collection:", Object.entries(by).map(([k, v]) => `${k} ${v.bad}/${v.n}`).join(" · "));
  console.log("by reason:", JSON.stringify(reasons));
  const hist = {}; all.forEach(x => { const b = Math.min(9, Math.floor(x.s)); hist[b] = (hist[b] || 0) + 1; }); console.log("score histogram:", JSON.stringify(hist));
}
if (WRITE) {
  fs.writeFileSync(OUT, `// tune-quality.js: tunes whose ABC is probably bad, predicted by scripts/tune-quality.mjs (do not edit; rerun the script).\n// TUNE_QUALITY[<%%id>] = { s: score, r: [reasons] }; only tunes scoring ${THRESHOLD} or more are listed.\nwindow.TUNE_QUALITY = ${JSON.stringify(out)};\n`);
  console.log("wrote", OUT, Object.keys(out).length);
}
