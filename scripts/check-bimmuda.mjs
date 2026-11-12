// Check the Pop Themes' ABC (scripts/theme-sources/bimmuda/*.abc) against the MIDI it was converted from.
//   EXPECT_OUT=/tmp/bimmuda-expected.json python3 -I scripts/convert-bimmuda.py      (writes each file's pitches and onsets)
//   node scripts/check-bimmuda.mjs /tmp/bimmuda-expected.json
// For every file: abcjs reads it without warnings and AbcTune's notes (a tied note is one; AbcTune counts onsets in eighths, L:1/8) have the MIDI's pitches at the same
// onsets (quarter notes from the first note's bar start).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const g = { console, Math, JSON, document: { documentElement: { style: { setProperty() {} } } } }; g.window = g; g.self = g; vm.createContext(g);
for (const f of ["apps/shared/abcjs-basic.js", "apps/shared/abc-core.js", "apps/tune-assessment/abc-tune.js"]) vm.runInContext(fs.readFileSync(f, "utf8"), g, { filename: f });
const exp = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dir = path.resolve("scripts/theme-sources/bimmuda");
let ok = 0, warn = 0, bad = [], pitchBad = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".abc")).sort()) {
  const id = f.slice(0, -4), abc = fs.readFileSync(path.join(dir, f), "utf8");
  let w = 99, notes = [];
  try { w = (g.ABCJS.parseOnly(abc)[0].warnings || []).filter((x) => !/Unknown directive/.test(x)).length; notes = g.AbcTune.melodyNotes(abc).notes; } catch (e) {}
  if (w) { warn++; bad.push(id + " warnings " + w); }
  const e = exp[id] || [];
  if (notes.length !== e.length) { bad.push(id + " notes " + notes.length + " vs " + e.length); continue; }
  // onsets from abcjs's own durations (tuplets scaled; a tied continuation is not a new note), pitches from AbcTune
  const ons = []; let t = 0, tiedOn = false;
  for (const el of g.ABCJS.parseOnly(abc)[0].lines.flatMap((l) => l.staff || []).flatMap((s) => s.voices[0])) {
    if (el.el_type !== "note" || el.rest === undefined && !el.pitches) continue;
    if (el.rest) { t += el.duration[0] * 4; tiedOn = false; continue; }
    if (!tiedOn) ons.push(t);
    tiedOn = !!(el.pitches || []).some((p) => p.startTie);
    t += el.duration[0] * 4;
  }
  const off = ons.length ? ons[0] - (e[0] ? e[0][1] : 0) : 0;
  let d = ons.length !== e.length ? e.length : 0;
  if (!d) notes.forEach((n, i) => { if (n.midi !== e[i][0] || Math.abs(ons[i] - off - e[i][1]) > 0.02) d++; });
  if (d) pitchBad.push(id + " " + d + "/" + e.length); else ok++;
}
console.log("exact (pitch and onset of every note):", ok, "of", Object.keys(exp).length, "; abcjs warnings:", warn);
console.log("count mismatches / warnings:", bad.length, bad.slice(0, 20)); console.log("pitch or onset differs:", pitchBad.length, pitchBad.slice(0, 30));
