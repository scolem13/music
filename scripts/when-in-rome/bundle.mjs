// bundle.mjs — When in Rome's Bach chorales and Beethoven / Mozart piano sonatas, every analysed one, as data for the one score viewer
// (theory/analysed-scores/view.qmd?id=<id>) instead of a Quarto page each. Scores: Craig Sapp's **kern files in ~/Projects/corpora,
// analyses: ~/Projects/When-in-Rome/Corpus; both put through build.mjs's buildPiece, the same as the hand-made pages.
//   node scripts/when-in-rome/bundle.mjs       (WIR=..., CORPORA=... to move them)
// Writes apps/shared/data/scores/:
//   index.json            every piece: { id, set, title, sub, key, meter, bars, who, file } (small; the viewer's list and search)
//   <set>.json            one file per collection, { id: { abc, keys, chords, bpm, pickup, who, notes, vars, misses } }
//                         (`split: n` on a set divides it into n files; the 368 chorales are ~270 KB gzipped, so one file)
// A piece the converter cannot read is left out and listed at the end, with the reason.
import fs from "fs";
import path from "path";
import { parseKern, parseMusicXml, separateTies, buildPiece, PKEY, parseRomanText, toAbc, chordPcsFor, W } from "./build.mjs";
import { execFileSync } from "child_process";
import { createRequire } from "module";
const { barCheck } = createRequire(import.meta.url)("./bar-check.cjs");

const HOME = process.env.HOME, WIR = (process.env.WIR || HOME + "/Projects/When-in-Rome") + "/Corpus", CORPORA = process.env.CORPORA || HOME + "/Projects/corpora";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), OUT = ROOT + "/apps/shared/data/scores";
const ONLY = process.argv[2];   // e.g. "chorales" to build one collection
const read = f => fs.readFileSync(f, "utf8"), exists = f => fs.existsSync(f);
const meta = d => { try { return JSON.parse(read(d + "/remote.json")); } catch (e) { return {}; } };
const head = (t, k) => ((new RegExp("^" + k + ":\\s*(.*)$", "mi")).exec(t) || ["", ""])[1].trim();
const PRETTY_K = k => PKEY(k).replace(/:$/, "") + (k[0] === k[0].toLowerCase() ? " minor" : " major");
const bpmFor = meter => { const [n, d] = meter.split("/").map(Number); return d === 8 && n % 3 === 0 ? 132 : d === 2 ? 60 : d === 8 ? 120 : 76; };
// The analyses on offer, in order of preference: the plain one (BPS for Beethoven, the DCML-derived one for Mozart, Jones/Tymoczko for
// the chorales), then DCML, then Tymoczko's. One per piece: each analysis needs its own copy of the ABC, so all three would triple the size.
const WHO = { "analysis.txt": null, "analysis_DCML.txt": "DCML (Neuwirth et al.)", "analysis_DT.txt": "Dmitri Tymoczko", "analysis_BCMH.txt": "BCMH (Napoles López et al.)" };
// The analyst, from the file's header. DCML's files carry a licence sentence there; a plain analysis.txt with no header is, in the
// movements checked, a copy of analysis_DT.txt (the same chords), so it is credited to Tymoczko when the chords match.
const chordsOf = t => t.split("\n").filter(l => /^m\d/.test(l)).join("\n");
function analyst(dir, af, rtext) {
  const h = head(rtext, "Analyst");
  if (/^DCML members/.test(h)) return "DCML annotators (DCMLab), converted to RomanText for When in Rome";
  if (h) return h.replace(/,? see https?:\S+/, "").replace(/\s*\(ISMIR 2018\)/, "");
  if (WHO[af]) return WHO[af];
  if (exists(dir + "/analysis_DT.txt") && chordsOf(read(dir + "/analysis_DT.txt")) === chordsOf(rtext)) return "Dmitri Tymoczko";
  return "not named in the corpus";
}
const pickAnalysis = dir => ["analysis.txt", "analysis_DCML.txt", "analysis_DT.txt"].find(f => exists(dir + "/" + f));

