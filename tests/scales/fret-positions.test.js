// Tests for apps/shared/fret-positions.js. Plain Node: node tests/scales/fret-positions.test.js
"use strict";
const FP = require("../../apps/shared/fret-positions.js");

const GUITAR = [40, 45, 50, 55, 59, 64], BASS = [28, 33, 38, 43], UKE = [67, 60, 64, 69];
const SCALES = {
  "Major": [0, 2, 4, 5, 7, 9, 11], "Lydian": [0, 2, 4, 6, 7, 9, 11], "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
  "Dorian": [0, 2, 3, 5, 7, 9, 10], "Natural Minor": [0, 2, 3, 5, 7, 8, 10], "Phrygian": [0, 1, 3, 5, 7, 8, 10],
  "Locrian": [0, 1, 3, 5, 6, 8, 10], "Locrian #2": [0, 2, 3, 5, 6, 8, 10], "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor": [0, 2, 3, 5, 7, 9, 11], "Harmonic Major": [0, 2, 4, 5, 7, 8, 11], "Lydian Dominant": [0, 2, 4, 6, 7, 9, 10],
  "Hindu": [0, 2, 4, 5, 7, 8, 10], "Spanish Phrygian Dominant": [0, 1, 4, 5, 7, 8, 10], "HM 6th Mode": [0, 1, 4, 5, 7, 9, 11],
  "Major Pentatonic": [0, 2, 4, 7, 9], "Minor Pentatonic": [0, 3, 5, 7, 10], "Blues Minor": [0, 3, 5, 6, 7, 10],
  "Blues Major": [0, 2, 3, 4, 7, 9], "Whole Tone": [0, 2, 4, 6, 8, 10], "Augmented": [0, 3, 4, 7, 8, 11],
  "Diminished W-H": [0, 2, 3, 5, 6, 8, 9, 11], "Diminished H-W": [0, 1, 3, 4, 6, 7, 9, 10], "Bebop Major": [0, 2, 4, 5, 7, 8, 9, 11],
  "Bebop Dominant": [0, 2, 4, 5, 7, 9, 10, 11], "Bebop Minor": [0, 2, 3, 4, 5, 7, 9, 10], "Bebop Minor No.2": [0, 2, 3, 5, 7, 8, 9, 11],
  "Bebop Locrian": [0, 1, 3, 4, 5, 6, 8, 10]
};

let checks = 0; const fails = [];
function ok(cond, msg) { checks++; if (!cond && fails.length < 60) fails.push(msg); else if (!cond) fails.push(null); }
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x)) ? Object.fromEntries(Object.entries(x).sort()) : x);
function eq(a, b, msg) { ok(canon(a) === canon(b), msg + "\n    got      " + JSON.stringify(a) + "\n    expected " + JSON.stringify(b)); }
const mod = (a, n) => ((a % n) + n) % n;
const byStr = (pos) => { const m = {}; pos.notes.forEach(n => (m[n.string] = m[n.string] || []).push(n.fret)); Object.values(m).forEach(a => a.sort((x, y) => x - y)); return m; };
const strs = (pos, N) => { const m = byStr(pos), o = []; for (let s = N; s >= 1; s--) o.push(m[s]); return o; };   // low string first
const pos = (t, root, offs, sys, mf = 22) => FP.positions({ system: sys, tuning: t, rootPc: root, offsets: offs, maxFret: mf });
const find = (arr, id, oct = 0) => arr.find(p => p.id === id && p.octave === oct);

