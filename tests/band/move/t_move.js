// Comping voicings that move (voiceMove), the sixth-diminished style ("bh"), maj7-as-6, "auto", and bass variation.
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js", "band/midi.js", "band/notation.js"].forEach(f => require(R + f));
const H = BandHarmony;
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pcs = m => [...new Set(m.map(x => x % 12))].sort((a, b) => a - b).join(",");
const ch = s => H.parseChord(s, 0);
// the sixth-chord readings
const six = (sym) => { const x = H.sixthOf(ch(sym)); return x && { six: pcs(x.six.intervals.map(i => i + x.six.root)), dim: pcs(x.dim.intervals.map(i => i + x.dim.root)) }; };
assert.deepStrictEqual(six("Cmaj7"), { six: "0,4,7,9", dim: "2,5,8,11" });          // C6, D dim
assert.deepStrictEqual(six("Dm7").six, "0,2,5,9");                                  // F6
assert.deepStrictEqual(six("G7").six, "2,5,9,11");                                  // Dm6
assert.deepStrictEqual(six("G7alt").six, "3,5,8,11");                               // Abm6
assert.deepStrictEqual(six("Bm7b5").six, "2,5,9,11");                               // Dm6
assert.deepStrictEqual(six("Cm6").six, "0,3,7,9"); assert.strictEqual(six("Cdim7"), null); assert.strictEqual(six("Csus4"), null);
assert.strictEqual(pcs(H.asSixth(ch("Cmaj7")).tones), "0,4,7,9"); assert.strictEqual(H.asSixth(ch("G7")).seventh, 10);
for (const inst of ["piano", "guitar"]){ assert(H.hasStyle(inst, "bh") && H.hasStyle(inst, "auto"));
  for (const sym of ["F7", "Bbmaj7", "Gm7", "Am7b5", "D7b9", "Cdim7", "Csus4", "C", "Caug"]) for (const st of ["bh", "auto"]) assert(H.voicing(ch(sym), st, null, inst).length >= 2, inst + " " + st + " " + sym); }

const BLUES = 'X:1\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "F7"z4 | "F7"z4 | "F7"z4 | "Bbmaj7"z4 | "Bbmaj7"z4 | "F7"z4 | "Am7b5"z2 "D7b9"z2 | "Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]';
const parsed = TuneChart.parse(BLUES);
function comp(opts, seed){ return BandMidi.generate(parsed, { bars: 48, tempo: 140, opts, rng: mb(seed) }); }
function stats(recs){ let same = 0, moved = 0, passing = 0, maxTopStep = 0, n = 0, lo = 999, hi = 0, last = null, lastKey = null;
  recs.forEach(r => r.parts.comp.forEach(e => { n++; const top = e.midis[e.midis.length - 1], key = e.of; lo = Math.min(lo, e.midis[0]); hi = Math.max(hi, top);
    if (e.passing) passing++;
    if (last && key === lastKey && !e.passing){ if (e.midis.join() === last.midis.join()) same++; else moved++; }
    if (last) maxTopStep = Math.max(maxTopStep, Math.abs(top - last.midis[last.midis.length - 1]));
    if (!e.passing){ last = e; lastKey = key; } else last = e; }));
  return { n, same, moved, passing, lo, hi, maxTopStep }; }
