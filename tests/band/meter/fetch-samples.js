// Mirror the soundfont samples the band uses into ../lead/site/sf/ so the browser tests do not depend on
// the CDN (it is sometimes unreachable). A test then points the page at it:
//   window.getSoundfontUrl = function(){ return Promise.resolve("http://127.0.0.1:8500/sf/"); }
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
require("/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/sounds.js");
const SRC = "https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/", OUT = path.join(__dirname, "../lead/site/sf/");
const S = BandSounds, list = [];
[["acoustic_bass", 28, 57], ["electric_bass_finger", 28, 57], ["acoustic_grand_piano", 43, 84], ["electric_piano_1", 43, 84], ["electric_guitar_jazz", 40, 84], ["acoustic_guitar_steel", 40, 84], ["acoustic_guitar_nylon", 40, 84], ["electric_guitar_clean", 40, 84], ["distortion_guitar", 40, 84], ["church_organ", 36, 84]]
  .forEach(([n, lo, hi]) => S.soundfontZones("", n, lo, hi, 3).forEach(z => list.push(z.url)));
[36, 37, 38, 42, 44, 46, 49, 51, 59, 53, 43, 45, 48, 31, 39, 54].forEach(m => list.push("percussion-mp3/" + S.noteName(m) + ".mp3"));
let got = 0, missing = [];
for (const rel of list){
  const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true });
  for (let i = 0; i < 8 && !(fs.existsSync(f) && fs.statSync(f).size > 1000); i++){
    try { execFileSync("curl", ["-s", "-f", "-m", "20", "-o", f, SRC + rel]); } catch (e) { execFileSync("sleep", ["1.5"]); } }
  if (fs.existsSync(f) && fs.statSync(f).size > 1000) got++; else missing.push(rel);
}
console.log("samples mirrored:", got, "of", list.length, missing.length ? "missing: " + missing.join(", ") : "");