// MusicXML (score.mxl in When in Rome), read as corpus.mjs does; the label goes on the lowest voice that has a note there,
// then the held notes' voices (separateTies)
const readXml = f => parseMusicXml(execFileSync("unzip", ["-p", f, "*.xml", "-x", "META-INF/*"], { encoding: "utf8", maxBuffer: 64 << 20 }), { merge: false });
function xmlPrefer(k) {
  const ids = [...k.voices.keys()].sort((x, y) => { const [sa, la] = x.split(".").map(Number), [sb, lb] = y.split(".").map(Number); return sb - sa || lb - la; });
  return ids.concat(separateTies(k));
}
const tidy = s => s.replace(/_/g, " ").replace(/,(\S)/g, ", $1").trim();
let mozK = null;   // Köchel number -> Sapp's file number ("15"), from each file's !!!SCT line
const MOZART_K = () => mozK || (mozK = Object.fromEntries(fs.readdirSync(CORPORA + "/craigsapp_mozart-piano-sonatas/kern").filter(f => /-1\.krn$/.test(f))
  .map(f => [(/^!!!SCT1?:.*?K(?:<sup>1<\/sup>)?\s+(\d+)\s*$/m.exec(read(CORPORA + "/craigsapp_mozart-piano-sonatas/kern/" + f)) || [])[1], f.slice(6, 8)]).filter(x => x[0])));
