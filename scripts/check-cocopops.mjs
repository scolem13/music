// Check the CoCoPops and RS200 Pop Themes ABC (scripts/theme-sources/cocopops/*.abc and rs200/*.abc) against what convert-cocopops.py read.
//   EXPECT_OUT=/tmp/cocopops-expected.json python3 -I scripts/convert-cocopops.py both
//   node scripts/check-cocopops.mjs /tmp/cocopops-expected.json
// For every file: abcjs reads it without warnings (the %%artist / %%section header lines are our own directives: "Unknown directive" is the one
// warning ignored); every full bar adds up to its meter (the first bar may be a pickup, the last short); AbcTune's notes (a tied note is one)
// have the converter's pitches at the converter's onsets (quarter notes from the first note); and every chord symbol the source has
// (the converter's list: time from the first note, symbol) is on the note or rest that starts at exactly that time, and no other.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const g = { console, Math, JSON, document: { documentElement: { style: { setProperty() {} } } } }; g.window = g; g.self = g; vm.createContext(g);
for (const f of ["apps/shared/abcjs-basic.js", "apps/shared/abc-core.js", "apps/tune-assessment/abc-tune.js"]) vm.runInContext(fs.readFileSync(f, "utf8"), g, { filename: f });
const exp = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = { files: 0, warn: [], count: [], pitch: [], bars: [], chords: [], notes: 0, chordsN: 0, bars_n: 0 };
const R = (x) => Math.round(x * 1e4) / 1e4;
for (const set of ["cocopops", "rs200"]) {
  const dir = path.resolve("scripts/theme-sources", set);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".abc")).sort()) {
    const id = f.slice(0, -4), abc = fs.readFileSync(path.join(dir, f), "utf8"), e = exp[id];
    out.files++;
    if (!e) { out.count.push(id + " not in the expected file"); continue; }
    let tune, notes = [];
    try { tune = g.ABCJS.parseOnly(abc)[0]; notes = g.AbcTune.melodyNotes(abc).notes; } catch (x) { out.warn.push(id + " throws"); continue; }
    const w = (tune.warnings || []).filter((x) => !/Unknown directive/.test(x));
    if (w.length) out.warn.push(id + " " + w[0].slice(0, 80));
    // walk the music: onsets, bars, chords
    // (abcjs puts a meter written at the start of a line on the staff, not among its elements: a marker element carries it)
    const els = tune.lines.flatMap((l) => l.staff || []).flatMap((s) => [...(s.meter && s.meter.value && s.meter.value[0] ? [{ el_type: "meter", value: s.meter.value }] : []), ...s.voices[0]]);
    let t = 0, mult = 1, tiedOn = false, acc = 0, meter = tune.getMeterFraction(), barLen = meter.num / meter.den, first = true, nb = 0;
    const ons = [], ch = [];
    const badBars = [];
    els.forEach((el, k) => {
      if (el.el_type === "meter") { const v = el.value && el.value[0]; if (v) barLen = v.num / v.den; return; }
      if (el.el_type === "bar") {
        if (acc > 0) { nb++; if (!((first || k === els.length - 1) && acc <= barLen + 1e-9) && Math.abs(acc - barLen) > 1e-9) badBars.push("bar " + nb + " " + R(acc) + " of " + R(barLen)); }
        first = false; acc = 0; return;
      }
      if (el.el_type !== "note") return;
      if (el.startTriplet) mult = el.tripletMultiplier;   // abcjs leaves a tuplet's durations unscaled: the multiplier is on its first note
      const d = (Array.isArray(el.duration) ? el.duration[0] : el.duration) * mult;
      if (el.endTriplet) mult = 1;
      if (el.chord) for (const c of el.chord) ch.push([R(t * 4), c.name.replace(/♭/g, "b").replace(/♯/g, "#")]);
      if (el.rest) tiedOn = false;
      else { if (!tiedOn) ons.push(t * 4); tiedOn = !!(el.pitches || []).some((p) => p.startTie); }
      t += d; acc += d;
    });
    if (acc > barLen + 1e-9) badBars.push("last bar " + R(acc) + " of " + R(barLen));
    if (badBars.length) out.bars.push(id + " " + badBars[0]);
    out.bars_n += nb + 1;
    // notes
    const en = e.notes, ec = e.chords;
    if (notes.length !== en.length || ons.length !== en.length) { out.count.push(id + " notes " + notes.length + "/" + ons.length + " vs " + en.length); continue; }
    const off = ons[0] - en[0][1];
    let d = 0; notes.forEach((n, i) => { if (n.midi !== en[i][0] || !(Math.abs(ons[i] - off - en[i][1]) <= 0.02)) d++; });
    if (d) out.pitch.push(id + " " + d + "/" + en.length); else out.notes += en.length;
    // chords: the same symbols at the same times
    const want2 = ec.map(([tm, s]) => R(tm) + " " + s).join("|"), got2 = ch.map(([tm, s]) => R(tm - off) + " " + s).join("|");
    if (want2 !== got2) out.chords.push(id + "\n   want " + want2.slice(0, 120) + "\n   got  " + got2.slice(0, 120)); else out.chordsN += ec.length;
  }
}
console.log("files:", out.files, "| abcjs warnings (not counting our own directives):", out.warn.length, out.warn.slice(0, 8));
console.log("bars checked:", out.bars_n, "| bad bars:", out.bars.length, out.bars.slice(0, 10));
console.log("note count mismatches:", out.count.length, out.count.slice(0, 10));
console.log("notes exact (pitch and onset):", out.notes, "| files with a difference:", out.pitch.length, out.pitch.slice(0, 10));
console.log("chord symbols at the right time:", out.chordsN, "| files where chords differ:", out.chords.length, out.chords.slice(0, 6));
