// convert.mjs — a MusicXML full score (.mxl / .xml) to ABC the site can draw and play, then checked against the MusicXML.
//
//   node scripts/full-score/convert.mjs score.mxl [out.abc]        (XML2ABC=<path to xml2abc.py>, default ~/Projects/pages-dev/tunes/xml2abc.py)
//
// Steps: xml2abc (-d 8: one L:1/8 for every voice; -x: no $ breaks; -m 1: %%MIDI program only), then tidied for abcjs:
//   - a voice's L: written among the headers applies to the WHOLE score in abcjs (xml2abc means it for that voice): with -d 8
//     there are none, and any left are an error
//   - each voice's music joined onto one line, so every voice has the same systems (abcjs pairs voices line by line: a voice that
//     wraps after 6 bars against one that wraps after 19 puts the wrong bars together); the page breaks lines itself (wrap option)
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
  let cur = null; const dropped = { words: 0, clefs: 0 };
  for (let ln of lines) {
    if (/^I:linebreak/.test(ln)) continue;
    const v = /^V:(\S+)\s*$/.exec(ln);                       // a bare V:n starts that voice's music
    if (v) { cur = v[1]; if (!body[cur]) { body[cur] = []; order.push(cur); } continue; }
    if (cur === null) { head.push(ln); continue; }
    if (/^w:/.test(ln)) { if (/[^\s|*_-]/.test(ln.slice(2))) dropped.words++; continue; }   // lyric lines (xml2abc writes empty ones)
    if (/^[A-Za-z]:/.test(ln) && !/^[A-Za-z]:\S*\]/.test(ln)) { body[cur].push(` [${ln.trim()}] `); continue; }   // a field inside the music: inline
    ln = ln.replace(/(^|[^\\])%.*$/, "$1");                  // bar-number comments
    if (ln.trim()) body[cur].push(ln.trim());
  }
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
