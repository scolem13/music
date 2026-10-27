// bass-ear-corpus.mjs — picks the tunes from the Tune Library that suit Bass Lines by Ear (practice/bass-ear.qmd) and writes
// apps/patterns/bass-ear-tunes.js: an 8-bar excerpt of each (melody notes and chord symbols, parsed), ranked and put in a tier.
//
//   node scripts/bass-ear-corpus.mjs            (rerun after the tune collection changes; prints a summary)
//
// A tune is left out when: it is tagged needs-repair; it has fewer than two different chord roots in the excerpt; a chord symbol is
// unreadable or N.C.; the excerpt has under 8 melody notes; the first chord comes more than a bar after the start; the meter is not
// 2/4 3/4 4/4 2/2 6/8 (or C, C|).
// Tier (how hard the harmony is to follow in the bass): 1 = two or three diatonic roots, slow changes; 2 = more chords or faster
// changes; 3 = chords outside the key, sevenths and extensions, slash chords, two or more changes a bar.
// Suitability (higher first within a tier): a chord change every one or two bars, a melody that is not too busy, a melody that
// sits well above the bass, a chord on the first downbeat.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
global.window = global;
require(path.join(ROOT, "apps/shared/abc-core.js"));
const E = require(path.join(ROOT, "apps/shared/abc-events.js"));
require(path.join(ROOT, "apps/shared/band/harmony.js"));
const H = global.BandHarmony;
eval(fs.readFileSync(path.join(ROOT, "apps/tunes/tunes-object.js"), "utf8").replace("const tunesObject", "global.TUNES"));

