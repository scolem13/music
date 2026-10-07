// Page logic smoke test without a browser: presets parse to 12 bars, and transposing
// through every key keeps the form and returns to the original symbols.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/";
for (const f of ["apps/shared/tune-chart.js", "apps/shared/abc-transpose.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"));
const src = fs.readFileSync(R + "tools/_backing-track.qmd", "utf8");
const m = /var METERS = [\s\S]*?function presetAbc[\s\S]*?\n  \}/.exec(src); assert(m, "meters + presets block found");
const { METERS, PRESETS, presetAbc } = eval("(function(){" + m[0] + "\n return { METERS: METERS, PRESETS: PRESETS, presetAbc: presetAbc }; })()");
vm.runInThisContext(fs.readFileSync(R + "apps/shared/voicings.js", "utf8")); vm.runInThisContext(fs.readFileSync(R + "apps/shared/band/harmony.js", "utf8"));
PRESETS.forEach(p => { p.abc = presetAbc(p, "4/4"); });
// every preset in every meter: 12 full bars, and the band counts 4, 3, 2 and 4 beats
const BEATS = { "4/4": 4, "3/4": 3, "6/8": 2, "12/8": 4 };
for (const p of PRESETS) for (const mt of METERS){
  const q = TuneChart.parse(presetAbc(p, mt.id)), form = BandHarmony.buildForm(q, 0);
  const NB = p.bars.split("|").length; assert.strictEqual(q.bars.length, NB, p.id + " " + mt.id); assert.strictEqual(q.meterN + "/" + q.meterD, mt.id);
  assert(q.bars.every(b => Math.abs(b.lengthUnits - q.unitsPerBar) < 1e-6), p.id + " " + mt.id + " bars are full");
  assert(form.length === NB && form.every(b => b.beats === BEATS[mt.id] && b.compound === (mt.id === "6/8" || mt.id === "12/8")), p.id + " " + mt.id + " beats");
  assert.strictEqual(form.reduce((n, b) => n + b.chords.length, 0), p.bars.split(/[| ]/).length, p.id + " " + mt.id + " every chord kept");
  form.forEach(b => b.chords.forEach(c => assert(c.pos === 0 || c.pos === Math.ceil(b.beats / 2), "second chord on beat " + c.pos)));
}
const KEYS = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
for (const p of PRESETS){
  const parsed = TuneChart.parse(p.abc);
  const NB = p.bars.split("|").length; assert.strictEqual(NB, p.id === "watermelon" ? 16 : 12);
  assert.strictEqual(parsed.bars.length, NB, p.id + " bar count");
  assert.strictEqual(parsed.beatsPerBar, 4); assert.strictEqual(parsed.unitsPerBeat, 1); assert.strictEqual(parsed.keyPc, 5);
  assert(parsed.bars.every(b => b.lengthUnits === 4 && b.chords.length >= 1), p.id + " every bar full with a chord");
  assert.deepStrictEqual(parsed.playOrder, [...Array(NB).keys()]);
  const syms = a => TuneChart.parse(a).bars.map(b => b.chords.map(c => c.sym + "@" + c.onset).join(" ")).join(" | ");
  console.log(p.id.padEnd(6), "F :", syms(p.abc));
  let cur = p.abc;
  for (const k of KEYS){ cur = AbcTranspose.transpose(cur, k); const q = TuneChart.parse(cur);
    assert.strictEqual(q.bars.length, NB); assert.strictEqual(KEYS[q.keyPc], k, "key menu syncs for " + k);
    if (p.id === "jazz") console.log("       " + k.padEnd(2) + ":", q.bars.map(b => b.chords.map(c => c.sym).join(" ")).join(" | ")); }
  cur = AbcTranspose.transpose(cur, "F");
  assert.strictEqual(syms(cur), syms(p.abc), p.id + " round-trips through all 12 keys");
}
assert.strictEqual(AbcTranspose.transpose('X:1\nK:F\n"N.C."z4 | "F7"z4 |]', "G").includes('"N.C."'), true, "N.C. survives transposition");
console.log("page logic OK");
