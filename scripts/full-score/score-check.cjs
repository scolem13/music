// score-check.cjs — checks an ABC full score against the MusicXML it was converted from, bar by bar and note by note.
//
//   python3 -I scripts/full-score/xml-notes.py score.mxl > /tmp/score.json
//   node scripts/full-score/score-check.cjs score.abc /tmp/score.json [--json] [--max N]
//
// The ABC is read by abcjs (the same parser the site draws and plays with), the MusicXML by xml-notes.py (no converter
// code shared), so a fault in xml2abc shows up as a difference. Exit 1 when anything is wrong. Checks, in order:
//   1. parts      : every XML part has ABC voices (voices with nm= start a part, unnamed ones belong to the part before)
//   2. bar count  : every voice has as many bars as its part has measures
//   3. bar length : each ABC bar is as long as the XML measure (so pickups and the bars next to repeats are allowed short
//                   only when the XML is short too), and each bar is no longer than its time signature
//   4. alignment  : bar k starts at the same moment in every voice (a drift anywhere shows as the first bar it starts)
//   5. notes      : per part and bar, the attacks [onset, sounding pitch, length with ties merged] are the same set
//   7. display    : a voice's display-only line (arrange.mjs %fs-display) has the played line's bars, each as long
//   6. pitch sense: notes outside the instrument's range (a wrong octave or a missed transposition), names used twice,
//                   tempo marks (Q:) after the first, which a transcriber may have added to get a ritardando
// Kinds "hidden" and "grace" are reported but do not fail. Ties: an ABC tie or XML tie chain counts as one attack. Grace notes are left out on both sides.
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../apps/shared/abcjs-basic.js"), "utf8"), ctx);

// sounding ranges, MIDI numbers, a little wide on purpose: only gross faults (an octave or a transposition off) should trip
const RANGES = [[/piano|pianoforte|fl[uü]gel|klavier|keyboard|organ|orgel|harpsi|cembalo/i, 21, 108], [/picc/i, 74, 110], [/flaut|flute|fl\b/i, 59, 98], [/obo/i, 58, 93], [/clar/i, 50, 94], [/fag|bassoon/i, 34, 77],
  [/corn|horn/i, 33, 79], [/tromba|trumpet/i, 52, 84], [/trombon/i, 34, 77], [/tuba/i, 26, 65], [/timp/i, 38, 60],
  [/violino|violin/i, 55, 105], [/viol[ae]\b|viola/i, 48, 91], [/violoncell|cello/i, 36, 81], [/contrab|double bass|basso\b/i, 28, 67]];
const R6 = x => Math.round(x * 1e4) / 1e4;

