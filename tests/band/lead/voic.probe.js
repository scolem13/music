const fs = require("fs"), vm = require("vm");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
for (const f of ["voicings.js", "band/harmony.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"));
const H = BandHarmony, V = ChordVoicings, nn = H.noteName;
for (const s of ["F7", "F13", "Bb7", "Cm7", "Bdim7", "Am7b5", "D7b9", "Fmaj7", "F6", "F", "Fm", "C7sus", "E7#9", "Caug", "G7alt", "C/E", "Fm6", "C9", "Gm11"]) {
  const c = H.parseChord(s, 0);
  console.log(s.padEnd(6), "tones", JSON.stringify(c.tones), "| pianoD2", V.piano({ root: c.root, intervals: c.tones }, "drop2", { lo: 48, hi: 77 }).map(x => x.midis.map(nn).join(" ") + (x.note ? " (" + x.note + ")" : "")).join(" / "));
}
console.log("--- guitar sets for F7");
for (const st of ["drop2", "drop3", "triad3", "shell3"]) {
  const c = H.parseChord("F7", 0), cs = V.guitar({ root: c.root, intervals: c.tones }, st, {});
  console.log(st, cs.length, "shapes;", [...new Set(cs.map(x => x.stringSet.join("")))].join(" "), "| e.g.", cs.slice(0, 4).map(x => `${x.label} [${x.midis.map(nn).join(" ")}] frets ${x.strings.map(s => s.fret).join("-")}`).join(" ; "));
}
console.log("--- guitar triad3 for F (plain triad) sets:", [...new Set(V.guitar({ root: 5, intervals: [0, 4, 7] }, "triad3", {}).map(x => x.stringSet.join("")))].join(" "));
