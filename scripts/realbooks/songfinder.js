// Parses Hal Leonard's Real Book Songfinder (2014) into apps/realbooks/songfinder.json:
// [{ title, vols: [1, 21] }]. Volume numbers are the Songfinder's key (see VOLS). No page numbers in the source.
// Starts at page 2 (the key is above the first entries there). Run: node scripts/realbooks/songfinder.js /path/to/MiscRealbksongfind2014.pdf
const { execFileSync } = require("child_process"), fs = require("fs"), path = require("path");
const pdf = process.argv[2] || path.join(process.env.HOME, "Projects/corpora/realBooks/MiscRealbksongfind2014.pdf");
const VOLS = { 1: "The Real Book – Volume I", 2: "The Real Book – Volume II", 3: "The Real Book – Volume III", 4: "The Real Book – Volume IV",
  5: "The Real Book – Volume V", 6: "The Real Book – Volume VI", 7: "The Real Book – Volume VII", 8: "The Real Blues Book", 9: "Miles Davis Real Book",
  10: "The Charlie Parker Real Book", 11: "The Duke Ellington Real Book", 12: "The Bud Powell Real Book", 13: "The Real Christmas Book",
  14: "The Real Rock Book", 15: "The Real Rock Book – Volume II", 16: "The Real Tab Book – Volume I", 17: "The Real Bluegrass Book",
  18: "The Real Dixieland Book", 19: "The Real Latin Book", 20: "The Real Worship Book", 21: "The Real Vocal Book – Volume I",
  22: "The Real Vocal Book – Volume II", 23: "The Real Vocal Book – Volume III" };
const txt = execFileSync("pdftotext", ["-f", "2", pdf, "-"], { encoding: "utf8" }).replace(/’/g, "'");
const out = []; let buf = "";
for (let line of txt.split("\n")) {
  line = line.trim();
  if (/^KEY$/.test(line)) { buf = ""; continue; }
  if (!line || /^[A-Z]$|^\d+$|^\f/.test(line)) { continue; }
  buf = buf ? buf + " " + line : line;
  const m = buf.match(/^(.*\S)\s*\(((?:\d{2},\s*)*\d{2})\)$/);
  if (m) { out.push({ title: m[1], vols: m[2].split(/,\s*/).map(Number) }); buf = ""; }
  else if (buf.length > 160) buf = "";   // runaway: not an entry
}
fs.writeFileSync(path.join(__dirname, "../../apps/realbooks/songfinder.json"), JSON.stringify({ source: "Hal Leonard Real Book Songfinder, as of 3.14.2014", vols: VOLS, songs: out }));
console.log(out.length, "titles;", out.reduce((a, s) => a + s.vols.length, 0), "printings");
