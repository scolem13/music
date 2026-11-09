// convert.mjs — a MusicXML full score (.mxl / .xml) to ABC the site can draw and play, then checked against the MusicXML.
//
//   node scripts/full-score/convert.mjs score.mxl [out.abc]        (XML2ABC=<path to xml2abc.py>, default ~/Projects/pages-dev/tunes/xml2abc.py)
//
// Steps: xml2abc (-d 8: one L:1/8 for every voice; -x: no $ breaks; -m 1: %%MIDI program only), then tidied for abcjs:
//   - a voice's L: written among the headers applies to the WHOLE score in abcjs (xml2abc means it for that voice): with -d 8
//     there are none, and any left are an error
//   - each voice's music joined onto one line, so every voice has the same systems (abcjs pairs voices line by line: a voice that
//     wraps after 6 bars against one that wraps after 19 puts the wrong bars together); the page breaks lines itself (wrap option)
//   - ottava marks (8va / 8vb / 15ma) dropped, notes already at sounding pitch; cross-staff [I:staff ±1] dropped; the same staff name
//     twice numbered (Violin I, Violin II); !dacoda! / !dacapo! as text
//   - %%score brackets / braces nested in another one dropped (abcjs reads one level)
//   - a voice's own K: in the header (percussion K:none) moved into that voice's music (abcjs gave it to every later voice)
//   - rests of lengths abcjs cannot write (x8/3, x13/2) split into ones it can (thirds in a (3:2:n tuplet)
//   - !fz! written as text "_fz"; rests and bowings inside grace notes dropped
//   - U: macros dropped (stemless s), decorations and chords inside grace notes (a chord keeps its top note), fingerings
//     with more than one number, |]: written |] |:
//   - grace notes before a bar line moved after it (abcjs gave them a rest of their own)
//   - a part that changes its octave transposition partway (to piccolo): those bars moved to sounding pitch
//   - pedal marks (!ped! / !ped-up!) dropped: abcjs has no pedal decoration
//   - w: lyric lines dropped (a line with words is counted and reported)
//   - in a transposing voice an inline clef with an octave sign ([K:bass+8]) becomes [K:bass octave=1] (abcjs bug, see tidy)
//   - "%" bar-number comments dropped, "I:linebreak $" dropped
// then xml-notes.py + score-check.cjs; the report is printed and the exit code is the checker's.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

const [src, outArg] = process.argv.slice(2);
if (!src) { console.error("usage: node scripts/full-score/convert.mjs score.mxl [out.abc]"); process.exit(2); }
const here = path.dirname(new URL(import.meta.url).pathname);
const X2A = process.env.XML2ABC || path.join(os.homedir(), "Projects/pages-dev/tunes/xml2abc.py");
const out = outArg || src.replace(/\.(mxl|xml|musicxml)$/i, "") + ".abc";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fullscore-"));

execFileSync("python3", ["-I", X2A, "-d", "8", "-x", "-m", "1", "-o", tmp, src], { stdio: ["ignore", "ignore", "inherit"] });
const raw = fs.readFileSync(path.join(tmp, fs.readdirSync(tmp).find(f => f.endsWith(".abc"))), "utf8");
const json = path.join(tmp, "score.json");
const xmlJson = execFileSync("python3", ["-I", path.join(here, "xml-notes.py"), src], { maxBuffer: 1 << 28 });
fs.writeFileSync(json, xmlJson);
fs.writeFileSync(out, octaveChanges(tidy(raw), JSON.parse(xmlJson)));
const r = spawnSync("node", [path.join(here, "score-check.cjs"), out, json, ...process.argv.slice(4)], { stdio: "inherit" });
console.log("wrote " + out);
process.exit(r.status);