// ---------- invariants over everything ----------
const offered = {};   // name -> {guitar:[], bass:[]}
let nPos = 0, droppedAt16 = 0;
for (const [name, offs] of Object.entries(SCALES)) {
  const L = new Set(offs.map(o => mod(o, 12))).size, sorted = [...new Set(offs.map(o => mod(o, 12)))].sort((a, b) => a - b);
  offered[name] = {};
  for (const [inst, tun] of [["guitar", GUITAR], ["bass", BASS]]) {
    const sys = FP.systems(tun, offs);
    offered[name][inst] = sys.map(s => s.id);
    if (L !== 7) ok(!sys.some(s => s.id === "3nps"), name + ": 3nps offered for non-7-note scale");
    for (const s of sys) {
      ok(s.count === (s.id === "caged" ? 5 : 7), `${name} ${inst} ${s.id} count`);
      for (let root = 0; root < 12; root++) for (const mf of [16, 22]) {
        const P = pos(tun, root, offs, s.id, mf), tag = `${name} ${inst} ${s.id} root${root} mf${mf}`, N = tun.length;
        const ids = [...new Set(P.map(p => p.id))];
        // at maxFret 16 a 3NPS pattern whose lowest legal location ends above fret 16 is dropped (counted below)
        if (s.id === "3nps" && mf === 16) { ok(ids.length >= 6, tag + ": fewer than 6 3nps positions fit"); if (ids.length < 7) droppedAt16++; }
        else ok(ids.length === s.count && P.filter(p => p.octave === 0).length === s.count, tag + ": expected " + s.count + " ids at octave 0, got " + ids.join(","));
        for (let i = 1; i < P.length; i++) ok(P[i - 1].minFret <= P[i].minFret, tag + ": not sorted by minFret");
        for (const p of P) {
          nPos++;
          const pt = tag + " " + p.id + "/" + p.octave;
          ok(p.octave === 0 || p.octave === 1, pt + " octave");
          const degs = new Set(); let prevIdx = null, fmin = 99, fmax = -1;
          p.notes.forEach((n, k) => {
            const rel = n.midi - root, d = sorted.indexOf(mod(rel, 12));
            ok(d >= 0, pt + " note not in scale"); ok(n.degree === d && n.isRoot === (d === 0) && n.pc === mod(n.midi, 12), pt + " degree/pc/isRoot");
            ok(n.midi === tun[N - n.string] + n.fret, pt + " midi/string/fret mismatch");
            ok(n.fret >= 0 && n.fret <= mf, pt + " fret out of range " + n.fret);
            ok(n.finger >= (n.fret === 0 ? 0 : 1) && n.finger <= (n.fret === 0 ? 0 : 4), pt + " finger " + n.finger + " fret " + n.fret);
            degs.add(d);
            const idx = Math.floor(rel / 12) * L + d;
            if (prevIdx !== null) ok(idx === prevIdx + 1, pt + " gap/repeat across strings at midi " + n.midi);
            prevIdx = idx; fmin = Math.min(fmin, n.fret); fmax = Math.max(fmax, n.fret);
          });
          ok(degs.size === L, pt + " missing degrees");
          const bs = byStr(p);
          ok(Object.keys(bs).length === N, pt + " not every string used");
          for (const k of Object.keys(bs)) {
            const fr = p.notes.filter(n => n.string == k);
            if (s.id === "3nps") ok(fr.length === 3, pt + " 3nps needs 3 per string");
            else ok(fr.length >= 2 && fr.length <= 3, pt + " caged needs 2-3 per string");
            fr.sort((a, b) => a.fret - b.fret);
            for (let j = 1; j < fr.length; j++) ok(fr[j].finger > fr[j - 1].finger || (fr[j - 1].fret === 0 && fr[j].finger >= 1), pt + " fingers not increasing on string " + k);
          }
          const fretted = p.notes.filter(n => n.fret > 0).map(n => n.fret);
          ok(p.minFret === Math.min(...fretted) && p.maxFret === Math.max(...fretted), pt + " min/maxFret");
          if (s.id === "caged") { ok(fmax - fmin <= 4, pt + " span " + (fmax - fmin)); ok(p.stretch === (p.maxFret - p.minFret + 1 > 4), pt + " stretch flag"); }
          else { const w = Math.max(...Object.values(bs).map(a => a[a.length - 1] - a[0])); ok(w <= 5, pt + " string span " + w); ok(p.stretch === (w >= 5), pt + " stretch flag"); }
          ok(JSON.stringify(p.rootStrings) === JSON.stringify(p.notes.filter(n => n.isRoot).map(n => n.string).sort((a, b) => b - a)), pt + " rootStrings");
          if (fmin === 0) ok(Math.min(...fretted) <= 3, pt + " open string with window not at nut");
          if (p.octave === 1) { const q = find(P, p.id, 0); ok(!!q && q.notes.length === p.notes.length && q.notes.every((n, k) => p.notes[k].fret === n.fret + 12 && p.notes[k].string === n.string), pt + " octave copy is not +12"); }
        }
        // tiling: every scale note between the lowest position and the point where coverage is guaranteed
        // per string, from the lowest fret any position uses on that string up to the start of the last position
        const hi = Math.max(...P.map(p => p.minFret));
        const have = new Set(); P.forEach(p => p.notes.forEach(n => have.add(n.string + ":" + n.fret)));
        for (let st = 0; st < N; st++) {
          const lo = Math.min(...P.map(p => Math.min(...p.notes.filter(n => n.string === N - st).map(n => n.fret))));
          for (let f = lo; f <= Math.min(hi, mf); f++)
            if (sorted.includes(mod(tun[st] + f - root, 12))) ok(have.has((N - st) + ":" + f), tag + " tiling hole string " + (N - st) + " fret " + f);
        }
      }
    }
  }
}

