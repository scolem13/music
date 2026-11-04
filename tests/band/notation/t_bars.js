// node tests/band/notation/t_bars.js — the band's written score (notation.js) read back by the site's own abcjs: every bar of
// every staff is a whole bar (120 passes of a 12-bar blues, swing and straight, seeds 1-60), and the tonewheel organ's chords
// (an octave up since 2026-11-04) never put a note from D4 up in the bass-clef staff. Two bugs this guards:
//   - "!open!" inside a drum chord "[...]" made abcjs end the chord and read a bar line: the drum staff got an extra bar and
//     its bar lines missed the staves above (fixed 2026-11-04: the mark goes before the "[").
//   - organ voicings an octave up were split by note count only and landed in the bass clef on ledger lines.
// NEG=1 must fail (puts the mark back inside the chord).
global.window = global; global.document = { documentElement: { style: { setProperty(){} } }, addEventListener(){}, querySelectorAll(){ return []; } };
global.localStorage = { getItem(){}, setItem(){} };
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const R = path.join(__dirname, "../../../apps/shared/");
vm.runInThisContext(fs.readFileSync(R + "abcjs-basic.js", "utf8"));
for (const f of ["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js", "band/midi.js", "band/notation.js"])
  vm.runInThisContext(fs.readFileSync(R + f, "utf8"), { filename: f });
const mb = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const src = 'X:1\nM:4/4\nL:1/4\nK:C\n"C7"z4|"F7"z4|"C7"z4|"C7"z4|"F7"z4|"F7"z4|"C7"z4|"C7"z4|"G7"z4|"F7"z4|"C7"z4|"G7"z4|]';
function score(feel, seed, compSound){
  const bars = BandMidi.generate(TuneChart.parse(src), { bars: 12, tempo: 140, opts: { feel, bassFeel: "walk", compSound }, rng: mb(seed) });
  let abc = BandNotation.toAbc(bars, { key: "C", drums: true, barsPerLine: 4 });
  if (process.env.NEG) abc = abc.replace(/!open!\[/g, "[!open!");
  return abc;
}
let bad = 0, seen = 0, opens = 0;
for (const feel of ["swing", "straight"]) for (let seed = 1; seed <= 60; seed++) {
  const abc = score(feel, seed); if (/!open!\[/.test(abc)) opens++;
  const t = ABCJS.parseOnly(abc)[0];
  t.lines.forEach((l, li) => l.staff && l.staff.forEach((s, si) => s.voices.forEach((v, vi) => { let d = 0, m = 1, left = 0;
    v.forEach((e) => { if (e.startTriplet){ m = e.tripletMultiplier; left = e.startTriplet; }
      if (e.el_type === "note"){ d += (e.duration || 0) * (left > 0 ? m : 1); if (left > 0) left--; }
      if (e.el_type === "bar"){ seen++; if (Math.abs(d - 1) > 1e-6 && bad++ < 5) console.log("bar not whole:", feel, seed, "line", li, "staff", si, "voice", vi, "length", d); d = 0; } }); })));
}
assert(opens > 0, "no open hi-hat chord came up: the case is not tested");
assert.equal(bad, 0, bad + " bars of the wrong length");
// the left-hand (bass-clef) staff's notes, as MIDI numbers
function leftNotes(abc){
  const left = abc.split(/\n/).filter((l) => /^\[V:L\]/.test(l)).join(" ").replace(/"[^"]*"/g, "").replace(/\[V:L\]/g, "");
  return [...left.matchAll(/([_^=]*)([A-Ga-g])([,']*)/g)].map((m) => { const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[2].toUpperCase()];
    let o = m[2] === m[2].toLowerCase() ? 72 : 60; for (const c of m[3]) o += c === "'" ? 12 : -12; return o + base + (m[1].includes("^") ? 1 : m[1].includes("_") ? -1 : 0); });
}
// the piano still has a left hand (so the reading above works), and the organ never puts a note from D4 (62) up in it
let pianoLeft = 0;
for (let seed = 1; seed <= 20; seed++) {
  pianoLeft += leftNotes(score("swing", seed, "piano")).length;
  const high = leftNotes(score("swing", seed, "hammond")).filter((n) => n >= 62);
  assert.equal(high.length, 0, "seed " + seed + ": the organ's left hand has notes from D4 up: " + high.slice(0, 5));
}
assert(pianoLeft > 50, "the piano's left hand read as " + pianoLeft + " notes: the check is not reading the staff");
console.log("NOTATION BARS OK", seen, "bars,", opens, "passes with an open hat in a chord");