// a rest whose length abcjs cannot write as one note (x8/3, x13/2): split into ones it can, in L: units. Lengths in thirds go in a
// tuplet "(3:2:n" of pieces 3/2 as long; anything else is left as it was. Only rests: a note split would need ties.
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function binaryParts(n, d) {          // n/d with d a power of two, as the fewest plain / dotted lengths
  const out = []; let num = n;
  for (let p = 1 << 20; p >= 1 && num > 0; p >>= 1) {
    const v = p;                        // v / d
    if (num >= v) { if (num >= v * 1.75 && (v * 7) % 4 === 0) { out.push([v * 7 / 4, d]); num -= v * 7 / 4; }
      else if (num >= v * 1.5 && v % 2 === 0) { out.push([v * 3 / 2, d]); num -= v * 3 / 2; } else { out.push([v, d]); num -= v; } }
  }
  return num === 0 ? out : null;
}
function fmt(n, d) { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? (n === 1 ? "" : String(n)) : (n === 1 ? "" : n) + "/" + d; }
function pow2(d) { return (d & (d - 1)) === 0; }
function representable(n, d) { const g = gcd(n, d); n /= g; d /= g; return pow2(d) && (pow2(n) || (n % 3 === 0 && pow2(n / 3)) || (n % 7 === 0 && pow2(n / 7))); }
export function splitRests(t, dropped = {}) {
  return t.replace(/(^|[\s|\]!(}])([xz])(\d+)?(?:\/(\d+))?(?=[\s|\[)!]|$)/g, (m, pre, r, a, b) => {
    const n = +(a || 1), d = +(b || 1); if (representable(n, d)) return m;
    const g = gcd(n, d), N = n / g, D = d / g;
    if (pow2(D)) { const ps = binaryParts(N, D); if (!ps) return m; dropped.rests = (dropped.rests || 0) + 1; return pre + ps.map(([u, v]) => r + fmt(u, v)).join(" "); }
    if (D % 3 === 0 && pow2(D / 3)) {                     // thirds: (3:2:k with pieces of N/D * 3/2
      const ps2 = binaryParts(N, (D / 3) * 2);             // N/D * 3/2 = N / (2D/3)
      const use = ps2 && ps2.length <= 9 ? ps2 : null; if (!use) return m;
      dropped.rests = (dropped.rests || 0) + 1;
      return pre + `(3:2:${use.length}` + use.map(([u, v]) => r + fmt(u, v)).join(" ");
    }
    return m;
  });
}