// Does the analysis fit the notes? Over each chord's span (to the next chord), at least two of its pitch classes sound in some voice. Catches a score paired with the wrong analysis (same bars, different piece), which the label placement alone does not.
const NAT = [0, 2, 4, 5, 7, 9, 11], FIT = +(process.env.FIT || 0.8);   // calibrated 30 Oct 2026: right pairings 0.97-0.99, a sonata on the wrong score 0.22-0.42
function fit(k, chords) {
  const evs = [].concat(...[...k.voices.values()]).filter(e => !e.rest && e.notes);
  let n = 0, ok = 0;
  chords.forEach(([t, pcs], i) => { if (!pcs) return; n++; const A = t * 384, B = i + 1 < chords.length ? chords[i + 1][0] * 384 : A + 384, here = new Set();
    evs.forEach(e => { if (e.t < B - 1e-6 && e.t + e.d > A + 1e-6) e.notes.forEach(x => here.add(((NAT[x.l] + x.a) % 12 + 12) % 12)); });
    if (pcs.filter(p => here.has(p)).length >= Math.min(2, pcs.length)) ok++; });
  return n ? ok / n : 0;
}
export { fit };
// ---- Endings and repeats numbered differently in the analysis and the score. The analysis gives a first and second ending the
// same number with a letter (m90a, m90b), or numbers the bars of a repeated section once; the score's bars are numbered one after
// the other, endings included, so from the endings on every bar number is out by one (or more), which a single shift cannot fix.
// realign() reads the analysis's bars as a list (in the file's order, a and b separate), tries each bar at the score's bar number
// shifted by -3..+3 (a "b" ending one bar after its "a"), counts the chords that sound in that score bar (the same two-pitch-class test
// as fit()) and picks the shifts by dynamic programming, charging a little for each change of shift. The analysis is then written
// out again with the score's bar numbers. Returns the new text, or null when it changes nothing or two bars land on one number.
const SHIFTS = [-3, -2, -1, 0, 1, 2, 3], SWITCH = +(process.env.SWITCH || 8);
function realign(k, rtext) {
  const lines = rtext.split("\n"), items = [];   // items: the main bar lines (not var / "=" lines): { line, n, letter }
  lines.forEach((l, i) => { const m = /^m(\d+)([ab])?(?=\s|$)/.exec(l); if (m) items.push({ line: i, n: +m[1], letter: m[2] || "" }); });
  if (items.length < 4) return null;
  const uni = lines.map((l, i) => { const it = items.findIndex(x => x.line === i); return it >= 0 ? l.replace(/^m\d+[ab]?/, "m" + (10000 + it)) : (/^m/.test(l) ? "" : l); }).join("\n");
  const rt = parseRomanText(uni), [num, den] = k.meter.split("/").map(Number), barTicks = W * num / den, beatTicks = num % 3 === 0 && den >= 8 ? W * 3 / den : W / den;
  const pre = toAbc(k, {}), startOf = new Map(); pre.spans.forEach(sp => { if (!startOf.has(sp.measure)) startOf.set(sp.measure, sp); });
  const evs = [].concat(...[...k.voices.values()]).filter(e => !e.rest && e.notes);
  const sounding = (A, B) => { const here = new Set(); evs.forEach(e => { if (e.t < B - 1e-6 && e.t + e.d > A + 1e-6) e.notes.forEach(x => here.add(((NAT[x.l] + x.a) % 12 + 12) % 12)); }); return here; };
  const byItem = items.map(() => []); rt.events.forEach(e => { const pcs = chordPcsFor(e.raw, e.key); if (pcs) byItem[e.m - 10000].push({ beat: e.beat, pcs }); });
  const bad = items.map((it, i) => SHIFTS.map(d => {   // chords with no fit in this bar if the item sits at bar n + d (+1 for a "b")
    const M = it.n + d + (it.letter === "b" ? 1 : 0), sp = startOf.get(M); if (M < 0 || (it.n === 0 && d !== 0)) return byItem[i].length + 1;
    if (!sp) return byItem[i].length + 1;
    const E = byItem[i]; let b = 0;
    E.forEach((c, j) => { const A = M === 0 ? sp.e - barTicks + (c.beat - 1) * beatTicks : sp.s + (c.beat - 1) * beatTicks, nx = E[j + 1], B = nx ? (M === 0 ? sp.e - barTicks : sp.s) + (nx.beat - 1) * beatTicks : sp.e;
      const here = sounding(A, Math.max(B, A + 1)); if (c.pcs.filter(p => here.has(p)).length < Math.min(2, c.pcs.length)) b++; });
    return b;
  }));
  // Viterbi over the shifts
  const S = SHIFTS.length, cost = [], from = [];
  items.forEach((it, i) => { cost[i] = []; from[i] = [];
    for (let s = 0; s < S; s++) { if (i === 0) { cost[i][s] = bad[i][s] + (SHIFTS[s] === 0 ? 0 : SWITCH); from[i][s] = -1; continue; }
      let best = Infinity, arg = 0; for (let q = 0; q < S; q++) { const c = cost[i - 1][q] + (q === s ? 0 : SWITCH); if (c < best) { best = c; arg = q; } }
      cost[i][s] = best + bad[i][s]; from[i][s] = arg; } });
  let s = cost[items.length - 1].indexOf(Math.min(...cost[items.length - 1])); const pick = [];
  for (let i = items.length - 1; i >= 0; i--) { pick[i] = SHIFTS[s]; s = from[i][s]; }
  if (process.env.REALIGNLOG) console.log("picks", items.map((it, i) => it.n + it.letter + ":" + pick[i]).filter((x, i) => i === 0 || pick[i] !== pick[i - 1]).join(" "));
  if (pick.filter((d, i) => i && d !== pick[i - 1]).length > 6) return null;   // a mapping that hops about is fitting noise, not a repeat structure
  if (pick.some((d, i) => i && Math.abs(d - pick[i - 1]) > 2)) return null;   // a repeat or an ending is one or two bars, not a jump of three
  if (pick.every(d => d === 0)) { if (process.env.REALIGNLOG) console.log("  no shift"); return null; }
  const target = items.map((it, i) => it.n + pick[i] + (it.letter === "b" ? 1 : 0));
  if (target.some(x => x < 0)) return null;
  // two analysis bars landing on one score bar (the shift drops): keep the one whose chords fit better (the later on a tie), drop the other
  const keep = items.map(() => true), at = new Map();
  target.forEach((t, i) => { const j = at.get(t); if (j == null) { at.set(t, i); return; }
    const bi = bad[i][SHIFTS.indexOf(pick[i])], bj = bad[j][SHIFTS.indexOf(pick[j])]; if (bi <= bj) { keep[j] = false; at.set(t, i); } else keep[i] = false; });
  const shiftAt = n => { let d = 0; items.forEach((it, i) => { if (it.n <= n && !it.letter.includes("b")) d = pick[i]; }); return d; };   // a number in a var / "=" line follows the bar before it
  return lines.map((l, i) => {
    const it = items.findIndex(x => x.line === i);
    if (it >= 0 && !keep[it]) return "";
    if (it >= 0) return l.replace(/^m\d+[ab]?/, "m" + target[it]);
    if (/^m\d/.test(l)) return l.replace(/^m(\d+)(-(\d+))?(var\d+)?(?=\s|=)/, (x, a, r, b, va) => "m" + (+a + shiftAt(+a)) + (r ? "-" + (+b + shiftAt(+b)) : "") + (va || ""))
      .replace(/=\s*m(\d+)(-(\d+))?/, (x, a, r, b) => "= m" + (+a + shiftAt(+a)) + (r ? "-" + (+b + shiftAt(+b)) : ""));
    return l;
  }).join("\n");
}

