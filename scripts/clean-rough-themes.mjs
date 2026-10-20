// Clean the old theme set (../classical-music-themes: 9,824 themes, midi2abc from the EDM MIDI) for the unlisted
// reference page tools/classical-themes-rough.qmd.  Usage: node scripts/clean-rough-themes.mjs
//
// Writes scripts/theme-sources/rough/<id>.abc, one per old theme:
//   - a theme MTD has: the MTD version (scripts/theme-sources/mtd/<id>.abc, both parts of a split one; a hand fix wins);
//   - otherwise the old ABC, cleaned in two ways that change no note:
//       beams   notes are joined or spaced by the site's rules (notation-doc.js beam()): notes shorter than a quarter are
//               beamed within a beat (a dotted quarter in compound meters, the 3+2 / 2+2+3 groups in 5/8 and 7/8);
//               eighths fill a whole bar of 2/4 or 3/4, or a half bar of 4/4, as one beam when nothing else is in it; a
//               rest, a longer note or an inline field breaks the beam; a tuplet is beamed under its own bracket;
//       accidentals  one that repeats what is already in force in the bar (the key signature, or the same note
//               earlier in the bar) is dropped: _A _A _A in a bar becomes _A A A. Only when it repeats under both ways
//               of reading ABC (the same octave only, as ABC 2.1; or every octave of the letter, as AbcTune).
//     Each cleaned theme is checked against the old one (the same pitches at the same times, read by AbcTune) and
//     parsed by abcjs; one that fails keeps the old text, and is listed.
// Before that, one repair that does change notes, checked and marked on the theme (%%repaired octave):
//   octave    a theme sitting very high is moved down an octave (octaveDown, below: a rule fitted on MTD's themes).
// Not repaired: triplets midi2abc cut into tied pieces ("(3B4-BA4-AB4-B"). Their right lengths can't be worked out bar by
// bar, because the barlines around them are misplaced too (counted from the first note, and thrown further by the
// rounding); it needs the whole theme re-barred, which is the pickup problem.
// Then: node scripts/import-themes.mjs --rough
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const OLD = path.resolve("../classical-music-themes");
const MTD = path.resolve("scripts/theme-sources/mtd"), FIX = path.resolve("scripts/theme-fixes");
const OUT = path.resolve("scripts/theme-sources/rough");

// the checkers: AbcTune (the Tune Assessment's note reader) and abcjs
const g = { console, Math, JSON }; g.window = g; g.self = g; vm.createContext(g);
for (const f of ["apps/shared/abcjs-basic.js", "apps/shared/abc-core.js", "apps/tune-assessment/abc-tune.js"])
  vm.runInContext(fs.readFileSync(f, "utf8"), g, { filename: f });

// ---- key signatures ----
const SHARPS = "FCGDAEB", ORDER = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
function keySig(k) {
  const f = ORDER.indexOf(k) - 7, sig = {};
  if (f > 0) for (const l of SHARPS.slice(0, f)) sig[l] = 1;
  if (f < 0) for (const l of [...SHARPS].reverse().slice(0, -f)) sig[l] = -1;
  return sig;
}
const ACC = { "^^": 2, "^": 1, "=": 0, "_": -1, "__": -2 };

// ---- one bar's tokens ----
// kinds: note (a note, rest or chord, with its length), pre (attaches to the next note: decorations, chord symbols,
// grace notes, a tuplet mark, an open slur), post (attaches to the note before: ties, close slurs, broken rhythm),
// field (an inline [K:]/[M:] field: breaks a beam)
const TOK = /(\[[A-Za-z]:[^\]]*\])|("[^"]*"|![^!]*!|\+[^+]*\+|\{[^}]*\}|\(\d(?::\d*)?(?::\d*)?|\((?!\d)|[.~HLMOPSTuv])|(\[[^\]]*\](\d*\/*\d*))|((?:\^\^|\^|__|_|=)?[A-Ga-g][,']*|[zx])(\d*\/*\d*)|(-|\)|[<>]+)|(\s+)/gy;
function lenOf(s) {
  if (!s) return 1;
  const m = /^(\d*)(\/*)(\d*)$/.exec(s); if (!m) return 1;
  let l = m[1] ? +m[1] : 1;
  if (m[2]) l /= m[3] ? +m[3] : 2 ** m[2].length;
  return l;
}
function tokenize(bar) {
  const out = []; TOK.lastIndex = 0; let m;
  while (TOK.lastIndex < bar.length) {
    const at = TOK.lastIndex; m = TOK.exec(bar);
    if (!m) return null;   // something we don't read: leave this bar alone
    if (m[1]) out.push({ k: "field", t: m[1] });
    else if (m[2]) out.push({ k: "pre", t: m[2] });
    else if (m[3]) out.push({ k: "note", t: m[3], chord: true, len: lenOf(m[4]), rest: false });
    else if (m[5]) out.push({ k: "note", t: m[5] + m[6], head: m[5], dur: m[6], len: lenOf(m[6]), rest: /^[zx]/.test(m[5]) });
    else if (m[7]) out.push({ k: "post", t: m[7] });
    else if (m[8]) { /* space: dropped, we decide spacing */ }
    if (TOK.lastIndex === at) return null;
  }
  return out;
}