// ---------- standard forms ----------
// CAGED major forms, C major (the five forms in "Five CAGED shapes" lessons, e.g. Guitar Lesson Pro /
// JustinGuitar "Major scale CAGED": E-shape at 7th, D-shape at 10th, C-shape open, A-shape 2nd-3rd, G-shape 5th).
// Frets per string, low E first.
const CMAJ = {
  C: [[0, 1, 3], [0, 2, 3], [0, 2, 3], [0, 2], [0, 1, 3], [0, 1, 3]],
  A: [[1, 3, 5], [2, 3, 5], [2, 3, 5], [2, 4, 5], [3, 5], [1, 3, 5]],
  G: [[5, 7, 8], [5, 7, 8], [5, 7], [4, 5, 7], [5, 6, 8], [5, 7, 8]],
  E: [[7, 8, 10], [7, 8, 10], [7, 9, 10], [7, 9, 10], [8, 10], [7, 8, 10]],
  D: [[10, 12, 13], [10, 12], [9, 10, 12], [9, 10, 12], [10, 12, 13], [10, 12, 13]]
};
for (const k of Object.keys(CMAJ)) {
  const p = find(pos(GUITAR, 0, SCALES["Major"], "caged"), k);
  ok(!!p, "C major " + k + " missing"); if (p) { eq(strs(p, 6), CMAJ[k], "C major " + k + " shape"); ok(p.label === k + " shape", "label " + p.label); }
}
// A natural minor: the same five patterns as C major (relative major), named by root: C-major C = Am, A = Gm, G = Em, E = Dm, D = Cm
const MINOR_OF = { A: "C", G: "A", E: "G", D: "E", C: "D" };
for (const k of Object.keys(MINOR_OF)) {
  const p = find(pos(GUITAR, 9, SCALES["Natural Minor"], "caged"), k);
  ok(!!p, "A minor " + k + " missing"); if (p) { eq(strs(p, 6), CMAJ[MINOR_OF[k]], "A minor " + k + "m shape = C major " + MINOR_OF[k]); ok(p.label === k + "m shape", "minor label " + p.label); }
}
// A minor pentatonic five boxes (standard "Box 1-5", e.g. every pentatonic lesson: box 1 = 5-8 with root on 6th string under finger 1).
// Shown at their lowest location; low E first.
const APENT = {
  E: [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]],              // box 1
  D: [[8, 10], [7, 10], [7, 10], [7, 9], [8, 10], [8, 10]],         // box 2
  C: [[10, 12], [10, 12], [10, 12], [9, 12], [10, 13], [10, 12]],   // box 3
  A: [[0, 3], [0, 3], [0, 2], [0, 2], [1, 3], [0, 3]],              // box 4 (an octave down: open position)
  G: [[3, 5], [3, 5], [2, 5], [2, 5], [3, 5], [3, 5]]               // box 5 (an octave down)
};
for (const k of Object.keys(APENT)) {
  const p = find(pos(GUITAR, 9, SCALES["Minor Pentatonic"], "caged"), k);
  ok(!!p, "Am pent " + k + " missing"); if (p) eq(strs(p, 6), APENT[k], "A minor pentatonic box " + k);
}
{ const b1 = find(pos(GUITAR, 9, SCALES["Minor Pentatonic"], "caged"), "E"); const r = b1.notes.find(n => n.isRoot && n.string === 6);
  ok(r && r.fret === 5 && r.finger === 1, "box 1 root on string 6 under finger 1"); }