const SETS = [
  { set: "chorales", name: "Bach chorales", list() {
      const base = WIR + "/Early_Choral/Bach,_Johann_Sebastian/Chorales";
      return fs.readdirSync(base).filter(d => /^\d+$/.test(d)).sort().map(d => {
        const m = meta(base + "/" + d), n = +d;
        return { id: "bach-chorale-" + d, dir: base + "/" + d, kern: CORPORA + "/craigsapp_bach-370-chorales/kern/chor" + d + ".krn",
          title: "Bach, " + (m.text || m.tune || "Chorale " + n).replace(/\s*\([\d,]+\)\s*$/, ""), sub: `Chorale ${n} (Riemenschneider)` + (m.BWV ? `, BWV ${m.BWV}` : ""), order: n,
          names: { "4.1": "Bass", "3.1": "Tenor", "2.1": "Alto", "1.1": "Soprano" }, prefer: ["4.1", "3.1", "2.1", "1.1"], bpm: 66 };
      }); } },
  { set: "bach-preludes", name: "Bach, Well-Tempered Clavier I preludes", list() {
      const base = WIR + "/Keyboard_Other/Bach,_Johann_Sebastian/The_Well-Tempered_Clavier_I";
      return fs.readdirSync(base).filter(d => /^\d+(_fugue)?$/.test(d)).sort().map(d => {
        const n = parseInt(d), fugue = /fugue/.test(d), keyName = head(read(base + "/" + d + "/analysis.txt"), "Title");
        return { id: `bach-wtc1-${fugue ? "fugue" : "prelude"}-${n}`, dir: base + "/" + d, xml: fugue ? null : base + "/" + d + "/score.mxl",
          title: `Bach, ${fugue ? "Fugue" : "Prelude"} No. ${n}`, sub: `The Well-Tempered Clavier, Book I` + (fugue ? " (fugue)" : ""), order: n * 2 + (fugue ? 1 : 0), names: {} };
      }); } },
  { set: "lieder", name: "19th-century songs (OpenScore Lieder)", list() {
      const base = WIR + "/OpenScore-LiederCorpus", out = [];
      (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.isDirectory()) walk(d + "/" + f.name); else if (f.name === "analysis.txt") out.push(d); } })(base);
      return out.sort().map((d, i) => {
        const rel = path.relative(base, d).split("/"), text = read(d + "/analysis.txt"), composer = tidy(rel[0]);
        const song = head(text, "Title").replace(/^.*? - (No\.\s*\d+:\s*)?/, "") || tidy(rel[rel.length - 1]).replace(/^\d+\s*/, "");
        return { id: "lied-" + rel.join("-").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          dir: d, xml: d + "/score.mxl", title: composer.split(", ")[0] + ", “" + song + "”", sub: composer.split(", ").reverse().join(" ") + ", " + tidy(rel[1]),
          order: i, names: { "1.1": "Voice" } };
      }); } },
  { set: "beethoven-sonatas", name: "Beethoven piano sonatas", list() {
      const base = WIR + "/Piano_Sonatas/Beethoven,_Ludwig_van", out = [];
      for (const op of fs.readdirSync(base).sort()) for (const mv of fs.readdirSync(base + "/" + op).filter(x => /^\d+$/.test(x)).sort()) {
        const m = meta(base + "/" + op + "/" + mv), no = m.sonata_number; if (!no) continue;
        const opus = op.replace(/^Op0*/, "Op. ").replace(/_No/, " No. ");
        out.push({ id: `beethoven-sonata-${no}-${mv}`, dir: base + "/" + op + "/" + mv, kern: CORPORA + `/craigsapp_beethoven-piano-sonatas/kern/sonata${String(no).padStart(2, "0")}-${mv}.krn`,
          title: `Beethoven, Piano Sonata No. ${no}` + (m.Name ? ` (“${m.Name}”)` : ""), sub: `${opus}, movement ${mv}`, order: no * 10 + +mv,
          names: {}, prefer: ["2.1", "2.2", "1.2", "1.1"] });
      }
      return out; } },
  { set: "mozart-sonatas", name: "Mozart piano sonatas", list() {
      const base = WIR + "/Piano_Sonatas/Mozart,_Wolfgang_Amadeus", out = [];
      for (const k of fs.readdirSync(base).sort()) for (const mv of fs.readdirSync(base + "/" + k).filter(x => /^\d+$/.test(x)).sort()) {
        const m = meta(base + "/" + k + "/" + mv), no = m.sonata_number; if (!no) continue;
        const sapp = MOZART_K()[k.replace(/^K/, "")];   // Sapp numbers his files differently from When in Rome after No. 14: matched by Köchel number
        out.push({ id: `mozart-sonata-${no}-${mv}`, dir: base + "/" + k + "/" + mv, kern: CORPORA + `/craigsapp_mozart-piano-sonatas/kern/sonata${sapp || "-none-" + k}-${mv}.krn`,
          title: `Mozart, Piano Sonata No. ${no}`, sub: `${k.replace(/^K/, "K. ")}, movement ${mv}`, order: no * 10 + +mv,
          names: {}, prefer: ["2.1", "2.2", "1.2", "1.1"] });
      }
      return out; } },
];

