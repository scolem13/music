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
fs.writeFileSync(out, tidy(raw));

const json = path.join(tmp, "score.json");
fs.writeFileSync(json, execFileSync("python3", ["-I", path.join(here, "xml-notes.py"), src], { maxBuffer: 1 << 28 }));
const r = spawnSync("node", [path.join(here, "score-check.cjs"), out, json, ...process.argv.slice(4)], { stdio: "inherit" });
console.log("wrote " + out);
process.exit(r.status);

export function tidy(abc) {
  const lines = abc.split("\n"), head = [], body = {}, order = [];
  let cur = null; const dropped = { words: 0, clefs: 0, ped: 0, cross: 0, ott: 0, names: 0, tempo: 0, marks: 0 };
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
    t = t.replace(/!-[()]!|!\/{1,3}-!/g, () => (dropped.marks++, ""));
    t = t.replace(/!dacoda!/g, '"^D.C. al Coda"').replace(/!dacapo!/g, '"^D.C."').replace(/!(?:[6-9]|\d\d+)!/g, "");
    body[id] = [t];
  }
  // two staves with the same name (Violin, Violin): numbered, so the views and the checker can tell them apart
  const seen = {};
  head.forEach(h => { const m = /^V:\S+.*\bnm="([^"]*)"/.exec(h); if (m) seen[m[1]] = (seen[m[1]] || 0) + 1; });
  const nth = {};
  for (let k = 0; k < head.length; k++) head[k] = head[k].replace(/^(V:\S+.*\bnm=")([^"]*)(")/, (m, a, n, b) => seen[n] > 1 ? (nth[n] = (nth[n] || 0) + 1, dropped.names++, a + n + " " + ["I","II","III","IV","V","VI"][nth[n] - 1] + b) : m);
  if (dropped.cross) console.error(`note: ${dropped.cross} cross-staff marks left out (the notes stay on their own staff)`);
  if (dropped.ott) console.error(`note: ${dropped.ott} ottava lines left out (notes already at sounding pitch, drawn with ledger lines)`);
  if (dropped.tempo) console.error(`note: ${dropped.tempo} runs of tempo marks kept as their last one`);
  if (dropped.marks) console.error(`note: ${dropped.marks} dashed slurs / tremolo strokes left out (abcjs cannot read them)`);
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