// a part that changes its octave transposition partway (flute 2 to piccolo, a voice part to an octave-down tenor clef):
// xml2abc writes one transpose= for the whole voice, from the first, so those bars sound an octave off. They are moved to
// sounding pitch (drawn so, as in a concert-pitch score). Parts: a named voice starts one (as score-check reads them).
export function octaveChanges(abc, X) {
  const lines = abc.split("\n"), head = lines.filter(l => /^V:\S+\s/.test(l));
  const parts = []; head.forEach(h => { const id = /^V:(\S+)/.exec(h)[1]; if (/\bnm="/.test(h) || !parts.length) parts.push([id]); else parts[parts.length - 1].push(id); });
  if (parts.length !== X.parts.length) return abc;
  let moved = 0;
  X.parts.forEach((xp, pi) => {
    const t0 = xp.measures.length ? xp.measures[0].trans : 0;
    const shift = xp.measures.map(m => { const d = (m.trans || 0) - (t0 || 0); return d && d % 12 === 0 ? d / 12 : 0; });
    if (!shift.some(Boolean)) return;
    for (const id of parts[pi]) {
      const k = lines.findIndex(l => l.trim() === "V:" + id); if (k < 0) continue;
      const bars = splitBars(lines[k + 1]);
      if (bars.length < shift.length) continue;
      lines[k + 1] = bars.map((b, i) => shift[i] ? (moved++, moveOctaves(b, shift[i])) : b).join("");
    }
  });
  if (moved) console.error(`note: ${moved} bars moved by octaves where a part changes its octave transposition (e.g. to piccolo), drawn at sounding pitch`);
  return lines.join("\n");
}
// a voice's music cut after each bar line (each piece keeps its closing bar line); skips "text", !marks! and [K:…] fields
function splitBars(t) {
  const out = []; let cur = "", i = 0;
  while (i < t.length) {
    const c = t[i];
    if (c === '"') { const j = t.indexOf('"', i + 1); cur += t.slice(i, j + 1); i = j + 1; continue; }
    if (c === "!") { const j = t.indexOf("!", i + 1); cur += t.slice(i, j + 1); i = j + 1; continue; }
    if (c === "[" && /^\[[A-Za-z]:/.test(t.slice(i, i + 3))) { const j = t.indexOf("]", i); cur += t.slice(i, j + 1); i = j + 1; continue; }
    const m = /^(?::*\|[\]|:]*|\[\|[:]*|::)\s*(?:\[?\d(?:[,-]\d)*)?/.exec(t.slice(i));
    if (m && m[0].includes("|")) { cur += m[0]; i += m[0].length; if (cur.replace(/[\s|:\]\[\d,-]/g, "")) { out.push(cur); cur = ""; } continue; }
    cur += c; i++;
  }
  if (cur) out.push(cur);
  return out;
}
function moveOctaves(t, n) {
  let out = "", i = 0;
  while (i < t.length) {
    const c = t[i];
    if (c === '"') { const j = t.indexOf('"', i + 1); out += t.slice(i, j + 1); i = j + 1; continue; }
    if (c === "!") { const j = t.indexOf("!", i + 1); out += t.slice(i, j + 1); i = j + 1; continue; }
    if (c === "[" && /^\[[A-Za-z]:/.test(t.slice(i, i + 3))) { const j = t.indexOf("]", i); out += t.slice(i, j + 1); i = j + 1; continue; }
    const m = /^([\^=_]*)([A-Ga-g])([,']*)/.exec(t.slice(i));
    if (m && !/[A-Za-z]/.test(t[i - 1] || "")) {
      const v = (m[2] === m[2].toLowerCase() ? 1 : 0) - (m[3].match(/,/g) || []).length + (m[3].match(/'/g) || []).length + n, L = m[2].toUpperCase();
      out += m[1] + (v >= 1 ? L.toLowerCase() + "'".repeat(v - 1) : L + ",".repeat(-v)); i += m[0].length; continue;
    }
    out += c; i++;
  }
  return out;
}

export function tidy(abc) {
  const lines = abc.split("\n"), head = [], body = {}, order = [];
  let cur = null; const dropped = { words: 0, clefs: 0, ped: 0, cross: 0, ott: 0, names: 0, tempo: 0, marks: 0, nest: 0, keys: 0, rests: 0, graces: 0 };
  for (let ln of lines) {
    if (/^I:linebreak/.test(ln)) continue;
    const v = /^V:(\S+)\s*$/.exec(ln);                       // a bare V:n starts that voice's music
    if (v) { cur = v[1]; if (!body[cur]) { body[cur] = []; order.push(cur); } continue; }
    if (cur === null) { head.push(ln); continue; }
    if (/^w:/.test(ln)) { if (/[^\s|*_-]/.test(ln.slice(2))) dropped.words++; continue; }   // lyric lines (xml2abc writes empty ones)
    if (/^[A-Za-z]:/.test(ln) && !/^[A-Za-z]:\S*\]/.test(ln)) { body[cur].push(` [${ln.trim()}] `); continue; }   // a field inside the music: inline
    ln = ln.replace(/(^|[^\\])%.*$/, "$1");                  // bar-number comments
    ln = ln.replace(/!ped(?:-up)?!/g, () => (dropped.ped++, ""));   // pedal marks: abcjs has no pedal decoration
    if (ln.trim()) body[cur].push(ln.trim());
  }
  // ottava lines (!8va(! … !8va)!, 8vb, 15ma): abcjs has none; xml2abc already writes the notes at sounding pitch (the checker
  // agrees), so only the marks go and the notes are drawn with ledger lines. Cross-staff notes ([I:staff ±1]) stay on their own staff
  for (let k = head.length - 1; k >= 0; k--) if (/^U:/.test(head[k])) head.splice(k, 1);
  for (const id of order) {
    let t = body[id].join(" ");
    t = t.replace(/\[I:staff [+-]\d+\]/g, () => (dropped.cross++, ""));
    t = t.replace(/!(?:8va|8vb|15ma|15mb)[()]!/g, (m) => (m.endsWith("(!") && dropped.ott++, ""));
    // an inline field straight after a note ("c[Q:1/4=150]") reads to abcjs as a chord: a space before it; several tempo
    // marks in a row (a ritardando written as steps) kept as the last one
    t = t.replace(/(?:\[Q:[^\]]*\]\s*){2,}/g, m => (dropped.tempo++, m.trim().split(/(?=\[Q:)/).pop() + " "));
    t = t.replace(/([^\s|:\[])\[([A-Za-z]):/g, "$1 [$2:");
    // marks that belong to the next note (!pp!, "^text", (, {grace}) written before an inline field: the field goes first
    for (let k = 0; k < 3; k++) t = t.replace(/((?:![^!\s]*!\s*|"[^"]*"\s*|\(\s*)+)(\[[A-Za-z]:[^\]]*\])/g, "$2 $1");
    // dashed slurs (!-(! … !-)!) and tremolo strokes (!/-!, !//-!, !///-!): abcjs cannot read them; slur dropped, notes kept
    t = t.replace(/!-[()]!|!\/{1,4}-?!/g, () => (dropped.marks++, ""));
    // xml2abc's U:s=!stemless! macro: abcjs has no U: macros, so the s before a note goes (the note keeps its stem)
    t = t.replace(/(^|[\s|\]\)}{!(.~TH\d\/'])s(?=[\^=_]*[A-Ga-g\[xz])/g, (m, a) => (dropped.marks++, a));   // also after a length (c/8sd) and inside {…}
    // invisible notes (x) written with an accidental or a tie (^x3-): abcjs reads x as a rest, so both go
    t = t.replace(/[\^=_]+(x[\d\/]*)-?|(x[\d\/]*)-/g, (m, a, b) => (dropped.marks++, a || b));
    // grace notes: abcjs takes no decorations and no chords inside {…}; a chord keeps its top note
    t = t.replace(/\{(\/?)([^}]*)\}/g, (m, sl, g) => "{" + sl + g.replace(/![^!]*!/g, () => (dropped.marks++, "")).replace(/\[([^\]]*)\]/g, (c, n) => (dropped.marks++, (n.match(/[\^=_]*[A-Ga-g][,']*/g) || [""]).pop())) + "}");
    // rests and bowing letters (v, u) inside a grace group: abcjs reads neither; a group left empty goes
    t = t.replace(/\{(\/?)([^}]*)\}/g, (m, sl, g) => { const h = g.replace(/[xz][\d\/]*|[uv.]/g, () => (dropped.marks++, "")); return /[A-Ga-g]/.test(h) ? "{" + sl + h + "}" : ""; });
    // !fz! (forzando): not in abcjs's list, written as text below the note
    t = t.replace(/!fz!/g, () => (dropped.marks++, '"_fz"'));
    // fingerings with more than one number (!4 2!, !45!): abcjs reads only !1!..!5!
    t = t.replace(/!\d[^!A-Za-z]*!/g, m => /^![1-5]!$/.test(m) ? m : (dropped.marks++, ""));   // separators can be any space character
    t = t.replace(/\|\]:/g, "|] |:");
    t = t.replace(/!(R\.H\.|L\.H\.|m\.d\.|m\.s\.)!/g, (m, w) => `"^${w}"`);   // hand marks as text
    t = splitRests(t, dropped);
    // grace notes at the end of a bar (a trill's closing turn, "{ga} |"): abcjs gives them a rest of their own, so the bar runs long;
    // they move over the bar line onto the next note
    t = t.replace(/(\{[^}]*\})\s*((?:\|[\]:|]*|:\|)\s*(?:\[[A-Za-z]:[^\]]*\]\s*)*)/g, (m, g, bar) => /\|/.test(bar) ? (dropped.graces++, bar + g) : m);
    t = t.replace(/!dacoda!/g, '"^D.C. al Coda"').replace(/!dacapo!/g, '"^D.C."').replace(/!(?:[6-9]|\d\d+)!/g, "");
    body[id] = [t];
  }
  // a K: under a V: definition in the header (xml2abc: K:none for a percussion staff): abcjs applies it to every voice defined
  // after it (the strings lose their key), so it goes to the start of that voice's own music
  { let vdef = null, firstK = true;
    for (let k = 0; k < head.length; k++) {
      const vm = /^V:(\S+)/.exec(head[k]); if (vm) { vdef = vm[1]; continue; }
      if (/^K:/.test(head[k])) { if (vdef && body[vdef]) { body[vdef].unshift(`[${head[k].trim()}]`); head.splice(k--, 1); dropped.keys++; } else firstK = false; }
    } }
  // %%score with brackets / braces inside brackets ([ [ 1 (2 3) ] 4 ]): abcjs reads one level only, so inner ones go
  for (let k = 0; k < head.length; k++) if (/^%%score/.test(head[k])) {
    let depth = 0;
    head[k] = "%%score" + head[k].slice(7).replace(/[[\]{}]/g, c => {
      if (c === "[" || c === "{") return depth++ ? (dropped.nest++, "") : c;
      return --depth ? "" : c;
    });
  }
  // two staves with the same name (Violin, Violin): numbered, so the views and the checker can tell them apart
  const seen = {};
  head.forEach(h => { const m = /^V:\S+.*\bnm="([^"]*)"/.exec(h); if (m) seen[m[1]] = (seen[m[1]] || 0) + 1; });
  const nth = {};
  for (let k = 0; k < head.length; k++) head[k] = head[k].replace(/^(V:\S+.*\bnm=")([^"]*)(")/, (m, a, n, b) => seen[n] > 1 ? (nth[n] = (nth[n] || 0) + 1, dropped.names++, a + n + " " + ["I","II","III","IV","V","VI"][nth[n] - 1] + b) : m);
  if (dropped.cross) console.error(`note: ${dropped.cross} cross-staff marks left out (the notes stay on their own staff)`);
  if (dropped.ott) console.error(`note: ${dropped.ott} ottava lines left out (notes already at sounding pitch, drawn with ledger lines)`);
  if (dropped.tempo) console.error(`note: ${dropped.tempo} runs of tempo marks kept as their last one`);
  if (dropped.marks) console.error(`note: ${dropped.marks} dashed slurs, tremolo strokes, stemless marks, grace-note fingerings / chords, multi-number fingerings left out (abcjs cannot read them)`);
  if (dropped.rests) console.error(`note: ${dropped.rests} rests of lengths abcjs cannot write split into ones it can`);
  if (dropped.graces) console.error(`note: ${dropped.graces} grace-note groups at a bar's end moved onto the next bar's first note`);
  if (dropped.names) console.error(`note: ${dropped.names} staff names numbered (the same name twice)`);
  if (dropped.ped) console.error(`note: ${dropped.ped} pedal marks left out (abcjs cannot draw them)`);
  if (dropped.words) console.error(`note: ${dropped.words} lyric lines with words left out`);
  if (head.some(h => /^L:/.test(h)) && head.filter(h => /^L:/.test(h)).length > 1) throw new Error("more than one L: in the header: rerun xml2abc with -d");
  // abcjs drops a voice's transpose= after an inline clef with an octave sign ([K:bass+8] in a horn part sounds 5 semitones off);
  // [K:bass octave=1] draws the same written notes (no little 8 on the clef) and keeps the transposition
  for (const id of order) if (head.some(h => new RegExp(`^V:${id}\\s.*transpose=`).test(h)))
    body[id] = body[id].map(t => t.replace(/\[K:(?:clef=)?(treble|bass|alto|tenor)([+-])8\]/g, (m, c, sg) => (dropped.clefs++, `[K:${c} octave=${sg === "+" ? "1" : "-1"}]`))
      .replace(/\[K:(?:clef=)?(treble|bass|alto|tenor)\]/g, "[K:$1 octave=0]"));   // octave= stays on until reset
  if (dropped.clefs) console.error(`note: ${dropped.clefs} octave clefs in transposing voices written as octave=±1 (abcjs transpose bug)`);
  return head.join("\n").replace(/\n+$/, "") + "\n" + order.map(id => `V:${id}\n${body[id].join(" ")}`).join("\n") + "\n";
}
