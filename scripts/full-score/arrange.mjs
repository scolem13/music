// arrange.mjs — reorder, drop and combine the staves of a converted full score (convert.mjs output), from a JSON plan, then
// check the result against the MusicXML again (score-check.cjs, parts matched through the %fs-parts line written here).
//
//   node scripts/full-score/arrange.mjs in.abc plan.json out.abc score.mxl
//
// plan.json:
//   { "order": ["5","1","2", …],            voice ids, top to bottom; voices not listed are dropped (and so is their XML part)
//     "staves": [["18","19"]],              voices DRAWN on one staff (the first voice's clef; stems up / down); played on their own
//                                           staves (abcjs ignores a second voice's transpose=): written as "%fs-staves ( 18 19 )"
//     "names": { "18": "Violoncello e Basso" }   instrument names to draw
//     "doubles": { "19": { "of": "18", "octave": -1, "name": "Basso" } } }
//         a voice that mostly doubles another an octave away: drawn at the other's octave on its staff (octave=1 transpose=-12),
//         and written into the display only in the bars where it plays something else ("%fs-display V:19 of=18 …": full-score.js draws
//         that line when voice 18 is shown too, and plays the full one). Bars counted equal when every sounding note matches, shifted by the octave.
// Writes "%fs-parts <XML part ids in order>" so the checker pairs parts after reordering.
import fs from "node:fs"; import path from "node:path"; import { spawnSync, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const [inFile, planFile, outFile, mxl] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, "utf8")), abc = fs.readFileSync(inFile, "utf8");