fs.mkdirSync(OUT, { recursive: true });
const indexFile = OUT + "/index.json", index = exists(indexFile) ? JSON.parse(read(indexFile)).filter(p => ONLY && p.set !== ONLY) : [];
const skipped = [];
for (const S of SETS) {
  if (ONLY && S.set !== ONLY) continue;
  const items = S.list().sort((a, b) => a.order - b.order), data = [];
  for (const it of items) {
    const af = pickAnalysis(it.dir);
    if (!af) { skipped.push([it.id, "no analysis"]); continue; }
    const src = it.xml || it.kern;
    if (!src || !exists(src)) { skipped.push([it.id, "no score " + (src ? path.basename(src) : "in the corpus")]); continue; }
    let rtext = read(it.dir + "/" + af);
    try {
      const k = it.xml ? readXml(it.xml) : parseKern(read(it.kern)), bpm = it.bpm || bpmFor(k.meter);
      const prefer = it.prefer || xmlPrefer(k);
      const make = rt => { try { return buildPiece({ id: it.id, score: k, rtext: rt, analyses: [[af, ""]], names: it.names, prefer, bpm }).versions[0]; } catch (e) { return null; } };
      let v = make(rtext);
      // the analysis a bar off the score (a pickup numbered 0 on one side and 1 on the other): try it shifted a bar each way and
      // keep a shift only when it then fits the notes
      if (v && fit(v.k, v.chords) < FIT) for (const d of [1, -1]) {
        const rt2 = rtext.replace(/^m(\d+)(-(\d+))?(var\d+)?(?=\s|=)/gm, (x, a, r, b, va) => "m" + (+a + d) + (r ? "-" + (+b + d) : "") + (va || ""))
          .replace(/=\s*m(\d+)(-(\d+))?/g, (x, a, r, b) => "= m" + (+a + d) + (r ? "-" + (+b + d) : ""));
        if (/^m-1\b/m.test(rt2)) continue;
        const v2 = make(rt2); if (v2 && fit(v2.k, v2.chords) >= FIT) { v = v2; rtext = rt2; break; }
      }
      // endings / repeats numbered differently: shifts that change along the piece (realign), kept only when the piece then fits
      if (!v || fit(v.k, v.chords) < FIT || v.misses.length > v.chords.length * 0.2) {
        let rt3 = null; try { rt3 = realign(k, rtext); } catch (e) { console.log("REALIGN ERR", it.id, e.message); } const v3 = rt3 && make(rt3); if (process.env.REALIGNLOG) console.log(it.id, "realigned fit", v3 ? fit(v3.k, v3.chords).toFixed(3) : "-", v3 && v3.misses.length + " misses");
        if (v3 && v3.chords.length && fit(v3.k, v3.chords) >= FIT && v3.misses.length <= v3.chords.length * 0.2) { v = v3; rtext = rt3; process.env.REALIGNLOG && console.log("REALIGNED", it.id); }
      }
      if (!v) v = buildPiece({ id: it.id, score: k, rtext, analyses: [[af, ""]], names: it.names, prefer, bpm }).versions[0];   // throws the converter's reason
      const unread = v.chords.filter(c => !c[1]).length;
      if (!v.chords.length) { skipped.push([it.id, "analysis has no chords"]); continue; }
      if (v.misses.length > v.chords.length * 0.2) { skipped.push([it.id, `${v.misses.length} of ${v.chords.length} labels found no note (bars don't line up)`]); continue; }
      const f = fit(v.k, v.chords);
      if (process.env.FITLOG) console.log("FIT", it.id, f.toFixed(3));
      if (f < FIT) { skipped.push([it.id, `analysis fits the notes at only ${Math.round(f * 100)}% of chords`]); continue; }
      const bc = barCheck(v.abc);
      if (bc.error || !bc.ok) { skipped.push([it.id, bc.error ? "abcjs: " + bc.error : `${bc.bad} of ${bc.bars} bars the wrong length`]); continue; }
      const who = analyst(it.dir, af, rtext);
      const bars = Math.max(...v.chords.map(() => 0), ...(rtext.match(/^m(\d+)/gm) || ["m0"]).map(x => +x.slice(1)));
      data.push([it, { abc: v.abc, keys: v.keys, chords: v.chords.map(c => [c[0], c[1]]), bpm, pickup: /^m0\s/m.test(rtext) ? 1 : 0, who,
        notes: v.notes.filter(n => !/email corrections/i.test(n)),
        vars: v.vars.map(x => ({ m: x.m, text: x.text.split(/\s+/).filter(t => !/^b[\d.]+$/.test(t)).join(" ") })),
        misses: v.misses.map(x => [x.m, x.beat, x.text]) }, { key: v.keys.length ? PRETTY_K(v.keys[0][1]) : "", meter: k.meter, bars, unread }]);
    } catch (e) { skipped.push([it.id, "converter: " + e.message.slice(0, 80)]); }
  }
  const parts = S.split || 1, per = Math.ceil(data.length / parts);
  for (let i = 0; i < parts; i++) {
    const file = parts > 1 ? `${S.set}-${i + 1}` : S.set, slice = data.slice(i * per, (i + 1) * per), obj = {};
    slice.forEach(([it, d, info]) => { obj[it.id] = d; index.push({ id: it.id, set: S.set, setName: S.name, title: it.title, sub: it.sub, key: info.key, meter: info.meter, bars: info.bars, who: d.who, file }); });
    const json = JSON.stringify(obj);
    fs.writeFileSync(OUT + "/" + file + ".json", json);
    console.log(`${file}.json: ${slice.length} pieces, ${Math.round(json.length / 1024)} KB`);
  }
  console.log(`${S.name}: ${data.length} of ${items.length} built`);
}
fs.writeFileSync(indexFile, JSON.stringify(index));
console.log(`index.json: ${index.length} pieces, ${Math.round(fs.statSync(indexFile).size / 1024)} KB`);
if (skipped.length) { console.log("\nLeft out:"); skipped.forEach(([id, why]) => console.log("  " + id + ": " + why)); }
