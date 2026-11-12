// bimmuda-salami.mjs: chords for the Pop Themes from the McGill Billboard (SALAMI-format) analyses, where a song is in both.
//   node scripts/bimmuda-salami.mjs [--report] [--id <section id>]      then: node scripts/import-themes.mjs --set bimmuda
// Writes scripts/theme-sources/bimmuda-chords.json: { "<section id>": { len, src, shift, offset, fit, at: [[offset, "Am"], …] } }
//   offset = character offset in the section's `body` (pop-themes-data.js) of the note a chord symbol sits on; len = body.length when
//   built, so the importer ignores an entry whose body has since changed (as themes-rn.js does). The page draws them as chord
//   symbols above the notes ("Show chords"), and "Only sections that have them" filters on them.
// How a section finds its chords (in the spirit of scripts/theme-romantext.mjs):
//   1. songs: the BiMMuDa song and a Billboard-set song (apps/shared/data/billboard/index.json) with the same normalised title and an
//      artist in common (names split into words, "the" / "and" / "feat" dropped).
//   2. candidates: the Billboard song's sections with the section's label (verse, chorus, pre-chorus, bridge, intro, outro; BiMMuDa's
//      break = instrumental / solo / interlude, hook = chorus / refrain, an unlabelled section = any) and a bar count within one bar
//      of the melody's (a pickup bar not counted).
//   3. key: the chords are transposed by the difference between BiMMuDa's tonic and the annotation's tonic (0 and that shift are both
//      tried; the chord names are spelled for BiMMuDa's key).
//   4. fit: the share, by duration, of the melody's notes that fall on a beat and are tones of the chord in force (AbcNHT.chordPcs,
//      sixths, sevenths and ninths count), the melody's bars set against the section's bars at offsets -2..+2 (a pickup or an
//      annotator's different first bar). Kept only if fit >= FIT (0.6) and it beats every other candidate / shift / offset by LIFT (0.05)
//      and at least MINN (8) on-beat notes were scored. Otherwise the section has no chords.
// --report lists every section of every matched song: candidates, best fit, the next best, and why it was rejected.
// Needs nothing outside the repo. The Billboard annotations are CC0 (Burgoyne, Wild and Fujinaga 2011).
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
globalThis.window = globalThis; globalThis.POP_THEMES = undefined;
require(ROOT + "/apps/themes/pop-themes-data.js");
const T = globalThis.POP_THEMES.filter((t) => t.set === "BiMMuDa");   // (CoCoPops and RS200 sections have their own chords)
require(ROOT + "/apps/shared/abc-core.js");
const AbcEvents = require(ROOT + "/apps/shared/abc-events.js"); require(ROOT + "/apps/shared/abc-nht.js");
const AbcNHT = globalThis.AbcNHT;
globalThis.document = { readyState: "complete", querySelector: () => null };
require(ROOT + "/apps/shared/timestamp-player/salami-chords.js");
const fmtChord = globalThis.SalamiChords.chord;
const arg = (k) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : null);
const REPORT = process.argv.includes("--report"), ONLY = arg("--id");
const FIT = +(process.env.FIT || 0.6), LIFT = +(process.env.LIFT || 0.05), MINN = +(process.env.MINN || 8);
const BB = ROOT + "/apps/shared/data/billboard";
const index = JSON.parse(fs.readFileSync(BB + "/index.json", "utf8"));

// ---- 1. songs ----
const STOPW = new Set(["the", "and", "a", "an", "feat", "featuring", "ft", "with", "of", "his", "her", "orchestra", "band", "his"]);
const words = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]/g, " ").replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
const titleKey = (s) => words(s).filter((w) => w !== "the" && w !== "a").join(" ");
const artistSet = (s) => new Set(words(s).filter((w) => !STOPW.has(w)).map((w) => w.replace(/s$/, "")));   // Jackson 5 / Jacksons
const bbByTitle = new Map();
for (const s of index) { const k = titleKey(s.title); if (!bbByTitle.has(k)) bbByTitle.set(k, []); bbByTitle.get(k).push(s); }
const songs = new Map();   // "1950_01" -> { title, artist, year, sections: [theme] }
for (const t of T) {
  if (!songs.has(t.song)) songs.set(t.song, { key: t.song, title: t.title, artist: t.last, year: t.year, sections: [] });
  songs.get(t.song).sections.push(t);
}
const matches = new Map();   // song key -> billboard index row
for (const s of songs.values()) {
  const cands = (bbByTitle.get(titleKey(s.title)) || []).filter((b) => { const a = artistSet(s.artist), c = artistSet(b.artist); return [...a].some((w) => c.has(w)); });
  if (cands.length) matches.set(s.key, cands.sort((a, b) => Math.abs(a.year - s.year) - Math.abs(b.year - s.year))[0]);
}