// 3NPS G major position 1
{ const P = pos(GUITAR, 7, SCALES["Major"], "3nps"), p = find(P, "3nps-1");
  eq(strs(p, 6), [[3, 5, 7], [3, 5, 7], [4, 5, 7], [4, 5, 7], [5, 7, 8], [5, 7, 8]], "G major 3NPS pattern 1");
  eq(P.filter(x => x.octave === 0).map(x => x.id).sort(), [1, 2, 3, 4, 5, 6, 7].map(n => "3nps-" + n), "7 positions");
  eq(p.notes.slice(0, 3).map(n => n.finger), [1, 2, 4], "tone+tone is 1-2-4");
  eq(strs(find(P, "3nps-2"), 6)[0], [5, 7, 8], "pattern 2 string 6"); eq(find(P, "3nps-2").notes.slice(0, 3).map(n => n.finger), [1, 3, 4], "tone+semitone is 1-3-4");
  eq(find(P, "3nps-7").notes.slice(0, 3).map(n => n.finger), [1, 2, 4], "semitone+tone is 1-2-4 (F# G A)");
  ok(p.sublabel === "Ionian pattern", "sublabel " + p.sublabel); ok(find(P, "3nps-2").sublabel === "Dorian pattern", "Dorian tag"); }

// ---------- bass ----------
{ const P = pos(BASS, 0, SCALES["Major"], "caged");
  const rs = {}; P.filter(p => p.octave === 0).forEach(p => rs[p.id] = p.rootStrings);
  eq(rs, { C: [3], A: [3, 1], G: [4, 1], E: [4, 2], D: [2] }, "bass root strings");
  ok(find(P, "D").sublabel && /string 2/.test(find(P, "D").sublabel), "bass D sublabel " + find(P, "D").sublabel);
  eq(strs(find(P, "E"), 4), CMAJ.E.slice(0, 4), "bass E shape = guitar lowest four strings"); }