// ---- beams (the site's rules) ----
function meterInfo(M) {
  const [n, d] = M.split("/").map(Number);
  const family = d === 8 && n % 3 === 0 && n > 3 ? "triple" : (d === 8 && (n === 5 || n === 7)) ? "other" : "duple";
  return { n, d, family, barQ: n * 4 / d };
}
function groupStarts(mi) {   // in quarters from the barline
  if (mi.family === "triple") { const o = []; for (let x = 0; x < mi.barQ - 1e-9; x += 1.5) o.push(x); return o; }
  if (mi.family === "other") return mi.n === 5 ? [0, 1.5] : [0, 1, 2];
  const o = [], step = 4 / mi.d; for (let x = 0; x < mi.barQ - 1e-9; x += step) o.push(x); return o;
}

function cleanBody(body, meter, unit, key) {
  const mi0 = meterInfo(meter), Lq = (() => { const [a, b] = unit.split("/").map(Number); return 4 * a / b; })();
  const sig = keySig(key);
  // split into bars, keeping the barline text
  const parts = body.replace(/\\\s*(\n|$)/g, " ").replace(/\n/g, " ").split(/(\|\]|\|\||\[\||\|:|:\||\||::)/);
  let mi = mi0, out = "", offset = 0, firstBar = true;
  const carry = { tieOpen: false };
  for (let p = 0; p < parts.length; p += 2) {
    const text = parts[p], line = parts[p + 1] || "";
    const toks = text.trim() ? tokenize(text.trim()) : [];
    if (toks === null) { out += text + line; continue; }
    // meter change in the bar
    toks.filter((t) => t.k === "field" && /^\[M:/.test(t.t)).forEach((t) => { const mm = /\[M:\s*(\d+\/\d+)/.exec(t.t); if (mm) mi = meterInfo(mm[1]); });
    // positions (quarters from the bar start), tuplets and broken rhythm applied
    let pos = 0, tupLeft = 0, tupF = 1, tupId = 0, cur = null, brokenNext = 1;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.k === "pre" && /^\(\d/.test(t.t)) {
        const mm = /^\((\d)(?::(\d*))?(?::(\d*))?/.exec(t.t), P = +mm[1];
        const Q = mm[2] ? +mm[2] : (P === 2 || P === 4 || P === 8 ? 3 : P === 3 || P === 6 ? 2 : (mi.family === "triple" ? 3 : 2));
        tupF = Q / P; tupLeft = mm[3] ? +mm[3] : P; tupId++;
      }
      if (t.k === "post" && /[<>]/.test(t.t) && cur) {
        const n = t.t.length, f = 1 - 0.5 ** n, gt = t.t[0] === ">";
        const a = gt ? 1 + f : 1 - f; // previous note's factor
        pos += cur.q * (a - 1); cur.q *= a; brokenNext = gt ? 1 - f : 1 + f;
      }
      if (t.k !== "note") continue;
      let q = t.len * Lq * brokenNext; brokenNext = 1;
      if (tupLeft > 0) { q *= tupF; t.tup = tupId; tupLeft--; } else t.tup = 0;
      t.pos = pos; t.q = q; pos += q; cur = t;
    }
    // the first bar may be a pickup: align its notes to the end of the bar, so beats fall where they sound
    const shift = firstBar && pos < mi.barQ - 1e-6 && p + 2 < parts.length ? mi.barQ - pos : 0;
    if (toks.some((t) => t.k === "note" && !t.rest)) firstBar = false;
    const g = groupStarts(mi);
    const groupOf = (x) => { let k = 0; g.forEach((s, i) => { if (x + 1e-9 >= s) k = i; }); return k; };
    const notes = toks.filter((t) => t.k === "note");
    const eighthsOnly = (a, b) => { const its = notes.filter((t) => t.pos + shift >= a - 1e-9 && t.pos + shift < b - 1e-9);
      return its.length > 1 && its.every((t) => !t.rest && Math.abs(t.q - 0.5) < 1e-9 && !t.tup) && Math.abs(its.reduce((s, t) => s + t.q, 0) - (b - a)) < 1e-9; };
    let wide = null;
    if (mi.family === "duple" && mi.d === 4 && !shift) {
      if ((mi.n === 2 || mi.n === 3) && eighthsOnly(0, mi.barQ)) wide = () => "all";
      else if (mi.n === 4) { const h1 = eighthsOnly(0, 2), h2 = eighthsOnly(2, 4); if (h1 || h2) wide = (x) => x < 2 ? (h1 ? "a" : groupOf(x)) : (h2 ? "b" : groupOf(x)); }
    }
    const keyOf = (t) => (t.tup ? "t" + t.tup : wide ? wide(t.pos + shift) : groupOf(t.pos + shift));
    const beamable = (t) => t && !t.rest && t.q < 1 - 1e-9;

    // accidentals: what is in force for each letter+octave in this bar
    const state = {};
    for (const t of notes) {
      if (t.rest) continue;
      if (t.chord) {   // readers disagree on whether a chord's accidentals carry on: after one, keep every accidental
        for (const mm of t.t.matchAll(/([A-Ga-g])([,']*)/g)) { state[mm[1] + mm[2]] = NaN; state[mm[1].toUpperCase()] = NaN; }
        continue;   // (NaN equals nothing, so nothing on those letters is dropped for the rest of the bar)
      }
      const heads = [t];
      for (const h of heads) {
        const mm = /^((?:\^\^|\^|__|_|=)?)([A-Ga-g])([,']*)$/.exec(h.head); if (!mm) continue;
        const L = mm[2].toUpperCase(), k = mm[2] + mm[3];
        // ABC 2.1 carries an accidental to the same note in the same octave; some readers (this site's AbcTune) carry
        // it to every octave of the letter. Drop one only when it repeats what is in force under both readings.
        const now = k in state ? state[k] : (sig[L] || 0), nowL = L in state ? state[L] : (sig[L] || 0);
        if (mm[1]) {
          const a = ACC[mm[1]];
          if (a === now && a === nowL) { h.t = mm[2] + mm[3] + h.dur; h.head = mm[2] + mm[3]; }   // repeats what is in force: drop it
          state[k] = a; state[L] = a;
        }
      }
    }
    // join the tokens: a space before a note's prefix unless it is beamed to the note before
    let s = "", prevNote = null, broke = false, glue = false;   // glue: after > or <, which must touch the next note
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.k === "post") { s += t.t; if (/[<>]/.test(t.t)) glue = true; continue; }
      if (t.k === "field") { s += (s ? " " : "") + t.t; broke = true; prevNote = null; continue; }
      // start of a note's group (its prefixes, then the note)
      let j = i; while (j < toks.length && toks[j].k === "pre") j++;
      const n = toks[j];
      if (!n) { s += (s ? " " : "") + toks.slice(i).map((x) => x.t).join(""); break; }
      const join = prevNote && !broke && beamable(prevNote) && beamable(n) && keyOf(prevNote) === keyOf(n)
        && !(n.tup && prevNote.tup !== n.tup) && !(prevNote.tup && n.tup !== prevNote.tup);
      s += (s && !join && !glue ? " " : "") + toks.slice(i, j + 1).map((x) => x.t).join(""); glue = false;
      prevNote = n; broke = false; i = j;
    }
    offset += pos;
    out += (out && !/\s$/.test(out) ? " " : "") + s + (line ? " " + line : "");
  }
  return out.replace(/\s+/g, " ").replace(/ \|/g, " |").trim();
}

// ---- octaves: the EDM MIDI often sits an octave too high ----
// On the 2,067 themes MTD also has, a theme whose middle note is D#6 (MIDI 87) or higher, or whose lowest note is A#5 (82)
// or higher, was an octave too high in 308 of 312 cases (98.7%; about 42% of all the octave errors there). Those are
// moved down an octave; the rest are left (below that, right and wrong look alike).
function octaveDown(body) {
  return body.replace(/("[^"]*"|![^!]*!|\[[A-Za-z]:[^\]]*\])|((?:\^\^|\^|__|_|=)?)([A-Ga-g])([,']*)/g, (m, skip, acc, L, oct) => {
    if (skip) return skip;
    if (oct.includes("'")) return acc + L + oct.replace("'", "");
    if (L === L.toLowerCase()) return acc + L.toUpperCase() + oct;
    return acc + L + oct + ",";
  });
}

// ---- check: same pitches at the same times, and abcjs reads it without warnings ----
function notesOf(abc) { try { return g.AbcTune.melodyNotes(abc).notes.map((n) => n.midi + "@" + n.onset.toFixed(4)).join(" "); } catch (e) { return "ERR"; } }
function pitchesOf(abc) { try { return g.AbcTune.melodyNotes(abc).notes.map((n) => n.midi); } catch (e) { return []; } }
function warnings(abc) { try { return (g.ABCJS.parseOnly(abc)[0].warnings || []).length; } catch (e) { return 99; } }

// ---- run ----
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".abc")) fs.unlinkSync(path.join(OUT, f));
const tsv = {};
for (const ln of fs.readFileSync(path.join(OLD, "tsvs/themes.tsv"), "utf8").split("\n")) { const p = ln.split("\t"); if (p.length >= 4) tsv[p[0]] = p; }
const mtdFiles = fs.readdirSync(MTD).filter((f) => f.endsWith(".abc"));
let fromMtd = 0, cleaned = 0, unchanged = 0, accDropped = 0, octaveFixed = 0; const kept = [];
for (const id of Object.keys(tsv).sort()) {
  const oldFile = path.join(OLD, "abcs", id + ".abc"); if (!fs.existsSync(oldFile)) continue;
  const mine = mtdFiles.filter((f) => f === id + ".abc" || f.startsWith(id + "-"));
  if (mine.length) {
    for (const f of mine) {
      const fix = path.join(FIX, f);
      const txt = fs.readFileSync(fs.existsSync(fix) ? fix : path.join(MTD, f), "utf8");
      fs.writeFileSync(path.join(OUT, f), txt.replace(/^(X:.*)$/m, "$1\n%%from mtd")); fromMtd++;
    }
    continue;
  }
  const [, last, first, title, yt] = tsv[id];
  const old = fs.readFileSync(oldFile, "utf8");
  const head = (k) => ((old.match(new RegExp("^" + k + ":\\s*(.*)$", "m")) || [])[1] || "").replace(/\s*%.*$/, "").trim();
  const M = head("M"), L = head("L"), K = head("K");
  const body = old.slice(old.search(/^K:.*$/m)).replace(/^K:.*\n?/, "").trim();
  const wrap = (b) => "X:1\nM:" + M + "\nL:" + L + "\nK:" + K + "\n" + b + "\n";
  const notes = [];   // what was done to this theme, for its card
  let body0 = body;
  // an octave too high: every note exactly 12 lower, at the same time
  const ps = pitchesOf(wrap(body0));
  if (ps.length) {
    const sorted = [...ps].sort((a, b) => a - b), med = sorted[sorted.length >> 1], lo = sorted[0];
    if (med >= 87 || lo >= 82) {
      const down = octaveDown(body0);
      const want = notesOf(wrap(body0)).split(" ").map((x) => { const [m, o] = x.split("@"); return (m - 12) + "@" + o; }).join(" ");
      if (notesOf(wrap(down)) === want) { body0 = down; notes.push("octave"); octaveFixed++; }
    }
  }
  const before = wrap(body0);
  let clean = body0;
  try { clean = cleanBody(body0, M, L, K); } catch (e) { clean = body0; }
  let after = "X:1\nM:" + M + "\nL:" + L + "\nK:" + K + "\n" + clean + "\n";
  if (notesOf(after) !== notesOf(before) || warnings(after) > warnings(before)) {
    if (process.env.WHY) console.log(id, notesOf(after) !== notesOf(before) ? "notes differ" : "abcjs warns", warnings(before), warnings(after)); if (process.env.WHY === id) console.log(notesOf(before) + "\n" + notesOf(after) + "\n" + after);
    kept.push(id); clean = body0.replace(/\\\s*(\n|$)/g, " "); after = before; }
  else { const norm = (x) => x.replace(/\\\s*(\n|$)/g, " ").replace(/\s*\|\s*/g, "|").replace(/\s+/g, " ").trim();
    if (norm(clean) !== norm(body)) cleaned++; else unchanged++; }
  accDropped += (body.match(/(\^\^|\^|__|_|=)(?=[A-Ga-g])/g) || []).length - (clean.match(/(\^\^|\^|__|_|=)(?=[A-Ga-g])/g) || []).length;
  const hdr = ["X:" + parseInt(id, 10), "%%from edm", "T:" + title, "C:" + first + " " + last, "%%composer " + last + "|" + first,
    "% EDM " + id + " (midi2abc, from ../classical-music-themes), cleaned by scripts/clean-rough-themes.mjs"];
  if (yt) hdr.push("%%link " + yt);
  if (notes.length) hdr.push("%%repaired " + notes.join(" "));   // octave: a scripted repair (see the top of this script)
  fs.writeFileSync(path.join(OUT, id + ".abc"), hdr.concat(["M:" + M, "L:" + L, "K:" + K, clean]).join("\n") + "\n");
}
console.log("moved down an octave:", octaveFixed);
console.log("wrote", OUT + ":", fromMtd, "from MTD;", cleaned, "changed (beams or accidentals),", unchanged, "already right;", accDropped,
  "repeated accidentals dropped;", kept.length, "kept as they were (the check failed)", kept.slice(0, 12).join(" "));