const BARS = 8, PER_TIER = 45;
const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function keyOf(k) {
  const m = /^\s*([A-G])([#b]?)\s*(.*)$/.exec(k || "C");
  if (!m) return { tonic: 0, minor: false };
  const tonic = (PCS[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12, rest = m[3].toLowerCase();
  return { tonic, minor: /^m(in)?\b|^m$|^aeo|^dor/.test(rest) && !/^maj/.test(rest), mode: rest };
}
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10, 11];

const out = [], seen = new Set(), skipped = {};
const skip = why => { skipped[why] = (skipped[why] || 0) + 1; };
for (const col of Object.keys(TUNES)) {
  for (const abc of String(TUNES[col]).split(/\n(?=X:)/)) {
    if (!/^\s*X:/.test(abc)) continue;
    const id = (/^%%id\s+(\S+)/m.exec(abc) || [])[1], title = ((/^T:\s*(.+)$/m.exec(abc) || [])[1] || "").trim();
    if (!id || seen.has(id)) continue;
    if (/needs-repair/.test(abc)) { skip("needs-repair"); continue; }
    let r; try { r = E.fromAbc(abc); } catch (e) { skip("parse"); continue; }
    const { n, d } = r.meter || {};
    if (![[2, 4], [3, 4], [4, 4], [2, 2], [6, 8]].some(([a, b]) => a === n && b === d)) { skip("meter"); continue; }
    if (!r.chords.length) { skip("no chords"); continue; }
    const bq = r.barQuarters, start = r.chords[0].t;
    if (start > bq + 1e-6) { skip("chords start late"); continue; }
    // start at the bar line on or before the first chord (keeps a pickup's melody, bass silent until the chord)
    const t0 = 0, t1 = start + BARS * bq;
    const chords = r.chords.filter(c => c.t < t1 - 1e-6);
    const parsed = chords.map(c => ({ t: c.t, sym: c.name.trim(), c: H.parseChord(c.name.trim(), 0) }));
    if (parsed.some(p => p.c.nc || p.c.unknown || p.c.root == null)) { skip("unreadable chord"); continue; }
    // drop repeated symbols (a chord written again on the same harmony)
    const ch = parsed.filter((p, i) => !(parsed[i + 1] && Math.abs(parsed[i + 1].t - p.t) < 1e-6))   // two on one beat: the later
      .filter((p, i, a) => i === 0 || p.sym !== a[i - 1].sym);
    const roots = new Set(ch.map(p => p.c.root));
    if (roots.size < 2) { skip("one chord"); continue; }
    const mel = r.sounding.filter(e => e.t_on >= t0 && e.t_on < t1 - 1e-6 && e.pitches.length)
      .map(e => [round(e.t_on - start), round(Math.min(e.t_off, t1) - e.t_on), e.pitches[0].midi]);
    if (mel.length < 8) { skip("short melody"); continue; }
    const key = keyOf(r.key), scale = key.minor ? MINOR : MAJOR;
    const nonDia = ch.filter(p => scale.indexOf((p.c.root - key.tonic + 12) % 12) < 0).length;
    const ext = ch.filter(p => p.c.seventh != null || p.c.ext > 7 || p.c.quality === "dim" || p.c.quality === "hdim").length;
    const slash = ch.filter(p => p.c.slash).length;
    const changesPerBar = (ch.length - 1) / BARS;
    const beatsQ = n === 6 ? 1.5 : d === 2 ? 2 : 1;            // quarters per macro... the felt beat
    const span = mel.reduce((a, m) => a + m[1], 0) || 1, dens = mel.length / (BARS * bq / beatsQ);
    const low = Math.min(...mel.map(m => m[2]));
    const cx = roots.size + 2 * nonDia + 0.5 * ext + slash + 3 * Math.max(0, changesPerBar - 1);
    const tier = nonDia === 0 && slash === 0 && ext <= ch.length / 2 && roots.size <= 3 && changesPerBar <= 1.01 ? 1
      : cx <= 9 && nonDia <= 1 && changesPerBar <= 2.01 ? 2 : 3;
    let score = 10;
    score -= Math.abs(changesPerBar - 0.75) * 4;                 // a change every bar or so is best
    score -= Math.max(0, dens - 2) * 2;                          // busy melodies cover the bass
    score -= low < 55 ? (55 - low) * 0.3 : 0;                    // a melody down in the bass register
    score -= start > 0 ? 0.5 : 0;
    score -= /,\s*minor$|minor$/i.test(title) ? 0.3 : 0;         // the major version first
    const why = [roots.size + " roots", (changesPerBar * BARS).toFixed(0) + " changes in 8 bars"];
    if (nonDia) why.push(nonDia + " outside the key"); if (ext) why.push(ext + " sevenths+"); if (slash) why.push(slash + " slash");
    seen.add(id);
    out.push({ id, title, col, tonic: key.tonic, minor: key.minor, n, d, bq, start: round(start), tier, score: round(score),
      why: why.join(", "), mel: mel.flat(),
      ch: ch.map(p => [round(p.t - start), p.sym, p.c.root, p.c.bass, p.c.tones, p.c.scale]) });
  }
}
function round(x) { return Math.round(x * 1000) / 1000; }
const keep = [];
for (const t of [1, 2, 3]) keep.push(...out.filter(x => x.tier === t).sort((a, b) => b.score - a.score).slice(0, PER_TIER));
const head = `// bass-ear-tunes.js — WRITTEN BY scripts/bass-ear-corpus.mjs from apps/tunes/tunes-object.js; do not edit by hand.
// ${keep.length} tunes (of ${out.length} suitable), ${BARS}-bar excerpts. Each: { id, title, col, tonic (pc), minor, n, d (meter), bq (quarters a bar),
// start (quarters of pickup before the first chord, cut off), tier 1-3, score, why, mel: [t, dur, midi, ...] flat (quarters, t from the
// first chord, a pickup negative), ch: [[t, symbol, root pc, bass pc, tones (semitones above root), scale]] }.
`;
fs.writeFileSync(path.join(ROOT, "apps/patterns/bass-ear-tunes.js"), head +
  "(function (g) { var T = " + JSON.stringify(keep) + ";\n  g.BassEarTunes = T; if (typeof module !== \"undefined\" && module.exports) module.exports = T; })(typeof window !== \"undefined\" ? window : globalThis);\n");
console.log("suitable", out.length, "kept", keep.length, "by tier", [1, 2, 3].map(t => out.filter(x => x.tier === t).length).join("/"), "skipped", skipped);
for (const t of [1, 2, 3]) console.log("tier", t, keep.filter(x => x.tier === t).slice(0, 6).map(x => x.title + " (" + x.why + ")").join("; "));