// ---------- major vs natural minor, modes ----------
const an = FP.analysis();
eq(an.caged.map(r => [r.majorShape, r.minorShape, r.sameNotes]), [["C", "Am", true], ["A", "Gm", true], ["G", "Em", true], ["E", "Dm", true], ["D", "Cm", true]], "analysis caged");
eq(an.cagedOrderShift, 1, "caged shift in order");
eq(an.threeNps.map(r => r.minorPattern), [3, 4, 5, 6, 7, 1, 2], "analysis 3nps minor pattern per major pattern");
eq(an.relativeMinorFretShift, -3, "relative minor shift");
ok(an.modes.length === 7 && an.modes.every(m => m.caged.every(c => c.sameNotes) && m.threeNps.every(c => c.sameNotes)), "all modes physically identical to the major patterns");
const physSig = (p) => p.notes.map(n => n.string + ":" + mod(n.fret, 12)).sort().join(" ");
const MODES = ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Natural Minor", "Locrian"];
for (const sys of ["caged", "3nps"]) for (const inst of [GUITAR, BASS]) for (let d = 0; d < 7; d++) for (let root = 0; root < 12; root++) {
  const offs = SCALES[MODES[d]], rel = FP.relatedPositions({ system: sys, tuning: inst, rootPc: root, offsets: offs });
  const tag = `related ${sys} ${MODES[d]} root${root}`;
  ok(rel && rel.parent.type === "Major" && rel.parent.degree === d + 1, tag + " parent");
  if (!rel) continue;
  const parentRoot = mod(root - SCALES.Major[d], 12);
  ok(rel.parent.rootPc === parentRoot, tag + " parent root");
  const mine = pos(inst, root, offs, sys), theirs = pos(inst, parentRoot, SCALES.Major, sys);
  ok(Object.keys(rel.map).length === (sys === "caged" ? 5 : 7), tag + " map size");
  for (const [id, m] of Object.entries(rel.map)) {
    const a = find(mine, id), b = find(theirs, m.parentPositionId);
    ok(a && b && physSig(a) === physSig(b), tag + " " + id + " not physically identical to parent " + m.parentPositionId);
    ok(b && b.label === m.parentLabel, tag + " parentLabel");
    if (sys === "3nps") ok(m.parentPositionId === "3nps-" + (((Number(id.split("-")[1]) - 1 + d) % 7) + 1), tag + " 3nps degree shift");
  }
}
// natural minor <-> major, numeric
{ const rel = FP.relatedPositions({ system: "caged", tuning: GUITAR, rootPc: 9, offsets: SCALES["Natural Minor"] });
  eq(rel.map, { A: { parentPositionId: "C", parentLabel: "C shape" }, G: { parentPositionId: "A", parentLabel: "A shape" }, E: { parentPositionId: "G", parentLabel: "G shape" }, D: { parentPositionId: "E", parentLabel: "E shape" }, C: { parentPositionId: "D", parentLabel: "D shape" } }, "Am -> C major map");
  eq(rel.parent, { rootPc: 0, type: "Major", degree: 6 }, "Am parent");
  ok(FP.relatedPositions({ system: "caged", tuning: GUITAR, rootPc: 0, offsets: SCALES["Minor Pentatonic"] }) === null, "pentatonic has no parent");
  const hm = FP.relatedPositions({ system: "3nps", tuning: GUITAR, rootPc: 4, offsets: SCALES["Spanish Phrygian Dominant"] });
  ok(hm && hm.parent.type === "Harmonic Minor" && hm.parent.degree === 5 && hm.parent.rootPc === 9, "Phrygian dominant -> harmonic minor degree 5"); }

// ---------- unsupported input ----------
eq(FP.systems(UKE, SCALES["Major"]), [], "ukulele");
eq(FP.systems(GUITAR, [0, 4, 7, 12]), [], "triad offsets");
eq(FP.systems(GUITAR, [0, 4, 7, 10, 12]), [], "dominant 7th + octave: 4 notes");
eq(FP.systems([38, 45, 50, 55, 59, 64], SCALES["Major"]), [], "drop D is not all-fourths");
eq(FP.systems(BASS.concat([43 + 5]), SCALES["Major"]), [], "5-string bass unsupported");
eq(FP.systems(null, null), [], "null input"); eq(pos(UKE, 0, SCALES["Major"], "caged"), [], "uke positions");
eq(pos(GUITAR, 0, [0, 4, 7, 12], "caged"), [], "triad positions");
eq(pos(GUITAR, 0, SCALES["Whole Tone"], "3nps"), [], "3nps not offered for whole tone");
ok(FP.systems(GUITAR, [0, 2, 4, 5, 7, 9, 11, 12]).length === 2, "trailing 12 ignored");

// ---------- report ----------
console.log("Offered systems (guitar | bass):");
for (const [n, o] of Object.entries(offered)) console.log("  " + n.padEnd(26) + (o.guitar.join("+") || "-").padEnd(12) + (o.bass.join("+") || "-"));
const failed = fails.length;
if (failed) { console.log("\nFAILURES:"); fails.filter(Boolean).forEach(f => console.log(" - " + f)); }
console.log(`\nfret-positions: ${checks - failed} of ${checks} checks passed, ${failed} failed (${nPos} positions generated; ${droppedAt16} 3NPS runs at maxFret 16 dropped a position)`);
process.exit(failed ? 1 : 0);