// ---- Billboard file -> sections of bars (each bar: chords per beat) ----
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOfName = (r) => { let p = PC[r[0]]; for (const c of r.slice(1)) p += c === "#" ? 1 : -1; return ((p % 12) + 12) % 12; };
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
function parseBillboard(id) {
  const text = fs.readFileSync(BB + "/" + id + ".txt", "utf8"), meta = {}, lines = [];
  for (const l of text.split(/\r?\n/)) {
    const h = /^\s*#\s*(\w+)\s*:\s*(.*)$/.exec(l); if (h) { meta[h[1].toLowerCase()] = h[2].trim(); continue; }
    const m = /^\s*([-\d.eE+]+)\s+(.*)$/.exec(l); if (m && isFinite(parseFloat(m[1]))) lines.push({ t: parseFloat(m[1]), c: m[2] });
  }
  const bpb = parseInt((meta.metre || "4/4").split("/")[0], 10) || 4, secs = []; let cur = null;
  for (const ln of lines) {
    const c = ln.c, bm = /\|.*\|(?:\s*x(\d+))?/.exec(c), rest = bm ? c.replace(bm[0], "") : c;
    let label = null, letter = null;
    for (const tk of rest.split(",").map((x) => x.trim()).filter(Boolean)) {
      if (/^[A-Z]'*$/.test(tk)) letter = tk;
      else if (/^[a-z][a-z \-]*$/i.test(tk) && !/^(silence|end|fadeout|fade out)$/i.test(tk)) label = tk.toLowerCase();
    }
    if (label || letter) { cur = { label: (label || letter).replace(/[- ]/g, ""), letter, bars: [] }; secs.push(cur); }
    if (/(^|,)\s*(silence|end)\s*(,|$)/i.test(c) && !bm) cur = null;
    if (!bm) continue;
    if (!cur) { cur = { label: "intro", letter: null, bars: [] }; secs.push(cur); }
    const body = bm[0].replace(/\s*x\d+\s*$/, ""), times = bm[1] ? parseInt(bm[1], 10) : 1;
    const one = body.replace(/\|\||\|:|:\|/g, "|").split("|").slice(1, -1).map((b) => {
      const cells = b.trim().split(/\s+/).filter(Boolean); if (cells.length && /^\(\d+\/\d+\)$/.test(cells[0])) cells.shift();
      return cells;
    }).filter((b) => b.length);
    for (let r = 0; r < times; r++) for (const b of one) cur.bars.push(b);
  }
  // a bar's cells -> a chord per cell; "." holds the one before (across bars too)
  let prev = null;
  for (const s of secs) for (const b of s.bars) for (let i = 0; i < b.length; i++) {
    if (b[i] === ".") b[i] = prev; else prev = b[i];
  }
  for (const s of secs) for (const b of s.bars) for (let i = 0; i < b.length; i++) if (b[i] == null) b[i] = prev;
  const tonic = (meta.tonic || "C").replace(/[^A-Gb#]/g, "") || "C";
  return { meta, tonic, secs: secs.filter((s) => s.bars.length) };
}
const LABELS = { verse: ["verse"], chorus: ["chorus"], prechorus: ["prechorus"], postchorus: ["postchorus"], bridge: ["bridge"], intro: ["intro"], outro: ["outro", "coda", "ending"],
  break: ["instrumental", "solo", "interlude", "break", "trans", "transition"], hook: ["chorus", "refrain", "hook"] };
const labelOk = (bimLabel, secLabel) => bimLabel === "unlabelled" || (LABELS[bimLabel] || [bimLabel]).includes(secLabel);

// ---- the melody ----
const keyPrefersFlats = (t) => t.fifths < 0 || (t.fifths === 0 && false);
function melody(t) {
  const abc = "M:" + t.meter + "\nL:" + t.unit + "\nK:" + t.key + "\n" + t.body + "\n", off = abc.length - t.body.length;
  const ev = AbcEvents.fromAbc(abc);
  const all = ev.written; if (!all.length) return null;
  const nb = Math.max(...all.map((e) => e.bar)) + 1, start = [];
  all.forEach((e) => { if (start[e.bar] === undefined || e.t_on < start[e.bar]) start[e.bar] = e.t_on; });
  const barQ = ev.barQuarters || (+t.meter.split("/")[0] * 4 / +t.meter.split("/")[1]);
  const pick = nb > 1 && start[1] !== undefined && start[1] - start[0] < barQ - 1e-6 ? 1 : 0;   // a short first bar is a pickup
  const [n, d] = t.meter.split("/").map(Number), beat = d === 8 && n % 3 === 0 && n > 3 ? 1.5 : 4 / d;
  const bars = nb - pick;
  const notes = all.filter((e) => e.kind === "note").map((e) => {
    const bs = start[e.bar], be = start[e.bar + 1] !== undefined ? start[e.bar + 1] : bs + barQ, len = pick && e.bar === 0 ? barQ : be - bs;
    const bstart = pick && e.bar === 0 ? start[1] - barQ : bs;
    return { bar: e.bar - pick, frac: (e.t_on - bstart) / (pick && e.bar === 0 ? barQ : len), onBeat: Math.abs((e.t_on - bstart) / beat - Math.round((e.t_on - bstart) / beat)) < 1e-6,
      dur: Math.min(e.t_off - e.t_on, beat), midi: e.pitches[0].midi, at: e.i, tied: false, ton: e.t_on };
  });
  return { notes, bars, pick, barQ, beat, abc };
}

// ---- fit ----
const pcsCache = new Map();
function pcsOf(sym) {
  if (!pcsCache.has(sym)) { const r = sym === "N.C." ? null : AbcNHT.chordPcs(sym); pcsCache.set(sym, r && r.pcs ? r.pcs : null); }
  return pcsCache.get(sym);
}
function chordName(raw, shift, flats) {
  if (!raw || raw === "N" || raw === "&pause" || raw === "X") return "N.C.";
  const m = /^([A-G][b#]*)(.*)$/.exec(raw); if (!m) return null;
  const pc = (pcOfName(m[1]) + shift + 120) % 12, names = flats ? FLAT : SHARP;
  return fmtChord(names[pc] + m[2]);
}
function score(mel, sec, shift, offset, flats) {
  let w = 0, ok = 0, n = 0; const sig = [];   // sig: the chord under every note: two alignments with the same chords are one answer
  for (const nt of mel.notes) {
    if (nt.bar < 0) continue;
    const bi = nt.bar + offset; if (bi < 0 || bi >= sec.bars.length) { sig.push("-"); continue; }
    const cells = sec.bars[bi], raw = cells[Math.min(cells.length - 1, Math.max(0, Math.floor(nt.frac * cells.length + 1e-6)))];
    const sym = chordName(raw, shift, flats); sig.push(sym || "-");
    if (!nt.onBeat || !sym || sym === "N.C.") continue;
    const p = pcsOf(sym); if (!p) continue;
    w += nt.dur; n++;
    if (p.includes(((nt.midi % 12) + 12) % 12)) ok += nt.dur;
  }
  return { fit: w ? ok / w : 0, n, sig: sig.join(" ") };
}
function chordsAt(mel, sec, shift, offset, flats, body) {
  const at = []; let last = null;
  for (const nt of mel.notes) {
    if (nt.bar < 0) continue;
    const bi = nt.bar + offset; if (bi < 0 || bi >= sec.bars.length) continue;
    const cells = sec.bars[bi], raw = cells[Math.min(cells.length - 1, Math.max(0, Math.floor(nt.frac * cells.length + 1e-6)))];
    const sym = chordName(raw, shift, flats); if (!sym || sym === "N.C." || sym === last) continue;
    // a chord changes where a cell starts: put it on the first note of that cell, not a later note of the same cell
    const cellStart = Math.floor(nt.frac * cells.length + 1e-6) / cells.length;
    if (at.length === 0 || nt.frac - cellStart < 1e-6 || true) { at.push([nt.at, sym]); last = sym; }
  }
  // each symbol goes before the note's tuplet mark, if it opens one
  return at.map(([i, s]) => { let j = i; const pre = /\(\d(?::\d)?(?::\d)?$/.exec(body.slice(0, j)); if (pre) j -= pre[0].length; return [j, s]; });
}

// ---- run ----
const out = {}, lines = [], cache = new Map(), stat = { songs: 0, sections: 0, accepted: 0, none: {} };
const bump = (k) => { stat.none[k] = (stat.none[k] || 0) + 1; };
const pcOfTonic = (s) => pcOfName(s.replace(/[^A-Gb#]/g, "")[0] ? s.replace(/[^A-Gb#]/g, "") : "C");
for (const [key, bb] of matches) {
  const song = songs.get(key); if (ONLY && !song.sections.some((t) => t.id === ONLY)) continue;
  stat.songs++;
  if (!cache.has(bb.id)) cache.set(bb.id, parseBillboard(bb.id));
  const B = cache.get(bb.id);
  lines.push(`== ${key} ${song.title} - ${song.artist} (${song.year})  =  Billboard ${bb.id} ${bb.title} - ${bb.artist} (${bb.year}), tonic ${B.tonic}; sections: ${B.secs.map((s) => s.label + ":" + s.bars.length).join(" ")}`);
  for (const t of song.sections) {
    if (ONLY && t.id !== ONLY) continue;
    stat.sections++;
    const mel = melody(t);
    if (!mel) { lines.push(`  ${t.id} ${t.section}: no notes`); bump("no notes"); continue; }
    const flats = t.fifths < 0, bimTonic = pcOfName(t.key.replace(/m$/, "")), salTonic = pcOfName(B.tonic);
    const diff = (((t.minor ? (bimTonic + 3) % 12 : bimTonic) - salTonic + 12) % 12);   // tonic to tonic; a minor key against the annotation's tonic read as its relative major
    const shifts = [...new Set([0, (bimTonic - salTonic + 12) % 12, diff])];
    const labelled = B.secs.filter((s) => labelOk(t.section, s.label));
    if (!labelled.length) { lines.push(`  ${t.id} ${t.section}: rejected, no section called that in the Billboard analysis`); bump("no section with that label"); continue; }
    const cands = labelled.filter((s) => Math.abs(s.bars.length - mel.bars) <= 1);
    if (!cands.length) { lines.push(`  ${t.id} ${t.section} (${mel.bars} bars): rejected, label found (${labelled.map((s) => s.bars.length + " bars").join(", ")}) but no bar count within 1`); bump("no section of the same bar count (+-1)"); continue; }
    const results = [];
    for (const sec of cands) for (const shift of shifts) for (let offset = -2; offset <= 2; offset++) {
      const r = score(mel, sec, shift, offset, flats); results.push({ sec, shift, offset, ...r });
    }
    results.sort((a, b) => b.fit - a.fit);
    const best = results[0];
    // the next best must be a different alignment (another offset, section or shift), not the same one
    const next = results.slice(1).find((r) => r.sig !== best.sig) || { fit: 0 };   // another answer: not the same chords under the notes (a repeated verse, a looped bar)
    const tag = `  ${t.id} ${t.section} (${mel.bars} bars${mel.pick ? " + pickup" : ""}): best ${best.sec.label} ${best.sec.bars.length} bars, shift ${best.shift}, offset ${best.offset}, fit ${best.fit.toFixed(2)} on ${best.n} notes, next ${next.fit.toFixed(2)}`;
    let why = null;
    if (best.n < MINN) why = `only ${best.n} on-beat notes scored`;
    else if (best.fit < FIT) why = `fit below ${FIT}`;
    else if (best.fit - next.fit < LIFT) why = `does not beat the next alignment by ${LIFT}`;
    if (why) { lines.push(tag + ": rejected, " + why); bump(why.replace(/\d+(\.\d+)?/g, "N")); continue; }
    const at = chordsAt(mel, best.sec, best.shift, best.offset, flats, t.body);
    if (!at.length) { lines.push(tag + ": rejected, no chord symbols"); bump("no chord symbols"); continue; }
    out[t.id] = { len: t.body.trim().length, src: "billboard " + bb.id, shift: best.shift, offset: best.offset, fit: +best.fit.toFixed(2), at };
    stat.accepted++; lines.push(tag + ": ACCEPTED, " + at.length + " chord symbols");
  }
}
if (REPORT || ONLY) console.log(lines.join("\n"));
console.log(`BiMMuDa songs: ${songs.size}; also in the Billboard set (title + an artist word): ${matches.size}`);
console.log(`sections of those songs: ${stat.sections}; chords accepted: ${stat.accepted}; rejected: ${stat.sections - stat.accepted}`);
console.log("rejected because:", JSON.stringify(stat.none));
if (!ONLY) fs.writeFileSync(ROOT + "/scripts/theme-sources/bimmuda-chords.json", JSON.stringify(out));