function abcVoices(abc) {
  // inline tempo changes out first: abcjs scales midiPitches' lengths by them, so every note after a [Q:] would look the wrong
  // length (tempo marks are checked on their own, from the text)
  const tune = ctx.ABCJS.parseOnly(abc.replace(/\[Q:[^\]]*\]/g, ""))[0];
  const warnings = (tune.warnings || []).slice();
  { const log = console.log; console.log = () => {}; try { tune.setUpAudio({}); } finally { console.log = log; } }                                  // fills each note's midiPitches: sounding pitch, ties merged
  // voice order: the V: ids in %%score order, which is the (staff, voice) order abcjs builds
  const decl = [...abc.matchAll(/^V:(\S+)([^\n]*)/gm)].filter((m, i, a) => a.findIndex(x => x[1] === m[1]) === i);
  const head = {}; decl.forEach(m => { head[m[1]] = m[2]; });
  const sc = (/^%%score(.*)$/m.exec(abc) || [, decl.map(m => m[1]).join(" ")])[1];
  const order = sc.match(/[^\s()[\]{}|]+/g);
  const V = order.map(id => ({ id, name: (/nm="([^"]*)"/.exec(head[id] || "") || [])[1], bars: [] }));
  let first = true;
  tune.lines.forEach(line => {
    if (!line.staff) return;
    let k = 0;
    line.staff.forEach(st => st.voices.forEach(v => {
      const voice = V[k++]; if (!voice) return;
      let cur = { len: 0, notes: [] }, tup = 1;
      if (!first && voice.open) cur = voice.open;
      for (const e of v) {
        if (e.el_type === "note") {
          if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier;
          const d = (e.duration || 0) * tup * 4;
          if (!e.rest) (e.midiPitches || []).forEach(p => cur.notes.push([R6(cur.len), p.pitch, R6(p.duration * 4), e.gracenotes ? 1 : 0]));
          cur.len = R6(cur.len + d);
          if (e.endTriplet) tup = 1;
        } else if (e.el_type === "bar") { if (cur.len || cur.notes.length || voice.bars.length) voice.bars.push(cur); cur = { len: 0, notes: [] }; }   // a bar line before any music (a leading |:) closes no bar
      }
      voice.open = cur.len || cur.notes.length ? cur : null;   // a line that ends without a bar line
    }));
    first = false;
  });
  V.forEach(v => { if (v.open) v.bars.push(v.open); delete v.open; });
  return { V, warnings, meter: tune.getMeterFraction() };
}

// every attack of a part, per measure, with tie chains merged into their first note: [onset in bar, midi, length]
function xmlAttacks(meas) {
  let t = 0; const flat = [];
  meas.forEach((m, mi) => { m.notes.forEach(n => flat.push({ mi, on: n[0], at: R6(t + n[0]), midi: n[1], dur: n[2], tie: n[3] })); t = R6(t + m.len); });
  const stops = {}; flat.forEach(n => { if (n.tie & 2) (stops[n.midi + "@" + n.at] = stops[n.midi + "@" + n.at] || []).push(n); });
  const out = meas.map(() => []);
  flat.forEach(n => {
    if (n.tie & 2) return;
    let len = n.dur, cur = n, guard = 0;
    while ((cur.tie & 1) && guard++ < 64) {
      const nx = (stops[cur.midi + "@" + R6(cur.at + cur.dur)] || [])[0];
      if (!nx) break; len += nx.dur; cur = nx;
    }
    out[n.mi].push([R6(n.on), n.midi, R6(len)]);
  });
  return out;
}

function main() {
  const args = process.argv.slice(2), asJson = args.includes("--json");
  const max = +(args[args.indexOf("--max") + 1]) || 40;
  const [abcFile, xmlFile] = args.filter(a => !a.startsWith("--") && !/^\d+$/.test(a));
  const abc = fs.readFileSync(abcFile, "utf8"), X = JSON.parse(fs.readFileSync(xmlFile, "utf8"));
  const fsParts = (/^%fs-parts (.*)$/m.exec(abc) || [])[1];      // arrange.mjs: which XML parts, in this order (others dropped)
  if (fsParts) { const ids = fsParts.trim().split(/\s+/); X.parts = ids.map(id => X.parts.find(p => p.id === id)).filter(Boolean); }
  const { V, warnings } = abcVoices(abc);
  const INFO = new Set(["hidden", "grace"]);
  const issues = [], add = (kind, where, msg) => issues.push({ kind, where, msg });

  // 1. parts: a named voice starts a part
  const parts = []; V.forEach(v => { if (v.name || !parts.length) parts.push({ name: v.name || v.id, voices: [v] }); else parts[parts.length - 1].voices.push(v); });
  if (parts.length !== X.parts.length) add("parts", "score", `ABC has ${parts.length} parts, MusicXML ${X.parts.length}`);
  const seen = {}; X.parts.forEach(p => { const n = p.name.trim(); if (seen[n]) add("names", p.id, `part name "${n}" also used by ${seen[n]}: check which instrument this is`); seen[n] = p.id; });
  if (X.hidden) add("hidden", "score", `${X.hidden} hidden MusicXML notes (print-object="no", playback only) left out: the ABC should have x rests there`);
  warnings.forEach(w => add("abcjs", "parse", String(w).replace(/<[^>]+>/g, "")));
  const qs = abc.match(/^Q:.*$|\[Q:[^\]]*\]/gm) || []; if (qs.length > 1) add("tempo", "score", `${qs.length} tempo marks: ${qs.join(" ")} — a ritardando entered as tempo changes?`);

  // 4. alignment, per voice: the start of every bar
  const starts = V.map(v => { let s = 0; return v.bars.map(b => { const x = s; s = R6(s + b.len); return x; }); });
  const nb = Math.min(...V.map(v => v.bars.length));
  for (let k = 0; k < nb; k++) {
    const set = new Set(starts.map(s => Math.round(s[k] * 100) / 100));   // triplets add rounding
    if (set.size > 1) { add("align", `bar ${k + 1}`, "bar starts at different times: " + V.map((v, i) => `V${v.id}=${starts[i][k]}`).join(" ")); break; }
  }

  const n = Math.min(parts.length, X.parts.length);
  for (let pi = 0; pi < n; pi++) {
    const P = parts[pi], XP = X.parts[pi], tag = `${XP.id} ${XP.name.trim()}`;
    // 2. bar count
    P.voices.forEach(v => { if (v.bars.length !== XP.measures.length) add("bars", tag, `voice ${v.id}: ${v.bars.length} bars, MusicXML ${XP.measures.length}`); });
    const range = RANGES.find(r => r[0].test(XP.name)) || [], XA = xmlAttacks(XP.measures);
    const mm = Math.min(XP.measures.length, ...P.voices.map(v => v.bars.length));
    for (let mi = 0; mi < mm; mi++) {
      const xm = XP.measures[mi], [b, c] = xm.time.split("/").map(Number), full = 4 * b / c, where = `${tag} bar ${mi + 1} (m. ${xm.n})`;
      // 3. bar length
      P.voices.forEach(v => {
        const L = v.bars[mi].len;
        if (Math.abs(L - xm.len) > 1e-3 && !(v.bars[mi].notes.length === 0 && Math.abs(L - full) < 1e-3))
          add("length", where, `voice ${v.id} lasts ${L} quarters, MusicXML ${xm.len}`);
        if (L > full + 1e-3) add("overfull", where, `voice ${v.id}: ${L} quarters in ${xm.time}`);
      });
      // 5. notes
      // a note with grace notes: abcjs plays the graces out of its time, so its length is compared apart (kind "grace", not a fault)
      const graced = new Set(P.voices.flatMap(v => v.bars[mi].notes).filter(n => n[3]).map(n => Math.round(n[0] * 100) / 100 + "," + n[1]));
      const key = a => graced.has(Math.round(a[0] * 100) / 100 + "," + a[1]) ? [Math.round(a[0] * 100) / 100, a[1], "g"].join(",") : [Math.round(a[0] * 100) / 100, a[1], Math.round(a[2] * 100) / 100].join(","), A = P.voices.flatMap(v => v.bars[mi].notes).map(key).sort(), B = XA[mi].map(key).sort();
      const cnt = arr => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
      const ca = cnt(A), cb = cnt(B), miss = [], extra = [];
      for (const k in cb) for (let i = (ca[k] || 0); i < cb[k]; i++) miss.push(k);
      for (const k in ca) for (let i = (cb[k] || 0); i < ca[k]; i++) extra.push(k);
      if (miss.length || extra.length) add("notes", where, `missing in ABC [${miss.join(" | ")}] extra in ABC [${extra.join(" | ")}]  (onset,midi,length)`);
      // 6. range
      if (range.length) P.voices.forEach(v => v.bars[mi].notes.forEach(nt => {
        if (nt[1] < range[1] || nt[1] > range[2]) add("range", where, `voice ${v.id} sounds MIDI ${nt[1]}, outside ${range[1]}-${range[2]} for ${XP.name.trim()}`);
      }));
    }
  }

  // 7. display lines (arrange.mjs "%fs-display V:id …"): drawn in place of the voice, so every bar must last as long as the played one
  for (const m of abc.matchAll(/^%fs-display V:(\S+) (?:of=\S+ )?(.*)$/gm)) {
    const disp = abc.replace(/^%fs-display.*\n/gm, "").replace(new RegExp(`^(V:${m[1]}\\n).*$`, "m"), (x, h) => h + m[2]);
    const D = abcVoices(disp), a = V.find(v => v.id === m[1]), b = D.V.find(v => v.id === m[1]);
    D.warnings.forEach(w => add("display", `voice ${m[1]}`, "abcjs: " + String(w).replace(/<[^>]+>/g, "")));
    if (!b || b.bars.length !== a.bars.length) add("display", `voice ${m[1]}`, `display line has ${b && b.bars.length} bars, played line ${a.bars.length}`);
    else b.bars.forEach((x, i) => { if (Math.abs(x.len - a.bars[i].len) > 1e-3) add("display", `voice ${m[1]} bar ${i + 1}`, `display ${x.len} quarters, played ${a.bars[i].len}`); });
  }

  const byKind = issues.reduce((m, i) => (m[i.kind] = (m[i.kind] || 0) + 1, m), {});
  if (asJson) { console.log(JSON.stringify({ ok: !issues.length, byKind, issues }, null, 1)); }
  else {
    console.log(`${abcFile}: ${V.length} voices, ${parts.length} parts, ${nb} bars. ` + (issues.length ? `${issues.length} problems: ` + JSON.stringify(byKind) : "no problems found"));
    issues.slice(0, max).forEach(i => console.log(`  [${i.kind}] ${i.where}: ${i.msg}`));
    if (issues.length > max) console.log(`  … ${issues.length - max} more (--max N, or --json)`);
  }
  process.exitCode = issues.some(i => !INFO.has(i.kind)) ? 1 : 0;   // not process.exit: a long --json report into a pipe would be cut off
}
if (require.main === module) main();
module.exports = { abcVoices };