// --- parse the tidy layout: header, V:id declarations (+ %%MIDI lines), one body line per voice
const lines = abc.split("\n"), head = [], decl = {}, body = {}, order = [];
let cur = null, inBody = false;
for (const ln of lines) {
  const bare = /^V:(\S+)\s*$/.exec(ln), d = /^V:(\S+)\s+(.*)$/.exec(ln);
  if (bare) { inBody = true; cur = bare[1]; continue; }
  if (inBody) { if (ln.trim()) body[cur] = ((body[cur] || "") + " " + ln).trim(); continue; }
  if (d) { cur = d[1]; decl[cur] = [ln]; order.push(cur); continue; }
  if (cur && /^%%MIDI/.test(ln)) { decl[cur].push(ln); continue; }
  if (/^%%score|^%fs-/.test(ln)) continue;
  head.push(ln);
}
// XML part per voice: a named voice starts the next part (same rule as score-check.cjs)
const partOf = {}; let pn = 0;
order.forEach((id, i) => { if (/nm="/.test(decl[id][0]) || i === 0) pn++; partOf[id] = "P" + pn; });
const srcStaff = {}; { const sc = (/^%%score(.*)$/m.exec(abc) || [, ""])[1]; let s = 0, depth = 0;
  for (const t of sc.match(/\(|\)|[^\s()[\]{}|]+/g) || []) { if (t === "(") { depth++; s++; continue; } if (t === ")") { depth--; continue; } if (!depth) s++; srcStaff[t] = s; } }

const keep = plan.order.filter(id => decl[id]);
const dropped = order.filter(id => !keep.includes(id));
// staves: the plan's, else the source's grouping
const staffKey = {}; keep.forEach(id => { staffKey[id] = "s" + srcStaff[id]; });
// plan.staves are for the eye only: abcjs ignores transpose= on a staff's second voice, so the played form (%%score, which the
// checker reads) keeps each voice its own staff, and "%fs-staves ( 18 19 )" tells full-score.js to draw them together
const drawn = (plan.staves || []).map(g => "( " + g.join(" ") + " )").join(" ");
const groups = []; keep.forEach(id => { const g = groups.find(x => x.k === staffKey[id]); g ? g.v.push(id) : groups.push({ k: staffKey[id], v: [id] }); });
const score = "%%score [ " + groups.map(g => g.v.length > 1 ? "( " + g.v.join(" ") + " )" : g.v[0]).join(" ") + " ]";

for (const [id, nm] of Object.entries(plan.names || {})) if (decl[id]) decl[id][0] = decl[id][0].replace(/nm="[^"]*"/, `nm="${nm}"`);
for (const [id, d] of Object.entries(plan.doubles || {})) {
  if (!decl[id]) continue;
  const sh = 12 * (d.octave || -1);       // the voice is drawn -sh semitones away from where it sounds
  // an octave clef (bass-8) already means "written an octave from where it sounds": keep the written notes, sound them by transpose=;
  // a plain clef: draw the notes an octave toward the other voice (octave=) and sound them where they were
  decl[id][0] = decl[id][0].replace(/\b(treble|bass|alto|tenor)(-8|\+8)?(?=\s|$)/, (m, c, o) => o ? `${c} transpose=${o === "-8" ? -12 : 12}` : `${c} octave=${-sh / 12} transpose=${sh}`);
  if (d.name) decl[id][0] = decl[id][0].replace(/nm="[^"]*"/, `nm="${d.name}"`);
}
// text above the music at the very start of the old top staff (a tempo word: "Allegro assai.") goes to the new top staff
if (keep[0] !== order[0] && body[order[0]] && body[keep[0]]) {
  const lead = /^((?:\s|\|:|\||\[[A-Za-z]:[^\]]*\])*)((?:"\^[^"]*"\s*)+)/, m = lead.exec(body[order[0]]);
  if (m) {
    body[order[0]] = m[1] + body[order[0]].slice(m[0].length);
    const t = /^((?:\s|\|:|\||\[[A-Za-z]:[^\]]*\])*)/.exec(body[keep[0]])[1];
    body[keep[0]] = t + m[2].trim() + " " + body[keep[0]].slice(t.length);
    console.error(`moved ${m[2].trim()} from voice ${order[0]} to the top voice ${keep[0]}`);
  }
}
const partsLine = "%fs-parts " + keep.filter((id, i) => partOf[id] !== partOf[keep[i - 1]]).map(id => partOf[id]).join(" ");
const kI = head.findIndex(h => /^K:/.test(h));
const build = bodies => [...head.slice(0, kI), score, partsLine, ...(drawn ? ["%fs-staves " + drawn] : []), ...head.slice(kI), ...keep.flatMap(id => decl[id]), ...keep.flatMap(id => ["V:" + id, bodies[id]])].join("\n") + "\n";
let out = build(body);

// --- doubles: the display line, with the bars that only double written as invisible rests
const { abcVoices } = require(path.join(here, "score-check.cjs"));
const displays = [];
for (const [id, d] of Object.entries(plan.doubles || {})) {
  const { V } = abcVoices(out), A = V.find(v => v.id === d.of), B = V.find(v => v.id === id);
  const k = n => n.map(x => [Math.round(x[0] * 100), x[1], Math.round(x[2] * 100)].join(",")).sort().join(" ");
  const hide = B.bars.map((b, i) => b.notes.length === 0 || k(b.notes.map(n => [n[0], n[1] - 12 * (d.octave || -1), n[2]])) === k(A.bars[i].notes));
  const shown = hide.map((h, i) => h ? 0 : i + 1).filter(Boolean);
  displays.push(`%fs-display V:${id} of=${d.of} ` + hideBars(body[id], hide, B.bars));
  console.error(`voice ${id}: drawn in ${shown.length} bars (${shown.join(" ")}), played in all ${B.bars.length}`);
}
if (displays.length) out = out.replace(partsLine, partsLine + "\n" + displays.join("\n"));
fs.writeFileSync(outFile, out);
console.error(`order ${keep.join(" ")}; dropped ${dropped.join(" ") || "none"}; ${score}`);

if (mxl) {
  const json = path.join(path.dirname(outFile), ".arrange-check.json");
  fs.writeFileSync(json, execFileSync("python3", ["-I", path.join(here, "xml-notes.py"), mxl], { maxBuffer: 1 << 28 }));
  const r = spawnSync("node", [path.join(here, "score-check.cjs"), outFile, json], { stdio: "inherit" });
  fs.rmSync(json); process.exit(r.status);
}

// one voice's music with the chosen bars replaced by invisible rests of the bar's length (inline fields kept, ties and slurs
// that would be cut are dropped). Bars are found by the bar lines, outside chords, quotes, decorations and inline fields.
function hideBars(src, hide, bars) {
  const toks = []; let i = 0, start = 0, depth = 0, q = false, bang = false;
  const isBar = j => { const r = /^(?::*\|[\]|:]*\d*|\[\d|::)/.exec(src.slice(j)); return r && r[0]; };
  while (i < src.length) {
    const c = src[i];
    if (q) { if (c === '"') q = false; i++; continue; }
    if (bang) { if (c === "!") bang = false; i++; continue; }
    if (c === '"') { q = true; i++; continue; } if (c === "!") { bang = true; i++; continue; }
    if (c === "[" && /^\[[A-Za-z]:/.test(src.slice(i))) { i = src.indexOf("]", i) + 1; continue; }
    if (c === "[" && !/^\[\d/.test(src.slice(i))) { depth++; i++; continue; } if (c === "]" && depth) { depth--; i++; continue; }
    const b = !depth && isBar(i);
    if (b) { toks.push({ music: src.slice(start, i) }, { bar: b }); i += b.length; start = i; continue; }
    i++;
  }
  toks.push({ music: src.slice(start) });
  let bi = -1, firstMusic = true;
  return toks.map(t => {
    if (t.bar) return t.bar;
    if (firstMusic && !t.music.trim()) { firstMusic = false; return t.music; }   // before a leading |: there is no bar
    firstMusic = false; bi++;
    if (!hide[bi] || !bars[bi]) return t.music;
    const fields = (t.music.match(/\[[A-Za-z]:[^\]]*\]/g) || []).join(" "), len = Math.round(bars[bi].len * 2);   // L:1/8
    return " " + (fields ? fields + " " : "") + (len ? "x" + len : "") + " ";
  }).join("");
}