for (const inst of ["piano", "guitar"]) for (const voicing of inst === "piano" ? ["drop2", "drop3", "rootless", "standard", "bh", "auto"] : ["drop2", "shell3", "triad3", "guide2", "bh", "auto"]) for (const compRhythm of ["auto", "charleston", "four"]){
  const base = { comp: inst, voicing, compRhythm };
  const hold = stats(comp({ ...base, voiceMove: "hold" }, 5)), move = stats(comp({ ...base, voiceMove: "move" }, 5)), pass = stats(comp({ ...base, voiceMove: "passing" }, 5));
  const tag = [inst, voicing, compRhythm].join(" ");
  assert.strictEqual(hold.moved, 0, tag + ": hold never changes a held chord"); assert.strictEqual(hold.passing, 0);
  assert(move.moved > (compRhythm === "four" ? 0.05 : 0.15) * (move.moved + move.same), tag + ": move changes inversion on a held chord (" + move.moved + " of " + (move.moved + move.same) + ")");
  assert.strictEqual(move.passing, 0, tag + ": no passing chords unless asked");
  if (voicing === "bh") assert(pass.passing > 0, tag + ": passing chords appear"); else if (voicing !== "auto") assert.strictEqual(pass.passing, 0, tag + ": passing chords only in the bh style");
  [move, pass].forEach(s => assert(s.lo >= (inst === "guitar" ? 40 : 43) && s.hi <= (inst === "guitar" ? 76 : 84), tag + " register " + s.lo + ".." + s.hi));
  if (voicing === "bh" && compRhythm === "charleston") console.log(tag.padEnd(26), "hold", JSON.stringify(hold), "\n".padEnd(27), "pass", JSON.stringify(pass));
}
// a passing chord is the scale's diminished chord, and is always followed by the chord itself
{ const recs = comp({ voicing: "bh", voiceMove: "passing", compRhythm: "charleston" }, 11), all = []; recs.forEach(r => r.parts.comp.forEach(e => all.push({ e, r })));
  let np = 0; all.forEach((x, i) => { if (!x.e.passing) return; np++; const c = x.r.chords.filter(c => c.pos <= x.e.pos + 0.51).pop().chord, sx = H.sixthOf(c);
    assert.strictEqual(pcs(x.e.midis), pcs(sx.dim.intervals.map(k => k + sx.dim.root)), "passing chord over " + c.sym); assert(all[i + 1] && !all[i + 1].e.passing, "resolves"); });
  assert(np > 5); }
// maj7 as 6: no major 7th left in a major 7th chord's voicing
{ const hit = o => { let has7 = 0, n = 0; comp(o, 3).forEach(r => r.parts.comp.forEach(e => { const c = r.chords[0].chord; if (c.sym !== "Bbmaj7" || e.of !== r.index + ":0") return; n++; if (e.midis.some(m => m % 12 === 9)) has7++; })); return { n, has7 }; };
  for (const voicing of ["drop2", "rootless", "standard", "shell"]){ const a = hit({ voicing }), b = hit({ voicing, maj6: true }); assert(a.has7 > 0 && b.has7 === 0 && b.n > 0, voicing + " maj6 " + JSON.stringify([a, b])); } }
// auto picks different styles as the band builds
{ const sizes = I => { const c = BandComp.create({ rng: mb(4) }), form = H.buildForm(parsed, 0), set = new Set();
    for (let i = 0; i < 12; i++) c.bar({ bar: i, index: i, length: 12, beats: 4, chords: form[i].chords, nextChords: form[(i + 1) % 12].chords, tempo: 140, opts: { voicing: "auto", voiceMove: "move" }, intensity: I, phrase: { bar: i % 4 } }).forEach(e => set.add(e.midis.length));
    return [...set].sort().join(); };
  assert.strictEqual(sizes(0.2), "2", "playing down: guide tones"); assert.strictEqual(sizes(0.5), "4"); console.log("auto sizes: quiet", sizes(0.2), "| medium", sizes(0.5), "| loud", sizes(0.9)); }

// bass: strict is exactly the pattern; variation changes some bars but keeps the root on beat 1 and the range
for (const bassFeel of ["walk", "two", "riff"]) for (const meter of ["4/4", "12/8"]){
  const p = meter === "4/4" ? parsed : TuneChart.parse(BLUES.replace("M:4/4", "M:12/8").replace("L:1/4", "L:1/8").replace(/z4/g, "z12").replace(/z2/g, "z6"));
  const line = (v, seed) => BandMidi.generate(p, { bars: 96, tempo: 120, opts: { bassFeel, feel: bassFeel === "riff" ? "straight" : "swing", variation: v }, rng: mb(seed) }).map(r => r.parts.bass);
  const shape = l => l.map(b => b.map(e => e.pos).join(" "));
  const strict = line(0, 7), loose = line(1, 7), tag = bassFeel + " " + meter;
  loose.forEach((b, i) => { assert.strictEqual(b[0].pos, 0, tag); b.forEach(e => assert(e.midi >= 28 && e.midi <= 55 && e.pos < 4 && e.dur > 0, tag + " " + e.midi)); });
  const rhythmsStrict = new Set(shape(strict)).size, rhythmsLoose = new Set(shape(loose)).size;
  console.log(tag.padEnd(10), "different bar rhythms: strict", rhythmsStrict, "| loose", rhythmsLoose);
  if (!(bassFeel === "walk" && meter === "12/8")) assert(rhythmsLoose > rhythmsStrict, tag + " gains rhythms with variation");   // (12/8 walking already has its pickups)
  if (bassFeel === "walk" && meter === "4/4") assert.strictEqual(rhythmsStrict, 1, "strict walking is four quarters");
}
console.log("MOVE OK");
